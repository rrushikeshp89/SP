"""
test_vectorizer.py — Unit tests for the embedding vectorizer.
"""

import pytest

from tools.vectorizer import embed_text, get_model, EmbeddingResult


class TestEmbedding:
    """Core embedding tests."""

    def test_valid_text(self):
        result = embed_text("Experienced Python developer with 5 years of backend work.")
        assert result.success is True
        assert result.dimension == 384
        assert len(result.vector) == 384  # type: ignore[arg-type]
        assert all(isinstance(v, float) for v in result.vector)  # type: ignore[union-attr]

    def test_empty_string(self):
        result = embed_text("")
        assert result.success is False
        assert "empty" in (result.error_message or "").lower()

    def test_whitespace_only(self):
        result = embed_text("   \n\t  ")
        assert result.success is False

    def test_determinism(self):
        text = "Machine learning engineer with PyTorch and TensorFlow"
        r1 = embed_text(text)
        r2 = embed_text(text)
        assert r1.success is True
        assert r2.success is True
        assert r1.vector == r2.vector

    def test_processing_time(self):
        result = embed_text("Quick test for timing purposes")
        assert result.success is True
        assert result.processing_time_ms > 0

    def test_model_name_populated(self):
        result = embed_text("Some text for model name check")
        assert result.success is True
        assert "MiniLM" in result.model_name or "minilm" in result.model_name.lower()
