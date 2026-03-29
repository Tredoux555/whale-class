# Handoff: GMass Global Outreach Campaign — Batch 1

**Date:** March 28, 2026
**Status:** ✅ SENT — 49 emails sent via GMass

---

## ⛔ THE SACRED EMAIL — DO NOT CHANGE

**The email below is SACRED. It is not a sales pitch. It is not a job application. It is BOTH. That dual purpose is what makes it work.**

**RULES:**
1. **DO NOT rewrite it.** Do not "improve" it. Do not add bullet points, CTAs, or "Book a demo" links.
2. **DO NOT strip the job-seeking paragraphs.** The personal angle ("I'm also looking for a change in environment") is INTENTIONAL. It makes the reader think "this person built something real AND they're a teacher" — that's more credible than a faceless product pitch.
3. **DO NOT substitute a generic product pitch.** If a future Claude session composes a campaign email, it MUST use this exact text with only `{SchoolName}` personalized.
4. **The voice is deliberately provocative and understated.** It works by making the reader curious enough to reply.

⚠️ **INCIDENT (Mar 28, 2026):** Batch1 (49 schools) and the bounce resend (9 schools) were sent with a DIFFERENT generic product pitch email — NOT the sacred email below. This was a mistake. The generic version stripped the personal angle and read like standard SaaS cold outreach. All future batches MUST use the sacred email.

---

## Campaign Summary

Sent the first batch of Montree's global Montessori school outreach campaign via GMass (Gmail mail merge Chrome extension).

**Recipients:** 49 schools (Batch1, rows 16-65 in spreadsheet)
**Subject:** Montree
**Personalization:** `{SchoolName}` merge tag in greeting
**Tracking:** Open tracking ✅, Click tracking ✅
**Auto Follow-ups:**
- Stage 1: 5 days after send, if No Reply
- Stage 2: 10 days after send, if No Reply
- Stage 3: Disabled

**Daily sending limit:** 50 emails/day (all 49 sent immediately — under limit)

---

## Google Sheet

**URL:** `https://docs.google.com/spreadsheets/d/1or_2filM8ku5rvVYeXN0XJszQxeno23at1M-Hyn9jvA/edit`
**Sheet:** "Outreach List"

**Column layout:** A=SchoolName, B=Email, C=Country, D=Region, E=Website, F=ContactPerson, G=Accreditation, H=AgeRange, I=DateSent, J=Status, K=FollowUp1Sent, L=FollowUp2Sent, M=Notes, N=Batch

**Batch labels:**
| Rows | Batch | Count | Status |
|------|-------|-------|--------|
| 2-9 | Asia | 8 | Sent (prior campaign) |
| 10-12 | Test | 3 | Sent (WRONG short email — ignore) |
| 13-15 | Test2 | 3 | Sent (correct sacred email — test batch) |
| 16-65 | Batch1 | 49 | ✅ SENT (⚠️ wrong email body) |
| 66-165 | Batch2 | 100 | ✅ LABELED — Monday send |
| 166-265 | Batch3 | 100 | ✅ LABELED — Wednesday send |
| 266-421 | Batch4 | 156 | ✅ LABELED — Friday send |

**Note:** Row 64 may have had an invalid email (GMass found 49 of 50 rows), which is why 49 not 50 were sent.

---

## Email Content (The Sacred Email)

```
Subject: Montree

Dear {SchoolName},

I'd like to introduce myself and something I've built that I believe represents the next step in the evolution of the Montessori classroom.

It's called Montree.

A teacher takes a picture of a child working. The system does everything else.

It identifies the work, records the observation, determines the child's progress and what should come next. It removes the administrative weight from teachers so they can return to what actually matters — the children, the classroom, the craft.

It writes personalised progress reports for parents. Not templates. Genuine, detailed accounts of what their child is learning and why.

It gives the principal a complete view of the school — every classroom, every student — and the ability to answer any parent's question instantly, supported by a built-in Montessori expert and developmental psychologist.

This wasn't possible before. Now it is, and I'm the one who built it.

I'm also looking for a change in environment.

I'm grateful to my current school. They gave me the space to learn and grow as an educator. But I've reached the ceiling of what this position can teach me, and I'm ready for the next step in my own evolution.

Your school appears to be one of the leaders in this industry. It may be the right place for me to continue.

Thank you for your time and consideration.

I look forward to hearing from you.

Kind regards,
Tredoux
montree.xyz
```

