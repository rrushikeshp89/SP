/* ── API Response Types ── */

export const VALID_STATUSES = ['new', 'screening', 'interview', 'offered', 'hired', 'rejected'] as const;
export type CandidateStatus = typeof VALID_STATUSES[number];

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
  status: CandidateStatus;
  notes: string;
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

export interface GapItem {
  category: string;
  item: string;
  impact: string;
  recommendation: string;
}

export interface ScoreResponse {
  overall_score: number;
  breakdown: ScoreBreakdown;
  matched_skills: string[];
  missing_skills: string[];
  partially_matched: { required: string; has: string; similarity: number }[];
  suggestions: string[];
  explanation: string;
  gap_report: GapItem[];
}

export interface RankedCandidate {
  rank: number;
  resume_id: string;
  candidate_name: string;
  overall_score: number;
  breakdown: ScoreBreakdown;
  matched_skills: string[];
  missing_skills: string[];
  suggestions: string[];
  explanation: string;
  gap_report: GapItem[];
}

export interface BatchScoreResponse {
  job_id: string;
  total_candidates: number;
  ranked_candidates: RankedCandidate[];
}

export interface ScoreHistoryItem {
  id: number;
  resume_id: string;
  job_id: string;
  candidate_name: string;
  job_title: string;
  overall_score: number;
  breakdown: ScoreBreakdown;
  matched_skills: string[];
  missing_skills: string[];
  explanation: string;
  gap_report: GapItem[];
  scored_at: string;
}

export interface ScoringProfile {
  profile_id: string;
  name: string;
  description: string;
  weights: { semantic: number; skills: number; experience: number; education: number };
  is_default: boolean;
}

export interface PipelineCandidate {
  resume_id: string;
  candidate_name: string;
  email: string | null;
  status: CandidateStatus;
  skills: string[];
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface PipelineStage {
  stage: CandidateStatus;
  count: number;
  candidates: PipelineCandidate[];
}

export interface PipelineResponse {
  stages: PipelineStage[];
  total: number;
}

export interface BulkUploadResult {
  uploaded: number;
  failed: number;
  results: { resume_id: string; candidate_name: string; skills_count: number }[];
  errors: { index: number; filename?: string; error: string }[];
}

export interface HealthResponse {
  status: string;
  model: string;
}

export interface DashboardStats {
  total_resumes: number;
  total_jobs: number;
  resume_by_day: Record<string, number>;
  jobs_by_day: Record<string, number>;
  this_week_resumes: number;
  prev_week_resumes: number;
  this_week_jobs: number;
  prev_week_jobs: number;
}
