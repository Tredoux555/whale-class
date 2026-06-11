# Montree — Architecture Overview & Improvement Plan

*A top-to-bottom orientation to the codebase, plus a prioritized list of where it could be improved. Written June 2026 after a full read-through. Treat specific file/line references as starting points — verify against current code before acting, since the repo moves fast.*

---

## 1. What Montree is, and the stack

Montree is a multi-tenant SaaS for Montessori / preschool schools: principals, teachers, parents, and referral "agents" each get their own surface. The headline feature is **Astra**, an AI "chief-of-staff," alongside a set of AI tools (per-child guru, curriculum planning, photo insight, parent-meeting prep) and a separate parent-facing **Story** system.

The whole thing is one Next.js app (App Router, React 19, TypeScript) living in the `whale` git repo. It ships three ways from the same codebase: as a web app (`output: 'standalone'`, deployed on Railway behind Cloudflare), as a PWA (`next-pwa`), and as native iOS/Android via Capacitor (`output: 'export'`, a thin webview pointed at `https://montree.xyz`). Supabase is the database, auth store, and file storage. Stripe handles billing.

Where things live:

- `app/` — ~937 files, ~507 API route handlers under `app/api/`. The two big API trees are `app/api/montree/*` (the product) and `app/api/story/*` (the parent Story system).
- `lib/` — ~453 files of shared logic: auth helpers, Supabase clients, the AI/guru/voice code, billing, i18n.
- `components/` — ~281 UI components, including the super-admin dashboard tabs.
- `migrations/` — ~284 loose SQL files (plus `supabase/migrations/`).
- `middleware.ts` — CSRF, domain isolation, role-based redirects, admin gating.
- Infra: `Dockerfile` (Node 20 + ffmpeg + yt-dlp), `railway.json`, `start.sh`.

---

## 2. How the subsystems fit together

**Frontend & native.** Nested layouts split the app by role (`/montree/admin`, `/montree/dashboard`, `/montree/parent`, `/story/...`). Server Components by default; client components for camera, offline sync, and PWA prompts. The native apps are deliberately thin — they load the production URL — which keeps one codebase but means a production outage hits web *and* native users identically.

**Data model.** Core entities: `montree_schools` (the tenant, with Stripe fields) → `montree_classrooms` → `montree_children`; plus `montree_teachers`, `montree_parents`, and admin/member tables. Around that sit a parent-engagement lifecycle (`montree_parent_profiles`, `montree_parent_meetings` + encrypted transcripts with an `audio_destroyed_at` marker, meeting analyses, 24h dossier caches), AI memory tables (`montree_principal_memory`, `montree_tracy_corpus` using pgvector), a unified finance ledger (`montree_finance_transactions`), curriculum/progress tables, and the Story tables (`secret_stories`, `story_message_history`, `story_users`). Soft deletes use an `is_active` flag.

**Auth.** There are five distinct auth systems, each with its own secret and token: super-admin (password → short-lived JWT, `x-super-admin-token` header), teacher/principal (`MONTREE_JWT_SECRET`, httpOnly `montree-auth` cookie, canonical re-check at `/api/montree/auth/me`), Story user/admin (`STORY_JWT_SECRET`, httpOnly `story-auth` cookie), parent (invite-scoped or full-account, re-validated against the DB on every request via `resolveAuthorizedParent()`), and cron (`x-cron-secret`). The parent path's per-request DB re-check is a genuinely good pattern.

**AI / Astra.** Astra is a text chat in the principal cockpit (`/api/montree/admin/astra-thread`, server-persisted per principal). A voice layer exists but is flag-gated off (`SHOW_VOICE_ASTRA`) after a pivot away from Agora toward browser-native speech + OpenAI TTS. The guru tools (`app/api/montree/guru/*` — photo-insight, snap-identify, photo-enrich) are multimodal. Tool execution lives in `lib/montree/guru/tool-executor.ts`. Both OpenAI and Anthropic are used. There is, as yet, no per-request telemetry, model tiering, or prompt caching.

**Media.** Uploads go to Supabase buckets (`montree-media`, `story-uploads`, `photo-bank`) and are served through a Cloudflare-cached proxy (`app/api/montree/media/proxy/[...path]`) that supports HTTP Range for video. `lib/montree/media/proxy-url.ts` builds the URLs. (This is what the new social video library uses.)

**Billing & agents.** `montree_finance_transactions` is an idempotent ledger keyed on `(source, source_ref)`, fed by Stripe webhooks, API-usage aggregation, manual entries, and cron. A referral/agent program scopes agents by `founding_teacher_id`.

**Jobs & crons.** Cron-style routes (trial drip, dunning, finance recurring, and now Story media expiry) are plain POST endpoints guarded by `x-cron-secret`, triggered by an external scheduler (Railway). There's no in-repo cron config — scheduling lives in the Railway dashboard.

---

## 3. State of the codebase (health)

The product surface is impressively complete and the domain modeling is thoughtful. The main drag is engineering hygiene:

