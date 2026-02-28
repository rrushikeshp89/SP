import axios from 'axios';
import type {
  Resume,
  PaginatedResumes,
  Job,
  PaginatedJobs,
  ScoreResponse,
  BatchScoreResponse,
  HealthResponse,
} from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 120_000,
});

/* ── Health ── */
export const getHealth = () =>
  axios.get<HealthResponse>('/health').then((r) => r.data);

/* ── Resumes ── */
export const uploadResume = (file: File, candidateName: string, email?: string, phone?: string) => {
  const form = new FormData();
  form.append('file', file);
  form.append('candidate_name', candidateName);
  if (email) form.append('email', email);
  if (phone) form.append('phone', phone);
  return api.post<Resume>('/resumes/upload', form).then((r) => r.data);
};

export const getResume = (id: string) =>
  api.get<Resume>(`/resumes/${id}`).then((r) => r.data);

export const listResumes = (page = 1, perPage = 20) =>
  api.get<PaginatedResumes>('/resumes', { params: { page, per_page: perPage } }).then((r) => r.data);

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

/* ── Scoring ── */
export const scoreOne = (resumeId: string, jobId: string) =>
  api.post<ScoreResponse>('/score', { resume_id: resumeId, job_id: jobId }).then((r) => r.data);

export const scoreBatch = (jobId: string, resumeIds: string[]) =>
  api.post<BatchScoreResponse>('/score/batch', { job_id: jobId, resume_ids: resumeIds }).then((r) => r.data);
