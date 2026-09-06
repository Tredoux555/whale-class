# Security fixes — 7 September 2026

**Read this over coffee. Nothing here has touched production.**

Everything below is code and SQL sitting on the branch `ap/security`. Nothing is
deployed, no database has been changed, and no migration has been run. Each fix
is its own commit so you can take some and drop others.

There are **seven** items. Two need something from you before they can go live
(items **B** and **A**). The rest are safe to deploy as-is.

---

## The one-minute version

| | What was wrong | How bad | You must do |
|---|---|---|---|
| **A** | Anyone on the internet could read and edit every child, parent and teacher record | 🔴 Critical | **Run SQL 350** |
| **E** | A teacher could upload a file that runs code on montree.xyz | 🔴 Critical | Nothing |
| **B** | Super-admin login tokens were signed with your password | 🟠 High | **Add a Railway variable** |
| **D** | Any teacher could delete classrooms, deactivate colleagues, change school settings | 🟠 High | Nothing |
| **C** | One button rewrote curriculum text for every school on the platform | 🟠 High | Nothing |
| **F** | A stolen phone stayed logged in for 10 years, with no way to stop it | 🟡 Medium | **Run SQL 351** |
| **G** | Voice assistant minted a 10-year admin token every time it spoke | 🟢 Low | Nothing |

**Your total homework: add one Railway variable, run two SQL scripts.** Both
scripts start with a read-only "show me what's there" query so you can look
before you change anything.

---

## Deploy order (this matters)

1. **Add `SUPER_ADMIN_JWT_SECRET` in Railway** (item B). Do this *first* — if
   you deploy the code without it, you cannot log into the super-admin console.
2. **Run SQL 350** (item A). Closes the big one. Independent of the deploy.
3. **Deploy the branch.**
4. **Run SQL 351** (item F). Safe in either order relative to the deploy — the
   code treats "column not there yet" as "nothing revoked" and carries on.

---

# A. Anyone could read every child's record

🔴 **Critical.** Commit `ab704fa`. **Action: run SQL 350.**

### What could happen

Back in the early days a file called `096_rls_policies.sql` switched on the
database's row-level security for the seven tables that hold your people —
schools, classrooms, teachers, children, parents, parent-child links and
invites. Then, on each table, it added a rule that was meant to say "only our
own server may touch this". What it actually said, in database terms, was
**"anyone may read and write every row."** The file's own comment at the bottom
says "service role only"; the SQL never said that. Security was switched on and
then waived for the entire internet in the same breath.

That would be survivable if nobody could reach the database. They can. Montree's
public website ships a Supabase key in its JavaScript — that is normal and by
design, it is meant to be a *public* key whose power is limited by exactly the
rules that were waived here. Anyone could open montree.xyz, read that key out of
the page source in about thirty seconds, and then ask the database directly for
every child in every school: names, dates of birth, classroom, parent contact
details. The same key could **change or delete** those rows too.

To be plain: this is the one that would have been a notifiable data breach. Every
child in every school you have onboarded. I found no evidence in the code that
anyone did this — but there is no way to prove from here that nobody did.

### What changes for teachers and parents

Nothing. Not a single thing. Every part of the app talks to the database through
our own server using a different, privileged key that is unaffected by these
rules. I checked every place the app touches these seven tables — all of it goes
through our API. Nothing in the browser reads them directly.

### Risk of the fix itself

Very low. The change *removes* permissions rather than adding any. The worst case
is that some path I did not find was relying on public access and starts
returning "not found" — and the fix is reversible in one line if so. The script
prints exactly what it is about to remove before it removes it.

### What you must do

Open Supabase → SQL Editor. **Run STEP 1 on its own first** and read the result:
you should see about seven rows, each with `roles = {public}` and
`using_expression = true`. Those are the holes. Then run STEP 2, then STEP 3 to
confirm you now see `policy_count = 0` and `rls_enabled = true` on all seven.

**The full SQL is at the end of this document, verbatim.**

---

# E. A teacher could upload a file that runs code on montree.xyz

🔴 **Critical.** Commit `0a1c473`. **Action: none — just deploy.**

### What could happen

When a photo or video is uploaded, the browser tells us what kind of file it is,
and we wrote that label down and trusted it forever after. When the file is
served back out through montree.xyz, we handed the browser that same label.

