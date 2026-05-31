import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { isInstructorOrAdmin } from '@/lib/permissions'
import type { UserRole } from '@/types'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  if (!isInstructorOrAdmin(user.role as UserRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const doc = await db.uploadedDocument.findFirst({
    where: { id: params.id, organizationId: user.organizationId },
    include: {
      topic: { select: { id: true, name: true } },
      chunks: {
        orderBy: { chunkIndex: 'asc' },
        select: {
          id: true,
          chunkIndex: true,
          pageNumber: true,
          heading: true,
          content: true,
          tokenCount: true,
        },
      },
    },
  })

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ document: doc })
}
