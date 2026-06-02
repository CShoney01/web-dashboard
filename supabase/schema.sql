-- ============================================================
-- Dashboard · Single-user schema (no auth, no RLS)
-- ============================================================

-- ── Todos ────────────────────────────────────────────────────
CREATE TABLE todos (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  text       TEXT        NOT NULL,
  done       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Memos ────────────────────────────────────────────────────
CREATE TABLE memos (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Bookmarks ─────────────────────────────────────────────────
CREATE TABLE bookmarks (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT        NOT NULL,
  url        TEXT        NOT NULL UNIQUE,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Stocks (관심종목 + 보유 정보) ──────────────────────────────
CREATE TABLE stocks (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code       TEXT        NOT NULL UNIQUE,  -- 'A005930'
  name       TEXT        NOT NULL,         -- '삼성전자'
  qty        NUMERIC,                      -- NULL = 보유 없음
  avg_price  NUMERIC,                      -- NULL = 보유 없음
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Cryptos (관심코인 + 보유 정보) ────────────────────────────
CREATE TABLE cryptos (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  coin_id    TEXT        NOT NULL UNIQUE,  -- 'bitcoin' (CoinGecko ID)
  name       TEXT        NOT NULL,         -- 'Bitcoin'
  symbol     TEXT        NOT NULL,         -- 'BTC'
  qty        NUMERIC,
  avg_price  NUMERIC,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Budget Expenses (지출 내역) ───────────────────────────────
CREATE TABLE budget_expenses (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  date       DATE        NOT NULL,
  category   TEXT        NOT NULL,  -- '식비' | '교통' | '쇼핑' | ...
  amount     NUMERIC     NOT NULL CHECK (amount > 0),
  memo       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_budget_expenses_date ON budget_expenses (date);

-- ── RSS Feeds ────────────────────────────────────────────────
CREATE TABLE rss_feeds (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  url        TEXT        NOT NULL UNIQUE,
  name       TEXT        NOT NULL,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Widget Settings (API 호출 옵션) ───────────────────────────
-- widget_id 하나당 행 1개. settings 는 위젯별 자유 형식 JSONB.
CREATE TABLE widget_settings (
  widget_id  TEXT        PRIMARY KEY,  -- 'weather' | 'exchange' | 'news' | ...
  settings   JSONB       NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 기본값 삽입 (앱 첫 실행 전 seed)
INSERT INTO widget_settings (widget_id, settings) VALUES
  ('weather',  '{"city": "Seoul"}'),
  ('exchange', '{"base": "USD", "targets": ["KRW", "JPY", "EUR", "CNY"]}'),
  ('news',     '{"query": "최신", "display": 8}');

-- ── updated_at 자동 갱신 트리거 ───────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_todos_updated_at
  BEFORE UPDATE ON todos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_memos_updated_at
  BEFORE UPDATE ON memos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_widget_settings_updated_at
  BEFORE UPDATE ON widget_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
