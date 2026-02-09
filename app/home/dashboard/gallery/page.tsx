'use client';

// /home/dashboard/gallery/page.tsx
// Photo gallery - view and manage photos of children
// Filtered by child and area

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getHomeSession } from '@/lib/home/auth';
import { toast } from 'sonner';

interface Photo {
  id: string;
  child_id: string;
  child_name?: string;
  area?: string;
  work_name?: string;
  url: string;
  caption?: string;
  created_at: string;
}

interface ChildOption {
  id: string;
  name: string;
}

const AREA_COLORS: Record<string, string> = {
  practical_life: 'from-green-500 to-emerald-600',
  sensorial: 'from-purple-500 to-indigo-600',
  mathematics: 'from-blue-500 to-cyan-600',
  language: 'from-orange-500 to-red-600',
  cultural: 'from-teal-500 to-cyan-600',
};

const AREA_DISPLAY: Record<string, string> = {
  practical_life: '🌱 Practical Life',
  sensorial: '🎨 Sensorial',
  mathematics: '🔢 Mathematics',
  language: '📝 Language',
  cultural: '🌍 Cultural',
};

export default function GalleryPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    setSession(getHomeSession());
  }, []);

  useEffect(() => {
    if (!session) {
      router.push('/home/login');
      return;
    }

    // Fetch children list
    fetch(`/api/home/children?family_id=${session.family.id}`)
      .then(r => r.json())
      .then(data => {
        setChildren(data.children || []);
        if (data.children && data.children.length > 0) {
          setSelectedChild(data.children[0].id);
        }
      })
      .catch(() => toast.error('Failed to load children'));
  }, [session, router]);

  useEffect(() => {
    if (!session?.family?.id) return;

    setLoading(true);
    const url = new URL('/api/home/media', window.location.origin);
    url.searchParams.set('family_id', session.family.id);
    if (selectedChild) url.searchParams.set('child_id', selectedChild);
    url.searchParams.set('limit', '1000');

    fetch(url.toString())
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Failed to fetch')))
      .then(data => {
        // Sort by date descending (newest first)
        const sorted = (data.media || []).sort((a: Photo, b: Photo) => {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setPhotos(sorted);
      })
      .catch(() => {
        toast.error('Failed to load photos');
        setPhotos([]);
      })
      .finally(() => setLoading(false));
  }, [session?.family?.id, selectedChild]);

  // Get unique areas from photos
  const uniqueAreas = Array.from(new Set(photos.map(p => p.area).filter(Boolean)));

  // Filter photos
  const filteredPhotos = photos.filter(p => {
    if (selectedArea && p.area !== selectedArea) return false;
    return true;
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files || !session) return;

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('child_id', selectedChild || '');
      formData.append('family_id', session.family.id);
      formData.append('file', file);

      try {
        const res = await fetch('/api/home/media/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Photo uploaded!');
          // Refresh photos
          if (selectedChild) {
            const photoRes = await fetch(
              `/api/home/media?family_id=${session.family.id}&child_id=${selectedChild}&limit=1000`
            );
            const photoData = await photoRes.json();
            const sorted = (photoData.media || []).sort((a: Photo, b: Photo) => {
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
            setPhotos(sorted);
          }
        } else {
          toast.error(data.error || 'Upload failed');
        }
      } catch {
        toast.error('Upload error');
      }
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-bounce text-5xl">📷</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Photo Gallery</h1>
        <p className="text-gray-500">Memories from learning moments</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Child selector */}
          {children.length > 1 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Child</label>
              <select
                value={selectedChild || ''}
                onChange={(e) => setSelectedChild(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400"
              >
                {children.map(child => (
                  <option key={child.id} value={child.id}>{child.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Area filter */}
          {uniqueAreas.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Area</label>
              <select
                value={selectedArea || ''}
                onChange={(e) => setSelectedArea(e.target.value || null)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400"
              >
                <option value="">All Areas</option>
                {uniqueAreas.map(area => (
                  <option key={area} value={area}>{AREA_DISPLAY[area] || area}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Upload Button */}
        <div>
          <label htmlFor="photo-upload" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl cursor-pointer hover:shadow-lg transition-all">
            <span>📷</span>
            <span>Upload Photos</span>
          </label>
          <input
            id="photo-upload"
            type="file"
            multiple
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <p className="text-xs text-gray-500 mt-2">Select one or multiple images to upload</p>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-bounce text-4xl">📷</div>
        </div>
      ) : filteredPhotos.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md p-12 text-center border border-gray-100">
          <div className="text-5xl mb-4">📷</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">No photos yet</h2>
          <p className="text-gray-500">Upload photos to capture learning moments</p>
        </div>
      ) : (
        <>
          {/* Photo Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => setSelectedPhoto(photo)}
                className="relative group cursor-pointer rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all"
              >
                <img
                  src={photo.url}
                  alt={photo.caption || 'Learning moment'}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-lg">👁️</span>
                </div>

                {/* Area Badge */}
                {photo.area && (
                  <div className={`absolute top-2 left-2 bg-gradient-to-r ${AREA_COLORS[photo.area] || 'from-gray-500 to-gray-600'} text-white px-2 py-1 rounded-lg text-xs font-semibold`}>
                    {AREA_DISPLAY[photo.area]?.split(' ')[0] || photo.area}
                  </div>
                )}

                {/* Date */}
                <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded-lg text-xs">
                  {new Date(photo.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Photo Detail Modal */}
          {selectedPhoto && (
            <div
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedPhoto(null)}
            >
              <div
                className="bg-white rounded-2xl overflow-hidden max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={selectedPhoto.url}
                  alt={selectedPhoto.caption || 'Learning moment'}
                  className="w-full h-auto"
                />

                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-gray-800">{selectedPhoto.child_name}</h2>
                      {selectedPhoto.area && (
                        <p className="text-sm text-gray-500">{AREA_DISPLAY[selectedPhoto.area]}</p>
                      )}
                    </div>
                    <span className="text-sm text-gray-400">
                      {new Date(selectedPhoto.created_at).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {selectedPhoto.work_name && (
                    <div className="bg-emerald-50 rounded-xl p-3">
                      <p className="text-sm"><span className="font-semibold">Work:</span> {selectedPhoto.work_name}</p>
                    </div>
                  )}

                  {selectedPhoto.caption && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-sm">{selectedPhoto.caption}</p>
                    </div>
                  )}

                  <button
                    onClick={() => setSelectedPhoto(null)}
                    className="w-full px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
