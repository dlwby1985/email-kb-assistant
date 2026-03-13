import fs from 'fs'
import path from 'path'
import { getSubPath } from './vault'
import { readMarkdownFile, listMarkdownFilesSorted } from './markdown'
import { readConfig } from './config'
import { loadActiveStyleContent } from './writing-style'

type Mode = 'generate' | 'polish'
type Channel = 'email' | 'conversation'
type SkillName =
  | 'email-reply'
  | 'email-compose'
  | 'conversation-reply'
  | 'polish'
  | 'admin-task'
  | 'course-planning'
  | 'student-communication'

interface GenerateRequest {
  mode: Mode
  contacts: Array<{ slug: string; name: string }>
  channel: Channel
  background: string
  content: string
  message_time: string | null
  template: string | null
  history_refs: string[]
  attachment_text: string | null
  email_attachment_filenames: string[]
  project: string | null
  skill_override: string | null
  style_override: string | null
  signature_id: string | null
  kb_context: string | null
  include_past_threads: boolean
  revision: {
    previous_output: string
    instruction: string
  } | null
}

interface AssembledPrompt {
  systemPrompt: string
  userMessage: string
  skill: SkillName
}

/**
 * Determine which skill file to use based on mode + channel + input context
 */
export function determineSkill(
  mode: Mode,
  channel: Channel,
  hasBackground: boolean = false
): SkillName {
  if (mode === 'polish') {
    return 'polish'
  }

  if (channel === 'email') {
    // If there's background context (incoming email), it's a reply; otherwise compose
    return hasBackground ? 'email-reply' : 'email-compose'
  }

  // WeChat, Slack, Zoom
  return 'conversation-reply'
}

/**
 * Read a skill file from the vault
 */
function readSkillFile(vaultPath: string, skillName: string): string {
  const filePath = getSubPath(vaultPath, 'skills', `${skillName}.md`)
  if (!fs.existsSync(filePath)) {
    console.warn(`Skill file not found: ${filePath}`)
    return ''
  }
  return fs.readFileSync(filePath, 'utf-8')
}

/**
 * Read the base skill file (_base.md)
 */
function readBaseSkill(vaultPath: string): string {
  return readSkillFile(vaultPath, '_base')
}

/**
 * Load a contact's profile content for inclusion in the system prompt
 */
function loadContactProfile(vaultPath: string, slug: string): string {
  const profilePath = path.join(getSubPath(vaultPath, 'contacts'), slug, 'profile.md')
  if (!fs.existsSync(profilePath)) return ''
  return fs.readFileSync(profilePath, 'utf-8')
}

// Per-thread body word limit and total budget across all threads
const WORDS_PER_THREAD   = 500
const TOTAL_THREAD_WORDS = 3000

/**
 * Truncate text to at most `maxWords` words, appending a note if truncated.
 */
function truncateBody(text: string, maxWords: number): string {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length <= maxWords) return text
  return words.slice(0, maxWords).join(' ') + '\n\n[... truncated ...]'
}

/**
 * Load recent threads for a contact (most recent N, by created_at descending).
 * Each thread body is capped at WORDS_PER_THREAD words; total across all threads
 * is capped at TOTAL_THREAD_WORDS — older threads are dropped once the budget
 * is exhausted.
 */
function loadRecentThreads(
  vaultPath: string,
  slug: string,
  limit: number
): string[] {
  const threadsDir = path.join(getSubPath(vaultPath, 'contacts'), slug, 'threads')
  const files = listMarkdownFilesSorted(threadsDir, 'created_at')

  const threads: string[] = []
  let totalWords = 0

  for (const f of files.slice(0, limit)) {
    if (totalWords >= TOTAL_THREAD_WORDS) break
    try {
      const raw = fs.readFileSync(f, 'utf-8')

      // Preserve YAML frontmatter, truncate only the body
      const fmMatch = raw.match(/^---\n[\s\S]*?\n---\n?/)
      const frontmatter = fmMatch ? fmMatch[0] : ''
      const body = fmMatch ? raw.slice(fmMatch[0].length) : raw

      const truncatedBody = truncateBody(body, WORDS_PER_THREAD)
      const entry = (frontmatter + truncatedBody).trim()

      totalWords += entry.split(/\s+/).filter(Boolean).length
      threads.push(entry)
    } catch {
      continue
    }
  }

  return threads
}

/**
 * Load a template file by name
 */
