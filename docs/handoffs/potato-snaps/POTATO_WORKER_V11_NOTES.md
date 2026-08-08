# Potato Snaps v1.1 — Worker build notes (Builder 2)

Scope: addendum §5 (+ §1/§2 pins). Built at
`/home/claude/build/potato11/potato-worker/` → repo-relative `potato-worker/`.
**Only changed/added files are in the tree** — everything not listed keeps its
v1.0 bytes.

Source of truth: the CURRENT `potato-worker/` was staged read-only from the Mac
and diffed against my v1.0 build — **all 12 source files byte-identical**, so
this delta applies cleanly. Binaries (5 mp3, 3 fonts, overlay.png) are present
on the Mac; none are touched by v1.1.

---

## 1. Files (14 changed, 1 new)

| file | change |
|---|---|
| `src/branding.ts` | **NEW** — week label, initials, per-job branding download + normalize |
| `src/db.ts` | `kind`/`excused_child_ids` on the type, `child_id` nullable, `jobKind()`, `getClassRow()` |
| `src/pipeline.ts` | kind branch, kind-aware timeout + photo floor, curated hygiene, branding into props |
| `src/config.ts` | `JOB_BRANDING_DIR`, `classJobTimeoutMs`, stale default 25→60, `assertTimeoutSanity()` |
| `src/hygiene.ts` | `HygieneOptions { maxPhotos, curated }`, `MAX_CLASS_PHOTOS = 40` |
| `src/render.ts` | `syncJobPhotosIntoBundle` → `syncJobAssetsIntoBundle` (photos **and** branding) |
| `src/upload.ts` | one path builder, `childId: null` → literal `class` segment |
| `src/media.ts` | `downloadObject()` for branding assets (returns null, never throws) |
| `src/music.ts` | boot gate: every usable track must carry a 40-photo grid |
| `src/index.ts` | kind in logs, `--plan` shows branding/excused, `assertTimeoutSanity()` at boot |
| `remotion/src/timing.ts` | `Branding` type, `durationBoundsFor()`, `maxPhotosForTrack()` |
| `remotion/src/Montage.tsx` | branded end card, null-safe `useOptionalImage`, font weight range 800 |
| `remotion/src/Root.tsx` | studio stub props incl. branding |
| `README.md` | v1.1 sections |

Unchanged: `Dockerfile`, `package.json`, `package-lock.json`, `tsconfig.json`,
`.gitignore`, `scripts/*`, `remotion/remotion.config.ts`, `remotion/src/index.ts`,
`assets/music/*`. **No Railway variable change is required** — every new env has
a safe default.

---

## 2. End-card approach (design tab 09)

One `<EndCard>` for **both** kinds, laid out inside the **16:9 share-safe box**
(979×551) centred in the 9:16 frame. Every measurement is the spec's 300px-mock
value × `1080/300 = 3.6`. Lockup order is the system law — school, class,
Potato Snaps last:

school mark 194px → school name 72px/800 → honey rule 122×11 → class emblem 65px
circle + class name 47px → week label 38px ink-50 → `made with Potato Snaps`
32px/ink-35/.16em at the foot. Cream ground with the spec's two radial washes
and the 54px dot texture masked out of the centre.

- **Logo** comes from `tp_classes.school_logo_path`, downloaded per job,
  `sharp`-normalized to a 512px **contain** PNG on transparency — school logos
  are often wide wordmarks and a cover-crop would decapitate them.
