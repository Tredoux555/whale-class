# APPLY — CMS PHASE 3

Everything below is for you, Tredoux. **One SQL file to run, then two things to
look at.** Five minutes.

Phase 3 is the whole parent intake, finished: all seven wizard steps write real
records, there is a review-and-submit screen at the end, and there is a new
step — **"About your child"** — where a family says what their child loves, what
unsettles them, and how they meet a new room. That step is what feeds the
teacher's new insight panel and, in Montree, the Guru.

**Run `migrations/329_cms_phase2.sql` first if you have not.** Phase 3 builds on
it and will not run without it.

---

## 1. Run the migration

Supabase dashboard → **SQL Editor** → **New query** → paste the *entire*
contents of `migrations/330_cms_phase3.sql` → **Run**. Expect
"Success. No rows returned."

It is additive and safe. It creates two new tables (`cms_child_profiles`,
`cms_previous_schools`), adds two columns to existing `cms_` tables, and adds
two values to two `cms_` enums. It contains no DROP and touches nothing outside
the `cms_` prefix — Montree, PSS and Story are untouched. One transaction, so
if anything fails nothing lands. Safe to re-run.

**Check it worked** — paste this and Run; expect **2 rows**, `rls_enabled` true
on both:

```sql
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled,
       COUNT(p.polname) AS policy_count
FROM pg_class c
LEFT JOIN pg_policy p ON p.polrelid = c.oid
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
WHERE c.relname IN ('cms_child_profiles', 'cms_previous_schools')
  AND c.relkind = 'r'
GROUP BY c.relname, c.relrowsecurity ORDER BY c.relname;
```

And this — expect `about_child` in the list:

```sql
SELECT unnest(enum_range(NULL::cms_enrollment_step)) AS step;
```

**If you ever need to undo it:** same place, paste
`migrations/330_cms_phase3_ROLLBACK.sql`. It drops only what 330 created and
leaves phase 2 fully intact — CMS drops back to phase-2 behaviour, not to
nothing. It deletes every family's "About your child" answers and schooling
history, so only run it before you have real families in there. Two enum values
cannot be removed (Postgres has no way to drop one); they are harmless.

No new env vars. Nothing to set in Railway.

---

## 2. Walk the wizard (after the next deploy)

Sign in as your parent account → **Enrolment**.

1. **Step 1 Child** — as before.
2. **Step 2 "About your child"** — this is the new one. Type a few things they
   love and press Enter after each; they become chips. Put your child somewhere
   on each of the four lines (tap a dot; tap it again to clear it). Write the
   "what should the teacher know" note. Leave the last tick on if you are happy
   for it to help the teacher's planning tools.
3. **Steps 3–7** — medical & allergies, dietary, previous school, contacts &
   pickup, consents. Each saves for real; **Save draft** and come back and your
   answers — including half-filled rows — are still there.
4. **Review & submit** — everything you entered, in one page, with an Edit
   button per section.
5. Press **Submit application**. You will get the "your application is with the
   school" screen.

**Then check the lock worked.** Go back to Enrolment. The form is read-only for
you now — that is deliberate, and it is enforced by the database, not the app:
a submitted form is evidence. The office can still change it.

---

## 3. See the teacher insight

Sign out → sign in as your teacher account → **Today**.

Every child on the register now has a **"What to know"** chip at the end of
their row. **Click anywhere on the row** and it unfolds: how that child meets
the world, what they love, what they would rather avoid, and the family's own
note. Click again to fold it away.

Children whose family has not filled the step in say so plainly, rather than
showing an empty panel.

**Who can see it:** the family, the teacher of that child's own room, and the
school office. **Nobody at the group office can see it, ever** — personality
data is held tighter than medical data, and that is enforced at the row level.
If you sign in as an org director you will find nothing there at all.

---

## 4. What this means for Montree's Guru

Nothing changes today, on purpose.

The Guru can now read a CMS "About your child" profile and fold it into its
picture of a child — the mapping is `lib/cms/engine/guru-feed.ts`, and the Guru
reads it at the same point it already reads a committed Montree parent intake.
It finds a profile by following a new `cms_children.montree_child_id` column.

**That column is empty for every row today**, so the Guru behaves exactly as it
did before. It fills in the day Montree's own child onboarding starts writing
it — which is the convergence the CMS section of `CLAUDE.md` describes. Until
then this is wired and dormant, not pending.

A family can also switch it off: the tick on step 2 ("let this help the
teacher's planning assistant") is honoured both in the query and in the mapping.
Unticked means the profile still serves the classroom and never leaves it.
