-- ============================================================================
-- 331_cms_phase4_teacher_roster.sql — CMS PHASE 4
-- Aug 12, 2026. Lets a TEACHER type their own class in.
-- ============================================================================
--
-- WHAT THIS IS
--   Phases 2 and 3 built the hourglass top-down: a FAMILY enters the record and
--   the classroom reads it. That is the right default and it stays the default.
--   But it assumes a family account exists, and in a real Montessori room on day
--   one there is no such thing — there is a teacher, a printed list, and twenty
--   children who start on Monday. Phase 4 gives that teacher a way in.
--
-- ── THE AUTHORITY RULE (a deliberate change to a phase-2/3 principle) ───────
--   Phase 2 said flatly: "Teachers never write a child's standing record."
--   Phase 4 narrows that to:
--
--     A teacher may CREATE a child in a room they teach, and may EDIT a child in
--     a room they teach ONLY WHILE NO FAMILY ACCOUNT OWNS THE RECORD.
--
--   "Owns" is not "has a guardian row". A teacher who types in an emergency
--   contact creates a `cms_guardians` row and links it — that must not lock the
--   teacher out of the record they are still filling in. Ownership means a
--   guardian on this child is attached to an ACTIVE PARENT MEMBERSHIP: a real
--   person with a real login who can speak for the child. The moment that
--   exists, the teacher drops back to read-only and the parent's words win.
--   That is `cms_staff_entered_child_ids()` below, and it is the whole idea of
--   this migration expressed as one predicate.
--
--   What does NOT change:
--     · `cms_child_profiles` (the family's own words about who their child is)
--       stays parent-write-only. A teacher may not write it even for a child
--       they created — there is no family to speak for yet, and a staff-written
--       "about your child" would be staff opinion wearing a parent's voice.
--     · `cms_medical_records` stays out of a teacher's hands (conditions,
--       doctor, medication). Allergies were ALWAYS the safety exception and are
--       the thing a teacher genuinely has first-hand.
--     · `cms_enrollments` stays invisible to teachers. An application is office
--       business; a roster is not an application.
--     · Deleting a child stays a school_admin act.
--
-- SAFETY CONTRACT (identical to 329/330)
--   · PURELY ADDITIVE. Every object created or altered is `cms_`-prefixed. The
--     only ALTER is `add column if not exists` on cms_children. No policy from
--     329 or 330 is dropped or rewritten — the teacher policies below are NEW,
--     SEPARATE, PERMISSIVE policies, which Postgres ORs with the existing ones.
--     That is deliberate: a mistake here can only ever widen the teacher's own
--     narrow lane, never touch what a parent or an admin could already do.
--   · IDEMPOTENT. `create or replace function`, `add column if not exists`,
--     `drop policy if exists` before each create. Safe to re-run.
--   · TRANSACTIONAL. One BEGIN/COMMIT.
--   · REQUIRES 329 AND 330.
--
-- VERIFY block at the bottom.
-- ROLLBACK: migrations/331_cms_phase4_teacher_roster_ROLLBACK.sql
-- ============================================================================

begin;

