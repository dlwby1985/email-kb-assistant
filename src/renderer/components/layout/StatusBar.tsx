import React from 'react'
import { useTranslation } from 'react-i18next'
import type { SkillName, ContactMode, Channel } from '../../types'

interface StatusBarProps {
  skill: SkillName | string
  contactMode: ContactMode
  contactName: string
  channel: Channel
}

export default function StatusBar({ skill, contactMode, contactName, channel }: StatusBarProps) {
  const { t } = useTranslation()

  const modeLabels: Record<ContactMode, string> = {
    quick: t('status.quick'),
    single: t('status.single'),
    multi: t('status.multi'),
  }

  const channelLabels: Record<Channel, string> = {
    email:        t('status.email'),
    conversation: t('status.conversation'),
  }

  return (
    <footer className="bg-gray-100 border-t border-gray-200 px-4 py-1.5 text-xs text-gray-500 flex items-center gap-1 shrink-0">
      <span>{t('status.skill')}: <strong className="text-gray-600">{skill || '—'}</strong></span>
      <span className="text-gray-300 mx-1">|</span>
      <span>{t('status.mode')}: <strong className="text-gray-600">{modeLabels[contactMode]}</strong></span>
      <span className="text-gray-300 mx-1">|</span>
      <span>{t('status.contact')}: <strong className="text-gray-600">{contactName || '—'}</strong></span>
      <span className="text-gray-300 mx-1">|</span>
      <span>{t('status.channel')}: <strong className="text-gray-600">{channelLabels[channel]}</strong></span>
    </footer>
  )
}
