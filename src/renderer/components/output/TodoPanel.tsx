import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ExtractedTodo, TodoItem } from '../../types'

interface TodoPanelProps {
  todos: ExtractedTodo[]
  onSave: (selected: ExtractedTodo[]) => void
  onDismiss: () => void
  isSaving: boolean
}

export default function TodoPanel({ todos, onSave, onDismiss, isSaving }: TodoPanelProps) {
  const { t } = useTranslation()

  const PRIORITY_LABEL: Record<string, string> = {
    high:   `\u23eb ${t('tasks.high')}`,
    medium: `\ud83d\udd3c ${t('tasks.medium')}`,
    low:    `\u2194 ${t('tasks.low')}`,
  }

  const [items, setItems] = useState<TodoItem[]>(
    todos.map((todo) => ({ ...todo, included: true }))
  )
  const [newTaskText, setNewTaskText] = useState('')

  const toggle = (i: number) =>
    setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, included: !it.included } : it))

  const updateTask = (i: number, task: string) =>
    setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, task } : it))

  const updateDeadline = (i: number, deadline: string) =>
    setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, deadline: deadline || null } : it))

  const updatePriority = (i: number, priority: 'high' | 'medium' | 'low') =>
    setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, priority } : it))

  const removeItem = (i: number) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i))

  const addTask = () => {
    const text = newTaskText.trim()
    if (!text) return
    setItems((prev) => [...prev, {
      task: text,
      deadline: null,
      priority: 'medium',
      contact: '',
      included: true,
    }])
    setNewTaskText('')
  }

  const selectedCount = items.filter((it) => it.included).length

  const handleSave = () => {
    const selected = items.filter((it) => it.included).map(({ included: _inc, ...rest }) => rest)
    onSave(selected)
  }

  const headerLabel = todos.length > 0
    ? `\uD83D\uDCCB ${todos.length} ${t('tasks.actionDetected')}`
    : `\uD83D\uDCCB ${t('tasks.noActionItems')}`

  return (
    <div className="border-t border-gray-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-700/30">
      {/* Header */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-amber-200/60 dark:border-amber-700/30">
        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
          {headerLabel}
        </span>
        <button
          onClick={onDismiss}
          className="text-xs text-amber-500 hover:text-amber-700 dark:hover:text-amber-300"
        >
          ✕ {t('tasks.dismiss')}
        </button>
      </div>

      {/* Todo list */}
      <div className="px-4 py-3 space-y-2.5 max-h-72 overflow-y-auto">
        {items.map((item, i) => (
          <div key={i} className={`flex items-start gap-2 ${!item.included ? 'opacity-40' : ''}`}>
            {/* Checkbox */}
            <input
              type="checkbox"
              checked={item.included}
              onChange={() => toggle(i)}
              className="mt-1 shrink-0 accent-asu-maroon"
            />
            <div className="flex-1 min-w-0 space-y-1">
              {/* Task text */}
              <input
                type="text"
                value={item.task}
                onChange={(e) => updateTask(i, e.target.value)}
                disabled={!item.included}
                className="w-full text-xs border border-gray-200 rounded px-2 py-1 bg-white dark:bg-gray-800 dark:border-gray-600 disabled:bg-gray-50 dark:disabled:bg-gray-900 focus:outline-none focus:border-asu-maroon"
              />
              <div className="flex items-center gap-2">
                {/* Due date */}
                <input
                  type="date"
                  value={item.deadline ?? ''}
                  onChange={(e) => updateDeadline(i, e.target.value)}
                  disabled={!item.included}
                  className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white dark:bg-gray-800 dark:border-gray-600 disabled:bg-gray-50 focus:outline-none focus:border-asu-maroon"
                />
                {/* Priority */}
                <select
                  value={item.priority}
                  onChange={(e) => updatePriority(i, e.target.value as 'high' | 'medium' | 'low')}
                  disabled={!item.included}
                  className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white dark:bg-gray-800 dark:border-gray-600 disabled:bg-gray-50 focus:outline-none focus:border-asu-maroon"
                >
                  {(['high', 'medium', 'low'] as const).map((p) => (
                    <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                  ))}
                </select>
              </div>
            </div>
            {/* Remove button */}
            <button
              onClick={() => removeItem(i)}
              className="mt-0.5 text-gray-300 hover:text-red-400 transition-colors shrink-0 text-sm leading-none"
              title={t('tasks.remove')}
            >
              ×
            </button>
          </div>
        ))}

        {/* Manual task entry */}
        <div className="flex items-center gap-2 pt-1 border-t border-amber-200/60 dark:border-amber-700/30">
          <input
            type="text"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addTask() }}
            placeholder={t('tasks.addManually')}
            className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 bg-white dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:border-asu-maroon"
          />
          <button
            onClick={addTask}
            disabled={!newTaskText.trim()}
            className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 hover:border-asu-maroon hover:text-asu-maroon disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-white"
          >
            {t('tasks.addButton')}
          </button>
        </div>
      </div>

      {/* Footer buttons */}
      <div className="px-4 py-2 border-t border-amber-200/60 dark:border-amber-700/30 flex items-center justify-end gap-2">
        <button
          onClick={onDismiss}
          className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          {t('tasks.skip')}
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || selectedCount === 0}
          className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving
            ? t('tasks.saving')
            : `${selectedCount > 0 ? selectedCount + ' ' : ''}${t('tasks.saveTodos')}`
          }
        </button>
      </div>
    </div>
  )
}
