'use client'

import { useState, useEffect } from 'react'
import {
  Plus, Pencil, Trash2, BookOpen, Loader2, Check,
  X, Globe, EyeOff, ChevronDown,
} from 'lucide-react'
import { cn, getDifficultyColor, slugify } from '@/lib/utils'

type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'

interface Topic {
  id: string
  name: string
  slug: string
  description: string | null
  category: string | null
  difficulty: Difficulty
  estimatedHours: number | null
  isPublished: boolean
  _count: { documents: number; enrollments: number; courses: number }
}

const DIFFICULTIES: Difficulty[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']

const EMPTY_FORM = {
  name: '',
  description: '',
  category: '',
  difficulty: 'BEGINNER' as Difficulty,
  estimatedHours: '',
  isPublished: false,
}

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchTopics() }, [])

  async function fetchTopics() {
    setLoading(true)
    const res = await fetch('/api/topics')
    const data = await res.json()
    setTopics(data.topics ?? [])
    setLoading(false)
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setError('')
    setShowForm(true)
  }

  function openEdit(topic: Topic) {
    setForm({
      name: topic.name,
      description: topic.description ?? '',
      category: topic.category ?? '',
      difficulty: topic.difficulty,
      estimatedHours: topic.estimatedHours ? String(topic.estimatedHours) : '',
      isPublished: topic.isPublished,
    })
    setEditingId(topic.id)
    setError('')
    setShowForm(true)
  }

  function cancel() {
    setShowForm(false)
    setEditingId(null)
    setError('')
  }

  function update(field: string, value: any) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  async function save() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')

    const payload = {
      name: form.name.trim(),
      description: form.description || undefined,
      category: form.category || undefined,
      difficulty: form.difficulty,
      estimatedHours: form.estimatedHours ? parseFloat(form.estimatedHours) : undefined,
      isPublished: form.isPublished,
    }

    const res = await fetch(
      editingId ? `/api/topics/${editingId}` : '/api/topics',
      {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )
    const data = await res.json()
    setSaving(false)

    if (!res.ok) { setError(data.error || 'Save failed'); return }
    setShowForm(false)
    setEditingId(null)
    fetchTopics()
  }

  async function deleteTopic(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This will also remove all enrollments and progress data.`)) return
    await fetch(`/api/topics/${id}`, { method: 'DELETE' })
    fetchTopics()
  }

  async function togglePublish(topic: Topic) {
    await fetch(`/api/topics/${topic.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: !topic.isPublished }),
    })
    fetchTopics()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Topics</h1>
          <p className="text-muted-foreground mt-1">
            Topics group your courses and documents. Learners enroll in topics.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> New Topic
        </button>
      </div>

      {/* Inline create / edit form */}
      {showForm && (
        <div className="bg-card border border-primary/30 rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="font-semibold mb-4">
            {editingId ? 'Edit Topic' : 'New Topic'}
          </h2>

          {error && (
            <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">
                Topic name <span className="text-red-500">*</span>
              </label>
              <input
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="e.g. Enterprise Security Fundamentals"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {form.name && (
                <p className="text-xs text-muted-foreground mt-1">
                  Slug: <span className="font-mono">{slugify(form.name)}</span>
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                rows={2}
                placeholder="What will learners know after completing this topic?"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <input
                value={form.category}
                onChange={(e) => update('category', e.target.value)}
                placeholder="e.g. Security, Data Science, Compliance"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Difficulty</label>
              <select
                value={form.difficulty}
                onChange={(e) => update('difficulty', e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Estimated hours
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={form.estimatedHours}
                onChange={(e) => update('estimatedHours', e.target.value)}
                placeholder="e.g. 8"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="isPublished"
                checked={form.isPublished}
                onChange={(e) => update('isPublished', e.target.checked)}
                className="text-primary"
              />
              <label htmlFor="isPublished" className="text-sm cursor-pointer">
                Publish immediately (visible to learners)
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {saving
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                : <><Check className="h-4 w-4" /> {editingId ? 'Save changes' : 'Create topic'}</>
              }
            </button>
            <button
              onClick={cancel}
              className="flex items-center gap-2 border border-border px-5 py-2 rounded-lg text-sm hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Topics list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : topics.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-xl p-14 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">No topics yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Topics are the top-level learning areas. Create one to start adding courses and documents.
          </p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Create first topic
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Topic</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Difficulty</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase hidden lg:table-cell">Category</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Content</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {topics.map((topic) => (
                <tr key={topic.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-medium text-sm">{topic.name}</p>
                    {topic.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-xs">
                        {topic.description}
                      </p>
                    )}
                    {topic.estimatedHours && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {topic.estimatedHours}h
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', getDifficultyColor(topic.difficulty))}>
                      {topic.difficulty}
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    <span className="text-sm text-muted-foreground">{topic.category ?? '—'}</span>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell">
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>{topic._count.documents} docs</p>
                      <p>{topic._count.enrollments} enrolled</p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => togglePublish(topic)}
                      className={cn(
                        'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium border transition-colors',
                        topic.isPublished
                          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                          : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
                      )}
                    >
                      {topic.isPublished
                        ? <><Globe className="h-3 w-3" /> Published</>
                        : <><EyeOff className="h-3 w-3" /> Draft</>
                      }
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(topic)}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteTopic(topic.id, topic.name)}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-accent rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
