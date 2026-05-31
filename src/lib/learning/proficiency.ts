import type { ProficiencyLevel } from '@/types'
import { PROFICIENCY_THRESHOLDS, PROFICIENCY_REQUIRED_SCORE } from '@/lib/constants'

export interface ProficiencyScore {
  level: ProficiencyLevel
  score: number
  isProficient: boolean
  progress: number // 0-100 within current level
}

export function calculateProficiencyLevel(score: number): ProficiencyLevel {
  if (score >= PROFICIENCY_THRESHOLDS.PROFICIENT) return 'PROFICIENT'
  if (score >= PROFICIENCY_THRESHOLDS.ADVANCED) return 'ADVANCED'
  if (score >= PROFICIENCY_THRESHOLDS.INTERMEDIATE) return 'INTERMEDIATE'
  return 'BEGINNER'
}

export function calculateProgressWithinLevel(
  score: number,
  level: ProficiencyLevel
): number {
  const thresholds = {
    BEGINNER: { min: 0, max: PROFICIENCY_THRESHOLDS.INTERMEDIATE },
    INTERMEDIATE: {
      min: PROFICIENCY_THRESHOLDS.INTERMEDIATE,
      max: PROFICIENCY_THRESHOLDS.ADVANCED,
    },
    ADVANCED: {
      min: PROFICIENCY_THRESHOLDS.ADVANCED,
      max: PROFICIENCY_THRESHOLDS.PROFICIENT,
    },
    PROFICIENT: { min: PROFICIENCY_THRESHOLDS.PROFICIENT, max: 100 },
  }

  const { min, max } = thresholds[level]
  return Math.min(100, Math.round(((score - min) / (max - min)) * 100))
}

export function evaluateProficiency(
  quizScores: number[],
  diagnosticScore: number
): ProficiencyScore {
  if (quizScores.length === 0) {
    const level = calculateProficiencyLevel(diagnosticScore)
    return {
      level,
      score: diagnosticScore,
      isProficient: diagnosticScore >= PROFICIENCY_REQUIRED_SCORE,
      progress: calculateProgressWithinLevel(diagnosticScore, level),
    }
  }

  // Weight: 40% diagnostic, 60% quiz average (recency bias)
  const recentQuizzes = quizScores.slice(-5)
  const avgQuiz = recentQuizzes.reduce((a, b) => a + b, 0) / recentQuizzes.length
  const compositeScore = diagnosticScore * 0.4 + avgQuiz * 0.6

  const level = calculateProficiencyLevel(compositeScore)

  // Require: (1) at least 3 quiz attempts, (2) last 2 both >= threshold
  const hasEnoughAttempts = quizScores.length >= 3
  const last2 = quizScores.slice(-2)
  const consistentHighScore =
    last2.length >= 2 && last2.every((s) => s >= PROFICIENCY_REQUIRED_SCORE)

  return {
    level,
    score: Math.round(compositeScore),
    isProficient: level === 'PROFICIENT' && consistentHighScore && hasEnoughAttempts,
    progress: calculateProgressWithinLevel(compositeScore, level),
  }
}

export function getNextRecommendedDifficulty(
  currentLevel: ProficiencyLevel,
  lastQuizScore: number
): ProficiencyLevel {
  // If struggling (< 60%), drop down; if excelling (>= 85%), move up
  const levelOrder: ProficiencyLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFICIENT']
  const currentIdx = levelOrder.indexOf(currentLevel)

  if (lastQuizScore < 60 && currentIdx > 0) {
    return levelOrder[currentIdx - 1]
  }
  if (lastQuizScore >= 85 && currentIdx < levelOrder.length - 1) {
    return levelOrder[currentIdx + 1]
  }
  return currentLevel
}
