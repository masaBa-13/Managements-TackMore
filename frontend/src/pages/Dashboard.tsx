import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, DollarSign, CheckSquare, TrendingUp } from 'lucide-react'
import { fetchFinanceSummary } from '../api/finance'
import { fetchLegalAlerts } from '../api/legal'
import { fetchTasks } from '../api/tasks'
import { fetchMarketNotes } from '../api/market'

function formatYen(amount: number): string {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
  })
}

export default function Dashboard() {
  const navigate = useNavigate()

  const { data: summary } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: fetchFinanceSummary,
  })

  const { data: legalAlerts } = useQuery({
    queryKey: ['legal-alerts'],
    queryFn: fetchLegalAlerts,
  })

  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => fetchTasks(),
  })

  const { data: marketNotes } = useQuery({
    queryKey: ['market-notes'],
    queryFn: () => fetchMarketNotes(),
  })

  const today = new Date().toISOString().slice(0, 10)
  const overdueTasks = tasks?.filter((t) => t.due_date && t.due_date < today && t.status !== 'done').length ?? 0
  const doneTasks = tasks?.filter((t) => t.status === 'done').length ?? 0
  const totalTasks = tasks?.length ?? 0
  const completionRate = totalTasks > 0 ? Math.floor((doneTasks / totalTasks) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Reminder banner */}
      {summary?.balance_reminder_needed && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle size={18} />
            <span className="text-sm font-medium">今月の残高がまだ入力されていません</span>
          </div>
          <button
            onClick={() => navigate('/finance')}
            className="text-sm text-red-700 font-medium underline hover:no-underline"
          >
            入力する →
          </button>
        </div>
      )}

      {/* 2x2 grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cash Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign size={16} className="text-green-600" />
            </div>
            <h2 className="font-semibold text-gray-900">キャッシュサマリー</h2>
          </div>

          {summary ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">現預金残高</span>
                <span className="font-semibold text-gray-900">
                  {summary.latest_balance != null
                    ? formatYen(summary.latest_balance)
                    : '未入力'}
                </span>
              </div>
              {summary.latest_balance_month && (
                <div className="flex justify-between text-xs text-gray-400">
                  <span>（{summary.latest_balance_month} 時点）</span>
                </div>
              )}
              <div className="h-px bg-gray-100" />
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">今月収入</span>
                <span className="text-blue-600 font-medium">{formatYen(summary.income_total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">今月支出</span>
                <span className="text-red-500 font-medium">{formatYen(summary.expense_total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">月間固定費</span>
                <span className="text-gray-700 font-medium">{formatYen(summary.fixed_expense_total)}</span>
              </div>
              {summary.runway_months != null && (
                <div className="bg-amber-50 rounded-lg p-3">
                  <div className="text-xs text-amber-700">ランウェイ</div>
                  <div className="text-xl font-bold text-amber-800">
                    {summary.runway_months}ヶ月
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-400">読み込み中...</div>
          )}
        </div>

        {/* Legal Alerts */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertCircle size={16} className="text-orange-600" />
            </div>
            <h2 className="font-semibold text-gray-900">期日アラート</h2>
            {legalAlerts && legalAlerts.length > 0 && (
              <span className="ml-auto bg-orange-100 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full">
                {legalAlerts.length}件
              </span>
            )}
          </div>

          {legalAlerts && legalAlerts.length > 0 ? (
            <ul className="space-y-2">
              {legalAlerts.map((item) => {
                const daysLeft = Math.ceil(
                  (new Date(item.due_date).getTime() - new Date(today).getTime()) / 86400000
                )
                const isOverdue = daysLeft < 0
                const isUrgent = daysLeft <= 7 && !isOverdue

                return (
                  <li
                    key={item.id}
                    className={`text-sm rounded-lg px-3 py-2 ${
                      isOverdue
                        ? 'bg-red-50 text-red-800'
                        : isUrgent
                        ? 'bg-orange-50 text-orange-800'
                        : 'bg-yellow-50 text-yellow-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{item.title}</span>
                      <span className="text-xs ml-2 shrink-0">
                        {isOverdue ? `${Math.abs(daysLeft)}日超過` : `残${daysLeft}日`}
                      </span>
                    </div>
                    <div className="text-xs opacity-70 mt-0.5">
                      {item.category} · 期日: {formatDate(item.due_date)}
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="text-sm text-gray-400">
              {legalAlerts ? '期日が近い項目はありません' : '読み込み中...'}
            </div>
          )}
        </div>

        {/* Task Progress */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <CheckSquare size={16} className="text-blue-600" />
            </div>
            <h2 className="font-semibold text-gray-900">タスク進捗</h2>
          </div>

          {tasks ? (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-500">完了率</span>
                  <span className="font-semibold text-gray-900">{completionRate}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="font-bold text-gray-900">{totalTasks}</div>
                  <div className="text-xs text-gray-500">合計</div>
                </div>
                <div className="bg-green-50 rounded-lg p-2">
                  <div className="font-bold text-green-700">{doneTasks}</div>
                  <div className="text-xs text-green-600">完了</div>
                </div>
                <div className="bg-red-50 rounded-lg p-2">
                  <div className="font-bold text-red-700">{overdueTasks}</div>
                  <div className="text-xs text-red-600">期限超過</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400">読み込み中...</div>
          )}
        </div>

        {/* Market Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp size={16} className="text-purple-600" />
            </div>
            <h2 className="font-semibold text-gray-900">市場メモ</h2>
          </div>

          {marketNotes ? (
            marketNotes.length > 0 ? (
              <ul className="space-y-3">
                {marketNotes.slice(0, 3).map((note) => (
                  <li key={note.id} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{note.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(note.created_at).toLocaleDateString('ja-JP')}
                    </div>
                    {note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {note.tags.map((tag) => (
                          <span key={tag} className="bg-purple-50 text-purple-700 text-xs px-1.5 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-gray-400">メモがありません</div>
            )
          ) : (
            <div className="text-sm text-gray-400">読み込み中...</div>
          )}
        </div>
      </div>
    </div>
  )
}
