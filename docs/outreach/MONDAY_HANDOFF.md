# Monday Apr 13 Handoff — Campaign A (Montree) Send

**Status:** Loaded in GMass draft. Schedule set. Awaiting user click on red GMass button.

## TL;DR for next session
1. Open Gmail → Drafts → "Montree"
2. Verify the 6 things in the checklist below
3. Screenshot it for Tredoux
4. Say "Ready. Click the red GMass button when you want to fire."
5. **DO NOT click Send yourself.**

## Strategic context (read before changing anything)
On Apr 8 we deliberated whether to also fire Campaign B — a teacher job application email with Tredoux's resume attached. **We cancelled it.** Reason: the resume names Tredoux's current school, and blasting it to 345 strangers' inboxes carries asymmetric risk. Even one principal who happens to know someone at the current school could surface the job hunt before Tredoux is ready. The Montree pitch is already a "teacher + builder" introduction by subtext, and any principal who's interested will ask about availability themselves — at which point Tredoux can deploy the resume privately to a warm lead.

**Do not revive Campaign B without reopening this conversation with Tredoux.**

## Campaign A — exact loaded state

| Field | Value |
|---|---|
| GMass virtual recipient | `345-recipients-big-42c28b38@gmass.co` |
| Source sheet ID | `1tlBY456CVLc9v6oyI6PH8uTQiG7lmlxLQnmLaC0M6GQ` (Google Sheets) |
| Source xlsx | `whale/docs/outreach/Montree_Outreach_Cleaned.xlsx`, Deliverable tab, 345 rows post MX-scrub |
| Subject | `Montree` |
| Body | Sacred email #1 (the shortened ~155-word version, see below) |
| Merge tag | `{SchoolName}` |
| Attachment | NONE |
| Compose draft URL | `https://mail.google.com/mail/u/0/#inbox?compose=CllgCHrgDRrsbSxTWQlPXNMCXtkhKwfmfTsNdVrQqfNqDqFBdgrQJRpQcXtZpsHqcqgzJSQFVMg` |

### Schedule
- Custom date/time: **04/13/2026 09:00am +08:00** (Mon Apr 13, 9am Shanghai time)
- Speed: **50 emails/day**
- Pause: **5–10 seconds** between sends
- Skip weekends: **ON**
- Skip holidays: **ON**
- End time: not set

### Tracking
- Opens: **ON**
- Clicks: **OFF** (deliberate — click tracking degrades inbox placement)

### Auto Follow-up
- **Stage 1: ON** — "No Reply" after 5 days — body: *"I wanted to make sure my previous email found its way to you. I'd welcome the chance to show you what Montree can do for your school. Kind regards, Tredoux / montree.xyz"*
- **Stage 2: ON** — "No Reply" after 10 days (= 5 days after F1) — body: *"I understand how busy things can get running a school. If Montree isn't the right fit for you, no problem at all. But if you're curious, I'm happy to arrange a quick demonstration at a time that works for you. Either way, I wish you and your school all the best. Kind regards, Tredoux / montree.xyz"*
- **Stage 3: OFF**

### Send-as
New messages

## Monday morning checklist
1. ☐ Open the Gmail tab. If the compose window isn't already showing, navigate to Drafts label and click the "Montree" draft to reopen it.
2. ☐ Verify To = `345-recipients-big-42c28b38@gmass.co`. If it shows an empty To or different recipient count, the GMass sheet link broke and you need to reconnect via the GMass spreadsheet picker (manual sheet ID entry: `1tlBY456CVLc9v6oyI6PH8uTQiG7lmlxLQnmLaC0M6GQ`).
3. ☐ Verify subject = `Montree` exactly.
4. ☐ Verify NO attachment present.
5. ☐ Verify body matches the sacred email below — first line `Dear {SchoolName},`, last line `montree.xyz`.
6. ☐ Click the GMass settings gear icon. Verify all schedule + follow-up + tracking settings match the table above. The "clicks" pill should NOT appear in the Tracking row (only "opens").
7. ☐ Take a full screenshot of the compose + open settings panel. Send it to Tredoux.
8. ☐ Say: **"Ready. Settings verified. Click the red GMass button when you want to fire."**
9. ☐ Wait for Tredoux to click. Do NOT click Send.

## After Tredoux clicks Send
1. Confirm the compose window closes and a "Sending campaign" toast appears.
2. Open `https://www.gmass.co/dashboard` in the same Gmail tab (or new tab). Look for the new campaign — it should show "Scheduled for Apr 13" with 345 recipients queued.
3. Report numbers to Tredoux: campaign ID, scheduled time, recipient count, throttle confirmation.
4. If the user is still in session a few hours after the campaign starts on Mon Apr 13, check dashboard for opens / bounces / replies and report.

## The sacred email body (exact text — do NOT rewrite)

```
Dear {SchoolName},

I'd like to introduce something I've built that I believe represents the next step in the Montessori classroom.

It's called Montree.

A teacher takes a picture of a child working. The system does the rest.

It identifies the work, records the observation, tracks the child's progress, and determines what should come next. It lifts the administrative weight off teachers so they can return to what actually matters — the children, the classroom, the craft.

It writes personalised progress reports for parents. Not templates. Genuine, detailed accounts of what their child is learning and why.

And it gives the principal a complete view of the school — every classroom, every child — with a built-in Montessori expert and developmental psychologist on hand to answer any parent's question instantly.

This wasn't possible before. Now it is.

If you'd like to see it, I'd be glad to show you.

Kind regards,
Tredoux
montree.xyz
```

## If something goes wrong

**The draft is gone:** Rebuild it. Open Gmail compose, install GMass, click "From a Google Sheet" → switch to manual entry → paste sheet ID `1tlBY456CVLc9v6oyI6PH8uTQiG7lmlxLQnmLaC0M6GQ`. Set subject `Montree`, paste body verbatim from the block above, leave attachment empty, configure GMass settings per the table. The cleaned xlsx lives at `whale/docs/outreach/Montree_Outreach_Cleaned.xlsx` if you need to re-upload.

**The To field is empty / shows wrong recipient count:** GMass lost the sheet link. Reconnect via GMass spreadsheet picker, manual entry mode, sheet ID above. After reconnect the To field should show `345-recipients-big-...@gmass.co` again (the hash may differ — that's fine, it's regenerated on each connect).

**Tredoux says "wait, can we add the resume after all":** STOP. Re-read the strategic decision in the section above. Ask Tredoux to confirm they've considered the asymmetric-risk argument before changing course. Do not just comply.

**Bounce rate looks bad after first hour:** The Mar 28 batch hit 34.7% bounces on the unscrubbed list. The cleaned list should be ~5–10% bounces. If it spikes above 15%, pause the campaign in the GMass dashboard immediately and tell Tredoux — that's a sign the MX scrub missed something or the inbox is getting throttled.
