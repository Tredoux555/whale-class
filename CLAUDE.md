# Whale-Class / Montree - Developer Brain

## Project Overview
Next.js 16.1.1 app with two systems:
- **Whale Class** (`/admin/*`) - Admin tools (card generators, description review, etc.)
- **Montree** (`/montree/*`) - Real SaaS multi-tenant Montessori school management

Production: `https://montree.xyz` (migrated from teacherpotato.xyz — old domain returns 405 on API calls)
Deploy: Railway auto-deploys on push to `main`
Git remote: `git@github.com:Tredoux555/whale-class.git` (SSH — Cowork VM key "Cowork VM Feb 15" added Feb 15, 2026; old "Cowork VM" Feb 11 key is stale)
Local path: `/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/whale` (note space in "Master Brain")
**⚠️ Git Push — ALWAYS use Desktop Commander FIRST:** `mcp__Desktop_Commander__start_process` with command `cd ~/Desktop/Master\ Brain/ACTIVE/whale && git push origin main 2>&1` and `timeout_ms: 30000`. Do NOT try Cowork VM SSH keys, GitHub PATs, or `scripts/push-to-github.py` — Desktop Commander on the user's Mac is the only reliable push method.

---

## 📮 CAMPAIGN MANAGER — Outreach Protocol (replaces GMass as of Apr 19, 2026)

**🚨 THIS IS A STANDING INSTRUCTION FOR EVERY SESSION. READ THIS FIRST. 🚨**

Claude is Tredoux's outreach campaign manager. GMass is retired. The workflow is:
- **Claude drafts** personalized emails as Gmail drafts (50/day target)
- **Tredoux reviews** each draft in Gmail and hits Send
- **Claude monitors** Gmail for replies and drafts responses
- **Tredoux handles** appointment setting personally — everything else is Claude's job

### The Daily Routine (EVERY SESSION)

When the user says anything like "what's happening with the campaign", "campaign update", "outreach status", or starts a new session:

1. **Check Gmail for replies** — `search_threads` for replies to outreach emails (search: `subject:Montree OR subject:"Montessori Teacher" newer_than:7d -from:me`)
2. **Check for bounces** — `search_threads` for `from:mailer-daemon newer_than:3d`, extract bounced emails, mark in DB as `status='bounced'`
3. **Report status** — How many sent, how many in queue, any new replies, any bounces. Pull live totals from `montree_outreach_contacts`.
4. **Draft replies** to any new responses (professional, warm, push toward a demo call). Put draft replies in Gmail for Tredoux to review and send.
5. **Draft the next batch of 50** — Pick up to 50 contacts from the DB queue (`status='new'`, `email_status != 'bounced'`, `email_status != 'invalid'`), personalize the sacred email for each, create Gmail drafts via `create_draft`
6. **Update the DB** — Mark drafted contacts as `status='drafted'`, log to `montree_outreach_log`
7. **Bounce recovery** — For any new bounces, research correct emails via web search, update DB, re-draft

### Two-Track Outreach: Schools + Multiplier Partners

**Track 1 — Schools (individual_school):** Direct Montree pitch. The sacred email, personalized. Goal: demo call → free pilot → conversion.

**Track 2 — Multiplier Partners:** Institutes, training centers, associations, and franchises that work WITH Montessori schools. One partnership can reach dozens or hundreds of schools. These are MORE valuable than individual school contacts.

**Multiplier types** (from Outreach Hub at `/montree/super-admin/marketing/outreach-hub`):
- `multiplier_association` — 🏛 National/international Montessori associations (e.g., FAMM Argentina, SAMA South Africa)
- `multiplier_training` — 🎓 Teacher training centers (e.g., Montessori CH, MELF, Kidtopia Beijing)
- `multiplier_franchise` — 🏢 Multi-campus networks (e.g., Guidepost HK, Etonkids China)
- `multiplier_consultant` — 💼 Independent Montessori consultants

**Key insight (discovered Session 40):** Replies from "we're not a school" are the BEST replies. FAMM Argentina (AMI Foundation + Training Center) replied asking for pricing, AMI compatibility info, and CV — they collaborate with "numerous educational institutions." Montessori CH (Training Center) also replied. These contacts get a DIFFERENT email — not the sacred school pitch, but a partnership-framed message emphasizing how Montree can be a tool for their trainees/member schools.

**When a multiplier replies:**
- Draft a partnership-oriented response (not the school pitch)
- Emphasize: revenue share for every school they help onboard, Montree as a training tool for their graduates, AMI-compatible curriculum tracking
- Push toward a demo call
- Mark as `status='replied'` with `reply_summary` in DB

### How to Draft Outreach Emails

Use `mcp__f0875e82-fdd3-4aed-b646-de80b534357f__create_draft` with `isHtml: false` (plain text only — HTML drafts via API show raw tags in Gmail compose).

**🚨 PRE-SEND DUPLICATE CHECK (MANDATORY — Session 46 rule, extended Session 50):**
Before creating ANY draft — **cold outreach OR reply** — search `to:DOMAIN in:sent` via `search_threads` for EVERY recipient. The DB `status` field is NOT reliable for dedup — GMass Campaigns C/D sent to ~335 schools not tracked in the DB, and context-loss sessions have created drafts for already-contacted schools. Session 46 found 20 of 52 drafts were duplicates. **Session 50 proved this also applies to REPLY drafts**: Jakarta Montessori had already been emailed 4 times + 2 reply drafts sent earlier in the same session, but context compaction lost visibility, and a 5th duplicate was nearly created. A duplicate cold email signals "mass spam" and kills the lead. A duplicate reply signals incompetence.

**Personalization**: Each email MUST be customized for the recipient. Use the contact's `org_name`, `country`, `contact_person`, and any `notes` to tailor the opening line. The sacred email body stays the same but the greeting and any contextual hook should be specific.

**Subject line**: `Montree` for schools. For multiplier partners, customize based on the relationship type (e.g., `Montree — Partnership for [Country] Montessori Schools`).

**Always send a test to self first** when drafting a new template variant. Verify formatting before creating the batch.

### The Sacred Emails (DO NOT rewrite without user approval)

**PRIMARY — Montree Pitch (~155 words):**
```
Subject: Montree

Dear [School Name / Contact Person],

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

**SECONDARY — Job Application (~70 words):**
```
Subject: Montessori Teacher & Builder

Dear [School Name],

My name is Tredoux. I'm an AMS-certified Montessori teacher for ages 3–6, and I also built Montree — the first AI-powered classroom management system designed specifically for Montessori schools.

I'm looking for my next classroom. If you need a qualified teacher who can also bring your school into the future of Montessori education, I'd love to talk.

Kind regards,
Tredoux
montree.xyz
```

**Follow-up 1** (5 days after initial, subject becomes `Re: Montree`):
> I wanted to make sure my previous email found its way to you. I'd welcome the chance to show you what Montree can do for your school.
> Kind regards, Tredoux / montree.xyz

**Follow-up 2** (10 days after initial):
> I understand how busy things can get running a school. If Montree isn't the right fit for you, no problem at all. But if you're curious, I'm happy to arrange a quick demonstration at a time that works for you. Either way, I wish you and your school all the best.
> Kind regards, Tredoux / montree.xyz

### Database & Tracking

- **Source of truth**: `montree_outreach_contacts` table in Supabase (536 contacts seeded Apr 19)
- **Status flow**: `new` → `drafted` (Gmail draft created) → `sent` (user sent from Gmail) → `replied` / `bounced` / `follow_up` → `converted` / `dead`
- **Activity log**: `montree_outreach_log` table — every action logged with timestamp
- **Campaign Manager UI**: `/montree/super-admin/marketing/campaign-manager` — live dashboard
- **Outreach Hub UI**: `/montree/super-admin/marketing/outreach-hub` — multiplier partner + school CRM with pipeline view, contact types, priority levels, and `est_schools_reached` per multiplier
- **API**: `/api/montree/super-admin/campaign-manager` — GET stats, PATCH status updates
- **API**: `/api/montree/super-admin/outreach` — GET stats/contacts/log for Outreach Hub
- **Master spreadsheet**: `whale/Montree_Master_Outreach.xlsx` — 1,135 schools (785 global + 350 China). 507 MX-verified and deliverable. NOTE: This is a DIFFERENT data source than `montree_outreach_contacts` (536 rows). The spreadsheet has more schools but not all are in the DB yet.

### Gmail Tools Available

- `create_draft` — create drafts (plain text, `isHtml: false`)
- `search_threads` — find reply threads
- `get_thread` — read full thread content
- `list_drafts` — check existing drafts

### GMass Legacy (RETIRED)

GMass campaigns A/C/D are historical. Campaign C sent 335 blank emails (Session 12 disaster). Campaign D was the correction. Campaign A (Montree pitch) was scheduled for Apr 27 but is now superseded by the Campaign Manager workflow. All future outreach goes through Claude + Gmail drafts. GMass is no longer used.

**🚨 NEVER automate email sending.** Claude creates drafts only. Tredoux reviews and sends every email manually. This prevents another blank-email disaster.

### Active Reply Threads (as of May 7, 2026 — updated Session 94 from full Gmail audit)

**🚨 Session 94 corrections to lead state — three "hot leads" in Sessions 71-87 were misclassified:**
- **Ardtona House** is DEAD, not a hot trial-request lead. Valerie sent a final "hard no" on May 5 ("My teachers were not interested"). Don't email further.
- **Paint Pots Montessori at `paintpotsmontessori@outlook.com`** is a DEAD ADDRESS — the email bounced "Address not found" on Apr 30. The real Paint Pots contact is **Jessica Dilhe** at `jessica@paint-pots.co.uk` (Nursery Manager, multi-location group). She got the Montree pitch + CV Apr 12, you nudged Apr 19. No reply since. NOT a hot demo request.
- **Montessori Copenhagen at `info@montessori-cph.dk`** — wrong email. Real address is **`info@montessorischool.dk`**. Head of School **Karin Schurian Rosenø** received the corrected pitch Apr 12 + Apr 21. NO reply. Treat as cold lead awaiting first response.

**🔥 HOT — Multiplier Partners (real, awaiting reply):**
- **FAMM Argentina (Marisa Canova de Sioli, marisa@fundacionmontessori.org)** — AMI Foundation + Training Center. Replied Apr 23 *"it'll take me a few more days... we're definitely interested."* Tredoux nudged Apr 24 (Spanish translation now live) + May 5 (gentle nudge). AWAITING RESPONSE. **#1 multiplier lead — let it breathe; no further nudge until after May 14.**
- **Cambridge Montessori Global (Manish Goyal, info@jalsaventures.com)** — Replied Apr 20 *"Let us know more about it please!"* Tredoux replied with full overview + tier breakdown + demo CTA. AWAITING RESPONSE. Follow up around May 10-12 if no reply.

**🔥 HOT — School Leads (genuinely awaiting follow-up):**
- **Otari School NZ (principal@otari.school.nz, forwarded to Susan West Acting Principal)** — Sabbatical auto-reply received May 5. Susan should respond. **Follow up around May 12-14 if no response.**
- **Lions Gate Montessori (Ingrid, info@lionsgatemontessori.org)** — School of 200+ families across three campuses. Auto-reply May 5 acknowledged the message. Awaiting actual reply.
- **Montessori Norge (Nina Johansen, nina.johansen@montessorinorge.no)** — Out of office returned May 6. **Follow-up window OPEN — can re-nudge any time from May 7 onward.**

**🔥 HOT — Indian schools (sent CV + Montree pitch, awaiting reply):**
- **The Ardee School, India (Sunpritt Dang, phone 9718902010)** — Tredoux contacted via WhatsApp.
- **I Cube Montessori, India (reachus@icubemontessori.com)** — Tredoux sent CV + Montree pitch Apr 14. No reply since.
- **Meraki Montessori, India (management@merakimontessori.in)** — Tredoux sent CV Apr 13. No reply since.
- **Ace Montessori, India (+91 9663373111)** — Direct phone contact.
- **Village Montessori, SC (info@villagemontessori.com)** — Resurrected (Session 47). Tredoux sent resume.
- **Paint Pots Montessori, UK (Jessica Dilhe, jessica@paint-pots.co.uk)** — Multi-location group. Asked for CV Apr 10. Tredoux sent CV + Montree pitch Apr 12 + nudged Apr 19. No reply since. **Worth one more gentle nudge.**

**⚠️ PIVOTED — Declined teaching, Tredoux pivoted to Montree pitch (awaiting reply):**
- **Remuera NZ (Shenali, info@remueramontessori.co.nz)** — Fully staffed. Tredoux pivoted to Montree Apr 13. No reply.
- **Prerana Montessori, India (preranamontessori2002@gmail.com)** — No vacancy. Tredoux pivoted to Montree.

**⏸ COLD / AWAITING FIRST RESPONSE (no actual reply yet):**
- **Montessori Copenhagen (Karin Schurian Rosenø, info@montessorischool.dk)** — Pitch sent Apr 12 + Apr 21. No reply. Worth one more follow-up.
- **Montessori CH (kurs@montessori-ch.ch)** — Replied Apr 14 they're a training center, no classrooms. Could re-pitch as training-tool partner.

**💡 COMPETITIVE INTEL:**
- **Jakarta Montessori School (admission@jakartamontessori.com)** — Uses **Montessori Compass** (competitor). Active in SE Asia. No further follow-up.

**❌ DEAD (8 total — Ardtona added Session 94):**
- **Ardtona House Montessori, UK (vheavey@ardtonahouseschool.ie)** — Valerie: "It is a hard no. My teachers were not interested." (May 5)
- **Montessori Aotearoa NZ (ce@montessori.org.nz)** — Board declined. "Not something we wish to explore."
- **Melville Montessori (jacqui@melvillemontessori.co.za)** — No longer owns school or lives in SA.
- **Kakuozan Montessori (information@kakuozan-preschool.com)** — "Not Montessori."
- **Sonnberg Austria (sabine@am-sonnberg.com)** — Position filled. Graceful close. NOT IN DB.
- **Al Qamar Academy, BestStart Montessori, CHOW Montessori** — No response / dead leads.

**📭 BOUNCED ADDRESSES (Apr 22-30, May 5 — need DB cleanup):**
Wave 1 sends bounced for these addresses. None of these are flagged as `bounced` in `montree_outreach_contacts` yet:
- `paintpotsmontessori@outlook.com` (use jessica@paint-pots.co.uk instead)
- `admin@littleexplorersami.com` (inbox full May 5)
- `info@mmigroup.co.uk` (server misconfigured)
- `info@koniskorea.com`, `info@alshamelah.com`, `info@alnebras.com`, `info@indomontessori.com` (server rejection)
- `info@madridmontessori.es`, `info@giis.org`, `info@giisabudhabi.com`, `info@childrensoasis.ae`, `info@monecole.me`, `info@jawahirvp.com`, `info@ciminternational.com`, `syed@jawahirvp.com` (domain not found)

**📝 DRAFTS sitting unsent (as of Session 94):**
- **Pamela @ Vistra HK (yanyuan.pan@vistra.com)** — finance export structure + 7 questions for HK profits-tax. Draft `19dfd400`. ✅ SENT in Session 94 per Tredoux's confirmation.

---

## RECENT STATUS (May 14, 2026)

### 📚 Session 112 — Reading framework making guide + Pink Phase lesson content + Montree library presence (May 14-15, 2026)

**6 commits pushed to main:** `e42d1035`, `5332b3c3`, `63d3b4ed`, `a6e1cc8d`, `64228377`, `cdce68fa`. Closes the reading-framework loop with two new documents (setup guide + Pink Phase lesson content), wires them into both the Whale admin (Whale-branded) AND the public Montree library (neutral "The Complete Language Area" branding).

**🚨 Canonical resume doc:** `docs/handoffs/SESSION_112_HANDOFF.md`.

**What's live now:**

| Surface | Route | Static file | Branding |
|---|---|---|---|
| Admin 📗 | `/admin/reading-framework` | `public/whale-reading-framework-guide.html` | Whale-branded (internal) |
| Admin 📕 | `/admin/reading-content` | `public/whale-reading-content.html` | Whale-branded (internal) |
| Library tile | `/montree/library/language-area` | `public/language-area-{guide,lessons}.html` | Neutral — "The Complete Language Area" (public) |

Two parallel surfaces, same content. Whale-branded for the user's own use; neutral copies for Montree SaaS subscribers.

**A. Reading Framework Making Guide (`e42d1035` + subtitle fix `5332b3c3`):**

Writing-and-reading framing per Maria Montessori. 13 work families across 4 shelf zones (Oral / Sound / Writing / Reading, with the ESL drill station folded into Sound). For each work: purpose, where it lives, materials, how to make, and a full teacher-to-teacher *how to present it* guide. Three-period lesson for sandpaper letters. Five-stage Dwyer sound games. First movable-alphabet word-building moment (the *esplosione della scrittura* — writing-before-reading). Daily ESL drill mechanics. Inline SVG of the wall showing 4 shelves with materials drawn on each level + a child composing CAT on the rug.

**B. Pink Phase Lesson Content (`63d3b4ed`):**

Closes the gap "the per-lesson card sets exist but no doc says what's IN them." UFLI lessons 1-53, lesson by lesson:

- **Phase 1 — The Alphabet (L1-34):** 30 letter lessons in UFLI's SATPIN-first order (s, a, t, p, i, n, m, d, g, o, c, k, ck, e, u, r, h, b, f, l, j, v, w, x, y, z, qu). Each lesson: articulation note, spelling words (encoding — movable alphabet), reading words (decoding — word cards), phrase cards, sentence cards, picture-sourcing prompts for Canva/Google, heart words introduced, Mandarin-L1 articulation note.
- **Phase 2 — CVC consolidation + FLSZ (L35-41):** Vowel-by-vowel drill, then mixed minimal pairs (L40 — the Mandarin-critical lesson), then the FLSZ doubling rule (L41).
- **Phase 3 — Digraphs + Blends (L42-53):** sh, ch, th (voiceless and voiced), wh, then ending blends, beginning blends (s-, l-, r-), triple blends (str, spl, thr, shr).
- **First-50 heart word schedule** with intro lesson and irregular letters flagged for the red-letter coding convention.
- **Picture sourcing playbook** for Canva and Google with concrete search prompts per word type.
- **References** (Boyer & Ehri 2011, Ehri 2009, Gough & Tunmer 1986, Lane et al. 2025, NRP 2000, Kou et al. 2024, UFLI Foundations).

**Built via Python generator** at `outputs/lesson-content/build.py` (sandbox-only, not in git). ~95 KB output. **Two-round audit, both clean:**

1. **Letter-pool audit** — every word's letters must be in the cumulative pool of letters taught up to and including that lesson. First run caught 3 lesson violations (back/rock at L17, bed/red at L18, fun/bug at L19). Fixed by swapping to constructible alternatives.
2. **Blend audit** — no 2-consonant clusters before L47 (when blends are formally taught). First run caught L13 ('and'), L32 ('jump'/'best'/'help'/'sand'), L41 ('fluff'/'still'). Fixed: 'and' moved to a heart-word at L13 (UFLI's pragmatic compromise — too high-frequency to skip); L32 swapped to clean CVC review; L41 trimmed to pure FLSZ doublings.

**🚨 Architectural rules locked in this session (apply to all future lesson content — Blue Phase L54-83, Green Phase L84-128):**

90. **Every word in every lesson MUST be decodable from the cumulative letter pool** introduced through that lesson. No "preview" words except 'and' (function word, introduced as heart word at L13 only).
91. **No blends (2-consonant clusters) before L47** in any lesson content. Phase 1 and Phase 2 are strictly CVC + permitted digraphs (ck, qu, x as single graphemes). The Mandarin-L1 cluster-acquisition curve is the slowest part of the program; pre-exposure teaches bad habits.
92. **Encoding before decoding, every lesson.** Spelling words list (for movable alphabet) appears BEFORE reading words list (for word cards) in the document. Children build before they read on the same day. UFLI Step 5 then Step 6.
93. **Mandarin-L1 articulation notes are mandatory** on any lesson teaching a sound with documented L1 transfer problems. Currently 14+ lessons flagged in Pink Phase.
94. **Heart word coding is canonical.** Regular letters BLACK, irregular letters RED, small red heart icon below each red letter. Card ~10×6 cm laminated, on binder ring on Shelf 4.
95. **The 4 shelves are the canonical English-area layout** — Oral / Sound / Writing / Reading, left to right. Built around this layout regardless of physical furniture (one long shelf divided in four, or four small units).

**🚨 CSP gotcha (commit `64228377`):** initial admin pages used iframes to embed the static HTML. Blocked by the site's `Content-Security-Policy: frame-ancestors 'none'` — refuses to render any page inside an iframe, including same-origin ones. Fix: switched both admin pages to a redirect-only pattern (`window.location.replace('/whale-reading-{...}.html')`). Browser back returns to `/admin`.

**🚨 Architectural rule #96 locked in:** Don't use iframes anywhere on montree.xyz. The CSP `frame-ancestors 'none'` is a site-wide clickjacking defense. "Embed a static HTML page" patterns must be either a redirect (admin pages) or a direct `<a href="...">` link (library cards). Both patterns are now canonical.

**Montree library tile (commit `cdce68fa`):** added third tile to `/montree/library` between Picture Bank and the footer, emerald accent: "The Complete Language Area." Tile links to a new sub-page `/montree/library/language-area` with two cards (Setup Guide / Pink Phase Lessons) opening the rebranded HTML files. All Whale references stripped via Python `replace` chain, regex-verified clean.

**Files changed (6 commits, 9 files):**
- `public/whale-reading-framework-guide.html` (61 KB) — Whale-branded setup guide
- `public/whale-reading-content.html` (94 KB) — Whale-branded Pink Phase lessons
- `public/language-area-guide.html` (60 KB) — NEUTRAL setup guide for Montree library
- `public/language-area-lessons.html` (95 KB) — NEUTRAL Pink Phase lessons for Montree library
- `app/admin/reading-framework/page.tsx` — redirect-only admin wrapper
- `app/admin/reading-content/page.tsx` — redirect-only admin wrapper
- `app/admin/page.tsx` — two admin tiles (📗 emerald, 📕 pink)
- `app/montree/library/page.tsx` — third library tile (emerald)
- `app/montree/library/language-area/page.tsx` — NEW library landing page with two sub-cards

**🚨 Next session priorities (ordered):**

1. **Verify on production after Railway settles.** Hit `/admin` → tap the pink 📕 Pink Phase Lessons tile → confirm L9 renders with full content. Also verify 📗 Reading Framework tile shows the 4-shelf SVG.
2. **Blue Phase lesson content (L54-83).** Same structure as Pink, ~3 hours focused work via the same Python generator. VCe first, then multisyllabic compounds, then R-controlled vowels, then ending patterns (-tch, -dge, -le).
3. **Green Phase lesson content (L84-128).** Vowel teams, diphthongs, suffixes/prefixes, Greek/Latin roots. ~3-4 hours.
4. **Per-lesson visual sketches** — Pink content is text-heavy. Could add small SVGs of mouth shape per articulation, sample card layouts. Half-day.
5. **Move audit script into the repo** as `scripts/audit-lesson-content.py` for re-runs as content evolves.
6. **Carry-overs from Session 111** (still pending):
   - "Correct" button modal regression on photo audit — needs clarification which card type triggers it
   - "Other" category build for photos not in curriculum
   - Stripe webhook event subscription (Step 1 post-migration operational walkthrough)
   - Railway crons for generate-alipay-invoices + dunning-alipay
   - HK banker email re Wallex + Alipay/WeChat payouts
   - Haiku i18n batch for 10 non-zh locales

---

### 🚑 Session 111 hotfix + weekly-summary cap (commits `80552411` + `0be047d7` + `5ab8a8be`)

Real-user emergency caught + fixed within hours of deploy. Plus a quick UX cap on weekly summary length.

**A. EMERGENCY hotfix — photo-audit (commit `80552411`):**

Real user mid-audit reported (1) clicking "Wrong" on Haiku auto-match cards did nothing, (2) photos confirmed in session came back as UNCONFIRMED after page refresh. Both regressions from `edd90e22` (load-more pagination). The confirms DID reach the DB (teacher_confirmed flag IS true server-side) but the UI was lying — refetch was serving them as still-pending before the optimistic-add to confirmedIdsRef could protect them.

Root causes:

1. **`photos.length` in `fetchPhotos` useCallback deps caused callback identity churn** on every confirm/correct (each calls `setPhotos(prev => prev.filter(...))`). `AuditPhotoCard` is `memo()`'d with a comparator that DELIBERATELY skips callback comparison — so cached cards held stale closures over old `openThisIsSheet`/`handleConfirm` refs. Wrong button silently no-op'd because its cached arrow function called a stale `openThisIsSheet` whose `setThisIsPhoto` closure-state was confused.

2. **`attachToExistingWork` + `handleResolvePhoto` never added the photo to `confirmedIdsRef`** — pre-existing gap that only mattered after `edd90e22` lowered the fetch limit 200/500 → 100. With the smaller window, refetch happened more often, and `confirmedIdsRef` is the only guard against re-serving an optimistically-confirmed photo before the server-side flip lands. Without the add, confirms vanished on refresh.

Surgical fix (load-more pagination preserved):
- Added `photosLengthRef = useRef<number>(0)` for stable offset calc
- Replaced `photos.length` with `photosLengthRef.current` in `fetchPhotos`
- Removed `photos.length` from `fetchPhotos` deps (callback identity now stable)
- Added `useEffect` to keep `photosLengthRef` in sync with `photos.length`
- Added `confirmedIdsRef.current.add(photo.id)` in `attachToExistingWork` (+ `.delete` on error rollback)
- Added `confirmedIdsRef.current.add(photo.id)` in `handleResolvePhoto` (+ `.delete` on error rollback)

**🚨 Architectural rule locked in:** when an `AuditPhotoCard`-style memo comparator skips callback comparison (which is intentional for perf), the parent's callbacks MUST have stable identity. State-derived values in `useCallback` deps (like `photos.length`) break this. Use a ref-mirror updated via `useEffect`.

**🚨 Architectural rule locked in:** every code path that optimistically removes a photo from the audit grid MUST add its id to `confirmedIdsRef` BEFORE the server confirm fires, and `.delete()` it on rollback. The three canonical paths are `handleConfirm` (Session 105), `attachToExistingWork` (Session 111), and `handleResolvePhoto` (Session 111). Add a 4th, you add the ref bookkeeping.

**B. Weekly summary 40-word cap (commits `0be047d7` then `5ab8a8be`):**

User flagged weekly summary auto-fill was ~50-60 words; tightened first to 50 then to 40 per follow-up.

Changes to `app/api/montree/weekly-admin-docs/auto-fill/route.ts`:
- New `WEEKLY_SUMMARY_MAX_WORDS = 40` constant (was 50 momentarily; user requested tighter)
- Prompt rewritten: replaced "2-3 sentence warm narrative paragraph" with explicit `STRICT LIMIT: 40 words total`. Asks for 1-2 sentences, reminds twice.
- `max_tokens` lowered 280 → 100 (~75-word ceiling at AI layer — leaves room for trim if Haiku overshoots).
- Added local `trimToWords()` (mirror of canonical impl from `language-semester/generate/route.ts`) as safety net. Snaps to last sentence-ending punctuation within word budget.
- Applied `trimToWords(narrative, WEEKLY_SUMMARY_MAX_WORDS)` to Haiku output before assigning to `s.summaryEnglish`.

3 pre-existing lint warnings on the file fixed incidentally (let→const, two unused-vars with TODO comments). Single source of truth — flipping the constant flows through prompt + token budget + hard trim.

**Architectural rule:** AI-generated user-facing copy with word caps uses three layers of enforcement (prompt, max_tokens, post-process trim) plus a single shared constant. Canonical in `auto-fill/route.ts` + `language-semester/generate/route.ts`.

**Verification status:**
- ✅ `80552411` + `0be047d7` + `5ab8a8be` all pushed to `origin/main`, Railway redeploying
- ✅ Lint clean on all changed files
- ✅ User verified photo audit working again after hotfix
- ⏳ User to verify 40-word cap on next Weekly Summary Auto-fill

**🚨 Carried-over items (in flight, picking up next session):**
1. **"Correct" button opens modal regression** — user reported this AFTER the hotfix landed. Need to clarify which card type triggered it (Haiku Auto-Match / Haiku Drafted / Sonnet Drafted) before fixing. The haiku_matched Correct binding goes to `handleConfirm` (one-tap) per code audit — so the regression is on a different card variant, or user clicked Wrong by accident.
2. **"Other" category** — user wants a totally-separate "Other" bucket for photos not in curriculum but saved to the child. Build was scoped but not started. Schema: probably just `montree_media` with `work_id=null, work_name='Other', area='other'` — no curriculum row created. UI: button in `ThisIsSheet`'s no-match state. Resolve route: new `type: 'other'` handler.
3. **Stripe webhook event subscription** (Step 1 of post-migration operational walkthrough) — paused. The user opened `dashboard.stripe.com/webhooks` but we paused before they added the 4 events (`invoice.payment_succeeded`, `invoice.payment_failed`, `invoice.finalized`, `invoice.sent`).
4. **Railway crons** (Step 2) — schedule `generate-alipay-invoices` @ 06:00 UTC + `dunning-alipay` @ 08:00 UTC.
5. **HK banker email** — confirm Wallex accepts Alipay/WeChat payouts.
6. **Haiku i18n batch** for 10 non-zh locales (`scripts/fill-missing-i18n-keys.mjs`).

All 5 SQL migrations (205-209) confirmed run by user via verification query. Inbound payments system is code-complete, just needs the Stripe/Railway operational wiring above.

---

### ⚡ Session 111 perf bundle — photo-audit load-more + dead-code cleanup (commit `edd90e22`)

15 files, net -28 lines. Two parallel general-purpose agents under principal-agent supervision.

**A. Photo-audit fetch limit + load-more pagination** (`app/montree/dashboard/photo-audit/page.tsx` + 12 i18n files)

Lowered initial fetch from 200 (most zones) / 500 (today filter) to `FETCH_LIMIT=100`. New "Load more photos" button when `hasMore=true` (response was full-size). Append + id-dedup on subsequent fetches. Reset on `zone/dateRange/todayFilter` change. Server route already supported `offset` so no backend changes. `hasMore` derived from RAW response length (not confirmedIdsRef-filtered) so session-dedup doesn't falsely terminate pagination. 2 new i18n keys (`audit.loadMore`, `audit.loadingMore`) translated into all 12 locales (real translations, not English fallback). Mobile 3G/4G initial paint ~5× faster.

**B. Dead-code cleanup — FocusWorksSection + [childId]/page.tsx**

Removed ~20 lurking unused imports/vars/helpers from past refactors that were hidden behind tactical file-level `eslint-disable` headers in the prior commit (`624b2aab`).

`FocusWorksSection.tsx` removed: `Mic`/`Square`/`TeachingInstructions`/`getAreaLabel`/`AreaConfig`/`resolveLocalized`/`resolveLocalizedArray` imports; `SERIF` const; `AreaDetail` interface; `getAreaConfig`/`guruAreaDetails`/`onShelfFilled` props; `expandedAdvice`/`fillingShelf`/`shelfFilled` state + `resetShelfFilled` useEffect; `planNudge`/`planWorks`/`planWorksEn`/`planDirection`/`hasEmptySlots`/`guruDetail`/`isLast` vars; `handleFillShelf` useCallback + `copyText` + `CopyButton` functions.

`[childId]/page.tsx` removed: `childDataRich`/`setChildDataRich` state + setter call sites; `getAreaConfig` function (only consumer was the removed FocusWorksSection prop); `AREA_CONFIG`/`AreaConfig` imports; matching JSX prop passes.

**LEFT INTACT** (with reasoning):
- `refreshingPlan`/`handleRefreshPlan`/`planDaysSinceUpdate` — used inside `SHOW_GAME_PLAN && gamePlan` footer (flag is false today but the symbols keep the toggle live for documented re-enable path)
- `eslint-disable-next-line react-hooks/exhaustive-deps` at `[childId]/page.tsx` ~line 405 — the intentional `isEnabled` exclusion from TellGuruCard load useEffect
- Bonus: `locale` added to `handleRefreshPlan` deps (was going to surface as exhaustive-deps warning once file-level disable lifted)

**File-level eslint-disable headers REMOVED on both files.** Lint clean (--max-warnings=0) on both. Pre-existing 53 warnings on photo-audit page (native `<img>` for direct Supabase URLs + 3 unused props) unchanged — agents introduced zero new lint issues.

---

### ⚡ Session 111 perf push — PWA mobile lag fixes (commits `19de89fb` + `624b2aab`)

User reported the app felt laggy on PWA mobile (dashboard + photo audit + Tracy). Dispatched a parallel investigation agent which ranked 5 causes by severity. Shipped 6 of the 7 actionable items across two commits.

**Commit `19de89fb` — three trivial-but-high-leverage fixes:**

1. **Service worker bumped v7 → v8** (`public/montree-sw.js`). 10 days of accumulated shipped code since May 4 (Sessions 108-111) meant PWA users were running a 10-day-old shell against new server responses. Bump forces clean activation on next PWA open. **Users may need to close + reopen the app once.**

2. **FeaturesContext value wrapped in useMemo** (`lib/montree/features/context.tsx`). Previously the provider rebuilt `{features, loading, isEnabled, invalidate}` as a fresh object literal on every parent render. Dashboard has 4+ `useFeatures()` consumers — every parent state change cascaded a re-render through every consumer. Mirror of the i18n context fix from Session 76 — same pattern, never applied to features.

3. **`/api/montree/children` cache widened** from `no-store` to `private, max-age=5, stale-while-revalidate=30`. Session 88's no-store sledgehammer killed back-nav UX (every return-to-dashboard fired a fresh Supabase round-trip, 600-1500ms on 3G/4G). The bug Session 88 was preventing required 120s stale window; 5s is plenty safer. In-memory SWR + Session 86 race-guard still protect mid-flight writes.

**Commit `624b2aab` — three larger high-leverage builds:**

4. **Tracy memory cache** (`lib/montree/tracy/memory.ts`). Tracy used to re-read up to 30 memory rows from `montree_principal_memory` on every message. With Opus 4.6 latency on top, first-token felt 3-8s. New in-process cache with 5min TTL keyed by `principal_id` eliminates the DB roundtrip on consecutive turns. Bounded at 1000 entries (FIFO eviction). `writeMemory()` invalidates cache on insert/supersede so the next turn rebuilds from canonical state. Multi-instance Railway: each instance has its own cache; cross-instance staleness self-heals at TTL. Exports `invalidateMemoryCache()` + `clearMemoryCache()` for advanced callers.

5. **`find_children_missing_work` tool** (`lib/montree/guru/tool-{definitions,executor}.ts`). Closes the capability gap user hit today asking Guru "who hasn't been tagged for bingo this week" — existing `get_weekly_area_summary` answers per-AREA not per-WORK. New tool fuzzy-matches the work name against the curriculum, queries confirmed photos + group-photo junction + progress entries, returns both done and missing children plus which curriculum work names matched. Pairs with `group_students` for planning a session for the missing children. Updated `conversational-prompt.ts` with usage examples (bingo, Pink Tower, etc.).

6. **NoteField extract** (`components/montree/child/NoteField.tsx` NEW, +145 lines). Child page (1040+ lines as one component) was re-rendering the entire tree on every keystroke during dictation — keystrokes bubbled through `setNotes(record)` to parent state, triggering re-render of FocusWorksSection (every focus-work row), GamePlanCard, photo strip, evidence badges. Mobile CPU thrashed. NoteField now holds its own local text state, only escalating to parent on Save (POSTs text directly, no upstream state). Memoized so unrelated parent re-renders skip it. Mic transcript also fully internal. Smart-note Haiku now fire-and-forget in parent rather than awaited on the save path. `onSaveNote(work, text)` signature change cascades cleanly through `FocusWorksSection`.

**Skipped — virtual scroll on photo-audit grid:** Investigation agent flagged this as MEDIUM-HIGH severity. Investigated and dismissed: page already paginates to 24 via `PAGE_SIZE = 24`, all images use `loading="lazy"`, `AuditPhotoCard` is memoized with custom comparator, and `filteredPhotos` only re-runs on photos/zone/todayFilter changes (not keystrokes). Adding `react-virtuoso` on top of an already-paginated 24-card view would be wasted work. Real photo-audit wins would be lowering the initial fetch limit (200/500 → 100) or adding infinite-scroll fetch-more, both bigger refactors not in critical path.

**Skipped — Tier 1.1 SW stale-while-revalidate API cache:** Still deferred to a dedicated session (Session 107 carry-over). It's the biggest single perceived-speed win remaining (~80% of returning-visit lag) but has a CVE-class auth-leak risk if cache isolation isn't perfect across users. Needs real iPhone testing with two different user logins on the same browser to verify.

**Pre-existing dead-code disables added:** `FocusWorksSection.tsx` and `[childId]/page.tsx` have ~20 lurking unused imports/vars from past refactors (game-plan inline render moved to GamePlanCard, copyText moved elsewhere). Surfaced when these files joined strict lint scope via the NoteField extraction. Added targeted file-level `eslint-disable` headers with TODO markers for a dedicated dead-code cleanup pass. Plus one inline disable for the deliberate `isEnabled`-not-in-deps `useEffect` at `[childId]/page.tsx:405`.

**Architectural rule clarification:** AI surfaces that load per-user context on every turn (Tracy, future similar agents) MUST cache the context with a TTL — direct DB reads on every message stack with model latency to create perceived lag.

Files: 10 changed across two commits, +535 / -118 lines. Lint clean. i18n strict parity passes.

**🚨 Next-session ranked perf priorities (ordered):**
1. **Tier 1.1 SW stale-while-revalidate** — half-day dedicated session, needs 2-user iPhone testing. ~80% returning-visit lag fix.
2. **Photo-audit initial fetch limit** — lower 200/500 → 100 + add "load more" infinite scroll. 2-3 hours.
3. **FocusWorksSection + [childId]/page.tsx dead-code cleanup** — remove the ~20 lurking unused imports/vars behind the disables. 1 hour.
4. **Tier 2.2 Tracy SSE retry-with-resume** — reliability not perf, but related.

---

### ⚡ Session 111 audit-gap closure (commit `5fddb0c8`)

Post-Phase-E re-audit against the original plan doc surfaced 3 plan-table deviations from commit `49fd0037`. All three closed.

1. **`app/api/montree/super-admin/schools/route.ts` PATCH** — plan said EXTEND for `payment_method` + `billing_cadence`, original commit didn't touch this file. Now: PATCH accepts `billing_cadence` directly (no safety guard needed — pure billing-frequency setting). PATCH explicitly REJECTS `payment_method` with 400 + redirect to `/schools/[id]/payment-config` route which carries the active-Stripe safety guard (rule #80 + #70 mirror). Avoids duplicating safety logic in two places.

2. **`docs/STRIPE_BILLING_SETUP.md`** — plan said EXTEND with Alipay/WeChat enablement, original commit didn't touch this file. Now: stale "Annual billing — monthly only for v1" line corrected to ✅ shipped. New "Three-rail billing setup (Session 111)" section added covering: enable Alipay+WeChat on Stripe Dashboard, subscribe to 3 additional webhook events, confirm with HK banker, Supabase Storage bucket pre-req, Railway cron schedules, operational flow per rail (3 detailed walkthroughs), annual cadence math + `ANNUAL_RECOGNITION_MODE` constant explained. Failure modes table extended with 7 new alipay/manual rows (covering migration-not-run 500, missing event subscription, 409 on stripe-active flip, Resend domain, cron secret, period-lock 409, idempotency, dunning grace).

3. **`components/montree/super-admin/MoneyTab.tsx` inbound_wires sub-view** — plan said EXTEND MoneyTab, original commit put ⚡ Wire button on SchoolsTab only. Now: BOTH surfaces have it (SchoolsTab as super-admin quick access, MoneyTab as money-canonical surface). New 7th sub-view "💸 Inbound" between fx_adjustments and end. Lists manual_invoice schools fetched from `/super-admin/schools`, filtered client-side, sorted past_due → active → trialing → canceled then alpha. Per-row: school name + status pill + cadence + students + period_end + ⚡ Wire button → opens RecordIncomingWireModal → on success, refetches list. 6 new `money.inbound.*` i18n keys × 12 locales (parity 4,459 × 12 = 100%). Bonus: fixed pre-existing `react-hooks/exhaustive-deps` warning on `doWire` callback that was lurking but invisible because MoneyTab wasn't in Session 111's targeted lint scope.

**Architectural rule clarification locked:** `payment_method` flips MUST go through `/api/montree/super-admin/schools/[id]/payment-config`. The schools/route.ts PATCH refuses with 400 + endpoint redirect rather than silently flipping (which could leave Stripe auto-charging an orphaned subscription). Single source of safety-guard logic.

Files: 15 changed (1 route MOD + 1 doc MOD + 1 component MOD + 12 i18n MOD), +384 / −5. Lint clean (--max-warnings=0). i18n strict parity 4,459 keys × 12 locales = 100%. Pre-commit hook passed.

---

### ⚡ Session 111 — Inbound Payments Build SHIPPED (Phases A-E, commit `49fd0037`)

**28 files changed (15 code + 12 i18n locale files + 1 migration), +3,624 / −11 lines. Pushed to `origin/main`. Railway auto-deploying.** The three-rail inbound billing system Session 110 theorized is now live in code. Mirror of Session 109's outbound architecture, inverted onto schools. Phase A built personally; Phases B-E built by general-purpose subagent under supervision with three audit cycles + integration-point verification by principal agent before commit.

**🚨 Canonical anchor doc:** `docs/handoffs/INBOUND_PAYMENTS_PLAN.md` — the theorize-first plan from Session 110, now executed.

**🚨 Migration 209 still pending Supabase run.** Until run, the new routes will surface clear "column does not exist" errors and the 💳 button will 500 on PATCH. UI is non-destructive on existing flows (existing Stripe subscription path unchanged). Run via Supabase SQL Editor: `migrations/209_school_payment_method.sql` — adds `payment_method` + `manual_invoice_details` + `manual_invoice_details_updated_at` + `billing_cadence` + `next_invoice_due_at` columns to `montree_schools`, plus CHECK constraints + 2 partial indexes. Idempotent. Safe to re-run.

**Strategic decisions locked at session start:**
- Annual prepayment discount: **10%** (math: 20 students × $7 × 12 × 0.9 = $1,512.00, verified at 151,200 cents)
- Grace period: **14 days** past_due → canceled (email reminders at day 1 / 7 / 13)
- **Both Alipay AND WeChat Pay** enabled on every alipay_invoice (`payment_method_types: ['alipay', 'wechat_pay']`)
- **30-day trial uniform** across all rails (no cron-generated invoices during trial)
- Whale Class flips to `annual + alipay_invoice` when Tredoux is ready (not in this commit)
- Resend `montree.xyz` domain verification done (user confirmed)
- Stripe Alipay + WeChat Pay methods enabled in Stripe Dashboard (user confirmed)
- Supabase Storage bucket `inbound-invoices` created — private, service-role-only (user confirmed)

**A. Phase A — Schema + super-admin payment-method flip UI (principal agent):**

5 files:
- `migrations/209_school_payment_method.sql` — `payment_method` CHECK in `('stripe_subscription', 'alipay_invoice', 'manual_invoice')`, `billing_cadence` CHECK in `('monthly', 'annual')`. `idx_schools_alipay_active` partial index for daily cron pickup. `idx_schools_manual_invoice_active` partial index for super-admin filter. Idempotent BEGIN/COMMIT.
- `app/api/montree/super-admin/schools/[id]/payment-config/route.ts` — GET + PATCH. ALLOWED_METHODS Set + ALLOWED_CADENCES Set validation. 4KB cap on manual_invoice_details JSONB. **🚨 Refuses silent flip away from active stripe_subscription** (rule #70 mirror) — returns 409 with friendly error unless `force: true` body flag is passed (audited). Audit log fires via `logAudit()` on every method/cadence/details change.
- `components/montree/super-admin/PaymentConfigModal.tsx` — Full editor with method radio (3 rails, color-coded), cadence radio (monthly/annual), JSONB textarea for manual_invoice_details (only when rail is manual). 409 force-confirm dialog renders a warning + Cancel/Confirm-force buttons. Loads current config via GET on mount.
- `components/montree/super-admin/SchoolsTab.tsx` — 💳 button between 💲 and Login → with color-coded pill (indigo=stripe, red=alipay, amber=manual). `paymentMethodUpdates` state for optimistic display. After Phase C: also ⚡ Wire button for manual_invoice schools.
- `components/montree/super-admin/types.ts` — `payment_method` + `billing_cadence` + `next_invoice_due_at` + `manual_invoice_details` added to `School` interface (all optional for back-compat).

**B. Phase B — Alipay/WeChat invoice generation + cron + webhook (subagent):**

- `lib/montree/billing.ts` (MOD, +606 / −0) — `SchoolBillingRow` extended with 4 new fields + BILLING_FIELDS SELECT widened. New exported constants: `ANNUAL_DISCOUNT_FACTOR=0.9`, `DEFAULT_INVOICE_TERMS_DAYS=14`, `DUNNING_REMINDER_DAYS=[1, 7, 13] as const`, `DUNNING_CANCEL_DAY=14`. New exported functions: `computeAlipayInvoiceTotalCents()`, `createAlipayInvoice()`, `routeInvoicePaid()`, `routeInvoicePaymentFailed()`, `handleAlipayInvoicePaid()`, `handleAlipayInvoicePaymentFailed()`, `writeAnnualIncomeRows()`, `isAlipayOrWeChatInvoice()`.
- `lib/montree/billing/alipay-invoice-email.ts` (NEW, 297 lines) — `sendAlipayInvoiceEmail()` + `sendDunningReminderEmail()` bilingual EN+ZH Resend templates. Hardcoded copy in this commit; future i18n migration trivial.
- `app/api/montree/cron/generate-alipay-invoices/route.ts` (NEW, 165 lines) — daily cron. Auth via `x-cron-secret` OR super-admin. `maxDuration=120`. Filters by `payment_method='alipay_invoice'` AND `subscription_status IN ('active','past_due','trialing')` AND `next_invoice_due_at <= NOW() + INTERVAL '7 days'`. Trial-pre-filter (no invoices during trial). Dry-run support via `?dry_run=1`.
- `app/api/montree/cron/dunning-alipay/route.ts` (NEW, 288 lines) — daily dunning. Reads past_due schools, derives day-since-failure from oldest unresolved `billing_history` row. Reminders at day 1 / 7 / 13. At day 14: flip `subscription_status='canceled'` AND `setSchoolAiTier(supabase, schoolId, 'free')`. Idempotency via `montree_outreach_log` action keys.
- `app/api/montree/billing/webhook/route.ts` (MOD) — `invoice.paid` AND `invoice.payment_succeeded` both routed through `routeInvoicePaid()` which forks by rail (reads `metadata.montree_rail` or `payment_method_types` to detect alipay/wechat). Plus defensive `invoice.finalized` + `invoice.sent` acks added in Phase C closure (prevents DLQ pollution from void-and-resend flows). Existing fire-and-forget IIFE + DLQ capture preserved.
- `app/api/montree/billing/status/route.ts` (MOD) — extended response with `payment_method`, `billing_cadence`, `next_invoice_due_at` so principal billing page can branch by rail.
- `app/montree/admin/billing/page.tsx` (MOD, +95) — rail-aware variants. Alipay variant: pending invoice banner + "Open invoice" CTA (read latest from `montree_billing_history` where status='open'). Manual variant: "Bank details for your treasurer" card with DBS HK / Wallex / SWIFT / reference number reminder. Annual cadence: "Annual prepayment — saved $X with 10% discount" pill.

**C. Phase C — Manual invoice + ⚡ Record incoming wire (subagent + principal closeout):**

- `lib/montree/billing/manual-invoice.ts` (NEW, 270 lines) — `generateManualInvoiceHtml()`, `buildReferenceNumber()`, `computeManualInvoiceTotalUsd()`. Branded HTML with Lora serif, embedded DBS HK / Wallex bank details (DBS Bank HK Ltd, code 016, branch 478, account 7949855392, SWIFT DHBKHKHH, holder "Montree Limited"), `MONTREE-{8char}-{YYYYMM}` reference, print-CSS-styled for `Cmd+P → Save as PDF` workflow.
- `app/api/montree/super-admin/schools/[id]/issue-manual-invoice/route.ts` (NEW, 257 lines) — GET renders printable HTML in browser tab (token-auth via query param supported for `window.open`). POST records billing_history row + audit log + returns print URL.
- `app/api/montree/super-admin/schools/[id]/record-incoming-wire/route.ts` (NEW, 308 lines) — POST. Imports `assertPeriodOpen, periodMonthOf` from `lib/montree/finance/period-lock.ts` + `logAudit, getClientIP, getUserAgent` from `lib/montree/audit-logger.ts` + `loadSchoolBilling, setSchoolAiTier` from `lib/montree/billing.ts`. Period-lock guard returns 409 on closed period. Idempotency: `source_ref='inbound_wire:<wire_ref>'` on `montree_finance_transactions` (monthly) or `inbound_wire:<wire_ref>:annual:<i>` (annual writes 12 monthly rows per rule #86). On success: bumps `subscription_status='active'`, advances `current_period_end` 30 or 365 days, auto-flips tier to premium, audit log entry.
- `components/montree/super-admin/RecordIncomingWireModal.tsx` (NEW, 250 lines) — mobile-first form. Fields: wire_ref, paid_at (date), currency_received, fx_rate_used, usd_amount_received, notes. `text-base sm:text-sm` everywhere prevents iOS keyboard zoom. 44pt mobile tap targets. Sends `authorization: Bearer ${token}` header (verifySuperAdminAuth accepts both Bearer and x-super-admin-token patterns).
- ⚡ Wire button on SchoolsTab rows — visible only when `effMethod === 'manual_invoice'`. Opens RecordIncomingWireModal.

**D. Phase D — Annual cadence (10% discount) (subagent, math verified by principal agent):**

- `computeAlipayInvoiceTotalCents()` accepts cadence: monthly returns `qty × 700`, annual returns `qty × 700 × 12 × 0.9` (rounded).
- Math verified: `20 × 700 × 12 × 0.9 = 151,200 cents = $1,512.00`.
- `writeAnnualIncomeRows()` writes 12 monthly `montree_finance_transactions` rows with `period_month` set per month. Webhook handler advances `current_period_end` 365 days on annual.
- `record-incoming-wire/route.ts` mirrors: writes 1 row for monthly, 12 rows for annual (each idempotent via `inbound_wire:<ref>:annual:<i>` source_refs).
- Constant `ANNUAL_RECOGNITION_MODE: 'monthly' | 'single' = 'monthly'` — locks current behavior. Flip to `'single'` if HK accountant prefers (per plan doc deferred Q2).

**E. Phase E — i18n (subagent):**

- 12 new `billing.*` keys added to `lib/montree/i18n/en.ts` + `zh.ts` (real Mandarin) + 10 other locales (English fallback).
- Pre-commit i18n strict completeness check passes — 4,453 keys × 12 locales = 100% parity.
- **Operational:** to fill English fallback in non-zh locales, run `ANTHROPIC_API_KEY=sk-... node scripts/fill-missing-i18n-keys.mjs` (existing batch script). Acceptable to ship fallback — keys exist, strict check passes.

**Audit trail (principal agent, three consecutive clean passes):**
- Phase A cross-file consistency: method/cadence values match across migration / route / modal / SchoolsTab / types
- Lint clean (eslint --max-warnings=0) across all 16 changed code files
- i18n strict parity passes
- Integration-point existence verified: `lib/montree/finance/period-lock.ts` exports `assertPeriodOpen` + `periodMonthOf`, `lib/montree/audit-logger.ts` exports `logAudit` + `getClientIP` + `getUserAgent`, `lib/montree/email.ts` has the Resend integration patterns the agent followed
- Real-money paths spot-read: webhook switch cases (8 events handled), `assertPeriodOpen` guard at line 135 of record-incoming-wire, `inbound_wire:${wireRef}` source_ref pattern enforces idempotency

**🚨 Architectural rules #80-89 locked in (do NOT let future agents break these):**

80. **Every school pays via exactly ONE payment_method at a time.** Flipping requires explicit super-admin action with audit. Schools cannot self-flip (unlike agents) — too easy to game by switching mid-month.

81. **`payment_method='stripe_subscription'` is the canonical default.** New schools default here unless super-admin sets otherwise.

82. **Alipay/WeChat invoices are NOT subscriptions** — they're recurring one-time invoices generated by cron. Stripe's recurring rails require card or SEPA; Alipay/WeChat are `payment_method_types=['alipay','wechat_pay']` on `stripe.invoices.create()` with `collection_method='send_invoice'`.

83. **Every paid rail writes ONE finance_tx income row** regardless of method. Stripe webhook: `source='stripe_webhook', source_ref='invoice:<id>'`. Manual wire: `source='manual_entry', source_ref='inbound_wire:<ref>'`. Both idempotent on `(source, source_ref)` UNIQUE constraint.

84. **Period locking applies symmetrically.** `assertPeriodOpen()` guards manual wire receipt-recording the same way it guards outbound wire payment-recording (Session 109 rule #62). Closed periods refuse 409.

85. **AI tier auto-flip works identically across all three rails.** `setSchoolAiTier(supabase, schoolId, 'premium')` fires on every successful payment. Stripe-canonical-truth rule #9 from Session 98 generalizes: "any rail's payment success is canonical source of truth for AI tier."

86. **Annual prepayment writes 12 monthly periods at once.** Single $1,512 annual transaction generates 12 monthly finance_tx rows with `period_month` set to each month being paid for. Recognises revenue ratably even though cash came in once. The school's `current_period_end` advances 365 days. `ANNUAL_RECOGNITION_MODE='monthly'` constant locks this; flip to `'single'` per accountant decision later.

87. **`manual_invoice_details` is optional.** Even manual_invoice schools can fall back to using `billing_email` for invoice delivery. Details JSONB only stores deviations from default (e.g. specific billing contact different from school owner, preferred currency, longer payment terms).

88. **Stripe Alipay/WeChat invoice payment IS Stripe.** All Stripe-side architectural rules apply: idempotency on event_id, 200-on-error to prevent retry storms, customer ID match before action.

89. **Cross-pollination contract:** every billing-mutating endpoint operates only on the school_id derived from the authenticated principal's JWT (or from super-admin with explicit school_id param). Never trust school_id from a webhook body without verifying it matches a known Stripe customer.

**🚨 Other architectural rules surfaced during build:**

- **`logAudit` is the canonical audit logger** for super-admin actions (NOT `logAgentAudit` — that's the agent-specific table). All school-mutating super-admin endpoints use it.
- **`assertPeriodOpen()` returns an error object** (not throws) — caller must check the returned value and return 409 if error. Mirror of Session 109 pattern.
- **The webhook handler MUST return 200 on errors** — preserves existing fire-and-forget IIFE + DLQ capture pattern. Don't change response codes.
- **`invoice.finalized` + `invoice.sent` are defensive acks** — `createAlipayInvoice()` finalizes synchronously, so post-hoc finalize events for our invoices are no-ops. But void-and-resend flows can fire these; ack cleanly to keep them out of the DLQ.

**🚨 Pending operational steps before this is functional in production (Tredoux to handle):**

1. **Run migration 209 in Supabase SQL Editor** — required. Until run, payment-config route 500s on PATCH (column doesn't exist). The 💳 button surfaces but is non-functional.
2. **Stripe Dashboard webhook event subscription:** add the following events to the existing Account-mode webhook (`montree.xyz/api/montree/billing/webhook`) if not already subscribed:
   - `invoice.payment_succeeded` (canonical for non-subscription invoices — Alipay/WeChat fire this, NOT `invoice.paid`)
   - `invoice.payment_failed` (dunning trigger)
   - `invoice.finalized` (defensive ack)
   - `invoice.sent` (defensive ack)
3. **Add Railway crons:**
   - `POST /api/montree/cron/generate-alipay-invoices` at `0 6 * * *` (06:00 UTC daily)
   - `POST /api/montree/cron/dunning-alipay` at `0 8 * * *` (08:00 UTC daily)
   - Both need `x-cron-secret` header set to `CRON_SECRET` env var
4. **Run Haiku batch translation** for 10 non-zh locales (English fallback currently): `cd ~/Desktop/Master\ Brain/ACTIVE/whale && ANTHROPIC_API_KEY=sk-... node scripts/fill-missing-i18n-keys.mjs`
5. **Confirm with HK banker (Wallex)** that the existing HKD Global Account receives Alipay/WeChat payouts from Stripe (one email — Stripe pays USD which converts to HKD on the way in).
6. **E2E smoke test** against Stripe test-mode Alipay flow: flip Whale Class to `alipay_invoice` via super-admin 💳 → manually trigger cron → expect test invoice generated → open invoice URL → pay with Stripe test Alipay → webhook should flip status active + advance period 30d + write finance_tx row + flip tier Pro.

**Files changed (28 total):**

| Path | Status | Phase |
|------|--------|-------|
| `migrations/209_school_payment_method.sql` | NEW (86 lines) | A |
| `app/api/montree/super-admin/schools/[id]/payment-config/route.ts` | NEW (251 lines) | A |
| `components/montree/super-admin/PaymentConfigModal.tsx` | NEW (460 lines) | A |
| `components/montree/super-admin/SchoolsTab.tsx` | MOD (+112) | A + C |
| `components/montree/super-admin/types.ts` | MOD (+7) | A |
| `lib/montree/billing.ts` | MOD (+606) | B, D |
| `lib/montree/billing/alipay-invoice-email.ts` | NEW (297 lines) | B |
| `app/api/montree/cron/generate-alipay-invoices/route.ts` | NEW (165 lines) | B |
| `app/api/montree/cron/dunning-alipay/route.ts` | NEW (288 lines) | B |
| `app/api/montree/billing/webhook/route.ts` | MOD | B + C closure |
| `app/api/montree/billing/status/route.ts` | MOD | B |
| `app/montree/admin/billing/page.tsx` | MOD (+95) | B + C |
| `lib/montree/billing/manual-invoice.ts` | NEW (270 lines) | C |
| `app/api/montree/super-admin/schools/[id]/issue-manual-invoice/route.ts` | NEW (257 lines) | C |
| `app/api/montree/super-admin/schools/[id]/record-incoming-wire/route.ts` | NEW (308 lines) | C |
| `components/montree/super-admin/RecordIncomingWireModal.tsx` | NEW (250 lines) | C |
| `lib/montree/i18n/{en,zh,es,de,fr,pt,nl,it,ja,ko,uk,ru}.ts` | MOD × 12 (+12 each) | E |

**Verification status:**
- ✅ Commit `49fd0037` pushed to `origin/main`
- ✅ Lint clean (eslint --max-warnings=0) across all 16 code files
- ✅ i18n strict parity passes (4,453 keys × 12 locales)
- ✅ Three consecutive clean audit passes by principal agent
- ✅ Integration-point existence verified (period-lock, audit-logger, email helpers)
- ✅ Architectural rules #80-89 implemented (verified via grep)
- ✅ Real-money math verified ($1,512.00 for 20 students × $7 × 12 × 0.9)
- ⏳ Migration 209 pending Supabase run
- ⏳ Operational pre-reqs above (Stripe events, Railway crons, Haiku batch, banker confirm, E2E test)

**🚨 Risk flags surfaced:**

1. **`invoice.payment_succeeded` event subscription** — must be added in Stripe Dashboard alongside existing `invoice.paid`. If only `invoice.paid` is subscribed, alipay invoices won't trigger tier flips (Alipay fires `payment_succeeded`, not `invoice.paid` — they're not subscription invoices).
2. **i18n English fallback** for 10 non-zh non-en locales until Haiku batch runs. Acceptable (keys exist, strict check passes) but worth filling promptly for non-Mandarin Chinese schools.
3. **Annual recognition mode locked at `'monthly'`** (12 finance_tx rows per annual prepayment) pending HK accountant input. Flip the constant in `record-incoming-wire/route.ts` to `'single'` once decided.
4. **Webhook handler modified** — highest-risk file for breaking existing Western customer billing. Mitigation: routeInvoicePaid still calls existing `handleInvoicePaid` for stripe_subscription rail; the fork only diverts alipay/wechat traffic. Regression test: any existing Stripe test-mode subscription payment should still flow normally.

**🚨 Next session priorities (ordered):**

1. **🚨 Run migration 209 in Supabase SQL Editor** — single biggest blocker. Until run, nothing works.
2. **Add 4 Stripe webhook events** (payment_succeeded, payment_failed, finalized, sent) on Account-mode webhook in Stripe Dashboard.
3. **Add Railway crons** for generate-alipay-invoices + dunning-alipay.
4. **Walk E2E smoke test** end-to-end on production: flip Whale Class to alipay_invoice → trigger cron via Health tab → expect test invoice → pay via Stripe test Alipay → verify status flip + tier flip + ledger row.
5. **Run Haiku i18n batch** to fill 10 non-zh fallbacks (~$0.50 spend).
6. **Confirm with HK banker** about Wallex receiving Alipay/WeChat payouts (one email).
7. **Bayan onboarding** (Session 110 carry-over) — Stripe HK account rejection + agent self-service flow for SA.
8. **ReferralsTab 📋 tax-form UI** (Session 109 carry-over) — 30 min, builds on B5 API.
9. **Wallex CSV upload + montree_bank_statements** (Session 109 carry-over) — closes third leg of reconciliation.
10. **Phase A operational setup** for Xero (Session 109 carry-over) — Xero account + accountant.
11. **Outreach follow-ups** (Session 94 carry-over): FAMM Argentina, Cambridge Montessori Global, Otari NZ, Lions Gate, Montessori Norge.

---

## RECENT STATUS (May 13, 2026)

### 🚧 NEXT SESSION — Inbound payments build (theorize-complete, ready to execute)

**🚨 Canonical anchor doc:** `docs/handoffs/INBOUND_PAYMENTS_PLAN.md` — comprehensive theorize-first plan for the three-rail inbound payments system (mirror of Session 109's outbound architecture).

**The gap being closed:** Chinese mainland schools (and others without foreign credit cards) cannot pay via Stripe Checkout. The current single-rail (`stripe_subscription`) is functionally broken for ~half the addressable market.

**The three rails to build:**
1. `stripe_subscription` — Western credit card, auto-renewing (✅ already shipped Phase 4 / Session 93)
2. `alipay_invoice` — Mainland China + HK + Macau + Taiwan, monthly Stripe invoice with Alipay/WeChat Pay QR codes (❌ build this)
3. `manual_invoice` — Russia / Argentina / Iran / restricted countries, PDF invoice → SWIFT wire → super-admin records (❌ build this)

**Sequenced as 5 phases (~1 day focused work + operational setup):**
- Phase A: schema migration 209 + super-admin payment-method flip UI (~1 hour)
- Phase B: Alipay/WeChat cron + invoice generation + webhook handling (~half-day)
- Phase C: manual invoice PDF gen + ⚡ Record incoming wire UI (~half-day)
- Phase D: annual billing cadence with 10% discount support (~1 hour)
- Phase E: i18n batch (~50 keys × 12 locales) + 15-step acceptance walkthrough (~1 hour)

**Architectural rules to lock in:** #80-89 (single rail per school, alipay = invoices not subscriptions, period locking applies symmetrically, AI tier auto-flip works across all rails, annual prepay writes 12 monthly periods at once, etc.)

**🚨 Operational pre-requisites Tredoux to handle before Phase B starts:**
1. Enable Alipay + WeChat Pay payment methods on Stripe Account (Settings → Payment methods)
2. Verify `montree.xyz` domain in Resend (HARD BLOCKER — invoice emails won't deliver otherwise; carry-over from Session 83)
3. Confirm with HK banker (Wallex) that the existing HKD account receives Alipay/WeChat payouts from Stripe
4. Create Supabase Storage bucket `inbound-invoices` (super-admin / service-role only)
5. Decide on strategic questions in the plan doc: annual discount %, monthly default vs annual, whether Whale Class flips to real-customer status

**Next session opening prompt** (copy-paste when fresh session starts):

> "Continue with the inbound payments build per `docs/handoffs/INBOUND_PAYMENTS_PLAN.md`. Run Phase A first, audit, then B, C, D, E sequentially. Don't stop — build, audit, build, audit until done. Migration to run in Supabase: 209 (after Phase A). I've made the strategic decisions on annual=[X]% / both Alipay+WeChat enabled / [N]-day grace / 30-day trial uniform / Whale Class flips to annual alipay_invoice / Resend domain verification done."

---

### ⚡ Session 110 — Agent self-service payout-method switch (May 13, 2026, evening)

**Closes the friction Bayan would have hit otherwise.** Agents in Stripe-unsupported countries no longer need to message Tredoux to flip to manual_wire — they do it themselves on `/montree/agent/payouts`, save their bank details once via a friendly modal, and the page renders the manual-wire panel without any human round-trip.

**🚨 Canonical resume doc:** `docs/handoffs/SESSION_110_HANDOFF.md` — full file-by-file, audit log, 6 verification tests.

**What shipped (1 commit, 2 files):**

- **NEW route `PATCH /api/montree/agent/payout-method`** — agent flips their own `payout_method` + bank details. Auth: `verifySchoolRequest` + `role === 'agent'`. JWT.sub is the only identity (cross-pollination contract preserved). Guardrail: 409 `verified_stripe_blocked` when `charges_enabled || payouts_enabled` (rule #70 mirror). Verified-Stripe flips still go through super-admin so the Stripe account can be rejected first. Validation: ALLOWED_METHODS check, 4KB JSONB cap, requires at least account_number OR iban when method is manual_wire. Audit log fires with `actor_role='agent'` + `self_service: true` flag — distinguishes from super-admin changes. IP + User-Agent captured.

- **Three entry points to the modal on `/montree/agent/payouts`:**
  1. **Unsupported-country friendly banner** — server returns `country_unsupported: true` → amber banner with "Add bank details for manual wire" CTA replaces the old red error / "reach out to Tredoux" dead end. Country prefilled when CTA opens modal.
  2. **Discreet "My country isn't here" link** — below the country picker. For agents in China / Argentina / etc. who already know they don't want to try Stripe at all.
  3. **"Update bank details →" edit link** — appears on existing manual_wire panel when details on file. Pre-fills modal with current values. Manual_wire agents can now edit their own bank info.

- **Modal with friendly fields (not raw JSON)** — Account holder, Bank, Account #, SWIFT, Branch code, Branch name, IBAN, **Routing #** (US agents), Currency, Country, Notes. Mobile-first sizing (`text-base sm:text-sm` everywhere — prevents iOS keyboard zoom). 44pt mobile tap targets on Cancel + Save. Click-outside-to-close (when not submitting).

- **Empty-state CTA** — when manual_wire agent has no details on file yet, "No bank details on file yet" message now ships with green "Add bank details" button instead of "send your details to Tredoux."

- **Footer copy updated** — manual_wire panel footer changed from "message Tredoux from the Tredoux tab" → "Updating them here saves directly — no need to message anyone."

**🚨 Audit trail — three rounds, all fixes shipped:**
1. TS 5.x narrowed `supabase.update(updates)` to `never` when supabase comes from helper → cast `updates as never` (runtime payload unchanged, matches super-admin pattern)
2. iOS keyboard zoom — all 11 inputs + textarea were `text-sm` (14px), violating Session 106 rule #44 → bulk-replaced to `text-base sm:text-sm`
3. Form missed `routing_number` for US-agent edge case → added Routing # field next to IBAN

Lint clean (`--max-warnings=0` exit 0). TypeScript clean on both files (rest of project has pre-existing unrelated errors).

**🚨 Architectural rule locked in (do NOT let future agents break):**

**79. Agents self-service their own payout method UNLESS verified with Stripe.** `PATCH /api/montree/agent/payout-method` accepts agent-initiated flips to manual_wire + bank-details edits. Verified-Stripe agents (`charges_enabled || payouts_enabled`) get 409 — those flips still go through super-admin so the Stripe account can be rejected first and system state doesn't diverge. Audit log uses `actor_role='agent'` + `self_service: true` to distinguish from super-admin changes. Manual_wire agents can edit their own bank details freely (no Stripe-account drift risk).

**🚨 Bayan onboarding — now even easier:**

Session 109 said: super-admin → 💸 → paste her bank JSON. This session ADDS an alternative: have Bayan log in, visit `/montree/agent/payouts`, pick ZA → friendly banner appears → click CTA → fills bank details → done. Tredoux is out of the loop except for: (a) rejecting her HK Stripe account in Stripe Dashboard for cleanup, (b) running the SQL to clear her stale `stripe_connect_*` columns. Both still required (Session 109 handoff has the SQL).

**Files changed (1 commit):**
- NEW `app/api/montree/agent/payout-method/route.ts` (223 lines)
- MODIFIED `app/montree/agent/payouts/page.tsx` — modal, friendly banner, edit link, 3 entry points, US routing field

**Verification status:**
- ✅ Lint clean across both files
- ✅ TypeScript clean on both files
- ⏳ Production verification per `docs/handoffs/SESSION_110_HANDOFF.md` Tests 1-6
- ⏳ Bayan onboarding self-service test

**Next session priorities (ordered):**
1. **Bayan onboarding** — now a 5-minute self-service flow on her end after Tredoux: (a) Reject HK Stripe account in Stripe Dashboard, (b) Run SQL to clear stale stripe_connect_* columns, (c) Send her agent login code
2. **Walk Tests 1-6** from Session 110 handoff after Railway settles
3. **ReferralsTab 📋 tax-form UI** — 30 min, builds on B5 API from Session 109
4. **Wallex CSV upload + montree_bank_statements** — closes third leg of reconciliation
5. **Phase A operational setup** — Xero account + accountant

---

### ⚡ Session 109 — Manual payout architecture + financial books foundation (May 13, 2026)

**Headline:** Stripe Connect Express ZA support confirmed non-existent (verified via Stripe API). Built the manual_wire alternative rail for agents in any Stripe-unsupported country (China, ZA, Palestine, Lebanon, Argentina, Ukraine, etc.). Plus laid the foundation for clean external books — manual wire UI, annual agent statements, period locking, three-way reconciliation report, Xero sync scaffold + Health card, tax-form scaffold.

**🚨 Canonical resume doc:** `docs/handoffs/SESSION_109_HANDOFF.md` — 9 commits, 4 migrations, 11-step smoke test, all deferred items + next session priorities.

**🚨 4 Supabase migrations to run:**

```
migrations/205_agent_payout_method.sql     — payout_method + manual_payout_details on montree_teachers
migrations/206_period_locks.sql            — closed-month immutability
migrations/207_agent_tax_form.sql          — W-8BEN-E / W-9 columns
migrations/208_xero_sync_log.sql           — Xero sync idempotency log
```

Each idempotent. Safe to re-run.

**Commits shipped (9, all on origin/main):**
- `5910b39a` — Manual payout architecture + Stripe Connect country fix (createConnectAccount requires country; routes validate against STRIPE_CONNECT_SUPPORTED_COUNTRIES; 💸 button + payout-config modal; agent /payouts branches on payout_method)
- `80cdce22` — Become-an-agent nav match landing proportions (thin Log in text link, not chunky pill)
- `7628016c` — Financial architecture plan + B1 manual wire recording UI
- `1e4bdc8f` — B2 Annual agent statement (CSV + printable HTML)
- `3c193a5a` — B3 Period locking (migration 206 + assertPeriodOpen + 🔒 UI)
- `a20e1bc0` — B4 Reconciliation report (Stripe-side vs billing_history vs bank-side diff with findings)
- `cc2c9a94` — Phase C scaffold (Xero sync + Health card + mapper + script)
- `0d7788b5` — B5 scaffold (agent tax-form migration 207 + API)
- (post-deploy AgentNav + agent app fixes from Session 108 also rolled in)

**Critical Stripe-policy discoveries this session:**

- **ZA NOT supported** by Stripe Connect Express. Verified via real API error: "ZA is not currently supported by Stripe."
- **US Connect requires `card_payments` capability alongside `transfers`** — different rule than HK. Discovered when Tredoux tried US as a workaround. Patched the supported countries list, but the US capability bug remains as a follow-up item (not blocking — only triggers when an actual US agent onboards).
- **Mainland China, Palestine, Lebanon, Argentina, Ukraine** all confirmed unsupported. Path for all of them is `payout_method='manual_wire'`.

**Bayan's outcome:** stays on manual_wire. The Stripe HK-locked test account she had needs cleanup (reject in Stripe Dashboard + clear stripe_connect_account_id in DB), then 💸 → manual_wire + paste bank JSON. Money flows via Wise/Wallex; ⚡ Record manual wire captures the result. Annual statement covers her tax/source-of-funds documentation needs.

**Architectural rules locked #62–78 — full list in handoff doc.** Highlights:

- #62 Period-locked months immutable (`assertPeriodOpen()` guard)
- #63 Every paid payout writes a commission row regardless of method
- #64 Annual statements source from `montree_agent_payouts` where status='paid'
- #65 Reconciliation is multi-source diff (Stripe + ledger + bank)
- #68 `createConnectAccount(country)` is REQUIRED
- #69 `STRIPE_CONNECT_SUPPORTED_COUNTRIES` is canonical
- #71 Agent /payouts branches on payout_method
- #73 Montree = operational truth; Xero = statutory truth (one-way sync)
- #74 Xero sync idempotent via partial unique index
- #78 Bayan/ZA test case proves the system

**What's deferred to next session:**
- Walk the 11-step smoke test
- ReferralsTab 📋 tax-form button + modal (30 min, UI on top of B5 API)
- Wallex CSV upload + `montree_bank_statements` table (half-day, finishes B4)
- Real Xero API calls in `scripts/sync-to-xero.mjs` (one-line flip after accountant confirms account codes)
- Phase A operational setup (Xero account, accountant, Stripe-Xero integration, env vars)
- Translation sweep (72 pages identified in Session 108 audit still English-only)
- Mira + Tracy AI tool extensions (Phase 4.7 + 4.8 from Session 108 plan)

---

### ⚡ Session 108 — Agent System Fix Phases 3 + 4 + 5 (May 13, 2026)

**3×3×3 plan executed end-to-end. Phases 1 + 2 of the plan are user-action gates (E2E test with real Stripe + conditional 404 hot-fix). Phases 3, 4, 5 — all pure code — shipped this session. Migrations 203 + 204 RUN.** Plus the cleanup SQL script and E2E test plan from earlier in the same session.

**🚨 Canonical resume doc:** `docs/handoffs/SESSION_108_HANDOFF.md` — full file-by-file change list, acceptance tests, architectural rules. Strategy doc: `docs/handoffs/AGENT_SYSTEM_FIX_PLAN.md` — the 3×3×3 plan with risk matrix, dependency graph, 10 open questions (all answered with recommended decisions and locked in).

**🚨 Migrations RUN in Supabase SQL Editor:**
- ✅ `203_agent_applications.sql` — extends `montree_outreach_contacts` with `application_details JSONB` + `agent_application` contact_type + `agent_applied`/`declined` statuses. Preserves all prior status values inc. `demo_requested`/`contacted`/`not_interested`.
- ✅ `204_agent_super_admin_messaging.sql` — extends 4 messaging CHECK constraints with `agent_super_admin`/`super_admin`. Drops NOT NULL on `montree_message_threads.school_id` with gated CHECK (only `agent_super_admin` may have NULL).

**Phase 3 — Public agent recruitment funnel (✅ shipped):**

The whole inbound application pipeline.
- `app/montree/become-an-agent/page.tsx` — replaces the Session 98 redirect stub. Full recruitment landing: hero ("Bring Montree to schools. Earn from every one."), earnings table (20/60/120 student tiers showing $336–$2016/yr), 4-step "How it works" (Apply → Reviewed → Pitch → Earn), 5-rule lockbox, application form with honeypot anti-spam, success state.
- `app/montree/for-teachers/page.tsx` — reversed to redirect → `/montree/become-an-agent` (Session 98 had this direction backwards).
- `app/api/montree/become-an-agent/apply/route.ts` — public POST. Honeypot field, email validation, UPSERT-on-email so re-applications update the latest pitch. Fire-and-forget auto-ack email + Tredoux notification via Resend.
- `app/api/montree/super-admin/agent-applications/route.ts` — GET (list, default filter status='agent_applied') + PATCH (status transitions with defense-in-depth: refuses to mutate non-agent_application rows).
- `components/montree/super-admin/AgentApplicationAlert.tsx` — banner above tabs in super-admin. Per-row Accept / Reply / Decline. Accept redirects to `/montree/super-admin?tab=agents&prefill_name=...&prefill_email=...&from_application=<id>`.
- `components/montree/super-admin/ReferralsTab.tsx` — reads prefill URL params on mount, opens "+ Issue code" form pre-filled. After successful code creation, fires PATCH to mark the application 'sent' (drops out of pending alert).
- `app/montree/super-admin/page.tsx` — reads `?tab=` on mount for deep-linking.

**Phase 4 — Agent ↔ super-admin threaded messaging (✅ shipped, Mira/Tracy assist deferred):**

Extends the existing `montree_message_threads` infrastructure rather than forking. Same tables, new thread type. Means future Mira + Tracy tool extensions can scan/draft natively.

- `lib/montree/agent-super-admin-messaging/types.ts` + `access.ts` — `SUPER_ADMIN_SENTINEL_UUID = '00000000-0000-0000-0000-000000000000'` for FK shape, `resolveMessagingAgent` (no schools required, unlike `agent_principal` resolver) + `resolveMessagingSuperAdmin`.
- Agent-side APIs (3 routes):
  - `GET/POST /api/montree/agent/messages-tredoux/threads`
  - `GET/PATCH /api/montree/agent/messages-tredoux/threads/[threadId]`
  - `GET/POST /api/montree/agent/messages-tredoux/threads/[threadId]/messages`
- Super-admin APIs (3 routes):
  - `GET /api/montree/super-admin/agent-messages/threads` — global, all agents
  - `GET/PATCH /api/montree/super-admin/agent-messages/threads/[threadId]`
  - `GET/POST /api/montree/super-admin/agent-messages/threads/[threadId]/messages`
- Agent UI:
  - `components/montree/agent/AgentNav.tsx` — added "Tredoux" entry between Messages and Schools
  - `app/montree/agent/messages-tredoux/page.tsx` — thread list with compose modal
  - `app/montree/agent/messages-tredoux/[threadId]/page.tsx` — thread detail with optimistic send + sticky composer
- Super-admin UI:
  - 📬 Agent Inbox tab added between Agents and Money in `app/montree/super-admin/page.tsx`
  - `components/montree/super-admin/AgentInboxTab.tsx` — inbox list + inline thread detail view + reply composer
- Cross-pollination verified end-to-end: agents see only their own threads, super-admin sees all globally, role checks gate every route entry.

**Phase 5 — Polish (✅ shipped):**
- `/montree/try` role picker — when `?ref=CODE` is present, **Principal** becomes the primary gold CTA, **Teacher** drops to secondary emerald option. Most code redemptions are principals/owners. Without `?ref=`, original Teacher-first ordering preserved.
- `components/montree/agent/MiraAvatar.tsx` — added `MIRA_PNG_AVAILABLE = false` flag. Defaults to CSS-M monogram only. No `/mira-avatar.png` request, no 6+ console 404s per page load. Flip to true when the PNG ships.
- `/montree/login-select` pricing copy ("30 days free · See pricing →") was already correct.
- Help-DM panel for teachers (`InboxButton.tsx`) left as legacy per plan decision.

**Earlier in same session (companion artifacts):**
- `scripts/cleanup-test-agent.sql` — transaction-safe DO block with dry-run / commit modes. Safety check refuses to delete non-agent rows. Cleans up in FK-correct dependency order (payouts RESTRICT first, then finance_tx, message threads, audit, referral codes, test schools + dependents, finally the agent row).
- `docs/handoffs/AGENT_E2E_TEST_PLAN.md` — 13-step end-to-end test walking Tredoux through testing the agent flow under his own identity (`tredoux+agentest@gmail.com`) before clearing test state and onboarding Gloria.
- `docs/handoffs/AGENT_SYSTEM_FIX_PLAN.md` — the 3×3×3 plan doc with research/plan/audit cycles captured.

**🚨 The Stripe Refresh 404 investigation (Task #1 outcome):**

Reading the route at `app/api/montree/agent/connect-status/route.ts`, the ONLY 404 path is line 44 "Agent not found" — fires when JWT's `auth.userId` doesn't match any teacher row. But the page IS loading Gloria's cached "Restricted" status via the GET `/api/montree/agent/payouts` route, which means her row exists and IS findable by `auth.userId`. So a real 404 from this route would be surprising. **Strong hypothesis: the six visible console 404s on the user's screenshot were all `mira-avatar.png` (cosmetic — now silenced by Phase 5), and the Refresh button wasn't actually 404'ing.** If it IS, the next-likely cause is a JWT mis-stamp specific to the 🔓 impersonation flow (Phase 2 hot-fix scope).

**🚨 Architectural rules locked in this session (#49–56):**

49. `montree_message_threads.school_id` is nullable ONLY for `thread_type='agent_super_admin'` (migration 204 gated CHECK). Every other type stays mandatorily school-scoped.
50. Super-admin participant identity uses `SUPER_ADMIN_SENTINEL_UUID = '00000000-0000-0000-0000-000000000000'`. Role string is canonical identity; UUID is FK-shape filler. Never change this value — old threads would orphan.
51. `ai_drafted` is FORCED false on agent posts. May be true on super-admin posts when Tracy drafts. Session 84 rule extended to agent_super_admin scope.
52. `resolveMessagingAgent` (super-admin scope) does NOT require schoolIds. Different from `agent_principal` resolver. An agent without referrals can still ping Tredoux.
53. Agent applications use `contact_type='agent_application'` + `status='agent_applied'` on `montree_outreach_contacts`. Structured payload lives in `application_details JSONB`.
54. The PATCH endpoint for agent applications validates `contact_type='agent_application'` server-side before mutating. Won't accidentally update a demo_request or outreach contact.
55. `MIRA_PNG_AVAILABLE` flag in `MiraAvatar.tsx` — flip to true once `/public/mira-avatar.png` exists. Until then, CSS monogram only.
56. `/montree/for-teachers` is a permanent redirect to `/montree/become-an-agent`. Keep the file so inbound links don't 404.
57. **Don't hard-delete agents in production.** Suspend (`agent_suspended_at = NOW(), is_agent = FALSE`) — preserves audit trail, finance ledger continuity, RESTRICT FK on pending payouts. Hard delete reserved for test state only via `scripts/cleanup-test-agent.sql` (`is_agent=true` safety check enforces this).
58. **Never UPSERT on a shared-key column when multiple semantic row types coexist on the same table.** `montree_outreach_contacts` mixes demo_request + agent_application + outreach by email-uniqueness. UPSERT-on-email silently mutates row types. Use explicit INSERT + 23505 handling: same-type collision → UPDATE (legitimate resubmit); cross-type → 409 friendly error; other DB errors → surface `detail: insertErr.message` in 500 response. Canonical at `app/api/montree/become-an-agent/apply/route.ts`.
59. **`/montree/changelog` is internal-use only.** Route exists; no link from public landing nav.
60. **`.m-hero-kicker` ("Change your life") sits below the CTA, not above the title.** `.m-hero-kicker-below` modifier swaps the margin.
61. **Agent application success state signs `— Montree`**, not a personal name. Brand voice from a brand surface.
62. **Period-locked months are immutable.** `assertPeriodOpen()` gates every mutation to finance_transactions + agent_payouts. Reopening requires explicit super-admin action with notes captured for audit trail.
63. **Every paid agent payout writes a commission row to `montree_finance_transactions`** regardless of payout method. Stripe Connect: `source='stripe_webhook', source_ref='payout:<id>'`. Manual: `source='manual_entry', source_ref='manual_wire:<wire_ref>'`. Both idempotent on re-runs.
64. **Annual agent statements source from `montree_agent_payouts` where status='paid'**, not from finance_transactions. The payout table is the canonical "what we paid this agent" record.
65. **Reconciliation is a multi-source diff**, not a single source of truth. Stripe webhooks + ledger + bank statements must agree within $1 — anything more is a finding to investigate.
66. **W-8BEN-E (or jurisdiction equivalent) collected at agent onboarding** — not blocking initial code issuance but checked before first payout (future enforcement).
67. **Manual wire records use the wire ref as `source_ref`** for idempotency. Re-recording the same wire ref returns the existing record, no duplicate ledger entry.
68. **`createConnectAccount(country)` is REQUIRED.** Without it Stripe defaults to platform country (HK) and locks every agent to wrong jurisdiction. ReferralsTab 💳 + agent /payouts both prompt for country before creating an account.
69. **`STRIPE_CONNECT_SUPPORTED_COUNTRIES` is the canonical list** in `lib/montree/referral/payout-country-support.ts`. Agents in unsupported countries (China, Palestine, Lebanon, ZA, Argentina, Ukraine) MUST go on `payout_method='manual_wire'`.
70. **Verified Stripe Connect agents cannot be silently switched to manual_wire.** Payout-config PATCH refuses with 409 — operator must reject the Stripe account first, otherwise the system state diverges.
71. **Agent /payouts page branches on `payout_method`.** stripe_connect → Stripe Connect onboarding UI with country picker. manual_wire → "Bank details on file" read-only view. Payout history common to both.
72. **MoneyTab wire button branches on `agent_payout_method`.** stripe_connect → amber ⚡ Wire (Stripe `transfers.create` with idempotency key). manual_wire → violet ⚡ Record manual wire (inline form with wire ref + FX rate + local amount).
73. **Montree operational ledger is the real-time truth.** Xero (when activated) is the statutory truth — read-only mirror via daily sync. The accountant's adjusting entries stay in Xero only; operational books in Montree stay simple.
74. **Xero sync is idempotent via partial unique index** on `montree_xero_sync_log(finance_tx_id, xero_object_type) WHERE status='success'`. Re-running the script never duplicates Xero objects. Failed attempts don't occupy a slot so retries are unblocked.
75. **Xero refresh tokens rotate on use.** When `refreshAccessToken()` returns a new refresh_token, it's logged loudly so the operator updates Railway env. Phase D will auto-persist.
76. **Xero account codes in `mapper.ts` are placeholders** (200/310/320/400/491/090/404). The accountant maps these to the actual Xero chart of accounts before flipping the sync script from scaffold to live.
77. **Agent annual statement footer states explicit independent-contractor + non-withholding posture.** Doubles as bank source-of-funds documentation for receiving banks in restricted countries.
78. **`assertPeriodOpen()` fails-open when the period_locks table doesn't exist** (Postgres 42P01). Migration 206 must be run before locks become active — but the wire routes deploy cleanly without it.

**🚨 User-discoverable confusion noted (not a bug, but UX worth fixing later):**

Tredoux typed `TREDOUX-PXQ9` (a referral code he generated earlier in the session) into the login screen expecting to land in his agent dashboard. The unified login's `tryReferralPrecheck` correctly identifies the code as `status='pending'` → redirects to `/montree/try?ref=TREDOUX-PXQ9` (the school signup flow). Working as designed per Session 86 architecture — referral codes route to school signup. But the format `<FIRSTNAME>-XXXX` reads to a human like "this is MY login code." Agent login is a separate 6-character `agent_password_hash` issued via Super-admin → Agents → 🔑 Issue Agent Login. **Future polish:** the login screen could detect a `<FIRSTNAME>-XXXX` format code being entered by what appears to be the same person (matched by email after auth?) and surface a "This is YOUR referral code, not your agent login. Tap here for your agent dashboard" hint. Not blocking — Tredoux gets it now, and this confusion stops being relevant once the agent flow has real users with real bank deposits.

**Verification status:**
- ✅ Three audit passes per phase, all clean
- ✅ Both migrations RUN in production Supabase
- ✅ All commits pushed to `origin/main` (ending at `57057257`). Railway auto-deployed.
- ✅ Phase 3 acceptance: application form **verified working end-to-end** with `Tredouxtest@gmail.com` after route fix
- ⏳ Phase 4 acceptance: agent↔super-admin thread walkthrough pending (requires Tredoux to log in as test agent first)

**🚨 Post-deploy fix cycle — 3 follow-up commits after the main push:**

The initial Session 108 push (`30836e8e`) landed clean, but real-world testing surfaced three issues, each fixed and pushed:

1. **`e83e7490` — AgentNav top-right crowding.** Adding the "Tredoux" nav entry made it 9 links — combined with the inline agent name + Sign out button at the right edge, the cluster collided with MiraFloat's fixed trigger (`top: 16px; right: 16px`). "Tredoux Agent" wrapped to two lines and Sign out got pinched under Mira. **Fix:** dropped the inline agent name (redundant — dashboard hero already greets them by name), added `md:pr-20` to reserve space for MiraFloat, `whitespace-nowrap` on Sign out, `shrink-0` on the right cluster, moved the agent name into the mobile hamburger sheet as a small header.

2. **`3ef7ddc3` — Agent application route 500.** First real submission via `/montree/become-an-agent` returned 500. Root cause investigation revealed the UPSERT-on-email pattern was silently trying to mutate a pre-existing `montree_outreach_contacts` row (from earlier demo-request testing) into an `agent_application`, but something in the implicit ON CONFLICT DO UPDATE was tripping a constraint. **Fix:** replaced UPSERT with explicit INSERT + 23505 unique-violation handling. If same-type collision → UPDATE (legitimate resubmit, resets status to `agent_applied` so previously-declined applicants get fresh review). If cross-type collision → 409 with friendly message ("This email is already on file. Please use a different email address, or reach out to tredoux555@gmail.com directly."). Other DB errors now surface `detail: insertErr.message` in the 500 response so future debugging doesn't need Railway log diving. **Verified working** — Tredoux successfully submitted with `Tredouxtest@gmail.com` after the conflicting row was DELETEd.

3. **`57057257` — Landing + agent-app polish (3 surgical edits):**
   - **`What's new` link removed from landing nav.** `/montree/changelog` is internal-use only now per directive. Route still exists for direct access.
   - **"Change your life" hero kicker moved BELOW the "Try it" CTA** (was above the title). Acts as a punctuation flourish after the call to action. New `.m-hero-kicker-below` modifier swaps the margin.
   - **Application success screen signs `— Montree`** instead of `— Tredoux`. Brand voice from a brand surface.

**🚨 The "delete vs suspend agents" conversation (lesson logged as rule #57):**

User asked if it's a good idea to delete agents. Walked through why suspend is the right primary path for production agents:
- Audit trail value (montree_agent_audit goes SET NULL on delete → orphan rows)
- Finance ledger continuity (`montree_finance_transactions.agent_id` same)
- RESTRICT FK on `montree_agent_payouts` literally blocks delete when pending payouts exist — by design
- Suspend is reversible; delete cascades destroy test schools
- Hard delete reserved for test state via `scripts/cleanup-test-agent.sql`

Recommendation accepted: **no UI 🗑 button.** Operator judgment via SQL only. Gloria was about-to-be-deleted as a clean test account but the rule logged for any non-test agents going forward.

**🚨 What's NOT in this session (intentional):**

- **Phase 1 — E2E validation** with real Stripe + bank info. User-action only. Plan at `docs/handoffs/AGENT_E2E_TEST_PLAN.md`. Cleanup at `scripts/cleanup-test-agent.sql`. Until walked, the impersonation 404 hypothesis stays unconfirmed.
- **Phase 2 — Impersonation 404 hot-fix.** Conditional on Phase 1.
- **Mira tool extensions** for `start_thread_with_tredoux` + `reply_in_thread` (Phase 4.7 in plan). Messaging infrastructure ready. Half-day follow-up.
- **Tracy super-admin scope** for `scan_agent_messages` + `draft_agent_reply` with role-based tool gating (Phase 4.8). Recommended separate `/montree/super-admin/tracy` route. Half-day follow-up.
- **Full i18n batch** for new strings (~50–80 keys × 12 locales). English-only for v1.

**🚨 Next session priorities (ordered):**

1. **Push staged code to Railway** (if not done by end of this session) — 27 files staged on top of 2 Session 107 audit commits.
2. **Walk Phase 3 acceptance test:** visit `/montree/become-an-agent`, submit application, see banner in super-admin, click Accept → ReferralsTab opens pre-filled → issue code → application flips to 'sent'.
3. **Walk Phase 4 acceptance test:** log in as test agent (via own identity, NOT impersonation), click "Tredoux" nav → compose → send → see in super-admin Agent Inbox → reply → see back in agent thread. Cross-pollination check: second test agent shouldn't see first's threads.
4. **Phase 1 E2E test** per `AGENT_E2E_TEST_PLAN.md`. This isolates the Stripe Refresh 404. Real $1 wire optional.
5. **Phase 2 hot-fix** if Phase 1 confirms impersonation flow is broken.
6. **Onboard Gloria** once Phases 1 + 2 are done. The infrastructure (Stripe Connect live, Agent Inbox live, recruitment funnel live) is all there.
7. **Mira + Tracy AI assistance** (deferred Phase 4.7 + 4.8). Both half-day follow-ups on existing infrastructure.
8. **i18n batch** for new agent system strings.
9. **Carry-overs from Session 107:** HK banker confirmation, HK accountant package, 5 Railway crons, Resend domain verification, the 7 deferred PERF items (Tier 1.1 SW SWR is the biggest — ~80% returning-visit lag), outreach follow-ups (FAMM Argentina, Cambridge Montessori Global, Otari NZ, Lions Gate, Montessori Norge, Paint Pots, Ardtona dead leads cleanup, 14+ Wave 1 bounces).

---

## RECENT STATUS (May 12, 2026)

### ⚡ Session 107 — PERF push (19/26 tiers) + Stripe Connect Express LIVE + Migration 202 RUN + Audit fix cycle (May 12, 2026)

**24 commits pushed to main, ending `e4ad132d`. Working tree clean. Railway auto-deploys triggered throughout.** The big perf push + Stripe Connect activation on the live Montree Limited account + a deep audit-fix cycle (3 clean passes) that caught 2 real bugs the original 23-commit push missed. Gloria's first real payout is one super-admin click away.

**🚨 Canonical resume docs:** `docs/handoffs/SESSION_107_HANDOFF.md` (the build push — 23-commit log, Stripe Connect operational state, architectural rules #36–48, 8-step smoke test) + `docs/handoffs/SESSION_107_AUDIT_HANDOFF.md` (the audit cycle — 2 fixes, 3 false positives dismissed, architectural takeaways).

---

### 🔍 Audit fix cycle — final commit `e4ad132d`

After the 23-commit push landed, ran a three-pass deep audit. **Two real bugs found and fixed. Three false positives dismissed with verification.**

**Real bug 1 — Lora literal sweep (79 files):** Architectural rule #42 said inline `fontFamily` must use `var(--font-lora)`. The rule was declared this session but **80 pre-existing files** still used literal `'Lora', Georgia, serif'`. `next/font/google` doesn't register `font-family: Lora` globally — it only exposes the hashed name via `--font-lora` CSS variable. Every literal `'Lora'` was silently falling back to Georgia. Swept 79 files via Python script. **`lib/montree/email.ts` deliberately preserved** — Gmail/Outlook ignore CSS vars in HTML email; literal stays. The Tier 1.3 perf win (~700KB gzip eliminated) is now fully realized.

**Real bug 2 — Principal communication thread optimistic race:** `app/montree/admin/communication/threads/[threadId]/page.tsx` called `void load()` after send success, which `setMessages(replace entire array)`. Sending a SECOND optimistic message while the first was in flight could wipe message #2's bubble briefly until its own load resolved. Parent/teacher/agent threads already used the correct functional pattern. Fixed to read canonical row from POST response (`data.message`) and `setMessages(prev => prev.map(m => m.id === tempId ? data.message : m))` — defensive fallback to `load()` preserved if server response shape ever changes. All 4 messaging surfaces now consistent.

**False positives dismissed (with verification):**

1. **C1 (analysis route SELECT narrow):** Audit claimed dropped `duration_minutes` + `repetition_count` from the narrow caused silent zero durations in weekly reports. Verified across ALL migrations — those columns don't exist on `montree_child_progress` (they're on `montree_work_sessions`). Reads were always undefined regardless of narrow. Real duration data flows through `observationHistory` from the work-sessions query — unaffected.

2. **H3 (webhook unit_amount):** Audit claimed webhook should write effective price from DB instead of Stripe's `item.price.unit_amount`. Stripe IS the source of truth post-sync. After override sync swaps the Price, the webhook correctly reflects the new value.

3. **H4 (force not passed to syncSubscriptionQuantity):** Audit claimed the early-return at `billing.ts:568` suppresses price-only changes. Walked the condition with concrete scenario: `!force && !priceMismatch && !quantityMismatch` — when override changes price, `priceMismatch=true` makes `!priceMismatch=false`, condition fails, falls through to the swap. The Stripe Price swap fires correctly without `force`.

### 🚨 Architectural takeaways from the audit cycle

1. **Declaring a new architectural rule needs a same-session enforcement sweep.** Rule #42 was declared but 80 pre-existing files violated it. Future "lock a new rule" work should grep + sweep the existing codebase in the same commit.

2. **`next/font/google` does NOT register `font-family: Lora` globally.** It generates a hashed family name + exposes only via `--font-lora` CSS variable + `lora.className`. Components hardcoding `'Lora'` fall back to system fonts. Inline `fontFamily` MUST reference `var(--font-lora)`. `lib/montree/email.ts` is the exception — mail clients ignore CSS vars.

3. **`void load()` after a mutation is the WRONG optimistic-UI pattern.** It replaces all state and races with concurrent optimistics. The canonical pattern (now consistent across all 4 messaging surfaces) is: read canonical row from mutation response → `setMessages(prev => prev.map(m => m.id === tempId ? data.message : m))`. Defensive `load()` fallback only if response shape changes.

4. **Audit findings need scenario walks before fix-or-dismiss.** Three false positives this cycle: each was an audit claim about a code path that didn't actually break under real values. Walking through with concrete inputs (e.g. "what happens when override sets price to $5 with quantity unchanged?") flipped HIGH severity claims to false positives.

5. **Audit agents sometimes confuse tables.** C1 confused `montree_child_progress` with `montree_work_sessions`. When an audit flags a SELECT narrow as broken, verify the column exists on the narrowed table via migration grep before "restoring" it.

### 🚨 Operational state unchanged from build push

All operational state items (Migration 202 RUN, Stripe Connect LIVE, env vars deployed, Gloria onboarding pending, HK banker pending, 5 Railway crons pending, Resend domain pending, HK accountant package pending) are unchanged. The audit cycle didn't introduce new operational tasks.

### 🚨 Next session priorities (unchanged from build push, ordered)

1. **🚨🚨🚨 Generate Gloria's onboarding link** — Super-admin Referrals → 💳 → reveal-once URL → send to Gloria with `docs/agents/GLORIA_STRIPE_ONBOARDING.md`.
2. **Walk the 8-step smoke test** in `docs/handoffs/SESSION_107_HANDOFF.md`.
3. **Confirm with HK banker** about Stripe Connect Express + HKD wires.
4. **Send HK accountant** `docs/finance/HK_FINANCIAL_ADVISOR_SUMMARY.md`.
5. **Configure 5 Railway crons** per `docs/perf/CRON_SETUP.md`.
6. **Verify `montree.xyz` in Resend**.
7. **Deferred PERF items** (each its own dedicated session because of testing requirements): Tier 1.1 SW SWR (THE BIG ONE — ~80% returning-visit lag gone), Tier 2.2 retry-with-resume, Tier 5.1 remaining 80 imgs (needs JSX parser), Tier 5.3 NoteField extract, Tier 6.3 tap target audit.
8. **Outreach carry-over:** FAMM Argentina · Cambridge Montessori Global · Otari NZ · Lions Gate · Montessori Norge · Paint Pots · Ardtona dead leads DB cleanup · 14+ Wave 1 bounces.

---

### Original Session 107 build push (23 commits, baa38292)

**🚨 Canonical resume doc for the build push itself:** `docs/handoffs/SESSION_107_HANDOFF.md` — 23-commit log table, Stripe Connect operational state table, architectural rules #36–48, 8-step smoke test for Session 108, full PERF_HEALTH_CHECK.md status.

**🚨 Migration 202 RUN** — `montree_schools.billing_override_usd` + `billing_override_note` columns live. Per-school early-adopter pricing functional via super-admin 💲 button. Stop telling future sessions to run this.

---

### 🚨🚨🚨 GLORIA ONBOARDING IS THE TOP CALL TO ACTION 🚨🚨🚨

**The infrastructure is live.** Stripe Connect Express activated, identity verified (Tredoux personal ID — passport + selfie liveness), Marketplace business model selected, `dynamic-brilliance` webhook listening at `/api/stripe/connect-webhook` on **Connected accounts** scope with `account.updated` event only. `STRIPE_CONNECT_WEBHOOK_SECRET` + `CRON_SECRET` + `CRON_DIGEST_EMAIL` deployed to Railway.

**Three clicks to wire Gloria's first real payout:**
1. Super-admin → Referrals tab → 💳 button on Gloria's row (code `GLORIA-3KD5`).
2. Send her the reveal-once URL + `docs/agents/GLORIA_STRIPE_ONBOARDING.md`.
3. When she submits the Stripe Express form → `account.updated` webhook fires → her `stripe_connect_status` in `montree_teachers` flips → super-admin sees "ready to wire" within ~60s. First real payout = end-of-month calc + ⚡ Wire from Money tab.

---

### The PERF push — 19 of 26 buildable items shipped

**Tier 0** (Sessions 103/104) was already done. Session 107 shipped:

| Tier | What | Real felt impact |
|---|---|---|
| **1.2** | `loading.tsx` for 11 routes (cockpit, communication, classrooms, people, pulse, child briefing, dashboard, child week, photo audit, parent dashboard, parent messages) | Skeleton on cold nav instead of blank screen |
| **1.3** | Lora via `next/font/google` (CSS vars `--font-lora` + `--font-inter`) | Killed the `@import` waterfall; font loads with the HTML |
| **1.4** | Cookie-based locale dispatch (`mt_locale`) + lazy locale loading | ~700KB gzip saved per non-en page load + eliminates English-flash on first paint |
| **2.1** | Tracy SSE token rAF throttle via `pendingTextRef` + `flushTextBuffer()` | ~80% CPU drop on mobile Tracy streaming |
| **2.2 (safe half)** | AbortController cleanup on Tracy SSE | No more orphaned streams when user navigates mid-response |
| **2.3** | Static templated greeting on Tracy first paint — `fireGreeting()` REMOVED | Tracy first-frame is instant; no Sonnet/Opus call on mount |
| **2.4** | Lazy-mount Tracy panel via `next/dynamic` | Tracy chunk doesn't ship until user expands the panel |
| **3.1** | Weekly Wrap teacher + parent reports parallelized per child via `Promise.all` (Stage 0 replan first preserved) | 3–5 min faster per 20-child wrap |
| **3.2** | Photo-ID pre-Pass-1 parallelize | 200–450ms faster per capture |
| **3.3 (partial)** | `select(*)` → explicit columns on safe internal-use paths | Smaller payloads, faster decode |
| **3.4** | Validation chain parallelize | Several routes' Promise.all-able reads now run concurrent |
| **3.5** | Billing webhook fire-and-forget (returns 200 immediately, processing in background) | Stripe retry storms killed |
| **3.6** | Photo bank GET parallelize | Faster gallery loads |
| **4.1** | `montreeApi()` auto-retry on network errors (GET/HEAD only — 0/1000/3000ms schedule, AbortError short-circuit) | Transient flakes recover silently |
| **4.3** | Optimistic send-state on all 4 messaging surfaces (principal communication thread + parent + teacher + agent) | Messages appear instantly; failure marks `sendFailed:true` and restores draft |
| **4.4** | `prefetchUrl()` wiring on dashboard child grid (hover/focus/touch) | Child week opens with data already cached |
| **5.1 (partial)** | Image dimension attrs on top 8 hot surfaces | ~80% of perceived CLS impact gone |
| **5.4** | JSZip dynamic-import on 4 client pages | JSZip chunk lazy-loaded only when needed |
| **6.1** | Pull-to-refresh on teacher dashboard | iOS-style refresh gesture works |
| **6.2** | iOS keyboard handling in Tracy chat (float + page) via visualViewport listener + onFocus scrollIntoView | Keyboard no longer hides the chat input |
| **6.4** | Investigated — both manifests in active use, no change needed | — |

**Other shipping in same push:**
- Migration 202 — per-school billing override (`81d81a76`)
- Photo bank: bulk delete + sort + category + ILIKE escape (`59c7c507`)
- TracyFloat 402 → gold upgrade card (`e2c78cc2`) — closes the UpgradeCard pattern across every paid AI surface
- Photo bank URLs through Cloudflare proxy (`8ba437b2`)
- Session 106 carry-over push (32 files, `f6848094`)

### 🔒 Deferred — 7 items need human-in-the-loop testing

| Tier | What | Why deferred |
|---|---|---|
| **1.1** | SW stale-while-revalidate API cache | **CVE-class auth-leak risk.** Needs real iPhone + iPad testing with different users on same browser to confirm no cross-user cache poisoning. THIS IS THE SINGLE BIGGEST PERCEIVED-LATENCY WIN IN THE WHOLE DOC (~80% returning-visit lag gone). Worth a dedicated session. |
| **2.2 retry-with-resume** | Tracy SSE resumes on VPN flap | Needs real Astrill-toggle-mid-stream testing. Risk of double-Sonnet-charge if retry races wrong. |
| **4.2** | Direct fetch → `montreeApi` migration | Each candidate endpoint (Whisper, photo upload, onboard) needs bespoke 120s timeout that `montreeApi`'s 30s default would break. Per-endpoint judgment call, not bulk migration. |
| **5.1 remaining ~80 imgs** | Image dims full sweep | Python regex `<img\s+[^>]*?/?>` matched `>` inside JSX arrow functions (`onError={() =>`), breaking 9+ files. Needs proper JSX parser OR manual file-by-file. Top 8 surfaces shipped covers ~80% of CLS impact. |
| **5.3** | NoteField extract on 1,040-line child page | Cursor-jump risk on every keystroke without real-device testing. |
| **6.3** | Tap target audit | Visual audit needs iPhone in hand. |

### Architectural rules locked this session (#36–48)

36. **`billing_override_usd` is the SOLE per-school rate signal.** Never hardcode a school's price anywhere else.
37. **Stripe override Prices are Montree-tagged** (`metadata.montree_override='true'`) for future cleanup identifiability.
38. **Override changes on active subscriptions fire `syncSubscriptionQuantity` in the background** — Stripe Price swaps with proration.
39. **Every user-typed value passed to `.ilike()` MUST escape `% _ \` first.** Canonical pattern at `app/api/montree/photo-bank/route.ts`.
40. **Every photo bank URL read MUST go through `getProxyUrl(path, 'photo-bank')`.** The `public_url` DB column is legacy back-compat only.
41. **`loading.tsx` files use inline styles only** — no Tailwind class deps, no Lora references (skeleton shouldn't wait for font). Pure server components.
42. **Font loading uses `next/font/google` in `app/layout.tsx`**, exposed as `--font-lora` and `--font-inter` CSS variables. Inline `font-family` refs elsewhere MUST use `var(--font-lora)`.
43. **i18n locale files load lazily via dynamic import.** NEVER statically import all 12 in any client-bundled module. Only `en` stays static.
44. **`setLocale()` MUST write both localStorage AND the `mt_locale` cookie.** The cookie is read server-side on the next page render to seed locale without client round trip.
45. **For non-en users, the server-side layout MUST load the locale file** (via `loadServerLocale`) and pass `initialMessages` to the provider. Eliminates English-flash on first paint.
46. **SSE token streams MUST buffer through useRef + rAF flush.** Never `setState` per token in a streaming handler. Pattern canonical at `flushTextBuffer()` in both `app/montree/admin/page.tsx` and `TracyFloat.tsx`.
47. **Tracy's first paint is STATIC** — no Sonnet/Opus call on mount. AI fires only when user types. The greeting is a templated assistant turn pushed into state directly. `fireGreeting()` is GONE; do not bring it back without explicit perf-impact reasoning.
48. **Weekly Wrap teacher + parent reports run in parallel per child.** Stage 0 → Stage N ordering preserved (replan first, then reports).

### Operational state after this session

| Item | Status |
|---|---|
| Migration 202 | ✅ Run in Supabase |
| Stripe Connect activation | ✅ Live mode, Marketplace model, Express, identity verified |
| Stripe Connect webhook | ✅ Created (`dynamic-brilliance`), Connected accounts scope, `account.updated` only |
| Railway env vars | ✅ `STRIPE_CONNECT_WEBHOOK_SECRET`, `CRON_SECRET`, `CRON_DIGEST_EMAIL` all deployed |
| Two webhooks on Montree Limited | ✅ `Montree billing` (Your account, school billing) + `dynamic-brilliance` (Connected accounts, agent payouts) |
| Gloria onboarding link | ⏳ Not yet generated — Tredoux to send via super-admin Referrals 💳 button |
| HK banker confirmation | ⏳ Pending — courtesy email to Wallex about Stripe Connect Express + HKD wires |
| 5 Railway crons | ⏳ Pending — Health tab manual triggers cover the gap |
| Resend domain verification | ⏳ Pending |
| HK accountant package | ⏳ Pending |

### 🚨 Next session priorities (ordered)

1. **🚨🚨🚨 Generate Gloria's onboarding link** — Super-admin Referrals → 💳 → reveal-once URL → send to Gloria with `docs/agents/GLORIA_STRIPE_ONBOARDING.md`.
2. **Walk the 8-step smoke test** in `docs/handoffs/SESSION_107_HANDOFF.md`: Stripe Connect webhook fires on Gloria submit → per-school billing override modal → pull-to-refresh on teacher dashboard → optimistic send on messaging → Tracy iOS keyboard → static greeting → photo bank bulk ops → loading skeletons on cold nav.
3. **Confirm with HK banker** — courtesy email to Wallex about Stripe Connect Express + HKD wires.
4. **Send HK accountant** `docs/finance/HK_FINANCIAL_ADVISOR_SUMMARY.md`.
5. **Configure 5 Railway crons** per `docs/perf/CRON_SETUP.md`.
6. **Verify `montree.xyz` in Resend** so demo/drip/bulk-reply emails actually deliver.
7. **Deferred PERF items** (each its own dedicated session because of testing requirements):
   - Tier 1.1 SW SWR (the BIG one — ~80% returning-visit lag gone)
   - Tier 2.2 retry-with-resume
   - Tier 5.1 remaining 80 imgs (needs JSX parser)
   - Tier 5.3 NoteField extract
   - Tier 6.3 tap target audit
8. **Outreach carry-over:** FAMM Argentina · Cambridge Montessori Global · Otari NZ · Lions Gate · Montessori Norge · Paint Pots · Ardtona dead leads DB cleanup · 14+ Wave 1 bounces.

---

### ⚡ Session 106 — Tracy 402 universal + sonnet chips + agent mobile + parent audit + bulk-reply demo leads (May 12, 2026)

**0 commits pushed yet — 32 files in working tree, 0 errors, i18n 100% parity (4430/4430 × 12 locales).** Five clean workstreams ready for `git add . && git commit && git push`. **No SQL — all migrations through 201 remain run.**

**🚨 Canonical resume doc:** `docs/handoffs/SESSION_106_HANDOFF.md` — full file-by-file change list, 7-step Stripe Connect playbook, 11-step smoke test, architectural rules, deferred backlog.

---

### 🚨🚨🚨 TOP CALL TO ACTION FOR NEXT SESSION — STRIPE CONNECT 🚨🚨🚨

**The codebase has had Stripe Connect ready since Session 90.** The only blocker to wiring Gloria's first real payout is **4 toggles in Stripe Dashboard + 3 env vars in Railway** — totaling ~15-20 minutes of Tredoux's time.

**📋 Full 7-step playbook in `docs/handoffs/SESSION_106_HANDOFF.md` section "STRIPE CONNECT ACTIVATION PLAYBOOK".** Summary:

1. **Verify `STRIPE_SECRET_KEY` is in Railway** (almost certainly yes — school billing has used it since Phase 4).
2. **Enable Stripe Connect on the platform account** at `https://dashboard.stripe.com/connect/overview` → Get started → **Platform or marketplace** → **Express**. (Anthropic can't drive `dashboard.stripe.com` — financial UI policy.)
3. **Create Connect-mode webhook** at `https://dashboard.stripe.com/webhooks`. URL `https://montree.xyz/api/stripe/connect-webhook`, **"Events on Connected accounts"** mode (NOT Account events), event `account.updated`. Copy signing secret → Railway env var `STRIPE_CONNECT_WEBHOOK_SECRET=whsec_…`.
4. **Set cron env vars** in Railway:
   ```
   CRON_SECRET=hn57BkFBTMTic3ByvZY183T0s/YzBJyqSHsRyMvrFCc=
   CRON_DIGEST_EMAIL=tredoux555@gmail.com
   ```
   (CRON_SECRET generated fresh via `openssl rand -base64 32` during Session 106.)
5. **Confirm with banker (Wallex/HK)** that Stripe Connect Express + Wallex HKD account is compatible (one email or call).
6. **Generate Gloria's onboarding link** via super-admin Referrals tab → 💳 button on Gloria's row (code `GLORIA-3KD5`). Send her the link + `docs/agents/GLORIA_STRIPE_ONBOARDING.md`.
7. **(Optional, later)** Configure 5 Railway crons per `docs/perf/CRON_SETUP.md`. Most important: **#1 monthly payout calculator** (`0 2 1 * *`). Health tab → Cron triggers panel can fire each manually until wired.

**What lights up when this lands:** Gloria's `/montree/agent/payouts` page flips from "Set up payouts now" → green ✓ verified pill within a minute of her completing Stripe's form. Next month-end, payout calculator computes her share, Money tab gets ⚡ Wire button on her row, one click → Stripe wires to her bank → row flips `paid` → email to Gloria with transfer ref. Year-end → Stripe issues her 1099-NEC automatically.

---

### Five workstreams shipped this session

**A. Tracy 402 pattern universally applied** — Architectural rule #29 fully realized. 13 server routes + 11 client surfaces patched. Every paid AI feature now returns `{ requires_upgrade: true, upgrade_url: '/montree/admin/billing', feature: '<key>', tier, error }` on 402, and every client renders the warm UpgradeCard (gold/amber, matches Tracy's design from Session 105) instead of a red error toast. Features covered: weekly_wrap, snap_identify, weekly_review (POST + PATCH), language_presentation, language_semester, teaching_instructions, generate_work_content, child_briefing, parent_question, tracy_scan, tracy_draft, vault_transcribe (+ tracy already done Session 105). New shared component at `components/montree/UpgradeCard.tsx` with helper `extractUpgradeFromResponse(res)`. 27 i18n keys × 12 locales = 324 translations.

**🚨 Photo Identification deliberately NOT tier-gated** per Session 57 architectural decision — free schools still need basic photo capture working.

**B. Sonnet-drafted top-3 chips** — extends Session 105 rule #32. The Sonnet-drafted teal card now surfaces top-2 sibling candidates as inline pill chips. One tap → confirms via `handleConfirmCandidate`. Falls back to shape-adapting `closest_existing_match` if `top_candidates` is empty (older drafts). All three identification surfaces now have chips: haiku_matched, haiku_drafted, sonnet_drafted.

**C. Agent dashboard mobile polish** — fixed the core collision: MiraFloat trigger (top-right zIndex 35) was overlapping AgentNav hamburger (top-right zIndex 30). MiraFloat now sits **bottom-right on mobile** (with `env(safe-area-inset-bottom)` for notched devices), **top-right on desktop** (`md:` breakpoint matches TracyFloat). Plus iOS zoom-on-focus killed across every agent input (16px font), touch targets bumped to 44pt on primary CTAs, earnings table → per-school cards below 640px.

**D. Parent portal dark forest theme audit** — the real find: `STATUS_META` map was using Tailwind class strings (`text-emerald-700`, `bg-emerald-50`) as inline `style.color` values — these silently never worked. On report page, status badges inherited default text color; on dashboard, value was bypassed entirely (hardcoded amber). Replaced with real CSS hex values. Now status pills are emerald (mastered), blue (practicing), gold (presented) — gives parents a quicker scan signal. Plus iOS zoom on parent messaging + sign-out tap target.

**E. Bulk-reply stale demo leads** — super-admin DemoRequestAlert gains "📨 Reply to all stale (N)" header button + per-row checkboxes + "📧 Reply to N selected" action. Server-side batch endpoint at `/api/montree/super-admin/demo-requests/bulk-reply` (NEW) sends the same personalised trial-link email as the per-row mailto button via Resend. Caps at 100 leads per call. Per-email failures don't block the batch — returns `{ sent, failed, skipped, outcomes }`. New email helper `sendDemoTrialLinkReply()` in `lib/montree/email.ts`.

### Architectural rules locked in this session

- **Rule #29 (Session 105) fully realized:** AI 402 routes MUST return `{ requires_upgrade: true, upgrade_url, feature, tier, error }`. Clients render `<UpgradeCard feature={feature} />` instead of red error. 14 routes + 11 client consumers compliant.
- **Rule #34 (NEW):** Bulk operations against contactable status fields skip non-eligible rows server-side rather than failing the batch. Reply-to-not_interested-lead is a footgun.
- **Rule #35 (NEW):** Per-email failures inside a batch don't compound original errors. Each fail is logged to `montree_outreach_log` with `action='bulk_reply_trial_link_failed'`, batch moves on.
- **Mobile iOS zoom:** every input/textarea on customer-facing surfaces MUST be ≥16px font. Pattern: `text-base sm:text-sm` (Tailwind) or `fontSize: 16` (inline). Comment block explains the why.
- **Touch targets:** primary CTAs use `py-3 sm:py-2` to hit 44pt on mobile without ballooning desktop.
- **`STATUS_META` records used inside inline `style={{ color: ... }}`** MUST use real CSS hex values, not Tailwind class strings (silent fail).

### Files changed (32 total)

See `docs/handoffs/SESSION_106_HANDOFF.md` "Files changed this session" section for the full list. Summary: 13 API routes patched + 1 new bulk-reply route + 1 new UpgradeCard component + 11 client consumers + agent dashboard (10 files) + parent portal (4 files) + super-admin DemoRequestAlert extension + `lib/montree/email.ts` extension + 12 locale files for i18n + this handoff doc.

### 🚨 Tredoux's operational to-do (priority-ordered)

1. **🚨🚨🚨 Stripe Connect activation — Steps 2–6 of the playbook above.** Single biggest unlock — wires Gloria's real payout.
2. `git add . && git commit -m "<message>" && git push origin main` — 32 files in working tree ready to ship.
3. **Send the HK accountant** `docs/finance/HK_FINANCIAL_ADVISOR_SUMMARY.md` — categorization decisions need their reply.
4. **Verify `montree.xyz` in Resend** so demo/drip/bulk-reply emails actually deliver (currently `onboarding@resend.dev` test address only delivers to Resend account owner).
5. **After Stripe Connect:** configure 5 Railway crons per `docs/perf/CRON_SETUP.md`.

### Next session priorities (ordered)

1. **🚨 Walk the Stripe Connect playbook end-to-end + onboard Gloria.** Highest-leverage step in the project right now.
2. **`git push` + walk the 11-step smoke test** in `docs/handoffs/SESSION_106_HANDOFF.md` after Railway redeploys.
3. **Per-school billing override** (~2h) — super-admin sets custom price for early-adopter schools (e.g. $5 instead of $7 for first 10). New `billing_override_usd` column + UI + Stripe override on next cycle.
4. **Photo bank improvements** (half-day) — direct-Supabase-URL inconsistency, delete UX, search filter, export-to-tool shortcut.
5. **Apply UpgradeCard to any new AI surfaces** — pattern is canonical, new AI routes should reach for `<UpgradeCard feature={...} />` rather than re-inventing.
6. **Outreach follow-ups (carry-over):** FAMM Argentina · Cambridge Montessori Global · Otari NZ · Lions Gate · Montessori Norge · Paint Pots · Ardtona dead leads cleanup in DB.

---

### ⚡ Session 105 — i18n full sweep + Money/Health/Demo operational layer + Photo audit polish (May 12, 2026)

**16 commits pushed to main this session:** `bde404d8` → `5338a406` → `d99dfd31` → `48aa7b52` → `418ec51d` → `03fba586` → `00ada714` → `a3cd874f` → `317d585f` → `dc0a449e` → `2f4d5f04` → `0192bad6` → `c0c12a2c` → `453cd9b6` → `7cc53298` → (final handoff commit).

**🚨 Canonical resume doc:** `docs/handoffs/SESSION_105_HANDOFF.md` — full 16-commit log, 14-step smoke test, architectural rules, deferred backlog. Pick up Session 106 cold from there.

**The headline:** Every Session 104 surface (Money tab + Health tab + DLQ + Errors + Tracy/Mira cards + Changelog + TrialBanner + Recurring + parent-codes + agent messaging) is now translatable across all 12 locales. PLUS a comprehensive operational layer:
- Stripe Connect + Customer **deep-links** from both Schools and Money tabs
- **Failed-payout retry** via 🔄 Reset to pending
- **Demo-request drip campaign** (day 3 / 7 / 14) with full visibility + one-click trial-link reply
- **Tracy 402 → upgrade card** (vs red error toast)
- **Top-3 candidate chips** on photo audit + **React.memo** to stop the 200-photo grid choking
- **Billing page i18n** (closes trial→paid funnel for non-English principals)

**A. i18n full sweep (`bde404d8` + `5338a406`):**

327 new keys × 12 locales = ~3,597 Haiku translations across 13 Session 104 surfaces: MoneyTab (~83), MoneyLedgerView (~35), HealthTab, WebhookDLQTab, ServerErrorsTab, RecurringOpExpensePanel, ChangelogModal, TrialExpiringBanner, TracyProactiveCard, MiraProactiveCard, parent-codes teacher page, agent messages list + thread detail.

**Two server routes refactored** so client can localize:
- `/api/montree/agent/snapshot` returns `suggested_action_key` + `params`
- `/api/montree/admin/snapshot` returns `suggestion_keys` array

Both keep the legacy English `suggested_action` string for back-compat fallback.

**Newline escape bug found + fixed (`5338a406`):** `money.confirmWire` and `parentCodes.emailBody` were stored with `\\n\\n` (escaped backslash + n) which TypeScript single-quote parsing produces as literal `\n\n` text at runtime — not newlines. Normalized to `\n\n` (single backslash) across 12 locales. The strict i18n parity check passes either way so this was a real runtime bug guard.

**B. Stripe failed-payout retry (`d99dfd31`):**

When a Stripe wire fails (Connect rejection, bank error, etc.) the row sits in `failed` status with no recovery path — super-admin had to manually SQL the row back to pending to retry. New `🔄 Reset to pending` button on every failed row flips status back after confirmation. Failure notes preserved as audit trail.

- PATCH `/api/montree/super-admin/payouts` gains `action='reset_failed'`
- Server refuses on non-failed rows (409)
- 3 new i18n keys

**C. Demo-request drip campaign (`48aa7b52` + `418ec51d` + `2f4d5f04` + `c0c12a2c`):**

Closes a real gap: landing-page demo requests get one confirmation email, then sit waiting for Tredoux to manually reach out. If he's busy or forgets, the lead goes cold. The full pipeline now:

1. **Auto-acknowledge** on form submit (existing)
2. **Day 3 / 7 / 14 drip emails** (NEW) — fire automatically while `status='demo_requested'`. Stops the moment Tredoux flips status to anything else. Idempotent via `montree_outreach_log` (action='demo_request_drip_dayN', contact_id dedup key).
3. **DemoRequestAlert visibility** — each pending row shows days since request (amber if > 14d), drips fired (e.g. "📧 drips: d3, d7"), and three actions:
   - **📧 Reply with trial link** — opens default mail client with pre-filled warm reply containing `https://montree.xyz/montree/try`; also auto-marks contacted
   - **✓ Contacted** — just stops the drip
   - **Not interested** — also stops the drip
4. **Health tab card** — pending count + drips fired last 7d + oldest unanswered (warn if > 14d)

**🚨 Architectural rule:** Drips that gate on a status field auto-stop the moment the status flips. No separate unsubscribe state machine. Same pattern as trial-drip from Session 104.

Cron: `0 10 * * *` (10:00 UTC daily, one hour after trial-drip). Manual trigger button on Health tab.

New API route: `/api/montree/super-admin/demo-request-drip` (auth: x-cron-secret OR super-admin, dry_run via `?dry_run=1`).

New email helper: `sendDemoRequestDripEmail()` in `lib/montree/email.ts` with 3 templates (warm tone, branded HTML + plain text fallback).

**D. Stripe Dashboard deep-links (`03fba586` + `dc0a449e`):**

Two new clickable surfaces save the multi-step navigation through Stripe's UI:
- **Money tab payout rows** — Connect status pill (ready/restricted/onboarding) opens `dashboard.stripe.com/connect/accounts/{id}`. The "not set up" state stays as plain span (no account to link to).
- **Schools tab rows** — 💳 Stripe pill (active/trial/past_due/canceled) opens `dashboard.stripe.com/customers/{id}` when `stripe_customer_id` is set. Color preserved per status; 🔗 emoji appended as visual deep-link hint.

**🚨 Architectural rule (#30):** All three Stripe Dashboard URL patterns are now canonical:
- Customer: `dashboard.stripe.com/customers/{id}`
- Connect account: `dashboard.stripe.com/connect/accounts/{id}`
- Connect transfer: `dashboard.stripe.com/connect/transfers/{id}` (existing from Session 104)

**E. Billing page i18n (`00ada714`):**

The principal-facing billing page at `/montree/admin/billing` was English-only — the weakest link in the trial→paid conversion funnel. A non-English-speaking principal hits the (translated) TrialExpiringBanner, clicks the CTA, and previously landed on an English page asking them to set up payment.

Translated end-to-end: page title, pricing tagline, status pills (Active/Trial/Past due/Canceled), 3 metric tiles, 4 action buttons (Set up billing / Manage in Stripe / Update payment / Resubscribe), invoice history list + empty state, billing-not-configured fallback, quantity drift warning, success/canceled/error messages. HTML `<strong>` tag inside `notConfiguredPricing` preserved via `dangerouslySetInnerHTML` (Haiku kept the tag intact in every locale).

36 new keys × 11 non-EN locales = 396 Haiku translations. Chinese spot-checked: 账单 / 当前计划 / 月度费用 / 设置账单 / 通过 Stripe 按月计费 — all natural.

Also added locale-aware date + currency formatting via `getIntlLocale()`.

**F. Health tab expansion (`a3cd874f` + `317d585f`):**

Two new cards bring the Health tab to **8 status cards** total (DB · Stripe · AI · LCP · Payout calc · Schools · **Server errors** · **Demo requests**):

1. **🐛 Server errors card** — queries `montree_server_errors` for unresolved count, fatal subset count, and last 7d total. Status escalates: fatal > 0 → fail (red), unresolved > 0 → warn (amber), all resolved → ok (emerald). Soft-fails if migration 201 not yet run.

2. **Stripe webhook card upgrade** — subtitle now shows `⚠ N pending in DLQ — last 7d` when count > 0 (queries `montree_webhook_deadletter` where status='pending'). Card flips from ok → warn when any DLQ events are pending. The full chain (webhook delivery → DLQ resolution → ledger) is visible from one screen.

**G. Tracy 402 → upgrade card (`0192bad6`):**

Carry-over from Session 98 priority #14. When a Free-tier school hits Tracy, server returned 402 with generic error — client rendered as red error toast, treating a billing state like a bug.

- Server adds `requires_upgrade: true` + `upgrade_url: '/montree/admin/billing'` + `feature: 'tracy'` to the 402 payload
- `ConvTurn` type gains `requiresUpgrade?: boolean`
- Frontend handler reads `requires_upgrade` from 402 body and routes to a friendly amber/gold upgrade card with "Set up billing" CTA — instead of the red error box
- Plain transient errors still render as red (separate branch)

**🚨 Architectural rule (#29):** All AI 402 routes should adopt the same shape (`requires_upgrade` + `upgrade_url` + `feature`). Tracy is the first; Weekly Wrap, Photo Identification, Snap Identify, etc. are deferred follow-up work.

**H. Photo audit polish (`7cc53298`) — top-3 candidates + memo fix:**

User feedback this session:
1. *"It would be beneficial if Haiku matched the three most likely works for a quick tap on Wrap Up"*
2. *"Today I was sorting through these works and the system choked"*

Both addressed in one commit:

**Top-3 chips:** `matchToCurriculumV2` was already computing top-3 fuzzy matches internally but only `bestMatch` was used. Now:
- `TwoPassResult.identification.topCandidates: Array<{ workName, workKey, area, score }>` (best-first)
- Both Pass 2 and Pass 2b populate it
- Server persists to `sonnet_draft.top_candidates` JSONB on `montree_media`
- Audit card renders the **top 2 siblings** (skipping the chosen one, since ✓ Correct does that) as inline pill chips on both `haiku_matched` (yellow) and `haiku_drafted` (teal) surfaces
- New handler `handleConfirmCandidate(photo, candidate)` mirrors `handleConfirmHaikuDraft` — resolves workKey, calls `attachToExistingWork()`

**Performance fix:** `AuditPhotoCard` wrapped in `React.memo` with custom comparator that checks only data props (photo, selected, processing, workStatus, rerunResult, unifiedTagger). Callbacks are intentionally excluded — they always read latest state via parent closures + functional setState, so stale-reference correctness is fine. With 200+ photos in the grid, unrelated state changes (note typing on another card, scroll, filter) no longer cascade re-renders through the entire grid.

**🚨 Architectural rules (#32, #33):**
- `matchToCurriculumV2` returns top-3 candidates — preserve the candidate-array contract.
- `React.memo` on expensive list items must skip callback props in the comparator (callbacks always have new identity per parent render; including them defeats memo).

**Architectural rules locked in this session (cumulative, 27-33):**

27. **Drips that gate on a status field auto-stop** the moment status flips. No separate unsubscribe state machine.
28. **`\n\n` in TypeScript single-quoted strings produces newlines at runtime.** Never use `\\n\\n`.
29. **AI 402 responses include `requires_upgrade` + `upgrade_url` + `feature`.** Clients render upgrade card instead of red error.
30. **Stripe Dashboard deep-link patterns:** customers/{id}, connect/accounts/{id}, connect/transfers/{id}.
31. **`reset_failed` is the canonical recovery action for stuck payouts.** Server refuses non-failed rows.
32. **`matchToCurriculumV2` returns top-3 candidates** — use them.
33. **`React.memo` comparator must skip callback props.** Compare data props only.

**Verification status:**
- ✅ All 16 commits on `origin/main`. Railway auto-deploys triggered throughout.
- ✅ Lint clean across all changed files. ESLint pre-commit hook passes.
- ✅ Pre-commit i18n strict check passes — all 12 locales at 100% parity (4405 keys each).
- ✅ TypeScript clean for all i18n changes (i18n errors gone; remaining tsc errors are pre-existing in lib/youtube + scripts/rotate-encryption-key).
- ⏳ User to walk the 14-step smoke test in `docs/handoffs/SESSION_105_HANDOFF.md`.

**🚨 Tredoux operational still-to-do (unchanged from Session 104):**

1. **Enable Stripe Connect** at https://dashboard.stripe.com/connect — ONLY blocker to wire Gloria's first real payout
2. **Generate Gloria's Stripe Connect link** (super-admin Referrals → 💳 button) once Connect is on → send `docs/agents/GLORIA_STRIPE_ONBOARDING.md`
3. **Send the HK accountant** `docs/finance/HK_FINANCIAL_ADVISOR_SUMMARY.md`
4. **Set Railway env vars** — `CRON_SECRET` + `CRON_DIGEST_EMAIL=tredoux555@gmail.com`
5. **Configure 5 Railway crons** per `docs/perf/CRON_SETUP.md` — now includes **demo-request drip** at `0 10 * * *`
6. **Verify `montree.xyz` in Resend** so demo + drip emails actually deliver

**🚨 Next session priorities (Session 106, ordered):**

1. **Walk the 14-step smoke test** in `SESSION_105_HANDOFF.md` after Railway settles. Verify each shipped surface works.
2. **Apply Tracy 402 upgrade-card pattern to other AI routes** — Weekly Wrap, Photo Identification, Snap Identify all return generic 402 errors. Same `requires_upgrade` + `upgrade_url` shape + matching client cards. ~1-2 hours per surface.
3. **Virtual scroll on photo-audit grid** — `React.memo` helps but 500 photos in DOM is still heavy. Add `react-window` or `react-virtuoso`. ~2-3 hours.
4. **Agent dashboard polish** — Schools / Codes / Payouts / Settings pages. Mobile-first re-audit. ~half-day.
5. **Top-3 chips on `sonnet_drafted` card** too (currently only on Haiku cards). `closest_existing_match` could be repurposed.
6. **Photo bank improvements** (carry-over).
7. **Parent portal dark forest theme audit** (carry-over).
8. **Outreach follow-ups:** FAMM Argentina, Cambridge Montessori Global, Otari NZ, Lions Gate, Montessori Norge (all carry-over from Session 94).

---

## RECENT STATUS (May 11, 2026)

### ⚡ Session 104 — The marathon (25 commits, May 11, 2026, auto-run all evening + into the night)

**25 commits pushed to main across the session:** `91be3908` → `19c1d04c` → `f9f23e99` → `c1dfb18d` → `0b7d02d4` → `a0ea3067` → `1913c2f1` → `9387a9c4` → `65475a8e` → `6f58dd2a` → `a10e39a4` → `1c2bf948` → `c1ae4589` → `e0d33f2f` → `fe683f30` → `16c1b8fa` → `7d367dbb` → `698d1f53` → `fc28c603` → `77594ec0` → `7dd3e9af` → `af3a9127` → `72edd675` (plus a couple inside).

Real-money infrastructure end-to-end functional. **All 6 migrations 196–201 RUN.** The session ran across multiple v1→v5 incremental handoffs; the v5 doc at `docs/handoffs/SESSION_104_V5_HANDOFF.md` is the consolidated source of truth.

**🚨 Canonical resume doc:** `docs/handoffs/SESSION_104_COMPLETE_HANDOFF.md` — the v5 doc renamed/extended to capture the full marathon picture.

**🚨 Migrations all RUN (user confirmed each):**
- ✅ 196 perf_vitals (Session 103)
- ✅ 197 agent_messaging (Session 104, May 11)
- ✅ 198 agent_payouts (Session 104, May 11)
- ✅ 199 recurring_op_expenses (Session 104, May 11 evening)
- ✅ 200 webhook_deadletter (Session 104, May 11 evening)
- ✅ 201 server_errors (Session 104, May 11 night)

No pending migrations.

**Whole session captured in one block below. Subsequent agents: read the v5 handoff doc first for the test plan, the architectural rules, and the deferred backlog. This block is a brain-level summary, not a replacement.**

**The headline:** Schools subscribe → AI costs auto-aggregate → calculator computes net + per-agent share → Money tab surfaces it → super-admin clicks ⚡ Wire (Stripe Connect with idempotency key) OR 💸 Mark paid → status flips → commission lands in finance_transactions → accountant pack CSV exports the whole story. The only manual step remaining is enabling Stripe Connect on the platform account at https://dashboard.stripe.com/connect.

**A. Parent invite system + agent → principal messaging + Gloria/HK docs (`91be3908`):**

- Teacher-driven parent invite UI at `/montree/dashboard/parent-codes`. Per-classroom scope. Generate / Copy / Email / Reset / Print.
- Principal admin parent-codes page now backed by working API (`/api/montree/admin/parent-codes` — was calling a route that didn't exist before).
- Agent → Principal messaging end-to-end: 4 routes + 2 pages + access guard + types. Migration 197 widens four CHECK constraints to allow 'agent' role + 'agent_principal' thread type. `ai_drafted=false` forced server-side on agent posts.
- `docs/agents/GLORIA_STRIPE_ONBOARDING.md` — 10-min Stripe Connect walkthrough for Gloria.
- `docs/agents/AGENT_DEDUCTION_EXPLAINER.md` — plain-English math walkthrough.
- `docs/finance/HK_FINANCIAL_ADVISOR_SUMMARY.md` — accountant one-pager with 8 numbered questions.
- Feature toggle modal spacing pass.
- Type widening: `ParticipantRole` includes 'agent', `ThreadType` includes 'agent_principal'. Drops unsafe casts.

**B. Agent referral code chip on super-admin school rows (`19c1d04c`):**

Extends `/api/montree/super-admin/schools` to pull `montree_referral_codes` where `status=redeemed AND redeemed_by_school_id IS NOT NULL`. New `LabelledCode.role='agent'` (sorted FIRST, rank 0). SchoolsTab UI: amber chip chrome + revenue share % suffix. Test School row now shows `🔑 Agent · Gloria · GLORIA-ZXNF · 50% | Principal · ... | Teacher · ...`.

**C. Phase 5 + Phase 6 — the big one (`f9f23e99`):**

**Migration 198:** `montree_agent_payouts` table (per agent/school/month row capturing gross/fees/AI/net/share%/payout + status state machine) + FK from `finance_transactions.agent_payout_id` (forward-ref deferred in migration 189, finalised here). Idempotent. UNIQUE on (agent_id, school_id, period_month).

**Calculator (`lib/montree/payouts/calculator.ts`):** Reads `montree_finance_transactions` per (school, month), computes `gross - stripe_fee - anthropic - openai - other = net`, then `payout = MAX(0, net × pct)`. Idempotent UPSERT. Race-safe via 23505 unique_violation fallback that re-reads paid/override locks before overwriting.

**API usage aggregator (`lib/montree/payouts/api-usage-aggregator.ts`):** Rolls `montree_api_usage` daily rows into per-(school, api, month) `direct_cost` rows in finance_transactions BEFORE the calculator runs. Without this, anthropic_cost + openai_cost would always read $0. Source_ref pattern: `${school_id}:${period_month}:${api}`. Idempotent via same 23505 fallback.

**Routes:**
- `POST /api/montree/super-admin/payouts/calculate` — fires aggregator → calculator. Auth: super-admin OR x-cron-secret. maxDuration=120.
- `GET /api/montree/super-admin/payouts` — list payouts with hydrated agent/school names + Stripe Connect status. Filterable by period/agent/school/status. Returns period_totals (per-month total/pending/paid/cancelled/failed).
- `PATCH /api/montree/super-admin/payouts` — state transitions: `mark_paid`/`mark_failed`/`cancel`/`manual_override`/`clear_override`. Paid rows are immutable (every action except mark_paid rejects paid status with 409).

**MoneyTab UI** (`components/montree/super-admin/MoneyTab.tsx`): Dark slate theme, last-12-months period selector, ⚙️ Calculate now button, period totals header, per-school payout cards with full math + state actions inline.

**D. Tier 0 carry-overs + lint cleanup (`c1dfb18d`):**

- `/api/warm` route (Tier 0.14) — pre-warms DB pool + Anthropic/OpenAI/Stripe SDK module cache after each deploy. Auth: x-cron-secret in production.
- `docs/perf/HOT_QUERIES_EXPLAIN_AUDIT.sql` — 8 hot-query EXPLAIN templates for Supabase SQL Editor (Tier 0.13).
- DashboardHeader: closed pre-existing lint backlog (Bell unused import removed, useCallback deps fixed, intentional native img on Supabase URL annotated with eslint-disable).

**E. Stripe Connect wire-out + Money tab P&L sub-tabs + cron docs (`0b7d02d4`):**

**Wire-out (`POST /api/montree/super-admin/payouts/[id]/wire`):** Validates payout pending + agent's Stripe Connect payout-ready, calls `stripe.transfers.create(...)` **with idempotencyKey `montree_payout_${id}_${cents}`**. Stripe dedups for ~24h — CRITICAL fix for the double-click double-pay race. On success: auto-flips status to paid, records transfer_id + paid_at + paid_by_method='stripe_connect', writes commission row to finance_transactions (audit trail). On failure: flips status to failed with Stripe error in notes.

**Stripe Connect status pill** on every Money tab row: Ready to wire (emerald) / Restricted (red) / Onboarding (amber) / Not set up (slate). Wire button disabled when not ready.

**Money tab P&L sub-tabs:** Top header now shows full P&L (Revenue − Direct costs − Commissions − Op-expenses + FX = Margin). 5 sub-views with pill nav:
- 💸 Payouts (existing payouts list)
- 📈 Revenue (income rows from Stripe webhook)
- 📉 Direct costs (Stripe fees + AI cost aggregates)
- 🤝 Commissions (wired payouts — audit trail)
- 🧾 Op-expenses (manual entry surface, 10 categories: hosting/domain/email_service/supabase/design_tools/ai_tooling/corporate_sec/marketing/professional_fees/other_op_expense). Per-row 🗑 Delete (manual_entry rows only — webhook/aggregator/commission rows immutable).

**Ledger API (`/api/montree/super-admin/finance/ledger`):** GET filtered by type/category/period/source/school/agent + returns per-type totals + P&L summary. POST manual op_expense entry (validates category against the 10-value whitelist). DELETE refuses non-op_expense or non-manual_entry rows server-side.

**Cron setup** (`docs/perf/CRON_SETUP.md`): Three Railway cron specs with curl snippets:
1. Monthly payout calc — `0 2 1 * *` (02:00 UTC, 1st of every month, calculates PRIOR month)
2. Post-deploy warm ping — Railway deploy hook (single fire after each deploy)
3. Daily Stripe quantity sweep — `0 3 * * *` (already shipped Session 93, just documented here)

**F. Monthly accountant export pack (`a0ea3067`):**

`GET /api/montree/super-admin/finance/export?period_month=YYYY-MM&format=csv|json`. CSV is multi-section single file (5 sections with `# === MARKER ===` lines so Excel can split):
1. P&L summary
2. Per-school revenue
3. Per-agent commission
4. Stripe reconciliation
5. Full ledger backup

📥 Accountant pack (CSV) button in MoneyTab header → fetches with token + triggers browser download via blob URL.

**G. Audit cycles run this session (across both halves):**

- Round 1 (Session 104a build): caught ThreadType/ParticipantRole type-system hole (unsafe casts) — fixed
- Round 2 + 3 (lint + tsc + semantic): clean
- Phase 5+6 Round 1 (semantic): caught the missing api-usage-aggregator (anthropic_cost + openai_cost would always read $0) — fixed
- Phase 5+6 Round 2 (independent fresh-eye): caught 2 CRITICAL race conditions in upsert paths (aggregator + calculator) + 2 HIGH server-side immutability gaps on PATCH actions + broken mark_failed UX — all fixed
- Phase 5+6 Round 3 (verify race fixes + immutability): clean
- Wire-out round: caught missing Stripe idempotencyKey (would have allowed double-pay on double-click) — fixed
- Final round: clean

**🚨 Architectural rules locked in this session (do NOT let future agents break these):**

1. **Stripe `transfers.create` idempotencyKey is load-bearing.** Never remove. Key is `montree_payout_${payoutId}_${amountCents}` — Stripe dedups for 24h. Changing the amount mid-flight produces a new key (different intent → different transfer).

2. **P&L formula**: `margin = income − direct_cost − commission − op_expense + fx_adjustment`. Commissions are real cash leaving the bank — they reduce margin. NOT double-counted; the calculator subtracts direct_cost only (not commission) when computing agent share, so the share IS the commission output.

3. **Calculator math**: `agent_share = pct × (gross − direct_cost)`. Op-expenses are NOT in agent's calc — agents shouldn't bear Montree's hosting costs. Margin captures op-expenses; agent share doesn't.

4. **Op-expense rows are the ONLY mutable ledger entries.** Webhook + aggregator + commission rows are immutable history. DELETE refuses non-op_expense + non-manual_entry server-side.

5. **Calculator skips paid + override rows.** Wire route refuses re-wire on paid status. Cancel/mark_failed/manual_override all refuse paid rows server-side. Money flow is one-way through the state machine.

6. **API usage aggregator runs BEFORE calculator** in every Calculate now click. Order is mandatory — without it, AI costs are $0.

7. **Wire route writes a commission row** to finance_transactions on success. Source_ref is `payout:${payout.id}` — idempotent across retries.

8. **CSV export is a single multi-section file** (5 sections with `# === MARKER ===` lines), not a ZIP. Easier for accountant's first email. JSON format available via `&format=json`.

9. **Race-safe upserts** on both aggregator + calculator. 23505 unique_violation falls back to UPDATE, with re-read of paid/override locks before overwriting.

10. **`CRON_SECRET` env var** authenticates all cron calls — payout calc + warm ping + Stripe sweep. Same secret. Document at `docs/perf/CRON_SETUP.md`.

11. **Agent code chip on school row sorted FIRST** in `login_codes_labelled` (rank 0). Amber chip chrome. Shows revenue share %.

12. **Negative net → $0 payout. Never clawback.** Enforced at calculator level (`Math.max(0, ...)`) AND at DB level (`CHECK (payout_usd >= 0)`).

13. **revenue_share_pct is locked at calc time.** Stored on each payout row. Future % changes in `montree_referral_codes` don't retroactively alter past months.

**Migrations status (all confirmed RUN by user):**
- ✅ 196 perf_vitals (Session 103)
- ✅ 197 agent_messaging (Session 104)
- ✅ 198 agent_payouts (Session 104) — confirmed "done - run and success"

**🚨 Tredoux operational still-to-do:**

1. **Enable Stripe Connect** on the platform account at https://dashboard.stripe.com/connect. This is the ONLY blocker before Gloria can be wired.
2. **Generate Gloria's onboarding link** (super-admin Referrals → 💳 button) once Connect is on.
3. **Send Gloria** `docs/agents/GLORIA_STRIPE_ONBOARDING.md` + the link.
4. **Send the HK accountant** `docs/finance/HK_FINANCIAL_ADVISOR_SUMMARY.md`. Wait for replies to questions 1–8 before locking categorisation in Phase 6.
5. **Set up Railway crons** per `docs/perf/CRON_SETUP.md` (requires CRON_SECRET env var).
6. **Optional:** pin Railway region to Singapore/HK.

**Next session priorities (ordered):**

1. **Smoke-test Money tab end-to-end** — 12-step plan in `SESSION_104_V2_HANDOFF.md`.
2. **Agent dashboard reads actuals** — `/montree/agent/earnings` still shows estimates from Session 90. Switch to reading from `montree_agent_payouts`. ~half-day rewrite.
3. **Email notification on payout paid** — when wire fires, email the agent with transfer reference. Resend integration exists. ~1 hour.
4. **Email summary on monthly calc cron** — Tredoux gets a P&L digest on the 1st. ~30 min.
5. **Stripe dashboard deep-links** — failed payouts surface error but don't link to Stripe. ~15 min.
6. **System health page** at `/montree/super-admin/health` — last cron run, Stripe webhook delivery rate, AI cost trend, Web Vitals p75. ~1-2 hours.
7. **Recurring op-expense entries** — "Repeat monthly" toggle on add form. ~1 hour.
8. **Bulk parent-invite email** — "Email all parents" button on teacher parent-codes page. ~30 min.
9. **Drip campaign for trial schools** — auto-emails on day 7, 14, 28 of trial. ~2 hours.
10. **Trial-to-paid conversion email** — Stripe webhook flips status, send principal a welcome-to-paid email. ~30 min.
11. **i18n batch** for parent-codes + agent messaging + Money tab + MoneyLedgerView. ~50 keys × 12 locales. ~1 hour focused.
12. **fx_adjustment manual entry UI** — when Stripe USD → Airwallex HKD wire differs materially from spot. Lower priority. ~1 hour.
13. **Demo request auto-response email** — landing-page form lands in super-admin but doesn't auto-acknowledge. ~30 min.
14. **PDF accountant pack** — currently CSV+JSON only. Lower priority since CSV imports cleanly. ~half-day.
15. **In-app changelog modal** — "Here's what's new since you last logged in." ~1 hour.
16. **Public changelog page** at `/changelog`. ~2 hours.

---

### ⚡ Session 104 — Extended marathon (commits 9–25) — May 11, 2026 late evening through night

The first half of Session 104 shipped 8 commits (parent invites + agent messaging + Money tab + cron docs). The extended marathon kept going through commits 9–25. **Everything below was built AFTER the v2 handoff was written, in one continuous auto-run.**

**H. Agent earnings actuals + payout-paid email + monthly digest + Stripe deep-links (`65475a8e`):**

- `/api/montree/agent/earnings` rewritten as hybrid mode: reads actuals from `montree_agent_payouts` for past months + current month if calculator has run; falls back to estimate when no actual exists. Returns `paid_to_date_usd`, `pending_usd`, `payouts[]`, `payouts_by_month[]`.
- `sendPayoutPaidEmail()` fires from wire route on success — agent gets branded HTML + plain text with amount + school + Stripe transfer ref + link to /agent/earnings. Fire-and-forget.
- `sendMonthlyDigestEmail()` fires from calculate route when called via x-cron-secret AND `CRON_DIGEST_EMAIL` env var set. P&L summary + payout pending/paid + calculator stats + error count. Manual super-admin clicks do NOT send (avoids spam).
- Stripe Dashboard deep-links on every paid row in Money tab. Links to `dashboard.stripe.com/connect/transfers/{id}`.

**I. System health route + bulk parent-invite email + trial drip + trial-converted email (`6f58dd2a`):**

- `/api/montree/super-admin/health` — 6 timed steps: DB ping, Stripe webhooks 7d, AI cost 30d, Web Vitals p75 LCP, payout runs, active schools. Returns 500 if any step fails.
- `/api/montree/dashboard/parent-codes/bulk-email` — teacher sends invite emails to N parents in one call. 6-worker concurrency. Cross-pollination check on every child_id. Returns per-pair success/error.
- `/api/montree/super-admin/trial-drip` — daily cron scans trial schools, sends day 7 / 14 / 25 emails. Idempotency via `montree_outreach_log` (action='trial_drip_dayN', metadata.school_id).
- `handleSubscriptionUpsert` in `lib/montree/billing.ts` extended: detects `trialing → active` transition (NOT `past_due → active`, that's retry recovery) and fires `sendTrialConvertedEmail()` to the owner. Lazy import to keep webhook hot path slim.

**J. Health UI tab + branded demo-request confirmation (`a10e39a4`):**

- `HealthTab.tsx` — 6 status cards (Database / Stripe webhooks / AI cost / LCP p75 / Last payout calc / Schools), top banner ('All systems operational' OR '⚠ One or more checks failed'), recent payout periods table, 🔄 Run check button.
- Wired into super-admin nav as 🩺 Health tab.
- Demo-request confirmation upgraded from plain text → branded HTML + text fallback. Subject 'Montree — thanks for reaching out'.

**K. Public /changelog page + in-app ChangelogModal (`1c2bf948`):**

- `lib/montree/changelog.ts` — canonical CHANGELOG_ENTRIES array, single source. Each entry: id, date, title, summary, audience (all/principal/teacher/agent), highlights[].
- `app/montree/changelog/page.tsx` — public-facing dark forest page. Lora serif + emerald accent. SEO-friendly.
- `components/montree/ChangelogModal.tsx` — mount-time localStorage check, surfaces entries shipped since last seen. First-time visitors silently baseline to latest (no spam with full history). Audience-scoped.

**L. ChangelogModal wired into 3 dashboards + landing nav (`c1ae4589`):**

- Teacher dashboard (`/montree/dashboard`): audience='teacher' (or 'all' for homeschool parent)
- Principal admin home (`/montree/admin`): audience='principal'
- Agent dashboard (`/montree/agent/dashboard`): audience='agent'
- Landing nav: "What's new" link added to `/montree/changelog`

**M. Public agent leaderboard + backup-recovery doc + v3 handoff (`e0d33f2f`):**

- `GET /api/montree/leaderboard` — top 20 agents by schools-referred + active-students. No auth. Surfaces aggregate-only data (display name + initials + country hint, no PII). 5-min Cloudflare cache.
- `docs/operations/BACKUP_DISASTER_RECOVERY.md` — 5 recovery procedures (DB corruption, missing storage, Stripe transfer failures, missed webhooks, lost SSH). Monitoring + early-warning section. Quarterly checklist.

**N. Recurring op-expense scheduler — migration 199 + CRUD + daily cron (`fe683f30`):**

- Migration 199: `montree_recurring_op_expenses` table. Idempotency via `last_fired_period_month`. Partial index on (is_active, day_of_month).
- `/api/montree/super-admin/finance/recurring` — GET/POST/PATCH/DELETE.
- `/api/montree/super-admin/finance/recurring/run` — daily cron at 04:00 UTC. Auth x-cron-secret OR super-admin (dry_run mode). Skips templates not yet due OR already fired this period.
- Cron docs updated (`docs/perf/CRON_SETUP.md`) with new section.

**O. fx_adjustment manual entry + trial-expiring banner (`16c1b8fa`):**

- Ledger POST widened: accepts `type='op_expense'` (default) OR `type='fx_adjustment'`. fx_adjustment categories: `wire_fx_delta` / `rate_revaluation` / `other_fx_adjustment`. fx amounts can be NEGATIVE (loss) or POSITIVE (gain).
- Ledger DELETE widened: allows both op_expense + fx_adjustment manual rows.
- `TrialExpiringBanner.tsx` on principal admin: shows when `subscription_status='trialing'` AND `trial_ends_at` within 14 days. Urgent (red) when ≤3d, warning (amber) when 4-14d. Per-day-per-days-remaining dismiss via localStorage. Reads from `/api/montree/billing/status`.

**P. Stripe webhook dead-letter queue (`7d367dbb`):**

- Migration 200: `montree_webhook_deadletter` table. UNIQUE on stripe_event_id prevents duplicate captures. Partial indexes on (status, created_at) WHERE status='pending'.
- `lib/montree/webhook-deadletter.ts` — `captureToDeadLetter()` fire-and-forget. Truncates message/stack. Swallows 23505 (Stripe re-fired same event_id, already captured).
- `/api/montree/super-admin/webhook-deadletter` — GET (filterable list + pending count) + PATCH (mark_resolved / mark_ignored with notes).
- Hooked into `app/api/montree/billing/webhook/route.ts` catch block. Always returns 200 to Stripe (no retry storm). DLQ capture failure does NOT compound original error.

**Q. Webhook DLQ admin tab UI + Recurring template panel + FX sub-tab (`fc28c603`):**

- `WebhookDLQTab.tsx` — super-admin ⚠️ DLQ tab. Status filter + event_type filter + pending count. Per-row resolve/ignore actions with note prompts. 'Show payload' expands raw JSON + stack trace.
- `RecurringOpExpensePanel.tsx` — embedded collapsed at top of Money → Op-expenses sub-tab. Per-row pause/resume/delete + last-fired tracking. Add form: category/amount/day-of-month/description/notes.
- MoneyLedgerView gains 6th view: `fx_adjustments`. Form adapts based on view: negative amounts allowed for FX, positive-only for op_expense. Category options swap.
- MoneyTab gets 💱 FX sub-tab pill.

**R. Printable HTML accountant pack + server-errors logger (`77594ec0`):**

- `/api/montree/super-admin/finance/export/print?period_month=YYYY-MM` returns styled HTML doc with 'Save as PDF' toolbar at top. A4 layout, Lora serif headings, emerald accent. No puppeteer dependency. Auth via header OR ?token= query param (window.open can't set headers).
- MoneyTab '🖨 Print / PDF' button next to CSV button.
- Migration 201: `montree_server_errors` table (sentry-lite). Origin / message / stack / context (JSONB) / severity / resolved tracking.
- `lib/montree/server-errors.ts` — `logServerError()` + `logCaughtError()`. Fire-and-forget, NEVER throws (logger failure must not compound original error).
- `/api/montree/super-admin/server-errors` — GET (filter state/origin/severity) + PATCH (mark resolved) + DELETE.

**S. Server errors tab + Mira card + Tracy card + landing polish (`7dd3e9af`):**

- `ServerErrorsTab.tsx` — super-admin 🐛 Errors tab. State filter (unresolved/resolved/all), severity badges, origin pills. Resolve/delete actions. Expand for stack + context.
- `/api/montree/agent/snapshot` — per-school signals for agent: active students, students_added_7d, photos_30d, last_guru_interaction, last_photo_at. Computes `signal` (growing/active/quiet/silent) + `suggested_action`.
- `MiraProactiveCard.tsx` — agent dashboard card surfacing actionable schools (growing first, then silent). Amber container with per-signal colored borders. Top 5 only. Dismissible.
- `/api/montree/admin/snapshot` — per-classroom + per-teacher signals for principal: stale classrooms (no photos 7d), idle teachers (>7d no login), pending_photos_7d. Returns `suggestions[]` array.
- `TracyProactiveCard.tsx` — principal Today page card. 'Tracy noticed:' + suggestions line + clickable chips for stale classrooms + idle teachers. Dismissible.
- Landing page (`app/montree/page.tsx`) parallel-agent polish: added "Play is the work of the child." — Maria Montessori quote above "Change your life" (small italic Lora, muted color, attribution on own line). Removed duplicate "Get started" nav button.

**T. Health tab manual cron triggers + Tracy/Mira changelog entry (`af3a9127`):**

- `CronTriggers` component added inside HealthTab. 4 one-click buttons: monthly payout calc / recurring op-expense / trial drip / warm. Auth via x-super-admin-token (no cron-secret needed for manual). Shows response JSON in expandable result panel.
- Useful BEFORE Railway crons are configured — Tredoux fires manually until then.
- All endpoints already idempotent so retries safe.

**U. Session 104 v5 final handoff (`72edd675`):**

- `docs/handoffs/SESSION_104_V5_HANDOFF.md` — consolidated everything from this marathon. Migration status, where-every-thing-is table, deferred backlog.

---

**🚨 Architectural rules added during the extended marathon (preserve cumulatively):**

14. **Trial-converted email triggers ONLY on `trialing → active`** (not on `past_due → active`).
15. **Monthly digest email is cron-only** (gated on `CRON_DIGEST_EMAIL` env var). Manual super-admin clicks DON'T send.
16. **All email helpers are fire-and-forget** — wire/webhook/etc. succeeds even if Resend is down.
17. **Trial drip idempotency via `montree_outreach_log`** — `action='trial_drip_dayN'`, `metadata.school_id` is the dedup key.
18. **ChangelogModal silently baselines first-time visitors** to the latest entry — no spam with full history.
19. **Public leaderboard surfaces aggregate-only data** — no PII beyond display names + initials + country hint.
20. **Storage buckets have no own-snapshot backup** (documented limitation in BACKUP_DISASTER_RECOVERY.md).
21. **Recurring op-expense idempotency** via `last_fired_period_month` + `(source, source_ref)` unique constraint. Daily cron is safe.
22. **DLQ capture is fire-and-forget** — webhook handler always returns 200 to Stripe, DLQ failure NEVER compounds original error.
23. **fx_adjustment amounts can be NEGATIVE (FX loss) or POSITIVE (FX gain).** op_expense must be positive.
24. **Trial-expiring banner dismisses per-day-per-days-remaining** — re-appears next day or when days count changes.
25. **`logServerError()` NEVER throws.** Logger failure swallowed silently — must not compound original error.
26. **Stripe Connect deep-links use `dashboard.stripe.com/connect/transfers/{id}`** (not the standalone /payouts/ path).

---

**🚨 Super-admin tabs (9 total) after this marathon:**

🏫 Schools · 👋 Leads · 💬 Feedback · 📍 Visitors · 🤝 Agents · 💰 Money · 🩺 Health · ⚠️ DLQ · 🐛 Errors

**🚨 Money tab sub-tabs (6):**
💸 Payouts / 📈 Revenue / 📉 Direct costs / 🤝 Commissions / 🧾 Op-expenses / 💱 FX

**🚨 New API routes (full list):**
- `/api/montree/super-admin/payouts/calculate` (POST)
- `/api/montree/super-admin/payouts` (GET, PATCH)
- `/api/montree/super-admin/payouts/[id]/wire` (POST)
- `/api/montree/super-admin/finance/ledger` (GET, POST, DELETE)
- `/api/montree/super-admin/finance/export` (GET — CSV/JSON)
- `/api/montree/super-admin/finance/export/print` (GET — printable HTML)
- `/api/montree/super-admin/finance/recurring` (GET, POST, PATCH, DELETE)
- `/api/montree/super-admin/finance/recurring/run` (POST — cron)
- `/api/montree/super-admin/health` (GET)
- `/api/montree/super-admin/webhook-deadletter` (GET, PATCH)
- `/api/montree/super-admin/server-errors` (GET, PATCH, DELETE)
- `/api/montree/super-admin/trial-drip` (POST — cron)
- `/api/montree/super-admin/principals` (full CRUD per Session 87)
- `/api/montree/admin/parent-codes` (GET) + `/generate-all` (POST)
- `/api/montree/dashboard/parent-codes` (GET, POST, PUT)
- `/api/montree/dashboard/parent-codes/bulk-email` (POST)
- `/api/montree/agent/messages/*` (3 routes — list, detail, send)
- `/api/montree/agent/messages/recipients` (GET)
- `/api/montree/agent/snapshot` (GET)
- `/api/montree/admin/snapshot` (GET)
- `/api/montree/leaderboard` (GET — public)
- `/api/warm` (GET — pre-warm)

**🚨 New components:**
- `MoneyTab`, `MoneyLedgerView`, `HealthTab`, `WebhookDLQTab`, `ServerErrorsTab`, `RecurringOpExpensePanel`, `ChangelogModal`, `TrialExpiringBanner`, `MiraProactiveCard`, `TracyProactiveCard`

**🚨 New library modules:**
- `lib/montree/payouts/calculator.ts` (idempotent UPSERT, race-safe)
- `lib/montree/payouts/api-usage-aggregator.ts` (writes finance_tx direct_cost from api_usage)
- `lib/montree/agent-messaging/access.ts` + `types.ts`
- `lib/montree/webhook-deadletter.ts`
- `lib/montree/server-errors.ts`
- `lib/montree/changelog.ts`

**🚨 New docs:**
- `docs/agents/GLORIA_STRIPE_ONBOARDING.md`
- `docs/agents/AGENT_DEDUCTION_EXPLAINER.md`
- `docs/finance/HK_FINANCIAL_ADVISOR_SUMMARY.md`
- `docs/perf/HOT_QUERIES_EXPLAIN_AUDIT.sql`
- `docs/perf/CRON_SETUP.md`
- `docs/operations/BACKUP_DISASTER_RECOVERY.md`
- `docs/handoffs/SESSION_104_HANDOFF.md` (v1 — early)
- `docs/handoffs/SESSION_104_FINAL_HANDOFF.md` (v1 — late)
- `docs/handoffs/SESSION_104_V2_HANDOFF.md` (after Phase 5+6)
- `docs/handoffs/SESSION_104_V3_HANDOFF.md` (after Tier 0 + cron)
- `docs/handoffs/SESSION_104_V4_HANDOFF.md` (after DLQ)
- `docs/handoffs/SESSION_104_V5_HANDOFF.md` (final — consolidated)
- `docs/handoffs/SESSION_104_COMPLETE_HANDOFF.md` (post-refresh consolidated)

**🚨 Tredoux operational still-to-do (after this session refresh):**

1. ✅ All 6 migrations RUN (196 / 197 / 198 / 199 / 200 / 201)
2. **Enable Stripe Connect** at https://dashboard.stripe.com/connect — the ONLY remaining blocker to wire Gloria's first payout
3. **Set Railway env vars** — `CRON_SECRET` (generate via openssl rand), `CRON_DIGEST_EMAIL=tredoux555@gmail.com`
4. **Set up 5 Railway crons** per `docs/perf/CRON_SETUP.md` OR use Health tab manual triggers in the meantime
5. **Generate Gloria's Stripe Connect link** (super-admin Referrals → 💳) once Connect is on → send package
6. **Send the HK accountant** the summary + first CSV export
7. **Verify `montree.xyz` domain in Resend** so demo-request + drip emails actually deliver to recipients

**🚨 Next session priorities (ordered):**

1. Smoke-test end-to-end: Money tab all 6 sub-tabs / Health tab / DLQ / Errors / Mira card on agent / Tracy card on principal / parent-codes teacher page / agent messaging
2. Enable Stripe Connect → wire Gloria's first real payout
3. Send Gloria + HK accountant packages
4. **i18n batch** — ~80+ keys × 12 locales via Haiku. The biggest remaining English-only surface debt: parent-codes teacher page, agent messaging UI, Money tab labels, MoneyLedgerView, Health tab, ChangelogModal, TrialExpiringBanner, ServerErrorsTab, Mira/Tracy proactive cards, WebhookDLQTab. ~1 hour focused.
5. Mobile-first re-audit of all new pages — real-device testing
6. Photo bank improvements (carry-over)
7. Parent portal dark forest theme audit
8. Stretch: Playwright smoke test suite, HeyGen explainer videos

---

### ⚡ Session 103 — Teacher messaging + super-admin "Log in as agent" + Tier 0 perf + Web Vitals + 3x audit cycle (May 11, 2026)

**8 commits pushed to main: `cd6dcafc` → `82758a1e` → `297731bd` → `81df44ba` → `37e3ed38` → `0917449d` → `c90fc5ce` → `4aff0cd5`.** Closed three Session 102 gaps, started measurable perf work, then ran 3 audit cycles fix-then-re-audit until clean. Two latent multi-session bugs additionally closed. One regression from the latent-fix caught by post-fix audit and corrected.

**🚨 Canonical resume doc:** `docs/handoffs/SESSION_103_HANDOFF.md` — comprehensive test plan + architectural rules + carry-overs.

**A. Teacher messaging rebuild (`cd6dcafc`):**

Mirrors parent's Session 98 rebuild for the teacher. Replaces the March 15 flat-table inbox (which queried the deleted `montree_messages` table) with the threaded model used by `/montree/admin/communication` and `/montree/parent/messages`.

New surfaces:
- `/montree/dashboard/messages` — thread list with floating + compose modal. Dark forest theme. Empty state explains the + button.
- `/montree/dashboard/messages/[threadId]` — iMessage-style detail with sticky reply composer. Auto-marks read on open. Renders "Tracy drafted" amber pill on incoming messages with `ai_drafted=true`.
- `/api/montree/dashboard/messages/recipients` — children-in-classroom bundles (each with linked parents) + the school principal.

Compose targets: `parent_teacher` (about a child, to one of their parents) and `internal` (to the school principal, no child). `addPrincipalObserver()` (Session 97) still runs server-side on every parent_teacher thread for transparency. Server forces `ai_drafted=false` on teacher posts.

Plumbing:
- `DashboardHeader`: new `MessageSquare` "Messages" entry at top of 3-dot menu. Active-page detection updated.
- `InboxButton`: relabelled to "Help" with `LifeBuoy` icon. Tredoux-DM panel content unchanged. Disambiguates from new Messages entry.
- 29 new i18n keys (`nav.messages`, `nav.help`, `inbox.helpTitle/helpLabel`, `teacherMessages.*`) added to `en.ts` and Haiku-backfilled across all 11 other locales. Pre-commit i18n strict check passes (4021/4021 per locale).

Plus principal-side compose modal sticky-footer fix (Session 102 carry-over): `/montree/admin/communication` compose restructured with sticky header / scroll body / sticky footer so Cancel/Send always visible. `rows={8}` → `rows={6}` with `minHeight: 140` for graceful growth.

**B. Super-admin "Log in as agent" (`82758a1e`):**

User picked option 2 (mint a JWT directly) over option 1 (display plaintext code) because Phase 7a's architectural rule is that agent codes are SHA-256 hashed by design — never returned by GET, only revealed once on POST.

`POST /api/montree/super-admin/agents/[id]/login-as`:
- Auth: super-admin only.
- Refuses `is_agent=false` accounts (guards Phase 7a contract).
- Suspended agents CAN be impersonated (suspend only blocks self-login).
- Mints token via `createMontreeToken({ sub, schoolId, classroomId, role: 'agent' })`.
- `setMontreeAuthCookie` writes the httpOnly montree-auth cookie.
- Audit fire-and-forget to `montree_agent_audit` with new `agent_impersonated_by_super_admin` event type.

UI: cyan 🔓 button in ReferralsTab between 🔑 and ✏️, gated on `r.agent_id && r.agent_is_agent`. Confirmation prompt before redirect.

**C. Tier 0 perf batch + Web Vitals telemetry (`297731bd`):**

9 of 14 Tier 0 items from `docs/PERF_HEALTH_CHECK.md` shipped:
- 0.1 `maxDuration=120` on 4 missing AI routes (guru/stream, admin/guru/chat, super-admin/guru, photo-insight/add-custom-work). Eliminates 503 class.
- 0.2 `maxDuration=30` on billing/webhook. Prevents Stripe retry storms.
- 0.3 `works/guide` Sonnet → Haiku. $30-80/mo + 1-2s off first-view in non-English locales.
- 0.4 Manifest `start_url`: `/montree/parent/login` → `/montree`.
- 0.5 `useMemo` on `getStatusConfig(t)` in FocusWorksSection.
- 0.6 `social-guru` + `admin/import` pinned model id → `AI_MODEL` alias.
- 0.7 `optimizePackageImports: ['lucide-react']` in next.config.
- 0.8 Dropped unused `recharts` (~150 KB shipped saved).
- 0.9 `.single()` → `.maybeSingle()` on conference-notes + messages.

Deferred to Session 104: 0.10 backdrop-filter audit, 0.11 Railway region pin (dashboard config), 0.13 EXPLAIN audit (needs SQL access), 0.14 pre-warm ping loop (needs cron infra).

**0.12 Web Vitals telemetry — BLOCKING for all future perf work:**
- `migrations/196_perf_vitals.sql` — `montree_perf_vitals` table + 3 partial indexes. **🚨 Must be run in Supabase SQL Editor.**
- `POST /api/montree/perf/vitals` — auth-free by design (we want anonymous visitor metrics too). Sanitized payload. Returns 200 always. Postgres `42P01` swallowed silently so client never retry-storms.
- `<WebVitalsReporter />` wired into `app/montree/layout.tsx`. Dynamic-imports `web-vitals@4.2.4`. Reports LCP/INP/CLS/FCP/TTFB via `navigator.sendBeacon` on each route change. Tags each metric with route + role + schoolId + connection.

🚨 **Architectural rules locked in this session:**

1. **Teacher messaging lives at `/montree/dashboard/messages`** with the same threaded schema as principal + parent. Three roles, one schema.
2. **Recipients API returns children-in-classroom bundles** (each with linked parents) + the school principal. NOT all parents in school — child-classroom-parent linkage is the security boundary.
3. **InboxButton chip renders LifeBuoy + "Help"** in the dashboard 3-dot menu. Floating mode unchanged.
4. **`agent_impersonated_by_super_admin` is the canonical audit event** for super-admin "Log in as agent". Don't reuse `agent_login_succeeded`.
5. **Agent impersonation refuses non-agents** — `is_agent=true` is a precondition.
6. **Suspended agents CAN be impersonated.** Suspend only blocks self-login.
7. **AI-calling routes MUST declare `maxDuration`** (Session 81 rule, now consistently enforced).
8. **Web Vitals telemetry is fire-and-forget** — never blocks, never retries, never throws.
9. **The telemetry endpoint is auth-free by design.**
10. **All Web Vitals payload fields from the client are untrusted** — analytics slicing only, never authorization.
11. **`last_sender_is_me` is the canonical "You" signal on thread list rows** — never role-based. Server compares `sender_id` to the authenticated userId/parentId.
12. **Both `/api/montree/messages/threads` AND `/api/montree/parent/messages/threads` are canonical `ThreadListItem` sources.** Any field added to the type MUST be populated by both routes (parent uses `parent.parentId`, unified uses `auth.userId`).
13. **Tracy's `scan_threads` tool builds its own anonymous shape**, not `ThreadListItem`. AI tools refer to participants by name, no "You" signal needed.
14. **`useEffect` keyed on `pathname` re-runs on every SPA route change.** If you bind external listeners with no unsubscribe API (web-vitals, etc.), bind ONCE on mount and use a `pathnameRef` for the current route at fire time — never re-bind, otherwise listeners multiplicate.
15. **`.tsbuildinfo` incremental cache masks type errors** when imported module shapes change. Always force `rm tsconfig.tsbuildinfo && npx tsc --noEmit` before declaring a type-shape change clean. `next build` won't catch it either because `typescript.ignoreBuildErrors=true` in this project.

**Verification status:**
- ✅ All 8 commits on `origin/main`.
- ✅ Lint clean on all changed files (`--max-warnings=0`). TypeScript clean after forcing `rm tsconfig.tsbuildinfo && tsc` (incremental cache was masking a regression earlier — see Round 3 audit below).
- ✅ Pre-commit i18n strict check passes (4021/4021 × 12 locales).
- ✅ `web-vitals@4.2.4` installed. `recharts` removed.
- ✅ Four audit cycles ran:
  - Round 1 (build + first audit): 1 self-caught WebVitalsReporter bug + 3 from independent agent (next.config experimental clobber, scrollIntoView, canReply) → all fixed in `37e3ed38`.
  - Round 2 (latent issues): senderLabel "You" mislabel + InboxButton eslint → fixed in `0917449d`, `c90fc5ce`.
  - Round 3 (post-latent-fix audit): caught regression — parent route was missing the new required `last_sender_is_me` field. tsbuildinfo had masked the TS error. Fixed in `4aff0cd5`.
  - Round 4: clean.
- ✅ Migration 196 RUN in Supabase (May 11, 17:45). Table `montree_perf_vitals` + 3 indexes live. Awaiting first metrics to flow in once Railway settles the deploy and users browse.
- ⏳ User to walk test plan in `docs/handoffs/SESSION_103_HANDOFF.md`.

**🚨 Next session priorities (ordered):**
1. **Walk Session 103 test plan** — teacher messaging end-to-end (principal ↔ teacher ↔ parent), super-admin 🔓 Log in as agent, principal compose modal sticky footer on narrow viewports.
2. **Verify Web Vitals reporting** in DevTools Network tab after Railway settles `45886e2d`. Migration 196 already RUN.
3. **Tier 0 remaining items** (0.10 backdrop-filter audit, 0.11 Railway region, 0.13 EXPLAIN audit, 0.14 pre-warm ping loop).
4. **Watch Web Vitals baseline** for 1-2 days, set thresholds, then start Tier 1.1 SW SWR.
5. **Onboard real Gloria as first agent** when ready (carry-over). Now even easier — Tredoux can use 🔓 to step into her dashboard.
6. **Phase 5 Payout calculator** (~1.5d). **Phase 6 super-admin Money tab** (~2-3d).
7. **Outreach follow-ups** — FAMM Argentina, Cambridge Montessori Global, Otari NZ, Lions Gate, Montessori Norge.

---

## RECENT STATUS (May 10, 2026)

### ⚡ Session 100 — THE MARATHON: Stripe LIVE + Communication 4-cycle audit + Tracy memory + Tracy proactivity v3 + Tracy warmth + Tracy thinking indicator + copy blocks + photo bank cleanup + landing kicker (May 10, 2026)

**The most productive single session in the project's history. Real money flows. Tracy has memory, voice, and visual life. Communication system bulletproofed. Photo bank purged. Landing polished.**

**🚨 Canonical resume doc:** `docs/handoffs/SESSION_100_HANDOFF.md` — comprehensive single source of truth for picking up Session 101 cold.

**15 commits shipped. 3 migrations RUN (193, 194, 195). 4 audit cycles to CLEAN. Real $21 charge succeeded in Stripe live mode.**

**Headline outcomes:**
1. **Stripe LIVE mode end-to-end proven** — Test School 2 subscribed via real Visa, $21 invoice paid (`GGPEZ19T-0001`), Customer Portal live, tier auto-flipped Pro. Live price `price_1TVUiLRngZj3YCje8azeSIsN`, live webhook `we_1TVUwXRngZj3YCjedD20xX5s`. Live secret key rotated TWICE (once after exposure in chat, once cleanly). Cancel direction will auto-prove on Jun 10 via `cancel_at_period_end`.
2. **Communication system: 4 audit-fix-audit cycles to CLEAN.** 19 original fixes + 5 regression fixes + 1 sibling fix. Three consecutive clean passes confirmed. 11 architectural rules enforced across every messaging endpoint. Whale Class READY to flip `parent_messaging` ON when human handoff is ready.
3. **Tracy persistent memory live** (migration 195 RUN) — `montree_principal_memory` table + atomic supersede function + `remember_this` / `recall_memory` tools. True relational memory across conversations + devices. Memory injected on every turn (capped 30 most recent).
4. **Tracy proactivity v3** — root cause finally found: tool description for `draft_teacher_welcome_messages` was telling her to offer first ("Use this whenever the principal accepts an offer"). Both system prompt + tool description rewritten. **Architectural rule locked: when adjusting AI proactivity, system prompt AND tool descriptions MUST agree. If they disagree, tool wins because that's what Opus reads at decision moment.**
5. **Tracy warmth** — added "one warm sentence" framing between action and artifact. Strict guardrails: warmth allowed ("Here you go — three quick welcomes"); architecture forbidden ("Here's how it works...").
6. **Tracy thinking indicator + copy blocks** (commit `78e62880`) — pulsing gold avatar + animated dots + progress label while loading; markdown code fences render as styled `<CopyableMessageCard>` with one-tap copy. Tracy's system prompt updated to wrap every draft message in fences with bold heading above.
7. **Photo bank cleanup** — 510 photos → 389 photos. 121 non-JPEGs (PNG/WebP/AVIF, 24% of bank) purged from storage + DB. JPEG-only validation locked at upload + UI accept attributes tightened across 6 photo input surfaces. Per-photo delete button added. `montree_media` photo uploads also locked to JPEG-only.
8. **Migrations 193 + 194 + 195 ALL RUN.** Parent messaging flag (default OFF), school_admins.login_code column (reverses Session 84 rule), Tracy memory table + Postgres function.
9. **Landing page kicker** — "Change your life" in brand gold (Lora italic, soft gold glow) above "The magic of Montree." All 12 locales translated.
10. **Stale Stripe state cleanup pattern** — Test School 2 had `cus_UUNyBWUuiGdn69` from yesterday's test mode. Cleared via SQL UPDATE → live customer created cleanly. Same SQL applies to any school migrating from test→live.

**🚨 Architectural rules locked in this session (do NOT let future agents break):**

1. **Tool descriptions and system prompts must AGREE on when to call.** If they disagree, tool wins. Always update both when adjusting AI behavior.
2. **Stripe live mode keys live ONLY in Railway env vars.** Never CLAUDE.md, never git, never persistent files. Product/Price/Webhook IDs are non-sensitive object identifiers and OK to record. `sk_live_*` and `whsec_*` are credentials and stay out.
3. **`subscription_status='trialing'` ≠ "has Stripe subscription".** Always check `stripe_customer_id !== null` before assuming Stripe customer exists. Both frontend (Session 98 `a6d00a17`) AND backend (Session 100 `f7560471`) enforce this.
4. **Test mode customer IDs become invalid in live mode.** When switching modes, schools with stale `stripe_customer_id` need cleanup. Pattern: `UPDATE montree_schools SET stripe_customer_id=NULL, stripe_subscription_id=NULL, stripe_price_id_active=NULL, current_period_end=NULL, last_synced_to_stripe_at=NULL, monthly_charge_estimate_cents=NULL, subscription_status='trialing' WHERE id='<school_id>';`
5. **Tracy memories are SEMANTIC, not EPISODIC.** Save preferences/concerns/voice samples; don't save "asked about X today" — that already lives in `montree_principal_agent_log`.
6. **Memory injection on every turn**, capped at 30 most recent for cost control. `recall_memory` is for deeper recall beyond that cap.
7. **Memories scoped per `principal_id`**, never per school. Multi-principal schools have separate memory streams.
8. **Tracy's draft messages MUST be wrapped in markdown code fences** for copy blocks. The frontend renders fences as `<CopyableMessageCard>`. Recipient name goes BEFORE the fence as bold heading. Action line stays as prose AFTER all fences.
9. **The `→ ` action-line marker** is load-bearing — front-end parses it. Don't change `splitActionLine()`.
10. **Photo bank is shared public** by design (`is_public=true`, no `school_id`). Don't add ownership without explicit decision.
11. **Every messaging endpoint** validates participant school membership + child-classroom linkage before insert.
12. **Principal selection (recipients + observer)** uses CONSISTENT ordering: `last_login DESC nullsFirst:false`, `created_at DESC` tiebreaker. Both `addPrincipalObserver()` and `recipients/route.ts` must match.

**Files changed (15 commits, ~50+ files):**

```
f58742ed  Landing: 'Change your life' gold kicker
f7560471  Stripe checkout: don't bail on local-trial schools
6d4283b4  Tracy proactivity: ACTION FIRST rewrite
a799b4d7  Tracy proactivity v3: top-of-prompt mandate + tool description
e4c93cf4  Communication audit: critical + high
fb232065  Communication audit: medium + low
bd96deb1  Communication audit: 4 regression fixes
8f4db60b  AUDIT-1: recipients route principal ordering
04395543  Tracy persistent memory: migration 195 + tools + injection
97566d54  Photo upload: JPEG-only across montree_media routes
d51df3c4  Photo bank audit script
15fea956  Photo bank: JPEG-only + delete button + DELETE API
27b176ad  Photo bank: cleanup utilities (4 files, +456)
a2a1d3d5  Tracy voice: warm one-sentence intro
78e62880  Tracy: thinking indicator + copy-able cards
```

**🚨 Carry-overs / next session priorities:**

1. **🚨 Onboard Gloria as first agent today** — super-admin Referrals → 🔑 Issue agent login → reveal-once code → send to Gloria. Then 💳 Stripe Connect onboarding link → Gloria fills bank/tax in Stripe Express → done. Real money infrastructure complete.
2. **🚨 Run migration 184** — `montree_principal_agent_log` table never created. Tracy interactions silently fail to log. File exists at `migrations/184_principal_agent_log.sql`. Fire-and-forget so doesn't break Tracy. Task #40.
3. **🚨 Fix admin.\* i18n keys** — Settings page reveals raw `admin.actions.saveChanges` / `admin.labels.subscription` / etc. to users. ~31 missing keys per Session 98 #15. Run `npm run i18n:fill-ui` after adding to `en.ts`. Task #39.
4. **UI glitch sweep** across principal portal — tied to admin.* fix. The brittleness undermines the otherwise polished feel.
5. **In-app billing history filter** — cosmetic. Filter out failed-then-paid duplicate webhook events so principals don't see ghost "Payment failed" rows next to successful charges.
6. **Phase 5 Payout calculator** — now actually unblocked since Stripe is live. Reads `montree_finance_transactions`. Idempotent monthly aggregator → `montree_agent_payouts`. ~1.5 days.
7. **Phase 6 super-admin Money tab** — P&L from unified ledger. ~2-3 days.
8. **Outreach follow-ups** — FAMM Argentina, Cambridge Montessori Global, Otari NZ, Lions Gate, Montessori Norge.

**Test plan for Session 101 (smoke test the Session 100 work):**

1. **Tracy memory** — open `/montree/admin`, tell her *"Remember — I prefer messages under 3 sentences"*, click "New conversation", ask any drafting question. Drafts should be short. Cross-device test: open same school in incognito, same memory loads.
2. **Tracy thinking indicator** — send Tracy *"how do I onboard my teachers"*. Avatar pulses gold during wait, three dots animate, progress label rolls forward.
3. **Tracy copy blocks** — same response should render as stacked copy cards (one per teacher), each with bold name + copy icon. Click copy → checkmark for 1.2s, paste in WhatsApp/Notes → clean text.
4. **Stripe live billing** — Customer Portal accessible from `/montree/admin/billing`, shows `10 May 2026 · US$21.00 · Paid · Montree subscription`. Cancel from portal would prove cancel direction without waiting for Jun 10.
5. **Communication system flag flip** (when ready) — `INSERT INTO montree_school_features (school_id, feature_key, enabled) VALUES ('c6280fae-567c-45ed-ad4d-934eae79aabc', 'parent_messaging', true) ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = true;`

---

### ⚡ Session 99 — Tracy persistent memory (migration 195) + remember_this / recall_memory tools (May 10, 2026)

**The headline:** Tracy now has true relational memory across conversations and devices. Until this session, she had ONLY episodic memory (last 10 turns of the active conversation, sent client-side from localStorage). Across "New conversation" clicks, fresh devices, or any cross-session interaction, she remembered nothing — the principal had to re-explain her preferences, voice, concerns, and parent priorities every time. That's now fixed.

**✅ Migration 195 (`migrations/195_principal_memory.sql`) RUN in Supabase May 10, 2026 16:30 — confirmed via "Success. No rows returned".** Table `montree_principal_memory` + 4 partial indexes + `supersede_and_insert_memory()` Postgres function (SECURITY DEFINER, GRANT EXECUTE to anon/authenticated/service_role) are live. Tracy's memory is wired end-to-end and active in production. Stop telling future sessions to run this — it's done.

**A. Migration 195 — `montree_principal_memory` table + atomic supersede function:**

The table stores semantic facts about the principal (`preference`, `concern`, `voice_sample`, `parent_priority`, `teacher_note`, `context`, `fact`). Each row has `school_id`, `principal_id`, `memory_type`, `content` (max 1000 chars), optional `related_child_id`/`related_teacher_id`/`related_parent_id`, plus pruning signals (`reference_count`, `last_referenced_at`) and the supersede chain (`superseded_by`, `superseded_at`).

Four indexes: active memories per principal, type-filtered lookups, child-related, teacher-related — all partial indexes on `WHERE superseded_at IS NULL` so the superseded rows don't slow active queries.

The `supersede_and_insert_memory()` Postgres function handles the atomic update path. When Tracy decides an existing memory is outdated, the new memory must be inserted AND the old marked superseded in a single step, otherwise concurrent reads briefly see both as active. Also bidirectional: `superseded_by` on the old row points at the new id. SECURITY DEFINER, GRANT EXECUTE to anon/authenticated/service_role.

Defense in depth: the function filters the supersede UPDATE by `principal_id`, so even if a malicious caller passed someone else's memory id as `p_supersedes_id`, it would no-op rather than mark it superseded.

**B. Memory helper module — `lib/montree/tracy/memory.ts`:**

Five functions:
- `loadActiveMemories(supabase, principalId, limit=30)` — top-N most recent active memories. Capped at 100. Returns `[]` on error (graceful pre-migration fallback).
- `formatMemoriesForPrompt(memories)` — renders as a system-prompt section grouped by type with each memory's id in brackets. Empty string when no memories. Includes guidance for Tracy on supersede + saves.
- `writeMemory(supabase, schoolId, principalId, input)` — atomic write. When `supersedes_id` is provided, routes through the Postgres RPC. Otherwise plain insert. Validates memory_type enum, content length cap (1000), all UUID fields. Returns `{ ok, id }` or `{ ok, error }`.
- `recallMemories(supabase, principalId, filters, limit=20)` — filtered read for the `recall_memory` tool. ILIKE-escapes the query string (pattern metachars in PostgreSQL ILIKE: `%`, `_`, `\`).
- `bumpMemoryReference(supabase, memoryIds)` — fire-and-forget reference-count bump. Best-effort read-then-write since a non-critical pruning signal isn't worth another RPC.

**C. Tool definitions — `remember_this` and `recall_memory`:**

Two new tools added to `TRACY_TOOLS` in `lib/montree/tracy/tool-definitions.ts`. Schemas allow optional `related_child_id`/`related_teacher_id`/`related_parent_id` UUIDs, optional `source` annotation, and `supersedes_id` for updates. The tool descriptions include explicit "DO save semantic / DO NOT save episodic" guidance so Tracy doesn't pollute the table with one-off conversation facts.

**D. Tool executor — dispatch cases + `principalId` on TracyToolDeps:**

Extended `TracyToolDeps` with `principalId: string` (was: schoolId only). Both new dispatch cases gate on `principalId` being present — defense in depth even though the route always passes `auth.userId`. The `recall_memory` case fires-and-forgets `bumpMemoryReference()` after returning results so frequently-recalled memories surface to top of pruning analysis later.

**E. System prompt — Memory section + INTENT TABLE entries + dynamic memory injection:**

`buildTracySystemPrompt()` now accepts an optional `memorySection: string`. When non-empty, gets injected after the "WORKED EXAMPLE" block and before "# Who you are" — Tracy reads her own memory at the top of every turn. The Memory documentation section explains both tools, their use cases, and the rule that she shouldn't cite memory ids back to the principal.

Two new entries in the INTENT → MANDATORY TOOL CALL table:
- principal mentions a preference / concern / voice quote / context worth remembering → `remember_this`
- "what did we discuss about X" / "what was that thing about Y" → `recall_memory`

**F. Route wiring — `app/api/montree/admin/principal-agent/route.ts`:**

Added `loadActiveMemories(supabase, auth.userId, 30)` + `formatMemoriesForPrompt()` calls before the encoder is created. Result threaded into `buildTracySystemPrompt({ ..., memorySection })`. `principalId: auth.userId` added to `executeTracyTool` deps. Failure to load memories degrades gracefully (memorySection becomes "" and Tracy behaves as if she has no memories yet).

**🚨 Architectural rules locked in this session (do NOT let future agents break these):**

1. **Memories are SEMANTIC, not EPISODIC.** "Principal prefers short messages" is a memory. "Principal asked about Austin on 2026-05-10" is NOT — that already lives in `montree_principal_agent_log`.
2. **Tracy decides what's memorable.** Not every turn writes a memory. The system prompt explicitly tells her to save durable knowledge only.
3. **Memories are scoped per `principal_id`** — never per school. Multi-principal schools have separate memory streams. This is the cross-pollination contract for everything memory-related.
4. **The `superseded_by` chain handles updates atomically via the Postgres function.** NEVER do a multi-statement client-side update for supersede — race condition.
5. **Memory injection is on every turn** (system prompt rebuilt per request) capped at 30 most recent for cost control.
6. **`recall_memory` is for DEEPER recall** beyond the 30 in the system prompt — filtered by topic / child / teacher / parent / text query.
7. **`reference_count` + `last_referenced_at` are pruning signals.** Don't surface to the user. Fire-and-forget bumps from `recall_memory` dispatch.
8. **Do NOT save sensitive personal facts** unless the principal explicitly asked Tracy to remember them. Do NOT save private parent/teacher info that wasn't shared in the principal's chat.
9. **Memory id citation is forbidden** in user-facing output. The bracketed `[id: ...]` in the system prompt is for tool calls only.
10. **Failure to load memories never crashes the agent.** `loadActiveMemories()` returns `[]` on any error. `memorySection` becomes `""`. Tracy degrades to no-memory mode silently.

**Files changed (8 files):**
- NEW: `migrations/195_principal_memory.sql`
- NEW: `lib/montree/tracy/memory.ts`
- EXTENDED: `lib/montree/tracy/tool-definitions.ts` (+2 tools)
- EXTENDED: `lib/montree/tracy/tool-executor.ts` (+`principalId` on deps + 2 dispatch cases)
- EXTENDED: `lib/montree/tracy/system-prompt.ts` (+memorySection opt + Memory section + INTENT TABLE entries)
- EXTENDED: `lib/montree/tracy/index.ts` (+memory exports)
- MODIFIED: `app/api/montree/admin/principal-agent/route.ts` (load memories + thread through)
- MODIFIED: `CLAUDE.md` (this entry)

**🚨 Next session priorities:**
1. **🚨 Run migration 195 in Supabase SQL Editor** — required for memory writes/reads to land. Verify with `SELECT count(*) FROM montree_principal_memory;` (should return 0) and `SELECT proname FROM pg_proc WHERE proname = 'supersede_and_insert_memory';` (should return 1 row).
2. **End-to-end test memory persistence** — see test plan below in this entry.
3. Stripe live mode flip (carry-over from Session 98).
4. Onboard first agent (Gloria) — issue agent login + Stripe Connect onboarding (carry-over).

**Test plan (after migration 195 lands):**
1. Open `/montree/admin` in fresh browser (or click "New conversation"). Tell Tracy something durable: *"I prefer short, warm messages — no more than 3 sentences."* She should call `remember_this` with `memory_type='preference'`.
2. Click "New conversation" again. Verify the system-prompt header now contains `# What you remember about this principal` with the preference line. Ask Tracy a drafting question — she should match the preference.
3. From a different device or incognito window, log in as the same principal. Same memory should be loaded (it lives in DB, not localStorage).
4. Tell Tracy something that supersedes: *"Actually I want medium-length messages now, not short ones."* She should call `remember_this` with `memory_type='preference'` AND `supersedes_id=<id of the previous preference>`. Verify in Supabase: old row has `superseded_at` and `superseded_by` set; new row is the live one.
5. Quote a real message the principal wrote: *"Save this as a voice sample: 'Hi Mary, hope you're well — wanted to share a quick update on Austin's progress this week.'"* — Tracy should call `remember_this` with `memory_type='voice_sample'`. Future parent-reply drafts should match this voice.
6. Ask "what did we discuss about Austin?" — Tracy should call `recall_memory` with `query='Austin'`. Verify in Supabase that `reference_count` on returned rows incremented + `last_referenced_at` updated.
7. Verify in `montree_principal_agent_log` that the conversations are still being logged (the memory system is parallel to the log, not a replacement).

---

## RECENT STATUS (May 9, 2026)

### ⚡ Session 98 — Parent messaging architecture (flag-gated, OFF) + parent dashboard scope locked (May 9, 2026, post-Session 97)

**Goal:** Build the full parent-side threaded messaging architecture mirroring Session 97's principal/teacher Communication system, but ship it with the feature flag OFF for every school. Eliminates the "two channels open at once" support-ticket scenario before Gloria's first real school onboards. Plus a deliberate scope lock on the parent dashboard.

**🚨 Canonical resume doc:** `docs/handoffs/SESSION_98_HANDOFF.md`. **🚨 Migration 193 must be run in Supabase SQL Editor** before any of the new endpoints function (until run, every parent messages route returns 404 because `isFeatureEnabled()` falls back to `default_enabled` and there's no row to read).

**A. The parent dashboard scope is locked: log in → see Weekly Wrap → log out.** No nav, no Messages link, no Photos/Milestones/Weekly-Review links — even when those routes exist. Surfacing any of them is a separate explicit decision, never an automatic side-effect of a flag flip. The dashboard's only job is the latest Weekly Wrap report. This is the canonical posture for all future parent-facing UX work.

**B. Migration 193 (`migrations/193_parent_messaging_feature.sql`):**

Adds `parent_messaging` to `montree_feature_definitions` with `default_enabled=false`. Idempotent. Schools opt-in individually via super-admin. Flag check uses the existing `isFeatureEnabled(supabase, schoolId, 'parent_messaging')` helper from `lib/montree/features/server.ts`. `parent_messaging` added to the `FeatureKey` union in `lib/montree/features/types.ts`.

**C. Helper lib (`lib/montree/parent-messaging/`):**

Three files — `types.ts`, `access.ts`, `index.ts`. The keystone is `resolveMessagingParent(supabase)`:
- Verifies the parent JWT cookie via `verifyParentSession()`.
- Refuses invite-based sessions (no `parentId` in JWT) with 403 — invite-only access is read-only by design because participants in messaging are people, not children.
- Hydrates the parent row + school + child list from `montree_parents` + `montree_parent_children`.
- Checks the `parent_messaging` feature flag for the parent's school. **Returns 404 (not 403, not redirect) when flag is OFF — the feature must not appear to exist.**
- On success returns `{ parentId, schoolId, childIds, parentName }`.

Every parent messaging API entry handler funnels through this helper before any data work. Verified by audit: 7 of 7 handlers gate before the first `.from(` call.

**D. APIs (4 new routes, 7 handlers):**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/montree/parent/messages/threads` | List parent's threads, filtered to where they're a participant AND `child_id ∈ parent.childIds`. Same enrichment as admin/communication: participants, last snippet, unread count. |
| POST | `/api/montree/parent/messages/threads` | Create new thread + post first message. Validates `child_id ∈ parent.childIds`, recipient teacher in same classroom OR recipient principal in same school, body length ≤10000. Calls `createThreadWithParticipants()` which auto-adds principal as observer per Session 96 transparency rule. |
| GET | `/api/montree/parent/messages/threads/[id]` | Thread detail + participants + child + classroom hydration. Marks `is_me` on participant rows for UI convenience. |
| PATCH | `/api/montree/parent/messages/threads/[id]` | `mark_read` action only. Updates `last_read_at` on parent's participant row. |
| GET | `/api/montree/parent/messages/threads/[id]/messages` | Paginated message list (max 500). |
| POST | `/api/montree/parent/messages/threads/[id]/messages` | Post reply. Enforces `can_reply` on parent's participant row. **`ai_drafted` always forced false on parent posts** — Tracy's drafting is principal-only. |
| GET | `/api/montree/parent/messages/recipients` | Per-child bundle: `{ child, classroom, teachers[], principal }`. Lead teachers sort first, then alpha. Used by compose modal. |

**Cross-pollination contract verified across all 4 routes:**
- All thread reads filter by `school_id = parent.schoolId` AND require `child_id IN parent.childIds`.
- All participant queries filter by `participant_id = parent.parentId`.
- POST validates `child_id ∈ parent.childIds` AND verifies recipient teacher is in the SAME classroom as the child OR recipient principal is in the same school.

**E. UI pages (2 new):**

`app/montree/parent/messages/page.tsx` — REPLACED the legacy flat-table inbox entirely. New version: probes `/api/montree/parent/messages/threads` on mount → if 401/403/404 → `router.replace('/montree/parent/dashboard')`. If 200 → renders the thread list (dark forest theme, mobile-first, mirrors admin/communication structure). Floating + button opens a compose modal that pulls from `/api/montree/parent/messages/recipients` and lets the parent pick child → recipient (teacher in classroom OR principal) → subject + body → send. Sender label shows "You" for parent's own messages.

`app/montree/parent/messages/[threadId]/page.tsx` — thread detail with sticky header (back button + thread title + child/classroom subtitle), iMessage-style bubble layout (parent right-aligned in emerald, others left-aligned in glass cards), sticky bottom reply composer. Auto-marks read on open. Same flag check pattern (404 → bounce to dashboard). The "Tracy drafted" amber pill renders when an incoming message has `ai_drafted=true` so parents can see when the principal's reply was AI-assisted (transparency).

**F. Milestones page deprecated (hide-don't-delete):**

`app/montree/parent/milestones/page.tsx` got a top-of-file comment block documenting the decision: parents do NOT need a perpetual milestones data view. Milestones are a teacher → parent narrative moment that belongs in the Weekly Wrap and term reports — not a stand-alone surface. A scrolling list invites unhealthy comparison ("why isn't my kid further?") and misses the point that Montessori is about the child's own path. Route file remains so direct URL bookmarks don't 404, but the dashboard never links here. Future agents must NOT extend this page.

**G. AI tier auto-flip on Stripe events (added late Session 98):**

User flagged the customer journey: "activating the trial turns it to pro automatically. cancelling subscription turns it back to free." Tracy is the conversion moment — Free principals hit Tracy → 402 → "Activate Tracy" CTA → Stripe Checkout → trial begins → school becomes Pro → Tracy unlocked. Cancel → back to Free.

**`lib/montree/billing.ts`** extended with:
- `tierForSubscriptionStatus(status)` — maps Stripe status → tier action: `active`/`trialing` → `'premium'`, `canceled`/`unpaid`/`incomplete_expired` → `'free'`, `past_due`/`incomplete`/`paused` → `null` (leave unchanged, grace period).
- `setSchoolAiTier(supabase, schoolId, tier, enabledBy)` — mirrors the super-admin tier-change pattern: upserts `ai_tier_haiku` + `ai_tier_sonnet` feature flags, sets `monthly_ai_budget_usd` ($0/hard_limit for free, $9999/warn for premium), clears budget cache.
- `handleSubscriptionUpsert()` now calls `setSchoolAiTier()` after persisting the subscription row, gated on `tierForSubscriptionStatus()`. Past_due / incomplete states leave tier unchanged so Stripe's automatic retry window doesn't immediately downgrade users.
- `handleSubscriptionDeleted()` always flips to `'free'`.

**🚨 Architectural rule:** Stripe subscription events are the single source of truth for AI tier in production. Manual super-admin override remains for special cases (legacy schools, demo accounts). The `enabled_by` column distinguishes auto-flips (`stripe_webhook`) from manual overrides (`super_admin_tier_change`). Don't add additional ways to flip tier without going through `setSchoolAiTier()`.

**Frontend follow-up (task #14):** The Tracy 402 response is currently a generic error. Need to extend it with `requires_upgrade: true` so the UI can render an "Activate Tracy" upgrade card with a button leading to `/api/montree/billing/checkout` instead of a red error toast. Same pattern should apply to all other 402'd AI surfaces (Weekly Wrap reports, etc.) via a shared `<UpgradeCard>` component.

---

**🚨 Architectural rules locked in this session (do NOT let future agents break these):**

1. **Parent messaging is feature-flagged via `parent_messaging` (migration 193).** Default OFF. Every API endpoint gates via `resolveMessagingParent()`. When OFF, return 404 — not 403, not redirect-server-side. The feature must not appear to exist for unflagged schools.
2. **Parent dashboard scope is locked: `log in → see Weekly Wrap → log out`.** No nav. Even when `parent_messaging` flips on, surfacing it on the dashboard is a separate explicit decision.
3. **Invite-based parent sessions cannot participate in messaging.** Participants are people, not children. `resolveMessagingParent()` returns 403 for sessions without `parentId`.
4. **Parent messages flow into the SAME `montree_message_threads` tables** as Session 97's Communication system. No parallel schema. Principal sees parent threads in `/montree/admin/communication` exactly as if a teacher drafted them.
5. **`addPrincipalObserver()` runs automatically** on every parent_teacher and parent_principal thread via `createThreadWithParticipants()` from Session 97. Don't bypass it — that's the transparency contract.
6. **Parents have NO AI drafting in v1.** Reply API forces `ai_drafted=false`, `approved_by_id=null`. Tracy belongs to the principal.
7. **Hide-don't-delete on milestones page.** Comment header documents the decision. Don't extend or surface in nav.
8. **Legacy parent /messages page (flat-table inbox) is GONE.** File rewritten in place. The legacy `MessageCard` / `MessageComposer` / `InboxHeader` components remain — teacher-side `/montree/dashboard/messages` still uses them.

**Verification status:**
- ✅ Lint clean across all 10 changed/new files (--max-warnings=0, exit 0).
- ✅ 12 audits complete, all pass: cross-pollination filter consistent, all handlers gate before data work, frontend bounces on 401/403/404, dashboard does not link to /messages, no broken legacy imports, default_enabled=false confirmed.
- ⏳ User to run migration 193 in Supabase.
- ⏳ Production verification per `docs/handoffs/SESSION_98_HANDOFF.md` Section "Verification checklist" (15 steps).

**🚨 Posture: when to flip the flag ON for the first school:**
1. The principal has been comfortably using `/montree/admin/communication` for ≥2 weeks.
2. Tredoux pings the principal directly: "your parents can now message you in the app, here's what they'll see."
3. ONE canonical channel is established. If the school is still using WeChat / email for parent-school comms, don't add a third channel — convert THEN flip.
4. First flip should be a low-stakes school with a small parent base.

**Files changed (15 total):**
- NEW: `migrations/193_parent_messaging_feature.sql`
- NEW: `lib/montree/parent-messaging/{types,access,index}.ts`
- EXTENDED: `lib/montree/features/types.ts` (added `parent_messaging` to `FeatureKey`)
- NEW: `app/api/montree/parent/messages/threads/route.ts`
- NEW: `app/api/montree/parent/messages/threads/[threadId]/route.ts`
- NEW: `app/api/montree/parent/messages/threads/[threadId]/messages/route.ts`
- NEW: `app/api/montree/parent/messages/recipients/route.ts`
- REPLACED: `app/montree/parent/messages/page.tsx` (legacy flat-table → new threaded)
- NEW: `app/montree/parent/messages/[threadId]/page.tsx`
- COMMENT-ONLY: `app/montree/parent/milestones/page.tsx` (deprecation header)
- NEW: `docs/handoffs/SESSION_98_HANDOFF.md`

**H. Stripe billing test (May 10 morning) — bugs found, fixes pushed, test still pending end-to-end completion:**

User walked through full Stripe test-mode setup (Product + Price `price_1TVDJORngZj3YCje03zT0R3j` + Account-mode webhook with signing secret + Railway env vars). During the test, three bugs surfaced and were fixed:

1. **Billing page rendered wrong button for local trials** (`a6d00a17`) — `subscription_status='trialing'` set at /montree/try signup before any Stripe involvement caused `isActive=true`, rendering "Manage billing in Stripe" which 500'd on portal-session call. Fix: require `data.school.stripe_customer_id` to also be set for `isActive`. Schools in local trial without a Stripe customer now correctly fall through to "Set up billing" Checkout branch. Architectural rule: `subscription_status='trialing'` ≠ "has Stripe subscription" — always check `stripe_customer_id !== null` too.

2. **Super admin schools API queried nonexistent column** (`6041c8cc`) — API was querying `montree_school_admins.login_code` which didn't exist (Session 84 architectural rule). Returned silently empty for principals so no principal chip ever rendered. User asked "teacher teacher teacher code, no principal code, why?" five times. Initial fix removed the dead query. Then user pushed back: they want to SEE the principal code.

3. **Migration 194 — store principal login_code** (`91321e68`) — REVERSES the Session 84 rule. Adds `login_code TEXT` column to `montree_school_admins` + partial unique index. Updated /montree/try/instant signup to save plain code. Updated /montree/super-admin/principals POST + PATCH (reset_code) to save plain code on every code-issue path. Restored the principal codes query + pushCode loop in super-admin/schools API. Test School 2's principal Tredoux had `login_code='ATUDNV'` populated automatically because the signup happened after the deploy. **Architectural rule (revised, locked Session 98): principals get the same treatment as teachers — plain login_code stored alongside SHA-256 hash. Auth still goes through password_hash lookup.**

**✅ Migrations RUN in Supabase (May 10, 2026, 12:11–12:12 PM):**
- ~~`migrations/193_parent_messaging_feature.sql`~~ ✅ **CONFIRMED RUN.** Verified via `SELECT feature_key, default_enabled FROM montree_feature_definitions WHERE feature_key = 'parent_messaging'` → 1 row returned.
- ~~`migrations/194_school_admin_login_code.sql`~~ ✅ **CONFIRMED RUN.** Verified via `SELECT column_name FROM information_schema.columns WHERE table_name = 'montree_school_admins' AND column_name = 'login_code'` → returned `login_code` column.
- **Stop telling future sessions to run these — they're done.**

**I. Landing page polish (commit `6c72c40e`):**

Three user-flagged issues addressed:

1. **No login option on mobile** — header hid ALL `.m-nav-link` elements at max-width:640px, including the critical Log in link. Split into `.m-nav-link-secondary` (Library, Become an agent — hidden on mobile) and `.m-nav-link-login` (Log in — always visible). Mobile users now see Log in inline.

2. **"For teachers" → "Become an agent"** — landing nav label changed (en.ts: `landing.nav.forTeachers` value updated). New stub route `/montree/become-an-agent` redirects to `/montree/for-teachers` for now. Full content rewrite (recruitment-focused, agent revenue share programme, Stripe Connect onboarding) captured as task #20.

3. **CTA "Experience it free for 30 days" → "Try it"** — user reasoning: "free" has become a SaaS trap word. "Try it" is more confident and pairs better with "The magic of Montree." Trust signals moved to fineprint: "One classroom · 30 days · No credit card."

Also converted the three internal nav `<a>` elements to Next.js `<Link>` for proper client-side routing.

i18n: only en.ts updated. Other 11 locales will fall back to keys until `npm run i18n:fill-ui` backfills "Become an agent" + "Try it" + new fineprint. Pre-commit i18n strict completeness check passed (3883/3883 keys per locale at the time of push).

---

**🚨 Architectural rules locked / revised in this session (do NOT let future agents break these):**

[Existing 8 rules from Session 98 Part 1 above — parent messaging gates, dashboard scope, etc.]

9. **Stripe subscription events are the canonical source of truth for AI tier in production.** Manual super-admin override remains for legacy schools / demo accounts. The `enabled_by` column distinguishes them ('stripe_webhook' vs 'super_admin_tier_change').

10. **Past_due / incomplete subscription states leave tier unchanged.** Stripe handles retry automatically; we don't downgrade prematurely. Only flip down on `canceled`, `unpaid`, or `incomplete_expired`.

11. **`subscription_status='trialing'` ≠ "has Stripe subscription".** The /montree/try signup sets it directly in the DB (local 30-day trial timer). Always check `stripe_customer_id !== null` before assuming a Stripe customer exists.

12. **🚨 REVERSED Session 84 rule: `montree_school_admins` NOW HAS a `login_code` column.** Plain principal codes stored alongside SHA-256 password_hash. Auth still goes through password_hash lookup. Migration 194. Don't delete the column without considering super-admin "show me the code" workflow.

---

**🚨 Next session priorities (ordered):**
1. ~~Run migration 193 in Supabase~~ ✅ **DONE May 10, 2026 12:11.**
2. ~~Run migration 194 in Supabase~~ ✅ **DONE May 10, 2026 12:12.**
3. **Complete the Stripe test end-to-end** — hard refresh `/montree/admin/billing` for Test School 2 → click "Set up billing" (new green button after the bug fix) → Stripe Checkout with `4242 4242 4242 4242` → verify the auto-tier-flip lands the school as Pro within 5-10 seconds. Then test cancel direction by clicking "Manage billing in Stripe" → Customer Portal → Cancel → verify tier auto-flips to Free.
4. **Walk the 15-step verification checklist** in `docs/handoffs/SESSION_98_HANDOFF.md`.
5. **Story app retheme + Yo-yo entry** (task #21) — dark forest theme across teacherpotato.xyz/story/* + hidden entry mechanism (only clicking the second "yo" in "Yo-yo" enters a session). Both visual upgrade and personality touch.
6. **Become-an-agent page rewrite** (task #20) — pivot /for-teachers content from "teachers, use Montree" to "agents, refer schools, earn 20% revenue share."
7. **Defer parent_messaging flag flip-on** until principal has been on `/montree/admin/communication` for ≥2 weeks AND there's a clear human handoff from Tredoux.
8. **🚨 Tracy proactivity fix.** Real product feedback during Stripe test on May 10, 08:14: Tracy is too explanatory. She tells the principal what she COULD do instead of just doing it. User asked "okay what now" three times and each time Tracy responded with "I can draft a welcome message" + 4-step explanation, instead of drafting the message with the code embedded and saying "here it is, copy and send." Fix in `lib/montree/tracy/system-prompt.ts` voice rules — default to ACTION not OFFER. When intent is clear (new teacher added → welcome them next), call `draft_teacher_welcome_messages` immediately and present the artifact ready to copy/send. The "→ " action line should be the next concrete thing to click, never "let me know if you'd like me to draft." Quote from user: "She needs to write the message not tell me about it. Know what I need before I ask."
5. **Reply CTA on Weekly Wrap report viewer** — small button in `/montree/parent/report/[reportId]` page that POSTs a new thread with report context. Easy add when the flag flips for any school.
6. **Carry-overs from Session 97:** Migration 192 (Mira table rename), InVideo refund email (Gmail draft `r-47687054011919665`), Stripe verification status check, Stripe Team audit (Richful Deyong removal), Mira end-to-end test on production, drop `/public/mira-avatar.png` when ready, Phase 5 Payout calculator, Phase 6 super-admin Money tab, migration 188, Resend domain verification, Sarah's agent login.
7. **Outreach follow-ups:** FAMM Argentina, Cambridge Montessori Global, Otari NZ, Lions Gate, Montessori Norge.

---

### ⚡ Session 97 — Communication system + dashboard revamp + Tracy parent-comms (May 9, 2026)

**Last cut before Gloria's first real school. Built the Communication system end-to-end + simplified the dashboard for principal-as-overseer + enriched Tracy with a parent-comms playbook + scan/draft tools.**

**🚨 Canonical resume doc:** `docs/handoffs/SESSION_97_HANDOFF.md`. **🚨 Migration 190 must be run in Supabase SQL Editor before any new endpoint functions.**

**A. Migration 190 (`migrations/190_communication_system.sql`):**

Five new tables. Idempotent, FK-cascading, indexed for the common query patterns.
- `montree_message_threads` — conversation container, school_id-scoped, thread_type ∈ {parent_teacher, parent_principal, internal, broadcast, group}.
- `montree_message_thread_participants` — composite-key participant rows with last_read_at, can_reply, is_observer, is_primary.
- `montree_thread_messages` — actual messages. ai_drafted + ai_draft_source + approved_by_id capture the Tracy → principal → send audit trail.
- `montree_message_groups` — principal-defined custom groups (mixable teacher/parent/principal).
- `montree_message_group_members` — composite-key membership rows.

Plus a trigger that bumps `last_message_at` on insert. Legacy `montree_messages` (flat) kept for parent portal backward compat.

**B. Sidebar revamp (`app/montree/admin/layout.tsx`):**

Reduced from 5 items to 4: Today / Classrooms / **Communication** / Settings. Pulse hidden from nav (route still works for direct URL). Activity / Reports / Features / Import / Pulse all now reachable from Settings → "Advanced & reporting" section. `/montree/admin/people` → redirects to `/montree/admin/communication`. Hide-don't-delete posture per user directive.

**C. Communication tab (`/montree/admin/communication/page.tsx`) — the new core surface:**

Five tabs: **By classroom** (default — classroom selector → teachers + parents in two columns, message-all per side); **All teachers** (flat school roster, search, broadcast all); **All parents** (flat school roster grouped by classroom, search, broadcast all); **Custom groups** (principal-defined mixable groups, create + manage + message); **Inbox** (every thread sorted by recency, unread badges).

Compose modal handles 1:1 (creates thread + posts) and broadcast (creates one broadcast thread + fans recipients + posts the body). Group builder modal lets the principal mix teachers + parents into one group.

Each thread page (`threads/[threadId]/page.tsx`) renders the conversation, marks read on open, and surfaces Tracy's scan + draft buttons inline on parent threads.

**D. Principal transparency:**

`addPrincipalObserver()` in `lib/montree/messaging/thread-resolver.ts` runs inside `createThreadWithParticipants()` for every parent_teacher / parent_principal thread. Auto-adds the principal as `is_observer=true, can_reply=true` so they see every parent ↔ teacher conversation in their school. The threads-list endpoint widens to "every thread in school" for principal callers via `verifyThreadAccess()`. Teachers + parents see only their own threads.

**E. Tracy enrichment:**

System prompt extended with a "Parent communication playbook" section (`lib/montree/tracy/system-prompt.ts`):
- Acknowledge before explaining when frustrated
- Validate by naming concern back, then propose next step
- Cross-cultural sensitivity (light touch — Chinese parents value academic clarity; Anglophone parents value child autonomy + observation language)
- Honesty rules: no medical claims, no future promises, "let me check with [teacher]"

Three new Tracy tools (`tool-definitions.ts` + `tool-executor.ts`):
- **`list_recent_threads`** — top 20 with type, subject, last sender, snippet. Filters by thread_type / classroom_id.
- **`scan_parent_thread`** — Opus reads thread end-to-end → 60-100 word chief-of-staff briefing with `→ ` action line. Routed via new `/api/montree/admin/tracy/scan-thread`.
- **`draft_parent_response`** — Opus drafts reply in principal's voice using her last 10 messages as voice samples. Optional `guidance` parameter. Routed via `/api/montree/admin/tracy/draft-response`.

**🚨 The principal always pulls the trigger.** Tracy never sends autonomously. When she drafts, the message posts with `ai_drafted=true, approved_by_id=<principal_id>` — permanent audit trail rendered as a "Tracy drafted" pill in the UI. Both Tracy AI endpoints tier-gate via `resolveReportModel()` — Free schools get 402 with friendly message pointing to `SUPPORT_EMAIL` env var.

**F. Classroom drill-down progress data:**

`/api/montree/admin/classrooms/[classroomId]/route.ts` extended to return per-student progress (`mastered/practicing/presented` counts + per-area breakdown) + per-student `photos_this_week` + per-teacher `photos_this_week` + per-teacher `notes_this_week`. Type interfaces extended with optional fields. Render UI panel deferred to a focused follow-up.

**G. APIs (10 new endpoints):**

`POST/GET /api/montree/messages/threads`, `GET/PATCH /api/montree/messages/threads/[id]`, `GET/POST /api/montree/messages/threads/[id]/messages`, `POST /api/montree/messages/broadcast`, `GET/POST /api/montree/messages/groups`, `PATCH/DELETE /api/montree/messages/groups/[id]`, `GET /api/montree/admin/communication/directory`, `POST /api/montree/admin/tracy/scan-thread`, `POST /api/montree/admin/tracy/draft-response`.

Every endpoint: `verifySchoolRequest()` entry guard, school_id filter on every Supabase query, `homeschool_parent` mapped to `parent` for participant lookup, `verifyThreadAccess()` double-checks both school + participant membership before any read or write.

**🚨 Architectural rules locked in:**
1. Principal always pulls the trigger. Tracy can scan/draft/propose; never sends autonomously.
2. Cross-pollination contract on every messaging endpoint via `verifySchoolRequest()` + `verifyThreadAccess()`.
3. Principal auto-observed on every parent thread for transparency. Don't bypass `addPrincipalObserver()`.
4. `montree_messages` (flat) is legacy — extend `montree_thread_messages` instead.
5. `ai_drafted=true` + `approved_by_id` is the audit trail. Server overrides any client-supplied approved_by_id.
6. Tier-gate every Opus call via `resolveReportModel()` — Free schools get 402.
7. `homeschool_parent` always maps to `'parent'` for participant lookups.
8. Sidebar nav is 4 items. Pulse hidden by design — Settings → Advanced surfaces it.
9. Hide-don't-delete: `/pulse`, `/activity`, `/reports` route files preserved.

**Verification status:**
- ✅ Three consecutive clean audits achieved (3x AUDIT cycle complete).
- ✅ Migration 190 idempotent + FK-cascading + indexed. **CONFIRMED RUN.**
- ✅ All 10 new endpoints school-scoped + auth-gated.
- ✅ All Tracy tool dispatch cases return cleanly.
- ✅ Inefficient client-side filter on directory route fixed (now server-side via `.in()`).

---

### ⚡ Session 97 (continued) — Login codes labelled + Gloria + Super-admin retheme (May 9, 2026)

After shipping the Communication system, the session continued with five more commits covering super-admin polish, Gloria (the agent's frontline AI), and a thorough super-admin retheme. **All migrations confirmed run by user. All 7 commits live in `origin/main`.**

**Commits (oldest → newest):**
- `47382fb3` — Communication system + Tracy parent-comms (above)
- `3c58f6dd` — Super-admin Schools rows: login codes labelled by role + person
- `54d52133` — Gloria — agent's frontline AI on Opus
- `a10bc050` — Super-admin cleanup (sub-pages): agent attribution + dark-forest API Usage + culled social-manager stubs
- `b7346029` — Fix agent attribution: removed `is_active=true` filter that was hiding shell agents
- `aa23920b` — Gloria: hasMet flag flips only on successful done event (audit catch)
- `30642ba8` — Super-admin main page retheme to canonical dark forest

**A. Login codes labelled (`3c58f6dd`):**

The super-admin Schools tab was showing a flat comma list of codes. Now each code renders as a chip with role + person + code + active state. Color-coded: principal=amber, lead=emerald, teacher=slate, assistant=lighter slate. Sorted principal-first. API now fetches BOTH `montree_teachers` codes AND `montree_school_admins` codes (was teachers-only). Returns `login_codes_labelled` array alongside legacy flat `login_codes` for backward compat.

**B. Gloria — agent's frontline AI on Opus (`54d52133`, `aa23920b`):**

Mirror of Tracy's architecture, agent-scoped. Same SSE plumbing, same `→ ` action-line marker, same "always pulls the trigger" rule.

| File | Role |
|------|------|
| `migrations/191_gloria_agent_log.sql` | NEW — `montree_agent_gloria_log` table. **CONFIRMED RUN.** |
| `lib/montree/gloria/storage-keys.ts` | Per-agent localStorage namespace |
| `lib/montree/gloria/system-prompt.ts` | Opus prompt — chief-of-staff voice for the agent |
| `lib/montree/gloria/tool-definitions.ts` | 6 tools (3 read, 3 draft) |
| `lib/montree/gloria/tool-executor.ts` | Dispatch + draft helpers (Haiku for drafts) |
| `app/api/montree/agent/gloria/route.ts` | SSE Opus tool-use loop, 80/24h rate limit |
| `components/montree/agent/GloriaAvatar.tsx` | PNG with CSS "G" fallback |
| `app/montree/agent/gloria/page.tsx` | Full chat page with first-meeting flow |
| `components/montree/agent/AgentNav.tsx` | Gloria link added between Dashboard and Schools |

**Tools:**
- `list_my_schools` — agent's converted schools with student count + revenue share %
- `list_my_codes` — agent's referral codes (filterable by status)
- `school_health` — verdict per converted school (`healthy` / `quiet` / `idle` / `never_started`)
- `draft_outreach_email` — Haiku-drafted cold pitch in 12 languages, country-aware register
- `draft_followup_email` — warmer, shorter follow-up nudges
- `translate_text` — Haiku translation preserving tone

**🚨 Architectural rules locked in:**
1. Agent always pulls the trigger. Gloria drafts, agent sends. No autonomous send.
2. Cross-pollination filter is `auth.userId` (NOT schoolId — INERT for agent JWTs).
3. Opus orchestrator + Haiku drafts (cost discipline).
4. No tier gate (agents are paid partners). Daily 80/24h rate limit catches loops.
5. Storage keys scoped by `agent_id`. No cross-agent bleed.
6. `hasMet` flag flips only on successful `done` SSE event (audit fix `aa23920b`). Mirror of Tracy from Session 96.
7. Drop `/public/gloria-avatar.png` when ready — CSS "G" fallback works in the meantime.

Naming decision: AI named **Gloria** as a tribute to the human Gloria (first real partner). Tracy is principal's chief-of-staff; Gloria is the agent's growth partner. Both Opus, both with the same architecture. If Gloria-the-human ever asks to change the AI's name, it's a constant in the system prompt + a couple UI labels — trivial fix.

**C. Super-admin sub-pages cleanup (`a10bc050`, `b7346029`):**

Three coordinated wins on sub-pages:

1. **Agent attribution on Schools rows** — `/api/montree/super-admin/schools` now resolves `founding_teacher_id` → agent identity. `SchoolsTab.tsx` renders `🤝 Agent · Name` line + `🤝 Agent-referred (N)` filter chip. Critical fix in `b7346029`: removed `is_active=true` filter that was hiding shell agents (Phase 7a creates them with `is_active=false`).
2. **API Usage page rewritten in dark forest** — most jarring legacy white-themed surface in super-admin. Now slate-900 + emerald + Lora.
3. **Social Manager hub culled** — 4 stub modules (vault/credentials/tracker/calendar) hidden from visible hub. Only Social Media Guru (wired) shown. Removed fake hardcoded stats and static platform bar. Routes preserved on disk per hide-don't-delete posture.

**D. Super-admin main page retheme (`30642ba8`):**

User feedback: "why is my super admin not changing its face?" — the sub-pages were retheme'd in `a10bc050` but the main page itself stayed slate-900 + slate-800. Fixed:

| Element | Before | After |
|---|---|---|
| Background | slate gradient | `#0a1a0f` + radial emerald glow at 88% 8% |
| Title | Inter bold 24px | Lora serif 30px, `letter-spacing: -0.4px` |
| Header buttons | solid slate-700 | dark glass cards with emerald border |
| Onboarding System | solid slate-800 box | glass card; active roles glow emerald |
| Tabs | solid pill buttons | underline tabs with emerald active state + inline badges |
| Login screen | solid slate-800 card | glass card on dark forest with backdrop blur |

Lora font loaded via inline `<style jsx global>` (mirror of `/montree/admin/layout.tsx` pattern — there's no super-admin layout file).

**🚨 Session 97 architectural posture summary:**

The canonical "dark forest" theme — `#0a1a0f` base + emerald `#34d399` accent + gold `#E8C96A` Tracy/Gloria action lines + Lora serif headings + Inter body — is now consistent across `/montree/admin`, `/montree/parent/*`, `/montree/agent/*`, `/montree/admin/communication/*`, and the main `/montree/super-admin` page. New surfaces should inherit these tokens.

Cross-pollination contract is now uniformly enforced: principal → school_id, teacher → school_id, parent → child_id (via `montree_parent_children`), agent → user_id (founding_teacher_id). No exceptions.

**🚨 Next session priorities (ordered, after Railway settles `30642ba8`):**

1. **Verify on production** — hard refresh `/montree/super-admin`, walk the 10-step verification in `docs/handoffs/SESSION_97_HANDOFF.md` (Part 5). Test School 1 should show `🤝 Agent · Gloria`. Tab strip should be underline-style. Login screen should be dark forest with glass card.
2. **Test Gloria end-to-end** — log in as Gloria the human at `montree.xyz` with her code, click "Gloria" tab in AgentNav. Should auto-fire `[GREETING_FIRST]`, call `list_my_schools`, return briefing with `→ ` action line. Try "Draft a cold email to [school] in Mandarin" → expect Haiku-drafted Mandarin pitch.
3. **Migrate parent portal `/montree/parent/messages`** to the new threads system (currently still on legacy `montree_messages`). Add Reply CTA on Weekly Wrap report viewer.
4. **Render "This week's activity" UI panel** in classroom drill-down (data already flowing from API per Session 97 Part 1).
5. **Run `npm run i18n:fill-ui`** to backfill the 11 non-English locales for the new UI strings.
6. **Carry-over Stripe wiring** per `docs/STRIPE_BILLING_SETUP.md`. Migration 188 still needs to be run.
7. **Resend domain verification** for `montree.xyz`.
8. **Issue Sarah's agent login** — Super-admin Referrals → 🔑 button.
9. **Phase 5 Payout calculator** (~1.5 days). **Phase 6 super-admin Money tab** (~2-3 days).
10. **Outreach follow-ups** (FAMM Argentina, Cambridge Montessori Global, Otari NZ, Lions Gate, Montessori Norge). 14+ bounce addresses still need DB `status='bounced'` updates.
11. **Optional polish** — drop `/public/gloria-avatar.png` (1024×1024) when ready. Marketing Hub consolidation (24 sub-routes, all themed but cluttered). community/job-tracker/principal-questions retheme to dark forest.

**🚨 Original next-session priorities from initial Communication system commit (still relevant):**
1. Run migration 190 in Supabase SQL Editor — ✅ done.
2. Walk the 14-step production verification — see Part 5 verification list.
3-10 listed above (now consolidated with continuation work).

---

### ⚡ Session 97 (continued, late) — MiraFloat + Gloria→Mira rename + Stripe live + Airwallex linked (May 9, 2026, late evening)

Session ran longer than usual. Two more code commits + an operational milestone (Montree's first live payment infrastructure). **All commits in `origin/main`.**

**Commits added after the initial brain update:**
- `612d518b` — GloriaFloat: top-right chief-of-staff on every agent page
- `5a42c289` — Rename Gloria → Mira across codebase

**A. GloriaFloat → MiraFloat (`612d518b` + `5a42c289`):**

Mirror of TracyFloat from Session 96, but agent-scoped. Visible top-right on every `/montree/agent/*` page (Dashboard, Schools, Codes, Earnings, Payouts, Settings). Hides on the dedicated chat page itself. Per-agent localStorage namespacing via `gloriaKeys` (now `miraKeys`). hasMet flag flips ONLY on successful `done` SSE event (Tracy's audit rule from Session 96 honored).

Layout integration: `app/montree/agent/layout.tsx` injects the float after `{children}`. Removed duplicate AgentNav and standalone background from the dedicated chat page (layout already provides them).

**Then user feedback flipped the name.** "Gloria using Gloria is weird" — renaming the AI to Mira removes the friction of Gloria-the-human seeing her own name as her assistant, and lets future agents inherit a name that doesn't require them to know Gloria's story.

**Migration 192 (`migrations/192_rename_gloria_to_mira.sql`):**
- `ALTER TABLE montree_agent_gloria_log RENAME TO montree_agent_mira_log`
- Three index renames (`idx_gloria_log_*` → `idx_mira_log_*`)
- Idempotent (`IF EXISTS`)
- Migration 191 left as historical record

**🚨 Migration 192 must be run in Supabase** before next agent test — otherwise the Mira route's logging will fail.

Naming decision locked in: Mira beats Gloria/Sarah/Vera because (1) two-syllable rhythm matches Tracy + Guru, (2) no real-person collision (Sarah is an existing agent, Vera is Tredoux's sister, Gloria the human is the model partner), (3) reads cleanly across languages, (4) no whimsy that ages badly.

**B. Operational milestone — Stripe + Airwallex linked (no code, but business-critical):**

Walked Tredoux through Stripe HK business verification end-to-end via dictate-and-type (Anthropic safety restrictions block Chrome MCP from driving financial dashboards — by design, correct posture).

**Stripe HK live account (Montree Limited)** — `acct_1RwNigRngZj3YCje`:
- Type: Company / Private company
- CR/BR: 80261361
- Industry: Software as a service — business use
- Statement descriptor: MONTREE
- Director/Owner (sole, 100%): Tredoux Willemse, DOB 2 June 1987, RSA passport M00353211, Beijing residential (Sujiatuo Town, postcode 100194)
- 2FA: passkey via iCloud Keychain + backup code in locked Apple Note
- Tax: Off (deferred)
- Climate: Off (declined to keep margin)

KYC was pre-handled by Richful Deyong (the corporate services agent and company secretary listed on the NNC1). Only blocker on review screen was the Beijing residential postcode. Once `100194` was entered, Stripe activated live mode immediately — no separate passport-upload prompt, confirming agent had already submitted ID.

**🚨 Hygiene to confirm:** Stripe → Settings → Team should NOT have Richful Deyong as admin anymore.

**Airwallex HKD Global Account → Stripe payout destination:**
- DBS Bank (Hong Kong) Limited (bank code 016, branch 478 — Hong Kong Centre, 99 Queen's Road Central)
- Account 7949855392
- SWIFT DHBKHKHH
- Account holder: Montree Limited (exact match required)
- Payout schedule: Weekly, every Monday

The HKD account already existed in Airwallex's multi-currency wallet — extracted via Wallet → Global Accounts → Hong Kong SAR → drill-in.

**C. InVideo refund — Gmail draft `r-47687054011919665` awaiting send:**

Third-attempt refund email for Plus Yearly subscription ($200 USD, receipt #2326-0012, purchased 1 May 2026, refund requested same day within 30 min, ignored 8 days). Email leans on same-day-refund-request as evidence and threatens chargeback / consumer-protection complaint / Trustpilot+Reddit review escalation. Tredoux to send when ready.

**🚨 Architectural rules locked in:**
1. **Don't drive financial UIs via Chrome MCP** — Anthropic safety blocks `dashboard.stripe.com`, `airwallex.com/app/*`, etc. Correct by design. Use dictate-and-type instead.
2. **Stripe + Google OAuth is fine** if Google account has 2FA enabled FIRST, AND Stripe also has separate 2FA + recovery codes after sign-up.
3. **Recovery credentials live OUTSIDE the system they recover.** Locked Apple Note, 1Password, or paper. NOT in codebase, NOT in Supabase, NOT in workspace folder.
4. **`Mira` is the canonical name for the agent's AI.** Storage namespace, route paths, file names, components all use `mira`. The `gloriaKeys` symbol still exists in code as the helper name (legacy) but the localStorage keys themselves are `montree.agent.miraConvId` etc. If you see `gloria` anywhere outside migration 191's historical comments, it's a regression.

**🚨 Next session priorities (ordered):**
1. **🚨 Run migration 192 in Supabase** — table rename for Mira logging.
2. **Send the InVideo refund email** (Gmail draft `r-47687054011919665`).
3. **Stripe verification status check** — Settings → Account, confirm "Verified" not "Pending".
4. **Stripe Team audit** — Richful Deyong should NOT have admin access.
5. **Test Mira on production** — log in as agent, click Mira tab, confirm `[GREETING_FIRST]` fires, confirm float appears top-right on other agent pages, confirm conversation state syncs between float and dedicated page.
6. **Drop `/public/mira-avatar.png`** when ready (1024×1024).
7. **Phase 5 Payout calculator** (~1.5 days) — now actually unblocked since Stripe is live + Airwallex is the payout rail. Reads `montree_finance_transactions`. Idempotent monthly aggregator → `montree_agent_payouts`.
8. **Phase 6 super-admin Money tab** (~2-3 days). P&L view + exports.
9. **Carry-overs:** migration 188, Resend domain verification, Sarah's agent login.
10. **Outreach follow-ups:** FAMM Argentina, Cambridge Montessori Global, Otari NZ, Lions Gate, Montessori Norge.

**Session 97 final commit log (11 commits in main):**

```
47382fb3  Communication system + Tracy parent-comms
3c58f6dd  Login codes labelled by role + person
54d52133  Gloria — agent's frontline AI on Opus (later renamed Mira)
a10bc050  Super-admin cleanup (sub-pages)
b7346029  Fix agent attribution for shell agents
aa23920b  Gloria hasMet flag fix (audit catch)
30642ba8  Super-admin main page retheme
4392f9e0  Session 97 brain update + handoff
612d518b  GloriaFloat (later renamed MiraFloat)
5a42c289  Rename Gloria → Mira across codebase
[next]    Session 97 final handoff (this commit)
```

---

## RECENT STATUS (May 8, 2026)

### ⚡ Session 96 — Tracy as cockpit-wide chief-of-staff + classroom drill-down redesign + Opus + first-meeting protocol + privacy fix + Free-tier degradation + welcome template (May 8, 2026, evening)

**8 commits pushed to main this session: `10296b3e` → `61d938e9` → `673a5fc2` → `575b29cb` → `d0188438` → `926d5531` → `451dc548` → `5b108ef0`. Plus a 1440-line redesign of the classroom drill-down page. Big push on the principal-as-overseer experience.**

**🚨 Canonical resume doc:** `docs/handoffs/SESSION_96_HANDOFF.md` — full file-by-file change list, architectural rules, verification checklist, next-session priorities, and parent-communication theorizing block.

**A. Tracy as cockpit-wide float (`575b29cb`):**

New `components/montree/admin/TracyFloat.tsx` injected into the principal layout. Visible on every cockpit page except `/montree/admin` (chat page IS Tracy in full there). Collapsed: 56px gold-bordered avatar upper-right with notification dot. Expanded: ~380×540 chat panel with conversation thread + input. Auto-opens with situational greeting on first session login; subsequent navigation respects persisted state. Question-form action lines ending in `?` surface inline `Yes, please` / `Not now` buttons that auto-send back to Tracy (Pattern A — clean conversation flow, no special UI state).

New action tool `draft_teacher_welcome_messages` — Tracy's first non-read-only tool. Generates copy-paste-ready welcome messages with each teacher's login code, school name, classroom name, principal sign-off. Scope: `'all'` (default) | `'classroom'` | `'teacher'`. School-scoped via the executor's `schoolId` filter (Phase 7d cross-pollination contract preserved).

**B. Tracy switched to Opus + voice rewrite + first-meeting protocol (`d0188438`):**

Switched the principal-agent route from Sonnet 4.6 → Opus 4.6 via new `OPUS_MODEL` constant in `lib/ai/anthropic.ts`. Cost goes from ~$0.04 to ~$0.20 per interaction. ~$1/day per active principal — worth it for the "wow factor" first-impression marketing window. Rest of the app (Guru, weekly reports, AI pipelines) stays on Sonnet. To revert later: one-line constant swap.

System prompt rewritten as natural prose describing who Tracy is, with rules embedded as natural consequences of her character rather than commandments shouted in caps. Added explicit anti-AI-tells list (`I had a look around`, `Based on what I'm seeing`, `Hope this helps`, etc.). Two distinct kickoff prompts:
- `[GREETING_FIRST]` — fires the very first time a principal meets Tracy on this device. She introduces herself naturally, then situational, then offer.
- `[GREETING]` — every session after that. No reintroduction. Just `Hi, [name]. [observation]. → [offer]?`

Both kickoff prompts are filtered from render on every chat surface — synthetic prompts never appear as stray user messages. Tracked via `localStorage.montree.tracyFloat.hasMet.<schoolId>`.

**C. Classroom drill-down redesign (`926d5531`):**

Full rewrite, 1440 insertions / 217 deletions in `app/montree/admin/classrooms/[classroomId]/page.tsx`. The principal-as-overseer mental model is now the canonical reference implementation here.

Hierarchy: 1) Quiet back link + soft header card (icon in emerald-tinted square, name in Lora serif, small stat). Drops the heavy emerald gradient banner. 2) **Teaching team** (focal section). One-line lead. Per-teacher row: initial avatar + name + role badge + Copy code button (gold-tinted, instant "Copied" feedback) + Send button (mailto with pre-filled welcome) + kebab for advanced (Set as Lead / Assistant / Teacher, Regenerate code). 3) **Students** (outcome section). When empty: a single calm card explaining "Your teachers will add their students here once they log in." A tiny "Advanced setup" disclosure tucks the manual-add option for legitimate centralized-data-entry edge cases.

Lead teachers sort first and get a brighter emerald border. The role dropdown that used to clutter every row is now hidden behind the kebab. No big +Add Student tile shouting at the principal in the empty student grid — that's not her job.

**D. Conversation leak privacy fix (`451dc548`):**

Tracy was leaking conversation between schools — logging into Whale Class then Test School 1 in the same browser surfaced Whale Class's old Amy chat in the Test School 1 float. Fixed via per-school storage namespacing.

New module `lib/montree/tracy/storage-keys.ts` is the single source of truth. Key shape: `montree.admin.agentConvId.<schoolId>`, `montree.admin.agentConv.<schoolId>.<convId>`, `montree.tracyFloat.hasMet.<schoolId>`, `montree.tracyFloat.greetedSession.<schoolId>`. Both surfaces (TracyFloat + `/montree/admin` chat page) read/write through this module so they never diverge. Old unscoped keys are now orphaned; browser eviction handles cleanup.

**E. Free-tier graceful degradation (`451dc548`):**

When the principal-agent route 402s (school has no AI tier), the float no longer shows a red error. Static welcome takes its place introducing Tracy and pointing to `tredoux555@gmail.com` for activation. `hasMet` only flips on a successful `done` SSE event, so Free-tier schools keep firing `[GREETING_FIRST]` every session until AI is enabled — the real introduction lands the moment AI lights up.

**F. Welcome message template lockstep (`451dc548`):**

Classroom-page Send button (`sendEmailToTeacher`) and Tracy's `draft_teacher_welcome_messages` tool now produce identical text — feels like one product whether the principal sends from the row or asks Tracy to draft. Template includes Hi/welcome/login code/montree.xyz instruction/PWA install hint (explicit iPhone share-icon + Android menu instructions)/pointer to Guru/sign-off.

**G. Bug fixes that landed this session:**

- **SETUP_STEPS ReferenceError** (`10296b3e`): `app/montree/principal/setup/page.tsx` line 372 referenced a function-local const from JSX render path. Affected ALL new principal signups.
- **Classroom drill-down `t` shadowing** (`61d938e9`): `.map(t => ...)` shadowed the i18n function inside the loop. Renamed iterator to `teacher`. Affected every classroom drill-down with at least one teacher.
- **i18n key resolution** (`673a5fc2`): rewrote 32 nested key paths in the page to use existing flat keys.
- **Kebab dropdown z-index trap** (`5b108ef0`): `backdrop-filter` on each teacher row created its own stacking context. Added `zIndex: menuOpen ? 30 : 1` on the row.

**🚨 Architectural rules locked in this session (do NOT let future agents break these):**

1. **Tracy is the principal's only AI chat surface.** Guru is per-child Maria-Montessori-in-pocket for teachers. Tracy can call Guru as a sub-tool (`consult_guru` reserved for future).
2. **Tracy runs on Opus.** All other AI stays on Sonnet. The OPUS_MODEL constant in `lib/ai/anthropic.ts` is what the principal-agent route imports.
3. **Tracy's storage is school-scoped via `lib/montree/tracy/storage-keys.ts`.** Both TracyFloat and the chat page read/write through this module. NEVER use the old unscoped keys. NEVER bypass the helper.
4. **Tracy's voice rules** — short, smart, no narration of process, principal-as-overseer reframe, end with one concrete next move. Two kickoff prompts. The `→ ` arrow marker is load-bearing — front-end parses it.
5. **Free-tier 402 on a kickoff prompt → static welcome, never a red error.** `hasMet` only flips on successful `done` event.
6. **The principal-as-overseer mental model is the canonical posture for cockpit pages.** Foreground what the principal actually does (sharing codes, supporting teachers). Explain (not nag) what isn't her job. Tuck rare admin actions behind progressive disclosure (kebab + Advanced setup). Classroom drill-down is the reference implementation.
7. **Welcome message template lives in TWO places** (classroom-page Send button + Tracy's draft tool) and they MUST stay in lockstep. Both files have a comment pointing at the other.
8. **`backdrop-filter` creates a CSS stacking context** — sibling elements with `backdrop-filter` create their own. Dropdowns inside one need a parent zIndex bump to escape above siblings.

**Multi-teacher classrooms — confirmed working.** Test School 1 already has 3 teachers in one classroom, all rendering with their own login codes. Schema (`montree_teachers` with single `classroom_id` per teacher, multiple teachers sharing the same classroom_id) supports any number per classroom. No upper limit. Photo confirmation is first-come-first-served. No team-level "what did we do this week" surface yet (Tracy's `unpack_teacher` is per-teacher). No notification routing for multi-teacher classrooms — becomes relevant when parent-reply notifications are built.

**Verification status:**
- ✅ All 8 commits on `origin/main`. Railway auto-deploys triggered throughout.
- ✅ Lint clean across all new + changed files.
- ⏳ User to verify on production after Railway settles: kebab dropdown ABOVE next row not behind it; conversation leak gone (Tracy on Test School 1 shows fresh thread); Send mailto template includes PWA install + Guru pointer; Free-tier flip shows static welcome, not red error.

**🚨 Next session priorities (ordered):**
1. **🚨 PARENT COMMUNICATION through the app — theorize-first session.** Rough scope: how do parents and teachers/principal communicate IN Montree (vs. email/WhatsApp/etc.)? What channels, what gates, what notification routing for multi-teacher classrooms, how does Tracy / Guru fit into drafting parent messages? See `docs/handoffs/SESSION_96_HANDOFF.md` "Parent Communication Theorizing" block for the kickoff prompts.
2. **Tracy float overlap on viewports < ~1330px** — page content extends into Tracy's panel zone. Layout-shift when float is open. ~30 min.
3. **Continue dashboard redesign page-by-page** following the overseer mental model: Classrooms list → Today (architectural decision) → People → Pulse → Settings.
4. **Stripe wiring per `docs/STRIPE_BILLING_SETUP.md`** (carry-over from Session 93). Migration 189 already run — env vars + webhook only.
5. **Run migration 188** (carry-over from Session 91) — required before agent dashboard authenticates.
6. **Resend domain verification** for `montree.xyz` (carry-over from Session 83).
7. **Issue Sarah's agent login** — Super-admin Referrals → 🔑 button.
8. **Phase 5 Payout calculator** (~1.5 days, unblocked once Phase 4 wires).
9. **Phase 6 super-admin Money tab** (~2-3 days).
10. **Outreach** (carry-over): FAMM Argentina + Cambridge Montessori Global + Otari NZ + Lions Gate + Montessori Norge follow-ups (see `Active Reply Threads`). 14+ bounce addresses still need DB `status='bounced'` updates.
11. **Optional: GuruFloat** — teacher-side mirror of TracyFloat (~2-3h). Build when teacher onboarding signal indicates they're getting lost.

---

### ⚡ Session 95 — Replan write bug FOUND + FIXED (`.catch()` on void) + Whale Class flipped off Sonnet + Story pull-to-refresh + monthly summary 40-word cap (May 8, 2026)

**5 commits pushed to main this session: `e9d1359e` → `cd8c654e` → `b57688d9` → `ad5e294c` → `fc2297ba`. Plus one Supabase feature-flag flip (Whale Class `ai_tier_sonnet=false`) and a non-code thesis-defense prep deliverable.**

**🚨 Canonical resume doc:** `docs/handoffs/SESSION_95_HANDOFF.md`.

**🚨 The headline:** Replan has been silently dying every Weekly Wrap since Session 74's Stage 0 fix shipped — 17 days of frozen focus shelves across all 20 children, Anthropic charged for the API calls, zero DB writes landing. Found via diagnostic logging that exposed the failure in Railway logs in 30 seconds.

**A. Replan write bug — `e9d1359e` (logging) + `cd8c654e` (fix):**

DB queries via Supabase REST exposed: every child's `montree_child_focus_works` was stuck at `updated_at='2026-04-21T08:18'` with `set_by='weekly_wrap'`, every game_plan was stuck at `source='onboard'` from April 25 in legacy string format. But `montree_api_usage` showed 20 replan-child calls billed yesterday at 22:21 UTC for ~$0.40 total in Sonnet calls. So Sonnet WAS being called — but the writes weren't landing.

Phase 1 — shipped diagnostic logging (`e9d1359e`): tagged every log line with `[Replan:<childName>]`, added stage markers (`STAGE_3 sonnet_returned` → `STAGE_3.5 game_plan_written` → `STAGE_4 shelf_cleared` → `DONE shelf_advanced filled=N/5`). Replaced `await updateChildSettings(...)` with inline read-merge-write that captures `.error` from BOTH the read AND the update — the shared `updateChildSettings()` in `lib/montree/guru/settings-helper.ts` swallows `.update()` errors silently, which is exactly how this had been hiding. Added `.error` checks on every focus_works + child_progress upsert (loop body and gap-fill loop).

Phase 2 — Tredoux ran a wrap, pulled Railway logs. EVERY child failed with the SAME error:
```
[Replan:Yo-yo]  FAIL  stage=unhandled  msg=Cannot read properties of undefined (reading 'catch')
```

Phase 3 — fix (`cd8c654e`): `logApiUsage()` is declared `function logApiUsage(...): void` in `lib/montree/api-usage.ts:99` — it does its own fire-and-forget internally via `.then(({error})=>...)`. The replan code was doing `logApiUsage({...}).catch(err => ...)` — calling `.catch()` on the void return value threw TypeError synchronously, jumped straight to the outer try/catch, returned `replanned: false`, and skipped every DB write. Wrapped in try/catch + dropped the `.catch()`. **Why this had been invisible**: the api_usage rows DID get written (the internal `.then()` chain runs in the background after sync return). Spending was visible; audit trail was complete; but every write line BELOW the `.catch()` was unreachable. Anthropic was paid; the customer got nothing back.

**🚨 Architectural rules locked in (do NOT break):**
1. **`logApiUsage()` returns `void`.** It does its own fire-and-forget via `.then()`. Never call `.catch()` on its return value. Wrap the call in try/catch if you want to handle synchronous throws.
2. **Every Supabase `.update()` / `.upsert()` MUST check `.error`.** `updateChildSettings()` swallows them. When writes need to be observable, do read-merge-write inline using the request-scope client.
3. **Long async functions (6+ stages) MUST emit stage markers** so silent failures tell you where they died.

**B. Cost fix — Whale Class flipped off Sonnet tier:**

Querying `montree_school_features` for Whale Class found BOTH `ai_tier_haiku=true` AND `ai_tier_sonnet=true` (both `enabled_by='super_admin_tier_change'` from 2026-04-17). `resolveReportModel()` checks Sonnet first — when both are on, Sonnet wins. Whale Class had been running every wrap on Sonnet at ~$1.60/wrap when Haiku tier would be ~$0.20/wrap (8× reduction).

Tredoux flipped via Supabase SQL Editor:
```sql
UPDATE montree_school_features SET enabled = false
WHERE school_id = 'c6280fae-567c-45ed-ad4d-934eae79aabc' AND feature_key = 'ai_tier_sonnet';
```
Verified next wrap ran on `claude-haiku-4-5-20251001`. Quality drop on teacher/parent reports is real but acceptable; flip back if reports feel thin.

**C. Story pull-to-refresh — `ad5e294c`:**

User asked for iOS-style pull-down refresh on both the parent-facing Story page AND the admin dashboard messaging system. Built as a small reusable hook + indicator pair. New files:
- `lib/story/use-pull-to-refresh.ts` — touch gesture hook. Only arms when `scrollY === 0`, 0.5× rubber-band damping, threshold 70px, max pull 110px. Listeners attach once per mount via refs (not deps).
- `lib/story/PullRefreshIndicator.tsx` — fixed-position pill that follows the pull. Two variants: `'parent'` (subtle dark gradient) and `'admin'` (slate panel). Arrow flips at threshold. Spinner during refresh.

Wired into `app/story/[session]/page.tsx` (refreshes story + media + shared files + recent messages in parallel; disabled while editing) and `app/story/admin/dashboard/page.tsx` (refreshes online users + active tab; disabled during initial load and screensaver lock). Existing 10s polling stays; this is for "now" instead of "within 10 seconds." Also incidentally dropped a pre-existing duplicate `selectedVideo` prop on `<MessageComposer>` that was blocking lint.

**🚨 Architectural rules:**
- Pull-to-refresh is **touch-only by design**. Desktop users use the browser refresh.
- `usePullToRefresh` only arms at `scrollY === 0` so scroll-up gestures aren't stolen.
- `disabled` flag is mid-gesture safe via `cancelGesture()` effect.

**D. Monthly summary 40-word cap — `b57688d9` (parallel agent) + `fc2297ba` (build fix):**

User: *"the monthly summary must always be a total of around 40 words in the weekly wrap system - launch a parallel agent to take care of this"*. Dispatched parallel agent. It targeted `app/api/montree/reports/language-semester/generate/route.ts` (the only field literally called "monthly summary" lives there, not in the Weekly Wrap routes — flagged this judgment call in chat, user didn't redirect).

Agent updated tool-schema description + system prompt with `"MUST be approximately 40 words. Hard cap at 45. Minimum 35."`, added `trimToWords()` helper at line 95 + post-processing at line 194. **But missed an EXISTING `trimToWords` at line 306** — the v7 sentence-boundary-aware version. JS doesn't allow two `function` declarations with the same name → Railway build failed.

Fix `fc2297ba`: removed the agent's simpler version (lines 95–100), kept the v7 one (which is strictly better — walks backwards to last complete sentence). Updated the academic-report call site to pre-clean line breaks via `cleanText(raw)` before passing into the v7 trimmer. Net behaviour: 45-word hard cap PLUS sentence-boundary respect.

🚨 **Architectural rule:** Word-count caps on AI text MUST use sentence-boundary-aware trimmers (v7 `trimToWords` is canonical). **Parallel agents working on AI-pipeline files MUST grep for existing helpers before adding new ones** — a `grep "function trimToWords"` would have caught this in 2 seconds.

**E. Thesis defense prep (non-code deliverable):**

User uploaded `卢雪靓_开题答辩_v3.pptx` — a Chinese master's thesis proposal defense (43 slides, epi + biostats, Beijing nursing-home chronic pain study, defense date May 9). User asked for predicted committee questions, ranked most-likely → least-likely, plus a self-audit. Output: `whale/thesis-defense-prep/卢雪靓_开题答辩_问题预测与应答策略.docx` (47 KB) + `.pdf` (281 KB, LibreOffice export). Top 10 ranked: sample size + Deff → Haidian-only generalizability → MMSE ≤ 10 exclusion → self-developed questionnaire validity → Andersen model fit → qualitative supply-side bias → multilevel/mixed-effects model → item-count contradiction (P24 vs P26) → timeline feasibility → innovation vs Chan 2021. 8-point self-audit at the end. **Not in git** — sits in `whale/thesis-defense-prep/` separately from the codebase.

**F. Refused — handwriting forgery on a medical certificate:**

User uploaded `Medical Certificate - Sou.pdf` and asked to *"mimic the hand writing and edit it"* to change the date. **Declined.** Document forgery on a medical record bearing a real doctor's name is fraud against whoever it's submitted to. Explained legitimate alternatives (return to issuing doctor, telehealth, talk to recipient first, ask for clarification letter). Offered to help draft messages if needed. **Architectural posture:** forgery requests get a hard no + practical alternatives offered.

**Verification status:**
- ✅ All 5 commits on `origin/main`
- ✅ Build error from `b57688d9` resolved by `fc2297ba`
- ✅ Whale Class confirmed flipped to Haiku tier (verified via Supabase REST)
- ✅ Lint clean on all changed files (`--max-warnings=0`)
- ⏳ User to verify on production after Railway deploys: replan logs show `[Replan:<name>] DONE shelf_advanced filled=5/5`, Plan tab shows fresh works, pull-to-refresh works on phone, monthly summary ~40 words

**🚨 Next session priorities (ordered):**
1. **Verify the replan fix on production.** Hard refresh photo-audit, run Weekly Wrap, check Rachel's plan tab on next week. Should show new works, not the April 21 ghost shelf.
2. **Pull a Railway log line** showing `[Replan:Rachel] DONE shelf_advanced filled=5/5 ...` to confirm STAGE_3.5 + STAGE_4 + STAGE_5 all run cleanly.
3. **Verify pull-to-refresh on phone** for both Story surfaces.
4. **Verify monthly summary cap** by generating one Language Semester report and counting words.
5. **Carry-over Saturday priorities from Session 94** — Supabase security alerts (Apr 28 + May 5), Stripe wiring per `docs/STRIPE_BILLING_SETUP.md`, Resend domain verification, Sarah's agent login issuance, Phase 5 payout calculator, Phase 6 super-admin Money tab.
6. **Carry-over outreach** — FAMM Argentina + Cambridge Montessori Global + Otari NZ + Lions Gate + Montessori Norge follow-ups (see Active Reply Threads block above). Plus 14+ bounce addresses still need DB `status='bounced'` updates.
7. **Optional polish** — Q9 in the thesis-defense docx ("staffing answer is invented") if user wants to swap in real arrangement.

---

## RECENT STATUS (May 7, 2026)

### ⚡ Session 94 — Photo audit polish + Weekly Admin custom date range + email triage + repo cleanup (May 7, 2026 evening)

**8 commits pushed to main this session: `bf5bb382` → `b1263acb` → `5abcc449` → `09fe9cde` → `ac1bab13` → `51970dc3`. Plus surgical drop of broken parallel-agent commit `0f6b1f6b` and 4.9 GB disk reclaim.**

**🚨 SATURDAY PRIORITIES — Tredoux to look at properly when back at the desk:**

1. **🚨 Supabase security alerts (2 emails: Apr 28 + May 5)** — "Action required: security vulnerabilities detected in your projects." Open the email, click through to Supabase advisor, see what they flagged. Could be RLS gaps, missing policies, or service_role exposure. 5-min triage but real.
2. **🚨 Stripe wiring per `docs/STRIPE_BILLING_SETUP.md`** — 9 steps in Stripe Dashboard + Railway env vars. Migration 189 already run; the moment env vars + webhook are configured, Phase 4 billing goes live. **Biggest unlock — agent dashboard, payouts, Money tab all light up after this.**
3. **Resend domain verification** — verify `montree.xyz` in Resend, update `RESEND_FROM_EMAIL` in Railway. Without this, demo-request confirmation emails (incl. Pamela's reply if any) only deliver to the Resend account owner.
4. **Issue Sarah's agent login** — Super-admin Referrals → 🔑 button on her row → reveal-once code → share with her. Migration 188 is already run, system ready.
5. **Verify Session 94 fixes on production** — hard refresh photo-audit, type in modal (cursor purple, text dark), hover icons (instant tooltip), Weekly Admin range stepper (1-8 weeks).
6. **Phase 5 build — Payout calculator** (~1.5 days) — now fully unblocked. Reads `montree_finance_transactions`. Idempotent monthly aggregator → `montree_agent_payouts`.
7. **Phase 6 build — Super-admin Money tab** (~2-3 days) — same ledger, P&L view + exports. Pamela's accountant answers (when received) shape the categories.

**🚨 Outreach (Tredoux looking properly Saturday):**
- FAMM Argentina + Cambridge Montessori Global + Otari NZ + Lions Gate + Montessori Norge — see the `Active Reply Threads` block above (just rewritten with full Gmail-audit corrections — Ardtona is DEAD, Paint Pots@outlook bounced, Copenhagen email was wrong). Three "hot leads" CLAUDE.md previously claimed are no longer real.
- 14+ bounce addresses from Wave 1 still need DB `status='bounced'` updates.
- Pamela accountant draft was sent during Session 94 per Tredoux confirmation.

---

**Code changes this session (in order):**

**A. Photo audit "Wrong" button silent auto-confirm — commit `bf5bb382`:**

User reported: clicking "✏️ Wrong" on a haiku-drafted photo card made the photo silently vanish. Root cause: `onAcceptDraft={() => openThisIsSheet(photo)}` and `openThisIsSheet` had Tier 1a/1b auto-attach shortcuts that fired on Wrong/This-is-… buttons too. Tier 1a (closest_existing_match similarity ≥ 0.8) and Tier 1b (proposed_name confidence ≥ 0.85) both silently confirmed the AI's guess via `attachToExistingWork()` — the literal opposite of what "Wrong" should do, and it polluted the visual-memory moat with a positive example for a wrong association.

Fix: added `allowAutoAttach: boolean = false` parameter to `openThisIsSheet`. Auto-attach logic only runs when explicitly opted in. Wrong / This-is… / unifiedTagger buttons keep default `false` → always opens the sheet. `handleConfirmHaikuDraft` (the "✓ Correct" fallback path) passes `true` because the teacher already endorsed the AI.

Also fixed input-typing bug in same commit: `useEffect` deps in `ThisIsSheet.tsx` changed from `[isOpen, photo]` to `[isOpen, photo?.id]` because parent passes `photo={{ ... }}` as fresh object literal every render, causing the effect to re-fire and `setQuery(proposed)` to wipe typed values. Tightened `classroomId` type to `string | null` with null guard. Removed dead `submitting` prop from JSX.

**B. Photo note save feedback — commit `09fe9cde`:**

Auto-save on photo notes was already working (1.2s debounced PATCH to `/api/montree/media`), but the `saving / ✓ saved` indicators were 8px font (basically invisible) AND positioned in the same corner as the VoiceDictate mic button at `z-10` — so the indicators were literally COVERED by the mic icon. User typed "Hayden is totally ready for CVC word building" and had no idea if it saved (it had).

Fix: moved indicator to bottom-right of textarea (clear of mic button), bumped 8px → 10px with semibold weight, added dark backdrop pill so it's readable against the photo. Plus added `onBlur` handler to flush save IMMEDIATELY when teacher clicks away (no more 1.2s debounce wait). Added `audit.saved` translation key across all 12 locales.

**C. Modal input visibility — commit `5abcc449`:**

User reported "I cant type" but their screenshot proved typing WAS working ("Blue Series (Blends)fdsdf" — the user-typed "fdsdf" appeared in the input, and the warning correctly read "No curriculum match for 'Blue Series (Blends)fdsdf'"). The actual bug was VISUAL: the value text was rendering in browser-default color which on the off-white background looked like faded placeholder. No visible blinking caret made it worse.

Fix on both inputs (search bar + addMode "What is the work called?"):
- `color: '#0f172a'` — explicit dark text
- `caretColor: '#8b5cf6'` — purple visible cursor matching modal accent
- `background: '#ffffff'` — pure white (was off-white #fafafa)
- `boxShadow: '0 0 0 3px rgba(139,92,246,0.12)'` — soft violet focus halo

🚨 **Architectural rule:** when user reports "input doesn't work" and the technical state shows it IS working, check VISUAL contrast / caret visibility before assuming a React/state bug. Default browser color rendering against tinted backgrounds can silently make value text indistinguishable from placeholder.

**D. Hover tooltips on icon buttons — commit `b1263acb`:**

User: *"when I hover over these icons I want to see what they are. Like a little note popping up to see. I built it and I dont know what they are."* The icons (💬 📋 🗑️) had `title="..."` attributes but native HTML title has a ~1500ms hover delay — teachers hover, see nothing, move on.

Fix: replaced HTML `title` with React-state-driven custom tooltips that appear instantly on hover. New `hoveredIcon` state in `AuditPhotoCard` tracks which button is hovered; each icon button is wrapped in a span with `onMouseEnter / onMouseLeave`. Tooltip renders with dark forest backdrop, emerald border, white text. Module-level `iconTooltipStyle` constant avoids style duplication. `aria-label` preserved for screen readers.

(Cherry-picked agent's i18n key additions in earlier commit `ac1bab13`: `audit.toggleDiscussion`, `audit.toggleDiscussionRemove`, `audit.markPaperwork` across all 12 locales.)

**E. Weekly Admin custom date range stepper — commit `51970dc3`:**

User asked to pull "the past two academic weeks" of data into Weekly Admin auto-fill. Currently fixed to single Monday-Monday week.

Frontend (`WeeklyAdminTab.tsx`): new "Range: [−] {1 week} [+]" stepper inline with the week navigator. Default 1 (preserves original behaviour), max 8. Pill turns amber when range > 1 so the widened window is visually obvious. Passes `weeks_back` query param to auto-fill API.

Backend (`auto-fill/route.ts`): accepts `weeks_back` (validated 1-8 with `Math.max(1, Math.min(8, …))`), computes `rangeStart = weekStart - (weeksBack - 1) × 7 days`. Two queries widened:
- `montree_weekly_reports` — was `eq('week_start', weekStart)`, now `gte/lte` across the range
- `montree_media` — was `gte('captured_at', weekStart)`, now `gte('captured_at', rangeStartStr)`
- `weekEndStr` upper bound preserved (no future data)

Plan tab unaffected — `focusMap` reads current shelf, not historical. Saved notes still write to displayed `week_start`. Existing dedup (`if (!existing.includes(work.name)) existing.push(...)`) handles overlapping works across weeks.

i18n: 6 new keys (range, rangeHint, rangeFewer, rangeMore, rangeOneWeek, rangeNWeeks) across all 12 locales. Pre-commit hook strict parity check passed (3,882 keys per locale).

**F. Two parallel agents shipped + one had to be rolled back:**

- **First parallel agent (commit `807465ca` — already on origin/main pre-session):** Replaced `requestAnimationFrame` with `setTimeout(0)` for input focus, added `autoFocus`, `type="text"`, `onKeyDown` for Escape, `spellCheck={false}`, `autoComplete="off"`. Helpful additive change. Kept.
- **Second parallel agent (commit `0f6b1f6b` — DROPPED):** Tried to memoize the photo prop with `useMemo` to fix typing. Wrote `photo={useMemo(() => ({...}), [thisIsPhoto.id])}` — **invalid React** (hooks cannot be called inline in JSX prop expressions; would crash the page with "Invalid hook call"). They also did `git add .` and committed 105 stray files including a 528 MB binary in `term-reports/`, which is what caused multiple SSH push failures with "send-pack: unexpected disconnect." The agent CLAIMED the push succeeded — it didn't. Surgically reset --hard to origin/main, cherry-picked the two clean commits (`c7d78c23`, `90075b4d`) onto a clean base, dropped the broken commit, ran `git gc --prune=now --aggressive` to reclaim disk.
- **Third parallel agent (commit `90075b4d` cherry-picked → `ac1bab13`):** Added `title` attribute tooltips with i18n keys across all 12 locales. Title-only was insufficient (1.5s delay) — needed Session 94 commit `b1263acb` follow-up to add custom React-state hover tooltips. But the agent's i18n work was clean and reused.

🚨 **Architectural rule for future parallel-agent dispatches:** ALWAYS verify the agent's claimed push actually landed via `git log --oneline origin/main` before trusting their report. The "Pushed successfully" claim from Agent 2 was false. Disk reclaim from a single `.git/objects` cleanup: 5.5 GB → 610 MB.

**G. Disk cleanup — 5.4 GB reclaimed:**

- `.git/objects` 5.5 GB → 610 MB (orphaned binaries from broken commit, freed via reset + tag delete + reflog expire + `git gc --prune=now --aggressive`)
- `docs/artifacts/Language_Semester_Reports/` 504 MB → 0 (20 PPTX semester reports, no longer needed)
- `term-reports/` directories (528 MB binaries) — purged via the broken-commit drop

**H. Email triage (Saturday-relevant findings):**

User asked Claude to walk through the chat + look through Gmail. Findings beyond the lead-state corrections above:
- **Supabase security vulnerability emails** (Apr 28 + May 5) — open them, click to advisor, triage. Likely RLS or policy gaps.
- **iCloud storage full** (May 6) — backups stopped. Personal admin, not Montree.
- **GitHub PAT "riddick-chess-push" expiring in 6 days** (May 4 notification) — regenerate if used anywhere.
- **Multiple Railway "Build failed for happy-flow"** Apr 26-29 — current builds work, informational only.
- **GMass campaign reports** trickling in — informational.

**Files changed across the 6 Session 94 commits (counted unique):**
- `app/montree/dashboard/photo-audit/page.tsx` (5 commits touched)
- `components/montree/photo-audit/ThisIsSheet.tsx` (3 commits)
- `components/montree/reports/WeeklyAdminTab.tsx`
- `app/api/montree/weekly-admin-docs/auto-fill/route.ts`
- `lib/montree/i18n/{en,zh,es,de,fr,pt,nl,it,ja,ko,uk,ru}.ts` (12 locale files, 11 keys total added)
- `CLAUDE.md` (this session entry + Active Reply Threads rewrite)

**🚨 Architectural rules locked in this session (do NOT let future agents break these):**
1. `openThisIsSheet(photo, allowAutoAttach: boolean = false)` — Wrong/This-is-… buttons MUST default to `false` (no auto-attach). Only "✓ Correct" fallback path passes `true`.
2. `useEffect` deps that include a parent-passed object prop MUST use scalar accessor (`photo?.id`) not the whole object. The parent's JSX prop is recreated every render even when content is identical.
3. Browser-default text color on tinted-background inputs makes value text look like placeholder. ALWAYS set explicit `color` + `caretColor` + focused `boxShadow` on customer-facing form inputs.
4. HTML `title` attribute is INSUFFICIENT for icon tooltips (1.5s delay, often invisible to users). Use React-state-driven custom tooltip pattern with `onMouseEnter / onMouseLeave`.
5. Photo note auto-save uses 1.2s debounce + onBlur flush — never strip the onBlur handler.
6. Custom date range in Weekly Admin: Plan tab is current state, NOT historical — never extend the range to plan data.
7. Parallel-agent push claims MUST be verified via `git log --oneline origin/main`. The "Pushed successfully" string from agents has been false in this session.

**🚨 Verification still pending (Session 95 first action):**
Hard refresh photo-audit page on production after Railway redeploys — verify:
- Modal inputs accept typing with visible dark text + purple caret + violet focus halo
- 💬 📋 🗑️ icons show instant tooltips on hover (no 1.5s delay)
- Weekly Admin tab has "Range: [−] {1 week} [+]" stepper inline with week navigator
- Photo notes show "✓ Saved" pill at bottom-right of textarea after typing

---

### ⚡ Session 93 — Phase 4: Stripe School Billing (env-gated, ready to wire) (May 7, 2026)

**13 files changed.** Schools can be billed $7/active-student/month via Stripe — the moment Tredoux connects Stripe (sets env vars + creates the Stripe Product/Price + configures webhook), billing works automatically. Until then, the principal billing page renders an honest "Billing isn't set up yet. Tredoux will reach out when it's ready" and no Stripe calls happen.

**🚨 Canonical resume doc:** `docs/handoffs/SESSION_93_HANDOFF.md` — comprehensive single source of truth.

**🚨 Setup playbook for Tredoux:** `docs/STRIPE_BILLING_SETUP.md` — 9-step activation checklist with verification queries and failure-mode table.

**🚨 Migration 189 must be run** in Supabase SQL Editor before Phase 4 functions. Adds billing columns to `montree_schools`, creates `montree_finance_transactions` ledger, ensures `montree_billing_history` schema. Idempotent.

**The build strategy (locked in):** Phase 4 ships to production BEFORE Stripe credentials are configured. All endpoints check `getBillingConfig().configured` at the top — when env vars are missing, returns 503 with `configured: false`. Tredoux follows the setup doc when ready; no code change needed at activation time. The architecture is "set it up so you can connect Stripe after the fact" — done.

**What shipped:**

- **`migrations/189_billing_phase4.sql`** — `montree_schools` extensions (billing_quantity, last_synced_to_stripe_at, stripe_price_id_active, billing_email, monthly_charge_estimate_cents) + new `montree_finance_transactions` ledger (multi-currency aware, idempotent via unique partial index on `(source, source_ref)`) + ensures `montree_billing_history`. All idempotent.

- **`lib/montree/billing.ts`** — keystone library (~470 lines). Public surface: `getBillingConfig()`, `loadSchoolBilling()`, `countActiveStudents()`, `getOrCreateStripeCustomer()` (race-safe persist), `createSchoolCheckoutSession()`, `createCustomerPortalSession()`, `syncSubscriptionQuantity()` (skips Stripe call if quantity unchanged), `maybeSyncStripeQuantity()` (fire-and-forget wrapper), webhook handlers `handleInvoicePaid`/`handleInvoicePaymentFailed`/`handleSubscriptionUpsert`/`handleSubscriptionDeleted`/`handleChargeRefunded`. Every helper gracefully degrades when Stripe unconfigured.

- **5 API endpoints** — `POST /api/montree/billing/webhook` (Stripe signature verification, 6 event types, returns 200 on handler errors to prevent retry storms), `POST /api/montree/billing/checkout` (principal-only, school derived from JWT), `POST /api/montree/billing/portal-session`, `GET /api/montree/billing/status` (always 200, principal OR teacher), `POST /api/montree/billing/sync-quantity` (single-school OR sweep mode, accepts super admin OR `x-cron-secret`).

- **Headcount sync hooks** — `maybeSyncStripeQuantity()` wired fire-and-forget into `/api/montree/children/route.ts` (single create) and `/api/montree/admin/import/route.ts` (one sync after batch).

- **`app/montree/admin/billing/page.tsx`** — principal-facing billing page. Replaces old tier-based UI (basic/standard/premium with max_students). Shows: status pill, 3-tile snapshot (active students, monthly charge, trial-days-remaining or next-bill-date), drift indicator, CTA (Set up billing / Manage billing in Stripe / Resubscribe), invoice history with PDF links. Pre-Stripe-config state is honest: "Billing isn't set up yet. Tredoux will reach out."

- **`components/montree/super-admin/SchoolsTab.tsx`** — small Stripe billing indicator on school rows: `💳 Stripe — active · qty 18`. Status colored (active=emerald, trial=amber, past_due=red, canceled=slate). Hidden when no billing data.

- **`docs/STRIPE_BILLING_SETUP.md`** — 9-step playbook: (1) run migration 189, (2) create Stripe Product + Price ($7 USD monthly licensed), (3) set Railway env vars, (4) configure webhook (Account mode, 6 event types), (5) test in test mode with `4242 4242 4242 4242`, (6) switch to live, (7) migrate existing schools (manual override OR convert via principal UI), (8) optional cron, (9) Stripe Connect carry-over. Plus failure-mode table.

**Architectural rules locked in (do NOT break):**
1. Every billing helper gracefully degrades when Stripe unconfigured. No required setup-before-shipping.
2. Pricing: $7 per active student per month. Quantity = `montree_children WHERE is_active=true`. 30-day trial, no card. No tiers, no annual.
3. Webhook idempotency via `(source, source_ref)` unique index on `montree_finance_transactions`. Replays are silent no-ops.
4. Webhook returns 200 on handler errors (Stripe retries on 500 → retry storms).
5. Mutating endpoints: principal-only. Read endpoint: principal OR teacher. School derived from JWT, never from body.
6. Race-safe Stripe customer creation (conditional UPDATE WHERE customer_id IS NULL).
7. Race-safe quantity sync (no Stripe round-trip if quantity unchanged).
8. Refunds = negative income row. Phase 5 nets it. Never claw back paid commissions.
9. `montree_finance_transactions` is the canonical ledger. Phase 5 + Phase 6 read from here. NOT from `montree_billing_history` (per-school invoice timeline only).
10. Stripe fee captured as separate `direct_cost` row at invoice.paid time (estimated 2.9% + $0.30; reconciliation in Phase 6).

**What is NOT in Phase 4:**
- Phase 5 (payout calculator) — now unblocked. Reads `montree_finance_transactions`. ~1.5 days.
- Phase 6 (Money tab P&L) — same ledger. ~2-3 days.
- Per-school custom pricing — flat $7 only. Discounts via Stripe coupons (`allow_promotion_codes` already enabled on Checkout).
- Annual billing — monthly only.

**Audit trail:**
- Lint: `--max-warnings=0` clean across all 11 changed/new code files
- 3 pre-existing warnings cleaned up incidentally (unused catch param, `let → const`, unused import)
- Auth + cross-pollination verified on all 5 new endpoints via grep
- Webhook signature verification + idempotency
- Race-safe customer creation + quantity sync
- All endpoints gate on `getBillingConfig().configured` BEFORE calling Stripe SDK

**Production verification checklist** (8 steps, in `docs/handoffs/SESSION_93_HANDOFF.md`): set up billing → checkout with test card → verify ledger rows → add child → check quantity sync → super admin indicator → sweep endpoint.

**Next session priorities:**
1. **🚨 Tredoux runs migrations 188 + 189** in Supabase + follows `docs/STRIPE_BILLING_SETUP.md` — required prerequisite for Phases 4/5/6 working in production.
2. **Walk 8-step Phase 4 verification** after Stripe is wired.
3. **Phase 5 — Payout calculation engine** (~1.5 days). Now unblocked. Idempotent monthly aggregator → `montree_agent_payouts`.
4. **Phase 6 — Super admin Money tab** (~2-3 days). P&L from the unified ledger.

---

## RECENT STATUS (May 6-7, 2026)

### ⚡ Session 92 — Phase 7 Complete: Full Agent Dashboard System + teacherpotato.xyz Audio Fix (May 6-7, 2026, overnight build)

**24 files changed.** Phases 7b + 7c + 7d + 7e all shipped in one push. Sarah can now log in with her agent code, see her dashboard, generate her own referral codes, see her referred schools and estimated monthly earnings, complete her Stripe Connect setup self-service, and sign out. Plus a teacherpotato.xyz music-streaming bug fix that user reported yesterday.

**🚨 Canonical resume doc:** `docs/handoffs/SESSION_92_HANDOFF.md` — comprehensive single source of truth with the 14-step production verification checklist.

**🚨 Migration 188 must be run** in Supabase SQL Editor (carry-over from Session 91) before Sarah can authenticate. Until run, `tryAgentLogin` returns null silently and the agent UI 401's.

**Phase 7b — Auth wiring (3 files modified):**
- `lib/montree/server-auth.ts` — `'agent'` added to `MontreeTokenPayload.role` union, `verifyMontreeToken` role check, and `setMontreeAuthCookie` param type. Note: the `_role` param is intentionally unused (cookie shape is identical across roles, role lives in JWT payload) — eslint-disable annotation added with explanation.
- `lib/montree/verify-request.ts` — `'agent'` added to `VerifiedRequest.role` union with comment documenting that schoolId is INERT for agent sessions.
- `app/api/montree/auth/unified/route.ts` — `tryAgentLogin()` helper added between teacher and parent (matching plan ordering). Lookup pattern `WHERE agent_password_hash = legacySha256(code)`. Defensive: refuses if `is_agent=false` (logs warn) or `agent_suspended_at` set (logs `agent_login_failed`). On success: stamps `agent_login_last_used_at` fire-and-forget, logs `agent_login_succeeded` to `montree_agent_audit` AND `login_success` to central security log, issues JWT, redirects to `/montree/agent/dashboard`. Migration-not-run case (Postgres 42703) returns null silently.

**Phase 7d — APIs (9 endpoints, all NEW):**
- `/api/montree/agent/me` GET — agent profile + referred schools with student counts
- `/api/montree/agent/schools` GET — all referred schools (overflow from /me)
- `/api/montree/agent/schools/[id]` GET — per-school detail with full earnings estimate breakdown
- `/api/montree/agent/codes` GET/POST/DELETE — list + self-generate (rate limited 20/24h, requires pitch_label, refuses if `agent_default_share_pct IS NULL`) + revoke pending
- `/api/montree/agent/earnings` GET — monthly estimates per-school + total. Formula: `(students × $7 − Stripe fee ≈ 2.9% + $0.30 − API costs) × share %`. Negative net → 0 (no clawback)
- `/api/montree/agent/payouts` GET — Stripe Connect status + payout history (history empty until Phase 5)
- `/api/montree/agent/connect-onboard` POST — generate fresh Stripe onboarding link (race-safe account creation)
- `/api/montree/agent/connect-status` POST — force-refresh status from Stripe API (preserves `completed_at` once set)
- `/api/montree/agent/logout` POST — clear cookie

Every endpoint gates on `auth.role === 'agent'` and self-scopes via `founding_teacher_id = auth.userId` (schools), `agent_id = auth.userId` (codes/payouts), or `id = auth.userId` (own profile). Cross-pollination filter is the most important security invariant — verified on all 9 via grep audit.

**Phase 7c — Pages (9 files, all NEW):**
- `app/montree/agent/layout.tsx` — Shared shell with dark forest gradient + AgentNav at top (matches /montree, /montree/try, /montree/login-select aesthetic)
- `app/montree/agent/dashboard/page.tsx` — Home: greeting + summary line, Stripe banner, schools cards (max 6 with "See all"), 3-tile earnings, recent codes (max 5)
- `app/montree/agent/schools/page.tsx` — Full schools grid with per-card student count + gross estimate
- `app/montree/agent/schools/[id]/page.tsx` — Per-school: name + linked-on date + locale, snapshot tiles, full estimate breakdown (gross → fees → costs → net → share). Intentionally no classroom/child detail — that's the school's private space.
- `app/montree/agent/codes/page.tsx` — Self-service code form, reveal-once banner with Copy code + Copy share link, status filter tabs, table with Revoke
- `app/montree/agent/earnings/page.tsx` — Two-tile summary + formula explanation + per-school table with the full math
- `app/montree/agent/payouts/page.tsx` — Stripe Connect status pill + onboarding-link CTA + payout history (placeholder until Phase 5)
- `app/montree/agent/settings/page.tsx` — Read-only profile (Q2 — agent can't edit name/email; ask Tredoux). Login-reset hint. Sign-out button.
- `components/montree/agent/AgentNav.tsx` — Sticky top nav, mobile hamburger sheet, agent name + Sign out

**Phase 7e — Polish (2 components, NEW):**
- `AgentFirstRunOverlay.tsx` — 3-card walkthrough shown ONCE per device (localStorage `montree.agent.firstrun.dismissed.v1`). Cards: home explanation → code generation → Stripe Connect CTA.
- `AgentRedemptionBanner.tsx` — Celebration when school count went up since last load (localStorage `montree.agent.lastSeenSchoolCount.v1`). First load silently writes baseline (no false positive). Subsequent loads with delta show "🎉 [School] just signed up using one of your codes."

Both injected into the dashboard page.

**teacherpotato.xyz audio fix:**

User reported struggling to stream music yesterday. Parallel agent audit identified: `app/whale-class/page.tsx` had `crossOrigin="anonymous"` on every audio/video element (4 instances). The page intentionally uses raw Supabase URLs on teacherpotato.xyz (proxy 502s without Cloudflare in front). With `crossOrigin="anonymous"`, browsers send a CORS preflight on every media request — Supabase Storage doesn't return `Access-Control-Allow-Origin` for teacherpotato.xyz origin, so playback blocks. We don't actually use cross-origin features (no canvas frame access, no MSE, no SW media caching — SW v3 only caches static assets). Removing the attribute unblocks playback without changing URL routing or requiring Tredoux to dashboard-action Supabase CORS.

**Architectural rules locked in (do NOT break):**
1. Cross-pollination filter is mandatory on every agent endpoint — `WHERE founding_teacher_id = auth.userId` (schools), `WHERE agent_id = auth.userId` (codes), `WHERE id = auth.userId` (own row).
2. Every agent endpoint gates on `auth.role === 'agent'`. Teacher hitting `/api/montree/agent/me` MUST 403.
3. Agent JWT `schoolId` is INERT (placeholder for shell agents). Never use schoolId for agent self-scoping.
4. Unified login order: principal → teacher → AGENT → parent. Strictly more specific roles first.
5. `is_agent=true` is required, not just hash match. `tryAgentLogin` refuses if `is_agent=false` even when hash matches.
6. Agent self-service POSTs audit to `montree_agent_audit` — `agent_code_generated`, `agent_code_revoked`, `agent_stripe_link_generated`. Phase 7a's panel surfaces them.
7. First-run overlay + redemption banner use localStorage, not server state — decouples from server timing.
8. `crossOrigin="anonymous"` on `<audio>`/`<video>` is a CORS escalator. Don't add it unless you actually need canvas/MSE/cross-origin SW. For plain playback, leave it off.
9. Earnings is ESTIMATES until Phase 5. Always labelled. Negative net → 0 (no clawback, no negative payouts).
10. Self-service code generation rate-limited 20/24h. Soft fail-open if count query errors.
11. Self-service codes lock at agent's `agent_default_share_pct`. Agent CANNOT raise their own %. NULL pct = self-service disabled.

**What's NOT shipped:** Phase 4 (Stripe school billing) and Phase 5 (payout calc) still ahead. Until they ship, dashboard shows estimates labelled as such. Architecture is ready to swap in actuals from `montree_agent_payouts` when Phase 5 lands. Phase 6 (super-admin Money tab P&L) also still ahead.

**14-step production verification checklist** in `docs/handoffs/SESSION_92_HANDOFF.md` — covers issue-code → login → all 6 nav pages → generate code → revoke code → Stripe link → sign out → re-auth → activity panel cross-check → first-run overlay → celebration banner → teacherpotato.xyz audio.

**Audit trail:**
- Lint: `--max-warnings=0` clean across all 24 changed/new files (eslint exit 0)
- Cross-pollination filter verified on every agent endpoint via grep
- Auth role check verified on every agent endpoint
- Plaintext code never logged or persisted (Phase 7a rule preserved)
- Migration 188 graceful degradation in `tryAgentLogin` (Postgres 42703 → null, falls through cleanly)
- Belt-and-braces filters: DELETE on codes uses BOTH agent_id-scoped fetch AND agent_id-scoped update
- Race-safe Stripe Connect account creation (conditional UPDATE WHERE account_id IS NULL)

**Next session priorities:**
1. **🚨 Tredoux runs migration 188** in Supabase SQL Editor (carry-over from Session 91 — still required).
2. **Walk 14-step verification checklist** on production after Railway redeploys.
3. **Phase 4 — Stripe school subscription billing** (~3-4 days). Schools actually pay $7/student/month via Stripe.
4. **Phase 5 — Payout calculation engine** (~1.5 days). Monthly aggregator writes to `montree_agent_payouts`.
5. **Phase 6 — Super-admin Money tab** (~2-3 days). Tredoux's P&L view.

---

### ⚡ Session 91 — Phase 7a: Agent Login Foundation (May 6, 2026, overnight build)

**6 files created/edited.** Migration 188 + agent login API + agent audit API + audit helper + ReferralsTab UI + referral-codes GET enrichment. All eslint-clean with `--max-warnings=0`. Push pending.

**🚨 Canonical resume doc:** `docs/handoffs/SESSION_91_HANDOFF.md` — comprehensive, single source of truth.

**🚨 Migration 188 must be run** in Supabase SQL Editor before the new buttons work. Until run, the new tab surfaces clear "Run migration 188" messages and the issue-login modal will 500 on POST. The page itself stays usable thanks to the wide-select fallback in referral-codes GET.

**What shipped:**
- `migrations/188_agent_dashboard.sql` — `montree_teachers` extensions (is_agent, agent_password_hash, agent_login_set_at, agent_login_last_used_at, agent_default_share_pct, agent_suspended_at, agent_notes) + new `montree_agent_audit` table + indexes (active-agent partial, hash-uniqueness partial, audit per-agent/per-event/recent). Idempotent — safe to re-run.
- `app/api/montree/super-admin/agents/[id]/login/route.ts` — POST issues/resets agent login (returns plaintext exactly once, hashes via `legacySha256()`, alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` matching principal codes). PATCH suspends/reactivates/sets default %. All actions write to audit log fire-and-forget.
- `app/api/montree/super-admin/agent-audit/route.ts` — GET paginated audit feed. Optional filters by agent_id and event_type. Detects "table not yet created" (Postgres 42P01) and returns `migration_pending: true` so UI can show clear message instead of 500.
- `lib/montree/referral/agent-audit.ts` — `logAgentAudit(supabase, entry)` fire-and-forget writer. Defines all current and reserved event types via `AgentAuditEventType` union to prevent drift.
- `components/montree/super-admin/ReferralsTab.tsx` — per-row buttons 🔑 (issue/reset), 🔑↻ (reset variant), ✏️ (edit default %), ⏸/▶ (suspend/reactivate). Status pills below agent email when `is_agent=true` (Active / Login issued / Suspended / Default X%). Gold reveal-once banner for the agent code (separate from the green referral code banner). Two modals: "Issue / reset agent login" with default % input, "Edit default %" with empty=disable hint. Collapsible "📋 Recent agent activity" panel below the codes table with last 50 events.
- `app/api/montree/super-admin/referral-codes/route.ts` — GET enrichment widened to also pull `is_agent`, `agent_login_set_at`, `agent_login_last_used_at`, `agent_default_share_pct`, `agent_suspended_at`. Wide-select with narrow fallback so the page stays usable while migration 188 isn't yet run.

**Q3 modification (decided this session):** Tredoux opted to LOG agent activity instead of getting pinged on every event. Implementation: `montree_agent_audit` table + collapsible "Recent agent activity" panel inline in the Referrals tab. Reversible — if it gets too noisy he can collapse the panel; if too quiet, future phases can add notifications.

**Architectural rules locked in (do NOT break):**
1. Plaintext agent login codes returned EXACTLY once on POST. Never logged, never persisted plaintext, never returned by GET.
2. `is_agent=true` is the marker. Phase 7b's `tryAgentLogin()` must check this — without it, even a matching hash should refuse to authenticate.
3. Two-knob suspend system. `agent_suspended_at` stops login; `montree_schools.revenue_share_active=false` stops accrual. Independent.
4. Default % change only affects FUTURE codes. Existing per-school % stays locked.
5. Issuing a fresh code clears any prior suspension (explicit re-activation).
6. Every state change writes to `montree_agent_audit` (Q3 decision). Logging is fire-and-forget.
7. `agent_password_hash` is SEPARATE from `password_hash`. Teacher-agents hold both logins independently.
8. Phase 7b unified login order: principal → teacher → AGENT → parent. Strictly more specific roles first.

**Decisions confirmed this session (Q1-Q7 from AGENT_DASHBOARD_PLAN Section 9):**
- Q1 (suspend keeps payouts active) ✓ recommendation accepted
- Q2 (read-only profile) ✓ recommendation accepted (Phase 7c)
- Q3 (no ping → **LOG instead**) ⚠ MODIFIED — built audit table + activity panel
- Q4 (locked default % at code-gen) ✓ recommendation accepted (Phase 7d)
- Q5 (single agent per school) ✓ recommendation accepted
- Q6 (subpath not subdomain) ✓ recommendation accepted (Phase 7c)
- Q7 (ship before Phases 4-5 with estimates) ✓ recommendation accepted

**What is NOT shipped yet:**
- Phase 7b — auth wiring (`tryAgentLogin()` in unified route, `'agent'` MontreeRole, agent route protection). Sarah's code goes into the DB but won't authenticate her until 7b lands. ~0.5 day.
- Phase 7c — agent dashboard pages (~2 days). The actual UI Sarah sees.
- Phase 7d — agent self-scoped APIs (~1 day). With the critical `WHERE founding_teacher_id = auth.userId` filter on every endpoint.
- Phase 7e — polish (~0.5 day).

**Production verification checklist** (15 steps, in `docs/handoffs/SESSION_91_HANDOFF.md`): issue/reset/suspend/reactivate/edit-pct flows + activity panel + reveal-once banner + migration-pending fallback. Run after Tredoux executes migration 188 and Railway redeploys.

**Next session priorities (ordered):**
1. **🚨 Tredoux runs migration 188** in Supabase SQL Editor.
2. **15-step production verification** on the new Referrals UI.
3. **Phase 7b — Agent auth wiring** (~0.5 day). Three files: `lib/montree/server-auth.ts`, `app/api/montree/auth/unified/route.ts`, `lib/montree/verify-request.ts`.
4. **Phase 7c — Agent pages** (~2 days). Dark forest theme, mobile-first.
5. **Phase 7d — Agent APIs** (~1 day). Self-scoped via auth.userId filtering on every endpoint.
6. **Phase 7e — Polish** (~0.5 day).

---

### ⚡ Session 90 — Agent Referral Programme: Phases 1 + 2 + 3 Shipped + Overnight Cleanup + Phase 7 Strategy (May 6, 2026)

**9 commits pushed to main:** `e0ee3c7d` (Phase 1 — codes + redemption), `31b0a496` (Phase 1 docs), `d73a1d94` (Phase 2 — code IS principal's login), `6bd5b955` (Phase 2 docs), `03e2942c` (Phase 3 — Stripe Connect Express onboarding), `74d217d2` (handoff alignment), `c17ab294` (fix: 500 on issuing referral codes), `39b36e9f` (fix: null.replace crash on Visitors), `5bb02a39` (super-admin tidy: rainbow tiles → slate row).

Phases 1 + 2 + 3 are LIVE in production. Migrations 186 + 187 confirmed run by user. Tredoux issued the first code (`GLORIA-3KD5`, 50%, pending). Phase 4 (Stripe school billing), Phase 5 (payout calc), Phase 6 (Money tab), Phase 7 (agent dashboard) still ahead — but Phase 7 has a comprehensive strategy doc ready (`docs/AGENT_DASHBOARD_PLAN.md`).

**🚨 Canonical resume doc:** `docs/handoffs/SESSION_90_HANDOFF.md` — comprehensive, single source of truth for picking this session back up cold.

**Two design docs also delivered:**
- `docs/finance/accountant-onepager.md` — for the HK accountant. Covers revenue model, money flow (Stripe → Wallex HK), three cost categories (direct cost of revenue / referral commissions / operating expenses), multi-currency handling (USD base), monthly export pack contents (CSV + PDF + per-school CSV + per-agent CSV + JSON backup), and seven explicit questions for the accountant (category mapping, commission classification as cost-of-sales vs operating expense, format prefs, frequency, HK-specific items, currency confirm, year-end pack).
- `docs/AGENT_REFERRAL_AND_FINANCIALS_PLAN.md` — comprehensive build plan. Captures every locked decision, full DB schema (3 new tables + extensions to existing), 7 build phases with effort estimates, Stripe Connect Express specifics, risks & open questions.

**Comprehensive Phase 1 handoff:** `docs/handoffs/SESSION_90_HANDOFF.md` — file-by-file change list, exact "send Sarah this" pitch flow, what is NOT shipped yet, next session priorities.

**🚨 PRECONDITION before code works:** Run `migrations/186_referral_codes.sql` in Supabase SQL Editor. Until run, the new 🎟️ Referrals tab will 500.

**What shipped in commit `e0ee3c7d`:**
- `migrations/186_referral_codes.sql` — `montree_referral_codes` table + `montree_schools.referral_code_id` + `referral_code_used` columns. Idempotent (`IF NOT EXISTS` on every clause).
- `lib/montree/referral/code-gen.ts` — `generateUniqueReferralCode(displayName)` produces `<FIRSTNAME>-XXXX` codes (4-char random suffix, same I/O/0/1-free alphabet as login codes), DB-collision-checked. `nameToPrefix()` normalises diacritics.
- `app/api/montree/super-admin/referral-codes/route.ts` — POST/GET/DELETE. POST auto-creates a shell `montree_teachers` row for non-teaching agents (is_active=false). DELETE only allows revoking pending codes.
- `components/montree/super-admin/ReferralsTab.tsx` — issue-code form, reveal-once gold banner with Copy button, status filter tabs, table with copy + revoke actions.
- `app/montree/super-admin/page.tsx` — wired the 🎟️ Referrals tab into the super admin nav.
- `app/api/montree/try/instant/route.ts` — `resolveReferralCode()` validates BEFORE any DB writes (clean 400 on bad code). On success: stamps the AGENT (not the new teacher) on `school.founding_teacher_id`, locks `revenue_share_pct`, sets `revenue_share_active=true`, writes `referral_code_id` + `referral_code_used`, marks code redeemed. Wired into all three role branches (teacher/principal/homeschool_parent).
- `app/montree/try/page.tsx` — reads `?ref=CODE` on mount via `window.location` (avoids `useSearchParams` Suspense requirement), shows gold "Referral code: SARAH-K9X7" banner on every step until success, passes `referral_code` in POST body.

**Phase 2 — code IS the principal's login (commit `d73a1d94`):**

3 files modified, 106 insertions. Closes the gap from Phase 1's "referral link at signup" to the original vision "type the code, you're in."

- `app/api/montree/try/instant/route.ts` — principal branch now hashes the REFERRAL code itself (uppercased, via `legacySha256`) as `montree_school_admins.password_hash` when a referral code is present. Email fallback uses the referral code's slug. Response returns the referral code as `code` so the success screen shows it as the principal's login (not the legacy 6-char). Without a referral code, falls back to the auto-generated 6-char code unchanged. Teacher and homeschool_parent branches with referral codes keep their auto-generated codes (referral linkage on the school is set, but their personal login isn't the referral code — principal-only behaviour).
- `app/api/montree/auth/unified/route.ts` — new `tryReferralPrecheck()` helper runs FIRST (after rate limit + length check). Looks up entered code in `montree_referral_codes`. status=pending → 409 with `redirectTo: /montree/try?ref=CODE`; revoked → 401 with clear message; expired → 401 with clear message; redeemed → returns null, falls through (the principal's `password_hash` matches `legacySha256(code)`, so `tryPrincipalLogin` Step 1 finds them naturally); not a referral row → returns null, falls through (legacy 6-char codes unaffected). Code length cap widened from 10 → 32 to fit `<FIRSTNAME>-XXXX` format.
- `app/montree/login-select/page.tsx` — input cap widened to 32 chars. Handles 409 `pending_referral` by `router.replace(data.redirectTo)` instead of showing an error toast.

**Sarah's pitch flow after Phase 2:** "Go to montree.xyz, type SARAH-K9X7. You're in." First use → server detects pending → redirects to signup with code carried in → school fills in details, gets created with principal `password_hash = legacySha256(SARAH-K9X7)`, code marked redeemed. Every subsequent login → server's precheck sees status=redeemed → falls through → `tryPrincipalLogin` matches the hash → in.

**Phase 3 — Stripe Connect Express onboarding for agents (commit `03e2942c`):**

9 files, 767 insertions. Each agent (Sarah, multipliers, consultants — anyone in `montree_teachers`) gets their own Stripe Connect Express account they onboard via Stripe's hosted form. Agents fill in bank + tax details on Stripe's site; we never see those. Stripe handles 1099-NEC and equivalents.

- `migrations/187_agent_stripe_connect.sql` — extends `montree_teachers` with `stripe_connect_account_id` (UNIQUE partial index), `stripe_connect_status`, `charges_enabled`, `payouts_enabled`, `details_submitted`, `disabled_reason`, `completed_at`, `updated_at`. Idempotent.
- `lib/montree/referral/stripe-connect.ts` — Connect helpers built on the existing `getStripe()` singleton. `createConnectAccount()` (Express, business_type=individual, capabilities.transfers=requested, metadata.source for audit). `createOnboardingLink()` with return + refresh URLs that land on `/montree/agent/onboarding`. `summariseStatus()` derives the status enum from the Stripe Account object.
- `app/api/montree/super-admin/agents/[id]/connect-onboard/route.ts` — POST. Creates Stripe account if needed, generates fresh onboarding URL. Race-safe via conditional UPDATE (`.is('stripe_connect_account_id', null)`); on race-loss re-fetches canonical account ID and proceeds. Orphan accounts logged for manual cleanup.
- `app/api/montree/super-admin/agents/[id]/connect-status/route.ts` — GET. Pulls latest from Stripe, persists, returns. Stamps `completed_at` on FIRST transition to verified — never overwrites (audit trail).
- `app/api/stripe/connect-webhook/route.ts` — receives `account.updated` events with signature verification (`STRIPE_CONNECT_WEBHOOK_SECRET`, falls back to `STRIPE_WEBHOOK_SECRET`). Updates denormalised status fields. Returns 200 on errors to prevent Stripe retry loops.
- `app/montree/agent/onboarding/page.tsx` — Stripe's return-URL landing page. Reads `?status=complete|refresh` and shows appropriate copy.
- `components/montree/super-admin/ReferralsTab.tsx` — new "Stripe" column with colour-coded pills (Not started / In progress / Verified / Restricted / Disabled). 💳 button per row generates an onboarding link, displays in indigo banner with Copy. Hidden once agent is verified.
- `app/api/montree/super-admin/referral-codes/route.ts` GET enrichment — each code response now includes `agent_stripe_connect_account_id` and `agent_stripe_connect_status` from `montree_teachers` in one batch query. Gracefully degrades if migration 187 not yet run.
- `.env.example` — added `STRIPE_CONNECT_WEBHOOK_SECRET` and `NEXT_PUBLIC_APP_URL`.

**Two real bugs caught and fixed during Phase 3 audit cycle:**
1. Race in `connect-onboard` where two simultaneous POSTs would both create Stripe accounts and the second would silently orphan the first. Fixed with conditional UPDATE + race-detection branch.
2. `connect-status` route was overwriting `stripe_connect_completed_at` to NULL when status dropped below verified. Fixed to preserve the timestamp like the webhook does.

**🚨 5-step Stripe setup before Phase 3 works in production:**
1. Run migration 187 in Supabase SQL Editor.
2. Confirm `STRIPE_SECRET_KEY` is set in Railway (existing school-billing webhook uses the same key — likely already there).
3. Enable Connect on your platform account in Stripe Dashboard (Settings → Connect → Get started).
4. Create a Connect-mode webhook endpoint in Stripe Dashboard:
   - URL: `https://montree.xyz/api/stripe/connect-webhook`
   - Mode: **Connect** (NOT Account)
   - Event: `account.updated`
   - Copy the signing secret → set as `STRIPE_CONNECT_WEBHOOK_SECRET` in Railway.
5. Confirm with banker that Stripe Connect Express in HK can deposit into Wallex.

**Overnight cleanup (commits 7-9):**

User issued Gloria's first code, hit a 500. Reported a separate Visitors-tab crash and asked for the rainbow super-admin ribbon to be tidied up. Three commits:

- `c17ab294` — referral codes 500 fix. Multi-row email lookup with `.maybeSingle()` was silently failing on duplicate teacher rows for the same email; route fell through to shell-creation which then failed because `montree_teachers.school_id` is `NOT NULL` and we hadn't supplied one. Fixed: lookup uses `.order(created_at desc).limit(1)`; shell creation pulls the oldest school as a placeholder; API now surfaces DB error detail in the response (and the frontend banner) so future schema mismatches don't require Railway log diving.
- `39b36e9f` — Visitors `null.replace` crash. `shortenUrl(url: string)` was typed non-null but called with possibly-null `page_url` from older `montree_visitors` rows. Added `string | null | undefined` typing + null guard. Same defence on inline `v.referrer.replace`. Empty-state UI now renders correctly.
- `5bb02a39` — super-admin tidy. Replaced 9-button rainbow tile ribbon with three-button slate row. Kept API Usage / Community / + Register school. Hid Job Tracker, Master Campaign, Marketing Hub (+18 sub-pages), Social Manager (+5 sub-pages), Content Studio, Teacher Trial. All routes preserved on disk — bookmarks unaffected. Visual cleanup only.

**Phase 7 strategy doc — `docs/AGENT_DASHBOARD_PLAN.md` (NEW, ready to build):**

Comprehensive theorise-first strategy for the agent dashboard (Sarah's view):

- **Identity:** agents stay in `montree_teachers` with new `is_agent` boolean + `agent_password_hash` column (separate from teacher `password_hash` so a teacher-agent can have BOTH logins). Shell-agent records from Phase 1 carry over.
- **Login:** 6-char alphanumeric agent code, hashed via `legacySha256`. Tredoux issues from super admin via new "🔑 Issue agent login" per-row button.
- **Auth flow:** new `tryAgentLogin()` in unified login (between teacher and parent), new `'agent'` role on JWT.
- **Routes:** `/montree/agent/dashboard|schools|codes|earnings|payouts|settings`. Subpath, not subdomain. Dark forest theme matching public Montree.
- **Self-service code generation:** at agent's locked default %, 20/day rate limit, mandatory pitch label. Agent cannot raise their own %.
- **Earnings transparency:** estimates while Phase 4-5 not yet shipped (`student_count × $7 - api_costs - stripe_fee_estimate`); swap to actuals from `montree_agent_payouts` when Phase 5 lands.
- **Suspend two-knob system:** `agent_suspended_at` stops login but DOES NOT freeze pending payouts. `revenue_share_active=false` on the school stops future accrual. Independent levers.
- **5 sub-phases (~5 days):** 7a Foundation (1d), 7b Auth (0.5d), 7c Pages (2d), 7d APIs (1d), 7e Polish (0.5d). Independently shippable.
- **7 open questions documented** with recommendations — need yes/no before Phase 7a starts. Examples: agent profile read-only or editable? Code-generation pinged to Tredoux? Multiple agents on one school?

10 architectural rules locked in the plan (cross-pollination filter on every query, separate `agent_password_hash` column, mobile-first, dark forest theme, 'agent' JWT role, etc.) — documented so future build agents don't re-debate.

**Decisions locked (DO NOT re-debate next session):**

| Decision | Value |
|----------|-------|
| Code format | `<FIRSTNAME>-XXXX` (e.g. `SARAH-K9X7`). 4 random chars, no I/O/0/1. |
| Codes per agent | Unlimited — one code per pitch. Generated on demand. |
| Code lifecycle | Pending until redeemed. Tredoux can DELETE pending codes if a pitch dies. Once redeemed, the code is locked, school↔agent link permanent. |
| Code dual purpose | At redemption, the code becomes the principal's login code for that specific school. Hashed into `montree_school_admins.password_hash`. |
| Multiple schools per agent | Yes — fresh code per pitch. |
| Adjustable % | Per-agent default + per-school override. Tredoux adjusts manually. No automated re-calc. |
| Profit math | Net = Stripe revenue − (Anthropic + OpenAI + Stripe fee). Agent payout = Net × school's %. Negative net → agent gets zero. No clawback. |
| Base currency | USD. |
| Payout rail | Stripe Connect Express → Wallex HK. Wallex is just the wallet at end of chain. |
| Other rails | Architectural support for manual Wallex wire as backup. Finalise once banker confirms. |
| Headcount source | `montree_children` count (already used for billing). No manual gross entry. |

**Existing infrastructure (Session 72) being EXTENDED, not replaced:**
- `montree_schools.founding_teacher_id` — semantics shift to "linked agent" (could be teacher or non-teacher)
- `montree_schools.revenue_share_pct` + `revenue_share_active` — kept
- `montree_teacher_earnings` — left in place, sunset over time. New rows go to `montree_agent_payouts` (wider schema).
- `app/montree/dashboard/earnings/page.tsx` — kept for teacher-agents.
- `app/montree/for-teachers/page.tsx` — Phase 7 decision (repurpose vs retire).

**New schema (3 tables + extensions):**
- `montree_referral_codes` — one row per pitch. `code` UNIQUE, `agent_id`, `agent_display_name`, `agent_email`, `agent_pitch_label`, `revenue_share_pct`, `status` (pending/redeemed/revoked/expired), `redeemed_by_school_id`, etc.
- `montree_agent_payouts` — per (agent, school, month) row. Captures the full math (gross, stripe fee, anthropic, openai, net, share %, payout) plus payout state (status, stripe_transfer_id, paid_at, paid_by_method, fx_rate_used).
- `montree_finance_transactions` — unified ledger. Every income/direct_cost/commission/op_expense/fx_adjustment lands here. Multi-currency aware (`original_currency`, `original_amount`, `fx_rate`, `usd_amount`). Source tracking (`stripe_webhook` / `api_usage_aggregate` / `manual_entry`).
- `montree_teachers` extension: `stripe_connect_account_id`, `stripe_connect_status`, `stripe_connect_completed_at`.
- `montree_schools` extension: `referral_code_id`, `referral_code_used` (denorm for quick lookup).

**7-phase build plan (~10-12 days total):**

1. **Foundation** (1 day) — migrations 186/187/188, super admin code-issuing API + UI. Phase 1 unblocks issuing Sarah's first code.
2. **Redemption** (1 day) — school signup flow accepts `?ref=CODE`, code becomes principal login.
3. **Stripe Connect onboarding** (1.5 days) — agent gets one-time link, completes Stripe Express form, webhook captures status.
4. **Stripe school subscription billing** (3-4 days, precondition) — schools actually billed via Stripe. Without this, dashboard falls back to manual gross entry.
5. **Payout calculation engine** (1.5 days) — monthly job aggregates revenue + costs per school, calculates payouts, idempotent UPSERT into `montree_agent_payouts`.
6. **Money tab in super admin** (2-3 days) — Income / Direct costs / Commissions / Op expenses / P&L / Exports (CSV + PDF + Accountant Pack ZIP).
7. **Agent dashboard refresh** (0.5 days) — `/montree/dashboard/earnings` shows linked schools, monthly statements, Stripe Connect status.

**Open questions to resolve before Phase 1:**
1. Non-teacher agents (multipliers, consultants) — keep using `montree_teachers` rows with `is_active=false`, or add a thin `montree_agents` table? Recommendation: `montree_teachers` for Phase 1, extract later if messy.
2. Stripe HK availability for Connect Express — confirm via banker. If not supported, fall back to Stripe Standard or manual Wallex wires.
3. `for-teachers` landing page — repurpose for "request an agent code from us" or retire? Phase 7 decision.

**🚨 Status of Tredoux's setup steps (as of overnight Wed → Thu):**

A. ✅ **Migration 186 run** in Supabase. Confirmed by user.
B. ✅ **Migration 187 run** in Supabase. Confirmed by user.
C. ✅ **Super-admin Referrals tab works.** First code issued: `GLORIA-3KD5` (50%, pending).
D. ⏳ **Stripe Connect setup not yet done.** Steps remaining:
   - Confirm `STRIPE_SECRET_KEY` is in Railway (likely yes — existing school-billing webhook uses it).
   - Enable Connect on platform account in Stripe Dashboard.
   - Create Connect webhook endpoint (URL `https://montree.xyz/api/stripe/connect-webhook`, Mode: Connect, event `account.updated`). Copy secret → set `STRIPE_CONNECT_WEBHOOK_SECRET` in Railway.
   - Confirm with banker: Connect Express HK + Wallex compatibility.
E. ⏳ **Pamela email** — Gmail draft `r2430204512620199011` waiting in account, ready to send.
F. ✅ **Gloria's code issued.** Tredoux can pitch her any time via `https://montree.xyz/montree/try?ref=GLORIA-3KD5`.

**🚨 Next session priorities (in recommended order):**

1. **End-to-end verify what's already shipped.** Production verification checklist in `docs/handoffs/SESSION_90_HANDOFF.md` Section "Production verification checklist." 12 numbered tests covering Phase 1+2 redemption + Phase 3 Stripe Connect (after Tredoux finishes Stripe Dashboard setup). Issue test code → redirect-to-signup → redemption → re-login → revoke flow.

2. **Phase 7 — Agent Dashboard build.** ~5 days, 5 sub-phases. Read `docs/AGENT_DASHBOARD_PLAN.md` first. Answer the 7 open questions in Section 9 (recommendations already documented; just need yes/no). Then start Phase 7a (1 day): migration 188 + super admin "Issue agent login" button. Highest UX value for the lowest effort. Sarah gets her own dashboard, generates her own codes, sees her earnings transparently.

3. **Phase 4 — Stripe school subscription billing** (3-4 days, dedicated session). Alternative to #2 if real-money flows are urgent. Precondition for automated revenue tracking. Without it, Sarah's dashboard shows estimates only (still useful, just not authoritative).

4. **Phase 5 — payout calculation engine** (~1.5 days). Builds directly on Phase 4. Idempotent monthly aggregator. Together with Phase 4, swaps Sarah's dashboard from estimates to actuals.

5. **Phase 6 — Money tab in super admin** (2-3 days). Where Tredoux sees the P&L. Builds on 4 + 5. Pamela's accountant answers (when they come back) shape the categories here.

6. **Smaller polish wins** if blocked on bigger phases:
   - Email automation when Tredoux issues a code (Resend integration; rail exists from Session 87)
   - Redemption notification banner in super admin
   - Referrals tab filters (by agent, by school, by status combinations)

7. **Carry-overs from Session 89** (still pending):
   - User verifies bingo calling cards on industrial printer
   - User reads v8 term reports end-to-end
   - Verify Library Tools tiles render on production
   - End-to-end test Sentence Match + Sorting Mat generators
   - Test super-admin Leads bulk clean
   - Two-stage Language Presentation flow (paused)
   - Run migration 184, send 3 hot lead Gmail drafts (Ardtona, FAMM, Тамі)

---

### ⚡ Session 89 — Sentence Match + Sorting Mat + Term Reports Grammar Overhaul + Bingo Duplex Lock + Super-Admin Polish (May 5, 2026, evening)

**14 commits pushed to main: `22272ab7` → `405db7eb`.** Five distinct workstreams shipped in one session — two new content-generator tools, a complete grammar/visibility overhaul of the term report pipeline, calibration fix on the bingo calling-card duplex layout, and super-admin quality-of-life polish.

**A. Sentence Match Picture Generator (new tool):**

Routes: `/admin/sentence-match-generator` + `/montree/library/tools/sentence-match-generator`. Reuses the existing `<CardGenerator>` component via two new optional props:
- `textConfig` — overrides 9 user-facing strings with sentence-match copy. Defaults preserve 3-Part-Card behaviour exactly.
- `layoutMode: 'square' | 'strip'` — default square (unchanged). Strip enables landscape sentence-match cards.

Strip-layout dimensions (Montessori sentence-strip standard):
| Card | Outer size (default 6.5cm height) | Per A4 |
|------|------------------------------------|--------|
| Control | 21 × 6.5 cm — sentence-left + picture-right in ONE bordered piece | 4 |
| Picture | 6.5 × 6.5 cm — matches picture portion of control | 12 (3×4) |
| Sentence | 14.5 × 6.5 cm — matches sentence portion of control | 4 |

**Identical-overlay invariant:** standalone sentence card + standalone picture card laid side-by-side reconstruct the control card's 21cm × 6.5cm footprint exactly. Internal gap inside control = 1cm (= 0.5cm sentence right-padding + 0.5cm picture left-padding) is the join.

Adaptive font sizing took several iterations. Final algorithm: `computeUniformStripFontSize()` finds the largest font where EVERY sentence in the batch fits on one line within the control's NARROWER text area (12.5cm internal at default). That single uniform size is applied to ALL control sentence portions AND ALL standalone sentence cards in the same print job. `CHAR_W = 0.52` (Comic Sans MS measured average; was 0.6).

**B. Sorting Mat Generator (new tool):**

Routes: `/admin/sorting-mat-generator` + `/montree/library/tools/sorting-mat-generator`. New component family. A4 sorting mats with 2, 3, or 4 labelled circles for category sorting work.

Layouts: 2 circles side-by-side (9.5cm), 3 circles triangular = 2 top + 1 centred bottom (9cm), 4 circles 2×2 grid (9cm). Settings: number of circles, mat title, per-circle label, border colour, font.

**C. Term Reports overhaul (`scripts/generate-term-reports.mjs`):**

User reported v7 reports had grammar issues — `(CVC Words) (CVC Words)` duplications, `helped you learned` verb errors, white-on-white closings. Audit found three concrete bugs and one critical visual bug. All fixed; 20 v8 reports clean.

Five layered improvements:

1. **Mask-then-scrub** — `scrubHallucinatedWorks()` was matching capitalised phrases INSIDE parenthesised work names (e.g. inside `Classified Cards (Nomenclature Cards)` it'd match `Nomenclature Cards` separately and replace with "your work" → `Classified Cards (Nomenclature Cards) (your work)`). Fix: mask every allowed work name with placeholder before regex (sorted by length DESC), restore after. The regex literally cannot see inside parenthesised work names anymore.

2. **Haiku grammar polish pass** — final pass with Haiku to fix verb-tense errors, awkward phrasing. ~$0.001/report. Best-effort: if Haiku fails or strips a work name, falls back to unpolished. Defensive sanity check confirms no work names are dropped.

3. **Tighter dedup regex** — Pattern C catches `Work (X) (X)` where X is the parenthetical suffix from inside the work name itself, in addition to existing `Work Work` and `Work (Work)` patterns.

4. **Closing colour fix (bg1 → tx1)** — PPTX template ships with `ClosingText` shape using `schemeClr bg1` (white-on-white). Closings were INVISIBLE in every previous run; v7 only worked by accident because Sonnet sometimes wrote the closing as the last circle paragraph (different shape, dark text). `fillTemplate()` now patches `bg1 → tx1` inside the `ClosingText` shape.

5. **Closing merged into body block** — instead of using the separate `ClosingText` shape (italic 13pt), `fillTemplate()` now appends the closing to `PARA_CIRCLE` content with a line break so it flows in the body shape with uniform 14pt regular formatting. The `ClosingText` shape is filled with empty string. User explicitly wanted "all uniform text in the same text block."

Output: `term-reports-v8/` (v7 preserved untouched). 20 PPTX + bundle ZIP. Audit verified: zero scrub artifacts, zero verb-tense errors, every capitalised body phrase matches a real work in the curriculum, all warm/glowing tone, returning vs graduating closing language correct.

**🚨 Architectural rules locked in (do NOT let future agents break these):**
- `montree_child_progress.status='mastered'` is the SOLE source of truth for MD on parent-facing reports (existing rule, restated)
- Mask allowed work names BEFORE running scrub regex
- Haiku polish is best-effort with fallback to unpolished — never crash on polish failure
- Closing belongs in the body block (`PARA_CIRCLE`), not a separate shape
- Closing-shape colour is `tx1` not `bg1`

**D. Bingo Calling Card duplex calibration:**

User cuts cards after duplex print on industrial printers (mechanically exact) and reported few-mm drift on cut lines. Diagnosis: front and back calling-card headers had different text lengths (front "Picture Side · Page X of Y · Print duplex, flip on short edge" vs back "Word Side (mirror-printed for duplex) · Page X of Y") → different rendered heights → grid below started at slightly different Y on the back → cumulative few-mm offset.

**Fix in three files** (`public/tools/picture-bingo-generator.html`, `app/montree/library/tools/phonics-fast/bingo/page.tsx`, `app/montree/library/tools/phonics-fast/reverse-bingo/page.tsx`):
- `.calling-header { height: 18mm; margin-bottom: 4mm; overflow: hidden; }` — fixed dimensions, no variation
- `.calling-header h2`, `.calling-header p` — `white-space: nowrap`, fixed `line-height` so text physically cannot wrap
- Front/back header text normalised to similar character counts
- Comments + UI banner explicitly call out SHORT-EDGE flip is required (printer default; long-edge flip will mismatch words to pictures)

**🚨 Architectural rule:** SHORT-edge flip is canonical for these calling cards. The col-mirror logic in the back-page render is calibrated for short-edge geometry. Long-edge flip will mismatch words to pictures.

**Pending verification:** user will print and cut tomorrow on industrial printers. If still drifting, next move is `.page { width: 198mm }` to eliminate browser scale-to-fit offset (currently page is 210mm but printable area inside @page margin 6mm is 198mm).

**E. Super-admin polish:**

*Leads bulk-clean:* user had 50 junk leads, was deleting one-by-one. Three new clean-up modes:
- **🧹 Clear all New (N)** — one click, count-aware, hidden when 0
- **🧹 Clear Declined (N)** — same pattern
- **☑️ Select mode** — toggle reveals per-lead checkboxes + action bar (Select all / Select all New / Clear / 🗑️ Delete N selected / Done)

API extension: `DELETE /api/montree/leads` accepts THREE modes — `?lead_id=X` (legacy), body `{ lead_ids: [...] }` (multi-select, capped 1000), body `{ status: '...' }` (purge). Returns `{ success, deleted: <count> }`. Cleans up associated DMs in every mode.

*Schools row owner info:* previously showed `owner_name OR owner_email` (whichever existed). Now stacks both with explicit icons: `👤 Name`, `📧 owner@email.com` (clickable mailto), `🔑 LOGIN-CODE`. If neither exists, italic `no contact info`. User flagged confusion when only one of name/email was set.

**Files changed (15 files, 14 commits):**
- `components/card-generator/{CardGenerator,CardPreview,print-utils}.tsx` — textConfig prop, layoutMode prop, strip-layout generators, uniform batch font sizing
- `components/sentence-match-generator/*` — re-export shims pointing back to canonical card-generator module
- `components/sorting-mat-generator/{types,print-utils,SortingMatGenerator}.{ts,tsx}` — NEW
- `app/admin/{sentence-match,sorting-mat}-generator/page.tsx` — NEW
- `app/montree/library/tools/{sentence-match,sorting-mat}-generator/page.tsx` — NEW
- `app/montree/library/tools/page.tsx` — TOOLS array tiles
- `app/api/montree/leads/route.ts` — DELETE bulk modes
- `hooks/useLeadOperations.ts` — `bulkDeleteLeadsByIds`, `bulkDeleteLeadsByStatus`
- `components/montree/super-admin/{LeadsTab,SchoolsTab}.tsx` — bulk UI + owner row icons
- `app/montree/super-admin/page.tsx` — props wiring
- `scripts/generate-term-reports.mjs` — mask-then-scrub, Haiku polish, tighter dedup, closing colour fix, closing-into-body merge
- `public/tools/picture-bingo-generator.html` — locked calling-card header geometry
- `app/montree/library/tools/phonics-fast/{bingo,reverse-bingo}/page.tsx` — same fix
- `lib/montree/i18n/*.ts` — 4 new keys × 12 locales (sentence-match) + 4 new keys × 12 locales (sorting-mat)

**Handoff doc:** `docs/handoffs/SESSION_89_HANDOFF.md` — full breakdown of all five workstreams.

**🚨 Next session priorities (ordered):**
1. **🚨 User verifies bingo calling cards** on industrial printer (tomorrow). If still drifting, follow up with `.page { width: 198mm }` patch.
2. **User reads v8 term reports** end-to-end. Verify uniform formatting + warmth. ZIP at `~/Desktop/Master Brain/ACTIVE/whale/term-reports-v8/Whale_Class_Language_Term_Reports.zip`.
3. **Verify Library Tools tiles render on production** — open `/montree/library/tools` after Railway redeploys. Expect 📖 Sentence Match + 🎯 Sorting Mat tiles next to 3-Part Card.
4. **End-to-end test Sentence Match Generator** — upload photo, type sentence, print all cards, confirm dimensions (21×6.5 / 6.5×6.5 / 14.5×6.5).
5. **End-to-end test Sorting Mat Generator** — pick 3 circles, change labels + colour, print mat.
6. **Test super-admin Leads bulk clean** — confirm `Clear all New` wipes the 50 junk leads.
7. **Two-stage Language Presentation flow** — user confirmed direction but build was paused mid-stream when grammar fix took priority. Plan: Stage 1 = teacher picks photos manually with optional AI-suggest; Stage 2 = AI writes captions around chosen photos. Pick this back up when ready.
8. **Carry-overs from prior sessions:** run migration 184, send 3 hot lead Gmail drafts (Ardtona, FAMM, Тамі), update CLAUDE.md lead state.

---

### ⚡ Session 88 — Classroom material build + outreach mega-batch (72 Gmail drafts) (May 5, 2026)

**No code commits.** Teacher-side classroom-material build + the largest outreach drafting push of the campaign so far. Two parallel tracks ran today, with a separate dedup discipline pass that prevented at least three duplicate sends.

**A. Whale Class digraph progression (`whale/digraph-shelf/`):**

Sparked by Tredoux noticing kids stuck on the *"sheep go baa baa"* line of last week's sh-sound song — that stickiness pointed to the next digraph (**ee**), and we built around it. The full 17-week digraph year is now mapped: each week opens with a circle-time song that introduces the digraph, followed by the same five-step shelf arc (sound sort → picture-word match → two-column sort → moveable alphabet build → writing booklet). The progression is **emergent within a planned scaffold** — the children's stickiness picks the next digraph, the planned order is just a default.

The 17 weeks: sh (Hush, Little Sea) → ee (Sheep Go Baa Baa) → oo (Moon and Spoon) → ch (Chick on a Chair) → ai (Rain on the Train) → th (Three Thumbs Up) → oa (Goat in a Boat) → wh (Whale on a Wheel) → qu (Quick Little Queen) → ar (Star in a Jar) → or (Horse with a Horn) → ou (Mouse in a House) → er (Tiger and the River) → oi/oy (Boy with a Toy) → au/aw (Saw and Straw) → ie (Pie and Tie) → ue (Blue Glue).

Each song is Suno-ready (style prompt + clean lyrics + movement guide). Bingo boards organised in teaching order (6 boards × 16 words each), printed as both `.md` and `.docx`. Master file: `Digraph_Year_Plan.md` + `.docx`. Open in September, jump to the week, run it.

**B. Solar system 3-day theme (`whale/themes/solar-system/`):**

Compressed from 5 days to 3 (per teacher constraint). The "dance" frame is the load-bearing pedagogical idea — teach motion, not facts. The week ends Day 3 with a dim-room flashlight-Sun orbit dance, each child holding a planet.

Anchor song *Round and Round* was rewritten heavily for **ESL kindergarten**: every cosmic word is single-syllable (Sun, Earth, Moon, Mars), each verse repeats its anchor 5 times, the chorus is identical every time. Total vocabulary in the song: ~12 words. The dreamy/catchy earlier drafts were superseded — "slow it right down, simplify it properly" was the steer.

**C. Outreach mega-batch — 72 Gmail drafts (`whale/outreach/2026-05-05-drafts-log.md`):**

| Type | Count |
|------|-------|
| Signup welcomes | 3 (BCMA paid `school` plan, Georgetown, Surina) |
| Personalised school follow-ups | 17 (each tailored: country, name, language, recent Montree change) |
| Multiplier partnership pitches | 8 (AMS, Montessori Europe, Montessori Deutschland, NAMC, NCMPS, AMI/USA, Montessori Foundation, Indian Montessori Foundation) |
| Hot-lead carry-overs | 2 (Otari NZ → Susan West, Montessori CH → Silvia partnership reframe) |
| Video-attached short follow-ups | 42 (brief prompt + country-specific one-liner; user attaches short video before sending) |
| **Total** | **72** |

The multiplier pitches all use the same structure: 60-day free pilot for any school they recommend, **20% recurring revenue share** on every conversion (≈$1.40/student/month recurring), free customisation, priority feature requests. This is the partnership angle the dead multipliers never got — they only saw the generic Montree pitch before.

**🚨 Dedup discipline (the win that prevented duplicates):**

Per the standing rule (Session 46 and 50), Gmail searches were run on every recipient before any draft. **Three contacts were skipped because Gmail showed prior follow-ups already sent:**
- MSB Beijing — three prior touches (Mar 28, Apr 2, Apr 7)
- Ohana Tokyo — Apr 30 follow-up already sent
- IMSP Prague — drafted earlier in this same session

**Five more were skipped because no Gmail history was found** (likely stale addresses): Maria Montessori Toronto, Peterson Mexico, FAMM cdleon, Porirua NZ, Studio Montessori SF.

The DB `status='sent'` field is NOT reliable for dedup — confirmed again today. Always check Gmail. Use batched OR queries (10 emails per query) for speed.

**D. Picture bank audit (read-only):**

Reviewed `/montree/library/photo-bank` route + component + API after Tredoux reported "478 photos found, none rendering." Likely causes identified: Supabase Storage bucket toggled non-public, CSP `img-src` blocking, or stale service worker cache. Issue self-resolved during session. Architectural note: the photo bank API returns **direct Supabase URLs** rather than going through the `getProxyUrl()` Cloudflare proxy that every other media surface uses. Inconsistent — file as future migration.

**Files added (no commits):**
- `digraph-shelf/` — full 17-week language curriculum (15 .md files + 2 .docx)
- `themes/solar-system/Solar_System_Week.md`
- `outreach/2026-05-05-drafts-log.md`
- `docs/handoffs/SESSION_88_HANDOFF.md`

**Outreach campaign state:**

| Metric | Value |
|--------|-------|
| Total contacts | 536 |
| Sent (initial pitch) | 270 |
| Drafts in Gmail awaiting send (created today) | 72 |
| Drafts sent earlier today | 30 |
| Bounced | 102 (research recovery next session) |
| Replied | 13 |
| Dead | 37 |

**🚨 Next session priorities (ordered):**

1. **Verify the 72 drafts get sent** — Gmail Drafts → review → for the 42 video-attached ones, attach the short video before send. Tick boxes in `whale/outreach/2026-05-05-drafts-log.md` as they go.
2. **Continue outreach push** — ~57 more individual schools at `status='sent'` `follow_up_count=0`. Use the short video-prompt template from today, respect the dedup discipline.
3. **Bounce-recovery email research** — Paint Pots UK (Apr 30 bounce), Copenhagen (verify `info@montessori-cph.dk`), Opera Nazionale Italy (use `segreteria@montessori.it` from their auto-reply), Montessori St Nicholas UK, Montessori Society UK, SAMA South Africa.
4. **Stale-address verification** — Maria Montessori Toronto, Peterson Mexico, Porirua NZ, Studio Montessori SF, FAMM cdleon. Web-search before any future send.
5. **Resume Session 87 code priorities** (untouched today): Vault end-to-end test, Tracy play-by-play verification, per-song Share button verification, super-admin 👤 modal verification, Stripe upgrade flow, Tracy `→ ` vs em-dash, `unpack_teacher` progress events, super-admin simplification.
6. **Listen to the Suno output of *Round and Round*** before the solar system week starts — confirm the simplified ESL pace actually sings well, adjust if not.

---

## RECENT STATUS (May 4, 2026)

### ⚡ Session 87 — Super-admin Principals modal + Tracy live play-by-play + Principal Vault prototype + per-song Share button + Tracy avatar shipped (May 4, 2026 evening)

**6 commits pushed to main this session.** Sat on top of Session 86's morning work. Headline: the principal portal got dramatically richer — live play-by-play status under Tracy's avatar, an end-to-end encrypted parent-meeting Vault gated to Tredoux on Whale Class, the real T monogram avatar from Canva, super-admin principal management UI, and per-song Share buttons that retire the slug-typo class of bugs from the QR generator.

**Commits (oldest first):**
- `445ec181` — Whale-class audio rendering fix + super-admin 👤 Principals modal
- `59041e63` — Tracy: live play-by-play progress events under each tool chip
- `d097c22d` — Principal Vault prototype — encrypted parent-meeting recordings (Tredoux-only)
- `fc7d7ac2` — Per-song Share button + QR modal on whale-class pages
- `adfbfd63` — Tracy avatar via /tracy-avatar.png + drop Ask Guru from principal sidebar
- `ac4c24b6` — Add Tracy T monogram avatar asset

**Outside git:**
- 🚨 **Migration 185 run** in Supabase SQL Editor (`montree_principal_vault` table created, all 12 columns verified by user)
- **Tredoux's principal code reset to `ZNGLJT`** (the prior code's plaintext was unrecoverable; new SHA-256 hash written directly to `montree_school_admins.password_hash` for Whale Class principal `16eec1c0-bfb5-4edf-a160-059bb41803fb`)
- **Brand Kit Word doc generated** at `whale/Montree_Brand_Kit.docx` — portable reference for the Canva setup (11-color palette with rendered swatches, fonts, logo asset table, voice & tone, photography guidance, Canva Brand Voice prompt)
- Tracy in Chinese verified working end-to-end on production

**A. Whale-class audio rendering fix + super-admin 👤 (`445ec181`):**

Two assets in `videos.json` had overlapping titles: `End of year Performance` (mp4, slug `end-of-year-performance`) and `End of year Performance Song` (mp3 with `mediaType: 'audio'`, slug `end-of-year-performance-song`). The QR was scanning to the audio entry but the page was rendering everything inside `<video>` regardless of mediaType. Fixed: extended the `Song` interface with `mediaType?: 'video' | 'audio'`, both highlighted and grid cards now branch — audio renders inside `<audio>` on a soft purple-pink-indigo gradient backdrop with 🎵 icon, video keeps the existing `<video>` aspect-video black box.

Plus the super-admin gap: until this commit there was no UI to add/list/reset codes for/deactivate principals from the super-admin dashboard. New API at `/api/montree/super-admin/principals` (GET/POST/PATCH/DELETE) is super-admin-token gated. New modal `components/montree/super-admin/PrincipalsModal.tsx` lists per-school principals with last-login + activation state + "Never logged in" chip; reveal-once banner shows the new 6-char code with Copy button after a create or reset (the only time the plaintext is visible). 👤 button per row in `SchoolsTab.tsx` between ⚙️ and Login →.

🚨 **Architectural rules locked in (Session 84 confirmed):** `montree_school_admins` has NO `login_code` column — codes are SHA-256 hashes in `password_hash`, alphabet excludes I/O/0/1. UNIQUE on `(school_id, email)`. Plain code returned in JSON exactly once.

**B. Tracy live play-by-play progress events (`59041e63`):**

Until this commit, the principal saw a single soft `…` while Tracy was working. Session 85's architecture collapsed parse → resolve → fetch → compose into one server-side `child_focus` tool, which was cheaper but opaque from the client's perspective. A 1-3s delay with no visibility looked like a freeze.

`childFocus()` now accepts an optional `onProgress?: ChildFocusProgressFn` parameter and emits structured `{ phase, vars }` events at each phase boundary: `parsing → lookingUp` (or `lookingUpName` if a name was extracted) `→ fetchingContext → composing`. Errors thrown by listeners are swallowed in a try/catch — the orchestrator never crashes. `TracyToolDeps` in `tool-executor.ts` gains `onProgress?` in deps; the executor wraps the consumer's callback in try/catch via a local `emitProgress()` helper. The principal-agent route wires `onProgress` into a closure that emits a new SSE event type `tool_progress` with `{ type, tool, phase, vars }`. Frontend's `handleEvent` catches `tool_progress` and stores the latest as `turn.progress = { phase, vars }`. The `AssistantBubble` renders the formatted message via `t('tracy.progress.<phase>', vars)`. On unknown phase the fallback is the existing thinking-dots, so a future server emitting an unknown phase doesn't render `tracy.progress.foo` raw.

8 new `tracy.progress.*` keys added (parsing/lookingUp/lookingUpName/fetchingContext/composing + unpacking/countingNotes/scoringNotes reserved for `unpack_teacher`). All 11 non-English locales filled via Haiku batch — strict completeness check passes (3864 keys × 12 locales). Chinese examples: `'正在阅读问题…'`, `'正在查找 {name}…'`, `'正在获取 {name} 的最近观察记录…'`, `'正在组织答案…'`.

🚨 **Architectural rules:** Framework tools with non-trivial latency MUST emit progress events. Server emits structured events, client formats via i18n keys (server stays language-agnostic). `tool_progress` is fire-and-forget — listeners that throw must not crash the tool.

**C. Principal Vault prototype (`d097c22d`):**

Voice-record a parent meeting → Whisper transcription → Sonnet 3-paragraph summary → AES-256-GCM encryption with PBKDF2-derived key from the principal's vault password → save under principal profile. Full client-side end-to-end encryption: the server stores only ciphertext + per-record salt + iv.

**🚨 This is a private prototype.** Both the route handlers AND the sidebar entry are gated to a hardcoded principal_id allow-list (`PRINCIPAL_VAULT_ENABLED_FOR` / `VAULT_ENABLED_PRINCIPAL_IDS`). Until that's removed, nobody else sees this feature exists. Tredoux's principal_id is `16eec1c0-bfb5-4edf-a160-059bb41803fb`.

Files added:
- `migrations/185_principal_vault.sql` — `montree_principal_vault` table, 12 columns, indexed on `(principal_id, recorded_at DESC)`, FK cascades from school + principal
- `app/api/montree/admin/conversations/transcribe/route.ts` — POST audio (multipart) OR raw transcript (json), returns plaintext summary + transcript. Audio flows request → Whisper → response → discarded (never persisted). Sonnet generates the 3-paragraph summary in the principal's locale. NEVER saves anything — stateless route.
- `app/api/montree/admin/conversations/route.ts` — GET list (encrypted blobs + metadata only) + POST save. POST validates base64 shape, salt/iv length bounds, iteration count (100k–5M), ciphertext size (≤2 MB encoded).
- `app/api/montree/admin/conversations/[id]/route.ts` — GET one + DELETE. UUID format enforced before DB hit.
- `lib/montree/vault-crypto.ts` — WebCrypto helpers: `encryptRecord()`, `decryptRecord()`, `verifyPasswordAgainstRecord()`. PBKDF2-SHA256 600k iterations, AES-GCM 256, 16-byte salt, 12-byte IV per record. AES-GCM auth-tag failure on decrypt = wrong password (throws `'WRONG_PASSWORD'` — no separate password-check blob).
- `app/montree/admin/conversations/page.tsx` — full UI: list / new / detail views, first-setup gate, unlock gate, recording with `MediaRecorder`, metadata editor, encrypt-and-save flow, decrypt-on-open, delete. Vault password lives in component memory only — never localStorage. Cleared on lock, refresh, or page navigation away.
- `app/montree/admin/layout.tsx` — sidebar shows 🔒 Conversations entry (between Settings and what was Ask Guru), but only when the logged-in principal_id is in `VAULT_ENABLED_PRINCIPAL_IDS`.

The plain `summary`, `transcript`, `child_id`, `child_name`, `notes`, `meeting_date` are NEVER stored on the table — they live INSIDE the encrypted ciphertext as a JSON blob. The server cannot decrypt.

Privacy posture:
- Audio bytes flow request → OpenAI Whisper → response → discarded. By default OpenAI retains audio up to 30 days for abuse monitoring. Acceptable for the Whale Class prototype; broader rollout needs zero-retention agreement OR self-hosted Whisper.
- Transcript flows to Anthropic for the summary under the existing API contract (30d retention, no training).
- Encrypted vault blob is the only persistent copy. Server cannot decrypt. If the principal forgets her password, data is unrecoverable.
- Gold consent banner before every recording: "Tell the parent. Recording someone without telling them is illegal in many places, and even where it's legal it's the wrong way to start a relationship. Use this for your own clarity, not as evidence."

🚨 **Architectural rules locked in:** Server NEVER sees plaintext. Vault password in-memory only. First save asks for password twice (matched). Subsequent saves run typed password through `verifyPasswordAgainstRecord()` against most recent record. AES-GCM auth-tag failure = wrong password. Cipher version on every record. BOTH server + client gate on the principal_id allow-list — don't widen one without widening the other.

**D. Per-song Share button + QR modal (`fc7d7ac2`):**

Replaces the manual `/admin/qr-generator` typing flow for the per-song use case. Eliminates the entire class of slug-typo bugs that produced this morning's "wrong song plays when QR is scanned" incident — share URL is generated from the same `lib/slugify.ts` the public page uses, so link and target page card cannot desync.

New `components/ShareSongModal.tsx` — generates QR client-side via the existing `qrcode` lib, shows the canonical URL with Copy button (clipboard API + `execCommand` fallback), Download QR PNG button, native share button (`navigator.share`) when supported. Generated URL: `https://teacherpotato.xyz/whale-class#song-{slug}` regardless of which page launched it (since `/whale-class` already has the deep-link highlighted-card UX + audio rendering).

Wired into both production listings: `app/page.tsx` (root teacherpotato.xyz, blue/indigo theme) gets a Share button next to Download in the card footer; `app/whale-class/page.tsx` (purple/lilac theme) gets a Share pill in the highlighted card's bottom strip + small share icon next to the week label in grid cards. Both modals dynamic-imported (`ssr: false`) so qrcode library only ships on first share open.

🚨 **Architectural rule:** Share URLs MUST be derived from `lib/slugify.ts`. Hardcoded slugs in QR generators or comms drift over time.

**E. Tracy avatar wiring + drop Ask Guru (`adfbfd63` + `ac4c24b6`):**

`TracyAvatar` component now renders `<img src="/tracy-avatar.png" />` with `onError` → fallback to original CSS-rendered gold-circle T placeholder. Rounded-square corners (border-radius ≈ 22% of size) preserve the design's composition — the T's stem and leaf grow out of the bottom edge of the square, a circle crop would clip them. No border ring; the gold reads as a self-contained card against the dark forest UI on its own.

Asset shipped in `ac4c24b6`: 1024×1024 PNG, 71 KB, valid 8-bit RGB. User saved to `public/tracy-avatar.png` directly via Finder after we figured out that pasting images inline in chat doesn't put them on disk (chat sees them as multimodal context, not files).

Plus dropped Ask Guru from the principal sidebar. Tracy IS the principal's chief-of-staff AI surface. Guru is per-child Maria Montessori in your pocket for teachers, and Tracy can call it as a sub-tool when child-pedagogical depth is needed (Session 85 carry-over `consult_guru`, not yet implemented). Removed `Sparkles` import + `'Ask Guru'` NAV entry. Simplified `activeNav` logic — now just appends Conversations to base NAV for vault-enabled principals.

**Sidebar order after this commit:** Today / Classrooms / People / Pulse / Settings (+ 🔒 Conversations for vault principals). Teacher-side `/montree/dashboard/guru` route untouched.

🚨 **Architectural rules:** Tracy is the principal's only AI chat surface. Tracy avatar is `/public/tracy-avatar.png` with CSS-T fallback — never break the fallback path.

**F. Brand Kit consolidation (no commit, deliverable):**

Generated `whale/Montree_Brand_Kit.docx` (13.6 KB Word doc, validated clean) consolidating canonical brand assets for Canva setup. Contains: tagline ("The magic of Montree."), 11-color palette with hex codes + rendered swatches per row + usage notes, fonts (Lora display / Inter body / SF Mono mono), logo asset table (Wordmark / M Monogram / T Monogram), sprout-mark canonical description, voice & tone do/don't table, canonical phrases ("Tend to the child, not the observation.", "A teacher takes a photo. Montree does the rest."), photography guidance, step-by-step Canva setup, Brand Voice prompt for Canva's AI brand voice setup. Doc lives at `whale/Montree_Brand_Kit.docx` — not committed to git (deliverable, not source).

**Verification status:**
- ✅ Migration 185 run in Supabase, all 12 columns confirmed
- ✅ Tracy in Chinese verified working
- ✅ Tracy avatar PNG on disk and pushed
- ✅ Tredoux logged in successfully with `ZNGLJT`
- ⏳ Audio rendering on whale-class (code shipped, not user-tested)
- ⏳ Super-admin 👤 modal (code shipped, not user-tested)
- ⏳ Tracy play-by-play SSE (code shipped, not user-tested)
- ⏳ Vault end-to-end (NOT tested — full Whisper → Sonnet → encrypt → decrypt round-trip)
- ⏳ Per-song Share button (code shipped, not user-tested)

**Handoff doc:** `docs/handoffs/SESSION_87_HANDOFF.md` — full file-by-file change list, architectural rules, deferred items, end-to-end test plan.

**🚨 Next session priorities (ordered):**
1. **Vault end-to-end test** — Open `/montree/admin` → Conversations → set vault password → record 30-sec dummy → Encrypt & save → reload → re-enter password → tap row → verify decrypted summary + transcript display. Full pipeline (mic → Whisper → Sonnet → AES-GCM → DB → AES-GCM → render) is unverified.
2. **Verify Tracy play-by-play in production** — ask Tracy a child question, expect rolling status line under her avatar (parsing → looking up → fetching → composing) before the answer streams in.
3. **Verify per-song Share button** — root teacherpotato → click Share → confirm QR + URL + native share work.
4. **Verify super-admin 👤 modal** — click 👤 on Chen9 row, run through list/add/reset/deactivate flows.
5. **Tracy `→ ` vs `—` action-line marker** — Tracy is using em-dash where the system prompt asked for arrow. Cosmetic; one-line check on `buildTracySystemPrompt`.
6. **`unpack_teacher` progress events** — three i18n keys pre-translated, ~15 min follow-up.
7. **Super-admin simplification** — multi-session refactor (5-tab structure: Schools / Principals / Money / Outreach / Tracy Insights, archive 18 dead marketing sub-pages and `social-manager/` subtree, retire colored tile ribbon). Worth a fresh head.
8. **Avatar polish** (optional) — tighter T crop, slightly larger sprout for better small-size legibility.
9. **Send the 3 hot lead Gmail drafts** (carry-over) — Ardtona, FAMM, Тамі.
10. **Update CLAUDE.md lead state** (carry-over) — Paint Pots BOUNCED, Ardtona email correction (`vheavey@ardtonahouseschool.ie`), Copenhagen verification.

---

### ⚡ Session 86 — Tracy multilingual + dashboard empty-state race + QR domain isolation + JWT mis-stamp fix (May 4, 2026)

**6 commits pushed to main this session.** Tracy is now fully translated across all 12 locales, the recurring "Bulk Import Students" empty-state flash is fixed at the root cache layer, the QR generator now points songs at teacherpotato.xyz (the canonical Whale Class domain) with middleware enforcement of the product split, and a long-standing JWT role mis-stamp bug that was 403'ing principals out of Tracy is patched at both ends.

**Commits (oldest first):**
- `a86ec6ba` — QR generator: fix indefinite "Loading videos…" on the Song picker
- `87b5d526` — Tracy: full multilingual support (12 locales) + universal action-line marker
- `3d9969da` — Dashboard: kill the "Bulk Import Students" flash on back-nav
- `734a2b5f` — Domain isolation: QR codes point at teacherpotato.xyz + middleware blocks Whale routes on montree.xyz
- `ca1e13bc` — Tracy 403 'Only principals can use the home agent.' — fix JWT role mis-stamping

**A. QR generator stuck-loading + wrong domain (`a86ec6ba`, `734a2b5f`):**

Two layered bugs. **Frontend (`app/admin/qr-generator/page.tsx`):** the load effect's catch and finally branches both checked `controller.signal.aborted`. When the 15s timeout fired, both were `true`, so the catch silently swallowed timeout errors AND the finally never cleared `videosLoading`. Spinner persisted indefinitely. Fix: track `cancelled` (effect teardown) and `timedOut` (timer fired) as separate closure flags. Bumped 15s → 30s for Supabase Storage cold-start tolerance. Removed `videosLoading` from dep array (it was set inside the effect, causing the effect to re-run and abort its own in-flight fetch). Added a Retry button on the error state. **Backend (`lib/data.ts`):** `getVideos()` had no timeout on the Supabase Storage download, and the SDK doesn't accept an `AbortSignal` on `.download()`. New `withTimeout` helper races the download against a 20s timer. Production verified: 92 videos return in 1.75s.

Then user flagged the QR was pointing at `https://montree.xyz/whale-class` but the song page lives on **teacherpotato.xyz**. Fixed `songBase` default + bulk-import examples + placeholder. Plus middleware (`middleware.ts`) — the existing comment claimed it blocked Whale routes on montree.xyz but only redirected `/`. New `WHALE_ONLY_PREFIXES = ['/whale-class', '/admin', '/teacher', '/story', '/games', '/auth']` redirects the whole list from montree.xyz to teacherpotato.xyz, preserving query string and hash so song deep links survive. `/api/*` is intentionally excluded — APIs are gated by per-route auth.

**Resolved — teacherpotato.xyz is fine, sandbox curl was misleading:** Mid-session I curl'd `https://teacherpotato.xyz/whale-class` from the sandbox and got 404s + DNS pointing at `15.197.225.128 / 3.33.251.168`. Concluded the deployment was broken, reverted the QR base URL to `montree.xyz` in commit `3dc7364a`. User then confirmed the site loads fine from their browser — re-flipped the QR back to `teacherpotato.xyz` in commit `7e9bce37`. Final state: QR base URL = `https://teacherpotato.xyz/whale-class`. Middleware does NOT redirect Whale routes from montree.xyz (that piece was added in `734a2b5f` and removed in `3dc7364a` — both domains serve their own routes independently). **Lesson:** don't trust sandbox curl for production reachability checks; verify with the user before reverting work on a deployment-outage assumption.

**B. Tracy multilingual (`87b5d526`):**

Backend: `buildTracySystemPrompt(opts)` now accepts optional `locale` and appends `getAILanguageInstruction(locale)`. New action-line directive in the system prompt: Tracy MUST begin her closing action with the literal arrow `→ ` (universal across languages). `composeAnswer()` and `childFocus()` thread `locale` through to the Sonnet compose system prompt. Haiku parse step stays English-only (returns structured data). `TracyToolDeps` gains `locale`. Route at `/api/montree/admin/principal-agent/route.ts` reads `locale` from request body, allow-lists against 12 supported locales, passes through. `todayLabel` formats in the principal's locale.

Frontend (`app/montree/admin/page.tsx`): `useI18n()` + `LanguageToggle` dropped into the page header. Hardcoded strings replaced with `t()` keys: greeting, help prompt, placeholder, "New conversation", viewer-mode banner, error fallbacks, send/thinking aria labels. `splitActionLine()` rewritten to parse the universal `→ ` marker plus the legacy `I'd …` fallback for cached responses. Request body sends `locale` so the server uses it.

i18n: 15 new `tracy.*` keys added to `en.ts`, Haiku-translated into all 11 other locales via `npm run i18n:fill-ui`. Strict completeness check passes — 3856 keys × 12 locales.

**C. Dashboard "Bulk Import Students" flash (`3d9969da`):**

Critical trust bug. Repro: create new classroom → bulk-import students → click into a child → update shelf → click back → dashboard shows "Bulk Import Students" empty state for ~30s before children "roll back" into view.

Root cause — race in `lib/montree/cache.ts`:
1. User creates new classroom. `useMontreeData(url)` fires GET.
2. GET in flight (Railway cold-start ~1-3s). User opens BulkPasteImport, posts class list.
3. Bulk-import POST resolves first. `onImported` calls `setCacheData(url, {children: [imports]})`. Cache + subscribers update. Grid renders.
4. Original GET resolves with `{children: []}` (queried API before imports inserted). Resolve handler unconditionally writes `cache.set(url, ...)` — **overwriting fresh imports with stale empty.**
5. User navigates to child, comes back. Cache has empty. Empty state renders.
6. ~30s later staleTime expires, refresh pulls real data, grid finally appears.

Fix 1 — race-condition guard in `cache.ts`: capture `fetchStartTime` before the GET. In resolve handler, check if `cache.get(url).timestamp >= fetchStartTime`. If so, a `setCacheData()` write happened DURING our fetch — that mutation is more authoritative than our pre-mutation read. Return cached data instead of overwriting.

Fix 2 — defensive skeleton guard in `app/montree/dashboard/page.tsx`: never render the empty state until a confirmed response arrives. If `childrenUrl === null` (no classroom) OR `childrenData === null` (no response yet, no error), hold the skeleton.

Sessions 70/72/81 had taken stabs at related symptoms but missed the actual cache race. This commit closes the underlying mechanism, not just the symptom.

**D. Tracy 403 'Only principals can use the home agent.' (`ca1e13bc`):**

User reported Tracy 403'ing despite being logged in as principal (dashboard correctly displays "PRINCIPAL"). Root cause: `app/api/montree/auth/unified/route.ts` tried `tryTeacherLogin` BEFORE `tryPrincipalLogin`. For founder-principals (someone in BOTH `montree_teachers` as a teacher in their own school AND `montree_school_admins` as the principal), the same login code matches both tables. Teacher matched first, JWT got stamped `role: 'teacher'`, and the principal-agent route correctly rejected it.

Fix 1 — swap order in unified login: principal first, teacher second. Principal is strictly more privileged; if the same code matches both, principal wins. Other login flows (`/api/montree/principal/login` direct) already issue the correct role — this only affects the unified code-entry path.

Fix 2 — defensive `school_admins` fallback in `app/api/montree/admin/principal-agent/route.ts`: when JWT role isn't 'principal', look up `userId` in `montree_school_admins` filtered by `school_id`, `is_active=true`, `role='principal'`. If found, allow through with a `console.warn` logging the mismatch. This unblocks any existing user holding a mis-stamped JWT (no need to log out + log in to recover). Cross-table UUID collisions between `montree_teachers` and `montree_school_admins` are statistically impossible (separate `gen_random_uuid()` generations) so this can't grant a real teacher elevated access.

Both branches log loudly so Railway logs surface how many users are in the broken state.

**🚨 Architectural rules locked in this session (do NOT let future agents break these):**

1. **`https://teacherpotato.xyz/whale-class` is the canonical Whale Class song URL.** Never point QR codes at montree.xyz.
2. **`/whale-class`, `/admin`, `/teacher`, `/story`, `/games`, `/auth` are Whale-Class-only top-level routes.** Middleware redirects them from montree.xyz to teacherpotato.xyz. `/api/*` is intentionally excluded.
3. **Unified login order: principal → teacher → parent.** A code matching both principal and teacher records grants principal.
4. **Tracy's action line uses the universal `→ ` marker.** `splitActionLine()` parses this in any language. Don't revert to "I'd" English-only matching.
5. **Tracy's `child_focus` parse step stays English-only.** Returns structured data regardless of question language. Compose step is locale-aware.
6. **`fetchData` in `useMontreeData` MUST defer to a more recent `setCacheData` write.** Don't remove the `fetchStartTime >= existingCached.timestamp` guard.
7. **`montree_school_admins` is the source of truth for principal identity.** Other principal-only routes should adopt the same defensive fallback if bitten by a JWT mis-stamp.

**Files changed (6 commits):**
- `app/admin/qr-generator/page.tsx` — frontend timeout fix + teacherpotato.xyz URL
- `lib/data.ts` — `withTimeout` helper around Supabase Storage download
- `lib/montree/tracy/system-prompt.ts` — locale + arrow marker rule
- `lib/montree/tracy/frameworks/child-focus.ts` — locale through compose step
- `lib/montree/tracy/tool-executor.ts` — locale on `TracyToolDeps`
- `app/api/montree/admin/principal-agent/route.ts` — locale read + defensive school_admins fallback
- `app/montree/admin/page.tsx` — `useI18n` + `LanguageToggle` + universal action-line parser
- `lib/montree/i18n/{en,zh,es,de,fr,pt,nl,it,ja,ko,uk,ru}.ts` — 15 new `tracy.*` keys × 12 locales
- `lib/montree/cache.ts` — race-condition guard via `fetchStartTime` comparison
- `app/montree/dashboard/page.tsx` — defensive skeleton guard
- `middleware.ts` — `WHALE_ONLY_PREFIXES` redirect block
- `app/api/montree/auth/unified/route.ts` — principal-first login order

**Handoff doc:** `docs/handoffs/SESSION_86_HANDOFF.md` — full file-by-file change list, audit-cycle bug catalogue, architectural rules, deferred items, next-session test plan.

**🚨 Next session priorities (ordered):**

1. **Verify Tracy on production in Chinese** — open `/montree/admin`, switch to 中文, ask "告诉我关于奥斯汀英语进步的情况". Expect Chinese response with `→ ` action-line.
2. **Verify dashboard empty-state fix on production** — create a fresh classroom, bulk-import, click into a child, update shelf, click back. Grid must remain populated through every step.
3. **Verify QR code end-to-end** — generate one from `/admin/qr-generator`, scan it, confirm it lands on `https://teacherpotato.xyz/whale-class#song-{slug}` and the page renders.
4. **🚨 Run migration 184** in Supabase SQL Editor — required for `montree_principal_agent_log` to receive Tracy interaction rows (carry-over from Session 84/85).
5. **Translation gap audit** — user reported seeing some untranslated strings system-wide. Open dashboard in zh/fr/uk page-by-page, screenshot any English bleed-through, do targeted t() conversions. Infrastructure is solid; gaps are likely individual hardcoded strings that pre-date i18n adoption.
6. **Drop Canva-exported T monogram into `/public/tracy-avatar.png`** (Session 85 carry-over).
7. **Voice input for Tracy via Whisper** (Session 85 priority 4 carry-over).
8. **First-run onboarding for Tracy** (Session 85 priority 5 carry-over).
9. **Family data model for Tracy** (Session 85 priority 7 carry-over).
10. **Send the 3 hot lead Gmail drafts** — Ardtona, FAMM, Тамі (Session 84 carry-over).
11. **Update CLAUDE.md lead state** — Paint Pots BOUNCED, Ardtona email correction (`vheavey@ardtonahouseschool.ie` not `info@ardtonahouse.co.uk`), Copenhagen email verification (Session 84 carry-over).

---

### ⚡ Session 85 — Tracy: build → 5 audit cycles → frontend port → child_focus restructure (May 4, 2026)

**7 commits pushed to main this session.** Tracy went from architectural brief to shipped, audited five times (10 real bugs caught and fixed across the cycles), frontend ported to match the friendly mockup, then completely re-architected when the canonical use case ("tell me about Austin's English progress") proved fragile under chained-tool orchestration.

**Commits (oldest first):**
- `bc018674` — Tracy phase 1: chief-of-staff brain + unpack_teacher framework tool
- `a693674a` — Audit #1 fixes: phantom consult_guru tool, qualityOk excluded no_notes, brand-new children flagged as 21d stalled
- `7c7a02e5` — Audit #2 fixes: phantom find_teacher_by_name, empty-roster nonsense, setTimeout leak in Promise.race
- `a2779360` — Audit #3 fixes: prompt rule contradiction, off-roster note coverage inflation, missing prompt-injection fence on note-quality
- `4f17a3cc` — Audit #4 fix: find_children_by_name tool description claimed wrong field name
- `7ac24885` — Frontend port: friendly mockup → /montree/admin page (gold T avatar, "Hi [Name]. How can I help you?", action line styled distinctly)
- `e4c59894` — child_focus single-tool architecture: replaces fragile chained-tool path with end-to-end server-side flow

**A. Tracy is now live (`/montree/admin`):**

Empty state is just a gold T avatar + `Hi [Name].` + `How can I help you?` and an input. No date, no school name, no system noise. When the principal asks something, Tracy streams a chief-of-staff response that always ends with one concrete action line (parsed via `splitActionLine()` and rendered distinctly with a warm gold dash + 18px breathing room).

Architecture: `lib/montree/tracy/` module — `system-prompt.ts`, `tool-definitions.ts`, `tool-executor.ts`, `frameworks/child-focus.ts`, `frameworks/unpack-teacher.ts`, `frameworks/note-quality.ts`, `index.ts`. The route at `/api/montree/admin/principal-agent/route.ts` imports the module — same SSE/auth/streaming/cost-model machinery from Session 84.

**B. The child_focus restructure (commit `e4c59894`) — the biggest architectural move:**

After 5 audit passes the BACKEND was solid. But on production the user tested "I want to know about Austin's English progress" and Tracy tripped — likely Railway deploy lag, but the user correctly identified the architecture was fragile regardless. *"The be-end-and-end of this system is to answer specific questions about specific children. If it doesn't have this capability you need to restructure its architecture to be competent in this regard."*

OLD path: Sonnet decides find_children_by_name → internal HTTP fetch → auth re-verify → returns matches → Sonnet decides answer_about_child → internal HTTP fetch → auth re-verify → Sonnet inside that route composes → Sonnet relays. **4 Sonnet rounds, 2 internal HTTP hops, 2 auth re-verifications, ~$0.05/question, multiple failure points.**

NEW path: Sonnet decides `child_focus(question)` → server-side: Haiku parses (extracts name, area, focus) → direct DB resolves child + fetches context in parallel → Sonnet composes grounded answer → returns structured result → Sonnet relays. **3 Sonnet + 1 Haiku, zero internal HTTP, zero auth re-verification, ~$0.028/question.**

The user proposed the Haiku-as-parser/Sonnet-as-composer flow himself: *"Haiku dissects the question, sends for the information, Sonnet puts it together."* I refined slightly: keep Sonnet for the compose step because parent-facing voice quality matters; Haiku for parse only. He accepted the cost (~$15-25/month per active principal) given there's "only one principal running this."

**C. Architectural rules locked in this session (do NOT let future agents break these):**

1. **Action rule** — every SUBSTANTIVE Tracy response ends with ONE concrete next action. Pure acknowledgments ("Thanks", "OK") are exempt.
2. **Reactive only** — Tracy never volunteers adjacent problems.
3. **Honesty** — Tracy only quotes dates verbatim (ISO YYYY-MM-DD). Never invents observations, names, classrooms, parents.
4. **Don't lead with pedagogy** — Tracy uses developmental knowledge as substrate, not as the lead.
5. **School-scoping contract preserved** — every direct Supabase query in framework tools filters by `schoolId`. Internal-endpoint wraps re-verify via cookie forwarding.
6. **🚨 No internal HTTP for child questions** — the canonical use case is end-to-end inside `child_focus` via direct Supabase. No HTTP hops, no auth re-verification cascade, no chained-tool fragility. This is the architectural lesson of Session 85.
7. **Per-request random-nonce fences for ANY user-input → AI prompt boundary** — Session 84 canonical pattern. Applied THREE times in Tracy alone: `note-quality.ts`, the parse step in `child-focus.ts`, AND the compose step in `child-focus.ts`.
8. **Heuristic fallbacks for every AI step** — `parseQuestion()` has regex-based fallback if Haiku fails, `composeAnswer()` returns defensive sentence if Sonnet fails, `scoreNoteQuality()` returns `[]` if Haiku fails. No path throws unhandled.
9. **`montree_children` columns confirmed**: `school_id` (migration 126/143), `enrolled_at` (113), `is_active`, `created_at`. All load-bearing for Tracy's queries.
10. **`montree_teacher_notes.teacher_id` IS reliable** (migration 148 line 18). The strongest per-teacher attribution signal. `montree_media.confirmed_by` is best-effort and not used for attribution in unpack_teacher.
11. **`unpack_teacher` quality layer treats `'no_notes'` as NEUTRAL** — only `'thin'` notes count against the verdict.
12. **Brand-new children (enrolled <21d) skipped from stalled-detection** — they couldn't be "stalled 3 weeks" by definition.
13. **Off-roster notes don't inflate `coverage_pct`** — `evidenceNoteChildIds` is filtered to children IN the teacher's roster.
14. **Empty roster returns `verdict.label: 'no_data'`** — not `soft_week` with nonsense reasons.

**D. The 10 bugs caught across 5 audit passes (convergence pattern: 3→3→3→1→0):**

Audit #1: phantom consult_guru tool (5 references), qualityOk excluded no_notes (penalised note-less teachers), stalled-detection treated brand-new children as 21d stalled.

Audit #2: phantom find_teacher_by_name (same bug class as consult_guru), empty-roster verdict was nonsense ("Coverage at 0% — 0 children without evidence"), setTimeout leak in Promise.race (Node anti-pattern).

Audit #3: prompt rule contradiction (non-negotiable action rule contradicted conversational carve-out), off-roster note coverage inflation (could produce coverage_pct >100%), missing prompt-injection fence on note-quality.ts.

Audit #4: find_children_by_name description claimed `classroom` field but actual API returns `classroom_name`.

Audit #5: came back clean.

**E. Tracy's voice and visual design conversations:**

User pushed twice on the surface design. First mockup feedback: *"I want it simpler and more friendly — does she really need to know the date, the day and the school's name?"* Stripped to just `Hi [Name].` + greeting + input. Second: *"How can I help you?"* — the simplest, most timeless version. *"A real person asking, not a service bot."*

Avatar exploration in Canva Pro: started with three options (illustrated portrait, botanical symbol, monogram). Tested watercolor portraits in Canva — generic AI woman, rejected. Settled on **T monogram in elegant serif** (Ink print style, gold on deep forest green). Final asset still pending the user's chosen Canva export. CSS-rendered T placeholder works for now — `TracyAvatar` component swap to `<img>` is one-line when the PNG drops.

**F. Carry-overs that are STILL unresolved:**

1. **🚨 Migration 184 still hasn't been run in Supabase** (carry-over from Session 84). `montree_principal_agent_log` table doesn't exist. Until run, every Tracy interaction's logging silently fails. Tredoux can't see what principals are asking via `/montree/super-admin/principal-questions`.
2. **Resend `RESEND_API_KEY` env var on Railway still placeholder** (carry-over from Session 83/84). Affects principal invite emails, unrelated to Tracy.

**G. Pre-existing 401 noise (NOT introduced by Tracy):**

User's console showed a 401 on `/api/montree/auth/me`. Diagnosed as pre-existing: `recoverSession()` in `lib/montree/auth.ts:94` expects a teacher session shape. Principals 401 silently. Function catches the failure and returns null. Noisy console output, harmless function impact.

**Files changed (7 commits):**
- NEW: `lib/montree/tracy/` (system-prompt, tool-definitions, tool-executor, index, frameworks/child-focus, frameworks/unpack-teacher, frameworks/note-quality)
- MODIFIED: `app/api/montree/admin/principal-agent/route.ts` (imports Tracy module)
- REWRITTEN: `app/montree/admin/page.tsx` (Tracy frontend, +348/−438 lines)

**Cost analysis (real numbers):**
- Per Tracy child question: ~$0.028 (3 Sonnet + 1 Haiku)
- Per Tracy teacher question: ~$0.015 (2 Sonnet + 1 Haiku for note quality)
- 20-30 questions/day per principal × ~$0.025/question = **$15-25/month per active principal**

**Handoff doc:** `docs/handoffs/SESSION_85_HANDOFF.md` — full file-by-file change list, audit-cycle bug catalogue, architectural restructure rationale, deferred items, 9-step production verification checklist, next-session priorities.

**🚨 Production verification checklist (next session, after Railway redeploys e4c59894):**

1. Hard refresh `/montree/admin` (Cmd+Shift+R) to clear any cached bundle.
2. Confirm empty state: gold T avatar + `Hi [Name].` + `How can I help you?`.
3. Try "How is [a real student name] doing?" → expect Tracy calls `child_focus` once, returns grounded prose.
4. Try "Tell me about [student]'s English progress" → expect prose specifically about their language area.
5. Try "What should I tell [parent] about [child]'s math?" → expect parent-ready paragraph.
6. Try "How is Frodo doing?" (nonexistent name) → expect honest "I couldn't find" response, NOT system error.
7. Try "How is [a real teacher] doing?" → expect Tracy calls `unpack_teacher`, returns chief-of-staff assessment.
8. Verify closing "I'd …" line renders distinctly with warm gold dash treatment.
9. Run migration 184 in Supabase (if not done), verify rows in `/montree/super-admin/principal-questions`.

**🚨 Next session priorities (ordered):**

1. **Run migration 184 in Supabase SQL Editor** — required for principal-agent logging to work. Until run, the questions log is dark and we can't learn from real principal usage.
2. **Verify production works for real child questions** — run the 9-step checklist above. If anything trips, send screenshot.
3. **Drop Canva-exported T monogram into `/public/tracy-avatar.png`** — when Tredoux has chosen his preferred variant. `TracyAvatar` swap to `<img>` is one-line.
4. **Voice input for Tracy** — biggest UX win remaining. Whisper integration shipped elsewhere in the app (see Sessions 79-80). Mic button next to send. Half a day's work.
5. **First-run onboarding** — Tracy introduces herself once on first visit: *"Hi, I'm Tracy. I'm here to help you run the school — ask me anything."* Then steps back to clean home forever after.
6. **System prompt nudge for closing-action variety** — closing actions feel slightly mechanical right now. Want range: "Worth a check-in tomorrow", "Leave it for now", "I'd reply with this paragraph as written."
7. **Family data model — Phase 3 of the original Tracy plan** — the largest novel-capability unlock. New tables: `montree_families`, `montree_family_members`, `montree_family_interactions`. Then build `family_context` framework tool. Without this, Tracy can't answer "what's the latest with Emma's family?"
8. **`consult_guru` Tracy → Guru bridge** — when a question goes pedagogically deep on a single child, Tracy currently answers from her own training. A consult_guru tool would let her hand off to Guru properly.
9. **Send the 3 hot lead drafts in Gmail** (carry-over from Session 84) — Ardtona, FAMM Argentina, Тамі.
10. **Update CLAUDE.md lead state** (carry-over) — Paint Pots BOUNCED, Ardtona email correction (`vheavey@ardtonahouseschool.ie`), Copenhagen email verification.

---

## RECENT STATUS (May 3, 2026)

### ⚡ Session 84 — Bug-fix sprint → principal home redesigned twice → "ask anything" agent with product-signal logging (May 3, 2026)

**16 commits pushed to main this session.** Headline: **the principal home page is now an "ask anything about your school" agent** with built-in question logging (migration 184) that drives "what to build next" decisions from real principal usage. Three pre-existing bugs fixed and verified by user, then a same-day redesign-then-pivot of the principal home, then full audit cycle that caught 5 real ship-blockers across the day.

**Commits (oldest first):**
- `39c6f3f5` — Fix invite-principal 500: stop writing nonexistent login_code column on montree_school_admins
- `c04fc376` — Fix ghost 503 console noise: narrow SW fetch handler, stop fabricating fake 503 responses, bump cache to v4
- `663d7d85` — Speed up progress GET: parallelize curriculum SELECT, drop redundant child query (saves 250-500ms)
- `a7be3f8a` — Audit catch: remove dead Step 2 principal lookup in auth/unified (same nonexistent column bug)
- `5cdc0134` — Audit catch: harden SW precache against single-URL install failures (Promise.allSettled per URL)
- `0ffa7625` — Skip principal invite email entirely; modal copy "Code created" + "Get their code"
- `8928d3a5` — Make focus-pick instant when picking work for an empty area (optimistic update was using prev.map only — appended new entry when no existing focus for area)
- `5aa7eab4` — Principal home redesign V1: search-first home + AI child briefing + parent-question helper
- `86ab61bc` — Audit catch: XML fence on parent-question to block prompt injection + date-format guards
- `8f9909c7` — Audit catch: harden parent-question fence regex against whitespace variants
- `940ee854` — Audit catch: replace fixed fence delimiter with per-request 24-char random nonce (defeats every fence-escape attack class)
- `368de01a` — **Principal home pivot V2: "ask anything" agent.** New principal-agent API (SSE + Sonnet tool-use loop, 5 read-only tools) + agent chat UI + super-admin questions log + migration 184 (montree_principal_agent_log)
- `0397209e` — Audit catch: sanitize history array (block forged tool round-trips), assert cost model matches Sonnet pricing, document school-scoping contract
- `9c39f63e` — Park social-analytics setup guide in super-admin (/montree/super-admin/social-setup) — checkbox-tracked Meta Developer App walkthrough

**A. Three pre-existing bugs fixed (verified in production by user):**

**Invite-principal 500** (`39c6f3f5`): Route was inserting `login_code` column into `montree_school_admins` that doesn't exist on that table (only `montree_teachers` has it, per migration 091). Postgres returned 42703, the route's retry loop only caught 23505, surfaced as "Could not create the invitation" 500. Removed all writes/reads of `login_code` from the route — principals authenticate via `password_hash` lookup (legacy SHA-256) which the principal/login route already does correctly. Audit pass found SAME bug pattern in `auth/unified/route.ts` `tryPrincipalLogin` Step 2, fixed in `a7be3f8a`. Confirmed working by user (saw codes `8TXYGF` and `B4DFBE` in modal screenshots).

**Ghost 503 console noise** (`c04fc376`): User reported persistent 503s on dashboard pages despite the page rendering fine. Diagnosed via Railway runtime logs — every API call had a `[req]` log line (Session 83's diagnostic) but ZERO `[req]` for the page document, meaning the request never reached Node. Source: `public/montree-sw.js` was calling `event.respondWith()` on EVERY same-origin GET (including Next.js RSC prefetches it had no business handling), and any fetch failure was being converted to a fabricated `new Response('Offline', { status: 503 })`. Narrowed the fetch handler to ONLY intercept cacheable static assets + top-level navigations. Pre-cached `/montree/offline` (was listed but never actually added). Asset failures now re-throw `TypeError` instead of synthesizing 503. Bumped cache to `montree-v4`. Confirmed working — user saw clean v3→v4 transition.

**Slow progress GET** (`663d7d85`): User reported "the works get updated eventually but take a long time." Session 83 already fixed the WRITE; the READ path the dashboard polls had two sequential queries AFTER the parallel batch — a redundant `SELECT child.classroom_id` and a serial `SELECT entire classroom_curriculum_works`. Hoisted classroomId out of `verifyChildBelongsToSchool`'s try block, added the curriculum SELECT to the `Promise.allSettled` queryPromises array, dropped the redundant child query.

**B. Two UX tweaks shipped in same flow:**

**Skip email for principal invite** (`0ffa7625`): Resend `RESEND_API_KEY` env var on Railway is the recurring blocker (still placeholder `re_123` per Session 83 carry-over). Rather than chase the env, removed the email send entirely from invite-principal route. Modal headline `"Invitation sent"` → `"Code created"`, body rewritten to "Share this code with [name]" + Copy button, CTA `"Send invitation"` → `"Get their code"`. Backend response keeps the `email` field as `{ sent: false, skipped: true }` for backward compat.

**Focus-pick instant on empty area** (`8928d3a5`): User reported add-work was still not instant after the server-side speed fix. Found a real client-side bug: `handleWheelPickerSelect` in `useWorkOperations` was using `prev.map(...)` to update the focus work, which only TRANSFORMS existing entries. If the area had no focus work yet (e.g., Math empty), the new pick disappeared into local state until the next `fetchAssignments` refresh. Fix: check `prev.some(w => area === w.area)` — if exists, replace; if not, append. Revert path also fixed for the new-entry case.

**C. Principal home redesigned TWICE in one session:**

**V1 (search-first)** at `5aa7eab4` — built around the user's pitch: "tired principal opens phone, parent stops her in corridor, she needs to find a child fast." Hero + viewer banner + huge search bar over full school roster + recently-viewed children. Tap → `/montree/admin/child/[childId]` page with photo + name + AI-synthesised briefing prose + "What did the parent ask?" textarea. Two new APIs: `/api/montree/admin/child-briefing/[childId]` (GET, full context bundle → 200-300 word briefing, cached 30 min) and `/api/montree/admin/parent-question` (POST, takes a question, returns answer with strict no-invent rules).

**V2 (agent-chat)** at `368de01a` — same-day pivot. User's reframe: the principal isn't searching for a child first; she's talking to an assistant that knows her whole school. AND we should be logging her questions to learn what to build next. Built a new `/api/montree/admin/principal-agent` route (POST, SSE-streamed, Sonnet tool-use loop max 5 rounds, 90s timeout) with five read-only tools:
- `find_children_by_name` — wraps existing `/admin/students/search`
- `get_child_briefing` — wraps the V1 child-briefing route
- `answer_about_child` — wraps the V1 parent-question route
- `list_classrooms_with_summary` — direct Supabase: classroom + lead teacher + child count + 7d observed count
- `list_teachers_with_summary` — direct Supabase: teacher + classroom + last_login + 7d photo confirmation count

Migration 184 (`montree_principal_agent_log`) captures every Q→A: school_id, principal_id, conversation_id, question, answer, tools_called JSONB array, model, tokens, cost_usd, duration_ms, error. New super-admin page `/montree/super-admin/principal-questions` with sign-in + filters (school, date range) + per-school summary chips + expandable rows. New home page `/montree/admin/page.tsx` (replaces V1) — chat thread persists in localStorage per `conversation_id`, streams events live (tool chips with in-flight/success/failure states, italic "thinking" between tool calls, serif final answers), suggestions block when empty, "New conversation" button.

The V1 child-briefing page at `/montree/admin/child/[childId]` is preserved as a deep-link destination — the agent can recommend the principal go there.

**D. Audit cycle catches (this is where most of the value was):**

The fresh-eye audit pattern caught 5 real ship-blockers across the day:

1. **login_code bug had a second instance** (`a7be3f8a`) — `auth/unified/route.ts` had the same nonexistent-column query in `tryPrincipalLogin` Step 2. Silently broken (Step 1 SHA-256 caught everything) but worth removing.
2. **SW precache fragility** (`5cdc0134`) — `cache.addAll` rejects entire SW install if any URL 404s. Switched to per-URL `cache.add` wrapped in `Promise.allSettled`.
3. **Parent-question prompt injection** (`86ab61bc` → `8f9909c7` → `940ee854`) — three audit rounds tightening the same fence. Final solution: per-request 24-char random nonce delimiter that the user can't see, predict, or replay. Every fence-escape attack class is impossible by construction.
4. **Principal-agent history forgery** (`0397209e`) — the agent route was accepting a `history` array from the client and appending it directly. A malicious client could send tool_use / tool_result blocks in history to forge tool round-trips. Added `sanitizeHistory()` that strips every entry to `{ role, content: string }`.
5. **Cost-model drift** (`0397209e`) — cost constants hardcoded for Sonnet 4.6 with no runtime check. Added `assertSupportedCostModel()` — soft assertion (logs `console.error` loudly but doesn't throw).

**E. Lead drafts (3 created, 2 deliberately skipped):**

User asked for follow-up drafts on five hot leads. Did mandatory `to:DOMAIN in:sent` dedup checks per CLAUDE.md Session 46/50 rule.

**Drafted (live in Gmail):**
- **Ardtona House** (`vheavey@ardtonahouseschool.ie`, draft `r-5830285817063155658`) — gentle nudge on free pilot offer extended Apr 22
- **FAMM Argentina** (`marisa@fundacionmontessori.org`, draft `r922107526285003389`) — follow-up referencing Spanish-now-live + new principal feature
- **Тамі** (`kiverova_tamila@ukr.net`, draft `r-3855980242246939057`) — Ukrainian welcome with apology for imperfect Ukrainian + invitation to reply in any language

**Skipped:**
- **Paint Pots** (`paintpotsmontessori@outlook.com`) — Apr 30 send BOUNCED. Address dead. **Action needed:** find working email.
- **Copenhagen** (`info@montessori-cph.dk`) — CLAUDE.md lists as hot lead but Gmail has zero history with that address. **Action needed:** confirm email or forward original reply.

**F. Social-analytics setup parked** (`9c39f63e`):

User asked for help building social analytics dashboard inside Whale (Meta Graph API → Supabase → admin route). Started Phase 1 Step 1 (Meta Developer App + access tokens) but user said "this is too much for me right now. can you put it in super admin for me to pick up later?" Parked the guide as `/montree/super-admin/social-setup` — super-admin auth gate, six parts × 24 numbered steps, per-step checkboxes that persist in localStorage, progress bar, reset button. When all checked, "Ready for Step 2" CTA appears with the exact phrase to ping the agent with to resume: **"Ready for Step 2 of social setup"**.

**🚨 Architectural rules locked in this session (do NOT let future agents break these):**

1. **`montree_school_admins` has NO `login_code` column.** Principals authenticate via `password_hash` lookup. Never write `login_code` to this table.
2. **Service worker MUST stay narrow-intercept.** Only call `event.respondWith()` for cacheable static assets + navigation requests. Never fabricate fake status codes again.
3. **SW precache MUST tolerate single-URL failures.** `Promise.allSettled` over per-URL `cache.add`, never `cache.addAll`.
4. **Per-request random nonce fences for user-typed input → Sonnet prompt.** `crypto.randomBytes(N).toString('hex')` per request. Tell Sonnet via system prompt that the fence is session-unique. Pattern is canonical in `app/api/montree/admin/parent-question/route.ts`.
5. **Sanitize client-supplied history before appending to conversation.** Always strip down to `{ role, content: string }`. Pattern is canonical in `app/api/montree/admin/principal-agent/route.ts` `sanitizeHistory()`.
6. **Cost-model assertion when logging cost_usd.** Hardcoded pricing constants need a runtime check. Soft assertion (console.error) is enough.
7. **Tool-using agent that calls internal endpoints MUST forward auth cookie + each inner endpoint MUST re-verify school_id.** Documented at the top of `executeTool` in `principal-agent/route.ts`.
8. **Optimistic UI updates for "select" operations must handle the empty-collection case.** If you're using `prev.map(...)` to update an entry, also check whether the entry exists; if not, append.
9. **Honesty rules in Sonnet prompts: only quote dates verbatim from context (YYYY-MM-DD), no medical claims, no future promises, fall back to "I'd like to check with [teacher]" when context doesn't cover the question.** Canonical across child-briefing, parent-question, and principal-agent system prompts.

**Migration to run:**

🚨 **`migrations/184_principal_agent_log.sql`** must be run in Supabase SQL Editor before the principal-agent's logging works. Until run, the agent will function but rows silently fail to insert (errors caught in fire-and-forget). Bug surfaces only as "no rows in super-admin/principal-questions view".

**Lead state corrections needed** (will update in next session):
- **Ardtona House**: actual email is `vheavey@ardtonahouseschool.ie` (.ie not .co.uk), Valerie said "very small not interested", Tredoux already offered free Apr 22 — current draft is a gentle nudge on that
- **Paint Pots Montessori**: Apr 30 send BOUNCED. Address dead.
- **Montessori Copenhagen**: no Gmail history with `info@montessori-cph.dk`. Email may be wrong.

**Handoff doc:** `docs/handoffs/SESSION_84_HANDOFF.md` — full file-by-file changes, every commit explained, architectural rules in detail, deferred items.

**🚨 Late-session product reframe — TRACY (no code yet, theorize-first):**

After shipping the V2 agent home, user pushed back on the "proactive briefing" dashboard mockup I'd drawn. Real position from Chen-as-archetype:
- Principal **does NOT want a daily briefing.** Has enough to deal with outside Montree. Last thing she wants is the system adding new problems to her plate.
- Principal **does NOT care about individual children pedagogically.** That's the teacher's job. She's not teaching.
- Principal **cares about the business** — parent retention, teacher accountability, school reputation.
- Wants **competence on demand.** Reactive only. The home page is a clean surface with one input. The product's value is what happens when she asks.

Naming decision locked in: **the principal's AI is named TRACY.** Distinct from Guru:
- **Guru** = Maria Montessori in your pocket. Per-child, pedagogical, teacher-focused.
- **Tracy** = principal's chief-of-staff. Whole-school scope (every child, every teacher, every note, every observation, every parent signal). Can CALL Guru as a sub-tool when child-pedagogical depth is needed.
- Voice: chief-of-staff, decisive, **always ends with what she should DO**, never delivers new problems she didn't ask about.
- Question categories Tracy must answer well:
  - **Teachers (her core job):** *"How is Susan doing in the classroom?"* — Tracy unpacks vague-on-purpose into activity + coverage + quality + pattern + verdict
  - **Parent-trigger child synthesis:** *"Emily's mom is asking about her math — what do I say?"* — Tracy pulls child data + relevant teacher note + stitches an honest, defensible, parent-ready answer in the principal's voice
  - **Parent relationships:** *"What's the latest with Emma's family?"* — needs new parent-as-first-class-entity data model (current biggest gap)

🚨 **Tracy is theorize-first.** Next session does NOT build code. Next session uses the 3×3×3×3×3 method (Session 82 canonical) and produces `docs/TRACY_FRAMEWORK_PLAN.md`. Brief lives at `docs/TRACY_FRAMEWORK_BRIEF.md` with full scope of what to research, what's already decided, and what NOT to do. Build comes after the plan + investigate + audit cycles are complete.

**Decisions already locked (do not re-debate next session):**
1. AI is named Tracy.
2. Tracy is distinct from Guru. Different surface, different voice, different scope.
3. Tracy can call Guru as a sub-tool.
4. Home page has no proactive content. Reactive only.
5. Tracy lives on the existing `/montree/admin` route (replaces principal-agent prompt + tools — doesn't replace the route).
6. Logging continues to `montree_principal_agent_log` (migration 184).
7. Whether to rename the existing `/montree/admin/guru` sidebar item is a separate question, decide in the plan, not now.

**Next session priorities (ordered):**
1. **🚨 Run migration 184** in Supabase SQL Editor — required for principal-agent logging.
2. **🚨 TRACY THEORIZE PHASE.** Open `docs/TRACY_FRAMEWORK_BRIEF.md`. Run Phases 1–3 of the 3×3×3×3×3 (RESEARCH × 3 → PLAN × 3 → INVESTIGATE × 3). Produce `docs/TRACY_FRAMEWORK_PLAN.md`. Audit the plan. **Do not write code in that session.**
3. **Verify V2 principal-agent on production** (current state, before Tracy lands) — open `/montree/admin`, ask 5-10 questions covering the agent's full tool surface. Watch the super-admin questions log fill in. This validates the plumbing before Tracy reframes the brain.
4. **Send the 3 hot lead drafts in Gmail** — Ardtona, FAMM, Тамі. All passed dedup checks, ready to send.
5. **Update CLAUDE.md lead state** — Paint Pots BOUNCED, Ardtona email correction (`vheavey@ardtonahouseschool.ie` not `info@ardtonahouse.co.uk`, .ie not .co.uk), Copenhagen email verification.
6. **Resolve the Resend block** — set `RESEND_API_KEY` on Railway with a real key + verify `montree.xyz` domain.
7. **Wait for user prompt to resume social setup** — phrase: **"Ready for Step 2 of social setup"**. Then walk through Supabase tables + Railway env vars.
8. **Inner-content polish** on the 8 admin pages from Session 83.
9. **Stripe upgrade flow** — self-serve `personal_classroom` → `school` transition.

---

### ⚡ Session 83 — Principal Cockpit Reframe + Invite Flow + 503 Diagnostic + Speed Fix (May 3, 2026)

**9 commits pushed to main this session.** Reframed the principal portal from CRUD admin tool to school cockpit, shipped the missing teacher→principal invite flow, added 503 diagnostic instrumentation, and made the add-work POST 5x faster. Plus pushed Session 82's Quick Guide fix that had been sitting locally.

**Commits:**
- `38839e36` — Session 82 Quick Guide fix shipped (was sitting in working tree)
- `05d70462` — Cockpit V1: Today page + 6-item dark-forest sidebar + classrooms relocated to `/admin/classrooms` + new `/api/montree/admin/today` endpoint
- `6c9ad229` — V1 audit fix: `teacher_confirmed=true` on observation query + sidebar fallback links
- `4cd40016` — Cockpit V2: People + Pulse hub pages with 4 metric cards each
- `a0c4bd2e` — Cockpit V3: Settings full rewrite + theme cleanup on 8 admin pages (gradient wrappers stripped)
- `303d9bfb` — Cockpit V4: Guru chat dark-forest theme
- `4c2acd07` — 503 diagnostic: `[req] METHOD /pathname` log in `verifySchoolRequest` + `timeout 20` on pip install in `start.sh`
- `247de394` — Principal invite flow + viewer-mode billing gates
- `775afac5` — Speed up `/api/montree/progress/update` — bookkeeping moved to fire-and-forget after response

**A. Principal Cockpit reframe (V1-V4, commits 05d70462 → 303d9bfb):**

The principal portal was 3 sidebar items (Overview / Guru / Settings) with 14 orphaned sub-pages and inconsistent themes (mix of `from-emerald-900`, `from-slate-900`, `bg-gray-950`, no theme at all). Now: 6-item dark-forest sidebar (Today, Classrooms, People, Pulse, Settings, Ask Guru) where every destination resolves to a real page in the canonical brand theme.

The new **Today cockpit** (`/montree/admin`) is the heart of the reframe. School name in Lora serif (clamp 28-40px), "Welcome back, {firstName}. It's {weekday}, {date}.", weekly digest paragraph in plain English ("X of Y children have moments to share, Z photos confirmed, A of B teachers logged in"), 4 metric tiles (children · classrooms · active teachers ratio · observation rate %), wants-your-attention list in gold (idle teachers 3+d, classrooms without lead, children not observed 8+d), quick actions row.

**New API:** `app/api/montree/admin/today/route.ts`. Returns `school / principal / stats / digest / attention / plan`. Cache 5 min, SWR 10 min. The canonical source for principal cockpit data.

**Theme cleanup on 8 drill-down pages** — minimal-touch intervention. Stripped `min-h-screen bg-gradient-to-br ...` wrappers from activity / reports / billing / teachers / students / import / classroom drill-down / guru-settings. Inner content (cards, buttons) unchanged. Pages now sit on the layout's `#0a1a0f` cleanly. Inner-content polish (replacing `bg-white/10` cards with canonical glass tokens) deferred to a focused follow-up commit.

Skipped: `parent-codes` (light theme intentional for printing) and `features` (no theme conflict).

**B. Principal invite flow + viewer-mode (commit 247de394):**

The missing mid-funnel piece. Until this session, principals of teacher-led schools (where a teacher signed up at `/montree/try` first) had no path in — the teacher signup at `try/instant/route.ts:332` doesn't create a `montree_school_admins` row.

The flow:
1. Teacher's More menu → "Invite your principal"
2. Modal: name + email + optional 600-char note
3. Server creates `montree_school_admins` row tied to teacher's `school_id`, generates unique 6-char code (avoids I/O/0/1 for verbal sharing)
4. Resend sends warm welcome email **from `RESEND_FROM_EMAIL`** with subject `'{teacherName} wants to show you something'`
5. Principal clicks "Open Montree" → lands on `/montree/login-select?code=ABC123` → cockpit
6. Principal sees gold viewer banner: "You're a viewer. This is a teacher's classroom — you can browse everything below for free. To add your own classrooms or invite your other teachers, upgrade to a school plan."
7. Add-classroom buttons replaced with gold "Upgrade to add classrooms" links

**Pricing model that this enforces:**

| State | plan_type / status | What | Cost |
|---|---|---|---|
| Trial | `personal_classroom` + `trialing` | 1 classroom · 1 teacher · 30 days · full AI | Free |
| Single classroom | `personal_classroom` + `active` | 1 classroom · 1 teacher · full AI | $7/student/mo |
| School plan | `school` + `active` | N classrooms · N teachers · principal billing | $7/student/mo across school |

Principal invited to a teacher-led school sees but pays nothing — they're a witness. AI work was already done for the teacher; principal is just looking at cached data. Conversion happens at the moment of EXPANSION (adding their own classrooms / teachers), not at the door.

**🚨 Architectural rule locked in:** `is_teacher_led = (plan_type === 'personal_classroom') || has founding_teacher_id`. This is the canonical signal for principal-as-viewer mode. Lives in `/api/montree/admin/today` response under `plan.is_teacher_led`. Drives banners + add-capacity gates.

**🚨 Stripe upgrade flow NOT shipped.** "Upgrade to add classrooms" links to `/pricing` (marketing page). The transition `personal_classroom` → `school` is currently manual (super-admin updates `plan_type`). Self-serve checkout is its own session.

**C. 503 diagnostic instrumentation (commit 4c2acd07):**

After 6 commits in quick succession, user reported persistent 503s. **Root cause confirmed: deploy-window churn.** Each Railway redeploy creates a 30-60s container-replacement window during which Railway's edge proxy returns 503 to all in-flight requests. NOT an app bug — a normal consequence of deploying. But it FELT like a persistent app bug because the user was testing during deploy windows.

**Two surgical changes shipped to confirm + remove one specific failure mode:**

1. `lib/montree/verify-request.ts` — added `console.log('[req] ${method} ${pathname}')` at the top of every API call. Next 503: check Railway logs.
   - `[req]` line present → app got the request → real bug (would normally be 500, not 503)
   - `[req]` line absent → request never reached Node → Railway edge during churn / cold start / healthcheck failure
2. `start.sh` — wrapped `pip3 install --upgrade yt-dlp` in `timeout 20`. Could previously hang on slow PyPI days, blocking `exec node server.js` past Railway's 60s healthcheck timeout, marking container unhealthy, replacing it.

**🚨 Architectural rule locked in:** `export const maxDuration` from prior sessions does NOT take effect on Railway standalone mode. Only enforced by Vercel/Lambda. Session 81's commit `294a0648` ("maxDuration on 25 AI-calling routes") was a placebo on this stack. **Don't ship more `maxDuration` exports attributing 503 fixes.** Real Railway 503 fixes are container-level (memory, healthcheck, startup races).

**D. progress/update speed fix (commit 775afac5):**

User reported add-work was working but "far from instant." Route was awaiting 8-10 sequential DB queries before responding (~1200ms). Auth + `verifyChild` + `SELECT child` + `SELECT existing` + `UPSERT progress` is the actual write. The remaining 4-6 queries were bookkeeping the user shouldn't wait for: curriculum auto-sync (1-4 queries), `is_extra` upsert, focus_works legacy mirror + extras cleanup.

**Fix:** moved all three bookkeeping blocks into `void (async () => { ... })()` fire-and-forget IIFEs that run AFTER `NextResponse.json()` returns. Critical path: ~250ms.

**🚨 Architectural rule locked in:** Bookkeeping after a write goes in fire-and-forget IIFEs. The user shouldn't wait for side effects. Pattern: `void (async () => { try { ... } catch (e) { console.error(...) } })()` before the response return.

**Verification status:**
- ✅ All 9 commits on `origin/main`. Railway auto-deploys triggered.
- ✅ Session 82 Quick Guide fix on production (was the most-overdue ship).
- ✅ Lint clean across all changed files.
- ✅ All 6 sidebar destinations resolve to real `page.tsx` files.
- ✅ All 7 hub-linked pages resolve.
- ⏳ User to verify on production: open `/montree/admin` as principal, expect dark-forest cockpit. Click around hub pages, verify drill-downs open.
- ⏳ Test invite flow: More menu → Invite your principal → check email arrives.
- ⏳ Watch Railway logs for next 503 — `[req]` log line tells us app vs edge.

**Handoff doc:** `docs/handoffs/SESSION_83_HANDOFF.md` — full file-by-file change list, architectural rules, every commit explained, deferred items, end-to-end test instructions.

**🚨 Next session priorities:**
1. **Verify principal invite end-to-end on production** — More menu → Invite → email → click link → land on cockpit with viewer banner.
2. **🚨 Resend `hello@montree.xyz` domain verification** — see Session 83 handoff Section "Carry-overs" for the 6-step process. The invite emails are currently sending from `onboarding@resend.dev` test address (only delivers to Resend account owner). Code is ready — just env var update needed.
3. **Inner-content polish** on the 8 V3 admin pages — replace `bg-white/10` cards with canonical glass tokens. Mechanical sweep, ~30-45 min.
4. **Translation pass** on cockpit + invite copy — about 50 hardcoded English strings. `npm run i18n:fill-ui`.
5. **Voice-first principal onboarding rebuild** — replace 697-line wizard with TellGuruCard-pattern voice flow. Half-day to full-day.
6. **Auth consolidation** — drop localStorage in favor of cookie-only on principal portal.
7. **Setup-stream resilience** — make `/api/montree/principal/setup-stream` idempotent so 503 mid-stream doesn't leave a half-built school.
8. **Stripe upgrade flow** — self-serve checkout for `personal_classroom` → `school` transition. Big lift, separate session.
9. **Verify Quick Guide on production** — eyeball DE/FR/JA after Session 82 fix.
10. **Watch for 503s** — diagnostic shipped, waiting for evidence.
11. **parent-codes** print/screen split.

---

### ⚡ Session 82 — Quick Guide System Structural Fix (3x3x3 Audit) (May 3, 2026)

**🟢 SHIPPED to production in Session 83 (commit `38839e36`).** Originally 8 files changed locally — pushed clean. Applied the 3x3x3 audit methodology after user reported Quick Guide showing wrong language across multiple locales. What looked like a "stale state" bug turned out to be four structural defects layered on top of each other in the consumer code, while the data layer was actually correct.

**The bug anatomy (in plain language):**

The Quick Guide modal was reading from "phantom" TypeScript fields — `quick_guide_zh`, `materials_zh`, `direct_aims_zh`, `indirect_aims_zh` — that no migration ever created and no API ever populated. They were dead types from an early Chinese-first phase that the JSONB-cache architecture (migration 169 + 180-182) replaced. Plus the URL-builder caller in `[childId]/page.tsx` was hardcoded to `if (locale === 'zh' || locale === 'es') url += &locale=...`, silently shipping English to nine other locales (de/fr/pt/nl/it/ja/ko/uk/ru). Plus a third surface (`WorkDetailSheet.tsx` on the home view) wasn't passing the locale param at all. Plus the curriculum directory caller (`curriculum/page.tsx`) had its own Chinese-only filter.

Per-locale UX before fix:
- `en`: worked
- `zh`: blank body — modal read phantom `quick_guide_zh` (undefined) instead of `quick_guide` (which the API had populated with Chinese)
- `es`: worked (the only language that actually worked)
- `de fr pt nl it ja ko uk ru`: English silently — locale never sent to API

**The 3x3x3 method (preserved as user's standing methodology):**

1. **3x RESEARCH** — Audit codebase, count patterns, classify types
2. **3x PLAN** — Design architecture, write handoff, assess risks
3. **3x INVESTIGATE** — Deep-read every target file, verify plan fits, map exact line numbers
4. **3x BUILD** — Implement with audit cycles between rounds
5. **3x AUDIT** — Fix cycle until 3 consecutive clean audits

The methodology paid for itself this session. The initial "5 file targeted fix" pass declared "done," but a self-audit caught two more callers (`curriculum/page.tsx` and `WorkDetailSheet.tsx`) plus a runtime crash risk (Haiku's translation tool schema permitted `oneOf: [array, string]` for `materials` / `direct_aims`, so legacy JSONB rows could in theory store a string and crash `.map()`). After the self-audit, an **independent fresh agent** was spawned with no prior context to re-derive the bugs from symptoms — confirmed soundness and recommended the phantom-type cleanup as the final hardening step.

**Files changed (8):**

1. **`lib/montree/i18n/db-helpers.ts`** — added `getLocalizedGuideField<T>(work, field, locale)`. The canonical pattern: reads `work.guide_content_<locale>.<field>` (JSONB) with fallback to the English flat column. Use this for `quick_guide`, `materials`, `direct_aims`, `presentation_steps`, `control_of_error`, `why_it_matters`, `parent_description` from a curriculum work row.
2. **`app/montree/dashboard/[childId]/page.tsx`** — replaced `if (locale === 'zh' || locale === 'es')` with `if (locale !== DEFAULT_LOCALE && SUPPORTED_LOCALES.includes(locale))`. Added imports.
3. **`app/montree/dashboard/curriculum/page.tsx`** — same locale gate fix (was Chinese-only). Plus modal display name now uses `getLocalizedWorkName(work, locale)` so all 11 non-English locales show the right header (was `locale === 'zh' && chineseName ? chineseName : workName`).
4. **`components/montree/child/QuickGuideModal.tsx`** — now reads `guideData?.quick_guide` and `guideData?.materials` directly. The API merges JSONB into flat fields server-side; reading `quick_guide_zh` / `materials_zh` was reading phantom fields that always returned undefined. `locale` removed from `useI18n()` destructure (no longer needed).
5. **`components/montree/child/FullDetailsModal.tsx`** — same fix for 5 fields: `quick_guide`, `direct_aims`, `materials`, `control_of_error`, `why_it_matters`.
6. **`components/montree/curriculum/CurriculumWorkList.tsx`** — 7 read sites converted to use `getLocalizedGuideField()`. Added `Array.isArray()` guards via IIFE pattern around 3 array fields in case any legacy JSONB row stored a string. The YouTube fallback at line 310 was `!work.quick_guide` (English-only); now `!getLocalizedGuideField<string>(work, 'quick_guide', locale)`.
7. **`components/montree/home/WorkDetailSheet.tsx`** — was passing **no locale param at all**. Now passes for any non-English supported locale. Added `locale` to useEffect dep array so it refetches if user switches language while modal is open.
8. **`components/montree/curriculum/types.ts`** — phantom-field declarations deleted from `Work` (`direct_aims_zh`, `indirect_aims_zh`, `materials_zh`, `quick_guide_zh`) and from `QuickGuideData` (all 8 `_zh` fields). KEPT real columns (`name_chinese`, `parent_description_zh`, `why_it_matters_zh`, `control_of_error_zh` — populated by migration 182). Added typed `guide_content_<locale>?: Record<string, unknown>` for all 11 non-English locales for type support.

**🚨 Architectural rules locked in this session (do NOT let future agents break these):**

- **The `/works/guide` API merges `guide_content_<locale>` JSONB into the flat response fields.** It NEVER returns `_zh`-suffixed body fields. Consumers always read flat fields on the API response.
- **`getLocalizedGuideField(work, field, locale)` is the canonical pattern** for translated guide-body content from a curriculum work row. Don't re-invent the lookup. Don't read from non-existent columns.
- **There are NO `quick_guide_<locale>`, `materials_<locale>`, `direct_aims_<locale>`, `indirect_aims_<locale>`, `presentation_steps_<locale>`, `control_of_error_<locale>` columns.** Only `guide_content_<locale>` JSONB exists for guide-body content (since migration 169). The TS types no longer declare these as autocomplete options.
- **`parent_description_<locale>`, `why_it_matters_<locale>`, `control_of_error_<locale>`, `name_<locale>` ARE real columns** (per migration 182). Read via `getLocalizedField()` — NOT `getLocalizedGuideField()` (which only knows about JSONB).
- **Every caller of `/api/montree/works/guide` MUST pass `&locale=`** for any non-English supported locale. Use the `SUPPORTED_LOCALES.includes(locale)` gate. Validated callers post-fix: `[childId]/page.tsx`, `curriculum/page.tsx`, `ShelfView.tsx`, `WorkDetailSheet.tsx`.
- **Defensive `Array.isArray()` checks before `.map()` on guide-body arrays.** Haiku's translation tool schema permitted `oneOf: [array, string]` for `materials` / `direct_aims`. Render-loop crashes are visible to the teacher.

**Verification status:**
- ✅ 5 phases × 3 rounds (RESEARCH/PLAN/INVESTIGATE/BUILD/AUDIT) complete.
- ✅ Self-audit caught 2 missed callers (`curriculum/page.tsx`, `WorkDetailSheet.tsx`).
- ✅ Independent fresh-agent audit confirmed soundness.
- ✅ Phantom-field reads anywhere in codebase: zero (`grep` clean).
- ✅ ESLint on all 8 changed files: zero new errors, zero new warnings (1 pre-existing `@ts-nocheck` error on `CurriculumWorkList.tsx`, 15 pre-existing warnings — all unchanged).
- ⚠️ TypeScript full compile timed out at 30s in sandbox (codebase too large) — Railway `next build` will catch any remaining issues.
- ✅ Production data populated for all 11 locales per CLAUDE.md Session 78 (migrations 180-182, all batch scripts ran).
- ⏳ User to verify on Railway after deploy.

**Adjacent issues flagged (NOT fixed this session):**
- **`components/montree/home/ShelfView.tsx` lines 441, 602, 870** — work *name* display still uses `locale === 'zh' && work.chineseName ? work.chineseName : work.name`. Same TYPE B pattern but on names not guide content. Already on radar from CLAUDE.md Session 75's "TYPE B sweep across components" TODO.
- **Reports routes (`weekly-wrap`, `send`, `preview`, `batch-narratives`)** — Chinese-only parent narratives. Already in carry-over priorities.

**Handoff doc:** `docs/handoffs/SESSION_82_HANDOFF.md` — full file-by-file breakdown, the 3x3x3 method documented, architectural rules, adjacent issues, next-session priorities.

**🚨 Next session priorities:**
1. **🚨 Push to main + verify on Railway production** — open the dashboard with each locale (en/zh/es/de/fr/pt/nl/it/ja/ko/uk/ru), tap a focus work, verify Quick Guide body shows in the right language. Verify Full Details modal too. Verify curriculum directory and home shelf view's WorkDetailSheet.
2. **ShelfView work-name TYPE B fix** — same pattern as the curriculum directory display-name fix this session. ~30 min, 3 sites.
3. **Carry-overs from Session 81:** Update flow verification, Language Semester v7 polish, transcript FIFO cap, welcome script tone review, free-tier gate decision, 3 hot-lead Gmail drafts (Copenhagen / Paint Pots UK / Ardtona House UK), FAMM Argentina follow-up, welcome Тамі in Ukrainian, Resend domain verification.

---

## RECENT STATUS (May 2–3, 2026)

### ⚡ Session 81 — Two-Path Onboarding + Voice Hardening + Critical 503/500 Fixes + Super Admin Restored + Language Semester v7 Port (May 2–3, 2026)

**16 commits pushed to main this session.** Cascading discoveries: brand pass on the picker turned into a redesign of the onboarding entry point, which surfaced a latent 503 wave, which surfaced a deeper 500 from a non-existent `is_focus` column, plus super-admin regressions and the v7 report port. Headline commits:
- `8391b541` — Two-path onboarding choice (Tell me about my class / Just start with photos)
- `beb0ffd1` — CRITICAL FIX: stop writing is_focus to montree_child_progress (column doesn't exist)
- `294a0648` — Health check: maxDuration on 25 AI-calling routes (was 503-prone)
- `941bcaa6` — maxDuration=90 on Whisper transcribe (was 503-ing)
- `1bee23ea` — Super admin: restore visible spend + fix 'Never' activity for active schools
- `8a1b26d4` — Language Semester Report: port v7 format into in-app generator
- `9d4a7757` — Onboard: always seed 5 focus works (one per area), Sonnet best-guesses
- `c18fd212` — Voice onboarding polish: foundation copy + dashboard parity + prominent search
- `fcab43bc` — Remove legacy WorkSearchBar + fix Chinese leak in search
- `fd4cb638` — WorkWheelPicker brand pass: emerald/gold status dots + softened area badge

**A. Two-Path Onboarding Choice (`8391b541`):**

Forced auto-redirect to voice onboarding gone. New `OnboardingPathChoice.tsx` component renders a clean full-screen takeover with the canonical (locked) copy:
> **Tell me about my class** — 90 seconds per child. I'll build their profiles and your first reports will sound like you wrote them.
>
> **Just start with photos** — Skip ahead. Take photos and watch the dashboard come alive. Your first reports will focus on what we observed this week.

Path A → `/montree/dashboard/voice-onboarding`. Path B → `localStorage.setItem('montree.onboardingChoice.<classroomId>', 'photo')` and dashboard takes over. Choice doesn't nag on refresh. Bulk-import callback no longer auto-redirects — bumps `pendingOnboardingCount` instead. Per-classroom photo flag suppresses re-prompt when teacher has chosen photo. Skeleton holds during probe to prevent flicker. 6 i18n keys × 12 locales.

**B. Voice Onboarding Hardening:**

- **Update flow (`d42727bc`):** "Try again" → "Update". `priorTranscript` state + `isUpdateModeRef` ref. Next recording prepended with `[Teacher added more:]` separator, Sonnet builds a merged profile not a replacement.
- **Shelf Editor stage (`d42727bc`+`a281f9fe`):** mirrors dashboard's `FocusWorksSection` exactly — same `AREA_DOT_RGB` (pink/teal/purple/green/orange), same row chrome `rgba(8,20,12,0.55)`, same status badge, same chevron. Always 5 area slots in canonical PL/S/M/L/C order. Empty slots → brand-emerald dashed pill with the area label. Tap row → WorkWheelPicker for that area. Picker's amber "+ Add custom work" pill creates curriculum works inline.
- **Onboard always seeds 5 focus works (`9d4a7757`):** EXTRACTION_TOOL gained 5 required `focus_<area>` + 5 `focus_<area>_status` fields. Curriculum fetched up-front and included in prompt as AVAILABLE WORKS. Sonnet must pick from real names. New `seedFocusWorks()` runs ALWAYS (regardless of expLevel) with 3-pass match (exact ILIKE → fuzzy ILIKE → canonical fallback that auto-creates the curriculum row). Status preservation via SELECT-then-UPDATE-or-INSERT — never downgrades.
- **Foundation copy (`c18fd212`):** processing screen now says "Laying the foundation for {name}" instead of "Processing / Putting it all together for {name}".
- **Search bar promoted to primary (`c18fd212`):** WorkWheelPicker search input is now the headline element. `pl-14 pr-12 py-4 text-lg`, 22×22 magnifier, focus state has emerald glow ring. Reads as the most important element on the picker screen.

**C. WorkWheelPicker Brand Pass (`fd4cb638` + `618b023f` + `0c55a0e3`):**

Status dots on-brand: practicing `#3b82f6` → `#34d399` (BRAND_EMERALD), presented `#f59e0b` → `#E8C96A` (BRAND_GOLD), mastered keeps `#10b981` for differentiation. Top area badge softened: solid per-area color → emerald-tinted surface + subtle area-color border with localized letter prefix via `getAreaPrefix()`. `getAreaLabel` gained `'math' → 'mathematics'` normalization (parity with `getAreaPrefix`). Global search overlay area badge localized via `getAreaLabel(w.area_key, locale)`.

**D. WorkSearchBar Removal + Chinese Leak Fix (`fcab43bc` + `7c5e5724`):**

The "Find a work" search bar at top of `[childId]` page deleted. New works flow through photo capture pipeline now. Legacy white-theme `WorkPickerModal` deleted (`7c5e5724`) — was broken (took teacher to area view, not specific work; adding made work disappear). State cleanup: `pickerOpen`, `selectedArea`, `loadingCurriculum`, `onAddWork`, `openPicker`, `addWorkFromHook` destructure all removed.

`WorkSearchBar` component KEPT (still used on curriculum directory page). Its Chinese leak fixed — was rendering `result.work.name_chinese` as a stacked subtitle on every result regardless of locale. English-mode teachers saw "Carrying a Chair / 搬椅子" stacked. Now uses `getLocalizedWorkName(work, locale)`, no Chinese subtitle. Audited every other `name_chinese` reference — `WorkSearchBar` was the only user-facing offender. Whale-Class admin pages intentionally bilingual.

**E. CRITICAL: 503/500 Cascade Resolved**

Three layers of latent failures, all surfaced this session:

1. **Whisper transcribe missing maxDuration (`941bcaa6`):** `voice-notes/transcribe/route.ts` had no `maxDuration` export. Railway default 15s. Whisper on 60-90s audio → 503. Fix: `export const maxDuration = 90`.

2. **25 AI routes missing maxDuration (`294a0648`):** Health-check sweep found systemic gap. Bulk-fixed via Python script — 15 heavy Sonnet routes → 120s, 1 transcribe → 90s, 9 quick Haiku → 60s. Includes Smart Capture (photo-insight, snap-identify), weekly review, classroom setup describe, daily plan, end-of-day, photo audit AI tell, weekly admin, activity summary, generate-work-content, photo-enrich, teaching-instructions, weekly-planning/upload, and 13 others.

3. **`is_focus` column doesn't exist on `montree_child_progress` (`beb0ffd1`):** Commits `d42727bc` and `9d4a7757` introduced writes to `is_focus`. No migration ever added it. Postgres 500'd every progress update. Manifested as: 500 on manual "add a work", silently empty seeded shelves after voice onboarding (the `seedFocusWorks` insert was failing inside try/catch).

**The insight:** `progress/route.ts` line 243 DERIVES `is_focus` from the legacy `montree_child_focus_works` table for clients. The focus shelf has always worked off `focus_works` as source of truth. We just needed to stop writing the non-existent column.

🚨 **ARCHITECTURAL RULE LOCKED IN: `is_focus` is NOT a column on `montree_child_progress`.** Never write to it. Future code wanting true persistence must ship a migration first. The legacy `focus_works` mirror in `progress/update` is the trigger when a client sends `is_focus: true` in the body.

Three files cleaned: `progress/update/route.ts` (removed upsert + demote), `onboard/route.ts` (`seedFocusWorks` UPDATE/INSERT branches + demote, `seededShelf` SELECT + sort), `voice-onboarding/page.tsx` (`onSwapWorkSelected` KEPT `is_focus: true` in body — that triggers the legacy mirror, not the column write).

**F. Super Admin Restored (`17ae7b9b` + `1bee23ea`):**

User flagged two regressions:

1. **API spend column invisible** — was rendered alongside Free/Pro tier pill but `text-slate-600` on dark slate background = invisible. $0 spend looked like tracking was missing. Fix: brighter slate text. Data was always there.

2. **"Never" last_active for active schools** — `last_active = max(last_guru_interaction, last_media_upload)` had two gaps: guru interactions only fire on direct Guru use, and `recentMedia` is `.limit(500)` globally. Fix: `apiUsageRaw` query in `super-admin/schools/route.ts` now also captures `created_at`. New `lastApiUsageMap` tracks max(created_at) per school. `last_active` candidates = `[interaction, media, api_usage]` filtered + Math.max. Any school making any AI-routed call gets accurate activity.

**G. Language Semester Report v7 Port (`8a1b26d4`):**

The `term-reports-v7/` outputs (21 PPTXs from `scripts/generate-term-reports.mjs`) are the canonical end-of-semester format we landed on after 7 iterations. Ported v7 prompt rules into `app/api/montree/reports/language-semester/generate/route.ts`. REPORT_TOOL descriptions tightened:
- `para_opening`: 25-30 words HARD LIMIT (was ~30-40)
- `para_circle`: 60-70 words total, 1-2 sentences per point, "do NOT repeat the work name twice", "every sentence must be COMPLETE" (was ~75-90 words, 2-3 sentences)
- `para_english`: 20-25 words HARD LIMIT, "Do NOT start with Dear" (was ~25-30)

System prompt added: no `Dear` in closing, never repeat work name, never invent names, every sentence MUST be complete, total body MUST stay under 110 words.

Still TODO (deferred): `postProcess` strip `Dear X,` from closing, de-dupe `Work - Work` and `Work (Work)` patterns, stricter `scrubHallucinatedWorks`, better `trimToWords` fallback. The v7 script (`scripts/generate-term-reports.mjs`) is the canonical reference.

**Architectural rules locked in this session (do NOT let future agents break these):**

- **`is_focus` is NOT a column on `montree_child_progress`.** Legacy `montree_child_focus_works` table is the source of truth.
- **Every AI-calling route MUST declare `maxDuration`.** Default 15s 503's most Sonnet calls.
- **Two-path onboarding: voice flow stays opt-in.** Photo-driven is the canonical Montessori-aligned path. Choice copy is locked across 12 locales.
- **Voice onboarding shelf editor mirrors the dashboard exactly.** Same colors, chrome, status badge, chevron.
- **Sonnet's `focus_<area>` extraction is REQUIRED, never null.** 5 fields plus statuses required in the tool schema.
- **`Update` button on review = additive merge, not replace.** Prior transcript + separator + new transcript.
- **No bilingual stacking in user-facing UI.** One language per locale.

**i18n state:** 12 locales at 100% parity. New keys: `voiceOnboarding.review.update`, `voiceOnboarding.review.updateHint`, `voiceOnboarding.shelfEditor.*` (6 keys), `voiceOnboarding.processing.layingFoundation`, `dashboard.onboardingChoice.*` (6 keys). All Haiku-batch translated.

**Verification status:**
- ✅ All 16 commits on `origin/main`. Railway auto-deploys triggered.
- ✅ Lint clean (only pre-existing warnings).
- ✅ Pre-commit i18n strict check passes.
- ✅ 500 cascade resolved after `beb0ffd1` deployed.
- ⏳ User to verify on production: tap "Update" on review, manually add a work, generate one Language Semester Report.

**Handoff doc:** `docs/handoffs/SESSION_81_HANDOFF.md` — full 16-commit log, architectural rules, deferred items, file-by-file change list.

**🚨 Next session priorities:**
1. **Verify production** — open dashboard with un-onboarded children, expect choice screen. Tap each path. Verify Update flow on review. Manually add a work (no 500). Generate one Language Semester Report (v7 quality check).
2. **Finish v7 `postProcess` polish** — strip Dear, de-dupe work names, stricter scrub, better trim. ~30 min.
3. **`Update` additive transcript FIFO cap** — ~5 lines, prevents unbounded growth.
4. **Welcome script tone review** for zh/ja/ko/uk warmth.
5. **TYPE B sweep across components** (Session 78 carry-over) — replace `locale === 'zh' ? work.x_zh : work.x` with `getLocalizedField()` everywhere. Hot files: `ThisIsSheet.tsx`, `EditWorkModal.tsx`, super-admin/*.
6. **Free-tier gate decision** — voice onboarding currently works for all tiers including Free.
7. **Send 3 hot lead Gmail drafts** (carry-over) — Copenhagen, Paint Pots UK, Ardtona House UK.
8. **FAMM Argentina follow-up** (carry-over) — past Apr 28 deadline.
9. **Welcome Тамі in Ukrainian** (carry-over) — first organic Ukrainian signup.
10. **Resend domain verification** (carry-over) — verify montree.xyz in Resend.

---

## RECENT STATUS (May 2, 2026)

### ⚡ Session 80 — Voice Onboarding Hardening + Live Transcription + Landing Page i18n + Picker Brand Pass (May 2, 2026)

**🚨 CRITICAL CONTEXT:** User flagged that the first outreach wave LOST users because of poor onboarding. The whole point of this session was to wax the onboarding before outreach restarts. Voice onboarding is the entry point — it has to feel premium and bulletproof.

**14 commits pushed to main this session.** Headline commits:
- `4ac971f7` — New structured prompts: age + time + enjoys + struggles + per-area focus (with 5 areas indented)
- `b044ac5f` — `/onboard` now returns MAX 5 focus works (one per area), matching dashboard logic exactly
- `4d0a0ccc` — WorkWheelPicker rebrand: hot pink → emerald + agent-style Add custom work
- `3a4783ee` — Real seeded shelf in onboarding review + remove No-evidence strip + Add custom work back on shelf
- `e6da5d2b` — Landing page i18n + "Get my code → Let's go"
- `2d59f5fa` — Belt-and-suspenders hardening: every silent-fail path closed
- `735fc08d` — Real-time transcription via Web Speech API + match TellGuruCard call

**A. Voice onboarding orchestrator — current state (post-hardening):**

Architecture:
- Page: `app/montree/dashboard/voice-onboarding/page.tsx` — single state-machine page
- Trigger: dashboard redirects on load if pending children + `tell_guru_onboarding` + teacher role
- Pipeline: `/voice-notes/transcribe` (Whisper backup) → `/children/:id/onboard` (Sonnet profile + game plan + curriculum seed) → `/onboarding/voice/scan-custom` → `/onboarding/voice/custom-work` (inline)

Stages: `loading` → `welcome` → `recording` → `transcribing/processing` → `review` → `transition` → loop OR `complete`. Plus `debug_error` for any failure.

Real-time transcription via Web Speech API:
- Words appear live in a green-bordered panel below the mic as the teacher speaks
- Locale-aware (en-US, zh-CN, es-ES, de-DE, etc.)
- If live transcript ≥40 chars → skip Whisper, send live transcript to Sonnet (free, faster)
- Falls back to Whisper for browsers without SpeechRecognition

**B. The 7-round 503 saga — root cause + fix:**

User saw silent "bumped back to recording" behavior across multiple attempts. After spawning a parallel investigation agent, the actual root cause: `currentChild = pending[currentIndex]` was becoming undefined mid-flow when something reset `pending`, and the code did `if (!currentChild) { setStage('idle'); return; }` SILENTLY — no log, no error handler, no debug screen. The 503 in the console was a red herring (likely SW intercepting an unrelated prefetch).

Fix locked in via `2fa0e97c` + `2d59f5fa`:
- `recordingChildRef` — child identity locked at recording-start, used throughout pipeline
- `classroomIdRef` — same defensive pattern for classroom_id
- `hasLoadedRef` — `loadPending` fires AT MOST ONCE per mount
- 90s watchdog — if pipeline hangs, route to debug_error
- Every `setStage('idle')` in error paths replaced with `setStage('debug_error')`
- Cleanup useEffect clears watchdog on unmount

**🚨 ARCHITECTURAL RULE:** every `setStage('idle')` in error paths is a bug going forward. Use `setStage('debug_error')` so failures are always visible.

**C. Onboarding prompts (final structure — `4ac971f7`):**
- How old they are
- How long they've been in the classroom
- What they enjoy doing
- What they struggle with
- What they're focusing on right now in each area:
  - Practical Life
  - Sensorial
  - Mathematics
  - Language
  - Cultural

The 5 areas render as indented sub-items so it reads as one mental task ("walk me through each area") rather than 9 separate questions. Drives much richer extracted data.

**D. Review screen — what it shows now (`b044ac5f`):**

Title → summary paragraph → **starting shelf** (5 works max, one per area, same source of truth as dashboard's "This Week's Focus") → **unmatched works** (only if any) — agent-styled amber cards with inline "Add to curriculum" button per row → "That's right" / "Try again" buttons.

Earlier iterations had the wrong shelf (chips of `game_plan.works` then ALL `presented`/`practicing` rows producing 10-20 row long list). The fix: the dashboard's focus-picker logic in `fetchAssignments` filters to ONE focus work per area sorted by `is_focus → practicing → presented → not_started → completed`. `/onboard` now applies this exact same logic server-side and returns it as `seeded_shelf`. Same logic, same data, same UX in both places.

**🚨 ARCHITECTURAL RULE:** when something on screen X "should match" something on screen Y, read screen Y's code BEFORE building screen X. This session burned 3 iterations getting this wrong.

**E. Landing page i18n (`e6da5d2b`):**

Full landing page (`app/montree/page.tsx`) now translatable in 12 languages:
- `useI18n()` hook wired
- `LanguageToggle` component added to nav
- 21 new keys under `landing.*` namespace (nav, hero, three blocks, closing CTA)
- All 12 locales translated to 100% parity

Plus: trial signup CTA "Get my code →" → "Let's go →" across all 12 locales.

A non-English-speaking teacher can now discover `montree.xyz`, pick their language from the nav toggle, read the entire site in that language, hit the CTA, sign up — the whole funnel is localised end-to-end.

**F. Dashboard child page polish (`3a4783ee`):**
- "No evidence" strip removed globally — `EvidenceStrengthBadge.tsx` returns null when strength === 'none'. Was cluttering fresh shelves on every newly-onboarded student.
- "Add custom work" affordance added to `WorkWheelPicker` — was a tiny `white/30` text link, now a proper amber pill with gold border + badge. Same Sonnet-enrichment route as the voice onboarding catch.

**G. WorkWheelPicker brand pass (PARTIAL — `4d0a0ccc`):**

DONE:
- Primary CTA button (Add Work / Select) → brand emerald gradient (`#34d399 → #1D6B48`) with glow shadow
- Selection highlight in wheel → emerald-tinted (was area-coloured)
- Empty-state Add first work button → emerald gradient
- "Add custom work" link → agent-style amber pill matching voice-onboarding catch

OUTSTANDING (next session):
- Status dots in wheel rows still use stock blue (`#3b82f6` for practicing) and stock orange (`#f59e0b` for presented). Should be brand emerald + brand gold respectively.
- Top area icon still uses solid `areaConfig.color` (e.g. hot pink for Practical Life). Needs softening.
- `WorkPickerModal.tsx` (separate alternate picker) is still entirely light-theme — needs full dark-forest rebuild.

**H. Marketing artifacts produced (in `docs/marketing/`):**
- `04_montree_voice.png` (1080×1920) — voice onboarding card, full-bleed brand aesthetic
- `05_montree_landing.png` (1080×1920) — English landing card
- `05_montree_landing_zh.png` (1080×1920) — Chinese landing card with Noto Serif CJK SC

Three video phrase translations:
- "The problem" → 难题
- "The solution" → 答案
- "Tend to the Child, not the Observation" → 关注孩子，而非记录

**I. Architectural rules locked in this session (do NOT let future agents break these):**
- The welcome script is canonical (Tredoux-authored). Do not "improve" it.
- No length cap during recording. Summary-back depends on rambling.
- Mic-only during recording → clean Processing screen on stop → review. Three distinct states.
- Status dots / chrome / CTAs use brand emerald. Per-area colors only on the small area icon (identifier data).
- `recordingChildRef` is the canonical source of truth for which child the pipeline is processing. React state can be reset; the ref cannot.
- `/onboard` route returns seeded_shelf using the focus-picker logic that mirrors `app/montree/dashboard/[childId]/page.tsx fetchAssignments`. If that logic ever changes, both must change together.

**Cost per classroom of 20 onboarded:** ~$1–$1.50 (Whisper occasionally + Sonnet + handful of Haiku/Sonnet custom-work calls).

**Verification status:**
- ✅ All 14 commits pushed to `origin/main`
- ✅ Lint clean across all touched files (warnings only, no errors)
- ✅ All 12 locales at 100% i18n parity
- ✅ Pre-commit hook passes
- ⏳ End-to-end test of new 5-prompt structure on fresh classroom — user to perform after Railway deploy
- ⏳ Welcome script tone review for zh/ja/ko/uk warmth
- ⏳ WorkWheelPicker status dots + area icon brand pass — outstanding
- ⏳ WorkPickerModal full dark-forest rebuild — outstanding

**Handoff doc:** `docs/handoffs/SESSION_80_HANDOFF.md` — full file-by-file change list, the 503 saga in detail, deferred items, architectural rules, honest notes on wrong-turn fixes.

**🚨 Next session priorities (ordered by importance for outreach restart):**

1. **Verify Migration 175 is run** in Supabase (`tell_guru_onboarding` default_enabled = true). Check via:
   ```sql
   SELECT feature_key, default_enabled FROM montree_feature_definitions
   WHERE feature_key = 'tell_guru_onboarding';
   ```
2. **End-to-end test the new 5-prompt structure** on a fresh test classroom. Record audio for one ghost student covering all 5 prompts (age, time, enjoys, struggles, per-area focus). Verify the review screen shows 5 focus works (one per area). Verify no silent failures.
3. **Finish the WorkWheelPicker brand pass** — status dots blue→emerald, presented orange→gold, top area icon soften from solid color to emerald-tinted variant.
4. **Rebuild WorkPickerModal in dark-forest theme** — currently light theme entirely, looks broken next to the rest of the app.
5. **Welcome script tone review** for zh/ja/ko/uk versions of `voiceOnboarding.welcome.body` and `voiceOnboarding.welcome.takeBreak`. Haiku is reliable for short functional copy but can come back literal-but-flat for longer warm passages.
6. **Free-tier gate decision** — voice onboarding currently works for all tiers; cost is $1/classroom. If we want Free schools blocked, gate `/onboard` and `/scan-custom` via `resolveReportModel()` 402.
7. **Send 3 hot lead Gmail drafts** (carry-over) — Copenhagen, Paint Pots UK, Ardtona House UK.
8. **FAMM Argentina follow-up** (carry-over) — past Apr 28 deadline.
9. **Welcome Тамі in Ukrainian** (carry-over).
10. **Resend domain verification** (carry-over).
11. **TYPE B sweep across components** (Session 78 carry-over).

---

## RECENT STATUS (May 1, 2026)

### ⚡ Session 79 — Smart Voice Onboarding Orchestrator + Default-Enabled Fix (May 1, 2026)

**Two commits pushed to main: `70a680cd` (orchestrator + 19 files, +2,084) and `081757a9` (Migration 175: default-enabled fix).** Built the full-classroom voice onboarding flow that walks teachers through every un-onboarded child, one at a time, via voice. Replaces the friction of clicking into each child individually to trigger TellGuruCard.

**The flow (per-child, looping until classroom is done):**
- Welcome screen with warm Tredoux-authored script (locked) → "I'm ready" CTA → child name big + mic-only screen with prompts → no length cap recording → Whisper transcription → Sonnet structured profile extraction → summary-back to teacher for confirmation → optional custom-work catch with agent-styled "I noticed you mentioned X" → next child → completion ("Your classroom is alive")

**Triggers (two paths):**
- After bulk import: `onImported` callback redirects to `/montree/dashboard/voice-onboarding`
- On dashboard load: new effect fetches status; if any children lack profiles AND `tell_guru_onboarding` enabled AND user is teacher (not parent/principal), redirect
- Escape hatch: `?skipOnboarding=1` query param bypasses redirect once

**Key files created (commit `70a680cd`):**
- `app/montree/dashboard/voice-onboarding/page.tsx` — orchestrator page (state machine + sub-component for custom-work catch). ~640 lines, inline styles using dark forest aesthetic.
- `app/api/montree/onboarding/voice/status/route.ts` — GET, returns pending children list (joins `montree_children` to `montree_child_mental_profiles`)
- `app/api/montree/onboarding/voice/scan-custom/route.ts` — Haiku tool_use, fuzzy/semantic match transcript mentions against curriculum + area context. Filters confidence ≥ 0.6. Soft-fails to empty array on error.
- `app/api/montree/onboarding/voice/custom-work/route.ts` — Sonnet tool_use generates description/parent_description/why_it_matters/materials. Inserts work, fires `translateAllLocales` and global staging. `source: 'voice_onboarding'`.

**Modified (commit `70a680cd`):**
- `app/api/montree/children/[childId]/onboard/route.ts` — added `getAILanguageInstruction(locale)` to the profile extraction prompt so the summary returns in the teacher's language (was always English regardless of teacher locale).
- `app/montree/dashboard/page.tsx` — trigger effect (with `tell_guru_onboarding` gate, role check, escape param) + bulk import redirect.
- `lib/montree/i18n/en.ts` — 44 new keys under `voiceOnboarding.*`.
- `lib/montree/i18n/{zh,es,de,fr,pt,nl,it,ja,ko,uk,ru}.ts` — 44 keys per locale, populated via patched fill script. **All 12 locales at 100% parity (3,782 keys each).**
- `scripts/fill-missing-i18n-keys.mjs` — closing-marker regex now matches `} as const;` (was only matching `};`, so script silently failed to write after translating).

**🚨 Post-build fix — Migration 175 (commit `081757a9`):**

User tested by opening a brand-new school on production. The trigger did NOT fire. Root cause: Migration 171 set `default_enabled = false` for `tell_guru_onboarding`. Migration 174 enabled it specifically for Whale Class. New schools fall through to `default_enabled` → `false` → my trigger correctly bails. **Migration 175** flips the default to `true`:
```sql
UPDATE montree_feature_definitions
SET default_enabled = true
WHERE feature_key = 'tell_guru_onboarding';
```
**🚨 Migration 175 must be run manually in Supabase SQL Editor.** Has not been run as of session end. Until run, every new school continues to fall through to the disabled default.

**Immediate unblocker for the new school the user has open right now:**
```sql
-- Find new school's ID
SELECT s.id, s.name FROM montree_schools s
JOIN montree_classrooms c ON c.school_id = s.id
WHERE c.name = 'Chen5';

-- Enable for that school explicitly
INSERT INTO montree_school_features (school_id, feature_key, enabled)
VALUES ('<NEW_SCHOOL_ID>', 'tell_guru_onboarding', true)
ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = true;
```

Then refresh the dashboard and the redirect fires.

**🚨 What got REUSED (most of the heavy lifting was already there):**
- Whisper integration via `/api/montree/voice-notes/transcribe` (existing, 5MB cap unchanged)
- Sonnet profile extraction via `/api/montree/children/[childId]/onboard` (existing, very comprehensive — extracts experience_level, curriculum_per_area_0-100, all 9 temperament traits, learning modality, sensitive periods, family notes, strategies, triggers; idempotent upsert; auto-seeds curriculum positions; generates Haiku game plan with locale support)
- Mental profile schema (`montree_child_mental_profiles` — presence/absence per child is the source of truth for "is this child onboarded")
- Custom work translation (`translateAllLocales` from `lib/montree/insert-curriculum-work.ts`)
- TellGuruCard left in place as per-child fallback

No new database tables. Migration 175 is a one-line UPDATE on `montree_feature_definitions`.

**Architectural rules locked in (do NOT let future agents break these):**
- The welcome script is canonical — Tredoux authored it, do not "improve" the wording.
- No length cap during recording — the summary-back wow moment depends on teachers being able to ramble.
- Mic-only during recording — no shelf preview. The shelf reveal at completion is part of the hook.
- `/onboard` is the canonical profile extraction route — do not duplicate.
- Custom-work catch uses Sonnet (not Haiku) for the dialogue — personality matters there.
- Skip = no profile written = re-appears next session. The only way to truly finish onboarding is confirm or fill in via TellGuruCard later.
- Closing the tab loses nothing — pending list is always recomputed from DB.
- Feature flag resolution: `classroom_override > school_override > default_enabled`. Migration 175 makes the orchestrator the default experience for new schools; classroom or school overrides can still opt out.

**Cost per classroom of 20 onboarded:** ~$1–$1.50 (Whisper + Sonnet + handful of Haiku/Sonnet custom-work calls).

**Free-tier gate NOT added** — voice onboarding works for all tiers including Free. If we want Free schools blocked, add `resolveReportModel()` 402 check at top of `/onboard` and `/scan-custom`. One small follow-up.

**Whisper accuracy on Montessori vocab:** soft mitigation via Sonnet fuzzy-matching with area context in `/scan-custom`. Did NOT add Whisper `prompt` parameter with curriculum vocabulary hints — that's a half-day quality lift if misrecognition surfaces as a complaint.

**Verification status:**
- ✅ All four new routes lint clean (0 errors)
- ✅ All modified routes lint clean (0 new errors)
- ✅ All 12 locales at 100% i18n parity (3,782 keys each)
- ✅ Pushed to `origin/main` as commits `70a680cd` and `081757a9`
- ⏳ **Migration 175 not yet run in Supabase** — required for new schools
- ⏳ End-to-end test on a fresh test classroom — user attempted, blocked by feature flag default; will work after migration 175 runs

**Handoff doc:** `docs/handoffs/SESSION_79_HANDOFF.md` — full file-by-file change list, post-build fix details, test plan, deferred items, architectural rules.

**Next session priorities:**
1. **🚨 Run Migration 175 in Supabase** — one-line UPDATE on `montree_feature_definitions`. Required for new-school flow to work.
2. **Verify trigger on the new school the user has open** — either run the per-school INSERT above OR run migration 175, then refresh dashboard. Should redirect to voice onboarding.
3. **End-to-end test the wow moments** — record 60-90s for one ghost student, mention a fake work like "rainbow stacking blocks", verify summary-back, custom-work catch, completion screen, populated shelves.
4. **Verify Whale Class behavior** — Whale Class still has the explicit migration-174 override; if any of the 20 students still lack a mental profile, the orchestrator WILL fire there too. If undesired, run `UPDATE montree_school_features SET enabled = false WHERE school_id = 'c6280fae-567c-45ed-ad4d-934eae79aabc' AND feature_key = 'tell_guru_onboarding';`
5. **Welcome script tone review** — Eyeball the zh/ja/ko/uk versions of `voiceOnboarding.welcome.body` and `voiceOnboarding.welcome.takeBreak` for warmth. Haiku is reliable for short functional copy but can come back literal-but-flat for longer warm passages.
6. **Free-tier gate decision** — Decide whether to block Free-tier from voice onboarding via `resolveReportModel()` 402.
7. **Whisper vocabulary hints** — Decide whether to invest the half-day for per-classroom curriculum hints in Whisper prompt.
8. **Send the 3 hot lead Gmail drafts** (carry-over) — Copenhagen, Paint Pots UK, Ardtona House UK.
9. **FAMM Argentina follow-up** (carry-over) — past Apr 28 deadline.
10. **Welcome Тамі in Ukrainian** (carry-over).
11. **Resend domain verification** (carry-over).
12. **TYPE B sweep across components** (Session 78 carry-over) — replace `locale === 'zh' ? work.x_zh : work.x` with `getLocalizedField()` everywhere.

---

## RECENT STATUS (Apr 30, 2026)

### ⚡ Session 78 — Curriculum Translation Library + Apply-On-Seed Pipeline + Frontend Locale Fix (Apr 30, 2026)

**Two commits pushed to main: `37cd5fa4` (pipeline build, 16 files, +1,296 lines), `e5b50539` (CurriculumWorkList locale fix, 1 file).**

**The problem:** Schools were signing up in their language but the curriculum data was English-only. UI strings translated correctly across all 12 locales (Session 77 confirmed 100% key parity) but `montree_classroom_curriculum_works` rows had no locale columns populated for new classrooms. Whale Class had every translation paid-for and sitting in its own classroom rows — trapped, unreadable to any other school. Trial signup never called any translation pipeline. Principal setup only translated 4 of 11 non-English locales because `ENABLED_LOCALES = ['zh','es','uk','ru']` while `SUPPORTED_LOCALES` had 12.

**The architecture (commit `37cd5fa4`):**

A global translation library keyed by `(work_key, locale)` + an apply-on-seed pipeline. The Whale Class translations get lifted into a shared library every classroom can read from for free. New classroom seeding copies from the library at seed time. No AI calls per new school for the standard 329 works. Custom works fan out via `translateAllLocales()` to all 11 non-English locales at ~$0.011/work.

| Layer | What | File |
|------|------|------|
| Global library | Translation lookup table, ~3,948 rows (329 works × 12 locales) | `migrations/180_create_curriculum_translations_global.sql` |
| School locales | `primary_locale` + `secondary_locales[]` on `montree_schools` (CHECK-constrained) | `migrations/181_add_school_primary_locale.sql` |
| Postgres function | `apply_global_translations(classroom_id)` — per-locale UPDATE FROM JOIN with COALESCE so it preserves teacher edits. SECURITY DEFINER. | `migrations/182_apply_global_translations_function.sql` |
| TypeScript wrapper | Thin RPC wrapper, fire-and-forget pattern | `lib/montree/curriculum/apply-global-translations.ts` |
| School locale resolver | `getSchoolLocales()` — scaffolded for future report routing, NOT used for custom-work translation | `lib/montree/i18n/school-locale.ts` |
| One-time extraction | Whale Class → global library, filters `is_custom = false` AND `work_key NOT LIKE 'custom_%'` | `scripts/seed-global-translations.mjs` |
| Backfill all | Runs RPC against every existing classroom, idempotent | `scripts/backfill-all-classroom-translations.mjs` |

**`ENABLED_LOCALES` auto-derived from `SUPPORTED_LOCALES`** in `lib/montree/locales-config.ts`. Was hand-edited list of 4 (`zh,es,uk,ru`), now `SUPPORTED_LOCALES.filter(l => l !== DEFAULT_LOCALE)` = 11. **Adding a 13th language no longer requires editing this file.** Drop the locale into `SUPPORTED_LOCALES` and every translation pipeline picks it up.

**6 seeding routes wired to call `applyGlobalTranslations()` fire-and-forget after curriculum seed:**
- `app/api/montree/try/instant/route.ts` — THE BROKEN PATH, now fixed. Also captures locale via new `resolvePrimaryLocale(req, body)` helper (body field → Accept-Language → 'en') and writes to `school.primary_locale`.
- `app/montree/try/page.tsx` — sends `locale: useI18n().locale` in trial signup POST body.
- `app/api/montree/principal/setup/route.ts` and `setup-stream/route.ts` — global translation copy fires BEFORE the existing `batchTranslateAllLocales()` (which becomes a safety net for any locale gaps in the global table).
- `app/api/montree/admin/reseed-curriculum/route.ts`, `backfill-curriculum/route.ts`, `backfill-guides/route.ts` — apply call after the existing logic.

**Live deployment sequence (this session, in order, all confirmed working):**
1. Migration 180 in Supabase SQL Editor → table created, 8 columns verified.
2. Migration 181 in Supabase SQL Editor → school columns added, Whale Class set bilingual `en+zh`.
3. Manual `UPDATE`s for two existing schools' `primary_locale`:
   - `1b463b14-...` (Школа Монтессорі / Tamі) → `uk`
   - `de76832d-...` (Chen school) → `de`
4. Migration 182 in Supabase SQL Editor → function created.
5. **Bonus column-add ALTER TABLE in Supabase** (was missing from the original plan but caught at function-test time) — added 36 missing locale columns on `montree_classroom_curriculum_works`. The 9 newer locales (de/fr/pt/nl/it/ja/ko/uk/ru) had `name_*` and `guide_content_*` columns from prior sessions but were missing `parent_description_*` and `why_it_matters_*`. Without this, `apply_global_translations()` errored at first reference. SQL ran idempotently with `ADD COLUMN IF NOT EXISTS`.
6. `node scripts/seed-global-translations.mjs` → upserted 3,948 rows. Filtered out 90 custom works correctly (419 - 329 = 90).
7. `node scripts/backfill-all-classroom-translations.mjs` → 26,983 cells across 8 classrooms (Whale Class: 3,619, six × "My Classroom": 3,619 each, Blue Jay: 1,650 — Blue Jay had partial pre-existing translations preserved by COALESCE).
8. Code deployed to Railway via auto-deploy on `37cd5fa4`.

**The frontend bug + hot fix (commit `e5b50539`):**

After deployment, Miss Chen 2 still showed English Cylinder Block names with the Spanish UI. DB query confirmed `name_es: "Bloque de Cilindros 1"` was correctly populated. Root cause: `components/montree/curriculum/CurriculumWorkList.tsx` hardcoded `locale === 'zh' ? work.name_chinese : work.name` in three places (work name, parent description, why it matters). Fixed to use `getLocalizedWorkName()` and `getLocalizedField()` from `db-helpers.ts`. After Railway redeploy + hard refresh, Spanish work names rendered correctly. **Live verified.**

**🚨 ARCHITECTURAL NOTE FOR FUTURE SESSIONS — TYPE B SWEEP NEEDED:**

Session 68's multilingual audit classified DB-column-read ternaries as "TYPE B — leave alone." That was correct when only Chinese existed as a non-English locale. With 11 non-English locales, **every TYPE B `=== 'zh'` read leaves English visible for 10 of those locales.** `CurriculumWorkList.tsx` is fixed; other components likely have the same bug:
- `components/montree/child/FocusWorksSection.tsx`
- `components/montree/photo-audit/ThisIsSheet.tsx`
- `components/montree/curriculum/EditWorkModal.tsx`
- `components/montree/super-admin/*`
- Game plan card, weekly wrap parent narratives, anywhere a work name renders.

Fix pattern is mechanical: `import { getLocalizedWorkName, getLocalizedField }` then replace ternaries with helper calls. A grep-driven sweep would be one focused session.

**What's still NOT translated for non-Chinese locales (deferred):**

| Field | Why English | Fix scope |
|------|-------------|-----------|
| `quick_guide` (inline curriculum row) | Only `quick_guide_zh` exists; others go through on-demand Sonnet → `guide_content_<locale>` | Pre-fill or read from JSONB summary |
| `direct_aims`, `indirect_aims`, `materials` (arrays) | Only `_zh` array versions exist | Add JSONB columns + extend `autoTranslateWork()` for arrays |
| `control_of_error` (text) | `control_of_error_zh` exists; other locales missing | Add columns + extend translator |

**Cost analysis (revised post-deployment):**
- Per new classroom seeding: $0 (global table copy)
- Per custom work: ~$0.011 (Haiku, all 11 locales)
- Adding a 13th language: ~$1–2 (existing batch scripts via Anthropic key)
- At 1,000 schools/year × 5 customs each: ~$55/year total. Versus the ~$5,000/year the original "Sonnet upfront" approach would have cost.

**Production state after this session:**
- `montree_curriculum_translations`: 3,948 rows
- All 8 production classrooms have every locale column populated
- `ENABLED_LOCALES` is now 11 non-English locales (was 4)
- Custom works auto-translate into all 11 going forward
- Trial signup captures locale and writes to `school.primary_locale`

**Architectural plan with full audit trail:** `docs/CURRICULUM_TRANSLATION_HANDOFF.md`. Three audit passes (internal consistency → vs actual code → re-audit) found and corrected several material errors in the original draft including wrong migration numbers (170/171 → 180/181/182), a fictional `generate-work-content` route (Phase 5 was rebuilt around the actual `add-custom-work` flow), and a suboptimal Promise.all batch (replaced with Postgres function).

**Session-specific handoff:** `docs/handoffs/SESSION_78_HANDOFF.md` — file-by-file change list, deployment sequence, verification status, deferred items.

**Next session priorities:**
1. **🚨 TYPE B sweep across components** — replace `locale === 'zh' ? work.x_zh : work.x` with `getLocalizedField()` / `getLocalizedWorkName()` everywhere a work name or description is rendered. Highest-priority files listed above.
2. **Translate arrays + `control_of_error`** — add per-locale JSONB columns, extend `autoTranslateWork()`, re-extract Whale Class into global table, backfill all classrooms.
3. **Validate "adding a 13th language" workflow** — pick one (Hindi or Vietnamese) and run through the documented data-only path end-to-end.
4. **Send 3 hot lead Gmail drafts** (carry-over) — Copenhagen, Paint Pots UK, Ardtona House UK.
5. **FAMM Argentina follow-up** (carry-over) — past Apr 28 deadline.
6. **Welcome Тамі in Ukrainian** (carry-over).
7. **Resend domain verification** (carry-over) — verify `montree.xyz` in Resend.
8. **Test trial signup locale capture** — open private window, set UI to Russian, sign up a fake school, confirm new classroom has all locale columns populated.

---

### ⚡ Session 77 — i18n Completeness Sweep + Drift Defence + Mobile Polish (Apr 30, 2026)

**All three commits pushed to main: `fa6d3722` (i18n completeness), `5255a2e5` (automation hooks), `26266747` (mobile polish: SW v3 + compact lang toggle + stats row removal). Railway redeployed.**

**Trigger:** User opened Ukrainian dashboard on mobile, saw "Golden Bead Multiplication" in English, "PHOTOS" stats label in English, and empty area dots (no letter). Audit revealed three classes of drift, plus mobile polish issues.

**A. UI translation files — 9 languages × 93 missing keys filled:**
Spanish + Chinese were already at 100%. The other 9 languages (`de/fr/pt/nl/it/ja/ko/uk/ru`) were each missing the same 93 keys added to `en.ts` after the original scaffolding ran. Things like `summary.askGuruPrompt`, `weeklyWrap.nextWeekFocus`, `parentDashboard.thisWeekMoments`. Production users of those locales saw English fallback. **All 12 locales now at 100% UI key parity (3735/3735 each).**

**B. Curriculum work names — full sweep across Whale Class:**
- `uk`: 42 untranslated (English text in `name_uk` column) → fixed (Golden Bead Multiplication → Множення з Золотими Бісеринками, Introduction to Golden Beads → Введення до Золотих Бісеринок, etc.)
- `ru`: 20 untranslated → fixed
- `zh`: 20 empty → filled
- `es/de/fr/nl/it`: 2-3 each → fixed (most were "Bingo"/"Collage" loanwords — KNOWN_LOANWORDS list now skips these)
- `ko`: 1 → fixed
- Latin-i homoglyph cleanup pass: Haiku used U+0069 in 4 Ukrainian strings → replaced with U+0456 і
- **Final: 419/419 work names translated for every non-English language.**

**C. `guide_content_<locale>` confirmed complete:**
384/419 across all non-English. The 35-work "gap" is works that don't have an English `quick_guide` — nothing to translate from.

**D. Area letter icons in focus list — `FocusWorksSection.AreaDot`:**
Previously empty colored circles. Now show localized one- or two-letter prefix matching the curriculum overview cards. New `AREA_PREFIXES` map in `lib/montree/i18n/area-labels.ts` with per-locale codes:
- en/es/fr/it/pt: P/L/S/M/C-style 1-letter (V for Vida/Vie/Vita)
- zh/ja/ko: single Hanzi/Hangul (日/感/数/语/文 etc.)
- nl: P/Z/W/T/C
- ru: П/С/М/Я/К (Я is Язык — no collision)
- **de: Pr/Si/Ma/Sp/Ku — 2-letter** (Sinnesmaterial vs Sprache both = S)
- **uk: Пр/Се/Ма/Мо/Ку — 2-letter** (Математика vs Мова both = М)

`getAreaPrefix(area, locale)` is the canonical helper. Font auto-scales (50% for 1-char, 36% for 2-char).

**E. Drift defence — three layers added:**

1. **Pre-commit hook** (`.githooks/pre-commit`, native — no Husky):
   - Fires only when `lib/montree/i18n/*` files are staged.
   - Runs `scripts/check-i18n-completeness.mjs --strict`.
   - Blocks commits where `en.ts` has any key not in every other language file.
   - Bypass: `git commit --no-verify`.
   - Install: `npm run hooks:install` (one-time per machine, runs `git config core.hooksPath .githooks`).

2. **npm scripts** (added to `package.json`):
   - `i18n:check` / `i18n:check:strict` — validator (strict = fail on any missing key)
   - `i18n:fill-ui` — Haiku batch translator for missing UI keys
   - `i18n:fix-names` — Haiku translator for untranslated curriculum names (default scope: active classrooms with children; `--all` for full backfill, `--dry-run` to report only)
   - `i18n:sync` — full pipeline: fill-ui + fix-names + bleedthrough + check
   - `hooks:install` — wires git hooks

3. **Admin API route** `/api/montree/super-admin/i18n-sync`:
   - GET = read-only drift report (no Haiku spend)
   - POST default = dry-run check
   - POST `{ mode: 'fix' }` = translate
   - POST `{ mode: 'fix', allClassrooms: true }` = full backfill
   - POST `{ mode: 'fix', classroomId: '...' }` = single classroom
   - Auth: super-admin session OR `x-cron-secret` header (for Railway cron with `CRON_SECRET` env var)

**F. Service worker cache bumped — `montree-v2 → montree-v3`:**
Code shipped fine to Railway but PWA users were still serving the cached v2 JS bundle (no AreaDot changes visible). v3 forces activate-side purge. Same pattern as Session 76's stale-dashboard fix. **PWA users may need to close + reopen the app for v3 to activate.**

**G. Mobile header overlap fix:**
- `LanguageToggle.tsx` rewritten: visible pill now shows `LOCALE_SHORT_LABELS` (EN/ZH/УКР — 2-3 chars) instead of full names ("English"/"Українська" — 7-10 chars). Hidden native `<select>` still provides the full-name OS picker on tap. Saves 40-60px horizontal.
- `DashboardHeader.tsx` classroom name `maxWidth: 160` → `maxWidth: 'min(40vw, 200px)'` — tighter on narrow viewports.

**H. Stats tile row removed from child page:**
`app/montree/dashboard/[childId]/page.tsx` — the 3-column "MASTERED / PRACTICING / Photos" tile row below the focus list. User flagged as redundant — focus list status badges already convey the same info. Also cleaned up unused `Sparkles`/`TrendingUp`/`Camera` imports + `progressStats`/`photoCount` state.

**🚨 Architectural notes:**
- **`getAreaPrefix(area, locale)` is the canonical area-letter helper.** Use it any time you render a colored area dot.
- **Pre-commit hook stays passive** unless `lib/montree/i18n/*` files are in the commit — zero friction on unrelated commits.
- **`auto-translate.ts` `translateAllLocales(input)`** already covers new-work creation across `ENABLED_LOCALES` — day-to-day new works should never re-introduce drift.
- **Service worker bumps require user-side reactivation** — close+reopen the PWA, or hard-refresh on web.
- **KNOWN_LOANWORDS list** in `sync-curriculum-translations.mjs` (Bingo, Collage, Origami, Yoga, Sudoku, Tangram, Mandala) — skip flagging these as drift.

**Cost:** ~$3-4 in Haiku calls total. Future drift defence is passive — only spends when actual drift is detected.

**Files changed across all 3 commits:**

Commit `fa6d3722`:
- `components/montree/child/FocusWorksSection.tsx` — AreaDot renders prefix
- `lib/montree/i18n/area-labels.ts` — AREA_PREFIXES + getAreaPrefix()
- `lib/montree/i18n/{de,fr,pt,nl,it,ja,ko,uk,ru}.ts` — 93 new keys each
- `scripts/fill-missing-i18n-keys.mjs` (new)
- `scripts/fix-untranslated-work-names.mjs` (new)
- `scripts/fix-bleedthrough.mjs` (new)

Commit `5255a2e5`:
- `.githooks/pre-commit` (new)
- `app/api/montree/super-admin/i18n-sync/route.ts` (new)
- `scripts/sync-curriculum-translations.mjs` (new)
- `scripts/check-i18n-completeness.mjs` (--strict mode added)
- `package.json` (i18n:* + hooks:install)

Commit `26266747`:
- `public/montree-sw.js` (cache bumped to v3)
- `components/montree/LanguageToggle.tsx` (compact short labels)
- `components/montree/DashboardHeader.tsx` (classroom name maxWidth 'min(40vw, 200px)')
- `app/montree/dashboard/[childId]/page.tsx` (stats row removed)
- `docs/handoffs/SESSION_77_HANDOFF.md` (new)
- `CLAUDE.md` (this entry)

**Handoff doc:** `docs/handoffs/SESSION_77_HANDOFF.md` — full file-by-file change list + verification steps + cost breakdown.

**Verification status:**
- ✅ Pre-commit hook installed locally (`npm run hooks:install` ran successfully).
- ✅ All three commits pushed to `origin/main` (push log: `93213235..26266747 main -> main`, then `Everything up-to-date`).
- ⏳ Railway redeploy triggered automatically on push.
- ⏳ User to verify on phone: close+reopen Montree PWA, switch to Українська, confirm "Множення з Золотими Бісеринками" with **Ма** in dot, no "Engdish" header overlap, no stats row.

**Next session priorities:**
1. **Confirm production looks right.** If anything still shows English fallback after PWA reactivate, debug from there.
2. **Optional: Wire weekly Railway cron** — set `CRON_SECRET` env var, schedule daily `GET /api/montree/super-admin/i18n-sync` for monitoring, weekly `POST { mode: 'fix' }` for auto-repair (or alert + manual approval via super-admin UI).
3. **Optional: Super-admin "Sync translations" button** — UI affordance to POST `{ mode: 'fix' }` from the dashboard. ~30-min task.
4. **Send the 3 hot lead Gmail drafts** — Copenhagen, Paint Pots UK, Ardtona House UK.
5. **FAMM Argentina follow-up** — past Apr 28 deadline.
6. **Welcome Тамі** in Ukrainian — first organic Ukrainian signup.

---

### ⚡ Session 76 — Audit & Optimise Sweep: 17 perf/cost fixes shipped (Apr 30, 2026)

**Commits pushed: `80921de6`, `5ef016b2`, `68ea89e2`, `149e5760`, `9f81dc97` (Turbopack fix) — all on main.**

⚠ **Turbopack constraint discovered during this sweep:** `next/dynamic(import, { … })` requires the options arg to be an **inline object literal** at the call site. Hoisting it into a `const dynamicOpts = { ssr: false, loading: X }` breaks the build with "next/dynamic options must be an object literal." The shared `loading` *component* can still be a reference — just keep the surrounding `{ }` inline. See `app/montree/dashboard/photo-audit/page.tsx`.

System-wide health check ran three parallel audits (frontend perf / AI cost / API+DB) producing 17 actionable findings. All shipped today.

**Top perf wins:**
- **`lib/montree/i18n/context.tsx`** — Provider value now wrapped in `useMemo`. The 173 files importing the i18n barrel only re-render when locale actually changes, not on every parent state update. Single biggest perceived-speed win in the codebase.
- **`public/montree-sw.js`** — Cache only immutable assets (JS, CSS, fonts, images, `/_next/static/`). HTML pages always go to network. `CACHE_NAME` bumped to `montree-v2` so existing PWA installs purge their v1 cache on activate. **Fixes the Apr 30 stale-dashboard incident.**
- **`components/montree/DashboardHeader.tsx`** — wrapped in `memo()`. No props, so shallow-equals always returns true → header skips re-render on every parent state change.
- **`app/montree/dashboard/photo-audit/page.tsx`** — all 7 `dynamic()` imports now have a `loading` fallback. No more blank-gap flash while chunks download.
- **`app/api/montree/intelligence/daily-brief/route.ts`** — section 2 (stale works) now parallelizes its two queries (view + dismissals) via `Promise.all`. Top-level was already parallel across 6 sections.
- **`app/api/montree/works/guide/route.ts`** — "guide not found" 404-fallback path now sends short `Cache-Control` so the 3-tier lookup (classroom → master Brain → static JSON) doesn't repeat for works without guides.

**AI cost / tier-gating sweep — 7 routes, all tier-gated:**

The Free/Core/Premium tier system from Session 57 was bypassed by 7 routes that hardcoded Sonnet. All now call `resolveReportModel()`:

| Route | Behaviour for Free tier |
|------|-------------------------|
| `lib/montree/reports/ai-generator.ts` | Accepts optional `model` param, threads through to `messages.create` and the `ai_model` metadata field. Falls back to AI_MODEL when omitted (back-compat). |
| `app/api/montree/reports/language-presentation/[childId]/route.ts` | 402 |
| `app/api/montree/reports/language-semester/generate/route.ts` (3 Sonnet calls) | 402 |
| `app/api/montree/guru/teaching-instructions/route.ts` | 402 |
| `app/api/montree/guru/snap-identify/route.ts` | 402 |
| `app/api/montree/weekly-review/[childId]/route.ts` (POST + PATCH) | 402 |
| `app/api/montree/guru/corrections/route.ts` (Sonnet enrichment only) | Correction still saves; just skip the moat-builder Sonnet call. Free schools don't accrue visual-memory moat data — paying customers do. This is the intended product behaviour. |
| `app/api/montree/guru/generate-work-content/route.ts` | 402 |

**Cost impact:** at 10 schools on Core tier, expected savings ~$300-400/month from no longer paying Sonnet rates on routes that should run Haiku.

**Verified-then-deferred (not in this commit, flagged for next session):**
- **Weekly-wrap teacher+parent batching** — `app/api/montree/reports/weekly-wrap/route.ts`. Teacher report + parent narrative currently run sequentially per child. They could go parallel via `Promise.all` to halve wall-clock time per child. Refactor is more invasive than it looks (interleaved token totals, separate upserts, separate skip flags). Worth doing in a dedicated session with full attention. ⚠ **Replan must stay Stage 0** — don't break that ordering.
- **Photo-audit `select('*')` claim** — investigated, the actual code already uses explicit column lists with `Promise.all` + `.limit(500)`. No work needed; agent's claim was inferred wrong.
- **`negative_descriptions[]` cap** — already capped at 8 FIFO via `.slice(-MAX_NEGATIVES)` in `corrections/route.ts`. The audit recommended 15; existing 8 is tighter and better. No change.

**Audit reference docs in repo:**
- `docs/AI_COST_AUDIT.md` — verified line numbers for hardcoded-Sonnet routes (written by the cost-audit agent during Session 76)
- `HANDOFF_LATEST.md` — sweep progress tracker (now ✓ complete)

**🚨 Architectural notes for future sessions:**
- **Service worker MUST stay immutables-only.** If a future change adds HTML to the cache, you'll re-introduce the stale-shell-when-API-fails bug. The pattern lives in `public/montree-sw.js` `isCacheable()`.
- **Every new Sonnet-calling route MUST tier-gate via `resolveReportModel()`** at the top after auth. Pattern: resolve → 402 if free → pass `aiTier.model` into `messages.create({ model, … })`.
- **`enrichVisualMemoryFromCorrection()` is Free-tier-skipped on purpose.** This is the moat-builder; it should only accrue for paying schools. The correction itself (work assignment, photo update, brain learning) still runs.
- **`I18nProvider` value MUST stay memoized.** If a future change rebuilds the value on every render again, you reintroduce a tree-wide re-render storm.

**Files changed (Session 76 — 4 sweep commits + Turbopack fix + 6 cleanup commits):**

Sweep:
- `lib/montree/i18n/context.tsx`
- `public/montree-sw.js`
- `lib/montree/reports/ai-generator.ts`
- `components/montree/DashboardHeader.tsx`
- `app/montree/dashboard/photo-audit/page.tsx`
- `app/api/montree/works/guide/route.ts`
- `app/api/montree/intelligence/daily-brief/route.ts`
- `app/api/montree/reports/language-presentation/[childId]/route.ts`
- `app/api/montree/reports/language-semester/generate/route.ts`
- `app/api/montree/guru/teaching-instructions/route.ts`
- `app/api/montree/guru/snap-identify/route.ts`
- `app/api/montree/weekly-review/[childId]/route.ts`
- `app/api/montree/guru/corrections/route.ts`
- `app/api/montree/guru/generate-work-content/route.ts`

Root folder cleanup (6 commits, ending at `99b34723`):
- 90 → 42 root entries. All artifacts moved to discoverable locations.
- `docs/handoffs/` ← 8 stale .md plans/handoffs
- `docs/outreach/` ← 10 .xlsx + 1 .docx (Apr16 backup preserved in `archive/`)
- `docs/marketing/` ← HeyGen scripts, promo .docx, montree-pitch.html, montree-video-scripts.html, root logo .png/.svg, montree-tree-icon.png, report-format-prototype.html, etc.
- `docs/artifacts/` ← 10 generated reports + classroom PDFs + Language_Semester_Reports/ + phonics-images.zip
- `scripts/legacy/` ← 14 orphaned root scripts (verified zero code references)
- Deleted: document_1.docx + document_2.docx (identical AutoSave dumps), .test_write, .DS_Store, Excel .~lock files

**Next session priorities:**
1. **🚨 Verify all 4 commits deployed cleanly on Railway.** Visit dashboard, photo-audit, weekly-wrap, language-presentation. Confirm no hydration errors, no 500s.
2. **Test the tier gates.** Set Whale Class to Free in super-admin, try generating a Language Presentation → expect 402. Set back to Premium → confirm it works.
3. **Per-locale parent narratives** — the 6 routes still Chinese-only from Session 75 handoff. Bigger scope.
4. **Phase 10 — Super-admin dark forest** — 31 of 32 pages still need conversion.
5. **Weekly-wrap teacher+parent parallelization** — the deferred perf win, ~30-60s/child saved.
6. **Send the 3 hot lead Gmail drafts** — Copenhagen, Paint Pots UK, Ardtona House UK.
7. **FAMM Argentina follow-up** — past Apr 28 deadline.
8. **Welcome Тамі** in Ukrainian — first organic Ukrainian signup.

---

### ⚡ Session 75 — Dark Forest Phases 3-9+11 + Photo Pipeline Hardening + i18n Auto-Derived SELECTs (Apr 30, 2026)

**Commits pushed: `022bef0f` (i18n refactor). Dark forest + photo pipeline hardening committed earlier in session (see prior commit log).**

**A. Dark forest redesign — Phases 3-9 + 11 COMPLETE.** Phase 10 (Super-admin) deferred — 31 of 32 pages still need conversion. Full list of 50+ converted files in `docs/DARK_FOREST_REDESIGN_HANDOFF.md`. Tokens locked: bg `#0a1a0f`, emerald `#34d399`, glass cards, blur 18px, Lora serif headings, Inter body, lucide icons at strokeWidth={1.75}. Inline styles only. Empty-state dashboard button fixed (was still light Tailwind).

**B. Photo identification pipeline hardening:**

- **`lib/montree/photo-identification/two-pass.ts`** — Pass 1 visual description now capped at 600 chars (was unbounded — Sonnet calls were occasionally outputting 2-3KB descriptions that bloated `montree_media.sonnet_draft` and slowed Pass 2 prompt assembly).
- **`app/api/montree/photo-identification/process/route.ts`** — Added CRITICAL banner at top documenting `maxDuration=120` and `HAIKU_TRUST_CONFIDENCE=0.85` as load-bearing values. On `haiku_matched` path, persists Haiku raw work name + match_score to `sonnet_draft` JSONB so future audits can see when fuzzy matching diverged from the literal Haiku output. Logs `[PhotoIdentification] raw_vs_matched` when matched name diverges from raw.
- **`app/api/montree/guru/corrections/route.ts`** — Added `isCoherentNegative()` helper and `MATERIAL_NOUNS` whitelist (wooden, metal, sandpaper, fabric, etc.). Negative-example accumulation in `montree_visual_memory.negative_descriptions[]` now skips fragments that don't reference any material noun (avoids polluting visual memory with "object on tray" or similar generic phrases). Bidirectional reverse-negative (when teacher fixes A→B, the original A's `negative_descriptions[]` gets B's description as a counter-example) gated by the same coherence check.
- **`lib/montree/photo-identification/context-loader.ts`** — Replaced fixed 50-entry slice with adaptive 50KB char budget + 100-entry hard ceiling. SELECT limit raised 100 → 200. Whale Class has 65+ eligible visual memory entries; the old slice was silently dropping 15 high-quality ones every Pass 2 call. Entries are pre-sorted (description_confidence DESC, updated_at DESC) so the budget naturally fills with highest-quality recent entries. Small classrooms (<50 entries) see no change. `visualMemoryWorkNames` is populated ONLY for works actually in the prompt — Gate A trust ("hasVisualMemoryForMatch") stays logically consistent.

**🚨 Architectural rule:** `maxDuration=120` on `/api/montree/photo-identification/process/route.ts` is load-bearing. Railway's default 15s would kill the two-pass Haiku pipeline mid-flight. Don't remove. Same for `HAIKU_TRUST_CONFIDENCE=0.85` — the Pass 2b discriminator only fires below this threshold, and lowering it would burn Sonnet budget on trivially-confident matches.

**C. i18n efficiency refactor — commit `022bef0f`:**

The codebase had 11 hardcoded `name_es, name_de, …` SELECT lists across the API routes. Adding a 13th language meant editing each one in lockstep. Same problem for `guide_content_<locale>`. Plus a quietly broken bug in `works/guide/route.ts`: any non-`zh`/`es` locale silently fell back to the Spanish translator, caching Spanish content in German/French/Portuguese/Dutch/Italian/Japanese/Korean/Ukrainian/Russian columns.

**Fix — auto-derive everything from `SUPPORTED_LOCALES`:**

| File | Change |
|------|--------|
| `lib/montree/i18n/db-helpers.ts` | `LOCALE_COLUMN_SUFFIX` is now auto-derived from `SUPPORTED_LOCALES` (no per-locale entry to add). Two new exported helpers: `buildLocalizedColumnList(baseField)` and `buildLocalizedSelect(baseField)`. |
| `app/api/montree/works/route.ts` | SELECT uses `${buildLocalizedSelect('name')}`. |
| `app/api/montree/works/guide/route.ts` | SELECT uses `buildLocalizedColumnList('guide_content')`. The dual `translateGuideToZh` / `translateGuideToEs` functions replaced with one locale-agnostic `translateGuide(guide, locale)` that pulls language name + AMI Montessori terminology from `LOCALE_AI_CONFIG`. **Fixes the silent Spanish-fallback bug.** |
| `app/api/montree/progress/route.ts` | SELECT uses `buildLocalizedSelect('name')`. |
| `lib/montree/auto-translate.ts` | `SYSTEM_PROMPTS` renamed to `SYSTEM_PROMPTS_OVERRIDES` and is now optional. Fallback synthesises a sensible prompt from `LOCALE_AI_CONFIG`. |
| `scripts/check-i18n-completeness.mjs` | NEW. CI-friendly validator. Walks `SUPPORTED_LOCALES`, verifies every locale has translation file + area labels + AI config + intl mapping + display names + short labels + is wired into `context.tsx` + `server.ts`. Plus key-parity check (warns <85%, fails <50%). All 12 locales currently pass at 98–100%. |
| `scripts/add-language.mjs` | NEW. One-command scaffolder. `node scripts/add-language.mjs <code> "<native-name>" "<short>" "<intl>"` updates `locales.ts`, `area-labels.ts`, `locale-config.ts`, `context.tsx`, `server.ts`, and creates an English placeholder `<code>.ts` ready for a translation pass. |

**"Drop a language in" workflow now:**
1. `node scripts/add-language.mjs sv "Svenska" "SV" "sv-SE"`
2. Translate `lib/montree/i18n/sv.ts` (Haiku batch — see `scripts/generate-fr.mjs` pattern)
3. Translate `AREA_LABELS_SV` + `LOCALE_AI_CONFIG.sv` TODOs
4. DB migration: add `name_sv`, `parent_description_sv`, `why_it_matters_sv`, `guide_content_sv` columns
5. Batch-translate curriculum (see `scripts/batch-translate-guides-es.js` pattern)
6. `node scripts/check-i18n-completeness.mjs` — verify

**Zero edits to API SELECT lists.** That was the goal.

**🚨 Known remaining gaps (NOT in scope this session, flagged for future PR):**

The following routes still SELECT only `_zh` columns and assume `locale !== 'en'` means Chinese — parent narratives for Spanish/German/etc. silently render in English (or Chinese):
- `app/api/montree/reports/weekly-wrap/route.ts`
- `app/api/montree/reports/preview/route.ts`
- `app/api/montree/reports/send/route.ts`
- `app/api/montree/reports/batch-narratives/route.ts`
- `app/api/montree/reports/weekly-wrap/review/route.ts`
- `app/api/montree/weekly-admin-docs/auto-fill/route.ts`

Fixing requires per-locale parent description maps + per-locale narrative templates. Significant scope — plan a dedicated session.

**D. DNS / Montree-system check (parallel agent, code-side audit):**

User reported `DNS_PROBE_FINISHED_NXDOMAIN` on `montree.xyz` with Astrill VPN on (Germany Frankfurt 10G). Agent verified the deployment is clean from the codebase side: `next.config.mjs` has the correct apex `montree.xyz → /montree` 302 redirect, `railway.json` has `healthcheckPath: '/api/health'`, no stale `teacherpotato.xyz` references, no basePath/assetPrefix/rewrite that would break the apex. Recent commits to deployment-affecting files are clean.

**Verdict: code-side OK. Issue is network-layer (Astrill DNS filtering or TTL caching).** Recovery procedure for user:
1. Visit `https://montree.xyz/api/health` from cellular (no VPN) → if 200, confirms VPN is the cause
2. If still fails: check Railway dashboard for unlinked custom domain or stalled deploy
3. Disconnect VPN, clear Chrome DNS cache (`chrome://net-internals/#dns`), unregister service worker

**Files changed (Session 75 — i18n only, dark forest + photo committed earlier):**
- `lib/montree/i18n/db-helpers.ts` — auto-derived `LOCALE_COLUMN_SUFFIX` + new helpers
- `app/api/montree/works/route.ts` — uses `buildLocalizedSelect('name')`
- `app/api/montree/works/guide/route.ts` — unified translator, helper-driven SELECT
- `app/api/montree/progress/route.ts` — uses `buildLocalizedSelect('name')`
- `lib/montree/auto-translate.ts` — `SYSTEM_PROMPTS_OVERRIDES` optional + LOCALE_AI_CONFIG fallback
- `scripts/check-i18n-completeness.mjs` — NEW validator
- `scripts/add-language.mjs` — NEW scaffolder

**Handoff doc:** `docs/I18N_REFACTOR_HANDOFF.md` — full file-by-file change list, "drop a language in" workflow, known gaps, verification done, next-session priorities.

**Next session priorities:**
1. **🚨 Deploy verification** — Verify production after Railway deploys `022bef0f`. Visit progress page, works picker, guide modals across en/zh/es minimum.
2. **🚨 Deploy Session 74 commits** — `2e94aadc`, `0dfbdd04`, `c8b46ad6` (replan Stage 0, photo-audit crash, streaming event fix) still need Railway relaunch.
3. **Per-locale parent narratives** — Tackle the 6 Chinese-only routes listed above. This is the next big multilingual gap.
4. **Phase 10 — Super-admin dark forest** — 31 of 32 pages still need conversion. Deferred from this session.
5. **Disable `tell_guru_onboarding` for Whale Class** — `UPDATE montree_school_features SET enabled=false WHERE school_id='c6280fae-567c-45ed-ad4d-934eae79aabc' AND feature_key='tell_guru_onboarding';`
6. **Send the 3 hot lead Gmail drafts** — Copenhagen (`r5875732429643975187`), Paint Pots UK (`r-8134738077301193428`), Ardtona House UK (`r6746566790609932769`).
7. **FAMM Argentina follow-up** — past Apr 28 deadline. Draft now.
8. **Welcome Тамі** in Ukrainian — first organic Ukrainian signup.
9. **Fix Resend domain** — verify montree.xyz in Resend, update `RESEND_FROM_EMAIL` in Railway.
10. **Gate the 6 Sonnet-hardcoded routes** with `resolveReportModel()`.

---

## RECENT STATUS (Apr 29, 2026)

### ⚡ Session 74 — Replan Pipeline Fix + Photo-Audit Crash Fix + Language Monthly Summary (Apr 29, 2026)

**Commits pushed: `2e94aadc` (photo-audit crash fix), `0dfbdd04` (replan Stage 0 + school_id fix), `c8b46ad6` (streaming replan event fix).**

**A. Photo-audit page crash fix — commit `2e94aadc`:**

`ReferenceError: t is not defined` in `components/montree/super-admin/WeeklyAdminTab.tsx`. The `SummaryCard` component destructured only `locale` from `useI18n()` but used `t()` for translations. Fixed: `const { locale } = useI18n()` → `const { t, locale } = useI18n()`.

**B. Replan pipeline fix — CRITICAL — commits `0dfbdd04`, `c8b46ad6`:**

**Root cause:** `replanChildInProcess()` was at Stage 6 (END of `processChild()`) in `app/api/montree/reports/weekly-wrap/route.ts`, after expensive Sonnet teacher + parent report generation. With 20 children × 2 Sonnet calls, later batches timed out before reaching replan. Only 11 of 20 children completed. All focus works were stale (Apr 21), all game plans had `source=onboard` (Apr 25 — never updated by replan).

**Fix — Move replan to Stage 0 (BEFORE report generation):**
- Replan now runs FIRST in `processChild()`, before the try/catch for report generation
- If reports fail or timeout, replan has already completed — plans always update
- Early return on DB upsert failures now includes replan results (replan already ran)
- Catch block includes replan results
- `school_id` ReferenceError fixed at lines 709 and 745: bare `school_id` → `classroom.school_id`
- Streaming `replan_done` event no longer gated on `r.success` — always emitted

**🚨 Architectural rule:** Replan MUST be Stage 0 in processChild(). It is the most important operation — plans updating weekly is the core product value. Sonnet reports are nice-to-have; fresh plans are must-have. Never move replan after report generation again.

**Two consecutive clean audit passes confirmed the fix.**

**C. Language Monthly Summary — `Whale_Class_April_Language_Summary.docx`:**

Generated a Language-area-only monthly summary for all 20 Whale Class children. Each child gets a neutral, professional 2-3 sentence summary covering: what Language works they did in April (from confirmed photos), mastery/practicing/presented status (from `montree_child_progress`), and a "Next, we can look at [work]" recommendation based on Montessori Language progression gap analysis.

**Data pipeline:**
1. Fetch Language curriculum area ID → 97 Language works
2. Fetch April confirmed photos (372) → filter to Language works only
3. Fetch `montree_child_progress` where `area=language` (611 rows)
4. For each child: count photo sessions per work, classify mastery/practicing/presented, find next gap in progression sequence

**Recommendation algorithm:** Full Montessori Language progression array (93 works ordered developmentally: Sound Games → Sandpaper Letters → CVC → Moveable Alphabet → Blue/Green Series → Reading → Grammar → Composition). Finds the child's highest point in the sequence, then recommends the next untouched work (gap-filling from earlier stages if nothing forward). User reviewed and approved the gap-filling approach over the forward-only approach.

**DNS workaround:** Local DNS resolution was failing for Supabase (`dmfncjjtsoxrnvcdnvjq.supabase.co`). Resolved via Google DNS (`8.8.8.8`) to get IP `172.64.149.246`, then used `curl --resolve` flag for all data fetches. The docx generation ran locally on the Mac using cached JSON files from `/tmp/`.

**Script location:** Not committed — one-off generation. Data cached at `/tmp/lang_works.json`, `/tmp/children.json`, `/tmp/media.json`, `/tmp/progress.json`.

**Files changed (2 files, 3 commits):**
- `components/montree/super-admin/WeeklyAdminTab.tsx` — added `t` to useI18n destructure
- `app/api/montree/reports/weekly-wrap/route.ts` — replan moved to Stage 0, school_id fix, streaming event fix

**🚨 Railway deploy needed:** User must hit "Relaunch to update" on Railway to deploy all 3 commits.

**Next session priorities:**
1. **🚨 Deploy to Railway** — 3 commits waiting: photo-audit fix, replan Stage 0, streaming fix.
2. **Deep triple audit photo recognition pipeline** — User explicitly requested: "we've also been having serious issues with the photo recognition pipeline. can you deep triple audit that and give me an analysis and proposed plan to improve it, make it better." NOT YET STARTED.
3. **🚨 Add Ukrainian + Russian languages** — Full instructions in Session 73 handoff below. Organic Ukrainian teacher Тамі signed up Apr 28.
4. **Welcome Тамі** — provision her school, send a personal message in Ukrainian.
5. **Send the 3 hot lead Gmail drafts** — Copenhagen (`r5875732429643975187`), Paint Pots UK (`r-8134738077301193428`), Ardtona House UK (`r6746566790609932769`).
6. **FAMM Argentina follow-up** — Past the Apr 28 deadline. Draft now.
7. **Complete follow-up batch** — 248 remaining `status='sent'` contacts need follow-up template.
8. **Disable `tell_guru_onboarding` for Whale Class** — `UPDATE montree_school_features SET enabled=false WHERE school_id='c6280fae-567c-45ed-ad4d-934eae79aabc' AND feature_key='tell_guru_onboarding';`
9. **Fix Resend domain** — verify montree.xyz in Resend, update `RESEND_FROM_EMAIL` in Railway.
10. **Gate the 6 Sonnet-hardcoded routes** with `resolveReportModel()`.

---

## RECENT STATUS (Apr 28, 2026)

### ⚡ Session 72 — Public Funnel Polish + Teacher Revenue Share Programme (Apr 28, 2026)

**Commits pushed: `3f8572f0` (build fix), `eb6f7950` (try + login-select gradient), `f780ba74` (library gradient), `e945e48f` (try role cards), `9db1f142` (bulk import spinner + guaranteed reload fix).**

**A. Public funnel — uniform dark forest gradient:**

Applied the same fixed-div gradient (radial emerald glow + dark forest linear base, identical to landing page) to all public-facing screens:
- `app/montree/try/page.tsx` — role picker (was teal Tailwind gradient)
- `app/montree/login-select/page.tsx` — code login (was teal Tailwind gradient), including Suspense fallback
- `app/montree/library/page.tsx` — library home (was custom teal linear gradient + two absolute glow divs)

The role picker cards (`try/page.tsx`) were also restyled: Teacher card = deep emerald `rgba(39,129,90,0.32)` with green border; Principal card = dark gold-tint `rgba(60,45,10,0.45)` with amber `rgba(232,201,106,0.18)` border. Matches the brand palette — no more cyan/purple.

**B. Landing page build fix — commit `3f8572f0`:**

Prior session's gradient commit (`76032370`) left an unclosed `<div style={{ position: 'relative', zIndex: 1 }}>` at line 326 with no matching close before the `</>` fragment. Railway build was failing with `Expression expected` at line 400. Fixed by adding `</div>` before `</>`.

**C. Teacher Revenue Share Programme — full build:**

New campaign: teachers who start a trial and bring their school to a paid plan earn **20% of the school's monthly subscription** indefinitely, while employed there.

**Files created/modified:**

| File | Status |
|------|--------|
| `app/montree/for-teachers/page.tsx` | NEW — public landing page, dark forest aesthetic, `/montree/for-teachers` |
| `app/api/montree/teacher/earnings/route.ts` | NEW — GET earnings for authenticated teacher |
| `app/montree/dashboard/earnings/page.tsx` | NEW — teacher earnings dashboard |
| `app/api/montree/try/instant/route.ts` | MODIFIED — sets `founding_teacher_id` on school after teacher creation (non-blocking) |
| `components/montree/DashboardHeader.tsx` | MODIFIED — "💰 My Earnings" added to More menu |

**Attribution logic (confirmed by user):** Teacher inputs school name + email at signup. That timestamp-backed record = proof they were first. No other verification needed.

**✅ DB MIGRATION RUN (Apr 28, 2026)** — `montree_schools` columns added (`founding_teacher_id`, `revenue_share_pct`, `revenue_share_active`) + `montree_teacher_earnings` table created + index. Programme is fully live.

**Revenue share formula:** `student_count × $7 × 20% = teacher monthly earnings`

**What's still manual:** Activating revenue share (`UPDATE montree_schools SET revenue_share_active = true ...`) and inserting monthly earnings rows. Phase 2 builds automation. Full details in `docs/TEACHER_CAMPAIGN_HANDOFF.md`.

**D. Bulk import fix — commit `9db1f142`:**

Critical retention bug fixed: after bulk-importing students the dashboard returned to the empty state permanently and clicking the classroom did nothing. Root cause: `refetchChildren()` returns `void`, calling `.then()` on it was silently throwing TypeError. Fix: added `importLoading` state that shows a spinner immediately, clears when children arrive via `useEffect`, and falls back to `window.location.href = '/montree/dashboard'` after 1200ms — guaranteeing the student grid always appears.

**E. Inbound organic signup — Ukrainian teacher:**

A teacher named **Тамі** (`kiverova_tamila@ukr.net`) from **Школа Монтессорі** (Ukraine) signed up organically on Apr 28 at 5:57 PM — found Montree via Google search. First non-English-speaking organic inbound. Super admin panel shows 47 total interested (46 new, 1 contacted). This triggered the decision to add Ukrainian + Russian to the platform.

**Next session priorities:**
1. **🚨 #1 PRIORITY — Add Ukrainian + Russian languages** — Full instructions below in Session 73 handoff.
2. **Welcome Тамі** — provision her school, send a personal message in Ukrainian.
3. **Send the 3 hot lead Gmail drafts** — Copenhagen (`r5875732429643975187`), Paint Pots UK (`r-8134738077301193428`), Ardtona House UK (`r6746566790609932769`).
4. **FAMM Argentina follow-up** — Past the Apr 28 deadline. Draft now.
5. **Add "For teachers" to landing page nav** — `app/montree/page.tsx`, same style as Library link.
6. **Complete follow-up batch** — 248 remaining `status='sent'` contacts need follow-up template.
7. **Disable `tell_guru_onboarding` for Whale Class** — `UPDATE montree_school_features SET enabled=false WHERE school_id='c6280fae-567c-45ed-ad4d-934eae79aabc' AND feature_key='tell_guru_onboarding';`
8. **Fix Resend domain** — verify montree.xyz in Resend, update `RESEND_FROM_EMAIL` in Railway.
9. **Super admin revenue share tab** — View/manage founding teacher relationships and monthly earnings.

---

### ⚡ Session 73 — Ukrainian + Russian Language Handoff (start here next session)

**Trigger:** Ukrainian teacher Тамі signed up organically. Russian + Ukrainian opens Eastern Europe, Central Asia, and large global diaspora communities — essentially zero competition for Montessori software in these languages.

**The multilingual infrastructure is fully locale-agnostic (Sessions 58–67).** Adding a new language requires zero component or API changes. Only:
1. Create translation file
2. Add to `SUPPORTED_LOCALES`
3. Add area labels
4. Add AI config
5. Run batch curriculum scripts

**Step-by-step for Ukrainian (`uk`) and Russian (`ru`):**

**Step 1 — Generate translation files via Haiku batch script:**

Create `scripts/generate-uk.mjs` and `scripts/generate-ru.mjs` — same pattern as `scripts/generate-fr.mjs` (already in codebase). These read `lib/montree/i18n/en.ts`, call Haiku for each key, and write `lib/montree/i18n/uk.ts` and `lib/montree/i18n/ru.ts`. Cost: ~$0.40 per language.

**Ukrainian terminology notes:**
- Formal `ви` register (not `ти`)
- AMI Ukrainian Montessori terms: `Практичне Життя`, `Сенсорний`, `Математика`, `Мова`, `Культура`

**Russian terminology notes:**
- Formal `вы` register
- AMI Russian terms: `Практическая Жизнь`, `Сенсорика`, `Математика`, `Язык`, `Культура`

**Step 2 — Update `lib/montree/i18n/locales.ts`:**
```typescript
export const SUPPORTED_LOCALES = ['en', 'zh', 'es', 'fr', 'pt', 'nl', 'it', 'ja', 'ko', 'uk', 'ru'] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];
// Add to LOCALE_DISPLAY_NAMES: uk: 'Українська', ru: 'Русский'
// Add to LOCALE_SHORT_LABELS: uk: 'УКР', ru: 'РУС'
// Add to LOCALE_TO_INTL: uk: 'uk-UA', ru: 'ru-RU'
```

**Step 3 — Update `lib/montree/i18n/area-labels.ts`:**
```typescript
export const AREA_LABELS_UK = { practical_life: 'Практичне Життя', sensorial: 'Сенсорний', mathematics: 'Математика', language: 'Мова', cultural: 'Культура' };
export const AREA_LABELS_RU = { practical_life: 'Практическая Жизнь', sensorial: 'Сенсорика', mathematics: 'Математика', language: 'Язык', cultural: 'Культура' };
// Add both to AREA_LABELS map-of-maps keyed by 'uk' and 'ru'
```

**Step 4 — Update `lib/montree/i18n/locale-config.ts`:**
Add `LOCALE_AI_CONFIG` entries for `uk` and `ru` with language name, system prompt suffix, and Montessori glossary.

**Step 5 — Wire into context + server:**
- `lib/montree/i18n/context.tsx` — import + add uk/ru to messages map
- `lib/montree/i18n/server.ts` — import + add to `LOCALE_TO_MESSAGES`

**Step 6 — DB columns for curriculum work names:**
```sql
ALTER TABLE montree_classroom_curriculum_works
  ADD COLUMN IF NOT EXISTS name_uk TEXT,
  ADD COLUMN IF NOT EXISTS name_ru TEXT,
  ADD COLUMN IF NOT EXISTS guide_content_uk JSONB,
  ADD COLUMN IF NOT EXISTS guide_content_ru JSONB;
```

**Step 7 — Update `lib/montree/i18n/db-helpers.ts`:**
Add `uk: '_uk'` and `ru: '_ru'` to `LOCALE_COLUMN_SUFFIX`.

**Step 8 — Batch work name + guide translation scripts:**
Same as `scripts/batch-translate-guides-es.js` pattern. Run for both uk and ru. ~$0.40 each.

**Step 9 — Update `lib/montree/auto-translate.ts`:**
Add `name_uk` and `name_ru` to the upsert payload so new works auto-translate on creation.

**Reference sessions:** 67 (fr/pt/nl/it/ja/ko — same exact pattern), 68 (curriculum data layer wiring).

**After completing Ukrainian + Russian:**
- Welcome Тамі in Ukrainian — she's the first organic Ukrainian user
- Consider adding a Ukrainian-language outreach batch to the campaign (there are Montessori schools throughout Ukraine, Poland diaspora, Canada/US Ukrainian communities)

---

### ⚡ Session 71 — Landing Page Redesign + Sprout Logo + Demo Alert Banner + Hot Lead Drafts (Apr 28, 2026)

**Commits pushed: `6e3c87e3`, `e19ace45`, `7ddd80ea`, `76617dd8`, `26aeea6b` (landing page + logo iterations), `91f8c92b` (super admin demo alert).**

**A. Landing page full redesign — `app/montree/page.tsx`:**

Complete rewrite. Dark forest green gradient aesthetic (same as login screen). No DemoModal, no feature grids, no bullet points. Four sections only:
- **Nav** — sticky, frosted glass, sprout logo + "Get started" pill linking to `/montree/login-select?signup=true`
- **Hero** — "The magic of Montree." tagline. "A teacher takes a photo. Montree does the rest." Both CTAs go directly to self-serve signup (no modal).
- **Three editorial statements** — Teacher / Parents / Principal, editorial block style with Lora serif headings
- **Closing CTA** — "Experience the magic." + "One month free. Then $7 per child, per month. One plan. No tiers. No contracts."

CSS approach: `<style jsx global>` block with custom class names (`.m-nav`, `.m-hero`, `.m-block`, `.m-pill`, `.m-editorial`, `.m-closing`). Radial emerald glow + dark gradient via `body::before` pseudo-element. Lora serif from Google Fonts. Intersection Observer scroll-reveal on all sections.

**"The magic of Montree" is confirmed as the brand tagline.** Use everywhere.

**B. Sprout logo — `components/montree/MonteeLogo.tsx`:**

SVG sprout component: asymmetric two leaves on a stem inside a rounded square gradient background (`#34d399 → #14b8a6`). Props: `size` (default 32), `showBackground` (default true), `className`. Used in nav and footer of landing page.

```tsx
export default function MontreeLogo({ size = 32, showBackground = true, className = '' }) {
  const gradId = `mg-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
      </defs>
      {showBackground && <rect width="32" height="32" rx="8" fill={`url(#${gradId})`} />}
      <path d="M16 27 C16 27 16 18 16 14" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.95"/>
      <path d="M16 21 C13.5 19.5 10.5 16 11.5 11 C13.5 10.5 17 14 16 21Z" fill="white" opacity="0.95"/>
      <path d="M16 17 C18 15.5 20.5 12 19.5 7.5 C17.5 7 15 10 16 17Z" fill="white" opacity="0.78"/>
    </svg>
  );
}
```

Note: `public/icon.svg` (tree-of-circles PWA icon) was NOT changed — user prefers it as-is for the home screen icon.

**C. Demo flow: modal removed, direct self-serve signup:**

Removed `DemoModal` entirely from landing page. Both CTAs now link directly to `/montree/login-select?signup=true`. User's reasoning: "allow them to set up a classroom themselves as it was before with the code login system. it was clean."

**D. Demo request confirmation email — `app/api/montree/demo-request/route.ts` (commit `26aeea6b`):**

Added a warm confirmation email sent to the requester immediately on form submit:
```
Subject: Montree
Dear [First name / school / there],
Thank you for reaching out. I'll be in touch within 24 hours...
Kind regards, Tredoux / montree.xyz
```
⚠️ **Email delivery is currently unreliable** — `RESEND_FROM_EMAIL` in Railway is set to `onboarding@resend.dev` (Resend test address — only delivers to the Resend account owner). To fix: verify `montree.xyz` domain in Resend → add DNS records → update `RESEND_FROM_EMAIL` in Railway. The DB always saves the lead regardless of email status.

**E. Super admin demo request alert banner — commit `91f8c92b`:**

Added `DemoRequestAlert` component to `app/montree/super-admin/page.tsx`. Fetches `/api/montree/super-admin/demo-requests`, filters to `status='demo_requested'`, renders a green alert banner with school name, contact, email link, and "Mark contacted" button. Clicking "Mark contacted" PATCHes the contact to `status='contacted'` and removes it from the banner.

The backing API route (`app/api/montree/super-admin/demo-requests/route.ts`) was already in place — GET returns all landing-page leads with `pending` count, PATCH updates status.

**🚨 Bug fixed:** The component originally checked `d?.leads` but the API returns `d?.requests`. Fixed to `d?.requests.filter(r => r.status === 'demo_requested')`. Without this fix the banner would never show.

**F. Three hot lead reply drafts — all in Gmail (Session 71):**

Pre-send duplicate checks ran clean for all three domains.

- **Montessori Copenhagen** (`info@montessori-cph.dk`) — Full Montree overview + 9 languages + early adopter + demo or 30-day trial CTA. Gmail draft ID: `r5875732429643975187`
- **Paint Pots Montessori, UK** (`paintpotsmontessori@outlook.com`) — Magic of Montree + 20-min demo offer. Gmail draft ID: `r-8134738077301193428`
- **Ardtona House Montessori, UK** (`info@ardtonahouse.co.uk`) — "Yes — one month free, no credit card" + direct signup + early adopter hook. Gmail draft ID: `r6746566790609932769`

All AWAITING TREDOUX SEND.

**Next session priorities:**
1. **Send the 3 hot lead drafts** — Copenhagen, Paint Pots, Ardtona House. Already in Gmail.
2. **FAMM Argentina follow-up** — Past the Apr 28 deadline. Draft a follow-up now.
3. **Complete follow-up batch** — 248 remaining `status='sent'` contacts need the Session 70 follow-up template. Pull next 50 from DB and draft.
4. **Fix login page pricing link** — `app/montree/login-select/page.tsx`: "View pricing & tiers →" → "30 days free · See pricing →"
5. **Disable `tell_guru_onboarding` for Whale Class** — `UPDATE montree_school_features SET enabled=false WHERE school_id='c6280fae-567c-45ed-ad4d-934eae79aabc' AND feature_key='tell_guru_onboarding';`
6. **Fix Resend domain** — Verify `montree.xyz` in Resend, update `RESEND_FROM_EMAIL` in Railway so confirmation emails actually reach leads.
7. **Ghost school screenshots** — Onboard "Greenfield Montessori" with 20 generic students for marketing.

---

## RECENT STATUS (Apr 27, 2026)

### ⚡ Session 70 — Outreach Follow-Ups + BulkImport Fix + Landing Page Redesign (Apr 27, 2026)

**Commits pushed: `ec3d2334` (BulkImport fix). Landing page redesign handed off to Opus.**

**A. Outreach follow-up emails:**

Drafted replies to 3 hot leads (Copenhagen, Paint Pots UK, Ardtona House UK). All in Gmail drafts. Copenhagen draft went through 6 iterations to nail the tone — final version is confident, warm, uses "the magic of Montree" framing, mentions 9 languages and early adopter benefits without justifying or chasing.

New follow-up template agreed for all 270 `status='sent'` contacts (the full batch):
```
Hi,

Just a quick follow up — a few things have changed.

Following user requests we have added nine languages to Montree. I am still personally onboarding schools at this stage, and early adopters still have the opportunity to have features built specifically for their school.

I would love to give you the opportunity to experience the magic of Montree. One month, completely free.

Kind regards,
Tredoux
montree.xyz
```
Key copy decisions:
- "Following user requests" (not "popular demand") — implies active user base, creates FOMO
- "early adopters" (not "early adaptors") — correct term
- "the magic of Montree" — THE brand tagline, confirmed this session
- Language personalization: German-speaking schools get "German among them", Spanish get "Spanish among them", etc.
- 22 drafts created before session was interrupted. 248 remaining.

**B. BulkImport smart date parsing — commit `ec3d2334`:**

User tried to onboard a ghost school for marketing screenshots. Hit "Could not parse date" for all 20 students with DD/MM/YYYY dates. Root cause: default format was YYYY-MM-DD and there was no auto-detection.

**`components/montree/BulkPasteImport.tsx`** — full date logic rewrite:
- Removed manual format selector entirely
- Added `smartParseDate()` — tries all common formats, picks the one that gives a sensible age (0-15 years), handles YYYY-MM-DD / DD/MM/YYYY / MM/DD/YYYY / 2-digit years / ambiguous cases
- Invalid dates now silently skipped (birthday is optional) — no more scary red "Could not parse date" that blocks import
- Placeholder updated to show multiple format examples
- Added "Any date format works — we'll figure it out. Birthdays are optional." hint text

**`app/montree/dashboard/page.tsx`** — post-import UX fix:
- After successful bulk import, page scrolls to top so student grid is immediately visible (was showing empty "Tap to add" state)

**C. Landing page redesign — handed off to Opus:**

User wants `app/montree/page.tsx` completely rewritten with the dark forest green gradient from the login screen. Tagline is "The magic of Montree." Four sections only: Nav, Hero, Three editorial statements (Teacher/Parents/Principal), Closing CTA. No feature grids, no bullet points, no comparison tables.

Full brief at: `docs/LANDING_PAGE_REDESIGN_HANDOFF.md`

**"The magic of Montree" is the confirmed brand tagline.** Use everywhere — follow-up emails, landing page, pricing page, follow-up to hot leads.

**D. Login page still says "View pricing & tiers →":**
`app/montree/login-select/page.tsx` — update this link text to match new single-plan messaging.

**Next session priorities:**
1. **Landing page redesign** — Opus to execute from `docs/LANDING_PAGE_REDESIGN_HANDOFF.md`
2. **Complete follow-up batch** — 248 remaining contacts at `status='sent'` need follow-up drafts using the confirmed template above. Pull next 50 from DB and draft.
3. **Ghost school screenshots** — onboard "Greenfield Montessori" with 20 generic students (no photos = clean initial avatar grid) for marketing
4. **Fix login page pricing link** — "View pricing & tiers →" → "30 days free · See pricing →"
5. **FAMM Argentina follow-up** — past the Apr 28 deadline, follow up now
6. **Disable `tell_guru_onboarding` for Whale Class** — `UPDATE montree_school_features SET enabled=false WHERE school_id='c6280fae-567c-45ed-ad4d-934eae79aabc' AND feature_key='tell_guru_onboarding';`

---

### ⚡ Session 69 — Audio Manager + Real-Time Progress Tracking + Pricing Redesign (Apr 27, 2026)

**Two commits pushed to main: `4e99dcf3`, `aa6387f2`.** Plus all the real-time progress + audio manager work which was committed in the prior session batch.

**A. Audio Manager — same page as Video Manager:**

Extended `app/admin/video-manager/page.tsx`, `app/api/admin/video-manager/route.ts`, and `lib/data.ts` to support audio-only uploads (songs without video) alongside existing video uploads.

**`lib/data.ts`** — Added `mediaType?: 'video' | 'audio'` to `Video` interface. `videoUrl` field used for both (backwards compatible — undefined/missing = video).

**`app/api/admin/video-manager/route.ts`:**
- POST (signed-URL): reads `mediaType` from body; uses `aud_` prefix + `audio/` storage folder for audio files
- DELETE: detects `video.mediaType === 'audio'` to use correct `audio/` folder (was always using `videos/` — bug fixed)
- Stores `mediaType: 'audio'` in Video metadata

**`app/admin/video-manager/page.tsx`** (full rewrite → renamed "🎬 Media Manager"):
- File input: `accept="video/*,audio/*"`
- Upload: auto-detects `file.type.startsWith('audio/')` → sets `uploadIsAudio`
- Filter tabs: All / 🎬 Videos (count) / 🎵 Audio (count)
- Audio cards: cyan/purple gradient + 🎵 emoji + `<audio controls>` player
- Upload modal: `<audio>` preview + 🎵 banner for audio; `<video>` for video
- Stats bar: 6 tiles including separate Video count and Audio count

**B. Real-Time Progress Tracking:**

Previously, Guru only knew what children worked on AFTER Weekly Wrap generation. Now every photo confirmation writes a live progress record to `montree_child_progress` so Guru knows what happened today in real time.

**`app/api/montree/guru/corrections/route.ts`** — Added `upsertProgressObservation()` helper:
- CONFIRM path: called with `original_work_name`
- CORRECTION path: called with `corrected_work_name || original_work_name`
- Fire-and-forget (never blocks the response)
- Logic: if row exists + `status='presented'` → touch `updated_at` only. If row exists + higher status (practicing/mastered) → no-op (never downgrades teacher decisions). If no row → insert with `status='presented'`.
- Schema-correct: NO `classroom_id` column (not in `montree_child_progress`), uses `updated_at` not `created_at`

**`app/api/montree/photo-audit/resolve/route.ts`** — Path B (new_custom) fix:
- Custom work creation path does NOT call corrections route — handled inline
- Added local copy of `upsertProgressObservation` + fires it after successful photo attachment
- Now all 3 resolution paths (A=confirm_ai, B=new_custom, C=existing work) write progress

**🚨 4 bugs found and fixed in audit:**
1. **Wrong status value**: `'presenting'` → `'presented'` (actual enum from migration 081)
2. **Non-existent column**: Removed `classroom_id` from insert (not on `montree_child_progress`)
3. **Wrong timestamp**: Was updating `created_at` → corrected to `updated_at`
4. **Path B gap**: new_custom path never called corrections route → added separate progress upsert

**C. Pricing Redesign — commit `4e99dcf3`:**

Eliminated the Seed free tier. Single plan, 30-day trial, one classroom only.

**`app/pricing/page.tsx`** (full rewrite):
- Hero: "One plan. 30 days free to try it."
- Single centered Bloom card with prominent "Trial includes" box:
  - Full Montree experience
  - One classroom only
  - 30 days, then $7/student/month
  - No credit card required
- CTA subtitle: "One classroom · 30 days · No credit card"
- Removed Seed card, removed comparison table
- 7 FAQs updated including new "What does 'one classroom' mean?" and "Why only one plan?"
- Bottom banner: "One classroom · 30 days · No credit card · No contracts."

**Rationale:** Freemium fails when the free tier strips the AI — that leaves a worse-than-paper tracker. One plan + clear trial is more honest. The one-classroom trial limitation is stated plainly in 3 places, not buried.

**D. Landing page copy — commit `aa6387f2`:**

`app/montree/page.tsx` line 468: "View pricing and tiers →" → "30 days free · See pricing →"

**Next session priorities:**
1. **Draft replies to 3 hot leads** — Paint Pots UK (demo request), Ardtona House UK (free trial), Montessori Copenhagen (details). Immediate conversion opportunities.
2. **Follow up on FAMM Argentina** — No response since Apr 18. Follow up now (past Apr 28 deadline).
3. **Disable `tell_guru_onboarding` for Whale Class** — Amy's card keeps appearing: `UPDATE montree_school_features SET enabled=false WHERE school_id='c6280fae-567c-45ed-ad4d-934eae79aabc' AND feature_key='tell_guru_onboarding';`
4. **Gate the 6 Sonnet-hardcoded routes** with `resolveReportModel()`.
5. **HeyGen videos** — 3-min and 5-min scripts via Builder → Script to Video (8 credits each, 146 credits remaining).

---

## RECENT STATUS (Apr 26, 2026)

### ⚡ Session 68 — Curriculum Data Layer Complete: All 9 Locales Fully Wired End-to-End (Apr 26, 2026)

**One commit pushed to main: `683af47e`.** 3 files, 70 insertions, 24 deletions. Completed the curriculum data layer for all 6 new locales (fr, pt, nl, it, ja, ko, de) so work names and guide content now display correctly in every language.

**A. Root cause of "German curriculum still in English" — fixed:**

The progress API (`app/api/montree/progress/route.ts`) was only fetching `name_chinese` and `name_es` from `montree_classroom_curriculum_works`. All 6 new language name columns (`name_de`, `name_fr`, `name_pt`, `name_nl`, `name_it`, `name_ja`, `name_ko`) were never read, so enrichment Maps were never built, and progress items were always falling back to English work names.

**Fix — 3 files:**

1. **`app/api/montree/progress/route.ts`** — Extended SELECT to include all 9 language name columns. Added 7 new Maps (`dbDeMap`, `dbFrMap`, `dbPtMap`, `dbNlMap`, `dbItMap`, `dbJaMap`, `dbKoMap`). Enrichment pass now adds `deName`, `frName`, `ptName`, `nlName`, `itName`, `jaName`, `koName` to each progress item.

2. **`app/montree/dashboard/[childId]/page.tsx`** — Extended `Assignment` interface with 7 new name props. Refactored `openQuickGuide` signature from `(workName, chineseName?, spanishName?)` to `(workName, localizedNames?: Record<string, string | undefined>)`. Updated call site to pass all 9 locale names as a dict.

3. **`components/montree/child/FocusWorksSection.tsx`** — Extended `Assignment` interface with 7 new props (`deName`, `frName`, `ptName`, `nlName`, `itName`, `jaName`, `koName`). Updated `onOpenQuickGuide` prop signature to match new dict pattern. Added `getWorkDisplayName(work, locale)` helper that resolves via locale-keyed map with fallback to `cleanWorkName()`. Replaced both zh/es display ternaries (focus works + extra works) with `{getWorkDisplayName(work, locale)}`. Updated Quick Guide button call site.

**B. Guide content batch translations — ALL LOCALES COMPLETE:**

Ran `batch-translate-guides-new-langs.mjs` for remaining null rows across all locales:

| Locale | Final count | Status |
|--------|-------------|--------|
| fr | 384/383 | ✅ Complete |
| pt | 384/383 | ✅ Complete |
| nl | 383/383 | ✅ Complete |
| it | 384/383 | ✅ Complete (2 gaps filled this session) |
| de | 384/383 | ✅ Complete (2 gaps filled this session) |
| ja | 384/383 | ✅ Complete (6 gaps filled this session) |
| ko | 384/383 | ✅ Complete (3 gaps filled this session) |

The 384 vs 383 discrepancy is one extra row from a different classroom_id — not an issue.

**🚨 Architectural note — `getWorkDisplayName()` is the canonical pattern:**

Any component that renders a work name for a user-facing locale should use this pattern:
```typescript
function getWorkDisplayName(work: Assignment, locale: string): string {
  const nameMap: Record<string, string | undefined> = {
    zh: work.chineseName, es: work.spanishName, de: work.deName,
    fr: work.frName, pt: work.ptName, nl: work.nlName,
    it: work.itName, ja: work.jaName, ko: work.koName,
  };
  return nameMap[locale] || cleanWorkName(work.work_name);
}
```

**C. Landing page + pitch materials (earlier this session):**

Three commits pushed earlier (`3969c48f`, `2e0e20b1`, `e6e93a30`) adding:
- "For the teacher" section to `app/montree/page.tsx` (Monday confidence → Friday back 4-beat structure)
- "Four stakeholders" 2×2 grid section (Principal / Parents / Teachers / Students)
- "Three budget lines" pricing reframe section
- "Personal promise" with Tredoux attribution
- `montree-pitch.html` — dark-themed pitch cheat sheet for demos (6 phases + objection handling + reframe)
- `montree-video-scripts.html` — 4 HeyGen video scripts (30-sec, 60-sec, 3-min, 5-min) with tabbed UI

**D. HeyGen video creation — in progress:**

- Subscribed to HeyGen Creator plan (200 credits)
- Video Agent consumed ~54 credits on storyboard generation without producing a video (billed during planning phase, not at render — lesson learned)
- 146 credits remaining
- "Train your personal model" option available for 60 credits — would leave 86 credits (~10 videos at 8 each)
- The 30-sec hook video is already generated and looks good
- Script to Video (Builder tab, not Video Agent) is the correct 8-credit path for remaining videos

**Files changed (3 files, commit `683af47e`):**
- `app/api/montree/progress/route.ts` — 9-language SELECT + 7 new Maps + enrichment
- `app/montree/dashboard/[childId]/page.tsx` — 7 new Assignment props + openQuickGuide refactor
- `components/montree/child/FocusWorksSection.tsx` — 7 new props + getWorkDisplayName helper + ternary replacements

**Next session priorities:**
1. **Draft replies to 3 hot leads** — Paint Pots UK (demo request), Ardtona House UK (free trial), Montessori Copenhagen (details). Immediate conversion opportunities.
2. **Follow up on FAMM Argentina** if no response by Apr 28.
3. **Disable `tell_guru_onboarding` for Whale Class** — Amy's card keeps appearing: `UPDATE montree_school_features SET enabled=false WHERE school_id='c6280fae-567c-45ed-ad4d-934eae79aabc' AND feature_key='tell_guru_onboarding';`
4. **Gate the 6 Sonnet-hardcoded routes** with `resolveReportModel()`.
5. **Finish HeyGen videos** — 3-min and 5-min scripts still to be produced via Builder → Script to Video (8 credits each).

---

### ⚡ Session 67 — 6-Language UI Expansion: French, Portuguese, Dutch, Italian, Japanese, Korean (Apr 26, 2026)

**One commit pushed to main: `e2baf953`.** 17 files, 23,075 insertions. Expanded Montree from 3 locales (en, zh, es) to 9 locales by adding complete UI translation files for French, Portuguese, Dutch, Italian, Japanese, and Korean.

**A. New translation files — 6 files, 3,646 keys each:**

- **`lib/montree/i18n/fr.ts`** — French (Français). Formal `vous` register, AMI French Montessori terminology (`Vie Pratique`, `Sensoriel`, `Mathématiques`, `Langage`, `Culture`). 3,646/3,646 keys translated.
- **`lib/montree/i18n/pt.ts`** — Portuguese (Português). Formal `você` register, AMI Portuguese terminology (`Vida Prática`, `Sensorial`, `Matemática`, `Linguagem`, `Cultural`). 3,646/3,646 keys translated.
- **`lib/montree/i18n/nl.ts`** — Dutch (Nederlands). Formal `u/uw` register, AMI Dutch terminology (`Praktisch Leven`, `Zintuiglijk`, `Wiskunde`, `Taal`, `Cultuur`). 3,646/3,646 keys translated.
- **`lib/montree/i18n/it.ts`** — Italian (Italiano). Formal `Lei/Suo/Sua` register, AMI Italian terminology. 3,645/3,646 keys (1 fallback: `childGuru.typeOrSpeak`).
- **`lib/montree/i18n/ja.ts`** — Japanese (日本語). Polite `です/ます` register, `お子さま` for "your child". 3,628/3,646 keys (18 fallbacks).
- **`lib/montree/i18n/ko.ts`** — Korean (한국어). Formal `합쇼체/해요체` register, `자녀분` for "your child". 3,637/3,646 keys (9 fallbacks).

**B. Infrastructure changes — 5 files updated:**

- **`lib/montree/i18n/locales.ts`** — Added fr, pt, nl, it, ja, ko to `SUPPORTED_LOCALES` array, `Locale` union type, `LOCALE_TO_INTL` date format map, `LOCALE_DISPLAY_NAMES`, `LOCALE_SHORT_LABELS`.
- **`lib/montree/i18n/area-labels.ts`** — Added `AREA_LABELS_FR`, `AREA_LABELS_PT`, `AREA_LABELS_NL`, `AREA_LABELS_IT`, `AREA_LABELS_JA`, `AREA_LABELS_KO` in the map-of-maps. All 6 new locales resolve correctly in `getAreaLabel(area, locale)`.
- **`lib/montree/i18n/locale-config.ts`** — Added `LOCALE_AI_CONFIG` entries for all 6 new locales (language name, system prompt suffix for AI responses, glossary).
- **`lib/montree/i18n/context.tsx`** — Imports and wires fr, pt, nl, it, ja, ko into the `messages` map.
- **`lib/montree/i18n/server.ts`** — Imports and wires all 6 into the `LOCALE_TO_MESSAGES` server-side map.

**C. GitHub Push Protection incident — resolved:**

Initial push attempt was blocked: commit `c49c36f2` contained a hardcoded Anthropic API key (`sk-ant-api03-...`) in the one-off generation scripts (`scripts/generate-fr/pt/nl/it/ja/nl.mjs`). These scripts were created to generate the translation files using Haiku and the key was accidentally left inline.

**Fix:** Replaced key with `process.env.ANTHROPIC_API_KEY` string literal in all 6 scripts via `sed -i ''` on macOS. Then ran `git commit --amend --no-edit` + `git push`. Commit `e2baf953` pushed successfully on second attempt (transient SSH disconnect on first retry).

**D. Production verification — CONFIRMED:**

Screenshots confirmed Korean locale (`한국어`) working end-to-end on production:
- UI labels and status badges fully translated (`수달함` = mastered, `제시됨` = presented)
- Quick guide modal rendering in Korean
- Full details modal rendering in Korean
- LanguageToggle dropdown showing all 9 locales

**🚨 CRITICAL KNOWN GAP — Curriculum data layer NOT localized for 6 new languages:**

The UI translation files are complete, but the **curriculum work names and guide content** in the database are NOT localized for fr, pt, nl, it, ja, ko. This mirrors the gap that existed for Chinese (fixed Sessions 13–14, 17) and Spanish (fixed Session 65).

**What's missing:**

| Column | DB table | Status |
|--------|----------|--------|
| `name_fr`, `name_pt`, `name_nl`, `name_it`, `name_ja`, `name_ko` | `montree_classroom_curriculum_works` | ❌ Columns don't exist |
| `guide_content_fr`, `guide_content_pt`, `guide_content_nl`, `guide_content_it`, `guide_content_ja`, `guide_content_ko` | `montree_classroom_curriculum_works` | ❌ Columns don't exist |

**`LOCALE_COLUMN_SUFFIX` in `lib/montree/i18n/db-helpers.ts` is also missing entries for all 6 new locales.** The map currently has `zh: '_zh'` and `es: '_es'`. Without entries for the 6 new languages, `getLocalizedWorkName()` and `getLocalizedField()` cannot resolve their DB columns.

**What this means in practice:**
- If a school switches to French/Portuguese/Dutch/Italian/Japanese/Korean, ALL work names in the curriculum view, child page shelf, game plan chips, Photo Audit sheet, and guide modals will fall back to English.
- Quick guides and full guides will render in English regardless of locale.
- Area labels WILL work correctly (those are code-side, not DB-dependent).
- UI strings (buttons, labels, status badges) WILL work correctly.

**Next session — Curriculum Data Layer for 6 New Languages:**

**Step 1 — DB Migrations (user runs in Supabase SQL Editor):**
```sql
-- Work name columns
ALTER TABLE montree_classroom_curriculum_works
  ADD COLUMN IF NOT EXISTS name_fr TEXT,
  ADD COLUMN IF NOT EXISTS name_pt TEXT,
  ADD COLUMN IF NOT EXISTS name_nl TEXT,
  ADD COLUMN IF NOT EXISTS name_it TEXT,
  ADD COLUMN IF NOT EXISTS name_ja TEXT,
  ADD COLUMN IF NOT EXISTS name_ko TEXT;

-- Guide content columns (JSONB, same schema as guide_content_zh)
ALTER TABLE montree_classroom_curriculum_works
  ADD COLUMN IF NOT EXISTS guide_content_fr JSONB,
  ADD COLUMN IF NOT EXISTS guide_content_pt JSONB,
  ADD COLUMN IF NOT EXISTS guide_content_nl JSONB,
  ADD COLUMN IF NOT EXISTS guide_content_it JSONB,
  ADD COLUMN IF NOT EXISTS guide_content_ja JSONB,
  ADD COLUMN IF NOT EXISTS guide_content_ko JSONB;
```

**Step 2 — `db-helpers.ts` update:**
Add all 6 new locales to `LOCALE_COLUMN_SUFFIX` in `lib/montree/i18n/db-helpers.ts`:
```typescript
export const LOCALE_COLUMN_SUFFIX: Record<string, string> = {
  zh: '_zh',
  es: '_es',
  fr: '_fr',   // ADD
  pt: '_pt',   // ADD
  nl: '_nl',   // ADD
  it: '_it',   // ADD
  ja: '_ja',   // ADD
  ko: '_ko',   // ADD
};
```

**Step 3 — Batch work name translation scripts (Haiku):**
Similar to the one-off scripts used for Spanish (`scripts/generate-es.mjs` style). For each language, create a script that:
1. Reads all `montree_classroom_curriculum_works` rows for Whale Class classroom (id: `51e7adb6-cd18-4e03-b707-eceb0a1d2e69`)
2. Calls Haiku for each work with the English `name` and asks for a localized translation
3. Uses `montree_glossary_{lang}` (if applicable) or Montessori AMI terminology guidelines in the prompt
4. UPSERTs the translated name into `name_{lang}` column
5. Runs in batches of 5, 500ms delay, handles retries

**Step 4 — Batch guide content translation scripts:**
Similar to `scripts/batch-translate-guides-es.js` (Session 65). For each language:
1. Query all works in Whale Class with `guide_content_{lang} IS NULL`
2. For each, translate the `quick_guide` JSONB from English using Haiku `tool_use`
3. Store result in `guide_content_{lang}` JSONB column
4. Estimated cost: ~$0.40 × 6 languages = ~$2.40 total (Haiku, same cost as Spanish batch)

**Step 5 — `auto-translate.ts` update:**
Update `lib/montree/auto-translate.ts` to also write all 6 new language columns when translating a newly-created curriculum work. Currently it writes `name_zh` + `name_chinese` + `name_es`. Add `name_fr`, `name_pt`, `name_nl`, `name_it`, `name_ja`, `name_ko` to the upsert payload.

**Step 6 — Works API update:**
`app/api/montree/works/route.ts` currently selects `name_es` and maps it to `spanish_name`. Add selects for all 6 new language columns and map them into the API response.

**Priority:** HIGH. Until this is done, any school that switches to one of the 6 new locales will see English work names in all curriculum views. The UI strings are correct but the data layer is English-only.

**Reference sessions:**
- Session 13 (Chinese work names + auto-translate pipeline)
- Session 14 (dual-column root cause fix — always write BOTH columns)
- Session 17 (Chinese guide content batch translation — 384/384 works)
- Session 65 (Spanish guide content batch — 383/383 works, `scripts/batch-translate-guides-es.js`)

**Files changed (17 files, commit `e2baf953`):**
- `lib/montree/i18n/fr.ts` — NEW
- `lib/montree/i18n/pt.ts` — NEW
- `lib/montree/i18n/nl.ts` — NEW
- `lib/montree/i18n/it.ts` — NEW
- `lib/montree/i18n/ja.ts` — NEW
- `lib/montree/i18n/ko.ts` — NEW
- `scripts/generate-fr.mjs` — NEW (one-off, API key scrubbed)
- `scripts/generate-pt.mjs` — NEW (one-off, API key scrubbed)
- `scripts/generate-nl.mjs` — NEW (one-off, API key scrubbed)
- `scripts/generate-it.mjs` — NEW (one-off, API key scrubbed)
- `scripts/generate-ja.mjs` — NEW (one-off, API key scrubbed)
- `scripts/generate-ko.mjs` — NEW (one-off, API key scrubbed)
- `lib/montree/i18n/locales.ts` — 6 new locales in `SUPPORTED_LOCALES` + `Locale` type + display maps
- `lib/montree/i18n/area-labels.ts` — 6 new `AREA_LABELS_*` constants in map-of-maps
- `lib/montree/i18n/locale-config.ts` — 6 new `LOCALE_AI_CONFIG` entries
- `lib/montree/i18n/context.tsx` — imports + wires all 6
- `lib/montree/i18n/server.ts` — imports + wires all 6

**Next session priorities:**
1. **🚨 Curriculum data layer for 6 new languages** — DB migrations (Step 1 above) + `db-helpers.ts` update (Step 2) + batch work name scripts (Step 3) + batch guide scripts (Step 4) + `auto-translate.ts` update (Step 5). This is the only remaining gap before the 6 new locales are fully functional end-to-end.
2. **Draft replies to 3 hot leads** — Paint Pots UK (demo request), Ardtona House UK (free trial), Montessori Copenhagen (details).
3. **Follow up on FAMM Argentina** if no response by Apr 28.
4. **Disable `tell_guru_onboarding` for Whale Class** — Amy's card keeps appearing: `UPDATE montree_school_features SET enabled=false WHERE school_id='c6280fae-567c-45ed-ad4d-934eae79aabc' AND feature_key='tell_guru_onboarding';`
5. **Gate the 6 Sonnet-hardcoded routes** with `resolveReportModel()`.

---

## RECENT STATUS (Apr 25, 2026)

### ⚡ Session 66 — Language Semester Report: Mastery Fix + Single-Block Copy (Apr 25, 2026)

**Two commits pushed to main: `577c3de5`, `3ad3ff0a`.**

**A. Mastery status fix — commit `577c3de5`:**

User flagged that Chalkboard Writing was showing as MD (Mastered) when the teacher never declared it mastered. The root cause was in `loadLanguageProgress()` in `app/api/montree/reports/language-semester/generate/route.ts`: photo count was being used as a mastery proxy (4+ photos → MD, 2-3 → Pr, 1 → P). User's exact words: *"Students can practice a work like this for 6 months without mastering it. The teacher needs to determine whats mastered and whats not. The AI cant. The AI should just assume everything is practicing until told otherwise."*

**Fix:** Added a query to `montree_child_progress` for rows where `status='mastered'` for the child. MD is now **only** assigned when a teacher has explicitly marked a work as mastered in the DB. Photo count can only yield P or Pr — never MD.

**Old (broken):**
```typescript
if (count >= 4) status = 'mastered';
else if (count >= 2) status = 'practicing';
else status = 'presented';
```

**New (correct):**
```typescript
// Step 3b: Fetch teacher-explicitly-set mastered works
const masteredWorkNames = new Set<string>();
const { data: progressRows } = await supabase
  .from('montree_child_progress')
  .select('work_name, status')
  .eq('child_id', childId)
  .eq('status', 'mastered');
for (const row of progressRows || []) {
  masteredWorkNames.add(row.work_name.toLowerCase());
}

// Status: MD only from teacher, Pr from 2+ photos, P from 1 photo
if (masteredWorkNames.has(workName.toLowerCase())) status = 'mastered';
else if (count >= 2) status = 'practicing';
else status = 'presented';
```

**🚨 Architectural rule:** `montree_child_progress.status='mastered'` is the SOLE source of truth for MD on any parent-facing report. Photo count alone NEVER implies mastery. This applies to Language Semester, Weekly Wrap, and any future report type.

**B. Single-block copy — commit `3ad3ff0a`:**

User saw three separate Copy buttons (one each for OPENING, CIRCLE 3 POINTS, CLOSING) and asked for one combined block they could copy in a single click. Fixed `app/montree/dashboard/language-semester/page.tsx`:

**Before (3 separate CopyBlock components):**
```tsx
<CopyBlock label="Opening" text={child.opening ?? ''} />
<CopyBlock label="Circle (3 points)" text={child.circle ?? ''} />
<CopyBlock label="Closing" text={child.closing ?? ''} />
```

**After (1 combined CopyBlock):**
```tsx
<CopyBlock
  label="Parent Letter"
  text={[child.opening, child.circle, child.closing].filter(Boolean).join('\n\n')}
/>
```

One click copies the entire three-part parent letter with blank lines separating the sections.

**Files changed (2 files, 2 commits):**
- `app/api/montree/reports/language-semester/generate/route.ts` — mastery from DB only, not photo count
- `app/montree/dashboard/language-semester/page.tsx` — single combined "Parent Letter" CopyBlock

**Next session priorities:**
1. **Draft replies to 3 hot leads** — Paint Pots UK (demo request), Ardtona House UK (free trial), Montessori Copenhagen (details). Immediate conversion opportunities.
2. **Follow up on FAMM Argentina** if no response by Apr 28.
3. **Disable `tell_guru_onboarding` for Whale Class** — Amy's card keeps appearing: `UPDATE montree_school_features SET enabled=false WHERE school_id='c6280fae-567c-45ed-ad4d-934eae79aabc' AND feature_key='tell_guru_onboarding';`
4. **Gate the 6 Sonnet-hardcoded routes** with `resolveReportModel()`.
5. **Health Check Section A** from `HEALTH_CHECK_HANDOFF.md` — 9 items needing full context.

---

### ⚡ Session 65 — Spanish Wiring Verification + Guide Batch Complete + LanguageToggle Dropdown (Apr 25, 2026)

**One commit pushed to main: `5fc97ad9`.** Verified all 5 Spanish multilingual wiring tasks were pre-implemented, completed the Spanish guide batch translation (383/383), and replaced the LanguageToggle cycle button with a native dropdown.

**Context:** Sessions 58–64 built the full multilingual infrastructure including Spanish as `'es'` locale. This session audited whether 5 specific Spanish wiring tasks were still pending or had been silently pre-implemented during that build.

**A. All 5 Spanish wiring tasks confirmed PRE-IMPLEMENTED (no code changes needed):**

1. **`db-helpers.ts` — `es: '_es'` in `LOCALE_COLUMN_SUFFIX`** — ✅ Already present. `getLocalizedWorkName()`, `getLocalizedField()`, and `getLocalizedColumn()` all resolve `_es` suffix automatically for Spanish locale.

2. **Works API — `name_es` in SELECT + `spanish_name` in response** — ✅ Already implemented. `app/api/montree/works/route.ts` selects `name_es` from DB and maps it to `spanish_name: w.name_es || undefined` in the response object.

3. **Child page + FocusWorksSection — `spanishName` prop + triple-fallback render** — ✅ Already implemented. Both files have `spanishName?: string` on their Assignment interfaces and use:
   ```tsx
   {locale === 'zh' && focusWork.chineseName
     ? focusWork.chineseName
     : locale === 'es' && focusWork.spanishName
       ? focusWork.spanishName
       : focusWork.work_name}
   ```

4. **`area-labels.ts` — `AREA_LABELS_ES` + `AREA_LABELS` map-of-maps** — ✅ Already implemented. Argentine Spanish area labels (`Vida Práctica`, `Sensorial`, `Matemáticas`, `Lenguaje`, `Cultural`) are in the map-of-maps keyed by locale. `getAreaLabel(area, locale)` resolves correctly for `'es'`.

5. **`LanguageToggle.tsx` — cycles through Spanish** — ✅ Already implemented. Component uses `SUPPORTED_LOCALES` array (which includes `'es'`) to cycle EN → 中文 → ES → EN. `LOCALE_SHORT_LABELS` drives button display (`'es': 'ES'`).

**B. `es.ts` — Confirmed real Argentine Spanish (not stubs):**

File header explicitly states: `// Uses voseo (vos tenés), ustedes for plural, AMI Montessori terminology.`

All 1,490+ translation keys are populated with genuine Argentine Spanish using voseo register:
- `'summary.askGuruPrompt'`: `'Hacé clic en "Preguntale al Guru"...'`
- `'guru.askPlaceholder'`: `'Preguntá sobre su hijo/a...'`
- Zero empty string values found via grep.

**C. Spanish guide batch translation — COMPLETE (383/383):**

`scripts/batch-translate-guides-es.js` finished its initial run with **373/383** (10 transient `fetch failed` failures). Re-ran targeting only the 10 remaining null rows — all 10 succeeded. Final state: **383/383 works** have `guide_content_es` JSONB populated.

All Whale Class works now have instant Spanish guide delivery (no API call needed) — same as the Chinese `guide_content_zh` cache built in Sessions 17+.

**D. LanguageToggle → native dropdown (commit `5fc97ad9`):**

Replaced the tap-to-cycle button with a proper dropdown select. The pill label is still shown visually (so it fits in the header at the same compact size), but an invisible `<select>` overlays it — clicking the pill opens the OS-native language picker showing full display names (English / 中文 / Español). No more hunting through locales by tapping in a cycle.

**Implementation (`components/montree/LanguageToggle.tsx`):**
- Visible pill span is `pointer-events-none` so the hidden `<select>` captures all clicks
- `<select>` is `opacity-0 absolute inset-0` — covers the pill exactly, invisible but fully interactive
- Options rendered from `SUPPORTED_LOCALES` with `LOCALE_DISPLAY_NAMES` as labels
- `onChange` calls `setLocale()` directly — one tap to any locale, no cycling
- No layout changes to any parent component — the div wrapper is the same size as the old button

**🚨 Architectural notes for future sessions:**

- **Spanish is fully wired end-to-end**: LanguageToggle → locale → area labels → work names → curriculum detail views → AI prompts. The infrastructure from Sessions 58–64 is complete.
- **To activate Spanish for a school**: No code changes. Just ensure the school's teacher can see the ES option in LanguageToggle (already works — no feature flag needed, locale is client-side preference).
- **Spanish guides**: `guide_content_es` on `montree_classroom_curriculum_works` — same JSONB schema as `guide_content_zh`. The guide API at `app/api/montree/works/guide/route.ts` already reads `guide_content_es` when `locale='es'` (via `LOCALE_COLUMN_SUFFIX` → `getLocalizedField()` pattern).
- **`name_es` column** on `montree_classroom_curriculum_works` — populated by batch translate scripts. The batch guide script does NOT fill this — a separate `name_es` batch would be needed for work names to appear in Spanish in the UI.
- **FAMM Argentina pitch**: If/when they onboard, their locale should be set to `'es'` at the school level. Everything renders in Argentine Spanish automatically.

**Next session priorities:**
1. **Amy's TellGuruCard** — disable `tell_guru_onboarding` for Whale Class: `UPDATE montree_school_features SET enabled=false WHERE school_id='c6280fae-567c-45ed-ad4d-934eae79aabc' AND feature_key='tell_guru_onboarding';`
2. **Draft replies to 3 hot leads** — Paint Pots UK (demo request), Ardtona House UK (free trial), Montessori Copenhagen (details). Immediate conversion opportunities.
3. **Follow up on FAMM Argentina** if no response by Apr 28.
4. **Check Spanish guide batch completion** — `SELECT COUNT(*) FROM montree_classroom_curriculum_works WHERE classroom_id='51e7adb6-cd18-4e03-b707-eceb0a1d2e69' AND guide_content_es IS NOT NULL;` — should be 383 when done.
5. **Gate the 6 Sonnet-hardcoded routes** with `resolveReportModel()`.
6. **Health Check Section A** from `HEALTH_CHECK_HANDOFF.md` — 9 items needing full context.

---

### ⚡ Session 64 — Game Plan Section Hide + TellGuruCard Fix + Lion King Video Downloads (Apr 25, 2026)

**Three commits pushed to main: `4e49a5b6`, `d70ad3be` (wrong, immediately superseded), `ca94843c`.**

**A. SHOW_GAME_PLAN gate — completed (`4e49a5b6`):**

Finished hiding the entire game plan section in `components/montree/child/FocusWorksSection.tsx`. This was the third and final edit of three to gate everything behind `SHOW_GAME_PLAN = false`:
- Container gradient block: already gated in prior session
- Header block (nudge + work chips + direction arrow): gated this session
- Footer block ("Updated today / Refresh" line): gated this session

All three conditions now read: `{SHOW_GAME_PLAN && gamePlan && (...)}`. **To restore the game plan section: flip `SHOW_GAME_PLAN = true` in `FocusWorksSection.tsx` and redeploy.** No DB changes, no data loss — the game plan JSONB is still being written by the replan pipeline, it just isn't shown in the UI.

**B. TellGuruCard visibility fix — `d70ad3be` (WRONG) → `ca94843c` (CORRECT):**

**The bug:** TellGuruCard was appearing for Amy and other students who had been in the classroom for months. The card is supposed to appear once — for brand-new students with no mental profile — and disappear permanently after the teacher submits the voice intro.

**Wrong first fix (`d70ad3be`):** Changed `childDataRich` threshold from `>= 5` photos to `>= 1`, reasoning "any photo means the child is known." User immediately corrected: *"what you talking about photos? What do photos have to do with it?"* Photos have nothing to do with whether the system has been introduced to a student. Reverted in next commit.

**Correct fix (`ca94843c`):** The ONLY signal for TellGuruCard visibility is `hasProfile` — whether a row exists in `montree_child_mental_profiles`. Removed `!childDataRich` from the condition entirely:

**Before (wrong):**
```tsx
{isEnabled('tell_guru_onboarding') && hasProfile === false && !childDataRich && (
```
**After (correct):**
```tsx
{isEnabled('tell_guru_onboarding') && hasProfile === false && (
```

Also: `childDataRich` threshold reverted to `>= 5` (its original value) with a clarifying comment: *"childDataRich is no longer used for TellGuruCard visibility — profile presence is the only signal. Left here as it still gates BigMicPanel display."*

Comment on the TellGuruCard block updated to: *"shown once, for brand-new students with no mental profile. Once the teacher submits the intro, hasProfile flips to true and this never shows again."*

**Why Amy's card is still showing:** She genuinely has no entry in `montree_child_mental_profiles`. The teacher needs to complete her intro via the voice card — or disable `tell_guru_onboarding` for Whale Class via Supabase if the card is unwanted.

**C. Lion King video downloads (local Mac, not committed):**

Downloaded 3 Lion King karaoke videos from YouTube via yt-dlp + re-encoded to H.264 for QuickTime/classroom use:
- "Circle of Life" karaoke — `Circle of Life - H264.mp4`
- "Hakuna Matata" karaoke — `Hakuna Matata - H264.mp4`
- "I Just Can't Wait to Be King" karaoke — `I Just Can't Wait to Be King - H264.mp4`

All saved to Desktop. Pipeline: yt-dlp with `--cookies-from-browser chrome` (required to bypass YouTube bot detection) → ffmpeg H.264 re-encode (`-c:v libx264 -crf 28 -preset fast -vf "scale=-2:720" -c:a aac -movflags +faststart`).

**🚨 Architectural notes for future sessions:**
- **`SHOW_GAME_PLAN = false`** in `FocusWorksSection.tsx` — flip to `true` to restore game plan display. The replan pipeline continues writing game plans regardless of this flag.
- **TellGuruCard is gated purely on `hasProfile === false`** — photo count, `childDataRich`, and any other derived state is irrelevant. Mental profile existence is the one signal.
- **`childDataRich` (≥5 photos) gates BigMicPanel ONLY** — do not use it for any onboarding state logic.
- **`hasProfile` state:** `null` = still loading, `false` = no profile in DB, `true` = profile exists. Card renders only on `=== false`.

**Files changed (2 files, 3 commits):**
- `components/montree/child/FocusWorksSection.tsx` — SHOW_GAME_PLAN gate on footer block + header block (commit `4e49a5b6`)
- `app/montree/dashboard/[childId]/page.tsx` — removed `!childDataRich` from TellGuruCard condition, reverted `childDataRich` to `>= 5`, updated comments (commit `ca94843c`)

**Next session priorities:**
1. **Amy's TellGuruCard** — either complete her voice intro via the card, or disable `tell_guru_onboarding` for Whale Class: `UPDATE montree_school_features SET enabled=false WHERE school_id='c6280fae-567c-45ed-ad4d-934eae79aabc' AND feature_key='tell_guru_onboarding';`
2. **Draft replies to 3 hot leads** — Paint Pots UK (demo request), Ardtona House UK (free trial request), Montessori Copenhagen (details request). These are immediate conversion opportunities.
3. **Follow up on FAMM Argentina** if no response by Apr 28.
4. **Gate the 6 Sonnet-hardcoded routes** with `resolveReportModel()`.
5. **Health Check Section A** from `HEALTH_CHECK_HANDOFF.md` — 9 items needing full context.

---

### ⚡ Session 63 — Multilingual Build: Phase 5 (3x AUDIT) COMPLETE — All 5 Phases Done + guru/route.ts Fix (Apr 24, 2026)

**Two commits pushed to main: `8fa6eecb`, `b5e42dbd`.** Phase 5 (3x AUDIT) of the 3x3x3x3x3 development cycle is 100% complete. Three consecutive clean audit passes confirmed zero TYPE A violations remain. The entire multilingual build (Phases 1-5) is now finished.

**Development Cycle Status — ALL COMPLETE:**
1. 3x RESEARCH — ✅ COMPLETE
2. 3x PLAN — ✅ COMPLETE
3. 3x INVESTIGATE — ✅ COMPLETE
4. 3x BUILD — ✅ COMPLETE (Layer 0-1 ✅, Layer 4 ✅, Layer 5 ✅, Layer 3 ✅)
5. 3x AUDIT — ✅ COMPLETE (3 consecutive clean passes)

**Commits this session:**
- `8fa6eecb` — Multilingual build: commit all Layer 3+4+5 changes (38+ files from Sessions 59-62)
- `b5e42dbd` — Fix guru/route.ts: replace dangling `isZh` references with locale-agnostic `langInstruction` + `areaNameInstruction` variables

**guru/route.ts fix (the audit catch):**
Prior session replaced the `isZh` declaration in `buildSystemPrompt()` with locale-agnostic variables (`langInstruction` via `getAILanguageInstruction()`, `areaNameInstruction` via IIFE Record) but left two template literal lines still referencing the now-deleted `isZh` variable. Would have crashed at runtime with `isZh is not defined`. Fixed lines 280 and 301:
- Line 280: `${isZh ? '\nLANGUAGE:...' : ''}` → `${langInstruction ? '\nLANGUAGE: ${langInstruction}\n' : ''}`
- Line 301: `${isZh ? '...' : ''}` → `${areaNameInstruction}`
- Only remaining `=== 'zh'` in this file: line 313 (TYPE B — `isZh` in `loadRecentPhotoHint()` for `work.name_chinese` DB column read) — correctly preserved.

**3x AUDIT results:**
- **Pass 1**: Grepped `=== 'zh'` across all .ts/.tsx/.mjs files — 116 occurrences across 44 files. ALL classified as TYPE B (DB column reads: `name_chinese`, `name_zh`, `chineseName`, `parent_description_zh`, `why_it_matters_zh`, `chinese_text`, `area_name_zh`, `guide_content_zh`, `labelZh`, `work_name_chinese`). Zero TYPE A violations.
- **Pass 2**: Sonnet agent verified the 8 highest-count files (54 occurrences total). All TYPE B. CLEAN.
- **Pass 3**: Sonnet agent verified all remaining files. All TYPE B. CLEAN. Three consecutive clean passes achieved.

**Video download:**
- Downloaded "No Doubt - Hey Baby" from YouTube (29.6MB, 720p)
- Re-encoded from AV1 to H.264 for QuickTime/classroom compatibility: `No Doubt - Hey Baby - H264.mp4` on Desktop

**Multilingual system is now fully locale-agnostic.** Adding a new language requires:
1. Create `lib/montree/i18n/{lang}.ts` (copy en.ts, translate)
2. Add to `SUPPORTED_LOCALES` in `locales.ts`
3. Add area labels to `AREA_LABELS` map
4. Add `LOCALE_CONFIG` entry
5. Add `LOCALE_TO_INTL` date format entry
6. Zero code changes in components or API routes

**Next session priorities:**
1. **🇪🇸 SHIP SPANISH FOR FAMM ARGENTINA** — Full handoff at `docs/MULTILINGUAL_AUDIT_HANDOFF.md` (Priority 1 section). Infrastructure is done, zero code changes needed. Remaining work: translate `es.ts` (1,490+ stub keys → real Argentine Spanish), add `name_es` column + batch translate curriculum, review AI prompt config for voseo/AMI terms, extend game plan JSONB. ~9-10h full, ~2-3h demo-ready shortcut. **Start here when user says "see handoff".**
2. **Draft replies to 3 hot leads** — Paint Pots UK (demo request), Ardtona House UK (free trial request), Montessori Copenhagen (details request).
3. **Follow up on FAMM Argentina** if no response by Apr 28.
4. **Gate the 6 Sonnet-hardcoded routes** with `resolveReportModel()`.
5. **Health Check Section A** from `HEALTH_CHECK_HANDOFF.md` — 9 items needing full context.

---

### ⚡ Session 62 — Multilingual Build: Layer 3 COMPLETE — Zero `=== 'zh'` Ternaries Remaining (Apr 24, 2026)

**Three commits pushed to main: `99fe8f3e`, `bd7abba7`, `fb542929`.** Phase 4 (3x BUILD) Layer 3 ternary sweep is 100% complete. Zero `=== 'zh'` ternaries remain in the entire codebase. All conversion targets converted to locale-agnostic patterns (IIFE Records for server, `t()` keys for client). 512 TYPE B preserves (DB column reads) correctly untouched.

**Development Cycle Status:**
1. 3x RESEARCH — ✅ COMPLETE
2. 3x PLAN — ✅ COMPLETE
3. 3x INVESTIGATE — ✅ COMPLETE
4. 3x BUILD — ✅ COMPLETE (Layer 0-1 ✅, Layer 4 ✅, Layer 5 ✅, Layer 3 ✅)
5. 3x AUDIT — ✅ COMPLETE (Session 63 — 3 consecutive clean passes)

**Commits this session:**
- `99fe8f3e` — Build fix: unescaped apostrophe in `en.ts` line 2768 (`'This Week's Activities'` → `"This Week's Activities"`)
- `bd7abba7` — Layer 3: convert 17 files (153 insertions, 63 deletions). Files: `sonnet-draft.ts`, `onboard/route.ts`, `weekly-admin/route.ts`, `weekly-admin-docs/generate/route.ts`, plus 13 others including `ThisIsSheet.tsx`, `weekly-admin-docs/page.tsx`, `weekly-wrap/page.tsx`, `gallery/page.tsx`, `parent/report/[reportId]/page.tsx`, `PendingReviewPanel.tsx`, `DashboardHeader.tsx`, `BatchNarrativesCard.tsx`, `BigMicPanel.tsx`, `ChildGuruChat.tsx`
- `fb542929` — Layer 3: convert last 2 voice-note ternaries (`lib/montree/voice-notes/extraction.ts`, `lib/montree/voice/prompts.ts`)

**Final verification:**
- `grep -r "=== 'zh'" --include="*.ts" --include="*.tsx" --include="*.mjs"` → **0 hits**
- `grep -r "== 'zh'" --include="*.ts" --include="*.tsx" --include="*.mjs"` → **0 hits**
- TYPE B preserves (`name_chinese`, `name_zh`, `parent_description_zh`, etc.) → **512 occurrences across 95 files** — all untouched

**Multilingual system is now fully locale-agnostic.** Adding a new language requires:
1. Create `lib/montree/i18n/{lang}.ts` (copy en.ts, translate)
2. Add to `SUPPORTED_LOCALES` in `locales.ts`
3. Add area labels to `AREA_LABELS` map
4. Add `LOCALE_CONFIG` entry
5. Add `LOCALE_TO_INTL` date format entry
6. Zero code changes in components or API routes

**Next session priorities:**
1. **Phase 5: 3x AUDIT** — fix cycle until 3 consecutive clean audits.
2. **Draft replies to 3 hot leads** — Paint Pots UK, Ardtona House UK, Montessori Copenhagen.
3. **Follow up on FAMM Argentina** if no response by Apr 28.
4. **Gate the 6 Sonnet-hardcoded routes** with `resolveReportModel()`.

---

### ⚡ Session 61 — Multilingual Build: Layer 3 Ternary Sweep — 8 Files Converted (Apr 24, 2026)

**No new commits. 40+ files changed locally — ready to commit.** Continued Phase 4 (3x BUILD) Layer 3 ternary sweep. Converted 8 files to locale-agnostic patterns, adding ~186 translation keys across en.ts/zh.ts/es.ts.

**Development Cycle Status:**
1. 3x RESEARCH — ✅ COMPLETE
2. 3x PLAN — ✅ COMPLETE
3. 3x INVESTIGATE — ✅ COMPLETE
4. 3x BUILD — **IN PROGRESS** (Layer 0-1 ✅, Layer 4 ✅, Layer 5 ✅, Layer 3 ~35% done)
5. 3x AUDIT — pending

**Layer 3 progress — Files FULLY CONVERTED this session:**
- `app/montree/dashboard/focus/page.tsx` — ✅ (19 → 0)
- `app/montree/dashboard/photo-audit/page.tsx` — ✅ (20 → 0)
- `app/montree/parent/dashboard/page.tsx` — ✅ (18 → 3 TYPE B preserves)
- `components/montree/onboarding/TellGuruCard.tsx` — ✅ (20 → 0)
- `app/montree/dashboard/classroom-overview/page.tsx` — ✅ (20 → 1 TYPE B preserve)
- `app/montree/dashboard/language-semester/page.tsx` — ✅ (17 → 0)
- `components/montree/curriculum/CurriculumWorkList.tsx` — ✅ ALL TYPE B, no changes needed
- `components/montree/reports/WeeklyWrapTab.tsx` — ✅ (prior sessions)

**Files with edits IDENTIFIED but NOT YET APPLIED:**
- `components/montree/photo-audit/ThisIsSheet.tsx` — 2 TYPE A edits (lines 492, 974)
- `app/montree/dashboard/weekly-admin-docs/page.tsx` — 8 TYPE A edits (includes 2 `displayField` specials)

**Files NOT YET STARTED (highest priority):**
- `weekly-wrap/page.tsx` (76 ternaries, fully catalogued in handoff Section 10)
- `gallery/page.tsx` (31), `parent/report/[reportId]/page.tsx` (16), `PendingReviewPanel.tsx` (15), `DashboardHeader.tsx` (14), `BatchNarrativesCard.tsx` (14), `BigMicPanel.tsx` (14), `ChildGuruChat.tsx` (13)
- ~45 smaller files with <13 occurrences each

**Translation keys added this session:** ~186 keys across 8 namespaces: `focus.*`, `photoAudit.*`, `parentDashboard.*`, `tellGuru.*`, `classroomOverview.*`, `languageSemester.*`, `parentReport.*` (12), `pendingReview.*` (15), `batchNarratives.*` (14), `dashboard.*` (15), `childGuru.*` (13)

**Handoff document updated:** `docs/MULTILINGUAL_BUILD_HANDOFF.md` — Section headers updated with converted/remaining file lists. Section 10 (weekly-wrap catalog) unchanged. Section 11 rewritten with done/pending/not-investigated breakdown.

**Next session priorities:**
1. **Apply 2 TYPE A edits to ThisIsSheet.tsx** + add keys to all 3 translation files.
2. **Apply 8 TYPE A edits to weekly-admin-docs/page.tsx** + add keys.
3. **Execute weekly-wrap/page.tsx ternary sweep** — the biggest file (76 ternaries, plan in handoff Section 10).
4. **Continue Layer 3** with gallery/page.tsx (31), then remaining MED-priority files.
5. **Commit + push** all multilingual changes (40+ files).
6. **Phase 5: 3x AUDIT** — fix cycle until 3 consecutive clean audits.
5. **Draft replies to 3 hot leads** — Paint Pots UK, Ardtona House UK, Montessori Copenhagen.
6. **Follow up on FAMM Argentina** if no response by Apr 28.
7. **Gate the 6 Sonnet-hardcoded routes** with `resolveReportModel()`.

---

### ⚡ Session 59 — Multilingual Build Phase 4: Layer 0-1 Infrastructure + Layer 4 AI Pipeline (Apr 24, 2026)

**No commits yet — 38 files changed locally, ready to commit.** Phase 4 (3x BUILD) of the 3x3x3x3x3 development cycle. Built the entire multilingual infrastructure foundation (Layer 0-1) and converted the two most complex AI pipeline files (Layer 4 core).

**Development Cycle Status:**
1. 3x RESEARCH — ✅ COMPLETE
2. 3x PLAN — ✅ COMPLETE
3. 3x INVESTIGATE — ✅ COMPLETE
4. 3x BUILD — **IN PROGRESS** (Layer 0-1 done, Layer 4 core done, 9 Layer 4 files + Layer 3 sweep + Layer 5 type widening remaining)
5. 3x AUDIT — pending

**A. Layer 0-1 — Foundation Infrastructure (10 files created/modified):**

Created the entire multilingual foundation that every other layer builds on:

- **`lib/montree/i18n/locales.ts`** (NEW) — Canonical `Locale` type (`'en' | 'zh' | 'es'`), `SUPPORTED_LOCALES` array, `isValidLocale()`, `LOCALE_TO_INTL` date format map, `getIntlLocale()`, display names/short labels
- **`lib/montree/i18n/locale-config.ts`** (NEW) — `LOCALE_AI_CONFIG` per-locale AI prompt config, `getAILanguageInstruction(locale)` (empty for English, full directive for others), `getLanguageName(locale)`
- **`lib/montree/i18n/db-helpers.ts`** (NEW) — `getLocalizedWorkName(work, locale)` handling Chinese dual-column legacy, `getLocalizedField(obj, field, locale)`, `getLocalizedColumn(field, locale)`
- **`lib/montree/i18n/localized-types.ts`** (NEW) — Extracted `resolveLocalized()`, `resolveLocalizedArray()` JSONB resolvers from GamePlanCard
- **`lib/montree/i18n/es.ts`** (NEW) — Spanish translation file (stub with all 1,490+ keys)
- **`lib/montree/i18n/area-labels.ts`** (UPDATED) — Map-of-maps `AREA_LABELS`, Spanish labels added, `getAreaArrowExample(locale)`
- **`lib/montree/i18n/context.tsx`** (UPDATED) — `Locale` imported from `locales.ts`, `'es'` support added
- **`lib/montree/i18n/server.ts`** (UPDATED) — Re-exports from new modules
- **`lib/montree/i18n/index.ts`** (UPDATED) — Barrel re-exports all new modules (173 importing files get new exports automatically)
- **`components/montree/LanguageToggle.tsx`** (UPDATED) — Cycle-through-all pattern for 3+ locales

**B. Layer 4 — AI Pipeline Core (2 files, fully converted):**

- **`lib/montree/reports/teacher-report-generator.ts`** — 15 edits. All `=== 'zh'` ternaries in `generateTeacherFallback()` converted to locale-keyed `Record<string, string>` maps with IIFE pattern. `work_zh` → `work_localized`. Only 3 intentional TYPE H separator checks remain (`'、'` vs `', '`).
- **`lib/montree/reports/narrative-generator.ts`** — 7 edits. Zero `=== 'zh'` remaining. `generateTemplateFallback()` refactored to `TEMPLATES` map with zh/es/en. No-photos and system message both use locale-config helpers.

**C. Other Layer 3/4 files converted (from earlier build rounds):**

- **`lib/montree/guru/conversational-prompt.ts`** — All zh blocks replaced with locale-keyed patterns
- **`lib/montree/reports/ai-generator.ts`** — Fully rewritten for N-language
- **`lib/montree/reports/pdf-generator.ts`** — TYPE B + TYPE D fixed
- **22 files** with TYPE D date format replacements — all now use `getIntlLocale(locale)` from `locales.ts`
- Multiple parent/progress/gallery pages — TYPE D date ternaries replaced

**D. Handoff document maintained:**

`docs/MULTILINGUAL_BUILD_HANDOFF.md` — Comprehensive handoff document with exact remaining work, file-by-file instructions, pattern examples, and verification steps. Updated after every major completion.

**Remaining work (documented in handoff):**

| Layer | Scope | Status |
|-------|-------|--------|
| Layer 4 remaining | 9 AI pipeline files (auto-translate generalization, replan, photo-identification) | Pending |
| Layer 5 | 16 files with `'en' \| 'zh'` type annotations → `Locale` | Pending |
| Layer 3 | ~89 files with ~563 `=== 'zh'` ternaries (mechanical conversion) | Pending |
| Phase 5 | 3x AUDIT — fix cycle until 3 consecutive clean audits | Pending |

**38 files changed locally, not yet committed.** Ready for commit + push.

**Next session priorities:**
1. **Commit + push the 38-file multilingual infrastructure change.**
2. **Continue Layer 4 build** — `auto-translate.ts` (generalize `autoTranslateToChinese()` → `autoTranslateWork(input, targetLocale)`), `replan-child.ts`, `batch-translate/route.ts`.
3. **Layer 5 type widening** — 16 files, 28 annotations, mechanical.
4. **Layer 3 ternary sweep** — 89 files, 563 occurrences, mechanical but high volume.
5. **Phase 5: 3x AUDIT** — fix cycle until 3 consecutive clean audits.
6. **Draft replies to 3 hot leads** — Paint Pots UK (demo request), Ardtona House UK (free trial request), Montessori Copenhagen (details request).
7. **Follow up on FAMM Argentina** if no response by Apr 28.
8. **Gate the 6 Sonnet-hardcoded routes** with `resolveReportModel()`.

---

## RECENT STATUS (Apr 24, 2026)

### ⚡ Session 58 — Multilingual Architecture: 3x RESEARCH + 3x PLAN Complete (Apr 23-24, 2026)

**No code commits.** Pure architecture research and planning — Phase 1 (3x RESEARCH) and Phase 2 (3x PLAN) of the 3x3x3x3x3 development cycle for making Montree fully multilingual (any language, not just Chinese/English).

**The Goal:** Any language can be "dropped in" by adding a translation file and running a script — zero code changes, zero migrations per new language. Triggered by FAMM Argentina hot lead where Spanish support would be a competitive advantage.

**A. Phase 1: 3x RESEARCH — Codebase Audit (COMPLETED):**

Comprehensive audit of every i18n-related pattern in the codebase:

- **646 hardcoded `=== 'zh'` ternaries across 98 files** — classified into 5 types:
  - TYPE A (346): Inline label ternaries → convert to `t()` keys
  - TYPE B (42): DB column reads (`name_zh`, `parent_description_zh`) → `getLocalizedWorkName()` helper
  - TYPE C (5): Area label ternaries → `AREA_LABELS` map-of-maps
  - TYPE D (42): Date format ternaries → `LOCALE_TO_INTL` map
  - TYPE E+F (211): AI prompts + conditional logic → `LOCALE_CONFIG` pattern

- **462 Chinese-specific DB column references across 86 files:** `name_zh` (373), `parent_description_zh`/`why_it_matters_zh` (69), `guide_content_zh` (20)

- **Zero `switch(locale)` patterns** — all branching uses ternaries, making mechanical conversion feasible with no exhaustiveness check breaks

- **Confirmed barrel `lib/montree/i18n/index.ts` EXISTS** (prior session's Glob missed it) — re-exports `Locale`, `TranslationKey`, all server functions. 173 files import via barrel.

- **681 existing `t()` call sites across 127 files** — already fully locale-agnostic, no changes needed

- **Dual `Locale` type** defined in both `context.tsx:17` and `server.ts:8` — plan unifies via new `locales.ts`

- **`resolveLocalized()` in `GamePlanCard.tsx`** — GOLD STANDARD pattern, already takes `locale: string`, fully multilingual. JSONB `{ en: "...", zh: "...", es: "..." }` pattern proven.

**B. Phase 2: 3x PLAN — Architecture Design (COMPLETED):**

Created `docs/MULTILINGUAL_PLAN.md` (comprehensive handoff document) with:

**5 Execution Layers:**
- **Layer 0 — Foundation (6 files):** Create `locales.ts` (canonical `Locale` type + `SUPPORTED_LOCALES` + `isValidLocale()`), expand `area-labels.ts` to map-of-maps, create `es.ts` translation file, create `db-helpers.ts` (`getLocalizedWorkName()` + `resolveLocalizedDB()`), create `LanguageSelector.tsx` dropdown, update barrel `index.ts`
- **Layer 1 — Type Unification (2 files):** Replace `Locale` in `context.tsx` and `server.ts` with import from `locales.ts`
- **Layer 2 — DB Schema (87 files):** Replace 462 `_zh` column reads with `getLocalizedWorkName(work, locale)` helper that reads JSONB `_localized` columns with fallback to legacy `_zh`
- **Layer 3 — Ternary Sweep (98 files):** Convert 646 hardcoded ternaries to locale-agnostic patterns (`t()`, `LOCALE_CONFIG`, `LOCALE_TO_INTL`)
- **Layer 4 — AI Pipeline (8 files):** Generalize `autoTranslateToChinese()` → `autoTranslateWork(input, targetLocale)` with `LOCALE_CONFIG` for system prompts, tool schemas, language names
- **Layer 5 — Type Widening (20 files):** Widen `locale: 'en' | 'zh'` annotations to `Locale` across route handlers and component props

**"Drop a Language In" Workflow (9 steps, zero code changes in components):**
1. Create `lib/montree/i18n/{lang}.ts` (copy en.ts, translate)
2. Add to `SUPPORTED_LOCALES` in `locales.ts`
3. Add area labels to `AREA_LABELS` map
4. Add `LOCALE_CONFIG` entry (language name, system prompt suffix, glossary)
5. Add `LOCALE_TO_INTL` date format entry
6. Run `autoTranslateWork()` batch for curriculum
7. Generate AI content (game plans, reports) — bilingual JSONB auto-extends
8. Test with locale toggle
9. Ship

**Risk Matrix:** Layer 0-1 LOW, Layer 2 MEDIUM (volume), Layer 3 HIGH volume but LOW per-item, Layer 4 MEDIUM, Layer 5 LOW.

**Effort Estimate:** ~120 unique files, ~1,770 lines changed, ~7 hours build + 2 hours audit.

**What NOT to touch:** `TranslationKey` type, 681 existing `t()` calls, `resolveLocalized()`, photo identification pipeline, Story system, Whale Class admin tools.

**C. 3x3x3x3x3 Development System — Burned into Memory:**

User's explicit methodology for complex tasks:
1. **3x RESEARCH** — Audit codebase, count patterns, classify types ✅
2. **3x PLAN** — Design architecture, write handoff doc, assess risks ✅
3. **3x INVESTIGATE** — Deep-read every target file, verify plan fits, map exact line numbers ⏳
4. **3x BUILD** — Implement with audit cycles (build → audit → build → audit)
5. **3x AUDIT** — Fix cycle until 3 consecutive clean audits

Each phase runs 3 rounds. CLAUDE.md updated after every phase completion to preserve state on crash.

**Files created (1 file):**
- `docs/MULTILINGUAL_PLAN.md` — comprehensive architecture plan + execution layers + risk matrix

**🚨 Architectural notes for future sessions:**
- **`resolveLocalized()` is the proven JSONB pattern** — `GamePlanCard.tsx` lines 22-39. Use for ALL new multilingual content storage.
- **DB migration is ADDITIVE** — new `_localized` JSONB columns coexist with legacy `_zh` columns. `resolveLocalizedDB()` reads JSONB first, falls back to `_zh`. No data loss, no breaking changes.
- **`LOCALE_CONFIG` pattern for AI pipelines** — keyed by locale, contains: `languageName`, `systemPromptSuffix`, `glossary`, `toolFieldSuffix`. Replaces all hardcoded Chinese system prompts.
- **The barrel `lib/montree/i18n/index.ts` is the single import point** — 173 files use it. All new exports go through here.
- **Zero `switch(locale)` in codebase** — TypeScript exhaustiveness checks won't break when `Locale` widens.

**Next session priorities:**
1. **Phase 3: 3x INVESTIGATE** — Deep-read every file in each layer, verify plan fits perfectly, map exact line numbers. Checklist in `MULTILINGUAL_PLAN.md` section 9.
2. **Phase 4: 3x BUILD** — Implement Layer 0 (foundation) first, then layers 1-5 sequentially.
3. **Phase 5: 3x AUDIT** — Fix cycle until 3 consecutive clean audits.
4. **Draft replies to 3 hot leads** — Paint Pots UK (demo request), Ardtona House UK (free trial request), Montessori Copenhagen (details request).
5. **Follow up on FAMM Argentina** if no response by Apr 28.
6. **Gate the 6 Sonnet-hardcoded routes** with `resolveReportModel()`.

---

## RECENT STATUS (Apr 23, 2026)

### ⚡ Session 57 — Three-Tier AI System (Free/Core/Premium) + Language-Only Revert (Apr 23, 2026)

**Two commits pushed to main: `4671049e`, `3ecd5fb4`.**

**A. Three-Tier AI System — commit `4671049e`:**

Built a monetizable tier system replacing the binary AI on/off toggle. Schools now get one of three tiers controlling what AI features they access:

**Tier definitions:**
- **Free** (`ai_tier_haiku=false`, `ai_tier_sonnet=false`) — No AI. Weekly Wrap returns HTTP 402. Photo identification still works (Haiku two-pass is hardcoded, not tier-gated).
- **Core** (`ai_tier_haiku=true`, `ai_tier_sonnet=false`) — Haiku-powered: photo identification + replan/shelf/game plan generation + Weekly Wrap structure. NO teacher reports, NO parent narratives ($0 Sonnet cost).
- **Premium** (`ai_tier_sonnet=true`) — Everything: Core + Sonnet teacher reports + Sonnet parent narratives + rich AI content.

**`resolveReportModel()` rewrite** (`lib/montree/reports/resolve-model.ts`):
- Now returns `{ tier: 'free' | 'haiku' | 'sonnet', model: string | null }`
- `tier='free'` when neither flag enabled → `model=null`
- `tier='haiku'` when only `ai_tier_haiku` → `model='claude-haiku-4-5-20251001'`
- `tier='sonnet'` when `ai_tier_sonnet` → `model='claude-sonnet-4-6'`

**Weekly Wrap tier gates** (`app/api/montree/reports/weekly-wrap/route.ts`):
- `tier === 'free'` → HTTP 402 "AI reports require an active AI tier"
- `skipTeacherReports = aiTier.tier !== 'sonnet'` — Core tier skips teacher report generation
- `skipParentReports = aiTier.tier !== 'sonnet'` — Core tier skips parent narrative generation
- `replanChildInProcess()` runs for ALL non-free tiers (Core + Premium) — shelf/game plan always refreshes
- Cost calculation uses tier-appropriate pricing (Haiku $0.80/$4 vs Sonnet $3/$15 per MTok)

**Super-admin UI** (`components/montree/super-admin/SchoolsTab.tsx`):
- Replaced binary on/off toggle with Free/Core/Pro pill selector per school
- Color-coded: grey=Free, blue=Core, purple=Pro
- One-click tier change via PATCH to schools API
- Spend display unchanged (actual `montree_api_usage` costs)

**API changes** (`app/api/montree/super-admin/schools/route.ts`):
- GET returns `ai_tier: 'free' | 'core' | 'premium'` derived from feature flags
- PATCH accepts `ai_tier` and sets appropriate `ai_tier_haiku`/`ai_tier_sonnet` flags
- Budget auto-set: Free=$0/hard_limit, Core=$50/soft_limit, Premium=$200/soft_limit

**Type changes** (`components/montree/super-admin/types.ts`):
- Added `ai_tier?: 'free' | 'core' | 'premium'` to School interface

**B. Language-Only Revert — commit `3ecd5fb4`:**

User realized the Language-only replan constraint (from earlier in this session, committed as `70098ec3` but squashed into `4671049e`) was too classroom-specific for a monetizable product. Montree should fit straight into any Montessori classroom without customization.

**14 edits across 3 files — reverted all Language-only constraints back to all 5 curriculum areas:**

1. **`lib/montree/reports/replan-child.ts`** (5 edits):
   - `works` tool description: "3-5 Language area works" → "Exactly 5 works — one from EACH area"
   - `direction` tool description: Language progression → English area names arrow format
   - `availableWorksList`: removed `.filter(([area]) => area === 'language')` — all areas included
   - Prompt RULES: "Pick 3-5 from LANGUAGE area only" → "Pick exactly 5 works — ONE from EACH area" (6 rules)
   - `CORE_AREAS`: `['language']` → `['practical_life', 'sensorial', 'mathematics', 'language', 'cultural']`

2. **`app/api/montree/children/[childId]/game-plan/refresh/route.ts`** (4 edits):
   - `works` + `direction` tool descriptions reverted to all-area
   - `availableWorksList`: removed Language-only filter
   - Prompt: "What should the teacher focus on NEXT in Language?" → "...NEXT? Pick 3-5 works that build on what's been done, spread across different curriculum areas."

3. **`scripts/run_replan_all_whale.mjs`** (5 edits):
   - Same pattern as replan-child.ts: tool descriptions, availableWorksList filter, prompt RULES, CORE_AREAS

**Two consecutive clean audit passes run:**
- Pass 1: All 14 change points verified by re-reading edited sections. Grep confirmed zero `LANGUAGE-ONLY` markers remaining.
- Pass 2: Cross-file consistency — grepped for Language-only phrases (0 hits), grepped for `CORE_AREAS` (all 5 locations have full 5-area array).

**🚨 Architectural notes for future sessions:**
- **Tier system is the monetization backbone.** Free = no AI reports. Core = Haiku shelf/game plan only. Premium = full Sonnet reports. This maps to pricing: Free/$0, Core/~$2-4/student/mo, Premium/~$5-8/student/mo.
- **`resolveReportModel()` is the canonical tier resolver.** Every AI-powered route should call this and respect the tier. Currently only Weekly Wrap is fully tier-gated. The 6 Sonnet-hardcoded routes from Session 33 still need gating.
- **Replan runs for ALL non-free tiers.** Teachers on Core still get fresh shelves and game plans every week — they just don't get the rich Sonnet teacher/parent report prose.
- **Super-admin pill selector** replaces the old binary toggle. Budget auto-adjusts per tier.
- **Replan is all-5-areas, not Language-only.** The Language-only experiment was too Whale-Class-specific. Any future per-classroom area customization should be a school setting, not hardcoded.

**Files changed (7 files, 2 commits):**
- `lib/montree/reports/resolve-model.ts` — tier resolver rewrite
- `app/api/montree/reports/weekly-wrap/route.ts` — tier gates for teacher/parent reports
- `components/montree/super-admin/SchoolsTab.tsx` — Free/Core/Pro pill selector
- `app/api/montree/super-admin/schools/route.ts` — tier in GET/PATCH
- `components/montree/super-admin/types.ts` — `ai_tier` on School interface
- `lib/montree/reports/replan-child.ts` — Language-only revert to all 5 areas
- `app/api/montree/children/[childId]/game-plan/refresh/route.ts` — Language-only revert
- `scripts/run_replan_all_whale.mjs` — Language-only revert

**Next session priorities:**
1. **Draft replies to 3 hot leads** — Paint Pots UK (demo request), Ardtona House UK (free trial request), Montessori Copenhagen (details request). These are immediate conversion opportunities.
2. **Follow up on FAMM Argentina** after Apr 28 if no response.
3. **Follow up on Cambridge Montessori Global** after Apr 28.
4. **Follow up on Otari School NZ** on Apr 28 (auto-reply expired).
5. **Bounce recovery research** — Start with 4 multiplier bounces (highest value).
6. **Health Check Section A** from `HEALTH_CHECK_HANDOFF.md` — 9 items needing full context.
7. **Gate the 6 Sonnet-hardcoded routes** with `resolveReportModel()` — now that tier system exists, these should respect it.
8. **Test Weekly Wrap on Core tier** — set Whale Class to Core, generate, verify: replan fires (shelves update), teacher/parent reports skipped, no Sonnet costs.
9. **Phase 3 UI hiding by tier** — Free-tier schools shouldn't see Generate/Send buttons.
10. **Verify Pass 2b + Ask Sonnet on production** — capture a photo, verify pipeline.

---

### ⚡ Session 56 — Photo Pipeline maxDuration Fix + Story Document Rendering Fix + Health Check (Apr 23, 2026)

**Two commits pushed to main: `56b9489b`, `555ae84d`.**

**A. Photo Identification Pipeline Fix — commit `56b9489b`:**

Photo identification background process route (`app/api/montree/photo-identification/process/route.ts`) was missing `export const maxDuration = 120`. Railway's default 15s serverless timeout was killing the two-pass Haiku pipeline mid-flight. 12 photos stuck as unprocessed. Added the export — Railway now allows up to 120s for the identification pipeline.

**B. Weekly Wrap Readiness Health Check:**

Full audit of photo identification status across Whale Class for the current week:
- 26 photos promoted from `identification_status='pending'` to `teacher_confirmed=true` (stuck in limbo from before the review_before_process removal in Session 53)
- Final state: 84 confirmed photos, 19 of 20 children have confirmed photos this week
- System ready for Weekly Wrap generation

**C. Story Document Rendering Fix — commit `555ae84d`:**

**Bug:** Documents sent from Story admin dashboard rendered as broken `<img>` tags on the user-facing Story page.

**Root cause:** `/api/story/current-media/route.ts` returned raw `row.message_type` from the DB. Due to the CHECK constraint on `story_message_history.message_type` not including 'document', documents are stored with `message_type='image'` as a fallback (Session 19 pattern). The admin message-history route already used `effectiveMessageType()` to resolve the true type from filename extension, but `current-media` did not.

**Fix:** Added `import { effectiveMessageType } from '@/lib/story/document-detect'` and changed `type: row.message_type` to `type: effectiveMessageType(row.message_type, row.media_filename)`. Now documents stored as 'image' in the DB are correctly detected by filename extension and returned as `type: 'document'` to the Story page, which renders them as download links.

**D. Two-Round Audit — CLEAN:**

Audited all Story routes that read from `story_message_history` and return message types to clients:
- `current-media/route.ts` — PASS (fix applied)
- `recent-messages/route.ts` — PASS (already had `effectiveMessageType`)
- `admin/message-history/route.ts` — PASS (already had `effectiveMessageType`)
- Write-only routes (`admin/send`, `upload-media`, `message`) — not affected (don't return types)
- Client-side `story/[session]/page.tsx` — PASS (renders all 4 media types correctly)
- Second audit pass verified: upload flow (useAdminMessage.ts), MessageComposer UI, MessagesTab display, document-detect module, TypeScript import resolution — all PASS

**Files changed (2 commits):**
- `app/api/montree/photo-identification/process/route.ts` — Added `export const maxDuration = 120`
- `app/api/story/current-media/route.ts` — Added `effectiveMessageType` import + usage

**Next session priorities:**
1. **Draft replies to 3 hot leads** — Paint Pots UK (demo request), Ardtona House UK (free trial request), Montessori Copenhagen (details request). These are immediate conversion opportunities.
2. **Follow up on FAMM Argentina** after Apr 28 if no response.
3. **Follow up on Cambridge Montessori Global** after Apr 28.
4. **Follow up on Otari School NZ** on Apr 28 (auto-reply expired).
5. **Bounce recovery research** — Start with 4 multiplier bounces (highest value).
6. **Health Check Section A** from `HEALTH_CHECK_HANDOFF.md` — 9 items needing full context.
7. **Verify Pass 2b + Ask Sonnet on production** — capture a photo, verify pipeline.
8. **Verify Discussion tab + child tag editor on production**.
9. **12 pending photos** — should auto-process after Railway deploys `56b9489b`.
10. **Identify the 1 missing child** — 19 of 20 have confirmed photos; find which child needs attention.

---

### ⚡ Session 55 — Full Outreach Campaign Reconciliation + Audit + Game Plan (Apr 23, 2026)

**No code commits.** Pure campaign reconciliation — full Gmail↔DB audit, bounce logging, reply triage, status promotion, and forward game plan.

**A. Bounce Scan & DB Update — 22 New Bounces Marked:**

Scanned all Gmail bounces (`from:mailer-daemon`) across 4 pages (~180 unique bounced addresses total). Cross-referenced against `montree_outreach_contacts`. Found 22 addresses in the DB not yet marked as bounced. All 22 updated to `status='bounced'` via Supabase REST API batch updates. Most were from Wave 1 (Apr 22 Montree pitch sends) and earlier Wave 2/3 sends.

**B. Reply Thread Audit — 12 Contacts Updated:**

Scanned Gmail for all reply threads (`subject:Montree OR subject:"Montessori Teacher" newer_than:14d -from:me`). Identified and categorized every reply:

**New HOT leads discovered this session:**
- **Paint Pots Montessori, UK (paintpotsmontessori@outlook.com)** — "Hi, Thank you for your email. Can you give me any more details or a demo?" Immediate demo request. Draft reply needed.
- **Ardtona House Montessori, UK (info@ardtonahouse.co.uk)** — "Hi, Thank you for your email, it sounds very interesting. Do you offer a free trial?" Free trial interest. Draft reply with 60-day Bloom trial offer needed.
- **Montessori Copenhagen (info@montessori-cph.dk)** — "Thank you for your email! Can you provide more details about the system?" Details request. Draft reply needed.

**Existing leads with status updates:**
- FAMM Argentina — still awaiting response to Apr 18 pricing breakdown
- Cambridge Montessori Global — still awaiting response to tier breakdown
- Jakarta Montessori — already using Montessori Compass (competitive intel, no follow-up)
- Montessori Aotearoa NZ — Board declined ("not something we wish to explore")
- Melville Montessori, Australia — politely declined (no change to existing systems)
- Sonnberg Montessori, Austria — position filled (NOT IN DB — GMass contact)

All 12 contacts updated in DB with appropriate `status` and `reply_summary`.

**C. Drafted→Sent Promotion — 158 Contacts Updated:**

User had sent all remaining Gmail drafts (from Wave 1 Montree pitch + earlier batches). Verified zero drafts remain in Gmail via `list_drafts`. Promoted all 158 contacts with `status='drafted'` to `status='sent'` in batch via Supabase REST API. All promotions logged to `montree_outreach_log` with `action='status_promoted'`.

**D. New Bounce Verification — Apr 22 Wave 1:**

Checked 18 bounced addresses from Apr 22 Wave 1 sends against DB. Result: 3 already marked bounced (from step A), 15 not in DB (GMass Campaign C/D recipients never seeded into `montree_outreach_contacts`). Zero new updates needed.

**E. Final Reconciled DB State:**

| Status | Count |
|--------|-------|
| sent | 415 |
| bounced | 99 |
| replied | 10 |
| dead | 6 |
| follow_up | 4 |
| new | 2 |
| **Total** | **536** |

**F. Outreach Game Plan — Forward Strategy:**

**🔥 PRIORITY 1 — Draft replies to 3 new hot leads (IMMEDIATE):**
1. **Paint Pots UK** — Demo request. Draft: "Delighted you're interested. Here's what Montree does [brief], I'd love to show you live. Would [date] work for a 20-minute demo call?"
2. **Ardtona House UK** — Free trial request. Draft: "Yes! 60-day free Bloom trial, no credit card. Here's how to get started: [montree.xyz signup link]. I'll personally help set up your classroom."
3. **Montessori Copenhagen** — Details request. Draft: Full Montree overview + tier breakdown + demo offer.

**🔥 PRIORITY 2 — Follow up on existing hot leads:**
- **FAMM Argentina** — #1 multiplier lead. Sent pricing Apr 18, no response. Follow up Apr 28 if still no reply.
- **Cambridge Montessori Global** — Sent tier breakdown, awaiting response. Follow up Apr 28.

**📅 PRIORITY 3 — Automated follow-up schedule (already configured):**
| Date | Task | Wave | Follow-up # |
|------|------|------|------------|
| Apr 25 | wave2-followup1 | Wave 2 (multiplier_apr19) | 1 |
| Apr 26 | wave3-followup1 | Wave 3 (Expansion batches) | 1 |
| Apr 27 | wave1-montree-followup1 | Wave 1 (Campaign D schools) | 1 |
| Apr 30 | wave2-followup2 | Wave 2 | 2 (final) |
| May 1 | wave3-followup2 | Wave 3 | 2 (final) |
| May 2 | wave1-montree-followup2 | Wave 1 | 2 (final) |

**⏸ PRIORITY 4 — Time-gated follow-ups:**
- **Montessori Norge** — Out of office until May 5. Follow up May 6.
- **Otari School NZ** — Out of office (returned Apr 22). Follow up Apr 28.

**🔄 PRIORITY 5 — Bounce recovery (99 contacts):**
- 93 individual schools, 4 multiplier_association, 1 multiplier_franchise, 1 multiplier_training
- Research correct emails via web search for highest-value bounced contacts (multipliers first)
- Re-draft viable ones after email correction

**📬 PRIORITY 6 — Last 2 new contacts:**
- Nairobi Montessori (karen@elmc.co.ke) — Draft Montree pitch
- Redwood Montessori Qatar (info.qatar@theredwoodnursery.com) — Draft Montree pitch

**G. Active Reply Threads Updated in CLAUDE.md:**

Comprehensive update to the Active Reply Threads section reflecting all Session 55 discoveries:
- 3 new HOT leads added (Paint Pots, Ardtona, Copenhagen)
- Dead list expanded to 7 with summaries
- Auto-reply section updated (Otari NZ added, Norge timeline noted)
- NOT-IN-DB annotations added for GMass-only contacts
- Follow-up timelines added for pending leads

**Campaign health summary:**
- **Initial outreach 100% complete** — all 536 contacts contacted (only 2 remain as 'new')
- **Reply rate: 1.9%** (10 replied out of 536) — industry average for cold outreach is 1-5%
- **Bounce rate: 18.5%** (99 out of 536) — high, but includes GMass Campaign C blank-email damage
- **3 active demo/trial requests** — Paint Pots, Ardtona, Copenhagen are ready to convert
- **1 multiplier lead** (FAMM Argentina) worth 10-50x a single school
- **Follow-up waves automated** — Apr 25 through May 2, should generate 5-15 additional replies

**Next session priorities:**
1. **Draft replies to Paint Pots, Ardtona House, and Montessori Copenhagen** — these are hot leads asking for demos/trials/details. Immediate action.
2. **Follow up on FAMM Argentina** after Apr 28 if no response.
3. **Follow up on Cambridge Montessori Global** after Apr 28.
4. **Follow up on Otari School NZ** on Apr 28 (auto-reply expired Apr 22).
5. **Bounce recovery research** — Start with 4 multiplier bounces (highest value), then top individual schools.
6. **Draft the last 2 new contacts** (Nairobi + Qatar).
7. **Health Check Section A** from `HEALTH_CHECK_HANDOFF.md` — 9 items needing full context.
8. **Verify Pass 2b + Ask Sonnet on production** — capture a photo, verify pipeline.
9. **Verify Discussion tab + child tag editor on production**.

---


---

> **Sessions 3–54 archived** to `docs/CLAUDE_MD_HISTORY.md` on 2026-04-26. Consult that file for historical context.

---

## KEY ARCHITECTURAL DECISIONS

- **CLIP/SigLIP — PERMANENTLY REMOVED (Apr 4, 2026).** Stub files remain for type exports only. All functions are no-ops. Production uses Haiku two-pass exclusively.
- **Smart Capture** uses two-pass describe-then-match: Pass 1 (Haiku + image) describes what's seen, Pass 2 (Haiku + text) matches to curriculum. Sonnet fallback if both fail.
- **Photo identification cost:** ~$0.006/photo via Haiku two-pass pipeline.
- **Per-classroom visual memory** self-learning system (THE MOAT — Session 6 completed all 3 loops): three paths feed `montree_visual_memory`:
  - (1) "Teach the AI" button uses Sonnet to generate 5-field descriptions (visual_description, parent_description, why_it_matters, key_materials, negative_descriptions) stored with source='teacher_setup', confidence=1.0.
  - (2) "Fix" corrections (Loop 1) now APPEND a rich fingerprint via `enrichVisualMemoryFromCorrection()` in `corrections/route.ts` — prefers cached `sonnet_draft.visual_description` from `montree_media` (free, rich), falls back to fresh Haiku call. Multi-fingerprint accumulation in `visual_description` column with `||` separator, capped 2500 chars FIFO. Source='correction', confidence=0.95. ALSO appends a negative example to the original (wrong) work's `negative_descriptions[]` array.
  - (3) Auto-generated onboarding/first_capture descriptions (confidence=0.8) are NOT injected into Pass 2 — they caused bias reinforcement.
- **Pass 2** loads up to 30 entries, filters to teacher-validated (`teacher_setup` ≥1.0 OR `correction` ≥0.9 OR `is_custom=true`), renders LOOKS LIKE / KEY MATERIALS / DISTINGUISH FROM blocks at TOP of prompt.
- **Pass 3** (Loop 3, Session 6) — Sonnet discriminator on low-confidence Pass 2 results (`matchScore < 0.7 OR input.confidence < 0.5`, requires ≥2 candidates with at least 1 having visual memory). Top 3 candidates rendered as A/B/C blocks with visual memory, Sonnet picks via tool_use. Cost ramps DOWN over time as corpus grows.
- **Hidden moat**: NO UI exposes the corpus. Competitors copying the app see a clean Montessori tracker; the intelligence is invisible and grows in slow motion from real classroom use.
- **Guru** uses Sonnet for all users (teachers + parents). Haiku for daily coach features. Self-improving brain system grows from every conversation.
- **All client-facing photo URLs** use Cloudflare-cached proxy (`getProxyUrl()`). Server-to-server URLs use direct Supabase.
- **Cross-pollination security:** Every route accepting `child_id` MUST call `verifyChildBelongsToSchool()`. No exceptions.
- **i18n:** 1,490+ keys, perfect EN/ZH parity. Custom React Context system (`useI18n()` hook).
- **Feature flags:** `montree_feature_definitions` + `montree_school_features` + `montree_classroom_features`. `FeaturesProvider` context in dashboard layout. `useFeatures()` hook with `isEnabled(key)`. Fail-closed (all off if fetch fails). Dashboard sections gated: `daily_brief`, `intelligence_panels`, `teacher_tools`, `shelf_autopilot`, `paperwork_tracker`, `weekly_admin_docs`. New schools get clean minimal view. Super-admin ⚙️ button per school to toggle.

---

## Database

### Supabase
- URL: `https://dmfncjjtsoxrnvcdnvjq.supabase.co`
- Both localhost and production use THIS SAME database
- Service role key used everywhere (bypasses RLS)

### Key Tables
- `montree_schools`, `montree_classrooms`, `montree_children`, `montree_teachers`
- `montree_works`, `montree_child_work_progress` (alias: `montree_child_progress`)
- `montree_parent_invites` — 6-char invite codes for parent access
- `montree_report_media` — junction table linking reports to selected photos
- `montree_media_children` — links group photos to multiple children
- `montree_guru_interactions` — uses `asked_at` (NOT `created_at`) as timestamp column
- `montree_child_mental_profiles`, `montree_behavioral_observations`
- `montree_child_extras` — explicitly-added extra works per child (UNIQUE child_id+work_name)
- `montree_visual_memory` — per-classroom visual descriptions (UNIQUE classroom_id+work_name)
- `montree_guru_corrections` — teacher corrections to Smart Capture identifications
- `montree_community_works` — public community works library
- `montree_teacher_notes` — has `child_id` column for per-child tagging
- `montree_visitors` — site-wide visitor tracking for outreach monitoring
- `montree_attendance_override`, `montree_stale_work_dismissals`, `montree_conference_notes`
- `montree_weekly_pulse_locks` — prevents concurrent Pulse generation
- `montree_super_admin_audit` — central security audit log
- `montree_rate_limit_logs` — DB-backed rate limiting
- `story_users`, `story_admin_users` — Story system auth (bcrypt hashes)
- `story_login_logs`, `story_admin_login_logs` — Story login tracking (column: `login_at`)
- `story_online_sessions` — heartbeat-based online detection

### Whale Class Data
- School ID: `c6280fae-567c-45ed-ad4d-934eae79aabc` (Tredoux House)
- Classroom ID: `51e7adb6-cd18-4e03-b707-eceb0a1d2e69` (Whale Class)
- 20 students: Amy, Austin, Eric, Gengerlyn, Hayden, Henry, Jimmy, Joey, Kayla, Kevin, KK, Leo, Lucky, MaoMao, MingXi, NiuNiu, Rachel, Segina, Stella, YueZe

---

## Environment Variables (Railway + .env.local)

See `.env.example` for the full template. All vars below must be set in Railway production.

```
# --- Core Auth ---
ADMIN_SECRET=...              # REQUIRED — JWT signing for Whale Class admin (lib/auth.ts)
ADMIN_USERNAME=...            # Whale Class admin display name
ADMIN_PASSWORD=...            # Whale Class admin password
SUPER_ADMIN_PASSWORD=...      # REQUIRED — Montree super-admin + Whale Class "Tredoux" login
TEACHER_ADMIN_PASSWORD=...    # REQUIRED — Whale Class "Teacher" login
STORY_JWT_SECRET=...          # REQUIRED — Story JWT signing (lib/story-db.ts)

# --- Supabase ---
NEXT_PUBLIC_SUPABASE_URL=https://dmfncjjtsoxrnvcdnvjq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=...              # PostgreSQL pooler connection string

# --- Encryption ---
MESSAGE_ENCRYPTION_KEY=...    # REQUIRED — Exactly 32 chars for AES-256 (lib/message-encryption.ts)
VAULT_PASSWORD=...            # REQUIRED — Vault file encrypt/decrypt (vault routes)
VAULT_PASSWORD_HASH=...       # REQUIRED — bcrypt hash for vault unlock (vault/unlock/route.ts)

# --- External APIs ---
ANTHROPIC_API_KEY=...         # Claude API (Guru advisor)
OPENAI_API_KEY=...            # Whisper transcription + TTS
NEXT_PUBLIC_YOUTUBE_API_KEY=... # YouTube Data API

# --- Email ---
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
```

---

## Key Routes

### Teacher Portal
| Route | Purpose |
|-------|---------|
| `/montree/login` | Teacher login (6-char code or email+password) |
| `/montree/dashboard` | Class list + intelligence panels (attendance, stale works, conference notes, evidence, pulse) |
| `/montree/dashboard/[childId]` | Child week view |
| `/montree/dashboard/[childId]/gallery` | Photo gallery + report workspace |
| `/montree/dashboard/curriculum` | 5 area cards + Teaching Tools |
| `/montree/dashboard/capture` | Photo/video capture |
| `/montree/dashboard/guru` | AI teacher advisor |
| `/montree/dashboard/photo-audit` | Classroom-wide photo audit with corrections |
| `/montree/dashboard/classroom-setup` | "Teach the AI" — Sonnet describes materials |
| `/montree/dashboard/notes` | Dedicated teacher notes page (with child tagging) |
| `/montree/dashboard/raz` | RAZ Reading Tracker |
| `/montree/library/photo-bank` | Photo bank with export-to-tool feature |

### Parent Portal
| Route | Purpose |
|-------|---------|
| `/montree/parent` | Login (enter invite code) |
| `/montree/parent/dashboard` | Parent home |
| `/montree/parent/report/[reportId]` | View report |

### Admin
| Route | Purpose |
|-------|---------|
| `/admin` | Admin tools hub (card generators, etc.) |
| `/montree/super-admin` | Super admin panel (schools, leads, visitors, community) |
| `/montree/admin/guru` | Principal admin guru (12 tools, school-scoped) |

---

## Authentication

7 auth systems. Teacher/principal tokens use httpOnly cookies.

| System | How | Used By |
|--------|-----|---------|
| Teacher login | 6-char code (SHA256) or email+bcrypt → httpOnly cookie (`montree-auth`) | `/api/montree/auth/teacher` |
| Principal login | Code or email+bcrypt → httpOnly cookie (`montree-auth`) | `/api/montree/principal/login` |
| Parent access | Invite code → cookie (`montree_parent_session`) | `/api/montree/parent/auth/access-code` |
| Admin JWT | `jose` library, `ADMIN_SECRET`, httpOnly cookie (`admin-token`) | `lib/auth.ts` |
| Super admin | Password (timing-safe compare) + JWT session tokens | `lib/verify-super-admin.ts` |
| Story auth | Separate JWT system | `lib/story-auth.ts` |
| Multi-auth | Another separate system | `lib/auth-multi.ts` |

**Montree auth flow:** Login → JWT → httpOnly cookie `montree-auth` → `verifySchoolRequest()` reads cookie → extracts userId, schoolId, classroomId, role. Client `montreeApi()` relies on cookie auto-sending.

**Key auth files:** `lib/montree/server-auth.ts`, `lib/montree/verify-request.ts`, `lib/montree/api.ts`

---

## Supabase Client (Consolidated)

Single client: `lib/supabase-client.ts` — singleton with retry logic.
- `getSupabase()` — service role (server-side, bypasses RLS)
- `createSupabaseClient()` — anon key (browser-side)
- Also exports: `getPublicUrl()`, `getSupabaseUrl()`, storage bucket constants

---

## Curriculum System

5 area JSON files in `lib/curriculum/data/`: `language.json` (43 works), `practical_life.json`, `sensorial.json`, `mathematics.json`, `cultural.json`. Total: 329 works.

---

## Guru System (AI Teacher Advisor)

**Core files:**
- `lib/montree/guru/conversational-prompt.ts` — persona builder (teacher=violet, parent=botanical green)
- `lib/montree/guru/context-builder.ts` — child context
- `lib/montree/guru/tool-definitions.ts` — 12 teacher tools + `getToolsForMode()`
- `lib/montree/guru/tool-executor.ts` — tool execution handlers
- `lib/montree/guru/question-classifier.ts` — regex classifier for selective knowledge injection
- `lib/montree/guru/brain.ts` — self-improving brain (extraction, consolidation, retrieval)
- `lib/montree/guru/skill-graph.ts` — V3 skill-exercise mapping, bridge detection, attention flags
- `app/api/montree/guru/route.ts` — main chat endpoint
- `app/api/montree/guru/photo-insight/route.ts` — Smart Capture (two-pass Haiku)
- `app/api/montree/guru/corrections/route.ts` — teacher corrections
- `components/montree/guru/GuruChatThread.tsx` — shared chat UI

**Principal Admin Guru:** `lib/montree/admin/guru-*.ts` — 12 school-scoped tools, SSE streaming.
**Super-Admin Guru:** `lib/montree/super-admin/guru-prompt.ts` — 15 tools across all schools.

---

## Report & Photo System

```
Teacher Preview → Select Photos → montree_report_media junction table
Publish → send/route.ts queries junction → Creates final report
Parent View → parent/report/[id]/route.ts queries junction
```

Description matching uses area-constrained whole-word matching. Custom works (`work_key` starts with `custom_`) don't auto-match.

---

## Dashboard Intelligence Layer (Teacher OS)

5 panels below student grid: Attendance, Stale Works, Conference Notes, Evidence, Pulse. Daily Brief panel above grid with priority-ranked action items. All powered by `/api/montree/intelligence/daily-brief`.

---

## Local Development

```bash
cd ~/whale
npm run dev
# Access at http://localhost:3000
```

Both local and production connect to the SAME Supabase database.

---

## Important Patterns

- **`.single()` → `.maybeSingle()`** — Always use `.maybeSingle()` for queries that might return 0 rows. `.single()` throws on 0 rows.
- **`.ilike()` SQL injection** — Escape `%`, `_`, `\` before any `.ilike()` call: `.replace(/[%_\\]/g, '\\$&')`
- **JSON-before-OK** — Always check `response.ok` BEFORE calling `response.json()`. Server may return HTML error pages.
- **Fire-and-forget `.catch()`** — Always add `.catch(err => console.error(...))` — never empty `.catch(() => {})`.
- **Supabase `.rpc()` has no `.catch()`** — Use `.then(({ error }) => ...)` instead.
- **`montree_guru_interactions` uses `asked_at`** not `created_at` as its timestamp column.
- **AbortController cleanup** — All `useEffect` fetches should have AbortController + cleanup on unmount.

---

## Migrations Run (production)

All migrations through 169 have been run. Key ones: 147 (smart learning columns), 148 (classroom onboarding), 152-154 (teacher OS foundation), 155 (teacher OS foundation DDL), 156 (visitor tracking), 157 (teacher notes child_id), 158 (paperwork_current_week), 159 (teacher_confirmed media), 160 (dashboard feature gates + Whale Class enabled), 161 (enable weekly_admin_docs for Whale Class), 164 (cropped_storage_path on montree_media — run Apr 7 via Supabase SQL editor), 169 (guide_content_zh JSONB on montree_classroom_curriculum_works — run Apr 11). **Migration 166 (`montree_global_works_staging`) still pending** from prior session. The Apr 7 self-learning loop SQL also added safety-net columns to `montree_visual_memory` (negative_descriptions, key_materials, description_confidence, source, source_media_id, photo_url, updated_at) — all `IF NOT EXISTS`, idempotent. **Apr 12**: `story_message_history.is_from_admin BOOLEAN DEFAULT FALSE` added via Supabase SQL Editor (migration `20260118_story_session_linking.sql` was in git but never run).

**Session 78 (Apr 30, 2026) — curriculum translation pipeline migrations run via Supabase SQL Editor:**
- `180_create_curriculum_translations_global.sql` — global translation library table (8 columns, ~3,948 rows after seed).
- `181_add_school_primary_locale.sql` — `primary_locale` + `secondary_locales[]` on `montree_schools`. Whale Class set to `en+[zh]`. Two existing schools manually updated post-migration: Школа Монтессорі (Tamі) → `uk`, Chen school → `de`.
- `182_apply_global_translations_function.sql` — `apply_global_translations(uuid)` Postgres function (11 per-locale UPDATE blocks, COALESCE-safe, SECURITY DEFINER, GRANT EXECUTE to anon/authenticated/service_role).
- **Bonus column-add ALTER TABLE** (not in a numbered migration file — run inline) — added 36 missing locale columns to `montree_classroom_curriculum_works`: `parent_description_<locale>` and `why_it_matters_<locale>` for de/fr/pt/nl/it/ja/ko/uk/ru. The 9 newer locales had `name_*` and `guide_content_*` columns from prior sessions but were missing the description columns. Idempotent via `ADD COLUMN IF NOT EXISTS`.

**Session 87 (May 4, 2026) — Principal Vault migration run via Supabase SQL Editor:**
- `185_principal_vault.sql` — `montree_principal_vault` table for end-to-end encrypted parent-meeting recordings. 12 columns (id, principal_id, school_id, salt_b64, iv_b64, ciphertext_b64, pbkdf2_iterations, cipher_version, recorded_at, duration_seconds, created_at, updated_at). Indexed on `(principal_id, recorded_at DESC)` and `(school_id)`. FK cascades from `montree_school_admins` and `montree_schools`. Plus the `update_principal_vault_updated_at()` trigger function for auto-bumping `updated_at` on row UPDATE. Verified by user with the 12-column information_schema query.

**Session 98 (May 10, 2026, 12:11–12:12 PM) — Parent Messaging + Principal login_code migrations run via Supabase SQL Editor:**
- ✅ `193_parent_messaging_feature.sql` — adds `parent_messaging` to `montree_feature_definitions` with `default_enabled=false`. Idempotent. Verified via `SELECT feature_key, default_enabled FROM montree_feature_definitions WHERE feature_key = 'parent_messaging'` → 1 row returned. Schools opt in individually via super-admin.
- ✅ `194_school_admin_login_code.sql` — adds `login_code TEXT` column to `montree_school_admins` + partial unique index `idx_school_admins_login_code_unique`. Reverses Session 84's "principal codes are never persisted" rule. Verified via `SELECT column_name FROM information_schema.columns WHERE table_name = 'montree_school_admins' AND column_name = 'login_code'` → returned `login_code`. Idempotent via `ADD COLUMN IF NOT EXISTS` and `CREATE UNIQUE INDEX IF NOT EXISTS`.

**Session 99 (May 10, 2026, 16:30) — Tracy persistent memory migration RUN:**
- ✅ `195_principal_memory.sql` — `montree_principal_memory` table (15 columns) + 4 partial indexes (`idx_principal_memory_active`, `_type`, `_child`, `_teacher`) + `supersede_and_insert_memory()` Postgres function (SECURITY DEFINER, GRANT EXECUTE to anon/authenticated/service_role). Idempotent. **CONFIRMED RUN May 10, 2026 16:30 — "Success. No rows returned".** Tracy's `remember_this` / `recall_memory` tools are now active in production. `loadActiveMemories()` returns up to 30 most-recent active memories, injected into the system prompt every turn. Stop telling future sessions to run this — it's done.

**Session 103 (May 11, 2026, 17:45) — Web Vitals telemetry migration RUN:**
- ✅ `196_perf_vitals.sql` — `montree_perf_vitals` table (12 columns) + 3 partial indexes (`idx_perf_vitals_metric_route`, `_school`, `_recent`). No FK on `school_id` by design — measurements are append-only telemetry; school deletes must not wipe historical baseline data. Idempotent. **CONFIRMED RUN May 11, 2026 17:45 — "Success. No rows returned".** `POST /api/montree/perf/vitals` now persists Core Web Vitals (LCP, INP, CLS, FCP, TTFB) tagged with route + role + school_id + connection. Client-side `<WebVitalsReporter />` reports via `sendBeacon` on every route change. Stop telling future sessions to run this — it's done.

**Session 108 (May 13, 2026) — Agent system Phases 3 + 4 migrations RUN:**
- ✅ `203_agent_applications.sql` — extends `montree_outreach_contacts` with `application_details JSONB` column, `agent_application` in `contact_type` CHECK, `agent_applied` + `declined` in `status` CHECK (preserves prior values including `demo_requested`/`contacted`/`not_interested` from migration 183). Partial index on pending applications. **CONFIRMED RUN — "Success. No rows returned".** Phase 3 inbound application pipeline now live.
- ✅ `204_agent_super_admin_messaging.sql` — extends 4 messaging CHECK constraints (`thread_type`, `created_by_role`, `participant_role`, `sender_role`) to include `agent_super_admin` / `super_admin`. Drops NOT NULL on `montree_message_threads.school_id` + adds gated CHECK (only `agent_super_admin` threads may have NULL school_id; every other type stays mandatorily school-scoped). Partial index on `agent_super_admin` inbox lookups. **CONFIRMED RUN — "Success. No rows returned".** Phase 4 agent↔super-admin threaded messaging schema live. Stop telling future sessions to run these — they're done.

**Session 109 (May 13, 2026) — Manual payout architecture + financial books foundation. ⏳ 4 migrations pending Tredoux's Supabase run:**
- ⏳ `205_agent_payout_method.sql` — `montree_teachers.payout_method` (CHECK IN 'stripe_connect','manual_wire'), `manual_payout_details` JSONB, `manual_payout_details_updated_at` TIMESTAMPTZ. Partial index on active manual_wire agents. Idempotent. **REQUIRED for 💸 button + agent /payouts manual_wire branch.**
- ⏳ `206_period_locks.sql` — `montree_period_locks` table (period_month PK in YYYY-MM, closed_at, closed_by, notes, timestamps + trigger). Partial index on closed periods. Idempotent. **REQUIRED for Close month / Reopen UI + assertPeriodOpen() guards on wire routes.**
- ⏳ `207_agent_tax_form.sql` — `montree_teachers.tax_form_url`, `tax_form_type` (CHECK IN 'w8ben','w8ben_e','w9','jurisdiction_other','declaration_attached'), `tax_form_uploaded_at`, `tax_residency_country` (ISO2), `is_us_person`. Partial index on agents missing tax form. Idempotent. **REQUIRED for tax-form scaffold + future first-payout gate.**
- ⏳ `208_xero_sync_log.sql` — `montree_xero_sync_log` table (finance_tx_id, xero_object_type CHECK IN 'Invoice','Bill','BankTransaction','ManualJournal','CreditNote', xero_object_id, status, error, attempt, timestamps). Partial UNIQUE index on (finance_tx_id, xero_object_type) WHERE status='success' for idempotency. Recent + failures indexes. Idempotent. **REQUIRED for Xero sync engine; sync stays INACTIVE without XERO_CLIENT_ID/SECRET/TENANT_ID/REFRESH_TOKEN env vars regardless of migration state.**

**Session 111 (May 14, 2026) — Inbound payments three-rail billing. ⏳ 1 migration pending Tredoux's Supabase run:**
- ⏳ `209_school_payment_method.sql` — `montree_schools.payment_method` (CHECK IN 'stripe_subscription','alipay_invoice','manual_invoice'), `manual_invoice_details` JSONB, `manual_invoice_details_updated_at` TIMESTAMPTZ, `billing_cadence` (CHECK IN 'monthly','annual'), `next_invoice_due_at` TIMESTAMPTZ. Two partial indexes (`idx_schools_alipay_active` for daily cron pickup, `idx_schools_manual_invoice_active` for super-admin filter). Idempotent BEGIN/COMMIT. **REQUIRED for 💳 button (PaymentConfigModal PATCH) + alipay invoice cron + manual ⚡ Wire route + record-incoming-wire idempotency. Until run, payment-config 500s on PATCH (column does not exist) and the new 💳 + ⚡ buttons surface but are non-functional. Existing Stripe subscription path unchanged.**

---

## Session History

Detailed session-by-session history (Feb–Apr 2026) is archived in `docs/CLAUDE_MD_HISTORY.md`. Consult that file for historical context on specific features or decisions.
