# SESSION — Jul 7, 2026 (afternoon, Cowork/Fable orchestrating) — FACEBOOK PIVOT: GLOBAL FB SWEEP (2,719 pages, 1 session) + SOCIAL TRACKER + 12 WARM/FAMM DRAFTS + BOUNCE RECOVERY

**Commits:** `294fac99` (social tracker: migration 289 + set_social + 📘 view + disadvantaged FB CSVs) →
`39743daf` (31 agent batches + script pass + merged file + social_enrich) → `a028edd3` (script pass
complete, final merge) → `a83c4711` (🤲 Disadvantaged filter) → [this session's last: by-country collapse + this handoff].
**Migration 289 RUN by Tredoux (confirmed live).** Migration 288 (ad-geo, from the morning session) — check whether still pending.

---

## 🎯 THE STRATEGIC PIVOT (Tredoux, this session — treat as standing)

**Facebook is now the PRIMARY outreach channel.** One platform = communication + social proof +
page-boost marketing. Video promotions ≠ the tool; email = hit-and-miss (runs in parallel, fine).
Order: **disadvantaged schools first (build the base) → then up the list.** The 🌍 tab's social
layer is the invite tracker, mirroring the email status flow.

**⚠️ FB anti-spam pacing rule (told to Tredoux): 20–30 invites/DMs per day from the Montree page,
vary message text, no links in the first message — or the page gets restricted.**

---

## 1. FACEBOOK DISCOVERY — WHERE IT STANDS (the big win)

| Segment | Processed | FB found | Method |
|---|---|---|---|
| Disadvantaged no-email (59 schools) | ALL | 38 | 2 Sonnet agents → `disadvantaged-facebook-{A,B}.csv` |
| No-email + no-website (~1,804 rows) | ALL | ~958 (53%) | 31 Sonnet batches → `global-noweb-{1..31}.csv` |
| Websited rows (4,564) | ALL | 1,906 (42%) | **zero-AI script** `scripts/social-script-pass.py` (ran on the Mac via caffeinate/nohup) |
| **MERGED, import-ready** | **2,926 rows** | **2,719 with facebook_url** | `scripts/social-merge.py` → `docs/outreach/social/global-social-merged.csv` |

- **Import**: 🌍 tab → Import CSV → `global-social-merged.csv`. The discovery header
  (`school_name`+`facebook_url`) is auto-detected → routes to `social_enrich` (chunks of 400) which
  **UPDATES existing rows by org_name+country match** — never duplicates, never blanks, never
  downgrades a status. Idempotent; re-import any time. ⏳ VERIFY Tredoux completed this import and
  note the matched/updated/unmatched counts (unmatched list prints in the import log).
- **Files**: per-batch CSVs + merged file + both scripts are committed under `docs/outreach/social/`
  + `scripts/`. Header: `school_name,country,facebook_url,fb_activity,instagram_url,linkedin_url,x_url,email_found_incidentally,confidence,notes`.
- **Pipeline lessons (RULES for session 2):**
  - Launching 8 Sonnet agents at once → server-side burst rate-limit killed 7. **Groups of 4 works.**
  - **55 schools/agent** ≈ 90–175K subagent tokens. Don't go bigger.
  - Judge from SEARCH SNIPPETS; never fetch facebook.com (bot-walled).
  - Agents reply COUNTS ONLY (protects orchestrator context across 30+ batches).
  - Script-first economics: the school's own homepage is the FB directory. 42% pure-script hit rate.
  - Hit rates: US/LatAm ~70-75%, global avg ~53% on searchable rows, Japan ~25-40% (tiny kindergartens).
- **⏳ SESSION 2 QUEUE (FB sweep — one session should close it):**
  1. **~440 agent-searchable leftovers**: no-email rows whose website crawl found NO facebook link.
     Compute: master rows with Website + empty Email, minus schools present in `global-script-pass.csv`
     with a facebook_url. Same batch pattern (55/agent, groups of 4).
  2. **Verification pass over ~600 medium-confidence URLs** before bulk-inviting (Sonnet, snippets only,
     flag mismatches → set social_notes).
  3. Enrich-import the new CSVs + re-run `scripts/social-merge.py`.
  4. Optional session 3: FB for schools that already have emails but script missed them (lowest priority).

## 2. SOCIAL INVITE TRACKING (built + live)

- **Migration 289 RUN**: `facebook_url/instagram_url/linkedin_url/x_url`, `social_status`
  (none→found→invited→messaged→replied→connected / dead), `social_invited_at/replied_at`, `social_notes`,
  2 partial indexes on `montree_outreach_contacts`.
- **API** (`global-outreach/route.ts`): PATCH `set_social` (validated ladder, stamps timestamps on first
  transition), GET `?view=social_counts`, contacts GET `social=1`/`social_status=`/`disadvantaged=1`.
  PATCH `social_enrich` (≤500 rows/call; exact org_name+country match, ilike fallback, escaped; updates
  only non-empty; appends notes; fills missing email from discovery). All 42703-safe.
- **UI** (`GlobalOutreachTab.tsx`): 👥 Contacts / **📘 Social** toggle at the top of the contacts card +
  counter strip + clickable FB/IG/in/X links + tap-to-advance status + **🤲 Disadvantaged** filter pill
  (works in both views) + **🌏 By country now collapses** (default collapsed — the browser sits high).
- **Email and social are independent axes** — a row can be `sent` (email) and `messaged` (FB) at once.
  Don't merge them.

## 3. THE 12 GMAIL DRAFTS (Fable-written, this session — Tredoux sends manually)

FAMM/Marisa (reply, cc info@ — founding cohort offer, her projects named, WhatsApp block;
**⚠️ referral share left vague on purpose: Apr-19 email promised 20% for life, new track pays 10% —
TREDOUX MUST DECIDE before FAMM signs anyone**) · erik@lovetrust.co.za (bounce-recovered CEO —
canonical father-story template, fixed the mangled montree.xyz link) · Cambridge Montessori Global/Manish ·
Paint Pots/Jessica (3 settings) · IMS Copenhagen/Karin (may have changed roles — draft is safe either way) ·
Lions Gate/Ingrid (**Canada**, not USA) · Otari/Clifford (back from sabbatical) · Montessori Norge/Nina
(85 schools + 38 kindergartens, association partnership) · I Cube (Erdkinder continuum) · Meraki ·
Remuera/Shenali · Prerana (identity ambiguous — kept generic).
**Dead/skip:** Montessori CH declined May 10 ("we don't suggest tools") — mark dead. Zama Montessori:
no email, no FB; phone only 083 403 8203 / via SAMA.
**Pacing:** morning's 20 cold + these 12 = 32 in drafts. 20/day cap — cold 20 + FAMM + Love Trust day 1,
the 10 thread-reply follow-ups day 2. **⚠️ Check the other 19 morning drafts for the mangled
google-redirect montree.xyz link found in the Love Trust copy.**

## 4. BOUNCE RECOVERY (Opus research, MX-verified, emails SEEN on pages — ready to use)

**Tier 1 (disadvantaged wave):** Love Trust → **erik@lovetrust.co.za** (CEO Erik van den Top; also
charmaineg@) — DRAFTED. Zama → none (phone only).
**Tier 2 multipliers (16/21 recovered):** DMG → andrea.donath@deutsche-montessori-gesellschaft.de ·
MSCA AU → admin@msca.edu.au · AMI-training DE → vorstand@montessori-ami-edu.de · Prague →
courses@amiprague.cz · Montessori Ed Ireland → info@montessorieducationireland.ie · Montessori Society
AMI UK → contact@montessorisociety.org.uk · Leicester Montessori Group → lr@montessorigroup.com ·
AME Spain → info@asociacionmontessori.net · AMCHI Chile → info@montessorichile.org · Montessori Center
Korea → montessori-center@naver.com · KMI Korea → amileee@naver.com · FEMCO Colombia →
info@montessoricolombia.org · AMITOMO JP → amitomo@arion.ocn.ne.jp · IEMMP PT →
office@montessoriportugal.org · IMA PL → office@ima.org.pl · IMTC/IMS Brussels →
schools@international-montessori.org. NOT_FOUND: Montessori Education UK (form-only), MEC Ireland
(dead), montessori.org.uk (JS-hidden, domain live — retry original).
**Tier 3 (~55 school replacements found)** — full table lives in this session's chat; top usable ones:
MMI UK → info@mariamontessori.org · Little Explorers LK → littleexplorersmontessori2020@gmail.com ·
Sharanalaya → info@sharanalayaschool.com · STIMS→Montessori Mondial kungsholmen@montessorimondial.se ·
Madrid Montessori → info@madridmontessori.org (known) · retry-transients: appletonschool.ac.ke,
baantonmai.ac.th, montessori-schule-berlin.de, kairosmontessori.com (admissions@), sakuramontessori.edu.vn.
Flags: Rose House UK = CLOSED per Ofsted; QAIS = DEFUNCT; montessori-sevilla replacement has NULL MX.
**⏳ Session-2 chore:** mark these bounced in the DB + draft the multiplier re-sends (dedup rule:
`to:FULL-ADDRESS in:sent` per recipient, never to:DOMAIN).

## 5. WARM-LEAD INTEL SNAPSHOTS (Sonnet, for future personalization)

FAMM: 8 social projects live (Crianza Juntos 9 UDIs · Pata Pila/Wichi Yacuy · Construyendo Sueños
prison workshop · Familias a la Escuela), 2026 AMI assistant courses in 4 AR cities + Brazil/Paraguay
expansion — org thriving. Marisa = "Maria Isabel Canova", cofundadora, husband Alejandro Sioli is board
president. Cambridge MG = franchise preschool chain, many "Opening Soon" Delhi-NCR centres (NOT an
elite K-12 network). Paint Pots = 3 boutique settings. Otari: Clifford Wicks back, 23-yr tenure.
Norge: 85 schools + 38 kindergartens (Jan 2025 figures), new-læreplan Montessori recognition is topical.

## 6. RESUME PROMPT (paste to start session 2)

```
FB sweep session 2 + campaign day 2. Read docs/handoffs/SESSION_FB_SWEEP_WARMLEADS_JUL7.md FIRST — it has the queue and the pipeline rules (Sonnet batches of 55, groups of 4 max, snippets only, counts-only replies).
1. FB sweep: (a) compute the ~440 no-email websited rows whose crawl found no FB link (master minus global-script-pass.csv hits) and run Sonnet batches on them; (b) verification pass over medium-confidence URLs; (c) re-merge (scripts/social-merge.py via Desktop Commander) and confirm the 🌍 enrich-import.
2. Campaign manager routine: check Gmail replies + bounces on the sent batch; verify the 12 follow-up drafts went out; draft day-2 disadvantaged emails (~10 emailable left); flip statuses in the 🌍 tab; fix the mangled montree.xyz link in any unsent morning drafts.
3. Bounce re-sends: draft to the 16 recovered multiplier addresses (handoff §4) with per-recipient to:FULL-ADDRESS in:sent dedup.
4. Owed checks: migration 288 run?, FAMM commission decision (20% grandfathered vs 10%), verify 🎯 Funnel + 🗺 Geo Match live, FB invite tracking started (🤲+📘 in 🌍 tab).
Lean on Sonnet for grunt work, Opus for builds; Fable orchestrates and writes anything user-facing.
```
