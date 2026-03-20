import React, { useState, useMemo } from 'react'
import type { Contact } from '../../types'

interface ProjectsPageProps {
  contacts: Contact[]
  onSelectContact: (contact: Contact) => void
}

export default function ProjectsPage({ contacts, onSelectContact }: ProjectsPageProps) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  // Build tag → contacts map
  const tagMap = useMemo(() => {
    const map = new Map<string, Contact[]>()
    for (const contact of contacts) {
      const tags = contact.tags?.length ? contact.tags : ['(untagged)']
      for (const tag of tags) {
        if (!map.has(tag)) map.set(tag, [])
        map.get(tag)!.push(contact)
      }
    }
    return new Map(
      [...map.entries()].sort(([a], [b]) => {
        if (a === '(untagged)') return 1
        if (b === '(untagged)') return -1
        return a.localeCompare(b)
      })
    )
  }, [contacts])

  const filteredTags = useMemo(() => {
    const entries = [...tagMap.entries()]
    if (!filter.trim()) return entries
    const q = filter.toLowerCase()
    return entries.filter(
      ([tag, cs]) =>
        tag.toLowerCase().includes(q) ||
        cs.some((c) => c.name.toLowerCase().includes(q))
    )
  }, [tagMap, filter])

  const selectedContacts = selectedTag ? (tagMap.get(selectedTag) ?? []) : []

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-white/10 shrink-0">
        <h2 className="page-title">Projects</h2>
        <p className="text-xs text-white/40 mt-0.5">Contacts grouped by tag — click a contact to select it.</p>
      </div>

      {/* Search */}
      <div className="px-5 py-2.5 border-b border-white/10 shrink-0">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter tags or contacts..."
          className="input-field text-sm"
          autoFocus
        />
      </div>

      {/* Two-pane */}
      <div className="flex flex-1 min-h-0">
        {/* Left: tag list */}
        <div className="w-56 border-r border-white/10 overflow-y-auto shrink-0">
          {filteredTags.length === 0 ? (
            <p className="text-xs text-white/40 p-4 text-center">No tags found</p>
          ) : (
            filteredTags.map(([tag, cs]) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`
                  w-full text-left px-4 py-3 border-b border-white/10 hover:bg-white/5 transition-colors
                  ${selectedTag === tag ? 'bg-asu-gold/10 border-l-2 border-l-asu-gold' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-medium truncate ${
                      tag === '(untagged)' ? 'text-white/40 italic' : 'text-white/80'
                    }`}
                  >
                    {tag}
                  </span>
                  <span className="text-xs text-white/40 ml-2 shrink-0">{cs.length}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Right: contacts for selected tag */}
        <div className="flex-1 overflow-y-auto">
          {!selectedTag ? (
            <div className="flex items-center justify-center h-full text-white/40 text-sm">
              {contacts.length === 0
                ? 'No contacts yet.'
                : `Select a tag to see its ${contacts.length} contact${contacts.length !== 1 ? 's' : ''}.`}
            </div>
          ) : selectedContacts.length === 0 ? (
            <div className="flex items-center justify-center h-full text-white/40 text-sm">
              No contacts with this tag.
            </div>
          ) : (
            <div className="p-4">
              <p className="text-xs text-asu-gold mb-3 uppercase tracking-wide font-medium">
                {selectedTag} — {selectedContacts.length} contact{selectedContacts.length !== 1 ? 's' : ''}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {selectedContacts.map((contact) => (
                  <button
                    key={contact.slug}
                    onClick={() => onSelectContact(contact)}
                    className="text-left p-3 rounded-lg glass-card-inner hover:border-asu-gold transition-colors"
                  >
                    <p className="text-sm font-medium text-white">{contact.name}</p>
                    {contact.role && (
                      <p className="text-xs text-white/50 mt-0.5 truncate">{contact.role}</p>
                    )}
                    {contact.email && (
                      <p className="text-xs text-white/40 truncate">{contact.email}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(contact.tags ?? [])
                        .filter((t) => t !== selectedTag)
                        .slice(0, 3)
                        .map((t) => (
                          <span key={t} className="tag-chip text-xs">{t}</span>
                        ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