function loadTemplate(vaultPath: string, templateName: string): string {
  const templatePath = getSubPath(vaultPath, 'templates', `${templateName}.md`)
  if (!fs.existsSync(templatePath)) return ''
  return fs.readFileSync(templatePath, 'utf-8')
}

/**
 * Load a project context file
 */
function loadProjectContext(vaultPath: string, projectName: string): string {
  const contextPath = getSubPath(vaultPath, 'projects', projectName, 'context.md')
  if (!fs.existsSync(contextPath)) return ''
  return fs.readFileSync(contextPath, 'utf-8')
}

/**
 * Get the user's signature from config.
 * Uses the new signatures[] array if available; falls back to legacy user.signatures.
 * signatureId: specific signature to use (null = auto-select by language)
 */
function getSignature(vaultPath: string, signatureId?: string | null, language?: string): string {
  try {
    const config = readConfig(vaultPath)

    // New multi-signature array takes priority
    const sigs = config.signatures ?? []
    if (sigs.length > 0) {
      // Specific signature requested
      if (signatureId) {
        const sig = sigs.find((s) => s.id === signatureId)
        if (sig) return sig.content
      }
      // Auto-select by language
      const lang = language || config.defaults.language || 'english'
      const isChinese = lang === 'chinese' || lang === 'zh'
      const langSigs = sigs.filter((s) => isChinese ? s.language === 'chinese' : s.language !== 'chinese')
      const match = langSigs.find((s) => s.is_default) ?? langSigs[0] ?? sigs.find((s) => s.is_default) ?? sigs[0]
      return match?.content ?? ''
    }

    // Fallback: legacy user.signatures
    const lang = language || config.defaults.language || 'english'
    if (lang === 'chinese' || lang === 'zh') {
      return config.user.signatures.chinese
    }
    return config.user.signatures.english
  } catch {
    return ''
  }
}

/**
 * Main function: assemble the complete prompt from all context layers
 *
 * Spec §4.1 Prompt Assembly Logic:
 *   SINGLE-PERSON MODE (1 contact):  _base + skill + profile + threads + template + project
 *   MULTI-PERSON MODE (2+ contacts): _base + skill + template
 *   QUICK MODE (0 contacts):         _base + skill
 */
