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

## 📧 GMASS OUTREACH CAMPAIGN — "Montree" (cold email to schools)

**TL;DR:** Outreach is run via **GMass** (Gmail mail-merge extension), driven off the user's spreadsheet **`Montree_Global_Outreach.xlsx`** (also lives as a Google Sheet that GMass syncs Status/DateSent back to). NOT sent from the whale codebase. The super-admin "outreach-campaign" page in the repo is a template builder only — `Mark as Sent` writes to localStorage, never DB. Ignore it.

**The list:** 420 schools across 7 batches — Asia 61, Europe 86, Middle East 56, South Asia 80, Africa 38, Americas 71, Oceania 28. Columns: SchoolName, Email, Country, Region, Website, ContactPerson, Accreditation, AgeRange, DateSent, Status, FollowUp1Sent, FollowUp2Sent, Notes, Batch. As of Apr 7, 2026 only 8 marked Sent in the xlsx (53 blank, 359 Pending) — but GMass campaign report shows 201+ opens already from the Mar 28 send, so the spreadsheet is out of sync with reality. Always re-pull from GMass dashboard / Google Sheet, don't trust the local xlsx.

**Why "it stopped at 50":** Free Gmail (`tredoux555@gmail.com`, gmail.com not Workspace) is hard-capped by Gmail at ~500/day, and GMass self-throttles to ~50/day on free Gmail accounts to protect deliverability. The campaign isn't broken — it's pacing. To "send the rest" the user needs to either (a) resume/extend the campaign in GMass over multiple days, or (b) upgrade to Google Workspace for the higher cap. The "paid Google account" the user mentions is likely paid GMass, not paid Workspace — verify before assuming higher caps.

**GMass campaign details — CORRECTED Apr 7 from dashboard:**
There are **4 separate "Montree" campaigns** all sent on 2026-03-28, NOT one. Totals across all four = **64 schools sent** (not 50). The big one had a 34.7% bounce rate which is the single biggest deliverability risk for the next send.

| Campaign ID | Recipients | Opens | Bounces | Replies |
|---|---|---|---|---|
| 50490844 | 9 | 6 (66.7%) | 1 | 0 |
| 50489320 | **49** | 16 (32.7%) | **17 (34.7%)** | 1 |
| 50489098 | 3 | 1 | 1 | 0 |
| 50488830 | 3 | 2 | 0 | 0 |

- Spreadsheet name in GMass: `Montree Global Outreach → Outreach List` (lives in user's Google Drive — Drive MCP can't see Sheets, only Docs/folders, so locate via Chrome on `drive.google.com`)
- Reports come from `notify@gmass.co` to `tredoux555@gmail.com`
- Subject line: `Montree` (follow-ups become `Re: Montree`)
- Two automatic follow-ups already configured: F1 ~5 days after original ("I wanted to make sure my previous email…"), F2 ~5 days after F1 ("I understand how busy things can get…")
- Each campaign was a separate batch/chunk — not a "single resumable campaign." To send the rest, **build a NEW GMass campaign**, do NOT try to "resume" 50489320.

**🚨 MONDAY APR 13, 9:00am +08:00 — CAMPAIGN A IS LOADED AND SCHEDULED IN GMASS. DO NOT REBUILD IT. JUST OPEN GMAIL → DRAFTS → "Montree" → CONFIRM SETTINGS UNCHANGED → ASK USER TO CLICK THE RED GMASS BUTTON. 🚨**

Strategic decision Apr 8 (after long deliberation): **Campaign B (teacher job application + resume) was CANCELLED.** Reason: attaching a resume that names current school to 345 strangers' inboxes is asymmetric risk — small upside (a few extra replies), big downside (one principal who knows someone at current school → awkward conversation Tredoux didn't choose). Campaign A (Montree pitch) is already a "teacher + builder" intro by subtext — interested principals will ask about availability themselves, and Tredoux can deploy the resume privately to warm leads only. Do NOT revive Campaign B without reopening this conversation.

**Campaign A — LOADED IN GMASS DRAFT (Apr 8 session, ready to fire Mon Apr 13):**
- To: `345-recipients-big-42c28b38@gmass.co` (cleaned 345-school list, sheet ID `1tlBY456CVLc9v6oyI6PH8uTQiG7lmlxLQnmLaC0M6GQ`)
- Subject: `Montree`
- Body: shortened sacred email #1 (~155 words, `{SchoolName}` merge tag, signed Tredoux / montree.xyz)
- Attachment: NONE (resume removed deliberately)
- Schedule: **Mon Apr 13, 9:00am +08:00** (Custom date/time in GMass)
- Speed: 50 emails/day, Pause 5–10s between sends, Skip weekends ON, Skip holidays ON
- Tracking: Opens ON, Clicks OFF
- Auto Follow-up Stage 1: ON, no-reply after 5 days, sacred F1 prefilled
- Auto Follow-up Stage 2: ON, no-reply after 10 days (5 after F1), sacred F2 prefilled
- Stage 3: OFF, Send as: New messages

**Monday morning checklist (next session, before user clicks Send):**
1. Open Gmail, find Drafts → "Montree" (compose ID `CllgCHrgDRrsbSxTWQlPXNMCXtkhKwfmfTsNdVrQqfNqDqFBdgrQJRpQcXtZpsHqcqgzJSQFVMg`)
2. Verify To = `345-recipients-big-42c28b38@gmass.co` (confirms sheet still linked), subject = `Montree`, no attachment, body intact
3. Click GMass settings gear, verify: 04/13/2026 09:00am +08:00, both Stages still ON, Skip weekends ON, Clicks OFF
4. Screenshot the loaded compose + settings for user
5. **STOP. Tell user "Ready. Click the red GMass button when you want to fire." Do NOT click Send autonomously.**
6. After Send, watch gmass.co/dashboard for the new campaign to confirm queued + throttling correctly
7. Detailed handoff lives at `whale/docs/outreach/MONDAY_HANDOFF.md`

**Apr 7, 2026 — Cleaned list ready, mass send scheduled for next week / weekend (Apr 11-14):**
- Ran MX-record scrub on all 412 unsent rows from `Montree_Global_Outreach.xlsx`
- Result: 346 deliverable, 66 dropped (16% drop rate — vs 34.7% actual bounce on Mar 28 batch)
- Saved as `whale/docs/outreach/Montree_Outreach_Cleaned.xlsx` (Deliverable / Bounced or Invalid / Summary tabs)
- Step-by-step send playbook saved as `whale/docs/outreach/SEND_PLAYBOOK.md` — read this BEFORE the actual send next week
- **Gmail-ready HTML letters** (inline styles, paste-into-compose ready):
  - `whale/docs/outreach/Letter_Montree_Pitch.html` — Campaign A body, `{SchoolName}` merge tag
  - `whale/docs/outreach/Letter_Teacher_Application.html` — Campaign B body, attach resume PDF
  - `whale/docs/outreach/HOW_TO_INJECT.md` — step-by-step automation playbook for next session
- **Resume updated Apr 7**: `whale/assets/personal/Tredoux_Resume_Tight.html` — DOB removed, headshot placeholder added (swap instructions in HTML comment). Next session: convert to `Tredoux_Resume_Draft3.pdf` via Chrome print-to-PDF or `mcp__Desktop_Commander__write_pdf`, attach to Campaign B.
- **TODO for next session:** Pick up the Montree mass send. TWO campaigns to run, not one, spaced 5-7 days apart against the same cleaned list of 346 schools:
  - **Campaign A — Montree pitch** (the first sacred email, shortened Apr 7). Pure product pitch.
  - **Campaign B — Teacher job application** (the SECOND sacred email, "Teacher, builder, or both"). Attach `whale/assets/personal/Tredoux_Resume_Draft2.pdf` to this one. Runs 5-7 days AFTER Campaign A so no principal gets both in the same week.
  - Steps: (1) ask user to confirm test send of BOTH emails was done, (2) ask user to confirm GMass paid plan daily cap, (3) drive Chrome to drive.google.com, find/upload the cleaned xlsx as a Google Sheet, (4) drive Chrome to mail.google.com, open GMass compose for Campaign A, paste sacred email 1, link sheet, configure F1+F2, schedule, PAUSE at final Send for user approval, (5) schedule Campaign B 5-7 days later with the second sacred email + attached resume PDF.
- User's instruction: "set up all of this. concrete this time. We check the system over the next week. Make sure all the improvements are bulletproof and then go ahead with mass mailing next week or over the weekend"
- Key checks before send: (1) test send to 2-3 safe addresses for inbox placement, (2) verify GMass plan daily cap on paid account, (3) warm up inbox with normal 1:1 sends, (4) configure new campaign with throttle ON, click tracking OFF, unsubscribe ON

**THE SACRED EMAIL** (cold email body, exact wording — DO NOT rewrite without user approval. Tightened Apr 7, 2026 — removed "looking for a change in environment" block, ~330→~155 words):
```
Subject: Montree

Dear [School Name],

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

**THE SECOND SACRED EMAIL — Teacher Job Application** (finalized Apr 7, 2026. For the same 420-school list but a different angle: positioning Tredoux as a qualified Montessori teacher who ALSO built Montree. Run 5-7 days AFTER the Montree pitch campaign, not the same day, to avoid double-hitting principals. Attach `whale/assets/personal/Tredoux_Resume_Draft2.pdf` to this campaign.):
```
Subject: Teacher, builder, or both

