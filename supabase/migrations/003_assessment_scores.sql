-- Assessment scores table: state DOE test data (CAASPP, NYSED, STAAR, etc.)

CREATE TABLE assessment_scores (
  id SERIAL PRIMARY KEY,
  school_id TEXT REFERENCES schools(id) ON DELETE CASCADE,
  state TEXT NOT NULL,
  school_year TEXT NOT NULL,             -- "2023-2024"
  subject TEXT NOT NULL,                  -- "math" | "ela" | "science"
  grade_level TEXT NOT NULL,              -- "3" | "4" | "5" | "6" | "7" | "8" | "11" | "all"
  subgroup TEXT NOT NULL DEFAULT 'all',   -- "all" | "white" | "hispanic" | "asian" | "black" |
                                          --  "low_income" | "english_learner" | "special_ed" |
                                          --  "multiracial" | "filipino" | "native_american" | "pacific_islander"

  students_tested INTEGER,
  pct_proficient FLOAT,                   -- percent at or above proficient
  pct_above_standard FLOAT,              -- percent exceeding standard (highest band)
  pct_near_standard FLOAT,
  pct_below_standard FLOAT,
  mean_score FLOAT,                       -- mean scale score if available

  source TEXT,                             -- "CDE CAASPP" | "NYSED" | "TEA STAAR" etc.
  source_url TEXT,
  imported_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: one row per school/year/subject/grade/subgroup combo (enables upsert)
CREATE UNIQUE INDEX idx_assessment_unique
  ON assessment_scores(school_id, school_year, subject, grade_level, subgroup);

CREATE INDEX idx_assessment_school ON assessment_scores(school_id);
CREATE INDEX idx_assessment_year ON assessment_scores(school_year);
CREATE INDEX idx_assessment_subject_grade ON assessment_scores(subject, grade_level);
CREATE INDEX idx_assessment_subgroup ON assessment_scores(subgroup);

-- Add state school ID columns to schools table for CDS/BEDS code matching
ALTER TABLE schools ADD COLUMN IF NOT EXISTS state_school_id TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS state_district_id TEXT;
CREATE INDEX IF NOT EXISTS idx_schools_state_id ON schools(state_school_id);
