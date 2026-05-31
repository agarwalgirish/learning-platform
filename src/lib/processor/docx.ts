import mammoth from 'mammoth'
import type { TextChunk } from './chunker'
import { chunkText } from './chunker'

export interface DocxResult {
  text: string
  html: string
  metadata: Record<string, unknown>
  chunks: TextChunk[]
}

export async function extractDOCX(buffer: Buffer): Promise<DocxResult> {
  const [textResult, htmlResult] = await Promise.all([
    mammoth.extractRawText({ buffer }),
    mammoth.convertToHtml({ buffer }),
  ])

  const text = textResult.value.trim()

  return {
    text,
    html: htmlResult.value,
    metadata: {},
    chunks: chunkText(text),
  }
}
