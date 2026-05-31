'use client'

import { useState, useEffect } from 'react'
import { Save, Brain, Server, Shield, Loader2, CheckCircle2 } from 'lucide-react'

export default function SettingsPage() {
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState({
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 2000,
    useOnlyKB: true,
    systemPrompt: '',
  })

  function update(field: string, value: any) {
    setConfig((prev) => ({ ...prev, [field]: value }))
  }

  async function save() {
    setSaving(true)
    // POST to settings API (stub — extend as needed)
    await new Promise((r) => setTimeout(r, 800))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure AI, security, and platform settings</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* AI Provider */}
        <section className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">AI Configuration</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">AI Provider</label>
              <select
                value={config.provider}
                onChange={(e) => update('provider', e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="openai">OpenAI (GPT-4o)</option>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="azure">Azure OpenAI</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Model</label>
              <input
                type="text"
                value={config.model}
                onChange={(e) => update('model', e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="gpt-4o"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Temperature</label>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.1}
                  value={config.temperature}
                  onChange={(e) => update('temperature', parseFloat(e.target.value))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max tokens</label>
                <input
                  type="number"
                  min={500}
                  max={8000}
                  value={config.maxTokens}
                  onChange={(e) => update('maxTokens', parseInt(e.target.value))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Custom system prompt (optional)</label>
              <textarea
                value={config.systemPrompt}
                onChange={(e) => update('systemPrompt', e.target.value)}
                rows={3}
                placeholder="Override the default tutor persona..."
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>
          </div>
        </section>

        {/* Knowledge Base */}
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
              className="mt-0.5 text-primary"
            />
            <div>
              <p className="text-sm font-medium">Restrict AI to knowledge base only</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                When enabled, the AI tutor will only answer from your uploaded documents.
                Disable to allow general AI knowledge.
              </p>
            </div>
          </label>
        </section>

        {/* Save */}
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save settings'}
        </button>
      </div>
    </div>
  )
}
