import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createDiagnosticAssessment, scoreAssessment } from '@/lib/learning/assessment'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const body = await request.json()
  const { action, topicId, assessmentId, answers } = body

  if (action === 'start') {
    if (!topicId) return NextResponse.json({ error: 'topicId required' }, { status: 400 })

    try {
      // Always fetch topic name so the client and AI know what they're teaching
      const topic = await db.topic.findUnique({
        where: { id: topicId },
        select: { name: true },
      })
      const topicName = topic?.name ?? 'this topic'

      const recent = await db.assessment.findFirst({
        where: { userId: user.id, topicId, type: 'DIAGNOSTIC', status: 'completed' },
        orderBy: { completedAt: 'desc' },
      })

      if (recent) {
        return NextResponse.json({
          alreadyAssessed: true,
          level: recent.level,
          score: recent.score,
          assessmentId: recent.id,
          topicName,
        })
      }

      console.log(`[assess] start — user=${user.id} topic="${topicName}"`)
      const { assessmentId: newId, questions } = await createDiagnosticAssessment(
        user.id, topicId, user.organizationId
      )
      return NextResponse.json({ assessmentId: newId, questions, topicName })
    } catch (err) {
      console.error('[assess] start failed:', err)
      return NextResponse.json(
        { error: 'Failed to create assessment', detail: String(err) },
        { status: 500 }
      )
    }
  }

  if (action === 'submit') {
    if (!assessmentId || !answers) {
      return NextResponse.json({ error: 'assessmentId and answers required' }, { status: 400 })
    }
    try {
      console.log(`[assess] submit — assessmentId=${assessmentId}`)
      const result = await scoreAssessment(assessmentId, answers)
      return NextResponse.json(result)
    } catch (err) {
      console.error('[assess] submit failed:', err)
      return NextResponse.json(
        { error: 'Failed to score assessment', detail: String(err) },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
