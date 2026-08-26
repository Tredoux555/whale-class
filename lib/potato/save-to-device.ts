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
