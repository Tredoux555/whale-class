// tests/montage-worker-clip-edits.test.ts
// The worker half of migration 355: stored jsonb -> ffmpeg arguments.
// These are the pure functions montage-worker/src/clips.ts calls; importing
// them directly keeps the test free of ffmpeg, pg and Remotion.

import { describe, it, expect } from 'vitest';
import {
  parseJobMediaEdits,
  editClipWindow,
  clampCrop,
  buildClipVideoFilter,
} from '../montage-worker/src/clip-edits';

const A = '11111111-1111-4111-8111-111111111111';

describe('parseJobMediaEdits — untrusted stored jsonb', () => {
  it('a pre-355 database (undefined column) means no edits', () => {
    expect(parseJobMediaEdits(undefined).size).toBe(0);
    expect(parseJobMediaEdits(null).size).toBe(0);
    expect(parseJobMediaEdits([]).size).toBe(0);
  });

  it('reads a JSON string as well as a parsed array', () => {
    const raw = JSON.stringify([{ media_id: A, in_sec: 1, out_sec: 5 }]);
    expect(parseJobMediaEdits(raw).get(A)).toEqual({ media_id: A, in_sec: 1, out_sec: 5 });
  });

  it('🚨 drops a malformed entry rather than failing the render', () => {
    const map = parseJobMediaEdits([
      'junk',
      { in_sec: 1, out_sec: 5 },                    // no media_id
      { media_id: A, in_sec: 5, out_sec: 1 },       // inverted
      { media_id: A, in_sec: 0, out_sec: 4 },       // good
    ]);
    expect(map.get(A)).toEqual({ media_id: A, in_sec: 0, out_sec: 4 });
  });

  it('drops a crop that is too small to be real', () => {
    const map = parseJobMediaEdits([
      { media_id: A, crop: { x: 0, y: 0, width: 4, height: 900 } },
    ]);
    expect(map.size).toBe(0);
  });

  it('clamps an over-long window to the 30s ceiling', () => {
    const map = parseJobMediaEdits([{ media_id: A, in_sec: 10, out_sec: 500 }]);
    expect(map.get(A)?.out_sec).toBe(40); // in_sec + MAX_EDIT_SECONDS
  });
});

describe('editClipWindow — the teacher’s in/out wins', () => {
  const edit = { media_id: A, in_sec: 2, out_sec: 9 };

  it('returns exactly her window when everything fits', () => {
    expect(editClipWindow(edit, 30, 60)).toEqual({ startSec: 2, durationSec: 7 });
  });

  it('no trim → null, so the caller falls back to clipWindow()', () => {
    expect(editClipWindow(undefined, 30, 60)).toBeNull();
    expect(editClipWindow({ media_id: A }, 30, 60)).toBeNull();
    expect(editClipWindow({ media_id: A, crop: { x: 0, y: 0, width: 100, height: 100 } }, 30, 60))
      .toBeNull();
  });

  it('is bounded by the real source duration', () => {
    expect(editClipWindow(edit, 5, 60)).toEqual({ startSec: 2, durationSec: 3 });
  });

  it('is shortened, not dropped, by the remaining film budget', () => {
    expect(editClipWindow(edit, 30, 4)).toEqual({ startSec: 2, durationSec: 4 });
  });

  it('returns null when nothing usable survives', () => {
    expect(editClipWindow(edit, 2.1, 60)).toBeNull();
    expect(editClipWindow(edit, 30, 0.2)).toBeNull();
  });

  it('an unknown source duration (0) does not shrink the window', () => {
    expect(editClipWindow(edit, 0, 60)).toEqual({ startSec: 2, durationSec: 7 });
  });
});

describe('clampCrop — never hand ffmpeg a rect outside the frame', () => {
  it('passes a rect that already fits (rounded to even)', () => {
    expect(clampCrop({ x: 100, y: 200, width: 600, height: 800 }, 1920, 1080)).toEqual({
      x: 100, y: 200, width: 600, height: 800,
    });
  });

  it('🚨 trims a rect that pokes outside the decoded frame', () => {
    expect(clampCrop({ x: 1800, y: 0, width: 600, height: 1080 }, 1920, 1080)).toEqual({
      x: 1800, y: 0, width: 120, height: 1080,
    });
  });

  it('rounds width/height DOWN to even for libx264', () => {
    expect(clampCrop({ x: 0, y: 0, width: 601, height: 803 }, 1920, 1080)).toEqual({
      x: 0, y: 0, width: 600, height: 802,
    });
  });

  it('drops a full-frame no-op crop', () => {
    expect(clampCrop({ x: 0, y: 0, width: 1920, height: 1080 }, 1920, 1080)).toBeNull();
  });

  it('drops the crop when the frame size is unknown (probe found nothing)', () => {
    expect(clampCrop({ x: 0, y: 0, width: 600, height: 800 }, 0, 0)).toBeNull();
  });

  it('drops a crop with nothing usable left after clamping', () => {
    // x is pulled back to frameWidth - MIN_CROP_PX (1904), leaving only 8px.
    expect(clampCrop({ x: 1910, y: 0, width: 8, height: 1080 }, 1920, 1080)).toBeNull();
  });

  it('a sliver exactly at the floor still survives', () => {
    expect(clampCrop({ x: 1910, y: 0, width: 600, height: 1080 }, 1920, 1080)).toEqual({
      x: 1904, y: 0, width: 16, height: 1080,
    });
  });

  it('no crop → null', () => {
    expect(clampCrop(undefined, 1920, 1080)).toBeNull();
  });
});

describe('buildClipVideoFilter — crop BEFORE scale', () => {
  const base = { outWidth: 1080, outHeight: 1920, fps: 30 };

  it('is byte-identical to the pre-355 chain when there is no crop', () => {
    expect(buildClipVideoFilter({ ...base, crop: null })).toBe(
      'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1,format=yuv420p'
    );
  });

  it('🚨 puts the source crop FIRST — reframing the source, not the montage frame', () => {
    const vf = buildClipVideoFilter({
      ...base,
      crop: { x: 100, y: 20, width: 608, height: 1080 },
    });
    expect(vf).toBe(
      'crop=608:1080:100:20,scale=1080:1920:force_original_aspect_ratio=increase,' +
      'crop=1080:1920,fps=30,setsar=1,format=yuv420p'
    );
    expect(vf.indexOf('crop=608:1080:100:20')).toBeLessThan(vf.indexOf('scale='));
  });

  it('emits ffmpeg’s w:h:x:y order, not x:y:w:h', () => {
    const vf = buildClipVideoFilter({ ...base, crop: { x: 1, y: 2, width: 30, height: 40 } });
    expect(vf.startsWith('crop=30:40:1:2,')).toBe(true);
  });
});
