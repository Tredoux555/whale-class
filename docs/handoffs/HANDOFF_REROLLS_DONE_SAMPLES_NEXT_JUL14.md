# HANDOFF — Video-critical rerolls 93/93 DONE · Sample renders AUTHORIZED (Jul 14, 2026, evening)

> **RESUME PROMPT:** Read `docs/handoffs/HANDOFF_REROLLS_DONE_SAMPLES_NEXT_JUL14.md`. Render the 2
> authorized sample videos (W03 word + W05 word) via `scripts/mvgen/curriculum-batch.py` — verify
> the batch script's expected song path first (§4 gotcha). Then report to Tredoux and STOP —
> samples only, no batch renders.

Supersedes the working state in `HANDOFF_IMAGE_TANDEM_JUL14.md` (protocol doc — still canonical
for HOW the tandem loop works). This doc = what actually happened + exact next step.

---

## 1. ✅ IMAGE CAMPAIGN — ALL 93 VIDEO-CRITICAL REROLLS FILED

Every video-critical REROLL item is done: Tredoux picked/downloaded all grids, reconciliation
matched → archived original → renamed pick to canonical filename → filed → visually verified.

- Ground truth: `docs/curriculum/video-audit/REROLL_RUN_QUEUE_JUL14.json` — all 93 `status:"filed"`.
- Originals archived: `English Curriculum 2026/_replaced_video_audit/Week NN/` (93 files).
- Match table: `docs/curriculum/video-audit/RECONCILE_MATCH_JUL14.json` (deterministic
  filename→prompt matcher: `reconcile_match_jul14.py`). Fable's filing of the 24 ambiguous items:
  `RECONCILE_REPORT_FABLE.json` + `reconcile_file_jul14.py`. 67 items were filed by orphaned Sonnet
  agents (no reports — structure + spot-checks verified clean). Run board appended:
  `docs/curriculum/MJ_GENERATION_RUN_JUL14.md`.
- #32 dog-vet.png + #87 lamb-knot.png were generated last (missing from first download wave),
  filed + eyeball-verified (cone-collar dog ✓, lamb-at-knot ✓).
