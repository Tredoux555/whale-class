/**
 * V2 Shelf — the audio seam.
 *
 * Audio is DELIBERATELY OFF in the V2 shelf today. The shelf is designed around
 * recorded human clips (a real voice reading the book line, saying the word, and
 * sounding the letter) rather than the browser's speech synthesiser, and those
 * clips have not been recorded yet.
 *
 * Rather than leave the call sites to be retro-fitted later — which is how a
 * sound ends up firing in the wrong place — every moment that WILL carry a clip
 * already calls `playAudio()` today. It is a documented no-op. When the clips
 * land, this one file becomes the player and the whole shelf gains its voice
 * with no change anywhere else.
 *
 * PURE-ISH BY LAW: no imports, no React, no side effects beyond the (currently
 * absent) playback itself. Safe to call during an event handler, never during
 * render.
 *
 * TODO(audio): swap the body for a real player.
 *   - clips live under /dark-phonics-live/audio/<kind>/<key>.mp3
 *   - one <audio> element reused, previous clip stopped before the next starts
 *   - honour a shelf-level mute; never autoplay without a prior user gesture
 */

/** What sort of clip a moment wants. */
export type ShelfAudioKind =
  /** A single letter's phoneme — "/s/". Key: the letter. */
  | 'letter'
  /** One spoken word — a word card landing in its slot. Key: the word. */
  | 'word'
  /** A whole book line — a picture or sentence card landing home. Key: the line. */
  | 'sentence'
  /** A page turn in the reader. Key: the page's own line. */
  | 'page';

/**
 * Play the clip for one moment of the shelf, if there is one.
 *
 * Currently a no-op by design (see the file header). It must never throw and
 * must never be awaited — call it and carry on.
 */
export function playAudio(kind: ShelfAudioKind, key: string): void {
  // Intentionally silent. Referencing the arguments keeps the signature honest
  // and stops a linter deciding they are dead.
  void kind;
  void key;
}
