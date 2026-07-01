# MONTREE HOME — CAMERA-FIRST VISION PLAN
_Locked with Tredoux, Jul 2, 2026. This is the canonical direction for the Home product. Supersedes the tab-chat composition from SESSION_HOME_SYSTEM_IVY / SESSION_CORNER_GLORIA_STORY_JUN17 (the plumbing from those sessions is all REUSED — only the composition and copy change)._

## THE LOCKED DECISIONS (do not relitigate)

1. **Camera-first.** The app opens to a capture surface. The core gesture is "point at Marina and show Ivy" — photo, voice, or words. Chat is the response surface, not the container.
2. **Primary customer: the aspirational dabbler.** Mainstream parent, child possibly in regular daycare, wants genuine Montessori at home, zero jargon tolerance. Homeschooler depth unfolds later, never leads.
3. **Structure hidden — Ivy narrates.** No areas, no presented/practicing/mastered, no "shelf" language on any parent-facing home surface. Ivy speaks development in plain words ("finger control she'll one day write with"). "The map" is the tucked reveal for the curious.
4. **First session = guided placement chat.** Ivy asks ~5 warm tap-chip questions, the last "question" is the first photo. Onboarding teaches the core gesture in minute one.

## THE FOUR SCREENS (mockups approved Jul 2)

1. **Today** — capture surface: viewfinder framing + "Show me what Marina is doing" + mic/shutter/keyboard + ONE quiet chip ("Today: pouring water, together" — the Corner spotlight compressed). Tabs: Today · Journey · Plan.
2. **The moment** — photo → Ivy narration in plain language → ONE "when she's done" next-step card ("Show me how" = existing StepCard) → "saved to Marina's journey."
3. **Journey** — moments timeline (photo thumbs + one-line notes), gold milestone markers, Ivy insight line at top ("this month her hands are asking for precision"), "the map →" tucked bottom-right.
4. **First meeting** — Ivy intro, tap-chip questions (age, independent skills, loves, frustration), final step = open camera.

## REUSE MAP (what already exists and carries over unchanged)

| Piece | Where | Role in new design |
|---|---|---|
| Companion SSE route + 13 tools | `app/api/montree/companion/route.ts`, `lib/montree/companion/*` | Ivy's brain — unchanged |
| IvyChat streaming client | `components/montree/home/IvyChat.tsx` | The response surface (screen 2), extended with auto-send props |
| StepCard + step-card API | `StepCard.tsx`, `/api/montree/companion/step-card` | "Show me how" |
| Smart Capture vision | companion route `image_url` path | Photo recognition |
| Shelf API (focus works + guru_reason) | `/api/montree/shelf` | Spotlight → the Today chip; data behind "the map" |
| Growth gather | `lib/montree/companion/growth.ts` | Pattern for the journey endpoint |
| Onboard extraction brain | `/api/montree/children/[childId]/onboard` | Placement chat POSTs a composed transcript here |
| Family memory + consolidation | `lib/montree/companion/memory.ts` | Journey insight line |
| FamilyPlan | `FamilyPlan.tsx` | Plan tab (Shop folds in behind a sub-toggle) |

## NEW / CHANGED FILES

- NEW `components/montree/home/TodayCapture.tsx` — capture surface (overlay above a persistent IvyChat so conversation survives camera↔chat)
- NEW `components/montree/home/JourneyView.tsx` — timeline
- NEW `components/montree/home/FirstMeeting.tsx` — placement flow
- NEW `app/api/montree/companion/journey/route.ts` — GET: moments + milestones + notes + insight (media + observations + progress + memories)
- NEW `app/api/montree/companion/placement/route.ts` — GET: `{ has_profile }` gate
- MOD `app/montree/home/[childId]/page.tsx` — 3-tab composition, capture overlay state, placement gate
- MOD `components/montree/home/BottomTabs.tsx` — Today · Journey · Plan
- MOD `components/montree/home/IvyChat.tsx` — `autoSendImage` / `autoSendText` props (additive, backward compatible)
- RETIRED from nav (hide-don't-delete): `CornerView.tsx` (spotlight logic moves to TodayCapture), `Shop.tsx` as a tab (reachable via Plan sub-toggle)

## ARCHITECTURAL RULES (locked)

- IvyChat stays MOUNTED under the TodayCapture overlay — toggling capture↔chat must never reset the conversation.
- Tapping the active Today tab returns to the capture surface.
- The camera input is `<input type="file" capture="environment">` — never getUserMedia on home surfaces (Session 119 camera-timeout lessons apply to the classroom capture only).
- Home photo uploads go through the existing `/api/montree/media/upload` (already the IvyChat path).
- "The map" v1 = an Ivy prompt ("show me where she is on the path"), not a new visual surface. A visual map is a future build.
- Placement composes chip answers into a TRANSCRIPT and posts to the existing onboard route — one extraction brain, no fork.
- New home copy is hardcoded English (Corner precedent) — i18n pass is a fast-follow.
- No jargon regression: any PR touching home surfaces must not introduce area names, status words, or "shelf/work" framing into parent-visible strings.

## BUILD PHASES

1. Today capture + 3-tab nav + IvyChat auto-send (ships alone; Corner temporarily unreachable is acceptable)
2. Journey endpoint + JourneyView
3. FirstMeeting placement flow + gate
4. Copy sweep on surviving surfaces (StepCard, FamilyPlan strings) + polish

## STILL OPEN (deliberately)

- Pricing (two Sonnet tiers + top-up + Haiku fallback direction from Jun 16 — unchanged, decide after design proves out)
- Usage caps build (spec in CLAUDE.md Jun 16 entry)
- Visual "map" surface
- i18n for new home strings
- China/Home synergy: the XHS parent audience from the China campaign is this product's direct funnel — revisit once both exist
