-- ============================================================================
-- 332_cms_phase7_handshake.sql — CMS PHASE 7: THE HANDSHAKE
-- Aug 12, 2026. The office accepts an application, and the family walks into
-- Montree's existing parent stack.
-- ============================================================================
--
-- WHAT THIS IS
--   Montree already owns the whole parent relationship: invite codes, the
--   parent portal, encrypted teacher↔parent threads, weekly reports, photo
--   montages, appointments, and real Agora video/voice calls. CMS must NEVER
--   rebuild any of it. What CMS owns is the FRONT DOOR — the application a
--   family fills in and the moment the office says yes.
--
--   This migration adds the four columns that let that "yes" become a real
--   Montree child with a real invite code, and nothing else. There is no new
--   table, no new policy, and no new comms machinery, on purpose.
--
-- ── THE SIX COLUMNS ─────────────────────────────────────────────────────────
--   cms_schools.montree_school_id         which Montree school this CMS school IS
--   cms_class_groups.montree_classroom_id which Montree classroom this room IS
--   cms_children.montree_parent_invite_code the code that was minted for the family
--   cms_children.montree_linked_at         WHEN the handshake happened (audit)
--   cms_guardians.montree_parent_invite_code the primary guardian's own copy of
--                                          the code — the column the family's
--                                          own doorway page reads
--   cms_enrollments.decided_by_user_id     who in the office said yes (or no)
--
--   The child-side seam already exists: `cms_children.montree_child_id` shipped
--   in migration 330 and has been NULL for every row since. Phase 7 is the
--   thing that finally sets it.
--
-- 🚨 NO HARD FOREIGN KEYS TO MONTREE, DELIBERATELY.
--   `montree_school_id`, `montree_classroom_id` and 330's `montree_child_id`
--   are bare uuids with NO references clause. CMS must install and run on a
--   database that has no montree_* tables at all — that is what demo mode and
--   the standalone-CMS story are worth — and a real FK would make this file
--   un-runnable there. The integrity those FKs would buy is bought instead in
--   the ACCEPT path, which re-reads the Montree classroom and proves it belongs
--   to the linked Montree school before it writes a single row (the Jul-3
--   cross-tenant rule: existence is not ownership).
--
-- 🚨 LINKING IS NOT A SELF-SERVICE ACT.
--   A CMS school_admin is not a Montree admin and has no legitimate way to
--   browse Montree's schools, so there is no linking UI. A link is established
--   by a trusted operator running SQL (see APPLY note at the bottom), and the
--   office page shows the resulting status READ-ONLY. The trigger guard below
--   is what makes that sentence true rather than merely intended.
--
-- ── WHERE ENFORCEMENT LIVES (read this before "fixing" anything) ────────────
--   RLS is row-level. It cannot say "this role may update these four columns
--   but not those two", and 329's `cms_children_write` / `cms_schools_admin_write`
--   policies already let a parent edit their own child's row and a school_admin
--   edit their own school's row. Left alone, a parent posting straight at
--   PostgREST could stamp any uuid they liked into `montree_child_id` and read
--   another family's Montree child through the guru seam.
--
--   So the link columns are defended THREE times, and all three are real:
--     1. THE API LAYER. Nothing in app/api/cms/** ever accepts these columns
--        from a request body. The accept route derives every one of them from
--        the session's school and from rows it read itself.
--     2. THIS TRIGGER. `cms_guard_montree_link()` below REFUSES any insert or
--        update of a link column made by the `authenticated` or `anon` role —
--        i.e. by anyone holding a user token, whatever their CMS role. Only a
--        trusted server role (service_role, or the operator's own superuser
--        session) may set them. This is column-level enforcement done the only
--        way Postgres offers it.
--     3. RLS, unchanged. The row-level rules from 329/330/331 still decide who
--        may touch the ROW at all; this trigger narrows WHICH COLUMNS of a row
--        they were already allowed to touch.
--   `scripts/cms/rls-test.mjs` asserts all three: that a parent and a teacher
--   are refused, that the existing update policies still work for everything
--   else (no regression), and that the service role can still write the link.
--
-- SAFETY CONTRACT (identical to 329/330/331)
--   · PURELY ADDITIVE. Every object is `cms_`-prefixed. The only ALTERs are
--     `add column if not exists`. NO policy from 329, 330 or 331 is dropped,
--     rewritten or widened — this file creates no policy at all.
--   · IDEMPOTENT. `add column if not exists`, `create or replace function`,
--     `drop trigger if exists` before each create, `create index if not exists`.
--   · TRANSACTIONAL. One BEGIN/COMMIT.
--   · REQUIRES 329, 330 AND 331.
--   · Runs on a database with NO montree_* tables. Nothing here names one.
--
-- VERIFY block at the bottom.
-- ROLLBACK: migrations/332_cms_phase7_handshake_ROLLBACK.sql
-- ============================================================================

begin;

-- ============================================================================
-- THE LINK COLUMNS
-- ============================================================================

-- ── cms_schools.montree_school_id ───────────────────────────────────────────
-- The CMS school and the Montree school are the SAME school, seen from two
-- products. Nullable because most CMS schools will never be linked (CMS is
-- usable standalone, and that is a feature). Unique so two CMS schools can
-- never both claim one Montree school and quietly fan one office's acceptances
-- into another school's rooms.
alter table cms_schools add column if not exists montree_school_id uuid;

create unique index if not exists idx_cms_schools_montree_school
  on cms_schools (montree_school_id)
  where montree_school_id is not null;

-- ── cms_class_groups.montree_classroom_id ───────────────────────────────────
-- The room. Same reasoning, same shape. A room link ALONE is not enough to
-- activate anything: the accept path requires the school link too, and then
-- re-verifies that this Montree classroom really belongs to that Montree
-- school before creating a child in it.
alter table cms_class_groups add column if not exists montree_classroom_id uuid;

create unique index if not exists idx_cms_class_groups_montree_classroom
  on cms_class_groups (montree_classroom_id)
  where montree_classroom_id is not null;

-- ── cms_children.montree_parent_invite_code ─────────────────────────────────
-- The code that was minted for this family, stored so the office can read it
-- back out FOREVER — on the enrolment detail page, over the phone, on a printed
-- slip six weeks later. Montree's own `montree_parent_invites` row remains the
-- authority (it holds is_active, expires_at, used_at); this is a cache of the
-- string, and NULL here with a linked child means "invite pending — retry",
-- which is exactly the state the office UI surfaces.
alter table cms_children add column if not exists montree_parent_invite_code text;

-- ── cms_children.montree_linked_at ──────────────────────────────────────────
-- WHEN the handshake ran. `montree_child_id` says a child was routed into
-- Montree; this says when, which is the only thing that can answer "did this
-- family get their code before term started, or three weeks into it?" and the
-- only marker that separates a child linked by the accept path from one whose
-- link an operator repaired by hand. Set ONCE, on the acceptance that created
-- the Montree child; a retry that only mints the invite leaves it alone.
alter table cms_children add column if not exists montree_linked_at timestamptz;

-- ── cms_guardians.montree_parent_invite_code ────────────────────────────────
-- The PRIMARY guardian's own copy of the code, written by the same acceptance
-- that writes the child's.
--
-- 🚨 THIS IS A SECOND HOME FOR THE SAME STRING, AND THAT IS DELIBERATE — but
-- the two homes are not equals and must not be confused:
--   · `cms_children.montree_parent_invite_code` is AUTHORITATIVE inside CMS.
--     Montree mints one code PER CHILD, so a guardian with two children at the
--     school holds two codes and one text column on their row cannot express
--     that. The office reads this one.
--   · `cms_guardians.montree_parent_invite_code` is the FAMILY-SIDE copy: the
--     code that belongs to the person, on the row that person's session already
--     owns, which is what the parent doorway reads (and what a support call
--     asks for by guardian name, not by child). With two children it holds the
--     most recently minted one; the doorway still lists per-child codes from
--     cms_children, and uses this only as the fallback.
-- Neither is the authority in the absolute sense: `montree_parent_invites` is,
-- because it alone knows is_active / expires_at / used_at. Both of these are
-- caches of a string, and both are guarded below.
alter table cms_guardians add column if not exists montree_parent_invite_code text;

-- The office list asks "which of these children are already linked?" once per
-- page, over one school. 330 added the column but no index; the handshake is
-- the first thing that reads it in bulk.
create index if not exists idx_cms_children_montree_link
  on cms_children (montree_child_id)
  where montree_child_id is not null;

-- ── cms_enrollments.decided_by_user_id ──────────────────────────────────────
-- `decided_at` shipped in 329 with no companion for WHO. An acceptance creates
-- a child in another product and mints a credential for a family; "accepted at
-- 14:02" without a name is not an audit trail. ON DELETE SET NULL for the same
-- reason `created_by_user_id` has it: a staff member leaving must not make an
-- enrolment undeletable, and the decision itself survives them.
alter table cms_enrollments
  add column if not exists decided_by_user_id uuid references cms_users(id) on delete set null;

-- ============================================================================
-- THE COLUMN GUARD — the only new behaviour in this file
-- ============================================================================
-- Refuse any attempt by a TOKEN-BEARING role (`authenticated`, `anon`) to set
-- or change a Montree link column. Trusted server roles pass straight through:
-- the CMS app talks to Postgres as `service_role` (house pattern — see the
-- header of lib/cms/db/queries.ts), and an operator running the linking SQL in
-- the Supabase editor is `postgres`.
--
-- 🚨 WHY A TRIGGER AND NOT A POLICY. A policy answers "may you touch this
-- ROW?". The question here is "may you touch this COLUMN of a row you are
-- already allowed to touch?", and Postgres answers that with column privileges
-- (which PostgREST's single `authenticated` role cannot express per-tenant) or
-- with a trigger. A trigger it is. It raises rather than silently discarding
-- the value: a write that looks like it worked and did not is a worse bug than
-- an error, and no legitimate caller ever hits this path.
--
-- 🚨 IT IS `is distinct from`, NOT `<>`. NULL <> NULL is NULL, which is not
-- true, so a plain inequality would wave through every write that leaves a NULL
-- link NULL — and also every write that sets one FROM null, which is precisely
-- the attack. `is distinct from` is null-aware and catches both directions.
--
-- 🚨 SECURITY INVOKER, NOT DEFINER — and that is the whole mechanism, not a
-- style choice. Every other helper in 329/331 is SECURITY DEFINER because it
-- reads a table a policy protects. This one reads nothing; what it needs is the
-- CALLER'S identity, and inside a SECURITY DEFINER body `current_user` is the
-- function's OWNER, so the check would compare `cmsapp` to `authenticated`,
-- never match, and wave every attacker through while looking correct. Under
-- SECURITY INVOKER, `current_user` is what `SET ROLE` made it — which is
-- exactly what PostgREST hands us. (Caught by the rls-test on first run.)
create or replace function cms_guard_montree_link() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare
  changed boolean := false;
begin
  -- Trusted roles only ever reach here as themselves. Anything that is not a
  -- browser-facing PostgREST role is allowed through untouched.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_table_name = 'cms_children' then
    if tg_op = 'INSERT' then
      changed := new.montree_child_id is not null
              or new.montree_parent_invite_code is not null
              or new.montree_linked_at is not null;
    else
      changed := new.montree_child_id is distinct from old.montree_child_id
              or new.montree_parent_invite_code is distinct from old.montree_parent_invite_code
              or new.montree_linked_at is distinct from old.montree_linked_at;
    end if;
  elsif tg_table_name = 'cms_guardians' then
    -- The family-side copy of the code is a CREDENTIAL, not a profile field.
    -- A parent may edit their own guardian row (329's cms_guardians_write) and
    -- a teacher may edit an emergency contact (331) — neither may hand
    -- themselves a code, or change one, on a row they otherwise own.
    if tg_op = 'INSERT' then
      changed := new.montree_parent_invite_code is not null;
    else
      changed := new.montree_parent_invite_code is distinct from old.montree_parent_invite_code;
    end if;
  elsif tg_table_name = 'cms_schools' then
    if tg_op = 'INSERT' then
      changed := new.montree_school_id is not null;
    else
      changed := new.montree_school_id is distinct from old.montree_school_id;
    end if;
  elsif tg_table_name = 'cms_class_groups' then
    if tg_op = 'INSERT' then
      changed := new.montree_classroom_id is not null;
    else
      changed := new.montree_classroom_id is distinct from old.montree_classroom_id;
    end if;
  end if;

  if changed then
    raise exception
      'cms: Montree link columns are not writable by % — the handshake sets them server-side (migration 332)',
      current_user
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_cms_children_guard_link on cms_children;
create trigger trg_cms_children_guard_link
  before insert or update on cms_children
  for each row execute function cms_guard_montree_link();

drop trigger if exists trg_cms_guardians_guard_link on cms_guardians;
create trigger trg_cms_guardians_guard_link
  before insert or update on cms_guardians
  for each row execute function cms_guard_montree_link();

drop trigger if exists trg_cms_schools_guard_link on cms_schools;
create trigger trg_cms_schools_guard_link
  before insert or update on cms_schools
  for each row execute function cms_guard_montree_link();

drop trigger if exists trg_cms_class_groups_guard_link on cms_class_groups;
create trigger trg_cms_class_groups_guard_link
  before insert or update on cms_class_groups
  for each row execute function cms_guard_montree_link();

commit;

-- ============================================================================
-- VERIFY (run separately)
-- ============================================================================
-- Expect six columns:
-- SELECT table_name, column_name FROM information_schema.columns
-- WHERE (table_name, column_name) IN (
--   ('cms_schools','montree_school_id'),
--   ('cms_class_groups','montree_classroom_id'),
--   ('cms_children','montree_parent_invite_code'),
--   ('cms_children','montree_linked_at'),
--   ('cms_guardians','montree_parent_invite_code'),
--   ('cms_enrollments','decided_by_user_id'))
-- ORDER BY table_name;
--
-- Expect three indexes:
-- SELECT indexname FROM pg_indexes WHERE indexname IN
--   ('idx_cms_schools_montree_school','idx_cms_class_groups_montree_classroom',
--    'idx_cms_children_montree_link') ORDER BY indexname;
--
-- Expect four triggers + one function:
-- SELECT tgname FROM pg_trigger WHERE tgname LIKE 'trg_cms_%_guard_link';
-- SELECT proname FROM pg_proc WHERE proname = 'cms_guard_montree_link';
--
-- Expect ZERO new policies (this file creates none):
-- SELECT count(*) FROM pg_policy WHERE polname LIKE 'cms_%handshake%';  -- 0
--
-- The real verification is scripts/cms/rls-test.mjs — run the WHOLE suite.
--
-- ============================================================================
-- LINKING A SCHOOL AND ITS ROOMS (operator only — NOT a product feature)
-- ============================================================================
-- Run as postgres/supabase_admin in the SQL editor. Both statements are
-- idempotent and reversible (set the column back to NULL to unlink).
--
--   UPDATE cms_schools
--      SET montree_school_id = '<montree_schools.id>'
--    WHERE id = '<cms_schools.id>';
--
--   UPDATE cms_class_groups
--      SET montree_classroom_id = '<montree_classrooms.id>'
--    WHERE id = '<cms_class_groups.id>'
--      AND school_id = '<cms_schools.id>';
--
-- The montree classroom MUST belong to the montree school named above. The
-- accept path re-checks this on every acceptance and refuses to write if it
-- does not hold, so a mistyped uuid costs an error message, never a child in a
-- stranger's classroom.
-- ============================================================================
