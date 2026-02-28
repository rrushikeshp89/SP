import { motion } from 'framer-motion';

interface ScoreBarProps {
  label: string;
  score: number;
  weight: number;
  weightedScore: number;
}

function getColor(score: number): string {
  if (score >= 75) return '#10b981';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

export default function ScoreBar({ label, score, weight, weightedScore }: ScoreBarProps) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="text-xs font-semibold w-20 text-right shrink-0"
        style={{ color: 'var(--text-secondary)' }}
      >
        {label}
      </span>
      <div
        className="flex-1 h-2.5 rounded-full overflow-hidden"
        style={{ background: 'var(--bg-tertiary)' }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${getColor(score)}aa, ${getColor(score)})`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
        />
      </div>
      <span className="text-xs font-bold w-10 text-right" style={{ color: getColor(score) }}>
        {score.toFixed(0)}
      </span>
      <span className="text-[11px] w-16 text-right" style={{ color: 'var(--text-tertiary)' }}>
        ×{weight} = {weightedScore.toFixed(1)}
      </span>
    </div>
  );
}
