import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { Contact, Relationship, Channel } from '../../types'
import DraggableDialog from './DraggableDialog'

interface EditContactDialogProps {
  isOpen: boolean
  onClose: () => void
  contact: Contact | null
  onSave: (slug: string, data: Partial<Contact>) => Promise<void>
  onDelete: (slug: string) => Promise<void>
}

export default function EditContactDialog({
  isOpen,
  onClose,
  contact,
  onSave,
  onDelete,
}: EditContactDialogProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [relationship, setRelationship] = useState<Relationship>('colleague-formal')
  const [language, setLanguage] = useState('english')
  const [channels, setChannels] = useState<Channel[]>(['email'])
  const [tags, setTags] = useState('')
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const relationshipOptions: { value: Relationship; label: string }[] = [
    { value: 'colleague-close', label: t('contacts.relClose') },
    { value: 'colleague-formal', label: t('contacts.relFormal') },
    { value: 'student', label: t('contacts.relStudent') },
    { value: 'admin', label: t('contacts.relAdmin') },
  ]

  const channelOptions: { value: Channel; label: string }[] = [
    { value: 'email', label: t('compose.email') },
    { value: 'conversation', label: t('compose.conversation') },
  ]

  // Pre-fill fields whenever contact changes or dialog opens
  useEffect(() => {
    if (contact && isOpen) {
      setName(contact.name)
      setEmail(contact.email || '')
      setRole(contact.role || '')
      setRelationship((contact.relationship as Relationship) || 'colleague-formal')
      setLanguage(contact.language || 'english')
      setChannels(contact.channels?.length ? (contact.channels as Channel[]) : ['email'])
      setTags((contact.tags || []).join(', '))
      setNotes(contact.notes || '')
      setShowDeleteConfirm(false)
      setError(null)
    }
  }, [contact, isOpen])

  if (!contact) return null

  const handleChannelToggle = (ch: Channel) => {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    )
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      await onSave(contact.slug, {
        name: name.trim(),
        email: email.trim(),
        role: role.trim(),
        relationship,
        language,
        channels,
        tags: tags.split(',').map((tg) => tg.trim()).filter(Boolean),
        notes: notes.trim() || undefined,
      })
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to update contact')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)
    try {
      await onDelete(contact.slug)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to delete contact')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <DraggableDialog
      isOpen={isOpen}
      onClose={onClose}
      title={t('dialogs.editContact')}
      subtitle={<span className="font-mono text-gray-400">{contact?.slug}</span>}
    >
        {/* Form */}
        <div className="px-6 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className="section-label">
              {t('dialogs.name')} <span className="text-asu-maroon">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              autoFocus
            />
          </div>

          {/* Email */}
          <div>
            <label className="section-label">{t('dialogs.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Role */}
          <div>
            <label className="section-label">{t('dialogs.role')}</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Associate Professor, CS Department"
              className="input-field"
            />
          </div>

          {/* Relationship */}
          <div>
            <label className="section-label">{t('dialogs.relationship')}</label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value as Relationship)}
              className="input-field"
            >
              {relationshipOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Language */}
          <div>
            <label className="section-label">{t('dialogs.preferredLanguage')}</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="input-field"
            >
              <option value="english">{t('contacts.langEnglish')}</option>
              <option value="chinese">{t('contacts.langChinese')}</option>
              <option value="bilingual">{t('contacts.langBilingual')}</option>
            </select>
          </div>

          {/* Channels */}
          <div>
            <label className="section-label">{t('dialogs.channels')}</label>
            <div className="flex gap-4 flex-wrap">
              {channelOptions.map((ch) => (
                <label key={ch.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={channels.includes(ch.value)}
                    onChange={() => handleChannelToggle(ch.value)}
                    className="rounded border-gray-300 text-asu-maroon focus:ring-asu-maroon"
                  />
                  {ch.label}
                </label>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="section-label">
              {t('dialogs.tags')}
              <span className="font-normal text-gray-400 ml-1">{t('dialogs.tagsHint')}</span>
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="research, committee, NSF"
              className="input-field"
            />
          </div>

          {/* Communication Notes */}
          <div>
            <label className="section-label">{t('dialogs.notes')}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Communication preferences, preferred tone, key context…"
              className="input-field resize-none leading-relaxed"
            />
            <p className="text-xs text-gray-400 mt-0.5">
              Used by Claude to calibrate tone and greeting style
            </p>
          </div>

          {/* Error */}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center gap-3 shrink-0">
          {/* Delete section on the left */}
          <div className="mr-auto">
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-sm text-red-400 hover:text-red-600 transition-colors"
              >
                {t('dialogs.deleteContact')}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600 font-medium">{t('dialogs.deleteAllThreads')}</span>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  {isDeleting ? t('dialogs.deleting') : t('dialogs.yesDelete')}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  {t('dialogs.cancel')}
                </button>
              </div>
            )}
          </div>

          <button onClick={onClose} className="btn-secondary" disabled={isSaving}>
            {t('dialogs.cancel')}
          </button>
          <button
            onClick={handleSave}
            className="btn-primary"
            disabled={isSaving || !name.trim()}
          >
            {isSaving ? t('dialogs.saving') : t('dialogs.saveChanges')}
          </button>
        </div>
    </DraggableDialog>
  )
}