- **Emblem** from `emblem_path`, 256px **cover** (it is a circular avatar in the
  same family as the children's faces).
- **Fallback**: no logo → initials in a circle on sky wash `#EAF6FD`, border
  `#D5E8F5`, `#3E93C4` display 800 at 0.34×size — identical footprint, so the
  layout does not shift when HQ uploads. Never a potato.
- **No school name set** → class name is promoted to the headline and the class
  row drops its now-duplicate text (emblem alone still shows).
- The mock's dashed box and `share-safe 16:9` tag are annotations, not pixels —
  deliberately not rendered.

Branding files land in `remotion/public/branding/job/` and are re-synced into
the cached bundle **before every render**, exactly like the photos. Without that
every class in a worker process would wear the *first* class's logo — the same
bundle-staleness trap, with a worse blast radius.

Degradation is total: missing column → missing path → 404 → corrupt file each
fall back one step. **A branding failure can never fail a film.**

---

## 3. Pre-migration safety mechanism

The worker may boot against a database without the v1.1 migration. Every v1.1
column is read through a **star**, never an explicit column list:

- `claimNextJob()` keeps `RETURNING *` → `kind`, `excused_child_ids` = `undefined`.
- `getClassRow()` uses `SELECT * FROM tp_classes` → branding columns `undefined`.
- `jobKind()` maps `undefined` / `null` / anything unknown → `'child'`.

The only explicitly-named columns in any SQL are v1.0 ones (`id`, `name`,
`p.id`, `p.storage_path`, `p.captured_at`) — verified by parsing every SQL
template in `db.ts`. On an un-migrated database the worker is behaviourally
v1.0: no 42703, no crash-loop.

**Deploy order: worker v1.1 → migration → app v1.1.** The reverse is unsafe — a
v1.0 worker claiming a `kind='class'` job would read `child_id = NULL` as a
child film.

---

## 4. Gates run

| gate | result |
|---|---|
| `tsc --noEmit` against real installed deps | **exit 0** |
| Child-film timing regression, 5 tracks × 0–20 photos | **105/105 bit-identical to v1.0** |
| Hygiene default-mode A/B vs v1.0, n = 8/12/18/24/33 | **bit-identical photos + decisions** |
| 40-photo class film, all 5 tracks | 40 cuts, **no zero-length cut**, fits inside every track |
| Curated hygiene on 40 synthetic photos (incl. blurry + near-dupes) | **40 in → 40 out, 0 drops**, chronological, 1080×1920 |
| `validateMusicAssets()` incl. new grid-capacity gate | pass (capacities 47–101 vs 40 needed) |
| Lockup vs share-safe box, 7 name/emblem permutations | **all fit** (439–527 / 551) |
| Storage paths vs addendum §2 | both exact |
| `jobKind` pre-migration matrix | child/NULL/unknown → `child` |
| Week label incl. month + year boundary | `WEEK OF SEP 28–OCT 2`, `WEEK OF DEC 28–JAN 1` |
| Column diff vs addendum §1 | exact; no v1.1 column ever named in SQL |
| Self-grep `montree_` | 2 README comparison-table cells only |

40-photo film lengths: **1m50s (bright-week) – 2m28s (term-end)**, 3291–4441 frames.

---

## 5. Decisions worth a director's eye

1. **Two problems the brief did not name, both fixed.** (a) A 40-photo film is
   ~3× a child film's frames, so 20 min was no longer a safe budget → class jobs
   get `CLASS_JOB_TIMEOUT_MS` (45 min). (b) The 25-min stale sweep would then
   re-queue *live* class renders and burn all 3 attempts → stale default raised
   to 60 min, with a boot warning if it ever drops below the largest timeout.
2. **Curated hygiene for class films.** The API guarantees every active child
   appears in a selected photo; if the blur gate or dedupe then dropped one, a
   child could vanish from the film that promises "Every child is in this one".
   Class films therefore normalize only. Child films are untouched.
3. **Class floor is 8, not 4.** Below the enqueue minimum a class film is no
   longer the thing the teacher approved. Child films keep the v1.0 floor of 4.
4. **Eyebrow now carries the school**, not "Potato Snaps" — tab 09's law is that
   the app advertises the school. Child: school name (→ class name). Class:
   school name (→ "Our Week"). Title card is otherwise unchanged; the spec does
   not cover it, so this is an inference.
5. **Baloo 2 FontFace range widened to `400 800`** — the design's display weight
   is 800 and `400 700` would have clamped the variable axis. Title-card text is
   weight 700, so child films are visually unchanged.

## 6. Open risks

1. **No end-to-end render was possible in this container** (no Chromium, and
   `@remotion/renderer`'s native binaries were skipped). The end card is verified
   by typecheck + arithmetic layout proof, not by a rendered frame. **First
   class film on Railway should be eyeballed**, specifically: the dot-texture
   CSS mask, `objectFit: contain` on a real uploaded logo, and the 800 weight
   actually resolving.
2. **Coverage can drift after enqueue.** If a teacher deletes photos between
   queueing and rendering, the "everyone is in it" promise can break while the
   count stays ≥ 8. The worker does not re-check per-child coverage (the API
   owns it, and re-checking risks false failures). Flagging rather than deciding.
3. **term-end yields 2m28s at 40 photos** vs the addendum's "~2min" — inherent to
   beat-snapped cutting on a 68 bpm track. Shortening it would mean cutting on
   beats rather than downbeats, i.e. changing the music system.
4. **`excused_child_ids` is read but never used** for rendering (surfaced in
   `--plan` only). If the end card is ever meant to carry the coverage receipt,
   that is a follow-up.
5. Migration number: addendum says "≥319, builder verifies against Mac
   `migrations/`" — that is Builder 1's file; I did not verify it.
