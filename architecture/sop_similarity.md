# SOP: Cosine Similarity & Scoring

> Module: `tools/scorer.py`
> Last Updated: 2026-02-28
> Status: **Active**

---

## 1. Purpose

Compute the Job Fit Score between a resume and a job description using a weighted
composite of semantic similarity, skill match, experience relevance, and education match.

---

## 2. Input Contract

```python
@dataclass
class ScoreInput:
    resume_embedding: list[float]       # 384-dim vector
    jd_embedding: list[float]           # 384-dim vector
    resume_skills: list[str]            # Skills extracted from resume
    jd_required_skills: list[str]       # Required skills from JD
    jd_preferred_skills: list[str]      # Preferred skills from JD
    resume_experience_years: float | None   # Total years of experience
    jd_min_experience_years: float | None   # JD minimum requirement
    resume_education: dict | None       # {"degree": str, "field": str}
    jd_education: dict | None           # {"degree_level": str, "field": str}
```

---

## 3. Output Contract

```python
@dataclass
class ScoreResult:
    success: bool
    overall_score: float                # [0.0, 100.0]
    breakdown: ScoreBreakdown
    matched_skills: list[str]
    missing_skills: list[str]
    partially_matched: list[dict]       # [{"required": str, "has": str, "sim": float}]
    suggestions: list[str]              # Improvement recommendations
    error_message: str | None
```

```python
@dataclass
class ScoreBreakdown:
    semantic: ComponentScore     # weight=0.40
    skills: ComponentScore       # weight=0.35
    experience: ComponentScore   # weight=0.15
    education: ComponentScore    # weight=0.10

@dataclass
class ComponentScore:
    score: float            # [0.0, 100.0]
    weight: float           # e.g., 0.40
    weighted_score: float   # score * weight
```

---

## 4. Scoring Formula

$$FitScore = w_1 \cdot S_{semantic} + w_2 \cdot S_{skills} + w_3 \cdot S_{experience} + w_4 \cdot S_{education}$$

Default weights from `.env`:

| Component | Weight | Method |
|-----------|--------|--------|
| Semantic Similarity | 0.40 | `cosine_similarity(resume_vec, jd_vec) × 100` |
| Skill Match | 0.35 | See Section 5 |
| Experience Relevance | 0.15 | See Section 6 |
| Education Match | 0.10 | See Section 7 |

---

## 5. Skill Match Scoring

```
For each required_skill in JD:
  1. Exact match (case-insensitive) in resume_skills → full credit (1.0)
  2. Fuzzy match (similarity ≥ 0.85) → partial credit (0.7)
  3. Semantic alias match (from skill taxonomy synonyms) → partial credit (0.8)
  4. No match → 0.0, added to missing_skills

S_skills = (total_credit / len(required_skills)) × 100

Preferred skills: add bonus of up to 5 points if candidate has preferred skills
  bonus = min(5, (matched_preferred / len(preferred)) × 5)
```

---

## 6. Experience Scoring

```
If both resume_years and jd_min_years are provided:
  if resume_years >= jd_min_years:
    S_experience = min(100, 80 + (resume_years - jd_min_years) * 4)
  else:
    ratio = resume_years / jd_min_years
    S_experience = ratio * 80

If either is missing:
  S_experience = 50.0 (neutral score)
```

---

## 7. Education Scoring

```
degree_levels = {"high_school": 1, "associate": 2, "bachelor": 3, "master": 4, "phd": 5}

Degree level match (50 points):
  if resume_level >= jd_level: 50
  elif resume_level == jd_level - 1: 30
  else: 10

Field match (50 points):
  exact match: 50
  related field (STEM ↔ STEM): 30
  no match: 10

If education data missing: S_education = 50 (neutral)
```

---

## 8. Suggestion Generation

Deterministic rules:
1. For each missing required skill → "Consider gaining experience in {skill}"
2. If experience is below minimum → "The role requires {n} years; you have {m}"
3. If education level below requirement → "Consider pursuing a {level} degree"
4. If score > 80 → "Strong match — highlight your {top_matched_skills}"

Max 5 suggestions, prioritized by impact.

---

## 9. Behavioral Rules

1. **Determinism**: Same inputs → same score, always.
2. **Clamping**: Final score clamped to `[0.0, 100.0]`.
3. **Division safety**: If `len(required_skills) == 0`, `S_skills = 100.0` (no requirements = full match).
4. **Weight validation**: Weights must sum to 1.0 (assert on startup).
5. **No external API calls**: All scoring is local computation.

---

## 10. Dependencies

- `numpy>=1.26.0`
- `scipy>=1.12.0` (for `cosine` distance)
- `python-dotenv>=1.0.0`

---

## 11. Test Cases

| # | Input | Expected |
|---|-------|----------|
| T1 | Identical resume & JD embeddings, all skills match | Score ≈ 100 |
| T2 | Orthogonal vectors, no skill overlap | Score < 30 |
| T3 | 50% skill overlap, similar embeddings | Score 50-70 |
| T4 | Empty required_skills list | `S_skills = 100` |
| T5 | Missing experience data | `S_experience = 50` |
| T6 | Education exceeds requirement | `S_education ≥ 80` |
| T7 | Same input twice | Identical scores (determinism) |
