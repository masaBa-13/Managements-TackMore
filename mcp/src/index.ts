#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const API_BASE = process.env.TACKMORE_API_URL ?? 'http://localhost:8787'
const DEV_EMAIL = process.env.TACKMORE_DEV_EMAIL ?? 'dev@tackmore.com'
const DEV_NAME = process.env.TACKMORE_DEV_NAME ?? 'Claude'

async function api(path: string, method = 'GET', body?: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Dev-Email': DEV_EMAIL,
      'X-Dev-Name': DEV_NAME,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`API ${method} ${path} failed (${res.status}): ${err}`)
  }
  return res.json()
}

const server = new McpServer({
  name: 'tackmore',
  version: '1.0.0',
})

// ===== 財務：取引 =====

server.tool(
  'list_transactions',
  '収支一覧を取得する（月指定可）',
  {
    year_month: z.string().optional().describe('対象月 YYYY-MM（省略で当月）'),
  },
  async ({ year_month }) => {
    const q = year_month ? `?year_month=${year_month}` : ''
    const data = await api(`/api/finance/transactions${q}`)
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    }
  }
)

server.tool(
  'add_expense',
  '経費（支出）を記録する',
  {
    date: z.string().describe('日付 YYYY-MM-DD'),
    category: z.string().describe('カテゴリ（例: 交通費, 消耗品費, 広告費）'),
    amount: z.number().int().positive().describe('金額（円）'),
    description: z.string().optional().describe('摘要'),
  },
  async ({ date, category, amount, description }) => {
    const data = await api('/api/finance/transactions', 'POST', {
      date,
      type: 'expense',
      category,
      amount,
      description,
    })
    return {
      content: [{ type: 'text', text: `✅ 経費を記録しました\n${JSON.stringify(data, null, 2)}` }],
    }
  }
)

server.tool(
  'add_income',
  '収入を記録する',
  {
    date: z.string().describe('日付 YYYY-MM-DD'),
    category: z.string().describe('カテゴリ（例: 売上, 補助金, その他）'),
    amount: z.number().int().positive().describe('金額（円）'),
    description: z.string().optional().describe('摘要'),
  },
  async ({ date, category, amount, description }) => {
    const data = await api('/api/finance/transactions', 'POST', {
      date,
      type: 'income',
      category,
      amount,
      description,
    })
    return {
      content: [{ type: 'text', text: `✅ 収入を記録しました\n${JSON.stringify(data, null, 2)}` }],
    }
  }
)

server.tool(
  'get_finance_summary',
  '当月の財務サマリーを取得する（残高・収支合計・ランウェイ）',
  {},
  async () => {
    const data = await api('/api/finance/summary')
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    }
  }
)

server.tool(
  'update_cash_balance',
  '現預金残高を記録・更新する',
  {
    recorded_month: z.string().describe('対象月 YYYY-MM'),
    balance: z.number().int().describe('残高（円）'),
    note: z.string().optional().describe('メモ'),
  },
  async ({ recorded_month, balance, note }) => {
    const data = await api('/api/finance/cash-balances', 'POST', { recorded_month, balance, note })
    return {
      content: [{ type: 'text', text: `✅ 残高を記録しました\n${JSON.stringify(data, null, 2)}` }],
    }
  }
)

// ===== 財務：固定費 =====

server.tool(
  'list_fixed_expenses',
  '固定費マスタ一覧を取得する',
  {},
  async () => {
    const data = await api('/api/finance/fixed-expenses')
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    }
  }
)

server.tool(
  'add_fixed_expense',
  '固定費マスタに追加する',
  {
    name: z.string().describe('固定費名（例: 家賃, AWS, サーバー代）'),
    category: z.string().describe('カテゴリ'),
    amount: z.number().int().positive().describe('月額（円）'),
    start_month: z.string().describe('開始月 YYYY-MM'),
    end_month: z.string().optional().describe('終了月 YYYY-MM（省略で無期限）'),
    note: z.string().optional().describe('メモ'),
  },
  async (args) => {
    const data = await api('/api/finance/fixed-expenses', 'POST', args)
    return {
      content: [{ type: 'text', text: `✅ 固定費を追加しました\n${JSON.stringify(data, null, 2)}` }],
    }
  }
)

// ===== タスク =====

server.tool(
  'list_tasks',
  'タスク一覧を取得する',
  {
    project: z.string().optional().describe('プロジェクト名でフィルタ'),
    status: z.enum(['todo', 'in_progress', 'done']).optional().describe('ステータスでフィルタ'),
  },
  async ({ project, status }) => {
    const params = new URLSearchParams()
    if (project) params.set('project', project)
    if (status) params.set('status', status)
    const q = params.toString() ? `?${params}` : ''
    const data = await api(`/api/tasks${q}`)
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    }
  }
)

