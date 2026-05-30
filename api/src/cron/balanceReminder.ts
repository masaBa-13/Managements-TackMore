import type { D1Database } from '@cloudflare/workers-types'

export async function runBalanceReminderCron(db: D1Database): Promise<void> {
  const now = new Date()
  const currentMonth = now.toISOString().slice(0, 7) // YYYY-MM
  const today = now.getDate()

  // Get reminder setting
  const reminder = await db
    .prepare('SELECT * FROM balance_reminders WHERE id = 1 AND is_active = 1')
    .first<{ remind_day: number; is_active: number; message: string }>()

  if (!reminder) {
    console.log('[balanceReminder cron] リマインダーが無効です')
    return
  }

  // Check if today is on or after remind_day
  if (today < reminder.remind_day) {
    console.log(`[balanceReminder cron] 本日(${today}日)はリマインダー日(${reminder.remind_day}日)より前のため、スキップします`)
    return
  }

  // Check if current month balance exists
  const existing = await db
    .prepare('SELECT id FROM cash_balances WHERE recorded_month = ?')
    .bind(currentMonth)
    .first()

  if (existing) {
    console.log(`[balanceReminder cron] ${currentMonth}の残高は入力済みです`)
    return
  }

  // Record that reminder is needed (using D1 as a simple flag table would need schema change)
  // Per spec: フロントは /api/finance/summary の balance_reminder_needed で取得
  // The summary endpoint already calculates this dynamically, so just log here
  console.log(`[balanceReminder cron] ${currentMonth}の残高が未入力です。リマインダーが必要です: ${reminder.message}`)
}
