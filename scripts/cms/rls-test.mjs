#!/usr/bin/env node
// scripts/cms/rls-test.mjs
// ============================================================================
// THE LOAD-BEARING TEST FOR migrations/329_cms_phase2.sql
// AND migrations/330_cms_phase3.sql.
//
// The CMS app talks to Postgres through the service role, which bypasses RLS —
// so no amount of clicking the UI can tell you whether the policies are right.
// This script is the only thing that can. It connects as an ordinary role,
// impersonates each kind of user exactly the way PostgREST does (SET ROLE
// authenticated + SET request.jwt.claims), and asserts both halves of every
// rule: that the person who should see a row does, and that the person who
// should not, does not.
//
// A policy file that only proves the positive half is worthless.
//
// RUN:
//   createdb cms_test
//   psql -d cms_test -f scripts/cms/local-supabase-shim.sql
//   psql -d cms_test -v ON_ERROR_STOP=1 -f migrations/329_cms_phase2.sql
//   psql -d cms_test -v ON_ERROR_STOP=1 -f migrations/330_cms_phase3.sql
//   DATABASE_URL=postgres://user:pass@127.0.0.1:5432/cms_test node scripts/cms/rls-test.mjs
//
// Exit 0 = every assertion passed. Exit 1 = at least one failed.
// Uses only `pg`, which is already a Montree dependency. Adds nothing.
// ============================================================================

import pg from 'pg';

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://cmsapp:cmsapp@127.0.0.1:5432/cms_test';

const client = new pg.Client({ connectionString: DATABASE_URL });

// ── assertion plumbing ──────────────────────────────────────────────────────
let passed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failures.push(name);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

/**
 * Run a callback as an authenticated user with the given cms_users.id as the
 * JWT subject. This is the same mechanism Supabase uses: PostgREST switches to
 * the `authenticated` role and sets request.jwt.claims from the verified token.
 * Wrapped in a transaction with SET LOCAL so the impersonation cannot leak into
 * the next block even if an assertion throws.
 */
async function asUser(userId, fn) {
  await client.query('BEGIN');
  try {
    await client.query(`SET LOCAL request.jwt.claims = '${JSON.stringify({
      sub: userId,
      role: 'authenticated',
    })}'`);
    await client.query('SET LOCAL ROLE authenticated');
    return await fn();
  } finally {
    await client.query('COMMIT').catch(() => client.query('ROLLBACK'));
    await client.query('RESET ROLE');
  }
}

/** Same, but with no JWT at all — the public anon key. */
async function asAnon(fn) {
  await client.query('BEGIN');
  try {
    await client.query('SET LOCAL ROLE anon');
    return await fn();
  } finally {
    await client.query('COMMIT').catch(() => client.query('ROLLBACK'));
    await client.query('RESET ROLE');
  }
}

/**
 * Returns { ok, rows, error } instead of throwing, so a denial is data.
 *
 * Every statement runs inside its own SAVEPOINT. Without that, the FIRST
 * expected denial would abort the surrounding transaction and every later
 * statement in the block would fail with "current transaction is aborted" —
 * which reads as a policy failure but is really harness damage. Half of this
 * test is denials, so the savepoint is not optional.
 */
let spCounter = 0;
async function attempt(sql, params = []) {
  const sp = `sp_${++spCounter}`;
  await client.query(`SAVEPOINT ${sp}`);
  try {
    const r = await client.query(sql, params);
    await client.query(`RELEASE SAVEPOINT ${sp}`);
    return { ok: true, rows: r.rows, count: r.rowCount };
  } catch (e) {
    await client.query(`ROLLBACK TO SAVEPOINT ${sp}`);
    await client.query(`RELEASE SAVEPOINT ${sp}`);
    return { ok: false, rows: [], count: 0, error: e.message };
  }
}

const uuid = async () => (await client.query('select gen_random_uuid() u')).rows[0].u;

