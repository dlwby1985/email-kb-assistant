import React, { useState, useEffect } from 'react'
import type { Config } from '../../types'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
  config: Config | null
  onSave: (updatedConfig: Config) => Promise<void>
}

interface ModelOption {
  id: string
  label: string
  tier: 'expensive' | 'balanced' | 'cheap'
  hint: string
}

const KNOWN_MODELS: ModelOption[] = [
  {
    id: 'claude-opus-4-5',
    label: 'Claude Opus 4.5',
    tier: 'expensive',
    hint: 'Most capable — highest quality, highest cost',
  },
  {
    id: 'claude-sonnet-4-5',
    label: 'Claude Sonnet 4.5',
    tier: 'balanced',
    hint: 'Balanced quality and cost — recommended',
  },
  {
    id: 'claude-haiku-4-5',
    label: 'Claude Haiku 4.5',
    tier: 'cheap',
    hint: 'Fastest response, lowest cost',
  },
  {
    id: 'claude-opus-4-20250514',
    label: 'Claude Opus 4 (legacy)',
    tier: 'expensive',
    hint: 'Previous generation flagship',
  },
  {
    id: 'claude-sonnet-4-20250514',
    label: 'Claude Sonnet 4 (legacy)',
    tier: 'balanced',
    hint: 'Previous generation balanced model',
  },
]

const tierBadge: Record<ModelOption['tier'], { label: string; className: string }> = {
  expensive: { label: 'High cost',  className: 'bg-red-50 text-red-600' },
  balanced:  { label: 'Balanced',   className: 'bg-asu-gold/20 text-yellow-700' },
  cheap:     { label: 'Low cost',   className: 'bg-asu-green/10 text-asu-green' },
}

export default function SettingsDialog({ isOpen, onClose, config, onSave }: SettingsDialogProps) {
  const [model, setModel] = useState('')
  const [customModel, setCustomModel] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [maxContextThreads, setMaxContextThreads] = useState(5)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Sync state from config when dialog opens
  useEffect(() => {
    if (isOpen && config) {
      const knownMatch = KNOWN_MODELS.find((m) => m.id === config.model)
      if (knownMatch) {
        setModel(config.model)
        setUseCustom(false)
        setCustomModel('')
      } else {
        setModel('')
        setUseCustom(true)
        setCustomModel(config.model)
      }
      setMaxContextThreads(config.max_context_threads ?? 5)
      setError(null)
      setSaved(false)
    }
  }, [isOpen, config])

  if (!isOpen || !config) return null

  const effectiveModel = useCustom ? customModel.trim() : model

  const selectedModelInfo = KNOWN_MODELS.find((m) => m.id === effectiveModel)

  const handleSave = async () => {
    if (!effectiveModel) {
      setError('Please select or enter a model.')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      const updatedConfig: Config = {
        ...config,
        model: effectiveModel,
        max_context_threads: maxContextThreads,
      }
      await onSave(updatedConfig)
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        onClose()
      }, 800)
    } catch (err: any) {
      setError(err.message || 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
          <p className="text-sm text-gray-500 mt-0.5">API model and generation preferences</p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* Model selection */}
          <div>
            <label className="section-label">Claude Model</label>
            <p className="text-xs text-gray-400 mb-2">
              Affects output quality and API cost. Sonnet 4.5 is recommended for most use cases.
            </p>

            <div className="space-y-1.5 mb-3">
              {KNOWN_MODELS.map((opt) => {
                const badge = tierBadge[opt.tier]
                return (
                  <label
                    key={opt.id}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded border cursor-pointer transition-colors
                      ${!useCustom && model === opt.id
                        ? 'border-asu-maroon bg-asu-maroon/5'
                        : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="model"
                      value={opt.id}
                      checked={!useCustom && model === opt.id}
                      onChange={() => { setModel(opt.id); setUseCustom(false) }}
                      className="text-asu-maroon focus:ring-asu-maroon shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{opt.label}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">{opt.hint}</p>
                    </div>
                  </label>
                )
              })}

              {/* Custom model option */}
              <label
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded border cursor-pointer transition-colors
                  ${useCustom ? 'border-asu-maroon bg-asu-maroon/5' : 'border-gray-200 hover:border-gray-300'}
                `}
              >
                <input
                  type="radio"
                  name="model"
                  checked={useCustom}
                  onChange={() => setUseCustom(true)}
                  className="text-asu-maroon focus:ring-asu-maroon shrink-0"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Custom model ID</p>
                  <p className="text-xs text-gray-400">Enter any valid Anthropic model identifier</p>
                </div>
              </label>
            </div>

            {useCustom && (
              <input
                type="text"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="e.g., claude-sonnet-4-20260101"
                className="input-field font-mono text-xs"
                autoFocus
              />
            )}

            {/* Current effective model display */}
            {effectiveModel && (
              <p className="text-xs text-gray-400 mt-2">
                Active model: <code className="font-mono text-gray-600">{effectiveModel}</code>
              </p>
            )}
          </div>

          {/* Max context threads */}
          <div>
            <label className="section-label">
              Max Context Threads
              <span className="font-normal text-gray-400 ml-1">(1–20)</span>
            </label>
            <p className="text-xs text-gray-400 mb-2">
              How many past conversation threads are loaded as context for each draft.
              More threads = richer context but larger prompts.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={20}
                value={maxContextThreads}
                onChange={(e) => setMaxContextThreads(Number(e.target.value))}
                className="flex-1 accent-asu-maroon"
              />
              <span className="w-8 text-center text-sm font-semibold text-gray-700">
                {maxContextThreads}
              </span>
            </div>
          </div>

          {/* Error / success */}
          {error && <p className="text-sm text-red-500">{error}</p>}
          {saved && <p className="text-sm text-asu-green font-medium">✓ Settings saved</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary" disabled={isSaving}>
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary" disabled={isSaving || !effectiveModel}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
