# TypeScript burndown — 2026-09-07

Goal: `npx tsc --noEmit -p tsconfig.json` exits clean so
`typescript.ignoreBuildErrors` can be turned **off** in `next.config.ts`.

Baseline at the start of this run: **714 errors across 197 files**
(`/work/tsc-before.txt`).

Rules followed while fixing:

- Real types, real narrowing, real signatures. No `@ts-ignore`, `@ts-nocheck`,
  `@ts-expect-error`, no blanket `as any`, no loosening `tsconfig` strictness,
  no deleting features to make an error go away.
- Dead code that the types *prove* unreachable is removed rather than typed.
- `npx vitest run` stays green after every batch.

CI: `.github/workflows/typecheck.yml` runs `tsc --noEmit` + `vitest` on every
push and PR to `main`. It is shaped to be a required status check but is not
enforced yet — tick it under Settings → Branches → main when ready.

## Project-boundary fix (not a strictness change)

`montage-kit/`, `montage-worker/` and `potato-worker/` are **standalone Railway
services**: each has its own `package.json`, its own `package-lock.json`, its own
`Dockerfile`, its own `tsconfig.json` and its own `typecheck` script. Their
dependencies (`remotion`, `@remotion/renderer`, `@remotion/bundler`,
`@remotion/cli`) are deliberately *not* in the root `package.json`, so the root
compiler could never resolve them — 36 of the 714 errors were simply the root
project trying to type-check code that is not part of the Next.js app.

They are now listed in the root `tsconfig.json` `exclude` array, next to the
other non-app directories. Each worker still type-checks itself via
`npm run typecheck` inside its own directory.

## Behaviour changes — human review

Every entry below is a fix where making the types correct also changed what the
code *does* at runtime. Each one is a place where the old code was provably
wrong; please sanity-check them against your intent.

<!-- BEHAVIOUR-CHANGES-START -->
- **`lib/montree/admin/guru-executor.ts:1030` (was `applyScopeFilter`, now
  `resolveScopeFilter` + `applyScopeFilter`)** — the old `applyScopeFilter` was
  `async` and returned a `PostgrestFilterBuilder`, which is a *thenable*: the
  async function's promise adopted it, so `await applyScopeFilter(...)` **fired
  the query** and handed back a `PostgrestSingleResponse` instead of a builder.
  Every later `.eq()` / `.order()` / `.limit()` on it threw `TypeError`, so the
  Principal Guru's `query_school_data` and `query_school_stats` tools always
  failed with "Execution error: query.limit is not a function". Resolving the
  scope (async) is now separate from applying it (sync), so both tools actually
  run — and they run school-scoped, as intended.
- **`app/montree/library/tools/phonics-fast/stories/page.tsx:401`** — the Stories
  printable read `story.words` and `story.sightWords`, neither of which
  `PhonicsStory` has ever had (`lib/montree/phonics/phonics-data.ts` stores the
  decodable words per page, as `pages[].keywords`). Those reads were
  `undefined.filter(...)` / `undefined.length`, i.e. a **TypeError on render**,
  so the "Book" and "Cards" print previews crashed as soon as a story was
  selected — which the page does automatically. Both lists are now derived from
  the real data: `storyWords` from every page's `keywords`, `storySightWords` by
  intersecting the story text with `SIGHT_WORDS`. **The word bank and the green
  phonics-word highlighting now actually appear** where before the page blew up.
  Story selection also compared a `story.id` that does not exist (so *nothing*
  ever looked selected); it now compares the story objects themselves, which is
  correct because the list renders the very objects `SHORT_STORIES` holds.
  `StoryPage.sceneEmoji` was added as an optional field — the printable has
  always rendered it and none of the bundled stories set it, so those illustration
  boxes print blank exactly as they did before.

*(`app/api/montree/works/guide/route.ts:202` — the background pre-cache now
wraps the Postgrest builder in `Promise.resolve()` before `.then().catch()`.
`PostgrestBuilder.then()` is **typed** as returning a bare `PromiseLike` with no
`.catch`, but at runtime it returns a real Promise, so this one is a type fix
only: no behaviour change.)*
<!-- BEHAVIOUR-CHANGES-END -->
