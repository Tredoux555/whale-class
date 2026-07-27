// app/montree/dashboard/media/page.tsx
// Media gallery page - view, edit, delete photos
// Phase 2 - Session 53 + Testing Week enhancements

'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '@/lib/montree/i18n';
import MediaGallery from '@/components/montree/media/MediaGallery';
import MediaDetailModal from '@/components/montree/media/MediaDetailModal';
import type { MontreeMedia, MontreeChild, MontreeEvent } from '@/lib/montree/media/types';

// ============================================
// TYPES
// ============================================

type FilterTab = 'all' | 'untagged' | 'recent';
type AreaFilter = 'all' | 'practical_life' | 'sensorial' | 'mathematics' | 'language' | 'cultural';

const AREA_LABELS: Record<AreaFilter, string> = {
  'all': 'media.all_areas',
  'practical_life': 'media.practical_life',
  'sensorial': 'media.sensorial',
  'mathematics': 'media.mathematics',
  'language': 'media.language',
  'cultural': 'media.cultural',
};

// ============================================
// COMPONENT
// ============================================

function MediaPageContent() {
  const { t } = useI18n();
  const [media, setMedia] = useState<MontreeMedia[]>([]);
  const [children, setChildren] = useState<MontreeChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('recent');
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MontreeMedia | null>(null);
  const [selectedArea, setSelectedArea] = useState<AreaFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ── Special-event filter ──────────────────────────────────────────────────
  // A teacher who captured a morning of "Art Camp" photos had nowhere to go and
  // confirm they landed on the event. The list API already supports ?event_id=,
  // so the gallery just exposes it as a chip row. Deep-linkable via ?event=<id>
  // so any surface holding an event id can hand the teacher straight here.
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<MontreeEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(searchParams.get('event'));
  // Server-side exact count — survives the page limit, so the header can say
  // "12 photos" even when we only rendered the first page.
  const [totalCount, setTotalCount] = useState(0);

  // ============================================
  // FETCH DATA
  // ============================================

  const fetchMedia = useCallback(async () => {
    try {
      setLoading(true);

      // Build query params
      const params = new URLSearchParams();
      // An event album is meant to be seen whole, not paged — pull a big page
      // when one is selected, keep the cheap default otherwise.
      params.set('limit', selectedEventId ? '200' : '50');

      if (activeTab === 'untagged') {
        params.set('untagged_only', 'true');
      }

      if (selectedChildId) {
        params.set('child_id', selectedChildId);
      }

      // Add area filter parameter
      if (selectedArea && selectedArea !== 'all') {
        params.set('area', selectedArea);
      }

      if (selectedEventId) {
        params.set('event_id', selectedEventId);
      }

      const response = await fetch(`/api/montree/media?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch media');
      }
      const data = await response.json();

      if (data.success) {
        setMedia(data.media || []);
        setTotalCount(typeof data.total === 'number' ? data.total : (data.media?.length || 0));
      }
    } catch (err) {
      console.error('Failed to fetch media:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedChildId, selectedArea, selectedEventId]);

  const fetchChildren = useCallback(async () => {
    try {
      const response = await fetch('/api/montree/children');
      if (!response.ok) {
        throw new Error('Failed to fetch children');
      }
      const data = await response.json();
      setChildren(data.children || []);
    } catch (err) {
      console.error('Failed to fetch children:', err);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const response = await fetch('/api/montree/events');
      if (!response.ok) return;
      const data = await response.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  }, []);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  // ============================================
  // HANDLERS
  // ============================================

  // Event and child filters are mutually exclusive: the list API's child branch
  // ignores event_id entirely, so letting both be active would show a set the
  // chips don't describe.
  const selectEvent = (eventId: string | null) => {
    setSelectedEventId(eventId);
    if (eventId) {
      setSelectedChildId(null);
      setActiveTab('all');
    }
  };

  const handleMediaClick = (item: MontreeMedia) => {
    setSelectedMedia(item);
  };

  const handleMediaUpdate = (updatedMedia: MontreeMedia) => {
    setMedia(prev => prev.map(m => m.id === updatedMedia.id ? updatedMedia : m));
  };

  const handleMediaDelete = (id: string) => {
    setMedia(prev => prev.filter(m => m.id !== id));
  };

  const handleSelectionChange = (id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === media.length && media.length > 0) {
      // Deselect all
      setSelectedIds(new Set());
    } else {
      // Select all
      setSelectedIds(new Set(media.map(m => m.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    try {
      setDeleting(true);
      const ids = Array.from(selectedIds).join(',');

      const response = await fetch(`/api/montree/media?ids=${ids}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Delete request failed');
      }

      const data = await response.json();

      if (data.success) {
        // Remove deleted items from UI
        setMedia(prev => prev.filter(m => !selectedIds.has(m.id)));
        setSelectedIds(new Set());
        setShowDeleteConfirm(false);
        setSelectionMode(false);
      } else {
        console.error('Delete failed:', data.error);
        alert(t('media.delete_failed'));
      }
    } catch (err) {
      console.error('Bulk delete error:', err);
      alert(t('media.delete_error_general'));
    } finally {
      setDeleting(false);
    }
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setShowDeleteConfirm(false);
  };

  // ============================================
  // RENDER
  // ============================================

  const selectedEvent = events.find(e => e.id === selectedEventId) || null;
  // `total` is the server's exact count for the event. The area filter is
  // applied client-side, so fall back to the rendered length whenever an area
  // is narrowing the set — otherwise the count would overstate.
  const photoCount = selectedEventId && selectedArea === 'all' ? totalCount : media.length;

  return (
    <div
      className="min-h-screen bg-[#0a1a0f] flex flex-col"
      style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(39,129,90,0.32), transparent 60%)' }}
    >
      {/* Sub-header */}
      <div className="bg-[rgba(7,18,12,0.9)] border-b border-[rgba(52,211,153,0.15)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {selectionMode ? (
            <>
              <button
                onClick={exitSelectionMode}
                className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white/80 rounded-lg transition-colors"
              >
                <span className="text-sm">✕</span>
              </button>
              <input
                type="checkbox"
                checked={selectedIds.size > 0 && selectedIds.size === media.length && media.length > 0}
                onChange={handleSelectAll}
                className="w-5 h-5 cursor-pointer accent-emerald-500 rounded"
              />
              <div>
                <h1 className="font-bold text-white/90">{t('media.select_photos')}</h1>
                <p className="text-xs text-white/40">
                  {selectedIds.size} {t('media.selected')}
                </p>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xl">🖼️</span>
              <div>
                <h1 className="font-bold text-white/90">
                  {selectedEvent ? selectedEvent.name : t('media.photo_gallery')}
                </h1>
                <p className="text-xs text-white/40">
                  {photoCount} {photoCount === 1 ? t('media.photo_singular') : t('media.photo_plural')} • {selectedEvent ? selectedEvent.event_date : t('media.tap_to_edit')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Header action buttons */}
        <div className="flex items-center gap-2">
          {selectionMode ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={selectedIds.size === 0 || deleting}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                selectedIds.size === 0 || deleting
                  ? 'bg-white/5 text-white/30 cursor-not-allowed'
                  : 'bg-red-500 hover:bg-red-600 text-white shadow-md'
              }`}
            >
              <span className="text-lg">🗑️</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => setSelectionMode(true)}
                className="w-9 h-9 bg-emerald-500 text-[#04150c] rounded-lg flex items-center justify-center hover:bg-emerald-400 transition-colors"
              >
                <span className="text-sm">✓</span>
              </button>
              <Link
                href="/montree/dashboard/capture"
                className="w-9 h-9 bg-emerald-500 text-[#04150c] rounded-lg flex items-center justify-center hover:bg-emerald-400 transition-colors"
              >
                <span className="text-lg">+</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Event filter — hidden entirely for schools with no events */}
      {events.length > 0 && (
        <div className="bg-[rgba(7,18,12,0.75)] border-b border-[rgba(52,211,153,0.1)] px-4 py-3 flex gap-2 overflow-x-auto">
          <span className="text-xs font-semibold text-white/50 whitespace-nowrap flex items-center pr-1">
            🎉 {t('events.filterByEvent')}
          </span>
          <button
            onClick={() => selectEvent(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              !selectedEventId
                ? 'bg-amber-500 text-[#04150c] shadow-md'
                : 'bg-white/[0.06] text-white/60 border border-[rgba(245,158,11,0.20)] hover:bg-white/[0.1]'
            }`}
          >
            {t('media.all_events')}
          </button>
          {events.map(event => (
            <button
              key={event.id}
              onClick={() => selectEvent(event.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedEventId === event.id
                  ? 'bg-amber-500 text-[#04150c] shadow-md'
                  : 'bg-white/[0.06] text-white/60 border border-[rgba(245,158,11,0.20)] hover:bg-white/[0.1]'
              }`}
            >
              {event.name}
            </button>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="bg-[rgba(7,18,12,0.75)] border-b border-[rgba(52,211,153,0.1)] px-4 py-2 flex gap-2 overflow-x-auto">
        <button
          onClick={() => { setActiveTab('recent'); setSelectedChildId(null); setSelectedEventId(null); }}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === 'recent' && !selectedChildId
              ? 'bg-[rgba(52,211,153,0.15)] text-emerald-300'
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          🕐 {t('media.recent')}
        </button>
        <button
          onClick={() => { setActiveTab('untagged'); setSelectedChildId(null); setSelectedEventId(null); }}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === 'untagged'
              ? 'bg-amber-500/15 text-amber-300'
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          ⚠️ {t('media.untagged')}
        </button>

        {/* Divider */}
        <div className="w-px bg-white/10 mx-1" />

        {/* Child filters */}
        {children.slice(0, 5).map(child => (
          <button
            key={child.id}
            onClick={() => { setActiveTab('all'); setSelectedChildId(child.id); setSelectedEventId(null); }}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedChildId === child.id
                ? 'bg-[rgba(52,211,153,0.15)] text-emerald-300'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {child.name.split(' ')[0]}
          </button>
        ))}

        {children.length > 5 && (
          <button
            className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap bg-white/5 text-white/60 hover:bg-white/10 transition-colors"
          >
            +{children.length - 5} more
          </button>
        )}
      </div>

      {/* Area filter */}
      <div className="bg-[rgba(7,18,12,0.6)] border-b border-[rgba(52,211,153,0.1)] px-4 py-3 flex gap-2 overflow-x-auto">
        <span className="text-xs font-semibold text-white/50 whitespace-nowrap flex items-center pr-2">
          {t('media.area')}:
        </span>
        {(['all', 'practical_life', 'sensorial', 'mathematics', 'language', 'cultural'] as AreaFilter[]).map(area => (
          <button
            key={area}
            onClick={() => setSelectedArea(area)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selectedArea === area
                ? 'bg-emerald-500 text-[#04150c] shadow-md'
                : 'bg-white/[0.06] text-white/60 border border-[rgba(52,211,153,0.15)] hover:border-[rgba(52,211,153,0.35)] hover:bg-white/[0.1]'
            }`}
          >
            {t(AREA_LABELS[area])}
          </button>
        ))}
      </div>

      {/* Gallery */}
      <main className="flex-1 p-4">
        <MediaGallery
          media={media}
          children={children}
          loading={loading}
          onMediaClick={selectionMode ? undefined : handleMediaClick}
          emptyMessage={
            selectedEventId
              ? t('media.no_photos_event')
              : activeTab === 'untagged'
                ? t('media.no_untagged')
                : selectedChildId
                  ? t('media.no_photos_child')
                  : t('media.no_photos_start')
          }
          emptyIcon={selectedEventId ? '🎉' : activeTab === 'untagged' ? '✅' : '📷'}
          selectedIds={selectedIds}
          onSelectionChange={handleSelectionChange}
          selectionMode={selectionMode}
        />
      </main>

      {/* Floating capture button - only show when not in selection mode */}
      {!selectionMode && (
        <Link
          href="/montree/dashboard/capture"
          className="fixed bottom-6 right-6 w-16 h-16 bg-emerald-500 text-[#04150c] rounded-full flex items-center justify-center shadow-xl hover:bg-emerald-400 transition-all hover:scale-105 active:scale-95"
        >
          <span className="text-3xl">📷</span>
        </Link>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1f14] border border-[rgba(52,211,153,0.15)] rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🗑️</span>
              </div>
              <h2 className="text-lg font-bold text-white/90 mb-2">{t('media.delete_confirm_title')} {selectedIds.size} {selectedIds.size === 1 ? t('media.photo_singular') : t('media.photo_plural')}?</h2>
              <p className="text-sm text-white/60 mb-6">
                {t('media.delete_confirm_desc')}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-white/[0.06] border border-[rgba(52,211,153,0.15)] text-white/80 rounded-lg font-medium hover:bg-white/[0.1] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t('media.deleting')}
                  </>
                ) : (
                  <>{t('common.delete')}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Detail Modal */}
      {selectedMedia && !selectionMode && (
        <MediaDetailModal
          media={selectedMedia}
          children={children}
          onClose={() => setSelectedMedia(null)}
          onUpdate={handleMediaUpdate}
          onDelete={handleMediaDelete}
        />
      )}
    </div>
  );
}

// ============================================
// PAGE EXPORT WITH SUSPENSE
// ============================================
// useSearchParams() (the ?event=<id> deep link) requires a Suspense boundary
// in the app router — same pattern as the capture page.

export default function MediaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a1a0f]" />}>
      <MediaPageContent />
    </Suspense>
  );
}
