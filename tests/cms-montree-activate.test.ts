// tests/cms-montree-activate.test.ts
// ============================================================================
// THE HANDSHAKE, PINNED. CMS phase 7.
// ============================================================================
// `lib/montree/cms-bridge/activate.ts` is the only code in the repo that
// creates a MONTREE child from a CMS acceptance. Everything that can go wrong
// there is expensive in a way a unit test is cheap:
//
//   · a duplicate child — a family with two records, two codes, and a teacher
//     marking attendance on the wrong one;
//   · a child filed into a stranger's classroom, visible to a school that has
//     no relationship with that family;
//   · a code minted with migration 096's single-use defaults, which works once
//     and then locks the family out forever.
//
// So the tests here are not shape assertions. Each one is a specific disaster,
// named, with the write that would cause it asserted absent.
//
// The Supabase client is faked, not mocked per-call: a tiny chainable recorder
// that answers the exact call chains this file makes. Faking the client rather
// than the module's own functions means the assertions are about what reaches
// the DATABASE, which is the only thing that matters here.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── the fake Supabase client ────────────────────────────────────────────────
interface Recorded {
  table: string;
  op: 'select' | 'insert';
  payload?: Record<string, unknown>;
}

const recorded: Recorded[] = [];
/** Per-table canned answers, set by each test. */
let answers: Record<string, unknown> = {};
let rpcAnswer: { data: unknown; error: unknown } = { data: 'ABC123', error: null };

function tableStub(table: string) {
  const chain = {
    select: () => {
      recorded.push({ table, op: 'select' });
      return chain;
    },
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => (answers[`${table}:read`] ?? { data: null, error: null }),
    single: async () => (answers[`${table}:read`] ?? { data: null, error: null }),
    insert: (payload: Record<string, unknown>) => {
      recorded.push({ table, op: 'insert', payload });
      const after = {
        select: () => after,
        single: async () => (answers[`${table}:insert`] ?? { data: { id: 'new-child' }, error: null }),
        then: undefined as unknown,
      };
      // `insert()` is awaited directly for invites and chained for children, so
      // the returned object must be both thenable and chainable.
      return Object.assign(
        Promise.resolve(answers[`${table}:insert`] ?? { data: null, error: null }),
        after
      );
    },
  };
  return chain;
}

vi.mock('@/lib/supabase-client', () => ({
  getSupabase: () => ({
    from: (table: string) => tableStub(table),
    rpc: async () => rpcAnswer,
  }),
}));

const { activateMontreeComms, mintParentInviteCode } = await import(
  '@/lib/montree/cms-bridge/activate'
);

const SCHOOL = '11111111-1111-1111-1111-111111111111';
const ROOM = '22222222-2222-2222-2222-222222222222';
const OTHER_SCHOOL = '99999999-9999-9999-9999-999999999999';

const CHILD = {
  legalName: 'Amara Nwosu',
  preferredName: 'Ami',
  dateOfBirth: '2021-05-03',
  startDate: '2026-09-01',
};

/** The classroom read returns a room that IS in the linked school. */
function roomInSchool() {
  answers['montree_classrooms:read'] = { data: { id: ROOM, school_id: SCHOOL }, error: null };
}

function inserted(table: string) {
  return recorded.filter((r) => r.table === table && r.op === 'insert');
}

