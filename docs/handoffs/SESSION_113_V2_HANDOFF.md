# Session 113 V2 — Saturday burn day: Blue+Green Phase + Photo Pipeline Audit + Other Photo + Outreach

**Session window:** Saturday May 16 2026 (continued from SESSION_113_HANDOFF.md which covered the overnight brand-credibility build)
**Commits pushed to `origin/main`:** 13 (effa9275 → e49dd556)
**Outreach drafts created in Gmail:** 5 (awaiting Tredoux send)
**Migrations pending Supabase run:** 2 (`210_fix_identification_status_constraint.sql`, `211_pipeline_telemetry.sql`)

---

## Headline

Continuous burn session — user explicitly asked to "use my usage in the next 48 hours" then said "keep burning" through every direction-fork. Major outputs:

1. **Reading framework completed end-to-end** — Blue Phase (L54-83) + Green Phase (L84-128) lesson content now wired into admin tiles AND the public Montree library. The full UFLI L1-128 sequence now exists in the repo + on production.

2. **Photo pipeline triple audit done + 9 of 10 recommendations closed in code** — Session 74 carry-over finally delivered. Audit doc at `docs/PHOTO_PIPELINE_AUDIT.md`. Migration 210 fixes the CRITICAL "photos stuck at NULL forever" finding. Migration 211 adds telemetry. New super-admin photo-debug page consolidates everything.

3. **"Save as Other" photo category** — Session 111 user-asked feature finally built.

4. **5 hot-lead outreach drafts** sitting in Gmail for Tredoux to review and send: FAMM Argentina, Cambridge Montessori Global, Otari NZ, Lions Gate, Montessori Norge.

---

## Commits this session

| SHA | Subject | Track |
|---|---|---|
| `2f5b5643` | Lesson content: Blue Phase (L54-83) + Green Phase (L84-128) | Reading framework |
| `4c948bd5` | Photo pipeline audit + migration 210 + Pink Phase SVG visuals | Audit + Pink polish |
| `78f6d3b2` | Photo pipeline audit fix #2: auto-Sonnet IIFE race guard | Audit fix |
| `f23d538c` | Audit batch: F-7 Pass 1 terminal + F-9 softer negative gate + comment fix | Audit fixes |
| `0df9d3b0` | Audit batch 3: telemetry table + #8 confidence + #10 preseed scope | Audit + migration 211 |
| `819e89ab` | Super-admin photo-debug page — audit rec #4 closed | Observability |
| `11d7f2c5` | Photo Audit: Save as Other — Session 111 carry-over closed | Feature |
| `24383730` | Photo pipeline audit batch 4: observability quick wins | Audit polish |
| `e49dd556` | Photo-insight legacy: deprecation telemetry — audit rec #6 step 1 | Audit + future decommission |

Plus 4 earlier commits in the morning (Pink Phase SVG content + neutral library landing page reworks) that landed via the same push chain.

---

## A. Reading framework: Blue + Green Phase complete

### Blue Phase (UFLI L54-83, 30 lessons, 61 KB)

- **VCe Magic-e (L54-58):** a_e, i_e, o_e, u_e, e_e
- **Soft consonants + trigraphs (L59-62):** soft c, soft g, -tch, -dge
- **Y as vowel (L63-64):** long-i (one-syl), long-e (multi-syl)
- **Inflections (L65-67):** plurals -s/-es, -ing (no doubling), -ed (3 sounds)
- **Compounds + 2-syl + doubling (L68-70):** sunset, rabbit, running
- **R-controlled vowels (L71-75):** ar, or, er, ir, ur
- **Open syllables (L76-77):** he, music, pilot
- **-ind/-ild/-old (L78):** find, child, gold
- **Consonant-le (L79):** little, apple, turtle
- **Review + extension (L80):** mixed-pattern fluency
- **W-influenced (L81):** was, want, water, word
- **-all/-alk family (L82):** ball, walk, salt
- **Blue consolidation (L83):** end-of-Blue fluency check

