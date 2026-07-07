# SESSION — Jul 7, 2026 (evening, Cowork/Fable orchestrating Sonnet) — FB SWEEP SESSION 2 (leftovers + verification, sweep COMPLETE) + CAMPAIGN DAY 2 (9 disadvantaged + 16 multiplier re-sends + 4 link-fixed drafts)

Continues `SESSION_FB_SWEEP_WARMLEADS_JUL7.md` (read that for pipeline rules). No code, no migrations — data + Gmail drafts + one merge-script extension.

---

## 1. FB SWEEP — SESSION 2 CLOSED THE QUEUE

- **Leftover computation:** master no-email+real-website rows = 707; minus merged-file FB hits = **430 leftovers** (US 269, AU 38, KR 35…). Note: master "no email" = `Email='not_found'` (never blank), "no website" includes `NOT_FOUND`/`NotApplicableSAMA*` placeholders — filter on those, not empty strings.
- **8 Sonnet batches (2 groups of 4): 325 FB found / 422 processed (77%).** Files: `docs/outreach/social/global-leftover-{1..8}.csv`.
- **Verification pass over ALL 346 medium-confidence URLs (7 Sonnet batches): 313 OK, 8 fixed, 21 failed** → `verify-medium-{1..7}.csv` (only problem rows; `VERIFY-FIX: was <old>` / `VERIFY-FAIL: <reason>` in notes).
- **`scripts/social-merge.py` extended twice:** (a) globs `global-leftover-*.csv`; (b) applies `verify-medium-*.csv` as a FINAL OVERRIDE layer (FIX replaces facebook_url, FAIL blanks it, both append notes — deliberately bypasses the "non-empty wins" rule, don't "simplify" that away).
- **FINAL MERGED FILE: `docs/outreach/social/global-social-merged.csv` — 3,263 rows, 3,035 real facebook_urls** (was 2,719). 9 legacy rows carry literal "NONE" placeholders (pre-existing, from disadvantaged-facebook-B + global-noweb-12).
- **⏳ TREDOUX: re-import the merged CSV in the 🌍 tab** (Import CSV → auto-detects discovery header → `social_enrich`; idempotent, safe to re-run; VERIFY-FAIL rows can't blank DB urls — enrich only writes non-empty — but their notes land, so check social_notes before inviting).
- Optional session 3 remains: FB for schools that already have emails but the script missed (lowest priority).

## 2. CAMPAIGN DAY 2 — GMAIL STATE + 29 NEW DRAFTS (Tredoux sends, 20/day cap → spread over 2 days)

**Replies:** none real. Otari auto-reply — **Clifford is STILL on sabbatical** (yesterday's "back from sabbatical" intel was wrong; Susan West still acting). Lumin Education auto-ack.
**Bounces on day-1 batch (2/20):** `info@lovetrust.co.za` (Tredoux sent to the OLD address; the erik@ re-send went out 08:18 ✓) and `zamamont@webmail.co.za` (Zama — known phone-only, mark bounced/dead).
**Sent-verify on the 12 warm drafts:** SENT = Love Trust→erik@, Cambridge, Paint Pots, Copenhagen, Lions Gate, Otari, Prerana. **FAMM was neither sent nor in drafts** — presumed held for the commission decision. 4 were still unsent WITH the mangled google-redirect montree.xyz link → **recreated clean (Remuera, I Cube, Norge, Meraki) — Tredoux must DISCARD the 4 old drafts** (Claude can't delete drafts). ⚠️ The sent copies (incl. Love Trust) still carried one mangled signature link — functional (redirects), nothing to do.
**New drafts created (all deduped `to:FULL-ADDRESS in:sent` per recipient):**
- **9 day-2 disadvantaged** (father-story template, clean links, personalized bonding line each): Way Home UA, Seametrey KH, Kadrioru EE, Crossway US, Happy Hearts RW, Blessed Gebremichael ET (dcstmary@yahoo.com), Gumyoko GH, Ecole Vatosoa MG, Education for Madagascar/AKA. 10th candidate `info@bambiniinemergenza.ro` skipped — MX unverified.
- **16 multiplier re-sends** (bounce-recovered §4 addresses): 15 fresh partnership pitches (DMG, MSCA, AMI-DE, Prague, Montessori Society UK, Leicester Group, AME ES, AMCHI CL, MC Korea, KMI, FEMCO, AMITOMO, IEMMP, IMA PL, IMS Brussels) + **Montessori Education Ireland as a THREAD FOLLOW-UP** (dedup caught an Apr-19 send to that exact address — the only dedup hit of 25).

## 3. OWED / BLOCKED

- **Migration 288 NOT RUN** — SQL pasted in chat this session (idempotent ADD COLUMN IF NOT EXISTS on montree_visitors + montree_schools + 2 indexes).
- **DB unreachable all session** (pooler wire-protocol stall from Mac — Astrill VPN — AND sandbox GFW). So NOT verified live: enrich-import row counts, social_status invite tracking, 🎯 Funnel + 🗺 Geo Match rendering. Verify in the 🌍/super-admin tabs directly (or Chrome-drive).
- **FAMM commission decision still open** (Apr-19 email promised 20% for life; new track is 10%) — FAMM draft is gone from Gmail; re-draft after Tredoux decides.
- Status flips to `drafted` for today's 25 recipients — pooler blocked; do via 🌍 tab.
- Day-1 statuses: mark zamamont@webmail.co.za + info@lovetrust.co.za bounced in DB.

## 4. PIPELINE RULES CONFIRMED THIS SESSION

Groups of 4 Sonnet agents, 50-55 rows each, snippets-only, counts-only replies — zero rate-limit kills across 15 agents. Verification is cheap (~1 search/row). Sub-agents still can't see Gmail tools (Fable does Gmail directly). Grouped OR dedup queries (`in:sent {to:a to:b …}`) work and attribute via toRecipients.
