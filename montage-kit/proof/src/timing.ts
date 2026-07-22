// Timing derived from the 76 BPM beat grid (matches beats.json / music.m4a).
export const FPS = 30;
export const BEAT = 60 / 76; // 0.789474 s
export const FADE = 0.8; // crossfade seconds

// Photos are stored newest-first (00..15). Film plays chronologically (oldest first).
export const PHOTO_ORDER = [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];

// Segment length per photo, in beats. Varied so cuts never feel mechanical;
// every cut lands on the beat grid, structural cuts on downbeats (÷4).
const SEG_BEATS = [4, 3, 4, 3, 3, 4, 3, 4, 3, 3, 4, 3, 4, 3, 3, 4]; // sum = 55

export const TITLE_END_BEAT = 5; // title occupies beats 0..5 (downbeat-ish anchor)

// Cut points (in beats) for each photo boundary.
export const CUTS: number[] = (() => {
  const cuts = [TITLE_END_BEAT];
  for (const s of SEG_BEATS) cuts.push(cuts[cuts.length - 1] + s);
  return cuts; // length 17: cuts[0]=5 (photo0 in), cuts[16]=60 (last photo out)
})();

export const END_CARD_BEAT = CUTS[CUTS.length - 1]; // 60 -> 47.37s
export const VIDEO_SECONDS = 50.7; // matches music length + 3s fade-out
export const DURATION_IN_FRAMES = Math.round(VIDEO_SECONDS * FPS); // 1521

export const beatToSec = (b: number) => b * BEAT;
export const secToFrame = (s: number) => s * FPS;

// Ken Burns recipe per photo index: alternating zoom + varied pan direction.
const PAN_DIRS: [number, number][] = [
  [-1, -0.6], [1, 0.7], [0.9, -0.8], [-0.8, 0.9],
  [-1, 0.5], [1, -0.6], [0, -1], [0.7, 1],
];
export function kenBurns(i: number) {
  const zoomIn = i % 2 === 0;
  const s0 = zoomIn ? 1.1 : 1.2;
  const s1 = zoomIn ? 1.2 : 1.1;
  const [dx, dy] = PAN_DIRS[i % PAN_DIRS.length];
  const mag = 3.0; // percent of element size (safe vs 5% overflow at scale 1.10)
  return { s0, s1, tx0: -dx * mag * 0.5, tx1: dx * mag * 0.5, ty0: -dy * mag * 0.5, ty1: dy * mag * 0.5 };
}
