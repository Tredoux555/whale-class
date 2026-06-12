// tests/account-deletion.test.ts
// lib/montree/account-deletion.ts — the guard logic behind the App Store
// 5.1.1(v) self-service deletion route. Pins down:
//   - role → mode derivation (personal vs school_purge)
//   - server-side typed-confirmation enforcement for purges
//   - the agent-with-payouts block
//   - school scoping on the personal-delete cascade
// Supabase is mocked; nothing here touches a DB.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FakeDb, QueryResult } from './helpers/fake-supabase';

vi.mock('@/lib/supabase-client', () => ({ getSupabase: vi.fn() }));

import { getSupabase } from '@/lib/supabase-client';
import {
  previewAccountDeletion,
  executeAccountDeletion,
  AccountDeletionError,
} from '@/lib/montree/account-deletion';

const SCHOOL = 'school-A';

function teacherRow(role: string): QueryResult {
  return {
    data: { id: 'u-1', school_id: SCHOOL, name: 'Pat', email: 'pat@example.com', role },
  };
}
const schoolRow: QueryResult = { data: { name: 'Sunshine Montessori' } };

let db: FakeDb;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  db = new FakeDb();
  vi.mocked(getSupabase).mockReturnValue(db.asClient() as ReturnType<typeof getSupabase>);
});

