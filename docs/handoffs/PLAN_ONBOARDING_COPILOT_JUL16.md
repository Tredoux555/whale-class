# PLAN — ONBOARDING COPILOT ("The Guide") — Jul 16, 2026
**Binding contract. Fable authored. Builders follow this exactly — no improvisation on flow logic, API shapes, or copy. Deviations require Fable sign-off.**

## §0 Rulings (Tredoux, Jul 16 2026 — locked)
1. **Voices: Astra (principal side) + Guru (teacher side).** No new persona. The guide card *speaks as* the AI companion the user will live with anyway — onboarding doubles as meeting them.
2. **Rollout: everyone, feature flag `onboarding_copilot` default TRUE.** The engine derives state from real data, so established schools complete instantly and the dock retires itself.
3. **This deliberately reverses the Feb-27 "no onboarding guides" decision** — Tredoux's explicit ask, Jul 16. The old guide components (`PrincipalSetupGuide`, `PrincipalAdminGuide`, `WeekViewGuide`, `DashboardGuide`, `StudentFormGuide`, `WelcomeModal`) **stay dead** (`false &&`). Do NOT revive, wire, or delete them. This copilot is a fresh bolt-on.
4. **Coded steps are ground truth; AI never decides navigation.** The AI (Haiku) only answers free-form questions *inside* the current step's context. The step engine is deterministic and derives completion from real DB state — it can never nag about something already done.
5. **AI model: HAIKU_MODEL always, all tiers, including free.** Onboarding help must never 402 — this is the most fragile moment of the funnel. Budget-metered like every AI route. Conversational → default temperature (the temp-0 rule is for durable outputs only).

