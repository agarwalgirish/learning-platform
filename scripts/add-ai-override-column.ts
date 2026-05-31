import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env') })
config({ path: resolve(process.cwd(), '.env.local'), override: true })

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  try {
    await db.$executeRawUnsafe(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS "aiOverride" JSONB`
    )
    console.log('✅ aiOverride column added to users table')
  } catch (err: any) {
    console.log('Column may already exist or error:', err.message)
  } finally {
    await db.$disconnect()
  }
}

main()
