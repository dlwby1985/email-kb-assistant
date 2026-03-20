import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { getVaultPath } from '../services/app-state'
import { readConfig } from '../services/config'
import { assemblePrompt, determineSkill } from '../services/prompt-assembly'
import { getActiveProvider } from '../services/llm/manager'
import { getSubPath } from '../services/vault'

export function registerGenerateHandlers() {
  /**
   * Run generation or polish
   */
  ipcMain.handle('generate:run', async (_event, request: any) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) {
      return { success: false, error: 'No vault configured' }
    }

    try {
      const config = readConfig(vaultPath)
      const provider = getActiveProvider(config)

      // Assemble the full prompt
      const { systemPrompt, userMessage, skill } = assemblePrompt(request, vaultPath)

      const result = await provider.generate({ systemPrompt, userMessage })

      return {
        ...result,
        skill,
      }
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Generation failed',
      }
    }
  })

  /**
   * Determine which skill will be used (for status bar display)
   */
  ipcMain.handle('generate:determine-skill', async (_event, mode: string, channel: string) => {
    return determineSkill(mode as any, channel as any)
  })

  /**
   * Pre-send review: check a generated draft against the reviewer skill
   */
  ipcMain.handle('generate:review', async (_event, request: any) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) return { success: false, error: 'No vault configured' }

    try {
      const config = readConfig(vaultPath)
      const provider = getActiveProvider(config)

      // Load reviewer skill file
      const reviewerPath = getSubPath(vaultPath, 'skills', 'reviewer.md')
      if (!fs.existsSync(reviewerPath)) {
        return { success: false, error: 'Reviewer skill not found. Restart the app to seed it.' }
      }
      const systemPrompt = fs.readFileSync(reviewerPath, 'utf-8')

      // Build user message
      const parts: string[] = []
      parts.push(`## Draft to Review\n${request.draft}`)

      if (request.coreContent) {
        parts.push(`## Original Task\n${request.coreContent}`)
      }

      if (request.channel) {
        parts.push(`## Channel\n${request.channel}`)
      }

      // Load contact profiles if any
      if (request.contactSlugs && request.contactSlugs.length > 0) {
        const profileTexts: string[] = []
        for (const slug of request.contactSlugs) {
          const profilePath = path.join(getSubPath(vaultPath, 'contacts'), slug, 'profile.md')
          if (fs.existsSync(profilePath)) {
            profileTexts.push(fs.readFileSync(profilePath, 'utf-8'))
          }
        }
        if (profileTexts.length > 0) {
          parts.push(`## Contact Profile\n${profileTexts.join('\n\n---\n\n')}`)
        }
      }

      const userMessage = parts.join('\n\n')

      return await provider.generate({ systemPrompt, userMessage })
    } catch (err: any) {
      return { success: false, error: err.message || 'Review failed' }
    }
  })

  /**
   * Test the currently configured LLM provider connection
   */
  ipcMain.handle('llm:test-connection', async () => {
    const vaultPath = getVaultPath()
    if (!vaultPath) return { success: false, error: 'No vault configured' }
    try {
      const config = readConfig(vaultPath)
      const provider = getActiveProvider(config)
      return await provider.testConnection()
    } catch (err: any) {
      return { success: false, error: err.message || 'Test failed' }
    }
  })
}
