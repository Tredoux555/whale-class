# MASTER OUTREACH RUNBOOK — canonical from Jul 17, 2026
**Authored by Fable. This is the single source of truth for ALL Montree outreach. The daily
scheduled task and every Sonnet worker assemble from THESE locked texts — no worker ever invents
wording. Supersedes all prior default templates. The free-for-life offer is FROZEN (Tredoux,
Jul 17) — no outreach may offer the product free; the Foundation is invite-only, Tredoux's hand.**

## 1. THE MASTER LIST
`montree_outreach_contacts` (live DB) is the ONE master list. CSVs under docs/outreach/ are
raw-source archives only — never draft from them directly; anything worth contacting gets imported
into the DB first. Super-admin 🌍 Global Outreach tab + 📘 Social view are the track record.
Statuses: email axis `new → drafted → sent → follow_up → replied / bounced / dead`; social axis
`found → invited (FB followed) → messaged (IG) → replied / connected / dead`. The two axes never merge.
🚨 Gmail `to:FULL-ADDRESS in:sent` dedup before EVERY draft — the DB is the map, Gmail is the terrain.
🚨 Instagram: open the DM thread and check history before sending — manual passes happen.
🚨 Montessori-fit only, verified, forever (underprivileged pool = UNDERPRIV_MONTESSORI_ONLY_JUL17.csv).

## 2. LOCKED EMAIL TEXTS (subject always: `Montree` · plain text · bare montree.xyz only)
**A — The Hello (schools & flagships)** — greeting `Dear <Org> team,` (or `Hi <FirstName>,` when a
person is known):
> This is just a hello.
>
> I'm a Montessori teacher, and I've built something new for the Montessori classroom — technology
> that didn't exist until now. It exists for one reason: to help the teacher. It takes away most of
> the workload, makes the work more accurate, and brings parents closer to the classroom than
> they've ever been.
>
> I'm not going to try to explain it here. It's the kind of thing you have to use to understand.
>
> If you'd like to improve your classroom or school, get back to me and I'll share more.
>
> Kind regards,
> Tredoux
> montree.xyz

Variant lines (swap the "If you'd like..." line only): networks/associations → "If you'd like to
improve the classrooms in your network, get back to me and I'll share more." · training bodies →
"If you'd like to improve the classrooms your teachers go on to lead, get back to me and I'll share
more."

**B — The Underserved Hello (Montessori-fit underprivileged orgs; free offer FROZEN — never mention
price or free):** same first four paragraphs as A, then closing line instead:
> We keep a special program for schools serving communities like yours. If you'd like to hear about
> it, reply and I'll tell you everything.

**FU1 (7 days, same thread):**
> Hi,
>
> I wanted to make sure my previous email found its way to you. I'd welcome the chance to show you
> what Montree can do for your school.
>
> Kind regards,
> Tredoux
> montree.xyz

**FU2 (14 days, same thread — the third touch, where schools convert):**
> Hi,
>
> I understand how busy running a school gets, so this is the last note from me. If you're ever
> curious what Montree does for a Montessori classroom, my door is always open — one reply and I'll
> show you personally.
>
> All the best to you and your school,
> Tredoux
> montree.xyz

**THE 3-TOUCH LAW:** initial + FU1 + FU2 = three touches. After the third unanswered touch: STOP,
flip to `dead` unless flagged keep. Never a fourth cold touch. (FU language matches original email's
network/training variant where applicable.)

