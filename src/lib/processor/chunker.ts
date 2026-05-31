import { CHUNK_SIZE, CHUNK_OVERLAP } from '@/lib/constants'

export interface TextChunk {
  content: string
  chunkIndex: number
  pageNumber?: number
  heading?: string
  tokenCount?: number
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function chunkText(
  text: string,
  options: { chunkSize?: number; overlap?: number } = {}
): TextChunk[] {
  const chunkSize = options.chunkSize ?? CHUNK_SIZE
  const overlap = options.overlap ?? CHUNK_OVERLAP

  if (!text?.trim()) return []

  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  const chunks: TextChunk[] = []
  let currentChunk = ''
  let chunkIndex = 0

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length + 2 > chunkSize && currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        chunkIndex: chunkIndex++,
        tokenCount: estimateTokens(currentChunk),
      })
      // Carry over tail for context overlap
      const words = currentChunk.split(' ')
      const overlapWords = words.slice(-Math.max(1, Math.floor(overlap / 5)))
      currentChunk = overlapWords.join(' ') + '\n\n' + paragraph
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph
    }
  }

  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      chunkIndex: chunkIndex,
      tokenCount: estimateTokens(currentChunk),
    })
  }

  return chunks
}
