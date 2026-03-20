import type { LLMProvider, GenerateParams, GenerateResult } from './provider'

export interface LocalModelConfig {
  model_path?: string
  model_name?: string
  context_length?: number
  gpu_layers?: number
}

/**
 * Local model provider (node-llama-cpp)
 * Currently a stub — full implementation coming in a future release.
 * Requires: 16 GB RAM, 5+ GB disk, native module build
 */
export class LocalProvider implements LLMProvider {
  readonly name = 'Local Model'

  constructor(private _config: LocalModelConfig) {}

  isAvailable(): boolean {
    // Will return true when model_path exists and node-llama-cpp is initialized
    return false
  }

  async generate(_params: GenerateParams): Promise<GenerateResult> {
    return {
      success: false,
      error: 'Local model support is not yet available. Use Ollama for local model inference — install from ollama.com.',
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    return {
      success: false,
      error: 'Local model support is not yet available.',
    }
  }
}
