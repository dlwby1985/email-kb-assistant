import type { LLMProvider, GenerateParams, GenerateResult } from './provider'

export interface OllamaConfig {
  base_url: string
  model: string
}

export class OllamaProvider implements LLMProvider {
  readonly name: string

  constructor(private config: OllamaConfig) {
    this.name = `Ollama (${config.model})`
  }

  isAvailable(): boolean {
    return !!this.config.base_url && !!this.config.model
  }

  async generate(params: GenerateParams): Promise<GenerateResult> {
    const { systemPrompt, userMessage, conversationHistory = [], maxTokens = 4096 } = params

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ]

    try {
      const response = await fetch(`${this.config.base_url}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          stream: false,
          options: { num_predict: maxTokens },
        }),
      })

      if (!response.ok) {
        return { success: false, error: `Ollama error: HTTP ${response.status}` }
      }

      const data = await response.json() as any
      const text = data?.message?.content
      if (!text) return { success: false, error: 'Empty response from Ollama' }

      return { success: true, text }
    } catch (err: any) {
      if (err.message?.includes('fetch') || err.code === 'ECONNREFUSED') {
        return { success: false, error: 'Cannot connect to Ollama. Is it running? Start it with: ollama serve' }
      }
      return { success: false, error: err.message || 'Ollama request failed' }
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.config.base_url}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      })
      if (!response.ok) return { success: false, error: `HTTP ${response.status}` }
      return { success: true }
    } catch (_err: any) {
      return { success: false, error: 'Ollama is not running. Start it with: ollama serve' }
    }
  }
}
