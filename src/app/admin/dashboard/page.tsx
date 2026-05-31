import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Users, BookOpen, FileText, Award, TrendingUp, Activity } from 'lucide-react'
import { ActivityFeed } from '@/components/admin/activity-feed'

export const metadata = { title: 'Admin Dashboard' }

export default async function AdminDashboardPage() {
  const session = await auth()
  const user = session!.user as any
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
    db.learnerProgress.count({ where: { isProficient: true, user: { organizationId: orgId } } }),
    db.quizAttempt.aggregate({
      where: { user: { organizationId: orgId }, completedAt: { not: null } },
      _avg: { score: true },
      _count: { id: true },
    }),
    db.auditLog.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { user: { select: { name: true, email: true } } },
    }),
    db.topic.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { enrollments: true } } },
      orderBy: { enrollments: { _count: 'desc' } },
      take: 5,
    }),
  ])

  const completionRate = totalEnrollments > 0
    ? Math.round((proficientCount / totalEnrollments) * 100)
    : 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Organization-wide learning overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Users className="h-5 w-5 text-blue-600" />} label="Total Users" value={String(totalUsers)} sub={`${activeUsers} active`} bg="bg-blue-50" />
        <StatCard icon={<BookOpen className="h-5 w-5 text-purple-600" />} label="Topics" value={String(totalTopics)} sub={`${totalEnrollments} enrollments`} bg="bg-purple-50" />
        <StatCard icon={<FileText className="h-5 w-5 text-orange-600" />} label="Documents" value={String(totalDocuments)} sub="in knowledge base" bg="bg-orange-50" />
        <StatCard icon={<Award className="h-5 w-5 text-green-600" />} label="Proficiency Rate" value={`${completionRate}%`} sub={`${proficientCount} proficient`} bg="bg-green-50" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top topics */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Top Topics by Enrollment</h2>
          </div>
          <div className="space-y-3">
            {topTopics.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">No topics yet</p>
            ) : topTopics.map((topic, i) => (
              <div key={topic.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-muted-foreground w-4">{i + 1}</span>
                  <p className="text-sm font-medium">{topic.name}</p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {topic._count.enrollments} enrolled
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent audit log — grouped by day, scrollable, collapsible */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Recent Activity</h2>
          </div>
          <ActivityFeed
            entries={recentActivity.map((log) => ({
              id: log.id,
              action: log.action,
              userName: log.user?.name ?? null,
              userEmail: log.user?.email ?? null,
              createdAt: log.createdAt.toISOString(),
            }))}
          />
        </div>
      </div>

      {/* Quiz stats */}
      <div className="mt-6 bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold mb-4">Quiz Performance</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-3xl font-bold">{Math.round(quizStats._avg.score ?? 0)}%</p>
            <p className="text-sm text-muted-foreground">Avg quiz score</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{quizStats._count.id}</p>
            <p className="text-sm text-muted-foreground">Total attempts</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{proficientCount}</p>
            <p className="text-sm text-muted-foreground">Learners proficient</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{completionRate}%</p>
            <p className="text-sm text-muted-foreground">Completion rate</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, bg }: {
  icon: React.ReactNode; label: string; value: string; sub: string; bg: string
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center mb-3`}>{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  )
}

