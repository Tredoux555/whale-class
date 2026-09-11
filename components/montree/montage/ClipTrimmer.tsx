// components/montree/montage/ClipTrimmer.tsx
//
// The iPhone Photos clip trimmer, for Montage Studio.
//
// One filmstrip. A yellow selection frame with two chunky handles. A white
// playhead. Nothing else — no second slider, no numbers to read while you
// drag except the one floating above the handle you are holding.
//
//   Filmstrip   ~12 frames pulled out of the SAME clip client-side (a second,
//               muted <video> + a hidden <canvas>: seek → 'seeked' → drawImage
//               → toDataURL). Cached per media id, so stepping back to a clip
//               is instant. If extraction fails (Safari CORS taint, a codec
//               the canvas will not take), the strip falls back to a neutral
//               stripe — it NEVER blocks the trim.
//   Handles     drag either edge; they cannot cross, the window is at least
//               1s and at most 30s (mirrors MAX_EDIT_SECONDS in
//               lib/montree/montage/media-edits.ts). While a handle is held
//               the preview seeks live to that handle's time, so she sees the
//               exact frame she is cutting on — the iPhone behaviour.
//   Playhead    a white hairline; tap inside the selection to scrub.
//   Playback    ALWAYS loops inside [in, out]. What she watches is the cut.
//
// 🚨 The stage is sized to the CLIP's real aspect, not to a fixed 9:16 box.
// A portrait clip fills the frame (object-fit: cover — exactly what the film
// crops to); a landscape clip is shown whole with the 9:16 region the film
// will keep marked out and the rest dimmed. Black pillars told her nothing.
//
// 🚨 This component owns NO trim state. `trim` in, `onChange` out — the page
// keeps the record and the Save mapping is untouched.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';

export interface ClipTrim {
  in: number;
  out: number;
}

/** Frames drawn onto the strip. Enough to read the clip, few enough to be quick. */
const FRAME_COUNT = 12;
/** Strip height in px — iOS sits around here. */
const STRIP_H = 56;
/** Visible width of one handle. */
const HANDLE_W = 20;
/** Transparent slop either side of a handle, so a thumb can find it. */
const HANDLE_SLOP = 12;
/** Shortest window the API will take (media-edits.ts: out - in >= 1). */
const MIN_SELECTION = 1;
/** Longest window the API will take (MAX_EDIT_SECONDS). */
const MAX_SELECTION = 30;
/** The montage's own aspect — 9:16. */
const FRAME_RATIO = 9 / 16;
/** Give up on a single seek rather than hang the extraction loop. */
const SEEK_TIMEOUT_MS = 4000;

/** iOS trim yellow, and the one non-green thing on this screen. */
const YELLOW = '#FFD60A';
const DIM = 'rgba(3, 20, 14, 0.68)';

// Module-level so stepping between clips does not re-extract. Keyed on media id.
const frameCache = new Map<string, string[]>();
const frameFailed = new Set<string>();

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/** Seek and wait for the frame to actually be there. */
function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      window.clearTimeout(timer);
      video.removeEventListener('seeked', ok);
      video.removeEventListener('error', bad);
    };
    const ok = () => {
      cleanup();
      resolve();
    };
    const bad = () => {
      cleanup();
      reject(new Error('seek failed'));
    };
    const timer = window.setTimeout(bad, SEEK_TIMEOUT_MS);
    video.addEventListener('seeked', ok);
    video.addEventListener('error', bad);
    try {
      video.currentTime = time;
    } catch {
      bad();
    }
  });
}

/**
 * Pull `count` evenly spaced stills out of a clip with a throwaway muted
 * <video> — never the preview player, which the teacher is driving.
 */
