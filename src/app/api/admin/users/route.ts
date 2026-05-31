import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { isInstructorOrAdmin } from '@/lib/permissions'
import type { UserRole } from '@/types'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  if (!isInstructorOrAdmin(user.role as UserRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const search = searchParams.get('search') ?? ''
  const role = searchParams.get('role')

  const where = {
    organizationId: user.organizationId,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(role ? { role: role as any } : {}),
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        aiOverride: true,
        _count: {
          select: { enrollments: true },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    db.user.count({ where }),
  ])

  return NextResponse.json({ users, total, page, limit })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const currentUser = session.user as any
  if (currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const schema = z.object({
    userId: z.string(),
    role: z.enum(['ADMIN', 'INSTRUCTOR', 'LEARNER']).optional(),
    isActive: z.boolean().optional(),
  })

  const data = schema.parse(body)

  const updated = await db.user.update({
    where: { id: data.userId, organizationId: currentUser.organizationId },
    data: {
      ...(data.role ? { role: data.role } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  })

  return NextResponse.json({ user: updated })
}