Dear [School Name],

My name is Tredoux. I'm a qualified Montessori teacher who built a school management system — and I believe it's the next step in the evolution of how Montessori classrooms are run.

I'm also looking for the next step in my own professional evolution. I'm grateful to my current school for letting me learn the beauty of Montessori, but I've reached the limit of what I can do here, and I'm ready for a new classroom to perfect my craft.

So if you need a qualified and experienced Montessori teacher for young learners, let's talk.

If you want a beautifully simple and effective new way to manage your classrooms and school, let me know.

And if you want both — if you want to take your school's next step in its own evolution and bring in an experienced young learners teacher at the same time — then I would highly recommend myself. I can custom-build a classroom and school management system that simplifies and streamlines anything and everything you can think of.

Kind regards,
Tredoux
montree.xyz
```

**Follow-up 1** (subject becomes `Re: Montree`):
> I wanted to make sure my previous email found its way to you. I'd welcome the chance to show you what Montree can do for your school.
>
> Kind regards, Tredoux / montree.xyz

**Follow-up 2:**
> I understand how busy things can get running a school. If Montree isn't the right fit for you, no problem at all. But if you're curious, I'm happy to arrange a quick demonstration at a time that works for you. Either way, I wish you and your school all the best.
>
> Kind regards, Tredoux / montree.xyz

**To resume sending next session:** The right move is to drive Chrome to `mail.google.com`, open the GMass dashboard (extension icon or `gmass.co/dashboard`), find Campaign 50489098, and either resume it or build a fresh GMass campaign pointing at the same Google Sheet filtered to `Status != Sent`. Do NOT bypass GMass with raw `gmail_create_draft` calls — it loses open tracking, follow-up sequencing, and spreadsheet sync. Repo-side "outreach" code in `app/montree/super-admin/marketing/outreach-campaign/page.tsx` and `app/api/montree/super-admin/npo-outreach/route.ts` is UNRELATED to GMass and should not be touched for this task. The uploaded xlsx historically lives at `/sessions/blissful-peaceful-babbage/mnt/uploads/Montree_Global_Outreach.xlsx`; user may re-upload.

---

## RECENT STATUS (Apr 8, 2026)

### ⚡ Session 10 — Photo Audit Auto-Confirm Rails + Modal Layout + Schema Fix (Apr 8, 2026)

**Six commits pushed to main.** Closed the "why is this obvious match still in the queue" gap with two parallel rails, fixed the `mode` column schema drift, and fixed a broken bottom-sheet layout.

**Commits (in order):**
1. `6cd1956c` — Photo Audit: Gate B server auto-confirm + Tier 1 client silent-attach at ≥80% Sonnet match (via `closest_existing_match.similarity`)
2. `353bc96a` — Corrections: drop non-existent `mode` column from `montree_guru_interactions` inserts (was logging PGRST204 as "non-fatal" on every confirm/correct)
3. `83c4b00e` — ThisIsSheet: center as modal with fixed height + guard Invalid Date
4. `3894fad4` — Photo Audit: Tier 1b + Gate B also accept `proposed_name` matches

**The Paper Work bug (the crown jewel fix of this session):**
User flagged a photo card showing "AI DRAFT · 82% Paper Work · Similar to Solar System (45%)" — both Gate B and Tier 1 were bailing because they only inspected `closest_existing_match.similarity` (45%, Haiku's stale guess). But `sonnet_draft.proposed_name = "Paper Work"` at `draft.confidence = 0.82` was the real answer, and "Paper Work" IS an existing curriculum work. Nothing in the pipeline was looking at `proposed_name`.

**Fix — two rails in parallel (commit `3894fad4`):**

*Server Gate B (`app/api/montree/photo-identification/process/route.ts`)* now builds `gateBCandidates[]` with up to two entries:
1. `closest_existing_match.work_name` if `similarity >= 0.8`
2. `proposed_name` if `draft.confidence >= 0.8` AND different from the first candidate
Iterates: first candidate that resolves to a real `montree_classroom_curriculum_works` row (via `ilike` classroom-scoped query) wins. On match: updates media row with `work_id`, `identification_status='haiku_matched'`, `identification_confidence=max(draft.confidence, cand.score)`, `sonnet_draft`, `teacher_confirmed=true`, and returns early with `outcome: 'gate_b_auto_confirmed', via: 'closest_match' | 'proposed_name'`. Falls through to normal `sonnet_drafted` write on any error.

*Client Tier 1 (`app/montree/dashboard/photo-audit/page.tsx` `openThisIsSheet`)* mirrors the server: Tier 1a checks `closest_existing_match`, Tier 1b checks `proposed_name` via `findWorkByName(proposed, suggested_area)` when `draft.confidence >= 0.8`. Either hit calls `attachToExistingWork()` directly and returns without opening the sheet.

**Log lines to watch in Railway:**
- `[PhotoIdentification] GateB auto-confirm via closest_match: "X" 95% — bypassing Photo Audit`
- `[PhotoIdentification] GateB auto-confirm via proposed_name: "Paper Work" 82% — bypassing Photo Audit`
- `[ThisIsSheet] Tier 1a auto-attach: "X" 90% — skipping sheet`
- `[ThisIsSheet] Tier 1b auto-attach via proposed_name: "Paper Work" 82% — skipping sheet`

**`mode` column schema drift (commit `353bc96a`):**
Railway deploy logs were spamming `[Corrections] Confirm confidence insert error (non-fatal): { code: 'PGRST204', message: "Could not find the 'mode' column of 'montree_guru_interactions' in the schema cache" }` on every teacher confirm and correct. `app/api/montree/guru/corrections/route.ts` lines 125 and 417 were inserting `mode: 'teacher_confirmed' | 'teacher_corrected'` but the table has no such column — the scenario is already captured in `context_snapshot.scenario` JSONB. Dropped both lines. Non-fatal historically (wrapped in try/catch) but was masking real insert failures in the logs.

**ThisIsSheet layout fix (commit `83c4b00e`):**
The bottom-sheet mode (`alignItems: 'flex-end', maxHeight: '92vh'`) sized to content and on a desktop window left half the page showing behind a thin strip of sheet. Changed to:
- `alignItems: 'center', padding: 16`
- `height: 'min(720px, 90vh)'` (fixed height, not max-height)
- `borderRadius: 20` (full round, not just top)
- `background: 'rgba(0,0,0,0.7)'` backdrop (was 0.55)
- `boxShadow: '0 12px 48px rgba(0,0,0,0.35)'`
Also guarded `captured_at` rendering — was showing "Invalid Date" when null.

**Gate B threshold lowered 0.9 → 0.8 (commit `6cd1956c`):**
Original threshold was 0.9 but Sonnet confidence clusters around 0.75-0.90 on clear matches. 0.8 is the sweet spot — doesn't false-positive (tested against sandbox queue) but catches ~3x more auto-confirms.

**Audit findings (7-section health check run this session — all clean except the bugs fixed above):**
- Schema drift: only `mode` column (fixed)
- Session 7-9 consistency: all error paths safe
- TypeScript suppressions: 1 acceptable `// @ts-nocheck` on `photo-audit/resolve/route.ts` for synthetic NextRequest
- Orphaned `AcceptDraftModal` refs: zero (only in comments)
- Rate limiter on resolve route: 200/min per-IP, correct
- Migrations 164+: `164_cropped_storage_path`, `166_global_works_staging`, `167_story_message_type_document`. **Migration 165 is missing** (gap in sequence — verify intentional next session, not a dropped file)

**Carryover from earlier in session (pre-compaction, commits `6ed59ff3`, `f02ce923`, `e9e6e622`):**
- `6ed59ff3` — Fix 500 "Delegation failed" on `/api/montree/photo-audit/resolve`: replaced internal `fetch()` to sibling corrections route with in-process `correctionsPost(synthetic)` call using a synthetic `NextRequest` that forwards cookie/xff/ua headers. Railway was throwing on internal loopback fetches.
- `f02ce923` — Path B (new_custom) INSERT now seeds `parent_description`, `why_it_matters`, `key_materials` directly from cached `sonnet_draft` on `montree_media` instead of waiting for fire-and-forget Sonnet re-enrichment. New custom works appear with full Sonnet-authored descriptions the moment they hit the curriculum.
- `e9e6e622` — ThisIsSheet one-tap "Add as new work" with AI description + raised `aiGuess` match threshold to 0.75 (was false-positiving on 45% "Cutting" matches).
- `lib/montree/photo-identification/enrich-custom-work.ts` short-circuit: if curriculum row already has `parent_description` + `why_it_matters` (which it now will, thanks to `f02ce923`), skip the redundant Sonnet re-call and fire `autoTranslateToChinese` directly. Visual memory seed (step 1) still runs BEFORE the short-circuit so the self-learning corpus is populated on every new custom work.