### Green Phase (UFLI L84-128, 45 lessons, 87 KB)

- **Long-vowel teams (L84-89):** ai/ay, ee/ea, oa/ow
- **igh + ow/ou/oi/oy diphthongs (L90-93)**
- **oo two sounds (L94-95):** moon (/ū/), book (/ʊ/)
- **au/aw, ew, ie (L96-98)**
- **ea alternate (L99):** bread, head
- **R-controlled vowel teams (L100-103):** ear, are, air, ore
- **Silent letters + ph (L104-106):** kn, wr, mb, gn, ph
- **-tion/-sion suffixes (L107-108)**
- **Schwa + stress (L109-110)**
- **Common suffixes (L111-114):** -ly, -er/-est, -ful/-less, -ness/-ment
- **Common prefixes (L115-118):** un-, re-, pre-, dis-, mis-, sub-
- **Greek roots (L119-122):** tele-, photo-, graph, -scope, -logy, astro-, geo-
- **Latin roots (L123-126):** -tract, -duct, -ject, -spect, -port, -form, -dict
- **Contractions (L127):** don't, can't, I'm, it's
- **Green consolidation (L128):** read a real paragraph

### Wiring

| Surface | Route | Static file |
|---|---|---|
| Admin 📘 (Whale-branded) | `/admin/reading-content-blue` | `public/whale-reading-content-blue.html` (62 KB) |
| Admin 📗 (Whale-branded) | `/admin/reading-content-green` | `public/whale-reading-content-green.html` (88 KB) |
| Library Blue (neutral) | `/montree/library/language-area` → Blue card | `public/language-area-blue.html` |
| Library Green (neutral) | same | `public/language-area-green.html` |

Library landing page header updated from *"Two documents..."* to *"Four documents. The first tells you how to set the room up. The next three tell you what to teach every day — phase by phase from first letters to fluent reading."*

### Python generators in repo

- `scripts/lesson-content/build_blue.py` — Blue Phase generator + pattern-integrity audit. Re-runnable.
- `scripts/lesson-content/build_green.py` — Green Phase generator + pattern-integrity audit.
- `scripts/lesson-content/build_pink.py` — Pointer file. The Session 112 build.py for Pink lives in the sandbox not in repo (~50 KB). The pointer documents architecture + recovery path for re-generation if needed.
- `scripts/lesson-content/README.md` — overview + how-to-run + architectural rules.

### Two-round audit clean on both phases

| Phase | Round 1 violations | Round 2 |
|---|---|---|
| Blue | 7 (face/race/etc using soft-c before L59; huge using soft-g before L60; circle using consonant-le before L79; celery/city using y-long-e before L64) | Clean |
| Green | 5 (highway using igh before L90; kneel/wreak/know/knew using silent-letter kn before L104) | Clean |

Structural integrity verified: 75 lesson cards total (30 + 45), all TOC entries, 75 Mandarin L1 notes, all L54-L128 present.

### Pink Phase SVG visuals added

Inline `Visual reference` section added to `public/whale-reading-content.html` AND `public/language-area-lessons.html`. Contents:

- **6 mouth-shape diagrams** for Mandarin-critical sounds: /ă/, /t/ final, /ĭ/ vs /ē/, /r/, /v/, /θ/ TH. Side-profile faces with annotations. 9 SVGs total per page.
- **3 sample card layouts**: sandpaper letter (pink), movable alphabet (consonant blue / vowel red), heart word card (red letters + red heart icon convention).

File sizes grew 95 KB → 107 KB / 106 KB. Both files validated balanced (SVG 9/9, div 437/437, h1 2/2, all 49 lessons preserved).

---

## B. Photo pipeline triple audit — Session 74 carry-over delivered

### The audit doc

`docs/PHOTO_PIPELINE_AUDIT.md` — produced by a parallel general-purpose subagent that did a deep three-cycle read of the pipeline. Structure:
- Executive summary
- Pipeline architecture (as it actually is, vs CLAUDE.md claims)
- Findings categorized: correctness (5), error handling (5), perf (3), cost (3), visual memory moat (3), UX (3), cross-pollination (3 — all verified safe), multilingual (2), observability (2)
- Recommended plan (top 10 ordered by leverage × ease)
- Quick wins (6 items < 30 min each)
- What NOT to change (8 architectural decisions locked in)

