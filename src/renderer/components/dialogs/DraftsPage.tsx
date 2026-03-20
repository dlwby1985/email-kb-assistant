import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

interface DraftMeta {
  fileName: string
  filePath: string
  createdAt: string
  subject: string
  contactNames: string[]
  channel: string
  preview: string
}

interface DraftFull {
  contactSlugs: string[]
  contactNames: string[]
  channel: string
  mode: string
  skill: string
  createdAt: string
  subject: string
  background: string
  coreContent: string
  generatedDraft: string
}

interface DraftsPageProps {
  onResume: (draft: DraftFull) => void
}

function formatDate(iso: string): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

export default function DraftsPage({ onResume }: DraftsPageProps) {
  const { t } = useTranslation()
  const [drafts, setDrafts] = useState<DraftMeta[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [resumingPath, setResumingPath] = useState<string | null>(null)
  const [deletingPath, setDeletingPath] = useState<string | null>(null)

  const CHANNEL_LABELS: Record<string, string> = {
    email: t('status.email'),
    wechat: 'WeChat',
    slack: 'Slack',
    zoom: 'Zoom',
  }

  const loadDrafts = useCallback(async () => {
    setIsLoading(true)
    try {
      const list = await window.electronAPI.draftsList()
      setDrafts(list)
    } catch (err) {
      console.error('Failed to load drafts:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDrafts()
  }, [loadDrafts])

  const handleResume = async (draft: DraftMeta) => {
    setResumingPath(draft.filePath)
    try {
      const full = await window.electronAPI.draftsLoad(draft.filePath)
      onResume(full)
    } catch (err) {
      console.error('Failed to load draft:', err)
    } finally {
      setResumingPath(null)
    }
  }

  const handleDelete = async (draft: DraftMeta) => {
    if (!window.confirm(`Delete draft "${draft.subject || draft.fileName}"?`)) return
    setDeletingPath(draft.filePath)
    try {
      await window.electronAPI.draftsDelete(draft.filePath)
      setDrafts((prev) => prev.filter((d) => d.filePath !== draft.filePath))
    } catch (err) {
      console.error('Failed to delete draft:', err)
    } finally {
      setDeletingPath(null)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-white/10 shrink-0">
        <h2 className="page-title">{t('drafts.title')}</h2>
        <p className="text-xs text-white/40 mt-0.5">{t('drafts.subtitle')}</p>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-white/40 text-sm">{t('drafts.loading')}</div>
        ) : drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-white/40">
            <p className="text-sm">{t('drafts.empty')}</p>
            <p className="text-xs mt-1">Use <kbd className="bg-white/5 border border-white/10 rounded px-1 text-white/60 text-xs">Ctrl+D</kbd> {t('drafts.hint')}</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {drafts.map((draft) => (
              <div key={draft.filePath} className="px-5 py-4 hover:bg-white/5 flex items-start gap-4">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-asu-gold bg-asu-gold/10 px-1.5 py-0.5 rounded">
                      {CHANNEL_LABELS[draft.channel] ?? draft.channel}
                    </span>
                    {draft.contactNames.length > 0 && (
                      <span className="text-xs text-white/50">
                        → {draft.contactNames.join(', ')}
                      </span>
                    )}
                    <span className="text-xs text-white/40 ml-auto shrink-0">
                      {formatDate(draft.createdAt)}
                    </span>
                  </div>
                  {draft.subject && (
                    <p className="text-sm font-medium text-white/80 truncate">{draft.subject}</p>
                  )}
                  {draft.preview && (
                    <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{draft.preview}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDelete(draft)}
                    disabled={deletingPath === draft.filePath}
                    className="text-xs text-white/40 hover:text-red-400 transition-colors"
                  >
                    {deletingPath === draft.filePath ? '...' : t('drafts.delete')}
                  </button>
                  <button
                    onClick={() => handleResume(draft)}
                    disabled={resumingPath === draft.filePath}
                    className="btn-gold text-xs px-3 py-1.5"
                  >
                    {resumingPath === draft.filePath ? t('drafts.resuming') : t('drafts.resume')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
