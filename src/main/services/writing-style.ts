import fs from 'fs'
import path from 'path'
import { getSubPath } from './vault'
import { readConfig } from './config'
import { getActiveProvider } from './llm/manager'
import { readMarkdownFile, writeMarkdownFile, updateFrontmatter } from './markdown'

// ── Directory constants ────────────────────────────────────────────────────────

const STYLES_DIR = 'styles'
const STYLE_EXAMPLES_DIR = 'style-examples'
const LEGACY_STYLE_FILE = 'personal-style.md'   // Phase-3 path (before migration)
const LEGACY_EXAMPLES_DIR = 'style-examples'     // Phase-3 flat dir (root level)

// ── Path helpers ───────────────────────────────────────────────────────────────

function getStylesDir(vaultPath: string): string {
  return getSubPath(vaultPath, 'skills', STYLES_DIR)
}

function getStyleFilePath(vaultPath: string, slug: string): string {
  return path.join(getStylesDir(vaultPath), `${slug}.md`)
}

function getStyleExamplesDir(vaultPath: string, slug: string): string {
  return getSubPath(vaultPath, 'skills', STYLE_EXAMPLES_DIR, slug)
}

// ── Public types ───────────────────────────────────────────────────────────────

export interface StyleInfo {
  slug: string
  name: string
  description: string
  language: string
  formality: string
  isDefault: boolean
  exampleCount: number
  autoApplyFor?: {
    relationship?: string[]
    channel?: string[]
  }
}

export interface StyleProfile {
  rules: string
  analyzedPatterns: string
  exampleCount: number
}

export interface StyleExample {
  fileName: string
  context: string
  channel: string
  language: string
  contentPreview: string
  createdAt: string
}

export interface StyleExampleInput {
  context: string
  channel: string
  language: string
  content: string
}

// ── Default style template ─────────────────────────────────────────────────────

const DEFAULT_STYLE_BODY = `# Default Writing Style

## Style Rules
_(Write your explicit style preferences here. These are sent to the AI with every generation.)_

## Analyzed Style Patterns
_(Auto-generated from your example emails. Do not edit manually.)_

(No examples analyzed yet. Add sample emails in the Writing Style settings to generate this section.)
`

function makeDefaultStyleFrontmatter(now: string) {
  return {
    style_name: 'Default',
    description: 'General writing style for all communications',
    language: 'auto',
    formality: 'auto',
    is_default: true,
    auto_apply_for: { relationship: [], channel: [] },
    created_at: now,
    last_updated: now,
    example_count: 0,
  }
}

// ── Slug utilities ─────────────────────────────────────────────────────────────

export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50)
    || 'style'
}

/** Ensure a slug is unique within the styles directory */
function uniqueSlug(vaultPath: string, base: string): string {
  const dir = getStylesDir(vaultPath)
  let slug = base
  let n = 2
  while (fs.existsSync(path.join(dir, `${slug}.md`))) {
    slug = `${base}-${n++}`
  }
  return slug
}

// ── Section parsing ────────────────────────────────────────────────────────────

function parseSection(content: string, heading: string): string {
  const regex = new RegExp(`## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`)
  const match = content.match(regex)
  return (match?.[1] ?? '').trim()
}

// ── Migration ──────────────────────────────────────────────────────────────────

/**
 * One-time migration from Phase 3 single-style to Phase 4 multi-style.
 * Safe to call on every startup — checks if migration has already been done.
 */
