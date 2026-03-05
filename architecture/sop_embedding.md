# SOP: Embedding Generation

> Module: `tools/vectorizer.py`
> Last Updated: 2026-02-28
> Status: **Active**

---

## 1. Purpose

Convert plain text (resume or job description) into a fixed-dimension embedding vector
using a sentence-transformer model. These vectors enable semantic similarity comparison.

---

## 2. Input Contract

| Parameter | Type | Required | Description |
| --------- | ------ | ---------- | ------------- |
| `text` | `str` | Yes | Plain text to vectorize (resume or JD) |
| `model` | `SentenceTransformer \| None` | No | Pre-loaded model instance. If None, loads from config. |

**Pre-condition**: `text` must be non-empty after stripping whitespace.

---

## 3. Output Contract

```python
@dataclass
class EmbeddingResult:
    success: bool                   # True if embedding was generated
    vector: list[float]             # Embedding vector (384 floats for MiniLM)
    dimension: int                  # Length of vector (must match EMBEDDING_DIM)
    model_name: str                 # Model used (e.g., "all-MiniLM-L6-v2")
    processing_time_ms: float       # Time taken in milliseconds
    error_message: str | None       # Error details if success=False
```

---

## 4. Processing Pipeline

```text
Input Text
  │
  ├─ Validate: non-empty after strip()
  │
  ├─ Truncate if > 512 tokens (model max)
  │   └─ Use first 512 tokens (MiniLM context window)
  │
  ├─ Encode via SentenceTransformer.encode()
  │   └─ normalize_embeddings=True (unit vectors for cosine sim)
  │   └─ show_progress_bar=False
  │
  ├─ Assert len(vector) == EMBEDDING_DIM
  │
  └─ Return EmbeddingResult
```

---

## 5. Model Management

### 5.1 Singleton Pattern

The model is loaded ONCE per process lifetime and reused. Loading takes ~25s on first call.

```python
_model_cache: SentenceTransformer | None = None

def get_model() -> SentenceTransformer:
    global _model_cache
    if _model_cache is None:
        _model_cache = SentenceTransformer(EMBEDDING_MODEL)
    return _model_cache
```

### 5.2 Configuration

| Setting | Source | Default |
| --------- | -------- | --------- |
| Model name | `EMBEDDING_MODEL` env var | `all-MiniLM-L6-v2` |
| Expected dimension | `EMBEDDING_DIM` env var | `384` |

---

## 6. Behavioral Rules

1. **Determinism**: `model.encode(text)` with same text → same vector. No sampling, no temperature.
2. **Normalization**: All vectors are L2-normalized (unit vectors) so cosine similarity = dot product.
3. **Dimension assertion**: `assert len(vector) == EMBEDDING_DIM` before returning.
4. **No GPU required**: Runs on CPU by default. GPU used automatically if available.
5. **Thread safety**: Model inference is safe for concurrent reads (no state mutation).

---

## 7. Error Scenarios

| Scenario | Response |
| ---------- | ---------- |
| Empty text input | `success=False`, `error_message="Input text is empty"` |
| Model fails to load | `success=False`, `error_message="Model load failed: {detail}"` |
| Dimension mismatch | `success=False`, `error_message="Dimension mismatch: got {n}, expected {dim}"` |
| OOM on very long text | Truncation prevents this; if still fails, catch and report |

---

## 8. Dependencies

- `sentence-transformers>=2.3.0`
- `torch>=1.11.0`
- `numpy>=1.26.0`
- `python-dotenv>=1.0.0`

---

## 9. Test Cases

| # | Input | Expected Output |
| --- | ------- | ----------------- |
| T1 | Short resume text (~100 words) | `success=True`, `dimension=384`, vector is list of floats |
| T2 | Same text twice | Identical vectors (determinism check) |
| T3 | Empty string | `success=False`, error about empty text |
| T4 | Very long text (10k words) | `success=True`, truncated internally, valid vector |
| T5 | JD text | `success=True`, `dimension=384` |
