-- 012_add_school_helper.sql
-- Idempotent, order-preserving helper to append a school slug to a neighborhood's
-- tier array. Appends only if not already present; existing order is preserved.
-- Tiers: 'elementary' | 'middle' | 'high' | 'private' | 'pipeline'
CREATE OR REPLACE FUNCTION add_school_to_neighborhood(
  p_neighborhood_id text,
  p_tier            text,
  p_slug            text
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  col text := p_tier || '_slugs';
BEGIN
  IF p_tier NOT IN ('elementary','middle','high','private','pipeline') THEN
    RAISE EXCEPTION 'invalid tier %, must be elementary|middle|high|private|pipeline', p_tier;
  END IF;

  -- Append only if not already present (order-preserving, idempotent).
  EXECUTE format(
    'UPDATE neighborhoods
        SET %I = array_append(%I, $1)
      WHERE id = $2
        AND NOT (%I @> ARRAY[$1])',
    col, col, col
  ) USING p_slug, p_neighborhood_id;

  -- Surface a clear error if the neighborhood id does not exist at all.
  -- NOT FOUND is also true when the slug was already present (no row updated);
  -- the EXISTS check distinguishes that harmless no-op from a bad neighborhood id.
  IF NOT FOUND AND NOT EXISTS (SELECT 1 FROM neighborhoods WHERE id = p_neighborhood_id) THEN
    RAISE EXCEPTION 'neighborhood % does not exist', p_neighborhood_id;
  END IF;
END $$;
