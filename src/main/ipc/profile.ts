import { ipcMain } from 'electron'
import fs from 'fs'
import { getVaultPath } from '../services/app-state'
import { getSubPath } from '../services/vault'
import { readMarkdownFile } from '../services/markdown'
import { readConfig } from '../services/config'
import { getActiveProvider } from '../services/llm/manager'

function getProfilePath(vaultPath: string): string {
  return getSubPath(vaultPath, 'my-profile.md')
}

export function registerProfileHandlers() {
  /** Read body content of my-profile.md (strips frontmatter for editing) */
  ipcMain.handle('profile:read', () => {
    const vaultPath = getVaultPath()
    if (!vaultPath) return { content: '', lastUpdated: null }
    const profilePath = getProfilePath(vaultPath)
    if (!fs.existsSync(profilePath)) return { content: '', lastUpdated: null }
    const { content, data } = readMarkdownFile(profilePath)
    return {
      content: content.trim(),
      lastUpdated: data.last_updated ?? null,
    }
  })

  /** Write body content — updates last_updated in frontmatter */
  ipcMain.handle('profile:write', (_event, content: string) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) throw new Error('No vault configured')
    const profilePath = getProfilePath(vaultPath)
    const lastUpdated = new Date().toISOString()
    const fileContent = `---\ntype: "user-profile"\nlast_updated: "${lastUpdated}"\n---\n\n${content.trim()}\n`
    fs.writeFileSync(profilePath, fileContent, 'utf-8')
    return { success: true, lastUpdated }
  })

  /** Import from AI memory export — restructure with active LLM */
  ipcMain.handle('profile:import-from-text', async (_event, rawText: string) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) throw new Error('No vault configured')
    const config = readConfig(vaultPath)
    const provider = getActiveProvider(config)
    const systemPrompt = `You are helping a user import their profile from an AI assistant's memory export. Extract ONLY professionally relevant information for an email drafting assistant: name, title, role, institution, communication preferences, language preferences, and professional context. Exclude personal relationships, health info, financial info, passwords, or anything sensitive. Format as natural paragraphs in first person, like a self-description. Be concise. Output ONLY the profile text with no preamble, explanation, or headings.`
    const result = await provider.generate({ systemPrompt, userMessage: rawText })
    if (!result.success) throw new Error(result.error || 'Import failed')
    return { success: true, restructured: result.text ?? '' }
  })
}
