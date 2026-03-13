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
      <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between shrink-0">
        <h3 className="text-sm font-semibold text-gray-800">{t('templates.title')}</h3>
        <button onClick={handleStartNew} className="btn-primary text-sm px-3 py-1.5">
          {t('templates.new')}
        </button>
      </div>

      {/* Body: two-pane */}
      <div className="flex flex-1 min-h-0">
        {/* Left: template list */}
        <div className="w-64 border-r border-gray-200 flex flex-col shrink-0">
          <div className="p-3 border-b border-gray-100">
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
              <p className="text-xs text-gray-400 p-4 text-center">
                {filter ? t('templates.noMatches') : t('templates.empty')}
              </p>
            ) : (
              filteredTemplates.map((t) => (
                <button
                  key={t.slug}
                  onClick={() => handleSelectTemplate(t.slug)}
                  className={`
                    w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors
                    ${selectedSlug === t.slug ? 'bg-asu-maroon/5 border-l-2 border-l-asu-maroon' : ''}
                  `}
                >
                  <p className="text-sm font-medium text-gray-800 truncate">{t.name}</p>
                  {t.preview && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{t.preview}</p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedSlug && !isCreatingNew ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              {t('templates.selectHint')}
            </div>
          ) : (
            <>
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 shrink-0">
                {isCreatingNew ? (
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Template name..."
                    autoFocus
                    className="flex-1 text-sm font-medium text-gray-900 border-b border-gray-300 focus:border-asu-maroon outline-none pb-0.5 bg-transparent"
                  />
                ) : (
                  <h3 className="flex-1 text-sm font-medium text-gray-900 truncate">{editorTitle}</h3>
                )}
                {isDirty && <span className="text-xs text-amber-500 shrink-0">{t('templates.unsaved')}</span>}
              </div>

              <div className="flex-1 min-h-0 p-4">
                {isLoadingContent ? (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">{t('app.loading')}</div>
                ) : (
                  <textarea
                    value={editContent}
                    onChange={(e) => { setEditContent(e.target.value); setIsDirty(true); setSaveError(null) }}
                    className="w-full h-full resize-none border border-gray-200 rounded-lg p-3 text-sm font-mono text-gray-800 focus:outline-none focus:border-asu-maroon bg-gray-50"
                    placeholder="Write your template in Markdown..."
                    spellCheck={false}
                  />
                )}
              </div>

              <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  {!isCreatingNew && selectedSlug && !showDeleteConfirm && (
                    <button onClick={() => setShowDeleteConfirm(true)} className="text-sm text-red-500 hover:text-red-700">{t('templates.delete')}</button>
                  )}
                  {showDeleteConfirm && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-red-600">{t('templates.deleteConfirm')}</span>
                      <button onClick={handleDelete} className="text-sm font-medium text-red-600 hover:text-red-800">{t('templates.yesDelete')}</button>
                      <button onClick={() => setShowDeleteConfirm(false)} className="text-sm text-gray-500">{t('settings.cancel')}</button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {saveError && <span className="text-xs text-red-500">{saveError}</span>}
                  <button
                    onClick={handleSave}
                    disabled={isSaving || (!isDirty && !isCreatingNew)}
                    className="btn-primary text-sm px-4 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
