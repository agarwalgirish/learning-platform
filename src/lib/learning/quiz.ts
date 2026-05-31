import { db } from '@/lib/db'
import { generateQuizQuestions } from '@/lib/rag'
import { evaluateProficiency, getNextRecommendedDifficulty } from './proficiency'
import type { ProficiencyLevel } from '@/types'

export async function createQuiz(
  userId: string,
  topicId: string,
  organizationId: string,
  currentLevel: ProficiencyLevel,
  weakConcepts?: string[]
) {
  const topic = await db.topic.findUniqueOrThrow({ where: { id: topicId } })

  const rawJson = await generateQuizQuestions(
    topic.name,
    organizationId,
    topicId,
    currentLevel,
    5,
    weakConcepts
  )

  let parsed: { questions: any[] }
  try {
    const cleaned = rawJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('Failed to parse quiz questions')
  }

  const assessment = await db.assessment.create({
    data: {
      userId,
      topicId,
      type: 'FORMATIVE',
      status: 'active',
    },
  })

  const questions = await Promise.all(
    parsed.questions.slice(0, 5).map(async (q: any) => {
      const question = await db.question.create({
        data: {
          topicId,
          assessmentId: assessment.id,
          text: q.text,
          type: q.type ?? 'MULTIPLE_CHOICE',
          difficulty: q.difficulty ?? currentLevel,
          explanation: q.explanation,
          concept: q.concept,
          points: 1,
        },
      })

      if (q.options?.length) {
        await db.answerOption.createMany({
          data: q.options.map((opt: any, i: number) => ({
            questionId: question.id,
            text: opt.text,
            isCorrect: opt.isCorrect ?? false,
            order: i,
          })),
        })
      }

      return {
        id: question.id,
        text: question.text,
        type: question.type,
        difficulty: question.difficulty,
        concept: question.concept,
        options: q.options?.map((opt: any, i: number) => ({
          id: `${question.id}_opt_${i}`,
          text: opt.text,
        })),
      }
    })
  )

  return { assessmentId: assessment.id, questions }
}

export async function scoreQuiz(
  assessmentId: string,
  userId: string,
  answers: Array<{ questionId: string; answer: string }>
): Promise<{
  score: number
  passed: boolean
  newLevel: ProficiencyLevel
  feedback: Array<{ questionId: string; correct: boolean; explanation: string | null }>
}> {
  const assessment = await db.assessment.findUniqueOrThrow({
    where: { id: assessmentId },
    include: { questions: { include: { options: true } } },
  })

  let correct = 0
  const feedback: Array<{ questionId: string; correct: boolean; explanation: string | null }> = []

  const attempt = await db.quizAttempt.create({
    data: { userId, assessmentId },
  })

  for (const answer of answers) {
    const question = assessment.questions.find((q) => q.id === answer.questionId)
    if (!question) continue

    const correctOption = question.options.find((o) => o.isCorrect)
    const isCorrect = correctOption?.text === answer.answer
    if (isCorrect) correct++

    feedback.push({
      questionId: question.id,
      correct: isCorrect,
      explanation: question.explanation,
    })

    await db.quizResponse.create({
      data: {
        attemptId: attempt.id,
        questionId: question.id,
        answer: answer.answer,
        isCorrect,
        score: isCorrect ? 1 : 0,
      },
    })
  }

  const score = Math.round((correct / Math.max(assessment.questions.length, 1)) * 100)
  const passed = score >= 70

  await db.quizAttempt.update({
    where: { id: attempt.id },
    data: { score, maxScore: 100, passed, completedAt: new Date() },
  })

  // Fetch all quiz scores for this user + topic to recalculate proficiency
  const allAttempts = await db.quizAttempt.findMany({
    where: {
      userId,
      assessment: { topicId: assessment.topicId },
      completedAt: { not: null },
    },
    select: { score: true },
    orderBy: { completedAt: 'asc' },
  })

  const scores = allAttempts.map((a) => a.score ?? 0)
  const currentProgress = await db.learnerProgress.findUnique({
    where: { userId_topicId: { userId, topicId: assessment.topicId } },
  })

  const { level, isProficient, score: compositeScore } = evaluateProficiency(
    scores,
    currentProgress?.proficiencyScore ?? 0
  )

  const recommendedLevel = getNextRecommendedDifficulty(level, score)

  await db.learnerProgress.upsert({
    where: { userId_topicId: { userId, topicId: assessment.topicId } },
    create: {
      userId,
      topicId: assessment.topicId,
      proficiencyLevel: level,
      proficiencyScore: compositeScore,
      isProficient,
      quizzesTaken: 1,
      avgQuizScore: score,
      lastActivityAt: new Date(),
      ...(isProficient ? { completedAt: new Date() } : {}),
    },
    update: {
      proficiencyLevel: level,
      proficiencyScore: compositeScore,
      isProficient,
      quizzesTaken: { increment: 1 },
      avgQuizScore: score,
      lastActivityAt: new Date(),
      ...(isProficient ? { completedAt: new Date() } : {}),
    },
  })

  return { score, passed, newLevel: recommendedLevel, feedback }
}
