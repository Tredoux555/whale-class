# Dark Phonics 2.0 — A–Z "Move & Say" (Songs + Picture Books)

*Master capture doc. Started 2026-06-07. The Dark Phonics follow-up: one song + one matching picture book per letter, A–Z. Songs are #1 priority; the book mirrors each song almost exactly, with Midjourney prompts. Updated every letter so the set can be finished any time.*

> **THIS IS THE COMPLETE MANIFESTO / SINGLE SOURCE OF TRUTH.** Every song's FULL lyrics live here (below), plus the method, sound-accuracy rules, art style and curriculum. Hand this one file to any Claude instance and it can analyse it and create ANY material — cards, books, posters, videos, new songs — from these songs alone. Keep every song's full lyrics in this doc.

---

## THE METHOD (what's working — keep doing this)

**Vibe / brand:** same **dark-trap** sound as Dark Phonics — a slow, head-nodding, 808-driven beat that makes you *want* to move (perfect for TPR). Strong call-and-response so the kids echo every line. A real repeating **hook**, not a silly short jingle. Each song is a tiny **scene with a punchline** (ant → alarm, ball → BOING, cat → CRASH).

**TPR (the whole point):** every line has a body action woven into the words, so hearing the word cues the movement. Verse 1 = a slow build that gives the teacher room to perform (fingers creeping up the arm, etc.); the hook = the big payoff move (shake it off / BOING / CRASH).

**SOUND ACCURACY — the rules (this is the make-or-break):**
- **Never the letter name** ("ay", "bee", "see") and **never a bare letter** Suno can drift on.
- **Anchor every sound to a clean keyword** via an onset stutter: `a- a- ant`, `b- b- ball`, `c- c- cat`. The stutter front-loads the sound; the word locks it in.
- **Vowels** (A, E, I, O, U): can be held — okay to chant `a- a- a`, but keep apple/ant close so it stays SHORT (/æ/), not "ay".
- **Stop consonants** (B, C/K, D, G, P, T): CANNOT be said alone without a "uh" ("buh", "kuh") — the cardinal phonics sin. **Always pop them onto a word, never in isolation, never "buh".**
- **STOP-CONSONANT FIX (learned G→K):** a stop /k/,/g/,/b/,/d/,/p/,/t/ is a SILENT burst — it physically can't be sung alone (you always get "kah"/"kay"). A lone letter → the letter NAME ("gee"). The fix: **drill the sound at the front of a short, PUNCHY REAL WORD, repeated** — NOT a nonsense "ka/ga" chunk (that adds the fake "kah"). So `k`: drill on **`kick, kick, kick`** (and "kangaroo" as the hook), not "ka, ka". `g`: prefer **`go, go, go`** / repeat the keyword. The teacher models the pure silent stop live; the song carries it on real words. (Re-listen B/C/D for "bee/see/dee"; same fix.)
- **Continuants** (S, M, F, N, V, Z, SH...): can be held — `sssss`, `mmmm` work great. **EXCEPTION — liquids /l/ & /r/:** a bare held `lll`/`rrr` GROWLS and drifts into each other in Suno (l→r). Anchor them to a clean syllable + words: `la, la, la` + lick/lion (for L); `ra/run/red` (for R).
- **SPELL THE SOUND, NOT THE LETTER (vowels):** a lone vowel letter makes Suno sing the LETTER NAME — it sang "ee ee egg" for E. Respell the bare sound phonetically: short e = **`eh`**, short i = **`ih`**, short u = **`uh`**, short a = lean on the keyword (apple/ant) and watch for "ay", short o = anchor hard on a word (watch for "oh"). Keep keywords spelled normally (egg, elephant).
- The **Style box always states the rule** for that letter's sound ("short vowel like in apple, never the letter name" / "a quick lip-pop at the start of the word, never 'buh'").
- Only the **clean** sound-words get drilled. Fun rhyme/story words that AREN'T the sound (e.g. "arm", "alarm" for A — those are /ar/, not /æ/) are sung as words, never segmented.

**LEAN STYLE TEMPLATE (keep under Suno's 1000-char cap — swap only the last sentence per letter):**
> `Slow head-nodding children's dark trap, ~72 BPM — soft 808 bass, lazy trap hi-hats, minor key, simple hypnotic bell melody, lots of space, a beat that makes you move. Call-and-response: one clear gentle lead voice; young children echo every line in the gap. A big catchy repeating hook. Very simple English, very repetitive, crisp kid diction. Leave a clear gap after each line so kids copy the sound and do the action. Cozy, hypnotic, fun, never aggressive. [DICTION RULE FOR THIS LETTER].`

**Song structure template:** Intro (sparse, set scene) → Verse 1 (slow build + TPR) → Hook (payoff joke + groove + call-response) → Verse 2 (more sound-words + actions) → Hook → Outro (soft, "the letter _ says…"). Suno: **Custom mode, Instrumental OFF.** Labels `(Lead)` / `(Kids)` = call & response.

**BOOK style — SEE the current rules below, NOT this line.** Two big changes landed 2026-06-09: (1) the art got **darker** from Q on (see DARK STYLE in STREAMLINED SCOPE — A–P used the brighter pen-and-ink, plain-white style); (2) character consistency is now **Omni Reference on a hosted URL**, NOT the old `--cref`. ~5 pages per book, mirroring the song; the page's **target word is the big, clear subject**.

**Character consistency (LOCKED 2026-06-09):** use **`--oref <hosted-url> --ow 200` on Midjourney V7** (Relax mode) — `--oref` replaced `--cref`, and Omni needs V7 (V8.1 rejects `--ow`). One locked character per book (MJ allows one `--oref` at a time). Hosting: drop the character PNG in repo `public/phonics-characters/<name>.png`, push → live at `montree.xyz/phonics-characters/<name>.png`. **Mo** (the recurring child, bright-era books) is hosted at `montree.xyz/phonics-characters/mo.png`. See the full MO CHARACTER LOCK + STREAMLINED SCOPE sections below.

**Recurring protagonist — DECIDED:** **Mo** (messy-haired googly-eyed kid in an orange sweater) is the through-line child, hosted for reuse. Streamlined readers (Q on) may instead star ONE hosted animal per book.

---

## STATUS

| Letter | Sound | Scene | Song | Book |
|---|---|---|---|---|
| A | /æ/ short a | Ant on my arm → alarm! | ✅ | ✅ |
| B | /b/ | Bounce the ball → BOING | ✅ | ✅ |
| C | /k/ (hard c) | Cheeky cat knocks the cup → CRASH | ✅ | ✅ |
| D | /d/ | Dancing dinosaur (stomp → DANCE) | ✅ | ✅ |
| E | /ĕ/ short e | Egg cracks → out pops an ELEPHANT | ✅ | ✅ |
| F | /f/ | Funny fan → FWOOSH (hat flies) | ✅ | ✅ |
| G | /g/ | Greedy goat gobbles → GULP | ✅ | ✅ |
| H | /h/ | Hare hops up the hill → HICCUP | ✅ | ✅ |
| I | /ĭ/ short i | Itchy insect → big WIGGLE | ✅ | ✅ |
| J | /dʒ/ | Jump in the jiggly jelly → SPLOSH | ✅ | ✅ |
| K | /k/ | Kicking kangaroo → giant KICK (over the moon) | ✅ | ✅ |
| L | /l/ | Lazy lion licks a lollipop → LEAP | ✅ | ✅ |
| M | /m/ | Munching monster munches all → MORE! | ✅ | ✅ |
| N | /n/ | Sneaky ninja nabs the noodle → NO, NO, NO! | ✅ | ✅ |
| O | /ŏ/ short o | Wobbly octopus → wobbles OFF the rock | ✅ | ✅ |
| P | /p/ | Pop-pop-popcorn → the lid blows, POP everywhere | ✅ | ✅ |
| Q | /kw/ (qu) | Quick quacking duck → quack/quick/quiet freeze game | 📝 written, awaiting Suno | 📝 reader specced |
| R… | | | ⬜ | ⬜ |

*(Book column ✅ = book pages written. Covers for A–P live in the COVERS section. **A–P = full bright-style packs; Q onward = STREAMLINED: song + one hosted character + reader only, DARK STYLE.** Q song lyrics + reader + duck character-ref prompt are written in the Q section under SONGS; next physical step is the founder generating the Q song in Suno and the duck in MJ V7, then sending the duck to host.)*


---

# CURRICULUM — Montessori phonics, one sound per week (A–Z)

**The engine — one shared word+picture set per sound, reused everywhere.** Each week pulls from the SAME keyword list (the song's words) + the SAME locked art style + characters (Mo + that letter's animal). Generate each picture ONCE → it feeds every material below. Define the vocab set first, then it's just layout.

**Per-sound pack** (★ = Montessori-core):
- 🎵 **Song** (Suno) — the anchor: the sound + the TPR action.
- 📖 **Booklet** — the 5-page picture book.
- 🃏 **Three-part cards** ★ — picture / label / control, for the keyword vocab.
- 🧩 **Sentence-matching cards** — decodable sentence ↔ picture.
- 🔎 **Initial-sound sorting cards** ★ — picture set, "does it start with /x/?" yes/no sort.
- ✍️ **Letter-formation / sandpaper-letter card** ★ — big letter to trace, with the keyword picture + the TPR action drawn on it (links the body movement to forming the letter).
- 🖼️ **Sound poster / control chart** — letter + keyword pic + TPR action + character; one page for the wall, ties song↔shelf.
- 🎨 **Coloring page** — the book character in clean line-art.
- *(optional)* 🎰 **Bingo/lotto** (sound's pictures) · 📱 **parent QR card** → the song on montree.xyz (home practice + marketing).

**Vocab set per sound = the song's keywords** (e.g. A: ant, apple, alligator). All cards/pictures draw from it.

**Phasing:** **Phase 1 = single-sound mastery (A–Z, current focus)** — hear the sound, the letter, initial-sound vocab. **Phase 2 (later) = blending** — CVC word-building cards, movable alphabet, word families, longer decodable readers. Note now, build after the alphabet.

**Picture generation:** locked Dark Phonics art (colored pen-and-ink, Seuss-ish, googly eyes, white bg, `--no signature`). One image per keyword, reused across all card types.

---

# STREAMLINED SCOPE (current, from 2026-06-09)

Founder cut scope to keep it manageable. **Per letter, do only two things:**
1. **One hosted character** — generate the letter's STAR (one character, the letter's animal), pick the best, host it in the repo at `public/phonics-characters/<name>.png` → push → it's live at `montree.xyz/phonics-characters/<name>.png`. One star per book sidesteps the Midjourney one-`--oref`-at-a-time limit (don't try to lock two characters in one image).
2. **The reader** — the ~5 picture-book pages, each locked to that star via `--oref <its URL> --ow 200` (V7, Relax). That's it.

