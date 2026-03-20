import Anthropic from '@anthropic-ai/sdk'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface GenerateParams {
  systemPrompt: string
  userMessage: string
  conversationHistory?: Message[]
  model: string
  apiKey: string
}

interface GenerateResult {
  success: boolean
  text?: string
  error?: string
}

/**
 * Call Claude API to generate a response
 *
 * For initial generation: conversationHistory is empty, userMessage is the full input
 * For revisions: conversationHistory contains the prior exchange,
 *   userMessage is the revision instruction
 */
export async function generate(params: GenerateParams): Promise<GenerateResult> {
  const { systemPrompt, userMessage, conversationHistory = [], model, apiKey } = params

  try {
    const client = new Anthropic({ apiKey })

    // Build messages array
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []

    // Add conversation history (for revisions)
    for (const msg of conversationHistory) {
      messages.push({ role: msg.role, content: msg.content })
    }

    // Add current user message
    messages.push({ role: 'user', content: userMessage })

    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    })

    // Extract text from response
    const textBlock = response.content.find((block) => block.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return { success: false, error: 'No text in response' }
    }

    return { success: true, text: textBlock.text }
  } catch (err: any) {
    // Handle specific Anthropic errors
    if (err?.status === 401) {
      return { success: false, error: 'Invalid API key. Check your Anthropic API key in Settings.' }
    }
    if (err?.status === 429) {
      return { success: false, error: 'Rate limited. Please wait a moment and try again.' }
    }
    if (err?.status === 400) {
      return { success: false, error: `Bad request: ${err.message || 'Check your input'}` }
    }

    return {
      success: false,
      error: err.message || 'Failed to generate response',
    }
  }
}
