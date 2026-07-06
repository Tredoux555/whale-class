# PLAN — 🌍 Super-admin Global Outreach tab (Jul 6, 2026)

Spec origin: `docs/handoffs/HANDOFF_GLOBAL_OUTREACH_SCRAPE.md` §Session 3. Built under the sacred rule
(plan → plan-audit → build → fresh-eyes review). Data source: `docs/outreach/Montree_Global_Master_Jul2026.csv`
(7,366 rows, 11 cols: Country,School,Email,Region,City,Phone,Website,Source,Type,Flags,Notes).

## Recon facts (verified in code — do NOT re-derive)

- `montree_outreach_contacts` ALREADY has `country`, `region`, `source`, `mx_verified` (BOOLEAN — NOT `mx_ok`), `batch_tag`, `email_status`. No `city` column.
- Unique PARTIAL index on `email` (only when non-empty) → duplicate emails rejected as 23505; empty emails allowed many times.
- `contact_type` CHECK (post-203): multiplier_association, multiplier_training, multiplier_franchise, multiplier_consultant, individual_school, competitor_intel, agent_application. **`disadvantaged_school` missing → migration 287.**
- `status` CHECK (post-183/203): new, drafted, sent, bounced, replied, meeting_booked, converted, dead, follow_up, demo_requested, contacted, not_interested, agent_applied(+203 extras).
- Existing POST `/api/montree/super-admin/outreach` `action:'bulk_import'` `{contacts:[...]}` — filters through `ALLOWED_CONTACT_COLUMNS` (includes country/mx_verified/batch_tag/source), batches 50, upsert onConflict:'id' + per-row insert fallback classifying 23505 as duplicate. Returns `{inserted, duplicates, errors, error_samples, skipped}`. CSV rows have no id → effectively insert + 23505 dedupe path. REUSE THIS — do not build a second importer.
- Existing PATCH `/api/montree/super-admin/campaign-manager` `{id|ids, status, notes?}` handles status flow + side-effect dates + outreach_log. REUSE for per-row status changes.
- Auth: `verifySuperAdminAuth(req.headers)` from `@/lib/verify-super-admin`; client sends `x-super-admin-token: sessionToken`. No cookies.
- Tab wiring in `app/montree/super-admin/page.tsx`: `TabType` union (line ~44) + `next/dynamic` import + `<SuperAdminTab>` strip (insert 🌍 right AFTER 🚀 Founding, ~line 742) + `{activeTab==='global-outreach' && <GlobalOutreachTab sessionToken={saToken}/>}` render block. Use prop name `sessionToken`.
- Style: copy the `T` token object from `CampaignTab.tsx` (lines 18-34) verbatim. NO styled-jsx inside conditional branches (Turbopack rule — use inline styles / dangerouslySetInnerHTML if a keyframe is ever needed; prefer none).
- 🚨 Standalone Docker build does NOT ship `docs/` → server CANNOT read repo CSVs at runtime. Import must be CLIENT-side file parse → JSON POST.
- Latest migration = 286 → new one is 287.
- House rules: `.maybeSingle()` not `.single()`; escape `%_\` before `.ilike()`; paginate any read that can exceed 1000 rows; client checks `response.ok` before `.json()`.

## Build items

### 1. `migrations/287_disadvantaged_contact_type.sql`
DO $$ block: DROP CONSTRAINT IF EXISTS + re-ADD `montree_outreach_contacts_contact_type_check` with the
7 existing values + `'disadvantaged_school'`. Idempotent. Comment noting it must run before importing
disadvantaged rows (until then those rows fail per-row with CHECK violation — surfaced in error_samples,
other rows unaffected — acceptable degraded mode, no code gate needed).

### 2. `app/api/montree/super-admin/global-outreach/route.ts` (GET only)
`verifySuperAdminAuth` → 401. Views:
- `?view=by_country` — aggregate per country: `{country, total, with_email, new, drafted, sent, replied, bounced, converted, dead, disadvantaged}`. Implementation: paged reads of `select('country,status,email,contact_type')` in 1000-row `.range()` pages (loop until short page; hard cap ~30 pages), aggregate in JS, sort by total desc. Also return grand totals.
- `?view=contacts&country=&status=&q=&limit=50&offset=0` — `select('*')`, filters: `eq('country',…)`, `eq('status',…)`, `q` → escaped `.or(org_name.ilike.%q%,email.ilike.%q%)` (escape `%_\` AND commas/parens can break .or — restrict q to stripped [len≤60] and escape). Order `updated_at desc`. Return `{contacts, total}` (count:'exact').
- `?view=export&country=&status=` — same filters, paged 1000-row loop, build CSV string server-side (quote fields containing `",\n`; prefix `=+-@` cells with `'` to kill CSV-injection), return `text/csv` attachment `global-outreach-export.csv`.

### 3. `components/montree/super-admin/GlobalOutreachTab.tsx`
`'use client'`, default export `({ sessionToken }: { sessionToken: string })`. `T` tokens from CampaignTab. Sections:

**(a) Totals strip** — cards: Total contacts, With email, Countries, Sent, Replied (from by_country grand totals).

