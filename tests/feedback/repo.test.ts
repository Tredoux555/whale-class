// tests/feedback/repo.test.ts
//
// The repo against a faked Supabase. Following tests/cms-montree-activate.test.ts:
// the CLIENT is faked, not the repo's own functions, so every assertion is
// about what actually reaches (or does not reach) the database.
//
// Three things are worth this much scaffolding:
//   1. the flag threshold — three DISTINCT people, not three taps;
//   2. merge — refused across boards, and delegated to the SQL function so the
//      whole thing is one transaction;
//   3. subscriber emails — the one query that touches a guest's address, and
//      the one that must never mail somebody about their own reply.

import { describe, it, expect, vi, beforeEach } from 'vitest';

interface Call {
  table: string;
  op: string;
  payload?: unknown;
  filters: Array<[string, string, unknown]>;
}

const calls: Call[] = [];
/** Per-table canned answers keyed `<table>:<select|count|single>`. */
let answers: Record<string, unknown> = {};
const rpcCalls: Array<{ fn: string; args: unknown }> = [];
let rpcAnswer: { data: unknown; error: unknown } = { data: null, error: null };

function chain(table: string, op: string, payload?: unknown) {
  const call: Call = { table, op, payload, filters: [] };
  calls.push(call);

  const thenable = {
    eq: (col: string, val: unknown) => {
      call.filters.push(['eq', col, val]);
      return thenable;
    },
    is: (col: string, val: unknown) => {
      call.filters.push(['is', col, val]);
      return thenable;
    },
    in: (col: string, val: unknown) => {
      call.filters.push(['in', col, val]);
      return thenable;
    },
    lt: (col: string, val: unknown) => {
      call.filters.push(['lt', col, val]);
      return thenable;
    },
    or: (expr: string) => {
      call.filters.push(['or', expr, null]);
      return thenable;
    },
    order: () => thenable,
    range: () => thenable,
    limit: () => thenable,
    select: () => thenable,
    maybeSingle: async () => (answers[`${table}:single`] ?? { data: null, error: null }),
    single: async () => (answers[`${table}:single`] ?? { data: null, error: null }),
    // Awaiting the builder is how supabase-js returns a list or a count.
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve(answers[`${table}:${op}`] ?? { data: [], error: null, count: 0 }).then(resolve),
  };
  return thenable;
}

vi.mock('@/lib/supabase-client', () => ({
  getSupabase: () => ({
    from: (table: string) => ({
      select: (_cols?: string, opts?: { head?: boolean; count?: string }) =>
        chain(table, opts?.head ? 'count' : 'select'),
      insert: (payload: unknown) => chain(table, 'insert', payload),
      update: (payload: unknown) => chain(table, 'update', payload),
      upsert: (payload: unknown) => chain(table, 'upsert', payload),
      delete: () => chain(table, 'delete'),
    }),
    rpc: async (fn: string, args: unknown) => {
      rpcCalls.push({ fn, args });
      return rpcAnswer;
    },
  }),
}));

import {
  addFlag,
  decodeCursor,
  encodeCursor,
  getPost,
  isMissingTable,
  mergePosts,
  subscriberEmails,
  BoardNotReadyError,
} from '@/lib/montree/feedback/repo';

const BOARD = 'board-1';
const POST = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

function postRow(id: string, boardId = BOARD) {
  return {
    id,
    board_id: boardId,
    type: 'problem',
    title: 'Photos upload twice',
    body: '',
    template: null,
    status: 'open',
    author_kind: 'user',
    author_id: 'u1',
    author_name: 'Lin W.',
    author_role: 'parent',
    tags: [],
    screenshot_path: null,
    vote_count: 3,
    comment_count: 1,
    has_official_reply: false,
    last_activity_at: '2026-09-17T00:00:00.000Z',
    pinned: false,
    hidden: false,
    merged_into: null,
    created_at: '2026-09-17T00:00:00.000Z',
    updated_at: '2026-09-17T00:00:00.000Z',
  };
}

beforeEach(() => {
  calls.length = 0;
  rpcCalls.length = 0;
  answers = {};
  rpcAnswer = { data: null, error: null };
});

describe('board scoping', () => {
  it('getPost always filters on board_id as well as id', async () => {
    answers['montree_fb_posts:single'] = { data: postRow(POST), error: null };
    await getPost(BOARD, POST);
    const call = calls.find((c) => c.table === 'montree_fb_posts');
    expect(call?.filters).toContainEqual(['eq', 'board_id', BOARD]);
    expect(call?.filters).toContainEqual(['eq', 'id', POST]);
  });
});

