import React, { useState, useEffect, useCallback } from 'react'
import type { StyleInfo, StyleProfile, StyleExample, StyleExampleInput } from '../../types'

type Channel = 'email' | 'conversation'
type Language = 'english' | 'chinese'
type StyleTab = 'rules' | 'examples' | 'auto'

const RELATIONSHIPS = [
  { value: 'colleague-close',  label: 'Colleague (close)' },
  { value: 'colleague-formal', label: 'Colleague (formal)' },
  { value: 'student',          label: 'Student' },
  { value: 'admin',            label: 'Admin / Institutional' },
]

const CHANNELS = [
  { value: 'email',        label: 'Email' },
  { value: 'conversation', label: 'WeChat / Slack / Zoom' },
]

const EMPTY_EXAMPLE: { context: string; channel: Channel; language: Language; content: string } = {
  context: '', channel: 'email', language: 'english', content: '',
}

export default function WritingStylePage() {
  // ── Styles list ───────────────────────────────────────────────────────────
  const [styles, setStyles]           = useState<StyleInfo[]>([])
  const [selectedSlug, setSelectedSlug] = useState<string>('')
  const [loadingList, setLoadingList] = useState(true)

  // ── Selected style data ───────────────────────────────────────────────────
  const [profile, setProfile]         = useState<StyleProfile>({ rules: '', analyzedPatterns: '', exampleCount: 0 })
  const [examples, setExamples]       = useState<StyleExample[]>([])
  const [activeTab, setActiveTab]     = useState<StyleTab>('rules')
  const [loadingStyle, setLoadingStyle] = useState(false)

  // ── Rules tab ─────────────────────────────────────────────────────────────
  const [rulesText, setRulesText]     = useState('')
  const [isSavingRules, setIsSavingRules] = useState(false)
  const [savedRules, setSavedRules]   = useState(false)

  // ── Examples tab ─────────────────────────────────────────────────────────
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm]         = useState({ ...EMPTY_EXAMPLE })
  const [isSavingEx, setIsSavingEx]   = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeResult, setAnalyzeResult] = useState<string | null>(null)
  const [analyzeError, setAnalyzeError]   = useState<string | null>(null)

  // ── Auto tab ──────────────────────────────────────────────────────────────
  const [autoRelationships, setAutoRelationships] = useState<string[]>([])
  const [autoChannels, setAutoChannels]           = useState<string[]>([])
  const [isSavingAuto, setIsSavingAuto]           = useState(false)
  const [savedAuto, setSavedAuto]                 = useState(false)

  // ── New style form ────────────────────────────────────────────────────────
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName]         = useState('')
  const [newDesc, setNewDesc]         = useState('')
  const [isCreating, setIsCreating]   = useState(false)

  // ── Default / delete ──────────────────────────────────────────────────────
  const [isSettingDefault, setIsSettingDefault] = useState(false)
  const [isDeletingStyle, setIsDeletingStyle]   = useState(false)

  // ────────────────────────────────────────────────────────────────────────

  const loadStyleList = useCallback(async () => {
    try {
      const list = await window.electronAPI.styleList()
      setStyles(list)
      if (list.length > 0 && !selectedSlug) {
        const def = list.find((s) => s.isDefault) ?? list[0]
        setSelectedSlug(def.slug)
      }
    } catch (err) {
      console.error('Failed to load styles:', err)
    } finally {
      setLoadingList(false)
    }
  }, [selectedSlug])

  const loadStyleDetails = useCallback(async (slug: string) => {
    setLoadingStyle(true)
    setAnalyzeResult(null)
    setAnalyzeError(null)
    try {
      const [p, e] = await Promise.all([
        window.electronAPI.styleGet(slug),
        window.electronAPI.styleListExamples(slug),
      ])
      setProfile(p)
      setRulesText(p.rules)
      setExamples(e)
      // Load auto conditions from styles list
      const si = styles.find((s) => s.slug === slug)
      setAutoRelationships(si?.autoApplyFor?.relationship ?? [])
      setAutoChannels(si?.autoApplyFor?.channel ?? [])
    } catch (err) {
      console.error('Failed to load style details:', err)
    } finally {
      setLoadingStyle(false)
    }
  }, [styles])

  useEffect(() => {
    loadStyleList()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedSlug) {
      loadStyleDetails(selectedSlug)
    }
  }, [selectedSlug]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSelectStyle = (slug: string) => {
    setSelectedSlug(slug)
    setActiveTab('rules')
    setShowAddForm(false)
    setAddForm({ ...EMPTY_EXAMPLE })
    setSavedRules(false)
  }

  const handleSaveRules = async () => {
    setIsSavingRules(true)
    try {
      await window.electronAPI.styleSaveRules(selectedSlug, rulesText)
      setProfile((p) => ({ ...p, rules: rulesText }))
      setSavedRules(true)
      setTimeout(() => setSavedRules(false), 2500)
    } catch (err: any) {
      console.error('Save rules error:', err)
    } finally {
      setIsSavingRules(false)
    }
  }

  const handleAddExample = async () => {
    if (!addForm.context.trim() || !addForm.content.trim()) return
    setIsSavingEx(true)
    try {
      const input: StyleExampleInput = {
        context: addForm.context.trim(),
        channel: addForm.channel,
        language: addForm.language,
        content: addForm.content.trim(),
      }
      await window.electronAPI.styleAddExample(selectedSlug, input)
      const e = await window.electronAPI.styleListExamples(selectedSlug)
      setExamples(e)
      setProfile((p) => ({ ...p, exampleCount: e.length }))
      setAddForm({ ...EMPTY_EXAMPLE })
      setShowAddForm(false)
    } catch (err: any) {
      console.error('Add example error:', err)
    } finally {
      setIsSavingEx(false)
    }
  }

  const handleDeleteExample = async (fileName: string) => {
    try {
      await window.electronAPI.styleDeleteExample(selectedSlug, fileName)
      setExamples((prev) => prev.filter((e) => e.fileName !== fileName))
      setProfile((p) => ({ ...p, exampleCount: p.exampleCount - 1 }))
    } catch (err: any) {
      console.error('Delete example error:', err)
    }
  }

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    setAnalyzeResult(null)
    setAnalyzeError(null)
    try {
      const result = await window.electronAPI.styleAnalyze(selectedSlug)
      setAnalyzeResult(result.patterns)
      setProfile((p) => ({ ...p, analyzedPatterns: result.patterns }))
    } catch (err: any) {
      setAnalyzeError(err.message || 'Analysis failed')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSaveAuto = async () => {
    setIsSavingAuto(true)
    try {
      await window.electronAPI.styleSaveAutoApply(selectedSlug, {
        relationship: autoRelationships,
        channel: autoChannels,
      })
      setSavedAuto(true)
      setTimeout(() => setSavedAuto(false), 2500)
      // Refresh style list to update autoApplyFor
      await loadStyleList()
    } catch (err: any) {
      console.error('Save auto error:', err)
    } finally {
      setIsSavingAuto(false)
    }
  }

  const handleSetDefault = async () => {
    setIsSettingDefault(true)
    try {
      await window.electronAPI.styleSetDefault(selectedSlug)
      setStyles((prev) => prev.map((s) => ({ ...s, isDefault: s.slug === selectedSlug })))
    } catch (err: any) {
      console.error('Set default error:', err)
    } finally {
      setIsSettingDefault(false)
    }
  }

  const handleDeleteStyle = async () => {
    if (!confirm(`Delete style "${styles.find((s) => s.slug === selectedSlug)?.name}"? This will also delete all its examples.`)) return
    setIsDeletingStyle(true)
    try {
      await window.electronAPI.styleDelete(selectedSlug)
      const updated = styles.filter((s) => s.slug !== selectedSlug)
      setStyles(updated)
      if (updated.length > 0) {
        const def = updated.find((s) => s.isDefault) ?? updated[0]
        setSelectedSlug(def.slug)
      }
    } catch (err: any) {
      console.error('Delete style error:', err)
    } finally {
      setIsDeletingStyle(false)
    }
  }

  const handleCreateStyle = async () => {
    if (!newName.trim()) return
    setIsCreating(true)
    try {
      const newStyle = await window.electronAPI.styleCreate(newName.trim(), newDesc.trim())
      setStyles((prev) => [...prev, newStyle])
      setSelectedSlug(newStyle.slug)
      setActiveTab('rules')
      setNewName('')
      setNewDesc('')
      setShowNewForm(false)
    } catch (err: any) {
      console.error('Create style error:', err)
    } finally {
      setIsCreating(false)
    }
  }

  const toggleAutoRelationship = (value: string) => {
    setAutoRelationships((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  const toggleAutoChannel = (value: string) => {
    setAutoChannels((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const selectedStyleInfo = styles.find((s) => s.slug === selectedSlug)
  const rulesChanged = rulesText !== profile.rules
  const canAnalyze = examples.length >= 3

  if (loadingList) {
    return <div className="p-6 text-sm text-gray-400">Loading writing styles...</div>
  }

  return (
    <div className="flex h-full min-h-0 gap-0">
      {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
      <div className="w-44 shrink-0 border-r border-gray-200 flex flex-col bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
        <div className="px-3 pt-4 pb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">My Styles</span>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
          {styles.map((s) => (
            <button
              key={s.slug}
              onClick={() => handleSelectStyle(s.slug)}
              className={`w-full text-left px-2.5 py-2 rounded text-sm flex items-center gap-1.5 transition-colors
                ${s.slug === selectedSlug
                  ? 'bg-asu-maroon text-white font-medium'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
            >
              {s.isDefault && (
                <span className={`text-xs ${s.slug === selectedSlug ? 'text-yellow-300' : 'text-yellow-500'}`}>★</span>
              )}
              <span className="truncate">{s.name}</span>
            </button>
          ))}
        </div>

        <div className="p-2 border-t border-gray-200 dark:border-gray-700">
          {showNewForm ? (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Style name *"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="input-field text-xs w-full"
                autoFocus
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="input-field text-xs w-full"
              />
              <div className="flex gap-1">
                <button
                  onClick={handleCreateStyle}
                  disabled={isCreating || !newName.trim()}
                  className="btn-primary text-xs px-2 py-1 flex-1 disabled:opacity-40"
                >
                  {isCreating ? '...' : 'Create'}
                </button>
                <button
                  onClick={() => { setShowNewForm(false); setNewName(''); setNewDesc('') }}
                  className="btn-secondary text-xs px-2 py-1"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewForm(true)}
              className="w-full text-xs text-asu-maroon font-medium hover:underline text-left px-1 py-1"
            >
              + New Style
            </button>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedStyleInfo ? (
          <div className="p-6 text-sm text-gray-400">Select or create a writing style.</div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 pt-4 pb-0 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {selectedStyleInfo.name}
                  {selectedStyleInfo.isDefault && <span className="ml-2 text-xs text-yellow-500 font-normal">★ Default</span>}
                </h3>
                {selectedStyleInfo.description && (
                  <p className="text-xs text-gray-400 mt-0.5">{selectedStyleInfo.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!selectedStyleInfo.isDefault && (
                  <button
                    onClick={handleSetDefault}
                    disabled={isSettingDefault}
                    className="text-xs text-gray-500 hover:text-yellow-600 transition-colors disabled:opacity-40"
                    title="Set as default style"
                  >
                    {isSettingDefault ? '...' : '☆ Set default'}
                  </button>
                )}
                {styles.length > 1 && (
                  <button
                    onClick={handleDeleteStyle}
                    disabled={isDeletingStyle}
                    className="text-xs text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
                    title="Delete this style"
                  >
                    {isDeletingStyle ? '...' : '🗑 Delete'}
                  </button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="px-5 mt-3 flex gap-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              {(['rules', 'examples', 'auto'] as StyleTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-xs pb-2 font-medium capitalize border-b-2 transition-colors -mb-px
                    ${activeTab === tab
                      ? 'border-asu-maroon text-asu-maroon'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                  {tab === 'rules' ? 'Style Rules' : tab === 'examples' ? `Examples (${examples.length})` : 'Auto-Apply'}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {loadingStyle ? (
              <div className="p-5 text-sm text-gray-400">Loading...</div>
            ) : (
              <div className="flex-1 overflow-y-auto p-5">

                {/* ── RULES TAB ────────────────────────────────────────── */}
                {activeTab === 'rules' && (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-400">
                      Explicit directives applied to every generation using this style. Write in plain language.
                      Example: <em>"Always lead with the main point. Keep emails under 200 words."</em>
                    </p>
                    <textarea
                      value={rulesText}
                      onChange={(e) => setRulesText(e.target.value)}
                      rows={8}
                      placeholder="Write your style rules here, one per line or as bullet points..."
                      className="input-field w-full font-mono text-sm resize-y"
                    />
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSaveRules}
                        disabled={isSavingRules || !rulesChanged}
                        className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isSavingRules ? 'Saving...' : 'Save Rules'}
                      </button>
                      {savedRules && <span className="text-xs text-green-600 font-medium">✓ Saved</span>}
                      {rulesChanged && !isSavingRules && (
                        <span className="text-xs text-amber-500">Unsaved changes</span>
                      )}
                    </div>

                    {/* Analyzed patterns (read-only) */}
                    {(profile.analyzedPatterns && !analyzeResult) && (
                      <div className="mt-4">
                        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Analyzed Style Patterns</h4>
                        <p className="text-xs text-gray-400 mb-2">Auto-generated from your example emails.</p>
                        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-3 text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                          {profile.analyzedPatterns}
                        </div>
                      </div>
                    )}
                    {analyzeResult && (
                      <div className="mt-4">
                        <span className="text-green-600 font-medium text-sm">✓ Style Analysis Complete</span>
                        <div className="mt-1 bg-green-50 border border-green-200 rounded p-3 text-xs text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                          {analyzeResult}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── EXAMPLES TAB ─────────────────────────────────────── */}
                {activeTab === 'examples' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400">
                        Paste emails you've written. At least 3 are needed for style analysis.{' '}
                        <span className={`font-medium ${canAnalyze ? 'text-green-600' : 'text-amber-500'}`}>
                          {examples.length} / 3 minimum
                        </span>
                      </p>
                      <button
                        onClick={() => setShowAddForm((v) => !v)}
                        className="text-xs text-asu-maroon font-medium hover:underline shrink-0"
                      >
                        {showAddForm ? '✕ Cancel' : '+ Add Example'}
                      </button>
                    </div>

                    {/* Add example form */}
                    {showAddForm && (
                      <div className="border border-asu-maroon/30 rounded p-4 bg-asu-maroon/5 space-y-3">
                        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">New Example</h4>
                        <div>
                          <label className="text-xs font-medium text-gray-600 block mb-1">Context *</label>
                          <input
                            type="text"
                            value={addForm.context}
                            onChange={(e) => setAddForm((f) => ({ ...f, context: e.target.value }))}
                            placeholder="e.g., Reply to faculty about scheduling"
                            className="input-field text-sm w-full"
                          />
                        </div>
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="text-xs font-medium text-gray-600 block mb-1">Channel</label>
                            <select
                              value={addForm.channel}
                              onChange={(e) => setAddForm((f) => ({ ...f, channel: e.target.value as Channel }))}
                              className="input-field text-sm w-full"
                            >
                              <option value="email">Email</option>
                              <option value="conversation">Conversation</option>
                            </select>
                          </div>
                          <div className="flex-1">
                            <label className="text-xs font-medium text-gray-600 block mb-1">Language</label>
                            <select
                              value={addForm.language}
                              onChange={(e) => setAddForm((f) => ({ ...f, language: e.target.value as Language }))}
                              className="input-field text-sm w-full"
                            >
                              <option value="english">English</option>
                              <option value="chinese">Chinese</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 block mb-1">Email Content *</label>
                          <textarea
                            value={addForm.content}
                            onChange={(e) => setAddForm((f) => ({ ...f, content: e.target.value }))}
                            rows={7}
                            placeholder="Paste the full email you wrote here..."
                            className="input-field text-sm w-full resize-y font-mono"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleAddExample}
                            disabled={isSavingEx || !addForm.context.trim() || !addForm.content.trim()}
                            className="btn-primary text-sm disabled:opacity-40"
                          >
                            {isSavingEx ? 'Saving...' : 'Save Example'}
                          </button>
                          <button
                            onClick={() => { setShowAddForm(false); setAddForm({ ...EMPTY_EXAMPLE }) }}
                            className="btn-secondary text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Example list */}
                    {examples.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No examples yet. Add some emails above.</p>
                    ) : (
                      <div className="space-y-2">
                        {examples.map((ex) => (
                          <div
                            key={ex.fileName}
                            className="border border-gray-200 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-800 flex items-start justify-between gap-3"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{ex.context || 'Untitled'}</span>
                                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-1.5 py-0.5 rounded capitalize">{ex.channel}</span>
                                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-1.5 py-0.5 rounded capitalize">{ex.language}</span>
                              </div>
                              <p className="text-xs text-gray-400 mt-1 truncate">{ex.contentPreview}…</p>
                            </div>
                            <button
                              onClick={() => handleDeleteExample(ex.fileName)}
                              className="text-gray-300 hover:text-red-500 text-xs transition-colors shrink-0 mt-0.5"
                            >✕</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Analyze button */}
                    <div className="pt-2">
                      {analyzeError && <p className="text-xs text-red-500 mb-2">{analyzeError}</p>}
                      <button
                        onClick={handleAnalyze}
                        disabled={!canAnalyze || isAnalyzing}
                        className="btn-primary text-sm disabled:opacity-40 flex items-center gap-2"
                      >
                        {isAnalyzing ? (
                          <>
                            <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Analyzing...
                          </>
                        ) : '🧠 Analyze My Style'}
                      </button>
                      {!canAnalyze && (
                        <p className="text-xs text-gray-400 mt-1">
                          Add {3 - examples.length} more example{3 - examples.length !== 1 ? 's' : ''} to enable analysis.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* ── AUTO-APPLY TAB ────────────────────────────────────── */}
                {activeTab === 'auto' && (
                  <div className="space-y-5 max-w-md">
                    <p className="text-xs text-gray-400">
                      Automatically apply this style when composing messages for contacts with these traits.
                      Leave all unchecked to use only when manually selected.
                    </p>

                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Contact Relationship</h4>
                      <div className="space-y-1.5">
                        {RELATIONSHIPS.map((r) => (
                          <label key={r.value} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={autoRelationships.includes(r.value)}
                              onChange={() => toggleAutoRelationship(r.value)}
                              className="rounded border-gray-300 text-asu-maroon focus:ring-asu-maroon"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{r.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Channel</h4>
                      <div className="space-y-1.5">
                        {CHANNELS.map((c) => (
                          <label key={c.value} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={autoChannels.includes(c.value)}
                              onChange={() => toggleAutoChannel(c.value)}
                              className="rounded border-gray-300 text-asu-maroon focus:ring-asu-maroon"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{c.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSaveAuto}
                        disabled={isSavingAuto}
                        className="btn-primary text-sm disabled:opacity-40"
                      >
                        {isSavingAuto ? 'Saving...' : 'Save Auto-Apply'}
                      </button>
                      {savedAuto && <span className="text-xs text-green-600 font-medium">✓ Saved</span>}
                    </div>
                  </div>
                )}

              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
