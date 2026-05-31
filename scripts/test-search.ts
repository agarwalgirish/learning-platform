import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env') })
config({ path: resolve(process.cwd(), '.env.local'), override: true })

import { PrismaClient } from '@prisma/client'
import { OpenAIProvider } from '../src/lib/ai/openai-provider'

const db = new PrismaClient()
const ai = new OpenAIProvider()

const TOPIC_ID = '6e2e6221-7a9c-45fb-903f-1126072e690b'
const ORG_QUERY = `SELECT id FROM organizations LIMIT 1`

async function testQuery(label: string, query: string, threshold: number) {
  const embedding = await ai.embed(query)
  const vectorStr = `[${embedding.join(',')}]`

  const results = await db.$queryRawUnsafe<any[]>(`
    SELECT dc.id, dc."chunkIndex", LEFT(dc.content, 80) AS preview,
           ROUND((1 - (dc."embeddingVector" <=> '${vectorStr}'::vector))::numeric, 3) AS score
    FROM document_chunks dc
    JOIN uploaded_documents ud ON dc."documentId" = ud.id
    WHERE ud."topicId" = '${TOPIC_ID}'::uuid
      AND dc."embeddingVector" IS NOT NULL
    ORDER BY score DESC
    LIMIT 5
  `)

  const above = results.filter((r: any) => r.score >= threshold)
  console.log(`\n"${label}" (threshold ${threshold}): ${above.length}/${results.length} match`)
  results.forEach((r: any) => {
    const ok = r.score >= threshold ? '✅' : '❌'
    console.log(`  ${ok} ${r.score} — ${r.preview}`)
  })
}

async function main() {
  console.log('\n=== Search Threshold Test ===\n')

  await testQuery('Introduce Vaisala Security topic (intro prompt)',
    "Introduce the topic Vaisala Information Security Management to a BEGINNER level learner. Give a structured overview and key concepts.",
    0.65)

  await testQuery('Topic name only',
    'Vaisala Information Security Management',
    0.5)

  await testQuery('Simple keyword',
    'information security policy classification',
    0.5)

  await db.$disconnect()
}

main().catch(console.error)
