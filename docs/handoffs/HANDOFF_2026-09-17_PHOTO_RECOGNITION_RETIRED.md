# Photo recognition retired — current state (2026-09-17, Beijing evening)

This supersedes `docs/handoffs/PHOTO_RECOGNITION_RETIRED_2026-09-17.md` (that
file now has a one-line pointer at the top to here). Read this one first —
it covers the whole day's five commits, ending with the stale-chip cleanup.
The old file is kept for its section-by-section detail (routes, cron
behaviour, SQL) and is still accurate; this file is the up-to-date summary
and index.

---

## 1. The decision, in one paragraph

AI photo work-identification (Haiku → Sonnet two-pass) was retired. Accuracy
was roughly 35–40% — the teacher still had to check every guess in the audit
queue, so the model bought nothing but cost. It was also the single biggest
per-photo AI expense in the product, and it was never metered: nothing wrote
to `montree_api_usage`, so the spend was invisible in the AI budget and the
P&L. The teacher is in the room and knows what the child was doing — asking
her once, at tag time, is cheaper, faster, and right the first time.

## 2. The five commits, in order

1. **`a2f9afe0c`** — *Retire AI photo recognition; teacher tags the work at
   capture.* Kill switch (`PHOTO_RECOGNITION_ENABLED`, default off) added
   above every Anthropic/OpenAI call site. Capture made tag-first
   (`WorkQuickPick` on the capture page). Photo-audit page becomes "Photos
   to tag". Plans: `photoRecognition` false on every tier. Metering added to
   `two-pass.ts` / `sonnet-draft.ts`. Wrote the original handoff doc.
2. **`07eadcfce`** — *Retirement follow-up: honest landing preview copy,
   retire Snap page, drop AI-tagged badge.* Cleaned customer-facing copy
   that still implied AI tagging: landing preview, `/montree/dashboard/snap`
   (~900 lines of dead AI-snap UI removed), gallery's "AI-tagged" badge.