We do check photos are really JPEGs. But that check only runs when the upload is
labelled a *photo*. Anyone uploading with the label *video* or *audio* skipped it
entirely — and could store a file claiming to be a web page. Requesting it back
from `montree.xyz/api/montree/media/proxy/...` made the browser treat it as a web
page **belonging to montree.xyz**.

That is the dangerous part. A page running on our own address is trusted by the
browser as if we wrote it. It can quietly do anything the person viewing it can
do: read their whole school, pull every child's records, change settings, send
messages — all invisibly, while they look at what seems to be a broken image. If
a principal opened it, the attacker got the principal's reach. Combined with item
F (sessions that lasted ten years), that access did not expire.

The same trick worked with an SVG image file, which most people think of as a
harmless picture but which can contain a program.

### What changes for teachers and parents

Nothing they will notice. Photos, videos, audio and PDFs all work exactly as
before. We now keep a list of file types allowed to display in the page; anything
not on that list still downloads, it just cannot *run*. Nothing existing breaks —
an unusual file that somebody stored in the past still comes back, it simply
arrives as a download.

SVG is deliberately not on the allowed list. Nothing in Montree serves SVGs this
way, so nobody loses anything.

### Risk of the fix itself

Low. The realistic failure would be a legitimate file type I forgot to allow —
which shows up as "this image downloads instead of displaying", is obvious, and
is a one-line addition. I checked what actually lives in these buckets (PNG, PDF,
MP3, MP4, JPEG) and allowed all of it.

I applied the same fix to the two sibling file-servers (Lens and Potato), which
had the same weakness.

---

# B. Super-admin tokens were signed with your password

🟠 **High.** Commit `7187681`. **⚠️ Action required: add a Railway variable BEFORE deploying.**

### What could happen

When you log into the super-admin console, the server hands your browser a signed
pass. The signature is what makes it unforgeable, and it needs a long random
secret. A previous fix introduced a proper variable for that, `SUPER_ADMIN_JWT_SECRET`,
but left a fallback: *if that variable isn't set, use `SUPER_ADMIN_PASSWORD`
instead.* The variable was never added in Railway, so the fallback was what
production actually used — your **login password** was the signing key.

Why that matters: a password is short and memorable, and signatures can be
attacked *offline*. If anyone ever got hold of one of your super-admin passes —
from a log, a screenshot, a browser extension, a network capture — they could
take it away and try billions of guesses per second on their own machine. No rate
limit, no lockout, nothing for us to notice. When they hit the right one they get
two things at once: the ability to **forge super-admin passes for the whole
platform**, and **your actual password**.

The last-resort fallback was worse still: `ADMIN_SECRET` also signs ordinary
teacher logins, so a leak in either system would have compromised the other.

### What changes for teachers and parents

Nothing. This affects only the platform console that you use.

### Risk of the fix itself

**This one can lock you out, which is deliberate.** The fallback is gone. If
`SUPER_ADMIN_JWT_SECRET` is missing, too short, or set to the same value as your
password, super-admin login refuses to work and the server log says exactly which
variable to fix. I chose that over quietly carrying on insecurely — a silent
fallback is how this survived a previous audit.

Teachers, principals and parents are untouched either way.

### What you must do — before deploying

1. Generate a secret. On your Mac's terminal: `openssl rand -base64 48`
2. Railway → your Montree service → **Variables** → add
   `SUPER_ADMIN_JWT_SECRET` = that value.
3. It must be **at least 32 characters** and **different** from
   `SUPER_ADMIN_PASSWORD` and `ADMIN_SECRET`. The code refuses all three
   mistakes.
4. *Then* deploy.

You will be signed out of the super-admin console once (your existing pass was
signed with the old key). Log in again with the same password as always — your
password does not change.

---

# D. Any teacher could run the principal's controls

🟠 **High.** Commit `a7c06cf`. **Action: none — just deploy.**

### What could happen

Every admin endpoint checked "is this a valid login for this school?" — and then
seventeen of them never checked **which kind** of user it was. A perfectly
ordinary teacher's login was accepted by endpoints that:

