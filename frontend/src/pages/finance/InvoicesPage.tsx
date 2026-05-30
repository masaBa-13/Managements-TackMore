import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Send, CheckCircle, AlertTriangle } from 'lucide-react'
import { clsx } from 'clsx'
import {
  fetchInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  type Invoice,
} from '../../api/finance'
import FinanceSubNav from './FinanceSubNav'

function formatYen(amount: number): string {
  return new Intl.NumberFormat('ja-JP').format(amount) + '円'
}

const statusConfig = {
  draft: { label: '下書き', bg: 'bg-gray-100 text-gray-700', icon: null },
  sent: { label: '送付済', bg: 'bg-blue-100 text-blue-700', icon: Send },
  paid: { label: '入金済', bg: 'bg-green-100 text-green-700', icon: CheckCircle },
  overdue: { label: '期限超過', bg: 'bg-red-100 text-red-700', icon: AlertTriangle },
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export default function InvoicesPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('')

  const [clientName, setClientName] = useState('')
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', filterStatus],
    queryFn: () => fetchInvoices(filterStatus || undefined),
  })

  const createMutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setShowForm(false)
      setClientName(''); setTitle(''); setAmount(''); setDueDate(''); setNotes('')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateInvoice>[1] }) =>
      updateInvoice(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice-alerts'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })

  // Summary
  const totalUnpaid = invoices
    .filter((inv) => inv.status !== 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0)
  const draftCount = invoices.filter((i) => i.status === 'draft').length
  const overdueCount = invoices.filter((i) => i.status === 'overdue' || (i.status === 'sent' && daysUntil(i.due_date) < 0)).length

  return (
    <div className="space-y-5">
      <FinanceSubNav />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500">未回収総額</div>
          <div className="text-xl font-bold text-gray-900 mt-1">{formatYen(totalUnpaid)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500">未送付</div>
          <div className="text-xl font-bold text-amber-600 mt-1">{draftCount}件</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500">期限超過</div>
          <div className="text-xl font-bold text-red-600 mt-1">{overdueCount}件</div>
        </div>
      </div>

      {/* Filter + Add */}
      <div className="flex items-center justify-between gap-3">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
        >
          <option value="">すべて</option>
          <option value="draft">下書き</option>
          <option value="sent">送付済</option>
          <option value="paid">入金済</option>
          <option value="overdue">期限超過</option>
        </select>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50"
        >
          <Plus size={14} />
          請求書作成
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="text-sm font-medium text-gray-800">新規請求書</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">請求先</label>
              <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)}
                placeholder="例: 株式会社ABC" className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">件名</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="例: 2026年5月 開発費" className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">金額（円）</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="0" className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">発行日</label>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">支払期日</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">備考</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md">
              キャンセル
            </button>
            <button
              onClick={() => {
                if (!clientName || !title || !amount || !issueDate || !dueDate) return
                createMutation.mutate({
                  client_name: clientName, title, amount: parseInt(amount),
                  issue_date: issueDate, due_date: dueDate, notes: notes || undefined,
                })
              }}
              disabled={!clientName || !title || !amount || !dueDate || createMutation.isPending}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {createMutation.isPending ? '作成中...' : '作成'}
            </button>
          </div>
        </div>
      )}

      {/* Invoice list */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">読み込み中...</div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center text-gray-400">請求書がありません</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">ステータス</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">請求先</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">件名</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 text-right">金額</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">支払期日</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const days = daysUntil(inv.due_date)
                  const isOverdue = inv.status !== 'paid' && days < 0
                  const isUrgent = inv.status === 'sent' && days >= 0 && days <= 7

                  return (
                    <tr
                      key={inv.id}
                      className={clsx(
                        'border-b border-gray-100 hover:bg-gray-50',
                        isOverdue && 'bg-red-50',
                        isUrgent && 'bg-amber-50'
                      )}
                    >
                      <td className="px-3 py-2">
                        <StatusBadge invoice={inv} />
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700">{inv.client_name}</td>
                      <td className="px-3 py-2 text-sm text-gray-700">{inv.title}</td>
                      <td className="px-3 py-2 text-sm font-medium text-gray-900 text-right">{formatYen(inv.amount)}</td>
                      <td className="px-3 py-2 text-sm">
                        <span className={clsx(
                          isOverdue && 'text-red-600 font-medium',
                          isUrgent && 'text-amber-600 font-medium',
                          !isOverdue && !isUrgent && 'text-gray-600'
                        )}>
                          {inv.due_date}
                          {isOverdue && ` (${Math.abs(days)}日超過)`}
                          {isUrgent && ` (あと${days}日)`}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          {inv.status === 'draft' && (
                            <button
                              onClick={() => updateMutation.mutate({ id: inv.id, data: { status: 'sent' } })}
                              className="text-blue-500 hover:text-blue-700 p-1" title="送付済にする"
                            >
                              <Send size={14} />
                            </button>
                          )}
                          {(inv.status === 'sent' || inv.status === 'overdue') && (
                            <button
                              onClick={() => updateMutation.mutate({ id: inv.id, data: { status: 'paid' } })}
                              className="text-green-500 hover:text-green-700 p-1" title="入金確認"
                            >
                              <CheckCircle size={14} />
                            </button>
                          )}
                          {inv.status !== 'paid' && (
                            <button
                              onClick={() => {
                                if (window.confirm('この請求書を削除しますか？')) deleteMutation.mutate(inv.id)
                              }}
                              className="text-red-400 hover:text-red-600 p-1" title="削除"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ invoice }: { invoice: Invoice }) {
  const days = daysUntil(invoice.due_date)
  const effectiveStatus = invoice.status === 'sent' && days < 0 ? 'overdue' : invoice.status
  const config = statusConfig[effectiveStatus]

  return (
    <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', config.bg)}>
      {config.label}
    </span>
  )
}
