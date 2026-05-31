import pdfParse from 'pdf-parse'
import type { TextChunk } from './chunker'
import { chunkText } from './chunker'

export interface PDFResult {
  text: string
  pageCount: number
  metadata: Record<string, unknown>
  chunks: TextChunk[]
}

export async function extractPDF(buffer: Buffer): Promise<PDFResult> {
  const data = await pdfParse(buffer)

  const text = data.text
    .replace(/\x00/g, ' ')
    .replace(/\s{3,}/g, '\n\n')
    .trim()

  return {
    text,
    pageCount: data.numpages,
    metadata: {
      title: (data.info as any)?.Title ?? null,
      author: (data.info as any)?.Author ?? null,
    },
    chunks: chunkText(text),
  }
}