// ── seed ────────────────────────────────────────────────────────────────────
// Written as the owner (RLS bypassed) — this stands in for the service-role
// provisioning the app does at signup. The TEST only ever reads and writes
// through `authenticated`.
async function seed() {
  await client.query(`
    delete from cms_organisations;
    delete from cms_users;
  `);

  const ids = {};
  const q = async (sql, params) => (await client.query(sql, params)).rows[0];

  ids.org = (await q(
    `insert into cms_organisations (name, slug, country_code)
     values ('Harbor Early Years Trust', 'harbor-trust-test', 'ZA') returning id`
  )).id;

  ids.schoolA = (await q(
    `insert into cms_schools (organisation_id, name, slug, timezone)
     values ($1,'Harbor House','harbor-house','Africa/Johannesburg') returning id`,
    [ids.org]
  )).id;
  ids.schoolB = (await q(
    `insert into cms_schools (organisation_id, name, slug, timezone)
     values ($1,'Quay Street','quay-street','Africa/Johannesburg') returning id`,
    [ids.org]
  )).id;

  ids.sunrise = (await q(
    `insert into cms_class_groups (school_id, name, age_min, age_max, capacity)
     values ($1,'Sunrise Room',3,5,21) returning id`, [ids.schoolA]
  )).id;
  ids.meadow = (await q(
    `insert into cms_class_groups (school_id, name, age_min, age_max, capacity)
     values ($1,'Meadow Room',3,5,18) returning id`, [ids.schoolA]
  )).id;
  ids.quayRoom = (await q(
    `insert into cms_class_groups (school_id, name, age_min, age_max, capacity)
     values ($1,'Anchor Room',3,5,16) returning id`, [ids.schoolB]
  )).id;

  const mkUser = async (email, name) =>
    (await q(
      `insert into cms_users (email, password_hash, display_name)
       values ($1,'$2b$10$notarealhashnotarealhashnotarealhashnotarealhash', $2) returning id`,
      [email, name]
    )).id;

  ids.parentA = await mkUser('parent.a@example.com', 'Ngozi Okonkwo');
  ids.parentB = await mkUser('parent.b@example.com', 'Irina Volkova');
  ids.teacher1 = await mkUser('teacher.sunrise@example.com', 'K. Mbeki');
  ids.teacher2 = await mkUser('teacher.meadow@example.com', 'J. Adams');
  ids.orgAdmin = await mkUser('director@example.com', 'A. Director');
  ids.schoolAdmin = await mkUser('office@example.com', 'S. Office');

  const mkGuardian = async (school, name, rel) =>
    (await q(
      `insert into cms_guardians (school_id, full_name, relationship)
       values ($1,$2,$3) returning id`, [school, name, rel]
    )).id;

  ids.guardianA = await mkGuardian(ids.schoolA, 'Ngozi Okonkwo', 'mother');
  ids.guardianB = await mkGuardian(ids.schoolA, 'Irina Volkova', 'mother');

  const mkMembership = async (user, role, school, guardian) =>
    (await q(
      `insert into cms_memberships (user_id, role, organisation_id, school_id, guardian_id, email, display_name)
       values ($1,$2,$3,$4,$5,'m@example.com','member') returning id`,
      [user, role, ids.org, school, guardian ?? null]
    )).id;

  ids.mParentA = await mkMembership(ids.parentA, 'parent', ids.schoolA, ids.guardianA);
  ids.mParentB = await mkMembership(ids.parentB, 'parent', ids.schoolA, ids.guardianB);
  ids.mTeacher1 = await mkMembership(ids.teacher1, 'teacher', ids.schoolA, null);
  ids.mTeacher2 = await mkMembership(ids.teacher2, 'teacher', ids.schoolA, null);
  ids.mSchoolAdmin = await mkMembership(ids.schoolAdmin, 'school_admin', ids.schoolA, null);
  ids.mOrgAdmin = await mkMembership(ids.orgAdmin, 'org_admin', null, null);

  await client.query(
    `insert into cms_class_teachers (membership_id, class_group_id) values ($1,$2)`,
    [ids.mTeacher1, ids.sunrise]
  );
  await client.query(
    `insert into cms_class_teachers (membership_id, class_group_id) values ($1,$2)`,
    [ids.mTeacher2, ids.meadow]
  );

  // A child at the OTHER school, so the org-aggregate assertion spans schools
  // and the school_admin assertion has something it must not see.
  ids.quayChild = (await q(
    `insert into cms_children (school_id, class_group_id, legal_name, preferred_name, date_of_birth)
     values ($1,$2,'Tumelo Wanjiku','Tumelo','2021-08-09') returning id`,
    [ids.schoolB, ids.quayRoom]
  )).id;

  return ids;
}

