import { app } from 'electron'
import fs from 'fs'
import path from 'path'

interface AppState {
  vaultPath: string
  dismissedTooltips?: string[]
  googleOAuthRefreshToken?: string
  googleOAuthEmail?: string
}

function getAppStatePath(): string {
  return path.join(app.getPath('userData'), 'app-state.json')
}

export function readAppState(): AppState | null {
  const statePath = getAppStatePath()
  try {
    if (fs.existsSync(statePath)) {
      const raw = fs.readFileSync(statePath, 'utf-8')
      return JSON.parse(raw) as AppState
    }
  } catch (err) {
    console.error('Failed to read app state:', err)
  }
  return null
}

export function writeAppState(state: AppState): void {
  const statePath = getAppStatePath()
  const dir = path.dirname(statePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8')
}

export function getVaultPath(): string | null {
  const state = readAppState()
  return state?.vaultPath ?? null
}

export function setVaultPath(vaultPath: string): void {
  const existing = readAppState()
  writeAppState({ ...existing, vaultPath } as AppState)
}

// ── Tooltip dismissal ─────────────────────────────────────────────────────────

export function getDismissedTooltips(): string[] {
  return readAppState()?.dismissedTooltips ?? []
}

export function dismissTooltip(id: string): void {
  const state = readAppState()
  const existing = state?.dismissedTooltips ?? []
  if (existing.includes(id)) return  // already dismissed
  writeAppState({
    ...(state ?? { vaultPath: '' }),
    dismissedTooltips: [...existing, id],
  } as AppState)
}
