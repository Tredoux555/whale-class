# Global Outreach Context Reference — Jul 9, 2026 → CURRENT

## Snapshot (Updated Jul 9, 2026)

**Data Sources:**
- Master list: `Montree_Global_Master_Jul2026.csv` (7,366 schools, 67 countries)
- Social tracking: `global-social-merged.csv` (3,263 schools with Facebook/social verification)
- Emailable schools: 4,343 with valid email addresses
- Non-social-contacted: 3,070 schools with email + NOT in social file

**Candidates Available for Next Batches:**
- Total eligible (email + no social contact): **3,070 schools**
- Sent in Batch 1 (Jul 9): **25 schools** (all Australia/Canada/France/Germany/India/Ireland/Italy/USA)
- Remaining for future batches: **3,045 schools**

---

## CAMPAIGN: Founding 100 Lifetime Discount

### ⚠️ SUPERSEDED — Batch 1 email copy (used Jul 9, 2026 only)

**This copy was used for Batch 1 ONLY. It is superseded by the LOCKED MODEL DRAFT below as of Jul 10, 2026. Kept here for the record — do not reuse for future batches.**

```
Subject: Montree

Hi,

This is cold outreach.

I am a Montessori teacher who built an app that I believe will redefine the standard and method of making observations, tracking student progress and parent communication.

The system is so new and so cutting edge that nobody knows it exists or what it is.

I'm hoping to get some support from other Montessorians to to validate it and spread the word of its existence. 

To this I am running a promotion for the first 100 schools to sign up to have a lifetime discount of the top tier AI usage (7USD per student per month) for the starter tier price (3USD per student per month)

This honestly means I will most lightly not make any money from the first 100 signups, in fact it may even cost me money.

However I'm willing to run with that because I believe that this app will redefine how we do things and within a few years it will be the new standard.

I've said that twice now didn't I?

Well enough said then, please find the link in the QR code below to take advantage of this lifetime discount of what I believe will simply be the new way of doing things.

Thank you so much for your support and I hope you have an amazing year with your school and that my app can make a real difference taking your school to the next level and just generally improving the quality of…everything. Try it and see why.

Kind regards,

Tredoux
```

---

### 🔒 LOCKED MODEL DRAFT (Tredoux-approved, Jul 10 2026 — used from Batch 2 onward; supersedes the Batch 1 text)

**This is the current email copy for all outreach from Batch 2 onward. DO NOT EDIT without Tredoux's explicit approval.**

```
Subject: From one Montessori teacher to another — may I ask your help?

Hi,

I'll be honest — this is cold outreach. But it's one Montessori teacher writing to another, so I hope you'll give me sixty seconds.

I've spent my career on the floor in a 3–6 classroom, and I built something to fix the part of our work that quietly eats us alive: the observations, the tracking, the parent reports. You take a photo of a child working — the system recognises the work, records the observation, tracks the progress, and writes the parent report. The paperwork disappears; the children get their teacher back.

I believe that within a few years this will simply be how Montessori classrooms run. Right now almost nobody knows it exists — which is why I'm asking for help from the people it was built for.

The first 100 schools to sign up get the top tier at the starter price — 3USD instead of 7USD per student per month, for life. I'll most likely make nothing on those first 100. That's fine. The teachers who join early aren't just getting a discount — they're helping set the path for what this becomes.

The QR code below will take you there.

And even if it's not for you — would you hit reply and tell me the one piece of admin you'd most love to never do again? That answer genuinely shapes what I build next.

Thank you, and I hope your year with the children is a beautiful one.

Kind regards,
Tredoux
```

**Note:** Tredoux drops the promotion QR code into each draft manually before sending.

---

### 🅱️ VARIANT B (Tredoux-approved Jul 10 2026 — THE TEXT FOR TOMORROW'S BATCH 4, Jul 11) — A/B test against the Variant A model draft

**A/B protocol: Batches 2–3 (Jul 10) = Variant A. Batch 4+ (Jul 11 onward) = Variant B until enough replies accumulate to compare response rates. Every batch CSV must note which variant was used. Analyse reply rates per variant before picking a permanent winner.**

Batches 2 and 3 (Jul 10) used Variant A.

```
Subject: A small favour from a fellow Montessorian

Hi,

Montessori teacher here, asking fellow Montessorians for a small favour.

I built something for us. You take one photo of a child working — it recognises the work, records the observation, tracks the progress, and writes the parent report. The paperwork disappears; the children get their teacher back.

Almost nobody knows it exists yet, which is where I need help. The first 100 schools get the top tier at the starter price — 3USD instead of 7USD per student, for life. I'll probably make nothing on those first 100, and that's fine — the schools that join early are helping shape what this becomes.

The QR code below will take you there.

And even if it's not for you — would you hit reply and tell me the one piece of admin you'd love to never do again? I'm building from your answers.

Thank you, and I hope your year with the children is a beautiful one.

Kind regards,
Tredoux
```

