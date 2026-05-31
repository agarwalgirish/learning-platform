import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { isInstructorOrAdmin } from '@/lib/permissions'
import type { UserRole } from '@/types'
import { z } from 'zod'
import { chunkText } from '@/lib/processor'
import { embedBatch, storeChunkEmbedding } from '@/lib/vector'
import { v4 as uuidv4 } from 'uuid'

const moduleSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  content: z.string().optional(),   // plain text / markdown
  order: z.number().int().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const modules = await db.courseModule.findMany({
    where: { courseId: params.id },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json({ modules })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any
  if (!isInstructorOrAdmin(user.role as UserRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = moduleSchema.parse(body)

    // Find current max order
    const last = await db.courseModule.findFirst({
      where: { courseId: params.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    })
    const order = data.order ?? (last?.order ?? -1) + 1

    const mod = await db.courseModule.create({
      data: { ...data, courseId: params.id, order },
    })

    // If the module has text content, index it for RAG
    if (data.content?.trim()) {
      const course = await db.course.findUnique({
        where: { id: params.id },
        select: { topicId: true, organizationId: true, name: true },
      })
      if (course) {
        await indexModuleContent(mod.id, data.title, data.content, course)
      }
    }

    return NextResponse.json({ module: mod }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 })
    console.error('[modules] POST failed:', err)
    return NextResponse.json({ error: 'Failed to create module' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any
  if (!isInstructorOrAdmin(user.role as UserRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const moduleId = searchParams.get('moduleId')
  if (!moduleId) return NextResponse.json({ error: 'moduleId required' }, { status: 400 })

  await db.courseModule.delete({ where: { id: moduleId } })
  return NextResponse.json({ success: true })
}

async function indexModuleContent(
  moduleId: string,
  title: string,
  content: string,
  course: { topicId: string; organizationId: string; name: string }
) {
  try {
    const docId = uuidv4()
    // Create a virtual UploadedDocument for this module's text content
    const doc = await db.uploadedDocument.create({
      data: {
        id: docId,
        fileName: `module-${moduleId}.txt`,
        originalName: `${course.name} — ${title}`,
        mimeType: 'text/plain',
        fileSize: content.length,
        storagePath: `virtual:module:${moduleId}`,
        storageProvider: 'inline',
        status: 'PROCESSING',
        extractedText: content,
        uploadedById: '00000000-0000-0000-0000-000000000000', // system
        organizationId: course.organizationId,
        topicId: course.topicId,
        metadata: { source: 'course_module', moduleId, courseId: '' },
      },
    })

    const chunks = chunkText(content)
    const chunkRecords = await Promise.all(
      chunks.map((chunk) =>
        db.documentChunk.create({
          data: {
            documentId: doc.id,
            content: chunk.content,
            chunkIndex: chunk.chunkIndex,
            heading: title,
            tokenCount: chunk.tokenCount,
          },
        })
      )
    )

    if (chunkRecords.length > 0) {
      const embeddings = await embedBatch(chunks.map((c) => c.content))
      await Promise.all(chunkRecords.map((r, i) => storeChunkEmbedding(r.id, embeddings[i])))
    }

    await db.uploadedDocument.update({
      where: { id: doc.id },
      data: { status: 'READY' },
    })
  } catch (err) {
    console.error('[modules] indexModuleContent failed:', err)
  }
}
