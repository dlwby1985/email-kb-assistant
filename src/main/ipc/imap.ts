import { ipcMain } from 'electron'
import { readConfig, writeConfig } from '../services/config'
import { getVaultPath } from '../services/app-state'
import {
  connectIMAP,
  connectIMAPOAuth,
  disconnectIMAP,
  fetchRecentEmails,
  fetchEmailBody,
  fetchEmailsByContact,
  fetchEmailsByDate,
  encryptPassword,
  decryptPassword,
} from '../services/imap'
import {
  authorizeGoogle,
  isGoogleAuthorized,
  getGoogleEmail,
  revokeGoogleAuth,
} from '../services/google-oauth'
import { ImapFlow } from 'imapflow'

/**
 * Connect using OAuth if authorized, otherwise fall back to password-based config.
 */
async function getImapClient(): Promise<ImapFlow> {
  if (isGoogleAuthorized()) {
    return connectIMAPOAuth()
  }

  // Fall back to password-based config
  const vaultPath = getVaultPath()
  if (!vaultPath) throw new Error('No vault path')
  const config = readConfig(vaultPath)
  if (!config.imap) throw new Error('IMAP not configured')
  const password = decryptPassword(config.imap.password_encrypted)
  if (!password) throw new Error('No password stored — save IMAP settings with a password first')
  return connectIMAP(config.imap.host, config.imap.port, config.imap.email, password)
}

export function registerImapHandlers() {
  // ── Google OAuth handlers ────────────────────────────────────────────────

  ipcMain.handle('imap:google-auth-status', async () => {
    return {
      authorized: isGoogleAuthorized(),
      email: getGoogleEmail(),
    }
  })

  ipcMain.handle('imap:google-authorize', async () => {
    return await authorizeGoogle()
  })

  ipcMain.handle('imap:google-revoke', async () => {
    revokeGoogleAuth()
    return { success: true }
  })

  // ── Existing IMAP handlers (updated for OAuth + password fallback) ───────

  /**
   * Get sanitized IMAP config (password not returned, only hasPassword flag)
   */
  ipcMain.handle('imap:get-config', async () => {
    const vaultPath = getVaultPath()
    if (!vaultPath) return null
    const config = readConfig(vaultPath)
    if (!config.imap) return null
    return {
      enabled: config.imap.enabled,
      host: config.imap.host,
      port: config.imap.port,
      email: config.imap.email,
      hasPassword: !!config.imap.password_encrypted,
      auto_fetch: config.imap.auto_fetch,
      fetch_limit: config.imap.fetch_limit,
    }
  })

  /**
   * Save IMAP config. If `password` is provided (plaintext), encrypt it.
   * If omitted, keep the existing encrypted password.
   */
  ipcMain.handle('imap:save-config', async (_event, data: {
    enabled: boolean
    host: string
    port: number
    email: string
    password?: string
    auto_fetch: boolean
    fetch_limit: number
  }) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) throw new Error('No vault path')
    const config = readConfig(vaultPath)
    let password_encrypted = config.imap?.password_encrypted ?? ''
    if (data.password) {
      try {
        password_encrypted = encryptPassword(data.password)
      } catch {
        // safeStorage not available — store empty
        password_encrypted = ''
      }
    }
    config.imap = {
      enabled: data.enabled,
      host: data.host,
      port: data.port,
      email: data.email,
      password_encrypted,
      auto_fetch: data.auto_fetch,
      fetch_limit: data.fetch_limit,
    }
    writeConfig(vaultPath, config)
    return { success: true }
  })

  /**
   * Test IMAP connection — connect and immediately disconnect
   */
  ipcMain.handle('imap:test-connection', async () => {
    const client = await getImapClient()
    await disconnectIMAP(client)
    return { success: true }
  })

  /**
   * Fetch recent emails from INBOX
   */
  ipcMain.handle('imap:fetch-recent', async (_event, limit?: number) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) throw new Error('No vault path')
    const config = readConfig(vaultPath)
    const fetchLimit = limit ?? config.imap?.fetch_limit ?? 50
    const client = await getImapClient()
    try {
      const emails = await fetchRecentEmails(client, fetchLimit)
      return { success: true, emails }
    } finally {
      await disconnectIMAP(client)
    }
  })

  /**
   * Fetch emails from/to a specific contact email address
   */
  ipcMain.handle('imap:fetch-by-contact', async (_event, contactEmail: string, limit?: number) => {
    const client = await getImapClient()
    try {
      const emails = await fetchEmailsByContact(client, contactEmail, limit ?? 10)
      return { success: true, emails }
    } finally {
      await disconnectIMAP(client)
    }
  })

  /**
   * Fetch emails since a date range (today, last 2 days, this week)
   */
  ipcMain.handle('imap:fetch-by-date', async (_event, range: string) => {
    const now = new Date()
    const since = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (range === '2days') {
      since.setDate(since.getDate() - 1)
    } else if (range === 'week') {
      since.setDate(since.getDate() - 6)
    }
    const client = await getImapClient()
    try {
      const emails = await fetchEmailsByDate(client, since)
      return { success: true, emails }
    } finally {
      await disconnectIMAP(client)
    }
  })

  /**
   * Fetch the full body of a specific email by UID
   */
  ipcMain.handle('imap:fetch-body', async (_event, uid: number) => {
    const client = await getImapClient()
    try {
      const body = await fetchEmailBody(client, uid)
      return { success: true, ...body }
    } finally {
      await disconnectIMAP(client)
    }
  })
}
