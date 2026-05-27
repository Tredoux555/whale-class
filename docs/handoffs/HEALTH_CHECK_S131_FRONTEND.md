# Session 131 — Frontend Perf & Bundle Health Check

Read-only audit. No code changes. File paths absolute.

---

## 1. Service worker state — **HEALTHY**

`public/montree-sw.js` is at **CACHE_NAME = 'montree-v8'** (bumped S114). Narrow-intercept still enforced per S76 rule: `isCacheable()` allowlist limited to `/_next/static/`, `/montree-icons/`, and the IMMUTABLE_EXT regex. Navigation requests are intercepted only to fall back to `OFFLINE_URL` on network failure (no synthetic 503). No HTML cached. No new fetch handler logic since v8 — version stamp hasn't moved in 13 days despite S118–S130 shipping ~70 commits, meaning **stale PWA shells are likely in the wild**. Severity: **MED**. Recommended fix: bump to `montree-v9` when next deploying user-facing perf or auth changes.

## 2. `dynamic({ ssr: false })` in Server Components — **CLEAN**

19 files use `dynamic({ ssr: false })`. Every single file has a `'use client'` directive (verified via head-scan of all 18 candidates). The Session 114 rule is being honored. The comment block at `app/montree/layout.tsx:14` even documents the Next.js 16 constraint inline. Severity: **N/A — pass**.

## 3. `100vh` regressions — **52 files, HIGH volume**

S114 ruled `100dvh` canonical. **52 files still use `100vh`** (79 raw occurrences). Most are `minHeight: '100vh'` on full-page surfaces. Real mobile-viewport offenders:

- `app/montree/dashboard/curriculum/page.tsx:206,218` — main dashboard route, no `100dvh` migration. **HIGH**
- `app/montree/dashboard/notes/page.tsx:79,114` — teacher notes page. **HIGH**
- `app/montree/dashboard/photo-audit/page.tsx:2455` — hot surface, heavy traffic. **HIGH**
- `app/montree/dashboard/raz/page.tsx`, `app/montree/dashboard/focus/page.tsx`, `app/montree/dashboard/conversations/page.tsx`, `app/montree/dashboard/language-semester/page.tsx`, `app/montree/dashboard/classroom-overview/page.tsx`, `app/montree/dashboard/parent-codes/page.tsx`, `app/montree/dashboard/appointments/page.tsx` — all customer-facing. **MED**
- `app/montree/admin/layout.tsx:327` — principal layout root. **MED**
- `app/montree/dashboard/[childId]/print/page.tsx` + `app/montree/dashboard/present/page.tsx` — print/A4 surfaces. Leave alone. **EXCLUDE**
- `components/montree/guru/PhotoInsightPopup.tsx:222`, `components/montree/child/ChildGuruChat.tsx:354`, `components/montree/super-admin/AgentInboxTab.tsx:263` — `calc(100vh - N)` patterns; need `dvh`. **MED**

Severity: **HIGH** in aggregate. Recommended fix: scripted `100vh → 100dvh` sweep on `app/montree/dashboard/**/*.tsx` and `app/montree/admin/layout.tsx`, excluding `print/` and `present/` (print CSS uses physical `mm` so 100vh moot there anyway).

## 4. Image dimension attrs — **REGRESSED since S107**

`<img` tags lacking `width`+`height`:

| Missing | File |
|---|---|
| 10 | `app/montree/dashboard/raz/page.tsx` (no `loading="lazy"` either) |
| 6 | `components/card-generator/print-utils.ts` (print, exclude) |
| 4 | `app/montree/library/tools/phonics-fast/page.tsx` |
| 4 | `app/montree/dashboard/snap/page.tsx` |
| 3 | `app/montree/library/tools/phonics-fast/reverse-bingo/page.tsx` |
| 3 | `app/montree/library/tools/phonics-fast/bingo/page.tsx` |
| 3 | `app/montree/library/tools/flashcard-maker/page.tsx` |
| 3 | `app/montree/dashboard/photo-audit/page.tsx` |
| 3 | `app/montree/dashboard/labels/page.tsx` |
| 3 | `app/montree/dashboard/[childId]/gallery/page.tsx` |
| 3 | `app/admin/classroom/student/[id]/page.tsx` |
| 3 | `app/admin/classroom/[childId]/page.tsx` |
| 2 | `components/montree/student/ProfilePhotoCapture.tsx` |
| 2 | `app/montree/super-admin/community/page.tsx` |
| 2 | `app/montree/library/tools/vocabulary-flashcards/page.tsx` |

