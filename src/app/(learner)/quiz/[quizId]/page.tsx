'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, XCircle, ChevronRight, Award } from 'lucide-react'
import { cn, getProficiencyColor } from '@/lib/utils'

export default function QuizPage() {
  const { quizId: topicId } = useParams<{ quizId: string }>()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [quiz, setQuiz] = useState<{ assessmentId: string; questions: any[] } | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    fetch('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', topicId }),
    })
      .then((r) => r.json())
      .then((data) => {
        setQuiz(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [topicId])

  async function submitQuiz() {
    if (!quiz) return
    setSubmitting(true)

    const res = await fetch('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'submit',
        assessmentId: quiz.assessmentId,
        answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })),
      }),
    })

    const data = await res.json()
    setResult(data)
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (result) {
    const { score, passed, newLevel, feedback } = result
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <Award className={`h-12 w-12 mx-auto mb-4 ${passed ? 'text-green-500' : 'text-orange-500'}`} />
          <h1 className="text-2xl font-bold mb-1">{passed ? 'Great work!' : 'Keep practicing'}</h1>
          <p className="text-4xl font-bold mt-3 mb-1">{score}%</p>
          <p className="text-muted-foreground text-sm mb-6">
            {passed ? 'You passed this quiz' : 'You need 70% to pass'}
          </p>

          <div className="bg-accent rounded-xl p-4 mb-6 text-left">
            <p className="text-sm font-medium mb-2">Updated Level</p>
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${getProficiencyColor(newLevel)}`}>
              {newLevel}
            </span>
          </div>

          <div className="space-y-3 text-left mb-6">
            {quiz?.questions.map((q: any) => {
              const fb = feedback?.find((f: any) => f.questionId === q.id)
              return (
                <div key={q.id} className="flex items-start gap-3">
                  {fb?.correct ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm">{q.text}</p>
                    {!fb?.correct && fb?.explanation && (
                      <p className="text-xs text-muted-foreground mt-1">{fb.explanation}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/learn/${topicId}`)}
              className="flex-1 border border-border py-2.5 rounded-xl text-sm font-medium hover:bg-accent transition-colors"
            >
              Continue Learning
            </button>
            <button
              onClick={() => { setResult(null); setAnswers({}); setLoading(true); }}
              className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
            >
              Retake Quiz <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!quiz) return <p className="text-center text-muted-foreground py-12">Failed to load quiz.</p>

  const answered = Object.keys(answers).length
  const progress = Math.round((answered / quiz.questions.length) * 100)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Practice Quiz</h1>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-2 bg-muted rounded-full">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-sm text-muted-foreground">{answered}/{quiz.questions.length}</span>
        </div>
      </div>

      <div className="space-y-6">
        {quiz.questions.map((q: any, idx: number) => (
          <div key={q.id} className="bg-card border border-border rounded-xl p-6">
            <p className="font-medium mb-4">
              <span className="text-muted-foreground mr-2">{idx + 1}.</span>
              {q.text}
            </p>
            <div className="space-y-2">
              {q.options?.map((opt: any) => (
                <label
                  key={opt.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    answers[q.id] === opt.text
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-accent'
                  )}
                >
                  <input
                    type="radio"
                    name={q.id}
                    value={opt.text}
                    checked={answers[q.id] === opt.text}
                    onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.text }))}
                    className="text-primary"
                  />
                  <span className="text-sm">{opt.text}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={submitQuiz}
        disabled={answered < quiz.questions.length || submitting}
        className="mt-6 w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Submit Quiz
      </button>
    </div>
  )
}
