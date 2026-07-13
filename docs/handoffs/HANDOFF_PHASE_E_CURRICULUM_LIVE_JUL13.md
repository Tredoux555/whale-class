# HANDOFF — Phase E part 1: Curriculum published to montree.xyz (Jul 13, 2026)

**Status: the full 58-week English curriculum (Levels 1–3) is produced, take-picked, and PUBLISHED.
Commits `7f6666df` → `f264589f` → `e6960f05` → `a472320b`, all pushed. This doc = what shipped,
what's open, and the two queued theories (Montree in-app tracking + mvgen music videos).**

---

## 1. What shipped today (Jul 13)

- **Phase D closed ALL GREEN** — every week W27–58: 4 mp3s, gap-clean images, 10 valid PDFs.
  Holes found + fixed during closeout: W44 `feet.png` (agent had false-claimed complete),
  Sejeena pronunciation in 5 songs (W22/W25/W26/W49/W58 — specs fixed, songs regenerated),
  W1 song lacked /a/ vocab (rewritten: ant/apple/ax/alligator verses), W2 was old-era
  (both songs regenerated), W31 "The King Can Sing" 14s truncation (lyrics EXTENDED — new ring
  verse + breakdown + final hook — regenerated at 70s).
- **Take picks locked** — Tredoux picked 1 of 2 takes for every song
  (`docs/curriculum/SONG_TAKE_PICKS_JUL13.json`, applied by `scripts/curriculum/apply-take-picks.py`).
  Winners renamed clean (`WNN <Title>[ (sound|word)].mp3`), 113+ losers archived to
  `~/Desktop/English Curriculum 2026/_takes_not_picked/`. Old replaced songs in `_replaced_segina/`.
- **Published to the site:**
  - 114 mp3s (~135MB) uploaded → Supabase bucket `montree-media/curriculum-songs/wNN-<role>.mp3`
    (`scripts/curriculum/upload-songs.mjs`, idempotent upsert).
  - Every spec's `songs[].audioUrl` set to the ABSOLUTE proxy URL
    `https://montree.xyz/api/montree/media/proxy/curriculum-songs/wNN-<role>.mp3`
    (`scripts/curriculum/set-audio-urls.mjs`; proxy = Cloudflare-cached + Range-request seeking).
  - **QR cards re-rendered for all 58 weeks** (`--materials qr_cards` selective flag) — printed packs
    now carry real scannable QRs to the hosted audio. One placeholder site-wide: W30 sound song (below).
  - **Curriculum Studio** (`/montree/library/curriculum-studio`) now renders an `<audio>` player under
    every published song. Validator exit 0, ESLint 0 errors, scoped tsc clean.

## 2. Open items (small)

1. ~~W30 take pick~~ **DONE Jul 13 evening — Tredoux picked take 2.** Renamed clean, loser archived,
   uploaded (`curriculum-songs/w30-sound.mp3`), audioUrl set, W30 qr_cards re-rendered — **all 115
   songs published, zero placeholders site-wide.** Picks file is COMPLETE (58/58 weeks).
2. **📸 PHOTO BANK UPLOAD (Tredoux doing manually):** all 1,007 curriculum images were COPIED (originals
   untouched) to `~/Desktop/English Curriculum 2026/_all_images_flat/` with `wNN-` filename prefixes
   (e.g. `w27-ship.png`, `w44-sheep-nameday.png`). Tredoux uploads these to the library Photo Bank
   himself. If a scripted path is ever wanted instead: port `scripts/upload-to-photo-bank.mjs`
   (bucket 'photo-bank') with category "English Curriculum" + week/sound tags.
3. **Archives to delete after Tredoux's final sign-off:** `_replaced_segina/` (old mispronounced +
   pre-era songs) and optionally `_takes_not_picked/` (~130MB of B-takes — suggest keep on the
   Extreme SSD backup, delete locally). `_all_images_flat/` can go after the photo-bank upload.
4. **Visual morning-review leftovers:** W51 metallic star (vs W47 plush canonical — reroll on request),
   W52 loud-sound proxy image, W58 station-coloring light linework, cast-consistency eyeball,
   Pattern Tree wall + W38 pattern-card tracing eyeball.
5. **Live verification: DONE for the Studio** (58-week strip + Level 1/2/3 sections + ?week= deep-link +
   audio players verified live Jul 13, commit `be69b6e6`). Still owed: scan one PRINTED QR card with a
   real phone.

## 3. THEORY A — the curriculum as a trackable system INSIDE Montree (per-school optional)

**Tredoux's ask: "maybe a 6th optional area — trackable in the app, on/off per school."**