**(b) Import card (gold accent)** — file input (`.csv`, multiple). Client CSV parser: small quote-aware
state machine (handles `""` escapes + commas/newlines in quotes — ~30 lines, NO new deps). Two accepted
shapes: master format (has Country column) or per-country format (no Country column → a "Default country"
text input applies; if neither → per-file error). Mapping per row:
- `org_name`=School (required — skip row if empty), `email`=Email unless `NOT_FOUND`/no `@` → `''`
- `region`=Region + (City ? ` / ${City}` : '') (no city column in DB), `phone`=Phone==='NOT_FOUND'?'':Phone,
  `website`=Website==='NOT_FOUND'?'':Website, `country`=Country||default, `source`=Source, `notes`=[Flags, Notes].filter(Boolean).join('; ')
- `contact_type` = Type==='disadvantaged' → `'disadvantaged_school'` else `'individual_school'`
- `status`='new', `email_status` = Flags/Notes contains MX_DEAD → `'invalid'` else `'unknown'`
- `mx_verified` = has email && !MX_DEAD, `batch_tag`='global-scrape-jul2026'
- Rows whose Flags contain `DUP_EMAIL`: SKIP client-side (count as skipped_dup — the DB would 23505 them anyway; skipping saves round-trips).
POST in chunks of 400 to `/api/montree/super-admin/outreach` `{action:'bulk_import', contacts, source:'global_scrape_jul2026'}`;
accumulate `{inserted, duplicates, errors}`; progress line `chunk i/n`; final per-file summary + error_samples
surfaced verbatim (diagnosable failures — Jun-14 rule). Never auto-navigates away mid-import.

**(c) Country table** — from by_country: Country | Total | ✉️ | Sent | Replied | Conv | row click sets country filter in (d). Disadvantaged count shown with a 🤲 chip.

**(d) Contacts browser** — search input (debounced 400ms), status dropdown filter, country chip (clearable),
paginated 50/page table: School | Email | Country | Region | Status pill | Updated. Per-row status `<select>`
(new/drafted/sent/replied/bounced/converted/dead/follow_up/contacted) → PATCH campaign-manager `{id, status}`
→ optimistic update + revert on !ok. Export button → fetch view=export with current filters (auth header) →
blob → anchor download (MoneyTab pattern).

**(e) Empty state** — if by_country returns 0 contacts for the batch: gold hint "Import the master CSV
(docs/outreach/Montree_Global_Master_Jul2026.csv)".

All fetches: `x-super-admin-token` header, `cache:'no-store'`, check `res.ok` BEFORE `res.json()`, surface
real error text.

### 4. Wire into `app/montree/super-admin/page.tsx`
- TabType += `'global-outreach'`
- `const GlobalOutreachTab = dynamic(() => import('@/components/montree/super-admin/GlobalOutreachTab'), { ssr: false });`
- Tab strip: `<SuperAdminTab active={activeTab==='global-outreach'} onClick={…} icon="🌍" label="Global Outreach" />` immediately after Founding 100.
- Render block with `sessionToken={saToken}`.

## Verification (builder must run)
- `npx eslint` on the 3 touched/created TS/TSX files → 0 errors.
- `npx tsc --noEmit` scoped sanity (pre-existing errors outside diff tolerated).
- grep: no `.single(`, no unescaped `.ilike`, no styled-jsx in the new files.
- Confirm page.tsx has exactly one new TabType member, one dynamic import, one strip entry, one render block.

## 🚨 POST-AUDIT AMENDMENTS (Opus plan-audit, Jul 6 — BINDING)

1. **C1 — page.tsx has a FIFTH wiring point:** the `valid: TabType[]` deep-link whitelist array (~line 351)
   must also gain `'global-outreach'`, or `?tab=global-outreach` deep links silently fail. Total edits to
   page.tsx = 5 (union, valid[], dynamic import, strip entry, render block).
2. **C2 — two migration files are numbered 182.** The outreach table is `migrations/182_outreach_contacts.sql`
   (NOT `182_apply_global_translations`). Partial unique index verified: `WHERE email IS NOT NULL AND email != ''`.
3. **I1 — placeholder guard must be case-insensitive:** the real CSV has 2,509 lowercase `not_found` emails.
   Use `const isPlaceholder = (v?:string) => !v || v.trim().toLowerCase()==='not_found';` for Email, Phone
   AND Website (email additionally requires `includes('@')`).
4. **I2 — concrete `q` sanitizer (no repo precedent covers two-branch .or):**
   `const safe = q.slice(0,60).replace(/[%_\\]/g,'\\$&').replace(/[(),]/g,'')` before
   `.or(\`org_name.ilike.%${safe}%,email.ilike.%${safe}%\`)`.
5. **I3 — tab scope decision (BINDING):** default scope = `batch_tag = 'global-scrape-jul2026'` for
   by_country, contacts AND export. Add an "All contacts" toggle that widens to the whole table, in which
   case: exclude `contact_type='agent_application'` and coalesce NULL/empty country to `'Unknown'` in the
   aggregation. Empty-state hint keys on the batch-scoped count being 0.
6. **I4 — no arbitrary page cap:** paginate by_country/export until a short page (<1000 rows); if a safety
   cap is kept it must be ≥200 pages and log a warning when hit.
7. **M4 note:** campaign-manager PATCH does not validate status — the DB CHECK is the only gate. All dropdown
   values verified CHECK-safe: new/drafted/sent/replied/bounced/converted/dead/follow_up/contacted.

## Out of scope
- No Stripe/billing/AI touch. No changes to existing outreach/campaign-manager routes. No auto-send anything.
- Migration 287 SQL gets PASTED IN CHAT for Tredoux (standing rule) — never assume it ran.
