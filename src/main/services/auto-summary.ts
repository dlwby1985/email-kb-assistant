import fs from 'fs'
import path from 'path'
import { getSubPath } from './vault'
import { readMarkdownFile, writeMarkdownFile, listMarkdownFiles } from './markdown'
import { readConfig } from './config'
import { generate } from './anthropic'

/**
 * System prompt for auto-summary generation.
 * Instructs Claude to produce a concise, structured summary of communication history.
 */
const AUTO_SUMMARY_SYSTEM_PROMPT = `You are a communication analyst assistant. Your task is to update a contact's communication summary based on their interaction history.

Produce a concise summary (150-300 words) covering:
1. **Communication pattern**: How often do they communicate? What channels do they use?
2. **Key topics**: What are the main subjects discussed? Any recurring themes?
3. **Relationship context**: What's the nature of the professional relationship?
4. **Recent activity**: What was the most recent interaction about?
5. **Notable details**: Any preferences, timezone differences, or communication style notes.

Write in third person. Be factual and concise. Do not include any markdown headers — just flowing text with bold labels where appropriate.
If there is very little history, write a brief summary based on what's available.`

/**
 * Build a user message for auto-summary from the contact's profile and threads
 */
function buildAutoSummaryUserMessage(
  contactName: string,
  contactRole: string,
  contactRelationship: string,
  threads: Array<{
    date: string
    channel: string
    direction: string
    subject: string
    summary: string
  }>
): string {
  const lines: string[] = []
  lines.push(`Contact: ${contactName}`)
  if (contactRole) lines.push(`Role: ${contactRole}`)
  lines.push(`Relationship: ${contactRelationship}`)
  lines.push('')
  lines.push(`Total interactions: ${threads.length}`)
  lines.push('')
  lines.push('--- Recent Communication History ---')
  lines.push('')

  // Show up to 10 most recent threads
  for (const t of threads.slice(0, 10)) {
    lines.push(`[${t.date}] ${t.channel} | ${t.direction} | ${t.subject}`)
    if (t.summary) {
      lines.push(`  Summary: ${t.summary}`)
    }
    lines.push('')
  }

  lines.push('---')
  lines.push('')
  lines.push('Based on the above communication history, generate an updated auto-summary for this contact.')

  return lines.join('\n')
}

/**
 * Replace the Auto-Summary section in a profile.md's content body
 */
function replaceAutoSummarySection(content: string, newSummary: string): string {
  const lines = content.split('\n')
  const result: string[] = []
  let inAutoSummary = false
  let replaced = false

  for (const line of lines) {
    if (/^## Auto-Summary/i.test(line)) {
      inAutoSummary = true
      replaced = true
      result.push(line)
      result.push(newSummary)
      continue
    }

    if (inAutoSummary) {
      // Check if we hit the next section heading
      if (/^## /.test(line)) {
        inAutoSummary = false
        result.push(line)
      }
      // Skip old auto-summary content
      continue
    }

    result.push(line)
  }

  // If no Auto-Summary section existed, append one
  if (!replaced) {
    result.push('')
    result.push('## Auto-Summary')
    result.push(newSummary)
  }

  return result.join('\n')
}

/**
 * Update the Auto-Summary section in a contact's profile.md
 * by reading their thread history and calling Claude API.
 *
 * This runs as a background task — errors are logged but don't block the save.
 */
export async function updateAutoSummary(
  contactSlug: string,
  vaultPath: string
): Promise<void> {
  try {
    // Read config for API key and model
    const config = readConfig(vaultPath)
    if (!config.anthropic_api_key) {
      return
    }

    // Read contact profile
    const profilePath = path.join(getSubPath(vaultPath, 'contacts'), contactSlug, 'profile.md')
    if (!fs.existsSync(profilePath)) {
      return
    }
    const { data: profileData, content: profileContent } = readMarkdownFile(profilePath)

    // Read thread history
    const threadsDir = path.join(getSubPath(vaultPath, 'contacts'), contactSlug, 'threads')
    const threadFiles = listMarkdownFiles(threadsDir)

    if (threadFiles.length === 0) {
      return
    }

    // Parse thread metadata
    const threads: Array<{
      date: string
      channel: string
      direction: string
      subject: string
      summary: string
    }> = []

    for (const filePath of threadFiles) {
      try {
        const { data, content } = readMarkdownFile(filePath)

        // Extract summary from Core Input section
        const coreMatch = content.match(/## Core Input[\s\S]*?\n\n([\s\S]*?)(?=\n## |$)/)
        let summary = coreMatch?.[1]?.trim() || ''
        summary = summary.replace(/^_\(.*?\)_\s*/m, '').trim()
        if (summary.length > 150) {
          summary = summary.substring(0, 150) + '...'
        }

        const createdAt = data.created_at || data.message_time || ''
        const date = createdAt ? new Date(createdAt).toISOString().split('T')[0] : 'unknown'

        threads.push({
          date,
          channel: data.channel || 'email',
          direction: data.direction || 'outgoing',
          subject: data.subject || path.basename(filePath, '.md'),
          summary,
        })
      } catch (err) {
        console.error('[autoSummary] Failed to parse thread:', filePath, err)
      }
    }

    // Sort by date descending
    threads.sort((a, b) => b.date.localeCompare(a.date))

    // Build user message
    const userMessage = buildAutoSummaryUserMessage(
      profileData.name || contactSlug,
      profileData.role || '',
      profileData.relationship || 'colleague',
      threads
    )

    // Call Claude API (use a cheaper/faster model if possible, but fall back to configured model)
    const result = await generate({
      systemPrompt: AUTO_SUMMARY_SYSTEM_PROMPT,
      userMessage,
      model: config.model,
      apiKey: config.anthropic_api_key,
    })

    if (!result.success || !result.text) {
      console.error('[autoSummary] API call failed:', result.error)
      return
    }

    // Replace the Auto-Summary section in profile content
    const updatedContent = replaceAutoSummarySection(profileContent, result.text)

    // Write back
    writeMarkdownFile(profilePath, profileData, updatedContent)
  } catch (err) {
    console.error('[autoSummary] Error:', err)
  }
}
