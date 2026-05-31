import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { generateTutorResponse } from '@/lib/rag'
import { db } from '@/lib/db'
import type { TutorMessage } from '@/types'

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

  // Fetch topic name and learner progress in parallel
  const [topic, progress] = await Promise.all([
    db.topic.findUnique({ where: { id: topicId }, select: { name: true } }),
    db.learnerProgress.findUnique({
      where: { userId_topicId: { userId: user.id, topicId } },
    }),
  ])

  const topicName = topic?.name ?? 'the topic'
  const proficiencyLevel = progress?.proficiencyLevel ?? 'BEGINNER'

  // Ensure enrollment exists
  await db.enrollment.upsert({
    where: { userId_topicId: { userId: user.id, topicId } },
    create: { userId: user.id, topicId },
    update: {},
  })

  const messages: TutorMessage[] = [
    ...history.slice(-8),
    { role: 'user', content: message },
  ]

  try {
    const response = await generateTutorResponse(messages, {
      topicId,
      topicName,
      organizationId: user.organizationId,
      userId: user.id,
      proficiencyLevel,
      query: message,
    })

    // Update time spent
    await db.learnerProgress.upsert({
      where: { userId_topicId: { userId: user.id, topicId } },
      create: { userId: user.id, topicId, proficiencyLevel, timeSpentMinutes: 2, lastActivityAt: new Date() },
      update: { timeSpentMinutes: { increment: 2 }, lastActivityAt: new Date() },
    })

    return NextResponse.json({
      content: response.content,
      sources: response.sources,
      proficiencyLevel,
    })
  } catch (err) {
    console.error('[learn] generateTutorResponse failed:', err)
    return NextResponse.json({ error: 'AI response failed', detail: String(err) }, { status: 500 })
  }
}
