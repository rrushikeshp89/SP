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
} from 'lucide-react';
import { uploadResume, listResumes } from '../api';
import SkillBadge from '../components/SkillBadge';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import { useToast } from '../components/Toast';
import type { Resume } from '../types';

export default function Resumes() {
  const toast = useToast();
  /* ── Upload State ── */
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [uploading, setUploading] = useState(false);

  /* ── List State ── */
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchResumes = useCallback(() => {
    setLoading(true);
    listResumes(1, 100)
      .then((data) => setResumes(data.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchResumes(); }, [fetchResumes]);

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
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {r.candidate_name}
                        </p>
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
    </div>
  );
}
