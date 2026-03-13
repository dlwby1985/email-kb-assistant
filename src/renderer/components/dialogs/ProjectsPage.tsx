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
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-gray-200 shrink-0">
        <h2 className="text-base font-semibold text-gray-900">Projects</h2>
        <p className="text-xs text-gray-400 mt-0.5">Contacts grouped by tag — click a contact to select it.</p>
      </div>

      {/* Search */}
      <div className="px-5 py-2.5 border-b border-gray-100 shrink-0">
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
        <div className="w-56 border-r border-gray-200 overflow-y-auto shrink-0">
          {filteredTags.length === 0 ? (
            <p className="text-xs text-gray-400 p-4 text-center">No tags found</p>
          ) : (
            filteredTags.map(([tag, cs]) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`
                  w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors
                  ${selectedTag === tag ? 'bg-asu-maroon/5 border-l-2 border-l-asu-maroon' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-medium truncate ${
                      tag === '(untagged)' ? 'text-gray-400 italic' : 'text-gray-800'
                    }`}
                  >
                    {tag}
                  </span>
                  <span className="text-xs text-gray-400 ml-2 shrink-0">{cs.length}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Right: contacts for selected tag */}
        <div className="flex-1 overflow-y-auto">
          {!selectedTag ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              {contacts.length === 0
                ? 'No contacts yet.'
                : `Select a tag to see its ${contacts.length} contact${contacts.length !== 1 ? 's' : ''}.`}
            </div>
          ) : selectedContacts.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              No contacts with this tag.
            </div>
          ) : (
            <div className="p-4">
              <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide font-medium">
                {selectedTag} — {selectedContacts.length} contact{selectedContacts.length !== 1 ? 's' : ''}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {selectedContacts.map((contact) => (
                  <button
                    key={contact.slug}
                    onClick={() => onSelectContact(contact)}
                    className="text-left p-3 rounded-lg border border-gray-200 hover:border-asu-maroon hover:bg-asu-maroon/5 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                    {contact.role && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{contact.role}</p>
                    )}
                    {contact.email && (
                      <p className="text-xs text-gray-400 truncate">{contact.email}</p>
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
