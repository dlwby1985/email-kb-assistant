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
      <div className="flex gap-1 rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`
              flex-1 px-3 py-1.5 text-sm font-medium rounded transition-all duration-150
              ${mode === opt.value
                ? 'text-asu-gold border-b-2 border-asu-gold shadow-sm'
                : 'text-white/50 hover:text-white/70'
              }
            `}
            style={mode === opt.value ? { background: 'rgba(255,255,255,0.08)' } : undefined}
            title={opt.description}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
