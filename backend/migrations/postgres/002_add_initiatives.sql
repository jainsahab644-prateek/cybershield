CREATE TABLE initiatives (
  id BIGSERIAL PRIMARY KEY,
  public_initiative_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL,
  description TEXT NOT NULL,
  organizer_name TEXT NOT NULL,
  official_source_url TEXT,
  category TEXT NOT NULL CHECK (category IN ('awareness','workshop','training','public_campaign','cyber_safety','other')),
  start_date DATE NOT NULL,
  end_date DATE,
  audience TEXT NOT NULL,
  objectives TEXT NOT NULL,
  participation TEXT NOT NULL,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_demo BOOLEAN NOT NULL DEFAULT TRUE,
  source_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CHECK (end_date IS NULL OR end_date >= start_date)
);
CREATE INDEX idx_initiatives_public_visibility ON initiatives(is_active,is_featured,start_date,end_date);
CREATE INDEX idx_initiatives_category ON initiatives(category);
