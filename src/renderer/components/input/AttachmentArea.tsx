import React, { useState, useRef } from 'react'

interface AttachmentInfo {
  fileName: string
  text: string
  wordCount: number
}

interface AttachmentAreaProps {
  attachment: AttachmentInfo | null
  onAttach: (info: AttachmentInfo) => void
  onRemove: () => void
}

export default function AttachmentArea({ attachment, onAttach, onRemove }: AttachmentAreaProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExtract = async (filePath: string, fileName: string) => {
    setIsExtracting(true)
    setExtractError(null)
    try {
      const result = await window.electronAPI.filesExtractText(filePath)
      onAttach({
        fileName,
        text: result.text,
        wordCount: result.wordCount,
      })
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

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

  if (attachment) {
    return (
      <div>
        <label className="section-label">Attachment</label>
        <div className="border border-gray-200 rounded px-3 py-2 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">📎</span>
            <span className="text-sm font-medium text-gray-700">{attachment.fileName}</span>
            <span className="text-xs text-gray-400">({attachment.wordCount} words extracted)</span>
          </div>
          <button
            onClick={onRemove}
            className="text-gray-400 hover:text-red-500 text-sm transition-colors"
          >
            ✕ Remove
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <label className="section-label">
        Attachment
        <span className="font-normal text-gray-400 ml-1">(optional — PDF, DOCX, MD)</span>
      </label>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded p-4 text-center cursor-pointer
          transition-colors duration-150
          ${isDragOver
            ? 'border-asu-maroon bg-asu-maroon/5'
            : 'border-gray-200 hover:border-gray-300 bg-gray-50'
          }
          ${isExtracting ? 'opacity-50 pointer-events-none' : ''}
        `}
        onClick={handleBrowse}
      >
        {isExtracting ? (
          <div className="text-sm text-gray-500">
            <span className="inline-block w-4 h-4 border-2 border-asu-maroon/20 border-t-asu-maroon rounded-full animate-spin mr-2" />
            Extracting text...
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-500">
              Drop a file here or <span className="text-asu-maroon font-medium">browse</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">PDF, DOCX, or Markdown — text will be extracted</p>
          </div>
        )}
      </div>
      {extractError && (
        <p className="text-xs text-red-500 mt-1">{extractError}</p>
      )}
    </div>
  )
}
