import { Hono } from 'hono'
import type { Bindings, Variables, Task } from '../types'

const tasks = new Hono<{ Bindings: Bindings; Variables: Variables }>()

async function calcProgress(db: D1Database, taskId: number, taskStatus: string): Promise<number> {
  const children = await db
    .prepare('SELECT status FROM tasks WHERE parent_id = ?')
    .bind(taskId)
    .all<{ status: string }>()

  if (!children.results || children.results.length === 0) {
    return taskStatus === 'done' ? 100 : 0
  }

  const total = children.results.length
  const done = children.results.filter((c) => c.status === 'done').length
  return Math.floor((done / total) * 100)
}

async function buildTaskWithProgress(db: D1Database, row: Record<string, unknown>): Promise<Task> {
  const progress = await calcProgress(db, row.id as number, row.status as string)
  return {
    id: row.id as number,
    parent_id: row.parent_id as number | null,
    level: row.level as 1 | 2 | 3,
    order_index: row.order_index as number,
    title: row.title as string,
    description: row.description as string | null,
    project: row.project as string | null,
    assignee: row.assignee as string | null,
    due_date: row.due_date as string | null,
    status: row.status as 'todo' | 'in_progress' | 'done',
    priority: row.priority as 'high' | 'medium' | 'low',
    progress,
    created_by: row.created_by as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

// GET /api/tasks
tasks.get('/', async (c) => {
  const project = c.req.query('project')
  const status = c.req.query('status')

  let query = 'SELECT * FROM tasks WHERE 1=1'
  const params: unknown[] = []

  if (project) {
    query += ' AND project = ?'
    params.push(project)
  }
  if (status) {
    query += ' AND status = ?'
    params.push(status)
  }
  query += ' ORDER BY order_index ASC'

  const result = await c.env.DB.prepare(query)
    .bind(...params)
    .all<Record<string, unknown>>()

  const taskList = await Promise.all(
    (result.results ?? []).map((row) => buildTaskWithProgress(c.env.DB, row))
  )

  return c.json(taskList)
})

// GET /api/tasks/:id
tasks.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const row = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ?')
    .bind(id)
    .first<Record<string, unknown>>()

  if (!row) {
    return c.json({ error: 'タスクが見つかりません' }, 404)
  }

  const task = await buildTaskWithProgress(c.env.DB, row)
  return c.json(task)
})

// POST /api/tasks
tasks.post('/', async (c) => {
  const body = await c.req.json<{
    parent_id?: number
    title: string
    description?: string
    project?: string
    assignee?: string
    due_date?: string
    priority?: 'high' | 'medium' | 'low'
  }>()

  if (!body.title) {
    return c.json({ error: 'タイトルは必須です' }, 400)
  }

  let level: 1 | 2 | 3 = 1
  if (body.parent_id) {
    const parent = await c.env.DB.prepare('SELECT level FROM tasks WHERE id = ?')
      .bind(body.parent_id)
      .first<{ level: number }>()

    if (!parent) {
      return c.json({ error: '親タスクが見つかりません' }, 400)
    }
    if (parent.level >= 3) {
      return c.json({ error: 'Subtaskに子タスクは作成できません' }, 400)
    }
    level = (parent.level + 1) as 1 | 2 | 3
  }

  // Get max order_index
  const maxRow = await c.env.DB.prepare(
    'SELECT MAX(order_index) as max_idx FROM tasks WHERE parent_id IS ?'
  )
    .bind(body.parent_id ?? null)
    .first<{ max_idx: number | null }>()

  const order_index = maxRow?.max_idx != null ? maxRow.max_idx + 1 : 0

  const result = await c.env.DB.prepare(
    `INSERT INTO tasks (parent_id, level, order_index, title, description, project, assignee, due_date, priority, status, created_by, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'todo', ?, datetime('now'))`
  )
    .bind(
      body.parent_id ?? null,
      level,
      order_index,
      body.title,
      body.description ?? null,
      body.project ?? null,
      body.assignee ?? null,
      body.due_date ?? null,
      body.priority ?? 'medium',
      c.get('userName')
    )
    .run()

  const newRow = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first<Record<string, unknown>>()

  if (!newRow) {
    return c.json({ error: '作成に失敗しました' }, 500)
  }

  const task = await buildTaskWithProgress(c.env.DB, newRow)
  return c.json(task, 201)
})