export function assemblePrompt(
  request: GenerateRequest,
  vaultPath: string
): AssembledPrompt {
  const contactMode =
    request.contacts.length === 0 ? 'quick' :
    request.contacts.length === 1 ? 'single' : 'multi'

  const skill = request.skill_override
    ? (request.skill_override as SkillName)
    : determineSkill(request.mode, request.channel, !!request.background)
  const config = readConfig(vaultPath)

  // Build system prompt by concatenating layers
  const sections: string[] = []

  // Layer 1: Base system prompt (always)
  const baseSkill = readBaseSkill(vaultPath)
  if (baseSkill) {
    sections.push('=== BASE SYSTEM PROMPT ===\n' + baseSkill)
  }

  // Layer 1b: My Profile (always — persistent user context)
  const profilePath = getSubPath(vaultPath, 'my-profile.md')
  if (fs.existsSync(profilePath)) {
    const { content: profileContent } = readMarkdownFile(profilePath)
    if (profileContent.trim()) {
      sections.push('=== USER PROFILE ===\n' + profileContent.trim())
    }
  }

  // Layer 2: Writing style — multi-style aware
  // Detect contact relationship for auto-matching
  let contactRelationship: string | undefined
  if (contactMode === 'single') {
    try {
      const profilePath = path.join(
        getSubPath(vaultPath, 'contacts'),
        request.contacts[0].slug,
        'profile.md'
      )
      const { data: profileData } = readMarkdownFile(profilePath)
      contactRelationship = profileData.relationship
    } catch { /* use undefined */ }
  }
  const activeStyle = loadActiveStyleContent(
    vaultPath,
    request.style_override,
    contactRelationship,
    request.channel
  )
  if (activeStyle) {
    sections.push('=== PERSONAL WRITING STYLE ===\n' + activeStyle)
  }

  // Layer 3: Active skill (always)
  const skillContent = readSkillFile(vaultPath, skill)
  if (skillContent) {
    sections.push(`=== ACTIVE SKILL: ${skill} ===\n` + skillContent)
  }

  // Layer 4: Contact profile + history (single-person mode only)
  if (contactMode === 'single') {
    const slug = request.contacts[0].slug
    const profile = loadContactProfile(vaultPath, slug)
    if (profile) {
      sections.push('=== CONTACT PROFILE ===\n' + profile)
    }

    const maxThreads = config.max_context_threads || 5
    const includePast = request.include_past_threads !== false
    const threads = includePast ? loadRecentThreads(vaultPath, slug, maxThreads) : []
    if (threads.length > 0) {
      const threadSections = threads.map((t, i) =>
        `--- Thread ${i + 1} ---\n${t}`
      ).join('\n\n')
      sections.push('=== RECENT COMMUNICATION HISTORY ===\n' + threadSections)
    }
  }

  // Layer 5: Template (if selected)
  if (request.template) {
    const templateContent = loadTemplate(vaultPath, request.template)
    if (templateContent) {
      // Check if template has strict: true in frontmatter
      const strictMatch = templateContent.match(/^---\s*\n[\s\S]*?strict:\s*true[\s\S]*?\n---/m)
      if (strictMatch) {
        sections.push(
          '=== TEMPLATE REFERENCE (STRICT MODE) ===\n' +
          'STRICT TEMPLATE MODE: The user has selected a strict template. ' +
          'You MUST follow the template structure and wording EXACTLY. ' +
          'Do NOT rephrase, reorganize, or creatively adapt the template. ' +
          'Only replace placeholder fields like [Student Name], [Amount], ' +
          '[Date], [Course Number] etc. with the actual values provided ' +
          'in the user\'s core content or background information. ' +
          'Everything else must remain verbatim from the template.\n\n' +
          templateContent
        )
      } else {
        sections.push('=== TEMPLATE REFERENCE ===\n' + templateContent)
      }
    }
  }

  // Layer 6: History refs (specific thread files referenced)
  // refs may be absolute paths (from search results) or vault-relative paths
  if (request.history_refs && request.history_refs.length > 0) {
    const historyContents = request.history_refs.map((ref) => {
      const refPath = path.isAbsolute(ref) ? ref : getSubPath(vaultPath, ref)
      if (fs.existsSync(refPath)) {
        return fs.readFileSync(refPath, 'utf-8')
      }
      return ''
    }).filter(Boolean)

    if (historyContents.length > 0) {
      sections.push('=== REFERENCED HISTORY ===\n' + historyContents.join('\n\n---\n\n'))
    }
  }

  // Layer 7: Project context (if selected)
  if (request.project) {
    const projectContent = loadProjectContext(vaultPath, request.project)
    if (projectContent) {
      sections.push('=== PROJECT CONTEXT ===\n' + projectContent)
    }
  }

  // Layer 8: Signature (for email mode)
  if (request.channel === 'email') {
    // Detect language from contact profile if in single mode
    let lang = config.defaults.language
    if (contactMode === 'single') {
      try {
        const profilePath = path.join(
          getSubPath(vaultPath, 'contacts'),
          request.contacts[0].slug,
          'profile.md'
        )
        const { data } = readMarkdownFile(profilePath)
        lang = data.language || lang
      } catch {
        // Use default
      }
    }
    const signature = getSignature(vaultPath, request.signature_id, lang)
    if (signature) {
      sections.push(`=== SIGNATURE ===\nUse this signature at the end of emails:\n\n${signature}`)
    }
  }

  const systemPrompt = sections.join('\n\n')

  // Build user message
  const userMessage = assembleUserMessage(request)

  return { systemPrompt, userMessage, skill }
}

/**
 * Build the user message from the request inputs
 */
function assembleUserMessage(request: GenerateRequest): string {
  // If this is a revision, return the revision-specific message
  if (request.revision) {
    return [
      '## Previous Output',
      request.revision.previous_output,
      '',
      '## Revision Instruction',
      request.revision.instruction,
    ].join('\n')
  }

  // Standard message: channel + background + core content + attachment
  const parts: string[] = []

  parts.push(`## Channel\n${request.channel}`)

  if (request.background) {
    parts.push(`## Background\n${request.background}`)
  }

  parts.push(`## Core Content\n${request.content}`)

  if (request.attachment_text) {
    parts.push(`## Reference Document Content\n${request.attachment_text}`)
  }

  if (request.email_attachment_filenames && request.email_attachment_filenames.length > 0) {
    const fileList = request.email_attachment_filenames.join(', ')
    parts.push(`## Email Attachments\nNote: The user is attaching the following files to this email: ${fileList}. If relevant, mention these attachments naturally in the email body (e.g., "Please find attached...").`)
  }

  if (request.kb_context) {
    parts.push(`## Reference Documents from Knowledge Base\n\nThe following excerpts are from the user's institutional knowledge base and may be relevant:\n\n${request.kb_context}`)
  }

  return parts.join('\n\n')
}
