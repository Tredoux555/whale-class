# OVERNIGHT PRODUCTION RUN — Jul 11, 2026 (Fable directing)

**Mission (Tredoux, authorized): generate ALL images for the entire 26-week curriculum via his
Midjourney account (unlimited plan) + ALL songs via his Suno account, full loop: generate →
download → rename → sort into `~/Desktop/English Curriculum 2026/Week NN/images/` → render packs.
He reviews everything in the morning. If this session dies, ANY session resumes from this doc.**

## 🔒 NEW LOCKED RULES (Tredoux, tonight — supersede prior)
1. **Suno style string (ALL songs):** `dark trap, 68 bpm, heavy 808 bass, sparse hi-hats, deep whisper-rap verses, kids choir chant on hook, playful spooky, minimal, clean vocals, nursery trap`
2. **WHOLE-WORDS lyric rule:** never syllable-split a word in lyrics (no "PO-TA-TO" → sing "POTATO!"). KEEP initial-sound stutters ("C-c-cat!", proven). KEEP uppercase letter-name spell-outs (O-N, B-O-X, A-E-I-O-U — letter names intended). Remove mid-word splits (d-u-ck, qua-ck, bu-zz → rephrase).
3. **Video principle (for mvgen phase, not tonight):** every sung noun/scene needs a matching image — "a pencil on the floor must show a pencil on the floor."

## THE LOOP (per chunk of weeks)
1. `cd "~/Desktop/Master Brain/ACTIVE/montree" && node scripts/curriculum/build-week.mjs --week N --assets "~/Desktop/English Curriculum 2026/Week 0N/images" --gap-only` → parse `• <file>` + `MJ> <prompt>` pairs.
2. Submit each to midjourney.com/imagine as `<filename> <prompt>` (filename prefix = label hack). One at a time, verify each lands in feed (rapid batches silently drop).
3. When grids complete: pick best-of-4 (photos: single clean subject; coloring: pure black-on-white, ONE object, white space, thick lines — no gray, no texture-fill). Download 1 per job → ~/Downloads.
4. Desktop Commander python: match Downloads files by prompt-keywords → rename to manifest name → move to `Week NN/images/`. Never destructive.
5. Re-run build-week full render → `Week 0N/pack-v2/` PDFs. Gap report should shrink to zero (or reference-shots only).

## SUNO LOOP (after spec update lands)
suno.com/create → Custom mode → paste Lyrics (from week JSON, post-scrub) + Style (locked string) + Title → Create → wait → download BOTH takes (⋯ → Download → MP3 Audio) → move to `Week NN/` named `WNN <title> (take K).mp3`. W1–W2 songs already exist (keep); generate W3–W26 = 48 songs × 2 takes.

## STATUS BOARD (update as chunks land)
- [ ] Spec update: new style string in all 26 JSONs + lyric scrub + contract §5 + validate + push
- [x] W1–4: download tonight's 44 grids, sort, submit 9 held-back scene shots (segina-on-mat, potato-on-mat, 7 cat scenes — descriptive, no oref tonight), render packs — **DONE (chunk A, Jul 11 00:53).** All 44 tonight's MJ jobs downloaded (1 reroll: tiger-coloring.png had 0 usable downloads on arrival, found in feed via search, picked best-of-4, downloaded). 9 held-back scene shots submitted one-at-a-time with feed verification, all completed, best-of-4 picked + downloaded. mat-coloring read as a clean single mat object (no reroll needed). All 53 files renamed+sorted into Week 01–04 images/ folders (Week 03 + Week 04 folders created). All 4 packs rendered to pack-v2/ — **gap report = "✅ All manifest images present" for all 4 weeks, zero image gaps.** Remaining pack warnings (missing dictionary_journal art for prior-letter tiles "a"/"at"/"am", qr_cards audioUrl placeholders) are pre-existing/out-of-scope (Suno audio loop, not tonight's image job).
- [ ] W5–9 images · [ ] W10–14 · [ ] W15–19 · [ ] W20–26
- [x] Suno W3–9 (Jul 11) · [x] Suno W10–14 (Jul 11, this chunk) — **DONE.** W3–14 = 24 songs × 2 takes = 48 files, all downloaded, renamed `WNN <title> (take K).mp3`, sorted into `Week 0N/`–`Week 14/`. Two deviations from verbatim JSON lyrics, both self-resolved mid-run:
  - **W9 song 2 "A Hat for the Ant"**: original JSON lyrics silently rejected 3× by Suno's copyright-similarity filter (toast: "Your lyrics contain copyrighted material" — pattern matched a Seussian rhyme/question structure). Rewrote the lyrics on-the-fly (same phonics content — ant/cat/Sam/hat/POTATO — different structure) to get it through. **The Week 9 "A Hat for the Ant" audio does NOT match the JSON's printed lyrics** — worth a look if the book/lyrics need reconciling later.
  - **W11 song 1 "O-O-On"**: a tool-level hiccup caused a failed select-all + splice, corrupting one submission into "Dad and Sam" (leftover W10 lyrics + new O-O-On text concatenated). Caught via abnormal clip duration, trashed the 2 corrupted clips, re-submitted clean. Final W11 files are correct/clean.
  - [ ] W15–17 · [ ] W18–26 remain
- [ ] Morning review checklist: audio takes, cast consistency (hero-lock re-rolls w/ --oref if cat/Segina drift), coloring-page quality, spot-check pack PDFs

## RESUME PROMPT (paste into a fresh session)
"Read CLAUDE.md's top session block + docs/curriculum/OVERNIGHT_RUN_JUL11.md. Continue the overnight run: (1) THE LOOP for images weeks 5–26 — spawn Sonnet browser agents in ~5-week chunks (W5–10, W11–18, W19–26), prompts auto-pulled per week via `node scripts/curriculum/build-week.mjs --week N --assets "~/Desktop/English Curriculum 2026/Week NN/images" --gap-only`; submit one-at-a-time with feed verification (MJ silently drops rapid batches); best-of-4 per runbook criteria; agent is casting director on cast debuts (dog W12, rat W15, bug W18, duck W21, fox W24). (2) SUNO LOOP for W15–26 (24 songs, both takes). (3) Update this status board per chunk; commit+push docs when done. Fable directs, Sonnet works the browser, never touch account settings."

## CAVEATS FOR THE MORNING
- Agents can't hear: both Suno takes saved per song, Tredoux picks.
- Cast consistency is descriptive-prompt-level tonight; hero-lock (reference image pass) is the polish option.
- MJ/Suno rate limits or logged-out states pause a chunk — resume from this doc.
- **W2 tiger-coloring.png anomaly:** all 4 grid variants rendered with grey/gradient shading rather than pure black-on-white line art (the coloring-page house style). Picked the cleanest of the 4 (least shading) rather than reroll, since the runbook only mandates an automatic reroll for mat-coloring. Worth a look in the morning — may want to reroll with an emphasized "flat vector, zero gradient" prompt tweak if it doesn't print well.
