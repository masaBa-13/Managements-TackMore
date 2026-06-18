import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'

const market = new Hono<{ Bindings: Bindings; Variables: Variables }>()

function parseRow(row: Record<string, unknown>) {
  return {
    ...row,
    tags: JSON.parse((row.tags as string) ?? '[]') as string[],
  }
}

// GET /api/market
market.get('/', async (c) => {
  const tag = c.req.query('tag')
  const q = c.req.query('q')
  const source = c.req.query('source')

  let query = 'SELECT * FROM market_notes WHERE 1=1'
  const params: unknown[] = []

  if (source === 'auto') {
    query += " AND created_by = 'system-auto'"
  } else if (source === 'manual') {
    query += " AND created_by != 'system-auto'"
  }

  if (q) {
    query += ' AND (title LIKE ? OR content LIKE ?)'
    params.push(`%${q}%`, `%${q}%`)
  }
  query += ' ORDER BY created_at DESC'

  const result = await c.env.DB.prepare(query)
    .bind(...params)
    .all<Record<string, unknown>>()

  let rows = (result.results ?? []).map(parseRow)

  if (tag) {
    rows = rows.filter((r) => (r.tags as string[]).includes(tag))
  }

  return c.json(rows)
})

// POST /api/market
market.post('/', async (c) => {
  const body = await c.req.json<{
    title: string
    content: string
    tags?: string[]
    source_url?: string
  }>()

  if (!body.title || !body.content) {
    return c.json({ error: '必須項目が不足しています' }, 400)
  }

  const tagsJson = JSON.stringify(body.tags ?? [])

  const result = await c.env.DB.prepare(
    `INSERT INTO market_notes (title, content, tags, source_url, created_by)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(body.title, body.content, tagsJson, body.source_url ?? null, c.get('userName'))
    .run()

  const row = await c.env.DB.prepare('SELECT * FROM market_notes WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first<Record<string, unknown>>()

  return c.json(parseRow(row!), 201)
})

// PATCH /api/market/:id
market.patch('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json<{
    title?: string
    content?: string
    tags?: string[]
    source_url?: string
  }>()

  const existing = await c.env.DB.prepare('SELECT id FROM market_notes WHERE id = ?')
    .bind(id)
    .first()

  if (!existing) {
    return c.json({ error: 'マーケットメモが見つかりません' }, 404)
  }

  const updates: string[] = []
  const params: unknown[] = []

  if (body.title !== undefined) { updates.push('title = ?'); params.push(body.title) }
  if (body.content !== undefined) { updates.push('content = ?'); params.push(body.content) }
  if (body.tags !== undefined) { updates.push('tags = ?'); params.push(JSON.stringify(body.tags)) }
  if (body.source_url !== undefined) { updates.push('source_url = ?'); params.push(body.source_url) }

  if (updates.length === 0) {
    const row = await c.env.DB.prepare('SELECT * FROM market_notes WHERE id = ?')
      .bind(id)
      .first<Record<string, unknown>>()
    return c.json(parseRow(row!))
  }

  params.push(id)
  await c.env.DB.prepare(`UPDATE market_notes SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...params)
    .run()

  const row = await c.env.DB.prepare('SELECT * FROM market_notes WHERE id = ?')
    .bind(id)
    .first<Record<string, unknown>>()

  return c.json(parseRow(row!))
})

// DELETE /api/market/:id
market.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const existing = await c.env.DB.prepare('SELECT id FROM market_notes WHERE id = ?')
    .bind(id)
    .first()

  if (!existing) {
    return c.json({ error: 'マーケットメモが見つかりません' }, 404)
  }

  await c.env.DB.prepare('DELETE FROM market_notes WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

export default market
