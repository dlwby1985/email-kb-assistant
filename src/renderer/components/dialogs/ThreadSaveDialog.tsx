import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { Direction, Contact } from '../../types'
import DraggableDialog from './DraggableDialog'

interface ThreadSaveDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: ThreadSaveFormData) => Promise<void>
  contacts: Contact[]
}

export interface ThreadSaveFormData {
  direction: Direction
  tags: string[]
  subject: string
  appendToThread: string | null // null = new thread, string = existing filename
  saveAsTemplate: boolean
  templateName: string
}

export default function ThreadSaveDialog({
  isOpen,
  onClose,
  onSave,
  contacts,
}: ThreadSaveDialogProps) {
  const { t } = useTranslation()
  const [direction, setDirection] = useState<Direction>('outgoing')
  const [subject, setSubject] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [threadMode, setThreadMode] = useState<'new' | 'append'>('new')
  const [existingThreads, setExistingThreads] = useState<Array<{ fileName: string; label: string }>>([])
  const [selectedThread, setSelectedThread] = useState<string>('')
  const [threadSearch, setThreadSearch] = useState('')
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const directionOptions: { value: Direction; label: string; description: string }[] = [
    {
      value: 'incoming-reply',
      label: t('dialogs.replyToIncoming'),
      description: 'You received a message and are replying',
    },
    {
      value: 'outgoing',
      label: t('dialogs.outgoingInitiated'),
      description: 'You are initiating this communication',
    },
    {
      value: 'incoming-only',
      label: t('dialogs.incomingOnly'),
      description: 'Archive received message without reply',
    },
  ]

  // Load existing threads when dialog opens with contacts selected
  useEffect(() => {
    if (isOpen && contacts.length === 1) {
      window.electronAPI
        .threadsGetExisting(contacts[0].slug)
        .then((threads) => {
          setExistingThreads(threads)
          if (threads.length > 0) {
            setSelectedThread(threads[0].fileName)
          }
        })
        .catch(() => setExistingThreads([]))
    }
  }, [isOpen, contacts])

  // Search existing threads when search input changes
  useEffect(() => {
    if (threadMode === 'append' && contacts.length === 1 && threadSearch.trim()) {
      const timer = setTimeout(() => {
        window.electronAPI
          .threadsGetExisting(contacts[0].slug, threadSearch.trim())
          .then((threads) => {
            setExistingThreads(threads)
            if (threads.length > 0 && !threads.find((thr) => thr.fileName === selectedThread)) {
              setSelectedThread(threads[0].fileName)
            }
          })
          .catch(() => {})
      }, 300) // debounce 300ms
      return () => clearTimeout(timer)
    }
  }, [threadSearch, threadMode, contacts])

  const handleAddTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((tg) => tg !== tag))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags(tags.slice(0, -1))
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    try {
      await onSave({
        direction,
        tags,
        subject: subject.trim(),
        appendToThread: threadMode === 'append' ? selectedThread : null,
        saveAsTemplate,
        templateName: templateName.trim() || subject.trim() || 'untitled',
      })
      // Reset
      setDirection('outgoing')
      setSubject('')
      setTags([])
      setTagInput('')
      setThreadMode('new')
      setSelectedThread('')
      setThreadSearch('')
      setSaveAsTemplate(false)
      setTemplateName('')
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save thread')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <DraggableDialog
      isOpen={isOpen}
      onClose={onClose}
      title={t('output.saveArchive')}
      subtitle={`Save this conversation to ${contacts.length > 0 ? contacts.map((c) => c.name).join(', ') : 'vault'}`}
    >
        {/* Form */}
        <div className="px-6 py-4 space-y-4">
          {/* Direction */}
          <div>
            <label className="section-label">{t('dialogs.direction')}</label>
            <div className="space-y-1.5">
              {directionOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={`
                    flex items-start gap-3 p-2.5 rounded border cursor-pointer transition-colors
                    ${direction === opt.value
                      ? 'border-asu-maroon bg-asu-maroon/5'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="direction"
                    value={opt.value}
                    checked={direction === opt.value}
                    onChange={() => setDirection(opt.value)}
                    className="mt-0.5 text-asu-maroon focus:ring-asu-maroon"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="section-label">{t('dialogs.subject')}</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Meeting reschedule, TA assignment..."
              className="input-field"
            />
            <p className="text-xs text-gray-400 mt-0.5">Used as the thread filename in Obsidian</p>
          </div>

          {/* Tags */}
          <div>
            <label className="section-label">{t('dialogs.tags')}</label>
            <div className="input-field flex flex-wrap gap-1.5 items-center min-h-[38px]">
              {tags.map((tag) => (
                <span key={tag} className="tag-chip">
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-0.5 text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={handleAddTag}
                placeholder={tags.length === 0 ? t('dialogs.addTag') : ''}
                className="flex-1 min-w-[80px] outline-none bg-transparent text-sm border-none"
                style={{ boxShadow: 'none' }}
              />
            </div>
          </div>

          {/* Save as Template */}
          <div className="border border-gray-200 rounded-lg p-3 space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveAsTemplate}
                onChange={(e) => setSaveAsTemplate(e.target.checked)}
                className="rounded text-asu-maroon focus:ring-asu-maroon"
              />
              <span className="text-sm font-medium text-gray-700">
                {t('dialogs.saveAsTemplate')}
              </span>
            </label>
            {saveAsTemplate && (
              <div className="space-y-1 pl-6">
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder={subject || 'Template name…'}
                  className="input-field"
                />
                <p className="text-xs text-gray-400">
                  Saves the email text to <code className="bg-gray-100 px-1 rounded">EmailKB/templates/</code> — editable in Obsidian
                </p>
              </div>
            )}
          </div>

          {/* Thread: new or append */}
          {contacts.length === 1 && existingThreads.length > 0 && (
            <div>
              <label className="section-label">{t('dialogs.thread')}</label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="threadMode"
                    checked={threadMode === 'new'}
                    onChange={() => setThreadMode('new')}
                    className="text-asu-maroon focus:ring-asu-maroon"
                  />
                  {t('dialogs.newThread')}
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="threadMode"
                    checked={threadMode === 'append'}
                    onChange={() => setThreadMode('append')}
                    className="text-asu-maroon focus:ring-asu-maroon"
                  />
                  {t('dialogs.appendThread')}
                </label>
                {threadMode === 'append' && (
                  <div className="mt-1 space-y-1.5">
                    <input
                      type="text"
                      value={threadSearch}
                      onChange={(e) => setThreadSearch(e.target.value)}
                      placeholder={t('dialogs.searchThreads')}
                      className="input-field text-xs"
                    />
                    <select
                      value={selectedThread}
                      onChange={(e) => setSelectedThread(e.target.value)}
                      className="input-field"
                    >
                      {existingThreads.map((thr) => (
                        <option key={thr.fileName} value={thr.fileName}>
                          {thr.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400">
                      Showing {existingThreads.length} most recent thread{existingThreads.length !== 1 ? 's' : ''}
                      {threadSearch ? ' matching search' : ''}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

            {/* No contacts warning */}
          {contacts.length === 0 && (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              {t('dialogs.noContact')}
            </p>
          )}

          {/* Error */}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="btn-secondary" disabled={isSaving}>
            {t('dialogs.cancel')}
          </button>
          <button onClick={handleSave} className="btn-primary" disabled={isSaving || contacts.length === 0}>
            {isSaving ? t('dialogs.saving') : t('output.saveArchive')}
          </button>
        </div>
    </DraggableDialog>
  )
}
