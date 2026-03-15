import { Router } from 'express'
import { z } from 'zod'
import { authenticate, AuthRequest } from '../middleware/auth'
import { duelService } from '../services/duelService'
import { prisma } from '../config/prisma'

export const duelRouter = Router()
duelRouter.use(authenticate)

const createSchema = z.object({
  type: z.enum(['TRIVIA', 'REACTION']).default('TRIVIA'),
  categoryId: z.string().uuid().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  language: z.enum(['en', 'az', 'ru']).optional(),
  rounds: z.number().int().min(1).max(9).default(3),
  timePerQuestion: z.number().int().min(5).max(60).default(20),
})

function randomCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

// POST /api/duels/create
duelRouter.post('/create', async (req: AuthRequest, res) => {
  try {
    const config = createSchema.parse(req.body)
    const duel = await duelService.createDuel(req.user!.id, config as any)
    res.status(201).json(duel)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0]?.message })
    res.status(500).json({ error: 'Failed to create duel' })
  }
})

// POST /api/duels/join/:code
duelRouter.post('/join/:code', async (req: AuthRequest, res) => {
  try {
    const duel = await duelService.joinDuel(req.params.code, req.user!.id)
    res.json(duel)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// POST /api/duels/quickmatch
duelRouter.post('/quickmatch', async (req: AuthRequest, res) => {
  try {
    const config = createSchema.parse(req.body)
    const existing = await prisma.duel.findFirst({
      where: {
        status: 'WAITING',
        isQuickMatch: true,
        type: config.type as any,
        NOT: { creatorId: req.user!.id },
      },
    })
    if (existing) {
      const duel = await duelService.joinDuel(existing.inviteCode, req.user!.id)
      return res.json({ duel, matched: true })
    }
    const duel = await prisma.duel.create({
      data: {
        creatorId: req.user!.id,
        type: config.type as any,
        inviteCode: randomCode(),
        config: config as any,
        status: 'WAITING',
        isQuickMatch: true,
      },
      include: { creator: { include: { profile: true } } },
    })
    res.status(201).json({ duel, matched: false })
  } catch (err: any) {
    res.status(500).json({ error: 'Quick match failed' })
  }
})

// GET /api/duels/history/me  — MUST be before /:id
duelRouter.get('/history/me', async (req: AuthRequest, res) => {
  const duels = await prisma.duel.findMany({
    where: {
      OR: [{ creatorId: req.user!.id }, { opponentId: req.user!.id }],
      status: 'COMPLETED',
    },
    include: {
      creator: { select: { username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
      opponent: { select: { username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
      results: { where: { userId: req.user!.id } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  res.json(duels)
})

// GET /api/duels/:id
duelRouter.get('/:id', async (req: AuthRequest, res) => {
  const duel = await prisma.duel.findUnique({
    where: { id: req.params.id },
    include: {
      creator: { include: { profile: true } },
      opponent: { include: { profile: true } },
      results: true,
    },
  })
  if (!duel) return res.status(404).json({ error: 'Not found' })
  res.json(duel)
})
