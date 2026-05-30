import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'

const members = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// GET /api/members
members.get('/', async (c) => {
  const result = await c.env.DB.prepare('SELECT * FROM members ORDER BY name ASC').all()
  return c.json(result.results ?? [])
})

// POST /api/members
members.post('/', async (c) => {
  const body = await c.req.json<{ name: string; email: string }>()

  if (!body.name || !body.email) {
    return c.json({ error: '名前とメールアドレスは必須です' }, 400)
  }

  const existing = await c.env.DB.prepare('SELECT id FROM members WHERE email = ?')
    .bind(body.email)
    .first()

  if (existing) {
    return c.json({ error: 'このメールアドレスは既に登録されています' }, 409)
  }

  const result = await c.env.DB.prepare(
    'INSERT INTO members (name, email) VALUES (?, ?)'
  )
    .bind(body.name, body.email)
    .run()

  const row = await c.env.DB.prepare('SELECT * FROM members WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first()

  return c.json(row, 201)
})

// DELETE /api/members/:id
members.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const existing = await c.env.DB.prepare('SELECT id FROM members WHERE id = ?')
    .bind(id)
    .first()

  if (!existing) {
    return c.json({ error: 'メンバーが見つかりません' }, 404)
  }

  await c.env.DB.prepare('DELETE FROM members WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

export default members
