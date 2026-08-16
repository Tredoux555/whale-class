// /montree/library/tools/daily-schedule/page.tsx
// Printable Daily Schedule — a wall poster, not a compact sheet. Each step
// (e.g. "Circle Time") prints as its own card at exactly 1/3 of an A4 page,
// picture + big label, using the same touching-edge colour-bordered card
// pattern as the 3-part card generator and label maker: the border colour
// fills the whole cell as a background, a white inner box sits inset inside
// it, and cards sit in a zero-gap grid so the coloured frame reads as one
// continuous band with no stroke line and no gap between cards.
'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n, type TranslationKey } from '@/lib/montree/i18n';
import { escapeHtml, sanitizeImageUrl } from '@/lib/sanitize';

interface ScheduleStep {
  id: number;
  time: string;
  label: string;
  imageDataUrl: string | null;
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
  'dailySchedule.emblemHint': 'Drop your emblem here, or click to upload — it prints as a small badge on page one.',
  'dailySchedule.emblemSet': 'Emblem set — every page carries it now.',
  'dailySchedule.remove': 'Remove',
  'dailySchedule.borderColor': 'Border colour',
  'dailySchedule.borderHint': 'Same touching-edge, colour-framed card as your 3-part cards and labels.',
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
  'dailySchedule.empty': 'Add a step to see your schedule build up here.',
};

const DEFAULT_BORDER_COLOR = '#0D9488';
const A4_WIDTH_CM = 21;
const A4_HEIGHT_CM = 29.7;
const STEPS_PER_PAGE = 3;
const CARD_PAD_CM = 0.35;
const CARD_RADIUS_CM = 0.35;
const BASE_LABEL_PT = 30;
const MIN_LABEL_PT = 14;

let nextId = 1;

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

/** Build the printable A4 HTML document — 3 steps per page, each step a
 *  full-width card exactly 1/3 of the page tall. Same window.open() +
 *  document.write() approach the 3-part card generator and label maker
 *  use, rather than in-page @media print (more reliable across browsers). */
