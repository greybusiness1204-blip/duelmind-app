import { useState, useEffect } from 'react'
import { Trophy } from 'lucide-react'
import clsx from 'clsx'
import api from '../api/client'
import { useAuthStore } from '../stores/auth'

const BOARDS = [
  { key: 'GLOBAL',   label: '🌍 Global'   },
  { key: 'TRIVIA',   label: '🧠 Trivia'   },
  { key: 'REACTION', label: '⚡ Reaction'  },
]

export default function LeaderboardPage() {
  const { user } = useAuthStore()
  const [active, setActive] = useState('GLOBAL')
  const [data, setData]     = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get(`/leaderboard/${active}`)
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [active])

  return (
    <div className="min-h-screen px-4 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center">
          <Trophy size={20} className="text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold">Leaderboard</h1>
          <p className="text-gray-400 text-sm">Top players worldwide</p>
        </div>
      </div>

      {/* Board tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-4 px-4">
        {BOARDS.map(b => (
          <button key={b.key} onClick={() => setActive(b.key)}
            className={clsx('flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all', active === b.key ? 'bg-brand-500 text-white' : 'bg-surface-2 text-gray-600')}>
            {b.label}
          </button>
        ))}
      </div>

      {/* My rank */}
      {data?.myRank && (
        <div className="card mb-4 flex items-center gap-3 bg-brand-50 border-brand-200">
          <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center font-extrabold text-brand-600 flex-shrink-0">
            #{data.myRank}
          </div>
          <div>
            <p className="font-bold text-gray-900">Your rank</p>
            <p className="text-sm text-brand-600 font-semibold">{data.myScore?.toLocaleString()} pts</p>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 bg-surface-2 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {(data?.entries ?? []).map((entry: any) => {
            const rank   = entry.rank
            const isMe   = entry.userId === user?.id
            const medal  = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
            const name   = entry.user?.profile?.displayName || entry.user?.username || '?'
            return (
              <div key={entry.id} className={clsx('card flex items-center gap-3', isMe && 'ring-2 ring-brand-200 bg-brand-50')}>
                <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center font-bold flex-shrink-0',
                  medal ? 'text-xl bg-amber-50' : 'text-sm bg-surface-2 text-gray-500')}>
                  {medal ?? rank}
                </div>
                <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-700 flex-shrink-0">
                  {name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={clsx('font-bold truncate', isMe ? 'text-brand-700' : 'text-gray-900')}>
                    {name}{isMe ? ' (you)' : ''}
                  </p>
                  <p className="text-xs text-gray-400">
                    {entry.user?.profile?.totalWins ?? 0}W · {entry.user?.profile?.totalDuels ?? 0} duels
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-extrabold text-brand-600">{entry.score?.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">pts</p>
                </div>
              </div>
            )
          })}
          {!loading && data?.entries?.length === 0 && (
            <p className="text-center text-gray-400 py-12">No entries yet. Play some duels!</p>
          )}
        </div>
      )}
    </div>
  )
}
