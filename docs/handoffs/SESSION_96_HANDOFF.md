# Session 96 — Tracy Cockpit Float, Principal Drill-Down Redesign, Privacy Fix, Free-Tier Degradation, Welcome Template

**Date:** May 8, 2026 (evening)

**Scope:** Big push on the principal-as-overseer experience. Tracy went from a single-page chat to a cockpit-wide chief-of-staff float. The classroom drill-down was redesigned from heavy-gradient/dual-priority-sections to a calm overseer-mental-model layout. Conversation history was leaking between schools — fixed via per-school storage namespacing. Tracy now degrades gracefully on Free-tier schools instead of showing a red error. The teacher welcome template was meaningfully upgraded with PWA install instructions and a Guru pointer. One stacking-context bug fixed at the very end (kebab dropdown was being hidden behind the next teacher row).

---

## Commits pushed to main this session

| Commit | What |
|--------|------|
| `10296b3e` | Fix: SETUP_STEPS ReferenceError on principal setup loading overlay |
| `61d938e9` | Fix: classroom drill-down 'e is not a function' — t shadowing inside .map() |
| `673a5fc2` | Fix i18n keys in classroom drill-down — map to existing flat keys |
| `575b29cb` | Tracy: cockpit-wide float + draft tool + terse chief-of-staff voice |
| `d0188438` | Tracy: Opus voice + first-meeting introduction protocol |
| `926d5531` | Classroom drill-down: redesign for principal-as-overseer flow |
| `451dc548` | Tracy: school-scoped storage + Free-tier graceful degradation + better welcome |
| `5b108ef0` | Fix: kebab dropdown hidden behind next teacher row (z-index stacking trap) |

8 commits, each independently shippable. All on `origin/main`. Railway auto-deploys throughout.

---

## What's new

### Tracy as cockpit-wide chief-of-staff (`components/montree/admin/TracyFloat.tsx`)

- New floating component injected into `app/montree/admin/layout.tsx`. Visible on every cockpit page except `/montree/admin` (chat page IS Tracy in full there).
- Collapsed: 56px gold-bordered avatar upper-right with notification dot for unread.
- Expanded: ~380×540px chat panel with conversation thread + textarea input.
- Auto-opens with situational greeting on first session login. Subsequent page navigation respects persisted open/closed state.
- Question-form action lines ending in `?` surface inline `Yes, please` / `Not now` buttons that auto-send back to Tracy (Pattern A — clean conversation flow, no special UI state).
- Conversation state persists across page navigation via localStorage.

### Tracy's voice — Opus + prose-style system prompt + first-meeting protocol

- Switched the principal-agent route from Sonnet 4.6 → Opus 4.6 via new `OPUS_MODEL` constant in `lib/ai/anthropic.ts`. Cost goes from ~$0.04 to ~$0.20 per interaction. ~$1/day per active principal at typical usage. Worth it for the "wow factor" first-impression marketing window; trivially flippable back to Sonnet later (one-line edit in `app/api/montree/admin/principal-agent/route.ts`).
- System prompt rewritten as natural prose describing who Tracy is, with rules embedded as natural consequences of her character rather than commandments shouted in caps. Opus rewards prose framing with significantly warmer voice.
- Anti-AI-tells list baked into the prompt — Tracy avoids "I had a look around", "I noticed that", "Based on what I'm seeing", "Hope this helps", etc.
- Two distinct kickoff prompts:
  - `[GREETING_FIRST]` — fires the very first time a principal meets Tracy on this device. She introduces herself naturally, then situational, then offer.
  - `[GREETING]` — every session after that. No reintroduction. Just `Hi, [name]. [observation]. → [offer]?`
- Both kickoff prompts are filtered from render on every chat surface — the synthetic prompts never appear as stray user messages.

### `draft_teacher_welcome_messages` action tool

