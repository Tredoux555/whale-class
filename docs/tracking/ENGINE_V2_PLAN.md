# Montree Tracking Engine v2 — build plan (2026-09-06)

Mandate from Tredoux: carte blanche to rewrite the tracking/guiding engine. Bulletproof, world class.
Law: docs/tracking/TRACKING_CONSTITUTION.md. Gate: tests/tracking (simulated term) + tests/progress (one door) must stay green.

## Shape
- PURE ENGINE  lib/montree/tracking/*  (types, ledger, resolve, derive, summary, invariants) — DONE (89 tests). All rules live here once; DB code and UI only call it.
- DOOR         lib/montree/progress/write-progress.ts — the only writer; now strict (unknown → montree_progress_review_queue), journals every change with source/reason. Refactor so it delegates ladder/dedupe decisions to the engine (ledger.applyEvent / dedupeSameDay) instead of its own copy.
- LEDGER       montree_progress_events = source of truth. montree_child_progress = cache, rebuildable (rebuild function).
- GUIDANCE     next work per area = engine (sequence + status), replacing replan-child.ts / guru work-sequencer / ad-hoc focus logic. montree_child_focus_works becomes a derived cache too.
- READERS      weekly summary (Language = template), weekly-plan cell, parent report, weekly wrap, classroom overview → all read engine derivations. montree_child_english_progress + lesson-map.ts RETIRED from every reader.
- UI           /montree/dashboard/tracker: this-week grid (children × 5 dp works of the class letter), ribbon per child, flags, Writing Shelf trays, review queue, health panel.
- SIGNALS      digital works / live lessons / games emit 'done' through the door when the child is known.
- SELF-CHECK   nightly invariants job (API + GitHub workflow cron like .github/workflows/dns-guard.yml) + Health panel.

## API contract (agents build to this concurrently — do not change shapes)
POST /api/montree/progress/event
  body {child_id, work: string /*name or key*/, status, source, actor?, reason?, evidence_media_id?, classroom_id?}
  → {outcome:'applied'|'noop'|'queued'|'rejected', work_key?, old_status?, new_status?, why?, queue_id?}
GET  /api/montree/tracking/class?classroom_id=&week_start=YYYY-MM-DD
  → {week_letter, week_start, children:[{id,name,pronoun,ribbon:{[letter]:'mastered'|'in-progress'|'not-started'|'coming'},
      current_letter, next_letter, week:{[work_key]:status}, current:{[work_key]:status}, flags:[{code,message}],
      summary:{text,words}, plan_cell:string}], queue:[{id,child_id,raw_work_name,source,created_at}], works:[{work_key,name,sequence,group}]}
PATCH /api/montree/tracking/class-week  {classroom_id, letter} → {ok}
POST /api/montree/tracking/review-queue/resolve {id, work_key} | {id, dismiss:true} → {outcome}
GET  /api/montree/tracking/invariants?classroom_id= → {checked_at, issues:[{code,child_id?,work_key?,message,fix?}]}
POST /api/montree/tracking/rebuild {child_id?|classroom_id?} → {rebuilt:n}
GET  /api/montree/tracking/child?child_id= → {ribbon, current, events:[...last 200], flags, shelf:{[ws key]:status}}

## Migrations
344 curriculum seed (dp works) + class week table — written, pending run
345 review queue + events.reason — written, pending run
346 (agent C): ws:1..8 seed (see chat SQL), rebuild function montree_rebuild_child_progress(child_id), indexes on montree_progress_events(child_id, created_at), events.evidence_id, view montree_v_child_ribbon (optional)

## Ownership (parallel agents, disjoint files)
C  door + persistence + API routes above + migration 346
D  readers: weekly-admin-docs auto-fill, weekly-wrap, parent report, narrative-generator, classroom-overview, language-tracker, english-progress (retire)
E  guidance: replan-child.ts, guru/work-sequencer.ts, focus-works routes → engine.nextWorks; extend lib/montree/tracking/derive.ts with generic multi-area nextWorks (E owns that one engine file addition + its tests)
F  UI /montree/dashboard/tracker (+ child page), ShelfPlayer/BookWorks 'done' events, nightly invariants workflow + Health panel
