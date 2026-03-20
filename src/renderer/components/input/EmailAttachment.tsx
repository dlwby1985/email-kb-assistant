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
        <span className="font-normal text-white/40 ml-1">({t('compose.messageTimeOptional')})</span>
      </label>
      {files.length > 0 && (
        <div className="mb-2 space-y-1">
          {files.map((fileName) => (
            <div key={fileName} className="border border-asu-blue/20 rounded px-3 py-1.5 bg-asu-blue/10 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm shrink-0">📎</span>
                <span className="text-sm font-medium text-white/80 truncate">{fileName}</span>
              </div>
              <button
                onClick={() => onRemove(fileName)}
                className="text-white/40 hover:text-asu-pink text-xs transition-colors shrink-0 ml-2"
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
          isDragOver ? 'border-asu-gold bg-asu-gold/5' : 'border-white/15 hover:border-white/25'
        }`}
      >
        <p className="text-sm text-white/50">
          {t('compose.addEmailAttachment')}
        </p>
        <p className="text-xs text-white/40 mt-0.5">{t('compose.emailAttachmentsHint')}</p>
      </div>
    </div>
  )
}