## 3. LOCKED IG MESSAGE SKELETONS (rotate; insert school name naturally; NO links ever; ≤3 sentences)
Workers pick the next skeleton in rotation per school and may only adjust the greeting/name slot:
1. "Hi <School>! I'm a Montessori teacher myself, and I've been building a piece of software to help run the Montessori classroom day-to-day. Would love to tell you more if you're ever curious — no pressure at all."
2. "Hello! I teach in a Montessori classroom and recently built something new to help manage the day-to-day of running one — thought <School> might find it interesting. Happy to share more whenever suits you."
3. "Hi there — just a hello from a fellow Montessori teacher. I've developed new software for managing a Montessori classroom and thought <School> might like to know it's out there. Get in touch if you're interested."
4. "Hello from a fellow Montessori teacher! I've built some cutting-edge software for the Montessori classroom and wanted to introduce myself to <School>. Reach out any time if you're curious."
5. "Hi <School> team! I teach Montessori myself and have developed software to help run a classroom more smoothly. Just wanted to say hello — reach out any time if you'd like to hear more."
6. "Hello! I'm a Montessori-trained teacher who's spent the last while building cutting-edge classroom software. Wanted to introduce myself to <School> — feel free to reach out if you'd like to know more."
7. "Hi! I'm a Montessori teacher who built something new for running a classroom — wanted to say hello to <School> and let you know it exists. Message me back if you'd like to know more, no rush."
8. "Hi there — I'm a Montessori teacher who's developed some new classroom-management software, and wanted to say hello to <School>. Let me know if you'd ever like to hear more, no pressure at all."

## 4. THE DAILY CYCLE (scheduled task `daily-campaign-sweep`, 7:07)
1. Gmail sweep: replies (draft responses in Tredoux's voice; polite-decline for non-fits; top
   priority for Isha Vidhya/partners), bounces (flag soft clusters → skip cold that day).
2. Follow-ups due (7-day window + backlog), FU1/FU2 from §2, 3-touch law enforced, English only.
3. New cold drafts to fill 50/day: high-value + underprivileged (§2 A/B), Gmail-dedup each.
4. Social queue: next 20 fresh IG targets with §3 messages pre-assembled + next 30-40 FB follow URLs,
   written to docs/outreach/social/SOCIAL_QUEUE_<date>.md.
5. CLI status flips (scripts/outreach-status.py — never the browser) + morning report.
**Tredoux's part (the one finger):** say **"go"** → supervised send session runs: Gmail batch-send
(repair any google.com/url-mangled link to bare montree.xyz before each send), then IG round (thread-
history check per profile, ≤20-25/day), then FB follows (≤30-40/day), then flips + session log.
🚨 NEVER auto-send outside that supervised session. 🚨 Stop instantly on any platform pushback.

## 5½. THE OPERATOR MANDATE (Tredoux, Jul 17 night — standing)
Fable runs the whole campaign AND the business ledger. Every daily run must also maintain and report:
- **PIPELINE LEDGER** (from master list + montree_schools + waitlist): spoken-to (replied), in-demo,
  signed-trial, signed-paying, Foundation/free (Greenwoods $3-life · Isha Vidhya · Tatenda pending),
  rejected (dead w/ reason). Any school crossing a stage appears in the morning report by name.
- **DEMO PROTOCOL**: the moment a demo/call is agreed in any thread, record it (org, contact, datetime
  + timezone) in `montree_demo_meetings` via the demo-meetings API
  (`POST /api/montree/super-admin/demo-meetings`, or a pooler insert) — this feeds the 🧭 Command tab,
  which shows every upcoming demo with a countdown and the datetime in both the agreed timezone and
  Tredoux's local (Shanghai). AND prep him: a Sonnet research dossier on the school (size, pedagogy,
  decision-maker, likely objections, 3 talking points / 3 landmines — Isha Vidhya format) delivered
  BEFORE the meeting, plus a reminder the morning of. Use the existing dossier infra where useful.
- **MONEY**: track signups→revenue via Money tab / montree_finance_transactions + Stripe; morning
  report carries MRR, paying-school count, trial conversions due this week. Monthly (1st): P&L
  summary + set-aside estimate for tax. Tax preparation is coordinated with the HK accountant
  (Vistra/Pamela thread) — Fable prepares numbers and deadlines, the accountant certifies. Flag any
  billing anomaly (trial expiring on an engaged school, failed payment, Foundation misuse) same-day.
