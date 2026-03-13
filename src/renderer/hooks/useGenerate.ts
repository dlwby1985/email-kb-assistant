import { useState, useCallback, useRef } from 'react'
import type { GenerateRequest, GenerateResponse, SkillName } from '../types'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface UseGenerateReturn {
  output: string
  isLoading: boolean
  error: string | null
  skill: SkillName | null
  revisionCount: number
  generate: (request: GenerateRequest) => Promise<void>
  revise: (instruction: string) => Promise<void>
  regenerate: () => Promise<void>
  reset: () => void
  setOutput: (text: string) => void
}

export function useGenerate(): UseGenerateReturn {
  const [output, setOutput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [skill, setSkill] = useState<SkillName | null>(null)
  const [revisionCount, setRevisionCount] = useState(0)

  // Store the last request for regeneration
  const lastRequestRef = useRef<GenerateRequest | null>(null)
  // Store conversation history for revisions
  const historyRef = useRef<Message[]>([])

  const generate = useCallback(async (request: GenerateRequest) => {
    setIsLoading(true)
    setError(null)
    setRevisionCount(0)
    historyRef.current = []
    lastRequestRef.current = request

    try {
      const response = await window.electronAPI.generateRun(request)

      if (response.success && response.text) {
        setOutput(response.text)
        setSkill(response.skill || null)
        // Store in history for potential revisions
        historyRef.current = [
          { role: 'user', content: request.content },
          { role: 'assistant', content: response.text },
        ]
      } else {
        setError(response.error || 'Generation failed')
      }
    } catch (err: any) {
      setError(err.message || 'Generation failed')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const revise = useCallback(async (instruction: string) => {
    if (!lastRequestRef.current || !output) return

    setIsLoading(true)
    setError(null)

    try {
      // Create a revision request
      const revisionRequest: GenerateRequest = {
        ...lastRequestRef.current,
        revision: {
          previous_output: output,
          instruction,
        },
      }

      const response = await window.electronAPI.generateRun(revisionRequest)

      if (response.success && response.text) {
        setOutput(response.text)
        setRevisionCount((c) => c + 1)
        // Update history
        historyRef.current.push(
          { role: 'user', content: instruction },
          { role: 'assistant', content: response.text },
        )
      } else {
        setError(response.error || 'Revision failed')
      }
    } catch (err: any) {
      setError(err.message || 'Revision failed')
    } finally {
      setIsLoading(false)
    }
  }, [output])

  const regenerate = useCallback(async () => {
    if (!lastRequestRef.current) return
    // Re-run with original request (no revision)
    const request = { ...lastRequestRef.current, revision: null }
    await generate(request)
  }, [generate])

  const reset = useCallback(() => {
    setOutput('')
    setError(null)
    setSkill(null)
    setRevisionCount(0)
    lastRequestRef.current = null
    historyRef.current = []
  }, [])

  return {
    output,
    isLoading,
    error,
    skill,
    revisionCount,
    generate,
    revise,
    regenerate,
    reset,
    setOutput,
  }
}
