# Montree Lens v1 — live, open beta

**2026-08-26 · Sonnet (Desktop Commander).** Lens (concept: `docs/MONTREE_LENS_CONCEPT.md`,
engineering record: `docs/LENS_BUILD_LOG.md`) went from "built, never run" to **live at
https://montree.xyz/lens** this session. Read those two docs first for the product rationale
and the technical detail; this doc is the status snapshot and the next-step list.

## What Lens is

A standalone observer app for a Montessori consultant/mentor with no classroom of her own in
Montree: photo + voice-note capture in the classroom (offline-first, thumb-only, silent) → an
AI-drafted 12-section AMI-style observation report, in English and Chinese, edited inline →
branded PDF with her letterhead → a debrief script and action items that resurface at the next
visit to that classroom.

Built Potato-Snaps-style, self-contained inside this repo: `app/lens`, `app/api/lens`,
`lib/lens`, `components/lens`, `public/lens`, tables `lens_*` (migration `339_lens_v1.sql`),
private storage bucket `lens-photos`, cookie `lens_observer`. Unlike Potato, **Lens is served on
montree.xyz, not bounced to teacherpotato.xyz** — it's a Montree-branded product, and the
cookie is host-only.

Key decisions carried over from the concept doc (§1–2): AMI vocabulary/report structure as the
default; engagement types are consultation / mentoring / internal_review; the report is
narrative with an optional 4-level rating (Exemplary / Established / Emerging / Not yet);
strengths-first structure with evidence→analysis→judgement layering; children never named,
photo appendix in the PDF is captions-only (PIPL — an image of an under-14 is sensitive
personal information).

## Status: LIVE, in open beta

Deployed via Railway project **happy-flow**, service **whale-class**, from GitHub `main`.
Commit history for the feature:

| commit | what |
|---|---|
| `7bca089` | phase 0 — migration, auth, records API, app shell |
| `8da898f` | phase 1 — offline queue, records screens, capture |
| `02f3933` | phase 2 — the Lens Guru: draft, chat, translate, debrief |
| `8b541eb` | phase 3 — report editor, PDF with CJK, tests |
| `5f9bd90` | docs — build log, concept doc, PROJECT_CONTEXT section |
| `95ba15a` | audit fix — Safari voice-note file extension mismatch |
| `bee3a31` | merge |
| `7bab456` | open beta — auto sign-in for the single observer |

### Production setup done this session

- **Migration 339 applied** — nine `lens_*` tables live, RLS enabled with no policies
  (deny-all; the app reads through the service role, same posture as `tp_*`).
- **`lens-photos` bucket created** — private, 15 MB upload limit.
- **Seeded invite code rotated** to `GY46N866` (only matters once the door is switched back
  on — see below).

### Open beta — how it works, and how to turn it off

`lib/lens/flags.ts` → `LENS_OPEN_BETA = true`. While this is true, `/lens` auto-signs in the
sole observer via `POST /api/lens/auth/auto` and `requireObserver` falls back to that same
observer when no cookie is present — the invite-code door is skipped entirely. **Flip this to
`false` before a second observer ever exists**; nothing behind the flag is deleted, the door
just comes back with the rotated code above.

### Audit (done pre-deploy, by Sonnet)

All routes auth-gated, ownership checked per observer on every query, migration verified
idempotent, 530/530 repo tests passing (92 of them Lens), `eslint` 0 errors, 0 Lens
TypeScript errors. One bug found and fixed: a Safari voice-note file-extension mismatch.

## What's NOT done yet — known gaps

- **No human has clicked through against the real database yet.** Expect small route bugs to
  surface on the first real visit — the migration and bucket exist now, but nothing has
  actually exercised the happy path end to end against production data.
- Style profile is hand-set at `/lens/profile`, not learned from her edits (concept doc's
  Phase 4).
- Timestamps are UTC everywhere, named as such — no per-school timezone yet
  (`lens_schools.tz` is the clean fix, per `LENS_BUILD_LOG.md` §4).
- No face-blur or "no children in frame" capture nudge (policy is enforced by prompt + the
  captions-only PDF appendix + the private bucket, not by the camera).
- No share links, no team sharing, no template variants (AMS rubric, school rubric) — Phase 4.
- `lens_reports.pdf_path` and `lens_schools.logo_path` exist in the schema but are never
  written.
- `child_alias` has no capture-screen UI (the field, API and Guru all support it; a note like
  "Child A (4;3) did…" carries it in text instead).
- No 5-visit eval set (the concept doc's regression suite).
- `app/lens-app` (a standalone-app landing page in the Potato shape) not built — the PWA
  install path (`/lens` → Add to Home Screen) covers v1.

## Next steps, in order

1. The user and the consultant do one real visit at montree.xyz/lens together and report back
   whatever breaks.
2. Fix whatever that surfaces.
3. Get one of her existing reports from her and use it to tune the report template/voice —
   the concept doc's open question #1, still unanswered.
4. Style-profile learning from her edits.
5. Add `lens_schools.tz` and switch the model's context timestamps to local time.
6. Decide whether to re-enable the invite-code door (flip `LENS_OPEN_BETA` to `false`) once a
   second observer is in the picture.

## Process notes — for whoever picks this up next

- **Lens was built by Opus in a cloud sandbox clone of this repo**, then transferred into this
  working tree via a `git bundle` — the sandbox's outbound proxy cannot push to this repo
  directly.
- **Every push and every migration this session went through Sonnet + Desktop Commander on the
  Mac** — the SSH key and the ability to reach the Supabase pooler both live here, not in the
  cloud sandbox or the Cowork device bridge. This is the same operating rule the Dark Phonics
  passes documented the same day (CLAUDE.md rule #1): git push / network / `.env.local`
  credentials → Desktop Commander only.
- Migration 339 was applied with a small Node `pg` script against
  `aws-1-ap-southeast-1.pooler.supabase.com` (user `postgres.dmfncjjtsoxrnvcdnvjq`) — same
  connection recipe as `scripts/_harness/probe.mjs`, if a future migration needs the same
  approach.
- A stray untracked file, `_claude_stage/MONTREE_LENS_CONCEPT.local.md`, was left behind by the
  transfer and can be deleted — it duplicates `docs/MONTREE_LENS_CONCEPT.md`, it isn't a
  distinct document.

## Files touched this pass

`docs/handoffs/HANDOFF_MONTREE_LENS_LAUNCH_AUG26.md` (this file, new), `docs/handoffs/_INDEX.md`
(entry added), `docs/LENS_BUILD_LOG.md` §1 (go-live steps marked done, open-beta flag noted). No
application code changed this pass — the build, deploy and production setup happened earlier
this same day; this is the write-up.
