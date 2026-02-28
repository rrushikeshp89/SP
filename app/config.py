"""
config.py — Application Configuration
Loads settings from .env and exposes them as typed constants.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_PROJECT_ROOT / ".env")


# --- PostgreSQL ---
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", "5432"))
POSTGRES_DB = os.getenv("POSTGRES_DB", "resume_engine")
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")

# --- Redis ---
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "") or None
REDIS_DB = int(os.getenv("REDIS_DB", "0"))

# --- Embedding Model ---
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIM", "384"))

# --- Scoring Weights ---
WEIGHT_SEMANTIC = float(os.getenv("WEIGHT_SEMANTIC", "0.40"))
WEIGHT_SKILLS = float(os.getenv("WEIGHT_SKILLS", "0.35"))
WEIGHT_EXPERIENCE = float(os.getenv("WEIGHT_EXPERIENCE", "0.15"))
WEIGHT_EDUCATION = float(os.getenv("WEIGHT_EDUCATION", "0.10"))

# Validate weights sum to 1.0
_weight_sum = WEIGHT_SEMANTIC + WEIGHT_SKILLS + WEIGHT_EXPERIENCE + WEIGHT_EDUCATION
assert abs(_weight_sum - 1.0) < 0.001, f"Scoring weights must sum to 1.0, got {_weight_sum}"

# --- File Processing ---
TMP_DIR = _PROJECT_ROOT / os.getenv("TMP_DIR", ".tmp")
MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "10"))
ALLOWED_FORMATS = set(os.getenv("ALLOWED_FORMATS", "pdf,docx,txt").split(","))
TMP_FILE_TTL_SECONDS = int(os.getenv("TMP_FILE_TTL_SECONDS", "3600"))

# --- Skill Taxonomy ---
SKILL_TAXONOMY_PATH = _PROJECT_ROOT / "tools" / "data" / "skill_taxonomy.json"

# --- Database URL ---
DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

# --- Alias ---
EMBEDDING_MODEL_NAME = EMBEDDING_MODEL  # backward-compat alias

# --- App ---
APP_HOST = os.getenv("APP_HOST", "0.0.0.0")
APP_PORT = int(os.getenv("APP_PORT", "8000"))
APP_ENV = os.getenv("APP_ENV", "development")
LOG_LEVEL = os.getenv("LOG_LEVEL", "info")

# --- Skill Taxonomy ---
SKILL_TAXONOMY_PATH = _PROJECT_ROOT / "tools" / "data" / "skill_taxonomy.json"

# --- DB Connection String ---
DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
