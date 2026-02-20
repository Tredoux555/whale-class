# PROMPT FOR DESKTOP CLAUDE
# Copy everything below and paste into a new Desktop Claude chat

---

## Task: Add Marketing Hub to Super Admin

Read the super-admin page at `app/montree/super-admin/` to understand the existing layout and styling. Then:

### 1. Add a "Marketing" card to the super-admin dashboard

Add a new card on the super-admin page that links to `/montree/super-admin/marketing`. Match the existing card style. Icon: 📣 or 🚀. Label: "Marketing Hub".

### 2. Create the marketing hub page

Create `app/montree/super-admin/marketing/page.tsx`

This page shows clickable cards for 13 marketing tools, organized into sections:

**🎯 LAUNCH TOOLS**
- Launch HQ (14-day checklist + file finder)
- Objection Handler (FAQ answers for principals)

**📝 CONTENT TOOLS**
- Platform Warroom (TikTok scripts, IG carousels, FB groups, bios, hashtags)
- Content Factory (Social cards, WeChat article, captions)
- Creative Studio (Voiceover scripts, Canva specs)

**📨 OUTREACH TOOLS**
- Prospect HQ (School hit list, WhatsApp templates)
- Outreach (Cold email templates)
- Growth Engine (Influencers, SEO, onboarding emails, testimonials)

**🌐 WEB PAGES**
- Landing Page (HTML — serve at /montree or link to montree.xyz)
- Links Page (HTML — serve at /links)
- Pitch Deck (HTML — serve at /pitch)

**📖 REFERENCE**
- Playbook (Strategy bible)

Each card links to its own sub-page.

### 3. Create sub-pages for each tool

The 13 source files are JSX React components and HTML files. I'm uploading them all to this chat now.

For each .jsx file:
- Create a page at `app/montree/super-admin/marketing/[tool-name]/page.tsx`
- Add `"use client"` at top
- Convert the default export into a named component
- Wrap in the same layout/auth as other super-admin pages
- Keep ALL the content, data, and functionality exactly as-is

For each .html file:
- Either serve as a static file in `public/` OR embed in an iframe on its sub-page
- Landing page → `public/montree-landing.html` (or integrate into existing /montree route)
- Links page → `public/montree-links.html`
- Pitch deck → `public/montree-pitch-v2.html`

### File → Route mapping:

```
montree-launch-hq.jsx        → /montree/super-admin/marketing/launch-hq
montree-objection-handler.jsx → /montree/super-admin/marketing/objections
montree-platform-warroom.jsx  → /montree/super-admin/marketing/warroom
montree-content-factory.jsx   → /montree/super-admin/marketing/content
montree-creative-studio.jsx   → /montree/super-admin/marketing/studio
montree-prospect-hq.jsx       → /montree/super-admin/marketing/prospects
montree-outreach.jsx           → /montree/super-admin/marketing/outreach
montree-growth-engine.jsx      → /montree/super-admin/marketing/growth
montree-playbook.html          → /montree/super-admin/marketing/playbook (iframe)
montree-landing.html           → public/montree-landing.html
montree-links.html             → public/montree-links.html
montree-pitch-v2.html          → public/montree-pitch-v2.html
```

### 4. Navigation

Add a back button on every sub-page that returns to `/montree/super-admin/marketing`.

Add a back button on the marketing hub that returns to `/montree/super-admin`.

### Style rules

- Match the existing super-admin dark theme
- Green accent (#2ecc71) for Montree branding
- The JSX files already use Tailwind classes — they should work as-is
- Each JSX component is self-contained with all its data inline — no external dependencies needed

### Important

- Do NOT modify any of the content or data inside the JSX files. They contain carefully written marketing copy, school contacts, email templates, scripts, etc. Keep it ALL.
- The super-admin is protected by password (870602). Make sure the marketing pages are also behind the same auth.
- After building, list every new file you created so I can verify.
