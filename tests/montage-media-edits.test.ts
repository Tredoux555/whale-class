// tests/montage-media-edits.test.ts
// Montage Studio per-item edits (migration 355) — the API's validation
// contract. parseMediaEdits is what stands between an untrusted client
// payload and montree_montage_jobs.media_edits, so every rejection below is
// a 400 the route must produce.

import { describe, it, expect } from 'vitest';
import {
  parseMediaEdits,
  maxClipSecondsForEdits,
  sameEdits,
  MAX_EDIT_SECONDS,
  MAX_MEDIA_EDITS,
} from '@/lib/montree/montage/media-edits';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const OUTSIDER = '33333333-3333-4333-8333-333333333333';
const IDS = [A, B];

function ok(raw: unknown, ids = IDS) {
  const r = parseMediaEdits(raw, ids);
  if (!r.ok) throw new Error(`expected ok, got: ${r.error}`);
  return r.edits;
}
function err(raw: unknown, ids = IDS): string {
  const r = parseMediaEdits(raw, ids);
  if (r.ok) throw new Error('expected a rejection');
  return r.error;
}

describe('parseMediaEdits — the empty cases', () => {
  it('undefined / null / [] all mean "no edits"', () => {
    expect(ok(undefined)).toEqual([]);
    expect(ok(null)).toEqual([]);
    expect(ok([])).toEqual([]);
  });

  it('an entry that edits nothing is dropped, not stored', () => {
    expect(ok([{ media_id: A }])).toEqual([]);
  });

  it('a non-array is rejected', () => {
    expect(err({ media_id: A })).toMatch(/array/);
    expect(err('[]')).toMatch(/array/);
  });
});

describe('parseMediaEdits — media_id must belong to the selection', () => {
  it('accepts an id from media_ids', () => {
    expect(ok([{ media_id: A, in_sec: 0, out_sec: 4 }])).toEqual([
      { media_id: A, in_sec: 0, out_sec: 4 },
    ]);
  });

  it('🚨 rejects an id that is NOT in media_ids', () => {
    expect(err([{ media_id: OUTSIDER, in_sec: 0, out_sec: 4 }])).toMatch(/one of media_ids/);
  });

  it('rejects a duplicate media_id', () => {
    expect(
      err([
        { media_id: A, in_sec: 0, out_sec: 4 },
        { media_id: A, in_sec: 1, out_sec: 5 },
      ])
    ).toMatch(/one entry per media_id/);
  });

  it('rejects a non-object entry', () => {
    expect(err(['nope'])).toMatch(/must be an object/);
    expect(err([null])).toMatch(/must be an object/);
  });

  it(`rejects more than ${MAX_MEDIA_EDITS} entries`, () => {
    const many = Array.from({ length: MAX_MEDIA_EDITS + 1 }, () => ({
      media_id: A,
      in_sec: 0,
      out_sec: 2,
    }));
    expect(err(many)).toMatch(/may not exceed/);
  });
});

describe('parseMediaEdits — the trim window', () => {
  it('in_sec without out_sec (or vice versa) is rejected', () => {
    expect(err([{ media_id: A, in_sec: 1 }])).toMatch(/both in_sec and out_sec/);
    expect(err([{ media_id: A, out_sec: 4 }])).toMatch(/both in_sec and out_sec/);
  });

  it('in_sec must be >= 0', () => {
    expect(err([{ media_id: A, in_sec: -0.5, out_sec: 4 }])).toMatch(/in_sec must be >= 0/);
  });

  it('out_sec must exceed in_sec', () => {
    expect(err([{ media_id: A, in_sec: 4, out_sec: 4 }])).toMatch(/greater than in_sec/);
    expect(err([{ media_id: A, in_sec: 4, out_sec: 2 }])).toMatch(/greater than in_sec/);
  });

  it(`out_sec may not exceed ${MAX_EDIT_SECONDS}`, () => {
    expect(err([{ media_id: A, in_sec: 0, out_sec: 31 }])).toMatch(/<= 30/);
    expect(ok([{ media_id: A, in_sec: 1, out_sec: 30 }])).toHaveLength(1);
  });

  it('a window shorter than 1s is rejected', () => {
    expect(err([{ media_id: A, in_sec: 2, out_sec: 2.5 }])).toMatch(/at least 1 second/);
    expect(ok([{ media_id: A, in_sec: 2, out_sec: 3 }])).toHaveLength(1);
  });

  it('non-numeric bounds are rejected', () => {
    expect(err([{ media_id: A, in_sec: '0', out_sec: '4' }])).toMatch(/must be numbers/);
    expect(err([{ media_id: A, in_sec: 0, out_sec: NaN }])).toMatch(/must be numbers/);
  });

  it('rounds to milliseconds — ffmpeg gets 3 decimals anyway', () => {
    expect(ok([{ media_id: A, in_sec: 0.123456, out_sec: 3.987654 }])).toEqual([
      { media_id: A, in_sec: 0.123, out_sec: 3.988 },
    ]);
  });
});

