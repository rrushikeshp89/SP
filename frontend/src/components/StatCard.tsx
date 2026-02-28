import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  trend?: string;
  trendUp?: boolean;
  delay?: number;
}

export default function StatCard({
  icon,
  label,
  value,
  sub,
  color = '#a78bfa',
  trend,
  trendUp,
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
      className="glass-card p-6 flex items-start gap-4"
      style={{ cursor: 'default' }}
    >
      <div
        className="flex items-center justify-center rounded-2xl shrink-0"
        style={{
          width: 48,
          height: 48,
          background: `${color}18`,
          color,
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
          {label}
        </p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {value}
          </p>
          {trend && (
            <span
              className="text-xs font-semibold"
              style={{ color: trendUp ? 'var(--color-success)' : 'var(--color-danger)' }}
            >
              {trendUp ? '↑' : '↓'} {trend}
            </span>
          )}
        </div>
        {sub && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {sub}
          </p>
        )}
      </div>
    </motion.div>
  );
}
