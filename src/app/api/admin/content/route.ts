import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { isInstructorOrAdmin } from '@/lib/permissions'
import type { UserRole } from '@/types'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  if (!isInstructorOrAdmin(user.role as UserRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const topicId = searchParams.get('topicId')

  const documents = await db.uploadedDocument.findMany({
    where: {
      organizationId: user.organizationId,
      ...(topicId ? { topicId } : {}),
    },
    include: {
      topic: { select: { id: true, name: true } },
      _count: { select: { chunks: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ documents })
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  if (!isInstructorOrAdmin(user.role as UserRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const documentId = searchParams.get('id')
  if (!documentId) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await db.uploadedDocument.delete({
    where: { id: documentId, organizationId: user.organizationId },
  })

  return NextResponse.json({ success: true })
}
