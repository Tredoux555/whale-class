# Grace & Courtesy Song Cycle — First Two Weeks of School
**10 songs · 10 school days · Fable-authored Jul 16, 2026 · Suno style v2 (locked) · mvgen align-path**

## 0. Design rulings

1. **One song per day, one rule per song.** Grace & Courtesy lessons are presented one at a
   time, modeled, then practiced — the song is the circle-time anchor for THAT day's
   presentation, sung right after the teacher demonstrates the rule. Honors the locked
   one-pattern-per-song rule.
2. **Day 10 is the recap anthem** ("The Whale Class Way") — one line per rule, call-and-response.
   It becomes the class anthem for the rest of the year. This is the "one song with all the
   rules" — earned, not front-loaded.
3. **Montessori language is always positive.** We sing what we DO: "walking feet," never
   "don't run"; "gentle hands," never "no hitting"; "indoor voice," never "stop shouting."
4. **The potato is the rule-breaker who learns.** In 4 songs (D2, D3, D7, D10) the potato
   forgets the rule and the class reminds him with the rule phrase — children practicing
   gracious correction IS Grace & Courtesy. Use the canonical crowned-potato cast ref for MJ.
5. **WHOLE-WORDS rule applies** — no syllable-splitting anywhere. No phonics stutters needed;
   these are rule-phrase chant songs.
6. **"Whale Class" is swappable** — any school renders D10 with its own class name (one word
   swap in the lyric + title).
7. **Names on Day 1:** a rendered track can't hold each year's roster. The Hello song teaches
   the greeting FRAME; the teacher runs the live name-round a cappella using the breakdown
   frame ("Hello, hello, what's your name?") around the circle after the track.

**Suno style (ALL 10 songs, locked v2):**
`dark trap, 68 bpm, heavy 808 bass, sparse hi-hats, deep whisper-rap verses, kids choir chant on hook, playful spooky, minimal, clean vocals, nursery trap`

**Production:** 2 takes per song (20 Suno generations). Assets →
`~/Desktop/English Curriculum 2026/Grace and Courtesy/Day NN/` (`gc-dNN.mp3`, `images/NN-word.png`).
Videos: mvgen daemon, lyrics pasted as ground truth, forced-alignment timing, `--pulse anchor`,
publish gate `timing_source=="align"`. **Render D1 + D2 as samples for Tredoux's personal review
FIRST; batch D3–D10 only after his go.**

---

## Day 1 — "Hello, Hello!" (Greeting + names)
**Rule:** We greet each other when we arrive. | **G&C lesson:** greeting a person, handshake, eye contact.
**Pattern:** `Hello, hello, ___!`

```
[Intro — whispered]
hello… hello… (who came to school today?)

[Hook 1 — kids chant]
Hello, hello! Hello, hello!
We say hello at the classroom door!
Hello to you! Hello to me!
Hello, hello to everybody!

[Verse — whisper-rap]
A brand new room, a brand new year,
new friends, new work — I'm glad you're here.
Look at me and I'll look at you —
"Good morning!" — that's how we do.

[Hook 2 — kids chant]
Hello, hello! Hello, hello!
Shake my hand, nice and slow!
Hello to you! Hello to me!
Welcome to our family!

[Breakdown — whispered, bass drops out]
hello… hello… what's your name?
(say your name!) we're so glad you came!

[Final Hook — big]
Hello, hello! Hello, hello!
We say hello at the classroom door!
Hello to you! Hello to me!
Hello, hello to everybody!
```

**sunoNotes:** ONE pattern: the "Hello, hello, ___!" greeting frame. The breakdown is the
live-name-round frame the teacher reuses a cappella around the circle. Handshake line anchors
the classic G&C greeting presentation.
**Images:** `01-hello.png` (children waving at each other) · `02-door.png` (classroom door,
child stepping in) · `03-morning.png` (teacher and child, morning greeting, eye contact) ·
`04-hand.png` (child and teacher handshake) · `05-family.png` (whole class circle, warm).

---

