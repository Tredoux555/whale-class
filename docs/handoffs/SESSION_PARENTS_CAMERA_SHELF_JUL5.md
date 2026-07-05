# SESSION — Jul 5, 2026 (Cowork) — Parents report move · Apple landscape camera · Photo-ID determinism · Shelf status ladder · Permanent session · PWA no-flash

**14 commits on `main`, ending `c42ccbba` (HEAD == origin/main, tree clean).** Pushed via Desktop
Commander from the montree Cowork checkout. Every item built one-at-a-time under the sacred build rule
(audit thinking → build → audit build → ship), then a full top-to-bottom re-audit against the actual
code before this handoff. No migrations. No new env vars.

## Commit ledger (oldest → newest)

| SHA | What |
|---|---|
| `da4cfac5` | Parents tab hosts the full report generate+send workflow; page collapsed to ONE header; Wrap Up = Confirm-only |
| `a5457413` | Camera bottom-bar in landscape — **superseded** |
| `6183c9cd` | Photo-ID: `temperature:0` on all identification calls |
| `f7fe3f5f` | Corrections: tier-gate the visual-memory "welder" (Sonnet on Premium, Haiku on Core) |
| `855834c9` | Camera full-bleed — **superseded** |
| `48505047` | Camera preview shows exactly what's captured (no full-bleed) — **superseded (landscape)** |
| `14b72628` | Shelf Fix 1: a confirmed photo advances status via ONE shared ladder |
| `7cc24470` | Shelf Fix 2a: recommended works default to `not_started` + never-downgrade guard |
| `25ec4850` | Session: login effectively permanent on device (30d → 10y) |
| `c0d6f102` | PWA: bump SW cache v12→v13 (purge stale shell; fixes top-clip on launch) |
| `78c1deff` | PWA: kill the splash flash on launch (readable `montree_surface` hint cookie) |
| `233c7d3b` | Shelf Fix 2b: mastered → next work onto the shelf in real time (closes the loop) |
| `93ca347d` | **Camera: restore Apple-style landscape rail** (controls on physical edge, `-rotate-90` labels) |
| `c42ccbba` | **Camera: PHOTO/VIDEO → emerald segmented icon pill** (fixes rotated-text overlap in the landscape rail) |

## 1. Parents / Wrap Up refactor (`da4cfac5`)

Report generation moved OUT of Wrap Up (photo-audit) and INTO the Parents (parent-codes) tab.
- `app/montree/dashboard/parent-codes/page.tsx` — ONE header (`<h1>Parents</h1>` + `LanguageToggle`
  only, ~line 392/410). Three pills: **Codes / Reports / Chats** (`activeTab`, default `codes`). The
  **Reports** pill hosts `<WeeklyWrapTab classroomId={codes[0]?.classroom_id || ''} />` (dynamic import,
  gated on `canManageReports`, ~line 487–492) — the full generate → review → send flow, one surface.
  Bulk-generate moved into the Codes tab. Redundant top "Parent Chats" button + subtitle dropped.
- `app/montree/dashboard/photo-audit/page.tsx` — the `weekly_wrap` ZONE_TABS entry is commented out
  (~line 2594) and the old deep-link remap now sends `weekly_wrap`→`all`.
  **🚨 Audit-confirmed: there is NO `setZone('weekly_wrap')` anywhere and no URL param maps to it — the
  Parents-report generator is genuinely unreachable from Wrap Up.** The residual zone-type entry +
  render code at lines 102/1009/2551/2723 are harmless dead code for an unreachable zone.
- **Contract:** Wrap Up = daily photo-confirm only. Parents tab = generate + send reports. Don't
  re-add a report tab to photo-audit.

## 2. Apple-style landscape camera (`93ca347d`, final — supersedes `a5457413`/`855834c9`/`48505047`)

Three earlier attempts this session were wrong (bottom bar, full-bleed, distinct-preview-still-bottom-bar).
The user wants **Apple behaviour: controls follow the device's physical edge**. Restored the
device-validated layout from `ded705b3`:
- `components/montree/media/CameraCapture.tsx` — re-introduced `isLandscape` state + orientation
  listener (`window.innerWidth > window.innerHeight`, re-checked on resize/orientationchange).
