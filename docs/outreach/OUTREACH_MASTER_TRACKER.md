# Global Outreach — Country List Tracker

**Method (locked):** Association-first. Per country: find the national Montessori association member directory → extract members → email (priority) + phone from directory/school sites → CSV. Emails are only recorded when actually seen — never constructed. Schema: `School,Email,Region,City,Phone,Website,Source,Notes`. Output: `docs/outreach/<country>/<Country>_Montessori_Schools.csv`.

**Standing rules:**
- Dedup at list time against `Montree_Master_Outreach.xlsx`; rows already contacted get `ALREADY_CONTACTED` in Notes.
- The mandatory `to:DOMAIN in:sent` Gmail check still applies per-recipient at DRAFT time (CLAUDE.md Session 46/50 rule).
- Some rows share one email (school boards / multi-site orgs) — dedupe by email when drafting.

## Status

| Country | Status | Rows | Real emails | Source(s) | File | Date |
|---|---|---|---|---|---|---|
| South Africa | ✅ Done (pre-wave) | 147 | 147 | SAMA member directory | `south-africa/Montessori Schools South Africa.csv` | Jul 6 2026 |
| China | ✅ Done (coded system) | 95 | partial | Researched (CN-XXXX codes, montree_outreach_schools) | `China_Outreach_Emails_Jul2026.xlsx` | Jul 3 2026 |
| United Kingdom | ✅ Wave 1 | 71 | 70 | Montessori Society AMI UK (full) + STAR/MEAB-successor accredited (full) | `united-kingdom/UK_Montessori_Schools.csv` | Jul 6 2026 |
| Germany | ✅ COMPLETE (assoc-affiliated exhausted) | 501 | ~489 | LV Bayern + LV NRW + Montessori Deutschland central registry (10 Bundesländer) + LV Thüringen + LV Sachsen + Aachen + LV Berlin-BB | `germany/Germany_Montessori_Schools.csv` | Jul 6 2026 |
| Netherlands | ✅ COMPLETE | 214 | 214 | NMV directory (entire directory, 100% email/phone) | `netherlands/Netherlands_Montessori_Schools.csv` | Jul 6 2026 |
| Australia + NZ | ✅ COMPLETE | 532 (416 AU + 116 NZ) | 449 | Montessori Australia member directory (full JSON) + MANZ (all 10 pages, 100% NZ email) | `australia-nz/Australia_NZ_Montessori_Schools.csv` | Jul 6 2026 |
| Ireland | ✅ Wave 3 (topped up) | 81 | 70 | SMSI (56) + Dublin web-verified + s2 top-up: AMI Ireland jobs page + per-county sweeps (Galway/Kerry/Donegal/Mayo/Clare/…). Montessori Alliance domain DEAD. Ardtona DO-NOT-EMAIL | `ireland/Ireland_Montessori_Schools.csv` | Jul 6 2026 |
| UAE | ✅ Wave 3 (topped up) | 59 | 40 | Edarabia filter + Redwood/Kids First + s2 top-up: uaenurseries.ae FacetWP montessori filter + non-Dubai emirates (Sharjah/Ajman/RAK/AD/UAQ). KHDA SPA STILL untapped (needs bash/browser) | `uae/UAE_Montessori_Schools.csv` | Jul 6 2026 |
| 🌍 Disadvantaged (side-list, global) | ✅ Wave 3 done | 80 (~38 countries) | 29 | Waves 1-2 + s3: GlobalGiving Eswatini/Ukraine retries SUCCEEDED (Vusumnotfo; Odessa Way Home fund@wayhome.org.ua), EsF pages fetched directly (NOT JS-walled after all — East Pokot + Corner of Hope full text), Cambodia/Philippines/VN/LatAm NGOs. +13 DISADVANTAGED-flagged rows also live in the Africa CSVs | `disadvantaged/Disadvantaged_Montessori_Schools.csv` | Jul 6 2026 |
| France | ✅ COMPLETE (single-directory ceiling) | 240 | 238 | lesdecliques.com 251-school directory (Cloudflare-obfuscated emails decoded — real emails on page) + 2 own-site fills. AMF annuaire confirmed login-walled (live + Wayback); ecoles-montessori.com NXDOMAIN everywhere. Incl. 22 DOM/COM overseas rows | `france/France_Montessori_Schools.csv` | Jul 6 2026 |
| Spain | ✅ Done | 100 | 74 | AME colegios (22) + ludus.org.es pedagogy filter (40) + micole.net aggregator + per-region sweeps. 🚨 Madrid Montessori real email = info@madridmontessori.org (.es bounced Apr 2026 — different domain) | `spain/Spain_Montessori_Schools.csv` | Jul 6 2026 |
| Japan | ✅ Directory-COMPLETE, email-thin by culture | 1,122 | 23 | montessori.style aggregator — all 47 prefecture pages via post-sitemap.xml (wp-json WAF-blocked). JP childcare sites are contact-form/phone-only → NOT_FOUND is structural. Email enrichment ROI: ~48 English/bilingual-named schools unchecked | `japan/Japan_Montessori_Schools.csv` | Jul 6 2026 |
| South Korea | ✅ Done (registries publish no email, by design) | 52 | 3 | Scuola (70-center) + MamaMonte (42-center) franchise HQ emails + MoE e-childschoolinfo registry + AMI Korea + Busan/regional sweeps. Bash was down — scuola.co.kr bo_table=center board unmined (+60-90 phone-only branches possible) | `south-korea/South_Korea_Montessori_Schools.csv` | Jul 6 2026 |
| India | ✅ Wave 1 (quality-capped) | 98 | 97 | IMC recognized-schools directory (~37 w/ contact cards) + RTI montessori-mumbai.org (~25, Cloudflare-decoded) + city sweeps (BLR/MUM/CHE/HYD/PUN/NCR). IMF flagship page + IMC 422-name member list = next-pass sources. 3 ALREADY_CONTACTED flagged | `india/India_Montessori_Schools.csv` | Jul 6 2026 |
| LatAm (MX 75 · BR 61 · AR 18 · CO 7 · CL 6 · PE 4) | ✅ Wave 1 (email-thin — needs enrichment pass) | 171 | 13 | FAMM mapa-montessori (AR + regional) + melhorescola.com.br (BR) + edutory.mx + kidstudia city pages (MX). omb.org.br JS-dead. kidstudia.cl/.co/.pe exist for wave 2 | `latam/LatAm_Montessori_Schools.csv` | Jul 6 2026 |
| Canada | ✅ COMPLETE (CCMA members) | 201 | 175 | Montessori Canada (CCMA) widget directory — hidden .ashx feed at widgets.montessori-canada.ca (SiteMap action → 201 listing pages) + own-site gap crawl | `canada/Canada_Montessori_Schools.csv` | Jul 6 2026 |
| Italy | ✅ COMPLETE (ONM registry) | 303 | 289 | Opera Nazionale Montessori "Trova Scuola" — Agile Store Locator dump: `admin-ajax.php?action=asl_load_stores&load_all=1` (email+phone first-party) | `italy/Italy_Montessori_Schools.csv` | Jul 6 2026 |
| 🇺🇸 USA | ✅ COMPLETE (census national) | 3,198 | 2,340 (73%) | montessoricensus.org — ENTIRE census inline in homepage map JS (3,198 markers w/ name/city/state/website) → all 3,198 detail pages crawled (leader/contact emails, 63% hit) → 754 school-site crawls for the gap (+327). AMS directory = structurally NO emails (WP paginated HTML, deliberately withheld — 40-row sample in `usa/AMS_Member_Schools.csv`, deprioritized) | `usa/USA_Montessori_Schools.csv` | Jul 6 2026 |
| 🌍 Africa (3 files, ~20 countries) | ✅ Wave 1 + top-up | 196 | ~97 | Per-country assoc/directory sweeps via 3 Sonnet agents: East/South 79 (KE/UG/ZW/ZM/TZ/RW/BW/ET/NA/EG/MA), West/North 43 (NG/GH/SN/ML/CI + MU/SC/MG), Top-up 74 (MA/KE-secondary/EG/ET/TN/DZ). Kisumu + Jinja = genuine Montessori-brand gaps (verified against full local directories). 13 DISADVANTAGED flags feed the side-list | `africa/Africa_{East_South,West_North,Topup}_Montessori_Schools.csv` | Jul 6 2026 |

