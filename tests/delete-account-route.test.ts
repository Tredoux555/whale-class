// tests/delete-account-route.test.ts
// /api/montree/auth/delete-account — the route-level guards around the
// deletion lib (the lib's own logic is covered in account-deletion.test.ts):
//   - auth required on both GET (preview) and DELETE (execute)
//   - only the CALLER's account is acted on (auth.userId, never the body)
//   - AccountDeletionError.status maps onto the HTTP status
//   - a successful DELETE ends the session (clears the auth cookie)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/montree/verify-request', () => ({ verifySchoolRequest: vi.fn() }));
vi.mock('@/lib/montree/account-deletion', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/montree/account-deletion')>();
  return {
    ...mod, // keep the REAL AccountDeletionError so instanceof works in the route
    previewAccountDeletion: vi.fn(),
    executeAccountDeletion: vi.fn(),
  };
});

import { verifySchoolRequest } from '@/lib/montree/verify-request';
import {
  previewAccountDeletion,
  executeAccountDeletion,
  AccountDeletionError,
} from '@/lib/montree/account-deletion';
import { MONTREE_AUTH_COOKIE } from '@/lib/montree/server-auth';
import { GET, DELETE } from '@/app/api/montree/auth/delete-account/route';

const teacherAuth = { userId: 'u-1', schoolId: 'school-A', role: 'teacher' as const };
const deny = () => NextResponse.json({ error: 'Authentication required' }, { status: 401 });

function req(body?: unknown): NextRequest {
  return {
    json: async () => {
      if (body === undefined) throw new SyntaxError('no body');
      return body;
    },
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.mocked(verifySchoolRequest).mockReset().mockResolvedValue(teacherAuth);
  vi.mocked(previewAccountDeletion).mockReset();
  vi.mocked(executeAccountDeletion).mockReset();
});

describe('GET (preview)', () => {
  it('401 without auth — preview is never computed', async () => {
    vi.mocked(verifySchoolRequest).mockResolvedValue(deny());
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(previewAccountDeletion).not.toHaveBeenCalled();
  });

  it('previews the CALLER’s account only (userId from the JWT)', async () => {
    vi.mocked(previewAccountDeletion).mockResolvedValue({
      role: 'teacher', mode: 'personal', schoolId: 'school-A',
      schoolName: 'Sunshine', accountName: 'Pat',
      counts: { children: 0, teachers: 0, media: 0 },
      requiresConfirmation: false, confirmationPhrase: null,
      blocked: false, blockedReason: null, summary: 'ok',
    });
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(previewAccountDeletion).toHaveBeenCalledWith({ userId: 'u-1' });
  });

  it('maps AccountDeletionError.status onto the response', async () => {
    vi.mocked(previewAccountDeletion).mockRejectedValue(
      new AccountDeletionError('account not found', 404)
    );
    const res = await GET(req());
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('account not found');
  });
});

describe('DELETE (execute)', () => {
  it('401 without auth — nothing is executed', async () => {
    vi.mocked(verifySchoolRequest).mockResolvedValue(deny());
    const res = await DELETE(req({ confirmText: 'whatever' }));
    expect(res.status).toBe(401);
    expect(executeAccountDeletion).not.toHaveBeenCalled();
  });

  it('executes for the CALLER and clears the montree-auth cookie', async () => {
    vi.mocked(executeAccountDeletion).mockResolvedValue({
      deleted: true, mode: 'personal', counts: { children: 0, teachers: 0, media: 0 },
    });
    const res = await DELETE(req({ confirmText: '', reason: 'done' }));
    expect(res.status).toBe(200);
    expect(executeAccountDeletion).toHaveBeenCalledWith(
      { userId: 'u-1' },
      { confirmText: '', reason: 'done' }
    );
    const cookie = res.cookies.get(MONTREE_AUTH_COOKIE);
    expect(cookie?.value).toBe(''); // session ended
    expect(cookie?.maxAge).toBe(0);
  });

  it('tolerates a missing JSON body (treated as {})', async () => {
    vi.mocked(executeAccountDeletion).mockResolvedValue({
      deleted: true, mode: 'personal', counts: { children: 0, teachers: 0, media: 0 },
    });
    const res = await DELETE(req()); // body throws → route falls back to {}
    expect(res.status).toBe(200);
    expect(executeAccountDeletion).toHaveBeenCalledWith(
      { userId: 'u-1' },
      { confirmText: undefined, reason: undefined }
    );
  });

  it('maps a confirmation failure to its 400', async () => {
    vi.mocked(executeAccountDeletion).mockRejectedValue(
      new AccountDeletionError('Confirmation text does not match the school name.', 400)
    );
    const res = await DELETE(req({ confirmText: 'nope' }));
    expect(res.status).toBe(400);
  });

  it('maps unexpected failures to 500', async () => {
    vi.mocked(executeAccountDeletion).mockRejectedValue(new Error('db exploded'));
    const res = await DELETE(req({ confirmText: '' }));
    expect(res.status).toBe(500);
  });
});
