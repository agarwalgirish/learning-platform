'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  Brain,
  LayoutDashboard,
  BookOpen,
  BarChart3,
  Users,
  Upload,
  FileText,
  Settings,
  LogOut,
  GraduationCap,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

const learnerNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Topics', href: '/topics', icon: BookOpen },
  { label: 'My Progress', href: '/progress', icon: TrendingUp },
]

const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Content', href: '/admin/content', icon: Upload },
  { label: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
]

interface SidebarProps {
  role: string
  userName: string | null
  userEmail: string
}

export function Sidebar({ role, userName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const isAdmin = role === 'ADMIN' || role === 'INSTRUCTOR'
  const nav = isAdmin ? adminNav : learnerNav

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="h-16 border-b border-border flex items-center px-6 gap-2 flex-shrink-0">
        <Brain className="h-6 w-6 text-primary" />
        <span className="font-bold text-lg">LearnIQ</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}

        {/* Admin can also switch to learner view */}
        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Learner View
              </p>
            </div>
            <Link
              href="/dashboard"
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <GraduationCap className="h-4 w-4" />
              My Learning
            </Link>
          </>
        )}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
            {(userName ?? userEmail)[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName ?? 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-full px-3 py-2 rounded-lg hover:bg-accent transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
