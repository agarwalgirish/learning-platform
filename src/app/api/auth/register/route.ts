import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { z } from 'zod'
import { slugify } from '@/lib/utils'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  organizationName: z.string().min(2).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = schema.parse(body)

    const existing = await db.user.findUnique({ where: { email: data.email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(data.password, 12)

    // Use existing org or create a new one for this registration
    let org = await db.organization.findFirst({ orderBy: { createdAt: 'asc' } })
    if (!org) {
      const orgName = data.organizationName ?? 'My Organization'
      org = await db.organization.create({
        data: {
          name: orgName,
          slug: slugify(orgName),
        },
      })
    }

    const userCount = await db.user.count({ where: { organizationId: org.id } })

    const user = await db.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        // First user in an org is always ADMIN
        role: userCount === 0 ? 'ADMIN' : 'LEARNER',
        organizationId: org.id,
      },
    })

    return NextResponse.json({ success: true, userId: user.id, role: user.role })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 })
    }
    console.error('Register error:', err)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