export function migratePersonalStyle(vaultPath: string): void {
  const stylesDir = getStylesDir(vaultPath)
  const defaultStylePath = getStyleFilePath(vaultPath, 'default')

  // If styles/default.md already exists, migration is done
  if (fs.existsSync(defaultStylePath)) return

  const now = new Date().toISOString()

  // Try to migrate from personal-style.md
  const legacyPath = getSubPath(vaultPath, 'skills', LEGACY_STYLE_FILE)
  let rulesText = ''
  let patternsText = ''

  if (fs.existsSync(legacyPath)) {
    try {
      const raw = fs.readFileSync(legacyPath, 'utf-8')
      rulesText = parseSection(raw, 'Style Rules')
      patternsText = parseSection(raw, 'Analyzed Style Patterns')
    } catch {
      // Ignore parse errors — use defaults
    }
  }

  // Create styles/ directory
  if (!fs.existsSync(stylesDir)) fs.mkdirSync(stylesDir, { recursive: true })

  // Build default.md body
  const body = `# Default Writing Style

## Style Rules
${rulesText || '_(Write your explicit style preferences here. These are sent to the AI with every generation.)_'}

## Analyzed Style Patterns
${patternsText || '_(Auto-generated from your example emails. Do not edit manually.)_\n\n(No examples analyzed yet. Add sample emails in the Writing Style settings to generate this section.)'}
`

  writeMarkdownFile(defaultStylePath, makeDefaultStyleFrontmatter(now), body)

  // Migrate flat style-examples/ → style-examples/default/
  const legacyExamplesDir = getSubPath(vaultPath, 'skills', LEGACY_EXAMPLES_DIR)
  const newExamplesDir = getStyleExamplesDir(vaultPath, 'default')

  if (fs.existsSync(legacyExamplesDir) && !fs.existsSync(newExamplesDir)) {
    const files = fs.readdirSync(legacyExamplesDir).filter((f) => f.endsWith('.md'))
    if (files.length > 0) {
      fs.mkdirSync(newExamplesDir, { recursive: true })
      for (const file of files) {
        const src = path.join(legacyExamplesDir, file)
        const dst = path.join(newExamplesDir, file)
        if (!fs.existsSync(dst)) {
          fs.copyFileSync(src, dst)
        }
      }
    }
  }
}

/**
 * Ensure at least one style exists (creates default if none).
 */
function ensureDefaultStyle(vaultPath: string): void {
  const stylesDir = getStylesDir(vaultPath)
  const defaultPath = getStyleFilePath(vaultPath, 'default')

  if (!fs.existsSync(defaultPath)) {
    if (!fs.existsSync(stylesDir)) fs.mkdirSync(stylesDir, { recursive: true })
    const now = new Date().toISOString()
    writeMarkdownFile(defaultPath, makeDefaultStyleFrontmatter(now), DEFAULT_STYLE_BODY)
  }
}

// ── List & read ────────────────────────────────────────────────────────────────

/**
 * List all writing style profiles (name, slug, isDefault, etc.)
 */
