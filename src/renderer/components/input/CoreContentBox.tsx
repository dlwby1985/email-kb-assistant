import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { Mode } from '../../types'

interface CoreContentBoxProps {
  value: string
  onChange: (value: string) => void
  mode: Mode
  onRecommendPolish?: () => void
}

export default function CoreContentBox({
  value,
  onChange,
  mode,
  onRecommendPolish,
}: CoreContentBoxProps) {
  const { t } = useTranslation()
  const [showPolishHint, setShowPolishHint] = useState(false)

  // Auto-recommend Polish if content looks like a complete draft (>150 chars)
  useEffect(() => {
    if (mode === 'generate' && value.length > 150) {
      // Simple heuristic: has greeting or sign-off patterns
      const looksLikeDraft =
        /^(dear|hi|hello|hey|to whom)/i.test(value.trim()) ||
        /(regards|sincerely|best|thanks|thank you)[,.]?\s*$/im.test(value.trim()) ||
        /^(尊敬的|你好|您好)/i.test(value.trim())
      setShowPolishHint(looksLikeDraft)
    } else {
      setShowPolishHint(false)
    }
  }, [value, mode])

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="section-label mb-0">
          {t('compose.coreContent')}
          <span className="text-asu-maroon ml-0.5">*</span>
        </label>
        {showPolishHint && (
          <button
            onClick={onRecommendPolish}
            className="text-xs text-asu-orange font-medium hover:underline transition-colors"
          >
            {t('compose.looksDraft')}
          </button>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          mode === 'generate'
            ? t('compose.coreContentPlaceholder')
            : t('compose.coreContentPolishPlaceholder')
        }
        className="textarea-field"
        rows={6}
      />
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-400">
          {value.length > 0 && `${value.length} chars`}
        </span>
        {mode === 'polish' && (
          <span className="text-xs text-asu-orange">
            {t('compose.polishModeHint')}
          </span>
        )}
      </div>
    </div>
  )
}
