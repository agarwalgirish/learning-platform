import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { isAdmin } from '@/lib/permissions'
import { resetProviders } from '@/lib/ai'
import type { UserRole } from '@/types'
import { z } from 'zod'

const schema = z.object({
  provider: z.enum(['openai', 'anthropic', 'ollama', 'azure']),
  model: z.string().min(1),
  embeddingModel: z.string().min(1),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().min(100).max(32000),
  useOnlyKB: z.boolean(),
  systemPrompt: z.string().optional(),
})

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const config = await db.aIConfig.findUnique({
    where: { organizationId: user.organizationId },
  })

  return NextResponse.json({ config })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  if (!isAdmin(user.role as UserRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const data = schema.parse(body)

  const config = await db.aIConfig.upsert({
    where: { organizationId: user.organizationId },
    create: { organizationId: user.organizationId, ...data },
    update: data,
  })

  // Reset the cached provider singletons so the next request picks up the new config
  resetProviders()

  await db.auditLog.create({
    data: {
      organizationId: user.organizationId,
      userId: user.id,
      action: 'settings.ai_provider_changed',
      resource: 'AIConfig',
      resourceId: config.id,
      details: { provider: data.provider, model: data.model },
    },
  })

  return NextResponse.json({ config })
}
