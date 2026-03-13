import React, { useState, memo } from 'react'
import type { Contact, FetchedEmail } from '../../types'

interface ContactInfoPanelProps {
  contact: Contact | null
  onViewHistory?: () => void
  onEdit?: () => void
  onImportEmail?: (email: FetchedEmail) => void
}

function ContactInfoPanel({ contact, onViewHistory, onEdit, onImportEmail }: ContactInfoPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importEmails, setImportEmails] = useState<FetchedEmail[] | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  if (!contact) return null

  const relationshipLabels: Record<string, string> = {
    'colleague-close': 'Close Colleague',
    'colleague-formal': 'Formal Colleague',
    'student': 'Student',
    'admin': 'Admin Staff',
  }

  const lastContactStr = contact.last_contact
    ? new Date(contact.last_contact).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'

  const handleFetchEmails = async () => {
    if (!contact.email) return
    setIsImporting(true)
    setImportError(null)
    setImportEmails(null)
    try {
      const result = await window.electronAPI.imapFetchByContact(contact.email, 5)
      setImportEmails(result.emails)
    } catch (err: any) {
      setImportError(err.message || 'Failed to fetch emails')
    } finally {
      setIsImporting(false)
    }
  }

  const handleSelectEmail = async (em: FetchedEmail) => {
    if (!onImportEmail) return
    try {
      // Fetch full body if not already present
      let emailWithBody = em
      if (!em.textBody) {
        const body = await window.electronAPI.imapFetchBody(em.uid)
        emailWithBody = { ...em, textBody: body.textBody, htmlBody: body.htmlBody }
      }
      onImportEmail(emailWithBody)
      setImportEmails(null)
    } catch (err: any) {
      setImportError(err.message || 'Failed to load email body')
    }
  }

  return (
    <div className="border-t border-gray-200">
      {/* Collapsed header: click to expand/collapse, history button always visible */}
      <div className="flex items-center">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 px-4 py-2 flex items-center gap-2 text-xs text-gray-500 hover:bg-gray-50 transition-colors text-left"
        >
          <span className="font-medium text-gray-700">{contact.name}</span>
          <span className="text-gray-400">{relationshipLabels[contact.relationship] || contact.relationship}</span>
          <span className="ml-auto">{isExpanded ? '▲' : '▼'}</span>
        </button>
        {onImportEmail && contact.email && (
          <button
            onClick={handleFetchEmails}
            disabled={isImporting}
            className="px-3 py-2 text-xs text-gray-500 hover:bg-gray-100 border-l border-gray-200 transition-colors shrink-0 disabled:opacity-40"
            title="Import email from this contact"
          >
            {isImporting ? '...' : '📨 Import'}
          </button>
        )}
        {onEdit && (
          <button
            onClick={onEdit}
            className="px-3 py-2 text-xs text-gray-500 hover:bg-gray-100 border-l border-gray-200 transition-colors shrink-0"
            title="Edit contact"
          >
            Edit
          </button>
        )}
        {onViewHistory && (
          <button
            onClick={onViewHistory}
            className="px-3 py-2 text-xs text-asu-maroon hover:bg-asu-maroon/5 border-l border-gray-200 transition-colors font-medium shrink-0"
            title="View communication history"
          >
            History →
          </button>
        )}
      </div>

      {/* Import email picker */}
      {(importEmails !== null || importError) && (
        <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-2">
          {importError && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-red-500">{importError}</p>
              <button onClick={() => setImportError(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
            </div>
          )}
          {importEmails !== null && importEmails.length === 0 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 italic">No emails found from this contact.</p>
              <button onClick={() => setImportEmails(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
            </div>
          )}
          {importEmails !== null && importEmails.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-gray-600">Select email to import as context:</span>
                <button onClick={() => setImportEmails(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {importEmails.map((em) => (
                  <button
                    key={em.uid}
                    onClick={() => handleSelectEmail(em)}
                    className="w-full text-left border border-gray-200 rounded px-2 py-1.5 bg-white hover:border-asu-maroon/50 hover:bg-asu-maroon/5 transition-colors text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-gray-800 truncate flex-1">{em.subject || '(no subject)'}</span>
                      <span className="text-gray-400 shrink-0">
                        {em.date ? new Date(em.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                      </span>
                    </div>
                    <span className="text-gray-400 truncate block">From: {em.from || em.fromEmail}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {isExpanded && (
        <div className="px-4 pb-3 space-y-2 bg-gray-50/50">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs pt-2">
            {contact.role && (
              <>
                <span className="text-gray-400">Role</span>
                <span className="text-gray-700">{contact.role}</span>
              </>
            )}
            {contact.email && (
              <>
                <span className="text-gray-400">Email</span>
                <span className="text-gray-700">{contact.email}</span>
              </>
            )}
            <span className="text-gray-400">Language</span>
            <span className="text-gray-700 capitalize">{contact.language}</span>
            <span className="text-gray-400">Last Contact</span>
            <span className="text-gray-700">{lastContactStr}</span>
          </div>

          {contact.tags && contact.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {contact.tags.map((tag) => (
                <span key={tag} className="tag-chip">{tag}</span>
              ))}
            </div>
          )}

          {contact.notes && (
            <div>
              <span className="text-gray-400 text-xs block mb-0.5">Communication Notes</span>
              <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{contact.notes}</p>
            </div>
          )}

          {contact.autoSummary && (
            <div>
              <span className="text-gray-400 text-xs block mb-0.5">Auto-Summary</span>
              <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{contact.autoSummary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default memo(ContactInfoPanel)
