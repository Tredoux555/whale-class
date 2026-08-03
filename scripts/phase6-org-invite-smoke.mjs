#!/usr/bin/env node
/**
 * scripts/phase6-org-invite-smoke.mjs
 *
 * Smoke test for the Phase 6 organization invite-link lifecycle:
 *
 *     issue → redeem → single-use → expiry → revoke
 *
 * Two halves, both required to pass:
 *
 *   A. PURE — exercises lib/montree/org/invite-tokens.ts directly. The .ts source is
 *      transpiled in-process with the repo's own typescript (no build step, no tsx, no
 *      test runner) and imported as an ES module, so this really is the shipping code and
 *      not a re-implementation of it.
 *
 *   B. DATABASE — runs the same lifecycle against a Postgres database that has had
 *      migrations/315_montree_organizations.sql applied. This is what proves the UNIQUE
 *      constraint on token_hash, the invite_type CHECK, the `used_at IS NULL` concurrency
 *      guard and the ON DELETE SET NULL on montree_schools.organization_id actually behave.
 *      Skipped (not failed) when no database is reachable.
 *
 * Usage:
 *     node scripts/phase6-org-invite-smoke.mjs
 *     PHASE6_TEST_DATABASE_URL=postgres://user@localhost/db node scripts/phase6-org-invite-smoke.mjs
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

let passed = 0;
let failed = 0;
const check = (name, condition, detail = '') => {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

/**
 * Transpile a .ts module and import it as a real ES module.
 *
 * Bare npm specifiers (e.g. `bcryptjs`) are rewritten to absolute file URLs, because a
 * module loaded from a data: URL has no package resolution of its own. Node builtins are
 * left alone. Only leaf modules with no `@/` path aliases go through here.
 */
const BUILTINS = new Set(['crypto', 'fs', 'path', 'url', 'util', 'buffer', 'os']);
async function importTs(relPath) {
  const source = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  const resolved = outputText.replace(
    /(\bfrom\s+)["']([^."'][^"']*)["']/g,
    (whole, prefix, spec) => {
      if (spec.startsWith('node:') || BUILTINS.has(spec)) return whole;
      return `${prefix}${JSON.stringify(pathToFileURL(require.resolve(spec)).href)}`;
    },
  );
  return import(`data:text/javascript;base64,${Buffer.from(resolved).toString('base64')}`);
}

// ───────────────────────────────────────────────────────────────── A. pure ──
console.log('\nA. Token lifecycle (pure — lib/montree/org/invite-tokens.ts)');

const tok = await importTs('lib/montree/org/invite-tokens.ts');

// issue
const a = tok.issueInvite();
const b = tok.issueInvite();
check('token is URL-safe (base64url alphabet only)', /^[A-Za-z0-9_-]+$/.test(a.token), a.token);
check('token carries >= 128 bits of entropy', Buffer.from(a.token, 'base64url').length >= 16,
  `${Buffer.from(a.token, 'base64url').length} bytes`);
check('token is 256 bits (32 bytes)', Buffer.from(a.token, 'base64url').length === 32);
check('two issued tokens differ', a.token !== b.token);
check('hash is sha256 hex', /^[0-9a-f]{64}$/.test(a.tokenHash));
check('hash is not the token', a.tokenHash !== a.token);
check('hashing is deterministic', tok.hashInviteToken(a.token) === a.tokenHash);
check('hash tolerates surrounding whitespace', tok.hashInviteToken(` ${a.token} `) === a.tokenHash);
check('different tokens hash differently', a.tokenHash !== b.tokenHash);
check('constant-time compare accepts equal hashes', tok.tokenHashesMatch(a.tokenHash, a.tokenHash));
check('constant-time compare rejects different hashes', !tok.tokenHashesMatch(a.tokenHash, b.tokenHash));

// default expiry
const days = Math.round((a.expiresAt.getTime() - Date.now()) / 86400000);
check('default expiry is 14 days', days === 14, `${days} days`);
check('INVITE_TTL_DAYS is 14', tok.INVITE_TTL_DAYS === 14);

// redeem / single-use / expiry
const open = { expires_at: new Date(Date.now() + 86400000), used_at: null };
const used = { expires_at: new Date(Date.now() + 86400000), used_at: new Date() };
const expired = { expires_at: new Date(Date.now() - 1000), used_at: null };
const usedAndExpired = { expires_at: new Date(Date.now() - 1000), used_at: new Date() };

