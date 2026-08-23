// components/montree/paper-scan/LayoutTeacher.tsx
//
// "Teach Montree your sheet" (plan §3, Layer 1). The teacher photographs their
// OWN observation sheet once; Sonnet writes a layout profile; the teacher reads
// the profile back in plain language and activates it. Every scan afterwards is
// read with that profile in the prompt.
//
// Deliberately small: a collapsed card on the Paper Scan home screen that says
// which sheet is in use, and opens into upload → learn → preview → activate.

'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { BookOpenCheck, ChevronDown, ChevronUp, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { compressImage } from '@/lib/montree/media/compression';
import type { SheetLayoutSummary } from '@/lib/montree/paper-scan/layout-types';

const MAX_PHOTOS = 3;

/** Literal keys (not a template string) so TranslationKey stays checkable. */
function statusKey(status: string) {
  if (status === 'mastered') return 'status.mastered' as const;
  if (status === 'practicing') return 'status.practicing' as const;
  return 'status.presented' as const;
}

function bucketKey(bucket?: string) {
  if (bucket === 'short') return 'paperScan.fields.bucketShort' as const;
  if (bucket === 'medium') return 'paperScan.fields.bucketMedium' as const;
  return 'paperScan.fields.bucketLong' as const;
}

interface Props {
  classroomId: string;
  locale?: string;
}