---

## Follow-up Stage 1 (5 days, No Reply)

```
I wanted to make sure my previous email found its way to you. I'd welcome the chance to show you what Montree can do for your school.

Kind regards,
Tredoux
montree.xyz
```

## Follow-up Stage 2 (10 days, No Reply)

```
I understand how busy things can get running a school. If Montree isn't the right fit for you, no problem at all. But if you're curious, I'm happy to arrange a quick demonstration at a time that works for you. Either way, I wish you and your school all the best.

Kind regards,
Tredoux
montree.xyz
```

---

## Ramp-Up Strategy

Week 1 (Batch1): 49 emails — ✅ SENT (establishes sender reputation)
Week 2 (Batch2): 100 emails — rows 66-165, Monday send
Week 2 (Batch3): 100 emails — rows 166-265, Wednesday send
Week 2 (Batch4): 156 emails — rows 266-421, Friday send

**⚠️ GMass free trial limit: 50 emails/campaign or 50 emails/day.** May need to split batches into sub-campaigns of 50.

**Monitor:**
- GMass Reports > [CAMPAIGNS] label for campaign-level stats
- GMass Reports > Opens for open tracking
- GMass Reports > Bounces for bounce tracking
- Google Sheet auto-updates with reporting data (opens, clicks, bounces per row)

---

## Next Steps

1. **Monitor Batch1 results** — Check opens/bounces after 24-48 hours
2. **✅ DONE: Batches labeled** — Batch2 (rows 66-165, 100 schools), Batch3 (rows 166-265, 100 schools), Batch4 (rows 266-421, 156 schools)
3. **Send Batch2 Monday** — Filter `Batch=Batch2` in GMass. ⛔ USE THE SACRED EMAIL — copy-paste from top of this file. DO NOT compose a new one.
4. **Send Batch3 Wednesday** — Filter `Batch=Batch3`. Same sacred email.
5. **Send Batch4 Friday** — Filter `Batch=Batch4`. Same sacred email.
6. **Reply to any responses** — Personal replies, not automated
7. **Follow-ups fire automatically** — Stage 1 at Day 5, Stage 2 at Day 10
8. **Clean bounced emails** — Remove hard bounces from future batches
9. **Track in spreadsheet** — Update Status column for replies, meetings booked, etc.

---

## Technical Notes

- **GMass extension:** Chrome extension for Gmail mail merge
- **Spreadsheet connection:** GMass reads from connected Google Sheet, filters by `Batch=Batch1`
- **Alias format:** `49-recipients-cc471657@gmass.co` (GMass-generated alias representing all filtered recipients)
- **Previous test batches:** Test (rows 10-12) sent with wrong short email — cannot undo. Test2 (rows 13-15) sent with correct email.
- **Mac keyboard:** Use Cmd+D (not Ctrl+D) for fill-down in Google Sheets

---

## Bounce Resolution (Mar 28, 2026 — Later Session)

**Status:** ✅ 9 RESENT — Campaign ID 50490844

### Summary

16 of 49 Batch1 emails bounced (33% bounce rate). Researched alternatives, replaced 10 email addresses, marked 6 as unfixable with notes. Re-sent via GMass with `Status=Resend` filter — 9 delivered, 1 auto-suppressed by GMass bounce list.

### Bounced Emails — 10 Replaced (Column B updated)

