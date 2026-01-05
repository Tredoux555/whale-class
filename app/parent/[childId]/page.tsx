'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

interface Media {
  id: string;
  media_url: string;
  media_type: 'photo' | 'video';
  taken_at: string;
  work_name: string;
  notes?: string;
  report_date: string;
}

interface Child {
  id: string;
  name: string;
  age_group?: string;
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
        <p className="text-gray-500">Loading...</p>
      </div>
    </div>
  );
}

export default function ParentDailyReportPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ParentDailyReportContent />
    </Suspense>
  );
}

function ParentDailyReportContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const childId = params.childId as string;
  
  // Default to today's date
  const today = new Date().toISOString().split('T')[0];
  const selectedDate = searchParams.get('date') || today;
  
  const [child, setChild] = useState<Child | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingMedia, setViewingMedia] = useState<Media | null>(null);
  const [dateFilter, setDateFilter] = useState(selectedDate);

  useEffect(() => {
    if (childId) {
      fetchChild();
      fetchMedia();
    }
  }, [childId, dateFilter]);

  async function fetchChild() {
    try {
      const res = await fetch(`/api/parent/child?childId=${childId}`);
      const data = await res.json();
      if (data.success) {
        setChild(data.child);
      }
    } catch (err) {
      console.error('Failed to fetch child:', err);
    }
  }

  async function fetchMedia() {
    setLoading(true);
    try {
      // Fetch only parent-visible media
      const res = await fetch(`/api/media?childId=${childId}&parentOnly=true&date=${dateFilter}`);
      const data = await res.json();
      if (data.success) {
        setMedia(data.media || []);
      }
    } catch (err) {
      console.error('Failed to fetch media:', err);
    }
    setLoading(false);
  }

  // Group media by work
  const mediaByWork = media.reduce((acc, m) => {
    if (!acc[m.work_name]) acc[m.work_name] = [];
    acc[m.work_name].push(m);
    return acc;
  }, {} as Record<string, Media[]>);

  // Get last 7 days for date picker
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateStr === today.toISOString().split('T')[0]) return 'Today';
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {child?.name || 'Loading...'}'s Day
              </h1>
              <p className="text-sm text-gray-500">Daily Report</p>
            </div>
            <div className="text-4xl">🐋</div>
          </div>
        </div>
      </header>

      {/* Date Selector */}
      <div className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {last7Days.map(date => (
              <button
                key={date}
                onClick={() => setDateFilter(date)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                  ${dateFilter === date 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {formatDate(date)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto" />
          </div>
        ) : media.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
            <div className="text-5xl mb-4">📷</div>
            <p className="text-gray-600 mb-2">No updates for {formatDate(dateFilter)}</p>
            <p className="text-sm text-gray-400">Check back later or try another day</p>
          </div>
        ) : (
          <>
            {/* Summary Card */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white mb-6">
              <h2 className="text-lg font-semibold mb-2">
                {formatDate(dateFilter)}'s Activities
              </h2>
              <div className="flex gap-4">
                <div className="bg-white/20 rounded-xl px-4 py-2">
                  <div className="text-2xl font-bold">{Object.keys(mediaByWork).length}</div>
                  <div className="text-xs text-blue-100">Works</div>
                </div>
                <div className="bg-white/20 rounded-xl px-4 py-2">
                  <div className="text-2xl font-bold">{media.filter(m => m.media_type === 'photo').length}</div>
                  <div className="text-xs text-blue-100">Photos</div>
                </div>
                <div className="bg-white/20 rounded-xl px-4 py-2">
                  <div className="text-2xl font-bold">{media.filter(m => m.media_type === 'video').length}</div>
                  <div className="text-xs text-blue-100">Videos</div>
                </div>
              </div>
            </div>

            {/* Media by Work */}
            <div className="space-y-4">
              {Object.entries(mediaByWork).map(([workName, workMedia]) => (
                <div key={workName} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b bg-gray-50">
                    <h3 className="font-semibold text-gray-800">📚 {workName}</h3>
                    <p className="text-xs text-gray-500">
                      {workMedia.length} {workMedia.length === 1 ? 'capture' : 'captures'}
                    </p>
                  </div>
                  
                  <div className="p-4">
                    <div className="grid grid-cols-3 gap-2">
                      {workMedia.map(item => (
                        <button
                          key={item.id}
                          onClick={() => setViewingMedia(item)}
                          className="aspect-square rounded-xl overflow-hidden bg-gray-100 relative"
                        >
                          {item.media_type === 'video' ? (
                            <>
                              <video src={item.media_url} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center">
                                  <span className="text-blue-600 text-lg ml-1">▶</span>
                                </div>
                              </div>
                            </>
                          ) : (
                            <img src={item.media_url} alt={item.work_name} className="w-full h-full object-cover" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer message */}
            <div className="text-center py-8 text-gray-400 text-sm">
              Shared by {child?.name}'s teacher 💙
            </div>
          </>
        )}
      </main>

      {/* Media Viewer Modal */}
      {viewingMedia && (
        <div 
          className="fixed inset-0 z-50 bg-black flex flex-col"
          onClick={() => setViewingMedia(null)}
        >
          {/* Close button */}
          <button 
            onClick={() => setViewingMedia(null)} 
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white text-xl z-10"
          >
            ✕
          </button>

          {/* Media content */}
          <div className="flex-1 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
            {viewingMedia.media_type === 'video' ? (
              <video 
                src={viewingMedia.media_url} 
                controls 
                autoPlay
                playsInline
                className="max-w-full max-h-[75vh] rounded-xl"
              />
            ) : (
              <img 
                src={viewingMedia.media_url} 
                alt={viewingMedia.work_name} 
                className="max-w-full max-h-[75vh] object-contain"
              />
            )}
          </div>

          {/* Info bar */}
          <div className="bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
            <div className="max-w-2xl mx-auto">
              <p className="font-semibold text-lg">{viewingMedia.work_name}</p>
              <p className="text-white/70 text-sm">
                {new Date(viewingMedia.taken_at).toLocaleDateString('en-US', { 
                  weekday: 'long', month: 'long', day: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </p>
              {viewingMedia.notes && (
                <p className="mt-2 text-white/90 bg-white/10 rounded-lg px-3 py-2">
                  💬 {viewingMedia.notes}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
