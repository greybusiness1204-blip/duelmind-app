import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Swords } from 'lucide-react'
import { useAuthStore } from '../stores/auth'

export default function AuthPage() {
  const [mode, setMode]       = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { login, register }     = useAuthStore()
  const navigate                = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(username, email, password)
      }
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-600 to-brand-900 flex flex-col items-center justify-center px-6">
      {/* Hero */}
      <div className="mb-10 text-center animate-fade-in">
        <div className="w-20 h-20 bg-white/15 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
          <Swords size={40} className="text-white" />
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">DuelMind</h1>
        <p className="text-brand-100 mt-1 text-sm">Challenge your mind. Beat your rivals.</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl animate-scale-in">
        {/* Mode tabs */}
        <div className="flex bg-surface-2 rounded-xl p-1 mb-6">
          {(['login', 'register'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === m ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
            >
              {m === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Username</label>
              <input
                className="input-field"
                placeholder="coolplayer42"
                required
                minLength={3}
                maxLength={20}
                pattern="^[a-zA-Z0-9_]+$"
                title="Letters, numbers and underscores only"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Email</label>
            <input
              className="input-field"
              type="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Password</label>
            <input
              className="input-field"
              type="password"
              placeholder="••••••••"
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary mt-2" disabled={loading}>
            {loading
              ? <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : mode === 'login' ? 'Sign In' : 'Create Account'
            }
          </button>
        </form>
      </div>

      <p className="mt-6 text-brand-200 text-xs text-center">
        Demo: alice@demo.com / demo1234
      </p>
    </div>
  )
}
