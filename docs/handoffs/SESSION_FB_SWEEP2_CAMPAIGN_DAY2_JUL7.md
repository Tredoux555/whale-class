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

## 3b. EVENING ADDENDUM — CLI STATUS TOOL BUILT (browser driving is DEAD) + FLIPS APPLIED + ⚠️ 50-SEND OVERSHOOT

- **🛠 `scripts/outreach-status.py` (Opus-built, commit `778731a3`) — the new way to update outreach statuses. NEVER Chrome-drive the 🌍 tab for status flips again.** Runs on the Mac (cwd = repo, reads SUPER_ADMIN_PASSWORD from .env.local; montree.xyz HTTPS works even when the pooler is GFW/VPN-blocked). Subcommands: `find "<name|email>"` · `set-status --id/--csv` (cols: match,country?,status; `--allow-downgrade` for bounce-recovery, replied/converted always guarded) · `set-social --csv` · `counts`. Gotchas baked in: auth = POST super-admin/auth → `x-super-admin-token` header, **login rate-limited 5/15min fail-closed → token cached in /tmp, don't hammer**; Cloudflare 403s default urllib UA → browser UA; **campaign-manager PATCH has a latent 500-after-write bug** (montree_outreach_log insert throws AFTER the status lands — script verifies by re-read; the browser UI shares the bug — fix some session). `counts` caps at 1,000 rows (pagination) — cosmetic, fix later.
- **Flips applied via the tool:** 17 day-1 disadvantaged → sent (Indaba already sent; Sustainable Coffee Bay NOT in DB) · Zama → bounced · 9 day-2 + 11 multipliers → drafted. **NOT in DB:** Sustainable Coffee Bay, AMITOMO JP, info@montessoricolombia.org. **DB says DEAD (declined): Montessori Education Ireland + FEMCO Colombia → Tredoux must DISCARD those 2 drafts** (drafted before the DB check). DMG flip reported OK but `find "deutsche-montessori"` NOT_FOUND — verify its row name once.
- **Migration 288 RUN (Tredoux confirmed).** Updated merged CSV (720KB) copied to ~/Downloads + re-imported in the 🌍 tab.
- **⚠️ PACING INCIDENT: ~50 emails sent Jul 7** (day-1 20 + warm batch + the full day-2/multiplier draft queue — drafts sitting in Gmail got sent same-day). Not catastrophic (April ran 50/day; Gmail hard limit 500/day) but over the 20/day cold ramp cap. **Recovery: Jul 8 = zero cold sends (replies only) · Jul 9 = back to 15-20/day · watch for DELAYED soft-bounces over 24h** (the reputation tell; the 2 hard bounces were just dead addresses). Auto-acks (Lumin, Lions Gate) prove clean delivery. Suggested: mail-tester.com check with the father-story email. **🚨 NEW RULE: never queue more drafts in Gmail than the daily send cap — excess queue = same-day overshoot.**
- **FAMM: Tredoux sent it himself — dealt with**, off the queue. Discard list in Gmail: 4 old mangled-link drafts (Remuera, I Cube, Norge, Meraki — clean replacements on same threads) + Ireland + FEMCO.
- **End-of-day DB roundup (Sonnet via the tool):** sent 263 · follow_up 120 · bounced 92 · replied 13 · drafted 13 · new 462 (of first 1,000). Gmail: no real replies Jul 7; Otari's Clifford STILL on sabbatical (Susan West acting — yesterday's intel wrong).

## 4. PIPELINE RULES CONFIRMED THIS SESSION

Groups of 4 Sonnet agents, 50-55 rows each, snippets-only, counts-only replies — zero rate-limit kills across 15 agents. Verification is cheap (~1 search/row). Sub-agents still can't see Gmail tools (Fable does Gmail directly). Grouped OR dedup queries (`in:sent {to:a to:b …}`) work and attribute via toRecipients.
