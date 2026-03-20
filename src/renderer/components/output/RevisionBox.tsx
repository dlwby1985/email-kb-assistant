import React, { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'

interface RevisionBoxProps {
  onRevise: (instruction: string) => void
  isLoading: boolean
}

export default function RevisionBox({ onRevise, isLoading }: RevisionBoxProps) {
  const { t } = useTranslation()
  const [instruction, setInstruction] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = () => {
    if (!instruction.trim() || isLoading) return
    onRevise(instruction.trim())
    setInstruction('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-t border-white/10 px-6 py-3 shrink-0">
      <label className="text-xs text-white/50 mb-1 block">{t('output.revisionLabel')}</label>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('output.revisionPlaceholder')}
          className="input-field flex-1"
          disabled={isLoading}
        />
        <button
          onClick={handleSubmit}
          disabled={!instruction.trim() || isLoading}
          className="btn-primary text-xs px-4 py-2 whitespace-nowrap"
        >
          {isLoading ? '...' : t('output.revise')}
        </button>
      </div>
    </div>
  )
}
