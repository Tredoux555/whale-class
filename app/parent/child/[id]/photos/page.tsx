'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Photo {
  id: string;
  photo_url: string;
  report_date: string;
  highlights?: string;
}

export default function ParentPhotosPage() {
  const params = useParams();
  const childId = params.id as string;
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [childName, setChildName] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    fetchChild();
    fetchPhotos();
  }, [childId]);

  const fetchChild = async () => {
    try {
      const res = await fetch(`/api/children/${childId}`);
      const data = await res.json();
      if (data.child) setChildName(data.child.name);
    } catch (e) { console.error(e); }
  };

  const fetchPhotos = async () => {
    try {
      const res = await fetch(`/api/daily-reports?child_id=${childId}`);
      const data = await res.json();
      const withPhotos = (data.reports || []).filter((r: any) => r.photo_url);
      setPhotos(withPhotos);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-purple-50 flex items-center justify-center">
        <span className="text-4xl animate-bounce">📸</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <header className="bg-purple-600 text-white px-4 py-6">
        <Link href={`/parent/child/${childId}`} className="text-purple-200 text-sm hover:text-white">
          ← Back to {childName}
        </Link>
        <h1 className="text-2xl font-bold mt-1">📸 Photo Gallery</h1>
        <p className="text-purple-200 text-sm">{photos.length} photos from school</p>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {photos.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <span className="text-5xl">📷</span>
            <p className="mt-4 text-gray-500">No photos yet</p>
            <p className="text-sm text-gray-400">Photos from daily reports will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {photos.map(photo => (
              <button
                key={photo.id}
                onClick={() => setSelectedPhoto(photo)}
                className="relative aspect-square rounded-xl overflow-hidden group"
              >
                <img 
                  src={photo.photo_url} 
                  alt={`Photo from ${formatDate(photo.report_date)}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-white text-xs">{formatDate(photo.report_date)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Lightbox */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <img 
              src={selectedPhoto.photo_url} 
              alt="Photo"
              className="w-full rounded-lg"
            />
            <div className="mt-4 text-white text-center">
              <p className="font-medium">{formatDate(selectedPhoto.report_date)}</p>
              {selectedPhoto.highlights && (
                <p className="text-gray-300 text-sm mt-1">{selectedPhoto.highlights}</p>
              )}
            </div>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="mt-4 w-full py-3 bg-white/20 text-white rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
