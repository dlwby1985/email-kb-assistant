import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Mode, Channel, Contact, ContactMode, TemplateSelectorValue, KBSearchResult, FetchedEmail } from '../../types'
import ModeToggle from './ModeToggle'
import ChannelSelector from './ChannelSelector'
import ContactSelector from './ContactSelector'
import SkillOverrideSelect from './SkillOverrideSelect'
import StyleSelector from './StyleSelector'
import BackgroundBox from './BackgroundBox'
import CoreContentBox from './CoreContentBox'
import TimeAnnotation from './TimeAnnotation'
import BackgroundAttachment from './BackgroundAttachment'
import EmailAttachment from './EmailAttachment'
import TemplateSelector from './TemplateSelector'
import FetchEmailsPanel from './FetchEmailsPanel'
import FeatureTooltip from '../common/FeatureTooltip'

interface AttachmentInfo {
  fileName: string
  text: string
  wordCount: number
}

export interface KBSearchResultUI extends KBSearchResult {
  selected: boolean
}

interface InputPanelProps {
  // Mode & channel
  mode: Mode
  onModeChange: (mode: Mode) => void
  channel: Channel
  onChannelChange: (channel: Channel) => void
  // Contacts
  contacts: Contact[]
  selectedContacts: Contact[]
  onContactsChange: (contacts: Contact[]) => void
  onNewContact: () => void
  contactMode: ContactMode
  // Content
  background: string
  onBackgroundChange: (value: string) => void
  coreContent: string
  onCoreContentChange: (value: string) => void
  // Time
  messageTime: string
  onMessageTimeChange: (value: string) => void
  // Reference doc (background attachment — text extracted for AI)
  refDoc: AttachmentInfo | null
  onAttachRefDoc: (info: AttachmentInfo) => void
  onRemoveRefDoc: () => void
  // Email attachments (filenames only — AI mentions them)
  emailAttachments: string[]
  onAddEmailAttachment: (fileName: string) => void
  onRemoveEmailAttachment: (fileName: string) => void
  // Template
  selectedTemplate: TemplateSelectorValue
  onTemplateChange: (val: TemplateSelectorValue) => void
  // Skill override
  skillOverride: string | null
  onSkillOverrideChange: (skill: string | null) => void
  // Style override
  styleOverride: string | null
  onStyleOverrideChange: (style: string | null) => void
  // Knowledge Base
  useKB: boolean
  onUseKBChange: (val: boolean) => void
  kbResults: KBSearchResultUI[]
  onKBResultToggle: (index: number) => void
  isKBSearching: boolean
  // Past threads
  includePastThreads: boolean
  onIncludePastThreadsChange: (val: boolean) => void
  // Fetch emails
  onSelectEmail: (email: FetchedEmail) => void
  // Actions
  onGenerate: () => void
  isLoading: boolean
}