- Tracy's first ACTION tool (vs the existing read-only ones). Generates copy-paste-ready welcome messages with each teacher's login code, school name, classroom name, and principal sign-off.
- Scope: `'all'` (default) | `'classroom'` (with `classroom_id`) | `'teacher'` (with `teacher_id`).
- Skips teachers without a `login_code` with a warning.
- School-scoped to the principal's school via the executor's `schoolId` filter (Phase 7d cross-pollination contract preserved).

### Classroom drill-down redesign (`app/montree/admin/classrooms/[classroomId]/page.tsx`)

Full rewrite, ~1440 insertions / 217 deletions. The principal-as-overseer mental model is the canonical reference implementation here.

**Hierarchy (top to bottom):**
1. Quiet back link + soft header card (icon in emerald-tinted rounded square, name in Lora serif, small stat). Drops the heavy emerald gradient banner.
2. **Teaching team** (focal section). One-line lead "Send each teacher their login code so they can join." Per-teacher row: initial avatar + name + role badge + Copy code button (gold-tinted, instant "Copied" feedback) + Send button (mailto with pre-filled welcome) + kebab for advanced (Set as Lead / Assistant / Teacher, Regenerate code).
3. **Students** (outcome section). When empty: a single calm card explaining "Your teachers will add their students here once they log in. Make sure each one has their login code — that's the unblock." A tiny "Advanced setup" disclosure tucks the manual-add option for legitimate centralized-data-entry edge cases.

**Key UX rules:**
- Lead teachers sort first and get a brighter emerald border.
- The role dropdown that used to clutter every row is now hidden behind the kebab.
- No big +Add Student tile shouting at the principal in the empty student grid — that's not her job.
- Modals re-themed to dark forest tokens (was emerald-900).

### School-scoped Tracy storage (`lib/montree/tracy/storage-keys.ts`)

The privacy fix. Every Tracy localStorage / sessionStorage key is now scoped by `school_id`. Logging into different schools on the same browser will never bleed conversations again.

**Key shape:**
```
montree.admin.agentConvId.<schoolId>           — current conversation id
montree.admin.agentConv.<schoolId>.<convId>    — turns array
montree.tracyFloat.hasMet.<schoolId>           — first-meeting flag
montree.tracyFloat.greetedSession.<schoolId>   — once-per-session greeted
montree.tracyFloat.open                        — UI-only, not school-scoped
```

Both surfaces (TracyFloat + `/montree/admin` chat page) read/write through this module. Old unscoped keys are now orphaned; browser eviction handles cleanup, no migration needed.

### Free-tier graceful degradation

When the principal-agent route 402s (school has no AI tier), the float no longer shows a red error. Instead the assistant turn renders a static welcome:

> Hi, I'm Tracy. I'll be your assistant once your school's AI features are switched on — Montessori expert in your pocket, drafting messages for your teachers, helping you handle parent questions, all the school operations work.
>
> Right now AI isn't active for this school. Drop me a line at tredoux555@gmail.com and I'll get you set up.
>
> → Looking forward to working with you.

`hasMet` only flips to `true` on a successful `done` SSE event, so Free-tier schools keep firing `[GREETING_FIRST]` every session until AI is enabled — the real introduction lands the moment AI lights up.

User-typed questions on a Free-tier school still show an error but with friendlier copy: *"AI features aren't active for this school yet. Email tredoux555@gmail.com to switch them on."*

### Welcome message template (lockstep across both paths)

Classroom-page Send button (`sendEmailToTeacher`) and Tracy's `draft_teacher_welcome_messages` tool now produce the same warmer template:

> Hi [firstName],
>
> Welcome to [school]'s classroom system. Your login code for Montree is [CODE].
>
> Go to montree.xyz, type the code, and you'll land on your classroom ([classroom name]). Tip: once you're in, save the page to your home screen so it works like an app — on iPhone tap the share icon then "Add to Home Screen", on Android tap the menu then "Install app" or "Add to Home Screen".
>
> Once you're in, ask Guru — the AI assistant inside the app — anything you need. Adding students, your first photos, how Montree works. Guru's there for you.
>
> Let me know if you get stuck.
>
> — [principal first name]