- delete classrooms and delete children
- deactivate other teachers and reassign their classrooms
- rewrite school settings
- read school-wide analytics and every classroom's roster
- bulk-import and overwrite curricula and student lists
- read and rewrite **your private Astra conversation thread**

No hacking required. Any teacher at any of your schools already has a real login;
they only needed to know the web address. A disgruntled teacher on their last
day, or anyone who got hold of a teacher's phone, could have deleted a school's
children.

You had already fixed exactly this on the teacher-management endpoint back in
August. The other seventeen were missed.

### What changes for teachers and parents

Nothing. I traced every place in the app that calls these seventeen endpoints:
all of them are the principal cockpit at `/montree/admin`, the super-admin
surface, or Astra passing along the principal's own login. **No teacher-facing
screen calls any of them.** Teachers see no change.

Two deliberate details:

- **Org directors keep working.** When a director enters one of their schools
  they are given a principal-level pass, so they pass this check like any
  principal.
- **A principal who steps into a classroom** is holding a *teacher* pass at that
  moment, so they will be refused by these endpoints until they step back out.
  That is intentional — while in a classroom you are acting as a teacher. The
  "back to admin" button is untouched and works exactly as before.

### Risk of the fix itself

Low-to-moderate, and the risk is a *false refusal*, never a false allow. If some
screen I did not find calls one of these as a teacher, that screen shows a
permission error. It would be obvious and is a one-line exception. I searched the
whole codebase for callers and found none, and the full test suite passes.

Seventeen routes: `activity`, `astra-thread`, `backfill-curriculum`,
`backfill-guides`, `classrooms`, `classrooms/[id]`, `import`, `import-students`,
`overview`, `reports`, `reseed-curriculum`, `settings`, `students`,
`students/search`, `teachers/[id]`, `teachers/[id]/classrooms`, `today`.

---

# C. One button rewrote every school's curriculum

🟠 **High.** Commit `f8a19e0`. **Action: none — just deploy.**

### What could happen

There is a maintenance endpoint that fills in missing teaching guides. You can
point it at one classroom, or say "do all of them". The one-classroom version
correctly checked the classroom belongs to your school. The "all" version applied
**no filter at all** — not by classroom, not by school. It fetched every
curriculum row in the entire database and overwrote seven columns on each one:
the quick guide, presentation steps, control of error, direct aims, materials,
parent description and why-it-matters.

One request from any logged-in user would have rewritten the curriculum text of
every classroom in **every school on the platform**, replacing any wording a
teacher had customised with the stock text. It then re-ran translations across
all of them too.

This was almost certainly never triggered maliciously — it reads like a
maintenance shortcut that nobody revisited. But it was one URL away from a
platform-wide data-loss event, and it required no special permissions.

### What changes for teachers and parents

Nothing. "All" now means "all the classrooms in *your* school", which is what
anyone pressing it actually wanted — it is used during principal setup. A genuine
platform-wide run is still possible, but only for you, and only by explicitly
adding `&scope=platform` with super-admin credentials.

### Risk of the fix itself

Very low. It narrows what a query touches. I checked the two sibling endpoints
(`backfill-curriculum`, `reseed-curriculum`) — both already scoped correctly;
this was the only one affected.

---

# F. A stolen phone stayed logged in for ten years

🟡 **Medium.** Commit `e6ab86a`. **Action: run SQL 351.**

### What could happen

Montree logins last 3650 days — about ten years. That is a deliberate decision
you made and wrote down, for a good reason: a teacher on their own classroom
device must never be silently logged out mid-class, because most will not have
kept their login code and a lockout during a lesson is awful.

The problem was not the length. It was that **there was no way to end a session
at all.** "Log out" only clears the login on the device that pressed it. If that
login had ever been copied elsewhere — a stolen phone, a sold laptop, a login
code shared with someone who has since left the school — it kept working, and
nothing could stop it. The only lever available was changing the master key,
which signs out **every teacher, principal and parent in every school at once**.

So: no way to say "this one person's logins are cancelled". That is the gap.

### What changes for teachers and parents

Nothing changes by itself. Two things become *possible*:

- **"Sign out of all devices"** — a new endpoint that ends every session for the
  account that asks, on every device, immediately. Nobody else is affected. (The
  server side is built; there is no button in the UI yet — say the word and I'll
  add one.)
