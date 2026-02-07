'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import VideoGenerator from './VideoGenerator';
import PhotoCapture from './PhotoCapture';

interface Media {
  id: string;
  work_name: string;
  work_id?: string;
  media_type: 'photo' | 'video';
  media_url: string;
  thumbnail_url?: string;
  notes?: string;
  taken_at: string;
  week_number?: number;
  year?: number;
  category?: 'work' | 'life' | 'shared';
}

interface CategoryGroup {
  category: 'work' | 'life' | 'shared';
  label: string;
  icon: string;
  color: string;
  media: Media[];
}

interface PortfolioTabProps {
  childId: string;
  childName: string;
}

const CATEGORY_CONFIG = {
  work: { label: 'Work Photos', icon: '📚', color: 'from-blue-500 to-indigo-500', bgColor: 'bg-blue-50', textColor: 'text-blue-700' },
  life: { label: 'Life Photos', icon: '🌳', color: 'from-green-500 to-emerald-500', bgColor: 'bg-green-50', textColor: 'text-green-700' },
  shared: { label: 'Group Photos', icon: '👥', color: 'from-purple-500 to-violet-500', bgColor: 'bg-purple-50', textColor: 'text-purple-700' },
};

export default function PortfolioTab({ childId, childName }: PortfolioTabProps) {
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<{ media: Media; index: number; all: Media[] } | null>(null);
  const [filter, setFilter] = useState<'all' | 'photos' | 'videos'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'work' | 'life' | 'shared'>('all');
  const [generatingAlbum, setGeneratingAlbum] = useState(false);
  const [showVideoGenerator, setShowVideoGenerator] = useState(false);
  const [showCapture, setShowCapture] = useState(false);

  useEffect(() => {
    fetchMedia();
  }, [childId]);

  const fetchMedia = async () => {
    try {
      const res = await fetch(`/api/media?childId=${childId}`);
      const data = await res.json();
      
      // Group media by category
      const grouped: Record<string, Media[]> = { work: [], life: [], shared: [] };
      
      (data.media || []).forEach((m: Media) => {
        const cat = m.category || 'work';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(m);
      });

      // Create category groups
      const groups: CategoryGroup[] = Object.entries(grouped)
        .filter(([_, media]) => media.length > 0)
        .map(([cat, media]) => ({
          category: cat as 'work' | 'life' | 'shared',
          ...CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG],
          media: media.sort((a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime())
        }))
        .sort((a, b) => {
          const order = { work: 0, life: 1, shared: 2 };
          return order[a.category] - order[b.category];
        });

      setCategoryGroups(groups);
    } catch (error) {
      // Error fetching media
    } finally {
      setLoading(false);
    }
  };

  const openLightbox = (media: Media, allMedia: Media[]) => {
    const index = allMedia.findIndex(m => m.id === media.id);
    setLightbox({ media, index, all: allMedia });
  };

  const closeLightbox = () => setLightbox(null);

  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (!lightbox) return;
    const newIndex = direction === 'prev' 
      ? Math.max(0, lightbox.index - 1)
      : Math.min(lightbox.all.length - 1, lightbox.index + 1);
    setLightbox({
      ...lightbox,
      index: newIndex,
      media: lightbox.all[newIndex]
    });
  };

  // Filter media
  const filteredGroups = categoryGroups
    .filter(g => categoryFilter === 'all' || g.category === categoryFilter)
    .map(group => ({
      ...group,
      media: group.media.filter(m => 
        filter === 'all' || 
        (filter === 'photos' && m.media_type === 'photo') ||
        (filter === 'videos' && m.media_type === 'video')
      )
    }))
    .filter(g => g.media.length > 0);

  // Stats
  const allMedia = categoryGroups.flatMap(g => g.media);
  const photoCount = allMedia.filter(m => m.media_type === 'photo').length;
  const videoCount = allMedia.filter(m => m.media_type === 'video').length;

  // Generate Album
  const handleGenerateAlbum = async () => {
    if (allMedia.length === 0) {
      toast.error('No photos to include in album');
      return;
    }
    
    setGeneratingAlbum(true);
    try {
      const res = await fetch('/api/classroom/album/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, childName })
      });
      
      if (!res.ok) throw new Error('Failed to generate album');
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${childName.replace(/\s+/g, '_')}_Album.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('📖 Album downloaded!');
    } catch (error) {
      console.error('Album generation error:', error);
      toast.error('Failed to generate album');
    } finally {
      setGeneratingAlbum(false);
    }
  };

  // Show Video Generator
  const handleGenerateVideo = () => {
    if (photoCount === 0) {
      toast.error('No photos to include in video');
      return;
    }
    setShowVideoGenerator(true);
  };

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

  if (allMedia.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">📷</span>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">No photos yet</h3>
        <p className="text-gray-500 text-sm">
          Capture photos from the "This Week" tab to build {childName}'s portfolio
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Stats & Actions */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-gray-900">{childName}'s Portfolio</h3>
            <p className="text-sm text-gray-500">
              {photoCount} photos • {videoCount} videos
            </p>
          </div>
          
          {/* Generate Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleGenerateAlbum}
              disabled={generatingAlbum}
              className="px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50"
            >
              {generatingAlbum ? '⏳' : '📖'} Album
            </button>
            <button
              onClick={handleGenerateVideo}
              className="px-3 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all"
            >
              🎬 Video
            </button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {/* Category Filter */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {[
              { id: 'all', label: 'All' },
              { id: 'work', label: '📚' },
              { id: 'life', label: '🌳' },
              { id: 'shared', label: '👥' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setCategoryFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  categoryFilter === f.id 
                    ? 'bg-white shadow text-blue-600' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          
          {/* Type Filter */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {[
              { id: 'all', label: 'All' },
              { id: 'photos', label: '📷' },
              { id: 'videos', label: '🎬' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filter === f.id 
                    ? 'bg-white shadow text-blue-600' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category Groups */}
      <div className="space-y-4">
        {filteredGroups.map(group => (
          <div key={group.category} className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Category Header */}
            <div className={`p-3 ${group.bgColor} border-b`}>
              <div className="flex items-center gap-2">
                <span className="text-xl">{group.icon}</span>
                <h4 className={`font-bold ${group.textColor}`}>{group.label}</h4>
                <span className={`text-xs ${group.bgColor} ${group.textColor} px-2 py-0.5 rounded-full ml-auto`}>
                  {group.media.length} {group.media.length === 1 ? 'item' : 'items'}
                </span>
              </div>
            </div>

            {/* Media Grid */}
            <div className="p-3">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {group.media.map(media => (
                  <MediaThumbnail
                    key={media.id}
                    media={media}
                    onClick={() => openLightbox(media, group.media)}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Video Generator Modal */}
      {showVideoGenerator && (
        <VideoGenerator
          childId={childId}
          childName={childName}
          onClose={() => setShowVideoGenerator(false)}
        />
      )}

      {/* Photo Capture Modal */}
      {showCapture && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <PhotoCapture
            childId={childId}
            childName={childName}
            defaultCategory="life"
            onComplete={() => {
              setShowCapture(false);
              fetchMedia();
            }}
            onClose={() => setShowCapture(false)}
          />
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setShowCapture(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-full shadow-xl flex items-center justify-center text-3xl hover:shadow-2xl hover:scale-105 transition-all z-50"
        title="Add photo"
      >
        +
      </button>

      {/* Lightbox */}
      {lightbox && (
        <Lightbox
          media={lightbox.media}
          index={lightbox.index}
          total={lightbox.all.length}
          onClose={closeLightbox}
          onPrev={() => navigateLightbox('prev')}
          onNext={() => navigateLightbox('next')}
        />
      )}
    </div>
  );
}

// Media Thumbnail Component
function MediaThumbnail({ media, onClick }: { media: Media; onClick: () => void }) {
  const [videoThumb, setVideoThumb] = useState<string | null>(null);

  useEffect(() => {
    if (media.media_type === 'video' && !media.thumbnail_url) {
      generateVideoThumbnail();
    }
  }, [media]);

  const generateVideoThumbnail = () => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = media.media_url;
    video.muted = true;
    video.playsInline = true;
    
    video.onloadeddata = () => {
      video.currentTime = 1;
    };
    
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);
        setVideoThumb(canvas.toDataURL('image/jpeg'));
      } catch (e) {
        // Could not generate thumbnail
      }
    };
  };

  const isVideo = media.media_type === 'video';
  const thumbSrc = media.thumbnail_url || videoThumb || (isVideo ? null : media.media_url);

  return (
    <button
      onClick={onClick}
      className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group hover:ring-2 hover:ring-blue-400 transition-all"
    >
      {thumbSrc ? (
        <img
          src={thumbSrc}
          alt={media.work_name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-200">
          <span className="text-2xl">{isVideo ? '🎬' : '📷'}</span>
        </div>
      )}
      
      {/* Video indicator */}
      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center">
            <span className="text-lg ml-1">▶️</span>
          </div>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

      {/* Date badge */}
      <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
        {new Date(media.taken_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </div>
    </button>
  );
}

// Lightbox Component
function Lightbox({ 
  media, 
  index, 
  total, 
  onClose, 
  onPrev, 
  onNext 
}: { 
  media: Media; 
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, onPrev, onNext]);

  const isVideo = media.media_type === 'video';
  const categoryConfig = CATEGORY_CONFIG[media.category || 'work'];

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 z-10"
      >
        ✕
      </button>

      {/* Navigation */}
      {index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30"
        >
          ←
        </button>
      )}
      {index < total - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30"
        >
          →
        </button>
      )}

      {/* Media */}
      <div 
        className="max-w-4xl max-h-[80vh] px-4"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo ? (
          <video
            src={media.media_url}
            controls
            autoPlay
            playsInline
            className="max-w-full max-h-[70vh] rounded-lg"
          />
        ) : (
          <img
            src={media.media_url}
            alt={media.work_name}
            className="max-w-full max-h-[70vh] rounded-lg object-contain"
          />
        )}

        {/* Info bar */}
        <div className="mt-4 text-center text-white">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span>{categoryConfig.icon}</span>
            <span className="text-sm text-white/70">{categoryConfig.label}</span>
          </div>
          <p className="font-bold">{media.work_name}</p>
          <p className="text-sm text-white/70">
            {new Date(media.taken_at).toLocaleDateString('en-US', { 
              weekday: 'long',
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
            {media.week_number && ` • Week ${media.week_number}`}
          </p>
          {media.notes && (
            <p className="text-sm text-white/60 mt-1">{media.notes}</p>
          )}
          <p className="text-xs text-white/50 mt-2">{index + 1} of {total}</p>
        </div>
      </div>
    </div>
  );
}
