# TackMore Ops Dashboard — 実装仕様書

> **このファイルはClaude Codeへの指示書です。**  
> 曖昧な点は自己判断せず、必ずここに書かれた仕様に従ってください。

---

## 0. プロジェクト概要

株式会社TackMoreの経営状態を一画面で把握するための**社内専用ダッシュボード**。  
財務・法務・タスク・市場リサーチの4領域を統合する。

---

## 1. 技術スタック（変更禁止）

| レイヤー | 技術 | バージョン |
|---|---|---|
| ホスティング | Cloudflare Pages | latest |
| API | Cloudflare Workers + **Hono** | hono@latest |
| DB | Cloudflare D1 (SQLite) | — |
| フロントエンド | **React + Vite** | react@18 vite@5 |
| UIコンポーネント | **Tailwind CSS v3 + shadcn/ui** | — |
| グラフ | **Recharts** | recharts@2 |
| 言語 | TypeScript（全ファイル） | ^5 |
| パッケージ管理 | **pnpm** | latest |
| 開発環境OS | Mac Apple Silicon | — |

**ダークモード: 不要。ライトモード固定。**

---

## 2. リポジトリ構成

```
tackmore-dashboard/
├── CLAUDE.md                  ← このファイル
├── pnpm-workspace.yaml
├── package.json               ← ルートのworkspace設定のみ
│
├── frontend/                  ← Cloudflare Pagesにデプロイ
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/               ← APIクライアント関数（fetch wrapper）
│       │   ├── tasks.ts
│       │   ├── finance.ts
│       │   ├── legal.ts
│       │   └── market.ts
│       ├── components/        ← 共通コンポーネント
│       │   ├── Layout.tsx     ← サイドバー + ヘッダー
│       │   ├── Sidebar.tsx
│       │   └── ui/            ← shadcn/uiコンポーネント置き場
│       └── pages/
│           ├── Dashboard.tsx
│           ├── tasks/
│           │   ├── TasksPage.tsx    ← WBSツリービュー（デフォルト）
│           │   ├── KanbanView.tsx
│           │   └── TaskDetail.tsx
│           ├── finance/
│           │   ├── FinancePage.tsx
│           │   ├── FixedExpenses.tsx
│           │   └── CashBalance.tsx
│           ├── legal/
│           │   └── LegalPage.tsx
│           ├── market/
│           │   └── MarketPage.tsx
│           └── settings/
│               └── SettingsPage.tsx
│
├── api/                       ← Cloudflare Workersにデプロイ
│   ├── package.json
│   ├── wrangler.toml
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts           ← Honoアプリのエントリーポイント
│       ├── middleware/
│       │   └── auth.ts        ← CF Accessヘッダー検証
│       ├── routes/
│       │   ├── tasks.ts
│       │   ├── finance.ts
│       │   ├── legal.ts
│       │   └── market.ts
│       ├── cron/
│       │   ├── fixedExpenses.ts   ← 月初固定費自動展開
│       │   └── balanceReminder.ts ← 月末残高リマインダーチェック
│       └── types.ts
│
└── schema/
    └── init.sql               ← D1テーブル定義（このまま実行できる形式で）
```

---

## 3. D1 スキーマ（schema/init.sql）