**Next session priorities:**
1. **Verify Paper Work photos auto-confirm** — hard-refresh Photo Audit after Railway redeploy of `3894fad4`. The two "Paper Work" cards (82% proposed_name) should either disappear on single-tap "This is…" (Tier 1b) or, on a background `force=true` re-run, bypass the queue entirely via Gate B proposed_name path.
2. **Verify migration 165 gap is intentional** — `ls migrations/ | grep ^165` on the Mac repo. If a file was dropped, restore from git history.
3. **Grep Railway logs for Gate B telemetry** (24-48h after deploy) — bucket `via: closest_match` vs `via: proposed_name` vs normal Sonnet queue. If proposed_name is catching >50% of Gate B hits, consider raising its weight. If closest_match is nearly empty, Haiku's similarity field is dead weight and can be demoted.
4. **Phase 2 Gate A threshold tune from Session 7 telemetry** — still pending. Grep Railway logs for `[PhotoIdentification] GateA` and bucket outcome by haikuConf / hasVM / vmSetSize.

---

### ⚡ Session 9 — Story Login Log Self-Heal (Apr 8, 2026)

**Commit `ec626171` pushed to main.** Fix for "Z's logins don't show up in admin dashboard every time."

**Root cause:** Story user browser POSTs `/api/story/auth` once per JWT lifetime (24h) to get a token, then replays it via Authorization header on every page load + heartbeat. The only code path writing to `story_login_logs` was that single POST. Two ways it silently dropped rows:
1. `/api/story/auth` rate limiter was 5/15min keyed by IP — a household/school sharing one public WAN IP (Tredoux testing + Z + any other users) eats the bucket and Z's real login returns 429, no row.
2. `logLogin()` insert errors only `console.error` and the POST still returns 200 OK — frontend saves token, user is "logged in," admin sees nothing.

**Fix — heartbeat self-heal (`app/api/story/heartbeat/route.ts`):** Heartbeat already fires every few seconds while a user is on the site. Added an idempotent check: query `story_login_logs` for a row with current `session_token` (50-char truncation). If none, INSERT one with username + ip + user_agent + login_at=now. Every distinct session produces exactly one login row regardless of whether the original POST wrote one. Wrapped in try/catch, never fails the heartbeat.

**Fix — rate limit relaxed (`app/api/story/auth/route.ts`):** Bumped `/api/story/auth` from 5/15min → 30/15min per IP. Shared home/school WAN IPs no longer lock legitimate users out.

**Not touched (intentionally):**
- Admin side (`/api/story/admin/auth`) — user said "mine don't matter"
- Silent `logLogin()` error swallowing — heartbeat self-heal recovers from this for free
- `story_login_logs` schema — no new columns needed

**Next session (if still seeing gaps):** Check Railway logs for `[Heartbeat] Self-healed login log` to confirm the path is firing, and `[Heartbeat] Self-heal login log insert failed` to catch any schema surprises.

---

### ⚡ Session 8 — "This is..." Unified Photo Audit Flow (Apr 8, 2026)

**Commit `8d8ead0a` pushed to main.** Streamlined the Photo Audit resolution flow: Fix + Accept + AcceptDraftModal collapsed into a single "This is..." bottom sheet with three resolution paths (existing / new_custom / confirm_ai). Every photo becomes one question with one answer. All three paths end the same way (`teacher_confirmed=true`, photo leaves queue) — eliminates the Session 7 ghost-Fix two-step shuffle.

**New files:**
- `lib/montree/hooks/useClassroomWorks.ts` — extracted from WorkWheelPicker's lazy-load, reusable classroom works hook with AbortController cleanup
- `components/montree/photo-audit/ThisIsSheet.tsx` — full-screen bottom sheet, three handlers (`handlePickExisting`, `handleConfirmAI`, `handleCreateNew`), AI guess derived from `current_work_id` → `closest_existing_match` fallback, pre-seeds `newWorkArea` from `sonnet_draft.suggested_area`, exact-match dedup check prevents duplicate custom works
- `app/api/montree/photo-audit/resolve/route.ts` — POST handler, rate limited 200/min, delegates Paths A/C to `/api/montree/guru/corrections` via internal fetch with cookie forwarding, Path B inlines minimal `montree_classroom_curriculum_works` insert (dedup via ilike, 23505 handler, atomic media UPDATE `work_id + teacher_confirmed`, orphan-work rollback on media failure), fires `enrichCustomWorkInBackground` fire-and-forget
- `lib/montree/photo-identification/enrich-custom-work.ts` — background Sonnet enrichment, reads cached `sonnet_draft.visual_description` from `montree_media` (free rich fingerprint), seeds `montree_visual_memory` with `source='teacher_new_work' confidence=1.0`, calls Sonnet for rich `parent_description` + `why_it_matters` + `key_materials`, updates `montree_classroom_curriculum_works`, fires `autoTranslateToChinese` for zh locale

**Removed:**
- `components/montree/photo-audit/AcceptDraftModal.tsx` — obsolete
- `openAcceptModal` three-tier router (logic now split between resolve route + sheet)
- `handleAcceptDraftSave` (replaced by unified `handleResolvePhoto`)
- `acceptingPhoto` state

**Wiring in `app/montree/dashboard/photo-audit/page.tsx`:** swapped `AcceptDraftModal` import for `ThisIsSheet`, added `thisIsPhoto` state, added `handleResolvePhoto(photo, resolution)` that POSTs to `/api/montree/photo-audit/resolve`, rewired Sonnet-draft card "Accept" button → `openThisIsSheet`, replaced modal JSX block with `<ThisIsSheet>`.

**Schema note:** Path B uses existing columns — no migrations needed. Resolve route relies on the `(classroom_id, work_name)` unique constraint added in Session 6.

**Known carryover (not touched this session):**
- Session 7 Gate A telemetry still needs real-world bucketing from Railway logs before Phase 2 threshold tune.
- Legacy Fix flow (`correctingPhoto` + `handleWorkSelected`) left intact for non-sonnet-draft cards — it's orthogonal to the new sheet and unused on AI Draft cards.

**Apr 8 rerun on existing audit queue:** Added `force: true` flag to `/api/montree/photo-identification/process` (gates idempotency early-return, clears `identification_status` + `sonnet_draft` before rerunning). Drove a fire-and-forget background loop from user's authed Chrome tab (batches of 3, 1s delay) across all photos in the Whale Class queue. **Result: 36/36 ok, 0 errors.** Every queued photo now has a fresh draft from the Session 7 Phase 1 visual-memory gate + Session 8 corpus. User should hard-refresh Photo Audit to pick up new drafts and the new "This is..." sheet UI.

**Next session priorities:**
1. Grep Railway logs for `GateA` telemetry, tune `HAIKU_TRUST_CONFIDENCE`, ship Phase 2
2. Verify "This is..." sheet on live Whale Class with real photos (all three paths)
3. Consider folding the legacy Fix flow into ThisIsSheet for non-sonnet cards

---

### ⚡ Session 7 — Photo Audit Phase 1: Ghost Queue Fix + Gate A Telemetry (Apr 8, 2026)

**Commit `7f27cc71` pushed to main.** Three targeted fixes to the photo audit pipeline after a live audit of the Whale Class review queue (45 photos, only 2/47 hitting the silent auto-tag path).

