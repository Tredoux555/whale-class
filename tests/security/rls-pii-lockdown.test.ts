// tests/security/rls-pii-lockdown.test.ts
//
// Guards the fix in migrations/350_rls_lockdown_pii.sql.
//
// supabase/migrations/096_rls_policies.sql created `FOR ALL USING (true)
// WITH CHECK (true)` policies on the seven montree PII tables. A policy with no
// TO clause belongs to PUBLIC — which includes `anon` — so the anon key that
// ships in the browser bundle could read and write every child, parent and
// teacher row in the product.
//
// There is no database in CI, so this test does the next best thing: it REPLAYS
// every migration file in the repo, in the order Postgres would see them, and
// tracks the resulting policy state for those tables. The invariant asserted is
// the one that matters — after the last migration, no PUBLIC-facing permissive
// policy survives on any PII table.
//
// Fails before 350 exists (096's policies are still standing at the end of the
// replay). Passes after. Also fails if anyone ever re-adds such a policy.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(__dirname, '..', '..');

/** The tables 096 opened up. Children/parents/teachers/invites are the PII ones. */
const PII_TABLES = [
  'montree_schools',
  'montree_classrooms',
  'montree_teachers',
  'montree_children',
  'montree_parents',
  'montree_parent_children',
  'montree_parent_invites',
];

interface SqlFile {
  label: string;
  sql: string;
}

/**
 * Every migration in the repo, ordered the way they are actually applied:
 * supabase/migrations/* (the early 0xx series) first, then migrations/* (the
 * numbered 1xx-3xx series that superseded it). Within each directory, natural
 * numeric order.
 */
function allMigrations(): SqlFile[] {
  const dirs = ['supabase/migrations', 'migrations'];
  const out: SqlFile[] = [];

  for (const dir of dirs) {
    const abs = join(REPO, dir);
    const names = readdirSync(abs)
      .filter((n) => n.endsWith('.sql'))
      // ROLLBACK scripts are kept alongside their migration but are never run
      // as part of the forward sequence.
      .filter((n) => !n.toUpperCase().includes('ROLLBACK'))
      .sort((a, b) =>
        a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' })
      );

    for (const n of names) {
      out.push({ label: `${dir}/${n}`, sql: readFileSync(join(abs, n), 'utf8') });
    }
  }

  return out;
}

/**
 * Strip `--` line comments so the huge explanatory headers in these files (which
 * quote the very CREATE POLICY statements we are hunting for) don't register as
 * real statements.
 */
function stripComments(sql: string): string {
  return sql
    .split('\n')
    .map((line) => {
      const i = line.indexOf('--');
      return i === -1 ? line : line.slice(0, i);
    })
    .join('\n');
}

interface PolicyState {
  /** "<table>::<policy>" -> the statement that created it. */
  live: Map<string, string>;
}

/** Replay every CREATE POLICY / DROP POLICY against the PII tables. */
function replayPolicies(files: SqlFile[]): PolicyState {
  const live = new Map<string, string>();

  const createRe =
    /CREATE\s+POLICY\s+"?([A-Za-z0-9_]+)"?\s+ON\s+(?:public\.)?"?([A-Za-z0-9_]+)"?([\s\S]*?);/gi;
  const dropRe =
    /DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?"?([A-Za-z0-9_]+)"?\s+ON\s+(?:public\.)?"?([A-Za-z0-9_]+)"?/gi;

  for (const f of files) {
    const sql = stripComments(f.sql);

    // Drops and creates must be applied in the order they appear in the file —
    // 096 drops then creates, 350 only drops.
    interface Op { at: number; kind: 'create' | 'drop'; table: string; name: string; body: string }
    const ops: Op[] = [];

    for (const m of sql.matchAll(createRe)) {
      ops.push({
        at: m.index ?? 0,
        kind: 'create',
        name: m[1],
        table: m[2],
        body: m[0],
      });
    }
    for (const m of sql.matchAll(dropRe)) {
      ops.push({ at: m.index ?? 0, kind: 'drop', name: m[1], table: m[2], body: m[0] });
    }

    ops.sort((a, b) => a.at - b.at);

    for (const op of ops) {
      if (!PII_TABLES.includes(op.table)) continue;
      const key = `${op.table}::${op.name}`;
      if (op.kind === 'drop') live.delete(key);
      else live.set(key, op.body);
    }
  }

  return { live };
}