- **TypeScript isn't enforced.** `next.config.ts` sets `typescript.ignoreBuildErrors: true`, and `tsc --noEmit` currently reports **~5,233 errors**. The build ships regardless. ESLint *is* still enforced at build (good), which is why the lint-clean discipline matters.
- **No automated tests.** No test script, no test framework in `package.json`, no `*.test.*` files. Every change is validated by hand.
- **Migration sprawl.** ~284 loose SQL files with inconsistent naming (`001_...` through ad-hoc `ULTIMATE_TRACY_ALL_SQL.sql`), applied manually in the Supabase SQL editor with no runner or ordering guarantee.
- **A few very large files.** Translations aside (12 i18n files ~5,200 lines each, which is normal), there are genuine giants worth splitting: `app/montree/dashboard/photo-audit/page.tsx` (3,669), `lib/montree/skill-graph.ts` (2,931), `app/montree/dashboard/classroom-overview/page.tsx` (2,863), `app/api/montree/guru/photo-insight/route.ts` (2,459).
- **Auth is mostly centralized** (JWT verify is inline in only ~2 routes), but **~20 API routes use the service-role key**, which bypasses row-level security — so correctness depends entirely on each route filtering by tenant.

---

## 4. Improvement recommendations (prioritized)

### P0 — Security, do these first

These come from the read-through and should be **verified, then fixed**, because the app holds children's data.

1. **Get secrets out of the repo and rotate them.** `.env.local` appears to contain live secrets (service-role key, AI keys, DB password, admin password). Confirm `.env.local` is git-ignored and was never committed (`git log --all -- .env.local`); if it ever was, scrub history and **rotate every exposed credential** (Supabase service-role key, Stripe, AI keys, DB password). Keep production secrets only in Railway env vars.
2. **Remove the `NEXT_PUBLIC_ADMIN_PASSWORD`.** Anything `NEXT_PUBLIC_*` is baked into the browser bundle. A password there is effectively public. Super-admin should authenticate only through the server route, and the password should be long and random — not a 6-digit PIN.
3. **Make RLS a real backstop.** Several policies are `USING (true)`, so any authenticated user could read across tenants if the app-layer filter is ever missed. Tighten policies to filter by `school_id`, especially on `montree_children`, `montree_parents`, and `montree_media`. Until then, audit the ~20 service-role routes to be certain each filters by tenant.
4. **Shorten the teacher/principal JWT TTL.** A reported 365-day token means a leaked token grants a year of access. Drop to days/weeks and add refresh + rotation.
5. **Harden cron auth.** Ensure `CRON_SECRET` is required and non-empty so an empty header can never match an unset secret.

### P1 — Reliability

6. **Stabilize the Railway/Cloudflare origin.** The known ~20% request-drop at the origin boundary is the biggest threat to trust in every feature (Astra included). Add a second replica, check for OOM/restarts, tune the healthcheck, and confirm no server code self-fetches the public origin (use `127.0.0.1:$PORT`).
7. **Cache middleware role lookups.** Every `/admin/*` and `/parent/*` request hits the DB for roles. A short in-memory TTL cache (5–10 min, invalidated on role change) removes that per-request query.

### P2 — Maintainability

8. **Adopt a migration tool.** Move to timestamped Supabase CLI migrations with `db push`; archive the loose files. This gives ordering, rollback, and a single source of truth.
9. **Turn TypeScript back on, incrementally.** Keep `ignoreBuildErrors` for now but add a CI check that the error count only ever goes *down*, and chip away at the 5,233. Start with `lib/` (shared, highest leverage).
10. **Introduce a thin test layer.** Even a handful of integration tests around auth verification, billing idempotency, and the media-retention/expiry logic would catch the scariest regressions. Vitest + a few route tests is a cheap start.
11. **Extract a `withAuth()` route wrapper.** A single, documented helper per auth type (super-admin / montree / story / parent / cron) prevents the "this route was secretly public" class of bug and makes the 507-route surface auditable.
12. **Split the giant pages/files** listed in §3 into composable pieces — they're the hardest to change safely.

### P3 — Product & AI

13. **Instrument Astra before optimizing it.** Log latency (time-to-first-token, retrieval, tool calls), tokens, cost, and outcome per request, against a golden set of ~50–150 real questions. Everything else depends on this.
14. **Tier the models.** Route simple lookups to a cheap model (Haiku) and reserve frontier models for hard reasoning. Most education traffic is lookups; this is a large cost cut at no quality loss.
15. **Add prompt caching / context truncation** for the repeated system-prompt + tool-def + curriculum prefix — a 30–50% cost reduction on retrieval-heavy calls.
16. **Add confirm-before-act guardrails** to any Astra/voice action that writes (messages, appointments), and validate the children's reading-ASR accuracy on a small real cohort before building out the planned "Mira" tutor.

---

## 5. Suggested first move

If I were picking one week of work: **P0 security (items 1–5) plus the origin stabilization (6)**. They're the highest-risk, lowest-glory items, and everything else — including how much the AI features can be trusted — sits on top of them. I can take any of these and turn it into a concrete change set on request.
