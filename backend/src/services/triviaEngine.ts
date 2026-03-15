import { Difficulty, Language } from '@prisma/client'
import { prisma } from '../config/prisma'

export interface TriviaOptions {
  userId: string
  categoryId?: string
  difficulty?: Difficulty
  language?: Language
  count?: number
  context?: 'LEARN' | 'DUEL' | 'REVIEW'
}

export class TriviaEngine {
  async selectQuestions(opts: TriviaOptions) {
    const { userId, categoryId, difficulty, language = Language.en, count = 10, context = 'LEARN' } = opts

    // Fetch user's recent history for smart selection
    const recentHistory = await prisma.questionHistory.findMany({
      where: { userId },
      orderBy: { answeredAt: 'desc' },
      take: 300,
      select: { questionId: true, answeredAt: true, wasCorrect: true },
    })

    const recentIds = new Set(recentHistory.map(h => h.questionId))
    const incorrectIds = new Set(recentHistory.filter(h => !h.wasCorrect).map(h => h.questionId))

    const where: any = {
      isActive: true,
      language,
      ...(categoryId && { categoryId }),
      ...(difficulty && { difficulty }),
    }

    // REVIEW mode: only show previously wrong questions
    if (context === 'REVIEW' && incorrectIds.size > 0) {
      where.id = { in: [...incorrectIds] }
    }

    const allQuestions = await prisma.question.findMany({
      where,
      select: {
        id: true, questionText: true, answerOptions: true, correctAnswer: true,
        explanation: true, imageUrl: true, difficulty: true, categoryId: true,
        familyId: true, playCount: true, cooldownPlays: true,
      },
    })

    if (allQuestions.length === 0) return []

    // Score questions: higher = more likely to be selected
    const scored = allQuestions.map(q => {
      let score = 100
      if (!recentIds.has(q.id)) score += 200                      // Unseen bonus
      if (context === 'LEARN' && incorrectIds.has(q.id)) score += 60 // Wrong-before boost

      const hist = recentHistory.find(h => h.questionId === q.id)
      if (hist) {
        const daysAgo = (Date.now() - hist.answeredAt.getTime()) / 86_400_000
        if (daysAgo < 1) score -= 180
        else if (daysAgo < 3) score -= 90
        else if (daysAgo < 7) score -= 40
      }

      score += Math.random() * 60  // Controlled randomness
      return { ...q, _score: score }
    })

    scored.sort((a, b) => b._score - a._score)

    // Anti-family-cluster selection
    const pool = scored.slice(0, Math.min(scored.length, count * 5))
    const selected: typeof pool = []
    const usedFamilies = new Set<string>()

    for (const q of pool) {
      if (selected.length >= count) break
      if (q.familyId && usedFamilies.has(q.familyId)) continue
      selected.push(q)
      if (q.familyId) usedFamilies.add(q.familyId)
    }

    // Fill remaining if family filtering left gaps
    for (const q of pool) {
      if (selected.length >= count) break
      if (!selected.some(s => s.id === q.id)) selected.push(q)
    }

    // Shuffle options for each question and return
    return selected.map(q => ({
      ...q,
      answerOptions: this._shuffle(q.answerOptions, q.correctAnswer),
    }))
  }

  /** Shuffle answer options using Fisher-Yates; track new correct key */
  _shuffle(raw: any, correctKey: string): { options: { key: string; text: string }[]; correctAnswer: string } {
    const flat: { key: string; text: string }[] = Array.isArray(raw) ? raw : (raw?.options ?? [])
    if (flat.length === 0) return { options: [], correctAnswer: correctKey }

    const correctText = flat.find(o => o.key === correctKey)?.text
    if (!correctText) return { options: flat, correctAnswer: correctKey }

    const arr = [...flat]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }

    const keys = ['A', 'B', 'C', 'D']
    let newCorrect = 'A'
    const options = arr.map((o, i) => {
      if (o.text === correctText) newCorrect = keys[i]
      return { key: keys[i], text: o.text }
    })
    return { options, correctAnswer: newCorrect }
  }

  async recordAnswer(userId: string, questionId: string, wasCorrect: boolean, responseMs: number, context = 'LEARN') {
    await prisma.questionHistory.create({
      data: { userId, questionId, wasCorrect, responseMs, context },
    })
    await prisma.question.update({
      where: { id: questionId },
      data: {
        playCount: { increment: 1 },
        ...(wasCorrect && { correctCount: { increment: 1 } }),
      },
    })
  }
}

export const triviaEngine = new TriviaEngine()