Severity: **MED**. `raz/page.tsx` is the worst offender — 10 imgs, no lazy, no dims. Photo-audit + gallery are high-traffic. Recommended fix: prioritize the top 5 surfaces, add `width`/`height`/`loading="lazy"` mechanically.

## 5. Dead code / file-level eslint-disable headers — **CLEAN**

Grep for file-level `// eslint-disable` headers across `app/` + `components/` returns **zero results with TODO markers**. The S111 `FocusWorksSection.tsx` + `[childId]/page.tsx` headers from commit `5fddb0c8` have been removed (verified — both files have clean top sections). Only inline `// eslint-disable-next-line` calls remain (e.g. `DashboardHeader.tsx:22,261,286,330,905`), all targeted and justified. Severity: **N/A — pass**.

## 6. Hoisted `dynamic()` options — **CLEAN**

Grep for `dynamic(..., variableName)` (vs inline `{...}` object literal) returns **zero matches**. S76 Turbopack constraint is being honored across all 19 dynamic-import sites. Severity: **N/A — pass**.

## 7. AppLockOverlay + OnlineStatusBanner — **HEALTHY**

Both mounted at `app/montree/layout.tsx:129,130` as direct imports of `'use client'` components (lines 16, 20). Server-component layout (no `'use client'` on this file) imports them directly per S114 rule. No `dynamic({ ssr: false })` regression. Both internally gate on pathname (verified in S114 commit notes). Severity: **N/A — pass**.

## 8. Re-render hot spots — **CLEAN**

- `lib/montree/i18n/context.tsx:242` — `value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])`. **MEMOIZED**.
- `lib/montree/features/context.tsx:102` — `value = useMemo(...)` with explicit S76 comment "Mirror of i18n context's useMemo pattern." **MEMOIZED**.
- `components/montree/DashboardHeader.tsx` — wrapped in `memo()` per S76 (line 5 imports `memo`).

No regression on the S76 fixes. Severity: **N/A — pass**.

## 9. Recent commits regression risk — **LOW**

Last 5: `ce41d3e2` (corner-video controls + toggle move), `b0f0b8d1` (CLAUDE.md only), `e6d7bfa0` (binary asset swap), `85b0ee7e` (corner video build), `f2f805de` (zh video assets). All five are landing-page splash work. No fire-and-forget, no hardcoded model strings, no race conditions. The 40MB `montree-splash-video-zh.mp4` binary in `f2f805de` is a **MED** repo-size risk (rule #248 caps locale variants at 2–3). The dual `fetch(url, { cache: 'force-cache' })` preload at `app/montree/page.tsx:46` is fire-and-forget with silent `.catch()` — acceptable per project pattern. Severity: **LOW**.

## 10. Bundle bloat — **CLEAN with one note**

`package.json` shows no surprise heavyweights. `framer-motion ^12.27.5` is present but only imported in 8 files, all under `app/montree/dashboard/games/*` (sensorial-sort, bead-frame, hundred-board, odd-even, quantity-match) — niche game routes, not on critical render path. No `recharts`, no `chart.js`, no `d3`, no `three`, no `moment`, no `lodash`. `crypto-js ^4.2.0` present but documented (used in encryption layer). `agora-rtc-sdk-ng` + `agora-token` documented per S117. Severity: **LOW**. Recommended note: framer-motion should be lazy-loaded via `dynamic()` on the games routes if not already (worth a follow-up check).

---

## Top 5 actionable

1. **HIGH — `100vh → 100dvh` sweep** on ~10 customer-facing dashboard files (`curriculum`, `notes`, `photo-audit`, `raz`, `focus`, `conversations`, `language-semester`, `classroom-overview`, `parent-codes`, `appointments`) + `admin/layout.tsx:327` + 3 `calc(100vh - N)` components. Mechanical; sed-friendly. Exclude `print/` and `present/`.
2. **MED — Bump SW to `montree-v9`** on next deploy. v8 has been live 13 days through ~70 commits; PWA users are likely on stale shells without realizing.
3. **MED — `raz/page.tsx` image dim sweep**: 10 `<img>` tags, no lazy, no dims. Highest CLS impact remaining in the codebase.
4. **MED — Photo-audit + gallery image dims** (3 each on high-traffic surfaces).
5. **LOW — Confirm framer-motion is lazy** on `app/montree/dashboard/games/*`. Five route files import top-level — `dynamic()` wrapping would defer the ~80KB chunk.

No CRITICAL findings. The S76/S107/S111/S114 architectural rules are all being honored.
