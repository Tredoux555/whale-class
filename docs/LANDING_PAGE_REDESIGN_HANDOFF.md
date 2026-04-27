# Landing Page Redesign Handoff — for Opus

## The Task
Completely rewrite `app/montree/page.tsx` — the public Montree landing page at `montree.xyz/montree` — with a new dark design that matches the login screen aesthetic. The existing file is a long, busy, light-themed page. Replace it entirely with something short, dark, and premium.

## The Vision
The Montree login screen (`app/montree/login-select/page.tsx`) is beautiful — dark forest gradient, clean white typography, emerald accents. The landing page should feel like an extension of that world. When a school principal finds Montree online, they should land in the same visual world they'll inhabit every day as a user.

**Design philosophy: less is more. Silence is confidence. White space is premium.**

Think: Apple 2007. Not a features list. Not a comparison table. An experience.

## Exact Colors to Use (from login-select/page.tsx)
```css
background: bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900
/* i.e.: from #0f172a → #064e3b → #134e4a */

logo gradient: from-emerald-400 to-teal-500 /* #34d399 → #14b8a6 */
CTA button: from-emerald-500 to-teal-500 /* #10b981 → #14b8a6 */
glass card: bg-white/5 border border-white/10 backdrop-blur
secondary text: text-emerald-300 /* #6ee7b7 */
muted text: rgba(255,255,255,0.4)
very muted: rgba(255,255,255,0.18)
section label: text-emerald-400/70, font-size 10px, letter-spacing 0.1em, uppercase
```

## The Tagline
**"The magic of Montree."** — This is THE brand tagline. Use it as the hero headline. It should be in a large serif font (Lora or Georgia), white, centred, powerful.

## Page Structure (4 sections only — keep it SHORT)

### 1. Nav
- Logo (tree emoji in emerald rounded square) + "Montree" wordmark
- Single CTA button top right: "Get started" (emerald gradient pill)
- Nothing else

### 2. Hero (full-viewport feel)
- Small label above: "Montessori classroom management" in tiny uppercase emerald
- Big serif headline: **"The magic of Montree."**
- Subtext (2 lines max): "A teacher takes a photo. Montree does the rest."
- Primary CTA: "Experience it free for 30 days" (emerald gradient pill, substantial size)
- Micro copy below: "One classroom · No credit card" (very faint)
- Massive breathing room — this section should feel like a poster

### 3. Three lines (no cards, no icons — just beautiful typography)
Three short statements, each with a tiny emerald uppercase label + serif headline + 2-sentence body. Generous vertical spacing between them. This is NOT a feature grid. It's editorial prose on a dark background.

- **FOR THE TEACHER** / "No more paperwork. No more writing." / Montree identifies the work in every photo, records the observation, and tracks each child across all five curriculum areas. Automatically.
- **FOR PARENTS** / "Reports that actually say something." / Not templates. Genuine, personalised accounts of what each child is learning and why it matters — written every week.
- **FOR THE PRINCIPAL** / "A complete view of the school." / Every classroom. Every child. A built-in Montessori expert available at any hour to answer any question.

### 4. Closing CTA (centred, minimal)
- Serif headline: "Experience the magic."
- Body: "One month free. Then $7 per child, per month. One plan. No tiers. No contracts."
- Button: "Start your free trial"

### Footer
- Logo + "Montree · montree.xyz" centred, very faint

## Typography Rules
- Headlines: Lora or Georgia serif, font-weight 400 (NOT bold — elegant not heavy)
- Body: system sans-serif, rgba(255,255,255,0.4), line-height 1.85
- Section labels: 10px, letter-spacing 0.1em, uppercase, #34d399 (emerald)
- NO bold body text. NO bullet points. NO icons in the three-features section.

## What to Preserve from the Existing File
- The `DemoModal` component (lines 7–100 approx) — keep it, it's wired to `/api/montree/demo-request`
- The scroll reveal animation logic (`addReveal` ref pattern) — can keep or simplify
- The `<Head>` / metadata if present
- The "Get started" CTA should open the demo modal OR link to `/montree/login-select?signup=true`

## What to REMOVE
- All existing section content (hero, "for the teacher" week breakdown, four stakeholders grid, three budget lines, personal promise, etc.)
- The comparison table
- All light/white background sections
- The existing pricing link section (replaced by the new closing CTA)

## Quality Bar
This page will be the first thing a Montessori school principal sees when they Google Montree. It should feel like a premium, confident, beautifully designed product. Think Linear, Vercel, or Stripe's dark landing pages — not a WordPress template.

The previous attempts in Sonnet's widget tool looked amateurish. Opus: take your time, think like a senior product designer, and build something that would make a school principal stop scrolling.

## File Location
`/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/whale/app/montree/page.tsx`

After editing, commit and push:
```bash
cd ~/Desktop/Master\ Brain/ACTIVE/whale && git add app/montree/page.tsx && git commit -m "Landing page: full redesign — dark theme, magic of Montree" && git push origin main
```
Use Desktop Commander (`mcp__Desktop_Commander__start_process`) for git push, NOT Cowork VM SSH.
