import { db } from '@/lib/db'
import { getEmbeddingProvider } from '@/lib/ai'
import type { DocumentChunkWithScore } from '@/types'

export async function embedText(text: string): Promise<number[]> {
  return getEmbeddingProvider().embed(text)
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  return getEmbeddingProvider().embedBatch(texts)
}

/**
 * Cosine-similarity search over document_chunks.
 * Columns are quoted ("documentId" etc.) — Prisma creates camelCase
 * column names in PostgreSQL without @map annotations.
 */
export async function searchSimilarChunks(
  query: string,
  options: { topicId?: string; organizationId: string; limit?: number; threshold?: number }
): Promise<DocumentChunkWithScore[]> {
  const queryEmbedding = await embedText(query)
  const limit = options.limit ?? 5
  const threshold = options.threshold ?? 0.65
  const vectorStr = `[${queryEmbedding.join(',')}]`

  type Row = {
    id: string; content: string; documentId: string; chunkIndex: number
    pageNumber: number | null; heading: string | null; originalName: string; similarity: number
  }

  const topicFilter = options.topicId ? `AND ud."topicId" = '${options.topicId}'::uuid` : ''

  try {
    const rows = await db.$queryRawUnsafe<Row[]>(`
      SELECT dc.id, dc.content, dc."documentId", dc."chunkIndex", dc."pageNumber",
             dc.heading, ud."originalName",
             1 - (dc."embeddingVector" <=> '${vectorStr}'::vector) AS similarity
      FROM document_chunks dc
      JOIN uploaded_documents ud ON dc."documentId" = ud.id
      WHERE ud."organizationId" = '${options.organizationId}'::uuid
        AND ud.status = 'READY'
        ${topicFilter}
        AND dc."embeddingVector" IS NOT NULL
        AND 1 - (dc."embeddingVector" <=> '${vectorStr}'::vector) > ${threshold}
      ORDER BY similarity DESC
      LIMIT ${limit}
    `)
    return rows.map((r) => ({
      id: r.id, content: r.content, documentId: r.documentId,
      documentName: r.originalName, chunkIndex: r.chunkIndex,
      pageNumber: r.pageNumber, heading: r.heading, score: Number(r.similarity),
    }))
  } catch (err) {
    console.error('[vector] searchSimilarChunks failed:', err)
    return []
  }
}

export async function storeChunkEmbedding(chunkId: string, embedding: number[]): Promise<void> {
  const vectorStr = `[${embedding.join(',')}]`
  await db.$executeRawUnsafe(
    `UPDATE document_chunks SET "embeddingVector" = '${vectorStr}'::vector WHERE id = '${chunkId}'::uuid`
  )
}
