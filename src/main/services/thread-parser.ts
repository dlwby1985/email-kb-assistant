import { readConfig } from './config'
import { getActiveProvider } from './llm/manager'

export interface ParsedEmail {
  sender: string
  date: string
  body: string
}

export interface ParsedThread {
  emails: ParsedEmail[]
  totalMessages: number
}

// ── Detection patterns ─────────────────────────────────────────────────────

const DETECTION_PATTERNS = [
  // Gmail: "On Mon, Mar 7, 2026 at 2:30 PM, John <john@x.com> wrote:"
  /On .{5,80}wrote:/i,
  // Forwarded message separator
  /---------- Forwarded message ----------/i,
  // Outlook/Exchange From+To/Sent headers together
  /^From:\s+.+\n(To:|Sent:|Date:|Subject:)/im,
  // Quoted reply lines ("> text")
  /^>+\s+.{10,}/m,
  // "-----Original Message-----"
  /-----Original Message-----/i,
  // Yahoo/old clients "--- [Name] wrote:" or "________"
  /^_{10,}$/m,
]

/**
 * Returns true if text likely contains 2+ email messages (a thread).
 * Requires at least 2 pattern matches to reduce false positives.
 */
export function isEmailThread(text: string): boolean {
  if (text.length < 80) return false
  let matches = 0
  for (const pattern of DETECTION_PATTERNS) {
    if (pattern.test(text)) matches++
  }
  return matches >= 2
}

// ── Splitting ──────────────────────────────────────────────────────────────

interface SplitPoint {
  index: number
  header: string
}

const SPLIT_REGEXES = [
  // Gmail: "On [date] [name] <email> wrote:"  — newlines optional inside
  /On\s+\w+,?\s+\w+\s+\d+,?\s+\d{4}(?:,?\s+at\s+[\d:]+\s*[AP]M)?(?:[^\n]*)\s+wrote:/gi,
  // Outlook: "From: Name\r?\nSent: date\r?\nTo:"
  /^From:\s+[^\n]+\r?\n(?:Sent|Date):\s+[^\n]+\r?\n(?:To|CC):\s+/gim,
  // "-----Original Message-----"  or  "----------Forwarded message----------"
  /^[-=]{5,}\s*(?:Original Message|Forwarded message)\s*[-=]{5,}$/gim,
  // Underline separators (Yahoo etc.)
  /^_{10,}$/gm,
]

function findSplitPoints(text: string): SplitPoint[] {
  const points: SplitPoint[] = []
  const seen = new Set<number>()

  for (const re of SPLIT_REGEXES) {
    const r = new RegExp(re.source, re.flags)
    let m: RegExpExecArray | null
    while ((m = r.exec(text)) !== null) {
      if (!seen.has(m.index)) {
        seen.add(m.index)
        points.push({ index: m.index, header: m[0] })
      }
    }
  }

  return points.sort((a, b) => a.index - b.index)
}

// ── Header parsing ─────────────────────────────────────────────────────────

function extractSenderAndDate(header: string): { sender: string; date: string } {
  // Gmail style
  const gmailDate = header.match(/On\s+(\w+,?\s+\w+\s+\d+,?\s+\d{4}(?:,?\s+at\s+[\d:]+\s*[AP]M)?)/i)
  const gmailSender = header.match(/(?:at\s+[\d:]+\s*[AP]M)?\s*(.*?)\s*(?:<[^>]+>)?\s+wrote:/i)
  if (gmailDate && gmailSender) {
    return {
      sender: gmailSender[1].trim().replace(/^,\s*/, '') || 'Unknown',
      date: gmailDate[1].trim(),
    }
  }

  // Outlook style
  const fromMatch = header.match(/^From:\s+([^\n<]+?)(?:\s*<[^>]+>)?\s*$/im)
  const sentMatch = header.match(/^(?:Sent|Date):\s+([^\n]+)$/im)
  if (fromMatch) {
    return {
      sender: fromMatch[1].trim(),
      date: sentMatch ? sentMatch[1].trim() : '',
    }
  }

  return { sender: 'Unknown', date: '' }
}

