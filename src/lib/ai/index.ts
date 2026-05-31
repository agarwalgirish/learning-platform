import type { AIProvider } from './types'
import { OpenAIProvider } from './openai-provider'
import { AnthropicProvider } from './anthropic-provider'
import { OllamaProvider } from './ollama-provider'

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
    case 'ollama':
      _aiProvider = new OllamaProvider()
      break
    default:
      _aiProvider = new OpenAIProvider()
  }
  return _aiProvider
}

export function getEmbeddingProvider(): AIProvider {
  if (_embeddingProvider) return _embeddingProvider

  const embedProvider = process.env.EMBEDDING_PROVIDER ?? process.env.AI_PROVIDER ?? 'openai'
  switch (embedProvider) {
    case 'ollama':
      _embeddingProvider = new OllamaProvider()
      break
    default:
      // Anthropic has no embeddings API — fall back to OpenAI
      _embeddingProvider = new OpenAIProvider()
  }
  return _embeddingProvider
}

export function resetProviders(): void {
  _aiProvider = null
  _embeddingProvider = null
}
