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
- [ ] W1–4: download tonight's 44 grids, sort, submit 9 held-back scene shots (segina-on-mat, potato-on-mat, 7 cat scenes — descriptive, no oref tonight), render packs
- [ ] W5–9 images · [ ] W10–14 · [ ] W15–19 · [ ] W20–26
- [ ] Suno W3–9 · [ ] W10–17 · [ ] W18–26
- [ ] Morning review checklist: audio takes, cast consistency (hero-lock re-rolls w/ --oref if cat/Segina drift), coloring-page quality, spot-check pack PDFs

## CAVEATS FOR THE MORNING
- Agents can't hear: both Suno takes saved per song, Tredoux picks.
- Cast consistency is descriptive-prompt-level tonight; hero-lock (reference image pass) is the polish option.
- MJ/Suno rate limits or logged-out states pause a chunk — resume from this doc.
