import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth'
import AuthPage       from './pages/Auth'
import Home           from './pages/Home'
import DuelLobby      from './pages/DuelLobby'
import DuelRoom       from './pages/DuelRoom'
import LearnMode      from './pages/LearnMode'
import LeaderboardPage from './pages/Leaderboard'
import ProfilePage    from './pages/Profile'
import BottomNav      from './components/ui/BottomNav'

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-1">
      <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function Guard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()
  if (loading) return <Spinner />
  if (!user)   return <Navigate to="/auth" replace />
  return <>{children}</>
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto">
      <main className="flex-1 overflow-auto pb-20">{children}</main>
      <BottomNav />
    </div>
  )
}

export default function App() {
  const { loadUser } = useAuthStore()
  useEffect(() => { loadUser() }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/"            element={<Guard><Shell><Home /></Shell></Guard>} />
        <Route path="/duel"        element={<Guard><Shell><DuelLobby /></Shell></Guard>} />
        <Route path="/duel/:id"    element={<Guard><DuelRoom /></Guard>} />
        <Route path="/learn"       element={<Guard><Shell><LearnMode /></Shell></Guard>} />
        <Route path="/leaderboard" element={<Guard><Shell><LeaderboardPage /></Shell></Guard>} />
        <Route path="/profile"     element={<Guard><Shell><ProfilePage /></Shell></Guard>} />
        <Route path="*"            element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
