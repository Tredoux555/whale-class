import { useEffect, useRef } from 'react';

interface UseVideoPlaybackOptions {
  videoTitle?: string;
  videoArtist?: string;
  videoThumbnail?: string;
}

export function useVideoPlayback(
  videoElement: HTMLVideoElement | null,
  options: UseVideoPlaybackOptions = {}
) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const mediaSessionRef = useRef<boolean>(false);

  // Request screen wake lock
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        console.log('Screen wake lock activated');
      }
    } catch (err) {
      console.warn('Wake lock not supported or failed:', err);
    }
  };

  // Release screen wake lock
  const releaseWakeLock = async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('Screen wake lock released');
      }
    } catch (err) {
      console.warn('Failed to release wake lock:', err);
    }
  };

  // Setup Media Session API for lock screen controls
  const setupMediaSession = (video: HTMLVideoElement) => {
    if (!('mediaSession' in navigator)) {
      return;
    }

    const mediaSession = (navigator as any).mediaSession;

    // Set metadata
    mediaSession.metadata = new (window as any).MediaMetadata({
      title: options.videoTitle || 'Video',
      artist: options.videoArtist || 'Whale Class',
      artwork: options.videoThumbnail
        ? [{ src: options.videoThumbnail, sizes: '512x512', type: 'image/png' }]
        : [],
    });

    // Play action
    mediaSession.setActionHandler('play', () => {
      video.play().catch(console.error);
    });

    // Pause action
    mediaSession.setActionHandler('pause', () => {
      video.pause();
    });

    // Seek backward
    mediaSession.setActionHandler('seekbackward', (details: any) => {
      video.currentTime = Math.max(0, video.currentTime - (details.seekOffset || 10));
    });

    // Seek forward
    mediaSession.setActionHandler('seekforward', (details: any) => {
      video.currentTime = Math.min(
        video.duration,
        video.currentTime + (details.seekOffset || 10)
      );
    });

    // Previous track
    mediaSession.setActionHandler('previoustrack', () => {
      video.currentTime = 0;
    });

    // Next track
    mediaSession.setActionHandler('nexttrack', () => {
      video.currentTime = video.duration;
    });

    mediaSessionRef.current = true;
  };

  // Update playback state
  const updatePlaybackState = (playing: boolean) => {
    if ('mediaSession' in navigator) {
      const mediaSession = (navigator as any).mediaSession;
      mediaSession.playbackState = playing ? 'playing' : 'paused';
    }
  };

  useEffect(() => {
    if (!videoElement) return;

    // Setup media session
    setupMediaSession(videoElement);

    // Handle visibility change (release wake lock when page hidden)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden' && wakeLockRef.current) {
        await releaseWakeLock();
      }
    };

    // Handle play event
    const handlePlay = async () => {
      await requestWakeLock();
      updatePlaybackState(true);
    };

    // Handle pause event
    const handlePause = async () => {
      await releaseWakeLock();
      updatePlaybackState(false);
    };

    // Handle ended event
    const handleEnded = async () => {
      await releaseWakeLock();
      updatePlaybackState(false);
    };

    // Add event listeners
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('ended', handleEnded);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('ended', handleEnded);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [videoElement, options.videoTitle, options.videoArtist, options.videoThumbnail]);

  return {
    requestWakeLock,
    releaseWakeLock,
  };
}

