import fs from 'fs'
import path from 'path'

const DATA_DIR = 'EmailKB'

// ── Path safety helpers ───────────────────────────────────────────────────────

/**
 * Throws if `filePath` is not inside the EmailKB directory.
 * Prevents path-traversal attacks on IPC handlers that accept file paths.
 *
 * Uses path.resolve() so ".." sequences are normalised before comparison.
 */
export function requirePathInVault(filePath: string, vaultPath: string): void {
  const resolved = path.resolve(filePath)
  const kbDir    = path.resolve(getEmailKBPath(vaultPath))
  // Allow exact match (kbDir itself) or any file inside it
  if (resolved !== kbDir && !resolved.startsWith(kbDir + path.sep)) {
    throw new Error(`Access denied: path is outside the EmailKB directory`)
  }
}

/**
 * Throws if `filename` contains path separators or ".." sequences.
 * Use for slug/filename parameters that are joined onto a fixed directory.
 */
export function requireSafeFilename(filename: string): void {
  if (
    filename.includes('/') ||
    filename.includes('\\') ||
    filename.includes('..') ||
    filename.includes('\0')
  ) {
    throw new Error(`Invalid filename: must not contain path separators or null bytes`)
  }
}

/**
 * Get the full path to the EmailKB directory inside the vault
 */
export function getEmailKBPath(vaultPath: string): string {
  return path.join(vaultPath, DATA_DIR)
}

/**
 * Get the path to a specific subdirectory inside EmailKB
 */
export function getSubPath(vaultPath: string, ...segments: string[]): string {
  return path.join(getEmailKBPath(vaultPath), ...segments)
}

/**
 * Check if the EmailKB directory already exists in the vault
 */
export function vaultExists(vaultPath: string): boolean {
  const kbPath = getEmailKBPath(vaultPath)
  return fs.existsSync(kbPath) && fs.existsSync(path.join(kbPath, 'config.yaml'))
}

/**
 * Create all required subdirectories inside the vault's EmailKB folder
 */
export function initializeVaultStructure(vaultPath: string): void {
  const kbPath = getEmailKBPath(vaultPath)

  const directories = [
    kbPath,
    path.join(kbPath, 'contacts'),
    path.join(kbPath, 'skills'),
    path.join(kbPath, 'templates'),
    path.join(kbPath, 'projects'),
    path.join(kbPath, 'drafts'),
  ]

  for (const dir of directories) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }
}

/**
 * Write a file only if it doesn't already exist (idempotent)
 */
export function writeFileIfNotExists(filePath: string, content: string): boolean {
  if (fs.existsSync(filePath)) {
    return false // Already exists, skip
  }
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(filePath, content, 'utf-8')
  return true // Created
}
