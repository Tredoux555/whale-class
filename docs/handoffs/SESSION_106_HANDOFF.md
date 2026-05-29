# Session 106 Handoff — May 12, 2026

**Theme:** Astra 402 universal rollout + sonnet chips + agent mobile polish + parent theme audit + bulk-reply stale demo leads. **Plus a complete Stripe Connect activation playbook** ready for Tredoux to walk through.

**0 commits pushed yet** — everything in working tree, ready for `git add . && git commit && git push` after Tredoux reviews. **No SQL.** All migrations through 201 remain run (last confirmed Session 105).

**🚨 THE TOP CALL TO ACTION:** Stripe Connect is the only blocker to wiring Gloria's first real agent payout. **The codebase has been ready since Session 90.** Tredoux just needs to flip 4 toggles in Stripe Dashboard + Railway. **Section "Stripe Connect Activation Playbook" below has the exact 7 steps.**

---

## 5 workstreams shipped (all clean, all in working tree)

| # | Workstream | Files | Scope |
|---|---|---|---|
| 1 | **Astra 402 pattern universally applied** | 14 server routes + 11 client surfaces + 1 new shared component + 27 i18n keys × 12 locales = 324 translations | Architectural rule #29 fully realised. Every paid AI feature renders the warm UpgradeCard instead of a red error toast on a free-tier school's tap. |
| 2 | **Top-3 candidate chips on sonnet_drafted card** | 1 file (photo-audit) | Extends Session 105 rule #32 to the Sonnet-drafted teal card. One-tap fix when Sonnet's #1 was wrong but #2/#3 is right. Falls back to `closest_existing_match` shape so older drafts still get chips. |
| 3 | **Agent dashboard mobile polish** | 10 files | MiraFloat repositioned bottom-right on mobile (was overlapping AgentNav hamburger). iOS zoom-on-focus killed (16px font on every input/textarea). Touch targets bumped to 44pt on primary CTAs. Earnings table → per-school cards below 640px. |
| 4 | **Parent portal dark forest theme audit** | 4 files | Real find: `STATUS_META` map was using Tailwind class strings as inline `style.color` values — they silently never worked. Replaced with real CSS hex values matching the dark forest palette. Dashboard now varies pill color by status (emerald/blue/gold) instead of hardcoded amber. Plus iOS zoom + sign-out tap target. |
| 5 | **Bulk-reply stale demo leads** | 3 files (1 NEW route, 1 NEW email helper, 1 UI extension) | Super-admin can now select multiple stale demo leads and send the trial-link reply to all in one click. Server-side batch via Resend, marks each as `contacted`, idempotent + logged. New "📨 Reply to all stale" header button when any rows > 14d. |

**Cumulative:** 32 files touched, 0 errors, 0 new warnings, i18n still 4430/4430 keys × 12 locales = 100% parity.

---

## Workstream 1 — Astra 402 pattern universally applied

### Server (13 routes patched + Astra already done in Session 105)

Architectural rule #29 says AI 402s must return `{ requires_upgrade: true, upgrade_url: '/montree/admin/billing', feature: '<key>', tier, error }`. Every AI route now follows the shape:

| Route | feature key |
|---|---|
| `reports/weekly-wrap` | `weekly_wrap` |
| `guru/snap-identify` | `snap_identify` |
| `weekly-review/[childId]` (POST + PATCH) | `weekly_review` |
| `reports/language-presentation/[childId]` | `language_presentation` |
| `reports/language-semester/generate` | `language_semester` |
| `guru/teaching-instructions` | `teaching_instructions` |
| `guru/generate-work-content` | `generate_work_content` |
| `admin/child-briefing/[childId]` | `child_briefing` |
| `admin/parent-question` | `parent_question` |
| `admin/tracy/scan-thread` | `tracy_scan` |
| `admin/tracy/draft-response` | `tracy_draft` |
| `admin/conversations/transcribe` | `vault_transcribe` |
| `admin/principal-agent` (Astra itself) | `tracy` (already done Session 105 `0192bad6`) |

**Photo Identification deliberately NOT tier-gated** per the Session 57 architectural decision — free-tier schools still need basic photo capture working. The `process` route doesn't return 402 today and we kept it that way.

### Client (11 consumer surfaces wired)