// PATCH /api/tasks/:id
tasks.patch('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json<{
    title?: string
    description?: string
    project?: string
    assignee?: string
    due_date?: string
    status?: 'todo' | 'in_progress' | 'done'
    priority?: 'high' | 'medium' | 'low'
  }>()

  const existing = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ?')
    .bind(id)
    .first<Record<string, unknown>>()

  if (!existing) {
    return c.json({ error: 'タスクが見つかりません' }, 404)
  }

  const updates: string[] = []
  const params: unknown[] = []

  if (body.title !== undefined) { updates.push('title = ?'); params.push(body.title) }
  if (body.description !== undefined) { updates.push('description = ?'); params.push(body.description) }
  if (body.project !== undefined) { updates.push('project = ?'); params.push(body.project) }
  if (body.assignee !== undefined) { updates.push('assignee = ?'); params.push(body.assignee) }
  if (body.due_date !== undefined) { updates.push('due_date = ?'); params.push(body.due_date) }
  if (body.status !== undefined) { updates.push('status = ?'); params.push(body.status) }
  if (body.priority !== undefined) { updates.push('priority = ?'); params.push(body.priority) }

  if (updates.length === 0) {
    const task = await buildTaskWithProgress(c.env.DB, existing)
    return c.json(task)
  }

  updates.push("updated_at = datetime('now')")
  params.push(id)

  await c.env.DB.prepare(
    `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`
  )
    .bind(...params)
    .run()

  const updated = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ?')
    .bind(id)
    .first<Record<string, unknown>>()

  if (!updated) {
    return c.json({ error: '更新に失敗しました' }, 500)
  }

  const task = await buildTaskWithProgress(c.env.DB, updated)
  return c.json(task)
})

// DELETE /api/tasks/:id
tasks.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const existing = await c.env.DB.prepare('SELECT id FROM tasks WHERE id = ?')
    .bind(id)
    .first()

  if (!existing) {
    return c.json({ error: 'タスクが見つかりません' }, 404)
  }

  await c.env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

// PATCH /api/tasks/:id/reorder
tasks.patch('/:id/reorder', async (c) => {
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json<{ order_index: number }>()

  const target = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ?')
    .bind(id)
    .first<{ id: number; parent_id: number | null; order_index: number }>()

  if (!target) {
    return c.json({ error: 'タスクが見つかりません' }, 404)
  }

  const newIndex = body.order_index
  const oldIndex = target.order_index
  const parentId = target.parent_id

  if (newIndex === oldIndex) {
    const siblings = await c.env.DB.prepare(
      'SELECT * FROM tasks WHERE parent_id IS ? ORDER BY order_index ASC'
    )
      .bind(parentId)
      .all<Record<string, unknown>>()
    const result = await Promise.all(
      (siblings.results ?? []).map((row) => buildTaskWithProgress(c.env.DB, row))
    )
    return c.json(result)
  }

  // Shift siblings
  if (newIndex < oldIndex) {
    await c.env.DB.prepare(
      'UPDATE tasks SET order_index = order_index + 1 WHERE parent_id IS ? AND order_index >= ? AND order_index < ? AND id != ?'
    )
      .bind(parentId, newIndex, oldIndex, id)
      .run()
  } else {
    await c.env.DB.prepare(
      'UPDATE tasks SET order_index = order_index - 1 WHERE parent_id IS ? AND order_index > ? AND order_index <= ? AND id != ?'
    )
      .bind(parentId, oldIndex, newIndex, id)
      .run()
  }

  await c.env.DB.prepare('UPDATE tasks SET order_index = ? WHERE id = ?')
    .bind(newIndex, id)
    .run()

  const siblings = await c.env.DB.prepare(
    'SELECT * FROM tasks WHERE parent_id IS ? ORDER BY order_index ASC'
  )
    .bind(parentId)
    .all<Record<string, unknown>>()

  const result = await Promise.all(
    (siblings.results ?? []).map((row) => buildTaskWithProgress(c.env.DB, row))
  )
  return c.json(result)
})

export default tasks
