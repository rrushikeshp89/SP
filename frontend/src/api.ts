import axios from 'axios';
import type {
  Resume,
  PaginatedResumes,
  Job,
  PaginatedJobs,
  ScoreResponse,
  BatchScoreResponse,
  HealthResponse,
  DashboardStats,
  ScoreHistoryItem,
  ScoringProfile,
  PipelineResponse,
  BulkUploadResult,
  CandidateStatus,
} from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 120_000,
});

/* ── Health ── */
export const getHealth = () =>
  axios.get<HealthResponse>('/health').then((r) => r.data);

/* ── Dashboard Stats ── */
export const getStats = () =>
  api.get<DashboardStats>('/stats').then((r) => r.data);

/* ── Resumes ── */
export const uploadResume = (file: File, candidateName: string, email?: string, phone?: string) => {
  const form = new FormData();
  form.append('file', file);
  form.append('candidate_name', candidateName);
  if (email) form.append('email', email);
  if (phone) form.append('phone', phone);
  return api.post<Resume>('/resumes/upload', form).then((r) => r.data);
};

export const uploadBulk = (files: File[]) => {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  return api.post<BulkUploadResult>('/resumes/upload/bulk', form).then((r) => r.data);
};

export const getResume = (id: string) =>
  api.get<Resume>(`/resumes/${id}`).then((r) => r.data);

export const listResumes = (page = 1, perPage = 20) =>
  api.get<PaginatedResumes>('/resumes', { params: { page, per_page: perPage } }).then((r) => r.data);

export const deleteResume = (id: string) =>
  api.delete(`/resumes/${id}`).then(() => {});

export const updateResumeMeta = (id: string, data: { status?: CandidateStatus; notes?: string }) =>
  api.patch<Resume>(`/resumes/${id}`, data).then((r) => r.data);

/* ── Jobs ── */
export const createJob = (data: {
  title: string;
  company?: string;
  description: string;
  required_skills: string[];
  experience_years?: number;
  education?: { degree_level: string; field: string };
}) => api.post<Job>('/jobs', data).then((r) => r.data);

export const getJob = (id: string) =>
  api.get<Job>(`/jobs/${id}`).then((r) => r.data);

export const listJobs = (page = 1, perPage = 20) =>
  api.get<PaginatedJobs>('/jobs', { params: { page, per_page: perPage } }).then((r) => r.data);

export const deleteJob = (id: string) =>
  api.delete(`/jobs/${id}`).then(() => {});

/* ── Scoring ── */
export const scoreOne = (resumeId: string, jobId: string, profileId?: string) =>
  api.post<ScoreResponse>('/score', { resume_id: resumeId, job_id: jobId }, {
    params: profileId ? { profile_id: profileId } : undefined,
  }).then((r) => r.data);

export const scoreBatch = (jobId: string, resumeIds: string[], profileId?: string) =>
  api.post<BatchScoreResponse>('/score/batch', { job_id: jobId, resume_ids: resumeIds }, {
    params: profileId ? { profile_id: profileId } : undefined,
  }).then((r) => r.data);

/* ── Score History ── */
export const getScoreHistory = (resumeId?: string, jobId?: string, limit = 50) =>
  api.get<ScoreHistoryItem[]>('/score/history', {
    params: { resume_id: resumeId, job_id: jobId, limit },
  }).then((r) => r.data);

/* ── Export ── */
export const exportCSV = (jobId: string, profileId?: string) => {
  const params = new URLSearchParams({ job_id: jobId });
  if (profileId) params.set('profile_id', profileId);
  return api.get('/score/export/csv', { params, responseType: 'blob' }).then((r) => {
    const url = URL.createObjectURL(r.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rankings_${jobId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });
};

/* ── Pipeline ── */
export const getPipeline = () =>
  api.get<PipelineResponse>('/pipeline').then((r) => r.data);

/* ── Scoring Profiles ── */
export const listProfiles = () =>
  api.get<ScoringProfile[]>('/scoring-profiles').then((r) => r.data);

export const createProfile = (data: {
  name: string;
  description?: string;
  weights: { semantic: number; skills: number; experience: number; education: number };
  is_default?: boolean;
}) => api.post<ScoringProfile>('/scoring-profiles', data).then((r) => r.data);

export const deleteProfile = (id: string) =>
  api.delete(`/scoring-profiles/${id}`).then(() => {});
