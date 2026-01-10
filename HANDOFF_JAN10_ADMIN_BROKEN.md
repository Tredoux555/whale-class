# HANDOFF: Admin Dashboard Cards Broken
**Date:** Jan 10, 2026  
**Issue:** Cards rendering as plain text links, not styled cards

---

## THE PROBLEM

Admin dashboard at `/admin` shows cards as unstyled text links instead of colored boxes.

**Expected:** Colorful 3x grid of cards with icons  
**Actual:** Plain blue underlined links

---

## ROOT CAUSE ANALYSIS

### Tailwind v4 + Dynamic Classes = Problem

**Setup:**
- Tailwind v4 (`^4` in package.json)
- PostCSS plugin: `@tailwindcss/postcss`
- NO `tailwind.config.ts` at root (only one in unused `/montree/` subfolder)

**The Issue:**
Tailwind v4 auto-detects classes BUT the `COLOR_CLASSES` object is a **runtime lookup**:

```tsx
const COLOR_CLASSES: Record<CardColor, string> = {
  slate: 'bg-slate-600 hover:bg-slate-700',
  amber: 'bg-amber-500 hover:bg-amber-600',
  // ...
};

// Later used as:
className={`${COLOR_CLASSES[card.colorKey]} rounded-xl p-6...`}
```

Tailwind v4's scanner might not be extracting these because:
1. They're in an object, not directly in JSX
2. The object keys are typed as `CardColor`, not string literals visible to scanner

---

## POTENTIAL FIXES (Try in Order)

### Fix 1: Nuclear Cache Clear
```bash
cd ~/Desktop/whale
rm -rf .next
rm -rf node_modules/.cache
npm run dev
```
Then hard refresh: **Cmd+Shift+R**

### Fix 2: Add Safelist Classes to globals.css
Add to bottom of `app/globals.css`:

```css
/* Tailwind v4 Safelist - force include these classes */
@layer utilities {
  .bg-slate-600 { background-color: #475569; }
  .bg-slate-700 { background-color: #334155; }
  .bg-amber-500 { background-color: #f59e0b; }
  .bg-amber-600 { background-color: #d97706; }
  .bg-green-500 { background-color: #22c55e; }
  .bg-green-600 { background-color: #16a34a; }
  .bg-emerald-500 { background-color: #10b981; }
  .bg-emerald-600 { background-color: #059669; }
  .bg-cyan-500 { background-color: #06b6d4; }
  .bg-cyan-600 { background-color: #0891b2; }
  .bg-pink-500 { background-color: #ec4899; }
  .bg-pink-600 { background-color: #db2777; }
  .bg-purple-500 { background-color: #a855f7; }
  .bg-purple-600 { background-color: #9333ea; }
  .bg-indigo-500 { background-color: #6366f1; }
  .bg-indigo-600 { background-color: #4f46e5; }
  .bg-blue-500 { background-color: #3b82f6; }
  .bg-blue-600 { background-color: #2563eb; }
  .bg-yellow-500 { background-color: #eab308; }
  .bg-yellow-600 { background-color: #ca8a04; }
  .bg-red-500 { background-color: #ef4444; }
  .bg-red-600 { background-color: #dc2626; }
  .bg-teal-500 { background-color: #14b8a6; }
  .bg-teal-600 { background-color: #0d9488; }
  .bg-orange-500 { background-color: #f97316; }
  .bg-orange-600 { background-color: #ea580c; }
}
```

### Fix 3: Rewrite Without Dynamic Lookup
Replace the object lookup with direct classes in JSX. Change admin page to use hardcoded classes per card.

### Fix 4: Downgrade to Tailwind v3
In `package.json`:
```json
"tailwindcss": "^3.4.0"
```
And create proper `tailwind.config.ts` at root.

---

## QUICK TEST

After any fix, test at:
```
http://localhost:3001/admin
```

Cards should show as:
- Colorful rectangles (slate, amber, green, etc.)
- Icons visible (🏫, 👩‍🏫, 🌳, etc.)
- Hover effect (slight scale + darker color)

---

## FILES INVOLVED

| File | Purpose |
|------|---------|
| `app/admin/page.tsx` | Dashboard with COLOR_CLASSES object |
| `app/globals.css` | Tailwind v4 import + custom styles |
| `postcss.config.mjs` | Uses `@tailwindcss/postcss` (v4) |
| `package.json` | Tailwind v4 dependency |

---

## RECOMMENDATION

**Try Fix 1 first** (cache clear). If that fails, **Fix 2** (safelist) is the safest.

Fix 3 requires significant code changes. Fix 4 is a major downgrade.
