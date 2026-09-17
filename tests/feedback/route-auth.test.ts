// tests/feedback/route-auth.test.ts
//
// The gates. Each test here is a thing somebody could do to this board if the
// gate were missing, written as the attempt rather than as the assertion.
//
// The repo is faked (nothing reaches a database) and identity is faked, so
// what is under test is the ROUTES' own decisions: who may set a status, whose
// comment may wear the team's badge, and what happens when a perfectly valid
// session for one school asks for another school's board.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

// ── fakes ───────────────────────────────────────────────────────────────────

let viewer: Record<string, unknown> = {};
const verifySchoolRequest = vi.fn();

vi.mock('@/lib/montree/feedback/identity', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/montree/feedback/identity');
  return {
    ...actual,
    resolveViewer: async () => viewer,
  };
});

vi.mock('@/lib/montree/verify-request', () => ({
  verifySchoolRequest: (...args: unknown[]) => verifySchoolRequest(...args),
}));

vi.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: async () => ({ allowed: true }),
}));

// The routes hand getSupabase() to checkRateLimit. The limiter is faked above,
// so the client only has to EXIST — a real one would demand env vars that a
// unit test has no business holding.
vi.mock('@/lib/supabase-client', () => ({
  getSupabase: () => ({}),
}));

vi.mock('@/lib/montree/feedback/notify', () => ({
  notifySubscribers: async () => undefined,
  drainOutbox: async () => ({ sent: 0, failed: 0 }),
}));

const PUBLIC_BOARD = {
  id: 'board-public',
  ref: 'public',
  scope: 'public' as const,
  schoolId: null,
  name: 'Montree product board',
  localeDefault: 'en' as const,
};

const SCHOOL_A_ID = '11111111-1111-4111-8111-111111111111';
const SCHOOL_B_ID = '22222222-2222-4222-8222-222222222222';
const POST_ID = '33333333-3333-4333-8333-333333333333';
const DUP_ID = '44444444-4444-4444-8444-444444444444';

const post = {
  id: POST_ID,
  boardId: PUBLIC_BOARD.id,
  type: 'problem' as const,
  title: 'Photos upload twice',
  body: '',
  template: null,
  status: 'open' as const,
  authorKind: 'user' as const,
  authorId: 'u1',
  authorName: 'Lin W.',
  authorRole: 'parent',
  tags: [],
  screenshotPath: null,
  voteCount: 3,
  commentCount: 0,
  hasOfficialReply: false,
  lastActivityAt: '2026-09-17T00:00:00.000Z',
  pinned: false,
  hidden: false,
  mergedInto: null,
  createdAt: '2026-09-17T00:00:00.000Z',
  updatedAt: '2026-09-17T00:00:00.000Z',
};

const dbCalls: Array<{ fn: string; args: unknown[] }> = [];
function record(fn: string) {
  return (...args: unknown[]) => {
    dbCalls.push({ fn, args });
    return undefined;
  };
}

const db = {
  getBoard: async () => PUBLIC_BOARD,
  ensureBoard: async (ref: string) => ({ ...PUBLIC_BOARD, id: `board-${ref}`, ref, scope: 'school', schoolId: SCHOOL_A_ID }),
  getPost: async () => post,
  getPostAuthorKey: async () => 'user:author-1',
  listComments: async () => [],
  listPosts: async () => ({ posts: [], nextCursor: null, counts: { all: 0, problem: 0, idea: 0, question: 0, discussion: 0 } }),
  listStatusHistory: async () => [],
  countSubscribers: async () => 0,
  viewerVotes: async () => new Set<string>(),
  isSubscribed: async () => false,
  updatePost: async (...args: unknown[]) => {
    record('updatePost')(...args);
    const patch = args[2] as { status?: string };
    return { ...post, status: patch.status ?? post.status };
  },
  mergePosts: async (...args: unknown[]) => {
    record('mergePosts')(...args);
  },
  createComment: async (...args: unknown[]) => {
    record('createComment')(...args);
    const input = args[2] as { isOfficial: boolean; body: string };
    return {
      id: '55555555-5555-4555-8555-555555555555',
      postId: POST_ID,
      body: input.body,
      authorKind: 'guest' as const,
      authorId: null,
      authorName: 'Guest',
      authorRole: 'guest',
      isOfficial: input.isOfficial,
      isAnswer: false,
      quoteOf: null,
      hidden: false,
      createdAt: '2026-09-17T00:00:00.000Z',
    };
  },
  subscribe: async (...args: unknown[]) => {
    record('subscribe')(...args);
  },
  upsertGuestToken: async () => undefined,
  markAnswer: async (...args: unknown[]) => {
    record('markAnswer')(...args);
  },
  resolveFlags: async () => undefined,
};

vi.mock('@/lib/montree/feedback/data', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/montree/feedback/repo');
  return {
    db,
    usingFakeRepo: true,
    BoardNotReadyError: actual.BoardNotReadyError,
    isMissingTable: actual.isMissingTable,
  };
});

