import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { isInstructorOrAdmin } from '@/lib/permissions'
import type { UserRole } from '@/types'
import { z } from 'zod'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any

  const course = await db.course.findFirst({
    where: { id: params.id, organizationId: user.organizationId },
    include: {
      topic: { select: { id: true, name: true } },
      modules: {
        orderBy: { order: 'asc' },
        include: {
          // pull the linked document if any
        },
      },
    },
  })

  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ course })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any
  if (!isInstructorOrAdmin(user.role as UserRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schema = z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    isPublished: z.boolean().optional(),
    topicId: z.string().uuid().optional(),
  })

  const data = schema.parse(await request.json())
  const course = await db.course.update({
    where: { id: params.id, organizationId: user.organizationId },
    data,
  })
  return NextResponse.json({ course })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any
  if (!isInstructorOrAdmin(user.role as UserRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db.course.delete({ where: { id: params.id, organizationId: user.organizationId } })
  return NextResponse.json({ success: true })
}
