import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createDiagnosticAssessment, scoreAssessment } from '@/lib/learning/assessment'
import { db } from '@/lib/db'

// POST /api/assess — start or submit a diagnostic assessment
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const body = await request.json()
  const { action, topicId, assessmentId, answers } = body

  if (action === 'start') {
    if (!topicId) return NextResponse.json({ error: 'topicId required' }, { status: 400 })

    // Check if already has an active or recent completed assessment
    const recent = await db.assessment.findFirst({
      where: {
        userId: user.id,
        topicId,
        type: 'DIAGNOSTIC',
        status: 'completed',
      },
      orderBy: { completedAt: 'desc' },
    })

    if (recent) {
      return NextResponse.json({
        alreadyAssessed: true,
        level: recent.level,
        score: recent.score,
        assessmentId: recent.id,
      })
    }

    const { assessmentId: newId, questions } = await createDiagnosticAssessment(
      user.id,
      topicId,
      user.organizationId
    )

    return NextResponse.json({ assessmentId: newId, questions })
  }

  if (action === 'submit') {
    if (!assessmentId || !answers) {
      return NextResponse.json({ error: 'assessmentId and answers required' }, { status: 400 })
    }

    const result = await scoreAssessment(assessmentId, answers)
    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
