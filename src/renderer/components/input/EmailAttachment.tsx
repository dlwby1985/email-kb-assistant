import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface EmailAttachmentProps {
  files: string[]
  onAdd: (fileName: string) => void
  onRemove: (fileName: string) => void
}

export default function EmailAttachment({ files, onAdd, onRemove }: EmailAttachmentProps) {
  const { t } = useTranslation()
  const [isDragOver, setIsDragOver] = useState(false)

  const handleBrowse = async () => {
    try {
      const filePath = await window.electronAPI.filesOpenDialog()
      if (filePath) {
        const fileName = filePath.split(/[\\/]/).pop() || 'file'
        if (!files.includes(fileName)) onAdd(fileName)
      }
    } catch { /* ignore */ }
  }

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true) }
  const handleDragLeave = () => setIsDragOver(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    Array.from(e.dataTransfer.files).forEach((file) => {
      if (!files.includes(file.name)) onAdd(file.name)
    })
  }

  return (
    <div>
      <label className="section-label">
        {t('compose.emailAttachments')}
        <span className="font-normal text-gray-400 ml-1">({t('compose.messageTimeOptional')})</span>
      </label>
      {files.length > 0 && (
        <div className="mb-2 space-y-1">
          {files.map((fileName) => (
            <div key={fileName} className="border border-blue-100 rounded px-3 py-1.5 bg-blue-50 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm shrink-0">📎</span>
                <span className="text-sm font-medium text-gray-700 truncate">{fileName}</span>
              </div>
              <button
                onClick={() => onRemove(fileName)}
                className="text-gray-400 hover:text-red-500 text-xs transition-colors shrink-0 ml-2"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowse}
        className={`border-2 border-dashed rounded p-3 text-center cursor-pointer transition-colors ${
          isDragOver ? 'border-asu-maroon bg-asu-maroon/5' : 'border-gray-200 hover:border-gray-300 bg-gray-50'
        }`}
      >
        <p className="text-sm text-gray-500">
          {t('compose.addEmailAttachment')}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{t('compose.emailAttachmentsHint')}</p>
      </div>
    </div>
  )
}
