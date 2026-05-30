export interface Task {
  id: number
  parent_id: number | null
  level: 1 | 2 | 3
  order_index: number
  title: string
  description: string | null
  project: string | null
  assignee: string | null
  due_date: string | null
  status: 'todo' | 'in_progress' | 'done'
  priority: 'high' | 'medium' | 'low'
  progress: number
  created_by: string
  created_at: string
  updated_at: string
}

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

export interface BalanceReminder {
  id: number
  remind_day: number
  is_active: number
  message: string
}

export interface LegalItem {
  id: number
  title: string
  category: '税務' | '登記' | '補助金' | '契約' | 'その他'
  due_date: string
  status: 'pending' | 'in_progress' | 'done'
  notes: string | null
  created_by: string
  created_at: string
}

export interface MarketNote {
  id: number
  title: string
  content: string
  tags: string[]
  source_url: string | null
  created_by: string
  created_at: string
}

export interface Member {
  id: number
  name: string
  email: string
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

export type Bindings = {
  DB: D1Database
  BYPASS_AUTH?: string
}

export type Variables = {
  userEmail: string
  userName: string
}
