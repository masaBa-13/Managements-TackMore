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
    <aside className="w-56 min-h-screen flex flex-col bg-white border-r border-[#DDE8E2]">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-[#DDE8E2]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#3AAA6D]">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <div>
            <div className="font-bold text-sm leading-tight text-[#1A2330]">TackMore</div>
            <div className="text-xs leading-tight text-[#8FA099]">Ops Dashboard</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[#EBF3EF] text-[#3AAA6D]'
                  : 'text-[#6B7A8D] hover:bg-[#F4F9F6] hover:text-[#1A2330]'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-[#DDE8E2]">
        <p className="text-xs text-[#B0C4BA]">株式会社TackMore</p>
      </div>
    </aside>
  )
}
