import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const { searchParams } = new URL(request.url)
  const topicId = searchParams.get('topicId')

  if (topicId) {
    const progress = await db.learnerProgress.findUnique({
      where: { userId_topicId: { userId: user.id, topicId } },
      include: { topic: { select: { name: true, slug: true } } },
    })

    const recentAttempts = await db.quizAttempt.findMany({
      where: {
        userId: user.id,
        assessment: { topicId },
      },
      orderBy: { startedAt: 'desc' },
      take: 10,
      select: { score: true, passed: true, startedAt: true },
    })

    const conceptMastery = await db.conceptMastery.findMany({
      where: { userId: user.id, topicId },
      orderBy: { score: 'desc' },
    })

    return NextResponse.json({ progress, recentAttempts, conceptMastery })
  }

  // All topics progress
  const allProgress = await db.learnerProgress.findMany({
    where: { userId: user.id },
    include: { topic: { select: { id: true, name: true, slug: true, category: true } } },
    orderBy: { lastActivityAt: 'desc' },
  })

  const enrollments = await db.enrollment.count({
    where: { userId: user.id },
  })

  const proficientCount = allProgress.filter((p) => p.isProficient).length

  return NextResponse.json({
    progress: allProgress,
    stats: {
      enrolled: enrollments,
      proficient: proficientCount,
      inProgress: allProgress.filter((p) => !p.isProficient).length,
    },
  })
}
