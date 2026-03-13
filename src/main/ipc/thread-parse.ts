import { ipcMain } from 'electron'
import { getVaultPath } from '../services/app-state'
import {
  isEmailThread,
  parseEmailThread,
  parseEmailThreadWithAI,
  formatParsedThread,
} from '../services/thread-parser'

export function registerThreadParseHandlers() {
  /**
   * thread:parse — parse email thread text into structured, chronological Markdown.
   * Uses regex first; if regex finds < 2 messages, falls back to AI.
   * Returns: { success, formatted, messageCount, senders, error? }
   */
  ipcMain.handle('thread:parse', async (_event, text: string) => {
    try {
      let parsed = parseEmailThread(text)

      // Regex extracted < 2 messages — try AI fallback
      if (parsed.totalMessages < 2) {
        const vaultPath = getVaultPath()
        if (vaultPath) {
          parsed = await parseEmailThreadWithAI(text, vaultPath)
        }
      }

      const formatted = formatParsedThread(parsed)
      const senders = [...new Set(parsed.emails.map((e) => e.sender))]

      return {
        success: true,
        formatted,
        messageCount: parsed.totalMessages,
        senders,
      }
    } catch (err: any) {
      console.error('[thread:parse] error:', err)
      return { success: false, error: err.message ?? 'Parse failed' }
    }
  })
}
