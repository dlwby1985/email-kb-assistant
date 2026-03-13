import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import { getSubPath } from './vault'
import { readMarkdownFile, listMarkdownFiles } from './markdown'

let db: Database.Database | null = null

// ── Database path ────────────────────────────────────────────────────────────

function getDbPath(vaultPath: string): string {
  return path.join(getSubPath(vaultPath), '.search-index.db')
}

// ── Schema ───────────────────────────────────────────────────────────────────

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS threads (
    file_path  TEXT PRIMARY KEY,
    contact    TEXT NOT NULL,
    channel    TEXT NOT NULL,
    direction  TEXT NOT NULL,
    subject    TEXT NOT NULL DEFAULT '',
    tags       TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT '',
    raw_text   TEXT NOT NULL DEFAULT ''
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS threads_fts USING fts5(
    contact,
    channel,
    subject,
    tags,
    raw_text,
    content='threads',
    content_rowid='rowid'
  );

  CREATE TRIGGER IF NOT EXISTS threads_ai AFTER INSERT ON threads BEGIN
    INSERT INTO threads_fts(rowid, contact, channel, subject, tags, raw_text)
    VALUES (new.rowid, new.contact, new.channel, new.subject, new.tags, new.raw_text);
  END;

  CREATE TRIGGER IF NOT EXISTS threads_ad AFTER DELETE ON threads BEGIN
    INSERT INTO threads_fts(threads_fts, rowid, contact, channel, subject, tags, raw_text)
    VALUES ('delete', old.rowid, old.contact, old.channel, old.subject, old.tags, old.raw_text);
  END;

  CREATE TRIGGER IF NOT EXISTS threads_au AFTER UPDATE ON threads BEGIN
    INSERT INTO threads_fts(threads_fts, rowid, contact, channel, subject, tags, raw_text)
    VALUES ('delete', old.rowid, old.contact, old.channel, old.subject, old.tags, old.raw_text);
    INSERT INTO threads_fts(rowid, contact, channel, subject, tags, raw_text)
    VALUES (new.rowid, new.contact, new.channel, new.subject, new.tags, new.raw_text);
  END;
`

// ── Init ─────────────────────────────────────────────────────────────────────

export function initializeDatabase(vaultPath: string): void {
  const dbPath = getDbPath(vaultPath)

  try {
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.exec(SCHEMA)
  } catch (err) {
    console.error('[search] Failed to initialize database:', err)
    db = null
  }
}

export function getDatabase(): Database.Database | null {
  return db
}

// ── Extract searchable text from a thread file ────────────────────────────────

function extractRawText(content: string): string {
  return content
    .replace(/^---[\s\S]*?---\n?/, '')  // Strip frontmatter if any leaked through
    .replace(/^#+\s+/gm, '')             // Strip heading markers
    .replace(/^_\(.*?\)_\s*$/gm, '')     // Strip instruction lines
    .replace(/\[.*?\]\(.*?\)/g, '')       // Strip links
    .replace(/\*\*/g, '')                 // Strip bold
    .trim()
}

// ── Index a single thread ─────────────────────────────────────────────────────

export interface ThreadIndexData {
  filePath: string
  contactSlug: string
  channel: string
  direction: string
  subject: string
  tags: string[]
  createdAt: string
  content: string
}

export function indexThread(data: ThreadIndexData): void {
  if (!db) return

  try {
    const raw_text = extractRawText(data.content)
    const tags_str = data.tags.join(' ')

    // Upsert: delete existing entry then insert fresh
    db.prepare('DELETE FROM threads WHERE file_path = ?').run(data.filePath)
    db.prepare(`
      INSERT INTO threads (file_path, contact, channel, direction, subject, tags, created_at, raw_text)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.filePath,
      data.contactSlug,
      data.channel,
      data.direction,
      data.subject,
      tags_str,
      data.createdAt,
      raw_text
    )
  } catch (err) {
    console.error('[search] Failed to index thread:', data.filePath, err)
  }
}

// ── Delete a thread from the index ──────────────────────────────────────────

export function deleteThreadIndex(filePath: string): void {
  if (!db) return
  try {
    db.prepare('DELETE FROM threads WHERE file_path = ?').run(filePath)
  } catch (err) {
    console.error('[search] Failed to delete index entry:', filePath, err)
  }
}

// ── Index all threads for a vault ─────────────────────────────────────────────

export function indexAllThreads(vaultPath: string): void {
  if (!db) return

  const contactsDir = getSubPath(vaultPath, 'contacts')
  if (!fs.existsSync(contactsDir)) return

  const slugs = fs.readdirSync(contactsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)

  let indexed = 0
  for (const slug of slugs) {
    const threadsDir = path.join(contactsDir, slug, 'threads')
    const files = listMarkdownFiles(threadsDir)

    for (const filePath of files) {
      try {
        const { data, content } = readMarkdownFile(filePath)
        indexThread({
          filePath,
          contactSlug: slug,
          channel: data.channel || 'email',
          direction: data.direction || 'outgoing',
          subject: data.subject || '',
          tags: data.tags || [],
          createdAt: data.created_at || '',
          content,
        })
        indexed++
      } catch (err) {
        console.error('[search] Failed to index file:', filePath, err)
      }
    }
  }

  console.log('[search] Indexed', indexed, 'threads across', slugs.length, 'contacts')
}

// ── Search ───────────────────────────────────────────────────────────────────

export interface SearchResult {
  filePath: string
  contactSlug: string
  channel: string
  direction: string
  subject: string
  tags: string[]
  createdAt: string
  snippet: string
  rank: number
}

export function searchThreads(
  query: string,
  options: { limit?: number; contactSlug?: string; channel?: string } = {}
): SearchResult[] {
  if (!db || !query.trim()) return []

  const { limit = 20, contactSlug, channel } = options

  try {
    // Sanitize: escape double-quotes in query for FTS5
    const safeQuery = query.trim().replace(/"/g, '""')

    let sql = `
      SELECT
        t.file_path,
        t.contact,
        t.channel,
        t.direction,
        t.subject,
        t.tags,
        t.created_at,
        snippet(threads_fts, 4, '<mark>', '</mark>', '…', 20) AS snippet,
        threads_fts.rank AS rank
      FROM threads_fts
      JOIN threads t ON t.rowid = threads_fts.rowid
      WHERE threads_fts MATCH ?
    `
    const params: any[] = [safeQuery]

    if (contactSlug) {
      sql += ' AND t.contact = ?'
      params.push(contactSlug)
    }
    if (channel) {
      sql += ' AND t.channel = ?'
      params.push(channel)
    }

    sql += ' ORDER BY rank LIMIT ?'
    params.push(limit)

    const rows = db.prepare(sql).all(...params) as any[]

    return rows.map((row) => ({
      filePath: row.file_path,
      contactSlug: row.contact,
      channel: row.channel,
      direction: row.direction,
      subject: row.subject,
      tags: row.tags ? row.tags.split(' ').filter(Boolean) : [],
      createdAt: row.created_at,
      snippet: row.snippet || '',
      rank: row.rank,
    }))
  } catch (err: any) {
    // FTS5 can throw on malformed queries — return empty result
    console.error('[search] Search error for query:', query, err.message)
    return []
  }
}

// ── Close ────────────────────────────────────────────────────────────────────

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
