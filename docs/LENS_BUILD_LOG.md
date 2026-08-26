# Montree Lens — Build Log (v1, branch `lens/v1`)

The visiting-observer app: she walks into a classroom, captures moments one-thumbed
in silence, and walks out with a draft AMI-style report in English and Chinese.

Concept and research: `docs/MONTREE_LENS_CONCEPT.md` (read that first — it is the
product spec this was built against). This file is the *engineering* record: what
exists, how to run it, what has to be done by hand to go live, and what is not
built yet.

**Status (updated 2026-08-26):** LIVE at https://montree.xyz/lens, running in **open beta**
(§1.6). Phases 0–3 of the concept doc are deployed and working end to end. Migration 339 is
applied, the `lens-photos` bucket exists, and the seeded invite code has been rotated — see
`docs/handoffs/HANDOFF_MONTREE_LENS_LAUNCH_AUG26.md` for the launch write-up and next steps.
Nothing has yet been clicked through against the real database by a human.

---

## 1. Go live — the five manual steps (done)

Nothing below was optional, and none of it was automated. All five steps have now been done —
this section is kept as a record of what was done and why, not a to-do list; the same
migration/bucket/invite-code dance applies to any future `lens_*`-style sub-product.

### 1.1 Run the migration

**Done, 2026-08-26** — applied via a small Node `pg` script against the Supabase pooler
(`aws-1-ap-southeast-1.pooler.supabase.com`, same connection recipe as
`scripts/_harness/probe.mjs`). Nine `lens_*` tables confirmed live.

Paste `migrations/339_lens_v1.sql` into the Supabase SQL editor and run it. It is
one transaction, idempotent, and purely additive — nine `lens_*` tables, a touch
trigger, RLS enabled with **no policies** (deny-all for anon/authenticated; the
app reads through the service role, the same posture as `tp_*`).

It does **not** create the storage bucket. That is deliberate — see 1.2.

### 1.2 Create the storage bucket by hand

Supabase dashboard → Storage → **New bucket**:

| | |
|---|---|
| Name | `lens-photos` |
| Public | **OFF** |

The bucket must be private. These are photographs of other people's classrooms
taken under a professional engagement; a public bucket URL is a permanent
unauthenticated link to a client's premises. Every read goes through
`GET /api/lens/media/proxy/<path>`, which checks the observer's cookie and then
checks that the path's first segment is her own observer id.

> **Why this is not in the migration:** writing to the `storage` schema from a
> migration rolls the whole migration back — the lesson the `potato-snaps` bucket
> taught this repo. Do not "helpfully" add `INSERT INTO storage.buckets` to 339.

Until the bucket exists, photo moments fail with a 502 and stay in the device
queue (they are never lost); text, voice and chip moments work fine.

**Done, 2026-08-26** — `lens-photos` created, private, 15 MB upload limit.

### 1.3 Change the seeded invite code

**Done, 2026-08-26** — rotated to `GY46N866`. This currently matters only if §1.6's open-beta
flag gets switched off, since while it's on the invite door is bypassed entirely.

The migration seeds **one** observer with the placeholder code `LENSV1AA`. That
code is in a public repo, so anyone reading this file can type it into the door.
Change it immediately:

```sql
UPDATE lens_observers
   SET invite_code = 'YOUR8CHR'   -- exactly 8 chars, A–Z and 2–9 only
 WHERE invite_code = 'LENSV1AA';
```

The alphabet is `A-Z` plus `2-9` (34 symbols — 0 and 1 are excluded because they
are the only characters confusable with O and I). 34⁸ ≈ 1.8 trillion. The code
door is rate-limited to 10 attempts per 15 minutes per IP, in-memory and
per-instance — a speed bump, not a guarantee; the code space is the real
protection.

To mint a fresh one:

```
node -e "const a='ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789';console.log(Array.from({length:8},()=>a[require('crypto').randomInt(a.length)]).join(''))"
```

Then set her name and letterhead in the app at `/lens/profile` (or by SQL —
`name`, `title`, `credentials`, `letterhead_*`, `signature_text`).

### 1.4 Fonts — already committed, nothing to do unless Chinese breaks

`public/lens/fonts/NotoSerifSC-Lens.otf` (2.4 MB) ships in the repo and the
Dockerfile already copies `public/` into `.next/standalone/`, which is the
runtime cwd. **No action needed.**

