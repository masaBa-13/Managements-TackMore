import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'

const categories = new Hono<{ Bindings: Bindings; Variables: Variables }>()

categories.get('/', async (c) => {
  const result = await c.env.DB.prepare('SELECT * FROM categories ORDER BY name ASC').all()
  return c.json(result.results ?? [])
})

categories.post('/', async (c) => {
  const body = await c.req.json<{ name: string; type?: string }>()
  if (!body.name) return c.json({ error: '名前は必須です' }, 400)

  const existing = await c.env.DB.prepare('SELECT id FROM categories WHERE name = ?').bind(body.name).first()
  if (existing) return c.json({ error: 'このカテゴリは既に登録されています' }, 409)

  const result = await c.env.DB.prepare(
    'INSERT INTO categories (name, type) VALUES (?, ?)'
  ).bind(body.name, body.type ?? 'both').run()

  const row = await c.env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(result.meta.last_row_id).first()
  return c.json(row, 201)
})

categories.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  await c.env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

export default categories