describe('parseMediaEdits — the crop rect', () => {
  it('accepts a non-negative integer rect', () => {
    expect(ok([{ media_id: B, crop: { x: 10, y: 20, width: 540, height: 960 } }])).toEqual([
      { media_id: B, crop: { x: 10, y: 20, width: 540, height: 960 } },
    ]);
  });

  it('rejects negative or fractional fields', () => {
    expect(err([{ media_id: B, crop: { x: -1, y: 0, width: 540, height: 960 } }])).toMatch(
      /non-negative integers/
    );
    expect(err([{ media_id: B, crop: { x: 0.5, y: 0, width: 540, height: 960 } }])).toMatch(
      /non-negative integers/
    );
  });

  it('rejects a rect that is a mis-drag, not a crop', () => {
    expect(err([{ media_id: B, crop: { x: 0, y: 0, width: 4, height: 960 } }])).toMatch(
      /at least 16px/
    );
  });

  it('rejects a non-object crop', () => {
    expect(err([{ media_id: B, crop: 'full' }])).toMatch(/crop must be an object/);
  });

  it('a trim and a crop can ride on the same entry', () => {
    expect(
      ok([{ media_id: A, in_sec: 1, out_sec: 5, crop: { x: 0, y: 0, width: 720, height: 1280 } }])
    ).toEqual([
      { media_id: A, in_sec: 1, out_sec: 5, crop: { x: 0, y: 0, width: 720, height: 1280 } },
    ]);
  });
});

describe('maxClipSecondsForEdits — the worker cap must not cut her choice', () => {
  it('no trims → the caller default is untouched', () => {
    expect(maxClipSecondsForEdits([], 8)).toBe(8);
    expect(maxClipSecondsForEdits(ok([{ media_id: A, crop: { x: 0, y: 0, width: 540, height: 960 } }]), 8)).toBe(8);
  });

  it('the LONGEST trim wins, rounded up', () => {
    const edits = ok([
      { media_id: A, in_sec: 0, out_sec: 3 },
      { media_id: B, in_sec: 2, out_sec: 14.2 },
    ]);
    expect(maxClipSecondsForEdits(edits, 8)).toBe(13);
  });

  it('never drops below the default, never above the ceiling', () => {
    expect(maxClipSecondsForEdits(ok([{ media_id: A, in_sec: 0, out_sec: 2 }]), 8)).toBe(8);
    expect(maxClipSecondsForEdits(ok([{ media_id: A, in_sec: 0, out_sec: 30 }]), 8)).toBe(30);
  });
});

describe('sameEdits — a re-save with different trims is a NEW film', () => {
  const edits = ok([
    { media_id: A, in_sec: 0, out_sec: 4 },
    { media_id: B, in_sec: 1, out_sec: 6 },
  ]);

  it('is order-independent', () => {
    const reversed = ok([
      { media_id: B, in_sec: 1, out_sec: 6 },
      { media_id: A, in_sec: 0, out_sec: 4 },
    ]);
    expect(sameEdits(reversed, edits)).toBe(true);
  });

  it('🚨 a changed trim is NOT the same film', () => {
    const changed = ok([
      { media_id: A, in_sec: 0, out_sec: 5 },
      { media_id: B, in_sec: 1, out_sec: 6 },
    ]);
    expect(sameEdits(changed, edits)).toBe(false);
  });

  it('a changed crop is NOT the same film', () => {
    const a = ok([{ media_id: A, crop: { x: 0, y: 0, width: 540, height: 960 } }]);
    const b = ok([{ media_id: A, crop: { x: 10, y: 0, width: 540, height: 960 } }]);
    expect(sameEdits(a, b)).toBe(false);
  });

  it('a pre-355 row (no column at all) reads as "no edits"', () => {
    expect(sameEdits(undefined, [])).toBe(true);
    expect(sameEdits(null, [])).toBe(true);
    expect(sameEdits(undefined, edits)).toBe(false);
  });
});