## Day 2 — "Walking Feet" (Moving in the classroom)
**Rule:** Inside we walk. | **G&C lesson:** walking in the classroom, walking around mats/friends.
**Pattern:** `Walking feet!`

```
[Intro — whispered]
tip… toe… tip… toe… (slow… slow…)

[Hook 1 — kids chant]
Walking feet! Walking feet!
Inside we use our walking feet!
Heel to toe, soft and sweet,
everywhere we go on walking feet!

[Verse — whisper-rap]
Around the mats, around a friend,
slow at the start and slow at the end.
My feet are quiet, my feet are slow —
watch my walking feet go!

[Hook 2 — kids chant]
Walking feet! Walking feet!
Inside we use our walking feet!
Heel to toe, soft and sweet,
everywhere we go on walking feet!

[Breakdown — whispered, bass drops out]
Who's that running down the hall?! (A potato!)
Walking feet, potato! (walking feet!)
the potato walks… so sweet…

[Final Hook — big]
Walking feet! Walking feet!
Even a potato has walking feet!
Heel to toe, soft and sweet,
everywhere we go on walking feet!
```

**sunoNotes:** ONE pattern: "Walking feet!" — the exact phrase teachers use all year. Potato
gag #1: class corrects him WITH the rule phrase (gracious correction is the meta-lesson).
**Images:** `01-feet.png` (child feet walking heel-to-toe, floor level) · `02-mats.png`
(child walking carefully around work mats) · `03-hall.png` (potato sprinting down a hallway,
comic) · `04-potato.png` (canonical potato walking primly, proud) · `05-toe.png` (heel-to-toe
close-up on a line).

---

## Day 3 — "My Indoor Voice" (Voice levels)
**Rule:** Inside we speak softly. | **G&C lesson:** indoor voice / outdoor voice.
**Pattern:** soft-inside / big-outside contrast — the style's whisper-rap IS the lesson.

```
[Intro — whispered]
shhh… can you hear me?… this is my indoor voice…

[Hook 1 — kids chant, soft]
Indoor voice, soft and low,
that's the voice for inside, you know!
Outside voice, big and free —
but inside, speak soft like me!

[Verse — whisper-rap]
My friend is working, thinking hard,
so my little voice won't travel far.
Soft as a feather, low as a leaf —
my indoor voice is underneath.

[Breakdown — bass drops out]
(A potato is shouting!) POTATO, HELLO!!
shhh… indoor voice, potato… (soft and low…)
the potato whispers… oh, so low…

[Final Hook — soft, one big line]
Indoor voice, soft and low,
that's the voice for inside, you know!
When we go OUT — (BIG VOICE, GO!)
but inside… soft… and low…
```

**sunoNotes:** ONE pattern: the soft/big dynamic contrast. Ask Suno for real dynamic range —
whispered hook vs one shouted "BIG VOICE, GO!" — the arrangement teaches the rule. Potato gag #2.
**Images:** `01-feather.png` (feather floating, soft) · `02-leaf.png` (leaf drifting down) ·
`03-potato.png` (potato mid-shout, comic, then shushed) · `04-outside.png` (children playing
big and loud outdoors) · `05-friend.png` (child concentrating on work, peaceful).

---

## Day 4 — "Gentle Hands" (Kind and careful hands)
**Rule:** We use gentle hands. | **G&C lesson:** gentle hands with friends and materials.
**Pattern:** `Gentle hands!`

```
[Intro — whispered]
gentle… gentle… look at my hands…

[Hook 1 — kids chant]
Gentle hands! Gentle hands!
Kind and careful, gentle hands!
Hands that help, hands that share,
gentle hands take care, take care!

[Verse — whisper-rap]
I carry my work with two slow hands,
I touch my friend soft — she understands.
Hands are for helping, holding, art —
gentle hands show a gentle heart.

[Hook 2 — kids chant]
Gentle hands! Gentle hands!
Kind and careful, gentle hands!
Hands that help, hands that share,
gentle hands take care, take care!

[Breakdown — whispered]
gentle… gentle… (pat, pat, pat)
soft on the shelf… soft on the mat…

[Final Hook — big]
Gentle hands! Gentle hands!
Kind and careful, gentle hands!
Hands that help, hands that share,
gentle hands take care, take care!
```

