import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileUp,
  Briefcase,
  BarChart3,
  ArrowRight,
  TrendingUp,
  Users,
  Sparkles,
  Clock,
  Zap,
  Target,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import StatCard from '../components/StatCard';
import { listResumes, listJobs, getHealth, getStats } from '../api';
import type { Resume, Job, HealthResponse, DashboardStats } from '../types';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
};

/** Build a 7-day activity array from stats, anchored to today. */
function buildActivityData(stats: DashboardStats | null) {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const result: { day: string; resumes: number; jobs: number }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const label = DAYS[d.getDay()];
    result.push({
      day: label,
      resumes: stats?.resume_by_day[label] ?? 0,
      jobs: stats?.jobs_by_day[label] ?? 0,
    });
  }
  return result;
}

/** Compute week-over-week trend string. */
function trend(thisWeek: number, prevWeek: number): { text: string; up: boolean } | null {
  if (prevWeek === 0 && thisWeek === 0) return null;
  if (prevWeek === 0) return { text: '+100%', up: true };
  const pct = ((thisWeek - prevWeek) / prevWeek) * 100;
  const sign = pct >= 0 ? '+' : '';
  return { text: `${sign}${pct.toFixed(1)}%`, up: pct >= 0 };
}

/** Auto-refresh interval (ms). */
const POLL_INTERVAL = 15_000;

function useAnimatedCount(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const interval = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(interval); }
      else setCount(start);
    }, 16);
    return () => clearInterval(interval);
  }, [target, duration]);
  return count;
}

