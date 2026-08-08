# Potato Snaps v1.3 — Review before send

Product law, after a film reached families unseen: **MAKE and SEND are separate
teacher actions, with a preview between. Nothing reaches a parent unseen.**

Built against design spec tabs 12 (child mini-picker), 13 (preview + send) and
14 (board state ladder). **Not delivered — audit first.**

---

## 1. Baseline & migration number

Live repo is **v1.2** (commit c381e978). Highest migration is
`320_potato_snaps_v12_dedup.sql` (added by the v1.2 audit — a unique index on
`tp_photos.storage_path`). **Next free is 321.** Every changed file below was
seeded from the live Mac copy and diff-checked, not from memory.

Migration 321 mirrors `307_montage_send.sql`, which gave `montree_montage_jobs`
the same column for the same reason — a proven pattern, not a new invention.

---

## 2. Files — 11 (3 new, 8 changed)

| File | New/Changed | What |
|---|---|---|
| `migrations/321_potato_snaps_v13_send.sql` | NEW | `sent_at` + backfill + published index |
| `app/api/potato/montages/[id]/send/route.ts` | NEW | the publish endpoint |
| `components/potato/ChildFilmPicker.tsx` | NEW | mini-picker, deselect model (tab 12) |
| `components/potato/PreviewSendSheet.tsx` | NEW | preview → send → sent moment (tab 13) |
| `lib/potato/db.ts` | CHANGED | `caps.send` probe; `CHILD_FILM_MIN = 4` |
| `app/api/potato/montages/route.ts` | CHANGED | the publish gate |
| `app/api/potato/montage/route.ts` | CHANGED | `excludedMediaIds`, floor 4 |
| `app/api/potato/board/route.ts` | CHANGED | `isSent` / `sentAt` on both job slots |
| `app/api/potato/class-film/route.ts` | CHANGED | `isSent` on `latestJob` |
| `app/potato/teacher/page.tsx` | CHANGED | ready-to-send row + class card, both sheets |
| `lib/potato/ui.ts` · `components/potato/PotatoBits.tsx` | CHANGED | v1.3 CSS; 5 icons |

`app/potato/parents/home/page.tsx` needed **no change** — it reads
`/api/potato/montages`, which now gates server-side. The gate is one place.

---

## 3. Gate semantics

```
parent sees a film  ⟺  status='done' AND storage_path IS NOT NULL
                        AND (caps.send ? sent_at IS NOT NULL : true)
teacher sees a film ⟺  status='done' AND storage_path IS NOT NULL
```

The teacher's list is deliberately **not** gated: she must see exactly the films
waiting on her. Preview playback needed **no proxy change** — `class/<classId>/
montages/**` already admits any teacher of that class (v1.0 rule, re-verified).
Nothing was loosened.

**Board ladder** (tab 14): `empty → collecting → ready-to-make → cooking →
**ready-to-send** → sent`. Ready-to-send is `status='done' && isSent === false`
and is the warmest card on the board (`.pt-row--send`, glowing CTA) because it
is the only thing waiting on the teacher. The class card gets the identical
state.

**Backfill is load-bearing.** Every existing film was parent-visible under v1.2;
adding a gate without backfilling would have silently *retracted* films from
feeds overnight — a worse failure than the one being fixed. `UPDATE … SET
sent_at = COALESCE(completed_at, created_at) WHERE status='done' AND sent_at IS
NULL`.

**Pre-migration degrade:** `caps.send === false` → every rendered film counts as
sent, i.e. exactly v1.2. No film vanishes, none is silently held back, nothing
500s. The send endpoint returns 503 rather than faking success.

---

## 4. API changes

- **NEW** `POST /api/potato/montages/[id]/send` — teacher, class-owned,
  `status='done'` only. Stamps `sent_at=now()`. Idempotent two ways: an
  already-sent film returns `alreadySent:true` with the original time, and the
  UPDATE carries `.is('sent_at', null)` so two simultaneous taps cannot produce
  two different times. 409 if the film isn't finished.
