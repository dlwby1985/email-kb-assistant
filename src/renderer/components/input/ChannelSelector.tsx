import React from 'react'
import { useTranslation } from 'react-i18next'
import type { Channel } from '../../types'

interface ChannelSelectorProps {
  channel: Channel
  onChange: (channel: Channel) => void
}

const channelConfig: Array<{
  value: Channel
  color: string
  dotColor: string
}> = [
  { value: 'email',        color: 'text-asu-blue',   dotColor: 'bg-asu-blue' },
  { value: 'conversation', color: 'text-asu-orange', dotColor: 'bg-asu-orange' },
]

export default function ChannelSelector({ channel, onChange }: ChannelSelectorProps) {
  const { t } = useTranslation()
  const channelLabel: Record<Channel, string> = {
    email:        t('compose.email'),
    conversation: t('compose.conversation'),
  }

  return (
    <div>
      <label className="section-label">{t('compose.channel')}</label>
      <div className="flex gap-1.5">
        {channelConfig.map((ch) => (
          <button
            key={ch.value}
            onClick={() => onChange(ch.value)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium
              transition-all duration-150 border
              ${channel === ch.value
                ? `${ch.color} border-current bg-white shadow-sm`
                : 'text-gray-400 border-transparent hover:text-gray-600'
              }
            `}
          >
            <span className={`channel-dot ${ch.dotColor}`} />
            {channelLabel[ch.value]}
          </button>
        ))}
      </div>
    </div>
  )
}
