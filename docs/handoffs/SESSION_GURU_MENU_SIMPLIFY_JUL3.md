# SESSION — Jul 3, 2026 (Cowork, pt 4) — Guru-first + Guru composer viewport fix + Curriculum Gaps default-OFF + menu strip to 5

**3 commits on `main` (`791474dd` → `8058cb2f` → `4f467ef4`), Railway auto-deploying. No pending Supabase run — migration 280's effect was applied directly to prod via the pooler.** Plus 2 prod DB ops via the pooler (Sarah's Bright Stars menu reorder + the feature-definition default flip).

Driven by a live iPhone walkthrough of the newly-seeded **Bright Stars Academy / Sarah** test account.

---

## Commits

| SHA | What |
|-----|------|
| `791474dd` | Guru: first on the menu + composer no longer falls off-screen on iPhone |
| `8058cb2f` | Curriculum gaps: default OFF (opt-in via admin) + Guru dead-code cleanup |
| `4f467ef4` | Menu: strip to 5 essentials; hide Menu Management + Invite Principal |

---

## 1. Guru composer was off-screen on iPhone (`791474dd`)

**Root cause.** `app/montree/dashboard/guru/page.tsx` rendered `h-dvh` (100dvh) but sits BELOW the **sticky** `DashboardHeader` in the shared `app/montree/dashboard/layout.tsx`. So the page was a full 100dvh block starting *after* the header → total document height = headerH + 100dvh → the composer landed headerH px below the viewport bottom. Reachable only by scrolling, so Guru "looked like it wasn't working."

**Fix.** Measure the sticky header live and size the chat to `calc(100dvh - headerHeight)`:
- Added `data-dashboard-header` to **BOTH** `<header>` returns in `DashboardHeader.tsx` (teacher dark-forest variant + parent HOME_THEME variant).
- New `useEffect` in the Guru page: `document.querySelector('[data-dashboard-header]').offsetHeight` → `setChatHeight('calc(100dvh - Hpx)')`, re-measured on `resize`, `orientationchange`, and a `ResizeObserver` on the header (safe-area insets, 2-row teacher header, orientation all captured because we measure `offsetHeight`, not a hardcoded constant).
- Applied `chatHeight` to the main chat container + both loading-spinner states.
- `GuruChatThread.tsx` composer padding-bottom → `calc(18px + env(safe-area-inset-bottom))` so the send button clears the iPhone home indicator.
- **Degrades safely:** header not found → falls back to `100dvh` (= prior behavior).

**Rule locked in:** any full-height page under `app/montree/dashboard/layout.tsx` MUST subtract the sticky header — use the `[data-dashboard-header]` measure pattern, never bare `h-dvh`.

---

## 2. Menu order → Guru first, then stripped to 5 (`791474dd` reorder, finalized in `4f467ef4`)

`MINIMAL_DEFAULT_MENU.CORE_VISIBLE` in `lib/montree/menu/config.ts` is the **single seeded default** for all 5 teacher-creation paths (principal setup ×2, admin add-teacher, classroom add-teacher, try/instant — all import `MINIMAL_DEFAULT_MENU`). The More menu renders in saved-config order (`menuConfig.items.filter(visible)` in `DashboardHeader.tsx`), so the fix is the `CORE_VISIBLE` order.

**Final default (and Sarah's live account):**
```
Guru → Student Manager → Parent Manager → Notes → Wrap Up
CORE_VISIBLE = ['guru','manage_students','parent_manager','notes','photo_audit']
```
Everything else hidden.

**🚨 Wrap Up (photo_audit) is kept LAST-but-visible on purpose.** It's the photo review/confirm surface and the More menu is the **ONLY** path to it (verified: the capture page doesn't route to `/photo-audit`, and the dashboard doesn't link it). User initially specified a strict 4 (dropping Wrap Up) but confirmed keeping it as #5 when told it would strand photo tagging — especially since Menu Management (the per-teacher reorder tool) is now hidden too.

`manage_students` menu label renamed → **"Student Manager"** (labelKey nulled in `registry.tsx`) to parallel the already-hardcoded "Parent Manager". The Manage Students PAGE title is unchanged (still `t('students.manageStudents')`).

---

## 3. Curriculum Gaps panel → default OFF (`8058cb2f`)

The dashboard "Curriculum gaps" panel (`components/montree/CurriculumGapCard.tsx`, gated by `isEnabled('curriculum_gap_radar')`) was **default ON** (migration 248) → a brand-new empty classroom got a wall of "N of M works haven't been presented to anyone yet" on first login. Information overload off the bat.

**Fix:** flipped the feature definition `default_enabled` → **FALSE** (`migrations/280_curriculum_gap_radar_default_off.sql` + applied directly to prod via pooler). Card + endpoint UNCHANGED. It stays in the admin feature toggle (`SchoolFeaturesModal`, category `dashboard`) — a principal/super-admin flips it on per-school, writing a `montree_school_features` override that beats the default. No school holds an override, so it is OFF everywhere until turned on.

`app/api/montree/features/route.ts` resolution: `enabled = def.default_enabled` then school/classroom overrides apply → with default false + no override, `isEnabled('curriculum_gap_radar')` returns false → the card doesn't render.

---

## 4. Menu Management + Invite Principal removed (`4f467ef4`)

- **Menu Management** MenuRow hidden. The `/menu-setup` page renders a broken washed-out light theme ("albino face"), and the menu is now a fixed curated set, so per-teacher reordering isn't needed. Route stays on disk (hide-don't-delete). NOT retheme'd — deliberately parked.
- **Invite your principal** MenuRow removed (advise principals verbally). `InvitePrincipalModal` + `showInvitePrincipal` state + import all stay wired — one uncomment away. Dropped the now-unused `UserPlus` lucide import (a note in the import block says to re-add it if the row is restored).
- Collapsed the leftover double-`<Divider />` above Logout to one.

