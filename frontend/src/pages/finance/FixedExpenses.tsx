import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { clsx } from 'clsx'
import FinanceSubNav from './FinanceSubNav'
import {
  fetchFixedExpenses,
  createFixedExpense,
  updateFixedExpense,
  deleteFixedExpense,
} from '../../api/finance'

function formatYen(amount: number): string {
  return new Intl.NumberFormat('ja-JP').format(amount) + '円'
}

interface FormState {
  name: string
  category: string
  amount: string
  billing_day: string
  note: string
  start_month: string
  end_month: string
}

const emptyForm: FormState = {
  name: '',
  category: '',
  amount: '',
  billing_day: '1',
  note: '',
  start_month: new Date().toISOString().slice(0, 7),
  end_month: '',
}

function FixedExpenseForm({
  initial,
  onSubmit,
  onClose,
  isPending,
}: {
  initial?: FormState
  onSubmit: (data: FormState) => void
  onClose: () => void
  isPending: boolean
}) {
  const [form, setForm] = useState<FormState>(initial ?? emptyForm)

  const set = (field: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">名称</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            placeholder="例: AWS費用"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">カテゴリ</label>
          <input
            type="text"
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            placeholder="例: インフラ費"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">金額（円）</label>
          <input
            type="number"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">引き落とし日</label>
          <input
            type="number"
            min={1}
            max={31}
            value={form.billing_day}
            onChange={(e) => set('billing_day', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">開始月</label>
          <input
            type="month"
            value={form.start_month}
            onChange={(e) => set('start_month', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">終了月（任意）</label>
          <input
            type="month"
            value={form.end_month}
            onChange={(e) => set('end_month', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">メモ</label>
          <input
            type="text"
            value={form.note}
            onChange={(e) => set('note', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md">
          キャンセル
        </button>
        <button
          onClick={() => onSubmit(form)}
          disabled={!form.name || !form.category || !form.amount || isPending}
          className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {isPending ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  )
}

export default function FixedExpenses() {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['fixed-expenses'],
    queryFn: fetchFixedExpenses,
  })

  const createMutation = useMutation({
    mutationFn: (form: FormState) =>
      createFixedExpense({
        name: form.name,
        category: form.category,
        amount: parseInt(form.amount),
        billing_day: parseInt(form.billing_day),
        note: form.note || undefined,
        start_month: form.start_month,
        end_month: form.end_month || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-expenses'] })
      setShowAdd(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, form }: { id: number; form: FormState }) =>
      updateFixedExpense(id, {
        name: form.name,
        category: form.category,
        amount: parseInt(form.amount),
        billing_day: parseInt(form.billing_day),
        note: form.note || undefined,
        start_month: form.start_month,
        end_month: form.end_month || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-expenses'] })
      setEditingId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteFixedExpense,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fixed-expenses'] }),
  })

  const activeExpenses = expenses.filter((e) => e.is_active === 1)
  const monthlyTotal = activeExpenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="space-y-5">
      <FinanceSubNav />

      {/* Summary */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <div className="text-sm text-indigo-700">月間固定費合計（有効）</div>
        <div className="text-2xl font-bold text-indigo-900 mt-1">{formatYen(monthlyTotal)}</div>
        <div className="text-xs text-indigo-500 mt-1">{activeExpenses.length}件の有効な固定費</div>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700">固定費マスタ</h3>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50"
        >
          <Plus size={14} />
          固定費追加
        </button>
      </div>

      {showAdd && (
        <FixedExpenseForm
          onSubmit={(form) => createMutation.mutate(form)}
          onClose={() => setShowAdd(false)}
          isPending={createMutation.isPending}
        />
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">読み込み中...</div>
        ) : expenses.length === 0 ? (
          <div className="p-8 text-center text-gray-400">固定費が登録されていません</div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-2.5 text-xs font-medium text-gray-500">名称</th>
                <th className="px-3 py-2.5 text-xs font-medium text-gray-500 hidden sm:table-cell">カテゴリ</th>
                <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-right">金額</th>
                <th className="px-3 py-2.5 text-xs font-medium text-gray-500 hidden md:table-cell">開始月</th>
                <th className="px-3 py-2.5 text-xs font-medium text-gray-500 hidden md:table-cell">終了月</th>
                <th className="px-3 py-2.5 text-xs font-medium text-gray-500">状態</th>
                <th className="px-3 py-2.5 text-xs font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <>
                  <tr
                    key={exp.id}
                    className={clsx(
                      'border-b border-gray-100 hover:bg-gray-50',
                      exp.is_active === 0 && 'opacity-50'
                    )}
                  >
                    <td className="px-4 py-2.5">
                      <div className="text-sm font-medium text-gray-900">{exp.name}</div>
                      {exp.note && <div className="text-xs text-gray-400">{exp.note}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 hidden sm:table-cell">{exp.category}</td>
                    <td className="px-3 py-2.5 text-sm font-medium text-gray-900 text-right">{formatYen(exp.amount)}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-500 hidden md:table-cell">{exp.start_month}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-500 hidden md:table-cell">{exp.end_month ?? '無期限'}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={clsx(
                          'text-xs px-2 py-0.5 rounded-full font-medium',
                          exp.is_active === 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        )}
                      >
                        {exp.is_active === 1 ? '有効' : '無効'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingId(exp.id)}
                          className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`「${exp.name}」を無効化しますか？`)) {
                              deleteMutation.mutate(exp.id)
                            }
                          }}
                          className="p-1 text-red-400 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingId === exp.id && (
                    <tr key={`edit-${exp.id}`}>
                      <td colSpan={7} className="px-4 py-2">
                        <FixedExpenseForm
                          initial={{
                            name: exp.name,
                            category: exp.category,
                            amount: String(exp.amount),
                            billing_day: String(exp.billing_day),
                            note: exp.note ?? '',
                            start_month: exp.start_month,
                            end_month: exp.end_month ?? '',
                          }}
                          onSubmit={(form) => updateMutation.mutate({ id: exp.id, form })}
                          onClose={() => setEditingId(null)}
                          isPending={updateMutation.isPending}
                        />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
