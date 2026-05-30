import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { clsx } from 'clsx'
import {
  fetchLegalItems,
  createLegalItem,
  updateLegalItem,
  deleteLegalItem,
  type LegalItem,
} from '../../api/legal'

const categories = ['税務', '登記', '補助金', '契約', 'その他'] as const
type Category = typeof categories[number]

const statusLabel: Record<string, string> = {
  pending: '未対応',
  in_progress: '対応中',
  done: '完了',
}

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
}

function getDaysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr)
  return Math.ceil((due.getTime() - today.getTime()) / 86400000)
}

function getUrgencyClass(item: LegalItem): string {
  if (item.status === 'done') return ''
  const days = getDaysUntil(item.due_date)
  if (days < 0) return 'bg-red-50 border-l-4 border-red-500'
  if (days <= 7) return 'bg-orange-50 border-l-4 border-orange-500'
  if (days <= 30) return 'bg-yellow-50 border-l-4 border-yellow-400'
  return ''
}

interface LegalFormData {
  title: string
  category: Category
  due_date: string
  status: 'pending' | 'in_progress' | 'done'
  notes: string
}

const emptyForm: LegalFormData = {
  title: '',
  category: '税務',
  due_date: '',
  status: 'pending',
  notes: '',
}

function LegalForm({
  initial,
  onSubmit,
  onClose,
  isPending,
}: {
  initial?: LegalFormData
  onSubmit: (data: LegalFormData) => void
  onClose: () => void
  isPending: boolean
}) {
  const [form, setForm] = useState<LegalFormData>(initial ?? emptyForm)
  const set = (field: keyof LegalFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">タイトル</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">カテゴリ</label>
          <select
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          >
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">期日</label>
          <input
            type="date"
            value={form.due_date}
            onChange={(e) => set('due_date', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          />
        </div>
        {initial && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">ステータス</label>
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            >
              <option value="pending">未対応</option>
              <option value="in_progress">対応中</option>
              <option value="done">完了</option>
            </select>
          </div>
        )}
        <div className={initial ? '' : 'col-span-2'}>
          <label className="block text-xs text-gray-500 mb-1">メモ</label>
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={2}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm resize-none"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md">
          キャンセル
        </button>
        <button
          onClick={() => onSubmit(form)}
          disabled={!form.title || !form.due_date || isPending}
          className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {isPending ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  )
}

export default function LegalPage() {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('')

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['legal-items', filterStatus],
    queryFn: () => fetchLegalItems(filterStatus || undefined),
  })

  const createMutation = useMutation({
    mutationFn: (form: LegalFormData) =>
      createLegalItem({
        title: form.title,
        category: form.category,
        due_date: form.due_date,
        notes: form.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-items'] })
      queryClient.invalidateQueries({ queryKey: ['legal-alerts'] })
      setShowAdd(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, form }: { id: number; form: LegalFormData }) =>
      updateLegalItem(id, {
        title: form.title,
        category: form.category,
        due_date: form.due_date,
        status: form.status,
        notes: form.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-items'] })
      queryClient.invalidateQueries({ queryKey: ['legal-alerts'] })
      setEditingId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteLegalItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-items'] })
      queryClient.invalidateQueries({ queryKey: ['legal-alerts'] })
    },
  })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['', 'pending', 'in_progress', 'done'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={clsx(
                'px-3 py-1.5 text-sm rounded-md',
                filterStatus === s
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              {s === '' ? 'すべて' : statusLabel[s]}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50"
        >
          <Plus size={14} />
          追加
        </button>
      </div>

      {showAdd && (
        <LegalForm
          onSubmit={(form) => createMutation.mutate(form)}
          onClose={() => setShowAdd(false)}
          isPending={createMutation.isPending}
        />
      )}

      {isLoading ? (
        <div className="p-8 text-center text-gray-400">読み込み中...</div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-gray-400">法務項目がありません</div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const days = getDaysUntil(item.due_date)
            const isOverdue = days < 0
            const isUrgent = days >= 0 && days <= 7
            const isSoon = days >= 0 && days <= 30

            return (
              <div key={item.id}>
                <div
                  className={clsx(
                    'bg-white border border-gray-200 rounded-xl p-4',
                    getUrgencyClass(item)
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900">{item.title}</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {item.category}
                        </span>
                        <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', statusColor[item.status])}>
                          {statusLabel[item.status]}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <span
                          className={clsx(
                            'font-medium',
                            isOverdue ? 'text-red-600' : isUrgent ? 'text-orange-600' : isSoon ? 'text-yellow-600' : 'text-gray-500'
                          )}
                        >
                          期日: {new Date(item.due_date).toLocaleDateString('ja-JP')}
                          {item.status !== 'done' && (
                            <span className="ml-1">
                              {isOverdue ? `（${Math.abs(days)}日超過）` : `（残${days}日）`}
                            </span>
                          )}
                        </span>
                        <span className="text-gray-400">作成: {new Date(item.created_at).toLocaleDateString('ja-JP')}</span>
                      </div>

                      {item.notes && (
                        <p className="text-xs text-gray-500 leading-relaxed">{item.notes}</p>
                      )}
                    </div>

                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => setEditingId(item.id)}
                        className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`「${item.title}」を削除しますか？`)) {
                            deleteMutation.mutate(item.id)
                          }
                        }}
                        className="p-1.5 text-red-400 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {editingId === item.id && (
                  <div className="mt-2">
                    <LegalForm
                      initial={{
                        title: item.title,
                        category: item.category,
                        due_date: item.due_date,
                        status: item.status,
                        notes: item.notes ?? '',
                      }}
                      onSubmit={(form) => updateMutation.mutate({ id: item.id, form })}
                      onClose={() => setEditingId(null)}
                      isPending={updateMutation.isPending}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