// ── the run ─────────────────────────────────────────────────────────────────
async function main() {
  await client.connect();
  const ids = await seed();

  console.log('\nCMS PHASE 2 + 3 — RLS INTEGRATION TEST');
  console.log('==================================\n');

  // ── 0. the claim plumbing itself ──────────────────────────────────────────
  console.log('claims');
  await asUser(ids.parentA, async () => {
    const r = await attempt('select cms_current_user_id() a, auth.uid() b');
    check(
      'cms_current_user_id() resolves the JWT subject',
      r.ok && r.rows[0].a === ids.parentA,
      r.error || String(r.rows[0]?.a)
    );
    check(
      'cms_current_user_id() agrees with Supabase auth.uid()',
      r.ok && r.rows[0].a === r.rows[0].b
    );
  });
  await asAnon(async () => {
    const r = await attempt('select cms_current_user_id() a');
    check('anonymous caller resolves to NULL identity', r.ok && r.rows[0].a === null);
  });

  // ── 1. parent A creates a child through the enrolment path ────────────────
  console.log('\nparent A writes (the enrolment path)');
  const childId = await uuid();
  const enrollmentId = await uuid();

  await asUser(ids.parentA, async () => {
    // No RETURNING: under RLS, INSERT ... RETURNING also applies the SELECT
    // policy, and the child is not yet visible to the parent — the guardian
    // link that makes it theirs comes next. Ids are generated client-side,
    // which is what the server action does too.
    const insChild = await attempt(
      `insert into cms_children (id, school_id, class_group_id, legal_name, preferred_name, date_of_birth, home_language, created_by_user_id)
       values ($1,$2,$3,'Amara Chidinma Okonkwo','Amara','2021-06-04','Igbo',$4)`,
      [childId, ids.schoolA, ids.sunrise, ids.parentA]
    );
    check('parent A inserts a child at their own school', insChild.ok, insChild.error);

    // The creator column is not decoration — a family cannot stamp somebody else
    // as the creator, because that is what the guardian-link policy trusts.
    const forgeCreator = await attempt(
      `insert into cms_children (school_id, class_group_id, legal_name, preferred_name, date_of_birth, created_by_user_id)
       values ($1,$2,'Forged','Forged','2021-01-01',$3)`,
      [ids.schoolA, ids.sunrise, ids.parentB]
    );
    check('parent A CANNOT create a child stamped as another user', !forgeCreator.ok);

    const insLink = await attempt(
      `insert into cms_child_guardians (child_id, guardian_id, is_primary) values ($1,$2,true)`,
      [childId, ids.guardianA]
    );
    check('parent A links the child to their own guardian row', insLink.ok, insLink.error);

    const insEnrol = await attempt(
      `insert into cms_enrollments (id, child_id, school_id, requested_class_group_id, status, completed_steps)
       values ($1,$2,$3,$4,'draft','{child}')`,
      [enrollmentId, childId, ids.schoolA, ids.sunrise]
    );
    check('parent A opens a draft enrolment', insEnrol.ok, insEnrol.error);

    const insAllergy = await attempt(
      `insert into cms_allergies (child_id, school_id, allergen, severity, reaction, response_plan)
       values ($1,$2,'Peanut','severe','Anaphylaxis','EpiPen in the Sunrise Room cabinet')`,
      [childId, ids.schoolA]
    );
    check('parent A records an allergy for their child', insAllergy.ok, insAllergy.error);

    const insMedical = await attempt(
      `insert into cms_medical_records (child_id, school_id, conditions)
       values ($1,$2,'{Peanut anaphylaxis}')`,
      [childId, ids.schoolA]
    );
    check('parent A records a medical record for their child', insMedical.ok, insMedical.error);

    // ── phase 3 (migration 330) ───────────────────────────────────────────
    const insProfile = await attempt(
      `insert into cms_child_profiles
         (child_id, school_id, likes, dislikes, interests, temperament, parent_notes)
       values ($1,$2,'{puddles,"her red blanket"}','{"hand dryers"}','{bugs}',
               '{"settling":4,"company":5}'::jsonb,
               'Goodbyes are hard for five minutes and then she is fine.')`,
      [childId, ids.schoolA]
    );
    check('parent A writes the About-your-child profile', insProfile.ok, insProfile.error);

    const insSchool = await attempt(
      `insert into cms_previous_schools (child_id, school_id, name, country_code, city)
       values ($1,$2,'Little Acorns','ZA','Cape Town')`,
      [childId, ids.schoolA]
    );
    check('parent A records a previous setting', insSchool.ok, insSchool.error);

    // The cross-tenant write attempt. Parent A has no parent membership at
    // school B, so the WITH CHECK must refuse.
    const crossSchool = await attempt(
      `insert into cms_children (school_id, class_group_id, legal_name, preferred_name, date_of_birth)
       values ($1,$2,'Ghost Child','Ghost','2021-01-01')`,
      [ids.schoolB, ids.quayRoom]
    );
    check('parent A CANNOT insert a child at a school they are not a parent of', !crossSchool.ok);

    // The self-elevation attempt.
    const elevate = await attempt(
      `insert into cms_memberships (user_id, role, organisation_id, school_id, email)
       values ($1,'school_admin',$2,$3,'x@example.com')`,
      [ids.parentA, ids.org, ids.schoolA]
    );
    check('parent A CANNOT grant themselves a school_admin membership', !elevate.ok);
  });

  // ── 2. parent A reads back ────────────────────────────────────────────────
  console.log('\nparent A reads');
  await asUser(ids.parentA, async () => {
    const kids = await attempt('select id, preferred_name from cms_children where deleted_at is null');
    check('parent A sees exactly their own child', kids.count === 1 && kids.rows[0].id === childId,
      `saw ${kids.count}`);

    const enrol = await attempt('select id, status from cms_enrollments');
    check('parent A sees their draft enrolment', enrol.count === 1 && enrol.rows[0].status === 'draft');

    const med = await attempt('select id from cms_medical_records');
    check('parent A sees their child\'s medical record', med.count === 1);

    const profile = await attempt(
      'select likes, temperament from cms_child_profiles where child_id = $1', [childId]
    );
    check('parent A reads back their own child\'s profile', profile.count === 1);

    const prev = await attempt('select name from cms_previous_schools where child_id = $1', [childId]);
    check('parent A reads back their own child\'s previous setting', prev.count === 1);

    const upd = await attempt(
      `update cms_child_profiles set parent_notes = 'One long hug, then go.' where child_id = $1`,
      [childId]
    );
    check('parent A can edit their own child\'s profile', upd.ok && upd.count === 1, upd.error);

    const resume = await attempt(
      `update cms_enrollments set draft_data = '{"medical":{"doctor":"Dr N. Pillay"}}'::jsonb,
              completed_steps = '{child,medical}' where id = $1`,
      [enrollmentId]
    );
    check('parent A can save wizard progress into their draft', resume.ok && resume.count === 1,
      resume.error);
  });

  // ── 3. parent B: the isolation half ───────────────────────────────────────
  console.log('\nparent B (a different family, same school)');
  await asUser(ids.parentB, async () => {
    const kids = await attempt('select id from cms_children where id = $1', [childId]);
    check('parent B CANNOT read parent A\'s child', kids.count === 0, `saw ${kids.count}`);

    const med = await attempt('select id from cms_medical_records where child_id = $1', [childId]);
    check('parent B CANNOT read parent A\'s child\'s medical record', med.count === 0);

    const allergies = await attempt('select id from cms_allergies where child_id = $1', [childId]);
    check('parent B CANNOT read parent A\'s child\'s allergies', allergies.count === 0);

    const upd = await attempt(
      `update cms_children set preferred_name = 'Hijacked' where id = $1`, [childId]
    );
    check('parent B CANNOT update parent A\'s child', upd.ok && upd.count === 0,
      upd.error || `${upd.count} rows`);

    const del = await attempt('delete from cms_children where id = $1', [childId]);
    check('parent B CANNOT delete parent A\'s child', del.ok && del.count === 0);

    const steal = await attempt(
      `insert into cms_child_guardians (child_id, guardian_id) values ($1,$2)`,
      [childId, ids.guardianB]
    );
    check('parent B CANNOT attach themselves as a guardian of parent A\'s child', !steal.ok);

    const stealPickup = await attempt(
      `insert into cms_pickup_authorizations (child_id, school_id, guardian_id)
       values ($1,$2,$3)`,
      [childId, ids.schoolA, ids.guardianB]
    );
    check('parent B CANNOT authorise themselves to collect parent A\'s child', !stealPickup.ok);

    const enrol = await attempt('select id from cms_enrollments where id = $1', [enrollmentId]);
    check('parent B CANNOT read parent A\'s enrolment', enrol.count === 0);

    // ── phase 3: personality data is the MOST private thing in the schema ──
    const profile = await attempt('select id from cms_child_profiles where child_id = $1', [childId]);
    check('parent B CANNOT read parent A\'s child\'s profile', profile.count === 0,
      `saw ${profile.count}`);

    const profileUpd = await attempt(
      `update cms_child_profiles set parent_notes = 'hijacked' where child_id = $1`, [childId]
    );
    check('parent B CANNOT edit parent A\'s child\'s profile', profileUpd.ok && profileUpd.count === 0,
      profileUpd.error || `${profileUpd.count} rows`);

    const profileIns = await attempt(
      `insert into cms_child_profiles (child_id, school_id, parent_notes)
       values ($1,$2,'planted')`, [childId, ids.schoolA]
    );
    check('parent B CANNOT plant a profile on parent A\'s child', !profileIns.ok);

    const prev = await attempt('select id from cms_previous_schools where child_id = $1', [childId]);
    check('parent B CANNOT read parent A\'s child\'s schooling history', prev.count === 0);
  });

  // ── 4. teacher of the room vs teacher of another room ─────────────────────
  console.log('\nteachers');
  await asUser(ids.teacher1, async () => {
    const kids = await attempt('select id from cms_children where id = $1', [childId]);
    check('teacher of the Sunrise Room CAN read a child in it', kids.count === 1);

    const allergies = await attempt('select allergen, severity from cms_allergies where child_id = $1', [childId]);
    check('teacher of the room CAN read that child\'s allergies (safety rule)', allergies.count === 1);

    const med = await attempt('select id from cms_medical_records where child_id = $1', [childId]);
    check('teacher of the room CAN read that child\'s medical record', med.count === 1);

    const guardians = await attempt(
      `select g.full_name from cms_guardians g
       join cms_child_guardians cg on cg.guardian_id = g.id where cg.child_id = $1`, [childId]
    );
    check('teacher of the room CAN read that child\'s guardians (the pickup sheet)',
      guardians.count === 1);

    const upd = await attempt(
      `update cms_children set preferred_name = 'Teacher edit' where id = $1`, [childId]
    );
    check('teacher CANNOT edit a child\'s standing record', upd.ok && upd.count === 0);

    // ── phase 3: the insight card ─────────────────────────────────────────
    const profile = await attempt(
      'select likes, parent_notes from cms_child_profiles where child_id = $1', [childId]
    );
    check('teacher of the room CAN read that child\'s profile (the insight card)',
      profile.count === 1, `saw ${profile.count}`);

    const profileUpd = await attempt(
      `update cms_child_profiles set parent_notes = 'staff rewrite' where child_id = $1`, [childId]
    );
    check('teacher CANNOT rewrite the family\'s own words',
      profileUpd.ok && profileUpd.count === 0, profileUpd.error || `${profileUpd.count} rows`);

    const prev = await attempt('select name from cms_previous_schools where child_id = $1', [childId]);
    check('teacher of the room CAN read that child\'s schooling history', prev.count === 1);

    const enrol = await attempt('select id from cms_enrollments');
    check('teacher CANNOT see enrolments at all', enrol.count === 0, `saw ${enrol.count}`);

    const att = await attempt(
      `insert into cms_attendance (child_id, school_id, class_group_id, on_date, state, arrived_at)
       values ($1,$2,$3,current_date,'present','08:04')`,
      [childId, ids.schoolA, ids.sunrise]
    );
    check('teacher CAN take the register for their own room', att.ok, att.error);
  });

  await asUser(ids.teacher2, async () => {
    const kids = await attempt('select id from cms_children where id = $1', [childId]);
    check('teacher of the Meadow Room CANNOT read a Sunrise child', kids.count === 0,
      `saw ${kids.count}`);

    const allergies = await attempt('select id from cms_allergies where child_id = $1', [childId]);
    check('teacher of another room CANNOT read that child\'s allergies', allergies.count === 0);

    const med = await attempt('select id from cms_medical_records where child_id = $1', [childId]);
    check('teacher of another room CANNOT read that child\'s medical record', med.count === 0);

    const profile = await attempt('select id from cms_child_profiles where child_id = $1', [childId]);
    check('teacher of another room CANNOT read that child\'s profile', profile.count === 0,
      `saw ${profile.count}`);

    const prev = await attempt('select id from cms_previous_schools where child_id = $1', [childId]);
    check('teacher of another room CANNOT read that child\'s schooling history', prev.count === 0);

    const att = await attempt(
      `insert into cms_attendance (child_id, school_id, class_group_id, on_date, state)
       values ($1,$2,$3,current_date + 1,'present')`,
      [childId, ids.schoolA, ids.sunrise]
    );
    check('teacher of another room CANNOT mark that child present', !att.ok);
  });

  // ── 5. school admin ───────────────────────────────────────────────────────
  console.log('\nschool admin');
  await asUser(ids.schoolAdmin, async () => {
    const kids = await attempt('select id, school_id from cms_children where deleted_at is null');
    check('school admin sees every child in their school',
      kids.count === 1 && kids.rows[0].school_id === ids.schoolA, `saw ${kids.count}`);
    check('school admin does NOT see the other school\'s child',
      !kids.rows.some((r) => r.id === ids.quayChild));

    const profile = await attempt('select id from cms_child_profiles where child_id = $1', [childId]);
    check('school admin CAN read a profile in their own school', profile.count === 1);

    const otherProfile = await attempt(
      'select id from cms_child_profiles where child_id = $1', [ids.quayChild]
    );
    check('school admin CANNOT read the other school\'s profiles', otherProfile.count === 0);

    const enrol = await attempt(`update cms_enrollments set status = 'submitted', submitted_at = now() where id = $1`,
      [enrollmentId]);
    check('school admin can move an enrolment out of draft', enrol.ok && enrol.count === 1, enrol.error);
  });

  // ── 6. the submitted form is now evidence ─────────────────────────────────
  console.log('\nimmutability of a submitted form');
  await asUser(ids.parentA, async () => {
    const upd = await attempt(
      `update cms_enrollments set settling_notes = 'second thoughts' where id = $1`, [enrollmentId]
    );
    check('parent CANNOT edit an enrolment once it leaves draft', upd.ok && upd.count === 0,
      upd.error || `${upd.count} rows`);
    const read = await attempt('select status from cms_enrollments where id = $1', [enrollmentId]);
    check('parent can still READ their submitted enrolment',
      read.count === 1 && read.rows[0].status === 'submitted');
  });

  // ── 7. org member: aggregate across schools, no clinical detail ───────────
  console.log('\norg member (read-only across the group)');
  await asUser(ids.orgAdmin, async () => {
    const schools = await attempt('select id from cms_schools');
    check('org member sees every school in the group', schools.count === 2, `saw ${schools.count}`);

    const kids = await attempt('select id, school_id from cms_children where deleted_at is null');
    const bySchool = new Set(kids.rows.map((r) => r.school_id));
    check('org member sees the aggregate roll across both schools',
      kids.count === 2 && bySchool.size === 2, `saw ${kids.count} children in ${bySchool.size} schools`);

    const allergyCount = await attempt('select count(*)::int n from cms_allergies');
    check('org member sees the group-wide allergy flag count', allergyCount.rows[0].n === 1);

    const med = await attempt('select id from cms_medical_records');
    check('org member CANNOT read raw medical records', med.count === 0, `saw ${med.count}`);

    const upd = await attempt(`update cms_children set preferred_name = 'Org edit' where id = $1`, [childId]);
    check('org member CANNOT edit a child (read-only layer)', upd.ok && upd.count === 0);

    // ── phase 3: the org layer is BLIND to personality data ───────────────
    // Stricter than medical, deliberately: cms_child_profiles has no org read
    // clause at all. A group director must not be able to read a four-year-old's
    // temperament from head office.
    const profiles = await attempt('select id from cms_child_profiles');
    check('org member CANNOT read any child profile', profiles.count === 0, `saw ${profiles.count}`);

    const prev = await attempt('select id from cms_previous_schools');
    check('org member CANNOT read schooling history', prev.count === 0, `saw ${prev.count}`);

    const profileIns = await attempt(
      `insert into cms_child_profiles (child_id, school_id, parent_notes)
       values ($1,$2,'org planted')`, [childId, ids.schoolA]
    );
    check('org member CANNOT write a child profile', !profileIns.ok);
  });

  // ── 8. the public key ─────────────────────────────────────────────────────
  console.log('\nanonymous (the public anon key)');
  await asAnon(async () => {
    for (const table of [
      'cms_children', 'cms_guardians', 'cms_medical_records', 'cms_allergies',
      'cms_enrollments', 'cms_users', 'cms_memberships', 'cms_rate_limit_logs',
      'cms_child_profiles', 'cms_previous_schools',
    ]) {
      const r = await attempt(`select * from ${table}`);
      check(`anon reads nothing from ${table}`, !r.ok || r.count === 0,
        r.ok ? `saw ${r.count}` : '');
    }
    const ins = await attempt(
      `insert into cms_children (school_id, legal_name, preferred_name, date_of_birth)
       values ($1,'Anon','Anon','2020-01-01')`, [ids.schoolA]
    );
    check('anon CANNOT insert a child', !ins.ok);
  });

  // ── 9. service role ───────────────────────────────────────────────────────
  console.log('\nservice role (what the app actually uses)');
  await client.query('BEGIN');
  await client.query('SET LOCAL ROLE service_role');
  const svcKids = await attempt('select id from cms_children');
  const svcMed = await attempt('select id from cms_medical_records');
  await client.query('COMMIT');
  await client.query('RESET ROLE');
  check('service role sees every child', svcKids.count === 2, `saw ${svcKids.count}`);
  check('service role sees every medical record', svcMed.count === 1);
  await client.query('BEGIN');
  await client.query('SET LOCAL ROLE service_role');
  const svcProfiles = await attempt('select id from cms_child_profiles');
  const svcPrev = await attempt('select id from cms_previous_schools');
  await client.query('COMMIT');
  await client.query('RESET ROLE');
  check('service role sees every child profile', svcProfiles.count === 1, `saw ${svcProfiles.count}`);
  check('service role sees every previous setting', svcPrev.count === 1);

  // ── result ────────────────────────────────────────────────────────────────
  console.log('\n==================================');
  console.log(`${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    console.log('\nFAILED:');
    for (const f of failures) console.log(`  · ${f}`);
  }
  await client.end();
  process.exit(failures.length ? 1 : 0);
}

main().catch(async (e) => {
  console.error('\nHARNESS ERROR:', e);
  await client.end().catch(() => {});
  process.exit(1);
});
