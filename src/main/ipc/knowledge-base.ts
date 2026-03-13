import { ipcMain, shell } from 'electron'
import fs from 'fs'
import path from 'path'
import { getVaultPath } from '../services/app-state'
import { getSubPath, requireSafeFilename } from '../services/vault'
import {
  indexKnowledgeBase,
  searchKnowledgeBase,
  getKBList,
  getKBStats,
  indexSingleFile,
  deleteKBFile,
} from '../services/knowledge-base'
import { fetchURL, saveURLDocument } from '../services/url-fetcher'

export function registerKnowledgeBaseHandlers() {
  /** Full reindex of all documents in knowledge-base/ */
  ipcMain.handle('kb:index', async () => {
    const vaultPath = getVaultPath()
    if (!vaultPath) return { success: false, error: 'No vault configured', indexed: 0, errors: 0 }
    try {
      const result = await indexKnowledgeBase(vaultPath)
      return { success: true, ...result }
    } catch (err: any) {
      return { success: false, error: err.message, indexed: 0, errors: 0 }
    }
  })

  /** Search knowledge base documents */
  ipcMain.handle('kb:search', (_event, query: string, limit?: number) => {
    return searchKnowledgeBase(query, limit ?? 3)
  })

  /** List all files in knowledge-base/ */
  ipcMain.handle('kb:list', () => {
    const vaultPath = getVaultPath()
    if (!vaultPath) return []
    return getKBList(vaultPath)
  })

  /** Get knowledge base stats */
  ipcMain.handle('kb:stats', () => {
    const vaultPath = getVaultPath()
    if (!vaultPath) return { totalFiles: 0, indexedCount: 0, kbDir: '' }
    return getKBStats(vaultPath)
  })

  /** Open knowledge-base folder in OS file explorer */
  ipcMain.handle('kb:open-folder', () => {
    const vaultPath = getVaultPath()
    if (!vaultPath) return false
    const kbDir = getSubPath(vaultPath, 'knowledge-base')
    shell.openPath(kbDir)
    return true
  })

  /**
   * Fetch a URL, save content as .md in knowledge-base/, and index it.
   * Returns: { success, title, error? }
   */
  ipcMain.handle('kb:add-url', async (_event, url: string) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) return { success: false, title: '', error: 'No vault configured' }
    try {
      const { title, text } = await fetchURL(url)
      const { filePath } = saveURLDocument(vaultPath, title, text, url)
      await indexSingleFile(filePath)
      return { success: true, title }
    } catch (err: any) {
      return { success: false, title: '', error: err.message || 'Failed to fetch URL' }
    }
  })

  /**
   * Re-fetch a URL-sourced document (updates content, keeps same slug/filename).
   * Returns: { success, title, error? }
   */
  ipcMain.handle('kb:refetch-url', async (_event, filename: string, url: string) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) return { success: false, title: '', error: 'No vault configured' }
    try {
      requireSafeFilename(filename)
      const { title, text } = await fetchURL(url)
      const slug = filename.replace(/\.md$/, '')
      const { filePath } = saveURLDocument(vaultPath, title, text, url, slug)
      await indexSingleFile(filePath)
      return { success: true, title }
    } catch (err: any) {
      return { success: false, title: '', error: err.message || 'Failed to refetch URL' }
    }
  })

  /**
   * Delete a KB file (any source — local or URL) from disk and SQLite.
   * Returns: { success, error? }
   */
  ipcMain.handle('kb:delete', async (_event, filename: string) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) return { success: false, error: 'No vault configured' }
    try {
      requireSafeFilename(filename)
      deleteKBFile(vaultPath, filename)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete file' }
    }
  })

  /**
   * Fetch a URL and return its text content WITHOUT saving to the KB.
   * Used by the Compose reference-doc attachment (one-time context only).
   * Returns: { success, title, text, wordCount, error? }
   */
  ipcMain.handle('kb:fetch-url-text', async (_event, url: string) => {
    try {
      const { title, text } = await fetchURL(url)
      const wordCount = text.trim().split(/\s+/).filter(Boolean).length
      return { success: true, title, text, wordCount }
    } catch (err: any) {
      return { success: false, title: '', text: '', wordCount: 0, error: err.message || 'Failed to fetch URL' }
    }
  })

  /**
   * Copy a local file into knowledge-base/ and index it immediately.
   * Handles filename conflicts by appending -2, -3, etc.
   * Returns: { success, filename, error? }
   */
  ipcMain.handle('kb:upload-file', async (_event, sourcePath: string) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) return { success: false, filename: '', error: 'No vault configured' }
    try {
      if (!fs.existsSync(sourcePath)) {
        return { success: false, filename: '', error: 'Source file not found' }
      }

      const ALLOWED = new Set(['.md', '.txt', '.text', '.pdf', '.docx'])
      const ext = path.extname(sourcePath).toLowerCase()
      if (!ALLOWED.has(ext)) {
        return { success: false, filename: '', error: `Unsupported file type: ${ext}` }
      }

      const kbDir = getSubPath(vaultPath, 'knowledge-base')
      if (!fs.existsSync(kbDir)) fs.mkdirSync(kbDir, { recursive: true })

      const baseName = path.basename(sourcePath)
      const nameNoExt = baseName.slice(0, baseName.length - ext.length)
      let destFilename = baseName
      let destPath = path.join(kbDir, destFilename)

      // Resolve filename conflicts
      if (fs.existsSync(destPath)) {
        let i = 2
        while (fs.existsSync(path.join(kbDir, `${nameNoExt}-${i}${ext}`))) i++
        destFilename = `${nameNoExt}-${i}${ext}`
        destPath = path.join(kbDir, destFilename)
      }

      fs.copyFileSync(sourcePath, destPath)
      await indexSingleFile(destPath)
      return { success: true, filename: destFilename }
    } catch (err: any) {
      return { success: false, filename: '', error: err.message || 'Upload failed' }
    }
  })
}
