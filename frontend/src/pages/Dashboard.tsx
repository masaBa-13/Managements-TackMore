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
  ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine,
} from 'recharts'
import { fetchFinanceSummary, fetchInvoiceAlerts, fetchMonthlyTrend } from '../api/finance'
import { fetchLegalAlerts } from '../api/legal'
import { fetchTasksWithOffline } from '../api/tasks'
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

function LightTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-[#DDE8E2] rounded-xl px-3 py-2.5 shadow-lg">
      <div className="text-xs text-[#8FA099] mb-1.5">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[#6B7A8D]">{p.name}</span>
          <span className="text-[#1A2330] font-semibold ml-auto pl-4">{formatYen(p.value)}</span>
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
    queryFn: () => fetchTasksWithOffline(),
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
    queryFn: () => fetchMonthlyTrend(12, includeForecast, 24),
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
    const currentYM = new Date().toISOString().slice(0, 7)
    const currentIdx = trend.findIndex(t => t.month === currentYM)
    if (currentIdx >= 0) {
      const pointX = (currentIdx / trend.length) * el.scrollWidth
      el.scrollLeft = Math.max(0, pointX - el.clientWidth / 2)
    } else {
      el.scrollLeft = el.scrollWidth
    }
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

  const taskDonutData = [
    { name: '完了', value: doneTasks, color: '#3AAA6D' },
    { name: '進行中', value: inProgressTasks, color: '#7EC8A4' },
    { name: '未着手', value: totalTasks - doneTasks - inProgressTasks, color: '#DDE8E2' },
  ].filter(d => d.value > 0)

  const netIncome = (summary?.income_total ?? 0) - (summary?.expense_total ?? 0)

  return (
    <div className="min-h-screen -m-4 md:-m-6 p-4 md:p-6 bg-[#EBF3EF]">
      {/* Reminder banner */}
      {summary?.balance_reminder_needed && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertCircle size={16} />
            <span className="text-sm font-medium">今月の残高がまだ入力されていません</span>
          </div>
          <button
            onClick={() => navigate('/finance/balance')}
            className="text-sm text-[#3AAA6D] font-semibold hover:text-[#2D8A58] transition-colors"
          >
            入力する →
          </button>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {/* Balance */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#DDE8E2]">
          <div className="text-[11px] font-medium text-[#8FA099] mb-1.5">現預金残高</div>
          <div className="text-xl md:text-2xl font-bold text-[#1A2330] tracking-tight">
            {summary?.latest_balance != null ? formatYenShort(summary.latest_balance) : '---'}
          </div>
          {summary?.latest_balance_month && (
            <div className="text-[11px] text-[#B0C4BA] mt-1">{summary.latest_balance_month} 時点</div>
          )}
        </div>

        {/* Income */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#DDE8E2]">
          <div className="text-[11px] font-medium text-[#8FA099] mb-1.5">今月収入</div>
          <div className="text-xl md:text-2xl font-bold text-[#3AAA6D] tracking-tight">
            {summary ? formatYenShort(summary.income_total) : '---'}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight size={11} className="text-[#3AAA6D]" />
            <span className="text-[11px] text-[#8FA099]">実績</span>
          </div>
        </div>

        {/* Expense */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#DDE8E2]">
          <div className="text-[11px] font-medium text-[#8FA099] mb-1.5">今月支出</div>
          <div className="text-xl md:text-2xl font-bold text-[#E05A6B] tracking-tight">
            {summary ? formatYenShort(summary.expense_total) : '---'}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <ArrowDownRight size={11} className="text-[#E05A6B]" />
            <span className="text-[11px] text-[#8FA099]">実績</span>
          </div>
        </div>

        {/* Runway */}
        <div className="bg-[#3AAA6D] rounded-2xl p-4 shadow-sm">
          <div className="text-[11px] font-medium text-[#A8DEC0] mb-1.5">ランウェイ</div>
          <div className="text-xl md:text-2xl font-bold text-white tracking-tight">
            {summary?.runway_months != null ? `${summary.runway_months}ヶ月` : '---'}
          </div>
          {summary?.net_monthly_burn != null && (
            <div className="text-[11px] text-[#A8DEC0] mt-1">ネット {formatYenShort(summary.net_monthly_burn)}/月</div>
          )}
        </div>
      </div>

      {/* Main Chart */}
      {trend.length > 0 && (
        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-[#DDE8E2]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-[#1A2330]">収支・残高推移</h2>
              <div className="text-[11px] text-[#8FA099] mt-0.5">Monthly Cashflow</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 bg-[#F4F9F6] rounded-xl px-3 py-1.5">
                <span className="text-[11px] text-[#8FA099]">今月収支</span>
                <span className={clsx(
                  'text-sm font-bold',
                  netIncome >= 0 ? 'text-[#3AAA6D]' : 'text-[#E05A6B]'
                )}>
                  {netIncome >= 0 ? '+' : ''}{formatYenShort(netIncome)}
                </span>
              </div>
              <button
                onClick={() => setIncludeForecast(!includeForecast)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all',
                  includeForecast
                    ? 'bg-[#EBF3EF] text-[#3AAA6D] border border-[#B3D9C4]'
                    : 'bg-[#F4F9F6] text-[#8FA099] border border-[#DDE8E2] hover:border-[#B3D9C4]'
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
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white border border-[#DDE8E2] rounded-full flex items-center justify-center hover:bg-[#F4F9F6] transition-colors shadow-sm"
              >
                <ChevronLeft size={14} className="text-[#6B7A8D]" />
              </button>
            )}
            {canScrollRight && (
              <button
                onClick={() => scrollChart('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white border border-[#DDE8E2] rounded-full flex items-center justify-center hover:bg-[#F4F9F6] transition-colors shadow-sm"
              >
                <ChevronRight size={14} className="text-[#6B7A8D]" />
              </button>
            )}
            <div
              ref={chartScrollRef}
              onScroll={updateScrollState}
              className="overflow-x-auto"
              style={{ scrollbarWidth: 'none' }}
            >
              <div style={{ width: `${Math.max(trend.length * 80, 100)}px`, minWidth: '100%' }}>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={trend} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <defs>
                      <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3AAA6D" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#3AAA6D" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#E05A6B" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#E05A6B" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4A90D9" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#4A90D9" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EBF3EF" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: '#8FA099' }}
                      axisLine={{ stroke: '#DDE8E2' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#8FA099' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}万`}
                    />
                    <Tooltip content={<LightTooltip />} />
                    <ReferenceLine
                      x={new Date().toISOString().slice(0, 7)}
                      stroke="#3AAA6D"
                      strokeDasharray="4 4"
                      strokeOpacity={0.4}
                      label={{ value: '今月', position: 'top', fill: '#3AAA6D', fontSize: 10 }}
                    />
                    <Area type="monotone" dataKey="income" fill="url(#incomeGrad)" stroke="#3AAA6D" strokeWidth={2} name="収入" dot={false} />
                    {includeForecast && (
                      <Bar dataKey="forecast_income" fill="#3AAA6D22" stroke="#3AAA6D66" strokeWidth={1} name="入金見込み" radius={[3, 3, 0, 0]} />
                    )}
                    <Area type="monotone" dataKey="expense" fill="url(#expenseGrad)" stroke="#E05A6B" strokeWidth={1.5} name="支出" dot={false} />
                    <Area type="monotone" dataKey="balance" fill="url(#balanceGrad)" stroke="#4A90D9" strokeWidth={2} name="残高" connectNulls dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-5 mt-3 px-1">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-[2px] bg-[#3AAA6D] rounded" />
              <span className="text-[11px] text-[#8FA099]">収入</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-[2px] bg-[#E05A6B] rounded" />
              <span className="text-[11px] text-[#8FA099]">支出</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-[2px] bg-[#4A90D9] rounded" />
              <span className="text-[11px] text-[#8FA099]">残高</span>
            </div>
            {includeForecast && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-2 bg-[#3AAA6D22] border border-[#3AAA6D66] rounded-sm" />
                <span className="text-[11px] text-[#8FA099]">見込み</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cash Summary */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#DDE8E2]">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 bg-[#EBF3EF] rounded-xl flex items-center justify-center">
              <DollarSign size={15} className="text-[#3AAA6D]" />
            </div>
            <h3 className="text-sm font-semibold text-[#1A2330]">キャッシュ</h3>
          </div>
          {summary ? (
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-[12px] text-[#8FA099]">現預金残高</span>
                <span className="text-lg font-bold text-[#1A2330]">
                  {summary.latest_balance != null ? formatYen(summary.latest_balance) : '未入力'}
                </span>
              </div>
              <div className="h-px bg-[#EBF3EF]" />
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#F4F9F6] rounded-xl p-3">
                  <div className="text-[11px] text-[#8FA099] mb-1">定期支出</div>
                  <div className="text-sm font-semibold text-[#E05A6B]">
                    {formatYenShort(summary.fixed_expense_total_next)}
                  </div>
                </div>
                {summary.fixed_income_total_next > 0 && (
                  <div className="bg-[#F4F9F6] rounded-xl p-3">
                    <div className="text-[11px] text-[#8FA099] mb-1">定期収入</div>
                    <div className="text-sm font-semibold text-[#3AAA6D]">
                      {formatYenShort(summary.fixed_income_total_next)}
                    </div>
                  </div>
                )}
              </div>
              {summary.runway_months != null && (
                <div className="bg-[#EBF3EF] rounded-xl p-3">
                  <div className="text-[11px] text-[#8FA099]">ランウェイ</div>
                  <div className="text-2xl font-black text-[#3AAA6D] tracking-tight">
                    {summary.runway_months}<span className="text-xs font-medium text-[#8FA099] ml-0.5">ヶ月</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-[#B0C4BA]">読み込み中...</div>
          )}
        </div>

        {/* Task Progress - Donut */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#DDE8E2]">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 bg-[#EBF3EF] rounded-xl flex items-center justify-center">
              <CheckSquare size={15} className="text-[#3AAA6D]" />
            </div>
            <h3 className="text-sm font-semibold text-[#1A2330]">タスク進捗</h3>
            <span className="ml-auto text-[11px] text-[#B0C4BA]">{totalTasks} 件</span>
          </div>
          {tasks ? (
            <div className="flex items-center gap-4">
              <div className="relative w-28 h-28 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={taskDonutData.length > 0 ? taskDonutData : [{ name: '-', value: 1, color: '#DDE8E2' }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={48}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {(taskDonutData.length > 0 ? taskDonutData : [{ name: '-', value: 1, color: '#DDE8E2' }]).map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-lg font-black text-[#1A2330]">{completionRate}%</div>
                </div>
              </div>
              <div className="space-y-2.5 flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#3AAA6D]" />
                    <span className="text-xs text-[#6B7A8D]">完了</span>
                  </div>
                  <span className="text-sm font-bold text-[#1A2330]">{doneTasks}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#7EC8A4]" />
                    <span className="text-xs text-[#6B7A8D]">進行中</span>
                  </div>
                  <span className="text-sm font-bold text-[#1A2330]">{inProgressTasks}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#DDE8E2]" />
                    <span className="text-xs text-[#6B7A8D]">未着手</span>
                  </div>
                  <span className="text-sm font-bold text-[#1A2330]">{totalTasks - doneTasks - inProgressTasks}</span>
                </div>
                {overdueTasks > 0 && (
                  <div className="flex items-center justify-between pt-1 border-t border-[#EBF3EF]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#E05A6B] animate-pulse" />
                      <span className="text-xs text-[#E05A6B]">期限超過</span>
                    </div>
                    <span className="text-sm font-bold text-[#E05A6B]">{overdueTasks}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs text-[#B0C4BA]">読み込み中...</div>
          )}
        </div>

        {/* Alerts combined */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#DDE8E2]">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center">
              <AlertCircle size={15} className="text-[#E05A6B]" />
            </div>
            <h3 className="text-sm font-semibold text-[#1A2330]">アラート</h3>
            {((legalAlerts?.length ?? 0) + (invoiceAlerts?.length ?? 0)) > 0 && (
              <span className="ml-auto bg-red-50 text-[#E05A6B] text-[11px] font-bold px-2 py-0.5 rounded-full">
                {(legalAlerts?.length ?? 0) + (invoiceAlerts?.length ?? 0)}
              </span>
            )}
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
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
                    'rounded-xl px-3 py-2.5 border transition-colors',
                    isOverdue
                      ? 'bg-red-50 border-red-100'
                      : isUrgent
                      ? 'bg-amber-50 border-amber-100'
                      : 'bg-[#F4F9F6] border-[#DDE8E2]'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#1A2330] truncate">{item.title}</span>
                    <span className={clsx(
                      'text-[11px] ml-2 shrink-0 font-bold',
                      isOverdue ? 'text-[#E05A6B]' : isUrgent ? 'text-amber-600' : 'text-[#8FA099]'
                    )}>
                      {isOverdue ? `${Math.abs(daysLeft)}日超過` : `残${daysLeft}日`}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#8FA099] mt-0.5">
                    {item.category} / {formatDate(item.due_date)}
                  </div>
                </div>
              )
            })}

            {invoiceAlerts?.slice(0, 5).map((inv) => {
              const daysLeft = Math.ceil(
                (new Date(inv.due_date).getTime() - new Date(today).getTime()) / 86400000
              )
              const isOverdue = inv.status !== 'paid' && daysLeft < 0
              return (
                <div
                  key={`inv-${inv.id}`}
                  className={clsx(
                    'rounded-xl px-3 py-2.5 border transition-colors',
                    inv.status === 'draft'
                      ? 'bg-[#F4F9F6] border-[#DDE8E2]'
                      : isOverdue
                      ? 'bg-red-50 border-red-100'
                      : 'bg-[#EBF3EF] border-[#B3D9C4]'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <FileText size={11} className="text-[#3AAA6D]" />
                      <span className="text-xs font-medium text-[#1A2330] truncate">{inv.client_name}</span>
                    </div>
                    <span className={clsx(
                      'text-[11px] ml-2 shrink-0 font-bold',
                      inv.status === 'draft' ? 'text-[#8FA099]' : isOverdue ? 'text-[#E05A6B]' : 'text-[#3AAA6D]'
                    )}>
                      {inv.status === 'draft' ? '未送付' : isOverdue ? `${Math.abs(daysLeft)}日超過` : `残${daysLeft}日`}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#8FA099] mt-0.5">
                    {inv.title} / {formatYen(inv.amount)}
                  </div>
                </div>
              )
            })}

            {(!legalAlerts?.length && !invoiceAlerts?.length) && (
              <div className="text-xs text-[#B0C4BA] py-6 text-center">
                {legalAlerts && invoiceAlerts ? 'アラートなし' : '読み込み中...'}
              </div>
            )}
          </div>

          {invoiceAlerts && invoiceAlerts.length > 0 && (
            <button
              onClick={() => navigate('/finance/invoices')}
              className="mt-3 text-[12px] text-[#3AAA6D] font-medium hover:text-[#2D8A58] transition-colors"
            >
              請求書管理へ →
            </button>
          )}
        </div>
      </div>

      {/* Market Notes */}
      {marketNotes && marketNotes.length > 0 && (
        <div className="mt-4 bg-white rounded-2xl p-4 shadow-sm border border-[#DDE8E2]">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 bg-[#EBF3EF] rounded-xl flex items-center justify-center">
              <TrendingUp size={13} className="text-[#3AAA6D]" />
            </div>
            <h3 className="text-sm font-semibold text-[#1A2330]">市場メモ</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {marketNotes.slice(0, 3).map((note) => (
              <div key={note.id} className="bg-[#F4F9F6] border border-[#DDE8E2] rounded-xl p-3 hover:border-[#B3D9C4] transition-colors cursor-pointer">
                <div className="text-xs font-medium text-[#1A2330] truncate">{note.title}</div>
                <div className="text-[11px] text-[#8FA099] mt-1">
                  {new Date(note.created_at).toLocaleDateString('ja-JP')}
                </div>
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {note.tags.map((tag) => (
                      <span key={tag} className="bg-white text-[#6B7A8D] text-[10px] px-1.5 py-0.5 rounded-lg border border-[#DDE8E2]">
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