It exists because pdfkit's fourteen standard fonts have *no* Chinese glyphs at
all: a bilingual report rendered in Helvetica is a page of empty boxes, and it
looks like a rendering bug rather than a missing font.

It is a subset of the repo's existing `potato-worker/remotion/public/NotoSerifSC-Regular.otf`
(11.6 MB — that directory is in `.dockerignore`, so the full face is *not* in the
production image). Coverage: GB2312 level 1+2 (6,763 hanzi) + Latin + CJK and
general punctuation ≈ 7,900 codepoints. Rebuild command, if a glyph ever comes
out as a tofu box:

```bash
# needs python3 + fonttools (already present in this sandbox)
python3 -m fontTools.subset potato-worker/remotion/public/NotoSerifSC-Regular.otf \
  --text-file=<file listing every char you need> \
  --output-file=public/lens/fonts/NotoSerifSC-Lens.otf \
  --layout-features='*' --glyph-names --no-hinting
```

Or simply copy the full 11.6 MB face to `public/lens/fonts/NotoSerifSC-Regular.otf` —
`lib/lens/reports/pdf-generator.ts` probes for that filename second and will pick
it up with no code change.

The face is **Regular only**. There is no bold CJK; Chinese headings fall back to
the regular weight (they read correctly, they just do not get heavier). Latin
headings are properly bold.

### 1.5 Middleware — already committed, but know what it does

`middleware.ts` has exactly one Lens change: `'/lens'` added to `publicPaths`.

- **Why it is needed:** without it, the legacy Supabase-role gate at the bottom of
  that file silently 302s every anonymous visitor to `/`, which reads as "the page
  doesn't exist". Same reason `/montree`, `/potato` and `/cms` are on that list.
- **Why it is NOT in `WHALE_ONLY_PREFIXES`:** Potato Snaps is bounced off
  montree.xyz because it is a second brand on the wrong domain. Lens is a Montree
  product with a Montree name and belongs on **montree.xyz/lens**. Adding it to
  that list would 307 every visitor to teacherpotato.xyz, where its host-only
  cookie would not follow them.
- **`/api/lens/*` is deliberately outside the matcher** (the matcher excludes
  `api` and names only specific `/api` groups). It therefore gets **zero**
  middleware protection, exactly like `/api/potato/*`. Every handler calls
  `requireObserver(request)` itself. There is no ambient auth. If you add a route
  under `app/api/lens/`, that call is not optional.

### 1.6 Open beta (added 2026-08-26)

Before ever inviting a second observer, know this: **`lib/lens/flags.ts` exports
`LENS_OPEN_BETA = true`.** While it's true, the invite-code door from §1.3 is bypassed
entirely — `/lens` calls `POST /api/lens/auth/auto`, which signs in the one seeded observer
automatically, and `requireObserver` (`lib/lens/route-helpers.ts`) falls back to that same
observer when no cookie is present. This is correct and intentional for the current
single-observer open beta; it is **not** correct once a second observer exists. Flip the flag
to `false` to restore the invite-code door — nothing behind it is deleted, it just stops being
bypassed. See `docs/handoffs/HANDOFF_MONTREE_LENS_LAUNCH_AUG26.md` for the full launch context.

### Environment variables

**None are new.** Lens uses only what Railway already has:

| Var | Used for |
|---|---|
| `ADMIN_SECRET` | signs the `lens_observer` cookie |
| `ANTHROPIC_API_KEY` | the Lens Guru (draft, chat, translate, debrief) |
| `OPENAI_API_KEY` | Whisper transcription of voice notes |
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | everything else |

Missing `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` degrades the relevant route to a
clean 503 with a sentence a human can act on; capture still works completely.

---

## 2. How to run it

```bash
npm ci
npm run dev
# then: http://localhost:3000/lens
```

Sign in with the invite code, then:

1. `/lens/schools` → add a school → add a classroom → add staff
2. `/lens/visits/new` → school, date, engagement type, tick the rooms
3. `/lens/visits/[id]/capture` → photo / hold-to-talk / note / chips
4. `/lens/visits/[id]` → the timeline; "Finish observing"
5. `/lens/visits/[id]/report?report=<id>` → draft, edit, 中文, ratings, debrief, finalise
6. PDF: the **PDF** button, or `GET /api/lens/reports/<id>/pdf?lang=en|zh|both`