**sunoNotes:** ONE pattern: "Gentle hands!" Positive framing only — hands defined by what they
DO (help, share, hold, care).
**Images:** `01-hands.png` (small hands cupped, holding something delicate) · `02-share.png`
(two children sharing a tray) · `03-heart.png` (hands making a heart shape) · `04-shelf.png`
(hands placing material softly on shelf) · `05-mat.png` (hands smoothing a work mat).

---

## Day 5 — "Wash, Wash, Wash" (Hand washing)
**Rule:** We wash hands after the toilet and before we eat. | **G&C lesson:** hand washing.
**Pattern:** `Wash, wash, wash your hands!`

```
[Intro — whispered]
drip… drip… (bubbles!)

[Hook 1 — kids chant]
Wash, wash, wash your hands!
Soap and water, wash your hands!
After the toilet, before we eat,
wash, wash, wash — nice and neat!

[Verse — whisper-rap]
Roll up my sleeves, turn the water on,
soap on my palms till the germs are gone.
Rub the front, the back, between —
count to ten and my hands are clean!

[Hook 2 — kids chant]
Wash, wash, wash your hands!
Soap and water, wash your hands!
After the toilet, before we eat,
wash, wash, wash — nice and neat!

[Breakdown — whispered]
scrub… scrub… bubbles grow…
rinse them off and watch them go…
shake, shake… towel dry…
clean hands, wave goodbye!

[Final Hook — big]
Wash, wash, wash your hands!
Soap and water, wash your hands!
After the toilet, before we eat,
wash, wash, wash — nice and neat!
```

**sunoNotes:** ONE pattern: "Wash, wash, wash your hands!" The verse is the actual washing
procedure in order (sleeves → soap → rub → count → rinse → dry) — sing it AT the sink.
**Images:** `01-soap.png` (bar of soap with bubbles) · `02-water.png` (small hands under a
tap) · `03-bubbles.png` (sudsy hands, bubbles floating) · `04-towel.png` (child drying hands
on a small towel) · `05-hands.png` (clean hands held up proudly).

---

## Day 6 — "Roll the Mat" (The work cycle begins)
**Rule:** We choose a work, use a mat, and roll it back. | **G&C lesson:** carrying, unrolling
and rolling a work mat.
**Pattern:** `Roll the mat!`

```
[Intro — whispered]
this is my work… this is my mat…

[Hook 1 — kids chant]
Roll the mat! Roll the mat!
Unroll it slow — just like that!
When my work is done, I bring it back,
and roll, roll, roll the mat!

[Verse — whisper-rap]
I choose my work from the shelf — just one.
I carry it slow, then the work is begun.
My mat is an island, my work stays on,
and I roll it up tight when my work is done.

[Hook 2 — kids chant]
Roll the mat! Roll the mat!
Unroll it slow — just like that!
When my work is done, I bring it back,
and roll, roll, roll the mat!

[Breakdown — whispered]
roll… roll… nice and tight…
corner to corner… that's right…

[Final Hook — big]
Roll the mat! Roll the mat!
Unroll it slow — just like that!
When my work is done, I bring it back,
and roll, roll, roll the mat!
```

**sunoNotes:** ONE pattern: "Roll the mat!" "My mat is an island" is the classic Montessori
image for workspace boundaries — the verse carries the whole work cycle (choose one → carry →
work on the mat → roll and return).
**Images:** `01-mat.png` (rolled work mat on shelf) · `02-shelf.png` (child choosing one work
from a low shelf) · `03-island.png` (work mat drawn as a tiny island, child working on it —
whimsical) · `04-work.png` (child carrying a tray with two hands) · `05-corner.png` (small
hands rolling a mat corner to corner).

---

## Day 7 — "Push In Your Chair" (Chairs and tables)
**Rule:** We push in our chair when we stand. | **G&C lesson:** carrying a chair, sitting down,
pushing in quietly.
**Pattern:** `Push in your chair!`

