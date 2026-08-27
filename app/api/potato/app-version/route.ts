/**
 * GET /api/potato/app-version
 *
 * The standalone Potato Snaps app's update check. Returns the latest shipped
 * APK's version, its numeric versionCode and where to download it.
 *
 * PUBLIC AND UN-AUTHENTICATED, deliberately: the app calls this on launch,
 * BEFORE a teacher has signed in — and an out-of-date build may not be able to
 * sign in at all. Requiring a token here would make a broken build un-updatable.
 *
 * It leaks nothing: the response is a compile-time constant, identical for
 * every caller, and describes a file that is already served publicly at
 * montree.xyz/downloads/.
 *
 * CORS is stamped by withPotatoCors so the packaged shell
 * (capacitor://localhost &c.) can read the body; a browser on the website sends
 * no allow-listed Origin and gets an untouched response, exactly like every
 * other retrofitted potato route.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { withPotatoCors, potatoOptionsHandler } from '@/lib/potato/app-auth';

export const dynamic = 'force-dynamic';

/** Preflight — the app's cross-origin GET triggers one once it sets headers. */
export const OPTIONS = potatoOptionsHandler;

/* ========================================================================== *
 *  🚨🚨  BUMP THIS WITH EVERY APK RELEASE.  🚨🚨
 *
 *  The app compares `versionCode` (an integer, monotonically increasing) to
 *  its own build's versionCode and prompts an update when this one is higher.
 *  `version` is display-only (what the teacher sees); `versionCode` is what
 *  decides. Bump them TOGETHER with android/app/build.gradle, and ship this
 *  file in the SAME deploy as the new public/downloads/potato-snaps.apk —
 *  publishing a higher versionCode than the APK actually on disk puts every
 *  installed app into an update loop.
 *
 *  `notes` is shown verbatim in the update prompt; '' hides the notes line.
 * ========================================================================== */
/* ────────────────────────────────────────────────────────────────────────── *
 *  🚨🚨  DO NOT RAISE versionCode ABOVE 3 WITHOUT READING THIS.  🚨🚨
 *
 *  The APK now served at /downloads/potato-snaps.apk is a DIFFERENT APP from
 *  the one this endpoint used to describe:
 *
 *      old  xyz.montree.potatosnaps   1.0.2 (3)  signed CN=Dark Phonics Live
 *      new  xyz.teacherpotato.snaps   1.1.0 (2)  signed with the debug key
 *
 *  Different package AND different certificate, so the new file can never
 *  install *over* the old one — Android puts it on the phone as a second app.
 *  The old build is a self-contained Capacitor app with its own bundled UI; we
 *  do not have its keystore, so an upgrade for it cannot be produced at all.
 *
 *  That matters HERE because the old app is the only thing that reads this
 *  endpoint, and it nags whenever `versionCode` exceeds its own 3. Publish 4
 *  and every old install enters a permanent update loop: it downloads the new
 *  APK, installs it alongside itself, stays on versionCode 3, and asks again
 *  forever. So versionCode stays at 3 — equal, not higher, which is quiet —
 *  while `version` tracks what the download page should actually show.
 *
 *  When the old app is retired, delete this endpoint rather than bumping it.
 * ────────────────────────────────────────────────────────────────────────── */
const ANDROID_RELEASE = {
  version: '1.1.0',
  // Deliberately 3, not 2 and not 4. See the block above.
  versionCode: 3,
  url: 'https://montree.xyz/downloads/potato-snaps.apk',
  notes: 'Photos you take are now saved straight to your phone’s gallery.',
} as const;

export async function GET(request: NextRequest) {
  return withPotatoCors(NextResponse.json({ android: ANDROID_RELEASE }), request);
}
