import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { StyleInfo } from '../../types'

interface StyleSelectorProps {
  value: string | null   // null = 'auto'
  onChange: (slug: string | null) => void
}

export default function StyleSelector({ value, onChange }: StyleSelectorProps) {
  const { t } = useTranslation()
  const [styles, setStyles] = useState<StyleInfo[]>([])

  useEffect(() => {
    window.electronAPI.styleList()
      .then(setStyles)
      .catch(() => setStyles([]))
  }, [])

  // Don't render if only one (default) style exists
  if (styles.length <= 1) return null

  return (
    <div>
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
        {t('compose.style')}
      </label>
      <select
        value={value ?? 'auto'}
        onChange={(e) => {
          const v = e.target.value
          onChange(v === 'auto' ? null : v)
        }}
        className="input-field text-sm w-full"
      >
        <option value="auto">{t('compose.styleAuto')}</option>
        {styles.map((s) => (
          <option key={s.slug} value={s.slug}>
            {s.name}{s.isDefault ? ' ★' : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