describe('previewAccountDeletion — role → mode', () => {
  it('teacher → personal (school and children stay)', async () => {
    db.queue('montree_teachers', teacherRow('teacher'));
    db.queue('montree_schools', schoolRow);
    const p = await previewAccountDeletion({ userId: 'u-1' });
    expect(p.mode).toBe('personal');
    expect(p.requiresConfirmation).toBe(false);
    expect(p.confirmationPhrase).toBeNull();
    expect(p.blocked).toBe(false);
  });

  it('homeschool_parent → school_purge with typed confirmation of the school name', async () => {
    db.queue('montree_teachers', teacherRow('homeschool_parent'));
    db.queue('montree_schools', schoolRow);
    db.queue('montree_children', { count: 3 });
    db.queue('montree_teachers', { count: 1 });
    db.queue('montree_media', { count: 12 });
    const p = await previewAccountDeletion({ userId: 'u-1' });
    expect(p.mode).toBe('school_purge');
    expect(p.requiresConfirmation).toBe(true);
    expect(p.confirmationPhrase).toBe('Sunshine Montessori');
    expect(p.counts).toEqual({ children: 3, teachers: 1, media: 12 });
  });

  it('sole principal → school_purge', async () => {
    db.queue('montree_teachers', teacherRow('principal'));
    db.queue('montree_schools', schoolRow);
    db.queue('montree_teachers', { count: 0 }); // no other members
    const p = await previewAccountDeletion({ userId: 'u-1' });
    expect(p.mode).toBe('school_purge');
  });

  it('principal with remaining members → personal (school keeps running)', async () => {
    db.queue('montree_teachers', teacherRow('principal'));
    db.queue('montree_schools', schoolRow);
    db.queue('montree_teachers', { count: 2 }); // others remain
    const p = await previewAccountDeletion({ userId: 'u-1' });
    expect(p.mode).toBe('personal');
    expect(p.requiresConfirmation).toBe(false);
  });

  it('agent with payout history → blocked (financial records retained)', async () => {
    db.queue('montree_teachers', teacherRow('agent'));
    db.queue('montree_schools', schoolRow);
    db.queue('montree_agent_payouts', { count: 4 });
    const p = await previewAccountDeletion({ userId: 'u-1' });
    expect(p.blocked).toBe(true);
    expect(p.blockedReason).toContain('payout');
  });

  it('404s via AccountDeletionError when the account does not exist', async () => {
    db.queue('montree_teachers', { data: null });
    const err = await previewAccountDeletion({ userId: 'ghost' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AccountDeletionError);
    expect((err as AccountDeletionError).status).toBe(404);
  });
});

describe('executeAccountDeletion — guards', () => {
  it('rejects a school purge when the typed confirmation does not match', async () => {
    db.queue('montree_teachers', teacherRow('homeschool_parent'));
    db.queue('montree_schools', schoolRow);
    const err = await executeAccountDeletion(
      { userId: 'u-1' }, { confirmText: 'wrong name' }
    ).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AccountDeletionError);
    expect((err as AccountDeletionError).status).toBe(400);
    // Nothing was deleted.
    const deletes = db.log.filter(({ query }) => query.calls.some(([m]) => m === 'delete'));
    expect(deletes).toHaveLength(0);
  });

  it('409s for a blocked (agent-with-payouts) account', async () => {
    db.queue('montree_teachers', teacherRow('agent'));
    db.queue('montree_schools', schoolRow);
    db.queue('montree_agent_payouts', { count: 1 });
    const err = await executeAccountDeletion({ userId: 'u-1' }, {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AccountDeletionError);
    expect((err as AccountDeletionError).status).toBe(409);
  });

  it('personal delete: audits first, then deletes ONLY this login, school-scoped', async () => {
    db.queue('montree_teachers',
      teacherRow('teacher'), // preview loadTeacher
      teacherRow('teacher'), // execute loadTeacher
      { data: null }         // the delete itself
    );
    db.queue('montree_schools', schoolRow);
    const result = await executeAccountDeletion(
      { userId: 'u-1' }, { reason: 'leaving the school' }
    );
    expect(result).toEqual({
      deleted: true, mode: 'personal', counts: { children: 0, teachers: 0, media: 0 },
    });

    const tables = db.log.map((l) => l.table);
    // Audit row is written before the destructive delete.
    expect(tables.indexOf('montree_account_deletion_audit'))
      .toBeLessThan(tables.lastIndexOf('montree_teachers'));
    const audit = db.queriesFor('montree_account_deletion_audit')[0]
      .firstArg('insert') as Record<string, unknown>;
    expect(audit.account_id).toBe('u-1');
    expect(audit.mode).toBe('personal');
    expect(audit.reason).toBe('leaving the school');

    // The teacher delete is scoped to BOTH id and school_id, and the school
    // row itself is never deleted in personal mode.
    const teacherQueries = db.queriesFor('montree_teachers');
    const del = teacherQueries[teacherQueries.length - 1];
    expect(del.calls.some(([m]) => m === 'delete')).toBe(true);
    expect(del.hasCall('eq', 'id', 'u-1')).toBe(true);
    expect(del.hasCall('eq', 'school_id', SCHOOL)).toBe(true);
    const schoolDeletes = db.queriesFor('montree_schools')
      .filter((q) => q.calls.some(([m]) => m === 'delete'));
    expect(schoolDeletes).toHaveLength(0);
  });

  it('school purge: matching confirmation deletes the school row (cascade root)', async () => {
    db.queue('montree_teachers',
      teacherRow('homeschool_parent'), // preview loadTeacher
      { count: 1 },                    // countRows montree_teachers
      teacherRow('homeschool_parent')  // execute loadTeacher
    );
    db.queue('montree_schools',
      schoolRow,     // preview getSchoolName
      { data: null } // the school delete
    );
    db.queue('montree_children', { count: 2 });
    db.queue('montree_media', { count: 5 });
    const result = await executeAccountDeletion(
      { userId: 'u-1' }, { confirmText: '  Sunshine Montessori  ' } // trimmed match passes
    );
    expect(result.mode).toBe('school_purge');
    expect(result.counts).toEqual({ children: 2, teachers: 1, media: 5 });
    const purge = db.queriesFor('montree_schools')
      .find((q) => q.calls.some(([m]) => m === 'delete'));
    expect(purge).toBeDefined();
    expect(purge?.hasCall('eq', 'id', SCHOOL)).toBe(true);
  });
});
