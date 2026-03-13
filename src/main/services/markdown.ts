import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export interface MarkdownFile {
  data: Record<string, any>
  content: string
}

/**
 * Read a Markdown file, parsing YAML frontmatter and body content
 */
export function readMarkdownFile(filePath: string): MarkdownFile {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(raw)
  return { data, content: content.trim() }
}

/**
 * Write a Markdown file with YAML frontmatter and body content
 */
export function writeMarkdownFile(
  filePath: string,
  data: Record<string, any>,
  content: string
): void {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  const output = matter.stringify('\n' + content + '\n', data)
  fs.writeFileSync(filePath, output, 'utf-8')
}

/**
 * Update only the frontmatter of a Markdown file, preserving body content
 */
export function updateFrontmatter(
  filePath: string,
  updates: Record<string, any>
): void {
  const { data, content } = readMarkdownFile(filePath)
  const merged = { ...data, ...updates }
  writeMarkdownFile(filePath, merged, content)
}

/**
 * List all .md files in a directory (non-recursive)
 */
export function listMarkdownFiles(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) {
    return []
  }
  return fs.readdirSync(dirPath)
    .filter((f) => f.endsWith('.md'))
    .map((f) => path.join(dirPath, f))
    .sort()
}

/**
 * List all .md files in a directory, sorted by a frontmatter date field (descending)
 */
export function listMarkdownFilesSorted(
  dirPath: string,
  dateField: string = 'created_at'
): string[] {
  const files = listMarkdownFiles(dirPath)
  const withDates = files.map((f) => {
    try {
      const { data } = readMarkdownFile(f)
      return { path: f, date: data[dateField] || '' }
    } catch {
      return { path: f, date: '' }
    }
  })
  withDates.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0))
  return withDates.map((w) => w.path)
}

/**
 * Extract a specific section from markdown content by heading
 * Returns the text under the heading until the next heading of same or higher level
 */
export function extractSection(content: string, heading: string): string {
  const lines = content.split('\n')
  const headingLevel = heading.match(/^#+/)?.[0]?.length || 2
  const headingPattern = new RegExp(`^#{${headingLevel}}\\s+${heading.replace(/^#+\s*/, '')}`, 'i')

  let capturing = false
  const captured: string[] = []

  for (const line of lines) {
    if (headingPattern.test(line)) {
      capturing = true
      continue
    }
    if (capturing) {
      const lineLevel = line.match(/^(#+)\s/)?.[1]?.length
      if (lineLevel && lineLevel <= headingLevel) {
        break
      }
      captured.push(line)
    }
  }

  return captured.join('\n').trim()
}
