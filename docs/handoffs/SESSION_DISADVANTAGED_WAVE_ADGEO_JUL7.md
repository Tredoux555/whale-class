# SESSION — Jul 7, 2026 (Cowork/Fable orchestrating Opus builders + Sonnet workers)
# CAMPAIGN DAY 1: DISADVANTAGED FOUNDING WAVE + AD-GEO ATTRIBUTION + 🗺 GEO MATCH

**Read with:** `docs/outreach/campaign-log/2026-07-07.md` (the batch table — canonical),
`docs/handoffs/PLAN_AD_GEO_TRACKING_JUL7.md`, `docs/handoffs/PLAN_GEO_MATCH_JUL7.md`.
Commits: `fc0ab19b` (ad-geo) → `1b8ebc31` (geo match) → `952c0e91` (campaign log). All pushed, Railway deployed.

---

## 1. 🎯 STRATEGY PIVOT LOCKED (Tredoux, Jul 7) — DISADVANTAGED WAVE FIRST

The planned day-1 SA founding wave was superseded. **Disadvantaged schools go first** — easiest conversations,
authentic fit with the founder story, they validate the system and become the first voice. SA/Germany waves
follow later (SA still gated on Hook 11 YouTube upload).

**The locked offer (do not relitigate):**
- Montree **Premium (Sonnet) free for LIFE** — full system, Tredoux pays the AI.
- In exchange: testimonial + validation (invited, not owed).
- **Cohort cap: 15 admits** (email wider, admit first 15).
- Personal onboarding + 1-on-1 window: **now → 19 July**.
- **+10% monthly commission** for every school the partner signs up, for as long as that school stays a member.

**🚨 THE COMMISSION RULING (Tredoux, explicit, Jul 7):** this DELIBERATELY overrides the Jul-6
"no more ambassadors/commission, ever" rule **for this person-to-person track only**. His reasoning: in
economies where $200/mo is a salary, 10% on 2–3 Premium schools is life-changing money and real incentive
for people hustling for every dollar; it's a private offer to chosen partners, NOT a public program. The
public site stays commission-free (become-an-agent still redirects). Agent/referral infra is
hidden-not-deleted ("one uncomment away"); at this scale commission runs MANUALLY — Tredoux tracks who
brought whom, applied via super-admin. Build mechanics only when the first partner actually signs someone.

**🚨 THE TEMPLATE RULING (Tredoux, explicit, Jul 7):** the canonical disadvantaged-track email is
**Tredoux's own father-story email** (his father built a community school so children didn't walk 30km;
a new government shut it down draining funds into cars and lavish lifestyles). The government-corruption
line stays IN — his call, made twice: shared frustration with corrupt government is a **bonding moment**
with this audience, not a liability. Fable proofed for flow only. Full text = any of today's 20 Gmail
drafts, or reconstruct from campaign log. Subject: `Montree`. Contact block: WhatsApp +27 73 843 9496 ·
tredoux555@gmail.com · WeChat TredouxWillemse · FB Montree. Variant: umbrella orgs get "Your **schools**
get" (one word). **This track does NOT use the approved global default cold email** — that stays the
default for the main waves (SA homecoming email also unchanged).

## 2. 📮 DAY-1 BATCH: 20 GMAIL DRAFTS CREATED (Tredoux sends manually — NEVER auto-send)

Full table in `docs/outreach/campaign-log/2026-07-07.md`. Summary:
- **19 school-template drafts:** 4× SA (Ikhaya Labantwana/Gill, Zama/Bukelwa Selema, Indaba Institute,
  Love Trust) · Montessori for Kenya (Hillary Korir) · Olive Branch TZ · Lilima Eswatini · Peter Hesse
  Foundation Haiti · UPAVIM Guatemala · 3 Mariposas DR · Ananda Mexico · Montessori UA Ukraine · MCF
  Australia · INE Puerto Rico · Hopi School (Paulesha Sewemaenewa) · Lumin · Family Star · MCM (Nora
  Springer) · City Garden.
- **1 EsF partnership letter** → info@montessori-esf.org (the ONLY EsF-branded address found; covers
  Corner of Hope + Nomadic Samburu + East Pokot which share it). EsF = AMI's outreach arm and touches
  20 of the 80 disadvantaged rows — this letter is the top-cover play.
- **Process (worked, keep it):** Sonnet agent prepped the list from the CSVs → Fable ran per-recipient
  Gmail dedup itself (sub-agents can't see Gmail tools) → Opus batch review (FIX-FIRST: INE greeting →
  team, 4 org-variant bodies, EsF cohort-consistency line — all applied) → Fable created drafts.
- **🚨 Dedup nuance learned:** for gmail.com/webmail/yahoo recipients search `to:FULL-ADDRESS in:sent`,
  NOT to:DOMAIN — domain search on shared providers false-matches every prior recipient on that provider.
- **Excluded (do NOT cold-draft):** FAMM/marisa@ (LIVE multiplier thread since Apr — owes a tailored
  follow-up) · MMI info@mariamontessori.org (DUPLICATE — emailed Apr 10 + 19) · Bambini in Emergenza
  (MX_DEAD .org; unverified alt info@bambiniinemergenza.ro).
