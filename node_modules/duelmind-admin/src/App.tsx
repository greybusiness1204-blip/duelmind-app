import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, HelpCircle, Tag, Users, Gamepad2, BarChart2, LogOut, Swords } from 'lucide-react'
import clsx from 'clsx'

import Login      from './pages/Login'
import Dashboard  from './pages/Dashboard'
import Questions  from './pages/Questions'
import Categories from './pages/Categories'
import UsersPage  from './pages/Users'
import Games      from './pages/Games'
import Analytics  from './pages/Analytics'

const NAV = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/questions',  icon: HelpCircle,      label: 'Questions'  },
  { to: '/categories', icon: Tag,             label: 'Categories' },
  { to: '/users',      icon: Users,           label: 'Users'      },
  { to: '/games',      icon: Gamepad2,        label: 'Games'      },
  { to: '/analytics',  icon: BarChart2,       label: 'Analytics'  },
]

function Sidebar() {
  const navigate = useNavigate()
  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 h-screen sticky top-0">
      <div className="p-4 border-b border-gray-100 flex items-center gap-2">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <Swords size={16} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm">DuelMind</p>
          <p className="text-[10px] text-gray-400 font-medium">Admin Panel</p>
        </div>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) => clsx(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}>
            <Icon size={16} />{label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <button
          onClick={() => { localStorage.clear(); navigate('/login') }}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors w-full px-3 py-2 rounded-lg hover:bg-red-50"
        >
          <LogOut size={15} /> Sign Out
        </button>
      </div>
    </aside>
  )
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}

function Guard({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('adminToken')
  if (!token) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"      element={<Login />} />
        <Route path="/"           element={<Guard><Dashboard /></Guard>} />
        <Route path="/questions"  element={<Guard><Questions /></Guard>} />
        <Route path="/categories" element={<Guard><Categories /></Guard>} />
        <Route path="/users"      element={<Guard><UsersPage /></Guard>} />
        <Route path="/games"      element={<Guard><Games /></Guard>} />
        <Route path="/analytics"  element={<Guard><Analytics /></Guard>} />
        <Route path="*"           element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
