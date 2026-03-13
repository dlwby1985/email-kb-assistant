import type { LLMProvider, GenerateParams, GenerateResult } from './provider'

export interface OpenAIConfig {
  base_url: string
  api_key: string
  model: string
  provider_name: string
}

export const OPENAI_PRESETS: Array<{ name: string; base_url: string; model: string }> = [
  { name: 'OpenAI',   base_url: 'https://api.openai.com/v1',        model: 'gpt-4o' },
  { name: 'DeepSeek', base_url: 'https://api.deepseek.com/v1',       model: 'deepseek-chat' },
  { name: 'Groq',     base_url: 'https://api.groq.com/openai/v1',    model: 'llama-3.1-70b-versatile' },
]

export class OpenAIProvider implements LLMProvider {
  readonly name: string

  constructor(private config: OpenAIConfig) {
    this.name = `${config.provider_name || 'OpenAI-Compatible'} (${config.model})`
  }

  isAvailable(): boolean {
    return !!this.config.api_key && !!this.config.base_url
  }

  async generate(params: GenerateParams): Promise<GenerateResult> {
    const { systemPrompt, userMessage, conversationHistory = [], maxTokens = 4096 } = params

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ]

    try {
      const response = await fetch(`${this.config.base_url}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.api_key}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          max_tokens: maxTokens,
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({})) as any
        if (response.status === 401) return { success: false, error: 'Invalid API key' }
        if (response.status === 429) return { success: false, error: 'Rate limited. Please wait a moment.' }
        return { success: false, error: errData?.error?.message || `HTTP ${response.status}` }
      }

      const data = await response.json() as any
      const text = data?.choices?.[0]?.message?.content
      if (!text) return { success: false, error: 'Empty response from API' }

      return { success: true, text }
    } catch (err: any) {
      return { success: false, error: err.message || 'Request failed' }
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.config.api_key) return { success: false, error: 'No API key configured' }
    try {
      const response = await fetch(`${this.config.base_url}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.api_key}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        }),
      })
      if (!response.ok) {
        if (response.status === 401) return { success: false, error: 'Invalid API key' }
        return { success: false, error: `HTTP ${response.status}` }
      }
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection failed' }
    }
  }
}
