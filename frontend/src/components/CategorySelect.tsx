import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchCategories, createCategory } from '../api/settings'

interface Props {
  value: string
  onChange: (value: string) => void
  filterType?: 'income' | 'expense'
  className?: string
}

export default function CategorySelect({ value, onChange, filterType, className }: Props) {
  const queryClient = useQueryClient()
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories })

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: (cat) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      onChange(cat.name)
      setShowNew(false)
      setNewName('')
    },
  })

  const filtered = categories.filter((c) =>
    !filterType || c.type === 'both' || c.type === filterType
  )

  if (showNew) {
    return (
      <div className="flex gap-1">
        <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
          placeholder="新規カテゴリ名" autoFocus
          className={`flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm ${className ?? ''}`}
          onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim()) createMutation.mutate({ name: newName.trim(), type: filterType ?? 'both' }) }}
        />
        <button onClick={() => { if (newName.trim()) createMutation.mutate({ name: newName.trim(), type: filterType ?? 'both' }) }}
          className="px-2 py-1 text-xs bg-indigo-600 text-white rounded">OK</button>
        <button onClick={() => setShowNew(false)} className="px-2 py-1 text-xs text-gray-500">戻る</button>
      </div>
    )
  }

  return (
    <select value={value} onChange={(e) => {
      if (e.target.value === '__new__') { setShowNew(true) }
      else { onChange(e.target.value) }
    }} className={`border border-gray-300 rounded-md px-3 py-1.5 text-sm ${className ?? ''}`}>
      <option value="">選択してください</option>
      {filtered.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
      <option value={value} hidden={!value || filtered.some(c => c.name === value)}>{value}</option>
      <option value="__new__">+ 新規登録</option>
    </select>
  )
}