async function extractFrames(src: string, count: number): Promise<string[]> {
  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = src;

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      window.clearTimeout(timer);
      video.removeEventListener('loadeddata', ok);
      video.removeEventListener('error', bad);
    };
    const ok = () => {
      cleanup();
      resolve();
    };
    const bad = () => {
      cleanup();
      reject(new Error('clip would not load'));
    };
    const timer = window.setTimeout(bad, SEEK_TIMEOUT_MS * 3);
    video.addEventListener('loadeddata', ok);
    video.addEventListener('error', bad);
    video.load();
  });

  const duration = video.duration;
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('no duration');

  const vw = video.videoWidth || 90;
  const vh = video.videoHeight || 160;
  const canvas = document.createElement('canvas');
  canvas.height = STRIP_H * 2;
  canvas.width = Math.max(12, Math.round((canvas.height * vw) / vh));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');

  const shots: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const at = ((i + 0.5) / count) * duration;
    // Sequential on purpose: a <video> can only be at one time at a time.
    await seekTo(video, Math.min(at, Math.max(0, duration - 0.05)));
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    shots.push(canvas.toDataURL('image/jpeg', 0.62));
  }

  video.removeAttribute('src');
  video.load();
  return shots;
}

type DragMode = 'in' | 'out' | null;

export default function ClipTrimmer({
  mediaId,
  src,
  poster,
  trim,
  maxSeconds,
  onChange,
  labels,
}: {
  /** Cache key for the extracted filmstrip. */
  mediaId: string;
  src: string;
  poster: string;
  trim: ClipTrim;
  maxSeconds: number;
  onChange: (next: ClipTrim) => void;
  labels: { play: string; pause: string; in: string; out: string; selected: string; max: string };
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);

  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(maxSeconds);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [head, setHead] = useState(trim.in);
  const [drag, setDrag] = useState<DragMode>(null);

  // Mounted per clip (the page keys on media id), so the cache can seed state.
  const [frames, setFrames] = useState<string[]>(() => frameCache.get(mediaId) ?? []);
  const [stripFailed, setStripFailed] = useState(() => frameFailed.has(mediaId));

  const needsFrames = frames.length === 0 && !stripFailed;

  useEffect(() => {
    if (!needsFrames || !src) return;
    let cancelled = false;
    extractFrames(src, FRAME_COUNT)
      .then((shots) => {
        frameCache.set(mediaId, shots);
        if (!cancelled) setFrames(shots);
      })
      .catch(() => {
        frameFailed.add(mediaId);
        if (!cancelled) setStripFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [mediaId, src, needsFrames]);

  const total = Math.max(duration, trim.out, MIN_SELECTION);
  const pct = (seconds: number) => clamp((seconds / total) * 100, 0, 100);
  const inPct = pct(trim.in);
  const outPct = pct(trim.out);
  const headPct = pct(clamp(head, trim.in, trim.out));
  const selected = Math.max(0, trim.out - trim.in);

  const seekPreview = useCallback((seconds: number) => {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.currentTime = seconds;
    } catch {
      /* metadata not ready — onLoadedMetadata will land on `in` */
    }
  }, []);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      if (v.currentTime < trim.in || v.currentTime >= trim.out) v.currentTime = trim.in;
      void v
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  // Looping, not stopping: what she watches is exactly the cut the film takes.
  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.currentTime >= trim.out || v.currentTime < trim.in - 0.25) {
      v.currentTime = trim.in;
      setHead(trim.in);
      return;
    }
    setHead(v.currentTime);
  };

  /** Where on the strip is this pointer, in seconds? */
  const timeAt = useCallback(
    (clientX: number): number => {
      const rect = stripRef.current?.getBoundingClientRect();
      if (!rect || rect.width <= 0) return 0;
      return clamp((clientX - rect.left) / rect.width, 0, 1) * total;
    },
    [total]
  );

  const moveHandle = useCallback(
    (mode: Exclude<DragMode, null>, clientX: number) => {
      const at = timeAt(clientX);
      if (mode === 'in') {
        const next = clamp(at, Math.max(0, trim.out - MAX_SELECTION), trim.out - MIN_SELECTION);
        onChange({ in: next, out: trim.out });
        setHead(next);
        seekPreview(next);
      } else {
        const next = clamp(at, trim.in + MIN_SELECTION, Math.min(total, trim.in + MAX_SELECTION));
        onChange({ in: trim.in, out: next });
        setHead(next);
        seekPreview(next);
      }
    },
    [onChange, seekPreview, timeAt, total, trim.in, trim.out]
  );

  const startDrag = (mode: Exclude<DragMode, null>) => (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const v = videoRef.current;
    if (v && !v.paused) {
      v.pause();
      setPlaying(false);
    }
    setDrag(mode);
    moveHandle(mode, e.clientX);
  };

  const onHandleMove = (mode: Exclude<DragMode, null>) => (e: ReactPointerEvent<HTMLDivElement>) => {
    if (drag !== mode) return;
    e.preventDefault();
    moveHandle(mode, e.clientX);
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDrag(null);
  };

  /** Tap inside the selection to put the playhead there. */
  const scrub = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (drag) return;
    const at = clamp(timeAt(e.clientX), trim.in, trim.out);
    setHead(at);
    seekPreview(at);
  };

  // ---------------------------------------------------------------- stage
  const aspect = natural && natural.h > 0 ? natural.w / natural.h : FRAME_RATIO;
  const portrait = aspect < 1;
  const stageRatio = portrait ? FRAME_RATIO : aspect;
  const cropWidthPct = clamp((FRAME_RATIO / aspect) * 100, 0, 100);
  const sideDimPct = (100 - cropWidthPct) / 2;

  const stageStyle: CSSProperties = {
    position: 'relative',
    width: `min(100%, calc(52vh * ${stageRatio.toFixed(4)}))`,
    aspectRatio: stageRatio.toFixed(4),
    borderRadius: 10,
    overflow: 'hidden',
    background: '#000',
  };

  const bubbleStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    transform: 'translateX(-50%)',
    padding: '1px 6px',
    borderRadius: 999,
    background: YELLOW,
    color: '#1a1400',
    fontSize: 10.5,
    fontWeight: 700,
    lineHeight: '15px',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
  };

  const handleWrap = (side: 'in' | 'out'): CSSProperties => ({
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: `${side === 'in' ? inPct : outPct}%`,
    marginLeft: side === 'in' ? -HANDLE_SLOP : -(HANDLE_W + HANDLE_SLOP),
    width: HANDLE_W + HANDLE_SLOP * 2,
    paddingLeft: side === 'in' ? HANDLE_SLOP : HANDLE_SLOP,
    paddingRight: HANDLE_SLOP,
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    touchAction: 'none',
    cursor: 'ew-resize',
    zIndex: 3,
  });

  const handleBar = (side: 'in' | 'out'): CSSProperties => ({
    width: HANDLE_W,
    height: '100%',
    background: YELLOW,
    borderRadius: side === 'in' ? '9px 0 0 9px' : '0 9px 9px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 4px rgba(0,0,0,0.45)',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
      <style>{`
        @keyframes mtClipShimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
        .mt-clip-shimmer {
          background-image: linear-gradient(90deg, rgba(52,211,153,0.06) 0%, rgba(52,211,153,0.20) 50%, rgba(52,211,153,0.06) 100%);
          background-size: 200% 100%;
          animation: mtClipShimmer 1.5s ease-in-out infinite;
        }
        .mt-clip-stripes {
          background-image: repeating-linear-gradient(135deg, rgba(52,211,153,0.16) 0 10px, rgba(52,211,153,0.07) 10px 20px);
        }
      `}</style>

      {/* ------------------------------ stage ------------------------------ */}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <div style={stageStyle}>
          <video
            ref={videoRef}
            src={src}
            poster={poster || undefined}
            playsInline
            preload="metadata"
            controls={false}
            onClick={toggle}
            onTimeUpdate={onTimeUpdate}
            onEnded={() => {
              const v = videoRef.current;
              if (v) v.currentTime = trim.in;
              setHead(trim.in);
              setPlaying(false);
            }}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (Number.isFinite(v.duration) && v.duration > 0) setDuration(v.duration);
              if (v.videoWidth > 0 && v.videoHeight > 0) {
                setNatural({ w: v.videoWidth, h: v.videoHeight });
              }
              v.currentTime = trim.in;
            }}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              objectFit: portrait ? 'cover' : 'contain',
              background: '#000',
            }}
          />

          {/* Landscape: the film keeps only the centre 9:16 — show her which. */}
          {!portrait && (
            <>
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${sideDimPct}%`, background: DIM, pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: `${sideDimPct}%`, background: DIM, pointerEvents: 'none' }} />
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${sideDimPct}%`,
                  width: `${cropWidthPct}%`,
                  border: '1px dashed rgba(52,211,153,0.75)',
                  borderRadius: 4,
                  boxSizing: 'border-box',
                  pointerEvents: 'none',
                }}
              />
            </>
          )}
        </div>
      </div>

      {/* ---------------------------- filmstrip ---------------------------- */}
      <div style={{ position: 'relative', paddingTop: 17 }}>
        {drag === 'in' && <span style={{ ...bubbleStyle, left: `${inPct}%` }}>{trim.in.toFixed(1)}s</span>}
        {drag === 'out' && <span style={{ ...bubbleStyle, left: `${outPct}%` }}>{trim.out.toFixed(1)}s</span>}

        <div
          ref={stripRef}
          onPointerDown={scrub}
          style={{
            position: 'relative',
            height: STRIP_H,
            borderRadius: 10,
            overflow: 'hidden',
            background: 'rgba(10,32,24,0.85)',
            border: '1px solid rgba(52,211,153,0.18)',
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            cursor: 'pointer',
          }}
        >
          {/* frames (or a shimmer / a neutral stripe) */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
            {frames.length > 0 ? (
              frames.map((frame, i) => (
                <div
                  key={`${mediaId}-${i}`}
                  style={{
                    flex: '1 1 0',
                    minWidth: 0,
                    backgroundImage: `url(${frame})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
              ))
            ) : (
              <div
                className={stripFailed ? 'mt-clip-stripes' : 'mt-clip-shimmer'}
                style={{ flex: '1 1 0' }}
              />
            )}
          </div>

          {/* everything outside the window is dimmed */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${inPct}%`, background: DIM, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: `${100 - outPct}%`, background: DIM, pointerEvents: 'none' }} />

          {/* the yellow frame: rails here, edges are the handles themselves */}
          <div style={{ position: 'absolute', top: 0, left: `${inPct}%`, width: `${outPct - inPct}%`, height: 3, background: YELLOW, pointerEvents: 'none', zIndex: 2 }} />
          <div style={{ position: 'absolute', bottom: 0, left: `${inPct}%`, width: `${outPct - inPct}%`, height: 3, background: YELLOW, pointerEvents: 'none', zIndex: 2 }} />

          {/* playhead */}
          <div
            style={{
              position: 'absolute',
              top: 3,
              bottom: 3,
              left: `${headPct}%`,
              width: 2,
              marginLeft: -1,
              borderRadius: 1,
              background: '#fff',
              boxShadow: '0 0 4px rgba(0,0,0,0.75)',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />

          {/* handles */}
          <div
            role="slider"
            tabIndex={0}
            aria-label={labels.in}
            aria-valuemin={0}
            aria-valuemax={Math.round(total * 10) / 10}
            aria-valuenow={Math.round(trim.in * 10) / 10}
            onPointerDown={startDrag('in')}
            onPointerMove={onHandleMove('in')}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            style={handleWrap('in')}
          >
            <div style={handleBar('in')}>
              <div style={{ width: 2, height: 18, borderRadius: 1, background: 'rgba(0,0,0,0.42)' }} />
            </div>
          </div>

          <div
            role="slider"
            tabIndex={0}
            aria-label={labels.out}
            aria-valuemin={0}
            aria-valuemax={Math.round(total * 10) / 10}
            aria-valuenow={Math.round(trim.out * 10) / 10}
            onPointerDown={startDrag('out')}
            onPointerMove={onHandleMove('out')}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            style={handleWrap('out')}
          >
            <div style={handleBar('out')}>
              <div style={{ width: 2, height: 18, borderRadius: 1, background: 'rgba(0,0,0,0.42)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------ caption ---------------------------- */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? labels.pause : labels.play}
          className="btn btn-secondary btn-sm btn-round btn-icon"
        >
          {playing ? '⏸' : '▶'}
        </button>
        <span style={{ fontSize: 12.5, color: '#34d399', fontWeight: 600 }}>
          {labels.selected}
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', marginLeft: 'auto' }}>
          {selected >= MAX_SELECTION ? labels.max : ''}
        </span>
      </div>
    </div>
  );
}
