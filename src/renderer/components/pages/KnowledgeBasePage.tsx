import React, { useState, useEffect, useCallback, useRef } from 'react'
import type { KBFileInfo } from '../../types'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(isoString: string): string {
  if (!isoString) return ''
  try {
    return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return isoString.slice(0, 10)
  }
}

export default function KnowledgeBasePage() {
  const [files, setFiles] = useState<KBFileInfo[]>([])
  const [stats, setStats] = useState<{ totalFiles: number; indexedCount: number; kbDir: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isIndexing, setIsIndexing] = useState(false)
  const [indexMsg, setIndexMsg] = useState<string | null>(null)

  // URL fetch state
  const [urlInput, setUrlInput] = useState('')
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle')
  const [fetchMessage, setFetchMessage] = useState('')

  // Per-file refetch state: filename -> status
  const [refetchStatus, setRefetchStatus] = useState<Record<string, 'idle' | 'fetching' | 'done' | 'error'>>({})

  // File upload drag-drop state
  const [isDragging, setIsDragging] = useState(false)
  const dragCounterRef = useRef(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [uploadMessage, setUploadMessage] = useState('')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [fileList, statsResult] = await Promise.all([
        window.electronAPI.kbList(),
        window.electronAPI.kbStats(),
      ])
      setFiles(fileList)
      setStats(statsResult)
    } catch (err) {
      console.error('Failed to load KB data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleReindex = async () => {
    setIsIndexing(true)
    setIndexMsg(null)
    try {
      const result = await window.electronAPI.kbIndex()
      setIndexMsg(result.success
        ? `Indexed ${result.indexed} document${result.indexed !== 1 ? 's' : ''}${result.errors > 0 ? `, ${result.errors} error${result.errors !== 1 ? 's' : ''}` : ''}`
        : `Error: ${result.error}`)
      await loadData()
    } catch (err: any) {
      setIndexMsg(`Error: ${err.message}`)
    } finally {
      setIsIndexing(false)
    }
  }

  const handleOpenFolder = async () => {
    await window.electronAPI.kbOpenFolder()
  }

  const handleFetchUrl = async () => {
    const url = urlInput.trim()
    if (!url) return
    setFetchStatus('fetching')
    setFetchMessage('')
    try {
      const result = await window.electronAPI.kbAddUrl(url)
      if (result.success) {
        setFetchStatus('success')
        setFetchMessage(`Added "${result.title}"`)
        setUrlInput('')
        await loadData()
      } else {
        setFetchStatus('error')
        setFetchMessage(result.error || 'Failed to fetch URL')
      }
    } catch (err: any) {
      setFetchStatus('error')
      setFetchMessage(err.message || 'Failed to fetch URL')
    }
  }

  const handleRefetch = async (file: KBFileInfo) => {
    if (!file.url) return
    setRefetchStatus((prev) => ({ ...prev, [file.filename]: 'fetching' }))
    try {
      const result = await window.electronAPI.kbRefetchUrl(file.filename, file.url)
      setRefetchStatus((prev) => ({ ...prev, [file.filename]: result.success ? 'done' : 'error' }))
      if (result.success) await loadData()
    } catch {
      setRefetchStatus((prev) => ({ ...prev, [file.filename]: 'error' }))
    }
    // Reset after 2s
    setTimeout(() => setRefetchStatus((prev) => ({ ...prev, [file.filename]: 'idle' })), 2000)
  }

  const handleDelete = async (file: KBFileInfo) => {
    const label = file.filename
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return
    try {
      const result = await window.electronAPI.kbDelete(file.filename)
      if (result.success) {
        await loadData()
      }
    } catch (err: any) {
      console.error('Delete failed:', err)
    }
  }

  // ── Upload handlers ────────────────────────────────────────────────────────

  /** Copy one or more local file paths into the KB, then refresh the list. */
  const processFiles = useCallback(async (filePaths: string[]) => {
    const ALLOWED = new Set(['.md', '.txt', '.pdf', '.docx'])
    const valid = filePaths.filter((fp) => {
      const dot = fp.lastIndexOf('.')
      return dot >= 0 && ALLOWED.has(fp.slice(dot).toLowerCase())
    })
    if (valid.length === 0) {
      setUploadStatus('error')
      setUploadMessage('No supported files — use .md, .txt, .pdf, or .docx')
      return
    }
    setUploadStatus('uploading')
    setUploadMessage('')
    let succeeded = 0
    const errors: string[] = []
    for (const fp of valid) {
      const result = await window.electronAPI.kbUploadFile(fp)
      if (result.success) {
        succeeded++
      } else {
        const name = fp.split(/[/\\]/).pop() ?? fp
        errors.push(`${name}: ${result.error ?? 'failed'}`)
      }
    }
    if (succeeded > 0 && errors.length === 0) {
      setUploadStatus('success')
      setUploadMessage(`Added ${succeeded} file${succeeded !== 1 ? 's' : ''}`)
    } else if (succeeded > 0) {
      setUploadStatus('success')
      setUploadMessage(`Added ${succeeded} file${succeeded !== 1 ? 's' : ''}, ${errors.length} failed`)
    } else {
      setUploadStatus('error')
      setUploadMessage(errors[0] || 'Upload failed')
    }
    await loadData()
  }, [loadData])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounterRef.current++
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounterRef.current--
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    dragCounterRef.current = 0
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    const filePaths = files.map((f) => (f as any).path as string).filter(Boolean)
    if (filePaths.length === 0) return
    await processFiles(filePaths)
  }, [processFiles])

  const handleBrowse = useCallback(async () => {
    const filePath = await window.electronAPI.filesOpenDialog()
    if (!filePath) return
    await processFiles([filePath])
  }, [processFiles])

  // ── File icon ──────────────────────────────────────────────────────────────

  const fileIcon = (f: KBFileInfo) => {
    if (f.source === 'url') return '🌐'
    switch (f.fileType) {
      case 'pdf': return '📕'
      case 'docx': return '📘'
      case 'md': return '📝'
      default: return '📄'
    }
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/10 shrink-0">
        <h3 className="section-heading">Knowledge Base</h3>
        <p className="text-xs text-white/40 mt-0.5">
          Store reference documents and web pages for AI-assisted search.
        </p>
      </div>

      <div className="flex-1 p-5 space-y-5">
        {/* How-to info row */}
        <div className="glass-card p-3 text-xs text-white/60 space-y-1">
          <p className="font-medium text-asu-gold">How to add content</p>
          <p>
            Upload files using the drop zone below, or fetch web pages with the URL field. Uploaded
            files are indexed automatically. Use <span className="font-medium text-white/80">Reindex All</span> to rebuild the index for files added manually to the folder.
          </p>
          {stats && (
            <p className="font-mono text-white/50 break-all">{stats.kbDir}</p>
          )}
          <p>In Compose, enable <span className="font-medium text-white/80">"Search knowledge base"</span> to include relevant excerpts in generations.</p>
        </div>

        {/* File Upload Zone */}
        <div className="glass-card p-4 space-y-3">
          <p className="text-xs font-semibold text-asu-gold uppercase tracking-wide">Upload Files</p>
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={uploadStatus !== 'uploading' ? handleBrowse : undefined}
            className={[
              'glass-upload-zone border-2 border-dashed rounded-lg p-6 text-center transition-colors select-none',
              uploadStatus === 'uploading'
                ? 'border-white/10 cursor-default'
                : isDragging
                  ? 'border-asu-gold bg-asu-gold/5 cursor-copy'
                  : 'border-white/20 hover:border-asu-gold hover:bg-asu-gold/5 cursor-pointer',
            ].join(' ')}
          >
            {uploadStatus === 'uploading' ? (
              <div className="flex items-center justify-center gap-2 text-sm text-white/50">
                <span className="inline-block w-3.5 h-3.5 border-2 border-white/20 border-t-asu-gold rounded-full animate-spin" />
                Uploading…
              </div>
            ) : isDragging ? (
              <p className="text-sm font-medium text-asu-gold">Drop to add to knowledge base</p>
            ) : (
              <>
                <p className="text-2xl mb-1.5">📂</p>
                <p className="text-sm text-white/70">
                  Drop files here or <span className="text-asu-gold font-medium underline">browse</span>
                </p>
                <p className="text-xs text-white/40 mt-1">.md · .txt · .pdf · .docx</p>
              </>
            )}
          </div>
          {uploadStatus === 'success' && (
            <p className="text-xs text-green-400 bg-green-500/10 border border-green-500/30 px-2.5 py-1.5 rounded flex items-center gap-1.5">
              <span>✓</span> {uploadMessage}
            </p>
          )}
          {uploadStatus === 'error' && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 px-2.5 py-1.5 rounded flex items-center gap-1.5">
              <span>✗</span> {uploadMessage}
            </p>
          )}
        </div>

        {/* Add URL section */}
        <div className="glass-card p-4 space-y-3">
          <p className="text-xs font-semibold text-asu-gold uppercase tracking-wide">Fetch Web Page</p>
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => { setUrlInput(e.target.value); setFetchStatus('idle') }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleFetchUrl() }}
              placeholder="https://example.edu/page"
              className="flex-1 input-field text-sm"
              disabled={fetchStatus === 'fetching'}
            />
            <button
              onClick={handleFetchUrl}
              disabled={!urlInput.trim() || fetchStatus === 'fetching'}
              className="btn-gold text-sm px-4 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {fetchStatus === 'fetching' ? (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Fetching…
                </span>
              ) : 'Fetch & Add'}
            </button>
          </div>
          {fetchStatus === 'success' && (
            <p className="text-xs text-green-400 bg-green-500/10 border border-green-500/30 px-2.5 py-1.5 rounded flex items-center gap-1.5">
              <span>✓</span> {fetchMessage}
            </p>
          )}
          {fetchStatus === 'error' && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 px-2.5 py-1.5 rounded flex items-center gap-1.5">
              <span>✗</span> {fetchMessage}
            </p>
          )}
        </div>

        {/* Stats + actions */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-white/50">
            {isLoading ? (
              <span>Loading…</span>
            ) : (
              <span>
                {stats?.totalFiles ?? 0} file{(stats?.totalFiles ?? 0) !== 1 ? 's' : ''} in folder
                {stats && stats.indexedCount > 0 && ` · ${stats.indexedCount} indexed`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenFolder}
              className="text-xs text-white/50 hover:text-white/70 border border-white/10 px-2.5 py-1 rounded hover:border-white/20 transition-colors"
            >
              Open Folder
            </button>
            <button
              onClick={handleReindex}
              disabled={isIndexing}
              className="btn-gold text-xs px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isIndexing ? 'Indexing…' : 'Reindex All'}
            </button>
          </div>
        </div>

        {indexMsg && (
          <p className={`text-xs px-3 py-2 rounded ${indexMsg.startsWith('Error') ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-green-500/10 text-green-400 border border-green-500/30'}`}>
            {indexMsg}
          </p>
        )}

        {/* File list */}
        {isLoading ? (
          <div className="text-sm text-white/40 py-4 text-center">Loading…</div>
        ) : files.length === 0 ? (
          <div className="text-sm text-white/40 py-6 text-center border border-dashed border-white/10 rounded-lg">
            No documents found. Add files to the knowledge-base folder or fetch a URL above.
          </div>
        ) : (
          <div className="space-y-1">
            {files.map((f) => (
              <div
                key={f.filePath}
                className="glass-card-inner flex items-center gap-3 px-3 py-2.5 rounded-lg"
              >
                <span className="text-base shrink-0">{fileIcon(f)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 truncate">{f.filename}</p>
                  <p className="text-xs text-white/40 flex items-center gap-1.5 flex-wrap">
                    {formatBytes(f.fileSize)}
                    {f.source === 'url' && f.fetchedAt && (
                      <span className="text-blue-400">· fetched {formatDate(f.fetchedAt)}</span>
                    )}
                    {f.indexed && f.indexedAt && (
                      <span className="gm-badge-indexed">· ✓ indexed {formatDate(f.indexedAt)}</span>
                    )}
                    {!f.indexed && (
                      <span className="gm-badge-pending">· ⚠ not indexed</span>
                    )}
                  </p>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {f.source === 'url' && f.url && (
                    <button
                      onClick={() => handleRefetch(f)}
                      disabled={refetchStatus[f.filename] === 'fetching'}
                      title="Re-download this page"
                      className="text-xs text-blue-400 hover:text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded disabled:opacity-50 transition-colors"
                    >
                      {refetchStatus[f.filename] === 'fetching' ? '…' :
                       refetchStatus[f.filename] === 'done' ? '✓' :
                       refetchStatus[f.filename] === 'error' ? '✗' : 'Refetch'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(f)}
                    title="Delete this document"
                    className="text-xs text-red-400/60 hover:text-red-400 border border-red-400/20 px-2 py-0.5 rounded transition-colors"
                  >
                    Delete
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
