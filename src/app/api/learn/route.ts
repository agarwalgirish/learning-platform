import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { generateTutorResponse } from '@/lib/rag'
import { db } from '@/lib/db'
import type { TutorMessage } from '@/types'

// POST /api/learn — send a message to the AI tutor
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any

  const body = await request.json()
  const { topicId, message, history = [] } = body as {
    topicId: string
    message: string
    history: TutorMessage[]
  }

  if (!topicId || !message) {
    return NextResponse.json({ error: 'topicId and message required' }, { status: 400 })
  }

  // Get learner's current proficiency level
  const progress = await db.learnerProgress.findUnique({
    where: { userId_topicId: { userId: user.id, topicId } },
  })

  const proficiencyLevel = progress?.proficiencyLevel ?? 'BEGINNER'

  // Ensure enrollment exists
  await db.enrollment.upsert({
    where: { userId_topicId: { userId: user.id, topicId } },
    create: { userId: user.id, topicId },
    update: {},
  })

  const messages: TutorMessage[] = [
    ...history.slice(-8), // Keep last 8 for context
    { role: 'user', content: message },
  ]

  const response = await generateTutorResponse(messages, {
    topicId,
    organizationId: user.organizationId,
    proficiencyLevel,
    query: message,
  })

  // Update time spent (estimate ~2 min per exchange)
  await db.learnerProgress.upsert({
    where: { userId_topicId: { userId: user.id, topicId } },
    create: {
      userId: user.id,
      topicId,
      proficiencyLevel,
      timeSpentMinutes: 2,
      lastActivityAt: new Date(),
    },
    update: {
      timeSpentMinutes: { increment: 2 },
      lastActivityAt: new Date(),
    },
  })

  return NextResponse.json({
    content: response.content,
    sources: response.sources,
    proficiencyLevel,
  })
}
