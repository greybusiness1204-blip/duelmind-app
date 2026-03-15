import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Swords } from 'lucide-react'
import api from '../api'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate                = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      if (!['ADMIN', 'SUPERADMIN'].includes(data.user.role)) {
        setError('Admin access required')
        return
      }
      localStorage.setItem('adminToken',   data.accessToken)
      localStorage.setItem('adminRefresh', data.refreshToken)
      navigate('/')
    } catch (e: any) {
      setError(e.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-700 to-indigo-900 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Swords size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">DuelMind Admin</h1>
            <p className="text-xs text-gray-400">Control Panel</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Email</label>
            <input className="input" type="email" required placeholder="admin@duelmind.app"
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Password</label>
            <input className="input" type="password" required placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
          )}

          <button className="btn-primary w-full py-2.5" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400">
          admin@duelmind.app / admin123
        </p>
      </div>
    </div>
  )
}
