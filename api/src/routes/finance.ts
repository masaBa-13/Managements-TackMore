import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'

const finance = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// GET /api/finance/transactions
finance.get('/transactions', async (c) => {
  const yearMonth = c.req.query('year_month') ?? new Date().toISOString().slice(0, 7)

  const result = await c.env.DB.prepare(
    "SELECT * FROM transactions WHERE date LIKE ? ORDER BY date DESC, id DESC"
  )
    .bind(`${yearMonth}%`)
    .all()

  return c.json(result.results ?? [])
})

// POST /api/finance/transactions
finance.post('/transactions', async (c) => {
  const body = await c.req.json<{
    date: string
    type: 'income' | 'expense'
    category: string
    amount: number
    description?: string
  }>()

  if (!body.date || !body.type || !body.category || body.amount == null) {
    return c.json({ error: '必須項目が不足しています' }, 400)
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO transactions (date, type, category, amount, description, is_fixed, created_by)
     VALUES (?, ?, ?, ?, ?, 0, ?)`
  )
    .bind(body.date, body.type, body.category, body.amount, body.description ?? null, c.get('userName'))
    .run()

  const row = await c.env.DB.prepare('SELECT * FROM transactions WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first()

  return c.json(row, 201)
})

// PATCH /api/finance/transactions/:id
finance.patch('/transactions/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json<{
    date?: string
    type?: 'income' | 'expense'
    category?: string
    amount?: number
    description?: string
  }>()

  const existing = await c.env.DB.prepare('SELECT * FROM transactions WHERE id = ?')
    .bind(id)
    .first<{ id: number; is_fixed: number }>()

  if (!existing) {
    return c.json({ error: '取引が見つかりません' }, 404)
  }

  const updates: string[] = []
  const params: unknown[] = []

  if (body.date !== undefined) { updates.push('date = ?'); params.push(body.date) }
  if (body.type !== undefined) { updates.push('type = ?'); params.push(body.type) }
  if (body.category !== undefined) { updates.push('category = ?'); params.push(body.category) }
  if (body.amount !== undefined) { updates.push('amount = ?'); params.push(body.amount) }
  if (body.description !== undefined) { updates.push('description = ?'); params.push(body.description) }

  if (updates.length === 0) {
    return c.json(existing)
  }

  params.push(id)
  await c.env.DB.prepare(`UPDATE transactions SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...params)
    .run()

  const row = await c.env.DB.prepare('SELECT * FROM transactions WHERE id = ?')
    .bind(id)
    .first()

  return c.json(row)
})

// DELETE /api/finance/transactions/:id
finance.delete('/transactions/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const existing = await c.env.DB.prepare('SELECT id, is_fixed FROM transactions WHERE id = ?')
    .bind(id)
    .first<{ id: number; is_fixed: number }>()

  if (!existing) {
    return c.json({ error: '取引が見つかりません' }, 404)
  }
  if (existing.is_fixed === 1) {
    return c.json({ error: '固定費から自動生成された取引は削除できません' }, 400)
  }

  await c.env.DB.prepare('DELETE FROM transactions WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

// GET /api/finance/fixed-expenses
finance.get('/fixed-expenses', async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT * FROM fixed_expenses ORDER BY is_active DESC, name ASC'
  ).all()

  return c.json(result.results ?? [])
})

