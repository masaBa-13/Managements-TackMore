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

  // Discord notification on completion
  if (body.status === 'done' && existing.status !== 'done') {
    const webhookRow = await c.env.DB.prepare(
      "SELECT value FROM app_settings WHERE key = 'discord_webhook_url'"
    ).first<{ value: string }>()

    if (webhookRow?.value) {
      const jst = new Date(Date.now() + 9 * 3600000)
      const dateStr = jst.toISOString().replace('T', ' ').slice(0, 16) + ' JST'
      const payload = {
        embeds: [{
          title: '✅ タスクが完了しました',
          color: 0x10b981,
          fields: [
            { name: 'タスク', value: task.title, inline: false },
            { name: '担当者', value: task.assignee ?? '未設定', inline: true },
            { name: 'プロジェクト', value: task.project ?? '未設定', inline: true },
            { name: '完了日時', value: dateStr, inline: false },
          ],
        }],
      }
      // fire-and-forget
      fetch(webhookRow.value, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {})
    }
  }

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

// Helper: call Workers AI and extract JSON
async function callAiJson(ai: Ai, prompt: string): Promise<Record<string, unknown>> {
  const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 3072,
  })
  const text = (response as { response?: string }).response ?? ''

  if (!text.trim()) {
    throw new Error('AI returned empty response')
  }

  let jsonStr = text.trim()
  // Find the outermost JSON object
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No JSON object found in AI response')
  }
  jsonStr = jsonMatch[0]

  const parsed = JSON.parse(jsonStr)
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Parsed result is not an object')
  }
  return parsed
}

// POST /api/tasks/ai-generate — AI WBS生成（自由入力テキストから）
tasks.post('/ai-generate', async (c) => {
  const body = await c.req.json<{
    project_name?: string
    goal: string
    deadline?: string
    members?: string[]
  }>()

  if (!body.goal?.trim()) {
    return c.json({ error: '内容を入力してください' }, 400)
  }

  const prompt = `あなたはプロジェクト管理の専門家です。以下のユーザー入力から、プロジェクト情報を読み取り、WBS（Work Breakdown Structure）をJSON形式で生成してください。

ユーザー入力:
${body.goal}

以下のJSON形式で出力してください。他のテキストは一切含めないでください:
{
  "project_name": "抽出したプロジェクト名",
  "deadline": "YYYY-MM-DD形式の期限（読み取れない場合はnull）",
  "epics": [
    {
      "title": "エピック名",
      "tasks": [
        {
          "title": "タスク名",
          "estimated_days": 3,
          "subtasks": [
            { "title": "サブタスク名", "assignee": "担当者名またはnull", "priority": "high|medium|low", "estimated_days": 1 }
          ]
        }
      ]
    }
  ]
}

ルール:
- ユーザー入力からプロジェクト名、期限、メンバー、ゴールを自動で読み取る
- エピックは2〜5個
- 各エピックにタスクは2〜4個
- 各タスクにサブタスクは1〜4個
- 実際に実行可能な粒度で分解する
- 日本語で出力する
- priorityはhigh/medium/lowのいずれか
- estimated_daysは各タスク・サブタスクにつける推定作業日数
- メンバー名が読み取れた場合はassigneeに均等に割り振る
- JSONのみ出力。説明文やマークダウンは不要`

  try {
    const result = await callAiJson(c.env.AI, prompt) as {
      project_name?: string
      deadline?: string | null
      epics?: unknown[]
    }

    if (!result.epics || !Array.isArray(result.epics)) {
      return c.json({ error: 'AIの出力を解析できませんでした。もう一度お試しください。' }, 500)
    }

    return c.json({
      project: result.project_name || body.project_name || 'New Project',
      deadline: result.deadline || body.deadline || null,
      wbs: result.epics,
    })
  } catch (e) {
    console.error('AI generation error:', e)
    return c.json({ error: 'WBS生成に失敗しました。もう一度お試しください。' }, 500)
  }
})

// POST /api/tasks/ai-generate/confirm — AI生成WBSを一括登録
tasks.post('/ai-generate/confirm', async (c) => {
  const body = await c.req.json<{
    project: string
    deadline?: string | null
    epics: {
      title: string
      tasks: {
        title: string
        estimated_days?: number
        subtasks: { title: string; assignee?: string | null; priority?: string; estimated_days?: number }[]
      }[]
    }[]
  }>()

  if (!body.epics?.length) {
    return c.json({ error: 'エピックが空です' }, 400)
  }

  const userName = c.get('userName')
  const createdIds: number[] = []

  // Calculate due dates from estimated_days (sequential from today)
  let currentDate = new Date()

  for (let ei = 0; ei < body.epics.length; ei++) {
    const epic = body.epics[ei]

    // Epic due date = deadline or end of all tasks
    const epicStartDate = new Date(currentDate)

    // Create Epic (due_date set after tasks are processed)
    const epicResult = await c.env.DB.prepare(
      `INSERT INTO tasks (parent_id, level, order_index, title, project, due_date, priority, status, created_by, updated_at)
       VALUES (NULL, 1, ?, ?, ?, ?, 'medium', 'todo', ?, datetime('now'))`
    )
      .bind(ei, epic.title, body.project, body.deadline ?? null, userName)
      .run()

    const epicId = epicResult.meta.last_row_id
    createdIds.push(epicId)

    for (let ti = 0; ti < epic.tasks.length; ti++) {
      const task = epic.tasks[ti]
      const taskDays = task.estimated_days ?? 7

      // Task due date based on estimated_days
      const taskDue = new Date(currentDate)
      taskDue.setDate(taskDue.getDate() + taskDays)
      const taskDueStr = taskDue.toISOString().slice(0, 10)

      const taskResult = await c.env.DB.prepare(
        `INSERT INTO tasks (parent_id, level, order_index, title, project, due_date, priority, status, created_by, updated_at)
         VALUES (?, 2, ?, ?, ?, ?, 'medium', 'todo', ?, datetime('now'))`
      )
        .bind(epicId, ti, task.title, body.project, taskDueStr, userName)
        .run()

      const taskId = taskResult.meta.last_row_id

      // Distribute subtask days within the task duration
      let subOffset = 0
      for (let si = 0; si < task.subtasks.length; si++) {
        const sub = task.subtasks[si]
        const subDays = sub.estimated_days ?? Math.max(1, Math.floor(taskDays / task.subtasks.length))

        const subDue = new Date(currentDate)
        subDue.setDate(subDue.getDate() + subOffset + subDays)
        const subDueStr = subDue.toISOString().slice(0, 10)
        subOffset += subDays

        await c.env.DB.prepare(
          `INSERT INTO tasks (parent_id, level, order_index, title, project, assignee, due_date, priority, status, created_by, updated_at)
           VALUES (?, 3, ?, ?, ?, ?, ?, ?, 'todo', ?, datetime('now'))`
        )
          .bind(
            taskId,
            si,
            sub.title,
            body.project,
            sub.assignee ?? null,
            subDueStr,
            sub.priority ?? 'medium',
            userName
          )
          .run()
      }

      // Advance current date past this task
      currentDate = new Date(taskDue)
    }

    // Update epic due_date to end of its last task (if no explicit deadline)
    if (!body.deadline) {
      const epicDueStr = currentDate.toISOString().slice(0, 10)
      await c.env.DB.prepare('UPDATE tasks SET due_date = ? WHERE id = ?')
        .bind(epicDueStr, epicId)
        .run()
    }
  }

  return c.json({ success: true, created_epics: createdIds.length })
})

export default tasks
