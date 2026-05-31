# Session 140 — Principal session lifecycle (May 31, 2026)

Commits on `main`: `cd55e448` (dashboard dead-end redirect), `d2b23e4e` (cookie
validation + clean logout).

## 🚨 THE ROOT CAUSE — blanket 401s on a logged-in principal

**Symptom:** `/montree/admin` renders the cockpit with a generic "School"
sidebar, but every token-gated API 401s in the console:
`/api/montree/admin/snapshot`, `/api/montree/billing/status`,
`/api/montree/admin/voice/token`, `/api/montree/admin/today`.

**Decisive diagnosis:** those routes gate via `verifySchoolRequest` FIRST (401
on bad/missing token) and only THEN check role (which returns **403**, not 401).
So a 401 wall means **the montree-auth JWT failed verification uniformly** — NOT
an endpoint bug, NOT the principal role being rejected. The JWT is a **365-day**
token (`createMontreeToken` ttl `'365d'`, cookie maxAge 365d) so it didn't
expire. It failed because **the signing secret changed under it.**

**The coupling (`lib/montree/server-auth.ts` → `getSecretKey()`):**
```ts
const secret = process.env.MONTREE_JWT_SECRET || process.env.ADMIN_SECRET;
```
If `MONTREE_JWT_SECRET` isn't pinned in Railway, Montree auth silently falls back
to `ADMIN_SECRET` (the Whale-Class admin tool's secret). Any change to
`ADMIN_SECRET` — or env drift between deploys/replicas — invalidates **every live
Montree session at once**. The cockpit kept rendering because the admin layout
trusted `localStorage`, not the cookie.

## 🚨 OPS ACTION REQUIRED (permanent fix, ~1 min — NOT yet done)

In Railway, set a dedicated **`MONTREE_JWT_SECRET`** to the **exact current value
of `ADMIN_SECRET`** (copy it across). This decouples Montree auth from
`ADMIN_SECRET` with **zero forced logouts** (same value → existing tokens still
verify). A future `ADMIN_SECRET` rotation then can never nuke every Montree
session again. After pinning, **never rotate `MONTREE_JWT_SECRET`.**

(Setting it to a NEW random value also works but logs everyone out once.)

## Code fixes shipped (make it self-healing, not stuck)

- **`cd55e448`** — a pure principal's JWT has no `classroomId`. On
  `/montree/dashboard` (teacher child-picker), `childrenUrl` was `null` and the
  skeleton guard had no give-up path → principals who landed there (PWA
  `start_url`, bookmark) were trapped forever. Fix: redirect a classroom-less
  `role==='principal'` session to `/montree/admin`.
- **`d2b23e4e`** — `app/montree/admin/layout.tsx`:
  - Cockpit now validates the cookie via `GET /api/montree/auth/me` on mount.
    **401 → clear `montree_school/principal/session` + bounce to
    `/montree/login-select`** (clean re-login, not frozen skeletons). **200 →
    self-heal** schoolName + principalId + localStorage from the live session.
    Transient errors (non-401: network blip / cold-start 503) do **NOT** log out.
  - `handleLogout` now **awaits** the logout API (was fire-and-forget → raced the
    cookie clear), clears all 3 keys, `window.location.href = '/montree'` (hard
    nav), guarded against double-click.

`auth/me` response: `{ authenticated, role, teacher:{id,name,role,email},
school:{id,name,slug}, classroom }` — for a pure principal `teacher` carries the
`montree_school_admins` identity.

## Verify on production (after deploy + the MONTREE_JWT_SECRET pin)

1. Log in `T`/`redoux` → real school name in sidebar; `/auth/me`,
   `/admin/today`, `/admin/snapshot`, `/billing/status` all **200**, no 401 wall.
2. DevTools → delete `montree-auth` cookie → reload → clean bounce to login.
3. Sign out → lands `/montree`, cookie gone; re-nav to `/admin` → login.
4. A fresh login should STAY valid (365d). If it 401s again within hours, the
   secret is still unstable → confirm the env pin actually took.

## Carry-overs (ops)

- Astra voice agent needs `AGORA_CUSTOMER_KEY`/`SECRET` + `OPENAI_API_KEY` in
  Railway (agent route 503s "Voice provider keys are not configured" without them).
- Origin instability ~20% `000` drops (Cloudflare↔Railway) — see brain +
  `montree_origin_instability_and_sw_cache` memory.
- Story page: "N moments to see — tap to view" prompt being removed (media reveal
  should be covert / path-gated, not an open invitation) — separate commit.