// POST /api/finance/fixed-expenses
finance.post('/fixed-expenses', async (c) => {
  const body = await c.req.json<{
    name: string
    category: string
    amount: number
    billing_day?: number
    note?: string
    start_month: string
    end_month?: string
  }>()

  if (!body.name || !body.category || body.amount == null || !body.start_month) {
    return c.json({ error: '必須項目が不足しています' }, 400)
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO fixed_expenses (name, category, amount, billing_day, note, start_month, end_month, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      body.name,
      body.category,
      body.amount,
      body.billing_day ?? 1,
      body.note ?? null,
      body.start_month,
      body.end_month ?? null,
      c.get('userName')
    )
    .run()

  const row = await c.env.DB.prepare('SELECT * FROM fixed_expenses WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first()

  return c.json(row, 201)
})

// PATCH /api/finance/fixed-expenses/:id
finance.patch('/fixed-expenses/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json<{
    name?: string
    category?: string
    amount?: number
    billing_day?: number
    note?: string
    start_month?: string
    end_month?: string
    is_active?: number
  }>()

  const existing = await c.env.DB.prepare('SELECT id FROM fixed_expenses WHERE id = ?')
    .bind(id)
    .first()

  if (!existing) {
    return c.json({ error: '固定費が見つかりません' }, 404)
  }

  const updates: string[] = []
  const params: unknown[] = []

  if (body.name !== undefined) { updates.push('name = ?'); params.push(body.name) }
  if (body.category !== undefined) { updates.push('category = ?'); params.push(body.category) }
  if (body.amount !== undefined) { updates.push('amount = ?'); params.push(body.amount) }
  if (body.billing_day !== undefined) { updates.push('billing_day = ?'); params.push(body.billing_day) }
  if (body.note !== undefined) { updates.push('note = ?'); params.push(body.note) }
  if (body.start_month !== undefined) { updates.push('start_month = ?'); params.push(body.start_month) }
  if (body.end_month !== undefined) { updates.push('end_month = ?'); params.push(body.end_month) }
  if (body.is_active !== undefined) { updates.push('is_active = ?'); params.push(body.is_active) }

  if (updates.length === 0) {
    return c.json(existing)
  }

  params.push(id)
  await c.env.DB.prepare(`UPDATE fixed_expenses SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...params)
    .run()

  const row = await c.env.DB.prepare('SELECT * FROM fixed_expenses WHERE id = ?')
    .bind(id)
    .first()

  return c.json(row)
})

// DELETE /api/finance/fixed-expenses/:id (logical delete)
finance.delete('/fixed-expenses/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const existing = await c.env.DB.prepare('SELECT id FROM fixed_expenses WHERE id = ?')
    .bind(id)
    .first()

  if (!existing) {
    return c.json({ error: '固定費が見つかりません' }, 404)
  }

  await c.env.DB.prepare('UPDATE fixed_expenses SET is_active = 0 WHERE id = ?')
    .bind(id)
    .run()

  return c.json({ success: true })
})

// GET /api/finance/cash-balances
finance.get('/cash-balances', async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT * FROM cash_balances ORDER BY recorded_month DESC'
  ).all()

  return c.json(result.results ?? [])
})

// POST /api/finance/cash-balances (UPSERT)
finance.post('/cash-balances', async (c) => {
  const body = await c.req.json<{
    recorded_month: string
    balance: number
    note?: string
  }>()

  if (!body.recorded_month || body.balance == null) {
    return c.json({ error: '必須項目が不足しています' }, 400)
  }

  await c.env.DB.prepare(
    `INSERT INTO cash_balances (recorded_month, balance, note, created_by)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(recorded_month) DO UPDATE SET
       balance = excluded.balance,
       note = excluded.note,
       created_by = excluded.created_by`
  )
    .bind(body.recorded_month, body.balance, body.note ?? null, c.get('userName'))
    .run()

  const row = await c.env.DB.prepare('SELECT * FROM cash_balances WHERE recorded_month = ?')
    .bind(body.recorded_month)
    .first()

  return c.json(row, 200)
})

// GET /api/finance/summary
finance.get('/summary', async (c) => {
  const now = new Date()
  const currentMonth = now.toISOString().slice(0, 7)

  // income & expense totals for current month
  const totals = await c.env.DB.prepare(
    `SELECT
       SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income_total,
       SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense_total
     FROM transactions WHERE date LIKE ?`
  )
    .bind(`${currentMonth}%`)
    .first<{ income_total: number | null; expense_total: number | null }>()

  // active fixed expenses total
  const fixedTotal = await c.env.DB.prepare(
    `SELECT SUM(amount) as total FROM fixed_expenses
     WHERE is_active = 1 AND start_month <= ? AND (end_month IS NULL OR end_month >= ?)`
  )
    .bind(currentMonth, currentMonth)
    .first<{ total: number | null }>()

  // latest cash balance
  const latestBalance = await c.env.DB.prepare(
    'SELECT * FROM cash_balances ORDER BY recorded_month DESC LIMIT 1'
  ).first<{ balance: number; recorded_month: string } | null>()

  // reminder check
  const reminder = await c.env.DB.prepare(
    'SELECT * FROM balance_reminders WHERE id = 1'
  ).first<{ remind_day: number; is_active: number } | null>()

  const currentMonthBalance = await c.env.DB.prepare(
    'SELECT id FROM cash_balances WHERE recorded_month = ?'
  )
    .bind(currentMonth)
    .first()

  let balanceReminderNeeded = false
  if (reminder?.is_active === 1 && !currentMonthBalance) {
    const today = now.getDate()
    balanceReminderNeeded = today >= (reminder.remind_day ?? 28)
  }

  const fixedExpTotal = fixedTotal?.total ?? 0
  const latestBal = latestBalance?.balance ?? null
  const runwayMonths =
    latestBal != null && fixedExpTotal > 0
      ? Math.floor(latestBal / fixedExpTotal)
      : null

  return c.json({
    current_month: currentMonth,
    income_total: totals?.income_total ?? 0,
    expense_total: totals?.expense_total ?? 0,
    fixed_expense_total: fixedExpTotal,
    latest_balance: latestBal,
    latest_balance_month: latestBalance?.recorded_month ?? null,
    runway_months: runwayMonths,
    balance_reminder_needed: balanceReminderNeeded,
  })
})

// GET /api/finance/reminder-setting
finance.get('/reminder-setting', async (c) => {
  const row = await c.env.DB.prepare('SELECT * FROM balance_reminders WHERE id = 1').first()
  if (!row) {
    return c.json({ error: 'リマインダー設定が見つかりません' }, 404)
  }
  return c.json(row)
})

// PATCH /api/finance/reminder-setting
finance.patch('/reminder-setting', async (c) => {
  const body = await c.req.json<{
    remind_day?: number
    is_active?: boolean
    message?: string
  }>()

  const updates: string[] = []
  const params: unknown[] = []

  if (body.remind_day !== undefined) { updates.push('remind_day = ?'); params.push(body.remind_day) }
  if (body.is_active !== undefined) { updates.push('is_active = ?'); params.push(body.is_active ? 1 : 0) }
  if (body.message !== undefined) { updates.push('message = ?'); params.push(body.message) }

  if (updates.length > 0) {
    params.push(1)
    await c.env.DB.prepare(`UPDATE balance_reminders SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...params)
      .run()
  }

  const row = await c.env.DB.prepare('SELECT * FROM balance_reminders WHERE id = 1').first()
  return c.json(row)
})

export default finance