- Root: `flex ${isLandscape ? 'flex-row' : 'flex-col'}`.
- **Portrait** → controls are a bar BELOW the preview (unchanged; min 20px bottom clearance).
- **Landscape** → controls become a **140px vertical rail on the right (physical-bottom) edge**, all
  labels `-rotate-90` so they read upright (shutter centre, mode toggle top, Album+Cancel bottom); the
  switch-camera icon gets `rotate-90`. Preview fills the rest — no more fat bottom bar squashing it.
- Lint: 0 errors (2 pre-existing warnings unrelated: `stopRecording` dep, captured `<img>`).
- **🚨 Known caveat (documented, not a bug):** the rail is on the right and reads correctly for the
  common landscape hold (rotate counter-clockwise). If the user rotates the *other* way and labels read
  upside-down, the fix is a one-line mirror (flip the rail side + rotation), NOT a rebuild. This was the
  hold the layout was device-validated for previously.
- **Rule:** don't collapse landscape back to a bottom bar again — the user rejected it 3×.
- **PHOTO/VIDEO overlap fix (`c42ccbba`):** in the landscape rail the rotated text labels overlapped
  ("VIDEPHOTO") — a `-rotate-90` text element keeps its *unrotated* layout box, so two stacked rotated
  words collide. Replaced the text toggle with a shared **emerald segmented icon pill** (`modeToggle`
  const: camera + video inline SVGs, active = `#34d399` fill / `#04150c` icon, inactive = dim white).
  Icons are square → no rotated-width overlap, and they're NOT rotated (recognisable either way).
  `flex-row` in portrait, `flex-col` in landscape. Used in BOTH orientations. **Rule:** never put
  `-rotate-90` on a multi-word/wide text element in a stacked rail — use a square icon or reserve the
  rotated dimension explicitly.

## 3. Photo-ID determinism (`6183c9cd`)

Root cause of the "gets it right once then wrong on reruns, learns nothing" whack-a-mole: the Anthropic
Messages API default `temperature` is **1.0** and was never pinned, so identical inputs produced
different answers. Pinned `temperature: 0` on all 4 identification model calls:
- `lib/montree/photo-identification/two-pass.ts` — Pass 1 (L544), Pass 2 (L738), Pass 2b (L911).
- `lib/montree/photo-identification/sonnet-draft.ts` — the AI_MODEL draft (L310).
- **Rule:** every photo-ID model call is deterministic (`temperature: 0`). Never add an identification
  call without it. The user's original post-CLIP two-pass was "stronger" partly because accreted
  changes had never re-pinned temperature after refactors.
- Verified live: a brand-new school reads Brown Stair correctly 3/3 (user-confirmed). The old
  whack-a-mole was temperature 1.0 + a per-classroom moat polluted during a temp-1.0 correction session.

## 4. Visual-memory "welder" tier-gate (`f7fe3f5f`)

`app/api/montree/guru/corrections/route.ts` — `enrichVisualMemoryFromCorrection` now takes `tier` and
uses `authorModel = tier === 'sonnet' ? AI_MODEL : HAIKU_MODEL` (L703) + `temperature: 0`. Premium
schools get Sonnet-authored fingerprints; Core (Haiku) schools get Haiku-authored ones — cheaper, and
Haiku is the model that READS them back at match time. Free tier: correction still saves, enrichment
skipped (L378 branch).

## 5. Shelf status ladder — the user's exact model, now cemented

The user's model: **recommend → `not_started` → (photo) `presented` → (photo) `practicing` → (stays) →
(teacher) `mastered` → (analyse) next work → `not_started`.** Before this, a confirm only touched
`updated_at` and never advanced; a work with no row jumped to `practicing` via a load-time default —
the exact Cylinder-Block-advanced-but-Number-Rods-didn't inconsistency.

- **Fix 1 (`14b72628`)** — `lib/montree/progress/advance-on-confirm.ts` (NEW) is THE single shared
  ladder every confirm routes through: no row → `presented`; `not_started`→`presented`;
  `presented`→`practicing`; `practicing` stays (touch); `mastered` untouched; NEVER downgrades.
  Wired in `app/api/montree/guru/corrections/route.ts` (L532, exactly ONE call) and
  `app/api/montree/photo-audit/resolve/route.ts` (new_custom branch, L393, exactly ONE call).
- **Fix 2a (`7cc24470`)** — `lib/montree/progress/seed-recommended-work.ts` (NEW): a recommended work
  inserts at `not_started` ONLY if the child has no existing row (never downgrades). Wired into
  `replan-child.ts` (main + gap-fill), `fill-shelf/route.ts` (main + gap-fill), and `shelf/route.ts`.
  This also killed the replan footgun that used to reset `practicing`→`presented`.
  `FocusWorksSection.tsx` renders the `not_started` badge as `t('status.notStarted')` at 0.45 opacity.
