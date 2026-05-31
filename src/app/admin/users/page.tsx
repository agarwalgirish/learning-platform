'use client'

import { useState, useEffect } from 'react'
import { Search, UserCheck, UserX, Brain, X } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'

type Provider = 'openai' | 'anthropic' | 'ollama' | 'azure'

const PROVIDER_LABELS: Record<Provider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  ollama: 'Ollama (local)',
  azure: 'Azure OpenAI',
}

const PROVIDER_MODELS: Record<Provider, string[]> = {
  openai:    ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
  ollama:    ['phi4-mini', 'mistral', 'llama3.2', 'gemma3:4b'],
  azure:     ['gpt-4o', 'gpt-4-turbo'],
}

function AIOverrideModal({
  user,
  orgProviderLabel,
  onClose,
  onSaved,
}: {
  user: any
  orgProviderLabel: string
  onClose: () => void
  onSaved: () => void
}) {
  const [current, setCurrent] = useState<{ provider: Provider; model: string } | null>(null)
  const [provider, setProvider] = useState<Provider | ''>('')
  const [model, setModel] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/user/ai-settings?userId=${user.id}`)
      .then((r) => r.json())
      .then(({ aiOverride }) => {
        if (aiOverride?.provider) {
          setCurrent({ provider: aiOverride.provider, model: aiOverride.model ?? '' })
          setProvider(aiOverride.provider)
          setModel(aiOverride.model ?? '')
        }
      })
  }, [user.id])

  async function save() {
    setSaving(true)
    await fetch(`/api/user/ai-settings?userId=${user.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(provider ? { provider, model } : { provider: null }),
    })
    setSaving(false)
    onSaved()
    onClose()
  }

  async function clear() {
    setSaving(true)
    await fetch(`/api/user/ai-settings?userId=${user.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: null }),
    })
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-background rounded-2xl border border-border shadow-2xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold">AI Override — {user.name ?? user.email}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Org default: <span className="font-medium">{orgProviderLabel}</span>
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-accent rounded-lg">
              <X className="h-4 w-4" />
            </button>
          </div>

          {current && (
            <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
              <p className="font-medium text-primary">Current override</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                {PROVIDER_LABELS[current.provider]} · {current.model || 'default model'}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Provider override</label>
              <select
                value={provider}
                onChange={(e) => {
                  const p = e.target.value as Provider | ''
                  setProvider(p)
                  if (p) setModel(PROVIDER_MODELS[p][0])
                }}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">— Use org default ({orgProviderLabel}) —</option>
                {(Object.keys(PROVIDER_LABELS) as Provider[]).map((p) => (
                  <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
                ))}
              </select>
            </div>

            {provider && (
              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {PROVIDER_MODELS[provider].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            {current && (
              <button
                onClick={clear}
                disabled={saving}
                className="flex-1 border border-border py-2 rounded-lg text-sm hover:bg-accent transition-colors disabled:opacity-50"
              >
                Clear override
              </button>
            )}
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [orgProvider, setOrgProvider] = useState<string>('openai')
  const [overrideTarget, setOverrideTarget] = useState<any | null>(null)

  useEffect(() => {
    // Get org-level default provider for display
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then(({ config }) => { if (config?.provider) setOrgProvider(config.provider) })
  }, [])

  useEffect(() => {
    const t = setTimeout(fetchUsers, 300)
    return () => clearTimeout(t)
  }, [search, role])

  async function fetchUsers() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (role) params.set('role', role)
    const res = await fetch(`/api/admin/users?${params}`)
    const data = await res.json()
    setUsers(data.users ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }

  async function toggleActive(userId: string, isActive: boolean) {
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, isActive: !isActive }),
    })
    fetchUsers()
  }

  async function changeRole(userId: string, newRole: string) {
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role: newRole }),
    })
    fetchUsers()
  }

  const orgLabel = PROVIDER_LABELS[orgProvider as Provider] ?? orgProvider

  return (
    <>
      {overrideTarget && (
        <AIOverrideModal
          user={overrideTarget}
          orgProviderLabel={orgLabel}
          onClose={() => setOverrideTarget(null)}
          onSaved={fetchUsers}
        />
      )}

      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground mt-1">{total} users · org AI default: <span className="font-medium">{orgLabel}</span></p>
        </div>

        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users…"
              className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-card"
            />
          </div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">All roles</option>
            <option value="ADMIN">Admin</option>
            <option value="INSTRUCTOR">Instructor</option>
            <option value="LEARNER">Learner</option>
          </select>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">AI</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden lg:table-cell">Last Login</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-10 text-muted-foreground text-sm">Loading…</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-muted-foreground text-sm">No users found</td></tr>
                ) : users.map((u) => {
                  const override = u.aiOverride as { provider?: string; model?: string } | null
                  return (
                    <tr key={u.id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                            {(u.name ?? u.email)[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{u.name ?? '—'}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          onChange={(e) => changeRole(u.id, e.target.value)}
                          className="text-xs border border-border rounded px-2 py-1 bg-card"
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="INSTRUCTOR">Instructor</option>
                          <option value="LEARNER">Learner</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <button
                          onClick={() => setOverrideTarget(u)}
                          className={cn(
                            'flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-colors',
                            override?.provider
                              ? 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'
                              : 'border-border text-muted-foreground hover:bg-accent'
                          )}
                        >
                          <Brain className="h-3 w-3" />
                          {override?.provider
                            ? `${PROVIDER_LABELS[override.provider as Provider] ?? override.provider}`
                            : 'Org default'}
                        </button>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">{formatDate(u.lastLoginAt)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                          u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        )}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(u.id, u.isActive)}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          {u.isActive
                            ? <><UserX className="h-3 w-3" /> Deactivate</>
                            : <><UserCheck className="h-3 w-3" /> Activate</>
                          }
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
