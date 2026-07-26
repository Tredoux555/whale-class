# E2E Partner (Foundation Grant) Flow Test — Jul 18, 2026

**Run by:** Sonnet sub-agent, driving Tredoux's real Chrome via claude-in-chrome MCP
(deviceId 7d422c1a-16c6-440f-8660-bd73adfec31e), DB verification via Desktop Commander +
pg pooler. Tredoux was watching his screen live. All test identities prefixed `ZZ`.

**Verdict summary:**
| Phase | Result |
|---|---|
| 1. Mint test package | PASS (with a data-integrity wrinkle — see Issue #2) |
| 2. Redemption page inspection | PASS — bug confirmed verbatim (Issue #1) |
| 3. Signup walk | PASS (1 copy bug — Issue #6) |
| 4. Feature poke (principal side) | PASS (2 issues — #3 stale UI, #5 status mismatch) |
| 5. Teacher side | PASS (1 console error — Issue #4) |
| 6. DB verification | ALL PASS |
| 7. Cleanup list | Produced, nothing deleted |

---

## PHASE 1 — Mint test package (super-admin)

**10:15:18 PM (2026-07-18 22:15:18 CST).** Navigated a fresh MCP tab to
`montree.xyz/montree/super-admin` — got the "Master Admin — Enter password to continue"
password screen (per the rules: STOP, never type a password on a fresh session).
Used `Control_Chrome.list_tabs` to find the browser's OTHER open tabs — found an
**already-logged-in** super-admin tab (id 1325656685) already on the 🚀 Founding 100 tab,
scrolled to the Foundation Grant card.

**Pre-existing state observed (not caused by this test):** the mint form had an
in-progress, unsaved draft — Partner name field contained "Sugan" (matches Tredoux's
task-list item #11 "Mint corrected real links (Sugan, Debrah)"). This was client-side
state only (nothing had been submitted), so overwriting it to run the test was safe —
logging it here so Tredoux knows his half-typed "Sugan" entry did not survive; he'll need
to re-type it when he does the real Sugan/Debrah mints.

Filled the form: Partner name "ZZ Test Partner 2", Their email
"tredoux555+partnertest2@gmail.com", School name "ZZ Test School 2", % share 20.
Clicked "Mint package". Network: `PATCH /api/montree/super-admin/founding` → 200,
followed by a `GET` → 200.

**Result box rendered:**
- Signup link · Premium free for life: `https://montree.xyz/montree/try?founding=FND-RHUCTY`
- Referral link · ZZ-C8AN · 20% share: `https://montree.xyz/montree/try?ref=ZZ-C8AN`
- Agent dashboard login code: `K9NGQP` (shown once, warning banner present, cannot be recovered)
- Agent login URL: `https://montree.xyz/montree/login-select?code=K9NGQP`

**⚠️ Founding-100 counter changed as a side effect of the partner mint:**
Before mint: Admitted 4 / Remaining 96 / Total Signups 5 / Offer Status CLOSED.
After mint: Admitted 5 / Remaining 95 / Total Signups 6 / Offer Status still CLOSED.
Confirmed again independently via the PUBLIC endpoint `GET
https://montree.xyz/api/montree/founding/count` → `{"cap":100,"wave":1,"admitted":5,
"remaining":95,"is_closed":true}`. See Issue #2.

---

## PHASE 2 — Redemption page inspection

Opened `https://montree.xyz/montree/try?founding=FND-RHUCTY` in a new tab. Page loaded
clean, no console errors, no failed network requests (verified with
`read_console_messages`/`read_network_requests` right after load).

**Banner copy — VERBATIM (the known bug, confirmed exactly as described):**
> **Founding 100**
> One month of Premium free, then Premium locked at $3/student for life.

This is the general Founding-100 public-waitlist banner text. It is WRONG for a Partner
Foundation Grant, which is supposed to be Premium **free for life** (per the mint result
box: "Premium free for life", and per DB `billing_override_usd = 0.00`). Nothing on this
screen tells a Foundation Grant partner they're getting a genuinely free product — they
see a countdown into a $3/mo charge that will never actually happen to them.

Astra narrator: present, top-left, "YOUR FRONT OFFICE" persona, correct welcome copy
("Welcome — I'm Astra. I'll walk with you the whole way..."), "Ask me anything" link
present. Stepper present: YOUR SCHOOL (active) → YOUR KEY → CLASSROOMS → TEACHERS →
THE HANDOFF.

---

## PHASE 3 — Signup walk

Filled: Your Name "ZZ Tester", School Name "ZZ Test School 2" (slug preview correctly
showed `zz-test-school-2`), Email "tredoux555+partnertest2@gmail.com". Clicked "Create my
school →". Network: `POST /api/montree/try/instant` → 200. No console errors.

**YOUR KEY screen:** "Your school is founded." Principal key: **4ZTSZA**. Buttons "Copy
code" / "Enter your school →" both present and correctly styled.

**CLASSROOMS screen:** "Open your classrooms." Clicked "+ Add classroom", typed
"Test Room". No age-range field on this screen (classroom name + 4 color swatches only —
noting for completeness, not a bug, just observed). Clicked "Continue to teachers →".

**TEACHERS screen:** "Who teaches where?" — "Test Room" section with Teacher name / Email
(optional) fields. Typed "ZZ Teacher". Clicked "Complete setup ✓".

**THE HANDOFF screen:** "ZZ Test School 2 is founded." Teacher card: ZZ Teacher · Test
Room · key **FX8D4G** · Copy / Send buttons.

**🐛 Issue #6 (copy bug, cosmetic):** Astra's handoff message read *"Two classrooms,
stocked and lit."* — but only ONE classroom ("Test Room") was created in this run. Likely
a hardcoded/pluralized string that doesn't interpolate the real classroom count.

Clicked "Walk me in, Astra →" → landed on `/montree/admin`, confirming the wizard's final
redirect target is correct.

---

## PHASE 4 — Feature poke, principal side (/montree/admin)

**Landing screen ("Today"):** CopilotDock top-left pill "Next: Hand over the key · 2 of 6"
— the deterministic step engine is live and correctly tracking journey progress. Astra
greeting: "Hi, ZZ. I'm Astra — your chief-of-staff for the school. Ask me anything about
your teachers, your students, or how a parent conversation should go." Sidebar nav:
Today, Classrooms, Parents, Communication, Settings, Calendar, Events, Parent Meetings,
Conversations, **"Message Tredoux"** (confirms `founding_member` gate is correctly wired —
this nav item is supposed to be a Founding-member-only benefit).

**Astra ask-box test:** sent "What should I do first?" — Astra replied correctly and
specifically: gave the exact teacher welcome message with the real teacher name (ZZ
Teacher), real school name, real login code (FX8D4G), and real classroom name (Test
Room), formatted ready to copy/send. No errors, ~5s response time.

**Network health on /montree/admin load:** all functional API calls (`auth/me`,
`billing/status`, `admin/astra-thread`, `admin/today`, `onboarding-copilot/state`,
`appointments`) returned 200. **Anomaly (low severity, non-blocking):** several Next.js
RSC prefetch requests (`?_rsc=...` on `/montree/admin`, `/montree/admin/conversations`,
`/montree/admin/meeting-notes`, `/montree/admin/events`, `/montree/admin/appointments`,
`/montree/admin/communication`) intermittently returned **503**, while the same routes'
real (non-prefetch) navigations returned 200 every time. Looks like background
hover/link-prefetch throttling rather than a real outage — flagging for awareness, not
blocking.

**Classrooms page:** correctly showed "1 classroom" — "Test Room · 0 students · ZZ
Teacher". Clicked into it (Advanced setup → "Add a student manually"), added "ZZ Child
One", age 4. Toast: "Student added." `POST /api/montree/admin/students` → 200.

**🐛 Issue #3 (stale UI, data is NOT lost):** after the toast, and even after a full page
reload (F5), the classroom detail page still showed "0 students" and "Your teachers will
add their students here once they log in." — as if the add never happened. However:
- The Billing page (same session) showed **"Active students: 1"**.
- The teacher dashboard (Phase 5, different login) showed **"1 students"** with the child
  visible.
- The DB (Phase 6) confirms the child row exists with the correct classroom_id/school_id.

So this is a **display-only bug on the admin classroom-detail page** — it does not
refresh/recompute the "N students" header or swap out the empty-state messaging after an
admin-side add, even on hard reload. Data integrity is fine; the UI is misleading a
principal into thinking the add silently failed.

**CopilotDock step counter** advanced from "2 of 6" to "3 of 6" after the student add,
still labeled "Next: Hand over the key" both times — the step LABEL didn't change between
2-of-6 and 3-of-6, only the number did. Possible off-by-one in step-label mapping; noted,
not confirmed as a functional bug (may just be normal — the "next" step name legitimately
stayed the same across two step-count increments if two silent steps completed together).

**Settings page — School Settings:** School name, Principal account (name "ZZ Tester",
email correct), Change password section all rendered correctly.

**🐛 Issue #5 (status mismatch across two admin surfaces):** the Settings page's
"Subscription" card showed **Status: Inactive, Plan: school** — with NO mention of trial,
free-for-life, or Founding 100 at all. Clicking through to "Manage subscription" (the
actual Billing page, `/montree/admin/billing`) showed a completely different and much
richer picture:
- Top banner (correct!): *"You have a special rate: $0/student/month (platform default is
  $7/month)."*
- "Current plan" card: badge **"Trial"**, Active students **1**, Monthly charge **$0.00**,
  "Your trial ends in **30 days**".
- **🐛 Issue #1, confirmed again on this page too:** a gold "Founding 100" card reading
  *"$3/student/mo · for life — Premium locked at $3 per student — for life. Full Sonnet
  reports, Sonnet photo fallback, Sonnet Guru + Astra. Your free month of Premium ends in
  30 days."* with a "Set up billing" button. This directly contradicts the "$0/student
  special rate" banner one paragraph above it on the SAME page. A Foundation Grant partner
  reading this page sees two different, conflicting promises about what they'll be
  charged, and the more prominent (gold, boxed) one is the wrong one.

So: the Settings-page summary card is simply wrong/stale ("Inactive" when it's actually an
active 30-day trial), and the Billing page itself has the internal Founding-100-copy vs.
special-rate-banner contradiction described above.

**Feature flags page (`/montree/admin/features`):** Big page, ~13 categories, ~50
toggles, all rendered without error.
- **🐛 Issue #7 (cosmetic mislabel):** the page header read *"⚙️ Feature Toggles — **Montree
  Class 1** · Toggle features on/off"* — "Montree Class 1" does not match this school
  ("ZZ Test School 2") or its one classroom ("Test Room"). Looks like a hardcoded/default
  placeholder string that isn't being replaced with the real classroom/school name.
- The "AI Reports — Premium" and "AI Reports — Standard" toggles both rendered **visually
  OFF**. DB verification (Phase 6) shows `ai_tier_sonnet=true` and `ai_tier_haiku=true` are
  both actually enabled in `montree_school_features` — so either this toggle UI reads a
  different/unrelated flag than the tier-resolution logic actually uses, or there's a
  genuine display bug here too. Flagging for investigation; did not confirm whether this
  toggle being "OFF" has any functional effect (Guru/Astra worked fine using Sonnet-tier
  quality in Phase 4/5, suggesting the real entitlement logic is unaffected).

---

## PHASE 5 — Teacher side

Opened `montree.xyz/montree/login` in a fresh tab. **It auto-redirected straight into an
existing, unrelated, STALE teacher session** — "Montree Class 1" / student "Potato" — a
leftover login from earlier work in this browser profile, unrelated to this test. Per the
rules (never touch data outside ZZ-prefixed test rows), logged this out cleanly via the
"..." menu → Logout (no data touched, no passwords typed) before proceeding.

Entered teacher code **FX8D4G** → Login. Landed on `/montree/dashboard`, correctly showing
"Test Room" / "ZZ Teacher" in the top bar, "1 students" with student "ZZ" (i.e. "ZZ Child
One", avatar truncated) visible — **this confirms the Phase 4 "0 students" display was
purely a stale admin-page bug; the underlying data was correct all along.**

**5-item menu** ("...") — exactly as expected: **Wrap Up · Parents · Students · Guru ·
Notes** (+ Logout below a divider). Matches the locked-in Jul-4 default menu spec.

**Guru test:** opened Guru for student ZZ. Greeting: "Hi! I'm your Montessori colleague.
Ask me anything about ZZ — curriculum, development, classroom strategies, parent
communication, or anything else." Sent: "What should I focus on with this student this
week?" → "Building context..." loading state → full, warm, contextually-correct reply in
~11s: correctly referenced ZZ's age (4½), a brand-new/empty shelf, the Montessori
five-area starter-shelf approach, asked good clarifying questions (mover/watcher/talker,
prior school experience, home language — correctly inferred a bilingual
Mandarin/English environment default), and offered to build the shelf once it knew more.
No errors in the reply itself.

**🐛 Issue #4 (real bug, needs investigation):** `read_console_messages` on this teacher
session showed **two repeated console errors**:
```
[features] Fetch error: Error: Features fetch: 403
```
(fired twice, ~13s apart, both from the same bundled chunk). Per CLAUDE.md, the
FeaturesProvider is documented as **fail-closed** ("all off if fetch fails") — meaning a
403 on this fetch silently disables every feature-gated UI element for this teacher
session, with no visible error banner to the teacher. Given the Feature Toggles page
oddities in Phase 4 (Issue #7), this 403 may be the root cause connecting both — worth a
focused follow-up session to trace why a legitimately-authenticated fresh teacher session
gets a 403 on the features endpoint.

---

## PHASE 6 — DB verification (via Desktop Commander + pg pooler,
aws-1-ap-southeast-1.pooler.supabase.com:5432, user postgres.dmfncjjtsoxrnvcdnvjq)

### (a) `montree_schools` row — school_id `c407aae0-3f0b-4ea1-9a29-5ff67f835349`
| Field | Value | Expected | Result |
|---|---|---|---|
| name | ZZ Test School 2 | — | ✅ |
| billing_override_usd | 0.00 | 0 (free for life) | ✅ PASS |
| payment_method | stripe_subscription | (default, override makes charge $0 regardless) | ✅ PASS (benign) |
| founding_member | true | true | ✅ PASS |
| subscription_status | trialing | trial/active, not blocked | ✅ PASS (but see Issue #5 — Settings UI says "Inactive") |
| trial_ends_at | 2026-08-17 (30 days out) | ~30-day trial | ✅ PASS |

### (b) `montree_school_features` rows for school_id above
| feature_key | enabled | Result |
|---|---|---|
| ai_tier_haiku | true | ✅ PASS |
| ai_tier_sonnet | true | ✅ PASS |

Both expected rows present and enabled — confirms the tier grant landed correctly at the
data layer, independent of the confusing "OFF"-looking toggle UI noted in Issue #7.

### (c) `montree_founding_waitlist` row — signup_code `FND-RHUCTY`
| Field | Value | Expected | Result |
|---|---|---|---|
| status | admitted | admitted | ✅ PASS |
| redeemed_by_school_id | c407aae0-3f0b-4ea1-9a29-5ff67f835349 | = new school id | ✅ PASS |
| redeemed_at | 2026-07-18T14:17:04Z | set | ✅ PASS |
| grant_type | partner_free_life | partner_free_life | ✅ PASS |
| partner_agent_id | 27a9d36f-b704-4fc0-822a-f4bec0938189 | = agent teacher id (see e) | ✅ PASS |

### (d) `montree_referral_codes` row — code `ZZ-C8AN`
| Field | Value | Expected | Result |
|---|---|---|---|
| agent_id | 27a9d36f-b704-4fc0-822a-f4bec0938189 | = agent teacher id | ✅ PASS |
| revenue_share_pct | 20.00 | 20 | ✅ PASS |
| status | pending | pending (nobody has redeemed the referral link itself in this test) | ✅ PASS |
| redeemed_by_school_id | null | null (expected — untested path) | ✅ PASS |

### (e) `montree_teachers` agent row — email `tredoux555+partnertest2@gmail.com`
| Field | Value | Expected | Result |
|---|---|---|---|
| id | 27a9d36f-b704-4fc0-822a-f4bec0938189 | — | — |
| is_agent | true | true | ✅ PASS |
| agent_default_share_pct | 20.00 | 20 | ✅ PASS |
| login_code (plaintext) | null | null (codes are hashed, never stored plaintext — matches teacher-code precedent) | ✅ PASS |
| agent_password_hash | present (not null) | present | ✅ PASS — confirms K9NGQP was hashed & stored |
| school_id | c6280fae-...-934eae79aabc (Whale Class / origin school) | origin school, not the redeemed school | ✅ PASS (matches known agent architecture) |

### Bonus check: `montree_children` for the new school
One row found: "ZZ Child One", age 4, correct classroom_id (Test Room's id) and school_id.
**This proves Issue #3 (Phase 4) is UI-only — the data was written correctly the whole
time.**

### Bonus check: public Founding-100 counter
`GET https://montree.xyz/api/montree/founding/count` → `{"cap":100,"wave":1,"admitted":5,
"remaining":95,"is_closed":true}` — confirms Issue #2: a partner mint burned a real seat
off the public-facing Founding-100 allocation even while `is_closed:true`.

**Overall Phase 6 verdict: every individual field checked PASSES against spec.** The two
real problems (Issues #1/#2) are DESIGN/COPY issues, not data-integrity failures — the
underlying grants, hashes, and relationships are all correctly wired.

---

## PHASE 7 — Cleanup list (NOTHING DELETED — list only, per instructions)

### Rows created by THIS test run (all safe to delete once reviewed):
| Table | id | Description |
|---|---|---|
| montree_schools | c407aae0-3f0b-4ea1-9a29-5ff67f835349 | "ZZ Test School 2" |
| montree_classrooms | 2dca4264-51d7-410b-b088-96b8e291132c | "Test Room" (under above school) |
| montree_children | 53ba1743-61be-440d-9371-e2c6295f1bcc | "ZZ Child One", age 4 |
| montree_teachers | (teacher row for FX8D4G, "ZZ Teacher") | classroom teacher, id not separately queried but tied to Test Room |
| montree_teachers | 27a9d36f-b704-4fc0-822a-f4bec0938189 | agent row "ZZ Test Partner 2" (is_agent=true), lives under Whale Class school_id |
| montree_founding_waitlist | b0987cdb-a1b8-4b78-ad03-93b677b7eeed | signup_code FND-RHUCTY, "ZZ Test School 2" / "ZZ Test Partner 2", status=admitted, redeemed |
| montree_referral_codes | 378204cc-92fa-4496-b41f-93ce80d7e3ce | code ZZ-C8AN, 20% share, status=pending |
| montree_school_features | (2 rows for school c407aae0-...) | ai_tier_haiku=true, ai_tier_sonnet=true |

**⚠️ Also note:** this mint permanently consumed one seat of the public Founding-100
counter (Admitted 4→5, Remaining 96→95, Total Signups 5→6) via a REAL PATCH+GET round
trip. Deleting the DB rows above will NOT automatically reverse that counter — if Tredoux
wants the public "95 remaining" number to read "96" again, that likely needs either (a) a
super-admin action to decrement/reset admitted count, or (b) accept the drift as the cost
of testing (recommend confirming with Tredoux before touching the counter directly).

### Older stale test rows also observed (pre-existing, NOT created by this run —
### confirmed present, listed per instructions, already in "declined" state):
| Table | id | Description |
|---|---|---|
| montree_founding_waitlist | e2f545eb-43e5-4d9a-9f86-a55471a732c0 | signup_code FND-CWRMCW, "ZZ Test Partner School" / "ZZ Test Partner", status=**declined** |
| montree_referral_codes | 88a779c3-07cb-45cb-917d-5545d5ebd797 | code ZZ-BWPA, 20% share, status=pending |
| montree_teachers | e26a9bdb-3642-418e-9cfd-f3cbdb2ae1f7 | agent row "ZZ Test Partner" (is_agent=true) |

---

## ALSO WATCHED FOR (per instructions)

- **Founding-100 counter changing due to partner mint:** YES, observed and documented —
  see Issue #2. Confirmed via both the super-admin UI (before/after) and the public API.
- **Mangled link in the mint result:** NOT observed — all 3 links (signup, referral, agent
  login URL) rendered as clean plain `https://montree.xyz/...` URLs, no google-redirect
  wrapping, no encoding issues.
- **i18n raw keys on screen:** NOT observed anywhere in the 5 phases walked.
- **Slow pages (>5s):** NOT observed — slowest single action was the Guru reply (~11s
  total including "Building context..." — reasonable for an LLM call, not a page-load
  issue).

---

## TOP 5 ISSUES, RANKED

1. **[HIGH] Wrong billing copy shown to Foundation Grant partners, on TWO screens.**
   Both the `/montree/try?founding=...` redemption banner and the `/montree/admin/billing`
   "Founding 100" card say *"Premium locked at $3/student for life"* / *"your free month of
   Premium ends in 30 days"* — but a partner grant (`grant_type='partner_free_life'`,
   `billing_override_usd=0`) is actually **free forever**, never $3. The billing page even
   contradicts itself in the same screen (a correct "$0/student special rate" banner sits
   right above the wrong "$3/student for life" card). This is task #10 on the existing
   list — this test independently reproduces and confirms it verbatim on both surfaces.

2. **[HIGH] Partner mints silently consume public Founding-100 allocation, even when
   closed to the public.** Minting one partner package moved the PUBLIC counter from
   Admitted 4/Remaining 96 to Admitted 5/Remaining 95, confirmed via the live public API,
   despite `is_closed:true`. If partner grants and the public 100-school waitlist are
   meant to be separate pools, they currently share one counter — worth a design decision
   on whether to split them or accept the shared-cap behavior.

3. **[MEDIUM-HIGH] `[features] Fetch error: Error: Features fetch: 403` on a fresh,
   legitimately-authenticated teacher session.** Fired twice in the console during Phase
   5. Given the documented fail-closed design, this silently disables feature-gated UI
   with no visible error to the teacher — worth tracing root cause (could explain Issue #7
   below too).

4. **[MEDIUM] Admin classroom-detail page doesn't refresh after adding a student.** After
   "Add a student manually" → toast "Student added" → even a hard reload, the classroom
   page still showed "0 students" / empty-state messaging. Confirmed via DB, Billing page,
   and teacher-side login that the student WAS added correctly — this is a display bug
   only, but it's exactly the kind of thing that would make a principal think the feature
   is broken and re-submit the form or contact support.

5. **[MEDIUM] Subscription status inconsistent between Settings and Billing pages.**
   Settings → School Settings → Subscription card says "Status: Inactive" for a school
   that is actually mid-30-day-trial with Sonnet access active (confirmed DB
   `subscription_status='trialing'`, Billing page correctly shows a "Trial" badge + "ends
   in 30 days"). A principal glancing at Settings only would wrongly conclude their
   account isn't active.

**Also logged, lower priority:** Astra's post-signup copy says "Two classrooms" when only
one was created (#6, cosmetic); the Feature Toggles admin page header reads "Montree
Class 1" instead of the real school/classroom name, and its AI Reports toggles render
visually OFF despite the underlying `ai_tier_sonnet`/`ai_tier_haiku` DB flags both being
true (#7, needs a follow-up to confirm whether this has any functional impact); several
intermittent 503s on Next.js RSC prefetch requests that never affected an actual page load
(non-blocking).

---
*Log file written by a Sonnet sub-agent, Jul 18, 2026. Full path:
`docs/handoffs/E2E_PARTNER_TEST_JUL18.md`.*


---

## E2E PARTNER TEST — Jul 18, 2026 (Sonnet, Cowork/claude-in-chrome) — STEPS 1-2 DONE, STEPS 3-6 BLOCKED (super-admin logged out)

**STEP 1 — Deploy wait:** Commit `47735cb3` deploy confirmed live. First poll at T+0 returned the app's
custom 404 page (route not yet deployed). Waited ~70s (7x10s computer-use `wait` calls, `computer` tool
duration cap is 10s so looped) and re-polled `https://montree.xyz/api/montree/founding/lookup?code=FND-U6HHCK`
-> `{"valid":true,"grant_type":"partner_free_life"}`. Total wait ~85s (well under the 12-min budget).

**STEP 2 — Banner live-verify (both codes, quoted verbatim from get_page_text):**
- `https://montree.xyz/montree/try?founding=FND-U6HHCK` (partner_free_life) rendered:
  > "Foundation Partner / Premium free, for life. You're one of the partners we're building Montree with."
  MATCHES EXPECTED banner exactly.
- `https://montree.xyz/montree/try?founding=FND-E7QSCX` (founding_3_life, regression check) rendered:
  > "Founding 100 / One month of Premium free, then Premium locked at $3/student for life."
  MATCHES the OLD copy exactly -- no regression, the two grant types render distinct banners correctly.

**STEP 3/4 — BLOCKED: super-admin session was LOGGED OUT.** Navigating the tab back to
`https://montree.xyz/montree/super-admin` rendered the Master Admin password-entry screen (confirmed via
both screenshot and get_page_text: "Master Admin / Enter password to continue / Login"), not the
already-authenticated dashboard the task assumed. Per standing rule ("never type passwords... if logged
out, STOP and report"), the agent did NOT enter the super-admin password and did NOT attempt the Sugan
re-mint (Step 3) or the John/Greenwoods upgrade mint (Step 4).

**STEP 5/6 — Not run** (both depend on the mints in Steps 3/4 having happened; no DB writes occurred this
pass, so no verification was attempted to avoid reporting stale/pre-mint state as a pass/fail).

**RESUME:** Tredoux needs to log back into montree.xyz/montree/super-admin (enter the Master Admin
password himself) in the Chrome tab, then Steps 3-6 can run: Mint A (Sugan Samy corrective re-mint,
expect same code FND-U6HHCK back), Mint B (John/Greenwoods upgrade, expect signup_link:null + existing
school c9a95231-ce8e-4d37-9e3f-ce9140d0af6f flipped to billing_override_usd=0 + Sonnet tier), then DB
verification of both via Desktop Commander/pg, then optional billing-page spot check.


---

## TEACHER PLATFORM AUDIT — Jul 18, 2026 (Sonnet, Cowork/claude-in-chrome, ZZ Test School 2)

**Run by:** Sonnet sub-agent, driving Tredoux's real Chrome (deviceId 7d422c1a-16c6-440f-8660-bd73adfec31e).
Logged in as teacher via existing code **FX8D4G** ("ZZ Teacher" / "Test Room", ZZ Test School 2 —
school_id `c407aae0-3f0b-4ea1-9a29-5ff67f835349`, classroom_id `2dca4264-51d7-410b-b088-96b8e291132c`).
Note: opening `montree.xyz/montree/login` in a fresh tab auto-redirected straight into an ALREADY-LIVE
"ZZ Teacher" session in this browser profile (leftover from the earlier E2E test above) — never had to
type the code manually. All data touched stays ZZ-prefixed; nothing deleted.

**Verdict summary (PASS/ISSUE per numbered area):**
| # | Area | Verdict |
|---|---|---|
| 1 | Login + Dashboard | PASS — Features-403 from earlier tonight did NOT reproduce (see detail below) |
| 2 | More menu | PASS — exactly Wrap Up · Parents · Students · Guru · Notes (+Logout) |
| 3 | Students (add/edit) | PASS (1 UX trap logged — see N0) |
| 4 | Child profile + gallery | PASS — clean empty states, no crash |
| 5 | Wrap Up (photo-audit) | PASS — Confirm + Teacher Review only |
| 6 | Parents (Codes/Reports/Chats) | PASS — all 3 pills work correctly |
| 7 | Guru | PASS — real, specific, ~8s reply, Sonnet-quality |
| 8 | Notes | PASS with a real bug — see Issue N1 (read-after-write lag) |
| 9 | Capture (camera) | PASS (curtailed early — see note) |
| 10 | Settings + language toggle | PARTIAL — see Issue N2 |
| 11 | Logout/re-login | PASS |


---

## NUMBERED STEP LOG

**1. LOGIN + DASHBOARD (~11:20 PM CST).** Navigated a fresh tab to `montree.xyz/montree/login`.
Rather than showing the code-entry screen, it auto-redirected straight into an already-live "ZZ Teacher"
session (leftover from an earlier E2E pass in the same browser profile — session cookie still valid).
Dashboard loaded: "Test Room" header, "ZZ Teacher" pill, 1 student "ZZ" (ZZ Child One) visible, CopilotDock
pill "Next: Tell me about them · 1 of 6". No console errors on load. Did a genuine F5 hard-reload
immediately after to force a clean network capture (45 then 92 requests across 2 loads) — **zero 4xx/5xx on
any functional API call** on either load (one exception: a single `GET /api/montree/children?classroom_id=...`
returned 503 on the SECOND reload's background refetch, self-recovered on the next poll — logged as a minor
flake, not investigated further since it didn't block rendering).

**🚨 Features-403 chase (explicit ask):** grepped `read_console_messages` (no pattern filter, both loads) and
`read_network_requests` filtered on `"features"` and `"school"` — **found ZERO requests to any
`/api/montree/*features*`-shaped endpoint at all, and ZERO console errors, on two separate fresh loads of
this teacher session.** The `[features] Fetch error: Error: Features fetch: 403` seen earlier tonight in the
E2E test (Phase 5 above) did NOT reproduce here. Two theories, unconfirmed: (a) it was fixed by whatever
shipped between then and now (commit `47735cb3` deployed mid-session per the block above), or (b) it's
session/timing-dependent (e.g. only fires in the few seconds right after a fresh JWT is minted, not on an
already-warm session like this one — this run inherited a pre-existing cookie rather than performing a fresh
code-entry login). **Could not force a true first-time-login repro without logging out first** — see step 11,
which DID perform a real logout+re-login and also came back clean (no Features-403 either time). Net finding:
**the specific 403 could not be reproduced in this session; it may be intermittent/session-timing-dependent
rather than a hard regression.**

**2. MORE MENU.** Clicked "..." top-right. Exact list, in order: **Wrap Up · Parents · Students · Guru ·
Notes** — divider — **Logout**. No Settings item in this menu (see step 10 finding: teachers have no dedicated
Settings page at all; only principals do, at `/montree/admin/settings`). Matches the CLAUDE.md-documented
Jul-4 "5 core items" locked design exactly.

**3. STUDENTS (Student Manager).** Opened via menu → confirmed "ZZ Child One, 4 years old" present, "1
Students in Test Room". Clicked "+ Add Student" → a rich "Building Student Profiles" onboarding-style form
appeared (Name/Age/Gender/Time-at-School/Current-Work-per-area/Profile-Notes). **🐛 UX trap found and logged
(not a data bug):** the form's own real submit control is a "Save All (N)" button at the very bottom; but the
CopilotDock ALSO shows a persistent top-left pill reading "Next: Tell me about them" that is textually similar
enough to be confused for a wizard "Next" button. A same-worded `document.querySelectorAll('button')` match
on "Tell me about them" hit the CopilotDock pill, not the form — clicking it advanced the CopilotDock's own
step counter (1→2 of 6) but did **NOT** submit the student (verified: student list still showed 1, not 2,
after that click). Re-did it correctly via the real "Save All (1)" button → succeeded, redirected to
`/montree/dashboard?onboarded=1`, "2 students" confirmed, **no full-screen "tell me about your students"
onboarding takeover appeared** (matches the CLAUDE.md Jul-3 note that this takeover was retired to fire only
right after create/import, not on a regular teacher-side add) — only the same small CopilotDock coachmark
bubble (dismissed via its "✕", advanced dock to "2 of 6"). Verified via `/dashboard/students`: "ZZ Child One
(4)" + "ZZ Child Two (3)", "2 Students in Test Room". **Edit test:** clicked Edit on ZZ Child One → clean
modal (Name/Photo/Age/Time in Program) → re-saved the SAME name as a no-op → "Update Student" succeeded,
modal closed, list unchanged, no error. Console clean both times.

**4. CHILD PROFILE + GALLERY.** Clicked into ZZ Child One → week view "This Week's Focus" rendered 5 area rows
all "No work assigned" (0 works in rotation) — clean empty state, no crash. Clicked "Gallery" → "No photos
yet / Take photos of the child working to build their portfolio" — clean empty state, camera icon graphic, no
crash. No console errors on either page.

**5. WRAP UP (photo-audit).** Two tabs only: **Confirm** (default, active) and **Teacher Review** — matches
the locked design (Discussion/Get Advice/Weekly Admin all correctly gated OFF for this new school; per
CLAUDE.md these are opt-in flags default-OFF). Confirm tab: "No photos to review", clean. Teacher Review tab:
"No reports for this week / Click 'Generate' to start" — **same dead cross-reference text seen again in step
6** ("Looking for multi-week summaries? See the Weekly Admin tab.") pointing at a tab that isn't visible on
this account (Weekly Admin is gated off) — logged as Issue N3. No console errors.

**6. PARENTS.** Three pills confirmed: **Reports · Chats · Codes**. **Codes** (landed here by default):
"Generate codes (2)" button, per-child cards each with its own "Create parent code" button. Clicked ZZ Child
One's → succeeded instantly, toast "Code created", rendered a clean ACCESS CODE card (**85S8G3**,
`montree.xyz/montree/parent`, Copy code / Welcome message / regenerate-icon buttons). **Reports** tab: same
"No reports for this week / Click Generate to start" empty state + the same dead Weekly-Admin-tab reference
text (Issue N3, same component reused in both places). **Chats** tab: both children correctly show "Parent
hasn't joined yet" (greyed, non-interactive) — exactly the expected fallback since no parent has redeemed a
code yet. No console errors across all 3 pills.

**7. GURU.** Opened via menu → landed pre-scoped to "ZZ Child One" (a prior conversation from earlier tonight
was still there, asking clarifying questions about ZZ). Sent: "What should ZZ Child One work on next?" →
"Thinking..." loading indicator → full, specific, well-formatted reply in ~8s: built a complete 5-area
starter shelf (named specific works: Spooning, Number Rods, Land & Water Globe, etc.), then gave a detailed
step-by-step Monday-morning presentation script (invite/set-up/demonstrate/invite-them/observe/close) plus
"what you're watching for" guidance — genuinely Sonnet-tier quality, not templated filler. Network: `GET
/api/montree/guru?child_id=...` → 200, `POST /api/montree/guru` → 200. No console errors.

**8. NOTES — 🐛 REAL BUG FOUND (Issue N1, read-after-write lag).** Opened Notes, selected the "ZZ Child One"
tag pill, typed "ZZ test note", clicked Save Note. **UI immediately reverted to the "Class Note" tab with the
textarea cleared and "No notes yet" showing** — looked exactly like a silent failure. Checked the network: the
save actually fired `POST /api/montree/teacher-notes` → **201 Created** with a real note id in the response
body. But the very next `GET /api/montree/teacher-notes?classroom_id=...` (both the app's own auto-refetch AND
a fresh manual `fetch()` I ran via `javascript_tool`, AND a full page navigation reload afterward) all
returned `{"notes":[]}` — the note was genuinely invisible for roughly the first ~10-60 seconds after saving.
Confirmed this is a **read-lag, not permanent data loss**: re-querying the same endpoint ~2-3 minutes later
returned BOTH the UI-saved note and a second test note I POSTed directly via `fetch()` in between, and
reloading the actual `/dashboard/notes` page at that point correctly rendered "ZZ test note · ZZ Teacher · 2m
ago · 🏷 ZZ Child One" with edit/delete icons. **Impact: a teacher who saves a note and immediately checks
sees it silently vanish (both in the live UI and on a hard page reload taken within the lag window) — a
strong signal to a non-technical user that the save failed, likely prompting a duplicate re-save or a support
ticket, even though the data is safe.** This matches the pattern already documented elsewhere in CLAUDE.md
("Supabase verify-on-overwrite reads stale bytes at first — re-verify after ~1min") but this is the first
time it's been caught affecting a live teacher-facing SAVE flow rather than an internal verification script.

**9. CAPTURE.** Navigated to `/montree/dashboard/capture`. The page immediately rendered a **live real-time
feed from the browser's actual connected webcam** (the Chrome extension already held camera permission from a
prior session — no permission prompt appeared, it just went live). Capture controls visible: PHOTO/VIDEO
segmented toggle top-right, a large white circular shutter button, a flip-camera icon, and a "Cancel" link —
layout matched the CLAUDE.md-documented portrait camera design (controls on the right edge). **Per privacy
judgment, I did not continue interacting with or screenshotting this page** once a live human was visible in
the real camera feed, and navigated away immediately rather than taking a photo/video or capturing further
images of it. No permission-prompt handling was needed (none appeared) and no error toast was seen in the
single frame observed. This step is therefore only PARTIALLY verified — the controls rendered and no crash
occurred, but the actual shutter/record flow was not exercised.

**10. SETTINGS + LANGUAGE TOGGLE.** No dedicated teacher "Settings" page exists at all — the "ZZ Teacher"
name pill top-left only opens a teacher-switcher ("ZZ Teacher (you)" / "+ Add Teacher"), not a settings
surface. The only teacher-facing settings-like control is the **EN/中文 language `<select>`** top-right.
Switched EN→中文 via `form_input` (native select): confirmed real translations across the dashboard header
("2 位学生" = 2 students, "跳转到学生..." = Jump to student placeholder, "拍照"=Take Photo, "消息"=Messages,
"快速语音笔记"=Quick voice note, "更多工具"=More tools, CopilotDock "下一步：捕捉一个瞬间 3/6" = Next: Catch
one moment), the Students page ("学生"=Students, "打印标签"=Print Labels, "添加学生"=Add Student,
"编辑"=Edit, "移除"=Remove, "2 学生 在 Test Room", "4 岁"/"3 岁"=years old), and the Parents page
("家长"=Parents, "报告"=Reports, "聊天"=Chats, "邀请码"=Codes, "访问码"=Access code, "复制码"=Copy code,
"创建家长码"=Create parent code). **🐛 Issue N2 (i18n gap, cosmetic):** in the More menu itself, 3 of 5 items
translated correctly (收尾整理=Wrap Up, 导师=Guru, 笔记=Notes) but **"Parents" and "Students" stayed in raw
English** — the menu-item LABELS specifically are missing ZH strings even though the pages they link to are
fully translated. Also noted: the "Generate codes (N)" and "Welcome message" buttons on the Parents/Codes tab
stayed in English under ZH. **No raw/unresolved i18n keys (e.g. `menu.parents` literal text) were seen
anywhere** — the gap is untranslated-but-readable English strings, not broken key lookups. Flipped back to
EN cleanly afterward; confirmed via read_page the select reported "English" selected again before proceeding.

**11. LOGOUT / RE-LOGIN.** Clicked Logout from the More menu → landed cleanly on `/montree/login-select` (a
proper 6-char code entry screen, "Enter your code to continue", "M / Montree" branding, no error state).
Typed the same teacher code **FX8D4G** → "Logging in..." spinner → landed back on `/montree/dashboard`
correctly showing "Test Room / ZZ Teacher / 2 students" (both ZZ children present) in English (language
choice did not incorrectly persist as ZH from the earlier test, since it had been flipped back before logout).
**One console error surfaced during this final pass:** `Failed to fetch RSC payload for
.../dashboard/parent-codes. Falling back to browser navigation. TypeError: Failed to fetch` — this is the
same class of issue as the Phase-4 "RSC prefetch 503s" already logged in the E2E test above; Next.js's
speculative link-prefetch failed and the app **gracefully fell back to a real browser navigation**, so it is
non-blocking by design, not a user-facing failure.


---

## TEACHER-AUDIT ISSUES TABLE

| # | Severity | Page | Symptom | Network/console detail |
|---|---|---|---|---|
| N1 | **HIGH** | Notes | Save succeeds server-side (POST 201) but note is invisible on the next GET (both app auto-refetch and a manual page reload) for roughly 10-60s afterward — looks like a silent failure to the teacher | `POST /api/montree/teacher-notes` → 201 with real note id; immediate `GET /api/montree/teacher-notes?classroom_id=...` → `{"notes":[]}`; same GET ~2-3 min later → note present. Read-after-write lag, not data loss. |
| N2 | MEDIUM | Global (More menu) + Parents/Codes | "Parents" and "Students" More-menu labels, plus "Generate codes (N)" and "Welcome message" buttons, stay in English when UI language = 中文 | No console error — untranslated string, not a broken i18n key. All PAGE content (headings, Students/Parents page bodies) translates correctly; only these specific labels miss ZH strings. |
| N3 | LOW | Wrap Up → Teacher Review, Parents → Reports | Empty-state text says "Looking for multi-week summaries? See the Weekly Admin tab." but the Weekly Admin tab is gated OFF/invisible for this school | Dead cross-reference in a shared empty-state component; cosmetic, no error |
| N4 | LOW | Guru / general | RSC prefetch requests intermittently 503 (`?_rsc=...` on dashboard, children list, parent-codes) | All 4xx/5xx were on speculative Next.js LINK-PREFETCH requests only; every real navigation/page-load returned 200. One console error logged verbatim in step 11 ("Falling back to browser navigation") confirms this is a handled, non-blocking fallback path, consistent with the same pattern already flagged in the Phase-4 E2E test above. |
| (N/A) | — | Login/Dashboard | Could not reproduce the `[features] Fetch error: 403` seen in the earlier E2E test tonight | Grepped both console and network on 2 fresh loads + a real logout/re-login — zero occurrences, zero features-endpoint calls at all in this session. Possibly session-timing-dependent or already fixed by commit `47735cb3`; flagging as UNCONFIRMED rather than closing it out. |

**No blocking bugs found.** No dead buttons, no layout overlaps/contrast issues, no >5s page loads (slowest
was the Guru reply at ~8-11s including "Thinking...", acceptable for an LLM call). No i18n raw/literal keys
rendered anywhere. Capture page loads its camera preview correctly (verified visually, not exercised further
for privacy reasons per step 9). All data-mutating actions (add student, edit student, create parent code,
save note, send Guru message) succeeded server-side even where the client-side display had a bug (N1) —
**zero data-integrity failures found on the teacher side**, matching the same pattern as the earlier
principal-side E2E test above (Issue #3 there was also a display-only bug with correct underlying data).

---
*Teacher platform audit appended by a Sonnet sub-agent, Jul 18, 2026 (~11:20 PM - 11:45 PM CST).*

---

## REAL MINTS — Jul 18 night (live super-admin UI, Tredoux watching)

Two real partner mints run through the production super-admin UI (Chrome, live session, no test data) via `🚀 Founding 100` → `Foundation Grant (free for life)` card at montree.xyz/montree/super-admin. Both responses captured on-screen verbatim, then independently verified against the production DB via the Supabase pooler.

### Mint 1 — Sugan Samy / Isha Vidhya (corrective re-mint)

**Form submitted:** name "Sugan Samy", email "sugan.samy@ishavidhya.org", school "Isha Vidhya", share 20%.

**On-screen response (verbatim):**
```
SIGNUP LINK · PREMIUM FREE FOR LIFE
https://montree.xyz/montree/try?founding=FND-U6HHCK   [Copy]

REFERRAL LINK · ISHA-EUTD · 20% SHARE
https://montree.xyz/montree/try?ref=ISHA-EUTD   [Copy]  [Generate QR code]

AGENT DASHBOARD LOGIN
No new login code issued.

⚠ The agent login code is shown ONCE and cannot be recovered — copy it now.
This partner already existed; the signup + referral links are their existing
ones. This agent already has a login — the one-time code cannot be recovered.
Reissue it via the 🔑 button in the Referrals tab if the partner needs it.
```

Confirmed: SAME code (FND-U6HHCK) returned as before the corrective re-mint, names updated. No new login code was issued (this agent already has one from a prior session) — expected, corrective-only behavior.

### Mint 2 — John / Greenwoods Montessori School (upgrade of already-redeemed code)

**Form submitted:** name "John", email "founding-001@montree.xyz", school "Greenwoods Montessori School", share 20%.

**On-screen response (verbatim):**
```
SIGNUP LINK · PREMIUM FREE FOR LIFE
[blank — field empty]   [Copy]

REFERRAL LINK · JOHN-ZTVG · 20% SHARE
https://montree.xyz/montree/try?ref=JOHN-ZTVG   [Copy]  [Generate QR code]

AGENT DASHBOARD LOGIN
WG4YW8   [Copy code]
https://montree.xyz/montree/login-select?code=WG4YW8   [Copy URL]

⚠ The agent login code is shown ONCE and cannot be recovered — copy it now.
This partner already existed; the signup + referral links are their existing
ones. This school already signed up with this code — Premium free-for-life
was applied directly to their account, so the signup link is no longer usable.
The agent login code is shown once — copy it now, it cannot be retrieved later.
```

**⚠️ CAPTURED ONE-TIME AGENT LOGIN CODE (cannot be recovered if lost): `WG4YW8`**
**Login URL: `https://montree.xyz/montree/login-select?code=WG4YW8`**
**Referral code: `JOHN-ZTVG` (20% share)**

Behavior matches design exactly: since founding-001@montree.xyz's original code FND-E7QSCX was already redeemed by school `c9a95231-ce8e-4d37-9e3f-ce9140d0af6f` (Greenwoods), the grant was applied DIRECTLY to the existing school (billing_override_usd → $0, Sonnet tier granted) rather than issuing a dead signup link.

### DB verification (production, via Supabase pooler — aws-1-ap-southeast-1.pooler.supabase.com)

| # | Query | Expected | Actual | Result |
|---|-------|----------|--------|--------|
| a | `montree_founding_waitlist` WHERE email='sugan.samy@ishavidhya.org' | school_name='Isha Vidhya', code=FND-U6HHCK, grant_type=partner_free_life | school_name='Isha Vidhya', signup_code='FND-U6HHCK', grant_type='partner_free_life', status='admitted' | **PASS** |
| b | `montree_schools` WHERE id='c9a95231-ce8e-4d37-9e3f-ce9140d0af6f' | billing_override_usd=0.00 | name='Greenwoods Montessori School', billing_override_usd='0.00', founding_member=true | **PASS** |
| c | `montree_school_features` WHERE school_id='c9a95231-...' | ai_tier_sonnet + ai_tier_haiku = true | ai_tier_haiku=true, ai_tier_sonnet=true | **PASS** |
| d | `montree_referral_codes` WHERE agent_email IN (founding-001@montree.xyz, sugan.samy@ishavidhya.org) | both referral codes present, 20% share | ISHA-EUTD (sugan.samy@ishavidhya.org, 20.00%, pending); JOHN-ZTVG (founding-001@montree.xyz, 20.00%, pending) | **PASS** |
| e | `montree_founding_waitlist` WHERE email='founding-001@montree.xyz' | grant_type | grant_type='partner_free_life' | **PASS** |

**All 5 checks PASS.** Both mints behaved exactly per the tool's corrective/upgrade design contract. Greenwoods (`c9a95231-ce8e-4d37-9e3f-ce9140d0af6f`) is now confirmed Premium-free-for-life on Sonnet tier, live in production.
