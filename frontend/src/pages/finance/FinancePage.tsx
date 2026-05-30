import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
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
} from 'recharts'
import { clsx } from 'clsx'
import {
  fetchTransactions,
  createTransaction,
  deleteTransaction,
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
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="text-sm font-medium text-gray-800">取引を追加</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">日付</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">種別</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'income' | 'expense')}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          >
            <option value="income">収入</option>
            <option value="expense">支出</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">カテゴリ</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="例: 売上, 広告費"
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">金額（円）</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">説明（任意）</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md">
          キャンセル
        </button>
        <button
          onClick={() => {
            if (!date || !category || !amount) return
            mutation.mutate({ date, type, category, amount: parseInt(amount), description: description || undefined })
          }}
          disabled={!date || !category || !amount || mutation.isPending}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
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
          <tr className="border-b border-gray-200">
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
                'border-b border-gray-100 hover:bg-gray-50',
                tx.is_fixed === 1 && 'bg-gray-50 opacity-70'
              )}
            >
              <td className="px-3 py-2 text-sm text-gray-600">{tx.date}</td>
              <td className="px-3 py-2">
                <span
                  className={clsx(
                    'text-xs px-2 py-0.5 rounded-full font-medium',
                    tx.type === 'income'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-red-100 text-red-700'
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
                <span className={tx.type === 'income' ? 'text-blue-600' : 'text-red-500'}>
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
                    className="text-red-400 hover:text-red-600"
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
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth())
  const [showAddForm, setShowAddForm] = useState(false)

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

  return (
    <div className="space-y-5">
      {/* Sub-navigation */}
      <div className="flex gap-2">
        <Link to="/finance" className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md font-medium">
          収支
        </Link>
        <Link to="/finance/fixed" className="px-3 py-1.5 text-sm bg-white border border-gray-200 text-gray-600 rounded-md hover:bg-gray-50">
          固定費
        </Link>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">対象月:</label>
        <input
          type="month"
          value={yearMonth}
          onChange={(e) => setYearMonth(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
        />
        <div className="ml-auto flex gap-4 text-sm">
          <span className="text-blue-600 font-medium">収入: {formatYen(incomeTotal)}</span>
          <span className="text-red-500 font-medium">支出: {formatYen(expenseTotal)}</span>
          <span className={clsx('font-medium', incomeTotal - expenseTotal >= 0 ? 'text-green-600' : 'text-red-600')}>
            収支: {incomeTotal - expenseTotal >= 0 ? '+' : ''}{formatYen(incomeTotal - expenseTotal)}
          </span>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">月次収支</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
              <Tooltip formatter={(v: number) => formatYen(v)} />
              <Bar dataKey="amount" fill="#6366f1">
                {barData.map((entry, index) => (
                  <Cell key={index} fill={entry.name === '収入' ? '#3b82f6' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">支出カテゴリ別</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name">
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatYen(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              支出データなし
            </div>
          )}
        </div>
      </div>

      {/* Add transaction button */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700">取引一覧</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50"
        >
          <Plus size={14} />
          取引追加
        </button>
      </div>

      {showAddForm && <AddTransactionForm onClose={() => setShowAddForm(false)} />}

      {/* Transaction table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">読み込み中...</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            {yearMonth}の取引データがありません
          </div>
        ) : (
          <TransactionTable transactions={transactions} />
        )}
      </div>
    </div>
  )
}