**Round 1 (high-traffic):**
- `components/montree/reports/WeeklyWrapTab.tsx`
- `app/montree/dashboard/language-semester/page.tsx`
- `app/montree/admin/communication/threads/[threadId]/page.tsx` (both scan + draft buttons)
- `app/montree/dashboard/snap/page.tsx` (localized actionable toast, not card — snap is ephemeral)

**Round 2 (long tail):**
- `app/montree/dashboard/[childId]/weekly-review/page.tsx`
- `app/montree/dashboard/[childId]/language-presentation/page.tsx`
- `components/montree/guru/TeachingInstructions.tsx`
- `components/montree/guru/TeachGuruWorkModal.tsx`
- `app/montree/admin/child/[childId]/page.tsx` (BOTH child-briefing AND parent-question — same tier blocks both, surfaced as one page-level card)
- `app/montree/admin/conversations/page.tsx` (Vault transcribe)

### New shared component

`components/montree/UpgradeCard.tsx` — gold/amber card matching the Astra design exactly. Props:
- `feature?: string` — feature key for per-feature title/body override
- `upgradeUrl?: string` — defaults to `/montree/admin/billing`
- `title?` / `body?` / `cta?` — explicit overrides win over i18n lookup
- `marginTop?` — extra top spacing
- `external?` — open billing in new tab (default false)

Plus helper `extractUpgradeFromResponse(res)` — reads a 402 body, returns `{ feature, upgradeUrl, error } | null`. Pattern:

```typescript
const res = await fetch(url, { ... });
if (res.status === 402) {
  const u = await extractUpgradeFromResponse(res);
  if (u) { setUpgrade({ feature: u.feature, upgradeUrl: u.upgradeUrl }); return; }
}
```

### i18n (27 new keys × 12 locales)

- `upgrade.title` / `upgrade.body` / `upgrade.cta` — generic defaults
- `upgrade.feature.<feature>.title` and `.body` for all 12 features

Filled via Haiku batch (`scripts/fill-missing-i18n-keys.mjs` from `lib/montree/i18n/en.ts`). All 11 non-English locales translated. **Pre-commit strict i18n check passes:** 4430/4430 keys × 12 locales.

### Architectural rules locked in

Rule #29 (from Session 105) is now **fully realized across every AI surface**. There is no path in the product where a free-tier school sees a generic red error on a tier-gated AI feature. Every gate routes to the warm "Set up billing" CTA.

---

## Workstream 2 — Top-3 chips on sonnet_drafted card

**Where:** `app/montree/dashboard/photo-audit/page.tsx` (lines 2993-3025).

The Sonnet-drafted (teal card) now surfaces the top-2 sibling candidates as inline pill chips below `closest_existing_match`. One tap → confirms that candidate via the same `handleConfirmCandidate` handler used by Haiku-drafted/matched cards.

Falls back gracefully: if `top_candidates` is empty (older drafts pre-Session 105), but `closest_existing_match.work_name` exists, we shape-adapt that single candidate into the same chip array. So older drafts still get the one-tap fix affordance.

Architectural rule #32 (matchToCurriculumV2 returns top-3) extends naturally to all three identification surfaces now: haiku_matched, haiku_drafted, sonnet_drafted.

---

## Workstream 3 — Agent dashboard mobile polish

### The core conflict fixed

**MiraFloat trigger overlapping the AgentNav hamburger.** Both lived top-right at zIndex 35/30 on mobile. Mira covered the hamburger, blocking navigation entirely.

Fix in `components/montree/agent/MiraFloat.tsx`:
- **Mobile (`<768px`):** trigger AND expanded panel sit **bottom-right** with `env(safe-area-inset-bottom)` padding for notched devices.
- **Desktop (`md+`):** stays **top-right** matching TracyFloat's pattern.
- Implemented via inline `<style jsx>` media queries so both states open from the same corner.

### iOS zoom-on-focus killed across every agent input

iOS Safari auto-zooms when a focused input has `font-size < 16px`. Bumped to 16px on:
- Codes page: pitch label input (`text-base sm:text-sm` Tailwind pattern)
- Messages compose modal: subject input + body textarea
- Messages thread: reply textarea
- MiraFloat: chat textarea (especially critical — float is small, zoom-in disrupts the experience)
- Mira dedicated page: chat textarea

