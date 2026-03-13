import fs from 'fs'
import path from 'path'
import { getSubPath } from './vault'
import { readMarkdownFile, writeMarkdownFile, updateFrontmatter, listMarkdownFiles } from './markdown'

interface SaveThreadParams {
  contactSlugs: string[]
  contactNames: string[]
  direction: string
  channel: string
  tags: string[]
  subject?: string
  background: string
  coreContent: string
  generatedDraft: string
  finalVersion?: string
  messageTime?: string
  skillUsed: string
  templateUsed?: string
  appendToThread?: string | null
}

/**
 * Format a Date as compact ISO timestamp (Windows-safe: no colons)
 * e.g. "2026-03-07T1432"
 */
export function formatCompactTimestamp(date: Date): string {
  const y = date.getFullYear()
  const mo = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${mo}-${d}T${h}${mi}`
}

/**
 * Generate a short topic slug from content text
 * e.g. "Agree to adjust. Need someone for 553." → "adjust-need-someone-553"
 */
export function generateTopicSlug(content: string): string {
  return content
    .split(/[.\n!?]/)[0]           // Take first sentence
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')  // Remove non-alphanumeric
    .trim()
    .split(/\s+/)                   // Split words
    .slice(0, 4)                    // Take first 4 words
    .join('-')
    .replace(/-+/g, '-')
    .substring(0, 40)              // Max 40 chars
    || 'untitled'
}

/**
 * Generate a filename-safe slug from a subject line
 * e.g. "Re: Meeting Reschedule — Friday" → "re-meeting-reschedule-friday"
 */
export function generateSubjectSlug(subject: string): string {
  return subject
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')  // Remove non-alphanumeric
    .trim()
    .replace(/\s+/g, '-')           // Spaces to hyphens
    .replace(/-+/g, '-')            // Collapse multiple hyphens
    .substring(0, 60)               // Max 60 chars
    || 'untitled'
}

/**
 * Build thread filename:
 * {ISO-timestamp-compact}_{channel}_{subject-slug}.md
 * Uses subject if provided, falls back to topic from content
 */
function buildThreadFilename(
  date: Date,
  channel: string,
  content: string,
  subject?: string
): string {
  const timestamp = formatCompactTimestamp(date)
  const slug = subject
    ? generateSubjectSlug(subject)
    : generateTopicSlug(content)
  return `${timestamp}_${channel}_${slug}.md`
}

/**
 * Build the thread file content with all sections per spec §3.5
 */
function buildThreadContent(params: SaveThreadParams): string {
  const lines: string[] = []
  const date = params.messageTime
    ? new Date(params.messageTime)
    : new Date()
  const dateStr = date.toISOString().split('T')[0]

  lines.push(`# ${dateStr} — ${params.subject || generateTopicSlug(params.coreContent)}`)
  lines.push('')

  if (params.background) {
    lines.push('## Background')
    lines.push('_(Content from the Background Info box)_')
    lines.push('')
    lines.push(params.background)
    lines.push('')
  }

  if (params.direction === 'incoming-reply') {
    lines.push('## Received Content')
    lines.push('_(Content pasted from email/message)_')
    lines.push('')
    // Background often contains the received content in reply mode
    lines.push('')
  }

  lines.push('## Core Input')
  lines.push('_(User\'s key points from the Core Content box)_')
  lines.push('')
  lines.push(params.coreContent)
  lines.push('')

  lines.push('## Generated Draft')
  lines.push('_(Claude\'s output)_')
  lines.push('')
  lines.push(params.generatedDraft)
  lines.push('')

  if (params.finalVersion && params.finalVersion !== params.generatedDraft) {
    lines.push('## Final Version')
    lines.push('_(User\'s edited version, if different from draft)_')
    lines.push('')
    lines.push(params.finalVersion)
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Build frontmatter for a thread file per spec §3.5
 */
function buildThreadFrontmatter(
  params: SaveThreadParams,
  contactSlug: string,
  contactName: string
): Record<string, any> {
  const now = new Date().toISOString()
  return {
    contact: contactSlug,
    contact_name: contactName,
    direction: params.direction,
    channel: params.channel,
    subject: params.subject || '',
    tags: params.tags,
    skill: params.skillUsed,
    template_used: params.templateUsed || '',
    created_at: now,
    message_time: params.messageTime || now,
    status: 'sent',
  }
}

/**
 * Save a new thread file to the contact's threads/ directory
 */
export function saveThread(
  params: SaveThreadParams,
  vaultPath: string
): { success: boolean; fileName?: string } {
  if (!params.contactSlugs || params.contactSlugs.length === 0) {
    console.error('[saveThread] No contact slugs provided — cannot save thread without a contact')
    return { success: false }
  }

  const now = params.messageTime ? new Date(params.messageTime) : new Date()

  // Generate filename (prefer subject if provided)
  const fileName = buildThreadFilename(now, params.channel, params.coreContent, params.subject)

  // Build content
  const content = buildThreadContent(params)

  // Save to each contact's threads/
  for (let i = 0; i < params.contactSlugs.length; i++) {
    const slug = params.contactSlugs[i]
    const name = params.contactNames[i] || slug

    if (params.appendToThread) {
      // Append to existing thread
      const threadPath = path.join(
        getSubPath(vaultPath, 'contacts'), slug, 'threads', params.appendToThread
      )
      if (fs.existsSync(threadPath)) {
        const separator = `\n\n---\n\n## ${formatCompactTimestamp(now)} — Appended\n\n`
        fs.appendFileSync(threadPath, separator + content, 'utf-8')
      }
    } else {
      // Create new thread file
      const frontmatter = buildThreadFrontmatter(params, slug, name)
      const threadPath = path.join(
        getSubPath(vaultPath, 'contacts'), slug, 'threads', fileName
      )
      writeMarkdownFile(threadPath, frontmatter, content)
    }

    // Update contact's last_contact
    updateContactLastContact(slug, vaultPath)

    // Regenerate _all.md
    regenerateAllMd(slug, vaultPath)
  }

  return { success: true, fileName }
}

/**
 * Update a contact's last_contact field in their profile.md
 */
function updateContactLastContact(slug: string, vaultPath: string): void {
  const profilePath = path.join(getSubPath(vaultPath, 'contacts'), slug, 'profile.md')
  if (!fs.existsSync(profilePath)) return

  try {
    updateFrontmatter(profilePath, {
      last_contact: new Date().toISOString(),
    })
  } catch (err) {
    console.error(`Failed to update last_contact for ${slug}:`, err)
  }
}

/**
 * Regenerate _all.md for a contact per spec §3.6
 * Reads all threads, sorts by created_at desc, builds summary
 */
export function regenerateAllMd(slug: string, vaultPath: string): void {
  const threadsDir = path.join(getSubPath(vaultPath, 'contacts'), slug, 'threads')
  const files = listMarkdownFiles(threadsDir)

  // Parse each thread's frontmatter
  const entries: Array<{
    created_at: string
    channel: string
    subject: string
    direction: string
    tags: string[]
    fileName: string
    summary: string
  }> = []

  for (const filePath of files) {
    try {
      const { data, content } = readMarkdownFile(filePath)

      // Extract summary from Core Input section (first ~100 chars)
      const coreMatch = content.match(/## Core Input[\s\S]*?\n\n([\s\S]*?)(?=\n## |$)/)
      let summary = coreMatch?.[1]?.trim() || ''
      // Remove the italicized instruction line if present
      summary = summary.replace(/^_\(.*?\)_\s*/m, '').trim()
      if (summary.length > 100) {
        summary = summary.substring(0, 100) + '...'
      }

      entries.push({
        created_at: data.created_at || '',
        channel: data.channel || 'email',
        subject: data.subject || path.basename(filePath, '.md'),
        direction: data.direction || 'outgoing',
        tags: data.tags || [],
        fileName: path.basename(filePath),
        summary,
      })
    } catch (err) {
      console.error(`Failed to parse thread ${filePath}:`, err)
    }
  }

  // Sort by created_at descending
  entries.sort((a, b) => (b.created_at > a.created_at ? 1 : -1))

  // Get contact name from profile
  let contactName = slug
  const profilePath = path.join(getSubPath(vaultPath, 'contacts'), slug, 'profile.md')
  if (fs.existsSync(profilePath)) {
    try {
      const { data } = readMarkdownFile(profilePath)
      contactName = data.name || slug
    } catch {
      // Use slug
    }
  }

  // Build _all.md content per spec §3.6
  const now = new Date()
  const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const frontmatter = {
    auto_generated: true,
    contact: slug,
    last_updated: now.toISOString(),
  }

  const lines: string[] = []
  lines.push(`# ${contactName} — Communication Log`)
  lines.push('')
  lines.push(`> Auto-generated. Do not edit manually. Updated: ${nowStr}`)
  lines.push('')

  for (const entry of entries) {
    const date = entry.created_at ? new Date(entry.created_at) : new Date()
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    const channelLabel = entry.channel.charAt(0).toUpperCase() + entry.channel.slice(1)
    const directionLabel =
      entry.direction === 'incoming-reply' ? 'Received → Replied' :
      entry.direction === 'outgoing' ? 'Sent' :
      entry.direction === 'incoming-only' ? 'Received' : entry.direction

    lines.push('---')
    lines.push('')
    lines.push(`## ${dateStr} [${channelLabel}] ${entry.subject}`)
    lines.push(`**Direction**: ${directionLabel} | **Tags**: ${entry.tags.join(', ') || 'none'}`)
    lines.push(`**Summary**: ${entry.summary || '(no summary)'}`)
    lines.push(`[→ Full record](threads/${entry.fileName})`)
    lines.push('')
  }

  const allMdPath = path.join(getSubPath(vaultPath, 'contacts'), slug, '_all.md')
  writeMarkdownFile(allMdPath, frontmatter, lines.join('\n'))
}
