// lib/potato/save-to-device.ts
// Keep a copy of what she just shot on HER OWN phone, not only in the class.
//
// 🚨 WHY THIS IS NOT ONE LINE OF CODE.
// Potato Snaps is a PWA. There is no native shell here, so "save to the camera
// roll" is not an API we can call — it is two different platform behaviours
// wearing one name:
//
//   • iOS / iPadOS — an <a download> does NOT reach Photos. Safari hands the
//     file to Files (or, in a standalone PWA, quietly does nothing at all).
//     The ONLY route into the camera roll from the web is the share sheet:
//     navigator.share({ files }) → the teacher taps "Save Image". So on iOS we
//     share, and the extra tap is the price of the feature existing at all.
//   • Android / desktop — the share sheet is a worse experience (an app
//     chooser for something she did not ask to send). A plain <a download>
//     saves silently, and Android's media scanner files a JPEG into the
//     gallery by itself. So everywhere else we download.
//
// 🚨 USER ACTIVATION. navigator.share() must run inside the gesture that asked
// for it. Callers must invoke this from the tap handler — a couple of awaited
// IndexedDB writes are fine (transient activation lasts seconds), an awaited
// network round trip is not.
//
// 🚨 THIS MAY NEVER BREAK A SAVE. The photo reaching the class is the product;
// a copy on the phone is a courtesy. Every path here resolves — nothing throws
// at the caller, and a browser that cannot do either thing says 'unsupported'
// rather than failing.

/** What actually happened. Never an exception. */
export type SaveToDeviceResult =
  /** the native shell put it straight in the camera roll — no taps, no chooser */
  | 'saved'
  /** handed to the OS share sheet — on iOS this is where "Save Image" lives */
  | 'shared'
  /** written straight to Downloads / the gallery */
  | 'downloaded'
  /** she dismissed the share sheet; nothing went wrong */
  | 'cancelled'
  /** this browser can do neither — the caller should stop offering it */
  | 'unsupported';

/** localStorage key. `'0'` is off; anything else (including absent) is on. */
const PREF_KEY = 'tp_save_to_device';

/**
 * Is saving a copy to the phone switched on?
 *
 * DEFAULT ON. A teacher who takes a photo of a child expects her phone to have
 * that photo, the way it would if she had used the camera app.
 */
export function getSaveToDevicePreference(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(PREF_KEY) !== '0';
  } catch {
    // Private mode, blocked storage — behave like the default rather than
    // taking the feature away.
    return true;
  }
}

export function setSaveToDevicePreference(on: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PREF_KEY, on ? '1' : '0');
  } catch {
    /* non-fatal — the toggle just will not survive a reload */
  }
}

/**
 * iPhone / iPad, including an iPad running iPadOS 13+, which lies about being
 * a Mac in every string it reports and is only given away by touch points.
 */
