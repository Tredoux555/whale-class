# Montree Milestones — demo runbook

**Audience:** the founder, demoing to principals this week.
**Time to set up:** about ten minutes. **Time to demo:** about ten minutes.

Montree Milestones is a developmental check-in for 3–5s, run three times a year, one adult
sitting with one child for about five minutes. Internally the feature key is
`child_evaluation`; to a principal it is **Montree Milestones** and a sitting is **a
check-in** (to the child, "Discovery Time").

Two words to keep out of your mouth in the room: **test** and **score**. Montessori
schools reject that register, and it is the single biggest adoption risk in this product.
Say *check-in*, *milestone*, *band*, *what moved*.

---

## 1. Set up (once, before the demo)

### 1.1 Run the migration

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/314_montree_evaluation_system.sql
```

It is idempotent — safe to paste twice. It creates the four `montree_evaluation_*` tables
and inserts the `child_evaluation` row into `montree_feature_definitions` with
`default_enabled = false` (every school opts in explicitly).

Sanity check:

```bash
psql "$DATABASE_URL" -c "\dt montree_evaluation_*"
```

### 1.2 Seed the demo school

```bash
DATABASE_URL="postgres://…" node scripts/seed-evaluation-demo.mjs
```

`DATABASE_URL` is the **direct Postgres connection string** (Supabase → Settings →
Database → Connection string), not the REST URL.

What it creates:

| | |
|---|---|
| School | **Willowbrook Montessori (Milestones demo)**, slug `milestones-demo` |
| Classrooms | **Acorn Room** (13 children, established 3–6 room) · **Cedar Room** (5 children, opened this year) |
| Children | 18, ages ~3;2 to ~5;10, realistic date-of-birth spread |
| Feature flag | `child_evaluation` switched **ON** for this school |
| Windows | **Autumn** (form A, ~4 months ago) and **Winter** (form B, ~2 weeks ago) |
| Sittings | 17 completed in Autumn, 17 completed + 1 ended early in Winter |

The script is idempotent — run it as many times as you like, it produces byte-identical
data every time. `--reset` clears this demo school's sittings first (the school, rooms and
children stay).

**It does not invent bands.** Every band and every percentage comes from the same
`lib/montree/evaluation/scoring.ts` the live `/complete` route uses. The demo numbers are
production numbers.

### 1.3 Check the numbers landed

```bash
psql "$DATABASE_URL" -f scripts/evaluation-demo/cohort-sanity.sql
```

What you should see (these are the actual seeded figures):

- Winter: **17 children checked in**, **41.2%** of expected milestones securely met,
  averaging **39 milestones each**
- Autumn: 17 children, **33.8%** — so the year-to-date movement is about **+7 points**
- Growth Autumn → Winter: **16 children in both windows**, 773 comparable milestones,
  **35% moved up a band**
- Acorn Room: 13 children → shows a figure (41.5%). Cedar Room: 4 children → **suppressed**
- 181 milestones not checked, 11 teacher-decided bands, **0 overrides without a reason**

---

## 2. Logins

| Who | Where | Credentials |
|---|---|---|
| **Principal** (Ana Ferreira) | `/montree/principal/login` | `principal@milestones.demo` / `demo123` |
| **Teacher — Acorn Room** (Ms. Rosa) | `/montree/login` | login code `mile01` |
| **Teacher — Cedar Room** (Mr. Tom) | `/montree/login` | login code `mile02` |
| **Organisation tier** | `/montree/super-admin/milestones` | the super-admin password (`SUPER_ADMIN_PASSWORD`) |

The seeded passwords are stored as SHA-256, which the principal login still accepts and
silently upgrades to bcrypt on first sign-in. Nothing to do.

> **Org tier, be honest about it.** Montree has no "several schools, not all schools" role
> yet — the school roles are teacher / principal / homeschool parent / agent, and
> super-admin is the whole platform. The org view therefore runs on the super-admin
> session as a deliberate stand-in. If a principal asks, the honest answer is "this is the
> shape of the group view; the role that owns it is the next thing we build."

---

## 3. The ten-minute walkthrough

Open four tabs before you start so nothing loads in front of the audience:

1. `/montree/dashboard` (signed in as **Ms. Rosa**, `mile01`)
2. the same tab, ready to open a child
3. `/montree/principal/milestones` (signed in as **Ana**, second browser profile)
4. `/montree/super-admin/milestones`

### Minute 0–1 — Start where they already live

Open a child from the Acorn Room. Stay on the profile a moment.

> "This is the child record you already know — the observations, the photos, the work.
> Nothing about that changes. What we've added is one tab."

Open the **Milestones** tab. (It only appears when the school has the feature on — a
school that hasn't opted in never sees it.)

### Minute 1–6 — Run a real check-in, live

Start a check-in and pick **Number & Shape Play** (`M-MATH`) only. It is the fastest module
and the most legible to an adult watching.

While it runs, narrate what they're seeing:

> "One adult, one child, quiet corner. Five minutes. Every instruction is spoken, so a
> child who can't read isn't disadvantaged. No timer on screen, no right/wrong noises, no
> stars or points — the child gets exactly the same warm closing screen whatever happens."

If a principal is in the room, hand them the tablet and let them tap. That single moment
sells the product better than any slide.

Finish the sitting. The closing screen appears; you long-press to reach the teacher's
results view.

> "The teacher sees this. The child never does. And any band here can be overruled by the
> teacher with a reason — the system augments their judgement, it never overrides it."

### Minute 6–7 — Back to the child

Return to the child's Milestones tab. The check-in you just ran is there, with its
milestone list and its bands.

> "Notice what it doesn't say. No percentile. No 'ahead' or 'behind'. Three bands —
> emerging, developing, secure — against milestones that public early-years frameworks
> describe as typical at this age."

### Minute 7–9 — The principal view (the money screen)

Switch to Ana's tab: `/montree/principal/milestones`.

Walk it top to bottom:

1. **Who has been checked in** — 17 of 18 children this Winter. Click *Autumn* and back;
   the whole page re-reads for that window.
2. **Where the school is** — 41.2% securely met, across 17 children, averaging 39
   milestones each. Point at the n. *"The number never appears without it."*
3. **What this figure is, and is not** — read that box out loud. It is the thing that keeps
   the school out of trouble with parents, and principals notice that you led with it.
4. **Across the areas of development** — the band spread per area. Hover a segment.
5. **Classroom by classroom** — Acorn shows a figure; **Cedar shows a sentence instead**.
   Stop here:

   > "Cedar has four children. Four children can be identified from a percentage, so we
   > don't publish one. The rule is twelve, everywhere, and it is enforced on the server —
   > the page can't show a number it was never sent."

6. **What moved since Autumn** — 16 children in both windows, ~35% of tracked milestones
   moved up a band, and the "we are watching" number is printed right beside it.

   > "This is the part we lead with for funders. Comparing this year's four-year-olds with
   > last year's proves nothing at this size. Comparing a child with themselves does."

7. **What we are not hiding** — 181 milestones not checked, 11 bands a teacher decided.
   *"Selective reporting is a bug, so we print the awkward numbers too."*

### Minute 9–10 — The organisation view

Switch to `/montree/super-admin/milestones`.

> "Same rules one level up: one row per school, no child, no classroom, alphabetical and
> never ordered by figure. This is what a group of schools, or a funder's programme office,
> would see."

Close on the English track:

> "English is reported completely separately and never folded into the main number, and we
> don't express it as a percentage before age five — a four-year-old's English exposure is
> too short and too variable for a percentage to mean anything. In this demo the English
> figure is suppressed for exactly that reason, and it says so."

### One line to end on

> "Three times a year, five minutes a child, and at the end of it you can tell a parent
> what their child can do, and tell a funder what changed — in language neither of them
> has to have a teaching degree to read."

---

## 4. Troubleshooting

### "The Milestones tab / sidebar row isn't there"

The feature is off for that school. It is per-school and defaults to off.

```sql
INSERT INTO montree_school_features (school_id, feature_key, enabled)
VALUES ('<school id>', 'child_evaluation', true)
ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = EXCLUDED.enabled;
```

The server caches flag reads for 30 seconds, and the browser caches the feature list in
`sessionStorage`. After flipping it: wait half a minute, then hard-reload. The seed script
does this for the demo school automatically.

### The page says "Montree Milestones is not switched on yet"

Same cause, and this is the empty state doing its job — it lists the three steps to get
started rather than showing a broken dashboard. Nothing is wrong.

### The page says "Almost there … 314 has not been run"

The tables aren't there. Run §1.1. The API deliberately answers a friendly 503 with
`migration_pending: true` rather than a 500 — a missing migration is never a crash.

### Everything is empty even though the flag is on

That is the zero-data state, and it is also doing its job. It happens when:

- no sitting has been **finished** — an in-progress sitting is not counted anywhere;
- the school year rolled over (`schoolYear` defaults to the current one — pass
  `?schoolYear=2025-2026` to look back);
- you are looking at a window with no data. The page defaults to the latest window that
  *has* data, so this only bites if you clicked a window deliberately.

Re-run the seed if you need data back: `node scripts/seed-evaluation-demo.mjs`.

### Percentages are missing but counts are there

Working as designed. Percentages are suppressed when:

| Where | Rule |
|---|---|
| One child | fewer than 12 milestones assessed for them |
| A classroom, a school, the organisation | fewer than 12 children with a figure of their own |
| One area of development | fewer than 6 milestones with evidence |
| The English track | always below age band A5, whatever the n |
| Growth | fewer than 12 children with check-ins in both windows |

The reason is always printed in place of the number. If you see a blank where a reason
should be, *that* is a bug — report it.

### The principal page bounces me to the dashboard

You are signed in as a teacher. The school-wide view is principal-only (server-side, not
just a hidden link). Sign in at `/montree/principal/login`.

### The org page keeps asking for the password

The super-admin session lives in `sessionStorage` and times out after 15 minutes of
inactivity. Sign in again; nothing is lost.

### A parent asks whether they can see this

No. Nothing in these views is reachable from any parent surface, and none of the report
components may be imported into one — the parent-facing output of this system is the
child's own **Growth Story**, and nothing else.

Note the name collision: `app/montree/parent/milestones/` is an unrelated, deprecated
legacy route from Session 98. It is not this feature and must not be linked to it.

---

## 5. Questions principals actually ask

**"Is this a test?"**
No. There is no pass, no fail, no ranking, and nothing accumulates against a child. It is a
structured five-minute conversation, three times a year, plus what the teacher already
observes in the work cycle.

**"What if a child has a bad day?"**
The teacher can stop at any point, and a partial sitting is valid data — the milestones
that weren't reached are counted as not checked, not as zero. And the teacher can replace
any band the system computed, with a reason.

**"Will you compare my school to other schools?"**
Not as a judgement. Schools appear side by side, alphabetically, never ordered by figure,
and the method statement on every report says plainly that differences reflect who was
checked in and when.

**"Where do the milestones come from?"**
The structure follows the US Head Start ELOF (public domain); the wording is in the register
of the UK EYFS Development Matters (Open Government Licence) but is **original text** — we
cite framework codes, we do not reproduce framework wording. There is a China MoE 3–6
crosswalk as an appendix. The thresholds are conventional, not empirically calibrated, and
every report says so.

**"Who sees it?"**
Teachers and the principal see the child view. The principal sees the school view. Parents
get the Growth Story about their own child. Funders get a cohort report with no child in it
at all.
