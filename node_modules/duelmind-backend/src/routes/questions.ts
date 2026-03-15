import { Router } from 'express'
import { z } from 'zod'
import { authenticate, AuthRequest } from '../middleware/auth'
import { triviaEngine } from '../services/triviaEngine'
import { prisma } from '../config/prisma'

export const questionsRouter = Router()
questionsRouter.use(authenticate)

// GET /api/questions/next
questionsRouter.get('/next', async (req: AuthRequest, res) => {
  try {
    const { categoryId, difficulty, language, count, context } = req.query
    const questions = await triviaEngine.selectQuestions({
      userId: req.user!.id,
      categoryId: categoryId as string | undefined,
      difficulty: difficulty as any,
      language: (language as any) || 'en',
      count: Math.min(parseInt(count as string) || 10, 50),
      context: (context as any) || 'LEARN',
    })
    res.json(questions.map(q => ({
      id: q.id,
      questionText: q.questionText,
      options: (q.answerOptions as any).options,
      imageUrl: q.imageUrl,
      difficulty: q.difficulty,
      categoryId: q.categoryId,
    })))
  } catch (err) {
    console.error('[questions/next]', err)
    res.status(500).json({ error: 'Failed to fetch questions' })
  }
})

// POST /api/questions/answer  — validate by answer text (shuffle-safe)
questionsRouter.post('/answer', async (req: AuthRequest, res) => {
  const schema = z.object({
    questionId: z.string().uuid(),
    answer: z.string(),
    answerText: z.string().optional(),
    responseMs: z.number().int().min(0).max(120_000),
    context: z.enum(['LEARN', 'REVIEW', 'DUEL']).default('LEARN'),
  })
  try {
    const { questionId, answer, answerText, responseMs, context } = schema.parse(req.body)
    const question = await prisma.question.findUnique({ where: { id: questionId } })
    if (!question) return res.status(404).json({ error: 'Question not found' })

    const opts: { key: string; text: string }[] = Array.isArray(question.answerOptions)
      ? (question.answerOptions as any)
      : ((question.answerOptions as any)?.options ?? [])

    const correctText = opts.find(o => o.key === question.correctAnswer)?.text ?? ''

    // If answerText supplied, validate by text (handles client-side shuffle)
    // Otherwise fall back to key comparison (duel mode uses server-side shuffle)
    const correct = answerText != null ? answerText === correctText : answer === question.correctAnswer

    await triviaEngine.recordAnswer(req.user!.id, questionId, correct, responseMs, context)

    res.json({
      correct,
      correctAnswer: answer,
      correctAnswerText: correctText,
      explanation: question.explanation,
    })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0]?.message })
    res.status(500).json({ error: 'Failed to record answer' })
  }
})

// GET /api/questions/categories
questionsRouter.get('/categories', async (_req, res) => {
  const cats = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })
  res.json(cats)
})

// GET /api/questions/stats/me
questionsRouter.get('/stats/me', async (req: AuthRequest, res) => {
  const [total, correct] = await Promise.all([
    prisma.questionHistory.count({ where: { userId: req.user!.id } }),
    prisma.questionHistory.count({ where: { userId: req.user!.id, wasCorrect: true } }),
  ])
  res.json({ total, correct, accuracy: total > 0 ? Math.round((correct / total) * 100) : 0 })
})