export function listStyles(vaultPath: string): StyleInfo[] {
  ensureDefaultStyle(vaultPath)
  migratePersonalStyle(vaultPath)

  const stylesDir = getStylesDir(vaultPath)
  const files = fs.readdirSync(stylesDir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .sort()

  return files.map((file): StyleInfo => {
    const slug = file.replace('.md', '')
    const filePath = path.join(stylesDir, file)
    try {
      const { data } = readMarkdownFile(filePath)
      const examplesDir = getStyleExamplesDir(vaultPath, slug)
      const exampleCount = fs.existsSync(examplesDir)
        ? fs.readdirSync(examplesDir).filter((f) => f.endsWith('.md')).length
        : 0
      return {
        slug,
        name: String(data.style_name ?? slug),
        description: String(data.description ?? ''),
        language: String(data.language ?? 'auto'),
        formality: String(data.formality ?? 'auto'),
        isDefault: Boolean(data.is_default),
        exampleCount,
        autoApplyFor: data.auto_apply_for as StyleInfo['autoApplyFor'],
      }
    } catch {
      return {
        slug,
        name: slug,
        description: '',
        language: 'auto',
        formality: 'auto',
        isDefault: slug === 'default',
        exampleCount: 0,
      }
    }
  })
}

/**
 * Read a style's rules and analyzed patterns
 */
export function readStyleProfile(vaultPath: string, slug: string): StyleProfile {
  ensureDefaultStyle(vaultPath)
  const filePath = getStyleFilePath(vaultPath, slug)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Style "${slug}" not found`)
  }

  const { content } = readMarkdownFile(filePath)
  const rules = parseSection(content, 'Style Rules')
  const analyzedPatterns = parseSection(content, 'Analyzed Style Patterns')

  const examplesDir = getStyleExamplesDir(vaultPath, slug)
  const exampleCount = fs.existsSync(examplesDir)
    ? fs.readdirSync(examplesDir).filter((f) => f.endsWith('.md')).length
    : 0

  return { rules, analyzedPatterns, exampleCount }
}

/**
 * Load a style's full content for prompt assembly.
 * If styleOverride is null or 'auto', uses the default style or auto-matches.
 * Returns empty string if no content found.
 */
export function loadActiveStyleContent(
  vaultPath: string,
  styleOverride?: string | null,
  contactRelationship?: string,
  channel?: string
): string {
  try {
    ensureDefaultStyle(vaultPath)
    migratePersonalStyle(vaultPath)

    const styles = listStyles(vaultPath)
    if (styles.length === 0) return ''

    let targetSlug: string | null = null

    if (styleOverride && styleOverride !== 'auto') {
      // Explicit override
      targetSlug = styleOverride
    } else {
      // Auto-match based on contact relationship + channel
      if (contactRelationship || channel) {
        for (const style of styles) {
          const af = style.autoApplyFor
          if (!af) continue
          const relMatch = !af.relationship?.length || (contactRelationship && af.relationship.includes(contactRelationship))
          const chanMatch = !af.channel?.length || (channel && af.channel.includes(channel))
          if (relMatch && chanMatch && af.relationship?.length) {
            targetSlug = style.slug
            break
          }
        }
      }
      // Fall back to default style
      if (!targetSlug) {
        const defaultStyle = styles.find((s) => s.isDefault)
        targetSlug = defaultStyle?.slug ?? styles[0]?.slug ?? 'default'
      }
    }

    const filePath = getStyleFilePath(vaultPath, targetSlug)
    if (!fs.existsSync(filePath)) return ''
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return ''
  }
}

// ── Create & update ────────────────────────────────────────────────────────────

/**
 * Create a new writing style
 */
export function createStyle(
  vaultPath: string,
  name: string,
  description: string
): StyleInfo {
  const baseSlug = nameToSlug(name)
  const slug = uniqueSlug(vaultPath, baseSlug)
  const now = new Date().toISOString()

  const frontmatter = {
    style_name: name,
    description,
    language: 'auto',
    formality: 'auto',
    is_default: false,
    auto_apply_for: { relationship: [], channel: [] },
    created_at: now,
    last_updated: now,
    example_count: 0,
  }

  const body = `# ${name}

## Style Rules
_(Write your explicit style preferences here.)_

## Analyzed Style Patterns
_(Auto-generated from your example emails.)_

(No examples analyzed yet.)
`

  writeMarkdownFile(getStyleFilePath(vaultPath, slug), frontmatter, body)

  return {
    slug,
    name,
    description,
    language: 'auto',
    formality: 'auto',
    isDefault: false,
    exampleCount: 0,
    autoApplyFor: { relationship: [], channel: [] },
  }
}

/**
 * Save the Style Rules section for a specific style
 */
export function saveStyleRules(vaultPath: string, slug: string, rules: string): void {
  const filePath = getStyleFilePath(vaultPath, slug)
  if (!fs.existsSync(filePath)) throw new Error(`Style "${slug}" not found`)

  const { data, content } = readMarkdownFile(filePath)

  // Replace the ## Style Rules section content
  const updatedContent = content.replace(
    /(## Style Rules\n)([\s\S]*?)(?=\n## Analyzed Style Patterns|$)/,
    `$1${rules}\n\n`
  )

  writeMarkdownFile(filePath, {
    ...data,
    last_updated: new Date().toISOString(),
  }, updatedContent)
}

/**
 * Set a style as the default (clears is_default from all others)
 */
export function setDefaultStyle(vaultPath: string, slug: string): void {
  const stylesDir = getStylesDir(vaultPath)
  const files = fs.readdirSync(stylesDir).filter((f) => f.endsWith('.md'))

  for (const file of files) {
    const filePath = path.join(stylesDir, file)
    const fileSlug = file.replace('.md', '')
    try {
      updateFrontmatter(filePath, { is_default: fileSlug === slug })
    } catch {
      // Skip malformed files
    }
  }
}

/**
 * Update auto_apply_for conditions for a style
 */
export function saveStyleAutoApply(
  vaultPath: string,
  slug: string,
  autoApplyFor: { relationship?: string[]; channel?: string[] }
): void {
  const filePath = getStyleFilePath(vaultPath, slug)
  if (!fs.existsSync(filePath)) throw new Error(`Style "${slug}" not found`)
  updateFrontmatter(filePath, {
    auto_apply_for: autoApplyFor,
    last_updated: new Date().toISOString(),
  })
}

// ── Delete ─────────────────────────────────────────────────────────────────────

/**
 * Delete a style and its associated examples.
 * Throws if it's the last remaining style.
 */
export function deleteStyle(vaultPath: string, slug: string): void {
  const styles = listStyles(vaultPath)
  if (styles.length <= 1) {
    throw new Error('Cannot delete the only remaining style')
  }

  const filePath = getStyleFilePath(vaultPath, slug)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

  // Remove examples directory
  const examplesDir = getStyleExamplesDir(vaultPath, slug)
  if (fs.existsSync(examplesDir)) {
    fs.rmSync(examplesDir, { recursive: true, force: true })
  }

  // If this was the default, set the first remaining style as default
  const wasDefault = styles.find((s) => s.slug === slug)?.isDefault
  if (wasDefault) {
    const remaining = styles.filter((s) => s.slug !== slug)
    if (remaining.length > 0) {
      setDefaultStyle(vaultPath, remaining[0].slug)
    }
  }
}

// ── Examples (scoped by slug) ──────────────────────────────────────────────────

/**
 * List all style examples for a specific style, sorted newest-first
 */
export function listStyleExamples(vaultPath: string, slug: string): StyleExample[] {
  const dir = getStyleExamplesDir(vaultPath, slug)
  if (!fs.existsSync(dir)) return []

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort().reverse()

  return files.map((fileName): StyleExample => {
    const filePath = path.join(dir, fileName)
    try {
      const raw = fs.readFileSync(filePath, 'utf-8')
      const context = raw.match(/context: "(.*)"/)?.[1] ?? ''
      const channel = raw.match(/channel: "(.*)"/)?.[1] ?? ''
      const language = raw.match(/language: "(.*)"/)?.[1] ?? ''
      const createdAt = raw.match(/created_at: "(.*)"/)?.[1] ?? ''
      const body = raw.replace(/^---[\s\S]*?---\n/, '').trim()
      const contentPreview = body.substring(0, 120)
      return { fileName, context, channel, language, contentPreview, createdAt }
    } catch {
      return { fileName, context: '', channel: '', language: '', contentPreview: '', createdAt: '' }
    }
  })
}

/**
 * Add a new style example for a specific style
 */
export function addStyleExample(
  vaultPath: string,
  slug: string,
  example: StyleExampleInput
): string {
  const dir = getStyleExamplesDir(vaultPath, slug)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  const now = new Date()
  const timestamp = now.toISOString().replace(/[:.]/g, '-').substring(0, 19)
  const contextSlug = example.context
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40) || 'example'

  const fileName = `${timestamp}_${contextSlug}.md`
  const filePath = path.join(dir, fileName)

  const fileContent = [
    '---',
    `context: "${example.context.replace(/"/g, '\\"')}"`,
    `channel: "${example.channel}"`,
    `language: "${example.language}"`,
    `created_at: "${now.toISOString()}"`,
    '---',
    '',
    example.content,
    '',
  ].join('\n')

  fs.writeFileSync(filePath, fileContent, 'utf-8')

  // Update example_count in style frontmatter
  try {
    const examplesDir = getStyleExamplesDir(vaultPath, slug)
    const count = fs.readdirSync(examplesDir).filter((f) => f.endsWith('.md')).length
    updateFrontmatter(getStyleFilePath(vaultPath, slug), { example_count: count })
  } catch { /* non-critical */ }

  return fileName
}

