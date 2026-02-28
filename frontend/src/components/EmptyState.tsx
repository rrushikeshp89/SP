import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <div
        className="flex items-center justify-center rounded-2xl mb-5"
        style={{
          width: 72,
          height: 72,
          background: 'rgba(167, 139, 250, 0.1)',
          color: 'var(--color-brand-400)',
        }}
      >
        {icon}
      </div>
      <h3
        className="text-lg font-semibold mb-2"
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </h3>
      <p
        className="text-sm max-w-md mb-6"
        style={{ color: 'var(--text-secondary)' }}
      >
        {description}
      </p>
      {action}
    </motion.div>
  );
}
