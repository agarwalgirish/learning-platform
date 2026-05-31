import type { TextChunk } from './chunker'
import { chunkText } from './chunker'

export interface PptxResult {
  text: string
  metadata: Record<string, unknown>
  chunks: TextChunk[]
}

export async function extractPPTX(buffer: Buffer): Promise<PptxResult> {
  // officeparser uses callbacks; wrap in a Promise
  const officeParser = await import('officeparser')
  const text = await new Promise<string>((resolve, reject) => {
    officeParser.parseOfficeAsync(buffer, (data: string, err: Error) => {
      if (err) reject(err)
      else resolve(data ?? '')
    })
  })

  const cleaned = text.replace(/\s{3,}/g, '\n\n').trim()

  return {
    text: cleaned,
    metadata: {},
    chunks: chunkText(cleaned),
  }
}
