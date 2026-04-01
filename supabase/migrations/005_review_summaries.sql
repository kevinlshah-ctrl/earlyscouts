-- ── Scraped review text + AI-generated review summaries ──────────────────────
--
-- scraped_reviews: individual review text from GreatSchools / Niche
-- review_summaries: Claude-generated structured summary per school
--
-- Run in Supabase SQL Editor before using scripts/scrape-reviews.ts
-- and scripts/generate-review-summaries.ts

-- ── scraped_reviews ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS scraped_reviews (
  id              SERIAL PRIMARY KEY,
  school_id       TEXT REFERENCES schools(id) ON DELETE CASCADE,
  source          TEXT NOT NULL,           -- 'greatschools' | 'niche'
  reviewer_type   TEXT,                    -- 'parent' | 'student' | 'teacher' | 'community'
  rating          INTEGER,                 -- 1-5 (normalized from any scale)
  review_text     TEXT NOT NULL,
  review_date     TEXT,                    -- ISO date string or year string
  scraped_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_school ON scraped_reviews(school_id);
CREATE INDEX IF NOT EXISTS idx_reviews_source ON scraped_reviews(source);

-- ── review_summaries ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS review_summaries (
  school_id       TEXT PRIMARY KEY REFERENCES schools(id) ON DELETE CASCADE,
  themes          JSONB,                   -- ["Strong math program", "Limited arts funding", ...]
  summary         TEXT,                    -- 2-3 sentence plain-English summary
  positives       JSONB,                   -- ["Engaged teachers", "Strong GATE program"]
  concerns        JSONB,                   -- ["Pickup chaos", "Limited diversity"]
  vibe            TEXT,                    -- single word: "rigorous" | "nurturing" | etc.
  review_count    INTEGER,
  sources         JSONB,                   -- ["greatschools", "niche"]
  generated_at    TIMESTAMPTZ DEFAULT NOW(),
  model_used      TEXT DEFAULT 'claude-sonnet-4-6',
  next_refresh_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days')
);
