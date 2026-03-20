import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { getVaultPath } from '../services/app-state'
import { getSubPath } from '../services/vault'

function slugToName(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function registerTemplatesHandlers() {
  /**
   * List all template files in the vault's templates directory
   */
  ipcMain.handle('templates:list', async () => {
    const vaultPath = getVaultPath()
    if (!vaultPath) return []

    const templatesDir = getSubPath(vaultPath, 'templates')
    if (!fs.existsSync(templatesDir)) return []

    try {
      const files = fs.readdirSync(templatesDir)
        .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
        .sort()

      return files.map((fileName) => {
        const slug = fileName.replace('.md', '')
        const filePath = path.join(templatesDir, fileName)
        let preview = ''
        let strict = false
        try {
          const content = fs.readFileSync(filePath, 'utf-8')
          // Check for strict: true in frontmatter
          strict = /^---\s*\n[\s\S]*?strict:\s*true[\s\S]*?\n---/m.test(content)
          // First non-heading, non-empty, non-frontmatter line as preview
          const bodyStart = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '')
          const lines = bodyStart.split('\n').filter((l) => l.trim() && !l.startsWith('#'))
          preview = (lines[0] || '').substring(0, 100)
        } catch {}
        return { slug, name: slugToName(slug), preview, strict }
      })
    } catch (err: any) {
      console.error('[templates:list] Error:', err.message)
      return []
    }
  })

  /**
   * Get a single template's full content
   */
  ipcMain.handle('templates:get', async (_event, slug: string) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) return null

    const filePath = getSubPath(vaultPath, 'templates', `${slug}.md`)
    if (!fs.existsSync(filePath)) return null

    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      return { slug, name: slugToName(slug), content }
    } catch (err: any) {
      console.error('[templates:get] Error:', err.message)
      return null
    }
  })

  /**
   * Save (create or overwrite) a template file
   */
  ipcMain.handle('templates:save', async (_event, slug: string, content: string) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) throw new Error('No vault configured')

    const templatesDir = getSubPath(vaultPath, 'templates')
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true })
    }

    const filePath = path.join(templatesDir, `${slug}.md`)
    fs.writeFileSync(filePath, content, 'utf-8')
    return { success: true, slug }
  })

  /**
   * Delete a template file
   */
  ipcMain.handle('templates:delete', async (_event, slug: string) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) throw new Error('No vault configured')

    const filePath = getSubPath(vaultPath, 'templates', `${slug}.md`)
    if (!fs.existsSync(filePath)) throw new Error(`Template not found: ${slug}`)

    fs.unlinkSync(filePath)
    return { success: true }
  })
}
