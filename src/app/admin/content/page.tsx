'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Upload, File, Trash2, CheckCircle2, Clock, AlertCircle,
  Loader2, Plus, BookOpen, ChevronRight, Globe, FileText,
} from 'lucide-react'
import { formatBytes, formatDate, cn } from '@/lib/utils'

type Tab = 'courses' | 'documents'

// ─── Courses tab ─────────────────────────────────────────────────────────────

function CoursesTab() {
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchCourses() }, [])

  async function fetchCourses() {
    setLoading(true)
    const res = await fetch('/api/courses')
    const data = await res.json()
    setCourses(data.courses ?? [])
    setLoading(false)
  }

  async function deleteCourse(id: string) {
    if (!confirm('Delete this course and all its modules?')) return
    await fetch(`/api/courses/${id}`, { method: 'DELETE' })
    fetchCourses()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">{courses.length} Courses</h2>
        <Link
          href="/admin/courses/new"
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> New Course
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : courses.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-xl p-12 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-sm">No courses yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Create a course to organise content from multiple sources into a structured learning experience.
          </p>
          <Link href="/admin/courses/new" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium">
            <Plus className="h-4 w-4" /> Create first course
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <div key={course.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold truncate">{course.name}</p>
                    <button
                      onClick={async () => {
                        await fetch(`/api/courses/${course.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ isPublished: !course.isPublished }),
                        })
                        fetchCourses()
                      }}
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 border transition-colors',
                        course.isPublished
                          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                          : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
                      )}
                    >
                      {course.isPublished ? 'Published' : 'Draft'}
                    </button>
                  </div>
                  {course.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{course.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {course.topic?.name}
                    </span>
                    <span>{course._count?.modules ?? 0} modules</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    href={`/admin/courses/${course.id}`}
                    className="flex items-center gap-1 text-xs border border-border px-3 py-1.5 rounded-lg hover:bg-accent transition-colors"
                  >
                    Edit <ChevronRight className="h-3 w-3" />
                  </Link>
                  <button
                    onClick={() => deleteCourse(course.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1.5"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Documents tab ────────────────────────────────────────────────────────────

function DocumentsTab() {
  const [documents, setDocuments] = useState<any[]>([])
  const [topics, setTopics] = useState<any[]>([])
  const [selectedTopic, setSelectedTopic] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dragOver, setDragOver] = useState(false)
  const [reembedding, setReembedding] = useState(false)
  const [reembedMsg, setReembedMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function reembedAll() {
    setReembedding(true)
    setReembedMsg('')
    try {
      const res = await fetch('/api/admin/reembed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedTopic ? { topicId: selectedTopic } : {}),
      })
      const data = await res.json()
      setReembedMsg(data.message)
      setTimeout(fetchDocuments, 1000)
    } catch {
      setReembedMsg('Re-embedding failed — check server logs')
    } finally {
      setReembedding(false)
    }
  }

  useEffect(() => { fetchTopics(); fetchDocuments() }, [])
  useEffect(() => { fetchDocuments() }, [selectedTopic])

  async function fetchDocuments() {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedTopic) params.set('topicId', selectedTopic)
    const res = await fetch(`/api/admin/content?${params}`)
    const data = await res.json()
    setDocuments(data.documents ?? [])
    setLoading(false)
  }

  async function fetchTopics() {
    const res = await fetch('/api/topics')
    const data = await res.json()
    setTopics(data.topics ?? [])
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      if (selectedTopic) fd.append('topicId', selectedTopic)
      try { await fetch('/api/upload', { method: 'POST', body: fd }) } catch {}
    }
    setUploading(false)
    setTimeout(fetchDocuments, 2000)
    setTimeout(fetchDocuments, 8000)
  }

  async function deleteDocument(id: string) {
    if (!confirm('Delete this document and all its chunks?')) return
    await fetch(`/api/admin/content?id=${id}`, { method: 'DELETE' })
    fetchDocuments()
  }

  const statusIcon = (s: string) => {
    if (s === 'READY') return <CheckCircle2 className="h-4 w-4 text-green-500" />
    if (s === 'PROCESSING') return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
    if (s === 'PENDING') return <Clock className="h-4 w-4 text-yellow-500" />
    return <AlertCircle className="h-4 w-4 text-red-500" />
  }

  return (
    <div>
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files) }}
            onClick={() => fileRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
              dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            )}
          >
            <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.pptx,.txt,.md,.html" className="hidden"
              onChange={(e) => handleUpload(e.target.files)} />
            {uploading
              ? <div className="flex items-center justify-center gap-3 text-primary">
                  <Loader2 className="h-6 w-6 animate-spin" /><span>Uploading…</span>
                </div>
              : <>
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium text-sm">Drop files here or click to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, PPTX, TXT, Markdown, HTML — max 50 MB</p>
                </>
            }
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <label className="block text-sm font-medium mb-2">Filter by topic</label>
          <select value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">All topics</option>
            {topics.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <p className="text-xs text-muted-foreground mt-2">Select topic before uploading to auto-assign</p>
        </div>
      </div>

      {/* Re-embed banner */}
      {reembedMsg && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
          {reembedMsg}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">{documents.length} Documents</h2>
          <div className="flex items-center gap-3">
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <button
              onClick={reembedAll}
              disabled={reembedding}
              title="Re-generate AI embeddings for documents uploaded before OpenAI credits were added"
              className="flex items-center gap-1.5 text-xs border border-border px-3 py-1.5 rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
            >
              {reembedding
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Re-embedding…</>
                : '⚡ Re-embed documents'
              }
            </button>
          </div>
        </div>
        {documents.length === 0 && !loading ? (
          <div className="text-center py-12">
            <File className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No documents yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center px-6 py-4 gap-4 hover:bg-accent/30">
                <div className="flex-shrink-0">{statusIcon(doc.status)}</div>
                {doc.storageProvider === 'url' || doc.storagePath?.startsWith('url:')
                  ? <Globe className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  : doc.storageProvider === 'inline'
                  ? <FileText className="h-4 w-4 text-purple-500 flex-shrink-0" />
                  : <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.originalName}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">{formatBytes(doc.fileSize)}</span>
                    {doc.topic && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{doc.topic.name}</span>
                    )}
                    {doc._count?.chunks > 0 && (
                      <span className="text-xs text-muted-foreground">{doc._count.chunks} chunks</span>
                    )}
                    <span className="text-xs text-muted-foreground">{formatDate(doc.createdAt)}</span>
                  </div>
                </div>
                <span className={cn('text-xs font-medium hidden sm:block flex-shrink-0',
                  doc.status === 'READY' ? 'text-green-600' : doc.status === 'FAILED' ? 'text-red-600' : 'text-blue-600'
                )}>{doc.status}</span>
                <button onClick={() => deleteDocument(doc.id)} className="text-muted-foreground hover:text-destructive flex-shrink-0">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ContentPage() {
  const [tab, setTab] = useState<Tab>('courses')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Knowledge Base</h1>
        <p className="text-muted-foreground mt-1">Manage courses and raw documents for the AI tutor</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        {([
          { key: 'courses', icon: BookOpen, label: 'Courses' },
          { key: 'documents', icon: File, label: 'Documents' },
        ] as const).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'courses' ? <CoursesTab /> : <DocumentsTab />}
    </div>
  )
}
