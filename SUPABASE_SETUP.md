# Supabase Setup Guide

This guide walks you through creating a Supabase project for LearnIQ.

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New project**
3. Choose your organization
4. Fill in:
   - **Name**: `learning-platform`
   - **Database Password**: save this — you'll need it
   - **Region**: choose closest to your users
5. Click **Create new project** and wait ~2 minutes

## 2. Enable the pgvector Extension

LearnIQ uses pgvector for semantic search over your documents.

1. In Supabase Dashboard, go to **Database → Extensions**
2. Search for **vector**
3. Click the toggle to enable it

Or run this SQL in **SQL Editor**:
```sql
create extension if not exists vector with schema public;
create extension if not exists "uuid-ossp" with schema public;
```

## 3. Get Your Connection Strings

1. Go to **Project Settings → Database → Connection string**
2. Select **URI** tab
3. Copy both:
   - **Connection pooling** (port 6543) → for `DATABASE_URL`
   - **Direct connection** (port 5432) → for `DIRECT_URL`

## 4. Configure Environment Variables

In your `.env.local`:

```env
# Supabase pooled connection (used by the app)
DATABASE_URL="postgresql://postgres.[your-project-ref]:[your-password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection (used for Prisma migrations)
DIRECT_URL="postgresql://postgres.[your-project-ref]:[your-password]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

## 5. Update prisma/schema.prisma

Add `directUrl` to use the direct connection for migrations:

```prisma
datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  directUrl  = env("DIRECT_URL")     // Add this line
  extensions = [pgvector(...), uuid_ossp(...)]
}
```

## 6. Run Migrations

```bash
npm run db:push      # Apply schema to Supabase
npm run db:seed      # Seed demo data
```

## 7. Verify in Supabase Dashboard

Go to **Table Editor** — you should see all tables:
- `organizations`, `users`, `topics`, `uploaded_documents`, `document_chunks`, etc.

## 8. Row Level Security (Optional — for production)

Supabase supports Row Level Security (RLS). For basic usage, it's already disabled.

For production multi-tenant isolation, you can add RLS policies per table:
```sql
-- Example: users can only see their own organization's data
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON topics
  FOR ALL USING (organization_id = current_setting('app.organization_id')::uuid);
```

## VS Code — Supabase Integration

The Supabase team does not currently publish an official VS Code extension to the VS Code Marketplace.

**Recommended alternatives:**
1. Use the [Supabase Dashboard](https://app.supabase.com) (web) for table browsing, SQL editor, logs
2. Use the **Prisma VS Code extension** (already installed) for schema editing
3. Use `npm run db:studio` to open Prisma Studio (local DB browser) — works with Supabase too

**Install Supabase CLI** (for local development / migrations):
```bash
# Windows (via Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Or via npm
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref
```

## Supabase CLI — Useful Commands

```bash
supabase status           # Show project status
supabase db diff          # Show schema diff vs remote
supabase db push          # Push local schema to remote
supabase db pull          # Pull remote schema
supabase gen types typescript --linked > src/types/supabase.ts
```
