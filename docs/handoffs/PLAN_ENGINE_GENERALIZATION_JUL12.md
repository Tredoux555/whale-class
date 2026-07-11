# CONTRACT — ENGINE GENERALIZATION FOR LEVELS 2–3 — Jul 12, 2026

**Fable-authored binding contract (Phase B of `PLAN_CURRICULUM_LEVELS_2_3_JUL11.md`). Opus builds exactly
this; Sonnet fresh-eyes audits FIX FIRST; Level 1 render regression-gated before SHIP. The spine this
engine must serve is locked in `docs/curriculum/spec/MASTER_SPINE.md` (Jul 12 revision — read its Level
2/3 grids + word banks + Pattern Tree section before building).**

**Scope guard: NO content authoring, NO week-27+ JSON creation (that is Phase C). This phase makes the
engine ABLE to render W27–58 while keeping Level 1 output unchanged. All files under
`lib/montree/english-curriculum/` + `scripts/curriculum/`. Do not touch `lesson-map.ts` (FROZEN).**

---

## B1. `spec/types.ts` — type extensions

1. `soundType` union extends from `'vowel'|'consonant'|'digraph'` to add:
   `'blend' | 'vowel-team' | 'magic-e' | 'r-controlled' | 'diphthong' | 'morphology' | 'silent-letters'`.
2. `WeekSpec.level: 1 | 2 | 3` (currently effectively `level: 1`).
3. NEW optional `patternDisplay?: string` — the human form where `sound` alone is ambiguous
   (e.g. sound `"a_e"` → patternDisplay `"a_e"`; sound `"th"` → omit). Used by book kicker + Pattern Wall.
4. `materials.tracing` gains `mode?: 'letters' | 'pattern'` (default `'letters'` — absent field = Level 1
   behavior, byte-identical).
5. All extensions are ADDITIVE + optional-where-possible: every existing week-01..26.json must type-check
   and render with zero edits.

## B2. Tracing — pattern-card mode (`render/builders/tracing.ts` + `letter-strokes.ts`)

Current behavior works for contiguous a–z patterns (sh, ch, st — per-char glyph concatenation) and MUST
stay byte-identical for `mode:'letters'` (all Level 1). New `mode:'pattern'`:
- Color-coded Montessori pattern card: pattern letters RED, frame-word letters BLACK, silent letters
  (the e in a_e; k in kn; w in wr; b in mb) GREY with a soft halo.
- Driven by data, not hardcoding: the builder receives the pattern string (may contain `_` as the
  frame-slot marker, e.g. `a_e`) + the example words; it derives which glyphs are pattern/frame/silent.
- ONE implementation with a mode switch inside the existing builder — do NOT fork a second tracing file.
- Stroke-arrow glyphs come from the existing `letter-strokes.ts` a–z set; no new glyph art needed
  (patterns are compositions of existing letters).

## B3. Vowel wall → Pattern Wall (`render/builders/vowel-wall.ts`)

- Current regex cap `/^[a-z]{1,2}$/` rejects 3+ char sounds (igh, tch) — remove the cap via the
  generalization, not by widening the regex blindly.
- Generalize to a per-level wall: Level 1 = the existing 5-vowel wall (output BYTE-IDENTICAL —
  regression-gated); Level 2 = 16 pattern leaves (sh ch th ck+FLSZ ng wh s-bl l-bl r-bl fin-I fin-II
  a_e i_e o_e u_e/e_e softc/g+tch/dge); Level 3 = 16 leaves (ai/ay ee/ea oa/ow igh/ie ar or/ore er/ir/ur
  MIRROR(W50) oo ou/ow oi/oy ew/ue/au/aw y kn/wr/mb -ing/-ed/-s -tion).