- **Signing someone else out** — for a lost phone or a departed staff member, you
  can do it directly in the database. The exact SQL is in the migration file.

I also added **sliding refresh**: every time someone opens the app, their session
is quietly renewed. This matters for the next paragraph.

### About shortening the ten-year login — a decision for you

The audit recommended cutting sessions to 30 days. **I did not do that**, because
your reasoning for the long session is sound and cutting it unattended is exactly
the mid-class lockout you were guarding against — a school holiday easily exceeds
30 days of nobody opening the app.

What I did instead removes the danger behind that recommendation. Sessions can
now be revoked, and with sliding refresh a device that gets *used* never expires
regardless of the setting. That changes the meaning of the number from *"how long
until a teacher is locked out"* to *"how long an unused device stays valid"* —
which is the number worth tuning.

If you want to shorten it, it is one Railway variable: `MONTREE_JWT_TTL_DAYS`.
I'd suggest **180** rather than 30 — it survives a long summer holiday while
cutting a stolen device's useful life from ten years to six months. Your call,
and it needs no code change.

### Risk of the fix itself

Low, and deliberately designed to fail safe. The check adds one small database
lookup per person per minute (cached), and **fails open**: if the database
hiccups, everyone stays logged in rather than a classroom being locked out
mid-lesson. That is the same rule your abuse-lock already follows. It also works
fine before the migration is run — a missing column reads as "nothing revoked" —
so the deploy and the SQL can happen in either order.

One deliberate exclusion: temporary 8-hour passes (a director entering a school,
a principal entering a classroom) are **not** renewed, so a borrowed seat can
never quietly become permanent.

**The full SQL is at the end of this document, verbatim.**

---

# G. The voice assistant minted a ten-year admin pass every time it spoke

🟢 **Low.** Commit `a7a00f7`. **Action: none.**

### What could happen

When Astra answers by voice, the server creates a principal-level pass so her
tools can look things up. The comment in the code says "short-lived". It was not:
the call forgot to set a lifetime, so it inherited the ten-year default. Every
voice turn was minting a full-power principal credential good until 2036.

That pass never leaves the server, so this is tidying rather than an open door —
but the entire justification for it is "it stays in-process", and a credential
whose safety rests on never leaking should be worthless if it ever does. It is
now capped at 120 seconds.

While I was there I checked that endpoint's own authentication — it is properly
signed and compared safely. No problem there.

### What changes / risk

Nothing changes. Risk is minimal: 120 seconds comfortably covers a voice turn.

---

# What I could not check

Two honest caveats:

1. **I could not read the audit documents.** The files you pointed me at
   (`docs/audits/2026-09-06-code-audit/*`) are not in the repository — they were
   never committed, so they exist only on your machine. I worked from the list of
   items in your brief and **re-verified every one of them against the current
   code myself**. All seven were real and I have described what I actually found,
   not what the audit said. If the audit flagged anything beyond these, I have
   not seen it.

2. **I did a broad sweep for other unauthenticated endpoints and found nothing I
   could confirm.** The sweep produced ~80 candidates, but every one I spot-checked
   turned out to be properly protected by a helper my search did not recognise. I
   have deliberately not listed speculative findings. A systematic
   auth-coverage review is worth doing properly as its own piece of work.

Also worth a future look, noticed in passing but not changed: `verifySuperAdminAuth`
still accepts a plain password header on every super-admin request, and that path
is not rate-limited the way the login route is.

---

# Verification

- Full test suite: **1376 tests across 79 files, all passing** (was 1298 across 72
  before these changes — 78 new tests, no regressions).
- ESLint: clean on every changed file.
- TypeScript: **zero new errors** (62 pre-existing errors in the scoped check,
  unchanged — those belong to the separate types cleanup).
- Every fix has a test that **fails before it and passes after** — I verified each
  one by reverting the fix and re-running.

---
---

# THE SQL

Two scripts. Run them in the Supabase SQL Editor. Both begin with a read-only
query so you can see the current state before changing anything.

## SQL 350 — close the public data hole (item A)

`migrations/350_rls_lockdown_pii.sql`

