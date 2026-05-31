/**
 * POST /api/admin/reembed
 * Re-generates embeddings for all document chunks that have NULL embeddingVector.
 * Needed when documents were uploaded before OpenAI credits were available.
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { isInstructorOrAdmin } from '@/lib/permissions'
import type { UserRole } from '@/types'
import { embedBatch, storeChunkEmbedding } from '@/lib/vector'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  if (!isInstructorOrAdmin(user.role as UserRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const topicId = body.topicId as string | undefined

  // Find chunks with no embedding in this org's documents
  const chunks = await db.$queryRawUnsafe<Array<{ id: string; content: string; docId: string }>>(
    `SELECT dc.id, dc.content, dc."documentId" AS "docId"
     FROM document_chunks dc
     JOIN uploaded_documents ud ON dc."documentId" = ud.id
     WHERE ud."organizationId" = '${user.organizationId}'::uuid
       ${topicId ? `AND ud."topicId" = '${topicId}'::uuid` : ''}
       AND dc."embeddingVector" IS NULL
       AND length(dc.content) > 10
     LIMIT 500`
  )

  if (chunks.length === 0) {
    return NextResponse.json({ message: 'No chunks need re-embedding.', count: 0 })
  }

  console.log(`[reembed] Embedding ${chunks.length} chunks for org ${user.organizationId}`)

  // Embed in batches of 20
  const batchSize = 20
  let done = 0
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize)
    const texts = batch.map((c) => c.content)
    try {
      const embeddings = await embedBatch(texts)
      await Promise.all(batch.map((c, idx) => storeChunkEmbedding(c.id, embeddings[idx])))
      done += batch.length
    } catch (err) {
      console.error(`[reembed] Batch ${i} failed:`, err)
    }
  }

  // Mark affected documents as READY
  await db.uploadedDocument.updateMany({
    where: {
      organizationId: user.organizationId,
      status: { in: ['PENDING', 'PROCESSING'] },
      ...(topicId ? { topicId } : {}),
    },
    data: { status: 'READY' },
  })

  return NextResponse.json({
    message: `Re-embedded ${done} chunks successfully.`,
    count: done,
  })
}
