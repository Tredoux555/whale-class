# SESSION — Jul 16, 2026 pt2 (same Cowork session) — FUNNEL CEREMONY SHIPPED: the first-touch funnel rebuilt to the Lanternlight vision, Astra narrating from screen one

**Contract (law): `docs/handoffs/PLAN_FUNNEL_CEREMONY_JUL16.md`. Visual law: `docs/design/FUNNEL_VISION_JUL16.html` (approved interactive mock — click through it before touching anything). Philosophy: `docs/design/DESIGN_PHILOSOPHY_LANTERNLIGHT_CEREMONY.md`. Follows the morning's Onboarding Copilot ship (`SESSION_ONBOARDING_COPILOT_JUL16.md`).**

## What shipped
The public signup funnel (`/montree/try` → `/montree/principal/setup` → first `/admin` moment) rebuilt from the old flat green-Tailwind generation to **Lanternlight Ceremony**: near-black stage (#030b08), the real gold damascus M artwork, golden-thread 6-node stepper spanning try+setup as ONE wizard, and **Astra as a top-left NARRATOR on every screen** — running second-person narration ("You're adding your teachers now… don't worry, you can always add teachers later") + a working "Ask me anything" from the very first pre-auth screen. `/login-select` reskinned to match. The shipped copilot dock moved bottom-left → **top-left** so the narrator hands over seamlessly inside the app.

## 🚨 THE LOCKED DESIGN RULE (Tredoux)
**Pages speak in HEADINGS ONLY; Astra speaks in sentences.** No helper subtext, note-cards, or explanation copy on funnel pages — all of it lives in the narrator. Do not drift back.

## Architecture
- `components/montree/funnel/funnel-theme.ts` — FT tokens + FUNNEL_CSS (single dangerouslySetInnerHTML injection per page; NEVER `<style jsx>` on these routes — SSR/CLS).
- `GoldenThread.tsx` (step 1–6) · `AstraNarrator.tsx` (screenKey/journey/authed; **authed=false → NEW anonymous `POST /api/montree/onboarding-copilot/ask-public`** — IP rate-limited 6/15min fail-open, honeypot, HAIKU_MODEL max_tokens 300, static funnel grounding, no DB, can never 500; **authed=true → existing `/ask` with additive optional `screen` param**).
- Narration copy = i18n `copilot.funnel.*` ×12 (EN+ZH real 您-register, 10 English-fallback).
- Asset: `public/brand/m-mark-transparent.webp` (640w, 68KB) + png fallback, width/height attrs.

## Preserved byte-identical (audit-verified against HEAD)
try: TrialResponse handling · honeypot (styling+body) · founding/referral banner precedence + referral card-order swap + role→destination map · back-block · handleTakeMeIn localStorage/redirects · error+debug reveal. login-select: QR autosubmit · unified-auth branches · 409/403 server redirects. setup: SSE reader/parser + 2.5s ticker + step overrides + createdTeachers/warnings · copy/share/copyAllCodes · login guard.

## Sanctioned cleanup (setup page only)
The two dead `false &&` blocks (welcome overlay + PrincipalSetupGuide mount), TracyAvatar celebration card, orphaned state + `montree_principal_welcome_done`/`montree_guide_principal_done` writes — DELETED (−189 net lines).

## Build flow
Fable hand-built the approved vision mock (canvas-design skill; 2 iterations with Tredoux: darker + real artwork + narrator top-left + headings-only) → Fable contract → 2 SEQUENTIAL Opus builds (1: framework+try+login-select+ask-public+dock move+i18n; 2: setup on the shared framework) → Sonnet fresh-eyes **SHIP, 0 CRIT, 2 trivial WARNs fixed** (orphaned i18n key removed ×12; comment-placement artifact ×11). Gates: eslint 0 errors all touched files · scoped tsc ×2 = 0 errors · i18n strict 12/12 · webp <120KB.

## Files (commit scope)
Pages: `app/montree/{try,login-select}/page.tsx`, `app/montree/principal/setup/page.tsx`. New: `components/montree/funnel/*` (3), `app/api/montree/onboarding-copilot/ask-public/route.ts`, `public/brand/m-mark-transparent.webp`. Edited: `app/api/montree/onboarding-copilot/ask/route.ts`, `components/montree/onboarding-copilot/CopilotDock.tsx`, 12× `lib/montree/i18n/*.ts`. Docs: this file + contract + philosophy + mock (+ its `docs/design/assets/montree-mark-transparent.png`).

## ⏳ Owed / verify
1. DC-delete gitignored temp tsconfigs (`tsconfig.scope-funnel.tmp.json`, `tsconfig.scope-funnel2.tmp.json`, morning's `tsconfig.scope-copilot.tmp.json`) + the localhost:8123 mock server (kill when done reviewing).
2. **Device walk (the real gate):** fresh signup on the Mac — /try role → details → ceremony → key → setup classrooms/teachers → SSE founding → handoff key-cards → "Walk me in, Astra →" → /admin dock TOP-LEFT ticking the handover; teacher key on a phone at 390px (narrator above stage, thread compact); ask box answers on pre-auth screens (ask-public) and inside setup (authed); founding/referral links still render banners + correct card order.
3. Watch first Railway deploy for the new route + webp 200s.
