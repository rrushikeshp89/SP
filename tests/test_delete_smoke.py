"""Quick smoke test for DELETE endpoints."""
import requests

BASE = "http://localhost:8000/api"

# ── Resume delete ──
r = requests.post(
    f"{BASE}/resumes/upload",
    files={"file": ("test.txt", b"Python developer with 5 years experience", "text/plain")},
    data={"candidate_name": "Delete Test User"},
)
assert r.status_code == 201, f"Upload failed: {r.status_code}"
rid = r.json()["resume_id"]
print(f"[OK] Created resume: {rid}")

d = requests.delete(f"{BASE}/resumes/{rid}")
assert d.status_code == 204, f"Delete resume failed: {d.status_code}"
print(f"[OK] Deleted resume: {d.status_code}")

g = requests.get(f"{BASE}/resumes/{rid}")
assert g.status_code == 404, f"Expected 404 after delete, got: {g.status_code}"
print(f"[OK] Verified gone: {g.status_code}")

# ── Job delete ──
j = requests.post(f"{BASE}/jobs", json={
    "title": "Delete Test Job",
    "description": "A job to test deletion",
    "required_skills": ["Python"],
})
assert j.status_code == 201, f"Create job failed: {j.status_code}"
jid = j.json()["job_id"]
print(f"[OK] Created job: {jid}")

dj = requests.delete(f"{BASE}/jobs/{jid}")
assert dj.status_code == 204, f"Delete job failed: {dj.status_code}"
print(f"[OK] Deleted job: {dj.status_code}")

gj = requests.get(f"{BASE}/jobs/{jid}")
assert gj.status_code == 404, f"Expected 404 after delete, got: {gj.status_code}"
print(f"[OK] Verified gone: {gj.status_code}")

# ── Edge case: delete nonexistent ──
n = requests.delete(f"{BASE}/resumes/nonexistent-id")
assert n.status_code == 404
nj = requests.delete(f"{BASE}/jobs/nonexistent-id")
assert nj.status_code == 404
print("[OK] Nonexistent delete returns 404")

print("\n✓ All delete tests passed!")
