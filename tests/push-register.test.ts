// tests/push-register.test.ts
// /api/montree/push/register — device-token registration. Pins down payload
// validation, the role → owner_type mapping (homeschool_parent registers as
// 'parent'), the 10-device cap, and owner-scoped unregistration. Supabase and
// both auth resolvers are mocked.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { FakeDb } from './helpers/fake-supabase';

vi.mock('@/lib/supabase-client', () => ({ getSupabase: vi.fn() }));
vi.mock('@/lib/montree/verify-request', () => ({ verifySchoolRequest: vi.fn() }));
vi.mock('@/lib/montree/verify-parent-request', () => ({ resolveAuthorizedParent: vi.fn() }));

import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { resolveAuthorizedParent } from '@/lib/montree/verify-parent-request';
import { POST, DELETE } from '@/app/api/montree/push/register/route';

const SCHOOL = 'school-A';
const deny = () => NextResponse.json({ error: 'Authentication required' }, { status: 401 });

function req(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

let db: FakeDb;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  db = new FakeDb();
  vi.mocked(getSupabase).mockReturnValue(db.asClient() as ReturnType<typeof getSupabase>);
  vi.mocked(verifySchoolRequest).mockResolvedValue({
    userId: 'teacher-1', schoolId: SCHOOL, role: 'teacher',
  });
  vi.mocked(resolveAuthorizedParent).mockResolvedValue(null);
});

describe('POST /api/montree/push/register — identity', () => {
  it('401 when neither a school session nor a parent session exists', async () => {
    vi.mocked(verifySchoolRequest).mockResolvedValue(deny());
    const res = await POST(req({ token: 't', platform: 'ios' }));
    expect(res.status).toBe(401);
  });

  it('401 for agent sessions (no mobile surface)', async () => {
    vi.mocked(verifySchoolRequest).mockResolvedValue({
      userId: 'agent-1', schoolId: SCHOOL, role: 'agent',
    });
    const res = await POST(req({ token: 't', platform: 'ios' }));
    expect(res.status).toBe(401);
  });

  it('maps homeschool_parent to owner_type parent', async () => {
    vi.mocked(verifySchoolRequest).mockResolvedValue({
      userId: 'hp-1', schoolId: SCHOOL, role: 'homeschool_parent',
    });
    const res = await POST(req({ token: 'tok-1', platform: 'ios' }));
    expect(res.status).toBe(200);
    const row = db.queriesFor('montree_device_tokens')[0].firstArg('upsert') as Record<string, unknown>;
    expect(row.owner_type).toBe('parent');
    expect(row.owner_id).toBe('hp-1');
    expect(row.school_id).toBe(SCHOOL);
  });

  it('maps principal to owner_type principal', async () => {
    vi.mocked(verifySchoolRequest).mockResolvedValue({
      userId: 'pr-1', schoolId: SCHOOL, role: 'principal',
    });
    await POST(req({ token: 'tok-2', platform: 'android' }));
    const row = db.queriesFor('montree_device_tokens')[0].firstArg('upsert') as Record<string, unknown>;
    expect(row.owner_type).toBe('principal');
  });

  it('falls back to a parent-portal session (school_id null)', async () => {
    vi.mocked(verifySchoolRequest).mockResolvedValue(deny());
    vi.mocked(resolveAuthorizedParent).mockResolvedValue({
      childId: 'child-1', parentId: 'parent-9', authorizedChildIds: ['child-1'],
    });
    const res = await POST(req({ token: 'tok-3', platform: 'ios' }));
    expect(res.status).toBe(200);
    const row = db.queriesFor('montree_device_tokens')[0].firstArg('upsert') as Record<string, unknown>;
    expect(row.owner_type).toBe('parent');
    expect(row.owner_id).toBe('parent-9');
    expect(row.school_id).toBeNull();
  });
});

