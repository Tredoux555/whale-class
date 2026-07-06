# HANDOFF — Global Montessori Outreach Scrape (ALL 3 SESSIONS DONE Jul 6, 2026)

## 🏁 Session 3 result (Jul 6, night — Fable orchestrating, FINAL)
**Program COMPLETE: 7,366 rows · 67 countries · 4,446 unique emails · 4,223 draft-ready · 80 disadvantaged.**

- **USA 3,198 schools / 2,340 emails (73%)** — montessoricensus.org carries its ENTIRE census inline in the
  homepage map script (3,198 markers: name/city/state/website). All 3,198 detail pages crawled via zero-token
  sandbox pipeline (leader/contact emails, 63% hit), then 754 school websites crawled for the gap (+327,
  incl. Cloudflare-decode). File: `docs/outreach/usa/USA_Montessori_Schools.csv`. **AMS directory = structurally
  email-free** (amshq.org/schools/, plain WP pagination, no bulk endpoint, email deliberately withheld —
  40-row sample kept at `usa/AMS_Member_Schools.csv`, full crawl deprioritized: zero email yield).
- **Africa 196 rows / ~97 emails across ~20 countries** (3 Sonnet agents, WebSearch/web_fetch only — sandbox
  was busy with the USA crawl). Files: `africa/Africa_{East_South,West_North,Topup}_Montessori_Schools.csv`.
  Notable: Kisumu (KE) + Jinja (UG) are GENUINE Montessori-brand gaps (checked against full local directories);
  mbischools.org (Bamako) is hijacked/spam — flagged; 13 DISADVANTAGED flags.
- **Disadvantaged wave 3: 68 → 80 rows (~38 countries).** Eswatini + Ukraine GlobalGiving retries SUCCEEDED
  (Odessa Way Home fund@wayhome.org.ua verified). EsF project pages turned out DIRECTLY fetchable (not
  JS-walled) — East Pokot + Corner of Hope pulled in full.
- **MX pass: 1,549 new domains dig-checked → only 4 dead** (ami-tanzania.ac.tz, arrismontessori.com,
  bambiniinemergenza.org, rosehillmontessori.org) flagged `MX_DEAD`. **+105 PRIOR_CONTACT flags** (209 total).
  All 5 new/changed CSVs width-validated (1 malformed row found + fixed in Africa west/north).
