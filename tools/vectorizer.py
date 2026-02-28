"""
vectorizer.py — Embedding Generation (Layer 3 Tool)
Converts plain text into 384-dim embedding vectors using sentence-transformers.
Singleton model pattern — loaded once, cached for process lifetime.
"""

import time
from dataclasses import dataclass

from sentence_transformers import SentenceTransformer  # type: ignore[import-untyped]

from app.config import EMBEDDING_MODEL, EMBEDDING_DIM


@dataclass
class EmbeddingResult:
    success: bool = False
    vector: list[float] | None = None
    dimension: int = 0
    model_name: str = ""
    processing_time_ms: float = 0.0
    error_message: str | None = None


# ── Singleton ────────────────────────────────────────

_model_cache: SentenceTransformer | None = None


def get_model() -> SentenceTransformer:
    """Return the cached model, loading it if necessary."""
    global _model_cache
    if _model_cache is None:
        _model_cache = SentenceTransformer(EMBEDDING_MODEL)
    return _model_cache


def preload_model() -> None:
    """Preload the model (called at app startup)."""
    get_model()


# ── Public API ───────────────────────────────────────

def embed_text(text: str, model: SentenceTransformer | None = None) -> EmbeddingResult:
    """
    Generate a normalized embedding vector for the given text.

    Args:
        text: Plain text (resume or JD).
        model: Optional pre-loaded model. Uses singleton if None.

    Returns:
        EmbeddingResult with 384-dim vector on success.
    """
    start = time.perf_counter()

    # Validate input
    if not text or not text.strip():
        return EmbeddingResult(
            error_message="Input text is empty",
            processing_time_ms=_elapsed(start),
        )

    try:
        m = model or get_model()

        # Encode with normalization (unit vector → cosine sim = dot product)
        vector = m.encode(
            text,
            normalize_embeddings=True,
            show_progress_bar=False,
        )

        vec_list = vector.tolist()
        dim = len(vec_list)

        if dim != EMBEDDING_DIM:
            return EmbeddingResult(
                error_message=f"Dimension mismatch: got {dim}, expected {EMBEDDING_DIM}",
                processing_time_ms=_elapsed(start),
            )

        return EmbeddingResult(
            success=True,
            vector=vec_list,
            dimension=dim,
            model_name=EMBEDDING_MODEL,
            processing_time_ms=_elapsed(start),
        )
    except Exception as exc:
        return EmbeddingResult(
            error_message=f"Embedding failed: {exc}",
            processing_time_ms=_elapsed(start),
        )


def _elapsed(start: float) -> float:
    return round((time.perf_counter() - start) * 1000, 2)
