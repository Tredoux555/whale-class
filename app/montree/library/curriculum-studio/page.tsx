// /montree/library/curriculum-studio/page.tsx
// Curriculum Studio — pick a week, drop pictures, preview + print every material.
// PUBLIC (unauthenticated) by design. All rendering flows through the shared
// render engine (lib/montree/english-curriculum/render) — ZERO render logic here.
'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildMaterial, buildAssetMap, assetGapReport, MATERIAL_TYPES, materialTypesForSpec,
  type AssetMap, type MaterialType,
} from '@/lib/montree/english-curriculum/render';
import {
  getWeek, WEEK_META, INTRO_WEEK_META, isIntroWeek, weekToLessonMap,
  getDarkPhonicsForWeek, type WeekSpec,
} from '@/lib/montree/english-curriculum/spec';

interface DroppedFile { name: string; url: string; }

const FOREST_BG = '#06140e';

// ── The full 58-week strip metadata ──────────────────────────────────────
// Level 1 (W1–26) comes from WEEK_META (the locked spine). Levels 2–3 (W27–58)
// are inlined below as STATIC display metadata derived from the week-NN.json
// specs — label = spec.patternDisplay, hero word = spec.newWords[0] ?? anchorWord
// (W50, the review week, has no newWords → falls back to its "sheep" anchor).
// The full spec still lazy-loads only when a week is selected; this array is
// pure metadata so the strip renders instantly without importing 58 JSONs.
interface StripItem {
  week: number;
  level: 1 | 2 | 3;
  label: string;      // chip headline (letter / pattern)
  word: string;       // hero word beneath the label
  milestone?: string; // celebration emoji marker
  vowelLights?: boolean;
}

// Spine-event milestone markers layered on top of Level 1's own 🎉 celebrations.
const MILESTONES: Record<number, string> = {
  38: '🎂', // Snake's name-day
  42: '🎉', // Level 2 finale
  44: '🎂', // Sheep's name-day
  53: '💯', // word #1,000
  58: '👑', // graduation
};

// Level 2 / 3 static display metadata (W27–58). Derived once from the specs.
const L2_L3_META: { week: number; level: 2 | 3; label: string; word: string }[] = [
  { week: 27, level: 2, label: 'sh', word: 'ship' },
  { week: 28, level: 2, label: 'ch', word: 'chin' },
  { week: 29, level: 2, label: 'th', word: 'this' },
  { week: 30, level: 2, label: 'ck ff ll ss zz', word: 'bell' },
  { week: 31, level: 2, label: 'ng', word: 'sing' },
  { week: 32, level: 2, label: 'wh', word: 'whip' },
  { week: 33, level: 2, label: 'st sp sn sm sw sc sk', word: 'stop' },
  { week: 34, level: 2, label: 'bl cl fl gl pl sl', word: 'flag' },
  { week: 35, level: 2, label: 'br cr dr fr gr pr tr', word: 'frog' },
  { week: 36, level: 2, label: '-nd -nt -mp -st', word: 'hand' },
  { week: 37, level: 2, label: '-nk -ft -lt -lp -lk', word: 'pink' },
  { week: 38, level: 2, label: 'a_e', word: 'cake' },
  { week: 39, level: 2, label: 'i_e', word: 'bike' },
  { week: 40, level: 2, label: 'o_e', word: 'home' },
  { week: 41, level: 2, label: 'u_e', word: 'cube' },
  { week: 42, level: 2, label: 'soft c/g · tch/dge', word: 'ice' },
  { week: 43, level: 3, label: 'ai / ay', word: 'rain' },
  { week: 44, level: 3, label: 'ee / ea', word: 'see' },
  { week: 45, level: 3, label: 'oa / ow', word: 'boat' },
  { week: 46, level: 3, label: 'igh / ie', word: 'night' },
  { week: 47, level: 3, label: 'ar', word: 'star' },
  { week: 48, level: 3, label: 'or / ore', word: 'corn' },
  { week: 49, level: 3, label: 'er / ir / ur', word: 'her' },
  { week: 50, level: 3, label: '🔁 minimal pairs', word: 'sheep' },
  { week: 51, level: 3, label: 'oo', word: 'moon' },
  { week: 52, level: 3, label: 'ou / ow', word: 'out' },
  { week: 53, level: 3, label: 'oi / oy', word: 'coin' },
  { week: 54, level: 3, label: 'ew / ue / au / aw', word: 'new' },
  { week: 55, level: 3, label: 'y (as a vowel)', word: 'my' },
  { week: 56, level: 3, label: 'kn / wr / mb', word: 'knee' },
  { week: 57, level: 3, label: '-ing / -ed / -s / -es', word: 'jumping' },
  { week: 58, level: 3, label: '-tion', word: 'action' },
];

