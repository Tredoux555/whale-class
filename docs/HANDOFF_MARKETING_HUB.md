# Marketing Hub — Handoff (Feb 11, 2026)

## What This Is

Adding a Marketing Hub to the super-admin panel — 13 internal marketing tools (JSX components + HTML pages) wired into the Next.js app under `/montree/super-admin/marketing/*`.

## Status: PLANNED — NOT STARTED

Plan is audited and ready to execute. Zero files created yet.

---

## Source Files (all in project root)

### 8 JSX files → Next.js pages

| Source File | Route | Size |
|-------------|-------|------|
| `montree-launch-hq.jsx` | `/montree/super-admin/marketing/launch-hq` | 25KB |
| `montree-objection-handler.jsx` | `/montree/super-admin/marketing/objections` | 13KB |
| `montree-platform-warroom.jsx` | `/montree/super-admin/marketing/warroom` | 41KB |
| `montree-content-factory.jsx` | `/montree/super-admin/marketing/content` | 33KB |
| `montree-creative-studio.jsx` | `/montree/super-admin/marketing/studio` | 24KB |
| `montree-prospect-hq.jsx` | `/montree/super-admin/marketing/prospects` | 28KB |
| `montree-outreach.jsx` | `/montree/super-admin/marketing/outreach` | 16KB |
| `montree-growth-engine.jsx` | `/montree/super-admin/marketing/growth` | 29KB |

### 4 HTML files → public/ (3 static + 1 iframe)

| Source File | Destination | Served At |
|-------------|-------------|-----------|
| `montree-landing.html` | `public/montree-landing.html` | `/montree-landing.html` |
| `montree-links.html` | `public/montree-links.html` | `/montree-links.html` |
| `montree-pitch-v2.html` | `public/montree-pitch-v2.html` | `/montree-pitch-v2.html` |
| `montree-playbook.html` | `public/montree-playbook.html` | iframe at `/montree/super-admin/marketing/playbook` |

### Extra files in root (NOT part of this project — ignore)

- `montree-mission-control.jsx`, `montree-demo.jsx`, `onboarding-mockup.jsx`, `montree-pitch.html`

---

## Key Architecture Decisions

### Auth: layout.tsx wrapper (not per-page)

- Create `app/montree/super-admin/marketing/layout.tsx` as a `"use client"` component
- ONE password gate for ALL marketing pages (no duplication)
- Calls `/api/montree/super-admin/auth` (same endpoint as super-admin login)
- 15-min session timeout + activity tracking (same as super-admin page)
- No middleware changes needed — `/montree/*` is already in `publicPaths`
- Sub-pages inherit auth from layout (Next.js layout persistence)

### JSX conversion pattern

Each JSX file has a default export React component. Conversion:
1. Add `'use client';` at top
2. Keep the default export (or rename to a named function — either works in Next.js)
3. Add a back button linking to `/montree/super-admin/marketing`
4. Keep ALL content/data/Tailwind classes exactly as-is — zero modifications to marketing copy

### HTML files: static serving

- 3 HTML files go to `public/` and are served as static assets
- The marketing hub links to them via iframe sub-pages under `/montree/super-admin/marketing/`
- Playbook also gets an iframe page

---

## Execution Plan

See `.claude/plans/marketing-hub-plan-v1.md` for step-by-step instructions.

**TL;DR — 7 tasks, fully automated:**

1. Create auth layout (`layout.tsx`)
2. Add Marketing Hub card to super-admin dashboard (`page.tsx` edit)
3. Create marketing hub page (13 cards in 5 sections)
4. Create 8 JSX sub-pages
5. Copy 4 HTML files to `public/`, create 4 iframe sub-pages
6. Run `npm run build` — fix any errors
7. List all new files

**Permissions needed (ask once, upfront):**
- Edit `app/montree/super-admin/page.tsx`
- Create ~17 new files under `app/montree/super-admin/marketing/`
- Copy 4 files to `public/`
- Run `npm run build`
- Run `git add` / `git commit` / `git push origin main`

---

## Resume Instructions

**To pick up this task, say:**

> Execute the marketing hub plan. You have permission to: edit the super-admin page, create all new files under app/montree/super-admin/marketing/ and public/, run npm run build, and git commit + push when done. Go fully autonomous — audit after each task, fix any build errors, and list all files at the end.
