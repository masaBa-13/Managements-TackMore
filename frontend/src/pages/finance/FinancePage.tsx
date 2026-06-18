import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Wallet } from 'lucide-react'
import FinanceSubNav from './FinanceSubNav'
import CategorySelect from '../../components/CategorySelect'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Line,
} from 'recharts'
import { clsx } from 'clsx'
import {
  fetchTransactions,
  createTransaction,
  deleteTransaction,
  fetchMonthlyTrend,
  type Transaction,
} from '../../api/finance'

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#ec4899']

function formatYen(amount: number): string {
  return new Intl.NumberFormat('ja-JP').format(amount) + '円'
}

function getCurrentYearMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

interface AddTransactionFormProps {
  onClose: () => void
}

function AddTransactionForm({ onClose }: AddTransactionFormProps) {
  const queryClient = useQueryClient()
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')

  const mutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] })
      onClose()
    },
  })

  return (
    <div className="bg-[#111111] border border-white/5 rounded-md p-4 space-y-3">
      <div className="text-sm font-medium text-gray-200">取引を追加</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">日付</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-[#111111] border border-white/10 text-white placeholder:text-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">種別</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'income' | 'expense')}
            className="w-full bg-[#111111] border border-white/10 text-white placeholder:text-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
          >
            <option value="income">収入</option>
            <option value="expense">支出</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">カテゴリ</label>
          <CategorySelect value={category} onChange={setCategory} filterType={type} className="w-full" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">金額（円）</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full bg-[#111111] border border-white/10 text-white placeholder:text-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">説明（任意）</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-[#111111] border border-white/10 text-white placeholder:text-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-400 hover:bg-white/5 rounded-md">
          キャンセル
        </button>
        <button
          onClick={() => {
            if (!date || !category || !amount) return
            mutation.mutate({ date, type, category, amount: parseInt(amount), description: description || undefined })
          }}
          disabled={!date || !category || !amount || mutation.isPending}
          className="px-3 py-1.5 text-sm bg-fuchsia-500 text-white rounded-md hover:bg-fuchsia-600 disabled:opacity-50"
        >
          {mutation.isPending ? '追加中...' : '追加'}
        </button>
      </div>
    </div>
  )
}

