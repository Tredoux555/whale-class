// tests/tracker-ui/tracker-actions.test.ts
//
// The tracker screen's behaviour, tested where it lives: in the actions module
// the components call. Three things the constitution will not forgive getting
// wrong —
//
//   1. a tap climbs the ladder and NEVER wraps past 'mastered' (rule 4),
//   2. a downward correction cannot happen without a reason (rule 4),
//   3. a queued unknown name resolves to a KEY or is dismissed (rule 5).
//
// fetch is mocked, so these assert the exact request each interaction makes.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  correctionEvent,
  correctionTargets,
  dismissQueueItem,
  EVENT_URL,
  isDowngrade,
  LADDER,
  mondayOf,
  nextStatus,
  QUEUE_RESOLVE_URL,
  ReasonRequiredError,
  resolveQueueItem,
  searchWorks,
  setClassWeekLetter,
  shiftWeek,
  tapEvent,
  withoutQueueItem,
  withStatus,
} from '@/app/montree/dashboard/tracker/components/tracker-actions';
import type { CurriculumWorkRow, Status } from '@/app/montree/dashboard/tracker/components/types';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ outcome: 'applied' }) });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

const bodyOf = (call: number) => JSON.parse(fetchMock.mock.calls[call][1].body as string);

describe('cycling a cell', () => {
  it('climbs one rung per tap', () => {
    expect(nextStatus('not_started')).toBe('presented');
    expect(nextStatus('presented')).toBe('practicing');
    expect(nextStatus('practicing')).toBe('mastered');
  });

  it('stops at mastered — a tap must never wrap round into a silent downgrade', () => {
    expect(nextStatus('mastered')).toBeNull();
  });

  it('treats a missing status as not_started', () => {
    expect(nextStatus(undefined)).toBe('presented');
    expect(nextStatus(null)).toBe('presented');
  });

  it('posts the tap as source "tap" with the child, key and new status', async () => {
    await tapEvent({ childId: 'c1', workKey: 'dp:t:3', status: 'practicing', classroomId: 'room-1' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(EVENT_URL);
    expect(bodyOf(0)).toMatchObject({
      child_id: 'c1',
      work: 'dp:t:3',
      status: 'practicing',
      source: 'tap',
      classroom_id: 'room-1',
    });
  });

  it('surfaces a rejected write instead of pretending it landed', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({}) });
    await expect(tapEvent({ childId: 'c1', workKey: 'dp:t:1', status: 'presented' })).rejects.toThrow();
  });
});

