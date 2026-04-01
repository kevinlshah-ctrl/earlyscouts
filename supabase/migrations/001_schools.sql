-- SchoolScout database schema
-- Run this in the Supabase SQL editor at supabase.com

CREATE TABLE IF NOT EXISTS schools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('public', 'charter', 'private', 'magnet')),
  district TEXT,
  state TEXT NOT NULL,
  city TEXT NOT NULL,
  zip TEXT NOT NULL,
  address TEXT,
  lat FLOAT,
  lng FLOAT,
  website TEXT,
  grades TEXT,
  enrollment INTEGER,
  student_teacher_ratio TEXT,

  greatschools_rating INTEGER CHECK (greatschools_rating BETWEEN 1 AND 10),
  niche_grade TEXT,
  state_ranking TEXT,

  math_proficiency INTEGER CHECK (math_proficiency BETWEEN 0 AND 100),
  reading_proficiency INTEGER CHECK (reading_proficiency BETWEEN 0 AND 100),

  demographics JSONB,
  free_reduced_lunch_pct INTEGER,
  title_one BOOLEAN DEFAULT false,

  programs JSONB,

  tuition TEXT,

  sentiment JSONB,

  key_insight TEXT,
  greatschools_url TEXT,
  niche_url TEXT,

  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schools_zip ON schools(zip);
CREATE INDEX IF NOT EXISTS idx_schools_type ON schools(type);
CREATE INDEX IF NOT EXISTS idx_schools_state ON schools(state);
CREATE INDEX IF NOT EXISTS idx_schools_slug ON schools(slug);

-- Maps zip codes to schools
CREATE TABLE IF NOT EXISTS zip_schools (
  zip TEXT NOT NULL,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  distance_miles FLOAT,
  is_zoned BOOLEAN DEFAULT false,
  PRIMARY KEY (zip, school_id)
);

CREATE INDEX IF NOT EXISTS idx_zip_schools_zip ON zip_schools(zip);

-- Tracks scraping status per zip
CREATE TABLE IF NOT EXISTS zip_cache (
  zip TEXT PRIMARY KEY,
  city TEXT,
  state TEXT,
  neighborhood TEXT,
  school_count INTEGER DEFAULT 0,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  stale_after TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- Feeder maps (Phase 2)
CREATE TABLE IF NOT EXISTS feeder_maps (
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  feeds_into TEXT NOT NULL,
  feed_type TEXT DEFAULT 'district',
  confidence TEXT DEFAULT 'high',
  source TEXT,
  PRIMARY KEY (school_id, feeds_into)
);
