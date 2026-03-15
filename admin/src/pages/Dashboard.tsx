import { useEffect, useState } from 'react'
import { Users, Trophy, HelpCircle, AlertTriangle, TrendingUp, Gamepad2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../api'

export default function Dashboard() {
  const [overview, setOverview] = useState<any>(null)
  const [games,    setGames]    = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/admin/analytics/overview'),
      api.get('/admin/analytics/games'),
    ]).then(([o, g]) => { setOverview(o.data); setGames(g.data) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading…</div>

  const stats = [
    { label: 'Total Users',    value: overview?.totalUsers ?? 0,             icon: Users,         color: 'text-indigo-600', bg: 'bg-indigo-50'  },
    { label: 'New Today',      value: overview?.dailyUsers ?? 0,             icon: TrendingUp,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Duels Played',   value: overview?.totalDuels ?? 0,             icon: Trophy,        color: 'text-amber-600',  bg: 'bg-amber-50'   },
    { label: 'Q\'s This Week', value: overview?.totalQuestionAnswers ?? 0,   icon: HelpCircle,    color: 'text-purple-600', bg: 'bg-purple-50'  },
    { label: 'Flagged Scores', value: overview?.flaggedScores ?? 0,          icon: AlertTriangle, color: 'text-red-600',    bg: 'bg-red-50'     },
  ]

  const chartData = games.map((g: any) => ({
    name: g.gameType.replace('_', ' '),
    plays: g._count?.gameType ?? 0,
    avgScore: Math.round(g._avg?.score ?? 0),
  }))

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Platform overview</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="card">
            <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
              <s.icon size={18} className={s.color} />
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{s.value.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Game plays chart */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Gamepad2 size={16} className="text-indigo-600" />
            <h2 className="font-semibold text-gray-700 text-sm">Game Plays</h2>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="plays" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">No game data yet</p>
          )}
        </div>

        {/* Top categories */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle size={16} className="text-indigo-600" />
            <h2 className="font-semibold text-gray-700 text-sm">Top Categories</h2>
          </div>
          {(overview?.topCategories ?? []).length > 0 ? (
            <div className="space-y-3">
              {overview.topCategories.map((c: any, i: number) => {
                const max = overview.topCategories[0]?.count ?? 1
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-5">#{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{c.category}</span>
                        <span className="text-xs text-gray-400">{c.count}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full"
                             style={{ width: `${Math.min(100, (c.count / max) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">No category data yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
