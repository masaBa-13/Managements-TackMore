import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { fetchMembers, createMember } from '../api/market'

interface Props {
  value: string
  onChange: (value: string) => void
  className?: string
}

export default function AssigneeSelect({ value, onChange, className = '' }: Props) {
  const queryClient = useQueryClient()
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: fetchMembers,
  })

  const addMutation = useMutation({
    mutationFn: createMember,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      onChange(created.name)
      setShowNewForm(false)
      setNewName('')
      setNewEmail('')
    },
    onError: (err: Error) => {
      alert(err.message)
    },
  })

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === '__new__') {
      setShowNewForm(true)
    } else {
      onChange(e.target.value)
    }
  }

  return (
    <div className="space-y-1.5">
      <select
        value={showNewForm ? '__new__' : value}
        onChange={handleSelectChange}
        className={`border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white ${className}`}
      >
        <option value="">担当者を選択</option>
        {members.map((m) => (
          <option key={m.id} value={m.name}>
            {m.name}
          </option>
        ))}
        <option value="__new__">＋ 新規登録</option>
      </select>

      {showNewForm && (
        <div className="border border-indigo-200 bg-indigo-50 rounded-md p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-indigo-700 flex items-center gap-1">
              <Plus size={12} />
              メンバーを新規登録
            </span>
            <button
              onClick={() => { setShowNewForm(false); setNewName(''); setNewEmail('') }}
              className="text-indigo-400 hover:text-indigo-600"
            >
              <X size={14} />
            </button>
          </div>
          <input
            type="text"
            placeholder="名前（必須）"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <input
            type="email"
            placeholder="メールアドレス（必須）"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setShowNewForm(false); setNewName(''); setNewEmail('') }}
              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
            >
              キャンセル
            </button>
            <button
              onClick={() => {
                if (!newName.trim() || !newEmail.trim()) return
                addMutation.mutate({ name: newName.trim(), email: newEmail.trim() })
              }}
              disabled={!newName.trim() || !newEmail.trim() || addMutation.isPending}
              className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {addMutation.isPending ? '登録中...' : '登録'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
