import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  sub?: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  icon?: React.ReactNode;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchable = false,
  icon,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = query
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          (o.sub && o.sub.toLowerCase().includes(query.toLowerCase())),
      )
    : options;

  /* ── Close on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Focus search input when popover opens ── */
  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    if (!open) {
      setQuery('');
      setHighlighted(-1);
    }
  }, [open, searchable]);

  /* ── Scroll highlighted item into view ── */
  useEffect(() => {
    if (highlighted >= 0 && listRef.current) {
      const el = listRef.current.children[highlighted] as HTMLElement | undefined;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlighted]);

  /* ── Keyboard navigation ── */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();
          setOpen(true);
        }
        return;
      }
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlighted((h) => (h + 1) % filtered.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlighted((h) => (h - 1 + filtered.length) % filtered.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (highlighted >= 0 && filtered[highlighted]) {
            onChange(filtered[highlighted].value);
            setOpen(false);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setOpen(false);
          break;
      }
    },
    [open, highlighted, filtered, onChange],
  );

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      {/* ── Trigger Button ── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 text-sm text-left outline-none transition-all"
        style={{
          padding: '10px 14px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-input)',
          border: `1.5px solid ${open ? 'var(--border-focus)' : 'var(--border-light)'}`,
          boxShadow: open ? 'var(--shadow-glow-brand)' : 'var(--shadow-sm)',
          color: selected ? 'var(--text-primary)' : 'var(--text-tertiary)',
          cursor: 'pointer',
        }}
      >
        {icon && (
          <span
            className="flex items-center justify-center shrink-0 rounded-md"
            style={{ width: 28, height: 28, background: 'rgba(139, 92, 246, 0.08)', color: 'var(--color-brand-300)' }}
          >
            {icon}
          </span>
        )}
        <span className="flex-1 truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown
          size={16}
          className="shrink-0 transition-transform"
          style={{
            color: 'var(--text-tertiary)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {/* ── Dropdown Popover ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute z-50 mt-2 w-full overflow-hidden"
            style={{
              borderRadius: 'var(--radius-xl)',
              background: 'var(--bg-card-solid)',
              border: '1px solid var(--border-medium)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {/* Search bar */}
            {searchable && (
              <div
                className="flex items-center gap-2 px-3 py-2.5"
                style={{ borderBottom: '1px solid var(--border-light)' }}
              >
                <Search size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setHighlighted(0); }}
                  placeholder="Search…"
                  className="flex-1 text-sm outline-none bg-transparent"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
            )}

            {/* Options list */}
            <div ref={listRef} className="overflow-y-auto py-1.5" style={{ maxHeight: 240 }}>
              {filtered.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  No results found
                </div>
              ) : (
                filtered.map((opt, i) => {
                  const isActive = opt.value === value;
                  const isHl = i === highlighted;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { onChange(opt.value); setOpen(false); }}
                      onMouseEnter={() => setHighlighted(i)}
                      className="w-full flex items-center gap-2.5 text-left outline-none transition-colors"
                      style={{
                        padding: '8px 14px',
                        margin: '0 6px',
                        width: 'calc(100% - 12px)',
                        borderRadius: 'var(--radius-md)',
                        background: isActive
                          ? 'rgba(139, 92, 246, 0.12)'
                          : isHl
                            ? 'var(--bg-sidebar-hover)'
                            : 'transparent',
                        color: isActive ? 'var(--color-brand-300)' : 'var(--text-primary)',
                        cursor: 'pointer',
                        border: 'none',
                        fontSize: '0.875rem',
                      }}
                    >
                      <span className="flex-1 truncate">
                        {opt.label}
                        {opt.sub && (
                          <span className="ml-1.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            {opt.sub}
                          </span>
                        )}
                      </span>
                      {isActive && (
                        <Check
                          size={15}
                          className="shrink-0"
                          style={{ color: 'var(--color-brand-400)' }}
                        />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
