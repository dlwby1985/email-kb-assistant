// ===== Core Type Definitions =====

export type Channel = 'email' | 'conversation'
export type Mode = 'generate' | 'polish'
export type ContactMode = 'quick' | 'single' | 'multi'
export type Direction = 'incoming-reply' | 'outgoing' | 'incoming-only'
export type SkillName =
  | 'email-reply'
  | 'email-compose'
  | 'conversation-reply'
  | 'polish'
  | 'admin-task'
  | 'course-planning'
  | 'student-communication'

export type Relationship =
  | 'colleague-close'
  | 'colleague-formal'
  | 'student'
  | 'admin'

// ===== Config (matches config.yaml structure from spec §3.2) =====

export interface UserConfig {
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

export interface SignatureConfig {
  id: string
  name: string
  content: string
  is_default: boolean
  language: string
}

export interface LLMConfig {
  active_provider: 'claude' | 'openai' | 'ollama' | 'local'
  claude?: {
    // api_key removed — stored in OS safeStorage, never sent to renderer
    model: string
  }
  openai?: {
    base_url: string
    // api_key removed — stored in OS safeStorage, never sent to renderer
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
  // API keys are NOT stored here — only boolean flags
  has_anthropic_key?: boolean   // true if an Anthropic key is in OS safeStorage
  has_openai_key?: boolean      // true if an OpenAI key is in OS safeStorage
  model: string
  max_context_threads: number
  vault_path: string
  data_dir: string
  storage_mode?: 'obsidian' | 'standalone'
  user: UserConfig
  defaults: {
    language: string
    tone: string
    channel: Channel
  }
  llm?: LLMConfig
  signatures?: SignatureConfig[]
}

// ===== Contact (frontmatter from profile.md, spec §3.4) =====

export interface Contact {
  name: string
  email: string
  slug: string
  role: string
  relationship: Relationship
  language: string
  channels: Channel[]
  tags: string[]
  created_at: string
  last_contact: string
  // Content from the markdown body (not frontmatter)
  notes?: string
  autoSummary?: string
}

// ===== Thread (frontmatter from thread files, spec §3.5) =====

export interface ThreadMeta {
  contact: string
  contact_name: string
  direction: Direction
  channel: Channel
  subject?: string
  tags: string[]
  skill: SkillName | string
  template_used: string
  created_at: string
  message_time: string
  status: 'sent' | 'draft'
  // Derived fields (not from frontmatter)
  fileName?: string
  filePath?: string
}

// ===== Generate Request (IPC payload, spec §6.1) =====

export interface GenerateRequest {
  mode: Mode
  contacts: Array<{ slug: string; name: string }>
  channel: Channel
  background: string
  content: string
  message_time: string | null
  template: string | null
  history_refs: string[]
  attachment_text: string | null
  email_attachment_filenames: string[]
  project: string | null
  skill_override: string | null
  style_override: string | null
  signature_id: string | null
  kb_context: string | null
  include_past_threads: boolean
  revision: {
    previous_output: string
    instruction: string
  } | null
}

export interface GenerateResponse {
  success: boolean
  text?: string
  error?: string
  skill?: SkillName
}

// ===== Templates =====

export interface TemplateInfo {
  slug: string
  name: string
  preview: string
  strict?: boolean
}

export interface SelectedTemplate {
  type: 'template'
  slug: string
  name: string
}

export interface SelectedHistoryRef {
  type: 'history'
  filePath: string
  name: string
}

export type TemplateSelectorValue = SelectedTemplate | SelectedHistoryRef | null

// ===== Knowledge Base =====

export interface KBSearchResult {
  filename: string
  filePath: string
  fileType: string
  snippet: string
  fullExcerpt: string
  estimatedTokens: number
}

export interface KBFileInfo {
  filename: string
  filePath: string
  fileType: string
  fileSize: number
  indexedAt: string
  indexed: boolean
  source: 'local' | 'url'
  url?: string
  fetchedAt?: string
}

// ===== Search =====

export interface SearchResult {
  filePath: string
  contactSlug: string
  channel: string
  direction: string
  subject: string
  tags: string[]
  createdAt: string
  snippet: string
  rank: number
}

// ===== Save Thread Params =====

export interface SaveThreadParams {
  contactSlugs: string[]
  contactNames: string[]
  direction: Direction
  channel: Channel
  tags: string[]
  subject?: string
  background: string
  coreContent: string
  generatedDraft: string
  finalVersion?: string
  messageTime?: string
  skillUsed: string
  templateUsed?: string
  appendToThread?: string | null
  saveAsTemplate?: boolean
  templateName?: string
}

// ===== Writing Style =====

export interface StyleInfo {
  slug: string
  name: string
  description: string
  language: string
  formality: string
  isDefault: boolean
  exampleCount: number
  autoApplyFor?: {
    relationship?: string[]
    channel?: string[]
  }
}

export interface StyleProfile {
  rules: string
  analyzedPatterns: string
  exampleCount: number
}

export interface StyleExample {
  fileName: string
  context: string
  channel: string
  language: string
  contentPreview: string
  createdAt: string
}

export interface StyleExampleInput {
  context: string
  channel: string
  language: string
  content: string
}

// ===== Todos =====

export interface ExtractedTodo {
  task: string
  deadline: string | null
  contact: string
  priority: 'high' | 'medium' | 'low'
}

// UI-extended version (adds selection checkbox state)
export interface TodoItem extends ExtractedTodo {
  included: boolean
}

// ===== Thread Parsing =====

export interface ParsedEmail {
  sender: string
  date: string
  body: string
}

export interface ThreadParseResult {
  success: boolean
  formatted?: string
  messageCount?: number
  senders?: string[]
  error?: string
}

// ===== IMAP =====

export interface IMAPConfigDisplay {
  enabled: boolean
  host: string
  port: number
  email: string
  hasPassword: boolean
  auto_fetch: boolean
  fetch_limit: number
}

export interface FetchedEmail {
  uid: number
  messageId: string
  subject: string
  from: string
  fromEmail: string
  to: string[]
  date: string
  textBody: string
  htmlBody: string
}

// ===== Electron API (exposed via preload) =====

export interface ElectronAPI {
  ping: () => Promise<string>
  // Setup
  checkFirstLaunch: () => Promise<{ isFirstLaunch: boolean; vaultPath?: string }>
  selectVaultFolder: (mode?: 'obsidian' | 'standalone') => Promise<string | null>
  initialize: (vaultPath: string, apiKey: string, mode?: 'obsidian' | 'standalone') => Promise<void>
  // Config
  configRead: () => Promise<Config>
  configWrite: (config: Config) => Promise<void>
  configSetApiKey: (provider: 'anthropic' | 'openai', key: string) => Promise<{ success: boolean; error?: string }>
  getVaultPath: () => Promise<string | null>
  // Contacts
  contactsList: () => Promise<Contact[]>
  contactsGet: (slug: string) => Promise<Contact | null>
  contactsCreate: (data: Partial<Contact>) => Promise<Contact>
  contactsUpdate: (slug: string, data: Partial<Contact>) => Promise<void>
  contactsDelete: (slug: string) => Promise<void>
  contactsSearch: (query: string) => Promise<Contact[]>
  // Generate
  generateRun: (request: GenerateRequest) => Promise<GenerateResponse>
  generateDetermineSkill: (mode: Mode, channel: Channel) => Promise<SkillName>
  generateReview: (request: { draft: string; coreContent: string; channel: Channel; contactSlugs: string[] }) => Promise<GenerateResponse>
  // Threads
  threadsSave: (params: SaveThreadParams) => Promise<{ success: boolean; fileName?: string; threadFilePath?: string; templateFilePath?: string }>
  threadsList: (contactSlug: string) => Promise<ThreadMeta[]>
  threadsGet: (filePath: string) => Promise<{ meta: ThreadMeta; content: string }>
  threadsDelete: (filePath: string, contactSlug: string) => Promise<{ success: boolean; error?: string }>
  threadsGetExisting: (contactSlug: string, query?: string) => Promise<Array<{ fileName: string; label: string }>>
  // Files
  filesExtractText: (filePath: string) => Promise<{ text: string; wordCount: number }>
  filesOpenDialog: () => Promise<string | null>
  filesShowInFolder: (filePath: string) => Promise<boolean>
  // Search
  searchQuery: (query: string, options?: { limit?: number; contactSlug?: string; channel?: string }) => Promise<SearchResult[]>
  searchReindex: () => Promise<{ success: boolean; error?: string }>
  // Templates
  templatesList: () => Promise<TemplateInfo[]>
  templatesGet: (slug: string) => Promise<{ slug: string; name: string; content: string } | null>
  templatesSave: (slug: string, content: string) => Promise<{ success: boolean; slug: string }>
  templatesDelete: (slug: string) => Promise<{ success: boolean }>
  // Skills
  skillsList: () => Promise<Array<{ slug: string; name: string; preview: string; isDefault: boolean; isBase: boolean }>>
  skillsGet: (slug: string) => Promise<{ slug: string; name: string; content: string; isDefault: boolean; isBase: boolean; defaultContent: string | null } | null>
  skillsSave: (slug: string, content: string) => Promise<{ success: boolean; slug: string }>
  skillsReset: (slug: string) => Promise<{ success: boolean; slug: string; content: string }>
  skillsDelete: (slug: string) => Promise<{ success: boolean }>
  skillsRename: (oldSlug: string, newName: string) => Promise<{ success: boolean; newSlug: string }>
  // Drafts
  draftsSave: (params: any) => Promise<{ success: boolean; fileName: string; filePath: string }>
  draftsList: () => Promise<Array<{ fileName: string; filePath: string; createdAt: string; subject: string; contactNames: string[]; channel: string; preview: string }>>
  draftsLoad: (filePath: string) => Promise<{ contactSlugs: string[]; contactNames: string[]; channel: string; mode: string; skill: string; createdAt: string; subject: string; background: string; coreContent: string; generatedDraft: string }>
  draftsDelete: (filePath: string) => Promise<{ success: boolean }>
  // Analytics
  analyticsGetStats: () => Promise<{
    totalThreads: number
    totalContacts: number
    byChannel: Record<string, number>
    byDirection: Record<string, number>
    topContacts: Array<{ slug: string; name: string; count: number }>
    byMonth: Array<{ month: string; count: number }>
    topTags: Array<{ tag: string; count: number }>
    mostRecentThread: string | null
  }>
  // Semantic search
  searchSemantic: (query: string, options?: { limit?: number; contactSlug?: string }) => Promise<{
    results: Array<SearchResult & { score: number }>
    embeddedCount: number
  }>
  searchEmbedAll: () => Promise<{ success: boolean; error?: string }>
  searchEmbedThread: (filePath: string) => Promise<{ success: boolean; error?: string }>
  searchEmbedCount: () => Promise<{ count: number }>
  // Writing Style (multi-style)
  styleList: () => Promise<StyleInfo[]>
  styleGet: (slug: string) => Promise<StyleProfile>
  styleCreate: (name: string, description: string) => Promise<StyleInfo>
  styleDelete: (slug: string) => Promise<{ success: boolean }>
  styleSetDefault: (slug: string) => Promise<{ success: boolean }>
  styleSaveRules: (slug: string, rules: string) => Promise<{ success: boolean }>
  styleSaveAutoApply: (slug: string, autoApplyFor: StyleInfo['autoApplyFor']) => Promise<{ success: boolean }>
  styleListExamples: (slug: string) => Promise<StyleExample[]>
  styleAddExample: (slug: string, example: StyleExampleInput) => Promise<{ success: boolean; fileName: string }>
  styleDeleteExample: (slug: string, fileName: string) => Promise<{ success: boolean }>
  styleAnalyze: (slug: string) => Promise<{ success: boolean; patterns: string }>
  // LLM Provider
  llmTestConnection: () => Promise<{ success: boolean; error?: string }>
  // IMAP — Google OAuth
  imapGoogleAuthStatus: () => Promise<{ authorized: boolean; email: string | null }>
  imapGoogleAuthorize: () => Promise<{ success: boolean; accessToken?: string; email?: string; error?: string }>
  imapGoogleRevoke: () => Promise<{ success: boolean }>
  // IMAP
  imapGetConfig: () => Promise<IMAPConfigDisplay | null>
  imapSaveConfig: (data: Partial<IMAPConfigDisplay> & { password?: string }) => Promise<{ success: boolean }>
  imapTestConnection: () => Promise<{ success: boolean }>
  imapFetchRecent: (limit?: number) => Promise<{ success: boolean; emails: FetchedEmail[] }>
  imapFetchByContact: (contactEmail: string, limit?: number) => Promise<{ success: boolean; emails: FetchedEmail[] }>
  imapFetchByDate: (range: 'today' | '2days' | 'week') => Promise<{ success: boolean; emails: FetchedEmail[]; error?: string }>
  imapFetchBody: (uid: number) => Promise<{ success: boolean; textBody: string; htmlBody: string }>
  // Thread parsing
  threadParse: (text: string) => Promise<ThreadParseResult>
  // Todos
  todosExtract: (text: string, contactName: string) => Promise<{ success: boolean; todos: ExtractedTodo[]; error?: string }>
  todosSave: (todos: ExtractedTodo[], date?: string) => Promise<{ success: boolean; error?: string }>
  todosList: (date?: string) => Promise<{ success: boolean; date: string; lines: string[] }>
  todosListDates: () => Promise<{ success: boolean; dates: string[] }>
  todosToggle: (date: string, taskText: string) => Promise<{ success: boolean }>
  // Knowledge Base
  kbIndex: () => Promise<{ success: boolean; indexed: number; errors: number; error?: string }>
  kbSearch: (query: string, limit?: number) => Promise<KBSearchResult[]>
  kbList: () => Promise<KBFileInfo[]>
  kbStats: () => Promise<{ totalFiles: number; indexedCount: number; kbDir: string }>
  kbOpenFolder: () => Promise<boolean>
  kbAddUrl: (url: string) => Promise<{ success: boolean; title: string; error?: string }>
  kbRefetchUrl: (filename: string, url: string) => Promise<{ success: boolean; title: string; error?: string }>
  kbDelete: (filename: string) => Promise<{ success: boolean; error?: string }>
  kbFetchUrlText: (url: string) => Promise<{ success: boolean; title: string; text: string; wordCount: number; error?: string }>
  kbUploadFile: (sourcePath: string) => Promise<{ success: boolean; filename: string; error?: string }>
  // My Profile
  profileRead: () => Promise<{ content: string; lastUpdated: string | null }>
  profileWrite: (content: string) => Promise<{ success: boolean; lastUpdated: string }>
  profileImportFromText: (rawText: string) => Promise<{ success: boolean; restructured: string }>
  // App state (tooltip dismissal)
  appStateGetDismissedTooltips: () => Promise<string[]>
  appStateDismissTooltip: (id: string) => Promise<{ success: boolean }>
  // Shell utilities
  shellOpenExternal: (url: string) => Promise<void>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