```
[Intro — whispered]
two hands… lift it up… quiet…

[Hook 1 — kids chant]
Push in your chair! Push in your chair!
When you stand up, push in your chair!
Two hands, slow, with quiet care —
nobody bumps when you push in your chair!

[Verse — whisper-rap]
I lift my chair with two strong hands,
I set it down soft — it barely lands.
When I stand to go somewhere,
I turn around and push in my chair.

[Hook 2 — kids chant]
Push in your chair! Push in your chair!
When you stand up, push in your chair!
Two hands, slow, with quiet care —
nobody bumps when you push in your chair!

[Breakdown — whispered, bass drops out]
(The potato left his chair out!) oh no…
push it in, potato… slow… slow…
click. (so quiet!)

[Final Hook — big]
Push in your chair! Push in your chair!
When you stand up, push in your chair!
Two hands, slow, with quiet care —
nobody bumps when you push in your chair!
```

**sunoNotes:** ONE pattern: "Push in your chair!" The whispered "click. (so quiet!)" is the
payoff moment — ask for near-silence there. Potato gag #3.
**Images:** `01-chair.png` (small chair tucked neatly at a table) · `02-hands.png` (two hands
lifting a child-size chair) · `03-potato.png` (potato looking guilty next to a chair left out) ·
`04-stand.png` (child standing up, turning to the chair) · `05-quiet.png` (chair sliding in,
"quiet" visual — soft lines).

---

## Day 8 — "May I Watch?" (Waiting and observing)
**Rule:** One work, one friend — we may watch or wait. | **G&C lesson:** observing without
touching, waiting for a turn.
**Pattern:** `May I watch?`

```
[Intro — whispered]
my friend is working… I want to see…

[Hook 1 — kids chant]
May I watch? May I watch?
I ask my friend, "May I watch?"
Hands behind my back, I see —
and when it's my turn, you can watch me!

[Verse — whisper-rap]
One work, one friend — that's the way.
If the shelf is empty, I wait today.
I can watch, or choose something new —
waiting is a work I can do!

[Hook 2 — kids chant]
May I watch? May I watch?
I ask my friend, "May I watch?"
Hands behind my back, I see —
and when it's my turn, you can watch me!

[Breakdown — whispered]
watching… watching… quiet as a mouse…
learning with my eyes…

[Final Hook — big]
May I watch? May I watch?
I ask my friend, "May I watch?"
Hands behind my back, I see —
and when it's my turn, you can watch me!
```

