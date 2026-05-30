import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, CheckCircle, Clock, XCircle } from 'lucide-react'
import { clsx } from 'clsx'
import {
  fetchIncomeForecasts, createIncomeForecast, updateIncomeForecast, deleteIncomeForecast,
  type IncomeForecast,
} from '../../api/finance'
import FinanceSubNav from './FinanceSubNav'
import CategorySelect from '../../components/CategorySelect'

function formatYen(amount: number): string {
  return new Intl.NumberFormat('ja-JP').format(amount) + '円'
}

const statusConfig = {
  forecast: { label: '見込み', bg: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: '確定', bg: 'bg-blue-100 text-blue-700' },
  received: { label: '入金済', bg: 'bg-green-100 text-green-700' },
  cancelled: { label: 'キャンセル', bg: 'bg-gray-100 text-gray-500' },
}

export default function ForecastPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')

  const [clientName, setClientName] = useState('')
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [category, setCategory] = useState('')
  const [probability, setProbability] = useState('100')
  const [notes, setNotes] = useState('')

  const { data: forecasts = [], isLoading } = useQuery({
    queryKey: ['income-forecasts', filterStatus],
    queryFn: () => fetchIncomeForecasts(filterStatus || undefined),
  })

  const createMutation = useMutation({
    mutationFn: createIncomeForecast,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-forecasts'] })
      setShowForm(false)
      setClientName(''); setTitle(''); setAmount(''); setExpectedDate(''); setCategory(''); setProbability('100'); setNotes('')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateIncomeForecast>[1] }) =>
      updateIncomeForecast(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['income-forecasts'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteIncomeForecast,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['income-forecasts'] }),
  })

  const activeForecasts = forecasts.filter((f) => f.status !== 'cancelled' && f.status !== 'received')
  const totalForecast = activeForecasts.reduce((sum, f) => sum + f.amount, 0)
  const weightedTotal = activeForecasts.reduce((sum, f) => sum + Math.round(f.amount * f.probability / 100), 0)

  return (
    <div className="space-y-5">
      <FinanceSubNav />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500">入金見込み総額</div>
          <div className="text-xl font-bold text-blue-700 mt-1">{formatYen(totalForecast)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500">確度加重額</div>
          <div className="text-xl font-bold text-gray-900 mt-1">{formatYen(weightedTotal)}</div>
          <div className="text-xs text-gray-400">確度を反映した期待入金額</div>
        </div>
      </div>

      {/* Filter + Add */}
      <div className="flex items-center justify-between gap-3">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm">
          <option value="">すべて</option>
          <option value="forecast">見込み</option>
          <option value="confirmed">確定</option>
          <option value="received">入金済</option>
          <option value="cancelled">キャンセル</option>
        </select>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50">
          <Plus size={14} /> 入金見込み追加
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="text-sm font-medium text-gray-800">新規入金見込み</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">取引先</label>
              <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)}
                placeholder="例: 株式会社ABC" className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">件名</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="例: HP管理費 6月分" className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">金額（円）</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">入金予定日</label>
              <input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">カテゴリ</label>
              <CategorySelect value={category} onChange={setCategory} filterType="income" className="w-full" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">確度（%）</label>
              <input type="number" min={0} max={100} value={probability} onChange={(e) => setProbability(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">備考</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md">キャンセル</button>
            <button
              onClick={() => {
                if (!clientName || !title || !amount || !expectedDate) return
                createMutation.mutate({
                  client_name: clientName, title, amount: parseInt(amount),
                  expected_date: expectedDate, category: category || undefined,
                  probability: parseInt(probability), notes: notes || undefined,
                })
              }}
              disabled={!clientName || !title || !amount || !expectedDate || createMutation.isPending}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">
              {createMutation.isPending ? '作成中...' : '作成'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">読み込み中...</div>
        ) : forecasts.length === 0 ? (
          <div className="p-8 text-center text-gray-400">入金見込みがありません</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">ステータス</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">取引先</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">件名</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 text-right">金額</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">確度</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">入金予定</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {forecasts.map((fc) => (
                  <ForecastRow key={fc.id} forecast={fc}
                    onUpdate={(data) => updateMutation.mutate({ id: fc.id, data })}
                    onDelete={() => { if (window.confirm('削除しますか？')) deleteMutation.mutate(fc.id) }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function ForecastRow({ forecast: fc, onUpdate, onDelete }: {
  forecast: IncomeForecast
  onUpdate: (data: Parameters<typeof updateIncomeForecast>[1]) => void
  onDelete: () => void
}) {
  const config = statusConfig[fc.status]
  return (
    <tr className={clsx('border-b border-gray-100 hover:bg-gray-50', fc.status === 'cancelled' && 'opacity-50')}>
      <td className="px-3 py-2">
        <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', config.bg)}>{config.label}</span>
      </td>
      <td className="px-3 py-2 text-sm text-gray-700">{fc.client_name}</td>
      <td className="px-3 py-2 text-sm text-gray-700">{fc.title}</td>
      <td className="px-3 py-2 text-sm font-medium text-blue-600 text-right">{formatYen(fc.amount)}</td>
      <td className="px-3 py-2 text-sm text-gray-600">{fc.probability}%</td>
      <td className="px-3 py-2 text-sm text-gray-600">{fc.expected_date}</td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          {fc.status === 'forecast' && (
            <button onClick={() => onUpdate({ status: 'confirmed' })} className="text-blue-500 hover:text-blue-700 p-1" title="確定">
              <Clock size={14} />
            </button>
          )}
          {(fc.status === 'forecast' || fc.status === 'confirmed') && (
            <button onClick={() => onUpdate({ status: 'received' })} className="text-green-500 hover:text-green-700 p-1" title="入金済">
              <CheckCircle size={14} />
            </button>
          )}
          {fc.status !== 'cancelled' && fc.status !== 'received' && (
            <button onClick={() => onUpdate({ status: 'cancelled' })} className="text-gray-400 hover:text-gray-600 p-1" title="キャンセル">
              <XCircle size={14} />
            </button>
          )}
          <button onClick={onDelete} className="text-red-400 hover:text-red-600 p-1" title="削除">
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  )
}
