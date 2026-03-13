import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface SetupWizardProps {
  onComplete: () => void
}

type SetupStep = 'welcome' | 'api-key' | 'initializing' | 'done'
type StorageMode = 'obsidian' | 'standalone'

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState<SetupStep>('welcome')
  const [storageMode, setStorageMode] = useState<StorageMode>('obsidian')
  const [vaultPath, setVaultPath] = useState<string>('')
  const [apiKey, setApiKey] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [showApiKey, setShowApiKey] = useState(false)

  const handleSelectFolder = async () => {
    setError('')
    const selected = await window.electronAPI.selectVaultFolder(storageMode)
    if (selected) {
      setVaultPath(selected)
      setStep('api-key')
    }
  }

  const handleInitialize = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your Anthropic API key')
      return
    }
    if (!apiKey.startsWith('sk-ant-')) {
      setError('API key should start with "sk-ant-"')
      return
    }

    setError('')
    setStep('initializing')

    try {
      await window.electronAPI.initialize(vaultPath, apiKey.trim(), storageMode)
      setStep('done')
    } catch (err: any) {
      setError(`Initialization failed: ${err.message || err}`)
      setStep('api-key')
    }
  }

  const isObsidian = storageMode === 'obsidian'

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-asu-maroon text-white px-6 py-3">
        <h1 className="text-lg font-semibold tracking-wide">Email KB Assistant</h1>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full px-8">
          {/* Step 1: Welcome + Storage Mode + Folder Selection */}
          {step === 'welcome' && (
            <div>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-asu-maroon/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📚</span>
                </div>
                <h2 className="text-2xl font-bold text-asu-maroon mb-2">{t('setup.welcomeTitle')}</h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {t('setup.selectStorage')}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  All your contacts, emails, templates, and settings are stored as Markdown files
                  in a folder you choose.
                </p>
              </div>

              {/* Storage mode choice */}
              <div className="space-y-3 mb-6">
                <label
                  className={`flex gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                    storageMode === 'obsidian'
                      ? 'border-asu-maroon bg-asu-maroon/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="storageMode"
                    value="obsidian"
                    checked={storageMode === 'obsidian'}
                    onChange={() => setStorageMode('obsidian')}
                    className="mt-0.5 accent-asu-maroon shrink-0"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{t('setup.obsidianTitle')}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      Your data will be stored in an <code className="text-gray-600">EmailKB</code> subfolder
                      inside your Obsidian vault, and you can browse everything in Obsidian.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                    storageMode === 'standalone'
                      ? 'border-asu-maroon bg-asu-maroon/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="storageMode"
                    value="standalone"
                    checked={storageMode === 'standalone'}
                    onChange={() => setStorageMode('standalone')}
                    className="mt-0.5 accent-asu-maroon shrink-0"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{t('setup.standaloneTitle')}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      Your data will be stored in an <code className="text-gray-600">EmailKB</code> subfolder
                      inside any folder you choose. Files are standard Markdown and can be opened with
                      any text editor.
                    </p>
                  </div>
                </label>
              </div>

              <button
                onClick={handleSelectFolder}
                className="btn-primary w-full py-3 text-base"
              >
                {isObsidian ? t('setup.chooseObsidian') : t('setup.chooseFolder')}
              </button>
              <p className="text-xs text-gray-400 mt-3 text-center">
                An <code className="text-gray-500">EmailKB</code> subfolder will be created
                inside the folder you select.
              </p>
            </div>
          )}

          {/* Step 2: API Key Input */}
          {step === 'api-key' && (
            <div>
              <h2 className="text-2xl font-bold text-asu-maroon mb-2 text-center">{t('setup.apiKey')}</h2>
              <p className="text-gray-500 mb-1 text-center text-sm">
                {isObsidian ? 'Vault' : 'Folder'}:{' '}
                <span className="font-mono text-xs">{vaultPath}</span>
              </p>
              <p className="text-gray-400 text-center text-xs mb-6">
                <button
                  onClick={() => setStep('welcome')}
                  className="text-asu-maroon hover:underline"
                >
                  {t('setup.changeFolder')}
                </button>
              </p>

              <label className="section-label block mb-2">{t('setup.anthropicApiKey')}</label>
              <div className="relative mb-4">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="input-field pr-16"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleInitialize()}
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                >
                  {showApiKey ? t('setup.hide') : t('setup.show')}
                </button>
              </div>

              {error && (
                <p className="text-asu-pink text-sm mb-4">{error}</p>
              )}

              <button
                onClick={handleInitialize}
                className="btn-primary w-full py-3 text-base"
                disabled={!apiKey.trim()}
              >
                {t('setup.initialize')}
              </button>

              <p className="text-xs text-gray-400 mt-4 text-center">
                Your API key is stored locally in <code className="text-gray-500">config.yaml</code>{' '}
                inside your {isObsidian ? 'vault' : 'data folder'}. It is never sent anywhere except
                the Anthropic API.
              </p>
            </div>
          )}

          {/* Step 3: Initializing */}
          {step === 'initializing' && (
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-asu-maroon/20 border-t-asu-maroon rounded-full animate-spin mx-auto mb-6" />
              <h2 className="text-xl font-bold text-gray-700 mb-2">{t('setup.initializing')}</h2>
              <p className="text-gray-400 text-sm">
                {t('setup.settingUp')}
              </p>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 'done' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-asu-green/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl text-asu-green">✓</span>
              </div>
              <h2 className="text-2xl font-bold text-asu-maroon mb-3">{t('setup.ready')}</h2>
              <p className="text-gray-500 mb-2 text-sm">
                Created <code className="text-gray-600">EmailKB/</code> with:
              </p>
              <ul className="text-gray-500 text-sm mb-8 space-y-1">
                <li>📁 contacts/, skills/, templates/, projects/, drafts/</li>
                <li>📄 8 skill files in skills/</li>
                <li>⚙️ config.yaml</li>
              </ul>
              <button
                onClick={onComplete}
                className="btn-primary w-full py-3 text-base"
              >
                {t('setup.start')}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-4 py-2 text-xs text-gray-400 text-center">
        Email KB Assistant v1.0
      </footer>
    </div>
  )
}
