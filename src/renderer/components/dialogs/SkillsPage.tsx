import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

// ── Starter templates for new skills ─────────────────────────────────────────

const SKILL_TEMPLATES = {
  email: `# Skill: [Your Skill Name]

## Task
Write professional emails for [specific use case].

## Input
The user provides:
- Context/background about the situation
- Key points to include
- Recipient relationship

## Output
Generate a complete email with:
- Subject line
- Professional greeting
- Clear, structured body
- Appropriate closing and signature placeholder

## Rules
- Match the tone to the recipient's relationship (formal/informal)
- Keep the email focused and under 300 words
- Use active voice
- End with a clear call-to-action or next step
`,
  document: `# Skill: [Your Skill Name]

## Task
Generate a professional document for [specific use case].

## Input
The user provides:
- Document purpose and audience
- Key content points
- Any specific requirements or constraints

## Output
Produce a well-structured document with:
- Clear title and introduction
- Organized sections with headings
- Professional language throughout
- Conclusion or summary

## Rules
- Use clear, professional language
- Structure content logically with headers
- Include all key points from the input
- Adapt formality level to the intended audience
- Use markdown formatting for structure
`,
  blank: `# Skill: [Your Skill Name]

## Task


## Input


## Output


## Rules

`,
}

type SkillTemplateKey = keyof typeof SKILL_TEMPLATES

const PROTECTED_SLUGS = new Set(['_base', 'reviewer', 'polish'])

function nameToSkillSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50) || 'custom-skill'
}

interface SkillMeta {
  slug: string
  name: string
  preview: string
  isDefault: boolean
  isBase: boolean
}

interface SkillDetail {
  slug: string
  name: string
  content: string
  isDefault: boolean
  isBase: boolean
  defaultContent: string | null
}