- **`POST /api/potato/montage`** now accepts optional `excludedMediaIds`. The
  server still derives the full week set itself and only **subtracts** — a
  client can never add media, so the original security contract is intact; the
  worst a hostile caller can do is shorten its own child's film. Absent field =
  v1.2 behaviour exactly. Floor is now **4** (`CHILD_FILM_MIN`); 8
  (`MONTAGE_THRESHOLD`) survives as the bar's target and the UI's nudge.
- **`GET /api/potato/montages`** — parent results gated; every film carries
  `isSent` / `sentAt`.
- **`GET /api/potato/board`**, **`GET /api/potato/class-film`** — `isSent` /
  `sentAt` on job payloads.

---

## 5. Deviations

1. **No un-send / retract.** Not in scope and not obviously safe: a parent may
   already have watched it. Withdrawal is a v1.4 conversation.
2. **Backfill idempotency has an honest caveat**, written into the migration: a
   film rendered *between* two runs would also be auto-sent. Run it once.
3. **`Remake` on a class film routes to the class picker** rather than
   reopening it inline — that picker is a full screen with its own coverage
   rules. Child films remake inline with the selection intact, as designed.
4. **Exclusions are remembered per child in page state**, not persisted. A
   full reload starts from "everything in" again. Persisting a draft selection
   felt like more product than the brief asked for.
5. **`familyCount` for the class send button uses the active-children count**,
   which is the honest number the board already has; the design's "21 families"
   assumes one family per child.
6. **v1.3 CSS is additive only.** The spec was rewritten with new tokens
   (`honey-lift`, `sh-glow`, `sh-pol`, `sand-edge`); I added only what the new
   surfaces need rather than re-skinning v1.0–v1.2 screens, which the brief
   scoped out.

---

## 5b. Post-audit fix (MEDIUM — name-collision in Remake)

`PreviewFilm` now carries **`childId: string | null`**, and Remake resolves the
target child by id (`c.id === film.childId`) instead of by
`c.name === film.title`. Two children with the same name is an ordinary week in
a kindergarten; the name match would have reopened the wrong child's picker and
then rendered the wrong child's film. `title` is now documented as
display-only, the class variant passes `childId: null` explicitly, and a child
film that somehow arrives without an id logs rather than silently picking a
neighbour. tsc re-run on the merged tree: **0 errors**.

## 6. Verification

- **tsc --noEmit: 0 errors**, v1.3 overlaid on the live repo tree, real pinned
  deps (`typescript 5.9.3 / next 16.1.1 / react 19.2`).
- **Gate harness: 26/26** — the full truth table (parent vs teacher visibility ×
  cooking/failed/done/sent × migration on/off), send-endpoint idempotency and
  409s, the backfill's no-retraction property, and the 4/8 floor-and-nudge
  including "a foreign excluded id cannot add anything".
- **Greps clean**: no `lib/montree`, no `montree_`, no `<style jsx>`, no `t(`,
  no `.single(`, no storage statements in the migration, no unescaped JSX
  entities.
- **Not run here**: repo eslint, `next build`.

---

## 7. Risks / owed

1. **Deploy order matters this time.** Ship code first and the gate is simply
   off (v1.2 behaviour) until 321 runs — safe. Run 321 first and unsent films
   would hide from parents before the teacher has any Send button — so **code
   first, then migration**, ideally minutes apart.
2. **Worker untouched**, as scoped. It sets `status='done'` and never touches
   `sent_at`, which is exactly right — but confirm Builder 2 hasn't a stray
   `sent_at` write before shipping.
3. **A teacher who never taps Send** now silently withholds films. That is the
   point, but it is a new way for parents to get nothing; the ready-to-send
   state being the warmest thing on the board is the whole mitigation. Worth
   watching in the field, and a nag is a plausible v1.4 item.
4. **Live walk owed**: render a child film → confirm the parent feed does NOT
   show it → preview as teacher (proves proxy access to an unsent film) →
   Send → confirm it appears → tap Send again (idempotent) → repeat for the
   class film.