describe('a correction needs a reason', () => {
  it('refuses to post when the reason is empty', async () => {
    await expect(
      correctionEvent({ childId: 'c1', workKey: 'dp:t:3', status: 'presented', reason: '' })
    ).rejects.toBeInstanceOf(ReasonRequiredError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses to post when the reason is only whitespace', async () => {
    await expect(
      correctionEvent({ childId: 'c1', workKey: 'dp:t:3', status: 'presented', reason: '   \n ' })
    ).rejects.toBeInstanceOf(ReasonRequiredError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts source "correction" with the trimmed reason when one is given', async () => {
    await correctionEvent({
      childId: 'c1',
      workKey: 'dp:t:3',
      status: 'presented',
      reason: '  ticked on the wrong child  ',
    });
    expect(bodyOf(0)).toMatchObject({
      child_id: 'c1',
      work: 'dp:t:3',
      status: 'presented',
      source: 'correction',
      reason: 'ticked on the wrong child',
    });
  });

  it('offers only the rungs below where the work currently is', () => {
    expect(correctionTargets('mastered')).toEqual(['not_started', 'presented', 'practicing']);
    expect(correctionTargets('presented')).toEqual(['not_started']);
    expect(correctionTargets('not_started')).toEqual([]);
  });

  it('knows a downgrade when it sees one', () => {
    expect(isDowngrade('mastered', 'presented')).toBe(true);
    expect(isDowngrade('presented', 'mastered')).toBe(false);
    expect(isDowngrade('presented', 'presented')).toBe(false);
  });

  it('keeps the ladder in the constitution’s order', () => {
    expect([...LADDER]).toEqual(['not_started', 'presented', 'practicing', 'mastered']);
  });
});

describe('the review queue', () => {
  it('resolves an entry to a work KEY', async () => {
    await resolveQueueItem('q-1', 'dp:p:4');
    expect(fetchMock.mock.calls[0][0]).toBe(QUEUE_RESOLVE_URL);
    expect(bodyOf(0)).toEqual({ id: 'q-1', work_key: 'dp:p:4' });
  });

  it('dismisses an entry without writing progress', async () => {
    await dismissQueueItem('q-2');
    expect(bodyOf(0)).toEqual({ id: 'q-2', dismiss: true });
  });

  it('drops the resolved row from the local list', () => {
    const queue = [
      { id: 'q-1', child_id: 'c1', raw_work_name: 'Blue Series blends', source: 'tap', created_at: '2026-09-01' },
      { id: 'q-2', child_id: 'c2', raw_work_name: 'sandpaper letter t', source: 'photo', created_at: '2026-09-02' },
    ];
    expect(withoutQueueItem(queue, 'q-1').map((q) => q.id)).toEqual(['q-2']);
  });
});

describe('searching the classroom’s works', () => {
  const works: CurriculumWorkRow[] = [
    { work_key: 'dp:t:1', name: 't Dark Phonics work 1', sequence: 31 },
    { work_key: 'dp:t:3', name: 't Dark Phonics work 3', sequence: 33 },
    { work_key: 'ws:2', name: 'Writing Shelf tray 2 — Sand tray', sequence: 902 },
  ];

  it('is forgiving about case and punctuation', () => {
    expect(searchWorks('T DARK PHONICS WORK 3', works).map((w) => w.work_key)).toEqual(['dp:t:3']);
    expect(searchWorks('dp:t:1', works).map((w) => w.work_key)).toEqual(['dp:t:1']);
    expect(searchWorks('  sand   tray ', works).map((w) => w.work_key)).toEqual(['ws:2']);
  });

  it('is a search box, not a resolver — a teacher shortcut like "T-Work-3" is\n      not silently expanded here; the door\u2019s resolver owns that (rule 6)', () => {
    expect(searchWorks('T-Work-3', works)).toEqual([]);
  });

  it('lists everything in sequence order when the box is empty', () => {
    expect(searchWorks('', works).map((w) => w.work_key)).toEqual(['dp:t:1', 'dp:t:3', 'ws:2']);
  });

  it('never invents a match', () => {
    expect(searchWorks('blue series blends', works)).toEqual([]);
  });
});

describe('optimistic patching + week maths', () => {
  it('patches both the week map and the current map', () => {
    const child = { week: { 'dp:t:1': 'presented' as Status }, current: { 'dp:t:1': 'presented' as Status } };
    const next = withStatus(child, 'dp:t:1', 'practicing');
    expect(next.week['dp:t:1']).toBe('practicing');
    expect(next.current['dp:t:1']).toBe('practicing');
    expect(child.week['dp:t:1']).toBe('presented'); // no mutation
  });

  it('anchors a week on its Monday', () => {
    expect(mondayOf(new Date('2026-09-06T09:00:00Z'))).toBe('2026-08-31'); // a Sunday
    expect(mondayOf(new Date('2026-09-07T09:00:00Z'))).toBe('2026-09-07'); // a Monday
    expect(mondayOf(new Date('2026-09-11T23:00:00Z'))).toBe('2026-09-07'); // a Friday
  });

  it('steps a week back and forward', () => {
    expect(shiftWeek('2026-09-07', -1)).toBe('2026-08-31');
    expect(shiftWeek('2026-09-07', 1)).toBe('2026-09-14');
  });
});

describe('the class-week letter', () => {
  it('PATCHes the classroom and the letter', async () => {
    await setClassWeekLetter('room-1', 'ck');
    expect(fetchMock.mock.calls[0][1].method).toBe('PATCH');
    expect(bodyOf(0)).toEqual({ classroom_id: 'room-1', letter: 'ck' });
  });
});
