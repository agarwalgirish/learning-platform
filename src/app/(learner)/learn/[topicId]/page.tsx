'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Send, Loader2, BookOpen, Award, ChevronRight, FileText, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { cn, getProficiencyColor } from '@/lib/utils'
import type { TutorMessage, DocumentChunkWithScore } from '@/types'

interface AssessmentState {
  assessmentId: string
  questions: any[]
  answers: Record<string, string>
  submitted: boolean
  result: any
}

export default function LearnPage() {
  const { topicId } = useParams<{ topicId: string }>()
  const router = useRouter()

  const [phase, setPhase] = useState<'assessing' | 'learning' | 'quiz'>('assessing')
  const [proficiencyLevel, setProficiencyLevel] = useState<string>('BEGINNER')
  const [assessment, setAssessment] = useState<AssessmentState | null>(null)
  const [messages, setMessages] = useState<TutorMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sources, setSources] = useState<DocumentChunkWithScore[]>([])
  const [showSources, setShowSources] = useState(false)
  const [topicName, setTopicName] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    startAssessment()
  }, [topicId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function startAssessment() {
    setLoading(true)
    try {
      const res = await fetch('/api/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', topicId }),
      })
      const data = await res.json()

      if (data.topicName) setTopicName(data.topicName)

      if (data.alreadyAssessed) {
        setProficiencyLevel(data.level)
        setPhase('learning')
        await generateIntroduction(data.level, data.topicName ?? '')
      } else {
        setAssessment({
          assessmentId: data.assessmentId,
          questions: data.questions,
          answers: {},
          submitted: false,
          result: null,
        })
        setPhase('assessing')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function generateIntroduction(level: string, name?: string) {
    setLoading(true)
    const topic = name || topicName || 'this topic'
    try {
      const introPrompt =
        `You are teaching me "${topic}". I am a ${level} level learner. ` +
        `Please introduce "${topic}" to me with: ` +
        `(1) what "${topic}" is and why it matters, ` +
        `(2) a numbered list of the key concepts I will learn, ` +
        `(3) a clear explanation of the first and most fundamental concept with a practical example. ` +
        `Base your introduction on the knowledge base documents for this topic.`

      const res = await fetch('/api/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, message: introPrompt, history: [] }),
      })
      const data = await res.json()

      setMessages([
        {
          role: 'assistant',
          content: data.content,
          sources: data.sources,
          timestamp: new Date().toISOString(),
        },
      ])
      if (data.sources?.length) setSources(data.sources)
    } catch {
      setMessages([
        {
          role: 'assistant',
          content: `Welcome! I'm your AI tutor for **${topic}**. You're at the **${level}** level. Ask me anything to get started.`,
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  async function submitAssessment() {
    if (!assessment) return
    setLoading(true)

    const answers = Object.entries(assessment.answers).map(([questionId, answer]) => ({
      questionId,
      answer,
    }))

    const res = await fetch('/api/assess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'submit',
        assessmentId: assessment.assessmentId,
        answers,
      }),
    })

    const result = await res.json()
    setAssessment((prev) => prev ? { ...prev, submitted: true, result } : null)
    setProficiencyLevel(result.level)
    setLoading(false)
  }

  async function startLearning() {
    setPhase('learning')
    const level = assessment?.result?.level ?? proficiencyLevel
    await generateIntroduction(level)
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
    ])
    setLoading(true)

    try {
      const res = await fetch('/api/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId,
          message: userMessage,
          history: messages.slice(-8),
        }),
      })

      const data = await res.json()

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.content,
          sources: data.sources,
          timestamp: new Date().toISOString(),
        },
      ])

      if (data.sources?.length) setSources(data.sources)
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  // ── Diagnostic Assessment Phase ──────────────────────────────────────────
  if (phase === 'assessing' && assessment && !assessment.submitted) {
    const q = assessment.questions
    const answered = Object.keys(assessment.answers).length
    const progress = Math.round((answered / q.length) * 100)

    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Diagnostic Assessment</h1>
          <p className="text-muted-foreground mt-1">
            Answer these questions to personalize your learning path
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground">
              {answered}/{q.length}
            </span>
          </div>
        </div>

        <div className="space-y-6">
          {q.map((question: any, idx: number) => (
            <div key={question.id} className="bg-card border border-border rounded-xl p-6">
              <p className="font-medium mb-4">
                <span className="text-muted-foreground mr-2">{idx + 1}.</span>
                {question.text}
              </p>
              <div className="space-y-2">
                {question.options?.map((opt: any) => (
                  <label
                    key={opt.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      assessment.answers[question.id] === opt.text
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-accent'
                    )}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={opt.text}
                      checked={assessment.answers[question.id] === opt.text}
                      onChange={() =>
                        setAssessment((prev) =>
                          prev
                            ? {
                                ...prev,
                                answers: { ...prev.answers, [question.id]: opt.text },
                              }
                            : null
                        )
                      }
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
          onClick={submitAssessment}
          disabled={answered < q.length || loading}
          className="mt-6 w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Submit Assessment
        </button>
      </div>
    )
  }

  // ── Assessment Result ─────────────────────────────────────────────────────
  if (phase === 'assessing' && assessment?.submitted && assessment.result) {
    const { level, score, strengths, weaknesses } = assessment.result
    return (
      <div className="max-w-lg mx-auto text-center">
        <div className="bg-card border border-border rounded-2xl p-8">
          <Award className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Assessment Complete!</h1>
          <p className="text-muted-foreground mb-6">Your results are ready</p>

          <div className="bg-primary/5 rounded-xl p-4 mb-6">
            <p className="text-sm text-muted-foreground mb-1">Your Level</p>
            <p className={`text-2xl font-bold ${getProficiencyColor(level).split(' ')[0]}`}>
              {level}
            </p>
            <p className="text-4xl font-bold mt-1">{score}%</p>
          </div>

          {strengths.length > 0 && (
            <div className="text-left mb-4">
              <p className="text-sm font-medium text-green-700 mb-2">Strong areas</p>
              <div className="flex flex-wrap gap-2">
                {strengths.map((s: string) => (
                  <span key={s} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {weaknesses.length > 0 && (
            <div className="text-left mb-6">
              <p className="text-sm font-medium text-orange-700 mb-2">Areas to improve</p>
              <div className="flex flex-wrap gap-2">
                {weaknesses.map((w: string) => (
                  <span key={w} className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={startLearning}
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Preparing your lesson…</>
              : <>Start Learning <ChevronRight className="h-4 w-4" /></>
            }
          </button>
        </div>
      </div>
    )
  }

  // ── Tutor Chat Phase ──────────────────────────────────────────────────────
  return (
    <div className="flex gap-6 h-[calc(100vh-4rem)] -mt-8 -mx-8">
      {/* Chat */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-semibold text-sm">AI Tutor</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full ${getProficiencyColor(proficiencyLevel)}`}>
                {proficiencyLevel}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {sources.length > 0 && (
              <button
                onClick={() => setShowSources(!showSources)}
                className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-lg"
              >
                <FileText className="h-3 w-3" />
                {sources.length} sources
              </button>
            )}
            <button
              onClick={() => router.push(`/quiz/${topicId}`)}
              className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg"
            >
              Take quiz
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-3',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-card border border-border rounded-bl-sm'
                )}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose-chat text-sm">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm">{msg.content}</p>
                )}

                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">Sources used:</p>
                    {msg.sources.slice(0, 3).map((s, si) => (
                      <div key={si} className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileText className="h-3 w-3 flex-shrink-0" />
                        {s.documentName}
                        {s.pageNumber && ` • p.${s.pageNumber}`}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">
                    {messages.length === 0 ? 'Preparing your lesson…' : 'Thinking…'}
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={sendMessage}
          className="border-t border-border p-4 flex gap-3 bg-card"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question or request an explanation..."
            className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* Sources panel */}
      {showSources && (
        <div className="w-72 border-l border-border bg-card flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-medium text-sm">Knowledge Sources</h3>
            <button onClick={() => setShowSources(false)}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {sources.map((s, i) => (
              <div key={i} className="border border-border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <p className="text-xs font-medium truncate">{s.documentName}</p>
                </div>
                {s.pageNumber && (
                  <p className="text-xs text-muted-foreground mb-1">Page {s.pageNumber}</p>
                )}
                <p className="text-xs text-muted-foreground line-clamp-4">{s.content}</p>
                <div className="mt-2 text-xs text-muted-foreground">
                  Relevance: {Math.round(s.score * 100)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
