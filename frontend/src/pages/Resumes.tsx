import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  User,
  Mail,
  Phone,
  Search,
  Loader2,
  FileUp,
  Trash2,
  StickyNote,
  Files,
} from 'lucide-react';
import { uploadResume, listResumes, deleteResume, updateResumeMeta, uploadBulk } from '../api';
import SkillBadge from '../components/SkillBadge';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../components/Toast';
import { useBlindMode } from '../BlindModeContext';
import type { Resume, CandidateStatus } from '../types';
import { VALID_STATUSES } from '../types';

const STATUS_COLORS: Record<CandidateStatus, string> = {
  new: '#7c3aed',
  screening: '#f59e0b',
  interview: '#3b82f6',
  offered: '#06b6d4',
  hired: '#10b981',
  rejected: '#ef4444',
};

export default function Resumes() {
  const toast = useToast();
  const { mask } = useBlindMode();
  /* ── Upload State ── */
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [uploading, setUploading] = useState(false);

  /* ── Bulk Upload ── */
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);

  /* ── List State ── */
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* ── Notes editing ── */
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});

  /* ── Delete State ── */
  const [deleteTarget, setDeleteTarget] = useState<Resume | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchResumes = useCallback(() => {
    setLoading(true);
    listResumes(1, 100)
      .then((data) => setResumes(data.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchResumes(); }, [fetchResumes]);

  /* ── Delete Handler ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteResume(deleteTarget.resume_id);
      toast.success('Resume deleted', `"${deleteTarget.candidate_name}" has been removed.`);
      setResumes((prev) => prev.filter((r) => r.resume_id !== deleteTarget.resume_id));
      if (expandedId === deleteTarget.resume_id) setExpandedId(null);
    } catch (err: any) {
      toast.error('Delete failed', err?.response?.data?.detail || 'Could not delete the resume.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  /* ── Dropzone ── */
  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length > 0) {
      setFile(accepted[0]);
      if (!name) {
        const base = accepted[0].name.replace(/\.[^.]+$/, '');
        setName(base.replace(/[_-]/g, ' '));
      }
    }
  }, [name]);

  /* ── Bulk Upload Handler ── */
  const handleBulkUpload = async () => {
    if (bulkFiles.length === 0) return;
    setBulkUploading(true);
    try {
      const result = await uploadBulk(bulkFiles);
      toast.success(
        'Bulk upload complete',
        `${result.uploaded} uploaded, ${result.failed} failed`,
      );
      setBulkFiles([]);
      fetchResumes();
    } catch (err: any) {
      toast.error('Bulk upload failed', err?.response?.data?.detail || 'Try again.');
    } finally {
      setBulkUploading(false);
    }
  };

  /* ── Status/Notes Handlers ── */
  const handleStatusChange = async (resumeId: string, status: CandidateStatus) => {
    try {
      const updated = await updateResumeMeta(resumeId, { status });
      setResumes((prev) => prev.map((r) => (r.resume_id === resumeId ? { ...r, ...updated } : r)));
    } catch {
      toast.error('Update failed', 'Could not change status.');
    }
  };

  const handleNotesSave = async (resumeId: string) => {
    const notes = editingNotes[resumeId];
    if (notes === undefined) return;
    try {
      await updateResumeMeta(resumeId, { notes });
      setResumes((prev) => prev.map((r) => (r.resume_id === resumeId ? { ...r, notes } : r)));
      toast.success('Notes saved');
    } catch {
      toast.error('Update failed', 'Could not save notes.');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    multiple: false,
  });

  /* ── Submit ── */
  const handleUpload = async () => {
    if (!file || !name.trim()) return;
    setUploading(true);
    try {
      await uploadResume(file, name.trim(), email || undefined, phone || undefined);
      toast.success('Resume uploaded!', `"${name.trim()}" parsed successfully.`);
      setFile(null);
      setName('');
      setEmail('');
      setPhone('');
      fetchResumes();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Upload failed. Please try again.';
      toast.error('Upload failed', msg);
    } finally {
      setUploading(false);
    }
  };

  /* ── Filter ── */
  const filtered = resumes.filter(
    (r) =>
      r.candidate_name.toLowerCase().includes(search.toLowerCase()) ||
      r.skills.some((s) => s.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div>
      <PageHeader
        title="Resumes"
        description="Upload candidate resumes and view extracted skills."
        icon={<FileUp size={22} />}
        badgeColor="#a78bfa"
        badge={`${filtered.length} total`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Upload Panel (2/5) ── */}
        <div className="lg:col-span-2">
          <div className="glass-card-lg p-6 sticky top-8">
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Upload Resume
            </h2>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className="rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all"
              style={{
                borderColor: isDragActive ? 'var(--color-brand-400)' : 'var(--border-light)',
                background: isDragActive
                  ? 'rgba(139, 92, 246, 0.06)'
                  : 'var(--bg-tertiary)',
              }}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-2">
                {file ? (
                  <>
                    <div
                      className="flex items-center justify-center rounded-xl"
                      style={{ width: 48, height: 48, background: 'rgba(139, 92, 246, 0.1)' }}
                    >
                      <FileText size={24} style={{ color: 'var(--color-brand-500)' }} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {file.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </>
                ) : (
                  <>
                    <div
                      className="flex items-center justify-center rounded-xl"
                      style={{ width: 48, height: 48, background: 'var(--bg-tertiary)' }}
                    >
                      <Upload size={24} style={{ color: 'var(--text-tertiary)' }} />
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <span className="font-semibold" style={{ color: 'var(--color-brand-500)' }}>
                        Click to upload
                      </span>{' '}
                      or drag & drop
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      PDF, DOCX, or TXT (max 10MB)
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Meta Fields */}
            <div className="mt-4 flex flex-col gap-3">
              <div className="relative">
                <User
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-tertiary)' }}
                />
                <input
                  type="text"
                  placeholder="Candidate name *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="glass-input pl-9"
                />
              </div>
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-tertiary)' }}
                />
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input pl-9"
                />
              </div>
              <div className="relative">
                <Phone
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-tertiary)' }}
                />
                <input
                  type="tel"
                  placeholder="Phone (optional)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="glass-input pl-9"
                />
              </div>
            </div>

            {/* Submit */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleUpload}
              disabled={!file || !name.trim() || uploading}
              className="btn-brand mt-4 w-full justify-center"
            >
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Parsing...
                </>
              ) : (
                <>
                  <Upload size={16} /> Upload & Parse
                </>
              )}
            </motion.button>

            {/* ── Bulk Upload Section ── */}
            <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--border-light)' }}>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Files size={15} /> Bulk Upload
              </h3>
              <div
                className="rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all"
                style={{
                  borderColor: 'var(--border-light)',
                  background: 'var(--bg-tertiary)',
                }}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.multiple = true;
                  input.accept = '.pdf,.docx,.txt';
                  input.onchange = () => {
                    if (input.files) setBulkFiles(Array.from(input.files));
                  };
                  input.click();
                }}
              >
                {bulkFiles.length > 0 ? (
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {bulkFiles.length} file{bulkFiles.length > 1 ? 's' : ''} selected
                  </p>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    Click to select multiple files
                  </p>
                )}
              </div>
              {bulkFiles.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleBulkUpload}
                  disabled={bulkUploading}
                  className="btn-brand mt-3 w-full justify-center"
                >
                  {bulkUploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <Upload size={16} /> Upload {bulkFiles.length} Files
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </div>
        </div>

        {/* ── Resume List (3/5) ── */}
        <div className="lg:col-span-3">
          {/* Search */}
          <div className="relative mb-4">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none"
              style={{ color: 'var(--text-tertiary)' }}
            />
            <input
              type="text"
              placeholder="Search by name or skill..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border outline-none"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}
            />
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-20 rounded-2xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center flex-1 rounded-2xl border-2 border-dashed"
              style={{
                borderColor: 'var(--border-light)',
                background: 'var(--bg-secondary)',
                minHeight: 320,
              }}
            >
              <EmptyState
                icon={<FileText size={32} />}
                title="No resumes found"
                description={
                  resumes.length === 0
                    ? 'Upload your first resume to get started.'
                    : 'No resumes match your search.'
                }
              />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <AnimatePresence>
                {filtered.map((r, i) => (
                  <motion.div
                    key={r.resume_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.03 }}
                    className="glass-card overflow-hidden"
                  >
                    {/* Row */}
                    <button
                      onClick={() => setExpandedId(expandedId === r.resume_id ? null : r.resume_id)}
                      className="w-full flex items-center gap-4 px-5 py-4 text-left"
                      style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <div
                        className="flex items-center justify-center rounded-full text-xs font-bold shrink-0"
                        style={{
                          width: 38,
                          height: 38,
                        background: 'rgba(167, 139, 250, 0.12)',
                        color: '#a78bfa',
                        }}
                      >
                        {r.candidate_name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                            {mask(r.candidate_name, i)}
                          </p>
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase shrink-0"
                            style={{
                              background: `${STATUS_COLORS[r.status as CandidateStatus] || '#7c3aed'}18`,
                              color: STATUS_COLORS[r.status as CandidateStatus] || '#7c3aed',
                            }}
                          >
                            {r.status || 'new'}
                          </span>
                        </div>
                        <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                          {r.email || 'No email'} &middot; {r.source_format.toUpperCase()} &middot;{' '}
                          {new Date(r.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-1.5 flex-wrap justify-end max-w-[200px]">
                        {r.skills.slice(0, 3).map((s) => (
                          <SkillBadge key={s} skill={s} variant="neutral" />
                        ))}
                        {r.skills.length > 3 && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{
                            background: 'var(--bg-tertiary)',
                            color: 'var(--text-tertiary)',
                          }}>
                            +{r.skills.length - 3}
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Expanded detail */}
                    <AnimatePresence>
                      {expandedId === r.resume_id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div
                            className="px-5 pb-4 pt-2"
                            style={{ borderTop: '1px solid var(--border-light)' }}
                          >
                            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                              All Skills ({r.skills.length})
                            </p>
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {r.skills.map((s) => (
                                <SkillBadge key={s} skill={s} variant="neutral" size="md" />
                              ))}
                            </div>

                            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                              Preview
                            </p>
                            <p
                              className="text-xs leading-relaxed max-h-32 overflow-y-auto pr-2 rounded-xl p-3"
                              style={{
                                color: 'var(--text-tertiary)',
                                whiteSpace: 'pre-wrap',
                                background: 'var(--bg-tertiary)',
                              }}
                            >
                              {r.raw_text.slice(0, 800)}
                              {r.raw_text.length > 800 && '...'}
                            </p>

                            {/* Status & Notes */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                              <div>
                                <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                                  Status
                                </label>
                                <select
                                  value={r.status || 'new'}
                                  onChange={(e) => handleStatusChange(r.resume_id, e.target.value as CandidateStatus)}
                                  className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                                  style={{
                                    background: 'var(--bg-input)',
                                    borderColor: 'var(--border-light)',
                                    color: 'var(--text-primary)',
                                  }}
                                >
                                  {VALID_STATUSES.map((s) => (
                                    <option key={s} value={s}>
                                      {s.charAt(0).toUpperCase() + s.slice(1)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                                  <StickyNote size={12} /> Notes
                                </label>
                                <div className="flex gap-2">
                                  <textarea
                                    rows={2}
                                    value={editingNotes[r.resume_id] ?? r.notes}
                                    onChange={(e) =>
                                      setEditingNotes((prev) => ({ ...prev, [r.resume_id]: e.target.value }))
                                    }
                                    placeholder="Add notes about this candidate..."
                                    className="flex-1 px-3 py-2 text-xs rounded-lg border outline-none resize-none"
                                    style={{
                                      background: 'var(--bg-input)',
                                      borderColor: 'var(--border-light)',
                                      color: 'var(--text-primary)',
                                    }}
                                  />
                                  {editingNotes[r.resume_id] !== undefined &&
                                    editingNotes[r.resume_id] !== r.notes && (
                                      <button
                                        onClick={() => handleNotesSave(r.resume_id)}
                                        className="text-xs px-3 py-1 rounded-lg font-medium shrink-0 self-end"
                                        style={{
                                          background: 'var(--color-brand-500)',
                                          color: '#fff',
                                          border: 'none',
                                          cursor: 'pointer',
                                        }}
                                      >
                                        Save
                                      </button>
                                    )}
                                </div>
                              </div>
                            </div>

                            {/* Delete button */}
                            <div className="mt-4 flex justify-end">
                              <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.96 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget(r);
                                }}
                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors"
                                style={{
                                  background: 'rgba(239, 68, 68, 0.08)',
                                  color: '#ef4444',
                                  border: '1px solid rgba(239, 68, 68, 0.18)',
                                  cursor: 'pointer',
                                }}
                              >
                                <Trash2 size={13} /> Delete Resume
                              </motion.button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Resume?"
        description={
          deleteTarget
            ? `This will permanently remove "${deleteTarget.candidate_name}" and all associated data. This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete Resume"
        loading={deleting}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </div>
  );
}
