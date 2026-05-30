import { API_BASE } from './base'

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
  type: 'income' | 'expense'
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
  fixed_expense_total_next: number
  fixed_income_total_next: number
  net_monthly_burn: number
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
  const url = yearMonth ? `${API_BASE}/api/finance/transactions?year_month=${yearMonth}` : `${API_BASE}/api/finance/transactions`
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
  const res = await fetch(`${API_BASE}/api/finance/transactions`, {
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
  const res = await fetch(`${API_BASE}/api/finance/transactions/${id}`, {
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
  const res = await fetch(`${API_BASE}/api/finance/transactions/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? '取引の削除に失敗しました')
  }
}

export async function fetchFixedExpenses(): Promise<FixedExpense[]> {
  const res = await fetch(`${API_BASE}/api/finance/fixed-expenses`)
  if (!res.ok) throw new Error('固定費の取得に失敗しました')
  return res.json()
}

export async function createFixedExpense(data: {
  name: string
  type?: 'income' | 'expense'
  category: string
  amount: number
  billing_day?: number
  note?: string
  start_month: string
  end_month?: string
}): Promise<FixedExpense> {
  const res = await fetch(`${API_BASE}/api/finance/fixed-expenses`, {
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
  type: 'income' | 'expense'
  category: string
  amount: number
  billing_day: number
  note: string
  start_month: string
  end_month: string
  is_active: number
}>): Promise<FixedExpense> {
  const res = await fetch(`${API_BASE}/api/finance/fixed-expenses/${id}`, {
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
  const res = await fetch(`${API_BASE}/api/finance/fixed-expenses/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? '固定費の削除に失敗しました')
  }
}

export async function fetchCashBalances(): Promise<CashBalance[]> {
  const res = await fetch(`${API_BASE}/api/finance/cash-balances`)
  if (!res.ok) throw new Error('残高の取得に失敗しました')
  return res.json()
}

export async function upsertCashBalance(data: {
  recorded_month: string
  balance: number
  note?: string
}): Promise<CashBalance> {
  const res = await fetch(`${API_BASE}/api/finance/cash-balances`, {
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
  const res = await fetch(`${API_BASE}/api/finance/summary`)
  if (!res.ok) throw new Error('サマリーの取得に失敗しました')
  return res.json()
}

export async function fetchReminderSetting(): Promise<BalanceReminder> {
  const res = await fetch(`${API_BASE}/api/finance/reminder-setting`)
  if (!res.ok) throw new Error('リマインダー設定の取得に失敗しました')
  return res.json()
}

export async function updateReminderSetting(data: {
  remind_day?: number
  is_active?: boolean
  message?: string
}): Promise<BalanceReminder> {
  const res = await fetch(`${API_BASE}/api/finance/reminder-setting`, {
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

// ===== 請求書 =====

export interface Invoice {
  id: number
  client_name: string
  title: string
  amount: number
  issue_date: string
  due_date: string
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  sent_at: string | null
  paid_at: string | null
  notes: string | null
  created_by: string
  created_at: string
}

export async function fetchInvoices(status?: string): Promise<Invoice[]> {
  const url = status ? `${API_BASE}/api/finance/invoices?status=${status}` : `${API_BASE}/api/finance/invoices`
  const res = await fetch(url)
  if (!res.ok) throw new Error('請求書の取得に失敗しました')
  return res.json()
}

export async function fetchInvoiceAlerts(): Promise<Invoice[]> {
  const res = await fetch(`${API_BASE}/api/finance/invoices/alerts`)
  if (!res.ok) throw new Error('請求書アラートの取得に失敗しました')
  return res.json()
}

export async function createInvoice(data: {
  client_name: string
  title: string
  amount: number
  issue_date: string
  due_date: string
  notes?: string
}): Promise<Invoice> {
  const res = await fetch(`${API_BASE}/api/finance/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? '請求書の作成に失敗しました')
  }
  return res.json()
}

export async function updateInvoice(
  id: number,
  data: Partial<{
    client_name: string
    title: string
    amount: number
    issue_date: string
    due_date: string
    status: 'draft' | 'sent' | 'paid' | 'overdue'
    notes: string
  }>
): Promise<Invoice> {
  const res = await fetch(`${API_BASE}/api/finance/invoices/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? '請求書の更新に失敗しました')
  }
  return res.json()
}

export async function deleteInvoice(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/finance/invoices/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? '請求書の削除に失敗しました')
  }
}

// ===== 月次予算 =====

export interface Budget {
  id: number
  year_month: string
  category: string
  amount: number
  created_by: string
  created_at: string
}

export interface BudgetVsActual {
  category: string
  budget: number
  actual: number
}

export async function fetchBudgets(yearMonth?: string): Promise<Budget[]> {
  const url = yearMonth ? `${API_BASE}/api/finance/budgets?year_month=${yearMonth}` : `${API_BASE}/api/finance/budgets`
  const res = await fetch(url)
  if (!res.ok) throw new Error('予算の取得に失敗しました')
  return res.json()
}

export async function upsertBudget(data: {
  year_month: string
  category: string
  amount: number
}): Promise<Budget> {
  const res = await fetch(`${API_BASE}/api/finance/budgets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? '予算の保存に失敗しました')
  }
  return res.json()
}

export async function deleteBudget(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/finance/budgets/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('予算の削除に失敗しました')
}

export async function fetchBudgetVsActual(yearMonth?: string): Promise<BudgetVsActual[]> {
  const ym = yearMonth ?? new Date().toISOString().slice(0, 7)
  const res = await fetch(`${API_BASE}/api/finance/budget-vs-actual?year_month=${ym}`)
  if (!res.ok) throw new Error('予算実績の取得に失敗しました')
  return res.json()
}

// ===== 入金見込み =====

export interface IncomeForecast {
  id: number
  client_name: string
  title: string
  amount: number
  expected_date: string
  category: string | null
  probability: number
  status: 'forecast' | 'confirmed' | 'received' | 'cancelled'
  notes: string | null
  created_by: string
  created_at: string
}

export async function fetchIncomeForecasts(status?: string): Promise<IncomeForecast[]> {
  const url = status ? `${API_BASE}/api/finance/income-forecasts?status=${status}` : `${API_BASE}/api/finance/income-forecasts`
  const res = await fetch(url)
  if (!res.ok) throw new Error('入金見込みの取得に失敗しました')
  return res.json()
}

export async function createIncomeForecast(data: {
  client_name: string; title: string; amount: number
  expected_date: string; category?: string
  probability?: number; notes?: string
}): Promise<IncomeForecast> {
  const res = await fetch(`${API_BASE}/api/finance/income-forecasts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? '入金見込みの作成に失敗しました') }
  return res.json()
}

export async function updateIncomeForecast(id: number, data: Partial<{
  client_name: string; title: string; amount: number
  expected_date: string; category: string
  probability: number; status: string; notes: string
}>): Promise<IncomeForecast> {
  const res = await fetch(`${API_BASE}/api/finance/income-forecasts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? '入金見込みの更新に失敗しました') }
  return res.json()
}

export async function deleteIncomeForecast(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/finance/income-forecasts/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('入金見込みの削除に失敗しました')
}

// ===== 月次推移 =====

export interface MonthlyTrend {
  month: string
  income: number
  expense: number
  balance: number | null
  forecast_income: number
}

export async function fetchMonthlyTrend(months?: number, includeForecast?: boolean): Promise<MonthlyTrend[]> {
  const params = new URLSearchParams()
  if (months) params.set('months', String(months))
  if (includeForecast) params.set('include_forecast', 'true')
  const res = await fetch(`${API_BASE}/api/finance/monthly-trend?${params}`)
  if (!res.ok) throw new Error('月次推移の取得に失敗しました')
  return res.json()
}
