'use client';

import React, { useEffect, useRef, useState } from 'react';

// Declare YouTube IFrame API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface VideoPlayerProps {
  videoId: string;
  title?: string;
  autoplay?: boolean;
  className?: string;
  childId?: string;
  curriculumVideoId?: string;
  curriculumWorkId?: string;
  onWatchComplete?: (workId: string) => void;
}

export function VideoPlayer({
  videoId,
  title = 'Video',
  autoplay = false,
  className = '',
  childId,
  curriculumVideoId,
  curriculumWorkId,
  onWatchComplete,
}: VideoPlayerProps) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isApiReady, setIsApiReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchDataRef = useRef({
    startTime: Date.now(),
    totalWatchedSeconds: 0,
    lastPosition: 0,
    videoDuration: 0,
    hasReportedCompletion: false,
  });

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // Detect device type
  const getDeviceType = (): 'desktop' | 'mobile' | 'tablet' => {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  };

  // Report watch progress to API
  const reportWatchProgress = async () => {
    if (!childId || !curriculumVideoId || !curriculumWorkId) {
      return; // Tracking not enabled
    }

    const watchData = watchDataRef.current;
    
    if (watchData.videoDuration === 0) {
      console.warn('Video duration not available yet');
      return;
    }

    try {
      const response = await fetch('/api/whale/video-watches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          curriculumVideoId,
          curriculumWorkId,
          watchDurationSeconds: Math.floor(watchData.totalWatchedSeconds),
          videoDurationSeconds: Math.floor(watchData.videoDuration),
          deviceType: getDeviceType(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Watch progress recorded:', data.message);

        // If work was completed, trigger callback
        if (data.workCompleted && !watchData.hasReportedCompletion) {
          watchData.hasReportedCompletion = true;
          if (onWatchComplete && curriculumWorkId) {
            onWatchComplete(curriculumWorkId);
          }
        }
      } else {
        console.error('❌ Failed to record watch progress:', data.error);
      }
    } catch (error) {
      console.error('❌ Error reporting watch progress:', error);
      // Don't throw - video should still play even if tracking fails
    }
  };

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setIsApiReady(true);
      return;
    }

    // Check if script is already loading
    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      // Script already exists, wait for it to load
      window.onYouTubeIframeAPIReady = () => {
        setIsApiReady(true);
      };
      return;
    }

    // Load the API script
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      setIsApiReady(true);
    };

    return () => {
      // Cleanup callback
      if (window.onYouTubeIframeAPIReady) {
        window.onYouTubeIframeAPIReady = () => {};
      }
    };
  }, []);

  // Initialize YouTube player when API is ready
  useEffect(() => {
    if (!isApiReady || !containerRef.current) return;

    // Clear any existing player
    if (playerRef.current) {
      playerRef.current.destroy();
    }

    try {
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          rel: 0, // Don't show related videos
          modestbranding: 1,
        },
        events: {
          onReady: (event: any) => {
            const player = event.target;
            watchDataRef.current.videoDuration = player.getDuration();
            console.log('🎬 Video player ready, duration:', watchDataRef.current.videoDuration);
          },
          onStateChange: (event: any) => {
            const player = event.target;
            const currentTime = player.getCurrentTime();
            const duration = player.getDuration();

            // Update duration if not set
            if (duration && watchDataRef.current.videoDuration === 0) {
              watchDataRef.current.videoDuration = duration;
            }

            // Calculate watched time
            const timeDiff = currentTime - watchDataRef.current.lastPosition;
            if (timeDiff > 0 && timeDiff < 5) {
              // Normal playback (not seeking)
              watchDataRef.current.totalWatchedSeconds += timeDiff;
            }
            watchDataRef.current.lastPosition = currentTime;

            // State 1 = playing, 2 = paused, 0 = ended
            if (event.data === 1) {
              console.log('▶️ Video playing');
            } else if (event.data === 2) {
              console.log('⏸️ Video paused, reporting progress...');
              reportWatchProgress();
            } else if (event.data === 0) {
              console.log('🏁 Video ended, reporting final progress...');
              watchDataRef.current.totalWatchedSeconds = duration; // Mark as fully watched
              reportWatchProgress();
            }
          },
          onError: (event: any) => {
            console.error('❌ YouTube player error:', event.data);
            setError('Failed to load video');
          },
        },
      });
    } catch (err) {
      console.error('❌ Error creating YouTube player:', err);
      setError('Failed to initialize video player');
    }

    // Report progress every 30 seconds while playing
    const interval = setInterval(() => {
      if (playerRef.current && playerRef.current.getPlayerState) {
        const state = playerRef.current.getPlayerState();
        if (state === 1) {
          // Playing
          const currentTime = playerRef.current.getCurrentTime();
          const timeDiff = currentTime - watchDataRef.current.lastPosition;
          if (timeDiff > 0 && timeDiff < 35) {
            watchDataRef.current.totalWatchedSeconds += timeDiff;
          }
          watchDataRef.current.lastPosition = currentTime;
          reportWatchProgress();
        }
      }
    }, 30000); // Every 30 seconds

    return () => {
      clearInterval(interval);
      if (playerRef.current) {
        // Final report on unmount
        reportWatchProgress();
        playerRef.current.destroy();
      }
    };
  }, [isApiReady, videoId, childId, curriculumVideoId, curriculumWorkId, autoplay]);

  // Show error state
  if (error) {
    return (
      <div className={`video-player ${className}`}>
        <div className="aspect-video w-full rounded-lg overflow-hidden shadow-lg bg-red-50 flex items-center justify-center">
          <div className="text-center p-6">
            <p className="text-red-600 font-medium mb-2">⚠️ {error}</p>
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm underline"
            >
              Watch on YouTube instead →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`video-player ${className}`}>
      <div className="aspect-video w-full rounded-lg overflow-hidden shadow-lg bg-black">
        {!isApiReady ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <div className="animate-pulse text-white">Loading video player...</div>
          </div>
        ) : (
          <div ref={containerRef} className="w-full h-full" />
        )}
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
        
        {childId && curriculumVideoId && curriculumWorkId && (
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            Watch progress tracked
          </div>
        )}
      </div>
    </div>
  );
}
