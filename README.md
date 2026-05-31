# LearnIQ — Enterprise Adaptive Learning Platform

An AI-powered learning platform that diagnoses learner knowledge, teaches adaptively from your uploaded documents using RAG, and tracks proficiency to certification.

## Features

- **RAG-powered AI Tutor** — answers only from your uploaded knowledge base, cites sources
- **Diagnostic Assessment** — auto-generates questions from documents to classify learner level
- **Adaptive Teaching** — adjusts difficulty based on quiz performance
- **Proficiency Engine** — tracks progress; marks learners proficient only after consistent performance
- **Admin Analytics** — dashboards, user management, content management, CSV exports
- **Multi-tenant** — full organization isolation
- **RBAC** — Admin / Instructor / Learner roles
- **Audit Logs** — every action logged
- **AI Provider Abstraction** — OpenAI, Anthropic (Claude), Azure OpenAI
- **Storage Abstraction** — local dev, S3, Azure Blob, GCS

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Auth | NextAuth.js v5 (Credentials + SSO-ready) |
| Database | PostgreSQL 16 + pgvector extension |
| ORM | Prisma |
| AI | OpenAI GPT-4o / Anthropic Claude (swappable) |
| Vector Search | pgvector cosine similarity |
| Storage | Local dev / S3 / Azure Blob (abstracted) |
| UI Components | Radix UI (shadcn/ui style) |

## Quick Start

### Option A — Supabase (Recommended for production)

1. Create a project at [supabase.com](https://supabase.com)
2. Enable the **pgvector** extension: Dashboard → Database → Extensions → search "vector" → enable
3. Copy your connection strings from: Settings → Database → Connection string → URI
4. Use `DATABASE_URL` for pooled connection and `DIRECT_URL` for migrations

### Option B — Local PostgreSQL with Docker

```bash
# Start PostgreSQL with pgvector
docker compose up -d

# DATABASE_URL=postgresql://postgres:password@localhost:5432/learning_platform
```

### Install & Configure

```bash
# 1. Install Node.js 18+ from https://nodejs.org

# 2. Clone and install
git clone https://github.com/agarwalgirish/learning-platform
cd learning-platform
npm install

# 3. Create .env.local (copy from .env.example)
cp .env.example .env.local
# Edit .env.local with your values

# 4. Run database migrations
npm run db:push

# 5. Seed demo data
npm run db:seed

# 6. Start dev server
npm run dev
```

Open http://localhost:3000

### Demo Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.com | Admin123! |
| Instructor | instructor@demo.com | Instructor123! |
| Learner | learner@demo.com | Learner123! |

## Environment Variables

See [.env.example](.env.example) for all configuration options.

### Required
```env
DATABASE_URL=             # PostgreSQL connection string
NEXTAUTH_SECRET=          # Random string (openssl rand -base64 32)
OPENAI_API_KEY=           # Or ANTHROPIC_API_KEY for Claude
```

### AI Provider

Set `AI_PROVIDER=openai` (default) or `AI_PROVIDER=anthropic`.

> **Note:** Embeddings always use OpenAI. If using Anthropic as the chat provider,
> you still need `OPENAI_API_KEY` for generating embeddings.

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, Register pages
│   ├── (learner)/       # Dashboard, Topics, Learn, Quiz, Progress
│   ├── (admin)/         # Admin Dashboard, Users, Content, Reports, Settings
│   └── api/             # All API routes
├── lib/
│   ├── ai/              # AI provider abstraction (OpenAI, Anthropic)
│   ├── vector/          # pgvector similarity search
│   ├── storage/         # File storage abstraction
│   ├── processor/       # Document text extraction (PDF, DOCX, PPTX, TXT)
│   ├── rag/             # Retrieval-Augmented Generation
│   └── learning/        # Assessment, quiz, proficiency scoring
├── components/
│   ├── shared/          # Sidebar, navigation
│   ├── learner/         # Learner-specific components
│   └── admin/           # Admin-specific components
└── types/               # TypeScript types
prisma/
├── schema.prisma        # Full database schema
└── seed.ts              # Demo data
```

## Database Schema (Key Models)

- `Organization` — multi-tenant root
- `User` — with roles (ADMIN, INSTRUCTOR, LEARNER)
- `Team` + `TeamMember` — department/team grouping
- `Topic` — learning topic (root of a knowledge domain)
- `UploadedDocument` + `DocumentChunk` — knowledge base with vector embeddings
- `Assessment` + `Question` + `AnswerOption` — quizzes and diagnostics
- `LearnerProgress` + `ConceptMastery` — proficiency tracking
- `QuizAttempt` + `QuizResponse` — attempt history
- `LearningPath` + `LearningPathStep` — curated courses
- `AIConfig` — per-org AI settings
- `AuditLog` — security audit trail

## Branching Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production — protected, requires PR + review |
| `develop` | Integration — all feature branches merge here |
| `feature/*` | New features (e.g. `feature/sso-integration`) |
| `fix/*` | Bug fixes (e.g. `fix/quiz-scoring`) |
| `release/*` | Release preparation (e.g. `release/1.1.0`) |
| `hotfix/*` | Emergency production fixes |

## How RAG Works

1. **Ingest**: Upload document → extract text → split into chunks → generate embeddings → store in pgvector
2. **Retrieve**: Learner message → embed query → cosine similarity search over chunks → top-K results
3. **Generate**: Inject retrieved chunks as context into AI prompt → response cites source documents
4. **Adapt**: Quiz results → update proficiency score → adjust difficulty of next questions

## Adding a New AI Provider

1. Create `src/lib/ai/my-provider.ts` implementing the `AIProvider` interface
2. Add a case in `src/lib/ai/index.ts` → `getAIProvider()`
3. Set `AI_PROVIDER=my-provider` in `.env.local`

## Deploying to Production

1. **Database**: Supabase (recommended) or managed PostgreSQL with pgvector
2. **App**: Vercel (`vercel deploy`) or any Node.js host
3. **Storage**: Set `STORAGE_PROVIDER=s3` and configure AWS credentials
4. **Secrets**: Set all env vars in your hosting platform's secret manager

## License

MIT
