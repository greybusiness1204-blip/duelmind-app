import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { prisma } from '../config/prisma'
import { duelService } from '../services/duelService'
import { triviaEngine } from '../services/triviaEngine'

interface Player { socketId: string; userId: string; username: string; score: number; roundsWon: number }
interface Room {
  duelId: string
  players: Map<string, Player>
  questions: any[]
  qIndex: number
  round: number
  totalRounds: number
  answers: Map<string, { answer: string; responseMs: number; correct: boolean }>
  status: 'waiting' | 'active' | 'finished'
  timer?: ReturnType<typeof setTimeout>
}

const rooms = new Map<string, Room>()

function authSocket(socket: Socket): { id: string; username: string } | null {
  try {
    const token = socket.handshake.auth?.token
    if (!token) return null
    return jwt.verify(token, process.env.JWT_SECRET!) as { id: string; username: string }
  } catch { return null }
}

function genCode(): string {
  const k = ['A', 'B', 'C', 'D']
  return k[Math.floor(Math.random() * 4)]
}

export function setupDuelSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    const user = authSocket(socket)
    if (!user) { socket.disconnect(); return }

    // ── Join room ────────────────────────────────────────────────
    socket.on('duel:join', async ({ duelId }: { duelId: string }) => {
      try {
        const duel = await prisma.duel.findUnique({
          where: { id: duelId },
          include: { creator: true, opponent: true },
        })
        if (!duel) return socket.emit('error', { message: 'Duel not found' })

        const ok = duel.creatorId === user.id || duel.opponentId === user.id
        if (!ok) return socket.emit('error', { message: 'Not a participant' })

        socket.join(duelId)

        if (!rooms.has(duelId)) {
          rooms.set(duelId, {
            duelId,
            players: new Map(),
            questions: [],
            qIndex: 0,
            round: 1,
            totalRounds: (duel.config as any).rounds ?? 3,
            answers: new Map(),
            status: 'waiting',
          })
        }

        const room = rooms.get(duelId)!
        if (!room.players.has(user.id)) {
          room.players.set(user.id, { socketId: socket.id, userId: user.id, username: user.username, score: 0, roundsWon: 0 })
        }

        io.to(duelId).emit('duel:player_joined', {
          userId: user.id,
          username: user.username,
          playerCount: room.players.size,
        })

        if (room.players.size === 2 && room.status === 'waiting') {
          room.status = 'active'
          room.questions = await duelService.getQuestions(duelId)

          io.to(duelId).emit('duel:started', {
            totalRounds: room.totalRounds,
            players: [...room.players.values()].map(p => ({ userId: p.userId, username: p.username })),
          })

          setTimeout(() => sendQ(io, duelId), 2000)
        }
      } catch (e) {
        console.error('[WS] join error', e)
        socket.emit('error', { message: 'Failed to join duel' })
      }
    })

    // ── Answer ───────────────────────────────────────────────────
    socket.on('duel:answer', async ({ duelId, answer, responseMs }: { duelId: string; answer: string; responseMs: number }) => {
      const room = rooms.get(duelId)
      if (!room || room.status !== 'active') return

      const q = room.questions[room.qIndex]
      if (!q || room.answers.has(user.id)) return

      // correctAnswer stored on question object after shuffle in sendQ
      const correctAnswer: string = q._correctKey ?? q.correctAnswer
      const correct = answer === correctAnswer
      const points = correct ? Math.max(100, 1000 - Math.floor(responseMs / 10)) : 0

      room.answers.set(user.id, { answer, responseMs, correct })
      const player = room.players.get(user.id)!
      player.score += points

      socket.emit('duel:answer_result', { correct, score: points, correctAnswer })
      io.to(duelId).emit('duel:player_answered', { userId: user.id })

      try { await triviaEngine.recordAnswer(user.id, q.id, correct, responseMs, 'DUEL') }
      catch { /* non-critical */ }

      if (room.answers.size === room.players.size) {
        if (room.timer) clearTimeout(room.timer)
        resolveRound(io, duelId)
      }
    })

    socket.on('disconnect', () => {
      rooms.forEach((room, duelId) => {
        if (room.players.has(user.id)) {
          io.to(duelId).emit('duel:player_disconnected', { userId: user.id })
        }
      })
    })
  })
}

