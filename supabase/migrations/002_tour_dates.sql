CREATE TABLE tour_dates (
  id SERIAL PRIMARY KEY,
  school_id TEXT REFERENCES schools(id) ON DELETE CASCADE,
  district_id TEXT,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  date DATE,
  time TEXT,
  end_date DATE,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_note TEXT,
  location TEXT,
  rsvp_required BOOLEAN DEFAULT false,
  rsvp_url TEXT,
  notes TEXT,
  source_url TEXT NOT NULL,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  school_year TEXT
);

CREATE INDEX idx_tour_dates_school ON tour_dates(school_id);
CREATE INDEX idx_tour_dates_date ON tour_dates(date);
CREATE INDEX idx_tour_dates_district ON tour_dates(district_id);
