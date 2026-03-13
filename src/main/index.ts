import { app, BrowserWindow, ipcMain, Menu, globalShortcut } from 'electron'
import path from 'path'
import { config as dotenvConfig } from 'dotenv'

// Load .env files (dotenv won't overwrite existing vars, so order matters: specific first)
// In packaged app: app.getAppPath() → resources/app.asar, so go up to find .env next to exe
// In dev: process.cwd() is the project root
const appDir = app.isPackaged
  ? path.dirname(path.dirname(app.getAppPath()))  // release/win-unpacked/
  : process.cwd()
// 1. .env next to the executable (or project root in dev)
dotenvConfig({ path: path.join(appDir, '.env') })
// 2. Shared parent .env (dev only: E:\Claude Code\Project Resurrection\P\.env)
dotenvConfig({ path: path.resolve(appDir, '..', '.env') })
// 3. Hardcoded shared dev path as final fallback
dotenvConfig({ path: String.raw`E:\Claude Code\Project Resurrection\P\.env` })
import { registerSetupHandlers } from './ipc/setup'
import { registerConfigHandlers } from './ipc/config'
import { registerContactsHandlers } from './ipc/contacts'
import { registerGenerateHandlers } from './ipc/generate'
import { registerThreadsHandlers } from './ipc/threads'
import { registerFilesHandlers } from './ipc/files'
import { registerSearchHandlers } from './ipc/search'
import { registerTemplatesHandlers } from './ipc/templates'
import { registerSkillsHandlers } from './ipc/skills'
import { registerDraftsHandlers } from './ipc/drafts'
import { registerAnalyticsHandlers } from './ipc/analytics'
import { registerWritingStyleHandlers } from './ipc/writing-style'
import { registerImapHandlers } from './ipc/imap'
import { registerThreadParseHandlers } from './ipc/thread-parse'
import { registerTodosHandlers } from './ipc/todos'
import { registerAppStateHandlers } from './ipc/app-state'
import { registerProfileHandlers } from './ipc/profile'
import { registerKnowledgeBaseHandlers } from './ipc/knowledge-base'
import { initializeDatabase, indexAllThreads, closeDatabase } from './services/search'
import { initEmbeddingsTable } from './services/embeddings'
import { initKnowledgeBaseTable } from './services/knowledge-base'
import { getVaultPath } from './services/app-state'
import { getSubPath, writeFileIfNotExists } from './services/vault'
import { DEFAULT_TEMPLATES } from './defaults/templates'
import { DEFAULT_SKILLS } from './defaults/skills'
import { DEFAULT_USER_GUIDE } from './defaults/user-guide'
import { migratePersonalStyle } from './services/writing-style'

let mainWindow: BrowserWindow | null = null

// Remove default Electron menu bar (File/Edit/View/Window/Help)
Menu.setApplicationMenu(null)

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'Email KB Assistant',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // In dev, load from Vite dev server; in production, load built index.html
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Register all IPC handlers
ipcMain.handle('ping', () => 'pong')
registerSetupHandlers()
registerConfigHandlers()
registerContactsHandlers()
registerGenerateHandlers()
registerThreadsHandlers()
registerFilesHandlers()
registerSearchHandlers()
registerTemplatesHandlers()
registerSkillsHandlers()
registerDraftsHandlers()
registerAnalyticsHandlers()
registerWritingStyleHandlers()
registerImapHandlers()
registerThreadParseHandlers()
registerTodosHandlers()
registerAppStateHandlers()
registerProfileHandlers()
registerKnowledgeBaseHandlers()

app.whenReady().then(() => {
  createWindow()

  // Register keyboard shortcuts not covered by native browser shortcuts.
  // Note: Ctrl+C/V/Z/X/A work natively in Electron's Chromium renderer without menu entries.
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    mainWindow?.webContents.toggleDevTools()
  })
  globalShortcut.register('F11', () => {
    if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen())
  })
  // Note: Ctrl+=/- zoom and Ctrl+0 reset are handled natively by Chromium renderer

  // Initialize search database once vault path is known
  // Give the app-state a moment to load from disk, then init the search index
  setTimeout(() => {
    const vaultPath = getVaultPath()
    if (vaultPath) {
      // Seed default skills if they don't exist yet (idempotent — adds new skills to existing vaults)
      const skillsDir = getSubPath(vaultPath, 'skills')
      for (const [fileName, content] of Object.entries(DEFAULT_SKILLS)) {
        writeFileIfNotExists(path.join(skillsDir, fileName), content)
      }

      // Seed default templates if they don't exist yet (idempotent)
      const templatesDir = getSubPath(vaultPath, 'templates')
      for (const [fileName, content] of Object.entries(DEFAULT_TEMPLATES)) {
        writeFileIfNotExists(path.join(templatesDir, fileName), content)
      }

      // Seed USER-GUIDE.md at vault root (idempotent)
      const emailKBDir = getSubPath(vaultPath)
      for (const [fileName, content] of Object.entries(DEFAULT_USER_GUIDE)) {
        writeFileIfNotExists(path.join(emailKBDir, fileName), content)
      }

      // Seed my-profile.md (idempotent — only writes on first launch)
      const defaultProfile = `---\ntype: "user-profile"\nlast_updated: "${new Date().toISOString()}"\n---\n\n(Write your personal profile here — it will be included in every AI generation as context.\nDescribe your role, institution, communication style, language preferences, etc.)\n`
      writeFileIfNotExists(getSubPath(vaultPath, 'my-profile.md'), defaultProfile)

      // Migrate Phase-3 personal-style.md → styles/default.md (idempotent)
      migratePersonalStyle(vaultPath)

      initializeDatabase(vaultPath)
      initEmbeddingsTable()
      initKnowledgeBaseTable()
      // Background reindex of all existing threads
      setImmediate(() => indexAllThreads(vaultPath))
    }
  }, 2000)
})

app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
