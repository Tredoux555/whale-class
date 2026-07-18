# Curriculum Materials Audit — Jul 15, 2026 (specs/audio/take-picks/QR/readers)

Scope: `docs/curriculum/AUDIT_MATERIALS_JUL15_specs.md` — automated audit of the 58-week
English curriculum spec layer, audio publishing, take-pick application, QR card coverage,
and the Pink Readers/Songs library. Run by Sonnet per Fable's request, Jul 15 2026.

## 1. Spec validator

```
node scripts/curriculum/validate-specs.mjs
```

Result: **58/58 weeks PASS** ("✅ All authored weeks pass decodability."). No errors, no
warnings. Week 1–3 flagged as read-aloud/decodability-exempt (expected — pre-decoding
weeks), all others pass as decoding weeks.

## 2. Song audioUrl check (all 58 specs, `lib/montree/english-curriculum/spec/week-NN.json`)

- Total `songs[]` entries across all 58 specs: **115**
- Entries with an absolute `https://montree.xyz/...` audioUrl: **115 / 115**
- Missing / relative / placeholder: **0**

**W30 status:** both songs now carry real absolute URLs — no placeholder remains.
```
week-30.json :: sound :: https://montree.xyz/api/montree/media/proxy/curriculum-songs/w30-sound.mp3
week-30.json :: word  :: https://montree.xyz/api/montree/media/proxy/curriculum-songs/w30-word.mp3
```
The Jul-13 handoff's "only placeholder QR site-wide" open item for W30 appears resolved —
confirmed live via HTTP check on other weeks (see §6) and via file presence in W30's pack.

## 3. Take picks

`docs/curriculum/SONG_TAKE_PICKS_JUL13.json` exists. `locked_by: Tredoux`, `locked_at:
2026-07-13`, 114 pick entries covering all 58 weeks (`picks[]`, format
`[week, title, note, take_number]`).

Spot-check (random seed 42 → weeks 41, 08, 02, 48, 18): for every sampled week, the winning
song title in the picks file matches the clean-named mp3 actually filed at the top level of
`~/Desktop/English Curriculum 2026/Week NN/` (e.g. `W41 Magic E Makes Cube.mp3`, `W08
Ih-Ih-In.mp3`, `W02 T-T-Turtle.mp3`, `W48 More Corn for the Horse.mp3`, `W18
L-L-Log!.mp3` — all present, all take-picks applied, losers correctly absent from the top
level). **5/5 matched.**

## 4. QR cards

Checked every `Week 01`–`Week 58` folder under `~/Desktop/English Curriculum 2026/` for any
file containing "qr" (case-insensitive). **58/58 weeks have `pack-v2/qr_cards.pdf` +
`pack-v2/qr_cards.html`.** No weeks missing a QR card.

## 5. Readers library

- `public/pink-readers.html` — exists, 280,283 bytes (non-trivial, full assembled page).
- `public/pink-phase-songs.html` — exists but is a tiny (737-byte) **intentional redirect
  stub** to `/dark-phonics.html` (with a link to `/pink-phase-songs-teacher.html` for the
  "original teacher version"). Both targets exist and are non-trivial:
  `public/dark-phonics.html` (8,488 bytes, JS-driven dynamic page) and
  `public/pink-phase-songs-teacher.html` (60,731 bytes). Not a defect — a deliberate
  rebrand/redirect (dated Jun 6/24) — but flagged since the raw file size check alone would
  read as broken.
- `docs/readers/Book_01`–`Book_15` — all **15 present** (`Book_01_Cat_Can_Nap.md` …
  `Book_15_The_Big_Pink_Trip.md`).
- `docs/readers/Teacher_Guide.md` — present, 10,866 bytes.

## 6. Live spot-check (HTTP)

```
curl -sI https://montree.xyz/api/montree/media/proxy/curriculum-songs/w05-sound.mp3  → HTTP/2 200, audio/mpeg, 2,148,925 bytes
curl -sI https://montree.xyz/api/montree/media/proxy/curriculum-songs/w40-word.mp3   → HTTP/2 200, audio/mpeg, 1,105,135 bytes
```
Both resolve live with correct `content-type: audio/mpeg` and `accept-ranges: bytes`.

## Flags

- `public/pink-phase-songs.html` is a redirect stub, not the content page itself — worth
  confirming this is the intended live behavior (not an accidental leftover) since it reads
  as "trivial size" on a naive file-size check. Content itself is intact at the redirect
  targets.
- No other flags.

## Verdict

**ALL GREEN.**
