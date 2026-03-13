import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { Config, LLMConfig, SignatureConfig } from '../../types'
import TemplatesPage from '../dialogs/TemplatesPage'
import SkillsPage from '../dialogs/SkillsPage'
import WritingStylePage from './WritingStylePage'
import IMAPPage from './IMAPPage'
import MyProfilePage from './MyProfilePage'
import KnowledgeBasePage from './KnowledgeBasePage'

type SettingsSection = 'my-profile' | 'general' | 'imap' | 'writing-style' | 'knowledge-base' | 'signatures' | 'templates' | 'skills' | 'shortcuts' | 'about'

interface SettingsPageProps {
  config: Config | null
  onSave: (updatedConfig: Config) => Promise<void>
  onOpenHelp?: () => void
}

const SECTIONS: Array<{ id: SettingsSection; label: string; icon: string }> = [
  { id: 'my-profile',    label: 'My Profile',          icon: '👤' },
  { id: 'general',       label: 'General',             icon: '⚙' },
  { id: 'imap',          label: 'IMAP',                icon: '📨' },
  { id: 'writing-style', label: 'Writing Style',       icon: '✍️' },
  { id: 'knowledge-base', label: 'Knowledge Base',     icon: '📚' },
  { id: 'signatures',    label: 'Signatures',           icon: '✒️' },
  { id: 'templates',     label: 'Templates',            icon: '📋' },
  { id: 'skills',        label: 'Skills',               icon: '⚡' },
  { id: 'shortcuts',     label: 'Keyboard Shortcuts',   icon: '⌨️' },
  { id: 'about',         label: 'About',                icon: 'ℹ️' },
]

const SHORTCUTS = [
  { key: 'Ctrl+Enter',   action: 'Generate / Polish' },
  { key: 'Ctrl+K',       action: 'Go to Search' },
  { key: 'Ctrl+,',       action: 'Go to Settings' },
  { key: 'Ctrl+Shift+S', action: 'Save & Archive' },
  { key: 'Ctrl+D',       action: 'Save Draft' },
  { key: 'Escape',       action: 'Return to Compose / close dialog' },
  { key: 'Ctrl+Shift+I', action: 'Toggle DevTools' },
  { key: 'Ctrl+=',       action: 'Zoom In (browser native)' },
  { key: 'Ctrl+-',       action: 'Zoom Out (browser native)' },
  { key: 'Ctrl+0',       action: 'Reset Zoom (browser native)' },
  { key: 'F11',          action: 'Toggle Fullscreen' },
]

interface ModelOption {
  id: string
  label: string
  tier: 'expensive' | 'balanced' | 'cheap'
  hint: string
}

