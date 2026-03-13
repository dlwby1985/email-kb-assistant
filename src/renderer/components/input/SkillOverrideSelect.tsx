import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

// Skill slugs excluded from the override list (internal / always-auto)
const HIDDEN_SKILLS = new Set(['_base', 'personal-style', 'reviewer'])

function toDisplayName(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

interface SkillOverrideSelectProps {
  value: string | null
  onChange: (skill: string | null) => void
}

export default function SkillOverrideSelect({ value, onChange }: SkillOverrideSelectProps) {
  const { t } = useTranslation()
  const [skills, setSkills] = useState<Array<{ slug: string; name: string }>>([])

  useEffect(() => {
    window.electronAPI.skillsList()
      .then((list) => {
        const filtered = list
          .filter((s) => !HIDDEN_SKILLS.has(s.slug))
          .map((s) => ({ slug: s.slug, name: s.name }))
        setSkills(filtered)
      })
      .catch(() => {})
  }, [])

  return (
    <div>
      <label className="section-label">
        {t('compose.skill')}
        <span className="font-normal text-gray-400 ml-1">(override)</span>
      </label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="input-field text-sm w-full"
      >
        <option value="">{t('compose.skillAuto')}</option>
        {skills.map((s) => (
          <option key={s.slug} value={s.slug}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  )
}