const STRIP: StripItem[] = [
  ...WEEK_META.map((m): StripItem => ({
    week: m.week,
    level: 1,
    label: m.letterDisplay,
    word: m.anchorWord,
    milestone: MILESTONES[m.week] ?? (m.celebration ? '🎉' : undefined),
    vowelLights: !!m.vowelLights,
  })),
  ...L2_L3_META.map((m): StripItem => ({
    week: m.week,
    level: m.level,
    label: m.label,
    word: m.word,
    milestone: MILESTONES[m.week],
  })),
];

// Grace & Courtesy Intro Weeks — rendered FIRST, before Level 1. Sourced from
// INTRO_WEEK_META (spec/index.ts); their sentinel week numbers never show (the
// chips use the friendly label + word, the summary uses displayName).
const INTRO_STRIP: StripItem[] = INTRO_WEEK_META.map((m): StripItem => ({
  week: m.week,
  level: 1,
  label: m.label,
  word: m.word,
  milestone: '🌱',
}));

const LEVEL_SECTIONS: { title: string; items: StripItem[] }[] = [
  { title: 'Intro · Grace & Courtesy', items: INTRO_STRIP },
  { title: 'Level 1 · Sounds', items: STRIP.filter((s) => s.level === 1) },
  { title: 'Level 2 · Patterns', items: STRIP.filter((s) => s.level === 2) },
  { title: 'Level 3 · Reading', items: STRIP.filter((s) => s.level === 3) },
];

/** Chip headline font size — shrinks for the longer Level 2/3 pattern strings. */
function labelClass(label: string): string {
  const len = label.length;
  if (len <= 3) return 'text-lg';
  if (len <= 6) return 'text-sm';
  if (len <= 12) return 'text-[11px]';
  return 'text-[9px]';
}

// ── Full-pack CSS scoping ────────────────────────────────────────────────
// The ten builders each emit generic class names (.page, .grid, .card, .top…)
// with DIFFERENT meanings. To combine them into one print document we scope
// every material's stylesheet under a unique wrapper class. The CSS these
// builders produce is a controlled subset (class rules + @page/@font-face/@media),
// so a small brace-aware transformer is safe here.

/** Split a CSS string into top-level rules (brace-depth aware). */
function splitCssRules(css: string): string[] {
  const rules: string[] = [];
  let depth = 0;
  let buf = '';
  for (const ch of css) {
    buf += ch;
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { rules.push(buf.trim()); buf = ''; } }
  }
  if (buf.trim()) rules.push(buf.trim());
  return rules;
}

/** Prefix each selector in a comma list with the scope (html/body → the wrapper). */
function scopeSelectorList(selList: string, scope: string): string {
  return selList.split(',').map((raw) => {
    const s = raw.trim();
    if (!s) return s;
    if (s === '*') return `${scope} *`;
    if (/^(html|body)$/i.test(s)) return scope;
    if (/^(html|body)\b/i.test(s)) return s.replace(/^(html|body)\b/i, scope);
    return `${scope} ${s}`;
  }).join(',');
}

/**
 * Scope a material stylesheet under `scope`. @font-face rules are hoisted into
 * `fonts` (emitted once, globally); @page is dropped (one global A4 @page wins);
 * @media recurses; everything else gets the scope prefix.
 */