Checks:

```bash
npx tsc --noEmit -p tsconfig.json          # repo-wide; see §6 for the baseline
npx vitest run                              # 530 tests, 38 files
npx vitest run tests/lens-*.test.ts         # just Lens: 92 tests
npx eslint app/lens components/lens lib/lens app/api/lens
node scripts/lens/make-icons.mjs            # regenerate PWA icons from the SVG
```

Before a real visit, install it: open `/lens` on the phone and Add to Home Screen.
`public/lens/manifest.json` scopes the PWA to `/lens` with `start_url: /lens/home`.

---

## 3. What exists

### Data model — `migrations/339_lens_v1.sql`

Nine tables, all `lens_`-prefixed, all RLS-on-no-policies:

| Table | Notes |
|---|---|
| `lens_observers` | one row per person. Letterhead fields, `default_languages`, `style_profile` jsonb, unique `invite_code` |
| `lens_schools` | hangs off `observer_id` — this is the entire tenancy model |
| `lens_classrooms` | `level` CHECK: nido / toddler / casa / lower_el / upper_el / adolescent |
| `lens_staff` | `role` CHECK: lead_guide / assistant / trainee / other |
| `lens_visits` | `engagement_type` CHECK: consultation / mentoring / internal_review; status capturing→drafting→review→final |
| `lens_visit_classrooms` | junction, composite PK (makes re-adding a room a no-op) |
| `lens_moments` | the timestamped stream. `kind` photo/voice/text/chip. **`uq_lens_moments_client_id` is the offline contract** |
| `lens_reports` | one per (visit, classroom) + one level report per visit (`classroom_id IS NULL`), enforced by two partial unique indexes. Sections/ratings/lists as jsonb |
| `lens_action_items` | seeded on finalise; `classroom_id` denormalised so the next-visit recall query runs off the room |

Soft delete (`is_active=false`) for schools, classrooms and staff — a school row
that vanishes takes a year of reports' context with it. **Hard** delete for
moments, and the photo with it: when an observer deletes an observation of
somebody's classroom it should be gone. A moment cited by a *finalised* report
refuses to delete (409, naming the report).

### Auth — `lib/lens/auth.ts`

Mirrors `lib/potato/auth.ts` exactly: jose HS256, host-only cookie (no `domain`
attribute), `ADMIN_SECRET` as the secret, ~10-year TTL, and **`aud: 'lens-observer'`
checked on every verify**. That audience check is the security boundary: Lens,
Potato and Montree all sign with the same secret, so without it a Montree token
pasted into `lens_observer` would *verify* and then fail on shape — which is
"fails for the wrong reason", not a boundary. `tests/lens-auth.test.ts` pins it.

### Capture — `lib/lens/offline/*`

Ported from `lib/potato/offline/*` with its production hardening intact: atomic
row+bytes IndexedDB write, content-hash dedup with a race-safe retry, blob deleted
*before* the row is marked uploaded, a sync lock that force-resets after 120 s,
401 halts the whole pass, nothing ever left stuck in `uploading`, and
`reclaimStaleUploads` on every pass so an upload killed with the tab heals itself.

Adapted for Lens:

- tenancy is the **visit**
- an entry may have **no blob** — three of the four moment kinds are pure fields,
  so the blob store is written only when there are bytes
- the whole moment payload travels with the entry (a chip tapped in a dead spot
  must arrive with its area, subject, staff and rating intact)
- transient failures retry **forever** with capped backoff. Only the server saying
  "no, permanently" (a non-401/408/429 4xx) ends an entry's life. An observation
  in somebody's classroom cannot be re-taken.

`lib/lens/image.ts` compresses at capture time (1920 px long edge, JPEG 0.82,
EXIF-orientation aware, HEIC normalised via canvas, original kept when re-encoding
would not help). Compressing *before* queueing is what stops the device holding
~50 MB after one classroom.

`POST /api/lens/visits/[id]/moments` is **one door for all four kinds** —
`multipart/form-data` for a photo, JSON for the rest. Everything below the payload
is identical (visit ownership, classroom re-check, `clientId` idempotency with
23505 handling, chip vocabulary validation), so a second endpoint would be a
second copy of all of it drifting apart one audit fix at a time.

