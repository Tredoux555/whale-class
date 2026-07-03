# SESSION — Jul 3, 2026 (Cowork, pt 3) — Cross-tenant security fix + photo-queue death-spiral + menu cleanup + PWA app-mode launch

**4 commits on main, all pushed + Railway auto-deployed:**

```
311d3ee5  SECURITY: block cross-school child inserts + diagnosable capture errors
1dd30e7d  Photo queue: cross-account isolation — purge foreign-school entries + never halt sync on school-mismatch 403
da770a21  Menu cleanup for new users: Wrap Up-first minimal default + Games retired
0581ee14  PWA app-mode launch: signed-in users skip the splash
```

**Plus 2 production DB operations run by Claude via the Supabase pooler**
(`aws-1-ap-southeast-1.pooler.supabase.com:5432`, user `postgres.dmfncjjtsoxrnvcdnvjq`,
password from `.env.local` DATABASE_URL — the direct db host is still dead):

1. **DELETED the stray "Marina" from Whale Class** (`montree_children` id
   `f5d06fa0-a1b9-4cfd-81e3-bf4a4110e1ca`) after verifying ZERO dependent rows
   across media / progress / focus_works / mental_profiles / media_children /
   parent_children / parent_invites.
2. **Seeded Sarah's menu config** (Bright Stars teacher id
   `2d77545a-48bc-4a57-92db-6697505b2815`) — `settings.menu` set to the new
   minimal default so Tredoux could see the clean menu immediately.

**No migrations.** Everything was code + data.

---

## 1. 🚨 CRITICAL — Cross-tenant child creation (the "Marina in Whale Class" incident)

**Symptom:** Tredoux created a test account, and the student "Marina" (added on
the new account) appeared in his real Whale Class roster. Caught while shooting
promo material.

**Timeline from production data (all UTC):**

