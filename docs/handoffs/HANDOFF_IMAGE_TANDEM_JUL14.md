# HANDOFF — Image Correction Campaign: The Tandem Protocol (Jul 14, 2026)

> **RESUME PROMPT:** Read `docs/handoffs/HANDOFF_IMAGE_TANDEM_JUL14.md`. Check browser connected.
> Run the tandem protocol §🤝 from REROLL_MANIFEST video-critical item 1. No videos, no exceptions.

---

## 1. Where this sits

This is the direct continuation of the overnight/day Jul 14 work documented in
`docs/handoffs/HANDOFF_VIDEO_CERTIFICATION_JUL14.md` (mvgen mechanism) and the visual audit run
in `docs/curriculum/VIDEO_AUDIT_MASTER_JUL14.md` (the 58-week canon table + Tredoux's veto list).
Read those two first if you need the "why" behind any of this — this doc only covers **current
state + what happens next.**

---

## 2. STATE as of Jul 14 (end of day)

### 2a. Mechanism — CERTIFIED, done, do not re-open without cause
The mvgen phrase-matcher overhaul is complete and shipped: commits `94e6a6b8` → `14cbb454` →
`cfb8fd22` → `9c2500f8`, all pushed. 108/108 tests green. Shot reports now self-flag misses.
Alias layer lives at `scripts/mvgen/curriculum-video-aliases.json`.

**🚨 Alias rule:** the FIRST token in any alias entry must be the sung anchor word — the matcher
keys off it. Get this wrong and the alias silently never fires.

Full detail, including the audio-hash cache fix, is in `HANDOFF_VIDEO_CERTIFICATION_JUL14.md`.

### 2b. 🚨 STANDING ORDER — NO VIDEO RENDERS (Tredoux, said twice)
**No video renders of any kind — not even samples — until Tredoux explicitly says go.** This
applies even after all 141 image items below are fixed. All 21 previously-rendered video folders
(pre-image-fix, now stale) were quarantined to
`~/Desktop/Music Videos/_stale_pre_image_fix/` — do not review or trust anything in there.

The mvgen daemon may keep running on `:8787` — leave it up, but **use it for nothing** until the
go-ahead.

### 2c. Image campaign — GENERATE phase done
Full 58-week visual audit (every image in every week actually viewed) produced two manifests plus
a canon table:
- `docs/curriculum/video-audit/GENERATE_MANIFEST.json` — images that didn't exist yet
- `docs/curriculum/video-audit/REROLL_MANIFEST.json` — images that exist but are wrong/bad
- `docs/curriculum/VIDEO_AUDIT_MASTER_JUL14.md` — canon table + Tredoux's veto list

**114 of 114 video-critical GENERATE items are DONE** — generated, eyeball-verified, and filed to
`Week NN/images/`. Run board with the standing MJ automation rules:
`docs/curriculum/MJ_GENERATION_RUN_JUL14.md`.

**Standing MJ rules (from that run board — still apply to every remaining submission):**
- Wait 8 seconds after `file_upload` completes before submitting an `--oref` job (race condition
  otherwise).
- Watch for oref species/style-match drift — verify the generated grid actually matches the
  reference subject before accepting.
- The submit-icon screen coordinate SHIFTS when the reference panel is open — don't reuse a
  cached click position.
- Downloads are 2-step (open the CDN image, then save) — a direct right-click-save on the
  in-app thumbnail grabs a low-res compressed version.
- Submit jobs ONE AT A TIME — MJ silently drops rapid batch submissions.

### 2d. REMAINING — 141 items, none done yet
- `REROLL_MANIFEST.json`: **all 133 entries** (93 video-critical + 30 book + 10 nice-to-have) —
  NONE done.
- `GENERATE_MANIFEST.json`: **8 leftover non-critical entries** (1 book + 7 nice-to-have) — not
  done (the 114 video-critical generates from this manifest ARE done, see 2c).

Manifests: `docs/curriculum/video-audit/GENERATE_MANIFEST.json` +
`docs/curriculum/video-audit/REROLL_MANIFEST.json`.
Canon table + veto list: `docs/curriculum/VIDEO_AUDIT_MASTER_JUL14.md`.

### 2e. Why the workflow is changing
Tredoux's feedback on the 114 already-generated images: some of the agent's own picks from the
4-grid weren't the best option available. The grid often had a *better* pick than the one the
agent chose. → New workflow below puts picking in Tredoux's hands, not the agent's.

### 2f. Also this session (unrelated side items, for the record)
- `english_program` is live on Whale: migration 293 run, 58 works seeded, 4 QA classrooms also
  seeded (cleanup of the QA classrooms is optional, not urgent).
- `_all_images_flat` folder renamed for the photo bank — Tredoux uploads it manually, no action
  needed from an agent.

---

## 3. 🤝 THE TANDEM PROTOCOL (Tredoux's design)

**Claude = prompt machine. Tredoux = picker/downloader.** This is the loop for all 141 remaining
items (REROLL_MANIFEST in full, then GENERATE_MANIFEST's 8 leftovers).

### Step 0 — before starting
Fresh session verifies:
- The Chrome extension is connected.
- `midjourney.com/imagine` is logged in and reachable.

### Step 1 — order of work
Work `REROLL_MANIFEST.json` **video-critical items, week-ascending, first.** Then REROLL's book
items, then REROLL's nice-to-have items. Then finally the 8 leftover `GENERATE_MANIFEST.json`
non-critical items.

### Step 2 — the agent's ONLY job per item
A browser agent works one item at a time and does exactly three things, nothing more:
1. Submits the item's `mj_prompt` (with `--oref` per the manifest, respecting the 8-second wait
   rule from §2c).
2. Posts a one-line status card to the chat/board:
   `SUBMITTED #N — Week NN <filename> — FIXES: <issue> — look for: <what the right pick shows>`
3. Immediately preps and submits the next item.

**The agent does NOT pick a grid tile. The agent does NOT download anything.** That discipline is
the entire point of this protocol — it's what's different from the GENERATE phase, and it's a
direct response to Tredoux's feedback in §2e.

### Step 3 — Tredoux picks and downloads
Tredoux, in his own MJ window, picks his favorite of each 4-grid and downloads it. His downloads
land in `~/Downloads` with MJ's default filenames (unrenamed, timestamp/jobId-ish).

### Step 4 — reconciliation pass (every ~20 items, or at the end)
A Sonnet agent runs a reconciliation pass:
1. Match `~/Downloads` files to manifest entries — use mtime order plus MJ jobId/prompt text
   matching (do not assume simple chronological order alone; verify against the submitted-prompt
   log from Step 2).
2. **For REROLLS:** archive the ORIGINAL file first —
   `Week NN/images/<filename>` → `English Curriculum 2026/_replaced_video_audit/Week NN/`
   — **before** filing the new one. Then rename+move the Tredoux-picked download into
   `Week NN/images/<original filename>` (same filename as before, so nothing else in the repo
   needs to change).
3. **For GENERATES (the 8 leftovers):** rename+move the download under the manifest's target
   filename. Never overwrite an existing file blind — if something's already there, stop and flag
   it.
4. Update the relevant run board (extend `MJ_GENERATION_RUN_JUL14.md` or start a reroll-specific
   log — either is fine, just keep it current).
5. **Verify every filed image by actually reading it** — right subject, defect actually fixed
   versus the manifest's stated issue. Flag anything doubtful to Tredoux rather than silently
   accepting a maybe-still-wrong image.

### Step 5 — pace
Submit in batches of ~10, then confirm Tredoux is keeping up (i.e., has picked/downloaded roughly
that many) before continuing to the next batch. Don't flood the queue past what he can review.

### Step 6 — after all 141 are done
1. Re-run `scripts/curriculum/audit-video-coverage.py`.
2. Do a final visual spot-audit of the rerolled files (not just re-run the script — actually look
   at a sample).
3. Report results to Tredoux.
4. **THEN WAIT.** Video samples — even a single sample render — happen only on Tredoux's explicit
   word. Do not render anything preemptively "to save time."

---

## 4. Quick reference — file locations

| What | Path |
|---|---|
| Mechanism certification handoff | `docs/handoffs/HANDOFF_VIDEO_CERTIFICATION_JUL14.md` |
| Visual audit canon table + veto list | `docs/curriculum/VIDEO_AUDIT_MASTER_JUL14.md` |
| Generate manifest | `docs/curriculum/video-audit/GENERATE_MANIFEST.json` |
| Reroll manifest | `docs/curriculum/video-audit/REROLL_MANIFEST.json` |
| MJ generation run board (standing rules) | `docs/curriculum/MJ_GENERATION_RUN_JUL14.md` |
| Alias layer (mvgen) | `scripts/mvgen/curriculum-video-aliases.json` |
| Stale pre-image-fix video renders (quarantined, do not use) | `~/Desktop/Music Videos/_stale_pre_image_fix/` |
| Archived originals from reroll (created as-you-go) | `English Curriculum 2026/_replaced_video_audit/Week NN/` |

---

## 5. Rules recap (do not violate)

- 🚨 **No video renders, no samples, until Tredoux's explicit go.**
- 🚨 **Agent never picks a grid tile, never downloads.** Prompting only.
- 🚨 **Archive before overwrite** on every reroll — the original always goes to
  `_replaced_video_audit/Week NN/` first.
- 🚨 **Alias first token = sung anchor word** (mvgen alias layer).
- 🚨 8s wait after file_upload before oref submit · one MJ submission at a time · verify oref
  species/style match · 2-step CDN download for the reconciliation agent's own reference use.
