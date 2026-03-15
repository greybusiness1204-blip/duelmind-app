import { prisma } from '../config/prisma'

const MIN_REACTION_MS = parseInt(process.env.MIN_REACTION_MS || '100')
const MAX_SCORE_MULT  = parseFloat(process.env.MAX_SCORE_MULTIPLIER || '3')

export const anticheat = {
  async check(userId: string, gameType: string, score: number, durationMs: number, scoreId: string) {
    const flags: string[] = []

    if (durationMs < MIN_REACTION_MS) flags.push(`Impossible duration: ${durationMs}ms`)

    const recent = await prisma.miniGameScore.findMany({
      where: { userId, gameType, isFlagged: false },
      orderBy: { playedAt: 'desc' },
      take: 10,
      select: { score: true },
    })
    if (recent.length >= 3) {
      const avg = recent.reduce((s, r) => s + r.score, 0) / recent.length
      if (score > avg * MAX_SCORE_MULT) flags.push(`Score anomaly: ${score} vs avg ${avg.toFixed(0)}`)
    }

    if (flags.length > 0) {
      await prisma.miniGameScore.update({
        where: { id: scoreId },
        data: { isFlagged: true, flagReason: flags.join('; ') },
      })
    }

    return { flagged: flags.length > 0, reasons: flags }
  },
}
