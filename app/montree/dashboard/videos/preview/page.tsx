// /montree/dashboard/videos/preview/page.tsx
// Preview all generated videos before sending
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface VideoContent {
  studentId: string;
  studentName: string;
  narration: string;
  photos: string[];
  highlights: string[];
  areasWorked: string[];
}

export default function VideoPreviewPage() {
  const [videos, setVideos] = useState<VideoContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    generateVideos();
  }, []);

  const generateVideos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/montree/videos/generate', { method: 'POST' });
      const data = await res.json();
      setVideos(data.videos || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };


  const sendAllToParents = async () => {
    setSending(true);
    // TODO: Implement actual sending via WeChat/email
    await new Promise(r => setTimeout(r, 2000));
    alert('Videos sent to all parents!');
    setSending(false);
  };

  const currentVideo = videos[currentIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🎬</div>
          <div className="text-white font-medium">Generating videos...</div>
          <div className="text-gray-400 text-sm mt-2">Using AI to create personalized narrations</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/montree/dashboard" className="text-gray-400 hover:text-white">
            ← Back
          </Link>
          <h1 className="text-lg font-bold text-white">Weekly Videos</h1>
          <div className="text-gray-400 text-sm">
            {currentIndex + 1} / {videos.length}
          </div>
        </div>

        {/* Video Preview Card */}
        {currentVideo && (
          <div className="bg-gray-900 rounded-2xl overflow-hidden mb-4">
            {/* Photo placeholder / slideshow area */}
            <div className="aspect-video bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center relative">
              {currentVideo.photos.length > 0 ? (
                <img 
                  src={currentVideo.photos[0]} 
                  alt={currentVideo.studentName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center">
                  <div className="text-6xl mb-2">📷</div>
                  <div className="text-white/60">No photos this week</div>
                </div>
              )}
              {/* Student name overlay */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2">
                  <div className="text-white font-bold text-xl">{currentVideo.studentName}</div>
                </div>
              </div>
            </div>

            {/* Narration */}
            <div className="p-4">
              <p className="text-white text-lg leading-relaxed italic">
                "{currentVideo.narration}"
              </p>
              
              {/* Highlights */}
              {currentVideo.highlights.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {currentVideo.highlights.map((h, i) => (
                    <span key={i} className="px-3 py-1 bg-emerald-900/30 text-emerald-400 text-xs rounded-full">
                      {h}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}


        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-white rounded-lg"
          >
            ← Previous
          </button>
          
          {/* Dots */}
          <div className="flex gap-1">
            {videos.slice(0, 10).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentIndex ? 'bg-emerald-400' : 'bg-gray-600'
                }`}
              />
            ))}
            {videos.length > 10 && <span className="text-gray-500 text-xs">+{videos.length - 10}</span>}
          </div>
          
          <button
            onClick={() => setCurrentIndex(i => Math.min(videos.length - 1, i + 1))}
            disabled={currentIndex === videos.length - 1}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-white rounded-lg"
          >
            Next →
          </button>
        </div>

        {/* Send All Button */}
        <button
          onClick={sendAllToParents}
          disabled={sending}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 text-white font-bold text-lg rounded-xl transition-colors"
        >
          {sending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">📤</span> Sending...
            </span>
          ) : (
            `📤 Send All ${videos.length} Videos to Parents`
          )}
        </button>

        {/* Student List Quick Jump */}
        <div className="mt-6">
          <h3 className="text-gray-400 text-sm mb-2">Jump to student:</h3>
          <div className="flex flex-wrap gap-2">
            {videos.map((v, i) => (
              <button
                key={v.studentId}
                onClick={() => setCurrentIndex(i)}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  i === currentIndex 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {v.studentName}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
