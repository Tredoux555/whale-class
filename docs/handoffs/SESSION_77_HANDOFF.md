# Session 77 Handoff — i18n Completeness Sweep + Automation + Mobile Polish (Apr 30, 2026)

**Status: ALL WORK COMPLETE LOCALLY. Three commits ready. One commit (`fa6d3722`) is already on `main`. Two more (`5255a2e5` and the upcoming Session 77 polish commit) are staged/pending push.**

---

## Why this session happened

User opened the Ukrainian dashboard on mobile and saw three things wrong:
1. **"Golden Bead Multiplication"** rendering in English under Ukrainian locale — the `name_uk` column literally contained the English string.
2. **"PHOTOS"** label in English on a stats tile — UI translation key missing.
3. **Empty colored dots** on the focus list — the localized area letters (P/L/S/M/C in English; localized for other locales) had been added in an earlier session but were missing from production.

Plus a screenshot follow-up showing **header overlap on mobile** ("Engdish" text — the language toggle pill overlapping the "Whale Class" classroom title) and a **stats tile row** at the bottom of the child page that the user said was redundant.

---

## What got fixed

### A. UI translation completeness — 9 languages × 93 keys filled

`de`, `fr`, `pt`, `nl`, `it`, `ja`, `ko`, `uk`, `ru` were each missing the same 93 UI keys. They were added to `en.ts` *after* the original language scaffolding ran, so no script ever translated them. Production users of those languages saw English fallback for things like:

- `summary.askGuruPrompt`
- `weeklyWrap.nextWeekFocus`
- `parentDashboard.thisWeekMoments`
- `parentLogin.welcomeSubtitle`
- 89 others

**All 12 locales now at 100% UI key parity (3735/3735 each).**

Verifier: `npm run i18n:check` — exits 0, all green.

### B. Curriculum work names — full sweep

Whale Class had 419 curriculum works. Drift counts before this session:
- `uk`: 42 untranslated (English text in the column)
- `ru`: 20 untranslated
- `zh`: 20 empty cells
- `es`/`de`/`fr`/`nl`/`it`: 2-3 each (most were "Bingo" / "Collage" loanwords — not real bugs)
- `ko`: 1
- `pt`/`ja`: 0

All fixed. Plus a Latin-i homoglyph pass on Ukrainian (Haiku had used U+0069 `i` instead of U+0456 `і` in 4 strings — visually identical but technically Latin).

**Final state: 419/419 work names translated for every non-English language.**

### C. Guide content — confirmed complete

`guide_content_<locale>` JSONB columns are at 384/419 across all non-English languages. The "missing" 35 works are works that don't have an English `quick_guide` to translate from in the first place — nothing to translate, no action needed.

### D. Area letter icons in focus list

`FocusWorksSection.AreaDot` previously rendered an empty colored circle. Now shows a localized one- or two-letter code matching the curriculum overview cards.

New `AREA_PREFIXES` map in `lib/montree/i18n/area-labels.ts`:

| Locale | P. Life | Sensorial | Math | Lang | Cultural |
|--------|---------|-----------|------|------|----------|
| en | P | S | M | L | C |
| zh | 日 | 感 | 数 | 语 | 文 |
| es | V | S | M | L | C |
| **de** | **Pr** | **Si** | **Ma** | **Sp** | **Ku** |
| fr | V | S | M | L | C |
| pt | V | S | M | L | C |
| nl | P | Z | W | T | C |
| it | V | S | M | L | C |
| ja | 日 | 感 | 算 | 言 | 文 |
| ko | 일 | 감 | 수 | 언 | 문 |
| **uk** | **Пр** | **Се** | **Ма** | **Мо** | **Ку** |
| ru | П | С | М | Я | К |

Two-letter codes for German (Sinnesmaterial vs Sprache both = S) and Ukrainian (Математика vs Мова both = М). Single chars everywhere else.

`getAreaPrefix(area, locale)` is the canonical helper. Font size auto-scales (50% of dot for 1-char, 36% for 2-char) with `letterSpacing: -0.02em` on the 2-char variant.

### E. Drift defence automation

So this whole class of "key was added to en.ts but never translated" can never silently ship again, three layers got added:

#### 1. Pre-commit hook (`.githooks/pre-commit`)

- Fires only when `lib/montree/i18n/*` files are part of the commit.
- Runs `node scripts/check-i18n-completeness.mjs --strict`.
- Strict mode = exit non-zero if `en.ts` has any key not in every other language file.
- Prints the exact fix command (`ANTHROPIC_API_KEY=... npm run i18n:fill-ui`).
- Bypassable with `git commit --no-verify` for emergencies.
- Native git hook (no Husky dependency). Install: `npm run hooks:install` (one-time per machine, runs `git config core.hooksPath .githooks`).

#### 2. npm scripts (`package.json`)

```
i18n:check          → drift report (warning thresholds)
i18n:check:strict   → exit non-zero on ANY missing key
i18n:fill-ui        → Haiku-translate missing UI keys, all langs at once
i18n:fix-names      → Haiku-translate untranslated curriculum work names
                      (default: only active classrooms with children;
                       --all for full backfill, --dry-run to report only)
i18n:sync           → fill-ui + fix-names + bleedthrough + check (full pipeline)
hooks:install       → wires git core.hooksPath to .githooks
```

#### 3. Admin API route (`/api/montree/super-admin/i18n-sync`)

