interface SkillBadgeProps {
  skill: string;
  variant?: 'matched' | 'missing' | 'partial' | 'neutral';
  size?: 'sm' | 'md';
}

const VARIANT_STYLES: Record<string, { bg: string; color: string; border: string; icon: string }> = {
  matched: {
    bg: 'rgba(16, 185, 129, 0.1)',
    color: '#059669',
    border: 'rgba(16, 185, 129, 0.2)',
    icon: '✓',
  },
  missing: {
    bg: 'rgba(239, 68, 68, 0.08)',
    color: '#dc2626',
    border: 'rgba(239, 68, 68, 0.15)',
    icon: '✕',
  },
  partial: {
    bg: 'rgba(245, 158, 11, 0.1)',
    color: '#d97706',
    border: 'rgba(245, 158, 11, 0.2)',
    icon: '≈',
  },
  neutral: {
    bg: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
    border: 'var(--border-light)',
    icon: '',
  },
};

export default function SkillBadge({ skill, variant = 'neutral', size = 'sm' }: SkillBadgeProps) {
  const style = VARIANT_STYLES[variant];
  const padding = size === 'sm' ? '0.25rem 0.625rem' : '0.375rem 0.75rem';
  const fontSize = size === 'sm' ? '0.7rem' : '0.8rem';

  return (
    <span
      className="inline-flex items-center rounded-full font-medium"
      style={{
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        padding,
        fontSize,
        backdropFilter: 'blur(4px)',
      }}
    >
      {style.icon && <span className="mr-1">{style.icon}</span>}
      {skill}
    </span>
  );
}
