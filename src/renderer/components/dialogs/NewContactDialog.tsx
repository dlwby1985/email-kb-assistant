import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Channel, Relationship } from '../../types'
import DraggableDialog from './DraggableDialog'

interface NewContactDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: NewContactData) => Promise<void>
}

export interface NewContactData {
  name: string
  email: string
  role: string
  relationship: Relationship
  language: string
  channels: Channel[]
  tags: string[]
  slug?: string
}

export default function NewContactDialog({ isOpen, onClose, onSave }: NewContactDialogProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [relationship, setRelationship] = useState<Relationship>('colleague-formal')
  const [language, setLanguage] = useState('english')
  const [channels, setChannels] = useState<Channel[]>(['email'])
  const [tags, setTags] = useState('')
  const [slug, setSlug] = useState('')
  const [showSlug, setShowSlug] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
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
      await onSave({
        name: name.trim(),
        email: email.trim(),
        role: role.trim(),
        relationship,
        language,
        channels,
        tags: tags
          .split(',')
          .map((tg) => tg.trim())
          .filter(Boolean),
        slug: slug.trim() || undefined,
      })
      // Reset form
      setName('')
      setEmail('')
      setRole('')
      setRelationship('colleague-formal')
      setLanguage('english')
      setChannels(['email'])
      setTags('')
      setSlug('')
      setShowSlug(false)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to create contact')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <DraggableDialog
      isOpen={isOpen}
      onClose={onClose}
      title={t('dialogs.newContact')}
      subtitle="Create a contact profile for context-aware drafting"
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
              placeholder="Dr. Jane Smith"
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
              placeholder="jane.smith@university.edu"
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
            <div className="flex gap-2 flex-wrap">
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

          {/* Custom slug toggle (for Chinese names) */}
          <div>
            <button
              onClick={() => setShowSlug(!showSlug)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              {showSlug ? '▼' : '▶'} {t('dialogs.customFolderName')}
            </button>
            {showSlug && (
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g., kai-sun"
                className="input-field mt-1.5"
              />
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="btn-secondary" disabled={isSaving}>
            {t('dialogs.cancel')}
          </button>
          <button
            onClick={handleSave}
            className="btn-primary"
            disabled={isSaving || !name.trim()}
          >
            {isSaving ? t('dialogs.creating') : t('dialogs.createContact')}
          </button>
        </div>
    </DraggableDialog>
  )
}
