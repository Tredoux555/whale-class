// /montree/library/tools/classroom-jobs/page.tsx
// The Classroom Jobs Poster — one printable chart for the wall, with a child
// on every job. Sibling of the Helper Name Strips tool, and deliberately its
// other half: this page prints the CHART, that one prints the STRIPS that pop
// into the chart's slots.
//
// 🚨 THE TWO SLOT SIZES ARE HELPER-STRIPS' OWN SIZES, TO THE MILLIMETRE. They
// are mirrored in STRIP_SIZES below from that tool's SIZE_CONFIG (poster
// 180×34mm, small 120×22mm). If either changes there, it changes here — a slot
// that is "about right" is a slot the strip does not sit in.
//
// 🚨 THE BRAND KIT IS READ AS TOKENS, NOT THROUGH `brandKitCss()`. That
// stylesheet themes the SHARED class-document markup: every selector in it is
// `.mt-branded .cms-doc-*`, and its token block is scoped to `.cms-doc-sheet`.
// This poster is not that sheet and has none of those classes, so the theme
// arrives the way the sibling tool takes it — `kit.tokens` + `kit.logoUrl`,
// with `PLAIN_TOKENS` as the unthemed fallback. The colours are then set as
// CSS custom properties through React's `style` prop and never interpolated
// into the injected stylesheet, so no school-supplied value ever reaches raw
// CSS text.
//
// 🚨 THE EMBLEM IS AN <img>, NEVER A CSS BACKGROUND — `background-image` is
// the first thing a browser drops when "Background graphics" is unticked in
// the print dialog, and a crest that vanishes on half the world's printers is
// worse than no crest. Same call, same reason, as DocumentPaper.
'use client';

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { useI18n, type TranslationKey } from '@/lib/montree/i18n';
import { getSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import { isBrandKitActive, PLAIN_TOKENS, type BrandKit } from '@/lib/montree/brand-kit/types';
import {
  computeCropGeometry,
  defaultCoverOffset,
  MIN_ZOOM,
  MAX_ZOOM,
} from '@/lib/montree/classroom-jobs/crop-geometry';
import {
  DEFAULT_JOBS,
  DEFAULT_POSTER_TITLE,
  JOBS_POSTER_VERSION,
  MAX_JOBS,
  MAX_ICON_LEN,
  MAX_NAME_LEN,
  MAX_TITLE_LEN,
  defaultJobsPoster,
  newCustomJobId,
  parseJobsPoster,
  type ClassroomJob,
  type JobsPoster,
} from '@/lib/montree/classroom-jobs/types';
import { Quicksand } from 'next/font/google';

const quicksand = Quicksand({ subsets: ['latin'], weight: ['500', '600', '700'] });

type Student = { id: string; name: string };
type PosterMode = 'names' | 'slots';
type SlotSize = 'poster' | 'small';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/**
 * 🚨 THE COPY, AND WHY IT LIVES HERE. Montree's i18n hook is strict across all
 * twelve locales — a new key must exist in every locale file before it may be
 * committed. So this tool ships its own English through `tx()` (below), the
 * same way the Helper Name Strips page and the Class Documents screen already
 * do: the moment these keys land in the twelve locale files, every string here
 * becomes translated with no further code change, and until then a teacher on
 * another locale reads clean English rather than a raw `classroomJobs.title`
 * token. The key list is exactly this object — hand it to the i18n pass as-is.
 */
const COPY: Record<string, string> = {
  'classroomJobs.title': 'Classroom Jobs Poster',
  'classroomJobs.subtitle':
    'One chart for the wall — a job, and the child who holds it this week.',
  'classroomJobs.posterTitle': 'Our Classroom Jobs',
  'classroomJobs.titleLabel': 'Poster title',
  'classroomJobs.titleHint': 'Prints on the masthead. Leave it blank to use the starting title.',
  'classroomJobs.uploadPicture': 'Upload picture',
  'classroomJobs.adjustPicture': 'Adjust picture',
  'classroomJobs.removePicture': 'Remove picture',
  'classroomJobs.uploading': 'Uploading…',
  'classroomJobs.iconUploadFailed': 'Could not upload the picture — try again',
  'classroomJobs.cropTitle': 'Adjust your picture',
  'classroomJobs.cropZoom': 'Zoom',
  'classroomJobs.cropCancel': 'Cancel',
  'classroomJobs.cropUse': 'Use picture',
  'classroomJobs.cropLoadError': 'Could not load this picture for cropping — try uploading it again.',
  'classroomJobs.modeLabel': 'Poster style',
  'classroomJobs.modeNames': 'Names printed on',
  'classroomJobs.modeNamesHint': 'A4 portrait · a card per job, each with a child’s name',
  'classroomJobs.modeSlots': 'For name strips',
  'classroomJobs.modeSlotsHint':
    'Empty slots sized for the Helper Name Strips — print once, swap the strips each week',
  'classroomJobs.slotSizeLabel': 'Strip size',
  'classroomJobs.slotSizePoster': 'Poster strips · 180×34mm · A4 landscape',
  'classroomJobs.slotSizeSmall': 'Small strips · 120×22mm · A4 portrait',
  'classroomJobs.stripsLink': 'Print the name strips →',
  'classroomJobs.jobsLabel': 'Jobs',
  'classroomJobs.addJob': 'Add a job',
  'classroomJobs.shuffle': 'Shuffle',
  'classroomJobs.clearAll': 'Clear all',
  'classroomJobs.save': 'Save chart',
  'classroomJobs.saving': 'Saving…',
  'classroomJobs.saved': 'Saved',
  'classroomJobs.saveFailed': 'Could not save — try again',
  'classroomJobs.unsaved': 'Unsaved changes',
  'classroomJobs.unassigned': 'Nobody yet',
  'classroomJobs.doubleBooked': 'holds more than one job',
  'classroomJobs.noChildren': 'No children in your class yet.',
  'classroomJobs.noJobs': 'No jobs yet — add one to start the chart.',
  'classroomJobs.noActiveJobs': 'Every job is switched off — switch one on to see the poster.',
  'classroomJobs.startingSet': 'This is the starting set. Change it, then save to make it yours.',
  'classroomJobs.notAvailable': 'This class cannot save a chart yet — you can still print one.',
  'classroomJobs.sheetOne': 'Prints on 1 A4 sheet',
  'classroomJobs.sheetMany': 'Prints on about {n} A4 sheets',
  'classroomJobs.newJob': 'New job',
  'classroomJobs.remove': 'Remove',
  'classroomJobs.confirmRemove': 'Remove this job?',
  'classroomJobs.confirmYes': 'Remove',
  'classroomJobs.confirmNo': 'Keep',
  'classroomJobs.moveUp': 'Move up',
  'classroomJobs.moveDown': 'Move down',
  'classroomJobs.restoreDefaults': 'Restore default jobs',
  'classroomJobs.restoreHint': 'Adds back the starting jobs you removed. Your own jobs stay.',
  'classroomJobs.needOneJob': 'A chart needs at least one job.',
  'classroomJobs.jobsFull': 'That is as many jobs as one chart holds.',
  'classroomJobs.blankName': 'Every job needs a name before the chart can be saved.',
};

// ── paper ───────────────────────────────────────────────────────────────────
// A4 is 210×297mm. The content box below is the page minus its margins, and
// every width on this sheet is measured against it — a poster that is 2mm too
// wide does not warn, it silently drops a column onto a second sheet.

const PORTRAIT_MARGIN_MM = 12;
const LANDSCAPE_MARGIN_MM = 10;
const PORTRAIT_W_MM = 210 - PORTRAIT_MARGIN_MM * 2; // 186
const PORTRAIT_H_MM = 297 - PORTRAIT_MARGIN_MM * 2; // 273
const LANDSCAPE_W_MM = 297 - LANDSCAPE_MARGIN_MM * 2; // 277
const LANDSCAPE_H_MM = 210 - LANDSCAPE_MARGIN_MM * 2; // 190

/** Roughly what the masthead costs on the first sheet. Used only by the sheet
 *  estimate, which is a promise to the teacher, not a layout constraint. */
const HEAD_H_MM = 32;

// ── the slots ───────────────────────────────────────────────────────────────
/**
 * 🚨 MIRRORS `SIZE_CONFIG` IN app/montree/library/tools/helper-strips/page.tsx.
 * `width`/`height` are that tool's strip footprint EXACTLY, so a strip printed
 * at 100% drops into a slot printed at 100%.
 *
 * The orientation is not a preference, it is arithmetic. A 180mm slot plus any
 * legible job label does not fit inside A4 portrait's 186mm content box, so the
 * poster-size chart is landscape; the 120mm strip leaves room for a label in
 * portrait and stacks nearly twice as many rows per sheet, so the small chart
 * is portrait.
 */
const STRIP_SIZES: Record<
  SlotSize,
  { width: number; height: number; label: number; landscape: boolean }
> = {
  poster: { width: 180, height: 34, label: 88, landscape: true },
  small: { width: 120, height: 22, label: 56, landscape: false },
};

/** Names mode: two columns inside the portrait content box. */
const CARD_GAP_MM = 5;
const CARD_W_MM = (PORTRAIT_W_MM - CARD_GAP_MM) / 2; // 90.5
const CARD_H_MM = 34;
const SLOT_GAP_MM = 4;

// ── the icon cropper ─────────────────────────────────────────────────────
// CSS pixels for the interactive frame; the tiny live preview mirrors it at
// icon scale (44px — the same footprint the job row's own thumbnail uses).
const CROP_FRAME_PX = 240;
const CROP_PREVIEW_PX = 44;
/** What actually gets uploaded: a 512×512 PNG of the framed region — small
 *  and clean regardless of what the teacher originally picked (a multi-MB
 *  JPG comes out the other side as a few hundred KB PNG at most), comfortably
 *  inside the icon route's existing 4MB cap. */
const CROP_EXPORT_PX = 512;

/** 6-digit hex or `transparent` only — the same narrow gate brand-kit/css.ts
 *  applies at ITS point of injection. These values arrive over JSON and end up
 *  as CSS custom property values, so they are re-checked here rather than
 *  trusted because a parser upstream once looked at them. */
function safeColor(value: string | undefined, fallback: string): string {
  return value && (value === 'transparent' || /^#[0-9a-fA-F]{6}$/.test(value))
    ? value
    : fallback;
}

/** First name only — a jobs chart is read across a room, and a card that has
 *  to fit "Alexandrina Van Der Merwe" fits nothing else. */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/**
 * The sheet's geometry and its @page rule, as one string.
 *
 * 🚨 IT CARRIES NO COLOURS. Every colour on this poster is a CSS custom
 * property set through React's `style` prop on the poster root (see
 * `JobsPosterSheet`), so a school's stored token can never be interpolated
 * into raw CSS text. What is injected here is geometry, and geometry is ours.
 *
 * 🚨 `@page` CANNOT BE SCOPED TO A SELECTOR, which is why this lives in a
 * <style> tag on the page and never in globals.css — a global A4 rule would
 * hijack every other print in the repo. Same rule, same reason, as
 * components/cms/documents/print-css.ts.
 */
function posterCss(mode: PosterMode, slotSize: SlotSize): string {
  const landscape = mode === 'slots' && STRIP_SIZES[slotSize].landscape;
  const margin = landscape ? LANDSCAPE_MARGIN_MM : PORTRAIT_MARGIN_MM;
  const width = landscape ? LANDSCAPE_W_MM : PORTRAIT_W_MM;

  return `
.jp-poster {
  width: ${width}mm;
  max-width: 100%;
  margin: 0 auto;
  position: relative;
  box-sizing: border-box;
  background: #fff;
  color: var(--jp-ink);
}
.jp-watermark {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 62%;
  transform: translate(-50%, -50%);
  opacity: var(--jp-watermark);
  z-index: 0;
  pointer-events: none;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.jp-poster > .jp-head,
.jp-poster > .jp-body { position: relative; z-index: 1; }

.jp-head {
  display: flex;
  align-items: center;
  gap: 5mm;
  padding-bottom: 3mm;
  margin-bottom: 6mm;
  border-bottom: 0.8mm solid var(--jp-accent);
}
.jp-emblem {
  height: 16mm;
  width: auto;
  max-width: 46mm;
  object-fit: contain;
  display: block;
  flex: 0 0 auto;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.jp-headtext { min-width: 0; }
.jp-title {
  margin: 0;
  font-family: var(--jp-display);
  font-size: 26pt;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.01em;
  color: var(--jp-ink);
}
.jp-room {
  margin: 1.6mm 0 0;
  font-size: 9.5pt;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--jp-accent);
}

/* ── names mode ─────────────────────────────────────────────────────────── */
.jp-grid {
  display: grid;
  grid-template-columns: repeat(2, ${CARD_W_MM}mm);
  gap: ${CARD_GAP_MM}mm;
}
.jp-card {
  height: ${CARD_H_MM}mm;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 3.5mm;
  padding: 0 4mm;
  border: 0.5mm solid var(--jp-border);
  border-radius: 3mm;
  background: var(--jp-wash);
  break-inside: avoid;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.jp-icon { flex: 0 0 auto; line-height: 1; text-align: center; }
.jp-card .jp-icon { width: 12mm; font-size: 20pt; }
/* A teacher-uploaded picture in place of the emoji. Always an <img>, never a
   CSS background — see the header note on why. Sized to the same footprint
   the emoji occupies at each mode's scale, with print-color-adjust so the
   picture survives "background graphics off" the same way the emblem does. */
.jp-icon-img {
  display: block;
  object-fit: cover;
  border-radius: 2mm;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.jp-card .jp-icon.jp-icon-img { height: 12mm; }
.jp-cardtext { flex: 1 1 auto; min-width: 0; }
.jp-job {
  font-size: 7.5pt;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--jp-accent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.jp-child {
  margin-top: 0.6mm;
  font-size: 17pt;
  font-weight: 600;
  line-height: 1.3;
  color: var(--jp-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* An unassigned job prints as a ruled line rather than as a gap — the chart
   still works on the wall while the teacher decides, and a marker finishes it. */
.jp-blank {
  display: block;
  height: 7mm;
  margin-top: 1mm;
  border-bottom: 0.4mm solid var(--jp-border);
}

/* ── slots mode ─────────────────────────────────────────────────────────── */
.jp-slots { display: flex; flex-direction: column; gap: ${SLOT_GAP_MM}mm; }
.jp-slotrow { display: flex; align-items: center; gap: 5mm; break-inside: avoid; }
.jp-slotlabel { display: flex; align-items: center; gap: 3mm; flex: 0 0 auto; min-width: 0; }
.jp-slotname {
  font-size: 11pt;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--jp-accent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* The slot itself. Dashed, because it is a place to put something rather than
   a box around something — the same language the label maker's cut guides use. */
.jp-slot {
  flex: 0 0 auto;
  box-sizing: border-box;
  border: 0.5mm dashed var(--jp-border);
  border-radius: 3mm;
  background: var(--jp-wash);
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

@media print {
  @page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: ${margin}mm; }
  body {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
`;
}

/**
 * The icon cropper's own CSS. Geometry-only, same as `posterCss` — every
 * position and size below comes from `CROP_FRAME_PX`/`CROP_PREVIEW_PX`, never
 * from anything a teacher's picture supplies. Concatenated onto `posterCss`'s
 * output at the ONE top-level `<style>` tag this page renders (see the
 * styled-jsx law note at the bottom of the file) — never a second tag, and
 * never conditional on whether the modal happens to be open right now.
 *
 * 🚨 `print:hidden` NEVER APPLIES TO A `<style>` TAG. The modal itself is only
 * ever mounted inside the screen-only branch of the page, so this CSS simply
 * has nothing to match during a print — it does not need its own guard.
 */
function cropModalCss(): string {
  return `
.jp-crop-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(4, 12, 8, 0.72);
}
.jp-crop-panel {
  width: min(320px, 100%);
  background: #0f2417;
  border: 1px solid rgba(52, 211, 153, 0.2);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}
.jp-crop-title {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
}
.jp-crop-frame {
  width: ${CROP_FRAME_PX}px;
  height: ${CROP_FRAME_PX}px;
  margin: 0 auto;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(52, 211, 153, 0.25);
  touch-action: none;
  cursor: grab;
}
.jp-crop-img {
  position: absolute;
  top: 0;
  left: 0;
  max-width: none;
  user-select: none;
  pointer-events: none;
}
.jp-crop-zoomrow {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
}
.jp-crop-zoomrow input[type='range'] { flex: 1 1 auto; }
.jp-crop-previewrow { display: flex; justify-content: center; margin-top: 14px; }
.jp-crop-preview {
  width: ${CROP_PREVIEW_PX}px;
  height: ${CROP_PREVIEW_PX}px;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(52, 211, 153, 0.25);
  background: rgba(255, 255, 255, 0.04);
}
.jp-crop-preview img {
  position: absolute;
  top: 0;
  left: 0;
  max-width: none;
  pointer-events: none;
}
.jp-crop-error {
  font-size: 12px;
  color: #fca5a5;
  padding: 24px 0;
  text-align: center;
}
.jp-crop-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
`;
}

/**
 * How many A4 sheets this comes out on. An honest number shown on screen, not
 * a layout constraint — a chart of twelve 34mm slots is 400mm of strip and no
 * orientation makes that one page. Telling a teacher before they print beats
 * them finding out at the printer.
 */
function sheetEstimate(mode: PosterMode, slotSize: SlotSize, count: number): number {
  if (count <= 0) return 1;

  if (mode === 'names') {
    const rowH = CARD_H_MM + CARD_GAP_MM;
    const first = Math.max(1, Math.floor((PORTRAIT_H_MM - HEAD_H_MM) / rowH));
    const rest = Math.max(1, Math.floor(PORTRAIT_H_MM / rowH));
    const rows = Math.ceil(count / 2);
    return rows <= first ? 1 : 1 + Math.ceil((rows - first) / rest);
  }

  const size = STRIP_SIZES[slotSize];
  const rowH = size.height + SLOT_GAP_MM;
  const pageH = size.landscape ? LANDSCAPE_H_MM : PORTRAIT_H_MM;
  const first = Math.max(1, Math.floor((pageH - HEAD_H_MM) / rowH));
  const rest = Math.max(1, Math.floor(pageH / rowH));
  return count <= first ? 1 : 1 + Math.ceil((count - first) / rest);
}

/** A stable string for "has this chart changed since it was saved" — the
 *  title travels in the same signature as the jobs, so editing one dirties
 *  the chart exactly like editing the other. */
function signature(jobs: ClassroomJob[], title: string): string {
  return JSON.stringify({ jobs, title });
}

export default function ClassroomJobsPage() {
  const { t } = useI18n();
  const router = useRouter();

  const [jobs, setJobs] = useState<ClassroomJob[]>(() => defaultJobsPoster().jobs);
  /** The room's own poster title, raw and unedited — "" means nobody has
   *  typed one, and the effective title falls back to the default (see
   *  `defaultTitle`/`effectiveTitle` below). Never store the default text
   *  itself here: that would make a later locale change of the default stop
   *  reaching rooms that never customised theirs. */
  const [title, setTitle] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [classroomId, setClassroomId] = useState('');
  const [classroomName, setClassroomName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [isStartingSet, setIsStartingSet] = useState(true);
  const [canSave, setCanSave] = useState(true);
  const [mode, setMode] = useState<PosterMode>('names');
  const [slotSize, setSlotSize] = useState<SlotSize>('poster');
  /** The job currently mid-upload, if any — drives the spinner/disabled state
   *  on exactly that row's icon menu, never the whole list. */
  const [iconUploadingId, setIconUploadingId] = useState<string | null>(null);
  const [iconError, setIconError] = useState('');
  /** The job currently open in the crop modal, and the URL it is cropping —
   *  `revoke: true` when that URL is a local `URL.createObjectURL(file)` this
   *  page must free once the modal closes (a freshly picked file); `false`
   *  when it is the job's own already-uploaded `imageUrl` ("Adjust picture"),
   *  which this page did not create and must not revoke. */
  const [cropState, setCropState] = useState<{
    job: ClassroomJob;
    imageUrl: string;
    revoke: boolean;
  } | null>(null);

  /** The signature of what the server last confirmed. Compared against the
   *  live chart to answer "unsaved changes" without a second copy of the list. */
  const savedRef = useRef<string>('');

  /** `t()` with an English fallback. Montree's translator returns the raw key
   *  when it has no entry, so `value === key` is exactly "not translated yet"
   *  — see the COPY note above. */
  const tx = useCallback(
    (key: string, fallback?: string): string => {
      const value = t(key as TranslationKey);
      if (!value || value === key) return fallback ?? COPY[key] ?? key;
      return value;
    },
    [t]
  );

  useEffect(() => {
    const sess = getSession();
    if (!sess?.classroom?.id) {
      router.push('/montree/login');
      return;
    }
    const roomId = sess.classroom.id;
    setClassroomId(roomId);
    setClassroomName(sess.classroom.name || '');

    let cancelled = false;

    const init = async () => {
      try {
        // 🚨 THE ROOM IS NAMED, SO THE ROOM'S OWN EMBLEM WINS. The brand route
        // is asked about this classroom and `kit` is read — the ALREADY-RESOLVED
        // answer (an active classroom emblem, else the school's). `brandKit` on
        // that response is the SCHOOL's raw kit and would silently ignore a room
        // that has its own; the fallback below only exists for an older build.
        const [childrenRes, brandRes, jobsRes] = await Promise.all([
          fetch(`/api/montree/children?classroom_id=${encodeURIComponent(roomId)}`),
          montreeApi(
            `/api/montree/brand-kit?classroomId=${encodeURIComponent(roomId)}`
          ).catch(() => null),
          montreeApi(
            `/api/montree/classroom-jobs?classroomId=${encodeURIComponent(roomId)}`
          ).catch(() => null),
        ]);

        if (cancelled) return;

        const childrenData = await childrenRes.json();
        const kids: Student[] = ((childrenData.children || []) as Student[])
          .map((c) => ({ id: c.id, name: c.name }))
          .sort((a, b) => a.name.localeCompare(b.name));
        if (!cancelled) setStudents(kids);

        if (brandRes && brandRes.ok) {
          const brandData = (await brandRes.json()) as {
            kit?: BrandKit | null;
            brandKit: BrandKit | null;
          };
          if (!cancelled) {
            setBrandKit(brandData.kit !== undefined ? brandData.kit : brandData.brandKit ?? null);
          }
        }

        if (jobsRes && jobsRes.ok) {
          const jobsData = (await jobsRes.json()) as {
            poster?: unknown;
            isDefault?: boolean;
            available?: boolean;
          };
          // Parsed on the way in as well as on the way out — the screen must
          // not be the one place a malformed chart gets to render.
          const parsed = parseJobsPoster(jobsData.poster) ?? defaultJobsPoster();
          if (!cancelled) {
            setJobs(parsed.jobs);
            setTitle(parsed.title ?? '');
            setIsStartingSet(jobsData.isDefault !== false);
            setCanSave(jobsData.available !== false);
            savedRef.current =
              jobsData.isDefault === false ? signature(parsed.jobs, parsed.title ?? '') : '';
          }
        }
      } catch {
        // Failed to load — the default chart stands, and the teacher can still
        // print one. Nothing about this tool needs the network to be useful.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // ── derived ───────────────────────────────────────────────────────────────

  const activeJobs = useMemo(() => jobs.filter((j) => j.active), [jobs]);

  const studentById = useMemo(
    () => new Map(students.map((s) => [s.id, s])),
    [students]
  );

  /** Children holding more than one ACTIVE job. A soft warning, never a block:
   *  a small room genuinely doubles up, and a tool that refused would be wrong
   *  about the classroom rather than the classroom being wrong about itself. */
  const doubleBooked = useMemo(() => {
    const counts = new Map<string, number>();
    for (const j of activeJobs) {
      if (j.childId) counts.set(j.childId, (counts.get(j.childId) ?? 0) + 1);
    }
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([id]) => id));
  }, [activeJobs]);

  const dirty = savedRef.current !== signature(jobs, title);
  const sheets = sheetEstimate(mode, slotSize, activeJobs.length);

  /**
   * 🚨 A JOB WITH NO NAME IS DROPPED BY THE PARSER, NOT SAVED EMPTY — which is
   * right for a blob arriving from anywhere, and would be a nasty surprise for
   * a teacher who cleared the box to retype it. So the save is held until every
   * job is named, rather than the row quietly disappearing on the round trip.
   */
  const hasBlankName = jobs.some((j) => !j.name.trim());

  /**
   * How many of the starting jobs have been deleted. Drives whether the
   * restore affordance is offered at all — a teacher who still has all twelve
   * does not need a button that would do nothing.
   *
   * 🚨 A DELETED DEFAULT STAYS DELETED. Nothing in the load path, the parser or
   * the route re-merges DEFAULT_JOBS into a saved chart — `defaultJobsPoster()`
   * is only ever reached when a room has NEVER saved one. This count is the
   * only place the default list is consulted after first load, and it is read,
   * never applied, unless the teacher taps.
   */
  const missingDefaults = useMemo(() => {
    const have = new Set(jobs.map((j) => j.id));
    return DEFAULT_JOBS.filter((d) => !have.has(d.id)).length;
  }, [jobs]);

  // ── edits ─────────────────────────────────────────────────────────────────

  const patchJob = useCallback((id: string, patch: Partial<ClassroomJob>) => {
    setSaveState('idle');
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }, []);

  const removeJob = useCallback((id: string) => {
    setSaveState('idle');
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  /**
   * Move one job a single place up or down. Print order IS stored order — the
   * poster maps the array as it stands — so this is the whole feature; nothing
   * downstream sorts.
   *
   * Swap rather than splice-and-insert: a swap is its own inverse, so tapping
   * ▲ then ▼ lands exactly where you started, which is what somebody nudging a
   * list expects. Out-of-range taps return `prev` UNCHANGED (the same object,
   * not a copy) so the top and bottom rows cannot manufacture a dirty chart.
   */
  const moveJob = useCallback((id: string, delta: -1 | 1) => {
    setSaveState('idle');
    setJobs((prev) => {
      const i = prev.findIndex((j) => j.id === id);
      const k = i + delta;
      if (i === -1 || k < 0 || k >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[k]] = [next[k], next[i]];
      return next;
    });
  }, []);

  const addJob = useCallback(() => {
    setSaveState('idle');
    setJobs((prev) =>
      prev.length >= MAX_JOBS
        ? prev
        : [
            ...prev,
            {
              id: newCustomJobId(),
              icon: '⭐',
              name: COPY['classroomJobs.newJob'],
              active: true,
              childId: null,
            },
          ]
    );
  }, []);

  const clearAll = useCallback(() => {
    setSaveState('idle');
    setJobs((prev) => prev.map((j) => ({ ...j, childId: null })));
  }, []);

  /**
   * Put back the starting jobs that have been deleted — and ONLY those.
   *
   * 🚨 THIS IS ADDITIVE, NOT A RESET, and that is the whole design. A reset
   * would need a confirm prompt because it would throw away every custom job
   * and every assignment; an additive restore needs no prompt because it
   * cannot lose anything a teacher typed. A default that has been RENAMED is
   * still present by id, so it is left exactly as renamed rather than being
   * reverted underneath somebody. The restored ones land at the end, where new
   * things belong, and the reorder arrows move them from there.
   */
  const restoreDefaults = useCallback(() => {
    setSaveState('idle');
    setJobs((prev) => {
      const have = new Set(prev.map((j) => j.id));
      const missing = DEFAULT_JOBS.filter((d) => !have.has(d.id)).map((d) => ({
        ...d,
        active: true,
        childId: null,
      }));
      if (missing.length === 0) return prev;
      return [...prev, ...missing].slice(0, MAX_JOBS);
    });
  }, []);

  /**
   * Fill the empty ACTIVE jobs from the children who do not already hold one.
   * Computed from the current list rather than inside the state updater, so a
   * double-invoked updater cannot deal the same child twice.
   */
  const shuffle = useCallback(() => {
    setSaveState('idle');
    const taken = new Set(
      jobs.filter((j) => j.active && j.childId).map((j) => j.childId as string)
    );
    const pool = students.filter((s) => !taken.has(s.id));
    for (let i = pool.length - 1; i > 0; i--) {
      const k = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[k]] = [pool[k], pool[i]];
    }
    let n = 0;
    setJobs(
      jobs.map((j) =>
        j.active && !j.childId && n < pool.length ? { ...j, childId: pool[n++].id } : j
      )
    );
  }, [jobs, students]);

  const save = useCallback(async () => {
    if (!classroomId || !canSave) return;
    setSaveState('saving');
    try {
      const res = await montreeApi('/api/montree/classroom-jobs', {
        method: 'POST',
        body: JSON.stringify({
          classroomId,
          poster: { version: JOBS_POSTER_VERSION, jobs, title },
        }),
      });
      if (!res.ok) throw new Error(`save failed: ${res.status}`);
      const data = (await res.json()) as { poster?: unknown };
      // The server's answer wins — it is the one that scrubbed assignments
      // (and any forged image path) against the room's own roster and
      // storage folder, so echoing the local list back would show a name, or
      // a picture, the saved chart no longer holds.
      const saved: JobsPoster =
        parseJobsPoster(data.poster) ?? { version: JOBS_POSTER_VERSION, jobs, title };
      setJobs(saved.jobs);
      setTitle(saved.title ?? '');
      savedRef.current = signature(saved.jobs, saved.title ?? '');
      setIsStartingSet(false);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }, [classroomId, canSave, jobs, title]);

  /**
   * Upload a job's icon picture and, on success, set it on the job in state —
   * the same round trip a name or an emoji edit takes: nothing is saved to
   * the poster until the teacher hits Save. A REPLACED picture's old file is
   * cleaned up afterwards, best-effort and never blocking the edit the
   * teacher is already looking at.
   */
  const uploadJobIcon = useCallback(
    async (job: ClassroomJob, file: File) => {
      if (!classroomId) return;
      setIconError('');
      setIconUploadingId(job.id);
      try {
        const fd = new FormData();
        fd.append('classroomId', classroomId);
        fd.append('jobId', job.id);
        fd.append('file', file);
        const res = await montreeApi('/api/montree/classroom-jobs/icon', {
          method: 'POST',
          body: fd,
        });
        if (!res.ok) throw new Error(`upload failed: ${res.status}`);
        const data = (await res.json()) as { imageUrl?: string; imagePath?: string };
        if (!data.imageUrl || !data.imagePath) throw new Error('bad response');
        const { imageUrl, imagePath } = data;
        const previousPath = job.imagePath;
        setSaveState('idle');
        setJobs((prev) =>
          prev.map((j) => (j.id === job.id ? { ...j, imageUrl, imagePath } : j))
        );
        if (previousPath && previousPath !== imagePath) {
          montreeApi('/api/montree/classroom-jobs/icon', {
            method: 'DELETE',
            body: JSON.stringify({ classroomId, imagePath: previousPath }),
          }).catch(() => {});
        }
      } catch {
        setIconError(tx('classroomJobs.iconUploadFailed'));
      } finally {
        setIconUploadingId(null);
      }
    },
    [classroomId, tx]
  );

  /** Drop a job's picture back to its emoji. The file itself is cleaned up
   *  best-effort, same as a replacement's old file — see `uploadJobIcon`. */
  const removeJobIcon = useCallback(
    (job: ClassroomJob) => {
      if (!job.imageUrl && !job.imagePath) return;
      const previousPath = job.imagePath;
      setSaveState('idle');
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, imageUrl: undefined, imagePath: undefined } : j))
      );
      if (classroomId && previousPath) {
        montreeApi('/api/montree/classroom-jobs/icon', {
          method: 'DELETE',
          body: JSON.stringify({ classroomId, imagePath: previousPath }),
        }).catch(() => {});
      }
    },
    [classroomId]
  );

  /** A freshly picked file opens the cropper on a local object URL — nothing
   *  is uploaded until the teacher confirms the crop. */
  const openCropForFile = useCallback((job: ClassroomJob, file: File) => {
    setCropState({ job, imageUrl: URL.createObjectURL(file), revoke: true });
  }, []);

  /** "Adjust picture" re-opens the cropper on the job's OWN already-uploaded
   *  image — nothing local to revoke when this one closes. */
  const openCropForExisting = useCallback((job: ClassroomJob) => {
    if (!job.imageUrl) return;
    setCropState({ job, imageUrl: job.imageUrl, revoke: false });
  }, []);

  const closeCrop = useCallback(() => {
    setCropState((prev) => {
      if (prev?.revoke) URL.revokeObjectURL(prev.imageUrl);
      return null;
    });
  }, []);

  /**
   * The crop modal hands back a blob and nothing else — this feeds it through
   * the EXISTING upload path exactly as a plain file pick always has, so the
   * spinner, the error banner and the replace-cleanup DELETE all come free.
   * `cropState.job` is the snapshot taken when the modal opened; its
   * `imagePath` (if any) is what `uploadJobIcon` cleans up once the new
   * picture is safely stored — a re-crop of an existing picture is a
   * replacement like any other.
   */
  const handleCropped = useCallback(
    (blob: Blob) => {
      if (!cropState) return;
      const { job } = cropState;
      closeCrop();
      const file = new File([blob], `${job.id}.png`, { type: 'image/png' });
      void uploadJobIcon(job, file);
    },
    [cropState, closeCrop, uploadJobIcon]
  );

  /** Built once rather than per row — every JobRow shows the same six. */
  const rowLabels = useMemo(
    () => ({
      remove: tx('classroomJobs.remove'),
      confirmRemove: tx('classroomJobs.confirmRemove'),
      confirmYes: tx('classroomJobs.confirmYes'),
      confirmNo: tx('classroomJobs.confirmNo'),
      moveUp: tx('classroomJobs.moveUp'),
      moveDown: tx('classroomJobs.moveDown'),
      uploadPicture: tx('classroomJobs.uploadPicture'),
      adjustPicture: tx('classroomJobs.adjustPicture'),
      removePicture: tx('classroomJobs.removePicture'),
      uploading: tx('classroomJobs.uploading'),
    }),
    [tx]
  );

  // ── the theme ─────────────────────────────────────────────────────────────
  // `isBrandKitActive` also rejects a kit that is switched on but paints
  // nothing, so "configured but empty" behaves like off rather than like a
  // theme made of default greys.
  const kit = isBrandKitActive(brandKit) ? brandKit : null;
  const tokens = kit ? kit.tokens : PLAIN_TOKENS;
  const watermarkOpacity = kit && kit.logoUrl ? tokens.watermarkOpacity : 0;

  const posterVars = {
    '--jp-ink': safeColor(tokens.ink, PLAIN_TOKENS.ink),
    '--jp-accent': safeColor(tokens.accent, PLAIN_TOKENS.accent),
    '--jp-border': safeColor(tokens.border, PLAIN_TOKENS.border),
    '--jp-wash': safeColor(tokens.wash, PLAIN_TOKENS.wash),
    '--jp-watermark': String(Math.max(0, Math.min(0.2, watermarkOpacity || 0))),
    '--jp-display': "var(--font-lora), 'Lora', Georgia, 'Times New Roman', serif",
  } as CSSProperties;

  // The translated starting title, and what actually prints: a blank or
  // whitespace-only edit reads as "nobody has chosen one" (mirrors
  // `parseJobsPoster`'s own rule for `title`), never as a poster deliberately
  // headed with nothing.
  const defaultTitle = tx('classroomJobs.posterTitle', DEFAULT_POSTER_TITLE);
  const effectiveTitle = title.trim() ? title.trim() : defaultTitle;

  /** Built once, same as `rowLabels` — the crop modal shows the same five
   *  strings regardless of which job opened it. */
  const cropLabels = {
    title: tx('classroomJobs.cropTitle'),
    zoom: tx('classroomJobs.cropZoom'),
    cancel: tx('classroomJobs.cropCancel'),
    use: tx('classroomJobs.cropUse'),
    loadError: tx('classroomJobs.cropLoadError'),
  };

  const sheet = (
    <JobsPosterSheet
      jobs={activeJobs}
      studentById={studentById}
      mode={mode}
      slotSize={slotSize}
      logoUrl={kit?.logoUrl ?? null}
      showWatermark={watermarkOpacity > 0}
      title={effectiveTitle}
      roomName={classroomName}
      vars={posterVars}
    />
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🪧</div>
          <p className="text-white/40">{t('labels.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Screen UI — hidden when printing */}
      <div className="min-h-screen bg-[#0a1a0f] print:hidden relative">
        {/* Dark-register: one fixed radial emerald glow */}
        <div
          aria-hidden
          className="fixed inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 0%, rgba(39,129,90,0.32), transparent 60%)',
          }}
        />

        <div className="relative bg-[rgba(7,18,12,0.9)] border-b border-[rgba(52,211,153,0.15)] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => router.push('/montree/library/tools')}
              className="btn btn-ghost btn-icon btn-sm"
            >
              ←
            </button>
            <span className="text-xl">🪧</span>
            <h1 className="font-bold text-white/95 truncate">{tx('classroomJobs.title')}</h1>
          </div>
          <button
            onClick={() => window.print()}
            disabled={activeJobs.length === 0}
            className="btn btn-primary btn-sm"
          >
            🖨️ {t('common.print')}
          </button>
        </div>

        <main className="relative p-4 max-w-3xl mx-auto space-y-6">
          <p className="text-sm text-white/60">{tx('classroomJobs.subtitle')}</p>

          {!canSave && (
            <p className="text-sm text-amber-300/80">{tx('classroomJobs.notAvailable')}</p>
          )}
          {canSave && isStartingSet && (
            <p className="text-sm text-white/45">{tx('classroomJobs.startingSet')}</p>
          )}

          {/* Poster title */}
          <section>
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-3">
              {tx('classroomJobs.titleLabel')}
            </h2>
            <input
              value={title}
              maxLength={MAX_TITLE_LEN}
              placeholder={defaultTitle}
              onChange={(e) => {
                setSaveState('idle');
                setTitle(e.target.value);
              }}
              className="w-full rounded-lg bg-white/[0.06] border border-[rgba(52,211,153,0.15)] text-white/90 text-sm px-3 py-2"
            />
            <p className="text-xs text-white/40 mt-1.5">{tx('classroomJobs.titleHint')}</p>
          </section>

          {/* Poster style */}
          <section>
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-3">
              {tx('classroomJobs.modeLabel')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['names', 'slots'] as PosterMode[]).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setMode(opt)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    mode === opt
                      ? 'border-[#34d399] bg-[rgba(52,211,153,0.1)]'
                      : 'border-[rgba(52,211,153,0.15)] bg-white/[0.06] hover:border-[rgba(52,211,153,0.3)]'
                  }`}
                >
                  <div
                    className={`text-sm font-medium ${mode === opt ? 'text-white/95' : 'text-white/70'}`}
                  >
                    {opt === 'names'
                      ? tx('classroomJobs.modeNames')
                      : tx('classroomJobs.modeSlots')}
                  </div>
                  <div className="text-xs text-white/45 mt-1">
                    {opt === 'names'
                      ? tx('classroomJobs.modeNamesHint')
                      : tx('classroomJobs.modeSlotsHint')}
                  </div>
                </button>
              ))}
            </div>

            {mode === 'slots' && (
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(['poster', 'small'] as SlotSize[]).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setSlotSize(opt)}
                      className={`p-3 rounded-xl border-2 text-left text-sm font-medium transition-all ${
                        slotSize === opt
                          ? 'border-[#34d399] bg-[rgba(52,211,153,0.1)] text-white/95'
                          : 'border-[rgba(52,211,153,0.15)] bg-white/[0.06] text-white/70 hover:border-[rgba(52,211,153,0.3)]'
                      }`}
                    >
                      {opt === 'poster'
                        ? tx('classroomJobs.slotSizePoster')
                        : tx('classroomJobs.slotSizeSmall')}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => router.push('/montree/library/tools/helper-strips')}
                  className="btn btn-ghost btn-sm"
                >
                  ✂️ {tx('classroomJobs.stripsLink')}
                </button>
              </div>
            )}

            <p className="text-xs text-white/40 mt-3">
              {sheets === 1
                ? tx('classroomJobs.sheetOne')
                : tx('classroomJobs.sheetMany').replace('{n}', String(sheets))}
            </p>
          </section>

          {/* Jobs */}
          <section>
            <div className="flex items-center justify-between mb-3 gap-2">
              <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide">
                {tx('classroomJobs.jobsLabel')} ({activeJobs.length}/{jobs.length})
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={shuffle}
                  disabled={students.length === 0}
                  className="btn btn-ghost btn-sm"
                >
                  🎲 {tx('classroomJobs.shuffle')}
                </button>
                <span className="text-white/20">|</span>
                <button onClick={clearAll} className="btn btn-ghost btn-sm">
                  {tx('classroomJobs.clearAll')}
                </button>
              </div>
            </div>

            {students.length === 0 && (
              <p className="text-sm text-white/40 mb-3">{tx('classroomJobs.noChildren')}</p>
            )}

            {jobs.length === 0 ? (
              <p className="text-center py-8 text-white/40">{tx('classroomJobs.noJobs')}</p>
            ) : (
              <div className="space-y-2">
                {jobs.map((job, i) => (
                  <JobRow
                    key={job.id}
                    job={job}
                    index={i}
                    total={jobs.length}
                    students={students}
                    warn={!!job.childId && job.active && doubleBooked.has(job.childId)}
                    warnText={tx('classroomJobs.doubleBooked')}
                    unassignedLabel={tx('classroomJobs.unassigned')}
                    labels={rowLabels}
                    onPatch={patchJob}
                    onRemove={removeJob}
                    onMove={moveJob}
                    uploading={iconUploadingId === job.id}
                    onPickFile={(file) => openCropForFile(job, file)}
                    onAdjustPicture={() => openCropForExisting(job)}
                    onRemoveIcon={() => removeJobIcon(job)}
                  />
                ))}
              </div>
            )}

            {iconError && <p className="text-xs text-rose-300 mt-2">{iconError}</p>}

            <div className="flex items-center flex-wrap gap-3 mt-3">
              <button
                onClick={addJob}
                disabled={jobs.length >= MAX_JOBS}
                className="btn btn-secondary btn-sm"
              >
                ＋ {tx('classroomJobs.addJob')}
              </button>
              {/* Offered only when there is something to restore — see the
                  `missingDefaults` note. Additive, so it needs no confirm. */}
              {missingDefaults > 0 && (
                <button
                  onClick={restoreDefaults}
                  title={tx('classroomJobs.restoreHint')}
                  className="btn btn-ghost btn-sm"
                >
                  ↺ {tx('classroomJobs.restoreDefaults')} ({missingDefaults})
                </button>
              )}
              {jobs.length >= MAX_JOBS && (
                <span className="text-xs text-white/40">{tx('classroomJobs.jobsFull')}</span>
              )}
            </div>
          </section>

          {/* Save */}
          <section className="flex items-center flex-wrap gap-3">
            <button
              onClick={save}
              disabled={
                !canSave ||
                saveState === 'saving' ||
                !dirty ||
                hasBlankName ||
                jobs.length === 0
              }
              className="btn btn-primary btn-sm"
            >
              {saveState === 'saving' ? tx('classroomJobs.saving') : tx('classroomJobs.save')}
            </button>
            {/*
              🚨 THE ONE WAY DELETED DEFAULTS COULD COME BACK, CLOSED HERE.
              `parseJobsPoster` reads an EMPTY job list as "not a chart" and
              returns null, and a null read falls back to `defaultJobsPoster()`
              — so saving an empty chart would hand the teacher all twelve
              starting jobs again on the next load. The save is held instead.
              Deleting eleven of twelve persists perfectly; deleting the twelfth
              asks for one job back first.
            */}
            {jobs.length === 0 && (
              <span className="text-xs text-amber-300/90">{tx('classroomJobs.needOneJob')}</span>
            )}
            {hasBlankName && (
              <span className="text-xs text-amber-300/90">{tx('classroomJobs.blankName')}</span>
            )}
            {saveState === 'error' && (
              <span className="text-xs text-rose-300">{tx('classroomJobs.saveFailed')}</span>
            )}
            {saveState === 'saved' && !dirty && (
              <span className="text-xs text-emerald-300">✓ {tx('classroomJobs.saved')}</span>
            )}
            {saveState !== 'saved' && dirty && canSave && (
              <span className="text-xs text-white/40">{tx('classroomJobs.unsaved')}</span>
            )}
          </section>

          {/* Preview */}
          <section>
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-3">
              {t('labels.preview')}
            </h2>
            {activeJobs.length === 0 ? (
              <p className="text-center py-8 text-white/40">
                {tx('classroomJobs.noActiveJobs')}
              </p>
            ) : (
              <div className="bg-white rounded-xl border border-[rgba(52,211,153,0.15)] p-6 shadow-sm overflow-x-auto">
                {sheet}
              </div>
            )}
          </section>
        </main>

        {/* The icon cropper — mounted only inside this print:hidden branch,
            so it never has anything to hide from the print stylesheet. */}
        {cropState && (
          <IconCropModal
            imageUrl={cropState.imageUrl}
            onCancel={closeCrop}
            onUse={handleCropped}
            labels={cropLabels}
          />
        )}
      </div>

      {/* Print-only layout */}
      <div className="hidden print:block">{sheet}</div>

      {/*
        Print styles — top-level, never inside a conditional render branch
        (the locked Turbopack rule in CLAUDE.md). Injected as a plain string
        rather than styled-jsx because `@page` has to change with the chosen
        mode, and because nothing in it is school-supplied: the colours travel
        as CSS custom properties on the element, not as CSS text.

        🚨 STILL THE ONE TOP-LEVEL <style> TAG. The crop modal's CSS is
        concatenated onto the SAME string rather than given a tag of its own —
        `cropModalCss()` has no dependency on `mode`/`slotSize` and is present
        regardless of whether the modal happens to be open, so folding it in
        here costs nothing and keeps the "one style tag" rule intact even
        though the modal itself only mounts conditionally.
      */}
      <style dangerouslySetInnerHTML={{ __html: posterCss(mode, slotSize) + cropModalCss() }} />
    </>
  );
}

// ── the editor row ──────────────────────────────────────────────────────────
// Everything about a job is editable here: its emoji, its name, whether it runs
// this term, who holds it, where it sits in the order, and whether it exists at
// all. Nothing is special-cased for the twelve starting jobs — a default is a
// row like any other, because a teacher who does not run a Line Leader should
// not have to look at one forever.
//
// Switching a job OFF is the gentler move and is still offered: it keeps the
// wording and the emoji for the term it comes back.

function JobRow({
  job,
  index,
  total,
  students,
  warn,
  warnText,
  unassignedLabel,
  labels,
  onPatch,
  onRemove,
  onMove,
  uploading,
  onPickFile,
  onAdjustPicture,
  onRemoveIcon,
}: {
  job: ClassroomJob;
  index: number;
  total: number;
  students: Student[];
  warn: boolean;
  warnText: string;
  unassignedLabel: string;
  labels: {
    remove: string;
    confirmRemove: string;
    confirmYes: string;
    confirmNo: string;
    moveUp: string;
    moveDown: string;
    uploadPicture: string;
    adjustPicture: string;
    removePicture: string;
    uploading: string;
  };
  onPatch: (id: string, patch: Partial<ClassroomJob>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  /** True while THIS job's picture is mid-upload — drives the spinner/disabled
   *  state on this row's menu alone. */
  uploading: boolean;
  /** A file was just picked — opens the cropper on it, uploads nothing yet. */
  onPickFile: (file: File) => void;
  /** "Adjust picture" — opens the cropper on the job's OWN already-uploaded
   *  image. Only ever offered when `job.imageUrl` is set. */
  onAdjustPicture: () => void;
  onRemoveIcon: () => void;
}) {
  const held = job.childId ? students.find((s) => s.id === job.childId) : undefined;

  /** Deleting a default is now allowed, so deleting anything asks once. Two
   *  taps rather than a `confirm()` dialog: this screen is used on a phone at
   *  the back of a classroom, and a native modal there is a bigger interruption
   *  than the thing it is guarding. */
  const [confirming, setConfirming] = useState(false);

  /** The icon cell's own upload/remove menu — a small popover rather than a
   *  modal, so tapping it does not lose the teacher's place in the list. */
  const [iconMenuOpen, setIconMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={`rounded-xl border p-3 space-y-2 transition-opacity ${
        job.active
          ? 'border-[rgba(52,211,153,0.15)] bg-white/[0.06]'
          : 'border-[rgba(52,211,153,0.08)] bg-white/[0.02] opacity-55'
      }`}
    >
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={job.active}
          onChange={() => onPatch(job.id, { active: !job.active })}
          className="w-4 h-4 shrink-0 accent-[#34d399]"
          aria-label={job.name}
        />
        {/* The icon cell: a picture once one is set, otherwise the emoji box —
            either way, a tap opens the upload/remove menu. */}
        <div className="relative shrink-0">
          {job.imageUrl ? (
            <button
              type="button"
              onClick={() => setIconMenuOpen((v) => !v)}
              title={labels.uploadPicture}
              aria-label={labels.uploadPicture}
              className="w-11 h-11 rounded-lg overflow-hidden border border-[rgba(52,211,153,0.15)] bg-white/[0.06] block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={job.imageUrl} alt="" className="w-full h-full object-cover" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <input
                value={job.icon}
                maxLength={MAX_ICON_LEN}
                onChange={(e) => onPatch(job.id, { icon: e.target.value })}
                className="w-11 shrink-0 text-center text-lg rounded-lg bg-white/[0.06] border border-[rgba(52,211,153,0.15)] text-white/90 py-1.5"
              />
              <button
                type="button"
                onClick={() => setIconMenuOpen((v) => !v)}
                title={labels.uploadPicture}
                aria-label={labels.uploadPicture}
                className="btn btn-ghost btn-icon btn-sm shrink-0"
              >
                🖼️
              </button>
            </div>
          )}

          {iconMenuOpen && (
            <div className="absolute z-10 top-full left-0 mt-1 w-40 rounded-lg border border-[rgba(52,211,153,0.2)] bg-[#0f2417] p-1.5 shadow-lg space-y-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="btn btn-ghost btn-sm w-full justify-start"
              >
                {uploading ? labels.uploading : labels.uploadPicture}
              </button>
              {job.imageUrl && (
                <button
                  type="button"
                  onClick={() => {
                    onAdjustPicture();
                    setIconMenuOpen(false);
                  }}
                  disabled={uploading}
                  className="btn btn-ghost btn-sm w-full justify-start"
                >
                  {labels.adjustPicture}
                </button>
              )}
              {job.imageUrl && (
                <button
                  type="button"
                  onClick={() => {
                    onRemoveIcon();
                    setIconMenuOpen(false);
                  }}
                  className="btn btn-ghost btn-sm w-full justify-start"
                >
                  {labels.removePicture}
                </button>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              setIconMenuOpen(false);
              if (file) onPickFile(file);
            }}
          />
        </div>
        <input
          value={job.name}
          maxLength={MAX_NAME_LEN}
          onChange={(e) => onPatch(job.id, { name: e.target.value })}
          className="flex-1 min-w-0 rounded-lg bg-white/[0.06] border border-[rgba(52,211,153,0.15)] text-white/90 text-sm px-2.5 py-1.5"
        />
        {/* Order. Disabled at the ends rather than hidden, so the row's controls
            do not shift position as a job travels up the list. */}
        <button
          onClick={() => onMove(job.id, -1)}
          disabled={index === 0}
          title={labels.moveUp}
          aria-label={labels.moveUp}
          className="btn btn-ghost btn-icon btn-sm shrink-0"
        >
          ▲
        </button>
        <button
          onClick={() => onMove(job.id, 1)}
          disabled={index === total - 1}
          title={labels.moveDown}
          aria-label={labels.moveDown}
          className="btn btn-ghost btn-icon btn-sm shrink-0"
        >
          ▼
        </button>
        <button
          onClick={() => setConfirming(true)}
          title={labels.remove}
          aria-label={labels.remove}
          className="btn btn-ghost btn-icon btn-sm shrink-0"
        >
          ✕
        </button>
      </div>

      {confirming ? (
        <div className="flex items-center flex-wrap gap-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-2">
          <span className="text-xs text-white/80">{labels.confirmRemove}</span>
          <button onClick={() => onRemove(job.id)} className="btn btn-danger btn-sm">
            {labels.confirmYes}
          </button>
          <button onClick={() => setConfirming(false)} className="btn btn-ghost btn-sm">
            {labels.confirmNo}
          </button>
        </div>
      ) : (
        <select
          value={job.childId ?? ''}
          onChange={(e) => onPatch(job.id, { childId: e.target.value || null })}
          className="w-full rounded-lg bg-[#0f2417] border border-[rgba(52,211,153,0.15)] text-white/90 text-sm px-2.5 py-1.5"
        >
          <option value="">{unassignedLabel}</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      )}

      {warn && held && (
        <p className="text-xs text-amber-300/90">
          ⚠ {firstName(held.name)} {warnText}
        </p>
      )}
    </div>
  );
}

// ── the icon cropper ─────────────────────────────────────────────────────────
// A hand-rolled square cropper — no new dependency, same ethos as the canvas
// work in lib/montree/brand-kit/extract.ts: a plain `<canvas>`, pointer events
// for pan, a range input for zoom, and `computeCropGeometry` doing every bit
// of the actual math so this component only ever renders numbers it did not
// have to derive itself.
//
// Opens over EITHER a freshly picked file's object URL, or an already-uploaded
// job picture's own `imageUrl` ("Adjust picture") — the caller decides which,
// this component only ever sees "an image URL to crop".

function IconCropModal({
  imageUrl,
  onCancel,
  onUse,
  labels,
}: {
  imageUrl: string;
  onCancel: () => void;
  onUse: (blob: Blob) => void;
  labels: { title: string; zoom: string; cancel: string; use: string; loadError: string };
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  /** The raw pointer position at the start of the current drag — null when
   *  not dragging. Only ever read to compute the NEXT delta; the accumulated
   *  position lives in `offset` below. */
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  /** Absolute image position in frame-space CSS pixels — always the CLAMPED
   *  value `computeCropGeometry` last returned, never a raw delta. See that
   *  function's own note on why this avoids a "dead zone" on reversed drags. */
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [exporting, setExporting] = useState(false);

  // ESC closes the modal — the only keyboard affordance this needs; Cancel
  // does the same thing with a pointer.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const handleImageLoad = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const w = img.naturalWidth || 1;
    const h = img.naturalHeight || 1;
    setImgSize({ w, h });
    setZoom(1);
    setOffset(defaultCoverOffset(w, h, CROP_FRAME_PX));
  }, []);

  const geometry = imgSize
    ? computeCropGeometry({
        imgW: imgSize.w,
        imgH: imgSize.h,
        frame: CROP_FRAME_PX,
        zoom,
        offsetX: offset.x,
        offsetY: offset.y,
      })
    : null;

  const applyZoom = useCallback(
    (nextZoom: number) => {
      setZoom(nextZoom);
      setOffset((prev) => {
        if (!imgSize) return prev;
        const g = computeCropGeometry({
          imgW: imgSize.w,
          imgH: imgSize.h,
          frame: CROP_FRAME_PX,
          zoom: nextZoom,
          offsetX: prev.x,
          offsetY: prev.y,
        });
        return { x: g.offsetX, y: g.offsetY };
      });
    },
    [imgSize]
  );

  const applyDrag = useCallback(
    (dx: number, dy: number) => {
      setOffset((prev) => {
        if (!imgSize) return prev;
        const g = computeCropGeometry({
          imgW: imgSize.w,
          imgH: imgSize.h,
          frame: CROP_FRAME_PX,
          zoom,
          offsetX: prev.x + dx,
          offsetY: prev.y + dy,
        });
        return { x: g.offsetX, y: g.offsetY };
      });
    },
    [imgSize, zoom]
  );

  // Pointer Events unify mouse and touch — one handler pair, not a separate
  // mouse/touchmove set, and `touch-action: none` on the frame (see
  // cropModalCss) stops the page from also trying to scroll under the drag.
  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY };
  }, []);
  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.x;
      const dy = e.clientY - dragRef.current.y;
      dragRef.current = { x: e.clientX, y: e.clientY };
      applyDrag(dx, dy);
    },
    [applyDrag]
  );
  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handleUse = useCallback(() => {
    if (!imgRef.current || !geometry) return;
    setExporting(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = CROP_EXPORT_PX;
      canvas.height = CROP_EXPORT_PX;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no 2d context');
      ctx.drawImage(
        imgRef.current,
        geometry.sourceX,
        geometry.sourceY,
        geometry.sourceSize,
        geometry.sourceSize,
        0,
        0,
        CROP_EXPORT_PX,
        CROP_EXPORT_PX
      );
      canvas.toBlob((blob) => {
        setExporting(false);
        if (blob) {
          onUse(blob);
        } else {
          setLoadFailed(true);
        }
      }, 'image/png');
    } catch {
      // A tainted canvas (a cross-origin image the server did not send CORS
      // headers for) throws HERE rather than handing back a blob — same
      // failure as `toBlob` returning null, same recovery: ask the teacher to
      // re-upload rather than fail silently or crash the page.
      setExporting(false);
      setLoadFailed(true);
    }
  }, [geometry, onUse]);

  const framePx = (n: number) => (imgSize ? (n * CROP_PREVIEW_PX) / CROP_FRAME_PX : 0);

  return (
    <div className="jp-crop-overlay" role="dialog" aria-modal="true" aria-label={labels.title}>
      <div className="jp-crop-panel">
        <h3 className="jp-crop-title">{labels.title}</h3>

        {loadFailed ? (
          <p className="jp-crop-error">{labels.loadError}</p>
        ) : (
          <>
            <div
              className="jp-crop-frame"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={imageUrl}
                alt=""
                crossOrigin="anonymous"
                draggable={false}
                onLoad={handleImageLoad}
                onError={() => setLoadFailed(true)}
                className="jp-crop-img"
                style={
                  geometry && imgSize
                    ? {
                        width: `${imgSize.w * geometry.scale}px`,
                        height: `${imgSize.h * geometry.scale}px`,
                        transform: `translate(${geometry.offsetX}px, ${geometry.offsetY}px)`,
                      }
                    : undefined
                }
              />
            </div>

            <label className="jp-crop-zoomrow">
              <span>{labels.zoom}</span>
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                value={zoom}
                disabled={!imgSize}
                onChange={(e) => applyZoom(Number(e.target.value))}
              />
            </label>

            {/* The live preview at the icon's own footprint — exactly the
                same framing, scaled down, so what a teacher sees here is what
                prints on the poster. */}
            <div className="jp-crop-previewrow">
              <div className="jp-crop-preview" aria-hidden="true">
                {geometry && imgSize && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt=""
                    crossOrigin="anonymous"
                    draggable={false}
                    style={{
                      width: `${framePx(imgSize.w * geometry.scale)}px`,
                      height: `${framePx(imgSize.h * geometry.scale)}px`,
                      transform: `translate(${framePx(geometry.offsetX)}px, ${framePx(geometry.offsetY)}px)`,
                    }}
                  />
                )}
              </div>
            </div>
          </>
        )}

        <div className="jp-crop-actions">
          <button type="button" onClick={onCancel} className="btn btn-ghost btn-sm">
            {labels.cancel}
          </button>
          <button
            type="button"
            onClick={handleUse}
            disabled={!geometry || exporting || loadFailed}
            className="btn btn-primary btn-sm"
          >
            {labels.use}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── the paper ───────────────────────────────────────────────────────────────
// Shared by the screen preview and the print block, so what a teacher approves
// is literally the element that goes to the printer.

function JobsPosterSheet({
  jobs,
  studentById,
  mode,
  slotSize,
  logoUrl,
  showWatermark,
  title,
  roomName,
  vars,
}: {
  jobs: ClassroomJob[];
  studentById: Map<string, Student>;
  mode: PosterMode;
  slotSize: SlotSize;
  logoUrl: string | null;
  showWatermark: boolean;
  title: string;
  roomName: string;
  vars: CSSProperties;
}) {
  return (
    <div className={`jp-poster ${quicksand.className}`} style={vars}>
      {/* The ghost. First child so it sits behind everything that follows;
          decorative, so it carries no alt text — the room is already named in
          words on the masthead. */}
      {showWatermark && logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="jp-watermark" src={logoUrl} alt="" aria-hidden="true" />
      )}

      <header className="jp-head">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="jp-emblem" src={logoUrl} alt="" aria-hidden="true" />
        )}
        <div className="jp-headtext">
          <h2 className="jp-title" dir="auto">
            {title}
          </h2>
          {roomName && (
            <p className="jp-room" dir="auto">
              {roomName}
            </p>
          )}
        </div>
      </header>

      <div className="jp-body">
        {mode === 'names' ? (
          <div className="jp-grid">
            {jobs.map((job) => {
              const child = job.childId ? studentById.get(job.childId) : undefined;
              return (
                <div className="jp-card" key={job.id}>
                  {/* Always rendered, even when empty: the icon column is what
                      keeps every job name on the same left edge across cards.
                      An `<img>`, never a CSS background — see the header
                      note on why. */}
                  {job.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className="jp-icon jp-icon-img"
                      src={job.imageUrl}
                      alt=""
                      aria-hidden="true"
                    />
                  ) : (
                    <span className="jp-icon">{job.icon}</span>
                  )}
                  <div className="jp-cardtext">
                    <div className="jp-job" dir="auto">
                      {job.name}
                    </div>
                    {child ? (
                      <div className="jp-child" dir="auto">
                        {firstName(child.name)}
                      </div>
                    ) : (
                      // An unassigned job prints as a line to write on rather
                      // than as a hole in the chart.
                      <span className="jp-blank" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="jp-slots">
            {jobs.map((job) => (
              <div className="jp-slotrow" key={job.id}>
                <div
                  className="jp-slotlabel"
                  style={{ flex: `0 0 ${STRIP_SIZES[slotSize].label}mm` }}
                >
                  {job.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className="jp-icon jp-icon-img"
                      style={{ width: '9mm', height: '9mm' }}
                      src={job.imageUrl}
                      alt=""
                      aria-hidden="true"
                    />
                  ) : (
                    <span className="jp-icon" style={{ width: '9mm', fontSize: '15pt' }}>
                      {job.icon}
                    </span>
                  )}
                  <span className="jp-slotname" style={{ minWidth: 0 }} dir="auto">
                    {job.name}
                  </span>
                </div>
                {/* The empty slot, at exactly the Helper Name Strips footprint
                    for this size — see STRIP_SIZES. */}
                <div
                  className="jp-slot"
                  style={{
                    width: `${STRIP_SIZES[slotSize].width}mm`,
                    height: `${STRIP_SIZES[slotSize].height}mm`,
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
