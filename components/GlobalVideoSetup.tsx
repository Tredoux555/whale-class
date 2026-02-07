'use client';

import { useEffect } from 'react';
import { setupVideoForBackgroundPlayback, requestGlobalWakeLock, releaseGlobalWakeLock } from '@/lib/video-playback-utils';

/**
 * Global component that sets up all videos on the page for background playback
 * and screen wake lock. This ensures all videos, including dynamically loaded ones,
 * have proper attributes and wake lock functionality.
 */
export function GlobalVideoSetup() {
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    const setupAllVideos = () => {
      const videos = document.querySelectorAll('video');
      videos.forEach((video) => {
        if (video instanceof HTMLVideoElement) {
          setupVideoForBackgroundPlayback(video);

          // Add wake lock on play
          const handlePlay = async () => {
            try {
              if ('wakeLock' in navigator && !wakeLock) {
                wakeLock = await (navigator as any).wakeLock.request('screen');
              }
            } catch (err) {
              console.warn('Wake lock failed:', err);
            }
          };

          const handlePause = async () => {
            try {
              if (wakeLock) {
                await wakeLock.release();
                wakeLock = null;
              }
            } catch (err) {
              console.warn('Failed to release wake lock:', err);
            }
          };

          const handleEnded = async () => {
            try {
              if (wakeLock) {
                await wakeLock.release();
                wakeLock = null;
              }
            } catch (err) {
              console.warn('Failed to release wake lock:', err);
            }
          };

          // Remove old listeners if they exist
          video.removeEventListener('play', handlePlay);
          video.removeEventListener('pause', handlePause);
          video.removeEventListener('ended', handleEnded);

          // Add new listeners
          video.addEventListener('play', handlePlay);
          video.addEventListener('pause', handlePause);
          video.addEventListener('ended', handleEnded);
        }
      });
    };

    // Setup videos immediately
    setupAllVideos();

    // Handle visibility change (release wake lock when page hidden)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden' && wakeLock) {
        try {
          await wakeLock.release();
          wakeLock = null;
        } catch (err) {
          console.warn('Failed to release wake lock:', err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Re-run when new videos are added (for dynamically loaded content)
    const observer = new MutationObserver(() => {
      setupAllVideos();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Cleanup
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().catch(console.warn);
      }
    };
  }, []);

  return null; // This component doesn't render anything
}