-- ── the one column the roster needed ────────────────────────────────────────
-- The short line a teacher writes about a child on the roster page: "Naps after
-- lunch", "Older brother in Meadow". Deliberately NOT `cms_child_profiles`
-- (that is the family's voice) and NOT `cms_medical_records.emergency_note`
-- (that is clinical). It is a staff note, it says so, and it prints on the
-- class list.
alter table cms_children add column if not exists staff_note text;

-- ── the double-submit guard the import claims to have ──────────────────────
-- `lib/cms/db/queries.ts`'s `importRosterChildren` says re-pasting the same
-- list is a no-op — true for two SEQUENTIAL calls, but the check-then-insert
-- there is not atomic, so two CONCURRENT calls (a network retry racing the
-- original, a double-tap the disabled-button state didn't catch in time) can
-- both pass the "does this already exist" read before either write commits,
-- and the room ends up with two Amaras. 329 hit exactly this shape for
-- enrolment drafts (`idx_cms_enrollments_one_draft`) and fixed it with a
-- partial unique index rather than trusting application timing; this is the
-- same fix for the same reason. `queries.ts` upserts with
-- `ON CONFLICT ... DO NOTHING` against it, so a losing race is a silent skip,
-- not a constraint-violation 500.
create unique index if not exists idx_cms_children_room_name_dob
  on cms_children (class_group_id, preferred_name, date_of_birth)
  where deleted_at is null and class_group_id is not null;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================
-- Same idioms as 329: SECURITY DEFINER with a pinned search_path, because a
-- policy that reads the table it protects would recurse.

-- Schools where the caller holds an ACTIVE TEACHER membership. The insert scope
-- for the guardian rows a teacher types in as emergency contacts. Narrower than
-- cms_member_school_ids(), which also carries the org layer.
create or replace function cms_teacher_school_ids() returns setof uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select distinct m.school_id from cms_memberships m
  where m.user_id = cms_current_user_id() and m.is_active
    and m.role = 'teacher' and m.school_id is not null
$$;

-- Children whose record NO FAMILY ACCOUNT owns yet — the staff-entered ones.
--
-- 🚨 READ THE JOIN. It is `cms_memberships.role = 'parent'`, not merely "has a
-- guardian". A teacher's own typed-in emergency contacts are guardian rows with
-- no login behind them, and counting those as ownership would lock a teacher
-- out of a record the moment they filled in a phone number. What ends the
-- teacher's write access is a real parent ACCOUNT attached to the child.
create or replace function cms_staff_entered_child_ids() returns setof uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select c.id from cms_children c
  where c.deleted_at is null
    and not exists (
      select 1
      from cms_child_guardians cg
      join cms_memberships m on m.guardian_id = cg.guardian_id
      where cg.child_id = c.id and m.role = 'parent' and m.is_active
    )
$$;

-- The phase-4 write set: a child in one of MY rooms that no family owns.
-- Intersection, not union — both halves must hold.
create or replace function cms_teacher_writable_child_ids() returns setof uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select c.id from cms_children c
  where c.class_group_id in (select cms_teacher_class_ids())
    and c.deleted_at is null
    and c.id in (select cms_staff_entered_child_ids())
$$;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function
      cms_teacher_school_ids(), cms_staff_entered_child_ids(),
      cms_teacher_writable_child_ids()
      to authenticated';
  end if;
end $$;

-- ============================================================================
-- ROW LEVEL SECURITY — new permissive policies, nothing rewritten
-- ============================================================================
-- Every policy below is `TO authenticated` — never bare (migration 313's
-- lesson), and every one is additional to what 329/330 already granted.

-- ── cms_children ────────────────────────────────────────────────────────────
-- CREATE: into a room I actually teach, stamped as me, and with a school_id
-- that matches that room's school. The last clause is not paranoia: without it
-- a teacher could file a child under another school while naming their own
-- room, and every school-scoped read afterwards would disagree with every
-- room-scoped one.
drop policy if exists cms_children_teacher_insert on cms_children;
create policy cms_children_teacher_insert on cms_children
  for insert to authenticated
  with check (
    class_group_id in (select cms_teacher_class_ids())
    and created_by_user_id = cms_current_user_id()
    and school_id = (
      select cg.school_id from cms_class_groups cg where cg.id = class_group_id
    )
  );

-- EDIT: only while no family owns the record. The USING half decides which rows
-- a teacher may touch; the WITH CHECK half stops them moving a child into a
-- room they do not teach (or out of their own reach entirely).
drop policy if exists cms_children_teacher_write on cms_children;
create policy cms_children_teacher_write on cms_children
  for update to authenticated
  using (id in (select cms_teacher_writable_child_ids()))
  with check (
    class_group_id in (select cms_teacher_class_ids())
    and id in (select cms_teacher_writable_child_ids())
  );

-- ── cms_allergies ───────────────────────────────────────────────────────────
-- The safety exception grows a write half. A teacher who is told at the gate
-- that a child carries an EpiPen must be able to write it down TODAY, and for a
-- staff-entered child there is nobody else who can.
drop policy if exists cms_allergies_teacher_write on cms_allergies;
create policy cms_allergies_teacher_write on cms_allergies
  for all to authenticated
  using (child_id in (select cms_teacher_writable_child_ids()))
  with check (child_id in (select cms_teacher_writable_child_ids()));

-- ── cms_dietary_requirements ────────────────────────────────────────────────
drop policy if exists cms_dietary_teacher_write on cms_dietary_requirements;
create policy cms_dietary_teacher_write on cms_dietary_requirements
  for all to authenticated
  using (child_id in (select cms_teacher_writable_child_ids()))
  with check (child_id in (select cms_teacher_writable_child_ids()));

-- ── cms_guardians ───────────────────────────────────────────────────────────
-- INSERT is school-scoped, exactly like the parent insert policy above it: the
-- row on its own authorises nothing, and the LINK policy below is the real gate.
drop policy if exists cms_guardians_teacher_insert on cms_guardians;
create policy cms_guardians_teacher_insert on cms_guardians
  for insert to authenticated
  with check (school_id in (select cms_teacher_school_ids()));

-- UPDATE is child-scoped: the guardians of a staff-entered child in my room.
-- (Soft-delete is an UPDATE of deleted_at — there is deliberately no DELETE
-- policy on this table for anybody, 329 included.)
drop policy if exists cms_guardians_teacher_write on cms_guardians;
create policy cms_guardians_teacher_write on cms_guardians
  for update to authenticated
  using (
    id in (
      select cg.guardian_id from cms_child_guardians cg
      where cg.child_id in (select cms_teacher_writable_child_ids())
    )
  )
  with check (school_id in (select cms_teacher_school_ids()));

-- ── cms_child_guardians ─────────────────────────────────────────────────────
-- `for all` because the contacts list REPLACES: old links are deleted, new ones
-- inserted. The claim rule from 329 is untouched — this policy can only ever
-- reach a child in my own room that no family owns.
drop policy if exists cms_child_guardians_teacher_write on cms_child_guardians;
create policy cms_child_guardians_teacher_write on cms_child_guardians
  for all to authenticated
  using (child_id in (select cms_teacher_writable_child_ids()))
  with check (child_id in (select cms_teacher_writable_child_ids()));

-- ── cms_pickup_authorizations ───────────────────────────────────────────────
drop policy if exists cms_pickup_teacher_write on cms_pickup_authorizations;
create policy cms_pickup_teacher_write on cms_pickup_authorizations
  for all to authenticated
  using (child_id in (select cms_teacher_writable_child_ids()))
  with check (child_id in (select cms_teacher_writable_child_ids()));

commit;

-- ============================================================================
-- VERIFY (run separately)
-- ============================================================================
-- Expect the three helper functions to exist:
-- SELECT proname FROM pg_proc WHERE proname IN
--   ('cms_teacher_school_ids','cms_staff_entered_child_ids',
--    'cms_teacher_writable_child_ids') ORDER BY proname;
--
-- Expect six teacher policies:
-- SELECT polname, c.relname FROM pg_policy p
-- JOIN pg_class c ON c.oid = p.polrelid
-- WHERE polname LIKE 'cms_%teacher%' ORDER BY c.relname, polname;
--
-- Expect the staff_note column:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'cms_children' AND column_name = 'staff_note';
--
-- Expect the double-submit guard:
-- SELECT indexname FROM pg_indexes
-- WHERE tablename = 'cms_children' AND indexname = 'idx_cms_children_room_name_dob';
--
-- The real verification is scripts/cms/rls-test.mjs — run the WHOLE suite.
