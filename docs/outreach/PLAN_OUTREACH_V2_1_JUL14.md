# PLAN: Outreach V2.1 — Corrected Execution Plan (reconciled against real infra)
**Owner:** Tredoux · **Director:** Fable · **Date:** 14 July 2026
**Supersedes:** `PLAN_Montessori_Outreach_V2_Handoff.md` (the "V2 Handoff Brief"), whose diagnosis stands but whose implementation section was written blind to the existing whale-class outreach infrastructure. This document is the binding contract for the build.

---

## §0 — WHAT THE V2 BRIEF GOT RIGHT (kept verbatim as strategy)

1. Replies/demos/pilots are the metric, not rows or followers.
2. Hub-first: SAMA → AMI EsF → Tim Nee/MTCNE → FAMM/Marisa → North Shore Montessori IL.
3. Segment split by commercial intent: A revenue / B free-pilot partners / C hubs / X excluded. **Never pitch $100+/mo to Segment B.**
4. Verification gate: no outreach to any unverified row (name collisions already happened twice).
5. Instrument every send from send #1; kill dead channels after 20 sends.

## §1 — GROUND-TRUTH CORRECTIONS (what the V2 brief got wrong)

1. **There is no single `outreach_schools` table to "extend."** There are TWO:
   - `montree_outreach_contacts` — the 6,852-row global master already in prod: full email status ladder (14 CHECK values), social columns + independent `social_status` axis (migration 289), `contact_type='disadvantaged_school'` (287), the `outreach-status.py` CLI, the 🌍 super-admin tab, `bulk_import`/`social_enrich` APIs, the daily-campaign-sweep task. **This is the system of record. All V2 columns land here.**
   - `montree_outreach_schools` — the 95-row China-code table that powers `/welcome/[code]` + the visit RPC + signup redeem. It stays as the code/landing rail; we bridge to it rather than duplicate it.
2. **`Montessori_NPO_Global_Directory.xlsx` does not exist on disk.** Exhaustive search (repo, Desktop, Downloads, content-grep): the "~50 orgs with follower counts and Contact Person Profiles" only ever existed inside a claude.ai research chat. It cannot be imported. **Substitute sources:** (a) `docs/outreach/underprivileged/UNDERPRIV_MASTER_RANKED_JUL12.csv` (222 orgs, emails/FB/IG/social_strength 0–10 — same ground, better verified), (b) `~/Downloads/MONTREE_GLOBAL_MONTESSORI_SCHOOLS_MASTER_DATABASE_COMPLETE.md` (1,082 lines, ~170 table rows, 38 `[VERIFIED]` placeholders → import names as `unverified_from_doc`), (c) `docs/outreach/enrichment/` (38 found emails + 80 footprint scores + 2,860-domain MX sweep — **owed to the DB since Jul 12 anyway**). ⏳ Tredoux: if the claude.ai chat that produced the xlsx still exists, export it and drop it in Downloads — the importer will pick it up as a 4th source; do NOT block on it.
3. **Don't invent a new status ladder.** Existing CHECK already covers new/contacted/replied/dead + `demo_requested`(≈demo) + `meeting_booked` + `converted`(≈customer). We add exactly ONE value: `pilot`. Mapping: demo→`demo_requested`, customer→`converted`.
4. **Don't rename what exists.** fb_url→use `facebook_url`, ig_url→`instagram_url`, contact_name→`contact_person`. Email/phone/notes exist. Only genuinely new columns get added (§2).
5. **"Cursor is the agent" → wrong workflow for this repo.** Standing rule (Jul 10): Fable directs, Sonnet scouts/audits, Opus builds; scripts run on the Mac (Desktop Commander) or the Cowork sandbox; DB writes via the Supabase pooler or the existing APIs. No Cursor.
6. **Standing campaign rules apply unchanged:** 50 drafts/day cap, weekly follow-ups with 3-strike valve, Gmail dedup `to:FULL-ADDRESS in:sent` before every draft, status flips ONLY via `scripts/outreach-status.py`, NEVER auto-send. V2 hub/segment sends run INSIDE this machine, not beside it.

## §2 — SCHEMA: migration `294_outreach_v2_segments.sql` (additive, idempotent)

New columns on `montree_outreach_contacts` (all `ADD COLUMN IF NOT EXISTS`):

| Column | Type | Notes |
|---|---|---|
| `segment` | text CHECK ('A_revenue','B_pilot_partner','C_hub_org','X_excluded') | nullable = not yet segmented |
| `montessori_verified` | boolean | + `montessori_evidence_url` text |
| `disadvantaged_verified` | boolean | + `disadvantaged_evidence_url` text |
| `fb_followers`, `ig_followers` | integer | parsed from free-text estimates where possible |
| `social_checked_date` | date | "last looked at their socials" |
| `contact_role` | text | title/role of contact_person |
| `responsiveness_score` | smallint CHECK 1–5 | + `responsiveness_rationale` text — replaced by real reply data after 20 sends (WS4) |
| `warm_path` | text | e.g. "via SAMA membership", "via Tim Nee MTCNE" |
| `verification_status` | text CHECK ('verified','partial','unverified_from_doc') | default NULL for legacy rows |
| `outreach_code` | text, UNIQUE partial index WHERE NOT NULL | same format/regex as `montree_outreach_schools` |

