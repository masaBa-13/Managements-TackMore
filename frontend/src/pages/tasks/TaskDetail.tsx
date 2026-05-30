import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { updateTask, deleteTask, type Task } from '../../api/tasks'

interface TaskDetailProps {
  task: Task
  onClose: () => void
}

export default function TaskDetail({ task, onClose }: TaskDetailProps) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [assignee, setAssignee] = useState(task.assignee ?? '')
  const [dueDate, setDueDate] = useState(task.due_date ?? '')
  const [status, setStatus] = useState(task.status)
  const [priority, setPriority] = useState(task.priority)

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateTask>[1]) => updateTask(task.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      onClose()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      onClose()
    },
  })

  const levelLabel = task.level === 1 ? 'Epic' : task.level === 2 ? 'Task' : 'Subtask'

  const handleDelete = () => {
    const message = `「${task.title}」を削除しますか？`
    if (window.confirm(message)) {
      deleteMutation.mutate()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-medium">
              {levelLabel}
            </span>
            <span className="ml-2 text-xs text-gray-400">ID: {task.id}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">タイトル</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">説明</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">担当者</label>
              <input
                type="text"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">期日</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">ステータス</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Task['status'])}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="todo">未着手</option>
                <option value="in_progress">進行中</option>
                <option value="done">完了</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">優先度</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Task['priority'])}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>
          </div>

          <div className="text-xs text-gray-400">
            <div>作成: {new Date(task.created_at).toLocaleString('ja-JP')}</div>
            <div>更新: {new Date(task.updated_at).toLocaleString('ja-JP')}</div>
            <div>作成者: {task.created_by}</div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <button
            onClick={handleDelete}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
            disabled={deleteMutation.isPending}
          >
            削除
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
            >
              キャンセル
            </button>
            <button
              onClick={() =>
                updateMutation.mutate({
                  title,
                  description: description || undefined,
                  assignee: assignee || undefined,
                  due_date: dueDate || undefined,
                  status,
                  priority,
                })
              }
              disabled={updateMutation.isPending}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {updateMutation.isPending ? '更新中...' : '更新'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
