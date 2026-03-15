import { useNavigate } from 'react-router-dom'
import { Swords, BookOpen, Trophy, ChevronRight, Zap } from 'lucide-react'
import { useAuthStore } from '../stores/auth'

const MINI_GAMES = [
  { name: 'Reaction Tap',  emoji: '⚡', type: 'REACTION_TAP'  },
  { name: '1 Second',      emoji: '⏱️', type: 'ONE_SECOND'    },
  { name: 'Color Tap',     emoji: '🎨', type: 'COLOR_TAP'     },
  { name: 'Memory Flip',   emoji: '🧠', type: 'MEMORY_FLIP'   },
  { name: 'Pattern Match', emoji: '🔷', type: 'PATTERN_MATCH' },
  { name: 'Speed Choice',  emoji: '🚀', type: 'SPEED_CHOICE'  },
]

export default function Home() {
  const { user } = useAuthStore()
  const navigate  = useNavigate()

  const profile = user?.profile
  const xp      = profile?.totalXp ?? 0
  const wins    = profile?.totalWins ?? 0
  const duels   = profile?.totalDuels ?? 0

  return (
    <div className="min-h-screen px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-gray-400 text-sm">Welcome back,</p>
          <h1 className="text-2xl font-extrabold text-gray-900">
            {profile?.displayName || user?.username} 👋
          </h1>
        </div>
        <div className="bg-brand-50 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
          <Zap size={14} className="text-brand-500" />
          <span className="text-brand-600 font-bold text-sm">{xp.toLocaleString()} XP</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="card text-center">
          <p className="text-2xl font-extrabold text-gray-900">{wins}</p>
          <p className="text-xs text-gray-400 mt-0.5">Wins</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-extrabold text-gray-900">{duels}</p>
          <p className="text-xs text-gray-400 mt-0.5">Duels played</p>
        </div>
      </div>

      {/* Main CTA */}
      <button
        onClick={() => navigate('/duel')}
        className="w-full bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-3xl p-6 mb-4 flex items-center justify-between shadow-lg shadow-brand-200 active:scale-[0.98] transition-all"
      >
        <div>
          <p className="text-xs font-semibold text-brand-100 uppercase tracking-widest mb-1">Main Event</p>
          <p className="text-2xl font-extrabold">Start a Duel</p>
          <p className="text-brand-100 text-sm mt-1">Trivia or Reaction · Best of 3</p>
        </div>
        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
          <Swords size={28} />
        </div>
      </button>

      {/* Secondary */}
      <div className="space-y-3 mb-8">
        <button
          onClick={() => navigate('/learn')}
          className="w-full card flex items-center gap-4 active:scale-[0.98] transition-all text-left"
        >
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center flex-shrink-0">
            <BookOpen size={22} className="text-emerald-500" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-900">Learn Mode</p>
            <p className="text-sm text-gray-400">Practice questions · Review mistakes</p>
          </div>
          <ChevronRight size={18} className="text-gray-300" />
        </button>
        <button
          onClick={() => navigate('/leaderboard')}
          className="w-full card flex items-center gap-4 active:scale-[0.98] transition-all text-left"
        >
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Trophy size={22} className="text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-900">Leaderboard</p>
            <p className="text-sm text-gray-400">See where you rank globally</p>
          </div>
          <ChevronRight size={18} className="text-gray-300" />
        </button>
      </div>

      {/* Mini games */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Quick Games</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
          {MINI_GAMES.map(g => (
            <button
              key={g.type}
              onClick={() => navigate('/duel?mode=reaction')}
              className="flex-shrink-0 w-28 h-28 rounded-2xl bg-white border border-surface-3 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <span className="text-3xl">{g.emoji}</span>
              <span className="text-xs font-semibold text-gray-600 text-center leading-tight px-1">{g.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
