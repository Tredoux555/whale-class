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

---
# OVERNIGHT ART RUN (added Tue 07-21 evening — THE priority task for the next session)

Tredoux's instruction, verbatim intent: generate ALL artwork for EVERYTHING overnight via the
browser on his Midjourney unlimited window. He will pick winners himself; books compile later.
DO NOT evaluate or harvest images — submission only. Conserve context ruthlessly.

- PROMPT PACK: docs/curriculum/satpin-redesign/MJ_PROMPT_PACK_ALL.md — 235 prompts, paste-verbatim,
  submission rules at the top (batch 5 / wait 6 min / log every 25 to OVERNIGHT_RUN_LOG.md / never
  poll with screenshots / retry once then skip).
- RUNNER: a Sonnet (or Haiku) agent drives midjourney.com/imagine in Tredoux's Chrome
  (claude-in-chrome tools; check tabs_context_mcp first; the prompt box sits top-center; type,
  Enter, next). V8.1 lacks --oref, which is why every prompt carries --v 7.
- OVERSEER: keep the session alive with ScheduleWakeup/send_later heartbeats (~30 min), each time
  reading OVERNIGHT_RUN_LOG.md (cheap device cat) and nudging/respawning the runner agent from the
  last logged ID if it stalled or the bridge blipped. Do NOT look at images.
- RESUME RULE: the log file is the single source of truth for progress. Bridge/browser drops are
  routine — resume, don't restart.
- MORNING AFTER: report submitted/skipped counts only. Harvest happens in a LATER session by
  crawling the MJ feed for UUIDs (art-manifest patterns) AFTER Tredoux picks winners on
  midjourney.com himself (he can heart/organize there; his picks guide the harvest).
- PUSH: still pending; media packs etc. only appear at teacherpotato.xyz URLs after Tredoux runs
  `git push origin main`. Nothing the runner does depends on the push.

---
# ALPHABET FLASHCARD RUN — handoff (written Wed 2026-07-22 night, after the SATPIN deck shipped)

The SATPIN flashcard deck (v4, public/shelf-packs/dark-phonics-satpin-flashcards.pdf) is the
LOCKED TEMPLATE. Tredoux approved it ("legit"). Next job: same deck for L11-L31 (m d g o c k ck
e u r h b f l j v w x y z qu), batch by batch, Opus checking artwork before each batch ships.

## The card architecture (do not redesign)
- Per letter: LETTER card (front: giant red letter + mouth-cue; back: SONG picture + song title
  + LESSON N) then 2-3 VOCAB word cards (front: ONE isolated picture + word with target letter
  red; back: small red letter + DARK PHONICS + song title). Cast cards only in the SATPIN deck.
- Print: A4 duplex, flip on LONG edge. Builder: scripts/curriculum/flashcards/build_flashcards.py
  (fonts from the canvas-design skill; Outfit-Bold for words, YoungSerif titles, Lora italics).
- ISOLATION RULE (Tredoux, emphatic): every vocab picture = ONE clear subject of the target word,
  white background, nothing else. The overnight run's V1-V6 plates already satisfy this.
- Card images get downscaled to ~1400px JPEG q86 inside the builder (20MB commit cap).

## Ingredients, all ready
- V-slot picks with FULL UUIDs: art-manifest.md sections L11-L31 (cdn.midjourney.com/<uuid>/0_<t>.png).
- Song titles: lib/montree/english-curriculum/spec/dark-phonics.json lessons 11-31.
- Song pictures: ~/Desktop/English Curriculum 2026/Dark Phonics/lesson-NN.png — OUTSIDE the
  repo folder; each session must device_request_folder_access that folder again (granted once
  Jul 22, per-session grant).
- Known blemishes to patch/avoid: L13-S2 + L18-C1 were watermark-patched (patched copies in
  phonics-images/satpin-v2/letters/); L15-C2 + L24-S2 have sigs (unpatched, S/C slots — the
  flashcards use V slots, so mostly irrelevant); L17-C2 has NO art.