// ── Parsing ────────────────────────────────────────────────────────────────

/**
 * Parse an email thread into individual messages using regex patterns.
 * Returns messages sorted oldest-first.
 */
export function parseEmailThread(text: string): ParsedThread {
  const splitPoints = findSplitPoints(text)

  if (splitPoints.length === 0) {
    // No split points found — return as a single entry
    return {
      emails: [{ sender: 'Current author', date: '', body: text.trim() }],
      totalMessages: 1,
    }
  }

  const emails: ParsedEmail[] = []

  // Text before first split = newest/current message (the one being replied to)
  const firstBody = text.substring(0, splitPoints[0].index).trim()
  if (firstBody.length > 10) {
    emails.push({ sender: 'Current author', date: '', body: firstBody })
  }

  // Process each split section
  for (let i = 0; i < splitPoints.length; i++) {
    const sp = splitPoints[i]
    const nextIdx = i + 1 < splitPoints.length ? splitPoints[i + 1].index : text.length
    const rawBody = text.substring(sp.index + sp.header.length, nextIdx).trim()

    // Remove "> " quote markers from each line
    const body = rawBody
      .split('\n')
      .map((line) => line.replace(/^>+\s?/, ''))
      .join('\n')
      .trim()

    if (body.length < 10) continue

    const { sender, date } = extractSenderAndDate(sp.header)
    emails.push({ sender, date, body })
  }

  // Reverse so oldest first (split points are newest-first in Gmail threads)
  const reversed = [...emails].reverse()

  return {
    emails: reversed,
    totalMessages: reversed.length,
  }
}

/**
 * Format a ParsedThread as clean Markdown (oldest first).
 */
export function formatParsedThread(parsed: ParsedThread): string {
  const count = parsed.emails.length
  const lines: string[] = [
    `## Email Thread (${count} message${count !== 1 ? 's' : ''}, chronological)`,
    '',
  ]

  parsed.emails.forEach((email, i) => {
    const parts: string[] = [`${i + 1}. From: ${email.sender}`]
    if (email.date) parts.push(`— ${email.date}`)
    lines.push(`### ${parts.join(' ')}`)
    lines.push('')
    lines.push(email.body)
    lines.push('')
  })

  return lines.join('\n')
}

/**
 * AI-assisted parsing fallback — used when regex parsing finds < 2 messages.
 * Falls back gracefully if AI call fails.
 */
export async function parseEmailThreadWithAI(
  text: string,
  vaultPath: string
): Promise<ParsedThread> {
  try {
    const config = readConfig(vaultPath)
    const provider = getActiveProvider(config)

    const systemPrompt = [
      'You are an email thread parser.',
      'Parse the email thread into individual messages.',
      'Output ONLY a valid JSON array — no markdown fences, no explanation.',
      'Each element: {"sender": string, "date": string, "body": string}',
      'Sort chronologically oldest first.',
      'If sender or date cannot be determined, use "Unknown" and "" respectively.',
      'Summarize email bodies longer than 400 words to key points.',
    ].join('\n')

    const userMessage = `Parse this email thread:\n\n${text.substring(0, 8000)}`

    const result = await provider.generate({
      systemPrompt,
      userMessage,
      maxTokens: 2000,
    })

    // Extract JSON from response (may have surrounding text)
    const jsonMatch = result.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const emails: ParsedEmail[] = JSON.parse(jsonMatch[0])
      if (Array.isArray(emails) && emails.length > 0) {
        return { emails, totalMessages: emails.length }
      }
    }
  } catch (err) {
    console.error('[thread-parser] AI fallback failed:', err)
  }

  // Final fallback: return the text as one entry
  return {
    emails: [{ sender: 'Unknown', date: '', body: text.trim() }],
    totalMessages: 1,
  }
}
