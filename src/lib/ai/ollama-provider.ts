/**
 * Ollama provider — runs Small Language Models (SLMs) locally.
 *
 * Ollama exposes an OpenAI-compatible API at http://localhost:11434/v1,
 * so we reuse the OpenAI SDK with a custom base URL — no extra dependency.
 *
 * Recommended models:
 *   Chat:       phi4-mini · mistral · llama3.2 · gemma3:4b
 *   Embeddings: nomic-embed-text (768-dim) · mxbai-embed-large (1024-dim)
 *
 * Setup:
 *   1. Install Ollama: https://ollama.com
 *   2. Pull a model: ollama pull phi4-mini
 *   3. Pull an embed model: ollama pull nomic-embed-text
 *   4. Set env vars (see .env.example)
 */

import OpenAI from 'openai'
import type { AIProvider, AIMessage, AICompletionOptions, AICompletionResult } from './types'

export class OllamaProvider implements AIProvider {
  private client: OpenAI
  private chatModel: string
  private embedModel: string

  constructor() {
    const baseURL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/v1'
    this.client = new OpenAI({
      baseURL,
      apiKey: 'ollama', // Ollama ignores the key but the SDK requires one
    })
    this.chatModel = process.env.OLLAMA_MODEL ?? 'phi4-mini'
    this.embedModel = process.env.OLLAMA_EMBEDDING_MODEL ?? 'nomic-embed-text'
  }

  async complete(
    messages: AIMessage[],
    options: AICompletionOptions = {}
  ): Promise<AICompletionResult> {
    const response = await this.client.chat.completions.create({
      model: options.model ?? this.chatModel,
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
    // Ollama's embedding endpoint via the OpenAI-compatible API
    const response = await this.client.embeddings.create({
      model: this.embedModel,
      input: text.replace(/\n/g, ' '),
    })
    return response.data[0].embedding
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // Ollama doesn't batch embeddings — run sequentially
    const results: number[][] = []
    for (const text of texts) {
      const embedding = await this.embed(text)
      results.push(embedding)
    }
    return results
  }
}