server.tool(
  'add_task',
  'タスクを追加する（Epic/Task/Subtask）',
  {
    title: z.string().describe('タスクタイトル'),
    parent_id: z.number().int().optional().describe('親タスクID（省略でEpic）'),
    project: z.string().optional().describe('プロジェクト名'),
    assignee: z.string().optional().describe('担当者名'),
    due_date: z.string().optional().describe('期日 YYYY-MM-DD'),
    priority: z.enum(['high', 'medium', 'low']).optional().describe('優先度（デフォルト: medium）'),
    description: z.string().optional().describe('説明'),
  },
  async (args) => {
    const data = await api('/api/tasks', 'POST', args)
    return {
      content: [{ type: 'text', text: `✅ タスクを追加しました\n${JSON.stringify(data, null, 2)}` }],
    }
  }
)

server.tool(
  'update_task_status',
  'タスクのステータスを更新する',
  {
    id: z.number().int().describe('タスクID'),
    status: z.enum(['todo', 'in_progress', 'done']).describe('新しいステータス'),
  },
  async ({ id, status }) => {
    const data = await api(`/api/tasks/${id}`, 'PATCH', { status })
    return {
      content: [{ type: 'text', text: `✅ ステータスを更新しました\n${JSON.stringify(data, null, 2)}` }],
    }
  }
)

// ===== 法務 =====

server.tool(
  'list_legal_items',
  '法務タスク一覧を取得する',
  {
    status: z.enum(['pending', 'in_progress', 'done']).optional().describe('ステータスフィルタ'),
  },
  async ({ status }) => {
    const q = status ? `?status=${status}` : ''
    const data = await api(`/api/legal${q}`)
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    }
  }
)

server.tool(
  'add_legal_item',
  '法務タスクを追加する（税務・登記・補助金・契約など）',
  {
    title: z.string().describe('タイトル'),
    category: z.enum(['税務', '登記', '補助金', '契約', 'その他']).describe('カテゴリ'),
    due_date: z.string().describe('期日 YYYY-MM-DD'),
    notes: z.string().optional().describe('メモ'),
  },
  async (args) => {
    const data = await api('/api/legal', 'POST', args)
    return {
      content: [{ type: 'text', text: `✅ 法務タスクを追加しました\n${JSON.stringify(data, null, 2)}` }],
    }
  }
)

server.tool(
  'get_legal_alerts',
  '直近30日以内に期日が迫っている法務タスクを取得する',
  {},
  async () => {
    const data = await api('/api/legal/alerts')
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    }
  }
)

// ===== 市場リサーチ =====

server.tool(
  'list_market_notes',
  '市場リサーチメモ一覧を取得する',
  {
    tag: z.string().optional().describe('タグでフィルタ'),
    q: z.string().optional().describe('キーワード検索'),
  },
  async ({ tag, q }) => {
    const params = new URLSearchParams()
    if (tag) params.set('tag', tag)
    if (q) params.set('q', q)
    const qs = params.toString() ? `?${params}` : ''
    const data = await api(`/api/market${qs}`)
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    }
  }
)

server.tool(
  'add_market_note',
  '市場リサーチメモを追加する',
  {
    title: z.string().describe('タイトル'),
    content: z.string().describe('本文'),
    tags: z.array(z.string()).optional().describe('タグ（例: ["競合", "業界動向"]）'),
    source_url: z.string().optional().describe('情報元URL'),
  },
  async (args) => {
    const data = await api('/api/market', 'POST', args)
    return {
      content: [{ type: 'text', text: `✅ メモを追加しました\n${JSON.stringify(data, null, 2)}` }],
    }
  }
)

// ===== メンバー =====

server.tool(
  'list_members',
  'メンバー一覧を取得する',
  {},
  async () => {
    const data = await api('/api/members')
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    }
  }
)

server.tool(
  'add_member',
  'メンバーを追加する',
  {
    name: z.string().describe('名前'),
    email: z.string().email().describe('メールアドレス'),
  },
  async (args) => {
    const data = await api('/api/members', 'POST', args)
    return {
      content: [{ type: 'text', text: `✅ メンバーを追加しました\n${JSON.stringify(data, null, 2)}` }],
    }
  }
)

// サーバー起動
const transport = new StdioServerTransport()
await server.connect(transport)
