// app/montree/dashboard/media/page.tsx
// Media gallery page - view, edit, delete photos
// Phase 2 - Session 53 + Testing Week enhancements

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import MediaGallery from '@/components/montree/media/MediaGallery';
import MediaDetailModal from '@/components/montree/media/MediaDetailModal';
import type { MontreeMedia, MontreeChild } from '@/lib/montree/media/types';

// ============================================
// TYPES
// ============================================

type FilterTab = 'all' | 'untagged' | 'recent';
type AreaFilter = 'all' | 'practical_life' | 'sensorial' | 'mathematics' | 'language' | 'cultural';

const AREA_LABELS: Record<AreaFilter, string> = {
  'all': 'All Areas',
  'practical_life': '🏠 Practical Life',
  'sensorial': '👁️ Sensorial',
  'mathematics': '🔢 Mathematics',
  'language': '📚 Language',
  'cultural': '🌍 Cultural',
};

// ============================================
// COMPONENT
// ============================================

export default function MediaPage() {
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

  // ============================================
  // FETCH DATA
  // ============================================

  const fetchMedia = useCallback(async () => {
    try {
      setLoading(true);

      // Build query params
      const params = new URLSearchParams();
      params.set('limit', '50');

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

      const response = await fetch(`/api/montree/media?${params}`);
      const data = await response.json();

      if (data.success) {
        setMedia(data.media || []);
      }
    } catch (err) {
      console.error('Failed to fetch media:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedChildId, selectedArea]);

  const fetchChildren = useCallback(async () => {
    try {
      const response = await fetch('/api/montree/children');
      const data = await response.json();
      setChildren(data.children || []);
    } catch (err) {
      console.error('Failed to fetch children:', err);
    }
  }, []);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  // ============================================
  // HANDLERS
  // ============================================

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

      const data = await response.json();

      if (data.success) {
        // Remove deleted items from UI
        setMedia(prev => prev.filter(m => !selectedIds.has(m.id)));
        setSelectedIds(new Set());
        setShowDeleteConfirm(false);
        setSelectionMode(false);
      } else {
        console.error('Delete failed:', data.error);
        alert('Failed to delete photos. Please try again.');
      }
    } catch (err) {
      console.error('Bulk delete error:', err);
      alert('Error deleting photos');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {selectionMode ? (
            // Selection mode header
            <>
              <button
                onClick={exitSelectionMode}
                className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                <span className="text-lg">←</span>
              </button>
              <input
                type="checkbox"
                checked={selectedIds.size > 0 && selectedIds.size === media.length && media.length > 0}
                onChange={handleSelectAll}
                className="w-5 h-5 cursor-pointer accent-blue-500 rounded"
              />
              <div>
                <h1 className="text-lg font-bold text-gray-800">Select Photos</h1>
                <p className="text-xs text-gray-500">
                  {selectedIds.size} selected
                </p>
              </div>
            </>
          ) : (
            // Normal mode header
            <>
              <Link
                href="/montree/dashboard"
                className="w-10 h-10 flex items-center justify-center bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-colors"
              >
                <span className="text-lg">←</span>
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🖼️</span>
                <div>
                  <h1 className="text-lg font-bold text-gray-800">Photo Gallery</h1>
                  <p className="text-xs text-gray-500">
                    {media.length} photo{media.length !== 1 ? 's' : ''} • Tap to edit
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Header action buttons */}
        <div className="flex items-center gap-2">
          {selectionMode ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={selectedIds.size === 0 || deleting}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                selectedIds.size === 0 || deleting
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-red-500 hover:bg-red-600 text-white shadow-md'
              }`}
            >
              <span className="text-lg">🗑️</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => setSelectionMode(true)}
                className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center hover:bg-blue-600 transition-colors shadow-md"
              >
                <span className="text-lg">✓</span>
              </button>
              <Link
                href="/montree/dashboard/capture"
                className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center hover:bg-emerald-600 transition-colors shadow-md"
              >
                <span className="text-xl">+</span>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Filter tabs */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex gap-2 overflow-x-auto">
        <button
          onClick={() => { setActiveTab('recent'); setSelectedChildId(null); }}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === 'recent' && !selectedChildId
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          🕐 Recent
        </button>
        <button
          onClick={() => { setActiveTab('untagged'); setSelectedChildId(null); }}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === 'untagged'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          ⚠️ Untagged
        </button>

        {/* Divider */}
        <div className="w-px bg-gray-200 mx-1" />

        {/* Child filters */}
        {children.slice(0, 5).map(child => (
          <button
            key={child.id}
            onClick={() => { setActiveTab('all'); setSelectedChildId(child.id); }}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedChildId === child.id
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {child.name.split(' ')[0]}
          </button>
        ))}

        {children.length > 5 && (
          <button
            className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            +{children.length - 5} more
          </button>
        )}
      </div>

      {/* Area filter */}
      <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex gap-2 overflow-x-auto">
        <span className="text-xs font-semibold text-gray-600 whitespace-nowrap flex items-center pr-2">
          Area:
        </span>
        {(['all', 'practical_life', 'sensorial', 'mathematics', 'language', 'cultural'] as AreaFilter[]).map(area => (
          <button
            key={area}
            onClick={() => setSelectedArea(area)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selectedArea === area
                ? 'bg-emerald-500 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
            }`}
          >
            {AREA_LABELS[area]}
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
            activeTab === 'untagged'
              ? 'No untagged photos'
              : selectedChildId
                ? 'No photos for this child yet'
                : 'No photos yet. Start capturing!'
          }
          emptyIcon={activeTab === 'untagged' ? '✅' : '📷'}
          selectedIds={selectedIds}
          onSelectionChange={handleSelectionChange}
          selectionMode={selectionMode}
        />
      </main>

      {/* Floating capture button - only show when not in selection mode */}
      {!selectionMode && (
        <Link
          href="/montree/dashboard/capture"
          className="fixed bottom-6 right-6 w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-blue-600 transition-all hover:scale-105 active:scale-95"
        >
          <span className="text-3xl">📷</span>
        </Link>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🗑️</span>
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Delete {selectedIds.size} photo{selectedIds.size !== 1 ? 's' : ''}?</h2>
              <p className="text-sm text-gray-600 mb-6">
                This action cannot be undone. The selected photos will be permanently deleted.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>Delete</>
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