A capture is **never refused for a cosmetic reason**: an unknown area, an unknown
subject, a staff id from another school are *dropped* and the moment still saves,
with `dropped[]` in the response naming what went. The one exception is the photo
bytes themselves. A silent classroom is not the place to argue with a validator.

### The Lens Guru — `lib/lens/guru/*`

Four hard guardrails at the top of the system prompt, overriding everything below
them: never invent an observation; every judgement cites a moment id; never name a
child (Child A (4;3)); no children's faces in the report body.

- `system-prompt.ts` — guardrails + `knowledge/observation-standards.ts` (§2 of the
  concept doc) + engagement tone + her `style_profile`. An **empty** style profile
  produces an empty block: telling the model she prefers short sentences when she
  has never said so is inventing a person, which is the same failure as inventing
  an observation.
- `context-builder.ts` — **pure**, no I/O. Renders every moment as
  `[<uuid>] HH:MM KIND · tags` — that bracket is the citation handle the whole
  design rests on. An empty visit says so loudly rather than handing the model a
  clean sheet and an instruction to write a report.
- `load-context.ts` — the I/O half. A classroom report sees only that room's
  moments and staff; the level report sees everything. A moment with no
  `classroom_id` reaches the level report **only** — attributing an untagged
  observation to a specific room would be quiet fabrication.
- `draft-tool.ts` — forced tool use (`tool_choice: {type:'tool'}`), not "return
  JSON". A report generation that fails one time in twenty is a feature she stops
  trusting.
- `modes.ts` — the eight modes. Every one runs on the *same* system prompt with the
  *same* guardrails; "make it kinder" that quietly dropped the citation rule would
  be a different product.

`lib/lens/reports/schema.ts` re-validates everything that comes back — unknown
section keys dropped, unknown rating levels dropped, and **evidence ids filtered
against the set of moments actually in scope**. That last one is the
anti-fabrication gate: a model that invents a plausible uuid to satisfy "cite a
moment" would otherwise produce a report whose chips lead nowhere. An id we cannot
resolve is dropped, the claim becomes visibly uncited, and the editor warns.

