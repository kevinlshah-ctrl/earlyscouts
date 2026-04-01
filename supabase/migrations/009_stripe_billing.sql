-- ── Stripe billing fields ───────────────────────────────────────────────────
-- Added after 008_user_profiles.sql.
-- access_expires_at  : when the Premium 3-day window closes
-- subscription_status: tracks the Stripe subscription lifecycle for Extended

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS access_expires_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_status  TEXT
    CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled'));

-- Service role can write these columns from webhook handler
-- (user RLS SELECT/UPDATE policies already cover reads from the client)
