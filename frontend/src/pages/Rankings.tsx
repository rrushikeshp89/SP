import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Trophy,
  Loader2,
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { listResumes, listJobs, scoreBatch } from '../api';
import ScoreRing from '../components/ScoreRing';
import ScoreBar from '../components/ScoreBar';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import CustomSelect from '../components/CustomSelect';
import type { SelectOption } from '../components/CustomSelect';
import { useToast } from '../components/Toast';
import type { Resume, Job, BatchScoreResponse, RankedCandidate } from '../types';

export default function Rankings() {
  const toast = useToast();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState('');
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState<BatchScoreResponse | null>(null);
  const [selected, setSelected] = useState<RankedCandidate | null>(null);

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

  const handleRank = async () => {
    if (!selectedJob) return;
    setScoring(true);
    setResult(null);
    setSelected(null);
    try {
      const res = await scoreBatch(selectedJob, resumes.map((r) => r.resume_id));
      setResult(res);
      if (res.ranked_candidates.length > 0) setSelected(res.ranked_candidates[0]);
    } catch (err: any) {
      toast.error('Ranking failed', err?.response?.data?.detail || 'Something went wrong.');
    } finally {
      setScoring(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Candidate Rankings"
          description="Rank all candidates for a position with detailed comparison."
          icon={<Trophy size={22} />}
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
          title="Candidate Rankings"
          description="Rank all candidates for a position with detailed comparison."
          icon={<Trophy size={22} />}
        />
        <div className="flex items-center justify-center min-h-[50vh]">
          <EmptyState
            icon={<Trophy size={32} />}
            title="Not enough data"
            description="Upload resumes and create job descriptions first."
          />
        </div>
      </div>
    );
  }

  const radarData = selected
    ? [
        { axis: 'Semantic', value: selected.breakdown.semantic.score },
        { axis: 'Skills', value: selected.breakdown.skills.score },
        { axis: 'Experience', value: selected.breakdown.experience.score },
        { axis: 'Education', value: selected.breakdown.education.score },
      ]
    : [];

  return (
    <div>
      <PageHeader
        title="Candidate Rankings"
        description="Rank all candidates for a position with detailed comparison."
        icon={<Trophy size={22} />}
        badge={result ? `${result.total_candidates} ranked` : undefined}
        badgeColor="#a78bfa"
      />

      {/* Controls */}
      <div
        className="rounded-xl border p-5 mb-6 flex items-end gap-4 flex-wrap"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)', boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--text-secondary)' }}>
            Job Position
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
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleRank}
          disabled={!selectedJob || scoring}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-40"
          style={{
            background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
            border: 'none',
            cursor: selectedJob && !scoring ? 'pointer' : 'not-allowed',
          }}
        >
          {scoring ? <Loader2 size={16} className="animate-spin" /> : <Trophy size={16} />}
          {scoring ? 'Ranking...' : 'Rank Candidates'}
        </motion.button>
      </div>

      {/* Results */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Ranking table */}
          <div className="lg:col-span-1">
            <div
              className="rounded-xl border overflow-hidden"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)', boxShadow: 'var(--shadow-sm)' }}
            >
              <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-light)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {result.total_candidates} Candidates
                </p>
              </div>
              <div className="max-h-[500px] overflow-y-auto">
                {result.ranked_candidates.map((c) => (
                  <button
                    key={c.resume_id}
                    onClick={() => setSelected(c)}
                    className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
                    style={{
                      background: selected?.resume_id === c.resume_id ? 'var(--bg-secondary)' : 'transparent',
                      borderBottom: '1px solid var(--border-light)',
                      border: 'none',
                      borderBlockEnd: '1px solid var(--border-light)',
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      className="text-xs font-bold rounded-full flex items-center justify-center shrink-0"
                      style={{
                        width: 28,
                        height: 28,
                        background:
                          c.rank === 1 ? '#f59e0b20' : c.rank === 2 ? '#94a3b820' : c.rank === 3 ? '#cd7f3220' : 'var(--bg-tertiary)',
                        color:
                          c.rank === 1 ? '#f59e0b' : c.rank === 2 ? '#94a3b8' : c.rank === 3 ? '#cd7f32' : 'var(--text-tertiary)',
                      }}
                    >
                      {c.rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {c.candidate_name}
                      </p>
                    </div>
                    <ScoreRing score={c.overall_score} size={40} strokeWidth={4} animate={false} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Detail */}
          <div className="lg:col-span-2">
            {selected ? (
              <motion.div
                key={selected.resume_id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-xl border p-6"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)', boxShadow: 'var(--shadow-md)' }}
              >
                <div className="flex items-start gap-6 mb-6">
                  <ScoreRing score={selected.overall_score} size={110} strokeWidth={9} label="Fit Score" />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                      {selected.candidate_name}
                    </h3>
                    <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                      Rank #{selected.rank} of {result.total_candidates}
                    </p>

                    <div className="flex flex-col gap-2.5">
                      <ScoreBar
                        label="Semantic"
                        score={selected.breakdown.semantic.score}
                        weight={selected.breakdown.semantic.weight}
                        weightedScore={selected.breakdown.semantic.weighted_score}
                      />
                      <ScoreBar
                        label="Skills"
                        score={selected.breakdown.skills.score}
                        weight={selected.breakdown.skills.weight}
                        weightedScore={selected.breakdown.skills.weighted_score}
                      />
                      <ScoreBar
                        label="Experience"
                        score={selected.breakdown.experience.score}
                        weight={selected.breakdown.experience.weight}
                        weightedScore={selected.breakdown.experience.weighted_score}
                      />
                      <ScoreBar
                        label="Education"
                        score={selected.breakdown.education.score}
                        weight={selected.breakdown.education.weight}
                        weightedScore={selected.breakdown.education.weighted_score}
                      />
                    </div>
                  </div>
                </div>

                {/* Radar Chart */}
                <div className="mb-5" style={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="var(--border-light)" />
                      <PolarAngleAxis
                        dataKey="axis"
                        tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                      />
                      <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
                      />
                      <Radar
                        name="Score"
                        dataKey="value"
                        stroke="#a78bfa"
                        fill="#a78bfa"
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-light)',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Suggestions */}
                {selected.suggestions.length > 0 && (
                  <div className="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Suggestions
                    </p>
                    <ul className="flex flex-col gap-1">
                      {selected.suggestions.map((s, i) => (
                        <li key={i} className="text-sm" style={{ color: 'var(--text-primary)' }}>
                          • {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            ) : (
              <EmptyState
                icon={<Trophy size={32} />}
                title="Select a candidate"
                description="Click on a candidate from the list to view their details."
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
