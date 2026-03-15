import { useState, useEffect } from 'react'
import { Edit2, Check, X, LogOut } from 'lucide-react'
import api from '../api/client'
import { useAuthStore } from '../stores/auth'

export default function ProfilePage() {
  const { user, logout, loadUser } = useAuthStore()
  const [editing, setEditing]     = useState(false)
  const [displayName, setName]    = useState(user?.profile?.displayName ?? '')
  const [saving, setSaving]       = useState(false)
  const [stats, setStats]         = useState<{ total: number; correct: number; accuracy: number } | null>(null)

  useEffect(() => {
    api.get('/questions/stats/me').then(r => setStats(r.data)).catch(() => {})
    setName(user?.profile?.displayName ?? '')
  }, [user])

  const save = async () => {
    if (!displayName.trim()) return
    setSaving(true)
    try {
      await api.patch('/profile/me', { displayName: displayName.trim() })
      await loadUser()
      setEditing(false)
    } finally { setSaving(false) }
  }

  const changeLang = (lang: string) => {
    api.patch('/profile/me', { language: lang }).then(() => loadUser()).catch(() => {})
  }

  const winRate = user?.profile?.totalDuels
    ? Math.round(((user.profile.totalWins ?? 0) / user.profile.totalDuels) * 100)
    : 0

  const avatar = (user?.profile?.displayName || user?.username || '?')[0].toUpperCase()

  return (
    <div className="min-h-screen px-4 pt-6">
      {/* Avatar + name */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-3xl font-extrabold flex-shrink-0">
          {avatar}
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                className="input-field py-2 text-lg font-bold flex-1"
                value={displayName}
                maxLength={30}
                autoFocus
                onChange={e => setName(e.target.value)}
              />
              <button onClick={save} disabled={saving}
                className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center flex-shrink-0">
                <Check size={16} className="text-white" />
              </button>
              <button onClick={() => { setEditing(false); setName(user?.profile?.displayName ?? '') }}
                className="w-9 h-9 rounded-xl bg-surface-2 flex items-center justify-center flex-shrink-0">
                <X size={16} className="text-gray-600" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-gray-900 truncate">
                {user?.profile?.displayName}
              </h1>
              <button onClick={() => setEditing(true)} className="text-gray-400 flex-shrink-0">
                <Edit2 size={15} />
              </button>
            </div>
          )}
          <p className="text-gray-400 text-sm">@{user?.username}</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <span className="badge bg-brand-50 text-brand-600 font-semibold">
              {(user?.profile?.totalXp ?? 0).toLocaleString()} XP
            </span>
            {user?.role !== 'USER' && (
              <span className="badge bg-amber-100 text-amber-700">{user?.role}</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Duels',    value: user?.profile?.totalDuels ?? 0 },
          { label: 'Wins',     value: user?.profile?.totalWins  ?? 0 },
          { label: 'Win Rate', value: `${winRate}%`               },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <p className="text-2xl font-extrabold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Trivia accuracy */}
      {stats && (
        <div className="card mb-6">
          <p className="font-bold text-gray-700 mb-3">Trivia Stats</p>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Questions answered</span>
            <span className="font-semibold text-gray-900">{stats.total}</span>
          </div>
          <div className="flex justify-between text-sm mb-3">
            <span className="text-gray-400">Accuracy</span>
            <span className="font-semibold text-emerald-600">{stats.accuracy}%</span>
          </div>
          <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all"
                 style={{ width: `${stats.accuracy}%` }} />
          </div>
        </div>
      )}

      {/* Language */}
      <div className="card mb-6">
        <p className="font-bold text-gray-700 mb-3">Language</p>
        <div className="flex gap-2">
          {[['en', '🇬🇧 EN'], ['az', '🇦🇿 AZ'], ['ru', '🇷🇺 RU']].map(([code, label]) => (
            <button
              key={code}
              onClick={() => changeLang(code)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                user?.profile?.language === code
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'border-surface-3 text-gray-600 bg-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-red-200 text-red-500 font-semibold active:scale-95 transition-all"
      >
        <LogOut size={18} /> Sign Out
      </button>
    </div>
  )
}
