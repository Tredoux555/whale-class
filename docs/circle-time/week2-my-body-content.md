# Week 2 · "My Body" — CONTENT (builder paste sheet)

Whale Class · Sep 8–12, 2026 · clone of `circle-time.html` (week 1).
Everything below is organised **in page order**, matching PIPELINE.md §9 slot list.
Nothing here changes CSS, the gate mechanism, `printSection`, the tab JS, the
"Weekly rituals" details block or `.foot`.

**Builder global find/replace:** `week1` → `week2`, `ct-week1-` → `ct-week2-`,
sessionStorage key `wc_ct2` → `wc_ct3`. Keep `<meta name="robots" content="noindex">`.
Chord SVGs are unchanged (same three shapes: C 0003 · F 2010 · G7 0212).

---

## 1. Header / global

| slot | content |
|---|---|
| `.kicker` | Whale Class · Weekly Circle Time |
| `<h1>` | My Body! From Head to Toe |
| `.theme-line` | Week of `<strong>Sep 8–12</strong>` · 10–15 min a day · ages 2.5–6, English learners |
| `<title>` | Whale Class Circle Time |
| guidebook block | unchanged |

### `.glance` — Five words they'll own by Friday

```
<div class="chips"><span class="chip">body</span><span class="chip">hands</span><span class="chip">feet</span><span class="chip">jump</span><span class="chip">heart</span></div>
```

