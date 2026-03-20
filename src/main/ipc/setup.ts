import { ipcMain, dialog, BrowserWindow } from 'electron'
import path from 'path'
import { getVaultPath, setVaultPath } from '../services/app-state'
import { initializeVaultStructure, vaultExists, writeFileIfNotExists, getSubPath } from '../services/vault'
import { createDefaultConfig } from '../services/config'
import { DEFAULT_SKILLS } from '../defaults/skills'
import { DEFAULT_TEMPLATES } from '../defaults/templates'

export function registerSetupHandlers() {
  /**
   * Check if this is a first launch (no vault path saved or vault doesn't exist)
   */
  ipcMain.handle('setup:check-first-launch', async () => {
    const vaultPath = getVaultPath()
    if (!vaultPath) {
      return { isFirstLaunch: true }
    }
    if (!vaultExists(vaultPath)) {
      return { isFirstLaunch: true, vaultPath }
    }
    return { isFirstLaunch: false, vaultPath }
  })

  /**
   * Open a folder picker dialog for vault/data folder selection.
   * mode: 'obsidian' (default) shows Obsidian-oriented dialog text;
   *       'standalone' shows generic folder dialog text.
   */
  ipcMain.handle('setup:select-vault-folder', async (_event, mode?: 'obsidian' | 'standalone') => {
    const win = BrowserWindow.getFocusedWindow()
    const isObsidian = !mode || mode === 'obsidian'
    const result = await dialog.showOpenDialog(win!, {
      title: isObsidian ? 'Select your Obsidian vault folder' : 'Select a folder to store your data',
      properties: ['openDirectory'],
      buttonLabel: isObsidian ? 'Select Vault' : 'Select Folder',
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })

  /**
   * Initialize the vault: create directory structure, skill files, and config.
   * mode: 'obsidian' (default) or 'standalone'
   */
  ipcMain.handle(
    'setup:initialize',
    async (_event, vaultPath: string, apiKey: string, mode?: 'obsidian' | 'standalone') => {
      const storageMode = mode ?? 'obsidian'

      // 1. Create directory structure
      initializeVaultStructure(vaultPath)

      // 2. Write all default skill files (idempotent)
      const skillsDir = getSubPath(vaultPath, 'skills')
      for (const [fileName, content] of Object.entries(DEFAULT_SKILLS)) {
        writeFileIfNotExists(path.join(skillsDir, fileName), content)
      }

      // 2b. Write all default template files (idempotent)
      const templatesDir = getSubPath(vaultPath, 'templates')
      for (const [fileName, content] of Object.entries(DEFAULT_TEMPLATES)) {
        writeFileIfNotExists(path.join(templatesDir, fileName), content)
      }

      // 3. Create default config.yaml (with storage_mode)
      createDefaultConfig(vaultPath, apiKey, storageMode)

      // 4. Save vault path to app state (for next launch)
      setVaultPath(vaultPath)
    }
  )
}
