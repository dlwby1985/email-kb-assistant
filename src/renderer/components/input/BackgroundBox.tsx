import React, { useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'

interface BackgroundBoxProps {
  value: string
  onChange: (value: string) => void
}

// Mirror of server-side detection patterns (must stay in sync with thread-parser.ts)
const DETECTION_PATTERNS = [
  /On .{5,80}wrote:/i,
  /---------- Forwarded message ----------/i,
  /^From:\s+.+\n(To:|Sent:|Date:|Subject:)/im,
  /^>+\s+.{10,}/m,
  /-----Original Message-----/i,
  /^_{10,}$/m,
]

function looksLikeThread(text: string): boolean {
  if (text.length < 80) return false
  let hits = 0
  for (const p of DETECTION_PATTERNS) {
    if (p.test(text)) hits++
  }
  return hits >= 2
}

export default function BackgroundBox({ value, onChange }: BackgroundBoxProps) {
  const { t } = useTranslation()
  const [threadDetected, setThreadDetected] = useState(false)
  const [isParsing, setIsParsing]           = useState(false)
  const [parseInfo, setParseInfo]           = useState<string | null>(null)
  const [parseError, setParseError]         = useState<string | null>(null)

  // Detect after paste (delay lets the textarea value update first)
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text')
    setTimeout(() => {
      if (looksLikeThread(pasted)) {
        setThreadDetected(true)
        setParseInfo(null)
        setParseError(null)
      }
    }, 50)
  }, [])

  const handleChange = useCallback((newVal: string) => {
    onChange(newVal)
    // If user edits after detection, reset so detection can fire again on next paste
    if (threadDetected && newVal.length < (value?.length ?? 0) - 20) {
      setThreadDetected(false)
    }
  }, [onChange, threadDetected, value])

  const handleParse = async () => {
    setIsParsing(true)
    setParseError(null)
    try {
      const result = await window.electronAPI.threadParse(value)
      if (result.success && result.formatted) {
        onChange(result.formatted)
        setThreadDetected(false)
        const senderList = result.senders?.filter(s => s !== 'Current author').join(', ') ?? ''
        const summary = `Parsed ${result.messageCount} message${result.messageCount !== 1 ? 's' : ''}${senderList ? ` · Senders: ${senderList}` : ''}`
        setParseInfo(summary)
      } else {
        setParseError(result.error ?? 'Parse failed')
        setThreadDetected(false)
      }
    } catch (err: any) {
      setParseError(err.message ?? 'Parse failed')
      setThreadDetected(false)
    } finally {
      setIsParsing(false)
    }
  }

  const handleDismiss = () => {
    setThreadDetected(false)
    setParseInfo(null)
    setParseError(null)
  }

  return (
    <div>
      <label className="section-label">
        {t('compose.background')}
        <span className="font-normal text-gray-400 ml-1">({t('compose.backgroundHint')})</span>
      </label>

      {/* Thread detected banner */}
      {threadDetected && (
        <div className="mb-1.5 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300">
          <span>📧 {t('compose.threadDetected')}</span>
          <button
            onClick={handleParse}
            disabled={isParsing}
            className="font-semibold underline underline-offset-2 hover:text-blue-900 dark:hover:text-blue-100 disabled:opacity-50"
          >
            {isParsing ? t('compose.parsing') : t('compose.parseOrganize')}
          </button>
          <button
            onClick={handleDismiss}
            className="ml-auto text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300"
            title="Keep as-is"
          >
            ✕
          </button>
        </div>
      )}

      {/* Parse success */}
      {parseInfo && (
        <div className="mb-1.5 flex items-center justify-between px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300">
          <span>✓ {parseInfo}</span>
          <button
            onClick={() => setParseInfo(null)}
            className="text-green-400 hover:text-green-600 ml-2"
          >✕</button>
        </div>
      )}

      {/* Parse error */}
      {parseError && (
        <div className="mb-1.5 flex items-center justify-between px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 dark:bg-red-900/20 dark:border-red-700">
          <span>⚠ {parseError}</span>
          <button onClick={() => setParseError(null)} className="ml-2 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      <textarea
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onPaste={handlePaste}
        placeholder={t('compose.backgroundPlaceholder')}
        className="textarea-field"
        rows={3}
      />
    </div>
  )
}
