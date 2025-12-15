/**
 * Utility functions for video playback with screen wake lock and background playback
 */

export function setupVideoForBackgroundPlayback(video: HTMLVideoElement) {
  // Ensure video has proper attributes for background playback
  video.setAttribute('playsinline', 'true');
  video.setAttribute('webkit-playsinline', 'true');
  video.setAttribute('x-webkit-airplay', 'allow');
  
  // Enable background audio playback on iOS
  if (video instanceof HTMLVideoElement) {
    (video as any).webkitPreservesPitch = true;
  }
}

export function setupMediaSessionForVideo(
  video: HTMLVideoElement,
  title: string,
  artist: string = 'Whale Class',
  thumbnail?: string
) {
  if (!('mediaSession' in navigator)) {
    return;
  }

  const mediaSession = (navigator as any).mediaSession;

  mediaSession.metadata = new (window as any).MediaMetadata({
    title,
    artist,
    artwork: thumbnail
      ? [{ src: thumbnail, sizes: '512x512', type: 'image/png' }]
      : [],
  });

  mediaSession.setActionHandler('play', () => {
    video.play().catch(console.error);
  });
  
  mediaSession.setActionHandler('pause', () => {
    video.pause();
  });
  
  mediaSession.setActionHandler('seekbackward', (details: any) => {
    video.currentTime = Math.max(0, video.currentTime - (details.seekOffset || 10));
  });
  
  mediaSession.setActionHandler('seekforward', (details: any) => {
    video.currentTime = Math.min(video.duration, video.currentTime + (details.seekOffset || 10));
  });
  
  mediaSession.setActionHandler('previoustrack', () => {
    video.currentTime = 0;
  });
  
  mediaSession.setActionHandler('nexttrack', () => {
    video.currentTime = video.duration;
  });
}

let globalWakeLock: WakeLockSentinel | null = null;

export async function requestGlobalWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      globalWakeLock = await (navigator as any).wakeLock.request('screen');
      console.log('Global screen wake lock activated');
      return globalWakeLock;
    }
  } catch (err) {
    console.warn('Wake lock not supported or failed:', err);
  }
  return null;
}

export async function releaseGlobalWakeLock() {
  try {
    if (globalWakeLock) {
      await globalWakeLock.release();
      globalWakeLock = null;
      console.log('Global screen wake lock released');
    }
  } catch (err) {
    console.warn('Failed to release wake lock:', err);
  }
}

