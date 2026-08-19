// /montree/library/tools/daily-schedule/page.tsx
// Printable Daily Schedule — a wall poster, not a compact sheet. Each step
// (e.g. "Circle Time") prints as its own card at exactly 1/3 of an A4 page,
// picture + big label, using the same touching-edge colour-bordered card
// pattern as the 3-part card generator and label maker: the border colour
// fills the whole cell as a background, a white inner box sits inset inside
// it, and cards sit in a zero-gap grid so the coloured frame reads as one
// continuous band with no stroke line and no gap between cards.
//
// Three things this page does beyond "type a list and print":
//
//   1. CROP EDITOR — a dropped picture is fitted to the print slot by the
//      teacher, not chopped by `object-fit: cover`. The ORIGINAL is kept
//      alongside the derived crop, so re-opening the editor is always
//      non-destructive and always re-editable.
//   2. KID TYPOGRAPHY — a 1/3-A4 card is a wall poster read from across a
//      room, so the label starts at 40pt (adaptive down to 18pt) in the
//      house rounded/handwriting stack, not at worksheet size.
//   3. BRAND KIT — dropping an emblem reads its palette client-side
//      (`extractBrandKit`) and auto-fills the frame colour, then heads page
//      one with a masthead in the school's own ink/accent/wash.
//
// 🚨 EVERY COLOUR THAT REACHES THE PRINT WINDOW GOES THROUGH `safeColor()`
// AT ITS POINT OF INTERPOLATION. The print document is raw CSS text written
// into a popup, so the narrow hex gate is the whole safety argument — the
// same gate `brand-kit/css.ts` and the classroom-jobs poster apply at theirs.
'use client';

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { useI18n, type TranslationKey } from '@/lib/montree/i18n';
import { escapeHtml, sanitizeImageUrl } from '@/lib/sanitize';
import { extractBrandKit } from '@/lib/montree/brand-kit/extract';
import { type BrandTokens } from '@/lib/montree/brand-kit/types';

/** The crop transform, stored NORMALISED so it survives any frame size:
 *  `x`/`y` are the fraction of the ORIGINAL image sitting at the crop
 *  frame's left/top edge, `scale` is the zoom multiplier over cover-fit.
 *  Re-opening the editor rebuilds the exact same view from these three
 *  numbers, which is why the original is kept and never overwritten. */
interface CropTransform {
  x: number;
  y: number;
  scale: number;
}

interface ScheduleStep {
  id: number;
  time: string;
  label: string;
  /** What prints — the cropped, flattened JPEG (or the raw drop, until the
   *  teacher has chosen a crop). */
  imageDataUrl: string | null;
  /** What the crop editor works from. Never overwritten by a crop. */
  originalImageDataUrl: string | null;
  crop?: CropTransform;
}

/** 🚨 THE COPY, AND WHY IT LIVES HERE — same reasoning as helper-strips:
 *  montree's i18n hook requires a key in all twelve locale files before
 *  it may be committed. The two grid-entry keys (title/desc used by the
 *  Library Tools card) were added to all twelve locale files directly.
 *  Everything else on THIS page ships its own English via tx() below so
 *  the page reads cleanly today and picks up real translations with zero
 *  code changes the moment those keys land in the locale files. */
const COPY: Record<string, string> = {
  'dailySchedule.title': 'Daily Schedule',
  'dailySchedule.subtitle':
    'A wall poster, not a worksheet — one picture and one big label per step. Print, cut, and stick each page up in order.',
  'dailySchedule.emblemLabel': 'School emblem',
  'dailySchedule.emblemHint':
    'Drop your emblem here, or click to upload — it heads page one and sets your colours.',
  'dailySchedule.emblemSet': 'Emblem set — it heads page one.',
  'dailySchedule.emblemReading': 'Reading your logo…',
  'dailySchedule.remove': 'Remove',
  'dailySchedule.classNameLabel': 'Class name',
  'dailySchedule.classNamePlaceholder': 'e.g. Whale Class',
  'dailySchedule.classNameHint': 'Prints on the heading strip at the top of page one.',
  'dailySchedule.borderColor': 'Border colour',
  'dailySchedule.borderHint': 'Same touching-edge, colour-framed card as your 3-part cards and labels.',
  'dailySchedule.colorMatched': 'Matched to your logo — tweak if you like.',
  'dailySchedule.stepsLabel': 'Steps',
  'dailySchedule.stepsCount': 'steps',
  'dailySchedule.addStep': '+ Add step',
  'dailySchedule.bulkPlaceholder': '7:45 | Welcome & Free Choice\n9:00 | Circle Time\n9:30 | Work Cycle',
  'dailySchedule.addBulk': 'Add steps from list',
  'dailySchedule.stepNamePlaceholder': 'Step name',
  'dailySchedule.timePlaceholder': 'time',
  'dailySchedule.picture': 'Picture',
  'dailySchedule.print': 'Print',
  'dailySchedule.pagesSummary': 'per page',
  'dailySchedule.page': 'Page',
  'dailySchedule.of': 'of',
  'dailySchedule.empty': 'Add a step to see your schedule build up here.',
  'dailySchedule.adjust': 'Adjust picture',
  'dailySchedule.cropTitle': 'Fit the picture',
  'dailySchedule.cropHint': 'Drag the picture to move it, slide to zoom. This box is exactly what prints.',
  'dailySchedule.zoom': 'Zoom',
  'dailySchedule.reset': 'Reset',
  'dailySchedule.cancel': 'Cancel',
  'dailySchedule.apply': 'Use this picture',
};