/**
 * Is this CREATE POLICY statement one that hands access to the public web?
 *
 * Permissive = a `USING (true)` (or `WITH CHECK (true)`) predicate, AND no
 * `TO <role>` clause restricting it away from PUBLIC. A policy scoped
 * `TO service_role` would be pointless but harmless; a policy with a real
 * predicate is a proper tenant-isolation policy and is fine.
 */
function isPublicPermissive(stmt: string): boolean {
  const flat = stmt.replace(/\s+/g, ' ');

  const grantsToNamedRole = /\bTO\s+(?!PUBLIC\b)[A-Za-z_][A-Za-z0-9_]*/i.test(flat);
  if (grantsToNamedRole) return false;

  return (
    /USING\s*\(\s*true\s*\)/i.test(flat) ||
    /WITH\s+CHECK\s*\(\s*true\s*\)/i.test(flat)
  );
}

describe('RLS lockdown on montree PII tables', () => {
  const files = allMigrations();

  it('finds the migration files to replay', () => {
    expect(files.length).toBeGreaterThan(50);
    expect(files.some((f) => f.label.endsWith('096_rls_policies.sql'))).toBe(true);
  });

  it('096_rls_policies.sql really did create wide-open policies (the bug)', () => {
    // Pins the premise of the fix. If this ever stops being true the fix's
    // rationale changed and 350 should be revisited rather than silently kept.
    const f = files.find((x) => x.label.endsWith('096_rls_policies.sql'))!;
    const created = [
      ...stripComments(f.sql).matchAll(
        /CREATE\s+POLICY\s+"?([A-Za-z0-9_]+)"?\s+ON\s+"?([A-Za-z0-9_]+)"?([\s\S]*?);/gi
      ),
    ];
    const openOnes = created.filter((m) => isPublicPermissive(m[0]));
    expect(openOnes.length).toBe(7);
  });

  it('a later migration drops every one of them', () => {
    const { live } = replayPolicies(files);
    const stillOpen = [...live.entries()]
      .filter(([, stmt]) => isPublicPermissive(stmt))
      .map(([key]) => key);

    expect(
      stillOpen,
      `These policies grant PUBLIC (and therefore the anon key that ships in the ` +
        `browser bundle) full read/write on PII tables:\n  ${stillOpen.join('\n  ')}\n` +
        `Add a DROP POLICY for each, as migrations/350_rls_lockdown_pii.sql does.`
    ).toEqual([]);
  });

  it('leaves NO policy at all on the PII tables (deny-all + service-role bypass)', () => {
    // The chosen posture is "RLS on, zero policies" rather than "RLS on, narrow
    // policies", because every application path uses the service role. If someone
    // adds a policy here later it deserves a deliberate review, so assert on it.
    const { live } = replayPolicies(files);
    expect([...live.keys()]).toEqual([]);
  });

  it('350 re-asserts ENABLE ROW LEVEL SECURITY on all seven tables', () => {
    const f = files.find((x) => x.label.endsWith('350_rls_lockdown_pii.sql'));
    expect(f, 'migrations/350_rls_lockdown_pii.sql is missing').toBeTruthy();
    const sql = stripComments(f!.sql);

    for (const t of PII_TABLES) {
      expect(
        new RegExp(`ALTER\\s+TABLE\\s+${t}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, 'i').test(sql),
        `350 should re-assert RLS on ${t}`
      ).toBe(true);
      expect(
        new RegExp(`REVOKE\\s+ALL\\s+ON\\s+${t}\\s+FROM\\s+anon,\\s*authenticated`, 'i').test(sql),
        `350 should revoke grants on ${t}`
      ).toBe(true);
    }
  });

  it('350 ships a dry-run query so the operator can look before leaping', () => {
    const f = files.find((x) => x.label.endsWith('350_rls_lockdown_pii.sql'))!;
    // A SELECT against pg_policies must appear BEFORE the first DROP POLICY.
    const sql = f.sql;
    const firstSelect = sql.search(/SELECT[\s\S]*?FROM\s+pg_policies/i);
    const firstDrop = sql.search(/^\s*DROP\s+POLICY/im);
    expect(firstSelect).toBeGreaterThan(-1);
    expect(firstDrop).toBeGreaterThan(-1);
    expect(firstSelect).toBeLessThan(firstDrop);
  });
});
