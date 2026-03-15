import { Router } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { prisma } from '../config/prisma'

export const leaderboardRouter = Router()
leaderboardRouter.use(authenticate)

leaderboardRouter.get('/:type', async (req: AuthRequest, res) => {
  const { type } = req.params
  if (!['GLOBAL', 'TRIVIA', 'REACTION'].includes(type)) {
    return res.status(400).json({ error: 'Invalid leaderboard type' })
  }

  const page  = Math.max(1, parseInt(req.query.page as string) || 1)
  const limit = Math.min(100, parseInt(req.query.limit as string) || 20)
  const skip  = (page - 1) * limit

  const [entries, total] = await Promise.all([
    prisma.leaderboard.findMany({
      where: { boardType: type },
      orderBy: { score: 'desc' },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            username: true,
            profile: {
              select: { displayName: true, avatarUrl: true, totalWins: true, totalDuels: true },
            },
          },
        },
      },
    }),
    prisma.leaderboard.count({ where: { boardType: type } }),
  ])

  const ranked = entries.map((e, i) => ({ ...e, rank: skip + i + 1 }))

  // Current user's rank
  let myRank: number | null = null
  let myScore = 0
  const myEntry = await prisma.leaderboard.findUnique({
    where: { userId_boardType: { userId: req.user!.id, boardType: type } },
  })
  if (myEntry) {
    myScore = myEntry.score
    const above = await prisma.leaderboard.count({
      where: { boardType: type, score: { gt: myEntry.score } },
    })
    myRank = above + 1
  }

  res.json({
    entries: ranked,
    total,
    page,
    pages: Math.ceil(total / limit),
    myRank,
    myScore,
  })
})
