import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Clock, Trophy } from 'lucide-react'
import clsx from 'clsx'
import { useDuelStore } from '../stores/duel'
import { useDuelSocket, getSocket } from '../hooks/useWebSocket'
import { useAuthStore } from '../stores/auth'

export default function DuelRoom() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const {
    status, currentQuestion, round, totalRounds,
    myAnswer, lastResult, players, winnerId,
    setMyAnswer, setDuel, reset,
  } = useDuelStore()
  const { submitAnswer } = useDuelSocket(id ?? null)

  const [timeLeft, setTimeLeft]       = useState(20)
  const [answerResult, setAnswerResult] = useState<{ correct: boolean; correctAnswer: string } | null>(null)
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef   = useRef<number>(Date.now())

  // Init room
  useEffect(() => {
    if (id) setDuel(id)
    return () => { reset() }
  }, [id])

  // Listen for per-player answer confirmation
  useEffect(() => {
    const s = getSocket()
    const handler = (r: any) => setAnswerResult(r)
    s.on('duel:answer_result', handler)
    return () => { s.off('duel:answer_result', handler) }
  }, [])

  // Reset local answer result on new question
  useEffect(() => {
    setAnswerResult(null)
  }, [currentQuestion?.id])

  // Countdown timer
  useEffect(() => {
    if (status !== 'active' || !currentQuestion) return
    startRef.current = Date.now()
    setTimeLeft(20)
    timerRef.current = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { clearInterval(timerRef.current!); return 0 } return t - 1 })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [currentQuestion?.id, status])

  const handleAnswer = (key: string) => {
    if (myAnswer || status !== 'active') return
    if (timerRef.current) clearInterval(timerRef.current)
    const ms = Date.now() - startRef.current
    setMyAnswer(key)
    submitAnswer(key, ms)
  }

  const myId = user?.id ?? ''

  // ── Waiting ────────────────────────────────────────────────────
  if (status === 'idle' || status === 'waiting') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-brand-50 to-white">
        <div className="w-20 h-20 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-6" />
        <h2 className="text-xl font-bold text-gray-900">Waiting for opponent…</h2>
        <p className="text-gray-400 text-sm mt-2">The duel starts when your opponent joins</p>

        {Object.keys(players).length > 0 && (
          <div className="mt-6 space-y-2 w-full max-w-xs">
            {Object.values(players).map(p => (
              <div key={p.userId} className="card flex items-center gap-3">
                <div className="w-8 h-8 bg-brand-100 rounded-xl flex items-center justify-center text-sm font-bold text-brand-700">
                  {p.username[0].toUpperCase()}
                </div>
                <span className="font-medium text-gray-900">{p.username}</span>
                <span className="ml-auto text-xs text-emerald-600 font-medium">Connected</span>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => navigate('/duel')} className="mt-8 text-gray-400 text-sm underline">
          Leave
        </button>
      </div>
    )
  }

  // ── Ended ──────────────────────────────────────────────────────
  if (status === 'ended' && winnerId) {
    const won = winnerId === myId
    return (
      <div className={clsx('min-h-screen flex flex-col items-center justify-center px-6', won ? 'bg-gradient-to-b from-amber-50 to-white' : 'bg-gradient-to-b from-brand-50 to-white')}>
        <div className="text-6xl mb-4">{won ? '🏆' : '😤'}</div>
        <h2 className="text-3xl font-extrabold mb-2">{won ? 'You Won!' : 'You Lost'}</h2>
        <p className="text-gray-400 mb-8">{won ? 'Incredible!' : 'Better luck next time!'}</p>

        <div className="w-full max-w-xs space-y-3 mb-8">
          {Object.values(players).map(p => (
            <div key={p.userId} className={clsx('card flex items-center justify-between', p.userId === winnerId && 'ring-2 ring-amber-400')}>
              <div className="flex items-center gap-3">
                {p.userId === winnerId && <Trophy size={16} className="text-amber-500" />}
                <span className="font-bold text-gray-900">{p.username}{p.userId === myId ? ' (You)' : ''}</span>
              </div>
              <div className="text-right">
                <p className="font-extrabold text-brand-600">{p.score} pts</p>
                <p className="text-xs text-gray-400">{p.roundsWon} rounds</p>
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => navigate('/duel')} className="btn-primary max-w-xs">Play Again</button>
        <button onClick={() => navigate('/')} className="btn-ghost mt-3 w-full max-w-xs text-center">Home</button>
      </div>
    )
  }

  // ── Round result ───────────────────────────────────────────────
  if (status === 'round_result' && lastResult) {
    const correct = answerResult?.correct ?? false
    const correctKey = lastResult.correctAnswer
    const correctText = currentQuestion?.options.find(o => o.key === correctKey)?.text ?? correctKey

    return (
      <div className="min-h-screen flex flex-col px-4 pt-12">
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-5xl mb-4">{correct ? '✅' : '❌'}</div>
          <h2 className="text-2xl font-extrabold mb-4">{correct ? 'Correct!' : 'Wrong!'}</h2>

          <div className="card w-full max-w-xs text-center mb-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Correct answer</p>
            <p className="text-lg font-bold text-emerald-600">{correctText}</p>
          </div>

          {lastResult.explanation && (
            <div className="bg-brand-50 rounded-2xl p-4 w-full max-w-xs mb-4">
              <p className="text-sm text-brand-700">{lastResult.explanation}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 pb-8">
          {Object.values(players).map(p => (
            <div key={p.userId} className="flex-1 card text-center py-3">
              <p className="text-xs text-gray-400 truncate mb-1">{p.username}</p>
              <p className="text-xl font-extrabold text-brand-600">{p.score}</p>
              <p className="text-xs text-gray-400">{p.roundsWon}W</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Active question ────────────────────────────────────────────
  if (!currentQuestion) return null

  const pct   = (timeLeft / 20) * 100
  const tColor = timeLeft > 10 ? 'bg-brand-500' : timeLeft > 5 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="min-h-screen flex flex-col px-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-400">Round {round}/{totalRounds}</span>
        <div className="flex items-center gap-1.5">
          <Clock size={14} className={timeLeft <= 5 ? 'text-red-500' : 'text-gray-400'} />
          <span className={clsx('font-bold tabular-nums', timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-gray-700')}>
            {timeLeft}s
          </span>
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-1.5 bg-surface-3 rounded-full mb-5 overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all duration-1000', tColor)} style={{ width: `${pct}%` }} />
      </div>

      {/* Scores */}
      <div className="flex gap-3 mb-5">
        {Object.values(players).map(p => (
          <div key={p.userId} className={clsx('flex-1 card text-center py-2', p.userId === myId && 'ring-2 ring-brand-200')}>
            <p className="text-xs text-gray-400 truncate">{p.username}{p.userId === myId ? ' (You)' : ''}</p>
            <p className="text-lg font-extrabold text-brand-600">{p.score}</p>
          </div>
        ))}
      </div>

      {/* Question */}
      <div className="card-lg mb-5 flex-1 flex flex-col justify-center">
        {currentQuestion.imageUrl && (
          <img src={currentQuestion.imageUrl} alt="" className="w-full rounded-xl mb-4 object-cover max-h-40" />
        )}
        <span className={clsx('badge mb-3 self-start', {
          'bg-emerald-100 text-emerald-700': currentQuestion.difficulty === 'EASY',
          'bg-amber-100 text-amber-700':    currentQuestion.difficulty === 'MEDIUM',
          'bg-red-100 text-red-700':        currentQuestion.difficulty === 'HARD',
        })}>
          {currentQuestion.difficulty}
        </span>
        <p className="text-xl font-bold text-gray-900 leading-snug">{currentQuestion.text}</p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-3 pb-6">
        {currentQuestion.options.map(opt => {
          const selected   = myAnswer === opt.key
          const isCorrect  = answerResult && opt.key === answerResult.correctAnswer
          const isWrong    = selected && answerResult && !answerResult.correct
          return (
            <button
              key={opt.key}
              onClick={() => handleAnswer(opt.key)}
              disabled={!!myAnswer}
              className={clsx(
                'p-4 rounded-2xl border-2 text-sm font-semibold text-left transition-all active:scale-95',
                !myAnswer                       && 'border-surface-3 bg-white hover:border-brand-300',
                selected && !answerResult        && 'border-brand-500 bg-brand-50 text-brand-700',
                isCorrect                        && 'border-emerald-400 bg-emerald-50 text-emerald-700',
                isWrong                          && 'border-red-400 bg-red-50 text-red-700',
                myAnswer && !selected && !isCorrect && 'opacity-50',
              )}
            >
              <span className="inline-block w-6 h-6 rounded-lg bg-current/10 text-center text-xs font-bold leading-6 mr-2">
                {opt.key}
              </span>
              {opt.text}
            </button>
          )
        })}
      </div>
    </div>
  )
}