### Touch targets bumped to Apple 44pt on primary CTAs

`py-3 sm:py-2` pattern preserves desktop compactness while hitting 44pt on mobile:
- Codes page: Generate code + Copy/Revoke/School row
- Payouts page: Set up payouts / Open Stripe / Copy link
- Schools page: empty-state Generate-first-code
- Dashboard: Stripe banner CTA + empty-schools CTA
- Settings page: Sign out

### Earnings table → cards on mobile

The earnings page's 8-column table was squashed unreadable below 640px (overflow-x-auto worked but bad UX for the headline business surface).

Replaced with `hidden md:block` for the existing desktop table + new `md:hidden` per-school card view: headline figure (your share) prominent on the right, gross/fees/costs/net math broken out below as a 2×4 grid in 11px tabular nums. Tap card → drills into per-school page.

### Other polish

- `100vh` → `100dvh` on MiraFloat panel max-height (survives mobile browser chrome shrinking).
- Mira textarea minHeight 40 → 44 matching touch target.

---

## Workstream 4 — Parent portal dark forest theme audit

### The real find: dead/broken status colors

Both `parent/dashboard/page.tsx` and `parent/report/[reportId]/page.tsx` had `STATUS_META` records mapping mastered/practicing/presented to **Tailwind class strings** (`text-emerald-700`, `bg-emerald-50`) as `color` / `bg` fields — used inside inline `style={{ color: ... }}` props where Tailwind classes silently fail.

- On the **report page**, status badges (`⭐ Mastered`, `🔄 Practicing`, etc.) inherited the parent's default text color instead of rendering in their semantic hue. Design intent never worked.
- On the **dashboard**, the value was bypassed entirely — every status badge hardcoded `T.amber` regardless of state.

Replaced with real CSS hex values matching the dark forest palette:

```typescript
mastered: { icon: '⭐', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
completed: { icon: '⭐', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
practicing: { icon: '🔄', color: '#93c5fd', bg: 'rgba(59,130,246,0.12)' },
presented: { icon: '🌱', color: '#fcd34d', bg: 'rgba(245,158,11,0.12)' },
default: { icon: '📸', color: '#c4b5fd', bg: 'rgba(139,92,246,0.12)' },
```

Then wired `getStatusInfo(work.status).color` into the dashboard's status pill (was hardcoded `T.amber`). Now parents get a quicker scan signal — emerald = mastered, blue = practicing, gold = newly introduced.

### Plus iOS zoom + sign-out tap target

- Parent messaging compose modal + reply textarea: 14px → 16px
- Dashboard sign-out button: `padding: '10px 8px'` for 40+px touch target without visual weight

### What was already clean (no work needed)

`parent/layout.tsx` · `parent/login/page.tsx` · `parent/page.tsx` · `parent/signup/page.tsx` · `parent/photos/page.tsx` · `parent/weekly-review/page.tsx` · `parent/milestones/page.tsx` (deprecated) — all already on dark forest tokens. The Session 71 carry-over was mostly misleading; the audit caught only the STATUS_META bug + the iOS zoom issue.

---

## Workstream 5 — Bulk-reply stale demo leads

### What it does

