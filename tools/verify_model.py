"""
verify_model.py — Embedding Model Handshake Script
Phase 2 (Link): Verifies that the sentence-transformer embedding model
can be downloaded/loaded and produces correct-dimension vectors.

Exit codes:
  0 = All checks passed
  1 = Model load or inference failed
"""

import sys
import os
import time
from pathlib import Path

# Load .env from project root
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def check_imports() -> bool:
    """Verify sentence-transformers and torch are importable."""
    print("[1/4] Checking imports (sentence-transformers, torch)...", end=" ")
    try:
        import sentence_transformers
        import torch
        print(f"OK → ST v{sentence_transformers.__version__}, torch v{torch.__version__}")
        return True
    except ImportError as e:
        print(f"FAILED\n  Error: {e}")
        return False


def check_model_load() -> object | None:
    """Load the embedding model specified in .env."""
    model_name = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    print(f"[2/4] Loading model '{model_name}'...", end=" ", flush=True)
    try:
        from sentence_transformers import SentenceTransformer
        start = time.time()
        model = SentenceTransformer(model_name)
        elapsed = time.time() - start
        print(f"OK → Loaded in {elapsed:.1f}s")
        return model
    except Exception as e:
        print(f"FAILED\n  Error: {e}")
        return None


def check_embedding_dimension(model) -> bool:
    """Verify the model produces the expected embedding dimension."""
    expected_dim = int(os.getenv("EMBEDDING_DIM", "384"))
    print(f"[3/4] Verifying embedding dimension (expect {expected_dim})...", end=" ")
    try:
        test_text = "Senior Python developer with 5 years experience in FastAPI and PostgreSQL"
        embedding = model.encode(test_text)
        actual_dim = len(embedding)
        if actual_dim == expected_dim:
            print(f"OK → {actual_dim}D vector")
            return True
        print(f"MISMATCH → Got {actual_dim}, expected {expected_dim}")
        return False
    except Exception as e:
        print(f"FAILED\n  Error: {e}")
        return False


def check_determinism(model) -> bool:
    """Verify the model produces deterministic output."""
    print("[4/4] Verifying determinism (same input → same output)...", end=" ")
    try:
        import numpy as np
        test_text = "Machine learning engineer proficient in TensorFlow and Kubernetes"
        v1 = model.encode(test_text)
        v2 = model.encode(test_text)
        if np.allclose(v1, v2, atol=1e-6):
            print("OK → Deterministic (vectors match)")
            return True
        diff = float(np.max(np.abs(v1 - v2)))
        print(f"WARNING → Max diff: {diff:.2e} (may indicate non-determinism)")
        return False
    except Exception as e:
        print(f"FAILED\n  Error: {e}")
        return False


def main() -> int:
    print("=" * 55)
    print("  Embedding Model Handshake — verify_model.py")
    print("=" * 55)

    results = []

    # Check 1: Imports
    results.append(check_imports())
    if not results[-1]:
        print("-" * 55)
        print("Result: 0/4 checks passed — FAIL (missing packages)")
        print("=" * 55)
        return 1

    # Check 2: Model load
    model = check_model_load()
    results.append(model is not None)
    if model is None:
        print("-" * 55)
        print("Result: 1/4 checks passed — FAIL (model load failed)")
        print("=" * 55)
        return 1

    # Check 3: Dimension
    results.append(check_embedding_dimension(model))

    # Check 4: Determinism
    results.append(check_determinism(model))

    print("-" * 55)
    passed = sum(results)
    total = len(results)
    status = "PASS" if all(results) else "FAIL"
    print(f"Result: {passed}/{total} checks passed — {status}")
    print("=" * 55)
    return 0 if all(results) else 1


if __name__ == "__main__":
    sys.exit(main())
