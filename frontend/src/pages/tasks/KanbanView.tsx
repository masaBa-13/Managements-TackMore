import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { List, LayoutGrid } from 'lucide-react'
import { clsx } from 'clsx'
import { fetchTasksWithOffline, updateTask, type Task } from '../../api/tasks'

const columns: { key: Task['status']; label: string }[] = [
  { key: 'todo', label: '未着手' },
  { key: 'in_progress', label: '進行中' },
  { key: 'done', label: '完了' },
]

const columnStyle: Record<Task['status'], { header: string; border: string; dot: string }> = {
  todo:        { header: 'text-gray-400',    border: 'border-white/5',        dot: 'bg-gray-500' },
  in_progress: { header: 'text-sky-400',     border: 'border-sky-500/20',     dot: 'bg-sky-500' },
  done:        { header: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-500' },
}

const priorityDot: Record<string, string> = {
  high:   'bg-rose-500',
  medium: 'bg-amber-400',
  low:    'bg-emerald-500',
}

const levelLabel: Record<number, string> = { 1: 'Epic', 2: 'Task', 3: 'Sub' }
const levelColor: Record<number, string> = {
  1: 'text-fuchsia-400 bg-fuchsia-500/10',
  2: 'text-sky-400 bg-sky-500/10',
  3: 'text-gray-400 bg-white/5',
}

function KanbanCard({ task, onDragStart, onDragEnd }: {
  task: Task
  onDragStart: (task: Task) => void
  onDragEnd: () => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const isOverdue = task.due_date && task.due_date < today && task.status !== 'done'

  return (
    <div
      draggable
      onDragStart={() => onDragStart(task)}
      onDragEnd={onDragEnd}
      className={clsx(
        'group bg-[#181818] border rounded px-2.5 py-2 cursor-grab active:cursor-grabbing transition-colors',
        isOverdue ? 'border-rose-500/40' : 'border-white/[0.06] hover:border-white/10'
      )}
    >
      {/* Row 1: level badge + title */}
      <div className="flex items-start gap-1.5 min-w-0">
        <span className={clsx('text-[9px] font-medium px-1 py-px rounded shrink-0 mt-0.5', levelColor[task.level])}>
          {levelLabel[task.level]}
        </span>
        <span className={clsx(
          'text-xs font-medium leading-snug min-w-0 break-words',
          task.status === 'done' ? 'text-gray-500 line-through' : 'text-gray-200'
        )}>
          {task.title}
        </span>
      </div>

      {/* Row 2: meta */}
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        {task.project && (
          <span className="text-[10px] text-fuchsia-400/80 truncate max-w-[80px]">{task.project}</span>
        )}
        {task.assignee && (
          <span className="text-[10px] text-gray-500 truncate max-w-[60px]">{task.assignee}</span>
        )}
        <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0 ml-auto', priorityDot[task.priority])} title={`優先度: ${task.priority}`} />
        {task.due_date && (
          <span className={clsx('text-[10px]', isOverdue ? 'text-rose-400 font-medium' : 'text-gray-600')}>
            {new Date(task.due_date + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
            {isOverdue && '⚠'}
          </span>
        )}
      </div>
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
    queryFn: () => fetchTasksWithOffline(),
  })

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: Task['status'] }) =>
      updateTask(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  // Epic (level=1) は除外
  const allTasks = (tasks ?? []).filter((t) => t.level !== 1)

  const getColumnTasks = (status: Task['status']) =>
    allTasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.level - b.level || a.order_index - b.order_index)

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
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          to="/tasks"
          className="px-3 py-1.5 text-sm bg-white/5 border border-white/10 text-gray-400 rounded-md hover:bg-white/10 flex items-center gap-1.5"
        >
          <List size={14} />
          ツリー
        </Link>
        <Link
          to="/tasks/kanban"
          className="px-3 py-1.5 text-sm bg-fuchsia-500 text-white rounded-md font-medium flex items-center gap-1.5"
        >
          <LayoutGrid size={14} />
          カンバン
        </Link>
        <Link
          to="/tasks/timeline"
          className="px-3 py-1.5 text-sm bg-white/5 border border-white/10 text-gray-400 rounded-md hover:bg-white/10"
        >
          タイムライン
        </Link>

        {/* Legend */}
        <div className="hidden md:flex items-center gap-3 ml-auto text-[10px] text-gray-600">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" />高</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />中</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />低</span>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-gray-600 text-sm">読み込み中...</div>
      ) : allTasks.length === 0 ? (
        <div className="p-8 text-center text-gray-600 text-sm">タスクがありません</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {columns.map((col) => {
            const colTasks = getColumnTasks(col.key)
            const isDragOver = dragOverCol === col.key
            const style = columnStyle[col.key]

            return (
              <div
                key={col.key}
                onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.key) }}
                onDragEnter={() => { dragCounter.current++; setDragOverCol(col.key) }}
                onDragLeave={() => { dragCounter.current--; if (dragCounter.current === 0) setDragOverCol(null) }}
                onDrop={() => handleDrop(col.key)}
                className={clsx(
                  'rounded-md border transition-colors min-h-32',
                  isDragOver ? 'border-fuchsia-500/40 bg-fuchsia-500/5' : `${style.border} bg-[#111111]`
                )}
              >
                {/* Column header */}
                <div className="px-3 py-2 border-b border-white/5 flex items-center gap-2">
                  <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', style.dot)} />
                  <span className={clsx('font-semibold text-sm', style.header)}>{col.label}</span>
                  <span className="text-[10px] bg-white/10 text-gray-500 rounded-full px-1.5 py-px ml-auto">
                    {colTasks.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="p-2 space-y-1.5">
                  {colTasks.length === 0 ? (
                    <div className="text-center text-[11px] text-gray-700 py-6">ここにドロップ</div>
                  ) : (
                    colTasks.map((task) => (
                      <KanbanCard
                        key={task.id}
                        task={task}
                        onDragStart={setDragging}
                        onDragEnd={() => { setDragging(null); setDragOverCol(null); dragCounter.current = 0 }}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
