'use client'

import { useState } from 'react'
import { Activity, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ActivityEntry {
  id: string
  action: string
  userName: string | null
  userEmail: string | null
  createdAt: string // ISO string — serialisable from server component
}

interface DayGroup {
  label: string
  key: string
  entries: ActivityEntry[]
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function formatAction(action: string): string {
  const map: Record<string, string> = {
    'user.login': 'signed in',
    'document.upload': 'uploaded a document',
    'assessment.complete': 'completed an assessment',
    'quiz.complete': 'completed a quiz',
  }
  return map[action] ?? action
}

function buildGroups(entries: ActivityEntry[]): DayGroup[] {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const fmtDay = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const dayLabel = (iso: string) => {
    const d = new Date(iso)
    if (fmtDay(d) === fmtDay(today)) return 'Today'
    if (fmtDay(d) === fmtDay(yesterday)) return 'Yesterday'
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const groups: Map<string, DayGroup> = new Map()
  for (const entry of entries) {
    const key = new Date(entry.createdAt).toLocaleDateString('en-GB')
    if (!groups.has(key)) {
      groups.set(key, { label: dayLabel(entry.createdAt), key, entries: [] })
    }
    groups.get(key)!.entries.push(entry)
  }
  return Array.from(groups.values())
}

export function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  const groups = buildGroups(entries)

  // Today is expanded by default; older days start collapsed
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(groups.slice(1).map((g) => g.key)) // collapse everything except today
  )

  function toggle(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-6">No activity yet</p>
    )
  }

  return (
    /* Fixed-height scrollable container — won't push the rest of the page */
    <div className="overflow-y-auto max-h-72 space-y-1 pr-1">
      {groups.map((group) => {
        const isCollapsed = collapsed.has(group.key)
        return (
          <div key={group.key}>
            {/* Collapsible day header */}
            <button
              onClick={() => toggle(group.key)}
              className="w-full flex items-center gap-2 py-1.5 group"
            >
              {isCollapsed
                ? <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                : <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              }
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {group.label}
              </span>
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground ml-1">
                {group.entries.length}
              </span>
            </button>

            {/* Events — hidden when collapsed */}
            {!isCollapsed && (
              <div className="space-y-1.5 mb-2 ml-1">
                {group.entries.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <p className="flex-1 text-sm leading-snug min-w-0">
                      <span className="font-medium">
                        {entry.userName ?? entry.userEmail ?? 'System'}
                      </span>{' '}
                      <span className="text-muted-foreground">
                        {formatAction(entry.action)}
                      </span>
                    </p>
                    <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0 mt-0.5">
                      {formatTime(entry.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