All model calls that write durable report state run at `temperature: 0` (the
repo's standing rule). Only `brainstorm` — a conversation that never touches the
report — runs at 0.4.

### The report

12-section AMI template in `REPORT_TEMPLATE`, exactly the concept doc's §3 list and
order. `required_actions` is present **only** for `engagement_type: consultation`.
Per-staff subsections are minted at draft time as `adults:<staffId>` so the
"individual teacher report" can be split out later.

Editor at `/lens/visits/[id]/report`: inline EN/ZH editing, regenerate one section
(merges, never replaces the eleven she has fixed), ratings table, evidence chips
that reveal the moment on tap, EN / 中文 / both toggle, debrief script, action-item
table, finalise. Saving is **explicit** — an autosave per keystroke is a PATCH per
character on hotel wifi and makes undo mean nothing.

Translation is **section by section**, so one failure costs one paragraph rather
than shifting every following section into the wrong place. The locked glossary
(`knowledge/montessori-glossary-zh.ts`, ~60 terms) goes into the prompt and
`findGlossaryViolations` checks the output — **advisory only**, surfaced for her to
judge, never blocking: a legitimate rephrasing can drop a term honestly, and a
checker that cries wolf gets ignored.

Finalise: status first, *then* idempotent action-item seeding (matched on item
text, so a second press adds nothing and never resurrects an item she marked
done), then the visit goes final once every report on it is. Carried-forward items
are ticked at `/lens/visits/new`, held in `sessionStorage` (nothing is written
until the report is real), and **re-proved server-side** at finalise — the client
sends ids, the server checks each one belongs to a report of a classroom this
observer owns.

### PDF — `lib/lens/reports/pdf-generator.ts`

pdfkit, same shape as `lib/montree/reports/pdf-generator.ts`. Cover with her
letterhead + school + room + engagement + confidentiality line; at-a-glance
context; sections in the chosen language(s); ratings table; commendations /
recommendations / required actions / next steps; debrief; Appendix A photograph
log; Appendix B timestamped timeline; page numbers and signature line in the
footer (written after the fact via `bufferPages`).

The photo appendix renders **captions only, never images**. A PDF is the artefact
most likely to be forwarded, and these are photographs of somebody else's
classroom. The images stay behind her login.

---

## 4. Deliberate decisions worth not undoing

- **Timestamps in the model's context are rendered in UTC and said to be UTC.**
  Lens carries no per-school timezone in v1. Converting in server-local time would
  be quietly wrong by up to a day in the direction nobody checks; one honest,
  named frame means a drafted "at 01:42" reads as a timezone question rather than
  a fabricated hour. The UI renders local time via `Intl`. Adding a
  `lens_schools.tz` column is the clean fix.
- **`/api/lens/*` gates itself.** Not an oversight — see §1.5.
- **Chip rails are sticky.** Tags do *not* reset after a save. Six moments in a row
  on the Sensorial shelf would otherwise cost twelve extra taps she has to look
  down to make. What is currently armed is shown at all times.
- **Hold-to-record, not tap-to-toggle.** A toggle still recording because she did
  not notice the second tap captures five minutes of a classroom nobody consented
  to. `pointerleave` / `pointercancel` are handled, so a thumb sliding off the
  button never leaves the mic live. Audio is sent to Whisper and dropped — only the
  transcript is stored.
- **Whisper language is NOT pinned to `en`** (Montree's route pins it). She works
  in Chinese schools and will whisper in whichever language is in her head.
- **No `montree_guru_interactions` row is written.** That table is scoped to a
  Montree child, and a consultant's private thinking about a client's classroom is
  not something to log by default.
- **No tier/billing gate on the Guru.** Lens is single-observer; Montree's
  free/starter/premium ladder has nothing to say about it.

---

## 5. Known gaps / not built

- **Nothing has been run against a real database.** The migration has never been
  applied; every route's happy path is unexercised end to end. The PDF generator
  *is* exercised for real (`tests/lens-pdf.test.ts` renders actual bytes and
  asserts the CJK face is embedded).
- **`app/lens-app`** — the concept doc mentions a standalone-app landing page in
  the Potato shape. Not built; the PWA install path (`/lens` → Add to Home Screen)
  covers v1.
- **`lens_reports.pdf_path` is never written.** The column exists for a future
  share-link feature; the PDF is rendered on demand because the report is edited
  right up to the moment it is sent and a cached PDF disagrees with the screen.
- **`lens_schools.logo_path` is never written.** No school-logo upload UI; the PDF
  cover uses her letterhead only.
- **Style profile is not *learned*.** She sets it by hand at `/lens/profile`. The
  concept doc's "learned from her edits" is Phase 4.
- **No face-blur and no "no children in frame" nudge on capture** (concept §7). The
  policy is enforced by prompt, by the captions-only PDF appendix, and by the
  private bucket — not by the camera.
- **No share link, no team sharing, no template variants** (AMS rubric, school
  rubric). Phase 4.
- **No eval set.** The concept doc asks for 5 sample visits with expected report
  qualities as a regression suite. Not written.
- **Rate limits are in-memory and per-instance**, like Potato's. They fail open on
  restart by design.
- **The 6th tag rail (`child_alias`) has no UI.** The field exists on the moment,
  the API accepts it, and the Guru uses it — but the capture screen has no control
  for typing one. A note like "Child A (4;3) did…" carries the alias in its text
  instead, which is what the Guru actually reads.

---

## 6. Verification at time of writing

| Check | Result |
|---|---|
| `npx tsc --noEmit -p tsconfig.json` | 1160 errors repo-wide — **all pre-existing**, zero from any `lens` file. Baseline was measured on the same tree before any Lens file was added and is unchanged. |
| `npx vitest run` | 530 tests, 38 files, all passing. Lens contributes 92 across 6 files. |
| `npx eslint app/lens components/lens lib/lens app/api/lens` | 0 errors. 1 warning (`react-hooks/set-state-in-effect` in `useLensQueue`, the same shape `usePotatoQueue` has). |
| PDF | rendered for real in `tests/lens-pdf.test.ts`: valid `%PDF-`/`%%EOF`, CJK face embedded for `lang=both`, *not* embedded for `lang=en`. |

The 1160 pre-existing errors are concentrated in older Montree/CMS/story code and
are not Lens's to fix; the repo has `npm run audit:ts-budget` for tracking them.
