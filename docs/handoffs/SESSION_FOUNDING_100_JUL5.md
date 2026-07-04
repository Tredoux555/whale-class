# SESSION — Jul 5, 2026 (Cowork) — FOUNDING 100 WAITLIST + super-admin control panel + Core/Premium pricing copy

**1 commit on main: `260e24fa` (10 files, +815/−9), pushed via Desktop Commander from the montree
checkout. Migration 285 RUN in Supabase (confirmed clean). ESLint 0/0 on all touched files, i18n
strict parity 12/12. Feature is LIVE on montree.xyz.** Closes the "🚀 QUEUED — Founding 100 waitlist"
item from the Jul-4-night block.

Built end-to-end this session in Cowork (Opus). Tredoux was the go-between/advisor for a separate
"lyfcoach launch" effort but the feature is a **Montree schools** thing, so it was built in
`whale-class` (montree), never lyfcoach-web.

---

## What it is

A public "Founding 100" waitlist section on the Montree homepage (directly below the hero) + a
super-admin control panel to run it. The offer: **free for 6 months, then $3/student locked for life,
full Premium (Sonnet) reports at the founder price.**

### 🚨 THE LOAD-BEARING DECISION — the counter shows ADMITTED schools, not raw signups.

`remaining = cap − admitted`. Every form submission writes a waitlist row and does **NOT** move the
counter. Tredoux admits schools manually from super-admin, in waves. This means a spam wave or 100
tyre-kickers can never burn the permanent offer — the form keeps collecting a waitlist indefinitely,
and Tredoux decides who counts. Do not "simplify" this to auto-decrement-on-signup — that reintroduces
the footgun.

### 🚨 $3 is copy + config only — NOT wired to Stripe.

Admitting a school in the panel is the *promise* of $3. To actually bill an admitted founder at $3,
set that school's per-school billing override (migration 202) in the Schools tab. Stripe config was
deliberately left untouched per Tredoux's instruction ("we can change Stripe later, before first
promotion").

---

## Files (10)

**New (6):**
- `migrations/285_founding_waitlist.sql` — `montree_founding_waitlist` (email UNIQUE, status
  waitlisted/admitted/declined, admitted_at) + `montree_founding_config` single row (cap=100, wave=1,
  is_closed=false, singleton CHECK id=1). RLS enabled deny-all; server uses service role.
- `app/api/montree/founding/count/route.ts` — public GET. `{ cap, wave, admitted, remaining, is_closed }`.
  Fails soft to 100-remaining if anything errors (section never crashes).
- `app/api/montree/founding/join/route.ts` — public POST. IP rate-limit (`checkRateLimit`, 5/15min, same
  as `/demo-request`), input caps, hidden honeypot field (`website`), email UNIQUE dedupe (23505 = soft
  success), fire-and-forget notify email to tredoux555@gmail.com. Empty school_name → '(general waitlist)'.
- `app/api/montree/super-admin/founding/route.ts` — `verifySuperAdminAuth`-gated. GET = config + counts +
  all rows. PATCH = `set_status` (admit/decline/reset a row) OR `update_config` (cap/wave/is_closed).
- `components/montree/FoundingHundred.tsx` — the homepage section. Counter, form (school/name/email/
  country/students + honeypot), "Join the Waitlist" CTA, success state, and the auto "Founding 100 is
  full → general waitlist" state when `is_closed` OR `remaining <= 0`. Dark-forest tokens, mobile-first,
  hardcoded English copy (no i18n keys → no parity churn).
- `components/montree/super-admin/FoundingTab.tsx` — the control panel. See below.

**Edited (4):**
- `app/montree/page.tsx` — import + `<FoundingHundred />` mounted directly below the hero, inside the
  page-content wrapper.
- `app/montree/super-admin/page.tsx` — dynamic import + `TabType` `| 'founding'` + valid-array entry +
  `🚀 Founding 100` tab button + content block `{activeTab === 'founding' && <FoundingTab sessionToken={saToken} />}`.
