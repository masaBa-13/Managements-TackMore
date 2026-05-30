import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'

const pageTitles: Record<string, string> = {
  '/': 'ダッシュボード',
  '/tasks': 'タスク管理',
  '/tasks/kanban': 'カンバンボード',
  '/finance': '財務管理',
  '/finance/fixed': '固定費マスタ',
  '/legal': '法務管理',
  '/market': '市場リサーチ',
  '/settings': '設定',
}

export default function Layout() {
  const location = useLocation()
  const title = pageTitles[location.pathname] ?? 'TackMore Dashboard'

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
