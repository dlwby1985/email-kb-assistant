/**
 * secure-storage.ts
 *
 * Encrypts API keys and stores them in a dedicated credentials file:
 *   %APPDATA%/email-kb-assistant/credentials.json
 *
 * Encryption strategy (first available wins):
 *   1. Electron safeStorage (OS keychain / DPAPI) — tagged with "safe:" prefix
 *   2. AES-256-GCM with a machine-specific key   — tagged with "aes:" prefix
 *      Key = scrypt(hostname + '::' + username, salt='email-kb-assistant-v1', 32 bytes)
 *
 * config.yaml never stores raw API keys — only boolean has_*_key flags.
 */
import { app, safeStorage } from 'electron'
import crypto from 'crypto'
import os from 'os'
import fs from 'fs'
import path from 'path'

export type ApiKeyProvider = 'anthropic' | 'openai'

// ── Credentials file path ──────────────────────────────────────────────────────

function getCredentialsPath(): string {
  return path.join(app.getPath('userData'), 'credentials.json')
}

function readCredentials(): Record<string, string> {
  const p = getCredentialsPath()
  try {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8')) as Record<string, string>
    }
  } catch {
    // Corrupted file — start fresh
  }
  return {}
}

function writeCredentials(creds: Record<string, string>): void {
  const p = getCredentialsPath()
  const dir = path.dirname(p)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(p, JSON.stringify(creds, null, 2), 'utf-8')
}

// ── AES-256-GCM machine key ───────────────────────────────────────────────────

const AES_SALT = 'email-kb-assistant-v1'

function getMachineKey(): Buffer {
  const seed = os.hostname() + '::' + os.userInfo().username
  return crypto.scryptSync(seed, AES_SALT, 32) as Buffer
}

function aesEncrypt(plaintext: string): string {
  const key = getMachineKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  // Layout: iv(16) + authTag(16) + ciphertext → base64
  const combined = Buffer.concat([iv, authTag, encrypted])
  return 'aes:' + combined.toString('base64')
}

function aesDecrypt(tagged: string): string {
  const b64 = tagged.slice(4) // strip 'aes:' prefix
  const combined = Buffer.from(b64, 'base64')
  const key = getMachineKey()
  const iv = combined.subarray(0, 16)
  const authTag = combined.subarray(16, 32)
  const ciphertext = combined.subarray(32)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  return decipher.update(ciphertext).toString('utf-8') + decipher.final('utf-8')
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Encrypt `plaintext` and persist in credentials.json.
 * Prefers OS safeStorage; falls back to AES-256-GCM.
 */
export function setApiKey(provider: ApiKeyProvider, plaintext: string): void {
  let encrypted: string

  if (safeStorage.isEncryptionAvailable()) {
    encrypted = 'safe:' + safeStorage.encryptString(plaintext).toString('base64')
  } else {
    encrypted = aesEncrypt(plaintext)
  }

  const creds = readCredentials()
  creds[provider] = encrypted
  writeCredentials(creds)
}

/**
 * Decrypt and return the API key for `provider`.
 * Returns '' if the key is not set or cannot be decrypted.
 */
export function getApiKey(provider: ApiKeyProvider): string {
  const creds = readCredentials()
  const entry = creds[provider]
  if (!entry) return ''

  try {
    if (entry.startsWith('safe:')) {
      if (!safeStorage.isEncryptionAvailable()) {
        console.warn(`[secure-storage] getApiKey(${provider}): entry uses safeStorage but encryption unavailable`)
        return ''
      }
      const buf = Buffer.from(entry.slice(5), 'base64')
      return safeStorage.decryptString(buf)
    }

    if (entry.startsWith('aes:')) {
      return aesDecrypt(entry)
    }

    console.warn(`[secure-storage] getApiKey(${provider}): unknown prefix — ignoring`)
    return ''
  } catch (err) {
    console.error(`[secure-storage] getApiKey(${provider}) decryption failed:`, err)
    return ''
  }
}

/**
 * Returns true if an encrypted entry exists for this provider.
 */
export function hasApiKey(provider: ApiKeyProvider): boolean {
  return !!readCredentials()[provider]
}

/**
 * Remove the stored key for `provider`.
 */
export function deleteApiKey(provider: ApiKeyProvider): void {
  const creds = readCredentials()
  delete creds[provider]
  writeCredentials(creds)
}
