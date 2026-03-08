import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import CommandPalette from './CommandPalette';

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

export default function Shell() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Subtle ambient blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div
          style={{
            position: 'absolute',
            top: '-5%',
            right: '5%',
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'rgba(139, 92, 246, 0.06)',
            filter: 'blur(100px)',
            animation: 'blob-float 20s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '5%',
            left: '0%',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'rgba(244, 63, 94, 0.04)',
            filter: 'blur(100px)',
            animation: 'blob-float-reverse 25s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '40%',
            left: '30%',
            width: 350,
            height: 350,
            borderRadius: '50%',
            background: 'rgba(52, 211, 153, 0.03)',
            filter: 'blur(90px)',
            animation: 'blob-float 28s ease-in-out infinite',
          }}
        />
      </div>

      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <CommandPalette />

      {/* Mobile top bar — fixed, only visible below lg */}
      <header
        className="fixed top-0 right-0 left-0 z-30 lg:hidden flex items-center gap-4 px-4"
        style={{
          height: 'var(--topbar-h)',
          background: 'var(--bg-sidebar)',
          borderBottom: '1px solid var(--border-light)',
        }}
      >
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center justify-center rounded-xl p-2"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-light)',
            cursor: 'pointer',
            color: 'var(--text-primary)',
          }}
        >
          <Menu size={18} />
        </button>
        <img src="/logo.svg" alt="Tesseract" style={{ width: 28, height: 28, objectFit: 'contain' }} />
        <span className="text-sm font-extrabold tracking-widest uppercase" style={{ color: '#7c3aed' }}>
          Tesseract
        </span>
      </header>

      {/*
        Main content area
        - pt-[--topbar-h] on mobile to push below the fixed top bar
        - lg:pt-0 resets it on desktop (no top bar)
        - lg:ml-[272px] offsets the entire <main> by the sidebar width
      */}
      <main
        className="min-h-screen"
        style={{ paddingTop: 'var(--topbar-h)', marginLeft: 0 }}
      >
        {/* Desktop-only left offset via inline style + media query handled by a wrapper */}
        <div className="lg:ml-[272px]">
          <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10 pt-2 lg:pt-1 pb-6 lg:pb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
