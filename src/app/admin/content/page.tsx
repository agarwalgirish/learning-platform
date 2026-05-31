'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Upload, File, Trash2, CheckCircle2, Clock, AlertCircle,
  Loader2, X, Download, FileText, Hash, ChevronDown, ChevronUp,
} from 'lucide-react'
import { formatBytes, formatDate, cn } from '@/lib/utils'

// ─── Document Viewer Slide-over ───────────────────────────────────────────────

function DocumentViewer({
  documentId,
  onClose,
}: {
  documentId: string
  onClose: () => void
}) {
  const [doc, setDoc] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'text' | 'chunks'>('text')
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set())

  useEffect(() => {
    fetch(`/api/documents/${documentId}`)
      .then((r) => r.json())
      .then((data) => { setDoc(data.document); setLoading(false) })
      .catch(() => setLoading(false))
  }, [documentId])

  function toggleChunk(idx: number) {
    setExpandedChunks((prev) => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  const totalTokens = doc?.chunks?.reduce(
    (sum: number, c: any) => sum + (c.tokenCount ?? 0), 0
  ) ?? 0

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-background border-l border-border shadow-2xl z-50 flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            {loading ? (
              <div className="h-5 w-48 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <h2 className="font-semibold text-base truncate">{doc?.originalName}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatBytes(doc?.fileSize ?? 0)} · {doc?.mimeType} · uploaded {formatDate(doc?.createdAt)}
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {doc && doc.fileName && (
              <a
                href={`/api/files/${doc.fileName}`}
                download
                className="flex items-center gap-1.5 text-xs border border-border px-3 py-1.5 rounded-lg hover:bg-accent transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !doc ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Document not found
          </div>
        ) : (
          <>
            {/* Metadata strip */}
            <div className="flex items-center gap-6 px-6 py-3 border-b border-border bg-muted/30 flex-shrink-0 flex-wrap gap-y-1">
              <Meta label="Status" value={doc.status} colored />
              <Meta label="Topic" value={doc.topic?.name ?? 'Unassigned'} />
              <Meta label="Pages" value={doc.pageCount ? String(doc.pageCount) : '—'} />
              <Meta label="Chunks" value={String(doc.chunks?.length ?? 0)} />
              <Meta label="Est. tokens" value={totalTokens > 0 ? totalTokens.toLocaleString() : '—'} />
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border flex-shrink-0">
              {(['text', 'chunks'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    'flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors',
                    tab === t
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  {t === 'text' ? (
                    <><FileText className="h-3.5 w-3.5" /> Extracted Text</>
                  ) : (
                    <><Hash className="h-3.5 w-3.5" /> Chunks ({doc.chunks?.length ?? 0})</>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              {tab === 'text' ? (
                <div className="p-6">
                  {doc.extractedText ? (
                    <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                      {doc.extractedText}
                    </pre>
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-12">
                      {doc.status === 'PROCESSING'
                        ? 'Document is still being processed…'
                        : doc.status === 'FAILED'
                        ? 'Extraction failed. Check the error log.'
                        : 'No extracted text available.'}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {doc.chunks?.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-12">
                      No chunks yet — document may still be processing.
                    </p>
                  ) : doc.chunks?.map((chunk: any) => {
                    const expanded = expandedChunks.has(chunk.chunkIndex)
                    return (
                      <div
                        key={chunk.id}
                        className="border border-border rounded-lg overflow-hidden"
                      >
                        {/* Chunk header — always visible */}
                        <button
                          onClick={() => toggleChunk(chunk.chunkIndex)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-muted-foreground w-8">
                              #{chunk.chunkIndex + 1}
                            </span>
                            {chunk.pageNumber && (
                              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                                p.{chunk.pageNumber}
                              </span>
                            )}
                            {chunk.heading && (
                              <span className="text-xs font-medium text-primary truncate max-w-xs">
                                {chunk.heading}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground truncate max-w-xs">
                              {chunk.content.slice(0, 80)}…
                            </span>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                            {chunk.tokenCount && (
                              <span className="text-xs text-muted-foreground">
                                {chunk.tokenCount} tokens
                              </span>
                            )}
                            {expanded
                              ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                              : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            }
                          </div>
                        </button>

                        {/* Chunk body — expanded */}
                        {expanded && (
                          <div className="px-4 py-3 border-t border-border bg-muted/20">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                              {chunk.content}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

function Meta({ label, value, colored }: { label: string; value: string; colored?: boolean }) {
  const colorMap: Record<string, string> = {
    READY: 'text-green-600',
    PROCESSING: 'text-blue-600',
    PENDING: 'text-yellow-600',
    FAILED: 'text-red-600',
  }
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}: </span>
      <span className={cn('text-xs font-medium', colored ? (colorMap[value] ?? '') : '')}>
        {value}
      </span>
    </div>
  )
}

// ─── Main Content Page ────────────────────────────────────────────────────────

export default function ContentPage() {
  const [documents, setDocuments] = useState<any[]>([])
  const [topics, setTopics] = useState<any[]>([])
  const [selectedTopic, setSelectedTopic] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dragOver, setDragOver] = useState(false)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchTopics()
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [selectedTopic])

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
    if (!files || files.length === 0) return
    setUploading(true)
    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('file', file)
      if (selectedTopic) formData.append('topicId', selectedTopic)
      try {
        await fetch('/api/upload', { method: 'POST', body: formData })
      } catch (err) {
        console.error('Upload failed:', err)
      }
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

  const statusIcon = (status: string) => {
    switch (status) {
      case 'READY':      return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'PROCESSING': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'PENDING':    return <Clock className="h-4 w-4 text-yellow-500" />
      case 'FAILED':     return <AlertCircle className="h-4 w-4 text-red-500" />
      default:           return null
    }
  }

  return (
    <>
      {viewingId && (
        <DocumentViewer documentId={viewingId} onClose={() => setViewingId(null)} />
      )}

      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          <p className="text-muted-foreground mt-1">
            Upload and manage learning documents
          </p>
        </div>

        {/* Filter + Upload area */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                handleUpload(e.dataTransfer.files)
              }}
              onClick={() => fileRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <input
                ref={fileRef}
                type="file"
                multiple
                accept=".pdf,.docx,.pptx,.txt,.md,.html"
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
              />
              {uploading ? (
                <div className="flex items-center justify-center gap-3 text-primary">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Uploading and processing…</span>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium text-sm">
                    Drop files here or click to upload
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, DOCX, PPTX, TXT, Markdown, HTML — max 50 MB each
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <label className="block text-sm font-medium mb-2">Filter by topic</label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">All topics</option>
              {topics.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-2">
              Select a topic before uploading to auto-assign
            </p>
          </div>
        </div>

        {/* Documents list */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold">{documents.length} Documents</h2>
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {documents.length === 0 && !loading ? (
            <div className="text-center py-12">
              <File className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                No documents yet. Upload your first file.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center px-6 py-4 gap-4 hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {statusIcon(doc.status)}
                  </div>

                  {/* Clickable area opens viewer */}
                  <button
                    onClick={() => setViewingId(doc.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className="text-sm font-medium truncate hover:text-primary transition-colors">
                      {doc.originalName}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        {formatBytes(doc.fileSize)}
                      </span>
                      {doc.topic && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {doc.topic.name}
                        </span>
                      )}
                      {doc._count?.chunks > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {doc._count.chunks} chunks
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(doc.createdAt)}
                      </span>
                    </div>
                  </button>

                  <span
                    className={cn(
                      'text-xs font-medium hidden sm:block flex-shrink-0',
                      doc.status === 'READY' ? 'text-green-600' :
                      doc.status === 'FAILED' ? 'text-red-600' : 'text-blue-600'
                    )}
                  >
                    {doc.status}
                  </span>

                  <button
                    onClick={() => deleteDocument(doc.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
