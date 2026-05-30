import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  CheckSquare,
  DollarSign,
  Scale,
  TrendingUp,
  Settings,
} from 'lucide-react'
import { clsx } from 'clsx'

const navItems = [
  { to: '/', label: 'ダッシュボード', icon: LayoutDashboard, end: true },
  { to: '/tasks', label: 'タスク管理', icon: CheckSquare },
  { to: '/finance', label: '財務管理', icon: DollarSign },
  { to: '/legal', label: '法務管理', icon: Scale },
  { to: '/market', label: '市場リサーチ', icon: TrendingUp },
  { to: '/settings', label: '設定', icon: Settings },
]

export default function Sidebar({ dark = false }: { dark?: boolean }) {
  return (
    <aside className={clsx(
      'w-56 min-h-screen flex flex-col transition-colors',
      dark
        ? 'bg-[#0a0a18] border-r border-white/5'
        : 'bg-white border-r border-gray-200'
    )}>
      {/* Brand */}
      <div className={clsx('px-5 py-5 border-b', dark ? 'border-white/5' : 'border-gray-200')}>
        <div className="flex items-center gap-2">
          <div className={clsx(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            dark ? 'bg-fuchsia-500' : 'bg-indigo-600'
          )}>
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <div>
            <div className={clsx('font-bold text-sm leading-tight', dark ? 'text-white' : 'text-gray-900')}>TackMore</div>
            <div className={clsx('text-xs leading-tight', dark ? 'text-gray-600' : 'text-gray-500')}>Ops Dashboard</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                dark
                  ? isActive
                    ? 'bg-fuchsia-500/15 text-fuchsia-300'
                    : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                  : isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className={clsx('px-5 py-4 border-t', dark ? 'border-white/5' : 'border-gray-200')}>
        <p className={clsx('text-xs', dark ? 'text-gray-700' : 'text-gray-400')}>株式会社TackMore</p>
      </div>
    </aside>
  )
}
