import { NavLink } from 'react-router-dom'
import { LayoutDashboard, CheckSquare, DollarSign, Scale, TrendingUp } from 'lucide-react'
import { clsx } from 'clsx'

const navItems = [
  { to: '/', label: 'ホーム', icon: LayoutDashboard, end: true },
  { to: '/tasks', label: 'タスク', icon: CheckSquare },
  { to: '/finance', label: '財務', icon: DollarSign },
  { to: '/legal', label: '法務', icon: Scale },
  { to: '/market', label: 'リサーチ', icon: TrendingUp },
]

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#DDE8E2] flex md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            clsx(
              'flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-xs font-medium transition-colors',
              isActive ? 'text-[#3AAA6D]' : 'text-[#9DB8A8]'
            )
          }
        >
          {({ isActive }) => (
            <>
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