const KNOWN_MODELS: ModelOption[] = [
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', tier: 'balanced', hint: 'Latest balanced model — recommended' },
  { id: 'claude-opus-4-6',   label: 'Claude Opus 4.6',   tier: 'expensive', hint: 'Most capable — highest cost' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', tier: 'cheap', hint: 'Fastest, lowest cost' },
  { id: 'claude-opus-4-5',   label: 'Claude Opus 4.5',   tier: 'expensive', hint: 'Previous generation flagship' },
  { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', tier: 'balanced',  hint: 'Previous generation balanced' },
]

const tierBadge: Record<ModelOption['tier'], { label: string; className: string }> = {
  expensive: { label: 'High cost', className: 'bg-red-50 text-red-600' },
  balanced:  { label: 'Balanced',  className: 'bg-asu-gold/20 text-yellow-700' },
  cheap:     { label: 'Low cost',  className: 'bg-green-50 text-green-600' },
}

type LLMProviderType = 'claude' | 'openai' | 'ollama' | 'local'
type TestState = 'idle' | 'testing' | 'success' | 'error'

const OPENAI_PRESETS = [
  { name: 'OpenAI',   base_url: 'https://api.openai.com/v1',        model: 'gpt-4o' },
  { name: 'DeepSeek', base_url: 'https://api.deepseek.com/v1',       model: 'deepseek-chat' },
  { name: 'Groq',     base_url: 'https://api.groq.com/openai/v1',    model: 'llama-3.1-70b-versatile' },
  { name: 'Custom',   base_url: '',                                   model: '' },
]

function GeneralSection({ config, onSave }: { config: Config | null; onSave: (cfg: Config) => Promise<void> }) {
  const { t, i18n } = useTranslation()

  // Language
  const [uiLanguage, setUiLanguage] = useState(() => {
    try { return localStorage.getItem('ui_language') || 'en' } catch { return 'en' }
  })

  const handleLanguageChange = useCallback((lang: string) => {
    setUiLanguage(lang)
    i18n.changeLanguage(lang)
    try { localStorage.setItem('ui_language', lang) } catch { /* ignore */ }
  }, [i18n])

  // Provider
  const [provider, setProvider] = useState<LLMProviderType>('claude')

  // Claude state
  const [newClaudeApiKey, setNewClaudeApiKey] = useState('')  // write-only input, never pre-filled
  const [claudeModel, setClaudeModel] = useState('')
  const [useCustomModel, setUseCustomModel] = useState(false)
  const [customModel, setCustomModel] = useState('')

  // OpenAI state
  const [openaiPresetName, setOpenaiPresetName] = useState('OpenAI')
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState('https://api.openai.com/v1')
  const [newOpenaiApiKey, setNewOpenaiApiKey] = useState('')  // write-only input, never pre-filled
  const [openaiModel, setOpenaiModel] = useState('gpt-4o')

  // Ollama state
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState('http://localhost:11434')
  const [ollamaModel, setOllamaModel] = useState('llama3.1')

  // Common
  const [maxContextThreads, setMaxContextThreads] = useState(5)

  // Test connection
  const [testState, setTestState] = useState<TestState>('idle')
  const [testError, setTestError] = useState<string | null>(null)

  // Save state
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!config) return

    const llm = config.llm
    setProvider(llm?.active_provider ?? 'claude')

    // Claude (API key is in safeStorage — never loaded into state)
    const claudeModelVal = llm?.claude?.model ?? config.model ?? ''
    const knownMatch = KNOWN_MODELS.find((m) => m.id === claudeModelVal)
    if (knownMatch) {
      setClaudeModel(claudeModelVal)
      setUseCustomModel(false)
      setCustomModel('')
    } else if (claudeModelVal) {
      setClaudeModel('')
      setUseCustomModel(true)
      setCustomModel(claudeModelVal)
    } else {
      setClaudeModel('claude-sonnet-4-6')
      setUseCustomModel(false)
    }

    // OpenAI (API key is in safeStorage — never loaded into state)
    if (llm?.openai) {
      const preset = OPENAI_PRESETS.find((p) => p.base_url === llm.openai?.base_url)
      setOpenaiPresetName(preset?.name ?? 'Custom')
      setOpenaiBaseUrl(llm.openai.base_url ?? 'https://api.openai.com/v1')
      setOpenaiModel(llm.openai.model ?? 'gpt-4o')
    }

    // Ollama
    if (llm?.ollama) {
      setOllamaBaseUrl(llm.ollama.base_url ?? 'http://localhost:11434')
      setOllamaModel(llm.ollama.model ?? 'llama3.1')
    }

    setMaxContextThreads(config.max_context_threads ?? 5)
    setError(null)
  }, [config])

  if (!config) {
    return <div className="flex items-center justify-center h-32 text-sm text-gray-400">No config loaded</div>
  }

  const effectiveClaudeModel = useCustomModel ? customModel.trim() : claudeModel

  const buildLLMConfig = (): LLMConfig => ({
    active_provider: provider,
    claude: {
      // api_key NOT included — stored in OS safeStorage via configSetApiKey
      model: effectiveClaudeModel || 'claude-sonnet-4-6',
    },
    openai: {
      base_url:      openaiBaseUrl.trim(),
      // api_key NOT included — stored in OS safeStorage via configSetApiKey
      model:         openaiModel.trim(),
      provider_name: openaiPresetName,
    },
    ollama: {
      base_url: ollamaBaseUrl.trim(),
      model:    ollamaModel.trim(),
    },
    local: config.llm?.local ?? { model_path: '', model_name: '', context_length: 4096, gpu_layers: 0 },
  })

  const handleSave = useCallback(async () => {
    if (provider === 'claude' && !effectiveClaudeModel) {
      setError('Please select or enter a Claude model.'); return
    }
    setIsSaving(true)
    setError(null)
    try {
      // Persist any newly entered API keys to safeStorage BEFORE writing config
      let hasAnthropicKey = config.has_anthropic_key ?? false
      let hasOpenaiKey    = config.has_openai_key    ?? false

      if (newClaudeApiKey.trim()) {
        await window.electronAPI.configSetApiKey('anthropic', newClaudeApiKey.trim())
        hasAnthropicKey = true
        setNewClaudeApiKey('')
      }
      if (newOpenaiApiKey.trim()) {
        await window.electronAPI.configSetApiKey('openai', newOpenaiApiKey.trim())
        hasOpenaiKey = true
        setNewOpenaiApiKey('')
      }

      const llm = buildLLMConfig()
      await onSave({
        ...config,
        has_anthropic_key: hasAnthropicKey,
        has_openai_key:    hasOpenaiKey,
        model:             llm.claude?.model ?? config.model,
        max_context_threads: maxContextThreads,
        llm,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: any) {
      setError(err.message || 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }, [provider, effectiveClaudeModel, newClaudeApiKey, openaiBaseUrl, newOpenaiApiKey, openaiModel,
      openaiPresetName, ollamaBaseUrl, ollamaModel, maxContextThreads, config, onSave])

  const handleTest = async () => {
    // Save first so the IPC handler reads the latest config
    await handleSave()
    setTestState('testing')
    setTestError(null)
    try {
      const result = await window.electronAPI.llmTestConnection()
      if (result.success) {
        setTestState('success')
        setTimeout(() => setTestState('idle'), 3000)
      } else {
        setTestState('error')
        setTestError(result.error || 'Connection failed')
      }
    } catch (err: any) {
      setTestState('error')
      setTestError(err.message || 'Connection failed')
    }
  }

  const handlePresetChange = (name: string) => {
    setOpenaiPresetName(name)
    const preset = OPENAI_PRESETS.find((p) => p.name === name)
    if (preset && preset.name !== 'Custom') {
      setOpenaiBaseUrl(preset.base_url)
      setOpenaiModel(preset.model)
    }
  }

  const providerOptions: Array<{ id: LLMProviderType; label: string; description: string }> = [
    { id: 'claude',  label: 'Claude API',            description: 'Anthropic — best quality, recommended' },
    { id: 'openai',  label: 'OpenAI-Compatible API',  description: 'OpenAI, DeepSeek, Groq, or custom endpoint' },
    { id: 'ollama',  label: 'Ollama (Local)',          description: 'Run models locally — install from ollama.com' },
    { id: 'local',   label: 'Local Model',             description: 'Coming soon — use Ollama for local inference' },
  ]

  return (
    <div className="p-6 max-w-xl space-y-6">

      {/* Interface Language */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-1">{t('settings.language')}</h3>
        <p className="text-xs text-gray-400 mb-3">{t('settings.languageDesc')}</p>
        <div className="flex gap-2">
          {([
            { code: 'en', label: 'English' },
            { code: 'zh', label: '简体中文' },
            { code: 'es', label: 'Español' },
          ] as const).map(({ code, label }) => (
            <button
              key={code}
              onClick={() => handleLanguageChange(code)}
              className={`px-4 py-2 rounded text-sm font-medium border transition-colors ${
                uiLanguage === code
                  ? 'bg-asu-maroon text-white border-asu-maroon'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-asu-maroon'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* LLM Provider selection */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">{t('settings.llmProvider')}</h3>
        <div className="space-y-2">
          {providerOptions.map((opt) => (
            <label
              key={opt.id}
              className={`flex items-start gap-3 px-3 py-2.5 rounded border cursor-pointer transition-colors ${
                opt.id === 'local' ? 'opacity-50 cursor-not-allowed' :
                provider === opt.id ? 'border-asu-maroon bg-asu-maroon/5' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="llm_provider"
                value={opt.id}
                checked={provider === opt.id}
                disabled={opt.id === 'local'}
                onChange={() => setProvider(opt.id)}
                className="text-asu-maroon focus:ring-asu-maroon shrink-0 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                <p className="text-xs text-gray-400">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Claude config */}
      {provider === 'claude' && (
        <div className="space-y-4 border-l-2 border-asu-maroon/20 pl-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              Anthropic API Key
              {config.has_anthropic_key && (
                <span className="ml-2 text-green-600 font-normal">✓ key is set</span>
              )}
            </label>
            <input
              type="password"
              value={newClaudeApiKey}
              onChange={(e) => setNewClaudeApiKey(e.target.value)}
              placeholder={config.has_anthropic_key ? 'Enter new key to replace...' : 'sk-ant-...'}
              className="input-field text-sm w-full font-mono"
            />
            <p className="text-xs text-gray-400 mt-1">
              Get a key at <span className="text-asu-maroon">console.anthropic.com</span>
              {' · '}Keys are stored encrypted in OS keychain, not in config files.
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-2">Model</label>
            <div className="space-y-1.5 mb-2">
              {KNOWN_MODELS.map((opt) => {
                const badge = tierBadge[opt.tier]
                return (
                  <label
                    key={opt.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded border cursor-pointer transition-colors ${
                      !useCustomModel && claudeModel === opt.id
                        ? 'border-asu-maroon bg-asu-maroon/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="claude_model"
                      value={opt.id}
                      checked={!useCustomModel && claudeModel === opt.id}
                      onChange={() => { setClaudeModel(opt.id); setUseCustomModel(false) }}
                      className="text-asu-maroon focus:ring-asu-maroon shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{opt.label}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${badge.className}`}>{badge.label}</span>
                      </div>
                      <p className="text-xs text-gray-400">{opt.hint}</p>
                    </div>
                  </label>
                )
              })}
              <label
                className={`flex items-center gap-3 px-3 py-2 rounded border cursor-pointer transition-colors ${
                  useCustomModel ? 'border-asu-maroon bg-asu-maroon/5' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="claude_model"
                  checked={useCustomModel}
                  onChange={() => setUseCustomModel(true)}
                  className="text-asu-maroon focus:ring-asu-maroon shrink-0"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Custom model ID</p>
                  <p className="text-xs text-gray-400">Enter any valid Anthropic model identifier</p>
                </div>
              </label>
            </div>
            {useCustomModel && (
              <input
                type="text"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="e.g., claude-sonnet-4-20260101"
                className="input-field font-mono text-xs"
                autoFocus
              />
            )}
          </div>
        </div>
      )}

      {/* OpenAI-compatible config */}
      {provider === 'openai' && (
        <div className="space-y-3 border-l-2 border-asu-maroon/20 pl-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Provider Preset</label>
            <div className="flex gap-2 flex-wrap">
              {OPENAI_PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => handlePresetChange(p.name)}
                  className={`text-xs px-3 py-1.5 rounded border font-medium transition-colors ${
                    openaiPresetName === p.name
                      ? 'border-asu-maroon bg-asu-maroon text-white'
                      : 'border-gray-200 text-gray-600 hover:border-asu-maroon hover:text-asu-maroon'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Base URL</label>
            <input
              type="text"
              value={openaiBaseUrl}
              onChange={(e) => { setOpenaiBaseUrl(e.target.value); setOpenaiPresetName('Custom') }}
              placeholder="https://api.openai.com/v1"
              className="input-field text-sm w-full font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              API Key
              {config.has_openai_key && (
                <span className="ml-2 text-green-600 font-normal">✓ key is set</span>
              )}
            </label>
            <input
              type="password"
              value={newOpenaiApiKey}
              onChange={(e) => setNewOpenaiApiKey(e.target.value)}
              placeholder={config.has_openai_key ? 'Enter new key to replace...' : 'sk-...'}
              className="input-field text-sm w-full font-mono"
            />
            <p className="text-xs text-gray-400 mt-1">Keys stored encrypted in OS keychain.</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Model</label>
            <input
              type="text"
              value={openaiModel}
              onChange={(e) => setOpenaiModel(e.target.value)}
              placeholder="gpt-4o"
              className="input-field text-sm w-full font-mono"
            />
          </div>
        </div>
      )}

      {/* Ollama config */}
      {provider === 'ollama' && (
        <div className="space-y-3 border-l-2 border-asu-maroon/20 pl-4">
          <p className="text-xs text-gray-500">
            Install Ollama from <span className="text-asu-maroon font-medium">ollama.com</span>, then run{' '}
            <code className="bg-gray-100 px-1 rounded text-xs">ollama serve</code> and pull a model with{' '}
            <code className="bg-gray-100 px-1 rounded text-xs">ollama pull llama3.1</code>.
          </p>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Ollama URL</label>
            <input
              type="text"
              value={ollamaBaseUrl}
              onChange={(e) => setOllamaBaseUrl(e.target.value)}
              className="input-field text-sm w-full font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Model Name</label>
            <input
              type="text"
              value={ollamaModel}
              onChange={(e) => setOllamaModel(e.target.value)}
              placeholder="llama3.1"
              className="input-field text-sm w-full font-mono"
            />
            <p className="text-xs text-gray-400 mt-1">
              For bilingual (Chinese/English): try <code className="bg-gray-100 px-1 rounded">qwen2.5:7b</code>
            </p>
          </div>
        </div>
      )}

      {/* Max context threads */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-1">
          Max Context Threads <span className="font-normal text-gray-400">(1–20)</span>
        </h3>
        <p className="text-xs text-gray-400 mb-2">How many past threads are loaded as context for each generation.</p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={20}
            value={maxContextThreads}
            onChange={(e) => setMaxContextThreads(Number(e.target.value))}
            className="flex-1 accent-asu-maroon"
          />
          <span className="w-8 text-center text-sm font-semibold text-gray-700">{maxContextThreads}</span>
        </div>
      </div>

      {/* Storage info */}
      {config.vault_path && (
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Data Storage</h3>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600 space-y-1">
            {config.storage_mode === 'standalone' ? (
              <p>Data stored in: <span className="font-mono text-gray-700 break-all">{config.vault_path}</span></p>
            ) : (
              <p>Data stored in Obsidian vault: <span className="font-mono text-gray-700 break-all">{config.vault_path}</span></p>
            )}
            <p className="text-gray-400">EmailKB/ subfolder · config.yaml · contacts/ · skills/ · templates/</p>
          </div>
        </div>
      )}

      {/* Feedback */}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {saved && <p className="text-sm text-green-600 font-medium">✓ Settings saved</p>}
      {testState === 'error' && testError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-600">
          ⚠ {testError}
        </div>
      )}

      {/* Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>

        {provider !== 'local' && (
          <button
            onClick={handleTest}
            disabled={testState === 'testing' || isSaving}
            className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {testState === 'testing' ? (
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 border-2 border-gray-400/30 border-t-gray-500 rounded-full animate-spin" />
                Testing...
              </span>
            ) : testState === 'success' ? (
              <span className="text-green-600">✓ Connected</span>
            ) : (
              'Test Connection'
            )}
          </button>
        )}
      </div>
    </div>
  )
}

function ShortcutsSection() {
  return (
    <div className="p-6 max-w-md">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Keyboard Shortcuts</h3>
      <table className="w-full text-sm">
        <tbody>
          {SHORTCUTS.map(({ key, action }) => (
            <tr key={key} className="border-b border-gray-100 last:border-0">
              <td className="py-2 pr-4 w-40">
                <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5 text-xs font-mono text-gray-700 whitespace-nowrap">
                  {key}
                </kbd>
              </td>
              <td className="py-2 text-gray-600">{action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AboutSection({ onOpenHelp }: { onOpenHelp?: () => void }) {
  return (
    <div className="p-6 max-w-sm">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-gray-900">Email KB Assistant</h3>
        <p className="text-xs text-gray-400 mt-1">AI-powered email drafting and knowledge base</p>
      </div>
      <dl className="space-y-2 text-sm mb-6">
        <div className="flex gap-3">
          <dt className="text-gray-400 w-24 shrink-0">Version</dt>
          <dd className="text-gray-700">1.1.0 — Built {typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : 'dev'}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="text-gray-400 w-24 shrink-0">Built by</dt>
          <dd className="text-gray-700">Email KB Assistant Project</dd>
        </div>
        <div className="flex gap-3">
          <dt className="text-gray-400 w-24 shrink-0">AI Models</dt>
          <dd className="text-gray-700">Claude (Anthropic), DashScope embeddings</dd>
        </div>
      </dl>
      {onOpenHelp && (
        <button onClick={onOpenHelp} className="btn-secondary text-sm">
          📖 User Guide
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Signatures Section
// ─────────────────────────────────────────────────────────────────────────────

function newSigId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 40) || 'sig'
}

function SignaturesSection({
  config,
  onSave,
}: {
  config: Config | null
  onSave: (c: Config) => Promise<void>
}) {
  const [sigs, setSigs] = useState<SignatureConfig[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [editName, setEditName] = useState('')
  const [editLang, setEditLang] = useState<'english' | 'chinese'>('english')
  const [editContent, setEditContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newLang, setNewLang] = useState<'english' | 'chinese'>('english')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (config?.signatures) {
      setSigs(config.signatures)
      if (!selectedId && config.signatures.length > 0) {
        const def = config.signatures.find((s) => s.is_default) ?? config.signatures[0]
        setSelectedId(def.id)
      }
    }
  }, [config]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const sig = sigs.find((s) => s.id === selectedId)
    if (sig) {
      setEditName(sig.name)
      setEditLang(sig.language as 'english' | 'chinese')
      setEditContent(sig.content)
    }
  }, [selectedId, sigs])

  const handleSave = async () => {
    if (!config) return
    setIsSaving(true)
    try {
      const updated = sigs.map((s) =>
        s.id === selectedId ? { ...s, name: editName, language: editLang, content: editContent } : s
      )
      await onSave({ ...config, signatures: updated })
      setSigs(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: any) {
      console.error('Save signature error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSetDefault = async () => {
    if (!config) return
    const updated = sigs.map((s) => ({
      ...s,
      is_default: s.id === selectedId
        ? true
        : s.language !== (sigs.find((x) => x.id === selectedId)?.language)
          ? s.is_default
          : false,
    }))
    await onSave({ ...config, signatures: updated })
    setSigs(updated)
  }

  const handleDelete = async () => {
    if (!config || sigs.length <= 1) return
    if (!confirm(`Delete "${sigs.find((s) => s.id === selectedId)?.name}"?`)) return
    const updated = sigs.filter((s) => s.id !== selectedId)
    await onSave({ ...config, signatures: updated })
    setSigs(updated)
    setSelectedId(updated[0]?.id ?? '')
  }

  const handleCreate = async () => {
    if (!config || !newName.trim()) return
    setIsCreating(true)
    try {
      // Generate unique ID
      let baseId = newSigId(newName.trim())
      let id = baseId
      let n = 2
      while (sigs.some((s) => s.id === id)) id = `${baseId}-${n++}`

      const newSig: SignatureConfig = {
        id,
        name: newName.trim(),
        content: '',
        is_default: false,
        language: newLang,
      }
      const updated = [...sigs, newSig]
      await onSave({ ...config, signatures: updated })
      setSigs(updated)
      setSelectedId(id)
      setNewName('')
      setShowNew(false)
    } catch (err: any) {
      console.error('Create signature error:', err)
    } finally {
      setIsCreating(false)
    }
  }

  const selectedSig = sigs.find((s) => s.id === selectedId)
  const contentChanged = selectedSig
    ? (editContent !== selectedSig.content || editName !== selectedSig.name || editLang !== selectedSig.language)
    : false

  if (!config) return <div className="p-6 text-sm text-gray-400">Loading...</div>

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Email Signatures</h3>
        <p className="text-xs text-gray-400 mb-4">
          Manage signatures for email generation. The AI will use the appropriate signature based on language.
        </p>

        {/* Signature list */}
        <div className="flex gap-4">
          {/* Left: list */}
          <div className="w-44 shrink-0 space-y-1">
            {sigs.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`w-full text-left px-2.5 py-2 rounded text-sm transition-colors flex items-center gap-1.5
                  ${s.id === selectedId
                    ? 'bg-asu-maroon text-white font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                {s.is_default && <span className={`text-xs ${s.id === selectedId ? 'text-yellow-300' : 'text-yellow-500'}`}>★</span>}
                <span className="truncate">{s.name}</span>
              </button>
            ))}
            <div className="pt-1">
              {showNew ? (
                <div className="space-y-1.5 border border-gray-200 rounded p-2 bg-gray-50">
                  <input
                    type="text"
                    placeholder="Signature name *"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="input-field text-xs w-full"
                    autoFocus
                  />
                  <select
                    value={newLang}
                    onChange={(e) => setNewLang(e.target.value as 'english' | 'chinese')}
                    className="input-field text-xs w-full"
                  >
                    <option value="english">English</option>
                    <option value="chinese">Chinese</option>
                  </select>
                  <div className="flex gap-1">
                    <button
                      onClick={handleCreate}
                      disabled={isCreating || !newName.trim()}
                      className="btn-primary text-xs px-2 py-1 flex-1 disabled:opacity-40"
                    >
                      {isCreating ? '...' : 'Add'}
                    </button>
                    <button
                      onClick={() => { setShowNew(false); setNewName('') }}
                      className="btn-secondary text-xs px-2 py-1"
                    >✕</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowNew(true)}
                  className="w-full text-xs text-asu-maroon font-medium hover:underline text-left px-1"
                >
                  + New Signature
                </button>
              )}
            </div>
          </div>

          {/* Right: editor */}
          {selectedSig && (
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-600 block mb-1">Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="input-field text-sm w-full"
                  />
                </div>
                <div className="w-32">
                  <label className="text-xs font-medium text-gray-600 block mb-1">Language</label>
                  <select
                    value={editLang}
                    onChange={(e) => setEditLang(e.target.value as 'english' | 'chinese')}
                    className="input-field text-sm w-full"
                  >
                    <option value="english">English</option>
                    <option value="chinese">Chinese</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Content</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={6}
                  placeholder="Paste your signature here..."
                  className="input-field text-sm w-full resize-y font-mono"
                />
              </div>

              {/* Preview */}
              {editContent && (
                <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2">
                  <p className="text-xs text-gray-400 mb-1 font-medium">Preview</p>
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans">{editContent}</pre>
                </div>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleSave}
                  disabled={isSaving || !contentChanged}
                  className="btn-primary text-sm disabled:opacity-40"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                {saved && <span className="text-xs text-green-600 font-medium">✓ Saved</span>}
                {contentChanged && !isSaving && <span className="text-xs text-amber-500">Unsaved changes</span>}

                {!selectedSig.is_default && (
                  <button
                    onClick={handleSetDefault}
                    className="text-xs text-gray-500 hover:text-yellow-600 transition-colors"
                    title="Set as default for this language"
                  >
                    ☆ Set default
                  </button>
                )}
                {sigs.length > 1 && (
                  <button
                    onClick={handleDelete}
                    className="text-xs text-gray-300 hover:text-red-500 transition-colors ml-auto"
                    title="Delete signature"
                  >
                    🗑 Delete
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage({ config, onSave, onOpenHelp }: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('my-profile')

  return (
    <div className="h-full flex bg-white">
      {/* Sidebar */}
      <div className="w-44 border-r border-gray-200 shrink-0 flex flex-col pt-2">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
              activeSection === s.id
                ? 'bg-asu-maroon/5 text-asu-maroon font-medium border-r-2 border-asu-maroon'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <span>{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Content — some sections manage their own overflow (two-panel layout) */}
      <div className={`flex-1 min-w-0 ${
        activeSection === 'writing-style' || activeSection === 'skills'
          ? 'overflow-hidden h-full flex flex-col'
          : 'overflow-y-auto'
      }`}>
        {activeSection === 'my-profile'    && <MyProfilePage />}
        {activeSection === 'general'       && <GeneralSection config={config} onSave={onSave} />}
        {activeSection === 'imap'          && <IMAPPage />}
        {activeSection === 'writing-style' && <WritingStylePage />}
        {activeSection === 'knowledge-base' && <KnowledgeBasePage />}
        {activeSection === 'signatures'    && <SignaturesSection config={config} onSave={onSave} />}
        {activeSection === 'templates'     && <TemplatesPage />}
        {activeSection === 'skills'        && <SkillsPage />}
        {activeSection === 'shortcuts'     && <ShortcutsSection />}
        {activeSection === 'about'         && <AboutSection onOpenHelp={onOpenHelp} />}
      </div>
    </div>
  )
}