## §1 Architecture (bird's eye)
- **Shared pure lib** `lib/montree/onboarding-copilot/journeys.ts` — journey definitions + `deriveJourney()` pure function. Imported by the client dock AND the server ask-route so both derive identically.
- **State route** `GET /api/montree/onboarding-copilot/state` — one cheap round-trip: feature-flag check, count queries, progress rows. Admin surface has NO FeaturesProvider — the state route returning `{enabled:false}` is the single gate; the dock renders nothing.
- **Progress route** `POST /api/montree/onboarding-copilot/progress` — dismiss / celebrate / skip rows into the EXISTING `montree_onboarding_progress` table (migration 131, RLS'd, zero frontend callers today). **No new table.**
- **Ask route** `POST /api/montree/onboarding-copilot/ask` — Haiku Q&A scoped to current step.
- **UI** `components/montree/onboarding-copilot/CopilotDock.tsx` — floating pill → expanding guide card, mounted in `app/montree/dashboard/layout.tsx` (teacher) and `app/montree/admin/layout.tsx` (principal, after `authState==='authed'`).
- **Anchor pulse, not spotlight-dimming.** ~10 `data-copilot="…"` attributes on existing elements; if the anchor exists on the current page, a soft emerald pulsing ring renders over it (portal + getBoundingClientRect). If not found → card alone. Zero layout risk, resilient to refactors.
- **Migration 297** — feature definition only.

## §2 Shared TypeScript interface (PINNED — both builders copy this verbatim)
```ts
// lib/montree/onboarding-copilot/journeys.ts
export type JourneyId = 'principal' | 'teacher';

export interface CopilotState {           // returned by GET /state as `state`
  classrooms: number;
  classrooms_without_teacher: number;
  teachers: number;
  teachers_logged_in: number;             // last_login_at IS NOT NULL
  students: number;
  profiles_onboarded: number;             // montree_child_mental_profiles count for scope
  photos: number;                         // montree_media rows in scope
  photos_confirmed: number;               // teacher_confirmed = true
  parent_codes: number;                   // parent invites generated in scope
  reports_sent: number;                   // sent parent reports in scope
  tell_guru_enabled: boolean;             // feature flag tell_guru_onboarding
  pending_teacher_names: string[];        // teachers with last_login_at NULL (max 5)
}

export interface CopilotStep {
  id: string;
  route: string;                          // where the action happens ("Take me there")
  titleKey: string;                       // i18n key
  whyKey: string;
  instructionKeys: string[];              // ordered numbered instructions (each an i18n key)
  anchor?: string;                        // data-copilot value to pulse on step.route
  waitState?: boolean;                    // true = user is waiting on someone else (no "Take me there" urgency)
  optional?: boolean;                     // skippable
  celebrateKey: string;                   // the line shown when this step flips done
  doneWhen: (s: CopilotState) => boolean;
}

export interface DerivedJourney {
  journey: JourneyId;
  steps: Array<CopilotStep & { done: boolean; skipped: boolean; current: boolean }>;
  currentStep: (CopilotStep & { index: number }) | null;  // null = all done
  completed: boolean;
  totalVisible: number;                   // steps after hiding (e.g., T2 hidden when tell_guru_enabled=false)
  doneCount: number;
}

export function getJourney(journey: JourneyId): CopilotStep[];
export function deriveJourney(
  journey: JourneyId,
  state: CopilotState,
  progressStepKeys: string[]              // step_key rows already written (skip:* and celebrated:*)
): DerivedJourney;
```
Rules for `deriveJourney`: a step is `skipped` if `progressStepKeys` contains `skip:<id>`; skipped counts as done for progression. Teacher step `voice_intro` is **hidden entirely** (not rendered, not counted) when `tell_guru_enabled === false`. `current` = first step neither done nor skipped. Pure function, no I/O, no Date.

## §3 API contracts (PINNED)

### GET `/api/montree/onboarding-copilot/state`
Auth: `verifySchoolRequest`. Role from auth (`principal` → principal journey; `teacher` → teacher journey; `homeschool_parent` → treat as teacher; any other → `{enabled:false}`).
1. `isFeatureEnabled(supabase, schoolId, 'onboarding_copilot')` — false → `{ enabled: false }` (200). Fail-closed.
2. Compute `CopilotState` with **cheap `count: 'exact', head: true` queries**, school-scoped for principals, classroom-scoped for teachers:
   - classrooms/teachers: `montree_classrooms` / `montree_teachers` where `school_id` + `is_active=true`; `teachers_logged_in` adds `.not('last_login_at','is',null)`; `classrooms_without_teacher` derived from a light select of classroom ids vs teacher classroom_ids.
   - students: `montree_children` where `classroom_id IN (school's classroom ids)` (teacher: their classroom) + `is_active=true` if column exists.
   - profiles_onboarded: `montree_child_mental_profiles` joined by child ids in scope (builder: mirror however `/api/montree/onboarding/voice/status` counts it — copy that logic, don't invent).
   - photos / photos_confirmed: `montree_media` in scope (`teacher_confirmed=true` for confirmed). Builder: verify scope column (classroom_id/child_id) from the photo-audit API, mirror it.
   - parent_codes: `montree_parent_invites` in scope.
   - reports_sent: mirror EXACTLY the table/filter that powers `last_report_sent_at` in `app/api/montree/dashboard/parent-codes/route.ts` — count > 0 in scope.
   - `tell_guru_enabled`: `isFeatureEnabled(..., 'tell_guru_onboarding')`.
3. Read progress rows: `montree_onboarding_progress` where `user_id = auth userId`, `user_type = role`, `feature_module = 'copilot_<journey>'`. Return `progress_step_keys: string[]`, plus `dismissed` (`__dismissed__` present) and `completed_celebrated` (`__completed__` present).
Response 200:
```json
{ "enabled": true, "journey": "principal", "state": { ...CopilotState },
  "progress_step_keys": ["celebrated:classroom"], "dismissed": false, "completed_celebrated": false }
```
Headers: `Cache-Control: no-store`. Any query error → `{enabled:false}` with a `console.error` — the copilot must NEVER break a page.

### POST `/api/montree/onboarding-copilot/progress`
Auth: `verifySchoolRequest`. Body: `{ journey: 'principal'|'teacher', step_key: string }`. Allowed step_key shapes ONLY: `__dismissed__`, `__completed__`, `skip:<stepId>`, `celebrated:<stepId>` where `<stepId>` is a real step id from `getJourney(journey)` — reject otherwise (400). Upsert into `montree_onboarding_progress` on the existing unique key `(user_id, user_type, feature_module, step_key)` with `feature_module = 'copilot_' + journey`, `completed_at = now()`. Returns `{ok:true}`.

### POST `/api/montree/onboarding-copilot/ask`
Auth: `verifySchoolRequest`. Body: `{ question: string (cap 500 chars), journey, locale }`.
1. Flag check (same as state). 2. `checkAiBudget(schoolId)` — blocked → 429 `{error:'budget'}` (client shows coded fallback line, never raw error). 3. Recompute `CopilotState` server-side (reuse the state route's query helper — extract it to `lib/montree/onboarding-copilot/state-loader.ts` so both routes share it) and `deriveJourney`. 4. Call Anthropic `HAIKU_MODEL`, `max_tokens: 400`, non-streaming, default temperature. 5. `logApiUsage({schoolId, teacherId, endpoint:'/api/montree/onboarding-copilot/ask', model, inputTokens, outputTokens})`. Response `{ answer: string }`.

**Ask system prompt (builder A assembles from these blocks, verbatim intent):**
- Persona: principal → "You are Astra, the principal's calm chief of staff at their Montessori school." teacher → "You are Guru, the teacher's warm Montessori mentor."
- Voice rules: warm, plain, ≤120 words, ONE thing at a time, never bullet-spam, no exclamation marks except genuine celebration, answer in the user's locale (`locale` passed in).
- Grounding: inject the full journey map (step titles + instructions + done/current flags from `deriveJourney`) and the raw `CopilotState` numbers. Hard rule: "Only reference screens, buttons and click-paths that appear in the journey map above. If asked about anything outside onboarding, answer briefly and steer back to the current step. Never invent UI."

## §4 Journeys + COPY (PINNED — Fable-authored; builders transcribe into i18n keys, do not rewrite)

All keys under `copilot.*`. EN + ZH get real translations (builder B writes ZH faithfully); the other 10 locale files get the key with the ENGLISH value (house precedent). Persona name is NOT in the copy strings (the card chrome shows Astra/Guru).

### PRINCIPAL journey (`copilot_principal`) — 6 steps

**P1 `classroom` — route `/montree/admin/classrooms` — anchor `nav-classrooms`**
- title: "Open your first classroom"
- why: "Everything in Montree lives inside a classroom — the children, the shelf, the photos. It takes ten seconds. One tip: set your school up from a computer — it's quicker — and let your teachers join from their phones."
- instructions: ["Click **Classrooms** in the sidebar.", "Click the dashed **+ Add Classroom** tile, give it a name, pick a colour."]
- celebrate: "Your classroom exists. It already has the full Montessori curriculum on its shelves."
- doneWhen: `classrooms >= 1`

**P2 `teacher` — route `/montree/admin/classrooms` — anchor `nav-classrooms`**
- title: "Give the classroom its teacher"
- why: "Montree is built around the teacher — they'll add the children and take the photos. You just open the door for them."
- instructions: ["Click **Classrooms**, then click into your classroom.", "In **Teaching team**, click **Add a teacher** and type their name.", "Montree creates a 6-letter login code for them — you'll see it on their row."]
- celebrate: "Done. That little code is their key to everything."
- doneWhen: `teachers >= 1 && classrooms_without_teacher === 0`

**P3 `handover` — route `/montree/admin/classrooms` — anchor `teaching-team` — waitState: true**
- title: "Hand over the key"
- why: "This is the one step Montree can't do for you: the code has to travel from your hands to theirs. The moment they log in on their own phone, everything else starts moving."
- instructions: ["Open the classroom and find the teacher's row in **Teaching team**.", "Tap **Copy** next to their code — or **Send** to open a ready-written message.", "Send it to them however you normally talk — WeChat, WhatsApp, in person. They log in at **montree.xyz** on their phone with just that code — Montree is made for the teacher's pocket."]
- celebrate: "{name} is in. That was the hard part — from here the classroom runs itself."  *(key `copilot.p3.celebrate` takes a `{name}` placeholder; client substitutes first logged-in teacher name or "Your teacher")*
- waiting line (extra key `copilot.p3.waiting`): "Waiting for {names} to log in for the first time — I'll tick this myself the moment it happens."
- doneWhen: `teachers_logged_in >= 1`

**P4 `students` — route `/montree/admin/classrooms` — waitState: true**
- title: "The children arrive"
- why: "Your teacher adds their own class from their device — names first, details later. It takes them about two minutes."
- instructions: ["Nothing for you to click here. If you'd rather enter the class list yourself, open the classroom and look under **Advanced setup**.", "Otherwise, just tell your teacher: 'Add your students when you log in.'"]
- celebrate: "The class list is in. Your school has children in it now."
- doneWhen: `students >= 1`

**P5 `first_photo` — route `/montree/admin/classrooms` — waitState: true**
- title: "The first photo"
- why: "This is the moment Montree becomes real: your teacher photographs a child working, and the system recognises the material, logs the observation, and starts the child's record — from one tap."
- instructions: ["Ask your teacher to take one photo of a child working, using the camera button in their app.", "Watch it appear — no forms, no typing."]
- celebrate: "There it is. One photo became an observation, a progress record, and the seed of a parent report."
- doneWhen: `photos >= 1`

**P6 `first_report` — route `/montree/admin` — waitState: true**
- title: "The loop closes"
- why: "At the end of the week, your teacher sends each family a personal report — written from the week's real observations. This is the moment parents fall in love with your school."
- instructions: ["Your teacher does this from **Parents → Reports** on their device.", "When the first one goes out, you'll see it tick here."]
- celebrate: "A family just received a report about their child that no other school could have written. That's your school now."
- doneWhen: `reports_sent >= 1`

**Principal completion (key `copilot.principal.complete`):** "That's the whole engine running — teacher in, children in, photos flowing, families connected. I'm Astra, and I'm here every day after this one. Ask me anything about your school, any time."

### TEACHER journey (`copilot_teacher`) — 6 steps

**T1 `students` — route `/montree/dashboard/students` — anchor `add-students`**
- title: "Bring in your class"
- why: "Start with just their names — you can add everything else later. Thirty seconds per child."
- instructions: ["Tap the big **import card** on your dashboard — or open **☰ More → Students**.", "Type or paste your class list, one child per row.", "Tap **Save** — that's your whole class in."]
- celebrate: "Your class is in. Look at them all."
- doneWhen: `students >= 1`

**T2 `voice_intro` — route `/montree/dashboard/voice-onboarding` — optional: true** *(hidden when `tell_guru_enabled=false`)*
- title: "Tell me about them"
- why: "Talk for a minute about each child — what they love, where they are — and I'll build their profile and set up their first shelf. You know things about these children that no form could capture."
- instructions: ["Right after you add students, I'll offer this on screen — just tap **Tell me about them**.", "Speak naturally, like you're telling a colleague about the child.", "You can do a few children now and the rest whenever."]
- celebrate: "Now I know them too. Their starter shelves are set."
- skip label (key `copilot.skipStep`): "Skip for now"
- doneWhen: `profiles_onboarded >= 1`

**T3 `first_photo` — route `/montree/dashboard` — anchor `camera`**
- title: "Catch one moment"
- why: "This is the heart of Montree. One photo of a child working, and I'll recognise the material, write the observation, and update their progress — while you stay with the children."
- instructions: ["Tap the **camera** at the top of your screen.", "Photograph one child at work — any work.", "Tap the child's face to tag them, then **Save**. That's it — I take it from there."]
- celebrate: "Got it. While you kept teaching, I identified the work and logged the observation."
- doneWhen: `photos >= 1`

**T4 `confirm` — route `/montree/dashboard/photo-audit` — anchor `confirm-tab`**
- title: "Check my work"
- why: "I'll show you what I saw in each photo. One tap to confirm — and every confirmation makes me sharper at recognising your classroom's materials."
- instructions: ["Open **☰ More → Wrap Up**.", "On the **Confirm** tab, look at my guess under the photo.", "Tap ✓ if I got it right — or fix me, and I'll remember."]
- celebrate: "Confirmed. I just got a little smarter about your classroom."
- doneWhen: `photos_confirmed >= 1`

**T5 `parents` — route `/montree/dashboard/parent-codes` — anchor `parent-codes`**
- title: "Invite a family"
- why: "Each family gets their own private window into their child's days — photos, progress, reports. One code per child."
- instructions: ["Open **☰ More → Parents**.", "On the **Codes** tab, tap **Generate** next to a child.", "Tap **Welcome message** — it copies a ready-to-send note with their code. Paste it to the parent."]
- celebrate: "The first family is connected. They're going to love what comes next."
- doneWhen: `parent_codes >= 1`

**T6 `report` — route `/montree/dashboard/parent-codes` — anchor `reports-pill`**
- title: "Send your first report"
- why: "This is Friday's magic: a personal report for each family, written from the week's real moments. What used to take your whole evening now takes a minute of review."
- instructions: ["Open **☰ More → Parents**, then the **Reports** tab.", "Tap **Preview** on a child — read what I wrote.", "Happy with it? Tap **Send**."]
- celebrate: "Sent. A family is reading about their child's week right now. This is why we do it."
- doneWhen: `reports_sent >= 1`

**Teacher completion (key `copilot.teacher.complete`):** "That's your whole rhythm: photograph, confirm, and on Fridays, send. Everything else, you already know how to do — teach. I'm Guru, and I'm in your menu whenever you need me."

### Chrome copy (keys, EN values)
- `copilot.pill.next`: "Next: {title}"
- `copilot.pill.of`: "{done} of {total}"
- `copilot.card.doThis`: "Do this"
- `copilot.card.takeMeThere`: "Take me there"
- `copilot.card.askPlaceholder.principal`: "Ask Astra about this step…"
- `copilot.card.askPlaceholder.teacher`: "Ask Guru about this step…"
- `copilot.card.dismiss`: "I'll find my own way"
- `copilot.card.dismissConfirm`: "Hide the guide for good? You can't bring it back."
- `copilot.card.askError`: "I couldn't answer just now — but the steps above are all you need."
- `copilot.card.stepDone`: "Done"
- `copilot.card.waiting`: "Waiting…"

## §5 UI spec — `CopilotDock` (Builder B)
- **Files:** `components/montree/onboarding-copilot/CopilotDock.tsx` (+ optionally `CopilotCard.tsx`, `AnchorPulse.tsx` in the same dir). Dynamic-import in both layouts with `next/dynamic({ ssr:false })` (house pattern).
- **Mounts:** `app/montree/dashboard/layout.tsx` (inside FeaturesProvider tree, sibling of NetworkStatusBanner) and `app/montree/admin/layout.tsx` (render only when `authState==='authed'`). Pass a `surface: 'teacher'|'principal'` prop.
- **Render nothing when:** state fetch failed / `enabled:false` / `dismissed` / (`completed` AND `completed_celebrated`) / pathname is `/montree/dashboard/capture` or `/montree/dashboard/voice-onboarding` (focus modes) / `window.print` contexts.
- **z-index:** pill+card at **9000** — deliberately BELOW OnboardingPathChoice takeover and modals (9997+), ABOVE page content. AnchorPulse at 8999, `pointer-events: none`.
- **Collapsed pill** (default state on every mount): bottom-LEFT, `env(safe-area-inset-bottom)` respected. Glass dark-forest chip: small Astra/Guru avatar dot (emerald ring), text `Next: {step title}` + `{done}/{total}`. Tap → expands. Builder: visually verify no collision with TracyFloat on `/montree/admin/*` (TracyFloat is the existing float — if it's bottom-left, move the pill bottom-right; check, don't assume).
- **Expanded card:** max-width 380px desktop (bottom-left panel), full-width bottom sheet on ≤640px. Contents top-to-bottom: header (avatar + "Astra"/"Guru" + progress dots for visible steps + collapse ✕), step title (Lora), why (2 lines, textSecondary), "Do this" numbered instructions, `[Take me there →]` (emerald, `router.push(step.route)`; hidden when already on `step.route` or `waitState`), waiting line w/ soft pulse for waitState steps (P3 uses `copilot.p3.waiting` with `pending_teacher_names` joined), skip link for optional steps, ask box (input + send; answers render inline in a small scrollable thread that resets per step; while loading show three-dot typing), footer dismiss link (confirm via `window.confirm` with `dismissConfirm` copy → POST `__dismissed__`).
- **Celebration:** when a refetch flips the current step's `doneWhen` from false→true (client compares previous derived state), swap card body for the celebrate line + a soft emerald ✓ sweep (~1.8s), POST `celebrated:<id>`, then advance to next step. On journey completion: completion copy + gentle confetti-free glow moment (~3s), POST `__completed__`, then the dock unmounts forever.
- **Refetch triggers:** pathname change; `visibilitychange`→visible; `focus`; every 20s while expanded AND visible; after any progress POST. Single-flight (no overlapping fetches). All fetches via `montreeApi()`.
- **AnchorPulse:** if `currentStep.anchor` and `document.querySelector('[data-copilot="'+anchor+'"]')` exists on the current page → portal a soft emerald pulsing ring (border 2px `rgba(52,211,153,0.55)`, 8px padding around rect, border-radius 14px, opacity keyframe pulse) positioned via `getBoundingClientRect()`, repositioned on scroll/resize (rAF-throttled). Element missing → no pulse, no error.
- **Styling:** copy the canonical `T` dark-forest token object verbatim (bg `#0a1a0f`, emerald `#34d399`, glass `rgba(255,255,255,0.06)` + border `rgba(52,211,153,0.15)` + blur(18px), Lora headings / Inter body, Lucide icons `strokeWidth={1.75}`), inline styles only, **no Tailwind, no `<style jsx>`** — keyframes via ONE top-level `<style dangerouslySetInnerHTML>` (Turbopack rule, CLAUDE.md May-29).
- **Anchors to add (Builder B, minimal attribute-only edits):**
  - `app/montree/admin/layout.tsx`: `data-copilot="nav-classrooms"` on the Classrooms nav link.
  - `app/montree/admin/classrooms/[classroomId]/page.tsx`: `data-copilot="teaching-team"` on the Teaching team section wrapper.
  - `components/montree/DashboardHeader.tsx`: `data-copilot="camera"` on the camera button; `data-copilot="more-menu"` on the ☰ More button.
  - `app/montree/dashboard/students/page.tsx`: `data-copilot="add-students"` on the Add Student button.
  - `app/montree/dashboard/photo-audit/page.tsx`: `data-copilot="confirm-tab"` on the Confirm tab button.
  - `app/montree/dashboard/parent-codes/page.tsx`: `data-copilot="parent-codes"` on the Codes pill, `data-copilot="reports-pill"` on the Reports pill.
  - Attribute additions ONLY — do not restructure any of these files.

## §6 Builder split
**Builder A — backend + engine:**
1. `migrations/297_onboarding_copilot_flag.sql` — feature definition `onboarding_copilot` ("Onboarding Guide", icon 🧭, category `management`, `is_premium=false`, **`default_enabled=true`**), idempotent `ON CONFLICT DO UPDATE`, BEGIN/COMMIT. Add `onboarding_copilot` to the `FeatureKey` union in `lib/montree/features/types.ts`.
2. `lib/montree/onboarding-copilot/journeys.ts` — §2 interface + §4 journeys (keys only, no English strings — copy lives in i18n; `deriveJourney` per §2 rules). Must run in browser AND node (pure, no imports beyond types).
3. `lib/montree/onboarding-copilot/state-loader.ts` — `loadCopilotState(supabase, {schoolId, classroomId, role})` per §3. Mirror existing query logic (voice/status for profiles; parent-codes route for reports_sent; photo-audit API for media scope) — read those files first.
4. Routes: `state`, `progress`, `ask` per §3 exactly (verifySchoolRequest, isFeatureEnabled, checkAiBudget, logApiUsage — all four, house skeleton).
5. **Bonus fix (flagged, separate commit-able change):** `POST /api/montree/admin/classrooms` does not seed curriculum (setup + try/instant do). Add the same `seedCurriculumForClassroom` call, fire-and-forget-safe, mirroring `principal/setup`'s usage.
6. Node logic harness `scripts/_tmp_copilot_harness.mjs` (repo root, temp): assert `deriveJourney` on ≥8 scenarios (fresh principal, teacher-logged-in flip, skip flow, tell_guru off hides T2, completed journey, etc). Run it green.

**Builder B — frontend:**
1. `CopilotDock` + subcomponents per §5.
2. Mounts in both layouts + the ~7 anchor attributes.
3. i18n: all `copilot.*` keys from §4 into ALL 12 locale files — EN real, ZH real translation (faithful, warm register, 你 for teacher, 您 for principal), other 10 = English values. Respect each file's existing structure; run the parity check if one exists.
4. Builder B codes against the §2 interface importing from `lib/montree/onboarding-copilot/journeys.ts` (Builder A's file). If building before A lands, code to the pinned interface — do not fork the types.

**Both:** ESLint 0 errors on every touched file; scoped tsc clean; no console noise; never break existing pages — every copilot failure path degrades to "render nothing".

## §7 Landmines (from the Jul-16 audit — violating any of these is a FIX-FIRST)
1. **Do not re-trigger the post-import takeover** or probe voice status on dashboard load — the Jul-3 fix killed exactly that. The copilot only *points to* the takeover (T2) and reads counts from its own state route.
2. **Admin surface has no FeaturesProvider** — never call `useFeaturesContext` under `/montree/admin/*`. The state route is the gate.
3. **Dashboard "children watermark" lesson:** one transient empty API response must not regress the journey. The dock NEVER un-completes a step client-side: once derived done in this mount, it stays done until a fresh mount (keep a high-watermark of done step ids in a ref).
4. **Styled-jsx:** top-level only / dangerouslySetInnerHTML (May-29 rule).
5. **Media/report/profile counts:** mirror existing route logic — do not invent table shapes. Read the referenced files first.
6. **`montree_onboarding_progress`** unique key is `(user_id, user_type, feature_module, step_key)` — upsert on it; user_type values here are `'teacher' | 'principal'`.
7. New anonymous top-level routes need middleware publicPaths — NOT applicable here (all routes are authed); do not add any public route.
8. The old guide components and their localStorage keys: untouched.

## §8 Verification gate (Sonnet auditor + Fable)
- Contract conformance file-by-file; §7 landmine sweep; harness green; lint/tsc; API shapes vs §3 byte-level; i18n keys present ×12; celebration/dismiss/skip write paths verified; z-index + excluded routes verified; ask-route prompt grounding verified (journey map injected, UI-invention rule present).
- Device verification (Tredoux, post-deploy): fresh principal signup → wizard → land on /admin → pill shows P3 "Hand over the key" with waiting line → log the teacher in on a phone → principal card ticks itself → teacher pill walks T1→T6 → both completions fire once → dock gone on next login.
