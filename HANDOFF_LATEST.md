# Whale / Montree — Latest Handoff

**Last updated:** June 11, 2026, overnight (autonomous audit run)
**Live on Railway:** latest `main` (`e2ab75ac` at time of writing)
**⚠️ Unmerged work:** branch `audit-cleanup-jun2026` — security audit fixes
(see `~/Desktop/AUDIT-2026-06/AUDIT-whale.md` + the PROGRESS LOG in
`~/Desktop/HANDOFF_AUDIT_RUN_JUNE2026.md`). Merge is Tredoux's decision.

Resume-from-here document. New session: read this, then `CLAUDE.md` for full
project context + the migration/session notes near its end.
NOTE: `docs/mission-control/` (brain.json / SESSION_LOG.md / mission-control.json)
is months stale — CLAUDE.md is the canonical brain for this repo.

---

## Jun 11, 2026 (overnight) — Portfolio audit run, whale Phase A+B

Read-only audit (4 parallel reviewers + direct verification) then surgical
fixes on branch `audit-cleanup-jun2026`. Highlights: super-admin session
tokens no longer signed with the login password itself (new optional
`SUPER_ADMIN_JWT_SECRET`); login rate limiting fails closed on 6 credential
routes; password removed from URL query strings (3 routes; impact-fund also
had a non-timing-safe compare that accepted an EMPTY password if the env var
was unset); story nuke got a 10-min cooldown + durable audit trail in the
montree security log; public application forms got rate limits + input caps;
media/photo deletes now clean up storage files. Verified: 9/9 tests, fresh
`npm ci` + `npm run build` green, tsc error count unchanged (5,250 — all
pre-existing). Decisions needed from Tredoux are in the master doc on the
Desktop.

---

## What happened today (Session 139 — May 30) — Astra/Mira voice arc + Story Montree-facade

Big build marathon, merged `astra-voice-copilot` → main (ending `d99de791`).
**Full detail: `docs/handoffs/ASTRA_MIRA_VOICE_REALTIME_HANDOFF.md`,
`…_EXECUTION_SPEC.md`, `…_ARCHITECTURE.md`.** All new features feature-flagged
OFF by default.

- **Voice Astra** — hands-free multilingual agent via Agora Conversational AI
  (lib `lib/montree/voice-agent/`; routes `…/admin/voice/{token,agent,llm}`;
  client `hooks/useAstraVoice.ts` + `AstraVoiceButton` wired into the admin
  composer). Actions reuse `executeTracyTool` via an OpenAI-style LLM shim with
  confirm-gated mutations. Flag `voice_astra`. **Needs `VOICE_LLM_SHARED_SECRET`
  in Railway for actions** (without it: talk-only).
- **Live meeting co-pilot** — `…/parent-meetings/[id]/copilot` + on-device
  `MeetingCopilotPanel` wired into the meeting page. Flag `live_copilot`.
- **Learner memory** — migration 244 + `lib/montree/learner/{loader,recorder}.ts`
  + `…/admin/learner/record`. Flag `home_learning`.
- **New Astra tools** — `family_context`, `school_pulse` (text + voice).
- **Story facade** — calls now read "Montree — call request"; in-call names
  J/P; `current-call` returns `from:'Montree'`. DB renamed **T→J / Z→P** across
  `story_*` (dropped the `*_username_check` constraints first). **Story login is
  now J / P.**

**Migrations RUN (Supabase, this session):** 237–243 + 242b + **244** (all 15
objects verified). `MONTREE_ENCRYPTION_KEY` set in Railway.

**Next (Tredoux):** add `VOICE_LLM_SHARED_SECRET`; flip `voice_astra` /
`live_copilot` on a test school; on-device voice + co-pilot tests; oral-reading
spike before building the home tutor.

---

## What happened earlier (Session 136 — May 30) — Marketing site + English-area materials loop

A long build session. **No DB migrations.** Everything shipped to `main` and
auto-deployed via Railway. Two big threads:

