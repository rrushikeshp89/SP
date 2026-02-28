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
