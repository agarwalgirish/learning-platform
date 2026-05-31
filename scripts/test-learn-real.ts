import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env') })
config({ path: resolve(process.cwd(), '.env.local'), override: true })

import { PrismaClient } from '@prisma/client'
import { generateTutorResponse } from '../src/lib/rag/index'

const db = new PrismaClient()

async function main() {
  const org = await db.organization.findFirst()
  if (!org) { console.log('No org found'); return }
  console.log('Org:', org.name, org.id)

  const result = await generateTutorResponse(
    [{ role: 'user', content: 'Please introduce the Information Classification Procedure. What are the classification levels and how do they work?', timestamp: new Date().toISOString() }],
    {
      topicId: '6e2e6221-7a9c-45fb-903f-1126072e690b',
      topicName: 'Vaisala Information Security Management',
      organizationId: org.id,
      proficiencyLevel: 'BEGINNER',
      query: 'Information Classification Procedure classification levels',
    }
  )
  console.log('\n✅ Sources found:', result.sources.length)
  result.sources.forEach(s => console.log(' -', s.documentName, 'score:', s.score.toFixed(3)))
  console.log('\nContent preview (first 400 chars):')
  console.log(result.content.slice(0, 400))
  await db.$disconnect()
}

main().catch(console.error)
