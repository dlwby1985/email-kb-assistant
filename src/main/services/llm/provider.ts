/**
 * LLM Provider abstraction interface
 * All providers implement this interface so switching requires zero code changes
 * outside of config.
 */

export interface GenerateParams {
  systemPrompt: string
  userMessage: string
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  maxTokens?: number
}

export interface GenerateResult {
  success: boolean
  text?: string
  error?: string
}

export interface LLMProvider {
  name: string
  generate(params: GenerateParams): Promise<GenerateResult>
  testConnection(): Promise<{ success: boolean; error?: string }>
  isAvailable(): boolean
}
