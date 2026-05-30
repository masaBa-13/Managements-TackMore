import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'

const legal = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// GET /api/legal/alerts (must be before /:id)
legal.get('/alerts', async (c) => {
  const thirtyDaysLater = new Date()
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30)
  const today = new Date().toISOString().slice(0, 10)
  const limit = thirtyDaysLater.toISOString().slice(0, 10)

  const result = await c.env.DB.prepare(
    `SELECT * FROM legal_items
     WHERE due_date >= ? AND due_date <= ? AND status != 'done'
     ORDER BY due_date ASC`
  )
    .bind(today, limit)
    .all()

  return c.json(result.results ?? [])
})

// GET /api/legal
legal.get('/', async (c) => {
  const status = c.req.query('status')

  let query = 'SELECT * FROM legal_items WHERE 1=1'
  const params: unknown[] = []

  if (status) {
    query += ' AND status = ?'
    params.push(status)
  }
  query += ' ORDER BY due_date ASC'

  const result = await c.env.DB.prepare(query)
    .bind(...params)
    .all()

  return c.json(result.results ?? [])
})

// POST /api/legal
legal.post('/', async (c) => {
  const body = await c.req.json<{
    title: string
    category: '税務' | '登記' | '補助金' | '契約' | 'その他'
    due_date: string
    notes?: string
  }>()

  if (!body.title || !body.category || !body.due_date) {
    return c.json({ error: '必須項目が不足しています' }, 400)
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO legal_items (title, category, due_date, notes, created_by)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(body.title, body.category, body.due_date, body.notes ?? null, c.get('userName'))
    .run()

  const row = await c.env.DB.prepare('SELECT * FROM legal_items WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first()

  return c.json(row, 201)
})

// PATCH /api/legal/:id
legal.patch('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json<{
    title?: string
    category?: string
    due_date?: string
    status?: 'pending' | 'in_progress' | 'done'
    notes?: string
  }>()

  const existing = await c.env.DB.prepare('SELECT id FROM legal_items WHERE id = ?')
    .bind(id)
    .first()

  if (!existing) {
    return c.json({ error: '法務項目が見つかりません' }, 404)
  }

  const updates: string[] = []
  const params: unknown[] = []

  if (body.title !== undefined) { updates.push('title = ?'); params.push(body.title) }
  if (body.category !== undefined) { updates.push('category = ?'); params.push(body.category) }
  if (body.due_date !== undefined) { updates.push('due_date = ?'); params.push(body.due_date) }
  if (body.status !== undefined) { updates.push('status = ?'); params.push(body.status) }
  if (body.notes !== undefined) { updates.push('notes = ?'); params.push(body.notes) }

  if (updates.length === 0) {
    return c.json(existing)
  }

  params.push(id)
  await c.env.DB.prepare(`UPDATE legal_items SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...params)
    .run()

  const row = await c.env.DB.prepare('SELECT * FROM legal_items WHERE id = ?')
    .bind(id)
    .first()

  return c.json(row)
})

// DELETE /api/legal/:id
legal.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const existing = await c.env.DB.prepare('SELECT id FROM legal_items WHERE id = ?')
    .bind(id)
    .first()

  if (!existing) {
    return c.json({ error: '法務項目が見つかりません' }, 404)
  }

  await c.env.DB.prepare('DELETE FROM legal_items WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

export default legal
