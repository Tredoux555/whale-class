// tests/vault-range.test.ts
// parseRange from the vault download route — the RFC 9110 single-range
// parser that drives 206/416 responses for encrypted media playback.
// Contract: {start,end} inclusive window | 'unsatisfiable' (→416) |
// null (ignore header, serve 200).

import { describe, it, expect } from 'vitest';
import { parseRange } from '@/app/api/story/admin/vault/download/[id]/route';

describe('parseRange — valid windows', () => {
  it('bytes=0-0 → first byte only', () => {
    expect(parseRange('bytes=0-0', 10)).toEqual({ start: 0, end: 0 });
  });

  it('bytes=N- (open-ended) → N through the last byte', () => {
    expect(parseRange('bytes=500-', 1000)).toEqual({ start: 500, end: 999 });
  });

  it('bytes=N-M → inclusive window', () => {
    expect(parseRange('bytes=200-299', 1000)).toEqual({ start: 200, end: 299 });
  });

  it('bytes=-N (suffix) → last N bytes', () => {
    expect(parseRange('bytes=-300', 1000)).toEqual({ start: 700, end: 999 });
  });

  it('suffix longer than the body → whole body', () => {
    expect(parseRange('bytes=-5000', 1000)).toEqual({ start: 0, end: 999 });
  });

  it('end beyond the body is clamped to size-1', () => {
    expect(parseRange('bytes=0-999999', 100)).toEqual({ start: 0, end: 99 });
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseRange('  bytes=0-1  ', 10)).toEqual({ start: 0, end: 1 });
  });

  it('Content-Length math: end - start + 1 bytes are served', () => {
    const r = parseRange('bytes=500-999', 2000);
    expect(r).not.toBeNull();
    expect(r).not.toBe('unsatisfiable');
    if (r === null || r === 'unsatisfiable') return;
    expect(r.end - r.start + 1).toBe(500);
    // And the full-window case covers the whole body exactly once.
    const whole = parseRange('bytes=0-', 2000);
    if (whole === null || whole === 'unsatisfiable') throw new Error('unexpected');
    expect(whole.end - whole.start + 1).toBe(2000);
  });
});

describe('parseRange — 416 unsatisfiable', () => {
  it('bytes=-0 (empty suffix) → unsatisfiable', () => {
    expect(parseRange('bytes=-0', 1000)).toBe('unsatisfiable');
  });

  it('start at or past the end of the body → unsatisfiable', () => {
    expect(parseRange('bytes=1000-', 1000)).toBe('unsatisfiable');
    expect(parseRange('bytes=1500-1600', 1000)).toBe('unsatisfiable');
  });

  it('inverted window (N > M) → unsatisfiable', () => {
    expect(parseRange('bytes=9-2', 1000)).toBe('unsatisfiable');
  });

  it('any range against an empty body → unsatisfiable', () => {
    expect(parseRange('bytes=0-', 0)).toBe('unsatisfiable');
    expect(parseRange('bytes=-5', 0)).toBe('unsatisfiable');
  });
});

describe('parseRange — malformed headers are ignored (null → plain 200)', () => {
  it.each([
    'bytes=',            // both sides empty
    'bytes=a-b',         // non-numeric
    'bytes=0-1,5-9',     // multi-range — allowed to ignore per RFC 9110
    'items=0-1',         // unknown unit
    'bytes 0-1',         // missing '='
    '0-1',               // bare window
  ])('ignores %j', (header) => {
    expect(parseRange(header, 1000)).toBeNull();
  });
});
