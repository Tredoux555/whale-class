// tests/tracker-ui/done-signal.test.ts
//
// Rule 11's guard, tested from both sides: a known child writes exactly one
// well-formed event; an unknown child (or an untracked stage) writes NOTHING.
// The "nothing" half is the one that matters — it is the difference between a
// lost observation and a wrong one.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DONE_STATUS, EVENT_ENDPOINT, emitDone, shelfWorkKey } from '@/lib/montree/tracking/done-signal';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ outcome: 'applied' }) });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('emitDone', () => {
  it('posts one event when the child and the key are both known', async () => {
    const outcome = await emitDone({ childId: 'child-1', workKey: 'dp:t:2', source: 'digital' });

    expect(outcome).toBe('sent');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(EVENT_ENDPOINT);
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      child_id: 'child-1',
      work: 'dp:t:2',
      status: DONE_STATUS,
      source: 'digital',
    });
  });

  it('never reports mastery — a digital finish is practice', async () => {
    await emitDone({ childId: 'child-1', workKey: 'dp:t:2', source: 'live' });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.status).toBe('practicing');
    expect(body.status).not.toBe('mastered');
  });

  it('writes NOTHING when there is no child', async () => {
    expect(await emitDone({ childId: undefined, workKey: 'dp:t:2', source: 'digital' })).toBe('skipped');
    expect(await emitDone({ childId: null, workKey: 'dp:t:2', source: 'digital' })).toBe('skipped');
    expect(await emitDone({ childId: '   ', workKey: 'dp:t:2', source: 'digital' })).toBe('skipped');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('writes NOTHING when there is no work key (rule 1)', async () => {
    expect(await emitDone({ childId: 'child-1', workKey: null, source: 'digital' })).toBe('skipped');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('swallows a failed write rather than breaking the child’s screen', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    expect(await emitDone({ childId: 'child-1', workKey: 'dp:t:2', source: 'digital' })).toBe('failed');

    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    expect(await emitDone({ childId: 'child-1', workKey: 'dp:t:2', source: 'digital' })).toBe('failed');
  });
});

describe('shelfWorkKey — the shelf’s work1..work4 are Works 2-5', () => {
  it('maps every tracked stage onto its canonical key', () => {
    expect(shelfWorkKey('t', 'characters')).toBe('dp:t:1');
    expect(shelfWorkKey('t', 'work1')).toBe('dp:t:2');
    expect(shelfWorkKey('t', 'work2')).toBe('dp:t:3');
    expect(shelfWorkKey('t', 'work3')).toBe('dp:t:4');
    expect(shelfWorkKey('t', 'work4')).toBe('dp:t:5');
  });

  it('gives the tracing workbook no key at all', () => {
    expect(shelfWorkKey('t', 'trace')).toBeNull();
  });

  it('gives nothing a key when the letter is unknown', () => {
    expect(shelfWorkKey(null, 'work1')).toBeNull();
    expect(shelfWorkKey('', 'work1')).toBeNull();
  });

  it('handles the two-character letters', () => {
    expect(shelfWorkKey('ck', 'work4')).toBe('dp:ck:5');
    expect(shelfWorkKey('qu', 'characters')).toBe('dp:qu:1');
  });
});