describe('POST /api/montree/push/register — payload validation', () => {
  it('400 for an unparsable body', async () => {
    const res = await POST(
      { json: async () => { throw new SyntaxError('bad'); } } as unknown as NextRequest
    );
    expect(res.status).toBe(400);
  });

  it.each([
    [{ platform: 'ios' }, 'missing token'],
    [{ token: '   ', platform: 'ios' }, 'blank token'],
    [{ token: 'x'.repeat(5000), platform: 'ios' }, 'oversized token'],
    [{ token: 'tok' }, 'missing platform'],
    [{ token: 'tok', platform: 'windows' }, 'unknown platform'],
  ])('400 for %j (%s)', async (body) => {
    const res = await POST(req(body));
    expect(res.status).toBe(400);
    expect(db.queriesFor('montree_device_tokens')).toHaveLength(0);
  });

  it('upserts on token conflict, trims token, caps appVersion, revives failed_at', async () => {
    const res = await POST(req({
      token: '  tok-9  ', platform: 'android', appVersion: 'v'.repeat(100),
    }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const q = db.queriesFor('montree_device_tokens')[0];
    const row = q.firstArg('upsert') as Record<string, unknown>;
    expect(row.token).toBe('tok-9');
    expect(row.platform).toBe('android');
    expect((row.app_version as string).length).toBe(64);
    expect(row.failed_at).toBeNull();
    expect(q.calls.find(([m]) => m === 'upsert')?.[1][1]).toEqual({ onConflict: 'token' });
  });
});

describe('POST /api/montree/push/register — 10-device cap', () => {
  it('deletes rows beyond the 10 most recently seen for this owner', async () => {
    db.queue('montree_device_tokens',
      { data: null },                                  // upsert ok
      { data: [{ id: 'old-1' }, { id: 'old-2' }] },    // rows 11+
      { data: null }                                   // delete ok
    );
    const res = await POST(req({ token: 'tok', platform: 'ios' }));
    expect(res.status).toBe(200);
    const [, capQuery, delQuery] = db.queriesFor('montree_device_tokens');
    expect(capQuery.hasCall('eq', 'owner_type', 'teacher')).toBe(true);
    expect(capQuery.hasCall('eq', 'owner_id', 'teacher-1')).toBe(true);
    expect(capQuery.hasCall('range', 10, 1000)).toBe(true); // keep the newest 10
    expect(delQuery.hasCall('in', 'id', ['old-1', 'old-2'])).toBe(true);
  });

  it('does not delete anything when the owner has ≤ 10 devices', async () => {
    db.queue('montree_device_tokens', { data: null }, { data: [] });
    const res = await POST(req({ token: 'tok', platform: 'ios' }));
    expect(res.status).toBe(200);
    expect(db.queriesFor('montree_device_tokens')).toHaveLength(2); // upsert + cap probe only
  });

  it('500 with a clean error when the upsert itself fails', async () => {
    db.queue('montree_device_tokens', { data: null, error: { message: 'nope', code: '42P01' } });
    const res = await POST(req({ token: 'tok', platform: 'ios' }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Failed to register device');
  });
});

describe('DELETE /api/montree/push/register', () => {
  it('401 when unauthenticated', async () => {
    vi.mocked(verifySchoolRequest).mockResolvedValue(deny());
    const res = await DELETE(req({ token: 'tok' }));
    expect(res.status).toBe(401);
  });

  it('400 when token is missing', async () => {
    const res = await DELETE(req({}));
    expect(res.status).toBe(400);
  });

  it('only deletes the CALLER’s row for that token (owner-scoped)', async () => {
    const res = await DELETE(req({ token: 'tok-1' }));
    expect(res.status).toBe(200);
    const q = db.queriesFor('montree_device_tokens')[0];
    expect(q.hasCall('eq', 'token', 'tok-1')).toBe(true);
    expect(q.hasCall('eq', 'owner_type', 'teacher')).toBe(true);
    expect(q.hasCall('eq', 'owner_id', 'teacher-1')).toBe(true);
  });
});
