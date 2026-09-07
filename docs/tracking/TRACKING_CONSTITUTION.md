# The Tracking Constitution (2026-09-06)

Eleven rules the progress system must never break. Every build agent is judged against this file.
Published copy for Tredoux: https://claude.ai/code/artifact/c05ed28f-bc2d-4402-ab39-c55efec493d2

## Audit findings (2026-09-06)
- ONE sanctioned writer exists: lib/montree/progress/write-progress.ts (forward-only ladder, journals to montree_progress_events). Good bones.
- TEN bypass writers around it: guru/photo-insight auto-capture (raw upsert, no key, no journal), children/bulk, admin/import, admin/import-students, onboarding/students, children/[childId]/onboard, curriculum/duplicates, reports/weekly-wrap/approve, scripts/run_replan_all_whale*.mjs, scripts/run_replan_kevin.mjs.
- FIVE name resolvers: write-progress normaliseName/resolveCatalogKey, work-matching fuzzyScore/scoreWork/matchToCurriculumV2/jaroWinkler, photo-audit page findWorkByName, guru/corrections by-name lookup. Only write-progress refuses to guess.
- Unknown names still write a row with work_key NULL.
- Parent report + weekly-wrap read a SECOND English sequence (montree_child_english_progress + lesson-map.ts 1–128). Tracker/journey/library read Dark Phonics (tracker-works.ts).
- Digital works discard "done": ShelfPlayer onDone = () => undefined; Writing Shelf board + Journey save nothing; live 1-on-1 stage keeps montree_class_recaps; games keep montree_game_progress.
- Weekly summary picks Language works by status only (auto-fill/route.ts Tier-3), never by sequence → "Beginning Sounds" next to "Blue Series blends".

## The rules
1. ONE WORK, ONE KEY. Every trackable work is a row in montree_classroom_curriculum_works with a permanent work_key (dp:<letter>:<n>, ws:<tray>). Names are for people, keys for the system. Nothing writes progress without a key.
2. ONE DOOR. All progress changes go through write-progress.ts. Bypass writers are rerouted or removed. A test fails the build if any other file references montree_child_progress with insert/upsert/update/delete.
3. EVERY CHANGE IS AN EVENT. montree_progress_events gets a row per status change (child, key, old, new, at, actor, source ∈ tap|photo|ai|digital|live|import|backfill|correction). Current-status table = cache of the journal, rebuildable.
4. STATUS ONLY MOVES FORWARD ON ITS OWN. not_started→presented→practicing→mastered. Downgrade = explicit teacher correction with a reason, journaled as source 'correction'.
5. UNKNOWN NAMES NEVER WRITE. No confident key → review queue (existing photo-audit queue). Ties = unknown.
6. ONE NAME-READER. One resolver (typed/AI/photo → key): forgiving on typos/spacing/case, strict on ambiguity. Every screen/route calls it.
7. SEQUENCE IS DATA. Every work has a position (curriculum sequence). "Next" = computed from position + status. Letter mastered = its 5 works mastered. Gaps flagged, never filled. Dark Phonics works are strictly sequential within a book: an observed work implies the earlier works of that book are mastered — derived, never written.
8. EVERYTHING A HUMAN READS IS DERIVED. Ribbon, weekly summary, weekly-plan Language column, parent report, focus shelf: computed from the journal at read time. montree_child_english_progress (1–128) is RETIRED; parent reports read the ribbon.
9. TEMPLATES BEFORE AI. English summary = template from ticks ("<Name> did Dark Phonics '<letter>' work <n>. <He/She> is starting to <phrase>. Next week we will <try to complete the series | start the '<next>' book>."). AI may rephrase, never add facts. Hard cap 40 words, counted in code.
10. IT CHECKS ITSELF. Nightly invariants: rows without key; status without event; mastered letter with a missing work; focus work not in curriculum; duplicate work names per classroom; child with no observation ≥10 days. Output "all consistent" or exact rows + fix.
11. NOTHING IS LOST, NOTHING IS GUESSED. Digital works/live lessons/games emit a 'done' event with child + key through the door when the child is KNOWN; otherwise write nothing.

## "Starting to" phrases (rule 9)
work 1 Characters → recognise the characters and follow the story
work 2 Picture match → match the pictures to the sentences
work 3 Sentence & picture match → match whole sentences to their pictures
work 4 Sentence builder (guided) → build the sentence by choosing the changing word
work 5 Sentence builder (free) → build full sentences from single words
Writing Shelf tray N → "worked on Writing Shelf tray N, <tray name>. ... Next week we will continue with tray N."

## Simulated term (acceptance scenarios) — see the published page for full wording
Mei racer · Chris steady · Li stalls (stuck-3-weeks flag, "continued") · Amir absent (class-letter fallback, no-observation-14-days flag) · Sara joins mid-year (backfill s a t, p current) · Teacher typing (T-Work-3 / t w3 / t dark phonics work 3 resolve; "Blue Series blends" → queue) · Duplicate photo same morning (one event) · Downward correction with reason · AI capture 0.92 → door, 0.70 → queue · Old pointer at lesson 54 must never surface "Magic e".