check('an open invite is redeemable', tok.isRedeemable(open));
check('an open invite reads as valid', tok.inviteStatus(open) === 'valid');
check('a redeemed invite is NOT redeemable (single use)', !tok.isRedeemable(used));
check('a redeemed invite reads as used', tok.inviteStatus(used) === 'used');
check('an expired invite is NOT redeemable', !tok.isRedeemable(expired));
check('an expired invite reads as expired', tok.inviteStatus(expired) === 'expired');
check('used beats expired in the message shown', tok.inviteStatus(usedAndExpired) === 'used');
check('a revoked (deleted) invite reads as not_found', tok.inviteStatus(null) === 'not_found');
check('expiry is exclusive at the boundary',
  tok.inviteStatus({ expires_at: new Date(1000), used_at: null }, new Date(1000)) === 'expired');
check('one millisecond before expiry is still valid',
  tok.inviteStatus({ expires_at: new Date(1000), used_at: null }, new Date(999)) === 'valid');

// messages
for (const s of ['used', 'expired', 'not_found']) {
  check(`status "${s}" has a human message`, tok.inviteStatusMessage(s).length > 20);
}
check('a valid invite has no error message', tok.inviteStatusMessage('valid') === '');

// links
check('organization link path',
  tok.inviteLinkFor('organization', 'ABC', 'https://montree.xyz') === 'https://montree.xyz/montree/org/join/ABC');
check('school link path',
  tok.inviteLinkFor('school', 'ABC', 'https://montree.xyz') === 'https://montree.xyz/montree/school/join/ABC');
check('link default origin is montree.xyz', tok.inviteLinkFor('school', 'x').startsWith('https://montree.xyz/'));
check('link tolerates a trailing slash on the origin',
  tok.inviteLinkFor('school', 'x', 'https://montree.xyz/') === 'https://montree.xyz/montree/school/join/x');
check('token is URL-encoded into the link', !tok.inviteLinkFor('school', 'a/b').includes('a/b'));

// slug
check('slug lowercases and hyphenates', tok.orgSlug('Sunrise Montessori Group') === 'sunrise-montessori-group');
check('slug strips punctuation', tok.orgSlug('  St. Mary’s!! ') === 'st-mary-s');
check('slug caps at 50 chars', tok.orgSlug('a'.repeat(200)).length === 50);

// ──────────────────────────────────────────────────────────── B. login path ──
// The organisation leader's door (/api/montree/org/login) verifies the submitted password
// against montree_organization_admins.password_hash with lib/montree/password.ts — the same
// dual-verify + silent-upgrade helpers principal login uses. Exercised here directly.
console.log('\nB. Organization leader sign-in (pure — lib/montree/password.ts)');

const pw = await importTs('lib/montree/password.ts');

const secret = 'correct horse battery staple';
const storedHash = await pw.hashPassword(secret);

check('registration stores a bcrypt hash, never the password', storedHash.startsWith('$2') && !storedHash.includes(secret));
check('two hashes of the same password differ (salted)', (await pw.hashPassword(secret)) !== storedHash);
check('the right password signs in', await pw.verifyPassword(secret, storedHash));
check('the wrong password does NOT sign in', !(await pw.verifyPassword('correct horse battery stapl', storedHash)));
check('an empty password does NOT sign in', !(await pw.verifyPassword('', storedHash)));
check('a near-miss with different case does NOT sign in', !(await pw.verifyPassword(secret.toUpperCase(), storedHash)));
check('a bcrypt hash is not treated as legacy', !pw.isLegacyHash(storedHash));

// Legacy SHA-256 path: an old hash still verifies, and is flagged for silent upgrade.
const legacyHash = pw.legacySha256(secret);
check('a legacy SHA-256 hash still verifies', await pw.verifyPassword(secret, legacyHash));
check('a legacy hash rejects the wrong password', !(await pw.verifyPassword('nope', legacyHash)));
check('a legacy hash is flagged for upgrade to bcrypt', pw.isLegacyHash(legacyHash));

// ─────────────────────────────────────────────────────────────── C. database ──
console.log('\nC. Token lifecycle (database — migration 315)');

const CANDIDATES = [
  process.env.PHASE6_TEST_DATABASE_URL,
  process.env.DATABASE_URL,
  // Local dev cluster over the unix socket — the shape this was developed against.
  'postgres://root@/phase6_build?host=/var/run/postgresql',
  'postgres://postgres@localhost/phase6_build',
].filter(Boolean);

let pg = null;
try {
  ({ default: pg } = await import('pg'));
} catch {
  console.log('  … `pg` is not installed — database half skipped.');
}