const DEFAULT_BORDER_COLOR = '#0D9488';
const DEFAULT_INK = '#0D3330';
const A4_WIDTH_CM = 21;
const A4_HEIGHT_CM = 29.7;
const STEPS_PER_PAGE = 3;
const CARD_PAD_CM = 0.35;
const CARD_RADIUS_CM = 0.35;

/** A wall poster is read from across a room. 40pt is the starting point;
 *  `adaptiveStepFontSize` walks it down to 18pt only when a genuinely long
 *  activity name needs the room. */
const BASE_LABEL_PT = 40;
const MIN_LABEL_PT = 18;
const TIME_PT = 13;

/** The masthead is a fixed 2.4cm so page one's card height is arithmetic,
 *  not a measurement — the adaptive sizer needs a number before render. */
const MASTHEAD_H_CM = 2.4;
const MASTHEAD_EMBLEM_H_CM = 1.7;

const PT_TO_CM = 2.54 / 72;

// ── the print slot geometry, derived once from the constants above ─────────
// The crop frame's aspect ratio is not a design choice, it is THIS number:
// anything else and the teacher crops one shape and prints another.
const CARD_INNER_W_CM = A4_WIDTH_CM - CARD_PAD_CM * 2;
const CARD_INNER_H_CM = A4_HEIGHT_CM / STEPS_PER_PAGE - CARD_PAD_CM * 2;
const IMAGE_COL_RATIO = 0.38;
const IMAGE_SLOT_W_CM = CARD_INNER_W_CM * IMAGE_COL_RATIO;
/** width ÷ height of the printed picture slot. ~0.84 — portrait-ish. */
const CROP_ASPECT = IMAGE_SLOT_W_CM / CARD_INNER_H_CM;

const TEXT_PAD_X_CM = 0.9;
const TEXT_PAD_Y_CM = 0.7;
const TIME_GAP_CM = 0.25;
/** Vertical room the time line + its gap take out of the text column. */
const TIME_BLOCK_CM = TIME_PT * PT_TO_CM * 1.2 + TIME_GAP_CM;

const TEXT_AREA_W_CM = CARD_INNER_W_CM * (1 - IMAGE_COL_RATIO) - TEXT_PAD_X_CM * 2;
/** Full-height card (pages 2+, and page one when there is no masthead). */
const TEXT_AREA_H_CM = CARD_INNER_H_CM - TEXT_PAD_Y_CM * 2 - TIME_BLOCK_CM;
/** Page one WITH a masthead: three cards share the remaining height. */
const CARD_INNER_H_MASTHEAD_CM = (A4_HEIGHT_CM - MASTHEAD_H_CM) / STEPS_PER_PAGE - CARD_PAD_CM * 2;
const TEXT_AREA_H_MASTHEAD_CM = CARD_INNER_H_MASTHEAD_CM - TEXT_PAD_Y_CM * 2 - TIME_BLOCK_CM;

/** The kid-materials stack. SYSTEM FONTS ONLY — no external CDN, ever: the
 *  founder prints from behind the GFW, where a Google Fonts <link> is a
 *  blocked request that stalls the print window. */
const KID_FONT_STACK =
  "'Comic Sans MS', 'Comic Sans', 'Chalkboard SE', 'Marker Felt', 'Segoe Print', system-ui, sans-serif";

let nextId = 1;

/** 6-digit hex or `transparent` only — the same narrow gate `brand-kit/css.ts`
 *  and the classroom-jobs poster apply at THEIR point of injection. Applied
 *  here rather than trusted from upstream because these values are written
 *  into raw CSS text in a popup document. */
