-- ── Fix: missing INSERT RLS policy + preferences column (April 2026) ────────────
--
-- QA testing revealed two issues:
--
-- 1. No INSERT policy on user_profiles.
--    RLS was enabled with SELECT + UPDATE policies only.  When the DB trigger
--    (handle_new_user) is absent or hasn't run yet, the client-side defensive
--    upsert in InlineAuth.tsx tries an INSERT as the authenticated user and gets
--    a 400 because no INSERT policy exists.  /api/checkout then can't find the
--    profile row, leaving stripe_customer_id unset and causing a 500.
--
-- 2. `preferences` JSONB column declared in the TypeScript UserProfile type but
--    never added to the table.  Reads return undefined (silently coerced to null
--    by the normaliser), but the schema should match the type.
--
-- This migration is idempotent — safe to run against a DB that already has
-- some of these objects.

-- ── 1. INSERT policy ─────────────────────────────────────────────────────────
-- Allows an authenticated user to insert a row for themselves only.
-- The trigger (SECURITY DEFINER) already bypasses RLS, so this covers the
-- client-side upsert fallback path.

DROP POLICY IF EXISTS "users_insert_own_profile" ON user_profiles;
CREATE POLICY "users_insert_own_profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ── 2. preferences column ─────────────────────────────────────────────────────
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS preferences JSONB;

-- ── 3. Re-assert auto-create trigger (idempotent) ────────────────────────────
-- Ensures the trigger exists even if the DB was provisioned without migration
-- 008 having been applied, or if the trigger was accidentally dropped.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
