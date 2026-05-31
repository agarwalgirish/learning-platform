'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Send, Loader2, BookOpen, Award, ChevronRight, FileText,
  X, CheckCircle2, XCircle, Lock, PlayCircle, Trophy,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { cn, getProficiencyColor } from '@/lib/utils'
import type { TutorMessage, DocumentChunkWithScore } from '@/types'

type Phase =
  | 'loading'
  | 'assessing'
  | 'assessment-result'
  | 'overview'
  | 'module-learning'
  | 'module-check'
  | 'final-assessment'
  | 'complete'

interface Section {
  id: string
  title: string
  type: 'written' | 'document'
  content?: string       // for written modules
  documentId?: string    // for document-based sections
}

interface CheckQuestion { text: string; options: string[]; id: string }

export default function LearnPage() {
  const { topicId } = useParams<{ topicId: string }>()
  const router = useRouter()

  const [phase, setPhase] = useState<Phase>('loading')
  const [topicName, setTopicName] = useState('')
  const [proficiencyLevel, setProficiencyLevel] = useState('BEGINNER')
  const [assessmentResult, setAssessmentResult] = useState<any>(null)

  // Sections (written modules OR document-based virtual sections)
  const [sections, setSections] = useState<Section[]>([])
  const [sectionIndex, setSectionIndex] = useState(0)
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set())

  // Chat
  const [messages, setMessages] = useState<TutorMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sources, setSources] = useState<DocumentChunkWithScore[]>([])
  const [showSources, setShowSources] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Diagnostic assessment
  const [assessmentQ, setAssessmentQ] = useState<any[] | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [assessmentId, setAssessmentId] = useState<string | null>(null)

  // Module check
  const [checkQuestions, setCheckQuestions] = useState<CheckQuestion[]>([])
  const [checkAnswers, setCheckAnswers] = useState<Record<number, string>>({})
  const [checkSubmitted, setCheckSubmitted] = useState(false)
  const [checkScore, setCheckScore] = useState(0)
  const [checkAssessmentId, setCheckAssessmentId] = useState<string | null>(null)

  useEffect(() => { init() }, [topicId])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  // ── Init ────────────────────────────────────────────────────────────────────

  async function init() {
    setPhase('loading')

    const [assessRes, coursesRes, docsRes] = await Promise.all([
      fetch('/api/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', topicId }),
      }),
      fetch(`/api/courses?topicId=${topicId}`),
      fetch(`/api/admin/content?topicId=${topicId}`),
    ])

    const [assessData, coursesData, docsData] = await Promise.all([
      assessRes.json(), coursesRes.json(), docsRes.json(),
    ])

    if (assessData.topicName) setTopicName(assessData.topicName)

    // Build sections: prefer written course modules, fall back to uploaded documents
    const course = (coursesData.courses ?? []).find(
      (c: any) => c.isPublished && c.modules?.length > 0
    ) ?? null

    let builtSections: Section[] = []

    if (course?.modules?.length > 0) {
      // Written course modules
      builtSections = course.modules.map((m: any) => ({
        id: m.id, title: m.title, type: 'written' as const, content: m.content,
      }))
    } else {
      // Auto-create sections from uploaded documents
      const docs = (docsData.documents ?? []).filter((d: any) => d.status === 'READY')
      builtSections = docs.map((d: any) => ({
        id: d.id,
        title: d.originalName.replace(/\.[^.]+$/, '').replace(/-\d+-Released copy$/, '').trim(),
        type: 'document' as const,
        documentId: d.id,
      }))
    }

    setSections(builtSections)

    if (assessData.alreadyAssessed) {
      setProficiencyLevel(assessData.level)
      if (builtSections.length > 0) {
        setPhase('overview')
      } else {
        setPhase('module-learning')
        await startSectionChat(builtSections, 0, assessData.topicName ?? '', assessData.level)
      }
    } else if (assessData.questions) {
      setAssessmentQ(assessData.questions)
      setAssessmentId(assessData.assessmentId)
      setPhase('assessing')
    } else {
      // No documents and no diagnostic possible
      setPhase('module-learning')
      await startSectionChat(builtSections, 0, assessData.topicName ?? '', 'BEGINNER')
    }
  }

  // ── Diagnostic ──────────────────────────────────────────────────────────────

  async function submitAssessment() {
    if (!assessmentId) return
    setLoading(true)
    const res = await fetch('/api/assess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'submit', assessmentId,
        answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })),
      }),
    })
    const result = await res.json()
    setLoading(false)
    setProficiencyLevel(result.level)
    setAssessmentResult(result)
    setPhase('assessment-result')
  }

  // ── Section teaching ─────────────────────────────────────────────────────

  async function startSectionChat(
    secs: Section[], idx: number, tName: string, level: string
  ) {
    setMessages([])
    setSources([])
    setLoading(true)

    const sec = secs[idx]
    const total = secs.length
    const topic = tName || topicName

    const prompt = sec
      ? sec.type === 'written' && sec.content
        ? `You are teaching section ${idx + 1} of ${total}: "${sec.title}" for the topic "${topic}". ` +
          `Learner level: ${level}.\n\nSection content:\n${sec.content}\n\n` +
          `Teach this section step by step with clear explanations and examples.`
        : `You are teaching section ${idx + 1} of ${total}: "${sec.title}" for the topic "${topic}". ` +
          `Learner level: ${level}. ` +
          `Focus specifically on the content from the document titled "${sec.title}". ` +
          `Give a thorough introduction covering all the key concepts, rules, procedures, and examples in this document. ` +
          `Be comprehensive — the learner needs to understand everything in this document.`
      : `Introduce the topic "${topic}" to a ${level} level learner comprehensively.`

    try {
      const res = await fetch('/api/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, message: prompt, history: [] }),
      })
      const data = await res.json()
      setMessages([{
        role: 'assistant', content: data.content,
        sources: data.sources, timestamp: new Date().toISOString(),
      }])
      if (data.sources?.length) setSources(data.sources)
    } catch {
      setMessages([{
        role: 'assistant',
        content: `Let's study **${sec?.title ?? topic}**. Ask me anything about this section.`,
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setLoading(false)
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return
    const msg = input.trim()
    setInput('')
    setMessages((p) => [...p, { role: 'user', content: msg, timestamp: new Date().toISOString() }])
    setLoading(true)
    try {
      const res = await fetch('/api/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, message: msg, history: messages.slice(-8) }),
      })
      const data = await res.json()
      setMessages((p) => [...p, {
        role: 'assistant', content: data.content,
        sources: data.sources, timestamp: new Date().toISOString(),
      }])
      if (data.sources?.length) setSources(data.sources)
    } catch {
      setMessages((p) => [...p, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setLoading(false)
    }
  }

  // ── Section check ────────────────────────────────────────────────────────

  async function startSectionCheck() {
    setLoading(true)
    setCheckAnswers({})
    setCheckSubmitted(false)
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', topicId }),
      })
      const data = await res.json()
      setCheckQuestions((data.questions ?? []).slice(0, 5).map((q: any) => ({
        text: q.text, options: q.options?.map((o: any) => o.text) ?? [], id: q.id,
      })))
      setCheckAssessmentId(data.assessmentId)
    } catch {
      setCheckQuestions([])
    } finally {
      setLoading(false)
      setPhase('module-check')
    }
  }

  async function submitSectionCheck() {
    setLoading(true)
    if (checkAssessmentId) {
      try {
        await fetch('/api/quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'submit', assessmentId: checkAssessmentId,
            answers: checkQuestions.map((q, i) => ({ questionId: q.id, answer: checkAnswers[i] ?? '' })),
          }),
        })
      } catch {}
    }
    const score = Math.round((Object.keys(checkAnswers).length / Math.max(checkQuestions.length, 1)) * 100)
    setCheckScore(score)
    setLoading(false)
    setCheckSubmitted(true)
  }

  function proceedToNextSection() {
    const newCompleted = new Set(completedSections)
    newCompleted.add(sectionIndex)
    setCompletedSections(newCompleted)

    if (sectionIndex < sections.length - 1) {
      const next = sectionIndex + 1
      setSectionIndex(next)
      setPhase('module-learning')
      startSectionChat(sections, next, topicName, proficiencyLevel)
    } else {
      // All sections done → summative final assessment
      setPhase('final-assessment')
      setAnswers({})
      setAssessmentId(null)
      setAssessmentQ(null)
      loadFinalAssessment()
    }
  }

  async function loadFinalAssessment() {
    try {
      const res = await fetch('/api/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // type: SUMMATIVE bypasses "already assessed" check
        body: JSON.stringify({ action: 'start', topicId, type: 'SUMMATIVE' }),
      })
      const data = await res.json()
      if (data.questions) {
        setAssessmentQ(data.questions)
        setAssessmentId(data.assessmentId)
      }
    } catch (err) {
      console.error('[final-assessment] load failed:', err)
    }
  }

  async function submitFinalAssessment() {
    if (!assessmentId) return
    setLoading(true)
    const res = await fetch('/api/assess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'submit', assessmentId,
        answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })),
      }),
    })
    const result = await res.json()
    setLoading(false)
    setProficiencyLevel(result.level)
    setAssessmentResult(result)
    setPhase('complete')
  }

  // ─── RENDER ──────────────────────────────────────────────────────────────────

  const currentSection = sections[sectionIndex]

  // Loading
  if (phase === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Diagnostic
  if (phase === 'assessing' && assessmentQ) {
    const answered = Object.keys(answers).length
    const progress = Math.round((answered / assessmentQ.length) * 100)
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Diagnostic Assessment</h1>
          <p className="text-muted-foreground mt-1">
            Let&apos;s assess your current level of <strong>{topicName}</strong>
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-sm text-muted-foreground">{answered}/{assessmentQ.length}</span>
          </div>
        </div>
        <div className="space-y-5">
          {assessmentQ.map((q: any, idx: number) => (
            <div key={q.id} className="bg-card border border-border rounded-xl p-5">
              <p className="font-medium mb-3"><span className="text-muted-foreground mr-2">{idx + 1}.</span>{q.text}</p>
              <div className="space-y-2">
                {q.options?.map((opt: any) => (
                  <label key={opt.id} className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    answers[q.id] === opt.text ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                  )}>
                    <input type="radio" name={q.id} value={opt.text} checked={answers[q.id] === opt.text}
                      onChange={() => setAnswers((p) => ({ ...p, [q.id]: opt.text }))} />
                    <span className="text-sm">{opt.text}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button onClick={submitAssessment} disabled={answered < assessmentQ.length || loading}
          className="mt-6 w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Submit Assessment
        </button>
      </div>
    )
  }

  // Assessment result
  if (phase === 'assessment-result' && assessmentResult) {
    return (
      <div className="max-w-lg mx-auto text-center">
        <div className="bg-card border border-border rounded-2xl p-8">
          <Award className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-1">Assessment Complete</h1>
          <div className="bg-primary/5 rounded-xl p-4 my-5">
            <p className="text-sm text-muted-foreground">Your current level</p>
            <p className={`text-2xl font-bold mt-1 ${getProficiencyColor(assessmentResult.level).split(' ')[0]}`}>
              {assessmentResult.level}
            </p>
            <p className="text-4xl font-bold">{assessmentResult.score}%</p>
          </div>
          {sections.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground mb-5">
                This course covers <strong>{sections.length} section{sections.length !== 1 ? 's' : ''}</strong>.
                The tutor will teach each one, check your understanding, then give a final assessment.
              </p>
              <button onClick={() => setPhase('overview')}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium flex items-center justify-center gap-2">
                View Course Outline <ChevronRight className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button onClick={() => { setPhase('module-learning'); startSectionChat(sections, 0, topicName, assessmentResult.level) }}
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium">
              Start Learning
            </button>
          )}
        </div>
      </div>
    )
  }

  // Course Overview
  if (phase === 'overview') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{topicName}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getProficiencyColor(proficiencyLevel)}`}>
              Your level: {proficiencyLevel}
            </span>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 mb-5">
          <h2 className="font-semibold mb-1">How this works</h2>
          <p className="text-sm text-muted-foreground">
            The AI tutor will teach each section from your uploaded documents.
            After each section you&apos;ll answer a short check. Only after completing
            all {sections.length} sections will the final assessment unlock.
          </p>
        </div>
        <div className="space-y-2 mb-6">
          {sections.map((sec, i) => (
            <div key={sec.id} className={cn(
              'flex items-center gap-4 p-4 rounded-xl border',
              i === 0 ? 'border-primary bg-primary/5' : 'border-border bg-card'
            )}>
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}>
                {i + 1}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{sec.title}</p>
                {sec.type === 'document' && (
                  <p className="text-xs text-muted-foreground mt-0.5">Uploaded document</p>
                )}
              </div>
              {i === 0 ? <PlayCircle className="h-5 w-5 text-primary flex-shrink-0" /> : <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
            </div>
          ))}
          <div className="flex items-center gap-4 p-4 rounded-xl border border-dashed border-border">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-muted">
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="font-medium text-sm text-muted-foreground">
              Final Assessment — unlocks after all {sections.length} sections
            </p>
            <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-auto" />
          </div>
        </div>
        <button
          onClick={() => {
            setSectionIndex(0)
            setPhase('module-learning')
            startSectionChat(sections, 0, topicName, proficiencyLevel)
          }}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium flex items-center justify-center gap-2"
        >
          <PlayCircle className="h-5 w-5" /> Start: {sections[0]?.title}
        </button>
      </div>
    )
  }

  // Section Check
  if (phase === 'module-check') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">Section Check</span>
            <span className="text-xs text-muted-foreground">· {sectionIndex + 1} of {sections.length}</span>
          </div>
          <h1 className="text-xl font-bold">{currentSection?.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Answer these questions before moving to the next section.
          </p>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : checkQuestions.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <p className="text-muted-foreground text-sm">No check questions available.</p>
            <button onClick={proceedToNextSection} className="mt-4 bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium">
              Continue <ChevronRight className="h-4 w-4 inline" />
            </button>
          </div>
        ) : !checkSubmitted ? (
          <>
            <div className="space-y-5">
              {checkQuestions.map((q, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-5">
                  <p className="font-medium mb-3"><span className="text-muted-foreground mr-2">{i + 1}.</span>{q.text}</p>
                  <div className="space-y-2">
                    {q.options.map((opt) => (
                      <label key={opt} className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                        checkAnswers[i] === opt ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                      )}>
                        <input type="radio" name={`c${i}`} value={opt}
                          checked={checkAnswers[i] === opt}
                          onChange={() => setCheckAnswers((p) => ({ ...p, [i]: opt }))} />
                        <span className="text-sm">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={submitSectionCheck}
              disabled={Object.keys(checkAnswers).length < checkQuestions.length || loading}
              className="mt-6 w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Submit Check
            </button>
          </>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <div className={cn('w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4',
              checkScore >= 60 ? 'bg-green-100' : 'bg-orange-100'
            )}>
              {checkScore >= 60
                ? <CheckCircle2 className="h-8 w-8 text-green-600" />
                : <XCircle className="h-8 w-8 text-orange-500" />
              }
            </div>
            <h2 className="text-xl font-bold mb-1">{checkScore >= 60 ? 'Well done!' : 'Keep going!'}</h2>
            <p className="text-muted-foreground mb-5 text-sm">
              {sectionIndex < sections.length - 1
                ? `Next: ${sections[sectionIndex + 1]?.title}`
                : 'You\'ve completed all sections. Time for the final assessment!'
              }
            </p>
            <div className="flex gap-3">
              <button onClick={() => {
                setPhase('module-learning')
                startSectionChat(sections, sectionIndex, topicName, proficiencyLevel)
              }} className="flex-1 border border-border py-2.5 rounded-xl text-sm hover:bg-accent">
                Review section
              </button>
              <button onClick={proceedToNextSection}
                className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                {sectionIndex < sections.length - 1 ? `Next Section` : 'Final Assessment'}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Final Assessment
  if (phase === 'final-assessment') {
    const qs = assessmentQ ?? []
    const answered = Object.keys(answers).length
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold text-primary uppercase tracking-wide">Final Assessment</span>
          </div>
          <h1 className="text-xl font-bold">{topicName}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            You&apos;ve completed all {sections.length} sections. This determines your final proficiency level.
          </p>
          {qs.length > 0 && (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 h-2 bg-muted rounded-full">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.round((answered / qs.length) * 100)}%` }} />
              </div>
              <span className="text-sm text-muted-foreground">{answered}/{qs.length}</span>
            </div>
          )}
        </div>
        {loading || qs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Generating final assessment from all documents…</p>
          </div>
        ) : (
          <>
            <div className="space-y-5">
              {qs.map((q: any, idx: number) => (
                <div key={q.id} className="bg-card border border-border rounded-xl p-5">
                  <p className="font-medium mb-3"><span className="text-muted-foreground mr-2">{idx + 1}.</span>{q.text}</p>
                  <div className="space-y-2">
                    {q.options?.map((opt: any) => (
                      <label key={opt.id} className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                        answers[q.id] === opt.text ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                      )}>
                        <input type="radio" name={q.id} value={opt.text} checked={answers[q.id] === opt.text}
                          onChange={() => setAnswers((p) => ({ ...p, [q.id]: opt.text }))} />
                        <span className="text-sm">{opt.text}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={submitFinalAssessment} disabled={answered < qs.length || loading}
              className="mt-6 w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Submit Final Assessment
            </button>
          </>
        )}
      </div>
    )
  }

  // Complete
  if (phase === 'complete' && assessmentResult) {
    return (
      <div className="max-w-lg mx-auto text-center">
        <div className="bg-card border border-border rounded-2xl p-10">
          <Trophy className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Course Complete!</h1>
          <p className="text-muted-foreground mb-6">{topicName}</p>
          <div className="bg-primary/5 rounded-xl p-5 mb-6">
            <p className="text-sm text-muted-foreground">Final Proficiency Level</p>
            <p className={`text-3xl font-bold mt-1 ${getProficiencyColor(assessmentResult.level).split(' ')[0]}`}>
              {assessmentResult.level}
            </p>
            <p className="text-5xl font-bold">{assessmentResult.score}%</p>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => router.push('/topics')} className="flex-1 border border-border py-2.5 rounded-xl text-sm hover:bg-accent">
              Browse Topics
            </button>
            <button onClick={() => router.push('/progress')} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium">
              My Progress
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Module Learning (Chat) ─────────────────────────────────────────────────

  return (
    <div className="flex gap-0 h-[calc(100vh-4rem)] -mt-8 -mx-8">
      {/* Left: section list */}
      {sections.length > 0 && (
        <div className="w-56 border-r border-border bg-card flex flex-col flex-shrink-0">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">
              {topicName}
            </p>
          </div>
          <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            {sections.map((sec, i) => (
              <div key={sec.id} className={cn(
                'flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs transition-colors',
                i === sectionIndex ? 'bg-primary text-primary-foreground' :
                completedSections.has(i) ? 'text-green-700 bg-green-50' :
                i < sectionIndex ? 'text-muted-foreground hover:bg-accent cursor-pointer' :
                'text-muted-foreground opacity-50'
              )}>
                <span className="w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0" style={{ borderColor: 'currentColor' }}>
                  {completedSections.has(i) ? '✓' : i + 1}
                </span>
                <span className="truncate">{sec.title}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs text-muted-foreground opacity-50">
              <Trophy className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Final Assessment</span>
            </div>
          </nav>
        </div>
      )}

      {/* Chat */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-3">
            <BookOpen className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-semibold">
                {currentSection ? `${sectionIndex + 1}/${sections.length}: ${currentSection.title}` : topicName}
              </p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${getProficiencyColor(proficiencyLevel)}`}>
                {proficiencyLevel}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {sources.length > 0 && (
              <button onClick={() => setShowSources(!showSources)}
                className="text-xs flex items-center gap-1 text-muted-foreground border border-border px-3 py-1.5 rounded-lg">
                <FileText className="h-3 w-3" /> {sources.length} sources
              </button>
            )}
            {messages.length > 1 && (
              <button onClick={startSectionCheck}
                className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Section Check
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[80%] rounded-2xl px-4 py-3',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-card border border-border rounded-bl-sm'
                )}>
                  {msg.role === 'assistant'
                    ? <div className="prose-chat text-sm"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                    : <p className="text-sm">{msg.content}</p>
                  }
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      {msg.sources.slice(0, 2).map((s, si) => (
                        <div key={si} className="text-xs text-muted-foreground flex items-center gap-1">
                          <FileText className="h-3 w-3" /> {s.documentName}
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
                    <span className="text-sm">{messages.length === 0 ? 'Preparing your lesson…' : 'Thinking…'}</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {showSources && (
            <div className="w-64 border-l border-border bg-card flex flex-col">
              <div className="flex items-center justify-between p-3 border-b border-border">
                <h3 className="text-sm font-medium">Sources</h3>
                <button onClick={() => setShowSources(false)}><X className="h-4 w-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {sources.map((s, i) => (
                  <div key={i} className="border border-border rounded-lg p-2">
                    <p className="text-xs font-medium">{s.documentName}</p>
                    {s.pageNumber && <p className="text-xs text-muted-foreground">p.{s.pageNumber}</p>}
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{s.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <form onSubmit={sendMessage} className="border-t border-border p-4 flex gap-3 bg-card flex-shrink-0">
          <input value={input} onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask about ${currentSection?.title ?? topicName}…`}
            className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background" />
          <button type="submit" disabled={!input.trim() || loading}
            className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl disabled:opacity-50">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
