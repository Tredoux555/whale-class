# 🎯 BUILD HANDOFF — Photo-ID Visual-Similarity Retrieval Overhaul

**Status: PLAN READY, BUILD NOT STARTED. Execute end-to-end (one or multiple sessions) until complete.**
Written Jul 4, 2026 (Opus) after two Fable strategy analyses. This is the game plan for making
Montree's photo identification reliable enough that a first-time teacher's first few captures
don't mis-ID and kill adoption. **This is the single most important feature of the app.**

Fresh session: read this whole doc, then read `CLAUDE.md` (Jul 3 "CANONICAL GLOBAL SEED" +
"MASTER BRAIN v1" + Jul 4 blocks) for the photo-ID architecture + load-bearing rules. Then build.

---

## 0. THE INCIDENT (why we're doing this)

A brand-new school (**Sunshine Montessori / "My Classroom"**, classroom
`9a2fdaa2-9802-42ef-89d9-b8926e044a9f`) took its first two capture-photos. **One of two came back
wrong.** 50% wrong on first contact is an adoption-killer for a pre-validation product.

Verified directly from the production DB (read-only):
- **Photo A** — Number Rods (red/blue segmented rods), media `946613be-1b85-47f5-8992-edc75acce227`.
  Haiku Pass 1 described it CORRECTLY ("alternating blue and red colors, descending staircase,
  graduating in length"). But Pass 2 `top_candidates` = `[se_brown_stair 0.9, se_pink_tower_brown_stair 0.75]`
  — **Number Rods was never a candidate.** Result: `haiku_drafted`, proposed "Brown Stair", conf 0.75,
  work_id NULL. **WRONG** — a Mathematics work tagged as a Sensorial one.
- **Photo B** — Brown Stair (brown prisms), media `e05b14da-1fce-4a03-88a0-f7c24e9eff30`.
  Matched CORRECTLY to Brown Stair (`work_id=85b09ad7-...`, `se_brown_stair`), conf 0.95,
  `haiku_matched`. Gate A did not auto-confirm (cold classroom). Initially showed "Untagged" for the
  ~processing window — that part is a display/timing issue, **not** the same bug, and largely
  self-heals with the Jul-4 `no-store` fix + the new hourglass (below).
- Curriculum: fully seeded (329 works incl. Number Rods, Number Rods w/ Numerals, Red Rods, Brown Stair).
- Classroom visual memory (`montree_visual_memory`): **0 rows** (expected day one).
- Global visual memory (`montree_global_visual_memory`): **270 works, all active**, with ACCURATE
  discriminators (Number Rods = "alternating RED and BLUE segments"; Brown Stair = "uniform brown
  prisms, same length"). **This great data went unused for candidate recall.**

---

## 1. ROOT CAUSE (confirmed in code by Fable — take as given)

**Candidate generation is LEXICAL and AREA-LOCKED on the NAME Haiku guessed. Visual evidence never
reaches the shortlist.**

- `lib/montree/work-matching.ts` `matchToCurriculumV2` (~lines 430–504): filters the candidate pool
  to Haiku's stated `area_key`, then scores candidates by **name fuzzy-match only**. The full-curriculum
  retry (~line 495) only fires when best score `< 0.5` — a confidently-wrong exact name match
  ("Brown Stair" → Brown Stair = 1.0) **guarantees the escape hatch never runs**.
- The "materials boost" in `scoreWork` (~line 394) is fed `validated.observation` (the warm one-line
  sentence), **NOT the rich Pass-1 visual description**. So the phrase "red and blue segments" — the
  only decisive cue — is invisible to the matcher. (Verify the call site: `two-pass.ts` ~711–717.)
- When Pass 2 outputs the wrong name, the correct work (different name, different area) scores ~0 →
  never a candidate → **structurally unreachable**. Colour can't win because colour isn't consulted.
- Every safety net is keyed on the NAME being PRE-REGISTERED as confusable
  (`CROSS_AREA_CONFUSION_WORK_NAMES`, `CROSS_AREA_CONFUSION_COUNTERPARTS`). Brown Stair was NOT
  registered as a staircase-family member (Red Rods + Number Rods are). And Pass 2b's cold-start
  candidate filler explicitly excludes other areas (`two-pass.ts` ~line 419:
  `if (g.area !== targetArea) continue;`). Pass 2b DID fire for Photo A (cold classroom → trigger
  `!hasVisualMemoryForMatch`), but was handed only same-area Sensorial fillers → Number Rods was not
  choosable. **The re-look machinery works; its candidate recall is the bottleneck.**
- The curated Number Rods description that would have fixed it made the Pass-2 prompt only by a
  ~20KB budget "lottery" (~26 of 270 entries injected; `context-loader.ts` ~180, 334–357).

**Is registering confusion clusters whack-a-mole?** Yes. Saving grace: the domain is CLOSED (~330
standard works, ~10–15 real confusion clusters) so manual registration would converge in weeks. But
each un-fixed one costs a first impression you can't afford now. So we fix the CLASS, not the mole.

---

## 2. THE GOAL

Make candidate **recall driven by what the photo LOOKS LIKE** — embedding-similarity retrieval over
the 270 curated global-VM descriptions, **across all areas** — so the correct work is always
reachable regardless of the name Haiku guessed. This closes the failure CLASS.

**Targets (cold school, post-Step-1):** top-1 ≈ 85–92%, top-3-chip ≈ 95–97%, Gate A auto-file
precision ≥ 98%. Warms toward 95%+ top-1 as the classroom moat fills. 100% per-photo is impossible
for any system (combo scenes, odd angles) — the one-tap confirm loop handles the irreducible misses
AND is the moat-builder.

---

## 3. ALREADY DONE THIS SESSION (do not redo)
- ✅ **Animated hourglass** processing indicator on the photo-audit in-flight state
  (`app/montree/dashboard/photo-audit/page.tsx`, `ProcessingHourglass`, commit `c680e78a`). An
  in-flight photo shows a flipping sand-timer, not a bare box that reads as broken.
- ✅ Deep DB diagnosis (Section 0/1 above).
- ✅ Two Fable strategy analyses (root cause + systemic architecture recommendation).

---

## 4. BUILD PLAN — three steps, build in order, validate each before push

### STEP 0 — Insurance patch: register the staircase confusion cluster (ship FIRST, ~hours)
Protects the KNOWN failure for the next real user while Step 1 is built. Follows the existing
4-step registration playbook.

1. `lib/montree/work-matching.ts`: introduce a `CONFUSION_CLUSTERS` primitive (array of name-arrays)
   and derive the existing structures from it — `CROSS_AREA_CONFUSION_WORK_NAMES` ∪= all cluster
   members; `CROSS_AREA_CONFUSION_COUNTERPARTS[x]` = cluster minus x (values must be canonical global
   `work_name`s per the existing rule). Register the graduated-staircase family:
   `['pink tower', 'brown stair (broad stair)', 'brown stair', 'broad stair',
     'red rods (long rods)', 'red rods', 'number rods', 'number rods with numerals',
     'pink tower and brown stair']`. Migrate existing pairs into the primitive over time (leave them
   working). Update the scope-rule comment (~lines 180–185) — this cluster legitimately contains a
   cross-area (math) member.
2. Curated data — add MUTUAL negatives + re-seed:
   - `scripts/data/curated-visual-memory/sensorial.json` (Brown Stair): add
     `"NOT Number Rods: the Brown Stair is uniform BROWN prisms with no colour divisions; Number
     Rods are graduated rods banded in alternating RED and BLUE 10cm segments — any red/blue banding
     means Number Rods (Mathematics)."` Add a short Pink Tower negative too.
   - `scripts/data/curated-visual-memory/math.json` (Number Rods): add the mirror negative
     ("NOT Brown Stair: red/blue banded rods, not uniform brown prisms").
3. `lib/montree/photo-identification/visual-id-guide.ts` (~line 39): the confusion line currently
   teaches "blocks → Brown Stair" and omits colour. Rewrite it:
   `PINK TOWER vs BROWN STAIR vs RED RODS vs NUMBER RODS — uniform pink cubes → Pink Tower; uniform
   brown prisms → Brown Stair; uniform red rods → Red Rods; RED AND BLUE alternating segments →
   Number Rods (MATHEMATICS). Colour beats silhouette — check colour FIRST.` This lives in the cached
   static prefix (every Pass 2 call) — cheapest high-leverage line in the whole fix.
4. Validate: `node scripts/validate-curated-visual-memory.mjs` → `node scripts/seed-global-visual-memory.mjs`
   (re-seeds prod global VM via the pooler) → `node scripts/retest-cold-start.mjs` — controls MUST
   hold (Number Rods 3/3, Knobless, Metal Insets, Cylinder Block gate, Pink Tower combo caveat).

### STEP 1 — THE CLASS FIX: visual-similarity retrieval (~1–2 days)
1. **Migration** — add an embedding column to the global VM (pgvector already enabled; migration 242
   `tracy_corpus` is the precedent). New file `migrations/<next>_global_vm_embedding.sql` (check
   `ls migrations | grep -E '^[0-9]' | sort -n | tail` for the next number — CLAUDE.md references
   281, so likely 282):
   `ALTER TABLE montree_global_visual_memory ADD COLUMN IF NOT EXISTS embedding vector(1536);`
   Optionally an index (`ivfflat`/`hnsw`) — with only 270 rows it's optional; in-process cosine is
   fine (Fable). Optionally a `montree_global_vm_search(query_embedding, match_limit)` SECURITY
   DEFINER RPC mirroring `tracy_corpus_search` — OR skip the RPC and do in-process cosine over the
   cached 270 vectors (simpler; recommended for 270 rows).
2. **Backfill** — DECISION (Tredoux, Jul 4): run it as a **one-shot super-admin API route on
   Railway**, NOT a local script, so `OPENAI_API_KEY` never has to leave Railway (it's already there
   for Whisper) and `.env.local` doesn't need it. Build `app/api/montree/super-admin/embed-global-vm/route.ts`
   (super-admin-token gated + `x-cron-secret` accepted): for each active global-VM row, embed
   `visual_description` (+ `key_materials`) via `lib/montree/tracy/corpus/embeddings.ts`
   `embedTextBatch()` (OpenAI `text-embedding-3-small`, 1536-dim), write to `embedding`. Idempotent
   (`?force=1` to re-embed all; default only fills NULL `embedding` rows). RE-RUN after any seed change.
   Trigger it once from the super-admin Health/cron-triggers panel (or a curl with the cron secret).
3. **Runtime wiring** (the core change):
   - After Pass 1, embed the Pass-1 **visual description** (the real one, not the observation);
     retrieve **top-8 nearest global-VM works across ALL areas**.
   - Inject them as a `MOST VISUALLY SIMILAR LIBRARY WORKS` block into the **Pass 2 USER message**
     (NOT the system prefix — preserves both prompt-cache breakpoints, so Jul-3 caching economics
     survive). Replaces the 20KB budget lottery with per-photo targeted relevance and gives Pass 2 a
     chance to be right the FIRST time.
   - Feed the same top-K into `buildPass2bCandidates` as a NEW priority tier (after Haiku's guess +
     registered counterparts, BEFORE same-area fillers). Bump `MAX_CANDIDATES` 5 → 7.
   - **New Pass 2b force trigger:** if Pass 2's chosen work is NOT among the top-3 embedding neighbors
     → force Pass 2b. "The visual evidence disagrees with the name" is the signal that was missing.
   - **Fail-open:** any embedding error → current behavior, unchanged.
   - Watch the `+0.05` Pass 2b override margin (`two-pass.ts` ~line 888): for disagreement-triggered
     runs it can block a CORRECT override when Pass 2 was confidently wrong (≥0.85). Consider allowing
     equal-confidence override on disagreement-triggered runs — DECIDE FROM EVAL DATA (Step 2), not vibes.
   - Files: `two-pass.ts` (~711–717 matcher call site, ~797–804 Pass 2b trigger, ~286–425 candidate
     builder, ~888 override margin), `context-loader.ts` (~180, 334–357), the process route, and a new
     small `lib/montree/photo-identification/visual-retrieval.ts` for the embed+retrieve helper.
   - **Also fix:** make the matcher actually SEE the Pass-1 visual description (today it's passed the
     `observation` sentence). At minimum the retrieval must use the real description.

### STEP 2 — REAL eval harness (~2–3 days) — build so we never GUESS coverage again
- `scripts/eval-photo-id.mjs`: sample 150–300 `teacher_confirmed=true` photos WITH `work_id` from
  `montree_media` (Whale Class alone banks ~84/week — hundreds available), stratified across
  areas/works. Replay through the REAL pipeline in COLD mode (empty classroom VM + full global VM, via
  the harness's synthetic-cold-classroom trick in `scripts/_harness/pipeline-entry.ts`). Report:
  **top-1 accuracy, top-3-chip accuracy, Gate A auto-file precision, confusion matrix.** Run
  before/after every seed or pipeline change.
- Add permanent regression cases: Photo A `946613be-...` (`expect /number rods/i`) + a clean Brown
  Stair control (inverse-regression guard — real Brown Stair photos must NOT start flipping to Number Rods).

### ALSO (small, high-value — display + moat follow-through)
- Gallery: an unconfirmed `haiku_matched` photo (work_id set) currently renders indistinguishable from
  a confirmed one (`gallery/page.tsx` gates the ✓ affordance on `!photo.work_id`). Give it a subtle
  "AI-tagged" treatment + one-tap **✓ confirm / ✏️ wrong**.
- **Route gallery confirms through the corrections endpoint** so every tap seeds the classroom moat
  (open Jul-4 item — today only Wrap-Up confirms do). This makes the confirm loop the trust/learning
  moment, not an apology. Consider a "I'll recognise Number Rods in your classroom from now on" toast
  after a correction.

---

## 5. VALIDATION GATES (mandatory before EACH push)
- **Step 0:** validator passes → seed runs → `retest-cold-start.mjs` controls hold.
- **Step 1:** `eval-photo-id.mjs` before/after — no regression on controls; Photo A now resolves to
  Number Rods; Brown Stair control unregressed.
- **Every push:** ESLint clean on touched files (`npx eslint <files>`). Photo-audit page has a
  pre-existing `@ts-nocheck` error at line 1 — that's not yours, ignore it.
- Push via **Desktop Commander** from `~/Desktop/Master Brain/ACTIVE/montree` (per CLAUDE.md).

---

## 6. WHAT TREDOUX NEEDS TO DO (almost nothing — DECIDED Jul 4)
Both prior "to-dos" are handled without him moving secrets or granting desktop access:
1. **`OPENAI_API_KEY`** — NO ACTION. It's already in Railway (Whisper uses it). Runtime embeddings +
   the backfill both run ON Railway (backfill is a super-admin route now — see Step 1.2), so the key
   never leaves. `.env.local` does NOT need it.
2. **Embedding-column migration** — Tredoux runs SQL himself. PASTE the exact SQL directly in the
   chat (per the standing "everything runs from the chat" rule) and he runs it in the Supabase SQL
   Editor. Do NOT run schema changes via the pooler. (The pooler connection is fine for read-only
   diagnostics only.)
3. That's it. Everything else (code, backfill route, eval, re-seed, validation, pushes) is Claude's.
   Surface real decision points (e.g. the override-margin tuning) with eval numbers in hand.

---

## 7. ARCHITECTURAL RULES TO PRESERVE (do NOT break)
- Don't lower `HAIKU_TRUST_CONFIDENCE` (0.85) or the 0.90 first-sight bar — they SAVED Photo A from
  being auto-filed wrong.
- Keep the 20KB Pass-2 budget ceiling; retrieval injects into the **user message** (cache-safe). Don't
  bloat the system prefix (Session 117 attention regression is real).
- Don't touch Pass 1 (its description was correct; the failure is entirely downstream).
- Global VM is runtime-READ-ONLY; only `seed-global-visual-memory.mjs` writes it.
- Gate A: global VM NEVER satisfies Path 1 (classroom-VM-only trust). **Do NOT add a "Path 1.5"
  cold-start auto-confirm** — Photo A is the argument against it (it would rubber-stamp confident wrong
  answers at the schools least able to notice). Revisit only after real GateA telemetry from ≥3 cold schools.
- Colour/shape discriminators live in **curated negatives + the one guide line** (testable data), not
  free-text heuristics in code.
- New confusion clusters = DATA registration (cluster + mutual negatives + harness case), not code.

## 8. KEY REFERENCE (evidence + code map)
- DB: classroom `9a2fdaa2`; Photo A `946613be` (Number Rods→Brown Stair, WRONG); Photo B `e05b14da`
  (Brown Stair, CORRECT, work_id `85b09ad7`=se_brown_stair). Global VM 270 active; classroom VM 0.
- Code (from Fable): `work-matching.ts` 430–504 (area lock), 495 (blocked retry), 394 (observation-only
  boost) · `two-pass.ts` 711–717 (matcher call site — passes observation not description), 797–804
  (Pass 2b trigger), 419 (same-area filler lock), 286–425 (candidate builder), 888 (override margin) ·
  `context-loader.ts` 180, 334–357 (budget lottery) · `tracy/corpus/embeddings.ts` (embedText /
  embedTextBatch — reuse) · `migrations/242_tracy_corpus.sql` (pgvector precedent) ·
  `scripts/_harness/pipeline-entry.ts` (cold-mode replay).
- DB access from sandbox: parse `DATABASE_URL` password from `.env.local`, connect via pooler
  `aws-1-ap-southeast-1.pooler.supabase.com:5432`, user `postgres.dmfncjjtsoxrnvcdnvjq`, db `postgres`,
  ssl rejectUnauthorized:false, using the repo's `node_modules/pg` (run the script from inside the repo dir).

---

**THE ONE THING IF ONLY ONE SHIPS:** Step 0 (staircase cluster + Brown-Stair↔Number-Rods mutual
negatives + re-seed) — makes Number Rods reachable for this photo class today. But Step 1 (visual
retrieval) is THE FIX that closes the class. Build 0 → 1 → 2. Keep pushing until complete.