When the demo-request queue backs up (someone fills out the landing-page form, you don't reply within 14 days), super-admin can now:

1. **"📨 Reply to all stale (N)"** header button — sends the trial-link reply to every `status='demo_requested'` lead older than 14 days in one click. Confirms first.
2. **Per-row checkboxes** + **"📧 Reply to N selected"** — selective bulk reply. Same email goes to chosen subset.

Each email is the same personalised "Hi {firstName}, thanks for reaching out about Montree…" body as the per-row mailto button — just routed via Resend instead of the user's mail client. Auto-marks each lead as `contacted` on success (stops the drip).

### Files added/changed

**NEW:** `lib/montree/email.ts` → `sendDemoTrialLinkReply()` helper. Same body as the mailto template so a recipient who got the bulk version followed by a manual one still gets coherent voice.

**NEW:** `app/api/montree/super-admin/demo-requests/bulk-reply/route.ts` POST endpoint. Super-admin gated. Accepts `{ lead_ids: [] }` OR `{ all_stale: true }`. Caps at 100 leads per call. Per-email failures don't block the rest — returns `{ sent, failed, skipped, outcomes }` so the UI surfaces counts.

**EXTENDED:** `app/montree/super-admin/page.tsx` → DemoRequestAlert component gains the bulk-action header + per-row checkbox column.

### Architectural rules locked in

Rule #34 (new): **Bulk operations against contactable status fields skip non-eligible rows server-side** rather than failing the batch. Reply-to-not_interested-lead is a footgun — server returns `{ skipped: true, reason: 'status=...' }` per outcome, batch continues.

Rule #35 (new): **Per-email failures inside a batch don't compound original errors.** Each fail is logged to `montree_outreach_log` with `action='bulk_reply_trial_link_failed'` and the batch moves on. Audit log makes any failure recoverable.

---

## 🚨 STRIPE CONNECT ACTIVATION PLAYBOOK

**Status:** All code shipped since Session 90. Webhook handler at `/api/stripe/connect-webhook` exists. Status refresh + onboarding-link generation exist. Super-admin 💳 button per-agent exists. Money tab Connect status pill exists. Migrations 187 (agent_stripe_connect columns) RUN.

**Blocker:** Stripe Dashboard toggles + Railway env vars. **6 manual steps**, ~15–20 minutes total.

### Step 1. Verify `STRIPE_SECRET_KEY` is in Railway

It almost certainly is — school billing has been live since Phase 4. Open Railway → service → Variables → search for `STRIPE_SECRET_KEY`. If present, skip to Step 2.

### Step 2. Enable Stripe Connect on the platform account

Anthropic can't drive `dashboard.stripe.com` (financial UI policy — correct posture). Walk this yourself:

1. Open `https://dashboard.stripe.com/connect/overview`
2. Click **Get started** (or **Settings → Connect → Get started**)
3. Pick **Platform or marketplace**
4. Pick **Express** as the account type
5. Save

The route `createConnectAccount()` in `lib/montree/referral/stripe-connect.ts` is hardcoded to create Express accounts. So once Connect is on, every agent onboarding link creates an Express sub-account.

### Step 3. Create the Connect-mode webhook endpoint

**🚨 Critical:** there are TWO webhook modes in Stripe. You already have **Account-mode** (school billing → `/api/montree/billing/webhook`). You now need **Connect-mode** for per-agent events:

1. Open `https://dashboard.stripe.com/webhooks`
2. Click **Add endpoint**
3. URL: `https://montree.xyz/api/stripe/connect-webhook`
4. **Listen to:** select **Events on Connected accounts** (NOT "Account events" — this is the toggle)
5. Events: `account.updated` only (the handler processes this one event today)
6. Click **Add endpoint**
7. On the next screen, click **Reveal signing secret**, copy `whsec_…`
8. Railway → Variables → new var:
   ```
   STRIPE_CONNECT_WEBHOOK_SECRET=whsec_…
   ```
9. Save (auto-deploy triggers)

Your existing Account-mode webhook for school billing keeps its existing `STRIPE_WEBHOOK_SECRET` env var untouched. They're independent.

### Step 4. Set the cron env vars

Same Railway Variables screen, add these two:

```
CRON_SECRET=hn57BkFBTMTic3ByvZY183T0s/YzBJyqSHsRyMvrFCc=
CRON_DIGEST_EMAIL=tredoux555@gmail.com
```

`CRON_SECRET` was generated fresh with `openssl rand -base64 32` during Session 106. Copy as-is.

### Step 5. Confirm with banker (Wallex/HK)

Quick email or call before onboarding Gloria:

> *"We're enabling Stripe Connect Express on our HK platform account. Stripe will issue payouts to our agents' personal/business bank accounts. Need to confirm: (a) the platform Connect payout from Stripe → my Wallex HKD account routes correctly, and (b) my agents (some HK-resident, some not) can receive Express payouts."*

If Wallex says no, fall back is Stripe Standard or manual Wallex wires. Express HK should work — Stripe documents the rail.

### Step 6. Generate Gloria's onboarding link

Once Steps 2–4 are saved and Railway has redeployed:

1. Open `https://montree.xyz/montree/super-admin`
2. Login with super-admin password
3. Click **🎟️ Referrals** tab
4. Find Gloria's row (code `GLORIA-3KD5`)
5. Click the **💳** button
6. A fresh onboarding URL appears in an indigo banner — click **Copy**
7. Send Gloria:
   - The link (good for ~5 minutes — generate fresh if expired, her account ID is preserved)
   - `docs/agents/GLORIA_STRIPE_ONBOARDING.md` (the 10-min walkthrough already written)

### Step 7. (Optional, later) Configure 5 Railway crons

Per `docs/perf/CRON_SETUP.md`. Most important: **#1 monthly payout calculator** (`0 2 1 * *`). Without it, no payouts get computed.

Health tab → "Cron triggers" panel can fire each manually until the crons are wired (Session 104).

### What lights up when this lands

The moment the webhook is wired and Connect is on:

- You click 💳 on Gloria's row → fresh URL
- Gloria clicks → enters name + DOB + ID + bank in Stripe's hosted form (5–10 min)
- Stripe posts `account.updated` → your webhook → DB writes `stripe_connect_status='verified'`
- Gloria's `/montree/agent/payouts` page flips from "Set up payouts now" to green ✓ verified pill
- Next month-end, payout calculator (manual or cron) computes her share
- Money tab gets a ⚡ Wire button on her row
- One click → Stripe transfers to her bank → row flips `paid` → email to Gloria
- Year-end: Stripe issues her 1099-NEC. You see none of her bank/tax detail.

---

## Smoke test plan (Session 107, ~30 min)

After `git push` and Railway redeploys:

1. **Astra 402 upgrade card** — switch Whale Class to Free tier, hit Astra. Should see amber/gold "Activate Astra" card with billing CTA, not red error.
2. **Weekly Wrap upgrade card** — same tier, hit photo-audit → Weekly Wrap → Generate. Should see "Activate Weekly Wrap reports" card.
3. **Language Semester upgrade card** — open `/montree/dashboard/language-semester`, click Generate. Should see "Activate semester reports" card.
4. **Snap Identify upgrade toast** — capture a photo via /snap. Should see actionable toast "Activate Snap Identify — ...".
5. **Vault upgrade card** — `/montree/admin/conversations`, record a clip, hit Transcribe. Should see "Activate Conversation Vault" card.
6. **Child briefing/parent-question upgrade card** — `/montree/admin/child/[childId]`, expect upgrade card at top instead of red error.
7. **Switch back to Premium** — verify every surface above works normally.
8. **Sonnet chips** — find a sonnet_drafted photo. Should see "or pick: [chip] [chip]" with top-2 siblings.
9. **Agent dashboard mobile** — open `/montree/agent/dashboard` on phone (Chrome dev tools mobile emulator works). MiraFloat trigger should be bottom-right. Tap inputs — no zoom-in. Open earnings — cards on mobile.
10. **Parent dashboard mobile** — open a parent report. Status pills should be coloured (emerald/blue/gold). Compose a message — no input zoom.
11. **Bulk-reply demo leads** — super-admin home, find a stale demo lead, check the box, click "📧 Reply to N selected". Wait for confirmation banner. Lead drops from list. Check email arrives.

---

## Tredoux's operational to-do (priority-ordered)

1. **🚨 Walk the Stripe Connect playbook above (Steps 2–6).** This is the single biggest unlock — wires Gloria's real payout.
2. **Send the HK accountant** `docs/finance/HK_FINANCIAL_ADVISOR_SUMMARY.md` — categorization decisions need their reply.
3. **Verify `montree.xyz` in Resend** so demo + drip + bulk-reply emails actually deliver to recipients (currently using onboarding@resend.dev test address per CLAUDE.md note).
4. **After Step 7 above:** configure 5 Railway crons per `docs/perf/CRON_SETUP.md`.

---

## Deferred backlog (Session 107+, priority-ordered)

| Priority | Item | Effort |
|---|---|---|
| Medium | **Per-school billing override** — super-admin sets custom price for legacy schools (e.g. $5 instead of $7 for first 10 early adopters). New `billing_override_usd` column on `montree_schools` + tiny UI + Stripe price override on next cycle. | ~2h |
| Medium | **Photo bank improvements** — direct-Supabase-URL inconsistency (route bypasses `getProxyUrl()` that the rest of the app uses), delete UX, search-by-classroom filter, possibly export-to-tool shortcut. | half-day |
| Medium | **Virtual scroll on photo-audit grid** — Session 105 deferred. Investigated Session 106 — grid already paginates at 24/page so true virtual scroll is overkill. Re-investigate if user re-reports choke after the React.memo + chip work. | varies |
| Low | **Apply UpgradeCard to additional surfaces** — Session 106 wired 11 consumers. If new AI surfaces ship, they should reach for `<UpgradeCard feature={...} />` rather than re-inventing the 402 → red error pattern. | rolling |
| Low | **HeyGen explainer videos** — long-standing carry-over. | varies |
| Low | **Playwright smoke test suite** — automate the 11-step manual smoke test above. | half-day |

---

## Files changed this session (32 unique)

### Server routes (13 patched + 1 new)
- `app/api/montree/reports/weekly-wrap/route.ts`
- `app/api/montree/guru/snap-identify/route.ts`
- `app/api/montree/weekly-review/[childId]/route.ts`
- `app/api/montree/reports/language-presentation/[childId]/route.ts`
- `app/api/montree/reports/language-semester/generate/route.ts`
- `app/api/montree/guru/teaching-instructions/route.ts`
- `app/api/montree/guru/generate-work-content/route.ts`
- `app/api/montree/admin/child-briefing/[childId]/route.ts`
- `app/api/montree/admin/parent-question/route.ts`
- `app/api/montree/admin/tracy/scan-thread/route.ts`
- `app/api/montree/admin/tracy/draft-response/route.ts`
- `app/api/montree/admin/conversations/transcribe/route.ts`
- `app/api/montree/super-admin/demo-requests/bulk-reply/route.ts` — **NEW**

### Client surfaces (12)
- `components/montree/UpgradeCard.tsx` — **NEW**
- `components/montree/reports/WeeklyWrapTab.tsx`
- `components/montree/guru/TeachingInstructions.tsx`
- `components/montree/guru/TeachGuruWorkModal.tsx`
- `components/montree/agent/MiraFloat.tsx`
- `app/montree/dashboard/language-semester/page.tsx`
- `app/montree/admin/communication/threads/[threadId]/page.tsx`
- `app/montree/dashboard/snap/page.tsx`
- `app/montree/dashboard/[childId]/weekly-review/page.tsx`
- `app/montree/dashboard/[childId]/language-presentation/page.tsx`
- `app/montree/admin/child/[childId]/page.tsx`
- `app/montree/admin/conversations/page.tsx`
- `app/montree/dashboard/photo-audit/page.tsx` — sonnet chips
- `app/montree/agent/dashboard/page.tsx`
- `app/montree/agent/codes/page.tsx`
- `app/montree/agent/payouts/page.tsx`
- `app/montree/agent/earnings/page.tsx`
- `app/montree/agent/schools/page.tsx`
- `app/montree/agent/settings/page.tsx`
- `app/montree/agent/mira/page.tsx`
- `app/montree/agent/messages/page.tsx`
- `app/montree/agent/messages/[threadId]/page.tsx`
- `app/montree/parent/dashboard/page.tsx`
- `app/montree/parent/report/[reportId]/page.tsx`
- `app/montree/parent/messages/page.tsx`
- `app/montree/parent/messages/[threadId]/page.tsx`
- `app/montree/super-admin/page.tsx` — DemoRequestAlert bulk-reply extension

### Libs (1 extended)
- `lib/montree/email.ts` — `sendDemoTrialLinkReply()`

### i18n (12 locales, 27 new keys each)
- `lib/montree/i18n/en.ts` + zh/es/de/fr/pt/nl/it/ja/ko/uk/ru

### Docs (1 new)
- `docs/handoffs/SESSION_106_HANDOFF.md` (this file)

---

## Final state checks (verified at session close)

- ✅ ESLint: 0 errors across all 32 changed files. Pre-existing warnings unchanged.
- ✅ i18n strict: 4430/4430 keys × 12 locales, 100% parity.
- ✅ Routes verified: 14 routes carry the canonical `requires_upgrade` shape (grep confirms).
- ✅ All 14 in-flight tasks closed via TaskUpdate.
- ⏳ No `git push` yet — everything in working tree. Tredoux to review + commit.

---

**End of Session 106.** Pick up Session 107 with the 11-step smoke test after `git push`. Stripe Connect playbook above is the highest-leverage next step.
