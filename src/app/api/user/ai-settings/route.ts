/**
 * User-level AI provider preference.
 * Authenticated users can set their own override; admins can set it for any user.
 *
 * GET  /api/user/ai-settings            — get own preference
 * POST /api/user/ai-settings            — set/clear own preference
 * POST /api/user/ai-settings?userId=X   — admin: set/clear for another user
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { isInstructorOrAdmin } from '@/lib/permissions'
import type { UserRole } from '@/types'
import { z } from 'zod'

const schema = z.object({
  // null = clear the override and fall back to org default
  provider: z.enum(['openai', 'anthropic', 'ollama', 'azure']).nullable(),
  model: z.string().min(1).nullable().optional(),
  temperature: z.number().min(0).max(2).nullable().optional(),
  maxTokens: z.number().min(100).max(32000).nullable().optional(),
})

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const currentUser = session.user as any
  const { searchParams } = new URL(request.url)
  const targetId = searchParams.get('userId') ?? currentUser.id

  // Only admins can read another user's settings
  if (targetId !== currentUser.id && !isInstructorOrAdmin(currentUser.role as UserRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const user = await db.user.findUnique({
    where: { id: targetId, organizationId: currentUser.organizationId },
    select: { id: true, name: true, email: true, aiOverride: true },
  })

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ aiOverride: user.aiOverride })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const currentUser = session.user as any
  const { searchParams } = new URL(request.url)
  const targetId = searchParams.get('userId') ?? currentUser.id

  // Only admins can change another user's settings
  if (targetId !== currentUser.id && !isInstructorOrAdmin(currentUser.role as UserRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const data = schema.parse(body)

  // provider: null → clear the override entirely
  const aiOverride = data.provider === null ? null : {
    provider: data.provider,
    ...(data.model      ? { model: data.model }           : {}),
    ...(data.temperature != null ? { temperature: data.temperature } : {}),
    ...(data.maxTokens  != null  ? { maxTokens: data.maxTokens }  : {}),
  }

  await db.user.update({
    where: { id: targetId, organizationId: currentUser.organizationId },
    // Prisma nullable JSON: null clears the column; object sets it
    data: { aiOverride: aiOverride === null ? { set: null as any } : (aiOverride as any) },
  })

  await db.auditLog.create({
    data: {
      organizationId: currentUser.organizationId,
      userId: currentUser.id,
      action: 'settings.user_ai_override_changed',
      resource: 'User',
      resourceId: targetId,
      details: { setBy: currentUser.id, aiOverride },
    },
  })

  return NextResponse.json({ success: true, aiOverride })
}
