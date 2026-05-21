# Session 124 Handoff — Photo Audit polish · English sequence integration · Teaching Notes · Agent mobile fix

**Date:** May 21, 2026
**Commits:** `97aae331` → `fa9191d1` → `0d5db8f1` → `fe416508` → (agent mobile + this handoff)

---

## 🚨 ONE migration pending Tredoux's Supabase run

`migrations/227_weekly_teaching_notes_flag.sql` — registers the `weekly_teaching_notes`
feature flag (default OFF) and enables it for Whale Class. Idempotent. Until run, the
Teaching Notes tab simply doesn't appear (graceful — no crash). SQL is also in the
Session 124 chat log.

Migration 225 (`montree_child_english_progress`) was already run in Session 121 — no
action needed there.

---

## What shipped

### 1. Photo Audit — `97aae331`

- **Description preview restored in the custom-work creator.** `ThisIsSheet`'s "Add a
  new work" form now shows a `📖 What you're adding` panel with Sonnet's description /
  why-it-matters / materials (pulled from the photo's cached `sonnet_draft` — exactly
  what the resolve route copies onto the new work). Teachers review before committing.
- **Guaranteed "Tag a work" button on untagged cards.** Untagged photos that carried a
  `sonnet_draft` fell through every status branch and rendered NO tagging action. New
  fallback fires whenever no rich AI branch rendered → prominent green `🏷️ Tag a work`
  button (opens the This is… sheet) + `🗣️ Tell AI`.

### 2. English Progression — content loop — `fa9191d1`

- **Pink catalog realigned.** `lib/montree/english-sequence/lesson-map.ts` PINK array
  rewritten to match the Library Pink page numbering one-to-one: L1-4 = pre-reading
  review, L5-53 = letter-sounds onward. Safe — the `montree_child_english_progress`
  table was empty, zero data to migrate. Blue (54-83) + Green (84-128) already matched.
- **Per-lesson anchors.** `scripts/lesson-content/add-lesson-anchors.py` (idempotent,
  re-runnable) injected `id="lesson-N"` into all 124 content lessons across the 3
  Library HTML pages.
- **Content loop.** On the English Progression tab (Classroom Overview), each child's
  lesson is now a tappable button → deep-links to that lesson's word bank / phrases /
  heart words in the Library page. Pink L1-4 (review, no anchor) open the page top.

### 3. Weekly Admin — Teaching Notes view — `0d5db8f1`

- New **Teaching Notes** tab next to Weekly Summary / Weekly Plan. Collects the distinct
  works planned for the week, fetches each work's guide (`/api/montree/works/guide`),
  renders printable light cards: what it is / how to teach it / materials / why it
  matters / which children have it. Print button + `@media print` isolation.
- `components/montree/reports/TeachingNotesView.tsx` (new). Wired into `WeeklyAdminTab`.
- Feature-flagged `weekly_teaching_notes` (migration 227, default OFF, super-admin
  toggle). Auto-fill / Generate / Save hide on the Teaching Notes tab (read-only view).

### 4. English sequence — finish-up — `fe416508`

- **Informed advance prompt.** `offerEnglishAdvance` (photo-audit Language confirms) now
  looks up the child first and shows the current lesson — *"Amy is on Lesson 7 — the
  'm' sound. Advance to 8?"* — instead of a blind prompt. Skips children at Lesson 128.
  Falls back to the generic prompt if the lookup fails.
- **Reading-journey card on parent reports.** `/api/montree/parent/report/[reportId]`
  now returns `english_progress`; the report viewer renders a bilingual (en/zh) card —
  phase + lesson + progress bar. Read-only; no AI-pipeline change, no migration. Hidden
  for children the teacher hasn't placed on the progression.

### 5. Agent dashboard — mobile safe-area fix — (this commit)

- `AgentNav` was `sticky top-0` with no safe-area handling — on iPhone the nav content
  sat under the status bar / notch / Dynamic Island. Added
  `paddingTop: env(safe-area-inset-top)` to the `<nav>` so content drops below the
  native UI and the frosted bar extends behind the status bar.

---

## Architectural notes

- **`lessonToWorks` deliberately NOT built.** Montessori Language materials span many
  lessons each — a per-lesson→work map fabricates a relationship that doesn't cleanly
  exist. The informed advance toast is the honest fix. Don't build lessonToWorks.
- **`lesson-map.ts` PINK is now page-aligned.** Rule #231 (don't renumber without
  approval) honoured — renumber done with Tredoux's sign-off while the table was empty.
- **The reading-position card on the report shows LIVE position**, not a snapshot at
  report-send time. Fine for v1 (parents view the latest report); a purist would
  snapshot it into report content.

## Verification

- All commits lint-clean (0 errors; new code added 0 new warnings).
- English catalog audited: 128 entries 1-128 sequential, 53/30/45 split, Pink letters
  match the page, all 124 content lessons anchored.
- Agent mobile fix lint-clean.

## Next-session priorities (recommendations)

1. **Stale-lesson flag on the English Progression tab** — surface children who haven't
   advanced in 3+ weeks (stuck/struggling, or teacher forgot). Highest classroom value.
2. **Weave reading progress into the AI weekly-wrap narrative** — currently a separate
   card; feeding the position into the narrative prompt makes the report one warm story.
   Touches the AI pipeline — opt-in Phase 2.
3. `?child_id=` filter on the english-progress GET — the informed toast fetches the
   whole class to find one child. Minor.
4. Run migration 227.
