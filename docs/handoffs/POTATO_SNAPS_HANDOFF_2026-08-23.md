# Potato Snaps — Distribution + Teacher Workflow Hardening (Aug 22-23, 2026)

Owner: Tredoux (Whale Class, 稻香湖幼儿园). Directed by Claude (Fable) with Sonnet workers.

---

## 1. What shipped

### PWA install layer (commit `23d820e85`, pushed, deployed)
Installable-web-app support for both Potato Snaps surfaces, alongside the existing Android APK.

- `public/potato-app-icons/` — 13 PNGs (72–512, maskable 192/512, apple-touch-icon 180), generated from the Electron app's `icon.icns` (honey-gradient potato mascot), flattened opaque.
- `public/potato-teacher/manifest.json` — scope/start_url `/potato/teacher`.
- `public/potato-parents/manifest.json` — scope `/potato/parents`.
- `app/potato/teacher/layout.tsx` + `app/potato/parents/layout.tsx` — new metadata-only nested layouts: manifest link, icons, `appleWebApp` standalone. Render children unchanged.
- Middleware untouched — its matcher already excludes `.png` / `.json` / `.webmanifest`.

**Distribution strategy decided:** iPhone gets the PWA via Safari "Add to Home Screen"; Chinese Android gets a sideloaded APK (thin Capacitor-style wrapper that loads the live site, so content auto-updates and only shell changes need a new APK build). Both channels run in parallel. The `APPS/Potato Snaps/` folder on the Mac desktop holds v1.0.2 APK + Mac dmg/app + a README install guide.

### Migration 321 applied to production Supabase
`migrations/321_potato_snaps_v13_send.sql` — `tp_montage_jobs.sent_at` column + `idx_tp_montage_jobs_published` index now exist in prod. The one pre-existing `done` job was backfilled as sent.

**Effect:** the preview→send gate the code already implemented via `caps.send` feature-detection is now **active**. New films are private to teachers until a teacher explicitly taps Send. Before this migration, the missing column made every rendered film instantly parent-visible — this closes that gap.

Applied via a one-off pg script run from the Mac (pooler connection). Note for future DB work from this Mac: **Astrill VPN black-holes Postgres wire protocol to Supabase's pooler** — it had to be temporarily disabled to run the migration, then re-enabled afterward. Disable the VPN first, or use the Supabase dashboard SQL editor instead.

### Teacher Download button (commit `7966e77a7`, pushed, Railway deploy succeeded)
- `lib/potato/client.ts` — new `filmFilename` + `downloadFilm` (fetch → blob → `a[download]`).
- `components/potato/PotatoBits.tsx` — new `IconDownload`.
- `app/potato/teacher/page.tsx` — Download button in the "watching" modal; `weekStart` threaded to both `setPreviewing` call sites.
- `components/potato/PreviewSendSheet.tsx` — Download button under the "Only you can see this" pill; `PreviewFilm` gains an optional `weekStart`.
- Filenames follow `potato-snaps-<name>-<weekStart>.mp4`.
- Zero new `tsc` errors introduced in touched files (repo baseline carries many pre-existing errors elsewhere).

### Railway env
`POTATO_TEAM_CLASS_ID=b8a3b77c-3dbb-49b6-89e3-508fba25108d` set on project `happy-flow` / service `whale-class` (triggered a redeploy, which succeeded). This guards the 4-name login (`lib/potato/auth.ts` `STAFF_NAMES`: Dana, Jenny, Vanessa, Tredoux) against a 503 if a second active `tp_classes` row ever appears.

---

## 2. Verified working, unchanged this session

- **Offline-first photo queue** (`lib/potato/offline/` — IndexedDB, atomic save-before-upload, infinite retry with backoff, wired via `usePotatoQueue`).
- **10-year httpOnly session cookie** — login once, stays in.
- **Montage pipeline** — potato-worker on Railway, `tp_*` tables, private `potato-snaps` storage bucket.

---

## 3. Known issues / next steps

- **Bare `teacherpotato.xyz` (no www) 404s.** Apex isn't attached in Railway; DNS points at a legacy parking server. Use `www.teacherpotato.xyz` for now. Fix needs a registrar DNS change + Railway domain attach; the middleware's apex→www redirect is already coded and waiting for the domain to be attached.
- **No service worker.** The installed PWA needs one prior online load before it works offline — photo *data* survives offline (IndexedDB queue), but the app shell itself isn't precached. Candidate next task.
- **iOS PWA cookie persistence** (Safari login → installed home-screen icon) needs one real-device test; may require one extra login inside the installed app, once.
- **Roster is manual**, independent of the Montree whale class roster. `tp_children` currently has 22 active: Jonah, Linda, Brilla, Raye, Kayla, Joey, Henry, Segina, Stella, Raya, Lifty, Frank, Winnie, Dylan, Mario, Roman, Kai, Eric, Hayden, Amy, Lucky, Sarah (2 retired). Tredoux to verify against the real class and add anyone missing via the app's "Add a child".
- **`_claude_stage/run_migration_321.mjs`** left untracked on the Mac (no secrets beyond reading `.env.local` at runtime) — can be deleted.
- **Current workflow decision of record:** teacher-only usage for now. Films are downloaded and shared on another platform by teachers directly; the parent-facing send stays unused until Tredoux says otherwise.

---

## 4. File map

| Area | Path |
|---|---|
| PWA icons | `public/potato-app-icons/` |
| PWA manifests | `public/potato-teacher/manifest.json`, `public/potato-parents/manifest.json` |
| PWA layouts | `app/potato/teacher/layout.tsx`, `app/potato/parents/layout.tsx` |
| Send-gate migration | `migrations/321_potato_snaps_v13_send.sql` |
| Download client helper | `lib/potato/client.ts` |
| Download UI | `components/potato/PotatoBits.tsx`, `components/potato/PreviewSendSheet.tsx`, `app/potato/teacher/page.tsx` |
| Auth / staff gate | `lib/potato/auth.ts` |
| Offline queue | `lib/potato/offline/` |