**Note:** Tredoux drops the QR code into each draft manually before sending.

---

## CRITICAL RULE: No Cross-Pollination

**Selection Filter Applied:**
1. ✅ Schools with valid email (exclude: "NOT_FOUND", "none", blank)
2. ✅ Schools NOT in `global-social-merged.csv` (prevent duplicate contact via social)
3. ❌ Email status is NOT checked (these are completely new, not from prior campaigns)

**For Every Batch:**
- Query master for `email != "NOT_FOUND"` AND `school_name NOT IN (select school_name from social file)`
- Geographic diversity preferred (mix countries, not all one region)
- Mark in super-admin as `status='drafted'` after Gmail drafts created

---

## Tracking Batches

### Batch 1 (Jul 9, 2026)
**File:** `FOUNDING_100_BATCH_1_JUL9.csv`
- Count: 25 schools
- Countries: Australia (4), Canada (1), France (3), Germany (1), India (2), Ireland (1), Italy (2), USA (6)
- Status: All 25 Gmail drafts created ✅
- Action: Review in Gmail, add QR code images, hit Send

**Next Steps After Sending:**
1. Mark each as `status='drafted'` in the 🌍 super-admin tab (or use CLI)
2. After user sends from Gmail, flip to `status='sent'`
3. Track replies in email + update DB status flow: `replied` → `demo_requested` → `converted/dead`

### Batch 2 (Jul 10, 2026)
**File:** `FOUNDING_100_BATCH_2_JUL10.csv`
- Count: 25 schools
- Method: `random.seed(42)` on pool minus Batch 1
- Note: flagged montessoricensus.org leakage — 3 rows mislabeled Country="United States" but actually Canada/Nigeria (see Notes column in the CSV)

### Batch 3 (Jul 10, 2026)
**File:** `FOUNDING_100_BATCH_3_JUL10.csv`
- Count: 25 schools
- Countries: United States (10), Italy (4), France (3), Germany (2), Australia (3), Netherlands (1), New Zealand (1), Ireland (1)
- Method: `random.seed(42)` on pool minus Batch 1 + Batch 2 (email/social/PRIOR_CONTACT/MX_DEAD filters applied first, then deduped by email)
- Verified: 25 unique emails, zero overlap with Batch 1 or Batch 2, none in `global-social-merged.csv`
- Country-label check: all US rows cross-checked against Region+City (real US state abbreviations + matching cities) — no montessoricensus.org mislabeling detected this round
- Uses the LOCKED MODEL DRAFT copy above (not the superseded Batch 1 text)

---

## How to Query for Next Batches

**Python One-Liner (reproducible seed 42):**
```python
import csv, random
random.seed(42)

social = set()
with open('docs/outreach/social/global-social-merged.csv') as f:
    for row in csv.DictReader(f):
        social.add((row['school_name'].lower(), row['country'].lower()))

candidates = []
with open('docs/outreach/Montree_Global_Master_Jul2026.csv') as f:
    for row in csv.DictReader(f):
        if row['Email'].upper() not in ['NOT_FOUND', 'NONE', ''] and \
           (row['School'].lower(), row['Country'].lower()) not in social:
            candidates.append(row)

next_25 = random.sample(candidates, 25)
for c in next_25:
    print(f"{c['School']:40s} | {c['Email']:40s}")
```

---

## Gmail Workflow

1. Open Gmail Drafts
2. For each of the 25:
   - Review the body (exact copy, no edits)
   - Add a QR code image pointing to: `montree.xyz/montree/try?founding=FND-XXXXXX` (get the code from founding-100 super-admin)
   - Hit Send
3. Update super-admin status: `drafted` → `sent`

---

## Standing Rules (Do NOT Re-Litigate)

- **Email body is LOCKED** — exact copy, never edit
- **No cross-pollination:** email-contacted schools must NOT be in social-contacted list
- **50 drafts/day cap** (standing order as of Jul 7)
- **3-strike follow-up valve:** stop after 3 unanswered follow-ups, surface for keep/kill decision
- **Status updates via CLI only:** `scripts/outreach-status.py` (never Chrome-drive the 🌍 tab)
- **Founding 100 codes:** prefix `FND-`, generated per-school in super-admin, one-time-use

---

## References

- Master spreadsheet: `docs/outreach/Montree_Global_Master_Jul2026.xlsx` (7,366 rows)
- Social file: `docs/outreach/social/global-social-merged.csv` (3,263 rows)
- Campaign manager: `/montree/super-admin/marketing/campaign-manager` (status + stats)
- Outreach hub: `/montree/super-admin/marketing/outreach-hub` (multiplier partner CRM)

