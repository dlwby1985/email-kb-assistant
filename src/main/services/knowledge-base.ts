import fs from 'fs'
import path from 'path'
import { getSubPath } from './vault'
import { getDatabase } from './search'

// ── Schema ───────────────────────────────────────────────────────────────────

const KB_SCHEMA = `
  CREATE TABLE IF NOT EXISTS kb_documents (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    filename   TEXT NOT NULL,
    file_path  TEXT NOT NULL UNIQUE,
    file_type  TEXT NOT NULL,
    content    TEXT NOT NULL DEFAULT '',
    file_size  INTEGER NOT NULL DEFAULT 0,
    indexed_at TEXT NOT NULL DEFAULT ''
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS kb_fts USING fts5(
    filename,
    content,
    content='kb_documents',
    content_rowid='id'
  );

  CREATE TRIGGER IF NOT EXISTS kb_ai AFTER INSERT ON kb_documents BEGIN
    INSERT INTO kb_fts(rowid, filename, content) VALUES (new.id, new.filename, new.content);
  END;

  CREATE TRIGGER IF NOT EXISTS kb_ad AFTER DELETE ON kb_documents BEGIN
    INSERT INTO kb_fts(kb_fts, rowid, filename, content)
    VALUES ('delete', old.id, old.filename, old.content);
  END;

  CREATE TRIGGER IF NOT EXISTS kb_au AFTER UPDATE ON kb_documents BEGIN
    INSERT INTO kb_fts(kb_fts, rowid, filename, content)
    VALUES ('delete', old.id, old.filename, old.content);
    INSERT INTO kb_fts(rowid, filename, content) VALUES (new.id, new.filename, new.content);
  END;
`

export function initKnowledgeBaseTable(): void {
  const db = getDatabase()
  if (!db) return
  try {
    db.exec(KB_SCHEMA)
  } catch (err) {
    console.error('[kb] Failed to init KB table:', err)
  }
}

// ── Text extraction ───────────────────────────────────────────────────────────

async function extractFileText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase()
  try {
    switch (ext) {
      case '.md':
      case '.txt':
      case '.text':
        return fs.readFileSync(filePath, 'utf-8')

      case '.pdf': {
        const pdfParse = require('pdf-parse')
        const buffer = fs.readFileSync(filePath)
        const data = await pdfParse(buffer)
        return data.text || ''
      }

      case '.docx': {
        const mammoth = require('mammoth')
        const result = await mammoth.extractRawText({ path: filePath })
        return result.value || ''
      }

      default:
        return ''
    }
  } catch (err) {
    console.error('[kb] Failed to extract text from:', filePath, err)
    return ''
  }
}

// ── Index ─────────────────────────────────────────────────────────────────────

const SUPPORTED_EXTS = new Set(['.md', '.txt', '.text', '.pdf', '.docx'])

export async function indexKnowledgeBase(
  vaultPath: string
): Promise<{ indexed: number; errors: number }> {
  const db = getDatabase()
  if (!db) return { indexed: 0, errors: 0 }

  const kbDir = getSubPath(vaultPath, 'knowledge-base')
  if (!fs.existsSync(kbDir)) {
    fs.mkdirSync(kbDir, { recursive: true })
    return { indexed: 0, errors: 0 }
  }

  const files = fs.readdirSync(kbDir)
    .filter((f) => SUPPORTED_EXTS.has(path.extname(f).toLowerCase()))
    .map((f) => path.join(kbDir, f))

  let indexed = 0
  let errors = 0

  // Clear existing index then re-insert
  db.exec('DELETE FROM kb_documents')

  for (const filePath of files) {
    try {
      const filename = path.basename(filePath)
      const ext = path.extname(filePath).toLowerCase().slice(1) || 'txt'
      const stat = fs.statSync(filePath)
      const content = await extractFileText(filePath)
      if (!content.trim()) { errors++; continue }

      db.prepare(`
        INSERT INTO kb_documents (filename, file_path, file_type, content, file_size, indexed_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(filename, filePath, ext, content.trim(), stat.size, new Date().toISOString())

      indexed++
    } catch (err) {
      console.error('[kb] Failed to index:', filePath, err)
      errors++
    }
  }

  console.log('[kb] Indexed', indexed, 'documents,', errors, 'errors')
  return { indexed, errors }
}

// ── Search ────────────────────────────────────────────────────────────────────

export interface KBSearchResult {
  filename: string
  filePath: string
  fileType: string
  snippet: string
  fullExcerpt: string
  estimatedTokens: number
}

export function searchKnowledgeBase(query: string, limit = 3): KBSearchResult[] {
  const db = getDatabase()
  if (!db || !query.trim()) return []

  try {
    const safeQuery = query.trim().replace(/"/g, '""')
    const rows = db.prepare(`
      SELECT
        d.filename, d.file_path, d.file_type, d.content,
        snippet(kb_fts, 1, '', '', '…', 40) AS snip
      FROM kb_fts
      JOIN kb_documents d ON d.id = kb_fts.rowid
      WHERE kb_fts MATCH ?
      ORDER BY kb_fts.rank
      LIMIT ?
    `).all(safeQuery, limit) as any[]

    return rows.map((row) => {
      const content: string = row.content || ''
      const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean)
      let excerptStart = 0
      for (const word of queryWords) {
        const idx = content.toLowerCase().indexOf(word)
        if (idx !== -1) { excerptStart = Math.max(0, idx - 150); break }
      }
      const rawExcerpt = content.slice(excerptStart, excerptStart + 800).trim()
      const fullExcerpt = excerptStart > 0 ? '…' + rawExcerpt : rawExcerpt
      return {
        filename: row.filename,
        filePath: row.file_path,
        fileType: row.file_type,
        snippet: row.snip || rawExcerpt.slice(0, 120),
        fullExcerpt,
        estimatedTokens: Math.ceil(fullExcerpt.length / 4),
      }
    })
  } catch (err: any) {
    console.error('[kb] Search error:', err.message)
    return []
  }
}

// ── List / Stats ──────────────────────────────────────────────────────────────

export interface KBFileInfo {
  filename: string
  filePath: string
  fileType: string
  fileSize: number
  indexedAt: string
  indexed: boolean
  source: 'local' | 'url'
  url?: string
  fetchedAt?: string
}

/**
 * Read a single frontmatter field value from a Markdown file.
 * Looks for: fieldName: "value" or fieldName: value
 */
function readFrontmatterField(filePath: string, field: string): string | null {
  try {
    const buf = fs.readFileSync(filePath, 'utf-8').substring(0, 1200)
    if (!buf.startsWith('---')) return null
    const endIdx = buf.indexOf('---', 3)
    if (endIdx === -1) return null
    const fm = buf.slice(3, endIdx)
    const re = new RegExp(`^${field}:\\s*"?([^"\\n]+)"?`, 'm')
    const match = fm.match(re)
    return match ? match[1].trim() : null
  } catch {
    return null
  }
}

