# Marketing Hub — Execution Plan v1

## Prerequisites

- All 13 source files confirmed in project root
- No middleware changes needed
- No new API routes needed (reuses existing `/api/montree/super-admin/auth`)

---

## Task 1: Auth Layout

**Create** `app/montree/super-admin/marketing/layout.tsx`

```
'use client'
- useState for authenticated, password, lastActivity, sessionWarning
- handleLogin() → POST to /api/montree/super-admin/auth
- 15-min session timeout with activity tracking (mousemove, keydown)
- Session warning at 14 minutes
- Login UI: same dark theme as super-admin (bg-slate-900, bg-slate-800 card, emerald-500 button)
- When authenticated: render {children}
```

**Audit:** File exists, has 'use client', calls correct auth endpoint, has timeout logic.

---

## Task 2: Marketing Card on Super-Admin Dashboard

**Edit** `app/montree/super-admin/page.tsx`

Add a Link card in the header `flex gap-2` div (after the existing "Register School" button):

```tsx
<Link
  href="/montree/super-admin/marketing"
  className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 text-sm"
>
  🚀 Marketing Hub
</Link>
```

**Audit:** Link renders, href is `/montree/super-admin/marketing`, matches button style.

---

## Task 3: Marketing Hub Page

**Create** `app/montree/super-admin/marketing/page.tsx`

```
'use client'
- Back button → /montree/super-admin
- Title: "🚀 Marketing Hub"
- 5 sections with cards:

🎯 LAUNCH TOOLS
  - Launch HQ → /montree/super-admin/marketing/launch-hq
  - Objection Handler → /montree/super-admin/marketing/objections

📝 CONTENT TOOLS
  - Platform Warroom → /montree/super-admin/marketing/warroom
  - Content Factory → /montree/super-admin/marketing/content
  - Creative Studio → /montree/super-admin/marketing/studio

📨 OUTREACH TOOLS
  - Prospect HQ → /montree/super-admin/marketing/prospects
  - Outreach → /montree/super-admin/marketing/outreach
  - Growth Engine → /montree/super-admin/marketing/growth

🌐 WEB PAGES
  - Landing Page → /montree/super-admin/marketing/landing
  - Links Page → /montree/super-admin/marketing/links
  - Pitch Deck → /montree/super-admin/marketing/pitch

📖 REFERENCE
  - Playbook → /montree/super-admin/marketing/playbook

- Card style: bg-slate-800 rounded-xl p-6 hover:bg-slate-700 border border-slate-700
- Section headers: text-slate-400 uppercase tracking-wide text-xs font-semibold
- Card titles: text-white font-semibold
- Card descriptions: text-slate-400 text-sm
```

**Audit:** All 13 cards present. All routes correct. Sections match spec.

---

## Task 4: JSX Sub-Pages (8 files)

**First:** Read `montree-launch-hq.jsx` (lines 1-30) to confirm export pattern.

**For each of the 8 JSX files:**

1. Read the source file from project root
2. Create `app/montree/super-admin/marketing/[slug]/page.tsx`
3. Content:
   - `'use client';` at top
   - Add `import Link from 'next/link';`
   - Add back button at top of component: `<Link href="/montree/super-admin/marketing">← Back to Marketing Hub</Link>`
   - Keep the ENTIRE component body exactly as-is
   - Export as default (Next.js page requirement)
4. DO NOT modify any marketing copy, data arrays, Tailwind classes, or functionality

**File → Route mapping:**

| Source | Directory | Slug |
|--------|-----------|------|
| `montree-launch-hq.jsx` | `marketing/launch-hq/page.tsx` | launch-hq |
| `montree-objection-handler.jsx` | `marketing/objections/page.tsx` | objections |
| `montree-platform-warroom.jsx` | `marketing/warroom/page.tsx` | warroom |
| `montree-content-factory.jsx` | `marketing/content/page.tsx` | content |
| `montree-creative-studio.jsx` | `marketing/studio/page.tsx` | studio |
| `montree-prospect-hq.jsx` | `marketing/prospects/page.tsx` | prospects |
| `montree-outreach.jsx` | `marketing/outreach/page.tsx` | outreach |
| `montree-growth-engine.jsx` | `marketing/growth/page.tsx` | growth |

**Audit per file:** File exists, has 'use client', has back button, default export, content unchanged.

---

## Task 5: HTML Files (4 files)

### 5a. Copy to public/

```bash
cp montree-landing.html public/montree-landing.html
cp montree-links.html public/montree-links.html
cp montree-pitch-v2.html public/montree-pitch-v2.html
cp montree-playbook.html public/montree-playbook.html
```

### 5b. Create 4 iframe sub-pages

Each is a simple `'use client'` page with a back button and a full-screen iframe.

| Route | iframe src |
|-------|-----------|
| `marketing/landing/page.tsx` | `/montree-landing.html` |
| `marketing/links/page.tsx` | `/montree-links.html` |
| `marketing/pitch/page.tsx` | `/montree-pitch-v2.html` |
| `marketing/playbook/page.tsx` | `/montree-playbook.html` |

Template for each:
```tsx
'use client';
import Link from 'next/link';

export default function [Name]Page() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <div className="p-4">
        <Link href="/montree/super-admin/marketing" className="text-emerald-400 hover:text-emerald-300">
          ← Back to Marketing Hub
        </Link>
      </div>
      <iframe src="/[filename].html" className="flex-1 w-full border-0" />
    </div>
  );
}
```

**Audit:** 4 HTML files in public/, 4 iframe pages created, src paths correct.

---

## Task 6: Build Verification

```bash
npm run build
```

- Fix any TypeScript errors
- Fix any import issues
- Re-run build until clean

**Audit:** Build succeeds with exit code 0.

---

## Task 7: Final File List

Print every new file created. Expected ~17 files:

```
app/montree/super-admin/marketing/layout.tsx          (auth wrapper)
app/montree/super-admin/marketing/page.tsx             (hub)
app/montree/super-admin/marketing/launch-hq/page.tsx
app/montree/super-admin/marketing/objections/page.tsx
app/montree/super-admin/marketing/warroom/page.tsx
app/montree/super-admin/marketing/content/page.tsx
app/montree/super-admin/marketing/studio/page.tsx
app/montree/super-admin/marketing/prospects/page.tsx
app/montree/super-admin/marketing/outreach/page.tsx
app/montree/super-admin/marketing/growth/page.tsx
app/montree/super-admin/marketing/landing/page.tsx     (iframe)
app/montree/super-admin/marketing/links/page.tsx       (iframe)
app/montree/super-admin/marketing/pitch/page.tsx       (iframe)
app/montree/super-admin/marketing/playbook/page.tsx    (iframe)
public/montree-landing.html
public/montree-links.html
public/montree-pitch-v2.html
public/montree-playbook.html
```

Plus 1 edited file: `app/montree/super-admin/page.tsx`

---

## Git

After all tasks pass:
```bash
git add -A
git commit -m "Add Marketing Hub to super-admin (13 tools)"
git push origin main
```