PWA install instructions are explicit (iOS + Android both covered). Guru is named directly so the teacher knows who to ask once they land. Whether the principal sends from the classroom row or asks Tracy to draft for the whole team, the teacher gets identical text — feels like one product.

### Other fixes that landed this session

- **SETUP_STEPS ReferenceError** in `app/montree/principal/setup/page.tsx`: line 372 referenced a function-local const from JSX render path. One-line fix swap to `getSetupSteps(t)[setupStepIndex]`.
- **Classroom drill-down `t` shadowing**: `.map(t => ...)` shadowed the i18n function inside the loop. Renamed iterator to `teacher` in both `.map()` blocks and the two filter callbacks. Added comment.
- **i18n key resolution**: rewrote 32 nested key paths in the page (`admin.sections.teachers`, `admin.actions.addTeacher`, etc.) to use the existing flat keys (`admin.teachers`, `admin.addTeacher`). No new translation keys created — used what was already in `en.ts` across all 12 locales.
- **Kebab dropdown z-index trap (final fix)**: `backdrop-filter` on each teacher row created its own stacking context, so the dropdown couldn't escape above the next row. Added `zIndex: menuOpen ? 30 : 1` on the row.

---

## Architectural rules locked in this session — DO NOT BREAK

1. **Tracy is the principal's only AI chat surface.** Guru is per-child Maria-Montessori-in-pocket for teachers. Tracy can call Guru as a sub-tool when child-pedagogical depth is needed (`consult_guru` not yet implemented but reserved).
2. **Tracy runs on Opus.** All other principal-side AI stays on Sonnet. The OPUS_MODEL constant in `lib/ai/anthropic.ts` is what the principal-agent route imports. To revert: swap `OPUS_MODEL` for `AI_MODEL` and update cost constants.
3. **Tracy's storage is school-scoped via `lib/montree/tracy/storage-keys.ts`.** Both TracyFloat and the chat page read/write through this module. NEVER use the old unscoped keys. NEVER bypass the helper.
4. **Tracy's voice rules** — short, smart, no narration of process, principal-as-overseer reframe, end with one concrete next move. Two distinct kickoff prompts (`[GREETING_FIRST]` introduction + `[GREETING]` short greeting). The `→ ` arrow marker is load-bearing — front-end parses it.
5. **Free-tier 402 on a kickoff prompt → static welcome, never a red error.** `hasMet` only flips on successful `done` event so the real introduction lands the moment AI is enabled.
6. **The principal-as-overseer mental model is the canonical posture for cockpit pages.** Foreground what the principal actually does (sharing codes, supporting teachers). Explain (not nag) what isn't her job. Tuck rare admin actions behind progressive disclosure (kebab + Advanced setup). Classroom drill-down is the reference implementation.
7. **Welcome message template lives in TWO places** (classroom-page Send button + Tracy's draft tool) and they MUST stay in lockstep. Both files have a comment pointing at the other. Edit both in the same commit.
8. **Backdrop-filter creates a stacking context** — any sibling element with the same property creates its own. Dropdowns inside one need a parent zIndex bump to escape above siblings.

---

## Multi-teacher classroom — confirmed working

A side question raised during the session: does the infrastructure support multiple teachers per classroom? Confirmed yes — Test School 1 already has 3 teachers (Test Teacher 1, 2, 3) all linked to Test Classroom 1, each with their own login code (ANT3VA, MA9Q2T, 7X67B9), all rendering correctly in the new drill-down.

Schema: `montree_teachers` is one row per teacher with a single `classroom_id`. Multiple teachers having the same `classroom_id` is the supported pattern. No upper limit at the schema level; the classroom drill-down sorts lead-first then alphabetically.

Subtle things worth recording:
- Photo confirmation is first-come-first-served. Two teachers opening the same unconfirmed photo simultaneously: whoever taps first wins.
- No team-level "what did we do this week" surface yet. Tracy's `unpack_teacher` is per-teacher; a team-level read isn't a current tool.
- No notification routing for multi-teacher classrooms. Becomes relevant when parent-reply notifications are built.

---

## Verification list (next session, after Railway redeploys `5b108ef0`)

1. Hard refresh `montree.xyz/montree/admin/classrooms/<id>` on Test School 1.
2. Click any teacher's kebab — dropdown should appear ABOVE the next row, not behind it.
3. Verify "Set as Lead / Set as Assistant / Set as Teacher / Regenerate code" all visible end-to-end.
4. Verify the conversation leak is gone — Tracy on Test School 1 should show fresh thread, not Whale Class's Amy chat.
5. Tap a teacher's Send button — mailto should open with the new welcome template (PWA install tip + Guru pointer + sign-off).
6. To verify Free-tier degradation: temporarily flip Test School 1 back to Free in super-admin, hard refresh, watch Tracy auto-open with static welcome instead of red error. Then flip back to Premium.
7. Verify the classroom drill-down still works on mobile (narrow viewport) — teacher row's `flexWrap: wrap` should drop actions below the name on narrow screens.

---

## Next session priorities (in order)

1. **Tracy float overlap on viewports < ~1330px.** Page content extends into the Tracy panel zone. Layout-shift work — reserve right padding when float is open, or shrink page maxWidth when float is open. ~30 min.
2. **Continue the dashboard redesign page-by-page** following the overseer mental model:
   - Classrooms list (`/montree/admin/classrooms`)
   - Today (`/montree/admin`) — architectural decision: stays as Tracy chat, or becomes a digest with Tracy floating? My lean: digest. ~1.5h plus design discussion.
   - People (`/montree/admin/people`)
   - Pulse (`/montree/admin/pulse`)
   - Settings (`/montree/admin/settings`)
3. **Stripe wiring per `docs/STRIPE_BILLING_SETUP.md`** (carry-over from Session 93). Migration 189 already run; just env vars + webhook configuration. Biggest unlock — agent dashboard, payouts, Money tab all light up after this.
4. **Run migration 188 in Supabase** (carry-over from Session 91). Required before agent dashboard can authenticate Sarah / future agents.
5. **Resend domain verification** for `montree.xyz` so confirmation emails reach leads (carry-over from Session 83).
6. **Issue Sarah's agent login** — Super-admin Referrals → 🔑 button on her row → reveal-once code → share with her.
7. **Phase 5 Payout calculator** (~1.5 days). Reads `montree_finance_transactions`. Idempotent monthly aggregator → `montree_agent_payouts`. Unblocked once Phase 4 is wired.
8. **Phase 6 super-admin Money tab** (~2-3 days). Same ledger, P&L view + exports.
9. **Outreach** (carry-over): FAMM Argentina + Cambridge Montessori Global + Otari NZ + Lions Gate + Montessori Norge follow-ups (see `Active Reply Threads` block in CLAUDE.md). Plus 14+ bounce addresses still need DB `status='bounced'` updates.
10. **Optional: GuruFloat** — the teacher-side mirror of TracyFloat, using everything we built for Tracy as a template (~2-3h). Build when teacher onboarding signal indicates they're getting lost.

---

## Files changed across the 8 commits

**New files:**
- `components/montree/admin/TracyAvatar.tsx`
- `components/montree/admin/TracyFloat.tsx`
- `lib/montree/tracy/storage-keys.ts`

**Modified:**
- `app/api/montree/admin/principal-agent/route.ts`
- `app/montree/admin/classrooms/[classroomId]/page.tsx` (redesign + bug fixes)
- `app/montree/admin/layout.tsx`
- `app/montree/admin/page.tsx`
- `app/montree/principal/setup/page.tsx`
- `lib/ai/anthropic.ts`
- `lib/montree/tracy/system-prompt.ts`
- `lib/montree/tracy/tool-definitions.ts`
- `lib/montree/tracy/tool-executor.ts`

---

## Cost impact

- Tracy on Opus: ~$0.20 per interaction (was $0.04 on Sonnet).
- At 3-5 Tracy interactions/day per active principal: ~$1/day per principal.
- For the first 50-100 schools (the marketing window): ~$30-50/principal/month — trivial against multi-year contract value if those principals refer 2-3 more schools each.
- Switch back to Sonnet later via one-line constant change. Voice cliff should be smaller than expected because the prompt is prose-style — Sonnet handles it ~80-85% as well.

---

## Audit summary

Each major piece went through plan-audit-build-audit-fix cycles. The kebab z-index bug was the only late catch from a real production screenshot — caught because the user opened the menu and saw it hidden. Stacking contexts from `backdrop-filter` are a known CSS gotcha that doesn't surface in dev unless rows actually overlap.

Three consecutive clean audits done before each major commit. Lint clean across all changed files (the 4 pre-existing warnings on `app/montree/admin/page.tsx` and 2 on `app/montree/admin/layout.tsx` are unchanged from before this session).

---

## 🚨 NEXT SESSION: Parent Communication — theorize-first

User flagged this at the very end of Session 96 for next-session work: **how should parent ↔ school communication flow through Montree?** Capturing the kickoff thinking here so we hit the ground running.

### The current state (what exists today)

- **Weekly Wrap reports** are generated by the AI and sent to parents via email (Resend) — one-way teacher → parent.
- **Story system** (separate from Montree) at teacherpotato.xyz/story has its own messaging surface — admins broadcast media to logged-in users, with text/image/video/document support. NOT integrated into Montree.
- **No in-app parent ↔ teacher messaging in Montree.** A parent reading a weekly report can't reply within the app. Teachers can't message parents directly. The parent dashboard is read-only.
- **No notification system.** When a parent reply email lands in the school's inbox, no one in Montree knows.
- **Multi-teacher classrooms have no notification routing** — no concept of "send the parent reply to the lead teacher" or "broadcast to all teachers in the classroom".
- **Guru exists for teachers** as a per-child pedagogical assistant. He doesn't currently surface "the parent asked X about Y" as something he can help draft a response to.
- **Tracy can answer parent-relayed questions** (`child_focus` tool with the parent's question text). She drafts the response in the principal's voice. But it's the principal who relays — there's no in-app channel.

### What the user wants to theorize

The vague but real product question: **what should the parent's experience inside Montree look like beyond receiving the weekly report?** Open territory — reply to a report, ask a question about their child, request a meeting, raise a concern, share something from home, get a quick "here's what we observed today" pulse. Some of these are async messaging, some are richer (media, voice notes), some are AI-summarised, some are routed by content type.

### The theorize-first questions to answer next session

These are the prompts to think through, NOT a build plan yet:

1. **What channels exist?** Direct message (parent ↔ teacher), broadcast (school → all parents), reply-to-report (parent commenting on a Weekly Wrap), forum / community (less likely for early product), 1:1 with principal (escalation channel)? Which of these are critical vs. fluff?

2. **Who's the primary author on the school side?** Per-child it's almost always the lead teacher of that child's classroom. But for school-wide announcements, it's the principal. For "we're closed Monday for a holiday" it's the principal. Implication: messages need a sender role.

3. **How does multi-teacher classroom routing work?** When a parent of Amy (in Test Classroom 1, three teachers) sends a question, who gets it? Three options: (a) lead teacher only, (b) all teachers in the classroom — first-to-claim-it, (c) all teachers — round-robin or ownership tag. Each has UX implications.

4. **What does Tracy do in this picture?** Tracy currently helps the *principal* handle queries that escalate to her. In a parent-comms world, Tracy could: surface unread parent messages on the principal's dashboard, draft principal responses, alert when a teacher hasn't responded in N days, summarise the week's parent conversations into a "parent pulse" view. She does NOT need to be the messaging UI — she's the chief-of-staff watching over it.

5. **What does Guru do?** Per-child pedagogical pocket. When a parent asks "how can I support Amy with reading at home?", Guru is the right voice to draft the response — he knows Amy's progress, sensitive periods, recent works. The teacher gets Guru's draft and can edit. So Guru becomes the *drafting layer* for child-specific parent questions.

6. **How does notification work?** Email + push notification + in-app badge? Cross-device sync? Parents probably want push (they're on mobile, the PWA install we just put in the welcome email becomes critical). Teachers probably want email + in-app (they're at work). Principal wants in-app surfacing via Tracy.

7. **What about media in messages?** Parents sharing a photo of Amy reading at home → teacher uses it as observation material? That's actually a really nice flow — extends the photo identification pipeline to parent-uploaded content. New permissions surface (parent can upload, teacher confirms, AI identifies).

8. **What about consent and privacy?** Some schools want all parent-teacher communication archived for compliance. Some parents want a "delete this message" right. Some teachers want to draft messages that need principal approval before sending. These are policy questions, not technical ones — but they shape the data model.

9. **What about translation?** A parent who speaks Spanish messaging an English-speaking teacher. The Story system already has multilingual auto-translation patterns (per Session 67-78). Could the parent-comms layer reuse that? Probably yes — Haiku translates inbound parent messages into the teacher's UI locale, and outbound teacher messages into the parent's preferred locale. Maintains both sides reading natively.

10. **What's the MVP cut?** Probably a "parent reply to weekly report" button that opens an in-app message thread with the lead teacher (multi-teacher routing → lead first). Lead teacher replies via Guru-drafted response (or freehand). Both sides see the thread. Tracy surfaces it on the principal's dashboard if it goes 48h without a teacher reply. Everything else (school broadcasts, parent media uploads, multi-language) is later.

### Architectural pieces that probably get built

- New table `montree_parent_messages` — thread-based (parent_id, classroom_id, child_id, sender_role, body, attachments, sent_at).
- New table `montree_parent_message_threads` — groups messages, tracks last-read timestamps per participant for unread counts.
- Notification fan-out — email (Resend) + push (PWA notifications API) + in-app badge.
- New parent dashboard surface to compose + view threads.
- New teacher dashboard surface to receive + reply (probably in the existing teacher portal, somewhere accessible — sidebar entry or per-child page).
- Tracy gets a new tool `summarise_parent_threads` for the principal's overview.
- Guru gets a `draft_parent_response` tool that takes the parent's question + the child's context and returns a parent-ready paragraph.

### What NOT to do in the theorize session

- Don't build code. Theorize the data model, the channels, the routing rules, the role of Tracy and Guru. Decision document, not a feature.
- Don't try to design the UX for every screen — name the screens we'll need, sketch their purpose, defer the layouts.
- Don't get into push-notification infrastructure choices yet (web push, APNs, FCM, etc.) — that's an engineering decision for the build session.

### Read-before-theorizing

Before next session opens, the agent should read:
- This handoff (`docs/handoffs/SESSION_96_HANDOFF.md`).
- CLAUDE.md Session 96 entry.
- The current parent dashboard (`app/montree/parent/dashboard/page.tsx`) to see what exists today.
- The Story system's messaging schema (`story_message_history` table) — even though Story is a separate product, its messaging primitives are well-thought-out and reusable.
- The Weekly Wrap email send route (`app/api/montree/reports/send/route.ts`) — that's the existing parent-facing communication channel; the new layer needs to integrate with it.

Then we plan, audit the plan, and either start building or refine the plan further.
