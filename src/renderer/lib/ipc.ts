/**
 * Typed IPC wrappers for calling Electron main process.
 * These are thin wrappers around window.electronAPI for convenience.
 * Components can either import from here or use window.electronAPI directly.
 */

import type {
  Config,
  Contact,
  GenerateRequest,
  GenerateResponse,
  Mode,
  Channel,
  SkillName,
  SaveThreadParams,
  ThreadMeta,
} from '../types'

// ===== Setup =====

export async function checkFirstLaunch(): Promise<{ isFirstLaunch: boolean; vaultPath?: string }> {
  return window.electronAPI.checkFirstLaunch()
}

export async function selectVaultFolder(): Promise<string | null> {
  return window.electronAPI.selectVaultFolder()
}

export async function initialize(vaultPath: string, apiKey: string): Promise<void> {
  return window.electronAPI.initialize(vaultPath, apiKey)
}

// ===== Config =====

export async function readConfig(): Promise<Config> {
  return window.electronAPI.configRead()
}

export async function writeConfig(config: Config): Promise<void> {
  return window.electronAPI.configWrite(config)
}

export async function getVaultPath(): Promise<string | null> {
  return window.electronAPI.getVaultPath()
}

// ===== Contacts =====

export async function listContacts(): Promise<Contact[]> {
  return window.electronAPI.contactsList()
}

export async function getContact(slug: string): Promise<Contact | null> {
  return window.electronAPI.contactsGet(slug)
}

export async function createContact(data: Partial<Contact>): Promise<Contact> {
  return window.electronAPI.contactsCreate(data)
}

export async function updateContact(slug: string, data: Partial<Contact>): Promise<void> {
  return window.electronAPI.contactsUpdate(slug, data)
}

export async function deleteContact(slug: string): Promise<void> {
  return window.electronAPI.contactsDelete(slug)
}

export async function searchContacts(query: string): Promise<Contact[]> {
  return window.electronAPI.contactsSearch(query)
}

// ===== Generate =====

export async function runGenerate(request: GenerateRequest): Promise<GenerateResponse> {
  return window.electronAPI.generateRun(request)
}

export async function determineSkill(mode: Mode, channel: Channel): Promise<SkillName> {
  return window.electronAPI.generateDetermineSkill(mode, channel)
}

// ===== Threads =====

export async function saveThread(params: SaveThreadParams): Promise<{ success: boolean; fileName?: string }> {
  return window.electronAPI.threadsSave(params)
}

export async function listThreads(contactSlug: string): Promise<ThreadMeta[]> {
  return window.electronAPI.threadsList(contactSlug)
}

export async function getThread(filePath: string): Promise<{ meta: ThreadMeta; content: string }> {
  return window.electronAPI.threadsGet(filePath)
}

export async function getExistingThreads(contactSlug: string): Promise<Array<{ fileName: string; label: string }>> {
  return window.electronAPI.threadsGetExisting(contactSlug)
}

// ===== Files =====

export async function extractText(filePath: string): Promise<{ text: string; wordCount: number }> {
  return window.electronAPI.filesExtractText(filePath)
}

export async function openFileDialog(): Promise<string | null> {
  return window.electronAPI.filesOpenDialog()
}