```sql
-- ═════════════════════════════════════════════════════════════════════════════
-- STEP 1 — DRY RUN.  Run this SELECT **first**, on its own, and read the result.
-- ═════════════════════════════════════════════════════════════════════════════
--
-- It lists the offending policies. Expect roughly seven rows, each with
-- roles = {public} and qual = true. Those are exactly the rows STEP 2 removes.
--
-- If this returns ZERO rows, the hole is already closed and you can stop here.
-- If it returns policies you do NOT recognise, stop and ask before running STEP 2.

SELECT
  tablename,
  policyname,
  roles,
  cmd,
  qual        AS using_expression,
  with_check  AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'montree_schools',
    'montree_classrooms',
    'montree_teachers',
    'montree_children',
    'montree_parents',
    'montree_parent_children',
    'montree_parent_invites'
  )
ORDER BY tablename, policyname;


-- ═════════════════════════════════════════════════════════════════════════════
-- STEP 2 — THE FIX.  Run this only after STEP 1's dry run looks as described.
-- ═════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 2a. Drop the permissive policies from 096_rls_policies.sql ───────────────
DROP POLICY IF EXISTS "schools_service_role"         ON montree_schools;
DROP POLICY IF EXISTS "classrooms_service_role"      ON montree_classrooms;
DROP POLICY IF EXISTS "teachers_service_role"        ON montree_teachers;
DROP POLICY IF EXISTS "children_service_role"        ON montree_children;
DROP POLICY IF EXISTS "parents_service_role"         ON montree_parents;
DROP POLICY IF EXISTS "parent_children_service_role" ON montree_parent_children;
DROP POLICY IF EXISTS "invites_service_role"         ON montree_parent_invites;

-- Also drop the older names 096 itself dropped, in case an environment still
-- carries them from an even earlier run.
DROP POLICY IF EXISTS "schools_all"         ON montree_schools;
DROP POLICY IF EXISTS "classrooms_all"      ON montree_classrooms;
DROP POLICY IF EXISTS "teachers_all"        ON montree_teachers;
DROP POLICY IF EXISTS "children_all"        ON montree_children;
DROP POLICY IF EXISTS "parents_all"         ON montree_parents;
DROP POLICY IF EXISTS "parent_children_all" ON montree_parent_children;
DROP POLICY IF EXISTS "invites_all"         ON montree_parent_invites;

-- ── 2b. Re-assert that RLS is ON (deny-all now that no policy remains) ───────
-- Deliberately NOT "FORCE ROW LEVEL SECURITY": FORCE would also subject the
-- table OWNER (postgres) to these policies, which would break Supabase's own
-- dashboard and maintenance paths. Plain ENABLE is what we want — it applies to
-- anon/authenticated and is bypassed by the service role.
ALTER TABLE montree_schools         ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_classrooms      ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_teachers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_children        ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_parents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_parent_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_parent_invites  ENABLE ROW LEVEL SECURITY;

-- ── 2c. Belt and braces: take the grants away too ────────────────────────────
-- RLS with no policies is already deny-all. Revoking the underlying privileges
-- means that if someone later adds a well-meaning policy to one of these tables,
-- anon/authenticated STILL cannot reach it without a second, deliberate GRANT.
REVOKE ALL ON montree_schools         FROM anon, authenticated;
REVOKE ALL ON montree_classrooms      FROM anon, authenticated;
REVOKE ALL ON montree_teachers        FROM anon, authenticated;
REVOKE ALL ON montree_children        FROM anon, authenticated;
REVOKE ALL ON montree_parents         FROM anon, authenticated;
REVOKE ALL ON montree_parent_children FROM anon, authenticated;
REVOKE ALL ON montree_parent_invites  FROM anon, authenticated;

COMMIT;


-- ═════════════════════════════════════════════════════════════════════════════
-- STEP 3 — VERIFY.  Run this after STEP 2.
-- ═════════════════════════════════════════════════════════════════════════════
--
-- Expect: policy_count = 0 and rls_enabled = true on all seven rows.

SELECT
  c.relname                                   AS tablename,
  c.relrowsecurity                            AS rls_enabled,
  (SELECT count(*) FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename = c.relname)            AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'montree_schools',
    'montree_classrooms',
    'montree_teachers',
    'montree_children',
    'montree_parents',
    'montree_parent_children',
    'montree_parent_invites'
  )
ORDER BY c.relname;
```

