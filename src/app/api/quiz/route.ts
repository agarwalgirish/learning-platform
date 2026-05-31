import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createQuiz, scoreQuiz } from '@/lib/learning/quiz'
import { db } from '@/lib/db'
import type { ProficiencyLevel } from '@/types'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const body = await request.json()
  const { action, topicId, assessmentId, answers } = body

  if (action === 'start') {
    if (!topicId) return NextResponse.json({ error: 'topicId required' }, { status: 400 })

    const progress = await db.learnerProgress.findUnique({
      where: { userId_topicId: { userId: user.id, topicId } },
    })

    const currentLevel = (progress?.proficiencyLevel ?? 'BEGINNER') as ProficiencyLevel

    // Find weak concepts from recent quiz responses
    const weakConcepts = await getWeakConcepts(user.id, topicId)

    const quiz = await createQuiz(
      user.id,
      topicId,
      user.organizationId,
      currentLevel,
      weakConcepts
    )

    return NextResponse.json(quiz)
  }

  if (action === 'submit') {
    if (!assessmentId || !answers) {
      return NextResponse.json({ error: 'assessmentId and answers required' }, { status: 400 })
    }

    const result = await scoreQuiz(assessmentId, user.id, answers)
    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

async function getWeakConcepts(userId: string, topicId: string): Promise<string[]> {
  const mastery = await db.conceptMastery.findMany({
    where: { userId, topicId, score: { lt: 60 } },
    orderBy: { score: 'asc' },
    take: 3,
    select: { concept: true },
  })
  return mastery.map((m) => m.concept)
}