/**
 * Delete a style example for a specific style
 */
export function deleteStyleExample(
  vaultPath: string,
  slug: string,
  fileName: string
): void {
  const dir = getStyleExamplesDir(vaultPath, slug)
  const filePath = path.join(dir, fileName)

  // Safety check: file must be inside the correct directory
  const resolved = path.resolve(filePath)
  const resolvedDir = path.resolve(dir)
  if (!resolved.startsWith(resolvedDir + path.sep) || !resolved.endsWith('.md')) {
    throw new Error('Invalid file path')
  }

  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

  // Update example_count
  try {
    const count = fs.existsSync(dir)
      ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')).length
      : 0
    updateFrontmatter(getStyleFilePath(vaultPath, slug), { example_count: count })
  } catch { /* non-critical */ }
}

// ── Style analysis ─────────────────────────────────────────────────────────────

/**
 * Analyze all style examples for a specific style using the active LLM provider.
 * Saves the analyzed patterns into the style file's ## Analyzed Style Patterns section.
 */
export async function analyzeWritingStyle(vaultPath: string, slug: string): Promise<string> {
  const dir = getStyleExamplesDir(vaultPath, slug)

  if (!fs.existsSync(dir)) {
    throw new Error('No style examples found. Add at least 3 sample emails first.')
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'))
  if (files.length < 3) {
    throw new Error(`At least 3 examples required for analysis. You have ${files.length}.`)
  }

  const examples = files.map((fileName, idx) => {
    const filePath = path.join(dir, fileName)
    const raw = fs.readFileSync(filePath, 'utf-8')
    const context = raw.match(/context: "(.*)"/)?.[1] ?? 'Email'
    const channel = raw.match(/channel: "(.*)"/)?.[1] ?? 'email'
    const body = raw.replace(/^---[\s\S]*?---\n/, '').trim()
    return `### Example ${idx + 1}: ${context}\nChannel: ${channel}\n\n${body}`
  })

  const systemPrompt = `You are a writing style analyst. Analyze the following writing samples written by the same person. Extract their writing style patterns. Be specific and concrete. Cover: sentence length tendencies, vocabulary level, paragraph structure, opening patterns, closing patterns, tone characteristics, use of hedging language, formality level, cultural communication style markers, and any distinctive habits. Write your analysis as concise bullet points. Group by category.`

  const userMessage = `Here are ${files.length} writing samples:\n\n${examples.join('\n\n---\n\n')}`

  const config = readConfig(vaultPath)
  const provider = getActiveProvider(config)
  const result = await provider.generate({ systemPrompt, userMessage })

  if (!result.success || !result.text) {
    throw new Error(result.error || 'Style analysis failed')
  }

  // Save analyzed patterns into the style file
  const filePath = getStyleFilePath(vaultPath, slug)
  const { data, content } = readMarkdownFile(filePath)

  const updatedContent = content.replace(
    /(## Analyzed Style Patterns\n)([\s\S]*?)$/,
    `$1${result.text}\n`
  )

  writeMarkdownFile(filePath, {
    ...data,
    last_updated: new Date().toISOString(),
  }, updatedContent)

  return result.text
}