describe('flags', () => {
  it('auto-hides at three distinct flaggers', async () => {
    answers['montree_fb_flags:count'] = { count: 3, error: null };
    const result = await addFlag(BOARD, 'post', POST, 'guest:a', 'private_info');
    expect(result.hidden).toBe(true);
    const hide = calls.find((c) => c.table === 'montree_fb_posts' && c.op === 'update');
    expect(hide?.payload).toMatchObject({ hidden: true, hidden_reason: 'flagged' });
  });

  it('does NOT hide at two', async () => {
    answers['montree_fb_flags:count'] = { count: 2, error: null };
    const result = await addFlag(BOARD, 'post', POST, 'guest:a', 'spam');
    expect(result.hidden).toBe(false);
    expect(calls.find((c) => c.table === 'montree_fb_posts' && c.op === 'update')).toBeUndefined();
  });

  it('writes the flagger key, so the unique index makes "distinct" real', async () => {
    answers['montree_fb_flags:count'] = { count: 1, error: null };
    await addFlag(BOARD, 'post', POST, 'guest:abc', 'rude');
    const insert = calls.find((c) => c.table === 'montree_fb_flags' && c.op === 'insert');
    expect(insert?.payload).toMatchObject({
      board_id: BOARD,
      target_kind: 'post',
      target_id: POST,
      flagger_key: 'guest:abc',
      reason: 'rude',
    });
  });

  it('counts only UNRESOLVED flags, so a restored post starts clean', async () => {
    answers['montree_fb_flags:count'] = { count: 1, error: null };
    await addFlag(BOARD, 'post', POST, 'guest:a', 'spam');
    const count = calls.find((c) => c.table === 'montree_fb_flags' && c.op === 'count');
    expect(count?.filters).toContainEqual(['is', 'resolved_at', null]);
  });
});

describe('merge', () => {
  it('refuses when either post is not on this board', async () => {
    answers['montree_fb_posts:single'] = { data: null, error: null };
    await expect(mergePosts(BOARD, OTHER, POST, { key: 'user:a', name: 'A' })).rejects.toThrow(
      /both posts must exist/,
    );
    expect(rpcCalls).toHaveLength(0);
  });

  it('delegates to the SQL function so votes and subscribers move atomically', async () => {
    answers['montree_fb_posts:single'] = { data: postRow(POST), error: null };
    await mergePosts(BOARD, OTHER, POST, { key: 'user:admin', name: 'Anya P.' });
    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0].fn).toBe('montree_fb_merge_posts');
    expect(rpcCalls[0].args).toEqual({
      p_duplicate: OTHER,
      p_survivor: POST,
      p_by_key: 'user:admin',
      p_by_name: 'Anya P.',
    });
  });
});

describe('subscriber emails', () => {
  it('leaves out the person who caused the event', async () => {
    answers['montree_fb_subscriptions:select'] = {
      data: [
        { subscriber_key: 'user:actor', email: 'actor@x.com' },
        { subscriber_key: 'guest:abc', email: 'lin@x.com' },
      ],
      error: null,
    };
    const list = await subscriberEmails(POST, 'user:actor');
    expect(list).toEqual([{ key: 'guest:abc', email: 'lin@x.com' }]);
  });

  it('leaves out subscribers with no address at all', async () => {
    answers['montree_fb_subscriptions:select'] = {
      data: [{ subscriber_key: 'user:1', email: null }],
      error: null,
    };
    expect(await subscriberEmails(POST)).toEqual([]);
  });

  it('only reads live subscriptions', async () => {
    answers['montree_fb_subscriptions:select'] = { data: [], error: null };
    await subscriberEmails(POST);
    const call = calls.find((c) => c.table === 'montree_fb_subscriptions');
    expect(call?.filters).toContainEqual(['is', 'unsubscribed_at', null]);
  });

  it('returns nothing rather than throwing when the query fails', async () => {
    answers['montree_fb_subscriptions:select'] = { data: null, error: { message: 'boom' } };
    expect(await subscriberEmails(POST)).toEqual([]);
  });
});

describe('the missing-table state', () => {
  it('recognises Postgres 42P01', () => {
    expect(isMissingTable({ code: '42P01' })).toBe(true);
    expect(isMissingTable({ message: 'relation "montree_fb_posts" does not exist' })).toBe(true);
    expect(isMissingTable({ code: '23505' })).toBe(false);
    expect(isMissingTable(null)).toBe(false);
  });

  it('turns that into BoardNotReadyError, which the pages render as a friendly state', async () => {
    answers['montree_fb_posts:single'] = { data: null, error: { code: '42P01' } };
    await expect(getPost(BOARD, POST)).rejects.toBeInstanceOf(BoardNotReadyError);
  });
});

describe('cursors', () => {
  it('round-trip', () => {
    expect(decodeCursor(encodeCursor(40))).toBe(40);
  });

  it('are opaque, and junk decodes to the first page rather than throwing', () => {
    expect(decodeCursor('not-base64-at-all!!')).toBe(0);
    expect(decodeCursor(null)).toBe(0);
    expect(decodeCursor(Buffer.from('{"o":-5}').toString('base64url'))).toBe(0);
    expect(decodeCursor(Buffer.from('{"o":999999}').toString('base64url'))).toBe(0);
  });
});
