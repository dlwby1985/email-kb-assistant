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
  onHelpClick?: () => void
}

export default function Header({ activeTab, onTabChange, onHelpClick }: HeaderProps) {
  const { t } = useTranslation()
  return (
    <aside className="gm-sidebar">
      {/* App logo */}
      <div className="flex flex-col items-center mb-2">
        <div className="w-9 h-9 bg-asu-gold rounded-lg flex items-center justify-center shrink-0">
          <span className="text-asu-maroon font-extrabold text-sm leading-none">E</span>
        </div>
      </div>

      {/* Navigation items */}
      <nav className="flex flex-col items-center gap-1 flex-1 w-full">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`gm-nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{tab.icon}</span>
              <span>{t(`nav.${tab.id}`)}</span>
            </button>
          )
        })}
      </nav>

      {/* Bottom: help button */}
      <div className="mt-auto pb-4 flex flex-col items-center gap-2">
        <button
          onClick={onHelpClick}
          className="gm-nav-item"
          title="User Guide"
        >
          <span className="nav-icon">❓</span>
          <span>Help</span>
        </button>
      </div>
    </aside>
  )
}
