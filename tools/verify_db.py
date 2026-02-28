"""
verify_db.py — PostgreSQL Handshake Script
Phase 2 (Link): Verifies DB connectivity, creates the resume_engine database
if it doesn't exist, and confirms readiness.

Exit codes:
  0 = All checks passed
  1 = Connection failed
"""

import sys
import os
from pathlib import Path

# Load .env from project root
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

import psycopg2
from psycopg2 import sql


def get_connection_params(dbname: str | None = None) -> dict:
    return {
        "host": os.getenv("POSTGRES_HOST", "localhost"),
        "port": int(os.getenv("POSTGRES_PORT", "5432")),
        "user": os.getenv("POSTGRES_USER", "postgres"),
        "password": os.getenv("POSTGRES_PASSWORD", "postgres"),
        "dbname": dbname or "postgres",
    }


def check_connectivity() -> bool:
    """Test basic PostgreSQL connectivity."""
    print("[1/4] Testing PostgreSQL connectivity...", end=" ")
    try:
        conn = psycopg2.connect(**get_connection_params())
        conn.close()
        print("OK")
        return True
    except psycopg2.OperationalError as e:
        print(f"FAILED\n  Error: {e}")
        return False


def check_version() -> str | None:
    """Retrieve PostgreSQL server version."""
    print("[2/4] Checking PostgreSQL version...", end=" ")
    try:
        conn = psycopg2.connect(**get_connection_params())
        cur = conn.cursor()
        cur.execute("SELECT version();")
        version = cur.fetchone()[0]
        cur.close()
        conn.close()
        print(f"OK → {version.split(',')[0]}")
        return version
    except Exception as e:
        print(f"FAILED\n  Error: {e}")
        return None


def ensure_database() -> bool:
    """Create the resume_engine database if it doesn't exist."""
    db_name = os.getenv("POSTGRES_DB", "resume_engine")
    print(f"[3/4] Ensuring database '{db_name}' exists...", end=" ")
    try:
        conn = psycopg2.connect(**get_connection_params())
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s;", (db_name,)
        )
        exists = cur.fetchone()
        if not exists:
            cur.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(db_name)))
            print(f"CREATED")
        else:
            print("EXISTS")
        cur.close()
        conn.close()
        return True
    except Exception as e:
        print(f"FAILED\n  Error: {e}")
        return False


def verify_db_connection() -> bool:
    """Connect to the actual resume_engine database."""
    db_name = os.getenv("POSTGRES_DB", "resume_engine")
    print(f"[4/4] Connecting to '{db_name}' database...", end=" ")
    try:
        conn = psycopg2.connect(**get_connection_params(db_name))
        cur = conn.cursor()
        cur.execute("SELECT current_database(), current_user;")
        db, user = cur.fetchone()
        cur.close()
        conn.close()
        print(f"OK → db={db}, user={user}")
        return True
    except Exception as e:
        print(f"FAILED\n  Error: {e}")
        return False


def main() -> int:
    print("=" * 55)
    print("  PostgreSQL Handshake — verify_db.py")
    print("=" * 55)

    results = [
        check_connectivity(),
        check_version() is not None,
        ensure_database(),
        verify_db_connection(),
    ]

    print("-" * 55)
    passed = sum(results)
    total = len(results)
    status = "PASS" if all(results) else "FAIL"
    print(f"Result: {passed}/{total} checks passed — {status}")
    print("=" * 55)
    return 0 if all(results) else 1


if __name__ == "__main__":
    sys.exit(main())
