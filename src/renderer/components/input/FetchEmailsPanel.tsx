import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { FetchedEmail } from '../../types'

type DateRange = 'today' | '2days' | 'week'

interface FetchEmailsPanelProps {
  onSelectEmail: (email: FetchedEmail) => void
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay === 1) return 'yesterday'
  return `${diffDay}d ago`
}

export default function FetchEmailsPanel({ onSelectEmail }: FetchEmailsPanelProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [range, setRange] = useState<DateRange>('today')
  const [emails, setEmails] = useState<FetchedEmail[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authorized, setAuthorized] = useState<boolean | null>(null)

  // Check auth status on mount
  useEffect(() => {
    window.electronAPI.imapGoogleAuthStatus().then((res) => {
      setAuthorized(res.authorized)
    }).catch(() => setAuthorized(false))
  }, [])

  const handleFetch = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await window.electronAPI.imapFetchByDate(range)
      if (result.success) {
        setEmails(result.emails)
      } else {
        setError(result.error || t('fetchEmails.fetchFailed'))
      }
    } catch (err: any) {
      setError(err.message || t('fetchEmails.fetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = (email: FetchedEmail) => {
    onSelectEmail(email)
    setExpanded(false)
  }

  return (
    <div className="border border-asu-gold/30 rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors text-sm"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      >
        <span className="flex items-center gap-2 font-medium text-white/80">
          <span>📨</span>
          {t('fetchEmails.title')}
          {emails.length > 0 && !expanded && (
            <span className="text-xs bg-asu-gold text-black px-1.5 py-0.5 rounded-full">
              {emails.length}
            </span>
          )}
        </span>
        <span className="text-white/40 text-xs">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="p-3 space-y-3 border-t border-white/10">
          {authorized === false && (
            <p className="text-xs text-white/50">
              {t('fetchEmails.notConnected')}{' '}
              <span className="text-asu-gold cursor-pointer hover:underline">
                {t('fetchEmails.goToSettings')}
              </span>
            </p>
          )}

          {authorized !== false && (
            <>
              {/* Controls row */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFetch}
                  disabled={isLoading}
                  className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
                >
                  {isLoading ? (
                    <>
                      <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('fetchEmails.fetching')}
                    </>
                  ) : (
                    t('fetchEmails.fetchButton')
                  )}
                </button>

                <select
                  value={range}
                  onChange={(e) => setRange(e.target.value as DateRange)}
                  className="text-xs border border-white/10 rounded px-2 py-1.5 text-white/80"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                  <option value="today">{t('fetchEmails.today')}</option>
                  <option value="2days">{t('fetchEmails.last2Days')}</option>
                  <option value="week">{t('fetchEmails.thisWeek')}</option>
                </select>

                {emails.length > 0 && (
                  <span className="text-xs text-white/50">
                    {emails.length} {t('fetchEmails.emailCount')}
                  </span>
                )}
              </div>

              {/* Error */}
              {error && (
                <p className="text-xs text-asu-pink bg-asu-pink/10 px-2 py-1 rounded">
                  {error}
                </p>
              )}

              {/* Email list */}
              {emails.length > 0 && (
                <div className="max-h-72 overflow-y-auto space-y-1">
                  {emails.map((email) => (
                    <button
                      key={`${email.uid}-${email.messageId}`}
                      onClick={() => handleSelect(email)}
                      className="w-full text-left p-2 rounded hover:bg-white/5 transition-colors group"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-medium text-white/80 truncate">
                          {email.from}
                        </span>
                        <span className="text-[10px] text-white/40 shrink-0">
                          {email.date ? timeAgo(email.date) : ''}
                        </span>
                      </div>
                      <p className="text-xs text-white/60 truncate mt-0.5 font-medium">
                        {email.subject}
                      </p>
                      <p className="text-[10px] text-white/40 truncate mt-0.5">
                        {email.fromEmail}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {/* Empty state after fetch */}
              {!isLoading && emails.length === 0 && !error && authorized === true && (
                <p className="text-xs text-white/40 text-center py-2">
                  {t('fetchEmails.clickToFetch')}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
