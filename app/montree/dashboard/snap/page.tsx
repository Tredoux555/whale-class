// app/montree/dashboard/snap/page.tsx
// "Snap & Identify v2" — Photo first, tag child after.
// Flow: Camera → Review photo → Pick child → Analysis runs in background → Toast result
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, type MontreeSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { toast } from 'sonner';
import { AREA_CONFIG } from '@/lib/montree/types';

interface Child {
  id: string;
  name: string;
  photo_url?: string;
}

interface ObservationData {
  normalization?: string;
  work_cycle_phase?: string;
  technique_notes?: string;
  concentration_level?: string;
  independence_level?: string;
  emotional_state?: string;
  repetition_noted?: boolean;
  self_correcting?: boolean;
  control_of_error_notes?: string;
  detailed_notes?: string;
}

interface AnalysisData {
  time_on_work?: string;
  area_progress_summary?: string;
  relative_strength?: string;
  trajectory?: string;
  prerequisite_status?: string;
  comparison_to_past?: string;
}

interface CrossAreaData {
  supporting_areas?: string[];
  foundation_gaps?: string[];
  recommended_support_works?: Array<{ work_name: string; area: string; reason: string }>;
}

interface NextStepsData {
  stay_or_advance?: string;
  reason?: string;
  next_work_in_area?: string;
  suggested_variations?: string[];
  priority_actions?: string[];
}

interface AreaStatData {
  mastered: number;
  practicing: number;
  presented: number;
  total_in_curriculum: number;
}

interface SnapResult {
  success: boolean;
  work_name: string;
  area: string;
  area_label: string;
  status: string;
  confidence: string;
  observation: ObservationData;
  sensitive_period_alignment: string;
  analysis: AnalysisData;
  area_stats: Record<string, AreaStatData>;
  cross_area: CrossAreaData;
  next_steps: NextStepsData;
  weekly_narrative: string;
  weekly_narrative_zh?: string;
  photo_url: string;
  media_id: string;
  progress_updated: boolean;
}

// A captured snap waiting to be tagged or being analyzed
interface HeldSnap {
  id: number;
  blob: Blob;
  preview: string;
  capturedAt: number;
}

interface PendingAnalysis {
  id: number;
  childName: string;
  childId: string;
  preview: string;
  startedAt: number;
}

type Phase = 'camera' | 'review' | 'tag-child' | 'result';

const STATUS_EMOJI: Record<string, string> = {
  presented: '📋',
  practicing: '🔄',
  mastered: '⭐',
};

const NORM_LABELS: Record<string, { emoji: string; label: string; color: string }> = {
  normalized: { emoji: '🟢', label: 'Normalized', color: 'text-emerald-700' },
  normalizing: { emoji: '🟡', label: 'Normalizing', color: 'text-amber-700' },
  deviated: { emoji: '🔴', label: 'Deviated', color: 'text-red-700' },
};

const CYCLE_LABELS: Record<string, string> = {
  preparation: '🔧 Preparation',
  active_work: '🎯 Active Work',
  repetition: '🔁 Repetition',
  restoration: '🧹 Restoration',
  unclear: '❓ Unclear',
};

const TRAJECTORY_LABELS: Record<string, { emoji: string; label: string }> = {
  accelerating: { emoji: '🚀', label: 'Accelerating' },
  steady: { emoji: '📈', label: 'Steady' },
  plateau: { emoji: '⏸️', label: 'Plateau' },
  first_observation: { emoji: '🆕', label: 'First Observation' },
};

const ADVANCE_LABELS: Record<string, { emoji: string; label: string; color: string }> = {
  stay: { emoji: '🔄', label: 'Stay on this work', color: 'bg-amber-50 text-amber-800' },
  advance: { emoji: '⏩', label: 'Ready to advance', color: 'bg-emerald-50 text-emerald-800' },
  revisit_prerequisites: { emoji: '⬅️', label: 'Revisit prerequisites', color: 'bg-red-50 text-red-800' },
  try_variation: { emoji: '🔀', label: 'Try a variation', color: 'bg-violet-50 text-violet-800' },
};

