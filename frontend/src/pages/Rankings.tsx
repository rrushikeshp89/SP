import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Trophy,
  Loader2,
  Download,
  GitCompareArrows,
  AlertTriangle,
  Lightbulb,
  Settings2,
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { listResumes, listJobs, scoreBatch, exportCSV, listProfiles } from '../api';
import ScoreRing from '../components/ScoreRing';
import ScoreBar from '../components/ScoreBar';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import CustomSelect from '../components/CustomSelect';
import type { SelectOption } from '../components/CustomSelect';
import { useToast } from '../components/Toast';
import { useBlindMode } from '../BlindModeContext';
import type { Resume, Job, BatchScoreResponse, RankedCandidate, ScoringProfile, GapItem } from '../types';

const COMPARE_COLORS = ['#7c3aed', '#10b981', '#f59e0b'];

export default function Rankings() {
  const toast = useToast();
  const { mask } = useBlindMode();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [profiles, setProfiles] = useState<ScoringProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState('');
  const [selectedProfile, setSelectedProfile] = useState('');
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState<BatchScoreResponse | null>(null);
  const [selected, setSelected] = useState<RankedCandidate | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      listResumes(1, 200).catch(() => ({ items: [] as Resume[], total: 0, page: 1, per_page: 200 })),
      listJobs(1, 200).catch(() => ({ items: [] as Job[], total: 0, page: 1, per_page: 200 })),
      listProfiles().catch(() => [] as ScoringProfile[]),
    ]).then(([r, j, p]) => {
      setResumes(r.items);
      setJobs(j.items);
      setProfiles(p);
      setLoading(false);
    });
  }, []);

  const handleRank = async () => {
    if (!selectedJob) return;
    setScoring(true);
    setResult(null);
    setSelected(null);
    setCompareIds([]);
    try {
      const res = await scoreBatch(selectedJob, resumes.map((r) => r.resume_id), selectedProfile || undefined);
      setResult(res);
      if (res.ranked_candidates.length > 0) setSelected(res.ranked_candidates[0]);
    } catch (err: any) {
      toast.error('Ranking failed', err?.response?.data?.detail || 'Something went wrong.');
    } finally {
      setScoring(false);
    }
  };

  const handleExport = async () => {
    if (!selectedJob) return;
    try {
      await exportCSV(selectedJob, selectedProfile || undefined);
      toast.success('CSV downloaded');
    } catch {
      toast.error('Export failed');
    }
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 3
          ? [...prev, id]
          : prev,
    );
  };

  const compareCandidates = result
    ? result.ranked_candidates.filter((c) => compareIds.includes(c.resume_id))
    : [];

  const compareRadarData = compareCandidates.length > 0
    ? ['Semantic', 'Skills', 'Experience', 'Education'].map((axis) => {
        const point: Record<string, unknown> = { axis };
        compareCandidates.forEach((c, i) => {
          const key = axis.toLowerCase() as 'semantic' | 'skills' | 'experience' | 'education';
          point[`c${i}`] = c.breakdown[key].score;
        });
        return point;
      })
    : [];

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

        {profiles.length > 0 && (
          <div className="flex items-center gap-2">
            <Settings2 size={14} style={{ color: 'var(--text-tertiary)' }} />
            <select
              value={selectedProfile}
              onChange={(e) => setSelectedProfile(e.target.value)}
              className="px-3 py-2.5 text-sm rounded-lg border outline-none"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}
            >
              <option value="">Default weights</option>
              {profiles.map((p) => (
                <option key={p.profile_id} value={p.profile_id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

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

        {result && (
          <>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <Download size={14} /> Export CSV
            </button>
            <button
              onClick={() => { setCompareMode(!compareMode); setCompareIds([]); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: compareMode ? 'rgba(124,58,237,0.1)' : 'var(--bg-secondary)',
                border: `1px solid ${compareMode ? '#7c3aed' : 'var(--border-light)'}`,
                color: compareMode ? '#7c3aed' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              <GitCompareArrows size={14} /> {compareMode ? 'Exit Compare' : 'Compare'}
            </button>
          </>
        )}
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
                {result.ranked_candidates.map((c, idx) => (
                  <button
                    key={c.resume_id}
                    onClick={() => compareMode ? toggleCompare(c.resume_id) : setSelected(c)}
                    className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
                    style={{
                      background: compareMode
                        ? compareIds.includes(c.resume_id) ? 'rgba(124,58,237,0.08)' : 'transparent'
                        : selected?.resume_id === c.resume_id ? 'var(--bg-secondary)' : 'transparent',
                      borderBottom: '1px solid var(--border-light)',
                      border: 'none',
                      borderBlockEnd: '1px solid var(--border-light)',
                      cursor: 'pointer',
                    }}
                  >
                    {compareMode && (
                      <input
                        type="checkbox"
                        checked={compareIds.includes(c.resume_id)}
                        readOnly
                        style={{ accentColor: '#7c3aed' }}
                      />
                    )}
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
                        {mask(c.candidate_name, idx)}
                      </p>
                    </div>
                    <ScoreRing score={c.overall_score} size={40} strokeWidth={4} animate={false} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Detail / Compare */}
          <div className="lg:col-span-2">
            {/* ── Comparison View ── */}
            {compareMode && compareCandidates.length >= 2 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border p-6"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)', boxShadow: 'var(--shadow-md)' }}
              >
                <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  Comparing {compareCandidates.length} Candidates
                </h3>

                {/* Side-by-side scores */}
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${compareCandidates.length}, 1fr)` }}>
                  {compareCandidates.map((c, i) => (
                    <div
                      key={c.resume_id}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl"
                      style={{ background: 'var(--bg-secondary)', border: `2px solid ${COMPARE_COLORS[i]}30` }}
                    >
                      <ScoreRing score={c.overall_score} size={80} strokeWidth={7} label="Score" />
                      <p className="text-sm font-semibold text-center" style={{ color: COMPARE_COLORS[i] }}>
                        {mask(c.candidate_name, i)}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Rank #{c.rank}</p>
                    </div>
                  ))}
                </div>

                {/* Overlay radar */}
                <div className="mt-6" style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={compareRadarData}>
                      <PolarGrid stroke="var(--border-light)" />
                      <PolarAngleAxis dataKey="axis" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} />
                      {compareCandidates.map((c, i) => (
                        <Radar
                          key={c.resume_id}
                          name={mask(c.candidate_name, i)}
                          dataKey={`c${i}`}
                          stroke={COMPARE_COLORS[i]}
                          fill={COMPARE_COLORS[i]}
                          fillOpacity={0.15}
                          strokeWidth={2}
                        />
                      ))}
                      <Tooltip
                        contentStyle={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-light)',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Score breakdown table */}
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm" style={{ color: 'var(--text-primary)' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <th className="text-left py-2 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Component</th>
                        {compareCandidates.map((c, i) => (
                          <th key={c.resume_id} className="text-center py-2 text-xs font-semibold" style={{ color: COMPARE_COLORS[i] }}>
                            {mask(c.candidate_name, i)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(['semantic', 'skills', 'experience', 'education'] as const).map((key) => (
                        <tr key={key} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td className="py-2 capitalize">{key}</td>
                          {compareCandidates.map((c) => (
                            <td key={c.resume_id} className="text-center py-2 font-medium">
                              {Math.round(c.breakdown[key].score)}%
                            </td>
                          ))}
                        </tr>
                      ))}
                      <tr className="font-bold">
                        <td className="py-2">Overall</td>
                        {compareCandidates.map((c) => (
                          <td key={c.resume_id} className="text-center py-2">{Math.round(c.overall_score)}%</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ) : compareMode ? (
              <EmptyState
                icon={<GitCompareArrows size={32} />}
                title="Select 2-3 candidates"
                description="Check candidates from the list to compare them side by side."
              />
            ) : selected ? (
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
                      {mask(selected.candidate_name, (selected.rank ?? 1) - 1)}
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

                {/* AI Explanation */}
                {selected.explanation && (
                  <div
                    className="mt-4 p-4 rounded-lg flex items-start gap-3"
                    style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(99,102,241,0.06))', border: '1px solid rgba(124,58,237,0.12)' }}
                  >
                    <Lightbulb size={18} className="shrink-0 mt-0.5" style={{ color: '#7c3aed' }} />
                    <div>
                      <p className="text-xs font-bold mb-1 uppercase tracking-wide" style={{ color: '#7c3aed' }}>
                        AI Explanation
                      </p>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                        {selected.explanation}
                      </p>
                    </div>
                  </div>
                )}

                {/* Gap Report */}
                {selected.gap_report && selected.gap_report.length > 0 && (
                  <div className="mt-4 p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                    <p className="text-xs font-semibold mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <AlertTriangle size={13} /> Skill Gap Report
                    </p>
                    <div className="flex flex-col gap-2">
                      {selected.gap_report.map((g: GapItem, i: number) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-3 rounded-lg"
                          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-light)' }}
                        >
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 mt-0.5"
                            style={{
                              background:
                                g.impact === 'high' ? '#ef444418' :
                                g.impact === 'medium' ? '#f59e0b18' :
                                g.impact === 'info' ? '#7c3aed18' : '#10b98118',
                              color:
                                g.impact === 'high' ? '#ef4444' :
                                g.impact === 'medium' ? '#f59e0b' :
                                g.impact === 'info' ? '#7c3aed' : '#10b981',
                            }}
                          >
                            {g.impact}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                              {g.category}: {g.item}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                              {g.recommendation}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
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