export function isIosLike(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return /Mac/.test(ua) && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * "potato-20260826-142530.jpg" — sortable, obviously ours, and unique enough
 * that a morning of shots never collides in the same folder.
 *
 * Built from LOCAL calendar fields, never toISOString(): the file is named for
 * the moment the teacher remembers taking it.
 */
export function potatoMediaFilename(
  mediaType: 'photo' | 'video',
  when: Date = new Date(),
  extension?: string,
): string {
  const d = Number.isNaN(when.getTime()) ? new Date() : when;
  const stamp =
    `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}` +
    `-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
  const ext = (extension || (mediaType === 'video' ? 'mp4' : 'jpg')).replace(/[^a-z0-9]/gi, '').toLowerCase();
  return `potato-${stamp}.${ext || 'jpg'}`;
}

/** A dismissed share sheet, which is a normal thing a person does. */
function isAbort(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: string }).name === 'AbortError'
  );
}

/** The everywhere-but-iOS path: object URL → <a download> → click → revoke. */
function downloadBlob(blob: Blob, filename: string): SaveToDeviceResult {
  if (typeof document === 'undefined') return 'unsupported';
  let objectUrl: string | null = null;
  try {
    objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    console.error('[potato] save to device failed:', err);
    if (objectUrl) {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        /* non-fatal */
      }
    }
    return 'unsupported';
  }
  // Revoked on a delay — some browsers need the click's download to actually
  // start before the URL disappears out from under it. (Same reasoning as
  // downloadMedia in lib/potato/client.ts.)
  const url = objectUrl;
  setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* non-fatal */
    }
  }, 1000);
  return 'downloaded';
}

/**
 * 🚨 A STANDALONE SHAPE, NOT `extends Navigator`. lib.dom already declares
 * share/canShare as REQUIRED methods with optional arguments, so an interface
 * that re-declares them as optional properties "incorrectly extends" it and
 * the file will not compile. Feature detection is the whole point here — these
 * two are missing on desktop Firefox and on every browser older than the API —
 * so the shape has to be able to say "maybe absent", and it does that by not
 * claiming to be a Navigator at all.
 */
type ShareLike = {
  share?: (data: { files?: File[]; title?: string }) => Promise<void>;
  canShare?: (data: { files?: File[]; title?: string }) => boolean;
};

// ───────────────────────────────────────────────────────────────────────────
// THE NATIVE SHELL (Android — native/potato-snaps)
//
// 🚨 THE SAME BUNDLE RUNS IN BOTH PLACES. The Capacitor shell does not ship a
// copy of this app; it points a webview at https://www.teacherpotato.xyz and
// loads the very JS the browser loads. So every line below has to be inert on
// the web and only wake up inside the shell — which is why the detection is a
// runtime look at `window.Capacitor` (injected by the native bridge before our
// code runs) rather than a build flag. There is no build to flag.
//
// 🚨 WHY registerPlugin('Media') AND NOT `import { Media }`. The native side of
// @capacitor-community/media is compiled into the APK; the JS side is nothing
// but a proxy that posts messages over the bridge. Importing the package would
// drag it into the WEB bundle for every teacher on a phone browser who can
// never use it. registerPlugin() builds that same proxy by name from
// @capacitor/core alone — and even @capacitor/core is reached through a
// dynamic import inside the native branch, so the web build code-splits it out
// and never fetches the chunk.
// ───────────────────────────────────────────────────────────────────────────

/** The album a teacher will actually recognise in her gallery. */
const NATIVE_ALBUM_NAME = 'Potato Snaps';

/**
 * Only the three calls we make. Hand-declared rather than imported for the
 * bundling reason above — this is a message shape, not a dependency.
 */
type MediaAlbumLike = { identifier: string; name: string };
type MediaPluginLike = {
  getAlbums(): Promise<{ albums: MediaAlbumLike[] }>;
  createAlbum(options: { name: string }): Promise<void>;
  /** `path` takes a data: URI, a file path or an http(s) URL. */
  savePhoto(options: { path: string; albumIdentifier?: string; fileName?: string }): Promise<unknown>;
  saveVideo(options: { path: string; albumIdentifier?: string; fileName?: string }): Promise<unknown>;
};

/**
 * Are we inside the Capacitor shell rather than a browser?
 *
 * 🚨 CALL THIS IN AN EFFECT, NOT DURING RENDER. `window.Capacitor` does not
 * exist on the server, so a component that branches on it while rendering
 * hydrates to different markup than it was sent. Read it after mount.
 */
export function isNativeShell(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    return typeof cap?.isNativePlatform === 'function' && cap.isNativePlatform() === true;
  } catch {
    return false;
  }
}

/** Resolved once per session — the bridge proxy never changes underneath us. */
let mediaPluginPromise: Promise<MediaPluginLike | null> | null = null;

function getMediaPlugin(): Promise<MediaPluginLike | null> {
  if (!mediaPluginPromise) {
    mediaPluginPromise = (async () => {
      try {
        const { registerPlugin } = await import('@capacitor/core');
        return registerPlugin<MediaPluginLike>('Media');
      } catch (err) {
        console.error('[potato] no native Media bridge:', err);
        return null;
      }
    })();
  }
  return mediaPluginPromise;
}

/**
 * The identifier of our album, creating it the first time.
 *
 * 🚨 ANDROID REQUIRES albumIdentifier, AND IT IS NOT THE NAME. Since v5 the
 * plugin takes the identifier from getAlbums() on both platforms — on Android
 * that is the album's filesystem path, not "Potato Snaps". So: create (which
 * throws harmlessly if it already exists), then look the identifier up.
 *
 * Cached as the PROMISE, so a burst of shots shares one round trip instead of
 * racing to create the album three times.
 */
let albumIdentifierPromise: Promise<string | undefined> | null = null;

function potatoAlbumIdentifier(media: MediaPluginLike): Promise<string | undefined> {
  if (!albumIdentifierPromise) {
    albumIdentifierPromise = (async () => {
      const find = async (): Promise<string | undefined> => {
        const { albums } = await media.getAlbums();
        return albums.find((a) => a.name === NATIVE_ALBUM_NAME)?.identifier;
      };
      try {
        const existing = await find();
        if (existing) return existing;
        try {
          await media.createAlbum({ name: NATIVE_ALBUM_NAME });
        } catch {
          // Already there, or the OS said no. Either way, look again — and if
          // that comes up empty we save to the camera roll root, which is a
          // worse filing job but still a saved photo.
        }
        return await find();
      } catch (err) {
        console.error('[potato] could not resolve the album:', err);
        // Don't cache a transient failure forever.
        albumIdentifierPromise = null;
        return undefined;
      }
    })();
  }
  return albumIdentifierPromise;
}

/** The bridge speaks JSON, so the bytes have to travel as a data: URI. */
function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Could not read that file.'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error('Unexpected reader output.'));
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Save into the camera roll through the native shell.
 *
 * Returns `'saved'`, or `null` meaning "not here / didn't work" — the caller
 * then falls through to the web paths, so a broken bridge costs the teacher a
 * share sheet, not a photo.
 */
async function saveBlobToGallery(blob: Blob, filename: string): Promise<'saved' | null> {
  try {
    const media = await getMediaPlugin();
    if (!media) return null;

    // 🚨 The read happens BEFORE the album lookup on purpose: if the bytes are
    // unreadable there is nothing to file, and we skip the round trip.
    const path = await blobToDataUri(blob);
    const albumIdentifier = await potatoAlbumIdentifier(media);

    // "Do not include extension" — the plugin appends the right one from the
    // data URI's mime type, and a fileName of "potato-….jpg" lands on disk as
    // "potato-….jpg.jpg".
    const fileName = filename.replace(/\.[^.]+$/, '');
    const isVideo = blob.type.startsWith('video/') || /\.(mp4|mov|m4v|webm)$/i.test(filename);

    if (isVideo) await media.saveVideo({ path, albumIdentifier, fileName });
    else await media.savePhoto({ path, albumIdentifier, fileName });

    return 'saved';
  } catch (err) {
    // Includes the teacher declining the gallery permission prompt, which the
    // plugin raises itself. Not our business to nag — fall through quietly.
    console.error('[potato] native gallery save failed:', err);
    return null;
  }
}

/**
 * Put `blob` on the teacher's phone. Call it from inside the tap.
 *
 * Order is deliberate: the share sheet is tried FIRST and only on iOS, because
 * that is the only platform where the download path cannot reach Photos. If
 * the sheet is unavailable or errors for any reason other than a dismissal, we
 * still fall through to the download so she gets the file somewhere.
 */
export async function saveBlobToDevice(
  blob: Blob,
  filename: string,
  title = 'Potato Snaps',
): Promise<SaveToDeviceResult> {
  if (typeof window === 'undefined') return 'unsupported';

  // 🚨 NATIVE FIRST, AND ONLY IN THE SHELL. Inside the Android app the gallery
  // is a direct write: no share sheet, no app chooser, no Downloads folder she
  // has to go looking in — the shot appears in her camera roll the way one
  // from the camera app does. A null here means the bridge was not there or
  // did not work, and we carry on down the web paths untouched.
  if (isNativeShell()) {
    const native = await saveBlobToGallery(blob, filename);
    if (native) return native;
  }

  if (isIosLike() && typeof File === 'function') {
    const nav = navigator as unknown as ShareLike;
    if (typeof nav.share === 'function' && typeof nav.canShare === 'function') {
      try {
        const file = new File([blob], filename, {
          type: blob.type || 'application/octet-stream',
        });
        if (nav.canShare({ files: [file] })) {
          try {
            await nav.share({ files: [file], title });
            return 'shared';
          } catch (err) {
            // A dismissal is an answer, not a failure — do NOT then shove the
            // file into Files behind her back.
            if (isAbort(err)) return 'cancelled';
            console.error('[potato] share sheet failed:', err);
          }
        }
      } catch (err) {
        console.error('[potato] could not build a shareable file:', err);
      }
    }
  }

  return downloadBlob(blob, filename);
}

/**
 * The same thing for a photo that is already on the server — the manual "save
 * this one to my phone" on an older shot.
 *
 * 🚨 The fetch happens BEFORE any share, which means the share sheet opens
 * outside the original gesture. iOS tolerates this in practice; when it does
 * not, the caller gets 'unsupported' and a fallback (open the image in a tab
 * and long-press) is the honest answer, not a lie about having saved it.
 */
export async function saveUrlToDevice(
  url: string,
  filename: string,
  title = 'Potato Snaps',
): Promise<SaveToDeviceResult> {
  const response = await fetch(url, { credentials: 'same-origin' });
  if (!response.ok) {
    throw new Error(`Could not fetch that (${response.status}).`);
  }
  const blob = await response.blob();
  return saveBlobToDevice(blob, filename, title);
}
