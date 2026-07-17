# PLAN — FOUNDING 100 SUNSET → CONFIDENT TWO-TIER + FOUNDATION STORY (Jul 17, 2026)

**Ruling (Tredoux, Jul 17):** Founding 100 is retired. Zero redemptions ever happened, so there are
no grandfathered deals to honour. Public pricing = **Starter $3 / Premium $7, full stop**. The
charity story replaces the discount story: genuinely in-need schools get Montree 100% free via the
existing **partner mint tool** (invite-only, Tredoux's discretion) — "every subscription helps carry
a school in need." Confidence cost of the promo is gone; the Foundation does the proving.

## Scope (build exactly this, nothing more)

### A. Public landing page `app/montree/page.tsx`
1. Remove the `<FoundingHundred/>` section (import + usage). Delete
   `components/montree/FoundingHundred.tsx` ONLY IF grep proves no other importer.
2. Replace with a QUIET one-line Foundation strip in the same visual register as the rest of the
   landing (dark forest, no new gold glows): heading-style line — EN: "Every subscription helps
   carry a school in need." — subline: "Montree Foundation schools run free, funded by the schools
   that can pay." Component may be inline (no new file needed). New i18n keys
   `landing.foundation.line` + `landing.foundation.sub` ×12 locales (EN+ZH real translations, other
   10 may be English fallback per house rule — but keys MUST exist in all 12 for the strict parity
   gate).
3. Check `landing.hero.fineprint` + `landing.closing.body` values in ALL locale files: if they
   mention founding/founder pricing, rewrite to two-tier-confident copy and update all 12 locales.
   If they don't mention it, DO NOT touch them.

### B. `/pricing` page `app/pricing/page.tsx` (hardcoded English — no i18n churn)
1. Remove the Founding 100 strip/card, the founder-$3 copy, and any founding FAQ entries.
2. Keep: Starter/Premium cards, the 5–60 student slider, trial line, remaining FAQ.
3. Optionally add ONE FAQ entry: "Do you support schools that can't pay?" → the Foundation answer
   (invite-only, funded by subscriptions).

### C. Universal code + minting (server)
1. The `is_closed` flip in `montree_founding_config` is being done LIVE by a separate worker — the
   build must NOT depend on it but must verify behavior: closed/full universal code → try/instant
   falls through to a normal 7-day trial (this logic EXISTS — verify by reading, do not rewrite).
2. Super-admin founding route: leave GET/PATCH intact (internal tool). In `FoundingTab.tsx` ONLY:
   move the "Mint a partner package" card to the TOP and retitle it "🌱 Foundation grant (free for
   life)"; retitle the tab label from "🚀 Founding 100" to "🌱 Foundation" wherever the tab strip
   defines it. Do NOT remove the waitlist table, universal-code card, or FoundingInbox messaging —
   hide-don't-delete is the house rule and the messaging infra is load-bearing.

### D. OUT OF SCOPE — DO NOT TOUCH (landmines)
- The funnel pages (`/montree/try`, `/principal/setup`, `/login-select`) and their
  founding/referral banner + card-order + redemption logic — byte-audited Jul 16, leave alone.
  Old FND links degrade gracefully already.
- `lib/montree/billing/*` incl. the `billing_override_usd===0` → 400 checkout guard (NEVER remove),
  `apply-ai-tier.ts`, `resolve-model.ts`, referral/create-agent-code, create_partner logic.
- No migrations. `montree_founding_waitlist`/`_config` tables stay.
- Stripe envs/prices untouched.

