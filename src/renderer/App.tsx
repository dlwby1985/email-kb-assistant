import React, { useEffect, useState, useCallback, useMemo } from 'react'
import SetupWizard from './components/dialogs/SetupWizard'
import Header, { AppTab } from './components/layout/Header'
import StatusBar from './components/layout/StatusBar'
import MainLayout from './components/layout/MainLayout'
import InputPanel, { type KBSearchResultUI } from './components/input/InputPanel'
import OutputPanel from './components/output/OutputPanel'
import ContactInfoPanel from './components/output/ContactInfoPanel'
import NewContactDialog from './components/dialogs/NewContactDialog'
import ThreadSaveDialog from './components/dialogs/ThreadSaveDialog'
import HistoryPanel from './components/output/HistoryPanel'
import TemplateRefPanel from './components/output/TemplateRefPanel'
import EditContactDialog from './components/dialogs/EditContactDialog'
import DraftsPage from './components/dialogs/DraftsPage'
import ProjectsPage from './components/dialogs/ProjectsPage'
import AnalyticsPage from './components/dialogs/AnalyticsPage'
import SearchPanel from './components/output/SearchPanel'
import ContactsPage from './components/pages/ContactsPage'
import SettingsPage from './components/pages/SettingsPage'
import HelpPage from './components/pages/HelpPage'
import DraggableDialog from './components/dialogs/DraggableDialog'
import type { NewContactData } from './components/dialogs/NewContactDialog'
import type { ThreadSaveFormData } from './components/dialogs/ThreadSaveDialog'
import { useContacts } from './hooks/useContacts'
import { useGenerate } from './hooks/useGenerate'
import { useThreads } from './hooks/useThreads'
import type { Config, Channel, Mode, ContactMode, Contact, SkillName, GenerateRequest, TemplateSelectorValue, FetchedEmail } from './types'

type AppView = 'loading' | 'setup' | 'main'

