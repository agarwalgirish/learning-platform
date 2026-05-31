import Link from 'next/link'
import { BookOpen, Brain, BarChart3, Shield, Zap, Users } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-7 w-7 text-blue-400" />
            <span className="text-xl font-bold">LearnIQ</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-slate-300 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-sm text-blue-300 mb-8">
          <Zap className="h-3.5 w-3.5" />
          RAG-powered AI tutor • Adaptive assessments • Enterprise-ready
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold leading-tight mb-6">
          Turn your knowledge base
          <br />
          <span className="text-blue-400">into a learning engine</span>
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10">
          Upload PDFs, Word docs, and presentations. LearnIQ diagnoses each learner's current
          level, teaches adaptively from your content, and tracks proficiency to certification.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/register"
            className="bg-blue-600 hover:bg-blue-500 px-8 py-3.5 rounded-xl font-semibold text-lg transition-colors"
          >
            Start for free
          </Link>
          <Link
            href="/login"
            className="border border-white/20 hover:border-white/40 px-8 py-3.5 rounded-xl font-semibold text-lg transition-colors"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-14">
          Everything you need for enterprise learning
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-colors"
            >
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-20 py-8 text-center text-slate-500 text-sm">
        LearnIQ — Enterprise Adaptive Learning Platform
      </footer>
    </div>
  )
}

const features = [
  {
    icon: BookOpen,
    title: 'Knowledge Ingestion',
    description:
      'Upload PDFs, DOCX, PPTX, TXT, Markdown, and HTML. Content is automatically chunked, embedded, and indexed for semantic retrieval.',
  },
  {
    icon: Brain,
    title: 'Adaptive AI Tutor',
    description:
      'The AI tutor teaches from your documents only. It adapts explanations to the learner\'s level and cites every source it uses.',
  },
  {
    icon: Zap,
    title: 'Diagnostic Assessment',
    description:
      'Every learner is assessed before they start. Questions are generated from your content to classify beginner, intermediate, or advanced.',
  },
  {
    icon: BarChart3,
    title: 'Admin Analytics',
    description:
      'Track individual and team progress, quiz scores, proficiency rates, time spent, and weak areas across your entire organization.',
  },
  {
    icon: Users,
    title: 'Teams & Roles',
    description:
      'Admins, instructors, and learners each have role-appropriate access. Assign learning paths to users or whole teams.',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description:
      'Multi-tenant data isolation, RBAC, audit logs, SSO-ready architecture, and configurable AI provider settings.',
  },
]