- Weekly (Sunday): full business brief — pipeline movement, revenue, costs (AI spend from API
  usage), reply rates, and one strategic recommendation.

## 5. WEEKLY RHYTHM
Every contacted, non-replied, non-dead thread gets its next touch exactly on the 7-day boundary until
the 3-touch law closes it. Sunday's run additionally reports: pipeline totals, reply rate per
template, keep-or-kill list, pool depth remaining.

### Consolidation (Jul 17)
Data consolidation pass making `montree_outreach_contacts` the one clean master. Done via pooler SQL
(reads/inserts/notes) — NO deletes, all corrections are status flips + note annotations, every write
re-read to verify.

**Final counts (post-consolidation):** TOTAL **7,414** rows.
- Email/pipeline `status`: new 6,674 · sent 429 · follow_up 120 · bounced 97 · dead 80 · replied 14.
- `social_status`: none 6,182 · found 805 · invited 340 · messaged 71 · dead 14 · connected 2.
- `email_status` (deliverability): unknown 6,883 · verified 421 · bounced 101 · invalid 9.
- Emailable pool (status=new + non-empty, non-bounced/invalid email): **4,178**.
- IG pool (instagram_url present): **731** · FB pool (facebook_url present): **1,133**.

**What changed:**
- **Task 1 — gap import (+25 rows, batch_tag=`consolidation-jul17`).** Ground truth = Gmail Sent Jul 15
  "We're reaching out" underprivileged batch (exactly 25, none previously in DB). Split by
  UNDERPRIV_AUDITED_JUL17 fit: 2 replied (Isha Vidhya = HOT PARTNER w/ Sugan Samy contact; Virlanie =
  decline owed), 3 sent-fit (OB Montessori, Fundación Cristo Vive, Dignity for Children), 20 non-fit dead
  (note "non-Montessori (Jul17 audit) - sent Jul15, NO follow-ups, polite decline if reply").
- **Task 2 — non-fit purge: 0 additional flips.** All 142 audit NOT-fit orgs matched to DB only via the
  Task-1 inserts (already dead/replied); the audit's non-Montessori NGOs never existed in the master DB.
  MONTESSORI/PARTIAL untouched.
- **Task 3 — dedupe: 17 rows merged to dead** (kept the richest/furthest row, note "duplicate of <id>
  (Jul17 merge)"). 16 same-institution org+country dupes (matched by INSTITUTIONAL email domain; free/
  shared providers excluded) + 1 exact email dup (QAIS Qingdao ↔ Qingdao Amerasia Intl; social ported to
  keeper). Generic same-name-different-school groups left intact.
- **Task 4 — valve/dead sync: 6 flipped to dead.** 5×"3-touch valve Jul17" (ims@montessori-friends.de,
  info@montessori-muenchen.com, parijathamontessori@, surinaschools@, info@montessorischool.dk) + Ardtona
  House synced to dead (documented "hard no" May 5). FEMCO + Wheatley(CA) already dead — confirmed.

**Judgement calls / left for Tredoux:**
- Fe y Alegría ×3 (El Salvador/Peru/Honduras) set dead as non-Montessori per audit despite huge network
  reach — revisit if you want them as association/press contacts.
- `info@montessorischool.dk` (Copenhagen) & Ardtona were `replied` in DB → deadded per valve instruction /
  documented reality; notes carry `(prev: replied)`.
- `kiverova_tamila@ukr.net` not in DB — nothing to flip (may be under a different email/org).
- QAIS flagged DEFUNCT in CLAUDE.md — kept row still `sent`; may want it dead.
- Likely-dup pairs LEFT (same name, free/different domain — conservative): Constantia, Drumnigh, Trillium,
  Little Stars, Casa de Montessori(US), Discovery(IN), Montessori Kindcentrum Montijn(NL), Magnolia(IE).
- OB Montessori inserted as its own `sent` row; DB also has "O.B. Montessori Foundation — Pagsasarili
  Preschools" (different arm, no email) — left distinct, not merged.
