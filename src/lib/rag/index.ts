import { searchSimilarChunks } from '@/lib/vector'
import { getAIProvider } from '@/lib/ai'
import type { AIMessage } from '@/lib/ai'
import type { DocumentChunkWithScore, TutorMessage } from '@/types'

export interface RAGResponse {
  content: string
  sources: DocumentChunkWithScore[]
  tokensUsed: number
}

// Resolve AI provider from org-level AIConfig, fall back to env var
async function resolveProvider(organizationId: string) {
  try {
    const { db } = await import('@/lib/db')
    const { OpenAIProvider } = await import('@/lib/ai/openai-provider')
    const { AnthropicProvider } = await import('@/lib/ai/anthropic-provider')

    const config = await db.aIConfig.findUnique({
      where: { organizationId },
      select: { provider: true },
    })
    if (config?.provider) {
      return config.provider === 'anthropic' ? new AnthropicProvider() : new OpenAIProvider()
    }
  } catch (err) {
    console.error('[rag] resolveProvider failed, using default:', err)
  }
  return getAIProvider()
}

const STRICT_TUTOR_PROMPT = `You are an expert AI learning tutor for an enterprise learning platform.

STRICT RULES — follow without exception:
1. You may ONLY teach from the KNOWLEDGE BASE CONTEXT provided below.
2. Do NOT use any outside knowledge, general world knowledge, or invented examples.
3. If the knowledge base has no content for the question, respond EXACTLY with:
   "I don't have enough information about that in the uploaded materials for **[TOPIC]**.
   Please ask your admin or instructor to upload documents covering this area."
4. Never invent, guess, or improvise. Every fact must come from the context.
5. Always cite the source document name when referencing specific information.
6. Adapt your explanation to the learner's proficiency level.
7. Keep responses focused, structured, and educational.`

export async function generateTutorResponse(
  messages: TutorMessage[],
  context: {
    topicId: string
    topicName?: string
    organizationId: string
    proficiencyLevel: string
    query: string
    userId?: string  // kept for API compatibility; user-level override not active on this branch
  }
): Promise<RAGResponse> {
  const topic = context.topicName || 'this topic'

  // For long instruction-style messages (intro prompts), use just the topic name
  // as the search query — instruction text doesn't embed well against document content
  const searchQuery = context.query.length > 200
    ? topic
    : context.query

  // Lower threshold (0.4) to catch real content — Vaisala PDF chunks score ~0.55–0.63
  const sources = await searchSimilarChunks(searchQuery, {
    topicId: context.topicId,
    organizationId: context.organizationId,
    limit: 6,
    threshold: 0.4,
  })

  const hasContext = sources.length > 0

  const contextText = hasContext
    ? sources
        .map(
          (s, i) =>
            `[Source ${i + 1}: ${s.documentName}${s.pageNumber ? `, page ${s.pageNumber}` : ''}]\n${s.content}`
        )
        .join('\n\n---\n\n')
    : `NO DOCUMENTS FOUND — The knowledge base has no uploaded or indexed content for "${topic}" yet.`

  const systemContent = `${STRICT_TUTOR_PROMPT.replace('[TOPIC]', topic)}

Topic you are teaching: ${topic}
Learner's proficiency level: ${context.proficiencyLevel}

${hasContext ? 'KNOWLEDGE BASE CONTEXT (use only this):' : 'KNOWLEDGE BASE STATUS:'}
${contextText}`

  const systemMessage: AIMessage = { role: 'system', content: systemContent }

  const chatMessages: AIMessage[] = messages
    .filter((m) => m.role !== 'system')
    .slice(-10)
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  const provider = await resolveProvider(context.organizationId)
  const result = await provider.complete([systemMessage, ...chatMessages], {
    temperature: 0.4, // Lower temperature = more faithful to source material
    maxTokens: 1500,
  })

  return {
    content: result.content,
    sources,
    tokensUsed: result.usage.totalTokens,
  }
}

export async function generateDiagnosticQuestions(
  topicName: string,
  organizationId: string,
  topicId: string,
  count = 8
): Promise<string> {
  const sources = await searchSimilarChunks(
    `key concepts and fundamentals of ${topicName}`,
    { topicId, organizationId, limit: 8, threshold: 0.5 }
  )

  const contextText = sources.map((s) => s.content).join('\n\n').slice(0, 4000)

  const provider = await resolveProvider(organizationId)
  const result = await provider.complete(
    [
      {
        role: 'system',
        content: `You are an expert instructional designer. Generate ${count} multiple-choice diagnostic questions
that span BEGINNER, INTERMEDIATE, and ADVANCED levels to assess a learner's knowledge of "${topicName}".

Use ONLY this knowledge base content:
${contextText || 'No specific content available — generate general questions about ' + topicName}

Return ONLY valid JSON:
{
  "questions": [
    {
      "text": "Question text",
      "type": "MULTIPLE_CHOICE",
      "difficulty": "BEGINNER",
      "concept": "concept name",
      "explanation": "why correct answer is correct",
      "options": [
        {"text": "Option A", "isCorrect": true},
        {"text": "Option B", "isCorrect": false},
        {"text": "Option C", "isCorrect": false},
        {"text": "Option D", "isCorrect": false}
      ]
    }
  ]
}`,
      },
      { role: 'user', content: `Generate ${count} diagnostic questions for "${topicName}"` },
    ],
    { temperature: 0.5, maxTokens: 3000 }
  )

  return result.content
}

export async function generateQuizQuestions(
  topicName: string,
  organizationId: string,
  topicId: string,
  proficiencyLevel: string,
  count = 5,
  concepts?: string[]
): Promise<string> {
  const query = concepts?.length ? concepts.join(', ') : `${proficiencyLevel} level ${topicName}`
  const sources = await searchSimilarChunks(query, {
    topicId, organizationId, limit: 6, threshold: 0.5,
  })

  const contextText = sources.map((s) => s.content).join('\n\n').slice(0, 3000)

  const provider = await resolveProvider(organizationId)
  const result = await provider.complete(
    [
      {
        role: 'system',
        content: `Generate ${count} quiz questions at ${proficiencyLevel} level for "${topicName}".
Focus on: ${concepts?.join(', ') || 'core concepts'}

Knowledge base content:
${contextText || 'No specific content — generate general questions about ' + topicName}

Return ONLY valid JSON:
{
  "questions": [
    {
      "text": "Question",
      "type": "MULTIPLE_CHOICE",
      "difficulty": "${proficiencyLevel}",
      "concept": "concept",
      "explanation": "explanation",
      "options": [
        {"text": "A", "isCorrect": true},
        {"text": "B", "isCorrect": false},
        {"text": "C", "isCorrect": false},
        {"text": "D", "isCorrect": false}
      ]
    }
  ]
}`,
      },
      { role: 'user', content: 'Generate the quiz questions.' },
    ],
    { temperature: 0.6, maxTokens: 2000 }
  )

  return result.content
}
