# HANDOFF — South Africa Founding 100 Outreach (queued Jul 6, 2026)

**The mission (Tredoux's words): "I need to send an email to each of these schools offering them
first option at the 100 founder system — South Africa is my home country — these are my people."**

## The data (SECURED in repo — session uploads would have vanished)

`docs/outreach/south-africa/` — 3 files:
- `Montessori Schools South Africa.csv` — **147 schools, ALL with emails.**
  Columns: School, Email, Region, Suburb, City, Phone, Website, Membership.
  (Website column has SAMA-scrape artifacts glued on — strip anything from "SAMA" onward when using.)
- 2 companion PDFs (same source, reference).

**By region:** Gauteng JHB 48 · Western Cape 45 · Gauteng PTA 17 · KZN 14 · Eastern Cape 7 ·
Mpumalanga 4 · North West 4 · Limpopo 2 · Free State 1 · + neighbours (Namibia, Lesotho,
Swaziland, Ghana, DR Congo — 1 each).

**By SAMA membership (= accreditation seriousness):** Initiate 72 · Progressive 43 · **Full 17 ·
Conditional Full 10 + 4 + 1 (~32 established schools — recommended BATCH 1).**

## The offer (locked business model — see PLAN_LAUNCH_PRICING_JUL6.md)

Founding 100: **1 month of full Premium free → Premium locked at $3/student/month for LIFE**
(vs $7 list). In exchange: validation, feedback, a testimonial. Enrolled in batches of 10-15.
SA schools get FIRST OPTION — the homecoming angle is the emotional core of the email.

## The flow (how founding admission works now — shipped Jul 6, commit `1e470109`)

1. School replies to the email interested →
2. Tredoux opens super-admin → **🚀 Founding 100 tab (now FIRST tab)** → gold **"Mint a founding
   link"** card at top → types school name + email → Mint →
3. Sends them their personal single-use link `https://montree.xyz/montree/try?founding=FND-XXXXXX` →
4. They sign up: 30-day Premium trial + founding_member + $3 override stamped automatically.

**Do NOT pre-mint 147 codes.** Codes = admitted status. Email invites them to CLAIM a place
(reply), minting happens per-school on reply. First spare code already minted: `FND-E7QSCX`
(row "Founding School #1 (reserved)", placeholder email founding-001@montree.xyz — reassign or
use as the very first admit).

## Pre-flight (BEFORE drafting emails)

1. **🚨 Upload Hook 11 to YouTube.** Tredoux's stated email design: "two links, one with a YouTube
   video (follow me on Facebook for special offers)". `Montree Hook 11.mp4` (Desktop, 75MB, 60s
   portrait) is posted to FB/IG/X/LinkedIn but NOT YouTube yet. Upload as a Short or regular
   video, title ~"One photo. That's all it takes. — Montree", description with montree.xyz +
   Facebook page link (facebook.com/montreexyz). Get the URL for the email template.
2. **Dedup — MANDATORY per standing campaign rule (Sessions 46/50).** Before ANY draft:
   `search_threads to:DOMAIN in:sent` per recipient. Also cross-check `montree_outreach_contacts`
   (536 rows) — SAMA itself was contacted in the Apr 2026 campaign; a handful of SA schools may
   overlap. The DB status field is NOT reliable — Gmail is truth.
3. **Seed the DB (recommended):** insert the 147 into `montree_outreach_contacts`
   (`contact_type='individual_school'`, `status='new'`, country=ZA + region/suburb/membership in
   notes) so replies/bounces/follow-ups are tracked in the existing Campaign Manager machinery.
4. **STRIPE_PRICE_STARTER env** still not set in Railway (only blocks Starter checkout — founding
   schools force Premium plan so founding redemptions are unaffected; set it anyway soon).

## Email template (draft — Tredoux to approve voice before batch-drafting)

Subject: `A Montessori tool built by a South African — first option for SA schools`

> Dear [School name],
>
> My name is Tredoux — a South African, AMS-certified Montessori teacher. I've spent the last
> years teaching 3-6s abroad, and the evenings building something I needed in my own classroom.
>
> It's called Montree. You take one photo of a child at work — it recognises the material,
> records the observation, tracks progress across all five areas, and writes parents the kind
> of report you'd write if you had an hour for every child. Here's 60 seconds of it working
> with a real child: [YOUTUBE LINK]
>
> Montree launched this week, and I'm choosing the first 100 founding schools personally.
> Because South Africa is home, SA schools get first option. Founding schools get one month of
> full Premium free, then Premium locked at $3 per student a month — for life (the list price
> is $7). In exchange I ask for honest feedback and, if you love it, a testimonial.
>
> If you'd like one of the hundred places, simply reply to this email — I'm enrolling schools
> in batches of 10-15 and I'll send your school its personal founding link.
>
> Warm regards,
> Tredoux
> montree.xyz

Notes: personalize greeting per school; mention their region naturally where it fits ("a
Weltevreden Park school…" optional). Plain text, no HTML (Gmail draft rule). 50 drafts/day max.
NEVER auto-send — Tredoux reviews and sends each one.

## Batch plan

- **Batch 1 (~32):** Full + Conditional Full members — the established schools, best testimonial
  value, most likely to have budgets.
- **Batch 2 (~43):** Progressive members.
- **Batch 3 (~72):** Initiate members (many are small daycares on gmail — still send; $3 pricing
  fits them beautifully).
- Follow-up cadence: day 5 gentle nudge, day 10 final (existing sacred follow-up templates adapt).

## Also still open (social launch tail — from Jul 6 launch day)

- FB: pin launch reel (if not done) · upload gold cover (`_video_assets/fb-cover.html` rendered
  design, needs headless-Chrome render + upload) · personal profile photo + bio + delete the
  duplicated "Founder" work entry · group shares 2-3/day from personal profile.
- LinkedIn: profile avatar still old teal M → gold; launch post is LIVE with video.
- Instagram: website link via phone app (montree.xyz) — desktop can't set it.
- Day 2-3: post `Montree Short Hook.mp4` (8s teaser, Desktop) as the follow-up beat everywhere.
- X: profile bio/banner polish (banner asset ready: `Montree Social Media Pack/montree-banner-1500x500.png`).
