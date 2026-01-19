// app/montree/dashboard/media/page.tsx
// Media gallery page - view all captured photos
// Phase 2 - Session 53

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import MediaGallery from '@/components/montree/media/MediaGallery';
import type { MontreeMedia, MontreeChild } from '@/lib/montree/media/types';

// ============================================
// TYPES
// ============================================

type FilterTab = 'all' | 'untagged' | 'recent';

// ============================================
// COMPONENT
// ============================================

export default function MediaPage() {
  const [media, setMedia] = useState<MontreeMedia[]>([]);
  const [children, setChildren] = useState<MontreeChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('recent');
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

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
  }, [activeTab, selectedChildId]);

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
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
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
                {media.length} photo{media.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
        
        {/* Add photo button */}
        <Link
          href="/montree/dashboard/capture"
          className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center hover:bg-emerald-600 transition-colors shadow-md"
        >
          <span className="text-xl">+</span>
        </Link>
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

      {/* Gallery */}
      <main className="flex-1 p-4">
        <MediaGallery
          media={media}
          children={children}
          loading={loading}
          emptyMessage={
            activeTab === 'untagged'
              ? 'No untagged photos'
              : selectedChildId
                ? 'No photos for this child yet'
                : 'No photos yet. Start capturing!'
          }
          emptyIcon={activeTab === 'untagged' ? '✅' : '📷'}
        />
      </main>

      {/* Floating capture button */}
      <Link
        href="/montree/dashboard/capture"
        className="fixed bottom-6 right-6 w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-blue-600 transition-all hover:scale-105 active:scale-95"
      >
        <span className="text-3xl">📷</span>
      </Link>
    </div>
  );
}
