import type { Metadata } from 'next'
import { Nunito } from 'next/font/google'
import './globals.css'

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-nunito',
})

export const metadata: Metadata = {
  title: {
    default: 'LearnIQ — Enterprise Learning Platform',
    template: '%s | LearnIQ',
  },
  description:
    'AI-powered adaptive learning platform. Diagnose, teach, test, and certify proficiency using your own knowledge base.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={nunito.variable}>
      <body className={nunito.className}>{children}</body>
    </html>
  )
}
