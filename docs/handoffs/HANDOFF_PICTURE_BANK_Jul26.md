# Handoff — SATPIN Object Basket verification, toy-render fixes, Picture Library search bug (Jul 26, 2026)

Pick-up note for a fresh chat. Everything below is **done**, but **not committed and not deployed** — see "What is NOT done" at the bottom before assuming any of this is live.

## 1. What this session was actually about

Tredoux supplied `SATPINObjectBaskets.docx` — 30 words across 6 tables (S: sock, snake, star,
soap, seal · A: apple, ant, anchor, alligator, ambulance · T: turtle, tiger, toothbrush, tomato,
taxi · P: pig, pen, penguin, pumpkin, panda · I: igloo, iguana, inchworm, insect, infant · N: nut,
nest, net, napkin, nail) plus `ring` (named separately, earlier in the conversation). The ask,
after several rounds of narrowing: **verify every one of those 31 words has a correct,
real-photograph picture filed in the bank under the right name — nothing else, no PDFs, no
print materials.**

## 2. What was verified / fixed in the picture bank itself

All 31 words were confirmed present at `docs/picture-bank/photos/<word>/<word>.jpg` and passing
`node scripts/curriculum/picture-bank-add.mjs --audit` (border-luminance / size / contrast gate).
That audit does **not** check subject correctness, so every one of the 31 files was also opened
and visually inspected. Two rounds of problems were found and fixed, both times by generating in
Midjourney, downloading, filing via `picture-bank-add.mjs --word <w> --from <file> --force`,
`--audit`, then `--publish --word <w>` (dark-phonics bucket) and a direct Supabase Storage
`upload(..., { upsert: true })` to overwrite the existing `photo-bank` bucket object(s) so the
live Picture Library search picks up the fix without creating duplicate rows.

**Round 1 (earlier in this session, before this handoff was written):** `infant` (was a real
human baby photo — the doc explicitly wants a swaddled **doll**, not a photo of an actual child),
`sock` (was plain white, violates the doc's "avoid white objects" rule), `net` (unrecognizable
flat mesh, no handle), `igloo` (background not white enough to pass audit).

**Round 2 (🚨 the important one — new rule learned):** Tredoux flagged "no bloody toys, they must
be real objects" after spotting a die-cast toy car in a screenshot. Re-inspecting all 31 images
found **five toy-styled renders that had slipped through** because the audit only checks
background/contrast, never subject material:

- `ambulance` — was a glossy die-cast toy model (chunky proportions, toy wheels, decal-style paint)
- `taxi` — same die-cast toy-model problem
- `panda` — was a plush stuffed toy, not a real animal
- `penguin` — was a smooth vinyl/resin figurine, not real downy feathers
- `infant` — had **reverted to a real human baby photo again** (same issue as Round 1 — see
  "open question" below on why this keeps happening)

All five were regenerated with explicit anti-toy prompt language (`"ultra-realistic professional
studio/wildlife photograph, real photograph shot on a DSLR ..., not a toy, not a die-cast model,
not a plush toy/stuffed animal/figurine"` — see the actual prompts in this session's transcript
if you need to reuse them) and re-filed the same way. `infant` was regenerated as an unmistakable
plastic/vinyl nursery doll (glassy fixed eyes, sculpted features) — clearly a doll, not a
photoreal "reborn" doll that could pass for a real baby, since that ambiguity is exactly what
caused Round 1's mistake to happen again.

