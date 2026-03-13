import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface AttachmentInfo {
  fileName: string
  text: string
  wordCount: number
}

interface BackgroundAttachmentProps {
  attachment: AttachmentInfo | null
  onAttach: (info: AttachmentInfo) => void
  onRemove: () => void
}

export default function BackgroundAttachment({ attachment, onAttach, onRemove }: BackgroundAttachmentProps) {
  const { t } = useTranslation()
  const [isDragOver, setIsDragOver] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlValue, setUrlValue] = useState('')

  const handleExtract = async (filePath: string, fileName: string) => {
    setIsExtracting(true)
    setExtractError(null)
    try {
      const result = await window.electronAPI.filesExtractText(filePath)
      onAttach({ fileName, text: result.text, wordCount: result.wordCount })
    } catch (err: any) {
      setExtractError(err.message || 'Failed to extract text')
    } finally {
      setIsExtracting(false)
    }
  }

  const handleBrowse = async () => {
    try {
      const filePath = await window.electronAPI.filesOpenDialog()
      if (filePath) {
        const fileName = filePath.split(/[\\/]/).pop() || 'file'
        await handleExtract(filePath, fileName)
      }
    } catch (err: any) {
      setExtractError(err.message || 'Failed to open file')
    }
  }

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true) }
  const handleDragLeave = () => setIsDragOver(false)

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      const filePath = (file as any).path
      if (filePath) {
        await handleExtract(filePath, file.name)
      } else {
        setExtractError('Cannot access file path. Please use the Browse button.')
      }
    }
  }

  const handleFetchUrl = async () => {
    const url = urlValue.trim()
    if (!url) return
    setIsExtracting(true)
    setExtractError(null)
    try {
      const result = await window.electronAPI.kbFetchUrlText(url)
      if (result.success) {
        const hostname = (() => { try { return new URL(url).hostname } catch { return url } })()
        onAttach({ fileName: result.title || hostname, text: result.text, wordCount: result.wordCount })
        setShowUrlInput(false)
        setUrlValue('')
      } else {
        setExtractError(result.error || 'Failed to fetch URL')
      }
    } catch (err: any) {
      setExtractError(err.message || 'Failed to fetch URL')
    } finally {
      setIsExtracting(false)
    }
  }

  if (attachment) {
    return (
      <div className="mt-2">
        <div className="border border-gray-200 rounded px-3 py-2 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm shrink-0">📄</span>
            <span className="text-xs font-medium text-gray-700 truncate">{attachment.fileName}</span>
            <span className="text-xs text-gray-400 shrink-0">({attachment.wordCount} words)</span>
          </div>
          <button onClick={onRemove} className="text-gray-400 hover:text-red-500 text-xs transition-colors shrink-0 ml-2">
            ✕
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-2 space-y-1.5">
      {/* File drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={showUrlInput ? undefined : handleBrowse}
        className={`border border-dashed rounded p-2.5 text-center transition-colors ${
          showUrlInput ? 'opacity-50 pointer-events-none' : 'cursor-pointer'
        } ${
          isDragOver ? 'border-asu-maroon bg-asu-maroon/5' : 'border-gray-200 hover:border-gray-300 bg-gray-50'
        } ${isExtracting ? 'opacity-50 pointer-events-none' : ''}`}
      >
        {isExtracting ? (
          <p className="text-xs text-gray-500">
            <span className="inline-block w-3 h-3 border-2 border-asu-maroon/20 border-t-asu-maroon rounded-full animate-spin mr-1.5" />
            Loading…
          </p>
        ) : (
          <p className="text-xs text-gray-400">
            {t('compose.addRefDoc')} <span className="text-gray-500">(PDF, DOCX, MD)</span>
          </p>
        )}
      </div>

      {/* URL input toggle */}
      {!showUrlInput && !isExtracting && (
        <button
          onClick={() => { setShowUrlInput(true); setExtractError(null) }}
          className="text-xs text-gray-400 hover:text-asu-maroon transition-colors block w-full text-center"
        >
          {t('compose.pasteUrl')}
        </button>
      )}

      {/* URL input row */}
      {showUrlInput && (
        <div className="flex gap-1.5">
          <input
            type="url"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleFetchUrl(); if (e.key === 'Escape') { setShowUrlInput(false); setUrlValue('') } }}
            placeholder="https://..."
            autoFocus
            disabled={isExtracting}
            className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-asu-maroon bg-white"
          />
          <button
            onClick={handleFetchUrl}
            disabled={!urlValue.trim() || isExtracting}
            className="text-xs bg-asu-maroon text-white px-2.5 py-1 rounded disabled:opacity-50 hover:bg-asu-maroon/80 transition-colors shrink-0"
          >
            {isExtracting ? '…' : t('compose.fetch')}
          </button>
          <button
            onClick={() => { setShowUrlInput(false); setUrlValue(''); setExtractError(null) }}
            disabled={isExtracting}
            className="text-xs text-gray-400 hover:text-gray-600 px-1.5"
          >
            ✕
          </button>
        </div>
      )}

      {extractError && <p className="text-xs text-red-500">{extractError}</p>}
    </div>
  )
}
