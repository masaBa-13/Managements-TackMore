import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'

const projects = new Hono<{ Bindings: Bindings; Variables: Variables }>()

projects.get('/', async (c) => {
  const result = await c.env.DB.prepare('SELECT * FROM projects ORDER BY name ASC').all()
  return c.json(result.results ?? [])
})

projects.post('/', async (c) => {
  const body = await c.req.json<{ name: string }>()
  if (!body.name) return c.json({ error: '名前は必須です' }, 400)

  const existing = await c.env.DB.prepare('SELECT id FROM projects WHERE name = ?').bind(body.name).first()
  if (existing) return c.json({ error: 'このプロジェクトは既に登録されています' }, 409)

  const result = await c.env.DB.prepare('INSERT INTO projects (name) VALUES (?)').bind(body.name).run()
  const row = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(result.meta.last_row_id).first()
  return c.json(row, 201)
})

projects.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  await c.env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

export default projects
