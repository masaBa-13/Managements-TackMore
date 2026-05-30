import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ChevronRight, ChevronDown, Plus, Trash2, Edit2, LayoutGrid } from 'lucide-react'
import { clsx } from 'clsx'
import {
  fetchTasks,
  createTask,
  deleteTask,
  updateTask,
  buildTaskTree,
  type Task,
  type TaskNode,
} from '../../api/tasks'

const priorityLabel: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

const priorityColor: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
}

const statusLabel: Record<string, string> = {
  todo: '未着手',
  in_progress: '進行中',
  done: '完了',
}

const statusColor: Record<string, string> = {
  todo: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
}

interface AddTaskFormProps {
  parentId?: number
  level: 1 | 2 | 3
  onClose: () => void
  projects: string[]
}

function AddTaskForm({ parentId, level, onClose, projects }: AddTaskFormProps) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [project, setProject] = useState(projects[0] ?? '')
  const [assignee, setAssignee] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium')

  const mutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      onClose()
    },
  })

  const levelLabel = level === 1 ? 'Epic' : level === 2 ? 'Task' : 'Subtask'

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
      <div className="text-sm font-medium text-blue-800">新規{levelLabel}を追加</div>
      <input
        type="text"
        placeholder="タイトル（必須）"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        autoFocus
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="プロジェクト"
          value={project}
          onChange={(e) => setProject(e.target.value)}
          list="project-list"
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <datalist id="project-list">
          {projects.map((p) => <option key={p} value={p} />)}
        </datalist>
        <input
          type="text"
          placeholder="担当者"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as 'high' | 'medium' | 'low')}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="high">優先度: 高</option>
          <option value="medium">優先度: 中</option>
          <option value="low">優先度: 低</option>
        </select>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
        >
          キャンセル
        </button>
        <button
          onClick={() => {
            if (!title.trim()) return
            mutation.mutate({
              parent_id: parentId,
              title: title.trim(),
              project: project || undefined,
              assignee: assignee || undefined,
              due_date: dueDate || undefined,
              priority,
            })
          }}
          disabled={!title.trim() || mutation.isPending}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {mutation.isPending ? '追加中...' : '追加'}
        </button>
      </div>
    </div>
  )
}

interface EditTaskFormProps {
  task: Task
  onClose: () => void
}

function EditTaskForm({ task, onClose }: EditTaskFormProps) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState(task.title)
  const [assignee, setAssignee] = useState(task.assignee ?? '')
  const [dueDate, setDueDate] = useState(task.due_date ?? '')
  const [status, setStatus] = useState(task.status)
  const [priority, setPriority] = useState(task.priority)

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateTask>[1] }) =>
      updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      onClose()
    },
  })

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
      <div className="text-sm font-medium text-yellow-800">タスクを編集</div>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
        autoFocus
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="担当者"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Task['status'])}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
        >
          <option value="todo">未着手</option>
          <option value="in_progress">進行中</option>
          <option value="done">完了</option>
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Task['priority'])}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
        >
          <option value="high">優先度: 高</option>
          <option value="medium">優先度: 中</option>
          <option value="low">優先度: 低</option>
        </select>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md">
          キャンセル
        </button>
        <button
          onClick={() => {
            mutation.mutate({
              id: task.id,
              data: {
                title,
                assignee: assignee || undefined,
                due_date: dueDate || undefined,
                status,
                priority,
              },
            })
          }}
          disabled={mutation.isPending}
          className="px-3 py-1.5 text-sm bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
        >
          {mutation.isPending ? '更新中...' : '更新'}
        </button>
      </div>
    </div>
  )
}

interface TaskRowProps {
  node: TaskNode
  expanded: Set<number>
  onToggle: (id: number) => void
  projects: string[]
}

