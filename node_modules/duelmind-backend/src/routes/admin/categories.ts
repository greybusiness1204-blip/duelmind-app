import { Router } from 'express'
import { authenticate, requireAdmin, AuthRequest } from '../../middleware/auth'
import { prisma } from '../../config/prisma'

// ── Categories ─────────────────────────────────────────────────────
export const adminCategoriesRouter = Router()
adminCategoriesRouter.use(authenticate, requireAdmin)

adminCategoriesRouter.get('/', async (_req, res) => {
  const cats = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { questions: true } } },
  })
  res.json(cats)
})
adminCategoriesRouter.post('/', async (req, res) => {
  try {
    const cat = await prisma.category.create({ data: req.body })
    res.status(201).json(cat)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})
adminCategoriesRouter.put('/:id', async (req, res) => {
  const cat = await prisma.category.update({ where: { id: req.params.id }, data: req.body })
  res.json(cat)
})
adminCategoriesRouter.delete('/:id', async (req, res) => {
  await prisma.category.delete({ where: { id: req.params.id } })
  res.json({ success: true })
})

// ── Users ──────────────────────────────────────────────────────────
export const adminUsersRouter = Router()
adminUsersRouter.use(authenticate, requireAdmin)

adminUsersRouter.get('/', async (req, res) => {
  const { page = '1', limit = '20', search, suspended } = req.query
  const skip  = (parseInt(page as string) - 1) * parseInt(limit as string)
  const where: any = {}
  if (search) where.OR = [
    { username: { contains: search as string, mode: 'insensitive' } },
    { email:    { contains: search as string, mode: 'insensitive' } },
  ]
  if (suspended !== undefined) where.isSuspended = suspended === 'true'

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where, skip, take: parseInt(limit as string),
      select: { id: true, username: true, email: true, role: true, isSuspended: true, createdAt: true, profile: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ])
  res.json({ users, total })
})

adminUsersRouter.patch('/:id/suspend', async (req: AuthRequest, res) => {
  const { suspend } = req.body
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { isSuspended: !!suspend } })
  await prisma.adminLog.create({
    data: { adminId: req.user!.id, action: suspend ? 'SUSPEND_USER' : 'UNSUSPEND_USER', entity: 'user', entityId: req.params.id },
  })
  res.json(user)
})

adminUsersRouter.patch('/:id/score', async (req: AuthRequest, res) => {
  const { boardType, score } = req.body
  await prisma.leaderboard.upsert({
    where: { userId_boardType: { userId: req.params.id, boardType } },
    update: { score },
    create: { userId: req.params.id, boardType, score, rank: 0 },
  })
  await prisma.adminLog.create({
    data: { adminId: req.user!.id, action: 'ADJUST_SCORE', entity: 'user', entityId: req.params.id, payload: { boardType, score } },
  })
  res.json({ success: true })
})

adminUsersRouter.get('/:id/flags', async (req, res) => {
  const flags = await prisma.miniGameScore.findMany({
    where: { userId: req.params.id, isFlagged: true },
    orderBy: { playedAt: 'desc' },
  })
  res.json(flags)
})

// ── Games ──────────────────────────────────────────────────────────
export const adminGamesRouter = Router()
adminGamesRouter.use(authenticate, requireAdmin)

adminGamesRouter.get('/', async (_req, res) => {
  const configs = await prisma.gameConfig.findMany()
  res.json(configs)
})
adminGamesRouter.put('/:gameType', async (req, res) => {
  const cfg = await prisma.gameConfig.upsert({
    where: { gameType: req.params.gameType },
    update: req.body,
    create: { gameType: req.params.gameType, ...req.body },
  })
  res.json(cfg)
})
adminGamesRouter.patch('/:gameType/toggle', async (req, res) => {
  const cur = await prisma.gameConfig.findUnique({ where: { gameType: req.params.gameType } })
  if (!cur) return res.status(404).json({ error: 'Not found' })
  const upd = await prisma.gameConfig.update({
    where: { gameType: req.params.gameType },
    data: { isEnabled: !cur.isEnabled },
  })
  res.json(upd)
})

// ── Analytics ──────────────────────────────────────────────────────
export const adminAnalyticsRouter = Router()
adminAnalyticsRouter.use(authenticate, requireAdmin)

adminAnalyticsRouter.get('/overview', async (_req, res) => {
  const dayAgo  = new Date(Date.now() - 86_400_000)
  const weekAgo = new Date(Date.now() - 7 * 86_400_000)

  const [totalUsers, dailyUsers, totalDuels, totalAnswers, flaggedScores, topCats] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.duel.count({ where: { status: 'COMPLETED' } }),
    prisma.questionHistory.count({ where: { answeredAt: { gte: weekAgo } } }),
    prisma.miniGameScore.count({ where: { isFlagged: true } }),
    prisma.questionHistory.groupBy({
      by: ['questionId'],
      _count: { questionId: true },
      orderBy: { _count: { questionId: 'desc' } },
      take: 5,
    }),
  ])

  const qIds = topCats.map(c => c.questionId)
  const topQuestions = await prisma.question.findMany({
    where: { id: { in: qIds } },
    include: { category: { select: { name: true } } },
  })

  const topCategories = topQuestions.map(q => ({
    category: q.category.name,
    count: topCats.find(c => c.questionId === q.id)?._count.questionId ?? 0,
  }))

  res.json({ totalUsers, dailyUsers, totalDuels, totalQuestionAnswers: totalAnswers, flaggedScores, topCategories })
})

adminAnalyticsRouter.get('/games', async (_req, res) => {
  const stats = await prisma.miniGameScore.groupBy({
    by: ['gameType'],
    _count: { gameType: true },
    _avg: { score: true },
  })
  res.json(stats)
})

adminAnalyticsRouter.get('/suspicious', async (_req, res) => {
  const flagged = await prisma.miniGameScore.findMany({
    where: { isFlagged: true },
    include: { user: { select: { username: true, email: true } } },
    orderBy: { playedAt: 'desc' },
    take: 50,
  })
  res.json(flagged)
})

adminAnalyticsRouter.get('/logs', async (_req, res) => {
  const logs = await prisma.adminLog.findMany({
    include: { admin: { select: { username: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  res.json(logs)
})