```sql
-- ===== 財務 =====

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,                          -- YYYY-MM-DD
  type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
  category TEXT NOT NULL,
  amount INTEGER NOT NULL,                     -- 円（整数）
  description TEXT,
  is_fixed INTEGER NOT NULL DEFAULT 0,         -- 1=固定費マスタから自動生成
  fixed_expense_id INTEGER REFERENCES fixed_expenses(id) ON DELETE SET NULL,
  created_by TEXT NOT NULL,                    -- Googleアカウントの表示名
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fixed_expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  amount INTEGER NOT NULL,
  billing_day INTEGER NOT NULL DEFAULT 1,      -- 引き落とし日（月初展開時は1日固定）
  is_active INTEGER NOT NULL DEFAULT 1,
  note TEXT,
  start_month TEXT NOT NULL,                   -- YYYY-MM
  end_month TEXT,                              -- YYYY-MM（NULLなら無期限）
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cash_balances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recorded_month TEXT NOT NULL UNIQUE,         -- YYYY-MM（1ヶ月1レコード）
  balance INTEGER NOT NULL,                    -- 現預金残高（円）
  note TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS balance_reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  remind_day INTEGER NOT NULL DEFAULT 28,
  is_active INTEGER NOT NULL DEFAULT 1,
  message TEXT NOT NULL DEFAULT '今月の残高がまだ入力されていません'
);

-- デフォルトリマインダー設定を1件INSERT
INSERT OR IGNORE INTO balance_reminders (id, remind_day, is_active)
VALUES (1, 28, 1);

-- ===== 法務 =====

CREATE TABLE IF NOT EXISTS legal_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT NOT NULL
    CHECK(category IN ('税務', '登記', '補助金', '契約', 'その他')),
  due_date TEXT NOT NULL,                      -- YYYY-MM-DD
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending', 'in_progress', 'done')),
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ===== タスク（WBS対応） =====

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  -- level: 1=Epic, 2=Task, 3=Subtask
  level INTEGER NOT NULL DEFAULT 1 CHECK(level IN (1, 2, 3)),
  -- order_index: 同じparent_id内での表示順（0始まり）
  order_index INTEGER NOT NULL DEFAULT 0,
  -- wbs_code: 表示用コード。DBには保存せずAPIで動的に計算する
  --   → このカラムは使わない。フロント側でツリーを組んで表示時に算出。
  title TEXT NOT NULL,
  description TEXT,
  project TEXT,                                -- プロジェクト名（自由入力）
  assignee TEXT,                               -- メンバー名（自由入力）
  due_date TEXT,                               -- YYYY-MM-DD
  status TEXT NOT NULL DEFAULT 'todo'
    CHECK(status IN ('todo', 'in_progress', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK(priority IN ('high', 'medium', 'low')),
  -- progress: 子タスクがある場合はAPIが自動計算して返す（保存はしない）
  --   計算式: 直接の子タスクのうちstatus='done'の数 ÷ 直接の子タスクの総数 × 100
  --   子タスクがない場合: status='done'なら100、それ以外は0
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project);

-- ===== 市場リサーチ =====

CREATE TABLE IF NOT EXISTS market_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,                       -- プレーンテキスト
  tags TEXT NOT NULL DEFAULT '[]',             -- JSON配列 例: '["競合","業界動向"]'
  source_url TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ===== メンバー =====

CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## 4. 認証（Cloudflare Access連携）

### 仕組み

Cloudflare AccessがリクエストをWorkersに到達させる前にGoogle認証を行う。  
Workers側では以下のリクエストヘッダーを使って認証情報を取得する。

```
CF-Access-Authenticated-User-Email      → ユーザーのメールアドレス
CF-Access-Authenticated-User-Displayname → ユーザーの表示名（名前）
```

### api/src/middleware/auth.ts の実装方針

```typescript
// 全ルートの前にこのミドルウェアを適用する
// CF-Access-Authenticated-User-Email が存在しない場合は401を返す
// 本番: Cloudflare Accessが保証するので基本的に来ないが念のため
// ローカル開発時: X-Dev-Email / X-Dev-Name ヘッダーで代替する

