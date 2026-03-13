import React from 'react'
import { useTranslation } from 'react-i18next'
import type { Mode } from '../../types'

interface ModeToggleProps {
  mode: Mode
  onChange: (mode: Mode) => void
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  const { t } = useTranslation()
  const options: { value: Mode; label: string; description: string }[] = [
    { value: 'generate', label: t('compose.generate'), description: 'Create new content from scratch' },
    { value: 'polish',   label: t('compose.polish'),   description: 'Refine existing draft' },
  ]

  return (
    <div>
      <label className="section-label">{t('compose.mode')}</label>
      <div className="flex gap-1 bg-gray-100 rounded p-0.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`
              flex-1 px-3 py-1.5 text-sm font-medium rounded transition-all duration-150
              ${mode === opt.value
                ? 'bg-white text-asu-maroon shadow-sm border-b-2 border-asu-gold'
                : 'text-gray-500 hover:text-gray-700'
              }
            `}
            title={opt.description}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
