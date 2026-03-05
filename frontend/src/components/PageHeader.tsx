import { motion } from 'framer-motion';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  badge?: string;
  badgeColor?: string;
}

const BREADCRUMB_MAP: Record<string, string> = {
  '/': 'Dashboard',
  '/resumes': 'Resumes',
  '/jobs': 'Jobs',
  '/match': 'Match & Score',
  '/rankings': 'Rankings',
  '/pipeline': 'Pipeline',
};

export default function PageHeader({
  title,
  description,
  icon,
  actions,
  badge,
  badgeColor = 'var(--color-brand-500)',
}: PageHeaderProps) {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-8"
    >
      {/* Breadcrumbs */}
      {pathSegments.length > 0 && (
        <nav className="flex items-center gap-1.5 mb-3">
          <Link
            to="/"
            className="text-xs font-medium no-underline transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-brand-500)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
          >
            Dashboard
          </Link>
          <ChevronRight size={12} style={{ color: 'var(--text-tertiary)' }} />
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            {BREADCRUMB_MAP[location.pathname] || pathSegments[pathSegments.length - 1]}
          </span>
        </nav>
      )}

      {/* Title row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {icon && (
            <div
              className="flex items-center justify-center rounded-2xl shrink-0"
              style={{
                width: 44,
                height: 44,
                background: `${badgeColor}14`,
                color: badgeColor,
              }}
            >
              {icon}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2.5">
              <h1
                className="text-2xl font-bold tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                {title}
              </h1>
              {badge && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${badgeColor}18`, color: badgeColor }}
                >
                  {badge}
                </span>
              )}
            </div>
            {description && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </motion.div>
  );
}
