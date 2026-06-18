import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { fetchCashBalances, upsertCashBalance, fetchFinanceSummary } from '../../api/finance'
import FinanceSubNav from './FinanceSubNav'

function formatYen(amount: number): string {
  return new Intl.NumberFormat('ja-JP').format(amount) + '円'
}

export default function CashBalance() {
  const queryClient = useQueryClient()
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [balance, setBalance] = useState('')
  const [note, setNote] = useState('')

  const { data: balances = [] } = useQuery({
    queryKey: ['cash-balances'],
    queryFn: fetchCashBalances,
  })

  const { data: summary } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: fetchFinanceSummary,
  })

  const mutation = useMutation({
    mutationFn: upsertCashBalance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-balances'] })
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] })
      setBalance('')
      setNote('')
    },
  })

  const chartData = [...balances]
    .reverse()
    .map((b) => ({ month: b.recorded_month, balance: b.balance }))

  return (
    <div className="space-y-5">
      <FinanceSubNav />

      {/* Input form */}
      <div className="bg-[#111111] border border-white/5 rounded-md p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">残高を入力</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">対象月</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full bg-[#111111] border border-white/10 text-white placeholder:text-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">残高（円）</label>
            <input
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0"
              className="w-full bg-[#111111] border border-white/10 text-white placeholder:text-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">メモ</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-[#111111] border border-white/10 text-white placeholder:text-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            onClick={() => {
              if (!month || !balance) return
              mutation.mutate({ recorded_month: month, balance: parseInt(balance), note: note || undefined })
            }}
            disabled={!month || !balance || mutation.isPending}
            className="px-4 py-1.5 text-sm bg-fuchsia-500 text-white rounded-md hover:bg-fuchsia-600 disabled:opacity-50"
          >
            {mutation.isPending ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {/* Runway info */}
      {summary && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-amber-400/80">最新残高</div>
            <div className="text-xl font-bold text-amber-300">
              {summary.latest_balance != null ? formatYen(summary.latest_balance) : '—'}
            </div>
            {summary.latest_balance_month && (
              <div className="text-xs text-amber-500/60">（{summary.latest_balance_month} 時点）</div>
            )}
          </div>
          <div>
            <div className="text-xs text-amber-400/80">ランウェイ</div>
            <div className="text-xl font-bold text-amber-300">
              {summary.runway_months != null ? `${summary.runway_months}ヶ月` : '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-amber-400/80">月間定期支出</div>
            <div className="text-lg font-bold text-rose-400">
              {formatYen(summary.fixed_expense_total_next)}
            </div>
          </div>
          <div>
            <div className="text-xs text-amber-400/80">月間定期収入</div>
            <div className="text-lg font-bold text-sky-400">
              {formatYen(summary.fixed_income_total_next)}
            </div>
            <div className="text-xs text-amber-500/60">
              ネット支出: {formatYen(summary.net_monthly_burn)}/月
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="bg-[#111111] border border-white/5 rounded-md p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">残高推移</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
              <Tooltip
                formatter={(v: number) => formatYen(v)}
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6 }}
                itemStyle={{ color: '#e5e7eb' }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="#d946ef"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="残高"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History table */}
      <div className="bg-[#111111] border border-white/5 rounded-md overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5">
          <h3 className="text-sm font-medium text-gray-300">残高履歴</h3>
        </div>
        {balances.length === 0 ? (
          <div className="p-6 text-center text-gray-600 text-sm">残高データがありません</div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.03]">
                <th className="px-4 py-2.5 text-xs font-medium text-gray-500">月</th>
                <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-right">残高</th>
                <th className="px-4 py-2.5 text-xs font-medium text-gray-500">メモ</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((b) => (
                <tr key={b.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-2.5 text-sm text-gray-300 font-medium">{b.recorded_month}</td>
                  <td className="px-4 py-2.5 text-sm font-semibold text-gray-200 text-right">{formatYen(b.balance)}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-500">{b.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
