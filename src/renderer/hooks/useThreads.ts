import { useState, useCallback } from 'react'
import type { SaveThreadParams, ThreadMeta } from '../types'

interface UseThreadsReturn {
  isSaving: boolean
  saveError: string | null
  saveThread: (params: SaveThreadParams) => Promise<{ success: boolean; fileName?: string; threadFilePath?: string; templateFilePath?: string }>
  listThreads: (contactSlug: string) => Promise<ThreadMeta[]>
  getExistingThreads: (contactSlug: string) => Promise<Array<{ fileName: string; label: string }>>
}

export function useThreads(): UseThreadsReturn {
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const saveThread = useCallback(async (params: SaveThreadParams) => {
    setIsSaving(true)
    setSaveError(null)
    try {
      const result = await window.electronAPI.threadsSave(params)
      return result
    } catch (err: any) {
      const msg = err.message || 'Failed to save thread'
      setSaveError(msg)
      return { success: false }
    } finally {
      setIsSaving(false)
    }
  }, [])

  const listThreads = useCallback(async (contactSlug: string): Promise<ThreadMeta[]> => {
    try {
      return await window.electronAPI.threadsList(contactSlug)
    } catch {
      return []
    }
  }, [])

  const getExistingThreads = useCallback(async (contactSlug: string) => {
    try {
      return await window.electronAPI.threadsGetExisting(contactSlug)
    } catch {
      return []
    }
  }, [])

  return {
    isSaving,
    saveError,
    saveThread,
    listThreads,
    getExistingThreads,
  }
}
