import Anthropic from '@anthropic-ai/sdk'
import type { LLMProvider, GenerateParams, GenerateResult } from './provider'

export interface ClaudeConfig {
  api_key: string
  model: string
}

export class ClaudeProvider implements LLMProvider {
  readonly name: string

  constructor(private config: ClaudeConfig) {
    this.name = `Claude (${config.model})`
  }

  isAvailable(): boolean {
    return !!this.config.api_key
  }

  async generate(params: GenerateParams): Promise<GenerateResult> {
    const { systemPrompt, userMessage, conversationHistory = [], maxTokens = 4096 } = params

    try {
      const client = new Anthropic({ apiKey: this.config.api_key })

      const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
        ...conversationHistory,
        { role: 'user', content: userMessage },
      ]

      const response = await client.messages.create({
        model: this.config.model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
      })

      const textBlock = response.content.find((b) => b.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        return { success: false, error: 'No text in response' }
      }

      return { success: true, text: textBlock.text }
    } catch (err: any) {
      if (err?.status === 401) return { success: false, error: 'Invalid API key. Check your Anthropic API key in Settings.' }
      if (err?.status === 429) return { success: false, error: 'Rate limited. Please wait a moment and try again.' }
      if (err?.status === 400) return { success: false, error: `Bad request: ${err.message || 'Check your input'}` }
      return { success: false, error: err.message || 'Failed to generate response' }
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.config.api_key) return { success: false, error: 'No API key configured' }
    try {
      const client = new Anthropic({ apiKey: this.config.api_key })
      await client.messages.create({
        model: this.config.model,
        max_tokens: 5,
        messages: [{ role: 'user', content: 'Hi' }],
      })
      return { success: true }
    } catch (err: any) {
      if (err?.status === 401) return { success: false, error: 'Invalid API key' }
      return { success: false, error: err.message || 'Connection failed' }
    }
  }
}