**Why these five** (one line each, for the teacher's own confidence — not for the page):
- **body** — the theme word; it is in the chorus, the title and every day's close.
- **hands** / **feet** — the two parts every child can see, wave and stamp; they carry
  plurals ("These are my hands") and they anchor Monday's outline and Friday's booklet.
- **jump** — the verb that turns naming into doing; it is Day 2's whole lesson, it lives
  in the chorus, and it is already half-known from week 1 (recycled = fast win).
- **heart** — the one "inside" word, and the one that makes Day 3 magic ("boom boom!").
  Concrete because they can feel it thump after they run.

Deliberately *not* chosen: lungs / bones / stretch (hard for a 3-year-old mouth, and
they still get taught and chanted — they just aren't the five we guarantee).

### `.frames`

```
Littles (2.5–3): One word + a gesture is a win: "Hands!", wave them, pat your chest,
copy every action.
Bigs (4–6): Sentence frames: "This is my ___." · "I have two ___." · "I can ___." ·
"My body helps me ___."
```

### Tab `<small>` sub-labels

| data-day | tab | `<small>` |
|---|---|---|
| 1 | Mon | My Body Parts |
| 2 | Tue | What Can I Do? |
| 3 | Wed | Inside Me |
| 4 | Thu | I Like My Body |
| 5 | Fri | My Booklet |
| 6 | Song | Ukulele |
| 7 | Print | Wall + Shelf |
| 8 | Wrap | Week recap |

---

## 2. Day 1 · Mon — My Body Parts  *(13 min)*

**`.day-head` h2:** Day 1 · My Body Parts
**Today's words:** `<b>body · head · hands · feet</b>`
**`.grab`:** a large paper foot cut-out (trace your own shoe) in the Magic Box; a roll of
butcher paper + a fat marker for the outline; blu-tack.

**Block 1 — `<span class="badge">2 min</span> Magic Box hook**
> Shake the box, hold it to your ear. Whole class chants:
> **Everyone:** "What's in the box? What's in the box?"
> Peek in. Gasp. Pull out the giant paper foot and hold it against your own foot.
> **Teacher:** "A FOOT! Whose foot? … MY foot!" *(stamp it twice)* "I have two feet — one, two!"
> Everyone stamps twice. `.kids` **"Feet!"**

**Block 2 — `<span class="badge">3 min</span> Teach · Head, hands, feet**
> Touch and name on your own body, three times each, getting faster:
> `.rhyme`
> This is my **head**! *(pat-pat)*
> These are my **hands**! *(jazz hands)*
> These are my **feet**! *(stamp-stamp)*
> This is my **body**! *(both arms sweep down yourself)*
> Littles just touch and say the one word. Bigs echo the whole line.
> `.tip` **Teacher fails:** say "This is my head" while patting your **tummy**. Wait.
> The correction shout is the loudest language of the day — let them fix you twice.

**Block 3 — `<span class="badge">3 min</span> Song · My Body, My Body — chorus + Monday verse**
> `<button class="sectionprint" onclick="printSection('sng-chorus')">🖨️ Print sheet music</button>`
> `.rhyme`
> My body, my body! *(pat chest twice)*
> Head to toe, look at me! *(touch head, touch toes)*
> I can jump, I can clap, *(jump, clap)*
> one, two, three — that's **ME!** *(count fingers, jazz hands, everyone JUMPS)*
> **Monday's verse:** Head, hands, feet — that's me! *(touch each one)*
> This is my body, one, two, three! *(sweep down yourself, then three claps)*
> `.tip` **The one song of the week** — same chorus at every circle, one new verse each
> morning. Chords and the full sheet are on the Song tab. Sing it twice.

**Block 4 — `<span class="badge">4 min</span> Game · The big body outline**
> "One, two, three — eyes on me!" Roll out the paper. One child lies down, arms and legs
> star-shaped; you trace around them fast while the class chants **"Draw the body! Draw the body!"**
> Stand it up on the wall. Now the class labels it — you point, they shout:
> **Teacher:** "What's this?" *(point at the head)*
> `.kids` **"Head!"** &nbsp;Bigs: `.kids` "This is my head."
> Head → hands → feet → arms → legs → tummy. Stick a paper label on each as they get it.
> `.tip` Trace the **littlest** child — smallest body, fastest trace, biggest pride. The
> outline stays on the wall all week and Friday's booklet comes back to it.

**Block 5 — `<span class="badge">1 min</span> Close**
> Hands on top of the head, then slide all the way down to the feet, whisper → normal → shout:
> **Everyone:** "This is my body… this is my body… THIS IS MY BODY!"
> `.tip` **Got 3 spare minutes?** *From Head to Toe* (Eric Carle) — don't read it, **do** it.
> Every page is "Can you do it?" — the class answers "I can do it!" and moves.

---

## 3. Day 2 · Tue — What Can My Body Do?  *(13 min)*

**h2:** Day 2 · What Can My Body Do?
**Today's words:** `<b>jump · bend · stretch · run</b>`
**`.grab`:** a bouncy ball in the Magic Box; three floor spots (cushions, tape crosses or
carpet squares) for the stations — no other materials.

**Block 1 — `<span class="badge">2 min</span> Magic Box hook**
> Box chant. The box is *bouncing* in your hands — fight it.
> **Teacher:** "Something is JUMPING in my box!" *(let the ball bounce out)* "A ball! The ball
> can jump… Can **I** jump?"
> Try to jump with both feet glued to the floor. Fail. Look confused.
> `.kids` **"JUMP!"**
> **Teacher:** "Oh! Like THIS!" *(enormous jump)* "I can jump!"
> Everyone jumps five times. Sit down puffing.

**Block 2 — `<span class="badge">3 min</span> Teach · I can!**
> Call-and-response, five reps of each action:
> **Teacher:** "Can you jump?"
> `.kids` **"I can!"** *(all jump — one-two-three-four-five!)*
> Cycle: **bend** *(touch toes)* → **stretch** *(reach the ceiling)* → **run** *(on the spot)*
> → **hop** *(one foot)*. Littles do the action and shout the one word. Bigs answer the
> frame: `.kids` "I can stretch my arms."
> Finish with "Can you fly?" — `.kids` **"NO!"** — everyone flops over.

**Block 3 — `<span class="badge">3 min</span> Song · My Body, My Body — chorus + Tuesday verse**
> `<button class="sectionprint" onclick="printSection('sng-verses')">🖨️ Print sheet music</button>`
> `.rhyme`
> **Chorus** (twice, with the actions) — then today's new verse:
> Stretch up high, bend down low, *(reach up, touch toes)*
> My body can go, go, **go!** *(run on the spot, faster and faster)*
> `.tip` Yesterday's verse first if they shout for it — repetition is the whole point.

**Block 4 — `<span class="badge">4 min</span> Game · Three stations**
> Three spots on the floor: **JUMP** · **BEND** · **STRETCH**. Demonstrate each with a
> silly face. Then call a station and everyone runs to it and does it until you call the next.
> **Teacher:** "Go to… STRETCH!"
> Ten seconds per station, four rounds, faster each time. Last round a big kid is the caller.
> Then the celebration lap: point at one child at a time —
> **Everyone:** "Look! Bao-Bao can hop!" *(everyone hops like Bao-Bao)*
> `.tip` Every child gets copied by the whole class once. That copy **is** the "celebrate
> others' abilities" objective — nobody needs to say anything for it to land.

**Block 5 — `<span class="badge">1 min</span> Close**
> All standing, hands in the air, whisper → normal → shout:
> **Everyone:** "I can jump… I can jump… I CAN JUMP!" *(jump on the last one)*
> `.tip` **Got 3 spare minutes?** *Move!* (Robin Page & Steve Jenkins) — one animal per page,
> one verb per page. Say the verb, do the verb, turn the page.

---

## 4. Day 3 · Wed — Inside My Body  *(13 min)*

**h2:** Day 3 · Inside My Body
**Today's words:** `<b>heart · lungs · bones</b>`
**`.grab`:** a red paper heart and a cardboard-tube "stethoscope" in the Magic Box; the
**Inside / Outside** sorting cards (print pack pages 12–14).

**Block 1 — `<span class="badge">2 min</span> Magic Box hook**
> Box chant, but quieter — today the box is a secret.
> **Teacher:** "Shhh. Inside the box… is something that is INSIDE me." *(pull out the red heart,
> hold it against your chest)* "My heart! Boom, boom. Boom, boom."
> `.kids` **"Boom boom!"**
> **Teacher:** "Can you SEE my heart? … No! It's inside. Can you HEAR it?"

**Block 2 — `<span class="badge">3 min</span> Teach · Boom boom · Breathe · Bone**
> Three things, one gesture each:
> `.rhyme`
> My **heart** goes boom, boom! *(fist tapping your chest on the beat)*
> My **lungs** go innnn… and out. *(big slow breath, arms open and close)*
> My **bones** are hard — knock, knock! *(tap your own elbow, then your head)*
> Now everyone runs on the spot for ten seconds and stops — hands on chest.
> **Teacher:** "Is your heart fast or slow?"
> `.kids` **"FAST!"** &nbsp;Bigs: `.kids` "My heart beats fast."
> `.tip` **Teacher fails:** tap your knee and say "This is my heart." They will *scream*.
> Bigs get the full frame here: "Lungs help me breathe."

**Block 3 — `<span class="badge">3 min</span> Song · My Body, My Body — chorus + Wednesday verse**
> `<button class="sectionprint" onclick="printSection('sng-verses')">🖨️ Print sheet music</button>`
> `.rhyme`
> **Chorus** (twice) — then today's new verse:
> Boom boom, boom boom — my heart! *(tap chest on every "boom")*
> Breathe in, breathe out — that's the clever part! *(big breath in, blow out)*
> `.tip` Sing the "breathe out" line while actually blowing — they'll copy the breath before
> they copy the word.

**Block 4 — `<span class="badge">4 min</span> Game · X-ray! Inside or outside?**
> Hold the cards up one at a time like an X-ray against the light.
> **Teacher:** "Bones! Inside… or outside?"
> `.kids` **"Inside!"** — card goes on the INSIDE mat. Nose, hair, feet → OUTSIDE mat.
> Littles just point at the right mat. Bigs say `.kids` "My heart is inside."
> Then the quiet round: everyone lies down, hands on tummy, and you count five slow breaths
> together — in through the nose, out through the mouth.
> `.tip` That breathing minute is the calm-down tool for the rest of the year. Name it now:
> "That's our **breathing game**." You'll use it every time the room gets wild.

**Block 5 — `<span class="badge">1 min</span> Close**
> Hands on hearts, whisper → normal → shout:
> **Everyone:** "Boom boom… boom boom… BOOM BOOM!"
> `.tip` **Got 3 spare minutes?** *Inside Your Outside* (Tish Rabe) — skim it, point at the
> heart and lungs pictures, skip the long text entirely.

---

## 5. Day 4 · Thu — Celebrate My Body  *(13 min)*

**h2:** Day 4 · Celebrate My Body
**Today's words:** `<b>strong · legs · eyes</b>` — plus everything from the week
**`.grab`:** a fat crayon in the Magic Box; the Monday body outline still on the wall; the
body-tracing sheets (print pack page 16) and crayons ready at the art table for afterwards.

**Block 1 — `<span class="badge">2 min</span> Magic Box hook**
> Box chant. Pull out one crayon. Look disappointed.
> **Teacher:** "A crayon…? That's all?" *(then light up)* "Oh! It's for drawing… **YOU!**"
> Point at the Monday outline on the wall.
> **Teacher:** "Today we draw OUR bodies. Look at my strong legs!" *(stomp, flex)*
> `.kids` **"Legs!"**

**Block 2 — `<span class="badge">3 min</span> Teach · I like my…**
> Go round the outline on the wall, touching each part, and give each one a job:
> `.rhyme`
> I like my **legs** — they help me run! *(run on the spot)*
> I like my **hands** — they help me clap! *(clap)*
> I like my **eyes** — they help me see YOU! *(peek through binocular fingers at a child)*
> I like my **body** — it helps me dance! *(three seconds of wild dancing)*
> Littles: one word + the action. Bigs: `.kids` "I like my strong legs." /
> `.kids` "My body helps me dance."

**Block 3 — `<span class="badge">3 min</span> Song · My Body, My Body — chorus + Thursday verse**
> `<button class="sectionprint" onclick="printSection('sng-verses')">🖨️ Print sheet music</button>`
> `.rhyme`
> **Chorus** (twice) — then today's new verse:
> Strong legs, strong arms, hooray! *(flex both arms, stamp)*
> I like my body — it helps me play! *(hug yourself, then arms wide)*
> `.tip` Shout the **"hooray!"** — it's the whole SEL objective smuggled into one word.

**Block 4 — `<span class="badge">4 min</span> Game · The spotlight body circle**
> Pass the crayon round the circle. Whoever holds it stands up and shows the class one thing
> their body can do — a jump, a spin, a wiggle, a very good sit.
> Littles: do it and shout `.kids` **"My body!"** &nbsp;Bigs: `.kids` "My feet help me jump."
> After each child, the whole class copies them and chants:
> **Everyone:** "Mei-Mei, your body is STRONG!"
> `.tip` **This is the one they'll remember.** Every child gets fifteen seconds of the whole
> class copying them. Keep the turns fast and the cheer identical every time.
> Body-tracing sheets go to the art table straight after circle — that's the "My body" art,
> not circle work.

**Block 5 — `<span class="badge">1 min</span> Close**
> Everyone hugs themselves, whisper → normal → shout:
> **Everyone:** "I like my body… I like my body… I LIKE MY BODY!"
> `.tip` **Got 3 spare minutes?** *I Love My Body* (Mother Moon / Cali's Books) — point at each
> body part on the page and let them name it before you do.

---

## 6. Day 5 · Fri — My Body Booklet + Big Review  *(13 min)*

**h2:** Day 5 · My Body Booklet + Big Review
**Today's words:** `<b>body · hands · feet · jump · heart</b>` — the whole week
**`.grab`:** every prop back in the box (paper foot, ball, red heart, crayon); each child's
body-tracing sheet from Thursday, stapled into a little booklet; stickers or a hand-stamp
for the finale.

**Block 1 — `<span class="badge">1 min</span> Hook**
> The Magic Box comes out fat and rattling.
> **Teacher:** "Today the box is FULL. What did we learn about?"
> `.kids` **"My body!"**

**Block 2 — `<span class="badge">3 min</span> Teach · The whole-body chant**
> Chant and touch, top to bottom, twice — slow, then fast:
> `.rhyme`
> **Head**, head! *(pat-pat)*
> **Hands**, hands! *(clap-clap)*
> **Heart** goes boom! *(tap chest twice)*
> **Feet**, feet — **JUMP!** *(stamp, stamp, jump)*
> `.tip` This is the spoken *Head, Shoulders, Knees and Toes* slot — touch-along, **not sung**.
> One song a week; this stays a chant so the song keeps its shine.

**Block 3 — `<span class="badge">3 min</span> Song · My Body, My Body — Friday verse, then the WHOLE song**
> `<button class="sectionprint" onclick="printSection('sng-verses')">🖨️ Print sheet music</button>`
> `.rhyme`
> **Friday's verse:** My hands can draw, my feet can hop, *(draw in the air, hop)*
> I love my body — from toe to top! *(touch toes, then head)*
> `.tip` **The finale:** chorus → all five verses → chorus, top to bottom. They learned it one
> verse at a time without noticing — this run-through **is** the review of the entire week.

**Block 4 — `<span class="badge">3 min</span> Game · Touch your…! (speed round)**
> **Teacher:** "Touch your… FEET! Touch your… HEART! Touch your… HEAD! Touch your… LUNGS!"
> Fast, faster, silly. Then the trick: say "hands" while touching your **nose**. The children
> who catch you get to be the caller for one round each — let them "teach" you.

**Block 5 — `<span class="badge">3 min</span> Big review + booklet finale**
> Hold up each prop, quick-fire round the circle:
> Paper foot → `.kids` "Feet! I have two feet."
> Ball → `.kids` "Jump! I can jump."
> Red heart → `.kids` "Boom boom! My heart beats."
> Crayon → `.kids` "My body! I like my body."
> Then hand each child their booklet. They hold it up, everyone shouts the week's line twice
> with actions:
> **Everyone:** "My body, my body — head to toe, look at me!" *(pat chest · touch head · touch toes · point at self)*
> Sticker or hand-stamp as they leave the circle: "Your body is strong!"

---

## 7. Song tab (`#day6`)

**`.day-head` h2:** Theme Song · "My Body, My Body"
**`.day-head` p:** The one song of the week — sung at every circle. Same chorus daily, one new
verse each morning, full song on Friday.
**`.printbtn`:** Print the song sheet

### `#sng-chords` — The three chords
Unchanged from week 1: **C (0003)** · **F (2010)** · **G7 (0212)** — same three SVG fretboards,
same `o` open-string marks, same `G C E A` legend. (Am is available if you want it, but this
song does not need it — keeping the shapes identical to last week means zero new practice.)

**`.strum`:** **Strum:** Down · Down · Down-Up ("boom — boom — boom-chick"). Can't manage it
yet? Four slow downs per bar works fine — the kids only hear the fun.
**`.tip`:** **Tempo:** marching pace, a shade brisker than last week — this one is a
stamping song. Chant it without the uke first; add chords once they know the words.

### `#sng-chorus` — Chorus — sing it every single day

```html
<div class="lyric">
  <p><span class="chd">C</span>My body, my body! <span class="g">(pat chest twice)</span></p>
  <p><span class="chd">F</span>Head to toe, look at <span class="chd">C</span>me! <span class="g">(touch head, then touch toes)</span></p>
  <p><span class="chd">F</span>I can jump, I can <span class="chd">C</span>clap, <span class="g">(jump, then clap twice)</span></p>
  <p><span class="chd">G7</span>One, two, three — that's <span class="chd">C</span>ME! <span class="g">(count fingers, then jazz hands on ME!)</span></p>
</div>
```
**`.tip`:** Sing the chorus twice each time. On the final **"ME!"** everyone jumps.

### `#sng-verses` — One verse a day — verses use only C and G7

```html
<div class="lyric">
  <p class="vt">Monday · My Body Parts</p>
  <p><span class="chd">C</span>Head, hands, feet — that's me! <span class="g">(touch each one)</span></p>
  <p><span class="chd">G7</span>This is my body, <span class="chd">C</span>one, two, three! <span class="g">(sweep down yourself, three claps)</span></p>

  <p class="vt">Tuesday · What Can My Body Do?</p>
  <p><span class="chd">C</span>Stretch up high, bend down low, <span class="g">(reach up, touch toes)</span></p>
  <p><span class="chd">G7</span>My body can go, go, <span class="chd">C</span>go! <span class="g">(run on the spot, faster and faster)</span></p>

  <p class="vt">Wednesday · Inside My Body</p>
  <p><span class="chd">C</span>Boom boom, boom boom — my heart! <span class="g">(tap chest on every "boom")</span></p>
  <p><span class="chd">G7</span>Breathe in, breathe out — that's the <span class="chd">C</span>clever part! <span class="g">(big breath in, blow out)</span></p>

  <p class="vt">Thursday · Celebrate My Body</p>
  <p><span class="chd">C</span>Strong legs, strong arms, hooray! <span class="g">(flex both arms, stamp)</span></p>
  <p><span class="chd">G7</span>I like my body — it <span class="chd">C</span>helps me play! <span class="g">(hug yourself, then arms wide)</span></p>

  <p class="vt">Friday · My Body Booklet</p>
  <p><span class="chd">C</span>My hands can draw, my feet can hop, <span class="g">(draw in the air, hop)</span></p>
  <p><span class="chd">G7</span>I love my body — from <span class="chd">C</span>toe to top! <span class="g">(touch toes, then head)</span></p>
</div>
```
**`.tip`:** **The build:** each day sing chorus → today's verse → chorus. By Friday they know
five verses without ever "learning" the song — Friday's finale is the whole thing top to
bottom, and it doubles as your review of the entire week.

### `#sng-uketips` — If you're brand new to ukulele
Practice this loop for five minutes tonight: **C** (4 strums) → **F** (4 strums) → **C** →
**G7** → **C**. That's the entire song — and it's the same three shapes as last week, so if
you played "Special Me" you can already play this one. C is one finger, and the verses are
just C and G7.

---

## 8. Print pack (`#day7`) — 18 pages

**`.day-head` h2:** Print Pack · Wall + Shelf
**`.day-head` p:** One click prints the whole week: theme wall posters, the song sheet, and
all the shelf material.
**Header button (hard-coded text, unchanged count):** `Print the whole pack (18 pages)`
**`.tip` under it:** unchanged from week 1.

Image path convention: `/circle-time-images/week2/ct-week2-<slug>.jpg`.

### Page 1 · `pt-theme` — Theme poster
- label: `Page 1 · Theme poster`
- img: `ct-week2-poster-theme.jpg` · alt: "Illustrated title poster: My Body, from head to toe"
- `.p-title`: `My Body!<br>From Head to Toe`
- `.p-sub`: `Whale Class 🐳`

### Pages 2–6 · `pt-words` — the five word posters
- label: `Pages 2–6 · Word posters for the wall`

| # | img slug | `.p-word` | `.p-sub` | alt |
|---|---|---|---|---|
| 2 | `poster-body` | body | This is my body! | Illustrated child standing with arms out, whole body |
| 3 | `poster-hands` | hands | I have two hands. | Illustrated pair of child's open hands |
| 4 | `poster-feet` | feet | I have two feet. | Illustrated pair of bare child's feet |
| 5 | `poster-jump` | jump | I can jump! | Illustrated child jumping in the air |
| 6 | `poster-heart` | heart | My heart goes boom boom! | Illustrated red cartoon heart |

### Page 7 · `pt-sentence` — Sentence frames poster
- label: `Page 7 · Sentence frames poster`
- img: `ct-week2-poster-sentence-frames.jpg` · alt: "Illustration of two children pointing at their own bodies with speech bubbles"
- `.p-title` (font-size:2.6rem): `We can say…`
- `.p-frames`:
  - "This is my `___`."
  - "I have two `___`."
  - "I can `___`."
  - "My body helps me `___`."

### Page 8 · `pt-songchorus` — Chorus poster
- label: `Page 8 · Song chorus poster`
- img: `ct-week2-poster-chorus.jpg` · alt: "Illustrated child singing and playing a ukulele"
- `.p-title` (font-size:2.8rem): `My body, my body!<br>Head to toe, look at me!<br>I can jump, I can clap,<br>one, two, three — that's ME!`
- `.p-sub`: `"My Body, My Body" · the Whale Class song`

### Page 9 · `pt-ukulele` — Ukulele song sheet (`.sheet.songsheet`, flattened copy)
- label: `Page 9 · Ukulele song sheet`
- `.p-title` (font-size:2rem): `My Body, My Body`
- grey line: `Whale Class theme song · ukulele · C (0003) · F (2010) · G7 (0212) · strum: Down, Down, Down-Up`

```html
<p class="sv">Chorus — every day</p>
<p><span class="sc">C</span>My body, my body! <span class="sc">F</span>Head to toe, look at <span class="sc">C</span>me!</p>
<p><span class="sc">F</span>I can jump, I can <span class="sc">C</span>clap, <span class="sc">G7</span>one, two, three — that's <span class="sc">C</span>ME!</p>
<p class="sv">Monday · My Body Parts</p>
<p><span class="sc">C</span>Head, hands, feet — that's me! <span class="sc">G7</span>This is my body, <span class="sc">C</span>one, two, three!</p>
<p class="sv">Tuesday · What Can My Body Do?</p>
<p><span class="sc">C</span>Stretch up high, bend down low, <span class="sc">G7</span>my body can go, go, <span class="sc">C</span>go!</p>
<p class="sv">Wednesday · Inside My Body</p>
<p><span class="sc">C</span>Boom boom, boom boom — my heart! <span class="sc">G7</span>Breathe in, breathe out — that's the <span class="sc">C</span>clever part!</p>
<p class="sv">Thursday · Celebrate My Body</p>
<p><span class="sc">C</span>Strong legs, strong arms, hooray! <span class="sc">G7</span>I like my body — it <span class="sc">C</span>helps me play!</p>
<p class="sv">Friday · My Body Booklet</p>
<p><span class="sc">C</span>My hands can draw, my feet can hop, <span class="sc">G7</span>I love my body — from <span class="sc">C</span>toe to top!</p>
```
- closing grey line: `Each day: chorus → today's verse → chorus. Friday: the whole song, top to bottom.`

### Page 10 · `pt-bodycontrol` — 3-part cards, control cards (`.cards.c2`, 6 cards)
- label: `Page 10 · My Body 3-part cards — control cards (keep whole)`

| img slug | `.cw` | alt |
|---|---|---|
| `card-head` | head | Illustrated child's head |
| `card-hands` | hands | Illustrated pair of hands |
| `card-feet` | feet | Illustrated pair of feet |
| `card-arms` | arms | Illustrated pair of arms |
| `card-legs` | legs | Illustrated pair of legs |
| `card-mybody-control` | My Body | Illustrated whole child's body, My Body control card |

Last card also carries `.cs`: `control cards — do not cut`.

### Page 11 · `pt-bodycutapart` — same 5 pictures, no words + label cards
- label: `Page 11 · My Body 3-part cards — cut apart (pictures + labels)`
- first `.cards.c2`: head / hands / feet / arms / legs images with no `.cw`, plus a 6th card
  containing only `.cs` `cut all cards apart ✂️`
- second `.cards.c2` (`style="min-height:70px"` on each card): `head` · `hands` · `feet` ·
  `arms` · `legs` · `.cs` `labels for the bigs`

### Pages 12–13 · `pt-yummymat` (id kept) — **Inside / Outside** sorting signs
- label: `Pages 12–13 · Inside / Outside sorting signs (2 full pages)`
- **Why this binary:** it is the only sorting job the theme actually needs — it is Day 3's
  X-ray game, it makes "heart / lungs / bones" concrete against "hair / eyes / feet", and
  unlike "healthy / not healthy" it has right answers, so it works as real Montessori shelf
  material with control of error.

| img slug | `.p-word` | `.p-sub` | alt |
|---|---|---|---|
| `card-inside` | Inside! | I cannot see it. | Illustrated child silhouette with a glowing heart inside |
| `card-outside` | Outside! | I can see it! | Illustrated smiling child pointing at their own nose |

### Page 14 · `pt-sortcards` — 12 sorting cards (`.cards.c3`)
- label: `Page 14 · Sorting cards — cut apart`

| img slug | `.cw` | answer | alt |
|---|---|---|---|
| `card-heart` | heart | inside | Illustrated red cartoon heart |
| `card-lungs` | lungs | inside | Illustrated pair of pink lungs |
| `card-bones` | bones | inside | Illustrated white bone |
| `card-brain` | brain | inside | Illustrated pink brain |
| `card-tummy` | tummy | inside | Illustrated round tummy shape |
| `card-muscles` | muscles | inside | Illustrated flexed strong arm |
| `card-hair` | hair | outside | Illustrated tuft of black hair |
| `card-eyes` | eyes | outside | Illustrated pair of eyes |
| `card-nose` | nose | outside | Illustrated nose |
| `card-ears` | ears | outside | Illustrated pair of ears |
| `card-knees` | knees | outside | Illustrated pair of knees |
| `card-toes` | toes | outside | Illustrated five toes on a foot |

- closing `.cs` line: `Inside cards go under "Inside!", outside cards under "Outside!". Flip
  each card over and pencil a small ✓ on the six inside ones — that's the control of error,
  so a child can check their own work. Then they tell you: "My heart is inside!"`

### Page 15 · `pt-actioncards` — 8 "I can" action cards (`.cards.c2`)
- label: `Page 15 · I Can action cards — cut apart`

| img slug | `.cw` | alt |
|---|---|---|
| `card-can-jump` | I can jump! | Illustrated child jumping |
| `card-can-hop` | I can hop! | Illustrated child hopping on one foot |
| `card-can-run` | I can run! | Illustrated child running |
| `card-can-bend` | I can bend! | Illustrated child bending to touch their toes |
| `card-can-stretch` | I can stretch! | Illustrated child stretching arms up high |
| `card-can-dance` | I can dance! | Illustrated child dancing |
| `card-can-clap` | I can clap! | Illustrated child clapping |
| `card-can-breathe` | I can breathe! | Illustrated child taking a deep breath |

### Page 16 · `pt-portrait` (id kept) — body tracing / "This is my body" sheet
- label: `Page 16 · This is MY BODY — body sheet (print one per child)`
- `.p-title` (font-size:2.2rem): `This is MY BODY!`
- **Builder note:** replace the week-1 face SVG with a simple body outline, same
  `class="portrait-svg"`, same sizes (360×330 screen / 620×571 print), same
  `stroke:#9aa7b2; stroke-width:4; fill:none` look. Shapes: circle head, rounded rectangle
  body, two arms out, two legs down, and five short dotted leader lines pointing at head /
  hands / heart (chest) / legs / feet with a blank ruled space at the end of each for the
  bigs to write or for you to scribe.
- instruction line (`font-size:1.2rem; color:#5B6B7A`): `Draw your face, your hair and your
  clothes. Colour your heart red. Then tell me about your body — I'll write it down!`
- bottom line (`font-size:1.4rem`): `My name is <span class="writeline"></span>`
- second bottom line: `My body can <span class="writeline" style="min-width:200px"></span>`

### Page 17 · `pt-awards` — 2 award cards (cut in half)
- label: `Page 17 · "Your body is strong" awards — cut in half, one per child on Friday`
- both cards: img `ct-week2-badge-star.jpg` · alt "Illustrated gold star badge"
- `.cw` (font-size:2rem): `Your body is STRONG!`
- line: `This award goes to <span class="writeline" style="min-width:180px"></span>`
- `.cs`: `My Body week · Whale Class 🐳`

### Page 18 · `pt-shelfguide` — 4-tray shelf guide
- label: `Page 18 · Theme shelf guide (for you — tape inside the cupboard)`
- `.p-title` (font-size:1.9rem): `Theme Shelf · My Body`
- intro (grey): `Four trays, left → right, easiest → hardest. Present each at Monday group
  time, then they're free-choice work all week.`

| tray | content |
|---|---|
| Tray 1 · My Body Parts | **My Body cards** (pages 10–11) + a full-length mirror or the wall outline. Littles match picture→picture on the control card, then touch the same part on themselves. Bigs add the word labels. Language: "This is my head." |
| Tray 2 · Inside / Outside | **Inside/Outside mats + 12 body cards** (pages 12–14). Child sorts, then checks the ✓ on the back. Control of error: the tick. Language: "My heart is inside." |
| Tray 3 · What Can I Do? | **Action cards** (page 15) face-down in a basket. Draw one, do it, say it: "I can stretch!" Two children play it as a give-a-command game — one reads, one moves, then swap. |
| Tray 4 · My Body Booklet | Crayons + **body sheets** (page 16, one per child) + a stapler. Child draws themselves, you scribe whatever they tell you, staple into a little booklet. Finished booklets go on the theme wall Thursday and go home Friday with the child's **award** (page 17). |

- closing grey line: `Laminate pages 10–15 if you can. Tick the backs of the six "inside"
  cards before the mat goes on the shelf.`

---

## 9. Wrap tab (`#day8`) — parent recap

**`.day-head` h2:** End of Week Wrap-Up
**`.day-head` p:** Friday recap — read it at the last circle, then print it for the parent
wall or WeChat photo.

Inside `.sheet.wrapup#pt-wrapup`:

1. **`.p-title`** (font-size:2rem): `Whale Class · Week Wrap-Up 🐳`
2. **grey sub-line:** `Sep 8–12 · Theme: <b>My Body! From Head to Toe</b> · Letter of the week: <b>Pp</b>`

3. **`<h3>`What we did`</h3>`**
> This week was all about **our bodies**! The Magic Box gave us a giant paper foot, a bouncy
> ball, a red paper heart and one lonely crayon. We lay down on a huge sheet of paper and
> traced a whole child, then covered the outline with labels — **head, hands, feet, arms,
> legs**. We ran between three stations to **jump, bend and stretch**, and copied every
> friend's best move. We listened to our hearts go *boom boom* after running, learned that
> our **lungs** help us breathe and our **bones** hold us up, and sorted body parts into
> *inside* and *outside*. Every child drew their own body, told us what it can do, and took
> home a little **My Body booklet** and a strong-body award.

4. **`<h3>`Words we learned`</h3>`** — `.wchips` (10 chips):
`body` · `hands` · `feet` · `jump` · `heart` · `head` · `legs` · `bones` · `lungs` · `stretch`

5. **`<h3>`Sentences to listen for at home`</h3>`**
> `"This is my nose."` · `"I have two legs."` · `"I can jump!"` · `"My heart beats."` ·
> `"My body helps me dance."`
> Our littlest friends say one word with a gesture — `"Feet!"` with a stamp is a big win at
> 2 and 3.

6. **`<h3>`Our song · "My Body, My Body"`</h3>`**
> *"My body, my body! Head to toe, look at me! I can jump, I can clap, one, two, three —
> that's ME!"*
> We sang it on the ukulele every day and added a new verse each morning. Ask your child to
> sing the chorus — they will jump on "ME!"

7. **`<h3>`Letter of the week · Pp ("Pop, Pop, P!")`</h3>`**
> In our Dark Phonics work we learned the sound **/p/** — not the letter name, just the
> quick popping *p-p-p* sound (hold your hand in front of your mouth and feel the little
> puff), with our catchphrase *"pop, pop, puppy poop!"* — which got exactly the laugh you
> are imagining. We hunted for p-things: **pen, pig, pot, pin, pear, pan**. And we read our
> newest real words — <b class="say2">sap</b>, <b class="say2">pat</b>,
> <b class="say2">tap</b> and <b class="say2">spat</b> — in our books *The ___ Spat!* and
> *The ___ Can Pat!*

8. **`<h3>`Try this at home (2 minutes)`</h3>`**
> 1 · Point at a body part and ask *"What's this?"* — wait for `"My nose!"`. Then let your
> child test **you**, and get one wrong on purpose.
> 2 · Run on the spot together for ten seconds, then hands on chest: *"Fast or slow?"* —
> `"Boom boom! Fast!"`
> 3 · Say *"p-p-p… pig!"* and hunt for one p-thing in the house (pen? pot? pear?).
> 4 · At bedtime, five slow breaths together — in through the nose, out through the mouth.
> That's our **breathing game**, and it works at home too.

9. **`<p class="sig">`** Thank you for a lovely week — the Whale Class 🐳

---

## 10. Principal coverage map (`.extra` details block)

`<summary>`Principal coverage map (if she asks)`</summary>`

| curriculum requirement | where it happens |
|---|---|
| Science: recognise & name major body parts | Day 1 touch-chant + life-size body outline with labels · Day 5 whole-body chant + Touch-your speed round |
| Science: movement & what the body can do | Day 2 "I can!" drills + three-station game (jump / bend / stretch) · action cards on Tray 3 all week |
| Science: how parts work together | Day 2 station game (legs jump, arms stretch) · Day 4 "my legs help me run / my hands help me clap" |
| Science: inside the body — heart, lungs, bones | Day 3 heartbeat listen (run, then hands on chest), breathing game, X-ray Inside/Outside sort |
| Health & self-care | Day 3 breathing game (named and reused daily) · Day 4 "my body helps me play" |
| SEL: pride in who they are | Day 1 close ("THIS IS MY BODY!") · Day 4 spotlight circle — every child copied and cheered by the whole class |
| SEL: celebrating others' abilities | Day 2 celebration lap ("Look! Bao-Bao can hop!") · Day 4 class chant for each child |
| SEL: bodies are unique **and** capable | Day 4 whole block · Day 5 booklet finale |
| Key phrases, age 3 | "Head!" · "Hands!" · "Jump!" · "Run!" · "I can!" · "Boom boom!" · "Breathe." · "Bone!" · "My body." · "Legs!" · "Eyes!" · "Arm." · "Leg." · "I run." · "My nose." — all drilled with a gesture |
| Key phrases, age 4–5 | "This is my nose." · "I have two legs." · "These are my arms." · "I can climb / stretch my arms." · "My heart beats." · "Lungs help me breathe." · "I like my strong legs." · "My body helps me dance." · "I use my hands to draw." · "My feet help me jump." — bigs' frames, one set per day |
| Movement game + *Head, Shoulders, Knees and Toes* | Day 1 outline game, Day 2 stations, Day 5 speed round; the Head-Shoulders touch-along runs as the Day 5 **spoken chant** (see below) |
| Songs | One song, deliberately: "My Body, My Body" at every circle — chorus daily, one new verse per day covering her five daily topics, full-song finale Friday. *Head, Shoulders, Knees and Toes* is used as a **spoken touch-along chant**, not a second sung song (mixed-age ESL classes retain one new song per week) |
| Books | *From Head to Toe* (D1) · *Move!* (D2) · *Inside Your Outside* (D3) · *I Love My Body* (D4) — optional 3-min read-alouds |
| Crafts (body tracing, "My body" booklet) | Not circle-time work — Thursday's body sheets and Friday's booklet run at the art/table slot (Tray 4). Circle time seeds the language they need for them |
| Assessment: age 3 goal | Point & name head / hands / feet — checked in Day 5's Touch-your round |
| Assessment: age 4 goal | Complete sentence describing a part or its function — checked in the Day 5 prop quick-fire and in the scribed booklet line "My body can ___" |

---

## 11. Unchanged blocks (do not rewrite)

- `.extra` → "Weekly rituals (same every week, only the theme changes)" — identical to week 1.
- `.foot` — `Whale Class 🐳 · This page updates each week with the new theme.`
- All CSS, the gate card markup, `printSection`, the tab JS.