beforeEach(() => {
  recorded.length = 0;
  answers = {};
  rpcAnswer = { data: 'ABC123', error: null };
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('activateMontreeComms — the happy path', () => {
  it('creates the Montree child in the linked room and mints a code', async () => {
    roomInSchool();
    answers['montree_children:insert'] = { data: { id: 'montree-child-1' }, error: null };

    const result = await activateMontreeComms({
      montreeSchoolId: SCHOOL,
      montreeClassroomId: ROOM,
      child: CHILD,
    });

    expect(result).toMatchObject({
      ok: true,
      state: 'linked',
      montreeChildId: 'montree-child-1',
      inviteCode: 'ABC123',
    });

    const child = inserted('montree_children')[0].payload!;
    // Montree's convention: `name` is the register name, `nickname` is what the
    // room calls them.
    expect(child.name).toBe('Amara Nwosu');
    expect(child.nickname).toBe('Ami');
    expect(child.classroom_id).toBe(ROOM);
    // 🚨 The school is the LINKED one, never anything derived from the CMS
    // session — the ownership check is the only thing that authorises it.
    expect(child.school_id).toBe(SCHOOL);
    expect(child.is_active).toBe(true);
    expect(child.date_of_birth).toBe('2021-05-03');
    expect(child.enrolled_at).toBe('2026-09-01');
  });

  it('mints with is_reusable/max_uses — migration 096 defaults would lock the family out', async () => {
    roomInSchool();
    answers['montree_children:insert'] = { data: { id: 'montree-child-1' }, error: null };

    await activateMontreeComms({ montreeSchoolId: SCHOOL, montreeClassroomId: ROOM, child: CHILD });

    const invite = inserted('montree_parent_invites')[0].payload!;
    expect(invite.is_reusable).toBe(true);
    expect(invite.max_uses).toBeNull();
    expect(invite.invite_code).toBe('ABC123');
    expect(invite.child_id).toBe('montree-child-1');
    // A cms_users.id is not a montree_teachers.id — the FK would be a lie.
    expect(invite.created_by).toBeUndefined();
    expect(new Date(String(invite.expires_at)).getTime()).toBeGreaterThan(Date.now());
  });

  it('derives no age when the birthday is unknown, rather than guessing one', async () => {
    roomInSchool();
    answers['montree_children:insert'] = { data: { id: 'c' }, error: null };

    await activateMontreeComms({
      montreeSchoolId: SCHOOL,
      montreeClassroomId: ROOM,
      child: { ...CHILD, dateOfBirth: null },
    });

    const child = inserted('montree_children')[0].payload!;
    expect(child.date_of_birth).toBeNull();
    expect(child.age).toBeNull();
  });
});

describe('the twin guard — re-accepting must never create a second child', () => {
  it('with a stored link, mints only and inserts NO child', async () => {
    roomInSchool();

    const result = await activateMontreeComms({
      montreeSchoolId: SCHOOL,
      montreeClassroomId: ROOM,
      child: CHILD,
      existingMontreeChildId: 'montree-child-1',
    });

    expect(result).toMatchObject({ ok: true, state: 'linked', montreeChildId: 'montree-child-1' });
    // THE ASSERTION THIS FILE EXISTS FOR.
    expect(inserted('montree_children')).toHaveLength(0);
  });

  it('an already-active code is returned, never replaced', async () => {
    answers['montree_parent_invites:read'] = { data: { invite_code: 'OLD777' }, error: null };

    const code = await mintParentInviteCode('montree-child-1');

    expect(code).toBe('OLD777');
    // Re-minting would invalidate the slip the office already handed over.
    expect(inserted('montree_parent_invites')).toHaveLength(0);
  });
});

describe('cross-tenant refusal — existence is not ownership (Jul 3 2026)', () => {
  it('refuses a classroom that belongs to a DIFFERENT Montree school', async () => {
    answers['montree_classrooms:read'] = {
      data: { id: ROOM, school_id: OTHER_SCHOOL },
      error: null,
    };

    const result = await activateMontreeComms({
      montreeSchoolId: SCHOOL,
      montreeClassroomId: ROOM,
      child: CHILD,
    });

    expect(result).toEqual({ ok: false, error: 'classroom_not_in_school' });
    expect(inserted('montree_children')).toHaveLength(0);
    expect(inserted('montree_parent_invites')).toHaveLength(0);
  });

  it('refuses a classroom uuid that names nothing', async () => {
    answers['montree_classrooms:read'] = { data: null, error: null };

    const result = await activateMontreeComms({
      montreeSchoolId: SCHOOL,
      montreeClassroomId: ROOM,
      child: CHILD,
    });

    expect(result).toEqual({ ok: false, error: 'classroom_missing' });
    expect(inserted('montree_children')).toHaveLength(0);
  });

  it('reports montree_unavailable on a CMS-only database, without throwing', async () => {
    answers['montree_classrooms:read'] = { data: null, error: { code: '42P01' } };

    const result = await activateMontreeComms({
      montreeSchoolId: SCHOOL,
      montreeClassroomId: ROOM,
      child: CHILD,
    });

    expect(result).toEqual({ ok: false, error: 'montree_unavailable' });
  });
});

describe('partial failure — a failed mint is a success with a missing piece', () => {
  it('returns invite_pending WITH the child id, so the caller can store the link', async () => {
    roomInSchool();
    answers['montree_children:insert'] = { data: { id: 'montree-child-1' }, error: null };
    rpcAnswer = { data: null, error: { message: 'rpc missing' } };

    const result = await activateMontreeComms({
      montreeSchoolId: SCHOOL,
      montreeClassroomId: ROOM,
      child: CHILD,
    });

    // Not ok:false — the child EXISTS in Montree now. If the caller treated
    // this as a failure and skipped the link write, the next accept would
    // create a second child.
    expect(result).toEqual({
      ok: true,
      state: 'invite_pending',
      montreeChildId: 'montree-child-1',
      inviteCode: null,
    });
  });
});

describe('the CMS-side junction client', () => {
  it('maps the unlinked-school answer through without inventing an error', async () => {
    const { requestMontreeActivation } = await import('@/lib/cms/montree-junction');
    let sentBody = '';
    const fetchMock = vi.fn(async (_url: unknown, init?: { body?: unknown }) => {
      sentBody = String(init?.body ?? '');
      return new Response(
        JSON.stringify({ ok: true, state: 'not_linked', reason: 'school_not_linked' }),
        { status: 200 }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await requestMontreeActivation('http://localhost:3000', 'cms_session=x', 'enr-1');

    expect(result).toEqual({
      state: 'not_linked',
      montreeChildId: null,
      inviteCode: null,
      reason: 'school_not_linked',
    });
    // The enrolment id is the ONLY thing that crosses. A body naming a Montree
    // school would be a body that could file a child into a stranger's room.
    expect(Object.keys(JSON.parse(sentBody))).toEqual(['enrollmentId']);
    vi.unstubAllGlobals();
  });

  it('an unreachable bridge is a fault, never a silent success', async () => {
    const { requestMontreeActivation } = await import('@/lib/cms/montree-junction');
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNREFUSED'); }));

    const result = await requestMontreeActivation('http://localhost:3000', '', 'enr-1');

    expect(result.state).toBe('failed');
    expect(result.reason).toBe('bridge_unreachable');
    vi.unstubAllGlobals();
  });
});
