import { API_BASE } from './base'

export interface MarketNote {
  id: number
  title: string
  content: string
  tags: string[]
  source_url: string | null
  created_by: string
  created_at: string
}

export async function fetchMarketNotes(params?: { tag?: string; q?: string }): Promise<MarketNote[]> {
  const query = new URLSearchParams()
  if (params?.tag) query.set('tag', params.tag)
  if (params?.q) query.set('q', params.q)
  const url = `${API_BASE}/api/market${query.toString() ? `?${query}` : ''}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('市場メモの取得に失敗しました')
  return res.json()
}

export async function createMarketNote(data: {
  title: string
  content: string
  tags?: string[]
  source_url?: string
}): Promise<MarketNote> {
  const res = await fetch(`${API_BASE}/api/market`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? '市場メモの作成に失敗しました')
  }
  return res.json()
}

export async function updateMarketNote(
  id: number,
  data: Partial<{
    title: string
    content: string
    tags: string[]
    source_url: string
  }>
): Promise<MarketNote> {
  const res = await fetch(`${API_BASE}/api/market/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? '市場メモの更新に失敗しました')
  }
  return res.json()
}

export async function deleteMarketNote(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/market/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? '市場メモの削除に失敗しました')
  }
}

export async function fetchMembers(): Promise<{ id: number; name: string; email: string; created_at: string }[]> {
  const res = await fetch(`${API_BASE}/api/members`)
  if (!res.ok) throw new Error('メンバーの取得に失敗しました')
  return res.json()
}

export async function createMember(data: { name: string; email: string }): Promise<{ id: number; name: string; email: string; created_at: string }> {
  const res = await fetch(`${API_BASE}/api/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'メンバーの追加に失敗しました')
  }
  return res.json()
}

export async function deleteMember(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/members/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'メンバーの削除に失敗しました')
  }
}
