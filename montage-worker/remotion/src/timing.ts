// Pure, deterministic timeline computation for the weekly montage.
//
// The music library ships with a precomputed beat grid per track
// (`<slug>.beats.json`: bpm, beats[], downbeats[], duration). NO audio
// analysis ever happens at render time — cuts snap to the downbeat grid.
//
// Identical inputs always produce identical output (required so the worker's
// calculateMetadata and the component agree on frame counts).

export const FPS = 30;
export const FADE = 0.8; // crossfade seconds (windows centred on each cut)

export interface Track {
  slug: string;
  bpm: number;
  downbeats: number[]; // seconds, ascending
  durationSec: number;
}

export interface MontageProps {
  childName: string;
  subtitle: string; // e.g. "Week of July 20"
  eyebrow?: string; // defaults to "Weekly Moments"
  photos: { file: string }[]; // public-relative, e.g. "photos/job/00.jpg"
  track: Track;
  locale?: string;
  // Index signature: Remotion requires composition props to be assignable to
  // Record<string, unknown>. Declared props keep their concrete types.
  [key: string]: unknown;
}

export interface Cut {
  index: number; // photo index (0-based, chronological)
  startSec: number; // downbeat time this photo appears
  endSec: number; // downbeat time this photo leaves (== next start / end card)
}

export interface Timeline {
  fps: number;
  titleStartSec: number; // always 0
  titleEndSec: number; // first photo's downbeat
  cuts: Cut[];
  endCardStartSec: number;
  endCardDurationSec: number;
  totalDurationSec: number;
  totalDurationFrames: number;
}

// Target / bounds (seconds).
const TARGET_TOTAL_SEC = 50;
const MIN_TOTAL_SEC = 35;
const MAX_TOTAL_SEC = 65;
const MIN_TITLE_SEC = 2.6;
const END_CARD_TARGET_SEC = 3.5;
const END_CARD_MIN_SEC = 2.6;
const MIN_K = 1; // downbeat-intervals per photo
const MAX_K = 3;

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Median downbeat interval — robust to a stray long gap at the tail.
function medianDownbeatInterval(downbeats: number[]): number {
  const gaps: number[] = [];
  for (let i = 1; i < downbeats.length; i++) {
    gaps.push(downbeats[i] - downbeats[i - 1]);
  }
  const m = median(gaps);
  return m > 0.05 ? m : 2.6; // fallback for degenerate grids
}

// Spread `plusCount` +1 bumps evenly across `count` photos (interleaved so the
// longer dwells don't clump at the front). Deterministic.
function distributeIntervals(totalIntervals: number, count: number): number[] {
  if (count <= 0) return [];
  let base = clamp(Math.floor(totalIntervals / count), MIN_K, MAX_K);
  const ks = new Array(count).fill(base);
  let plusCount = base < MAX_K ? clamp(totalIntervals - base * count, 0, count) : 0;
  if (plusCount > 0) {
    const step = count / plusCount;
    for (let j = 0; j < plusCount; j++) {
      const idx = Math.min(count - 1, Math.floor(j * step));
      ks[idx] = Math.min(MAX_K, ks[idx] + 1);
    }
  }
  return ks;
}