function TaskRow({ node, expanded, onToggle, projects }: TaskRowProps) {
  const queryClient = useQueryClient()
  const [addingChild, setAddingChild] = useState<number | null>(null)
  const [editing, setEditing] = useState<number | null>(null)

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const isExpanded = expanded.has(node.id)
  const canExpand = node.level < 3
  const indent = (node.level - 1) * 24

  const handleDelete = () => {
    const hasChildren = node.children.length > 0
    const message = hasChildren
      ? `「${node.title}」とその全ての子タスクを削除しますか？`
      : `「${node.title}」を削除しますか？`
    if (window.confirm(message)) {
      deleteMutation.mutate(node.id)
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const isOverdue = node.due_date && node.due_date < today && node.status !== 'done'

  return (
    <>
      <tr
        className={clsx(
          'group border-b border-gray-100 hover:bg-gray-50',
          node.level === 1 && 'bg-indigo-50 hover:bg-indigo-100'
        )}
      >
        {/* WBS + Title */}
        <td className="px-4 py-2.5">
          <div className="flex items-center" style={{ paddingLeft: indent }}>
            {canExpand ? (
              <button
                onClick={() => onToggle(node.id)}
                className="mr-1.5 text-gray-400 hover:text-gray-600"
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <span className="mr-1.5 w-3.5 inline-block" />
            )}
            <span className="text-xs text-gray-400 font-mono mr-2 w-16 shrink-0">{node.wbs_code}</span>
            <span
              className={clsx(
                'text-sm font-medium',
                node.level === 1 ? 'text-indigo-900' : 'text-gray-800'
              )}
            >
              {node.title}
            </span>
          </div>
        </td>

        {/* Assignee */}
        <td className="px-3 py-2.5 text-sm text-gray-600 hidden sm:table-cell">
          {node.assignee ?? '—'}
        </td>

        {/* Due date */}
        <td className="px-3 py-2.5 text-sm hidden md:table-cell">
          {node.due_date ? (
            <span className={clsx(isOverdue && 'text-red-600 font-medium')}>
              {new Date(node.due_date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
            </span>
          ) : (
            <span className="text-gray-300">—</span>
          )}
        </td>

        {/* Priority */}
        <td className="px-3 py-2.5 hidden lg:table-cell">
          <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', priorityColor[node.priority])}>
            {priorityLabel[node.priority]}
          </span>
        </td>

        {/* Status */}
        <td className="px-3 py-2.5">
          <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', statusColor[node.status])}>
            {statusLabel[node.status]}
          </span>
        </td>

        {/* Progress */}
        <td className="px-3 py-2.5 hidden md:table-cell">
          <div className="flex items-center gap-2">
            <div className="w-16 bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full"
                style={{ width: `${node.progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{node.progress}%</span>
          </div>
        </td>

        {/* Actions */}
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {node.level < 3 && (
              <button
                onClick={() => setAddingChild(node.id)}
                className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                title="子タスクを追加"
              >
                <Plus size={14} />
              </button>
            )}
            <button
              onClick={() => setEditing(node.id)}
              className="p-1 text-gray-400 hover:bg-gray-100 rounded"
              title="編集"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={handleDelete}
              className="p-1 text-red-400 hover:bg-red-50 rounded"
              title="削除"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </td>
      </tr>

      {/* Edit form */}
      {editing === node.id && (
        <tr>
          <td colSpan={7} className="px-4 py-2">
            <EditTaskForm task={node} onClose={() => setEditing(null)} />
          </td>
        </tr>
      )}

      {/* Add child form */}
      {addingChild === node.id && (
        <tr>
          <td colSpan={7} className="px-4 py-2">
            <AddTaskForm
              parentId={node.id}
              level={(node.level + 1) as 1 | 2 | 3}
              onClose={() => setAddingChild(null)}
              projects={projects}
            />
          </td>
        </tr>
      )}

      {/* Children */}
      {isExpanded &&
        node.children.map((child) => (
          <TaskRow
            key={child.id}
            node={child}
            expanded={expanded}
            onToggle={onToggle}
            projects={projects}
          />
        ))}
    </>
  )
}

export default function TasksPage() {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [showAddEpic, setShowAddEpic] = useState(false)

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => fetchTasks(),
  })

  const tree = tasks ? buildTaskTree(tasks) : []
  const projects = [...new Set(tasks?.map((t) => t.project).filter(Boolean) as string[])]

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expandAll = () => setExpanded(new Set(tasks?.map((t) => t.id) ?? []))
  const collapseAll = () => setExpanded(new Set())

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Link
            to="/tasks"
            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md font-medium"
          >
            ツリー
          </Link>
          <Link
            to="/tasks/kanban"
            className="px-3 py-1.5 text-sm bg-white border border-gray-200 text-gray-600 rounded-md hover:bg-gray-50 flex items-center gap-1.5"
          >
            <LayoutGrid size={14} />
            カンバン
          </Link>
        </div>
        <div className="flex gap-2">
          <button onClick={expandAll} className="text-xs text-gray-500 hover:text-gray-700">すべて展開</button>
          <button onClick={collapseAll} className="text-xs text-gray-500 hover:text-gray-700">すべて折りたたむ</button>
          <button
            onClick={() => setShowAddEpic(true)}
            className="px-3 py-1.5 text-sm bg-white border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 flex items-center gap-1.5"
          >
            <Plus size={14} />
            Epic追加
          </button>
        </div>
      </div>

      {/* Add Epic form */}
      {showAddEpic && (
        <AddTaskForm
          level={1}
          onClose={() => setShowAddEpic(false)}
          projects={projects}
        />
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">読み込み中...</div>
        ) : tree.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            タスクがありません。Epicを追加してください。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">タイトル</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 hidden sm:table-cell">担当</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 hidden md:table-cell">期日</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 hidden lg:table-cell">優先度</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500">ステータス</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 hidden md:table-cell">進捗</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {tree.map((node) => (
                  <TaskRow
                    key={node.id}
                    node={node}
                    expanded={expanded}
                    onToggle={toggleExpand}
                    projects={projects}
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
