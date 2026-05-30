import { API_BASE } from './base'

export interface Task {
  id: number
  parent_id: number | null
  level: 1 | 2 | 3
  order_index: number
  title: string
  description: string | null
  project: string | null
  assignee: string | null
  due_date: string | null
  status: 'todo' | 'in_progress' | 'done'
  priority: 'high' | 'medium' | 'low'
  progress: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface TaskCreateInput {
  parent_id?: number
  title: string
  description?: string
  project?: string
  assignee?: string
  due_date?: string
  priority?: 'high' | 'medium' | 'low'
}

export interface TaskUpdateInput {
  title?: string
  description?: string
  project?: string
  assignee?: string
  due_date?: string
  status?: 'todo' | 'in_progress' | 'done'
  priority?: 'high' | 'medium' | 'low'
}

export interface TaskNode extends Task {
  children: TaskNode[]
  wbs_code: string
}

export async function fetchTasks(params?: { project?: string; status?: string }): Promise<Task[]> {
  const query = new URLSearchParams()
  if (params?.project) query.set('project', params.project)
  if (params?.status) query.set('status', params.status)
  const url = `${API_BASE}/api/tasks${query.toString() ? `?${query}` : ''}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('タスクの取得に失敗しました')
  return res.json()
}

export async function fetchTask(id: number): Promise<Task> {
  const res = await fetch(`${API_BASE}/api/tasks/${id}`)
  if (!res.ok) throw new Error('タスクの取得に失敗しました')
  return res.json()
}

export async function createTask(data: TaskCreateInput): Promise<Task> {
  const res = await fetch(`${API_BASE}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'タスクの作成に失敗しました')
  }
  return res.json()
}

export async function updateTask(id: number, data: TaskUpdateInput): Promise<Task> {
  const res = await fetch(`${API_BASE}/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'タスクの更新に失敗しました')
  }
  return res.json()
}

export async function deleteTask(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/tasks/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'タスクの削除に失敗しました')
  }
}

export async function reorderTask(id: number, order_index: number): Promise<Task[]> {
  const res = await fetch(`${API_BASE}/api/tasks/${id}/reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_index }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? '並び替えに失敗しました')
  }
  return res.json()
}

// Build tree from flat list and assign WBS codes
export function buildTaskTree(tasks: Task[]): TaskNode[] {
  const map = new Map<number, TaskNode>()
  const roots: TaskNode[] = []

  const sorted = [...tasks].sort((a, b) => a.order_index - b.order_index)

  for (const task of sorted) {
    map.set(task.id, { ...task, children: [], wbs_code: '' })
  }

  for (const task of sorted) {
    const node = map.get(task.id)!
    if (task.parent_id == null) {
      roots.push(node)
    } else {
      const parent = map.get(task.parent_id)
      if (parent) {
        parent.children.push(node)
      }
    }
  }

  // Assign WBS codes
  roots.forEach((root, i) => {
    root.wbs_code = String(i + 1)
    root.children.forEach((task, j) => {
      task.wbs_code = `${root.wbs_code}.${j + 1}`
      task.children.forEach((sub, k) => {
        sub.wbs_code = `${task.wbs_code}.${k + 1}`
      })
    })
  })

  return roots
}
