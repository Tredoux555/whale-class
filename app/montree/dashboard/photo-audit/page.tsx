// @ts-nocheck — audit page, will type-check incrementally
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/montree/i18n';
import WorkWheelPicker from '@/components/montree/WorkWheelPicker';

const AREAS = [
  { key: 'practical_life', label: 'Practical Life', color: '#10b981' },
  { key: 'sensorial', label: 'Sensorial', color: '#f59e0b' },
  { key: 'mathematics', label: 'Mathematics', color: '#6366f1' },
  { key: 'language', label: 'Language', color: '#ec4899' },
  { key: 'cultural', label: 'Cultural', color: '#8b5cf6' },
  { key: 'special_events', label: 'Special Events', color: '#f43f5e' },
];

interface AuditPhoto {
  id: string;
  child_id: string;
  child_name: string;
  classroom_id: string;
  work_id: string | null;
  work_name: string | null;
  area: string | null;
  confidence: number | null;
  scenario: string | null;
  zone: 'green' | 'amber' | 'red' | 'untagged';
  url: string | null;
  auto_crop: { x: number; y: number; width: number; height: number } | null;
  captured_at: string;
}

type Zone = 'all' | 'green' | 'amber' | 'red' | 'untagged';
type DateRange = '24h' | '7d' | '30d' | 'all';

