import { extractPDF } from './pdf'
import { extractDOCX } from './docx'
import { extractPPTX } from './pptx'

export { chunkText } from './chunker'
export type { TextChunk } from './chunker'

export interface ExtractionResult {
  text: string
  pageCount?: number
  metadata: Record<string, unknown>
  chunks: import('./chunker').TextChunk[]
}

export async function extractDocument(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractionResult> {
  switch (mimeType) {
    case 'application/pdf':
      return extractPDF(buffer)

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return extractDOCX(buffer)

    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return extractPPTX(buffer)

    case 'text/plain':
    case 'text/markdown':
    case 'text/html': {
      const { chunkText } = await import('./chunker')
      const text = buffer.toString('utf-8').trim()
      return { text, metadata: { mimeType }, chunks: chunkText(text) }
    }

    default:
      throw new Error(`Unsupported MIME type: ${mimeType}`)
  }
}
