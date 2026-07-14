# Whale-Class / Montree - Developer Brain

**⚠️ STANDING RULE (Tredoux, Jul 10 2026 — PERMANENT): MODEL DELEGATION.** Fable is the DIRECTOR and second brain — it plans, decides, writes the critical copy, and reviews. It does NOT do grunt work. **Sonnet** (preferred over Haiku — more reliable) does all fetching, sweeping, scouting, data-gathering, and auditing via sub-agents. **Opus** builds where appropriate. Never let Fable burn half its context on mechanical work another model can do — spawn agents instead.

## 🖼 SESSION — Jul 14, 2026 (overnight+day, Cowork/Fable directing) — MVGEN MECHANISM CERTIFIED + 58-WEEK IMAGE AUDIT + 114 CRITICAL IMAGES GENERATED — REROLLS VIA TANDEM PROTOCOL NEXT

**Canonical: `docs/handoffs/HANDOFF_IMAGE_TANDEM_JUL14.md` (resume prompt + full tandem protocol) +
`docs/handoffs/HANDOFF_VIDEO_CERTIFICATION_JUL14.md` (mechanism detail).** mvgen phrase-matcher
overhaul CERTIFIED: commits `94e6a6b8`→`14cbb454`→`cfb8fd22`→`9c2500f8`, pushed, 108/108 tests;
shot reports self-flag misses; alias layer `scripts/mvgen/curriculum-video-aliases.json` (🚨 alias
FIRST token must be the sung anchor word); audio-hash cache bug fixed. **58-week visual audit**
(every image actually viewed) → `GENERATE_MANIFEST.json` (122) / `REROLL_MANIFEST.json` (133) +
canon table + Tredoux veto list in `VIDEO_AUDIT_MASTER_JUL14.md`. **114/114 video-critical
GENERATE items DONE** (generated, eyeballed, filed to `Week NN/images/`; run board
`MJ_GENERATION_RUN_JUL14.md`). 🚨 **NO VIDEO RENDERS of any kind — not even samples — until
Tredoux's explicit go** (said twice); 21 stale pre-image-fix renders quarantined to
`~/Desktop/Music Videos/_stale_pre_image_fix/`; daemon may stay up on :8787, used for nothing.
**REMAINING 141: all 133 REROLL entries (none done) + 8 GENERATE leftovers (non-critical).**
Tredoux's feedback on the 114 done so far: some agent-picked grid tiles weren't the best option →
**NEW: 🤝 THE TANDEM PROTOCOL** (full steps in the handoff) — agent ONLY submits `mj_prompt`s +
posts a one-line status card per item, NEVER picks a grid tile or downloads; Tredoux picks +
downloads in his own MJ window; a reconciliation-pass agent matches `~/Downloads` → manifest
entries every ~20 items, archives originals to `_replaced_video_audit/Week NN/` before filing
rerolls, verifies each filed image by reading it. Also this session: `english_program` live on
Whale (migration 293 run, 58 works seeded, 4 QA classrooms also seeded — cleanup optional);
`_all_images_flat` renamed for photo bank (Tredoux uploads manually).

---

## 🚀 SESSION — Jul 13, 2026 (afternoon, same Cowork session) — TAKE PICKS LOCKED + CURRICULUM PUBLISHED TO MONTREE.XYZ (Phase E part 1)

**Canonical: `docs/handoffs/HANDOFF_PHASE_E_CURRICULUM_LIVE_JUL13.md` (incl. resume prompt + the two
queued theories). Commits `f264589f` → `e6960f05` → `a472320b`, pushed.** Tredoux picked takes for all
songs (locked in `docs/curriculum/SONG_TAKE_PICKS_JUL13.json`, applied by `apply-take-picks.py` —
winners clean-named, losers → `_takes_not_picked/`). Review-round fixes: W1 song rewritten with /a/
vocab (ant/apple/ax/alligator) + regenerated · W2 both songs regenerated (was old Jul-2 era) · W31
"The King Can Sing" lyrics EXTENDED + regenerated at 70s (was 14s truncated; 🚨 duration-scan rule:
sweeps check afinfo durations, not just counts). **PUBLISHED: 114 mp3s → `montree-media/
curriculum-songs/wNN-<role>.mp3`; every spec's `songs[].audioUrl` = absolute montree.xyz proxy URL;
QR cards re-rendered all 58 weeks (real scannable QRs); Curriculum Studio renders audio players.**
⏳ Open: W30 sound-song take pick (only placeholder QR site-wide) · archive deletions after sign-off ·
visual review leftovers · live click-to-play verify. **NEXT (theories in the handoff): A) Montree
`english_program` 6th-area works-ladder integration (flag + 20000-band seed, zero new tables);
B) mvgen music videos (assets already filename-matched to the tool — anchor pulse mode + batch
driver + 3-song pilot).**

---

## 🏁 SESSION — Jul 13, 2026 (midday, Cowork/Fable directing Sonnet browser agents) — PHASE D 100% COMPLETE: ALL PRODUCTION DONE + SEJEENA FIX — FINAL SWEEP ALL GREEN

**Canonical: `docs/curriculum/PHASE_D_RUN_JUL12.md` (🏁 CLOSED header + CURRENT STATE Jul 13 ~13:45).
The entire 58-week program is now fully produced: every week W27–58 verified 4 mp3s + gap-clean images
+ 10 valid PDFs (final sweep by folder counts, ALL GREEN). ~490 images · 320 PDFs · 128 L2–3 song
files. 770 Suno credits left.**

- **Two holes found that the overnight run's own reports missed:** (1) **W44 was missing `feet.png`**
  despite the agent's "14/14 complete" claim (manifest wanted 15; skipped under the anatomy-prompt
  rule) — regenerated with safe phrasing, pack re-rendered. 🚨 RULE: re-verify agent completion claims
  with `--gap-only`; the sweep caught a claimed-complete week. (2) **Sejeena pronunciation** (Tredoux
  caught it): the print-"Segina"/sing-"Sejeena" rule was only applied to W2 — five specs had the
  literal name in sung lyrics (W22 The Vet, W25 The Duck Says Quack, W26 The Bug Can Buzz, W49 The
  Bird and the Girl, W58 The Celebration). Specs fixed (lyrics only) + all 5 songs regenerated; old
  files preserved in `English Curriculum 2026/_replaced_segina/`. 🚨 RULE: grep every spec for the
  printed spelling of phonetic-respelled cast names BEFORE production.
- **Orphan pattern continued (#5, #6):** W51–58 was mostly produced by orphan #6 (spawned from an
  interrupted launch, worked W58 DESCENDING, died mid-W55); finisher agents harvested strays +
  pre-cooked jobs (W51 cost 0 credits — fully pre-generated). New Suno gotcha logged in the run doc:
  mini-player "..." download binds to the LOADED track, not the navigated page — click the row
  thumbnail first (stale-track download caught via MD5).
- **⏳ Owed:** Tredoux morning-review checklist (take-picks × 64 songs · W51 metallic star · W52
  loud-sound proxy · W58 station-coloring · cast eyeball · Pattern Tree/W38 tracing · Sejeena regen
  listen + delete `_replaced_segina/` after) → then **Phase E**: audio-QR reconciliation + Montree
  wiring (all 3 levels).

---

## 🎉 SESSION — Jul 12 21:00 → Jul 13 morning, 2026 (overnight, Cowork/Fable directing Sonnet browser agents) — PHASE D IMAGES 100% COMPLETE (all 32 packs) + SUNO NEARLY DONE

**Canonical live status: `docs/curriculum/PHASE_D_RUN_JUL12.md` (CURRENT STATE Jul 13 ~10:35 + the
updated RESUME PROMPT — read it to finish). The overnight push produced EVERY image for W27–58
(~490 imgs, chunks M2–M6) and rendered ALL 32 packs (10 valid PDFs each, exit 0). Suno: W27–49 done
(92 files); W50 was in-flight via orphan #5 at session close; W51–58 the only remaining production
(~16 songs). All on ONE browser — the rails serialized. SESSION CLOSED 10:35 on Tredoux's stop
order; resume via the run doc's RESUME PROMPT (ground-check W50–58 mp3 counts FIRST — the orphan
may have kept producing after close).**

- **🚨 THE ORPHAN PATTERN (3 confirmed instances): a user interrupt on the parent turn does NOT
  reliably kill a launching sub-agent** — it often spawns anyway, works for hours, and its report is
  unreachable. Direct by GROUND TRUTH: folder counts + file mtimes; >8-10 min silence = dead; never
  spawn onto a browser whose files are still moving; fold orphan output into the run doc yourself.
- **Browser-binding saga concluded:** ghost extension deviceIds after window closes cost ~2h of
  false blockers (logged-out renders, fake timeouts). Rebind = switch_browser Connect-click; verify
  by loading a real page. The whole night ultimately ran on ONE live browser.
- **New MJ rules added to the run doc (M3–M6 entries):** cdn-page-only downloads (a.click() silently
  blocked on the app page; navigate-to-CDN and canvas-download must be 2 separate JS calls) ·
  DOM-virtualized feed scraping per scroll position · scope img scraping to ±500px of the prompt node
  (job-ID swap bug) · dramatic-weather prompts can render mushroom clouds — use children's-book
  phrasing · prompt-typo discipline ("toy shop" → literal signage) · post-navigate screenshots can be
  stale. Casting canonicals locked for Bee (W44), Star (W47), Owl (W52), Sam (W53); W58 graduation
  cast (17 characters incl. crowned potato) verified drift-free.
- **⏳ Owed:** finish Suno W48–58 (resume prompt in run doc) → final verification sweep → Tredoux
  morning review (64 song take-picks · W51 metallic star · W52 loud-sound proxy · W58
  station-coloring · cast eyeball · Pattern Tree/W38 tracing) → Phase E audio-QR reconciliation +
  Montree wiring.

---

## 💾 SESSION — Jul 12, 2026 (morning, same Cowork session — Sonnet fleet) — BACKUP DONE + DISK CLEARED FOR PHASE D + 222-ORG UNDERPRIVILEGED SCRAPE + OUTREACH ENRICHMENT

**Canonical: `docs/handoffs/SESSION_BACKUP_CLEANUP_UNDERPRIV_JUL12.md` (incl. the Phase-D resume prompt — READ IT to resume).**

- **💾 Backup COMPLETE: 74GB → `/Volumes/Extreme SSD/MontreeBackup_2026-07-12/`** (ACTIVE repos minus
  node_modules, English Curriculum 2026, Social Media Pack, ~/Documents/Claude). ⚠️ `~/Desktop/Music Videos`
  didn't exist at backup time — locate mvgen outputs before trusting this backup for them. Watcher:
  `~/backup-watcher.sh`, log `~/Desktop/backup-log.txt`. Offloads: `/Volumes/Extreme SSD/Offloaded_Jul12/`
  (Downloads Video 9.4G + Archives + Installers + SupabaseBackups — checksum-verified moves).
- **🧹 DISK: 3.4 → 16 GiB free — PHASE D GATE CLEARED.** Caches ~5.8G purged + 10.1G offloaded. Logs:
  `~/Desktop/DISK_INVENTORY_AND_CLEAROUT_JUL12.md` + `CLEANUP_LOG_JUL12.md`. Downloads reorganized (1,060
  files → typed folders). **⏳ Tredoux manual for ~50GB more: Claude Desktop settings→clear old VM bundles
  (16GB, NEVER rm), Xcode→Platforms→delete unused simulator runtime (~18GB), `xcrun simctl delete unavailable`.**
- **🌍 UNDERPRIVILEGED DEEP SCRAPE: 222 orgs (194 new), ranked by social footprint —
  `docs/outreach/underprivileged/UNDERPRIV_MASTER_RANKED_JUL12.csv`** (+ 3 region files). Top: Watoto
  Uganda · Cambodian Children's Fund · Pies Descalzos (Shakira) · Integra Chile · Malala Fund · TCF
  Pakistan · **Fe y Alegría (22-country school network = biggest reach)** · MGGF + NCMPS (natural partners).
  71 SEEN emails, 138 FB. Rules held (emails only when SEEN, snippet-based footprint, no FB fetches).
- **📬 ENRICHMENT (`docs/outreach/enrichment/`): 38 of 51 no-email disadvantaged rows now have SEEN emails**
  (74.5%) · 80 disadvantaged rows footprint-scored 0-10 · **MX sweep of 2,860 domains: 44 newly dead,
  4 REVIVED** (incl. rosehillmontessori.org). 🚨 NOT yet applied to DB/master — apply via
  `scripts/outreach-status.py` next session.
- **⏳ NEXT: PHASE D PRODUCTION IS UNBLOCKED** (~640 MJ + 128 Suno for W27–58, runbook =
  OVERNIGHT_RUN_JUL11.md) + decide founding-partner outreach to the top of the underprivileged ranking
  (father-story template, Jul-7 track) + apply enrichment flips + L1 morning-review items + Phase E wiring.
- **🎬 PHASE D LAUNCHED same day (afternoon) — canonical live status: `docs/curriculum/PHASE_D_RUN_JUL12.md`
  (self-maintaining status board + CURRENT STATE + resume prompt — READ IT FIRST to resume).** At the
  Jul-12 ~17:00 context refresh: **images W27–33 done + packs; Suno W27–44 done (72 files)**; W34–58
  images + W45–58 songs remain. Two browsers (MJ + Suno rails, parallel Sonnet agents). Hard-won MJ
  automation fixes (React-textarea native-setter, img.src verification, search-first) are captured in
  that doc's IMAGE CHUNK PROGRESS entries — every future MJ agent must use them. 🚨 Lesson: user
  interrupts kill in-flight agent launches — ground-check file counts before assuming a rail is alive;
  respawn per chunk; the rails must never idle.
- **🎬 PHASE D evening/night push (same day, ~21:50 state — canonical: PHASE_D_RUN_JUL12.md CURRENT
  STATE):** **Images W27–38 + W41 + W43 done with packs; W42 in-flight via an ORPHANED agent** (user
  interrupt did NOT kill it — sharpened lesson: check file mtimes before spawning onto a busy browser).
  **Suno W27–46 done (80 files); W47–58 remain (24 songs, ~1,170 credits).** Images left: W39/W40 +
  W44–58 (~240 jobs, 18 packs). 🚨 **Browser-binding saga**: closing Chrome windows leaves GHOST
  extension deviceId connections (logged-out renders, timeouts, tabs reverting to newtab, network fine
  the whole time) — after any browser restart, verify bindings by loading a real page and reading text
  back; rebind via switch_browser Connect-click. New MJ gotchas (M2 entry): hallucinated watermarks →
  corner-check full-res; species/material drift → explicit adjectives in the noun phrase; never iterate
  isolated-human-anatomy prompts; compare all 4 coloring quadrants for gray shading.

---

## 🌳 SESSION — Jul 12, 2026 (overnight, Cowork/Fable directing) — LEVELS 2–3 FULLY SPECIFIED: SPINE LOCKED + ENGINE GENERALIZED + ALL 32 WEEKSPECS AUTHORED + DIRECTOR-READ

**Canonical: `docs/handoffs/SESSION_CURRICULUM_LEVELS_2_3_JUL12.md` (the full record) — executes
`PLAN_CURRICULUM_LEVELS_2_3_JUL11.md` Phases A–C end-to-end in one overnight run. Commits `106bc694`
(checkpoint) + the final fixes commit, both pushed. The 58-week program is now COMPLETELY SPECIFIED —
every week from "a" (W1) to the potato's coronation (W58) has a validator-green WeekSpec.**

- **§0 rulings CONFIRMED by Tredoux (no vetoes):** 16+16 · cast carries+grows · stop at W58 · "Level 2/3"
  naming. **Phase A:** `MASTER_SPINE.md` rewritten — full W27–58 grids, per-week word banks (mined
  phonics-data.ts + Fable-authored missing banks), cumulative math **94 → 603 (W42) → 1,192 (W58)**, word
  #1,000 lands W53, heart-word ledger (9 faith words; *on* + *why* earn their letters), cast debuts (Sheep
  W27 · Chick W28 · Snake W33 · Bee W44 · Star W47 · Owl W52; name-days Snake W38, Sheep W44), **Pattern
  Tree** (32 leaves + Mirror Leaf W50 + potato crown W58).
- **Phase B (sacred flow, SHIP):** contract `PLAN_ENGINE_GENERALIZATION_JUL12.md` → Opus build → Sonnet
  audit (0 CRIT, 1 WARN fixed). soundType +7 · pattern-card tracing mode · Pattern Tree wall · level-aware
  kicker · **pattern-aware validator** (registry, split-vce, suffixes, y-final, forbidden-before, cast-name
  exemption, potato-W58 decree, 27 fixtures) · weekToLessonMap + WEEK_LOADERS W27–58. **Level 1
  byte-identical (HTML-diffed W4/W19/W26).**
- **Phase C:** Fable exemplars **W27 (sh)** + **W38 (a_e, Snake's name-day)**; 3 parallel Opus drafters did
  W28–37/W39–48/W49–58. **Fable read all 32 weeks' lyrics + book texts → 9 fixes** (W30/W31/W58
  syllable-split songs — WHOLE-WORDS rule; W40 fake wand base; W42 schwa + untaught "come"; W43 "all";
  W49 "She put"; W33/W52 idiom/clarity). **Final gate: validator exit 0 on all 58 weeks.**
- **🚨 RULES:** Opus drafters slip on the WHOLE-WORDS rule most — director read before production is
  non-negotiable. Validator false-passes exist (come/she/all letter-sum but are untaught) — STRICT review
  checks PRONUNCIATION. W11's produced book prints "potato" (grandfathered in validator — Tredoux's call).
  Multi-pattern weeks: machine token in `sound`, human label in `patternDisplay`; W50 = sound "review".
- **⏳ Owed:** **Phase D production** (~640 MJ + 128 Suno, runbook = OVERNIGHT_RUN_JUL11.md) — **GATED on
  disk cleanup (10+ GB; Mac was at 1.7 GiB)**. L1 morning-review items still open. Phase E Montree wiring
  queued. Eyeball Pattern Tree + pattern tracing on a real W38 pack. DC deletes: `tsconfig.scope-l23.tmp.json`
  + 3× `_tmp_*.mjs` at repo root.

---

## 🗺 SESSION — Jul 11, 2026 (day, Cowork/Fable directing) — LEVEL 1 PRODUCTION 100% COMPLETE + LEVELS 2–3 ROADMAP APPROVED