export default function SkillsPage() {
  const { t } = useTranslation()
  const [skills, setSkills] = useState<SkillMeta[]>([])
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [detail, setDetail] = useState<SkillDetail | null>(null)
  const [editContent, setEditContent] = useState('')
  const [isLoadingContent, setIsLoadingContent] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [filter, setFilter] = useState('')

  // Delete / Rename
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameInput, setRenameInput] = useState('')
  const [isSavingRename, setIsSavingRename] = useState(false)
  const [renameError, setRenameError] = useState<string | null>(null)

  // New skill creation
  const [showNewSkillForm, setShowNewSkillForm] = useState(false)
  const [newSkillName, setNewSkillName] = useState('')
  const [newSkillTemplate, setNewSkillTemplate] = useState<SkillTemplateKey>('blank')
  const [newSkillContent, setNewSkillContent] = useState(SKILL_TEMPLATES.blank)
  const [isCreatingSkill, setIsCreatingSkill] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const loadSkills = useCallback(async () => {
    try {
      const list = await window.electronAPI.skillsList()
      setSkills(list)
    } catch (err) {
      console.error('Failed to load skills:', err)
    }
  }, [])

  useEffect(() => {
    loadSkills()
    setSelectedSlug(null)
    setDetail(null)
    setEditContent('')
    setIsDirty(false)
    setSaveError(null)
    setFilter('')
    setShowResetConfirm(false)
  }, [loadSkills])

  const handleSelectSkill = useCallback(async (slug: string) => {
    if (isDirty && !window.confirm('Discard unsaved changes?')) return
    setSelectedSlug(slug)
    setIsDirty(false)
    setSaveError(null)
    setShowResetConfirm(false)
    setIsRenaming(false)
    setRenameError(null)
    setIsLoadingContent(true)
    try {
      const result = await window.electronAPI.skillsGet(slug)
      setDetail(result)
      setEditContent(result?.content ?? '')
    } catch {
      setEditContent('')
      setDetail(null)
    } finally {
      setIsLoadingContent(false)
    }
  }, [isDirty])

  const handleSave = async () => {
    if (!selectedSlug) return
    setSaveError(null)
    setIsSaving(true)
    try {
      await window.electronAPI.skillsSave(selectedSlug, editContent)
      setIsDirty(false)
      setShowResetConfirm(false)
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = async () => {
    if (!selectedSlug) return
    try {
      const result = await window.electronAPI.skillsReset(selectedSlug)
      setEditContent(result.content)
      setIsDirty(false)
      setShowResetConfirm(false)
      setSaveError(null)
    } catch (err: any) {
      setSaveError(err.message || 'Failed to reset')
    }
  }

  const handleOpenNewSkill = () => {
    if (isDirty && !window.confirm('Discard unsaved changes?')) return
    setSelectedSlug(null)
    setDetail(null)
    setEditContent('')
    setIsDirty(false)
    setNewSkillName('')
    setNewSkillTemplate('blank')
    setNewSkillContent(SKILL_TEMPLATES.blank)
    setCreateError(null)
    setShowNewSkillForm(true)
  }

  const handleDeleteSkill = async () => {
    if (!selectedSlug) return
    if (!window.confirm(`Delete skill "${detail?.name ?? selectedSlug}"? This cannot be undone.`)) return
    setIsDeleting(true)
    setSaveError(null)
    try {
      await window.electronAPI.skillsDelete(selectedSlug)
      await loadSkills()
      setSelectedSlug(null)
      setDetail(null)
      setEditContent('')
      setIsDirty(false)
    } catch (err: any) {
      setSaveError(err.message || 'Failed to delete skill')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleStartRename = () => {
    setRenameInput(detail?.name ?? selectedSlug ?? '')
    setRenameError(null)
    setIsRenaming(true)
  }

  const handleSaveRename = async () => {
    if (!selectedSlug) return
    const newName = renameInput.trim()
    if (!newName) { setRenameError('Name is required'); return }
    setIsSavingRename(true)
    setRenameError(null)
    try {
      const result = await window.electronAPI.skillsRename(selectedSlug, newName)
      await loadSkills()
      setIsRenaming(false)
      await handleSelectSkill(result.newSlug)
    } catch (err: any) {
      setRenameError(err.message || 'Failed to rename')
    } finally {
      setIsSavingRename(false)
    }
  }

  const handleTemplateChange = (tmpl: SkillTemplateKey) => {
    setNewSkillTemplate(tmpl)
    setNewSkillContent(
      SKILL_TEMPLATES[tmpl].replace('[Your Skill Name]', newSkillName || 'Your Skill Name')
    )
  }

  const handleCreateSkill = async () => {
    const name = newSkillName.trim()
    if (!name) { setCreateError('Skill name is required'); return }
    if (newSkillContent.length < 100) {
      if (!window.confirm('This skill seems very brief. More detailed instructions produce better results. Create anyway?')) return
    }
    if (!newSkillContent.includes('# Skill:')) {
      setCreateError('Content must include a "# Skill:" header line.')
      return
    }

    const baseSlug = nameToSkillSlug(name)
    // Check for duplicates
    let slug = baseSlug
    let n = 2
    while (skills.some((s) => s.slug === slug)) slug = `${baseSlug}-${n++}`

    setIsCreatingSkill(true)
    setCreateError(null)
    try {
      const content = newSkillContent.replace('[Your Skill Name]', name)
      await window.electronAPI.skillsSave(slug, content)
      await loadSkills()
      setShowNewSkillForm(false)
      setNewSkillName('')
      // Select the newly created skill
      await handleSelectSkill(slug)
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create skill')
    } finally {
      setIsCreatingSkill(false)
    }
  }

  const filteredSkills = filter.trim()
    ? skills.filter(
        (s) =>
          s.name.toLowerCase().includes(filter.toLowerCase()) ||
          s.slug.toLowerCase().includes(filter.toLowerCase())
      )
    : skills

  const isModifiedFromDefault =
    detail?.defaultContent !== null &&
    detail?.defaultContent !== undefined &&
    editContent !== detail.defaultContent

  const canDeleteRename = selectedSlug !== null && !PROTECTED_SLUGS.has(selectedSlug)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/10 shrink-0">
        <h3 className="section-heading">{t('skills.title')}</h3>
        <p className="text-xs text-white/40 mt-0.5">{t('skills.subtitle')}</p>
      </div>

      {/* Body: two-pane */}
      <div className="flex flex-1 min-h-0">
        {/* Left: skill list */}
        <div className="w-64 border-r border-white/10 flex flex-col shrink-0">
          <div className="p-3 border-b border-white/10">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t('skills.filterPlaceholder')}
              className="input-field text-sm"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredSkills.length === 0 ? (
              <p className="text-xs text-white/40 p-4 text-center">{t('skills.noSkills')}</p>
            ) : (
              filteredSkills.map((s) => (
                <button
                  key={s.slug}
                  onClick={() => { setShowNewSkillForm(false); handleSelectSkill(s.slug) }}
                  className={`
                    w-full text-left px-4 py-3 border-b border-white/10 hover:bg-white/5 transition-colors
                    ${selectedSlug === s.slug && !showNewSkillForm ? 'bg-asu-gold/10 border-l-2 border-l-asu-gold' : ''}
                  `}
                >
                  <div className="flex items-center gap-1.5">
                    {s.isBase && <span className="text-xs text-asu-gold font-bold">★</span>}
                    <p className="text-sm font-medium text-white/80 truncate">{s.name}</p>
                  </div>
                  {s.preview && (
                    <p className="text-xs text-white/40 truncate mt-0.5">{s.preview}</p>
                  )}
                </button>
              ))
            )}
          </div>
          {/* New skill button */}
          <div className="p-3 border-t border-white/10 shrink-0">
            <button
              onClick={handleOpenNewSkill}
              className={`w-full text-xs font-medium py-1.5 rounded transition-colors
                ${showNewSkillForm
                  ? 'bg-asu-gold text-black'
                  : 'text-asu-gold border border-asu-gold/30 hover:bg-asu-gold/5'
                }`}
            >
              {t('skills.new')}
            </button>
          </div>
        </div>

        {/* Right: editor or new-skill form */}
        <div className="flex-1 flex flex-col min-w-0">
          {showNewSkillForm ? (
            <>
              {/* New skill form header */}
              <div className="px-5 py-3 border-b border-white/10 shrink-0">
                <h3 className="text-sm font-medium text-asu-gold">{t('skills.new')}</h3>
                {newSkillName.trim() && (
                  <p className="text-xs text-white/40 font-mono mt-0.5">
                    {nameToSkillSlug(newSkillName)}.md
                  </p>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Warning banner */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-400 leading-relaxed">
                  <span className="font-semibold">Tip:</span> Skills are Markdown prompt files.
                  Use <code className="bg-amber-500/20 px-1 rounded"># Skill:</code> as the first line,
                  then describe the task, input, output, and rules. More detail = better results.
                </div>

                {/* Skill name */}
                <div>
                  <label className="section-label">{t('skills.skillName')} <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={newSkillName}
                    onChange={(e) => {
                      setNewSkillName(e.target.value)
                      setCreateError(null)
                      // Update content placeholder if user hasn't edited template yet
                      const updated = SKILL_TEMPLATES[newSkillTemplate].replace(
                        '[Your Skill Name]',
                        e.target.value || 'Your Skill Name'
                      )
                      setNewSkillContent(updated)
                    }}
                    placeholder="e.g. Complaint Response"
                    className="input-field text-sm"
                    autoFocus
                  />
                </div>

                {/* Template selector */}
                <div>
                  <label className="section-label">{t('skills.startingTemplate')}</label>
                  <div className="flex gap-2 mt-1">
                    {(['email', 'document', 'blank'] as SkillTemplateKey[]).map((tmpl) => (
                      <button
                        key={tmpl}
                        onClick={() => handleTemplateChange(tmpl)}
                        className={`flex-1 text-xs py-1.5 rounded border transition-colors ${
                          newSkillTemplate === tmpl
                            ? 'border-asu-gold bg-asu-gold/10 text-asu-gold font-medium'
                            : 'border-white/10 text-white/50 hover:border-white/20'
                        }`}
                      >
                        {tmpl === 'email' ? '📧 Email' : tmpl === 'document' ? '📄 Document' : '⬜ Blank'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content editor */}
                <div className="flex flex-col" style={{ minHeight: 0 }}>
                  <label className="section-label">{t('skills.promptContent')}</label>
                  <textarea
                    value={newSkillContent}
                    onChange={(e) => {
                      setNewSkillContent(e.target.value)
                      setCreateError(null)
                    }}
                    className="w-full resize-none border border-white/10 rounded-lg p-3 text-sm font-mono text-white/80 focus:outline-none focus:border-asu-gold bg-white/5 mt-1"
                    style={{ height: '240px' }}
                    placeholder="# Skill: Your Skill Name&#10;&#10;## Task&#10;..."
                    spellCheck={false}
                  />
                </div>
              </div>

              {/* Footer buttons */}
              <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between shrink-0">
                <div>
                  {createError && (
                    <span className="text-xs text-red-400">{createError}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setShowNewSkillForm(false); setCreateError(null) }}
                    className="text-sm text-white/50 hover:text-white/70"
                  >
                    {t('settings.cancel')}
                  </button>
                  <button
                    onClick={handleCreateSkill}
                    disabled={isCreatingSkill}
                    className="btn-gold text-sm px-4 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingSkill ? t('skills.creating') : t('skills.create')}
                  </button>
                </div>
              </div>
            </>
          ) : !selectedSlug ? (
            <div className="flex-1 flex items-center justify-center text-white/40 text-sm">
              {t('skills.selectHint')}
            </div>
          ) : (
            <>
              <div className="px-5 py-3 border-b border-white/10 flex items-center gap-3 shrink-0">
                <div className="flex-1 min-w-0">
                  {isRenaming ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={renameInput}
                        onChange={(e) => { setRenameInput(e.target.value); setRenameError(null) }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename()
                          if (e.key === 'Escape') setIsRenaming(false)
                        }}
                        className="input-field text-sm py-1 flex-1"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveRename}
                        disabled={isSavingRename}
                        className="text-xs bg-asu-gold text-black px-2 py-1 rounded hover:bg-asu-gold/80 disabled:opacity-50"
                      >
                        {isSavingRename ? '…' : t('templates.save')}
                      </button>
                      <button
                        onClick={() => setIsRenaming(false)}
                        className="text-xs text-white/50 hover:text-white/70"
                      >
                        {t('settings.cancel')}
                      </button>
                      {renameError && <span className="text-xs text-red-400">{renameError}</span>}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {detail?.isBase && (
                        <span className="text-xs bg-asu-gold/20 text-asu-gold font-medium px-2 py-0.5 rounded">{t('skills.basePrompt')}</span>
                      )}
                      <h3 className="text-sm font-medium text-white truncate">{detail?.name ?? selectedSlug}</h3>
                      <span className="text-xs text-white/40 font-mono shrink-0">{selectedSlug}.md</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isDirty && <span className="text-xs text-amber-400">{t('skills.unsaved')}</span>}
                  {isModifiedFromDefault && !isDirty && (
                    <span className="text-xs text-blue-400">{t('skills.modifiedFromDefault')}</span>
                  )}
                  {canDeleteRename && !isRenaming && (
                    <>
                      <button
                        onClick={handleStartRename}
                        className="text-xs text-white/50 hover:text-white/70 border border-white/10 px-2 py-0.5 rounded hover:border-white/20 transition-colors"
                        title="Rename this skill"
                      >
                        {t('skills.rename')}
                      </button>
                      <button
                        onClick={handleDeleteSkill}
                        disabled={isDeleting}
                        className="text-xs text-red-400 hover:text-red-300 border border-red-400/20 px-2 py-0.5 rounded hover:border-red-400/40 transition-colors disabled:opacity-50"
                        title="Delete this skill"
                      >
                        {isDeleting ? '…' : t('skills.delete')}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex-1 min-h-0 p-4">
                {isLoadingContent ? (
                  <div className="h-full flex items-center justify-center text-white/40 text-sm">{t('app.loading')}</div>
                ) : (
                  <textarea
                    value={editContent}
                    onChange={(e) => {
                      setEditContent(e.target.value)
                      setIsDirty(true)
                      setSaveError(null)
                      setShowResetConfirm(false)
                    }}
                    className="w-full h-full resize-none border border-white/10 rounded-lg p-3 text-sm font-mono text-white/80 focus:outline-none focus:border-asu-gold bg-white/5"
                    placeholder="Skill prompt content..."
                    spellCheck={false}
                  />
                )}
              </div>

              <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  {detail?.isDefault && !showResetConfirm && (
                    <button onClick={() => setShowResetConfirm(true)} className="text-sm text-white/50 hover:text-white/70" title="Restore original prompt from spec">
                      {t('skills.resetToDefault')}
                    </button>
                  )}
                  {showResetConfirm && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-amber-400">{t('skills.restoreConfirm')}</span>
                      <button onClick={handleReset} className="text-sm font-medium text-amber-400 hover:text-amber-300">{t('skills.yesReset')}</button>
                      <button onClick={() => setShowResetConfirm(false)} className="text-sm text-white/50">{t('settings.cancel')}</button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {saveError && <span className="text-xs text-red-400">{saveError}</span>}
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !isDirty}
                    className="btn-gold text-sm px-4 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? t('skills.saving') : t('templates.save')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
