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
          value ? 'bg-asu-maroon/5 border-asu-maroon/40' : 'text-gray-400'
        }`}
      >
        {value ? (
          <>
            <span className="text-sm shrink-0">
              {value.type === 'template' ? '📋' : '📧'}
            </span>
            <span className="text-sm text-gray-700 flex-1 truncate">{value.name}</span>
            <button
              onClick={clear}
              title="Remove template"
              className="text-gray-400 hover:text-gray-700 shrink-0 leading-none text-base"
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
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-72 overflow-y-auto">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
            <input
              ref={inputRef}
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Filter templates…"
              className="w-full text-sm px-2 py-1 border border-gray-200 rounded focus:outline-none focus:border-asu-maroon"
            />
          </div>

          {/* Templates section */}
          {filteredTemplates.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">
                Templates
              </div>
              {filteredTemplates.map((t) => (
                <button
                  key={t.slug}
                  onClick={() => selectTemplate(t)}
                  className="w-full text-left px-3 py-2 hover:bg-asu-maroon/5 border-b border-gray-50 last:border-0"
                >
                  <div className="text-sm font-medium text-gray-700">
                    📋 {t.name}
                    {t.strict && <span className="ml-1.5 text-[10px] font-bold text-asu-maroon bg-asu-maroon/10 px-1 py-0.5 rounded">STRICT</span>}
                  </div>
                  {t.preview && (
                    <div className="text-xs text-gray-400 truncate mt-0.5">{t.preview}</div>
                  )}
                </button>
              ))}
            </>
          )}

          {/* No template matches */}
          {filteredTemplates.length === 0 && searchText && (
            <div className="px-3 py-2 text-xs text-gray-400 text-center">
              No templates match "{searchText}"
            </div>
          )}

          {/* Similar Past Emails section — only when not filtering templates */}
          {!searchText && (
            <>
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 border-t border-gray-100">
                Similar Past Emails
              </div>
              {loadingHistory ? (
                <div className="px-3 py-2 text-xs text-gray-400">Searching…</div>
              ) : historyResults.length === 0 ? (
                <div className="px-3 py-2 text-xs text-gray-400">
                  {coreContent.trim()
                    ? 'No similar threads found'
                    : 'Type core content to find similar emails'}
                </div>
              ) : (
                historyResults.map((h) => (
                  <button
                    key={h.filePath}
                    onClick={() => selectHistory(h)}
                    className="w-full text-left px-3 py-2 hover:bg-asu-maroon/5 border-b border-gray-50 last:border-0"
                  >
                    <div className="text-sm font-medium text-gray-700">
                      📧 {h.subject || 'Thread'}
                    </div>
                    {h.snippet && (
                      <div
                        className="text-xs text-gray-400 truncate mt-0.5 [&_mark]:bg-asu-gold/40 [&_mark]:text-gray-700"
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
            <div className="px-3 py-3 text-xs text-gray-400 text-center">
              No templates found. Add .md files to EmailKB/templates/
            </div>
          )}
        </div>
      )}
    </div>
  )
}
