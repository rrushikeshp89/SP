/* ── API Response Types ── */

export interface Resume {
  resume_id: string;
  candidate_name: string;
  email: string | null;
  phone: string | null;
  source_format: string;
  raw_text: string;
  parsed_sections: {
    skills?: string[];
    [key: string]: unknown;
  };
  skills: string[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedResumes {
  items: Resume[];
  total: number;
  page: number;
  per_page: number;
}

export interface EducationRequirement {
  degree_level: string;
  field: string;
}

export interface Job {
  job_id: string;
  title: string;
  company: string | null;
  description: string;
  required_skills: string[];
  experience_years: number | null;
  education: EducationRequirement | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedJobs {
  items: Job[];
  total: number;
  page: number;
  per_page: number;
}

export interface ComponentScore {
  score: number;
  weight: number;
  weighted_score: number;
}

export interface ScoreBreakdown {
  semantic: ComponentScore;
  skills: ComponentScore;
  experience: ComponentScore;
  education: ComponentScore;
}

export interface ScoreResponse {
  overall_score: number;
  breakdown: ScoreBreakdown;
  matched_skills: string[];
  missing_skills: string[];
  partially_matched: { required: string; has: string; similarity: number }[];
  suggestions: string[];
}

export interface RankedCandidate {
  rank: number;
  resume_id: string;
  candidate_name: string;
  overall_score: number;
  breakdown: ScoreBreakdown;
  suggestions: string[];
}

export interface BatchScoreResponse {
  job_id: string;
  total_candidates: number;
  ranked_candidates: RankedCandidate[];
}

export interface HealthResponse {
  status: string;
  model: string;
}
