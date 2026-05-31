import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'
import { TrendingUp, Award, Clock, BookOpen, ChevronRight } from 'lucide-react'
import { formatDate, formatDuration, getProficiencyColor } from '@/lib/utils'

export const metadata = { title: 'My Progress' }

export default async function ProgressPage() {
  const session = await auth()
  const user = session!.user as any

  const progress = await db.learnerProgress.findMany({
    where: { userId: user.id },
    include: {
      topic: { select: { id: true, name: true, category: true } },
    },
    orderBy: { lastActivityAt: 'desc' },
  })

  const totalTime = progress.reduce((s, p) => s + p.timeSpentMinutes, 0)
  const proficientCount = progress.filter((p) => p.isProficient).length
  const avgScore =
    progress.filter((p) => p.avgQuizScore).reduce((s, p) => s + (p.avgQuizScore ?? 0), 0) /
    Math.max(progress.filter((p) => p.avgQuizScore).length, 1)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">My Progress</h1>
        <p className="text-muted-foreground mt-1">Track your learning journey</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<BookOpen className="h-5 w-5 text-blue-600" />} label="Topics" value={String(progress.length)} bg="bg-blue-50" />
        <StatCard icon={<Award className="h-5 w-5 text-green-600" />} label="Proficient" value={String(proficientCount)} bg="bg-green-50" />
        <StatCard icon={<TrendingUp className="h-5 w-5 text-purple-600" />} label="Avg Score" value={`${Math.round(avgScore || 0)}%`} bg="bg-purple-50" />
        <StatCard icon={<Clock className="h-5 w-5 text-orange-600" />} label="Time Spent" value={formatDuration(totalTime)} bg="bg-orange-50" />
      </div>

      {/* Progress table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold">Topic Progress</h2>
        </div>
        {progress.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">No learning started yet.</p>
            <Link href="/topics" className="mt-2 text-sm text-primary hover:underline inline-block">
              Browse topics →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {progress.map((p) => (
              <Link
                key={p.id}
                href={`/learn/${p.topic.id}`}
                className="flex items-center px-6 py-4 hover:bg-accent transition-colors group"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{p.topic.name}</p>
                  {p.topic.category && (
                    <p className="text-xs text-muted-foreground mt-0.5">{p.topic.category}</p>
                  )}
                </div>
                <div className="flex items-center gap-6 mr-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Level</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getProficiencyColor(p.proficiencyLevel)}`}>
                      {p.proficiencyLevel}
                    </span>
                  </div>
                  <div className="text-center hidden sm:block">
                    <p className="text-xs text-muted-foreground">Score</p>
                    <p className="text-sm font-semibold">{p.proficiencyScore}%</p>
                  </div>
                  <div className="text-center hidden md:block">
                    <p className="text-xs text-muted-foreground">Quizzes</p>
                    <p className="text-sm font-semibold">{p.quizzesTaken}</p>
                  </div>
                  <div className="text-center hidden lg:block">
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="text-sm font-semibold">{formatDuration(p.timeSpentMinutes)}</p>
                  </div>
                  <div className="text-center hidden xl:block">
                    <p className="text-xs text-muted-foreground">Last active</p>
                    <p className="text-sm">{formatDate(p.lastActivityAt)}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: string; bg: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center mb-3`}>{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}
