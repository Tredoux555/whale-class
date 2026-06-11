# Phonics-as-Works — build plan (for approval)

*Grounded in the actual code, not assumptions. Pink only (lessons 5–53). Build on a branch (`feature/phonics-works-pack`), you review, then enable the flag for your school only to pilot. Default OFF for everyone.*

## The model (why it's clean)

A "work" in Montree isn't a rigid catalog row — progress is stored in **`montree_child_progress`** keyed by **`work_name` + `area` + `status`** (presented → practicing → mastered), upserted on `(classroom_id, work_name)`. So a phonics lesson becomes **a named work in the Language area**, and it tags + progresses through the *existing* path. Nothing new in the progress system.

## What gets built

**1. The flag (per-school toggle).** Add `phonics_works` to `FeatureKey` in `lib/montree/features/types.ts` + register it in the features definitions list (name/description/category, `default_enabled: false`). It then appears automatically in the existing super-admin features toggle (`app/montree/admin/features`). Read server-side via `lib/montree/features/server.ts`, client-side via the features context. **Default OFF.**

**2. The phonics works catalog (static data).** New file `lib/montree/phonics/phonics-works.ts` — 49 entries:
```
{ lesson: 5, work_name: "Pink Phonics · /s/ · snake, sun, sock", area: "Language",
  sequence: 5, sound: "/s/", words: ["snake","sun","sock"],
  song_url: ".../dark-phonics/songs/lesson-05.mp3",
  card_url: "/dark-phonics-singalong.html", book_url: "/dark-phonics-books.html",
  reader_url: "/dark-phonics-readers.html" }
```
Ordered 5→53 so they sit in sequence in the Language area.

**3. Make them appear in the teacher's work picker — flag-gated, virtual (no row-seeding).** When `phonics_works` is ON for the school, the works-list endpoint (likely `app/api/montree/works/route.ts` or `curriculum/route.ts` — pinned at build start) **merges the 49 phonics works into the Language area list at query time**. Toggle OFF → they vanish, no orphaned rows. (This is the clean on/off you wanted; the alternative — seeding 49 rows per classroom — is messy to undo, so we avoid it.)

**4. Tag + progress = unchanged.** Teacher snaps the photo, picks the phonics work, it writes to `montree_child_progress` exactly like any work. The per-child *sequence* is just their progress through the ordered Language works. No `current_lesson` engine needed.

**5. Media on the work.** On the work detail/guide view, if the work is a phonics work (matched by `work_name`/lesson), render: an inline **song player** (the bucket mp3) + links to its **sing-along card / picture book / decodable reader**. Flag-gated; non-phonics works are untouched.

## The one fork to resolve at build start

Where does the teacher's work picker get its list — a **global catalog** or the **classroom's custom curriculum** (`montree_custom_curriculum`)? 
- If global/area-based → virtual merge (clean, as above).
- If per-classroom custom curriculum → still do a virtual merge in the picker response when the flag is on (not row-seeding), so on/off stays clean.
I'll confirm the exact source in `works/route.ts` + the capture UI before writing the merge.

## Scope + rollout

- **Pink only** (5–53). Blue/Green later.
- **Branch**, not main. You review the diff.
- **Pilot**: flip `phonics_works` ON for your school only in the features admin. Watch it work end-to-end (tag a child on a phonics work, see progress, open the work, play the song). Then decide.
- **No migration needed** for progress (reuses `montree_child_progress`); the only DB touch is the feature row when you toggle it on (handled by the existing features system).

## Honest risk note

This touches the works-list endpoint and the work-detail UI — core teacher surfaces. The flag keeps it invisible until you turn it on, and branch-first means you see it before it ships. Low risk if we keep it a flag-gated virtual merge and don't alter the tag/progress path (we won't).
