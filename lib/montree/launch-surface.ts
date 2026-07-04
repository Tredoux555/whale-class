// lib/montree/launch-surface.ts
// Remembers the last app surface a signed-in user landed on so that opening
// Montree from the home-screen icon (PWA standalone launch) can jump straight
// there with NO marketing-splash flash — for ANY role, parents included.
//
// The value is read synchronously by the blocking inline <script> at the top
// of app/montree/page.tsx (before the marketing content paints). Teachers and
// principals also have their own localStorage session keys that the script
// checks first; this marker is what makes parents (cookie-only auth, no
// synchronous signal) get a flash-free launch too.

const LAUNCH_SURFACE_KEY = 'montree_launch_surface';

/** Persist the current app surface as the remembered launch target. */
export function rememberLaunchSurface(path: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (path && path.indexOf('/montree/') === 0) {
      localStorage.setItem(LAUNCH_SURFACE_KEY, path);
    }
  } catch {
    /* private browsing / disabled storage — non-fatal */
  }
}

/** Clear the remembered surface (call on logout). */
export function clearLaunchSurface(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LAUNCH_SURFACE_KEY);
  } catch {
    /* non-fatal */
  }
}
