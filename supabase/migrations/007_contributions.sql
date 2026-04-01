-- ── Parent-contributed reviews, tips, and tour reports ───────────────────────
--
-- user_contributions: reviews, tour reports, tips, data corrections
-- contribution_votes: helpful/upvote tracking
--
-- Run in Supabase SQL Editor before using the community contribution UI.
-- user_id is a client-generated UUID stored in localStorage (anonymous until
-- Supabase Auth is added, at which point it maps to auth.users.id).

-- ── user_contributions ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_contributions (
  id                    SERIAL PRIMARY KEY,
  user_id               TEXT NOT NULL,
  display_name          TEXT NOT NULL DEFAULT 'Anonymous',
  school_id             TEXT REFERENCES schools(id) ON DELETE CASCADE,
  contribution_type     TEXT NOT NULL,  -- "review" | "tour_report" | "tip" | "correction"
  rating                INTEGER,        -- 1–5, reviews only
  title                 TEXT,
  content               TEXT NOT NULL,
  tour_date             DATE,           -- when they visited (tour_report)

  -- Moderation
  status                TEXT NOT NULL DEFAULT 'published',  -- "published" | "flagged" | "removed"
  moderation_note       TEXT,

  -- Engagement
  helpful_count         INTEGER NOT NULL DEFAULT 0,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contributions_school ON user_contributions(school_id);
CREATE INDEX IF NOT EXISTS idx_contributions_type   ON user_contributions(contribution_type);
CREATE INDEX IF NOT EXISTS idx_contributions_user   ON user_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_contributions_status ON user_contributions(status);

-- ── contribution_votes ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contribution_votes (
  user_id          TEXT NOT NULL,
  contribution_id  INTEGER REFERENCES user_contributions(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, contribution_id)
);

-- ── RPC helpers for atomic helpful_count updates ──────────────────────────────

CREATE OR REPLACE FUNCTION increment_helpful_count(contribution_id INTEGER)
RETURNS VOID AS $$
  UPDATE user_contributions SET helpful_count = helpful_count + 1 WHERE id = contribution_id;
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION decrement_helpful_count(contribution_id INTEGER)
RETURNS VOID AS $$
  UPDATE user_contributions SET helpful_count = GREATEST(0, helpful_count - 1) WHERE id = contribution_id;
$$ LANGUAGE SQL;
