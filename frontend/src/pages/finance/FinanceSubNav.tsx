import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'

const tabs = [
  { to: '/finance', label: '収支', end: true },
  { to: '/finance/fixed', label: '固定費' },
  { to: '/finance/balance', label: '口座残高' },
  { to: '/finance/invoices', label: '請求書' },
  { to: '/finance/budget', label: '予算管理' },
]

export default function FinanceSubNav() {
  return (
    <div className="flex gap-2 flex-wrap">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            clsx(
              'px-3 py-1.5 text-sm rounded-md font-medium',
              isActive
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  )
}
