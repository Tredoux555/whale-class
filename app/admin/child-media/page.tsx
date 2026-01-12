'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ChildMedia {
  id: string;
  child_id: string;
  work_name: string;
  media_type: 'photo' | 'video';
  media_url: string;
  notes?: string;
  week_number?: number;
  year?: number;
  taken_at: string;
  parent_visible: boolean;
}

interface Child {
  id: string;
  name: string;
}

export default function ChildMediaPage() {
  const [media, setMedia] = useState<ChildMedia[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<ChildMedia | null>(null);

  useEffect(() => {
    fetchChildren();
    fetchMedia();
  }, []);

  useEffect(() => {
    fetchMedia();
  }, [selectedChild]);

  async function fetchChildren() {
    try {
      const res = await fetch('/api/children');
      const data = await res.json();
      setChildren(data.children || []);
    } catch (err) {
      console.error('Failed to fetch children:', err);
    }
  }

  async function fetchMedia() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedChild !== 'all') {
        params.set('childId', selectedChild);
      }
      const res = await fetch(`/api/media?${params}`);
      const data = await res.json();
      setMedia(data.media || []);
    } catch (err) {
      console.error('Failed to fetch media:', err);
    } finally {
      setLoading(false);
    }
  }

  function getChildName(childId: string): string {
    const child = children.find(c => c.id === childId);
    return child?.name || 'Unknown';
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Group media by date
  const groupedMedia: Record<string, ChildMedia[]> = {};
  media.forEach(m => {
    const date = new Date(m.taken_at).toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
    if (!groupedMedia[date]) groupedMedia[date] = [];
    groupedMedia[date].push(m);
  });

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-gray-500 hover:text-gray-700">
              ← Admin
            </Link>
            <h1 className="text-xl font-bold">📸 Child Media</h1>
          </div>
          
          <select
            value={selectedChild}
            onChange={(e) => setSelectedChild(e.target.value)}
            className="px-4 py-2 border rounded-lg font-medium"
          >
            <option value="all">All Children</option>
            {children.map(child => (
              <option key={child.id} value={child.id}>{child.name}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Stats */}
      <div className="bg-white border-b px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-6 text-sm">
          <span className="text-gray-600">
            <strong>{media.length}</strong> total
          </span>
          <span className="text-green-600">
            <strong>{media.filter(m => m.media_type === 'photo').length}</strong> photos
          </span>
          <span className="text-purple-600">
            <strong>{media.filter(m => m.media_type === 'video').length}</strong> videos
          </span>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-500">Loading media...</p>
          </div>
        ) : media.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📷</div>
            <p className="text-gray-600 text-lg">No media captured yet</p>
            <p className="text-gray-400 text-sm mt-2">
              Take photos or videos from the Classroom View
            </p>
            <Link
              href="/admin/classroom"
              className="inline-block mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Classroom
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedMedia).map(([date, items]) => (
              <div key={date}>
                <h2 className="text-lg font-bold text-gray-700 mb-3">{date}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {items.map(item => (
                    <div
                      key={item.id}
                      onClick={() => setLightbox(item)}
                      className="relative aspect-square rounded-xl overflow-hidden bg-gray-200 cursor-pointer group"
                    >
                      {item.media_type === 'video' ? (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800">
                          <span className="text-4xl">🎬</span>
                        </div>
                      ) : (
                        <img
                          src={item.media_url}
                          alt={item.work_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      )}
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-2 text-white">
                          <p className="text-xs font-medium truncate">{getChildName(item.child_id)}</p>
                          <p className="text-[10px] opacity-80 truncate">{item.work_name}</p>
                        </div>
                      </div>

                      {/* Type badge */}
                      <div className="absolute top-2 right-2">
                        <span className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-xs">
                          {item.media_type === 'video' ? '🎥' : '📷'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Lightbox */}
      {lightbox && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-xl"
          >
            ✕
          </button>
          
          <div 
            className="max-w-4xl w-full"
            onClick={e => e.stopPropagation()}
          >
            {lightbox.media_type === 'video' ? (
              <video
                src={lightbox.media_url}
                controls
                autoPlay
                className="w-full max-h-[80vh] rounded-xl"
              />
            ) : (
              <img
                src={lightbox.media_url}
                alt={lightbox.work_name}
                className="w-full max-h-[80vh] object-contain rounded-xl"
              />
            )}
            
            <div className="mt-4 text-white text-center">
              <p className="font-bold">{getChildName(lightbox.child_id)}</p>
              <p className="text-sm opacity-80">{lightbox.work_name}</p>
              <p className="text-xs opacity-60 mt-1">{formatDate(lightbox.taken_at)}</p>
              {lightbox.notes && (
                <p className="text-sm mt-2 bg-white/10 rounded-lg px-4 py-2">{lightbox.notes}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
