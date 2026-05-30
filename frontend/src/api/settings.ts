import { API_BASE } from './base'

// ===== カテゴリ =====

export interface Category {
  id: number
  name: string
  type: 'income' | 'expense' | 'both'
  created_at: string
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_BASE}/api/categories`)
  if (!res.ok) throw new Error('カテゴリの取得に失敗しました')
  return res.json()
}

export async function createCategory(data: { name: string; type?: string }): Promise<Category> {
  const res = await fetch(`${API_BASE}/api/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'カテゴリの作成に失敗しました')
  }
  return res.json()
}

export async function deleteCategory(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/categories/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('カテゴリの削除に失敗しました')
}

// ===== プロジェクト =====

export interface Project {
  id: number
  name: string
  is_active: number
  created_at: string
}

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${API_BASE}/api/projects`)
  if (!res.ok) throw new Error('プロジェクトの取得に失敗しました')
  return res.json()
}

export async function createProject(data: { name: string }): Promise<Project> {
  const res = await fetch(`${API_BASE}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'プロジェクトの作成に失敗しました')
  }
  return res.json()
}

export async function deleteProject(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/projects/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('プロジェクトの削除に失敗しました')
}