Plus: add `'pilot'` to the `status` CHECK (drop+recreate preserving all 14 existing values). Plus a partial index on `(segment, status)` for the dashboard view.

**Code-side (same commit, required or the columns are dead):**
- `ALLOWED_CONTACT_COLUMNS` whitelist in `app/api/montree/super-admin/outreach/route.ts` must gain every new column — the route silently drops unknown fields (scout-verified).
- `scripts/outreach-status.py`: add `pilot` to the hardcoded status rank list.
- 🌍 `GlobalOutreachTab`: segment filter pill + verification badge (small, deferred-able).

**Codes bridge (decision):** minting a code for a contact = write `outreach_code` on the contacts row AND insert a mirror row into `montree_outreach_schools` (same code, school_name/country/contact) so `/welcome/[code]`, the visit RPC, and signup redeem work with ZERO changes to the live landing/redeem path. A small `scripts/outreach-mint-code.py` (or an action in the importer) does the dual-write. We do NOT rewire `/welcome` to read a second table.

## §3 — IMPORT: one-time script `scripts/outreach-import-v2.mjs` (Node, pooler, idempotent)

Order of operations:
1. **Apply enrichment (owed since Jul 12):** `enrich-emails-jul12.csv` → fill empty emails (38 SEEN); `mx-check-jul12.csv` → flip 44 newly-dead to `email_status='bounced'`/notes MX_DEAD, revive the 4; `disadvantaged-footprint-jul12.csv` → fb followers/strength.
2. **UNDERPRIV_MASTER_RANKED_JUL12.csv (222 rows):** upsert by org_name+country (many of the 75-80 disadvantaged rows already in DB — UPDATE not duplicate). Set `contact_type='disadvantaged_school'` (new rows), `verification_status='partial'` (evidence-seen in Jul-12 session), map `social_strength`→`responsiveness_score` proxy (1–5 compressed), org_type network/foundation→candidate `C_hub_org`, else `B_pilot_partner` default. `batch_tag='underpriv-jul12'`.
3. **Master-database .md (~170 table rows):** parse org names/countries/URLs → insert ONLY rows not already present, `verification_status='unverified_from_doc'`, `segment=NULL`, `status='new'`, `batch_tag='v2-masterdoc-jul14'`. **These rows are outreach-frozen until verified.**
4. **Hub seeding:** ensure the 5 WS1 hubs exist as rows with `segment='C_hub_org'`, `warm_path` filled (FAMM=warm via Marisa thread; SAMA=SA home market; MTCNE=tnee@crec.org; EsF; North Shore IL), `verification_status='verified'`.
5. Dry-run mode (`--dry-run`) prints planned inserts/updates/skips; real run logs a summary CSV to `docs/outreach/v2-import-report-jul14.csv`.

## §4 — WORKSTREAMS, remapped

- **WS1 Hubs (Fable copy, Tredoux sends):** 5 tailored emails, drafted by Fable (NOT delegated — director-critical copy), created as Gmail drafts after per-recipient dedup, statuses flipped via CLI. FAMM = follow-up on the existing Marisa thread, not a cold send. Counts inside the 50/day budget.
- **WS2 Migration+import:** this build (§2–§3). Days 1–2.
- **WS3 Bulk mining (Sonnet agents, later):** association directories (MEAB, OMB, IMF…), ProPublica 990 API, Montessori Census (⚠ already scraped 3,198 US census rows Jul 6 — the "census" item is DONE, don't redo; the new angle is filtering the EXISTING rows for public/charter = tuition-free Segment A), GlobalGiving remaining countries, native-language passes. Each run lands via `bulk_import` with `verification_status` set honestly.
- **WS4 Reply instrumentation:** already 80% built — `montree_outreach_log` logs every action; sweep combs Gmail daily. Add: log template-variant + channel per send in `notes`/log detail; 2-week review = a `counts`-style CLI query by segment×status.
- **WS5 Segment-aware `/welcome/[code]`:** scout confirmed NO variant mechanism exists (single hardcoded template). New work: add a `variant` column on `montree_outreach_schools` ('standard'|'npo_pilot') + one conditional copy block on the page (free-pilot/mission framing, "built by a Montessori teacher", no pricing). Gated behind its own mini contract; build BEFORE the first 20 Segment-B sends, not before hub emails (hubs get personal emails, not volume links).

## §5 — SEQUENCE

- **Now:** migration 294 (Tredoux pastes SQL in Supabase) → deploy whitelist/CLI changes → run importer (enrichment + 222 + masterdoc + hubs).
- **Next 1–2 days:** Fable drafts 5 hub emails → Tredoux reviews/sends. WS5 variant contract.
- **Week 2:** first 20 Segment-B pilot-offer sends (Responsiveness 4–5 list) through the standard draft machine; WS3 script runs begin.
- **2-week review:** replies by segment×channel; kill/double-down.

## §6 — WHAT NOT TO DO (binding)
- No new outreach table. No renaming existing columns. No second status axis beyond the existing email/social pair.
- No outreach to `unverified_from_doc` rows. No pricing pitch to Segment B — free pilot only.
- No re-scraping Montessori Census / no continent chat-sweeps.
- Never queue more drafts than the 50/day budget; never auto-send; status flips only via the CLI.
