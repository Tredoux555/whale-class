// /montree/library/curriculum-studio/page.tsx
// Curriculum Studio — pick a week, drop pictures, preview + print every material.
// PUBLIC (unauthenticated) by design. All rendering flows through the shared
// render engine (lib/montree/english-curriculum/render) — ZERO render logic here.
'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildMaterial, buildAssetMap, assetGapReport, MATERIAL_TYPES,
  type AssetMap, type MaterialType,
} from '@/lib/montree/english-curriculum/render';
import { getWeek, WEEK_META, weekToLessonMap, type WeekSpec } from '@/lib/montree/english-curriculum/spec';

interface DroppedFile { name: string; url: string; }

const FOREST_BG = '#06140e';

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

  // Restore the last-viewed week from localStorage AFTER mount. Doing this in an
  // effect (not the useState initializer) keeps the first client render identical
  // to the server render, so hydration matches; the saved week is applied one tick
  // later without any visible flash before the spec finishes loading.
  useEffect(() => {
    try {
      const saved = parseInt(localStorage.getItem('curriculumStudioWeek') || '', 10);
      if (saved >= 1 && saved <= 26) setWeek(saved);
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
  useEffect(() => {
    let alive = true;
    Promise.all(Array.from({ length: Math.max(0, week - 1) }, (_, i) => getWeek(i + 1)))
      .then((ws) => { if (alive) setPriorSpecs(ws.filter((w): w is WeekSpec => !!w)); });
    return () => { alive = false; };
  }, [week]);

  const assets: AssetMap = useMemo(() => buildAssetMap(files), [files]);
  const gap = useMemo(() => (spec ? assetGapReport(spec, assets, priorSpecs) : { missing: [] }), [spec, assets, priorSpecs]);
  const missingFiles = useMemo(() => new Set(gap.missing.map((m) => m.file)), [gap]);
  const earlierWeekByFile = useMemo(
    () => new Map(gap.missing.filter((m) => m.fromEarlierWeek).map((m) => [m.file, m.fromEarlierWeek as number])),
    [gap],
  );

  const meta = WEEK_META.find((m) => m.week === week);

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
    const { html, warnings: w } = buildMaterial(type, spec, assets, { autoPrint: false });
    setPreviewHtml(html);
    setPreviewType(type);
    setWarnings(w);
  }, [spec, assets]);

  const printMaterial = useCallback((type: MaterialType) => {
    if (!spec) return;
    const { html, warnings: w } = buildMaterial(type, spec, assets, { autoPrint: true });
    setWarnings(w); // surface any warnings in the preview area — never block printing
    const win = window.open('', '_blank');
    if (!win) { alert('Please allow pop-ups to print.'); return; }
    win.document.write(html);
    win.document.close();
  }, [spec, assets]);

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

    MATERIAL_TYPES.forEach((m, i) => {
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
      `<title>Week ${spec.week} — Full Pack</title><style>` +
      `@page{size:A4;margin:0;}` +
      `html,body{margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}` +
      `@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;}}` +
      `${[...fonts].join('')}${scopedStyles.join('')}</style></head><body>` +
      `${sections.join('')}` +
      `<script>window.onload=function(){setTimeout(function(){window.print();},600);};</script>` +
      `</body></html>`;
    win.document.write(doc);
    win.document.close();
  }, [spec, assets]);

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
            The 26-Week Sound Year
          </h1>
          <p className="text-white/40 mt-2 text-sm">Pick a week · drop the pictures · preview and print every material.</p>
        </header>

        {/* Week rail */}
        <div className="grid grid-cols-4 sm:grid-cols-7 md:grid-cols-9 gap-2 mb-6">
          {WEEK_META.map((m) => {
            const active = m.week === week;
            return (
              <button key={m.week} onClick={() => setWeek(m.week)}
                className={`${btn} p-2 text-center border relative`}
                style={{
                  background: active ? 'rgba(52,211,153,0.16)' : 'rgba(255,255,255,0.03)',
                  borderColor: active ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.08)',
                }}>
                <div className="text-lg font-bold leading-none" style={{ color: active ? '#a7f3d0' : '#cfe8dc' }}>{m.letterDisplay}</div>
                <div className="text-[10px] text-white/40 mt-0.5 truncate">{m.anchorWord}</div>
                {m.celebration && <div className="text-[9px] mt-0.5 leading-tight" style={{ color: '#E8C96A' }}>🎉</div>}
                {m.vowelLights && <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: '#2456c7' }} />}
                <div className="text-[8px] text-white/25 mt-0.5">W{m.week}</div>
              </button>
            );
          })}
          {[2, 3].map((lvl) => (
            <div key={lvl} className="p-2 text-center border rounded-lg opacity-50" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
              <div className="text-sm font-bold text-white/50">L{lvl}</div>
              <div className="text-[9px] text-white/30 mt-1">designed<br />— coming</div>
            </div>
          ))}
        </div>

        {/* Spine summary */}
        {meta && (
          <div className="rounded-xl border p-4 mb-5" style={{ borderColor: 'rgba(52,211,153,0.18)', background: 'rgba(16,185,129,0.05)' }}>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="text-2xl font-bold" style={{ color: '#a7f3d0' }}>{meta.letterDisplay}</span>
              <span className="text-white/70">Week {meta.week} · sound <b>/{meta.sound}/</b></span>
              <span className="text-white/50 text-sm">anchor: <b className="text-white/80">{meta.anchorWord}</b></span>
              {meta.vowelLights && <span className="text-sm" style={{ color: '#7aa2ff' }}>vowel {meta.vowelLights.toUpperCase()} lights up</span>}
              {meta.castIntro && <span className="text-sm" style={{ color: '#E8C96A' }}>cast: {meta.castIntro} joins</span>}
              {meta.celebration && <span className="text-sm" style={{ color: '#E8C96A' }}>🎉 {meta.celebration}</span>}
              <span className="text-white/30 text-xs ml-auto">lesson-map ≈ L{(weekToLessonMap[meta.week] || []).join(', L')}</span>
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
                {MATERIAL_TYPES.map((m) => (
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
                    <span className="text-sm text-white/70">Preview · {MATERIAL_TYPES.find((x) => x.type === previewType)?.label}</span>
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
          {spec.songs?.length > 0 && (
            <section className="mt-5 rounded-xl border p-4" style={{ borderColor: 'rgba(167,139,250,0.2)', background: 'rgba(124,58,237,0.05)' }}>
              <h2 className="font-semibold text-white/85 mb-2">🎵 Songs</h2>
              <div className="grid md:grid-cols-2 gap-3">
                {spec.songs.map((s, i) => {
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
