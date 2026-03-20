import fs from 'fs'
import path from 'path'
import { getSubPath } from './vault'
import type { ExtractedTodo } from './todo-extractor'

/** Format of a saved todo (Obsidian Tasks plugin compatible) */
export interface SavedTodo {
  task: string
  deadline: string | null
  contact: string
  priority: 'high' | 'medium' | 'low'
  completed: boolean
  savedAt: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function todosDir(vaultPath: string): string {
  return getSubPath(vaultPath, 'todos')
}

function todosFilePath(vaultPath: string, date: string): string {
  // date must be YYYY-MM-DD
  return path.join(todosDir(vaultPath), `${date}.md`)
}

/** Convert priority to Obsidian Tasks emoji */
function priorityMarker(priority: 'high' | 'medium' | 'low'): string {
  if (priority === 'high')   return ' ⏫'
  if (priority === 'medium') return ' 🔼'
  return ''
}

/** Format a single todo as an Obsidian Tasks compatible task line */
function formatTodoLine(todo: ExtractedTodo, completed = false): string {
  const check = completed ? '[x]' : '[ ]'
  const prio  = priorityMarker(todo.priority)
  const dead  = todo.deadline ? ` 📅 ${todo.deadline}` : ''
  const tag   = todo.contact ? ` #email #${todo.contact.toLowerCase().replace(/\s+/g, '-')}` : ' #email'
  return `- ${check} ${todo.task.trim()}${prio}${dead}${tag}`
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Append todos to the daily todos file.
 * Creates the file and directory if they don't exist.
 * @param todos  Items to save
 * @param date   YYYY-MM-DD date string (defaults to today)
 */
export function appendTodos(
  vaultPath: string,
  todos: ExtractedTodo[],
  date?: string
): void {
  if (!todos.length) return

  const today = date ?? new Date().toISOString().slice(0, 10)
  const dir = todosDir(vaultPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  const filePath = todosFilePath(vaultPath, today)

  // Create file with header if new
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(
      filePath,
      `---\ndate: "${today}"\n---\n\n# Todos — ${today}\n\n`,
      'utf-8'
    )
  }

  const lines = todos.map((t) => formatTodoLine(t)).join('\n')
  fs.appendFileSync(filePath, lines + '\n', 'utf-8')
}

/**
 * Read todos for a specific date.
 * Returns raw lines (string[]) — each is one task line.
 */
export function getTodos(vaultPath: string, date: string): string[] {
  const filePath = todosFilePath(vaultPath, date)
  if (!fs.existsSync(filePath)) return []
  const content = fs.readFileSync(filePath, 'utf-8')
  return content
    .split('\n')
    .filter((line) => line.trimStart().startsWith('- ['))
}

/**
 * Toggle a todo's completion status within the daily file.
 * Matches by task text (first 40 chars).
 */
export function toggleTodo(
  vaultPath: string,
  date: string,
  taskText: string
): boolean {
  const filePath = todosFilePath(vaultPath, date)
  if (!fs.existsSync(filePath)) return false

  const content = fs.readFileSync(filePath, 'utf-8')
  const searchKey = taskText.substring(0, 40)
  const updated = content
    .split('\n')
    .map((line) => {
      if (!line.includes(searchKey)) return line
      if (line.includes('- [ ]')) return line.replace('- [ ]', '- [x]')
      if (line.includes('- [x]')) return line.replace('- [x]', '- [ ]')
      return line
    })
    .join('\n')

  fs.writeFileSync(filePath, updated, 'utf-8')
  return true
}

/**
 * List all daily todo file dates available.
 */
export function listTodoDates(vaultPath: string): string[] {
  const dir = todosDir(vaultPath)
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
    .map((f) => f.replace('.md', ''))
    .sort()
    .reverse()
}
