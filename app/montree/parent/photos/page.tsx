'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast, Toaster } from 'sonner';

interface Photo {
  id: string;
  storage_path: string;
  thumbnail_url: string | null;
  caption: string | null;
  captured_at: string;
  work_id: string | null;
}

function ParentPhotosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const childIdParam = searchParams.get('child');

  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [fullImageUrl, setFullImageUrl] = useState<string | null>(null);
  const [childName, setChildName] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const sessionStr = localStorage.getItem('montree_parent_session');
    if (!sessionStr) {
      router.push('/montree/parent/login');
      return;
    }

    // Get child info from session or param
    if (childIdParam) {
      loadPhotos(childIdParam);
    } else {
      // Try to get from stored selected child
      const selectedChildStr = localStorage.getItem('montree_selected_child');
      if (selectedChildStr) {
        const child = JSON.parse(selectedChildStr);
        setChildName(child.name);
        loadPhotos(child.id);
      } else {
        toast.error('No child selected');
        router.push('/montree/parent/dashboard');
      }
    }
  }, [router, childIdParam]);

  const loadPhotos = async (childId: string, append = false) => {
    try {
      const currentOffset = append ? offset : 0;
      const res = await fetch(`/api/montree/parent/photos?child_id=${childId}&limit=12&offset=${currentOffset}`);
      if (!res.ok) {
        throw new Error('Failed to fetch photos');
      }
      const data = await res.json();

      if (data.success) {
        if (append) {
          setPhotos(prev => [...prev, ...data.photos]);
        } else {
          setPhotos(data.photos);
        }
        setHasMore(data.hasMore);
        setOffset(currentOffset + 12);
      }
    } catch (err) {
      console.error('Failed to load photos:', err);
      toast.error('Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoClick = async (photo: Photo) => {
    setSelectedPhoto(photo);
    setFullImageUrl(null);

    // Fetch full-size image
    try {
      const res = await fetch(`/api/montree/media/url?path=${encodeURIComponent(photo.storage_path)}`);
      if (!res.ok) {
        throw new Error('Failed to fetch image URL');
      }
      const data = await res.json();
      if (data.url) {
        setFullImageUrl(data.url);
      }
    } catch (err) {
      console.error('Failed to load full image:', err);
      toast.error('Failed to load image');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">📸</div>
          <p className="text-gray-600">Loading photos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
      <Toaster position="top-center" />

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/montree/parent/dashboard')}
            className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200"
          >
            ←
          </button>
          <div>
            <h1 className="font-bold text-gray-800">Photo Gallery</h1>
            <p className="text-sm text-gray-500">{childName ? `${childName}'s photos` : 'Shared by teachers'}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {photos.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="text-5xl mb-4">📷</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No Photos Yet</h2>
            <p className="text-gray-500">
              Photos shared by teachers will appear here
            </p>
          </div>
        ) : (
          <>
            {/* Photo Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map(photo => (
                <button
                  key={photo.id}
                  onClick={() => handlePhotoClick(photo)}
                  className="aspect-square bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
                >
                  {photo.thumbnail_url ? (
                    <img
                      src={photo.thumbnail_url}
                      alt={photo.caption || 'Photo'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <span className="text-3xl">📷</span>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    const childId = childIdParam || JSON.parse(localStorage.getItem('montree_selected_child') || '{}').id;
                    if (childId) loadPhotos(childId, true);
                  }}
                  className="px-6 py-3 bg-white text-emerald-600 rounded-xl font-medium hover:bg-emerald-50 transition"
                >
                  Load More Photos
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Image */}
            <div className="bg-gray-100 aspect-video relative">
              {fullImageUrl ? (
                <img
                  src={fullImageUrl}
                  alt={selectedPhoto.caption || 'Photo'}
                  className="absolute inset-0 w-full h-full object-contain"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-gray-300 border-t-emerald-500 rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-4">
              <p className="text-sm text-gray-500">📅 {formatDate(selectedPhoto.captured_at)}</p>
              {selectedPhoto.caption && (
                <p className="mt-2 text-gray-800">{selectedPhoto.caption}</p>
              )}
            </div>

            {/* Close button */}
            <div className="p-4 border-t">
              <button
                onClick={() => setSelectedPhoto(null)}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrap in Suspense for useSearchParams
export default function ParentPhotosPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">📸</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ParentPhotosContent />
    </Suspense>
  );
}
