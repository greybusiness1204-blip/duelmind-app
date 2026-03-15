import { DuelType, Language, Difficulty } from '@prisma/client'
import { prisma } from '../config/prisma'
import { triviaEngine } from './triviaEngine'

function genCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export interface DuelConfig {
  type: DuelType
  categoryId?: string
  difficulty?: Difficulty
  language?: Language
  rounds?: number
  timePerQuestion?: number
}

export const duelService = {
  async createDuel(creatorId: string, config: DuelConfig) {
    return prisma.duel.create({
      data: {
        creatorId,
        type: config.type,
        inviteCode: genCode(),
        config: config as any,
        status: 'WAITING',
      },
      include: { creator: { include: { profile: true } } },
    })
  },

  async joinDuel(inviteCode: string, userId: string) {
    const duel = await prisma.duel.findUnique({ where: { inviteCode: inviteCode.toUpperCase() } })
    if (!duel) throw new Error('Duel not found')
    if (duel.status !== 'WAITING') throw new Error('Duel is no longer open')
    if (duel.creatorId === userId) throw new Error('Cannot join your own duel')

    return prisma.duel.update({
      where: { id: duel.id },
      data: { opponentId: userId, status: 'ACTIVE', startedAt: new Date() },
      include: {
        creator: { include: { profile: true } },
        opponent: { include: { profile: true } },
      },
    })
  },

  async getQuestions(duelId: string) {
    const duel = await prisma.duel.findUnique({ where: { id: duelId } })
    if (!duel) throw new Error('Duel not found')
    const cfg = duel.config as DuelConfig
    return triviaEngine.selectQuestions({
      userId: duel.creatorId,
      categoryId: cfg.categoryId,
      difficulty: cfg.difficulty,
      language: (cfg.language as Language) || Language.en,
      count: (cfg.rounds || 3) + 3,
      context: 'DUEL',
    })
  },

  async completeDuel(
    duelId: string,
    results: { userId: string; score: number; roundsWon: number; answers: any[] }[]
  ) {
    if (results.length === 0) throw new Error('No results')
    const sorted = [...results].sort((a, b) =>
      b.roundsWon !== a.roundsWon ? b.roundsWon - a.roundsWon : b.score - a.score
    )
    const winner = sorted[0]

    await prisma.$transaction([
      prisma.duel.update({ where: { id: duelId }, data: { status: 'COMPLETED', endedAt: new Date() } }),
      ...results.map(r =>
        prisma.duelResult.create({
          data: { duelId, userId: r.userId, isWinner: r.userId === winner.userId, score: r.score, answers: r.answers, roundsWon: r.roundsWon },
        })
      ),
      ...results.map(r =>
        prisma.profile.update({
          where: { userId: r.userId },
          data: {
            totalDuels: { increment: 1 },
            ...(r.userId === winner.userId && { totalWins: { increment: 1 } }),
            totalXp: { increment: r.score },
          },
        })
      ),
    ])
    return { winnerId: winner.userId }
  },
}