**🏁 FINAL (session 3, Jul 6 night): 7,366 rows · 67 countries · 4,857 email rows · 4,446 UNIQUE emails · 4,223 draft-ready (clean school rows: email, no dup, no prior-contact, no MX_DEAD) · 80 disadvantaged. Consolidated master: `Montree_Global_Master_Jul2026.xlsx` (Summary + All Schools + Draft Queue + Disadvantaged sheets) + `Montree_Global_Master_Jul2026.csv` (single import file for the 🌍 super-admin tab). All 1,549 s3 domains MX-checked (4 dead: ami-tanzania.ac.tz, arrismontessori.com, bambiniinemergenza.org, rosehillmontessori.org). PRIOR_CONTACT flags: 209 total across all files. The scrape program is COMPLETE — next phase is Campaign Manager drafting (see handoff §Session 3).**

**Session-2 delta (Jul 6 eve): +1,841 rows, +466 verified emails across 6 new countries + 3 top-ups. Note the shape: France/India are email-rich (99%); Japan/Korea/LatAm are directory-rich but email-thin (form-culture / registries omit email) — those three are enrichment targets, not failures.**

## Expansion backlog (in priority order)

**⚠️ SUB-AGENT MODEL RULE (Jul 6): spawn list-building agents with `model: "sonnet"` (or haiku for pure extraction) — NOT the default (inherits Fable and burns premium weekly quota). Extraction work doesn't need Fable.**

