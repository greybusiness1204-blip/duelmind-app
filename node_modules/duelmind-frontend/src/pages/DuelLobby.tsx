import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Link2, UserPlus, Zap } from 'lucide-react'
import api from '../api/client'

type Screen = 'menu' | 'create' | 'join' | 'waiting'
type DuelType = 'TRIVIA' | 'REACTION'

export default function DuelLobby() {
  const navigate          = useNavigate()
  const [screen, setScreen] = useState<Screen>('menu')
  const [duelType, setDuelType] = useState<DuelType>('TRIVIA')
  const [rounds, setRounds]   = useState(3)
  const [joinCode, setJoinCode] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [createdId, setCreatedId]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const createDuel = async () => {
    setLoading(true); setError('')
    try {
      const { data } = await api.post('/duels/create', { type: duelType, rounds })
      setInviteCode(data.inviteCode)
      setCreatedId(data.id)
      setScreen('waiting')
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to create duel')
    } finally { setLoading(false) }
  }

  const joinDuel = async () => {
    if (!joinCode.trim()) return
    setLoading(true); setError('')
    try {
      const { data } = await api.post(`/duels/join/${joinCode.toUpperCase().trim()}`)
      navigate(`/duel/${data.id}`)
    } catch (e: any) {
      setError(e.response?.data?.error || 'Duel not found')
    } finally { setLoading(false) }
  }

  const quickMatch = async () => {
    setLoading(true); setError('')
    try {
      const { data } = await api.post('/duels/quickmatch', { type: duelType })
      navigate(`/duel/${data.duel.id}`)
    } catch (e: any) {
      setError(e.response?.data?.error || 'Quick match failed')
    } finally { setLoading(false) }
  }

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode).catch(() => {})
  }

  if (screen === 'waiting') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 bg-brand-50 rounded-3xl flex items-center justify-center mb-6">
          <Link2 size={28} className="text-brand-500" />
        </div>
        <h2 className="text-2xl font-extrabold mb-2">Waiting for opponent</h2>
        <p className="text-gray-400 mb-8 text-sm">Share this code with your friend</p>

        <div className="card w-full max-w-xs text-center mb-4">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Invite Code</p>
          <p className="text-5xl font-extrabold tracking-[0.25em] text-brand-600">{inviteCode}</p>
        </div>

        <div className="w-full max-w-xs space-y-3">
          <button onClick={copyCode} className="btn-secondary flex items-center justify-center gap-2">
            <Link2 size={16} /> Copy Code
          </button>
          <button onClick={() => navigate(`/duel/${createdId}`)} className="btn-primary">
            Enter Duel Room
          </button>
          <button onClick={() => { setScreen('menu'); setCreatedId(''); setInviteCode('') }}
            className="text-gray-400 text-sm w-full py-2">
            Cancel
          </button>
        </div>

        <div className="mt-8 flex items-center gap-2">
          <div className="w-2 h-2 bg-brand-500 rounded-full animate-pulse-fast" />
          <p className="text-sm text-gray-400">Waiting for {duelType.toLowerCase()} duel to start…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 pt-6">
      <button
        onClick={() => screen === 'menu' ? navigate('/') : setScreen('menu')}
        className="flex items-center gap-2 text-gray-400 mb-6 text-sm"
      >
        <ArrowLeft size={18} /> {screen === 'menu' ? 'Home' : 'Back'}
      </button>

      <h1 className="text-2xl font-extrabold mb-1">Duel Mode</h1>
      <p className="text-gray-400 mb-8 text-sm">Challenge a friend or jump into quick match</p>

      {screen === 'menu' && (
        <div className="space-y-4 animate-slide-up">
          {/* Type selector */}
          <div className="card">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Duel Type</p>
            <div className="flex gap-2">
              {(['TRIVIA', 'REACTION'] as DuelType[]).map(t => (
                <button key={t} onClick={() => setDuelType(t)}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                    duelType === t ? 'bg-brand-500 text-white' : 'bg-surface-2 text-gray-600'
                  }`}>
                  {t === 'TRIVIA' ? '🧠 Trivia' : '⚡ Reaction'}
                </button>
              ))}
            </div>
          </div>

          {/* Quick match */}
          <button
            onClick={quickMatch}
            disabled={loading}
            className="w-full bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-2xl p-5 flex items-center gap-4 active:scale-[0.98] transition-all shadow-lg shadow-brand-200 disabled:opacity-60"
          >
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap size={24} />
            </div>
            <div className="text-left">
              <p className="font-extrabold text-lg">Quick Match</p>
              <p className="text-brand-100 text-sm">Find a random opponent now</p>
            </div>
          </button>

          {/* Create private */}
          <button onClick={() => setScreen('create')}
            className="w-full card flex items-center gap-4 active:scale-[0.98] transition-all text-left">
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Link2 size={22} className="text-purple-500" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Create Private Duel</p>
              <p className="text-sm text-gray-400">Get an invite code to share</p>
            </div>
          </button>

          {/* Join */}
          <button onClick={() => setScreen('join')}
            className="w-full card flex items-center gap-4 active:scale-[0.98] transition-all text-left">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <UserPlus size={22} className="text-emerald-500" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Join with Code</p>
              <p className="text-sm text-gray-400">Enter your friend's invite code</p>
            </div>
          </button>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        </div>
      )}

      {screen === 'create' && (
        <div className="space-y-4 animate-slide-up">
          <div className="card">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Number of Rounds</p>
            <div className="flex gap-2">
              {[1, 3, 5, 7].map(r => (
                <button key={r} onClick={() => setRounds(r)}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                    rounds === r ? 'bg-brand-500 text-white' : 'bg-surface-2 text-gray-600'
                  }`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={createDuel} className="btn-primary" disabled={loading}>
            {loading ? '…' : `Create ${duelType === 'TRIVIA' ? 'Trivia' : 'Reaction'} Duel`}
          </button>
        </div>
      )}

      {screen === 'join' && (
        <div className="space-y-4 animate-slide-up">
          <div className="card">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Invite Code</p>
            <input
              className="input-field text-center text-2xl font-extrabold tracking-[0.3em] uppercase"
              placeholder="ABC123"
              maxLength={6}
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={joinDuel} className="btn-primary" disabled={loading || !joinCode.trim()}>
            {loading ? '…' : 'Join Duel'}
          </button>
        </div>
      )}
    </div>
  )
}