- **Fix 2b (`233c7d3b`)** — `lib/montree/progress/advance-shelf-after-mastery.ts` (NEW): on the FIRST
  mastery of a work (`isFirstMastery`, i.e. no pre-existing `mastered_at`), drop the next
  curriculum work in that area (by `sequence`, skipping anything the child has touched) onto the shelf
  at `not_started` — in real time, not just weekly replan. Fired fire-and-forget from
  `app/api/montree/progress/update/route.ts` (~L225), guarded on `isFirstMastery && classroomId && area`.

**🚨 Audit-confirmed no double-advance:** `/corrections` calls the advance once; `/resolve` (new_custom
only) calls it once; the client fires exactly ONE of those endpoints per user action. A single confirm
= one rung. `advanceProgressOnConfirm` and `seedRecommendedWork` both match by `(child_id, work_name)`
(the table UNIQUE key), never by `work_id`.

**One honest caveat (by design):** mastery advance fires on ANY first-mastery that carries an `area` —
including mastering an older work that isn't the current shelf item, which would swap that area's shelf
slot to next-in-sequence. Matches the "master → next" rule; just fires on any mastery, not only the
shelf item. The status picker passes `area`; a surface that marks mastery without `area` won't fire the
real-time advance (weekly replan backfills it).

## 6. Permanent session (`25ec4850`)

`lib/montree/server-auth.ts` — `MONTREE_JWT_TTL_DAYS` default 30 → **3650** (≈10y, effectively
permanent), cookie `maxAge` matches. A teacher on their own classroom device never gets silently logged
out (most won't have saved their code; a mid-class lockout is devastating). `recoverSession()` already
rebuilds the client session from this cookie after iOS wipes localStorage on PWA relaunch. Override via
`MONTREE_JWT_TTL_DAYS` env if ever needed.

## 7. PWA no-flash + top-clip (`78c1deff` + `c0d6f102`)

- **No-flash (`78c1deff`)** — `setMontreeAuthCookie` now also sets a NON-httpOnly `montree_surface`
  cookie (principal→`/montree/admin`, agent→`/montree/agent/dashboard`, else `/montree/dashboard`),
  cleared on logout. `app/montree/page.tsx`'s pre-paint inline script reads it from `document.cookie`
  (after the localStorage checks) so a home-screen launch jumps straight into the app before the
  marketing splash paints — **cookies survive the iOS standalone-launch localStorage wipe; localStorage
  doesn't.**
- **Top-clip (`c0d6f102`)** — SW cache `montree-v12`→`montree-v13`. The dashboard `<main>` height calc
  was already correct in code; installed PWAs were serving the OLD bare-`100dvh` shell that clipped the
  header row. v13 purges the stale shell on next open.

## Verification / test plan (user does on device)

1. **Reopen the installed PWA once** (SW v13 purges the stale shell → loads all new JS + fixes top-clip).
2. **Log out and back in once** — issues the 10-year token + sets the `montree_surface` hint cookie.
   From then on: no splash flash on launch, permanent login.
3. **Camera landscape** — turn phone on its side: controls should be a vertical rail on the RIGHT,
   labels upright, preview large (not a fat bottom bar). The PHOTO/VIDEO toggle is now an emerald icon
   pill (camera/video icons, no overlapping text). If the Cancel/Retake labels are upside-down for your
   hold, tell me — one-line mirror.
4. **Shelf ladder** — recommend a work (shows *Not Started*) → confirm a photo (→ *Presented*) →
   confirm another (→ *Practicing*) → mark *Mastered* → next work appears at *Not Started*.
5. **Photo-ID** — captures should be stable across reruns of the same photo now.

## What's NOT done / owed

- **Prod DB forensics** (Miss Chen classroom moat inspection) — the Supabase pooler
  (`aws-1-ap-southeast-1.pooler.supabase.com:5432`) was unreachable all session (China network/VPN).
  Delivered code-level diagnosis instead. If the pooler recovers, worth inspecting whether Miss Chen's
  moat needs a targeted cleanup (it was polluted during a temp-1.0 correction session). A fresh school
  starts clean off the global canonicals, so this is only for existing polluted classrooms.
- **Landscape rail side-mirror** — only if the user reports upside-down labels on the opposite hold.
