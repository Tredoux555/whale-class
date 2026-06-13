// tests/system-controls-stepup.test.ts
// app/api/story/admin/system-controls/route.ts — the M3 destructive-action
// step-up gate. A stolen 24h admin JWT alone must NOT be enough to wipe
// everything: the three destructive actions also require per-call re-entry of
// the admin's own password (bcrypt vs story_admin_users), and the verify is
// FAIL-CLOSED on every error shape (missing/empty password, DB error, missing
// hash row, bcrypt throw).
//
// verifyStepUpPassword + DESTRUCTIVE_ACTIONS are exported from the route for
// this test (export-only, behaviour-identical). bcryptjs is mocked; the
// supabase fetch is the in-memory FakeDb — no network, no real hashing.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FakeDb } from './helpers/fake-supabase';

const compareMock = vi.fn();
vi.mock('bcryptjs', () => ({
  default: { compare: (...a: unknown[]) => compareMock(...a) },
  compare: (...a: unknown[]) => compareMock(...a),
}));

import {
  verifyStepUpPassword,
  DESTRUCTIVE_ACTIONS,
} from '@/app/api/story/admin/system-controls/route';
import type { getSupabase } from '@/lib/supabase-client';

const ADMIN = 'admin-user';
const HASH = '$2a$10$abcdefghijklmnopqrstuv'; // shape only — compare is mocked
const TABLE = 'story_admin_users';

let db: FakeDb;
const sb = () => db.asClient() as unknown as ReturnType<typeof getSupabase>;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  compareMock.mockReset();
  db = new FakeDb();
});

describe('DESTRUCTIVE_ACTIONS set', () => {
  it('contains exactly the three destructive actions', () => {
    expect(DESTRUCTIVE_ACTIONS.has('factory_reset')).toBe(true);
    expect(DESTRUCTIVE_ACTIONS.has('clear_vault')).toBe(true);
    expect(DESTRUCTIVE_ACTIONS.has('delete_all_users')).toBe(true);
    expect(DESTRUCTIVE_ACTIONS.size).toBe(3);
  });

  it('does NOT include non-destructive actions (they skip the step-up gate)', () => {
    for (const safe of [
      'clear_messages',
      'clear_expired_messages',
      'clear_login_logs',
      'reset_user_sessions',
      'clear_all_media',
    ]) {
      expect(DESTRUCTIVE_ACTIONS.has(safe)).toBe(false);
    }
  });
});

describe('verifyStepUpPassword — deny paths (fail-closed)', () => {
  it('missing password → deny (no DB or bcrypt call)', async () => {
    expect(await verifyStepUpPassword(sb(), ADMIN, undefined)).toBe(false);
    expect(db.log).toHaveLength(0);
    expect(compareMock).not.toHaveBeenCalled();
  });

  it('empty-string password → deny', async () => {
    expect(await verifyStepUpPassword(sb(), ADMIN, '')).toBe(false);
    expect(compareMock).not.toHaveBeenCalled();
  });

  it('non-string password (e.g. injected object) → deny', async () => {
    expect(await verifyStepUpPassword(sb(), ADMIN, { evil: true })).toBe(false);
    expect(compareMock).not.toHaveBeenCalled();
  });

  it('DB error fetching the admin hash → deny (never reaches bcrypt)', async () => {
    db.queue(TABLE, { data: null, error: { message: 'db down', code: '500' } });
    expect(await verifyStepUpPassword(sb(), ADMIN, 'correct-horse')).toBe(false);
    expect(compareMock).not.toHaveBeenCalled();
  });

  it('missing hash row (username not found) → deny', async () => {
    db.queue(TABLE, { data: [], error: null });
    expect(await verifyStepUpPassword(sb(), ADMIN, 'correct-horse')).toBe(false);
    expect(compareMock).not.toHaveBeenCalled();
  });

  it('wrong password (bcrypt mismatch) → deny', async () => {
    db.queue(TABLE, { data: [{ password_hash: HASH }], error: null });
    compareMock.mockResolvedValue(false);
    expect(await verifyStepUpPassword(sb(), ADMIN, 'wrong-pass')).toBe(false);
    expect(compareMock).toHaveBeenCalledWith('wrong-pass', HASH);
  });

  it('bcrypt throwing → deny (caught, fail-closed)', async () => {
    db.queue(TABLE, { data: [{ password_hash: HASH }], error: null });
    compareMock.mockRejectedValue(new Error('bcrypt blew up'));
    expect(await verifyStepUpPassword(sb(), ADMIN, 'whatever')).toBe(false);
  });
});

describe('verifyStepUpPassword — allow path', () => {
  it('correct password (bcrypt match) → allow, scoped to this username', async () => {
    db.queue(TABLE, { data: [{ password_hash: HASH }], error: null });
    compareMock.mockResolvedValue(true);
    expect(await verifyStepUpPassword(sb(), ADMIN, 'correct-horse')).toBe(true);
    expect(compareMock).toHaveBeenCalledWith('correct-horse', HASH);
    const q = db.queriesFor(TABLE)[0];
    expect(q.hasCall('eq', 'username', ADMIN)).toBe(true);
    expect(q.hasCall('limit', 1)).toBe(true);
  });
});
