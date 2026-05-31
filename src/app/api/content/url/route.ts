/**
 * POST /api/content/url
 * Fetches a URL, strips HTML, chunks the text, and indexes it for RAG.
 * Body: { url: string, topicId: string, title?: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { isInstructorOrAdmin } from '@/lib/permissions'
import type { UserRole } from '@/types'
import { chunkText } from '@/lib/processor'
import { embedBatch, storeChunkEmbedding } from '@/lib/vector'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

const schema = z.object({
  url: z.string().url(),
  topicId: z.string().uuid(),
  title: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any
  if (!isInstructorOrAdmin(user.role as UserRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let data: z.infer<typeof schema>
  try {
    data = schema.parse(await request.json())
  } catch (err) {
    return NextResponse.json({ error: 'url and topicId are required' }, { status: 400 })
  }

  // Create a pending document record immediately
  const docId = uuidv4()
  const doc = await db.uploadedDocument.create({
    data: {
      id: docId,
      fileName: `url-${docId}.txt`,
      originalName: data.title ?? data.url,
      mimeType: 'text/html',
      fileSize: 0,
      storagePath: `url:${data.url}`,
      storageProvider: 'url',
      status: 'PROCESSING',
      uploadedById: user.id,
      organizationId: user.organizationId,
      topicId: data.topicId,
      metadata: { sourceUrl: data.url },
    },
  })

  // Fetch and process asynchronously
  fetchAndIndex(doc.id, data.url, data.title, user.id, user.organizationId).catch((err) => {
    console.error(`[url-ingest] failed for ${data.url}:`, err)
    db.uploadedDocument
      .update({ where: { id: doc.id }, data: { status: 'FAILED', processingError: String(err) } })
      .catch(console.error)
  })

  return NextResponse.json({
    success: true,
    documentId: doc.id,
    status: 'PROCESSING',
    message: 'URL is being fetched and indexed.',
  })
}

async function fetchAndIndex(
  docId: string,
  url: string,
  title: string | undefined,
  uploadedById: string,
  organizationId: string
) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'LearnIQ/1.0 (content-indexer)' },
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${url}`)

  const html = await response.text()
  const text = htmlToText(html)

  if (text.length < 50) throw new Error('Page content too short to be useful')

  const pageTitle = title ?? extractTitle(html) ?? url

  await db.uploadedDocument.update({
    where: { id: docId },
    data: {
      originalName: pageTitle,
      extractedText: text,
      fileSize: text.length,
      metadata: { sourceUrl: url, fetchedTitle: pageTitle },
    },
  })

  const chunks = chunkText(text)
  const chunkRecords = await Promise.all(
    chunks.map((chunk) =>
      db.documentChunk.create({
        data: {
          documentId: docId,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
          heading: pageTitle,
          tokenCount: chunk.tokenCount,
        },
      })
    )
  )

  const batchSize = 20
  for (let i = 0; i < chunkRecords.length; i += batchSize) {
    const batch = chunkRecords.slice(i, i + batchSize)
    const texts = batch.map((_, idx) => chunks[i + idx]?.content ?? '')
    const embeddings = await embedBatch(texts)
    await Promise.all(batch.map((r, idx) => storeChunkEmbedding(r.id, embeddings[idx])))
  }

  await db.uploadedDocument.update({
    where: { id: docId },
    data: { status: 'READY' },
  })

  console.log(`[url-ingest] indexed ${chunks.length} chunks from ${url}`)
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{3,}/g, '\n\n')
    .trim()
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return match ? match[1].trim() : null
}
