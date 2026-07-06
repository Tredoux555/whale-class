# HANDOFF — Global Montessori Outreach Scrape (Session 1 done Jul 6, 2026)

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

## Session 3 — USA + Africa + consolidation
USA state-by-state (AMS members first: CA/TX/FL/NY; montessoricensus.org may have bulk data). Africa sweep (per-country assocs; big disadvantaged-list growth expected). Then: final dedup by email across all files, merge into master xlsx, and READY-TO-DRAFT handoff to the Campaign Manager protocol (50 Gmail drafts/day, Tredoux sends manually).
