/**
 * GET /api/montree/dark-phonics-live/app-version
 *
 * The standalone Android app's update check. Returns the latest shipped APK's
 * version, its numeric versionCode and where to download it.
 *
 * PUBLIC AND UN-GATED, deliberately, on both counts:
 *   - No auth. The app calls this on launch, BEFORE a parent has signed in
 *     (and an out-of-date build may not be able to sign in at all). Requiring
 *     a token here would make a broken build un-updatable.
 *   - No `dark_phonics_live` feature-flag check. That flag is per-school and is
 *     read from a parent session this endpoint does not have; more importantly
 *     an app that is too old must still be told "get the new version" even if
 *     the school it belongs to has the feature off.
 *
 * It leaks nothing: the response is a compile-time constant, identical for
 * every caller, and describes a file that is already served publicly at
 * montree.xyz/downloads/.
 *
 * CORS is stamped by withDplCors so the packaged shell (capacitor://localhost
 * &c.) can read the body; a browser on the website sends no allow-listed
 * Origin and gets an untouched response, exactly like every other DPL route.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { withDplCors, dplOptionsHandler } from '@/lib/montree/dark-phonics-live/app-auth';

export const dynamic = 'force-dynamic';

/** Preflight — the app's cross-origin GET triggers one once it sets headers. */
export const OPTIONS = dplOptionsHandler;

/* ========================================================================== *
 *  🚨🚨  BUMP THIS WITH EVERY APK RELEASE.  🚨🚨
 *
 *  The app compares `versionCode` (an integer, monotonically increasing) to
 *  its own build's versionCode and prompts an update when this one is higher.
 *  `version` is display-only (what the parent sees); `versionCode` is what
 *  decides. Bump them TOGETHER with android/app/build.gradle, and ship this
 *  file in the SAME deploy as the new public/downloads/dark-phonics-live.apk —
 *  publishing a higher versionCode than the APK actually on disk puts every
 *  installed app into an update loop.
 *
 *  `notes` is shown verbatim in the update prompt. Keep it short and in
 *  Chinese first (the audience is Chinese parents); '' hides the notes line.
 * ========================================================================== */
const ANDROID_RELEASE = {
  version: '1.0.0',
  versionCode: 1,
  url: 'https://montree.xyz/downloads/dark-phonics-live.apk',
  notes: '',
} as const;

export async function GET(request: NextRequest) {
  return withDplCors(NextResponse.json({ android: ANDROID_RELEASE }), request);
}