function scopeCss(css: string, scope: string, fonts: Set<string>): string {
  let out = '';
  for (const rule of splitCssRules(css)) {
    const m = rule.match(/^([^{]*)\{([\s\S]*)\}$/);
    if (!m) continue;
    const head = m[1].trim();
    const inner = m[2];
    if (/^@font-face/i.test(head)) { fonts.add(rule); continue; }
    if (/^@page/i.test(head)) continue;
    if (/^@media/i.test(head)) { out += `${head}{${scopeCss(inner, scope, fonts)}}`; continue; }
    if (/^@(keyframes|supports|font-feature-values)/i.test(head)) { out += rule; continue; }
    out += `${scopeSelectorList(head, scope)}{${inner}}`;
  }
  return out;
}

export default function CurriculumStudioPage() {
  // Always start on week 1 for BOTH the server render and the first client render.
  // Reading localStorage in this initializer would make the client's first render
  // (the saved week) disagree with the server's HTML (always week 1) → React
  // hydration mismatch. The saved week is restored right after mount instead (below).
  const [week, setWeek] = useState<number>(1);
  const [spec, setSpec] = useState<WeekSpec | null>(null);
  const [specLoading, setSpecLoading] = useState(true);
  const [priorSpecs, setPriorSpecs] = useState<WeekSpec[]>([]);
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [previewType, setPreviewType] = useState<MaterialType | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [assetsExpanded, setAssetsExpanded] = useState(false);
  const [expandedLyrics, setExpandedLyrics] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pick the initial week AFTER mount: a ?week= deep-link wins, else the saved
  // week. Reading window.location / localStorage here (an effect) — not in the
  // useState initializer — keeps the first client render identical to the server
  // render (always week 1), so hydration matches; the real week is applied one
  // tick later without a visible flash before the spec finishes loading.
  useEffect(() => {
    try {
      const param = new URLSearchParams(window.location.search).get('week');
      const asked = param ? parseInt(param, 10) : NaN;
      if ((asked >= 1 && asked <= 58) || isIntroWeek(asked)) { setWeek(asked); return; }
      const saved = parseInt(localStorage.getItem('curriculumStudioWeek') || '', 10);
      if ((saved >= 1 && saved <= 58) || isIntroWeek(saved)) setWeek(saved);
    } catch { /* ignore */ }
  }, []);

  // Load the authored spec for the selected week.
  useEffect(() => {
    let alive = true;
    setSpecLoading(true);
    setSpec(null);
    setPreviewType(null);
    setWarnings([]);
    setAssetsExpanded(false);
    setExpandedLyrics(new Set());
    getWeek(week).then((w) => {
      if (!alive) return;
      setSpec(w);
      setSpecLoading(false);
    });
    try { localStorage.setItem('curriculumStudioWeek', String(week)); } catch { /* ignore */ }
    return () => { alive = false; };
  }, [week]);

  // Load earlier weeks' specs so the gap panel can flag reused ("copy in") images.
  // Intro Weeks (sentinel numbers 101/102) have no "prior" phonics weeks — skip
  // the load entirely, else `week - 1` would fan out ~100 getWeek() calls.
  useEffect(() => {
    let alive = true;
    // Intro Weeks (sentinel 101/102) resolve to no priors — Promise.resolve keeps
    // the setState async (no synchronous-setState-in-effect) AND skips the ~100
    // getWeek() fan-out that `week - 1` would otherwise trigger.
    const load = isIntroWeek(week)
      ? Promise.resolve<(WeekSpec | null)[]>([])
      : Promise.all(Array.from({ length: Math.max(0, week - 1) }, (_, i) => getWeek(i + 1)));
    load.then((ws) => { if (alive) setPriorSpecs(ws.filter((w): w is WeekSpec => !!w)); });
    return () => { alive = false; };
  }, [week]);

  // AssetMap = published images for THIS week, layered on top of published
  // images CARRIED FORWARD from every earlier week (spec.imageUrls only holds
  // what that week's own images/ folder published — a reused cast image like
  // cat.png or potato.png is published once, under its ORIGIN week, and every
  // later week's manifest just re-lists the same filename). Without the
  // earlier-week layer, every week after the character's debut shows a false
  // "missing" placeholder even though the art exists and is live. Order (later
  // wins): earlier weeks (oldest first) -> this week's own -> locally dropped
  // files. imageUrls keys are filename stems ("chair", "chair-coloring") that
  // round-trip through parseAssetFilename identically to the original
  // filenames, so the same normalisation applies to all three layers.
  const assets: AssetMap = useMemo(() => {
    const priorPublished: DroppedFile[] = priorSpecs.flatMap((ps) =>
      ps?.imageUrls ? Object.entries(ps.imageUrls).map(([name, url]) => ({ name, url })) : [],
    );
    const published: DroppedFile[] = spec?.imageUrls
      ? Object.entries(spec.imageUrls).map(([name, url]) => ({ name, url }))
      : [];
    return buildAssetMap([...priorPublished, ...published, ...files]);
  }, [spec, priorSpecs, files]);
  const gap = useMemo(() => (spec ? assetGapReport(spec, assets, priorSpecs) : { missing: [] }), [spec, assets, priorSpecs]);
  const missingFiles = useMemo(() => new Set(gap.missing.map((m) => m.file)), [gap]);
  const earlierWeekByFile = useMemo(
    () => new Map(gap.missing.filter((m) => m.fromEarlierWeek).map((m) => [m.file, m.fromEarlierWeek as number])),
    [gap],
  );

  // The material catalogue that applies to THIS week: phonics weeks get the full
  // grid; Grace & Courtesy Intro Weeks get the curated set (rule flashcards, the
  // Class Rules poster, colouring, song QR). Drives the grid, previews + full pack.
  const materialList = useMemo(() => (spec ? materialTypesForSpec(spec) : MATERIAL_TYPES), [spec]);

  // The Dark Phonics film for this week (if the week maps to a lesson with a
  // published video). Plays FIRST in the songs area, before the curriculum songs.
  const darkPhonics = useMemo(() => getDarkPhonicsForWeek(week), [week]);

  // The Dark Phonics flashcard payload for THIS week (if the week maps to a
  // lesson). The front image loads from the public `dark-phonics` bucket via the
  // media proxy — the SAME proxy pattern as the baked videoUrls
  // (pictures/lesson-NN.png). Only the dark_phonics_card builder reads this, and
  // preview/print feed it in below; it never enters the full-pack print.
  const darkPhonicsCardOpts = useMemo(
    () =>
      darkPhonics
        ? {
            lesson: darkPhonics.lesson,
            sound: darkPhonics.sound,
            title: darkPhonics.title,
            imageUrl: `https://montree.xyz/api/montree/media/proxy/pictures/${darkPhonics.image}?bucket=dark-phonics`,
          }
        : null,
    [darkPhonics],
  );

  const meta = WEEK_META.find((m) => m.week === week);

  // Spine summary source. Prefer the loaded spec (every field is present for all
  // 58 weeks); fall back to WEEK_META so Level 1 shows instantly while its spec
  // loads. WEEK_META only covers W1–26, so Level 2/3 relies on the spec.
  const summary = spec
    ? {
        week: spec.week,
        letterDisplay: spec.letterDisplay,
        sound: spec.sound,
        anchorWord: spec.anchorWord,
        vowelLights: spec.vowelLights,
        castIntro: spec.cast?.introduces ?? null,
        celebration: spec.celebration,
      }
    : meta
    ? {
        week: meta.week,
        letterDisplay: meta.letterDisplay,
        sound: meta.sound,
        anchorWord: meta.anchorWord,
        vowelLights: meta.vowelLights,
        castIntro: meta.castIntro,
        celebration: meta.celebration,
      }
    : null;

  const addFiles = useCallback((list: FileList | File[]) => {
    const next: DroppedFile[] = [];
    for (const f of Array.from(list)) {
      if (!f.type.startsWith('image/')) continue;
      next.push({ name: f.name, url: URL.createObjectURL(f) });
    }
    if (next.length) setFiles((prev) => [...prev, ...next]);
  }, []);

  const clearFiles = useCallback(() => {
    setFiles((prev) => { prev.forEach((f) => URL.revokeObjectURL(f.url)); return []; });
  }, []);

  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    }).catch(() => { /* ignore */ });
  }, []);

  const preview = useCallback((type: MaterialType) => {
    if (!spec) return;
    const opts = type === 'dark_phonics_card' && darkPhonicsCardOpts
      ? { autoPrint: false, darkPhonics: darkPhonicsCardOpts }
      : { autoPrint: false };
    const { html, warnings: w } = buildMaterial(type, spec, assets, opts);
    setPreviewHtml(html);
    setPreviewType(type);
    setWarnings(w);
  }, [spec, assets, darkPhonicsCardOpts]);

  const printMaterial = useCallback((type: MaterialType) => {
    if (!spec) return;
    const opts = type === 'dark_phonics_card' && darkPhonicsCardOpts
      ? { autoPrint: true, darkPhonics: darkPhonicsCardOpts }
      : { autoPrint: true };
    const { html, warnings: w } = buildMaterial(type, spec, assets, opts);
    setWarnings(w); // surface any warnings in the preview area — never block printing
    const win = window.open('', '_blank');
    if (!win) { alert('Please allow pop-ups to print.'); return; }
    win.document.write(html);
    win.document.close();
  }, [spec, assets, darkPhonicsCardOpts]);

  // Combined full pack — ONE document, ONE synchronous window.open (so pop-up
  // blockers don't kill it). Each material's own CSS is scoped under a unique
  // wrapper class so the ten stylesheets can't collide; shared @page/@font-face
  // are emitted once. Page-breaks separate the materials.
  const printFullPack = useCallback(() => {
    if (!spec) return;
    const win = window.open('', '_blank'); // synchronous — inside the click gesture
    if (!win) { alert('Please allow pop-ups to print.'); return; }

    const fonts = new Set<string>();
    const scopedStyles: string[] = [];
    const sections: string[] = [];
    const allWarnings: string[] = [];

    materialList.forEach((m, i) => {
      const { html, warnings: w } = buildMaterial(m.type, spec, assets, { autoPrint: false });
      allWarnings.push(...w.map((x) => `[${m.label}] ${x}`));
      const scope = `.mp-${i}`;
      const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/i);
      const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/i);
      if (styleMatch) scopedStyles.push(scopeCss(styleMatch[1], scope, fonts));
      const body = bodyMatch ? bodyMatch[1].replace(/<script[\s\S]*?<\/script>/gi, '') : '';
      sections.push(`<section class="mp-${i}" style="break-before:page;page-break-before:always;">${body}</section>`);
    });

    setWarnings(allWarnings);

    const doc =
      `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">` +
      `<title>${spec.displayName || `Week ${spec.week}`} — Full Pack</title><style>` +
      `@page{size:A4;margin:0;}` +
      `html,body{margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}` +
      `@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;}}` +
      `${[...fonts].join('')}${scopedStyles.join('')}</style></head><body>` +
      `${sections.join('')}` +
      `<script>window.onload=function(){setTimeout(function(){window.print();},600);};</script>` +
      `</body></html>`;
    win.document.write(doc);
    win.document.close();
  }, [spec, assets, materialList]);

  const btn = 'transition-all duration-200 rounded-lg text-sm font-semibold';

  return (
    <div className="min-h-screen relative" style={{ background: FOREST_BG, color: '#e6f0ea' }}>
      <div aria-hidden style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 1000px 800px at 82% 8%, rgba(39,129,90,0.45), rgba(39,129,90,0) 55%), linear-gradient(155deg,#0c2419 0%,#0a1f16 40%,#06140e 100%)`,
      }} />

      {/* Nav */}
      <nav className="relative z-10 px-6 flex items-center justify-between"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)', paddingBottom: '0.75rem' }}>
        <Link href="/montree/library" className="text-white/40 text-sm hover:text-white/70 transition-colors">← Library</Link>
        <span className="text-emerald-300/70 text-xs tracking-widest uppercase">Curriculum Studio</span>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-4 pb-16">
        <header className="text-center mt-2 mb-6">
          <h1 className="text-3xl md:text-4xl font-bold" style={{ background: 'linear-gradient(135deg,#6ee7b7,#34d399,#a7f3d0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            The 58-Week English Program
          </h1>
          <p className="text-white/40 mt-2 text-sm">Pick a week · drop the pictures · preview and print every material.</p>
        </header>

        {/* Week rail — grouped by level */}
        <div className="mb-6 space-y-4">
          {LEVEL_SECTIONS.map((section) => (
            <div key={section.title}>
              <div className="text-emerald-200/45 text-[11px] font-semibold tracking-widest uppercase mb-2">{section.title}</div>
              <div className="grid grid-cols-4 sm:grid-cols-7 md:grid-cols-9 gap-2">
                {section.items.map((s) => {
                  const active = s.week === week;
                  return (
                    <button key={s.week} onClick={() => setWeek(s.week)}
                      className={`${btn} p-2 text-center border relative`}
                      style={{
                        background: active ? 'rgba(52,211,153,0.16)' : 'rgba(255,255,255,0.03)',
                        borderColor: active ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.08)',
                      }}>
                      <div className={`${labelClass(s.label)} font-bold leading-tight break-words`} style={{ color: active ? '#a7f3d0' : '#cfe8dc' }}>{s.label}</div>
                      <div className="text-[10px] text-white/40 mt-0.5 truncate">{s.word}</div>
                      {s.milestone && <div className="text-[9px] mt-0.5 leading-tight" style={{ color: '#E8C96A' }}>{s.milestone}</div>}
                      {s.vowelLights && <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: '#2456c7' }} />}
                      {/* Intro weeks use sentinel numbers (101/102) — never show a "W101" chip; the label already reads "Intro A/B". */}
                      {!isIntroWeek(s.week) && <div className="text-[8px] text-white/25 mt-0.5">W{s.week}</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Spine summary */}
        {summary && (
          <div className="rounded-xl border p-4 mb-5" style={{ borderColor: 'rgba(52,211,153,0.18)', background: 'rgba(16,185,129,0.05)' }}>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="text-2xl font-bold" style={{ color: '#a7f3d0' }}>{summary.letterDisplay}</span>
              {spec?.displayName ? (
                <span className="text-white/80 font-semibold">{spec.displayName}</span>
              ) : (
                <>
                  <span className="text-white/70">Week {summary.week} · sound <b>/{summary.sound}/</b></span>
                  <span className="text-white/50 text-sm">anchor: <b className="text-white/80">{summary.anchorWord}</b></span>
                </>
              )}
              {summary.vowelLights && <span className="text-sm" style={{ color: '#7aa2ff' }}>vowel {summary.vowelLights.toUpperCase()} lights up</span>}
              {summary.castIntro && <span className="text-sm" style={{ color: '#E8C96A' }}>cast: {summary.castIntro} joins</span>}
              {summary.celebration && <span className="text-sm" style={{ color: '#E8C96A' }}>🎉 {summary.celebration}</span>}
              {(weekToLessonMap[summary.week]?.length ?? 0) > 0 && (
                <span className="text-white/30 text-xs ml-auto">lesson-map ≈ L{(weekToLessonMap[summary.week] || []).join(', L')}</span>
              )}
            </div>
            {spec && (
              <div className="mt-2 text-sm text-white/55 flex flex-wrap gap-x-5 gap-y-1">
                <span>frame: <span className="text-white/75">“{spec.sentenceFrame}”</span></span>
                {spec.newWords?.length ? <span>new: <span className="text-white/75">{spec.newWords.join(', ')}</span></span> : null}
                {(spec.glue?.new?.length || spec.glue?.known?.length) ? (
                  <span>glue: <span className="text-white/75">{[...(spec.glue?.known || []), ...(spec.glue?.new || [])].join(', ') || '—'}</span></span>
                ) : null}
                <span>focus: <span className="text-white/60">{spec.teacherFocus}</span></span>
              </div>
            )}
          </div>
        )}

        {specLoading && <div className="text-center text-white/40 py-10">Loading week {week}…</div>}

        {!specLoading && !spec && (
          <div className="rounded-xl border p-8 text-center" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
            <div className="text-white/70 font-semibold">Week {week} isn’t authored yet.</div>
            <div className="text-white/40 text-sm mt-1">The spine summary above is the plan. Once <code className="text-emerald-300/80">week-{String(week).padStart(2, '0')}.json</code> lands, its materials appear here.</div>
          </div>
        )}

        {!specLoading && spec && (
          <>
          <div className="grid md:grid-cols-[320px_1fr] gap-5">
            {/* LEFT — assets */}
            <div className="space-y-5">
              {/* Assets */}
              <section className="rounded-xl border p-4" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold text-white/85">Pictures</h2>
                  <span className="text-xs text-white/40">{spec.assets.length - gap.missing.length}/{spec.assets.length} ready</span>
                </div>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
                  className="cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition-colors"
                  style={{ borderColor: dragOver ? '#34d399' : 'rgba(255,255,255,0.18)', background: dragOver ? 'rgba(52,211,153,0.08)' : 'transparent' }}>
                  <div className="text-sm text-white/70">📷 Drop images or click</div>
                  <div className="text-[11px] text-white/35 mt-1">Filenames become words — <code>04-cup.png</code> → cup, <code>cup-coloring.png</code> → colouring.</div>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} />
                </div>
                {files.length > 0 && (
                  <div className="flex items-center justify-between mt-2 text-xs text-white/45">
                    <span>{files.length} file(s) loaded (in-memory)</span>
                    <button onClick={clearFiles} className="text-rose-300/70 hover:text-rose-300">Clear</button>
                  </div>
                )}

                {/* Manifest checklist — collapses to 7 rows; no inner scroll (page grows instead) */}
                <div className="mt-3 space-y-1 pr-1">
                  {(assetsExpanded ? spec.assets : spec.assets.slice(0, 7)).map((a) => {
                    const missing = missingFiles.has(a.file);
                    const fromWeek = earlierWeekByFile.get(a.file);
                    return (
                      <div key={a.file} className="text-xs flex items-center gap-2 py-0.5">
                        <span style={{ color: missing ? '#f87171' : '#34d399' }}>{missing ? '✗' : '✓'}</span>
                        <span className="text-white/70 truncate flex-1">{a.file}</span>
                        {missing && fromWeek && (
                          <span className="text-[9px] px-1 py-0.5 rounded whitespace-nowrap"
                            title={`Already made for Week ${fromWeek} — copy it into this week's folder instead of regenerating.`}
                            style={{ background: 'rgba(122,162,255,0.16)', color: '#7aa2ff' }}>
                            ↺ W{fromWeek}
                          </span>
                        )}
                        {missing && a.mjPrompt && (
                          <button onClick={() => copy(a.mjPrompt, `mj-${a.file}`)}
                            className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(232,201,106,0.14)', color: '#E8C96A' }}>
                            {copied === `mj-${a.file}` ? 'copied' : 'MJ'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {spec.assets.length > 7 && (
                  <button onClick={() => setAssetsExpanded((v) => !v)}
                    className="mt-2 text-[11px] text-emerald-300/70 hover:text-emerald-300 transition-colors">
                    {assetsExpanded ? 'Show less ▴' : `Show all ${spec.assets.length} ▾`}
                  </button>
                )}
              </section>
            </div>

            {/* RIGHT — materials */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-white/85">Materials</h2>
                <button onClick={printFullPack} className={`${btn} px-3 py-2`}
                  style={{ background: 'linear-gradient(135deg,#34d399,#10b981)', color: '#06140e' }}>
                  🖨 Print full pack
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {materialList.map((m) => (
                  <div key={m.type} className="rounded-xl border p-3 flex items-center gap-3"
                    style={{ borderColor: previewType === m.type ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                    <span className="text-2xl">{m.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white/85 font-medium truncate">{m.label}</div>
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => preview(m.type)} className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(255,255,255,0.08)', color: '#cfe8dc' }}>Preview</button>
                        <button onClick={() => printMaterial(m.type)} className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(52,211,153,0.14)', color: '#a7f3d0' }}>Print</button>
                      </div>
                    </div>
                  </div>
                ))}
                {/* Dark Phonics single flashcard — only on weeks that map to a Dark
                    Phonics lesson. Rendered here (not in materialList) so it carries
                    its own darkPhonics payload and never enters the full-pack print,
                    which can't supply that payload. */}
                {darkPhonicsCardOpts && (
                  <div key="dark_phonics_card" className="rounded-xl border p-3 flex items-center gap-3"
                    style={{ borderColor: previewType === 'dark_phonics_card' ? 'rgba(52,211,153,0.5)' : 'rgba(122,162,255,0.25)', background: 'rgba(122,162,255,0.05)' }}>
                    <span className="text-2xl">🎬</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white/85 font-medium truncate">Dark Phonics Flashcard</div>
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => preview('dark_phonics_card')} className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(255,255,255,0.08)', color: '#cfe8dc' }}>Preview</button>
                        <button onClick={() => printMaterial('dark_phonics_card')} className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(52,211,153,0.14)', color: '#a7f3d0' }}>Print</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Warnings — surfaced from the render engine (missing images, etc.).
                  Shown for previews AND before print; never blocks printing. */}
              {warnings.length > 0 && (
                <div className="mt-4 rounded-lg border px-3 py-2" style={{ borderColor: 'rgba(232,201,106,0.4)', background: 'rgba(232,201,106,0.08)' }}>
                  <div className="text-xs font-semibold" style={{ color: '#E8C96A' }}>
                    ⚠ {warnings.length} warning{warnings.length === 1 ? '' : 's'} — placeholders used, printing still works
                  </div>
                  <ul className="mt-1 space-y-0.5 text-[11px]" style={{ color: 'rgba(232,201,106,0.85)' }}>
                    {warnings.slice(0, 12).map((w, i) => <li key={i}>· {w}</li>)}
                    {warnings.length > 12 && <li>· …and {warnings.length - 12} more</li>}
                  </ul>
                </div>
              )}

              {/* Preview pane */}
              {previewType && (
                <div className="mt-4 rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
                  <div className="flex items-center justify-between px-3 py-2" style={{ background: 'rgba(0,0,0,0.3)' }}>
                    <span className="text-sm text-white/70">Preview · {previewType === 'dark_phonics_card' ? 'Dark Phonics Flashcard' : materialList.find((x) => x.type === previewType)?.label}</span>
                    <div className="flex gap-2">
                      <button onClick={() => printMaterial(previewType)} className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(52,211,153,0.16)', color: '#a7f3d0' }}>Print this</button>
                      <button onClick={() => { setPreviewType(null); setWarnings([]); }} className="text-xs px-2 py-1 rounded text-white/50 hover:text-white/80">Close</button>
                    </div>
                  </div>
                  <iframe title="material-preview" srcDoc={previewHtml} style={{ width: '100%', height: '70vh', border: 'none', background: '#f0f0f0' }} />
                </div>
              )}
            </div>
          </div>

          {/* Songs — full width, below Materials (teacher's core action comes first) */}
          {((spec.songs?.length ?? 0) > 0 || darkPhonics?.videoUrl) && (
            <section className="mt-5 rounded-xl border p-4" style={{ borderColor: 'rgba(167,139,250,0.2)', background: 'rgba(124,58,237,0.05)' }}>
              <h2 className="font-semibold text-white/85 mb-2">🎵 Songs</h2>
              {/* Dark Phonics film — plays FIRST, before the curriculum songs. */}
              {darkPhonics?.videoUrl && (
                <div className="rounded-lg p-3 mb-3" style={{ background: 'rgba(0,0,0,0.25)' }}>
                  <span className="text-[10px] uppercase tracking-wide" style={{ color: '#7aa2ff' }}>🎬 Dark Phonics</span>
                  <div className="text-white/85 text-sm font-semibold mb-2">Dark Phonics — {darkPhonics.title}</div>
                  <video controls preload="none" src={darkPhonics.videoUrl}
                    style={{ width: '100%', borderRadius: 6, background: '#000' }} />
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-3">
                {spec.songs?.map((s, i) => {
                  const lines = s.lyrics.split('\n');
                  const lyricsExpanded = expandedLyrics.has(i);
                  const shownLyrics = lyricsExpanded ? s.lyrics : lines.slice(0, 8).join('\n');
                  return (
                    <div key={i} className="rounded-lg p-3" style={{ background: 'rgba(0,0,0,0.25)' }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase tracking-wide" style={{ color: '#E8C96A' }}>{s.role} song</span>
                          <div className="text-white/85 text-sm font-semibold">{s.title}</div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => copy(s.sunoStyle, `style-${i}`)} className="text-[10px] px-2 py-1 rounded" style={{ background: 'rgba(167,139,250,0.16)', color: '#c4b5fd' }}>
                            {copied === `style-${i}` ? '✓' : 'Suno style'}
                          </button>
                          <button onClick={() => copy(s.lyrics, `lyr-${i}`)} className="text-[10px] px-2 py-1 rounded" style={{ background: 'rgba(167,139,250,0.16)', color: '#c4b5fd' }}>
                            {copied === `lyr-${i}` ? '✓' : 'Lyrics'}
                          </button>
                        </div>
                      </div>
                      {/* Audio player — appears once the song's mp3 is published (audioUrl set) */}
                      {s.audioUrl && (
                        <audio controls preload="none" src={s.audioUrl} style={{ width: '100%', marginTop: 8 }} />
                      )}
                      {/* Music video — plays once a certified video is published (videoUrl set);
                          a quiet "coming soon" slot until then. CSP media-src 'self' covers the
                          montree.xyz proxy URL (same origin) + loopback for local review. */}
                      <div style={{ marginTop: 8 }}>
                        <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: '#7aa2ff' }}>🎬 Music video</div>
                        {s.videoUrl ? (
                          <video controls preload="none" src={s.videoUrl}
                            style={{ width: '100%', borderRadius: 6, background: '#000' }} />
                        ) : (
                          <div className="text-[11px] rounded px-2 py-2 text-center"
                            style={{ background: 'rgba(122,162,255,0.08)', color: 'rgba(122,162,255,0.7)', border: '1px dashed rgba(122,162,255,0.25)' }}>
                            Coming soon
                          </div>
                        )}
                      </div>
                      {/* Lyrics — collapses to 8 lines; no inner scroll (copy button gets the full text) */}
                      <pre className="text-[11px] text-white/50 mt-2 whitespace-pre-wrap font-sans">{shownLyrics}</pre>
                      {lines.length > 8 && (
                        <button
                          onClick={() => setExpandedLyrics((prev) => {
                            const next = new Set(prev);
                            if (next.has(i)) next.delete(i); else next.add(i);
                            return next;
                          })}
                          className="mt-1 text-[11px] text-violet-300/70 hover:text-violet-300 transition-colors">
                          {lyricsExpanded ? 'Show less ▴' : `Show all ${lines.length} lines ▾`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
          </>
        )}
      </div>
    </div>
  );
}
