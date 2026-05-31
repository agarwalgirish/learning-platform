import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { isInstructorOrAdmin } from '@/lib/permissions'
import type { UserRole } from '@/types'
import path from 'path'
import fs from 'fs/promises'

export async function GET(
  _req: NextRequest,
  { params }: { params: { filename: string } }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  if (!isInstructorOrAdmin(user.role as UserRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Prevent path traversal — only allow simple filenames
  const filename = path.basename(params.filename)

  // Find the document record to verify org ownership and get original name
  const doc = await db.uploadedDocument.findFirst({
    where: {
      fileName: filename,
      organizationId: user.organizationId,
    },
    select: { originalName: true, mimeType: true, storagePath: true },
  })

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const buffer = await fs.readFile(doc.storagePath)
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': doc.mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.originalName)}"`,
        'Content-Length': String(buffer.length),
      },
    })
  } catch {
    return NextResponse.json({ error: 'File not found on disk' }, { status: 404 })
  }
}
