import { readConfig } from './config'
import { getActiveProvider } from './llm/manager'

export interface ExtractedTodo {
  task: string
  deadline: string | null
  contact: string
  priority: 'high' | 'medium' | 'low'
}

/**
 * Use the active LLM provider to extract action items / todos from an email draft.
 *
 * Returns an empty array if nothing actionable is found.
 */
export async function extractTodos(
  text: string,
  contactName: string,
  vaultPath: string
): Promise<ExtractedTodo[]> {
  const config = readConfig(vaultPath)
  const provider = getActiveProvider(config)

  const systemPrompt = [
    'You are an email action-item extractor.',
    'Analyze the following email draft and extract ONLY clear, explicit commitments or follow-up actions',
    'that the email author (sender) is committing to.',
    '',
    'Return ONLY a JSON array — no markdown fences, no explanation.',
    'Each element: {"task": string, "deadline": string|null, "contact": string, "priority": "high"|"medium"|"low"}',
    '',
    'Rules:',
    '- Only extract concrete commitments ("I will", "I\'ll", "Let me", "I can send"), not vague mentions',
    '- deadline: ISO date string if a specific date/time is mentioned; otherwise null',
    '- contact: the person this action relates to (use the provided contact name if applicable)',
    '- priority: high if urgent/time-sensitive, low if open-ended, medium otherwise',
    '- If there are no action items, return an empty array []',
  ].join('\n')

  const userMessage = [
    `Contact: ${contactName || 'Unknown'}`,
    '',
    'Email draft:',
    text.substring(0, 4000),
  ].join('\n')

  try {
    const result = await provider.generate({
      systemPrompt,
      userMessage,
      maxTokens: 800,
    })

    if (!result.success || !result.text) return []

    // Extract JSON array from response
    const jsonMatch = result.text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const items = JSON.parse(jsonMatch[0]) as ExtractedTodo[]
      if (Array.isArray(items)) {
        return items.filter(
          (item) => typeof item.task === 'string' && item.task.trim().length > 0
        )
      }
    }
  } catch (err) {
    console.error('[todo-extractor] extraction failed:', err)
  }

  return []
}
