import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { getVaultPath } from '../services/app-state'
import { getSubPath, requirePathInVault } from '../services/vault'
import { readMarkdownFile, listMarkdownFiles } from '../services/markdown'
import { saveThread, generateSubjectSlug, regenerateAllMd } from '../services/thread-save'
import { updateAutoSummary } from '../services/auto-summary'
import { indexThread, deleteThreadIndex, getDatabase } from '../services/search'
import { getEmbedding, storeEmbedding, deleteEmbedding } from '../services/embeddings'

export function registerThreadsHandlers() {
  /**
   * Save a thread to the contact's threads/ directory
   */
  ipcMain.handle('threads:save', async (_event, params: any) => {
    const vaultPath = getVaultPath()

    if (!vaultPath) {
      return { success: false, error: 'No vault configured' }
    }

    try {
      const result = saveThread(params, vaultPath)

      // Index new thread in SQLite (synchronous, fast — just a DB insert)
      if (result.success && result.fileName && !params.appendToThread) {
        for (const slug of (params.contactSlugs || [])) {
          const threadPath = path.join(
            getSubPath(vaultPath, 'contacts'), slug, 'threads', result.fileName
          )
          try {
            const { data, content } = readMarkdownFile(threadPath)
            indexThread({
              filePath: threadPath,
              contactSlug: slug,
              channel: data.channel || params.channel || 'email',
              direction: data.direction || params.direction || 'outgoing',
              subject: data.subject || params.subject || '',
              tags: data.tags || params.tags || [],
              createdAt: data.created_at || new Date().toISOString(),
              content,
            })

            // Auto-embed in background for semantic search (fire-and-forget)
            setImmediate(async () => {
              try {
                const text = content.replace(/^---[\s\S]*?---\n?/, '').trim()
                const embedding = await getEmbedding(text)
                storeEmbedding(threadPath, embedding)
              } catch {
                // Silently skip — no API key or network error
              }
            })
          } catch (err) {
            console.error('[threads:save] Search index failed for:', threadPath, err)
          }
        }
      }

      // Fire-and-forget: update auto-summary for each contact in the background
      if (result.success && params.contactSlugs?.length > 0) {
        for (const slug of params.contactSlugs) {
          updateAutoSummary(slug, vaultPath).catch((err) => {
            console.error('[threads:save] Auto-summary background update failed for', slug, ':', err)
          })
        }
      }

      // Save as reusable template if requested
      let templateFilePath: string | undefined
      if (result.success && params.saveAsTemplate && params.templateName) {
        try {
          const slug = generateSubjectSlug(params.templateName)
          const templateFileName = `${slug}.md`
          templateFilePath = getSubPath(vaultPath, 'templates', templateFileName)
          const emailContent = params.finalVersion || params.generatedDraft || ''
          const now = new Date().toLocaleDateString()
          const templateContent = [
            `# ${params.templateName}`,
            '',
            `_Saved from thread: ${result.fileName || 'unknown'} — ${now}_`,
            '',
            '---',
            '',
            emailContent,
          ].join('\n')
          fs.writeFileSync(templateFilePath, templateContent, 'utf-8')
        } catch (err: any) {
          console.error('[threads:save] Failed to save template:', err.message)
          templateFilePath = undefined
        }
      }

      // Build the thread file path for the success notification
      let threadFilePath: string | undefined
      if (result.success && result.fileName && params.contactSlugs?.length > 0) {
        threadFilePath = path.join(
          getSubPath(vaultPath, 'contacts'),
          params.contactSlugs[0],
          'threads',
          result.fileName
        )
      }

      return { ...result, threadFilePath, templateFilePath }
    } catch (err: any) {
      console.error('[threads:save] EXCEPTION:', err.message, err.stack)
      return { success: false, error: err.message }
    }
  })

  /**
   * List all threads for a contact (metadata only)
   */
  ipcMain.handle('threads:list', async (_event, contactSlug: string) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) return []

    const threadsDir = path.join(getSubPath(vaultPath, 'contacts'), contactSlug, 'threads')
    const files = listMarkdownFiles(threadsDir)

    const threads: any[] = []
    for (const filePath of files) {
      try {
        const { data } = readMarkdownFile(filePath)
        threads.push({
          ...data,
          fileName: path.basename(filePath),
          filePath,
        })
      } catch {
        // Skip unparseable files
      }
    }

    // Sort by created_at descending
    threads.sort((a: any, b: any) => (b.created_at > a.created_at ? 1 : -1))
    return threads
  })

  /**
   * Get a single thread's full content
   */
  ipcMain.handle('threads:get', async (_event, filePath: string) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) throw new Error('No vault configured')
    requirePathInVault(filePath, vaultPath)
    if (!fs.existsSync(filePath)) {
      throw new Error(`Thread file not found: ${filePath}`)
    }
    const { data, content } = readMarkdownFile(filePath)
    return { meta: data, content }
  })

  /**
   * Delete a thread file and regenerate _all.md + clean up search/embedding indexes
   */
  ipcMain.handle('threads:delete', async (_event, filePath: string, contactSlug: string) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) return { success: false, error: 'No vault configured' }
    try { requirePathInVault(filePath, vaultPath) } catch { return { success: false, error: 'Access denied' } }
    if (!fs.existsSync(filePath)) return { success: false, error: 'Thread file not found' }

    try {
      fs.unlinkSync(filePath)
      deleteThreadIndex(filePath)
      try { deleteEmbedding(filePath) } catch { /* ignore */ }
      regenerateAllMd(contactSlug, vaultPath)

      return { success: true }
    } catch (err: any) {
      console.error('[threads:delete] Error:', err.message)
      return { success: false, error: err.message }
    }
  })

  /**
   * Get existing threads for a contact (for "append to existing" dropdown)
   * Returns only the most recent 5 threads to keep the dropdown manageable
   */
  ipcMain.handle('threads:get-existing', async (_event, contactSlug: string, query?: string) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) return []

    const threadsDir = path.join(getSubPath(vaultPath, 'contacts'), contactSlug, 'threads')
    const files = listMarkdownFiles(threadsDir)

    const allResults: Array<{ fileName: string; label: string; createdAt: string }> = []
    for (const filePath of files) {
      try {
        const { data } = readMarkdownFile(filePath)
        const fileName = path.basename(filePath)
        const createdAt = data.created_at || ''
        const date = createdAt
          ? new Date(createdAt).toLocaleDateString()
          : ''
        const label = `${date} ${data.subject || fileName}`.trim()
        allResults.push({ fileName, label, createdAt })
      } catch {
        // Skip
      }
    }

    // Sort by created_at descending (most recent first)
    allResults.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))

    // If search query provided, filter by label
    let filtered = allResults
    if (query && query.trim()) {
      const q = query.trim().toLowerCase()
      filtered = allResults.filter((t) => t.label.toLowerCase().includes(q))
    }

    // Return only most recent 5 (or all search results capped at 10)
    const limit = query ? 10 : 5
    return filtered.slice(0, limit).map(({ fileName, label }) => ({ fileName, label }))
  })
}
