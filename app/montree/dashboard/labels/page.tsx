// app/montree/dashboard/labels/page.tsx
//
// LABEL STUDIO — one label engine for the whole classroom.
//
// Replaces the four hard-coded templates of the old Label Generator (kept,
// unlinked, at ../labels-legacy) with three orthogonal control groups:
// SIZE (true millimetres), CONTENT (roster / sequence / your own list) and
// STYLE. The presets are shortcuts that just set those three — anything a
// preset can do, the teacher can do by hand.
//
// PRINT LAW: the sheet CSS is injected as a <style dangerouslySetInnerHTML>
// string, never <style jsx> — `@page` cannot be scoped to a selector, and
// Turbopack rejects a styled-jsx tag nested inside a conditional branch.
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Quicksand } from 'next/font/google';
import { useI18n, type TranslationKey } from '@/lib/montree/i18n';
import { getSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';
import { andikaFontFaceCss } from '@/lib/montree/print/fonts';
import {
  A4_W_MM, A4_H_MM, SIZE_PRESETS, CUSTOM_MIN_MM, CUSTOM_MAX_MM,
  clampCustom, gridFor, paginate, mainTextFit, subFontMm, emblemMm,
  photoSizeMm, isStrip, expandSequence, applyCase, parseCustomList,
  charColor, printCss, SEQUENCE_MAX, MAIN_LINE_HEIGHT,
  type SizeId, type CaseMode,
} from '@/lib/montree/label-studio/layout';

const quicksand = Quicksand({ subsets: ['latin'], weight: ['600', '700'] });

const MM_PX = 96 / 25.4;
const STORE_KEY = 'montree.labelStudio.v1';

type Student = { id: string; name: string; photo_url?: string; nickname?: string };
type LabelItem = { id: string; text: string; sub?: string; photoUrl?: string };

type Source = 'class' | 'sequence' | 'custom';
type Theme = 'plain' | 'montessori';
type Border = 'none' | 'hairline' | 'frame';
type SubLine = 'none' | 'greeting' | 'nickname';

type Settings = {
  sizeId: SizeId;
  customW: number;
  customH: number;
  source: Source;
  showPhoto: boolean;
  subLine: SubLine;
  emblemOn: boolean;
  theme: Theme;
  border: Border;
  cutGuides: boolean;
  caseMode: CaseMode;
};

const DEFAULTS: Settings = {
  sizeId: 'strip', customW: 90, customH: 50, source: 'class',
  showPhoto: true, subLine: 'none', emblemOn: true,
  theme: 'plain', border: 'hairline', cutGuides: true, caseMode: 'as-is',
};

// A preset is a named point in Settings-space, nothing more. It shows as
// active only while every field it names still matches — the moment the
// teacher changes one, the chip goes quiet rather than lying about state.
type PresetId = 'meetgreet' | 'locker' | 'nametag' | 'cubby';

const PRESETS: { id: PresetId; labelKey: TranslationKey; icon: string; set: Partial<Settings> }[] = [
  {
    id: 'meetgreet', labelKey: 'labelStudio.preset.meetgreet', icon: '👋',
    set: { sizeId: 'strip', source: 'class', showPhoto: true, emblemOn: true, theme: 'plain', subLine: 'greeting', border: 'hairline' },
  },
  {
    id: 'locker', labelKey: 'labelStudio.preset.locker', icon: '🚪',
    set: { sizeId: 'large', source: 'class', showPhoto: true, emblemOn: true, theme: 'plain', subLine: 'none', border: 'frame' },
  },
  {
    id: 'nametag', labelKey: 'labelStudio.preset.nametag', icon: '📛',
    set: { sizeId: 'strip', source: 'class', showPhoto: false, emblemOn: true, theme: 'plain', subLine: 'none', border: 'hairline' },
  },
  {
    id: 'cubby', labelKey: 'labelStudio.preset.cubby', icon: '🛏️',
    set: { sizeId: 'small', source: 'class', showPhoto: true, emblemOn: false, theme: 'plain', subLine: 'none', border: 'none' },
  },
];

const SEQUENCE_CHIPS: { id: string; labelKey: TranslationKey; from: string; to: string }[] = [
  { id: 'AZ', labelKey: 'labelStudio.seq.AZ', from: 'A', to: 'Z' },
  { id: 'az', labelKey: 'labelStudio.seq.az', from: 'a', to: 'z' },
  { id: '1-20', labelKey: 'labelStudio.seq.1to20', from: '1', to: '20' },
  { id: '1-50', labelKey: 'labelStudio.seq.1to50', from: '1', to: '50' },
];

/** Brand-kit / uploaded emblems arrive as an https URL, a site-relative proxy
 *  path, a data: URI, or a bare storage path. Only the last needs the proxy. */
function resolveImage(src: string | null | undefined): string {
  if (!src) return '';
  if (/^(https?:|data:|blob:)/i.test(src) || src.startsWith('/')) return src;
  return getProxyUrl(src);
}

let uid = 0;
const nextId = () => `ls-${Date.now().toString(36)}-${uid++}`;

export default function LabelStudioPage() {
  const { t } = useI18n();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [kitLogo, setKitLogo] = useState<string | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [logoDragging, setLogoDragging] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [s, setS] = useState<Settings>(DEFAULTS);
  const set = useCallback(<K extends keyof Settings>(k: K, v: Settings[K]) => {
    setS(prev => ({ ...prev, [k]: v }));
  }, []);

  const [seqFrom, setSeqFrom] = useState('A');
  const [seqTo, setSeqTo] = useState('Z');
  const [customText, setCustomText] = useState('');
  const [labels, setLabels] = useState<LabelItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  // -- settings persistence (never the label text) -------------------------
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) setS(prev => ({ ...prev, ...(JSON.parse(raw) as Partial<Settings>) }));
    } catch { /* private mode / blocked storage — defaults are fine */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  }, [s]);

  // -- roster + resolved class emblem --------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sess = await getSession();
      if (!sess?.classroom?.id) { router.push('/montree/login'); return; }
      const roomId = sess.classroom.id;
      try {
        const [kidsRes, brandRes] = await Promise.all([
          fetch(`/api/montree/children?classroom_id=${encodeURIComponent(roomId)}`),
          montreeApi(`/api/montree/brand-kit?classroomId=${encodeURIComponent(roomId)}`).catch(() => null),
        ]);
        if (cancelled) return;
        const data = await kidsRes.json();
        const kids: Student[] = (data.children || [])
          .slice()
          .sort((a: Student, b: Student) => a.name.localeCompare(b.name));
        setStudents(kids);
        setSelected(new Set(kids.map(k => k.id)));
        if (brandRes && brandRes.ok) {
          const brand = await brandRes.json();
          // The RESOLVED kit (classroom-wins-else-school) ONLY — never the
          // legacy `brand.logoUrl` field, which is the school's RAW stored
          // logo and stays populated even when that kit is disabled or a
          // classroom kit overrides it off. Falling back to it would print
          // an emblem the active kit deliberately says not to (see
          // lib/montree/brand-kit/resolve.ts). Never the Whale emblem PNG
          // either — stamping one school's mark on another is a bug.
          setKitLogo(brand?.kit?.logoUrl || null);
        }
      } catch { /* roster stays empty; the empty state explains itself */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [router]);

  // -- the ONE label list, rebuilt whenever its SOURCE changes --------------
  // Case, photo and sub-line are applied at RENDER time, not here, so
  // flipping a style control never throws away a hand-edited label.
  const selKey = useMemo(
    () => students.filter(k => selected.has(k.id)).map(k => k.id).join(','),
    [students, selected],
  );

  useEffect(() => {
    if (s.source === 'class') {
      setLabels(
        students.filter(k => selected.has(k.id)).map(k => ({
          id: k.id,
          text: (k.name || '').trim().split(/\s+/)[0] || k.name,
          sub: k.nickname || undefined,
          photoUrl: k.photo_url ? resolveImage(k.photo_url) : undefined,
        })),
      );
    } else if (s.source === 'sequence') {
      setLabels(expandSequence(seqFrom, seqTo).map(text => ({ id: nextId(), text })));
    } else {
      setLabels(parseCustomList(customText).map(text => ({ id: nextId(), text })));
    }
    setEditingId(null);
    // selKey stands in for the selected/students pair on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.source, selKey, seqFrom, seqTo, customText]);

  const hasNicknames = useMemo(() => students.some(k => !!k.nickname), [students]);

  // -- geometry ------------------------------------------------------------
  const size = s.sizeId === 'custom'
    ? { w: s.customW, h: s.customH }
    : SIZE_PRESETS[s.sizeId];
  const grid = useMemo(() => gridFor(size.w, size.h), [size.w, size.h]);
  const sheets = useMemo(() => paginate(labels, grid.perSheet), [labels, grid.perSheet]);

  const emblemSrc = s.emblemOn ? resolveImage(logoDataUrl || kitLogo) : '';

  // Case is a SEQUENCE control. If the teacher set "both" on A-Z and then
  // switched back to the roster, the roster must not come out "ANNA anna" —
  // so the effective case is what the visible controls actually offer.
  const effCase: CaseMode = s.source === 'sequence' ? s.caseMode : 'as-is';

  // -- preview scaling: A4 in real mm, shrunk to whatever width we have -----
  const scalerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = scalerRef.current?.parentElement;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(Math.min(1, w / (A4_W_MM * MM_PX)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading]);

  // -- label edits ---------------------------------------------------------
  const editLabel = useCallback((id: string, text: string) => {
    setLabels(prev => prev.map(l => (l.id === id ? { ...l, text } : l)));
  }, []);
  const removeLabel = useCallback((id: string) => {
    setLabels(prev => prev.filter(l => l.id !== id));
  }, []);
  const addLabel = useCallback(() => {
    const id = nextId();
    setLabels(prev => [...prev, { id, text: '' }]);
    setEditingId(id);
  }, []);

  // -- emblem upload -------------------------------------------------------
  const handleLogoFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => setLogoDataUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  // -- presets -------------------------------------------------------------
  const applyPreset = useCallback((p: Partial<Settings>) => {
    setS(prev => ({ ...prev, ...p }));
  }, []);
  const activePreset = useMemo(() => {
    const hit = PRESETS.find(p =>
      (Object.keys(p.set) as (keyof Settings)[]).every(k => s[k] === p.set[k]),
    );
    return hit?.id ?? null;
  }, [s]);

  // -- export --------------------------------------------------------------
  const exportRows = useCallback(
    () => labels.map(l => [applyCase(l.text, effCase), l.sub || '']),
    [labels, effCase],
  );
  const stamp = () => new Date().toISOString().slice(0, 10);

  const exportTxt = useCallback(() => {
    const blob = new Blob([exportRows().map(r => r[0]).join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `montree-labels-${stamp()}.txt`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExportOpen(false);
  }, [exportRows]);

  const exportXlsx = useCallback(async () => {
    // Dynamic — SheetJS is ~800KB and no other part of this page needs it.
    const XLSX = await import('xlsx');
    const rows = [[t('labelStudio.colLabel'), t('labelStudio.colLine2')], ...exportRows()];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Labels');
    XLSX.writeFile(wb, `montree-labels-${stamp()}.xlsx`);
    setExportOpen(false);
  }, [exportRows, t]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🏷️</div>
          <p className="text-white/40">{t('labelStudio.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[#0a1a0f] relative">
        <div
          aria-hidden
          className="ls-noprint fixed inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 50% 0%, rgba(39,129,90,0.32), transparent 60%)' }}
        />

        {/* Header */}
        <div className="ls-noprint relative bg-[rgba(7,18,12,0.9)] border-b border-[rgba(52,211,153,0.15)] px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => router.back()} className="btn btn-ghost btn-icon btn-sm" aria-label={t('common.back')}>←</button>
            <h1 className={`${quicksand.className} text-white font-bold text-lg truncate`}>
              {t('labelStudio.title')}
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative">
              <button className="btn btn-secondary btn-sm" onClick={() => setExportOpen(o => !o)}>
                {t('labelStudio.export')} ▾
              </button>
              {exportOpen && (
                <div className="absolute right-0 mt-1 z-30 w-64 rounded-xl bg-[#0d2216] border border-[rgba(52,211,153,0.2)] p-2 shadow-xl">
                  <button className="btn btn-ghost btn-sm btn-full" onClick={exportTxt}>{t('labelStudio.exportTxt')}</button>
                  <button className="btn btn-ghost btn-sm btn-full" onClick={exportXlsx}>{t('labelStudio.exportXlsx')}</button>
                  <p className="text-[11px] text-white/35 px-2 pt-2 leading-snug">{t('labelStudio.niimbotHint')}</p>
                </div>
              )}
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => window.print()} disabled={labels.length === 0}>
              🖨 {t('labelStudio.print')}
            </button>
          </div>
        </div>

        <div className="relative max-w-[1400px] mx-auto px-4 py-4 grid gap-4 lg:grid-cols-[400px_1fr] items-start">
          {/* ── CONTROLS ─────────────────────────────────────────────── */}
          <div className="ls-noprint space-y-3">

            {/* Presets */}
            <Panel title={t('labelStudio.presets')}>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map(p => (
                  <Chip key={p.id} active={activePreset === p.id} onClick={() => applyPreset(p.set)}>
                    <span className="mr-1">{p.icon}</span>{t(p.labelKey)}
                  </Chip>
                ))}
              </div>
            </Panel>

            {/* A. SIZE */}
            <Panel title={t('labelStudio.size')}>
              <div className="flex flex-wrap gap-2">
                <Chip active={s.sizeId === 'small'} onClick={() => set('sizeId', 'small')}>{t('labelStudio.size.small')} · 50×50</Chip>
                <Chip active={s.sizeId === 'large'} onClick={() => set('sizeId', 'large')}>{t('labelStudio.size.large')} · 100×100</Chip>
                <Chip active={s.sizeId === 'strip'} onClick={() => set('sizeId', 'strip')}>{t('labelStudio.size.strip')} · 90×50</Chip>
                <Chip active={s.sizeId === 'custom'} onClick={() => set('sizeId', 'custom')}>{t('labelStudio.size.custom')}</Chip>
              </div>
              {s.sizeId === 'custom' && (
                <div className="flex items-end gap-3 mt-3">
                  <NumField label={t('labelStudio.widthMm')} value={s.customW} onChange={v => set('customW', clampCustom(v))} />
                  <span className="text-white/30 pb-2">×</span>
                  <NumField label={t('labelStudio.heightMm')} value={s.customH} onChange={v => set('customH', clampCustom(v))} />
                  <span className="text-white/30 text-xs pb-2">mm</span>
                </div>
              )}
              <p className="text-xs text-white/45 mt-3">
                {t('labelStudio.perSheet', { n: grid.perSheet })} · {t('labelStudio.sheetCount', { n: sheets.length })} · {grid.cols}×{grid.rows}
              </p>
            </Panel>

            {/* B. CONTENT */}
            <Panel title={t('labelStudio.content')}>
              <div className="flex flex-wrap gap-2 mb-3">
                <Chip active={s.source === 'class'} onClick={() => set('source', 'class')}>{t('labelStudio.source.class')}</Chip>
                <Chip active={s.source === 'sequence'} onClick={() => set('source', 'sequence')}>{t('labelStudio.source.sequence')}</Chip>
                <Chip active={s.source === 'custom'} onClick={() => set('source', 'custom')}>{t('labelStudio.source.custom')}</Chip>
              </div>

              {s.source === 'class' && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set(students.map(k => k.id)))}>{t('labelStudio.selectAll')}</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>{t('labelStudio.selectNone')}</button>
                  </div>
                  <div className="max-h-52 overflow-y-auto rounded-lg border border-[rgba(52,211,153,0.15)] divide-y divide-[rgba(52,211,153,0.08)]">
                    {students.length === 0 && <p className="text-white/35 text-xs p-3">{t('labelStudio.noStudents')}</p>}
                    {students.map(k => (
                      <label key={k.id} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm text-white/75">
                        <input
                          type="checkbox"
                          checked={selected.has(k.id)}
                          onChange={() => setSelected(prev => {
                            const n = new Set(prev);
                            if (n.has(k.id)) n.delete(k.id); else n.add(k.id);
                            return n;
                          })}
                          className="accent-emerald-400"
                        />
                        <span className="truncate">{k.name}</span>
                      </label>
                    ))}
                  </div>
                  <Toggle label={t('labelStudio.showPhoto')} on={s.showPhoto} onChange={v => set('showPhoto', v)} />
                  {hasNicknames && (
                    <Toggle
                      label={t('labelStudio.secondLine')}
                      on={s.subLine === 'nickname'}
                      onChange={v => set('subLine', v ? 'nickname' : 'none')}
                    />
                  )}
                </>
              )}

              {s.source === 'sequence' && (
                <>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {SEQUENCE_CHIPS.map(c => (
                      <Chip
                        key={c.id}
                        active={seqFrom === c.from && seqTo === c.to}
                        onClick={() => { setSeqFrom(c.from); setSeqTo(c.to); }}
                      >
                        {t(c.labelKey)}
                      </Chip>
                    ))}
                  </div>
                  <div className="flex items-end gap-3">
                    <TextField label={t('labelStudio.seqStart')} value={seqFrom} onChange={setSeqFrom} />
                    <span className="text-white/30 pb-2">→</span>
                    <TextField label={t('labelStudio.seqEnd')} value={seqTo} onChange={setSeqTo} />
                  </div>
                  <p className="text-[11px] text-white/35 mt-2 leading-snug">{t('labelStudio.seqHint')}</p>
                </>
              )}

              {s.source === 'custom' && (
                <>
                  <textarea
                    value={customText}
                    onChange={e => setCustomText(e.target.value)}
                    rows={7}
                    placeholder={t('labelStudio.customPlaceholder')}
                    className="w-full rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(52,211,153,0.15)] px-3 py-2 text-sm text-white/85 placeholder:text-white/25 outline-none focus:border-emerald-400/40"
                  />
                  <p className="text-[11px] text-white/35 mt-1">{t('labelStudio.customHint', { n: SEQUENCE_MAX })}</p>
                </>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[rgba(52,211,153,0.1)]">
                <span className="text-xs text-white/45">{t('labelStudio.labelCount', { n: labels.length })}</span>
                <button className="btn btn-ghost btn-sm" onClick={addLabel}>+ {t('labelStudio.addLabel')}</button>
              </div>
              <p className="text-[11px] text-white/30 mt-1">{t('labelStudio.editHint')}</p>
            </Panel>

            {/* C. STYLE */}
            <Panel title={t('labelStudio.style')}>
              <Row label={t('labelStudio.theme')}>
                <Chip active={s.theme === 'plain'} onClick={() => set('theme', 'plain')}>{t('labelStudio.theme.plain')}</Chip>
                <Chip active={s.theme === 'montessori'} onClick={() => set('theme', 'montessori')}>{t('labelStudio.theme.montessori')}</Chip>
              </Row>
              {s.theme === 'montessori' && (
                <p className="text-[11px] text-white/35 -mt-1 mb-2 leading-snug">{t('labelStudio.montessoriHint')}</p>
              )}

              {s.source === 'sequence' && (
                <Row label={t('labelStudio.case')}>
                  <Chip active={s.caseMode === 'as-is'} onClick={() => set('caseMode', 'as-is')}>{t('labelStudio.case.asIs')}</Chip>
                  <Chip active={s.caseMode === 'upper'} onClick={() => set('caseMode', 'upper')}>{t('labelStudio.case.upper')}</Chip>
                  <Chip active={s.caseMode === 'lower'} onClick={() => set('caseMode', 'lower')}>{t('labelStudio.case.lower')}</Chip>
                  <Chip active={s.caseMode === 'both'} onClick={() => set('caseMode', 'both')}>{t('labelStudio.case.both')}</Chip>
                </Row>
              )}

              <Row label={t('labelStudio.border')}>
                <Chip active={s.border === 'none'} onClick={() => set('border', 'none')}>{t('labelStudio.border.none')}</Chip>
                <Chip active={s.border === 'hairline'} onClick={() => set('border', 'hairline')}>{t('labelStudio.border.hairline')}</Chip>
                <Chip active={s.border === 'frame'} onClick={() => set('border', 'frame')}>{t('labelStudio.border.frame')}</Chip>
              </Row>

              <Toggle label={t('labelStudio.cutGuides')} on={s.cutGuides} onChange={v => set('cutGuides', v)} />
              <Toggle label={t('labelStudio.emblem')} on={s.emblemOn} onChange={v => set('emblemOn', v)} />

              {s.emblemOn && (
                <div
                  onDragOver={e => { e.preventDefault(); setLogoDragging(true); }}
                  onDragLeave={() => setLogoDragging(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setLogoDragging(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleLogoFile(f);
                  }}
                  onClick={() => logoInputRef.current?.click()}
                  className={`mt-2 rounded-xl border border-dashed px-3 py-3 text-center cursor-pointer transition-colors ${
                    logoDragging ? 'border-emerald-400/60 bg-emerald-400/5' : 'border-[rgba(52,211,153,0.22)]'
                  }`}
                >
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoFile(f); }}
                  />
                  {emblemSrc ? (
                    <div className="flex items-center justify-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={emblemSrc} alt="" className="h-9 w-9 object-contain" />
                      <span className="text-xs text-white/50">
                        {logoDataUrl ? t('labelStudio.emblemUploaded') : t('labelStudio.emblemFromKit')}
                      </span>
                      {logoDataUrl && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={e => { e.stopPropagation(); setLogoDataUrl(null); }}
                        >
                          {t('labelStudio.emblemRemove')}
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-white/40">{t('labelStudio.emblemDrop')}</span>
                  )}
                </div>
              )}
            </Panel>
          </div>

          {/* ── PREVIEW ──────────────────────────────────────────────── */}
          <div className="min-w-0">
            <p className="ls-noprint text-xs text-white/40 mb-2">
              {t('labelStudio.preview')} · {size.w}×{size.h}mm · {grid.cols}×{grid.rows}
            </p>
            {labels.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[rgba(52,211,153,0.2)] p-10 text-center text-white/35 text-sm">
                {t('labelStudio.emptyPreview')}
              </div>
            ) : (
              <div
                className="ls-preview relative w-full overflow-hidden"
                style={{ height: Math.max(1, scale * sheets.length * (A4_H_MM * MM_PX + 24)) }}
              >
                <div
                  id="label-sheets"
                  ref={scalerRef}
                  className="ls-scaler"
                  style={{
                    width: A4_W_MM * MM_PX,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                  }}
                >
                  {sheets.map((page, si) => (
                    <div
                      key={si}
                      className="ls-sheet relative bg-white"
                      style={{
                        width: `${A4_W_MM}mm`,
                        height: `${A4_H_MM}mm`,
                        marginBottom: 24,
                        boxShadow: '0 6px 28px rgba(0,0,0,0.45)',
                      }}
                    >
                      {page.map((l, i) => {
                        const col = i % grid.cols;
                        const row = Math.floor(i / grid.cols);
                        return (
                          <div
                            key={l.id}
                            className="ls-label absolute"
                            style={{
                              left: `${grid.offsetX + col * size.w}mm`,
                              top: `${grid.offsetY + row * size.h}mm`,
                              width: `${size.w}mm`,
                              height: `${size.h}mm`,
                              outline: s.cutGuides ? '0.1mm solid #e5e7eb' : 'none',
                              outlineOffset: '-0.05mm',
                            }}
                          >
                            <LabelCard
                              item={l}
                              w={size.w}
                              h={size.h}
                              text={applyCase(l.text, effCase)}
                              sub={
                                s.subLine === 'greeting'
                                  ? t('labelStudio.greeting')
                                  : s.subLine === 'nickname'
                                    ? l.sub || ''
                                    : ''
                              }
                              subAbove={s.subLine === 'greeting'}
                              montessori={s.theme === 'montessori'}
                              showPhoto={s.showPhoto}
                              border={s.border}
                              emblemSrc={emblemSrc}
                              editing={editingId === l.id}
                              onStartEdit={() => setEditingId(l.id)}
                              onCommit={v => { editLabel(l.id, v); setEditingId(null); }}
                              onRemove={() => removeLabel(l.id)}
                              removeLabelText={t('labelStudio.removeLabel')}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PRINT LAW: a plain string in a dangerouslySetInnerHTML <style>.
          `@page` cannot live in a scoped styled-jsx block. */}
      <style dangerouslySetInnerHTML={{ __html: `${andikaFontFaceCss()}\n${printCss()}` }} />
    </>
  );
}

/* ── the label itself ──────────────────────────────────────────────────
   Sized from its own millimetres and its own string — never from a
   viewport. Text zones get min-width:0 so a long name shrinks instead of
   pushing the photo off the card; the photo and emblem are flex-shrink:0
   so they keep their true printed diameter. */
function LabelCard({
  item, w, h, text, sub, subAbove, montessori, showPhoto, border,
  emblemSrc, editing, onStartEdit, onCommit, onRemove, removeLabelText,
}: {
  item: LabelItem;
  w: number; h: number;
  text: string;
  sub: string;
  subAbove: boolean;
  montessori: boolean;
  showPhoto: boolean;
  border: Border;
  emblemSrc: string;
  editing: boolean;
  onStartEdit: () => void;
  onCommit: (v: string) => void;
  onRemove: () => void;
  removeLabelText: string;
}) {
  const photo = showPhoto && item.photoUrl ? item.photoUrl : '';
  const strip = isStrip(w, h);
  const pad = Math.max(3, Math.min(w, h) * 0.08);
  const photoMm = photoSizeMm(w, h);
  const emMm = emblemMm(w, h);
  const fit = mainTextFit(text, w, h, { photo: !!photo, sub: !!sub, montessori });
  const fontMm = fit.fontMm;
  const subMm = subFontMm(w, h);

  const frame =
    border === 'frame'
      ? { border: '0.6mm solid #1D5C41', borderRadius: `${Math.min(w, h) * 0.09}mm` }
      : border === 'hairline'
        ? { border: '0.2mm solid #d1d5db' }
        : {};

  const textBlock = (
    <div className="flex flex-col items-center justify-center" style={{ minWidth: 0, maxWidth: '100%' }}>
      {sub && subAbove && (
        <span style={{ fontSize: `${subMm}mm`, color: '#6b7280', lineHeight: 1.1, marginBottom: `${subMm * 0.4}mm` }}>
          {sub}
        </span>
      )}
      <span
        style={{
          fontFamily: montessori
            ? "'Andika', 'Quicksand', sans-serif"
            : "'Quicksand', 'Andika', sans-serif",
          fontWeight: 700,
          fontSize: `${fontMm}mm`,
          lineHeight: MAIN_LINE_HEIGHT,
          textAlign: 'center',
          // THE LAW: never break inside a word. A single word rides on one
          // nowrap line (mainTextFit has already shrunk it to fit availW);
          // multi-word text may wrap at SPACES ONLY, never mid-word, and
          // never past two lines.
          whiteSpace: fit.nowrap ? 'nowrap' : 'normal',
          overflowWrap: 'normal',
          wordBreak: 'keep-all',
          hyphens: 'none',
          WebkitHyphens: 'none',
          minWidth: 0,
          maxWidth: '100%',
          ...(fit.nowrap
            ? { display: 'block' }
            : { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 }),
          // Clip rather than ellipsize at the 9pt floor — which no name reaches.
          overflow: 'hidden',
          textOverflow: 'clip',
        }}
      >
        {Array.from(text).map((ch, i) => (
          <span key={i} style={{ color: charColor(ch, montessori) }}>
            {ch}
          </span>
        ))}
      </span>
      {sub && !subAbove && (
        <span style={{ fontSize: `${subMm}mm`, color: '#6b7280', lineHeight: 1.1, marginTop: `${subMm * 0.4}mm` }}>
          {sub}
        </span>
      )}
    </div>
  );

  return (
    <div
      className="relative w-full h-full bg-white overflow-hidden"
      style={{ ...frame, boxSizing: 'border-box' }}
    >
      {emblemSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={emblemSrc}
          alt=""
          style={{
            position: 'absolute',
            top: `${pad * 0.5}mm`,
            right: `${pad * 0.5}mm`,
            width: `${emMm}mm`,
            height: `${emMm}mm`,
            objectFit: 'contain',
            flexShrink: 0,
          }}
        />
      )}

      <div
        className={`w-full h-full flex items-center justify-center ${strip ? 'flex-row' : 'flex-col'}`}
        style={{ padding: `${pad}mm`, gap: `${pad * 0.6}mm`, boxSizing: 'border-box' }}
      >
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt=""
            style={{
              width: `${photoMm}mm`,
              height: `${photoMm}mm`,
              borderRadius: '50%',
              objectFit: 'cover',
              flexShrink: 0,
              background: '#f3f4f6',
            }}
          />
        )}
        {textBlock}
      </div>

      {/* screen-only affordances — .ls-noprint is display:none at print time */}
      {editing ? (
        <input
          autoFocus
          defaultValue={item.text}
          onBlur={e => onCommit(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') onCommit((e.target as HTMLInputElement).value);
            if (e.key === 'Escape') onCommit(item.text);
          }}
          className="ls-noprint absolute inset-x-2 bottom-2 rounded border border-emerald-500 bg-white px-2 py-1 text-sm text-black outline-none"
        />
      ) : (
        <button
          type="button"
          aria-label={removeLabelText}
          onClick={onStartEdit}
          className="ls-noprint absolute inset-0 cursor-text bg-transparent"
        />
      )}
      <button
        type="button"
        aria-label={removeLabelText}
        onClick={onRemove}
        className="ls-noprint absolute top-1 left-1 h-6 w-6 rounded-full bg-black/25 text-white text-xs leading-none hover:bg-red-600"
      >
        ✕
      </button>
    </div>
  );
}

/* ── dark-forest chrome primitives ─────────────────────────────────────
   Buttons anywhere in this page are .btn .btn-<variant> .btn-<size> per
   the design system; these are panels and chips, not buttons-in-disguise. */
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(52,211,153,0.15)] p-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300/70 mb-2">{title}</h2>
      {children}
    </section>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1.5 text-xs transition-colors border ${
        active
          ? 'bg-emerald-400/15 border-emerald-400/50 text-emerald-100'
          : 'bg-white/[0.03] border-[rgba(52,211,153,0.15)] text-white/60 hover:text-white/85'
      }`}
    >
      {children}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="text-[11px] text-white/40 mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer">
      <span className="text-xs text-white/60">{label}</span>
      <input type="checkbox" checked={on} onChange={e => onChange(e.target.checked)} className="accent-emerald-400" />
    </label>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-white/45">{label}</span>
      <input
        type="number"
        min={CUSTOM_MIN_MM}
        max={CUSTOM_MAX_MM}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-20 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(52,211,153,0.15)] px-2 py-1.5 text-sm text-white/85 outline-none focus:border-emerald-400/40"
      />
    </label>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-white/45">{label}</span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-20 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(52,211,153,0.15)] px-2 py-1.5 text-sm text-white/85 outline-none focus:border-emerald-400/40"
      />
    </label>
  );
}