const CYCLE_I18N_KEY: Record<string, string> = {
  preparation: 'snap.cyclePreparation', active_work: 'snap.cycleActiveWork',
  repetition: 'snap.cycleRepetition', restoration: 'snap.cycleRestoration', unclear: 'snap.cycleUnclear',
};
const TRAJECTORY_I18N_KEY: Record<string, string> = {
  accelerating: 'snap.trajectoryAccelerating', steady: 'snap.trajectorySteady',
  plateau: 'snap.trajectoryPlateau', first_observation: 'snap.trajectoryFirstObservation',
};
const ADVANCE_I18N_KEY: Record<string, string> = {
  stay: 'snap.stay', advance: 'snap.advance',
  revisit_prerequisites: 'snap.revisitPrerequisites', try_variation: 'snap.tryVariation',
};

// Collapsible section component
function Section({ title, emoji, defaultOpen = false, children: content }: {
  title: string; emoji: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-lg">{emoji}</span>
        <span className="font-semibold text-gray-800 flex-1">{title}</span>
        <span className="text-gray-400 text-sm">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="px-4 pb-4 border-t border-gray-100 pt-3">{content}</div>}
    </div>
  );
}

function AreaBar({ area, stats }: { area: string; stats: AreaStatData }) {
  const config = AREA_CONFIG[area as keyof typeof AREA_CONFIG];
  const pct = stats.total_in_curriculum > 0 ? Math.round((stats.mastered / stats.total_in_curriculum) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className="w-5 h-5 rounded-full inline-flex items-center justify-center text-white text-[9px] font-bold shrink-0"
        style={{ backgroundColor: config?.color || '#6b7280' }}
      >
        {config?.icon || area[0]?.toUpperCase()}
      </span>
      <span className="w-24 truncate text-gray-700">{config?.label || area}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: config?.color || '#6b7280' }} />
      </div>
      <span className="text-gray-500 text-xs w-16 text-right">{stats.mastered}/{stats.total_in_curriculum}</span>
    </div>
  );
}

let snapIdCounter = 0;

