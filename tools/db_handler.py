"""
db_handler.py — PostgreSQL Database Handler (Layer 3 Tool)
CRUD operations for resumes and job descriptions in the resume_engine database.
Uses psycopg2 with connection pooling.
"""

import json
from contextlib import contextmanager
from typing import Any, Generator

import psycopg2  # type: ignore[import-untyped]
import psycopg2.pool  # type: ignore[import-untyped]
import psycopg2.extras  # type: ignore[import-untyped]

from app.config import (
    POSTGRES_HOST,
    POSTGRES_PORT,
    POSTGRES_DB,
    POSTGRES_USER,
    POSTGRES_PASSWORD,
)

# ── Connection Pool ──────────────────────────────────

_pool: psycopg2.pool.ThreadedConnectionPool | None = None


def _get_pool() -> psycopg2.pool.ThreadedConnectionPool:
    """Return (or create) a threaded connection pool."""
    global _pool
    if _pool is None or _pool.closed:
        _pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=10,
            host=POSTGRES_HOST,
            port=POSTGRES_PORT,
            dbname=POSTGRES_DB,
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
        )
    return _pool


@contextmanager
def _get_conn() -> Generator:
    """Context manager: get a connection from pool, auto-commit, auto-return."""
    pool = _get_pool()
    conn = pool.getconn()
    try:
        conn.autocommit = True
        yield conn
    finally:
        pool.putconn(conn)


# ── Schema Init ──────────────────────────────────────

def init_tables() -> None:
    """Create tables if they don't exist."""
    with _get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
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
            """)
            cur.execute("""
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
            """)


# ── Resume CRUD ──────────────────────────────────────

def save_resume(data: dict[str, Any]) -> None:
    """Insert a resume record."""
    with _get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO resumes
                    (resume_id, candidate_name, email, phone, source_format,
                     raw_text, parsed_sections, skills, embedding_vector,
                     created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (resume_id) DO UPDATE SET
                    candidate_name = EXCLUDED.candidate_name,
                    email = EXCLUDED.email,
                    phone = EXCLUDED.phone,
                    raw_text = EXCLUDED.raw_text,
                    parsed_sections = EXCLUDED.parsed_sections,
                    skills = EXCLUDED.skills,
                    embedding_vector = EXCLUDED.embedding_vector,
                    updated_at = EXCLUDED.updated_at
                """,
                (
                    data["resume_id"],
                    data["candidate_name"],
                    data.get("email"),
                    data.get("phone"),
                    data.get("source_format"),
                    data.get("raw_text"),
                    json.dumps(data.get("parsed_sections", {})),
                    json.dumps(data.get("skills", [])),
                    json.dumps(data.get("embedding_vector")),
                    data.get("created_at"),
                    data.get("updated_at"),
                ),
            )


def get_resume(resume_id: str) -> dict[str, Any] | None:
    """Fetch a resume by ID. Returns None if not found."""
    with _get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM resumes WHERE resume_id = %s", (resume_id,))
            row = cur.fetchone()
            if row is None:
                return None
            return _deserialize_row(dict(row))


def list_resumes(page: int = 1, per_page: int = 20) -> dict[str, Any]:
    """List resumes with pagination."""
    offset = (page - 1) * per_page
    with _get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT COUNT(*) AS cnt FROM resumes")
            total = cur.fetchone()["cnt"]  # type: ignore[index]

            cur.execute(
                "SELECT * FROM resumes ORDER BY created_at DESC LIMIT %s OFFSET %s",
                (per_page, offset),
            )
            rows = [_deserialize_row(dict(r)) for r in cur.fetchall()]

    return {
        "items": rows,
        "total": total,
        "page": page,
        "per_page": per_page,
    }


# ── Job CRUD ─────────────────────────────────────────

