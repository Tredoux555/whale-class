// tests/parent-emails.test.ts
// lib/montree/parent-emails.ts — built Jun 12 to fix the silent
// never-sent-reports bug (the send routes queried a table that never
// existed). These tests pin the corrected lookup chain:
//   montree_parent_children (links, can_view_reports)
//     → montree_parents (email, is_active)
// and the fail-soft contract: any DB error returns [] instead of throwing,
// so a report save never explodes because the email lookup hiccuped.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getParentEmailLinks, getParentEmailsForChild } from '@/lib/montree/parent-emails';
import { FakeDb } from './helpers/fake-supabase';

const C1 = 'child-1';
const C2 = 'child-2';

let db: FakeDb;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  db = new FakeDb();
});

describe('getParentEmailLinks', () => {
  it('returns [] for an empty child list without querying', async () => {
    expect(await getParentEmailLinks(db.asClient(), [])).toEqual([]);
    expect(db.log).toHaveLength(0);
  });

  it('queries montree_parent_children then montree_parents (the real schema)', async () => {
    db.queue('montree_parent_children', {
      data: [{ child_id: C1, parent_id: 'p1', relationship: 'mother', can_view_reports: true }],
    });
    db.queue('montree_parents', {
      data: [{ id: 'p1', email: 'Mom@Example.com', is_active: true }],
    });
    const links = await getParentEmailLinks(db.asClient(), [C1]);
    expect(db.log.map((l) => l.table)).toEqual(['montree_parent_children', 'montree_parents']);
    expect(db.queriesFor('montree_parent_children')[0].hasCall('in', 'child_id', [C1])).toBe(true);
    expect(links).toEqual([
      { child_id: C1, parent_email: 'mom@example.com', relationship: 'mother' },
    ]);
  });

  it('returns [] (not a throw) when the link lookup errors', async () => {
    db.queue('montree_parent_children', { data: null, error: { message: 'boom' } });
    await expect(getParentEmailLinks(db.asClient(), [C1])).resolves.toEqual([]);
    expect(db.queriesFor('montree_parents')).toHaveLength(0); // short-circuits
  });

  it('returns [] (not a throw) when the parent lookup errors', async () => {
    db.queue('montree_parent_children', {
      data: [{ child_id: C1, parent_id: 'p1', relationship: 'father', can_view_reports: true }],
    });
    db.queue('montree_parents', { data: null, error: { message: 'boom' } });
    await expect(getParentEmailLinks(db.asClient(), [C1])).resolves.toEqual([]);
  });

  it('excludes parents with can_view_reports === false', async () => {
    db.queue('montree_parent_children', {
      data: [
        { child_id: C1, parent_id: 'p1', relationship: 'mother', can_view_reports: false },
        { child_id: C1, parent_id: 'p2', relationship: 'father', can_view_reports: true },
      ],
    });
    db.queue('montree_parents', {
      data: [
        { id: 'p1', email: 'blocked@example.com', is_active: true },
        { id: 'p2', email: 'dad@example.com', is_active: true },
      ],
    });
    const links = await getParentEmailLinks(db.asClient(), [C1]);
    expect(links).toEqual([
      { child_id: C1, parent_email: 'dad@example.com', relationship: 'father' },
    ]);
  });

  it('treats a missing can_view_reports as viewable (only explicit false blocks)', async () => {
    db.queue('montree_parent_children', {
      data: [{ child_id: C1, parent_id: 'p1', relationship: null }],
    });
    db.queue('montree_parents', {
      data: [{ id: 'p1', email: 'mum@example.com', is_active: true }],
    });
    const links = await getParentEmailLinks(db.asClient(), [C1]);
    expect(links).toEqual([
      { child_id: C1, parent_email: 'mum@example.com', relationship: 'parent' }, // default
    ]);
  });

  it('excludes deactivated parents and invalid email strings', async () => {
    db.queue('montree_parent_children', {
      data: [
        { child_id: C1, parent_id: 'p1', relationship: 'mother', can_view_reports: true },
        { child_id: C1, parent_id: 'p2', relationship: 'father', can_view_reports: true },
        { child_id: C2, parent_id: 'p3', relationship: 'guardian', can_view_reports: true },
      ],
    });
    db.queue('montree_parents', {
      data: [
        { id: 'p1', email: 'inactive@example.com', is_active: false },
        { id: 'p2', email: 'not-an-email', is_active: true },
        { id: 'p3', email: 'ok@example.com', is_active: true },
      ],
    });
    const links = await getParentEmailLinks(db.asClient(), [C1, C2]);
    expect(links).toEqual([
      { child_id: C2, parent_email: 'ok@example.com', relationship: 'guardian' },
    ]);
  });

  it('returns [] when no viewable link has a parent_id', async () => {
    db.queue('montree_parent_children', {
      data: [{ child_id: C1, parent_id: null, relationship: 'mother' }],
    });
    expect(await getParentEmailLinks(db.asClient(), [C1])).toEqual([]);
    expect(db.queriesFor('montree_parents')).toHaveLength(0);
  });
});

describe('getParentEmailsForChild', () => {
  it('returns a de-duplicated flat email list', async () => {
    db.queue('montree_parent_children', {
      data: [
        { child_id: C1, parent_id: 'p1', relationship: 'mother' },
        { child_id: C1, parent_id: 'p2', relationship: 'father' },
      ],
    });
    db.queue('montree_parents', {
      data: [
        { id: 'p1', email: 'same@example.com', is_active: true },
        { id: 'p2', email: 'SAME@example.com', is_active: true }, // same address, different case
      ],
    });
    expect(await getParentEmailsForChild(db.asClient(), C1)).toEqual(['same@example.com']);
  });
});
