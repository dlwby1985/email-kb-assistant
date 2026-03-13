import React from 'react'
import type { Contact } from '../../types'

interface ContactCardProps {
  contact: Contact
  compact?: boolean
}

const relationshipLabels: Record<string, string> = {
  'colleague-close': 'Close Colleague',
  'colleague-formal': 'Formal Colleague',
  'student': 'Student',
  'admin': 'Admin Staff',
}

export default function ContactCard({ contact, compact = false }: ContactCardProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <div className="w-7 h-7 rounded-full bg-asu-maroon/10 text-asu-maroon flex items-center justify-center text-xs font-bold shrink-0">
          {contact.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-gray-900 truncate">{contact.name}</p>
          {contact.role && (
            <p className="text-xs text-gray-400 truncate">{contact.role}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-asu-maroon/10 text-asu-maroon flex items-center justify-center font-bold shrink-0">
          {contact.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900">{contact.name}</h3>
          {contact.role && (
            <p className="text-sm text-gray-500">{contact.role}</p>
          )}
          {contact.email && (
            <p className="text-xs text-gray-400 mt-0.5">{contact.email}</p>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span>{relationshipLabels[contact.relationship] || contact.relationship}</span>
            <span>·</span>
            <span className="capitalize">{contact.language}</span>
            {contact.last_contact && (
              <>
                <span>·</span>
                <span>Last: {contact.last_contact}</span>
              </>
            )}
          </div>

          {contact.tags && contact.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-2">
              {contact.tags.map((tag) => (
                <span key={tag} className="tag-chip">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
