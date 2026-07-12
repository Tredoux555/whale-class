# PHASE D PRODUCTION RUN — Levels 2–3 (W27–58) — started Jul 12, 2026 (Fable directing)

**Mission (Tredoux, authorized): produce ALL media for weeks 27–58 — ~640 MJ images + 64 songs × 2 takes
(128 Suno files) + render all 32 packs. Same proven loop as `OVERNIGHT_RUN_JUL11.md` (READ IT — all its
locked rules, techniques, and bug workarounds apply verbatim). If this session dies, ANY session resumes
from this doc. Disk was cleared to 20 GiB free before start; backup on Extreme SSD.**

## Locked rules (inherited Jul-11 + Levels 2–3 additions)
1. Suno style string (ALL songs): `dark trap, 68 bpm, heavy 808 bass, sparse hi-hats, deep whisper-rap verses, kids choir chant on hook, playful spooky, minimal, clean vocals, nursery trap`
2. WHOLE-WORDS lyric rule — already enforced in all 32 specs (director-read Jul 12). Lyrics are GROUND TRUTH; submit verbatim. If Suno's copyright filter rejects (W9 precedent), rewrite minimally, keep phonics content, and LOG the deviation here (JSON reconciliation owed).
3. MJ: submit one-at-a-time with feed verification; best-of-4 (photos: single clean subject; coloring: flat black-on-white, thick lines, no gray); **canvas-draw download technique** (Jul-11 W20–26 entry) is the standard; `cdn.midjourney.com` automatic downloads = Allow; transient "Creation failed" → resubmit up to 3×.
4. Render: `node scripts/curriculum/build-week.mjs --week N --assets "~/Desktop/English Curriculum 2026/Week NN/images" --gap-only` for prompts; full render with **explicit `--out ".../Week NN/pack-v2"`** (defaults to legacy pack/ otherwise); 0-byte-PDF guard is live and hard-fails.
5. Cast canonical looks are IN the spec prompts — follow prompt text verbatim. New debuts: Sheep W27, Chick W28, Snake W33, Bee W44, Star W47, Owl W52. Reuse L1 cast looks where they cameo (Dog=scruffy wire-haired terrier mix, Duck=plump white/orange, Fox=rust-orange white-chest, Segina/Sam=peg dolls, Cat=tabby).
6. Songs per week = exactly 2 (sound + word), lyrics from the week JSON `songs[]`. File naming: `WNN <title> (take K).mp3` → `~/Desktop/English Curriculum 2026/Week NN/`. Save BOTH takes (agents can't hear).
7. Suno credits: 1,590 at start; 64 songs ≈ ~1,330 credits expected. If credits run low (<100), STOP and log — do not start a song you can't finish.
8. Week folders: create `~/Desktop/English Curriculum 2026/Week NN/` + `images/` as needed (W27–58 are new).

## STATUS BOARD (update as chunks land)
- [ ] Images W27–31 (chunk M1)
- [ ] Images W32–36 (M2)
- [ ] Images W37–41 (M3)
- [ ] Images W42–46 (M4)
- [ ] Images W47–51 (M5)
- [ ] Images W52–58 (M6)
- [ ] Suno W27–37 (chunk S1 — 22 songs, 44 files)
- [ ] Suno W38–48 (S2 — 22 songs, 44 files)
- [ ] Suno W49–58 (S3 — 20 songs, 40 files)
- [ ] All 32 packs rendered to pack-v2/ + gap reports clean
- [ ] Morning review checklist (Tredoux): pick 1 of 2 takes × 64 songs · cast-consistency eyeball (esp. Sheep/Snake/Chick across their arcs; Snake W33 vs W38 name-day; graduation cast W58) · Pattern Tree wall render + W38 pattern-card tracing eyeball (FIRST REAL RENDER of the new builders) · coloring-page shading anomalies · any Suno lyric deviations logged below

## DEVIATIONS LOG (lyric rewrites, rerolls, casting calls)
(none yet)

## RESUME PROMPT (paste into a fresh session)
"Read CLAUDE.md's top two Jul-12 session blocks + docs/curriculum/PHASE_D_RUN_JUL12.md + docs/curriculum/OVERNIGHT_RUN_JUL11.md (the technique bible). Continue Phase D: work the unchecked chunks on the status board — MJ images in ~5-week chunks (Sonnet browser agent, one-at-a-time submits, feed verification, best-of-4, canvas-draw downloads, sort to Week NN/images/, full pack render with explicit --out), Suno in ~11-week chunks (verbatim JSON lyrics + locked style string, both takes, WNN naming). One MJ agent + one Suno agent in parallel, never two on the same site. Update the status board + deviations log per chunk; commit+push this doc as chunks land. Fable directs; Sonnet works the browser; never touch account settings."