function currentDatetimeLocal(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

function App() {
  const [view, setView] = useState<AppView>('loading')
  const [vaultPath, setVaultPath] = useState<string>('')
  const [config, setConfig] = useState<Config | null>(null)

  // Navigation tab
  const [activeTab, setActiveTab] = useState<AppTab>('compose')

  // Main UI state
  const [mode, setMode] = useState<Mode>('generate')
  const [channel, setChannel] = useState<Channel>('email')
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([])
  const [currentSkill, setCurrentSkill] = useState<SkillName | string>('email-reply')

  // Input state
  const [background, setBackground] = useState('')
  const [coreContent, setCoreContent] = useState('')
  const [messageTime, setMessageTime] = useState(currentDatetimeLocal)

  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateSelectorValue>(null)

  // Skill override (null = auto)
  const [skillOverride, setSkillOverride] = useState<string | null>(null)

  // Style override (null = auto-match)
  const [styleOverride, setStyleOverride] = useState<string | null>(null)

  // Signature override (null = auto-select by language)
  const [signatureId, setSignatureId] = useState<string | null>(null)

  // Attachment state
  const [refDoc, setRefDoc] = useState<{ fileName: string; text: string; wordCount: number } | null>(null)
  const [emailAttachments, setEmailAttachments] = useState<string[]>([])

  // Save success toast
  const [saveToast, setSaveToast] = useState<{ threadFilePath?: string; templateFilePath?: string } | null>(null)

  // Knowledge Base search
  const [useKB, setUseKB] = useState(false)
  const [kbResults, setKBResults] = useState<KBSearchResultUI[]>([])
  const [isKBSearching, setIsKBSearching] = useState(false)
  // Past threads toggle (for single-person mode context)
  const [includePastThreads, setIncludePastThreads] = useState(true)
  // Draft save toast
  const [draftToast, setDraftToast] = useState(false)

  // Dark mode
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem('theme') === 'dark' } catch { return false }
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    try { localStorage.setItem('theme', isDark ? 'dark' : 'light') } catch { /* ignore */ }
  }, [isDark])

  // KB search: run when checkbox is enabled or content changes (debounced)
  useEffect(() => {
    if (!useKB) { setKBResults([]); return }
    const query = (coreContent.trim() || background.trim()).slice(0, 300)
    if (!query) { setKBResults([]); return }
    setIsKBSearching(true)
    const timer = setTimeout(async () => {
      try {
        const results = await window.electronAPI.kbSearch(query, 3)
        setKBResults(results.map((r) => ({ ...r, selected: true })))
      } catch { setKBResults([]) }
      finally { setIsKBSearching(false) }
    }, 400)
    return () => clearTimeout(timer)
  }, [useKB, coreContent, background])

  // True modal state (not tab-based)
  const [showNewContact, setShowNewContact] = useState(false)
  const [showEditContact, setShowEditContact] = useState(false)
  const [showThreadSave, setShowThreadSave] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  // Contact being edited (for edit dialog)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)

  // Hooks
  const { contacts, createContact, updateContact, deleteContact, refresh: refreshContacts } = useContacts()
  const {
    output,
    isLoading,
    error: generateError,
    skill,
    revisionCount,
    generate,
    revise,
    regenerate,
    reset: resetGenerate,
    setOutput,
  } = useGenerate()
  const { saveThread } = useThreads()

  const contactMode: ContactMode =
    selectedContacts.length === 0 ? 'quick' :
    selectedContacts.length === 1 ? 'single' : 'multi'

  // Update current skill when mode/channel/override changes
  useEffect(() => {
    if (skillOverride) {
      setCurrentSkill(skillOverride)
      return
    }
    window.electronAPI
      .generateDetermineSkill(mode, channel)
      .then((s) => setCurrentSkill(s))
      .catch(() => {})
  }, [mode, channel, skillOverride])

  // Update current skill when generation returns one
  useEffect(() => {
    if (skill) setCurrentSkill(skill)
  }, [skill])

  // Check first launch on mount
  useEffect(() => {
    window.electronAPI.checkFirstLaunch().then(async (result) => {
      if (result.isFirstLaunch) {
        setView('setup')
      } else {
        setVaultPath(result.vaultPath || '')
        try {
          const cfg = await window.electronAPI.configRead()
          setConfig(cfg)
        } catch (err) {
          console.error('Failed to read config:', err)
        }
        setView('main')
      }
    }).catch((err) => {
      console.error('First launch check failed:', err)
      setView('setup')
    })
  }, [])

  const handleSetupComplete = async () => {
    try {
      const cfg = await window.electronAPI.configRead()
      setConfig(cfg)
      const vp = await window.electronAPI.getVaultPath()
      setVaultPath(vp || '')
    } catch (err) {
      console.error('Failed to load config after setup:', err)
    }
    setView('main')
  }

  // === Action Handlers ===

  const handleGenerate = useCallback(async () => {
    const selectedKB = kbResults.filter((r) => r.selected)
    const kb_context = selectedKB.length > 0
      ? selectedKB.map((r) => `### From: ${r.filename}\n${r.fullExcerpt}`).join('\n\n')
      : null
    const request: GenerateRequest = {
      mode,
      contacts: selectedContacts.map((c) => ({ slug: c.slug, name: c.name })),
      channel,
      background,
      content: coreContent,
      message_time: messageTime || null,
      template: selectedTemplate?.type === 'template' ? selectedTemplate.slug : null,
      history_refs: selectedTemplate?.type === 'history' ? [selectedTemplate.filePath] : [],
      attachment_text: refDoc?.text || null,
      email_attachment_filenames: emailAttachments,
      project: null,
      skill_override: skillOverride,
      style_override: styleOverride,
      signature_id: signatureId,
      kb_context,
      include_past_threads: includePastThreads,
      revision: null,
    }
    await generate(request)
  }, [mode, selectedContacts, channel, background, coreContent, messageTime, refDoc, emailAttachments, selectedTemplate, skillOverride, styleOverride, signatureId, kbResults, includePastThreads, generate])

  const handleCopy = useCallback(() => {
    if (output) {
      navigator.clipboard.writeText(output).catch(console.error)
    }
  }, [output])

  const handleReview = useCallback(async () => {
    return window.electronAPI.generateReview({
      draft: output,
      coreContent,
      channel,
      contactSlugs: selectedContacts.map((c) => c.slug),
    })
  }, [output, coreContent, channel, selectedContacts])

  const handleImportEmail = useCallback((email: import('./types').FetchedEmail) => {
    const parts: string[] = []
    if (email.subject) parts.push(`Subject: ${email.subject}`)
    if (email.from || email.fromEmail) parts.push(`From: ${email.from || email.fromEmail}`)
    if (email.date) parts.push(`Date: ${new Date(email.date).toLocaleString()}`)
    if (email.textBody) {
      parts.push('')
      parts.push(email.textBody.trim())
    }
    const formatted = parts.join('\n')
    setBackground((prev) => prev ? `${prev}\n\n---\n\n${formatted}` : formatted)
  }, [])

  const handleSelectFetchedEmail = useCallback(async (email: FetchedEmail) => {
    // 1. Fetch full email body
    let body = email.textBody
    if (!body) {
      try {
        const result = await window.electronAPI.imapFetchBody(email.uid)
        if (result.success) body = result.textBody
      } catch { /* use empty body */ }
    }

    // 2. Match or create contact
    const matched = contacts.find(
      (c) => c.email && c.email.toLowerCase() === email.fromEmail.toLowerCase()
    )
    if (matched) {
      setSelectedContacts([matched])
    } else {
      // No match — open new contact dialog (user can see pre-filled data)
      setSelectedContacts([])
      // We'll still fill the workspace so user can create contact later
    }

    // 3. Fill background
    const parts: string[] = ['--- Incoming Email ---']
    if (email.subject) parts.push(`Subject: ${email.subject}`)
    if (email.from || email.fromEmail) parts.push(`From: ${email.from} <${email.fromEmail}>`)
    if (email.date) parts.push(`Date: ${new Date(email.date).toLocaleString()}`)
    if (body) {
      parts.push('')
      parts.push(body.trim())
    }
    setBackground(parts.join('\n'))

    // 4. Set compose defaults for reply
    setChannel('email')
    setMode('generate')
    setSkillOverride('email-reply')
  }, [contacts])

  const handleSaveDraft = useCallback(async () => {
    if (!output) return
    try {
      await window.electronAPI.draftsSave({
        contactSlugs: selectedContacts.map((c) => c.slug),
        contactNames: selectedContacts.map((c) => c.name),
        channel,
        mode,
        skill: String(currentSkill),
        background,
        coreContent,
        generatedDraft: output,
        messageTime: messageTime || undefined,
      })
      setDraftToast(true)
      setTimeout(() => setDraftToast(false), 3000)
    } catch (err: any) {
      console.error('Draft save failed:', err)
    }
  }, [output, selectedContacts, channel, mode, background, coreContent, messageTime, currentSkill])

  const handleResumeDraft = useCallback((draft: {
    contactSlugs: string[]
    channel: string
    mode: string
    background: string
    coreContent: string
    generatedDraft: string
  }) => {
    const resumeContacts = contacts.filter((c) => draft.contactSlugs.includes(c.slug))
    setSelectedContacts(resumeContacts)
    setChannel(draft.channel as Channel)
    setMode(draft.mode as Mode)
    setBackground(draft.background)
    setCoreContent(draft.coreContent)
    setOutput(draft.generatedDraft)
    setActiveTab('compose')
  }, [contacts, setOutput])

  const handleSaveArchive = useCallback(() => {
    if (!output) return
    setShowThreadSave(true)
  }, [output])

  const handleThreadSaveSubmit = useCallback(async (formData: ThreadSaveFormData) => {
    const params = {
      contactSlugs: selectedContacts.map((c) => c.slug),
      contactNames: selectedContacts.map((c) => c.name),
      direction: formData.direction,
      channel,
      tags: formData.tags,
      subject: formData.subject || undefined,
      background,
      coreContent,
      generatedDraft: output,
      finalVersion: output,
      messageTime: messageTime || undefined,
      skillUsed: String(currentSkill),
      appendToThread: formData.appendToThread,
      saveAsTemplate: formData.saveAsTemplate,
      templateName: formData.templateName,
    }
    const result = await saveThread(params)
    if (!result.success) {
      throw new Error((result as any).error || 'Thread save failed')
    }
    await refreshContacts()
    const toast = { threadFilePath: result.threadFilePath, templateFilePath: result.templateFilePath }
    setSaveToast(toast)
    setTimeout(() => setSaveToast(null), 6000)

  }, [selectedContacts, channel, background, coreContent, output, messageTime, currentSkill, saveThread, refreshContacts])

  const handleNewContactSave = useCallback(async (data: NewContactData) => {
    const contact = await createContact({
      name: data.name,
      email: data.email,
      role: data.role,
      relationship: data.relationship,
      language: data.language,
      channels: data.channels,
      tags: data.tags,
      slug: data.slug,
    } as any)
    setSelectedContacts((prev) => [...prev, contact])
  }, [createContact])

  const handleEditContactSave = useCallback(async (slug: string, data: Partial<Contact>) => {
    await updateContact(slug, data)
    setSelectedContacts((prev) => prev.map((c) => c.slug === slug ? { ...c, ...data } : c))
    if (editingContact?.slug === slug) setEditingContact((prev) => prev ? { ...prev, ...data } : prev)
  }, [updateContact, editingContact])

  const handleDeleteContact = useCallback(async (slug: string) => {
    await deleteContact(slug)
    setSelectedContacts((prev) => prev.filter((c) => c.slug !== slug))
    setEditingContact(null)
  }, [deleteContact])

  // Stable callbacks for memoized child components
  const handleViewHistory = useCallback(() => setShowHistory(true), [])
  const handleCloseHistory = useCallback(() => setShowHistory(false), [])
  const handleEditCurrentContact = useCallback(() => {
    setSelectedContacts((prev) => {
      if (prev.length > 0) {
        setEditingContact(prev[0])
        setShowEditContact(true)
      }
      return prev
    })
  }, [])
  const handleLoadToWorkspace = useCallback(({ background: bg, coreContent: cc }: { background: string; coreContent: string; subject: string }) => {
    setBackground(bg)
    setCoreContent(cc)
    setShowHistory(false)
  }, [])

  // Memoized signatures array — prevents new [] reference each render when config is null
  const signatures = useMemo(() => config?.signatures ?? [], [config])

  // === Keyboard Shortcuts ===
  useEffect(() => {
    if (view !== 'main') return

    const onKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey

      // Escape: close topmost true modal, or return to compose tab
      if (e.key === 'Escape') {
        if (showHelp) { setShowHelp(false); return }
        if (showHistory) { setShowHistory(false); return }
        if (showEditContact) { setShowEditContact(false); return }
        if (showThreadSave) { setShowThreadSave(false); return }
        if (showNewContact) { setShowNewContact(false); return }
        if (activeTab !== 'compose') { setActiveTab('compose'); return }
        return
      }

      if (!isCtrl) return

      if (e.key === 'Enter') {
        e.preventDefault()
        if (!isLoading && activeTab === 'compose') handleGenerate()
      } else if (e.key === 'k' && !e.shiftKey) {
        e.preventDefault()
        setActiveTab('search')
      } else if (e.key === 'S' && e.shiftKey) {
        e.preventDefault()
        handleSaveArchive()
      } else if (e.key === 'd' && !e.shiftKey) {
        e.preventDefault()
        handleSaveDraft()
      } else if (e.key === ',') {
        e.preventDefault()
        setActiveTab('settings')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    view, isLoading, activeTab,
    showHelp, showHistory, showEditContact, showThreadSave, showNewContact,
    handleGenerate, handleSaveArchive, handleSaveDraft,
  ])

  // Loading screen
  if (view === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-asu-maroon/20 border-t-asu-maroon rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // Setup wizard
  if (view === 'setup') {
    return <SetupWizard onComplete={handleSetupComplete} />
  }

  // Main UI
  return (
    <div className="h-screen flex flex-col">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isDark={isDark}
        onToggleDark={() => setIsDark((d) => !d)}
        onHelpClick={() => setShowHelp(true)}
      />

      {/* Tab content area */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">

        {/* Compose tab — always mounted, hidden when inactive */}
        <div className={`flex-1 flex flex-col min-h-0 ${activeTab === 'compose' ? '' : 'hidden'}`}>
          <MainLayout
            inputPanel={
              <InputPanel
                mode={mode}
                onModeChange={setMode}
                channel={channel}
                onChannelChange={setChannel}
                contacts={contacts}
                selectedContacts={selectedContacts}
                onContactsChange={setSelectedContacts}
                onNewContact={() => setShowNewContact(true)}
                contactMode={contactMode}
                background={background}
                onBackgroundChange={setBackground}
                coreContent={coreContent}
                onCoreContentChange={setCoreContent}
                messageTime={messageTime}
                onMessageTimeChange={setMessageTime}
                selectedTemplate={selectedTemplate}
                onTemplateChange={setSelectedTemplate}
                refDoc={refDoc}
                onAttachRefDoc={setRefDoc}
                onRemoveRefDoc={() => setRefDoc(null)}
                emailAttachments={emailAttachments}
                onAddEmailAttachment={(f) => setEmailAttachments((prev) => [...prev, f])}
                onRemoveEmailAttachment={(f) => setEmailAttachments((prev) => prev.filter((x) => x !== f))}
                skillOverride={skillOverride}
                onSkillOverrideChange={setSkillOverride}
                styleOverride={styleOverride}
                onStyleOverrideChange={setStyleOverride}
                useKB={useKB}
                onUseKBChange={setUseKB}
                kbResults={kbResults}
                onKBResultToggle={(i) => setKBResults((prev) => prev.map((r, idx) => idx === i ? { ...r, selected: !r.selected } : r))}
                isKBSearching={isKBSearching}
                includePastThreads={includePastThreads}
                onIncludePastThreadsChange={setIncludePastThreads}
                onSelectEmail={handleSelectFetchedEmail}
                onGenerate={handleGenerate}
                isLoading={isLoading}
              />
            }
            outputPanel={
              <div className="flex flex-col h-full">
                <TemplateRefPanel
                  selectedTemplate={selectedTemplate}
                  onClear={() => setSelectedTemplate(null)}
                />
                <OutputPanel
                  output={output}
                  isLoading={isLoading}
                  error={generateError}
                  channel={channel}
                  revisionCount={revisionCount}
                  onOutputChange={setOutput}
                  onRevise={revise}
                  onRegenerate={regenerate}
                  onCopy={handleCopy}
                  onSaveDraft={handleSaveDraft}
                  onSaveArchive={handleSaveArchive}
                  onReview={handleReview}
                  signatures={signatures}
                  signatureId={signatureId}
                  onSignatureIdChange={setSignatureId}
                  contactName={selectedContacts[0]?.name ?? ''}
                />
                {contactMode === 'single' && selectedContacts[0] && (
                  <ContactInfoPanel
                    contact={selectedContacts[0]}
                    onViewHistory={handleViewHistory}
                    onEdit={handleEditCurrentContact}
                    onImportEmail={handleImportEmail}
                  />
                )}
              </div>
            }
          />
          <StatusBar
            skill={currentSkill}
            contactMode={contactMode}
            contactName={selectedContacts.map((c) => c.name).join(', ')}
            channel={channel}
          />
        </div>

        {/* Contacts tab */}
        {activeTab === 'contacts' && (
          <ContactsPage
            contacts={contacts}
            onNewContact={() => setShowNewContact(true)}
            onEditContact={(c) => { setEditingContact(c); setShowEditContact(true) }}
            onSelectContact={(c) => { setSelectedContacts([c]); setActiveTab('compose') }}
          />
        )}

        {/* Drafts tab */}
        {activeTab === 'drafts' && (
          <DraftsPage
            onResume={handleResumeDraft}
          />
        )}

        {/* Projects tab */}
        {activeTab === 'projects' && (
          <ProjectsPage
            contacts={contacts}
            onSelectContact={(c) => { setSelectedContacts([c]); setActiveTab('compose') }}
          />
        )}

        {/* Search tab */}
        {activeTab === 'search' && (
          <SearchPanel
            contacts={contacts}
            onSelectContact={(contact) => { setSelectedContacts([contact]); setActiveTab('compose') }}
            onOpenHistory={() => setShowHistory(true)}
            onNavigate={() => setActiveTab('compose')}
          />
        )}

        {/* Analytics tab */}
        {activeTab === 'analytics' && (
          <AnalyticsPage />
        )}

        {/* Settings tab */}
        {activeTab === 'settings' && (
          <SettingsPage
            config={config}
            onSave={async (updatedConfig) => {
              await window.electronAPI.configWrite(updatedConfig)
              setConfig(updatedConfig)
            }}
            onOpenHelp={() => setShowHelp(true)}
          />
        )}

      </div>

      {/* True modal dialogs */}
      <NewContactDialog
        isOpen={showNewContact}
        onClose={() => setShowNewContact(false)}
        onSave={handleNewContactSave}
      />

      <ThreadSaveDialog
        isOpen={showThreadSave}
        onClose={() => setShowThreadSave(false)}
        onSave={handleThreadSaveSubmit}
        contacts={selectedContacts}
      />

      <HistoryPanel
        isOpen={showHistory}
        contact={contactMode === 'single' ? selectedContacts[0] : null}
        onClose={handleCloseHistory}
        onLoadToWorkspace={handleLoadToWorkspace}
      />

      <EditContactDialog
        isOpen={showEditContact}
        onClose={() => { setShowEditContact(false); setEditingContact(null) }}
        contact={editingContact}
        onSave={handleEditContactSave}
        onDelete={handleDeleteContact}
      />

      {/* Save & Archive success toast */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-4 max-w-sm animate-fade-in">
          <div className="flex items-start gap-3">
            <span className="text-green-500 text-xl shrink-0">✓</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 mb-1">Saved successfully</p>
              {saveToast.threadFilePath && (
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs text-gray-500 truncate">{saveToast.threadFilePath.split(/[/\\]/).slice(-3).join(' › ')}</span>
                  <button
                    onClick={() => window.electronAPI.filesShowInFolder(saveToast.threadFilePath!)}
                    className="text-xs text-asu-maroon hover:underline shrink-0"
                  >
                    Show
                  </button>
                </div>
              )}
              {saveToast.templateFilePath && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500 truncate">📋 {saveToast.templateFilePath.split(/[/\\]/).slice(-2).join(' › ')}</span>
                  <button
                    onClick={() => window.electronAPI.filesShowInFolder(saveToast.templateFilePath!)}
                    className="text-xs text-asu-maroon hover:underline shrink-0"
                  >
                    Show
                  </button>
                </div>
              )}
            </div>
            <button onClick={() => setSaveToast(null)} className="text-gray-400 hover:text-gray-600 shrink-0 text-base leading-none">×</button>
          </div>
        </div>
      )}

      {/* Help / User Guide dialog */}
      <DraggableDialog
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="User Guide"
        subtitle="Email KB Assistant — Quick Reference"
        maxWidth="max-w-2xl"
      >
        <HelpPage />
      </DraggableDialog>

      {/* Draft saved toast */}
      {draftToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm px-4 py-2 rounded-lg shadow-lg animate-fade-in">
          Draft saved — resume from 📑 Drafts
        </div>
      )}
    </div>
  )
}

export default App
