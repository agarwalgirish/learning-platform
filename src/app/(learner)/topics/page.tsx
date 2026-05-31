import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'
import { BookOpen, Clock, ChevronRight, Play } from 'lucide-react'
import { getDifficultyColor, formatDuration } from '@/lib/utils'

export const metadata = { title: 'Topics' }

export default async function TopicsPage() {
  const session = await auth()
  const user = session!.user as any

  const [topics, enrollments] = await Promise.all([
    db.topic.findMany({
      where: { organizationId: user.organizationId, isPublished: true },
      include: {
        _count: { select: { documents: true, enrollments: true } },
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    }),
    db.enrollment.findMany({
      where: { userId: user.id },
      select: { topicId: true, status: true },
    }),
  ])

  const enrolledSet = new Set(enrollments.map((e) => e.topicId))

  const categories = [...new Set(topics.map((t) => t.category).filter(Boolean))]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Learning Topics</h1>
        <p className="text-muted-foreground mt-1">
          {topics.length} topic{topics.length !== 1 ? 's' : ''} available
        </p>
      </div>

      {topics.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No topics published yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Ask your admin to upload learning content.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {topics.map((topic) => {
            const isEnrolled = enrolledSet.has(topic.id)
            return (
              <div
                key={topic.id}
                className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow"
              >
                {topic.category && (
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    {topic.category}
                  </span>
                )}
                <h3 className="font-semibold text-lg mt-1 mb-2">{topic.name}</h3>
                {topic.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {topic.description}
                  </p>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${getDifficultyColor(topic.difficulty)}`}
                  >
                    {topic.difficulty}
                  </span>
                  {topic.estimatedHours && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {topic.estimatedHours}h
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {topic._count.documents} doc{topic._count.documents !== 1 ? 's' : ''}
                  </span>
                </div>

                <Link
                  href={`/learn/${topic.id}`}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Play className="h-4 w-4" />
                  {isEnrolled ? 'Continue' : 'Start learning'}
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
