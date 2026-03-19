// app/montree/dashboard/albums/page.tsx
// Album export page — select child, date range, filters → preview & export
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { getSession } from '@/lib/montree/auth';
import { useI18n } from '@/lib/montree/i18n';
import type { MontreeChild, MontreeEvent } from '@/lib/montree/media/types';

interface AlbumGroup {
  date: string;
  event_name: string | null;
  event_id: string | null;
  photos: Record<string, unknown>[];
}

export default function AlbumsPage() {
  const router = useRouter();
  const { t } = useI18n();

  // Session
  const [schoolId, setSchoolId] = useState('');
  const [children, setChildren] = useState<MontreeChild[]>([]);
  const [events, setEvents] = useState<MontreeEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedChildId, setSelectedChildId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [includeCurriculum, setIncludeCurriculum] = useState(true);
  const [includeEvents, setIncludeEvents] = useState(true);
  const [filterEventId, setFilterEventId] = useState('');

  // Results
  const [groups, setGroups] = useState<AlbumGroup[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [previewing, setPreviewing] = useState(false);

  // Init
  useEffect(() => {
    const session = getSession();
    if (!session?.school?.id) {
      router.push('/montree/login');
      return;
    }
    setSchoolId(session.school.id);

    // Set default date range: start of year to today
    const now = new Date();
    setDateFrom(`${now.getFullYear()}-01-01`);
    setDateTo(now.toISOString().slice(0, 10));
  }, [router]);

  // Fetch children
  useEffect(() => {
    if (!schoolId) return;
    const fetchChildren = async () => {
      try {
        const res = await fetch('/api/montree/children');
        if (!res.ok) return;
        const data = await res.json();
        if (data.children) setChildren(data.children);
      } catch (err) {
        console.error('Failed to fetch children:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchChildren();
  }, [schoolId]);

  // Fetch events
  useEffect(() => {
    if (!schoolId) return;
    fetch('/api/montree/events')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.events) setEvents(data.events); })
      .catch(err => console.error('Failed to fetch events:', err));
  }, [schoolId]);

  // Preview album
  const handlePreview = useCallback(async () => {
    if (!selectedChildId || !dateFrom || !dateTo) {
      toast.error('Select a child and date range');
      return;
    }
    setPreviewing(true);
    try {
      const res = await fetch('/api/montree/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: selectedChildId,
          date_from: dateFrom,
          date_to: dateTo,
          include_curriculum: includeCurriculum,
          include_events: includeEvents,
          event_id: filterEventId || undefined,
        }),
      });
      if (!res.ok) {
        toast.error('Failed to load album');
        return;
      }
      const data = await res.json();
      setGroups(data.groups || []);
      setUrls(data.urls || {});
      setTotalPhotos(data.total_photos || 0);
    } catch (err) {
      console.error('Album preview error:', err);
      toast.error('Failed to load album');
    } finally {
      setPreviewing(false);
    }
  }, [selectedChildId, dateFrom, dateTo, includeCurriculum, includeEvents, filterEventId]);

  // Quick date presets
  const setPreset = (preset: string) => {
    const now = new Date();
    const year = now.getFullYear();
    setDateTo(now.toISOString().slice(0, 10));
    switch (preset) {
      case 'year':
        setDateFrom(`${year}-01-01`);
        break;
      case 'semester1':
        setDateFrom(`${year}-01-01`);
        setDateTo(`${year}-06-30`);
        break;
      case 'semester2':
        setDateFrom(`${year}-07-01`);
        setDateTo(`${year}-12-31`);
        break;
      case 'term':
        // Last 3 months
        const threeMonthsAgo = new Date(now);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        setDateFrom(threeMonthsAgo.toISOString().slice(0, 10));
        break;
    }
  };

  const childName = children.find(c => c.id === selectedChildId)?.name || '';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-500 text-xl">←</button>
        <h1 className="text-lg font-bold text-gray-900">{t('albums.title')}</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Child selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('childSelector.selectChild') || 'Select Child'}
          </label>
          <select
            value={selectedChildId}
            onChange={e => setSelectedChildId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
          >
            <option value="">-- Choose --</option>
            {children.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('albums.dateFrom')}</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('albums.dateTo')}</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900" />
          </div>
        </div>

        {/* Quick presets */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'year', label: t('albums.thisYear') },
            { key: 'semester1', label: 'Semester 1' },
            { key: 'semester2', label: 'Semester 2' },
            { key: 'term', label: t('albums.thisTerm') },
          ].map(p => (
            <button key={p.key} onClick={() => setPreset(p.key)}
              className="px-3 py-1.5 text-sm rounded-full border border-gray-300 text-gray-700 bg-white active:bg-gray-100">
              {p.label}
            </button>
          ))}
        </div>

        {/* Filter toggles */}
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={includeCurriculum}
              onChange={e => setIncludeCurriculum(e.target.checked)}
              className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-500" />
            {t('albums.includeCurriculum')}
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={includeEvents}
              onChange={e => setIncludeEvents(e.target.checked)}
              className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-500" />
            {t('albums.includeEvents')}
          </label>
        </div>

        {/* Event filter (optional) */}
        {includeEvents && events.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('events.filterByEvent') || 'Filter by Event'}
            </label>
            <select value={filterEventId} onChange={e => setFilterEventId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900">
              <option value="">All Events</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.name} ({ev.event_date})</option>
              ))}
            </select>
          </div>
        )}

        {/* Preview button */}
        <button
          onClick={handlePreview}
          disabled={!selectedChildId || !dateFrom || !dateTo || previewing}
          className="w-full py-3 rounded-xl bg-emerald-500 text-white font-bold text-lg disabled:opacity-40 active:scale-[0.98] transition-all"
        >
          {previewing ? t('albums.generating') : `Preview Album${childName ? ` for ${childName}` : ''}`}
        </button>

        {/* Results */}
        {totalPhotos > 0 && (
          <div className="space-y-4">
            <div className="text-center text-sm text-gray-500">
              {t('albums.photoCount').replace('{count}', String(totalPhotos))}
            </div>

            {groups.map((group, gi) => (
              <div key={`${group.date}-${group.event_id || 'cur'}-${gi}`} className="bg-white rounded-xl p-4 shadow-sm">
                {/* Group header */}
                <div className="flex items-center gap-2 mb-3">
                  {group.event_name ? (
                    <>
                      <span className="text-lg">🎉</span>
                      <div>
                        <span className="font-bold text-gray-900">{group.event_name}</span>
                        <span className="text-gray-500 text-sm block">{group.date}</span>
                      </div>
                    </>
                  ) : (
                    <span className="font-medium text-gray-700">{group.date}</span>
                  )}
                  <span className="ml-auto text-xs text-gray-400">
                    {group.photos.length} photo{group.photos.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Photo grid */}
                <div className="grid grid-cols-3 gap-2">
                  {group.photos.map((photo) => {
                    const path = (photo.thumbnail_path || photo.storage_path) as string;
                    const url = urls[path];
                    return (
                      <div key={photo.id as string} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                        {url ? (
                          <img src={url} alt={photo.caption as string || ''} loading="lazy" decoding="async"
                            className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">📷</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No photos state */}
        {totalPhotos === 0 && groups.length === 0 && !previewing && selectedChildId && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">📷</div>
            <p>{t('albums.noPhotos')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
