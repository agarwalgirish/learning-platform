import { db } from '@/lib/db'
import { generateDiagnosticQuestions } from '@/lib/rag'
import { calculateProficiencyLevel } from './proficiency'
import type { ProficiencyLevel } from '@/types'

export interface DiagnosticResult {
  assessmentId: string
  level: ProficiencyLevel
  score: number
  strengths: string[]
  weaknesses: string[]
  questionsGenerated: number
}

export async function createDiagnosticAssessment(
  userId: string,
  topicId: string,
  organizationId: string
): Promise<{ assessmentId: string; questions: any[] }> {
  const topic = await db.topic.findUniqueOrThrow({ where: { id: topicId } })

  // Generate AI questions from the knowledge base
  const rawJson = await generateDiagnosticQuestions(
    topic.name,
    organizationId,
    topicId,
    8
  )

  let parsed: { questions: any[] }
  try {
    // Strip markdown code fences if present
    const cleaned = rawJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('Failed to parse generated questions')
  }

  const assessment = await db.assessment.create({
    data: {
      userId,
      topicId,
      type: 'DIAGNOSTIC',
      status: 'active',
    },
  })

  // Persist questions and options
  const questions = await Promise.all(
    parsed.questions.slice(0, 8).map(async (q: any, idx: number) => {
      const question = await db.question.create({
        data: {
          topicId,
          assessmentId: assessment.id,
          text: q.text,
          type: q.type ?? 'MULTIPLE_CHOICE',
          difficulty: q.difficulty ?? 'BEGINNER',
          explanation: q.explanation,
          concept: q.concept,
          points: 1,
        },
      })

      if (q.options?.length) {
        await db.answerOption.createMany({
          data: q.options.map((opt: any, optIdx: number) => ({
            questionId: question.id,
            text: opt.text,
            isCorrect: opt.isCorrect ?? false,
            order: optIdx,
          })),
        })
      }

      return {
        id: question.id,
        text: question.text,
        type: question.type,
        difficulty: question.difficulty,
        concept: question.concept,
        points: question.points,
        options: q.options?.map((opt: any, i: number) => ({
          id: `${question.id}_opt_${i}`,
          text: opt.text,
        })),
      }
    })
  )

  return { assessmentId: assessment.id, questions }
}

export async function scoreAssessment(
  assessmentId: string,
  answers: Array<{ questionId: string; answer: string }>
): Promise<DiagnosticResult> {
  const assessment = await db.assessment.findUniqueOrThrow({
    where: { id: assessmentId },
    include: {
      questions: {
        include: { options: true },
      },
    },
  })

  let correct = 0
  const strengths: string[] = []
  const weaknesses: string[] = []

  const attempt = await db.quizAttempt.create({
    data: {
      userId: assessment.userId,
      assessmentId,
      startedAt: new Date(),
    },
  })

  for (const answer of answers) {
    const question = assessment.questions.find((q) => q.id === answer.questionId)
    if (!question) continue

    const correctOption = question.options.find((o) => o.isCorrect)
    const isCorrect = correctOption?.text === answer.answer

    if (isCorrect) {
      correct++
      if (question.concept && !strengths.includes(question.concept)) {
        strengths.push(question.concept)
      }
    } else {
      if (question.concept && !weaknesses.includes(question.concept)) {
        weaknesses.push(question.concept)
      }
    }

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
  const level = calculateProficiencyLevel(score)

  await db.quizAttempt.update({
    where: { id: attempt.id },
    data: {
      score,
      maxScore: 100,
      passed: score >= 70,
      completedAt: new Date(),
    },
  })

  await db.assessment.update({
    where: { id: assessmentId },
    data: {
      status: 'completed',
      score,
      maxScore: 100,
      level,
      completedAt: new Date(),
    },
  })

  // Upsert learner progress
  await db.learnerProgress.upsert({
    where: { userId_topicId: { userId: assessment.userId, topicId: assessment.topicId } },
    create: {
      userId: assessment.userId,
      topicId: assessment.topicId,
      proficiencyLevel: level,
      proficiencyScore: score,
      quizzesTaken: 1,
      avgQuizScore: score,
      lastActivityAt: new Date(),
    },
    update: {
      proficiencyLevel: level,
      proficiencyScore: score,
      lastActivityAt: new Date(),
    },
  })

  return {
    assessmentId,
    level,
    score,
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 5),
    questionsGenerated: assessment.questions.length,
  }
}
