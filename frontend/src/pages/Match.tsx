import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Briefcase,
  Loader2,
  Users,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { listResumes, listJobs, scoreOne, scoreBatch } from '../api';
import ScoreRing from '../components/ScoreRing';
import ScoreBar from '../components/ScoreBar';
import SkillBadge from '../components/SkillBadge';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import CustomSelect from '../components/CustomSelect';
import type { SelectOption } from '../components/CustomSelect';
import { useToast } from '../components/Toast';
import type { Resume, Job, ScoreResponse, BatchScoreResponse } from '../types';

type Mode = 'single' | 'batch';

export default function Match() {
  const toast = useToast();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<Mode>('single');
  const [selectedResume, setSelectedResume] = useState('');
  const [selectedJob, setSelectedJob] = useState('');
  const [selectedResumes, setSelectedResumes] = useState<string[]>([]);

  const [scoring, setScoring] = useState(false);
  const [singleResult, setSingleResult] = useState<ScoreResponse | null>(null);
  const [batchResult, setBatchResult] = useState<BatchScoreResponse | null>(null);

  useEffect(() => {
    Promise.all([
      listResumes(1, 200).catch(() => ({ items: [] as Resume[], total: 0, page: 1, per_page: 200 })),
      listJobs(1, 200).catch(() => ({ items: [] as Job[], total: 0, page: 1, per_page: 200 })),
    ]).then(([r, j]) => {
      setResumes(r.items);
      setJobs(j.items);
      setLoading(false);
    });
  }, []);

  const toggleResumeSelection = (id: string) => {
    setSelectedResumes((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  };

  const handleScore = async () => {
    setSingleResult(null);
    setBatchResult(null);
    setScoring(true);

    try {
      if (mode === 'single') {
        const res = await scoreOne(selectedResume, selectedJob);
        setSingleResult(res);
      } else {
        const res = await scoreBatch(selectedJob, selectedResumes.length ? selectedResumes : resumes.map((r) => r.resume_id));
        setBatchResult(res);
      }
    } catch (err: any) {
      toast.error('Scoring failed', err?.response?.data?.detail || 'Something went wrong.');
    } finally {
      setScoring(false);
    }
  };

  const canScore =
    mode === 'single'
      ? selectedResume && selectedJob
      : selectedJob && (selectedResumes.length > 0 || resumes.length > 0);

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Match & Score"
          description="Compare resumes against job descriptions and get detailed fit scores."
          icon={<BarChart3 size={22} />}
        />
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 size={28} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
        </div>
      </div>
    );
  }

  if (resumes.length === 0 || jobs.length === 0) {
    return (
      <div>
        <PageHeader
          title="Match & Score"
          description="Compare resumes against job descriptions and get detailed fit scores."
          icon={<BarChart3 size={22} />}
        />
        <div className="flex items-center justify-center min-h-[50vh]">
          <EmptyState
            icon={<BarChart3 size={32} />}
            title="Upload data first"
            description={
              resumes.length === 0
                ? 'You need at least one resume to start matching.'
                : 'You need at least one job description to start matching.'
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Match & Score"
        description="Compare resumes against job descriptions and get detailed fit scores."
        icon={<BarChart3 size={22} />}
        badge="AI-Powered"
        badgeColor="#10b981"
      />

      {/* Mode Tabs */}
      <div
        className="inline-flex rounded-lg p-1 mb-6"
        style={{ background: 'var(--bg-tertiary)' }}
      >
        {(['single', 'batch'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setSingleResult(null); setBatchResult(null); }}
            className="px-4 py-2 rounded-md text-sm font-medium transition-all"
            style={{
              background: mode === m ? 'var(--bg-card)' : 'transparent',
              color: mode === m ? 'var(--text-primary)' : 'var(--text-tertiary)',
              boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {m === 'single' ? '1:1 Match' : 'Batch Ranking'}
          </button>
        ))}
      </div>

      {/* ── Selection Panel ── */}
      <div
        className="rounded-xl border p-5 mb-6"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)', boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Job Select */}
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--text-secondary)' }}>
              Select Job Description
            </label>
            <CustomSelect
              value={selectedJob}
              onChange={setSelectedJob}
              placeholder="Choose a job…"
              searchable={jobs.length > 5}
              icon={<Briefcase size={15} />}
              options={jobs.map((j): SelectOption => ({
                value: j.job_id,
                label: j.title,
                sub: j.company || undefined,
              }))}
            />
          </div>

          {/* Resume Select (single) / Multi-select (batch) */}
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--text-secondary)' }}>
              {mode === 'single' ? 'Select Resume' : `Select Resumes (${selectedResumes.length || 'all'})`}
            </label>
            {mode === 'single' ? (
              <CustomSelect
                value={selectedResume}
                onChange={setSelectedResume}
                placeholder="Choose a resume…"
                searchable={resumes.length > 5}
                icon={<Users size={15} />}
                options={resumes.map((r): SelectOption => ({
                  value: r.resume_id,
                  label: r.candidate_name,
                  sub: `${r.skills.length} skills`,
                }))}
              />
            ) : (
              <div
                className="max-h-40 overflow-y-auto rounded-lg border p-2 flex flex-col gap-1"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-light)' }}
              >
                {resumes.map((r) => (
                  <label
                    key={r.resume_id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm hover:bg-white/50"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedResumes.includes(r.resume_id)}
                      onChange={() => toggleResumeSelection(r.resume_id)}
                    />
                    {r.candidate_name}
                    <span className="text-xs ml-auto" style={{ color: 'var(--text-tertiary)' }}>
                      {r.skills.length} skills
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Score Button */}
        <div className="mt-5 flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleScore}
            disabled={!canScore || scoring}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, #34d399, #10b981)',
              border: 'none',
              cursor: canScore && !scoring ? 'pointer' : 'not-allowed',
            }}
          >
            {scoring ? (
              <><Loader2 size={16} className="animate-spin" /> Scoring...</>
            ) : (
              <><Zap size={16} /> {mode === 'single' ? 'Score Match' : 'Rank All'}</>
            )}
          </motion.button>
        </div>
      </div>

      {/* ── Single Result ── */}
      <AnimatePresence>
        {singleResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border p-6"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)', boxShadow: 'var(--shadow-md)' }}
          >
            <div className="flex items-start gap-8">
              {/* Score ring */}
              <ScoreRing score={singleResult.overall_score} size={130} strokeWidth={10} label="Fit Score" />

              {/* Breakdown */}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  Score Breakdown
                </h3>
                <div className="flex flex-col gap-3">
                  <ScoreBar
                    label="Semantic"
                    score={singleResult.breakdown.semantic.score}
                    weight={singleResult.breakdown.semantic.weight}
                    weightedScore={singleResult.breakdown.semantic.weighted_score}
                  />
                  <ScoreBar
                    label="Skills"
                    score={singleResult.breakdown.skills.score}
                    weight={singleResult.breakdown.skills.weight}
                    weightedScore={singleResult.breakdown.skills.weighted_score}
                  />
                  <ScoreBar
                    label="Experience"
                    score={singleResult.breakdown.experience.score}
                    weight={singleResult.breakdown.experience.weight}
                    weightedScore={singleResult.breakdown.experience.weighted_score}
                  />
                  <ScoreBar
                    label="Education"
                    score={singleResult.breakdown.education.score}
                    weight={singleResult.breakdown.education.weight}
                    weightedScore={singleResult.breakdown.education.weighted_score}
                  />
                </div>
              </div>
            </div>

            {/* Skills analysis */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-success)' }}>
                  Matched Skills ({singleResult.matched_skills.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {singleResult.matched_skills.map((s) => (
                    <SkillBadge key={s} skill={s} variant="matched" />
                  ))}
                  {singleResult.matched_skills.length === 0 && (
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>None</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-danger)' }}>
                  Missing Skills ({singleResult.missing_skills.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {singleResult.missing_skills.map((s) => (
                    <SkillBadge key={s} skill={s} variant="missing" />
                  ))}
                  {singleResult.missing_skills.length === 0 && (
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>None</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-warning)' }}>
                  Partial Matches ({singleResult.partially_matched.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {singleResult.partially_matched.map((p) => (
                    <SkillBadge key={p.required} skill={`${p.required} ≈ ${p.has}`} variant="partial" />
                  ))}
                  {singleResult.partially_matched.length === 0 && (
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>None</span>
                  )}
                </div>
              </div>
            </div>

            {/* Suggestions */}
            {singleResult.suggestions.length > 0 && (
              <div className="mt-5 p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Improvement Suggestions
                </p>
                <ul className="flex flex-col gap-1.5">
                  {singleResult.suggestions.map((s, i) => (
                    <li key={i} className="text-sm flex items-start gap-2" style={{ color: 'var(--text-primary)' }}>
                      <ChevronRight size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--color-brand-500)' }} />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs mt-3 text-right" style={{ color: 'var(--text-tertiary)' }}>
              Score computed
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Batch Result ── */}
      <AnimatePresence>
        {batchResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                Ranked Candidates ({batchResult.total_candidates})
              </h3>
            </div>
            <div className="flex flex-col gap-3">
              {batchResult.ranked_candidates.map((c, i) => (
                <motion.div
                  key={c.resume_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border px-5 py-4 flex items-center gap-5"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)', boxShadow: 'var(--shadow-sm)' }}
                >
                  {/* Rank */}
                  <div
                    className="flex items-center justify-center rounded-full text-sm font-bold shrink-0"
                    style={{
                      width: 36,
                      height: 36,
                      background:
                        c.rank === 1 ? '#f59e0b14' : c.rank === 2 ? '#94a3b814' : c.rank === 3 ? '#cd7f3214' : 'var(--bg-tertiary)',
                      color:
                        c.rank === 1 ? '#f59e0b' : c.rank === 2 ? '#94a3b8' : c.rank === 3 ? '#cd7f32' : 'var(--text-tertiary)',
                    }}
                  >
                    #{c.rank}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {c.candidate_name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {c.suggestions[0] || 'No suggestions'}
                    </p>
                  </div>

                  {/* Score */}
                  <ScoreRing score={c.overall_score} size={56} strokeWidth={5} animate={true} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
