import { ipcMain } from 'electron'
import { getVaultPath } from '../services/app-state'
import {
  listStyles,
  readStyleProfile,
  createStyle,
  deleteStyle,
  setDefaultStyle,
  saveStyleRules,
  saveStyleAutoApply,
  listStyleExamples,
  addStyleExample,
  deleteStyleExample,
  analyzeWritingStyle,
} from '../services/writing-style'

export function registerWritingStyleHandlers() {

  /** List all writing style profiles */
  ipcMain.handle('style:list', async () => {
    const vaultPath = getVaultPath()
    if (!vaultPath) return []
    try {
      return listStyles(vaultPath)
    } catch (err: any) {
      console.error('[style:list] Error:', err.message)
      return []
    }
  })

  /** Get rules + analyzed patterns for a specific style */
  ipcMain.handle('style:get', async (_event, slug: string) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) return { rules: '', analyzedPatterns: '', exampleCount: 0 }
    try {
      return readStyleProfile(vaultPath, slug)
    } catch (err: any) {
      console.error('[style:get] Error:', err.message)
      return { rules: '', analyzedPatterns: '', exampleCount: 0 }
    }
  })

  /** Create a new style */
  ipcMain.handle('style:create', async (_event, name: string, description: string) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) throw new Error('No vault configured')
    return createStyle(vaultPath, name, description)
  })

  /** Delete a style (and its examples) */
  ipcMain.handle('style:delete', async (_event, slug: string) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) throw new Error('No vault configured')
    deleteStyle(vaultPath, slug)
    return { success: true }
  })

  /** Set a style as the default */
  ipcMain.handle('style:set-default', async (_event, slug: string) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) throw new Error('No vault configured')
    setDefaultStyle(vaultPath, slug)
    return { success: true }
  })

  /** Save style rules for a specific style */
  ipcMain.handle('style:save-rules', async (_event, slug: string, rules: string) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) throw new Error('No vault configured')
    saveStyleRules(vaultPath, slug, rules)
    return { success: true }
  })

  /** Save auto_apply_for conditions */
  ipcMain.handle('style:save-auto-apply', async (_event, slug: string, autoApplyFor: any) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) throw new Error('No vault configured')
    saveStyleAutoApply(vaultPath, slug, autoApplyFor)
    return { success: true }
  })

  /** List all examples for a specific style */
  ipcMain.handle('style:list-examples', async (_event, slug: string) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) return []
    try {
      return listStyleExamples(vaultPath, slug)
    } catch (err: any) {
      console.error('[style:list-examples] Error:', err.message)
      return []
    }
  })

  /** Add an example to a specific style */
  ipcMain.handle('style:add-example', async (_event, slug: string, example: any) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) throw new Error('No vault configured')
    const fileName = addStyleExample(vaultPath, slug, example)
    return { success: true, fileName }
  })

  /** Delete an example from a specific style */
  ipcMain.handle('style:delete-example', async (_event, slug: string, fileName: string) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) throw new Error('No vault configured')
    deleteStyleExample(vaultPath, slug, fileName)
    return { success: true }
  })

  /** Analyze examples for a specific style and save patterns */
  ipcMain.handle('style:analyze', async (_event, slug: string) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) throw new Error('No vault configured')
    const patterns = await analyzeWritingStyle(vaultPath, slug)
    return { success: true, patterns }
  })
}
