import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { isInstructorOrAdmin } from '@/lib/permissions'
import type { UserRole } from '@/types'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  topicId: z.string().uuid(),
  isPublished: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any
  if (!isInstructorOrAdmin(user.role as UserRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const topicId = searchParams.get('topicId')

  const courses = await db.course.findMany({
    where: {
      organizationId: user.organizationId,
      ...(topicId ? { topicId } : {}),
    },
    include: {
      topic: { select: { id: true, name: true } },
      modules: { orderBy: { order: 'asc' }, select: { id: true, title: true, order: true } },
      _count: { select: { modules: true } },
    },
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json({ courses })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any
  if (!isInstructorOrAdmin(user.role as UserRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = createSchema.parse(body)
    const course = await db.course.create({
      data: { ...data, organizationId: user.organizationId },
      include: { topic: { select: { id: true, name: true } } },
    })
    return NextResponse.json({ course }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 })
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 })
  }
}
