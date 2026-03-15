import { NavLink } from 'react-router-dom'
import { Swords, BookOpen, Trophy, User } from 'lucide-react'

const tabs = [
  { to: '/',            icon: Swords,   label: 'Duel'    },
  { to: '/learn',       icon: BookOpen, label: 'Learn'   },
  { to: '/leaderboard', icon: Trophy,   label: 'Ranks'   },
  { to: '/profile',     icon: User,     label: 'Profile' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-surface-3 z-50">
      <div className="flex">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-0.5 py-3 transition-colors ${isActive ? 'text-brand-500' : 'text-gray-400'}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium tracking-wide">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