export default function Dashboard() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = () =>
    Promise.all([
      listResumes(1, 5).catch(() => ({ items: [], total: 0, page: 1, per_page: 5 })),
      listJobs(1, 5).catch(() => ({ items: [], total: 0, page: 1, per_page: 5 })),
      getHealth().catch(() => null),
      getStats().catch(() => null),
    ]).then(([rData, jData, h, s]) => {
      setResumes(rData.items);
      setJobs(jData.items);
      setHealth(h);
      setStats(s);
      setLoading(false);
    });

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, POLL_INTERVAL);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalResumes = stats?.total_resumes ?? 0;
  const totalJobs = stats?.total_jobs ?? 0;
  const animResumes = useAnimatedCount(totalResumes);
  const animJobs = useAnimatedCount(totalJobs);
  const resumeTrend = trend(stats?.this_week_resumes ?? 0, stats?.prev_week_resumes ?? 0);
  const jobTrend = trend(stats?.this_week_jobs ?? 0, stats?.prev_week_jobs ?? 0);
  const activityData = buildActivityData(stats);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      {/* ── Greeting Hero ── */}
      <motion.div variants={item} className="mb-6">
        <div
          className="rounded-3xl relative overflow-hidden p-8 sm:p-10"
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(124, 58, 237, 0.06), var(--bg-secondary))',
            border: '1px solid var(--border-light)',
          }}
        >
          {/* Decorative glow — inset so overflow-hidden doesn't clip harshly */}
          <div
            className="absolute -top-10 -right-10 rounded-full pointer-events-none"
            style={{ width: 200, height: 200, background: 'rgba(139, 92, 246, 0.08)', filter: 'blur(60px)' }}
          />
          <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div
                  className="flex items-center justify-center rounded-2xl shrink-0"
                  style={{
                    width: 44, height: 44,
                    background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                    boxShadow: 'var(--shadow-glow-brand)',
                  }}
                >
                  <Sparkles size={20} color="#fff" />
                </div>
                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ background: 'rgba(139, 92, 246, 0.12)', color: 'var(--color-brand-300)' }}
                >
                  Welcome back
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {greeting}, HR Manager
              </h1>
              <p className="text-sm mt-2 max-w-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Your hiring pipeline is ready. Upload resumes, create jobs, and let AI score the matches.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="hidden sm:flex items-center gap-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                <Clock size={14} />
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
              <div
                className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full"
                style={{
                  background: health?.status === 'healthy' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                  color: health?.status === 'healthy' ? '#34d399' : '#fbbf24',
                }}
              >
                <div
                  className="rounded-full"
                  style={{
                    width: 6, height: 6,
                    background: health?.status === 'healthy' ? '#34d399' : '#fbbf24',
                    animation: 'badge-pulse 2s ease-in-out infinite',
                  }}
                />
                {health?.status === 'healthy' ? 'Engine Online' : loading ? 'Connecting...' : 'Engine Offline'}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Stats ── */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <StatCard icon={<Users size={20} />} label="Total Resumes" value={animResumes} sub="Candidates uploaded" color="#a78bfa" trend={resumeTrend?.text} trendUp={resumeTrend?.up} delay={0} />
        <StatCard icon={<Briefcase size={20} />} label="Active Jobs" value={animJobs} sub="Open positions" color="#34d399" trend={jobTrend?.text} trendUp={jobTrend?.up} delay={0.06} />
        <StatCard icon={<Target size={20} />} label="This Week" value={(stats?.this_week_resumes ?? 0) + (stats?.this_week_jobs ?? 0)} sub="Uploads this week" color="#fb7185" delay={0.12} />
        <StatCard icon={<Zap size={20} />} label="Last Week" value={(stats?.prev_week_resumes ?? 0) + (stats?.prev_week_jobs ?? 0)} sub="Uploads last week" color="#38bdf8" delay={0.18} />
      </motion.div>

      {/* ── Quick Actions — Primary / Secondary / Tertiary hierarchy ── */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        {/* Primary CTA — Run Matching (the main engine action) */}
        <Link to="/match" className="no-underline">
          <motion.div
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="rounded-2xl p-5 flex items-center gap-4 cursor-pointer text-white"
            style={{
              background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
              boxShadow: 'var(--shadow-glow-brand)',
            }}
          >
            <div
              className="flex items-center justify-center rounded-xl shrink-0"
              style={{ width: 42, height: 42, background: 'rgba(255,255,255,0.18)' }}
            >
              <BarChart3 size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Run Matching</p>
              <p className="text-xs opacity-70 mt-0.5">AI-powered scoring</p>
            </div>
            <ArrowRight size={16} className="opacity-50 shrink-0" />
          </motion.div>
        </Link>

        {/* Secondary — Upload Resumes */}
        <Link to="/resumes" className="no-underline">
          <motion.div
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="rounded-2xl p-5 flex items-center gap-4 cursor-pointer"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div
              className="flex items-center justify-center rounded-xl shrink-0"
              style={{ width: 42, height: 42, background: 'rgba(167, 139, 250, 0.12)', color: '#a78bfa' }}
            >
              <FileUp size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Upload Resumes</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>PDF, DOCX, or TXT</p>
            </div>
            <ArrowRight size={16} className="shrink-0" style={{ color: 'var(--text-tertiary)' }} />
          </motion.div>
        </Link>

        {/* Tertiary — Create Job */}
        <Link to="/jobs" className="no-underline">
          <motion.div
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="rounded-2xl p-5 flex items-center gap-4 cursor-pointer"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div
              className="flex items-center justify-center rounded-xl shrink-0"
              style={{ width: 42, height: 42, background: 'rgba(52, 211, 153, 0.12)', color: '#34d399' }}
            >
              <Briefcase size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Create Job</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Define a position</p>
            </div>
            <ArrowRight size={16} className="shrink-0" style={{ color: 'var(--text-tertiary)' }} />
          </motion.div>
        </Link>
      </motion.div>

      {/* ── Chart + Pipeline ── */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-10">
        {/* Activity Chart */}
        <div
          className="lg:col-span-3 rounded-2xl p-6"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Weekly Activity</h3>
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Uploads over the last 7 days</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#a78bfa' }} />
                <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Resumes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#34d399' }} />
                <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Jobs</span>
              </div>
            </div>
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradResumes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradJobs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card-solid)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 12,
                    fontSize: 12,
                    boxShadow: 'var(--shadow-lg)',
                    color: 'var(--text-primary)',
                  }}
                />
                <Area type="monotone" dataKey="resumes" stroke="#a78bfa" strokeWidth={2.5} fill="url(#gradResumes)" />
                <Area type="monotone" dataKey="jobs" stroke="#34d399" strokeWidth={2.5} fill="url(#gradJobs)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline Summary */}
        <div
          className="lg:col-span-2 rounded-2xl p-6 flex flex-col"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
        >
          <h3 className="text-sm font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>Pipeline Summary</h3>
          <div className="flex flex-col gap-3 flex-1">
            {[
              { label: 'Resumes Uploaded', value: totalResumes, color: '#a78bfa', icon: <FileUp size={15} /> },
              { label: 'Jobs Created', value: totalJobs, color: '#34d399', icon: <Briefcase size={15} /> },
              { label: 'This Week', value: (stats?.this_week_resumes ?? 0) + (stats?.this_week_jobs ?? 0), color: '#fb7185', icon: <BarChart3 size={15} /> },
              { label: 'Last Week', value: (stats?.prev_week_resumes ?? 0) + (stats?.prev_week_jobs ?? 0), color: '#38bdf8', icon: <TrendingUp size={15} /> },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: `${row.color}0a`, border: `1px solid ${row.color}12` }}
              >
                <div
                  className="flex items-center justify-center rounded-lg shrink-0"
                  style={{ width: 34, height: 34, background: `${row.color}14`, color: row.color }}
                >
                  {row.icon}
                </div>
                <span className="flex-1 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                <span className="text-sm font-bold tabular-nums text-right min-w-[2.5rem]" style={{ color: 'var(--text-primary)' }}>{row.value}</span>
              </div>
            ))}
          </div>
          <Link
            to="/match"
            className="mt-5 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold no-underline transition-all"
            style={{
              background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
              color: '#fff',
              boxShadow: 'var(--shadow-glow-brand)',
            }}
          >
            <Zap size={15} /> Start Matching
          </Link>
        </div>
      </motion.div>

      {/* ── Recent Activity ── */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Resumes */}
        <div
          className="rounded-2xl p-6"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Resumes</h3>
            <Link
              to="/resumes"
              className="text-xs font-medium no-underline flex items-center gap-1 transition-colors"
              style={{ color: 'var(--color-brand-300)' }}
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {resumes.length === 0 ? (
            <div className="flex flex-col items-center py-10">
              <div
                className="flex items-center justify-center rounded-2xl mb-3"
                style={{ width: 52, height: 52, background: 'rgba(167, 139, 250, 0.08)' }}
              >
                <FileUp size={22} style={{ color: 'var(--text-tertiary)' }} />
              </div>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {loading ? 'Loading...' : 'No resumes uploaded yet'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {resumes.slice(0, 5).map((r, i) => (
                <motion.div
                  key={r.resume_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-default"
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div
                    className="flex items-center justify-center rounded-full text-xs font-bold shrink-0"
                    style={{ width: 36, height: 36, background: 'rgba(167, 139, 250, 0.12)', color: '#a78bfa' }}
                  >
                    {r.candidate_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{r.candidate_name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{r.skills.slice(0, 3).join(', ') || 'No skills extracted'}</p>
                  </div>
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }}
                  >
                    .{r.source_format}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Jobs */}
        <div
          className="rounded-2xl p-6"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Jobs</h3>
            <Link
              to="/jobs"
              className="text-xs font-medium no-underline flex items-center gap-1 transition-colors"
              style={{ color: '#34d399' }}
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center py-10">
              <div
                className="flex items-center justify-center rounded-2xl mb-3"
                style={{ width: 52, height: 52, background: 'rgba(52, 211, 153, 0.06)' }}
              >
                <Briefcase size={22} style={{ color: 'var(--text-tertiary)' }} />
              </div>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {loading ? 'Loading...' : 'No jobs created yet'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {jobs.slice(0, 5).map((j, i) => (
                <motion.div
                  key={j.job_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-default"
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div
                    className="flex items-center justify-center rounded-full shrink-0"
                    style={{ width: 36, height: 36, background: 'rgba(52, 211, 153, 0.1)', color: '#34d399' }}
                  >
                    <Briefcase size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{j.title}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{j.company || 'No company'} · {j.required_skills.length} skills</p>
                  </div>
                  {j.experience_years && (
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(52, 211, 153, 0.08)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.15)' }}
                    >
                      {j.experience_years}y+
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
