import OpenAI from 'openai'
import type { AIProvider, AIMessage, AICompletionOptions, AICompletionResult } from './types'

export class OpenAIProvider implements AIProvider {
  private client: OpenAI
  private defaultModel: string
  private embeddingModel: string

  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    this.defaultModel = process.env.OPENAI_MODEL ?? 'gpt-4o'
    this.embeddingModel = process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small'
  }

  async complete(
    messages: AIMessage[],
    options: AICompletionOptions = {}
  ): Promise<AICompletionResult> {
    const response = await this.client.chat.completions.create({
      model: options.model ?? this.defaultModel,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    })

    const choice = response.choices[0]
    return {
      content: choice.message.content ?? '',
      model: response.model,
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
    }
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.embeddingModel,
      input: text.replace(/\n/g, ' '),
    })
    return response.data[0].embedding
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: this.embeddingModel,
      input: texts.map((t) => t.replace(/\n/g, ' ')),
    })
    return response.data
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding)
  }
}