export default function InputPanel({
  mode,
  onModeChange,
  channel,
  onChannelChange,
  contacts,
  selectedContacts,
  onContactsChange,
  onNewContact,
  contactMode,
  background,
  onBackgroundChange,
  coreContent,
  onCoreContentChange,
  messageTime,
  onMessageTimeChange,
  selectedTemplate,
  onTemplateChange,
  refDoc,
  onAttachRefDoc,
  onRemoveRefDoc,
  emailAttachments,
  onAddEmailAttachment,
  onRemoveEmailAttachment,
  skillOverride,
  onSkillOverrideChange,
  styleOverride,
  onStyleOverrideChange,
  useKB,
  onUseKBChange,
  kbResults,
  onKBResultToggle,
  isKBSearching,
  includePastThreads,
  onIncludePastThreadsChange,
  onSelectEmail,
  onGenerate,
  isLoading,
}: InputPanelProps) {
  const { t } = useTranslation()
  const canGenerate = coreContent.trim().length > 0 && !isLoading
  const [kbExpanded, setKBExpanded] = useState(false)

  const selectedCount = kbResults.filter((r) => r.selected).length
  const totalTokens = kbResults.filter((r) => r.selected).reduce((s, r) => s + r.estimatedTokens, 0)

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Fetch Emails Panel */}
        <FetchEmailsPanel onSelectEmail={onSelectEmail} />

        {/* Mode Toggle */}
        <FeatureTooltip id="mode_toggle" text="Generate writes an email from your key points. Polish refines an existing draft you paste into Core Content.">
          <ModeToggle mode={mode} onChange={onModeChange} />
        </FeatureTooltip>

        {/* Skill Override */}
        <SkillOverrideSelect value={skillOverride} onChange={onSkillOverrideChange} />

        {/* Style Selector (hidden when only one style exists) */}
        <StyleSelector value={styleOverride} onChange={onStyleOverrideChange} />

        {/* Channel Selector */}
        <FeatureTooltip id="channel_selector" text="Email adds a subject line and formal structure. WeChat/Slack/Zoom produce short, conversational messages.">
          <ChannelSelector channel={channel} onChange={onChannelChange} />
        </FeatureTooltip>

        {/* Contact Selector */}
        <ContactSelector
          contacts={contacts}
          selectedContacts={selectedContacts}
          onSelect={onContactsChange}
          onNewContact={onNewContact}
          contactMode={contactMode}
        />

        {/* Past threads indicator (single-person mode only) */}
        {contactMode === 'single' && (
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={includePastThreads}
              onChange={(e) => onIncludePastThreadsChange(e.target.checked)}
              className="w-3.5 h-3.5 accent-asu-maroon cursor-pointer"
            />
            <span className="text-xs text-gray-600 group-hover:text-gray-800 transition-colors">
              Include past communication as context
            </span>
          </label>
        )}

        {/* Task / Template Selector */}
        <FeatureTooltip id="template_selector" text="Search your saved templates or past emails to use as a starting point for this message.">
          <TemplateSelector
            value={selectedTemplate}
            onChange={onTemplateChange}
            coreContent={coreContent}
          />
        </FeatureTooltip>

        {/* Knowledge Base toggle */}
        <div className="space-y-1">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={useKB}
              onChange={(e) => onUseKBChange(e.target.checked)}
              className="w-3.5 h-3.5 accent-asu-maroon cursor-pointer"
            />
            <span className="text-xs text-gray-600 group-hover:text-gray-800 transition-colors">
              {t('compose.searchKB')}
              <span className="text-gray-400 ml-1">{t('compose.searchKBHint')}</span>
            </span>
          </label>

          {useKB && (
            <div className="ml-5 text-xs">
              {isKBSearching ? (
                <span className="text-gray-400">{t('compose.searching')}</span>
              ) : kbResults.length === 0 ? (
                <span className="text-gray-400">{t('compose.noKBResults')}</span>
              ) : (
                <div>
                  <button
                    onClick={() => setKBExpanded((v) => !v)}
                    className="text-asu-maroon hover:text-asu-maroon/70 transition-colors"
                  >
                    {selectedCount} document{selectedCount !== 1 ? 's' : ''} matched
                    {totalTokens > 0 && <span className="text-gray-400 ml-1">(~{totalTokens} tokens)</span>}
                    <span className="ml-1">{kbExpanded ? '▲' : '▼'}</span>
                  </button>

                  {kbExpanded && (
                    <div className="mt-1.5 space-y-1.5 border-l-2 border-gray-200 pl-2">
                      {kbResults.map((r, i) => (
                        <label key={r.filePath} className="flex items-start gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={r.selected}
                            onChange={() => onKBResultToggle(i)}
                            className="mt-0.5 w-3 h-3 accent-asu-maroon cursor-pointer shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-gray-700 font-medium truncate">{r.filename}</p>
                            <p className="text-gray-400 leading-snug line-clamp-2">{r.snippet}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Background + Reference Doc */}
        <div>
          <FeatureTooltip id="background_box" text="Paste prior email threads or describe context here — this is sent to the AI but will NOT appear in the output.">
            <BackgroundBox value={background} onChange={onBackgroundChange} />
          </FeatureTooltip>
          <BackgroundAttachment
            attachment={refDoc}
            onAttach={onAttachRefDoc}
            onRemove={onRemoveRefDoc}
          />
        </div>

        {/* Core Content */}
        <CoreContentBox
          value={coreContent}
          onChange={onCoreContentChange}
          mode={mode}
          onRecommendPolish={() => onModeChange('polish')}
        />

        {/* Email Attachments */}
        <EmailAttachment
          files={emailAttachments}
          onAdd={onAddEmailAttachment}
          onRemove={onRemoveEmailAttachment}
        />

        {/* Time Annotation */}
        <TimeAnnotation value={messageTime} onChange={onMessageTimeChange} />
      </div>

      {/* Generate Button — sticky at bottom */}
      <div className="border-t border-gray-200 p-4 bg-white shrink-0">
        <button
          onClick={onGenerate}
          disabled={!canGenerate}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {mode === 'polish' ? t('compose.polishing') : t('compose.generating')}
            </>
          ) : (
            <>
              {mode === 'polish' ? `✨ ${t('compose.polishButton')}` : `🚀 ${t('compose.generateButton')}`}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