## SQL 351 — make sessions revocable (item F)

`migrations/351_session_revocation.sql`

```sql
-- ═════════════════════════════════════════════════════════════════════════════
-- STEP 1 — DRY RUN. Confirms the three tables exist and do not already have it.
-- ═════════════════════════════════════════════════════════════════════════════

SELECT
  t.table_name,
  EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = t.table_name
      AND c.column_name = 'sessions_revoked_at'
  ) AS already_has_column
FROM (VALUES
  ('montree_teachers'),
  ('montree_school_admins'),
  ('montree_organization_admins')
) AS t(table_name)
ORDER BY t.table_name;


-- ═════════════════════════════════════════════════════════════════════════════
-- STEP 2 — THE MIGRATION.
-- ═════════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE montree_teachers
  ADD COLUMN IF NOT EXISTS sessions_revoked_at timestamptz;

ALTER TABLE montree_school_admins
  ADD COLUMN IF NOT EXISTS sessions_revoked_at timestamptz;

ALTER TABLE montree_organization_admins
  ADD COLUMN IF NOT EXISTS sessions_revoked_at timestamptz;

COMMENT ON COLUMN montree_teachers.sessions_revoked_at IS
  'Sign-out-everywhere marker. Any session JWT issued (iat) BEFORE this instant '
  'is rejected by verifySchoolRequest. NULL = nothing revoked. Set to NOW() to '
  'invalidate every existing session for this account on every device.';

COMMENT ON COLUMN montree_school_admins.sessions_revoked_at IS
  'Sign-out-everywhere marker — see montree_teachers.sessions_revoked_at.';

COMMENT ON COLUMN montree_organization_admins.sessions_revoked_at IS
  'Sign-out-everywhere marker — see montree_teachers.sessions_revoked_at.';

COMMIT;


-- ═════════════════════════════════════════════════════════════════════════════
-- STEP 3 — VERIFY. Expect three rows, data_type = 'timestamp with time zone'.
-- ═════════════════════════════════════════════════════════════════════════════

SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'sessions_revoked_at'
ORDER BY table_name;


-- ═════════════════════════════════════════════════════════════════════════════
-- USEFUL AFTERWARDS — how to actually sign someone out everywhere by hand
-- ═════════════════════════════════════════════════════════════════════════════
--
-- Normally this happens through the app (a teacher pressing "sign out of all
-- devices"). To do it manually for one account, e.g. a lost phone:
--
--   UPDATE montree_teachers
--      SET sessions_revoked_at = NOW()
--    WHERE id = '<teacher uuid>';
--
-- To sign out every teacher in one school (e.g. a shared code leaked):
--
--   UPDATE montree_teachers
--      SET sessions_revoked_at = NOW()
--    WHERE school_id = '<school uuid>';
--
-- Effect is immediate on the container that served the write and within 60
-- seconds everywhere else (the in-process cache TTL). To UNDO a revocation
-- before anyone has logged back in, set the column back to NULL.
--
-- ── ROLLBACK ────────────────────────────────────────────────────────────────
-- Dropping the columns fully reverts this migration; the application code
-- treats a missing column as "nothing revoked" (it fails open), so code and
-- database can be rolled back in either order.
--
--   ALTER TABLE montree_teachers            DROP COLUMN IF EXISTS sessions_revoked_at;
--   ALTER TABLE montree_school_admins       DROP COLUMN IF EXISTS sessions_revoked_at;
--   ALTER TABLE montree_organization_admins DROP COLUMN IF EXISTS sessions_revoked_at;
```

---

## Commits, in order

```
ab704fa  (a)  close public RLS hole on all montree PII tables
0a1c473  (e)  stop stored XSS via media upload + proxy
7187681  (b)  require a dedicated SUPER_ADMIN_JWT_SECRET, fail closed
a7c06cf  (d)  require a principal on the 17 unguarded admin routes
f8a19e0  (c)  scope backfill-guides ?all=true to the caller's own school
e6ab86a  (f)  session revocation + sliding refresh for 3650-day tokens
a7a00f7  (g)  cap the voice/llm internal principal token at 120s
```

Branch `ap/security`. Not pushed. Each item is one commit — drop any you don't
want by reverting that single commit.
