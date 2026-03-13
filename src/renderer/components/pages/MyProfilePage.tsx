import React, { useState, useEffect, useCallback } from 'react'

export default function MyProfilePage() {
  const [content, setContent] = useState('')
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restructure with AI
  const [isRestructuring, setIsRestructuring] = useState(false)
  const [restructureError, setRestructureError] = useState<string | null>(null)
  const [restructureResult, setRestructureResult] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await window.electronAPI.profileRead()
      setContent(result.content)
      setLastUpdated(result.lastUpdated)
      setIsDirty(false)
    } catch (err) {
      console.error('Failed to load profile:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadProfile() }, [loadProfile])

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMsg(null)
    try {
      const result = await window.electronAPI.profileWrite(content)
      setLastUpdated(result.lastUpdated)
      setIsDirty(false)
      setSaveMsg('Saved')
      setTimeout(() => setSaveMsg(null), 2000)
    } catch (err: any) {
      setSaveMsg('Error: ' + (err.message || 'Failed to save'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleRestructure = async () => {
    if (!content.trim()) {
      setRestructureError('Your profile is empty — paste or write some content first.')
      return
    }
    setIsRestructuring(true)
    setRestructureError(null)
    setRestructureResult(null)
    try {
      const result = await window.electronAPI.profileImportFromText(content)
      setRestructureResult(result.restructured)
    } catch (err: any) {
      setRestructureError(err.message || 'Restructure failed')
    } finally {
      setIsRestructuring(false)
    }
  }

  const handleApplyRestructure = (mode: 'replace' | 'append') => {
    if (!restructureResult) return
    const newContent = mode === 'replace'
      ? restructureResult
      : (content.trim() ? content.trim() + '\n\n' + restructureResult : restructureResult)
    setContent(newContent)
    setIsDirty(true)
    setRestructureResult(null)
  }

  const openLink = (url: string) => {
    window.electronAPI.shellOpenExternal(url)
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return null
    try {
      return new Date(iso).toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    } catch { return null }
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-200 shrink-0">
        <h3 className="text-sm font-semibold text-gray-800">My Profile</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Your personal context — included in every AI generation.
        </p>
      </div>

      <div className="flex-1 p-5 space-y-6">
        {/* Profile editor */}
        <div>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm border border-gray-200 rounded-lg bg-gray-50">
              Loading…
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => { setContent(e.target.value); setIsDirty(true); setSaveMsg(null) }}
              className="w-full resize-none border border-gray-200 rounded-lg p-3 text-sm text-gray-800 focus:outline-none focus:border-asu-maroon bg-gray-50 font-mono leading-relaxed"
              style={{ minHeight: '220px', height: 'auto' }}
              rows={12}
              placeholder={
                'Write anything about yourself that you want the AI to always know when drafting your communications.\n\n' +
                'Examples:\n' +
                '• Your name, title, and role\n' +
                '• Your institution and program\n' +
                '• Communication style preferences\n' +
                '• Language preferences (English/Chinese)\n' +
                '• Common phrases you use or avoid'
              }
              spellCheck={false}
            />
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">
              {lastUpdated && !isDirty ? `Last saved: ${formatDate(lastUpdated)}` : isDirty ? 'Unsaved changes' : ''}
            </span>
            <div className="flex items-center gap-2">
              {saveMsg && (
                <span className={`text-xs ${saveMsg.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>
                  {saveMsg}
                </span>
              )}
              <button
                onClick={handleRestructure}
                disabled={isRestructuring || !content.trim()}
                title="Let AI clean up and reorganize your profile text"
                className="text-sm bg-asu-maroon/10 hover:bg-asu-maroon/20 text-asu-maroon font-medium px-3 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRestructuring ? 'Processing…' : 'Restructure with AI'}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !isDirty}
                className="btn-primary text-sm px-4 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
          {restructureError && (
            <p className="text-xs text-red-500 mt-1">{restructureError}</p>
          )}
        </div>

        {/* Restructure preview */}
        {restructureResult !== null && (
          <div className="border border-asu-maroon/20 bg-asu-maroon/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-asu-maroon">Restructured Profile Preview</h4>
              <button
                onClick={() => setRestructureResult(null)}
                className="text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕ Dismiss
              </button>
            </div>
            <textarea
              value={restructureResult}
              onChange={(e) => setRestructureResult(e.target.value)}
              className="w-full resize-none border border-asu-maroon/20 rounded-lg p-3 text-sm text-gray-800 focus:outline-none focus:border-asu-maroon bg-white font-mono leading-relaxed"
              rows={8}
              spellCheck={false}
            />
            <p className="text-xs text-gray-500 mt-2 mb-3">
              ⚠ Review and edit before saving. Personal or sensitive information has been excluded.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleApplyRestructure('replace')}
                className="btn-primary text-sm px-4 py-1.5"
              >
                Replace Profile
              </button>
              <button
                onClick={() => handleApplyRestructure('append')}
                className="text-sm border border-asu-maroon text-asu-maroon px-4 py-1.5 rounded-lg hover:bg-asu-maroon/5 transition-colors"
              >
                Append to Profile
              </button>
            </div>
          </div>
        )}

        {/* Import from AI assistants — instructions only */}
        <div className="border-t border-gray-200 pt-5">
          <h4 className="text-sm font-medium text-gray-700 mb-1">Import from Other AI Assistants</h4>
          <p className="text-xs text-gray-500 mb-4">
            If you've been using ChatGPT or Claude, you can import your conversation memory to build
            your profile faster.
          </p>

          <div className="space-y-4">
            {/* From Claude */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600 space-y-1">
              <p className="font-semibold text-gray-700">📋 From Claude</p>
              <ol className="list-decimal list-inside space-y-0.5 text-gray-500 ml-1">
                <li>
                  Go to:{' '}
                  <button
                    onClick={() => openLink('https://claude.ai/settings')}
                    className="text-asu-maroon hover:underline font-medium"
                  >
                    claude.ai/settings
                  </button>
                </li>
                <li>Click <span className="font-medium">Export Data</span> under Account</li>
                <li>Download the export, find the memories file</li>
                <li>Copy relevant content and paste into your profile above</li>
              </ol>
            </div>

            {/* From ChatGPT */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600 space-y-1">
              <p className="font-semibold text-gray-700">📋 From ChatGPT</p>
              <ol className="list-decimal list-inside space-y-0.5 text-gray-500 ml-1">
                <li>
                  Go to:{' '}
                  <button
                    onClick={() => openLink('https://chat.openai.com')}
                    className="text-asu-maroon hover:underline font-medium"
                  >
                    chat.openai.com
                  </button>
                </li>
                <li>Settings → Personalization → Memory</li>
                <li>Click <span className="font-medium">Manage</span> to see all memories</li>
                <li>Copy relevant items and paste into your profile above</li>
              </ol>
            </div>

            {/* Tip */}
            <div className="bg-asu-gold/10 border border-asu-gold/30 rounded-lg p-3 text-xs text-gray-600 space-y-1">
              <p className="font-semibold text-gray-700">💡 Tip</p>
              <p className="text-gray-500">You don't need to paste everything. Focus on:</p>
              <ul className="list-disc list-inside space-y-0.5 text-gray-500 ml-1">
                <li>Your name, title, and role</li>
                <li>Communication style preferences</li>
                <li>Professional context</li>
                <li>Language preferences</li>
              </ul>
              <p className="text-gray-500 mt-1.5">
                After pasting, click <span className="font-medium text-asu-maroon">Restructure with AI</span> to
                clean up the format automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
