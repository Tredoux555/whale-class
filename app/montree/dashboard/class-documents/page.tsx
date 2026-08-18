// app/montree/dashboard/class-documents/page.tsx
// ============================================================================
// CLASS DOCUMENTS — the index. CMS phase 6, the bridge.
// ============================================================================
// Six sheets, generated from the children who are ALREADY in Montree. No second
// login, no second database, nothing retyped: the classroom roster the teacher
// has been using all year is the class list, and a committed parent intake fills
// in the allergies, the contacts and the people allowed to collect.
//
// The counts under each card are LIVE and honest in both directions: what is on
// file (`countDocumentData`, the pure engine) and what is missing
// (`summariseIntakeCoverage`, the bridge). On day one of this feature a real
// room has twenty children and zero intakes — the class list and the labels are
// perfect, the health sheets are empty, and the card says so and points at the
// intake flow instead of pretending.
//
// Montree dark-forest register throughout (this is Montree's screen). The PAPER
// is the shared CMS document; see the [doc] page.

'use client';

import { useState, useEffect, useCallback, useRef, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import {
  FileText,
  Wand2,
  Tag,
  ClipboardList,
  Cake,
  Scissors,
  ListChecks,
  LayoutGrid,
} from 'lucide-react';
import { getSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import type { TranslationKey } from '@/lib/montree/i18n/en';
import { extractBrandKit, retuneBrandKit } from '@/lib/montree/brand-kit/extract';
import {
  BRAND_INTENSITIES,
  isBrandKitActive,
  type BrandIntensity,
  type BrandKit,
} from '@/lib/montree/brand-kit/types';
import { resolveBrandKit, type BrandScope } from '@/lib/montree/brand-kit/resolve';
import {
  DOCUMENTS,
  MONTREE_DOCUMENT_LABELS,
  paperMatchesScreen,
} from '@/lib/montree/cms-bridge/catalogue';
import type { IntakeCoverage } from '@/lib/montree/cms-bridge/document-source';
import {
  countDocumentData,
  hasData,
  type DocumentCounts,
  type DocumentKind,
  type DocumentSource,
} from '@/lib/cms/engine/doc-generator';

interface ClassDocumentsResponse {
  success: boolean;
  classroom: { id: string; name: string } | null;
  classrooms: { id: string; name: string }[];
  source: DocumentSource | null;
  coverage: IntakeCoverage | null;
  intakeAvailable: boolean;
  /** Additive (2026-08): the school's identity, with the brand kit the [doc]
   *  renderer themes the paper from. Older API builds omit it entirely, so
   *  everything reading it must survive `undefined`. */
  school?: {
    id: string;
    name: string | null;
    logoUrl: string | null;
    brandKit: BrandKit | null;
  } | null;
  /** Added when classrooms gained their own emblem. `classroomBrandKit` is the
   *  selected room's OWN kit, raw — this card edits it, so it must arrive
   *  disabled-and-all rather than filtered through `isBrandKitActive`.
   *  `brandKit`/`brandScope` are the server's resolution of the two, and are
   *  recomputed locally as well so an older API build still reads right. */
  classroomBrandKit?: BrandKit | null;
  brandKit?: BrandKit | null;
  brandScope?: BrandScope;
}

/** The two things a teacher can be editing. Never `'none'` — that is an ANSWER
 *  (`BrandScope`, what prints), not a place to save a logo. */
type EditScope = 'classroom' | 'school';

/**
 * 🚨 LOCAL COPY, SAME PATTERN AS THE SETTINGS BRAND CARD. Montree's i18n hook
 * is strict across all twelve locales, so these keys ship their English here
 * and go through `t()` anyway (see `tx` in the component): the moment the
 * locale files gain them, every string translates with no code change.
 * The key list is exactly this object — hand it to the i18n pass as-is.
 */
const COPY: Record<string, string> = {
  'classDocs.tools.title': 'Content creation tools',
  'classDocs.tools.subtitle':
    'Labels, sheets and cards built from the same class names and photos.',
  'classDocs.tools.labels': 'Name Labels & Tags',
  'classDocs.tools.signInSheet': 'Sign-In Sheet',
  'classDocs.tools.birthdays': 'Birthday Board & Cards',
  'classDocs.tools.classroomJobs': 'Classroom Jobs Poster',
  'classDocs.tools.helperStrips': 'Helper Name Strips',
  'classDocs.tools.cardGenerator': 'Card Generator',
  'classDocs.tools.all': 'All tools →',
  'classDocs.brand.title': 'Class emblem',
  'classDocs.brand.subtitle':
    'Add your emblem once — every document below prints with it top-left, a soft watermark and matched borders.',
  'classDocs.brand.scopeLabel': 'Applies to',
  'classDocs.brand.scopeClassroom': 'This classroom',
  'classDocs.brand.scopeSchool': 'Whole school',
  'classDocs.brand.printingClassroom':
    'The documents below print with this classroom emblem.',
  'classDocs.brand.printingSchool': 'The documents below print with the school emblem.',
  'classDocs.brand.printingNone': 'No emblem yet — the documents below print plain.',
  'classDocs.brand.drop': 'Drop your class emblem here or tap to choose',
  'classDocs.brand.fileTypes': 'PNG, JPG or WebP · up to 4MB',
  'classDocs.brand.intensity': 'Intensity',
  'classDocs.brand.intensity.whisper': 'Whisper',
  'classDocs.brand.intensity.classic': 'Classic',
  'classDocs.brand.intensity.full': 'Full',
  'classDocs.brand.process': 'Process documents',
  'classDocs.brand.processing': 'Processing documents…',
  'classDocs.brand.done':
    'Done — every document below now prints with your emblem top-left, a soft watermark and matched borders.',
  'classDocs.brand.readFrom': 'Read from the emblem',
  'classDocs.brand.dominant': 'Dominant',
  'classDocs.brand.accent': 'Accent',
  'classDocs.brand.token.ink': 'Ink',
  'classDocs.brand.token.border': 'Border',
  'classDocs.brand.token.wash': 'Wash',
  'classDocs.brand.replace': 'Replace emblem',
  'classDocs.brand.remove': 'Remove',
  'classDocs.brand.removeConfirm': 'Remove this emblem and the theme it created?',
  'classDocs.brand.cancel': 'Cancel',
  'classDocs.brand.readFailed': 'That image could not be read',
  'classDocs.brand.tooBig': 'That image is larger than 4MB',
  'classDocs.brand.wrongType': 'Use a PNG, JPG or WebP image',
  'classDocs.brand.saveFailed': 'Could not save the emblem',
};

const MAX_LOGO_BYTES = 4 * 1024 * 1024;
/** Mirrors the server's allow-list minus GIF — and SVG is deliberately absent
 *  (see the security note in app/api/montree/brand-kit/route.ts). */
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/** The tools that work off the class's names and photos. */
const CREATION_TOOLS: { key: string; href: string; Icon: typeof Tag }[] = [
  { key: 'classDocs.tools.labels', href: '/montree/dashboard/labels', Icon: Tag },
  { key: 'classDocs.tools.signInSheet', href: '/montree/library/tools/sign-in-sheet', Icon: ClipboardList },
  { key: 'classDocs.tools.birthdays', href: '/montree/library/tools/birthdays', Icon: Cake },
  // The chart and the strips that pop into it — kept next to each other on
  // purpose, because a teacher who prints one wants the other.
  { key: 'classDocs.tools.classroomJobs', href: '/montree/library/tools/classroom-jobs', Icon: ListChecks },
  { key: 'classDocs.tools.helperStrips', href: '/montree/library/tools/helper-strips', Icon: Scissors },
  { key: 'classDocs.tools.cardGenerator', href: '/montree/library/tools/card-generator', Icon: LayoutGrid },
  { key: 'classDocs.tools.all', href: '/montree/library/tools', Icon: Wand2 },
];

/** One count line per card, in Montree's own words. Mirrors the CMS catalogue's
 *  `chipsFor`, but keyed to montree i18n — the screen is Montree's. */
function chipsFor(
  kind: DocumentKind,
  counts: DocumentCounts
): { key: TranslationKey; count: number }[] {
  switch (kind) {
    case 'class_list':
      return [
        { key: 'classDocs.count.children', count: counts.children },
        { key: 'classDocs.count.allergies', count: counts.allergies },
        { key: 'classDocs.count.dietary', count: counts.dietaryRequirements },
      ];
    case 'pickup_sheet':
      return [
        { key: 'classDocs.count.collectors', count: counts.collectors },
        { key: 'classDocs.count.missingCollector', count: counts.childrenWithoutCollector },
      ];
    case 'allergy_poster':
      return [
        { key: 'classDocs.count.allergies', count: counts.posterAllergies },
        { key: 'classDocs.count.epipen', count: counts.epipens },
      ];
    case 'dietary_sheet':
      return [{ key: 'classDocs.count.dietary', count: counts.dietaryRequirements }];
    case 'emergency_contacts':
      return [{ key: 'classDocs.count.contacts', count: counts.contacts }];
    case 'name_labels':
      return [{ key: 'classDocs.count.children', count: counts.children }];
  }
}

export default function ClassDocumentsPage() {
  const router = useRouter();
  const { t, locale } = useI18n();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ClassDocumentsResponse | null>(null);

  useEffect(() => {
    if (!getSession()) router.push('/montree/login');
  }, [router]);

  const load = useCallback(async () => {
    try {
      const res = await montreeApi('/api/montree/class-documents');
      if (!res.ok) throw new Error(`class-documents: ${res.status}`);
      const body = (await res.json()) as ClassDocumentsResponse;
      setData(body);
    } catch (err) {
      console.error('[class-documents] load failed:', err);
      toast.error(t('classDocs.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  // ── class emblem / brand kit state ──────────────────────────────────────
  const fileRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [intensity, setIntensity] = useState<BrandIntensity>('classic');
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [justProcessed, setJustProcessed] = useState(false);
  /** Which record this card is EDITING. A room is the common case — a teacher
   *  standing in one — so it is the default whenever there is a room to edit.
   *  A school with no classroom at all can still set the building's emblem. */
  const [scope, setScope] = useState<EditScope>('classroom');

  /** The room every save is aimed at: the one the API resolved for this read,
   *  never a value this page invents. Empty → school scope is the only option. */
  const roomId = data?.classroom?.id ?? '';
  const roomName = data?.classroom?.name ?? '';

  /** School scope is FORCED when there is no room, so the card can never post a
   *  classroom save with an empty id (which would silently rebrand the school). */
  const effectiveScope: EditScope = roomId ? scope : 'school';

  /** One query string, one source of truth for every verb below. */
  const scopeQuery =
    effectiveScope === 'classroom' ? `?classroomId=${encodeURIComponent(roomId)}` : '';

  /** `t()` with an English fallback — the settings brand card's pattern.
   *  Montree's translator returns the raw key when it has no entry, so
   *  `value === key` is exactly "not translated yet". */
  const tx = useCallback(
    (key: string, fallback?: string): string => {
      const value = t(key as TranslationKey);
      if (!value || value === key) return fallback ?? COPY[key] ?? key;
      return value;
    },
    [t]
  );

  /** The kit this card is EDITING — raw, disabled ones included, because the
   *  editor has to show what is stored rather than what happens to print. */
  const scopedKit =
    effectiveScope === 'classroom'
      ? data?.classroomBrandKit ?? null
      : data?.school?.brandKit ?? null;

  // Keep the intensity pills honest against the saved kit (a save elsewhere,
  // a refetch, a scope switch). A pending pick owns the control until processed
  // or cancelled.
  useEffect(() => {
    if (scopedKit && !pendingFile) setIntensity(scopedKit.intensity);
  }, [scopedKit, pendingFile]);

  // Revoke the preview object URL on unmount — never leak a blob per pick.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const clearPending = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPendingFile(null);
    setPendingPreview(null);
  }, []);

  const onChooseFile = useCallback(
    (file: File | null) => {
      if (!file) return;
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(tx('classDocs.brand.wrongType'));
        return;
      }
      if (file.size > MAX_LOGO_BYTES) {
        toast.error(tx('classDocs.brand.tooBig'));
        return;
      }
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      setPendingFile(file);
      setPendingPreview(url);
      setJustProcessed(false);
      // Clear the input so picking the SAME file twice still fires a change.
      if (fileRef.current) fileRef.current.value = '';
    },
    [tx]
  );

  const onDragOverZone = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeaveZone = useCallback(() => setDragOver(false), []);

  const onDropZone = useCallback(
    (e: DragEvent<HTMLElement>) => {
      e.preventDefault();
      setDragOver(false);
      onChooseFile(e.dataTransfer.files?.[0] ?? null);
    },
    [onChooseFile]
  );

  /** Extract in the browser, then POST multipart (logo + kit) exactly the way
   *  the settings brand card does — the server owns the stored logo URL. */
  const onProcess = useCallback(async () => {
    if (!pendingFile || processing) return;
    setProcessing(true);
    try {
      let kit: BrandKit;
      try {
        const extracted = await extractBrandKit(pendingFile, { intensity });
        kit = extracted.kit;
      } catch (err) {
        console.error('[class-documents] emblem read failed:', err);
        toast.error(tx('classDocs.brand.readFailed'));
        return;
      }

      const form = new FormData();
      form.append('logo', pendingFile);
      form.append('kit', JSON.stringify(kit));
      const res = await montreeApi(`/api/montree/brand-kit${scopeQuery}`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        // The route names its own failures; surface the real one.
        const detail = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(detail?.error || `brand-kit: ${res.status}`);
      }
      clearPending();
      setJustProcessed(true);
      await load();
    } catch (err) {
      console.error('[class-documents] emblem save failed:', err);
      toast.error(err instanceof Error ? err.message : tx('classDocs.brand.saveFailed'));
    } finally {
      setProcessing(false);
    }
  }, [pendingFile, processing, intensity, tx, clearPending, load, scopeQuery]);

  /** Intensity on a saved kit re-solves the wash from the two source colours
   *  already stored — kit-only JSON POST, no re-upload, no canvas. */
  const onIntensity = useCallback(
    async (next: BrandIntensity) => {
      setIntensity(next);
      if (pendingFile) return; // the pending pick extracts with this at process time
      // The kit being retuned is the one for the SELECTED scope — pulling the
      // school's here would re-save the building's theme from a room's pills.
      const current = scopedKit;
      if (!isBrandKitActive(current) || current.intensity === next || processing) return;
      setProcessing(true);
      try {
        const retuned = retuneBrandKit(current, next);
        const res = await montreeApi(`/api/montree/brand-kit${scopeQuery}`, {
          method: 'POST',
          body: JSON.stringify({ kit: retuned }),
        });
        if (!res.ok) {
          const detail = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(detail?.error || `brand-kit: ${res.status}`);
        }
        await load();
      } catch (err) {
        console.error('[class-documents] intensity save failed:', err);
        toast.error(err instanceof Error ? err.message : tx('classDocs.brand.saveFailed'));
      } finally {
        setProcessing(false);
      }
    },
    [pendingFile, scopedKit, scopeQuery, processing, tx, load]
  );

  const onRemove = useCallback(async () => {
    if (processing) return;
    if (!window.confirm(tx('classDocs.brand.removeConfirm'))) return;
    setProcessing(true);
    try {
      // `purge` FORGETS rather than disables (see the route's DELETE note), and
      // the scope decides whose emblem is forgotten — removing a room's never
      // touches the school's file, kit or `logo_url` column.
      const url =
        effectiveScope === 'classroom'
          ? `/api/montree/brand-kit?purge=1&classroomId=${encodeURIComponent(roomId)}`
          : '/api/montree/brand-kit?purge=1';
      const res = await montreeApi(url, { method: 'DELETE' });
      if (!res.ok) throw new Error(`brand-kit: ${res.status}`);
      setJustProcessed(false);
      clearPending();
      await load();
    } catch (err) {
      console.error('[class-documents] emblem remove failed:', err);
      toast.error(tx('classDocs.brand.saveFailed'));
    } finally {
      setProcessing(false);
    }
  }, [processing, tx, clearPending, load, effectiveScope, roomId]);

  /** Switching scope never carries a save across — it only re-points the card.
   *  A pick that is still pending stays pending on purpose: "wrong scope" is
   *  the most likely reason to touch these pills mid-upload. */
  const onScope = useCallback(
    (next: EditScope) => {
      if (processing) return;
      setScope(next);
      setJustProcessed(false);
    },
    [processing]
  );

  const glow = (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none"
      style={{
        background: 'radial-gradient(circle at 50% 0%, rgba(39,129,90,0.32), transparent 60%)',
      }}
    />
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1a0f] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const source = data?.source ?? null;
  const coverage = data?.coverage ?? null;
  const counts = source ? countDocumentData(source) : null;
  // Survives `data.school` / `data.classroomBrandKit` being null or undefined
  // (older API): everything resolves to "no theme", which renders the upload
  // flow and the plain line.
  const activeKit = scopedKit;
  const brandActive = isBrandKitActive(activeKit);
  const emblemSrc = pendingPreview || (brandActive && activeKit ? activeKit.logoUrl : null);

  // 🚨 WHAT PRINTS ≠ WHAT IS BEING EDITED. The line under the title reports the
  // RESOLVED theme for this room, so a teacher looking at the empty school tab
  // is still told, truthfully, that their room's own emblem is on the sheets.
  // Resolved locally with the shared pure rule rather than read off the
  // response, so an older API build (no `brandScope`) still reads correctly.
  const printing: BrandScope = resolveBrandKit(
    roomId ? data?.classroomBrandKit ?? null : null,
    data?.school?.brandKit ?? null
  ).scope;
  const printingKey =
    printing === 'classroom'
      ? 'classDocs.brand.printingClassroom'
      : printing === 'school'
        ? 'classDocs.brand.printingSchool'
        : 'classDocs.brand.printingNone';

  return (
    <div className="min-h-screen bg-[#0a1a0f] relative">
      {glow}
      <Toaster position="top-center" />

      {/* Header */}
      <div className="relative bg-[rgba(7,18,12,0.9)] border-b border-[rgba(52,211,153,0.15)] px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push('/montree/dashboard')}
          className="btn btn-ghost btn-md"
          aria-label={t('common.back')}
        >
          ←
        </button>
        <h1 className="text-lg font-semibold text-white/95 flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-400" />
          {t('classDocs.title')}
        </h1>
      </div>

      <div className="relative max-w-3xl mx-auto p-4 pb-28">
        {/* Content creation tools — the generators that feed on the same class
            names and photos. Links only; each tool owns its own screen. */}
        <section className="rounded-2xl border border-[rgba(52,211,153,0.15)] bg-white/[0.06] p-4 mb-5">
          <h2 className="text-[13px] font-semibold text-white/80 flex items-center gap-2 mb-3">
            <Wand2 className="w-4 h-4 text-emerald-400" />
            {tx('classDocs.tools.title')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CREATION_TOOLS.map(({ key, href, Icon }) => (
              <Link
                key={key}
                href={href}
                className="flex items-center gap-2 rounded-xl border border-[rgba(52,211,153,0.15)] bg-white/[0.04] hover:bg-white/[0.1] transition px-3 py-2.5"
              >
                <Icon className="w-4 h-4 text-emerald-300/80 shrink-0" />
                <span className="text-[12.5px] text-white/85 leading-snug">{tx(key)}</span>
              </Link>
            ))}
          </div>
        </section>

        <p className="text-sm text-white/60 mb-1">{t('classDocs.subtitle')}</p>
        {data?.classroom?.name ? (
          <p className="text-[13px] text-emerald-300/80 mb-4">{data.classroom.name}</p>
        ) : (
          <div className="mt-4 rounded-2xl border border-[rgba(52,211,153,0.2)] bg-white/[0.06] p-6 text-center">
            <h2 className="text-lg font-semibold text-white/95 mb-2">
              {t('classDocs.noClassroomTitle')}
            </h2>
            <p className="text-sm text-white/60">{t('classDocs.noClassroomBody')}</p>
          </div>
        )}

        {/* Class emblem — one upload themes every official document below.
            Extraction runs HERE in the browser; the POST mirrors the settings
            brand card (multipart logo + kit; kit-only JSON for retunes). The
            whole section is a drop target. */}
        <section
          onDragOver={onDragOverZone}
          onDragLeave={onDragLeaveZone}
          onDrop={onDropZone}
          className={
            dragOver
              ? 'rounded-2xl border border-[rgba(52,211,153,0.5)] bg-white/[0.09] p-4 mb-5 transition'
              : 'rounded-2xl border border-[rgba(52,211,153,0.15)] bg-white/[0.06] p-4 mb-5 transition'
          }
        >
          <h2 className="text-[15px] font-semibold text-white/95">{tx('classDocs.brand.title')}</h2>
          <p className="text-[12.5px] text-white/55 mt-1 leading-relaxed">
            {tx('classDocs.brand.subtitle')}
          </p>
          {/* What ACTUALLY prints on the cards below — the resolved answer, not
              whichever tab happens to be open. */}
          <p
            className={
              printing === 'none'
                ? 'text-[11.5px] text-white/40 mt-1.5'
                : 'text-[11.5px] text-emerald-300/90 mt-1.5'
            }
          >
            {tx(printingKey)}
          </p>

          {/* Scope — only worth showing when there IS a room to choose. */}
          {roomId && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              <span className="text-[10.5px] uppercase tracking-wide text-white/45 mr-1">
                {tx('classDocs.brand.scopeLabel')}
              </span>
              <button
                type="button"
                aria-pressed={effectiveScope === 'classroom'}
                title={roomName || undefined}
                onClick={() => onScope('classroom')}
                disabled={processing}
                className={
                  effectiveScope === 'classroom'
                    ? 'btn btn-primary btn-sm btn-pill'
                    : 'btn btn-secondary btn-sm btn-pill'
                }
              >
                {tx('classDocs.brand.scopeClassroom')}
              </button>
              <button
                type="button"
                aria-pressed={effectiveScope === 'school'}
                onClick={() => onScope('school')}
                disabled={processing}
                className={
                  effectiveScope === 'school'
                    ? 'btn btn-primary btn-sm btn-pill'
                    : 'btn btn-secondary btn-sm btn-pill'
                }
              >
                {tx('classDocs.brand.scopeSchool')}
              </button>
            </div>
          )}

          {justProcessed && brandActive && (
            <p className="text-[12px] text-emerald-200/90 bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.25)] rounded-lg px-2.5 py-2 mt-3 leading-relaxed">
              {tx('classDocs.brand.done')}
            </p>
          )}

          {pendingFile ? (
            /* A pick is waiting — preview it, choose loudness, process. */
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-[86px] h-16 rounded-xl flex items-center justify-center shrink-0 border border-white/10"
                  style={{ background: '#ffffff' }}
                >
                  {pendingPreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pendingPreview}
                      alt=""
                      style={{ maxWidth: '74px', maxHeight: '52px', objectFit: 'contain' }}
                    />
                  )}
                </div>
                <p className="text-[11.5px] text-white/45 leading-snug">
                  {tx('classDocs.brand.fileTypes')}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {BRAND_INTENSITIES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={intensity === option}
                    onClick={() => void onIntensity(option)}
                    disabled={processing}
                    className={
                      intensity === option
                        ? 'btn btn-primary btn-sm btn-pill'
                        : 'btn btn-secondary btn-sm btn-pill'
                    }
                  >
                    {tx(`classDocs.brand.intensity.${option}`)}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void onProcess()}
                  disabled={processing}
                  className="btn btn-primary btn-md"
                >
                  {processing ? tx('classDocs.brand.processing') : tx('classDocs.brand.process')}
                </button>
                <button
                  type="button"
                  onClick={clearPending}
                  disabled={processing}
                  className="btn btn-ghost btn-md"
                >
                  {tx('classDocs.brand.cancel')}
                </button>
              </div>
            </div>
          ) : brandActive && activeKit ? (
            /* The saved theme — emblem, swatches, loudness, replace/remove. */
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-[86px] h-16 rounded-xl flex items-center justify-center shrink-0 border border-white/10"
                  style={{ background: '#ffffff' }}
                >
                  {emblemSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={emblemSrc}
                      alt=""
                      style={{ maxWidth: '74px', maxHeight: '52px', objectFit: 'contain' }}
                    />
                  ) : (
                    <span className="text-black/25 text-xl">🏫</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                  <EmblemSwatch label={tx('classDocs.brand.dominant')} hex={activeKit.dominant} />
                  <EmblemSwatch label={tx('classDocs.brand.accent')} hex={activeKit.accent} />
                  <EmblemSwatch label={tx('classDocs.brand.token.ink')} hex={activeKit.tokens.ink} />
                  <EmblemSwatch
                    label={tx('classDocs.brand.token.border')}
                    hex={activeKit.tokens.border}
                  />
                  <EmblemSwatch
                    label={tx('classDocs.brand.token.wash')}
                    hex={activeKit.tokens.wash}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10.5px] uppercase tracking-wide text-white/45 mr-1">
                  {tx('classDocs.brand.intensity')}
                </span>
                {BRAND_INTENSITIES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={intensity === option}
                    onClick={() => void onIntensity(option)}
                    disabled={processing}
                    className={
                      intensity === option
                        ? 'btn btn-primary btn-sm btn-pill'
                        : 'btn btn-secondary btn-sm btn-pill'
                    }
                  >
                    {tx(`classDocs.brand.intensity.${option}`)}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={processing}
                  className="btn btn-secondary btn-sm"
                >
                  {tx('classDocs.brand.replace')}
                </button>
                <button
                  type="button"
                  onClick={() => void onRemove()}
                  disabled={processing}
                  className="btn btn-danger btn-soft btn-sm"
                >
                  {tx('classDocs.brand.remove')}
                </button>
              </div>
            </div>
          ) : (
            /* Nothing saved yet — the drop zone, the loudness, the button. */
            <div className="mt-3 space-y-3">
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileRef.current?.click();
                  }
                }}
                className="rounded-xl border border-dashed border-[rgba(52,211,153,0.35)] bg-white/[0.03] hover:bg-white/[0.07] transition px-4 py-6 text-center cursor-pointer"
              >
                <p className="text-[13px] text-white/75">{tx('classDocs.brand.drop')}</p>
                <p className="text-[11px] text-white/35 mt-1">{tx('classDocs.brand.fileTypes')}</p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {BRAND_INTENSITIES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={intensity === option}
                    onClick={() => void onIntensity(option)}
                    className={
                      intensity === option
                        ? 'btn btn-primary btn-sm btn-pill'
                        : 'btn btn-secondary btn-sm btn-pill'
                    }
                  >
                    {tx(`classDocs.brand.intensity.${option}`)}
                  </button>
                ))}
              </div>

              <button type="button" disabled className="btn btn-primary btn-md">
                {tx('classDocs.brand.process')}
              </button>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            className="hidden"
            onChange={(e) => onChooseFile(e.target.files?.[0] ?? null)}
          />
        </section>

        {/* Roster empty — everything downstream is empty too, say it once, loudly. */}
        {source && source.children.length === 0 && (
          <div className="rounded-2xl border border-[rgba(52,211,153,0.2)] bg-white/[0.06] p-6 text-center mb-5">
            <h2 className="text-lg font-semibold text-white/95 mb-2">
              {t('classDocs.emptyRosterTitle')}
            </h2>
            <p className="text-sm text-white/60 mb-4">{t('classDocs.emptyRosterBody')}</p>
            <Link href="/montree/dashboard/students" className="btn btn-primary btn-sm">
              {t('classDocs.openStudents')}
            </Link>
          </div>
        )}

        {/* Intake coverage — the honest half of the empty state. */}
        {coverage && coverage.children > 0 && coverage.withoutCommittedIntake > 0 && (
          <div className="rounded-2xl border border-[rgba(234,179,8,0.25)] bg-[rgba(234,179,8,0.06)] p-4 mb-5">
            <p className="text-[13px] text-amber-200/90 font-medium mb-1">
              {t('classDocs.count.noIntake', { n: coverage.withoutCommittedIntake })}
            </p>
            <p className="text-[12.5px] text-white/55 mb-3">{t('classDocs.needIntakeBody')}</p>
            <Link href="/montree/dashboard/child-onboarding" className="btn btn-secondary btn-sm">
              {t('classDocs.openChildOnboarding')}
            </Link>
          </div>
        )}

        {/* Cards */}
        {source && counts && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {DOCUMENTS.map((entry) => {
              const labels = MONTREE_DOCUMENT_LABELS[entry.kind];
              const ready = hasData(entry.kind, counts);
              return (
                <Link
                  key={entry.kind}
                  href={`/montree/dashboard/class-documents/${entry.slug}`}
                  className="block rounded-2xl border border-[rgba(52,211,153,0.15)] bg-white/[0.06] p-4 hover:bg-white/[0.1] transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-[15px] font-semibold text-white/95">
                      {t(labels.titleKey)}
                    </h2>
                    <span
                      className={
                        ready
                          ? 'text-[10.5px] uppercase tracking-wide text-emerald-300/90 shrink-0 mt-0.5'
                          : 'text-[10.5px] uppercase tracking-wide text-white/35 shrink-0 mt-0.5'
                      }
                    >
                      {ready ? t('classDocs.ready') : t('classDocs.emptyBadge')}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-white/55 mt-1.5 leading-relaxed">
                    {t(labels.descKey)}
                  </p>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
                    {chipsFor(entry.kind, counts).map((chip) => (
                      <span key={chip.key} className="text-[11.5px] text-white/50">
                        {t(chip.key, { n: chip.count })}
                      </span>
                    ))}
                  </div>

                  {!ready && (
                    <p className="text-[11.5px] text-amber-200/70 mt-2.5">{t(labels.needKey)}</p>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* The paper does not speak every Montree language yet — say so, once. */}
        {source && !paperMatchesScreen(locale) && (
          <p className="text-[11.5px] text-white/35 mt-6 leading-relaxed">
            {t('classDocs.paperLocaleNote')}
          </p>
        )}

        {/* Intake table missing (migration pending) — a different, quieter truth. */}
        {data && data.intakeAvailable === false && (
          <p className="text-[11.5px] text-white/35 mt-3 leading-relaxed">
            {t('classDocs.intakeUnavailable')}
          </p>
        )}
      </div>
    </div>
  );
}

/** A tiny colour chip. Colour here is DATA — the school's own palette being
 *  reported back — the documented exception to the inline-style rule. */
function EmblemSwatch({ label, hex }: { label: string; hex: string }) {
  const transparent = hex === 'transparent';
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="w-4 h-4 rounded border border-white/15 shrink-0"
        style={{
          background: transparent
            ? 'repeating-linear-gradient(45deg,#1c2a20,#1c2a20 3px,#243328 3px,#243328 6px)'
            : hex,
        }}
      />
      <span className="text-[10px] text-white/50">{label}</span>
    </span>
  );
}
