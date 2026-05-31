import type { AIProvider } from './types'
import { OpenAIProvider } from './openai-provider'
import { AnthropicProvider } from './anthropic-provider'

export type {
  AIProvider,
  AIMessage,
  AICompletionOptions,
  AICompletionResult,
} from './types'

let _aiProvider: AIProvider | null = null
let _embeddingProvider: AIProvider | null = null

export function getAIProvider(): AIProvider {
  if (_aiProvider) return _aiProvider

  const provider = process.env.AI_PROVIDER ?? 'openai'
  switch (provider) {
    case 'anthropic':
      _aiProvider = new AnthropicProvider()
      break
    default:
      _aiProvider = new OpenAIProvider()
  }
  return _aiProvider
}

// Embeddings always use OpenAI — Anthropic doesn't offer an embeddings API
export function getEmbeddingProvider(): AIProvider {
  if (_embeddingProvider) return _embeddingProvider
  _embeddingProvider = new OpenAIProvider()
  return _embeddingProvider
}

// Reset providers (useful in tests or when config changes)
export function resetProviders(): void {
  _aiProvider = null
  _embeddingProvider = null
}