**sunoNotes:** ONE pattern: "May I watch?" — the exact G&C script. "Waiting is a work I can
do" reframes patience as a work, pure Montessori. Hands-behind-back is the classic observing
posture.
**Images:** `01-watch.png` (child observing a friend's work, hands behind back) ·
`02-friend.png` (child absorbed in beadwork) · `03-shelf.png` (empty spot on a shelf) ·
`04-mouse.png` (tiny mouse watching quietly, whimsical) · `05-eyes.png` (bright curious eyes,
close-up, friendly).

---

## Day 9 — "Everything Has a Home" (Restoring the environment)
**Rule:** Work goes back ready for a friend. | **G&C lesson:** returning work to the shelf.
**Pattern:** `Everything has a home!`

```
[Intro — whispered]
where does it go?… the shelf knows…

[Hook 1 — kids chant]
Everything has a home! Everything has a home!
Back on the shelf where the work will go,
ready for a friend, neat in a row —
everything has a home!

[Verse — whisper-rap]
The beads go here, the map goes there,
every little thing has its own little square.
When I put it back the way it was,
the next friend smiles — that's what it does!

[Hook 2 — kids chant]
Everything has a home! Everything has a home!
Back on the shelf where the work will go,
ready for a friend, neat in a row —
everything has a home!

[Breakdown — whispered]
back… back… back on the shelf…
I can do it all by myself…

[Final Hook — big]
Everything has a home! Everything has a home!
Back on the shelf where the work will go,
ready for a friend, neat in a row —
everything has a home!
```

**sunoNotes:** ONE pattern: "Everything has a home!" "Ready for a friend" is the canonical
Montessori phrase for restoring the environment; "all by myself" echoes "help me do it myself."
**Images:** `01-shelf.png` (tidy Montessori shelf, everything in place) · `02-beads.png`
(golden beads in their tray) · `03-map.png` (puzzle map on its shelf spot) · `04-home.png`
(a work being slotted into its "home" — glowing spot on shelf) · `05-friend.png` (next child
arriving at the shelf, delighted).

---

## Day 10 — "The Whale Class Way" (Recap anthem — all the rules)
**Rule:** ALL of them, one line each. | This becomes the class anthem for the year.
**Pattern:** call-and-response checklist + `That's the way!` hook.
*(Swap "Whale Class" for any class name — title + two lyric lines.)*

```
[Intro — whispered]
we know the rules… do you?

[Hook — kids chant]
That's the way! That's the way!
That's the way we work and play!
Every day, come what may —
that's the Whale Class way!

[Verse 1 — whisper-rap, call and response]
When we come in? (Hello, hello!)
How do we walk? (Slow, slow!)
Voice inside? (Soft and low!)
Hands? (Gentle!) — now you know!

[Hook — kids chant]
That's the way! That's the way!
That's the way we work and play!
Every day, come what may —
that's the Whale Class way!

[Verse 2 — whisper-rap, call and response]
After the toilet? (Wash, wash, wash!)
Done with your mat? (Roll it up!)
Stand from your chair? (Push it in!)
Friend is working? ("May I watch?")
Where does the work go? (Back to its home!)

[Breakdown — whispered, bass drops out]
(Even the potato?) …even the potato…
he says hello… he walks so slow…
he pushed in his chair! (hooray!)

[Final Hook — big]
That's the way! That's the way!
That's the way we work and play!
Every day, come what may —
that's the Whale Class way! (hey!)
```

**sunoNotes:** The ONE allowed multi-rule song — every rule appears as ITS OWN song's exact
phrase, so the anthem is retrieval practice, not new teaching. Call-and-response: whisper-rap
asks, kids choir answers. Potato redemption arc closes the two weeks.
**Images:** `01-potato.png` (crowned potato saying hello, reformed and proud) · `02-hello.png`
(class greeting) · `03-chair.png` (chair pushed in) · `04-mat.png` (mat rolled tight) ·
`05-wash.png` (hands washing, bubbles) · `06-play.png` (whole class working peacefully,
wide shot).

---

## MJ notes
- Append the current canon style suffix (children's-book illustration, dark-forest/warm
  palette per `VIDEO_AUDIT_MASTER_JUL14.md` canon table) to every prompt; use the canonical
  crowned-potato oref for all potato images.
- Every image filename's first token is a SUNG word ≥3 letters (mvgen anchor rule) — verified
  per song above.
- No isolated-human-anatomy prompts (hands/feet/eyes images framed as child-in-scene or
  stylized object close-ups per the Jul-12/13 anatomy rule).

## Video plan
1. Suno: 2 takes/song, Tredoux picks (agents can't hear — save both takes).
2. MJ: ~51 images via tandem protocol (agent submits prompts, Tredoux picks tiles).
3. mvgen: lyrics pasted as ground truth · forced alignment · `--pulse anchor` · `--cut-every 2`.
4. **Samples first:** render D1 + D2 → Tredoux personal review → then batch D3–D10.
5. Publish gate: `timing_source=="align"` only (publish-videos.mjs pattern).

## Classroom usage (teacher-facing)
- Sing each song at morning circle immediately AFTER presenting that day's G&C lesson,
  then replay at the natural moment (D5 at the sink, D7 at snack tables).
- Week 3+: "The Whale Class Way" opens circle time daily; individual songs return as needed
  ("I hear us needing the Walking Feet song today").
- The rule phrases in the hooks are the exact phrases teachers use for redirection all year —
  say the phrase, the child hears the song.
