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
  type TEXT NOT NULL DEFAULT 'expense'
    CHECK(type IN ('income', 'expense')),      -- 定期収入 or 定期支出
  category TEXT NOT NULL,
  amount INTEGER NOT NULL,
  billing_day INTEGER NOT NULL DEFAULT 1,      -- 引き落とし日/入金日
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

-- ===== 請求書 =====

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_name TEXT NOT NULL,                   -- 請求先名
  title TEXT NOT NULL,                         -- 件名
  amount INTEGER NOT NULL,                     -- 請求金額（円）
  issue_date TEXT NOT NULL,                    -- 発行日 YYYY-MM-DD
  due_date TEXT NOT NULL,                      -- 支払期日 YYYY-MM-DD
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft', 'sent', 'paid', 'overdue')),
  sent_at TEXT,                                -- 送付日時
  paid_at TEXT,                                -- 入金確認日時
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- ===== 月次予算 =====

CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year_month TEXT NOT NULL,                    -- YYYY-MM
  category TEXT NOT NULL,
  amount INTEGER NOT NULL,                     -- 予算金額（円）
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(year_month, category)
);

-- ===== カテゴリ =====

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'expense'
    CHECK(type IN ('income', 'expense', 'both')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ===== プロジェクト =====

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ===== 入金見込み =====

CREATE TABLE IF NOT EXISTS income_forecasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_name TEXT NOT NULL,
  title TEXT NOT NULL,
  amount INTEGER NOT NULL,
  expected_date TEXT NOT NULL,             -- YYYY-MM-DD
  category TEXT,
  probability INTEGER NOT NULL DEFAULT 100, -- 確度 (%)
  status TEXT NOT NULL DEFAULT 'forecast'
    CHECK(status IN ('forecast', 'confirmed', 'received', 'cancelled')),
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_income_forecasts_date ON income_forecasts(expected_date);
CREATE INDEX IF NOT EXISTS idx_income_forecasts_status ON income_forecasts(status);

-- ===== メンバー =====

CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
