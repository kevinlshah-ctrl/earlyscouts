-- ── Reddit mentions + AI sentiment summaries ─────────────────────────────────
--
-- reddit_mentions: individual threads/comments mentioning a school
-- reddit_summaries: Claude-generated summary per school
--
-- Run in Supabase SQL Editor before using scripts/scrape-reddit.ts

-- ── reddit_mentions ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reddit_mentions (
  id                 SERIAL PRIMARY KEY,
  school_id          TEXT REFERENCES schools(id) ON DELETE CASCADE,
  reddit_post_id     TEXT UNIQUE NOT NULL,
  subreddit          TEXT NOT NULL,
  post_title         TEXT,
  post_url           TEXT NOT NULL,
  post_text          TEXT,
  post_score         INTEGER,
  comment_count      INTEGER,
  post_created_at    TIMESTAMPTZ,
  relevant_comments  JSONB,              -- [{text, score, author}]
  scraped_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reddit_school     ON reddit_mentions(school_id);
CREATE INDEX IF NOT EXISTS idx_reddit_subreddit  ON reddit_mentions(subreddit);
CREATE INDEX IF NOT EXISTS idx_reddit_post_id    ON reddit_mentions(reddit_post_id);

-- ── reddit_summaries ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reddit_summaries (
  school_id          TEXT PRIMARY KEY REFERENCES schools(id) ON DELETE CASCADE,
  themes             JSONB,              -- ["Amazing GATE program", "Pickup is brutal"]
  summary            TEXT,
  overall_sentiment  TEXT,              -- "positive" | "negative" | "mixed" | "neutral"
  mention_count      INTEGER,
  subreddits_found   JSONB,             -- ["LAParents", "SantaMonica"]
  notable_threads    JSONB,             -- [{title, url, score}]
  generated_at       TIMESTAMPTZ DEFAULT NOW(),
  next_refresh_at    TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days')
);
