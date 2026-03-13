import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { getVaultPath } from '../services/app-state'
import { getSubPath } from '../services/vault'
import { DEFAULT_SKILLS } from '../defaults/skills'

const SKILL_DISPLAY_NAMES: Record<string, string> = {
  '_base': 'Base System Prompt',
  'email-reply': 'Email Reply',
  'email-compose': 'Email Compose',
  'conversation-reply': 'Conversation Reply',
  'polish': 'Polish',
  'admin-task': 'Admin Task',
  'course-planning': 'Course Planning',
  'student-communication': 'Student Communication',
}

function skillDisplayName(slug: string): string {
  return SKILL_DISPLAY_NAMES[slug] ?? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function registerSkillsHandlers() {
  /**
   * List all skill files in the vault's skills directory
   */
  ipcMain.handle('skills:list', async () => {
    const vaultPath = getVaultPath()
    if (!vaultPath) return []

    const skillsDir = getSubPath(vaultPath, 'skills')
    if (!fs.existsSync(skillsDir)) return []

    try {
      // Show _base.md first, then alphabetical
      const files = fs.readdirSync(skillsDir)
        .filter((f) => f.endsWith('.md'))
        .sort((a, b) => {
          if (a === '_base.md') return -1
          if (b === '_base.md') return 1
          return a.localeCompare(b)
        })

      return files.map((fileName) => {
        const slug = fileName.replace('.md', '')
        const filePath = path.join(skillsDir, fileName)
        let preview = ''
        try {
          const content = fs.readFileSync(filePath, 'utf-8')
          const lines = content.split('\n').filter((l) => l.trim() && !l.startsWith('#'))
          preview = (lines[0] || '').substring(0, 100)
        } catch {}
        const isDefault = fileName in DEFAULT_SKILLS
        return {
          slug,
          name: skillDisplayName(slug),
          preview,
          isDefault,
          isBase: slug === '_base',
        }
      })
    } catch (err: any) {
      console.error('[skills:list] Error:', err.message)
      return []
    }
  })

  /**
   * Get a single skill's full content
   */
  ipcMain.handle('skills:get', async (_event, slug: string) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) return null

    const filePath = getSubPath(vaultPath, 'skills', `${slug}.md`)
    if (!fs.existsSync(filePath)) return null

    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      return {
        slug,
        name: skillDisplayName(slug),
        content,
        isDefault: `${slug}.md` in DEFAULT_SKILLS,
        isBase: slug === '_base',
        defaultContent: DEFAULT_SKILLS[`${slug}.md`] ?? null,
      }
    } catch (err: any) {
      console.error('[skills:get] Error:', err.message)
      return null
    }
  })

  /**
   * Save (overwrite) a skill file
   */
  ipcMain.handle('skills:save', async (_event, slug: string, content: string) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) throw new Error('No vault configured')

    const skillsDir = getSubPath(vaultPath, 'skills')
    if (!fs.existsSync(skillsDir)) {
      fs.mkdirSync(skillsDir, { recursive: true })
    }

    const filePath = path.join(skillsDir, `${slug}.md`)
    fs.writeFileSync(filePath, content, 'utf-8')
    return { success: true, slug }
  })

  /**
   * Reset a skill to its default content
   */
  ipcMain.handle('skills:reset', async (_event, slug: string) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) throw new Error('No vault configured')

    const defaultContent = DEFAULT_SKILLS[`${slug}.md`]
    if (defaultContent === undefined) throw new Error(`No default content for skill: ${slug}`)

    const filePath = getSubPath(vaultPath, 'skills', `${slug}.md`)
    fs.writeFileSync(filePath, defaultContent, 'utf-8')
    return { success: true, slug, content: defaultContent }
  })

  /**
   * Delete a user-created skill file.
   * Protected skills (_base, reviewer, polish) cannot be deleted.
   */
  ipcMain.handle('skills:delete', async (_event, slug: string) => {
    const PROTECTED = new Set(['_base', 'reviewer', 'polish'])
    if (PROTECTED.has(slug)) {
      throw new Error(`Cannot delete protected skill: ${slug}`)
    }

    const vaultPath = getVaultPath()
    if (!vaultPath) throw new Error('No vault configured')

    const filePath = getSubPath(vaultPath, 'skills', `${slug}.md`)
    if (!fs.existsSync(filePath)) throw new Error(`Skill not found: ${slug}`)

    fs.unlinkSync(filePath)
    return { success: true }
  })

  /**
   * Rename a skill: moves the file and updates the "# Skill:" header.
   * Protected skills cannot be renamed.
   */
  ipcMain.handle('skills:rename', async (_event, oldSlug: string, newName: string) => {
    const PROTECTED = new Set(['_base', 'reviewer', 'polish'])
    if (PROTECTED.has(oldSlug)) {
      throw new Error(`Cannot rename protected skill: ${oldSlug}`)
    }

    const vaultPath = getVaultPath()
    if (!vaultPath) throw new Error('No vault configured')

    const newSlug = newName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50) || 'renamed-skill'

    const skillsDir = getSubPath(vaultPath, 'skills')
    const oldPath = path.join(skillsDir, `${oldSlug}.md`)
    const newPath = path.join(skillsDir, `${newSlug}.md`)

    if (!fs.existsSync(oldPath)) throw new Error(`Skill not found: ${oldSlug}`)
    if (fs.existsSync(newPath) && newSlug !== oldSlug) {
      throw new Error(`A skill named "${newSlug}" already exists`)
    }

    let content = fs.readFileSync(oldPath, 'utf-8')
    // Update the # Skill: header line
    content = content.replace(/^# Skill:.*$/m, `# Skill: ${newName}`)

    fs.writeFileSync(newPath, content, 'utf-8')
    if (newSlug !== oldSlug) fs.unlinkSync(oldPath)

    return { success: true, newSlug }
  })
}
