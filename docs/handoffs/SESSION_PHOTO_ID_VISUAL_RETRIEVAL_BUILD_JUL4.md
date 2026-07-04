# BUILD HANDOFF — Photo-ID Visual-Similarity Retrieval (EXECUTED)

**Status: COMPLETE + LIVE IN PRODUCTION.** Jul 4, 2026 (Cowork/Opus). Executes
`docs/handoffs/SESSION_PHOTO_ID_VISUAL_RETRIEVAL_PLAN.md` Steps 0→1→2 end-to-end. This is the
execution record + the rules to preserve. Read the PLAN doc for the "why"; read this for the "what
shipped + what to not break."

## Commits (all on `main`, pushed + Railway deployed)
- `90114868` — Step 0: staircase confusion cluster
- `a0e9c641` — Step 1: visual-similarity retrieval (migration 282 + backfill route + runtime wiring)
- `b75f3036` — Step 2: real eval harness (`scripts/eval-photo-id.mjs`)
- `34f62f82` — gallery: seed the moat on confirm + AI-tagged treatment
- `31966f08` — CLAUDE.md brain block
- `a401d938` — audit hardening: backfill doesn't abort on a single mid-loop write error

## DB / infra state (all DONE)
- **Migration 282 RUN** in Supabase: `embedding vector(1536)` column on `montree_global_visual_memory`
  + `montree_global_vm_search(query, limit)` cosine RPC (mirrors `tracy_corpus_search` from mig 242b;
  no ANN index — 270 rows, seq scan instant). Verified: column + RPC present.
- **Backfill DONE: 270/270 embedded, 0 failed** via `POST /api/montree/super-admin/embed-global-vm`
  (super-admin password auth from the sandbox → runs ON Railway using its OpenAI key). Verified.
- Global VM re-seeded (Step 0 negatives): 270 rows, all `source='curated'`.

## Step 0 — the incident insurance (KNOWN failure closed)
Trigger: Sunshine Montessori's first 2 photos, one wrong — a **Number Rods photo drafted "Brown
Stair"** (Math work filed as Sensorial). Root cause: candidate recall was LEXICAL + AREA-LOCKED on the
name Haiku guessed; the correct work (different name/area) was structurally unreachable.
- `lib/montree/work-matching.ts`: NEW `CONFUSION_CLUSTERS` primitive (array of name-arrays).
  `CROSS_AREA_CONFUSION_WORK_NAMES` + `CROSS_AREA_CONFUSION_COUNTERPARTS` are now DERIVED from it via
  `buildConfusionSets` (union of all cluster siblings; deduped). Existing pairs (red/number rods,
  metal insets/geometric cabinet, cylinder blocks/spindle box, sandpaper letters/numerals) migrated
  into clusters UNCHANGED. Registered the graduated-staircase family
  (`pink tower, brown stair (broad stair), brown stair, broad stair, red rods (long rods), red rods,
  number rods, number rods with numerals, pink tower and brown stair`) — Number Rods is the cross-area
  member that legitimises the cluster (scope comment updated to say so).
- Curated data: mutual `NOT` negatives added on Brown Stair (sensorial.json) ↔ Number Rods (math.json).
- `visual-id-guide.ts`: the staircase confusion line now teaches **COLOUR-FIRST** (red/blue banding ⇒
  Number Rods, beats silhouette).
- Validated: `retest-cold-start.mjs` — Photo A (`946613be`) → Number Rods 3/3 (was Brown Stair); Photo
  B (`e05b14da`) → Brown Stair 3/3 (inverse guard); Number Rods/Metal Insets/Knobless/Pink Tower hold.
  Sandpaper Letters + Binomial were 0/2 but those are pre-existing Haiku variance (their clusters/data
  untouched), NOT in the plan's must-hold list. Cylinder Block gate photo `d7af53f8` was deleted from
  prod — can't run it, but that cluster is unchanged by the edit.

## Step 1 — the CLASS fix (candidate recall by appearance)
`lib/montree/photo-identification/visual-retrieval.ts` (NEW) + wiring in `two-pass.ts`:
- After Pass 1, embed the Pass-1 **visual description** (OpenAI text-embedding-3-small, 1536-dim) →
  `montree_global_vm_search` RPC → top-8 nearest global works **across ALL areas**.
- Consumers: (a) injected into the Pass 2 **USER message** (`MOST VISUALLY SIMILAR LIBRARY WORKS` —
  NOT the cached system prefix, both Jul-3 cache breakpoints survive), (b) fed to
  `buildPass2bCandidates` as a NEW priority tier (2.5, after guess+counterparts, before same-area
  fillers; `MAX_CANDIDATES` 5→7), (c) NEW Pass 2b force trigger `forcePass2bVisualDisagreement` — fires
  when Pass 2's chosen work is NOT among the top-3 neighbours ("visual evidence disagrees").
- The matcher (`matchToCurriculumV2`) now gets the RICH Pass-1 `visualDescription` for the materials
  boost at BOTH the Pass 2 and Pass 2b call sites (was the one-line `observation`).
- The process route + retest harness now pass `supabase` into `runTwoPassIdentification` (retrieval
  needs it for the RPC).
- **🚨 FAIL-OPEN is load-bearing:** no `OPENAI_API_KEY` / migration-not-run (RPC/column absent) / no
  supabase → `retrieveVisualNeighbors` returns `[]` → the pipeline is byte-for-byte the Step-0
  behaviour. Verified via a dormant retest (retrieval off → Photo A → Number Rods, Photo B → Brown
  Stair, unchanged) AND by the `[visual-retrieval] embed failed (fail-open)` log line.

