import React, { useState, useEffect, useCallback } from 'react'
import type { IMAPConfigDisplay, FetchedEmail } from '../../types'

type TestState = 'idle' | 'testing' | 'success' | 'error'
type FetchState = 'idle' | 'fetching' | 'done' | 'error'

export default function IMAPPage() {
  const [cfg, setCfg] = useState<IMAPConfigDisplay | null>(null)
  const [loading, setLoading] = useState(true)

  // Google OAuth state
  const [googleAuthorized, setGoogleAuthorized] = useState(false)
  const [googleEmail, setGoogleEmail] = useState<string | null>(null)
  const [authorizing, setAuthorizing] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  // Password-based fallback (collapsed by default)
  const [showPasswordConfig, setShowPasswordConfig] = useState(false)
  const [host, setHost] = useState('imap.gmail.com')
  const [port, setPort] = useState(993)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Fetch settings
  const [autoFetch, setAutoFetch] = useState(false)
  const [fetchLimit, setFetchLimit] = useState(50)

  // Save state
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Test connection state
  const [testState, setTestState] = useState<TestState>('idle')
  const [testError, setTestError] = useState<string | null>(null)

  // Recent emails preview
  const [fetchState, setFetchState] = useState<FetchState>('idle')
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [recentEmails, setRecentEmails] = useState<FetchedEmail[]>([])

  const loadConfig = useCallback(async () => {
    try {
      const [c, authStatus] = await Promise.all([
        window.electronAPI.imapGetConfig(),
        window.electronAPI.imapGoogleAuthStatus(),
      ])
      setCfg(c)
      setGoogleAuthorized(authStatus.authorized)
      setGoogleEmail(authStatus.email)
      if (c) {
        setHost(c.host)
        setPort(c.port)
        setEmail(c.email)
        setAutoFetch(c.auto_fetch)
        setFetchLimit(c.fetch_limit)
      }
    } catch (err: any) {
      console.error('IMAP config load error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadConfig() }, [loadConfig])

  const handleGoogleSignIn = async () => {
    setAuthorizing(true)
    setAuthError(null)
    try {
      const result = await window.electronAPI.imapGoogleAuthorize()
      if (result.success) {
        setGoogleAuthorized(true)
        setGoogleEmail(result.email || null)
      } else {
        setAuthError(result.error || 'Authorization failed')
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authorization failed')
    } finally {
      setAuthorizing(false)
    }
  }

  const handleGoogleSignOut = async () => {
    await window.electronAPI.imapGoogleRevoke()
    setGoogleAuthorized(false)
    setGoogleEmail(null)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveError(null)
    try {
      await window.electronAPI.imapSaveConfig({
        enabled: true,
        host: host.trim(),
        port,
        email: email.trim(),
        password: password || undefined,
        auto_fetch: autoFetch,
        fetch_limit: fetchLimit,
      })
      setSaved(true)
      setPassword('')
      setTimeout(() => setSaved(false), 2500)
      await loadConfig()
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveFetchSettings = async () => {
    setIsSaving(true)
    setSaveError(null)
    try {
      await window.electronAPI.imapSaveConfig({
        enabled: true,
        host: cfg?.host || 'imap.gmail.com',
        port: cfg?.port || 993,
        email: googleEmail || cfg?.email || '',
        auto_fetch: autoFetch,
        fetch_limit: fetchLimit,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      await loadConfig()
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = async () => {
    setTestState('testing')
    setTestError(null)
    try {
      await window.electronAPI.imapTestConnection()
      setTestState('success')
      setTimeout(() => setTestState('idle'), 3000)
    } catch (err: any) {
      setTestState('error')
      setTestError(err.message || 'Connection failed')
    }
  }

  const handleFetchRecent = async () => {
    setFetchState('fetching')
    setFetchError(null)
    setRecentEmails([])
    try {
      const result = await window.electronAPI.imapFetchRecent(20)
      setRecentEmails(result.emails)
      setFetchState('done')
    } catch (err: any) {
      setFetchError(err.message || 'Fetch failed')
      setFetchState('error')
    }
  }

  const isConnected = googleAuthorized || !!cfg?.hasPassword

  if (loading) {
    return <div className="p-6 text-sm text-white/40">Loading IMAP settings...</div>
  }

  return (
    <div className="p-6 max-w-xl space-y-6">
      <div>
        <h3 className="section-heading mb-1">IMAP Email Import</h3>
        <p className="text-xs text-white/40">
          Connect your Gmail account to import received emails as conversation context.
        </p>
      </div>

      {/* Google OAuth Section */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-asu-gold uppercase tracking-wide">
          Google Account
        </h4>

        {googleAuthorized ? (
          <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-green-400 font-medium">
                Connected as {googleEmail}
              </span>
            </div>
            <button
              onClick={handleGoogleSignOut}
              className="text-xs text-white/40 hover:text-red-400 underline"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={handleGoogleSignIn}
              disabled={authorizing}
              className="btn-maroon flex items-center gap-2 px-4 py-2.5"
            >
              {authorizing ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-sm">Authorizing...</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span className="text-sm font-medium">Sign in with Google</span>
                </>
              )}
            </button>
            <p className="text-xs text-white/40">
              Opens your browser. Sign in with your Google account and grant access to read your email.
            </p>
          </div>
        )}

        {authError && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
            {authError}
          </div>
        )}
      </div>

      {/* Fetch Settings */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-asu-gold uppercase tracking-wide">Fetch Settings</h4>

        <div>
          <label className="text-xs font-medium text-white/60 block mb-1">
            Fetch Limit <span className="text-white/40">(emails per fetch)</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={10}
              max={200}
              step={10}
              value={fetchLimit}
              onChange={(e) => setFetchLimit(Number(e.target.value))}
              className="flex-1 accent-asu-gold"
            />
            <span className="w-12 text-center text-sm font-semibold text-white/70">{fetchLimit}</span>
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={autoFetch}
            onChange={(e) => setAutoFetch(e.target.checked)}
            className="text-asu-gold rounded"
          />
          <span className="text-sm text-white/70">Auto-fetch on startup</span>
        </label>
      </div>

      {/* Save + Test + Fetch */}
      {saveError && <p className="text-sm text-red-400">{saveError}</p>}
      {saved && <p className="text-sm text-green-400 font-medium">Settings saved</p>}

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={googleAuthorized ? handleSaveFetchSettings : handleSave}
          disabled={isSaving}
          className="btn-gold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>

        <button
          onClick={handleTest}
          disabled={testState === 'testing' || !isConnected}
          className="btn-secondary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          title={!isConnected ? 'Sign in with Google or configure password first' : ''}
        >
          {testState === 'testing' ? (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 border-2 border-white/20 border-t-white/50 rounded-full animate-spin" />
              Testing...
            </span>
          ) : testState === 'success' ? (
            <span className="text-green-400">Connected!</span>
          ) : (
            'Test Connection'
          )}
        </button>
      </div>

      {testState === 'error' && testError && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
          {testError}
        </div>
      )}

      {/* Recent Emails Preview */}
      {isConnected && (
        <div className="pt-2 border-t border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-asu-gold uppercase tracking-wide">Recent Emails Preview</h4>
            <button
              onClick={handleFetchRecent}
              disabled={fetchState === 'fetching'}
              className="text-xs text-asu-gold font-medium hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {fetchState === 'fetching' ? 'Fetching...' : 'Fetch Recent'}
            </button>
          </div>

          {fetchState === 'error' && fetchError && (
            <p className="text-xs text-red-400">{fetchError}</p>
          )}

          {recentEmails.length > 0 && (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {recentEmails.map((em) => (
                <div
                  key={em.uid}
                  className="glass-card-inner rounded px-3 py-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white/80 truncate">{em.subject || '(no subject)'}</p>
                      <p className="text-white/40 truncate">From: {em.from || em.fromEmail}</p>
                    </div>
                    <span className="text-white/40 shrink-0 whitespace-nowrap">
                      {em.date ? new Date(em.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {fetchState === 'done' && recentEmails.length === 0 && (
            <p className="text-xs text-white/40 italic">No emails found in INBOX.</p>
          )}
        </div>
      )}

      {/* Password-based IMAP fallback (collapsed) */}
      {!googleAuthorized && (
        <div className="pt-2 border-t border-white/10">
          <button
            onClick={() => setShowPasswordConfig(!showPasswordConfig)}
            className="text-xs text-white/50 hover:text-white/70 flex items-center gap-1"
          >
            <span className={`transition-transform ${showPasswordConfig ? 'rotate-90' : ''}`}>&#9654;</span>
            Advanced: Password-based IMAP (non-Gmail)
          </button>

          {showPasswordConfig && (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-white/60 block mb-1">IMAP Host</label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="imap.gmail.com"
                    className="input-field text-sm w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/60 block mb-1">Port</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    className="input-field text-sm w-full"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-white/60 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-field text-sm w-full"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-white/60 block mb-1">
                  Password / App Password
                  {cfg?.hasPassword && <span className="text-green-400 ml-2">saved</span>}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={cfg?.hasPassword ? '(leave blank to keep existing)' : 'Enter password or app password'}
                  className="input-field text-sm w-full"
                />
                <p className="text-xs text-white/40 mt-1">
                  Stored encrypted using OS keychain.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
