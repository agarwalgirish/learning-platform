import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/shared/sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const user = session.user as any
  if (user.role === 'LEARNER') redirect('/dashboard')
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar role={user.role} userName={user.name} userEmail={user.email ?? ''} />
      <main className="flex-1 overflow-y-auto"><div className="p-8">{children}</div></main>
    </div>
  )
}