**Ghost-queue bug fixed (`app/api/montree/guru/corrections/route.ts`):**
Previously only the CONFIRM branch (`action: 'confirm'`) set `teacher_confirmed=true` on the media row. The CORRECTION branch — used by the Tier 1 silent-attach router at `photo-audit/page.tsx` `attachToExistingWork()` — did not. Result: photos accepted via the three-tier Accept router disappeared from the UI via `setPhotos(prev => prev.filter(...))` but reappeared on refresh because `teacher_confirmed` stayed false/null. This was flagged as a known issue in Session 6 notes but not fixed until now. One-shot cleanup SQL run in Supabase editor by user: `UPDATE montree_media SET teacher_confirmed=true WHERE work_id IS NOT NULL AND identification_status='sonnet_drafted' AND (teacher_confirmed IS NULL OR teacher_confirmed=false);` — returned 0 rows (the API's work_id was enriched from a join, not the raw media row).

**Visual memory gate relaxed (`lib/montree/photo-identification/context-loader.ts`):**
Two changes that were silently starving Gate A:
1. `.limit(30)` → `.limit(100)` on the `montree_visual_memory` query. Whale Class has 53 described works — the old cap was dropping 23 of them from `visualMemoryWorkNames`, so `hasVisualMemoryFor()` returned false for any photo matching one of the lower-ranked works.
2. Filter was `source IN ('teacher_setup','correction') AND description_confidence >= 0.9`. Changed to include `'teacher_enrichment'` (the source that classroom-setup writes) and dropped the bar to `>= 0.75`. The "Cutting" row in Whale Class is an example: `source='teacher_enrichment', description_confidence=0.8`, previously excluded entirely from the trust gate.

**Gate A telemetry (`app/api/montree/photo-identification/process/route.ts`):**
Added a structured log line before the Haiku trust decision:
```
console.log('[PhotoIdentification] GateA ' + JSON.stringify({
  mediaId, haikuSuccess, haikuConf, haikuWork, hasVM,
  vmSetSize, vmInjected, threshold, outcome
}));
```
24–48h of Railway logs will give the real distribution of Haiku confidence + hasVM hits so `HAIKU_TRUST_CONFIDENCE` can be tuned from data in Phase 2 instead of guessing. **Next session: grep Railway logs for `[PhotoIdentification] GateA`, count outcome='trusted' vs 'sonnet_fallback', bucket by haikuConf and hasVM, then tune the threshold and ship Phase 2.**

**Key architectural correction to CLAUDE.md Session 6 notes:**
The `sonnet_draft` JSONB column on `montree_media` is populated by a **separate background pipeline** at `app/api/montree/photo-identification/process/route.ts` — NOT by the Guru photo-insight route. Every photo gets fired at this route on capture (fire-and-forget with `keepalive: true`), runs two-pass Haiku, and either (a) writes `identification_status='haiku_matched'` with `work_id` set silently if Gate A passes, or (b) calls `generateSonnetDraft()` from `lib/montree/photo-identification/sonnet-draft.ts` and stores the result in `sonnet_draft` with `identification_status='sonnet_drafted'`. The Photo Audit "Needs Review" queue filters on `teacher_confirmed != true` (NOT on identification_status), which is why the ghost-queue bug was hiding. Gate A conditions: `success && confidence>=0.75 && hasVisualMemoryForMatch && resolveClassroomWorkId() succeeds`. ALL four must be true to auto-tag.

**Live numbers from Whale Class at audit time:**
- 47 photos in queue, identification_status breakdown: `sonnet_drafted: 42, haiku_matched: 2, skipped: 3`.
- Auto-tag rate **4%** — expected ~40%+ after Phase 1 visual memory relaxation and Phase 2 threshold tune.
- Of 29 sonnet_drafted rows inspected: **~22 were wasted Sonnet runs** (proposed_name == closest_existing_match, similarity ≥85%) and **~7 were legitimate** "propose a new variant" cases (e.g. "Ocean Animal Object Matching" closest to "Object to Picture Matching" 82%).
- 15 of 47 had `work_id` set while still in status `sonnet_drafted` — those are ghosts from the correction-branch bug.

**Cost: $0.02 per photo for the 42 sonnet_drafted today. ~$0.84/day at current volume. Phase 1+2 should drop this ~50%.**

**Known quandary surfaced Apr 8 (NOT YET FIXED — next session, see deep dive below):**
User reports: took a photo, Sonnet drafted as "Touch Tablets (Rough and Smooth)", clicked Fix and changed to "Baric Tablets". The work_id/work_name on the photo row updates, BUT `sonnet_draft.proposed_name` and `closest_existing_match` are left stale. Result:
1. The AI DRAFT card on the grid still shows the old Sonnet-proposed name + old similar-to line.
2. Clicking Accept reads `photo.sonnet_draft.proposed_name` (via `openAcceptModal`), so the modal offers "Use Touch Tablets (Rough and Smooth)" — not the Fix'd value.
3. Even when Phase 1 ships `teacher_confirmed=true` server-side, Fix is deliberately client-state-only per the comment at `page.tsx:1067` ("update work info but keep photo in place for further actions"). Fix does NOT remove the photo from the queue, so the user is trapped in a two-step Fix-then-something shuffle.

Root cause (three layers):
- **A.** The Fix flow calls `/api/montree/guru/corrections` (CORRECTION path) which writes the correction + work_id + now teacher_confirmed, but the client-side state update only patches work_id/work_name/area on the photo object — it leaves `sonnet_draft` untouched. Simplest local fix: after a successful Fix, either clear `sonnet_draft` from the photo state, OR remove the photo from the grid (matching the silent-attach router behavior).
- **B.** Fix is currently designed as "soft update that keeps the photo in the queue for further action" which is the wrong mental model. The teacher is telling us the ground truth — there's nothing left to do. Mental-model fix: Fix = I'm telling you the answer = photo leaves the queue. No second Accept step.
- **C.** The user's second request: when a photo is a brand-new custom work the AI has never seen ("Baric Tablets" doesn't exist in curriculum), the teacher wants to TYPE the correct name and have Sonnet re-run the rich draft generation seeded with that name, then approve/reject the re-draft. This flow doesn't exist yet. Needs a new endpoint `POST /api/montree/photo-identification/redraft` that takes `media_id` + `teacher_provided_name` and calls `generateSonnetDraft()` with the teacher name as a high-confidence anchor in the prompt.

**Proposed unified flow (see Session 7 deep dive in handoff below):**
One button per card: "This is..." → modal with three paths:
- **Path A — existing curriculum match:** autocomplete picker → attach + teacher_confirmed + visual memory append → photo leaves queue.
- **Path B — new custom work:** type name → Sonnet redraft → teacher reviews/approves → custom work row + visual memory + attach → photo leaves queue.
- **Path C — AI draft is correct:** the current Accept button (three-tier router), unchanged.

All three paths end the same way: `teacher_confirmed=true`, photo leaves queue, no two-step shuffle. Fix as a standalone action gets removed or redefined to be identical to Path A.

**Next session priorities (in order):**
1. **Grep Railway logs for `GateA`** — bucket outcomes by haikuConf, hasVM, vmSetSize. Tune HAIKU_TRUST_CONFIDENCE from real data. Ship Phase 2.
2. **Fix the Fix bug** — at minimum, after a successful Fix correction, remove the photo from the grid (one line: `setPhotos(prev => prev.filter(p => p.id !== correctingPhoto.id))`) and drop the misleading "keep photo in place" comment. Short term band-aid before the bigger UX redesign.
3. **Build the unified "This is..." modal** — collapse Fix + Accept + Teach-the-AI into one three-path modal. Bigger refactor but much cleaner mental model.
4. **Build the `/photo-identification/redraft` endpoint** — POST `{media_id, teacher_provided_name}`, calls `generateSonnetDraft()` with a modified prompt anchoring on the teacher name, returns the new draft for review. Then the Path B flow in the unified modal can surface it.

---

## RECENT STATUS (Apr 7, 2026)

### ⚡ Session 6 — Self-Learning Loop Complete + Three-Tier Accept Router (Apr 7, 2026)

**Three-tier Accept router for photo audit — ✅ PUSHED (commit `97c9d151`):**
Replaced confusing 4-button row (Add as new / Attach / Fix / Correct / Teach) with simplified 2-button "✅ Accept" + "✏️ Fix" on AI Draft cards. Accept button now routes through three tiers based on `closest_existing_match` similarity:
- **Tier 1 (≥90%)**: Silently attaches photo to existing curriculum work via `/api/montree/guru/corrections` — no modal, no clicks
- **Tier 2 (50-89%)**: Opens AcceptDraftModal with blue "🔗 Use 'WorkName'" as primary button, small "+ Add as new work anyway" link below
- **Tier 3 (<50%)**: Opens AcceptDraftModal with violet "✨ Add to Curriculum" as primary
- **Key files**: `app/montree/dashboard/photo-audit/page.tsx` (`findWorkByName`, `attachToExistingWork`, `openAcceptModal` three-tier router, lines 852-950), `components/montree/photo-audit/AcceptDraftModal.tsx` (`existingMatch` + `onUseExisting` props)
- **Pre-existing 500 fix in same session** (commit `12ef1671`): `app/api/montree/guru/photo-insight/add-custom-work/route.ts` was inserting `area_key` directly but the table uses `area_id` (UUID FK) — same root cause as Session 4 weekly-admin bug. Added area_key→area_id resolution + sequence computation + materials as array + parent_description/why_it_matters/is_active in insert payload.

**WorkWheelPicker cross-area search — ✅ PUSHED (commit `ab7d7f13`):**
Search bar now searches ALL curriculum areas, not just the open one. Lazy-loads `globalWorks` on first non-empty search via `/api/montree/curriculum?classroom_id=X`. Renders flat list with area badges when search is active.

**🧠 SELF-LEARNING LOOP COMPLETE — ✅ PUSHED (3 commits: `b54ef5e4`, `13cf25ff`, `256b6a6a`, `3923914c`):**

The crown jewel. Per-classroom self-improving brain that gets measurably smarter every day from teacher Fix corrections. All hidden behind the scenes — no UI changes, the corpus lives entirely in `montree_visual_memory` (server-side moat).