**Paused** (not deleted — still specced below in MATERIALS ART for later): three-part cards, sorting cards, sentence-matching, sandpaper letter, poster, coloring page. Songs still anchor each letter; the reader mirrors the song. **Order of work: SONG first → then graphics.**

**DARK STYLE (locked Q onward — "Creepy Carrots" mood).** Founder wants the visuals a little darker, à la *Creepy Carrots!* (Reynolds/Brown): mostly desaturated greys + dramatic noir shadows + ONE bold spot colour, spooky-but-playful, never actually scary. Original take — do NOT copy its art or characters. New locked style string to append:
> `moody hand-drawn pen-and-ink, fine crosshatch, dramatic shadows and high-contrast cinematic low-key lighting, muted desaturated palette with one bold spot colour, whimsical but slightly spooky children's-book style, big googly eyes, pale background with deep soft shadows --style raw --stylize 250 --no signature, watermark, text, logo`

(Books A–P used the brighter pen-and-ink style; the darker style starts at Q. `[locked style]` below = this dark string from Q on.)

---

# MATERIALS ART — reusable prompt system (full pack — PAUSED, kept for later)

**Locked style (append to every prompt):** `colored hand-drawn pen-and-ink, fine crosshatch, whimsical Dr. Seuss children's-book style, big googly eyes, plain white background --style raw --stylize 250 --no signature, watermark, text, logo`

**Style tokens** (defined once, referenced per letter):
- `[COVER]` — book cover, the scene + punchline. `--ar 4:5`
- `[PAGE]` — book interior page, one scene. `--ar 3:2`
- `[CARD]` — ONE keyword object, centered, isolated on white, nothing else. Feeds three-part cards, sorting, bingo, lotto. `--ar 1:1`
- `[FORM]` — letter-formation / sandpaper card: a giant lowercase letter as the hero, the keyword picture small beside it, the TPR action mimed by tiny Mo figures tracing the stroke. `--ar 4:5`
- `[POSTER]` — wall poster / control chart: big uppercase+lowercase letter top, keyword scene center, character + 3–4 mini TPR action figures around it. `--ar 4:5`
- `[COLOR]` — coloring page: **clean black line-art ONLY, no color, no shading, thick smooth outlines** for kids to color. `--ar 4:5`

