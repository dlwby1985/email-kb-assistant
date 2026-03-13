import { ipcMain } from 'electron'
import { getVaultPath } from '../services/app-state'
import { extractTodos } from '../services/todo-extractor'
import { appendTodos, getTodos, toggleTodo, listTodoDates } from '../services/todo-storage'
import type { ExtractedTodo } from '../services/todo-extractor'

export function registerTodosHandlers() {
  /**
   * todos:extract — use AI to extract action items from generated email text.
   * Returns: { success, todos: ExtractedTodo[], error? }
   */
  ipcMain.handle(
    'todos:extract',
    async (_event, text: string, contactName: string) => {
      const vaultPath = getVaultPath()
      if (!vaultPath) return { success: false, todos: [], error: 'Vault not initialized' }
      try {
        const todos = await extractTodos(text, contactName, vaultPath)
        return { success: true, todos }
      } catch (err: any) {
        console.error('[todos:extract] error:', err)
        return { success: false, todos: [], error: err.message }
      }
    }
  )

  /**
   * todos:save — persist selected todos to the daily Markdown file.
   * Returns: { success, error? }
   */
  ipcMain.handle(
    'todos:save',
    async (_event, todos: ExtractedTodo[], date?: string) => {
      const vaultPath = getVaultPath()
      if (!vaultPath) return { success: false, error: 'Vault not initialized' }
      try {
        appendTodos(vaultPath, todos, date)
        return { success: true }
      } catch (err: any) {
        console.error('[todos:save] error:', err)
        return { success: false, error: err.message }
      }
    }
  )

  /**
   * todos:list — list task lines for a given date (or today).
   */
  ipcMain.handle('todos:list', async (_event, date?: string) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) return { success: false, lines: [] }
    const today = date ?? new Date().toISOString().slice(0, 10)
    const lines = getTodos(vaultPath, today)
    return { success: true, date: today, lines }
  })

  /**
   * todos:list-dates — list all available daily todo dates.
   */
  ipcMain.handle('todos:list-dates', async () => {
    const vaultPath = getVaultPath()
    if (!vaultPath) return { success: false, dates: [] }
    const dates = listTodoDates(vaultPath)
    return { success: true, dates }
  })

  /**
   * todos:toggle — toggle a todo's completion state in the daily file.
   */
  ipcMain.handle('todos:toggle', async (_event, date: string, taskText: string) => {
    const vaultPath = getVaultPath()
    if (!vaultPath) return { success: false }
    const ok = toggleTodo(vaultPath, date, taskText)
    return { success: ok }
  })
}
