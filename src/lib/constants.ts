export const PROFICIENCY_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFICIENT'] as const
export const DIFFICULTY_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const
export const USER_ROLES = ['ADMIN', 'INSTRUCTOR', 'LEARNER'] as const

// Score thresholds to advance to next proficiency level
export const PROFICIENCY_THRESHOLDS = {
  BEGINNER: 0,
  INTERMEDIATE: 40,
  ADVANCED: 70,
  PROFICIENT: 90,
} as const

export const SUPPORTED_MIME_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/plain': 'txt',
  'text/markdown': 'md',
  'text/html': 'html',
}

export const MAX_UPLOAD_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? '50') * 1024 * 1024
export const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE ?? '1000')
export const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP ?? '200')
export const EMBEDDING_DIMENSIONS = parseInt(process.env.EMBEDDING_DIMENSIONS ?? '1536')
export const DEFAULT_SEARCH_RESULTS = 5
export const DIAGNOSTIC_QUESTIONS_COUNT = 8
export const QUIZ_QUESTIONS_COUNT = 5
export const PROFICIENCY_REQUIRED_SCORE = 85
