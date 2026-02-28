import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FileUp,
  Briefcase,
  BarChart3,
  Trophy,
  Sun,
  Moon,
  X,
  Command,
} from 'lucide-react';
import { useTheme } from '../ThemeContext';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/resumes', icon: FileUp, label: 'Resumes' },
  { to: '/jobs', icon: Briefcase, label: 'Jobs' },
  { to: '/match', icon: BarChart3, label: 'Match' },
  { to: '/rankings', icon: Trophy, label: 'Rankings' },
];

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { theme, toggle } = useTheme();
  const location = useLocation();

  const sidebarContent = (
    <aside
      className="fixed left-0 top-0 bottom-0 z-50 flex flex-col"
      style={{
        width: 272,
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-light)',
      }}
    >
      {/* Logo */}
      <div className="px-6 pt-8 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Tesseract"
              className="rounded-xl shrink-0"
              style={{
                width: 44,
                height: 44,
                objectFit: 'contain',
              }}
            />
            <div>
              <span
                className="text-base font-extrabold tracking-widest uppercase"
                style={{
                  color: '#7c3aed',
                  letterSpacing: '0.12em',
                }}
              >
                TESSERACT
              </span>
              <span
                className="block text-[10px] font-semibold tracking-[0.2em] uppercase"
                style={{
                  color: '#7c3aed',
                  opacity: 0.7,
                }}
              >
                MATCH PERFECTLY
              </span>
            </div>
          </div>
          {/* Mobile close */}
          <button
            onClick={onClose}
            className="lg:hidden flex items-center justify-center rounded-xl p-1.5"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-light)',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Search trigger */}
      <div className="px-5 mb-6">
        <button
          onClick={() => {
            onClose();
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
          }}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm transition-all"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-light)',
            cursor: 'pointer',
            color: 'var(--text-tertiary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-medium)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-light)';
            e.currentTarget.style.color = 'var(--text-tertiary)';
          }}
        >
          <Command size={14} />
          <span className="flex-1 text-left text-xs">Search...</span>
          <kbd
            className="text-[10px] font-mono px-1.5 py-0.5 rounded-md"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-tertiary)',
            }}
          >
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Section label */}
      <div className="px-6 mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
          Menu
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 px-4 flex-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const isActive =
            to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(to);

          return (
            <NavLink key={to} to={to} className="relative no-underline" onClick={onClose}>
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0"
                  style={{
                    background: 'var(--bg-sidebar-active)',
                    borderRadius: 'var(--radius-xl)',
                  }}
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                />
              )}
              <div
                className="relative flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
                style={{
                  color: isActive ? 'var(--color-brand-300)' : 'var(--text-secondary)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'var(--bg-sidebar-hover)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <Icon size={18} strokeWidth={isActive ? 2.2 : 1.7} />
                <span className="text-sm font-medium">{label}</span>
                {label === 'Match' && (
                  <span
                    className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                    style={{
                      background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                      color: '#fff',
                    }}
                  >
                    AI
                  </span>
                )}
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 pb-6 flex flex-col gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-colors"
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-sidebar-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
          <span className="text-sm font-medium">
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </span>
        </button>

        {/* User profile */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-light)',
          }}
        >
          <div
            className="flex items-center justify-center rounded-full text-xs font-bold shrink-0"
            style={{
              width: 36,
              height: 36,
              background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
              color: '#fff',
            }}
          >
            HR
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              HR Manager
            </p>
            <p className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>
              admin@company.com
            </p>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop — always visible */}
      <div className="hidden lg:block">{sidebarContent}</div>

      {/* Mobile — overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-40 lg:hidden"
              style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
            />
            <motion.div
              initial={{ x: -290 }}
              animate={{ x: 0 }}
              exit={{ x: -290 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="lg:hidden z-50"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
