// /montree/dashboard/paper-scan/page.tsx
// Paper Scan (Cellphoneless Classrooms) — teachers handwrite observations on a
// record sheet during class, then photograph the sheet here after class. Claude
// reads it, we show an HONEST review (every low-confidence read is flagged), and
// only what the teacher approves is written to the children's profiles.
//
// 5-state machine: home → uploading → processing → review → done
'use client';

import { useState, useEffect, useCallback, useMemo, useRef, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { ScanLine, Camera, Images, Check, X, Printer } from 'lucide-react';
import { getSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { useFeatures } from '@/hooks/useFeatures';
import { compressImage } from '@/lib/montree/media/compression';
import { isNativeCameraAvailable, captureNativePhoto } from '@/lib/montree/platform/camera';
import LayoutTeacher from '@/components/montree/paper-scan/LayoutTeacher';
import type { MontreeChild } from '@/lib/montree/media/types';

type PageState = 'home' | 'uploading' | 'processing' | 'review' | 'done';

type ScanStatus = 'pending' | 'extracting' | 'review' | 'committed' | 'failed';
type NameLegibility = 'clear' | 'partial' | 'guess';
type StatusConfidence = 'high' | 'medium' | 'low';
type ProposedStatus = 'presented' | 'practicing' | 'mastered';
type WorkArea = 'practical_life' | 'sensorial' | 'mathematics' | 'language' | 'cultural';
type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'edited';
// 336: the unit of record is frequency + a rough time bucket, not minutes.
type TimeBucket = 'short' | 'medium' | 'long';
type Concentration = 'wd' | 'wc' | 'dc';

interface PaperScan {
  id: string;
  status: ScanStatus;
  sheet_date: string | null;
  created_at: string;
  children_found: number | null;
  entries_found: number | null;
  overall_confidence: 'high' | 'medium' | 'low' | null;
  sheet_summary?: string | null;
  error_message?: string | null;
}

interface PaperExtraction {
  id: string;
  child_name_raw: string | null;
  name_legibility: NameLegibility | null;
  child_id: string | null;
  match_confidence: number | null;
  work_name_raw: string | null;
  work_key: string | null;
  work_name: string | null;
  work_match_confidence: number | null;
  area: WorkArea | null;
  proposed_status: ProposedStatus | null;
  status_confidence: StatusConfidence | null;
  time_minutes: number | null;
  frequency: number | null;
  time_bucket: TimeBucket | null;
  concentration: Concentration | null;
  note: string | null;
  general_note: string | null;
  review_status: ReviewStatus | null;
  teacher_final_status: ProposedStatus | null;
  teacher_final_note: string | null;
}

interface CommitResult {
  progress_updated: number;
  // Progress upserts the commit route tried and could NOT write. The sheet is
  // still marked committed, so without surfacing this the teacher believes
  // every approved row landed on a child's profile when some silently didn't.
  progress_failed: number;
  observations_created: number;
  /** montree_observation_sessions rows written for this sheet (336). */
  sessions_created: number;
  skipped: number;
  /** Rows saved with something missing — an unknown area, mostly. */
  warnings?: string[];
}

const AREAS: WorkArea[] = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
const STATUSES: ProposedStatus[] = ['presented', 'practicing', 'mastered'];
const BUCKETS: TimeBucket[] = ['short', 'medium', 'long'];
const CONCENTRATIONS: Concentration[] = ['wd', 'wc', 'dc'];
const FREQUENCY_MAX = 20;

/** Literal keys (not a template string) so TranslationKey stays checkable. */
function bucketKey(bucket: TimeBucket) {
  if (bucket === 'short') return 'paperScan.fields.bucketShort' as const;
  if (bucket === 'medium') return 'paperScan.fields.bucketMedium' as const;
  return 'paperScan.fields.bucketLong' as const;
}

// A read we are not sure about. Surfacing these is the whole trust story of the
// feature — a silently-wrong record is far more expensive than a flagged one.
const CONFIDENCE_FLOOR = 0.7;

const POLL_MS = 3000;
const SLOW_AFTER_MS = 3 * 60 * 1000;

function todayIso(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// overall_confidence is a string tier from the extractor ('high'|'medium'|'low').
// Anything unexpected renders as no badge rather than a wrong one.
function confTier(value: string | null | undefined): 'high' | 'medium' | 'low' | null {
  return value === 'high' || value === 'medium' || value === 'low' ? value : null;
}

export default function PaperScanPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { isEnabled, loading: featuresLoading } = useFeatures();

  const [loading, setLoading] = useState(true);
  const [classroomId, setClassroomId] = useState<string>('');
  const [children, setChildren] = useState<MontreeChild[]>([]);

  const [pageState, setPageState] = useState<PageState>('home');
  const [featureDisabled, setFeatureDisabled] = useState(false);

  const [scans, setScans] = useState<PaperScan[]>([]);
  const [scan, setScan] = useState<PaperScan | null>(null);
  const [extractions, setExtractions] = useState<PaperExtraction[]>([]);
  const [sheetDate, setSheetDate] = useState<string>(todayIso());

  const [uploadPhase, setUploadPhase] = useState<'preparing' | 'sending'>('preparing');
  const [processingSlow, setProcessingSlow] = useState(false);
  const [scanFailed, setScanFailed] = useState(false);
  const [busyRowId, setBusyRowId] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const processingStartedAt = useRef<number>(0);

  // ── Session + roster ────────────────────────────────────────────────────
  useEffect(() => {
    const sess = getSession();
    if (!sess) {
      router.push('/montree/login');
      return;
    }
    if (sess.classroom?.id) setClassroomId(sess.classroom.id);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/montree/children');
        if (!res.ok) {
          console.error('[paper-scan] Children API error:', res.status);
          return;
        }
        const data = await res.json();
        if (!cancelled && data.children) setChildren(data.children as MontreeChild[]);
      } catch (err) {
        console.error('[paper-scan] Failed to fetch children:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const childName = useCallback(
    (childId: string | null): string | null => children.find(c => c.id === childId)?.name ?? null,
    [children],
  );

  // ── Recent scans ────────────────────────────────────────────────────────
  const loadScans = useCallback(async () => {
    try {
      const qs = classroomId ? `?classroom_id=${encodeURIComponent(classroomId)}` : '';
      const res = await montreeApi(`/api/montree/paper-scan${qs}`);
      if (res.status === 403) {
        const body = await res.json().catch(() => ({}));
        if (body?.error === 'feature_disabled') setFeatureDisabled(true);
        return;
      }
      if (!res.ok) throw new Error(`Scan list: ${res.status}`);
      const data = await res.json();
      setScans(Array.isArray(data?.scans) ? data.scans : Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[paper-scan] Scan list error:', err);
    }
  }, [classroomId]);

  useEffect(() => {
    if (loading) return;
    void loadScans();
  }, [loading, loadScans]);

  // ── Load a single scan (+ extractions) ──────────────────────────────────
  const loadScan = useCallback(async (scanId: string): Promise<PaperScan | null> => {
    const res = await montreeApi(`/api/montree/paper-scan/${scanId}`);
    if (!res.ok) throw new Error(`Scan fetch: ${res.status}`);
    const data = await res.json();
    const nextScan: PaperScan | null = data?.scan ?? null;
    setScan(nextScan);
    setExtractions(Array.isArray(data?.extractions) ? data.extractions : []);
    return nextScan;
  }, []);

  // Fire-and-forget — the server takes 20-60s and we never await the body.
  const triggerExtract = useCallback((scanId: string) => {
    try {
      void montreeApi(`/api/montree/paper-scan/${scanId}/extract`, { method: 'POST' })
        .catch(() => { /* fire-and-forget: progress comes from polling */ });
    } catch {
      /* fire-and-forget */
    }
  }, []);

  const startProcessing = useCallback((scanId: string) => {
    processingStartedAt.current = Date.now();
    setProcessingSlow(false);
    setScanFailed(false);
    setScan(prev => (prev && prev.id === scanId ? { ...prev, status: 'pending' } : {
      id: scanId,
      status: 'pending',
      sheet_date: null,
      created_at: new Date().toISOString(),
      children_found: null,
      entries_found: null,
      overall_confidence: null,
    }));
    setPageState('processing');
  }, []);

  // ── Poll while pending|extracting ───────────────────────────────────────
  useEffect(() => {
    if (pageState !== 'processing' || !scan?.id) return;
    const scanId = scan.id;
    let cancelled = false;

    const tick = async () => {
      try {
        const next = await loadScan(scanId);
        if (cancelled || !next) return;
        if (next.status === 'review' || next.status === 'committed') {
          setPageState('review');
          void loadScans();
        } else if (next.status === 'failed') {
          setScanFailed(true);
        } else if (Date.now() - processingStartedAt.current > SLOW_AFTER_MS) {
          setProcessingSlow(true);
        }
      } catch (err) {
        console.error('[paper-scan] Poll error:', err);
      }
    };

    void tick();
    const id = window.setInterval(tick, POLL_MS);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [pageState, scan?.id, loadScan, loadScans]);

  // ── Upload ──────────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file: File | null | undefined) => {
    if (!file) return;
    setPageState('uploading');
    setUploadPhase('preparing');

    let blob: Blob = file;
    try {
      const compressed = await Promise.race([
        compressImage(file),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Compression timed out after 15s')), 15_000),
        ),
      ]);
      blob = compressed.blob;
    } catch (err) {
      console.error('[paper-scan] Compression failed, using original:', err);
      blob = file;
    }

    setUploadPhase('sending');
    try {
      const fd = new FormData();
      // Multipart goes through plain fetch (same-origin cookie auth, exactly as
      // the capture page does) — montreeApi sets a JSON content-type, which
      // would destroy the multipart boundary.
      fd.append('photo', blob, 'record-sheet.jpg');
      if (classroomId) fd.append('classroom_id', classroomId);
      if (sheetDate) fd.append('sheet_date', sheetDate);

      const res = await fetch('/api/montree/paper-scan/upload', { method: 'POST', body: fd });

      if (res.status === 403) {
        const body = await res.json().catch(() => ({}));
        if (body?.error === 'feature_disabled') {
          setFeatureDisabled(true);
          setPageState('home');
          return;
        }
      }
      if (!res.ok) throw new Error(`Upload: ${res.status}`);

      const data = await res.json();
      const scanId: string | undefined = data?.scan_id;
      if (!scanId) throw new Error('Upload returned no scan_id');

      triggerExtract(scanId);
      startProcessing(scanId);
    } catch (err) {
      console.error('[paper-scan] Upload error:', err);
      toast.error(t('paperScan.uploadFailed'));
      setPageState('home');
    }
  }, [classroomId, sheetDate, t, triggerExtract, startProcessing]);

  const onInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so picking the SAME file twice still fires change.
    e.target.value = '';
    void handleFile(file);
  }, [handleFile]);

  // ── Camera button ───────────────────────────────────────────────────────
  // A bare <input type="file" capture="environment"> is only a HINT: iOS/Android
  // browsers honour it, the Capacitor shell does not always, and desktop
  // browsers ignore it entirely and show a file picker. The app already ships a
  // proven native path (@capacitor/camera via lib/montree/platform/camera.ts,
  // used by components/montree/media/CameraCapture.tsx), so use it when we're in
  // the native shell and keep the input as the web fallback. Either way the
  // photo goes through the SAME handleFile() compress + upload path.
  const handleCameraClick = useCallback(async () => {
    if (!isNativeCameraAvailable()) {
      cameraInputRef.current?.click();
      return;
    }
    try {
      const photo = await captureNativePhoto({ facing: 'environment' });
      // handleFile takes a File; CapturedPhoto gives us a Blob. compressImage
      // accepts File | Blob, but the multipart append below names the part, so
      // wrapping keeps the filename/type explicit.
      const file = new File([photo.blob], 'record-sheet.jpg', {
        type: photo.blob.type || 'image/jpeg',
        lastModified: Date.now(),
      });
      await handleFile(file);
    } catch (err) {
      // House pattern (CameraCapture.tsx): a cancel is not an error.
      if (err instanceof Error && err.message.includes('cancelled')) return;
      console.error('[paper-scan] Native camera failed, falling back to input:', err);
      cameraInputRef.current?.click();
    }
  }, [handleFile]);

  // Web-desktop hint. On a phone the camera button opens the camera; on a
  // laptop `capture` is ignored and the teacher gets a file picker, which reads
  // as broken unless we say so. Computed in an effect so SSR and first paint agree.
  const [showDesktopHint, setShowDesktopHint] = useState(false);
  useEffect(() => {
    if (isNativeCameraAvailable()) return;
    const coarsePointer = typeof window.matchMedia === 'function'
      ? window.matchMedia('(pointer: coarse)').matches
      : false;
    const touchCapable = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
    if (!coarsePointer && !touchCapable) setShowDesktopHint(true);
  }, []);

  const handleRetryExtract = useCallback(() => {
    if (!scan?.id) return;
    triggerExtract(scan.id);
    startProcessing(scan.id);
  }, [scan?.id, triggerExtract, startProcessing]);

  const openScan = useCallback(async (row: PaperScan) => {
    try {
      if (row.status === 'pending' || row.status === 'extracting') {
        setScan(row);
        startProcessing(row.id);
        return;
      }
      if (row.status === 'failed') {
        setScan(row);
        setPageState('processing');
        setScanFailed(true);
        return;
      }
      await loadScan(row.id);
      setPageState('review');
    } catch (err) {
      console.error('[paper-scan] Open scan error:', err);
      toast.error(t('paperScan.loadFailed'));
    }
  }, [loadScan, startProcessing, t]);

  // ── Review actions ──────────────────────────────────────────────────────
  const patchExtraction = useCallback(async (
    extractionId: string,
    body: Record<string, unknown>,
  ): Promise<boolean> => {
    try {
      const res = await montreeApi(`/api/montree/paper-scan/extraction/${extractionId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Extraction patch: ${res.status}`);
      return true;
    } catch (err) {
      console.error('[paper-scan] Extraction patch error:', err);
      toast.error(t('paperScan.saveFailed'));
      return false;
    }
  }, [t]);

  const setRow = useCallback((extractionId: string, patch: Partial<PaperExtraction>) => {
    setExtractions(prev => prev.map(e => (e.id === extractionId ? { ...e, ...patch } : e)));
  }, []);

  const decide = useCallback(async (extractionId: string, action: 'approve' | 'reject') => {
    const previous = extractions.find(e => e.id === extractionId)?.review_status ?? 'pending';
    setBusyRowId(extractionId);
    setRow(extractionId, { review_status: action === 'approve' ? 'approved' : 'rejected' });
    const ok = await patchExtraction(extractionId, { action });
    if (!ok) setRow(extractionId, { review_status: previous });
    setBusyRowId(null);
  }, [extractions, patchExtraction, setRow]);

  // An edit implicitly marks the row 'edited' (server-side too) — a teacher who
  // corrected a row has, by definition, reviewed it.
  const editRow = useCallback(async (
    extractionId: string,
    edit: Record<string, unknown>,
    local: Partial<PaperExtraction>,
  ) => {
    const before = extractions.find(e => e.id === extractionId);
    setRow(extractionId, { ...local, review_status: 'edited' });
    const ok = await patchExtraction(extractionId, { action: 'edit', ...edit });
    if (!ok && before) {
      // Never leave the teacher looking at an edit the server did not take.
      const revert: Partial<PaperExtraction> = { review_status: before.review_status };
      for (const key of Object.keys(local) as (keyof PaperExtraction)[]) {
        (revert as Record<string, unknown>)[key] = before[key];
      }
      setRow(extractionId, revert);
    }
  }, [extractions, patchExtraction, setRow]);

  const pendingMatched = useMemo(
    () => extractions.filter(e => e.child_id && (e.review_status ?? 'pending') === 'pending'),
    [extractions],
  );

  const approveAllMatched = useCallback(async () => {
    if (!scan?.id || pendingMatched.length === 0) return;
    setBusyRowId('__all__');
    // The batch branch keys off the body (action + scan_id); we anchor the URL
    // on a real extraction id from this scan so the route never has to resolve
    // a synthetic path segment.
    const ok = await patchExtraction(pendingMatched[0].id, { action: 'approve_all', scan_id: scan.id });
    if (ok) {
      try {
        await loadScan(scan.id);
      } catch (err) {
        console.error('[paper-scan] Reload after approve_all failed:', err);
      }
    }
    setBusyRowId(null);
  }, [scan?.id, pendingMatched, patchExtraction, loadScan]);

  const approvedCount = useMemo(
    () => extractions.filter(e => e.review_status === 'approved' || e.review_status === 'edited').length,
    [extractions],
  );

  const commit = useCallback(async () => {
    if (!scan?.id) return;
    if (approvedCount === 0) {
      toast.error(t('paperScan.nothingApproved'));
      return;
    }
    setCommitting(true);
    try {
      const res = await montreeApi(`/api/montree/paper-scan/${scan.id}/commit`, { method: 'POST' });
      if (!res.ok) throw new Error(`Commit: ${res.status}`);
      const data = await res.json();
      const progressFailed = Number(data?.progress_failed ?? 0) || 0;
      setCommitResult({
        progress_updated: data?.progress_updated ?? 0,
        progress_failed: progressFailed,
        observations_created: data?.observations_created ?? 0,
        sessions_created: data?.sessions_created ?? 0,
        skipped: data?.skipped ?? 0,
        warnings: Array.isArray(data?.warnings) ? data.warnings : undefined,
      });
      setPageState('done');
      // Partial data loss must never hide behind a green toast: the commit route
      // marks the sheet committed even when some progress upserts error, so a
      // silent success here would tell the teacher records landed that didn't.
      if (progressFailed > 0) {
        toast.warning(t('paperScan.progressFailed').replace('{count}', String(progressFailed)), {
          duration: 10000,
        });
      } else {
        toast.success(t('paperScan.commitSuccess'));
      }
      void loadScans();
    } catch (err) {
      console.error('[paper-scan] Commit error:', err);
      toast.error(t('paperScan.commitFailed'));
    } finally {
      setCommitting(false);
    }
  }, [scan?.id, approvedCount, t, loadScans]);

  const startOver = useCallback(() => {
    setScan(null);
    setExtractions([]);
    setCommitResult(null);
    setScanFailed(false);
    setProcessingSlow(false);
    setSheetDate(todayIso());
    setPageState('home');
    void loadScans();
  }, [loadScans]);

  // ── Grouping: one card per child on the sheet ───────────────────────────
  const groups = useMemo(() => {
    const map = new Map<string, PaperExtraction[]>();
    for (const e of extractions) {
      const key = e.child_id
        ? `id:${e.child_id}`
        : `raw:${(e.child_name_raw ?? '').trim().toLowerCase() || e.id}`;
      const list = map.get(key);
      if (list) list.push(e);
      else map.set(key, [e]);
    }
    return Array.from(map.values());
  }, [extractions]);

  const scanStatusLabel = useCallback((status: ScanStatus | string): string => {
    switch (status) {
      case 'pending': return t('paperScan.scanStatus.pending');
      case 'extracting': return t('paperScan.scanStatus.extracting');
      case 'review': return t('paperScan.scanStatus.review');
      case 'committed': return t('paperScan.scanStatus.committed');
      case 'failed': return t('paperScan.scanStatus.failed');
      default: return status;
    }
  }, [t]);

  // ── Render ──────────────────────────────────────────────────────────────
  if (loading || featuresLoading) {
    return (
      <div className="min-h-screen bg-[#0a1a0f] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const glow = (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none"
      style={{ background: 'radial-gradient(circle at 50% 0%, rgba(39,129,90,0.32), transparent 60%)' }}
    />
  );

  if (!isEnabled('paper_scan') || featureDisabled) {
    return (
      <div className="min-h-screen bg-[#0a1a0f] p-6 relative">
        {glow}
        <Toaster position="top-center" />
        <div className="relative max-w-lg mx-auto text-center py-20">
          <ScanLine className="w-12 h-12 mx-auto mb-4 text-emerald-400/70" />
          <h1 className="text-2xl font-bold text-white/95 mb-3">{t('paperScan.disabledTitle')}</h1>
          <p className="text-white/60 mb-6">{t('paperScan.disabledBody')}</p>
          <p className="text-sm text-white/40">{t('paperScan.contactAdmin')}</p>
        </div>
      </div>
    );
  }

  const overallConf = confTier(scan?.overall_confidence);

  return (
    <div className="min-h-screen bg-[#0a1a0f] relative">
      {glow}
      <Toaster position="top-center" />

      {/* Header */}
      <div className="relative bg-[rgba(7,18,12,0.9)] border-b border-[rgba(52,211,153,0.15)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (pageState === 'home' ? router.push('/montree/dashboard') : startOver())}
            className="btn btn-ghost btn-icon btn-sm"
            aria-label={t('common.back')}
          >
            ←
          </button>
          <h1 className="text-lg font-semibold text-white/95 flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-emerald-400" />
            {t('paperScan.title')}
          </h1>
        </div>
        {scan?.sheet_date && pageState !== 'home' && (
          <span className="text-xs text-white/40">{scan.sheet_date}</span>
        )}
      </div>

      <div className="relative max-w-2xl mx-auto p-4 pb-28">
        {/* ── HOME ── */}
        {pageState === 'home' && (
          <div>
            <div className="rounded-2xl border border-[rgba(52,211,153,0.2)] bg-white/[0.06] p-5 text-center">
              <ScanLine className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
              <h2 className="text-xl font-bold text-white/95 mb-2">{t('paperScan.scanCta')}</h2>
              <p className="text-sm text-white/60 mb-5">{t('paperScan.subtitle')}</p>

              <label className="block text-left text-xs text-white/50 mb-1" htmlFor="paper-scan-date">
                {t('paperScan.sheetDate')}
              </label>
              <input
                id="paper-scan-date"
                type="date"
                value={sheetDate}
                onChange={(e) => setSheetDate(e.target.value)}
                className="w-full mb-4 px-3 py-2 rounded-lg bg-white/[0.06] border border-[rgba(52,211,153,0.2)] text-white/90 text-sm"
              />

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onInputChange}
                className="hidden"
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={onInputChange}
                className="hidden"
              />

              <button
                onClick={() => { void handleCameraClick(); }}
                className="btn btn-primary btn-lg btn-full"
              >
                <Camera className="w-5 h-5" />
                {t('paperScan.takePhoto')}
              </button>
              {showDesktopHint && (
                <p className="mt-2 text-xs text-white/40 leading-snug">
                  {t('paperScan.desktopHint')}
                </p>
              )}
              <button
                onClick={() => galleryInputRef.current?.click()}
                className="btn btn-secondary btn-lg btn-full mt-2"
              >
                <Images className="w-5 h-5" />
                {t('paperScan.chooseFromGallery')}
              </button>

              {/* Montree Standard Sheet (MT-STD-1) for the chosen date: opens the
                  print route in a new tab, which pops the browser print dialog.
                  Cookie auth rides along (same origin). */}
              <button
                type="button"
                onClick={() => {
                  const qs = new URLSearchParams({ date: sheetDate });
                  if (classroomId) qs.set('classroom_id', classroomId);
                  window.open(`/api/montree/paper-scan/sheet/print?${qs.toString()}`, '_blank', 'noopener');
                }}
                className="btn btn-secondary btn-lg btn-full mt-2"
              >
                <Printer className="w-5 h-5" />
                {t('paperScan.sheetPrint.printToday')}
              </button>
            </div>

            {/* Layer 1: teach Montree this classroom's own sheet once, and it
                reads every later scan of that sheet with the profile in hand. */}
            {classroomId && <LayoutTeacher classroomId={classroomId} locale={locale} />}

            <div className="mt-8">
              <h2 className="text-sm font-semibold text-white/70 mb-3">{t('paperScan.recentScans')}</h2>
              {scans.length === 0 && (
                <div className="text-center text-white/40 text-sm py-8">{t('paperScan.noScans')}</div>
              )}
              <div className="space-y-2">
                {scans.map(row => {
                  const conf = confTier(row.overall_confidence);
                  // A committed sheet is history — it shows its counts, but its
                  // records are already on the children's profiles and are not
                  // re-editable from here.
                  const openable = row.status !== 'committed';
                  return (
                    <button
                      key={row.id}
                      onClick={() => { if (openable) void openScan(row); }}
                      disabled={!openable}
                      className={`w-full text-left bg-white/[0.06] rounded-lg border border-[rgba(52,211,153,0.15)] p-3 flex justify-between items-center transition ${
                        openable ? 'hover:bg-white/[0.1]' : 'cursor-default'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-medium text-white/90">
                          {row.sheet_date || new Date(row.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-white/40">
                          {t('paperScan.counts')
                            .replace('{children}', String(row.children_found ?? 0))
                            .replace('{entries}', String(row.entries_found ?? 0))}
                          {conf === 'low' ? ' · ⚠' : ''}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                        row.status === 'committed' ? 'bg-emerald-500/15 text-emerald-300' :
                        row.status === 'failed' ? 'bg-red-500/15 text-red-300' :
                        row.status === 'review' ? 'bg-amber-500/15 text-amber-300' :
                        'bg-white/10 text-white/50'
                      }`}>
                        {row.status === 'review' ? t('paperScan.resumeReview') : scanStatusLabel(row.status)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── UPLOADING ── */}
        {pageState === 'uploading' && (
          <div className="text-center py-24">
            <div className="animate-spin w-10 h-10 mx-auto mb-5 border-4 border-emerald-500 border-t-transparent rounded-full" />
            <h2 className="text-lg font-semibold text-white/95 mb-2">
              {uploadPhase === 'preparing' ? t('paperScan.preparing') : t('paperScan.uploading')}
            </h2>
            <p className="text-sm text-white/50">{t('paperScan.keepOpen')}</p>
          </div>
        )}

        {/* ── PROCESSING ── */}
        {pageState === 'processing' && (
          <div className="text-center py-20">
            {scanFailed ? (
              <>
                <div className="text-4xl mb-4">⚠️</div>
                <h2 className="text-lg font-semibold text-white/95 mb-2">{t('paperScan.failed')}</h2>
                <p className="text-sm text-white/50 mb-6">{t('paperScan.failedHint')}</p>
                <button
                  onClick={handleRetryExtract}
                  className="btn btn-primary btn-lg"
                >
                  {t('paperScan.retry')}
                </button>
                <button
                  onClick={startOver}
                  className="btn btn-ghost btn-sm mx-auto mt-3"
                >
                  {t('paperScan.scanAnother')}
                </button>
              </>
            ) : (
              <>
                <div className="animate-spin w-10 h-10 mx-auto mb-5 border-4 border-emerald-500 border-t-transparent rounded-full" />
                <h2 className="text-lg font-semibold text-white/95 mb-2">{t('paperScan.reading')}</h2>
                <p className="text-sm text-white/50">
                  {processingSlow ? t('paperScan.takingLong') : t('paperScan.readingHint')}
                </p>
                {processingSlow && (
                  <button
                    onClick={handleRetryExtract}
                    className="btn btn-secondary btn-lg mt-6"
                  >
                    {t('paperScan.retry')}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* ── REVIEW ── */}
        {pageState === 'review' && scan && (
          <div>
            <div className="rounded-xl border border-[rgba(52,211,153,0.2)] bg-white/[0.06] p-4 mb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-white/95">{t('paperScan.reviewTitle')}</h2>
                  <p className="text-xs text-white/50 mt-1">{t('paperScan.reviewHint')}</p>
                </div>
                {overallConf !== null && overallConf !== 'high' && (
                  <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                    overallConf === 'medium' ? 'bg-amber-500/15 text-amber-300' : 'bg-red-500/15 text-red-300'
                  }`}>
                    ⚠ {t('paperScan.lowConfidence')}
                  </span>
                )}
              </div>
              <div className="text-xs text-white/60 mt-3">
                {t('paperScan.counts')
                  .replace('{children}', String(scan.children_found ?? groups.length))
                  .replace('{entries}', String(scan.entries_found ?? extractions.length))}
              </div>
              {scan.sheet_summary && (
                <p className="text-sm text-white/70 mt-2 italic">{scan.sheet_summary}</p>
              )}
            </div>

            {extractions.length === 0 && (
              <div className="text-center text-white/40 text-sm py-12">{t('paperScan.noEntries')}</div>
            )}

            {pendingMatched.length > 0 && (
              <button
                onClick={approveAllMatched}
                disabled={busyRowId === '__all__'}
                className="btn btn-secondary btn-lg btn-full mb-4"
              >
                {t('paperScan.approveAllMatched').replace('{count}', String(pendingMatched.length))}
              </button>
            )}

            <div className="space-y-4">
              {groups.map(rows => {
                const head = rows[0];
                const matchedName = childName(head.child_id);
                const unclearName = head.name_legibility !== null && head.name_legibility !== 'clear';
                return (
                  <div
                    key={head.child_id ?? `raw-${head.id}`}
                    className="rounded-xl border border-[rgba(52,211,153,0.15)] bg-white/[0.05] overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-[rgba(52,211,153,0.12)] flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white/95 truncate">
                          {matchedName ?? head.child_name_raw ?? t('paperScan.unknownChild')}
                        </div>
                        {!matchedName && head.child_name_raw && (
                          <div className="text-[11px] text-white/40 truncate">{head.child_name_raw}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {unclearName && (
                          <span className="text-[10px] px-2 py-1 rounded-full bg-amber-500/15 text-amber-300">
                            {t('paperScan.unclearName')}
                          </span>
                        )}
                        {!matchedName && (
                          <span className="text-[10px] px-2 py-1 rounded-full bg-red-500/15 text-red-300">
                            {t('paperScan.unmatched')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="divide-y divide-[rgba(52,211,153,0.1)]">
                      {rows.map(row => {
                        const status = row.teacher_final_status ?? row.proposed_status;
                        const note = row.teacher_final_note ?? row.note ?? '';
                        const lowMatch = row.match_confidence !== null && row.match_confidence < CONFIDENCE_FLOOR;
                        const lowWork = row.work_match_confidence !== null && row.work_match_confidence < CONFIDENCE_FLOOR;
                        const lowStatus = row.status_confidence === 'low';
                        const rowState = row.review_status ?? 'pending';
                        const busy = busyRowId === row.id || busyRowId === '__all__';

                        return (
                          <div
                            key={row.id}
                            className={`p-4 ${
                              rowState === 'rejected' ? 'opacity-45' : ''
                            } ${
                              lowMatch || lowWork || lowStatus || unclearName
                                ? 'bg-amber-500/[0.05] border-l-2 border-l-amber-400/50'
                                : ''
                            }`}
                          >
                            {/* Child */}
                            <label className="block text-[11px] text-white/45 mb-1">
                              {t('paperScan.childField')}
                            </label>
                            <select
                              value={row.child_id ?? ''}
                              disabled={busy}
                              onChange={(e) => {
                                const value = e.target.value || null;
                                void editRow(row.id, { child_id: value }, { child_id: value });
                              }}
                              className={`w-full mb-3 px-3 py-2 rounded-lg bg-white/[0.06] border text-white/90 text-sm ${
                                lowMatch || !row.child_id ? 'border-amber-400/40' : 'border-[rgba(52,211,153,0.2)]'
                              }`}
                            >
                              <option value="">{t('paperScan.selectChild')}</option>
                              {children.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>

                            {/* Work */}
                            <label className="block text-[11px] text-white/45 mb-1">
                              {t('paperScan.workField')}
                            </label>
                            <input
                              type="text"
                              defaultValue={row.work_name ?? row.work_name_raw ?? ''}
                              disabled={busy}
                              placeholder={t('paperScan.workPlaceholder')}
                              onBlur={(e) => {
                                const value = e.target.value.trim();
                                if (value === (row.work_name ?? row.work_name_raw ?? '')) return;
                                void editRow(row.id, { work_name: value }, { work_name: value });
                              }}
                              className={`w-full mb-1 px-3 py-2 rounded-lg bg-white/[0.06] border text-white/90 text-sm ${
                                lowWork ? 'border-amber-400/40' : 'border-[rgba(52,211,153,0.2)]'
                              }`}
                            />
                            {row.work_name_raw && row.work_name && row.work_name_raw !== row.work_name && (
                              <div className="text-[11px] text-white/35 mb-3">
                                {t('paperScan.readAs').replace('{text}', row.work_name_raw)}
                              </div>
                            )}
                            {lowWork && (
                              <div className="text-[11px] text-amber-300/80 mb-3">{t('paperScan.lowConfidence')}</div>
                            )}

                            {/* Area chips */}
                            <label className="block text-[11px] text-white/45 mb-1 mt-3">
                              {t('paperScan.areaField')}
                            </label>
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {AREAS.map(area => (
                                <button
                                  key={area}
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void editRow(row.id, { area }, { area })}
                                  className={`btn btn-sm btn-pill ${
                                    row.area === area
                                      ? 'btn-primary'
                                      : 'btn-secondary'
                                  }`}
                                >
                                  {t(`area.${area}`)}
                                </button>
                              ))}
                            </div>
                            {!row.area && (row.work_name || row.work_name_raw) && (
                              <div className="text-[11px] text-amber-300/80 -mt-2 mb-3">
                                {t('paperScan.fields.needsArea')}
                              </div>
                            )}

                            {/* Status chips */}
                            <label className="block text-[11px] text-white/45 mb-1">
                              {t('paperScan.statusField')}
                            </label>
                            <div className="flex flex-wrap gap-1.5 mb-1">
                              {STATUSES.map(s => (
                                <button
                                  key={s}
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void editRow(row.id, { teacher_final_status: s }, { teacher_final_status: s })}
                                  className={`btn btn-sm btn-pill ${
                                    status === s
                                      ? 'btn-primary'
                                      : 'btn-secondary'
                                  }`}
                                >
                                  {t(`status.${s}`)}
                                </button>
                              ))}
                            </div>
                            {lowStatus && (
                              <div className="text-[11px] text-amber-300/80 mb-3">{t('paperScan.lowStatusConfidence')}</div>
                            )}

                            {/* How often, how long, how concentrated (336).
                                Three compact controls: the sheet's tally, its
                                time bubble and its AMI code. All three may be
                                blank — blank is data, not a missing value. */}
                            <div className="flex flex-wrap items-end gap-x-4 gap-y-2 mt-3 mb-3">
                              <div>
                                <label className="block text-[11px] text-white/45 mb-1">
                                  {t('paperScan.fields.frequency')}
                                </label>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={busy || (row.frequency ?? 0) <= 0}
                                    aria-label="-1"
                                    onClick={() => {
                                      const next = Math.max(0, (row.frequency ?? 1) - 1);
                                      const value = next === 0 ? null : next;
                                      void editRow(row.id, { frequency: value }, { frequency: value });
                                    }}
                                    className="btn btn-secondary btn-icon btn-sm"
                                  >
                                    −
                                  </button>
                                  <span className="w-8 text-center text-sm text-white/90">
                                    {row.frequency ?? '—'}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={busy || (row.frequency ?? 0) >= FREQUENCY_MAX}
                                    aria-label="+1"
                                    onClick={() => {
                                      const value = Math.min(FREQUENCY_MAX, (row.frequency ?? 0) + 1);
                                      void editRow(row.id, { frequency: value }, { frequency: value });
                                    }}
                                    className="btn btn-secondary btn-icon btn-sm"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              <div>
                                <label className="block text-[11px] text-white/45 mb-1">
                                  {t('paperScan.fields.timeBucket')}
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                  {BUCKETS.map(bucket => (
                                    <button
                                      key={bucket}
                                      type="button"
                                      disabled={busy}
                                      onClick={() => {
                                        // Tapping the selected pill clears it — an
                                        // unmarked bubble must stay unmarked.
                                        const value = row.time_bucket === bucket ? null : bucket;
                                        void editRow(row.id, { time_bucket: value }, { time_bucket: value });
                                      }}
                                      className={`btn btn-sm btn-pill ${row.time_bucket === bucket ? 'btn-primary' : 'btn-secondary'}`}
                                    >
                                      {t(bucketKey(bucket))}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <label
                                  className="block text-[11px] text-white/45 mb-1"
                                  title={t('paperScan.fields.concentrationHint')}
                                >
                                  {t('paperScan.fields.concentration')}
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                  {CONCENTRATIONS.map(code => (
                                    <button
                                      key={code}
                                      type="button"
                                      disabled={busy}
                                      title={t('paperScan.fields.concentrationHint')}
                                      onClick={() => {
                                        const value = row.concentration === code ? null : code;
                                        void editRow(row.id, { concentration: value }, { concentration: value });
                                      }}
                                      className={`btn btn-sm btn-pill ${row.concentration === code ? 'btn-primary' : 'btn-secondary'}`}
                                    >
                                      {code === 'wd' ? 'wd' : code.toUpperCase()}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Exact minutes — only when the sheet gives a written time. */}
                            <label className="block text-[11px] text-white/45 mb-1">
                              {t('paperScan.timeField')}
                            </label>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              defaultValue={row.time_minutes ?? ''}
                              disabled={busy}
                              onBlur={(e) => {
                                const raw = e.target.value.trim();
                                const value = raw === '' ? null : Number(raw);
                                if (value !== null && Number.isNaN(value)) return;
                                if (value === (row.time_minutes ?? null)) return;
                                void editRow(row.id, { time_minutes: value }, { time_minutes: value });
                              }}
                              className="w-28 px-3 py-2 rounded-lg bg-white/[0.06] border border-[rgba(52,211,153,0.2)] text-white/90 text-sm"
                            />
                            <div className="text-[11px] text-white/35 mt-1 mb-3">
                              {t('paperScan.fields.minutesHint')}
                            </div>

                            {/* Note */}
                            <label className="block text-[11px] text-white/45 mb-1">
                              {t('paperScan.noteField')}
                            </label>
                            <textarea
                              rows={2}
                              defaultValue={note}
                              disabled={busy}
                              placeholder={t('paperScan.notePlaceholder')}
                              onBlur={(e) => {
                                const value = e.target.value;
                                if (value === note) return;
                                void editRow(row.id, { teacher_final_note: value }, { teacher_final_note: value });
                              }}
                              className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-[rgba(52,211,153,0.2)] text-white/90 text-sm"
                            />

                            {row.general_note && (
                              <div className="text-[11px] text-white/40 mt-2">
                                {t('paperScan.generalNote')}: {row.general_note}
                              </div>
                            )}

                            {/* Decide */}
                            <div className="flex items-center gap-2 mt-4">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void decide(row.id, 'approve')}
                                className={`btn btn-sm flex-1 ${
                                  rowState === 'approved' || rowState === 'edited'
                                    ? 'btn-primary'
                                    : 'btn-secondary'
                                }`}
                              >
                                <Check className="w-4 h-4" />
                                {rowState === 'edited' ? t('paperScan.edited') : t('paperScan.approve')}
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void decide(row.id, 'reject')}
                                className={`btn btn-sm flex-1 ${
                                  rowState === 'rejected'
                                    ? 'btn-danger'
                                    : 'btn-secondary'
                                }`}
                              >
                                <X className="w-4 h-4" />
                                {t('paperScan.reject')}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Commit bar */}
            {extractions.length > 0 && (
              <div className="fixed bottom-0 left-0 right-0 bg-[rgba(7,18,12,0.95)] border-t border-[rgba(52,211,153,0.15)] p-3">
                <div className="max-w-2xl mx-auto">
                  <button
                    onClick={commit}
                    disabled={committing || approvedCount === 0}
                    className="btn btn-primary btn-lg btn-full"
                  >
                    {committing
                      ? t('paperScan.saving')
                      : t('paperScan.saveToProfiles').replace('{count}', String(approvedCount))}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DONE ── */}
        {pageState === 'done' && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-white/95 mb-2">{t('paperScan.doneTitle')}</h2>
            <p className="text-white/60 text-sm mb-2">
              {t('paperScan.doneSummary')
                .replace('{progress}', String(commitResult?.progress_updated ?? 0))
                .replace('{observations}', String(commitResult?.observations_created ?? 0))
                .replace('{skipped}', String(commitResult?.skipped ?? 0))}
            </p>
            <p className="text-white/45 text-sm mb-6">
              {t('paperScan.doneSessions').replace('{sessions}', String(commitResult?.sessions_created ?? 0))}
            </p>
            {/* An unknown area is not a failure, but the record is thinner for
                it: it lands on the child and stays out of every area report. */}
            {(commitResult?.warnings?.length ?? 0) > 0 && (
              <p className="max-w-md mx-auto mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                {t('paperScan.areaWarnings').replace('{count}', String(commitResult?.warnings?.length ?? 0))}
              </p>
            )}
            {/* The toast above expires; this stays on screen so the teacher can
                act on it. Same amber treatment the review screen uses for
                low-confidence reads. */}
            {(commitResult?.progress_failed ?? 0) > 0 && (
              <p className="max-w-md mx-auto mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                ⚠ {t('paperScan.progressFailed').replace('{count}', String(commitResult?.progress_failed ?? 0))}
              </p>
            )}
            <button
              onClick={startOver}
              className="btn btn-primary btn-lg"
            >
              {t('paperScan.scanAnother')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
