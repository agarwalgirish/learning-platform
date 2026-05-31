'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Trash2, Upload, Globe, FileText,
  Loader2, CheckCircle2, GripVertical, ChevronDown, ChevronUp, AlertCircle, EyeOff,
} from 'lucide-react'
import { cn, formatBytes, formatDate } from '@/lib/utils'

type SourceType = 'text' | 'file' | 'url'

interface Module {
  id: string
  title: string
  description?: string
  content?: string
  order: number
}

interface Document {
  id: string
  originalName: string
  mimeType: string
  fileSize: number
  status: string
  createdAt: string
  storagePath?: string
  storageProvider?: string
}

export default function CourseEditorPage() {
  const { id: courseId } = useParams<{ id: string }>()
  const router = useRouter()

  const [course, setCourse] = useState<any>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [sourceType, setSourceType] = useState<SourceType>('text')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Text module form
  const [textForm, setTextForm] = useState({ title: '', content: '' })
  // URL form
  const [urlForm, setUrlForm] = useState({ title: '', url: '' })
  // File form
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileTitle, setFileTitle] = useState('')

  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => { load() }, [courseId])

  async function load() {
    setLoading(true)
    const [courseRes, docsRes] = await Promise.all([
      fetch(`/api/courses/${courseId}`),
      fetch(`/api/admin/content?topicId=_course_${courseId}`),
    ])
    const courseData = await courseRes.json()
    setCourse(courseData.course)
    setModules(courseData.course?.modules ?? [])

    // Fetch documents linked to this course's topic
    const topicId = courseData.course?.topicId
    if (topicId) {
      const docsData2 = await fetch(`/api/admin/content?topicId=${topicId}`).then((r) => r.json())
      setDocuments(docsData2.documents ?? [])
    }
    setLoading(false)
  }

  async function addTextModule() {
    if (!textForm.title.trim() || !textForm.content.trim()) return
    setSaving(true)
    const res = await fetch(`/api/courses/${courseId}/modules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: textForm.title, content: textForm.content }),
    })
    if (res.ok) {
      setTextForm({ title: '', content: '' })
      setShowAddPanel(false)
      setSaveMsg('Module added and indexed ✓')
      await load()
    }
    setSaving(false)
    setTimeout(() => setSaveMsg(''), 3000)
  }

  async function addUrlModule() {
    if (!urlForm.url.trim()) return
    setSaving(true)
    const topicId = course?.topicId
    if (!topicId) { setSaving(false); return }
    const res = await fetch('/api/content/url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: urlForm.url, title: urlForm.title || undefined, topicId }),
    })
    if (res.ok) {
      setUrlForm({ title: '', url: '' })
      setShowAddPanel(false)
      setSaveMsg('URL is being fetched and indexed…')
      setTimeout(() => load(), 4000)
    }
    setSaving(false)
    setTimeout(() => setSaveMsg(''), 5000)
  }

  async function addFileModule(files: FileList | null) {
    if (!files?.length) return
    const topicId = course?.topicId
    if (!topicId) return
    setSaving(true)
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('topicId', topicId)
      await fetch('/api/upload', { method: 'POST', body: fd })
    }
    setSaving(false)
    setShowAddPanel(false)
    setSaveMsg('Files uploaded — processing embeddings…')
    setTimeout(() => load(), 3000)
    setTimeout(() => load(), 8000)
    setTimeout(() => setSaveMsg(''), 8000)
  }

  async function deleteModule(moduleId: string) {
    if (!confirm('Delete this module?')) return
    await fetch(`/api/courses/${courseId}/modules?moduleId=${moduleId}`, { method: 'DELETE' })
    load()
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!course) {
    return <p className="text-muted-foreground">Course not found.</p>
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/admin/content" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{course.name}</h1>
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium',
                course.isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              )}>
                {course.isPublished ? 'Published' : 'Draft'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Topic: {course.topic?.name} · {modules.length} modules · {documents.length} documents
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saveMsg && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="h-4 w-4" />
              {saveMsg}
            </div>
          )}
          <button
            onClick={async () => {
              await fetch(`/api/courses/${courseId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPublished: !course.isPublished }),
              })
              await load()
              setSaveMsg(course.isPublished ? 'Course unpublished' : 'Course published ✓')
              setTimeout(() => setSaveMsg(''), 3000)
            }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
              course.isPublished
                ? 'border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                : 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
            )}
          >
            {course.isPublished ? (
              <><EyeOff className="h-4 w-4" /> Unpublish</>
            ) : (
              <><Globe className="h-4 w-4" /> Publish course</>
            )}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left: content list */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Course Content</h2>
            <button
              onClick={() => setShowAddPanel(true)}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Add content
            </button>
          </div>

          {/* Text modules */}
          {modules.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Written Modules
              </p>
              <div className="space-y-2">
                {modules.map((mod) => (
                  <div key={mod.id} className="border border-border rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleExpand(mod.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="flex-1 text-sm font-medium">{mod.title}</span>
                      <span className="text-xs text-muted-foreground">{mod.content?.length ?? 0} chars</span>
                      {expanded.has(mod.id)
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      }
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteModule(mod.id) }}
                        className="ml-1 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </button>
                    {expanded.has(mod.id) && mod.content && (
                      <div className="px-4 py-3 border-t border-border bg-muted/20">
                        <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-muted-foreground line-clamp-10">
                          {mod.content}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Uploaded documents */}
          {documents.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 mt-4">
                Uploaded Documents & URLs
              </p>
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                    {doc.status === 'PROCESSING'
                      ? <Loader2 className="h-4 w-4 animate-spin text-blue-500 flex-shrink-0" />
                      : doc.status === 'FAILED'
                      ? <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      : <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    }
                    {doc.storagePath?.startsWith('url:')
                      ? <Globe className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      : <Upload className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.originalName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(doc.fileSize)} · {formatDate(doc.createdAt)}
                      </p>
                    </div>
                    <span className={cn(
                      'text-xs font-medium',
                      doc.status === 'READY' ? 'text-green-600' :
                      doc.status === 'FAILED' ? 'text-red-600' : 'text-blue-600'
                    )}>
                      {doc.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {modules.length === 0 && documents.length === 0 && (
            <div className="border-2 border-dashed border-border rounded-xl p-10 text-center">
              <p className="text-muted-foreground text-sm">No content yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click "Add content" to add text, upload a file, or paste a URL.
              </p>
            </div>
          )}
        </div>

        {/* Right: Add content panel */}
        <div className="lg:col-span-2">
          {showAddPanel ? (
            <div className="bg-card border border-border rounded-xl p-5 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">Add content</h3>
                <button onClick={() => setShowAddPanel(false)} className="text-muted-foreground hover:text-foreground text-xs">
                  ✕
                </button>
              </div>

              {/* Source type tabs */}
              <div className="flex rounded-lg border border-border overflow-hidden mb-4">
                {([
                  { type: 'text', icon: FileText, label: 'Write' },
                  { type: 'file', icon: Upload, label: 'Upload' },
                  { type: 'url', icon: Globe, label: 'URL' },
                ] as const).map(({ type, icon: Icon, label }) => (
                  <button
                    key={type}
                    onClick={() => setSourceType(type)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors',
                      sourceType === type
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent text-muted-foreground'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Text form */}
              {sourceType === 'text' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Module title</label>
                    <input
                      value={textForm.title}
                      onChange={(e) => setTextForm((p) => ({ ...p, title: e.target.value }))}
                      placeholder="e.g. What is Zero Trust?"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Content</label>
                    <textarea
                      value={textForm.content}
                      onChange={(e) => setTextForm((p) => ({ ...p, content: e.target.value }))}
                      rows={8}
                      placeholder="Write the module content here. Markdown is supported."
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none font-mono"
                    />
                  </div>
                  <button
                    onClick={addTextModule}
                    disabled={saving || !textForm.title || !textForm.content}
                    className="w-full bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {saving ? 'Saving & indexing…' : 'Add module'}
                  </button>
                </div>
              )}

              {/* File form */}
              {sourceType === 'file' && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Supported: PDF, DOCX, PPTX, TXT, Markdown, HTML
                  </p>
                  <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.pptx,.txt,.md,.html" className="hidden"
                    onChange={(e) => addFileModule(e.target.files)}
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={saving}
                    className="w-full border-2 border-dashed border-border rounded-xl py-6 text-center hover:border-primary/50 transition-colors disabled:opacity-50"
                  >
                    <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Click to choose files</p>
                  </button>
                </div>
              )}

              {/* URL form */}
              {sourceType === 'url' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">URL</label>
                    <input
                      value={urlForm.url}
                      onChange={(e) => setUrlForm((p) => ({ ...p, url: e.target.value }))}
                      placeholder="https://docs.example.com/security-guide"
                      type="url"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Title (optional)</label>
                    <input
                      value={urlForm.title}
                      onChange={(e) => setUrlForm((p) => ({ ...p, title: e.target.value }))}
                      placeholder="Auto-detected from page title"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The page will be fetched, its text extracted, and indexed for the AI tutor.
                  </p>
                  <button
                    onClick={addUrlModule}
                    disabled={saving || !urlForm.url}
                    className="w-full bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {saving ? 'Fetching…' : 'Fetch & index'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-muted/30 border border-dashed border-border rounded-xl p-6 text-center">
              <Plus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">Add content from any source</p>
              <div className="space-y-2 text-xs text-muted-foreground text-left">
                <p>📝 <strong>Write</strong> — type content directly</p>
                <p>📎 <strong>Upload</strong> — PDF, DOCX, PPTX, TXT</p>
                <p>🌐 <strong>URL</strong> — fetch from any webpage</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
