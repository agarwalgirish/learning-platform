import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env') })
config({ path: resolve(process.cwd(), '.env.local'), override: true })

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const [orgs, users, topics, docs, chunks, progress] = await Promise.all([
    db.organization.count(),
    db.user.count(),
    db.topic.count(),
    db.uploadedDocument.count(),
    db.documentChunk.count(),
    db.learnerProgress.count(),
  ])
  console.log('✅ Supabase database verified:')
  console.log(`   Organizations: ${orgs}`)
  console.log(`   Users:         ${users}`)
  console.log(`   Topics:        ${topics}`)
  console.log(`   Documents:     ${docs}`)
  console.log(`   Chunks:        ${chunks}`)
  console.log(`   Progress rows: ${progress}`)
  await db.$disconnect()
}

main().catch(console.error)
