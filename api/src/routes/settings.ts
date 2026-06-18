import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'

const settings = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// GET /api/settings
settings.get('/', async (c) => {
  const result = await c.env.DB.prepare('SELECT key, value FROM app_settings').all<{ key: string; value: string }>()
  const map: Record<string, string> = {}
  for (const row of result.results ?? []) {
    map[row.key] = row.value
  }
  return c.json(map)
})

// PATCH /api/settings
settings.patch('/', async (c) => {
  const body = await c.req.json<Record<string, string>>()
  const now = new Date().toISOString()

  const stmts = Object.entries(body).map(([key, value]) =>
    c.env.DB.prepare(
      'INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
    ).bind(key, value, now)
  )

  if (stmts.length > 0) {
    await c.env.DB.batch(stmts)
  }

  const result = await c.env.DB.prepare('SELECT key, value FROM app_settings').all<{ key: string; value: string }>()
  const map: Record<string, string> = {}
  for (const row of result.results ?? []) {
    map[row.key] = row.value
  }
  return c.json(map)
})

export default settings
