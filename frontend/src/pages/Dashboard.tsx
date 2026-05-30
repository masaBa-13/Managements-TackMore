import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle, DollarSign, CheckSquare, TrendingUp, FileText,
  ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, Zap,
} from 'lucide-react'
import { clsx } from 'clsx'
import {
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { fetchFinanceSummary, fetchInvoiceAlerts, fetchMonthlyTrend } from '../api/finance'
import { fetchLegalAlerts } from '../api/legal'
import { fetchTasks } from '../api/tasks'
import { fetchMarketNotes } from '../api/market'

function formatYen(amount: number): string {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount)
}

function formatYenShort(amount: number): string {
  if (Math.abs(amount) >= 10000) {
    return `${(amount / 10000).toFixed(1)}万`
  }
  return new Intl.NumberFormat('ja-JP').format(amount)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
  })
}

// Custom dark tooltip
function DarkTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a1a]/95 backdrop-blur border border-white/10 rounded-lg px-3 py-2 shadow-xl">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-300">{p.name}</span>
          <span className="text-white font-medium ml-auto">{formatYen(p.value)}</span>
        </div>
      ))}
    </div>
  )
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
    queryFn: () => fetchMonthlyTrend(24, includeForecast),
  })

  const chartScrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollState = () => {
    const el = chartScrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }

  useEffect(() => {
    const el = chartScrollRef.current
    if (!el || trend.length === 0) return
    el.scrollLeft = el.scrollWidth
    updateScrollState()
  }, [trend])

  const scrollChart = (direction: 'left' | 'right') => {
    const el = chartScrollRef.current
    if (!el) return
    el.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' })
  }

  const today = new Date().toISOString().slice(0, 10)
  const overdueTasks = tasks?.filter((t) => t.due_date && t.due_date < today && t.status !== 'done').length ?? 0
  const doneTasks = tasks?.filter((t) => t.status === 'done').length ?? 0
  const totalTasks = tasks?.length ?? 0
  const completionRate = totalTasks > 0 ? Math.floor((doneTasks / totalTasks) * 100) : 0
  const inProgressTasks = tasks?.filter((t) => t.status === 'in_progress').length ?? 0

  // Task donut data
  const taskDonutData = [
    { name: '完了', value: doneTasks, color: '#d946ef' },
    { name: '進行中', value: inProgressTasks, color: '#a855f7' },
    { name: '未着手', value: totalTasks - doneTasks - inProgressTasks, color: '#2a2a2a' },
  ].filter(d => d.value > 0)

  const netIncome = (summary?.income_total ?? 0) - (summary?.expense_total ?? 0)

  return (
    <div className="min-h-screen -m-4 md:-m-6 p-4 md:p-6 bg-[#000000]">
      {/* Reminder banner */}
      {summary?.balance_reminder_needed && (
        <div className="mb-4 bg-gradient-to-r from-rose-500/20 to-pink-500/20 border border-rose-500/30 rounded-md px-4 py-3 flex items-center justify-between backdrop-blur">
          <div className="flex items-center gap-2 text-rose-300">
            <AlertCircle size={16} />
            <span className="text-sm font-medium">今月の残高がまだ入力されていません</span>
          </div>
          <button
            onClick={() => navigate('/finance/balance')}
            className="text-sm text-rose-300 font-medium hover:text-rose-200 transition-colors"
          >
            入力する →
          </button>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {/* Balance */}
        <div className="bg-[#111111] border border-white/5 rounded-md p-4">
          <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">残高</div>
          <div className="text-xl md:text-2xl font-bold text-white tracking-tight">
            {summary?.latest_balance != null ? formatYenShort(summary.latest_balance) : '---'}
          </div>
          {summary?.latest_balance_month && (
            <div className="text-[10px] text-gray-600 mt-1">{summary.latest_balance_month} 時点</div>
          )}
        </div>

        {/* Income */}
        <div className="bg-[#111111] border border-white/5 rounded-md p-4">
          <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">今月収入</div>
          <div className="text-xl md:text-2xl font-bold text-emerald-400 tracking-tight">
            {summary ? formatYenShort(summary.income_total) : '---'}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight size={10} className="text-emerald-500" />
            <span className="text-[10px] text-emerald-500/70">実績</span>
          </div>
        </div>

        {/* Expense */}
        <div className="bg-[#111111] border border-white/5 rounded-md p-4">
          <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">今月支出</div>
          <div className="text-xl md:text-2xl font-bold text-rose-400 tracking-tight">
            {summary ? formatYenShort(summary.expense_total) : '---'}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <ArrowDownRight size={10} className="text-rose-500" />
            <span className="text-[10px] text-rose-500/70">実績</span>
          </div>
        </div>

        {/* Runway */}
        <div className="bg-[#111111] border border-white/5 rounded-md p-4">
          <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">ランウェイ</div>
          <div className="text-xl md:text-2xl font-bold text-amber-400 tracking-tight">
            {summary?.runway_months != null ? `${summary.runway_months}ヶ月` : '---'}
          </div>
          {summary?.net_monthly_burn != null && (
            <div className="text-[10px] text-gray-600 mt-1">ネット {formatYenShort(summary.net_monthly_burn)}/月</div>
          )}
        </div>
      </div>

      {/* Main Chart */}
      {trend.length > 0 && (
        <div className="bg-[#111111] border border-white/5 rounded-md p-5 mb-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide">収支・残高推移</h2>
              <div className="text-[10px] text-gray-500 mt-0.5">MONTHLY CASHFLOW TREND</div>
            </div>
            <div className="flex items-center gap-3">
              {/* Net income indicator */}
              <div className="hidden md:flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5">
                <span className="text-[10px] text-gray-500">今月収支</span>
                <span className={clsx(
                  'text-sm font-bold',
                  netIncome >= 0 ? 'text-emerald-400' : 'text-rose-400'
                )}>
                  {netIncome >= 0 ? '+' : ''}{formatYenShort(netIncome)}
                </span>
              </div>
              {/* Toggle */}
              <button
                onClick={() => setIncludeForecast(!includeForecast)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all',
                  includeForecast
                    ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30'
                    : 'bg-white/5 text-gray-500 border border-white/5 hover:border-white/10'
                )}
              >
                <Zap size={10} />
                見込み含む
              </button>
            </div>
          </div>
          <div className="relative">
            {canScrollLeft && (
              <button
                onClick={() => scrollChart('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-[#1a1a1a]/90 border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <ChevronLeft size={14} className="text-gray-400" />
              </button>
            )}
            {canScrollRight && (
              <button
                onClick={() => scrollChart('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-[#1a1a1a]/90 border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <ChevronRight size={14} className="text-gray-400" />
              </button>
            )}
            <div
              ref={chartScrollRef}
              onScroll={updateScrollState}
              className="overflow-x-auto"
              style={{ scrollbarWidth: 'none' }}
            >
              <div style={{ width: `${Math.max(trend.length * 80, 100)}px`, minWidth: '100%' }}>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={trend} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <defs>
                      <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d946ef" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#d946ef" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10, fill: '#555555' }}
                      axisLine={{ stroke: '#ffffff08' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#555555' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}万`}
                    />
                    <Tooltip content={<DarkTooltip />} />
                    <Area type="monotone" dataKey="income" fill="url(#incomeGrad)" stroke="#d946ef" strokeWidth={2} name="収入" dot={false} />
                    {includeForecast && (
                      <Bar dataKey="forecast_income" fill="#d946ef33" stroke="#d946ef66" strokeWidth={1} name="入金見込み" radius={[3, 3, 0, 0]} />
                    )}
                    <Area type="monotone" dataKey="expense" fill="url(#expenseGrad)" stroke="#f43f5e" strokeWidth={1.5} name="支出" dot={false} />
                    <Area type="monotone" dataKey="balance" fill="url(#balanceGrad)" stroke="#60a5fa" strokeWidth={2.5} name="残高" connectNulls dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-5 mt-3 px-1">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-[2px] bg-fuchsia-500 rounded" />
              <span className="text-[10px] text-gray-500">収入</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-[2px] bg-rose-500 rounded" />
              <span className="text-[10px] text-gray-500">支出</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-[2px] bg-sky-400 rounded" />
              <span className="text-[10px] text-gray-500">残高</span>
            </div>
            {includeForecast && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-2 bg-fuchsia-500/20 border border-fuchsia-500/40 rounded-sm" />
                <span className="text-[10px] text-gray-500">見込み</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cash Summary */}
        <div className="bg-[#111111] border border-white/5 rounded-md p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-fuchsia-500/10 rounded-lg flex items-center justify-center">
              <DollarSign size={14} className="text-fuchsia-400" />
            </div>
            <h3 className="text-xs font-semibold text-white tracking-wide uppercase">キャッシュ</h3>
          </div>
          {summary ? (
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] text-gray-500">現預金残高</span>
                <span className="text-lg font-bold text-white">
                  {summary.latest_balance != null ? formatYen(summary.latest_balance) : '未入力'}
                </span>
              </div>
              <div className="h-px bg-white/5" />
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/[0.03] rounded-lg p-2.5">
                  <div className="text-[10px] text-gray-600 mb-0.5">定期支出</div>
                  <div className="text-sm font-semibold text-rose-400">{formatYenShort(summary.fixed_expense_total_next)}</div>
                </div>
                {summary.fixed_income_total_next > 0 && (
                  <div className="bg-white/[0.03] rounded-lg p-2.5">
                    <div className="text-[10px] text-gray-600 mb-0.5">定期収入</div>
                    <div className="text-sm font-semibold text-emerald-400">{formatYenShort(summary.fixed_income_total_next)}</div>
                  </div>
                )}
              </div>
              {summary.runway_months != null && (
                <div className="bg-gradient-to-r from-fuchsia-500/10 to-purple-500/10 border border-fuchsia-500/10 rounded-lg p-3">
                  <div className="text-[10px] text-fuchsia-300/60">ランウェイ</div>
                  <div className="text-2xl font-black text-fuchsia-400 tracking-tight">
                    {summary.runway_months}<span className="text-xs font-medium text-fuchsia-400/60 ml-0.5">ヶ月</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-gray-600">読み込み中...</div>
          )}
        </div>

        {/* Task Progress - Donut */}
        <div className="bg-[#111111] border border-white/5 rounded-md p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-sky-500/10 rounded-lg flex items-center justify-center">
              <CheckSquare size={14} className="text-sky-400" />
            </div>
            <h3 className="text-xs font-semibold text-white tracking-wide uppercase">タスク進捗</h3>
            <span className="ml-auto text-[10px] text-gray-600">{totalTasks} TASKS</span>
          </div>
          {tasks ? (
            <div className="flex items-center gap-4">
              {/* Donut */}
              <div className="relative w-28 h-28 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={taskDonutData.length > 0 ? taskDonutData : [{ name: '-', value: 1, color: '#2a2a2a' }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={48}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {(taskDonutData.length > 0 ? taskDonutData : [{ name: '-', value: 1, color: '#2a2a2a' }]).map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-lg font-black text-white">{completionRate}%</div>
                </div>
              </div>
              {/* Legend */}
              <div className="space-y-2.5 flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-fuchsia-500" />
                    <span className="text-[11px] text-gray-400">完了</span>
                  </div>
                  <span className="text-sm font-bold text-white">{doneTasks}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    <span className="text-[11px] text-gray-400">進行中</span>
                  </div>
                  <span className="text-sm font-bold text-white">{inProgressTasks}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#2a2a2a]" />
                    <span className="text-[11px] text-gray-400">未着手</span>
                  </div>
                  <span className="text-sm font-bold text-white">{totalTasks - doneTasks - inProgressTasks}</span>
                </div>
                {overdueTasks > 0 && (
                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-[11px] text-rose-400">期限超過</span>
                    </div>
                    <span className="text-sm font-bold text-rose-400">{overdueTasks}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-600">読み込み中...</div>
          )}
        </div>

        {/* Alerts combined */}
        <div className="bg-[#111111] border border-white/5 rounded-md p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-rose-500/10 rounded-lg flex items-center justify-center">
              <AlertCircle size={14} className="text-rose-400" />
            </div>
            <h3 className="text-xs font-semibold text-white tracking-wide uppercase">アラート</h3>
            {((legalAlerts?.length ?? 0) + (invoiceAlerts?.length ?? 0)) > 0 && (
              <span className="ml-auto bg-rose-500/20 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {(legalAlerts?.length ?? 0) + (invoiceAlerts?.length ?? 0)}
              </span>
            )}
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
            {/* Legal alerts */}
            {legalAlerts?.map((item) => {
              const daysLeft = Math.ceil(
                (new Date(item.due_date).getTime() - new Date(today).getTime()) / 86400000
              )
              const isOverdue = daysLeft < 0
              const isUrgent = daysLeft <= 7 && !isOverdue
              return (
                <div
                  key={`legal-${item.id}`}
                  className={clsx(
                    'rounded-lg px-3 py-2 border transition-colors',
                    isOverdue
                      ? 'bg-rose-500/10 border-rose-500/20'
                      : isUrgent
                      ? 'bg-amber-500/10 border-amber-500/20'
                      : 'bg-white/[0.02] border-white/5'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-gray-200 truncate">{item.title}</span>
                    <span className={clsx(
                      'text-[10px] ml-2 shrink-0 font-bold',
                      isOverdue ? 'text-rose-400' : isUrgent ? 'text-amber-400' : 'text-gray-500'
                    )}>
                      {isOverdue ? `${Math.abs(daysLeft)}日超過` : `残${daysLeft}日`}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-600 mt-0.5">
                    {item.category} / {formatDate(item.due_date)}
                  </div>
                </div>
              )
            })}

            {/* Invoice alerts */}
            {invoiceAlerts?.slice(0, 5).map((inv) => {
              const daysLeft = Math.ceil(
                (new Date(inv.due_date).getTime() - new Date(today).getTime()) / 86400000
              )
              const isOverdue = inv.status !== 'paid' && daysLeft < 0
              return (
                <div
                  key={`inv-${inv.id}`}
                  className={clsx(
                    'rounded-lg px-3 py-2 border transition-colors',
                    inv.status === 'draft'
                      ? 'bg-white/[0.02] border-white/5'
                      : isOverdue
                      ? 'bg-rose-500/10 border-rose-500/20'
                      : 'bg-fuchsia-500/5 border-fuchsia-500/10'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <FileText size={10} className="text-fuchsia-400/60" />
                      <span className="text-[11px] font-medium text-gray-200 truncate">{inv.client_name}</span>
                    </div>
                    <span className={clsx(
                      'text-[10px] ml-2 shrink-0 font-bold',
                      inv.status === 'draft' ? 'text-gray-500' : isOverdue ? 'text-rose-400' : 'text-fuchsia-400'
                    )}>
                      {inv.status === 'draft' ? '未送付' : isOverdue ? `${Math.abs(daysLeft)}日超過` : `残${daysLeft}日`}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-600 mt-0.5">
                    {inv.title} / {formatYen(inv.amount)}
                  </div>
                </div>
              )
            })}

            {(!legalAlerts?.length && !invoiceAlerts?.length) && (
              <div className="text-xs text-gray-600 py-4 text-center">
                {legalAlerts && invoiceAlerts ? 'アラートなし' : '読み込み中...'}
              </div>
            )}
          </div>

          {invoiceAlerts && invoiceAlerts.length > 0 && (
            <button
              onClick={() => navigate('/finance/invoices')}
              className="mt-3 text-[11px] text-fuchsia-400/70 font-medium hover:text-fuchsia-300 transition-colors"
            >
              請求書管理へ →
            </button>
          )}
        </div>
      </div>

      {/* Market Notes - bottom bar */}
      {marketNotes && marketNotes.length > 0 && (
        <div className="mt-4 bg-[#111111] border border-white/5 rounded-md p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-gray-500/10 rounded flex items-center justify-center">
              <TrendingUp size={12} className="text-gray-400" />
            </div>
            <h3 className="text-[10px] font-semibold text-gray-500 tracking-widest uppercase">市場メモ</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {marketNotes.slice(0, 3).map((note) => (
              <div key={note.id} className="bg-white/[0.02] border border-white/5 rounded-lg p-3 hover:border-gray-500/20 transition-colors">
                <div className="text-[11px] font-medium text-gray-200 truncate">{note.title}</div>
                <div className="text-[10px] text-gray-600 mt-1">
                  {new Date(note.created_at).toLocaleDateString('ja-JP')}
                </div>
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {note.tags.map((tag) => (
                      <span key={tag} className="bg-gray-500/10 text-gray-300/70 text-[9px] px-1.5 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
