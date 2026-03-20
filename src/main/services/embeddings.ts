/**
 * DashScope text-embedding service for semantic search.
 * Uses text-embedding-v3 (dimension 1024, supports up to 2048 tokens).
 */
import fs from 'fs'
import path from 'path'
import { getDatabase } from './search'

const DASHSCOPE_EMBED_URL =
  'https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding'

const EMBED_SCHEMA = `
  CREATE TABLE IF NOT EXISTS thread_embeddings (
    file_path   TEXT PRIMARY KEY,
    embedding   TEXT NOT NULL,
    embedded_at TEXT NOT NULL DEFAULT ''
  );
`

// ── Init ─────────────────────────────────────────────────────────────────────

export function initEmbeddingsTable(): void {
  const db = getDatabase()
  if (!db) return
  try {
    db.exec(EMBED_SCHEMA)
  } catch (err) {
    console.error('[embeddings] Failed to create table:', err)
  }
}

// ── DashScope API call ────────────────────────────────────────────────────────

export async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.DASHSCOPE_API_KEY
  if (!apiKey) throw new Error('DASHSCOPE_API_KEY not set')

  const trimmed = text.slice(0, 8000)  // rough token limit guard

  const resp = await fetch(DASHSCOPE_EMBED_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-v3',
      input: { texts: [trimmed] },
      parameters: { dimension: 1024 },
    }),
  })

  if (!resp.ok) {
    const body = await resp.text().catch(() => '')
    throw new Error(`DashScope API error ${resp.status}: ${body}`)
  }

  const json = (await resp.json()) as {
    output?: { embeddings?: Array<{ embedding: number[] }> }
    message?: string
  }

  const embedding = json.output?.embeddings?.[0]?.embedding
  if (!Array.isArray(embedding)) {
    throw new Error(`Unexpected DashScope response: ${JSON.stringify(json).slice(0, 200)}`)
  }
  return embedding
}

// ── Store / retrieve embeddings ───────────────────────────────────────────────

export function storeEmbedding(filePath: string, embedding: number[]): void {
  const db = getDatabase()
  if (!db) return
  try {
    db.prepare(
      'INSERT OR REPLACE INTO thread_embeddings (file_path, embedding, embedded_at) VALUES (?, ?, ?)'
    ).run(filePath, JSON.stringify(embedding), new Date().toISOString())
  } catch (err) {
    console.error('[embeddings] Failed to store embedding:', err)
  }
}

export function getStoredEmbedding(filePath: string): number[] | null {
  const db = getDatabase()
  if (!db) return null
  try {
    const row = db.prepare('SELECT embedding FROM thread_embeddings WHERE file_path = ?').get(filePath) as any
    return row ? JSON.parse(row.embedding) : null
  } catch {
    return null
  }
}

export function deleteEmbedding(filePath: string): void {
  const db = getDatabase()
  if (!db) return
  try {
    db.prepare('DELETE FROM thread_embeddings WHERE file_path = ?').run(filePath)
  } catch {
    // ignore
  }
}

export function countEmbeddings(): number {
  const db = getDatabase()
  if (!db) return 0
  try {
    const row = db.prepare('SELECT COUNT(*) as n FROM thread_embeddings').get() as any
    return row?.n ?? 0
  } catch {
    return 0
  }
}

// ── Cosine similarity ─────────────────────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  if (magA === 0 || magB === 0) return 0
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

// ── Semantic search ───────────────────────────────────────────────────────────

export interface SemanticSearchResult {
  filePath: string
  score: number
}

export function semanticSearchLocal(
  queryEmbedding: number[],
  options: { limit?: number; contactSlug?: string } = {}
): SemanticSearchResult[] {
  const db = getDatabase()
  if (!db) return []

  const { limit = 15, contactSlug } = options

  try {
    // Load all embeddings (feasible for small KB — a few hundred threads)
    let rows: Array<{ file_path: string; embedding: string }>
    if (contactSlug) {
      // Join with threads to filter by contact
      rows = db.prepare(
        `SELECT te.file_path, te.embedding FROM thread_embeddings te
         JOIN threads t ON t.file_path = te.file_path
         WHERE t.contact = ?`
      ).all(contactSlug) as any[]
    } else {
      rows = db.prepare('SELECT file_path, embedding FROM thread_embeddings').all() as any[]
    }

    const scored = rows.map((row) => {
      try {
        const emb: number[] = JSON.parse(row.embedding)
        return { filePath: row.file_path, score: cosineSimilarity(queryEmbedding, emb) }
      } catch {
        return { filePath: row.file_path, score: 0 }
      }
    })

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  } catch (err) {
    console.error('[embeddings] Semantic search error:', err)
    return []
  }
}
