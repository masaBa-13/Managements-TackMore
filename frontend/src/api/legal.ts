import { API_BASE } from './base'

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

export async function fetchLegalItems(status?: string): Promise<LegalItem[]> {
  const url = status ? `${API_BASE}/api/legal?status=${status}` : `${API_BASE}/api/legal`
  const res = await fetch(url)
  if (!res.ok) throw new Error('法務項目の取得に失敗しました')
  return res.json()
}

export async function fetchLegalAlerts(): Promise<LegalItem[]> {
  const res = await fetch(`${API_BASE}/api/legal/alerts`)
  if (!res.ok) throw new Error('法務アラートの取得に失敗しました')
  return res.json()
}

export async function createLegalItem(data: {
  title: string
  category: '税務' | '登記' | '補助金' | '契約' | 'その他'
  due_date: string
  notes?: string
}): Promise<LegalItem> {
  const res = await fetch(`${API_BASE}/api/legal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? '法務項目の作成に失敗しました')
  }
  return res.json()
}

export async function updateLegalItem(
  id: number,
  data: Partial<{
    title: string
    category: string
    due_date: string
    status: 'pending' | 'in_progress' | 'done'
    notes: string
  }>
): Promise<LegalItem> {
  const res = await fetch(`${API_BASE}/api/legal/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? '法務項目の更新に失敗しました')
  }
  return res.json()
}

export async function deleteLegalItem(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/legal/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? '法務項目の削除に失敗しました')
  }
}
