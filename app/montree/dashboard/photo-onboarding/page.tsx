// /montree/dashboard/photo-onboarding/page.tsx
// Photo Onboarding — the teacher uploads whatever class list the school already
// has (a photographed list, a PDF, a Word doc of parent-interview notes, a
// spreadsheet). Claude reads it, we reconcile against the classroom's live
// roster, and the teacher reviews a FULL diff before anything is written.
//
// 5-state machine: home → uploading → processing → review → done
//
// 🚨 The review step is the product. Nothing reaches montree_children until the
// teacher has seen every proposed create / update / archive and pressed Apply.
'use client';

import { useState, useEffect, useCallback, useMemo, useRef, type ChangeEvent, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { Upload, Camera, FileText, UserPlus, RefreshCw, Archive } from 'lucide-react';
import { getSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { useFeatures } from '@/hooks/useFeatures';

type PageState = 'home' | 'uploading' | 'processing' | 'review' | 'done';
type ImportStatus = 'pending' | 'extracting' | 'review' | 'committed' | 'failed';
type EntryKind = 'extracted' | 'departed';
type EntryAction = 'create' | 'update' | 'archive' | 'skip';

interface RosterImport {
  id: string;
  status: ImportStatus;
  source_type: string;
  error: string | null;
  created_at: string;
}

interface RosterEntry {
  id: string;
  kind: EntryKind;
  name_raw: string | null;
  date_of_birth: string | null;
  age: number | null;
  gender: string | null;
  notes: string | null;
  matched_child_id: string | null;
  match_confidence: number | null;
  match_type: string | null;
  suggested_action: EntryAction;
}

/** The teacher's working copy of a row — action + editable fields. */
interface DraftRow {
  id: string;
  kind: EntryKind;
  action: EntryAction;
  name: string;
  dob: string;
  notes: string;
  matchedChildId: string | null;
  matchedName: string | null;
  matchConfidence: number | null;
  matchType: string | null;
}

interface CommitResult {
  created: number;
  updated: number;
  archived: number;
  skipped: number;
  failed: number;
}

const ACCEPT =
  '.jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,.docx,.xlsx,.xlsm,' +
  'image/*,application/pdf,' +
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const POLL_MS = 3000;
const SLOW_AFTER_MS = 90 * 1000;

/** A fuzzy match below this deserves the teacher's eye, not a silent update. */
const CLOSE_MATCH_CEILING = 0.97;

export default function PhotoOnboardingPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { isEnabled, loading: featuresLoading } = useFeatures();

  const [loading, setLoading] = useState(true);
  const [classroomId, setClassroomId] = useState('');
  const [pageState, setPageState] = useState<PageState>('home');
  const [featureDisabled, setFeatureDisabled] = useState(false);

  const [importId, setImportId] = useState<string | null>(null);
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [failedReason, setFailedReason] = useState<string | null>(null);
  const [processingSlow, setProcessingSlow] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);
  const [dragging, setDragging] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const processingStartedAt = useRef(0);

  // ── Session ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const sess = getSession();
    if (!sess) {
      router.push('/montree/login');
      return;
    }
    if (sess.classroom?.id) setClassroomId(sess.classroom.id);
    setLoading(false);
  }, [router]);

  // ── Load an import + build the editable draft ───────────────────────────
  const loadImport = useCallback(async (id: string): Promise<RosterImport | null> => {
    const res = await montreeApi(`/api/montree/photo-onboarding/${id}`);
    if (!res.ok) throw new Error(`Import fetch: ${res.status}`);
    const data = await res.json();
    const row: RosterImport | null = data?.import ?? null;
    const entries: RosterEntry[] = Array.isArray(data?.entries) ? data.entries : [];
    const children: Record<string, { id: string; name: string }> = data?.children ?? {};

    setRows(entries.map((e) => ({
      id: e.id,
      kind: e.kind,
      action: e.suggested_action,
      name: e.name_raw ?? '',
      dob: e.date_of_birth ?? '',
      notes: e.notes ?? '',
      matchedChildId: e.matched_child_id,
      matchedName: e.matched_child_id ? (children[e.matched_child_id]?.name ?? null) : null,
      matchConfidence: e.match_confidence,
      matchType: e.match_type,
    })));

    return row;
  }, []);

  // Fire-and-forget — extraction takes 20-60s and we never await the body.
  const triggerExtract = useCallback((id: string) => {
    void montreeApi(`/api/montree/photo-onboarding/${id}/extract`, { method: 'POST' })
      .catch(() => { /* progress comes from polling */ });
  }, []);

  const startProcessing = useCallback((id: string) => {
    processingStartedAt.current = Date.now();
    setProcessingSlow(false);
    setFailedReason(null);
    setImportId(id);
    setPageState('processing');
  }, []);

  // ── Poll while pending|extracting ───────────────────────────────────────
  useEffect(() => {
    if (pageState !== 'processing' || !importId) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const row = await loadImport(importId);
        if (cancelled || !row) return;
        if (row.status === 'review' || row.status === 'committed') {
          setPageState('review');
        } else if (row.status === 'failed') {
          setFailedReason(row.error || t('photoOnboarding.readFailed'));
        } else if (Date.now() - processingStartedAt.current > SLOW_AFTER_MS) {
          setProcessingSlow(true);
        }
      } catch (err) {
        console.error('[photo-onboarding] Poll error:', err);
      }
    };

    void tick();
    const id = window.setInterval(tick, POLL_MS);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [pageState, importId, loadImport, t]);

  // ── Upload ──────────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file: File | null | undefined) => {
    if (!file) return;
    setPageState('uploading');
    try {
      const fd = new FormData();
      // Multipart goes through plain fetch — montreeApi forces a JSON
      // content-type, which would destroy the multipart boundary.
      fd.append('file', file, file.name || 'class-list');
      if (classroomId) fd.append('classroomId', classroomId);

      const res = await fetch('/api/montree/photo-onboarding/upload', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));

      if (res.status === 403 && data?.error === 'feature_disabled') {
        setFeatureDisabled(true);
        setPageState('home');
        return;
      }
      if (res.status === 400) {
        toast.error(typeof data?.error === 'string' ? data.error : t('photoOnboarding.unsupportedFile'));
        setPageState('home');
        return;
      }
      if (!res.ok || !data?.import_id) throw new Error(`Upload: ${res.status}`);

      triggerExtract(data.import_id);
      startProcessing(data.import_id);
    } catch (err) {
      console.error('[photo-onboarding] Upload error:', err);
      toast.error(t('photoOnboarding.uploadFailed'));
      setPageState('home');
    }
  }, [classroomId, t, triggerExtract, startProcessing]);

  const onInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // picking the SAME file twice must still fire change
    void handleFile(file);
  }, [handleFile]);

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    void handleFile(e.dataTransfer?.files?.[0]);
  }, [handleFile]);

  const retry = useCallback(() => {
    if (!importId) return;
    triggerExtract(importId);
    startProcessing(importId);
  }, [importId, triggerExtract, startProcessing]);

  const startOver = useCallback(() => {
    setImportId(null);
    setRows([]);
    setCommitResult(null);
    setFailedReason(null);
    setProcessingSlow(false);
    setPageState('home');
  }, []);

  // ── Review edits ────────────────────────────────────────────────────────
  const patchRow = useCallback((id: string, patch: Partial<DraftRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const creates = useMemo(() => rows.filter((r) => r.kind === 'extracted' && !r.matchedChildId), [rows]);
  const updates = useMemo(() => rows.filter((r) => r.kind === 'extracted' && !!r.matchedChildId), [rows]);
  const departed = useMemo(() => rows.filter((r) => r.kind === 'departed'), [rows]);

  const counts = useMemo(() => ({
    create: rows.filter((r) => r.action === 'create').length,
    update: rows.filter((r) => r.action === 'update').length,
    archive: rows.filter((r) => r.action === 'archive').length,
  }), [rows]);

  const applyChanges = useCallback(async () => {
    if (!importId) return;
    if (counts.create + counts.update + counts.archive === 0) {
      toast.error(t('photoOnboarding.nothingToApply'));
      return;
    }
    if (rows.some((r) => (r.action === 'create' || r.action === 'update') && !r.name.trim())) {
      toast.error(t('photoOnboarding.fieldName'));
      return;
    }

    setCommitting(true);
    try {
      const res = await montreeApi(`/api/montree/photo-onboarding/${importId}/commit`, {
        method: 'POST',
        body: JSON.stringify({
          entries: rows.map((r) => ({
            id: r.id,
            action: r.action,
            name: r.name.trim() || null,
            date_of_birth: r.dob.trim() || null,
            notes: r.notes.trim() || null,
          })),
        }),
      });
      if (!res.ok) throw new Error(`Commit: ${res.status}`);
      const data = await res.json();

      const result: CommitResult = {
        created: data?.created ?? 0,
        updated: data?.updated ?? 0,
        archived: data?.archived ?? 0,
        skipped: data?.skipped ?? 0,
        failed: data?.failed ?? 0,
      };
      setCommitResult(result);
      setPageState('done');

      // Partial data loss must never hide behind a green toast.
      if (result.failed > 0) {
        toast.warning(t('photoOnboarding.doneFailed').replace('{count}', String(result.failed)), { duration: 10000 });
      } else {
        toast.success(t('photoOnboarding.doneTitle'));
      }
    } catch (err) {
      console.error('[photo-onboarding] Commit error:', err);
      toast.error(t('photoOnboarding.applyFailed'));
    } finally {
      setCommitting(false);
    }
  }, [importId, rows, counts, t]);

  // ── Render ──────────────────────────────────────────────────────────────
  const glow = (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none"
      style={{ background: 'radial-gradient(circle at 50% 0%, rgba(39,129,90,0.32), transparent 60%)' }}
    />
  );

  if (loading || featuresLoading) {
    return (
      <div className="min-h-screen bg-[#0a1a0f] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isEnabled('photo_onboarding') || featureDisabled) {
    return (
      <div className="min-h-screen bg-[#0a1a0f] p-6 relative">
        {glow}
        <Toaster position="top-center" />
        <div className="relative max-w-lg mx-auto text-center py-20">
          <Upload className="w-12 h-12 mx-auto mb-4 text-emerald-400/70" />
          <h1 className="text-2xl font-bold text-white/95 mb-3">{t('photoOnboarding.disabledTitle')}</h1>
          <p className="text-white/60 mb-6">{t('photoOnboarding.disabledBody')}</p>
          <p className="text-sm text-white/40">{t('photoOnboarding.contactAdmin')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1a0f] relative">
      {glow}
      <Toaster position="top-center" />

      {/* Header */}
      <div className="relative bg-[rgba(7,18,12,0.9)] border-b border-[rgba(52,211,153,0.15)] px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => (pageState === 'home' ? router.push('/montree/dashboard/students') : startOver())}
          className="btn btn-ghost btn-icon btn-sm"
          aria-label={t('common.back')}
        >
          ←
        </button>
        <h1 className="text-lg font-semibold text-white/95 flex items-center gap-2">
          <Upload className="w-5 h-5 text-emerald-400" />
          {t('photoOnboarding.title')}
        </h1>
      </div>

      <div className="relative max-w-2xl mx-auto p-4 pb-28">
        {/* ── HOME ── */}
        {pageState === 'home' && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`rounded-2xl border p-5 text-center transition ${
              dragging
                ? 'border-emerald-400 bg-emerald-500/10'
                : 'border-[rgba(52,211,153,0.2)] bg-white/[0.06]'
            }`}
          >
            <FileText className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
            <h2 className="text-xl font-bold text-white/95 mb-2">{t('photoOnboarding.uploadCta')}</h2>
            <p className="text-sm text-white/60 mb-1">{t('photoOnboarding.subtitle')}</p>
            <p className="text-xs text-white/40 mb-5">{t('photoOnboarding.acceptedFormats')}</p>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onInputChange}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              onChange={onInputChange}
              className="hidden"
            />

            <button onClick={() => cameraInputRef.current?.click()} className="btn btn-primary btn-lg btn-full">
              <Camera className="w-5 h-5" />
              {t('photoOnboarding.takePhoto')}
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="btn btn-secondary btn-lg btn-full mt-2">
              <Upload className="w-5 h-5" />
              {t('photoOnboarding.chooseFile')}
            </button>

            <p className="mt-4 text-xs text-white/40 leading-snug">{t('photoOnboarding.nothingSavedYet')}</p>
          </div>
        )}

        {/* ── UPLOADING ── */}
        {pageState === 'uploading' && (
          <div className="text-center py-24">
            <div className="animate-spin w-10 h-10 mx-auto mb-5 border-4 border-emerald-500 border-t-transparent rounded-full" />
            <h2 className="text-lg font-semibold text-white/95">{t('photoOnboarding.uploading')}</h2>
          </div>
        )}

        {/* ── PROCESSING ── */}
        {pageState === 'processing' && (
          <div className="text-center py-20">
            {failedReason ? (
              <>
                <div className="text-4xl mb-4">⚠️</div>
                <h2 className="text-lg font-semibold text-white/95 mb-2">{t('photoOnboarding.readFailed')}</h2>
                <p className="text-sm text-white/50 mb-6">{t('photoOnboarding.readFailedHint')}</p>
                <div className="flex gap-2 justify-center">
                  <button onClick={retry} className="btn btn-primary btn-lg">
                    {t('photoOnboarding.retry')}
                  </button>
                  <button onClick={startOver} className="btn btn-secondary btn-lg">
                    {t('photoOnboarding.startOver')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="animate-spin w-10 h-10 mx-auto mb-5 border-4 border-emerald-500 border-t-transparent rounded-full" />
                <h2 className="text-lg font-semibold text-white/95 mb-2">{t('photoOnboarding.reading')}</h2>
                <p className="text-sm text-white/50">
                  {processingSlow ? t('photoOnboarding.slowHint') : t('photoOnboarding.readingHint')}
                </p>
              </>
            )}
          </div>
        )}

        {/* ── REVIEW ── */}
        {pageState === 'review' && (
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-white/95 mb-1">{t('photoOnboarding.reviewTitle')}</h2>
              <p className="text-sm text-white/55">{t('photoOnboarding.reviewSubtitle')}</p>
            </div>

            <Section
              icon={<UserPlus className="w-4 h-4 text-emerald-400" />}
              title={t('photoOnboarding.sectionNew')}
              hint={t('photoOnboarding.sectionNewHint')}
              rows={creates}
              actions={['create', 'skip']}
              t={t}
              onPatch={patchRow}
            />

            <Section
              icon={<RefreshCw className="w-4 h-4 text-sky-400" />}
              title={t('photoOnboarding.sectionUpdate')}
              hint={t('photoOnboarding.sectionUpdateHint')}
              rows={updates}
              actions={['update', 'create', 'skip']}
              t={t}
              onPatch={patchRow}
            />

            <Section
              icon={<Archive className="w-4 h-4 text-amber-400" />}
              title={t('photoOnboarding.sectionArchive')}
              hint={t('photoOnboarding.sectionArchiveHint')}
              rows={departed}
              actions={['archive', 'skip']}
              warn
              t={t}
              onPatch={patchRow}
            />
          </div>
        )}

        {/* ── DONE ── */}
        {pageState === 'done' && commitResult && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🌱</div>
            <h2 className="text-xl font-bold text-white/95 mb-4">{t('photoOnboarding.doneTitle')}</h2>
            <div className="text-sm text-white/60 space-y-1 mb-8">
              <p>{t('photoOnboarding.doneCreated').replace('{count}', String(commitResult.created))}</p>
              <p>{t('photoOnboarding.doneUpdated').replace('{count}', String(commitResult.updated))}</p>
              <p>{t('photoOnboarding.doneArchived').replace('{count}', String(commitResult.archived))}</p>
              {commitResult.skipped > 0 && (
                <p className="text-white/40">
                  {t('photoOnboarding.doneSkipped').replace('{count}', String(commitResult.skipped))}
                </p>
              )}
              {commitResult.failed > 0 && (
                <p className="text-amber-300">
                  {t('photoOnboarding.doneFailed').replace('{count}', String(commitResult.failed))}
                </p>
              )}
            </div>
            <div className="flex gap-2 justify-center">
              <button onClick={() => router.push('/montree/dashboard/students')} className="btn btn-primary btn-lg">
                {t('photoOnboarding.viewStudents')}
              </button>
              <button onClick={startOver} className="btn btn-secondary btn-lg">
                {t('photoOnboarding.startOver')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sticky apply bar */}
      {pageState === 'review' && (
        <div className="fixed bottom-0 inset-x-0 bg-[rgba(7,18,12,0.95)] border-t border-[rgba(52,211,153,0.15)] px-4 py-3 backdrop-blur">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <span className="text-xs text-white/55">
              {t('photoOnboarding.summary')
                .replace('{create}', String(counts.create))
                .replace('{update}', String(counts.update))
                .replace('{archive}', String(counts.archive))}
            </span>
            <button onClick={applyChanges} disabled={committing} className="btn btn-primary btn-md">
              {committing ? t('photoOnboarding.applying') : t('photoOnboarding.apply')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── One reviewable group ──────────────────────────────────────────────────

/**
 * `t` is keyed on a literal union of every i18n key, so a child component
 * cannot widen it to `(key: string) => string` and a template-literal key
 * would not type-check. Pass the real signature, and look action labels up
 * through an explicit map.
 */
type Translate = ReturnType<typeof useI18n>['t'];

const ACTION_LABEL_KEYS = {
  create: 'photoOnboarding.actionCreate',
  update: 'photoOnboarding.actionUpdate',
  archive: 'photoOnboarding.actionArchive',
  skip: 'photoOnboarding.actionSkip',
} as const;

function Section({
  icon, title, hint, rows, actions, warn, t, onPatch,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  rows: DraftRow[];
  actions: EntryAction[];
  warn?: boolean;
  t: Translate;
  onPatch: (id: string, patch: Partial<DraftRow>) => void;
}) {
  if (rows.length === 0) return null;

  return (
    <section className="mb-6">
      <h3 className="text-sm font-semibold text-white/85 flex items-center gap-2 mb-1">
        {icon}
        {title}
        <span className="text-white/35 font-normal">({rows.length})</span>
      </h3>
      <p className={`text-xs mb-3 leading-snug ${warn ? 'text-amber-300/80' : 'text-white/40'}`}>{hint}</p>

      <div className="space-y-2">
        {rows.map((row) => {
          // A fuzzy (not exact) match is a judgement call the teacher owns.
          const uncertain =
            row.matchType === 'fuzzy' ||
            (row.matchConfidence !== null && row.matchConfidence < CLOSE_MATCH_CEILING && !!row.matchedChildId);

          return (
            <div
              key={row.id}
              className={`rounded-lg border p-3 ${
                row.action === 'skip'
                  ? 'border-white/10 bg-white/[0.02] opacity-60'
                  : warn
                    ? 'border-amber-500/25 bg-amber-500/[0.05]'
                    : 'border-[rgba(52,211,153,0.15)] bg-white/[0.06]'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 flex-1">
                  {row.kind === 'departed' ? (
                    <p className="font-medium text-white/90 truncate">{row.name}</p>
                  ) : (
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => onPatch(row.id, { name: e.target.value })}
                      aria-label={t('photoOnboarding.fieldName')}
                      className="w-full bg-transparent border-b border-white/10 focus:border-emerald-400 outline-none font-medium text-white/95 pb-1"
                    />
                  )}
                  {row.matchedName && row.kind === 'extracted' && (
                    <p className="text-xs text-white/40 mt-1">
                      {t('photoOnboarding.matchedWith').replace('{name}', row.matchedName)}
                      {uncertain && (
                        <span className="ml-2 text-amber-300">· {t('photoOnboarding.closeMatch')}</span>
                      )}
                    </p>
                  )}
                </div>

                <select
                  value={row.action}
                  onChange={(e) => onPatch(row.id, { action: e.target.value as EntryAction })}
                  aria-label={title}
                  className="shrink-0 text-xs rounded-md bg-white/[0.08] border border-[rgba(52,211,153,0.2)] text-white/90 px-2 py-1"
                >
                  {actions.map((a) => (
                    <option key={a} value={a} className="bg-[#0a1a0f]">
                      {t(ACTION_LABEL_KEYS[a])}
                    </option>
                  ))}
                </select>
              </div>

              {row.kind === 'extracted' && (
                <div className="grid grid-cols-1 gap-2">
                  <label className="block">
                    <span className="text-[11px] text-white/40">{t('photoOnboarding.fieldBirthday')}</span>
                    <input
                      type="date"
                      value={row.dob}
                      onChange={(e) => onPatch(row.id, { dob: e.target.value })}
                      className="w-full mt-0.5 px-2 py-1.5 rounded-md bg-white/[0.06] border border-[rgba(52,211,153,0.15)] text-white/90 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] text-white/40">{t('photoOnboarding.fieldNotes')}</span>
                    <textarea
                      value={row.notes}
                      onChange={(e) => onPatch(row.id, { notes: e.target.value })}
                      rows={row.notes.length > 90 ? 4 : 2}
                      placeholder={t('photoOnboarding.notesPlaceholder')}
                      className="w-full mt-0.5 px-2 py-1.5 rounded-md bg-white/[0.06] border border-[rgba(52,211,153,0.15)] text-white/90 text-sm resize-y"
                    />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
