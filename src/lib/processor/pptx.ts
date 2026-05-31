import type { TextChunk } from './chunker'
import { chunkText } from './chunker'

export interface PptxResult {
  text: string
  metadata: Record<string, unknown>
  chunks: TextChunk[]
}

export async function extractPPTX(buffer: Buffer): Promise<PptxResult> {
  const officeParser = await import('officeparser')

  // officeparser v4+ returns a Promise<string> directly
  const text = (await officeParser.parseOfficeAsync(buffer)) as string

  const cleaned = (text ?? '').replace(/\s{3,}/g, '\n\n').trim()

  return {
    text: cleaned,
    metadata: {},
    chunks: chunkText(cleaned),
  }
}
