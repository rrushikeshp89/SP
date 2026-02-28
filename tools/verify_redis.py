"""
verify_redis.py — Redis Handshake Script
Phase 2 (Link): Verifies Redis connectivity, tests read/write,
and confirms caching layer readiness.

Exit codes:
  0 = All checks passed
  1 = Connection failed
"""

import sys
import os
import time
from pathlib import Path

# Load .env from project root
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

import redis


def get_redis_client() -> redis.Redis:
    return redis.Redis(
        host=os.getenv("REDIS_HOST", "localhost"),
        port=int(os.getenv("REDIS_PORT", "6379")),
        password=os.getenv("REDIS_PASSWORD", "") or None,
        db=int(os.getenv("REDIS_DB", "0")),
        decode_responses=True,
        socket_connect_timeout=5,
    )


def check_connectivity() -> bool:
    """Test basic Redis connectivity with PING."""
    print("[1/4] Testing Redis connectivity (PING)...", end=" ")
    try:
        client = get_redis_client()
        response = client.ping()
        if response:
            print("OK → PONG")
            return True
        print("FAILED → No PONG")
        return False
    except redis.ConnectionError as e:
        print(f"FAILED\n  Error: {e}")
        return False


def check_version() -> str | None:
    """Retrieve Redis server version."""
    print("[2/4] Checking Redis version...", end=" ")
    try:
        client = get_redis_client()
        info = client.info("server")
        version = info.get("redis_version", "unknown")
        print(f"OK → Redis {version}")
        return version
    except Exception as e:
        print(f"FAILED\n  Error: {e}")
        return None


def check_read_write() -> bool:
    """Test a write/read/delete cycle."""
    print("[3/4] Testing read/write cycle...", end=" ")
    try:
        client = get_redis_client()
        test_key = "_resume_engine_handshake_test"
        test_value = f"handshake_{int(time.time())}"

        # Write
        client.set(test_key, test_value, ex=10)
        # Read
        result = client.get(test_key)
        # Delete
        client.delete(test_key)

        if result == test_value:
            print("OK → Write/Read/Delete cycle passed")
            return True
        print(f"FAILED → Expected '{test_value}', got '{result}'")
        return False
    except Exception as e:
        print(f"FAILED\n  Error: {e}")
        return False


def check_memory() -> bool:
    """Check Redis memory info."""
    print("[4/4] Checking Redis memory...", end=" ")
    try:
        client = get_redis_client()
        info = client.info("memory")
        used = info.get("used_memory_human", "unknown")
        peak = info.get("used_memory_peak_human", "unknown")
        print(f"OK → Used: {used}, Peak: {peak}")
        return True
    except Exception as e:
        print(f"FAILED\n  Error: {e}")
        return False


def main() -> int:
    print("=" * 55)
    print("  Redis Handshake — verify_redis.py")
    print("=" * 55)

    results = [
        check_connectivity(),
        check_version() is not None,
        check_read_write(),
        check_memory(),
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