- Minor flag (Tredoux's own picks, filed as-is): the three W55 fly picks vary slightly in
  color/eye design (grey/red-eyed vs green/orange-eyed). Consistency reroll = optional later.
- Unused duplicate re-picks still sitting in ~/Downloads (harmless): hero-fedora `d83c9273`,
  potato-fedora `35712179`, graduation `4881cfbf`.

**Prompt engineering note:** 45 of 133 REROLL_MANIFEST entries had placeholder/meta prompts, not
real MJ prompts. Fable authored real prompts for all of them against the canon table
(`VIDEO_AUDIT_MASTER_JUL14.md`). The paste-ready set (incl. authored ones): 
`docs/curriculum/video-audit/REROLL_PROMPTS_PASTE_JUL14.md`; the per-item `final_prompt` field in
the run queue JSON is authoritative for what was actually submitted.

## 2. 🎬 STANDING ORDER AMENDED — SAMPLES AUTHORIZED

Tredoux (in chat, this session): *"go ahead and generate a couple of sample videos for me."*
**This is the explicit go for A COUPLE OF SAMPLES ONLY.** Full batch rendering of the curriculum
still requires a separate go. The 21 stale pre-image-fix renders stay quarantined in
`~/Desktop/Music Videos/_stale_pre_image_fix/`.

## 3. 📊 COVERAGE AUDIT — fresh run (this session)

`scripts/curriculum/audit-video-coverage.py` re-run after all filing:
`docs/curriculum/VIDEO_COVERAGE_AUDIT_JUL14.md` + `video-coverage-audit-jul14.json` (regenerated).

- Avg lyric-line→image coverage 57.8% · **54 critical scene-line gaps across 24 weeks** ·
  448 ambiguous pairs · 471 unused images.
- Worst: W08 (17% avg, word song 0%). Best sample candidates: **W03 (81% avg, word 95%)**,
  **W05 (71%, word 85%)**, W09 (73%, word 90% — ⚠️ but W09 audio may still ≠ JSON lyrics per the
  Jul-11 Suno-copyright-rewrite warning; AVOID for samples unless reconciled).
- **Chosen samples: W03 "On the Mat" (word) + W05 "Sam Sat" (word)** — high coverage AND both
  weeks got reroll fixes today (showcases the corrections).
- The 54 critical gaps = alias-layer work (sung word vs filename mismatch), NOT missing art.
  **An alias-mapping pass keyed off this audit is the remaining step before full-curriculum
  top-spec renders.** Alias file: `scripts/mvgen/curriculum-video-aliases.json` (🚨 first token of
  an alias filename must be the sung anchor word).
- 🛠 Fixed this session (UNCOMMITTED): `audit-video-coverage.py` had hardcoded stale sandbox paths
  (`/sessions/modest-vigilant-edison/...`) — sed'd to `/Users/tredouxwillemse/...`.

## 4. ▶️ NEXT ACTION — the 2 sample renders

- Daemon healthy: `curl 127.0.0.1:8787/api/health` → `{"ok":true,"version":"2.0.0","ffmpeg":true}`.
- Driver: `scripts/mvgen/curriculum-batch.py` (runs ON THE MAC, stdlib; builds project under
  `~/Desktop/Music Videos/_projects/wNN-<role>/`, POSTs to the daemon; `--wait` blocks till done).
- **🚨 GOTCHA TO VERIFY FIRST:** the docstring says songs live at `Week NN/songs/`, but the real
  mp3s sit at week root: `English Curriculum 2026/Week 03/W03 On the Mat.mp3`. Read the script's
  song-discovery code (it may handle both) or `--dry-run` first; use `MVGEN_*` env overrides if
  needed. Do NOT bulk-move song files to make the script happy without checking what else reads them.
- Commands (after verifying):
  `python3 scripts/mvgen/curriculum-batch.py --week 3 --song word --wait`
  `python3 scripts/mvgen/curriculum-batch.py --week 5 --song word --wait`
- After render: WATCH the outputs (frame-check per the Jun-14 runtime-audit rule + check the shot
  report self-flags), then report to Tredoux and STOP.

## 5. Remaining image work (queued, not urgent)

REROLL non-critical: 30 book + 10 nice-to-have. GENERATE leftovers: 8 (1 book + 7 nice).
Same tandem/batch flow; prompts in the manifests (book/nice REROLL entries may also carry
placeholder prompts — author real ones per §1's note before submitting).

## 6. Ops lessons (this session)

- User-interrupted Agent launches: the FIRST batch (4 parallel) all spawned as orphans and did
  real work (67 items filed, no reports); the SECOND batch (2 parallel) never spawned at all.
  Direct by ground truth only (file counts/ctimes), never by launch status.
- `mv` preserves mtime — use `stat -c %z` (ctime) to date archive operations.
- MJ default download filenames embed the prompt prefix → deterministic matching works
  (40-char normalized prefix; same-prefix clusters need visual disambiguation).
- MJ reference library persists account-side — cast orefs attach in ONE click from the panel
  (no re-upload; verify the tile visually before use).
- Tredoux's Cowork turn stalled ~1h on "Server is busy" retries — work was already safe on disk;
  nothing was lost. Prefer small atomic disk writes so a stall never strands state.

## 7. Uncommitted files (Tredoux pushes via Desktop Commander when ready)

New: this handoff · `REROLL_RUN_QUEUE_JUL14.json` · `RECONCILE_MATCH_JUL14.json` ·
`RECONCILE_REPORT_FABLE.json` · `reconcile_match_jul14.py` · `reconcile_file_jul14.py` ·
`REROLL_PROMPTS_PASTE_JUL14.md` · `REROLL_PICK_LIST_JUL14.md` · regenerated
`VIDEO_COVERAGE_AUDIT_JUL14.md` + `video-coverage-audit-jul14.json`.
Modified: `audit-video-coverage.py` (path fix) · `MJ_GENERATION_RUN_JUL14.md` (appended).
