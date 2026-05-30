import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { List } from 'lucide-react'
import { clsx } from 'clsx'
import { fetchTasks, updateTask, type Task } from '../../api/tasks'

const columns: { key: Task['status']; label: string; color: string; headerColor: string }[] = [
  { key: 'todo', label: '未着手', color: 'bg-gray-50', headerColor: 'bg-gray-200 text-gray-700' },
  { key: 'in_progress', label: '進行中', color: 'bg-blue-50', headerColor: 'bg-blue-200 text-blue-800' },
  { key: 'done', label: '完了', color: 'bg-green-50', headerColor: 'bg-green-200 text-green-800' },
]

const priorityLabel: Record<string, string> = { high: '高', medium: '中', low: '低' }
const priorityColor: Record<string, string> = {
  high: 'text-red-600',
  medium: 'text-yellow-600',
  low: 'text-green-600',
}

interface KanbanCardProps {
  task: Task
  onDragStart: (task: Task) => void
  onDragEnd: () => void
}

function KanbanCard({ task, onDragStart, onDragEnd }: KanbanCardProps) {
  const today = new Date().toISOString().slice(0, 10)
  const isOverdue = task.due_date && task.due_date < today && task.status !== 'done'

  return (
    <div
      draggable
      onDragStart={() => onDragStart(task)}
      onDragEnd={onDragEnd}
      className={clsx(
        'bg-white border rounded-lg p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow space-y-2',
        isOverdue ? 'border-red-300' : 'border-gray-200'
      )}
    >
      <div className="text-sm font-medium text-gray-900 leading-snug">{task.title}</div>

      {task.project && (
        <div className="text-xs text-indigo-600 bg-indigo-50 rounded px-1.5 py-0.5 inline-block">
          {task.project}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
        {task.assignee ? (
          <span className="bg-gray-100 rounded-full px-2 py-0.5">{task.assignee}</span>
        ) : (
          <span />
        )}
        <span className={clsx('font-medium', priorityColor[task.priority])}>
          優先: {priorityLabel[task.priority]}
        </span>
      </div>

      {task.due_date && (
        <div className={clsx('text-xs', isOverdue ? 'text-red-600 font-medium' : 'text-gray-400')}>
          期日: {new Date(task.due_date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
          {isOverdue && ' ⚠️ 超過'}
        </div>
      )}
    </div>
  )
}

export default function KanbanView() {
  const queryClient = useQueryClient()
  const [dragging, setDragging] = useState<Task | null>(null)
  const [dragOverCol, setDragOverCol] = useState<Task['status'] | null>(null)
  const dragCounter = useRef(0)

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => fetchTasks(),
  })

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: Task['status'] }) =>
      updateTask(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  // Only show subtasks (level=3)
  const subtasks = tasks?.filter((t) => t.level === 3) ?? []

  const getColumnTasks = (status: Task['status']) =>
    subtasks.filter((t) => t.status === status).sort((a, b) => a.order_index - b.order_index)

  const handleDrop = (status: Task['status']) => {
    if (dragging && dragging.status !== status) {
      mutation.mutate({ id: dragging.id, status })
    }
    setDragging(null)
    setDragOverCol(null)
    dragCounter.current = 0
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link
          to="/tasks"
          className="px-3 py-1.5 text-sm bg-white border border-gray-200 text-gray-600 rounded-md hover:bg-gray-50 flex items-center gap-1.5"
        >
          <List size={14} />
          ツリー
        </Link>
        <Link
          to="/tasks/kanban"
          className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md font-medium"
        >
          カンバン
        </Link>
        <span className="text-xs text-gray-400 ml-2">Subtask（レベル3）のみ表示</span>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-gray-400">読み込み中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map((col) => {
            const colTasks = getColumnTasks(col.key)
            const isDragOver = dragOverCol === col.key

            return (
              <div
                key={col.key}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOverCol(col.key)
                }}
                onDragEnter={() => {
                  dragCounter.current++
                  setDragOverCol(col.key)
                }}
                onDragLeave={() => {
                  dragCounter.current--
                  if (dragCounter.current === 0) setDragOverCol(null)
                }}
                onDrop={() => handleDrop(col.key)}
                className={clsx(
                  'rounded-xl border-2 transition-colors min-h-48',
                  isDragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-gray-50'
                )}
              >
                {/* Column header */}
                <div className={clsx('px-4 py-3 rounded-t-xl flex items-center justify-between', col.headerColor)}>
                  <span className="font-semibold text-sm">{col.label}</span>
                  <span className="text-xs bg-white bg-opacity-50 rounded-full px-2 py-0.5">
                    {colTasks.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="p-3 space-y-2">
                  {colTasks.length === 0 ? (
                    <div className="text-center text-xs text-gray-400 py-4">
                      タスクをドロップ
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <KanbanCard
                        key={task.id}
                        task={task}
                        onDragStart={setDragging}
                        onDragEnd={() => {
                          setDragging(null)
                          setDragOverCol(null)
                          dragCounter.current = 0
                        }}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {subtasks.length === 0 && !isLoading && (
        <div className="text-center text-sm text-gray-400 py-8">
          Subtask（レベル3）がありません。タスク管理画面から追加してください。
        </div>
      )}
    </div>
  )
}
