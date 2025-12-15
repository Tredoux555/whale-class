// =====================================================
// VIDEO PLAYER COMPONENT
// =====================================================
'use client';

import React from 'react';

interface VideoPlayerProps {
  videoId: string;
  title?: string;
  autoplay?: boolean;
  className?: string;
}

export function VideoPlayer({
  videoId,
  title = 'Video',
  autoplay = false,
  className = '',
}: VideoPlayerProps) {
  const embedUrl = `https://www.youtube.com/embed/${videoId}${autoplay ? '?autoplay=1' : ''}`;
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  return (
    <div className={`video-player ${className}`}>
      <div className="aspect-video w-full rounded-lg overflow-hidden shadow-lg bg-black">
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
      
      <div className="mt-3 flex items-center justify-between text-sm">
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
          </svg>
          Watch on YouTube
        </a>
      </div>
    </div>
  );
}

