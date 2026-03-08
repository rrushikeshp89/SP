"""
cache_handler.py — Redis Caching (Layer 3 Tool)
Provides simple key-value caching with TTL for embeddings and scores.
"""

import json
from typing import Any

import redis  # type: ignore[import-untyped]

from app.config import REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB, REDIS_URL

# ── Client Singleton ─────────────────────────────────

_client: redis.Redis | None = None
_redis_available: bool | None = None  # None = not checked yet

DEFAULT_TTL = 3600  # 1 hour


def _get_client() -> redis.Redis | None:
    """Return (or create) a Redis client. Returns None if Redis is unavailable."""
    global _client, _redis_available
    if _redis_available is False:
        return None
    if _client is None:
        try:
            if REDIS_URL:
                _client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
            else:
                _client = redis.Redis(
                    host=REDIS_HOST,
                    port=REDIS_PORT,
                    password=REDIS_PASSWORD,
                    db=REDIS_DB,
                    decode_responses=True,
                )
            _client.ping()
            _redis_available = True
        except Exception:
            _client = None
            _redis_available = False
    return _client


# ── Public API ───────────────────────────────────────

def cache_set(key: str, value: Any, ttl: int = DEFAULT_TTL) -> bool:
    """Store a JSON-serializable value with TTL."""
    try:
        client = _get_client()
        if client is None:
            return False
        data = json.dumps(value)
        client.setex(key, ttl, data)
        return True
    except Exception:
        return False


def cache_get(key: str) -> Any | None:
    """Retrieve a cached value by key. Returns None on miss or error."""
    try:
        client = _get_client()
        if client is None:
            return None
        data = client.get(key)
        if data is None:
            return None
        return json.loads(data)
    except Exception:
        return None


def cache_delete(key: str) -> bool:
    """Delete a cached key."""
    try:
        client = _get_client()
        if client is None:
            return False
        client.delete(key)
        return True
    except Exception:
        return False


def cache_exists(key: str) -> bool:
    """Check if a key exists in cache."""
    try:
        client = _get_client()
        if client is None:
            return False
        return bool(client.exists(key))
    except Exception:
        return False


# ── Convenience: Embedding Cache ─────────────────────

def cache_embedding(text_hash: str, vector: list[float], ttl: int = DEFAULT_TTL) -> bool:
    """Cache an embedding vector keyed by text hash."""
    return cache_set(f"emb:{text_hash}", vector, ttl)


def get_cached_embedding(text_hash: str) -> list[float] | None:
    """Retrieve a cached embedding vector."""
    return cache_get(f"emb:{text_hash}")


# ── Convenience: Score Cache ─────────────────────────

def cache_score(resume_id: str, job_id: str, score_data: dict, ttl: int = DEFAULT_TTL) -> bool:
    """Cache a fit score result."""
    return cache_set(f"score:{resume_id}:{job_id}", score_data, ttl)


def get_cached_score(resume_id: str, job_id: str) -> dict | None:
    """Retrieve a cached fit score."""
    return cache_get(f"score:{resume_id}:{job_id}")
