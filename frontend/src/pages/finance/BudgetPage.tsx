import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  fetchBudgets,
  upsertBudget,
  deleteBudget,
  fetchBudgetVsActual,
} from '../../api/finance'
import FinanceSubNav from './FinanceSubNav'

function formatYen(amount: number): string {
  return new Intl.NumberFormat('ja-JP').format(amount) + '円'
}

function getCurrentYearMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

export default function BudgetPage() {
  const queryClient = useQueryClient()
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth())
  const [showForm, setShowForm] = useState(false)
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets', yearMonth],
    queryFn: () => fetchBudgets(yearMonth),
  })

  const { data: comparison = [] } = useQuery({
    queryKey: ['budget-vs-actual', yearMonth],
    queryFn: () => fetchBudgetVsActual(yearMonth),
  })

  const upsertMutation = useMutation({
    mutationFn: upsertBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', yearMonth] })
      queryClient.invalidateQueries({ queryKey: ['budget-vs-actual', yearMonth] })
      setCategory('')
      setAmount('')
      setShowForm(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', yearMonth] })
      queryClient.invalidateQueries({ queryKey: ['budget-vs-actual', yearMonth] })
    },
  })

  const totalBudget = comparison.reduce((sum, c) => sum + c.budget, 0)
  const totalActual = comparison.reduce((sum, c) => sum + c.actual, 0)
  const overBudgetCount = comparison.filter((c) => c.budget > 0 && c.actual > c.budget).length

  return (
    <div className="space-y-5">
      <FinanceSubNav />

      {/* Month selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">対象月:</label>
        <input
          type="month"
          value={yearMonth}
          onChange={(e) => setYearMonth(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500">予算合計</div>
          <div className="text-xl font-bold text-gray-900 mt-1">{formatYen(totalBudget)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500">実績合計</div>
          <div className={clsx('text-xl font-bold mt-1', totalActual > totalBudget ? 'text-red-600' : 'text-gray-900')}>
            {formatYen(totalActual)}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500">予算超過カテゴリ</div>
          <div className={clsx('text-xl font-bold mt-1', overBudgetCount > 0 ? 'text-red-600' : 'text-green-600')}>
            {overBudgetCount}件
          </div>
        </div>
      </div>

      {/* Chart */}
      {comparison.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">予算 vs 実績</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={comparison} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 12 }} width={100} />
              <Tooltip formatter={(v: number) => formatYen(v)} />
              <Legend />
              <Bar dataKey="budget" fill="#a5b4fc" name="予算" />
              <Bar dataKey="actual" fill="#6366f1" name="実績" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Add budget + list */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">予算設定</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50"
        >
          <Plus size={14} />
          予算追加
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">カテゴリ</label>
              <input type="text" value={category} onChange={(e) => setCategory(e.target.value)}
                placeholder="例: 広告費, 人件費" className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">予算金額（円）</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="0" className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md">
              キャンセル
            </button>
            <button
              onClick={() => {
                if (!category || !amount) return
                upsertMutation.mutate({ year_month: yearMonth, category, amount: parseInt(amount) })
              }}
              disabled={!category || !amount || upsertMutation.isPending}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {upsertMutation.isPending ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      )}

      {/* Budget detail table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {comparison.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            予算データがありません。カテゴリ別の予算を追加してください。
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-2 text-xs font-medium text-gray-500">カテゴリ</th>
                <th className="px-4 py-2 text-xs font-medium text-gray-500 text-right">予算</th>
                <th className="px-4 py-2 text-xs font-medium text-gray-500 text-right">実績</th>
                <th className="px-4 py-2 text-xs font-medium text-gray-500 text-right">差額</th>
                <th className="px-4 py-2 text-xs font-medium text-gray-500">進捗</th>
                <th className="px-4 py-2 text-xs font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => {
                const diff = row.budget - row.actual
                const pct = row.budget > 0 ? Math.min((row.actual / row.budget) * 100, 150) : 0
                const isOver = row.budget > 0 && row.actual > row.budget
                const budget = budgets.find((b) => b.category === row.category)

                return (
                  <tr key={row.category} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-medium text-gray-700">{row.category}</td>
                    <td className="px-4 py-2 text-sm text-gray-600 text-right">
                      {row.budget > 0 ? formatYen(row.budget) : '—'}
                    </td>
                    <td className="px-4 py-2 text-sm font-medium text-right">
                      <span className={isOver ? 'text-red-600' : 'text-gray-900'}>
                        {formatYen(row.actual)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-right">
                      {row.budget > 0 ? (
                        <span className={diff >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {diff >= 0 ? '+' : ''}{formatYen(diff)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2 w-32">
                      {row.budget > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={clsx(
                                'h-full rounded-full transition-all',
                                isOver ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-indigo-500'
                              )}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-10 text-right">
                            {Math.round(pct)}%
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {budget && (
                        <button
                          onClick={() => {
                            if (window.confirm(`${row.category}の予算を削除しますか？`)) {
                              deleteMutation.mutate(budget.id)
                            }
                          }}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
