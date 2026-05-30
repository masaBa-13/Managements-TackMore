import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchProjects, createProject } from '../api/settings'

interface Props {
  value: string
  onChange: (value: string) => void
  className?: string
}

export default function ProjectSelect({ value, onChange, className }: Props) {
  const queryClient = useQueryClient()
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: fetchProjects })

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: (proj) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      onChange(proj.name)
      setShowNew(false)
      setNewName('')
    },
  })

  if (showNew) {
    return (
      <div className="flex gap-1">
        <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
          placeholder="新規プロジェクト名" autoFocus
          className={`flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm ${className ?? ''}`}
          onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim()) createMutation.mutate({ name: newName.trim() }) }}
        />
        <button onClick={() => { if (newName.trim()) createMutation.mutate({ name: newName.trim() }) }}
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
      {projects.filter(p => p.is_active === 1).map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
      <option value={value} hidden={!value || projects.some(p => p.name === value)}>{value}</option>
      <option value="__new__">+ 新規登録</option>
    </select>
  )
}
