import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { getVaultPath } from '../services/app-state'
import { getSubPath } from '../services/vault'
import { readMarkdownFile, writeMarkdownFile, extractSection } from '../services/markdown'

interface Contact {
  name: string
  email: string
  slug: string
  role: string
  relationship: string
  language: string
  channels: string[]
  tags: string[]
  created_at: string
  last_contact: string
  notes?: string
  autoSummary?: string
}

/**
 * Generate a URL-safe slug from a name
 * e.g. "Dr. Jane Smith" → "jane-smith"
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(dr\.?|prof\.?|mr\.?|ms\.?|mrs\.?)\s+/i, '') // Remove titles
    .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric
    .trim()
    .replace(/\s+/g, '-') // Spaces to hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
}

/**
 * Parse a profile.md into a Contact object
 */
function parseProfile(profilePath: string): Contact {
  const { data, content } = readMarkdownFile(profilePath)
  const notes = extractSection(content, 'Communication Notes')
  const autoSummary = extractSection(content, 'Auto-Summary')

  return {
    name: data.name || '',
    email: data.email || '',
    slug: data.slug || '',
    role: data.role || '',
    relationship: data.relationship || 'colleague-formal',
    language: data.language || 'english',
    channels: data.channels || ['email'],
    tags: data.tags || [],
    created_at: data.created_at || '',
    last_contact: data.last_contact || '',
    notes: notes || undefined,
    autoSummary: autoSummary || undefined,
  }
}

/**
 * Build profile.md content from a Contact object
 */
function buildProfileContent(contact: Contact): string {
  const lines: string[] = []
  lines.push(`# ${contact.name}`)
  lines.push('')
  lines.push('## Communication Notes')
  if (contact.notes) {
    lines.push(contact.notes)
  } else {
    lines.push('_(Add communication preferences and notes here)_')
  }
  lines.push('')
  lines.push('## Auto-Summary')
  if (contact.autoSummary) {
    lines.push(contact.autoSummary)
  } else {
    lines.push('_(System updates this section after each interaction)_')
  }
  return lines.join('\n')
}

/**
 * Build profile.md frontmatter from a Contact object
 */
function buildFrontmatter(contact: Contact): Record<string, any> {
  return {
    name: contact.name,
    email: contact.email,
    slug: contact.slug,
    role: contact.role,
    relationship: contact.relationship,
    language: contact.language,
    channels: contact.channels,
    tags: contact.tags,
    created_at: contact.created_at,
    last_contact: contact.last_contact,
  }
}

export function registerContactsHandlers() {
  /**
   * List all contacts by scanning contacts/ directory
   */
  ipcMain.handle('contacts:list', async () => {
    const vaultPath = getVaultPath()
    if (!vaultPath) return []

    const contactsDir = getSubPath(vaultPath, 'contacts')
    if (!fs.existsSync(contactsDir)) return []

    const dirs = fs.readdirSync(contactsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)

    const contacts: Contact[] = []
    for (const slug of dirs) {
      const profilePath = path.join(contactsDir, slug, 'profile.md')
      if (fs.existsSync(profilePath)) {
        try {
          contacts.push(parseProfile(profilePath))
        } catch (err) {
          console.error(`Failed to parse profile for ${slug}:`, err)
        }
      }
    }

    // Sort by last_contact descending (most recent first)
    contacts.sort((a, b) => (b.last_contact > a.last_contact ? 1 : -1))
    return contacts
  })

  /**
   * Get a single contact by slug
   */
  ipcMain.handle('contacts:get', async (_event, slug: string) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) return null

    const profilePath = path.join(getSubPath(vaultPath, 'contacts'), slug, 'profile.md')
    if (!fs.existsSync(profilePath)) return null

    return parseProfile(profilePath)
  })

  /**
   * Create a new contact: mkdir + profile.md + threads/
   */
  ipcMain.handle('contacts:create', async (_event, data: Partial<Contact>) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) throw new Error('No vault path configured')

    const name = data.name || 'New Contact'
    const slug = data.slug || generateSlug(name)
    const now = new Date().toISOString()

    const contact: Contact = {
      name,
      email: data.email || '',
      slug,
      role: data.role || '',
      relationship: data.relationship || 'colleague-formal',
      language: data.language || 'english',
      channels: data.channels || ['email'],
      tags: data.tags || [],
      created_at: now,
      last_contact: now,
      notes: data.notes,
      autoSummary: undefined,
    }

    // Create directory structure
    const contactDir = path.join(getSubPath(vaultPath, 'contacts'), slug)
    const threadsDir = path.join(contactDir, 'threads')
    fs.mkdirSync(threadsDir, { recursive: true })

    // Write profile.md
    const profilePath = path.join(contactDir, 'profile.md')
    const frontmatter = buildFrontmatter(contact)
    const content = buildProfileContent(contact)
    writeMarkdownFile(profilePath, frontmatter, content)

    return contact
  })

  /**
   * Update an existing contact's profile
   */
  ipcMain.handle('contacts:update', async (_event, slug: string, data: Partial<Contact>) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) throw new Error('No vault path configured')

    const profilePath = path.join(getSubPath(vaultPath, 'contacts'), slug, 'profile.md')
    if (!fs.existsSync(profilePath)) {
      throw new Error(`Contact not found: ${slug}`)
    }

    const existing = parseProfile(profilePath)
    const updated: Contact = {
      ...existing,
      ...data,
      slug, // Slug cannot change
    }

    const frontmatter = buildFrontmatter(updated)
    const content = buildProfileContent(updated)
    writeMarkdownFile(profilePath, frontmatter, content)
  })

  /**
   * Delete a contact (removes entire directory)
   */
  ipcMain.handle('contacts:delete', async (_event, slug: string) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) throw new Error('No vault path configured')

    const contactDir = path.join(getSubPath(vaultPath, 'contacts'), slug)
    if (!fs.existsSync(contactDir)) {
      throw new Error(`Contact not found: ${slug}`)
    }

    fs.rmSync(contactDir, { recursive: true, force: true })
  })

  /**
   * Search contacts by name, email, or slug
   */
  ipcMain.handle('contacts:search', async (_event, query: string) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) return []

    const contactsDir = getSubPath(vaultPath, 'contacts')
    if (!fs.existsSync(contactsDir)) return []

    const q = query.toLowerCase()
    const dirs = fs.readdirSync(contactsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)

    const matches: Contact[] = []
    for (const slug of dirs) {
      const profilePath = path.join(contactsDir, slug, 'profile.md')
      if (!fs.existsSync(profilePath)) continue

      try {
        const contact = parseProfile(profilePath)
        if (
          contact.name.toLowerCase().includes(q) ||
          contact.email.toLowerCase().includes(q) ||
          contact.slug.toLowerCase().includes(q)
        ) {
          matches.push(contact)
        }
      } catch {
        // Skip unparseable profiles
      }
    }

    return matches
  })
}