**Loop 1 — Write the corpus (`app/api/montree/guru/corrections/route.ts`)**:
When a teacher Fixes a photo from work A → work B, the new `enrichVisualMemoryFromCorrection()` function:
1. Reads cached `sonnet_draft.visual_description` from `montree_media` (rich + free) — falls back to fresh Haiku call only if no draft cached. `descriptionSource: 'sonnet_draft' | 'haiku_fresh'` tracked.
2. **APPENDS** (not overwrites) the fingerprint to work B's `visual_description` column via `appendVisualFingerprint()` — multi-fingerprint accumulation with `||` separator, capped at 2500 chars with FIFO eviction. Idempotent: skips if first 80 chars already present.
3. **APPENDS** a negative example (`"Looks similar to {B} — features: ..."`) to work A's `negative_descriptions[]` array via `appendNegativeExample()` — capped at 8 with FIFO. Idempotent on first 60 chars. Skips entirely if work A has no positive entry yet (would inject `LOOKS LIKE: (no fingerprint)` garbage into Pass 2).
4. Source = `'correction'`, confidence = `0.95`. `invalidateClassroomEmbeddings(classroomId)` called after upsert.
- **Key functions**: `enrichVisualMemoryFromCorrection`, `appendVisualFingerprint`, `appendNegativeExample` (all in corrections route)
- **Legacy `generateAndStoreVisualMemory` kept** for first_capture path

**Loop 2 — Read the corpus (`app/api/montree/guru/photo-insight/route.ts` ~line 798-918)**:
ALREADY IN PLACE from prior session. Pass 2 (Haiku) loads up to 30 visual memory entries per request, filters to teacher-validated sources (`teacher_setup` confidence 1.0 OR `correction` confidence ≥0.9, OR any `is_custom=true`), and renders them at TOP of Pass 2 prompt as `LOOKS LIKE: ... / KEY MATERIALS: ... / DISTINGUISH FROM: ...` blocks. As Loop 1 grows the corpus, Pass 2 sees richer descriptions every day.

**Loop 3 — Sonnet discriminator on hard cases (`app/api/montree/guru/photo-insight/route.ts` line 1656-1791)**:
NEW. Inserted between Pass 2 success block and the existing Sonnet single-pass fallback. Gated on:
- `!haiku_only` (skip in diagnostic mode)
- `input && matchResult` (Pass 2 succeeded, mutually exclusive with single-pass fallback at line 1795 which gates on `!input || !matchResult`)
- `matchResult.candidates.length >= 2`
- `matchScore < 0.7 OR input.confidence < 0.5`
- At least 1 of top 3 candidates has visual memory (otherwise nothing to discriminate against — logs `Pass 3 skipped — no top candidates have visual memory yet`)

When fired, loads visual memory for top 3 candidates, builds `[A]/[B]/[C]` blocks with `LOOKS LIKE / KEY MATERIALS / NOT TO BE CONFUSED WITH`, calls Sonnet (`AI_MODEL`) via tool_use (`pick_work` tool with `choice: A|B|C|none`, `confidence`, `reasoning`). If Sonnet picks at confidence ≥0.6, replaces `finalWorkName/Area/Key`, bumps `matchScore` to `Math.max(matchScore, 0.85)`, sets `modelUsed = AI_MODEL`, mutates `input.confidence = max(input.confidence, out.confidence)` so downstream gates accept the result.
- **Dynamic timeout** (commit `3923914c` audit fix): Was fixed 30s, blew the 45s `ROUTE_TIMEOUT_MS` budget when Pass 1+2 already ran ~15s. Now uses `Math.min(ROUTE_TIMEOUT_MS - elapsed - 3000, 25000)` — same pattern as the existing Sonnet fallback at line 1320.
- **Cost curve**: Easy photos still flow Haiku-only at $0.006. Hard photos pay ~$0.02. As corpus grows, Pass 2 confidence climbs above the 0.7 gate, fewer photos hit Pass 3 — system gets cheaper AND more accurate over time.

**SQL run by user in Supabase editor (Apr 7)**:
```sql
ALTER TABLE montree_media ADD COLUMN IF NOT EXISTS cropped_storage_path TEXT;  -- migration 164
ALTER TABLE montree_visual_memory
  ADD COLUMN IF NOT EXISTS negative_descriptions TEXT[],
  ADD COLUMN IF NOT EXISTS key_materials TEXT[],
  ADD COLUMN IF NOT EXISTS description_confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS source_media_id UUID,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
-- Plus unique constraint on (classroom_id, work_name) and idx on (classroom_id, description_confidence DESC, updated_at DESC)
```
Baseline showed Whale Class works already had `desc_chars=1000`, `negative_count=3`, `source=teacher_setup` from existing Teach the AI corpus — Loop 1 now appends to these existing rows.

**Watch in Railway logs**:
- `[VisualMemory] Enriched "X" via sonnet_draft + negative on "Y"` — Loop 1 firing
- `[PhotoInsight] Pass 3 budget: Xms (Yms elapsed)` — Loop 3 entering
- `[PhotoInsight] Pass 3 discriminator (Xms): "OldGuess" → "BetterGuess" (conf 0.85) — reasoning...` — Loop 3 saving a hard call
- `[PhotoInsight] Pass 3 skipped — no top candidates have visual memory yet` — should appear LESS over time as corpus fills

**Architectural decisions**:
- The moat lives in `montree_visual_memory`. NO UI exposes it. No "AI brain" page. No "learned descriptions" admin view. Competitors screen-recording the app see a clean Montessori tracker; the intelligence is invisible.
- Negatives only accumulate on works with at least one positive fingerprint (avoids stub-row pollution of Pass 2).
- Loop 1 mutates `input.confidence` in-memory only — no cross-request leakage.
- Pass 3 and the legacy single-pass Sonnet fallback are mutually exclusive by gate condition.

**Photo audit "stale Sonnet draft" issue — KNOWN, not yet fixed**:
After teacher Fixes a photo (correctly re-tagging it), the photo can still appear in Photo Review with an "Accept AI Draft" button because `sonnet_draft` is cached on `montree_media` and Fix doesn't clear it. When teacher clicks Accept, the modal reads the stale `closest_existing_match` from the cached draft and offers a now-irrelevant suggestion. Two fixes to ship next session:
1. After Fix correction in `attachToExistingWork`, the photo SHOULD already be removed from the audit grid via `setPhotos(prev => prev.filter(p => p.id !== photo.id))` — but verify it's also persisted as `teacher_confirmed=true` so it doesn't reappear on refresh.
2. In `openAcceptModal`, if `photo.work_id` is already set (teacher already decided), ignore `closest_existing_match` from the cached Sonnet draft and treat as Tier 3 directly.

---

### ⚡ Session 5 — Story Fixes, Flag Dedup, Crop Preservation (Apr 6-7, 2026)