- `GET` = read-only drift report (no Haiku spend) — useful for daily monitoring.
- `POST` (default) = dry-run check.
- `POST { mode: 'fix' }` = actually translate.
- `POST { mode: 'fix', allClassrooms: true }` = full backfill (more $$).
- `POST { mode: 'fix', classroomId: 'uuid' }` = single classroom.
- Auth: super-admin session OR `x-cron-secret` header (Railway scheduled tasks can call without a UI session by setting `CRON_SECRET` env var).

To wire weekly Railway cron later: set `CRON_SECRET`, schedule daily `GET` for monitoring, weekly `POST { mode: 'fix' }` (or alert + manual approval via super-admin UI).

### F. Service worker cache bump

`public/montree-sw.js` `CACHE_NAME` bumped `'montree-v2' → 'montree-v3'`.

The user reported empty area dots on production after the deploy. Code shipped fine; PWA was serving the cached v2 JS bundle. v3 forces activate-side cache purge so the AreaDot change actually loads. Same fix pattern as Session 76's "stale-dashboard incident."

### G. Mobile header overlap fix

`components/montree/LanguageToggle.tsx` rewritten:
- Visible pill now shows `LOCALE_SHORT_LABELS` (`EN`, `ZH`, `УКР`, etc. — 2-3 chars) instead of full display names (`English`, `Українська` — 7-10 chars).
- Hidden native `<select>` overlays the pill to capture taps and show OS picker with full names.
- Saves ~40-60px of horizontal space on every screen.

`components/montree/DashboardHeader.tsx` classroom name max-width:
- Was: `maxWidth: 160` (fixed px).
- Now: `maxWidth: 'min(40vw, 200px)'` — narrower on mobile, slightly wider on desktop.

### H. Stats tile row removed from child page

`app/montree/dashboard/[childId]/page.tsx` lines 797-904 (the 3-column "5 MASTERED / 14 PRACTICING / N Photos" tile row below the focus list) — gone.

Also removed:
- Unused `Sparkles`, `TrendingUp`, `Camera` icon imports.
- `progressStats` state + `setProgressStats` call (was only used here).
- `photoCount` state + `setPhotoCount` call (the page-level one — local `photoCount` const for `childDataRich` derivation kept).

The focus list and ◐/✓ badges already convey the same information without the tile row.

---

## Files changed (all sessions on Apr 30, 2026)

### Commit `fa6d3722` (already on main)
- `components/montree/child/FocusWorksSection.tsx` — AreaDot renders prefix
- `lib/montree/i18n/area-labels.ts` — AREA_PREFIXES + getAreaPrefix()
- `lib/montree/i18n/{de,fr,pt,nl,it,ja,ko,uk,ru}.ts` — 93 new keys each
- `scripts/fill-missing-i18n-keys.mjs` (new)
- `scripts/fix-untranslated-work-names.mjs` (new)
- `scripts/fix-bleedthrough.mjs` (new)

### Commit `5255a2e5` (already on main)
- `.githooks/pre-commit` (new)
- `app/api/montree/super-admin/i18n-sync/route.ts` (new)
- `scripts/sync-curriculum-translations.mjs` (new)
- `scripts/check-i18n-completeness.mjs` — added --strict flag with key-set diff
- `package.json` — i18n:* + hooks:install scripts

### Commit pending (this Session 77)
- `public/montree-sw.js` — CACHE_NAME → montree-v3
- `components/montree/LanguageToggle.tsx` — short labels
- `components/montree/DashboardHeader.tsx` — classroom name maxWidth
- `app/montree/dashboard/[childId]/page.tsx` — stats row removed + cleanup

---

## To finish (user actions on the Mac)

1. **Commit + push the polish work**:
   ```
   cd ~/Desktop/Master\ Brain/ACTIVE/whale
   git add public/montree-sw.js \
           components/montree/LanguageToggle.tsx \
           components/montree/DashboardHeader.tsx \
           app/montree/dashboard/[childId]/page.tsx \
           docs/handoffs/SESSION_77_HANDOFF.md
   git commit -m "Mobile polish: SW v3, compact lang toggle, remove stats row"
   ```
   Then push via Desktop Commander.

2. **Verify on production** once Railway redeploys (~2 min):
   - **PWA users may need to close + reopen the app** for the v3 service worker to activate.
   - Switch dashboard language to Українська → "Golden Bead Multiplication" should now read "Множення з Золотими Бісеринками".
   - Focus list dots should show letters: **Ма** for Mathematics, **Мо** for Language, **Пр** for Practical Life, **Се** for Sensorial, **Ку** for Cultural.
   - Header should fit cleanly on mobile (no Engdish overlap).
   - Child page no longer has the 5 MASTERED / 14 PRACTICING / Photos row.

---

## Cost summary

- ~$3-4 in Haiku calls total across all batch passes (UI keys + work names + bleedthrough cleanup).
- Future drift defence is **passive** — only spends Haiku when actual drift is detected.

---

## Architectural notes for future sessions

- **`getAreaPrefix(area, locale)` is the canonical area-letter helper.** Use it any time you render a colored area dot. Returns 1-2 chars.
- **Pre-commit hook is on by default once installed.** Bypass with `--no-verify` only in emergencies.
- **Service worker version bumps require user-side reactivation.** Bumping `CACHE_NAME` forces the SW activate event to purge old caches, but PWA installs need to close+reopen (or hard-refresh on web) for the new SW to take over.
- **`auto-translate.ts` already covers new-work creation** — `translateAllLocales(input)` runs through every `ENABLED_LOCALES` entry. Day-to-day new works should never re-introduce drift.
- **Stats row was the redundant kind.** If anyone wants per-child mastery counts back, query `montree_child_progress` and filter — the focus list status badges already tell the same story.