export default function SnapIdentifyPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [session, setSession] = useState<MontreeSession | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [phase, setPhase] = useState<Phase>('camera');

  // The photo currently being held (taken but not yet tagged)
  const [heldSnap, setHeldSnap] = useState<HeldSnap | null>(null);

  // Background analyses in progress
  const [pendingAnalyses, setPendingAnalyses] = useState<PendingAnalysis[]>([]);

  // Result viewing
  const [result, setResult] = useState<SnapResult | null>(null);
  const [resultChild, setResultChild] = useState<Child | null>(null);
  const [parentVisible, setParentVisible] = useState(true);

  // Camera state
  const [isStreaming, setIsStreaming] = useState(false);
  const [narrativeCopied, setNarrativeCopied] = useState(false);
  const [showZh, setShowZh] = useState(false);

  const [togglingVisibility, setTogglingVisibility] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // Load session + children
  useEffect(() => {
    const sess = getSession();
    if (!sess) { router.push('/montree/login-select'); return; }
    setSession(sess);

    if (sess.classroom?.id) {
      montreeApi(`/api/montree/children?classroom_id=${sess.classroom.id}`)
        .then(r => r.json())
        .then((data: { children?: Child[] }) => {
          setChildren((data.children || []).sort((a, b) => a.name.localeCompare(b.name)));
        })
        .catch(() => toast.error('Failed to load students'));
    }
  }, [router]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, []);

  // Auto-start camera when entering camera phase
  useEffect(() => {
    if (phase === 'camera' && !heldSnap) {
      const timer = setTimeout(() => startCamera(), 100);
      return () => clearTimeout(timer);
    }
  }, [phase, heldSnap]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsStreaming(true);
    } catch {
      toast(t('snap.cameraNotAvailable'));
      fileInputRef.current?.click();
    }
  }, [t]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const captureFromCamera = useCallback(() => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1920;
    canvas.height = videoRef.current.videoHeight || 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) { toast.error('Failed to capture photo'); return; }
      const url = URL.createObjectURL(blob);
      const snap: HeldSnap = {
        id: ++snapIdCounter,
        blob,
        preview: url,
        capturedAt: Date.now(),
      };
      setHeldSnap(snap);
      setPhase('review');
      stopCamera();
    }, 'image/jpeg', 0.85);
  }, [stopCamera]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const snap: HeldSnap = {
      id: ++snapIdCounter,
      blob: file,
      preview: url,
      capturedAt: Date.now(),
    };
    setHeldSnap(snap);
    setPhase('review');
    stopCamera();
  }, [stopCamera]);

  const retakePhoto = useCallback(() => {
    if (heldSnap) {
      URL.revokeObjectURL(heldSnap.preview);
      setHeldSnap(null);
    }
    setPhase('camera');
  }, [heldSnap]);

  const proceedToTag = useCallback(() => {
    setPhase('tag-child');
  }, []);

  // Tag a child and submit for background analysis
  const tagChildAndSubmit = useCallback(async (child: Child) => {
    if (!heldSnap) return;

    // Capture references
    const snap = heldSnap;
    const analysisId = snap.id;

    // Add to pending analyses
    const pending: PendingAnalysis = {
      id: analysisId,
      childName: child.name,
      childId: child.id,
      preview: snap.preview,
      startedAt: Date.now(),
    };
    setPendingAnalyses(prev => [...prev, pending]);

    // Toast and reset to camera immediately
    toast(`📸 ${child.name} — ${t('snap.analyzingInBackground') || 'Analyzing in background...'}`, { duration: 3000 });
    setHeldSnap(null);
    setPhase('camera');

    // Background analysis
    try {
      const formData = new FormData();
      formData.append('file', snap.blob, 'snap.jpg');
      formData.append('child_id', child.id);

      const controller = new AbortController();
      abortRef.current = controller;
      const timeout = setTimeout(() => controller.abort(), 60000);

      const res = await montreeApi('/api/montree/guru/snap-identify', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      abortRef.current = null;

      if (!res.ok) {
        let errMsg = 'Analysis failed';
        try { const d = await res.json(); if (d?.error) errMsg = d.error; } catch { /* */ }
        toast.error(`❌ ${child.name}: ${errMsg}`, { duration: 6000 });
        URL.revokeObjectURL(snap.preview);
        if (mountedRef.current) setPendingAnalyses(prev => prev.filter(p => p.id !== analysisId));
        return;
      }

      const data = await res.json();
      URL.revokeObjectURL(snap.preview);
      if (mountedRef.current) setPendingAnalyses(prev => prev.filter(p => p.id !== analysisId));

      if (data.success) {
        toast.success(
          `✅ ${child.name}: ${data.work_name} — ${data.status}${data.progress_updated ? ' (saved)' : ''}`,
          {
            duration: 8000,
            action: {
              label: t('snap.viewResult') || 'View',
              onClick: () => {
                if (mountedRef.current) {
                  setResult(data as SnapResult);
                  setResultChild(child);
                  setPhase('result');
                }
              },
            },
          }
        );
      } else {
        toast.error(`❌ ${child.name}: ${data.error || t('snap.couldNotIdentify')}`, { duration: 6000 });
      }
    } catch (err) {
      URL.revokeObjectURL(snap.preview);
      if (mountedRef.current) setPendingAnalyses(prev => prev.filter(p => p.id !== analysisId));
      if (err instanceof DOMException && err.name === 'AbortError') {
        toast.error(`⏱ ${child.name}: ${t('snap.tookTooLong')}`, { duration: 6000 });
      } else {
        toast.error(`❌ ${child.name}: ${t('snap.analysisFailed')}`, { duration: 6000 });
      }
    }
  }, [heldSnap, t]);

  const backToCamera = useCallback(() => {
    stopCamera();
    if (heldSnap) {
      URL.revokeObjectURL(heldSnap.preview);
      setHeldSnap(null);
    }
    setResult(null);
    setResultChild(null);
    setNarrativeCopied(false);
    setShowZh(false);
    setParentVisible(true);
    setPhase('camera');
  }, [stopCamera, heldSnap]);

  const copyNarrative = useCallback(() => {
    if (!result) return;
    const text = showZh && result.weekly_narrative_zh ? result.weekly_narrative_zh : result.weekly_narrative;
    navigator.clipboard.writeText(text).then(() => {
      setNarrativeCopied(true);
      setTimeout(() => setNarrativeCopied(false), 2000);
    });
  }, [result, showZh]);

  const toggleParentVisible = useCallback(async () => {
    if (!result?.media_id || togglingVisibility) return;
    const newVal = !parentVisible;
    setTogglingVisibility(true);
    setParentVisible(newVal);
    try {
      await montreeApi('/api/montree/media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: result.media_id, parent_visible: newVal }),
      });
      toast(newVal
        ? `👁 ${t('snap.sharedWithParents') || 'Photo shared with parents'}`
        : `🙈 ${t('snap.hiddenFromParents') || 'Photo hidden from parent report'}`,
        { duration: 3000 }
      );
    } catch {
      setParentVisible(!newVal); // revert on failure
      toast.error(t('snap.toggleFailed') || 'Failed to update');
    } finally {
      setTogglingVisibility(false);
    }
  }, [result, parentVisible, togglingVisibility, t]);

  if (!session) return null;

  const obs = result?.observation || {} as ObservationData;
  const analysis = result?.analysis || {} as AnalysisData;
  const crossArea = result?.cross_area || {} as CrossAreaData;
  const nextSteps = result?.next_steps || {} as NextStepsData;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-700 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <button onClick={() => { stopCamera(); router.back(); }} className="text-white/80 hover:text-white">
          ← {t('common.back')}
        </button>
        <h1 className="font-bold text-lg">{t('snap.title') || '📸 Snap & Identify'}</h1>
        <div className="w-16" />
      </div>

      {/* Phase: Camera — take photo first, no child selected yet */}
      {phase === 'camera' && !heldSnap && (
        <div className="flex flex-col items-center">
          <div className="bg-white px-4 py-2 w-full max-w-lg text-center shadow-sm">
            <p className="text-sm text-gray-600">{t('snap.snapFirstHint') || 'Take a photo of any child working — tag them after'}</p>
          </div>

          <div className="relative w-full max-w-lg aspect-[4/3] bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {isStreaming && (
              <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-center bg-gradient-to-t from-black/60">
                <button
                  onClick={captureFromCamera}
                  className="w-16 h-16 rounded-full bg-white border-4 border-violet-400 shadow-lg active:scale-95 transition-transform"
                  aria-label="Capture photo"
                />
              </div>
            )}
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileInput} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="mt-3 text-sm text-violet-600 hover:text-violet-700 underline">
            {t('snap.uploadFromGallery')}
          </button>
        </div>
      )}

      {/* Phase: Review — photo taken, confirm or retake */}
      {phase === 'review' && heldSnap && (
        <div className="flex flex-col items-center">
          <div className="relative w-full max-w-lg">
            <img src={heldSnap.preview} alt="Captured" className="w-full aspect-[4/3] object-cover" />
            <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-center gap-4 bg-gradient-to-t from-black/60">
              <button onClick={retakePhoto} className="px-5 py-2.5 bg-white/90 text-gray-700 rounded-lg font-medium shadow-md">
                {t('snap.retake')}
              </button>
              <button onClick={proceedToTag} className="px-5 py-2.5 bg-violet-600 text-white rounded-lg font-medium shadow-md hover:bg-violet-700">
                {t('snap.tagChild') || 'Tag Child →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase: Tag Child — pick which child this photo belongs to */}
      {phase === 'tag-child' && heldSnap && (
        <div className="max-w-lg mx-auto p-4">
          {/* Thumbnail of the held snap */}
          <div className="flex items-center gap-3 mb-4 bg-white rounded-xl p-3 shadow-sm">
            <img src={heldSnap.preview} alt="Snap" className="w-16 h-12 rounded-lg object-cover" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">{t('snap.whoIsThis') || 'Who is this?'}</p>
              <p className="text-xs text-gray-500">{t('snap.tapToTag') || 'Tap the child to start analysis'}</p>
            </div>
            <button onClick={retakePhoto} className="text-xs text-gray-400 hover:text-gray-600">
              {t('snap.retake')}
            </button>
          </div>

          <div className="space-y-2">
            {children.map(child => (
              <button
                key={child.id}
                onClick={() => tagChildAndSubmit(child)}
                className="w-full flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm hover:shadow-md hover:bg-violet-50 transition-all text-left"
              >
                {child.photo_url ? (
                  <img src={child.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <span className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-sm">
                    {child.name.charAt(0)}
                  </span>
                )}
                <span className="font-medium text-gray-800">{child.name}</span>
                <span className="ml-auto text-violet-500">→</span>
              </button>
            ))}
          </div>

          {children.length === 0 && (
            <p className="text-center text-gray-400 py-8">{t('common.loading')}</p>
          )}
        </div>
      )}

      {/* Pending analyses floating indicator */}
      {pendingAnalyses.length > 0 && phase !== 'result' && (
        <div className="fixed bottom-6 left-4 right-4 z-50 max-w-lg mx-auto">
          <div className="bg-violet-600 text-white rounded-xl px-4 py-3 shadow-lg flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {t('snap.analyzingCount') || `Analyzing ${pendingAnalyses.length} photo${pendingAnalyses.length > 1 ? 's' : ''}...`}
              </p>
              <p className="text-xs text-white/70 truncate">
                {pendingAnalyses.map(p => p.childName).join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Phase: Result */}
      {phase === 'result' && result && resultChild && (
        <div className="max-w-lg mx-auto p-4 space-y-3">

          {/* 1. Photo + Work ID Card */}
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            {result.photo_url && (
              <img src={result.photo_url} alt="Captured work" className="w-full aspect-[4/3] object-cover" />
            )}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-medium ${
                  result.confidence === 'high' ? 'text-emerald-600' :
                  result.confidence === 'medium' ? 'text-amber-600' : 'text-red-500'
                }`}>
                  {result.confidence === 'high' ? t('snap.confidenceHigh') :
                   result.confidence === 'medium' ? t('snap.confidenceMedium') : t('snap.confidenceLow')}
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900">{result.work_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="w-5 h-5 rounded-full inline-flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ backgroundColor: AREA_CONFIG[result.area as keyof typeof AREA_CONFIG]?.color || '#6b7280' }}
                >
                  {AREA_CONFIG[result.area as keyof typeof AREA_CONFIG]?.icon || result.area[0]?.toUpperCase()}
                </span>
                <span className="text-sm text-gray-600">{result.area_label}</span>
                <span className="text-sm ml-auto">{STATUS_EMOJI[result.status] || ''} {result.status}</span>
              </div>

              {/* Normalization + Work Cycle badges */}
              <div className="flex gap-2 mt-3 flex-wrap">
                {obs.normalization && NORM_LABELS[obs.normalization] && (
                  <span className={`text-xs px-2 py-1 rounded-full bg-gray-100 ${NORM_LABELS[obs.normalization].color}`}>
                    {NORM_LABELS[obs.normalization].emoji} {t(`snap.${obs.normalization}`) || NORM_LABELS[obs.normalization].label}
                  </span>
                )}
                {obs.work_cycle_phase && CYCLE_LABELS[obs.work_cycle_phase] && (
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                    {CYCLE_LABELS[obs.work_cycle_phase].split(' ')[0]} {CYCLE_I18N_KEY[obs.work_cycle_phase] ? t(CYCLE_I18N_KEY[obs.work_cycle_phase]) : obs.work_cycle_phase}
                  </span>
                )}
                {analysis.trajectory && TRAJECTORY_LABELS[analysis.trajectory] && (
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                    {TRAJECTORY_LABELS[analysis.trajectory].emoji} {TRAJECTORY_I18N_KEY[analysis.trajectory] ? t(TRAJECTORY_I18N_KEY[analysis.trajectory]) : TRAJECTORY_LABELS[analysis.trajectory].label}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 2. Observation Notes */}
          <Section title={t('snap.sectionObservation')} emoji="👁" defaultOpen>
            <p className="text-gray-700 text-sm leading-relaxed mb-3">{obs.detailed_notes || t('snap.noDetailedNotes')}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {obs.concentration_level && (
                <div className="bg-gray-50 rounded-lg p-2">
                  <span className="text-gray-500">{t('snap.concentration')}:</span>{' '}
                  <span className="font-medium text-gray-700 capitalize">{obs.concentration_level.replace('_', ' ')}</span>
                </div>
              )}
              {obs.independence_level && (
                <div className="bg-gray-50 rounded-lg p-2">
                  <span className="text-gray-500">{t('snap.independence')}:</span>{' '}
                  <span className="font-medium text-gray-700 capitalize">{obs.independence_level.replace('_', ' ')}</span>
                </div>
              )}
              {obs.emotional_state && (
                <div className="bg-gray-50 rounded-lg p-2">
                  <span className="text-gray-500">{t('snap.emotional')}:</span>{' '}
                  <span className="font-medium text-gray-700 capitalize">{obs.emotional_state.replace('_', ' ')}</span>
                </div>
              )}
              {obs.technique_notes && (
                <div className="bg-gray-50 rounded-lg p-2 col-span-2">
                  <span className="text-gray-500">{t('snap.technique')}:</span>{' '}
                  <span className="font-medium text-gray-700">{obs.technique_notes}</span>
                </div>
              )}
              {typeof obs.repetition_noted === 'boolean' && (
                <div className="bg-gray-50 rounded-lg p-2">
                  <span className="text-gray-500">{t('snap.repetition')}:</span>{' '}
                  <span className="font-medium text-gray-700">{obs.repetition_noted ? '✓' : '—'}</span>
                </div>
              )}
              {typeof obs.self_correcting === 'boolean' && (
                <div className="bg-gray-50 rounded-lg p-2">
                  <span className="text-gray-500">{t('snap.selfCorrecting')}:</span>{' '}
                  <span className="font-medium text-gray-700">{obs.self_correcting ? '✓' : '—'}</span>
                </div>
              )}
            </div>
            {obs.control_of_error_notes && obs.control_of_error_notes !== 'not visible from photo' && (
              <p className="text-xs text-gray-600 mt-2 bg-amber-50 p-2 rounded-lg">
                🔍 {t('snap.controlOfError')}: {obs.control_of_error_notes}
              </p>
            )}
          </Section>

          {/* 3. Sensitive Period */}
          {result.sensitive_period_alignment && result.sensitive_period_alignment !== 'No specific alignment' && (
            <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4">
              <p className="text-violet-800 text-sm">
                🌱 <span className="font-semibold">{t('snap.sensitivePeriod')}:</span> {result.sensitive_period_alignment}
              </p>
            </div>
          )}

          {/* 4. Area Progress */}
          <Section title={t('snap.sectionAreaProgress')} emoji="📊">
            {result.area_stats && (
              <div className="space-y-2 mb-3">
                {Object.entries(result.area_stats).map(([area, stats]) => (
                  <AreaBar key={area} area={area} stats={stats} />
                ))}
              </div>
            )}
            {analysis.relative_strength && (
              <p className="text-sm text-gray-600">{analysis.relative_strength}</p>
            )}
            {analysis.area_progress_summary && (
              <p className="text-sm text-gray-500 mt-1">{analysis.area_progress_summary}</p>
            )}
            {analysis.time_on_work && (
              <p className="text-xs text-gray-400 mt-2">⏱ {analysis.time_on_work}</p>
            )}
            {analysis.prerequisite_status && (
              <p className="text-xs mt-1 text-gray-500">📋 {analysis.prerequisite_status}</p>
            )}
          </Section>

          {/* 5. Cross-Area Analysis */}
          {(crossArea.foundation_gaps?.length || crossArea.recommended_support_works?.length) ? (
            <Section title={t('snap.sectionCrossArea')} emoji="🔗">
              {crossArea.foundation_gaps && crossArea.foundation_gaps.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">{t('snap.foundationGaps')}:</p>
                  {crossArea.foundation_gaps.map((gap, i) => (
                    <p key={i} className="text-sm text-red-600 ml-2">• {gap}</p>
                  ))}
                </div>
              )}
              {crossArea.recommended_support_works && crossArea.recommended_support_works.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">{t('snap.recommendedWorks')}:</p>
                  {crossArea.recommended_support_works.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-gray-600 ml-2 mb-1">
                      <span
                        className="w-4 h-4 rounded-full inline-flex items-center justify-center text-white text-[8px] font-bold mt-0.5 shrink-0"
                        style={{ backgroundColor: AREA_CONFIG[w.area as keyof typeof AREA_CONFIG]?.color || '#6b7280' }}
                      >
                        {AREA_CONFIG[w.area as keyof typeof AREA_CONFIG]?.icon || '?'}
                      </span>
                      <span><strong>{w.work_name}</strong> — {w.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          ) : null}

          {/* 6. Next Steps */}
          <Section title={t('snap.sectionNextSteps')} emoji="🎯" defaultOpen>
            {nextSteps.stay_or_advance && ADVANCE_LABELS[nextSteps.stay_or_advance] && (
              <div className={`inline-block text-sm font-medium px-3 py-1.5 rounded-lg mb-3 ${ADVANCE_LABELS[nextSteps.stay_or_advance].color}`}>
                {ADVANCE_LABELS[nextSteps.stay_or_advance].emoji} {ADVANCE_I18N_KEY[nextSteps.stay_or_advance] ? t(ADVANCE_I18N_KEY[nextSteps.stay_or_advance]) : ADVANCE_LABELS[nextSteps.stay_or_advance].label}
              </div>
            )}
            {nextSteps.reason && (
              <p className="text-sm text-gray-700 mb-3">{nextSteps.reason}</p>
            )}
            {nextSteps.next_work_in_area && (
              <p className="text-sm text-gray-600 mb-2">
                ➡️ {t('snap.nextInSequence')}: <strong>{nextSteps.next_work_in_area}</strong>
              </p>
            )}
            {nextSteps.suggested_variations && nextSteps.suggested_variations.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-semibold text-gray-500 mb-1">{t('snap.variationsToTry')}:</p>
                {nextSteps.suggested_variations.map((v, i) => (
                  <p key={i} className="text-sm text-gray-600 ml-2">• {v}</p>
                ))}
              </div>
            )}
            {nextSteps.priority_actions && nextSteps.priority_actions.length > 0 && (
              <div className="bg-violet-50 rounded-lg p-3 mt-2">
                <p className="text-xs font-semibold text-violet-700 mb-1">{t('snap.priorityActions')}:</p>
                {nextSteps.priority_actions.map((a, i) => (
                  <p key={i} className="text-sm text-violet-800 ml-2">{i + 1}. {a}</p>
                ))}
              </div>
            )}
          </Section>

          {/* 7. Weekly Admin Narrative */}
          {result.weekly_narrative && (
            <Section title={t('snap.sectionWeeklyAdmin')} emoji="📝">
              <div className="bg-gray-50 rounded-lg p-3 mb-2">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {showZh && result.weekly_narrative_zh ? result.weekly_narrative_zh : result.weekly_narrative}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyNarrative}
                  className="text-xs px-3 py-1.5 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-colors"
                >
                  {narrativeCopied ? `✓ ${t('snap.copied')}` : `📋 ${t('snap.copyNarrative')}`}
                </button>
                {result.weekly_narrative_zh && (
                  <button
                    onClick={() => setShowZh(!showZh)}
                    className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {showZh ? 'EN' : '中文'}
                  </button>
                )}
              </div>
            </Section>
          )}

          {/* 8. Status confirmation + parent visibility toggle */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
            <p className="text-emerald-700 text-sm">
              {result.progress_updated
                ? `✅ ${resultChild.name} — ${t('snap.progressUpdated')} — ${result.work_name} → ${result.status}`
                : `⚠️ ${t('snap.progressIssue')}`
              }
            </p>
            <p className="text-emerald-600 text-xs mt-1">{t('snap.photoSaved')}</p>
          </div>

          {/* Parent report visibility toggle */}
          <button
            onClick={toggleParentVisible}
            disabled={togglingVisibility}
            className={`w-full rounded-xl p-3 flex items-center justify-between transition-colors ${
              togglingVisibility ? 'opacity-60 cursor-not-allowed' : ''
            } ${
              parentVisible
                ? 'bg-white border border-gray-200 hover:bg-gray-50'
                : 'bg-amber-50 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{parentVisible ? '👁' : '🙈'}</span>
              <span className="text-sm font-medium text-gray-700">
                {t('snap.parentReportLabel') || 'Parent Report'}
              </span>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              parentVisible
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {parentVisible
                ? (t('snap.visible') || 'Visible')
                : (t('snap.hidden') || 'Hidden')
              }
            </span>
          </button>

          {/* 9. Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={backToCamera}
              className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors"
            >
              📸 {t('snap.snapAnother') || 'Snap Another'}
            </button>
          </div>

          <button
            onClick={() => router.push(`/montree/dashboard/${resultChild.id}/progress`)}
            className="w-full py-2.5 text-sm text-violet-600 hover:text-violet-700 underline"
          >
            {resultChild.name} — {t('snap.viewProgress')}
          </button>
        </div>
      )}
    </div>
  );
}
