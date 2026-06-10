-- 011_discovery.sql
-- Moves the discovery mapping (regions / neighborhoods / scout takes) out of the
-- hardcoded src/data/*.ts files and into Supabase so discovery reads from the DB
-- at request time. The static files remain in the repo as a fallback (see the
-- DISCOVERY_SOURCE flag); this migration only creates + opens read access to the
-- tables. Data is populated by the one-off generator (scripts/_generate-discovery-migration.ts).

CREATE TABLE IF NOT EXISTS regions (
  id           TEXT PRIMARY KEY,        -- e.g. 'westside', 'san-fernando-valley'
  label        TEXT NOT NULL,           -- tab display, e.g. 'San Fernando Valley'
  metro        TEXT NOT NULL DEFAULT 'los-angeles',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS neighborhoods (
  id               TEXT PRIMARY KEY,    -- e.g. 'mar-vista', 'pico-robertson'
  label            TEXT NOT NULL,
  region_id        TEXT NOT NULL REFERENCES regions(id),
  metro            TEXT NOT NULL DEFAULT 'los-angeles',
  districts        TEXT[] NOT NULL DEFAULT '{}',
  elementary_slugs TEXT[] NOT NULL DEFAULT '{}',
  middle_slugs     TEXT[] NOT NULL DEFAULT '{}',
  high_slugs       TEXT[] NOT NULL DEFAULT '{}',
  playbook_slugs   TEXT[] NOT NULL DEFAULT '{}',
  private_slugs    TEXT[] NOT NULL DEFAULT '{}',
  pipeline_slugs   TEXT[] NOT NULL DEFAULT '{}',
  scout_take       JSONB,               -- { title, paragraphs[], pipeline{elementary,middle,high} }; NULL = no chip
  sort_order       INTEGER NOT NULL DEFAULT 0,
  active           BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes to support the request-time loader (filter by metro/active, order by sort_order)
CREATE INDEX IF NOT EXISTS regions_metro_sort_idx       ON regions (metro, sort_order);
CREATE INDEX IF NOT EXISTS neighborhoods_metro_sort_idx ON neighborhoods (metro, region_id, sort_order);

-- RLS: public read-only, matching the existing content tables (e.g. schools)
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE neighborhoods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS regions_public_read ON regions;
DROP POLICY IF EXISTS neighborhoods_public_read ON neighborhoods;
CREATE POLICY regions_public_read       ON regions       FOR SELECT USING (true);
CREATE POLICY neighborhoods_public_read ON neighborhoods FOR SELECT USING (true);
