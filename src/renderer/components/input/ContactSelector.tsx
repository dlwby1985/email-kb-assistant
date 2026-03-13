import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { Contact, ContactMode } from '../../types'

interface ContactSelectorProps {
  contacts: Contact[]
  selectedContacts: Contact[]
  onSelect: (contacts: Contact[]) => void
  onNewContact: () => void
  contactMode: ContactMode
}

export default function ContactSelector({
  contacts,
  selectedContacts,
  onSelect,
  onNewContact,
  contactMode,
}: ContactSelectorProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filter contacts based on query
  const filtered = query.trim()
    ? contacts.filter(
        (c) =>
          !selectedContacts.some((s) => s.slug === c.slug) &&
          (c.name.toLowerCase().includes(query.toLowerCase()) ||
            c.email.toLowerCase().includes(query.toLowerCase()) ||
            c.tags?.some((t) => t.toLowerCase().includes(query.toLowerCase())))
      )
    : contacts.filter((c) => !selectedContacts.some((s) => s.slug === c.slug))

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addContact = useCallback(
    (contact: Contact) => {
      onSelect([...selectedContacts, contact])
      setQuery('')
      setIsOpen(false)
      setHighlightIdx(0)
    },
    [selectedContacts, onSelect]
  )

  const removeContact = useCallback(
    (slug: string) => {
      onSelect(selectedContacts.filter((c) => c.slug !== slug))
    },
    [selectedContacts, onSelect]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[highlightIdx]) {
      e.preventDefault()
      addContact(filtered[highlightIdx])
    } else if (e.key === 'Backspace' && query === '' && selectedContacts.length > 0) {
      removeContact(selectedContacts[selectedContacts.length - 1].slug)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const { t } = useTranslation()
  const modeLabels: Record<ContactMode, { text: string; color: string }> = {
    quick:  { text: t('compose.quickMode'),  color: 'text-gray-400' },
    single: { text: t('compose.singleMode'), color: 'text-asu-green' },
    multi:  { text: t('compose.multiMode'),  color: 'text-asu-blue' },
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="section-label mb-0">{t('compose.contact')}</label>
        <span className={`text-xs font-medium ${modeLabels[contactMode].color}`}>
          {modeLabels[contactMode].text}
        </span>
      </div>

      <div className="relative" ref={dropdownRef}>
        {/* Selected tags + input */}
        <div
          className="input-field flex flex-wrap gap-1.5 items-center min-h-[38px] cursor-text"
          onClick={() => inputRef.current?.focus()}
        >
          {selectedContacts.map((c) => (
            <span
              key={c.slug}
              className="tag-chip"
            >
              {c.name}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeContact(c.slug)
                }}
                className="ml-0.5 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIsOpen(true)
              setHighlightIdx(0)
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={selectedContacts.length === 0 ? t('compose.contactPlaceholder') : ''}
            className="flex-1 min-w-[120px] outline-none bg-transparent text-sm border-none shadow-none"
            style={{ boxShadow: 'none' }}
          />
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-[200px] overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map((c, idx) => (
                <button
                  key={c.slug}
                  onClick={() => addContact(c)}
                  className={`
                    w-full text-left px-3 py-2 text-sm flex items-center justify-between
                    ${idx === highlightIdx ? 'bg-asu-maroon/5 text-asu-maroon' : 'hover:bg-gray-50'}
                  `}
                  onMouseEnter={() => setHighlightIdx(idx)}
                >
                  <div>
                    <span className="font-medium">{c.name}</span>
                    {c.role && (
                      <span className="text-gray-400 ml-2 text-xs">{c.role}</span>
                    )}
                  </div>
                  <span className="text-gray-400 text-xs">{c.email}</span>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-400">
                {t('compose.noContactsFound')}
              </div>
            )}
            <button
              onClick={onNewContact}
              className="w-full text-left px-3 py-2 text-sm text-asu-maroon font-medium border-t border-gray-100 hover:bg-asu-maroon/5"
            >
              {t('compose.newContact')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
