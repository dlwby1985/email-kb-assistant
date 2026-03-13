import React from 'react'
import { useTranslation } from 'react-i18next'

export type AppTab = 'compose' | 'contacts' | 'drafts' | 'projects' | 'search' | 'analytics' | 'settings'

const TABS: Array<{ id: AppTab; label: string; icon: string }> = [
  { id: 'compose',   label: 'Compose',   icon: '✏️' },
  { id: 'contacts',  label: 'Contacts',  icon: '👥' },
  { id: 'drafts',    label: 'Drafts',    icon: '📑' },
  { id: 'projects',  label: 'Projects',  icon: '📁' },
  { id: 'search',    label: 'Search',    icon: '🔍' },
  { id: 'analytics', label: 'Analytics', icon: '📊' },
  { id: 'settings',  label: 'Settings',  icon: '⚙' },
]

interface HeaderProps {
  activeTab: AppTab
  onTabChange: (tab: AppTab) => void
  isDark?: boolean
  onToggleDark?: () => void
  onHelpClick?: () => void
}

export default function Header({ activeTab, onTabChange, isDark, onToggleDark, onHelpClick }: HeaderProps) {
  const { t } = useTranslation()
  return (
    <header className="bg-asu-maroon text-white px-4 py-0 flex items-stretch justify-between shrink-0" style={{ minHeight: '42px' }}>
      {/* App logo + title */}
      <div className="flex items-center shrink-0 mr-4 gap-2">
        <div className="w-6 h-6 bg-asu-gold rounded flex items-center justify-center shrink-0">
          <span className="text-asu-maroon font-extrabold text-xs leading-none">E</span>
        </div>
        <h1 className="text-sm font-semibold tracking-wide whitespace-nowrap">Email KB Assistant</h1>
      </div>

      {/* Navigation tabs */}
      <nav className="flex items-stretch gap-0 flex-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center gap-1.5 px-3 text-sm transition-colors border-b-2 whitespace-nowrap
                ${isActive
                  ? 'text-white font-semibold border-white'
                  : 'text-white/60 hover:text-white border-transparent hover:border-white/30'
                }
              `}
            >
              <span>{tab.icon}</span>
              <span>{t(`nav.${tab.id}`)}</span>
            </button>
          )
        })}
      </nav>

      {/* Right-side controls */}
      <div className="flex items-center shrink-0 ml-2 gap-1">
        <button
          onClick={onHelpClick}
          className="text-white/70 hover:text-white text-sm font-bold transition-colors px-2"
          title="User Guide"
        >
          ?
        </button>
        <button
          onClick={onToggleDark}
          className="text-white/70 hover:text-white text-sm transition-colors px-2"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  )
}
