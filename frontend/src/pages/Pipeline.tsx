import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Kanban,
  GripVertical,
  User,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { getPipeline, updateResumeMeta } from '../api';
import { useBlindMode } from '../BlindModeContext';
import type { PipelineResponse, PipelineCandidate, CandidateStatus } from '../types';
import { VALID_STATUSES } from '../types';
import { useToast } from '../components/Toast';

const STAGE_COLORS: Record<CandidateStatus, string> = {
  new: '#7c3aed',
  screening: '#f59e0b',
  interview: '#3b82f6',
  offered: '#06b6d4',
  hired: '#10b981',
  rejected: '#ef4444',
};

const STAGE_LABELS: Record<CandidateStatus, string> = {
  new: 'New',
  screening: 'Screening',
  interview: 'Interview',
  offered: 'Offered',
  hired: 'Hired',
  rejected: 'Rejected',
};

export default function Pipeline() {
  const [data, setData] = useState<PipelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<CandidateStatus | null>(null);
  const { mask } = useBlindMode();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollSpeedRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  // Continuous smooth auto-scroll loop while dragging near edges
  useEffect(() => {
    const tick = () => {
      const el = scrollRef.current;
      if (el && scrollSpeedRef.current !== 0) {
        el.scrollLeft += scrollSpeedRef.current;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPipeline();
      setData(res);
    } catch {
      toastRef.current.error('Failed to load pipeline');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleDragStart = (e: React.DragEvent, candidateId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', candidateId);
    setDraggedId(candidateId);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverStage(null);
    scrollSpeedRef.current = 0;
  };

  const handleDragOver = (e: React.DragEvent, stage: CandidateStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stage);
  };

  // Update scroll speed based on mouse position relative to board edges
  const handleBoardDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const container = scrollRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const edgeZone = 150;
    const mouseX = e.clientX;
    const maxSpeed = 25;

    if (mouseX < rect.left + edgeZone) {
      const ratio = 1 - (mouseX - rect.left) / edgeZone;
      scrollSpeedRef.current = -maxSpeed * Math.pow(ratio, 1.5);
    } else if (mouseX > rect.right - edgeZone) {
      const ratio = 1 - (rect.right - mouseX) / edgeZone;
      scrollSpeedRef.current = maxSpeed * Math.pow(ratio, 1.5);
    } else {
      scrollSpeedRef.current = 0;
    }
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleBoardDragLeave = () => {
    scrollSpeedRef.current = 0;
  };

  const handleDrop = async (e: React.DragEvent, targetStage: CandidateStatus) => {
    e.preventDefault();
    const candidateId = e.dataTransfer.getData('text/plain');
    setDraggedId(null);
    setDragOverStage(null);
    scrollSpeedRef.current = 0;

    if (!candidateId || !data) return;

    // Find current stage
    const currentStage = data.stages.find((s) =>
      s.candidates.some((c) => c.resume_id === candidateId)
    );
    if (!currentStage || currentStage.stage === targetStage) return;

    // Optimistic update
    const candidate = currentStage.candidates.find((c) => c.resume_id === candidateId);
    if (!candidate) return;

    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        stages: prev.stages.map((s) => {
          if (s.stage === currentStage.stage) {
            const remaining = s.candidates.filter((c) => c.resume_id !== candidateId);
            return { ...s, count: remaining.length, candidates: remaining };
          }
          if (s.stage === targetStage) {
            const moved = { ...candidate, status: targetStage };
            return { ...s, count: s.count + 1, candidates: [...s.candidates, moved] };
          }
          return s;
        }),
      };
    });

    try {
      await updateResumeMeta(candidateId, { status: targetStage });
      toast.success(`Moved to ${STAGE_LABELS[targetStage]}`);
    } catch {
      toast.error('Failed to update status');
      refresh();
    }
  };

  // Flat index for blind mode labels
  const allCandidates: string[] = data
    ? data.stages.flatMap((s) => s.candidates.map((c) => c.resume_id))
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline"
        description={`${data?.total ?? 0} candidates across ${VALID_STATUSES.length} stages`}
        icon={<Kanban size={20} />}
        badge="Kanban"
        actions={
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4"
        style={{ minHeight: 'calc(100vh - 240px)' }}
        onDragOver={handleBoardDragOver}
        onDragLeave={handleBoardDragLeave}
      >
        {(data?.stages ?? VALID_STATUSES.map((s) => ({ stage: s, count: 0, candidates: [] }))).map(
          (stage) => {
            const color = STAGE_COLORS[stage.stage as CandidateStatus];
            const isDragTarget = dragOverStage === stage.stage;

            return (
              <div
                key={stage.stage}
                className="flex flex-col shrink-0 rounded-2xl transition-all"
                style={{
                  width: 280,
                  background: isDragTarget ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                  border: `1px solid ${isDragTarget ? color : 'var(--border-light)'}`,
                  boxShadow: isDragTarget ? `0 0 0 2px ${color}33` : undefined,
                }}
                onDragOver={(e) => handleDragOver(e, stage.stage as CandidateStatus)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.stage as CandidateStatus)}
              >
                {/* Column header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border-light)' }}>
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ background: color }}
                  />
                  <span
                    className="text-sm font-semibold flex-1"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {STAGE_LABELS[stage.stage as CandidateStatus]}
                  </span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: `${color}22`,
                      color,
                    }}
                  >
                    {stage.count}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2 p-3 flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
                  {stage.candidates.map((c: PipelineCandidate) => {
                    const globalIdx = allCandidates.indexOf(c.resume_id);
                    const isDragging = draggedId === c.resume_id;

                    return (
                      <div
                        key={c.resume_id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, c.resume_id)}
                        onDragEnd={handleDragEnd}
                        className="rounded-xl p-3 transition-shadow"
                        style={{
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-light)',
                          opacity: isDragging ? 0.4 : 1,
                          cursor: 'grab',
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical size={14} style={{ color: 'var(--text-tertiary)', marginTop: 2, flexShrink: 0 }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <User size={13} style={{ color: color, flexShrink: 0 }} />
                              <span
                                className="text-sm font-medium truncate"
                                style={{ color: 'var(--text-primary)' }}
                              >
                                {mask(c.candidate_name, globalIdx)}
                              </span>
                            </div>
                            {c.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {c.skills.slice(0, 3).map((skill) => (
                                  <span
                                    key={skill}
                                    className="text-[10px] px-1.5 py-0.5 rounded-md"
                                    style={{
                                      background: 'var(--bg-tertiary)',
                                      color: 'var(--text-secondary)',
                                    }}
                                  >
                                    {skill}
                                  </span>
                                ))}
                                {c.skills.length > 3 && (
                                  <span
                                    className="text-[10px] px-1.5 py-0.5 rounded-md"
                                    style={{ color: 'var(--text-tertiary)' }}
                                  >
                                    +{c.skills.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                            {c.notes && (
                              <p
                                className="text-[11px] mt-1.5 truncate"
                                style={{ color: 'var(--text-tertiary)' }}
                              >
                                {c.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {stage.candidates.length === 0 && (
                    <div
                      className="flex flex-col items-center justify-center py-8 rounded-xl border-2 border-dashed"
                      style={{
                        borderColor: 'var(--border-light)',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      <ArrowRight size={20} className="mb-2 opacity-40" />
                      <span className="text-xs">Drop here</span>
                    </div>
                  )}
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}