3. **`e1d1184c6`** — *Capture flow restored: photo → child → done; work is
   tagged in wrap-up.* Owner reversed the tag-first capture from commit 1:
   the work-picker step came back out of capture. Capture is now purely
   photo → child → save; uploads in the background, untagged, waits in
   "Photos to tag". `ThisIsSheet.tsx` gained its first **Suggested** row
   (child's recent works + classroom recents).
4. **`3572ecbf3`** — *Photos to tag: open on Confirm; suggestions ranked by
   the child's own history, with area pills.* Fixed the queue's zone-init
   bug (wasn't opening into the untagged list). Removed the "Smart Learning"
   bar and the retired-recognition hint text. Rewrote
   `GET /api/montree/progress/recent-works` to rank from the progress
   journal (§5), added area pills, added `lib/montree/progress/rank-suggestions.ts`
   with its own test file.
5. **This commit** — removed the last stale UI: the "🤖 AI thinks" chip in
   `ThisIsSheet.tsx`, which could still fire on old backlog photos carrying
   a cached `sonnet_draft`. Removed `aiGuess`, `handleConfirmAI`, the
   `aiThinks` locale strings, the chip JSX, and the `closest_existing_match`
   match-branch inside `aiGuess`. Suggested row, area pills, search and
   "+ New" untouched. Grepped `page.tsx` and the child gallery for the same
   wording family — nothing else user-visible: `page.tsx`'s AI branches are
   already behind `const AI_UI_RETIRED = true`, and the gallery's ✨
   "unconfirmed AI guess → Review in Wrap Up" link is a separate, still-live
   feature that just deep-links to "Photos to tag"; left alone.

## 3. The flag

`lib/montree/photo-identification/flag.ts`:

| Export | Meaning |
| --- | --- |
| `isPhotoRecognitionEnabled()` | server-side; true only when `PHOTO_RECOGNITION_ENABLED === 'true'` |
| `isPhotoRecognitionEnabledClient()` | client mirror; `NEXT_PUBLIC_PHOTO_RECOGNITION_ENABLED === 'true'` |

Default is **off**. Unset, empty, `1`, `TRUE` — all off. Only the exact
string `true` turns it on. Both variables live in `.env.example`, commented,
marked "retired 2026-09-17; leave unset".

**To re-enable** (see the original handoff's §9 for the full checklist):
set both env vars to `true` and redeploy, set `photoRecognition: true` for
`full` in `lib/montree/plans/capabilities.ts`, and flip
`AI_UI_RETIRED = false` at the top of `app/montree/dashboard/photo-audit/page.tsx`.
The chip removed in this commit is **not** part of that checklist — it is
gone for good; re-enabling only brings back the Sonnet/Haiku draft cards
that `AI_UI_RETIRED` currently hides.

## 4. The live flow today

1. **Capture** — `app/montree/dashboard/capture/page.tsx`. Photo → tag
   child(ren) → save. No work step. Photo uploads in the background and the
   camera is ready for the next shot immediately.
2. **Upload** — `app/api/montree/media/upload/route.ts`. No `work_id` (the
   normal case): `teacher_confirmed = false`, `identification_status =
   'skipped'`, no AI call, photo waits in "Photos to tag".
3. **Photos to tag** — `app/montree/dashboard/photo-audit/page.tsx`. Default
   filter is `untagged`. Opens straight into that list (fixed in commit 4).
   Each card's "This is…" button opens the sheet.
4. **"This is…" sheet** — `components/montree/photo-audit/ThisIsSheet.tsx`.
   Teacher resolves one of two ways (a third, `confirm_ai`, exists only as a
   dormant `Resolution` type variant now — nothing constructs it anymore):
   - **Suggested row** — ranked chips (see §5); tap one → resolves exactly
     like picking that work from search.
   - **Search + "+ New"** — full curriculum search, or type a new name and
     create a custom work.
5. **Resolve** — the route behind the sheet sets `teacher_confirmed = true`
   and calls `advanceProgressOnConfirm` (→ `writeProgress`, **the one door**)
   once per tagged child. Group photos = one work written for every child in
   the shot.

No AI call happens anywhere in this path while the flag is off.

## 5. How suggestions are ranked

Source of truth is `montree_progress_events` (the append-only journal), not
`identification_status` or any cached AI field — see
`lib/montree/progress/rank-suggestions.ts` header comment ("Tracking
Constitution rule 8: everything a human reads is derived").

The rule, in one breath:
- Rank the works **this child** has journal rows for over the last **8
  weeks** (`SUGGESTION_WINDOW_WEEKS`), most rows first, most-recent-row first
  on a tie, name as the final tiebreak.
- The `'all'` bucket tops up from the **classroom**'s most-tagged works in
  the same window only when the child has fewer than **3**
  (`CHILD_MIN_BEFORE_CLASSROOM`) such works of their own.
- An area bucket tops up from the classroom in that area when short, then
  from that area's curriculum in shelf order — an area pill never lands on
  an empty row.
- Never more than **8** (`SUGGESTION_LIMIT`), never a work that isn't live
  curriculum.

Served by `GET /api/montree/progress/recent-works` (teacher-auth,
school-scoped, child ownership proved, `no-store`). Non-blocking on the
client: a failed fetch just leaves the sheet as it was. Tests:
`tests/progress/recent-works-ranking.test.ts`.

## 6. Plan changes

`photoRecognition` is `false` on every tier, including Full (founding
members and partner schools resolve to `full` too). The key stays so
gates/types/tests keep compiling. `photo_onboarding` and `paper_scan` — OCR/
roster-import features, not the retired pipeline — moved to gate on
`orgOnboarding` instead (Full-only, same as before). No entitlement changed.

## 7. What's dormant (not deleted)

`montree_media.identification_confidence` / `.sonnet_draft` /
`.identification_attempted_at` (new rows leave these null; old rows keep
cached values — why the removed chip could still fire on backlog photos),
`montree_guru_corrections` (self-learning correction loop),
`montree_visual_memory` / `montree_global_visual_memory` +
`montree_global_vm_search` RPC (visual embeddings), and
`components/montree/media/WorkQuickPick.tsx` (the capture-time picker from
commit 1, unused since commit 3 reverted capture — its `recent-works` client
fetch is still valid and reusable).

## 8. NO SQL required

Nothing here needs a migration or a manual SQL run. The original handoff's
§8 has optional, later, not-required cleanup SQL (archive the dormant
learning tables, tidy historical `identification_status` rows) — read it
before ever running it; two of its three statements are irreversible.

## 9. Open items

- Potato (`teacherpotato.xyz`) teacher page — untouched by today's five
  commits, out of scope.
- Optional cleanup SQL in the original handoff (§8) — not run, not required.
- Legacy `identification_status` filters remain in some read routes (e.g.
  `app/api/montree/audit/photos/route.ts`'s green/amber/red zones) —
  harmless (amber/red resolve to zero) but not simplified away.
- `tests/photo-gate-a.test.ts`, `tests/photo-classroom-recall.test.ts` kept
  green on purpose — invariants that must still hold if the flag ever flips
  back on.

## 10. Files touched by this commit

- `components/montree/photo-audit/ThisIsSheet.tsx` — removed `aiGuess`,
  `handleConfirmAI`, the chip JSX, the `aiThinks` locale strings.
- `docs/handoffs/HANDOFF_2026-09-17_PHOTO_RECOGNITION_RETIRED.md` — this
  file.
- `docs/handoffs/PHOTO_RECOGNITION_RETIRED_2026-09-17.md` — one-line pointer
  added at the top.
- `CLAUDE.md` — permanent rule added: never re-enable/re-add AI
  identification on upload.
- `docs/mission-control/brain.json` — dated checkpoint entry added.
