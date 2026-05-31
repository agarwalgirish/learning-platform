import Anthropic from '@anthropic-ai/sdk'
import type { AIProvider, AIMessage, AICompletionOptions, AICompletionResult } from './types'

export class AnthropicProvider implements AIProvider {
  private client: Anthropic
  private defaultModel: string

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    this.defaultModel = process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-20241022'
  }

  async complete(
    messages: AIMessage[],
    options: AICompletionOptions = {}
  ): Promise<AICompletionResult> {
    const systemMessages = messages.filter((m) => m.role === 'system')
    const chatMessages = messages.filter((m) => m.role !== 'system')

    const systemContent =
      options.systemPrompt ??
      systemMessages.map((m) => m.content).join('\n') ??
      undefined

    const response = await this.client.messages.create({
      model: options.model ?? this.defaultModel,
      max_tokens: options.maxTokens ?? 2000,
      ...(systemContent ? { system: systemContent } : {}),
      messages: chatMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    const contentBlock = response.content[0]
    return {
      content: contentBlock.type === 'text' ? contentBlock.text : '',
      model: response.model,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    }
  }

  async embed(_text: string): Promise<number[]> {
    // Anthropic does not provide embedding models; use OpenAI for embeddings
    throw new Error(
      'AnthropicProvider does not support embeddings. Set AI_PROVIDER=openai or configure a separate embedding provider.'
    )
  }

  async embedBatch(_texts: string[]): Promise<number[][]> {
    throw new Error(
      'AnthropicProvider does not support embeddings. Set AI_PROVIDER=openai or configure a separate embedding provider.'
    )
  }
}
