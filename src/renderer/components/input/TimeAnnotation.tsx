import React from 'react'
import { useTranslation } from 'react-i18next'

interface TimeAnnotationProps {
  value: string
  onChange: (value: string) => void
}

export default function TimeAnnotation({ value, onChange }: TimeAnnotationProps) {
  const { t } = useTranslation()
  return (
    <div>
      <label className="section-label">
        {t('compose.messageTime')}
        <span className="font-normal text-gray-400 ml-1">({t('compose.messageTimeOptional')})</span>
      </label>
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field w-auto"
      />
    </div>
  )
}
