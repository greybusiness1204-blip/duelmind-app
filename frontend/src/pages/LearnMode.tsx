import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react'
import clsx from 'clsx'
import api from '../api/client'

type Screen = 'select' | 'playing' | 'result'
type Mode = 'LEARN' | 'REVIEW'

interface Question {
  id: string
  questionText: string
  options: { key: string; text: string }[]
  difficulty: string
  categoryId: string
  imageUrl?: string
}

interface AnswerResult {
  correct: boolean
  correctAnswerText: string
  explanation?: string | null
}

export default function LearnMode() {
  const [screen, setScreen]       = useState<Screen>('select')
  const [mode, setMode]           = useState<Mode>('LEARN')
  const [categoryId, setCategoryId] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [categories, setCategories] = useState<any[]>([])
  const [questions, setQuestions]   = useState<Question[]>([])
  const [index, setIndex]           = useState(0)
  const [selected, setSelected]     = useState<string | null>(null)
  const [result, setResult]         = useState<AnswerResult | null>(null)
  const [score, setScore]           = useState({ correct: 0, total: 0 })
  const [loading, setLoading]       = useState(false)
  const startRef = useRef<number>(Date.now())

  useEffect(() => {
    api.get('/questions/categories').then(r => setCategories(r.data))
  }, [])

  const startSession = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ count: '10', context: mode })
      if (categoryId) params.set('categoryId', categoryId)
      if (difficulty)  params.set('difficulty', difficulty)
      const { data } = await api.get(`/questions/next?${params}`)
      if (!data.length) { alert('No questions found for this selection. Try different filters.'); return }
      setQuestions(data)
      setIndex(0)
      setScore({ correct: 0, total: 0 })
      setSelected(null)
      setResult(null)
      startRef.current = Date.now()
      setScreen('playing')
    } catch { alert('Failed to load questions') }
    finally { setLoading(false) }
  }

  const answer = async (key: string) => {
    if (selected) return
    const ms = Date.now() - startRef.current
    setSelected(key)
    const q = questions[index]
    const chosenText = q.options.find(o => o.key === key)?.text ?? ''
    try {
      const { data } = await api.post('/questions/answer', {
        questionId: q.id,
        answer: key,
        answerText: chosenText,
        responseMs: ms,
        context: mode,
      })
      setResult(data)
      setScore(s => ({ correct: s.correct + (data.correct ? 1 : 0), total: s.total + 1 }))
    } catch { setResult({ correct: false, correctAnswerText: '', explanation: null }) }
    startRef.current = Date.now()
  }

  const next = () => {
    if (index >= questions.length - 1) { setScreen('result'); return }
    setIndex(i => i + 1)
    setSelected(null)
    setResult(null)
  }

  // ── Select ─────────────────────────────────────────────────────
  if (screen === 'select') {
    return (
      <div className="min-h-screen px-4 pt-6">
        <h1 className="text-2xl font-extrabold mb-1">Learn Mode</h1>
        <p className="text-gray-400 mb-6 text-sm">Practice questions and review your mistakes</p>

        <div className="flex bg-surface-2 rounded-xl p-1 mb-6">
          {(['LEARN', 'REVIEW'] as Mode[]).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === m ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
              {m === 'LEARN' ? '📚 Practice' : '🔁 Review Mistakes'}
            </button>
          ))}
        </div>

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Category</p>
        <div className="flex flex-wrap gap-2 mb-5">
          <button onClick={() => setCategoryId('')}
            className={clsx('px-3 py-1.5 rounded-xl text-sm font-medium border transition-all', !categoryId ? 'bg-brand-500 text-white border-brand-500' : 'border-surface-3 text-gray-600 bg-white')}>
            All
          </button>
          {categories.map(c => (
            <button key={c.id} onClick={() => setCategoryId(c.id)}
              className={clsx('px-3 py-1.5 rounded-xl text-sm font-medium border transition-all', categoryId === c.id ? 'bg-brand-500 text-white border-brand-500' : 'border-surface-3 text-gray-600 bg-white')}>
              {c.icon} {c.name}
            </button>
          ))}
        </div>

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Difficulty</p>
        <div className="flex gap-2 mb-8">
          {[['', 'Any'], ['EASY', '🟢 Easy'], ['MEDIUM', '🟡 Medium'], ['HARD', '🔴 Hard']].map(([val, label]) => (
            <button key={val} onClick={() => setDifficulty(val)}
              className={clsx('flex-1 py-2 rounded-xl text-xs font-semibold border transition-all', difficulty === val ? 'bg-brand-500 text-white border-brand-500' : 'border-surface-3 text-gray-600 bg-white')}>
              {label}
            </button>
          ))}
        </div>

        <button onClick={startSession} className="btn-primary" disabled={loading}>
          {loading ? '…' : 'Start Session (10 questions)'}
        </button>
      </div>
    )
  }

  // ── Result ─────────────────────────────────────────────────────
  if (screen === 'result') {
    const pct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-4">{pct >= 80 ? '🌟' : pct >= 50 ? '👍' : '📖'}</div>
        <h2 className="text-3xl font-extrabold mb-2">Session Complete!</h2>
        <p className="text-gray-400 mb-8">{score.correct} out of {score.total} correct</p>
        <div className="w-32 h-32 rounded-full bg-brand-50 flex items-center justify-center mb-8">
          <p className="text-4xl font-extrabold text-brand-600">{pct}%</p>
        </div>
        <button className="btn-primary max-w-xs" onClick={() => setScreen('select')}>Play Again</button>
      </div>
    )
  }

  // ── Playing ────────────────────────────────────────────────────
  const q = questions[index]
  if (!q) return null

  return (
    <div className="min-h-screen flex flex-col px-4 pt-4">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => setScreen('select')} className="text-gray-400"><ArrowLeft size={20} /></button>
        <div className="flex-1 h-2 bg-surface-3 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full transition-all"
               style={{ width: `${(index / questions.length) * 100}%` }} />
        </div>
        <span className="text-sm font-medium text-gray-400">{index + 1}/{questions.length}</span>
      </div>

      <div className="card-lg mb-5 flex-1 flex flex-col justify-center">
        {q.imageUrl && <img src={q.imageUrl} alt="" className="w-full rounded-xl mb-4 object-cover max-h-40" />}
        <span className={clsx('badge mb-3 self-start', {
          'bg-emerald-100 text-emerald-700': q.difficulty === 'EASY',
          'bg-amber-100 text-amber-700':    q.difficulty === 'MEDIUM',
          'bg-red-100 text-red-700':        q.difficulty === 'HARD',
        })}>
          {q.difficulty}
        </span>
        <p className="text-xl font-bold text-gray-900 leading-snug">{q.questionText}</p>

        {result && (
          <div className={clsx('mt-4 rounded-xl p-3 flex items-start gap-2', result.correct ? 'bg-emerald-50' : 'bg-red-50')}>
            {result.correct
              ? <CheckCircle2 size={18} className="text-emerald-500 mt-0.5 flex-shrink-0" />
              : <XCircle     size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
            }
            <div>
              {!result.correct && result.correctAnswerText && (
                <p className="text-sm font-semibold text-red-700 mb-1">Correct: {result.correctAnswerText}</p>
              )}
              {result.explanation && (
                <p className={clsx('text-sm', result.correct ? 'text-emerald-700' : 'text-red-700')}>
                  {result.explanation}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2 pb-6">
        {q.options.map(opt => {
          const isSel     = selected === opt.key
          const isCorrect = result && opt.text === result.correctAnswerText
          const isWrong   = isSel && result && !result.correct
          return (
            <button key={opt.key} onClick={() => answer(opt.key)} disabled={!!selected}
              className={clsx(
                'w-full p-4 rounded-2xl border-2 text-sm font-semibold text-left flex items-center gap-3 transition-all active:scale-[0.98]',
                !selected    && 'border-surface-3 bg-white',
                isSel && !result && 'border-brand-400 bg-brand-50',
                isCorrect    && 'border-emerald-400 bg-emerald-50 text-emerald-700',
                isWrong      && 'border-red-400 bg-red-50 text-red-700',
                selected && !isSel && !isCorrect && 'opacity-50',
              )}>
              <span className="w-7 h-7 rounded-lg bg-current/10 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {opt.key}
              </span>
              {opt.text}
            </button>
          )
        })}
        {result && (
          <button className="btn-primary mt-2" onClick={next}>
            {index >= questions.length - 1 ? 'See Results' : 'Next Question →'}
          </button>
        )}
      </div>
    </div>
  )
}
