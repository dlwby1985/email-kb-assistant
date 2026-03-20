import fs from 'fs'
import path from 'path'
import { getSubPath } from './vault'

// ── HTML utilities ─────────────────────────────────────────────────────────────

function extractTitle(html: string): string {
  // Try <title> tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch) return titleMatch[1].trim()
  // Try og:title meta
  const ogMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)
  if (ogMatch) return ogMatch[1].trim()
  return ''
}

function stripHtml(html: string): string {
  // Remove <script> blocks
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
  // Remove <style> blocks
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ')
  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
  // Collapse whitespace
  text = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  return text
}

export function titleToSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 60) || 'webpage'
  )
}

// ── Fetch ──────────────────────────────────────────────────────────────────────

export interface FetchURLResult {
  title: string
  text: string
  url: string
}

/**
 * Fetch a URL, extract readable text, and return title + plain text.
 * Throws on timeout (10s), HTTP errors, or non-HTML content.
 */
export async function fetchURL(url: string): Promise<FetchURLResult> {
  // Validate URL
  let parsed: URL
  try {
    parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Only http:// and https:// URLs are supported')
    }
  } catch (e: any) {
    throw new Error(`Invalid URL: ${e.message}`)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EmailKBAssistant/1.0)',
        Accept: 'text/html,application/xhtml+xml,text/plain,*/*',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type') || ''
    if (
      !contentType.includes('text/html') &&
      !contentType.includes('text/plain') &&
      !contentType.includes('application/xhtml')
    ) {
      throw new Error(`Not readable content (${contentType.split(';')[0].trim()})`)
    }

    const html = await response.text()
    const title = extractTitle(html) || parsed.hostname
    const text = stripHtml(html)

    if (!text.trim()) {
      throw new Error('No readable text content found on the page')
    }

    return { title, text, url }
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('Request timed out after 10 seconds')
    throw err
  } finally {
    clearTimeout(timer)
  }
}

// ── Save ───────────────────────────────────────────────────────────────────────

export interface SaveURLDocumentResult {
  filePath: string
  filename: string
}

/**
 * Save fetched URL content as a Markdown file in {vault}/knowledge-base/.
 * Uses the provided slug (for refetch), or derives one from the title.
 * Caps text at 50 000 characters.
 */
export function saveURLDocument(
  vaultPath: string,
  title: string,
  text: string,
  url: string,
  slug?: string
): SaveURLDocumentResult {
  const kbDir = getSubPath(vaultPath, 'knowledge-base')
  if (!fs.existsSync(kbDir)) {
    fs.mkdirSync(kbDir, { recursive: true })
  }

  const fileSlug = slug || titleToSlug(title)
  const filename = `${fileSlug}.md`
  const filePath = path.join(kbDir, filename)

  const fetchedDate = new Date().toISOString().slice(0, 10)
  const fetchedAt = new Date().toISOString()
  const safeTitle = title.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const safeUrl = url.replace(/\\/g, '\\\\').replace(/"/g, '\\"')

  const content = [
    '---',
    `source: "url"`,
    `url: "${safeUrl}"`,
    `title: "${safeTitle}"`,
    `fetched_at: "${fetchedAt}"`,
    '---',
    '',
    `# ${title}`,
    '',
    `Source: ${url}`,
    `Fetched: ${fetchedDate}`,
    '',
    text.substring(0, 50_000),
  ].join('\n')

  fs.writeFileSync(filePath, content, 'utf-8')
  return { filePath, filename }
}
