export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AICompletionOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
}

export interface AICompletionResult {
  content: string
  model: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface AIProvider {
  complete(messages: AIMessage[], options?: AICompletionOptions): Promise<AICompletionResult>
  embed(text: string): Promise<number[]>
  embedBatch(texts: string[]): Promise<number[][]>
}