- **Consolidation:** `docs/outreach/Montree_Global_Master_Jul2026.xlsx` — 4 sheets (Summary w/ per-country
  formulas recalc'd 0 errors · All Schools 7,366 · Draft Queue 4,223 · Disadvantaged 80) + single-file
  `Montree_Global_Master_Jul2026.csv` (11 cols, the import file for the 🌍 tab). Dedup rule: first occurrence
  keeps the email, later same-email rows flagged `DUP_EMAIL` (411 flags). The old `Montree_Master_Outreach.xlsx`
  is untouched (history); the Jul2026 master is THE drafting source now.
- **🌍 Super-admin Global Outreach tab BUILT** (sacred rule: plan → Opus plan-audit [2 CRIT catches: the
  5th page.tsx wiring point (`valid[]` deep-link array) + duplicate-182-migration trap] → Opus build → Opus
  fresh-eyes review [1 IMPORTANT fixed: 'Unknown' country bucket was a dead-end filter in All-contacts mode]).
  Plan doc: `docs/handoffs/PLAN_GLOBAL_OUTREACH_TAB_JUL6.md`. Files: `migrations/287_disadvantaged_contact_type.sql`,
  `app/api/montree/super-admin/global-outreach/route.ts` (GET by_country/contacts/export, batch-scoped default
  `batch_tag='global-scrape-jul2026'` + All-contacts toggle), `components/montree/super-admin/GlobalOutreachTab.tsx`
  (client CSV import → existing outreach `bulk_import`; status flow → existing campaign-manager PATCH; CSV
  re-export w/ injection guard), page.tsx 5-point wiring (🌍 right after 🚀 Founding 100). ESLint 0/0, tsc clean.
  **🚨 Migration 287 must be pasted in Supabase BEFORE importing the 80 disadvantaged rows** (until then they
  fail per-row with a CHECK violation, surfaced verbatim; all other rows import fine).

### ✅ STATE AS OF JUL 7 00:30 — IMPORT DONE, TEMPLATE APPROVED, CAMPAIGN READY
- **Import VERIFIED LIVE:** Tredoux ran migration 287 + uploaded the master CSV → **6,852 inserted, 103
  DB-level duplicates, 0 errors** (6,955 attempted — exact match to prediction; 411 DUP_EMAIL skipped
  client-side before that). Tab shows 6,852 contacts · 4,343 with email · 67 countries · 75 disadvantaged.
- **✉️ TEMPLATE APPROVED (Tredoux, Jul 7) — supersedes the sacred email as the DEFAULT cold pitch** (sacred
  email kept in CLAUDE.md for reference). Subject `Montree`. Body (personalize greeting + one hook line):

  > Dear [Principal / School Name],
  >
  > A teacher takes one photo of a child working. Montree identifies the material, records the observation,
  > tracks the child's progress, and writes the parents a genuine, personal report — not a template.
  >
  > I built it because I'm an AMS-certified Montessori teacher (3–6), and the administrative weight was
  > keeping me from the children. Montree lifts it. Your teachers return to the classroom and the craft;
  > you get a complete view of every classroom and every child, with a built-in Montessori expert on hand
  > to answer any parent's question instantly.
  >
  > My passion for education started when I was about 14, when I realised how many people lack opportunity —
  > and that's not right. That's been my driving force ever since. Montree is how I act on it.
  >
  > I'm currently onboarding my first 100 founding partner schools — first month free, pricing locked for
  > life. If that's interesting, ten minutes is enough to see it.
  >
  > Kind regards,
  > Tredoux
  > Montessori teacher & founder — montree.xyz

- **Volume:** START 20/day from tredoux555@gmail.com. Ramp to 50/day ONLY after the cousin sending domain
  (Tredoux sorting this week — e.g. getmontree.com; NEVER cold-send from montree.xyz itself, it carries the
  app's parent-report email reputation) is live + warmed 2-3 weeks AND bounces stay <3%.
- **SA wave exception:** uses the HOMECOMING email from `HANDOFF_SA_FOUNDING_OUTREACH_JUL6.md`, NOT the
  template above. Gate: Hook 11 on YouTube (Tredoux, Jul 7) — verify before drafting SA.
- **Status updates each session:** try Supabase pooler first (GFW-flaky) → else drive the logged-in 🌍 tab
  via the Chrome extension → else hand Tredoux a flip list. The 🌍 tab is the scoreboard.
- **Email viability (recorded honestly):** every address SEEN (never constructed) + every domain MX-checked;
  individual mailboxes NOT SMTP-probed (impossible at scale without spam-flagging) → expect 3-8% real-world
  bounce; bounces get flagged in the tab and never retried.
- The full plan also lives as a Gmail draft in Tredoux's account: "Montree Global Campaign — the complete
  plan (Jul 6, 2026)".

### 📮 CAMPAIGN MANAGER — READY TO DRAFT (the next session's job)
1. **Deploy** (push done this session) → **run migration 287** in Supabase SQL editor (SQL also in CLAUDE.md
   session block) → open super-admin → 🌍 Global Outreach → **upload `docs/outreach/Montree_Global_Master_Jul2026.csv`**
   → expect ~6,955 imported (411 DUP_EMAIL skipped client-side, ~2,509 email-less rows imported for the record,
   80 disadvantaged tagged `disadvantaged_school`).
2. **Draft protocol unchanged (CLAUDE.md Campaign Manager section is the law):** 50 Gmail drafts/day target
   (start 30-40/day cold), the sacred Montree pitch email, per-recipient `to:DOMAIN in:sent` Gmail dedup check
   MANDATORY at draft time, **NEVER auto-send** — Tredoux reviews and sends every email.
3. **Suggested wave order (email-coverage × founding-100 fit):** SA follow-through (per
   `HANDOFF_SA_FOUNDING_OUTREACH_JUL6.md` — **Hook 11 YouTube upload: Tredoux does it Jul 7, GATE for the SA
   wave; verify it's up before drafting SA**) → Germany (489✉️) →
   Netherlands (214✉️) → Italy (289✉️) → AU/NZ (449✉️) → UK/Ireland/Canada → USA in state batches (2,340✉️ —
   the big block; CA/TX/FL/NY first) → France (206 clean) → Spain/India (heavy PRIOR_CONTACT — check flags).
   Non-EN locales: pitch is English (i18n product is 12-locale — mention it).
4. **Disadvantaged track (80 rows):** separate warm/charity message (free-tier/founding-gift angle), NOT the
   sales pitch. Draft only after the main-wave rhythm is established.
5. **Status flow lives in the 🌍 tab** (new → drafted → sent → replied/bounced → converted/dead) — same
   contract as the 📣 Campaign tab; both read `montree_outreach_contacts`.

## ✅ Session 2 result (Jul 6, evening — 8 parallel Sonnet agents)
**+1,841 rows, +466 verified emails → running total ~3,740 schools / ~2,200 emails.**
France 240 (238 ✉️, lesdecliques.com directory — Cloudflare-obfuscated emails decoded; AMF annuaire confirmed login-walled live+Wayback) · Spain 100 (74 ✉️, AME+ludus.org.es+micole.net; 🚨 Madrid Montessori's REAL email is info@madridmontessori.org — the .es that bounced Apr 2026 was a different domain) · Japan 1,122 (23 ✉️ — montessori.style all-47-prefectures via post-sitemap.xml; JP sites are form-only so NOT_FOUND is structural) · South Korea 52 (3 ✉️ — franchise HQ emails cover 112 centers; MoE registry publishes no email by design) · India 98 (97 ✉️, IMC recognized-schools + montessori-mumbai.org decoded; capped for quality) · LatAm 171 across MX/BR/AR/CL/CO/PE (13 ✉️ — FAMM mapa + melhorescola.com.br + edutory/kidstudia; needs enrichment pass) · Ireland 64→81 (70 ✉️) · UAE 49→59 (40 ✉️, uaenurseries.ae FacetWP + non-Dubai emirates) · Disadvantaged 37→68 across ~33 countries (MGGF current-grants fully processed, GlobalGiving PR/USVI/PK, Bambini in Emergenza RO).
MX pass: 312 new domains dig-checked → 6 dead flagged `MX_DEAD` in Notes (ankuraamontessorischool.com, aldananurseries.com, bambiniinemergenza.org, collegelycee-montessori-lyon.org, discoverymontessori.net, ecoledescastors.fr — no MX even via 1.1.1.1). Overlaps: 92 `PRIOR_CONTACT` flags (school domains matched at domain level; freemail matched by EXACT address only — India's 19 gmail flags are all exact prior contacts).

**New tricks proven in s2 (added to tracker playbook):** Cloudflare `/cdn-cgi/l/email-protection` decode = legitimate seen-email (France/Mumbai); WP `post-sitemap.xml` beats a WAF-blocked wp-json (Japan); FacetWP filter URLs (uaenurseries.ae). **Lessons:** 8 agents on one sandbox = constant bash contention (cap ~5 or stagger); UNQUOTED COMMAS in agent-written CSVs corrupted 6 rows and one bulk rewrite — validate width + tmp-file writes before any in-place pass.

**Carry-forward (optional enrichment, listed in tracker):** Japan ~48 English-named schools unchecked; Korea scuola.co.kr center board via bash; kidstudia.cl/.co/.pe; India pass-2 (IMF flagship page + IMC 422 member names); UAE KHDA via Dubai Pulse open data; EsF NG/ML/SN pages need a browser.


**Mission (Tredoux):** country-by-country contact lists of Montessori schools, association-first method, email priority + phone. Plus a global side-list of disadvantaged/donation-reliant Montessori schools. ~3 sessions total. **Canonical state: `docs/outreach/OUTREACH_MASTER_TRACKER.md` — read it FIRST, it has the status table, session-2 queue, and per-country source intel.**

## Session 1 result (Jul 6)
**11 country lists, ~1,900 schools, ~1,730 verified emails (~91%), all domains MX-checked.**
SA 147 · China 95 · UK 71 · Germany 501 (COMPLETE, assoc-affiliated) · Netherlands 214 (COMPLETE) · Australia+NZ 532 · Ireland 64 · UAE 49 · Canada 201 (CCMA complete) · Italy 303 (ONM registry complete) · Disadvantaged side-list 37 seeded.
All CSVs: `docs/outreach/<country>/`. Schema: `School,Email,Region,City,Phone,Website,Source,Notes` (AU/NZ + disadvantaged have a Country column too).

## 🚨 THE THREE RULES (unchanged, enforce on every wave)
1. **Emails are only recorded when actually SEEN** on directory/school site — never constructed. Missing → `NOT_FOUND` + note.
2. **Dedup:** flagged against Montree_Master_Outreach.xlsx at list time; the per-recipient `to:DOMAIN in:sent` Gmail check remains MANDATORY at draft time. NEVER auto-send.
3. **Sub-agents run on `model: "sonnet"`** (haiku for pure extraction). Fable orchestrates only.

## 🚨 Sub-agent lesson (why session 1 was expensive)
Sub-agents get the session-start snapshot of CLAUDE.md injected (~460K tokens back when it was 1MB). CLAUDE.md was archived Jul 6 → 147KB (~38K tokens), so **in a fresh session Sonnet workers now fit and boot ~90% cheaper**. Session 1's Canada+Italy were done via zero-token bash pipeline instead (curl+python in sandbox — reusable scripts described below).

## Proven extraction tricks (reuse!)
- JS directory widgets nearly always hide a bulk endpoint: WP Store Locator `admin-ajax.php?action=store_search&autoload=1` (NL), Wild Apricot `/Sys/MemberDirectory/LoadMembers` (UK), TYPO3 `eIDx=myleaflet` (Bayern), inline `einrichtungen=[...]` JSON (Montessori Deutschland), `sn-membership` `action=snm_dir_fetch` (AU), **Agile Store Locator `admin-ajax.php?action=asl_load_stores&load_all=1` (Italy ONM — 306 schools w/ email in one call)**, ASP.NET widget feed `widgets.montessori-canada.ca/.../action/SiteMap|Category` (Canada).
- German Impressum pages legally carry email — reliable fallback.
- Zero-token pipeline: curl → /tmp → python parse; print only counts. Reusable scripts (rewrite if gone): `/tmp/crawl_emails.py` (site→email, threaded), `/tmp/mxcheck.sh` (dig MX, 40-parallel).
- Sandbox: 45s per bash call → chunk crawls (~35 sites/call, 12–15 threads). Background jobs die. Some domains NXDOMAIN from sandbox resolver (montessorialliance.ie, ecoles-montessori.com) — retry via web_fetch or Chrome.

## Session 2 (NEXT) — run this
Fresh session → CLAUDE.md is slim → **spawn Sonnet agents in parallel** per the tracker's session-2 queue: France (source intel in tracker — AMF is login-walled), Spain, Japan, Korea, India (cap ~150 quality), Mexico/Argentina/LatAm, Ireland+UAE top-ups, disadvantaged wave 2 (MGGF grantees + EsF country pages). Agent prompt template = tracker "Playbook" section + the tricks above. After each wave: MX-check new domains, update tracker, flag prior-contact overlaps.

## Session 3 — USA + Africa + consolidation + 🌍 SUPER-ADMIN TAB (Tredoux-requested)
USA state-by-state (AMS members first: CA/TX/FL/NY; montessoricensus.org may have bulk data). Africa sweep (per-country assocs; big disadvantaged-list growth expected). Then: final dedup by email across all files, merge into master xlsx, and READY-TO-DRAFT handoff to the Campaign Manager protocol.

**🌍 Super-admin "Global Outreach" tab (BUILD in session 3, after final dedup — Tredoux, Jul 6):**
placed NEXT TO the 🚀 Founding 100 tab in super-admin. Spec:
- Import all `docs/outreach/*/*.csv` into `montree_outreach_contacts` (existing table + Campaign Manager integration — extend with `country`, `source`, `mx_ok` columns via migration if missing; `status='new'`, `contact_type='individual_school'`). Disadvantaged side-list rows tagged distinctly (e.g. `contact_type='disadvantaged_school'`).
- Tab UI: per-country counts (total / emailed / replied / converted), country filter, search, per-row status flow `new → drafted → sent → replied / bounced → converted / dead` (reuse Campaign Manager PATCH), CSV re-export.
- Follow the sacred build rule (plan → audit → build → fresh-eyes review). DB via Supabase pooler or paste-SQL-in-chat if GFW blocks.

**Daily send volume (guidance for Tredoux):** standing protocol = 50 Gmail drafts/day, manual send. For cold outreach deliverability from one Gmail account start at **30–40/day** and ramp to 50 if bounce/spam signals stay clean — at ~1,730+ emails that's a 6–8 week campaign; revisit a dedicated sending domain if scaling past that.

## 📋 RESUME PROMPT — SESSION 3 (paste verbatim in a fresh chat)
> Continue the global outreach program — session 3 of 3 (final). Read `docs/outreach/OUTREACH_MASTER_TRACKER.md` and `docs/handoffs/HANDOFF_GLOBAL_OUTREACH_SCRAPE.md` first. Then: (1) USA state-by-state with PARALLEL SONNET sub-agents (model:"sonnet", cap ~5 concurrent — bash contention lesson) — AMS member directory + montessoricensus.org, CA/TX/FL/NY first; (2) Africa sweep (per-country assocs + big disadvantaged-list growth expected, EsF NG/ML/SN pages need a browser); (3) final consolidation — dedup by email across ALL docs/outreach/*/*.csv, merge into the master xlsx; (4) build the 🌍 super-admin Global Outreach tab per the spec in this handoff (sacred build rule); (5) write the Campaign-Manager-ready handoff. Rules: emails only when actually SEEN — never constructed; validate CSV column-width + quote commas; MX-check all new domains via dig at the end; flag prior-contact overlaps; NEVER auto-send anything. Finish by updating the tracker, the session-3 handoff block, CLAUDE.md, and committing + pushing via Desktop Commander.

## 📋 (used) RESUME PROMPT — SESSION 2 — ✅ EXECUTED Jul 6 eve, see the session-2 block at top