function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] })
    },
  })

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-white/5">
            <th className="px-3 py-2 text-xs font-medium text-gray-500">日付</th>
            <th className="px-3 py-2 text-xs font-medium text-gray-500">種別</th>
            <th className="px-3 py-2 text-xs font-medium text-gray-500">カテゴリ</th>
            <th className="px-3 py-2 text-xs font-medium text-gray-500">説明</th>
            <th className="px-3 py-2 text-xs font-medium text-gray-500 text-right">金額</th>
            <th className="px-3 py-2 text-xs font-medium text-gray-500"></th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr
              key={tx.id}
              className={clsx(
                'border-b border-white/5 hover:bg-white/5',
                tx.is_fixed === 1 && 'bg-white/[0.02] opacity-70'
              )}
            >
              <td className="px-3 py-2 text-sm text-gray-600">{tx.date}</td>
              <td className="px-3 py-2">
                <span
                  className={clsx(
                    'text-xs px-2 py-0.5 rounded-full font-medium',
                    tx.type === 'income'
                      ? 'bg-sky-500/20 text-sky-400'
                      : 'bg-rose-500/20 text-rose-400'
                  )}
                >
                  {tx.type === 'income' ? '収入' : '支出'}
                </span>
              </td>
              <td className="px-3 py-2 text-sm text-gray-700">{tx.category}</td>
              <td className="px-3 py-2 text-sm text-gray-500 max-w-xs truncate">
                {tx.description ?? '—'}
                {tx.is_fixed === 1 && <span className="ml-1 text-xs text-gray-400">（固定費）</span>}
              </td>
              <td className="px-3 py-2 text-sm text-right font-medium">
                <span className={tx.type === 'income' ? 'text-sky-400' : 'text-rose-400'}>
                  {tx.type === 'expense' ? '−' : '+'}{formatYen(tx.amount)}
                </span>
              </td>
              <td className="px-3 py-2 text-sm">
                {tx.is_fixed !== 1 && (
                  <button
                    onClick={() => {
                      if (window.confirm('この取引を削除しますか？')) {
                        deleteMutation.mutate(tx.id)
                      }
                    }}
                    className="text-rose-400 hover:text-rose-300"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function FinancePage() {
  const navigate = useNavigate()
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth())
  const [showAddForm, setShowAddForm] = useState(false)
  const [includeForecast, setIncludeForecast] = useState(false)

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', yearMonth],
    queryFn: () => fetchTransactions(yearMonth),
  })

  const incomeTotal = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
  const expenseTotal = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)

  // Category breakdown for pie chart (expenses only)
  const categoryMap = new Map<string, number>()
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      categoryMap.set(t.category, (categoryMap.get(t.category) ?? 0) + t.amount)
    })
  const pieData = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }))

  // Bar chart: just current month summary
  const barData = [
    { name: '収入', amount: incomeTotal },
    { name: '支出', amount: expenseTotal },
  ]

  // Monthly trend
  const { data: trend = [] } = useQuery({
    queryKey: ['monthly-trend', includeForecast],
    queryFn: () => fetchMonthlyTrend(6, includeForecast),
  })

  return (
    <div className="space-y-5">
      <FinanceSubNav />

      {/* Month selector + balance button */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm text-gray-400">対象月:</label>
        <input
          type="month"
          value={yearMonth}
          onChange={(e) => setYearMonth(e.target.value)}
          className="bg-[#111111] border border-white/10 text-white placeholder:text-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
        />
        <button
          onClick={() => navigate('/finance/balance')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-md hover:bg-amber-500/20 font-medium"
        >
          <Wallet size={14} />
          残高を入力
        </button>
        <div className="ml-auto flex gap-4 text-sm">
          <span className="text-sky-400 font-medium">収入: {formatYen(incomeTotal)}</span>
          <span className="text-rose-400 font-medium">支出: {formatYen(expenseTotal)}</span>
          <span className={clsx('font-medium', incomeTotal - expenseTotal >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
            収支: {incomeTotal - expenseTotal >= 0 ? '+' : ''}{formatYen(incomeTotal - expenseTotal)}
          </span>
        </div>
      </div>

      {/* Monthly Trend Chart */}
      {trend.length > 0 && (
        <div className="bg-[#111111] border border-white/5 rounded-md p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-300">月次推移（6ヶ月）</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-gray-500">入金見込みを含む</span>
              <button
                onClick={() => setIncludeForecast(!includeForecast)}
                className={clsx(
                  'relative w-10 h-5 rounded-full transition-colors',
                  includeForecast ? 'bg-fuchsia-500' : 'bg-white/10'
                )}
              >
                <span className={clsx(
                  'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow',
                  includeForecast ? 'left-5.5 translate-x-0.5' : 'left-0.5'
                )} />
              </button>
            </label>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
              <Tooltip formatter={(v: number) => formatYen(v)} contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6 }} itemStyle={{ color: '#e5e7eb' }} labelStyle={{ color: '#9ca3af' }} />
              <Legend wrapperStyle={{ color: '#9ca3af' }} />
              <Bar dataKey="income" fill="#a78bfa" name="収入（実績）" />
              {includeForecast && <Bar dataKey="forecast_income" fill="#c4b5fd" name="入金見込み" />}
              <Bar dataKey="expense" fill="#fb7185" name="支出" />
              <Line type="monotone" dataKey="balance" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} name="残高" connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Current Month Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#111111] border border-white/5 rounded-md p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">当月収支</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
              <Tooltip formatter={(v: number) => formatYen(v)} contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6 }} itemStyle={{ color: '#e5e7eb' }} labelStyle={{ color: '#9ca3af' }} />
              <Bar dataKey="amount" fill="#a78bfa">
                {barData.map((entry, index) => (
                  <Cell key={index} fill={entry.name === '収入' ? '#a78bfa' : '#fb7185'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#111111] border border-white/5 rounded-md p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">支出カテゴリ別</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name">
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatYen(v)} contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6 }} itemStyle={{ color: '#e5e7eb' }} labelStyle={{ color: '#9ca3af' }} />
                <Legend wrapperStyle={{ color: '#9ca3af' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
              支出データなし
            </div>
          )}
        </div>
      </div>

      {/* Add transaction button */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-300">取引一覧</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#111111] border border-white/5 text-gray-300 rounded-md hover:bg-white/5"
        >
          <Plus size={14} />
          取引追加
        </button>
      </div>

      {showAddForm && <AddTransactionForm onClose={() => setShowAddForm(false)} />}

      {/* Transaction table */}
      <div className="bg-[#111111] border border-white/5 rounded-md overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-600">読み込み中...</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            {yearMonth}の取引データがありません
          </div>
        ) : (
          <TransactionTable transactions={transactions} />
        )}
      </div>
    </div>
  )
}
