// components/montree/PortfolioTab.tsx
// Portfolio view with offline-first media
// Session 54: Uses new media system

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useChildMedia, useMedia } from '@/lib/media/useMedia';
import QuickCapture from '@/components/media/QuickCapture';
import SyncStatus from '@/components/media/SyncStatus';

interface PortfolioTabProps {
  childId: string;
  childName: string;
  onMediaUploaded?: () => void;
}

export default function PortfolioTab({ childId, childName, onMediaUploaded }: PortfolioTabProps) {
  // Local media from IndexedDB
  const { media: localMedia, loading: loadingLocal, refresh: refreshLocal } = useChildMedia(childId);
  
  // Remote media from server
  const [remoteMedia, setRemoteMedia] = useState<any[]>([]);
  const [loadingRemote, setLoadingRemote] = useState(true);
  
  // UI state
  const [selectedMedia, setSelectedMedia] = useState<any | null>(null);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  
  // Fetch remote media
  useEffect(() => {
    fetchRemoteMedia();
  }, [childId]);

  const fetchRemoteMedia = async () => {
    try {
      const res = await fetch(`/api/classroom/child/${childId}/media`);
      const data = await res.json();
      setRemoteMedia(data.media || []);
    } catch (error) {
      console.error('Failed to fetch remote media:', error);
    } finally {
      setLoadingRemote(false);
    }
  };

  // Combine local pending + remote synced media
  const allMedia = [
    // Local pending/uploading first (newest)
    ...localMedia
      .filter(m => m.syncStatus !== 'synced')
      .map(m => ({
        id: m.id,
        media_url: m.dataUrl || m.remoteUrl,
        media_type: m.mediaType === 'video' ? 'video' : 'photo',
        work_name: m.workName || 'Quick Capture',
        taken_at: m.capturedAt,
        isLocal: true,
        syncStatus: m.syncStatus,
      })),
    // Remote media
    ...remoteMedia.map(m => ({
      ...m,
      isLocal: false,
      syncStatus: 'synced',
    })),
  ];

  const handleCapture = useCallback((mediaId: string) => {
    refreshLocal();
    fetchRemoteMedia();
    onMediaUploaded?.();
  }, [refreshLocal, onMediaUploaded]);

  const loading = loadingLocal || loadingRemote;

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 bg-white rounded-xl shadow flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl animate-pulse">📷</span>
        </div>
        <p className="text-gray-500">Loading portfolio...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header with capture button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-800">
            {allMedia.length} {allMedia.length === 1 ? 'Photo' : 'Photos'}
          </h3>
          <SyncStatus showLabel={false} />
        </div>
        
        <button
          onClick={() => setQuickCaptureOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 active:scale-95 transition-all"
        >
          <span>📷</span>
          <span>Add Photo</span>
        </button>
      </div>

      {allMedia.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📷</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">No photos yet</h3>
          <p className="text-gray-500 text-sm mb-4">
            Capture photos of {childName}'s work
          </p>
          <button
            onClick={() => setQuickCaptureOpen(true)}
            className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors"
          >
            📷 Take First Photo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {allMedia.map(item => (
            <button
              key={item.id}
              onClick={() => setSelectedMedia(item)}
              className="aspect-square rounded-xl overflow-hidden bg-gray-100 relative group"
            >
              {item.media_type === 'video' ? (
                <>
                  <video src={item.media_url} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <span className="text-white text-2xl">▶</span>
                  </div>
                </>
              ) : (
                <img 
                  src={item.media_url} 
                  alt={item.work_name} 
                  className="w-full h-full object-cover" 
                />
              )}
              
              {/* Sync status indicator */}
              {item.isLocal && item.syncStatus !== 'synced' && (
                <div className="absolute top-2 right-2">
                  {item.syncStatus === 'uploading' && (
                    <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </span>
                  )}
                  {item.syncStatus === 'pending' && (
                    <span className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-white text-xs">
                      ⏳
                    </span>
                  )}
                  {item.syncStatus === 'failed' && (
                    <span className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">
                      !
                    </span>
                  )}
                </div>
              )}
              
              {/* Work name overlay */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-xs font-medium truncate">
                  {item.work_name || 'Quick Capture'}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Media Viewer Modal */}
      {selectedMedia && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          onClick={() => setSelectedMedia(null)}
        >
          <button 
            onClick={() => setSelectedMedia(null)} 
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white text-xl z-10"
          >
            ✕
          </button>

          <div className="flex-1 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
            {selectedMedia.media_type === 'video' ? (
              <video 
                src={selectedMedia.media_url} 
                controls 
                autoPlay
                className="max-w-full max-h-[70vh] rounded-xl"
              />
            ) : (
              <img 
                src={selectedMedia.media_url} 
                alt={selectedMedia.work_name} 
                className="max-w-full max-h-[70vh] object-contain rounded-xl"
              />
            )}
          </div>

          <div className="bg-black/50 p-4 text-white text-center" onClick={e => e.stopPropagation()}>
            <p className="font-semibold">{selectedMedia.work_name || 'Quick Capture'}</p>
            <p className="text-sm text-white/70">
              {new Date(selectedMedia.taken_at).toLocaleDateString('en-US', { 
                weekday: 'short', month: 'short', day: 'numeric'
              })}
            </p>
            {selectedMedia.isLocal && selectedMedia.syncStatus !== 'synced' && (
              <p className="text-xs text-amber-400 mt-1">
                {selectedMedia.syncStatus === 'uploading' ? '⏳ Uploading...' : '📱 Saved locally'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Quick Capture Modal - pre-selected to this child */}
      <QuickCapture
        isOpen={quickCaptureOpen}
        onClose={() => setQuickCaptureOpen(false)}
        students={[{ id: childId, name: childName }]}
        onCapture={handleCapture}
      />
    </div>
  );
}
