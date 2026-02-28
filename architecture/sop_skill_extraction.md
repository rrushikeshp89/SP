# SOP: Skill Extraction

> Module: `tools/skill_extractor.py`
> Last Updated: 2026-02-28
> Status: **Active**

---

## 1. Purpose

Extract technical and soft skills from plain text (resume or job description)
using a curated taxonomy with fuzzy matching. This is deterministic — no LLM in the core path.

---

## 2. Input Contract

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | `str` | Yes | Plain text to extract skills from |
| `taxonomy_path` | `str \| Path \| None` | No | Path to skill taxonomy JSON. Defaults to `tools/data/skill_taxonomy.json` |

---

## 3. Output Contract

```python
@dataclass
class SkillExtractionResult:
    success: bool
    skills: list[str]               # Unique matched skills (canonical names)
    skill_categories: dict[str, list[str]]  # {"programming_languages": ["Python", ...], ...}
    total_count: int                # len(skills)
    processing_time_ms: float
    error_message: str | None
```

---

## 4. Taxonomy Structure

File: `tools/data/skill_taxonomy.json`

```json
{
  "programming_languages": {
    "Python": ["python", "python3", "py"],
    "JavaScript": ["javascript", "js", "ecmascript"],
    "TypeScript": ["typescript", "ts"],
    "Java": ["java"],
    "C++": ["c++", "cpp", "cplusplus"],
    "C#": ["c#", "csharp", "c sharp"],
    "Go": ["go", "golang"],
    "Rust": ["rust"],
    "Ruby": ["ruby"],
    "PHP": ["php"],
    "Swift": ["swift"],
    "Kotlin": ["kotlin"],
    "R": ["\\br\\b"],
    "SQL": ["sql", "t-sql", "plsql", "pl/sql"]
  },
  "frameworks": {
    "React": ["react", "reactjs", "react.js"],
    "FastAPI": ["fastapi", "fast-api"],
    "Django": ["django"],
    "Flask": ["flask"],
    "Spring Boot": ["spring boot", "springboot", "spring"],
    "Next.js": ["nextjs", "next.js"],
    "Vue.js": ["vuejs", "vue.js", "vue"],
    "Angular": ["angular", "angularjs"],
    "Express.js": ["express", "expressjs", "express.js"],
    "Node.js": ["node", "nodejs", "node.js"]
  },
  "databases": {
    "PostgreSQL": ["postgresql", "postgres", "psql"],
    "MySQL": ["mysql"],
    "MongoDB": ["mongodb", "mongo"],
    "Redis": ["redis"],
    "SQLite": ["sqlite"],
    "Elasticsearch": ["elasticsearch", "elastic"],
    "DynamoDB": ["dynamodb", "dynamo"]
  },
  "cloud_devops": {
    "AWS": ["aws", "amazon web services"],
    "Azure": ["azure", "microsoft azure"],
    "GCP": ["gcp", "google cloud", "google cloud platform"],
    "Docker": ["docker"],
    "Kubernetes": ["kubernetes", "k8s"],
    "Terraform": ["terraform"],
    "CI/CD": ["ci/cd", "cicd", "continuous integration", "continuous deployment"],
    "Jenkins": ["jenkins"],
    "GitHub Actions": ["github actions", "gh actions"]
  },
  "data_ml": {
    "Machine Learning": ["machine learning", "ml"],
    "Deep Learning": ["deep learning", "dl"],
    "NLP": ["nlp", "natural language processing"],
    "TensorFlow": ["tensorflow", "tf"],
    "PyTorch": ["pytorch"],
    "Pandas": ["pandas"],
    "NumPy": ["numpy"],
    "Scikit-learn": ["scikit-learn", "sklearn"],
    "Computer Vision": ["computer vision", "cv"],
    "Data Analysis": ["data analysis", "data analytics"]
  },
  "tools_practices": {
    "Git": ["git", "github", "gitlab", "bitbucket"],
    "REST API": ["rest api", "restful", "rest"],
    "GraphQL": ["graphql"],
    "Agile": ["agile", "scrum", "kanban"],
    "Jira": ["jira"],
    "Linux": ["linux", "ubuntu", "centos"],
    "Microservices": ["microservices", "micro-services"]
  },
  "soft_skills": {
    "Leadership": ["leadership", "team lead", "leading teams"],
    "Communication": ["communication", "communicating"],
    "Problem Solving": ["problem solving", "problem-solving", "troubleshooting"],
    "Teamwork": ["teamwork", "team player", "collaboration", "collaborative"],
    "Project Management": ["project management", "managing projects"]
  }
}
```

---

## 5. Matching Algorithm

```
1. Load taxonomy (cached after first load)
2. Lowercase the input text
3. Tokenize into words and bigrams/trigrams for multi-word skill matching
4. For each skill in taxonomy:
   a. For each alias of that skill:
      - If alias is found in text (word-boundary aware):
        → Add canonical skill name to results
        → Break (don't double-count)
5. Deduplicate results
6. Categorize by taxonomy category
7. Return SkillExtractionResult
```

### Word Boundary Matching

Use regex `\b{alias}\b` (case-insensitive) to avoid false positives:
- "Java" should NOT match "JavaScript"
- "R" uses special pattern `\bR\b` with context checks
- "Go" uses `\bGo\b` with context checks (avoid matching "go to")

---

## 6. Behavioral Rules

1. **Determinism**: Same text → same skills, always.
2. **Case-insensitive matching**: "PYTHON" matches "Python" in taxonomy.
3. **No duplicates**: Each skill appears once in output regardless of frequency in text.
4. **Taxonomy is the source of truth**: Only skills in the taxonomy are recognized.
5. **Singleton taxonomy load**: Loaded once, cached in module scope.
6. **Order**: Skills returned in taxonomy-defined category order.

---

## 7. Error Scenarios

| Scenario | Response |
|----------|----------|
| Empty text | `success=True`, `skills=[]`, `total_count=0` |
| Taxonomy file not found | `success=False`, `error_message="Taxonomy not found: {path}"` |
| Invalid taxonomy JSON | `success=False`, `error_message="Invalid taxonomy: {detail}"` |

---

## 8. Dependencies

- Python stdlib: `re`, `json`, `pathlib`, `dataclasses`, `time`
- No external ML libraries (fully deterministic)

---

## 9. Test Cases

| # | Input Text | Expected Skills (subset) |
|---|-----------|------------------------|
| T1 | "5 years of Python and FastAPI experience" | Python, FastAPI |
| T2 | "JavaScript/TypeScript React developer" | JavaScript, TypeScript, React |
| T3 | "AWS certified, Docker and Kubernetes" | AWS, Docker, Kubernetes |
| T4 | "Java developer" | Java (NOT JavaScript) |
| T5 | Empty string | `skills=[]` |
| T6 | "Strong leadership and communication skills" | Leadership, Communication |
| T7 | Same text twice | Identical results |
