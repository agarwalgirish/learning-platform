import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env') })
config({ path: resolve(process.cwd(), '.env.local'), override: true })

import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function main() {
  console.log('\n=== Embedding Diagnostics ===\n')

  // 1. Check if embeddingVector column exists
  try {
    const colCheck = await db.$queryRawUnsafe<any[]>(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'document_chunks'
      AND column_name = 'embeddingVector'
    `)
    if (colCheck.length > 0) {
      console.log('✅ embeddingVector column EXISTS:', colCheck[0])
    } else {
      console.log('❌ embeddingVector column MISSING from document_chunks!')
      console.log('   → Run: npm run db:push   to add it')
    }
  } catch (e: any) { console.log('Column check failed:', e.message) }

  // 2. Count documents and chunks
  const docs = await db.uploadedDocument.findMany({
    select: { id: true, originalName: true, status: true, topicId: true, organizationId: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })
  console.log(`\n📄 Recent documents (${docs.length}):`)
  docs.forEach(d => console.log(`  [${d.status}] ${d.originalName} — topicId: ${d.topicId ?? 'NULL'}`))

  // 3. Count chunks with/without embeddings
  try {
    const stats = await db.$queryRawUnsafe<any[]>(`
      SELECT
        COUNT(*) AS total_chunks,
        COUNT("embeddingVector") AS has_embedding,
        COUNT(*) - COUNT("embeddingVector") AS missing_embedding
      FROM document_chunks
    `)
    console.log('\n📊 Chunk embedding stats:', stats[0])
  } catch (e: any) { console.log('Stats failed (column may not exist):', e.message) }

  // 4. Check if pgvector extension is enabled
  try {
    const ext = await db.$queryRawUnsafe<any[]>(
      `SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'`
    )
    if (ext.length > 0) {
      console.log('\n✅ pgvector extension enabled:', ext[0])
    } else {
      console.log('\n❌ pgvector extension NOT enabled!')
      console.log('   → In Supabase: Database → Extensions → enable "vector"')
    }
  } catch (e: any) { console.log('Extension check failed:', e.message) }

  await db.$disconnect()
}

main().catch(console.error)