export const authMiddleware = async (c: Context, next: Next) => {
  const email = c.req.header('CF-Access-Authenticated-User-Email')
    ?? c.req.header('X-Dev-Email')  // ローカル開発用
  const name = c.req.header('CF-Access-Authenticated-User-Displayname')
    ?? c.req.header('X-Dev-Name')   // ローカル開発用
    ?? email  // fallback

  if (!email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  c.set('userEmail', email)
  c.set('userName', name)
  await next()
}
```

### created_by への記録

全てのINSERT時に `c.get('userName')` の値を `created_by` に使う。

---

## 5. CORS設定

```typescript
// api/src/index.ts
import { cors } from 'hono/cors'

app.use('*', cors({
  origin: [
    'http://localhost:5173',              // ローカル開発
    'https://tackmore-dashboard.pages.dev', // 本番（実際のドメインに変更）
  ],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-Dev-Email', 'X-Dev-Name'],
  credentials: true,
}))
```

---

## 6. API エンドポイント定義

ベースURL: `/api`  
全エンドポイントはJSONを返す。エラー時は `{ error: string }` を返す。

---

### 6-1. タスク

#### WBSコード算出ロジック（フロント側で実装）

DBにはwbs_codeを保存しない。フロントがツリーを組んだ後に以下のルールで付番する。

```
- ツリーを order_index 昇順でソートした状態で、上から番号を振る
- Epic（level=1）: 1, 2, 3, ...
- Task（level=2）: 親のコード.1, 親のコード.2, ...
- Subtask（level=3）: 親のコード.1, 親のコード.2, ...
- 削除・並び替え後は常に再採番する（欠番を作らない）
```

例:
```
1       Reme more v1.2リリース        [Epic]
1.1       NFC書き込み機能の改善        [Task]
1.1.1       UIデザイン修正             [Subtask]
1.1.2       エラーハンドリング実装     [Subtask]
1.2       管理画面のバグ修正           [Task]
2       おさかな日和 β版リリース       [Epic]
```

#### 進捗率ロジック（API側で計算してレスポンスに含める）

```
progress =
  子タスクが存在する場合:
    floor( status='done'の直接の子の数 / 直接の子の総数 * 100 )
  子タスクが存在しない場合:
    status='done' → 100
    それ以外      → 0
```

親またぎ移動は**不可**。同一parent_id内での並び替えのみ。

#### エンドポイント一覧

```
GET    /api/tasks
  → 全タスクをフラットなリストで返す（ツリー組み立てはフロント側）
  Query:
    ?project=string    プロジェクト名でフィルタ（任意）
    ?status=string     ステータスでフィルタ（任意）
  Response: Task[]     ※progressフィールドをAPIで計算して含める

GET    /api/tasks/:id
  → 1件取得（progressを含む）
  Response: Task

POST   /api/tasks
  Body: {
    parent_id?: number   // 省略でEpic（level=1）
    title: string        // 必須
    description?: string
    project?: string
    assignee?: string
    due_date?: string    // YYYY-MM-DD
    priority?: 'high' | 'medium' | 'low'  // デフォルト: 'medium'
  }
  処理:
    - parent_idがある場合、親のlevelに+1してlevelを自動設定
    - order_indexは同一parent_id内の最後尾に自動設定
  Response: Task（作成したもの）

PATCH  /api/tasks/:id
  Body: {
    title?: string
    description?: string
    project?: string
    assignee?: string
    due_date?: string
    status?: 'todo' | 'in_progress' | 'done'
    priority?: 'high' | 'medium' | 'low'
  }
  処理:
    - updated_at を現在時刻で更新
    - ステータス変更時、進捗率はAPIが自動計算（保存しない）
  Response: Task（更新後）

DELETE /api/tasks/:id
  処理:
    - ON DELETE CASCADEで子タスクも全削除
  Response: { success: true }

PATCH  /api/tasks/:id/reorder
  同一parent_id内での並び替え
  Body: { order_index: number }
  処理:
    - 同一parent_id内の他タスクのorder_indexを自動調整
  Response: Task[]（同一parent_id内の全タスク、order_index順）
```

---

### 6-2. 財務

```
GET    /api/finance/transactions
  Query:
    ?year_month=YYYY-MM   対象月（省略で当月）
  Response: Transaction[]

POST   /api/finance/transactions
  Body: {
    date: string          // YYYY-MM-DD 必須
    type: 'income' | 'expense'  // 必須
    category: string      // 必須
    amount: number        // 必須、正の整数
    description?: string
  }
  Response: Transaction

PATCH  /api/finance/transactions/:id
  Body: 上記と同様（全フィールド任意）
  Response: Transaction

DELETE /api/finance/transactions/:id
  制約: is_fixed=1 のレコードは削除不可（400を返す）
  Response: { success: true }

GET    /api/finance/fixed-expenses
  Response: FixedExpense[]（is_active順、name昇順）

POST   /api/finance/fixed-expenses
  Body: {
    name: string          // 必須
    category: string      // 必須
    amount: number        // 必須
    billing_day?: number  // デフォルト1
    note?: string
    start_month: string   // YYYY-MM 必須
    end_month?: string    // YYYY-MM
  }
  Response: FixedExpense

PATCH  /api/finance/fixed-expenses/:id
  Body: 上記と同様（全フィールド任意）
  Response: FixedExpense

DELETE /api/finance/fixed-expenses/:id
  処理: is_active=0 に更新（論理削除。過去の履歴を保持するため）
  Response: { success: true }

GET    /api/finance/cash-balances
  Response: CashBalance[]（recorded_month降順）

POST   /api/finance/cash-balances
  Body: {
    recorded_month: string  // YYYY-MM 必須
    balance: number         // 必須
    note?: string
  }
  処理: 同月が既存の場合はUPSERT（上書き）
  Response: CashBalance

GET    /api/finance/summary
  当月サマリーをまとめて返す
  Response: {
    current_month: string           // YYYY-MM
    income_total: number            // 当月収入合計
    expense_total: number           // 当月支出合計
    fixed_expense_total: number     // 有効な固定費の月合計
    latest_balance: number | null   // 最新の現預金残高
    latest_balance_month: string | null
    runway_months: number | null    // 残高 ÷ 固定費合計（小数点以下切り捨て）
    balance_reminder_needed: boolean // 当月のcash_balancesが未入力かどうか
  }

GET    /api/finance/reminder-setting
  Response: BalanceReminder（id=1のレコード）

PATCH  /api/finance/reminder-setting
  Body: { remind_day?: number, is_active?: boolean, message?: string }
  Response: BalanceReminder
```

---

### 6-3. 法務

```
GET    /api/legal
  Query:
    ?status=string     フィルタ（任意）
  Response: LegalItem[]（due_date昇順）

POST   /api/legal
  Body: {
    title: string      // 必須
    category: '税務' | '登記' | '補助金' | '契約' | 'その他'  // 必須
    due_date: string   // YYYY-MM-DD 必須
    notes?: string
  }
  Response: LegalItem

PATCH  /api/legal/:id
  Body: 上記と同様（全フィールド任意）+ status
  Response: LegalItem

DELETE /api/legal/:id
  Response: { success: true }

GET    /api/legal/alerts
  直近30日以内のdue_dateかつstatus != 'done' を返す
  Response: LegalItem[]（due_date昇順）
```

---

### 6-4. 市場リサーチ

```
GET    /api/market
  Query:
    ?tag=string        タグでフィルタ（任意）
    ?q=string          タイトル・本文の部分一致検索（任意）
  Response: MarketNote[]（created_at降順）

POST   /api/market
  Body: {
    title: string      // 必須
    content: string    // 必須
    tags?: string[]    // デフォルト []
    source_url?: string
  }
  Response: MarketNote

PATCH  /api/market/:id
  Body: 上記と同様（全フィールド任意）
  Response: MarketNote

DELETE /api/market/:id
  Response: { success: true }
```

---

### 6-5. メンバー

```
GET    /api/members
  Response: Member[]（name昇順）

POST   /api/members
  Body: { name: string, email: string }
  処理: email重複時は409を返す
  Response: Member

DELETE /api/members/:id
  Response: { success: true }
```

---

## 7. Cronジョブ仕様

### 7-1. 固定費の月次自動展開

実行タイミング: **毎月1日 00:00 UTC（JST 09:00）**

```typescript
// cron/fixedExpenses.ts
// 処理フロー:
// 1. 当月（YYYY-MM）を取得
// 2. fixed_expenses WHERE is_active=1 AND start_month <= 当月
//      AND (end_month IS NULL OR end_month >= 当月) を全取得
// 3. 各レコードについて、
//    transactions WHERE is_fixed=1 AND fixed_expense_id=id
//      AND date LIKE '当月%' が存在しないか確認
// 4. 存在しなければ以下でINSERT:
//    date = 当月-01（例: 2026-06-01）
//    type = 'expense'
//    category = fixed_expense.category
//    amount = fixed_expense.amount
//    description = fixed_expense.name
//    is_fixed = 1
//    fixed_expense_id = fixed_expense.id
//    created_by = 'system'
// 5. 展開した件数をconsole.logで記録
```

### 7-2. 残高入力リマインダー

実行タイミング: **毎日 00:00 UTC（JST 09:00）**

```typescript
// cron/balanceReminder.ts
// 処理フロー:
// 1. balance_reminders WHERE id=1 AND is_active=1 を取得
// 2. 今日が remind_day 以上かつ当月末日以内かチェック
// 3. cash_balances WHERE recorded_month = 当月 が存在するか確認
// 4. 存在しない場合、Workers KV か D1 に
//    reminder_needed_YYYY-MM = true を記録
//    （フロントは /api/finance/summary の balance_reminder_needed で取得）
```

---

## 8. フロントエンド実装仕様

### 8-1. 画面一覧とルーティング

React Router v6 を使用。

```
/                   → Dashboard.tsx（サマリー）
/tasks              → TasksPage.tsx（WBSツリー、デフォルト）
/tasks/kanban       → KanbanView.tsx
/finance            → FinancePage.tsx
/finance/fixed      → FixedExpenses.tsx
/legal              → LegalPage.tsx
/market             → MarketPage.tsx
/settings           → SettingsPage.tsx
```

### 8-2. ダッシュボード（/）

以下の4ウィジェットを2×2グリッドで表示（スマホは1列）。

| ウィジェット | データソース | 内容 |
|---|---|---|
| 💰 キャッシュサマリー | GET /api/finance/summary | 残高・今月収支・ランウェイ・残高未入力バナー |
| ⚠️ 期日アラート | GET /api/legal/alerts | 直近30日以内の期日一覧 |
| ✅ タスク進捗 | GET /api/tasks | 全タスクの完了率・期限超過タスク数 |
| 📰 市場メモ | GET /api/market | 最新3件のタイトルと日付 |

残高未入力バナー:  
`balance_reminder_needed=true` のとき、ダッシュボード最上部に赤いバナーを表示。  
「今月の残高がまだ入力されていません　[入力する →]」ボタンで `/finance` に遷移。

### 8-3. タスク管理（/tasks）

デフォルト表示: **WBSツリービュー**  
ビュー切替ボタン: 「ツリー」「カンバン」

**WBSツリービュー**:
- APIから全タスクを取得し、フロント側でツリーを組む
- `parent_id` でネスト、`order_index` 昇順でソート
- WBSコードはフロント側で動的に算出（DBには保存しない）
- 各行: `[WBSコード] [タイトル] [担当] [期日] [優先度] [ステータス] [進捗バー]`
- Epicは背景色を変えて区別
- 展開・折りたたみ可能（Epicレベルのみ）
- 並び替え: 同一parent_id内でドラッグ&ドロップ → `PATCH /api/tasks/:id/reorder`
- 親またぎの移動は**実装しない**

**カンバンビュー（/tasks/kanban）**:
- 列: 「未着手」「進行中」「完了」
- level=3（Subtask）のみ表示
- ドラッグ&ドロップでステータス変更

### 8-4. 財務管理（/finance）

タブ: 「収支」「固定費」「残高」

**収支タブ**:
- 月選択（デフォルト当月）
- 月次収支グラフ（Recharts棒グラフ、収入=青・支出=赤）
- カテゴリ別費用の円グラフ（Recharts）
- トランザクション一覧テーブル
- 固定費（is_fixed=1）は行を薄いグレーで表示し削除ボタンを非表示

**固定費タブ（/finance/fixed）**:
- 固定費マスタの一覧・登録・編集・削除
- 削除は論理削除（is_active=0）
- 月額合計を表示

**残高タブ**:
- 月次残高の入力フォーム（月選択 + 金額入力）
- 過去の残高推移グラフ（Recharts折れ線グラフ）
- ランウェイ計算の内訳表示

### 8-5. 法務管理（/legal）

- リスト表示（due_date昇順）
- ステータス別に色分け（pending=黄, in_progress=青, done=緑）
- 期限30日以内: オレンジ強調
- 期限7日以内: 赤強調
- 期限切れ（past due）: 赤背景

### 8-6. 市場リサーチ（/market）

- タイムライン形式（created_at降順）
- タグフィルタ（複数選択可）
- タイトル・本文の全文検索（クライアント側フィルタでOK）

### 8-7. 設定（/settings）

- メンバー一覧・追加・削除
- 残高リマインダーの通知日設定（1〜28日）

---

## 9. wrangler.toml

```toml
name = "tackmore-dashboard-api"
main = "src/index.ts"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "tackmore-dashboard"
database_id = "REPLACE_WITH_ACTUAL_D1_ID"

[triggers]
crons = [
  "0 0 1 * *",   # 毎月1日 00:00 UTC（JST 09:00）固定費自動展開
  "0 0 * * *"    # 毎日 00:00 UTC（JST 09:00）残高リマインダーチェック
]
```

---

## 10. ローカル開発手順（Mac Apple Silicon）

```bash
# 前提: Node.js 20+, pnpm がインストール済み

# 1. セットアップ
git clone <repo>
cd tackmore-dashboard
pnpm install

# 2. D1をローカルに作成してスキーマ適用
cd api
pnpm wrangler d1 create tackmore-dashboard
# → wrangler.toml の database_id を書き換える
pnpm wrangler d1 execute tackmore-dashboard --local --file=../schema/init.sql

# 3. API起動（別ターミナル）
cd api
pnpm wrangler dev
# → http://localhost:8787 で起動

# 4. フロントエンド起動（別ターミナル）
cd frontend
pnpm dev
# → http://localhost:5173 で起動

# 5. ローカル開発時の認証
# APIリクエストのヘッダーに以下を付与する（vite.config.ts のproxyで設定）
#   X-Dev-Email: your@email.com
#   X-Dev-Name: あなたの名前
```

### vite.config.ts のプロキシ設定

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        headers: {
          'X-Dev-Email': 'dev@tackmore.com',
          'X-Dev-Name': '開発者',
        },
      },
    },
  },
})
```

---

## 11. 実装順序（この順番で実装すること）

```
Phase 1（骨格）:
  1. pnpm workspace セットアップ
  2. schema/init.sql 作成・D1適用
  3. api/: Hono + authMiddleware + CORS + 全ルートのスタブ（200返すだけ）
  4. frontend/: Vite + React Router + Layout（サイドバー + ヘッダー）
  5. ダッシュボード画面（モックデータで表示確認）

Phase 2（タスク機能）:
  6. api/routes/tasks.ts 全エンドポイント実装
  7. frontend/pages/tasks/ WBSツリービュー + カンバンビュー

Phase 3（財務機能）:
  8. api/routes/finance.ts 全エンドポイント実装
  9. api/cron/fixedExpenses.ts
  10. frontend/pages/finance/ 収支・固定費・残高タブ

Phase 4（法務・市場・設定）:
  11. api/routes/legal.ts + frontend/pages/legal/
  12. api/routes/market.ts + frontend/pages/market/
  13. frontend/pages/settings/

Phase 5（仕上げ）:
  14. ダッシュボードを実データで接続
  15. api/cron/balanceReminder.ts
  16. レスポンシブ対応（スマホ375px〜）
  17. Cloudflare Pages + Workers デプロイ設定
```

---

## 12. 実装時の禁止事項・注意事項

- `wbs_code` カラムはDBに保存しない。フロントで動的計算する。
- `progress` カラムはDBに保存しない。APIレスポンス時に毎回計算して返す。
- 固定費（is_fixed=1）のtransactionは画面から削除不可にする。
- 親またぎのタスク移動UIは実装しない。
- タスク削除時は子タスクも全削除される（CASCADE）ため、削除前に確認ダイアログを表示する。
- 全テキストは日本語で表示する（ボタン・ラベル・エラーメッセージ含む）。
- ダークモードは実装しない。
- shadcn/uiを使う際は `pnpm dlx shadcn@latest add <component>` で追加する。
```
