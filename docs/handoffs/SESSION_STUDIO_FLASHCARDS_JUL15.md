# SESSION — Jul 15, 2026 — CURRICULUM STUDIO UPGRADE: PUBLISHED IMAGES + FLASHCARDS + COLORING FIX + MUSIC-VIDEO SLOT

**Scope:** four live-Studio defects fixed. NOT committed — Tredoux pushes via Desktop Commander.
Canonical build record below. Sacred-flow self-review + real Chrome-PDF runtime verification done
(Jun-14 rule — not just lint).

---

## WHAT SHIPPED

### A. Published curriculum images → Studio shows real pictures (was 0/26 ready)
The web Studio previously could only use browser-dropped images; the art lives on the Mac, so every
preview showed placeholder emoji. Fixed by publishing the images the same way the songs were published.

- **New: `scripts/curriculum/publish-images.mjs`** — for each `~/Desktop/English Curriculum 2026/Week NN/
  images/*.{png,jpg,jpeg,webp}`: downscale to ≤900px long edge, WEBP q80 (via `sharp`, already a dep),
  upload to `montree-media/curriculum-images/wNN/<stem>.webp` (`SUPABASE_SERVICE_ROLE_KEY` from
  `.env.local`, upsert + one retry on flaky upload), and write an `imageUrls` map into the week's spec.
  - **Key = filename STEM**: numeric order prefix stripped, `-coloring` suffix KEPT, lower-cased +
    URL-safe (`01-chair.png` → `chair`; `chair-coloring.png` → `chair-coloring`). Each key round-trips
    through the render engine's `parseAssetFilename` **identically to the original filename**, so
    `chair` resolves as the image and `chair-coloring` as the colouring line-art — no key collision.
  - Spec edit is a **surgical single-line insert** (one compact `"imageUrls": {…}` line after the
    opening brace), idempotent (strips any prior line first) — mirrors `set-audio-urls.mjs`, so it does
    NOT churn the whole file.
  - Flags: `--week N` (one week), `--dry-run` (no upload/no write), bare = all 58.
- **`spec/types.ts`**: added optional `imageUrls?: Record<string,string>` to `WeekSpec`.
- **Studio (`app/montree/library/curriculum-studio/page.tsx`)**: the AssetMap is now built from
  `spec.imageUrls` (published webp) as the base, with any locally dropped files layered LAST so a
  dropped image still overrides. `imageUrls` absent → behaves exactly as before (empty base).
- **🚨 CLI/print path unchanged**: `build-week.mjs --assets <dir>` still reads local files; `imageUrls`
  is a Studio-only fallback. Verified byte-path-identical (local `--assets` render still works).

### B. NEW MATERIAL — Flashcards (the #1 ask)
- **New: `lib/montree/english-curriculum/render/builders/flashcards.ts`** — 2 cards per A4 portrait,
  LARGE picture on top (~68%) + big word beneath, in the house green frame (`#2D5A27`, `WHITE_BORDER_CM`
  padding, rounded corners) matching card-generator conventions. Word list = `spec.materials.threePartCards`
  (same words as the 3-part cards). Deck opens with a **letter/sound card**: Level 1 → `letterDisplay`
  (both cases, "Aa") big; Level 2/3 → `patternDisplay ?? sound` ("a_e", "-tion"); kicker names the sound.
  Adaptive label font (`adaptiveLabelFontSize`) shrinks long words.
- Registered everywhere: render `index.ts` (`MaterialType` union + `MATERIAL_TYPES` ⚡ card + `BUILDERS`)
  and `ALL_MATERIALS` in `build-week.mjs`. Studio card + Preview/Print appear automatically via
  `MATERIAL_TYPES`.

### C. Colouring page spacing fixed
`builders/coloring.ts` rewritten: FIXED card heights (`122mm` cells) instead of a `height:100%` flex
sheet, image FILLS its cell (`contain`, no distortion via an `.ci-imgwrap` flex box), and the **hero
word is picked from the colouring list** (so it has a `-coloring` asset — W1 used to hero the anchor
"a" which has none → blank hero page; now heroes potato).

