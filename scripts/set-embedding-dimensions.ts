/**
 * Sets the vector dimension in prisma/schema.prisma to match your embedding model.
 *
 * Usage:
 *   npx tsx scripts/set-embedding-dimensions.ts 768   # nomic-embed-text
 *   npx tsx scripts/set-embedding-dimensions.ts 1024  # mxbai-embed-large
 *   npx tsx scripts/set-embedding-dimensions.ts 1536  # OpenAI text-embedding-3-small (default)
 *
 * After running, you MUST run: npm run db:push
 * WARNING: this drops existing embeddings — re-upload or re-embed documents afterwards.
 */

import fs from 'fs'
import path from 'path'

const dim = parseInt(process.argv[2] ?? '')
if (!dim || dim < 64 || dim > 4096) {
  console.error('Usage: npx tsx scripts/set-embedding-dimensions.ts <dimensions>')
  console.error('Example: npx tsx scripts/set-embedding-dimensions.ts 768')
  process.exit(1)
}

const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')
const schema = fs.readFileSync(schemaPath, 'utf-8')

const updated = schema.replace(/vector\(\d+\)/g, `vector(${dim})`)

if (updated === schema) {
  console.log('No vector() dimensions found in schema — nothing changed.')
  process.exit(0)
}

fs.writeFileSync(schemaPath, updated)
console.log(`✅ Updated schema: vector dimension → ${dim}`)
console.log(`   Also set EMBEDDING_DIMENSIONS=${dim} in your .env.local`)
console.log(`   Then run: npm run db:push`)