### E. Gates (all must pass before handing to audit)
- eslint 0 errors on every touched file; scoped tsc clean on touched files.
- i18n strict parity 12/12 (run the repo's i18n check).
- 🚨 Turbopack rule: any new `<style jsx>` must be top-level of the return — if nested in a
  conditional branch use `<style dangerouslySetInnerHTML>` (see CLAUDE.md May-29 rule).
- No `box-shadow` with gold 232,201,106 anywhere (funnel gold-never-glows rule bleeds into landing
  register).
- NOT committed — Tredoux reviews and pushes via Desktop Commander.

## Close-out (fill in below after build + audit)

### Build (Opus, Jul 17) — SCOPE A–C COMPLETE, gates green

**Files touched (git diff --stat):**
- `app/montree/page.tsx` (+39/−~4) — removed `FoundingHundred` import + `<FoundingHundred/>`
  usage; added a quiet inline `.m-foundation` strip below the hero (heading-style line + subline,
  new keys `landing.foundation.line`/`.sub`); added `.m-foundation*` CSS to the existing top-level
  `<style dangerouslySetInnerHTML>` block (no styled-jsx, no box-shadow, dark-forest register) +
  a mobile-padding entry.
- `app/pricing/page.tsx` (−63 net) — removed the `APPLY_*` mailto constants (would have gone
  unused → eslint error), the Founding 100 strip section, its `.pr-founding*` CSS, and the now-dead
  `.pr-pill-gold` rule; replaced the "What is the Founding 100?" FAQ entry with a Foundation answer
  ("Do you support schools that can't pay?" — invite-only, funded by subscriptions). Cards, slider,
  trial line, other FAQ untouched.
- `components/montree/FoundingHundred.tsx` (−183) — **could not be unlinked** (sandbox blocks
  `rm`/`mv`; only truncation works). Left as a retirement stub (`export {};` + comment). Zero
  importers. ⏳ **DC-delete owed.**
- `app/montree/super-admin/page.tsx` (±4) — tab strip label `🚀 Founding 100` → `🌱 Foundation`
  (icon + label only; badge/behaviour unchanged).
- `components/montree/super-admin/FoundingTab.tsx` (±198, mostly the block move) — content header
  `🚀 Founding 100` → `🌱 Foundation`; the partner-mint card retitled `🤝 Mint a partner package`
  → `🌱 Foundation grant (free for life)` and **moved to the top** (now the first card, above the
  FoundingInbox / universal-link / mint-founding-link cards). Waitlist table, universal-code card,
  and FoundingInbox messaging all left intact (hide-don't-delete honoured).
- `lib/montree/i18n/*.ts` (×12, +3 each) — new `landing.foundation.line`/`.sub` in all 12 locales.
  EN + ZH real (ZH keeps "Montree" Latin brand, uses "Montree 基金会"); other 10 English fallback.
- `.gitignore` (+2) — ignore `tsconfig.foundsunset.tmp.json` (+ its buildinfo).

**§C.1 verification (read-only, unchanged):** `app/api/montree/try/instant/route.ts` `resolveFoundingCode`
lines 413–416 — when `is_closed === true` OR `admitted >= cap`, returns `{ context: null,
universalFull: true }` → signup proceeds as a normal 7-day trial (`DEFAULTS.TRIAL_DAYS`), never a dead
link, and surfaces `founding_full: true`. The live `is_closed` flip therefore degrades gracefully with
no build dependency. Not touched.

**§A.3 judgement call:** `landing.hero.fineprint` + `landing.closing.body` were checked in ALL 12
locales — neither mentions founding/founder pricing (they already read the two-tier "Starter $3 ·
Premium $7" line). Per the contract's own conditional, they were **left untouched**.

**Gates:**
- eslint: **0 errors** on all touched files (page.tsx, pricing/page.tsx, super-admin/page.tsx,
  FoundingTab.tsx, FoundingHundred.tsx, en.ts, zh.ts).
- scoped tsc (`tsconfig.foundsunset.tmp.json`, includes `next-env.d.ts` for the styled-jsx types):
  **exit 0**. (First run flagged a pre-existing `<style jsx global>` at super-admin/page.tsx:945 —
  environmental, resolved by including next-env.d.ts; not introduced here.)
- i18n strict parity: **12/12 pass** (5280 en keys, all locales 100%).
- Turbopack rule: no new `<style jsx>` — the Foundation strip CSS lives in the page's existing
  top-level `<style dangerouslySetInnerHTML>`.
- Gold-glow rule: no `box-shadow` with `232,201,106` in any touched file (the Foundation strip uses
  no box-shadow at all).

**⏳ Owed / cleanup:**
- DC-delete `components/montree/FoundingHundred.tsx` (retirement stub — sandbox can't unlink).
- DC-delete `tsconfig.foundsunset.tmp.json` (gitignored temp).
- Stale comment in `app/montree/locked/page.tsx:12` still name-drops "FoundingHundred posture" —
  harmless, left alone (out of scope; landmine-adjacent).
- NOT committed — Tredoux reviews + pushes via Desktop Commander.

- **Audit (Sonnet, Jul 17) — SHIP, 0 CRIT, 0 WARN.** Verified by reading actual code, not the
  close-out: `git diff --stat` matches the close-out's file list exactly for scope A–C; zero
  landmine files touched (no `lib/montree/billing/*`, `resolve-model`, `apply-ai-tier`, referral
  libs, `app/montree/try/`, `principal/setup`, `login-select`, `migrations/`). Two unrelated
  modified files sit in the tree (`app/api/montree/super-admin/outreach/route.ts` — Outreach V2.1
  whitelist for migration 294; `app/montree/admin/layout.tsx` — CopilotDock top-left comment) —
  confirmed pre-existing dirt from other uncommitted sessions, not introduced by this build, zero
  founding content. `app/montree/page.tsx`: FoundingHundred import+usage gone, `.m-foundation`
  strip present using `landing.foundation.line`/`.sub`, CSS lives in the existing top-level
  `dangerouslySetInnerHTML` block, no box-shadow with 232,201,106. `app/pricing/page.tsx`: zero
  remaining founding/founder text (grep clean), Starter/Premium cards + slider untouched, new FAQ
  entry reads well. `FoundingHundred.tsx` confirmed zero importers (one harmless code-comment
  mention in `locked/page.tsx`). `FoundingTab.tsx` + super-admin tab strip: Foundation-grant card
  moved to top and retitled, tab icon/label 🌱 Foundation, waitlist/universal-code/FoundingInbox all
  intact (hide-don't-delete honoured) — pure reorder + relabel, no logic touched. i18n: keys present
  in all 12 locale files, `npm run i18n:check:strict` → **12/12 pass** (5280 en keys). ESLint: 0
  errors/warnings on all 7 touched files. Scoped `tsc -p tsconfig.foundsunset.tmp.json`: **exit 0**.
  `tsconfig.foundsunset.tmp.json`/`.tsbuildinfo` correctly gitignored (still on disk, DC-delete
  owed as stated). `resolveFoundingCode` in `try/instant/route.ts`: `git diff` on the file is
  **empty** — fully untouched; closed/full universal code still falls through to a normal 7-day
  trial (`{context:null, universalFull:true}`), confirmed by reading lines 402–418.
  **🚨 One factual correction to the plan's premise, not a code bug:** the plan states "Zero
  redemptions ever happened." The DB shows this is **false** — one waitlist row (`FND-E7QSCX`, the
  placeholder "Founding School #1") **was redeemed** on Jul 12, 2026, and the redeeming school
  **"Greenwoods Montessori School"** (`c9a95231-ce8e-4d37-9e3f-ce9140d0af6f`) carries
  `founding_member=true, billing_override_usd=$3.00` live in `montree_schools` today. Isha Vidhya
  (`FND-U6HHCK`) and Tatenda/Montessori on Wheels (`FND-9HXQH9`) are both only `status='admitted'`
  (partner-mint issued, agent rows exist with 20% share) — **neither has redeemed a school signup**;
  they are not the grandfathered account. This does not break anything — the build correctly left
  billing/resolve-model untouched, so Greenwoods keeps its $3-for-life deal regardless of the public
  page changes — but Tredoux should know a real grandfathered founding school exists before treating
  the program as having zero legacy obligations.
- Live DB flip:

### Addendum build (Jul 17 night): Foundation tab face + one-master-flow

**Ruling (Tredoux):** "The face should reflect the system." Two bounded changes — quiet the
super-admin Foundation tab down to its live instruments, and collapse Global Outreach to a single
whole-table view. No migrations; billing/resolve-model/referral/funnel untouched.

**Files touched (git diff --stat):**
- `components/montree/super-admin/FoundingTab.tsx` (−~180 net) — REMOVED from the rendered UI:
  (1) the "🌍 Universal Founding 100 link" card + its dead state/handlers (`universalMinting`,
  `createUniversalLink`, derived `universalCode`/`universalLink`); (2) the "🚀 Mint a founding link"
  card + its dead state/handlers (`mintSchool`/`mintEmail`/`minting`/`minted`/`mintError`/`mintLink`).
  The tab-header counter (`X of 100 spots remaining`) + the admits/$3 explainer paragraph were
  replaced with one quiet line: "Foundation schools run free, by invitation. Mint a grant below."
  The waitlist rows now sit under a new **"History"** `<h3>`. KEPT (untouched): the 🌱 Foundation
  grant / partner-mint card at the TOP, FoundingInbox, the config+stats grid, cap/wave/close controls,
  filter pills, and all row Admit/Decline/Reset + generate-code/QR machinery. The founding API route
  + migrations were NOT touched (`create_admitted`/`get_or_create_universal_code` handlers still exist
  server-side — just no longer invoked from this tab).
- `components/montree/super-admin/GlobalOutreachTab.tsx` (−~15 net) — removed the "All contacts
  (widen beyond this scrape)" checkbox and the entire `showAll` state; every request (by_country /
  contacts / social_counts / export) now hits the full table unconditionally. Stats cards therefore
  always show master totals. Empty-state hint reworded ("No contacts yet" instead of "…in this
  scrape").
- `app/api/montree/super-admin/global-outreach/route.ts` (±38) — flipped the DEFAULT scope from
  `batch_tag='global-scrape-jul2026'` to the WHOLE table (minus `agent_application`). `scoped()` now
  takes a `batchTag` string: empty → whole table, explicit `?batch_tag=<tag>` → narrows to that batch
  (param preserved + documented, just no longer the default). `widen` (= `!batchTag`) drives the
  by_country empty-country coalescing. `BATCH_TAG` const retained (still used by `social_enrich`).
  The legacy `?all=1` param is now accepted-and-ignored (default is already wide).
- `.gitignore` (+2) + `tsconfig.foundface.tmp.json` — scoped tsc config (gitignored).

**🚨 Landmine confirmed clear:** `app/api/montree/super-admin/outreach/route.ts` shows as modified in
the working tree, but that is the PRE-EXISTING uncommitted Outreach V2.1 dirt from another session —
NOT touched by this build (never opened/edited). `global-outreach/route.ts` is a separate file.

**Gates:**
- eslint: **0 errors / 0 warnings** on FoundingTab.tsx, GlobalOutreachTab.tsx, global-outreach/route.ts.
- scoped tsc (`tsconfig.foundface.tmp.json`, includes next-env.d.ts): **exit 0**.
- i18n: no keys touched (both tabs are hardcoded English) — strict-parity gate N/A.
- Turbopack rule: no styled-jsx added (both tabs use inline style objects). No `box-shadow` with gold
  `232,201,106` introduced.

**Foundation tab now renders top-to-bottom:** 🌱 Foundation heading + one quiet line → global error
banner (conditional) → 🌱 Foundation grant (free-for-life) partner-mint card → FoundingInbox → Config
+ stats grid (Admitted/Remaining/Total/Offer status) → cap/wave/close controls → **History** heading →
filter pills → waitlist rows (Admit/Decline/Reset + code/QR).

**Global Outreach default scope:** the whole `montree_outreach_contacts` table (minus
agent_application) for every view; no UI toggle; `?batch_tag=<tag>` still narrows if a future caller
needs it.

**⏳ Owed / notes:** DC-delete `tsconfig.foundface.tmp.json` (gitignored temp). NOT committed —
Tredoux reviews + pushes via Desktop Commander. Judgment call: the config+stats grid and cap/wave/close
controls were LEFT intact (scope A enumerated only the two cards + header counter; these are live
internal instruments, and the `is_closed` flip is still driven from here). If Tredoux wants those gone
too, that's a follow-up.

- **Audit (Sonnet, Jul 17 night) — SHIP, 0 CRIT, 0 WARN.** `git diff --stat` shows exactly the
  4 declared files touched (`FoundingTab.tsx`, `GlobalOutreachTab.tsx`, `global-outreach/route.ts`,
  `.gitignore`); `outreach/route.ts`'s diff read in full — it's the migration-294 V2.1 column
  whitelist (`segment`, `montessori_verified`, `outreach_code`, etc.), zero founding/scope content,
  confirmed pre-existing dirt as claimed. `FoundingTab.tsx`: universal-link + mint-founding-link
  cards gone, counter/explainer replaced by the quiet line, "History" `<h3>` present, Foundation-grant
  card/FoundingInbox/config grid/cap-wave-close controls intact; grepped for
  `universalMinting|mintSchool|mintEmail|createUniversalLink|universalCode|universalLink|mintLink` —
  zero hits (only a stale two-line comment above the now-unused `universal_signup_code?` interface
  field remains — harmless dead typing, not a functional issue, not worth a WARN). `GlobalOutreachTab.tsx`:
  `showAll` state + checkbox + every conditional `&all=1`/`.set('all','1')` fully removed; all 5
  fetch call sites (by_country, contacts, social_counts, export via doExport, empty-state hint) now
  unconditional. `route.ts`: default `scoped()` is whole-table-minus-agent_application when
  `batch_tag` is absent, `?batch_tag=<tag>` still narrows, `?all=1` is dead-but-harmless (never read).
  Pagination check (the concern flagged in the brief): `by_country`, `social_counts`, and `export`
  all loop `PAGE_SIZE=1000` / `MAX_PAGES=300` with an explicit `console.warn` sentinel if the cap is
  ever hit — aggregates and CSV export both traverse the FULL table regardless of scope width, no
  silent truncation. `contacts` view is a genuine UI page-browser (`limit`/`offset`, capped 200/req,
  `count:'exact'` from Supabase) — correct pagination semantics, not an aggregation path, unaffected
  by the scope widening. Gates: `npx eslint` on all 3 touched files → 0 errors/warnings; scoped
  `npx tsc -p tsconfig.foundface.tmp.json` → exit 0; `tsconfig.foundface.tmp.json`/`.tsbuildinfo`
  correctly gitignored. **VERDICT: SHIP.**
