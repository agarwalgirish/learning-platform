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
  const { topicId, message, history = [], searchHint } = body as {
    topicId: string
    message: string
    history: TutorMessage[]
    // Optional: when teaching a specific document section, pass its title so
    // the vector search targets that document's chunks rather than generic topic
    searchHint?: string
  }

  if (!topicId || !message) {
    return NextResponse.json({ error: 'topicId and message required' }, { status: 400 })
  }

  const [topic, progress] = await Promise.all([
    db.topic.findUnique({ where: { id: topicId }, select: { name: true } }),
    db.learnerProgress.findUnique({
      where: { userId_topicId: { userId: user.id, topicId } },
    }),
  ])

  const topicName = topic?.name ?? 'the topic'
  const proficiencyLevel = progress?.proficiencyLevel ?? 'BEGINNER'

  await db.enrollment.upsert({
    where: { userId_topicId: { userId: user.id, topicId } },
    create: { userId: user.id, topicId },
    update: {},
  })

  const messages: TutorMessage[] = [
    ...history.slice(-8),
    { role: 'user', content: message },
  ]

  // Use searchHint for RAG retrieval when available — this ensures we pull chunks
  // from the specific document being taught, not a generic topic-level query
  const ragQuery = searchHint ?? message

  try {
    const response = await generateTutorResponse(messages, {
      topicId,
      topicName,
      organizationId: user.organizationId,
      userId: user.id,
      proficiencyLevel,
      query: ragQuery,
    })

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
