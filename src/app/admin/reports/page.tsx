'use client'

import { useState, useEffect } from 'react'
import { Download, BarChart3, TrendingUp, Users } from 'lucide-react'
import { formatDate, getProficiencyColor } from '@/lib/utils'

export default function ReportsPage() {
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/analytics').then((r) => r.json()),
      fetch('/api/admin/users?limit=50').then((r) => r.json()),
    ]).then(([analyticsData, usersData]) => {
      setStats(analyticsData.stats)
      setUsers(usersData.users ?? [])
      setLoading(false)
    })
  }, [])

  function exportCSV() {
    const headers = ['Name', 'Email', 'Role', 'Topics Enrolled', 'Last Login']
    const rows = users.map((u) => [
      u.name ?? '',
      u.email,
      u.role,
      u._count?.enrollments ?? 0,
      u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Never',
    ])
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `learniq-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        Loading reports...
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground mt-1">Organization learning analytics</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 border border-border px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent transition-colors"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* KPI summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KPICard label="Total Users" value={String(stats.totalUsers)} />
          <KPICard label="Enrollments" value={String(stats.totalEnrollments)} />
          <KPICard label="Proficiency Rate" value={`${stats.proficiencyRate}%`} />
          <KPICard label="Avg Quiz Score" value={`${stats.avgQuizScore}%`} />
        </div>
      )}

      {/* User progress table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">User Progress Report</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Enrolled Topics</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden lg:table-cell">Last Login</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-accent/30">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{u.name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs border border-border px-2 py-0.5 rounded">{u.role}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm">{u._count?.enrollments ?? 0}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Never'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function KPICard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 text-center">
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  )
}
