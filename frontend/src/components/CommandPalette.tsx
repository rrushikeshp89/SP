import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  LayoutDashboard,
  FileUp,
  Briefcase,
  BarChart3,
  Trophy,
  ArrowRight,
  Command,
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  section: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const items: CommandItem[] = [
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      section: 'Navigation',
      icon: <LayoutDashboard size={16} />,
      action: () => navigate('/'),
      keywords: ['home', 'overview', 'main'],
    },
    {
      id: 'nav-resumes',
      label: 'Go to Resumes',
      section: 'Navigation',
      icon: <FileUp size={16} />,
      action: () => navigate('/resumes'),
      keywords: ['upload', 'candidates', 'cv'],
    },
    {
      id: 'nav-jobs',
      label: 'Go to Jobs',
      section: 'Navigation',
      icon: <Briefcase size={16} />,
      action: () => navigate('/jobs'),
      keywords: ['positions', 'descriptions', 'jd'],
    },
    {
      id: 'nav-match',
      label: 'Go to Match & Score',
      section: 'Navigation',
      icon: <BarChart3 size={16} />,
      action: () => navigate('/match'),
      keywords: ['score', 'compare', 'analyze'],
    },
    {
      id: 'nav-rankings',
      label: 'Go to Rankings',
      section: 'Navigation',
      icon: <Trophy size={16} />,
      action: () => navigate('/rankings'),
      keywords: ['rank', 'leaderboard', 'top'],
    },
    {
      id: 'nav-pipeline',
      label: 'Go to Pipeline',
      section: 'Navigation',
      icon: <BarChart3 size={16} />,
      action: () => navigate('/pipeline'),
      keywords: ['kanban', 'board', 'stages', 'hiring'],
    },
    {
      id: 'action-upload',
      label: 'Upload a Resume',
      section: 'Actions',
      icon: <FileUp size={16} />,
      action: () => navigate('/resumes'),
      keywords: ['new', 'add', 'import'],
    },
    {
      id: 'action-create-job',
      label: 'Create a Job Description',
      section: 'Actions',
      icon: <Briefcase size={16} />,
      action: () => navigate('/jobs'),
      keywords: ['new', 'add', 'post'],
    },
    {
      id: 'action-run-match',
      label: 'Run a Match',
      section: 'Actions',
      icon: <BarChart3 size={16} />,
      action: () => navigate('/match'),
      keywords: ['score', 'compare', 'ai'],
    },
  ];

  const filtered = query.trim()
    ? items.filter((item) => {
        const q = query.toLowerCase();
        return (
          item.label.toLowerCase().includes(q) ||
          item.section.toLowerCase().includes(q) ||
          item.keywords?.some((k) => k.includes(q))
        );
      })
    : items;

  const sections = [...new Set(filtered.map((i) => i.section))];

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Arrow navigation
  useEffect(() => {
    if (!open) return;
    const handleNav = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filtered[activeIndex]) {
        e.preventDefault();
        filtered[activeIndex].action();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleNav);
    return () => window.removeEventListener('keydown', handleNav);
  }, [open, filtered, activeIndex]);

  // Reset active index when query changes
  useEffect(() => { setActiveIndex(0); }, [query]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[90]"
            style={{ background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)' }}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -20 }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            className="fixed z-[91] left-1/2 -translate-x-1/2 w-full max-w-lg overflow-hidden rounded-2xl"
            style={{
              top: '18%',
              background: 'var(--bg-card-solid)',
              border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            {/* Search input */}
            <div
              className="flex items-center gap-3 px-4 py-3.5"
              style={{ borderBottom: '1px solid var(--border-light)' }}
            >
              <Search size={18} style={{ color: 'var(--text-tertiary)' }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search commands..."
                className="flex-1 text-sm bg-transparent outline-none border-none"
                style={{ color: 'var(--text-primary)' }}
              />
              <kbd
                className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-light)',
                  color: 'var(--text-tertiary)',
                }}
              >
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-72 overflow-y-auto py-2">
              {filtered.length === 0 ? (
                <p className="px-4 py-6 text-sm text-center" style={{ color: 'var(--text-tertiary)' }}>
                  No results for "{query}"
                </p>
              ) : (
                sections.map((section) => (
                  <div key={section}>
                    <p
                      className="text-[10px] font-semibold uppercase tracking-wider px-4 py-1.5"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {section}
                    </p>
                    {filtered
                      .filter((i) => i.section === section)
                      .map((item) => {
                        const idx = filtered.indexOf(item);
                        const isActive = idx === activeIndex;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              item.action();
                              setOpen(false);
                            }}
                            onMouseEnter={() => setActiveIndex(idx)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                            style={{
                              background: isActive ? 'var(--bg-sidebar-active)' : 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: isActive ? 'var(--color-brand-300)' : 'var(--text-primary)',
                            }}
                          >
                            <span style={{ color: isActive ? 'var(--color-brand-500)' : 'var(--text-tertiary)' }}>
                              {item.icon}
                            </span>
                            <span className="flex-1 text-sm font-medium">{item.label}</span>
                            {isActive && (
                              <ArrowRight size={14} style={{ color: 'var(--color-brand-400)' }} />
                            )}
                          </button>
                        );
                      })}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div
              className="flex items-center gap-4 px-4 py-2.5 text-[11px]"
              style={{
                borderTop: '1px solid var(--border-light)',
                color: 'var(--text-tertiary)',
              }}
            >
              <span className="flex items-center gap-1">
                <kbd className="text-[10px] font-mono px-1 py-0.5 rounded border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-light)' }}>↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="text-[10px] font-mono px-1 py-0.5 rounded border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-light)' }}>↵</kbd>
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="text-[10px] font-mono px-1 py-0.5 rounded border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-light)' }}>esc</kbd>
                Close
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export { Command };