**Per-letter pack to generate (in this order):**
1. `[COVER]` ×1  ·  2. `[PAGE]` ×5 (the booklet)  ·  3. `[CARD]` ×8 (the vocab set — reused across 3-part, sorting-YES, bingo)  ·  4. `[CARD]` ×6 distractors (sorting-NO: words that DON'T start with the sound)  ·  5. sentence-scene `[PAGE]` ×4 (sentence-matching)  ·  6. `[FORM]` ×1  ·  7. `[POSTER]` ×1  ·  8. `[COLOR]` ×1.
**Rule:** generate each keyword `[CARD]` ONCE → reuse in three-part cards, initial-sound sorting (the YES pile), bingo, and lotto. Don't regenerate per material.

**MO CHARACTER LOCK (do this on EVERY book/scene prompt):** Mo drifts if re-rolled per page. Fix = **Omni Reference** (`--oref`, replaced `--cref` in MJ v7+). **Mo is permanently hosted — just paste his URL, no dragging:**

> **`--oref https://montree.xyz/phonics-characters/mo.png --ow 200`**

⚠️ **Omni Reference requires Midjourney V7** — V8.1 rejects `--oref`/`--ow` ("doesn't support --ow"). Switch model to **V7** (settings → Version → V7) for ALL Mo/character-locked art. V7 omni = 2× GPU + no Fast/Draft mode (use Relax/standard). Style is identical for this hand-drawn look; V7 is the mature one for consistency.

Append that to EVERY prompt with Mo in it (cover, all 5 book pages, sentence scenes, form, poster, coloring). `--ow` = omni-weight (0–1000, default 100); **150–250 = storybook sweet spot** (keeps face/hair/orange sweater, still lets him pose) — drift → 300, stiff → 100. Always keep Mo described in the prompt text too (words + reference must agree). The hosted master is `public/phonics-characters/mo.png` in the repo (added 2026-06-09). **Future characters** (panda, octopus, etc.): drop their reference PNG in `public/phonics-characters/`, push, and they get the same kind of permanent `--oref` URL.

---

# SONGS

## A — "Ant on My Arm"  ·  sound /æ/ (short a)
**Style:** dark trap ~72 BPM (template). Diction note: *short vowel, hard like in "apple"/"ant", never the letter name.*
```
[Intro - slow 808, quiet, sparse]
(Lead) Shhh... look...
(Lead) a- a- ant...
(Kids) a- a- ant...

[Verse 1 - fingers walk slowly up the arm, lots of space]
(Lead) On my hand... a- a- ant!
(Kids) a- a- ant!
(Lead) Up my arm... a- a- ant!
(Kids) a- a- ant!
(Lead) Up to my shoulder... a- a- ant!
(Kids) a- a- ant!
(Lead) Tickle, tickle, on my neck...
(Lead) a... a... a...
(Kids) a... a... a...

[Hook - payoff joke, beat drops, big movement]
(Lead) a, a, ant on my arm!
(Kids) a, a, ant on my arm!
(Lead) oh no, oh no... alarm!
(Kids) alarm!
(Lead) shake it off! shake it off!
(Kids) a- a- a!
(Lead) one more time —
(Kids) a- a- a!

[Verse 2 - clean short-a words + actions]
(Lead) Munch, munch, a- a- apple!
(Kids) a- a- apple!
(Lead) Snap, snap, a- a- alligator!
(Kids) a- a- alligator!
(Lead) Clap your hands, a- a- a!
(Kids) a- a- a!

[Hook]
(Lead) a, a, ant on my arm!
(Kids) a, a, ant on my arm!
(Lead) oh no, oh no... alarm!
(Kids) alarm!
(Lead) shake it off! shake it off!
(Kids) a- a- a!

[Outro - soft]
(Lead) The ant is gone... phew...
(Lead) but the letter A says...
(Kids) a- a- a!
(Lead) a, a, apple!
(Kids) a, a, apple!
```
**TPR:** fingers walk up the arm (hand→arm→shoulder→neck) · alarm = mock panic + shake out · munch apple · snap alligator arms · clap.

## B — "Bounce the Ball"  ·  sound /b/
**Diction note:** *quick soft lip-pop at the START of the word (b-ball, b-bounce), never "bee", never "buh".*
```
[Intro - slow 808, quiet, sparse]
(Lead) Get the ball...
(Lead) b- b- ball...
(Kids) b- b- ball...

[Verse 1 - bounce the ball, build higher, lots of space]
(Lead) Bounce it low, b- b- ball!
(Kids) b- b- ball!
(Lead) Bounce it high, b- b- ball!
(Kids) b- b- ball!
(Lead) Higher, higher, b- b- bounce!
(Kids) b- b- bounce!
(Lead) Up, up, up, b- b- bounce!
(Kids) b- b- bounce!

[Hook - payoff joke, beat drops, big movement]
(Lead) b, b, bounce the ball!
(Kids) b, b, bounce the ball!
(Lead) on my head — b- b- BOING!
(Kids) b- b- BOING!
(Lead) bounce it back, bounce it back!
(Kids) b- b- ball!
(Lead) one more time —
(Kids) b- b- ball!

[Verse 2 - more b words + actions]
(Lead) Stomp like a b- b- bear!
(Kids) b- b- bear!
(Lead) Drive the b- b- bus!
(Kids) b- b- bus!
(Lead) Big, big, b- b- big!
(Kids) b- b- big!

[Hook]
(Lead) b, b, bounce the ball!
(Kids) b, b, bounce the ball!
(Lead) on my head — b- b- BOING!
(Kids) b- b- BOING!
(Lead) bounce it back, bounce it back!
(Kids) b- b- ball!

[Outro - soft]
(Lead) Put the ball away...
(Lead) the letter B says...
(Kids) b- b- ball!
(Lead) b, b, bounce!
(Kids) b, b, bounce!
```
**TPR:** bounce invisible ball (palm down), lower→higher, reach up · BOING off head = hands fly up · bear stomp · drive bus · big arms.

## C — "The Cheeky Cat"  ·  sound /k/ (hard c)
**Diction note:** *quick soft click at the start of the word (c-cat, c-cup), never "see", never "kuh".*
```
[Intro - slow 808, quiet, sparse]
(Lead) Shhh... here comes the cat...
(Lead) c- c- cat...
(Kids) c- c- cat...

[Verse 1 - sneaky cat creeps, slow build, lots of space]
(Lead) Creep, creep, c- c- cat!
(Kids) c- c- cat!
(Lead) Soft paws, c- c- cat!
(Kids) c- c- cat!
(Lead) Eyeing the cup, c- c- cup!
(Kids) c- c- cup!
(Lead) Closer, closer, c- c- creep!
(Kids) c- c- creep!

[Hook - payoff joke, beat drops, big movement]
(Lead) c, c, cheeky cat!
(Kids) c, c, cheeky cat!
(Lead) knocks the cup — c- c- CRASH!
(Kids) c- c- CRASH!
(Lead) cheeky cat, cheeky cat!
(Kids) c- c- cat!
(Lead) one more time —
(Kids) c- c- cat!

[Verse 2 - more /k/ words + actions]
(Lead) Drive the c- c- car!
(Kids) c- c- car!
(Lead) Climb up high, c- c- climb!
(Kids) c- c- climb!
(Lead) Catch it, c- c- catch!
(Kids) c- c- catch!

[Hook]
(Lead) c, c, cheeky cat!
(Kids) c, c, cheeky cat!
(Lead) knocks the cup — c- c- CRASH!
(Kids) c- c- CRASH!
(Lead) cheeky cat, cheeky cat!
(Kids) c- c- cat!

[Outro - soft]
(Lead) Naughty cat runs away...
(Lead) the letter C says...
(Kids) c- c- cat!
(Lead) c, c, cup!
(Kids) c, c, cup!
```
**TPR:** creep like a cat (sneaky tiptoe/creeping fingers), soft paws, eye the cup · CRASH = paw-swipe, hands out · drive car · climb · catch.

## D — "The Dancing Dinosaur"  ·  sound /d/
**Diction note:** *quick soft tongue-tap at the START of the word (d-dinosaur, d-dance), never "dee", never "duh".*
```
[Intro - slow 808, quiet, distant booms]
(Lead) Listen... boom... boom...
(Lead) d- d- dinosaur...
(Kids) d- d- dinosaur...

[Verse 1 - big stomps, slow build, the ground shakes]
(Lead) Down the path, d- d- dinosaur!
(Kids) d- d- dinosaur!
(Lead) Big feet stomp, d- d- down!
(Kids) d- d- down!
(Lead) Closer, closer... boom, boom, boom...
(Lead) d- d- dinosaur!
(Kids) d- d- dinosaur!

[Hook - the reveal, beat drops, everybody dances]
(Lead) is it scary?... no!
(Lead) d, d, DANCE!
(Kids) d, d, dance!
(Lead) the dinosaur wants to dance!
(Kids) d- d- dance!
(Lead) stomp and dance, stomp and dance!
(Kids) d- d- dance!
(Lead) one more time —
(Kids) d- d- dance!

[Verse 2 - more d words + actions]
(Lead) Bang the d- d- drum!
(Kids) d- d- drum!
(Lead) Dig down low, d- d- dig!
(Kids) d- d- dig!
(Lead) Stomp it down, d- d- down!
(Kids) d- d- down!

[Hook]
(Lead) d, d, DANCE!
(Kids) d, d, dance!
(Lead) the dinosaur wants to dance!
(Kids) d- d- dance!
(Lead) stomp and dance, stomp and dance!
(Kids) d- d- dance!

[Outro - soft]
(Lead) The dancing dino takes a bow...
(Lead) the letter D says...
(Kids) d- d- dinosaur!
(Lead) d, d, dance!
(Kids) d, d, dance!
```
**TPR:** big slow dino stomps (verse 1, getting closer) · DANCE = everybody groove · bang drum · dig low · stomp down.

## E — "The Egg and the Elephant"  ·  sound /ĕ/ (short e)
**Diction note:** *say "eh" (short e as in egg/elephant), never "ee" the letter name.*
```
[Intro - slow 808, quiet, sparse]
(Lead) Look... an egg...
(Lead) eh- eh- egg...
(Kids) eh- eh- egg...

[Verse 1 - tap the egg, slow build]
(Lead) Tap, tap, eh- eh- egg!
(Kids) eh- eh- egg!
(Lead) Tap it soft, eh- eh- egg!
(Kids) eh- eh- egg!
(Lead) What's inside? eh- eh- egg!
(Kids) eh- eh- egg!
(Lead) crack... crack... crack...
(Lead) eh... eh... eh...
(Kids) eh... eh... eh...

[Hook - the surprise payoff]
(Lead) CRACK! out pops...
(Lead) eh, eh, ELEPHANT!
(Kids) eh, eh, elephant!
(Lead) an elephant from an egg?!
(Kids) eh- eh- elephant!
(Lead) swing your trunk, swing your trunk!
(Kids) eh- eh- eh!
(Lead) one more time —
(Kids) eh- eh- eh!

[Verse 2]
(Lead) Big ears flap, eh- eh- elephant!
(Kids) eh- eh- elephant!
(Lead) Bend your elbow, eh- eh- elbow!
(Kids) eh- eh- elbow!
(Lead) Stomp to the edge, eh- eh- edge!
(Kids) eh- eh- edge!

[Hook]
(Lead) eh, eh, ELEPHANT!
(Kids) eh, eh, elephant!
(Lead) an elephant from an egg?!
(Kids) eh- eh- elephant!
(Lead) swing your trunk, swing your trunk!
(Kids) eh- eh- eh!

[Outro - soft]
(Lead) The little elephant says hello...
(Lead) the letter E says...
(Kids) eh- eh- eh!
(Lead) eh, eh, egg!
(Kids) eh, eh, egg!
```
**TPR:** tap the egg · CRACK = hands burst open · swing trunk (arm) · flap big ears · bend elbow · stomp to the edge.

## F — "The Funny Fan"  ·  sound /f/
**Diction note:** *hold it long and breathy "fffff" like a fan, never the letter name "ef".*
```
[Intro - slow 808, quiet, a soft windy fff]
(Lead) Turn on the fan...
(Lead) fffff... f- f- fan...
(Kids) f- f- fan...

[Verse 1 - fan blowing, hold the fff]
(Lead) Blow it soft, fffff... fan!
(Kids) f- f- fan!
(Lead) Feel the wind, fffff... fan!
(Kids) f- f- fan!
(Lead) A little faster, f- f- fast!
(Kids) f- f- fast!
(Lead) fffff... fffff... fffff...
(Kids) fffff... fffff... fffff...

[Hook - turn it to max]
(Lead) turn it up — FWOOSH!
(Lead) f, f, fan!
(Kids) f, f, fan!
(Lead) it blows my hat — off it flies!
(Kids) f- f- fly!
(Lead) flap your arms, flap your arms!
(Kids) f- f- fly!
(Lead) one more time —
(Kids) f- f- fly!

[Verse 2]
(Lead) Swim like a f- f- fish!
(Kids) f- f- fish!
(Lead) Run so f- f- fast!
(Kids) f- f- fast!
(Lead) Stamp your f- f- feet!
(Kids) f- f- feet!

[Hook]
(Lead) f, f, fan!
(Kids) f, f, fan!
(Lead) it blows my hat — off it flies!
(Kids) f- f- fly!
(Lead) flap your arms, flap your arms!
(Kids) f- f- fly!

[Outro - soft, the fan winds down]
(Lead) Turn it off... fffff... shhh...
(Lead) the letter F says...
(Kids) fffff!
(Lead) f, f, fan!
(Kids) f, f, fan!
```
**TPR:** fan yourself (hold fffff) · FWOOSH = hat flies, hands up · flap arms (fly) · swim like a fish · run fast · stamp feet.

## G — "The Greedy Goat"  ·  sound /g/
**Diction note:** *hard g; drill via the word-onset chunk (go-go-goat), never "gee", never "guh", never soft "j".*
```
[Intro - slow 808, quiet, sparse]
(Lead) Here comes the goat...
(Lead) go, go, goat...
(Kids) go, go, goat...

[Verse 1 - galloping, slow build]
(Lead) Gallop, gallop, go, go, goat!
(Kids) go, go, goat!
(Lead) Off we go, go, go, go!
(Kids) go, go, go!
(Lead) Into the garden, gar, gar, garden!
(Kids) gar, gar, garden!
(Lead) gallop, gallop, go, go, go!
(Kids) go, go, go!

[Hook - the gobbling payoff]
(Lead) greedy, greedy goat!
(Kids) greedy, greedy goat!
(Lead) gobble, gobble — GULP!
(Kids) gobble — GULP!
(Lead) gobble it up, gobble it up!
(Kids) go, go, go!
(Lead) one more time —
(Kids) go, go, go!

[Verse 2]
(Lead) Munch the grass, gra, gra, grass!
(Kids) gra, gra, grass!
(Lead) Grab the gate, ga, ga, gate!
(Kids) ga, ga, gate!
(Lead) Go, go, go, go!
(Kids) go, go, go!

[Hook]
(Lead) greedy, greedy goat!
(Kids) greedy, greedy goat!
(Lead) gobble, gobble — GULP!
(Kids) gobble — GULP!
(Lead) gobble it up, gobble it up!
(Kids) go, go, go!

[Outro - soft, full belly]
(Lead) The greedy goat is full... burp...
(Lead) the letter G says...
(Kids) go, go, goat!
(Lead) go, go, go!
(Kids) go, go, go!
```
**TPR:** gallop in place · gobble (chomp) → big GULP (swallow, hands to belly) · munch grass · grab the gate · go-go-go (run).

## H — "Hop Up the Hill"  ·  sound /h/
**Diction note:** *soft breathy puff "ha, ha, ha" / huff, never the letter name "aitch".*
```
[Intro - slow 808, quiet, breathy]
(Lead) Up the hill... ha... ha...
(Lead) hop, hop, hop...
(Kids) hop, hop, hop...

[Verse 1 - hopping up the hill]
(Lead) Hop up the hill, hop, hop, hop!
(Kids) hop, hop, hop!
(Lead) It's so hot... huff, huff, huff!
(Kids) huff, huff, huff!
(Lead) Higher, higher, hop, hop, hop!
(Kids) hop, hop, hop!
(Lead) out of breath... ha... ha... ha...
(Kids) ha... ha... ha...

[Hook - the hiccup payoff]
(Lead) happy, happy hare!
(Kids) happy, happy hare!
(Lead) at the top — HIC! — hiccup!
(Kids) HIC! — hiccup!
(Lead) hop, hop, hop, hop!
(Kids) hop, hop, hop!
(Lead) one more time —
(Kids) hop, hop, hop!

[Verse 2]
(Lead) Wave your hands, hello, hello!
(Kids) hello, hello!
(Lead) Big warm hug, hug, hug, hug!
(Kids) hug, hug, hug!
(Lead) Hands on your head, hop, hop, hop!
(Kids) hop, hop, hop!

[Hook]
(Lead) happy, happy hare!
(Kids) happy, happy hare!
(Lead) at the top — HIC! — hiccup!
(Kids) HIC! — hiccup!
(Lead) hop, hop, hop, hop!
(Kids) hop, hop, hop!

[Outro - soft]
(Lead) The happy hare hops home...
(Lead) the letter H says...
(Kids) ha... ha... ha...
(Lead) hop, hop, hop!
(Kids) hop, hop, hop!
```
**TPR:** hop up the hill · huff (pant, hands on chest) · ha-ha (out of breath) · HICCUP jolt · wave hello · hug yourself · hands on head.

## I — "The Itchy Insect"  ·  sound /ĭ/ (short i)
**Diction note:** *say "ih" (short i as in insect/itchy), never "eye" the letter name.*
```
[Intro - slow 808, quiet, sparse]
(Lead) Uh oh... a little insect...
(Lead) ih- ih- insect...
(Kids) ih- ih- insect...

[Verse 1 - the itch builds]
(Lead) On my arm, ih- ih- itchy!
(Kids) ih- ih- itchy!
(Lead) Scratch, scratch, ih- ih- itchy!
(Kids) ih- ih- itchy!
(Lead) On my back, ih- ih- itchy!
(Kids) ih- ih- itchy!
(Lead) wiggle, wiggle, wiggle...
(Lead) ih... ih... ih...
(Kids) ih... ih... ih...

[Hook - the big wiggle payoff]
(Lead) ih, ih, itchy insect!
(Kids) ih, ih, itchy insect!
(Lead) wiggle it off — WIGGLE!
(Kids) ih- ih- WIGGLE!
(Lead) wiggle, wiggle, wiggle it off!
(Kids) ih- ih- ih!
(Lead) one more time —
(Kids) ih- ih- ih!

[Verse 2]
(Lead) Inch like a worm, ih- ih- inch!
(Kids) ih- ih- inch!
(Lead) Hide in the igloo, ih- ih- in!
(Kids) ih- ih- in!
(Lead) wiggle, wiggle, ih- ih- ih!
(Kids) ih- ih- ih!

[Hook]
(Lead) ih, ih, itchy insect!
(Kids) ih, ih, itchy insect!
(Lead) wiggle it off — WIGGLE!
(Kids) ih- ih- WIGGLE!
(Lead) wiggle, wiggle, wiggle it off!
(Kids) ih- ih- ih!

[Outro - soft]
(Lead) The itchy insect flies away...
(Lead) the letter I says...
(Kids) ih... ih... ih...
(Lead) ih, ih, insect!
(Kids) ih, ih, insect!
```
**TPR:** scratch all over (itchy) · build little wiggles · big full-body WIGGLE (shake the bug off) · inch like a worm · crouch "in" the igloo.

## J — "Jump in the Jelly"  ·  sound /dʒ/
**Diction note:** *soft "j" as in "jump"/"jelly"; drill via onset chunk (ju-ju-jump), never the letter name "jay".*
```
[Intro - slow 808, quiet, wobbly]
(Lead) Look at the jelly... wibble, wobble...
(Lead) ju, ju, jump...
(Kids) ju, ju, jump...

[Verse 1 - ready to jump, slow build]
(Lead) Ready to jump, ju, ju, jump!
(Kids) ju, ju, jump!
(Lead) Big wobbly jelly, je, je, jelly!
(Kids) je, je, jelly!
(Lead) Higher, higher, ju, ju, jump!
(Kids) ju, ju, jump!
(Lead) one... two... three...
(Lead) ju... ju... ju...
(Kids) ju... ju... ju...

[Hook - the splosh payoff]
(Lead) ju, ju, JUMP in the jelly!
(Kids) ju, ju, jump in the jelly!
(Lead) SPLOSH! — jiggle, jiggle!
(Kids) jiggle, jiggle!
(Lead) wobble like the jelly!
(Kids) ju, ju, jump!
(Lead) one more time —
(Kids) ju, ju, jump!

[Verse 2]
(Lead) Drink the juice, ju, ju, juice!
(Kids) ju, ju, juice!
(Lead) Jog on the spot, jo, jo, jog!
(Kids) jo, jo, jog!
(Lead) Jiggle and wobble, ju, ju, jump!
(Kids) ju, ju, jump!

[Hook]
(Lead) ju, ju, JUMP in the jelly!
(Kids) ju, ju, jump in the jelly!
(Lead) SPLOSH! — jiggle, jiggle!
(Kids) jiggle, jiggle!
(Lead) wobble like the jelly!
(Kids) ju, ju, jump!

[Outro - soft]
(Lead) All wobbled out... phew...
(Lead) the letter J says...
(Kids) ju, ju, jump!
(Lead) ju, ju, jelly!
(Kids) ju, ju, jelly!
```
**TPR:** jump up (ready, higher) · SPLOSH into the jelly · jiggle/wobble whole body like jelly (the star move) · drink juice · jog on the spot.

## K — "The Kicking Kangaroo"  ·  sound /k/
**Diction note:** *NO pure isolated k (it's a silent stop) — drill it on the punchy real word "kick, kick, kick", NOT a "ka" syllable. "kangaroo" is the hook. Hard k, never "kay", never "kuh".*
```
[Intro - slow 808, quiet, sparse]
(Lead) Here comes the kangaroo... boing... boing...
(Lead) kangaroo, kangaroo...
(Kids) kangaroo, kangaroo...

[Verse 1 - hopping, slow build]
(Lead) Hop, hop, kangaroo!
(Kids) hop, hop, kangaroo!
(Lead) Big strong legs — kick, kick, kick!
(Kids) kick, kick, kick!
(Lead) Higher, higher — kangaroo!
(Kids) higher, kangaroo!
(Lead) get ready... kick... kick... kick...
(Kids) kick... kick... kick...

[Hook - the giant kick payoff]
(Lead) kangaroo, kangaroo!
(Kids) kangaroo, kangaroo!
(Lead) big strong KICK — over the moon!
(Kids) KICK! — over the moon!
(Lead) kick it high, kick it high!
(Kids) kick, kick, kick!
(Lead) one more time —
(Kids) kick, kick, kick!

[Verse 2]
(Lead) Fly your kite — kite, kite, kite!
(Kids) kite, kite, kite!
(Lead) Karate kick — kick, kick, kick!
(Kids) kick, kick, kick!
(Lead) Hop like a kangaroo!
(Kids) kangaroo!

[Hook]
(Lead) kangaroo, kangaroo!
(Kids) kangaroo, kangaroo!
(Lead) big strong KICK — over the moon!
(Kids) KICK! — over the moon!
(Lead) kick it high, kick it high!
(Kids) kick, kick, kick!

[Outro - soft]
(Lead) The kangaroo bounces home...
(Lead) the letter K says...
(Kids) kick, kick, kick!
(Lead) kangaroo, kangaroo!
(Kids) kangaroo, kangaroo!
```
**TPR:** big kangaroo hops · wind up + kick (legs out, karate kick) · giant KICK "over the moon" · fly a kite · hop like a kangaroo.
**Alt (tested, "acceptable"):** writing the pure sound as the phonetic symbol `/k/` + a Style note ("pronounce /k/ as the sharp clipped k sound, not 'kay', never say 'slash'") reads OK in Suno — a usable option for stop consonants alongside the word-repeat approach.

## L — "The Lazy Lion's Lollipop"  ·  sound /l/
**Diction note:** *use "la, la, la" + words (lick/lion). VERDICT: `/l/` symbol read as "el" (the letter name — worse); bare "lll" growls to /r/. So for L → "la" (clean L onset; the "ah" carrier is unavoidable when singing a pitch). Style note: "sing 'la' with a strong CLEAR L at the front (key sound, as in lion/lick), never 'el', never a growl."*
**[PHONETIC-SYMBOL VERDICT: works for STOPS (/k/ acceptable), FAILS for liquids (/l/ → "el"). Not universal.]**
```
[Intro - slow 808, quiet, sparse]
(Lead) Here comes the lazy lion... la la la...
(Lead) la, la, lick...
(Kids) la, la, lick...

[Verse 1 - the lion licks, lazy and slow]
(Lead) Lazy lion, la, la, lick!
(Kids) la, la, lick!
(Lead) Lick the lollipop, la, la, lick!
(Kids) la, la, lick!
(Lead) Slow and lazy, la, la, lick!
(Kids) la, la, lick!
(Lead) la... la... la...
(Kids) la... la... la...

[Hook - the leap payoff]
(Lead) la, la, lazy lion!
(Kids) la, la, lazy lion!
(Lead) up he jumps — LEAP!
(Kids) la, la, LEAP!
(Lead) leap up high, leap up high!
(Kids) la, la, lick!
(Lead) one more time —
(Kids) la, la, lick!

[Verse 2]
(Lead) Look up high, la, la, look!
(Kids) la, la, look!
(Lead) Lift your legs, la, la, leg!
(Kids) la, la, leg!
(Lead) Lie down low, la, la, low!
(Kids) la, la, low!

[Hook]
(Lead) la, la, lazy lion!
(Kids) la, la, lazy lion!
(Lead) up he jumps — LEAP!
(Kids) la, la, LEAP!
(Lead) leap up high, leap up high!
(Kids) la, la, lick!

[Outro - soft]
(Lead) The lazy lion licks and sleeps...
(Lead) the letter L says...
(Kids) la... la... la...
(Lead) la, la, lick!
(Kids) la, la, lick!
```
**TPR:** lick a lollipop (tongue out, slow licks) · lazy lounge/stretch · big LEAP (jump up — lazy-then-leap surprise) · look up · lift legs · lie down low.

## M — "The Munching Monster"  ·  sound /m/
**Diction note:** *nasal hum "mmmm" (lips together, like something yummy) — holds clean (nasals sing well, unlike liquids). Never the letter name "em".*
```
[Intro - slow 808, quiet, sparse]
(Lead) Here comes the monster... mmm...
(Lead) mmm, munch, munch...
(Kids) mmm, munch, munch...

[Verse 1 - the monster munches, slow build]
(Lead) Munch, munch, mmm, munch!
(Kids) mmm, munch!
(Lead) Mud pies, mmm, munch!
(Kids) mmm, munch!
(Lead) Marshmallows, mmm, munch!
(Kids) mmm, munch!
(Lead) rub your tummy... mmm... mmm... mmm...
(Kids) mmm... mmm... mmm...

[Hook - the "MORE" payoff]
(Lead) mmm, munching monster!
(Kids) mmm, munching monster!
(Lead) all gone — MMM, MORE!
(Kids) MMM, MORE!
(Lead) munch it up, munch it up!
(Kids) mmm, munch!
(Lead) one more time —
(Kids) mmm, munch!

[Verse 2]
(Lead) March, march, mmm, march!
(Kids) mmm, march!
(Lead) Drink your milk, mmm, milk!
(Kids) mmm, milk!
(Lead) Reach the moon, mmm, moon!
(Kids) mmm, moon!

[Hook]
(Lead) mmm, munching monster!
(Kids) mmm, munching monster!
(Lead) all gone — MMM, MORE!
(Kids) MMM, MORE!
(Lead) munch it up, munch it up!
(Kids) mmm, munch!

[Outro - soft]
(Lead) The monster's full... mmm... yummy...
(Lead) the letter M says...
(Kids) mmm... mmm... mmm...
(Lead) mmm, munch!
(Kids) mmm, munch!
```
**TPR:** big monster munching (chomp) · rub tummy "mmm" · "MORE!" (hands out) · march like a monster · drink milk · reach for the moon.

## N — "The Sneaky Ninja"  ·  sound /n/
**Diction note:** *nasal hum "nnnn" (tongue tip behind top teeth, through the nose) — holds clean like M. Anchor with "no"/ninja. Never the letter name "en".*
```
[Intro - slow 808, quiet, sparse]
(Lead) Shhh... a ninja... nnn...
(Lead) nnn, ninja...
(Kids) nnn, ninja...

[Verse 1 - sneaking, slow build]
(Lead) Sneak, sneak, nnn, ninja!
(Kids) nnn, ninja!
(Lead) Quiet feet, nnn, ninja!
(Kids) nnn, ninja!
(Lead) Reach for the noodle, nnn, noodle!
(Kids) nnn, noodle!
(Lead) closer, closer... nnn... nnn... nnn...
(Kids) nnn... nnn... nnn...

[Hook - the "NO!" payoff]
(Lead) nnn, naughty ninja!
(Kids) nnn, naughty ninja!
(Lead) caught you — NO, NO, NO!
(Kids) NO, NO, NO!
(Lead) shake your head — no, no!
(Kids) nnn, no!
(Lead) one more time —
(Kids) nnn, no!

[Verse 2]
(Lead) Touch your nose, nnn, nose!
(Kids) nnn, nose!
(Lead) Nod your head, nnn, nod!
(Kids) nnn, nod!
(Lead) Have a nap, nnn, nap!
(Kids) nnn, nap!

[Hook]
(Lead) nnn, naughty ninja!
(Kids) nnn, naughty ninja!
(Lead) caught you — NO, NO, NO!
(Kids) NO, NO, NO!
(Lead) shake your head — no, no!
(Kids) nnn, no!

[Outro - soft]
(Lead) The sneaky ninja tiptoes home...
(Lead) the letter N says...
(Kids) nnn... nnn... nnn...
(Lead) nnn, ninja!
(Kids) nnn, ninja!
```
**TPR:** ninja tiptoe + sneaky reach for the noodle · busted → big head-shake "NO, NO, NO!" · touch your nose · nod your head · have a nap (hands as pillow).

## O — "The Wobbly Octopus"  ·  sound /ŏ/ (short o)
**Diction note:** *short open "o" as in octopus/on (like "ah"), never the long letter name "oh". Lean hard on on/off/octopus; if Suno says "oh", drop the bare "o" and ride words only.*
```
[Intro - slow 808, quiet, sparse]
(Lead) Look — an octopus on a rock... wibble, wobble...
(Lead) o, o, octopus...
(Kids) o, o, octopus...

[Verse 1 - wobbling arms, socks on/off, slow build]
(Lead) Eight wobbly arms — o, o, octopus!
(Kids) o, o, octopus!
(Lead) Socks on — on, on, on!
(Kids) on, on, on!
(Lead) Socks off — off, off, off!
(Kids) off, off, off!
(Lead) wibble, wobble... o... o... o...
(Kids) o... o... o...

[Hook - the "OFF the rock" payoff]
(Lead) o, o, wobbly octopus!
(Kids) o, o, wobbly octopus!
(Lead) wibble, wobble — OFF the rock!
(Kids) OFF — off the rock!
(Lead) wobble, wobble, wobble!
(Kids) o, o, octopus!
(Lead) one more time —
(Kids) o, o, octopus!

[Verse 2]
(Lead) Hop on top — on, on, on!
(Kids) on, on, on!
(Lead) Mop the spot — o, o, mop!
(Kids) o, o, mop!
(Lead) Pop, pop, on the dot!
(Kids) on the dot!

[Hook]
(Lead) o, o, wobbly octopus!
(Kids) o, o, wobbly octopus!
(Lead) wibble, wobble — OFF the rock!
(Kids) OFF — off the rock!
(Lead) wobble, wobble, wobble!
(Kids) o, o, octopus!

[Outro - soft]
(Lead) The octopus climbs back on...
(Lead) the letter O says...
(Kids) o... o... o...
(Lead) o, o, octopus!
(Kids) o, o, octopus!
```
**TPR:** wiggle all 8 arms · mime socks on/off · wobble · topple OFF the rock · hop on top · mop the spot.

## P — "The Popping Popcorn"  ·  sound /p/
**Diction note:** *stop consonant — drill /p/ on the real word "pop" (a sharp lip-pop), never "pah", never the letter name "pee".*
```
[Intro - slow 808, quiet, sparse]
(Lead) Popcorn in the pot... getting hot...
(Lead) pop... pop... pop...
(Kids) pop... pop... pop...

[Verse 1 - the corn starts to pop, slow build]
(Lead) Getting hot, pop, pop, pop!
(Kids) pop, pop, pop!
(Lead) One little kernel, pop, pop, pop!
(Kids) pop, pop, pop!
(Lead) Faster, faster, pop, pop, pop!
(Kids) pop, pop, pop!
(Lead) pop... pop... pop...
(Kids) pop... pop... pop...

[Hook - the lid blows, payoff]
(Lead) pop, pop, popcorn!
(Kids) pop, pop, popcorn!
(Lead) the lid blows — POP! — everywhere!
(Kids) POP! — everywhere!
(Lead) pop up high, pop up high!
(Kids) pop, pop, pop!
(Lead) one more time —
(Kids) pop, pop, pop!

[Verse 2]
(Lead) Push, push, push the pot!
(Kids) push, push, push!
(Lead) Pat, pat, pat the panda!
(Kids) pat, pat, pat!
(Lead) Pop up high — pop, pop, pop!
(Kids) pop, pop, pop!

[Hook]
(Lead) pop, pop, popcorn!
(Kids) pop, pop, popcorn!
(Lead) the lid blows — POP! — everywhere!
(Kids) POP! — everywhere!
(Lead) pop up high, pop up high!
(Kids) pop, pop, pop!

[Outro - soft]
(Lead) All popped out... yummy popcorn...
(Lead) the letter P says...
(Kids) pop, pop, pop!
(Lead) pop, pop, popcorn!
(Kids) pop, pop, popcorn!
```
**TPR:** pop up like popcorn (jump up, faster) · the big POP (jump + explode arms) · push the pot · pat the panda · pop up high.

### P — FULL MATERIALS ART PACK  ·  sound /p/
**Title (full, for Suno/file):** **"Letter P — The Popping Popcorn (Dark Phonics: Move & Say)"**
**Vocab set (8 keywords, generate `[CARD]` once each, reuse everywhere):** popcorn · pot · pan · pen · pig · panda · pizza · pumpkin.

**1. Cover `[COVER]`** — a pot of popcorn exploding, kernels flying everywhere, the lid blown sky-high, Mo ducking and laughing underneath.

**2. Booklet pages `[PAGE]` ×5:**
- p1 — Mo carries a big black pot of corn to the stove, grinning, one tiny kernel inside.
- p2 — the pot on the heat, first kernel goes *pop*, one piece of popcorn jumps up, Mo's eyes huge.
- p3 — pop pop pop! lots of popcorn leaping out of the pot, Mo dancing, pushing the pot.
- p4 — a friendly panda appears; Mo pats the panda, popcorn raining down on both of them.
- p5 — the lid blows off — POP! — popcorn everywhere like snow, Mo and panda cheering, mouths open catching it.

**3. Three-part / sorting-YES `[CARD]` ×8:** popcorn · pot · pan · pen · pig · panda · pizza · pumpkin (each ONE object, isolated on white).

**4. Sorting-NO distractor `[CARD]` ×6** (do NOT start with /p/): dog · sun · ball · fish · egg · cat.

**5. Sentence-matching scenes `[PAGE]` ×4** (decodable, simple):
- "The pig is in the pot." — a cheeky pig sitting happily inside the big pot.
- "Pat the panda." — Mo patting the panda's head.
- "Pop the popcorn!" — the pot exploding with popcorn.
- "A big, big pizza." — Mo holding a giant pizza.

**6. Letter-formation / sandpaper card `[FORM]`** — a giant lowercase **p** as the hero; popcorn kernels popping up along the down-stroke and around the bowl; a tiny Mo figure popping up out of the top to show the "pop up high" TPR action; small popcorn-pot picture beside it.

**7. Sound poster / control chart `[POSTER]`** — big **P p** at the top; center = the popcorn pot exploding; Mo + the panda beside it; 3 mini action figures around the edge: jump-up-like-popcorn, the big POP (arms exploding), pat-the-panda.

**8. Coloring page `[COLOR]`** — Mo and the panda under a shower of popcorn from the exploding pot, clean thick line-art only for kids to color.

*(optional)* Bingo/lotto = the 8 `[CARD]` images in a grid · Parent QR card → "Pop, Pop, Popcorn" on montree.xyz.

### Q — READER (streamlined)  ·  sound /kw/ (qu)
**Title:** **"Letter Q — The Quick Quacking Duck (Dark Phonics: Move & Say)"**
**Diction:** Q = /kw/ → drill on **"quack"** (kw-ack); never the letter name "cue."
**Star:** Quack the duck → host at `montree.xyz/phonics-characters/duck.png` (file `public/phonics-characters/duck.png`) once generated. TPR: quack (flap wings) · quick (run on spot) · quiet (wing/finger to lips).
**SONG (Suno, do first):**
```
[Intro - slow 808, quiet, sparse]
(Lead) Down by the pond... shhh...
(Lead) qu- qu- quack...
(Kids) qu- qu- quack...

[Verse 1 - the duck wakes up and quacks, slow build]
(Lead) Little duck, qu- qu- quack!
(Kids) qu- qu- quack!
(Lead) Open your beak, qu- qu- quack!
(Kids) qu- qu- quack!
(Lead) Louder now, qu- qu- quack!
(Kids) qu- qu- quack!
(Lead) qu... qu... quack...
(Kids) qu... qu... quack...

[Hook - payoff, beat drops, big movement]
(Lead) quick, quick, quacking duck!
(Kids) quick, quick, quacking duck!
(Lead) run so quick — qu- qu- quack!
(Kids) qu- qu- quack!
(Lead) flap your wings, flap your wings!
(Kids) qu- qu- quack!
(Lead) one more time —
(Kids) qu- qu- quack!

[Verse 2 - quick + quiet, the freeze game]
(Lead) Run so quick, qu- qu- quick!
(Kids) qu- qu- quick!
(Lead) Now... be... quiet... shhh...
(Kids) ...shhh...
(Lead) but the little duck says qu- qu- quack!
(Kids) qu- qu- quack!

[Hook]
(Lead) quick, quick, quacking duck!
(Kids) quick, quick, quacking duck!
(Lead) run so quick — qu- qu- quack!
(Kids) qu- qu- quack!
(Lead) flap your wings, flap your wings!
(Kids) qu- qu- quack!

[Outro - soft]
(Lead) The pond is quiet now... shhh...
(Lead) but the letter Q says...
(Kids) qu- qu- quack!
(Lead) quick, quick, quack!
(Kids) quick, quick, quack!
```
**TPR:** flap wings (quack) · run quick on the spot (quick) · finger to lips + freeze (quiet) · burst back to quacking.
**Character-reference prompt (DARK STYLE):** `character reference sheet of a cartoon duck named Quack, a round fluffy duck with a big round head, very big round googly eyes, a wide beak, cheeky expression, full body standing facing forward, moody hand-drawn pen-and-ink, fine crosshatch, dramatic shadows and high-contrast cinematic low-key lighting, muted desaturated palette with one bold spot colour, whimsical but slightly spooky children's-book style, pale background with deep soft shadows --ar 1:1 --style raw --stylize 250 --no signature, watermark, text, logo`.
**Reader (5 pages, mirror the song):**
1. *"This is Quack the duck. Quack likes to quack."* — the duck waddling, happy.
2. *"Quack, quack, quack!"* — the duck quacking loud, beak wide open.
3. *"Quick, quick! Quack runs quick!"* — the duck running fast, legs a blur.
4. *"'Quiet!' say the animals. Shhh."* — other animals with a wing to the beak, shushing.
5. *"But Quack can't be quiet — quack, quack, quack!"* — the duck quacking again, everyone laughing.
**Duck HOSTED ✅** (2026-06-09) at `https://montree.xyz/phonics-characters/duck.png` (scruffy black duck, big orange beak — orange = the spot colour). Reader prompts = each page scene above + DARK STYLE string + `--ar 3:2 --style raw --stylize 250 --no signature, watermark, text, logo --oref https://montree.xyz/phonics-characters/duck.png --ow 200`, run on **V7/Relax**. (Cover same with `--ar 4:5`.) Keep "scruffy black duck with a big bright orange beak and big round googly eyes" in each prompt's text so words agree with the reference. **Next physical step: founder generates the 5 pages; then → R.**

---

# BOOKS (each mirrors its song · ~5 pages · Midjourney prompts)

**[STYLE]** = append this to every page + character-sheet prompt:
`colored hand-drawn pen-and-ink illustration, fine crosshatch shading, whimsical Dr. Seuss children's-book style, big expressive googly eyes, cute and cozy, limited natural palette, plain white background --ar 3:2 --style raw --stylize 250 --no signature, watermark, text, logo`

**Recurring protagonist (use across all books for a cohesive A–Z set):**
> **CHARACTER SHEET — "Mo" the phonics kid:** Character reference model sheet of a happy little child with a round face, rosy cheeks, big round googly eyes, a small tuft of hair, wearing simple dungarees and a striped shirt — shown three times: front, side, and a big happy grin, standing apart on a plain white background, consistent character design, same colours and proportions. [STYLE]

*Make Mo's sheet first; then `--cref <Mo-sheet-url> --ow 400` on every page Mo appears in.*

**EACH letter also gets a COVER / HERO image** — one picture capturing the song's funniest moment (e.g. "ninja slurping noodles", "octopus wobbling off the rock"). This is the anchor used everywhere: book cover, poster, video thumbnail, flashcard front. Portrait `--ar 4:5`, same [STYLE]. The per-letter image set = **1 cover + 5 pages + keyword pics** (noodle, nose, net…) — every other material (3-part cards, sentence cards, sorting, bingo) is cut from those.

## COVERS — one hero image per song (the anchor: book cover, poster, video thumbnail, flashcard front)
**[COVER]** = append: `colored hand-drawn pen-and-ink, fine crosshatch, whimsical Dr. Seuss children's-book style, big googly eyes, plain white background --ar 4:5 --style raw --stylize 250 --no signature, watermark, text, logo`

- **A** — Mo with a tiny ant crawling up his bare arm, recoiling in big silly mock-alarm, arms flailing, wide googly eyes. [COVER]
- **B** — Mo and a big colourful striped ball bonking him on the head with a "boing" squash, hair flying, laughing. [COVER]
- **C** — the cheeky grey-and-white cat mid paw-swipe knocking a cup off a table edge, the cup tumbling, pleased grin. [COVER]
- **D** — a big goofy friendly dinosaur dancing up on its toes, little arms out, joyful, big googly eyes. [COVER]
- **E** — a tiny cute elephant bursting up out of a cracked egg, trunk in the air, eggshell flying, Mo amazed beside it. [COVER]
- **F** — Mo in a big gust from a chunky fan, his hat flying off into the air, hair blown wild, laughing. [COVER]
- **G** — the greedy goat with an enormous round full belly doing a big GULP, a bare nibbled garden behind, guilty grin. [COVER]
- **H** — the happy long-eared hare at a hilltop popping up with a giant surprised HICCUP, ears flying. [COVER]
- **I** — Mo doing a big silly full-body wiggle to shake off a tiny bug that's flying away, itchy and giggling. [COVER]
- **J** — Mo mid-splash leaping into a giant bowl of wobbly jelly, jelly flying everywhere, pure joy. [COVER]
- **K** — the kangaroo mid-enormous-kick, one leg flung sky-high, a ball rocketing up toward the moon, big grin. [COVER]
- **L** — the lazy lion lounging back licking a giant swirly lollipop, droopy and content, tongue out. [COVER]
- **M** — a big friendly fuzzy monster cheerfully munching everything in sight, cheeks stuffed, reaching for MORE. [COVER]
- **N** — the cheeky ninja slurping a giant bowl of noodles, noodles flying and dangling, guilty grin (the one already generated). [COVER]
- **O** — a goofy wobbly octopus on a rock, eight arms flailing with little socks on some, mid-topple OFF the rock. [COVER]
- **P** — a pot of popcorn exploding, popcorn flying everywhere, the lid blown sky-high, Mo ducking and laughing. [COVER]

---

## BOOK A — "Ant on My Arm"
> **CHARACTER SHEET — the ant:** model sheet of one tiny friendly cartoon ant, round body, big googly eyes, a cheeky smile, three views. [STYLE]

- **Page 1** — *"An ant! a, a, ant — on my hand."* → *MJ:* Mo looking down in delight at one tiny friendly ant sitting on Mo's open hand, the ant big and clear. [STYLE]
- **Page 2** — *"Up my arm... a, a, ant!"* → *MJ:* the same tiny ant walking up Mo's bare arm, Mo watching it with big googly eyes, the ant clearly mid-stride on the arm. [STYLE]
- **Page 3** — *"Tickle, tickle, up to my neck!"* → *MJ:* the ant on Mo's shoulder near the neck, Mo scrunching up giggling and ticklish. [STYLE]
- **Page 4** — *"Oh no — a, a, ALARM! Shake it off!"* → *MJ:* Mo in big silly mock-panic, arms flailing, the little ant tumbling off through the air, lots of motion. [STYLE]
- **Page 5** — *"Phew! The letter A says a, a, apple."* → *MJ:* Mo calm and smiling, holding a big shiny red apple, the friendly ant waving goodbye from the corner. [STYLE]

## BOOK B — "Bounce the Ball"
> **CHARACTER SHEET — the ball:** model sheet of one big round bouncy rubber ball with bright colourful stripes, simple and clean, three views. [STYLE]

- **Page 1** — *"b, b, ball — bounce it low!"* → *MJ:* Mo bouncing a big colourful striped ball low to the ground with one hand, the ball big and clear. [STYLE]
- **Page 2** — *"Higher, higher — b, b, bounce!"* → *MJ:* Mo bouncing the big striped ball up to chest height, looking up at it, motion lines. [STYLE]
- **Page 3** — *"Up, up, up!"* → *MJ:* the big striped ball flying high above Mo's reaching hands, Mo on tiptoes looking up. [STYLE]
- **Page 4** — *"On my head — b, b, BOING!"* → *MJ:* the ball bonking the top of Mo's head with a silly "boing" squash, Mo's googly eyes wide, very funny. [STYLE]
- **Page 5** — *"The letter B says b, b, ball!"* → *MJ:* Mo laughing and hugging the big striped ball happily. [STYLE]

## BOOK C — "The Cheeky Cat"
> **CHARACTER SHEET — the cheeky cat:** model sheet of one cheeky plump grey-and-white cartoon cat with a big round head, huge round googly eyes, tiny pink nose, a mischievous grin, three views. [STYLE]

- **Page 1** — *"Creep, creep — c, c, cat."* → *MJ:* the cheeky grey-and-white cat creeping low and sneaky across the floor, big mischievous googly eyes, the cat large and clear. [STYLE]
- **Page 2** — *"Eyeing the cup — c, c, cup."* → *MJ:* the cat crouched, staring intently at a single cup sitting on the edge of a table, the cup clear and prominent. [STYLE]
- **Page 3** — *"Closer, closer — c, c, creep!"* → *MJ:* the cat stretching up on its back legs, one paw raised toward the cup, sneaky grin. [STYLE]
- **Page 4** — *"Knocks the cup — c, c, CRASH!"* → *MJ:* the cat's paw swatting the cup off the table mid-fall, the cup tumbling, a funny CRASH moment, cat looking pleased. [STYLE]
- **Page 5** — *"Naughty cat! The letter C says c, c, cat."* → *MJ:* the cheeky cat scampering away with a big guilty grin, tail high, the empty table behind. [STYLE]

---

## BOOK D — "The Dancing Dinosaur"
> **CHARACTER SHEET — the dino:** model sheet of one big friendly round cartoon dinosaur with a goofy grin, huge googly eyes, little arms and big stompy feet, three views. [STYLE]

- **Page 1** — *"Boom, boom... d, d, dinosaur!"* → *MJ:* Mo looking off in surprise as huge three-toed dinosaur footprints and distant dust clouds appear, big googly eyes. [STYLE]
- **Page 2** — *"Big feet stomp — d, d, down!"* → *MJ:* a big friendly goofy dinosaur stomping down the path toward little Mo, one giant foot coming down, Mo looking up wide-eyed. [STYLE]
- **Page 3** — *"Closer, closer... is it scary?"* → *MJ:* the big dinosaur leaning right down close to Mo, looming but with a secretly goofy look, suspense. [STYLE]
- **Page 4** — *"No! d, d, DANCE!"* → *MJ:* the big dinosaur grinning and dancing up on its toes, Mo dancing happily right alongside it, lots of motion and fun. [STYLE]
- **Page 5** — *"The letter D says d, d, dance!"* → *MJ:* the dancing dinosaur taking a happy bow, Mo clapping and cheering. [STYLE]

---

## BOOK E — "The Egg and the Elephant"
> **CHARACTER SHEET — the surprise elephant:** model sheet of one tiny cute cartoon elephant, round body, big googly eyes, a little curly trunk and big floppy ears, three views. [STYLE]

- **Page 1** — *"Look — an egg! eh, eh, egg."* → *MJ:* Mo crouched, peering curiously at one big smooth egg on the ground, the egg large and clear, big googly eyes. [STYLE]
- **Page 2** — *"Tap, tap — eh, eh, egg."* → *MJ:* Mo gently tapping the big egg with one finger, leaning in, the egg prominent. [STYLE]
- **Page 3** — *"Crack... crack..."* → *MJ:* the big egg with a jagged crack spreading across it, a little wobble, Mo's eyes wide with suspense. [STYLE]
- **Page 4** — *"Out pops — eh, eh, ELEPHANT!"* → *MJ:* a tiny cute elephant bursting up out of the cracked egg, trunk in the air, eggshell flying, Mo amazed — funny because the elephant is far too big for the egg. [STYLE]
- **Page 5** — *"The letter E says eh, eh, egg."* → *MJ:* Mo happily waving with the little elephant, eggshell pieces around their feet. [STYLE]

## BOOK F — "The Funny Fan"
> **CHARACTER SHEET — the fan:** model sheet of one friendly chunky old-fashioned electric fan with a round cage, a little dial, and big googly eyes on the front, three views. [STYLE]

- **Page 1** — *"Turn on the fan... fffff."* → *MJ:* Mo reaching to switch on a chunky friendly fan, hair just starting to lift in the breeze. [STYLE]
- **Page 2** — *"Blow it soft, f, f, fan."* → *MJ:* Mo grinning in a gentle breeze from the fan, hair and shirt softly blowing. [STYLE]
- **Page 3** — *"Turn it up — FWOOSH!"* → *MJ:* Mo cranking the fan's dial to max, a big gust of wind and a few leaves whooshing across the frame. [STYLE]
- **Page 4** — *"It blows my hat — off it flies!"* → *MJ:* Mo's hat flying up off their head into the air, hair blown wild, Mo reaching after it, very funny. [STYLE]
- **Page 5** — *"The letter F says f, f, fan."* → *MJ:* Mo laughing as the hat lands back on their head, the fan winding down. [STYLE]

## BOOK G — "The Greedy Goat"
> **CHARACTER SHEET — the greedy goat:** model sheet of one cheeky cartoon goat with a big round belly, little horns, a wispy beard and huge googly eyes, three views. [STYLE]

- **Page 1** — *"Here comes the goat... go, go, goat."* → *MJ:* a cheeky goat galloping happily toward a green garden, Mo watching from the side. [STYLE]
- **Page 2** — *"Into the garden — go, go, garden!"* → *MJ:* the goat standing in a garden full of grass and flowers, eyeing it greedily and licking its lips. [STYLE]
- **Page 3** — *"Gobble, gobble..."* → *MJ:* the goat gobbling up grass and flowers fast, cheeks stuffed full, bits flying, funny. [STYLE]
- **Page 4** — *"GULP! — the greedy goat!"* → *MJ:* the goat with an enormous round full belly doing a big GULP, looking pleased and a little guilty, the garden now bare. [STYLE]
- **Page 5** — *"The letter G says go, go, goat."* → *MJ:* the full goat flopped back happily with a little burp, Mo laughing. [STYLE]

## BOOK H — "Hop Up the Hill"
> **CHARACTER SHEET — the happy hare:** model sheet of one cute cartoon hare with long floppy ears, big googly eyes and big back feet, mid-hop, three views. [STYLE]

- **Page 1** — *"Up the hill... hop, hop, hop."* → *MJ:* a happy hare at the foot of a big green hill, crouched ready to hop, Mo cheering it on. [STYLE]
- **Page 2** — *"It's so hot — huff, huff, huff!"* → *MJ:* the hare hopping up the steep hill, tongue out, little sweat drops, looking puffed. [STYLE]
- **Page 3** — *"Higher, higher..."* → *MJ:* the hare near the very top of the hill, one big hop to go, huffing. [STYLE]
- **Page 4** — *"At the top — HIC! — hiccup!"* → *MJ:* the hare at the summit popping up in the air with a giant surprised HICCUP, eyes wide, very funny. [STYLE]
- **Page 5** — *"The letter H says hop, hop, hop."* → *MJ:* the happy hare waving hello from the hilltop, Mo waving back from below. [STYLE]

## BOOK I — "The Itchy Insect"
> **CHARACTER SHEET — the itchy insect:** model sheet of one tiny cute cartoon bug with big googly eyes, little antennae and a cheeky grin, three views. [STYLE]

- **Page 1** — *"A little insect... ih, ih, insect."* → *MJ:* a tiny cute bug landing on Mo's arm, Mo just noticing it, the bug clear and prominent. [STYLE]
- **Page 2** — *"On my arm — ih, ih, itchy!"* → *MJ:* the bug crawling on Mo's arm, Mo starting to scratch the spot, looking ticklish. [STYLE]
- **Page 3** — *"Itchy, itchy — scratch, scratch!"* → *MJ:* Mo scratching all over — arm, back, head — itchy everywhere, the little bug hopping about, funny. [STYLE]
- **Page 4** — *"Wiggle it off — WIGGLE!"* → *MJ:* Mo doing a big silly full-body wiggle dance to shake the bug off, the bug flying away, lots of motion. [STYLE]
- **Page 5** — *"The letter I says ih, ih, insect."* → *MJ:* Mo relieved and giggling, the little insect waving goodbye from the corner. [STYLE]

---

## BOOK J — "Jump in the Jelly"
> **CHARACTER SHEET — the jelly:** model sheet of one giant wobbly bowl of bright red jelly, glossy and jiggly, with a cheeky face and big googly eyes, three views. [STYLE]

- **Page 1** — *"Look at the wobbly jelly!"* → *MJ:* Mo standing at the edge of a giant bowl of bright wobbly jelly, eyes wide and excited, ready to jump. [STYLE]
- **Page 2** — *"Ready... ju, ju, jump!"* → *MJ:* Mo crouched low to spring, the giant jelly wibbling and wobbling beside him. [STYLE]
- **Page 3** — *"Higher, higher!"* → *MJ:* Mo leaping high up into the air above the wobbly jelly, arms up. [STYLE]
- **Page 4** — *"SPLOSH! — jiggle, jiggle!"* → *MJ:* Mo splashing down into the giant jelly, jelly flying everywhere, pure joy. [STYLE]
- **Page 5** — *"The letter J says ju, ju, jump!"* → *MJ:* Mo sitting in the jelly all jiggly and laughing, covered in wobble. [STYLE]

## BOOK K — "The Kicking Kangaroo"
> **CHARACTER SHEET — the kangaroo:** model sheet of one cheerful cartoon kangaroo with big strong back legs, a little pouch, big googly eyes, three views. [STYLE]

- **Page 1** — *"Here comes the kangaroo — boing, boing!"* → *MJ:* the kangaroo bouncing happily into frame, Mo watching with a grin. [STYLE]
- **Page 2** — *"Big strong legs — kick, kick, kick!"* → *MJ:* the kangaroo leaning back and winding up one big strong leg for a kick. [STYLE]
- **Page 3** — *"Get ready..."* → *MJ:* the kangaroo's leg drawn way back, eyes focused, a ball waiting in front of it. [STYLE]
- **Page 4** — *"Big strong KICK — over the moon!"* → *MJ:* the giant kick — leg flung sky-high, a ball rocketing up toward the moon, huge grin. [STYLE]
- **Page 5** — *"The letter K says kick, kick, kick!"* → *MJ:* the kangaroo taking a happy bow, Mo cheering. [STYLE]

## BOOK L — "The Lazy Lion's Lollipop"
> **CHARACTER SHEET — the lazy lion:** model sheet of one big sleepy cartoon lion with a droopy mane, half-closed happy googly eyes, three views. [STYLE]

- **Page 1** — *"The lazy lion... la la la..."* → *MJ:* the lazy lion lounging back on its side holding a giant swirly lollipop, droopy and content. [STYLE]
- **Page 2** — *"la, la, lick!"* → *MJ:* the lion lazily licking the giant lollipop, tongue out, eyes half-closed. [STYLE]
- **Page 3** — *"So slow and lazy..."* → *MJ:* the lion doing a big lazy stretch and yawn, lollipop resting in one paw. [STYLE]
- **Page 4** — *"Up he jumps — LEAP!"* → *MJ:* the lazy lion suddenly LEAPING up high in a surprise burst of energy, lollipop flying. [STYLE]
- **Page 5** — *"The letter L says la, la, lick!"* → *MJ:* the lion flopped back down content, happily licking the lollipop again, Mo giggling. [STYLE]

## BOOK M — "The Munching Monster"
> **CHARACTER SHEET — the munching monster:** model sheet of one big friendly fuzzy cartoon monster with a wide grin, round belly, huge googly eyes, three views. [STYLE]

- **Page 1** — *"Here comes the monster... mmm!"* → *MJ:* the big friendly fuzzy monster appearing with a hungry happy grin. [STYLE]
- **Page 2** — *"mmm, munch — mud pies!"* → *MJ:* the monster munching a tall stack of mud pies, cheeks stuffed full. [STYLE]
- **Page 3** — *"mmm, munch — marshmallows!"* → *MJ:* the monster gobbling fluffy marshmallows, delighted. [STYLE]
- **Page 4** — *"mmm... rub your tummy..."* → *MJ:* the monster rubbing its round full belly with a blissful "mmm" face. [STYLE]
- **Page 5** — *"all gone — MMM, MORE!"* → *MJ:* the monster holding out both hands demanding "MORE!", cheeky and round-bellied, Mo laughing. [STYLE]

## BOOK N — "The Sneaky Ninja"
> **CHARACTER SHEET — the ninja:** model sheet of one cheeky little cartoon ninja in a black outfit and headband, big googly eyes, three views. [STYLE]

- **Page 1** — *"Shhh... a ninja... nnn..."* → *MJ:* the little ninja tiptoeing in sneakily, one finger to his lips, big googly eyes. [STYLE]
- **Page 2** — *"Reach for the noodle..."* → *MJ:* the ninja crouched, eyeing a big steaming bowl of noodles hungrily. [STYLE]
- **Page 3** — *"Closer, closer..."* → *MJ:* the ninja reaching out one sneaky hand toward the noodle bowl, tongue out. [STYLE]
- **Page 4** — *"Caught you — NO, NO, NO!"* → *MJ:* the ninja caught mid-slurp, noodles flying and dangling everywhere, busted guilty grin. [STYLE]
- **Page 5** — *"The letter N says nnn, ninja!"* → *MJ:* the ninja tiptoeing away with a guilty grin, one noodle still hanging from his mouth. [STYLE]

## BOOK O — "The Wobbly Octopus"
> **CHARACTER SHEET — the octopus:** model sheet of one goofy round cartoon octopus with eight wiggly arms and big googly eyes, three views. [STYLE]

- **Page 1** — *"An octopus on a rock... wibble, wobble..."* → *MJ:* the goofy octopus perched on a rock, all eight arms up and wiggly, big googly eyes. [STYLE]
- **Page 2** — *"Socks on — on, on, on!"* → *MJ:* the octopus pulling little stripy socks onto several of its eight arms, concentrating. [STYLE]
- **Page 3** — *"Wibble, wobble..."* → *MJ:* the octopus wobbling and off-balance on the rock, arms flailing for balance. [STYLE]
- **Page 4** — *"OFF the rock!"* → *MJ:* the octopus toppling right OFF the rock, arms everywhere, socks flying, very funny. [STYLE]
- **Page 5** — *"The letter O says o, o, octopus!"* → *MJ:* the octopus determinedly climbing back up onto the rock, Mo laughing. [STYLE]

## BOOK P — "Pop, Pop, Popcorn"
> **CHARACTER SHEET — the popcorn pot:** model sheet of one cheerful round cooking pot with a lid, a few popcorn kernels and fluffy popped corn, with a face and big googly eyes, three views. [STYLE]

- **Page 1** — *"Popcorn in the pot, getting hot..."* → *MJ:* a round pot on a little stove with a few kernels inside, Mo peering in, big googly eyes. [STYLE]
- **Page 2** — *"One little kernel — pop!"* → *MJ:* one piece of popcorn popping up out of the pot, Mo surprised. [STYLE]
- **Page 3** — *"Faster, faster — pop, pop, pop!"* → *MJ:* lots of popcorn popping up out of the pot at once, the lid starting to rattle. [STYLE]
- **Page 4** — *"The lid blows — POP! — everywhere!"* → *MJ:* the pot lid blowing sky-high, popcorn exploding everywhere, Mo ducking and laughing. [STYLE]
- **Page 5** — *"The letter P says pop, pop, pop!"* → *MJ:* Mo happily catching and eating the fluffy popcorn, pot empty and grinning. [STYLE]

---

*Next: Q song + book. Tick the status table each time. Every song's full lyrics live in the SONGS section above; every cover in the COVERS section — this doc is the full manifesto.*
