import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

interface TemplateMeta {
  slug: string
  name: string
  preview: string
}

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60) || 'untitled'
}

export default function TemplatesPage() {
  const { t } = useTranslation()
  const [templates, setTemplates] = useState<TemplateMeta[]>([])
  const [filter, setFilter] = useState('')
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [isLoadingContent, setIsLoadingContent] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [newName, setNewName] = useState('')

  const loadTemplates = useCallback(async () => {
    try {
      const list = await window.electronAPI.templatesList()
      setTemplates(list)
    } catch (err) {
      console.error('Failed to load templates:', err)
    }
  }, [])

  useEffect(() => {
    loadTemplates()
    setSelectedSlug(null)
    setEditContent('')
    setIsDirty(false)
    setIsCreatingNew(false)
    setFilter('')
    setSaveError(null)
  }, [loadTemplates])

  const handleSelectTemplate = useCallback(async (slug: string) => {
    if (isDirty) {
      if (!window.confirm('Discard unsaved changes?')) return
    }
    setSelectedSlug(slug)
    setIsCreatingNew(false)
    setIsDirty(false)
    setSaveError(null)
    setShowDeleteConfirm(false)
    setIsLoadingContent(true)
    try {
      const result = await window.electronAPI.templatesGet(slug)
      setEditContent(result?.content ?? '')
    } catch {
      setEditContent('')
    } finally {
      setIsLoadingContent(false)
    }
  }, [isDirty])

  const handleStartNew = () => {
    if (isDirty && !window.confirm('Discard unsaved changes?')) return
    setIsCreatingNew(true)
    setSelectedSlug(null)
    setEditContent('')
    setNewName('')
    setIsDirty(false)
    setSaveError(null)
    setShowDeleteConfirm(false)
  }

  const handleSave = async () => {
    setSaveError(null)
    const slug = isCreatingNew
      ? nameToSlug(newName || 'untitled')
      : selectedSlug!
    if (!slug) return

    setIsSaving(true)
    try {
      await window.electronAPI.templatesSave(slug, editContent)
      await loadTemplates()
      setSelectedSlug(slug)
      setIsCreatingNew(false)
      setIsDirty(false)
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedSlug) return
    try {
      await window.electronAPI.templatesDelete(selectedSlug)
      await loadTemplates()
      setSelectedSlug(null)
      setEditContent('')
      setIsDirty(false)
      setShowDeleteConfirm(false)
    } catch (err: any) {
      setSaveError(err.message || 'Failed to delete')
    }
  }

  const filteredTemplates = filter.trim()
    ? templates.filter(
        (t) =>
          t.name.toLowerCase().includes(filter.toLowerCase()) ||
          t.preview.toLowerCase().includes(filter.toLowerCase())
      )
    : templates

  const selectedTemplate = templates.find((t) => t.slug === selectedSlug)
  const editorTitle = isCreatingNew
    ? (newName || 'New Template')
    : (selectedTemplate?.name ?? 'Select a template')

  return (
    <div className="h-full flex flex-col">
      {/* Header row */}
      <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between shrink-0">
        <h3 className="section-heading">{t('templates.title')}</h3>
        <button onClick={handleStartNew} className="btn-gold text-sm px-3 py-1.5">
          {t('templates.new')}
        </button>
      </div>

      {/* Body: two-pane */}
      <div className="flex flex-1 min-h-0">
        {/* Left: template list */}
        <div className="w-64 border-r border-white/10 flex flex-col shrink-0">
          <div className="p-3 border-b border-white/10">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t('templates.filterPlaceholder')}
              className="input-field text-sm"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredTemplates.length === 0 ? (
              <p className="text-xs text-white/40 p-4 text-center">
                {filter ? t('templates.noMatches') : t('templates.empty')}
              </p>
            ) : (
              filteredTemplates.map((t) => (
                <button
                  key={t.slug}
                  onClick={() => handleSelectTemplate(t.slug)}
                  className={`
                    w-full text-left px-4 py-3 border-b border-white/10 hover:bg-white/5 transition-colors
                    ${selectedSlug === t.slug ? 'bg-asu-gold/10 border-l-2 border-l-asu-gold' : ''}
                  `}
                >
                  <p className="text-sm font-medium text-white/80 truncate">{t.name}</p>
                  {t.preview && (
                    <p className="text-xs text-white/40 truncate mt-0.5">{t.preview}</p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedSlug && !isCreatingNew ? (
            <div className="flex-1 flex items-center justify-center text-white/40 text-sm">
              {t('templates.selectHint')}
            </div>
          ) : (
            <>
              <div className="px-5 py-3 border-b border-white/10 flex items-center gap-3 shrink-0">
                {isCreatingNew ? (
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Template name..."
                    autoFocus
                    className="flex-1 text-sm font-medium text-white border-b border-white/20 focus:border-asu-gold outline-none pb-0.5 bg-transparent"
                  />
                ) : (
                  <h3 className="flex-1 text-sm font-medium text-white truncate">{editorTitle}</h3>
                )}
                {isDirty && <span className="text-xs text-amber-400 shrink-0">{t('templates.unsaved')}</span>}
              </div>

              <div className="flex-1 min-h-0 p-4">
                {isLoadingContent ? (
                  <div className="h-full flex items-center justify-center text-white/40 text-sm">{t('app.loading')}</div>
                ) : (
                  <textarea
                    value={editContent}
                    onChange={(e) => { setEditContent(e.target.value); setIsDirty(true); setSaveError(null) }}
                    className="w-full h-full resize-none border border-white/10 rounded-lg p-3 text-sm font-mono text-white/80 focus:outline-none focus:border-asu-gold bg-white/5"
                    placeholder="Write your template in Markdown..."
                    spellCheck={false}
                  />
                )}
              </div>

              <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  {!isCreatingNew && selectedSlug && !showDeleteConfirm && (
                    <button onClick={() => setShowDeleteConfirm(true)} className="text-sm text-red-400 hover:text-red-300">{t('templates.delete')}</button>
                  )}
                  {showDeleteConfirm && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-red-400">{t('templates.deleteConfirm')}</span>
                      <button onClick={handleDelete} className="text-sm font-medium text-red-400 hover:text-red-300">{t('templates.yesDelete')}</button>
                      <button onClick={() => setShowDeleteConfirm(false)} className="text-sm text-white/50">{t('settings.cancel')}</button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {saveError && <span className="text-xs text-red-400">{saveError}</span>}
                  <button
                    onClick={handleSave}
                    disabled={isSaving || (!isDirty && !isCreatingNew)}
                    className="btn-gold text-sm px-4 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? t('templates.saving') : t('templates.save')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