function sendQ(io: Server, duelId: string) {
  const room = rooms.get(duelId)
  if (!room || room.status !== 'active') return

  const q = room.questions[room.qIndex]
  if (!q) { endDuel(io, duelId); return }

  room.answers.clear()

  // Shuffle options; store shuffled correct key on question object
  const rawOpts: { key: string; text: string }[] = Array.isArray(q.answerOptions)
    ? q.answerOptions
    : (q.answerOptions?.options ?? [])

  const correctText = rawOpts.find((o: any) => o.key === q.correctAnswer)?.text
  const shuffled = [...rawOpts].sort(() => Math.random() - 0.5)
  const keys = ['A', 'B', 'C', 'D']
  let newKey = q.correctAnswer as string
  const options = shuffled.map((o: any, i: number) => {
    if (o.text === correctText) newKey = keys[i]
    return { key: keys[i], text: o.text }
  })
  q._correctKey = newKey

  const timeLimit = 20_000
  io.to(duelId).emit('duel:question', {
    index: room.qIndex,
    round: room.round,
    total: room.totalRounds,
    question: { id: q.id, text: q.questionText, options, imageUrl: q.imageUrl, difficulty: q.difficulty },
    timeLimit,
  })

  room.timer = setTimeout(() => resolveRound(io, duelId), timeLimit + 500)
}

function resolveRound(io: Server, duelId: string) {
  const room = rooms.get(duelId)
  if (!room || room.status !== 'active') return

  const q = room.questions[room.qIndex]
  if (!q) { endDuel(io, duelId); return }

  const correctAnswer: string = q._correctKey ?? q.correctAnswer

  let roundWinner: string | null = null
  let fastest = Infinity
  room.answers.forEach((ans, uid) => {
    if (ans.correct && ans.responseMs < fastest) { fastest = ans.responseMs; roundWinner = uid }
  })
  if (roundWinner) room.players.get(roundWinner)!.roundsWon++

  const scores: Record<string, { score: number; roundsWon: number }> = {}
  room.players.forEach((p, uid) => { scores[uid] = { score: p.score, roundsWon: p.roundsWon } })

  io.to(duelId).emit('duel:round_result', { roundWinner, correctAnswer, scores, explanation: q.explanation ?? null })

  room.qIndex++
  room.round++

  const maxWon = Math.max(...[...room.players.values()].map(p => p.roundsWon))
  const needed = Math.ceil(room.totalRounds / 2)

  if (maxWon >= needed || room.round > room.totalRounds) {
    setTimeout(() => endDuel(io, duelId), 3000)
  } else {
    setTimeout(() => sendQ(io, duelId), 3000)
  }
}

async function endDuel(io: Server, duelId: string) {
  const room = rooms.get(duelId)
  if (!room || room.status === 'finished') return
  room.status = 'finished'
  if (room.timer) clearTimeout(room.timer)

  try {
    const results = [...room.players.values()].map(p => ({
      userId: p.userId, score: p.score, roundsWon: p.roundsWon, answers: [],
    }))
    const { winnerId } = await duelService.completeDuel(duelId, results)

    const scores: Record<string, { score: number; roundsWon: number }> = {}
    room.players.forEach((p, uid) => { scores[uid] = { score: p.score, roundsWon: p.roundsWon } })
    io.to(duelId).emit('duel:ended', { winnerId, scores })
  } catch (e) {
    console.error('[WS] endDuel error', e)
    io.to(duelId).emit('error', { message: 'Duel completion failed' })
  }

  setTimeout(() => rooms.delete(duelId), 120_000)
}
