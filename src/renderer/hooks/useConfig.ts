import { useState, useEffect, useCallback } from 'react'
import type { Config } from '../types'

interface UseConfigReturn {
  config: Config | null
  loading: boolean
  error: string | null
  updateConfig: (config: Config) => Promise<void>
  refresh: () => Promise<void>
}

export function useConfig(): UseConfigReturn {
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadConfig = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const cfg = await window.electronAPI.configRead()
      setConfig(cfg)
    } catch (err: any) {
      setError(err.message || 'Failed to load config')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const updateConfig = useCallback(async (newConfig: Config) => {
    try {
      await window.electronAPI.configWrite(newConfig)
      setConfig(newConfig)
    } catch (err: any) {
      setError(err.message || 'Failed to save config')
      throw err
    }
  }, [])

  return {
    config,
    loading,
    error,
    updateConfig,
    refresh: loadConfig,
  }
}