**SESSION PLAN (Tredoux, Jul 6): the globe in ~3 sessions — ✅ ALL 3 DONE.** Session 1: tier-1 + Canada/Italy. Session 2: FR/ES/JP/KR/IN/LatAm + top-ups. Session 3 (Jul 6 night, DONE): USA 3,198 + Africa 196 + disadvantaged wave 3 + final consolidation + 🌍 super-admin Global Outreach tab BUILT. Handoff: `docs/handoffs/HANDOFF_GLOBAL_OUTREACH_SCRAPE.md` §Session 3.

| Item (session 3 queue) | Est. size | Primary source | Notes |
|---|---|---|---|
| USA | 3,000+ | AMS member directory + montessoricensus.org (bulk data?) — segment CA/TX/FL/NY first | Own biggest block; parallel Sonnet agents per state cluster |
| Africa sweep | ? | Per-country assocs (SAMA done) + disadvantaged NGO overlap | Kenya/Nigeria/Egypt/Ghana; feeds the disadvantaged list heavily |
| Final consolidation | — | Dedup by email across ALL `docs/outreach/*/*.csv` + merge into master xlsx | Then Campaign Manager drafting begins |
| 🌍 Super-admin Global Outreach tab | — | Spec in handoff §Session 3 | Import CSVs → montree_outreach_contacts; build AFTER final dedup |
| Ukraine | ? | Organic signal (Тамі signup) | uk locale live |
| OPTIONAL enrichment backlog | — | Japan: ~48 English-named schools unchecked + Frontierkids/ICE chains. Korea: scuola.co.kr bo_table=center board (bash). LatAm: kidstudia.cl/.co/.pe + remaining MX cities. India pass 2: IMF flagship page + IMC 422-name member list. UAE: KHDA via Dubai Pulse open data. EsF NG/ML/SN project pages (browser-rendered) | Only if list needs deepening after USA |

## Playbook for the next wave (copy for sub-agents)

1. Phase A scout: verify the association directory exists + is extractable (check for AJAX/JSON endpoints behind JS map widgets — WP Store Locator, Wild Apricot `/Sys/MemberDirectory/LoadMembers`, TYPO3 myleaflet, Agile Store Locator `asl_load_stores&load_all=1`, FacetWP filters all yielded full dumps in waves 1-2). WordPress sites: try `post-sitemap.xml` when wp-json is WAF-blocked (cracked Japan's 47 prefecture pages).
2. Phase B extract: directory rows first; only visit school sites when the directory lacks emails. German Impressum pages are a reliable fallback. **Cloudflare-obfuscated emails (`/cdn-cgi/l/email-protection#<hex>`) are REAL emails on the page — decode them (XOR against leading byte); this is seeing, not constructing** (unlocked France 238 + Mumbai 25).
3. Never construct emails. `NOT_FOUND` + note instead. Contact-form-only sites (structural in Japan/Korea) = legitimate NOT_FOUND.
4. Save CSV incrementally every ~25 rows. **QUOTE any field containing commas** — 5 unquoted-comma rows corrupted parsing in s2 (UAE ×4, KR ×1, disadvantaged ×1) and one killed a rewrite mid-stream. Post-wave: validate every CSV with python csv (all rows = header width) BEFORE any bulk rewrite, and always write to .tmp + os.replace.
5. Report: sources, rows, email coverage, remainder estimate, obstacles.
6. ⚠️ Parallel-agent note: 8 agents sharing one sandbox caused constant bash "process already running" contention — agents that fell back to WebSearch+web_fetch still delivered. Next time cap at ~5 concurrent or stagger bash-heavy work.
