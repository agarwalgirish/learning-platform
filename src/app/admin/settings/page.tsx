'use client'

import { useState, useEffect } from 'react'
import { Save, Brain, Shield, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type Provider = 'openai' | 'anthropic' | 'ollama' | 'azure'

interface AIConfig {
  provider: Provider
  model: string
  embeddingModel: string
  temperature: number
  maxTokens: number
  useOnlyKB: boolean
  systemPrompt: string
}

const PROVIDER_DEFAULTS: Record<Provider, Pick<AIConfig, 'model' | 'embeddingModel'>> = {
  openai:    { model: 'gpt-4o',                          embeddingModel: 'text-embedding-3-small' },
  anthropic: { model: 'claude-3-5-sonnet-20241022',      embeddingModel: 'text-embedding-3-small' },
  ollama:    { model: 'phi4-mini',                       embeddingModel: 'nomic-embed-text' },
  azure:     { model: 'gpt-4o',                          embeddingModel: 'text-embedding-3-small' },
}

const PROVIDER_LABELS: Record<Provider, string> = {
  openai:    'OpenAI (GPT-4o)',
  anthropic: 'Anthropic (Claude)',
  ollama:    'Ollama — local SLM',
  azure:     'Azure OpenAI',
}

const OLLAMA_MODELS = ['phi4-mini', 'mistral', 'llama3.2', 'gemma3:4b', 'llama3.2:1b', 'qwen2.5:7b']
const OPENAI_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']
const ANTHROPIC_MODELS = ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229']

export default function SettingsPage() {
  const [config, setConfig] = useState<AIConfig>({
    provider: 'openai',
    model: 'gpt-4o',
    embeddingModel: 'text-embedding-3-small',
    temperature: 0.7,
    maxTokens: 2000,
    useOnlyKB: true,
    systemPrompt: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then(({ config: saved }) => {
        if (saved) setConfig({ ...config, ...saved, systemPrompt: saved.systemPrompt ?? '' })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function update<K extends keyof AIConfig>(key: K, value: AIConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  function handleProviderChange(provider: Provider) {
    const defaults = PROVIDER_DEFAULTS[provider]
    setConfig((prev) => ({ ...prev, provider, ...defaults }))
  }

  async function save() {
    setSaving(true)
    setStatus('idle')
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      setStatus(res.ok ? 'saved' : 'error')
    } catch {
      setStatus('error')
    } finally {
      setSaving(false)
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure AI provider, model, and knowledge base policy
        </p>
      </div>

      <div className="max-w-2xl space-y-6">

        {/* Provider selection */}
        <section className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Brain className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">AI Provider</h2>
          </div>

          {/* Provider cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {(Object.keys(PROVIDER_LABELS) as Provider[]).map((p) => (
              <button
                key={p}
                onClick={() => handleProviderChange(p)}
                className={cn(
                  'rounded-xl border-2 px-4 py-3 text-left transition-colors',
                  config.provider === p
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                )}
              >
                <p className="text-sm font-medium">{PROVIDER_LABELS[p]}</p>
                {p === 'ollama' && (
                  <p className="text-xs text-muted-foreground mt-0.5">Free · runs locally</p>
                )}
                {p === 'openai' && (
                  <p className="text-xs text-muted-foreground mt-0.5">Cloud · pay per use</p>
                )}
                {p === 'anthropic' && (
                  <p className="text-xs text-muted-foreground mt-0.5">Cloud · pay per use</p>
                )}
                {p === 'azure' && (
                  <p className="text-xs text-muted-foreground mt-0.5">Enterprise · Azure-hosted</p>
                )}
              </button>
            ))}
          </div>

          {/* Ollama notice */}
          {config.provider === 'ollama' && (
            <div className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <p className="font-medium mb-1">Ollama must be running locally</p>
              <p className="text-xs text-blue-700">
                Install from <span className="font-mono">ollama.com</span>, then run:{' '}
                <span className="font-mono">ollama pull {config.model}</span>
              </p>
            </div>
          )}

          {/* Model selector */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Model</label>
              {config.provider === 'ollama' ? (
                <div className="flex gap-2">
                  <select
                    value={OLLAMA_MODELS.includes(config.model) ? config.model : '__custom__'}
                    onChange={(e) => {
                      if (e.target.value !== '__custom__') update('model', e.target.value)
                    }}
                    className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {OLLAMA_MODELS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                    {!OLLAMA_MODELS.includes(config.model) && (
                      <option value="__custom__">{config.model} (custom)</option>
                    )}
                  </select>
                  <input
                    value={config.model}
                    onChange={(e) => update('model', e.target.value)}
                    placeholder="or type a model name"
                    className="w-40 border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              ) : config.provider === 'openai' ? (
                <select
                  value={config.model}
                  onChange={(e) => update('model', e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {OPENAI_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              ) : config.provider === 'anthropic' ? (
                <select
                  value={config.model}
                  onChange={(e) => update('model', e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {ANTHROPIC_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              ) : (
                <input
                  value={config.model}
                  onChange={(e) => update('model', e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Temperature</label>
                <input
                  type="number" min={0} max={2} step={0.1}
                  value={config.temperature}
                  onChange={(e) => update('temperature', parseFloat(e.target.value))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <p className="text-xs text-muted-foreground mt-1">0 = focused · 1 = balanced · 2 = creative</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max tokens</label>
                <input
                  type="number" min={200} max={32000} step={100}
                  value={config.maxTokens}
                  onChange={(e) => update('maxTokens', parseInt(e.target.value))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Custom system prompt
                <span className="text-muted-foreground font-normal ml-1">(optional)</span>
              </label>
              <textarea
                value={config.systemPrompt}
                onChange={(e) => update('systemPrompt', e.target.value)}
                rows={3}
                placeholder="Override the default tutor persona…"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>
          </div>
        </section>

        {/* Knowledge base policy */}
        <section className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Knowledge Base Policy</h2>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.useOnlyKB}
              onChange={(e) => update('useOnlyKB', e.target.checked)}
              className="mt-0.5"
            />
            <div>
              <p className="text-sm font-medium">Restrict AI to knowledge base only</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                When enabled, the tutor only answers from your uploaded documents.
                When disabled, it can also use the model&apos;s general knowledge.
              </p>
            </div>
          </label>
        </section>

        {/* Save button */}
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : status === 'saved' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : status === 'error' ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? 'Saving…' : status === 'saved' ? 'Saved!' : status === 'error' ? 'Error — try again' : 'Save settings'}
        </button>

        {config.provider === 'ollama' && (
          <p className="text-xs text-muted-foreground">
            Ollama note: if you change the embedding model, run{' '}
            <span className="font-mono bg-muted px-1 rounded">npm run embed:set-dim &lt;dim&gt;</span>{' '}
            then <span className="font-mono bg-muted px-1 rounded">npm run db:push</span> to update the vector dimension.
          </p>
        )}
      </div>
    </div>
  )
}