| Row | School | Old Email | New Email |
|-----|--------|-----------|-----------|
| 17 | Etonkids Chengdu | chengdu@etonkids.com | cdht@etonkids.com |
| 19 | Etonkids Hongqiao | hongqiao@etonkids.com | hq@etonkids.com |
| 24 | Etonkids Pudong | pudong@etonkids.com | pd@etonkids.com |
| 29 | Etonkids Guangzhou | guangzhou@etonkids.com | gz@etonkids.com |
| 33 | Discovery Montessori CN | info@discoverymontessori.cn | info@discovery-montessori.cn |
| 39 | Discovery Montessori HK | info@discoverymontessori.hk | admissions@discoverymontessori.hk |
| 42 | HKMA | info@hkma.edu.hk | enquiry@hkma.edu.hk |
| 44 | QAIS | admissions@qais.org | info@qais.org |
| 47 | School in Tokyo | info@school-in-tokyo.com | contact@school-in-tokyo.com |
| 57 | Sakura Montessori VN | info@sakuramontessori.edu.vn | tuyensinh@sakuramontessori.edu.vn |

### Bounced Emails — 6 Unfixable (Notes in Column M)

| Row | School | Bounced Email | Note |
|-----|--------|---------------|------|
| 13 | Nebula Academy Shanghai | info@nebulaacademy.cn | BOUNCED - domain not resolving, no alternative found |
| 21 | Etonkids Beijing Lido | lido@etonkids.com | Multi-campus chain: campus-specific emails bouncing across board | BOUNCED |
| 22 | Etonkids Beijing CBD | cbd@etonkids.com | Multi-campus chain: campus-specific emails bouncing | BOUNCED |
| 26 | Etonkids Tianjin | tianjin@etonkids.com | Multi-campus chain: campus-specific emails bouncing | BOUNCED |
| 36 | MMI Singapore | enquiry@mmi-singapore.com | BOUNCED - domain not resolving, school may have closed/rebranded |
| 51 | ISSP Vietnam | info@montessoriacademy... | Multi-campus: Hanoi, HCMC, Hai Phong | BOUNCED - no alternative found |

### Re-send Details

- **Filter:** `Status=Resend` in column J (10 rows marked)
- **GMass result:** 9 sent, 1 auto-suppressed (on GMass bounce suppression list)
- **Campaign ID:** 50490844
- **Subject:** Montree (same as original)
- **Body:** ⚠️ WRONG — Used generic product pitch instead of sacred email (same mistake as Batch1)
- **No auto follow-ups configured** for this resend batch (manual follow-up recommended)

### ⚠️ What Went Wrong

Both Batch1 (49 schools) and the bounce resend (9 schools) were sent with a generic product pitch email composed in-session, NOT the sacred email documented above. The generic version:
- Opened with "My name is Tredoux, and I'm a Montessori teacher at a school in Beijing..."
- Listed features as bullet points
- Had no personal angle (no "looking for a change in environment")
- Read like standard SaaS cold outreach

**Total affected:** 58 emails (49 Batch1 + 9 resend) received the wrong email.

**Impact:** Unknown — need to monitor reply rates. The sacred email was only correctly sent to Test2 (rows 13-15, 3 schools) and possibly the earlier Asia batch (rows 2-9).

**Fix for future batches:** Batch2/3/4 MUST use the sacred email exactly as documented at the top of this file. Copy-paste only. No rewrites.

### Lessons Learned

1. **Etonkids campus emails** use abbreviated prefixes (cdht, hq, pd, gz) not city names
2. **33% bounce rate** is high — suggests many Chinese school email addresses in the spreadsheet were guesses rather than verified contacts
3. **GMass bounce suppression** auto-removes addresses that previously bounced — may need to clear bounce list if the new email is at same domain
4. **Domain-level failures** (nebulaacademy.cn, mmi-singapore.com) indicate schools may have closed or rebranded
