import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'

const tabs = [
  { to: '/finance', label: '収支', end: true },
  { to: '/finance/fixed', label: '定期収支' },
  { to: '/finance/balance', label: '口座残高' },
  { to: '/finance/invoices', label: '請求書' },
  { to: '/finance/forecast', label: '入金見込み' },
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
                ? 'bg-fuchsia-500 text-white'
                : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  )
}
