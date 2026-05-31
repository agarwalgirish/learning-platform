import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'
import { BookOpen, TrendingUp, Clock, Award, ChevronRight } from 'lucide-react'
import { formatDate, formatDuration, getProficiencyColor } from '@/lib/utils'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const session = await auth()
  const user = session!.user as any

  const [progressItems, recentActivity] = await Promise.all([
    db.learnerProgress.findMany({
      where: { userId: user.id },
      include: { topic: { select: { id: true, name: true, slug: true } } },
      orderBy: { lastActivityAt: 'desc' },
      take: 6,
    }),
    db.quizAttempt.findMany({
      where: { userId: user.id, completedAt: { not: null } },
      include: { assessment: { include: { topic: { select: { name: true } } } } },
      orderBy: { completedAt: 'desc' },
      take: 5,
    }),
  ])

  const proficientCount = progressItems.filter((p) => p.isProficient).length
  const totalTimeMinutes = progressItems.reduce((sum, p) => sum + p.timeSpentMinutes, 0)
  const avgScore =
    progressItems.filter((p) => p.avgQuizScore).reduce((s, p) => s + (p.avgQuizScore ?? 0), 0) /
    Math.max(progressItems.filter((p) => p.avgQuizScore).length, 1)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          Welcome back, {user.name?.split(' ')[0] ?? 'Learner'}
        </h1>
        <p className="text-muted-foreground mt-1">Here&apos;s your learning overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<BookOpen className="h-5 w-5 text-blue-600" />}
          label="Enrolled Topics"
          value={String(progressItems.length)}
          bg="bg-blue-50"
        />
        <StatCard
          icon={<Award className="h-5 w-5 text-green-600" />}
          label="Proficient"
          value={String(proficientCount)}
          bg="bg-green-50"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
          label="Avg Quiz Score"
          value={`${Math.round(avgScore)}%`}
          bg="bg-purple-50"
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-orange-600" />}
          label="Time Spent"
          value={formatDuration(totalTimeMinutes)}
          bg="bg-orange-50"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* In-progress topics */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">My Topics</h2>
            <Link href="/topics" className="text-sm text-primary hover:underline">
              Browse all
            </Link>
          </div>

          {progressItems.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No topics started yet</p>
              <Link
                href="/topics"
                className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Start learning <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {progressItems.map((p) => (
                <Link
                  key={p.id}
                  href={`/learn/${p.topic.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors group"
                >
                  <div>
                    <p className="font-medium text-sm">{p.topic.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${getProficiencyColor(p.proficiencyLevel)}`}
                      >
                        {p.proficiencyLevel}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Score: {p.proficiencyScore}%
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent quiz activity */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold mb-4">Recent Quizzes</h2>
          {recentActivity.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              No quizzes taken yet
            </p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-accent/50"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {attempt.assessment.topic.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(attempt.completedAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-bold text-sm ${
                        (attempt.score ?? 0) >= 70 ? 'text-green-600' : 'text-red-500'
                      }`}
                    >
                      {attempt.score ?? 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {attempt.passed ? 'Passed' : 'Failed'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode
  label: string
  value: string
  bg: string
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}
