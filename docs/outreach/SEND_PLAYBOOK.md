# Montree Outreach — Mass Send Playbook

**Status:** Ready to send. Targeting weekend / next week (Apr 11-14, 2026).
**Owner:** Tredoux (tredoux555@gmail.com)
**Tool:** GMass (paid extension on free Gmail account, ~50/day cap)

---

## What's already in place

- ✅ **Sacred email** — tightened to ~155 words, removed "looking for a change in environment" block. Saved verbatim in `whale/CLAUDE.md` under "GMASS OUTREACH CAMPAIGN" section.
- ✅ **Two follow-ups** — already configured in GMass. F1 ~5 days after original, F2 ~5 days after F1. Same wording as Mar 28 campaign.
- ✅ **Cleaned recipient list** — `Montree_Outreach_Cleaned.xlsx` in this folder. 346 deliverable rows (down from 412 unsent — 66 dropped for missing MX/A records). Three sheets: `Deliverable`, `Bounced or Invalid` (with reason), `Summary`.

## What was sent before (Mar 28, 2026)

4 GMass campaigns ran simultaneously, totaling **64 schools sent**:

| Campaign ID | Recipients | Opens | Bounces | Reply |
|-------------|-----------|-------|---------|-------|
| 50490844 | 9 | 6 (66.7%) | 1 (11.1%) | 0 |
| 50489320 | 49 | 16 (32.7%) | **17 (34.7%)** | 1 |
| 50489098 | 3 | 1 (33.3%) | 1 (33.3%) | 0 |
| 50488830 | 3 | 2 (66.7%) | 0 | 0 |

**Key takeaway:** The big batch (50489320) had a **34.7% bounce rate** — 7× the safe threshold. This is the single biggest deliverability risk to the next send. The cleaned list cuts expected bounces roughly in half (from ~35% to ~16% before sending, then closer to ~5-8% after Gmail's own filtering).

## Pre-send checklist (do this in the days BEFORE the send)

1. **Test send to 2-3 safe addresses first.** Suggested: tredoux555@gmail.com (yourself), one Gmail you control, one non-Gmail you control. Use the new shortened sacred email. Verify:
   - Lands in inbox, not spam (check both Gmail and the non-Gmail)
   - Renders cleanly (no broken line breaks, signature looks right)
   - GMass open-tracking pixel fires
2. **Verify GMass settings** for the new campaign:
   - Throttle: enable Gmail's daily-cap protection (~50/day)
   - Auto follow-up #1: same wording as before, 5 days delay
   - Auto follow-up #2: same wording as before, 5 days delay (after F1)
   - Open tracking: ON
   - Click tracking: OFF (looks spammier, you're not measuring clicks)
   - Unsubscribe link: ON (improves deliverability and is legally safer)
3. **Warm up the inbox a bit.** In the days before the send, manually send a few normal one-to-one emails from tredoux555@gmail.com to real people who reply. Gmail's reputation system rewards two-way conversations.
4. **Confirm GMass plan limits.** Log in to gmass.co/dashboard → Account → check daily send cap on your paid plan. The Mar 28 send hit ~50/day which suggests free-tier throttling; if your paid GMass plan allows more, we can send faster.

## The actual send (next week / weekend)

**Step 1 — Upload the cleaned list to Google Sheets**
- Open https://drive.google.com/drive/u/0/my-drive
- Find the existing "Montree Global Outreach" sheet GMass already uses (the one referenced in the Mar 28 campaign reports)
- Add a new sheet/tab called `Send Apr 2026 — Cleaned`
- Paste contents of `Montree_Outreach_Cleaned.xlsx` → `Deliverable` sheet into it
- OR: upload `Montree_Outreach_Cleaned.xlsx` directly to Drive as a new Sheet

**Step 2 — Compose new GMass campaign**
- Open https://mail.google.com
- Click the red GMass button in the Compose window
- In the GMass spreadsheet picker, choose the new sheet/tab
- Paste the new sacred email body (from CLAUDE.md) into the message
- Subject: `Montree`
- Set FROM: `Tredoux <tredoux555@gmail.com>`
- Use mail-merge tag `{SchoolName}` for the "Dear [School Name]" line
- Configure follow-ups (F1 & F2) with the same wording as Mar 28
- Schedule for early morning your time zone (best open rates) — 6-8am local
- Throttle: Gmail-safe (default ~50/day on free; whatever your paid plan allows)

**Step 3 — Click GMass Send**
- GMass will batch and pace automatically
- Don't manually run multiple campaigns in parallel like the Mar 28 setup did — it caused the 4-campaigns-at-once mess
- One campaign, one sheet, let GMass pace it across multiple days

**Step 4 — Monitor for the first 2 days**
- Check gmass.co/dashboard daily for: bounce rate, open rate, unsubscribes, replies
- If bounce rate > 10% in the first 50 sends → PAUSE the campaign and investigate
- If open rate is significantly lower than the 32-66% from the Mar 28 batch → the new email may be landing in spam, check deliverability
- Reply to any school that replies within 4 hours during business days

## Risks to watch

| Risk | Mitigation |
|------|------------|
| Free `@gmail.com` sender reputation tanks after a high-bounce send | Cleaned list cuts bounces in half. Test send first to verify inbox placement. |
| 50/day cap means 346 emails takes ~7 days | Acceptable. Don't try to bypass — pacing protects you. |
| New shorter email lands in spam more than the old longer one | Test send first. The shorter version is actually better for deliverability (less link-heavy, no "I'm looking for a job" sentence which can trip filters). |
| You forget what you've already sent and double-send | The cleaned sheet contains ONLY rows where Status != "Sent" in the original. Don't re-add already-sent rows. GMass also dedupes against its own send history. |

## After the send

- After all 346 are sent, the remaining ~64 from the Mar 28 batch will continue receiving F2 if they haven't already
- Mark the Mar 28 list as "complete" mentally
- Track replies in a separate sheet or in Gmail labels — these are warm leads

---

## File index

| File | Purpose |
|------|---------|
| `Montree_Outreach_Cleaned.xlsx` | The 346 deliverable rows. 3 sheets: Deliverable / Bounced / Summary. |
| `Montree_Global_Outreach.xlsx` (uploads folder) | Original 420-row master list. Don't send from this — use the cleaned version. |
| `whale/CLAUDE.md` | Sacred email body, follow-up wording, GMass campaign history. |
| `SEND_PLAYBOOK.md` | This file. |
