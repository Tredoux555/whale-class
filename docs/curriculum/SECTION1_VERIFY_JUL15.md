# Section 1 Render Verification — W01–W10 (Jul 15, 2026)

Render log: `/tmp/section1_jul15.log` — completed, `SECTION1_DONE` reached.

## Coverage note — 18 of 19 expected videos rendered

**W08's SOUND song ("I-I-In") was SKIPPED by the batch driver, not rendered.** Root cause: mp3
filename mismatch — the spec/title expects `W08 I-I-In.mp3` but the actual file on disk is
`W08 Ih-Ih-In.mp3` (the batch driver matches mp3 by role+title and found no match; log line
399-430). This is a **filename fix, not a re-render** — rename or alias the mp3 and re-run just
that one job. W08's WORD song ("Sit, Cat, Sit!") rendered fine.

## Summary table (18 videos)

| Week/Song | Images matched/total | Anchored | Coverage % | Approx % | Suppressed spans | Quality flags | Unused multi-token self-flag | mp4 size (MB) |
|---|---|---|---|---|---|---|---|---|
| W01 It's A (Potato) | 4/8 | 4 | 50.0 | 64.2 | 4 | approx>60% (whisper largely failed) | — | 23.7 |
| W02 T-T-Turtle | 2/5 | 2 | 40.0 | 84.9 | 1 | approx>60% | — | 14.0 |
| W02 Where Is Segina? | 2/4 | 3 | 50.0 | 69.3 | 3 | approx>60% | — | 20.6 |
| W03 M-M-Moon! | 2/14 | 3 | **14.3** | 90.8 | 2 | approx>60% | — | 19.0 |
| W03 On the Mat | 6/13 | 10 | 46.2 | 55.0 | 2 | — | — | 24.3 |
| W04 C-C-Cat! | 3/12 | 4 | **25.0** | 83.3 | 2 | approx>60% | — | 19.9 |
| W04 The Cat Is on the Mat | 9/9 | 15 | 100.0 | 5.3 | 0 | — | — | 20.3 |
| W05 S-S-Snake! | 5/7 | 7 | 71.4 | 57.7 | 4 | — | — | 24.8 |
| W05 Sam Sat | 9/11 | 13 | 81.8 | 59.6 | 1 | — | — | 20.0 |
| W06 I Am an Ant | 7/8 | 12 | 87.5 | 3.4 | 0 | — | — | 19.6 |
| W06 N-N-Nut! | 3/5 | 3 | 60.0 | 76.9 | 5 | approx>60% | — | 19.1 |
| W07 P-P-Pop | 2/5 | 3 | 40.0 | 75.0 | 2 | approx>60% | — | 18.7 |
| W07 The Cat Naps | 7/9 | 10 | 77.8 | 40.9 | 5 | — | — | 26.6 |
| W08 Sit, Cat, Sit! (word) | 6/9 | 10 | 66.7 | 37.2 | 1 | — | **`sat-in-a-tin.png`** | 20.0 |
| W08 I-I-In (sound) | — | — | — | — | — | **SKIPPED — mp3 filename mismatch** | — | — |
| W09 A Hat for the Ant | 10/10 | 23 | 100.0 | 52.4 | 4 | — | — | 19.5 |
| W09 H-H-Hat | 4/13 | 5 | **30.8** | 74.1 | 4 | approx>60% | — | 15.0 |
| W10 D-D-Dad | 1/5 | 1 | **20.0** | 91.9 | 2 | approx>60% | — | 19.7 |
| W10 Dad and the Ant | 9/12 | 17 | 75.0 | 20.2 | 2 | — | — | 19.1 |

All 18 mp4s present and well over 5MB (14.0–26.6MB range).

## Items to flag prominently

1. **W08 sound song ("I-I-In") never rendered** — mp3 filename mismatch (`Ih-Ih-In.mp3` on disk
   vs `I-I-In` expected). Needs a filename fix + one re-render, not part of the 18 delivered.
2. **`unused_multi_token_phrase_present` self-flag: W08 Sit, Cat, Sit!** — engine flagged
   `sat-in-a-tin.png` as an unused multi-token phrase match. Worth a quick look at that image's
   filename/alias vs the lyric — likely a near-miss phrase match that didn't anchor.
3. **Coverage below 40%:** W03 M-M-Moon! (14.3%), W04 C-C-Cat! (25.0%), W09 H-H-Hat (30.8%),
   W10 D-D-Dad (20.0%). Per standing guidance, low coverage co-occurring with high approx_pct on
   sound songs is the expected shape of the new suppression guard (short stutter songs with few
   distinct images and heavy whisper failure) — not on its own a defect. Flagged here for visibility,
   not as a blocker.

## Frame spot-check — 3 highest approx_pct videos

Highest approx_pct: W10 D-D-Dad (91.9%), W03 M-M-Moon! (90.8%), W02 T-T-Turtle (84.9%).

Tiles saved to `docs/curriculum/_section1_checks/` (copies also at
`~/Downloads/section1_check_*.png`):

- **W10 D-D-Dad** — dinosaur toy, wooden door, rag-doll (Doll). Real curriculum art, coherent
  D-word imagery, no corruption, no placeholders. **PASS.**
- **W03 M-M-Moon!** — mango, mask, mat (woven), monkey (leaping), monkey (close-up), mop. Coherent
  M-word imagery, high quality, no corruption. **PASS.**
- **W02 T-T-Turtle** — turtle ×2, tiger cub, tomato, the potato gag (potato-with-glasses at an
  easel) with subtitle `(NO!) P-p-potato! Not T! T-t-table! T-t-table!`, wooden stool/table.
  Subtitle text is sensible sung lyric, potato gag intact, no corruption. **PASS.**

All three spot-checks: real art, no corrupt/placeholder tiles, subtitles read as sensible lyric text.

## Recommendation

**GO** — 18/19 Section 1 videos render clean (mp4s present, sane sizes, no engine self-flags of
concern beyond the one noted, frame spot-checks all pass). Two small owed items before calling the
section fully closed: (1) fix the W08 sound-song mp3 filename and re-render that one job, (2) glance
at the W08 word-song `sat-in-a-tin.png` self-flag. Neither blocks handing the 18 to Tredoux now.
