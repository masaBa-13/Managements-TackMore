export interface Transaction {
  id: number
  date: string
  type: 'income' | 'expense'
  category: string
  amount: number
  description: string | null
  is_fixed: number
  fixed_expense_id: number | null
  created_by: string
  created_at: string
}

export interface FixedExpense {
  id: number
  name: string
  category: string
  amount: number
  billing_day: number
  is_active: number
  note: string | null
  start_month: string
  end_month: string | null
  created_by: string
  created_at: string
}

export interface CashBalance {
  id: number
  recorded_month: string
  balance: number
  note: string | null
  created_by: string
  created_at: string
}

export interface FinanceSummary {
  current_month: string
  income_total: number
  expense_total: number
  fixed_expense_total: number
  latest_balance: number | null
  latest_balance_month: string | null
  runway_months: number | null
  balance_reminder_needed: boolean
}

export interface BalanceReminder {
  id: number
  remind_day: number
  is_active: number
  message: string
}

export async function fetchTransactions(yearMonth?: string): Promise<Transaction[]> {
  const url = yearMonth ? `/api/finance/transactions?year_month=${yearMonth}` : '/api/finance/transactions'
  const res = await fetch(url)
  if (!res.ok) throw new Error('取引の取得に失敗しました')
  return res.json()
}

export async function createTransaction(data: {
  date: string
  type: 'income' | 'expense'
  category: string
  amount: number
  description?: string
}): Promise<Transaction> {
  const res = await fetch('/api/finance/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? '取引の作成に失敗しました')
  }
  return res.json()
}

export async function updateTransaction(id: number, data: Partial<{
  date: string
  type: 'income' | 'expense'
  category: string
  amount: number
  description: string
}>): Promise<Transaction> {
  const res = await fetch(`/api/finance/transactions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? '取引の更新に失敗しました')
  }
  return res.json()
}

export async function deleteTransaction(id: number): Promise<void> {
  const res = await fetch(`/api/finance/transactions/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? '取引の削除に失敗しました')
  }
}

export async function fetchFixedExpenses(): Promise<FixedExpense[]> {
  const res = await fetch('/api/finance/fixed-expenses')
  if (!res.ok) throw new Error('固定費の取得に失敗しました')
  return res.json()
}

export async function createFixedExpense(data: {
  name: string
  category: string
  amount: number
  billing_day?: number
  note?: string
  start_month: string
  end_month?: string
}): Promise<FixedExpense> {
  const res = await fetch('/api/finance/fixed-expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? '固定費の作成に失敗しました')
  }
  return res.json()
}

export async function updateFixedExpense(id: number, data: Partial<{
  name: string
  category: string
  amount: number
  billing_day: number
  note: string
  start_month: string
  end_month: string
  is_active: number
}>): Promise<FixedExpense> {
  const res = await fetch(`/api/finance/fixed-expenses/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? '固定費の更新に失敗しました')
  }
  return res.json()
}

export async function deleteFixedExpense(id: number): Promise<void> {
  const res = await fetch(`/api/finance/fixed-expenses/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? '固定費の削除に失敗しました')
  }
}

export async function fetchCashBalances(): Promise<CashBalance[]> {
  const res = await fetch('/api/finance/cash-balances')
  if (!res.ok) throw new Error('残高の取得に失敗しました')
  return res.json()
}

export async function upsertCashBalance(data: {
  recorded_month: string
  balance: number
  note?: string
}): Promise<CashBalance> {
  const res = await fetch('/api/finance/cash-balances', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? '残高の保存に失敗しました')
  }
  return res.json()
}

export async function fetchFinanceSummary(): Promise<FinanceSummary> {
  const res = await fetch('/api/finance/summary')
  if (!res.ok) throw new Error('サマリーの取得に失敗しました')
  return res.json()
}

export async function fetchReminderSetting(): Promise<BalanceReminder> {
  const res = await fetch('/api/finance/reminder-setting')
  if (!res.ok) throw new Error('リマインダー設定の取得に失敗しました')
  return res.json()
}

export async function updateReminderSetting(data: {
  remind_day?: number
  is_active?: boolean
  message?: string
}): Promise<BalanceReminder> {
  const res = await fetch('/api/finance/reminder-setting', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'リマインダー設定の更新に失敗しました')
  }
  return res.json()
}