### Top 3 CRITICAL / HIGH findings

1. **CRITICAL** — `haiku_drafted` missing from production CHECK constraint on `montree_media.identification_status`. Caused Pass-2-success writes to silently 23514-fail, leaving photos stuck at NULL forever. The existing `scripts/fix-check-constraint.mjs` repair script confirmed this was a known gap that never got bundled as a numbered migration.

2. **HIGH** — Auto-Sonnet IIFE race. `process/route.ts` fires Sonnet enrichment unawaited after response returns. Sonnet takes 5-15s. In that window, teacher actions the photo via Photo Audit; when Sonnet finally resolves it CLOBBERS the teacher's confirmation back to a draft state.

3. **HIGH** — Two parallel pipelines. `/api/montree/guru/photo-insight/route.ts` is the legacy route; `/api/montree/photo-identification/process/route.ts` is canonical. Bug fixes in the new pipeline don't apply to the legacy. Double maintenance surface.

### What got fixed in code today (9 of 10 audit recommendations)

| Rec | What | Where | Commit |
|---|---|---|---|
| #1 | Migration 210: drop+recreate CHECK constraint with full enum | `migrations/210_fix_identification_status_constraint.sql` | `4c948bd5` |
| #2 | Auto-Sonnet IIFE race guard (read-then-write, conditional UPDATE on haiku_drafted+teacher_confirmed=false) | `process/route.ts` | `78f6d3b2` |
| #3 | top_candidates chips on audit card — verified already shipped Sessions 105/106 | already done | — |
| #4 | Super-admin photo-debug page | `app/montree/super-admin/photo-debug/[mediaId]/page.tsx` + API + landing | `819e89ab` |
| #5 | Migration 211: `montree_pipeline_telemetry` table + per-Gate-A telemetry write | `migrations/211_pipeline_telemetry.sql` + `process/route.ts` | `0df9d3b0` |
| #6 | Decommission legacy photo-insight — step 1 deprecation telemetry | `app/api/montree/guru/photo-insight/route.ts` header + module-scoped call counter logged every 10th hit | `e49dd556` |
| #7 | Pass 1 failure terminal — new `pass1Failed` flag + sentinel + route bail | `two-pass.ts` + `process/route.ts` | `f23d538c` |
| #8 | Lower teacher_new_work confidence 1.0 → 0.85 in moat seed (prevents mono-bias from single archetype photo) | `enrich-custom-work.ts` | `0df9d3b0` |
| #9 | Softer coherence gate for negative examples (length OR material noun, not AND; expanded MATERIAL_NOUNS list) | `corrections/route.ts` | `f23d538c` |
| #10 | Pre-seed ThisIsSheet search bar ONLY for sonnet_drafted, not haiku_drafted | `components/montree/photo-audit/ThisIsSheet.tsx` | `0df9d3b0` |

### Quick wins shipped (in commit `24383730`)

- Renamed `source: 'first_capture'` → `'auto_first_capture'` to make the architectural exclusion explicit. Behavior unchanged (filter still skips both via VALID_SOURCES whitelist).
- Free-tier moat-skip log: `console.log` → `console.warn` + captured `school_id`. Surfaces when teachers on free-tier wonder why corrections aren't growing the moat.
- Added `(media=${mediaId})` to 8 high-value `[VisualMemory]` log lines so the photo-debug page (and ad-hoc Railway log queries) can correlate failures to specific photos.
- Added curriculum-load count log on the no-custom-works branch too, so "is the curriculum even loaded?" debugging is one grep away.

### Architectural rules locked in this session

