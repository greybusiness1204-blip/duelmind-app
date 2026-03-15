import { create } from 'zustand'

interface Player {
  userId: string
  username: string
  score: number
  roundsWon: number
}

interface Question {
  id: string
  text: string
  options: { key: string; text: string }[]
  imageUrl?: string
  difficulty: string
}

interface LastResult {
  correct: boolean
  score: number
  correctAnswer: string
  correctAnswerText?: string
  explanation?: string
  roundWinner?: string | null
}

interface DuelState {
  duelId: string | null
  players: Record<string, Player>
  currentQuestion: Question | null
  questionIndex: number
  round: number
  totalRounds: number
  timeLimit: number
  myAnswer: string | null
  lastResult: LastResult | null
  winnerId: string | null
  status: 'idle' | 'waiting' | 'active' | 'round_result' | 'ended'
  setDuel: (id: string) => void
  setPlayers: (players: Record<string, Player>) => void
  setQuestion: (q: Question, index: number, round: number, total: number, timeLimit: number) => void
  setMyAnswer: (answer: string) => void
  setRoundResult: (result: LastResult) => void
  updateScore: (userId: string, score: number, roundsWon: number) => void
  setWinner: (winnerId: string, scores: Record<string, { score: number; roundsWon: number }>) => void
  reset: () => void
}

const init = {
  duelId: null,
  players: {},
  currentQuestion: null,
  questionIndex: 0,
  round: 1,
  totalRounds: 3,
  timeLimit: 20000,
  myAnswer: null,
  lastResult: null,
  winnerId: null,
  status: 'idle' as const,
}

export const useDuelStore = create<DuelState>((set) => ({
  ...init,
  setDuel: (duelId) => set({ duelId, status: 'waiting' }),
  setPlayers: (players) => set({ players }),
  setQuestion: (q, index, round, total, timeLimit) =>
    set({ currentQuestion: q, questionIndex: index, round, totalRounds: total, timeLimit, myAnswer: null, lastResult: null, status: 'active' }),
  setMyAnswer: (answer) => set({ myAnswer: answer }),
  setRoundResult: (result) => set((s) => ({ lastResult: result, status: 'round_result', currentQuestion: s.currentQuestion })),
  updateScore: (userId, score, roundsWon) =>
    set((s) => ({ players: { ...s.players, [userId]: { ...s.players[userId], score, roundsWon } } })),
  setWinner: (winnerId, scores) =>
    set((s) => {
      const players = { ...s.players }
      Object.entries(scores).forEach(([uid, sc]) => {
        if (players[uid]) players[uid] = { ...players[uid], ...sc }
      })
      return { winnerId, players, status: 'ended' }
    }),
  reset: () => set(init),
}))