export function getKBList(vaultPath: string): KBFileInfo[] {
  const db = getDatabase()
  const kbDir = getSubPath(vaultPath, 'knowledge-base')

  if (!fs.existsSync(kbDir)) return []

  const diskFiles = fs.readdirSync(kbDir)
    .filter((f) => SUPPORTED_EXTS.has(path.extname(f).toLowerCase()))
    .map((f) => path.join(kbDir, f))

  const indexedMap = new Map<string, { fileSize: number; indexedAt: string }>()
  if (db) {
    const rows = db.prepare('SELECT filename, file_size, indexed_at FROM kb_documents').all() as any[]
    for (const row of rows) {
      indexedMap.set(row.filename, { fileSize: row.file_size, indexedAt: row.indexed_at })
    }
  }

  return diskFiles.map((fp) => {
    const name = path.basename(fp)
    const ext = path.extname(fp).toLowerCase().slice(1) || 'txt'
    const info = indexedMap.get(name)
    let size = info?.fileSize ?? 0
    if (!size) { try { size = fs.statSync(fp).size } catch { /* ignore */ } }

    // Check frontmatter for URL-sourced .md files
    let source: 'local' | 'url' = 'local'
    let url: string | undefined
    let fetchedAt: string | undefined
    if (ext === 'md') {
      const sourceField = readFrontmatterField(fp, 'source')
      if (sourceField === 'url') {
        source = 'url'
        url = readFrontmatterField(fp, 'url') || undefined
        fetchedAt = readFrontmatterField(fp, 'fetched_at') || undefined
      }
    }

    return {
      filename: name,
      filePath: fp,
      fileType: ext,
      fileSize: size,
      indexedAt: info?.indexedAt ?? '',
      indexed: !!info,
      source,
      url,
      fetchedAt,
    }
  })
}

export function getKBStats(
  vaultPath: string
): { totalFiles: number; indexedCount: number; kbDir: string } {
  const db = getDatabase()
  const kbDir = getSubPath(vaultPath, 'knowledge-base')
  const totalFiles = fs.existsSync(kbDir)
    ? fs.readdirSync(kbDir).filter((f) => SUPPORTED_EXTS.has(path.extname(f).toLowerCase())).length
    : 0
  const indexedCount = db
    ? ((db.prepare('SELECT COUNT(*) as n FROM kb_documents').get() as any)?.n ?? 0)
    : 0
  return { totalFiles, indexedCount, kbDir }
}

// ── Single-file index (for URL-fetched docs) ──────────────────────────────────

/**
 * Index (or re-index) a single file without wiping the whole KB index.
 */
export async function indexSingleFile(filePath: string): Promise<void> {
  const db = getDatabase()
  if (!db) return

  const filename = path.basename(filePath)
  const ext = path.extname(filePath).toLowerCase().slice(1) || 'txt'
  const stat = fs.statSync(filePath)
  const content = await extractFileText(filePath)
  if (!content.trim()) return

  db.prepare(`
    INSERT INTO kb_documents (filename, file_path, file_type, content, file_size, indexed_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(file_path) DO UPDATE SET
      content    = excluded.content,
      file_size  = excluded.file_size,
      indexed_at = excluded.indexed_at
  `).run(filename, filePath, ext, content.trim(), stat.size, new Date().toISOString())
}

// ── Delete ────────────────────────────────────────────────────────────────────

/**
 * Remove a KB file from disk AND from the SQLite index.
 */
export function deleteKBFile(vaultPath: string, filename: string): void {
  const db = getDatabase()
  const filePath = path.join(getSubPath(vaultPath, 'knowledge-base'), filename)

  // Remove from DB first (triggers FTS delete trigger)
  if (db) {
    db.prepare('DELETE FROM kb_documents WHERE filename = ?').run(filename)
  }

  // Remove from disk
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
}
