// tests/tracking/class-route-pronoun.test.ts
//
// GET /api/montree/tracking/class must tell the screen WHICH rows are still on
// the fallback, because the screen cannot work it out: a child whose teacher
// chose 'they' and a child with an empty roster row both arrive as
// `pronoun: 'they'`. Without `pronoun_set` the toggle would either highlight
// every 'they' child as a mistake or highlight none of them.
//
// The other half of the contract is checked here too: the same response's
// summary must already be repeating the unset child's name.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/montree/verify-request', () => ({ verifySchoolRequest: vi.fn() }));
vi.mock('@/lib/supabase-client', () => ({ getSupabase: vi.fn() }));
vi.mock('@/lib/montree/tracking/persistence', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/montree/tracking/persistence')>();
  return { ...mod, loadLedger: vi.fn() };
});

import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';
import { loadLedger } from '@/lib/montree/tracking/persistence';
import { GET } from '@/app/api/montree/tracking/class/route';
import { buildWorks, ev, WEEK_STARTS } from './fixture';
import type { Child, Ledger } from '@/lib/montree/tracking/types';

const ROOM = '22222222-2222-2222-2222-222222222222';
const WEEK = WEEK_STARTS[0];

const ROSTER: Child[] = [
  { id: 'brilla', name: 'Brilla', pronoun: 'they', pronounSet: false }, // nothing on file
  { id: 'mei', name: 'Mei', pronoun: 'she', pronounSet: true },
  { id: 'li', name: 'Li', pronoun: 'they', pronounSet: true }, // a stated 'they'
];

function ledger(): Ledger {
  return {
    children: ROSTER,
    works: buildWorks(),
    events: ROSTER.map((c) => ev(c.id, 'dp:s:1', 1, 0, { status: 'presented' })),
    weekStarts: WEEK_STARTS,
    classWeekLetter: 's',
  };
}

function req(): NextRequest {
  return {
    nextUrl: { searchParams: new URLSearchParams({ classroom_id: ROOM, week_start: WEEK }) },
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.mocked(verifySchoolRequest).mockReset().mockResolvedValue({
    userId: 'u-1', schoolId: 'school-A', classroomId: ROOM, role: 'teacher',
  });
  vi.mocked(loadLedger).mockReset().mockResolvedValue(ledger());
  // The route only asks this client for the review queue; ownership is settled
  // by the caller's own classroomId.
  vi.mocked(getSupabase).mockReset().mockReturnValue({
    from() {
      const b: Record<string, unknown> = {
        select: () => b, eq: () => b, is: () => b, order: () => b,
        limit: () => Promise.resolve({ data: [], error: null }),
        maybeSingle: () => Promise.resolve({ data: { id: ROOM, school_id: 'school-A' }, error: null }),
      };
      return b;
    },
  } as never);
});

describe('pronoun_set on the class response', () => {
  it('marks the row with nothing on file, and only that row', async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      children: Array<{ id: string; pronoun: string; pronoun_set: boolean; summary: { text: string } }>;
    };

    const by = Object.fromEntries(body.children.map((c) => [c.id, c]));
    expect(by.brilla.pronoun_set).toBe(false);
    // A stated 'they' is NOT a gap — same pronoun, different fact.
    expect(by.li.pronoun).toBe('they');
    expect(by.li.pronoun_set).toBe(true);
    expect(by.mei.pronoun_set).toBe(true);
  });

  it("ships the name-repeating summary for the unset child in the same response", async () => {
    const res = await GET(req());
    const body = (await res.json()) as {
      children: Array<{ id: string; summary: { text: string } }>;
    };
    const by = Object.fromEntries(body.children.map((c) => [c.id, c]));

    expect(by.brilla.summary.text).toContain('Brilla is starting to');
    expect(by.brilla.summary.text).not.toContain('They are');
    expect(by.li.summary.text).toContain('They are starting to');
    expect(by.mei.summary.text).toContain('She is starting to');
  });

  it('403s a caller from another school before any of that is computed', async () => {
    vi.mocked(verifySchoolRequest).mockResolvedValue(
      NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    );
    expect((await GET(req())).status).toBe(401);
    expect(loadLedger).not.toHaveBeenCalled();
  });
});
