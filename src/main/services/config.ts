import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { getEmailKBPath } from './vault'
import { setApiKey, hasApiKey } from './secure-storage'

export interface IMAPConfig {
  enabled: boolean
  host: string
  port: number
  email: string
  password_encrypted: string  // base64-encoded safeStorage encrypted buffer
  auto_fetch: boolean
  fetch_limit: number
}

export interface SignatureConfig {
  id: string
  name: string
  content: string
  is_default: boolean
  language: string  // 'english' | 'chinese'
}

export interface LLMConfig {
  active_provider: 'claude' | 'openai' | 'ollama' | 'local'
  claude?: {
    // api_key removed — stored in OS safeStorage, never in config.yaml
    model: string
  }
  openai?: {
    base_url: string
    // api_key removed — stored in OS safeStorage, never in config.yaml
    model: string
    provider_name: string
  }
  ollama?: {
    base_url: string
    model: string
  }
  local?: {
    model_path: string
    model_name: string
    context_length: number
    gpu_layers: number
  }
}

export interface Config {
  // API keys are NOT stored here — see secure-storage.ts
  has_anthropic_key?: boolean   // flag only: key is in OS safeStorage
  has_openai_key?: boolean      // flag only: key is in OS safeStorage
  model: string
  max_context_threads: number
  vault_path: string
  data_dir: string
  storage_mode?: 'obsidian' | 'standalone'
  user: {
    name: string
    role: string
    institution: string
    program: string
    email: string
    signatures: {
      english: string
      chinese: string
    }
  }
  defaults: {
    language: string
    tone: string
    channel: string
  }
  imap?: IMAPConfig
  llm?: LLMConfig
  signatures?: SignatureConfig[]
}

function getConfigPath(vaultPath: string): string {
  return path.join(getEmailKBPath(vaultPath), 'config.yaml')
}

/**
 * Read config.yaml from the vault.
 * Auto-migrates:
 *   1. Old user.signatures.{english,chinese} → signatures[] array (Phase 3→4)
 *   2. Plain-text API keys → Electron safeStorage (Security audit)
 */
export function readConfig(vaultPath: string): Config {
  const configPath = getConfigPath(vaultPath)
  const raw = fs.readFileSync(configPath, 'utf-8')
  // Use `any` during migration so we can read legacy fields
  const rawConfig = yaml.load(raw) as any

  // ── Migration: plain-text API keys → secure storage ──────────────────────
  let keysMigrated = false

  // Legacy top-level anthropic_api_key
  if (rawConfig.anthropic_api_key) {
    if (!hasApiKey('anthropic')) {
      setApiKey('anthropic', rawConfig.anthropic_api_key) // AES fallback — never throws
    }
    delete rawConfig.anthropic_api_key
    rawConfig.has_anthropic_key = true
    keysMigrated = true
  }

  // llm.claude.api_key
  if (rawConfig.llm?.claude?.api_key) {
    if (!hasApiKey('anthropic')) {
      setApiKey('anthropic', rawConfig.llm.claude.api_key)
    }
    delete rawConfig.llm.claude.api_key
    rawConfig.has_anthropic_key = true
    keysMigrated = true
  }

  // llm.openai.api_key
  if (rawConfig.llm?.openai?.api_key) {
    if (!hasApiKey('openai')) {
      setApiKey('openai', rawConfig.llm.openai.api_key)
    }
    delete rawConfig.llm.openai.api_key
    rawConfig.has_openai_key = true
    keysMigrated = true
  }

  // ── Heal stale flags: has_*_key: true but no actual key stored ────────────
  // Can happen if a previous broken migration deleted the plain-text key but
  // failed to encrypt and persist it (e.g. safeStorage unavailable in dev).
  if (rawConfig.has_anthropic_key && !hasApiKey('anthropic')) {
    rawConfig.has_anthropic_key = false
    keysMigrated = true
  }
  if (rawConfig.has_openai_key && !hasApiKey('openai')) {
    rawConfig.has_openai_key = false
    keysMigrated = true
  }

  if (keysMigrated) {
    // Persist the cleaned config (no plain-text keys, corrected flags)
    fs.writeFileSync(configPath, yaml.dump(rawConfig, { lineWidth: -1, quotingType: '"', forceQuotes: false }), 'utf-8')
  }

  const config = rawConfig as Config

  // Auto-migrate old user.signatures to signatures array (Phase-3 → Phase-4)
  if (!config.signatures || config.signatures.length === 0) {
    const sigs: SignatureConfig[] = []
    const oldSigs = config.user?.signatures
    if (oldSigs?.english) {
      sigs.push({
        id: 'english-formal',
        name: 'English Formal',
        content: oldSigs.english,
        is_default: true,
        language: 'english',
      })
    }
    if (oldSigs?.chinese) {
      sigs.push({
        id: 'chinese',
        name: '中文签名',
        content: oldSigs.chinese,
        is_default: true,
        language: 'chinese',
      })
    }
    if (sigs.length > 0) {
      config.signatures = sigs
    }
  }

  return config
}

/**
 * Write config.yaml to the vault
 */
export function writeConfig(vaultPath: string, config: Config): void {
  const configPath = getConfigPath(vaultPath)
  const yamlStr = yaml.dump(config, {
    lineWidth: -1,
    quotingType: '"',
    forceQuotes: false,
  })
  fs.writeFileSync(configPath, yamlStr, 'utf-8')
}

/**
 * Create a default config.yaml with initial values
 */
export function createDefaultConfig(
  vaultPath: string,
  apiKey: string,
  storageMode: 'obsidian' | 'standalone' = 'obsidian'
): Config {
  // Store API key securely — never written to config.yaml
  if (apiKey) {
    try { setApiKey('anthropic', apiKey) } catch { /* safeStorage unavailable */ }
  }

  const config: Config = {
    has_anthropic_key: apiKey.length > 0,
    model: 'claude-sonnet-4-20250514',
    max_context_threads: 5,
    vault_path: vaultPath,
    data_dir: 'EmailKB',
    storage_mode: storageMode,
    user: {
      name: '',
      role: '',
      institution: '',
      program: '',
      email: '',
      signatures: {
        english: `Best regards,\n[Your Name]\n[Your Title]\n[Your Institution]`,
        chinese: `[您的姓名]\n[您的职位]\n[您的机构]`,
      },
    },
    defaults: {
      language: 'english',
      tone: 'professional-warm',
      channel: 'email',
    },
    imap: {
      enabled: false,
      host: 'imap.gmail.com',
      port: 993,
      email: '',
      password_encrypted: '',
      auto_fetch: false,
      fetch_limit: 50,
    },
    signatures: [
      {
        id: 'english-formal',
        name: 'English Formal',
        content: `Best regards,\n[Your Name]\n[Your Title]\n[Your Institution]`,
        is_default: true,
        language: 'english',
      },
      {
        id: 'chinese',
        name: '中文签名',
        content: `[您的姓名]\n[您的职位]\n[您的机构]`,
        is_default: true,
        language: 'chinese',
      },
    ],
  }

  writeConfig(vaultPath, config)
  return config
}