**New rule added to `scripts/curriculum/materials.config.json`** (`_noToys` field): real
objects/animals only, even for subjects that can't literally be held (a full-size ambulance, a
live panda) — use a realistic full-size photograph or a true-to-life scale-model photograph, never
a children's-toy-styled render (die-cast car, plush stuffed animal, vinyl figurine). The one
sanctioned exception is `infant`, which uses a doll by design (see `HANDOFF_PICTURE_BANK_Jul23.md`
— photographing a real, identifiable child isn't appropriate for picture-bank content) — but that
doll must read unambiguously as a toy doll, not a hyperrealistic "reborn" doll indistinguishable
from an actual baby.

**Storage paths overwritten in place (System B / public Picture Library — `montree_photo_bank`
table, `photo-bank` bucket), so no new duplicate rows exist:**
- `ambulance` → `photos/1784302650776_ambulance.jpg`
- `taxi` → `photos/1784302884227_taxi.jpg`
- `panda` → `photos/1784302805223_panda.jpg`
- `penguin` → `photos/1784302808772_penguin.jpg`
- `infant` → **both** `photos/1784302765002_infant.jpg` (the original "system" row) and
  `photos/1785031072584_infant.jpg` (a "tredoux-picture-bank-sync" row created earlier this
  session) — there were two rows for infant, both updated so neither can resurface the old photo.

All five also re-published to the dark-phonics bucket (`picture-bank/<word>.jpg`) which is what
feeds `make-material.mjs` / printed shelf materials.

## 3. The "ring isn't in the picture bank" complaint — was a search bug, not missing data

Tredoux reported `ring` didn't show up searching the live Picture Library
(`montree.xyz/montree/library/photo-bank`) — 162 results for "ring", none of them an actual ring.
Direct verification (file on disk, dark-phonics Storage listing, three live `montree_photo_bank`
rows all returning HTTP 200) confirmed the picture was never missing. Root cause, found in
`app/api/montree/photo-bank/route.ts`: the search does `label.ilike.%term%`, which matches the
term **anywhere** in the label — so searching "ring" also matches "colo**ring**", "sp**ring**",
"st**ring**", "ea**rring**", "bo**ring**", etc. With the default alphabetical sort and a 50-result
page size, the ~155 "X coloring" labels (this app has a huge library of printable coloring-page
line art, all labeled "`<word> coloring`") buried the real `ring` entries past what the page ever
shows. Same bug would hit any word that's a substring of a common coloring-page label — `net`
(vs "mag**net**", "inter**net**"), `nail` (vs "s**nail**"), etc.

## 4. Two fixes shipped to `app/api/montree/photo-bank/route.ts` + `components/montree/PhotoBankPicker.tsx`

**Fix 1 — relevance ranking.** When a search term (`q`) is present, results are now ranked exact
match → prefix match → whole-word match → incidental substring match, instead of pure
alphabetical order. Implementation: fetch up to 500 matching rows (bounded — see
`RELEVANCE_FETCH_CAP` in the route), rank them in memory, then paginate the ranked array. Verified
directly against the live DB: `label ilike '%ring%'` returns 162 rows total, but ranked + filtered
to real objects only, "ring" surfaces in the first handful.

**Fix 2 — replaced the 10-tab category bar with two tabs.** Tredoux's reaction to seeing the
search results: the All/Animals/Food/Objects/Body Parts/Nature/Places/Actions/Colors/
Clothing/Transport tab bar (sourced from `montree_photo_categories`) was useless — the only
distinction anyone actually cares about is "real photograph" vs. "printable coloring page." New
`kind` query param on the same endpoint: `kind=pictures` (default) filters `label NOT ILIKE
'%coloring%'`; `kind=coloring` filters `label ILIKE '%coloring%'`. `PhotoBankPicker.tsx`'s old
category-fetch-driven button row is replaced with two hardcoded buttons, **📸 Pictures** /
**🎨 Coloring Pictures** (`showCategories` prop kept for back-compat with its 3 existing callers —
photo-bank page, vocabulary-flashcards, CardGenerator — same prop, new simpler meaning). The
`montree_photo_categories` table and the per-row `category` column are untouched — just no longer
queried by this endpoint, so category data isn't lost if a future feature wants it back.

Verified directly against the live DB before shipping: `kind=pictures, q=ring` → 7 results (the
real ring entries, ranked to the top, alongside a few unrelated substring matches like "sharing");
`kind=coloring, q=ring` → 155 results (all "X coloring" pages); `kind=pictures` browse (no query)
→ 1,519 total; `kind=coloring` browse → 155 total.

Both files were typo/syntax-checked with the TypeScript parser (not a full project typecheck —
this sandbox doesn't have the full Next.js project context) before being written back to disk.

## 5. What is NOT done — read this before assuming any of this is live

- **Nothing has been committed or pushed.** `git status` as of this session shows 40 modified
  files ahead of `origin/main` by 1 commit — that includes the 2 files touched this session
  (`route.ts`, `PhotoBankPicker.tsx`) plus a mix of picture-bank jpg changes from earlier sessions
  and unrelated in-progress files (`.gitignore`, `CLAUDE.md`, `HANDOFF_LATEST.md`,
  `app/api/montree/principal/register/route.ts`, `app/api/montree/try/instant/route.ts`,
  `components/montree/DashboardHeader.tsx`, several docs) that Claude never touched. **Ask
  Tredoux whether to commit everything together or just the two search/photo-bank files** before
  running `git commit` — don't assume.
- Even after a commit, **`git push` cannot happen from a Cowork session** — the device-bridge
  tool used to reach Tredoux's Mac (`device_bash`) has no network access by design. Push has to
  happen from Tredoux's own terminal, or a differently-configured session with real git/network
  access to that working copy.
- **The dev server / deployed app has not picked up `route.ts` / `PhotoBankPicker.tsx` yet** — the
  files are written to disk but nothing has restarted or rebuilt. The search-bug fix and the
  two-tab UI are not live until that happens.
- The five toy-render fixes (`ambulance`, `taxi`, `panda`, `penguin`, `infant`) **are** live —
  they went through the sanctioned publish/sync path to Supabase Storage directly, no deploy
  needed for those.

## 6. Open question carried over, still unresolved

`red`, `ran`, `rip` came up in an earlier tangent (checking the Letter R print-material pipeline,
`lib/montree/english-curriculum/spec/week-15.json` / `make-material.mjs --gap-only`) — **not**
part of the SATPIN document. `red` was filed (reused `apple.jpg`, since apple is solidly red).
`ran` and `rip` were deliberately left ungenerated, flagged for Tredoux to decide, matching the
precedent in `docs/handoffs/HANDOFF_PICTURE_BANK_RUN_Jul25.md` that excluded `running` as "not
photographable as a holdable object." Still open — ask before generating.