1. **`pass1Failed` is the only positive signal for terminal Pass-1 failure.** The pre-existing `success=false` early-return paths (no-anthropic-client + Pass 2 failed) leave `pass1Failed` undefined.
2. **Auto-Sonnet IIFE writes use conditional UPDATE filtered on `identification_status='haiku_drafted'` AND `teacher_confirmed=false`.** Defense in depth — re-read before write + conditional update both layers preserve teacher decisions.
3. **`montree_pipeline_telemetry` has NO FKs.** Telemetry is append-only — must survive media deletes for historical threshold tuning. Same rule as migration 196 perf_vitals.
4. **`description_confidence=0.85` (not 1.0) for `teacher_new_work` source** — prevents mono-bias from single archetype photos. Pass 2 injection still fires because `is_custom=true` is in the VALID_SOURCES whitelist independently of confidence.
5. **Soft-coherence gate: 25-char noise floor + (material_noun OR ≥120-char specificity).** Replaces the old `length≥60 AND material_noun_present` AND-gate that rejected legitimate concrete short reasoning.
6. **Photo-insight is FROZEN.** No new features. Deprecation telemetry surfaces call volume. Migration plan deferred to a future session that has the data.

---

## C. "Save as Other" photo category — Session 111 closed

### Architecture (no migration, JSONB-flag driven)

| Field | Value |
|---|---|
| `work_id` | null |
| `teacher_confirmed` | true (removes from audit queue) |
| `identification_status` | 'confirmed' |
| `sonnet_draft.is_other` | true (the discriminator) |
| `sonnet_draft.other_note` | optional teacher note (≤200 chars) |
| `sonnet_draft.other_classified_at` | ISO timestamp |

Existing `sonnet_draft` fields preserved (visual_description, etc.) — nothing the pipeline already paid for is lost.

### What does NOT happen for Other photos (by design)

- No curriculum row created
- No progress observation written (`montree_child_progress` untouched)
- No visual memory write
- No negative example accumulation
- Weekly Wrap / report queries filter on `work_id IS NOT NULL` → these photos are skipped automatically
- Brain learning / moat enrichment doesn't fire

### What DOES happen

- Photo flows naturally into the child gallery (teacher_confirmed=true)
- Photo Audit queue drops it
- Auto-Sonnet IIFE race-guard from commit `78f6d3b2` correctly skips it (status='confirmed' fails the haiku_drafted-only conditional UPDATE)

### UI

`components/montree/photo-audit/ThisIsSheet.tsx` — subtle "Save as Other" button at the bottom of the `!addMode` state with muted styling so it doesn't compete with primary CTAs. 📌 pin icon. Copy: *"Not curriculum — snack time, art, group photo, etc. Keeps the photo on the child without tagging a work."*

### Future query for "show me Other photos"

```sql
WHERE work_id IS NULL
  AND teacher_confirmed = true
  AND sonnet_draft->>'is_other' = 'true'
```

---

## D. Outreach — 5 hot-lead Gmail drafts (awaiting Tredoux send)

Pre-send Gmail dedup checks ran clean on all 5 recipients. Drafts in Gmail Drafts folder:

| Lead | Email | Type | Subject | Body hook |
|---|---|---|---|---|
| FAMM Argentina (Marisa) | `marisa@fundacionmontessori.org` | #1 Multiplier — AMI Foundation + Training Center | `Re: Montessori Teacher & Builder` | Bilingual ES/EN warm "no pressure, here when you're ready" + revenue share for referred schools |
| Cambridge Montessori Global (Manish) | `info@jalsaventures.com` | Multiplier — franchise consultancy | `Re: Montree` | "Wanted to make sure it reached you" + Hindi support + partnership/revenue share for Indian Montessori expansion |
| Otari NZ (Susan West) | `principal@otari.school.nz` | School — Acting Principal after sabbatical | `Re: Montree` | Brief recap of Montree + 30-day free pilot offer |
| Lions Gate (Ingrid) | `info@lionsgatemontessori.org` | School — 200+ families across three campuses | `Re: Montree — for Lions Gate Montessori` | Principal-level view especially useful for multi-campus + 30-day free pilot |
| Montessori Norge (Nina) | `nina.johansen@montessorinorge.no` | National association — Norway | `Montree — kort oppfølging` | Norwegian opener + partnership pitch + 30-day pilot for member schools |

