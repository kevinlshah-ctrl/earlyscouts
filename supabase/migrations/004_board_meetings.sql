-- ── Board meeting minutes + AI-extracted insights ────────────────────────────
--
-- board_meetings: one row per scraped meeting document
-- board_insights: one row per Claude-extracted insight from a meeting
--
-- Run in Supabase SQL Editor before using scripts/scrape-board-meetings.ts

-- ── board_meetings ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS board_meetings (
  id              SERIAL PRIMARY KEY,
  district_id     TEXT NOT NULL,              -- e.g. "lausd", "smmusd"
  district_name   TEXT NOT NULL,
  meeting_date    DATE,
  title           TEXT,
  source_url      TEXT NOT NULL,
  doc_url         TEXT,                        -- direct PDF/doc link if different
  format          TEXT DEFAULT 'pdf',          -- 'pdf' | 'html'
  raw_text        TEXT,                        -- extracted plain text (may be large)
  processed       BOOLEAN DEFAULT FALSE,
  processed_at    TIMESTAMPTZ,
  scraped_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (district_id, source_url)
);

CREATE INDEX IF NOT EXISTS idx_board_meetings_district ON board_meetings(district_id);
CREATE INDEX IF NOT EXISTS idx_board_meetings_date ON board_meetings(meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_board_meetings_processed ON board_meetings(processed);

-- ── board_insights ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS board_insights (
  id              SERIAL PRIMARY KEY,
  meeting_id      INTEGER REFERENCES board_meetings(id) ON DELETE CASCADE,
  district_id     TEXT NOT NULL,
  school_id       TEXT REFERENCES schools(id) ON DELETE SET NULL,  -- null = district-wide
  school_name     TEXT,                       -- as mentioned in minutes
  category        TEXT NOT NULL,              -- 'construction' | 'budget' | 'programs' | 'staffing' | 'policy' | 'enrollment' | 'safety' | 'other'
  headline        TEXT NOT NULL,              -- one-line summary (≤120 chars)
  detail          TEXT,                       -- 1-3 sentence elaboration
  sentiment       TEXT DEFAULT 'neutral',     -- 'positive' | 'neutral' | 'negative'
  impact_level    TEXT DEFAULT 'low',         -- 'high' | 'medium' | 'low'
  meeting_date    DATE,
  district_name   TEXT,
  source_url      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_board_insights_school ON board_insights(school_id);
CREATE INDEX IF NOT EXISTS idx_board_insights_district ON board_insights(district_id);
CREATE INDEX IF NOT EXISTS idx_board_insights_category ON board_insights(category);
CREATE INDEX IF NOT EXISTS idx_board_insights_date ON board_insights(meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_board_insights_impact ON board_insights(impact_level);
