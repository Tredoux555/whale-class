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
| Ireland | ✅ Wave 2 | 64 | 61 | SMSI member list (56) + web-verified Dublin schools. Montessori Alliance domain DEAD. Ardtona flagged DO-NOT-EMAIL | `ireland/Ireland_Montessori_Schools.csv` | Jul 6 2026 |
| UAE | ✅ Wave 2 | 49 | 33 | Edarabia Montessori filter → own-site emails + Redwood/Kids First 15 branches. KHDA SPA untapped | `uae/UAE_Montessori_Schools.csv` | Jul 6 2026 |
| 🌍 Disadvantaged (side-list, global) | 🔄 Seeded — grows per region | 37 (20 countries) | 23 | MGGF grant lists + EsF projects + NGO sites. Best future sources: MGGF grantees (~10 unprocessed), EsF country pages (CO/NG/LB/AF/PH/SN/ML/RO/MG), Montessori for Kenya umbrella | `disadvantaged/Disadvantaged_Montessori_Schools.csv` | Jul 6 2026 |
| Canada | ✅ COMPLETE (CCMA members) | 201 | 175 | Montessori Canada (CCMA) widget directory — hidden .ashx feed at widgets.montessori-canada.ca (SiteMap action → 201 listing pages) + own-site gap crawl | `canada/Canada_Montessori_Schools.csv` | Jul 6 2026 |
| Italy | ✅ COMPLETE (ONM registry) | 303 | 289 | Opera Nazionale Montessori "Trova Scuola" — Agile Store Locator dump: `admin-ajax.php?action=asl_load_stores&load_all=1` (email+phone first-party) | `italy/Italy_Montessori_Schools.csv` | Jul 6 2026 |

**Running total: ~1,900 schools listed, ~1,730 with verified emails. All email domains MX-checked Jul 6 (dead domains flagged in Notes). Prior-campaign overlaps flagged in Notes.**

## Expansion backlog (in priority order)

**⚠️ SUB-AGENT MODEL RULE (Jul 6): spawn list-building agents with `model: "sonnet"` (or haiku for pure extraction) — NOT the default (inherits Fable and burns premium weekly quota). Extraction work doesn't need Fable.**

**SESSION PLAN (Tredoux, Jul 6): the globe in ~3 sessions.** Session 1 (Jul 6, done): tier-1 + Canada/Italy via bash pipeline. **Session 2 (NEXT — fresh session, slim CLAUDE.md, Sonnet sub-agents now WORK):** France + Spain + Japan + Korea + India + Mexico/Argentina + Ireland/UAE top-ups + disadvantaged wave 2. **Session 3:** USA (state-by-state, AMS + montessoricensus.org) + Africa sweep + remaining Asia + final consolidation. Handoff: `docs/handoffs/HANDOFF_GLOBAL_OUTREACH_SCRAPE.md`.

| Country (session 2 queue) | Est. size | Primary source | Notes |
|---|---|---|---|
| France | ~200 | 🚨 AMF annuaire (page/198700) is LOGIN-WALLED; charte-qualité page has only ~7. Try: Wayback of page/198700 (was 429-limited Jul 6), ecoles-montessori.com aggregator (DNS-dead from sandbox Jul 6 — try web_fetch/Chrome), Public Montessori France | fr locale live |
| Spain | 100+ | No strong national assoc list — try AME (asociacionmontessori.net) + aggregators | es locale live |
| Japan | 100+ | 日本モンテッソーリ協会 (JAM) + AMI Japan affiliates | ja locale live |
| South Korea | 50+ | AMI Korea / KMA | ko locale live |
| India | 1,000+ | Fragmented: Indian Montessori Foundation, IMTC, city directories — cap at quality ~150 | Existing hot leads; price-sensitive |
| Mexico + Argentina + LatAm | 100+ | FAMM (AR, warm multiplier contact) + national assocs | es locale live |
| Ireland top-up | +20–40 | AMI Ireland (AATI) affiliated schools at montessori-ami.org | SMSI done |
| UAE top-up | +30–60 | KHDA SPA (needs Chrome-driven extraction) | Edarabia done |
| Disadvantaged wave 2 | +30–60 | MGGF unprocessed grantees + EsF country pages + GlobalGiving | Side-list grows with each region |
| USA (session 3) | 3,000+ | AMS member directory + montessoricensus.org (segment by state: CA, TX, FL, NY first) | Own session |
| Africa sweep (session 3) | ? | Per-country assocs (SAMA done) + disadvantaged NGO overlap | Kenya/Nigeria/Egypt/Ghana |
| Italy | 200+ | Opera Nazionale Montessori | it locale live |
| France | ~200 | Association Montessori de France | fr locale live |
| Japan / Korea | 100+ each | National Montessori associations | ja/ko locales live |
| Spain / Mexico / Argentina | ? | FAMM (Argentina) relationship + national associations | es locale live; FAMM is a multiplier lead |
| India | 1,000+ | Fragmented — IMF, city directories | Price-sensitive; existing hot leads |
| Ukraine | ? | Organic signal (Тамі signup) | uk locale live |

## Playbook for the next wave (copy for sub-agents)

1. Phase A scout: verify the association directory exists + is extractable (check for AJAX/JSON endpoints behind JS map widgets — WP Store Locator, Wild Apricot `/Sys/MemberDirectory/LoadMembers`, TYPO3 myleaflet all yielded full JSON dumps in wave 1).
2. Phase B extract: directory rows first; only visit school sites when the directory lacks emails. German Impressum pages are a reliable fallback.
3. Never construct emails. `NOT_FOUND` + note instead.
4. Save CSV incrementally every ~25 rows.
5. Report: sources, rows, email coverage, remainder estimate, obstacles.
