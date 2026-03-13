import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { getVaultPath } from '../services/app-state'
import { getSubPath, requirePathInVault } from '../services/vault'
import { readMarkdownFile, writeMarkdownFile } from '../services/markdown'

interface DraftParams {
  contactSlugs: string[]
  contactNames: string[]
  channel: string
  mode: string
  skill: string
  background: string
  coreContent: string
  generatedDraft: string
  messageTime?: string
  subject?: string
}

function formatCompact(date: Date): string {
  const y = date.getFullYear()
  const mo = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${mo}-${d}T${h}${mi}`
}

function extractSection(content: string, name: string): string {
  const match = content.match(new RegExp(`## ${name}\n([\\s\\S]*?)(?=\n## |$)`))
  return match?.[1]?.trim() || ''
}

export function registerDraftsHandlers() {
  /**
   * Save current session as a draft
   */
  ipcMain.handle('drafts:save', async (_event, params: DraftParams) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) throw new Error('No vault configured')

    const now = new Date()
    const timestamp = formatCompact(now)
    const contactPart = params.contactSlugs.length > 0
      ? params.contactSlugs[0].substring(0, 20)
      : 'quick'
    const fileName = `${timestamp}_${params.channel}_${contactPart}.md`
    const filePath = path.join(getSubPath(vaultPath, 'drafts'), fileName)

    const frontmatter = {
      contact_slugs: params.contactSlugs,
      contact_names: params.contactNames,
      channel: params.channel,
      mode: params.mode,
      skill: params.skill,
      created_at: now.toISOString(),
      subject: params.subject || '',
    }

    const body = [
      `# Draft — ${params.subject || timestamp}`,
      '',
      '## Background',
      params.background || '',
      '',
      '## Core Content',
      params.coreContent || '',
      '',
      '## Generated Draft',
      params.generatedDraft || '',
    ].join('\n')

    writeMarkdownFile(filePath, frontmatter, body)
    return { success: true, fileName, filePath }
  })

  /**
   * List all drafts (most recent first)
   */
  ipcMain.handle('drafts:list', async () => {
    const vaultPath = getVaultPath()
    if (!vaultPath) return []

    const draftsDir = getSubPath(vaultPath, 'drafts')
    if (!fs.existsSync(draftsDir)) return []

    const files = fs.readdirSync(draftsDir)
      .filter((f) => f.endsWith('.md'))
      .sort()
      .reverse()

    const drafts: any[] = []
    for (const fileName of files) {
      try {
        const filePath = path.join(draftsDir, fileName)
        const { data, content } = readMarkdownFile(filePath)
        const preview = extractSection(content, 'Generated Draft').substring(0, 120)
        drafts.push({
          fileName,
          filePath,
          createdAt: data.created_at || '',
          subject: data.subject || '',
          contactNames: data.contact_names || [],
          channel: data.channel || '',
          preview,
        })
      } catch {
        // Skip unparseable drafts
      }
    }
    return drafts
  })

  /**
   * Load a draft's full content for resuming
   */
  ipcMain.handle('drafts:load', async (_event, filePath: string) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) throw new Error('No vault configured')
    requirePathInVault(filePath, vaultPath)
    if (!fs.existsSync(filePath)) throw new Error('Draft not found')

    const { data, content } = readMarkdownFile(filePath)
    return {
      contactSlugs: data.contact_slugs || [],
      contactNames: data.contact_names || [],
      channel: data.channel || 'email',
      mode: data.mode || 'generate',
      skill: data.skill || 'email-reply',
      createdAt: data.created_at || '',
      subject: data.subject || '',
      background: extractSection(content, 'Background'),
      coreContent: extractSection(content, 'Core Content'),
      generatedDraft: extractSection(content, 'Generated Draft'),
    }
  })

  /**
   * Delete a draft file
   */
  ipcMain.handle('drafts:delete', async (_event, filePath: string) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) throw new Error('No vault configured')
    requirePathInVault(filePath, vaultPath)
    if (!fs.existsSync(filePath)) throw new Error('Draft not found')
    fs.unlinkSync(filePath)
    return { success: true }
  })
}
