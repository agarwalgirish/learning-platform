import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getStorage } from '@/lib/storage'
import { extractDocument } from '@/lib/processor'
import { embedBatch } from '@/lib/vector'
import { storeChunkEmbedding } from '@/lib/vector'
import { SUPPORTED_MIME_TYPES, MAX_UPLOAD_SIZE } from '@/lib/constants'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = session.user as any
  if (user.role === 'LEARNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const topicId = formData.get('topicId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: `File too large. Max ${process.env.MAX_UPLOAD_SIZE_MB ?? 50}MB` },
        { status: 400 }
      )
    }

    const mimeType = file.type
    if (!SUPPORTED_MIME_TYPES[mimeType]) {
      return NextResponse.json(
        { error: `Unsupported file type: ${mimeType}` },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = SUPPORTED_MIME_TYPES[mimeType]
    const fileName = `${uuidv4()}.${ext}`

    // Store the file
    const storage = getStorage()
    const storagePath = await storage.upload(fileName, buffer, mimeType)

    // Create DB record in PENDING state
    const doc = await db.uploadedDocument.create({
      data: {
        fileName,
        originalName: file.name,
        mimeType,
        fileSize: file.size,
        storagePath,
        storageProvider: process.env.STORAGE_PROVIDER ?? 'local',
        status: 'PROCESSING',
        uploadedById: user.id,
        organizationId: user.organizationId,
        ...(topicId ? { topicId } : {}),
      },
    })

    // Process document asynchronously (don't await — respond immediately)
    processDocument(doc.id, buffer, mimeType).catch((err) => {
      console.error(`Processing failed for document ${doc.id}:`, err)
      db.uploadedDocument
        .update({
          where: { id: doc.id },
          data: { status: 'FAILED', processingError: String(err) },
        })
        .catch(console.error)
    })

    return NextResponse.json({
      success: true,
      documentId: doc.id,
      status: 'PROCESSING',
      message: 'Upload received. Document is being processed.',
    })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

async function processDocument(
  documentId: string,
  buffer: Buffer,
  mimeType: string
): Promise<void> {
  const { text, pageCount, metadata, chunks } = await extractDocument(buffer, mimeType)

  // Save extracted text and create chunks
  await db.uploadedDocument.update({
    where: { id: documentId },
    data: { extractedText: text, pageCount, metadata: metadata as any },
  })

  // Create chunk records
  const chunkRecords = await Promise.all(
    chunks.map((chunk) =>
      db.documentChunk.create({
        data: {
          documentId,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
          pageNumber: chunk.pageNumber,
          heading: chunk.heading,
          tokenCount: chunk.tokenCount,
        },
      })
    )
  )

  // Generate embeddings in batches of 20
  const batchSize = 20
  for (let i = 0; i < chunkRecords.length; i += batchSize) {
    const batch = chunkRecords.slice(i, i + batchSize)
    const texts = batch.map((c) => chunks[c.chunkIndex]?.content ?? '')
    const embeddings = await embedBatch(texts)

    await Promise.all(
      batch.map((chunk, idx) => storeChunkEmbedding(chunk.id, embeddings[idx]))
    )
  }

  await db.uploadedDocument.update({
    where: { id: documentId },
    data: { status: 'READY' },
  })
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = session.user as any
  const { searchParams } = new URL(request.url)
  const topicId = searchParams.get('topicId')

  const docs = await db.uploadedDocument.findMany({
    where: {
      organizationId: user.organizationId,
      ...(topicId ? { topicId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      fileSize: true,
      status: true,
      topicId: true,
      createdAt: true,
      processingError: true,
    },
  })

  return NextResponse.json({ documents: docs })
}
