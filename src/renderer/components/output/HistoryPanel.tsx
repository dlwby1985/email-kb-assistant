import React, { useState, useEffect, useCallback, memo } from 'react'
import type { Contact, ThreadMeta } from '../../types'

interface HistoryPanelProps {
  isOpen: boolean
  contact: Contact | null
  onClose: () => void
  onLoadToWorkspace?: (data: { background: string; coreContent: string; subject: string }) => void
}

const channelConfig: Record<string, { dot: string; label: string }> = {
  email:        { dot: 'bg-blue-500',   label: 'Email' },
  conversation: { dot: 'bg-orange-500', label: 'Conversation' },
}

const directionConfig: Record<string, { arrow: string; label: string; color: string }> = {
  'outgoing':      { arrow: '↗', label: 'Sent',              color: 'text-green-600' },
  'incoming-reply':{ arrow: '↙', label: 'Received & Replied', color: 'text-blue-600' },
  'incoming-only': { arrow: '↙', label: 'Received',           color: 'text-gray-500' },
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
}

function formatFullDate(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/** Extract named markdown section content (text between "## Name" and next "##") */
function extractSection(content: string, name: string): string {
  const match = content.match(new RegExp(`## ${name}\\n(?:_\\(.*?\\)_\\n?)?([\\s\\S]*?)(?=\\n## |$)`))
  return match?.[1]?.trim() ?? ''
}

// ── Thread Detail View ──────────────────────────────────────────────────────

interface ThreadDetailProps {
  thread: ThreadMeta
  contactSlug: string
  onBack: () => void
  onDeleted: (filePath: string) => void
  onLoadToWorkspace?: (data: { background: string; coreContent: string; subject: string }) => void
}

function ThreadDetail({ thread, contactSlug, onBack, onDeleted, onLoadToWorkspace }: ThreadDetailProps) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!thread.filePath) {
      setContent(null)
      setLoading(false)
      return
    }
    setLoading(true)
    window.electronAPI.threadsGet(thread.filePath)
      .then((result) => setContent(result.content))
      .catch(() => setContent('(Failed to load thread content)'))
      .finally(() => setLoading(false))
  }, [thread.filePath])

  const handleDelete = useCallback(async () => {
    if (!thread.filePath) return
    setDeleting(true)
    try {
      const result = await window.electronAPI.threadsDelete(thread.filePath, contactSlug)
      if (result.success) {
        onDeleted(thread.filePath)
      } else {
        alert(`Delete failed: ${result.error}`)
      }
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`)
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }, [thread.filePath, contactSlug, onDeleted])

  const handleLoad = useCallback(() => {
    if (!content || !onLoadToWorkspace) return
    const background = extractSection(content, 'Background')
    const coreContent = extractSection(content, 'Core Input')
    onLoadToWorkspace({ background, coreContent, subject: thread.subject || '' })
  }, [content, onLoadToWorkspace, thread.subject])

  const dir = directionConfig[thread.direction] || { arrow: '→', label: thread.direction, color: 'text-gray-500' }
  const ch = channelConfig[thread.channel] || { dot: 'bg-gray-400', label: thread.channel }

  return (
    <div className="flex flex-col h-full">
      {/* Back bar */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 border-b border-gray-200 shrink-0"
      >
        <span>←</span>
        <span>Back to history</span>
      </button>

      {/* Thread metadata + actions */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`w-2 h-2 rounded-full ${ch.dot} shrink-0`} />
          <span className="text-xs text-gray-500">{ch.label}</span>
          <span className={`text-xs font-medium ${dir.color} ml-1`}>{dir.arrow} {dir.label}</span>

          {/* Action buttons */}
          <div className="ml-auto flex items-center gap-3 shrink-0">
            {onLoadToWorkspace && content && !loading && (
              <button
                onClick={handleLoad}
                className="text-xs text-asu-maroon hover:underline font-medium"
                title="Load background and core content into workspace for revision"
              >
                ↩ Load to workspace
              </button>
            )}
            {confirmDelete ? (
              <>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs text-red-600 font-semibold hover:text-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Deleting…' : 'Confirm delete'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                title="Delete this thread"
              >
                Delete
              </button>
            )}
          </div>
        </div>
        {thread.subject && (
          <p className="text-sm font-semibold text-gray-900 mb-0.5">{thread.subject}</p>
        )}
        <p className="text-xs text-gray-400">{formatFullDate(thread.created_at)}</p>
        {thread.tags && thread.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {thread.tags.map((tag) => (
              <span key={tag} className="tag-chip">{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Thread content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-asu-maroon/20 border-t-asu-maroon rounded-full animate-spin" />
          </div>
        ) : content ? (
          <div className="prose prose-sm max-w-none">
            {content.split('\n').map((line, i) => {
              if (/^## /.test(line)) {
                return <h3 key={i} className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-1 first:mt-0">{line.replace(/^## /, '')}</h3>
              }
              if (/^_\(.*\)_$/.test(line.trim())) {
                return <p key={i} className="text-xs text-gray-400 italic mb-1">{line.replace(/^_\(/, '').replace(/\)_$/, '')}</p>
              }
              if (line.trim() === '') {
                return <div key={i} className="h-2" />
              }
              return <p key={i} className="text-sm text-gray-700 leading-relaxed">{line}</p>
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No content available</p>
        )}
      </div>
    </div>
  )
}

// ── Main History Panel ──────────────────────────────────────────────────────

function HistoryPanel({ isOpen, contact, onClose, onLoadToWorkspace }: HistoryPanelProps) {
  const [threads, setThreads] = useState<ThreadMeta[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedThread, setSelectedThread] = useState<ThreadMeta | null>(null)

  useEffect(() => {
    if (isOpen && contact) {
      setLoading(true)
      setSelectedThread(null)
      window.electronAPI.threadsList(contact.slug)
        .then(setThreads)
        .catch(() => setThreads([]))
        .finally(() => setLoading(false))
    }
  }, [isOpen, contact])

  useEffect(() => {
    if (!isOpen) {
      setSelectedThread(null)
      setThreads([])
    }
  }, [isOpen])

  const handleDeleted = useCallback((filePath: string) => {
    setThreads((prev) => prev.filter((t) => t.filePath !== filePath))
    setSelectedThread(null)
  }, [])

  const handleLoadToWorkspace = useCallback((data: { background: string; coreContent: string; subject: string }) => {
    onLoadToWorkspace?.(data)
    onClose()
  }, [onLoadToWorkspace, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Slide-out panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-[420px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              {contact?.name || 'Contact'} — History
            </h2>
            {!loading && (
              <p className="text-xs text-gray-400 mt-0.5">
                {threads.length} thread{threads.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
            aria-label="Close history panel"
          >
            ×
          </button>
        </div>

        {/* Body: either detail view or thread list */}
        {selectedThread ? (
          <ThreadDetail
            thread={selectedThread}
            contactSlug={contact?.slug ?? ''}
            onBack={() => setSelectedThread(null)}
            onDeleted={handleDeleted}
            onLoadToWorkspace={onLoadToWorkspace ? handleLoadToWorkspace : undefined}
          />
        ) : (
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-7 h-7 border-2 border-asu-maroon/20 border-t-asu-maroon rounded-full animate-spin" />
              </div>
            ) : threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <p className="text-2xl mb-2">📭</p>
                <p className="text-sm font-medium text-gray-500">No threads yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Use Save &amp; Archive to save conversations with this contact
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {threads.map((thread) => {
                  const dir = directionConfig[thread.direction] || { arrow: '→', label: thread.direction, color: 'text-gray-500' }
                  const ch = channelConfig[thread.channel] || { dot: 'bg-gray-400', label: thread.channel }

                  return (
                    <li key={thread.fileName || thread.created_at}>
                      <button
                        onClick={() => setSelectedThread(thread)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-2 h-2 rounded-full ${ch.dot} shrink-0`} />
                          <span className="text-xs text-gray-400">{ch.label}</span>
                          <span className={`text-xs ${dir.color}`}>{dir.arrow} {dir.label}</span>
                          <span className="ml-auto text-xs text-gray-400 shrink-0">
                            {formatDate(thread.created_at)}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 group-hover:text-asu-maroon transition-colors truncate">
                          {thread.subject || thread.fileName?.replace(/\.md$/, '') || '(Untitled)'}
                        </p>
                        {thread.tags && thread.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {thread.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="tag-chip">{tag}</span>
                            ))}
                            {thread.tags.length > 3 && (
                              <span className="text-xs text-gray-400">+{thread.tags.length - 3}</span>
                            )}
                          </div>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </>
  )
}

export default memo(HistoryPanel)
