import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, X, Ban, CheckCircle, AlertTriangle, ToggleLeft, ToggleRight, Save } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import clsx from 'clsx'
import api from '../api'

// ─── Categories ────────────────────────────────────────────────
export function Categories() {
  const [cats, setCats]       = useState<any[]>([])
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm]       = useState({ name: '', slug: '', icon: '', color: '#6366f1' })

  const load = () => api.get('/admin/categories').then(r => setCats(r.data))
  useEffect(() => { load() }, [])

  const open = (c?: any) => {
    setForm(c ? { name: c.name, slug: c.slug, icon: c.icon ?? '', color: c.color ?? '#6366f1' } : { name: '', slug: '', icon: '', color: '#6366f1' })
    setEditing(c ?? null)
    setModal(true)
  }

  const save = async () => {
    if (editing) await api.put(`/admin/categories/${editing.id}`, form)
    else await api.post('/admin/categories', form)
    setModal(false); load()
  }

  const del = async (id: string) => {
    if (!confirm('Delete? This may affect existing questions.')) return
    await api.delete(`/admin/categories/${id}`); load()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500">{cats.length} categories</p>
        </div>
        <button onClick={() => open()} className="btn-primary flex items-center gap-1.5"><Plus size={14} />Add Category</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cats.map(c => (
          <div key={c.id} className="card flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ backgroundColor: (c.color || '#6366f1') + '20' }}>
              {c.icon || '📁'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 truncate">{c.name}</p>
              <p className="text-xs text-gray-400">{c.slug} · {c._count?.questions ?? 0} questions</p>
              <span className={`text-xs font-medium ${c.isActive ? 'text-emerald-600' : 'text-gray-400'}`}>
                {c.isActive ? '● Active' : '○ Inactive'}
              </span>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => open(c)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-indigo-600"><Edit2 size={14} /></button>
              <button onClick={() => del(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">{editing ? 'Edit Category' : 'Add Category'}</h2>
              <button onClick={() => setModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Name *</label>
                <input className="input" placeholder="Science" value={form.name}
                  onChange={e => {
                    const name = e.target.value
                    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                    setForm(f => ({ ...f, name, slug }))
                  }} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Slug</label>
                <input className="input font-mono" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Icon (emoji)</label>
                  <input className="input text-2xl text-center" maxLength={4} placeholder="🔬"
                    value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Color</label>
                  <input type="color" className="input h-10 p-1 cursor-pointer"
                    value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button className="btn-secondary flex-1" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={save} disabled={!form.name || !form.slug}>
                {editing ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Users ─────────────────────────────────────────────────────
export function UsersPage() {
  const [users, setUsers]   = useState<any[]>([])
  const [total, setTotal]   = useState(0)
  const [page, setPage]     = useState(1)
  const [search, setSearch] = useState('')
  const [susp, setSusp]     = useState('')
  const [loading, setLoading] = useState(false)
  const [flagModal, setFlagModal] = useState<any>(null)
  const [flags, setFlags]   = useState<any[]>([])

  const load = async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) p.set('search', search)
      if (susp)   p.set('suspended', susp)
      const { data } = await api.get(`/admin/users?${p}`)
      setUsers(data.users); setTotal(data.total)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page, susp])
  useEffect(() => { const t = setTimeout(load, 400); return () => clearTimeout(t) }, [search])

  const toggleSuspend = async (u: any) => {
    if (!confirm(`${u.isSuspended ? 'Unsuspend' : 'Suspend'} ${u.username}?`)) return
    await api.patch(`/admin/users/${u.id}/suspend`, { suspend: !u.isSuspended }); load()
  }

  const openFlags = async (u: any) => {
    const { data } = await api.get(`/admin/users/${u.id}/flags`)
    setFlags(data); setFlagModal(u)
  }

  const roleColor: Record<string, string> = {
    USER: 'bg-gray-100 text-gray-600',
    ADMIN: 'bg-indigo-100 text-indigo-700',
    SUPERADMIN: 'bg-purple-100 text-purple-700',
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500">{total.toLocaleString()} registered</p>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <input className="input pl-4" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={susp} onChange={e => setSusp(e.target.value)}>
          <option value="">All users</option>
          <option value="true">Suspended only</option>
          <option value="false">Active only</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="th">User</th>
              <th className="th">Role</th>
              <th className="th">Stats</th>
              <th className="th">Joined</th>
              <th className="th">Status</th>
              <th className="th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading
              ? <tr><td colSpan={6} className="td text-center text-gray-400 py-10">Loading…</td></tr>
              : users.map(u => (
                <tr key={u.id} className={clsx('hover:bg-gray-50', u.isSuspended && 'opacity-60')}>
                  <td className="td">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700 flex-shrink-0">
                        {(u.profile?.displayName || u.username)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{u.profile?.displayName || u.username}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="td">
                    <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', roleColor[u.role])}>{u.role}</span>
                  </td>
                  <td className="td text-xs text-gray-500">{u.profile?.totalWins ?? 0}W / {u.profile?.totalDuels ?? 0} duels</td>
                  <td className="td text-xs text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="td">
                    <span className={clsx('text-xs font-medium flex items-center gap-1', u.isSuspended ? 'text-red-600' : 'text-emerald-600')}>
                      {u.isSuspended ? <Ban size={12} /> : <CheckCircle size={12} />}
                      {u.isSuspended ? 'Suspended' : 'Active'}
                    </span>
                  </td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openFlags(u)} title="View flags"
                        className="p-1.5 hover:bg-amber-50 rounded-lg text-gray-400 hover:text-amber-600">
                        <AlertTriangle size={14} />
                      </button>
                      <button onClick={() => toggleSuspend(u)}
                        className={clsx('p-1.5 rounded-lg text-gray-400 transition-colors',
                          u.isSuspended ? 'hover:bg-emerald-50 hover:text-emerald-600' : 'hover:bg-red-50 hover:text-red-600')}>
                        {u.isSuspended ? <CheckCircle size={14} /> : <Ban size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {total > 20 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">{(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</p>
          <div className="flex gap-2">
            <button className="btn-secondary py-1.5 text-xs" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</button>
            <button className="btn-secondary py-1.5 text-xs" onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total}>Next</button>
          </div>
        </div>
      )}

      {flagModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={e => e.target === e.currentTarget && setFlagModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Flagged scores — {flagModal.username}</h2>
              <button onClick={() => setFlagModal(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-5">
              {flags.length === 0
                ? <p className="text-center text-gray-400 py-6 text-sm">No flagged scores</p>
                : flags.map(f => (
                  <div key={f.id} className="bg-red-50 rounded-xl p-3 mb-3">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-semibold text-gray-900">{f.gameType}</span>
                      <span className="text-xs text-gray-400">{new Date(f.playedAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-700">Score: <strong>{f.score}</strong> · Duration: {f.durationMs}ms</p>
                    <p className="text-xs text-red-600 mt-1">⚠ {f.flagReason}</p>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Games ─────────────────────────────────────────────────────
const GAME_META: Record<string, { emoji: string; name: string; desc: string }> = {
  REACTION_TAP:  { emoji: '⚡', name: 'Reaction Tap',  desc: 'Tap as fast as possible when prompted' },
  ONE_SECOND:    { emoji: '⏱️', name: '1 Second',       desc: 'Stop the timer at exactly 1 second' },
  COLOR_TAP:     { emoji: '🎨', name: 'Color Tap',      desc: 'Tap the matching color name' },
  MEMORY_FLIP:   { emoji: '🧠', name: 'Memory Flip',    desc: 'Match pairs from memory' },
  PATTERN_MATCH: { emoji: '🔷', name: 'Pattern Match',  desc: 'Repeat the shown sequence' },
  SPEED_CHOICE:  { emoji: '🚀', name: 'Speed Choice',   desc: 'Answer quick yes/no questions fast' },
}

export function Games() {
  const [configs, setConfigs] = useState<any[]>([])
  const [edits, setEdits]     = useState<Record<string, any>>({})
  const [saving, setSaving]   = useState<string | null>(null)

  const load = () => api.get('/admin/games').then(r => setConfigs(r.data))
  useEffect(() => { load() }, [])

  const toggle = async (gameType: string) => { await api.patch(`/admin/games/${gameType}/toggle`); load() }

  const edit = (gt: string, k: string, v: any) =>
    setEdits(e => ({ ...e, [gt]: { ...(e[gt] ?? {}), [k]: v } }))

  const save = async (gt: string, cur: any) => {
    setSaving(gt)
    try {
      await api.put(`/admin/games/${gt}`, { config: { ...cur.config, ...(edits[gt] ?? {}) } })
      setEdits(e => { const n = { ...e }; delete n[gt]; return n })
      load()
    } finally { setSaving(null) }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Mini Games</h1>
        <p className="text-sm text-gray-500">Enable/disable games and configure parameters</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {configs.map(c => {
          const meta    = GAME_META[c.gameType] ?? { emoji: '🎮', name: c.gameType, desc: '' }
          const local   = edits[c.gameType] ?? {}
          const cfg     = { ...c.config, ...local }
          const isDirty = Object.keys(local).length > 0

          return (
            <div key={c.gameType} className={clsx('card', !c.isEnabled && 'opacity-60')}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{meta.emoji}</span>
                  <div>
                    <p className="font-bold text-gray-900">{meta.name}</p>
                    <p className="text-xs text-gray-400">{meta.desc}</p>
                  </div>
                </div>
                <button onClick={() => toggle(c.gameType)}
                  className={clsx('flex items-center gap-1 text-sm font-semibold', c.isEnabled ? 'text-emerald-600' : 'text-gray-400')}>
                  {c.isEnabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  {c.isEnabled ? 'On' : 'Off'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { key: 'timeLimit',        label: 'Time Limit (s)',   min: 5,  max: 120  },
                  { key: 'pointsPerCorrect', label: 'Points/Correct',   min: 10, max: 1000 },
                  { key: 'penaltyMs',        label: 'Penalty (ms)',     min: 0,  max: 5000 },
                ].map(({ key, label, min, max }) => (
                  <div key={key}>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">{label}</label>
                    <input type="number" className="input text-sm" min={min} max={max}
                      value={cfg[key] ?? 0}
                      onChange={e => edit(c.gameType, key, parseInt(e.target.value))} />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Difficulty</label>
                  <select className="input text-sm" value={cfg.difficulty ?? 'MEDIUM'}
                    onChange={e => edit(c.gameType, 'difficulty', e.target.value)}>
                    <option>EASY</option><option>MEDIUM</option><option>HARD</option>
                  </select>
                </div>
              </div>

              {isDirty && (
                <button onClick={() => save(c.gameType, c)} disabled={saving === c.gameType}
                  className="btn-primary w-full flex items-center justify-center gap-1.5 py-2">
                  <Save size={14} />{saving === c.gameType ? 'Saving…' : 'Save Changes'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Analytics ─────────────────────────────────────────────────
export function Analytics() {
  const [suspicious, setSuspicious] = useState<any[]>([])
  const [logs,        setLogs]       = useState<any[]>([])
  const [gameStats,   setGameStats]  = useState<any[]>([])
  const [tab, setTab] = useState<'suspicious' | 'games' | 'logs'>('suspicious')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('/admin/analytics/suspicious'),
      api.get('/admin/analytics/logs'),
      api.get('/admin/analytics/games'),
    ]).then(([s, l, g]) => { setSuspicious(s.data); setLogs(l.data); setGameStats(g.data) })
      .finally(() => setLoading(false))
  }, [])

  const chartData = gameStats.map(g => ({
    name: g.gameType.replace('_', ' '),
    plays: g._count?.gameType ?? 0,
    avg: Math.round(g._avg?.score ?? 0),
  }))

  const TABS = [
    { key: 'suspicious', label: 'Suspicious',  badge: suspicious.length },
    { key: 'games',      label: 'Game Stats',  badge: 0 },
    { key: 'logs',       label: 'Admin Logs',  badge: 0 },
  ] as const

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500">Monitoring, game stats, and audit log</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={clsx('flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.key ? 'border-indigo-500 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700')}>
            {t.label}
            {t.badge > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {loading && <p className="text-gray-400 text-sm">Loading…</p>}

      {!loading && tab === 'suspicious' && (
        suspicious.length === 0
          ? <p className="text-center text-gray-400 py-12 text-sm">No suspicious activity detected ✓</p>
          : <div className="space-y-3">
            {suspicious.map(s => (
              <div key={s.id} className="card border-l-4 border-red-400">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 text-sm">{s.user?.username}</span>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{s.gameType}</span>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(s.playedAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-700">Score: <strong>{s.score}</strong> · {s.durationMs}ms</p>
                <p className="text-xs text-red-600 mt-1">⚠ {s.flagReason}</p>
              </div>
            ))}
          </div>
      )}

      {!loading && tab === 'games' && (
        <div>
          {chartData.length > 0 && (
            <div className="card mb-6">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ left: -20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="plays" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {gameStats.map(g => (
              <div key={g.gameType} className="card text-center">
                <p className="text-2xl font-extrabold text-gray-900">{(g._count?.gameType ?? 0).toLocaleString()}</p>
                <p className="text-sm font-medium text-gray-700 mt-1">{g.gameType.replace('_', ' ')}</p>
                <p className="text-xs text-gray-400 mt-0.5">Avg score: {Math.round(g._avg?.score ?? 0)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && tab === 'logs' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="th">Admin</th>
                <th className="th">Action</th>
                <th className="th">Entity</th>
                <th className="th">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map(l => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="td text-sm font-medium text-gray-900">{l.admin?.username}</td>
                  <td className="td">
                    <span className="text-xs font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">{l.action}</span>
                  </td>
                  <td className="td text-sm text-gray-500">
                    {l.entity}{l.entityId ? ` · ${l.entityId.slice(0, 8)}…` : ''}
                  </td>
                  <td className="td text-xs text-gray-400">{new Date(l.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
