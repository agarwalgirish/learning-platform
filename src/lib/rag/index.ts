import { searchSimilarChunks } from '@/lib/vector'
import { getAIProviderForOrg } from '@/lib/ai'
import type { AIMessage } from '@/lib/ai'
import type { DocumentChunkWithScore, TutorMessage } from '@/types'

export interface RAGResponse {
  content: string
  sources: DocumentChunkWithScore[]
  tokensUsed: number
}

const TUTOR_SYSTEM_PROMPT = `You are an expert AI learning tutor for an enterprise learning platform.

Your job is to:
1. Teach concepts clearly using ONLY the provided knowledge base content
2. Start simple and increase complexity based on the learner's level
3. Use analogies and examples drawn from the knowledge base
4. Check understanding by asking follow-up questions
5. Identify and correct misconceptions
6. Always cite the source document and section used in your answers

STRICT RULES — you must follow these without exception:
- ONLY teach from the KNOWLEDGE BASE CONTEXT provided below. Do not use any outside knowledge.
- If the knowledge base does not contain enough information to answer, respond with:
  "I don't have enough information about that in the uploaded materials for this topic.
   Please ask your instructor to upload content covering this area."
- Never make up information, never use general world knowledge, never go off-topic.
- Every factual claim must be traceable to a source in the KNOWLEDGE BASE CONTEXT.
- If the knowledge base is empty, do not guess or improvise — say so explicitly.`

export async function generateTutorResponse(
  messages: TutorMessage[],
  context: {
    topicId: string
    topicName?: string
    organizationId: string
    proficiencyLevel: string
    query: string
    userId?: string
  }
): Promise<RAGResponse> {
  // Retrieve relevant chunks from the knowledge base
  const sources = await searchSimilarChunks(context.query, {
    topicId: context.topicId,
    organizationId: context.organizationId,
    limit: 5,
    threshold: 0.6,
  })

  const contextText =
    sources.length > 0
      ? sources
          .map(
            (s, i) =>
              `[Source ${i + 1}: ${s.documentName}${s.pageNumber ? `, page ${s.pageNumber}` : ''}]\n${s.content}`
          )
          .join('\n\n---\n\n')
      : 'NO DOCUMENTS FOUND — The knowledge base has no uploaded content for this topic yet. You must inform the learner and ask them to contact their admin to upload materials.'

  const systemMessage: AIMessage = {
    role: 'system',
    content: `${TUTOR_SYSTEM_PROMPT}

Topic you are teaching: ${context.topicName ?? 'the assigned topic'}
Learner's current proficiency level: ${context.proficiencyLevel}

KNOWLEDGE BASE CONTEXT:
${contextText}`,
  }

  const chatMessages: AIMessage[] = messages
    .filter((m) => m.role !== 'system')
    .slice(-10) // Keep last 10 messages for context window efficiency
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  const provider = await getAIProviderForOrg(context.organizationId, context.userId)
  const result = await provider.complete([systemMessage, ...chatMessages], {
    temperature: 0.7,
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

  const contextText = sources
    .map((s) => s.content)
    .join('\n\n')
    .slice(0, 4000)

  const provider = await getAIProviderForOrg(organizationId)
  const result = await provider.complete(
    [
      {
        role: 'system',
        content: `You are an expert instructional designer creating diagnostic assessments.
Generate ${count} multiple-choice questions that span BEGINNER, INTERMEDIATE, and ADVANCED levels to assess a learner's knowledge of "${topicName}".

Use this knowledge base content:
${contextText}

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "text": "Question text here",
      "type": "MULTIPLE_CHOICE",
      "difficulty": "BEGINNER",
      "concept": "concept name",
      "explanation": "Why the correct answer is correct",
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
  const query = concepts?.length
    ? concepts.join(', ')
    : `${proficiencyLevel.toLowerCase()} level questions about ${topicName}`

  const sources = await searchSimilarChunks(query, {
    topicId,
    organizationId,
    limit: 6,
    threshold: 0.5,
  })

  const contextText = sources
    .map((s) => s.content)
    .join('\n\n')
    .slice(0, 3000)

  const provider = await getAIProviderForOrg(organizationId)
  const result = await provider.complete(
    [
      {
        role: 'system',
        content: `Generate ${count} quiz questions at ${proficiencyLevel} level for "${topicName}".
Focus on: ${concepts?.join(', ') || 'core concepts'}

Context:
${contextText}

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
