import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { slugify } from '@/lib/utils'

const createSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  category: z.string().optional(),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional(),
  estimatedHours: z.number().optional(),
  isPublished: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const { searchParams } = new URL(request.url)
  const published = searchParams.get('published')

  const topics = await db.topic.findMany({
    where: {
      organizationId: user.organizationId,
      ...(published === 'true' ? { isPublished: true } : {}),
    },
    include: {
      _count: {
        select: {
          documents: true,
          enrollments: true,
          courses: true,
        },
      },
    },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
  })

  return NextResponse.json({ topics })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  if (user.role === 'LEARNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()
    const data = createSchema.parse(body)

    const topic = await db.topic.create({
      data: {
        ...data,
        slug: slugify(data.name),
        organizationId: user.organizationId,
      },
    })

    return NextResponse.json({ topic }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create topic' }, { status: 500 })
  }
}
