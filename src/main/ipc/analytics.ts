import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { getVaultPath } from '../services/app-state'
import { getSubPath } from '../services/vault'
import { readMarkdownFile, listMarkdownFiles } from '../services/markdown'

export interface AnalyticsStats {
  totalThreads: number
  totalContacts: number
  byChannel: Record<string, number>
  byDirection: Record<string, number>
  topContacts: Array<{ slug: string; name: string; count: number }>
  byMonth: Array<{ month: string; count: number }>     // Last 12 months ISO yyyy-mm
  topTags: Array<{ tag: string; count: number }>
  mostRecentThread: string | null
}

export function registerAnalyticsHandlers() {
  ipcMain.handle('analytics:get-stats', async (): Promise<AnalyticsStats> => {
    const vaultPath = getVaultPath()

    const empty: AnalyticsStats = {
      totalThreads: 0,
      totalContacts: 0,
      byChannel: {},
      byDirection: {},
      topContacts: [],
      byMonth: [],
      topTags: [],
      mostRecentThread: null,
    }

    if (!vaultPath) return empty

    const contactsDir = getSubPath(vaultPath, 'contacts')
    if (!fs.existsSync(contactsDir)) return empty

    const slugs = fs.readdirSync(contactsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)

    const byChannel: Record<string, number> = {}
    const byDirection: Record<string, number> = {}
    const contactCounts: Map<string, { name: string; count: number }> = new Map()
    const byMonthMap: Map<string, number> = new Map()
    const tagCounts: Map<string, number> = new Map()

    let totalThreads = 0
    let mostRecentDate: Date | null = null
    let mostRecentThread: string | null = null

    for (const slug of slugs) {
      const threadsDir = path.join(contactsDir, slug, 'threads')
      const files = listMarkdownFiles(threadsDir)
      if (files.length === 0) continue

      contactCounts.set(slug, { name: slug, count: 0 })

      for (const filePath of files) {
        try {
          const { data } = readMarkdownFile(filePath)
          totalThreads++

          const contactEntry = contactCounts.get(slug)!
          contactEntry.count++
          // Try to get proper display name
          if (data.contact_name) contactEntry.name = data.contact_name

          // Channel
          const channel = data.channel || 'email'
          byChannel[channel] = (byChannel[channel] || 0) + 1

          // Direction
          const direction = data.direction || 'outgoing'
          byDirection[direction] = (byDirection[direction] || 0) + 1

          // Month
          const dateStr = data.created_at || data.message_time || ''
          if (dateStr) {
            try {
              const d = new Date(dateStr)
              if (!isNaN(d.getTime())) {
                const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                byMonthMap.set(monthKey, (byMonthMap.get(monthKey) || 0) + 1)
                if (!mostRecentDate || d > mostRecentDate) {
                  mostRecentDate = d
                  mostRecentThread = filePath
                }
              }
            } catch {
              // ignore parse errors
            }
          }

          // Tags
          const tags: string[] = Array.isArray(data.tags) ? data.tags : []
          for (const tag of tags) {
            if (tag) tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
          }
        } catch {
          // Skip unparseable files
        }
      }
    }

    // Build last 12 months array
    const now = new Date()
    const byMonth: Array<{ month: string; count: number }> = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      byMonth.push({ month: key, count: byMonthMap.get(key) || 0 })
    }

    // Top contacts (sorted by count, top 8)
    const topContacts = Array.from(contactCounts.entries())
      .map(([slug, { name, count }]) => ({ slug, name, count }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)

    // Top tags (top 10)
    const topTags = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      totalThreads,
      totalContacts: slugs.length,
      byChannel,
      byDirection,
      topContacts,
      byMonth,
      topTags,
      mostRecentThread,
    }
  })
}
