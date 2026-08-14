# School Brand Kit — implementation notes

A school uploads a logo once in Settings. The browser reads its palette, solves
print-safe tokens from it, and stores the answer on the school row. Every class
document then themes itself: a crest in the masthead, tinted rules and
hairlines, framed name-label cards, and the crest ghosted behind the sheet.

**No migration.** `montree_schools.logo_url` and `montree_schools.settings`
(JSONB) already exist; nothing here creates a table, a column, a bucket or a
feature flag.

---

## Files

### New

| Path | What it is |
|---|---|
| `lib/montree/brand-kit/types.ts` | The stored shape (`BrandKit`, `BrandTokens`, `BrandIntensity`, `BRAND_KIT_VERSION`) **and the only sanctioned way in**: `parseBrandKit()` validates every field and returns `null` rather than a half-trusted object. `isBrandKitActive()` decides whether a kit changes anything on paper. Dependency-free — server, client and the CSS builder all import it. |
| `lib/montree/brand-kit/extract.ts` | `'use client'`. The founder-approved algorithm, ported verbatim: colour math (rgb↔hsl, WCAG luminance, bisection contrast solve), canvas palette extraction (192px analysis bitmap, 24 hue bins × 3 sat × 3 light, vividness × midtone scoring, monochrome path, accent fallbacks), and theme derivation (12:1 / 4.6:1 / 2.3:1 targets, saturation bands, the temper step, intensity wash lightness). Public entry points: `extractBrandKit(file)`, `retuneBrandKit(kit, intensity)`, `deriveTokens*`. |
| `lib/montree/brand-kit/css.ts` | `brandKitCss(kit)` — pure, returns the `<style>` body. Per-school custom properties + a rule sheet that is identical for every school. Returns `''` for an inactive kit. |
| `app/api/montree/brand-kit/route.ts` | `GET` (current kit) · `POST` (multipart logo + kit, **or** JSON kit-only for intensity/on-off) · `DELETE` (disable; `?purge=1` also removes the file and the kit). |

### Modified (start from the staged original)

| Path | Change |
|---|---|
| `app/api/montree/class-documents/route.ts` | The school select now also reads `logo_url, settings`, and the response gains `school: { id, name, logoUrl, brandKit }`. The wide select falls back to the original narrow one on error, so a project missing those columns still gets its masthead. Everything else is untouched. |
| `components/montree/class-documents/DocumentPaper.tsx` | New optional `brandKit` and `suppressWatermark` props. When a kit is active: `.mt-branded` + `data-doc-intensity` on the shell, `brandKitCss()` appended to the existing injected `<style>`, an `.mt-doc-emblem` `<img>` in the masthead lockup, an `.mt-doc-watermark` `<img>` behind the sheet, and children wrapped in `.mt-doc-content` for stacking. With no kit the rendered DOM is **identical to before**. |
| `app/montree/dashboard/class-documents/[doc]/page.tsx` | Threads `data.school.brandKit` into `DocumentPaper` and sets `suppressWatermark` for `name_labels`. Response interface gains an optional `school` field. |
| `app/montree/dashboard/settings/page.tsx` | New "School logo & document theme" card: file picker, live swatch + token readout with achieved contrast ratios, intensity segmented control, on/off, a small paper preview, save/remove. Everything else on the page is unchanged. |

---

## Verification done

Both halves of the ported algorithm were checked **differentially against the
prototype's own JavaScript**, not by eye:

* **Derivation** — `deriveTokens()` vs the prototype's `deriveDocumentTheme()`
  across 8 brand colour pairs × 3 intensities (24 cases): every token hex,
  the watermark opacity and the pale-accent fallback flag match exactly, and
  the achieved contrast lands on 12.0–12.1 : 1, 4.6–4.7 : 1, 2.3 : 1.
* **Extraction** — `extractBrandPalette()` vs the prototype's, fed the identical
  RGBA buffer through a stub canvas, across 4 synthetic marks (two-colour,
  monochrome, pale, noise) × 3 source sizes: dominant, accent, monochrome flag,
  derived flag, sample count and note all match.

  **This caught a real port bug**: the `240° ≤ h < 300°` branch of `hslToRgb`
  had red and blue swapped, which silently mangled every blue-to-violet brand.
  Fixed and re-verified.
* **Injection** — `brandKitCss()` fed a hostile kit (`ink: 'red;} body{…'`,
  `wash: 'url(javascript:…)'`, `watermarkOpacity: 99`) emits `#101820`,
  `transparent`, `0.2`; braces stay balanced; every selector line carries
  `.mt-branded`. `parseBrandKit()` rejects nulls, arrays, strings, future
  versions, bad hexes, `javascript:` URLs, protocol-relative URLs and URLs
  containing quotes/parens.
* **The off path** — `brandKitCss()` returns `''` for a null kit, a disabled
  kit, and an "enabled but paints nothing" kit.
* `tsc --strict --noEmit` clean on the three lib files; all five TS/TSX outputs
  parse clean.

Not verified here (no repo build available): full-project type-check and
ESLint, and an actual print. See "Manual steps".

---

## Decisions and assumptions

**Storage bucket = `montree-media`, path `brand/{schoolId}/logo-{ts}-{rand}.{ext}`.**
Taken from `app/api/montree/uploads/route.ts`, which is the closest precedent —
a public bucket, per-school folder, client URL via `getProxyUrl()`. The logo is
printed on sheets that go home in twenty book bags, so it is not a secret, and a
signed URL would expire mid-print-job. The key is timestamped rather than fixed
because a fixed key would be served stale from the Cloudflare cache for its
whole TTL, and the school would print its old logo for a week after replacing
it. The bucket already exists — **no dashboard step needed**.

