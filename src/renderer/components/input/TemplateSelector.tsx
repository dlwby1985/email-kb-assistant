import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { SearchResult, TemplateSelectorValue } from '../../types'

interface TemplateItem {
  slug: string
  name: string
  preview: string
  strict?: boolean
}

interface TemplateSelectorProps {
  value: TemplateSelectorValue
  onChange: (val: TemplateSelectorValue) => void
  coreContent: string
}

export default function TemplateSelector({ value, onChange, coreContent }: TemplateSelectorProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [historyResults, setHistoryResults] = useState<SearchResult[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load template list on mount
  useEffect(() => {
    window.electronAPI.templatesList().then(setTemplates).catch(() => {})
  }, [])

  // Search history when dropdown opens
  useEffect(() => {
    if (!isOpen) return
    const q = coreContent.trim()
    if (!q) {
      setHistoryResults([])
      return
    }
    setLoadingHistory(true)
    window.electronAPI
      .searchQuery(q, { limit: 5 })
      .then(setHistoryResults)
      .catch(() => setHistoryResults([]))
      .finally(() => setLoadingHistory(false))
  }, [isOpen, coreContent])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const open = () => {
    setIsOpen(true)
    setSearchText('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const close = () => {
    setIsOpen(false)
    setSearchText('')
  }

  const selectTemplate = (t: TemplateItem) => {
    onChange({ type: 'template', slug: t.slug, name: t.name })
    close()
  }

  const selectHistory = (h: SearchResult) => {
    const nameFallback =
      h.filePath.split(/[/\\]/).pop()?.replace('.md', '') ?? 'Thread'
    const name = h.subject || nameFallback
    onChange({ type: 'history', filePath: h.filePath, name })
    close()
  }

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
  }

  // Filter templates by search text (only affect templates section)
  const filteredTemplates = searchText
    ? templates.filter((t) =>
        t.name.toLowerCase().includes(searchText.toLowerCase())
      )
    : templates

  const hasContent = filteredTemplates.length > 0 || !searchText

  return (
    <div ref={containerRef} className="relative">
      <label className="section-label">{t('compose.taskTemplate')}</label>

      {/* Trigger field */}
      <div
        onClick={value ? undefined : open}
        className={`input-field flex items-center gap-2 min-h-[38px] cursor-pointer select-none ${
          value ? 'bg-asu-gold/10 border-asu-gold/40' : 'text-white/40'
        }`}
      >
        {value ? (
          <>
            <span className="text-sm shrink-0">
              {value.type === 'template' ? '📋' : '📧'}
            </span>
            <span className="text-sm text-white/80 flex-1 truncate">{value.name}</span>
            <button
              onClick={clear}
              title="Remove template"
              className="text-white/40 hover:text-white/70 shrink-0 leading-none text-base"
            >
              ×
            </button>
          </>
        ) : (
          <span className="text-sm" onClick={open}>
            {t('compose.taskTemplatePlaceholder')}
          </span>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute z-50 left-0 right-0 mt-1 border border-white/[0.12] rounded-lg shadow-xl max-h-72 overflow-y-auto"
          style={{ background: 'rgba(30,10,20,0.95)', backdropFilter: 'blur(16px)' }}
        >
          {/* Search input */}
          <div className="p-2 border-b border-white/10 sticky top-0" style={{ background: 'rgba(30,10,20,0.95)', backdropFilter: 'blur(16px)' }}>
            <input
              ref={inputRef}
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Filter templates…"
              className="w-full text-sm px-2 py-1 border border-white/[0.12] rounded focus:outline-none focus:border-asu-gold bg-white/5 text-white placeholder:text-white/30"
            />
          </div>

          {/* Templates section */}
          {filteredTemplates.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-xs font-semibold text-white/40 uppercase tracking-wide" style={{ background: 'rgba(255,255,255,0.05)' }}>
                Templates
              </div>
              {filteredTemplates.map((t) => (
                <button
                  key={t.slug}
                  onClick={() => selectTemplate(t)}
                  className="w-full text-left px-3 py-2 hover:bg-white/5 border-b border-white/5 last:border-0"
                >
                  <div className="text-sm font-medium text-white/80">
                    📋 {t.name}
                    {t.strict && <span className="ml-1.5 text-[10px] font-bold text-asu-maroon bg-asu-maroon/10 px-1 py-0.5 rounded">STRICT</span>}
                  </div>
                  {t.preview && (
                    <div className="text-xs text-white/40 truncate mt-0.5">{t.preview}</div>
                  )}
                </button>
              ))}
            </>
          )}

          {/* No template matches */}
          {filteredTemplates.length === 0 && searchText && (
            <div className="px-3 py-2 text-xs text-white/40 text-center">
              No templates match "{searchText}"
            </div>
          )}

          {/* Similar Past Emails section — only when not filtering templates */}
          {!searchText && (
            <>
              <div className="px-3 py-1.5 text-xs font-semibold text-white/40 uppercase tracking-wide border-t border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
                Similar Past Emails
              </div>
              {loadingHistory ? (
                <div className="px-3 py-2 text-xs text-white/40">Searching…</div>
              ) : historyResults.length === 0 ? (
                <div className="px-3 py-2 text-xs text-white/40">
                  {coreContent.trim()
                    ? 'No similar threads found'
                    : 'Type core content to find similar emails'}
                </div>
              ) : (
                historyResults.map((h) => (
                  <button
                    key={h.filePath}
                    onClick={() => selectHistory(h)}
                    className="w-full text-left px-3 py-2 hover:bg-white/5 border-b border-white/5 last:border-0"
                  >
                    <div className="text-sm font-medium text-white/80">
                      📧 {h.subject || 'Thread'}
                    </div>
                    {h.snippet && (
                      <div
                        className="text-xs text-white/40 truncate mt-0.5 [&_mark]:bg-asu-gold/40 [&_mark]:text-white"
                        dangerouslySetInnerHTML={{ __html: h.snippet }}
                      />
                    )}
                  </button>
                ))
              )}
            </>
          )}

          {/* Empty state when no templates at all */}
          {!hasContent && !searchText && (
            <div className="px-3 py-3 text-xs text-white/40 text-center">
              No templates found. Add .md files to EmailKB/templates/
            </div>
          )}
        </div>
      )}
    </div>
  )
}
