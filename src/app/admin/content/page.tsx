'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, File, Trash2, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { formatBytes, formatDate } from '@/lib/utils'

export default function ContentPage() {
  const [documents, setDocuments] = useState<any[]>([])
  const [topics, setTopics] = useState<any[]>([])
  const [selectedTopic, setSelectedTopic] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([fetchDocuments(), fetchTopics()])
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
    // Poll for status updates
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
      case 'READY': return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'PROCESSING': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'PENDING': return <Clock className="h-4 w-4 text-yellow-500" />
      case 'FAILED': return <AlertCircle className="h-4 w-4 text-red-500" />
      default: return null
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Knowledge Base</h1>
        <p className="text-muted-foreground mt-1">Upload and manage learning documents</p>
      </div>

      {/* Filter + Upload area */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files) }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
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
                <span>Uploading and processing...</span>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium text-sm">Drop files here or click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, DOCX, PPTX, TXT, Markdown, HTML — max 50MB each
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
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        {documents.length === 0 && !loading ? (
          <div className="text-center py-12">
            <File className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No documents yet. Upload your first file.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center px-6 py-4 gap-4">
                <div className="flex items-center gap-2 flex-shrink-0">
                  {statusIcon(doc.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.originalName}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground">{formatBytes(doc.fileSize)}</span>
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
                    <span className="text-xs text-muted-foreground">{formatDate(doc.createdAt)}</span>
                  </div>
                </div>
                <span className={`text-xs font-medium hidden sm:block ${
                  doc.status === 'READY' ? 'text-green-600' :
                  doc.status === 'FAILED' ? 'text-red-600' :
                  'text-blue-600'
                }`}>
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
  )
}