def save_job(data: dict[str, Any]) -> None:
    """Insert a job record."""
    with _get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO jobs
                    (job_id, title, company, description, required_skills,
                     experience_years, education, embedding_vector,
                     created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (job_id) DO UPDATE SET
                    title = EXCLUDED.title,
                    company = EXCLUDED.company,
                    description = EXCLUDED.description,
                    required_skills = EXCLUDED.required_skills,
                    experience_years = EXCLUDED.experience_years,
                    education = EXCLUDED.education,
                    embedding_vector = EXCLUDED.embedding_vector,
                    updated_at = EXCLUDED.updated_at
                """,
                (
                    data["job_id"],
                    data["title"],
                    data.get("company"),
                    data.get("description"),
                    json.dumps(data.get("required_skills", [])),
                    data.get("experience_years"),
                    json.dumps(data.get("education")),
                    json.dumps(data.get("embedding_vector")),
                    data.get("created_at"),
                    data.get("updated_at"),
                ),
            )


def get_job(job_id: str) -> dict[str, Any] | None:
    """Fetch a job by ID. Returns None if not found."""
    with _get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM jobs WHERE job_id = %s", (job_id,))
            row = cur.fetchone()
            if row is None:
                return None
            return _deserialize_row(dict(row))


def list_jobs(page: int = 1, per_page: int = 20) -> dict[str, Any]:
    """List jobs with pagination."""
    offset = (page - 1) * per_page
    with _get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT COUNT(*) AS cnt FROM jobs")
            total = cur.fetchone()["cnt"]  # type: ignore[index]

            cur.execute(
                "SELECT * FROM jobs ORDER BY created_at DESC LIMIT %s OFFSET %s",
                (per_page, offset),
            )
            rows = [_deserialize_row(dict(r)) for r in cur.fetchall()]

    return {
        "items": rows,
        "total": total,
        "page": page,
        "per_page": per_page,
    }


# ── Delete Operations ─────────────────────────────────

def delete_resume(resume_id: str) -> bool:
    """Delete a resume by ID. Returns True if a row was actually deleted."""
    with _get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM resumes WHERE resume_id = %s", (resume_id,))
            return cur.rowcount > 0


def delete_job(job_id: str) -> bool:
    """Delete a job by ID. Returns True if a row was actually deleted."""
    with _get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM jobs WHERE job_id = %s", (job_id,))
            return cur.rowcount > 0


# ── Dashboard Stats ──────────────────────────────────

def get_dashboard_stats() -> dict:
    """Return aggregate counts and per-day activity for the dashboard."""
    with _get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Total counts
            cur.execute("SELECT COUNT(*) AS cnt FROM resumes")
            total_resumes = cur.fetchone()["cnt"]  # type: ignore[index]

            cur.execute("SELECT COUNT(*) AS cnt FROM jobs")
            total_jobs = cur.fetchone()["cnt"]  # type: ignore[index]

            # Per-day resume uploads (last 7 days, keyed by day-of-week)
            cur.execute("""
                SELECT
                    TO_CHAR(created_at::timestamptz, 'Dy') AS day,
                    DATE(created_at::timestamptz)           AS dt,
                    COUNT(*)                                AS cnt
                FROM resumes
                WHERE created_at::timestamptz >= (NOW() - INTERVAL '7 days')
                GROUP BY day, dt
                ORDER BY dt
            """)
            resume_by_day = {row["day"]: int(row["cnt"]) for row in cur.fetchall()}

            # Per-day job creations (last 7 days)
            cur.execute("""
                SELECT
                    TO_CHAR(created_at::timestamptz, 'Dy') AS day,
                    DATE(created_at::timestamptz)           AS dt,
                    COUNT(*)                                AS cnt
                FROM jobs
                WHERE created_at::timestamptz >= (NOW() - INTERVAL '7 days')
                GROUP BY day, dt
                ORDER BY dt
            """)
            jobs_by_day = {row["day"]: int(row["cnt"]) for row in cur.fetchall()}

            # Previous-week resume count (for trend)
            cur.execute("""
                SELECT COUNT(*) AS cnt FROM resumes
                WHERE created_at::timestamptz >= (NOW() - INTERVAL '14 days')
                  AND created_at::timestamptz <  (NOW() - INTERVAL '7 days')
            """)
            prev_week_resumes = cur.fetchone()["cnt"]  # type: ignore[index]

            cur.execute("""
                SELECT COUNT(*) AS cnt FROM resumes
                WHERE created_at::timestamptz >= (NOW() - INTERVAL '7 days')
            """)
            this_week_resumes = cur.fetchone()["cnt"]  # type: ignore[index]

            # Previous-week job count (for trend)
            cur.execute("""
                SELECT COUNT(*) AS cnt FROM jobs
                WHERE created_at::timestamptz >= (NOW() - INTERVAL '14 days')
                  AND created_at::timestamptz <  (NOW() - INTERVAL '7 days')
            """)
            prev_week_jobs = cur.fetchone()["cnt"]  # type: ignore[index]

            cur.execute("""
                SELECT COUNT(*) AS cnt FROM jobs
                WHERE created_at::timestamptz >= (NOW() - INTERVAL '7 days')
            """)
            this_week_jobs = cur.fetchone()["cnt"]  # type: ignore[index]

    return {
        "total_resumes": total_resumes,
        "total_jobs": total_jobs,
        "resume_by_day": resume_by_day,
        "jobs_by_day": jobs_by_day,
        "this_week_resumes": this_week_resumes,
        "prev_week_resumes": prev_week_resumes,
        "this_week_jobs": this_week_jobs,
        "prev_week_jobs": prev_week_jobs,
    }


# ── Helpers ──────────────────────────────────────────

def _deserialize_row(row: dict) -> dict:
    """Parse JSON columns back to Python objects."""
    for key in ("parsed_sections", "skills", "embedding_vector", "required_skills", "education"):
        val = row.get(key)
        if isinstance(val, str):
            try:
                row[key] = json.loads(val)
            except (json.JSONDecodeError, TypeError):
                pass
    return row
