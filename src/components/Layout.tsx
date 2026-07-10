import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { CalendarSelector } from './CalendarSelector'
import { useEventReminders } from '../hooks/useEventReminders'
import { cn } from '../utils/cn'

const navItems = [
  { to: '/', label: 'Tableau de bord', icon: '⬜' },
  { to: '/calendar', label: 'Calendrier', icon: '📅' },
  { to: '/agenda', label: 'Vue multiple', icon: '▦' },
  { to: '/gantt', label: 'Gantt', icon: '▬' },
  { to: '/clients', label: 'Clients', icon: '👤' },
  { to: '/reports', label: 'Récapitulatif', icon: '📊' },
  { to: '/calendars', label: 'Agendas', icon: '📋' },
  { to: '/settings', label: 'Paramètres', icon: '⚙️' },
]

interface Props {
  children: React.ReactNode
}

export function Layout({ children }: Props) {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  useEventReminders()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col relative z-[60]">
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-gray-100">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-2xl font-bold text-indigo-600 tracking-tight">Cadenflu</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Navigation principale">
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )
              }
            >
              <span aria-hidden className="text-base leading-none">
                {icon}
              </span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Sélecteur d'agendas */}
        <div className="px-3 py-4 border-t border-gray-100">
          <CalendarSelector />
        </div>

        {/* Nouveau événement */}
        <div className="px-3 pb-4">
          <Link
            to="/events/new"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
          >
            <span aria-hidden>+</span> Nouvel événement
          </Link>
        </div>

        {/* User footer */}
        <div className="px-3 pb-4 border-t border-gray-100 pt-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-xs flex-shrink-0">
              {user?.display_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{user?.display_name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
              aria-label="Se déconnecter"
            >
              Quitter
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-h-0 overflow-auto" role="main" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
