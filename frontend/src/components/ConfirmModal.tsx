import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Loader2, X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  variant?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  loading = false,
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  /* Focus the cancel button when opened */
  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, loading, onCancel]);

  const colors =
    variant === 'danger'
      ? {
          iconBg: 'rgba(239, 68, 68, 0.10)',
          icon: '#ef4444',
          btn: 'linear-gradient(135deg, #ef4444, #dc2626)',
          btnShadow: 'rgba(239, 68, 68, 0.3)',
          btnHover: '#dc2626',
        }
      : {
          iconBg: 'rgba(245, 158, 11, 0.10)',
          icon: '#f59e0b',
          btn: 'linear-gradient(135deg, #f59e0b, #d97706)',
          btnShadow: 'rgba(245, 158, 11, 0.3)',
          btnHover: '#d97706',
        };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0"
            style={{ background: 'rgba(0, 0, 0, 0.45)', backdropFilter: 'blur(4px)' }}
            onClick={!loading ? onCancel : undefined}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="relative w-full max-w-sm rounded-2xl border overflow-hidden"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-light)',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px var(--border-light)',
            }}
          >
            {/* Close button */}
            <button
              onClick={onCancel}
              disabled={loading}
              className="absolute top-3 right-3 p-1.5 rounded-lg transition-colors"
              style={{
                background: 'none',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                color: 'var(--text-tertiary)',
              }}
            >
              <X size={16} />
            </button>

            <div className="p-6 pb-0 flex flex-col items-center text-center">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 14, stiffness: 200, delay: 0.05 }}
                className="flex items-center justify-center rounded-full mb-4"
                style={{
                  width: 52,
                  height: 52,
                  background: colors.iconBg,
                  color: colors.icon,
                }}
              >
                <AlertTriangle size={26} />
              </motion.div>

              <h3 className="text-base font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                {title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {description}
              </p>
            </div>

            {/* Actions */}
            <div className="p-6 pt-5 flex gap-3">
              <button
                ref={cancelRef}
                onClick={onCancel}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors"
                style={{
                  background: 'var(--bg-secondary)',
                  borderColor: 'var(--border-light)',
                  color: 'var(--text-primary)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                }}
              >
                {cancelLabel}
              </button>
              <motion.button
                whileHover={!loading ? { scale: 1.02 } : {}}
                whileTap={!loading ? { scale: 0.97 } : {}}
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                style={{
                  background: colors.btn,
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: `0 4px 12px -2px ${colors.btnShadow}`,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Deleting...
                  </>
                ) : (
                  confirmLabel
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
