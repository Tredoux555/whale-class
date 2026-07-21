# SATPIN Handoff — for the Thursday session (written Mon 2026-07-20 night)

**Who this is for:** the next Claude session (any model). Read this + SHELF_SYSTEM_PLAYBOOK.md
first; both live in this folder. Tredoux's goal Thursday: "knock the entire thing out"
(finish SATPIN completely, then start the alphabet).

## What is DONE and where it lives

- **All 6 SATPIN shelf packs (s,a,t,p,i,n)** — `public/shelf-packs/*.pdf`. Printable, delivered
  to Tredoux Mon night. p/i/n include sentence strips from their books; a/t have pairs
  (pre-reader rule). Builder: `scripts/curriculum/build_shelf_pack.py` (+ the batch variant
  Tredoux has in chat history; regenerate from playbook recipe if needed).
- **3 finished readers** — `public/satpin-books/{spat,sit-sit-sit,nap-ant-nap}.html`.
  Nap = COMPLETE. Sit = complete. SPAT! = complete EXCEPT p6 (hushed finger-hover) — art needs
  a re-roll (first render had drawn text "YOU." / a photorealistic hand; its job UUID was never
  captured). Re-roll prompt is in reader-designs-v2.md Part C wk4 p6 + tabby wording + Cat oref.
- **Teacher hub page** — `public/satpin-teacher.html`, linked from dark-phonics.html nav
  ("SATPIN Materials"). The OLD `/satpin-pilot-readers.html` (rejected photo-style v1) is no
  longer linked from anywhere — consider deleting it Thursday (Tredoux must confirm).
- **Cast sheets, art manifest, playbook, reader designs** — this folder. Every MJ job UUID is in
  art-manifest.md; images persist on cdn.midjourney.com and download free via curl.
- **CLAUDE.md** has the locked art style + sleep rule.

## NOT done — Thursday's list, in priority order

1. **PUSH.** Many commits are local-only on this Mac. `git push origin main` from Tredoux's
   Terminal (sandbox has no network to GitHub — never claim to push). NOTHING is live until this.
2. **SPAT! p6 re-roll** (one MJ job + swap into spat.html + manifest update).
3. **Weeks 1-3 books**: "Snake in My Sock!" (s, sound-hunt), "An Apple for Ant!" (a, oral
   preview), "Segina Sat!" (t, hybrid — first "I read that!"). Full page-by-page designs +
   MJ prompts ready in reader-designs-v2.md Part B/C. Segina/Potato sheets exist. Generate
   (V7 --oref, cheap harvest pattern per playbook §7), assemble (copy the book-HTML pattern),
   add to satpin-teacher.html + shelf packs' shelf-4 strips for t.
4. **Sam decision**: Sam renders as a storybook boy, not a peg doll (his chosen sheet B does).
   Tredoux said he likes it — reconfirm before the alphabet locks him into 20+ books. Also his
   sheet has a drawn "Sam" signature that bleeds into pages (patch pattern in build scripts).
5. **Potato cameo QA**: cameo pages exist for wk4/wk5 books (final wordless spreads). Wk1-3
   books must follow the cameo addendum (no shout pages).
6. **MJ window**: Tredoux said unlimited relax ends within days of Mon Jul 20. PRIORITIZE
   SUBMITTING all remaining prompts (wk1-3 books ≈ 24 jobs; alphabet later) before it ends;
   harvesting can happen any time after (playbook §7 economics).
7. **Alphabet**: batch letters 4-5 per session: design (reader-designs system) → submit → harvest
   → books + shelf packs. m,d,g,o first (lesson-map order). Use week files for vocab where they
   exist; letters beyond the 26-week spine need vocab chosen from dark-phonics.json song
   catchphrases + standard initial-sound sets.

## Safety / site notes (Tredoux asked "make sure it's safe")

- Teacher pages are static files in `public/` — same (lack of) protection as the rest of the
  dark-phonics teacher area: public URLs, no auth. If real gating is wanted, that's an app-level
  change (middleware) — scope it with Tredoux before touching middleware.ts.
- Changes made were purely additive + one nav href swap. No app/curriculum-studio code touched.
  The live WeekSpec system and lesson-map.ts remain UNMODIFIED — the studio spine realignment
  (docs/curriculum/satpin-redesign plan + montree-satpin-realignment-plan) is still a separate,
  unexecuted project. Do not conflate it with these static materials.

## Device/session mechanics that will bite you if you don't know them

- Repo mounts at `~/mnt/montree` via device_bash; **cannot delete files** (mv works, rm fails).
  Git lock files accumulate: `mv .git/index.lock .git/index.lock.staleN` before git commands
  (also HEAD.lock). Warnings about unlinking tmp_obj files are harmless.
- device_bash has NO network. Cloud Bash HAS network (MJ CDN + montree.xyz fetch fine).
- Chrome bridge drops when Tredoux's VPN blips; MJ jobs keep rendering server-side regardless.
- Midjourney account: V8.1 default — `--oref` REQUIRES `--v 7` appended.
media-packs: teacher hub + nav linked; HANDOFF updated below
- ADDED Tue 07-21: per-letter MEDIA PACKS at public/media-packs/{index,s,a,t,p,i,n}.html
  (Song / Pictures / Vocab / Reader per letter; relative proxy URLs, verified live via
  /tmp/media-pack-manifest.json flow). Linked from satpin-teacher.html and dark-phonics nav.
  Tredoux considers the printable shelf packs SECONDARY to these ("printables no good anyway") —
  future letters should ship a media pack FIRST, printables second. When wk1-3 readers land,
  replace the s/a/t reader placeholder cards with real book links.
