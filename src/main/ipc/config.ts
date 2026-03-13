import { ipcMain } from 'electron'
import { getVaultPath } from '../services/app-state'
import { readConfig, writeConfig, type Config } from '../services/config'
import { setApiKey, type ApiKeyProvider } from '../services/secure-storage'

export function registerConfigHandlers() {
  /**
   * Read config.yaml from the vault
   */
  ipcMain.handle('config:read', async () => {
    const vaultPath = getVaultPath()
    if (!vaultPath) {
      throw new Error('No vault path configured')
    }
    return readConfig(vaultPath)
  })

  /**
   * Write updated config.yaml to the vault
   */
  ipcMain.handle('config:write', async (_event, config: Config) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) {
      throw new Error('No vault path configured')
    }
    writeConfig(vaultPath, config)
  })

  /**
   * Get the stored vault path from app state
   */
  ipcMain.handle('config:get-vault-path', async () => {
    return getVaultPath()
  })

  /**
   * Store an API key in OS safeStorage and update the has_*_key flag in config.yaml.
   * The plaintext key is never persisted to disk.
   */
  ipcMain.handle('config:set-api-key', async (_event, provider: ApiKeyProvider, key: string) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) throw new Error('No vault path configured')
    if (!key || !key.trim()) return { success: false, error: 'Key must not be empty' }
    setApiKey(provider, key.trim())
    // Update the has_*_key flag so the renderer knows a key is stored
    const config = readConfig(vaultPath)
    if (provider === 'anthropic') config.has_anthropic_key = true
    if (provider === 'openai') config.has_openai_key = true
    writeConfig(vaultPath, config)
    return { success: true }
  })
}
