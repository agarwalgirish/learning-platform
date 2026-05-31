import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { isInstructorOrAdmin } from '@/lib/permissions'
import type { UserRole } from '@/types'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  if (!isInstructorOrAdmin(user.role as UserRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = user.organizationId

  const [
    totalUsers,
    activeUsers,
    totalTopics,
    totalDocuments,
    totalEnrollments,
    proficientCount,
    quizStats,
    recentActivity,
    topTopics,
  ] = await Promise.all([
    db.user.count({ where: { organizationId: orgId } }),
    db.user.count({ where: { organizationId: orgId, isActive: true } }),
    db.topic.count({ where: { organizationId: orgId } }),
    db.uploadedDocument.count({ where: { organizationId: orgId } }),
    db.enrollment.count({ where: { user: { organizationId: orgId } } }),
    db.learnerProgress.count({
      where: { isProficient: true, user: { organizationId: orgId } },
    }),
    db.quizAttempt.aggregate({
      where: {
        user: { organizationId: orgId },
        completedAt: { not: null },
      },
      _avg: { score: true },
      _count: { id: true },
    }),
    db.auditLog.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { name: true, email: true } } },
    }),
    db.topic.findMany({
      where: { organizationId: orgId },
      include: {
        _count: { select: { enrollments: true } },
      },
      orderBy: { enrollments: { _count: 'desc' } },
      take: 5,
    }),
  ])

  const completionRate =
    totalEnrollments > 0
      ? Math.round((proficientCount / totalEnrollments) * 100)
      : 0

  return NextResponse.json({
    stats: {
      totalUsers,
      activeUsers,
      totalTopics,
      totalDocuments,
      totalEnrollments,
      proficiencyRate: completionRate,
      avgQuizScore: Math.round(quizStats._avg.score ?? 0),
      totalQuizAttempts: quizStats._count.id,
      completionRate,
    },
    recentActivity,
    topTopics,
  })
}
