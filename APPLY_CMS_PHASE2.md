# APPLY — CMS PHASE 2

Everything below is for you, Tredoux. Three things to do: run one SQL file, set
two env vars, create your first accounts. Ten minutes.

---

## 1. Run the migration

**Primary path (the one you always use):** Supabase dashboard → **SQL Editor** →
**New query** → paste the *entire* contents of `migrations/329_cms_phase2.sql` →
**Run**. Expect “Success. No rows returned.”

It is additive and safe: every object it creates starts with `cms_`. It contains
no ALTER, DROP or UPDATE against any table you already have — Montree, PSS and
Story are untouched. It runs in one transaction, so if anything fails, nothing
lands. It is safe to re-run.

**Check it worked** — paste this and Run; expect **17 rows**, `rls_enabled` true
on every one:

```sql
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled,
       COUNT(p.polname) AS policy_count
FROM pg_class c
LEFT JOIN pg_policy p ON p.polrelid = c.oid
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
WHERE c.relname LIKE 'cms\_%' AND c.relkind = 'r'
GROUP BY c.relname, c.relrowsecurity ORDER BY c.relname;
```

**If you ever need to undo it:** same place, paste
`migrations/329_cms_phase2_ROLLBACK.sql`. It deletes all CMS data — only run it
before you have real families in there.

---

## 2. Set the env vars (Railway → montree service → Variables)

| Variable | Value | Why |
|---|---|---|
| `CMS_JWT_SECRET` | any long random string | signs the CMS login cookie |
| `CMS_AUTH_ENFORCED` | `1` | turns the login wall on |

`NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are already set — CMS
reuses them.

Leave `CMS_AUTH_ENFORCED` unset and CMS decides for itself: **login required
when Supabase is configured, demo mode when it is not.** Set it to `0` to force
demo mode (a laptop demo with no login), `1` to force live.

---

## 3. Create the first school, parent and teacher

Paste this whole block into the SQL Editor and Run. Change the names, emails and
the login code at the top if you like — nothing else.

```sql
-- ── your details ──────────────────────────────────────────────────────────
--  Parent signs in with parent@example.com  / the password you set below
--  Teacher signs in with teacher@example.com / the same password
--  Both passwords below are the bcrypt hash of:  cms-test-1234
--  (Change them from inside the app afterwards.)
BEGIN;

WITH org AS (
  INSERT INTO cms_organisations (name, slug, country_code)
  VALUES ('Harbor Early Years Trust', 'harbor-trust', 'ZA') RETURNING id
), school AS (
  INSERT INTO cms_schools (organisation_id, name, slug, timezone)
  SELECT id, 'Harbor House', 'harbor-house', 'Africa/Johannesburg' FROM org
  RETURNING id, organisation_id
), room AS (
  INSERT INTO cms_class_groups (school_id, name, age_min, age_max, capacity)
  SELECT id, 'Sunrise Room', 3, 5, 21 FROM school RETURNING id, school_id
), parent_user AS (
  INSERT INTO cms_users (email, password_hash, display_name)
  VALUES ('parent@example.com',
          '$2b$10$ur1VEX4n7.qCBbKvZtlQEOoEvnh1r./uc.54ZdlW7bC9WR6lyKSs.',
          'Ngozi Okonkwo')
  RETURNING id
), teacher_user AS (
  INSERT INTO cms_users (email, password_hash, display_name)
  VALUES ('teacher@example.com',
          '$2b$10$ur1VEX4n7.qCBbKvZtlQEOoEvnh1r./uc.54ZdlW7bC9WR6lyKSs.',
          'K. Mbeki')
  RETURNING id
), guardian AS (
  INSERT INTO cms_guardians (school_id, full_name, relationship, email)
  SELECT id, 'Ngozi Okonkwo', 'mother', 'parent@example.com' FROM school
  RETURNING id
), parent_member AS (
  INSERT INTO cms_memberships
    (user_id, role, organisation_id, school_id, guardian_id, email, display_name)
  SELECT parent_user.id, 'parent', school.organisation_id, school.id, guardian.id,
         'parent@example.com', 'Ngozi Okonkwo'
  FROM parent_user, school, guardian RETURNING id
), teacher_member AS (
  INSERT INTO cms_memberships
    (user_id, role, organisation_id, school_id, email, display_name)
  SELECT teacher_user.id, 'teacher', school.organisation_id, school.id,
         'teacher@example.com', 'K. Mbeki'
  FROM teacher_user, school RETURNING id
)
INSERT INTO cms_class_teachers (membership_id, class_group_id, is_lead)
SELECT teacher_member.id, room.id, true FROM teacher_member, room;

COMMIT;
```

**The password for both accounts is `cms-test-1234`.**

Want a different password? Easiest way: skip the two `cms_users` rows above,
open `montree.xyz/cms/login`, click **Create account**, and sign the parent up
yourself — the app writes the user, the guardian and the membership for you.
Then run only the teacher half of the block.

---

## 4. Verify (after the next deploy)

1. `montree.xyz/cms` — the three doors. Loads for anyone.
2. `montree.xyz/cms/parent/dashboard` while signed out → bounces to
   `/cms/login`. **That is the gate working.**
3. Sign in as `parent@example.com` → lands on the parent dashboard, "No children
   on file yet".
4. **Enrolment → step 1** → fill in the child, pick Sunrise Room → **Save and
   continue**. Go back to the dashboard: the child is there, with their room and
   age. Reload the enrolment page: your answers are still in the form.
5. Sign out (top right) → sign in as `teacher@example.com` →
   `montree.xyz/cms/teacher/today` shows that same child on the register.
   **That is the hourglass: the parent typed it, the teacher got it.**
6. `montree.xyz/cms/login?locale=ar` → the whole page flips to Arabic,
   right-to-left. `?locale=ru` for Russian.
