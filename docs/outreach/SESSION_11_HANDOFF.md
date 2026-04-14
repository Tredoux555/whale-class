# Session 11 Handoff — Campaign C Launch + Campaign A Postponement

**Date:** Apr 10, 2026
**Status:** Draft created, GMass config needed, user clicks Send
**Next session goal:** Verify Campaign C is sending, monitor stats, confirm Campaign A postponed

---

## What we did this session

1. **Swept 13 tier-2 Chinese cities on Baidu Maps** for Montessori schools (Dalian, Harbin, Changchun, Nanning, Guiyang, Haikou, Shijiazhuang, Dongguan, Foshan, Wuxi, Nanchang, Lanzhou, Taiyuan). Found 102 results, deduplicated against existing 302 → **48 new unique schools added**.

2. **Consolidated master spreadsheet** — `whale/Montree_Master_Outreach.xlsx` now has 770 schools:
   - Tab 1: "Global Outreach (420)" — international schools with emails
   - Tab 2: "China Montessori (350)" — expanded from 302 to 350
   - Tab 3: "Summary" — counts by city/region

3. **Reversed campaign order** — job application email sends FIRST (warmer, personal), Montree product pitch follows ~2 weeks later as follow-up for non-responders.

4. **Wrote new sacred job application email** (~70 words, AMS-certified angle, no resume):
   - Saved as `whale/docs/outreach/Letter_Job_Application.html`
   - Created Gmail draft via API: subject "Montessori Teacher & Builder", To: `345-recipients-big-42c28b38@gmass.co`
   - Draft ID: `r614453887712204887`

5. **Updated CLAUDE.md** with full new campaign details, sacred email text, draft IDs, and session notes.

6. **Cancelled China phone outreach** — call center pricing ($700-2,800) not worth it vs email.

---

## What the user needs to do (before next session)

### Step 1: Fire Campaign C (job application)
1. Open Gmail → Drafts → "Montessori Teacher & Builder"
2. Click GMass settings gear and configure:
   - Schedule: **Send now**
   - Speed: **50 emails/day**, Pause 5–10s between sends
   - **Skip weekends: OFF** (want Fri+Sat+Sun = 150 in inboxes by Monday)
   - Skip holidays: ON
   - Tracking: Opens ON, Clicks OFF
3. Prefill Follow-up Stage 1 (5 days, no reply):
   > I wanted to make sure my previous email found its way to you. If you're looking for a qualified Montessori teacher, I'd welcome the chance to talk. Kind regards, Tredoux / montree.xyz
4. Prefill Follow-up Stage 2 (10 days / 5 after F1, no reply):
   > I understand how busy things can get running a school. If it's not the right time, no problem at all — but if you're curious, I'm happy to arrange a quick chat. Either way, I wish you and your school all the best. Kind regards, Tredoux / montree.xyz
5. **Click the red GMass button to send**

### Step 2: Postpone Campaign A (Montree pitch)
1. Open Gmail → Drafts → "Montree"
2. Click GMass settings gear
3. Change schedule from **Apr 13** → **Apr 27, 9:00am +08:00**
4. Leave all other settings unchanged

---

## What Claude should do next session

### Priority 1: Monitor Campaign C delivery
```
STEPS:
1. Open Chrome to gmass.co/dashboard (or Gmail → GMass Reports)
2. Find the "Montessori Teacher & Builder" campaign
3. Check these metrics:
   - Total sent so far (should be 50/day × days elapsed)
   - Open rate (target: >30%)
   - Bounce rate (CRITICAL: if >20%, PAUSE campaign and investigate)
   - Reply count (any reply = warm lead, flag for user)
   - Unsubscribe count
4. Report findings to user
```

### Priority 2: Check for replies
```
STEPS:
1. Search Gmail: subject:"Montessori Teacher & Builder" OR subject:"Re: Montessori Teacher & Builder"
2. Also search: from:notify@gmass.co (GMass delivery reports)
3. Flag any actual replies from schools — these are warm leads
4. If any bounces are from the cleaned list, note which schools for removal
```

### Priority 3: Verify Campaign A postponement
```
STEPS:
1. Open Gmail → Drafts → "Montree"
2. Verify GMass schedule shows Apr 27 (not Apr 13)
3. Verify To field still = 345-recipients-big-42c28b38@gmass.co
4. Verify body still has {SchoolName} merge tag and sacred email text intact
5. DO NOT TOUCH ANYTHING ELSE — just confirm it's intact
```

### Priority 4: If bounce rate is high (>20%)
```
STEPS:
1. Download bounce list from GMass dashboard
2. Cross-reference against whale/docs/outreach/Montree_Outreach_Cleaned.xlsx
3. Identify pattern (bad domains? specific regions?)
4. If needed, pause Campaign C in GMass, scrub list further, resume
```

---

## Key reference files

| File | Purpose |
|------|---------|
| `whale/CLAUDE.md` | Master brain — full campaign details in "GMASS OUTREACH CAMPAIGN" section |
| `whale/docs/outreach/Letter_Job_Application.html` | Sacred job application email (Campaign C body) |
| `whale/docs/outreach/Letter_Montree_Pitch.html` | Sacred Montree pitch email (Campaign A body) |
| `whale/docs/outreach/Montree_Outreach_Cleaned.xlsx` | Cleaned 345-school recipient list |
| `whale/Montree_Master_Outreach.xlsx` | Master list — 770 schools (420 global + 350 China) |
| `whale/docs/outreach/SEND_PLAYBOOK.md` | Original send playbook (still valid for Campaign A) |

## Key identifiers

| Item | Value |
|------|-------|
| Gmail account | tredoux555@gmail.com |
| Campaign C draft ID | `r614453887712204887` |
| Campaign C message ID | `19d761413fb0a98d` |
| Campaign A draft ID | `r5432987450225472818` |
| Campaign A message ID | `19d6ca30b7406fee` |
| Google Sheet ID (recipient list) | `1tlBY456CVLc9v6oyI6PH8uTQiG7lmlxLQnmLaC0M6GQ` |
| GMass sheet alias | `345-recipients-big-42c28b38@gmass.co` |
| Free Gmail daily cap | ~500 (GMass self-throttles to ~50/day) |

## Timeline

| Date | Event |
|------|-------|
| Apr 10 (Fri) | Campaign C fires — 50 job application emails |
| Apr 11 (Sat) | +50 more (skip weekends OFF) |
| Apr 12 (Sun) | +50 more → 150 in inboxes by Monday |
| Apr 13-17 | Remaining ~195 schools at 50/day |
| Apr 15-17 | Follow-up Stage 1 starts hitting first batch |
| Apr 20-22 | Follow-up Stage 2 starts hitting first batch |
| **Apr 27** | **Campaign A (Montree pitch) fires** for non-responders |

## Chrome automation notes for next session

Gmail's heavy DOM causes screenshot/read_page timeouts. Workarounds that worked this session:
- `javascript_tool` works reliably for DOM queries and clicks
- `navigate` works for URL changes
- `gmail_create_draft` / `gmail_list_drafts` / `gmail_search_messages` MCP tools work perfectly — use these instead of Chrome for email operations
- For GMass dashboard: try `navigate` to `https://gmass.co/dashboard` — if screenshots work there (lighter page than Gmail), use visual inspection. Otherwise use `get_page_text` or `javascript_tool`.