export default function PhotoAuditPage() {
  const { t } = useI18n();
  const abortRef = useRef<AbortController | null>(null);

  // Core state
  const [photos, setPhotos] = useState<AuditPhoto[]>([]);
  const [counts, setCounts] = useState({ green: 0, amber: 0, red: 0, untagged: 0 });
  const [loading, setLoading] = useState(true);
  const [zone, setZone] = useState<Zone>('all');
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [page, setPage] = useState(0);
  const [curriculum, setCurriculum] = useState<Record<string, any[]>>({});

  // Correction state
  const [correctingPhoto, setCorrectingPhoto] = useState<AuditPhoto | null>(null);
  const [pickerArea, setPickerArea] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showAreaPicker, setShowAreaPicker] = useState(false);

  // Batch state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  // Load curriculum on mount for WorkWheelPicker
  useEffect(() => {
    let cancelled = false;
    fetch('/api/montree/curriculum')
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const byArea: Record<string, any[]> = {};
        for (const w of data.works || []) {
          if (!byArea[w.area_key]) byArea[w.area_key] = [];
          byArea[w.area_key].push(w);
        }
        setCurriculum(byArea);
      })
      .catch(() => {}); // Non-fatal
    return () => { cancelled = true; };
  }, []);

  // Fetch photos when zone/date/page changes
  const fetchPhotos = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    const dateFrom = dateRange === '24h' ? new Date(Date.now() - 86400000).toISOString()
      : dateRange === '7d' ? new Date(Date.now() - 7 * 86400000).toISOString()
      : dateRange === '30d' ? new Date(Date.now() - 30 * 86400000).toISOString()
      : '2020-01-01T00:00:00Z';

    try {
      const res = await fetch(
        `/api/montree/audit/photos?zone=${zone}&date_from=${dateFrom}&limit=100&offset=${page * 100}`,
        { signal: controller.signal }
      );
      if (controller.signal.aborted) return;
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setPhotos(data.photos);
      setCounts(data.counts);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      toast.error(t('audit.fetchError'));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone, dateRange, page]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);
  useEffect(() => { return () => { abortRef.current?.abort(); }; }, []);

  const handleZoneChange = (z: Zone) => { setZone(z); setPage(0); setSelectedIds(new Set()); };
  const handleDateChange = (d: DateRange) => { setDateRange(d); setPage(0); setSelectedIds(new Set()); };

  // Single confirm
  const handleConfirm = async (photo: AuditPhoto) => {
    setProcessingId(photo.id);
    try {
      const res = await fetch('/api/montree/guru/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_id: photo.id,
          child_id: photo.child_id,
          original_work_name: photo.work_name || '',
          original_work_id: photo.work_id || '',
          original_area: photo.area || '',
          original_confidence: photo.confidence || 0,
          action: 'confirm',
        }),
      });
      if (!res.ok) throw new Error('confirm failed');
      setPhotos(prev => prev.map(p =>
        p.id === photo.id ? { ...p, zone: 'green' as const, confidence: 1.0 } : p
      ));
      toast.success(t('audit.confirmed'));
    } catch {
      toast.error(t('audit.confirmFailed'));
    } finally {
      setProcessingId(null);
    }
  };

  // Single correction — opens area picker or work picker
  const handleCorrect = (photo: AuditPhoto) => {
    setCorrectingPhoto(photo);
    if (!photo.area) {
      setShowAreaPicker(true);
    } else {
      setPickerArea(photo.area);
      setPickerOpen(true);
    }
  };

  // Work selected from WorkWheelPicker — submit correction
  const handleWorkSelected = async (work: any) => {
    if (!correctingPhoto) return;
    setProcessingId(correctingPhoto.id);
    setPickerOpen(false);
    try {
      const res = await fetch('/api/montree/guru/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_id: correctingPhoto.id,
          child_id: correctingPhoto.child_id,
          original_work_name: correctingPhoto.work_name || 'Unknown',
          original_work_id: correctingPhoto.work_id || '',
          original_area: correctingPhoto.area || '',
          original_confidence: correctingPhoto.confidence || 0,
          corrected_work_name: work.name,
          corrected_work_id: work.id,
          corrected_area: pickerArea,
        }),
      });
      if (!res.ok) throw new Error('correction failed');
      setPhotos(prev => prev.map(p =>
        p.id === correctingPhoto.id
          ? { ...p, work_id: work.id, work_name: work.name, area: pickerArea, zone: 'green' as const, confidence: 1.0 }
          : p
      ));
      toast.success(t('audit.corrected'));
    } catch {
      toast.error(t('audit.correctionFailed'));
    } finally {
      setProcessingId(null);
    }
    setCorrectingPhoto(null);
  };

  // Batch confirm with rate limit protection
  const handleBatchConfirm = async () => {
    const ids = Array.from(selectedIds);
    setBatchProcessing(true);
    setBatchProgress({ current: 0, total: ids.length });
    let succeeded = 0;
    const failed: string[] = [];

    for (let i = 0; i < ids.length; i++) {
      const photo = photos.find(p => p.id === ids[i]);
      if (!photo || !photo.work_id) { failed.push(ids[i]); continue; }
      try {
        const res = await fetch('/api/montree/guru/corrections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            media_id: photo.id,
            child_id: photo.child_id,
            original_work_name: photo.work_name || '',
            original_work_id: photo.work_id || '',
            original_area: photo.area || '',
            original_confidence: photo.confidence || 0,
            action: 'confirm',
          }),
        });
        if (!res.ok) throw new Error();
        succeeded++;
        setPhotos(prev => prev.map(p =>
          p.id === photo.id ? { ...p, zone: 'green' as const, confidence: 1.0 } : p
        ));
      } catch {
        failed.push(ids[i]);
      }
      setBatchProgress({ current: i + 1, total: ids.length });
      // Rate limit: 2500ms delay = 24/min (under corrections 30/min limit)
      if (i < ids.length - 1) await new Promise(r => setTimeout(r, 2500));
    }
    setBatchProcessing(false);
    setSelectedIds(new Set(failed));
    if (failed.length === 0) {
      toast.success(t('audit.batchComplete'));
    } else {
      toast.error(t('audit.batchPartial', { succeeded, total: ids.length }));
    }
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    const visible = filteredPhotos.map(p => p.id);
    setSelectedIds(new Set(visible));
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Works for selected area (feeds WorkWheelPicker)
  const areaWorks = useMemo(() => {
    if (!pickerArea) return [];
    return (curriculum[pickerArea] || []).map((w: any) => ({
      ...w,
      id: w.id || w.work_key || w.name,
    }));
  }, [pickerArea, curriculum]);

  // Filter photos by zone
  const filteredPhotos = useMemo(() => {
    if (zone === 'all') return photos;
    return photos.filter(p => p.zone === zone);
  }, [photos, zone]);

  // Paginate
  const PAGE_SIZE = 24;
  const pagedPhotos = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filteredPhotos.slice(start, start + PAGE_SIZE);
  }, [filteredPhotos, page]);
  const totalPages = Math.ceil(filteredPhotos.length / PAGE_SIZE);

  // Reset page on zone change
  useEffect(() => { setPage(0); }, [zone]);

  // Zone tab config
  const ZONE_TABS: { key: Zone; label: string; color: string; count: number }[] = [
    { key: 'all', label: t('audit.all'), color: 'bg-gray-100 text-gray-700', count: counts.green + counts.amber + counts.red + counts.untagged },
    { key: 'red', label: t('audit.red'), color: 'bg-red-100 text-red-700', count: counts.red },
    { key: 'amber', label: t('audit.amber'), color: 'bg-amber-100 text-amber-700', count: counts.amber },
    { key: 'untagged', label: t('audit.untagged'), color: 'bg-gray-200 text-gray-600', count: counts.untagged },
    { key: 'green', label: t('audit.green'), color: 'bg-emerald-100 text-emerald-700', count: counts.green },
  ];

  // ─── JSX ───
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">{t('audit.title')}</h1>
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value as DateRange)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="7d">{t('audit.last7d')}</option>
            <option value="30d">{t('audit.last30d')}</option>
            <option value="all">{t('audit.allTime')}</option>
          </select>
        </div>

        {/* Zone tabs */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {ZONE_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setZone(tab.key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                zone === tab.key ? tab.color + ' ring-2 ring-offset-1 ring-current' : 'bg-gray-50 text-gray-400'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredPhotos.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-2">📷</p>
          <p>{t('audit.noPhotos')}</p>
        </div>
      )}

      {/* Photo grid */}
      {!loading && filteredPhotos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-3">
          {pagedPhotos.map(photo => (
            <AuditPhotoCard
              key={photo.id}
              photo={photo}
              selected={selectedIds.has(photo.id)}
              onToggle={() => toggleSelect(photo.id)}
              onConfirm={() => handleConfirm(photo)}
              onCorrect={() => handleCorrect(photo)}
              processing={processingId === photo.id}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 py-4">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 rounded border disabled:opacity-30"
          >
            ←
          </button>
          <span className="text-sm text-gray-500">
            {page + 1} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 rounded border disabled:opacity-30"
          >
            →
          </button>
        </div>
      )}

      {/* Batch action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg px-4 py-3 z-20">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <span className="text-sm font-medium">
              {t('audit.selected', { count: selectedIds.size })}
            </span>
            <div className="flex gap-2">
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 text-sm rounded border text-gray-600"
              >
                {t('audit.clearSelection')}
              </button>
              <button
                onClick={handleBatchConfirm}
                disabled={batchProcessing}
                className="px-3 py-1.5 text-sm rounded bg-emerald-600 text-white disabled:opacity-50"
              >
                {batchProcessing
                  ? `${batchProgress.current}/${batchProgress.total}...`
                  : t('audit.confirmSelected')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Select All bar (when no selection) */}
      {selectedIds.size === 0 && filteredPhotos.length > 0 && !loading && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 z-20">
          <div className="flex items-center justify-center">
            <button
              onClick={selectAllVisible}
              className="px-4 py-1.5 text-sm rounded border text-gray-600"
            >
              {t('audit.selectAll')} ({filteredPhotos.length})
            </button>
          </div>
        </div>
      )}

      {/* Area picker modal (shown when correcting) */}
      {correctingPhoto && !pickerArea && (
        <div className="fixed inset-0 z-30 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setCorrectingPhoto(null)}
        >
          <div className="bg-white rounded-xl p-5 w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">{t('audit.pickArea')}</h3>
            <div className="grid grid-cols-1 gap-2">
              {AREAS.map(a => (
                <button
                  key={a.key}
                  onClick={() => setPickerArea(a.key)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg border hover:bg-gray-50 text-left"
                >
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: a.color }}>
                    {a.key[0].toUpperCase()}
                  </span>
                  <span className="font-medium">{a.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setCorrectingPhoto(null)}
              className="mt-4 w-full py-2 text-sm text-gray-500"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* WorkWheelPicker (shown after area selected) */}
      {correctingPhoto && pickerArea && (
        <WorkWheelPicker
          isOpen={true}
          onClose={() => { setCorrectingPhoto(null); setPickerArea(null); }}
          area={pickerArea}
          works={areaWorks}
          currentWorkName={correctingPhoto.work_name || undefined}
          onSelectWork={handleWorkSelected}
        />
      )}
    </div>
  );
}

// ─── AuditPhotoCard ───
function AuditPhotoCard({ photo, selected, onToggle, onConfirm, onCorrect, processing, t }: {
  photo: AuditPhoto;
  selected: boolean;
  onToggle: () => void;
  onConfirm: () => void;
  onCorrect: () => void;
  processing: boolean;
  t: (key: string) => string;
}) {
  const zoneColors: Record<string, string> = {
    green: 'border-emerald-400',
    amber: 'border-amber-400',
    red: 'border-red-400',
    untagged: 'border-gray-300',
  };

  const zoneBadge: Record<string, string> = {
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    untagged: 'bg-gray-400',
  };

  return (
    <div className={`relative rounded-lg overflow-hidden border-2 ${
      selected ? 'ring-2 ring-blue-500 ring-offset-1' : ''
    } ${zoneColors[photo.zone] || 'border-gray-200'}`}>
      {/* Selection checkbox */}
      <button
        onClick={onToggle}
        className="absolute top-1.5 left-1.5 z-10 w-6 h-6 rounded border-2 bg-white/80 flex items-center justify-center"
      >
        {selected && <span className="text-blue-600 text-sm font-bold">✓</span>}
      </button>

      {/* Zone badge */}
      <div className={`absolute top-1.5 right-1.5 z-10 w-3 h-3 rounded-full ${zoneBadge[photo.zone]}`} />

      {/* Photo */}
      <div className="aspect-square bg-gray-100">
        {photo.url ? (
          <img
            src={photo.url}
            alt={photo.work_name || 'Photo'}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl">📷</div>
        )}
      </div>

      {/* Info + actions */}
      <div className="p-2 bg-white">
        <p className="text-xs font-medium truncate">{photo.work_name || t('audit.untaggedWork')}</p>
        <p className="text-[10px] text-gray-400 truncate">{photo.child_name || ''}</p>
        {photo.confidence !== null && (
          <p className="text-[10px] text-gray-400">
            {Math.round(photo.confidence * 100)}%
          </p>
        )}
        <div className="flex gap-1 mt-1.5">
          {photo.zone !== 'green' && photo.work_id && (
            <button
              onClick={onConfirm}
              disabled={processing}
              className="flex-1 text-[10px] py-1 rounded bg-emerald-50 text-emerald-700 font-medium disabled:opacity-50"
            >
              {processing ? '...' : `✓ ${t('audit.confirm')}`}
            </button>
          )}
          <button
            onClick={onCorrect}
            disabled={processing}
            className="flex-1 text-[10px] py-1 rounded bg-gray-100 text-gray-600 font-medium disabled:opacity-50"
          >
            ✏️ {t('audit.fix')}
          </button>
        </div>
      </div>
    </div>
  );
}
