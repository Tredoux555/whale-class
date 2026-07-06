# HANDOFF — Global Montessori Outreach Scrape (Sessions 1+2 done Jul 6, 2026)

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
