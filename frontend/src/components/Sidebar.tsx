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

export default function Sidebar() {
  return (
    <aside className="w-56 min-h-screen bg-white border-r border-gray-200 flex flex-col">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm leading-tight">TackMore</div>
            <div className="text-xs text-gray-500 leading-tight">Ops Dashboard</div>
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
                isActive
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
      <div className="px-5 py-4 border-t border-gray-200">
        <p className="text-xs text-gray-400">株式会社TackMore</p>
      </div>
    </aside>
  )
}