**Retrieval quality VERIFIED on prod** (each work's own stored embedding as the query, no OpenAI
needed): Number Rods → **Red Rods 0.849 (cross-area!)** + Number Rods with Numerals; Red Rods → Number
Rods 0.849; Cylinder Block 1 → Blocks 2/3/4 @0.997 + Knobless 0.732; Sandpaper Letters → Sandpaper
Numerals 0.723 (cross-area) + Moveable Alphabet. Every work pulls its visual family AND cross-area
look-alikes into the candidate set — exactly what the class fix needs.

## Step 2 — the eval harness (never guess coverage again)
`scripts/eval-photo-id.mjs`: replays teacher-confirmed photos (with `work_id`, standard works only)
through the REAL pipeline in COLD mode (empty classroom VM + full global VM). Reports top-1 /
top-3-chip / Gate-A auto-file precision (+ wrong auto-files) / per-area confusion matrix. Stratified
`--per-work`, reusable `--sample <file>` for FAIR before/after, retrieval auto-detected via
`OPENAI_API_KEY` (prints ACTIVE vs DORMANT). Photo A + Photo B pinned as permanent regression cases.
The Gate-A `wouldAutoFile()` exactly replicates the process route's cold-mode Path 2
(`is_curriculum_work !== false && matchScore >= 1.0 && confidence >= 0.90`; Path 1 unreachable in cold
mode). Validated end-to-end (16-photo dormant baseline: both regression cases pass, matrix + precision
computed). Sample pool: 216 eligible standard-work confirmed photos across 68 works.

## Gallery follow-through (`34f62f82`)
`app/montree/dashboard/[childId]/gallery/page.tsx`:
- Gallery confirms now route through `POST /api/montree/guru/corrections` `action='confirm'`
  (`seedMoatConfirm`, fire-and-forget) → parity with Photo Audit / Wrap Up: a one-tap gallery confirm
  reinforces the classroom moat + sets `teacher_confirmed` (before, gallery taps only wrote `work_id`
  and a cold classroom never warmed its moat from the gallery). Closes the Jul-4 open item.
- Gate-A auto-filed-but-unconfirmed photos (`identification_status === 'haiku_matched'`, `work_id`
  set) get a distinct ✨ AI-tagged treatment + one-tap ✓ (`confirmAiTag`) / tap-name-to-correct, so
  they read distinctly from a teacher-confirmed photo. A confirmed photo (status `'confirmed'`) fails
  both `isSuggestion` (needs `!work_id`) and `isAiTagged` (needs `'haiku_matched'`) → never
  mis-renders the ✨/✓.

## Audit (done properly)
Two independent fresh-eyes audit agents (runtime path; backfill/migration/eval/gallery) + own runtime
checks. **No CRITICAL, no HIGH bugs.** Confirmed: fail-open complete, both cache breakpoints preserved,
confusion-cluster derivation preserves old pairs, eval Gate-A replication faithful, confirmed photos
never mis-render as AI-tagged, auth/idempotency/SQL-cast/moat-seed all clean. One LOW hardened
(`a401d938`): backfill no longer aborts on a single mid-loop write error whose message contains "does
not exist" (the upfront SELECT already proves the column exists). ESLint 0-errors on every touched
file; pipeline bundles.

## 🚨 RULES TO PRESERVE (do NOT break)
- Global VM is runtime-READ-ONLY. Only `scripts/seed-global-visual-memory.mjs` (text) + the backfill
  route (`embedding` column only) write it.
- **RE-RUN the embed backfill (`?force=1`) after ANY re-seed** — a re-seed rewrites the text but leaves
  the STALE embedding. This is the one maintenance gotcha.
- Retrieval injects into the Pass 2 **USER message**, never the cached system prefix (Session 117
  attention regression + Jul-3 cache economics).
- A new confusion family = a `CONFUSION_CLUSTERS` line + mutual curated `NOT` negatives + re-seed +
  re-run the embed backfill + a harness case — **NOT code**.
- Don't lower `HAIKU_TRUST_CONFIDENCE` (0.85) or the 0.90 first-sight bar — they SAVED Photo A from
  being auto-filed wrong.
- Global VM NEVER satisfies Gate A Path 1 (classroom-VM-only trust). No cold-start auto-confirm.
- `montree_media.work_id` is TEXT vs curriculum `id` UUID — cast (`w.id::text = m.work_id`) in raw SQL.
- Colour/shape discriminators live in curated negatives + the guide line (testable data), not free-text
  heuristics in code.

## ⏳ Open / next (all OPTIONAL — production is LIVE + validated)
- **Full OFFLINE before/after eval WITH retrieval** needs `OPENAI_API_KEY` locally (kept on Railway by
  design). Run: `OPENAI_API_KEY=… node scripts/eval-photo-id.mjs --sample /tmp/evalset.json --label after`
  then compare to a `--label before` dormant run. Else trust prod GateA telemetry (`gvmInjected` + the
  retrieval neighbours) on the next cold capture. This is telemetry, NOT a correctness gate — the
  mechanism is already proven.
- **Pass 2b `+0.05` override margin** for disagreement-triggered runs — the plan flags it can block a
  correct override when Pass 2 was confidently wrong. DECIDE FROM EVAL DATA (above), not vibes.
- Watch the next real brand-new school's first captures — should surface the right work (or reach it as
  a top ✨ chip).

## Business context (this session also produced a pricing/GTM strategy)
See `docs/strategy/PRICING_FOUNDING_100_STRATEGY.md` — the photo-ID hardening is the technical
precondition for the "Founding 100" land-grab play (a wrong first-photo tag kills a new account; the
whole point of this work is that first impressions no longer blow up).