**Two things happened. (1) The overnight production run FINISHED: the full 26-week Level 1 curriculum is
produced end-to-end** — all images (~520, cast complete through fox W24 + graduation W26), all 26 packs
(260 PDFs verified valid), all songs (W15–26's 48 Suno mp3s landed, zero lyric rewrites, 1,590 credits left).
Status board closed out in `docs/curriculum/OVERNIGHT_RUN_JUL11.md`; commit `4b28562e` (runbook + the new
0-byte-PDF hard-fail guard in `build-week.mjs` — root cause of W19's silent bingo failure was a 100%-FULL
DISK, not the builder). 🚨 Disk ended at 1.7 GiB free — real cleanup owed before the next production run.
Morning-review items (Suno take picks, W9 lyric reconciliation, 5 coloring rerolls, hero-word coloring gaps)
listed in the runbook's checklist. **(2) LEVELS 2–3 ROADMAP RESEARCHED + APPROVED — canonical binding
contract: `docs/handoffs/PLAN_CURRICULUM_LEVELS_2_3_JUL11.md`. READ IT FIRST; its §6 resume prompt is the
entry point.** Shape: Level 2 = W27–42 (sh→ch→th→ck/FLSZ→ng→wh → blends ×5 incl. EAL-heavy final blends →
magic-e ×4 → soft c/g+tch/dge celebration), Level 3 = W43–58 (vowel teams → r-controlled → EAL minimal-pair
review week → diphthongs → y-vowel → kn/wr/mb → -ing/-ed/-s → -tion GRAND GRADUATION). 58 weeks total.
Proposed rulings (§0, Tredoux vetoes at next session start else they stand): keep 16+16, cast carries+grows,
stop at W58, "Level 2/3" naming (never "Blue/Green" in product — lesson-map phase boundaries don't match;
lesson-map stays frozen, interop via weekToLessonMap). Engine generalization gap list (§3, verified paths):
soundType enum, pattern-card tracing mode, vowel wall→Pattern Wall, book kicker text, pattern-aware
decodability validator, WEEK_LOADERS+weekToLessonMap W27–58. End-of-L1 baseline: **94 decodable words**
(list in the plan §1; `reviewBank[]` is NOT cumulative — use newWords union). Research payload §4 (UFLI/L&S/
Jolly consensus, Mandarin-L1 EAL findings: final blends hardest, final-l 97% error trap, th/tense-lax
minimal pairs, ng not free). Execution = 5 phases (§5): A spine lock → B engine (sacred flow) → C authoring
(Fable exemplars W27+W38, Opus drafts, Fable reads all 32) → D production (proven loops, needs 10+ GB disk)
→ E Montree wiring (all 3 levels together).

---

## 🎼 SESSION — Jul 10, 2026 (late night, Cowork/Fable directing) — CURRICULUM STUDIO + FULL 26-WEEK LEVEL 1 ENGLISH CURRICULUM SHIPPED (the big curriculum revamp)

**Canonical: `docs/handoffs/SESSION_CURRICULUM_STUDIO_JUL10.md` + binding contract `docs/handoffs/PLAN_CURRICULUM_STUDIO_JUL10.md` (§8b amendments included) + `docs/curriculum/spec/MASTER_SPINE.md`. 🚨 NOT COMMITTED — `lib/montree/english-curriculum/` is fully UNTRACKED; commit+push via Desktop Commander is owed item #1 (an audit agent destroyed week-04.json mid-session; only Fable's in-context copy saved it — git is the safety net).**

- **⚖️ THE RULING (locked): CMAT vs SATPIN → NEITHER. Tredoux's utility-first order A→T→M→C→S→N→P→I→H→D→O→G→B→E→R→U→F→L→W→J→K→V→Y→X→Qu→Z is the spine** (first decodable book at W4, confusables separated, narrative arc). `lesson-map.ts` untouched (interop via `weekToLessonMap`); CMAT retires. Scope rulings: Level 1 full build now, Levels 2-3 skeletons; Pink Readers + 49 acoustic songs stay as library extras; backend = local Mac CLI (mvgen pattern).
- **All 26 WeekSpecs authored** (`lib/montree/english-curriculum/spec/week-NN.json`): word banks, 51 dark-trap song lyric sheets + Suno prompts (sound-stutter + word-frame pattern, potato bridge gag, "Sejeena"), 26 decodable book texts (levitating-cat W4, vet reunion W22, graduation W26), full asset manifests w/ ready MJ prompts. W3-4 Fable-authored exemplars; W5-26 Opus-drafted; validator **exit 0 on all 26**.
- **Curriculum Studio** live at `/montree/library/curriculum-studio` (public, 5th library card) + **render engine** (`lib/montree/english-curriculum/render/` — 10 pure Node+browser builders incl. the 4 Python-only types now web: tracing stroke-arrows a-z, coloring, dictionary journal, dark-forest book; ONE bingo duplex impl) + **CLI** `scripts/curriculum/build-week.mjs` (gap report/PDF, prior-week asset fallback) + `validate-specs.mjs` (decodability gate).
- **Sacred flow honored**: Fable contract → Opus build + 3 parallel Opus content drafters → Sonnet fresh-eyes (5 CRIT incl. compound-asset-key resolution killing book art + weeks unregistered in WEEK_LOADERS) → Opus 9-fix pass → Sonnet integration re-audit **SHIP, 0 violations**.
- **🚨 RULES: audit agents never mutate live spec files (/tmp only). New week JSON = 1 WEEK_LOADERS line or it's invisible. STRICT vs PICTURE-VOCAB decodability split per contract §8b. Potato never printed until decodable — the class shouts it from the picture.**
- **Owed**: Tredoux commit+push (DC) · Suno 51 tracks → mvgen videos · MJ art passes (`--gap-only` prompts; seam notes in handoff) · **Phase 2 Montree pack** (flag + seed to `montree_classroom_curriculum_works` 20000-band + curated VM + This Week view — zero new tables, phonics precedent) · **Phase 3 Conductor's Score manual** · real-asset Week-1 PDF acceptance run on the Mac.
- **🌙 OVERNIGHT PRODUCTION RUN (Jul 11, same session) — canonical live status: `docs/curriculum/OVERNIGHT_RUN_JUL11.md` (self-maintaining status board — READ IT FIRST to resume).** Tredoux upgraded MJ to unlimited + authorized full asset production. **DONE:** (1) Suno style v2 LOCKED (`dark trap, 68 bpm, … kids choir chant on hook, …`) + **WHOLE-WORDS lyric rule** (never syllable-split: POTATO not PO-TA-TO; keep initial-sound stutters "C-c-cat"; keep uppercase spell-outs O-N/B-O-X) applied to all 26 specs + contract §5, pushed `799f720c`. (2) **Images W1–4 COMPLETE**: 53 MJ files generated/picked/sorted, all 4 packs rendered to `Week 0N/pack-v2/`, zero gaps. (3) **Suno W3–14 COMPLETE**: 48 mp3s (2 takes/song) in week folders — agent drove suno.com (2090 credits left). **⚠️ W9 "A Hat for the Ant" audio ≠ JSON lyrics** (Suno copyright filter rejected 3×, agent rewrote on the fly — reconcile or re-gen). W2 tiger-coloring.png has gray shading (reroll candidate). **REMAINING:** images W5–26 (THE LOOP per runbook — Sonnet browser agents, ~5-week chunks, prompts auto-pulled via `--gap-only`), Suno W15–26 (24 songs), morning review (Tredoux picks takes; cast-consistency hero-lock pass w/ --oref if cat/Segina drift; eyeball coloring pages). **RULES learned: MJ silently drops rapid batch submissions — submit one-at-a-time w/ feed verification. Suno copyright filter can reject Seussian patterns — rewrite, then reconcile the JSON. Agents can't hear — always save both takes.** The full-curriculum production pipeline is PROVEN end-to-end (spec → MJ → sort → PDF packs + spec → Suno → mp3s); the rest is chunk repetition.
- **✅ DIRECTOR REVIEW ROUND (same session): Fable personally read all 26 weeks' lyrics + book texts** (7 fixes incl. Suno phonetic respelling rule: short-vowel stutters sing 'ih/ah' etc., print keeps the letter; W23 stopped the class eating cast-member Bug) **+ live Chrome review of the Studio on the Mac** (3 fixes: Materials above Songs, scroll-trap collapse toggles, localStorage-in-initializer hydration mismatch). All in handoff §Director review round. Dev server was left running on :3000.

---

## 🎛 SESSION — Jul 10, 2026 (night, same Cowork session as phase 1) — MV STUDIO SHIPPED: /admin/mvgen CONTROL CENTER + LOCAL DAEMON + QUALITY FIXES

**Canonical: `docs/handoffs/SESSION_MVGEN_STUDIO_JUL10.md` + contract `docs/handoffs/PLAN_MVGEN_STUDIO_JUL10.md` (read the contract before touching any of it). NOT yet committed — Tredoux pushes via Desktop Commander.**

- **Tredoux's verdict on phase 1 ("works but doesn't follow lyrics or beat, subtitles wrong") → phase 1.5 quality fixes + a hosted control center.** Rulings: render engine = **local daemon on the Mac** (`scripts/mvgen/server.py`, 127.0.0.1:8787, stdlib, $0); dashboard = **Whale admin** `/admin/mvgen` (🎼 MV Studio card). Browser on montree.xyz talks straight to localhost — Chrome-only (loopback mixed-content exemption + PNA preflight; Safari blocks). **🚨 A Next.js proxy can NEVER replace the direct fetch — Railway's localhost is not the Mac.** CSP: loopback added to `connect-src` AND `media-src` in next.config.ts (`<video>` needs media-src — audit catch).
- **Quality fix A (subtitles): provided lyrics are GROUND TRUTH** — whisper supplies timing only (stdlib NW alignment, windowed re-transcription for uncovered spans, RMS-gated distribution, post-Pass-2 sparse-anchor rejection). Potato song: 90/90 lyric words, blank-gap max 1.44s (was: garbage + blank climax). **RULE: always paste lyrics in the dashboard — it's the quality lever.**
- **Quality fix B (beat): tempo-grid selection {½T,T,2T}+phase by onset strength, cuts snapped to onsets, `--cut-every {1,2,4}` default 2.** Verified: max cut→beat 43.7ms.
- **Sacred flow:** Fable contract → 2 parallel Opus builds → Sonnet fresh-eyes FIX FIRST (2 CRIT: sparse-anchor blank climax + log_tail type mismatch) → Opus fixes (+5 WARNs) → Sonnet re-audit **SHIP, 0 CRIT**. Daemon runtime-tested over real HTTP (CORS/PNA/Range/jails/cancel/409/413 all asserted live).
- **🖼 LATE ADDITION (same night): lyric-synced image scheduling (`scripts/mvgen/shotlist.py`)** — Tredoux: "pictures don't line up with the song" → images now matched to sung words via FILENAME keywords (04-cup.png shows while "cup" is sung; anchored cuts land on the beat just before the word; unmatched images fill gaps on cadence; `--image-sync lyrics|cycle` default lyrics, auto-fallback). **🚨 RULE: name images after the sung word** (≥3 letters; stopwords in filenames ignored). Own sacred-flow cycle: Opus build → Sonnet FIX FIRST (2 CRIT: stopword-token anchor hijack + late-arriving image on near-simultaneous anchors) → Opus fix (+ `approx` word flag → 1.0s pre-roll on even-distributed climax words) → Sonnet **SHIP 0 CRIT**. Also: Opus full audit of everything = FIXED-NOW-PROPER (1 fix: daemon IMAGE_EXTS advertised .gif the engine can't render; all live security attack tests held).
- **🎆 V2 ("build me a masterpiece", same night): PULSE + PROJECTS/DRAG-DROP + MACWHISPER + SHOT PLANNER — SHIPPED** (contract = V2 ADDENDUM in the plan doc; own sacred-flow cycle, final re-audit SHIP 0 CRIT 0 WARN). **Beat pulse**: quick zoom punch on every beat, harder on downbeats, hardest as an anchored word is sung (`--pulse`, default beat; exp-decay τ=0.12s; fallback ladder never fails a render). **Projects + dropzones**: drop mp3/images/SRT onto the dashboard → uploads to `~/Desktop/Music Videos/_projects/<slug>/` via `POST /api/upload` (X-Filename percent-decoded — audit CRIT). **MacWhisper import**: `--subs .srt/.vtt` ⇒ whisper never runs; lyrics stay ground truth over sub timings. **Shot Planner**: analyze job → `GET /api/plan` → missing-artwork checklist w/ next-free `NN-word.png` filenames + theme-templated MJ prompts (the no-API Midjourney workflow — the operator is the API). **🚨 RULE: timeline.json carries `inputs_fingerprint` — changed lyrics/subs auto-re-analyze; never remove it** (stale-cache CRIT).
- **📌 PINNED end-of-session (Tredoux): NOTHING deployed yet** — Tredoux verified the MV Studio card is absent on live montree.xyz/admin (push still owed via Desktop Commander). **#1 queued mvgen tweak: the beat-zoom pulse should fire ONLY on anchored key-vocab words** (new `anchor` pulse mode, make it the default — not every beat/downbeat). **mvgen work resumes AFTER the next big project — NEW SONGS + FULL CURRICULUM REVAMP** (fresh context; may become front-and-center of the system, possibly superseding much of `/admin`). Full detail + resume prompt: handoff §📌 PINNED. Still owed regardless: delete `scripts/mvgen/__pycache__/` + `tsconfig.scope-mvgen.json` via Desktop Commander (gitignored). Phase 3 queue in the handoff (portrait, launchd auto-start, Engine B canvas).

---

## 🎬 SESSION — Jul 10, 2026 (evening, Cowork/Fable directing Opus+Sonnet) — MVGEN PHASE 1 SHIPPED (local music-video CLI)

**Canonical handoff: `docs/handoffs/SESSION_MVGEN_PHASE1_JUL10.md`. NOT yet committed — Tredoux pushes via Desktop Commander.**

- **`scripts/mvgen/` built per the Jul-10 spec:** analyze.py (librosa beats/downbeats/sections + local faster-whisper word timestamps → timeline.json) + Engine A ffmpeg slideshow (downbeat cuts, deterministic Ken Burns, ASS `\kf` karaoke) + mvgen.py CLI + both themes (montree dark-forest/gold/Lora, kids #2D5A27/Andika) + **bundled fonts/** (Lora OFL + Andika — never rely on OS fonts). Output → `~/Desktop/Music Videos/<song>/`, $0/video, zero AI at render time.
- **Sacred flow honored:** Opus build → Sonnet fresh-eyes FIX FIRST (2 CRIT: hallucinated-repeat subtitles + unbundled Lora) → Opus fixes (temp 0 + `condition_on_previous_text=False` + degenerate-word filter; fonts bundled; cache duration guard; clean CLI errors) → Sonnet re-audit **SHIP, 0 CRIT**. Full render runtime-audited frame-by-frame (Jun-14 rule), both themes.
- **🚨 RULES learned:** whisper calls are `temperature:0` like every other durable-output model call; kids-song repeat lyrics are a whisper hallucination minefield — `--lyrics` bias + degenerate filter are the guard rails; back half of "A is for Potato" is sung but decode-loops → renders subtitle-free by design (segmented-transcription opt-in = phase 2 candidate).
- **Owed:** Tredoux commits+pushes `scripts/mvgen/` + `.gitignore` + handoff; deletes `scripts/mvgen/__pycache__/` via Desktop Commander (sandbox rm blocked, gitignored). **Phase 2** (karaoke/theme polish, portrait, segmented flag) + **Phase 3** (Engine B canvas) queued — resume prompt in the handoff.

---

## 📮 SESSION — Jul 10, 2026 (Cowork/Fable directing Sonnet) — BATCHES 2+3 DRAFTED (50, Variant A) + VARIANT B LOCKED FOR BATCH 4 A/B + MVGEN BUILD SPEC QUEUED

**Canonical handoff: `docs/handoffs/SESSION_OUTREACH_BATCH2_3_AND_MVGEN_SPEC_JUL10.md`.**

- **📭 Gmail sweep since Batch 1: one real reply, Wheatley School — "not interested at this time" → flipped to dead.** 3 known OOO auto-replies (Antioch/Towles/Azalea). **Zero new bounces — Batch 1 deliverability still 100%.**
- **📮 Batches 2 + 3 (25 each, 50 total) drafted in Gmail at the 50/day cap — do NOT queue more until these are sent.** Records: `docs/outreach/FOUNDING_100_BATCH_2_JUL10.csv` + `docs/outreach/FOUNDING_100_BATCH_3_JUL10.csv`. All 50 dedup-checked (`to:FULL-ADDRESS in:sent`) + flipped to `drafted` via `scripts/outreach-status.py` (writes verified by re-read despite the CLI's known post-write 500).
- **🅰️🅱️ A/B test locked: Batches 2–3 (Jul 10) = Variant A ("From one Montessori teacher to another"); Batch 4+ (Jul 11 onward) = Variant B ("A small favour from a fellow Montessorian") until enough replies accumulate to compare.** Both full texts + the protocol live in `docs/outreach/GLOBAL_OUTREACH_CONTEXT_REFERENCE.md`. Every batch CSV must note which variant was used; analyse reply rates per variant before picking a permanent winner.
- **Selection method proven repeatable:** master list → valid email → exclude social-outreach set → exclude PRIOR_CONTACT/MX_DEAD → exclude prior batches → dedup by email → `random.seed(42)` sample of 25. Batch 2 had 3 montessoricensus.org country-mislabeled rows (kept, noted in CSV); Batch 3 had none.
- **🎬 QUEUED BUILD (not started): automated music video generator (mvgen).** Full Opus build spec in the handoff — 3-layer local-CLI architecture (librosa/whisper analysis → ffmpeg slideshow or headless-Chrome canvas render → CLI interface), $0 cost per video, montree + kids themes, explicitly rejects gen-AI-per-frame and SaaS render APIs. Resume prompt is in the handoff's §mvgen.
- **Next (Jul 11):** generate Batch 4 (next 25, exclude batches 1–3) using Variant B; sweep Gmail for replies/bounces to batches 2–3; follow-ups due Jul 13/16/20 per the 7-day rule; track replies per variant.

---

## 🩹 SESSION — Jul 9, 2026 (Evening) — PHOTO QUEUE ERROR HANDLING + AI-TIER DISPLAY CONSISTENCY

**Canonical handoff: `docs/handoffs/SESSION_PHOTO_QUEUE_AND_AI_TIER_JUL9.md`.**

- **🩹 iOS Safari photo capture crash (`af035fd9`).** Teachers on iPad/iPhone saw "Photo could not be saved: null" toast — WebKit quirk where IndexedDB errors can be bare `null` instead of `DOMException`. Extracted `normalizeIDBError()` helper in `lib/montree/offline/queue-store.ts`, replaced ~14 rejection sites, hardened capture-page catch. Error now surfaces real diagnostic message. No retry logic or queue-full handling changed.
- **🎛 AI tier display drift resolved (`af035fd9`).** Super-admin schools list + Mira's health tool were hand-rolling tier derivation and skipping the trial_ends_at branch, showing "Free"/"Haiku" for schools actually getting Sonnet. Extracted `deriveTier()` pure function in `resolve-model.ts`, both surfaces now use it — single source of truth for all AI-tier display + diagnostics across the app.
- **🚨 Data action: all 12 existing schools (as of Jul 9) received permanent Sonnet override** via `montree_school_features` upsert (`ai_tier_sonnet=true`, `ai_tier_haiku=true`, `monthly_ai_budget_usd=9999`). **CRITICAL:** this does NOT change pricing for NEW schools going forward — fresh signups still get 7-day trial → auto-revert to free on expiry, per locked Jul-6 design. Only these 12 test/review accounts got the flag. Commit live-verified on Railway; both issues resolved.

---

## SESSION — Jul 9, 2026 (Evening) — FOUNDING 100 BATCH 1: 25 EMAILS SENT + GLOBAL OUTREACH FRAMEWORK LOCKED

**Canonical handoff: `docs/handoffs/SESSION_FOUNDING_100_BATCH1_JUL9.md` + `docs/outreach/GLOBAL_OUTREACH_STATUS_JUL9.md` + `docs/outreach/GLOBAL_OUTREACH_CONTEXT_REFERENCE.md`.**

- **25 emails sent** to schools across 8 countries (AU 4, CA 1, FR 3, DE 1, IN 2, IE 1, IT 2, US 6)
- **Campaign:** Founding 100 lifetime discount (7USD/student → 3USD/student for life)
- **Subject:** "Montree - Montessori" (typos fixed: "to to" → "to", "most lightly" → "most likely")
- **Responses:** 0 real replies, 3 auto-OOO (Antioch until Jul 20, Towles until Jul 12, Azalea summer slower)
- **Deliverability:** 100% clean, zero bounces
- **Global pool remaining:** 3,045 schools eligible for Batch 2+ (zero cross-pollination with Facebook social outreach)
- **Framework locked:** Master data (7,366 schools), social data (3,263), selection algorithm, standing rules documented
- **Next:** Follow-ups Jul 13/16/20 per out-of-office dates + 7-day rule; Batch 2 ready to generate on approval

---

## Project Overview
Next.js 16.1.1 app with two systems:
- **Whale Class** (`/admin/*`) - Admin tools (card generators, description review, etc.)
- **Montree** (`/montree/*`) - Real SaaS multi-tenant Montessori school management

Production: `https://montree.xyz` (migrated from teacherpotato.xyz — old domain returns 405 on API calls)
Deploy: Railway auto-deploys on push to `main`
Git remote: `git@github.com:Tredoux555/whale-class.git` (SSH — Cowork VM key "Cowork VM Feb 15" added Feb 15, 2026; old "Cowork VM" Feb 11 key is stale)
Local path: `/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/whale` (note space in "Master Brain")
**⚠️ Git Push — ALWAYS use Desktop Commander FIRST:** `mcp__Desktop_Commander__start_process` with command `cd ~/Desktop/Master\ Brain/ACTIVE/whale && git push origin main 2>&1` and `timeout_ms: 30000`. Do NOT try Cowork VM SSH keys, GitHub PATs, or `scripts/push-to-github.py` — Desktop Commander on the user's Mac is the only reliable push method.

**⚠️ STANDING RULE (Tredoux, Jun 10 2026): everything runs FROM THE CHAT.** Never tell Tredoux to "open this document/file" for SQL, commands, or instructions — paste the full SQL / command / step directly in the chat message, step by step, like a real assistant walking him through it. Documents are for archives; the chat is the workbench.

**⚠️ STANDING RULE (Tredoux, Jun 14 2026): ALWAYS — ALWAYS — runtime-audit before saying "done".** Lint + `tsc` are necessary but NOT sufficient — they pass while the live feature 400s/500s/breaks. Before declaring any user-facing feature done: exercise the actual happy path (hit the route, render the page, send the message), and make failures DIAGNOSABLE — surface the real server error to the client, never swallow it into a generic "Something went wrong." A green lint is not a working feature.

---

## 🌟 THE NORTH STAR VISION (Tredoux, Jul 3 2026 — PERMANENT, read this before any product decision)

**The long-term product is the app everyone keeps in their pocket: their identity of
themselves.** The thing that knows a person better than they know themselves and helps them
with every facet of life. One day it connects to everything they live with — car navigation,
work, fridge, diet, family — and **Lyf Coach is the seed of that app.** Every product in the
ecosystem (Marriage Counsellor, Relationship Navigator, Family Plan, Montree Home) is an entry
point into the SAME identity + memory, not a separate product. **Trust is the entire asset** —
this only works if people trust it with everything, which is why the privacy architecture
(E2E, sealed rooms, per-person memory with explicit one-way links) is not a feature, it is the
foundation. When prioritizing: features that deepen the memory/identity moat and earn trust
beat features that chase a niche. This is what we are building. Don't lose it between sessions.
---

## 🚪 LYF COACH HAS MOVED OUT — standalone repo (Jun 25 2026)

**The public web Lyf Coach (the individual product) was EXTRACTED from this
monorepo into its own standalone repo + given a dark-gold brand makeover. All Lyf
Coach build work happens THERE now, not here.**

- **Repo:** `~/Desktop/Master Brain/ACTIVE/lyfcoach-web` (own `CLAUDE.md` +
  `docs/handoffs/SESSION_STANDALONE_BUILD.md` + `docs/CUTOVER.md`).
- **Domain:** `lyfcoach.co` · **Host:** Railway · **DB:** its OWN fresh Supabase ·
  **Billing:** its OWN Stripe product. 100% independent — no shared git/DB/Stripe.
- **What's built there:** 8 screens (`/ /login /signup /verify-pending /coach
  /upgrade /settings`) + `/privacy`, the ported coach brain, 5-tier pricing
  (Free $0/Starter $3/Builder $9.99/Pro $20/Unlimited $50) with model-pin metering.
  Build green; **not deployed yet** (needs accounts/DNS per its CUTOVER.md).

**🚨 The in-Montree copy is now LEGACY** — `app/lyf-coach/*`, `app/api/story/coach/*`,
`lib/story/*`, `app/story/*`, `native/Sanctuary|lyf-coach`. It STILL serves
montree.xyz, so **do not delete it until the standalone is live on lyfcoach.co and
DNS has cut over** — then decommission. **Do NOT build new public-coach features in
Montree** — build them in `lyfcoach-web`. The standalone deliberately stripped all
Montree coupling + personal data; don't re-introduce it by editing the Montree copy.

---

## 🌍 SESSION — Jul 8, 2026 (evening, Cowork/Fable directing Opus+Sonnet) — REFERRAL QR CARDS + UNIVERSAL FOUNDING 100 LINK + FOUNDER↔SUPER-ADMIN MESSAGING

**Canonical: `docs/handoffs/SESSION_QR_UNIVERSAL_LINK_FOUNDER_MSG_JUL8.md`. Commits `c6989d40` → `4dcd4f1a` → `17b1a407` (18 files, +2644), all pushed. Migrations 291 + 292 ⏳ PENDING Tredoux's Supabase run (SQL in the handoff §4 — site safe pre-run, both 42703-safe). Follows directly on the Partner Mint Tool session below (same day).**

- **🎴 Referral QR share card (`c6989d40`, generalized `4dcd4f1a`).** FoundingTab "Generate QR code" next to Copy on the mint-result row AND on every waitlist row (`generateQrCard(link, code, key)` + keyed `qrStatusMap` — independent per-row status/revert). Architecture: DESIGNER-MADE static template `public/brand/referral-card-template.png` (1080×1920 "Lanternlight" — forest `#0A1A0F` + gold radial glow + empty cream `#F5EDD8` QR slot) + client canvas compositing (stamp QR via `qrcode` pkg, ecl H, dark-on-cream + letter-spaced gold code caption) → downloads `montree-referral-<CODE>.png`. **🚨 RULE: to change the look, redesign the template PNG — do NOT reintroduce procedural gradient code** (built first, rejected twice by Tredoux as dull, fully replaced). QR scannability cv2-verified.
- **🌍 Universal Founding 100 link (`17b1a407`, migration 291) — the friction-killer for posting ONE link in FB groups / under the father-story cold emails.** `try/instant` `resolveFoundingCode` checks the universal code FIRST (case-insensitive, 42703-safe skip pre-migration): valid+open → `founding_3_life` grant (same shape as single-use FND-) + auto-INSERTs an admitted waitlist row (`source='universal_link'`) so the cap burns down with no manual admit and every redeemer shows up in the Founding tab; full/closed → `{universalFull:true}` → falls through to a normal 7-day trial + `founding_full:true` in the response — **NEVER a dead 400, an old FB post can't break.** 23505 dup-email → grant still applies, row skipped, signup never fails. Cap-check→insert is non-transactional by design (a genuine burst could overshoot by a couple seats — accepted, same risk as manual admits). Founding-beats-referral applies identically. Super-admin PATCH `get_or_create_universal_code` mints idempotent `FND-F100-XXXX` (collision-checked vs ALL waitlist codes). 🌍 card sits at the VERY TOP of FoundingTab (Create/Copy/QR, same Lanternlight compositor).
- **💬 Founder ↔ super-admin messaging (`17b1a407`, migration 292) — "Message Tredoux" channel for founding-member principals.** REUSES the existing `montree_message_threads`/`_thread_participants`/`montree_thread_messages` tables wholesale (zero parallel DM rail) — only the `thread_type` CHECK needed a new value (`principal_super_admin`, drop+recreate preserving all prior values incl. 204's `agent_super_admin`); `created_by_role`/`participant_role`/`sender_role` already permitted `principal`+`super_admin` from 190/204. `school_id` stays MANDATORY populated for this thread type (unlike `agent_super_admin`'s optional NULL) — a founding thread is always the principal's own school. New `lib/montree/agent-super-admin-messaging/principal-access.ts::resolveMessagingPrincipal` enforces `founding_member=true` on EVERY principal route (403 "The direct line to Tredoux is a Founding member benefit" — not just hidden in UI). Principal routes = structural copies of the pre-existing agent↔super-admin trio (IDOR-proof participant+thread_type checks, `messaging-crypto` encryption, clean 503 pre-migration instead of a raw CHECK-constraint 500). Super-admin side: `founding-messages/threads[/threadId]` routes + `FoundingInbox.tsx` (collapsible 💬 inbox inside FoundingTab, per-thread unread, sentinel super-admin identity) + red unread badge on the 🚀 Founding 100 tab (mirrors the Feedback-tab badge pattern). Nav: "Message Tredoux" in admin layout gated on `founding_member` (required exposing that field on `auth/me`'s school select). `last_message_at` bumped by the pre-existing 190 trigger — no manual bump added.
- **Process:** Fable directed only (Tredoux's cardinal rule this session: no Fable grunt work — Sonnet scouts/runs, Opus builds), 2 Opus builds + 2 Opus fresh-eyes audits, both audits zero-fix. All pushes via Desktop Commander. Pre-existing tree dirt (`docs/MONTREE_SOCIAL_PLAYBOOK.md` etc.) untouched.
- **⏳ Owed:** Tredoux runs migrations 291 + 292 (exact SQL in the handoff, paste-in-chat per the standing rule); then verify live: universal-link signup e2e (Premium grant + counter burn-down), cap-closed fallback (no dead 400), founder-messaging round-trip (send → red badge → reply → clears), per-row QR buttons on device (independent status per row). Decide whether the universal link replaces/supplements per-school FND- links in the outreach routine.

---

## 🤝 SESSION — Jul 8, 2026 (Cowork/Fable orchestrating Opus+Sonnet) — PARTNER PROGRAM MINT TOOL SHIPPED + FIRST PARTNER MINTED (Tatenda)

**Canonical: `docs/handoffs/SESSION_PARTNER_MINT_TOOL_JUL8.md`. Commit `337033ec` (12 files), pushed + deployed. Migration 290 RUN (Tredoux confirmed). First partner minted live.**

- **🤝 Partner Program mint tool (super-admin → Founding 100 tab → "Mint a partner package" card).** One form (partner name, email, school name, share % default 20) → ONE `PATCH /api/montree/super-admin/founding {action:'create_partner'}` returns: FND signup link with `grant_type='partner_free_life'` + `<NAME>-XXXX` referral link + agent dashboard login (shown ONCE). Redemption auto-grants **Premium free for LIFE**: `billing_override_usd=0` + permanent `ai_tier_sonnet` via shared `lib/montree/billing/apply-ai-tier.ts` (same grant as schools PATCH `ai_tier:'sonnet'` — the two can never drift; tier-grant failure never fails signup). This is THE standing tool for all underprivileged-school partners — never hand-stitch the 3 calls again. Tredoux ruling: partner share = **20%** (supersedes the Jul-7 10% for this track).
- **Shared libs extracted (both old routes delegate, byte-equivalent):** `lib/montree/referral/create-agent-code.ts` (referral-codes POST), `lib/montree/referral/issue-agent-login.ts` (agents/[id]/login POST), `apply-ai-tier.ts` (schools PATCH). $0 checkout guard: `billing_override_usd===0` → clean 400 before Stripe price resolution (which 500s at ≤0 cents — NEVER remove the guard). Founding-ignores-referral preserved. `grant_type` reads are 42703-safe (pre-migration deploys degrade to founding_3_life).
- **Re-mint semantics (fresh-eyes catches, fixed):** re-running create_partner on an existing email is CORRECTIVE (updates pending referral pct + waitlist names; already-redeemed schools keep locked-in pct by design). If the email's code was ALREADY REDEEMED, the grant is applied DIRECTLY to the existing school and `signup_link:null` + note is returned — never a dead link as success.
- **🥇 FIRST PARTNER MINTED (live, verified):** Tatenda / tatenda@montessorionwheels.org / "Montessori on Wheels". signup `FND-9HXQH9`, referral `TATENDA-8VA6` @20%, agent_id `fef4ed1c-5ab6-41bf-9205-493d5ebf069e`, login code `8EWWUJ` (delivered to Tredoux; if lost, reissue via Referrals tab 🔑). Not yet redeemed. Commission auto-tracking only populates from Stripe `invoice.paid` → `montree_finance_transactions`; off-platform billing needs manual tracking.
- **🚨 Migration 269 working-tree corruption RESOLVED:** the gutted `269_lyf_coach_billing.sql` (Jul-6 open item) had been overwritten with env content incl. real-looking `STORY_JWT_SECRET` + `STORY_DIARY_KEY` — restored via `git checkout --`, never committed. **⏳ Tredoux owes: rotate those two Story secrets.**

---

## 🏁 SESSION — Jul 7, 2026 (evening, Cowork/Fable orchestrating Sonnet/Opus) — FB SWEEP COMPLETE (3,035 verified pages) + CAMPAIGN DAY 2 + 🛠 outreach-status.py CLI (browser status-flipping is DEAD)

**Canonical: `docs/handoffs/SESSION_FB_SWEEP2_CAMPAIGN_DAY2_JUL7.md`. Commits `778731a3` (CLI tool) + `797c2770` (sweep data + handoff), pushed. Migration 288 RUN (Tredoux confirmed). No other migrations.**

- **📘 FB SWEEP DONE:** 430 leftovers swept (8 Sonnet batches, 325 found, 77%) + ALL 346 medium-confidence URLs verified (7 Sonnet batches: 313 ok / 8 fixed / 21 failed) → `global-social-merged.csv` = **3,263 rows, 3,035 verified facebook_urls**, re-imported to the 🌍 tab. `social-merge.py` now globs `global-leftover-*.csv` + applies `verify-medium-*.csv` as a FINAL OVERRIDE layer (FIX replaces url, FAIL blanks it — don't "simplify" that away). Only remaining sweep work (optional, low priority): FB for schools that already have emails.
- **🛠 `scripts/outreach-status.py` (Opus-built) — outreach status updates are now CLI-over-HTTPS, NEVER Chrome-driven.** find / set-status / set-social / counts, single or bulk CSV, runs on the Mac (cwd=repo, SUPER_ADMIN_PASSWORD from .env.local), works when the pooler is GFW/VPN-blocked (montree.xyz API). Gotchas: super-admin login rate-limit 5/15min fail-closed (token cached /tmp — don't hammer), Cloudflare 403s default urllib UA (script sends browser UA), **campaign-manager PATCH 500s AFTER a successful write** (outreach_log insert bug — script verifies by re-read; the UI shares the bug, fix owed), `counts` caps at 1,000 rows (pagination fix owed). Sonnet operates it from any session.
- **📮 Campaign day 2:** 29 drafts (9 day-2 disadvantaged father-story + 16 multiplier bounce-recovery re-sends + 4 mangled-link warm drafts recreated clean; Ireland as thread follow-up — only dedup hit of 25). Statuses flipped via the CLI (17 day-1→sent, Zama→bounced, 20→drafted). **⚠️ Tredoux sent ~50 on Jul 7 (over the 20/day cap — the whole draft queue went same-day). Recovery: Jul 8 zero cold sends, Jul 9 back to 15-20. 🚨 RULE: never queue more Gmail drafts than the daily send cap.** Discard owed in Gmail: 4 old mangled drafts (Remuera, I Cube, Norge, Meraki) + **Montessori Ed Ireland + FEMCO Colombia (DB says dead/declined — drafted before the check)**. FAMM: Tredoux sent it himself, dealt with. Not in DB at all: Sustainable Coffee Bay, AMITOMO JP, montessoricolombia.org. Gmail Jul 7: no real replies; **Otari's Clifford STILL on sabbatical** (Susan West acting — the morning session's "back from sabbatical" intel was wrong); auto-acks Lumin + Lions Gate = delivery healthy; bounces only the 2 dead addresses (zamamont@, info@lovetrust — erik@ re-send delivered).
- **Deliverability truth (told to Tredoux): inbox-vs-spam is unobservable.** Proxies: auto-replies = delivered; watch DELAYED soft-bounces 24h after a big send; mail-tester.com for content scoring; personal Gmail has no Postmaster Tools; the cousin sending domain stays the real scale fix.
- **🏁 END OF SESSION:** Tredoux confirmed he sent ALL ~50 queued drafts Jul 7 — the mangled-link duplicates + the Ireland/FEMCO "discard owed" drafts went out too (harmless; treat any reply as a revived lead). **New standing orders locked in** (commit `6de09a4c`): 50 drafts/day, weekly follow-up cycle with a 3-strikes "keep or kill" valve, comb Gmail daily, status flips only via `scripts/outreach-status.py`. **`daily-campaign-sweep` scheduled task is LIVE** (07:07 daily, Cowork must be open) handling the sweep/draft/flip cycle going forward. Jul 8 = zero cold sends (recovery); Jul 9 = back to normal.

---

## 📘 SESSION — Jul 7, 2026 (afternoon, Cowork/Fable) — FACEBOOK PIVOT: GLOBAL FB SWEEP (2,719 pages in ONE session) + SOCIAL TRACKER LIVE + 12 WARM/FAMM DRAFTS + BOUNCE RECOVERY

**Canonical: `docs/handoffs/SESSION_FB_SWEEP_WARMLEADS_JUL7.md` (incl. session-2 resume prompt + bounce
tables + pipeline rules). Commits `294fac99` → `39743daf` → `a028edd3` → `a83c4711` (+ by-country collapse),
pushed. Migration 289 RUN by Tredoux (confirmed).**

- **🎯 STRATEGY PIVOT (Tredoux): FACEBOOK is now the PRIMARY outreach channel** — one platform for
  communication + social boost; email runs in parallel; video promos deprioritized. Disadvantaged schools
  FIRST (build the base), then up the list. **FB pacing rule: 20–30 invites/day from the Montree page,
  varied text, no links in message 1.**
- **📘 FB harvest (one session): 2,719 schools with facebook_url** (2,926 with any social) =
  38 disadvantaged (2 Sonnet agents) + ~958 no-email/no-website rows fully swept (31 Sonnet batches, 53%)
  + 1,906 from the **zero-AI script pass** (`scripts/social-script-pass.py` crawled all 4,564 websited rows
  on the Mac). Merged import file: `docs/outreach/social/global-social-merged.csv`
  (`scripts/social-merge.py` regenerates). **Pipeline RULES: Sonnet batches of 55, launch groups of 4 (8 at
  once = server burst-limit killed 7), judge from search snippets (never fetch facebook.com), agents reply
  counts-only.**
- **🛠 Social tracker LIVE (migration 289 RUN):** social URL columns + `social_status` ladder
  (found→invited→messaged→replied→connected/dead) on `montree_outreach_contacts`; `set_social` PATCH +
  `social_counts` view; **`social_enrich`** import path (UPDATES existing rows by org_name+country — the
  🌍 CSV import auto-detects the discovery header; bulk_import can NOT enrich, it upserts on id);
  📘 Social view + 🤲 Disadvantaged filter + 🌏 by-country collapsed by default in `GlobalOutreachTab`.
  **Email status and social status are independent axes — never merge them.**
- **📧 12 Fable-written Gmail drafts** (warm-lead revival + FAMM): FAMM founding-cohort offer (⚠️ Apr-19
  email promised FAMM **20% for life**; new track pays 10% — **Tredoux must decide before FAMM signs
  anyone**; draft kept it vague), Love Trust re-send to bounce-recovered **erik@lovetrust.co.za** (CEO),
  Cambridge MG, Paint Pots, Copenhagen, Lions Gate (**Canada** not USA), Otari (Clifford back from
  sabbatical), Norge, I Cube, Meraki, Remuera, Prerana. Montessori CH = DEAD (declined May 10). Zama =
  phone-only 083 403 8203. **⚠️ The morning-batch drafts may carry a mangled google-redirect montree.xyz
  link (found in the Love Trust copy) — check before sending.** 20/day cap: cold 20 + FAMM + Love Trust
  day 1, the 10 thread-replies day 2.
- **📮 Bounce recovery (Opus, MX-verified, seen-on-page):** 16/21 multiplier orgs + ~55 schools recovered —
  full tables in handoff §4 (DMG, MSCA, AME Spain, AMCHI Chile, both AMI Korea bodies, FEMCO, AMITOMO JP,
  IEMMP PT, IMA PL, Brussels, MMI UK→mariamontessori.org…). Rose House UK = CLOSED, QAIS = DEFUNCT.
- **⏳ Session 2 (resume prompt in handoff §6):** ~440 agent-searchable FB leftovers + medium-confidence
  verification pass + re-merge/import · Gmail reply/bounce sweep + day-2 disadvantaged drafts + multiplier
  re-sends · migration 288 check · FAMM commission decision · verify enrich-import completed + invite
  tracking started.

---

## 🌱 SESSION — Jul 7, 2026 (Cowork/Fable orchestrating) — CAMPAIGN DAY 1: DISADVANTAGED FOUNDING WAVE (20 drafts) + AD-GEO ATTRIBUTION + 🗺 GEO MATCH

**Canonical: `docs/handoffs/SESSION_DISADVANTAGED_WAVE_ADGEO_JUL7.md` (incl. resume prompt) +
`docs/outreach/campaign-log/2026-07-07.md` (batch table). Commits `fc0ab19b` → `1b8ebc31` → `952c0e91`, pushed.**

- **🎯 STRATEGY PIVOT (Tredoux): disadvantaged wave FIRST** — supersedes SA as day 1 (SA still gated on
  Hook 11). Offer: **Premium free for LIFE**, cohort **cap 15 admits**, onboarding window **→ 19 July**,
  **+10% monthly commission** per school a partner signs up. **🚨 Commission ruling (Tredoux, explicit):
  deliberately overrides the Jul-6 "no commission ever" rule for THIS person-to-person track ONLY** —
  private offer to chosen partners, public site stays commission-free; agent infra hidden-not-deleted;
  commission runs MANUALLY via super-admin until a partner actually signs someone.
- **🚨 Canonical disadvantaged template = Tredoux's own father-story email** (father's 30km school →
  government drained the funds — the corruption line STAYS, his call twice: it's a bonding moment with
  this audience) + 10% commission line + full personal contact block (WhatsApp first). Umbrella orgs get
  "Your **schools** get". This track does NOT use the global default email. Full text = the Gmail drafts.
- **📮 20 drafts created** (19 schools: 4×SA, KE, TZ, SZ, HT, GT, DO, MX, UA, AU, PR, 5×US + 1 EsF
  partnership letter → info@montessori-esf.org, covers the 3 Kenya EsF programs sharing it; EsF touches
  20/80 rows = the AMI top-cover play). Pipeline: Sonnet prepped → **Fable ran Gmail dedup itself**
  (sub-agents can't see Gmail tools) → Opus batch review (fixes applied) → drafts. **🚨 Dedup rule
  learned: gmail/webmail/yahoo recipients need `to:FULL-ADDRESS in:sent`, never to:DOMAIN.** Excluded:
  FAMM (live thread — owes tailored follow-up), MMI (dup Apr 10+19), Bambini (MX_DEAD). Day-2 queue ~10.
- **Pool numbers:** ~91 unique disadvantaged (80 list + ~11 Africa-CSV extras), **34 emailable**,
  **~57 no-email → Sonnet enrichment pass is the next lever**. 🌍 tab shows 75 (import dedup).
- **🛠 Ad-geo attribution (`fc0ab19b`, sacred flow):** UTM capture + first-touch `montree_attrib` cookie
  (90d) + attribution stamp on schools at BOTH signup routes (fire-and-forget, 42703-safe) + cf-ipcountry
  preferred + 🎯 Funnel view (country × source → visits/signups/trials). **⏳ MIGRATION 288 PENDING
  Tredoux run** (additive; site safe pre-run). **RULE: every FB ad URL carries utm_source — else ad
  traffic is indistinguishable from the 4,223 cold-email clicks.**
- **🛠 🗺 Geo Match (`1b8ebc31`, sacred flow):** Visitors tab → 🗺 pill — visitor towns ranked by visits,
  laid against the outreach list per country, 🔥 warm (visit after sent_date) + 📍 town-hot badges.
  **Rulings: country-level join only (ip-api city = ISP city → city is a soft badge, never a filter);
  country_code→label map ~25 countries; contacts paginated (fresh-eyes caught USA 3,198 rows silently
  truncating at the 1000 default — the sacred flow's catch of the day).** No migration.
- **⏳ Owed:** migration 288 · Tredoux sends the 20 · status flips to `drafted` (pooler GFW-blocked —
  Chrome-drive the 🌍 tab) · day-2 drafts · 57-row enrichment · FAMM follow-up · follow-ups due ~Jul 12/17
  (before the Jul 19 window) · verify 🎯/🗺 live.

---

## 🏁 SESSION — Jul 6, 2026 (Cowork/Fable, night) — GLOBAL OUTREACH SESSION 3 OF 3: USA 3,198 + AFRICA + CONSOLIDATION + 🌍 SUPER-ADMIN TAB — PROGRAM COMPLETE

**Canonical: `docs/handoffs/HANDOFF_GLOBAL_OUTREACH_SCRAPE.md` §Session 3 (incl. the CAMPAIGN MANAGER — READY
TO DRAFT runbook) + `docs/outreach/OUTREACH_MASTER_TRACKER.md` (final status table). Tab build plan:
`docs/handoffs/PLAN_GLOBAL_OUTREACH_TAB_JUL6.md`.**

- **🏁 FINAL NUMBERS: 7,366 schools · 67 countries · 4,446 unique emails · 4,223 draft-ready · 80 disadvantaged.**
  Master: `docs/outreach/Montree_Global_Master_Jul2026.xlsx` (4 sheets, formulas recalc'd clean) + single-file
  `.csv` twin (the 🌍-tab import file). Old Montree_Master_Outreach.xlsx untouched (history only).
- **USA 3,198 / 2,340✉️ (73%):** montessoricensus.org ships its ENTIRE census inline in the homepage map JS
  (3,198 markers). Zero-token sandbox pipeline: all 3,198 detail pages (63% leader-email hit) + 754 school-site
  crawls (+327). **AMS directory carries NO emails structurally** — deprioritized (sample kept).
- **Africa 196 / ~97✉️ (~20 countries, 3 Sonnet agents)** + **disadvantaged 68→80** (Eswatini + Ukraine retries
  hit; EsF pages turned out directly fetchable). MX: 1,549 new domains, 4 dead. +105 PRIOR_CONTACT (209 total).
- **🌍 Global Outreach super-admin tab BUILT + reviewed** (sacred rule; Opus audit caught the page.tsx `valid[]`
  5th wiring point + the duplicate-182-migration trap; fresh-eyes fixed the 'Unknown'-country dead-end filter).
  New: migration 287 (adds `disadvantaged_school` to contact_type CHECK), `global-outreach/route.ts` (GET
  by_country/contacts/export, default scope `batch_tag='global-scrape-jul2026'`), `GlobalOutreachTab.tsx`
  (client-side CSV import → EXISTING outreach `bulk_import`; status flow → EXISTING campaign-manager PATCH).
  **🚨 Standalone Docker build does NOT ship `docs/` → repo CSVs are unreadable at runtime; import is client
  upload by design — don't "fix" it into a server disk read.** ESLint 0/0, tsc clean.
- **✅ CLOSED SAME NIGHT (Jul 7 00:30):** migration 287 RUN + master CSV IMPORTED live — 6,852 inserted /
  103 DB-dups / 0 errors (exact match to prediction), tab shows 6,852 · 4,343✉️ · 67 countries · 75
  disadvantaged. **NEW DEFAULT COLD EMAIL APPROVED** (Tredoux) — full text in handoff §✅ STATE AS OF JUL 7:
  photo-hook opener → teacher-founder para → the driving-force line as the CLOSER (not opener) → Founding-100
  offer line. Supersedes the sacred email as default (sacred kept below for reference). **Volume: 20/day from
  tredoux555@gmail.com; ramp to 50 only after the cousin sending domain (Tredoux, this week — NEVER cold-send
  from montree.xyz, it carries parent-report reputation) + bounces <3%.** SA wave = its own homecoming email,
  gated on Hook 11 YouTube upload (Tredoux, Jul 7). Statuses per session: pooler → Chrome-extension-drive the
  🌍 tab → manual flip list. Next session: "campaign day 1" → verify Hook 11 up → draft the ~32 SA founding
  batch.
- **Repo hygiene:** stray root tsconfig temp files (tsconfig.scope*.json, tsconfig.reviewtmp*.json — sandbox
  can't unlink) are gitignored; delete via Desktop Commander when convenient.

---

## 🌍 SESSION — Jul 6, 2026 (Cowork/Fable, evening) — GLOBAL OUTREACH SCRAPE sessions 1+2 of 3 + CLAUDE.MD ARCHIVED (1MB→147KB)

**Canonical: `docs/outreach/OUTREACH_MASTER_TRACKER.md` (status + session-3 queue + source intel) + `docs/handoffs/HANDOFF_GLOBAL_OUTREACH_SCRAPE.md`. No code, no migrations — data + docs only.**

- **Sessions 1+2 (same day): 17 country lists, ~3,740 schools, ~2,200 verified emails, every domain MX-checked (dead → `MX_DEAD` in Notes; prior-campaign overlaps → `PRIOR_CONTACT` in Notes).** S1: UK 71 · Germany 501 · Netherlands 214 · AU+NZ 532 · Canada 201 · Italy 303 + Ireland/UAE/disadvantaged waves. S2 (8 parallel Sonnet agents): France 240 (238✉️, lesdecliques.com directory w/ Cloudflare-email decode; AMF annuaire is login-walled, confirmed) · Spain 100 (74✉️) · Japan 1,122 (all 47 prefectures via montessori.style post-sitemap.xml; email-thin — JP form culture, structural) · Korea 52 (registries publish no email) · India 98 (97✉️, quality-capped) · LatAm 171 (MX/BR/AR/CL/CO/PE — needs email-enrichment pass) · Ireland→81 · UAE→59 · disadvantaged side-list→68 (~33 countries). CSVs in `docs/outreach/<country>/`. 🚨 Spain catch: Madrid Montessori's REAL email = info@madridmontessori.org (the Apr-2026 bounce was .es — different domain, not actually dead).
- **🚨 CLAUDE.MD ARCHIVED (this file): 1MB/267K-tokens → 147KB/38K.** Apr 23–Jun 24 session blocks moved verbatim to `docs/CLAUDE_MD_HISTORY.md`; standing sections kept. Reason: sub-agents get CLAUDE.md injected at boot — at 1MB every agent burned ~460K tokens before working, and Sonnet workers (200K window) couldn't run at all. **RULE: keep CLAUDE.md lean — archive session blocks monthly to the history file.**
- **🚨 RULE — outreach sub-agents run `model:"sonnet"`** (Fable orchestrates only), **cap ~5 concurrent** (s2 ran 8 on one sandbox → constant bash "process already running" contention; WebSearch/web_fetch fallback still delivered). List rules: emails only when SEEN (never constructed — decoding Cloudflare `/cdn-cgi/l/email-protection` counts as SEEN, it's on the page); agent-written CSVs must QUOTE comma-containing fields + be width-validated with python csv before any bulk in-place rewrite (s2: 6 unquoted-comma rows, one killed a rewrite mid-stream — always .tmp + os.replace); MX-check via dig (zero AI); Gmail `to:DOMAIN in:sent` dedup stays mandatory at draft time; NEVER auto-send.
- **NEXT (session 3 of 3, fresh session — resume prompt in the handoff):** USA state-by-state (AMS + montessoricensus.org, CA/TX/FL/NY first) + Africa sweep + final email-dedup across all CSVs into the master xlsx + 🌍 super-admin Global Outreach tab (spec in handoff) → Campaign Manager drafting.

---

## 🚀 SESSION — Jul 6, 2026 (Cowork/Fable orchestrating Opus builders) — LAUNCH PRICING RESTRUCTURE: 7-day Premium trial + Starter $3 / Premium $7 + abuse lock + Founding 100 codes + landing/pricing rebuild

**Canonical plan (read FIRST before touching tiers/pricing): `docs/handoffs/PLAN_LAUNCH_PRICING_JUL6.md` — contains
the LOCKED business-model table + 11 post-audit amendments. Built via sacred rule (review thinking → build →
review build): Fable planned, 1 Opus plan-auditor (3 CRIT catches pre-build), 3 parallel Opus builders, 3 Opus
fresh-eyes reviewers (2 real bugs caught+fixed), Fable personal polish pass on the public pages.
🚨 Migration 286 MUST run in Supabase BEFORE this deploys (resolve-model selects `locked_at`; fail-closed catch
would 402 every school). 🚨 Env needed: `STRIPE_PRICE_STARTER` ($3 Stripe price ID) in Railway.**

- **🎛 THE LOCKED MODEL (do NOT re-litigate):** Trial = **7 days of full Premium (Sonnet)**, no card → then they
  CHOOSE (they've tasted Premium). **Starter $3**/student/mo = Haiku ALL the way through (reports, photo ID —
  NEVER falls back to Sonnet, Guru, Astra). **Premium $7** = Sonnet reports + Sonnet photo fallback + Sonnet
  Guru/Astra (base photo pipeline stays Haiku by design). **Founding 100** = apply BY EMAIL (mailto on homepage +
  /pricing) → Tredoux admits in super-admin → generates FND-XXXXXX signup link → school gets 1 month Premium
  free + `founding_member=true` + `billing_override_usd=3` → **Premium at $3 for life**.
- **resolve-model.ts rewrite:** locked_at→free FIRST, then sonnet flag, haiku flag, then trialing 3-way
  (trial_ends_at future→**sonnet**, past→**free** (the decision point — all AI routes 402 with UpgradeCard),
  NULL→haiku legacy floor), active→haiku floor, else free. **Trial expiry is now ENFORCED** (was: trialing =
  AI forever). Existing schools with expired trials will start 402-ing — intended.
- **Guru/Astra tier wiring:** guru route now forces guruTier from school tier for `auth.role` teacher/principal
  (homeschool_parent freemium block byte-identical — NEVER key tier decisions on the body `role`); structured
  (non-conversational) path model fixed too; GuruChatThread renders UpgradeCard on 402. Astra + admin/guru/chat
  = Sonnet only on sonnet tier, else Haiku (stale dated model pins removed). Photo process/sonnet-review/
  photo-insight gates derive from `resolveReportModel().tier==='sonnet'` (raw flag reads removed) so Premium
  TRIALS get the Sonnet fallback.
- **Billing:** `STARTER_PRICE_USD=3` constants; `setSchoolAiTier` gained `'haiku'` target ($50/soft_limit);
  checkout accepts `plan: starter|premium` (founding forced premium) + stamps `subscription_data.metadata.
  montree_plan`; webhook reads metadata FIRST, then trialing→premium, then legacy-300¢-not-founding→haiku;
  billing page = two-card plan chooser + trial countdown + founding card. Alipay/manual Starter = override $3.
- **🚫 Abuse lock (migration 286):** `montree_schools.locked_at/locked_reason`. Super-admin SchoolsTab 🚫/🔓 +
  PATCH (audit-logged). Locked school: login 403s (ALL roles incl. parents) → `/montree/locked` (public, dark
  forest) → appeal form → `feedback_type='appeal'` (🚫 red in FeedbackTab). auth/me returns `locked` → admin
  layout + dashboard bounce. resolve-model kills AI. Cookie-holders keep non-AI reads until expiry (documented).
- **Signup hardening:** try/instant rate limit 5/hour/IP (fail-open) + honeypot `website` field.
- **Founding codes:** super-admin founding PATCH `generate_code` (admitted only, idempotent — never rotates,
  concurrency-safe via `.select()` check), FoundingTab 🔗 Generate link → `montree.xyz/montree/try?founding=FND-…`,
  try/instant validates BEFORE writes, atomic redeem, **valid founding code IGNORES referral code entirely**,
  30-day trial stamped. Waitlist columns: signup_code UNIQUE, code_generated_at, redeemed_by_school_id/at.
- **Public pages (Fable's hands):** landing nav = Library/Explainer/Pricing (+About/Login; ambassador link GONE,
  become-an-agent + for-teachers now redirect to /montree — **no more ambassadors/commission, ever**); hero =
  large gold M (`/brand/m-mark-480.webp`, 56KB, true 480/394 aspect) in a breathing halo (::before glow layer
  only — the M itself NEVER dims; prefers-reduced-motion honored); pricing section id="pricing" (Starter/Premium
  cards, Premium gold-featured, hover lift, 18 new `landing.pricing.*` keys × 12 locales, customer-language
  bullets — "Unlimited photo recognition", never "escalates"); FoundingHundred = counter + gold apply-by-email
  CTA (mailto tredoux555@gmail.com w/ template), no more form/6-months copy; footer link row. /pricing FULL
  dark-forest rebuild: gold M hero, gold trial line, two cards + live 5–60 slider (both totals), founding strip,
  7-item FAQ, hardcoded English. i18n 12/12 (5129 keys), 0 lint errors (25 pre-existing warnings).
- **⏳ Excluded from commit (pre-existing dirt, NOT ours):** `docs/MONTREE_SOCIAL_PLAYBOOK.md` (+50 punchlines,
  uncommitted Jul-1 work), `migrations/269_lyf_coach_billing.sql` (gutted in working tree — investigate),
  untracked strays (.diag.mjs, coach_uploads.patch, social/, docs/photo-id/, lyf-coach-*.md, tsc-docs.tmp.json).
- **✅ Verify after deploy:** montree.xyz hero M + pricing section + founding email CTA; /pricing renders;
  locked flow end-to-end (lock a test school → login → /montree/locked → appeal lands in Feedback tab);
  founding link (generate → signup → override + 30d verified in DB); trial school gets Sonnet (photo fallback
  fires); expired-trial school 402s with upgrade card; Starter checkout (needs STRIPE_PRICE_STARTER env).

**AFTERNOON (same day) — MIGRATION 286 RUN ✅ + DEPLOYED + RUNTIME-VERIFIED LIVE + SOCIAL LAUNCH EXECUTED + FOUNDING MINT TOOL:**
- **Migration 286 RUN in Supabase (verified: locked_at + founding_member columns present) → pushed
  `7d6a9682` → runtime audit LIVE:** landing (gold M hero, pricing section, founding email CTA, ambassador
  gone), /pricing full rebuild, /montree/locked renders, become-an-agent 302→/montree. First fetches may
  serve stale edge cache — cache-bust to verify.
- **🚀 SOCIAL LAUNCH DONE (Claude-in-Chrome drove, Tredoux pressed Post):** Facebook Reel LIVE on the
  Montree page (facebook.com/montreexyz — FB converts uploads to Reels; caption got TRUNCATED at the top
  during conversion, caught + re-pasted before publish 🚨 lesson: always scroll caption to top before
  publishing a converted Reel). Instagram Reel LIVE (@montreexyz). X post LIVE (@Tredoux555, personal —
  no brand X account, founder-voice by design). LinkedIn post LIVE (personal profile, full founder story;
  🚨 lesson: LinkedIn removes media buttons while a LINK PREVIEW CARD is attached — kill the card (✕) and
  the buttons return; post carries EITHER link card OR video, never both). 🚨 lesson: Escape key in IG's
  composer = "Discard post?" dialog (FB's composer uses Escape to close hashtag dropdowns — do NOT carry
  the habit over). Hook 11 (60s) = launch film everywhere; Short Hook (8s teaser) = day-2/3 follow-up beat.
  Hashtag set: #Montessori #MontessoriTeacher #EarlyChildhoodEducation #EdTech (≤4 on FB per playbook).
- **Profile rebrand:** Montree FB page avatar → gold M (montree-avatar-1024.png from Desktop Social Media
  Pack — pack is already gold-M, rebranded Jul 3). IG avatar → gold M + new bio ("The AI Montessori
  classroom 🌱 / One photo → observation → parent report / Built by a Montessori teacher · montree.xyz").
  Tredoux personal FB: Work = Founder at Montree, Beijing (⚠️ saved TWICE — duplicate Founder entry needs
  one delete; extension disconnected mid-save). ⏳ Still owed: personal FB photo+bio, LinkedIn avatar (old
  teal M), IG website link (phone app only), FB cover (gold design at `_video_assets/fb-cover.html`,
  render via headless Chrome), FB group shares (2-3/day from PERSONAL profile — pages can't post to
  groups; vary text; don't blast — spam filter), 0-view FB library rows are GROUP CROSSPOSTS + expired
  stories, NOT failures — do not delete (deleting pulls the video from those groups).
- **Founding mint tool (commit `1e470109`):** super-admin founding route gained PATCH `create_admitted` —
  school name + email → admitted row + FND- code in ONE shot (idempotent on admitted-email duplicates,
  409 on other duplicates, retries code collisions). FoundingTab: gold "Mint a founding link" card at TOP
  (primary launch workflow — schools apply by EMAIL, no waitlist row exists to admit). Super-admin tab
  strip reordered: 🚀 Founding 100 FIRST, daily drivers next, diagnostics last. **First founding code
  minted via DB: `FND-E7QSCX`** (placeholder row "Founding School #1", founding-001@montree.xyz — reassign
  when used). Link: montree.xyz/montree/try?founding=FND-E7QSCX.
- **🇿🇦 NEXT PORT OF CALL — SA FOUNDING OUTREACH. Canonical brief:
  `docs/handoffs/HANDOFF_SA_FOUNDING_OUTREACH_JUL6.md`.** 147 SA Montessori schools (ALL with emails,
  SAMA membership tiers) secured at `docs/outreach/south-africa/`. Batch 1 = ~32 Full/Conditional-Full
  members. Email = homecoming founder story + YouTube link (🚨 Hook 11 NOT on YouTube yet — upload first)
  + reply-to-claim founding place → mint per-school links on reply. Gmail drafts 50/day, MANDATORY
  per-recipient `to:DOMAIN in:sent` dedup, Tredoux sends manually — NEVER auto-send.

---

## 🩹 SESSION — Jul 5, 2026 (Cowork, night) — PARENT-PORTAL SAFE-AREA + BROWN STAIR REVERT (owed) + CLOSING-SCREEN VIDEO

**Short continuation after the evening session below. Handoff: `docs/handoffs/SESSION_PARENT_SAFEAREA_CLOSING_SCREEN_JUL5.md`.
One commit on main (`07ba2f01`), pushed via Desktop Commander (HEAD == origin/main). No migrations, no env vars.**

- **✅ Parent portal safe-area (`07ba2f01`).** iPhone screenshot showed the parent sticky headers rendering
  flush to y=0 → "Montree" wordmark collided with the iOS status-bar clock/notch. Added
  `paddingTop: env(safe-area-inset-top)` (composed with existing padding) to the top bar on **7 parent pages**:
  `parent/dashboard`, `parent/report/[reportId]`, `parent/appointments`, `parent/messages`,
  `parent/messages/[threadId]`, `parent/milestones`, `parent/photos`. Pure CSS. **🚨 RULE: every NEW
  fixed/sticky top bar in the parent portal MUST carry `env(safe-area-inset-top)` — now the posture across
  all three surfaces (teacher/principal/parent already had it).**
- **⏳ OWED — Brown Stair photo revert (DATA ONLY, no code).** One Brown Stair photo in the newest school was
  misID'd as Cylinder Blocks at capture, teacher-corrected → now `teacher_confirmed=true` and gone from Wrap
  Up. Tredoux wants it back in the **Confirm** queue as an *AI-diagnosed Brown Stair* to screen-record
  confirm → parent-report. **Blocked: Supabase unreachable all session (GFW — sandbox + Mac pooler both time
  out); web SQL Editor works.** Full copy-paste SQL (verify + revert) is in the handoff §2 — the revert sets
  `work_id=NULL` + `identification_status='haiku_drafted'` + rewrites `sonnet_draft.proposed_name='Brown Stair'`
  so it lands in Confirm regardless of the stale confidence cache. Tredoux runs it in the Supabase dashboard.
- **🎬 Closing-screen loop video (marketing, not code).** Built the hook-video outro off a "claude design" PNG.
  Final: gold **rim-glow that only breathes (opacity, box-shadow hugging the tile edge — NOT a scaling blob)**,
  QR dropped for mystique, `montree.xyz` as a quiet italic-serif gold footer above the dot. Rendered a **6s
  seamless-loop 1080×1920 24fps H.264 MP4** (glow on a cosine so t=0==t=6, no loop seam). **Saved to
  `montree/_video_assets/closing-screen/`** (mp4 + preview png + editable html + the design png it renders over;
  `.mp4` is gitignored so it lives local only). Hook line chosen: **"Do you know what you just saw?"** (2nd
  person beats "Who knows…" for a scroll-stopper). Re-render = edit the html + headless-Chrome/ffmpeg recipe
  in the handoff.

---

## 🚨 SESSION — Jul 5, 2026 (Cowork, evening) — REPORTS SURFACE SPLIT + CURRENT-WEEK GUARD RAIL + **REPLAN SHELF INTEGRITY (the big one)** + SYSTEMWIDE HEALTH CHECK

**Canonical handoff: `docs/handoffs/SESSION_REPORTS_SHELF_GUARDRAIL_HEALTHCHECK_JUL5.md`. 5 commits on main
(`0919cf24` → `5e96f48c` → `a63f4eb2` → `d61ea911` → `819c297f`), all pushed via Desktop Commander
(HEAD == origin/main, tree clean apart from the 2 pre-existing unrelated files). No migrations, no env vars.**
The replan rewrite got an independent fresh-eyes subagent audit before shipping (real classroom data). Session
closed with a full systemwide health check (3 parallel deep-audits + mechanical gates) → **🟢 healthy**.

- **📋 Reports surface split (`0919cf24`) — AMENDS the Jul-5 "don't re-add a report tab to photo-audit" rule.**
  Teacher Review was wrongly showing inside the **Parents** tab. Now: **Wrap Up (photo-audit)** has a **Teacher
  Review** tab right after Confirm (re-activated the dormant `weekly_wrap` ZONE_TAB, renders `<WeeklyWrapTab
  view="teacher">` — teacher-only review, NO parent send; reuses the `weeklyWrap.teacherReview` key, no i18n
  churn); **Parents › Reports** renders `<WeeklyWrapTab view="parents">` (parent preview + SEND only, sub-toggle
  gone). **🚨 RULE (refines Jul-5): the `view` prop is load-bearing — Teacher Review VIEW lives in Wrap Up
  (`view="teacher"`), parent-report generate+SEND stays in Parents (`view="parents"`). Don't collapse them back
  into one toggled tab.** Same commit: **classroomId self-heal** — `WeeklyWrapTab` fetch/generate/send used the
  raw `classroomId` prop, which Parents passes as `codes[0]?.classroom_id || ''` (empty before codes load) →
  silent no-op. Now `effectiveClassroomId = classroomId || getSession()?.classroom?.id || ''` everywhere +
  diagnosable error instead of silent return (the "self-heals" comment was a lie; now true).
- **🔀 Parents tab reorder (`5e96f48c`).** Pills = **Reports · Chats · Codes** (was Codes · Reports · Chats).
  Default landing stays `'codes'` on purpose (opening on Reports would show `homeschool_parent` logins — who have
  `canManageReports=false` — a broken empty grid). One-liner to flip if wanted.
- **🗓 Current-week guard rail (`a63f4eb2`) — the "report shows last week / today's photos missing" scare was a
  TIMEZONE BUG, not a data bug.** `getCurrentMonday()` serializes local-Monday-midnight via `toISOString()`
  (**UTC**); for UTC+8 (China — the whole outreach market) local Monday 00:00 = the previous day in UTC, so the
  week key shifts back a day and on Sundays *today* is pushed out of "this week" (`captured_at <= week_end` drops
  today's photos). Guard rail (client-only): when `weekEnd < local-today` a dismissible gold banner
  (`weeklyWrap.laterWeekBanner`) offers **Go to this week →** (`weeklyWrap.goToCurrentWeek`), jumping in the app's
  OWN week serialization to the week containing today. 2 new i18n keys ×12 (en+zh real, English fallback for 10).
  **🚨 DEFERRED — the real cure:** guard rail is the safety net, NOT the fix. The deep fix is a coordinated
  timezone-correct week calc across all **8 `getCurrentMonday` sites** (route through `lib/montree/school-time.ts`,
  rule #228) — shares DB week keys, must be done all-at-once + tested. Owed.
- **🪜🚨 REPLAN SHELF INTEGRITY (`d61ea911`) — THE BIG ONE. `lib/montree/reports/replan-child.ts` fully rewritten
  (−215 net lines).** A brand-new child's hand-set starter shelf jumped to random advanced works on Weekly Wrap
  and re-rolled to a DIFFERENT advanced set every regenerate with nothing logged ("jack in the box"). Root cause:
  the Stage-0 replan ran for EVERY child on EVERY wrap and (1) **wiped the whole shelf** (`delete`), (2) refilled
  from a **temperature-1.0 LLM** prompted "forward progression is mandatory… DO NOT repeat previous works", (3)
  used **`Math.random()`** gap-fill — advancement driven by calendar + dice, the opposite of Montessori. Fix:
  **NEVER wipes, NEVER lets an LLM pick works — fully deterministic + mastery-driven.** Per area: KEEP a
  non-mastered work untouched; only a `mastered` slot advances to the next un-touched work in curriculum
  `sequence`; empty areas seed the first un-touched work by sequence (mirrors `advance-shelf-after-mastery.ts` +
  `seed-recommended-work.ts`). LLM is used ONLY for the warm nudge text, `temperature:0`, AFTER the shelf is
  written (LLM failure can't disturb the shelf). Audit fixes: `statusByWork` keyed by `area::work` (a miss fails
  safe to KEEP, no cross-area false-advance); stable name tiebreak on null/duplicate sequence.
  **🚨🚨 THE MONTESSORI INVARIANT (do NOT weaken, ever): a work leaves a child's focus shelf ONLY when
  teacher-confirmed `mastered`. Nothing about a week rolling over or a report (re)generating may move/swap/re-roll
  a work the child is still working on. Never wipe the shelf. Never let an LLM choose shelf works.** Caveat:
  already-scrambled test shelves (Jill) won't auto-restore — re-onboard a fresh student to verify.
- **🩺 Systemwide health check + `819c297f`.** 🟢 healthy, no critical blockers. Fixed during the check: the two
  SIBLING non-determinism bugs to the replan fix — **game-plan/refresh** (`refresh/route.ts:199`) + **onboard**
  (`onboard/route.ts:933`, seeds the starter shelf) both wrote durable per-child game plans at temp 1.0 → both
  pinned `temperature:0`. **🚨 RULE: every LLM call that writes durable per-child shelf/plan state MUST be
  `temperature:0`** (replan nudge, game-plan/refresh, onboard — all pinned). Confirmed clean (verified): cross-
  tenant isolation (Session-113 work held), tier-gating (every AI report route gates + 402s free — old "6 Sonnet-
  hardcoded routes" note RESOLVED), `maxDuration` comprehensive (the 3 finance flags were false positives).
  **⏳ Open (owed, none blocking):** (1) OPS — confirm `SUPER_ADMIN_JWT_SECRET` set in Railway; (2)
  `dashboard/class-progress/route.ts:197` class-wide `.in()` needs 1000-row pagination (group-photo attribution
  truncates in busy classrooms); (3) 2 legacy `.ilike()` escapes (`weekly-planning/add-work:17`,
  `whale/daily-activity:152`); (4) cosmetic: dead `reports/ai-generator.ts` stale model + `admin/guru/chat` /
  `super-admin/guru` dated Sonnet pins (drift, not tier bypass); (5) the deferred timezone week-calc deep fix.
- **✅ Verify (reopen PWA):** Wrap Up → Teacher Review next to Confirm; Parents → Reports only + Reports·Chats·Codes
  order; UTC+8 Sunday → guard-rail banner + jump works; **onboard a FRESH student → shelf sits rock-still across
  wraps; mark a work mastered → only that slot advances.**

---

## 🩹 SESSION — Jul 5, 2026 (Cowork, later) — PARENTS REPORT MOVE + APPLE LANDSCAPE CAMERA + PHOTO-ID DETERMINISM + SHELF STATUS LADDER + PERMANENT SESSION + PWA NO-FLASH

**Canonical handoff: `docs/handoffs/SESSION_PARENTS_CAMERA_SHELF_JUL5.md`. 14 commits on main
(`da4cfac5` → `c42ccbba`), all pushed via Desktop Commander (HEAD == origin/main, tree clean). No
migrations, no env vars.** Every item built one-at-a-time (sacred rule: audit thinking → build → audit
build → ship), then a full top-to-bottom re-audit against the actual code before the handoff.

- **📋 Parents / Wrap Up split (`da4cfac5`).** Report generate+send MOVED out of Wrap Up (photo-audit)
  into the **Parents** tab. `parent-codes/page.tsx` = ONE header (`Parents` + LanguageToggle) + 3 pills
  **Codes / Reports / Chats**; Reports hosts `<WeeklyWrapTab classroomId={codes[0]?.classroom_id||''}/>`
  (dynamic, gated `canManageReports`). photo-audit's `weekly_wrap` ZONE_TAB is commented out + deep-link
  remap sends it to `all`. **🚨 Audit-confirmed UNREACHABLE:** no `setZone('weekly_wrap')` anywhere, no
  URL param maps to it — residual zone-type/render lines (102/1009/2551/2723) are dead code. **RULE:
  Wrap Up = daily photo-confirm ONLY; report gen lives in Parents. Don't re-add a report tab to photo-audit.**
- **📷 Apple-style landscape camera (`93ca347d` final; `a5457413`/`855834c9`/`48505047` superseded).**
  Three earlier attempts this session were wrong (bottom bar / full-bleed / distinct-preview-still-bottom).
  User wants **controls following the device's PHYSICAL edge** (Apple). Restored the device-validated
  layout from `ded705b3`: `isLandscape` state + orientation listener; root `flex-row` in landscape;
  portrait = bar below preview; **landscape = 140px vertical rail on the RIGHT edge, labels `-rotate-90`
  to read upright, preview fills the rest.** **🚨 PHOTO/VIDEO overlap fix (`c42ccbba`):** the rotated
  text labels collided ("VIDEPHOTO") because a `-rotate-90` text element keeps its UNROTATED layout box
  → replaced with a shared **emerald segmented icon pill** (`modeToggle`: camera+video inline SVGs,
  active `#34d399` fill / `#04150c` icon, inactive dim white; row in portrait, column in landscape,
  icons NOT rotated = square = no overlap). **RULES:** don't collapse landscape to a bottom bar again
  (rejected 3×); never `-rotate-90` a wide/multi-word text element in a stacked rail — use a square icon.
  **Known caveat (documented, not a bug):** rail is on the right, correct for the common CCW hold; if
  labels read upside-down on the opposite hold it's a one-line mirror, not a rebuild.
- **🎯 Photo-ID determinism (`6183c9cd`).** Root cause of the "right once, wrong on reruns, learns
  nothing" whack-a-mole = the Anthropic Messages API default `temperature` is **1.0**, never pinned.
  Pinned `temperature:0` on ALL 4 identification calls: `two-pass.ts` Pass 1/2/2b + `sonnet-draft.ts`.
  **RULE: every photo-ID model call is deterministic (`temperature:0`); never add one without it.** A
  fresh school now reads Brown Stair 3/3 (user-confirmed); the old whack-a-mole was temp 1.0 + a moat
  polluted during a temp-1.0 correction session.
- **🔧 Visual-memory "welder" tier-gate (`f7fe3f5f`).** `corrections/route.ts` `enrichVisualMemoryFromCorrection`
  now takes `tier` → `authorModel = tier==='sonnet' ? AI_MODEL : HAIKU_MODEL` + `temperature:0`. Premium
  = Sonnet fingerprints; Core = Haiku (the model that READS them back); Free = correction saves,
  enrichment skipped.
- **🪜 Shelf status ladder — the user's exact model, cemented.** `recommend → not_started → (photo)
  presented → (photo) practicing → (stays) → (teacher) mastered → next work → not_started`.
  - **Fix 1 (`14b72628`)** `lib/montree/progress/advance-on-confirm.ts` (NEW) = THE single shared ladder
    every confirm routes through (no row→presented; not_started→presented; presented→practicing;
    practicing stays; mastered untouched; never downgrades). Wired in `corrections/route.ts` (1 call,
    L532) + `photo-audit/resolve/route.ts` (new_custom branch only, 1 call, L393). **🚨 Audit-confirmed
    no double-advance:** client fires exactly ONE of `/corrections` OR `/resolve` per action → one rung.
  - **Fix 2a (`7cc24470`)** `lib/montree/progress/seed-recommended-work.ts` (NEW): recommend inserts
    `not_started` ONLY if no existing row (never downgrades — killed the replan footgun that reset
    practicing→presented). Wired into `replan-child.ts` (main+gap-fill), `fill-shelf/route.ts`
    (main+gap-fill), `shelf/route.ts`. `FocusWorksSection` badge = `t('status.notStarted')` @0.45.
  - **Fix 2b (`233c7d3b`)** `lib/montree/progress/advance-shelf-after-mastery.ts` (NEW): on FIRST mastery
    (`isFirstMastery`, no prior `mastered_at`), drop the next area work (by `sequence`, skipping touched)
    onto the shelf at `not_started` in real time. Fired fire-and-forget from `progress/update/route.ts`
    (~L225), guarded `isFirstMastery && classroomId && area`. **Caveat (by design):** fires on ANY
    first-mastery carrying `area` (incl. an older non-shelf work) → swaps that area's shelf slot; a
    surface that marks mastery without `area` won't fire it (weekly replan backfills). Both ladder fns
    match by `(child_id, work_name)` (the UNIQUE key), never `work_id`.
- **🔐 Permanent session (`25ec4850`).** `server-auth.ts` `MONTREE_JWT_TTL_DAYS` default 30 → **3650**
  (≈10y), cookie maxAge matches. A teacher on their own device never gets silently logged out;
  `recoverSession()` rebuilds from the cookie after iOS wipes localStorage on PWA relaunch. Override via
  `MONTREE_JWT_TTL_DAYS` env.
- **📱 PWA no-flash + top-clip (`78c1deff` + `c0d6f102`).** `setMontreeAuthCookie` also sets a
  NON-httpOnly `montree_surface` cookie (principal→/admin, agent→/agent/dashboard, else /dashboard),
  cleared on logout; `app/montree/page.tsx` pre-paint script reads it from `document.cookie` (after the
  localStorage checks) so a home-screen launch jumps into the app before the marketing splash paints —
  **cookies survive the iOS standalone-launch localStorage wipe; localStorage doesn't.** SW cache
  v12→**v13** purges the stale shell that was serving the old bare-`100dvh` dashboard (top-clip); code
  height calc was already correct.
- **✅ Verify on device:** reopen the PWA once (SW v13 → new JS + top-clip fix); log out+in once (10y
  token + surface cookie → no flash, permanent login); landscape camera = right rail + emerald icon
  toggle; shelf ladder walks not_started→presented→practicing→mastered→next; photo-ID stable on reruns.
- **⏳ Owed:** prod DB forensics (Miss Chen moat inspection) — Supabase pooler was unreachable all
  session (China network/VPN); a fresh school starts clean off global canonicals, so this only matters
  for existing polluted classrooms. Landscape rail side-mirror only if the opposite hold reads upside-down.

---

## 🚀 SESSION — Jul 5, 2026 (Cowork/Opus) — FOUNDING 100 WAITLIST + super-admin control panel + Core/Premium pricing copy

**Canonical handoff: `docs/handoffs/SESSION_FOUNDING_100_JUL5.md`. 1 commit on main (`260e24fa`, 10 files,
+815/−9), pushed via Desktop Commander (HEAD == origin/main). Migration 285 RUN + confirmed clean. ESLint
0/0, i18n strict 12/12. LIVE on montree.xyz.** Closes the "🚀 QUEUED — Founding 100 waitlist" item below.
Built in Cowork (Opus); it's a Montree *schools* feature so it lives in whale-class, NOT lyfcoach-web.

- **🚨 THE LOAD-BEARING RULE — the counter shows ADMITTED schools, not raw signups.** `remaining = cap −
  admitted`. Form submissions write a waitlist row and NEVER move the counter; Tredoux admits manually in
  waves from super-admin. Spam / tyre-kickers can't burn the permanent offer; the form collects a waitlist
  forever. Do NOT "simplify" to auto-decrement-on-signup — that is the footgun this design exists to avoid.
- **🚨 $3 is copy + config only — NOT wired to Stripe.** Admitting a school is the *promise* of $3. To
  actually charge an admitted founder $3, set that school's `billing_override_usd` (migration 202) in the
  Schools tab. Stripe deliberately untouched (Tredoux: change it before first promotion).
- **Migration 285 (RUN):** `montree_founding_waitlist` (email UNIQUE; status waitlisted/admitted/declined;
  admitted_at) + `montree_founding_config` singleton row (cap=100, wave=1, is_closed=false; `CHECK id=1`).
  RLS deny-all, server uses service role.
- **Public routes:** `GET /api/montree/founding/count` (`{cap,wave,admitted,remaining,is_closed}`, fails
  soft to 100) + `POST /api/montree/founding/join` (reuses the `/demo-request` abuse posture — `checkRateLimit`
  5/15min + input caps + hidden `website` honeypot + 23505 soft-dedupe + fire-and-forget notify email to
  tredoux555@gmail.com, which delivers because he is the Resend account owner). No confirmation-to-school
  email (by design — would need Resend domain verification).
- **Super-admin route + tab:** `app/api/montree/super-admin/founding/route.ts` (`verifySuperAdminAuth`; GET
  list+config+counts, PATCH `set_status` | `update_config`) + `components/montree/super-admin/FoundingTab.tsx`
  wired into super-admin as the 🚀 Founding 100 tab. **Full manual control, no SQL:** see every signup,
  Admit/Decline/Reset per row, edit cap+wave, Close/Re-open toggle. `components/montree/FoundingHundred.tsx`
  mounted directly below the hero in `app/montree/page.tsx` (hardcoded-English copy → zero i18n parity churn).
- **Pricing copy (surgical, NOT a redesign):** `app/pricing/page.tsx` hero + FAQ now state Core $3 / Premium
  $7 / founder $3 and drop the "only one plan" story; `en.ts` 2 value swaps (`landing.hero.fineprint`,
  `landing.closing.body`) drop "one plan / no tiers". The $7 pricing CARD is untouched (= Premium, correct).
  **Full two-tier card redesign + re-translating the 2 keys across 11 locales = deferred to Tredoux's
  pre-promotion pass.**
- **Audit catch (ESLint can't see it):** two success strings used `&apos;` inside plain JS string literals
  (would render literally) → rewritten apostrophe-free. Contracts grep-verified; `gen_random_uuid` +
  `React.CSSProperties`-global proven against existing repo usage.
- **Open/next:** full pricing-page two-tier card redesign; re-translate the 2 pricing keys; auto-apply
  `billing_override_usd=3` on admit (currently manual); decide whether to seed the counter below 100.

---

## 🎨 SESSION — Jul 4, 2026 (Cowork, night) — PRESENT FLAG + PWA LAUNCH + AI TIER LOCKDOWN + MENU REORDER + GALLERY/PARENTS SPLIT + PREVIEW BODY FIX

**Canonical handoff: `docs/handoffs/SESSION_TIER_MENU_GALLERY_PARENTS_JUL4.md`. 10 commits on main
(`cdc0d4ff`→`b817547f`→`0658d2a2`→`852c195d`→`edaba8cc`→`ab14e75b`→`8caf5672`→`0f7387be`→`a7fc2689`→`f2e45e04`),
all pushed (HEAD == origin/main). SW bumped v11→v12.** Driven by a live iPhone walkthrough of the fresh
**Sunshine Montessori / Miss Chen** cold-start school. This is a DISTINCT, later Jul-4 Cowork session from the
"iPhone bug sweep" block below (different commits, `457b308f`→`a8de31bf` there).

- **🚨 PENDING USER ACTIONS (blocking verification):** (1) run `migrations/284_parent_night_present.sql`
  (Present feature def, default OFF, enabled for Whale); (2) run the **menu-reorder SQL** (code re-seeds NEW
  schools only — existing `settings.menu` is authoritative; SQL in the handoff sets photo_audit/parent_manager/
  manage_students/guru/notes for every non-Whale teacher); (3) **reopen the PWA** (SW v12 purges the stale shell).
- **🎛 AI tier — DEFINITIVE CONTRACT LOCKED (`0658d2a2`,`852c195d`). Do not re-litigate.** **Haiku tier =
  PURE Haiku, NO Sonnet ever, no Sonnet buttons** — weekly teacher + parent reports now WRITE with Haiku
  (`aiTier.model`; they used to refuse). **Premium (Sonnet) = Haiku first, Sonnet only when Haiku can't crack
  it** (capture no longer silently escalates everything). **Free = no AI reports (402), photo ID still runs.**
  Wiring: `weekly-wrap` skip flags now key on `tier==='free'` (not non-Sonnet); `photo-identification/process`
  gained `sonnetTierEnabled` (5th Promise.all = `isFeatureEnabled(…,'ai_tier_sonnet')`) gating all 3
  `generateSonnetDraft` sites + auto-Sonnet threshold + telemetry; photo-audit **"🧠 Ask Sonnet" button hidden**
  unless Premium (prop threaded through `AuditPhotoCard` + memo comparator); `sonnet-review` 402-gated;
  `tell-ai`/`snap-identify`/`photo-insight` swapped hardcoded `AI_MODEL`→`resolveReportModel().model` (photo-insight
  forces Haiku-only path for non-Premium). **RULE: `resolveReportModel(supabase,schoolId)`→`{tier,model}` is the
  single dial; every AI surface resolves it, never hardcodes AI_MODEL.**
- **📋 Menu reorder + rename (`edaba8cc`).** `CORE_VISIBLE = ['photo_audit','parent_manager','manage_students',
  'guru','notes']` → new-school default **Wrap Up · Parents · Students · Guru · Notes**. `registry.tsx` labels
  `manage_students`→"Students", `parent_manager`→"Parents". Existing teachers need the menu SQL.
- **🖼 Gallery / Parents split.** **Goal A (`ab14e75b`):** parent report preview/publish/last-report extracted to
  `components/montree/reports/ChildReportPreviewModal.tsx` + a per-child report row on the Parents page; API returns
  `last_report_sent_at` (batched, non-fatal). **Goal B (`8caf5672`):** child Gallery is **DISPLAY-ONLY** — removed
  ~1,182 lines (all identification confirm/correct + report workspace + ThisIsSheet tagging), 2513→1331 lines, work
  labels read-only, unconfirmed AI guess shows **"Review in Wrap Up →"** link to `/photo-audit`, Lesson Notes stay.
  **🚨 Wrap Up (photo-audit) is now the SOLE identification-confirm + moat-seeding surface.** **Parents tab →
  Codes/Reports/Chats (`f2e45e04`):** three pill tabs (each a batch workflow across all children) — Codes (access
  cards), Reports (per-child Preview + Last via the modal), **Chats (per-child "Message parent" deep-linking to
  `/parent-chats/[parent_id]`, "Parent hasn't joined yet" fallback)**. API returns `parent_id` per child via batched
  `montree_parent_children` (first-linked wins, non-fatal). 5 `parentCodes.*` keys × 12 locales (parity held).
- **✍️ Report preview body fix (`a7fc2689`).** Photo-tagged report items skipped `findBestDescription()` in the
  PREVIEW (the SEND route runs it), so the sent report showed the rich parent body but the preview showed none.
  Preview now runs the same matcher for photo items (fallback `workInfo.description`→null). **RULE: Preview must
  mirror the Send path per item source.**
- **📱 Present flag + PWA launch (`cdc0d4ff`).** `parent_night_present` FeatureKey gates the dashboard "Present"
  Link (off for new schools; migration 284). PWA "top half missing" on home-screen launch = `<main>` was bare
  `100dvh` → `calc(100dvh - 56px - env(safe-area-inset-top))` (the intermittency was the state-dependent tell).
  Also removed the redundant child-page student-selector "No Options" dropdown (`b817547f`).
- **🔍 Self-audit (all correct, 2 minor unfixed):** (1) Reports tab shows for `homeschool_parent` but
  `canManageReports` is false → name-only empty cards (1-line fix: hide the tab when `!canManageReports`); (2)
  Goal-B deletion orphaned ~7 gallery symbols (4 unused interfaces + viewMode/isSavingCrop/isEnabled) → **14 eslint
  WARNINGS, 0 errors** — dead code, 5-min tidy.
- **🎨 QUEUED — dark-forest theme sweep (inventory done, build NOT started).** iPhone flagged Students / Add-Student
  modal / Label Generator as white. Scan categorized: **~24 core teacher screens on white** (students+modal+
  `StudentFormGuide`, labels, settings, tools, progress-overview, albums, media, print, snap, voice-observation,
  language-tracker, classroom-builder, weekly-wrap, reports viewer, the per-child summary/profile/observations/
  weekly-review/language-presentation/progress-detail, guru, curriculum/browse, vocabulary-flashcards); **~20 games**
  (colorful ON PURPOSE — **Tredoux to decide** retheme vs leave); **library/print tools** (dark chrome, **print
  previews stay white** — paper). Tokens = the `T` object (`#0a1a0f`/emerald `#34d399`/glass/Lora). Phase 1 = the 3
  shown + Settings/Tools; Phase 2 = rest; fold in the 2 audit findings.
- **✅ SHIPPED Jul 5, 2026 — Founding 100 waitlist. Built + live (commit `260e24fa`, migration 285 RUN); see the Jul-5 session block at top + `docs/handoffs/SESSION_FOUNDING_100_JUL5.md`. Original plan kept for record:** Homepage section:
  live "X of 100 remaining" counter (DB-backed) + no-login form (school/contact/email/country/approx students) →
  writes DB, decrements, emails Tredoux; verbatim copy + "Join the Waitlist" CTA; mobile-first, dark-forest. Plan:
  `montree_founding_waitlist` table (email UNIQUE) + optional `montree_founding_config` (cap/wave) + `GET /founding/
  count` + `POST /founding/join` (IP rate-limited like demo-request, Resend notify fire-and-forget) + `<FoundingHundred/>`
  homepage component + super-admin admit/wave surface. **Open Qs to feed back BEFORE building:** (1) notify email +
  verified Resend sender (montree.xyz Resend verification is a standing open item); (2) "our list price" = confirm
  $7/student; (3) counter = raw signups or manual admits? (wave language ⇒ manual gating — counter reflects *admits*,
  form keeps collecting); (4) hard-close form at 100 or keep a waitlist; (5) super-admin admit UI? Tredoux's rule:
  "feed me the logic before you ship." Build behind confirmation.

---

## 🩹 SESSION — Jul 4, 2026 (Cowork, late) — LIVE IPHONE BUG SWEEP + 3-TIER AI CONTROL + WRAP UP TAB GATING

**Canonical handoff: `docs/handoffs/SESSION_UI_FIXES_AND_3TIER_JUL4.md`. 6 commits on main
(`4ab0754d`→`d25e01b0`→`457b308f`→`ded705b3`→`bd27bf00`→`744a600a`→`a8de31bf`), all pushed + Railway
deployed. Migration 283 RUN (confirmed). ESLint clean per file; i18n 12/12.** Driven by a live iPhone
walkthrough of the brand-new **Sunshine Montessori / Miss Chen** cold-start school.

- **🩹 Voice-onboarding crash on "That's right" (`d25e01b0`).** `voice-onboarding/page.tsx` imported
  only `getAreaLabel` (line 24) but the **Shelf Editor** stage (reached exactly on "That's right")
  calls `getAreaPrefix(areaKey, locale)` → `ReferenceError` → dashboard error boundary
  ("Something went wrong 😵"). Hit EVERY teacher reaching that stage, not Marina-specific. One-line
  import fix. Slipped past because `typescript.ignoreBuildErrors:true` + ESLint `no-undef` off.
  **RULE: any component rendering an area dot MUST import `getAreaPrefix` — a missing import for a
  render-path helper is a runtime crash, not a build error. Grep-verify.**
- **✨ Child gallery "Identifying…" state (`457b308f`).** The processing hourglass + "Identifying…"
  existed only on the **Wrap Up / Photo Audit** page, never the **child gallery** (two different
  files). Ported `isPhotoInFlight()` + `ProcessingHourglass` VERBATIM from photo-audit (single source
  of truth) + `nowTs` clock (starts 0 → SSR-safe) + a **silent 6s poll** (`fetchPhotos({silent:true})`,
  bounded 12 tries) so the card flips on its own. `silent` skips `setLoading` so the full-screen
  spinner never flickers. Label hardcoded English (`gallery.identifying` doesn't exist; `t()||fb`
  renders the raw key). Keyed on RESULT, never `identification_attempted_at`.
- **🔄 Camera landscape labels (`ded705b3`).** Right-rail labels read "dyslexic" in landscape — all 6
  (Retake/Use Photo/PHOTO/VIDEO/Cancel/album) flipped `rotate-90`→`-rotate-90`. Back-chevron left as
  `rotate-90` (directional icon, not text). Two `replace_all`s (` rotate-90"`, ` rotate-90 ${`)
  matched the rail + excluded the chevron (`'rotate-90'`). Positions unchanged.
- **🎛 Three-tier AI control restored (`bd27bf00`).** Session-57 built Free/Core/Premium; it had been
  collapsed to a binary Free⇄Pro toggle in super-admin. **Engine was always three-tier**
  (`resolveReportModel()` → free/haiku/sonnet). Restored: GET derives `sonnet>haiku>free` from the two
  flags; PATCH `VALID_AI_TIERS=['free','haiku','sonnet']` (free=both off/$0; haiku=`ai_tier_haiku`
  only/$50 soft; sonnet=BOTH on/$9999 warn — strict superset, so old "Pro" schools read back as
  Sonnet, no regression); `SchoolsTab` shows **Free/Haiku/Sonnet** pills. **🚨 Trial-floor caveat
  (NOT changed):** trialing/active schools get Haiku even when set Free (Jun-9 floor so trials aren't
  402'd), so **true zero-AI Free is only testable on a non-trial school** — Haiku vs Sonnet is clean
  now. Cost readback confirmed: 4 photos + 1 Sonnet parent report = **$0.0039**.
- **🎚 Wrap Up optional tabs gated + rename (`744a600a`, migration 283 RUN).** Weekly Admin /
  Discussion / Get Advice are now per-school flags, **default OFF**, toggleable in super-admin ⚙️
  Features. **Weekly Admin** reuses the pre-existing `weekly_admin_docs` flag (default OFF, already in
  the modal + already on for Whale) — the tab BUTTON just wasn't hidden; now it is (no migration).
  **Discussion + Get Advice** = NEW flags `wrap_discussion`+`wrap_get_advice` (migration 283, default
  OFF, enabled for Whale), added to `FeatureKey` union + gated in `ZONE_TABS`. Also **hid the per-card
  💬 discussion flag icon** when Discussion is off (passed `discussionEnabled` through the memoized
  `AuditPhotoCard` + added to its comparator) — else flagging strands a photo (pulled from Confirm,
  no tab to hold it). **Weekly Wrap tab → "Parent Reports"** (value-only en+zh; key/zone unchanged).
  A new school opens Wrap Up to just **Confirm + Parent Reports**. **RULE: new toggleable feature =
  def row (migration) + `FeatureKey` key + `isEnabled()` gate on the ENTRY POINT (tab/icon), not just
  the destination.**
- **📇 Parent Manager Print→Parent Chats (`a8de31bf`).** Removed the top-bar Print button
  (`window.print()`) + replaced with the **Parent Chats** `<Link>` in prominent emerald (next to the
  language toggle); dropped the duplicate Parent Chats from the heading + the unused `Printer` import.
  Print CSS/classes intact (Cmd+P still works, just no button).

---

## 🎯 SESSION — Jul 4, 2026 (Cowork/Opus) — PHOTO-ID VISUAL-SIMILARITY RETRIEVAL: the cold-start miss CLASS closed, LIVE

**Canonical build handoff: `docs/handoffs/SESSION_PHOTO_ID_VISUAL_RETRIEVAL_BUILD_JUL4.md` (read it
first). Executes `docs/handoffs/SESSION_PHOTO_ID_VISUAL_RETRIEVAL_PLAN.md` (Steps 0→1→2) end-to-end. 6
commits on main (`90114868` Step 0 · `a0e9c641` Step 1 · `b75f3036` Step 2 · `34f62f82` gallery ·
`31966f08` brain · `a401d938` audit hardening), all pushed + Railway deployed. Migration 282 RUN +
backfill DONE (270/270 embedded) → retrieval is LIVE in production. Two independent fresh-eyes audits +
own runtime checks: NO CRITICAL/HIGH bugs.** Also produced the pricing/GTM strategy that this work
de-risks: `docs/strategy/PRICING_FOUNDING_100_STRATEGY.md` (two-tier $3 Core / $7 Premium + a
"Founding 100" cohort — free 6mo → $2-for-life — the land-grab play; photo-ID had to be reliable
first or a wrong first-photo tag kills a new account). Trigger: Sunshine Montessori's brand-new school took 2 first capture-photos and
one came back wrong — a **Number Rods photo drafted as "Brown Stair"** (a Math work filed as
Sensorial). 50% wrong on first contact = adoption killer for a pre-validation product.

- **Root cause (given):** candidate recall was LEXICAL + AREA-LOCKED on the name Haiku Pass 2 guessed.
  Visual evidence never reached the shortlist, so when Pass 2 said the wrong name, the correct work
  (different name, different area) scored ~0 and was structurally unreachable. Every safety net was
  keyed on the confusion being PRE-REGISTERED.
- **Step 0 — insurance patch (`90114868`):** new `CONFUSION_CLUSTERS` primitive in
  `lib/montree/work-matching.ts` — `CROSS_AREA_CONFUSION_WORK_NAMES` + `CROSS_AREA_CONFUSION_COUNTERPARTS`
  are now DERIVED from it (existing pairs migrated in unchanged). Registered the graduated-staircase
  family (Pink Tower · Brown Stair · Red Rods · **Number Rods** + variants) — Number Rods is the
  cross-area member that legitimises the cluster. Added mutual Brown Stair↔Number Rods `NOT` negatives
  (curated sensorial.json + math.json) + re-seeded prod global VM (270 rows). Rewrote the visual-id-guide
  staircase line to teach **COLOUR-FIRST** (red/blue banding ⇒ Number Rods, beats silhouette). Verified:
  Photo A → Number Rods 3/3 (was Brown Stair); Photo B (Brown Stair) 3/3; Number Rods/Metal Insets/
  Knobless/Pink Tower controls hold.
- **Step 1 — THE CLASS FIX (`a0e9c641`):** candidate recall now driven by what the photo LOOKS LIKE.
  **Migration 282 (RUN):** `embedding vector(1536)` on `montree_global_visual_memory` + cosine RPC
  `montree_global_vm_search(query, limit)` (mirrors `tracy_corpus_search`; no ANN index — 270 rows,
  seq scan instant). **Backfill = super-admin route** `app/api/montree/super-admin/embed-global-vm`
  (embeds each row's visual_description+key_materials via OpenAI text-embedding-3-small ON Railway, so
  the key never leaves; super-admin OR x-cron-secret; `?force=1`; **RE-RUN after ANY re-seed** — a
  re-seed rewrites text but leaves the stale embedding). **Runtime** (`lib/montree/photo-identification/
  visual-retrieval.ts` + `two-pass.ts`): after Pass 1, embed the Pass-1 description → top-8 nearest
  global works ACROSS ALL AREAS → (a) injected into the Pass 2 **USER message** (`MOST VISUALLY SIMILAR
  LIBRARY WORKS` — NOT the cached system prefix, both Jul-3 cache breakpoints survive), (b) fed to
  `buildPass2bCandidates` as a new priority tier (`MAX_CANDIDATES` 5→7), (c) a NEW Pass 2b force
  trigger when Pass 2's chosen work is NOT among the top-3 neighbours ("visual evidence disagrees").
  Matcher now sees the RICH Pass-1 description (materials boost), not the one-line observation.
- **Step 2 — real eval harness (`b75f3036`):** `scripts/eval-photo-id.mjs` replays teacher-confirmed
  photos (with work_id) through the REAL pipeline in COLD mode; reports top-1 / top-3-chip / Gate A
  auto-file precision (+ wrong auto-files) / per-area confusion matrix; stratified `--per-work`,
  reusable `--sample` file for fair before/after, retrieval auto-detected via OPENAI_API_KEY. Photo A
  (Number Rods) + Photo B (Brown Stair) pinned as permanent regression cases.
- **Gallery (`34f62f82`):** gallery confirms now route through the corrections endpoint (`action=confirm`)
  so a one-tap gallery confirm SEEDS the classroom moat (parity with Photo Audit / Wrap Up — closes the
  Jul-4 open item). Gate-A auto-filed-but-unconfirmed photos (`identification_status='haiku_matched'`)
  get a distinct ✨ AI-tagged treatment + one-tap ✓ instead of looking already-done.
- **🚨 FAIL-OPEN is load-bearing:** no OPENAI_API_KEY / migration-not-run / no supabase → retrieval
  returns `[]` → pipeline byte-for-byte the Step-0 behaviour. Verified via a dormant retest before the
  migration (Photo A → Number Rods, Photo B → Brown Stair, unchanged).
- **Retrieval-quality VERIFIED on prod (each work's own embedding as the query):** Number Rods → **Red
  Rods 0.849 (cross-area!)**; Red Rods → Number Rods 0.849; Cylinder Block 1 → Blocks 2/3/4 @0.997 +
  Knobless 0.732; Sandpaper Letters → Sandpaper Numerals 0.723 (cross-area) + Moveable Alphabet. Every
  work pulls its visual family AND its cross-area look-alikes into the candidate set.
- **RULES:** global VM is runtime-READ-ONLY (only the seed script + the backfill route write it; the
  backfill only writes the `embedding` column). Retrieval injects into the Pass 2 USER message, never
  the cached system prefix. New confusion family = a cluster line + mutual curated negatives + re-seed
  + re-run the embed backfill + a harness case — NOT code. Don't lower `HAIKU_TRUST_CONFIDENCE` (0.85)
  or the 0.90 first-sight bar. Global VM still NEVER satisfies Gate A Path 1. `montree_media.work_id`
  is TEXT vs curriculum `id` UUID — cast (`w.id::text = m.work_id`) in raw SQL.
- **⏳ Open/next (all OPTIONAL — production is live + validated):** the full OFFLINE before/after eval
  WITH retrieval needs OPENAI_API_KEY locally (deliberately kept on Railway only) — run
  `OPENAI_API_KEY=… node scripts/eval-photo-id.mjs --sample /tmp/evalset.json --label after`; else
  trust the prod GateA telemetry (`gvmInjected` + the retrieval neighbours) on the next cold capture.
  Consider tuning the Pass 2b `+0.05` override margin for disagreement-triggered runs FROM EVAL DATA
  (not vibes). Deferred plan item: the override-margin decision.

---

## 🩹 SESSION — Jul 4, 2026 (Fable) — "PHOTO RECOGNITION IS BROKEN" WAS A READ-SIDE DISPLAY SCARE — pipeline healthy, 2 client-only gallery fixes

**Canonical handoff: `docs/handoffs/SESSION_GALLERY_DISPLAY_FIX_JUL4.md`.** The user reported the
Smart-Capture system "failing FLAT — worse than when we built it" (every photo "Untagged"), then on
a brand-new school "took 4 photos, 0 showed up." **Both were READ-SIDE display gaps on the child
gallery — the capture+identify pipeline was never broken.** 2 commits on main, BOTH
`app/montree/dashboard/[childId]/gallery/page.tsx` only, client-only:
- `5f219a03` — gallery shows the AI draft (`sonnet_draft.proposed_name`) as a one-tap **✨ suggestion
  + green ✓** instead of a blank "Untagged" when `work_id` is NULL (cold accounts rarely auto-confirm
  → `work_id` stays NULL → the feed, which only rendered the confirmed `work_id`, showed "Untagged"
  even though the AI had the right answer). ✓ resolves `proposed_name` → curriculum work (exact/normalized
  name match) and PATCHes `work_id`; falls back to the picker. No new i18n keys.
- `8c658754` — `cache:'no-store'` on the child-media fetch + refetch on `visibilitychange`/`focus`.
  The media API sends `Cache-Control: max-age=60, stale-while-revalidate=120`, so after capture the
  browser served a **pre-capture "0 photos" snapshot** for up to ~3 min. Photos were in the DB the
  whole time. Now the gallery always fetches fresh + auto-refetches when you return from the camera.

**Pipeline verified HEALTHY on live prod data (Bright Stars + the new Sunshine/Marina school):** trigger
`capture→attempt = 1s`, fully processed `9–22s`, IDs correct, and Gate A **AUTO-CONFIRMED** the
high-confidence ones on the fresh cold account (Cylinder Block 1 + Number Rods got real `work_id`s) —
the Jul-3 curated 270-work seed is working: higher cold-start confidence → more auto-tags.

- **🚨 NOT the cause (ruled out, don't re-chase):** the curated seed / photo pipeline (unchanged,
  healthy); cross-tenant/stale-session (photos saved to the correct school with the user's session →
  session IS the new school); the media API (`app/api/montree/media/route.ts` unchanged since May 16 —
  its cache header is old, not new); my gallery edits causing "0 photos" (the render change runs only
  when `photos.length > 0`).
- **🚨 Also NOT regressions (git-verified):** (1) the "tell me about your students" onboarding takeover —
  `TellGuruCard.tsx` (Apr 24) + `voice-onboarding/page.tsx` (Jun 22) UNCHANGED; it fires **only in-session
  right after create/import** (commit `e13ae634`, Jul 3, deliberate) — it correctly flashed up in the
  fresh create-school→add-student flow. (2) Guru chat shelf-fill stopping at 2/5 areas (both "Presented",
  contradicting "start with zero") — `lib/montree/guru/tool-executor.ts` UNCHANGED since May 16 →
  runtime/model tool-loop early-stop, **OPEN to investigate**, not a code regression.
- **RULES:** (1) 🚨 SUPERSEDED Jul 4 2026 — the child gallery is now DISPLAY-ONLY. It surfaces
  `sonnet_draft.proposed_name` as a READ-ONLY ✨ label (never a blank "Untagged" when the AI has a guess),
  and an unconfirmed AI guess shows a "Review in Wrap Up →" link INSTEAD of a one-tap confirm. All
  confirm/correct/(re)tagging happens in Wrap Up (`/montree/dashboard/photo-audit`) only. The gallery's
  own report card + confirm/picker machinery were removed; the per-child Parent Report preview/publish
  flow moved to the Parents tab (`parent-codes` page) via `components/montree/reports/ChildReportPreviewModal.tsx`.
  (2) the child-media gallery fetch is `cache:'no-store'` + refetch-on-visibility (fix at the fetch site;
  do NOT strip the media API cache header — other callers use it). (3) **Wrap Up / photo-audit confirms are
  the SOLE visual-memory-moat seeding path** (the gallery no longer confirms at all, so "route gallery
  confirms through the corrections endpoint" is OBSOLETE) — cold accounts warm the moat via Wrap-Up confirms
  the corrections endpoint.
- **Prod data:** the Jul-3 Bright Stars gate photo `d7af53f8` was reset to `identification_status='pending'`
  (draft cleared) so the audit sweep re-runs it live. No other prod data changed.
- **Verified:** ESLint 0 errors on the gallery page (15 pre-existing warnings, none new); Marina's 3
  photos present in DB (correct school, 2 auto-confirmed), gallery filter returns 3, all 4 tested proposed
  names resolve EXACT to the 329 classroom curriculum works. Both commits pushed via Desktop Commander
  (HEAD `8c658754`).
- **⏳ Open/next:** Guru shelf-fill early-stop (2/5); fire the onboarding takeover on individual add too
  (import-only today); route gallery confirms through the moat; owed clean-photo verification round from
  the Jul-3 canonical seed.

---

## 🧠 SESSION — Jul 3, 2026 (Fable + Sonnet) — CANONICAL GLOBAL SEED: 270 CURATED WORKS, LIVE

**Canonical handoff: `docs/handoffs/SESSION_CANONICAL_SEED_JUL3.md` — READ IT before touching
the global visual-memory seed.** Executes `docs/handoffs/PLAN_CANONICAL_GLOBAL_SEED_OPUS.md`
end-to-end. 1 commit on main (`83e68492`), pushed, Railway deploying. Seed RUN on prod via the
pooler. **`montree_global_visual_memory` is now 270 rows, 100% `source='curated'`** (was 235 =
5 curated + 230 whale_seed).

- **What it is:** the global cold-start baseline is no longer seeded from Whale-classroom photos
  (biased, no discriminators). Every standard Montessori work now has an Opus/Fable-authored,
  spec-grounded checklist — positives + mutual "NOT <look-alike>:" negatives on every confusion
  pair. New schools start warm on standard materials.
- **Precedence FLIPPED** (`scripts/seed-global-visual-memory.mjs`): curated `visual_description`
  is authoritative and REPLACES Whale text per key; Whale negatives merge in after (60-char
  dedupe). Per-area confidence 0.95, **Practical Life 0.85**. Seed refuses to run unless the new
  **validator** (`scripts/validate-curated-visual-memory.mjs`) passes.
- **Data:** `scripts/data/curated-visual-memory/{sensorial,math,language,cultural,practical-life}.json`
  (35 · 57 · 45 · 50 · 83 = 270). Validator hard-fails on unknown key / >900-char desc /
  name-area mismatch / dup keys / roster names / malformed negative; mutual-negative asymmetry
  is a WARNING (pragmatic at scale — negatives are prompt hints).
- **New cross-area pair registered** (`lib/montree/work-matching.ts`, 4-step rule): **Sandpaper
  Letters (language) ↔ Sandpaper Numerals (math)** — both directions + `sandpaper numbers` alias
  + mutual curated negatives.
- **Harness = the deliverable** (`scripts/retest-cold-start.mjs` + `_harness/pipeline-entry.ts`):
  esbuild-bundles the REAL pipeline, runs live Haiku against a synthetic COLD classroom
  (empty classroom VM + full global VM + `useV2:true`). Use it before/after ANY future seed
  change. A green validator is NOT a working feature (Jun-14 rule).
- **Gate = PASS** (live-Haiku, cold context). The real Bright Stars failure photo (`d7af53f8`,
  Cylinder-Block-as-Spindle-Boxes) resolves to **Cylinder Block 2/3 at full scale** — the
  Spindle-Boxes misfire is eliminated. Controls unregressed (Number Rods 3/3, Metal Insets 2/2);
  curated seed IMPROVED Knobless Cylinders 0/3→1/3 (was mis-IDed as Cylinder Blocks). The one
  "regression" (Pink Tower 3/3→Brown Stair) is a verified Pink Tower **+** Brown Stair COMBINATION
  photo — ambiguous scene, not a distinctive-work regression. Full before/after table in the handoff.
- **Build split:** batch-1 (26 confusion works) + validator + harness + seed rewrite = Fable;
  remaining 244 works = 3 Sonnet subagents (math/language/cultural/PL) against the template,
  gated by the validator; all integrity checks (validate/seed/harness/measure/push) = Fable.
- **🚨 OWED — clean-photo verification round (Tredoux offered):** capture clean single-material
  photos through the Montree app → run `retest-cold-start.mjs --media <id>`. Priority "dodgy"
  list (confusion pairs shot SEPARATELY + low-confidence works) is in the handoff §4.
- **RULES:** curated authoritative per key · seed gated by validator · per-area confidence
  0.95/PL-0.85 · new cross-area pair = Set+counterparts(both dirs)+mutual negatives+re-seed ·
  global still NEVER satisfies Gate A Path 1 · runtime read-only · Haiku on all passes · 20KB
  shared budget + both cache breakpoints · no child data in the table (100% generic materials).
- **Rollback:** `UPDATE montree_global_visual_memory SET is_active=false;` (graceful degrade) or
  `git checkout 72e59ec1 -- scripts/seed-global-visual-memory.mjs` + re-run (restores Whale-primary).

---

## 🧠 SESSION — Jul 3, 2026 (Fable) — MASTER BRAIN v1 BUILT + PHOTO-ID COLD-START FIXED

**Canonical handoff: `docs/handoffs/SESSION_MASTER_BRAIN_BUILD_JUL3.md` — READ IT before touching
the photo pipeline.** Executes BOTH tasks from `SESSION_PHOTO_ID_COLDSTART_AUDIT_JUL3.md` (the
🔬 QUEUED FOR FABLE block below — now ✅ DONE). 1 commit on main. **Migration 281 already RUN on
prod via the pooler + global moat already SEEDED (235 rows) — nothing pending in Supabase.**

- **Design verdicts (Task A):** Gate A is correctly strict — the 0.90 Path-2 bar SAVED Bright
  Stars from auto-filing a WRONG work (Pass 2 said Spindle Boxes at matchScore 1.0/conf 0.85 for
  a Cylinder Block). Do NOT loosen 0.85/0.90. The real defect: Pass 2b built candidates ONLY from
  classroom VM text → cold classrooms had <2 candidates → the image-arbitration stage could never
  run. Second defect: same-area candidate fill can never surface a CROSS-area counterpart.
- **Master brain v1 = curated READ-ONLY global seed** (`montree_global_visual_memory`, migration
  281, keyed UNIQUE work_key). 230 scrubbed Whale teacher-validated standard-work entries + 5
  hand-authored + curated `NOT <counterpart>` negatives on every confusion pair. Seed script
  (`scripts/seed-global-visual-memory.mjs`, idempotent, --dry-run) is the ONLY writer — no
  runtime cross-school writes, so the poison/abuse vector doesn't exist in v1.
- **Wiring:** context-loader loads global as 3rd parallel query → `globalVisualMemoryEntries`
  (full set → Pass 2b candidates) + `LIBRARY-VERIFIED WORKS` Pass 2 prompt block that fills the
  LEFTOVER of the shared 20KB budget (live-verified: Bright Stars 26 entries/20.2KB, Whale 0 —
  natural decay as the classroom moat grows). `buildPass2bCandidates` rewritten with global tiers
  + cross-area counterpart injection (`CROSS_AREA_CONFUSION_COUNTERPARTS` in work-matching.ts).
  **Cylinder Blocks ↔ Spindle Boxes registered** as a confusion pair (Set + counterpart map +
  guide top-block + seeded negatives). GateA log + telemetry carry `has_global_vm_for_match` /
  `global_vm_injected_count` (new columns via 281).
- **🚨 Global NEVER satisfies Gate A Path 1 (v1).** `hasVisualMemoryForMatch` stays
  CLASSROOM-only. A future "global VM + conf ≥0.90" Path 1.5 is a telemetry-driven decision.
- **Efficiency:** SECOND prompt-cache breakpoint on the per-classroom dynamic block in Pass 2 AND
  sonnet-draft (capture bursts read the ~5-8K-token suffix at ~10% price from photo 2 on).
  sonnet-draft locale bug fixed (hardcoded zh/es map → `getAILanguageInstruction`; 9 locales were
  silently getting English drafts). Dead `PASS2B_NO_VM_THRESHOLD` removed.
- **Verified:** eslint 0/0 on all touched files; scoped tsc clean (4 flagged errors pre-existing,
  outside the diff); 15/15 logic-harness assertions incl. the exact Bright Stars scenario (Pass 2b
  now receives [Spindle Boxes, Cylinder Block 1-4] with the image); LIVE loader run against prod.
- **⏳ Phone verification still owed:** (1) hard-refresh Bright Stars Wrap Up → the old photo's
  "Spindle Boxes · 85%" chip should render → ✏️ Wrong → "Cylinder Block 1" (if no chip after hard
  refresh, chase the `isPhotoInFlight` display bug per the audit doc §1); (2) fresh Cylinder Block
  capture post-deploy → expect correct ID, grep Railway GateA for `hasGlobalVM:true gvmInjected:26`;
  (3) Whale regression sniff (`gvmInjected:0`, unchanged behavior).
- **RULES:** global table is runtime-read-only · standard works only · registering a new confusion
  pair = Set + counterpart map (both directions) + seed-script negatives + re-run seed · the 20KB
  Pass 2 budget is SHARED (classroom first, global fills remainder — never additive) · keep both
  cache breakpoints.
- **🔒 PRIVACY CONTRACT (Tredoux raised "are schools sharing my data?" — these must stay TRUE,
  full FAQ in handoff §5b):** the global table holds ONLY generic descriptions of standard
  Montessori MATERIALS (no photos / child names / notes / classroom names — pre-seed audit found
  zero name hits, photo URLs deliberately not copied); it's Whale Class's own data curated once;
  NO school can write to it at runtime (no poison vector — bad confirmations elsewhere stay in
  that school's private moat); Whale Class itself injects 0 global entries (own moat fills the
  budget — verified live); kill switch = `UPDATE montree_global_visual_memory SET is_active=false;`
  → graceful degradation to pre-Jul-3 behavior. Any change that breaks one of these answers needs
  an explicit design review, not a drive-by edit.

---

## 🚨 SESSION — Jul 3, 2026 (Cowork, pt 4) — GURU-FIRST MENU + GURU COMPOSER VIEWPORT FIX + CURRICULUM-GAPS DEFAULT-OFF + MENU STRIP TO 5

**Canonical handoff: `docs/handoffs/SESSION_GURU_MENU_SIMPLIFY_JUL3.md`.** 3 commits on main
(`791474dd` → `8058cb2f` → `4f467ef4`), Railway deployed. **No pending Supabase run — migration
280's effect was applied directly to prod via the pooler.** Plus 2 prod DB ops (Sarah's Bright
Stars menu reorder + the feature-definition default flip). Driven by a live iPhone walkthrough of
the newly-seeded **Bright Stars / Sarah** test account.

- **🩹 Guru composer was off-screen on iPhone (`791474dd`).** `app/montree/dashboard/guru/page.tsx`
  rendered `h-dvh` (100dvh) but sits BELOW the **sticky** `DashboardHeader` in the shared dashboard
  layout → total doc height = headerH + 100dvh → the composer fell headerH px below the viewport,
  reachable only by scrolling ("looked like it wasn't working"). Fix: added `data-dashboard-header`
  to BOTH header returns in `DashboardHeader.tsx`; the Guru page now measures the header live
  (`offsetHeight`, re-measured on resize/orientation/ResizeObserver) and sizes the chat to
  `calc(100dvh - headerHeight)` (main container + both loading states); composer got
  `env(safe-area-inset-bottom)` so the send button clears the home indicator. Degrades to `100dvh`
  if the header isn't found. **RULE: any full-height page under `app/montree/dashboard/layout.tsx`
  MUST subtract the sticky header — measure `[data-dashboard-header]`, never bare `h-dvh`.**
- **📋 Menu stripped to 5 essentials (`791474dd` reorder → finalized `4f467ef4`).** New teacher
  default (and Sarah's live account): **Guru → Student Manager → Parent Manager → Notes → Wrap Up.**
  `CORE_VISIBLE` in `lib/montree/menu/config.ts` is the single seed for all 5 teacher-creation
  paths; the More menu renders in saved-config order. **🚨 Wrap Up (photo_audit) kept LAST-but-VISIBLE
  on purpose** — the More menu is the ONLY path to the photo review/confirm loop (capture flow
  doesn't route to `/photo-audit`; dashboard doesn't link it). User first said strict-4 (dropping
  Wrap Up), then kept it as #5 when told dropping it strands photo tagging (Menu Management, the
  reorder tool, is now hidden too). `manage_students` menu label → **"Student Manager"** (labelKey
  nulled in `registry.tsx`, parallels the hardcoded "Parent Manager"; the Manage Students PAGE title
  is unchanged).
- **🙈 Menu Management + Invite Principal removed from the More menu (`4f467ef4`).** The `/menu-setup`
  page renders a broken washed-out light theme ("albino face") + the menu is now a fixed curated
  set, so **Menu Management** is hidden (route on disk, NOT retheme'd — parked). **Invite your
  principal** removed (advise verbally); the modal + `showInvitePrincipal` state + import stay wired
  (hide-don't-delete, one uncomment away) — dropped the now-unused `UserPlus` import. Collapsed the
  leftover double-divider above Logout.
- **📡 Curriculum Gaps panel → default OFF (`8058cb2f`).** The dashboard "Curriculum gaps" panel
  (`components/montree/CurriculumGapCard.tsx`, gated by `isEnabled('curriculum_gap_radar')`) was
  default ON (migration 248) → a brand-new empty room got a wall of "N of M works haven't been
  presented yet." Flipped the feature definition `default_enabled` → **false** (migration 280 +
  applied to prod). Card + endpoint unchanged; stays in the admin feature toggle
  (`SchoolFeaturesModal`, category 'dashboard') so a principal/super-admin flips it on per-school
  (writes a `montree_school_features` override that beats the default). No school holds an override
  → off everywhere until turned on. **RULE: default noisy new-user dashboard panels OFF at the
  definition level; keep the card/endpoint + the per-school admin toggle intact.**
- **🧹 Audit cleanup (`8058cb2f`).** Removed a write-only `measuredRef` (+ its `useRef` import) the
  first Guru commit left in the header-measure effect.
- **Prod DB ops (pooler).** Sarah's `montree_teachers` row `2d77545a-…`: `settings.menu.items`
  reordered to the 5-item visible order (all 21 items preserved, 16 hidden — existing configs are
  authoritative, so changing the default alone would NOT reorder a live account).
  `montree_feature_definitions.default_enabled=false` for `curriculum_gap_radar`.
- **Verify:** local==remote==`4f467ef4`; full lint of the 5 touched files = 0 errors (1 pre-existing
  `react-hooks/exhaustive-deps` `t` warning on the Guru data-loading effect, confirmed not mine via
  stashed-HEAD lint). Guru viewport is a device fix — confirm on iPhone after **PWA reopen** (menu
  config + features are client-cached from load).

---

## ✅ DONE (was: QUEUED FOR FABLE, Jul 3 2026) — PHOTO-ID REVIEW + MASTER BRAIN — see the Fable session block above

**Both tasks executed by Fable same day — canonical result: `docs/handoffs/SESSION_MASTER_BRAIN_BUILD_JUL3.md`.**
Original audit (kept for the incident record): `docs/handoffs/SESSION_PHOTO_ID_COLDSTART_AUDIT_JUL3.md`.

- **Finding (cold-start misID).** On the new Bright Stars/Sarah account a standard **Cylinder Block**
  photo showed "Untagged." The pipeline RAN (~5s after capture); Haiku Pass 2 confidently MISmatched it
  to **"Spindle Boxes" (Mathematics)** at 0.85. It couldn't auto-tag or self-correct because the account
  has **0 visual-memory** (the per-classroom moat, `montree_visual_memory.classroom_id`, loaded in
  `context-loader.ts`): auto-match Path 1 needs VM for the matched work (none), Path 2 needs conf ≥0.90
  (had 0.85), and Pass 2b builds its candidates from VM so it never ran. Cylinder Block ↔ Spindle Box
  also isn't in `CROSS_AREA_CONFUSION_WORK_NAMES` (`work-matching.ts`). Ground fix: teacher taps
  ✏️ Wrong → "Cylinder Block 1" → seeds the first VM entry, moat starts learning. The bare "Untagged"
  with no draft chip in the screenshot is likely a **STALE client** — the DB row is `haiku_drafted` +
  conf 0.85 and the card SHOULD render "Spindle Boxes · ✓ Correct / ✏️ Wrong" (`photo-audit/page.tsx:3412`);
  refresh to confirm, else it's a display bug to chase.
- **🔬 Fable is reviewing the photo-ID function** (`app/api/montree/photo-identification/process/route.ts`
  + `two-pass.ts` + `context-loader.ts`) for efficiency/improvements. Brief: handoff §🔬 Task A.
- **🧠 "Master brain" (cross-school shared moat) — theorised, recommend handing architecture to Fable.**
  FEASIBLE: `montree_visual_memory` rows carry a canonical `work_key` (stable across schools for STANDARD
  works; custom stays private). Precedent = `montree_guru_brain` id='global' — but that's the CHAT brain,
  NOT photo-ID; a photo-ID master brain is new infra. Design: a `montree_global_visual_memory` keyed by
  work_key, populated from teacher-CONFIRMED standard-work IDs across all schools, injected as a FALLBACK
  when the classroom moat is empty → **no cold starts**. Hard parts (why it's an upper-model job):
  poison/abuse resistance, cross-tenant privacy (scrub child refs from `visual_description`, standard
  works only, consent — this repo had a cross-tenant fix THIS session), description robustness, retrieval
  cost, trust math. Cheap bootstrap: seed the global pool from Whale Class's mature 65+ entries.
  **Recommendation: Fable designs the architecture (Task B), then Sonnet builds it 3x3x3.**

---

## 🚨 SESSION — Jul 3, 2026 (Cowork, pt 3) — CROSS-TENANT SECURITY FIX + PHOTO-QUEUE DEATH-SPIRAL + MENU CLEANUP + PWA APP-MODE LAUNCH

**Canonical handoff: `docs/handoffs/SESSION_CROSS_TENANT_QUEUE_MENU_JUL3.md` — READ FIRST.**
4 commits on main (`311d3ee5` → `1dd30e7d` → `da770a21` → `0581ee14`), Railway deployed.
No migrations. Plus 2 prod DB ops via the pooler (stray-child delete + menu seed).

- **🚨 CRITICAL FIXED — cross-tenant child creation.** `POST /children` AND `POST
  /children/bulk` accepted a body `classroomId` with only an EXISTENCE check — never
  verified `classroom.school_id === auth.schoolId`. Real incident: "Marina" written into
  Whale Class on Jul 1 23:49 UTC during the Bayan's Home signup (stale localStorage
  `montree_session` supplied the old classroomId; server accepted). Both routes now 403
  + `[SECURITY]` log. Stray Marina row (`f5d06fa0`, zero dependents verified) DELETED
  from prod. **RULE: any route that WRITES under a client-supplied classroomId MUST
  verify classroom ownership — existence ≠ ownership.** ⚠ Open: ~40 more routes touch
  classroomId without an obvious check (most scope via JWT) — walk the write paths in a
  dedicated audit.
- **Photo "queue full" on new accounts — death spiral fixed.** The offline photo queue
  (IndexedDB) is per-BROWSER, not per-account. Foreign-school entries 403'd on upload
  (`school_id mismatch`), `uploadEntry` treated every 403 as AUTH_EXPIRED and HALTED the
  whole sync loop → queue never drained → 200 cap → capture bricked in the Safari tab
  (installed PWA = separate storage, kept working). Fixes in
  `lib/montree/offline/sync-manager.ts`: NEW `purgeForeignEntries()` in the queue-full
  path (self-heals), `syncQueue` filters to the active school, `school_id mismatch` 403
  → `permanent_failure` + `SCHOOL_MISMATCH` (never halts sync), `aggressiveCleanup`
  gained a stale >7d failed/pending last-resort tier. Capture toast no longer blanket-
  labels every enqueue error as "queue full" — real `err.message` surfaces. ⏳ Tredoux
  to retest capture on the new account.
- **Menu cleanup (Tredoux spec).** New-user default = **Wrap Up → Parent Manager →
  Notes → Guru → Manage Students, that's it** (`MINIMAL_DEFAULT_MENU` reordered).
  **Games RETIRED from all teacher-facing nav** (More menu, MENU_REGISTRY, Settings
  tile, Tools card — routes stay on disk; `sanitizeMenuConfig` drops the id from saved
  configs). Meeting Notes hidden (re-enable per teacher via Menu Management). **Root
  cause of the cluttered menu on his new account: the seed only existed in
  try/instant's teacher branch — principal-created teachers got no seed.** Seed now on
  EVERY teacher-creation path (principal setup ×2, admin add-teacher, classroom
  add-teacher, try/instant both branches). **RULE: new teacher-creation routes MUST
  seed `settings.menu`.** Sarah's Bright Stars row seeded directly in prod. ❓ Open:
  parent dashboard API still returns games links to parents — strip or keep?
- **PWA app-mode launch.** Home-screen opens landed on the marketing splash. Splash now
  redirects standalone-mode sessions to their surface (teacher→dashboard,
  principal→admin, parent→parent dashboard; localStorage first, cookie fallback).
  In-page redirect (NOT manifest) because iOS bakes `start_url` at install time — fixes
  already-installed icons. Browser visits untouched.
- **Ops notes:** sandbox git commits hit `Operation not permitted` on `.git` lock files
  — commit+push via Desktop Commander with `rm -f .git/index.lock .git/HEAD.lock`
  first. Pooler DB access from the sandbox works via repo `node_modules/pg` (host
  `aws-1-ap-southeast-1.pooler.supabase.com:5432`, user `postgres.dmfncjjtsoxrnvcdnvjq`,
  password from `.env.local`). Whale Class roster is now 22 active children.
- **Onboarding choice screen demoted to a one-time post-import moment (`e13ae634`).**
  The "How would you like to get started?" takeover used to probe
  `/onboarding/voice/status` on EVERY dashboard load and hijack the screen whenever any
  child lacked a mental profile — one student = get-started face on every login (the
  localStorage skip flag never stuck across Safari/PWA silos). Probe deleted; the
  takeover now fires only in-session right after `onImported` bumps
  `pendingOnboardingCount`. Returning logins ALWAYS land on the class dashboard. Voice
  onboarding stays reachable via TellGuruCard + direct `/dashboard/voice-onboarding`
  nav. Bonus: one fewer API round-trip per dashboard load.
- **Next:** 5-step device verification (handoff §Verification); signup client-state
  hard reset (wipe stale localStorage on new-account creation); classroomId write-path
  audit; parent-games decision.

## 🎯 SESSION — Jul 3, 2026 (Cowork, pt 2) — REBRAND: GOLD DAMASCUS M — SHIPPED + LIVE-VERIFIED

**The official Montree logo is now the gold damascus serif "M" on deep forest green
(`#03261D`). The teal sprout is RETIRED everywhere.** Full detail:
`docs/handoffs/SESSION_REBRAND_GOLD_M_JUL3.md`. Commits `c4106137` (47 files: master
`public/Montree Logo - M.png` 2048², all favicons/PWA/apple-touch/SVG-wrapper/native
icons, `MonteeLogo.tsx` rewritten — same API, renders `public/brand/m-tile.png` /
`m-mark.png`, 58 usages across 25+ screens updated with zero call-site changes,
marketing images, `docs/marketing/social-pack/` + `~/Desktop/Montree Social Media
Pack/` + `~/Desktop/Montree Douyin Avatar.png`) + `de54fd07` (**SW cache bump v10→v11**
— montree-sw serves `/montree-icons/` cache-first; without the bump installed PWAs
keep the sprout forever; Tredoux caught it live on his phone). Live-verified:
`montree.xyz/montree-icons/icon-192.png` serves the M. ⚠️ Gotchas recorded: Turbopack
requires ICO-embedded PNGs in RGBA (PIL default RGB broke `next build`); iPhone
home-screen icons never refresh — remove + re-add. `MONTREE_BRAND_PALETTE.md` updated
+ now tracked. Open: Douyin avatar upload (file on Desktop); optional wordmark lockup;
optional manifest screenshot regen.

## 🎯 SESSION — Jul 3, 2026 (Cowork) — CHINA OUTREACH CODE SYSTEM — SHIPPED + VERIFIED LIVE

**2 commits on main (`363f6c6d`, `967fc9f3`), Railway deployed, migrations 279 + 279b RUN by
Claude via the Supabase pooler (aws-1-ap-southeast-1.pooler.supabase.com:5432 — direct db host
still dead; .env DATABASE_URL points at the dead host, rewrite user to `postgres.<ref>` on the
pooler). End-to-end runtime-verified on production, test data cleaned up.**

Every school in the 95-school China cold-email list has a unique code (`CN-ETON-001` format).
Cold email carries `https://montree.xyz/welcome/{code}` → personalized greeting + visit tracking
→ `montree_ref` cookie (90d) → principal register pre-fills an optional referral field → on
signup the outreach row flips `registered` + links the school id.

- **Table `montree_outreach_schools`** (migration 279): status not_contacted|emailed|visited|
  registered, visit_count, timestamps, contact_email/name/notes. RLS deny-all (service role
  only). Atomic visit RPC `montree_outreach_record_visit(p_code)` — case-insensitive, never
  downgrades 'registered'; REVOKEd from anon/authenticated per 276 posture.
- **Seed 279b**: 95 rows WITH researched emails (3 parallel web agents, Jul 3). HQ email lives
  ONLY on the flagship code per network (CN-ETON-001, CN-HONG-001, CN-NEBU-001, CN-WEIM-001,
  CN-HTD-001); sibling campuses carry pointer notes — never blast 50 Etonkids campuses.
- **Key intel**: Hongwen = Montessori Academy = Far East Horizon (ONE email info@hongwenfeh.com
  covers both brands + likely MICC); Kidtopia CN-BEIJ-001 = CN-KIDT-001 (same school,
  kidtopia2012@163.com); Etonkids HQ fresh email 4008189098@etonkids.com (old liqian@ bounced);
  Guidepost HK regional admissions@guidepost.hk; ⚠ MSB Beijing (info@msb.edu.cn) + Guidepost
  Shanghai already contacted in the Apr 2026 campaign — follow up, don't cold-send. No email
  exists for: HTD (forms/hotline only), Learn Room, Alpha SH, JJB GZ, Radcliffe, CN-QING-002.
  Campaign sheet: `docs/outreach/China_Outreach_Emails_Jul2026.xlsx`.
- **Pages/routes**: `app/welcome/[code]/page.tsx` (server component, direct RPC — no internal
  HTTP; force-dynamic; noindex; garbage codes render generic page + write nothing) +
  `RefCookie.tsx`; `lib/montree/outreach/redeem.ts` (fire-and-forget, idempotent, never blocks
  registration) wired into `/api/montree/principal/register`; optional referral field on
  `/montree/principal/register` (2 i18n keys × 12 locales, parity 100%); super-admin **🎯
  Outreach tab** (`OutreachCodesTab.tsx` + `/api/montree/super-admin/outreach-codes` GET/PATCH
  mark_emailed — stamps emailed_at, only promotes from not_contacted).
- **🚨 Middleware allow-list catch (the runtime-audit win)**: unknown paths on montree.xyz 307
  → `/` for anonymous visitors — `/welcome` had to be added to `publicPaths` in middleware.ts
  or every cold-email click bounced. Lint/tsc could never catch this; the live curl did. Rule:
  ANY new anonymous top-level page route MUST be added to middleware `publicPaths`.
- **Verified live**: valid code greets by name + increments count; refresh re-increments;
  lowercase code works; garbage → generic 200, zero writes; e2e registration with referral code
  → row registered + school linked; then test school deleted + rows reset to pristine.

## 📚 SESSION — Jul 2, 2026 (Cowork) — 26-WEEK SOUND CURRICULUM (next year's classroom English) — Weeks 1+2 BUILT

**Canonical handoff: `docs/handoffs/SESSION_CURRICULUM_26WEEK_JUL2.md` — READ FIRST to resume.**
**Framework: `docs/curriculum/26_WEEK_SOUND_CURRICULUM.md` (spine for all 26 weeks + locked rules + pipeline).**

Tredoux's own phonics curriculum for next school year — one letter/sound per week in a custom
utility-first order (A→T→M→C→S→N→P→I→H→D→O→G→B→E→R→U→F→L→W→J→K→V→Y→X→Qu→Z). Each letter unlocks
a word (a→at→mat→cat…) → a real sentence → 2 dark-trap Suno songs + a book + a full Montessori
printable pack. 26 weeks = 26 books + an album + a complete English shelf.

- **🚨 CONTENT project, NOT app code.** Specs + build scripts in `docs/curriculum/` (committed);
  physical outputs (PDFs/mp3s/MJ images) live in `~/Desktop/English Curriculum 2026/Week NN/` (NOT git).
- **✅ Week 1 (A) + Week 2 (T) fully built**: books (*It's a…* + *Where Is Segina?*), 3 Suno tracks,
  full packs (worksheets w/ stroke arrows, 3-part cards, sentence strips, dictionary journals
  color+trace+write, SVG coloring pages, matching sheets, bingo 6 boards + duplex calling cards,
  vowel wall, t/not-t sort labels, hand-drawn SVG Big Map A3 color + colorable versions).
- **Assembly line**: `docs/curriculum/tools/build_weekNN_{book,pack}.py` → HTML → headless-Chrome
  PDF. Printables use HIS generator house formats (card-generator print-utils 7.5cm squares +
  21×6.5 sentence strips, picture-bingo duplex geometry short-edge flip, #2D5A27 frames, Comic
  Sans); books = dark forest #0a1a0f + Andika + gold word-of-week + author mark.
- **Locked rules**: Segina = peg-doll girl based on real student's outfit (print "Segina", Suno
  lyrics "Sejeena" phonetic); TWO songs/week (sound song stutter pattern "T-t-turtle!" + word
  song frame); one pattern per song; asset-manifest-first (exact filenames + MJ prompts in the
  week file before building); potato is a permanent bingo joke tile; sound work (Dwyer I Spy +
  sandpaper trace→say→match) every week, pure initial-sound lists with exclusions flagged.
- **NEXT: Week 3 — M · mat/am · prepositions · *On the Mat* (last teacher-read book). Then
  Week 4 — C · cat — FIRST DECODABLE BOOK (*The Cat Is on the Mat*, the levitating cat, digraph
  th + sight words the/is, the cast begins).**

---

## 🚨 NEXT SESSION — QUEUED BUILD: Lyf Coach Family Model (Tredoux, queued Jun 20 eve)

**Canonical plan: `docs/handoffs/LYF_COACH_FAMILY_MODEL_PLAN.md` — READ THIS FIRST.** Tredoux wants to build the family model on both fronts in ONE session (the model takes priority over the App Store version). Two products: (A) Lyf Coach individual (exists); (B) **Lyf Coach Family** — mum + dad + up to 2 kids, each with their own absolutely-private coach + a **one-way parent → child's-coach context link**. His private family system = Product B dogfooded, built FIRST.

**🔒 The non-negotiable principle (do NOT relitigate):** the child's coach conversation is **sealed by architecture — never readable by parent or operator, even self-harm content.** Confidentiality is the engine. The parent channel is **WRITE-ONLY** (real-world observations → shape the coach's support of the child's *skills*), never a read path. The coach stays the child's ally *inside the sealed room* (steers a child in danger toward a trusted adult itself; never reports up). Substrate already exists: `lib/story/coach/` is already multi-space + E2E. **🚨 Public/App-Store child version is gated on COPPA/GDPR-K + Apple kids rules + child-psychologist + legal review — the private family version can move fast; the public one cannot ship naively.** Full architecture, build order, and open questions in the plan doc.

---

## 🔒 SESSION — Jul 1, 2026 (Cowork) — Supabase security lockdown + coach two-lens refocus + Ion fix + TikTok growth brains

**Canonical handoff:** `docs/handoffs/SESSION_SECURITY_AND_COACH_REFOCUS_JUL1.md`. **9 commits pushed across two repos, all Railway auto-deploying.**

- **🔒 Security: migrations 275–278 ALL RUN in prod by Tredoux.** Supabase linter flagged ~115 public tables with RLS off (session tokens, child profiles, finances). 275 = enable RLS on 118 tables + 4 views; 276 = pin search_path + revoke RPC execute from anon/authenticated; 277 = drop ~25 "USING(true)" permissive policies (kept `parent_signups` public insert); 278 = stop public-bucket file listing. App unaffected (server uses service-role key → bypasses RLS). **Breach check: only 6 accounts, all family — no compromise.** 🚨 STILL OPEN: rotate anon+service keys + force re-login (session-token residual); comp Bayan/family (entitlement TODO); re-run Security Advisor. Watch `child_work_completion` realtime after deploy.
- **🧠 Coach refocus (Montree) `f14d37a1`:** killed the every-turn 15-framework dump (8,940→607 chars; now on-demand via consult_wisdom), re-centered the prime directive on the PERSON (heal + reach goals), demoted chief-of-staff to a tool, presence-before-action, Stoic temperament. Two operating lenses (psychology + self-help). Verified live.
- **🪪 "Who's Ion?" fix `4290a08c`:** coach forgot its own name because nightly Haiku consolidation pruned it (no coach-name field). Pinned in `about-bayan.md` + general system-prompt identity rule + consolidation now protects identity. (Proper fix later: `coach_name` column + UI.)
- **📈 TikTok brains:** `tiktok_growth` module + master-upgraded `video-scripts.md` added to montree (`81dfbc40`, on-demand) AND lyfcoach-web (`a02b04d`,`b93e1c3`, purpose-scoped). Decided positions: story-only (product never in-video), volume beats a cold algorithm, 12–20s. Content deliverables (100 hooks, scripts, growth-specialist module, QR, zoom MP4) in `~/Downloads`.

---

> **Archived 2026-07-06:** session blocks from Apr 23 – Jun 24, 2026 (Sessions 55–141 + Cowork sessions) moved to `docs/CLAUDE_MD_HISTORY.md`. Standing sections (Campaign Manager protocol, Marketing Video Campaign, Pink Readers, May-29 Turbopack styled-jsx rule) were KEPT below. Consult the history file for full session detail.

---

## 🎬 MARKETING VIDEO CAMPAIGN (active — started May 24, 2026)

**🚨 Canonical handoff: `docs/handoffs/MONTREE_CAMPAIGN_HANDOFF.md`. Scripts: `Montree_Campaign_Video_Scripts.md`. Read the handoff to pick this up.**

A 13-video marketing campaign (1 front-page hero + 12 feature videos) for TikTok / Reels / Shorts / LinkedIn. This is **video marketing** — NOT the email Campaign Manager / Outreach Protocol below (that's school email outreach).

- **Tool:** Colossyan Creator, driven by a browser-Claude. Talking-head format — one avatar (default + "GB - Riley" voice), clean background, no B-roll.
- **Built:** super-admin "📣 Campaign" tab (Campaign Command Center). 🚨 `migrations/231_campaign_command_center.sql` PENDING the user's Supabase run.
- **Status:** all 13 scripts written + the hero approved; nothing built in Colossyan yet. To make a video, hand a browser-Claude section 2 of the scripts doc (the brief) + that video's section.
- **Decision locked:** no AI agent in super-admin — not worth the API cost for a solo operator. The Campaign Command Center is a plain tool, not an AI.

---

## 📚 PINK READERS — Decodable reader series (SHIPPED — May 24, 2026)

A graded series of 15 **decodable readers** for the Pink Phase (UFLI L5–53) —
real little story books where every word is phonics already taught or a heart
word already introduced. Fills the gap between the lesson content's isolated
sentence cards and "a real book."

- **Status: COMPLETE & SHIPPED.** All 15 books (`docs/readers/Book_01`–`Book_15`)
  + `Teacher_Guide.md` + `Canva_Production_Guide.md` written, decodability-
  audited, and assembled into `public/pink-readers.html` (neutral branding).
  Wired as an amber "Pink Readers" card on the language-area library page
  (`app/montree/library/language-area/page.tsx`).
- **Verification:** every book passed a word-by-word programmatic audit —
  inventory↔text exact match, letter-timing vs gate, heart-word timing, plus a
  vowel-team / digraph / -ng / -ing scan. All 15 clean. Hand-audited per book
  while writing.
- **Build note:** `public/pink-readers.html` is generated from the 15 `.md`
  books + 2 guides by a markdown→HTML assembly script (kept in session
  outputs, not git). If a book `.md` changes, regenerate the HTML page.
- **Working titles refined for decodability** (originals used undecodable
  words): B5 "Sam Can Read"→"A Big Nap"; B7 "Cat? Cot? Cut!"→"Cat? Cot? Cup?";
  B12 "Stop! Spin! Splash?"→"The Pup on the Sled"; B13 "The Green Frog"→"The
  Frog and the Crab"; B15 "Sam Is a Reader"→"The Big Pink Trip".
- **Companion — Pink Phase Sound Songs (SHIPPED):** a Suno-ready circle-time
  song for every Pink Phase lesson — 49 songs, L5–53 — in
  `docs/readers/Pink_Phase_Songs.md`, shipped as `public/pink-phase-songs.html`
  with a violet "Pink Sound Songs" card on the language-area library page. Each
  song drills one lesson's target sound and sings a handful of its words; songs
  are heard not decoded, so connective lyrics use free ESL-friendly English.
  Audited — 49 songs, every listed word sung. Generated from the `.md` by
  `build_pink_songs.py` (session outputs, not git); regenerate the HTML if the
  `.md` changes.
- **The law:** `docs/readers/Pink_Readers_SERIES_PLAN.md` (the bible) +
  `public/language-area-lessons.html` (the canonical per-lesson word inventory
  every word is checked against). Iron rule: a child never meets an undecodable
  word.

---

## 📮 CAMPAIGN MANAGER — Outreach Protocol (replaces GMass as of Apr 19, 2026)

**🚨 THIS IS A STANDING INSTRUCTION FOR EVERY SESSION. READ THIS FIRST. 🚨**

**🚨 STANDING ORDERS (Tredoux, Jul 7 2026 — SOLID MEMORY, do not forget):**
- **Volume: 50 drafts/day** (supersedes the Jul-6 "20/day ramp" cap — Tredoux's explicit call: "I need to get through the volume"). Follow-ups count toward and take PRIORITY within the 50. Never queue more drafts than the daily budget.
- **Weekly follow-up cycle: every outreach email unanswered after 7 days gets a follow-up on the SAME thread, repeating weekly — HARD VALVE at 3 unanswered follow-ups** → stop drafting, surface the contact on a "keep or kill" list for Tredoux's call (protects deliverability; never silently mail a dead thread forever).
- **Comb Gmail EVERY day.** Automated: scheduled task `daily-campaign-sweep` (Cowork, 07:07 daily — file: ~/Documents/Claude/Scheduled/daily-campaign-sweep/SKILL.md) does replies/bounces/follow-ups/new-drafts/status-flips + morning report. Runs only while the Cowork app is open — if it didn't run, do the sweep manually per its steps.
- **Status flips: ALWAYS via `scripts/outreach-status.py` (CLI over montree.xyz API). Never Chrome-drive the 🌍 tab for statuses.**

Claude is Tredoux's outreach campaign manager. GMass is retired. The workflow is:
- **Claude drafts** personalized emails as Gmail drafts (50/day target)
- **Tredoux reviews** each draft in Gmail and hits Send
- **Claude monitors** Gmail for replies and drafts responses
- **Tredoux handles** appointment setting personally — everything else is Claude's job

### The Daily Routine (EVERY SESSION)

When the user says anything like "what's happening with the campaign", "campaign update", "outreach status", or starts a new session:

1. **Check Gmail for replies** — `search_threads` for replies to outreach emails (search: `subject:Montree OR subject:"Montessori Teacher" newer_than:7d -from:me`)
2. **Check for bounces** — `search_threads` for `from:mailer-daemon newer_than:3d`, extract bounced emails, mark in DB as `status='bounced'`
3. **Report status** — How many sent, how many in queue, any new replies, any bounces. Pull live totals from `montree_outreach_contacts`.
4. **Draft replies** to any new responses (professional, warm, push toward a demo call). Put draft replies in Gmail for Tredoux to review and send.
5. **Draft the next batch of 50** — Pick up to 50 contacts from the DB queue (`status='new'`, `email_status != 'bounced'`, `email_status != 'invalid'`), personalize the sacred email for each, create Gmail drafts via `create_draft`
6. **Update the DB** — Mark drafted contacts as `status='drafted'`, log to `montree_outreach_log`
7. **Bounce recovery** — For any new bounces, research correct emails via web search, update DB, re-draft

### Two-Track Outreach: Schools + Multiplier Partners

**Track 1 — Schools (individual_school):** Direct Montree pitch. The sacred email, personalized. Goal: demo call → free pilot → conversion.

**Track 2 — Multiplier Partners:** Institutes, training centers, associations, and franchises that work WITH Montessori schools. One partnership can reach dozens or hundreds of schools. These are MORE valuable than individual school contacts.

**Multiplier types** (from Outreach Hub at `/montree/super-admin/marketing/outreach-hub`):
- `multiplier_association` — 🏛 National/international Montessori associations (e.g., FAMM Argentina, SAMA South Africa)
- `multiplier_training` — 🎓 Teacher training centers (e.g., Montessori CH, MELF, Kidtopia Beijing)
- `multiplier_franchise` — 🏢 Multi-campus networks (e.g., Guidepost HK, Etonkids China)
- `multiplier_consultant` — 💼 Independent Montessori consultants

**Key insight (discovered Session 40):** Replies from "we're not a school" are the BEST replies. FAMM Argentina (AMI Foundation + Training Center) replied asking for pricing, AMI compatibility info, and CV — they collaborate with "numerous educational institutions." Montessori CH (Training Center) also replied. These contacts get a DIFFERENT email — not the sacred school pitch, but a partnership-framed message emphasizing how Montree can be a tool for their trainees/member schools.

**When a multiplier replies:**
- Draft a partnership-oriented response (not the school pitch)
- Emphasize: revenue share for every school they help onboard, Montree as a training tool for their graduates, AMI-compatible curriculum tracking
- Push toward a demo call
- Mark as `status='replied'` with `reply_summary` in DB

### How to Draft Outreach Emails

Use `mcp__f0875e82-fdd3-4aed-b646-de80b534357f__create_draft` with `isHtml: false` (plain text only — HTML drafts via API show raw tags in Gmail compose).

**🚨 PRE-SEND DUPLICATE CHECK (MANDATORY — Session 46 rule, extended Session 50):**
Before creating ANY draft — **cold outreach OR reply** — search `to:DOMAIN in:sent` via `search_threads` for EVERY recipient. The DB `status` field is NOT reliable for dedup — GMass Campaigns C/D sent to ~335 schools not tracked in the DB, and context-loss sessions have created drafts for already-contacted schools. Session 46 found 20 of 52 drafts were duplicates. **Session 50 proved this also applies to REPLY drafts**: Jakarta Montessori had already been emailed 4 times + 2 reply drafts sent earlier in the same session, but context compaction lost visibility, and a 5th duplicate was nearly created. A duplicate cold email signals "mass spam" and kills the lead. A duplicate reply signals incompetence.

**Personalization**: Each email MUST be customized for the recipient. Use the contact's `org_name`, `country`, `contact_person`, and any `notes` to tailor the opening line. The sacred email body stays the same but the greeting and any contextual hook should be specific.

**Subject line**: `Montree` for schools. For multiplier partners, customize based on the relationship type (e.g., `Montree — Partnership for [Country] Montessori Schools`).

**Always send a test to self first** when drafting a new template variant. Verify formatting before creating the batch.

### The Sacred Emails (DO NOT rewrite without user approval)

**PRIMARY — Montree Pitch (~155 words):**
```
Subject: Montree

Dear [School Name / Contact Person],

I'd like to introduce something I've built that I believe represents the next step in the Montessori classroom.

It's called Montree.

A teacher takes a picture of a child working. The system does the rest.

It identifies the work, records the observation, tracks the child's progress, and determines what should come next. It lifts the administrative weight off teachers so they can return to what actually matters — the children, the classroom, the craft.

It writes personalised progress reports for parents. Not templates. Genuine, detailed accounts of what their child is learning and why.

And it gives the principal a complete view of the school — every classroom, every child — with a built-in Montessori expert and developmental psychologist on hand to answer any parent's question instantly.

This wasn't possible before. Now it is.

If you'd like to see it, I'd be glad to show you.

Kind regards,
Tredoux
montree.xyz
```

**SECONDARY — Job Application (~70 words):**
```
Subject: Montessori Teacher & Builder

Dear [School Name],

My name is Tredoux. I'm an AMS-certified Montessori teacher for ages 3–6, and I also built Montree — the first AI-powered classroom management system designed specifically for Montessori schools.

I'm looking for my next classroom. If you need a qualified teacher who can also bring your school into the future of Montessori education, I'd love to talk.

Kind regards,
Tredoux
montree.xyz
```

**Follow-up 1** (5 days after initial, subject becomes `Re: Montree`):
> I wanted to make sure my previous email found its way to you. I'd welcome the chance to show you what Montree can do for your school.
> Kind regards, Tredoux / montree.xyz

**Follow-up 2** (10 days after initial):
> I understand how busy things can get running a school. If Montree isn't the right fit for you, no problem at all. But if you're curious, I'm happy to arrange a quick demonstration at a time that works for you. Either way, I wish you and your school all the best.
> Kind regards, Tredoux / montree.xyz

### Database & Tracking

- **Source of truth**: `montree_outreach_contacts` table in Supabase (536 contacts seeded Apr 19)
- **Status flow**: `new` → `drafted` (Gmail draft created) → `sent` (user sent from Gmail) → `replied` / `bounced` / `follow_up` → `converted` / `dead`
- **Activity log**: `montree_outreach_log` table — every action logged with timestamp
- **Campaign Manager UI**: `/montree/super-admin/marketing/campaign-manager` — live dashboard
- **Outreach Hub UI**: `/montree/super-admin/marketing/outreach-hub` — multiplier partner + school CRM with pipeline view, contact types, priority levels, and `est_schools_reached` per multiplier
- **API**: `/api/montree/super-admin/campaign-manager` — GET stats, PATCH status updates
- **API**: `/api/montree/super-admin/outreach` — GET stats/contacts/log for Outreach Hub
- **Master spreadsheet**: `whale/Montree_Master_Outreach.xlsx` — 1,135 schools (785 global + 350 China). 507 MX-verified and deliverable. NOTE: This is a DIFFERENT data source than `montree_outreach_contacts` (536 rows). The spreadsheet has more schools but not all are in the DB yet.

### Gmail Tools Available

- `create_draft` — create drafts (plain text, `isHtml: false`)
- `search_threads` — find reply threads
- `get_thread` — read full thread content
- `list_drafts` — check existing drafts

### GMass Legacy (RETIRED)

GMass campaigns A/C/D are historical. Campaign C sent 335 blank emails (Session 12 disaster). Campaign D was the correction. Campaign A (Montree pitch) was scheduled for Apr 27 but is now superseded by the Campaign Manager workflow. All future outreach goes through Claude + Gmail drafts. GMass is no longer used.

**🚨 NEVER automate email sending.** Claude creates drafts only. Tredoux reviews and sends every email manually. This prevents another blank-email disaster.

### Active Reply Threads (as of May 7, 2026 — updated Session 94 from full Gmail audit)

**🚨 Session 94 corrections to lead state — three "hot leads" in Sessions 71-87 were misclassified:**
- **Ardtona House** is DEAD, not a hot trial-request lead. Valerie sent a final "hard no" on May 5 ("My teachers were not interested"). Don't email further.
- **Paint Pots Montessori at `paintpotsmontessori@outlook.com`** is a DEAD ADDRESS — the email bounced "Address not found" on Apr 30. The real Paint Pots contact is **Jessica Dilhe** at `jessica@paint-pots.co.uk` (Nursery Manager, multi-location group). She got the Montree pitch + CV Apr 12, you nudged Apr 19. No reply since. NOT a hot demo request.
- **Montessori Copenhagen at `info@montessori-cph.dk`** — wrong email. Real address is **`info@montessorischool.dk`**. Head of School **Karin Schurian Rosenø** received the corrected pitch Apr 12 + Apr 21. NO reply. Treat as cold lead awaiting first response.

**🔥 HOT — Multiplier Partners (real, awaiting reply):**
- **FAMM Argentina (Marisa Canova de Sioli, marisa@fundacionmontessori.org)** — AMI Foundation + Training Center. Replied Apr 23 *"it'll take me a few more days... we're definitely interested."* Tredoux nudged Apr 24 (Spanish translation now live) + May 5 (gentle nudge). AWAITING RESPONSE. **#1 multiplier lead — let it breathe; no further nudge until after May 14.**
- **Cambridge Montessori Global (Manish Goyal, info@jalsaventures.com)** — Replied Apr 20 *"Let us know more about it please!"* Tredoux replied with full overview + tier breakdown + demo CTA. AWAITING RESPONSE. Follow up around May 10-12 if no reply.

**🔥 HOT — School Leads (genuinely awaiting follow-up):**
- **Otari School NZ (principal@otari.school.nz, forwarded to Susan West Acting Principal)** — Sabbatical auto-reply received May 5. Susan should respond. **Follow up around May 12-14 if no response.**
- **Lions Gate Montessori (Ingrid, info@lionsgatemontessori.org)** — School of 200+ families across three campuses. Auto-reply May 5 acknowledged the message. Awaiting actual reply.
- **Montessori Norge (Nina Johansen, nina.johansen@montessorinorge.no)** — Out of office returned May 6. **Follow-up window OPEN — can re-nudge any time from May 7 onward.**

**🔥 HOT — Indian schools (sent CV + Montree pitch, awaiting reply):**
- **The Ardee School, India (Sunpritt Dang, phone 9718902010)** — Tredoux contacted via WhatsApp.
- **I Cube Montessori, India (reachus@icubemontessori.com)** — Tredoux sent CV + Montree pitch Apr 14. No reply since.
- **Meraki Montessori, India (management@merakimontessori.in)** — Tredoux sent CV Apr 13. No reply since.
- **Ace Montessori, India (+91 9663373111)** — Direct phone contact.
- **Village Montessori, SC (info@villagemontessori.com)** — Resurrected (Session 47). Tredoux sent resume.
- **Paint Pots Montessori, UK (Jessica Dilhe, jessica@paint-pots.co.uk)** — Multi-location group. Asked for CV Apr 10. Tredoux sent CV + Montree pitch Apr 12 + nudged Apr 19. No reply since. **Worth one more gentle nudge.**

**⚠️ PIVOTED — Declined teaching, Tredoux pivoted to Montree pitch (awaiting reply):**
- **Remuera NZ (Shenali, info@remueramontessori.co.nz)** — Fully staffed. Tredoux pivoted to Montree Apr 13. No reply.
- **Prerana Montessori, India (preranamontessori2002@gmail.com)** — No vacancy. Tredoux pivoted to Montree.

**⏸ COLD / AWAITING FIRST RESPONSE (no actual reply yet):**
- **Montessori Copenhagen (Karin Schurian Rosenø, info@montessorischool.dk)** — Pitch sent Apr 12 + Apr 21. No reply. Worth one more follow-up.
- **Montessori CH (kurs@montessori-ch.ch)** — Replied Apr 14 they're a training center, no classrooms. Could re-pitch as training-tool partner.

**💡 COMPETITIVE INTEL:**
- **Jakarta Montessori School (admission@jakartamontessori.com)** — Uses **Montessori Compass** (competitor). Active in SE Asia. No further follow-up.

**❌ DEAD (8 total — Ardtona added Session 94):**
- **Ardtona House Montessori, UK (vheavey@ardtonahouseschool.ie)** — Valerie: "It is a hard no. My teachers were not interested." (May 5)
- **Montessori Aotearoa NZ (ce@montessori.org.nz)** — Board declined. "Not something we wish to explore."
- **Melville Montessori (jacqui@melvillemontessori.co.za)** — No longer owns school or lives in SA.
- **Kakuozan Montessori (information@kakuozan-preschool.com)** — "Not Montessori."
- **Sonnberg Austria (sabine@am-sonnberg.com)** — Position filled. Graceful close. NOT IN DB.
- **Al Qamar Academy, BestStart Montessori, CHOW Montessori** — No response / dead leads.

**📭 BOUNCED ADDRESSES (Apr 22-30, May 5 — need DB cleanup):**
Wave 1 sends bounced for these addresses. None of these are flagged as `bounced` in `montree_outreach_contacts` yet:
- `paintpotsmontessori@outlook.com` (use jessica@paint-pots.co.uk instead)
- `admin@littleexplorersami.com` (inbox full May 5)
- `info@mmigroup.co.uk` (server misconfigured)
- `info@koniskorea.com`, `info@alshamelah.com`, `info@alnebras.com`, `info@indomontessori.com` (server rejection)
- `info@madridmontessori.es`, `info@giis.org`, `info@giisabudhabi.com`, `info@childrensoasis.ae`, `info@monecole.me`, `info@jawahirvp.com`, `info@ciminternational.com`, `syed@jawahirvp.com` (domain not found)

**📝 DRAFTS sitting unsent (as of Session 94):**
- **Pamela @ Vistra HK (yanyuan.pan@vistra.com)** — finance export structure + 7 questions for HK profits-tax. Draft `19dfd400`. ✅ SENT in Session 94 per Tredoux's confirmation.

---

---

## 🚨 ARCHITECTURAL RULE LOCKED IN — May 29, 2026 (post-Session 135 build-failure debug)

**Turbopack rejects `<style jsx>` tags that aren't at the top-level of their component's return statement.** ALL 12 deploys between commits `0e9a3c89` and `9a7a2e4f` failed with the same error — `Detected nested styled-jsx tag at app/montree/admin/parents/[parentId]/meetings/new/page.tsx:719:13` — because Phase B's record-meeting page wrapped 3 styled-jsx blocks inside conditional render branches. Phase A's voice-onboard page had 2 more in the same pattern.

**Rule:** `<style jsx>` tags MUST be the DIRECT child of the outermost return-statement `<div>`. NEVER inside a conditional render branch like `{stage === 'X' && (...)}` or `{loading ? <Spinner/> : <Content/>}`.

**When a keyframe / media query needs to live deep in the JSX tree:**
```tsx
{/* 🚨 Turbopack rejects nested <style jsx>. Inline via
    dangerouslySetInnerHTML — same runtime effect. */}
<style
  dangerouslySetInnerHTML={{
    __html: `@keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }`,
  }}
/>
```

This pattern is now canonical in `app/montree/admin/parents/[parentId]/{meetings/new,onboard}/page.tsx`, `app/montree/admin/child/[childId]/page.tsx`, and `app/admin/english-guide/page.tsx`. Fixes shipped in commits `537bb4a4` + `1ef1d58d`.

**For ANY new keyframe, media query, or scoped CSS:** if it lives inside a conditional render branch, use `<style dangerouslySetInnerHTML>` — not `<style jsx>`. Even `<style jsx global>` fails when nested. The 30+ files that currently use `<style jsx>` at the top-level of their return are fine; don't touch them.

---

---

> **Sessions 3–54 archived** to `docs/CLAUDE_MD_HISTORY.md` on 2026-04-26. Consult that file for historical context.

---

## KEY ARCHITECTURAL DECISIONS

- **CLIP/SigLIP — PERMANENTLY REMOVED (Apr 4, 2026).** Stub files remain for type exports only. All functions are no-ops. Production uses Haiku two-pass exclusively.
- **Smart Capture** uses two-pass describe-then-match: Pass 1 (Haiku + image) describes what's seen, Pass 2 (Haiku + text) matches to curriculum. Sonnet fallback if both fail.
- **Photo identification cost:** ~$0.006/photo via Haiku two-pass pipeline.
- **Per-classroom visual memory** self-learning system (THE MOAT — Session 6 completed all 3 loops): three paths feed `montree_visual_memory`:
  - (1) "Teach the AI" button uses Sonnet to generate 5-field descriptions (visual_description, parent_description, why_it_matters, key_materials, negative_descriptions) stored with source='teacher_setup', confidence=1.0.
  - (2) "Fix" corrections (Loop 1) now APPEND a rich fingerprint via `enrichVisualMemoryFromCorrection()` in `corrections/route.ts` — prefers cached `sonnet_draft.visual_description` from `montree_media` (free, rich), falls back to fresh Haiku call. Multi-fingerprint accumulation in `visual_description` column with `||` separator, capped 2500 chars FIFO. Source='correction', confidence=0.95. ALSO appends a negative example to the original (wrong) work's `negative_descriptions[]` array.
  - (3) Auto-generated onboarding/first_capture descriptions (confidence=0.8) are NOT injected into Pass 2 — they caused bias reinforcement.
- **Pass 2** loads up to 30 entries, filters to teacher-validated (`teacher_setup` ≥1.0 OR `correction` ≥0.9 OR `is_custom=true`), renders LOOKS LIKE / KEY MATERIALS / DISTINGUISH FROM blocks at TOP of prompt.
- **Pass 3** (Loop 3, Session 6) — Sonnet discriminator on low-confidence Pass 2 results (`matchScore < 0.7 OR input.confidence < 0.5`, requires ≥2 candidates with at least 1 having visual memory). Top 3 candidates rendered as A/B/C blocks with visual memory, Sonnet picks via tool_use. Cost ramps DOWN over time as corpus grows.
- **Hidden moat**: NO UI exposes the corpus. Competitors copying the app see a clean Montessori tracker; the intelligence is invisible and grows in slow motion from real classroom use.
- **Guru** uses Sonnet for all users (teachers + parents). Haiku for daily coach features. Self-improving brain system grows from every conversation.
- **All client-facing photo URLs** use Cloudflare-cached proxy (`getProxyUrl()`). Server-to-server URLs use direct Supabase.
- **Cross-pollination security:** Every route accepting `child_id` MUST call `verifyChildBelongsToSchool()`. No exceptions.
- **i18n:** 1,490+ keys, perfect EN/ZH parity. Custom React Context system (`useI18n()` hook).
- **Feature flags:** `montree_feature_definitions` + `montree_school_features` + `montree_classroom_features`. `FeaturesProvider` context in dashboard layout. `useFeatures()` hook with `isEnabled(key)`. Fail-closed (all off if fetch fails). Dashboard sections gated: `daily_brief`, `intelligence_panels`, `teacher_tools`, `shelf_autopilot`, `paperwork_tracker`, `weekly_admin_docs`. New schools get clean minimal view. Super-admin ⚙️ button per school to toggle.

---

## Database

### Supabase
- URL: `https://dmfncjjtsoxrnvcdnvjq.supabase.co`
- Both localhost and production use THIS SAME database
- Service role key used everywhere (bypasses RLS)

### Key Tables
- `montree_schools`, `montree_classrooms`, `montree_children`, `montree_teachers`
- `montree_works`, `montree_child_work_progress` (alias: `montree_child_progress`)
- `montree_parent_invites` — 6-char invite codes for parent access
- `montree_report_media` — junction table linking reports to selected photos
- `montree_media_children` — links group photos to multiple children
- `montree_guru_interactions` — uses `asked_at` (NOT `created_at`) as timestamp column
- `montree_child_mental_profiles`, `montree_behavioral_observations`
- `montree_child_extras` — explicitly-added extra works per child (UNIQUE child_id+work_name)
- `montree_visual_memory` — per-classroom visual descriptions (UNIQUE classroom_id+work_name)
- `montree_guru_corrections` — teacher corrections to Smart Capture identifications
- `montree_community_works` — public community works library
- `montree_teacher_notes` — has `child_id` column for per-child tagging
- `montree_visitors` — site-wide visitor tracking for outreach monitoring
- `montree_attendance_override`, `montree_stale_work_dismissals`, `montree_conference_notes`
- `montree_weekly_pulse_locks` — prevents concurrent Pulse generation
- `montree_super_admin_audit` — central security audit log
- `montree_rate_limit_logs` — DB-backed rate limiting
- `story_users`, `story_admin_users` — Story system auth (bcrypt hashes)
- `story_login_logs`, `story_admin_login_logs` — Story login tracking (column: `login_at`)
- `story_online_sessions` — heartbeat-based online detection

### Whale Class Data
- School ID: `c6280fae-567c-45ed-ad4d-934eae79aabc` (Tredoux House)
- Classroom ID: `51e7adb6-cd18-4e03-b707-eceb0a1d2e69` (Whale Class)
- **Principal: Principal Leu** (handed over from Tredoux on May 28, 2026 — SQL landed Session 134; row id `16eec1c0-bfb5-4edf-a160-059bb41803fb`; login `XVYHHX`; email `principal-leu@whale-class.local` placeholder — `whale-class.local` is a reserved TLD that never resolves to real mail). Astra memories from before the handover are still attached to this `principal_id` — they now belong to Principal Leu's memory stream. Wipe with `DELETE FROM montree_principal_memory WHERE principal_id = '16eec1c0-bfb5-4edf-a160-059bb41803fb';` if Leu wants a fresh start.
- **Lead teacher: Tredoux** (login `V8F8V9` on `montree_teachers`, founder of the school, now operating purely as the classroom teacher).
- 20 students: Amy, Austin, Eric, Gengerlyn, Hayden, Henry, Jimmy, Joey, Kayla, Kevin, KK, Leo, Lucky, MaoMao, MingXi, NiuNiu, Rachel, Segina, Stella, YueZe

---

## Environment Variables (Railway + .env.local)

See `.env.example` for the full template. All vars below must be set in Railway production.

```
# --- Core Auth ---
ADMIN_SECRET=...              # REQUIRED — JWT signing for Whale Class admin (lib/auth.ts)
ADMIN_USERNAME=...            # Whale Class admin display name
ADMIN_PASSWORD=...            # Whale Class admin password
SUPER_ADMIN_PASSWORD=...      # REQUIRED — Montree super-admin + Whale Class "Tredoux" login
TEACHER_ADMIN_PASSWORD=...    # REQUIRED — Whale Class "Teacher" login
STORY_JWT_SECRET=...          # REQUIRED — Story JWT signing (lib/story-db.ts)

# --- Supabase ---
NEXT_PUBLIC_SUPABASE_URL=https://dmfncjjtsoxrnvcdnvjq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=...              # PostgreSQL pooler connection string

# --- Encryption ---
MESSAGE_ENCRYPTION_KEY=...    # REQUIRED — Exactly 32 chars for AES-256 (lib/message-encryption.ts)
VAULT_PASSWORD=...            # REQUIRED — Vault file encrypt/decrypt (vault routes)
VAULT_PASSWORD_HASH=...       # REQUIRED — bcrypt hash for vault unlock (vault/unlock/route.ts)

# --- External APIs ---
ANTHROPIC_API_KEY=...         # Claude API (Guru advisor)
OPENAI_API_KEY=...            # Whisper transcription + TTS
NEXT_PUBLIC_YOUTUBE_API_KEY=... # YouTube Data API

# --- Email ---
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
```

---

## Key Routes

### Teacher Portal
| Route | Purpose |
|-------|---------|
| `/montree/login` | Teacher login (6-char code or email+password) |
| `/montree/dashboard` | Class list + intelligence panels (attendance, stale works, conference notes, evidence, pulse) |
| `/montree/dashboard/[childId]` | Child week view |
| `/montree/dashboard/[childId]/gallery` | Photo gallery + report workspace |
| `/montree/dashboard/curriculum` | 5 area cards + Teaching Tools |
| `/montree/dashboard/capture` | Photo/video capture |
| `/montree/dashboard/guru` | AI teacher advisor |
| `/montree/dashboard/photo-audit` | Classroom-wide photo audit with corrections |
| `/montree/dashboard/classroom-setup` | "Teach the AI" — Sonnet describes materials |
| `/montree/dashboard/notes` | Dedicated teacher notes page (with child tagging) |
| `/montree/dashboard/raz` | RAZ Reading Tracker |
| `/montree/library/photo-bank` | Photo bank with export-to-tool feature |

### Parent Portal
| Route | Purpose |
|-------|---------|
| `/montree/parent` | Login (enter invite code) |
| `/montree/parent/dashboard` | Parent home |
| `/montree/parent/report/[reportId]` | View report |

### Admin
| Route | Purpose |
|-------|---------|
| `/admin` | Admin tools hub (card generators, etc.) |
| `/montree/super-admin` | Super admin panel (schools, leads, visitors, community) |
| `/montree/admin/guru` | Principal admin guru (12 tools, school-scoped) |

---

## Authentication

7 auth systems. Teacher/principal tokens use httpOnly cookies.

| System | How | Used By |
|--------|-----|---------|
| Teacher login | 6-char code (SHA256) or email+bcrypt → httpOnly cookie (`montree-auth`) | `/api/montree/auth/teacher` |
| Principal login | Code or email+bcrypt → httpOnly cookie (`montree-auth`) | `/api/montree/principal/login` |
| Parent access | Invite code → cookie (`montree_parent_session`) | `/api/montree/parent/auth/access-code` |
| Admin JWT | `jose` library, `ADMIN_SECRET`, httpOnly cookie (`admin-token`) | `lib/auth.ts` |
| Super admin | Password (timing-safe compare) + JWT session tokens | `lib/verify-super-admin.ts` |
| Story auth | Separate JWT system | `lib/story-auth.ts` |
| Multi-auth | Another separate system | `lib/auth-multi.ts` |

**Montree auth flow:** Login → JWT → httpOnly cookie `montree-auth` → `verifySchoolRequest()` reads cookie → extracts userId, schoolId, classroomId, role. Client `montreeApi()` relies on cookie auto-sending.

**Key auth files:** `lib/montree/server-auth.ts`, `lib/montree/verify-request.ts`, `lib/montree/api.ts`

---

## Supabase Client (Consolidated)

Single client: `lib/supabase-client.ts` — singleton with retry logic.
- `getSupabase()` — service role (server-side, bypasses RLS)
- `createSupabaseClient()` — anon key (browser-side)
- Also exports: `getPublicUrl()`, `getSupabaseUrl()`, storage bucket constants

---

## Curriculum System

5 area JSON files in `lib/curriculum/data/`: `language.json` (43 works), `practical_life.json`, `sensorial.json`, `mathematics.json`, `cultural.json`. Total: 329 works.

---

## Guru System (AI Teacher Advisor)

**Core files:**
- `lib/montree/guru/conversational-prompt.ts` — persona builder (teacher=violet, parent=botanical green)
- `lib/montree/guru/context-builder.ts` — child context
- `lib/montree/guru/tool-definitions.ts` — 12 teacher tools + `getToolsForMode()`
- `lib/montree/guru/tool-executor.ts` — tool execution handlers
- `lib/montree/guru/question-classifier.ts` — regex classifier for selective knowledge injection
- `lib/montree/guru/brain.ts` — self-improving brain (extraction, consolidation, retrieval)
- `lib/montree/guru/skill-graph.ts` — V3 skill-exercise mapping, bridge detection, attention flags
- `app/api/montree/guru/route.ts` — main chat endpoint
- `app/api/montree/guru/photo-insight/route.ts` — Smart Capture (two-pass Haiku)
- `app/api/montree/guru/corrections/route.ts` — teacher corrections
- `components/montree/guru/GuruChatThread.tsx` — shared chat UI

**Principal Admin Guru:** `lib/montree/admin/guru-*.ts` — 12 school-scoped tools, SSE streaming.
**Super-Admin Guru:** `lib/montree/super-admin/guru-prompt.ts` — 15 tools across all schools.

---

## Report & Photo System

```
Teacher Preview → Select Photos → montree_report_media junction table
Publish → send/route.ts queries junction → Creates final report
Parent View → parent/report/[id]/route.ts queries junction
```

Description matching uses area-constrained whole-word matching. Custom works (`work_key` starts with `custom_`) don't auto-match.

---

## Dashboard Intelligence Layer (Teacher OS)

5 panels below student grid: Attendance, Stale Works, Conference Notes, Evidence, Pulse. Daily Brief panel above grid with priority-ranked action items. All powered by `/api/montree/intelligence/daily-brief`.

---

## Local Development

```bash
cd ~/whale
npm run dev
# Access at http://localhost:3000
```

Both local and production connect to the SAME Supabase database.

---

## Important Patterns

- **`.single()` → `.maybeSingle()`** — Always use `.maybeSingle()` for queries that might return 0 rows. `.single()` throws on 0 rows.
- **`.ilike()` SQL injection** — Escape `%`, `_`, `\` before any `.ilike()` call: `.replace(/[%_\\]/g, '\\$&')`
- **JSON-before-OK** — Always check `response.ok` BEFORE calling `response.json()`. Server may return HTML error pages.
- **Fire-and-forget `.catch()`** — Always add `.catch(err => console.error(...))` — never empty `.catch(() => {})`.
- **Supabase `.rpc()` has no `.catch()`** — Use `.then(({ error }) => ...)` instead.
- **`montree_guru_interactions` uses `asked_at`** not `created_at` as its timestamp column.
- **AbortController cleanup** — All `useEffect` fetches should have AbortController + cleanup on unmount.

---

## Migrations Run (production)

**Jun 12→13 2026 overnight marathon — ⏳ 2 migrations STAGED on branch `burn-jun12-night2`, pending Tredoux's Supabase run (whale-class project):**
- ⏳ `254_missing_tables_batch.sql` (mirror: `db/RUN_THESE/07`) — `montree_campaign_items` ONLY (unblocks Campaign Command Center, currently 503s). RLS enabled, idempotent. Appendix documents 20 missing tables deliberately NOT staged (dead features / wrong-name bugs / superseded legacy).
- ⏳ `255_push_outbox_and_prefs.sql` — `montree_push_outbox` (durable push retry queue) + `montree_parents.notification_prefs JSONB DEFAULT '{}'`. RLS house-style. Push code degrades gracefully (warn-once no-op) until run.
(Latest RUN migrations: 252+253 on Jun 12 — games progress + outreach, verified RLS. 249 from Jun 10 night still unconfirmed — check before running.)

All migrations through 169 have been run. Key ones: 147 (smart learning columns), 148 (classroom onboarding), 152-154 (teacher OS foundation), 155 (teacher OS foundation DDL), 156 (visitor tracking), 157 (teacher notes child_id), 158 (paperwork_current_week), 159 (teacher_confirmed media), 160 (dashboard feature gates + Whale Class enabled), 161 (enable weekly_admin_docs for Whale Class), 164 (cropped_storage_path on montree_media — run Apr 7 via Supabase SQL editor), 169 (guide_content_zh JSONB on montree_classroom_curriculum_works — run Apr 11). **Migration 166 (`montree_global_works_staging`) still pending** from prior session. The Apr 7 self-learning loop SQL also added safety-net columns to `montree_visual_memory` (negative_descriptions, key_materials, description_confidence, source, source_media_id, photo_url, updated_at) — all `IF NOT EXISTS`, idempotent. **Apr 12**: `story_message_history.is_from_admin BOOLEAN DEFAULT FALSE` added via Supabase SQL Editor (migration `20260118_story_session_linking.sql` was in git but never run).

**Session 78 (Apr 30, 2026) — curriculum translation pipeline migrations run via Supabase SQL Editor:**
- `180_create_curriculum_translations_global.sql` — global translation library table (8 columns, ~3,948 rows after seed).
- `181_add_school_primary_locale.sql` — `primary_locale` + `secondary_locales[]` on `montree_schools`. Whale Class set to `en+[zh]`. Two existing schools manually updated post-migration: Школа Монтессорі (Tamі) → `uk`, Chen school → `de`.
- `182_apply_global_translations_function.sql` — `apply_global_translations(uuid)` Postgres function (11 per-locale UPDATE blocks, COALESCE-safe, SECURITY DEFINER, GRANT EXECUTE to anon/authenticated/service_role).
- **Bonus column-add ALTER TABLE** (not in a numbered migration file — run inline) — added 36 missing locale columns to `montree_classroom_curriculum_works`: `parent_description_<locale>` and `why_it_matters_<locale>` for de/fr/pt/nl/it/ja/ko/uk/ru. The 9 newer locales had `name_*` and `guide_content_*` columns from prior sessions but were missing the description columns. Idempotent via `ADD COLUMN IF NOT EXISTS`.

**Session 87 (May 4, 2026) — Principal Vault migration run via Supabase SQL Editor:**
- `185_principal_vault.sql` — `montree_principal_vault` table for end-to-end encrypted parent-meeting recordings. 12 columns (id, principal_id, school_id, salt_b64, iv_b64, ciphertext_b64, pbkdf2_iterations, cipher_version, recorded_at, duration_seconds, created_at, updated_at). Indexed on `(principal_id, recorded_at DESC)` and `(school_id)`. FK cascades from `montree_school_admins` and `montree_schools`. Plus the `update_principal_vault_updated_at()` trigger function for auto-bumping `updated_at` on row UPDATE. Verified by user with the 12-column information_schema query.

**Session 98 (May 10, 2026, 12:11–12:12 PM) — Parent Messaging + Principal login_code migrations run via Supabase SQL Editor:**
- ✅ `193_parent_messaging_feature.sql` — adds `parent_messaging` to `montree_feature_definitions` with `default_enabled=false`. Idempotent. Verified via `SELECT feature_key, default_enabled FROM montree_feature_definitions WHERE feature_key = 'parent_messaging'` → 1 row returned. Schools opt in individually via super-admin.
- ✅ `194_school_admin_login_code.sql` — adds `login_code TEXT` column to `montree_school_admins` + partial unique index `idx_school_admins_login_code_unique`. Reverses Session 84's "principal codes are never persisted" rule. Verified via `SELECT column_name FROM information_schema.columns WHERE table_name = 'montree_school_admins' AND column_name = 'login_code'` → returned `login_code`. Idempotent via `ADD COLUMN IF NOT EXISTS` and `CREATE UNIQUE INDEX IF NOT EXISTS`.

**Session 99 (May 10, 2026, 16:30) — Astra persistent memory migration RUN:**
- ✅ `195_principal_memory.sql` — `montree_principal_memory` table (15 columns) + 4 partial indexes (`idx_principal_memory_active`, `_type`, `_child`, `_teacher`) + `supersede_and_insert_memory()` Postgres function (SECURITY DEFINER, GRANT EXECUTE to anon/authenticated/service_role). Idempotent. **CONFIRMED RUN May 10, 2026 16:30 — "Success. No rows returned".** Astra's `remember_this` / `recall_memory` tools are now active in production. `loadActiveMemories()` returns up to 30 most-recent active memories, injected into the system prompt every turn. Stop telling future sessions to run this — it's done.

**Session 103 (May 11, 2026, 17:45) — Web Vitals telemetry migration RUN:**
- ✅ `196_perf_vitals.sql` — `montree_perf_vitals` table (12 columns) + 3 partial indexes (`idx_perf_vitals_metric_route`, `_school`, `_recent`). No FK on `school_id` by design — measurements are append-only telemetry; school deletes must not wipe historical baseline data. Idempotent. **CONFIRMED RUN May 11, 2026 17:45 — "Success. No rows returned".** `POST /api/montree/perf/vitals` now persists Core Web Vitals (LCP, INP, CLS, FCP, TTFB) tagged with route + role + school_id + connection. Client-side `<WebVitalsReporter />` reports via `sendBeacon` on every route change. Stop telling future sessions to run this — it's done.

**Session 108 (May 13, 2026) — Agent system Phases 3 + 4 migrations RUN:**
- ✅ `203_agent_applications.sql` — extends `montree_outreach_contacts` with `application_details JSONB` column, `agent_application` in `contact_type` CHECK, `agent_applied` + `declined` in `status` CHECK (preserves prior values including `demo_requested`/`contacted`/`not_interested` from migration 183). Partial index on pending applications. **CONFIRMED RUN — "Success. No rows returned".** Phase 3 inbound application pipeline now live.
- ✅ `204_agent_super_admin_messaging.sql` — extends 4 messaging CHECK constraints (`thread_type`, `created_by_role`, `participant_role`, `sender_role`) to include `agent_super_admin` / `super_admin`. Drops NOT NULL on `montree_message_threads.school_id` + adds gated CHECK (only `agent_super_admin` threads may have NULL school_id; every other type stays mandatorily school-scoped). Partial index on `agent_super_admin` inbox lookups. **CONFIRMED RUN — "Success. No rows returned".** Phase 4 agent↔super-admin threaded messaging schema live. Stop telling future sessions to run these — they're done.

**Session 109 (May 13, 2026) — Manual payout architecture + financial books foundation. ⏳ 4 migrations pending Tredoux's Supabase run:**
- ⏳ `205_agent_payout_method.sql` — `montree_teachers.payout_method` (CHECK IN 'stripe_connect','manual_wire'), `manual_payout_details` JSONB, `manual_payout_details_updated_at` TIMESTAMPTZ. Partial index on active manual_wire agents. Idempotent. **REQUIRED for 💸 button + agent /payouts manual_wire branch.**
- ⏳ `206_period_locks.sql` — `montree_period_locks` table (period_month PK in YYYY-MM, closed_at, closed_by, notes, timestamps + trigger). Partial index on closed periods. Idempotent. **REQUIRED for Close month / Reopen UI + assertPeriodOpen() guards on wire routes.**
- ⏳ `207_agent_tax_form.sql` — `montree_teachers.tax_form_url`, `tax_form_type` (CHECK IN 'w8ben','w8ben_e','w9','jurisdiction_other','declaration_attached'), `tax_form_uploaded_at`, `tax_residency_country` (ISO2), `is_us_person`. Partial index on agents missing tax form. Idempotent. **REQUIRED for tax-form scaffold + future first-payout gate.**
- ⏳ `208_xero_sync_log.sql` — `montree_xero_sync_log` table (finance_tx_id, xero_object_type CHECK IN 'Invoice','Bill','BankTransaction','ManualJournal','CreditNote', xero_object_id, status, error, attempt, timestamps). Partial UNIQUE index on (finance_tx_id, xero_object_type) WHERE status='success' for idempotency. Recent + failures indexes. Idempotent. **REQUIRED for Xero sync engine; sync stays INACTIVE without XERO_CLIENT_ID/SECRET/TENANT_ID/REFRESH_TOKEN env vars regardless of migration state.**

**Session 111 (May 14, 2026) — Inbound payments three-rail billing. ⏳ 1 migration pending Tredoux's Supabase run:**
- ⏳ `209_school_payment_method.sql` — `montree_schools.payment_method` (CHECK IN 'stripe_subscription','alipay_invoice','manual_invoice'), `manual_invoice_details` JSONB, `manual_invoice_details_updated_at` TIMESTAMPTZ, `billing_cadence` (CHECK IN 'monthly','annual'), `next_invoice_due_at` TIMESTAMPTZ. Two partial indexes (`idx_schools_alipay_active` for daily cron pickup, `idx_schools_manual_invoice_active` for super-admin filter). Idempotent BEGIN/COMMIT. **REQUIRED for 💳 button (PaymentConfigModal PATCH) + alipay invoice cron + manual ⚡ Wire route + record-incoming-wire idempotency. Until run, payment-config 500s on PATCH (column does not exist) and the new 💳 + ⚡ buttons surface but are non-functional. Existing Stripe subscription path unchanged.**

**Session 114 (May 17, 2026) — Parent meeting notes (audio-free). ✅ Migration RUN Session 121 (May 20, 2026):**
- ✅ `214_meeting_notes.sql` — **RUN May 20, 2026.** `montree_meeting_notes` table live for teacher-side parent-meeting notes. Columns: `id`, `school_id`, `classroom_id`, `teacher_id`, `child_id` (nullable), `child_name`, `meeting_date`, `summary` (required), `transcript` (optional), `notes`, `duration_seconds`, `locale`, `parent_visible` (default FALSE), `shared_to_thread_id` (FK to `montree_message_threads`), `created_at`, `updated_at` + auto-bump trigger. Three indexes (per-teacher, per-child where child_id IS NOT NULL, per-school). Teacher Meeting Notes save path at `/montree/dashboard/conversations` now fully functional.
- ✅ `215_meeting_notes_principal_author.sql` — **RUN May 20, 2026.** Extends `montree_meeting_notes` to support principal authors. Drops NOT NULL on `teacher_id`, adds `principal_id` FK to `montree_school_admins` with ON DELETE CASCADE, adds `meeting_notes_author_check` CHECK constraint enforcing exactly-one-of-(teacher_id, principal_id), plus partial index `idx_meeting_notes_principal` on principal-authored rows. Principal Meeting Notes at `/montree/admin/meeting-notes` now fully functional.
- ✅ Agent default share % backfill — **RUN May 20, 2026.** `UPDATE montree_teachers SET agent_default_share_pct = 20 WHERE is_agent = true AND agent_default_share_pct IS NULL;` — existing NULL-pct agents now inherit the 20% default introduced in commit `cd33058a`. Self-service code generation no longer hits the "disabled" wall for existing agents.

**Session 118 (May 19, 2026) — Photo pipeline v2 (4-fix bundle). ✅ Migration RUN:**
- ✅ `224_photo_pipeline_v2_flag.sql` — single-row INSERT into `montree_feature_definitions` adding `photo_pipeline_v2` with `default_enabled = TRUE`. Gates the 4-fix bundle: (A) `is_curriculum_work=false` routing requires `confidence >= 0.80`, (B) visual memory budget 50KB/100 → 20KB/40, (C) `top_candidates` carried through to sonnet_drafted writes, (D) age-decay weighting on visual memory ordering. Idempotent (`ON CONFLICT DO UPDATE`). **CONFIRMED RUN May 19, 2026 13:01** — verified via `SELECT feature_key, name, default_enabled FROM montree_feature_definitions WHERE feature_key = 'photo_pipeline_v2'` → 1 row returned (`photo_pipeline_v2 | Photo Pipeline v2 | true`). Initial run hit `null value in column "name"` because the first version of the migration omitted the required `name` column — patched in commit `301458f2`. Per-school rollback: `UPDATE montree_school_features SET enabled=false WHERE school_id='X' AND feature_key='photo_pipeline_v2';`

**Session 119 (May 19–20, 2026) — English Progress Tracker. ✅ Migration RUN Session 121 (May 20, 2026):**
- ✅ `225_child_english_progress.sql` — `montree_child_english_progress` table live. UNIQUE(child_id), current_phase pink/blue/green, current_lesson 1-128, mastered_lessons int[], audit trail. English Progress tab on Classroom Overview fully functional.

**Session 121 (May 20-21, 2026) — Application-layer AES-256-GCM encryption. ✅ Migration RUN:**
- ✅ `226_montree_encryption_v1.sql` — **RUN May 21, 2026.** `encryption_version INTEGER` columns live on `montree_thread_messages`, `montree_meeting_notes`, `montree_appointment_recordings` (verified via information_schema query — all 3 present). `encryption_v1` feature flag inserted into `montree_feature_definitions`, then flipped ON by Tredoux. Encryption code re-applied & live. Only remaining step: confirm `MONTREE_ENCRYPTION_KEY` (32-char hex) is set in Railway — without it, writes safely fall back to plaintext + loud-log. Operations playbook: `docs/handoffs/MONTREE_ENCRYPTION_RUNBOOK.md`.

**Session 129 (May 26, 2026) — Calendar reframe + Class Progress + audit marathon. NO new migrations.** Reframed `/montree/calendar` as events + appointments only (5 student-progress adapters disabled in registry), new Class Progress 4th tab on Classroom Overview (no DB migration — reads existing `montree_media` + `montree_classroom_curriculum_works` + `montree_children`), opened terms API gate to teachers (`canManageTerms` accepts teacher OR principal OR super_admin). Web-Claude's Term creation tests this session worked end-to-end, **confirming `montree_school_terms` table is live in production** (Session 128's migration 233 either ran already at some point or the table existed from elsewhere). Stop telling future sessions migration 233 is pending — it isn't.

**Session 128 (May 25, 2026) — Universal Calendar foundations. ✅ Migration RUN (verified Session 129):**
- ✅ `233_school_terms_and_timezone.sql` — `timezone TEXT` column on `montree_schools` + `montree_school_terms` table (id, school_id, name, start_date, end_date, created_at, updated_at + CHECK end_date >= start_date + 2 indexes (school_id, school+window) + `montree_school_terms_touch_updated_at()` trigger). Idempotent. **Verified live via Web-Claude end-to-end Term creation test in Session 129** — POST `/api/montree/school/terms` returned 200, term row inserted, violet dot rendered on calendar grid. Either ran successfully at some point or the underlying table existed before this migration was needed.

**Session Jul 4, 2026 (Cowork, late) — Wrap Up optional tabs. ✅ Migration RUN (confirmed by Tredoux):**
- ✅ `283_wrap_up_optional_tabs.sql` — inserts two `montree_feature_definitions` rows: `wrap_discussion` (Discussion Tab, category `management`, default_enabled FALSE) + `wrap_get_advice` (Get Advice Tab, category `ai_tools`, default_enabled FALSE), then enables BOTH for Whale Class (`montree_school_features`, school via classroom `51e7adb6-cd18-4e03-b707-eceb0a1d2e69`). Idempotent (`ON CONFLICT DO UPDATE`). Gates the Discussion + Get Advice tabs on the Wrap Up / photo-audit surface (Weekly Admin already gated by the pre-existing `weekly_admin_docs` flag from migration 149). Fail-closed: both tabs vanish everywhere (incl. Whale) until this runs, which is why it re-enables Whale. **RUN + confirmed Jul 4, 2026.**

**Session 136 (May 30, 2026) — Marketing site portrait rebuild + English-area materials LOOP. NO new migrations.**
- **Splash + Explainer rebuilt portrait / mobile-first.** Splash hero (`app/montree/page.tsx`) = split layout (portrait 9:16 video LEFT, text RIGHT with a gold eyebrow anchor; collapses to centred stack ≤880px). EN hero is now the **MAIN EXPLAINER** film (`splash/montree-splash-video-v4.mp4`); 中文 = Astra (`…-zh-v3.mp4`). New **`/montree/explainer`** page (`app/montree/explainer/page.tsx`): hero (main explainer) + gallery of **11 feature films** — 10 live, `reading-tracker` still "coming soon"; **video 5 (child-profiles) removed**. "Explainer" nav link + teaser on splash.
- **Video pipeline:** HeyGen masters 1080×1920 → re-encode 720×1280 CRF26 faststart (~2–6MB) → upload to `montree-media/explainer/<slug>.mp4` (gallery) or `splash/…` (hero) via `SUPABASE_SERVICE_ROLE_KEY`. Uploads flake ("fetch failed") — scripts retry. To add a film: encode → upload → flip `available: true`. Scripts in `Montree_HeyGen_Scripts.md` (final MAIN EXPLAINER script included) + `Montree_HeyGen_Webclaud_Runbook.md`.
- **English-area materials LOOP (the big one).** The classroom curriculum and the Library generators are now JOINED. All **85 `PhonicsWordGroup`s** in `lib/montree/phonics/phonics-data.ts` got `lessonNums` (the `lesson-map.ts` lessons each teaches) + a stable `id` — `id` is now **required** on the interface (this fixed a latent per-group selection bug for Beginning/Blue/Green, where groups had no id and all shared `undefined`). 72/128 lessons resolve to groups (rest oral/review/morphology — intentional).
- **Resolvers** `lib/montree/english-sequence/lesson-materials.ts`: `getGroupsForLesson`, `getPhaseIdsForLesson`, `getLessonMaterials`, `getLessonScope`, `getLessonScopeForPhase`, `getReadingPhaseForLesson`, `lessonCoverage`. Lean `lesson-coverage.ts` (72-number Set + `hasLessonMaterials()`) so the dashboard gates UI without bundling phonics-data. **If you edit lessonNums, regenerate lesson-coverage.**
- **All 8 phonics-fast generators accept `?lesson=N`** (three-part-cards, pink/blue-box, labels, bingo, reverse-bingo, command-cards, sentence-cards, stories) — backward compatible with `?phase=`. New per-lesson **launcher** `app/montree/library/lesson/[lesson]/page.tsx` (shareable; every generator + lesson page/song/readers, deep-linked). English Progression tab → gated **"Make materials"** button → launcher for a child's `current_lesson`.
- **Curriculum doc** `docs/English_Corner_Curriculum_Revamp.md` (+ `.docx`): authentic Montessori prep→reading sequence, EAL-tuned (3–6, English as additional language) + independent-materials build list.
- Health: ESLint 0/0 on new files, i18n strict **12/12**, tsc clean on new modules, live routes 200 (`/montree`, `/montree/explainer`, `/montree/library/lesson/42`, generators `?lesson=`), media 206. Build green. `HANDOFF_LATEST.md` rewritten (was stale from Apr 30 / Session 76).
- Next: produce the `reading-tracker` explainer film; fold the prep stages (spoken language, sound games, sandpaper letters, moveable alphabet) into the trackable/launchable model so the launcher covers the foundation, not just the 72 reading lessons.

**Session 135 (May 28, 2026 evening) — Ultimate Astra Marathon. ⏳ 7 migrations pending Tredoux's Supabase run (numerical order, matters):**
- ⏳ `238_parent_profiles.sql` — `montree_parent_profiles` table (18 columns: archetypes[], cultural_register JSONB, preferred_language, known_triggers[], effective_moves[], relationship_temperature CHECK enum, family_context, priorities_for_child[], history_notes, meeting_count, last_meeting_date, last_thread_message_at, source CHECK enum, evaluated_by_role CHECK enum, evaluated_by_id, last_evaluated_at, timestamps). UNIQUE(parent_id, school_id). 2 indexes + auto-touch trigger.
- ⏳ `239_parent_meetings.sql` — `montree_parent_meetings` (lifecycle: planned/held/cancelled/needs_follow_up/closed) + meeting_type CHECK enum (parent_teacher_conference/intro/escalation/exit/behavioural/progress/other) + principal_id + teacher_id FKs + linked_dossier_id + outcome_notes + 2 indexes + touch trigger.
- ⏳ `240_parent_meeting_transcripts.sql` — encrypted-at-rest. `transcript_text_encrypted` ALWAYS `gcm:<iv>:<tag>:<ct>` format via existing `MONTREE_ENCRYPTION_KEY`. `audio_destroyed_at` audit-trail column proving audio buffer was dropped post-Whisper. 2 indexes.
- ⏳ `241_parent_meeting_analyses.sql` — Sonnet structured outputs (summary_markdown, parent_revealed[], commitments_made[], emotional_arc, triggers_observed[], moves_that_landed[], unresolved_threads[], recommended_follow_up, profile_update_proposals JSONB, corpus_extractions[] for Phase C, proposals_review_outcome CHECK enum). Partial index on unprocessed rows. **241 ALSO retro-adds `transcript_id` + `analysis_id` FKs on `montree_parent_meetings`** (forward refs not supported earlier).
- ⏳ `242_tracy_corpus.sql` — `CREATE EXTENSION IF NOT EXISTS vector` (pgvector) + `montree_tracy_corpus` table (insight_text CHECK 20-2000 chars, insight_type CHECK enum, applies_to JSONB, confidence NUMERIC 0-1, reference_count, last_referenced_at, superseded_by/superseded_at chain, embedding vector(1536), validated_at). 3 partial indexes (active, ranking, HNSW vector cosine).
- ⏳ `242b_tracy_corpus_search_fn.sql` — `tracy_corpus_search(p_school_id, p_query_embedding, p_archetype, p_min_similarity, p_limit)` SECURITY DEFINER RPC + `tracy_corpus_bump_references(p_ids[])` SECURITY DEFINER RPC. GRANT EXECUTE to anon/authenticated/service_role.
- ⏳ `243_parent_consent_flags.sql` — `montree_parents.recording_consent_on_file BOOLEAN DEFAULT FALSE` + `recording_consent_set_at` + `recording_consent_set_by` (audit columns) + `montree_parent_deletion_audit` FK-less table for delete-survives-cascade audit trail.

Until all 7 run: API routes return `migration_pending=true` gracefully; recording UI surfaces friendly fallback; `prepare_parent_meeting` still ships dossiers without parent-profile or corpus data; analyse route logs but doesn't crash on missing tables.

**Session 133 (May 28, 2026) — Mira & Astra dossier capability. ⏳ 1 migration STILL pending Tredoux's Supabase run (hash realignments + Leu rename DONE in Session 134):**
- ⏳ `237_meeting_dossiers.sql` — `montree_meeting_dossiers` table for the shared Astra + Mira dossier cache. 18 columns (id, owner_id, owner_role principal|agent, school_id nullable, audience_type parent_meeting|principal_pitch, audience_ref TEXT, cache_key SHA-256, meeting_purpose, parent_context, output_format markdown|html|json, payload_text, model_used, input/output_tokens, cost_usd, generation_ms, generated_at, expires_at +24h default). Three indexes (cache_lookup b-tree, owner_recent DESC, audience_recent DESC). `montree_purge_expired_dossiers()` SECURITY DEFINER function for >7-day cleanup. Idempotent. **Original attempt failed with PG 42P17 ('functions in index predicate must be marked IMMUTABLE') because of a `WHERE expires_at > NOW()` partial-index predicate — patched to plain b-tree.** Until run, dossiers generate fine but every reopen spends Sonnet again (~$0.05).
- ✅ **Principal hash-desync realignments — DONE Session 134.** Tredoux (`XVYHHX`) verified synced=true. Phillip Ahn realigned (login code now `NEWCODE`, not the original `RGCCQR` — got reset between sessions; synced=true either way).
- ✅ **Whale Class principal handover to Principal Leu — DONE Session 134.** Row id `16eec1c0-bfb5-4edf-a160-059bb41803fb` now `name='Principal Leu', email='principal-leu@whale-class.local'` (placeholder TLD — `whale-class.local` is reserved and never resolves), login XVYHHX, synced=true. The original `email = NULL` SQL failed because `montree_school_admins.email` has a NOT NULL constraint; resolved with the placeholder.

**Session 126 (May 22-23, 2026) — Story voice/video calls + Web Push. ✅ Both migrations RUN (verified May 23):**
- ✅ `228_story_calls.sql` — **RUN.** `story_calls` table (id, username, channel, status ringing/active/ended, `mode` voice/video, initiated_by, created_at, updated_at, ended_at) + partial index `idx_story_calls_user_active` + `story_calls_touch_updated_at()` trigger. Verified via the Supabase REST API — `story_calls` returns HTTP 200, `mode` column present. The "Could not start the call" 500 is resolved.
- ✅ `229_story_push_subscriptions.sql` — **RUN.** `story_push_subscriptions` table (id, username, endpoint UNIQUE, p256dh, auth, user_agent, created_at, last_used_at) + `idx_story_push_subs_username`. The Railway env vars `STORY_VAPID_PUBLIC_KEY` + `STORY_VAPID_PRIVATE_KEY` are also set — verified (`montree.xyz/api/story/push/public-key` → HTTP 200). Web Push is fully configured server-side.

Plus Session 119 agent backfill SQL (not a migration file, run separately in Supabase):
```sql
UPDATE montree_teachers
SET agent_default_share_pct = 20
WHERE is_agent = true AND agent_default_share_pct IS NULL;
```
Backfills NULL-pct agents to the new 20% default introduced in commit `cd33058a`. Without this, existing agents created before Session 119 still hit the "Self-service code generation disabled" wall.

**Cowork session (Jun 12, 2026, afternoon) — Native push notifications. ⏳ 1 migration pending Tredoux's Supabase run:**
- ⏳ `251_push_device_tokens.sql` (= `db/RUN_THESE/04_push_device_tokens.sql`) — `montree_device_tokens` table (token UNIQUE, platform ios|android, owner_type teacher|principal|parent, owner_id, school_id, app_version, timestamps, failed_at) + 2 partial indexes + **RLS ENABLED with no policies** (deny-all for anon; server uses service role — this line is an audit fix, don't run any earlier copy without it). Until run, `/api/montree/push/register` 500s with a logged 42P01 hint; everything else no-ops cleanly.
- Push architecture (for future sessions): `lib/montree/push/sender.ts` = server sender, FCM HTTP v1 (Android) + direct APNs over node:http2 (iOS, ES256 JWT — NOT the undici fetch, which can't do HTTP/2). `lib/montree/push-client.ts` + `components/montree/PushRegistrar.tsx` = native-shell registration, session-gated, mounted in dashboard/principal/parent layouts (layouts persist across router.push, so it retries per route change — don't "simplify" this back to run-once-on-mount, that breaks login-screen→dashboard flows). Wired into all 3 report-send routes, both thread-message directions, broadcasts. Env gates: `FIREBASE_SERVICE_ACCOUNT`; `APNS_AUTH_KEY`/`APNS_KEY_ID`/`APNS_TEAM_ID` (+ optional `APNS_BUNDLE_ID`, `APNS_ENV`). Known deferred item: sendApns opens one HTTP/2 connection per token — hoist a shared session when fan-out exceeds ~50 devices.
- Android: all 9 Capacitor plugins now synced into `android/` (gradle files committed; `assets/capacitor.plugins.json` regenerates on every `cap sync` and stays gitignored). Android PUSH additionally needs `android/app/google-services.json` (gradle applies google-services conditionally — safe when absent).
- Social guru: `lib/social-media-guru/knowledge/facebook-reels-playbook.md` — Facebook Reels rules override generic caption/hashtag formulas (≤4 hashtags, 8-10AM/5-7PM, draft-only).
- Full detail + commit SHAs: `HANDOFF_LATEST.md` Jun 12 afternoon entry.

**Cowork session (Jun 12, 2026, evening/night) — shipped + Apple enrolment 80%:**
- `burn-jun12` merged → main → LIVE: games progress endpoints (migrations 252+253 RUN
  with RLS), webhook inbox-first persistence (H5), legacy admin route scoping (M3).
  Latent gap: no UI sets `current_student_id` — games save without a child attached.
- App Store submission pack: `~/Desktop/Montree App Store Pack/` (listing, privacy
  labels, reviewer notes, screenshots, checklist). Tredoux still owes: demo school
  codes, a real /support page.
- guardian-connect `flutter-catchup-jun12` branch: UNMERGED, needs flutter analyze.
- **Apple Developer enrolment PINNED at 80%** — Apple ID `tredoux.montree@gmail.com`
  (region ZA, SA card attached, agreement signed). Web enrolment is HARD-BLOCKED by
  Apple (`UserIneligibleForWebEnrollment`) — resume = Apple Developer app on iPhone,
  passport scan, $99. Full resume script: HANDOFF_LATEST.md "Jun 12 late night".
  Key environment lesson: Apple SMS to +86 only works VPN-OFF (China routes); via
  VPN it rate-limits the number for ~90 min.

---

## Session History

Detailed session-by-session history (Feb–Apr 2026) is archived in `docs/CLAUDE_MD_HISTORY.md`. Consult that file for historical context on specific features or decisions.
