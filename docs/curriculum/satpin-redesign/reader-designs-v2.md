# Dark Phonics SATPIN Readers — Design Bible v2

*From-scratch redesign, weeks 1–6 (s · a · t · p · i · n). Supersedes v1.*
*The rule that fixes v1: **only the text is decodable — the pictures are not.** The art acts out a real story with drama and jokes; the printed word is the child's victory lap. When the child decodes the word, the picture is the punchline.*

---

# PART A — THE DESIGN SYSTEM
### Nine rules a writer or illustrator must be able to check a page against.

**1. The page-grammar arc (within and across the six books).**
Every book climbs the same ladder; the whole series climbs it too.
`label → phrase → sentence → repeated frame → growing (cumulative) frame.`
- Wk 1–2 live on the bottom rung (single sound + single word, the child's *job*).
- Wk 3 is the hinge (teacher-narrated sentence + one child-owned word).
- Wk 4–5 run repeated frames (one word swapped per spread — "the song is a machine, the class feeds it").
- Wk 6 is the cumulative "growing sentence" (each spread adds one element to a fixed frame).
Max sentence length rises from 1 word (wk1) to a 6-word cumulative frame (wk6). Never skip a rung.

**2. Word-exposure budget (non-negotiable).**
Every **target word** (that week's `newWords`) gets **≥5 genuine decodes inside its own book.** Rule-of-three triples ("Pat, pat, pat!") do real double duty here — they are both the house rhythm *and* three exposures. Secondary/payoff words (the one-off gag nouns: `pit`, `pan`, `tin`) may land once as the visual punchline and bank their remaining exposures in the **materials layer** (flashcards, sentence cards) and in **cross-week recurrence** — and to make that promise real, **each later book's REVIEW-flashcard bank must re-list the earlier books' payoff words** (see the cross-week recurrence table at the end of Part B), so lifetime exposures clear ~6–10. The terminal book (wk6) has no later week inside this set, so *its* payoff words (`pan`, `tin`, `nip`, `snap`) bank their remaining exposures in the materials layer and the wk7+ (`m` onward) review banks — flagged for the wk7 author. Track it word-by-word (ledgers below). If a target word is under 5, add a triple or a spread — do not pad with a new word.

**3. Picture policy: text sets up, art pays off.**
The illustration shows the **consequence, reaction, or reveal** — never the labelable object that IS the word to be decoded. If the word is `sat`, the art does not show a tidy chair to name on sight; it shows *where the cat catastrophically sat.* Layout rule enforcing decode-before-reveal: **the decodable word sits on the left (dark) page; the payoff image is the full-bleed right page / page-turn.** The child must read to unlock the joke. This makes "cover the picture, read, then reveal" the natural way to use every spread. Art may show **more** than the words (full scene, mood, subplot) or **confirm** a decoded choice after the fact — both defeat picture-guessing. It may never let the target word be recovered from the picture alone.

**4. Voice compliance — the 10 house rules, on every page they apply.**
(1) **Rule of three** — triple the payload word to close a beat. (2) **Potato gag mandatory & always last** — final spread leaves the noun blank, class shouts *POTATO!* (3) **One frame = one machine** — swap exactly one word per spread. (4) **Whisper → SHOUT** — a hush/"shhh…" beat immediately before the drop; the suspense page is text-heavy and near-wordless in art. (5) **Call-and-response** — a bracketed line the class shouts back. (6) **Mild gross-cute body humour** — stink/spit/sap/sticky = yes; cruelty/real-scary = no. (7) **Deadpan absurdity** — commit to the impossible image with a straight face. (8) **Reversal / comeuppance mid-arc** — the smallest wins, the smug one gets got. (9) **Blank last noun** — the climax noun is never printed; the child fills it from the picture. (10) **Sound-true, never schwa, never letter-name** — /s/ is a held snake-hiss ("never *ess*, never *suh*"), /a/ is "ah-ah-ah", /t/ is "t-t-t", /p/ is a quiet lip-pop.

**5. Glue system + NEW/REVIEW flag + decodable titles.**
Keep the non-decodable core tiny and named — **"heart words."** Full schedule for wks 1–6: **`a`** (heart — *previewed orally* in wk2's sound-hunt, then first genuinely **decoded** at wk4 p9 and reviewed through wk5–6) and **`I`** (heart, enters wk6). That's it — SATPIN lets us dodge every irregular high-frequency word. `is`, `it`, `an`, `in` are **decodable**, not heart words (they enter as their letters arrive: is/it at wk5, an/in at wk6). Print the scaffolding **on the book, never on the story pages**: an inside-front "words in this book" list flags each word **NEW** (bold) vs **REVIEW** (plain); the potato/heart icon marks the two heart words. **Titles are decodable** wherever the format is decodable (wk4 *SPAT!*, wk5 *Sit! Sit! Sit!*, wk6 *Nap, Ant, Nap!*) — the title is the child's first decoding win, never a barrier. Sound-hunt/read-aloud titles (wk1–3) may use the brand catchphrase voice.

**6. Character-consistency art strategy (do this once, reuse forever).**
Generate **one canonical character sheet per cast member** — Ant, Segina, Sam, Cat, Teacher Potato — in the LOCKED style (colored hand-drawn pen-and-ink, fine crosshatch, whimsical Dr. Seuss children's-book style, big googly eyes, plain white background; full negative list in Part C). Then feed that sheet as **Midjourney omni-reference (`--oref`, or `--cref` for character lock)** into **every** subsequent page so the character is identical book-to-book. New scenes change only the *action and staging*; the character token never changes. The existing hosted webp inventory is in the OLD spotlit-photo style, so it is confined to the **materials / flashcard layer only** — it must NOT ship as book art. Mixing photo plates beside pen-and-ink spreads would break the locked style (brief constraint 9, "do not restyle") and make Ant's first appearance mismatch his canonical sheet. **Every book spread in all six weeks renders in the new locked pen-and-ink style** (single-object plates are cheap); a hosted stem named on a page indicates the *subject to re-draw*, never a photo to paste. Each page below is flagged **NEW** (full prompt supplied) or **RE-DRAW** (same subject as the named hosted stem, re-rendered in the locked style).

**7. Length & finish-line.** 7–9 spreads, 1–6 words per spread, completable in one sitting — bank the "I read a whole book myself" event early and often. Every book ends on the potato ritual page.

---

# PART B — THE SIX WEEK DESIGNS

Legend for the page tables: **TEXT** = exact printed words (left/dark page). **[whisper]** = hushed pre-drop beat. **(echo)** = class call-and-response. Potato reveal noun is always blank + picture.

---

## WEEK 1 — "Snake in My Sock!"
**Format:** soundHunt (readAloud — text exempt). **Sound:** /s/ (held snake-hiss). **Premise/joke engine:** a googly-eyed snake is loose and everything it touches starts with /s/; the child is the snake-tracker whose *job* is to hiss the /s/ and shout the thing. Whisper-build to the catchphrase drop, then potato. **Child's job every page:** spot it → hiss it (sssss) → shout it.

| # | TEXT | SCENE | THE JOKE (why they react) | ART DIRECTION |
|---|---|---|---|---|
|1|`Sss…`|A shiny snake slithers in, big googly eyes, tongue out.|Anticipation — something's coming.|Snake entrance, spotlit, expectant. **RE-DRAW `snake`.**|
|2|`Sss— SUN!`|The snake coils happily on the sun, sunbathing.|Deadpan absurdity — a snake sunbaking on the actual sun.|Snake wrapped round a smiling sun. **RE-DRAW `sun`.**|
|3|`Sss— SOAP!`|Snake hits a bar of soap and skids, tangled.|Slapstick — the sleek hunter can't keep its footing.|Snake mid-skid over soap, watercolor suds. **RE-DRAW `soap`.**|
|4|`Sss— SEAL!`|Snake rounds a corner nose-to-nose with a big honking seal.|Reversal beat — the hunter meets something bigger and louder.|Snake recoiling, seal deadpan. **RE-DRAW `seal`.**|
|5|`Sss— STAR!`|Snake stretches tall to reach a star.|Escalation — the reach gets bigger and sillier.|Snake stretched impossibly tall toward a star. **RE-DRAW `star`.**|
|6|`shhh… sss…` **[whisper]**|Dark hush page. Snake creeps toward a lone sock. (echo: *shhh…*)|Suspense — everyone leans in, quiet.|Near-wordless dark page; only the sock's silhouette and two glinting googly eyes. **NEW (dark plate).**|
|7|`Snake in my SOCK!`|Snake bursts head-first out of a sock. (echo: *a sock?!*)|The catchphrase drop — gross-cute jump-scare-that-isn't. Biggest laugh.|Snake exploding out of a stripy sock, sock flying. **RE-DRAW `sock`** (or NEW pen-and-ink burst).|
|8|`Sss— a…?!`|Blank. The snake hisses at one last lump… → **POTATO!**|The sacred anti-climax.|Snake face-to-face with deadpan Teacher Potato. **RE-DRAW `potato`.**|

**Word/sound-exposure ledger:** target = **/s/ onset**, genuinely produced **8×** (every spread). No decodable words yet (correct for slot 1). Heart words: none yet.
**Flashcard list (words in this reader):** *snake, sun, soap, seal, star, sock, potato* (initial-/s/ picture cards — oral, not decodable).

---

## WEEK 2 — "An Apple for Ant!"
**Format:** soundHunt (readAloud — text exempt). **Sound:** /a/ (ah-ah-ah, never the letter name). **New this week:** the child *previews* the heart word **`a`** for the first time — **orally, as a sound, not yet as reading** (its first genuine decode comes at wk4). **Premise/joke engine:** a proud, hungry Ant hunts for food, and everything in the way is "an ___" starting with /a/; the /a/-hunt climbs to real danger (alligator) then the apple. Ant *debuts here* (orally — his name isn't decodable till wk6). **Every printed line is the teacher's read-aloud script** (the "An ___" phrasing is teacher-voiced; note it uses `n`, untaught until wk6 — legal only because this is readAloud). **Child's job every page (oral, not reading):** say the /a/ sound (ah-ah-ah) → shout the thing.

| # | TEXT | SCENE | THE JOKE | ART DIRECTION |
|---|---|---|---|---|
|1|`Ah— ANT!`|Ant struts in, proud, tummy rumbling.|Meet the tiniest hero, already full of himself.|Ant upright, proud posture, hungry look. **RE-DRAW `ant`.**|
|2|`An AX!`|Ant scales a giant ax like a mountaineer.|Absurd scale — ant vs. enormous ax.|Tiny ant climbing a huge ax. **RE-DRAW `ax`.**|
|3|`An ANCHOR!`|Ant hauls himself over a massive anchor.|Escalation of size — everything dwarfs him.|Ant atop a huge anchor. **RE-DRAW `anchor`.**|
|4|`An ASTRONAUT!`|Ant bumps into a full astronaut, blinks up.|Deadpan absurdity — a space suit in the pantry.|Ant dwarfed by a spacesuit, both deadpan. **RE-DRAW `astronaut`.**|
|5|`shhh… an…` **[whisper]**|Dark hush page. Jaws open in the shadows — an alligator. (echo: *shhh…*)|Suspense/reversal setup — real peril for a tiny ant.|Near-wordless dark page; alligator teeth glinting, small ant silhouette. **NEW (dark plate).**|
|6|`AH! Ant!`|Alligator snaps; ant springs clear at the last second. (echo: *oh no!*)|Comeuppance dodged — smallest is quickest.|Ant leaping out of frame, jaws clashing on empty air. **NEW.**|
|7|`An APPLE!`|Ant reaches a shiny apple at last and takes a bite.|Payoff — he made it; sweet relief.|Ant hugging/biting a huge apple, triumphant. **RE-DRAW `apple`.**|
|8|`An… a…?!`|Blank. Ant bites one more round thing… → **POTATO!**|The potato crashes the feast, deadpan.|Ant mid-bite on Teacher Potato, both unimpressed. **RE-DRAW `potato`.**|

**Exposure ledger:** target = **/a/ onset**, genuinely produced (oral) **8×** (every spread). Heart word **`a`** **previewed orally 8×** — *these are read-aloud exposures, NOT genuine decodes* (nothing on the page is a child decode this week); `a`'s real decode budget banks wk4 p9 + wk5 + wk6 and clears comfortably. *"an" is teacher-voiced here and is not yet decodable.*
**Flashcard list:** *ant, ax, anchor, astronaut, alligator, apple, potato* (initial-/a/ picture cards — oral) + an **`a`** heart-word preview card (introduced orally; not decoded until wk4).

---

## WEEK 3 — "Segina Sat!"  ← the hybrid, the first "I read that!"
**Format:** hybrid (readAloud narration + one child-owned decodable word per spread). Rebuilt on the "Where Is Segina?" bones. **Title** is decodable-as-a-win: *Segina* is a cast name (exempt) and **`Sat`** (s,a,t) is the child's own hero word. **Premise/joke engine:** a chase across town — Segina is always one step ahead; everywhere the class arrives, she *just sat here and moved on* (a warm dent, her ribbon, crumbs), until they finally catch up to her asleep at home. **The teacher reads an unfinished sentence that the child COMPLETES by decoding the big word `Sat!`** — so "Here she… `Sat!`" reads as one whole sentence, never a Q/A non-sequitur. This is the precious first genuine decode. **Child's owned word:** `Sat` (and one `at` on the whisper page) — both fully decodable at wk3. **Layout:** teacher's narration in small grey type up top; the child's word BIG on the dark page; the payoff picture on the turn.

| # | TEACHER NARRATION (reads the set-up, trails off) | CHILD COMPLETES IT | SCENE / THE JOKE | ART DIRECTION |
|---|---|---|---|---|
|1|"At the park — here she…"|`Sat!`|"Here she **sat!**" — but only a Segina-shaped dent and her ribbon remain; she's a step ahead.|Empty park spot, warm dent, red ribbon. Segina absent. **NEW** (place = `park`).|
|2|"The zoo! Here she…"|`Sat!`|"Here she **sat!**" — a monkey now wears her little hat; her seat's still warm.|Zoo bench, monkey in Segina's hat. **NEW** (place = `zoo`).|
|3|"The mall! She…"|`Sat!`|"She **sat!**" — an empty stroller still spinning where she hopped out.|Mall, spinning empty stroller. **NEW** (place = `mall`).|
|4|"School! She…"|`Sat!`|"She **sat!**" — a neat chalk outline of Segina on a chair, gone again.|School chair, chalk outline. **NEW** (place = `school`).|
|5|"The shop! She…"|`Sat!`|"She **sat!**" — a tipped basket, apples rolling; the Cat sniffs her trail and points the way.|Supermarket, spilled basket, tabby Cat nose-down, tail pointing onward. **NEW** (place = `supermarket`).|
|6|"Shhh… is she… **[whisper]**"|`at…?`|"Is she… **at…?**" — the class whispers the question; one empty seat under a lamp. Nearly caught her.|Near-wordless dark bus-stop, single pool of light, a still-swinging gate. **NEW** (place = `bus-stop`).|
|7|"Home at last! Here she…"|`Sat.`|"Here she **sat.**" — caught up at last: she got home, sat in her red chair, and nodded off. "WAKE UP, SEGINA!"|Home, Segina asleep in her red chair, cosy. **NEW** (place = `home`).|
|8|"She sat on a…?!" *(class shouts the blank from the picture)*|— *(no decode: blank page)* |Blank last noun → the class yells **POTATO!** A lump under the cushion.|Teacher Potato wedged under the chair cushion, deadpan; sleeping Segina. **RE-DRAW `potato`** *(oref: Potato + Segina sheets)*.|

**Exposure ledger:** child-owned **`Sat`** genuinely decoded **6×** (spreads 1–5, 7) → ✔ ≥5, the first "I read that!" word; **`at`** decoded **1×** (spread 6 whisper) as a bonus. *The "at" inside the teacher's spoken lines is teacher-read, not counted as a child decode.* The potato page (8) has the child decode nothing — it is the blank-noun class shout (voice Rule 9). Narration is read-aloud-exempt.
**Flashcard list:** **`Sat`** (NEW, the hero word), **`at`** (NEW), **`a`** (REVIEW heart-word preview). Place pictures are oral props, not decode cards.
*Note on hosted art:* the old `park/zoo/mall/school/supermarket/bus-stop/home` plates show Segina *present*; the new gag needs her *absent* ("just missed"), so these are new stagings of the established locations — reuse the setting, restage the character out.

---

## WEEK 4 — "SPAT!"  ← FIRST FULLY DECODABLE BOOK
**Format:** decodable (`readAloud: false` — every printed word inside the s,a,t,p pool). **Cast in art:** Sam (peg boy) and the Cat — **never named in text** (m, c untaught); the text is pure action, the art shows who. **Premise/joke engine:** a smug cat has sat itself into a river of tree **sap**; Sam tries to un-stick it by patting, then tapping — and the cat's patience runs out in one glorious **SPAT.** Comeuppance: Sam ends up flat on his bottom and the cat taps *him*. Gross-cute, rule-of-three, potato. **Legal pool:** sat, sap, pat, tap, spat, a.

| # | TEXT | SCENE | THE JOKE | ART DIRECTION |
|---|---|---|---|---|
|1|`Sat.`|A tabby Cat sits, smug and regal, on a tree stump.|Setup — decode "sat," turn the page and learn *where* he sat.|Cat enthroned on an oozing stump, oblivious. Sam approaching behind. **NEW.**|
|2|`Sap. Sap. Sap.`|Amber sap drips onto the cat, drip by drip; he doesn't notice.|Dread-build; the class sees it before the cat does. Rule of three.|Close-up drips landing on cat's back, thin ink lines + watercolor amber. **NEW.**|
|3|`Sap! Sat! Sat!`|The cat is now glued to the stump, wriggling, googly eyes bulging.|Gross-cute — he's STUCK. Panic dawns.|Cat straining, sap strings stretching, eyes popping. **NEW.**|
|4|`Pat, pat, pat.`|Sam pats the cat to help; his little hands stick.|Rule of three; well-meant help makes it worse.|Sam patting, sap webbing between paw and hand. **NEW.**|
|5|`Tap, tap, tap.`|Sam taps harder; the cat's face darkens.|Escalation — the cat is Not Amused.|Sam tapping cat's head; cat side-eye, fur rising. **NEW.**|
|6|`Pat? Pat? Tap?` **[whisper]**|Hush. Sam hovers for one more cautious poke. (echo: *shhh…*)|Suspense pre-drop — don't do it, Sam.|Near-wordless tense beat, Sam's finger an inch from the fuming cat. **NEW.**|
|7|`SPAT!`|The cat ERUPTS — hiss, spit and sap flying, Sam blasted backward.|The payoff on the hardest word — biggest laugh, mess everywhere.|Explosive spray of ink droplets + watercolor, Sam launched off his feet. **NEW.**|
|8|`Sat! Sap! Tap!`|Sam sits flat in the sap; the cat, free and smug, taps Sam's head "like a hat — fair is fair." (echo: *fair is fair!*)|Reversal/comeuppance — the smug one wins after all.|Cat perched on fallen Sam's head, tapping smugly; Sam gooey and defeated. **NEW.**|
|9|`Sat! A…?!`|Blank. Sam is sitting on something round → the class shouts the blank: **POTATO! (YES?!)**|**The /p/-week potato-flip (voice Rule 2):** this is the `p` week, so the potato finally *starts with the sound we just learned* — the gag flips from the usual "NO!" to the class shouting **"YES?!"** (it really does start with /p/!) … "*but it's still not the answer.*" Deadpan Potato. *(no "on"/"in" legal yet — blank + picture carries it.)*|Sam lifts up to reveal deadpan Teacher Potato beneath him. **RE-DRAW `potato`** *(oref: Sam + Potato)*.|

**Exposure ledger (targets ≥5):** **sat** = 5 (p1, p3×2, p8, p9) ✔ · **sap** = 5 (p2×3, p3, p8) ✔ · **pat** = 5 (p4×3, p6×2) ✔ · **tap** = 5 (p5×3, p6, p8) ✔ · *spat* = 1 (payoff/review) · heart `a` = 1 (p9). All four newWords clear the budget in-book.
**Rule-of-three note (voice Rule 1):** the genuine house triples are **p4 (`Pat`×3)** and **p5 (`Tap`×3)** — one tripled payload word each. p3 (`Sap! Sat! Sat!`) and p8 (`Sat! Sap! Tap!`) are *callback-montages* of three different words; they carry the ledger and the beat but are **not** billed as the rule-of-three. **Vocab note:** `sap`/`SPAT` are pool-forced (SPIT needs `i`, untaught at wk4) and marginal oral vocab — visible tree-resin and the cat's eruption carry the meaning. Accepted.
**Flashcard list:** **`sat` `pat` `tap` `sap`** (NEW) · **`spat`** (NEW, blend) · **`a`** (REVIEW heart word).

---

## WEEK 5 — "Sit! Sit! Sit!"
**Format:** decodable. **Cast in art:** Sam commands, the Cat disobeys (unnamed in text). **Premise/joke engine:** Sam orders the cat to SIT; the cat sits everywhere *wrong* — down a **pit**, into a sticky heap of **sap** — then flat-out defies him, daintily **sipping** tea and **spitting** it out… whereupon its own insolence overbalances it and it lands, bump, sitting on the mat by pure accident. The smug one gets got (Rule 8). The house "one machine, swap one word" frame drives it; the child reads the command `Sit!` again and again and reads each wrong-spot reveal. **Legal pool adds:** it, is, sit, sits, sip, pit, spit (+ wk4 pool; `sap` recurs from wk4).

| # | TEXT | SCENE | THE JOKE | ART DIRECTION |
|---|---|---|---|---|
|1|`Sit! Sit!`|Sam points sternly; the cat pointedly licks a paw.|Setup — total defiance.|Sam commanding, cat ignoring with contempt. **NEW.**|
|2|`It is a pit!`|The cat "sits" — straight down a hole. Only ears show.|Obeyed to the letter, in the worst spot.|Cat plopped in a pit, indignant ears and googly eyes poking out. **NEW.**|
|3|`Sit!`|Sam hauls him out, points again, redder.|Escalation of exasperation.|Sam pointing, arm trembling; muddy cat. **NEW.**|
|4|`It is sap!`|The cat "sits" — plop, into a sticky amber heap of tree sap (callback to wk4).|Gross-cute; malicious compliance, now glued in place.|Cat stuck in a glistening sap heap, deadpan, sap strings — thin ink lines + watercolor amber. **NEW.**|
|5|`Sit! Sit!`|Sam, desperate, points at the clean mat. (echo: *sit! sit!*)|The pleading peak.|Sam near tears pointing at a clean mat; cat elsewhere. **NEW.**|
|6|`Sip, sip, sip.`|The cat ignores it all and daintily sips tea three times, pinky-paw out.|Deadpan insolence — the true rule-of-three, cat vs. Sam.|Cat sipping from a teacup, three beats, eyes half-closed, pinky-paw out. **NEW.**|
|7|`Spit it!` **[whisper→drop]**|Hush… then the cat spits the tea out at Sam! Sam ducks — the cat tips off balance. (echo: *shhh… SPIT!*)|Gross-cute drop — and the insolence starts its own downfall.|Spray of droplets at Sam; Sam ducking; cat tilting, paws windmilling. **NEW.**|
|8|`It sits! It is!`|The cat topples and lands — bump — sitting primly on the mat *by pure accident*, mortified. The cast applauds the smug one's undignified downfall.|Reversal/comeuppance (Rule 8) — the cat gets got by its own attitude; everyone cheers.|Cat landed sitting on the mat, mortified; Sam, Segina and the ant applauding around it. **NEW.**|
|9|`Is it? Is it a…?!`|Blank suspense build; something's already on the mat → class shouts **POTATO!**|Blank last noun; the class yells it from the picture.|Cat lifts to reveal deadpan Teacher Potato under it. **RE-DRAW `potato`** *(oref: Cat + Potato)*.|

**Exposure ledger:** **sit** = 5 (p1×2, p3, p5×2) ✔ · **it** = 5 (p2, p4, p7, p8, p9) ✔ · **is** = 5 (p2, p4, p8, p9×2) ✔ · **sip** = 3 (p6, true triple), **pit** = 1, **spit** = 1 — payoff/reveal words that bank remaining exposures in the materials layer + the **wk6 REVIEW bank** (per Rule 2 & the recurrence table). **sap** = 1 (p4) — a genuine cross-week recurrence of the wk4 word. Primary + function targets (sit, it, is) all clear ≥5 in-book.
**Flashcard list:** **`sit` `it` `is` `sip` `pit`** (NEW) · **`spit`** (NEW, blend) · **`sat` `pat` `tap` `sap`** (REVIEW) · **`a`** (heart, REVIEW).

---

## WEEK 6 — "Nap, Ant, Nap!"  ← the author's book, made smart (7 spreads)
**Format:** decodable. **This is the author's own sketch honored and sharpened — kept deliberately SHORT ("a few pages").** The author's cumulative frame — *"An ant naps. An ant naps in a pan. An ant naps in a tin. — Nap, Ant, nap."* — is the spine, printed verbatim; we make it smart by (a) opening straight on the frame, (b) merging the peril and comeuppance into **one reversal spread** (SNAP → Nip, the smallest wins), (c) printing the author's refrain **`Nap, Ant, nap!`** as a real decoded call-and-response beat (the tender lull after the chaos), and (d) folding the heart word **`I`** into Ant's reply on that same page. **`Ant` is finally decodable and printed** (a,n,t); **`in` unlocks this week** (i,n) — the only week the frame's preposition is legal. **Legal pool adds:** an, ant, in, nap, naps, pan, tin, nip, snap, I (+ full prior pool).

| # | TEXT | SCENE | THE JOKE | ART DIRECTION |
|---|---|---|---|---|
|1|`An ant naps.`|The proud little ant gives a huge yawn and curls up on a leaf.|Cute — the smallest, most self-important creature, the biggest yawn. Opens straight on the frame.|Proud ant mid-yawn, curling on a leaf, spotlit. **NEW** (oref Ant sheet).|
|2|`An ant naps in a pan.`|Turn the page: a frying pan on the stove is rocking and clattering *on its own* — two tiny ant legs stick up over the rim, blissfully still.|Deadpan absurdity — the pan's chaos (not a tidy labelled pan) is the payoff; the child decodes `pan` **then** discovers the aftermath. **Anti-guess layout (Rule 3):** cover the right page, decode the left, *then* turn.|Frying pan mid-clatter on a stove, lid askew, two ant legs over the rim; an *aftermath*, not a product shot. **NEW.**|
|3|`An ant naps in a tin.`|A tin on its side amid a toppled tower of other tins — one lid burst open, two ant legs poking out, everything mid-collapse.|Escalation; again the *consequence* carries the page, not a clean labelled tin.|Tin on its side, lid half-peeled, two ant legs out; a spilled stack of tins around it; sleep shown by the ant's slack pose only — no z's. **NEW.**|
|4|`An ant naps in a…` **[whisper]**|Hush. A huge shadow — the Cat — looms over the sleeping ant. (echo: *shhh…*)|Suspense/reversal setup — the tiny one is in danger.|Near-wordless dark page: giant Cat silhouette, oblivious sleeping ant beneath. **NEW.**|
|5|`SNAP! Nip!`|The Cat pounces — SNAP! — but the ant darts out and NIPS its nose; the cat reels, cross-eyed. (echo: *oh no!… NIP!*)|Gasp then cheer, merged — the biggest beat: peril and comeuppance in one turn. The smallest is the toughest.|Split-energy spread: cat's paw crashing (ink motion lines) as the ant bites its nose; cat's googly eyes crossing. Gross-cute peril, not real-scary. **NEW.**|
|6|`Nap, Ant, nap!` / `I nap in it!`|The tender lull: the class chants the author's refrain telling Ant to sleep; Ant drags the dented **tin** onto the flattened cat's head and flops back *inside it*. (call-and-response: class *"Nap, Ant, nap!"* → Ant *"I nap in it!"*)|The author's line, printed and decoded, as call-and-response; the child's first `I`; "in it" = *in the tin* (text and picture agree).|Ant curled inside the battered tin perched like a hat on the defeated cat's head; ant blissful, cat cross-eyed and pinned. **NEW.** (heart word `I` debut)|
|7|`An ant naps in a…?!`|Blank. The ant curls onto one last round bed → **POTATO!**|The cumulative frame + the sacred potato, together.|Ant asleep atop deadpan Teacher Potato. **RE-DRAW `potato`** *(oref: Ant + Potato)*.|

**Exposure ledger:** **ant** = 6 (p1,2,3,4,6,7) ✔ · **an** = 5 (p1,2,3,4,7) ✔ · **naps** = 5 (p1,2,3,4,7) ✔ · **nap** = 3 (p6: "Nap…nap" ×2 + "I nap" ×1) → nap/naps family = 8 ✔ · **in** = 5 (p2,3,4,6,7) ✔ · heart **`I`** = 1 (p6 debut — a glue word, not a ≥5 target; reinforced in flashcards/materials) · **pan** = 1, **tin** = 1, *snap* = 1, *nip* = 1 (payoff/blend → materials + wk7+). All four star targets (ant, an, naps, in) clear ≥5 across just 7 pages; the printed refrain banks the extra nap/ant/in decodes that the shorter book would otherwise lose.
**Flashcard list:** **`an` `ant` `in` `nap` `naps` `pan` `tin` `nip`** (NEW) · **`snap`** (NEW, blend) · **`sit` `it` `is` `sat` `pat` `tap` `sap` `pit` `sip` `spit`** (REVIEW — the cumulative bank; the wk5 payoff words `pit`/`sip`/`spit` are re-listed here to complete their lifetime exposures per the recurrence table) · **`I`** (NEW heart word) · **`a`** (heart, REVIEW).

---

### Cross-week recurrence table (lifetime exposures)
Delivers the Rule-2 promise concretely: every target word's in-book decodes **plus** the REVIEW-flashcard banks it is re-listed in. "→ mat." = flagged to the wk7+ author (words that go terminal in this 6-week set lean on the materials layer + later review banks).

| Word | Intro | In-book decodes | Re-listed REVIEW in | Lifetime |
|---|---|---|---|---|
| `sat` | wk3 | wk3: 6, wk4: 5 | wk5, wk6 | ≥11 ✔ |
| `pat` | wk4 | wk4: 5 | wk5, wk6 | ≥7 ✔ |
| `tap` | wk4 | wk4: 5 | wk5, wk6 | ≥7 ✔ |
| `sap` | wk4 | wk4: 5, wk5: 1 (p4) | wk6 | ≥7 ✔ |
| `sit` | wk5 | wk5: 5 | wk6 | ≥6 ✔ |
| `it` | wk5 | wk5: 5, wk6: 1 (p6) | wk6 | ≥6 ✔ |
| `is` | wk5 | wk5: 5 | wk6 | ≥6 ✔ |
| `pit` `sip` `spit` | wk5 | wk5: 1–3 each | **wk6 (added)** + materials | ≥5 ✔ |
| `ant` | wk6 | wk6: 6 | → mat. + wk7+ | 6 ✔ |
| `an` | wk6 | wk6: 5 | → mat. + wk7+ | 5 ✔ |
| `nap`/`naps` | wk6 | wk6: 8 (naps 5 + nap 3) | → mat. + wk7+ | 8 ✔ |
| `in` | wk6 | wk6: 5 | → mat. + wk7+ | 5 ✔ |
| `pan` `tin` `nip` `snap` | wk6 | wk6: 1 each | materials + wk7+ banks | flagged → mat. |
| `a` (heart) | wk2 oral → wk4 decode | wk4:1, wk5:2, wk6:1 | every week | ✔ |
| `I` (heart) | wk6 | wk6: 1 | → mat. + wk7+ | + materials |

---

# PART C — MIDJOURNEY PROMPT PACK

**The LOCKED style suffix (paste VERBATIM at the end of every prompt):**
> `, colored hand-drawn pen-and-ink, fine crosshatch, whimsical Dr. Seuss children's-book style, big googly eyes, plain white background. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark.`

**Workflow:** generate the five character sheets first → save each → for every page prompt below, attach the named sheet as **omni-reference (`--oref <url>`)** / character-reference (`--cref`) so the cast stays identical. Recommended `--ar 3:2` for spreads, `--ar 3:4` for the character sheets. Never restyle.

## C.1 — Character sheets (generate once, reference forever)

**ANT —** `Character reference sheet of a single small shiny black ant with big round googly eyes, standing upright on two legs in a proud confident posture, three-quarter view and front view, expressive and comic` + SUFFIX.

**SEGINA —** `Character reference sheet of Segina, a small wooden Montessori peg-doll girl with painted black pigtails and a little red dress, big round googly eyes, cheerful, front view and three-quarter view` + SUFFIX.

**SAM —** `Character reference sheet of Sam, a small wooden Montessori peg-doll boy with painted brown hair and blue dungarees, big round googly eyes, cheerful and physical, front view and three-quarter view` + SUFFIX.

**CAT —** `Character reference sheet of a plump expressive tabby cat with big round googly eyes, smug and dramatic, sitting and standing poses, front and three-quarter views` + SUFFIX.

**TEACHER POTATO —** `Character reference sheet of Teacher Potato, a single raw brown potato wearing tiny round spectacles, deadpan self-important expression, front view; plus one variant of the same bare potato without spectacles` + SUFFIX.

## C.2 — Per-page prompts

**Weeks 1 & 2 (sound-hunt):** the hosted webp plates named in the tables belong to the **materials / flashcard layer only** — do **not** paste them as book art (they are the OLD photo style; Rule 6/finding 13). Every wk1–2 book page is a **mandatory RE-DRAW in the locked pen-and-ink style**, using each named stem only as the *subject*: `A single [object] with big round googly eyes, [action from the SCENE column]` + SUFFIX. *(oref: for the wk2 Ant pages attach the ANT sheet; for every Potato page attach the POTATO sheet — so Ant and Potato match their canonical sheets from their very first appearance.)* The two **NEW dark plates** (wk1 p6, wk2 p5): `A dark hushed page, a lone [sock / alligator jaws] barely lit, two glinting googly eyes in the shadows, high contrast, mostly negative space` + SUFFIX.

**Week 3 (restage established places, Segina absent):** for each spread, `[Location: a park / zoo / mall / school / supermarket / bus stop / home interior], miniature diorama, with a clear sign someone just left — [warm empty dent / a monkey wearing a little red hat / a spinning empty stroller / a chalk outline on a chair / a tipped shopping basket / one empty seat under a lamp / Segina the peg-doll asleep in a red chair]. Segina is a small wooden peg-doll girl with black pigtails and a red dress` + SUFFIX. *(oref: Segina sheet; wk3 p5 also Cat sheet.)* **p8 potato:** `Deadpan Teacher Potato wedged under a red chair cushion, Segina the peg-doll girl asleep in the chair above` + SUFFIX. *(oref: Potato + Segina.)*

**Week 4 — "SPAT!"** *(oref: Sam + Cat sheets on every page)*
- p1 `A smug tabby cat sitting enthroned on a tree stump that is oozing amber sap, oblivious; Sam the peg-doll boy approaching from behind` + SUFFIX.
- p2 `Close-up: drops of amber tree sap dripping onto a smug tabby cat's back, drawn as thin ink lines and droplets with watercolor accents, the cat not noticing` + SUFFIX.
- p3 `A tabby cat stuck fast to a sap-covered stump, straining and wriggling, googly eyes bulging, sticky sap strings stretching` + SUFFIX.
- p4 `Sam the peg-doll boy patting the stuck tabby cat, his hands sticking, sap webbing between paw and hand` + SUFFIX.
- p5 `Sam the peg-doll boy tapping the stuck cat's head with one finger, the cat side-eyeing him, fur beginning to rise` + SUFFIX.
- p6 `Tense hushed page: Sam's single finger hovering an inch above a furious swelling tabby cat, mostly negative space` + SUFFIX.
- p7 `A tabby cat erupting in an explosive spray of ink droplets and watercolor sap and spit, Sam the peg-doll boy launched backward off his feet, dynamic` + SUFFIX.
- p8 `A smug freed tabby cat perched on top of fallen Sam's head like a hat, tapping it with one paw; Sam gooey and defeated on the ground` + SUFFIX.
- p9 `Sam the peg-doll boy lifting off the ground to reveal deadpan Teacher Potato beneath him` + SUFFIX. *(oref: Sam + Potato.)*

**Week 5 — "Sit! Sit! Sit!"** *(oref: Sam + Cat; p8 adds Segina + Ant)*
- p1 `Sam the peg-doll boy pointing sternly and commanding; a tabby cat pointedly licking one paw, ignoring him` + SUFFIX.
- p2 `A tabby cat that has sat straight down into a hole/pit, only its indignant ears and googly eyes poking out` + SUFFIX.
- p3 `Sam the peg-doll boy, red-faced, pointing again; a muddy tabby cat beside him` + SUFFIX.
- p4 `A tabby cat stuck sitting in a glistening sticky heap of amber tree sap, deadpan, sap strings drawn as thin ink lines and droplets with watercolor accents` + SUFFIX.
- p5 `Sam the peg-doll boy near tears, pointing at a clean mat; the tabby cat sitting anywhere but there` + SUFFIX.
- p6 `A tabby cat sipping daintily from a teacup, pinky-paw out, eyes half-closed with insolence, ignoring everything` + SUFFIX.
- p7 `A tabby cat spitting a spray of droplets at Sam the peg-doll boy, Sam ducking, the cat tilting off balance with paws windmilling` + SUFFIX.
- p8 `A tabby cat landed sitting on a mat by accident, mortified; Sam the peg-doll boy, Segina the peg-doll girl, and a small proud ant all applauding around it` + SUFFIX.
- p9 `A tabby cat lifting up to reveal deadpan Teacher Potato sitting on the mat beneath it` + SUFFIX. *(oref: Cat + Potato.)*

**Week 6 — "Nap, Ant, Nap!" (7 spreads)** *(oref: Ant sheet every page; p4–p6 add Cat)*
- p1 `A single small proud shiny black ant with big googly eyes giving a huge yawn and curling up to nap on a green leaf, spotlit` + SUFFIX.
- p2 `A frying pan mid-clatter on a stove, lid askew, rocking on its own, two tiny ant legs sticking up over the rim — an aftermath scene` + SUFFIX.
- p3 `A tin can on its side amid a toppled tower of spilled tins, one lid burst open, two tiny ant legs poking out, everything mid-collapse` + SUFFIX.
- p4 `Dark hushed page: an enormous tabby cat silhouette looming over one tiny oblivious sleeping ant below, high contrast, mostly negative space` + SUFFIX.
- p5 `Dynamic split-energy spread: a giant tabby cat's paw crashing down with ink motion lines while a tiny ant darts out and bites the cat's nose, the cat's googly eyes crossing in shock; comic peril, not frightening` + SUFFIX.
- p6 `A tiny blissful ant curled up asleep inside a battered dented tin can that is perched like a hat on a defeated flattened tabby cat's head, the cat cross-eyed and pinned` + SUFFIX.
- p7 `A tiny ant curled up asleep on top of deadpan Teacher Potato` + SUFFIX. *(oref: Ant + Potato.)*

---

### Ah-moment pass (every book, checked)
Each book: text sets up / art pays off (Rule 3) ✔ · a page-turn reason every spread (escalation + rule of three) ✔ · a laugh, gasp, or shout per page ✔ · hardest decode on the biggest beat (SPAT, SNAP, the SOCK drop) ✔ · a cast member drives every page ✔ · potato ritual closes every book ✔.