export default function LayoutTeacher({ classroomId, locale }: Props) {
  const { t } = useI18n();

  const [open, setOpen] = useState(false);
  const [layouts, setLayouts] = useState<SheetLayoutSummary[]>([]);
  const [active, setActive] = useState<SheetLayoutSummary | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [learning, setLearning] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [learned, setLearned] = useState<SheetLayoutSummary | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    if (!classroomId) return;
    try {
      const res = await montreeApi(`/api/montree/paper-scan/layouts?classroom_id=${encodeURIComponent(classroomId)}`);
      if (!res.ok) throw new Error(`Layouts: ${res.status}`);
      const data = await res.json();
      setLayouts(Array.isArray(data?.layouts) ? data.layouts : []);
      setActive(data?.active ?? null);
    } catch (err) {
      console.error('[paper-scan] Layout list error:', err);
    }
  }, [classroomId]);

  useEffect(() => { void load(); }, [load]);

  const onPick = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []).slice(0, MAX_PHOTOS);
    e.target.value = ''; // picking the same file twice must still fire change
    setFiles(picked);
    setLearned(null);
  }, []);

  const learn = useCallback(async () => {
    if (files.length === 0 || !classroomId) return;
    setLearning(true);
    setLearned(null);
    try {
      const fd = new FormData();
      for (const file of files) {
        let blob: Blob = file;
        try {
          const compressed = await compressImage(file);
          blob = compressed.blob;
        } catch (err) {
          console.error('[paper-scan] Layout photo compression failed, using original:', err);
        }
        fd.append('photos', blob, 'sheet.jpg');
      }
      fd.append('classroom_id', classroomId);
      if (name.trim()) fd.append('name', name.trim());
      if (notes.trim()) fd.append('notes', notes.trim());
      if (locale) fd.append('locale', locale);

      // Multipart goes through plain fetch — montreeApi sets a JSON
      // content-type, which would destroy the boundary.
      const res = await fetch('/api/montree/paper-scan/layouts/learn', { method: 'POST', body: fd });
      if (!res.ok) throw new Error(`Learn: ${res.status}`);
      const data = await res.json();
      if (!data?.layout) throw new Error('No layout returned');

      setLearned(data.layout as SheetLayoutSummary);
      setExpandedId((data.layout as SheetLayoutSummary).id);
      setFiles([]);
      await load();
      toast.success(t('paperScan.layout.learned'));
    } catch (err) {
      console.error('[paper-scan] Layout learn error:', err);
      toast.error(t('paperScan.layout.learnFailed'));
    } finally {
      setLearning(false);
    }
  }, [files, classroomId, name, notes, locale, load, t]);

  const patch = useCallback(async (id: string, action: 'activate' | 'retire') => {
    setBusyId(id);
    try {
      const res = await montreeApi(`/api/montree/paper-scan/layouts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(`Layout ${action}: ${res.status}`);
      await load();
      setLearned(null);
    } catch (err) {
      console.error(`[paper-scan] Layout ${action} error:`, err);
      toast.error(t('paperScan.layout.activateFailed'));
    } finally {
      setBusyId(null);
    }
  }, [load, t]);

  const stored = useMemo(() => layouts.filter((l) => l.id !== null), [layouts]);
  const builtin = useMemo(() => layouts.find((l) => l.id === null) ?? null, [layouts]);

  const statusLabel = (layout: SheetLayoutSummary): string => {
    if (layout.source === 'builtin') return t('paperScan.layout.builtinBadge');
    if (layout.status === 'active') return t('paperScan.layout.activeBadge');
    if (layout.status === 'retired') return t('paperScan.layout.retiredBadge');
    return t('paperScan.layout.draftBadge');
  };

  const renderProfile = (layout: SheetLayoutSummary) => (
    <div className="mt-3 space-y-3 text-[12px] text-white/70">
      <div className="text-white/50">
        {t('paperScan.layout.columns').replace('{count}', String(layout.summary.columns))}
        {' · '}
        {layout.summary.structure_kind}
        {' · '}
        {layout.summary.orientation}
      </div>

      {layout.summary.status_marks.length > 0 && (
        <div>
          <div className="text-white/45 mb-1">{t('paperScan.layout.statusMarks')}</div>
          <ul className="space-y-0.5">
            {layout.summary.status_marks.map((m, i) => (
              <li key={i}>· {m.mark} → {t(statusKey(m.status))}</li>
            ))}
          </ul>
        </div>
      )}

      {layout.summary.time_marks.length > 0 && (
        <div>
          <div className="text-white/45 mb-1">{t('paperScan.layout.timeMarks')}</div>
          <ul className="space-y-0.5">
            {layout.summary.time_marks.map((m, i) => (
              <li key={i}>
                · {m.mark}
                {m.time_bucket ? ` → ${t(bucketKey(m.time_bucket))}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {layout.summary.tally_convention && (
        <div>
          <div className="text-white/45 mb-1">{t('paperScan.layout.tally')}</div>
          <p>{layout.summary.tally_convention}</p>
        </div>
      )}

      {layout.summary.concentration_codes.length > 0 && (
        <div>
          <div className="text-white/45 mb-1">{t('paperScan.layout.concentrationCodes')}</div>
          <p>{layout.summary.concentration_codes.map((c) => `${c.code} → ${c.value.toUpperCase()}`).join(' · ')}</p>
        </div>
      )}

      {layout.summary.reading_instructions && (
        <div>
          <div className="text-white/45 mb-1">{t('paperScan.layout.readingInstructions')}</div>
          <p className="leading-relaxed">{layout.summary.reading_instructions}</p>
        </div>
      )}

      {layout.summary.pitfalls.length > 0 && (
        <div>
          <div className="text-white/45 mb-1">{t('paperScan.layout.pitfalls')}</div>
          <ul className="space-y-0.5">
            {layout.summary.pitfalls.map((p, i) => <li key={i}>· {p}</li>)}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <div className="mt-4 rounded-2xl border border-[rgba(52,211,153,0.15)] bg-white/[0.04] p-4 text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3"
      >
        <span className="flex items-center gap-2 min-w-0">
          <BookOpenCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-white/90 text-left">{t('paperScan.layout.title')}</span>
            <span className="block text-[11px] text-white/45 truncate text-left">
              {active
                ? t('paperScan.layout.activeNow').replace('{name}', active.name)
                : t('paperScan.layout.noneActive')}
            </span>
          </span>
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
      </button>

      {open && (
        <div className="mt-4">
          <p className="text-[12px] text-white/55 leading-snug">{t('paperScan.layout.intro')}</p>
          <p className="text-[11px] text-white/35 mt-1 leading-snug">{t('paperScan.layout.privacyNote')}</p>

          {/* ── Teach ── */}
          <div className="mt-3 space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={onPick}
              className="hidden"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('paperScan.layout.namePlaceholder')}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-[rgba(52,211,153,0.2)] text-white/90 text-sm"
            />
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('paperScan.layout.notesPlaceholder')}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-[rgba(52,211,153,0.2)] text-white/90 text-sm"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={learning}
              className="btn btn-secondary btn-full"
            >
              <Upload className="w-4 h-4" />
              {files.length > 0
                ? t('paperScan.layout.photosChosen').replace('{count}', String(files.length))
                : t('paperScan.layout.choosePhotos')}
            </button>
            <button
              type="button"
              onClick={() => { void learn(); }}
              disabled={learning || files.length === 0}
              className="btn btn-primary btn-full"
            >
              {learning ? t('paperScan.layout.learning') : t('paperScan.layout.learn')}
            </button>
          </div>

          {learned && (
            <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/[0.08] p-3">
              <div className="text-sm font-semibold text-white/90">{learned.name}</div>
              <div className="text-[11px] text-emerald-300/80">{t('paperScan.layout.learned')}</div>
              {renderProfile(learned)}
              {learned.id && (
                <button
                  type="button"
                  disabled={busyId === learned.id}
                  onClick={() => { void patch(learned.id as string, 'activate'); }}
                  className="btn btn-primary btn-sm btn-full mt-3"
                >
                  {busyId === learned.id ? t('paperScan.layout.activating') : t('paperScan.layout.activate')}
                </button>
              )}
            </div>
          )}

          {/* ── Stored profiles ── */}
          {(stored.length > 0 || builtin) && (
            <div className="mt-4 space-y-2">
              {[...stored, ...(builtin ? [builtin] : [])].map((layout) => {
                const key = layout.id ?? 'builtin';
                const isExpanded = expandedId === key;
                return (
                  <div key={key} className="rounded-xl border border-[rgba(52,211,153,0.12)] bg-white/[0.04] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm text-white/90 truncate">{layout.name}</div>
                        <div className="text-[11px] text-white/40">
                          {statusLabel(layout)}
                          {layout.template_code ? ` · ${layout.template_code}` : ''}
                          {layout.version > 1 ? ` · v${layout.version}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {layout.id && layout.status !== 'active' && (
                          <button
                            type="button"
                            disabled={busyId === layout.id}
                            onClick={() => { void patch(layout.id as string, 'activate'); }}
                            className="btn btn-secondary btn-sm"
                          >
                            {t('paperScan.layout.activate')}
                          </button>
                        )}
                        {layout.id && layout.status === 'active' && (
                          <button
                            type="button"
                            disabled={busyId === layout.id}
                            onClick={() => { void patch(layout.id as string, 'retire'); }}
                            className="btn btn-secondary btn-sm"
                          >
                            {t('paperScan.layout.retire')}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : key)}
                          className="btn btn-ghost btn-icon btn-sm"
                          aria-label={t('paperScan.layout.showDetails')}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {isExpanded && renderProfile(layout)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