export function computeTimeline(
  props: Pick<MontageProps, 'photos' | 'track'>,
  fps: number = FPS
): Timeline {
  const { downbeats, durationSec } = props.track;
  const photoCount = props.photos.length;

  // A track must always leave one second of tail after everything.
  const hardCeiling = Math.max(MIN_TOTAL_SEC, durationSec - 1);

  // --- title: end on the first downbeat that gives us >= MIN_TITLE_SEC ---
  let titleEndIdx = 1;
  if (downbeats.length > 1) {
    titleEndIdx = downbeats.findIndex((t) => t >= MIN_TITLE_SEC);
    if (titleEndIdx < 1) titleEndIdx = 1;
    // keep at least two downbeats of runway for photos + end card
    titleEndIdx = Math.min(titleEndIdx, Math.max(1, downbeats.length - 3));
  }
  const titleEndSec = downbeats.length > titleEndIdx ? downbeats[titleEndIdx] : 3.0;

  // Degenerate: no photos → title + end card only.
  if (photoCount === 0) {
    const endCardStartSec = titleEndSec;
    const endCardDurationSec = clamp(
      END_CARD_TARGET_SEC,
      END_CARD_MIN_SEC,
      Math.max(END_CARD_MIN_SEC, hardCeiling - endCardStartSec)
    );
    const totalDurationSec = endCardStartSec + endCardDurationSec;
    return {
      fps,
      titleStartSec: 0,
      titleEndSec,
      cuts: [],
      endCardStartSec,
      endCardDurationSec,
      totalDurationSec,
      totalDurationFrames: Math.round(totalDurationSec * fps),
    };
  }

  const dbAvg = medianDownbeatInterval(downbeats);

  // Target photo-region seconds so the whole film lands near TARGET_TOTAL_SEC.
  const targetTotal = clamp(TARGET_TOTAL_SEC, MIN_TOTAL_SEC, hardCeiling);
  const targetPhotoRegion = Math.max(
    dbAvg * photoCount, // never below one interval per photo
    targetTotal - titleEndSec - END_CARD_TARGET_SEC
  );
  const targetIntervals = Math.max(
    photoCount,
    Math.round(targetPhotoRegion / dbAvg)
  );

  let ks = distributeIntervals(targetIntervals, photoCount);

  // How many downbeats are available for the photo region (leave >=1 for the
  // end card to start on).
  const maxIntervalsAvailable = Math.max(
    photoCount,
    downbeats.length - 1 - titleEndIdx - 1
  );

  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

  const evaluate = () => {
    // Clamp cumulative intervals to what the grid can supply.
    let S = sum(ks);
    if (titleEndIdx + S > downbeats.length - 1) {
      S = downbeats.length - 1 - titleEndIdx;
    }
    const endCardStartSec = downbeats[titleEndIdx + S];
    const endCardDurationSec = clamp(
      END_CARD_TARGET_SEC,
      END_CARD_MIN_SEC,
      Math.max(END_CARD_MIN_SEC, hardCeiling - endCardStartSec)
    );
    const totalDurationSec = endCardStartSec + endCardDurationSec;
    return { S, endCardStartSec, endCardDurationSec, totalDurationSec };
  };

  // Guard against exceeding the available grid up front.
  if (sum(ks) > maxIntervalsAvailable) {
    // shrink largest ks until within budget
    while (sum(ks) > maxIntervalsAvailable) {
      const i = ks.indexOf(Math.max(...ks));
      if (ks[i] <= MIN_K) break;
      ks[i] -= 1;
    }
  }

  // Fit total into [MIN_TOTAL_SEC, min(MAX_TOTAL_SEC, hardCeiling)].
  const upper = Math.min(MAX_TOTAL_SEC, hardCeiling);
  let guard = 0;
  while (guard++ < 200) {
    const { totalDurationSec } = evaluate();
    if (totalDurationSec > upper) {
      // shrink the longest-dwell photo
      const i = ks.indexOf(Math.max(...ks));
      if (ks[i] <= MIN_K) break;
      ks[i] -= 1;
    } else if (totalDurationSec < MIN_TOTAL_SEC) {
      // grow the shortest-dwell photo, if the grid can supply it
      if (sum(ks) + 1 > maxIntervalsAvailable) break;
      const i = ks.indexOf(Math.min(...ks));
      if (ks[i] >= MAX_K) break;
      ks[i] += 1;
    } else {
      break;
    }
  }

  const { S, endCardStartSec, endCardDurationSec, totalDurationSec } = evaluate();

  // Build cuts from cumulative intervals, clamped to S.
  const cuts: Cut[] = [];
  let cum = 0;
  for (let i = 0; i < photoCount; i++) {
    const startIdx = titleEndIdx + Math.min(cum, S);
    cum += ks[i];
    const endIdxIntervals = Math.min(cum, S);
    const startSec = downbeats[startIdx];
    const endSec =
      i === photoCount - 1
        ? endCardStartSec
        : downbeats[titleEndIdx + endIdxIntervals];
    cuts.push({ index: i, startSec, endSec });
  }
  // Ensure the final photo hands off exactly to the end card.
  cuts[cuts.length - 1].endSec = endCardStartSec;

  return {
    fps,
    titleStartSec: 0,
    titleEndSec,
    cuts,
    endCardStartSec,
    endCardDurationSec,
    totalDurationSec,
    totalDurationFrames: Math.round(totalDurationSec * fps),
  };
}

// ---------- Ken Burns: deterministic per-photo pan/zoom, edge-safe ----------

// Varied pan directions, cycled by photo index.
const PAN_DIRS: [number, number][] = [
  [-1, -0.6],
  [1, 0.7],
  [0.9, -0.8],
  [-0.8, 0.9],
  [-1, 0.5],
  [1, -0.6],
  [0, -1],
  [0.7, 1],
];

const ZOOM_LO = 1.1;
const ZOOM_HI = 1.22;

// Exact edge-safe pan bound. For `transform: scale(S) translate(t%)` with
// transform-origin centre, the element still fully covers the frame iff
// |t| <= (S - 1) / (2S). We use a fraction of that at the MINIMUM scale over
// the photo's animation, so no edge is EVER revealed at any frame.
//
// NOTE: the build spec wrote the looser bound (S-1)/2, which actually reveals
// edges; (S-1)/(2S) is the correct, stricter bound. See README.
export function panBoundFraction(minScale: number): number {
  return (minScale - 1) / (2 * minScale);
}

export interface KenBurns {
  s0: number;
  s1: number;
  tx0: number; // percent
  tx1: number;
  ty0: number;
  ty1: number;
}

export function kenBurns(i: number): KenBurns {
  const zoomIn = i % 2 === 0;
  const s0 = zoomIn ? ZOOM_LO : ZOOM_HI;
  const s1 = zoomIn ? ZOOM_HI : ZOOM_LO;
  const [dx, dy] = PAN_DIRS[i % PAN_DIRS.length];

  const minScale = Math.min(s0, s1); // == ZOOM_LO
  // Comfortable pan matching the proof (~1.5%), hard-capped at 60% of the
  // exact safe bound at the minimum scale so it can never reveal an edge.
  const safe = 0.6 * panBoundFraction(minScale); // ~2.7% at 1.10
  const magPct = Math.min(1.5, safe * 100); // percent of element size

  const halfX = dx * magPct * 0.5;
  const halfY = dy * magPct * 0.5;
  return {
    s0,
    s1,
    tx0: -halfX,
    tx1: halfX,
    ty0: -halfY,
    ty1: halfY,
  };
}
