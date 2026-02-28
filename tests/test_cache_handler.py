"""
test_cache_handler.py — Unit tests for Redis cache handler.
"""

import pytest

from tools.cache_handler import (
    cache_set,
    cache_get,
    cache_delete,
    cache_exists,
    cache_embedding,
    get_cached_embedding,
    cache_score,
    get_cached_score,
)


class TestBasicCache:
    """Basic set/get/delete operations."""

    def test_set_and_get(self):
        assert cache_set("test:basic", {"foo": "bar"}) is True
        result = cache_get("test:basic")
        assert result == {"foo": "bar"}
        cache_delete("test:basic")

    def test_get_nonexistent(self):
        result = cache_get("test:nonexistent:key:xxx")
        assert result is None

    def test_delete(self):
        cache_set("test:del", "value")
        assert cache_delete("test:del") is True
        assert cache_get("test:del") is None

    def test_exists(self):
        cache_set("test:exists", 42)
        assert cache_exists("test:exists") is True
        cache_delete("test:exists")
        assert cache_exists("test:exists") is False


class TestEmbeddingCache:
    """Embedding-specific cache convenience methods."""

    def test_cache_and_retrieve(self):
        vec = [0.1, 0.2, 0.3]
        assert cache_embedding("hash123", vec) is True
        result = get_cached_embedding("hash123")
        assert result == vec
        cache_delete("emb:hash123")

    def test_miss(self):
        assert get_cached_embedding("nonexistent_hash") is None


class TestScoreCache:
    """Score cache convenience methods."""

    def test_cache_and_retrieve(self):
        data = {"fit_score": 85.5, "breakdown": {}}
        assert cache_score("r1", "j1", data) is True
        result = get_cached_score("r1", "j1")
        assert result["fit_score"] == 85.5
        cache_delete("score:r1:j1")

    def test_miss(self):
        assert get_cached_score("xxx", "yyy") is None
