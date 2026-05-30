import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'

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
  const isDashboard = location.pathname === '/'

  return (
    <div className={`flex min-h-screen ${isDashboard ? 'bg-[#0d0d1a]' : 'bg-gray-50'}`}>
      {/* サイドバー: デスクトップのみ */}
      <div className="hidden md:block">
        <Sidebar dark={isDashboard} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header
          className={`px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-10 ${
            isDashboard
              ? 'bg-[#0d0d1a]/80 backdrop-blur-xl border-b border-white/5'
              : 'bg-white border-b border-gray-200'
          }`}
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
        >
          {/* モバイル: ブランドロゴ */}
          <div className="flex items-center gap-2 md:hidden">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              isDashboard ? 'bg-fuchsia-500' : 'bg-indigo-600'
            }`}>
              <span className="text-white font-bold text-xs">T</span>
            </div>
            <h1 className={`text-base font-semibold ${isDashboard ? 'text-white' : 'text-gray-900'}`}>{title}</h1>
          </div>
          {/* デスクトップ: タイトルのみ */}
          <h1 className={`hidden md:block text-lg font-semibold ${isDashboard ? 'text-white' : 'text-gray-900'}`}>{title}</h1>

          <div className={`text-xs md:text-sm ${isDashboard ? 'text-gray-500' : 'text-gray-500'}`}>
            {new Date().toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* ボトムナビ: モバイルのみ */}
      <BottomNav />
    </div>
  )
}