### Thread 1 — Splash + Explainer marketing pages (all portrait, mobile-first)

- **Splash hero (`app/montree/page.tsx`) rebuilt as a split layout:** portrait
  9:16 video LEFT, text block RIGHT (gold eyebrow → Montree → tagline → CTA →
  kicker), collapses to a centred stack ≤880px. The hero videos are now the
  **MAIN EXPLAINER film (EN)** + the **Chinese Astra clip (中文)**, served from
  `montree-media/splash/montree-splash-video-v4.mp4` (EN) and `…-zh-v3.mp4`
  (中文). Posters are portrait frames in `/public`.
- **New `/montree/explainer` page** (`app/montree/explainer/page.tsx`): a
  hero (the main explainer film) + a gallery of **11 feature films**. 10 are
  live (smart-capture, weekly-reports, guru, astra, curriculum, communication,
  voice-onboarding, appointments, library, multilingual); **reading-tracker is
  still "coming soon"** (not produced yet). Video 5 (child-profiles) was
  removed at Tredoux's request. "Explainer" nav link + teaser strip added to
  the splash.
- **Video pipeline:** HeyGen masters are 1080×1920 portrait. We re-encode to
  720×1280 CRF26 + faststart (~2–6MB) and upload to
  `montree-media/explainer/<slug>.mp4` (gallery) or `splash/…` (hero) via the
  Supabase service key (`SUPABASE_SERVICE_ROLE_KEY` in `.env.local`). Uploads
  can flake ("fetch failed") — the upload scripts retry. To add a film: encode,
  upload to the right path, flip `available: true` on its entry.
- **Scripts:** `Montree_HeyGen_Scripts.md` (root) holds all 13 scripts incl. the
  final **MAIN EXPLAINER** ("Montessori begins with watching…") — essence-led,
  Guru/Astra + whole-school woven in. The Colossyan twin is
  `Montree_Campaign_Video_Scripts.md`. A browser-Claude runbook lives at
  `Montree_HeyGen_Webclaud_Runbook.md`.

### Thread 2 — English-area curriculum: doc + the materials loop

This is the big one. **The classroom curriculum and the Library material
generators are now joined**, so a teacher goes from "where this child is" to
"print exactly these materials" in one click.

- **Curriculum doc:** `docs/English_Corner_Curriculum_Revamp.md` (+ `.docx`) —
  the authentic Montessori prep→reading sequence, EAL-tuned (3–6, English as
  additional language), with an independent-materials build list. This is the
  *why/method* layer the Library's phonics scheme was missing.
- **The join (the merge):** every one of the **85 word-bank groups** in
  `lib/montree/phonics/phonics-data.ts` now carries `lessonNums` (the
  `lesson-map.ts` lessons it teaches), and every group now has a stable `id`
  (`id` is now **required** on `PhonicsWordGroup` — fixed a latent per-group
  selection bug in the generators). 72 of 128 lessons resolve to groups; the
  other 56 are oral/review/morphology (intentional gap).
- **Resolvers:** `lib/montree/english-sequence/lesson-materials.ts` —
  `getGroupsForLesson`, `getPhaseIdsForLesson`, `getLessonMaterials`,
  `getLessonScope`, `getLessonScopeForPhase`, `getReadingPhaseForLesson`,
  `lessonCoverage`. Plus a lean `lesson-coverage.ts` (just a 72-number Set +
  `hasLessonMaterials()`) so the dashboard gates UI without bundling phonics-data.
- **All 8 phonics-fast generators accept `?lesson=N`** (three-part-cards,
  pink-box, blue-box, labels, bingo, reverse-bingo, command-cards,
  sentence-cards, stories) — backward compatible with `?phase=`.
- **Per-lesson launcher** `app/montree/library/lesson/[lesson]/page.tsx`: a
  shareable page showing every generator (deep-linked `?lesson=N`) + reference
  (lesson page, sound song, readers) for that lesson.
- **English Progression tab** (`classroom-overview`) now shows a gated **"Make
  materials"** button per child → opens the launcher for that child's
  `current_lesson`.

