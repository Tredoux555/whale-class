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
    (video as unknown as { webkitPreservesPitch: boolean }).webkitPreservesPitch = true;
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

  // The Media Session API is in lib.dom — navigator.mediaSession and
  // MediaMetadata are both typed, so none of this needs casting.
  const { mediaSession } = navigator;

  mediaSession.metadata = new MediaMetadata({
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
  
  mediaSession.setActionHandler('seekbackward', (details) => {
    const offset = details.seekOffset || 10;
    video.currentTime = Math.max(0, video.currentTime - offset);
  });

  mediaSession.setActionHandler('seekforward', (details) => {
    const offset = details.seekOffset || 10;
    video.currentTime = Math.min(video.duration, video.currentTime + offset);
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
      globalWakeLock = await (navigator as unknown as { wakeLock: { request: (type: string) => Promise<WakeLockSentinel> } }).wakeLock.request('screen');
      return globalWakeLock;
    }
  } catch (err) {
    // Wake lock not supported or failed
  }
  return null;
}

export async function releaseGlobalWakeLock() {
  try {
    if (globalWakeLock) {
      await globalWakeLock.release();
      globalWakeLock = null;
    }
  } catch (err) {
    // Failed to release wake lock
  }
}

