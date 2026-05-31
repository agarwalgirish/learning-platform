export type ProficiencyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PROFICIENT'
export type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'
export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY' | 'FILL_IN_THE_BLANK'
export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED'
export type AssessmentType = 'DIAGNOSTIC' | 'FORMATIVE' | 'SUMMATIVE' | 'PRACTICE'

export interface Topic {
  id: string
  name: string
  slug: string
  description: string | null
  category: string | null
  difficulty: Difficulty
  estimatedHours: number | null
  isPublished: boolean
  organizationId: string
}

export interface DocumentChunkWithScore {
  id: string
  content: string
  documentId: string
  documentName: string
  chunkIndex: number
  pageNumber: number | null
  heading: string | null
  score: number
}

export interface TutorMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  sources?: DocumentChunkWithScore[]
  timestamp?: string
}

export interface AssessmentQuestion {
  id: string
  text: string
  type: QuestionType
  difficulty: Difficulty
  options?: { id: string; text: string }[]
  points: number
  concept?: string
}

export interface AssessmentResult {
  level: ProficiencyLevel
  score: number
  strengths: string[]
  weaknesses: string[]
  recommendedPath: string[]
}

export interface QuizQuestion {
  id: string
  text: string
  type: QuestionType
  difficulty: Difficulty
  options: { id: string; text: string }[]
  concept?: string
  points: number
}

export interface UploadedDocumentInfo {
  id: string
  fileName: string
  originalName: string
  mimeType: string
  fileSize: number
  status: DocumentStatus
  topicId: string | null
  createdAt: string
}
