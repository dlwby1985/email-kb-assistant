import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Contact } from '../../types'
import ContactCard from '../contacts/ContactCard'

interface ContactsPageProps {
  contacts: Contact[]
  onNewContact: () => void
  onEditContact: (c: Contact) => void
  onSelectContact: (c: Contact) => void
}

export default function ContactsPage({ contacts, onNewContact, onEditContact, onSelectContact }: ContactsPageProps) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    if (!filter.trim()) return contacts
    const q = filter.toLowerCase()
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.role || '').toLowerCase().includes(q) ||
        (c.tags || []).some((tag) => tag.toLowerCase().includes(q))
    )
  }, [contacts, filter])

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{t('contacts.title')}</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {contacts.length} {t('contacts.title').toLowerCase()}{contacts.length !== 1 ? '' : ''}
          </p>
        </div>
        <button onClick={onNewContact} className="btn-primary text-sm px-3 py-1.5">
          + {t('contacts.newContact')}
        </button>
      </div>

      {/* Search */}
      <div className="px-5 py-2.5 border-b border-gray-100 shrink-0">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t('contacts.filterPlaceholder')}
          className="input-field text-sm"
          autoFocus
        />
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            {contacts.length === 0 ? (
              <>
                <p className="text-sm font-medium">{t('contacts.noContacts')}</p>
                <p className="text-xs mt-1">{t('contacts.noContactsHint')}</p>
              </>
            ) : (
              <p className="text-sm">{t('contacts.noContactsMatch')} &quot;{filter}&quot;</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((contact) => (
              <div key={contact.slug} className="relative group">
                <ContactCard contact={contact} />
                {/* Action overlay */}
                <div className="absolute inset-0 rounded-lg bg-transparent group-hover:bg-black/5 transition-colors" />
                <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEditContact(contact)}
                    className="text-xs text-gray-500 hover:text-gray-800 bg-white border border-gray-200 rounded px-2 py-1 shadow-sm"
                  >
                    {t('contacts.edit')}
                  </button>
                  <button
                    onClick={() => onSelectContact(contact)}
                    className="text-xs text-white bg-asu-maroon hover:bg-asu-maroon/90 rounded px-2 py-1 shadow-sm font-medium"
                  >
                    {t('contacts.compose')} →
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