---

## Prod DB ops (pooler `aws-1-ap-southeast-1.pooler.supabase.com:5432`, user `postgres.dmfncjjtsoxrnvcdnvjq`, pw from `.env.local` DATABASE_URL)

1. **Sarah's Bright Stars teacher row** (`montree_teachers` id `2d77545a-48bc-4a57-92db-6697505b2815`): `settings.menu.items` reordered to the final 5-item visible order; all 21 items preserved, 16 hidden. Changing the default only affects NEW signups — existing configs are authoritative, so her live row was updated directly (read-merge-write, guru→front then final order).
2. **`montree_feature_definitions.default_enabled = false`** for `curriculum_gap_radar` (= migration 280).

---

## Verification

- ✅ 3 commits on `origin/main`; local == remote == `4f467ef4`.
- ✅ Full lint of all 5 touched files: **0 errors**. 1 warning: `react-hooks/exhaustive-deps` (missing `t`) on the Guru page's **pre-existing** data-loading effect — confirmed NOT introduced this session by linting the stashed HEAD copy; adding `t` would make it re-fetch children on locale change, so left alone. Build fails on ESLint errors only, not warnings.
- ✅ Prod DB verified live: Sarah visible = `["guru","manage_students","parent_manager","notes","photo_audit"]`; `curriculum_gap_radar default_enabled = false`.
- ✅ All 5 teacher-creation seed paths reference `MINIMAL_DEFAULT_MENU` (single source of truth) → new teachers get the 5-item menu.
- ⏳ Guru viewport is a device-layout fix — final confirmation is on Tredoux's iPhone after Railway deploy + **PWA reopen** (menu config + features are client-cached from load).

---

## Open / next

- **On-device:** reopen the PWA to pick up the 5-item menu (Guru first, no Menu Management, no Invite Principal, gap panel gone) and confirm the Guru composer sits flush at the bottom on iPhone.
- The `/menu-setup` page still has the broken light theme — hidden, not fixed. If ever un-hidden it needs a dark-forest retheme.
- Deferred (user "maybe, later"): a three-dot per-teacher toggle for Curriculum Gaps.
- `activePage === 'menu-setup'` in `DashboardHeader.tsx` is now dead (only the commented row used it) — harmless, left in place.

---

## Architectural rules locked in

1. **Full-height pages under the dashboard layout subtract the sticky header.** Measure `[data-dashboard-header]` (present on both DashboardHeader variants) and use `calc(100dvh - Hpx)`; never bare `h-dvh`. `app/montree/dashboard/guru/page.tsx` is the reference.
2. **`CORE_VISIBLE` in `lib/montree/menu/config.ts` is the sole seeded default** (all 5 teacher-creation paths use `MINIMAL_DEFAULT_MENU`). Editing it only affects NEW teachers — an existing teacher's `settings.menu` is authoritative and must be updated directly (pooler) if a live account needs the new shape.
3. **Wrap Up (photo_audit) must stay reachable from the More menu** — it's the only path to the photo review/confirm loop. Don't drop it while Menu Management is hidden.
4. **Menu Management is hidden; the menu is a fixed curated set.** Per-teacher reordering is off. `/menu-setup` route stays on disk.
5. **New-user-noisy dashboard intelligence panels default OFF at the definition level** (`default_enabled=false`), toggled on per-school in `SchoolFeaturesModal`. The card/endpoint stay intact; only the flag changes.