// Routes are imported AFTER the mocks are registered.
const { PATCH: patchPost, POST: mergePost } = await import(
  '@/app/api/montree/feedback/v2/posts/[id]/route'
);
const { POST: postComment } = await import('@/app/api/montree/feedback/v2/posts/[id]/comments/route');
const { POST: createPost } = await import('@/app/api/montree/feedback/v2/posts/route');

// ── helpers ─────────────────────────────────────────────────────────────────

const { NextRequest } = await import('next/server');

function req(url: string, init?: { method?: string; body?: unknown }) {
  return new NextRequest(new URL(url, 'https://montree.xyz').toString(), {
    method: init?.method ?? 'GET',
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    headers: { 'content-type': 'application/json' },
  });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

function asAnon() {
  viewer = { kind: 'anon', key: null, displayName: null, role: null, isAdmin: false };
}
function asGuest() {
  viewer = {
    kind: 'guest',
    key: 'guest:abc',
    displayName: 'Lin W.',
    role: 'guest',
    isAdmin: false,
    guestTokenHash: 'abc',
    email: 'lin@x.com',
  };
}
function asTeacher() {
  viewer = { kind: 'user', key: 'user:t1', displayName: 'Mei H.', role: 'teacher', isAdmin: false, userId: 't1' };
}
function asAdmin() {
  viewer = { kind: 'user', key: 'user:a1', displayName: 'Anya P.', role: 'principal', isAdmin: true, userId: 'a1' };
}

beforeEach(() => {
  dbCalls.length = 0;
  vi.clearAllMocks();
  process.env.FEEDBACK_TOKEN_SECRET = 'test-only-feedback-secret-0123456789abcdef';
  asAnon();
});

// ── the gates ───────────────────────────────────────────────────────────────

describe('PATCH /posts/:id — only the team sets a status', () => {
  it('an anonymous visitor cannot', async () => {
    asAnon();
    const res = await patchPost(req(`/x?board=public`, { method: 'PATCH', body: { status: 'fixed' } }), params(POST_ID));
    expect(res.status).toBe(403);
    expect(dbCalls.find((c) => c.fn === 'updatePost')).toBeUndefined();
  });

  it('a signed-in teacher cannot', async () => {
    asTeacher();
    const res = await patchPost(req(`/x?board=public`, { method: 'PATCH', body: { status: 'fixed' } }), params(POST_ID));
    expect(res.status).toBe(403);
    expect(dbCalls.find((c) => c.fn === 'updatePost')).toBeUndefined();
  });

  it('a guest cannot, however the body is dressed up', async () => {
    asGuest();
    const res = await patchPost(
      req(`/x?board=public`, { method: 'PATCH', body: { status: 'fixed', isAdmin: true, role: 'principal' } }),
      params(POST_ID),
    );
    expect(res.status).toBe(403);
  });

  it('an admin can', async () => {
    asAdmin();
    const res = await patchPost(req(`/x?board=public`, { method: 'PATCH', body: { status: 'confirmed' } }), params(POST_ID));
    expect(res.status).toBe(200);
    expect(dbCalls.find((c) => c.fn === 'updatePost')).toBeDefined();
  });

  it('even an admin cannot make a Problem "Shipped"', async () => {
    asAdmin();
    const res = await patchPost(req(`/x?board=public`, { method: 'PATCH', body: { status: 'shipped' } }), params(POST_ID));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { code: string };
    expect(json.code).toBe('bad_transition');
    expect(dbCalls.find((c) => c.fn === 'updatePost')).toBeUndefined();
  });

  it('rejects an unknown status outright', async () => {
    asAdmin();
    const res = await patchPost(req(`/x?board=public`, { method: 'PATCH', body: { status: 'DROP TABLE' } }), params(POST_ID));
    expect(res.status).toBe(400);
  });

  it('rejects a post id that is not a uuid before touching anything', async () => {
    asAdmin();
    const res = await patchPost(req(`/x?board=public`, { method: 'PATCH', body: { status: 'fixed' } }), params('../../etc'));
    expect(res.status).toBe(404);
  });
});

describe('POST /posts/:id — only the team merges', () => {
  it('a teacher cannot merge two posts', async () => {
    asTeacher();
    const res = await mergePost(req(`/x?board=public`, { method: 'POST', body: { duplicateId: DUP_ID } }), params(POST_ID));
    expect(res.status).toBe(403);
    expect(dbCalls.find((c) => c.fn === 'mergePosts')).toBeUndefined();
  });

  it('an admin can', async () => {
    asAdmin();
    const res = await mergePost(req(`/x?board=public`, { method: 'POST', body: { duplicateId: DUP_ID } }), params(POST_ID));
    expect(res.status).toBe(200);
    expect(dbCalls.find((c) => c.fn === 'mergePosts')).toBeDefined();
  });

  it('a post cannot be merged into itself', async () => {
    asAdmin();
    const res = await mergePost(req(`/x?board=public`, { method: 'POST', body: { duplicateId: POST_ID } }), params(POST_ID));
    expect(res.status).toBe(400);
    expect(dbCalls.find((c) => c.fn === 'mergePosts')).toBeUndefined();
  });
});

describe('POST /posts/:id/comments — the team badge', () => {
  it('a guest cannot post an official reply', async () => {
    asGuest();
    const res = await postComment(
      req(`/x?board=public`, { method: 'POST', body: { body: 'We have fixed this.', official: true } }),
      params(POST_ID),
    );
    expect(res.status).toBe(403);
    expect(dbCalls.find((c) => c.fn === 'createComment')).toBeUndefined();
  });

  it('a signed-in teacher cannot either', async () => {
    asTeacher();
    const res = await postComment(
      req(`/x?board=public`, { method: 'POST', body: { body: 'We have fixed this.', official: true } }),
      params(POST_ID),
    );
    expect(res.status).toBe(403);
  });

  it('an admin can, and the comment is written as official', async () => {
    asAdmin();
    const res = await postComment(
      req(`/x?board=public`, { method: 'POST', body: { body: 'Confirmed, a fix is in this build.', official: true } }),
      params(POST_ID),
    );
    expect(res.status).toBe(201);
    const call = dbCalls.find((c) => c.fn === 'createComment');
    expect((call?.args[2] as { isOfficial: boolean }).isOfficial).toBe(true);
  });

  it('an ordinary comment is written as NOT official', async () => {
    asGuest();
    const res = await postComment(
      req(`/x?board=public`, { method: 'POST', body: { body: 'Same here on our wifi.' } }),
      params(POST_ID),
    );
    expect(res.status).toBe(201);
    const call = dbCalls.find((c) => c.fn === 'createComment');
    expect((call?.args[2] as { isOfficial: boolean }).isOfficial).toBe(false);
  });

  it('commenting subscribes you, which is the whole closing-the-loop promise', async () => {
    asGuest();
    await postComment(req(`/x?board=public`, { method: 'POST', body: { body: 'Same here.' } }), params(POST_ID));
    expect(dbCalls.find((c) => c.fn === 'subscribe')).toBeDefined();
  });

  it('an anonymous visitor with no name or email is refused', async () => {
    asAnon();
    const res = await postComment(req(`/x?board=public`, { method: 'POST', body: { body: 'Hello' } }), params(POST_ID));
    expect(res.status).toBe(400); // validation asks for a name and an address
    expect(dbCalls.find((c) => c.fn === 'createComment')).toBeUndefined();
  });
});

describe('tenancy — a school board belongs to its school', () => {
  it('refuses a session for ANOTHER school', async () => {
    asTeacher();
    verifySchoolRequest.mockResolvedValue({ userId: 't1', schoolId: SCHOOL_B_ID, role: 'principal' });
    const res = await patchPost(
      req(`/x?board=school:${SCHOOL_A_ID}`, { method: 'PATCH', body: { status: 'confirmed' } }),
      params(POST_ID),
    );
    expect(res.status).toBe(403);
    const json = (await res.json()) as { code: string };
    expect(json.code).toBe('wrong_school');
  });

  it('passes the 401 straight through when there is no session at all', async () => {
    verifySchoolRequest.mockResolvedValue(NextResponse.json({ error: 'no' }, { status: 401 }));
    const res = await patchPost(
      req(`/x?board=school:${SCHOOL_A_ID}`, { method: 'PATCH', body: { status: 'confirmed' } }),
      params(POST_ID),
    );
    expect(res.status).toBe(401);
  });

  it('refuses a malformed board reference rather than defaulting to public', async () => {
    // Falling back to the PUBLIC board here would publish a private post.
    asAdmin();
    const res = await patchPost(
      req(`/x?board=school:not-a-uuid`, { method: 'PATCH', body: { status: 'confirmed' } }),
      params(POST_ID),
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { code: string };
    expect(json.code).toBe('bad_board');
  });

  it('never calls verifySchoolRequest for the public board', async () => {
    asAdmin();
    await patchPost(req(`/x?board=public`, { method: 'PATCH', body: { status: 'confirmed' } }), params(POST_ID));
    expect(verifySchoolRequest).not.toHaveBeenCalled();
  });
});

describe('POST /posts — the honeypot', () => {
  it('answers a filled honeypot with a plausible success and writes nothing', async () => {
    asGuest();
    const res = await createPost(
      req('/x?board=public', {
        method: 'POST',
        body: { type: 'idea', title: 'Cheap watches for sale', body: 'x', website: 'http://spam' },
      }),
    );
    expect(res.status).toBe(200);
    expect(dbCalls.find((c) => c.fn === 'createPost')).toBeUndefined();
  });
});