function safeColor(value: string | undefined | null, fallback: string): string {
  return value && (value === 'transparent' || /^#[0-9a-fA-F]{6}$/.test(value)) ? value : fallback;
}

/** Preview helpers. The on-screen page is a container query context, so a
 *  centimetre on paper is a fixed percentage of the preview's width at ANY
 *  preview size — which is what makes the preview genuinely WYSIWYG rather
 *  than "a few Tailwind sizes that look about right". */
function cmToCqw(cm: number): number {
  return (cm / A4_WIDTH_CM) * 100;
}
function ptToCqw(pt: number): number {
  return cmToCqw(pt * PT_TO_CM);
}

/** Shrink the step label from BASE_LABEL_PT down to MIN_LABEL_PT so a long
 *  activity name never overflows its 1/3-page card. Mirrors the adaptive
 *  sizer already used by the 3-part card generator (print-utils.ts). */
function adaptiveStepFontSize(label: string, areaWidthCm: number, areaHeightCm: number): number {
  const CHAR_W = 0.58;
  const lineHeight = 1.15;
  const widthPt = areaWidthCm * 28.35;
  const heightPt = areaHeightCm * 28.35;
  const words = label.split(/\s+/).filter(Boolean);
  const longestWordLen = words.reduce((m, w) => Math.max(m, w.length), 1);

  let fontSize = BASE_LABEL_PT;
  while (fontSize > MIN_LABEL_PT) {
    const charWidth = fontSize * CHAR_W;
    const charsPerLine = Math.max(1, Math.floor(widthPt / charWidth));
    const longestWordFits = longestWordLen <= charsPerLine;

    let lines = 1;
    let cur = 0;
    for (const w of words) {
      if (cur > 0 && cur + 1 + w.length > charsPerLine) {
        lines++;
        cur = w.length;
      } else {
        cur += (cur > 0 ? 1 : 0) + w.length;
      }
      if (w.length > charsPerLine) lines += Math.ceil(w.length / charsPerLine) - 1;
    }
    const totalHeightPt = lines * fontSize * lineHeight;
    if (longestWordFits && totalHeightPt <= heightPt) break;
    fontSize -= 1;
  }
  return Math.max(MIN_LABEL_PT, fontSize);
}

interface SheetTheme {
  /** Card frame, time line, masthead rule + class-name line. The teacher's
   *  colour input always wins here — the logo only pre-fills it. */
  accent: string;
  /** The big label, and the masthead title. */
  ink: string;
  /** Masthead band tint. `'transparent'` prints as bare paper. */
  wash: string;
}

/** Build the printable A4 HTML document — 3 steps per page, each step a
 *  full-width card exactly 1/3 of the page tall (slightly shorter on page
 *  one when a masthead is present). Same window.open() + document.write()
 *  approach the 3-part card generator and label maker use, rather than
 *  in-page @media print (more reliable across browsers). */
function generateDailySchedulePrintHTML(
  steps: ScheduleStep[],
  opts: {
    theme: SheetTheme;
    emblemDataUrl: string | null;
    className: string;
    title: string;
  }
): string {
  const accent = safeColor(opts.theme.accent, DEFAULT_BORDER_COLOR);
  const ink = safeColor(opts.theme.ink, DEFAULT_INK);
  const wash = safeColor(opts.theme.wash, 'transparent');

  const safeEmblem = opts.emblemDataUrl ? sanitizeImageUrl(opts.emblemDataUrl) : '';
  const className = opts.className.trim();
  const hasMasthead = Boolean(safeEmblem || className);

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Daily Schedule - Print</title>
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ${KID_FONT_STACK}; background: white; }

    .page {
      page-break-after: always;
      width: ${A4_WIDTH_CM}cm;
      height: ${A4_HEIGHT_CM}cm;
      position: relative;
      overflow: hidden;
      display: grid;
      grid-template-rows: repeat(${STEPS_PER_PAGE}, 1fr);
      gap: 0;
    }
    /* Page one with a heading strip: the strip takes its fixed height, the
       three cards share what is left. Pages 2+ keep the plain 3×1fr grid. */
    .page.has-masthead {
      grid-template-rows: ${MASTHEAD_H_CM}cm repeat(${STEPS_PER_PAGE}, 1fr);
    }
    .page:last-child { page-break-after: auto; }

    .masthead {
      display: flex;
      align-items: center;
      gap: 0.6cm;
      padding: 0 0.8cm;
      background: ${wash};
      border-bottom: 0.08cm solid ${accent};
      overflow: hidden;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    /* An <img>, never a CSS background — a background image is the first
       thing "background graphics off" drops, and it cannot be object-fit
       contained, which is what keeps a whole logo whole. */
    .masthead-emblem {
      height: ${MASTHEAD_EMBLEM_H_CM}cm;
      width: auto;
      max-width: 5.5cm;
      object-fit: contain;
      display: block;
      flex: 0 0 auto;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .masthead-text { min-width: 0; }
    .masthead-title {
      font-size: 24pt;
      font-weight: 700;
      line-height: 1.05;
      color: ${ink};
    }
    .masthead-room {
      margin-top: 0.12cm;
      font-size: 11pt;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: ${accent};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .slot-card {
      background: ${accent};
      padding: ${CARD_PAD_CM}cm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      position: relative;
    }

    .slot-inner {
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      border-radius: ${CARD_RADIUS_CM}cm;
      height: 100%;
      display: flex;
      overflow: hidden;
    }

    .slot-image {
      width: ${IMAGE_COL_RATIO * 100}%;
      flex-shrink: 0;
      background: #f4f8f7;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border-right: 1px solid #e3ede9;
    }
    .slot-image img { width: 100%; height: 100%; object-fit: cover; }
    .slot-image .ph { font-size: 40pt; opacity: 0.25; }

    .slot-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: ${TEXT_PAD_Y_CM}cm ${TEXT_PAD_X_CM}cm;
      min-width: 0;
    }
    .slot-time {
      font-size: ${TIME_PT}pt;
      font-weight: 800;
      color: ${accent};
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin-bottom: ${TIME_GAP_CM}cm;
    }
    .slot-label {
      font-weight: 800;
      color: ${ink};
      line-height: 1.08;
      word-wrap: break-word;
      overflow-wrap: anywhere;
    }

    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      body { margin: 0; padding: 0; }
      .slot-card { background: ${accent} !important; }
      .masthead { background: ${wash} !important; }
    }

    @media screen {
      body { padding: 20px; background: #f0f0f0; }
      .page { background: white; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    }
  </style>
</head>
<body>
`;

  for (let i = 0; i < steps.length; i += STEPS_PER_PAGE) {
    const pageSteps = steps.slice(i, i + STEPS_PER_PAGE);
    const isFirstPage = i === 0;
    const pageHasMasthead = isFirstPage && hasMasthead;
    // Page one's cards lose the masthead's height, so its labels are sized
    // against the SHORTER text box — otherwise a long label that just fitted
    // on page two overflows on page one.
    const textAreaHeightCm = pageHasMasthead ? TEXT_AREA_H_MASTHEAD_CM : TEXT_AREA_H_CM;

    html += `<div class="page${pageHasMasthead ? ' has-masthead' : ''}">`;

    if (pageHasMasthead) {
      html += `
        <div class="masthead">
          ${safeEmblem ? `<img class="masthead-emblem" src="${safeEmblem}" alt="">` : ''}
          <div class="masthead-text">
            <div class="masthead-title">${escapeHtml(opts.title)}</div>
            ${className ? `<div class="masthead-room">${escapeHtml(className)}</div>` : ''}
          </div>
        </div>
      `;
    }

    for (const step of pageSteps) {
      const fontPt = adaptiveStepFontSize(step.label || ' ', TEXT_AREA_W_CM, textAreaHeightCm);
      const safeImg = step.imageDataUrl ? sanitizeImageUrl(step.imageDataUrl) : '';
      html += `
        <div class="slot-card">
          <div class="slot-inner">
            <div class="slot-image">
              ${safeImg ? `<img src="${safeImg}" alt="${escapeHtml(step.label)}">` : `<span class="ph">🖼️</span>`}
            </div>
            <div class="slot-text">
              ${step.time ? `<div class="slot-time">${escapeHtml(step.time)}</div>` : ''}
              <div class="slot-label" style="font-size: ${fontPt}pt;">${escapeHtml(step.label)}</div>
            </div>
          </div>
        </div>
      `;
    }
    html += `</div>`;
  }

  html += `
  <script>
    window.onload = function() { setTimeout(() => { window.print(); }, 500); };
  </script>
</body>
</html>
`;

  return html;
}

export default function DailySchedulePage() {
  const { t } = useI18n();
  const router = useRouter();

  const tx = useCallback(
    (key: string, fallback?: string): string => {
      const value = t(key as TranslationKey);
      if (!value || value === key) return fallback ?? COPY[key] ?? key;
      return value;
    },
    [t]
  );

  const [steps, setSteps] = useState<ScheduleStep[]>([
    { id: nextId++, time: '7:45', label: 'Welcome & Free Choice', imageDataUrl: null, originalImageDataUrl: null },
    { id: nextId++, time: '9:00', label: 'Circle Time', imageDataUrl: null, originalImageDataUrl: null },
    { id: nextId++, time: '9:30', label: 'Work Cycle', imageDataUrl: null, originalImageDataUrl: null },
  ]);
  const [borderColor, setBorderColor] = useState(DEFAULT_BORDER_COLOR);
  const [emblemDataUrl, setEmblemDataUrl] = useState<string | null>(null);
  const [className, setClassName] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [cropStepId, setCropStepId] = useState<number | null>(null);

  // ── the theme read off the emblem ────────────────────────────────────────
  // Client-side only: this page is public and has no school session, so
  // there is no brand-kit API to call — the logo in front of us IS the kit.
  const [brandTokens, setBrandTokens] = useState<BrandTokens | null>(null);
  const [readingLogo, setReadingLogo] = useState(false);
  const [colorAuto, setColorAuto] = useState(false);

  const embInputRef = useRef<HTMLInputElement>(null);

  const updateStep = (id: number, field: 'time' | 'label', value: string) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };
  const removeStep = (id: number) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
    setCropStepId((cur) => (cur === id ? null : cur));
  };
  const addStep = () =>
    setSteps((prev) => [
      ...prev,
      { id: nextId++, time: '', label: 'New step', imageDataUrl: null, originalImageDataUrl: null },
    ]);

  const addBulk = () => {
    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    const added: ScheduleStep[] = lines.map((line) => {
      const [maybeTime, ...rest] = line.split('|');
      if (rest.length) {
        return {
          id: nextId++,
          time: maybeTime.trim(),
          label: rest.join('|').trim(),
          imageDataUrl: null,
          originalImageDataUrl: null,
        };
      }
      return { id: nextId++, time: '', label: line, imageDataUrl: null, originalImageDataUrl: null };
    });
    setSteps((prev) => [...prev, ...added]);
    setBulkText('');
  };

  /** A dropped picture is stored RAW as the original and shown raw straight
   *  away, then the crop editor opens on top of it. A teacher who cancels
   *  still has their picture; a teacher who crops gets the derived JPEG. */
  const handleStepImage = useCallback((id: number, file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      if (!url) return;
      setSteps((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, imageDataUrl: url, originalImageDataUrl: url, crop: undefined } : s
        )
      );
      setCropStepId(id);
    };
    reader.onerror = () => {
      console.error('Could not read that picture — try a different file.');
    };
    reader.readAsDataURL(file);
  }, []);

  const applyCrop = useCallback((id: number, dataUrl: string, crop: CropTransform) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, imageDataUrl: dataUrl, crop } : s)));
    setCropStepId(null);
  }, []);

  const handleEmblemFile = useCallback((file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => setEmblemDataUrl(e.target?.result as string);
    reader.onerror = () => {
      console.error('Could not read that emblem — try a different file.');
    };
    reader.readAsDataURL(file);

    // 🚨 A FAILED READ IS SILENT ON PURPOSE. The emblem still prints, the
    // sheet still uses the teacher's own colour, and nobody is shown an
    // error about a feature they never asked for.
    setReadingLogo(true);
    extractBrandKit(file)
      .then(({ kit }) => {
        setBrandTokens(kit.tokens);
        const accent = safeColor(kit.tokens.accent, '');
        if (accent) {
          setBorderColor(accent);
          setColorAuto(true);
        }
      })
      .catch((err) => {
        console.warn('Brand kit extraction skipped:', err);
      })
      .finally(() => setReadingLogo(false));
  }, []);

  const clearEmblem = () => {
    setEmblemDataUrl(null);
    setBrandTokens(null);
    setColorAuto(false);
  };

  /** The sheet's three colours. The teacher's colour input is the accent and
   *  always wins — the logo only ever PRE-FILLS it. */
  const theme: SheetTheme = useMemo(
    () => ({
      accent: safeColor(borderColor, DEFAULT_BORDER_COLOR),
      ink: safeColor(brandTokens?.ink, DEFAULT_INK),
      wash: safeColor(brandTokens?.wash, 'transparent'),
    }),
    [borderColor, brandTokens]
  );

  const showMasthead = Boolean(emblemDataUrl || className.trim());
  const sheetTitle = tx('dailySchedule.title');

  const handlePrint = () => {
    if (steps.length === 0) return;
    setGenerating(true);
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow pop-ups to use the print feature');
        setGenerating(false);
        return;
      }
      const html = generateDailySchedulePrintHTML(steps, {
        theme,
        emblemDataUrl,
        className,
        title: sheetTitle,
      });
      printWindow.document.write(html);
      printWindow.document.close();
    } catch (err) {
      console.error('Error generating print:', err);
      alert('Error generating print. Please try again.');
    }
    setGenerating(false);
  };

  const pageCount = Math.max(1, Math.ceil(steps.length / STEPS_PER_PAGE));
  const cropStep = cropStepId === null ? null : steps.find((s) => s.id === cropStepId) ?? null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      {/* Header */}
      <header className="bg-[#0D3330] text-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/montree/library/tools')} className="btn btn-ghost btn-icon btn-sm text-emerald-300">
              ←
            </button>
            <div>
              <h1 className="font-bold text-lg">{tx('dailySchedule.title')}</h1>
              <p className="text-emerald-200/80 text-xs mt-0.5">{tx('dailySchedule.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={handlePrint}
            disabled={steps.length === 0 || generating}
            className="btn btn-primary btn-sm"
          >
            {generating ? '⏳' : '🖨️'} {tx('dailySchedule.print')}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* Controls */}
        <div className="space-y-5">
          {/* Emblem + class name */}
          <section className="bg-white rounded-2xl border border-[#e3ede9] p-5 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wide text-[#8a9c98] mb-3">
              {tx('dailySchedule.emblemLabel')}
            </h2>
            <div
              onClick={() => embInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                handleEmblemFile(e.dataTransfer.files[0]);
              }}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                dragActive ? 'border-emerald-400 bg-emerald-50' : 'border-[#b9d9d1] bg-[#f6fbf9] hover:border-emerald-300'
              }`}
            >
              <div className="text-2xl mb-1 opacity-70">◈</div>
              <p className="text-xs font-semibold text-[#134640]">{tx('dailySchedule.emblemHint')}</p>
            </div>
            <input
              ref={embInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleEmblemFile(e.target.files?.[0])}
            />
            {emblemDataUrl && (
              <div className="flex items-center gap-3 mt-3 p-2.5 bg-[#f6fbf9] rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={emblemDataUrl} alt="" className="w-9 h-9 rounded-lg object-contain bg-white border border-white shadow" />
                <div className="flex-1 text-xs font-semibold text-[#134640]">
                  {readingLogo ? tx('dailySchedule.emblemReading') : tx('dailySchedule.emblemSet')}
                </div>
                <button
                  onClick={clearEmblem}
                  className="btn btn-secondary btn-sm"
                >
                  {tx('dailySchedule.remove')}
                </button>
              </div>
            )}

            <div className="mt-4">
              <label className="block text-xs font-bold uppercase tracking-wide text-[#8a9c98] mb-2">
                {tx('dailySchedule.classNameLabel')}
              </label>
              <input
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder={tx('dailySchedule.classNamePlaceholder')}
                maxLength={60}
                className="w-full px-3 py-2 rounded-lg border border-[#e3ede9] text-sm font-semibold text-[#1f2d2a] outline-none focus:border-emerald-400"
              />
              <p className="text-[11px] text-[#8a9c98] leading-relaxed mt-1.5">
                {tx('dailySchedule.classNameHint')}
              </p>
            </div>
          </section>

          {/* Card style */}
          <section className="bg-white rounded-2xl border border-[#e3ede9] p-5 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wide text-[#8a9c98] mb-3">
              {tx('dailySchedule.borderColor')}
            </h2>
            <div className="flex items-center gap-3 mb-3">
              <input
                type="color"
                value={theme.accent}
                onChange={(e) => { setBorderColor(e.target.value); setColorAuto(false); }}
                className="w-9 h-8 rounded-lg cursor-pointer border-none"
              />
              <input
                type="text"
                value={borderColor}
                onChange={(e) => { setBorderColor(e.target.value); setColorAuto(false); }}
                className="w-24 px-2 py-1.5 rounded-lg border border-[#e3ede9] text-xs font-mono"
              />
            </div>
            {colorAuto && (
              <p className="text-[11px] font-semibold text-emerald-700 leading-relaxed mb-1.5">
                {tx('dailySchedule.colorMatched')}
              </p>
            )}
            <p className="text-[11px] text-[#8a9c98] leading-relaxed">{tx('dailySchedule.borderHint')}</p>
          </section>

          {/* Steps */}
          <section className="bg-white rounded-2xl border border-[#e3ede9] p-5 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wide text-[#8a9c98] mb-3">
              {tx('dailySchedule.stepsLabel')}
            </h2>
            <div className="flex items-center justify-between mb-3 p-3 rounded-xl bg-gradient-to-br from-[#0D3330] to-[#134640] text-white">
              <div>
                <div className="text-2xl font-extrabold text-emerald-400">{steps.length}</div>
                <div className="text-[10px] uppercase tracking-wide text-emerald-200/70">{tx('dailySchedule.stepsCount')}</div>
              </div>
              <div className="text-[11px] text-emerald-200/70">{pageCount} × A4 · {STEPS_PER_PAGE} {tx('dailySchedule.pagesSummary')}</div>
              <button onClick={addStep} className="btn btn-primary btn-sm">
                {tx('dailySchedule.addStep')}
              </button>
            </div>

            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={tx('dailySchedule.bulkPlaceholder')}
              className="w-full min-h-[70px] p-2.5 rounded-lg border border-[#e3ede9] text-sm mb-2 resize-y"
            />
            <button
              onClick={addBulk}
              disabled={!bulkText.trim()}
              className="btn btn-gold btn-md on-light w-full mb-3"
            >
              {tx('dailySchedule.addBulk')}
            </button>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {steps.map((step, i) => (
                <StepRow
                  key={step.id}
                  index={i}
                  step={step}
                  onUpdate={updateStep}
                  onRemove={removeStep}
                  onImage={handleStepImage}
                  onAdjust={setCropStepId}
                  tx={tx}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-2xl border border-[#e3ede9] p-6 shadow-sm">
          {steps.length === 0 ? (
            <div className="text-center py-16 text-[#8a9c98] text-sm">{tx('dailySchedule.empty')}</div>
          ) : (
            <div className="space-y-6">
              {Array.from({ length: pageCount }).map((_, pageIdx) => (
                <SchedulePagePreview
                  key={pageIdx}
                  pageIndex={pageIdx}
                  pageCount={pageCount}
                  steps={steps.slice(pageIdx * STEPS_PER_PAGE, pageIdx * STEPS_PER_PAGE + STEPS_PER_PAGE)}
                  theme={theme}
                  showMasthead={pageIdx === 0 && showMasthead}
                  emblemDataUrl={pageIdx === 0 ? emblemDataUrl : null}
                  className={className}
                  title={sheetTitle}
                  tx={tx}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {cropStep && (cropStep.originalImageDataUrl || cropStep.imageDataUrl) && (
        <CropModal
          key={cropStep.id}
          step={cropStep}
          onCancel={() => setCropStepId(null)}
          onApply={applyCrop}
          tx={tx}
        />
      )}
    </div>
  );
}

function StepRow({
  index,
  step,
  onUpdate,
  onRemove,
  onImage,
  onAdjust,
  tx,
}: {
  index: number;
  step: ScheduleStep;
  onUpdate: (id: number, field: 'time' | 'label', value: string) => void;
  onRemove: (id: number) => void;
  onImage: (id: number, file: File | undefined) => void;
  onAdjust: (id: number) => void;
  tx: (key: string, fallback?: string) => string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-2.5 bg-[#fafcfb] border border-[#e3ede9] rounded-xl p-2">
      <span className="w-5 text-center text-[11px] font-extrabold text-[#8a9c98] shrink-0">{index + 1}</span>
      <div
        onClick={() => fileRef.current?.click()}
        className={`w-12 h-12 rounded-lg shrink-0 overflow-hidden cursor-pointer flex items-center justify-center bg-[#f6fbf9] ${
          step.imageDataUrl ? 'border border-[#e3ede9]' : 'border-2 border-dashed border-[#c8ddd6]'
        }`}
      >
        {step.imageDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={step.imageDataUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-lg opacity-40">🖼️</span>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onImage(step.id, e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <input
          value={step.label}
          onChange={(e) => onUpdate(step.id, 'label', e.target.value)}
          placeholder={tx('dailySchedule.stepNamePlaceholder')}
          className="w-full text-sm font-bold text-[#1f2d2a] bg-transparent border-b border-transparent focus:border-emerald-400 outline-none py-0.5"
        />
        <input
          value={step.time}
          onChange={(e) => onUpdate(step.id, 'time', e.target.value)}
          placeholder={tx('dailySchedule.timePlaceholder')}
          className="w-20 text-[11px] font-bold text-[#0D9488] bg-transparent outline-none"
        />
      </div>
      {(step.originalImageDataUrl || step.imageDataUrl) && (
        <button
          onClick={() => onAdjust(step.id)}
          title={tx('dailySchedule.adjust')}
          aria-label={tx('dailySchedule.adjust')}
          className="btn btn-ghost btn-icon btn-sm shrink-0 on-light"
        >
          ✂️
        </button>
      )}
      <button onClick={() => onRemove(step.id)} className="btn btn-danger btn-icon btn-sm shrink-0">
        ✕
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// THE CROP EDITOR
// ══════════════════════════════════════════════════════════════════════════

/** On-screen crop frame. Its ASPECT is the print slot's, exactly; only its
 *  pixel size is a UI choice. */
const FRAME_H = 320;
const FRAME_W = Math.round(FRAME_H * CROP_ASPECT);
const MAX_ZOOM = 4;
/** Long edge of the exported crop. Big enough for 300dpi at ~8cm, small
 *  enough that twenty steps do not blow up the page's memory. */
const CROP_OUT_MAX_PX = 1200;

function clampOffset(value: number, displayed: number, frame: number): number {
  // The frame must always be fully covered: the image's left/top edge can
  // never come right of / below the frame's, and its right/bottom edge can
  // never come left of / above the frame's.
  const min = Math.min(0, frame - displayed);
  return Math.min(0, Math.max(min, value));
}

function CropModal({
  step,
  onCancel,
  onApply,
  tx,
}: {
  step: ScheduleStep;
  onCancel: () => void;
  onApply: (id: number, dataUrl: string, crop: CropTransform) => void;
  tx: (key: string, fallback?: string) => string;
}) {
  const src = step.originalImageDataUrl || step.imageDataUrl || '';
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const [scale, setScale] = useState(step.crop?.scale ?? 1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  // Decode once, then everything below is arithmetic on the natural size.
  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.onload = () => {
      if (!alive) return;
      imgRef.current = img;
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (!w || !h) {
        setFailed(true);
        return;
      }
      const base = Math.max(FRAME_W / w, FRAME_H / h);
      const s = step.crop?.scale ?? 1;
      const dispW = w * base * s;
      const dispH = h * base * s;
      const start = step.crop
        ? { x: -step.crop.x * dispW, y: -step.crop.y * dispH }
        : { x: (FRAME_W - dispW) / 2, y: (FRAME_H - dispH) / 2 };
      setNat({ w, h });
      setOffset({
        x: clampOffset(start.x, dispW, FRAME_W),
        y: clampOffset(start.y, dispH, FRAME_H),
      });
    };
    img.onerror = () => {
      if (alive) setFailed(true);
    };
    img.src = src;
    return () => {
      alive = false;
    };
    // `step.crop` is the seed for the initial view only — re-seeding on every
    // change would fight the drag handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const base = nat ? Math.max(FRAME_W / nat.w, FRAME_H / nat.h) : 1;
  const dispW = nat ? nat.w * base * scale : FRAME_W;
  const dispH = nat ? nat.h * base * scale : FRAME_H;

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!nat) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || !nat) return;
    e.preventDefault();
    setOffset({
      x: clampOffset(d.ox + (e.clientX - d.px), dispW, FRAME_W),
      y: clampOffset(d.oy + (e.clientY - d.py), dispH, FRAME_H),
    });
  };
  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* the pointer was already released — nothing to undo */
    }
  };

  /** Zoom about the frame's centre, so the thing the teacher is looking at
   *  stays where they are looking. */
  const changeScale = (next: number) => {
    if (!nat) {
      setScale(next);
      return;
    }
    const centreFracX = (-offset.x + FRAME_W / 2) / dispW;
    const centreFracY = (-offset.y + FRAME_H / 2) / dispH;
    const newW = nat.w * base * next;
    const newH = nat.h * base * next;
    setScale(next);
    setOffset({
      x: clampOffset(FRAME_W / 2 - centreFracX * newW, newW, FRAME_W),
      y: clampOffset(FRAME_H / 2 - centreFracY * newH, newH, FRAME_H),
    });
  };

  const reset = () => {
    if (!nat) return;
    const newW = nat.w * base;
    const newH = nat.h * base;
    setScale(1);
    setOffset({ x: (FRAME_W - newW) / 2, y: (FRAME_H - newH) / 2 });
  };

  const apply = () => {
    const img = imgRef.current;
    if (!img || !nat) return;

    // The visible frame, expressed back in the ORIGINAL image's pixels.
    const fx = Math.min(1, Math.max(0, -offset.x / dispW));
    const fy = Math.min(1, Math.max(0, -offset.y / dispH));
    let srcW = nat.w * (FRAME_W / dispW);
    let srcH = nat.h * (FRAME_H / dispH);
    let srcX = fx * nat.w;
    let srcY = fy * nat.h;
    srcW = Math.min(srcW, nat.w);
    srcH = Math.min(srcH, nat.h);
    srcX = Math.min(srcX, Math.max(0, nat.w - srcW));
    srcY = Math.min(srcY, Math.max(0, nat.h - srcH));

    // Never upscale past the source, never exceed the export cap.
    const longSrc = Math.max(srcW, srcH);
    const outLong = Math.max(320, Math.min(CROP_OUT_MAX_PX, Math.round(longSrc)));
    const outW = CROP_ASPECT >= 1 ? outLong : Math.max(1, Math.round(outLong * CROP_ASPECT));
    const outH = CROP_ASPECT >= 1 ? Math.max(1, Math.round(outLong / CROP_ASPECT)) : outLong;

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Flattened on white: a transparent PNG printed straight would come out
    // black-backed on some drivers.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outW, outH);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH);

    onApply(step.id, canvas.toDataURL('image/jpeg', 0.9), { x: fx, y: fy, scale });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#04140f]/70"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-extrabold text-[#0D3330]">{tx('dailySchedule.cropTitle')}</h3>
        <p className="text-[11px] text-[#8a9c98] mt-1 mb-3 leading-relaxed">
          {tx('dailySchedule.cropHint')}
        </p>

        <div className="flex justify-center">
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className="relative overflow-hidden rounded-xl bg-[#f4f8f7] border border-[#e3ede9] select-none"
            style={{ width: FRAME_W, height: FRAME_H, touchAction: 'none', cursor: nat ? 'grab' : 'default' }}
          >
            {nat && !failed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt=""
                draggable={false}
                className="absolute max-w-none pointer-events-none"
                style={{ left: offset.x, top: offset.y, width: dispW, height: dispH }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl opacity-30">
                {failed ? '⚠️' : '🖼️'}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <span className="text-[11px] font-bold uppercase tracking-wide text-[#8a9c98] shrink-0">
            {tx('dailySchedule.zoom')}
          </span>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={scale}
            disabled={!nat || failed}
            onChange={(e) => changeScale(Number(e.target.value))}
            className="flex-1 accent-emerald-600"
            aria-label={tx('dailySchedule.zoom')}
          />
          <button onClick={reset} disabled={!nat || failed} className="btn btn-ghost btn-sm on-light shrink-0">
            {tx('dailySchedule.reset')}
          </button>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onCancel} className="btn btn-secondary btn-sm on-light">
            {tx('dailySchedule.cancel')}
          </button>
          <button onClick={apply} disabled={!nat || failed} className="btn btn-primary btn-sm">
            {tx('dailySchedule.apply')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// THE PREVIEW — the same sheet, at 1:N
// ══════════════════════════════════════════════════════════════════════════

function SchedulePagePreview({
  pageIndex,
  pageCount,
  steps,
  theme,
  showMasthead,
  emblemDataUrl,
  className,
  title,
  tx,
}: {
  pageIndex: number;
  pageCount: number;
  steps: ScheduleStep[];
  theme: SheetTheme;
  showMasthead: boolean;
  emblemDataUrl: string | null;
  className: string;
  title: string;
  tx: (key: string, fallback?: string) => string;
}) {
  const room = className.trim();
  const textAreaHeightCm = showMasthead ? TEXT_AREA_H_MASTHEAD_CM : TEXT_AREA_H_CM;

  // 🚨 THE PREVIEW IS A CONTAINER QUERY CONTEXT, and every size below is in
  // `cqw` — 1cqw is 1% of the preview's width, i.e. 1% of 21cm of paper. That
  // is what makes this WYSIWYG at any preview size instead of "a few Tailwind
  // sizes that look about right".
  const pageStyle = {
    width: '100%',
    maxWidth: 480,
    aspectRatio: '21 / 29.7',
    containerType: 'inline-size',
    fontFamily: KID_FONT_STACK,
  } as CSSProperties;

  return (
    <div>
      <div className="text-[11px] font-semibold text-[#8a9c98] mb-1.5">
        {tx('dailySchedule.page', 'Page')} {pageIndex + 1} {tx('dailySchedule.of', 'of')} {pageCount}
      </div>
      <div
        className="relative mx-auto bg-white rounded shadow-[0_20px_60px_rgba(13,51,48,0.18)] overflow-hidden"
        style={pageStyle}
      >
        <div
          className="grid h-full"
          style={{
            gridTemplateRows: showMasthead
              ? `${cmToCqw(MASTHEAD_H_CM)}cqw repeat(${STEPS_PER_PAGE}, 1fr)`
              : `repeat(${STEPS_PER_PAGE}, 1fr)`,
            gap: 0,
          }}
        >
          {showMasthead && (
            <div
              className="flex items-center overflow-hidden"
              style={{
                background: theme.wash,
                gap: `${cmToCqw(0.6)}cqw`,
                padding: `0 ${cmToCqw(0.8)}cqw`,
                borderBottom: `${cmToCqw(0.08)}cqw solid ${theme.accent}`,
              }}
            >
              {emblemDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={emblemDataUrl}
                  alt=""
                  className="block shrink-0 object-contain"
                  style={{ height: `${cmToCqw(MASTHEAD_EMBLEM_H_CM)}cqw`, width: 'auto', maxWidth: `${cmToCqw(5.5)}cqw` }}
                />
              )}
              <div className="min-w-0">
                <div
                  className="font-bold leading-none"
                  style={{ fontSize: `${ptToCqw(24)}cqw`, color: theme.ink, lineHeight: 1.05 }}
                >
                  {title}
                </div>
                {room && (
                  <div
                    className="font-bold uppercase truncate"
                    style={{
                      fontSize: `${ptToCqw(11)}cqw`,
                      letterSpacing: '0.18em',
                      color: theme.accent,
                      marginTop: `${cmToCqw(0.12)}cqw`,
                    }}
                  >
                    {room}
                  </div>
                )}
              </div>
            </div>
          )}

          {Array.from({ length: STEPS_PER_PAGE }).map((_, i) => {
            const step = steps[i];
            if (!step) return <div key={`empty-${i}`} />;
            const fontPt = adaptiveStepFontSize(step.label || ' ', TEXT_AREA_W_CM, textAreaHeightCm);
            return (
              <div key={step.id} style={{ background: theme.accent, padding: `${cmToCqw(CARD_PAD_CM)}cqw` }}>
                <div
                  className="bg-white h-full flex overflow-hidden"
                  style={{ borderRadius: `${cmToCqw(CARD_RADIUS_CM)}cqw` }}
                >
                  <div
                    className="flex items-center justify-center shrink-0 bg-[#f4f8f7] border-r border-[#e3ede9]"
                    style={{ width: `${IMAGE_COL_RATIO * 100}%` }}
                  >
                    {step.imageDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={step.imageDataUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span style={{ fontSize: `${ptToCqw(40)}cqw`, opacity: 0.25 }}>🖼️</span>
                    )}
                  </div>
                  <div
                    className="flex-1 min-w-0 flex flex-col justify-center"
                    style={{ padding: `${cmToCqw(TEXT_PAD_Y_CM)}cqw ${cmToCqw(TEXT_PAD_X_CM)}cqw` }}
                  >
                    {step.time && (
                      <div
                        className="font-extrabold uppercase"
                        style={{
                          fontSize: `${ptToCqw(TIME_PT)}cqw`,
                          letterSpacing: '0.03em',
                          color: theme.accent,
                          marginBottom: `${cmToCqw(TIME_GAP_CM)}cqw`,
                        }}
                      >
                        {step.time}
                      </div>
                    )}
                    <div
                      className="font-extrabold break-words"
                      style={{
                        fontSize: `${ptToCqw(fontPt)}cqw`,
                        color: theme.ink,
                        lineHeight: 1.08,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {step.label}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
