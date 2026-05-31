import { db } from '@/lib/db'
import { getEmbeddingProvider } from '@/lib/ai'
import type { DocumentChunkWithScore } from '@/types'

export async function embedText(text: string): Promise<number[]> {
  const provider = getEmbeddingProvider()
  return provider.embed(text)
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const provider = getEmbeddingProvider()
  return provider.embedBatch(texts)
}

export async function searchSimilarChunks(
  query: string,
  options: {
    topicId?: string
    organizationId: string
    limit?: number
    threshold?: number
  }
): Promise<DocumentChunkWithScore[]> {
  const queryEmbedding = await embedText(query)
  const limit = options.limit ?? 5
  const threshold = options.threshold ?? 0.65

  const vectorStr = `[${queryEmbedding.join(',')}]`

  type RawRow = {
    id: string
    content: string
    document_id: string
    chunk_index: number
    page_number: number | null
    heading: string | null
    original_name: string
    similarity: number
  }

  const topicFilter = options.topicId
    ? `AND ud.topic_id = '${options.topicId}'::uuid`
    : ''

  const results = await db.$queryRawUnsafe<RawRow[]>(`
    SELECT
      dc.id,
      dc.content,
      dc.document_id,
      dc.chunk_index,
      dc.page_number,
      dc.heading,
      ud.original_name,
      1 - (dc.embedding_vector <=> '${vectorStr}'::vector) AS similarity
    FROM document_chunks dc
    JOIN uploaded_documents ud ON dc.document_id = ud.id
    WHERE ud.organization_id = '${options.organizationId}'::uuid
      AND ud.status = 'READY'
      ${topicFilter}
      AND dc.embedding_vector IS NOT NULL
      AND 1 - (dc.embedding_vector <=> '${vectorStr}'::vector) > ${threshold}
    ORDER BY similarity DESC
    LIMIT ${limit}
  `)

  return results.map((r) => ({
    id: r.id,
    content: r.content,
    documentId: r.document_id,
    documentName: r.original_name,
    chunkIndex: r.chunk_index,
    pageNumber: r.page_number,
    heading: r.heading,
    score: Number(r.similarity),
  }))
}

export async function storeChunkEmbedding(
  chunkId: string,
  embedding: number[]
): Promise<void> {
  const vectorStr = `[${embedding.join(',')}]`
  await db.$executeRawUnsafe(
    `UPDATE document_chunks SET embedding_vector = '${vectorStr}'::vector WHERE id = '${chunkId}'::uuid`
  )
}
