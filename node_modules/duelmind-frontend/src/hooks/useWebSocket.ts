import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useDuelStore } from '../stores/duel'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/', {
      auth: (cb) => cb({ token: localStorage.getItem('accessToken') }),
      transports: ['websocket', 'polling'],
      autoConnect: false,
    })
  }
  return socket
}

export function destroySocket() {
  if (socket) { socket.disconnect(); socket = null }
}

export function useDuelSocket(duelId: string | null) {
  const { setQuestion, setRoundResult, updateScore, setWinner, setPlayers } = useDuelStore()
  const joinedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!duelId) return
    const s = getSocket()
    if (!s.connected) s.connect()

    if (joinedRef.current !== duelId) {
      s.emit('duel:join', { duelId })
      joinedRef.current = duelId
    }

    const onJoined = ({ userId, username }: any) => {
      useDuelStore.setState((st) => ({
        players: {
          ...st.players,
          [userId]: st.players[userId] ?? { userId, username, score: 0, roundsWon: 0 },
        },
      }))
    }

    const onStarted = ({ players }: any) => {
      const map: Record<string, any> = {}
      players.forEach((p: any) => { map[p.userId] = { ...p, score: 0, roundsWon: 0 } })
      setPlayers(map)
    }

    const onQuestion = ({ question, index, round, total, timeLimit }: any) => {
      setQuestion(question, index, round, total, timeLimit)
    }

    const onRoundResult = (result: any) => {
      const scores = result.scores ?? {}
      Object.entries(scores).forEach(([uid, s]: any) => updateScore(uid, s.score, s.roundsWon))
      setRoundResult({
        correct: false,
        score: 0,
        correctAnswer: result.correctAnswer,
        explanation: result.explanation ?? undefined,
        roundWinner: result.roundWinner,
      })
    }

    const onEnded = ({ winnerId, scores }: any) => {
      setWinner(winnerId, scores)
    }

    s.on('duel:player_joined', onJoined)
    s.on('duel:started', onStarted)
    s.on('duel:question', onQuestion)
    s.on('duel:round_result', onRoundResult)
    s.on('duel:ended', onEnded)

    return () => {
      s.off('duel:player_joined', onJoined)
      s.off('duel:started', onStarted)
      s.off('duel:question', onQuestion)
      s.off('duel:round_result', onRoundResult)
      s.off('duel:ended', onEnded)
    }
  }, [duelId])

  const submitAnswer = (answer: string, responseMs: number) => {
    if (!duelId) return
    getSocket().emit('duel:answer', { duelId, answer, responseMs })
  }

  return { submitAnswer }
}
