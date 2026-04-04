-- Migration 019: Financial Management Tables
-- Expense tracking and settings for PnL reporting

CREATE TABLE IF NOT EXISTS financial_transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('expense')),
  category TEXT NOT NULL CHECK (category IN ('hosting', 'cloud_server', 'ai', 'event', 'operational', 'other')),
  amount_vnd INTEGER NOT NULL,
  description TEXT NOT NULL,
  transaction_date TEXT NOT NULL,
  event_id TEXT REFERENCES community_events(id) ON DELETE SET NULL,
  created_by_admin_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
  updated_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
);

CREATE INDEX IF NOT EXISTS idx_financial_tx_date ON financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_financial_tx_category ON financial_transactions(category);

CREATE TABLE IF NOT EXISTS financial_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  opening_balance_vnd INTEGER NOT NULL DEFAULT 0,
  opening_balance_date TEXT NOT NULL DEFAULT '2026-01-01',
  updated_by_admin_id TEXT,
  updated_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
);

-- Insert default row
INSERT INTO financial_settings (id, opening_balance_vnd, opening_balance_date)
VALUES ('default', 0, '2026-01-01')
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on financial_transactions"
  ON financial_transactions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access on financial_settings"
  ON financial_settings FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
