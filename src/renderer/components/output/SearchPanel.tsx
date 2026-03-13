import React, { useState, useEffect, useRef, useCallback } from 'react'
import type { SearchResult, Contact } from '../../types'

type SearchMode = 'keyword' | 'semantic'

interface SearchPanelProps {
  contacts: Contact[]
  onSelectContact: (contact: Contact) => void
  onOpenHistory: () => void
  onNavigate?: () => void
}

export default function SearchPanel({
  contacts,
  onSelectContact,
  onOpenHistory,
  onNavigate,
}: SearchPanelProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Array<SearchResult & { score?: number }>>([])
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<SearchMode>('keyword')
  const [embeddedCount, setEmbeddedCount] = useState(0)
  const [indexing, setIndexing] = useState(false)
  const [semanticError, setSemanticError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input and load embedding count on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
    window.electronAPI.searchEmbedCount()
      .then(({ count }) => setEmbeddedCount(count))
      .catch(() => {})
  }, [])

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setSemanticError(null)
      return
    }
    const timer = setTimeout(() => {
      setLoading(true)
      setSemanticError(null)
      if (mode === 'keyword') {
        window.electronAPI
          .searchQuery(query, { limit: 15 })
          .then((res) => setResults(res))
          .catch(() => setResults([]))
          .finally(() => setLoading(false))
      } else {
        window.electronAPI
          .searchSemantic(query, { limit: 15 })
          .then(({ results: res, embeddedCount: ec }) => {
            setResults(res)
            setEmbeddedCount(ec)
          })
          .catch((err: Error) => {
            setSemanticError(err.message || 'Semantic search failed')
            setResults([])
          })
          .finally(() => setLoading(false))
      }
    }, mode === 'semantic' ? 600 : 300)
    return () => clearTimeout(timer)
  }, [query, mode])

  const handleResult = useCallback(
    (result: SearchResult) => {
      const contact = contacts.find((c) => c.slug === result.contactSlug)
      if (contact) {
        onSelectContact(contact)
        onOpenHistory()
      }
      onNavigate?.()
    },
    [contacts, onSelectContact, onOpenHistory, onNavigate]
  )

  const handleIndexAll = useCallback(async () => {
    setIndexing(true)
    try {
      await window.electronAPI.searchEmbedAll()
      setTimeout(() => {
        window.electronAPI.searchEmbedCount()
          .then(({ count }) => setEmbeddedCount(count))
          .catch(() => {})
      }, 2000)
    } catch {
      // ignore
    } finally {
      setIndexing(false)
    }
  }, [])

  const channelIcon = (channel: string) =>
    channel === 'email' ? '✉️' : channel === 'conversation' ? '💬' : '📄'

  const formatDate = (iso: string) => {
    if (!iso) return ''
    try {
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
    } catch {
      return ''
    }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-gray-200 shrink-0">
        <h2 className="text-base font-semibold text-gray-900">Search</h2>
        <p className="text-xs text-gray-400 mt-0.5">Search all saved threads and conversations</p>
      </div>

      {/* Search box */}
      <div className="border-b border-gray-100 shrink-0">
        {/* Mode toggle */}
        <div className="flex items-center gap-1 px-5 pt-3 pb-1">
          <button
            onClick={() => { setMode('keyword'); setResults([]); setSemanticError(null) }}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
              mode === 'keyword' ? 'bg-asu-maroon text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Keyword
          </button>
          <button
            onClick={() => { setMode('semantic'); setResults([]); setSemanticError(null) }}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
              mode === 'semantic' ? 'bg-asu-maroon text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Semantic ✨
          </button>
          {mode === 'semantic' && (
            <span className="ml-auto text-xs text-gray-400">
              {embeddedCount} thread{embeddedCount !== 1 ? 's' : ''} indexed
              {embeddedCount === 0 && (
                <button
                  onClick={handleIndexAll}
                  disabled={indexing}
                  className="ml-2 text-asu-maroon hover:underline disabled:opacity-50"
                >
                  {indexing ? 'Indexing…' : 'Index now'}
                </button>
              )}
            </span>
          )}
        </div>

        {/* Input */}
        <div className="flex items-center gap-3 px-5 py-3">
          <span className="text-xl text-gray-400 shrink-0">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              mode === 'keyword'
                ? 'Search all emails and threads…'
                : 'Describe what you\'re looking for…'
            }
            className="flex-1 text-base outline-none text-gray-800 placeholder-gray-400 bg-transparent"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-asu-maroon rounded-full animate-spin shrink-0" />
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {/* Empty prompt */}
        {!query.trim() && (
          <div className="py-12 text-center">
            {mode === 'keyword' ? (
              <>
                <p className="text-sm text-gray-400">Start typing to search all saved threads</p>
                <p className="text-xs text-gray-300 mt-1">Searches subject, content, contacts, and tags</p>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-400">Describe the conversation you're looking for</p>
                <p className="text-xs text-gray-300 mt-1">
                  {embeddedCount > 0
                    ? `Searches ${embeddedCount} embedded thread${embeddedCount !== 1 ? 's' : ''} by meaning`
                    : 'Index your threads first to enable semantic search'}
                </p>
                {embeddedCount === 0 && (
                  <button
                    onClick={handleIndexAll}
                    disabled={indexing}
                    className="mt-3 btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
                  >
                    {indexing ? 'Indexing in background…' : 'Index All Threads'}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Error state */}
        {semanticError && (
          <div className="py-6 px-5 text-center">
            <p className="text-sm text-red-500 mb-1">Semantic search failed</p>
            <p className="text-xs text-gray-400">{semanticError}</p>
            <p className="text-xs text-gray-400 mt-1">Check that DASHSCOPE_API_KEY is set in your .env</p>
          </div>
        )}

        {/* Empty results */}
        {query.trim() && !loading && !semanticError && results.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-400">No results for "{query}"</p>
            {mode === 'semantic' && embeddedCount === 0 && (
              <p className="text-xs text-gray-300 mt-1">Index your threads first (click "Index now" above)</p>
            )}
          </div>
        )}

        {/* Result rows */}
        {results.map((result, i) => {
          const contact = contacts.find((c) => c.slug === result.contactSlug)
          return (
            <button
              key={result.filePath}
              onClick={() => handleResult(result)}
              className={`w-full text-left px-5 py-3 hover:bg-asu-maroon/5 transition-colors ${
                i < results.length - 1 ? 'border-b border-gray-50' : ''
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm shrink-0">{channelIcon(result.channel)}</span>
                <span className="text-xs font-semibold text-asu-maroon truncate">
                  {contact?.name || result.contactSlug}
                </span>
                <span className="text-xs text-gray-300">·</span>
                <span className="text-xs text-gray-400 capitalize">{result.channel}</span>
                {result.tags?.length > 0 && (
                  <>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs text-gray-400">{result.tags.slice(0, 2).join(', ')}</span>
                  </>
                )}
                <span className="ml-auto text-xs text-gray-300 shrink-0">
                  {mode === 'semantic' && result.score !== undefined
                    ? `${Math.round(result.score * 100)}% match`
                    : formatDate(result.createdAt)}
                </span>
              </div>
              <div className="text-sm font-medium text-gray-700 truncate">
                {result.subject || 'Thread'}
              </div>
              {result.snippet && mode === 'keyword' && (
                <div
                  className="text-xs text-gray-500 mt-0.5 line-clamp-2 [&_mark]:bg-asu-gold/50 [&_mark]:text-gray-800 [&_mark]:rounded-sm [&_mark]:px-0.5"
                  dangerouslySetInnerHTML={{ __html: result.snippet }}
                />
              )}
              {result.snippet && mode === 'semantic' && (
                <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{result.snippet}</div>
              )}
            </button>
          )
        })}

        {/* Result count footer */}
        {results.length > 0 && (
          <div className="px-5 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 text-right">
            {results.length} result{results.length !== 1 ? 's' : ''} — click to open contact history
          </div>
        )}
      </div>
    </div>
  )
}
