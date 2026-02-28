import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Briefcase,
  Search,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { createJob, listJobs } from '../api';
import SkillBadge from '../components/SkillBadge';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import { useToast } from '../components/Toast';
import type { Job } from '../types';

const POPULAR_SKILLS = [
  'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'FastAPI',
  'Docker', 'AWS', 'PostgreSQL', 'Machine Learning', 'Git', 'REST API',
];

export default function Jobs() {
  const toast = useToast();
  /* ── Form State ── */
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [description, setDescription] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [expYears, setExpYears] = useState('');
  const [degreeLevel, setDegreeLevel] = useState('');
  const [field, setField] = useState('');
  const [creating, setCreating] = useState(false);

  /* ── List State ── */
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchJobs = useCallback(() => {
    setLoading(true);
    listJobs(1, 100)
      .then((data) => setJobs(data.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  /* ── Skill helpers ── */
  const addSkill = (s: string) => {
    const clean = s.trim();
    if (clean && !skills.includes(clean)) setSkills([...skills, clean]);
    setSkillInput('');
  };

  const removeSkill = (s: string) => setSkills(skills.filter((sk) => sk !== s));

  /* ── Submit ── */
  const handleCreate = async () => {
    if (!title.trim() || !description.trim()) return;
    setCreating(true);
    try {
      await createJob({
        title: title.trim(),
        company: company.trim() || undefined,
        description: description.trim(),
        required_skills: skills,
        experience_years: expYears ? Number(expYears) : undefined,
        education: degreeLevel ? { degree_level: degreeLevel, field: field || 'any' } : undefined,
      });
      toast.success('Job created!', `"${title.trim()}" added successfully.`);
      setTitle('');
      setCompany('');
      setDescription('');
      setSkills([]);
      setExpYears('');
      setDegreeLevel('');
      setField('');
      setShowForm(false);
      fetchJobs();
    } catch (err: any) {
      toast.error('Creation failed', err?.response?.data?.detail || 'Failed to create job.');
    } finally {
      setCreating(false);
    }
  };

  const filtered = jobs.filter(
    (j) =>
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      (j.company || '').toLowerCase().includes(search.toLowerCase()) ||
      j.required_skills.some((s) => s.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div>
      {/* Header */}
      <PageHeader
        title="Job Descriptions"
        description="Create and manage positions to match against resumes."
        icon={<Briefcase size={22} />}
        badgeColor="#8b5cf6"
        badge={`${filtered.length} jobs`}
        actions={
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px -2px rgba(139, 92, 246, 0.3)',
            }}
          >
            <Plus size={16} /> New Job
          </motion.button>
        }
      />

      {/* ── Create Form ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div
              className="rounded-xl border p-6"
              style={{
                background: 'var(--bg-card)',
                borderColor: 'var(--border-light)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                Create New Job Description
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Job title *"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="px-3 py-2.5 text-sm rounded-lg border outline-none"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}
                />
                <input
                  type="text"
                  placeholder="Company name"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="px-3 py-2.5 text-sm rounded-lg border outline-none"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}
                />
              </div>

              <textarea
                placeholder="Job description *"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg border outline-none resize-y mb-4"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}
              />

              {/* Skills input */}
              <div className="mb-4">
                <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                  Required Skills
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Add a skill and press Enter"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput); }
                    }}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border outline-none"
                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}
                  />
                  <button
                    onClick={() => addSkill(skillInput)}
                    disabled={!skillInput.trim()}
                    className="px-3 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
                    style={{ background: 'var(--color-brand-500)', border: 'none', cursor: skillInput.trim() ? 'pointer' : 'not-allowed' }}
                  >
                    Add
                  </button>
                </div>
                {/* Popular skills shortcut */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {POPULAR_SKILLS.filter((s) => !skills.includes(s)).slice(0, 8).map((s) => (
                    <button
                      key={s}
                      onClick={() => addSkill(s)}
                      className="text-xs px-2.5 py-1 rounded-full border transition-colors"
                      style={{
                        background: 'var(--bg-secondary)',
                        borderColor: 'var(--border-light)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      + {s}
                    </button>
                  ))}
                </div>
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand-700)', border: '1px solid var(--color-brand-200)' }}
                      >
                        {s}
                        <button
                          onClick={() => removeSkill(s)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, lineHeight: 1 }}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Experience & Education */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                <input
                  type="number"
                  min="0"
                  placeholder="Min. experience (years)"
                  value={expYears}
                  onChange={(e) => setExpYears(e.target.value)}
                  className="px-3 py-2.5 text-sm rounded-lg border outline-none"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}
                />
                <select
                  value={degreeLevel}
                  onChange={(e) => setDegreeLevel(e.target.value)}
                  className="px-3 py-2.5 text-sm rounded-lg border outline-none"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}
                >
                  <option value="">Degree level (optional)</option>
                  <option value="high_school">High School</option>
                  <option value="associate">Associate</option>
                  <option value="bachelor">Bachelor</option>
                  <option value="master">Master</option>
                  <option value="phd">PhD</option>
                </select>
                <input
                  type="text"
                  placeholder="Field of study"
                  value={field}
                  onChange={(e) => setField(e.target.value)}
                  className="px-3 py-2.5 text-sm rounded-lg border outline-none"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreate}
                  disabled={!title.trim() || !description.trim() || creating}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-40"
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                    border: 'none',
                    cursor: !title.trim() || !description.trim() || creating ? 'not-allowed' : 'pointer',
                  }}
                >
                  {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {creating ? 'Creating...' : 'Create Job'}
                </motion.button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium border"
                  style={{
                    background: 'var(--bg-secondary)',
                    borderColor: 'var(--border-light)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Search ── */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
        <input
          type="text"
          placeholder="Search jobs by title, company, or skill..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border outline-none"
          style={{ background: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}
        />
      </div>

      {/* ── Job List ── */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={32} />}
          title="No jobs found"
          description={jobs.length === 0 ? 'Create your first job description to get started.' : 'No jobs match your search.'}
          action={
            !showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: 'var(--color-brand-500)', border: 'none', cursor: 'pointer' }}
              >
                Create Job
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((j, i) => (
            <motion.div
              key={j.job_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-xl border overflow-hidden"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)', boxShadow: 'var(--shadow-sm)' }}
            >
              <button
                onClick={() => setExpandedId(expandedId === j.job_id ? null : j.job_id)}
                className="w-full flex items-center gap-4 px-4 py-3.5 text-left"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <div
                  className="flex items-center justify-center rounded-lg shrink-0"
                  style={{ width: 36, height: 36, background: '#8b5cf614', color: '#8b5cf6' }}
                >
                  <Briefcase size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {j.title}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                    {j.company || 'No company'} &middot; {j.required_skills.length} skills
                    {j.experience_years ? ` · ${j.experience_years}y+` : ''}
                  </p>
                </div>
                <div className="flex gap-1.5 flex-wrap justify-end max-w-[200px]">
                  {j.required_skills.slice(0, 3).map((s) => (
                    <SkillBadge key={s} skill={s} variant="neutral" />
                  ))}
                  {j.required_skills.length > 3 && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
                      +{j.required_skills.length - 3}
                    </span>
                  )}
                </div>
                {expandedId === j.job_id ? <ChevronUp size={16} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} />}
              </button>

              <AnimatePresence>
                {expandedId === j.job_id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-2" style={{ borderTop: '1px solid var(--border-light)' }}>
                      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Description</p>
                      <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                        {j.description}
                      </p>
                      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                        All Required Skills ({j.required_skills.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {j.required_skills.map((s) => (
                          <SkillBadge key={s} skill={s} variant="neutral" size="md" />
                        ))}
                      </div>
                      {j.education && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Education</p>
                          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                            {j.education.degree_level} in {j.education.field}
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
