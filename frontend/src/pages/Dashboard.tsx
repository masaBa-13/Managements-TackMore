import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, DollarSign, CheckSquare, TrendingUp, FileText } from 'lucide-react'
import { clsx } from 'clsx'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { fetchFinanceSummary, fetchInvoiceAlerts, fetchMonthlyTrend } from '../api/finance'
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
  const [includeForecast, setIncludeForecast] = useState(false)

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

  const { data: invoiceAlerts } = useQuery({
    queryKey: ['invoice-alerts'],
    queryFn: fetchInvoiceAlerts,
  })

  const { data: trend = [] } = useQuery({
    queryKey: ['monthly-trend-dash', includeForecast],
    queryFn: () => fetchMonthlyTrend(6, includeForecast),
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
            onClick={() => navigate('/finance/balance')}
            className="text-sm text-red-700 font-medium underline hover:no-underline"
          >
            入力する →
          </button>
        </div>
      )}

      {/* Monthly Trend Chart */}
      {trend.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">収支・残高推移</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-gray-500">見込み含む</span>
              <button
                onClick={() => setIncludeForecast(!includeForecast)}
                className={clsx(
                  'relative w-10 h-5 rounded-full transition-colors',
                  includeForecast ? 'bg-indigo-600' : 'bg-gray-300'
                )}
              >
                <span className={clsx(
                  'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow',
                  includeForecast ? 'left-5.5 translate-x-0.5' : 'left-0.5'
                )} />
              </button>
            </label>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}万`} />
              <Tooltip formatter={(v: number) => formatYen(v)} />
              <Legend />
              <Bar dataKey="income" fill="#3b82f6" name="収入（実績）" />
              {includeForecast && <Bar dataKey="forecast_income" fill="#93c5fd" name="入金見込み" />}
              <Bar dataKey="expense" fill="#ef4444" name="支出" />
              <Line type="monotone" dataKey="balance" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} name="残高" connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
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
                <span className="text-gray-500">定期支出</span>
                <span className="text-gray-700 font-medium">{formatYen(summary.fixed_expense_total_next)}</span>
              </div>
              {summary.fixed_income_total_next > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">定期収入</span>
                  <span className="text-blue-600 font-medium">{formatYen(summary.fixed_income_total_next)}</span>
                </div>
              )}
              {summary.runway_months != null && (
                <div className="bg-amber-50 rounded-lg p-3">
                  <div className="text-xs text-amber-700">ランウェイ（ネット支出 {formatYen(summary.net_monthly_burn)}/月）</div>
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

        {/* Invoice Alerts */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <FileText size={16} className="text-indigo-600" />
            </div>
            <h2 className="font-semibold text-gray-900">請求書アラート</h2>
            {invoiceAlerts && invoiceAlerts.length > 0 && (
              <span className="ml-auto bg-indigo-100 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full">
                {invoiceAlerts.length}件
              </span>
            )}
          </div>

          {invoiceAlerts ? (
            invoiceAlerts.length > 0 ? (
              <ul className="space-y-2">
                {invoiceAlerts.slice(0, 5).map((inv) => {
                  const daysLeft = Math.ceil(
                    (new Date(inv.due_date).getTime() - new Date(today).getTime()) / 86400000
                  )
                  const isOverdue = inv.status !== 'paid' && daysLeft < 0

                  return (
                    <li
                      key={inv.id}
                      className={`text-sm rounded-lg px-3 py-2 ${
                        inv.status === 'draft'
                          ? 'bg-gray-50 text-gray-800'
                          : isOverdue
                          ? 'bg-red-50 text-red-800'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{inv.client_name}</span>
                        <span className="text-xs ml-2 shrink-0">
                          {inv.status === 'draft' ? '未送付' : isOverdue ? `${Math.abs(daysLeft)}日超過` : `残${daysLeft}日`}
                        </span>
                      </div>
                      <div className="text-xs opacity-70 mt-0.5">
                        {inv.title} · {formatYen(inv.amount)}
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="text-sm text-gray-400">対応が必要な請求書はありません</div>
            )
          ) : (
            <div className="text-sm text-gray-400">読み込み中...</div>
          )}

          {invoiceAlerts && invoiceAlerts.length > 0 && (
            <button
              onClick={() => navigate('/finance/invoices')}
              className="text-sm text-indigo-600 font-medium hover:underline"
            >
              請求書管理へ →
            </button>
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