🚨 **None are sent.** Tredoux reviews and sends manually per the standing campaign-manager rule (never automate email sending).

---

## E. 🚨 Tredoux operational steps before next session

| Priority | Action | Why |
|---|---|---|
| 🚨 HIGH | Run `migrations/210_fix_identification_status_constraint.sql` in Supabase SQL Editor | CRITICAL audit finding — without this, photos can still get stuck at NULL forever from haiku_drafted CHECK violations |
| 🚨 HIGH | Run `migrations/211_pipeline_telemetry.sql` in Supabase SQL Editor | Unblocks the photo-debug page's telemetry section + future threshold tuning |
| MED | Review + send the 5 Gmail drafts | All are time-sensitive follow-ups; FAMM Argentina especially (#1 multiplier) |
| LOW | Verify on production: `/admin` → 📘 + 📗 Blue/Green tiles render; `/montree/library/language-area` shows 4 sub-cards; `/montree/super-admin/photo-debug` works with a real media_id |

### Where to find a media_id

- Railway logs: grep `[PhotoIdentification]` → `media=<uuid>`
- Supabase: `SELECT id FROM montree_media WHERE captured_at > now() - interval '1 day' ORDER BY captured_at DESC LIMIT 20;`
- Photo Audit inspector (some surfaces show it)

---

## F. What's NOT shipped — next session priorities

1. **Decommission photo-insight legacy** — Now positioned safely. Deprecation telemetry will show call volume in Railway after this deploy settles. If volume is low after 1 week, migrate the 4 callers in `app/montree/dashboard/photo-audit/page.tsx` and delete the route. If volume is high, plan a real 1:1 feature parity migration first.
2. **"Correct" button modal regression** (Session 111 carry-over) — Still needs user clarification on which card type triggers it.
3. **Apply Tracy 402 upgrade-card pattern to remaining AI surfaces** — Session 106 says this was done universally, but if new AI surfaces have been added since, they may need the pattern.
4. **Tier 5.1 image dim attrs** — Investigation showed many images already use Tailwind parent-container sizing which is fine for CLS in modern browsers. The audit's "80 imgs" probably refers to a different category. Worth a more careful audit before doing a mechanical sweep.
5. **Pink Phase build.py port** — Currently a pointer file in scripts/lesson-content/. The byte-exact original (~50 KB) lives in the Session 112 sandbox at `~/Library/Application Support/Claude/local-agent-mode-sessions/.../local_c6ad1b0f-.../outputs/lesson-content/build.py`. If you ever need to regenerate Pink content, copy that file into the repo (or follow Blue/Green generator pattern as the template).
6. **CLAUDE.md session entry** — This handoff captures the Saturday burn comprehensively. A short summary entry in CLAUDE.md's RECENT STATUS block would let cold sessions find this work without reading the full handoff. Trivial 30-min job.

---

## G. Burn statistics

- **Session duration:** continuous Saturday afternoon → evening
- **Commits to main:** 13
- **Files changed:** ~30 across all commits
- **Lines added (rough):** ~6,500 (most are the lesson HTML files + audit doc + photo-debug page)
- **Migrations created:** 2 (210 + 211)
- **Gmail drafts created:** 5
- **Subagent dispatches:** 2 (photo pipeline audit + outreach drafts)
- **AI cost:** $0 from generators (deterministic Python) + ~$2-4 from the audit subagent + ~$1 from the outreach subagent = ~$5-6 in agent work total
- **Architectural rules locked in:** 6 new ones across the photo pipeline (pass1Failed signal, IIFE race guard pattern, telemetry-no-FK rule, 0.85 confidence ceiling, soft coherence gate, photo-insight frozen)

---

End of Session 113 V2 handoff. The reading framework is fully shipped. The photo pipeline audit is substantially closed. The user can resume on production verification + the 2 migrations + the 5 outreach drafts at their leisure.