### D. Music-video slot in the Studio
- `spec/types.ts`: `SongSpec.videoUrl?: string`.
- Studio Songs section: per song, below the audio player, a **🎬 Music video** slot — `<video controls>`
  when `videoUrl` is set, else a quiet dashed "Coming soon" box. CSP `media-src 'self'` already covers
  the montree.xyz proxy URL. **No videos uploaded** (none certified) — field wired only, per the
  standing "no bulk renders" order.

---

## RUNTIME VERIFICATION (Jun-14 rule)

- **W01 published first**: 27 webp uploaded (1.1 MB), spec patched, `curl` → `http=200
  type=image/webp` for both `chair.webp` and `potato-coloring.webp`. Validator
  (`validate-specs.mjs`) exit 0.
- **Studio-path render** (AssetMap from `spec.imageUrls`, no dropped files): flashcards/coloring/
  three-part/bingo all emit `montree.xyz` `<img src>` URLs, **zero placeholder emoji**, warnings 0.
- **Real Chrome PDF** (`build-week.mjs`, local `--assets`): flashcards.pdf = 5 pages / **9 images
  embedded** (16.6 MB); coloring.pdf = **3 pages** (no spill), 9 images. (Caught + fixed two print
  bugs mid-build: flashcards embedded 0 images with a flex `height:100%` chain — the classic
  auto-height-flex trap that collapses `<img height:100%>` to 0 in Chrome print; and the first flex
  coloring rewrite summed to exactly 297mm and spilled 3 divs → 5 physical pages. Both fixed with
  FIXED card heights, mirroring three-part-cards.)
- **ESLint** on all touched files: **0 errors** (2 warnings are pre-existing `set-state-in-effect` on
  Studio lines 195/204, not from this diff). **Scoped tsc**: 0 errors.
- Excerpt artifacts: `outputs/curriculum-studio-verify/w01-flashcards.html` + `w01-coloring.html`.

---

## HOW TO RE-RUN THE PUBLISH

```
cd ~/Desktop/Master\ Brain/ACTIVE/montree
node scripts/curriculum/publish-images.mjs --week 4 --dry-run   # preview one week
node scripts/curriculum/publish-images.mjs --week 4             # publish one week
node scripts/curriculum/publish-images.mjs                      # all 58 weeks (idempotent, upsert)
```
Re-running is safe: uploads upsert, the `imageUrls` spec line is stripped + re-inserted. After adding
or re-rolling any `Week NN/images/*.png`, re-run for that week to refresh its `imageUrls`.

## FILES CHANGED
- `scripts/curriculum/publish-images.mjs` (new)
- `lib/montree/english-curriculum/render/builders/flashcards.ts` (new)
- `lib/montree/english-curriculum/render/builders/coloring.ts` (rewrite)
- `lib/montree/english-curriculum/render/index.ts` (register flashcards)
- `lib/montree/english-curriculum/spec/types.ts` (imageUrls + videoUrl)
- `app/montree/library/curriculum-studio/page.tsx` (imageUrls AssetMap + music-video slot)
- `scripts/curriculum/build-week.mjs` (flashcards in ALL_MATERIALS)
- `lib/montree/english-curriculum/spec/week-NN.json` × 58 (imageUrls line inserted by the publish run)

## OWED / NEXT
- **Tredoux commit + push** (Desktop Commander) — includes the 58 patched specs.
- Re-render the week packs (`build-week.mjs`) to fold in the new **flashcards** material + the coloring
  fix into the printed PDF packs (packs are pre-existing on disk; flashcards.pdf/coloring.pdf refresh).
- Music videos: populate `songs[].videoUrl` per song once a video is CERTIFIED + published (same
  montree.xyz proxy shape as audioUrl). The Studio slot is already wired.
- Eyeball a couple of published weeks in the live Studio (pictures load, flashcards preview, coloring
  2×2 fits).