**Recommendation: don't build a parallel system — ride the existing works ladder with a new area
key, gated by ONE feature flag.** The Jul-10 plan already sketched this ("flag + seed to
`montree_classroom_curriculum_works` 20000-band — zero new tables, phonics precedent"). Concretely:

- **Feature flag:** `english_program` in `montree_feature_definitions`, `default_enabled=false`,
  toggled per school in super-admin ⚙️ (exact precedent: `curriculum_gap_radar`, `wrap_discussion`).
  Fail-closed: schools that don't opt in never see it.
- **The 6th area:** register area key `english` in the area registry (labels/colors via
  `getAreaLabel`/`getAreaPrefix` — grep-verify every render site imports the prefix helper, the
  Jul-4 crash rule). It appears as a 6th shelf area ONLY when the flag is on.
- **Works = the 58 weeks.** Seed script (idempotent, like the phonics seed) inserts one work per week
  into `montree_classroom_curriculum_works` at sequence band 20000+ (`20001 = Week 1 /a/`,
  `20002 = Week 2 /t/`…), `area='english'`. Name: "Week 12 — /g/ · The Dog Digs". Each work's
  guide_content carries the week's materials list + Studio deep-link
  (`/montree/library/curriculum-studio?week=12`).
- **Tracking rides the sacred ladder for free:** `not_started → presented (week introduced) →
  practicing (child working the pack) → mastered (child reads the decodable book)`. Because they're
  ordinary works, EVERYTHING existing just works: teacher confirm flow, `advance-shelf-after-mastery`
  (finishing Week N drops Week N+1 on the shelf — the Montessori invariant holds), parent reports
  (the report pipeline already narrates works by area), class-progress views, photo tagging.
- **What NOT to do:** don't extend `montree_child_english_progress` (migration 225 — that's the
  RAZ/pink-blue-green tracker, a different axis; keep them separate); don't put the weeks inside the
  Language area (drowns the real Montessori language works); don't create new tables.
- **Cost:** 1 migration (flag def), 1 seed script, area-registry entries + i18n keys ×12, a "This
  Week" dashboard card (gated). Smart Capture/visual memory: out of scope v1 — weeks aren't shelf
  materials. **Pilot on Whale Class first.**

## 4. THEORY B — music videos per song via mvgen (finish the tool)

**The tool is 90% built** (`scripts/mvgen/` + `/admin/mvgen` MV Studio — see
`docs/handoffs/SESSION_MVGEN_STUDIO_JUL10.md` + PLAN doc §V2 ADDENDUM). Local daemon on the Mac
(127.0.0.1:8787, $0/render), lyric-synced image scheduling, beat-snapped cuts, karaoke subtitles
with GROUND-TRUTH lyrics, beat pulse, drag-drop projects, shot planner.

**Why this curriculum is the perfect payload — the assets already exist and already match the tool's
contract:** mvgen schedules images by FILENAME keyword matched to sung words… and every week's images
are ALREADY named after the sung words (`ship.png`, `fish.png`, `king-sings-potato.png`) because the
manifests were built that way. Per song: images = `Week NN/images/`, audio = the picked
`WNN <Title>.mp3`, lyrics = the spec's `songs[].lyrics` (ground truth). Zero new asset work.

**Remaining to finish (in order):**
1. **Deploy check** — the MV Studio commits were never confirmed pushed/deployed (Jul-10 PINNED note:
   card absent on live /admin). Verify, push if needed.
2. **The #1 queued tweak (pinned Jul 10):** pulse fires ONLY on anchored key-vocab words — new
   `anchor` pulse mode, make it the default.
3. **Batch driver** `scripts/mvgen/curriculum-batch.py`: reads a week spec → builds the project
   folder (picked mp3 + week images + lyrics.txt) → submits to the daemon. One command per song;
   a `--level 1` sweep queues 26.
4. **Pilot 3 songs** (suggest W04 "The Cat Is on the Mat", W27 "The Fish on the Ship", W44 "Sheep Can
   Read!") → Tredoux reviews style → then batch per level. 115 videos total, no rush per Tredoux
   ("don't need them all at once").

## 5. Resume prompt

"Read docs/handoffs/HANDOFF_PHASE_E_CURRICULUM_LIVE_JUL13.md. Curriculum is produced + published.
Ask Tredoux for the W30 sound-song take pick and apply it (§2.1). Then pick up EITHER Theory A
(Montree english_program area — write the build contract, Opus builds, Sonnet audits, pilot on Whale)
or Theory B (mvgen finish — deploy check, anchor pulse mode, batch driver, 3-song pilot) per
Tredoux's priority. Both theories are in this doc with file-level grounding."