let client = null;
let connectedUrl = null;
if (pg) {
  for (const url of CANDIDATES) {
    const c = new pg.Client({ connectionString: url });
    try {
      await c.connect();
      await c.query('SELECT 1 FROM montree_org_invites LIMIT 1');
      client = c;
      connectedUrl = url;
      console.log(`  … connected: ${url.replace(/:[^:@/]*@/, ':***@')}`);
      break;
    } catch {
      try { await c.end(); } catch { /* already closed */ }
    }
  }
  if (!client) console.log('  … no database with migration 315 reachable — database half skipped.');
}

if (client) {
  const suffix = Date.now();
  try {
    await client.query('BEGIN');

    // ── issue ──
    const orgInvite = tok.issueInvite();
    const { rows: [issued] } = await client.query(
      `INSERT INTO montree_org_invites (token_hash, invite_type, prefill_name, issued_by, expires_at)
       VALUES ($1,'organization',$2,'super-admin',$3) RETURNING id, used_at, organization_id`,
      [orgInvite.tokenHash, 'Smoke Test Group', orgInvite.expiresAt.toISOString()],
    );
    check('an organization invite inserts', !!issued.id);
    check('a fresh invite is unused', issued.used_at === null);
    check('an organization invite has no organization yet', issued.organization_id === null);

    // the plaintext is nowhere in the table
    const { rows: leak } = await client.query(
      'SELECT 1 FROM montree_org_invites WHERE token_hash = $1', [orgInvite.token],
    );
    check('the plaintext token is never stored', leak.length === 0);

    // lookup by hash is how redemption finds it
    const { rows: found } = await client.query(
      'SELECT id FROM montree_org_invites WHERE token_hash = $1',
      [tok.hashInviteToken(orgInvite.token)],
    );
    check('redemption finds the invite by hash', found.length === 1 && found[0].id === issued.id);

    // token_hash is unique — a collision cannot create a second live invite
    let dupeRejected = false;
    try {
      await client.query('SAVEPOINT s1');
      await client.query(
        `INSERT INTO montree_org_invites (token_hash, invite_type, expires_at)
         VALUES ($1,'organization', NOW() + INTERVAL '1 day')`, [orgInvite.tokenHash],
      );
      await client.query('RELEASE SAVEPOINT s1');
    } catch {
      dupeRejected = true;
      await client.query('ROLLBACK TO SAVEPOINT s1');
    }
    check('a duplicate token_hash is rejected by the database', dupeRejected);

    // invite_type is constrained
    let badTypeRejected = false;
    try {
      await client.query('SAVEPOINT s2');
      await client.query(
        `INSERT INTO montree_org_invites (token_hash, invite_type, expires_at)
         VALUES ($1,'district', NOW() + INTERVAL '1 day')`, [tok.issueInvite().tokenHash],
      );
      await client.query('RELEASE SAVEPOINT s2');
    } catch {
      badTypeRejected = true;
      await client.query('ROLLBACK TO SAVEPOINT s2');
    }
    check('an unknown invite_type is rejected by the database', badTypeRejected);

    // ── redeem ──
    const { rows: [org] } = await client.query(
      `INSERT INTO montree_organizations (name, slug, contact_name, contact_email)
       VALUES ('Smoke Test Group', $1, 'Smoke Tester', 'smoke@example.test') RETURNING id`,
      [`smoke-test-group-${suffix}`],
    );
    // The leader's login row, and the lookup /api/montree/org/login performs.
    const { rows: [orgAdmin] } = await client.query(
      `INSERT INTO montree_organization_admins (organization_id, name, email, password_hash, last_login_at)
       VALUES ($1,'Smoke Tester',$2,$3, NOW()) RETURNING id, email, password_hash, last_login_at`,
      [org.id, `smoke+${suffix}@example.test`, storedHash],
    );
    const { rows: [byEmail] } = await client.query(
      'SELECT id, password_hash FROM montree_organization_admins WHERE email = $1',
      [`smoke+${suffix}@example.test`],
    );
    check('sign-in finds the leader by email', byEmail?.id === orgAdmin.id);
    check('the stored hash verifies the right password', await pw.verifyPassword(secret, byEmail.password_hash));
    check('the stored hash rejects a wrong password', !(await pw.verifyPassword('wrong', byEmail.password_hash)));
    check('last_login_at is recorded', orgAdmin.last_login_at !== null);

    let dupeEmailRejected = false;
    try {
      await client.query('SAVEPOINT s3');
      await client.query(
        `INSERT INTO montree_organization_admins (organization_id, name, email, password_hash)
         VALUES ($1,'Impostor',$2,'x')`, [org.id, `smoke+${suffix}@example.test`],
      );
      await client.query('RELEASE SAVEPOINT s3');
    } catch {
      dupeEmailRejected = true;
      await client.query('ROLLBACK TO SAVEPOINT s3');
    }
    check('one email cannot lead two organizations', dupeEmailRejected);

    const { rowCount: burned } = await client.query(
      `UPDATE montree_org_invites
          SET used_at = NOW(), used_by_email = 'smoke@example.test', organization_id = $2
        WHERE id = $1 AND used_at IS NULL`,
      [issued.id, org.id],
    );
    check('redeeming an open invite burns exactly one row', burned === 1);

    const { rows: [afterRedeem] } = await client.query(
      'SELECT used_at, organization_id, used_by_email FROM montree_org_invites WHERE id = $1', [issued.id],
    );
    check('used_at is stamped', afterRedeem.used_at !== null);
    check('organization_id is backfilled onto the org invite', afterRedeem.organization_id === org.id);
    check('used_by_email is recorded', afterRedeem.used_by_email === 'smoke@example.test');
    check('the redeemed invite now reads as used', tok.inviteStatus(afterRedeem) === 'used');

    // ── single use ──
    const { rowCount: second } = await client.query(
      `UPDATE montree_org_invites SET used_at = NOW() WHERE id = $1 AND used_at IS NULL`, [issued.id],
    );
    check('a second redemption updates NOTHING (single use)', second === 0);

    // ── CONCURRENCY: two people redeem the same link at the same moment ──
    // This is the audit's CRITICAL C1. The routes now CLAIM the invite first — a single
    // UPDATE ... WHERE used_at IS NULL AND expires_at > NOW() — and only create the
    // organisation if that claim returned exactly one row. Two parallel claims must
    // therefore produce exactly one winner and one loser, on separate connections so they
    // genuinely race rather than queue inside one transaction.
    const raced = tok.issueInvite();
    const racePool = new pg.Pool({ connectionString: connectedUrl, max: 12 });
    const raceTokens = [raced.tokenHash];
    try {
      await racePool.query(
        `INSERT INTO montree_org_invites (token_hash, invite_type, issued_by, expires_at)
         VALUES ($1,'organization','super-admin', NOW() + INTERVAL '7 days')`,
        [raced.tokenHash],
      );

      const claimSql = `UPDATE montree_org_invites
                           SET used_at = NOW(), used_by_email = $2
                         WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
                     RETURNING id`;
      const [first, second] = await Promise.all([
        racePool.query(claimSql, [raced.tokenHash, 'racer-a@example.test']),
        racePool.query(claimSql, [raced.tokenHash, 'racer-b@example.test']),
      ]);
      const winners = [first, second].filter((r) => r.rowCount === 1).length;
      const losers = [first, second].filter((r) => r.rowCount === 0).length;

      check('two parallel redemptions: exactly ONE claim succeeds', winners === 1, `winners=${winners}`);
      check('two parallel redemptions: the other claim gets zero rows', losers === 1, `losers=${losers}`);

      const { rows: [claimedRow] } = await racePool.query(
        'SELECT used_by_email FROM montree_org_invites WHERE token_hash = $1', [raced.tokenHash],
      );
      check('only the winner\'s email is recorded on the invite',
        claimedRow.used_by_email === 'racer-a@example.test' || claimedRow.used_by_email === 'racer-b@example.test');

      // Ten at once, for good measure — the guard must not degrade with contention.
      const stampede = tok.issueInvite();
      await racePool.query(
        `INSERT INTO montree_org_invites (token_hash, invite_type, issued_by, expires_at)
         VALUES ($1,'school','org-admin', NOW() + INTERVAL '7 days')`,
        [stampede.tokenHash],
      );
      const results = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          racePool.query(claimSql, [stampede.tokenHash, `racer-${i}@example.test`])),
      );
      const stampedeWinners = results.filter((r) => r.rowCount === 1).length;
      check('ten parallel redemptions: exactly ONE claim succeeds', stampedeWinners === 1,
        `winners=${stampedeWinners}`);

      // An already-expired link cannot be claimed at all.
      const dead = tok.issueInvite();
      await racePool.query(
        `INSERT INTO montree_org_invites (token_hash, invite_type, expires_at)
         VALUES ($1,'organization', NOW() - INTERVAL '1 second')`, [dead.tokenHash],
      );
      const { rowCount: deadClaim } = await racePool.query(claimSql, [dead.tokenHash, 'x@example.test']);
      check('an expired link cannot be claimed', deadClaim === 0);

      // Releasing a claim (tenant creation failed) makes the link usable again — exactly once.
      const released = tok.issueInvite();
      await racePool.query(
        `INSERT INTO montree_org_invites (token_hash, invite_type, expires_at)
         VALUES ($1,'organization', NOW() + INTERVAL '7 days')`, [released.tokenHash],
      );
      await racePool.query(claimSql, [released.tokenHash, 'a@example.test']);
      await racePool.query(
        'UPDATE montree_org_invites SET used_at = NULL, used_by_email = NULL WHERE token_hash = $1',
        [released.tokenHash],
      );
      const { rowCount: reclaim } = await racePool.query(claimSql, [released.tokenHash, 'b@example.test']);
      check('a released claim can be redeemed again', reclaim === 1);

      raceTokens.push(stampede.tokenHash, dead.tokenHash, released.tokenHash);
    } finally {
      // These rows were committed on their own connections, outside this test's
      // transaction, so they must be cleaned up explicitly — a ROLLBACK will not reach them.
      await racePool
        .query('DELETE FROM montree_org_invites WHERE token_hash = ANY($1)', [raceTokens])
        .catch(() => {});
      await racePool.end().catch(() => {});
    }

    // ── the school link, and the school it creates ──
    const schoolInvite = tok.issueInvite();
    const { rows: [schoolRow] } = await client.query(
      `INSERT INTO montree_org_invites (token_hash, invite_type, organization_id, issued_by, expires_at)
       VALUES ($1,'school',$2,'org-admin',$3) RETURNING id`,
      [schoolInvite.tokenHash, org.id, schoolInvite.expiresAt.toISOString()],
    );
    check('a school invite carries its organization at issue time', !!schoolRow.id);

    const { rows: [school] } = await client.query(
      `INSERT INTO montree_schools (name, slug, organization_id) VALUES ($1,$2,$3) RETURNING id, organization_id`,
      [`Smoke School ${suffix}`, `smoke-school-${suffix}`, org.id],
    );
    check('a school registered through the link is linked to the organization', school.organization_id === org.id);

    // ── expiry ──
    const stale = tok.issueInvite(14);
    const { rows: [staleRow] } = await client.query(
      `INSERT INTO montree_org_invites (token_hash, invite_type, organization_id, expires_at)
       VALUES ($1,'school',$2, NOW() - INTERVAL '1 minute') RETURNING id, expires_at, used_at`,
      [stale.tokenHash, org.id],
    );
    check('an expired invite reads as expired', tok.inviteStatus(staleRow) === 'expired');
    check('an expired invite is not redeemable', !tok.isRedeemable(staleRow));

    // The partial index backing the outstanding-invite list only holds unused rows.
    const { rows: [{ count: openCount }] } = await client.query(
      `SELECT COUNT(*)::int AS count FROM montree_org_invites
        WHERE organization_id = $1 AND used_at IS NULL AND expires_at > NOW()`, [org.id],
    );
    check('exactly one invite for this org is still open', openCount === 1, `got ${openCount}`);

    // ── revoke ──
    const { rowCount: revoked } = await client.query(
      'DELETE FROM montree_org_invites WHERE id = $1 AND used_at IS NULL', [schoolRow.id],
    );
    check('revoking an unused invite deletes it', revoked === 1);
    const { rows: gone } = await client.query(
      'SELECT id FROM montree_org_invites WHERE token_hash = $1', [schoolInvite.tokenHash],
    );
    check('a revoked token no longer resolves', gone.length === 0);
    check('a revoked invite reads as not_found', tok.inviteStatus(gone[0] ?? null) === 'not_found');

    const { rowCount: cannotRevoke } = await client.query(
      'DELETE FROM montree_org_invites WHERE id = $1 AND used_at IS NULL', [issued.id],
    );
    check('a redeemed invite cannot be revoked away', cannotRevoke === 0);

    // ── deleting an organization must never delete its schools ──
    await client.query('DELETE FROM montree_organizations WHERE id = $1', [org.id]);
    const { rows: [survivor] } = await client.query(
      'SELECT organization_id FROM montree_schools WHERE id = $1', [school.id],
    );
    check('deleting an organization leaves its schools standing', !!survivor);
    check('the orphaned school simply becomes independent', survivor.organization_id === null);
    const { rows: cascaded } = await client.query(
      'SELECT id FROM montree_org_invites WHERE id = $1', [issued.id],
    );
    check('its invites are cleared with it', cascaded.length === 0);
  } finally {
    // Nothing this test wrote is kept.
    await client.query('ROLLBACK').catch(() => {});
    await client.end().catch(() => {});
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
