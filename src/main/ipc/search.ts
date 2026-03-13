import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { getVaultPath } from '../services/app-state'
import { getSubPath } from '../services/vault'
import { indexAllThreads, searchThreads, type SearchResult } from '../services/search'
import { listMarkdownFiles, readMarkdownFile } from '../services/markdown'
import {
  getEmbedding,
  storeEmbedding,
  semanticSearchLocal,
  countEmbeddings,
  type SemanticSearchResult,
} from '../services/embeddings'

export function registerSearchHandlers() {
  /**
   * Full-text search across all indexed threads
   * Returns ranked results with snippets
   */
  ipcMain.handle('search:query', async (
    _event,
    query: string,
    options?: { limit?: number; contactSlug?: string; channel?: string }
  ): Promise<SearchResult[]> => {
    if (!query?.trim()) return []
    try {
      return searchThreads(query, options)
    } catch (err: any) {
      console.error('[search:query] Error:', err.message)
      return []
    }
  })

  /**
   * Rebuild the entire search index from disk
   */
  ipcMain.handle('search:reindex', async () => {
    const vaultPath = getVaultPath()
    if (!vaultPath) return { success: false, error: 'No vault configured' }

    try {
      indexAllThreads(vaultPath)
      return { success: true }
    } catch (err: any) {
      console.error('[search:reindex] Error:', err.message)
      return { success: false, error: err.message }
    }
  })

  /**
   * Semantic search using DashScope embeddings + cosine similarity.
   * Returns results enriched with thread metadata, ranked by similarity score.
   */
  ipcMain.handle('search:semantic', async (
    _event,
    query: string,
    options?: { limit?: number; contactSlug?: string }
  ): Promise<{ results: Array<SearchResult & { score: number }>; embeddedCount: number }> => {
    const vaultPath = getVaultPath()
    if (!vaultPath || !query?.trim()) {
      return { results: [], embeddedCount: countEmbeddings() }
    }

    try {
      const queryEmbedding = await getEmbedding(query)
      const matches: SemanticSearchResult[] = semanticSearchLocal(queryEmbedding, options)

      const results: Array<SearchResult & { score: number }> = []
      for (const match of matches) {
        try {
          if (!fs.existsSync(match.filePath)) continue
          const { data, content } = readMarkdownFile(match.filePath)
          const snippet = content.replace(/^---[\s\S]*?---\n?/, '').trim().slice(0, 200)
          results.push({
            filePath: match.filePath,
            contactSlug: data.contact || '',
            channel: data.channel || 'email',
            direction: data.direction || 'outgoing',
            subject: data.subject || '',
            tags: Array.isArray(data.tags) ? data.tags : [],
            createdAt: data.created_at || '',
            snippet,
            rank: match.score,
            score: match.score,
          })
        } catch {
          // skip unparseable
        }
      }

      return { results, embeddedCount: countEmbeddings() }
    } catch (err: any) {
      console.error('[search:semantic] Error:', err.message)
      return { results: [], embeddedCount: countEmbeddings() }
    }
  })

  /**
   * Kick off background embedding of all threads (only unembedded ones).
   */
  ipcMain.handle('search:embed-all', async () => {
    const vaultPath = getVaultPath()
    if (!vaultPath) return { success: false, error: 'No vault configured' }

    const contactsDir = getSubPath(vaultPath, 'contacts')
    if (!fs.existsSync(contactsDir)) return { success: true }

    const slugs = fs.readdirSync(contactsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)

    setImmediate(async () => {
      for (const slug of slugs) {
        const threadsDir = path.join(contactsDir, slug, 'threads')
        const files = listMarkdownFiles(threadsDir)
        for (const filePath of files) {
          try {
            const { content } = readMarkdownFile(filePath)
            const text = content.replace(/^---[\s\S]*?---\n?/, '').trim()
            const embedding = await getEmbedding(text)
            storeEmbedding(filePath, embedding)
          } catch (err: any) {
            console.error('[search:embed-all] Failed:', filePath, err.message)
          }
        }
      }
    })

    return { success: true }
  })

  /**
   * Embed a single thread file after it has been saved.
   */
  ipcMain.handle('search:embed-thread', async (_event, filePath: string) => {
    if (!fs.existsSync(filePath)) return { success: false, error: 'File not found' }
    try {
      const { content } = readMarkdownFile(filePath)
      const text = content.replace(/^---[\s\S]*?---\n?/, '').trim()
      const embedding = await getEmbedding(text)
      storeEmbedding(filePath, embedding)
      return { success: true }
    } catch (err: any) {
      console.error('[search:embed-thread] Error:', err.message)
      return { success: false, error: err.message }
    }
  })

  /**
   * Returns how many threads currently have embeddings stored.
   */
  ipcMain.handle('search:embed-count', async () => {
    return { count: countEmbeddings() }
  })
}