| When | What | Where it landed |
|---|---|---|
| Jul 1, 23:49 | Marina created | ⚠️ Whale Class / Tredoux House |
| Jul 1, 23:56 | Marina created again | Bayan's Home / My Home (new account, correct) |
| Jul 3, 08:19 | Marina created | Bright Stars Academy / Homeroom (today's account, correct) |

So the pollution happened during the **Jul 1 "Bayan's Home" signup**, not
today. Mechanism: the browser still held the OLD Whale Class session in
localStorage (`montree_session`) when the add-student call fired. The client
sent Whale Class's `classroomId` in the request body, and the server accepted
it without checking ownership.

**Root cause — TWO routes with the same hole:**

- `POST /api/montree/children` — authenticated via `verifySchoolRequest`, then
  took `classroomId` from the body and only checked the classroom EXISTS.
  Never compared `classroom.school_id` to `auth.schoolId`.
- `POST /api/montree/children/bulk` — worse: it DERIVED `schoolId` from the
  client-supplied classroom and used that for inserts, again without comparing
  to the authenticated school.

**Fix (`311d3ee5`):** both routes now 403 with a loud
`[SECURITY] Cross-school ... blocked` console log when
`classroom.school_id !== auth.schoolId`. Pattern mirrors the existing check in
`app/api/montree/admin/import/route.ts` (which was already correct).

**🚨 ARCHITECTURAL RULE (extends the verifyChildBelongsToSchool contract):**
every route that accepts a `classroomId` from the client AND WRITES anything
under it MUST verify `classroom.school_id === auth.schoolId` before the write.
Existence checks are NOT ownership checks.

**⚠️ OPEN AUDIT:** a grep sweep found ~40 route files that reference
classroomId/classroom_id without an obvious school check. Most scope via the
JWT's own classroomId (fine), but nobody has walked the WRITE paths
one-by-one. Worth a focused audit session. The two child-creation routes were
the ones with a confirmed real-world incident.

---

## 2. Photo capture "Photo queue full" on a brand-new account — full death spiral diagnosed + fixed

**Symptom:** first photo capture on the new account (Safari tab) failed with
"Photo queue full — please wait for uploads to complete". Whale Class capture
on the same device worked fine (in the installed PWA).

**Three stacked causes:**

1. **Mislabeled toast.** `capture/page.tsx` caught EVERY `enqueuePhoto` error
   and showed the queue-full string. IndexedDB failures, quota, anything —
   all labeled "queue full". Debugging went the wrong way for an hour
   because of this.
2. **The queue is per-BROWSER, not per-account.** The offline photo queue
   (IndexedDB `montree-photo-queue`) is shared by every account ever logged
   into that browser tab. Months of Tredoux's test photos from old accounts
   sat in the Safari tab's queue. The installed PWA has a SEPARATE storage
   silo (only Whale Class photos) — which is why one worked and one didn't.
3. **The actual death spiral.** The upload API correctly 403s foreign-school
   photos (`school_id mismatch`, media/upload route line ~65). But
   `uploadEntry` treated EVERY 401/403 as `AUTH_EXPIRED` and **halted the
   entire sync loop** (HIGH-001 behaviour). So the first foreign entry
   stopped sync every run → nothing ever drained → queue grew to the 200 cap
   → `enqueuePhoto` threw "queue full" forever. Capture permanently bricked
   for ANY account in that browser.

**Fixes (`311d3ee5` + `1dd30e7d`, all in `lib/montree/offline/sync-manager.ts`
unless noted):**

- `capture/page.tsx`: toast now shows the REAL error message; "queue full"
  only when the message actually matches. (Jun 14 diagnosability rule.)
- NEW `purgeForeignEntries(schoolId)` — deletes queue entries whose
  `school_id` differs from the active session. Called in `enqueuePhoto`'s
  queue-full path, so a jammed queue self-heals on the next capture attempt.
- `syncQueue` now filters pending entries to the ACTIVE school (read from
  localStorage `montree_session` via `getCurrentSchoolId()`), so foreign
  entries can't stall the loop.
- `uploadEntry`: a 403 whose body says `school_id mismatch` marks the entry
  `permanent_failure` and throws `SCHOOL_MISMATCH` (counted as a failure,
  does NOT halt sync). Real auth failures still halt via `AUTH_EXPIRED`.
- `aggressiveCleanup` gained a true last-resort tier: stale (>7 days old)
  `failed`/`pending` entries, oldest first, capped 50 per pass. Previously it
  only deleted `uploaded` + `permanent_failure` — despite its own comment —
  so a stuck queue could NEVER recover.
- Incidental lint fix: unused `res` binding in `checkNetworkReachable`.

**🚨 ARCHITECTURAL RULES:**
- The offline photo queue is per-browser. Foreign-school entries are purged,
  never uploaded. `getCurrentSchoolId()` in sync-manager is the canonical
  active-school read for the queue.
- A `school_id mismatch` 403 is NOT an auth failure. Never let a per-entry
  ownership rejection halt the whole sync loop.
- Catch-all error toasts are banned on the capture path — surface
  `err.message` (Jun 14 runtime-audit rule applied to client UX).

**⏳ VERIFICATION PENDING:** Tredoux to retake a photo on the new account in
the same Safari tab post-deploy. Expected: self-heal → "Photo saved!". If any
toast appears it now names the real failure.

---

## 3. Teacher menu cleanup for new users (`da770a21`)

Tredoux (verbatim intent): new-user menu should be **Wrap Up → Parent Manager
→ Notes → Guru → Manage Students — that's it**. Games "off the table
completely — makes the app look amateur". Meeting Notes hidden. Everything
hidden must be switchable on/off.

**Why his new account showed the cluttered legacy menu:** the minimal-menu
seed (`MINIMAL_DEFAULT_MENU` → `montree_teachers.settings.menu`) only existed
in `try/instant`'s TEACHER branch. Bright Stars was a **principal signup** —
the principal-setup flow created teacher "Sarah" with NO seed → DashboardHeader
fell back to the legacy flag-gated menu.

**Changes:**

- `lib/montree/menu/config.ts` — `CORE_VISIBLE` is now
  `['photo_audit','parent_manager','notes','guru','manage_students']` in that
  order (photo_audit renders as "Wrap Up" via `audit.title`). `'games'`
  removed from `MENU_ITEM_IDS` entirely — `sanitizeMenuConfig` silently drops
  the id from previously-saved configs.
- `lib/montree/menu/registry.tsx` — games entry + Gamepad2 import removed.
- `components/montree/DashboardHeader.tsx` — legacy branch: Games row DELETED,
  Meeting Notes row commented out (hide-don't-delete; still in registry so
  teachers can re-enable via Menu Management).
- Games also removed from `app/montree/dashboard/settings/page.tsx`
  (quick-access tile) and `app/montree/dashboard/tools/page.tsx` (card).
  Routes stay on disk.
- **Menu seed added to EVERY teacher-creation path:**
  `principal/setup/route.ts`, `principal/setup-stream/route.ts`,
  `admin/teachers/route.ts`, `classroom/teachers/route.ts` (both insert +
  collision-retry), and `try/instant`'s homeschool + teacher INSERT payloads
  (the teacher branch's fire-and-forget update stays as a safety net).

**The on/off switch UI already exists:** "Menu Management"
(`/montree/dashboard/menu-setup`) — always visible at the bottom of the More
menu, per-teacher show/hide + reorder. It builds from `MENU_REGISTRY` so Games
vanished from it automatically.

**🚨 ARCHITECTURAL RULES:**
- `MINIMAL_DEFAULT_MENU` MUST be seeded on every path that inserts a
  `montree_teachers` row. If you add a new teacher-creation route, seed it.
- Games is RETIRED from teacher-facing nav. Do not resurface without explicit
  ask. Routes remain on disk under `/montree/dashboard/games/`.

**❓ OPEN QUESTION for Tredoux:** the parent dashboard API
(`app/api/montree/parent/dashboard/route.ts`) still returns `game_url`
suggestions to parents. Strip those too, or is parent-facing games acceptable?

---

## 4. PWA app-mode launch (`0581ee14`)

**Symptom:** swipe-closing the home-screen app and reopening landed on the
marketing splash instead of the school.

**Fix:** `app/montree/page.tsx` gained a standalone-mode redirect effect. When
`display-mode: standalone` (or `navigator.standalone`) AND a session exists:
teacher/homeschool → `/montree/dashboard`, principal → `/montree/admin`,
parent → `/montree/parent/dashboard`. Check order: localStorage
`montree_session` (instant) → `montree_principal` → cookie fallback via
`/api/montree/auth/me` → parent cookie via
`/api/montree/parent/auth/access-code` GET. No session → splash stays (correct
for logged-out launches).

**🚨 Why in-page and not the manifest:** iOS bakes `start_url` at INSTALL
time — a manifest change would only help future installs. The in-page redirect
fixes already-installed icons too. Regular browser visits are untouched (the
redirect is standalone-gated by design — the splash still works as a website).

---

## Operational notes

- **Sandbox git can commit but hits `Operation not permitted` unlink warnings
  and stale `.git/*.lock` files on the mount.** When that happens: commit +
  push from the Mac via Desktop Commander
  (`cd ~/Desktop/Master\ Brain/ACTIVE/montree && rm -f .git/index.lock
  .git/HEAD.lock && git ...`). Two commits this session needed that.
- **Supabase pooler access from the Cowork sandbox works** via the repo's
  `node_modules/pg`: host `aws-1-ap-southeast-1.pooler.supabase.com:5432`,
  user `postgres.dmfncjjtsoxrnvcdnvjq`, password from `.env.local`
  DATABASE_URL, `ssl: { rejectUnauthorized: false }`. Used for the Marina
  delete + Sarah menu seed + all diagnosis queries.
- Working tree still carries UNRELATED uncommitted files (social playbook doc,
  migration 269 edit, coach_uploads.patch, lyf-coach docs, social/). Left
  untouched — do not sweep them into future commits.

## Verification checklist (Tredoux, on device)

1. **Photo capture on the new account** — same Safari tab, retake a photo.
   Expect "Photo saved!" (queue self-heals). Any error toast now names the
   real cause — screenshot it if one appears.
2. **Whale Class roster** — confirm Marina is gone (was 23 tiles, now 22).
3. **New-account menu** — ⋯ menu shows exactly Wrap Up / Parent Manager /
   Notes / Guru / Manage Students + utility rows. Menu Management can
   re-enable hidden items.
4. **PWA launch** — swipe-close the home-screen app, reopen → lands in the
   school, not the splash. (First reopen after deploy may show the old cached
   page once.)
5. **Cross-tenant regression** — from the new account, add a student → it must
   land ONLY in the new school. Whale Class must stay at 22.

## Next-session priorities

1. Confirm the 5-step verification above; fix anything that surfaces.
2. **Signup client-state hard reset** — account signup should wipe stale
   localStorage (`montree_session`, `montree_principal`, `montree_school`) so
   cross-account confusion can't happen client-side either. Server checks make
   it harmless now, but the UX still confuses ("failed visibly" beats
   "silently wrong", "just works" beats both).
3. **classroomId write-path audit** — walk the ~40 grep hits for other
   unverified classroom writes.
4. Parent-dashboard games decision (open question above).
5. Standing carry-overs from pt 2 (Douyin avatar upload, optional wordmark).
