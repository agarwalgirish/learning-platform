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

export function buildProvider(name: string): AIProvider {
  switch (name) {
    case 'anthropic': return new AnthropicProvider()
    case 'ollama':    return new OllamaProvider()
    default:          return new OpenAIProvider()
  }
}

/** Default provider — uses env vars only. Used in scripts and non-org contexts. */
export function getAIProvider(): AIProvider {
  if (_aiProvider) return _aiProvider
  _aiProvider = buildProvider(process.env.AI_PROVIDER ?? 'openai')
  return _aiProvider
}

/**
 * Resolve the AI provider for a request, honouring the override hierarchy:
 *
 *   User override (aiOverride.provider)
 *     → Org config (AIConfig.provider)
 *       → Env var (AI_PROVIDER)
 *
 * Pass userId to check user-level override first.
 * Pass only organizationId to use org config only.
 */
export async function getAIProviderForOrg(
  organizationId: string,
  userId?: string
): Promise<AIProvider> {
  const { db } = await import('@/lib/db')

  // 1. Check user-level override (highest priority)
  if (userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { aiOverride: true },
    })
    const override = user?.aiOverride as { provider?: string } | null
    if (override?.provider) {
      return buildProvider(override.provider)
    }
  }

  // 2. Fall back to org-level config
  const config = await db.aIConfig.findUnique({
    where: { organizationId },
    select: { provider: true },
  })
  if (config?.provider) {
    return buildProvider(config.provider)
  }

  // 3. Fall back to env var
  return buildProvider(process.env.AI_PROVIDER ?? 'openai')
}

export function getEmbeddingProvider(): AIProvider {
  if (_embeddingProvider) return _embeddingProvider
  const name = process.env.EMBEDDING_PROVIDER ?? process.env.AI_PROVIDER ?? 'openai'
  _embeddingProvider = buildProvider(name)
  return _embeddingProvider
}

export function resetProviders(): void {
  _aiProvider = null
  _embeddingProvider = null
}
