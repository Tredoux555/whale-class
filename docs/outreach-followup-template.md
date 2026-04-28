# Montree Outreach — Follow-Up Email Template

**Confirmed Session 70, Apr 27 2026**
Subject: `Re: Montree`
For: All `status='sent'` contacts (248 remaining as of Apr 28)

---

## Template

```
Hi,

Just a quick follow up — a few things have changed.

Following user requests we have added nine languages to Montree. I am still personally onboarding schools at this stage, and early adopters still have the opportunity to have features built specifically for their school.

I would love to give you the opportunity to experience the magic of Montree. One month, completely free.

Kind regards,
Tredoux
montree.xyz
```

---

## Copy decisions

- "Following user requests" (not "popular demand") — implies active user base, creates FOMO
- "early adopters" (not "early adaptors") — correct term
- "the magic of Montree" — THE brand tagline
- Language personalization: German-speaking schools get "German among them", Spanish get "Spanish among them", etc.
- Subject is `Re: Montree` — threads the original pitch, not a cold subject line
- 22 drafts sent before session 70 was interrupted. 248 remaining as of Apr 28.

---

## Status

Send in batches of 50/day. Pull from `montree_outreach_contacts` where `status = 'sent'`.
After drafting each batch, mark as `status = 'follow_up'` and log to `montree_outreach_log`.