function generateDailySchedulePrintHTML(
  steps: ScheduleStep[],
  borderColor: string,
  emblemDataUrl: string | null
): string {
  const textAreaWidthCm = A4_WIDTH_CM * 0.62 - 1.6; // right ~62% of card minus padding
  const textAreaHeightCm = A4_HEIGHT_CM / STEPS_PER_PAGE - CARD_PAD_CM * 2 - 1.2;

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Daily Schedule - Print</title>
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: white; }

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
    .page:last-child { page-break-after: auto; }

    .slot-card {
      background: ${borderColor};
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
      width: 38%;
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
      padding: 0.7cm 0.9cm;
      min-width: 0;
    }
    .slot-time {
      font-size: 11pt;
      font-weight: 800;
      color: ${borderColor};
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin-bottom: 0.15cm;
    }
    .slot-label {
      font-weight: 800;
      color: #0D3330;
      line-height: 1.08;
      word-wrap: break-word;
      overflow-wrap: anywhere;
    }

    .page-emblem-badge {
      position: absolute;
      top: 0.4cm;
      left: 0.4cm;
      width: 1.8cm;
      height: 1.8cm;
      border-radius: 50%;
      overflow: hidden;
      background: #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.18);
      border: 2px solid #fff;
      z-index: 5;
    }
    .page-emblem-badge img { width: 100%; height: 100%; object-fit: cover; }

    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      body { margin: 0; padding: 0; }
      .slot-card { background: ${borderColor} !important; }
    }

    @media screen {
      body { padding: 20px; background: #f0f0f0; }
      .page { background: white; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    }
  </style>
</head>
<body>
`;

  const safeEmblem = emblemDataUrl ? sanitizeImageUrl(emblemDataUrl) : '';

  for (let i = 0; i < steps.length; i += STEPS_PER_PAGE) {
    const pageSteps = steps.slice(i, i + STEPS_PER_PAGE);
    const isFirstPage = i === 0;

    html += `<div class="page">`;
    if (isFirstPage && safeEmblem) {
      html += `<div class="page-emblem-badge"><img src="${safeEmblem}" alt=""></div>`;
    }
    for (const step of pageSteps) {
      const fontPt = adaptiveStepFontSize(step.label || ' ', textAreaWidthCm, textAreaHeightCm);
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
    { id: nextId++, time: '7:45', label: 'Welcome & Free Choice', imageDataUrl: null },
    { id: nextId++, time: '9:00', label: 'Circle Time', imageDataUrl: null },
    { id: nextId++, time: '9:30', label: 'Work Cycle', imageDataUrl: null },
  ]);
  const [borderColor, setBorderColor] = useState(DEFAULT_BORDER_COLOR);
  const [emblemDataUrl, setEmblemDataUrl] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [generating, setGenerating] = useState(false);
  const embInputRef = useRef<HTMLInputElement>(null);

  const updateStep = (id: number, field: 'time' | 'label', value: string) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };
  const removeStep = (id: number) => setSteps((prev) => prev.filter((s) => s.id !== id));
  const addStep = () => setSteps((prev) => [...prev, { id: nextId++, time: '', label: 'New step', imageDataUrl: null }]);

  const addBulk = () => {
    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    const added: ScheduleStep[] = lines.map((line) => {
      const [maybeTime, ...rest] = line.split('|');
      if (rest.length) {
        return { id: nextId++, time: maybeTime.trim(), label: rest.join('|').trim(), imageDataUrl: null };
      }
      return { id: nextId++, time: '', label: line, imageDataUrl: null };
    });
    setSteps((prev) => [...prev, ...added]);
    setBulkText('');
  };

  const handleStepImage = useCallback((id: number, file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, imageDataUrl: url } : s)));
    };
    reader.readAsDataURL(file);
  }, []);

  const handleEmblemFile = useCallback((file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => setEmblemDataUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

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
      const html = generateDailySchedulePrintHTML(steps, borderColor, emblemDataUrl);
      printWindow.document.write(html);
      printWindow.document.close();
    } catch (err) {
      console.error('Error generating print:', err);
      alert('Error generating print. Please try again.');
    }
    setGenerating(false);
  };

  const pageCount = Math.max(1, Math.ceil(steps.length / STEPS_PER_PAGE));

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
          {/* Emblem */}
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
                <img src={emblemDataUrl} alt="" className="w-9 h-9 rounded-lg object-cover border border-white shadow" />
                <div className="flex-1 text-xs font-semibold text-[#134640]">{tx('dailySchedule.emblemSet')}</div>
                <button
                  onClick={() => setEmblemDataUrl(null)}
                  className="btn btn-secondary btn-sm"
                >
                  {tx('dailySchedule.remove')}
                </button>
              </div>
            )}
          </section>

          {/* Card style */}
          <section className="bg-white rounded-2xl border border-[#e3ede9] p-5 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wide text-[#8a9c98] mb-3">
              {tx('dailySchedule.borderColor')}
            </h2>
            <div className="flex items-center gap-3 mb-3">
              <input
                type="color"
                value={borderColor}
                onChange={(e) => setBorderColor(e.target.value)}
                className="w-9 h-8 rounded-lg cursor-pointer border-none"
              />
              <input
                type="text"
                value={borderColor}
                onChange={(e) => setBorderColor(e.target.value)}
                className="w-24 px-2 py-1.5 rounded-lg border border-[#e3ede9] text-xs font-mono"
              />
            </div>
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
                  borderColor={borderColor}
                  emblemDataUrl={pageIdx === 0 ? emblemDataUrl : null}
                  tx={tx}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StepRow({
  index,
  step,
  onUpdate,
  onRemove,
  onImage,
  tx,
}: {
  index: number;
  step: ScheduleStep;
  onUpdate: (id: number, field: 'time' | 'label', value: string) => void;
  onRemove: (id: number) => void;
  onImage: (id: number, file: File | undefined) => void;
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
        onChange={(e) => onImage(step.id, e.target.files?.[0])}
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
      <button onClick={() => onRemove(step.id)} className="btn btn-danger btn-icon btn-sm shrink-0">
        ✕
      </button>
    </div>
  );
}

function SchedulePagePreview({
  pageIndex,
  pageCount,
  steps,
  borderColor,
  emblemDataUrl,
  tx,
}: {
  pageIndex: number;
  pageCount: number;
  steps: ScheduleStep[];
  borderColor: string;
  emblemDataUrl: string | null;
  tx: (key: string, fallback?: string) => string;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-[#8a9c98] mb-1.5">
        Page {pageIndex + 1} of {pageCount}
      </div>
      <div
        className="relative mx-auto bg-white rounded shadow-[0_20px_60px_rgba(13,51,48,0.18)] overflow-hidden"
        style={{ width: '100%', maxWidth: 480, aspectRatio: '21 / 29.7' }}
      >
        {emblemDataUrl && (
          <div className="absolute z-10 rounded-full overflow-hidden bg-white shadow" style={{ top: '2.5%', left: '2.5%', width: '9%', aspectRatio: '1' }}>
            <img src={emblemDataUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="grid h-full" style={{ gridTemplateRows: `repeat(${STEPS_PER_PAGE}, 1fr)`, gap: 0 }}>
          {Array.from({ length: STEPS_PER_PAGE }).map((_, i) => {
            const step = steps[i];
            if (!step) return <div key={i} />;
            return (
              <div key={step.id} style={{ background: borderColor, padding: '1.6%' }}>
                <div className="bg-white rounded h-full flex overflow-hidden">
                  <div className="flex items-center justify-center shrink-0 bg-[#f4f8f7] border-r border-[#e3ede9]" style={{ width: '38%' }}>
                    {step.imageDataUrl ? (
                      <img src={step.imageDataUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl opacity-25">🖼️</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center px-3">
                    {step.time && (
                      <div className="text-[9px] font-extrabold uppercase tracking-wide" style={{ color: borderColor }}>
                        {step.time}
                      </div>
                    )}
                    <div className="text-lg font-extrabold text-[#0D3330] leading-tight break-words">
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