---

## Health (end of session)

ESLint 0/0 on all new files; i18n strict **12/12** in sync; tsc clean on new
modules; live routes verified 200 (`/montree`, `/montree/explainer`,
`/montree/library/lesson/42`, generators `?lesson=`); media 206. Build is green.

---

## Still pending / next

**🎙️ NEXT BIG ARC — Real-time voice Astra + live co-pilot + home learning:**
Full code-grounded build plan in
`docs/handoffs/ASTRA_MIRA_VOICE_REALTIME_HANDOFF.md`. Hands-free multilingual
voice Astra (Agora) that takes actions; turn the post-hoc parent-meeting
pipeline into a LIVE co-pilot; a home learning program with children's
oral-reading (the highest-leverage + hardest piece — spike it first); memory +
multimodal "wow". Recommended start: Phase 0 oral-reading spike ∥ Phase 1
hands-free Astra; first *code* increment = feature-flagged live co-pilot
(reuses existing Whisper + Sonnet/Haiku, no new vendor). Blockers: Agora keys +
reading-ASR vendor decision.

**✅ DB migrations — RUN (Session 139):** 237, 238–243, 242b AND 244 all applied
& verified in Supabase. (Historical note on what each was, below.)

**Earlier carry-forward list (now resolved):**
- `237_meeting_dossiers.sql` (Session 133) — dossier cache; until run, every
  dossier reopen re-spends Sonnet (~$0.05).
- `238`–`243` + `242b` (Session 135 — Ultimate Astra Marathon) — parent
  profiles, meetings, transcripts, analyses, Tracy corpus (pgvector), consent
  flags. Routes degrade gracefully (`migration_pending=true`) until run.

**This session's open items:**
1. **Produce the MAIN EXPLAINER film** — *DONE & live* (uploaded to
   `explainer/main-explainer.mp4` + `splash/…-v4.mp4`).
2. **reading-tracker explainer film** — still to produce; upload to
   `explainer/reading-tracker.mp4` and flip `available: true`.
3. **Prep-stages chapter (the deeper next build):** fold the authentic prep
   (spoken language, sound games, sandpaper letters, moveable alphabet) into the
   same trackable/launchable model so the launcher covers the *foundation*, not
   just the 72 reading lessons — with readiness gates as metadata. Bigger build.
4. **(Minor)** Splash/explainer code comments say "Session 131–134" — those
   numbers collide with the real 133/134/135; this work is actually Session 136.
   Cosmetic only.

---

## Where things live (new this session)

- Marketing pages: `app/montree/page.tsx`, `app/montree/explainer/page.tsx`
- Lesson launcher: `app/montree/library/lesson/[lesson]/page.tsx`
- The join: `lib/montree/phonics/phonics-data.ts` (lessonNums + ids),
  `lib/montree/english-sequence/lesson-materials.ts`,
  `lib/montree/english-sequence/lesson-coverage.ts`
- Generators (all `?lesson=N`): `app/montree/library/tools/phonics-fast/*`
- Curriculum doc: `docs/English_Corner_Curriculum_Revamp.md` / `.docx`
- Video scripts: `Montree_HeyGen_Scripts.md`, `Montree_HeyGen_Webclaud_Runbook.md`

---

## Don't break these (still true)

- Service worker stays immutables-only (`public/montree-sw.js`).
- `LESSON_MAP` in `english-sequence/lesson-map.ts` is a CONSTANT — don't
  renumber the 1–128 lessons (breaks `current_lesson`/`mastered_lessons`).
- `phonics-data.ts` `lessonNums` ↔ `lesson-map.ts` is the source-of-truth join;
  if you edit lessonNums, regenerate `lesson-coverage.ts` (lessonCoverage()).
- Every Sonnet-calling route tier-gates via `resolveReportModel()`.
- Splash/explainer media: encode portrait → 720×1280 CRF26 faststart → upload
  to `montree-media`; versioned filenames bust the CDN cache.
