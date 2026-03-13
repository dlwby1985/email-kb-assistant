import { safeStorage } from 'electron'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import { getAccessToken } from './google-oauth'

export interface FetchedEmail {
  uid: number
  messageId: string
  subject: string
  from: string
  fromEmail: string
  to: string[]
  date: string
  textBody: string
  htmlBody: string
}

/**
 * Encrypt a password string using Electron's safeStorage (OS-level encryption)
 */
export function encryptPassword(plain: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS encryption not available')
  }
  const buf = safeStorage.encryptString(plain)
  return buf.toString('base64')
}

/**
 * Decrypt a stored password
 */
export function decryptPassword(encrypted: string): string {
  if (!encrypted) return ''
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS encryption not available')
  }
  try {
    const buf = Buffer.from(encrypted, 'base64')
    return safeStorage.decryptString(buf)
  } catch {
    return ''
  }
}

/**
 * Create and connect an ImapFlow client
 */
export async function connectIMAP(
  host: string,
  port: number,
  email: string,
  password: string
): Promise<ImapFlow> {
  const client = new ImapFlow({
    host,
    port,
    secure: port === 993,
    auth: {
      user: email,
      pass: password,
    },
    logger: false,
    connectionTimeout: 30000,
  })
  await client.connect()
  return client
}

/**
 * Create and connect an ImapFlow client using Google OAuth 2.0
 */
export async function connectIMAPOAuth(): Promise<ImapFlow> {
  const tokenResult = await getAccessToken()
  if (!tokenResult.success || !tokenResult.accessToken) {
    throw new Error(tokenResult.error || 'Failed to get access token')
  }

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: tokenResult.email!,
      accessToken: tokenResult.accessToken,
    },
    logger: false,
    connectionTimeout: 30000,
  })
  await client.connect()
  return client
}

/**
 * Disconnect an ImapFlow client
 */
export async function disconnectIMAP(client: ImapFlow): Promise<void> {
  try {
    await client.logout()
  } catch {
    // ignore
  }
}

/**
 * Parse an email address string like "Name <email@example.com>" into parts
 */
function parseAddress(addr: any): { name: string; email: string } {
  if (!addr) return { name: '', email: '' }
  const email = addr.address || ''
  const name = addr.name || email.split('@')[0] || ''
  return { name, email }
}

/**
 * Fetch the most recent N emails from INBOX
 */
export async function fetchRecentEmails(
  client: ImapFlow,
  limit: number
): Promise<FetchedEmail[]> {
  const lock = await client.getMailboxLock('INBOX')
  try {
    const status = await client.status('INBOX', { messages: true })
    const total = status.messages ?? 0
    if (total === 0) return []

    const start = Math.max(1, total - limit + 1)
    const range = `${start}:${total}`

    const results: FetchedEmail[] = []
    for await (const msg of client.fetch(range, {
      uid: true,
      envelope: true,
      bodyStructure: true,
    })) {
      const env = msg.envelope
      const from = parseAddress(env?.from?.[0])
      const toAddrs = (env?.to ?? []).map((a: any) => a.address).filter(Boolean)

      results.push({
        uid: msg.uid ?? 0,
        messageId: env?.messageId ?? '',
        subject: env?.subject ?? '(no subject)',
        from: from.name || from.email,
        fromEmail: from.email,
        to: toAddrs,
        date: env?.date ? new Date(env.date).toISOString() : '',
        textBody: '',
        htmlBody: '',
      })
    }

    return results.reverse() // Newest first
  } finally {
    lock.release()
  }
}

/**
 * Strip HTML tags and decode entities to get plain text from HTML
 */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Fetch the full body of a specific email by UID.
 * Uses mailparser to properly decode Base64, quoted-printable, and multipart MIME.
 */
export async function fetchEmailBody(
  client: ImapFlow,
  uid: number
): Promise<{ textBody: string; htmlBody: string }> {
  const lock = await client.getMailboxLock('INBOX')
  try {
    let textBody = ''
    let htmlBody = ''
    for await (const msg of client.fetch({ uid } as any, { source: true }, { uid: true })) {
      if (!msg.source) continue
      const parsed = await simpleParser(msg.source)
      textBody = parsed.text ?? ''
      htmlBody = parsed.html ?? ''
      // If no plain text but HTML exists, convert HTML to plain text
      if (!textBody && htmlBody) {
        textBody = htmlToPlainText(htmlBody)
      }
    }
    return { textBody, htmlBody }
  } finally {
    lock.release()
  }
}

/**
 * Fetch emails received since a given date
 */
export async function fetchEmailsByDate(
  client: ImapFlow,
  since: Date
): Promise<FetchedEmail[]> {
  const lock = await client.getMailboxLock('INBOX')
  try {
    const uids = await client.search({ since }, { uid: true })
    if (!uids || uids.length === 0) return []

    const results: FetchedEmail[] = []
    for await (const msg of client.fetch(uids as any, {
      uid: true,
      envelope: true,
    }, { uid: true })) {
      const env = msg.envelope
      const from = parseAddress(env?.from?.[0])
      const toAddrs = (env?.to ?? []).map((a: any) => a.address).filter(Boolean)

      results.push({
        uid: msg.uid ?? 0,
        messageId: env?.messageId ?? '',
        subject: env?.subject ?? '(no subject)',
        from: from.name || from.email,
        fromEmail: from.email,
        to: toAddrs,
        date: env?.date ? new Date(env.date).toISOString() : '',
        textBody: '',
        htmlBody: '',
      })
    }

    return results.reverse() // Newest first
  } finally {
    lock.release()
  }
}

/**
 * Fetch emails from/to a specific contact email address
 */
export async function fetchEmailsByContact(
  client: ImapFlow,
  contactEmail: string,
  limit: number
): Promise<FetchedEmail[]> {
  const lock = await client.getMailboxLock('INBOX')
  try {
    // Search for emails from this contact
    const uids = await client.search({ from: contactEmail }, { uid: true })
    if (!uids || uids.length === 0) return []

    const recentUids = uids.slice(-limit)
    const results: FetchedEmail[] = []

    for await (const msg of client.fetch(recentUids as any, {
      uid: true,
      envelope: true,
    }, { uid: true })) {
      const env = msg.envelope
      const from = parseAddress(env?.from?.[0])
      const toAddrs = (env?.to ?? []).map((a: any) => a.address).filter(Boolean)

      results.push({
        uid: msg.uid ?? 0,
        messageId: env?.messageId ?? '',
        subject: env?.subject ?? '(no subject)',
        from: from.name || from.email,
        fromEmail: from.email,
        to: toAddrs,
        date: env?.date ? new Date(env.date).toISOString() : '',
        textBody: '',
        htmlBody: '',
      })
    }

    return results.reverse()
  } finally {
    lock.release()
  }
}