- The leaf schedule is DATA (a const table keyed by week, sourced from MASTER_SPINE's grids), rendered as
  the "Pattern Tree" per the spine's celebration-mechanics section: L1 letters = trunk/roots, L2 = left
  branches, L3 = right branches/canopy, W50 = Mirror Leaf (ship|sheep), W58 = potato crown.
- Selection of L1-vs-tree rendering keys on `spec.level`, never on sound length.

## B4. Book cover kicker (`render/builders/book.ts` ~line 76)

Hardcoded `"WEEK N · THE LETTER {sound}"` → level-aware: level 1 unchanged (byte-identical); level 2/3 =
`"WEEK N · THE SOUND {patternDisplay ?? sound.toUpperCase()}"`. Morphology weeks (W57–58) read
`"WEEK N · THE ENDING {patternDisplay}"` — key on soundType `'morphology'`.

## B5. Validator — pattern-aware decodability (`scripts/curriculum/validate-specs.mjs`)

The heart of Phase B. Current gate letter-sums STRICT words; it must become pattern-decomposition:

1. **Cumulative pattern registry**, hardcoded const in the validator, keyed by week (ground truth =
   MASTER_SPINE grids): W27 sh · W28 ch · W29 th · W30 ck ff ll ss zz · W31 ng · W32 wh · W38 a_e ·
   W39 i_e · W40 o_e · W41 u_e e_e · W42 ce ci cy ge gi gy tch dge · W43 ai ay · W44 ee ea · W45 oa ow ·
   W46 igh ie · W47 ar · W48 or ore · W49 er ir ur · W51 oo · W52 ou ow(dup ok) · W53 oi oy ·
   W54 ew ue au aw · W55 y-final · W56 kn wr mb · W57 ing ed s es (suffixes) · W58 tion (suffix).
   Blends (W33–37) add NO registry entries — they are letter-sums by design.
2. **Decomposition algorithm** for a STRICT word at week W: greedy longest-match over the taught
   contiguous patterns + single letters, PLUS three special kinds:
   - `split-vce` (a_e/i_e/o_e/u_e/e_e): word ending V-consonant-e where that V's magic-e week ≤ W →
     consume all three. (Also applies mid-decomposition after suffix stripping.)
   - `suffix` (ing/ed/s/es W57; tion W58): strip the suffix, then the BASE must decompose at week W,
     with doubling-collapse (running→run) and e-restore (baking→bake) allowances.
   - `y-final` (W55): terminal y = vowel unit.
3. **Forbidden-before rules**: STRICT words containing `ce/ci/cy/ge/gi/gy` fail before W42 (soft c/g is
   a reading rule, not a grapheme — letter-sums would false-pass "ice"). Same mechanism bans kn/wr/mb
   words before W56 and any registered multi-char pattern's words before its week ONLY where letter-sums
   would false-pass (kn, wr, mb, igh already fail letter-sums? No — k,n,i,g,h are letters; the
   decomposition must therefore treat a word as decodable ONLY if its pronunciation-bearing pattern is
   taught. Pragmatic rule: if a STRICT word contains a registered pattern string as a substring, that
   pattern's week must be ≤ W, even though its letters are known. Apply to: igh, kn(initial), wr(initial),
   mb(final), tch, dge, ce/ci/cy/ge/gi/gy, tion.)
4. Accept the new soundTypes; require `level`; require `patternDisplay` when `sound` contains `_` or
   length > 2; enforce that a week's `sound` matches the registry schedule for that week number.
5. Keep every existing Level 1 check byte-for-byte (26 weeks must still exit 0 unchanged).
6. Add validator SELF-TEST fixtures (in-file, run with `--self-test`): ship@27 pass / ship@26 fail ·
   catch@42 pass / catch@41 fail · cake@38 pass (split-vce) / cake@37 fail · ice@42 pass / ice@41 fail
   (forbidden-before) · night@46 pass / night@45 fail · running@57 pass (doubling) · celebration@58 pass ·
   my@55 pass / my@54 fail (y-final) · know@56 pass / know@45 fail · hand@36 pass (letter-sum, no
   registry needed) · bell@30 pass / bell@29 fail (ll).

## B6. `spec/index.ts` — registration + interop

1. Extend `weekToLessonMap` for W27–58 NOW (pure data; exact values in MASTER_SPINE
   "Week→lesson-map equivalence W27–58"). lesson-map.ts itself untouched.
2. WEEK_LOADERS: do NOT pre-register week-27..58 loaders for files that don't exist (import would
   throw). Instead add a loud comment block at the WEEK_LOADERS table documenting the Phase C rule
   ("new week JSON = 1 WEEK_LOADERS line or it's invisible") with the 27–58 lines pre-written but
   commented out, ready to uncomment as each spec lands.

## B7. Untouched (audited generic — verify, don't modify)

`render/builders/assets.ts`, bingo, 3-part cards, sentence strips, matching, dictionary journal,
coloring, qr-cards, geometry. Keep the `htmlToPdf` 0-byte hard-fail guard in `build-week.mjs` (commit
`4b28562e`) — do not weaken it.

## B8. Regression gate (blocking — Sonnet runs it)

1. `node scripts/curriculum/validate-specs.mjs` → exit 0 on all 26 Level 1 specs, zero new warnings.
2. Validator `--self-test` → all fixtures green.
3. Re-render Level 1 spot weeks W4, W19, W26 with the new engine: intermediate HTML BYTE-IDENTICAL to
   pre-change output (diff the HTML; render both from a clean checkout comparison or pre-captured
   copies); PDFs non-zero with equal page counts (PDF bytes may differ via metadata timestamps — HTML
   is the byte-stable gate).
4. `tsc` scoped to `lib/montree/english-curriculum/` clean; ESLint 0 errors on touched files.

## B9. Process

Sacred flow: this contract → Opus build → Sonnet fresh-eyes FIX FIRST (audit against this contract
line-by-line + run B8) → Opus fixes → Sonnet re-audit SHIP. Audit agents never mutate live spec files
(/tmp only). Every durable-output model call temperature:0 (not expected here — engine is deterministic
code). Commit is Tredoux's via Desktop Commander, per standing rule.