**SVG is rejected.** The prototype's drop zone said "PNG, JPG or SVG"; the
server accepts `image/png|jpeg|webp|gif` only. An SVG served from our own origin
renders as a *document* when opened directly — scripts and all — which would
turn "upload your logo" into stored XSS on montree.xyz. (Inside an `<img>` it is
inert; direct navigation is the problem.) It also frequently has no intrinsic
size, which the canvas extractor cannot read. If SVG support is wanted later,
the safe route is server-side rasterisation to PNG on upload, not relaxing the
allow-list.

**Who may configure it: teacher or principal.** The card lives on the *teacher*
settings page, as briefed. Agent and org-admin tokens carry an inert `schoolId`
(see `lib/montree/server-auth.ts`), so they are refused — letting one through
would rebrand whichever school happened to be on the token. The role is read
defensively (`auth.role` may not be exposed by `verifySchoolRequest`; if it is
absent the session is treated as a school session, which is what it has always
been). **If a logo should be principal-only, tighten `mayConfigureBrand()` — one
line.**

**The server owns the logo URL.** A posted kit's `logoUrl`/`logoPath` are
ignored outright; they are minted from a file this route stored in this school's
own folder. Trusting the body would let a saved theme point a school's crest at
any URL on the internet.

**`settings` is merged, never replaced.** It is a shared JSONB bag; writing
`{ brand_kit }` over it would delete whatever else lives there. Two admins
saving at once is last-write-wins — acceptable for a once-a-year setting, and
the alternative (a JSONB path update) is a raw-SQL dependency this feature does
not otherwise need.

**`DELETE` disables rather than forgets.** A school turning the theme off for a
term gets its crest back with one tap. `?purge=1` is the real removal, and it is
what the settings card's "Remove logo" button calls.

### Deviations from the prototype (deliberate)

1. **No per-label crest.** The prototype wrapped each label in an
   `.mt-doc-labelcard` element carrying a small `<img>` crest. That wrapper
   lives in `components/cms/documents/DocumentBody.tsx`, which is shared with
   Harbor and is never modified from the Montree side. The card is therefore
   drawn as `.cms-doc-label::before` (inset frame + radius + wash) instead, and
   the crest is dropped rather than faked with a `background-image` — a CSS
   background is exactly what disappears when "Background graphics" is off, and
   that is the failure the `<img>` decision exists to avoid. Everything else
   about the approved label treatment (frame, wash, display-serif name,
   letterspaced accent room line over a hairline, corner marks on Full) is
   reproduced.
2. **Watermark suppression on name labels is unchanged, with a better reason.**
   Not "twelve crests already on the page" (there are now none) but: a label
   sheet's body is a cut grid, so a ghost lands in the gutters between cards and
   inside cards about to be cut out and laminated — the "reads as a printing
   fault" case the birthday board's own watermark note warns about.
3. **`--doc-wash-strong` and `--doc-rule` are gone.** `wash-strong` was declared
   and emitted by the prototype but never consumed by any rule, and `rule` was
   always equal to `accent`. The stored token set is exactly the five in the
   brief.
4. **Corner marks (Full) hang off two elements.** One pseudo-element draws one
   corner and `.cms-doc-label::before` is already the card frame, so the second
   mark is `.cms-doc-label-name::after`, absolutely positioned against the
   label. The name span is deliberately left unpositioned so that resolves.
5. **One ghost per document, not per page.** It is centred on the sheet, so a
   class list running to three pages carries it on the middle one. CSS cannot
   repeat an element per printed page (only `@page` margin boxes can, and they
   cannot take images), and stamping page one alone would read as a header that
   failed to repeat. Called out in a comment at the rule.
6. **`.cms-doc-table td { overflow-wrap: break-word }`** is included, scoped
   under `.mt-branded`. The prototype's own comment says it belongs in
   `print-css.ts` proper because it is a fix to the ink rather than the theme —
   but that file is CMS-owned. Worth moving there in a CMS-side change.

### i18n — read this before the next commit

`app/montree/dashboard/settings/page.tsx` calls `t()` for every new string
through a `tx(key, fallback)` helper. Montree's translator returns the raw key
when it has no entry, so `tx` detects that and renders English instead of
`brandKit.title`. The English lives in one object, `BRAND_COPY`, at the top of
the file.

**The pre-commit i18n hook is strict across all twelve locales**, so the keys in
`BRAND_COPY` (≈40, all prefixed `brandKit.`) must be added to
`en/zh/es/de/fr/pt/nl/it/ja/ko/uk/ru` before this ships as a translated feature.
Until they are, the card is English everywhere and nothing is broken; the moment
they land, every string switches over with no code change. `BRAND_COPY` is the
key list — hand it to the i18n pass as-is.

The **paper** is unaffected: the theme adds no printed strings at all.

---

## Manual steps

1. **None in Supabase.** No migration, no bucket to create (`montree-media`
   already exists and is already served through the media proxy).
2. **i18n pass** — add the `brandKit.*` keys above to the twelve locale files
   (English is already written; `en` + `zh` by hand per house rule, the rest via
   `i18n:fill-ui`).
3. **Print check on real paper**, once, per intensity. The numbers say a 0.965-L
   wash reproduces as a tint on a classroom laser; a printer is the only thing
   that can confirm it. Worth checking specifically: the label card frame at
   Whisper (no wash — is the hairline enough?), and the ghost at Full (9%) on a
   toner-low machine.
4. **Optional follow-up**: nothing else on the platform reads
   `montree_schools.logo_url` yet. Parent reports, the parent portal header and
   the birthday board are all obvious next users of the same column.
