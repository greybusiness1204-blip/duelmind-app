import { Router } from 'express'
import { z } from 'zod'
import { authenticate, AuthRequest } from '../middleware/auth'
import { prisma } from '../config/prisma'
import { anticheat } from '../services/anticheat'

export const gamesRouter = Router()
gamesRouter.use(authenticate)

const GAME_TYPES = ['REACTION_TAP', 'ONE_SECOND', 'COLOR_TAP', 'MEMORY_FLIP', 'PATTERN_MATCH', 'SPEED_CHOICE'] as const

// GET /api/games/config
gamesRouter.get('/config', async (_req, res) => {
  const configs = await prisma.gameConfig.findMany({ where: { isEnabled: true } })
  res.json(configs)
})

// POST /api/games/score
gamesRouter.post('/score', async (req: AuthRequest, res) => {
  const schema = z.object({
    gameType: z.enum(GAME_TYPES),
    score: z.number().int().min(0).max(1_000_000),
    durationMs: z.number().int().min(0).max(300_000),
    metadata: z.record(z.any()).optional().default({}),
  })
  try {
    const data = schema.parse(req.body)
    const cfg = await prisma.gameConfig.findUnique({ where: { gameType: data.gameType } })
    if (!cfg || !cfg.isEnabled) return res.status(403).json({ error: 'Game disabled' })

    const record = await prisma.miniGameScore.create({
      data: {
        userId: req.user!.id,
        gameType: data.gameType,
        score: data.score,
        durationMs: data.durationMs,
        metadata: data.metadata,
      },
    })

    const cheat = await anticheat.check(req.user!.id, data.gameType, data.score, data.durationMs, record.id)

    if (!cheat.flagged) {
      // Update reaction leaderboard if score is a personal best
      const existing = await prisma.leaderboard.findUnique({
        where: { userId_boardType: { userId: req.user!.id, boardType: 'REACTION' } },
      })
      if (!existing || data.score > existing.score) {
        await prisma.leaderboard.upsert({
          where: { userId_boardType: { userId: req.user!.id, boardType: 'REACTION' } },
          update: { score: data.score },
          create: { userId: req.user!.id, boardType: 'REACTION', score: data.score, rank: 0 },
        })
      }
    }

    res.json({ id: record.id, score: data.score, flagged: cheat.flagged })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0]?.message })
    res.status(500).json({ error: 'Failed to save score' })
  }
})

// GET /api/games/history
gamesRouter.get('/history', async (req: AuthRequest, res) => {
  const scores = await prisma.miniGameScore.findMany({
    where: { userId: req.user!.id, isFlagged: false },
    orderBy: { playedAt: 'desc' },
    take: 50,
  })
  res.json(scores)
})

// GET /api/games/best/:gameType
gamesRouter.get('/best/:gameType', async (req: AuthRequest, res) => {
  const best = await prisma.miniGameScore.findFirst({
    where: { userId: req.user!.id, gameType: req.params.gameType, isFlagged: false },
    orderBy: { score: 'desc' },
  })
  res.json(best)
})
