import { OAuth2Client } from 'google-auth-library'
import { shell } from 'electron'
import http from 'http'
import { readAppState, writeAppState } from './app-state'

const REDIRECT_URI = 'http://localhost:3847/oauth2callback'
const SCOPES = ['https://mail.google.com/', 'email']

let oauth2Client: OAuth2Client | null = null

function getClient(): OAuth2Client {
  if (!oauth2Client) {
    const clientId = process.env.GOOGLE_CLIENT_ID || ''
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || ''
    oauth2Client = new OAuth2Client(clientId, clientSecret, REDIRECT_URI)
  }
  return oauth2Client
}

/**
 * Start the OAuth 2.0 authorization flow.
 * Opens the user's browser to Google's consent page.
 * Starts a temporary local HTTP server to receive the callback.
 */
export async function authorizeGoogle(): Promise<{
  success: boolean
  accessToken?: string
  refreshToken?: string
  email?: string
  error?: string
}> {
  const client = getClient()

  const authorizeUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  })

  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url!, `http://localhost:3847`)
        const code = url.searchParams.get('code')

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html' })
          res.end('<h1>Error: No authorization code received</h1>')
          server.close()
          resolve({ success: false, error: 'No authorization code received' })
          return
        }

        const { tokens } = await client.getToken(code)
        client.setCredentials(tokens)

        const tokenInfo = await client.getTokenInfo(tokens.access_token!)

        // Persist refresh token in app state
        const appState = readAppState() ?? { vaultPath: '' }
        appState.googleOAuthRefreshToken = tokens.refresh_token || undefined
        appState.googleOAuthEmail = tokenInfo.email || undefined
        writeAppState(appState)

        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(`
          <html>
            <body style="font-family: sans-serif; text-align: center; padding: 50px;">
              <h1 style="color: #8C1D40;">Authorization Successful</h1>
              <p>You can close this window and return to Email KB Assistant.</p>
              <script>setTimeout(() => window.close(), 3000)</script>
            </body>
          </html>
        `)

        server.close()
        resolve({
          success: true,
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token || undefined,
          email: tokenInfo.email || undefined,
        })
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/html' })
        res.end('<h1>Authorization failed</h1>')
        server.close()
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Authorization failed',
        })
      }
    })

    server.listen(3847, () => {
      shell.openExternal(authorizeUrl)
    })

    // Timeout after 2 minutes
    setTimeout(() => {
      server.close()
      resolve({ success: false, error: 'Authorization timed out (2 minutes)' })
    }, 120000)
  })
}

/**
 * Get a fresh access token using the saved refresh token.
 * Call this before every IMAP connection.
 */
export async function getAccessToken(): Promise<{
  success: boolean
  accessToken?: string
  email?: string
  error?: string
}> {
  const appState = readAppState()
  const refreshToken = appState?.googleOAuthRefreshToken

  if (!refreshToken) {
    return { success: false, error: 'Not authorized. Please sign in with Google first.' }
  }

  try {
    const client = getClient()
    client.setCredentials({ refresh_token: refreshToken })

    const { credentials } = await client.refreshAccessToken()

    // If email wasn't saved during initial auth, fetch it now
    let email = appState?.googleOAuthEmail
    if (!email && credentials.access_token) {
      try {
        const tokenInfo = await client.getTokenInfo(credentials.access_token)
        if (tokenInfo.email) {
          email = tokenInfo.email
          const updated = readAppState() ?? { vaultPath: '' }
          updated.googleOAuthEmail = email
          writeAppState(updated)
        }
      } catch {
        // Non-fatal — continue without email
      }
    }

    return {
      success: true,
      accessToken: credentials.access_token!,
      email: email || undefined,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to refresh access token',
    }
  }
}

/**
 * Check if the user has authorized Google OAuth.
 */
export function isGoogleAuthorized(): boolean {
  const appState = readAppState()
  return !!appState?.googleOAuthRefreshToken
}

/**
 * Get the authorized Google email address.
 */
export function getGoogleEmail(): string | null {
  const appState = readAppState()
  return appState?.googleOAuthEmail || null
}

/**
 * Revoke Google OAuth authorization.
 */
export function revokeGoogleAuth(): void {
  const appState = readAppState()
  if (appState) {
    delete appState.googleOAuthRefreshToken
    delete appState.googleOAuthEmail
    writeAppState(appState)
  }
  oauth2Client = null
}