- Suggested batches: [11-14 m d g o] [15-18 c k ck e] [19-22 u r h b] [23-26 f l j v] [27-31 w x y z qu].
- Vocab: pick 2-3 clearest words per letter from the V1-V6 plates (word lists = the "A single
  <word>" prompts in MJ_PROMPT_PACK_ALL.md). Watch duplicates across letters (cup in c+u,
  fox in f+x, sock in ck, rock in ck+r) — fine pedagogically, but never reuse the same TILE
  in two letters if avoidable.
- Mouth-cues: write sound-true cues per letter (never letter-name, never schwa) in the style
  of the SATPIN deck: "mmm — lips together, hum", "k-k-k — a quiet back click", etc.
  x = "ks — a hiss at the end", qu = "kw — q and u stick together", ck = "k-k-k — same sound,
  two letters".
- OPUS CHECK (Tredoux asked for this): before shipping each batch, have an Opus agent review a
  contact sheet of the chosen tiles. ISOLATION IS A HARD GATE (Tredoux, twice, emphatic):
  reject ANY tile with a second object, a second character, a prop, background scenery, or
  ground clutter beyond a simple shadow — one subject, white page, full stop. Then: correct
  subject a 4-year-old names instantly, style-true, no text/sigs/watermarks. Do NOT assume the
  overnight V-plates pass — verify every tile individually (some V winners include props, e.g.
  milk-with-straw-and-mouse style compositions). Swap rejected tiles for another tile of the
  same job or another V-slot; if none passes, RE-ROLL with the isolation phrasing below;
  re-check after every swap.
- If a word needs NEW art: locked style suffix + "nothing else" + isolation phrasing; for any
  hands/people: "smooth wooden peg-doll arm, simple rounded wooden mitten hand, matte painted
  toy wood" + no-list additions "no human hands, no skin, no fingers, no fingernails"
  (this beat the human-hand problem for 'tap': d8d396f6 t3).
- Output: ONE PDF per batch (public/shelf-packs/dark-phonics-alphabet-flashcards-<letters>.pdf)
  OR extend to one alphabet deck at the end — Tredoux said "batch by batch"; ship per batch and
  link each from satpin-teacher.html print section. Commit after every batch. PUSH: Tredoux only,
  from his own Terminal (the VM cannot reach GitHub - verified again today).

ADDED Wed night: all 27 song pictures (lessons 05-31) are now IN THE REPO at
phonics-images/dark-phonics-song-cards/lesson-NN.png — no folder grant needed for the
alphabet flashcard run. Song titles remain in spec/dark-phonics.json. For the OVERNIGHT
REALISTIC-PHOTO RUN (Tredoux, Wed night): generate ultra-realistic photo versions of ALL
curriculum vocab (SATPIN song words + L11-31 V-words, nouns only) for true Montessori
materials (three-part cards, bingo). Locked realistic suffix: "ultra-realistic professional
studio photograph of a single real <word>, centered, soft even studio lighting, plain pure
white seamless background, no props, no people, no text, no words, no letters, no numbers,
no watermark --ar 3:2" (NO --v 7, NO --oref — plain V8.1 photo mode; isolation hard gate
applies). Submit via the established runner protocol (batch 5 / wait ~6 min / log every 25
to OVERNIGHT_RUN_LOG.md / retry once then skip / resume from log). Harvest + Opus-curate
after render; organize picks into phonics-images/montessori-real/<letter>/<word>.png.
PHOTOBANK: after curation, write scripts/curriculum/upload-dark-phonics-bank.mjs (extend the
upload-satpin-to-picture-bank.mjs pattern, JPEG-only rule) covering: book pages (sock/apple/
sat + spat p6), vocab-iso, letter plates used in decks, cast, song cards, montessori-real.
The upload itself runs ONLY on Tredoux's Mac in the morning (needs .env.local + network):
  DRY_RUN=1 node --env-file=.env.local scripts/curriculum/upload-dark-phonics-bank.mjs
  node --env-file=.env.local scripts/curriculum/upload-dark-phonics-bank.mjs
Chrome for the MJ runner: Browser 1 (macOS), deviceId 7d422c1a-16c6-440f-8660-bd73adfec31e
(Tredoux pre-authorized in chat). MJ concurrency: 8 jobs; queue rejects the 9th silently —
verify each batch landed before moving on.
