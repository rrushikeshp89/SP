-- ============================================
-- PostgreSQL initialization for Tesseract
-- Runs once when the container is first created
-- ============================================

-- Create tables
CREATE TABLE IF NOT EXISTS resumes (
    resume_id       TEXT PRIMARY KEY,
    candidate_name  TEXT NOT NULL,
    email           TEXT,
    phone           TEXT,
    source_format   TEXT,
    raw_text        TEXT,
    parsed_sections JSONB DEFAULT '{}',
    skills          JSONB DEFAULT '[]',
    embedding_vector JSONB,
    status          TEXT NOT NULL DEFAULT 'new',
    notes           TEXT NOT NULL DEFAULT '',
    created_at      TEXT,
    updated_at      TEXT
);

CREATE TABLE IF NOT EXISTS jobs (
    job_id              TEXT PRIMARY KEY,
    title               TEXT NOT NULL,
    company             TEXT,
    description         TEXT,
    required_skills     JSONB DEFAULT '[]',
    experience_years    REAL,
    education           JSONB,
    embedding_vector    JSONB,
    created_at          TEXT,
    updated_at          TEXT
);

-- Performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_resumes_name ON resumes (candidate_name);
CREATE INDEX IF NOT EXISTS idx_resumes_created ON resumes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_title ON jobs (title);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs (created_at DESC);

-- GIN index for skill-based searches
CREATE INDEX IF NOT EXISTS idx_resumes_skills ON resumes USING GIN (skills);
CREATE INDEX IF NOT EXISTS idx_jobs_skills ON jobs USING GIN (required_skills);
CREATE INDEX IF NOT EXISTS idx_resumes_status ON resumes (status);

-- Score history table
CREATE TABLE IF NOT EXISTS score_history (
    id              SERIAL PRIMARY KEY,
    resume_id       TEXT NOT NULL REFERENCES resumes(resume_id) ON DELETE CASCADE,
    job_id          TEXT NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,
    overall_score   REAL NOT NULL,
    breakdown       JSONB NOT NULL DEFAULT '{}',
    matched_skills  JSONB DEFAULT '[]',
    missing_skills  JSONB DEFAULT '[]',
    explanation     TEXT DEFAULT '',
    gap_report      JSONB DEFAULT '[]',
    scored_at       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_score_history_resume ON score_history (resume_id);
CREATE INDEX IF NOT EXISTS idx_score_history_job ON score_history (job_id);
CREATE INDEX IF NOT EXISTS idx_score_history_scored ON score_history (scored_at DESC);

-- Scoring profiles table
CREATE TABLE IF NOT EXISTS scoring_profiles (
    profile_id      TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    description     TEXT DEFAULT '',
    weights         JSONB NOT NULL,
    is_default      BOOLEAN DEFAULT FALSE,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);