- **Advisory for Tredoux pre-send:** eyeball the 5 US-nonprofit drafts (commission line to grant-funded
  boards) and the 4 org-variant drafts.

## 3. 📊 THE DISADVANTAGED POOL — NUMBERS
~**91 unique** schools/orgs total: 80 on the dedicated list (~38 countries) + ~11 non-duplicate
DISADVANTAGED-flagged extras in the Africa CSVs. **34 have emails** → 20 drafted, ~10 in day-2 queue
(list in campaign log), 3 excluded, 1 (Bambini) pending alt-address verification. **~57 have NO email**
(incl. strong candidates: AIMPO Rwanda, Cypress Junction USA) → an email-enrichment Sonnet pass is the
next pool-widening lever. DB 🌍 tab shows 75 disadvantaged (import dedup).

## 4. 🛠 BUILDS (both via sacred flow: Fable plan → Opus plan-audit → Opus build → Opus fresh-eyes → push)

**A. Ad-geo attribution tracking (`fc0ab19b`)** — plan: PLAN_AD_GEO_TRACKING_JUL7.md.
UTM capture (VisitorTracker parses location.search — deliberately NOT useSearchParams, avoids Suspense);
first-touch `montree_attrib` cookie (90d, set only if absent); attribution stamped on `montree_schools`
at BOTH signup routes (fire-and-forget, 42703-safe pre-migration; register also gained signup_country
parity); track route prefers `cf-ipcountry`; 🎯 Funnel view in VisitorsTab (country × source →
visits/signups/trials + conv%). New: lib/montree/attribution.ts, lib/montree/outreach/stamp-attribution.ts,
super-admin/traffic-funnel/route.ts, migrations/288.
**⏳ MIGRATION 288 PENDING Tredoux's Supabase run** (purely additive utm_* + attrib_* columns; site safe
either way). **RULE: every FB ad URL must carry `?utm_source=facebook&utm_campaign=<name>` — without UTM,
ad traffic is indistinguishable from the 4,223 cold-email clicks.**

**B. 🗺 Geo Match view (`1b8ebc31`)** — plan: PLAN_GEO_MATCH_JUL7.md (Tredoux's real ask: visitor
towns laid against the outreach list to plan email waves). Super-admin → Visitors → 🗺 Geo Match:
locations ranked by visits, expandable to that country's outreach schools with status chips, 🔥 warm
(school emailed AND visit after sent_date) + 📍 town-hot badges, days/country/only-with-schools filters.
Design rulings that must survive: **country-level join only** (ip-api city = ISP/datacenter city; city is
a soft badge, never a filter); visitor `country_code` → contact label via hardcoded ~25-country map;
contacts fetched paginated (.range loop — fresh-eyes caught USA's 3,198 rows silently truncating at the
1000-row default; the sacred flow's real catch of the day). No migration, no PII in UI.

## 5. ⏳ OWED / NEXT SESSION
1. **Tredoux:** run migration 288 (SQL in chat + migrations/288_ad_geo_attribution.sql) · review + SEND
   the 20 drafts · reply to WhatsApp/email responses.
2. **Status flips:** 20 rows → `drafted` in `montree_outreach_contacts` (pooler GFW-blocked all day —
   drive the 🌍 tab via Chrome extension, or pooler if reachable). Flip to `sent` as he sends.
3. **Day 2:** draft the ~10 queued (incl. Crossway, Way Home, Seametrey, Kadrioru, 5 Africa extras) +
   verify Bambini alt address + FAMM tailored follow-up (multiplier, pricing/AMI questions pending since
   Apr — she's also EsF Argentina).
4. **Enrichment pass:** Sonnet agents hunt emails for the ~57 no-email disadvantaged rows.
5. **Verify live:** 🎯 Funnel + 🗺 Geo Match render on prod; utm cookie test
   (montree.xyz/montree?utm_source=facebook&utm_campaign=test).
6. **Later:** FB ads setup (UTM discipline above; watch 🎯/🗺 to aim geos); commission mechanics when
   the first partner signs a school; day-5/day-10 follow-ups for today's batch (due ~Jul 12/17 — before
   the Jul 19 window closes).

## RESUME PROMPT (paste to start next session)
"Campaign day 2. Read CLAUDE.md top session block + docs/handoffs/SESSION_DISADVANTAGED_WAVE_ADGEO_JUL7.md
+ docs/outreach/campaign-log/2026-07-07.md. Then: (1) Gmail sweep — replies/bounces on the disadvantaged
wave, draft replies (father-story track, warm, push to WhatsApp/onboarding call); (2) draft the day-2
queue (~10, same template + mandatory full-address dedup); (3) status flips for day-1+2 (pooler first,
else Chrome-drive the 🌍 tab); (4) launch the Sonnet email-enrichment pass on the ~57 no-email
disadvantaged rows; (5) FAMM tailored follow-up for my approval. Fable orchestrates, Sonnet works, Opus
reviews. Never auto-send."
