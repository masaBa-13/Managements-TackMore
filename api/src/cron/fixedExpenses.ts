import type { D1Database } from '@cloudflare/workers-types'

export async function runFixedExpensesCron(db: D1Database): Promise<void> {
  const now = new Date()
  const currentMonth = now.toISOString().slice(0, 7) // YYYY-MM

  // Get all active fixed expenses for this month
  const fixedExpenses = await db
    .prepare(
      `SELECT * FROM fixed_expenses
       WHERE is_active = 1
         AND start_month <= ?
         AND (end_month IS NULL OR end_month >= ?)`
    )
    .bind(currentMonth, currentMonth)
    .all<{
      id: number
      name: string
      type: 'income' | 'expense'
      category: string
      amount: number
    }>()

  const expenses = fixedExpenses.results ?? []
  let insertedCount = 0

  for (const expense of expenses) {
    // Check if already inserted for this month
    const existing = await db
      .prepare(
        `SELECT id FROM transactions
         WHERE is_fixed = 1 AND fixed_expense_id = ? AND date LIKE ?`
      )
      .bind(expense.id, `${currentMonth}%`)
      .first()

    if (!existing) {
      await db
        .prepare(
          `INSERT INTO transactions (date, type, category, amount, description, is_fixed, fixed_expense_id, created_by)
           VALUES (?, ?, ?, ?, ?, 1, ?, 'system')`
        )
        .bind(
          `${currentMonth}-01`,
          expense.type,
          expense.category,
          expense.amount,
          expense.name,
          expense.id
        )
        .run()
      insertedCount++
    }
  }

  console.log(`[fixedExpenses cron] ${currentMonth}: ${insertedCount}件の定期取引を展開しました`)
}