- `app/pricing/page.tsx` — surgical copy update: hero "One plan." → "Simple pricing / Founder pricing for
  early schools", subcopy now states Core $3 / Premium $7 / founder $3; the "Why is there only one plan?"
  FAQ replaced with a Core-vs-Premium FAQ + a "What is the Founding 100?" FAQ. The $7 pricing CARD is
  untouched (it IS the Premium detail; still correct). **Full two-tier card redesign deferred to Tredoux's
  pre-promotion pass.**
- `lib/montree/i18n/en.ts` — 2 value swaps only (`landing.hero.fineprint`, `landing.closing.body`) to drop
  the "one plan / no tiers" lines. Keys unchanged → parity held. Other 11 locales still show old pricing
  values (acceptable — no one's on the site yet; re-translate before promotion).

---

## The super-admin control panel (Tredoux's full manual control — no SQL)

Super-admin → **🚀 Founding 100** tab:
- **See every signup** — school, contact, email, country, approx students, status, date, source.
- **Admit / Decline / Reset** any row with a button (PATCH `set_status`).
- **Edit cap + wave**, Save (PATCH `update_config`).
- **Close / Re-open the offer** with one toggle (`is_closed`). When closed, the homepage form flips to
  the general-waitlist state regardless of remaining spots.
- Filter pills (all / waitlisted / admitted / declined). Stat cards: admitted / remaining / total / open-closed.
- The homepage counter reflects whatever Tredoux admits here.

---

## Architectural rules locked in

1. **Founding counter = `cap − admitted`, never raw signups.** Admits are manual. Form collects forever.
2. **`montree_founding_config` is a singleton** (`CHECK id = 1`). One row holds cap/wave/is_closed.
3. **Public routes reuse the `/demo-request` abuse posture** — `checkRateLimit(supabase, ip, path, 5, 15)`
   + input caps + hidden `website` honeypot + email UNIQUE dedupe (23505 = soft success).
4. **Notify email is fire-and-forget to tredoux555@gmail.com** (Resend account owner → delivers even with
   the montree.xyz domain unverified). No confirmation email is sent to the school (by design; that WOULD
   be blocked until Resend domain verification).
5. **$3 founder price is copy + config only.** Enforce per-school via `billing_override_usd` (migration 202)
   when admitting. Stripe untouched.
6. **FoundingHundred copy is hardcoded English** — deliberately no new i18n keys, so the strict parity
   pre-commit hook stays green with zero locale churn.
7. **Super-admin routes gate on `verifySuperAdminAuth(req.headers)`**; the tab sends `x-super-admin-token`.

---

## Verification

- ESLint `--max-warnings=0`: 0/0 on all 8 touched code files.
- i18n strict completeness: 12/12 locales 100% (pre-commit hook ran on push and passed).
- Audit caught + fixed one real bug ESLint doesn't flag: two success-state strings used `&apos;` inside
  plain JS string literals (would render literally) → rewritten apostrophe-free.
- Cross-file contracts verified by grep: form fields ↔ join route; tab actions ↔ super-admin route.
- `gen_random_uuid` proven available (migrations 184/145/189 use it); `React.CSSProperties` global proven
  (4+ other components use it without a React default import).
- Migration 285 RUN in Supabase (Tredoux confirmed "SQL is run and clean").

**Tredoux to eyeball on montree.xyz:** homepage section renders below hero + counter reads 100/100;
test signup → notify email + "You're on the list"; super-admin 🚀 tab shows the row → Admit drops counter
to 99 → Close toggle flips the homepage form to the full state.

---

## Open / next

- **Full two-tier pricing-page card redesign** — deferred to Tredoux's pre-promotion pass (he said he'd
  do pricing properly before the first promotion). Current page: hero + FAQ updated, $7 card = Premium.
- **Re-translate the 2 changed pricing i18n keys** across the other 11 locales before any non-English
  promotion (currently English-only value change).
- **Wire $3 to Stripe** — when the first founder is admitted and ready to pay, set their per-school
  `billing_override_usd = 3`. A future build could auto-apply this on admit.
- **Seeding the counter** — Tredoux's call whether to start below 100 to imply traction. Config-driven via
  the panel, so adjustable any time.
