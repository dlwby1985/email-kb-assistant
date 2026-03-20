import type { LLMProvider } from './provider'
import { ClaudeProvider } from './claude-provider'
import { OpenAIProvider } from './openai-provider'
import { OllamaProvider } from './ollama-provider'
import { LocalProvider } from './local-provider'
import type { Config } from '../config'
import { getApiKey } from '../secure-storage'

/**
 * Returns the active LLM provider based on config.
 * API keys are read from OS safeStorage (secure-storage.ts), never from config.
 */
export function getActiveProvider(config: Config): LLMProvider {
  const active = config.llm?.active_provider ?? 'claude'

  switch (active) {
    case 'openai': {
      const oai = config.llm?.openai
      return new OpenAIProvider({
        base_url:      oai?.base_url      ?? 'https://api.openai.com/v1',
        api_key:       getApiKey('openai'),   // from safeStorage
        model:         oai?.model         ?? 'gpt-4o',
        provider_name: oai?.provider_name ?? 'OpenAI',
      })
    }

    case 'ollama': {
      const ol = config.llm?.ollama
      return new OllamaProvider({
        base_url: ol?.base_url ?? 'http://localhost:11434',
        model:    ol?.model    ?? 'llama3.1',
      })
    }

    case 'local': {
      return new LocalProvider(config.llm?.local ?? {})
    }

    default: { // 'claude'
      return new ClaudeProvider({
        api_key: getApiKey('anthropic'),      // from safeStorage
        model:   config.llm?.claude?.model ?? config.model ?? 'claude-sonnet-4-20250514',
      })
    }
  }
}
