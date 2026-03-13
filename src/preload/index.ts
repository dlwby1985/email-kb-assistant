import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  ping: () => ipcRenderer.invoke('ping'),

  // Setup
  checkFirstLaunch: () => ipcRenderer.invoke('setup:check-first-launch'),
  selectVaultFolder: (mode?: 'obsidian' | 'standalone') => ipcRenderer.invoke('setup:select-vault-folder', mode),
  initialize: (vaultPath: string, apiKey: string, mode?: 'obsidian' | 'standalone') =>
    ipcRenderer.invoke('setup:initialize', vaultPath, apiKey, mode),

  // Config
  configRead: () => ipcRenderer.invoke('config:read'),
  configWrite: (config: any) => ipcRenderer.invoke('config:write', config),
  configSetApiKey: (provider: 'anthropic' | 'openai', key: string) =>
    ipcRenderer.invoke('config:set-api-key', provider, key),
  getVaultPath: () => ipcRenderer.invoke('config:get-vault-path'),

  // Contacts
  contactsList: () => ipcRenderer.invoke('contacts:list'),
  contactsGet: (slug: string) => ipcRenderer.invoke('contacts:get', slug),
  contactsCreate: (data: any) => ipcRenderer.invoke('contacts:create', data),
  contactsUpdate: (slug: string, data: any) => ipcRenderer.invoke('contacts:update', slug, data),
  contactsDelete: (slug: string) => ipcRenderer.invoke('contacts:delete', slug),
  contactsSearch: (query: string) => ipcRenderer.invoke('contacts:search', query),

  // Generate
  generateRun: (request: any) => ipcRenderer.invoke('generate:run', request),
  generateDetermineSkill: (mode: string, channel: string) =>
    ipcRenderer.invoke('generate:determine-skill', mode, channel),
  generateReview: (request: any) => ipcRenderer.invoke('generate:review', request),

  // Threads
  threadsSave: (params: any) => ipcRenderer.invoke('threads:save', params),
  threadsList: (contactSlug: string) => ipcRenderer.invoke('threads:list', contactSlug),
  threadsGet: (filePath: string) => ipcRenderer.invoke('threads:get', filePath),
  threadsDelete: (filePath: string, contactSlug: string) =>
    ipcRenderer.invoke('threads:delete', filePath, contactSlug),
  threadsGetExisting: (contactSlug: string, query?: string) =>
    ipcRenderer.invoke('threads:get-existing', contactSlug, query),

  // Files
  filesExtractText: (filePath: string) => ipcRenderer.invoke('files:extract-text', filePath),
  filesOpenDialog: () => ipcRenderer.invoke('files:open-dialog'),
  filesShowInFolder: (filePath: string) => ipcRenderer.invoke('files:show-in-folder', filePath),

  // Search
  searchQuery: (query: string, options?: any) => ipcRenderer.invoke('search:query', query, options),
  searchReindex: () => ipcRenderer.invoke('search:reindex'),

  // Templates
  templatesList: () => ipcRenderer.invoke('templates:list'),
  templatesGet: (slug: string) => ipcRenderer.invoke('templates:get', slug),
  templatesSave: (slug: string, content: string) => ipcRenderer.invoke('templates:save', slug, content),
  templatesDelete: (slug: string) => ipcRenderer.invoke('templates:delete', slug),

  // Skills
  skillsList: () => ipcRenderer.invoke('skills:list'),
  skillsGet: (slug: string) => ipcRenderer.invoke('skills:get', slug),
  skillsSave: (slug: string, content: string) => ipcRenderer.invoke('skills:save', slug, content),
  skillsReset: (slug: string) => ipcRenderer.invoke('skills:reset', slug),
  skillsDelete: (slug: string) => ipcRenderer.invoke('skills:delete', slug),
  skillsRename: (oldSlug: string, newName: string) => ipcRenderer.invoke('skills:rename', oldSlug, newName),

  // Drafts
  draftsSave: (params: any) => ipcRenderer.invoke('drafts:save', params),
  draftsList: () => ipcRenderer.invoke('drafts:list'),
  draftsLoad: (filePath: string) => ipcRenderer.invoke('drafts:load', filePath),
  draftsDelete: (filePath: string) => ipcRenderer.invoke('drafts:delete', filePath),

  // Analytics
  analyticsGetStats: () => ipcRenderer.invoke('analytics:get-stats'),

  // Semantic search
  searchSemantic: (query: string, options?: any) =>
    ipcRenderer.invoke('search:semantic', query, options),
  searchEmbedAll: () => ipcRenderer.invoke('search:embed-all'),
  searchEmbedThread: (filePath: string) => ipcRenderer.invoke('search:embed-thread', filePath),
  searchEmbedCount: () => ipcRenderer.invoke('search:embed-count'),

  // Writing Style (multi-style)
  styleList: () => ipcRenderer.invoke('style:list'),
  styleGet: (slug: string) => ipcRenderer.invoke('style:get', slug),
  styleCreate: (name: string, description: string) => ipcRenderer.invoke('style:create', name, description),
  styleDelete: (slug: string) => ipcRenderer.invoke('style:delete', slug),
  styleSetDefault: (slug: string) => ipcRenderer.invoke('style:set-default', slug),
  styleSaveRules: (slug: string, rules: string) => ipcRenderer.invoke('style:save-rules', slug, rules),
  styleSaveAutoApply: (slug: string, autoApplyFor: any) => ipcRenderer.invoke('style:save-auto-apply', slug, autoApplyFor),
  styleListExamples: (slug: string) => ipcRenderer.invoke('style:list-examples', slug),
  styleAddExample: (slug: string, example: any) => ipcRenderer.invoke('style:add-example', slug, example),
  styleDeleteExample: (slug: string, fileName: string) => ipcRenderer.invoke('style:delete-example', slug, fileName),
  styleAnalyze: (slug: string) => ipcRenderer.invoke('style:analyze', slug),

  // LLM Provider
  llmTestConnection: () => ipcRenderer.invoke('llm:test-connection'),

  // IMAP — Google OAuth
  imapGoogleAuthStatus: () => ipcRenderer.invoke('imap:google-auth-status'),
  imapGoogleAuthorize: () => ipcRenderer.invoke('imap:google-authorize'),
  imapGoogleRevoke: () => ipcRenderer.invoke('imap:google-revoke'),

  // IMAP
  imapGetConfig: () => ipcRenderer.invoke('imap:get-config'),
  imapSaveConfig: (data: any) => ipcRenderer.invoke('imap:save-config', data),
  imapTestConnection: () => ipcRenderer.invoke('imap:test-connection'),
  imapFetchRecent: (limit?: number) => ipcRenderer.invoke('imap:fetch-recent', limit),
  imapFetchByContact: (contactEmail: string, limit?: number) =>
    ipcRenderer.invoke('imap:fetch-by-contact', contactEmail, limit),
  imapFetchByDate: (range: string) => ipcRenderer.invoke('imap:fetch-by-date', range),
  imapFetchBody: (uid: number) => ipcRenderer.invoke('imap:fetch-body', uid),

  // Thread parsing
  threadParse: (text: string) => ipcRenderer.invoke('thread:parse', text),

  // Todos
  todosExtract: (text: string, contactName: string) =>
    ipcRenderer.invoke('todos:extract', text, contactName),
  todosSave: (todos: any[], date?: string) =>
    ipcRenderer.invoke('todos:save', todos, date),
  todosList: (date?: string) => ipcRenderer.invoke('todos:list', date),
  todosListDates: () => ipcRenderer.invoke('todos:list-dates'),
  todosToggle: (date: string, taskText: string) =>
    ipcRenderer.invoke('todos:toggle', date, taskText),

  // Knowledge Base
  kbIndex: () => ipcRenderer.invoke('kb:index'),
  kbSearch: (query: string, limit?: number) => ipcRenderer.invoke('kb:search', query, limit),
  kbList: () => ipcRenderer.invoke('kb:list'),
  kbStats: () => ipcRenderer.invoke('kb:stats'),
  kbOpenFolder: () => ipcRenderer.invoke('kb:open-folder'),
  kbAddUrl: (url: string) => ipcRenderer.invoke('kb:add-url', url),
  kbRefetchUrl: (filename: string, url: string) => ipcRenderer.invoke('kb:refetch-url', filename, url),
  kbDelete: (filename: string) => ipcRenderer.invoke('kb:delete', filename),
  kbFetchUrlText: (url: string) => ipcRenderer.invoke('kb:fetch-url-text', url),
  kbUploadFile: (sourcePath: string) => ipcRenderer.invoke('kb:upload-file', sourcePath),

  // My Profile
  profileRead: () => ipcRenderer.invoke('profile:read'),
  profileWrite: (content: string) => ipcRenderer.invoke('profile:write', content),
  profileImportFromText: (rawText: string) => ipcRenderer.invoke('profile:import-from-text', rawText),

  // App state (tooltip dismissal)
  appStateGetDismissedTooltips: () => ipcRenderer.invoke('app-state:get-dismissed-tooltips'),
  appStateDismissTooltip: (id: string) => ipcRenderer.invoke('app-state:dismiss-tooltip', id),

  // Shell utilities
  shellOpenExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url),
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