**Story system fixes — ✅ PUSHED:**
- Video uploads: Added `uploadWithRetry()` with exponential backoff for ECONNRESET/ETIMEDOUT, Node `--max-old-space-size=2048` in `start.sh`, better MIME handling for mobile (empty MIME → extension fallback), better error messages
- Login records: Merged user + admin login logs in `/api/story/admin/login-logs/route.ts` with `role` field. `logLogin()` now verifies insert. Online user window expanded 2→5min.
- Admin send: `validateFile()` fixed for mobile videos with empty MIME type. Session linking fields made conditional (retry without if columns don't exist in production).
- Rate limiter: DB-backed, 5 attempts per 15 minutes per IP per endpoint (`montree_rate_limit_logs`).

**Flag deduplication in Weekly Wrap — ✅ PUSHED (commit `54a3257c`):**
Red flags now suppress yellow flags for same curriculum area. Client-side dedup: extracts area keywords from red flag text, filters yellow flags that mention same areas.
- **Key file**: `components/montree/reports/WeeklyWrapTab.tsx` — flag rendering IIFE (~line 844)

**Persistent work/photo removal — ✅ PUSHED (commit `54a3257c`):**
`handleRemoveWork` and `handleRemovePhoto` in WeeklyWrapTab now call edit API (`/api/montree/reports/weekly-wrap/edit`) to persist deletions to DB. Previously was client-state only — removals vanished on page reload. Edit API now supports `works[]` field alongside `narrative` and `photos`.

**Photo crop preservation — ✅ PUSHED (commit `cb82fb15`):**
Crop API (`/api/montree/media/crop`) was overwriting original photos with `upsert: true`. Now saves cropped version to new path (`original_cropped_timestamp.jpg`) keeping originals intact. Migration 164 adds `cropped_storage_path` column to `montree_media`. Callers (weekly-wrap, gallery) updated to use `cropped_url` from API response. Graceful fallback if column doesn't exist yet.
- **⚠️ Migration 164 needs manual run** via Supabase SQL editor: `ALTER TABLE montree_media ADD COLUMN IF NOT EXISTS cropped_storage_path TEXT;`
- **Key file**: `app/api/montree/media/crop/route.ts`

**What STILL NEEDS FIXING (next session):**
1. **Run migration 164** via Supabase SQL editor (cropped_storage_path column)
2. **Verify Weekly Admin auto-fill on production** — Click Auto-fill on week 2026-03-30
3. **"999 days" in observations** — Red flags say "No work in 999 days" for areas with no baseline data
4. **Teacher summary line still shows English work names** — The "需要关注" section needs Chinese work names
5. **Test new prompts end-to-end** — Verify parent narratives (200-300 words) and teacher key_insight (2-3 sentences)

---

### ⚡ Session 4 — Weekly Admin Auto-fill Root Cause Fix + Dictionary 6-per-page (Apr 6, 2026)

**Weekly Admin auto-fill area-grouped format — ✅ FINALLY FIXED (10+ iterations across sessions 3-4):**
Root cause was `area_key` column doesn't exist on `montree_classroom_curriculum_works` — that table uses `area_id` (UUID). Supabase queries with nonexistent columns return `{ data: null }` silently, so the `workNameToArea` map was completely empty (0 entries), causing ALL works to fall into "Other" bucket or produce "No recorded activities."
- **The fix** (commit `193eca37`): Changed 3 queries from `area_key` to `area_id`, then resolve via `areaIdToKey.get(w.area_id)`. Confirmed: 384 works now map correctly.
- **Tier 3 fallback restored** (commit `09c5ffb4`): When no Weekly Wrap or photo data exists, `parseSavedText()` re-parses existing flat "did X, Y, Z" notes into area-grouped format. This ensures clicking Auto-fill always reformats old flat notes.
- **Flash-and-vanish bug**: Area-grouped text briefly appeared then vanished — likely caused by `fetchData` re-running and reloading flat-format saved notes from DB, overwriting the fresh auto-fill state. The parseSavedText tier 3 fix addresses this from the API side (even stale DB text gets reformatted).
- **Auto-fill guard**: Auto-fills on page load ONLY when no saved notes exist. Manual Auto-fill button click always runs and overwrites current state.
- **Debug fields removed** (commit `09c5ffb4`): `_v` and `_debug` removed from API response.
- **Key file**: `app/api/montree/weekly-admin-docs/auto-fill/route.ts`
- **Critical lesson**: `montree_classroom_curriculum_works` has `area_id` (UUID FK), NOT `area_key`. Always resolve via `areaIdToKey` map from `montree_classroom_curriculum_areas`.

**Dictionary 6 words per page — ✅ PUSHED (commit `dc684834`):**
Card dimensions tightened: picture 52→46px, trace/write 52→46px, fonts shrunk proportionally, margins reduced (8mm→5mm header). wordsPerPage: A4 normal+write `5→6`, A4 no-write `6→7`, A5 `4→5`. Only CMAT group needed for now — others added week by week.
- **Key file**: `public/tools/my-first-dictionary.html`

**Total commits this session** (7 pushed to main):
- `dc684834` — Dictionary 6 words/page + initial auto-fill fixes
- `193eca37` — area_key → area_id fix (THE critical fix)
- `8ba39374` — Debug info in API response (temporary)
- `3162e097` — Merge all data sources
- `abef0c0f` — Simplify to Weekly Wrap + photos only
- `0e1868f4` — Revert client-side flat format auto-detection
- `09c5ffb4` — Restore parseSavedText tier 3 + remove debug fields

**What STILL NEEDS FIXING (next session):**
1. **Verify Weekly Admin auto-fill on production** — Click Auto-fill on week 2026-03-30 after Railway deploys commit `09c5ffb4`. API confirmed working via console; UI verification pending.
2. **Verify dictionary 6-per-page on production** — Print preview CMAT group, confirm 6 cards fit per A4 page.
3. **"999 days" in observations** — Red flags say "No work in 999 days" for areas with no baseline data.
4. **Teacher summary line still shows English work names** — The "需要关注" section shows English work names with Chinese area labels. Review API needs Chinese work names for teacher summary.
5. **Test new prompts end-to-end** — Generate reports and verify: parent narratives are rich/educational (200-300 words), teacher key_insight is concise/actionable (2-3 sentences).

---

### ⚡ Session 3 Fixes — Parent Reports, Weekly Admin Format, Dictionary (Apr 6, 2026)

**Parent Reports area grouping — ✅ PUSHED:**
Photos in Parent Reports tab (WeeklyWrapTab.tsx) now grouped by curriculum area in shelf order (`practical_life → sensorial → mathematics → language → cultural → other`). New `ParentPhotosGrouped` component renders area headers with colored pills, groups photos using `toCanonicalArea()`. Replaces flat photo list.
- **Key file**: `components/montree/reports/WeeklyWrapTab.tsx` — `ParentPhotosGrouped` component (~lines 137-252)

**Weekly Admin summary area-grouped format — ✅ PUSHED (after 7+ iterations):**
Weekly Summary in Weekly Admin Docs now displays works grouped by area (`Practical Life: X, Y\nSensorial: Z`) instead of flat paragraphs. See Session 4 above for the full root cause fix.
- **Key files**: `app/api/montree/weekly-admin-docs/auto-fill/route.ts` (three-tier fallback + `parseSavedText()` dual-format parser), `components/montree/reports/WeeklyAdminTab.tsx` (auto-fill trigger guard)
- **Pattern — `parseSavedText(text)`**: Detects whether text is already area-grouped (has "Practical Life:" lines) or flat paragraph ("did X, Y, and Z"), parses work names, looks up curriculum areas, returns `Map<area_key, work_names[]>`. Always check format before parsing.

**Dictionary two-row card layout — ✅ PUSHED (2 commits: `c1f7da6d` + `7df8629a`):**
Word cards changed from single flex-row (`[picture][word][trace][write]`) to two-row stacked card:
- Top row (`.word-card-top`): picture + written word side by side
- Bottom row (`.word-card-bottom`): trace word (flex:1) left + free write (flex:1) right
- Both `makeWordRow()` (standard) and `makeTwoColCard()` (two-column) use this layout
- CSS layout overrides (compact, spacious, A5) target both `.word-row` and `.word-card`
- **Key file**: `public/tools/my-first-dictionary.html`

**Dictionary custom-only mode — ✅ PUSHED:**
New "Custom words only" checkbox. Auto-checked on Photo Bank import. Filters to only show words with `imgData` (imported/uploaded). Empty state shows "No custom words yet" placeholder with instructions.

---

### ⚡ Photo Audit + Weekly Wrap MERGED (Apr 6, 2026)

**Merged Photo Audit + Weekly Wrap into one page** — Weekly Wrap is now a tab inside Photo Audit (`/montree/dashboard/photo-audit`). Three tabs: Needs Review → Confirmed → Weekly Wrap. Teachers audit photos first, then do weekly wrap in the same page.

**Dashboard nav reduced to 3 icons**: Capture (📸), Notes (📝), Photo Audit (🔍). Weekly Wrap icon (📋) removed from header — accessed via Photo Audit tab instead.

**New component**: `components/montree/reports/WeeklyWrapTab.tsx` — self-contained Weekly Wrap embedded in Photo Audit:
- **Teacher Review**: Compact 2-3 column grid of child cards. Yellow highlight if flagged. Click expands inline with work chips (× delete), flags, recommendations.
- **Parent Reports**: Continuous scroll — all children expanded with narrative + horizontal photo row. No accordion. Teacher can scan whole class, edit narratives, delete photos.
- Week ◀ ▶ navigation, Select mode with Select All, Generate/Regenerate with streaming, Send All to Parents.

**Weekly Wrap page** (`/montree/dashboard/weekly-wrap`) still exists as standalone for direct URL access. WeeklyWrapTab is the simplified embedded version.

---

### 3x3x3x3x3 Development System

Standard development methodology for complex tasks:
1. **3x PLAN** — Map all tasks, dependencies, and scope
2. **3x THEORIZE** — Research best approach, explore code, consider architecture
3. **3x INVESTIGATE** — Deep audit of all code paths, data flow, wiring points
4. **3x BUILD** — Build with audit cycles (build → audit → build → audit)
5. **3x AUDIT** — Final verification: type safety, logic, JSX, data flow, edge cases

Each phase runs 3 rounds of its activity. Parallel agents used where possible. Every build phase includes inline auditing. Final audit catches remaining bugs before push.

---

### ⚡ PRIORITY: Full Chinese Localization + Teacher Report JSON Repair

**Chinese Localization — ✅ MOSTLY WORKING (commits from this session):**
Full bilingual pipeline for Weekly Wrap + Weekly Admin Docs. When UI is set to Chinese, area labels, work names, photo descriptions, parent narratives, and flag badges all display in Chinese. English when in English.

**✅ SWITCHED TO SONNET + TOOL_USE (commit `760d7c4c`):**
Haiku's Chinese JSON corruption issue is permanently solved by two changes:
1. **Switched to Sonnet** (`AI_MODEL`) for both teacher reports and parent narratives. Higher quality, reliable JSON.
2. **Teacher reports use `tool_use` structured output** — the API handles JSON serialization, so the model never produces raw JSON text. This eliminates all JSON corruption issues (unescaped quotes, fullwidth punctuation, literal newlines) regardless of model or language.
3. **Selective child generation** — teachers can now pick specific children to generate/regenerate reports for instead of all 19 at once. This controls Sonnet costs (~$0.09/child vs $1.70 for all 19).
- Cost with Sonnet: ~$0.09 per child (teacher + parent). Full class run: ~$1.70. Selective generation makes this manageable.
- MAX_CONCURRENT reduced from 5 to 3 for Sonnet rate limit safety.

**✅ NOW ON SONNET** — Both `teacher-report-generator.ts` and `narrative-generator.ts` import `AI_MODEL` (Sonnet). Teacher report uses `tool_use` for structured output.

**What was FIXED this session (Chinese localization):**
1. ~~**UUID areas in Weekly Admin Docs auto-fill**~~ — ✅ FIXED. Auto-fill API now has `resolveArea()` with UUID→canonical key mapping. Was causing summary to show "..." placeholder (no data matched canonical area keys).
2. ~~**Weekly Admin Docs plan showing English work names**~~ — ✅ FIXED. API returns `planAreasZh` alongside `planAreas`. Page uses `chinese_text` when locale is zh. DOCX generation also locale-aware.
3. ~~**Photo descriptions under parent reports in English**~~ — ✅ FIXED (earlier commit). Static Chinese descriptions file + DB `parent_description_zh`/`why_it_matters_zh` columns + fuzzy matching.
4. ~~**Visual memory overwriting Chinese descriptions**~~ — ✅ FIXED. Guard: `if (locale === 'zh' && dbDescriptions.has(vmKey)) continue;`
5. ~~**Missing Chinese descriptions for 20+ works**~~ — ✅ FIXED. Added to `parent-descriptions-zh.ts`.
6. ~~**Classroom variant names not matching**~~ — ✅ FIXED. Fuzzy matching (strip " - suffix", normalize spaces) in 4 files.
7. **Auto-translate for new "Teach the AI" descriptions** — ✅ NEW. `lib/montree/auto-translate.ts` fire-and-forgets Haiku translation to Chinese after every Sonnet description generation. Stored in `parent_description_zh`/`why_it_matters_zh`.

**What was FIXED (next session = session 3):**
1. ~~**Teacher report quality**~~ — ✅ FIXED (Apr 6 session 2). Content quality was "swapped" — both prompts rewritten.
2. ~~**Parent Reports flat photo list**~~ — ✅ FIXED (Apr 6 session 3). Photos now grouped by curriculum area.
3. ~~**Weekly Admin flat format**~~ — ✅ FIXED (Apr 6 session 3). Three-tier fallback with `parseSavedText()`.
**Still open** — see Session 3 "STILL NEEDS FIXING" above.

**What WORKS end-to-end (tested Apr 5):**
- ✅ Weekly Wrap generation (streaming, all 19 children)
- ✅ Review page loads all children with reports
- ✅ Parent narratives generate beautifully (warm, paragraph style)
- ✅ "19 parent reports ready to send" + Send All button appears
- ✅ No duplicate key errors (migration 162)
- ✅ No column errors (enrolled_at, no duration_minutes/repetition_count)
- ✅ UUID areas resolved to canonical keys (practical_life, sensorial, etc.)
- ✅ Full Chinese localization (area labels, work names, recommendation sentences)
- ✅ Clean work names (AI prefixes "Present/Continue" stripped by `cleanWorkName()`)
- ✅ Interactive "Next Week's Focus" shelf with WorkWheelPicker, P/P/M status badges
- ✅ Generate/Regenerate button in review page header with streaming progress
- ✅ Invite Parents link in sticky bottom bar (links to Manage Students)

**Still untested:**
- Send to parents (email dispatch)
- Weekly Admin auto-fill from Weekly Wrap data
- Weekly Admin DOCX generation
- Switching back to Sonnet for production quality

**Key Discovery — `montree_weekly_reports` schema:**
Table has MORE columns than originally documented. Full column list: `id, child_id, classroom_id, school_id, week_start, week_end, week_number (NOT NULL), report_year (NOT NULL), report_type, status, content, is_published, published_at, sent_at, generated_at, created_at, updated_at, created_by, concentration_score, area_distribution, areas_of_growth, highlights, parent_summary, recommendations, recommended_works, active_sensitive_periods`. The `week_number` and `report_year` columns are NOT NULL — removing them from upserts causes silent insert failures. Always include computed `weekNumber` and `reportYear` in upserts. Queries should use `.eq('week_start', weekStart)` (canonical identifier).

**Key Files:**
- `app/api/montree/reports/weekly-wrap/route.ts` — main generation (streaming + non-streaming). Loads `montree_classroom_curriculum_areas` to build `areaIdToKey` map; resolves UUID areas at generation time.
- `app/api/montree/reports/weekly-wrap/review/route.ts` — GET review data. Has `resolveArea()`, `cleanWorkName()`, `getChineseWorkName()`, `cleanUUIDs()`. Pipes `work_zh`, `area_label_zh` through all response fields.
- `app/api/montree/reports/weekly-wrap/send/route.ts` — POST publish + email
- `app/montree/dashboard/weekly-wrap/page.tsx` — review UI client (~1500 lines). Two tabs: Teacher Summary (with interactive shelf, WorkWheelPicker, approve/push) + Parent Reports (edit narrative, reorder photos, crop, send). **Selective generation**: "Select" mode lets teachers pick specific children to regenerate. Generate/Regenerate All button in header with streaming progress bar. Invite Parents link in bottom bar.
- `components/montree/reports/WeeklyWrapCard.tsx` — dashboard card (NO LONGER used on dashboard — removed from Teacher Tools. Still exists as component for potential reuse.)
- `lib/montree/reports/teacher-report-generator.ts` — **SONNET** teacher report (max_tokens: 8192). Uses `tool_use` structured output — API handles JSON serialization (no raw JSON from model). Has `repairAndParseJSON()` as legacy fallback. System prompt in English even for Chinese output. `key_insight` field prompt rewritten (Apr 6) to produce concise 2-3 sentence actionable summary (status + shelf actions), not Montessori essays.
- `lib/montree/reports/narrative-generator.ts` — **SONNET** parent narrative (max_tokens: 800, was 300). Prompt rewritten (Apr 6) from "3-5 sentence intro under 100 words" to rich 200-300 word personal letter: opening moment → learning story with educational context per work → bigger developmental picture → warm close. Uses `parent_description` and `why_it_matters` data from photos. Template fallback also enriched.
- `app/api/montree/weekly-admin-docs/auto-fill/route.ts` — pulls from weekly_reports. Has `resolveArea()` for UUID→canonical key mapping. Returns `planAreasZh` alongside `planAreas`. Has `getZhWorkName()` for fuzzy Chinese name lookup.
- `app/api/montree/weekly-admin-docs/generate/route.ts` — DOCX generation. Locale-aware: uses `chinese_text` for plan area work names when locale is zh.
- `lib/montree/weekly-admin/doc-generator.ts` — DOCX builder (multilineParagraphs splits on \n)
- `lib/montree/auto-translate.ts` — **NEW**. Fire-and-forget Haiku translation of Sonnet-generated descriptions to Chinese. Called after "Teach the AI" saves. Stores in `parent_description_zh`/`why_it_matters_zh` on `montree_classroom_curriculum_works`.
- `lib/curriculum/comprehensive-guides/parent-descriptions-zh.ts` — Static Chinese parent descriptions (~130 works). Has `getChineseParentDescription()` with fuzzy matching (strip suffix, space-collapsed). `getChineseDescriptionsMap()` for batch lookups.

**Key Technical Patterns (Weekly Wrap):**
- `cleanWorkName(raw)` — strips AI prefixes ("Present/Continue/Introduce") and trailing clauses ("as the.../with increased..."), with substring matching against known curriculum works. Used in both review API and `FocusWorksSection.tsx`.
- `resolveArea(raw, workName?)` — 3-layer resolution: UUID lookup via `areaIdToKey` map → canonical key check → fuzzy keyword matching → work-name-based area fallback. **Must be added to any new API that reads Weekly Wrap data** — parent reports store areas as UUIDs.
- `toCanonicalArea(raw)` — client-side area normalization using `normalizeArea()` from AreaBadge + fuzzy keyword matching.
- Chinese localization: `AREA_LABELS_ZH` map + `name_zh` from `montree_classroom_curriculum_works` table + `getAreaLabel(area)` helper using locale.
- `repairAndParseJSON(raw)` — robust JSON repair for Haiku Chinese output. Strategy: strip fences → extract braces → replace ALL newlines with spaces → fix fullwidth punctuation → fix structural commas. The newline→space replacement is the key insight: literal newlines in JSON are only valid as whitespace between tokens, never inside strings.
- **Fuzzy work name matching** (used in 4+ files): strip " - suffix" variants → normalize spaces ("chalk board" → "chalkboard") → substring match for long keys. Pattern: `name.replace(/\s*-\s*.+$/, '').trim()` then `collapsed.replace(/\s+/g, '')`.
- **Photo crop preservation**: Crop API saves to new path (`_cropped_{timestamp}` suffix), stores in `montree_media.cropped_storage_path`. Original `storage_path` never modified. Callers use `cropped_url` from API response. Parent reports always reference original `storage_path`.

---

**Content Quality Swap Fix — ✅ PUSHED (Apr 6 session 2):**
Parent narrative and teacher key_insight prompts were producing content for the wrong audience. Teacher `key_insight` was writing rich Montessori developmental essays (perfect for parents), while parent `narrative` was writing casual 3-5 sentence summaries (more like teacher notes). Fixed by rewriting both prompts:
- **`narrative-generator.ts`**: Prompt expanded from "3-5 sentence intro under 100 words" to a structured 200-300 word personal letter (opening moment → learning story explaining 2-3 works with WHY they matter → developmental arc → warm close). max_tokens 300→800. Now uses `parent_description` and `why_it_matters` photo data that was available but underutilized. Voice: "teacher talking to parent over coffee." Template fallback also enriched with educational context.
- **`teacher-report-generator.ts`**: `key_insight` field prompt rewritten from "3-5 sentence synthesis essay" to "2-3 sentence consultant sticky note" — quick status read (on track/needs attention/thriving) + specific shelf action items naming exact works. Detailed analysis stays in structured fields (`area_analyses`, `sensitive_periods`, etc.). Tool_use schema description also updated.
- **WeeklyWrapTab.tsx**: (From earlier in this session) Added interactive shelf to Teacher Review, redesigned Parent Reports with large vertical photos + educational context per photo, added guru observation card, fixed AbortController cleanup, fixed `await getSession()` on sync function.

**Full Chinese Localization + JSON Repair — ✅ PUSHED (commits from Apr 5-6 session):**
Multi-commit session for full bilingual Chinese/English support:
- Chinese parent descriptions: 20+ missing works added to `parent-descriptions-zh.ts`, fuzzy matching in `getChineseParentDescription()` and `getChineseWorkName()`
- Visual memory overwrite fix: Chinese descriptions no longer overwritten by English visual memory entries
- Fuzzy work name matching: 4 files updated with strip-suffix + space-collapsed matching
- Auto-translate: new `lib/montree/auto-translate.ts` for fire-and-forget Haiku translation after "Teach the AI"
- Weekly Admin Docs Chinese: `resolveArea()` for UUID areas, `planAreasZh` in API, locale-aware PlanCard + DOCX generation
- Teacher report JSON repair: `repairAndParseJSON()` with nuclear newline→space approach + rewritten system prompt
- Weekly Wrap UI: flag badges, sent/edited badges, photo work names, shelf names all localized

**Weekly Wrap UI Polish — ✅ PUSHED (commits `aaee0d8f` → `e077e68d`):**
6 commits in this session:
1. `aaee0d8f` — Fix UUID areas in weekly wrap + add shelf work picker (WorkWheelPicker integration, `areaIdToKey` map in generation route and review API)
2. `cab4052b` — Full Chinese localization for Weekly Wrap + clean work names (`cleanWorkName()`, `resolveArea()`, `AREA_LABELS_ZH`, `work_zh`/`area_label_zh` fields, 顿号 separators)
3. `d40c65ff` — Rectangular pill badges + `cleanWorkName()` in FocusWorksSection (child week view badges changed from round circles to pills matching Weekly Wrap aesthetic)
4. `dfcc4208` — Remove old Parent Report block from gallery page (replaced with minimal "Invite Parent" text link)
5. `d5d97465` — Generate button in Weekly Wrap header + Weekly Plan & Summary moved to three-dots dropdown menu + WeeklyWrapCard removed from Teacher Tools
6. `e077e68d` — Invite Parents link added to Weekly Wrap sticky bottom bar (left of Send All button)

**Gallery Chronological Order + Photo Audit Sort — ✅ PUSHED (commit `9f9bff3e`):**
Gallery "All Photos" now renders chronologically with date headers (was area-grouped). Timeline tab and Tag Event tab removed (redundant). Area filter chips retained. Photo Audit API sort changed from `created_at` to `captured_at` for consistency.

**Smart Capture Tappable Work Name — ✅ PUSHED (commit `4c736971`):**
PhotoInsightPopup work name row is now a tappable button with pencil icon → opens WorkWheelPicker inline on capture page. "Wrong? Fix →" removed. "Just Save" centered. Full correction flow (area picker → work picker → PATCH → popup reappears) works without leaving capture screen.

**Corrections Map Override + Scenario A Fix — ✅ PUSHED (commit `e7277f24`):**
Visual memory now overrides stale corrections map entries at runtime (fuzzyScore >= 0.5). E.g., "Chalkboard Writing" → "Chalk Board Writing - No lines" instead of → "Name Writing". Pass 2 prompt gets CLASSROOM-VERIFIED PRIORITY rule. Scenario A threshold changed to trust high matchScores (>=0.90) even with moderate Haiku confidence.

**Haiku Classification Fix — Visual Memory Feedback Loop — ✅ PUSHED (commit `cf039f04`):**
Fixed critical data flow break: teacher "Teach the AI" descriptions (Sonnet-quality, confidence 1.0, with key_materials + negative_descriptions) were stored in `montree_visual_memory` but NEVER injected into Haiku identification prompts because `is_custom=false` filter discarded them. 4 changes: (1) Pass 1 reordered — HANDS & PRIMARY WORK now item #1, accessories labeled as secondary. (2) Query expanded — loads key_materials, negative_descriptions, source, description_confidence. (3) Filter replaced — `is_custom OR (source IN teacher_setup/correction AND confidence>=0.9)` instead of just `is_custom`. (4) Visual memory moved to TOP of Pass 2 prompt with rich format (KEY MATERIALS, DISTINGUISH FROM) instead of buried at bottom of 280-line guide.

**Haiku Batch Speed-Up — ✅ PUSHED (same session, commit before cf039f04):**
Photo Audit Haiku batch processing: 3 photos in parallel (was 1 sequential), 500ms delay between batches (was 3000ms per photo). ~47 photos now ~20 seconds instead of ~2.7 minutes.

**Dual P/P/M System + Auto-Presented — ✅ PUSHED (same session):**
Photo Audit seeds P/P/M statuses from DB with "practicing" default. Fire-and-forget persists defaults with `no_downgrade: true`. Multi-child group photos auto-mark all children as "presented" silently (no UI clutter). Progress update API has `no_downgrade` param with STATUS_RANK guard. Case-insensitive progressMap keying fixed.

**Haiku Test Tab + Feature Gates + Upload Limits — ✅ PUSHED + MIGRATED (commit `3b4e1423`, migration 161):**
Photo Audit: new 🧪 Haiku Test diagnostic tab — runs two-pass Haiku without Sonnet fallback, shows Pass 1 (visual description) + Pass 2 (match result). Fixed `visualDescription` block-scoping bug. Weekly Admin Docs feature-gated (dashboard card, page, 5 API routes) — toggleable per-school via super-admin ⚙️. Migration 161 enables for Whale Class. Story video uploads bumped 100→300MB, timeouts 180→300s across all 4 paths.

**Feature-Gated Dashboard — ✅ PUSHED + MIGRATED (commit `039b435d`, migration 160):**
Dashboard sections (Daily Brief, Intelligence, Teacher Tools, Shelf Autopilot, Paperwork Tracker) gated by existing feature flag system. New schools see clean minimal view. Whale Class has everything enabled. Super-admin ⚙️ gear button per school opens feature toggle modal. Features POST route now accepts super-admin auth.

**Story Mobile Video Uploads Fixed — ✅ PUSHED (commit `6bcd3f46`):**
5 root causes fixed: server timeouts too short (60s/120s → 300s), missing iOS MIME types (3gpp, 3gpp2, x-m4v), no AbortController on admin uploads (infinite hang), unsafe `res.json()` on 502 HTML responses, client timeout too short (90s → 180s).

**Guru Progressive Thinking Display — ✅ PUSHED (commit `06f4d337`):**
Shows "Thinking..." → "Building context..." (3s) → "Generating response..." (8s) instead of static dots. Disappears once SSE streaming starts.

**Guru Model String + Error Messages — ✅ PUSHED (commit `e53a8299`):**
Model updated from `claude-sonnet-4-20250514` → `claude-sonnet-4-6`. Error responses now expose actual API error text. Photo audit "Correct" now permanent via `teacher_confirmed` boolean on `montree_media`.

**Paperwork Tracker Panel — ✅ PUSHED (commit `101896b8`):**
New dashboard intelligence panel. Tracks which weekly paperwork packet (weeks 1-37) each child is on.

**Circle Time Cards Merged — ✅ PUSHED (commit `b68a7c4c`):**
Separate Circle Time tab removed. Now "Calling Card Size" dropdown (4×4 duplex / 2×2 circle time) in all 3 Picture Bingo modes.

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

All migrations through 164 have been run. Key ones: 147 (smart learning columns), 148 (classroom onboarding), 152-154 (teacher OS foundation), 155 (teacher OS foundation DDL), 156 (visitor tracking), 157 (teacher notes child_id), 158 (paperwork_current_week), 159 (teacher_confirmed media), 160 (dashboard feature gates + Whale Class enabled), 161 (enable weekly_admin_docs for Whale Class), 164 (cropped_storage_path on montree_media — run Apr 7 via Supabase SQL editor). **Migration 166 (`montree_global_works_staging`) still pending** from prior session. The Apr 7 self-learning loop SQL also added safety-net columns to `montree_visual_memory` (negative_descriptions, key_materials, description_confidence, source, source_media_id, photo_url, updated_at) — all `IF NOT EXISTS`, idempotent.

---

## Session History

Detailed session-by-session history (Feb–Apr 2026) is archived in `docs/CLAUDE_MD_HISTORY.md`. Consult that file for historical context on specific features or decisions.
