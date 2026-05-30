# Montree — HeyGen Video Scripts

The production scripts for Montree's explainer video series, written for
**HeyGen** (app.heygen.com). One hero film for the front page, twelve feature
explainers for the `/montree/explainer` gallery and social.

Every video is a **talking-head**: one AI avatar speaking to camera, on a calm
background, with on-screen captions for the lines that must land with the sound
off. No B-roll, no stock footage, no screen recordings. The script is the whole
game — HeyGen executes a strong script with precision.

These scripts are deliberately *human*. They sell hard on substance — real
time saved, real money, real expertise — but never sound like an ad. Calm,
confident, specific. The kind of thing a trusted colleague says, not a banner.

---

## Slug map (keep these in sync with the explainer gallery)

The explainer page expects each produced video to land in the `montree-media`
bucket at `explainer/<slug>.mp4` (served via the CDN proxy at
`/api/montree/media/proxy/explainer/<slug>.mp4`). Use these exact slugs:

| # | Slug | Video |
|---|------|-------|
| ★ | `main-explainer` | **Main explainer — the explainer-page hero (all-encompassing short)** |
| 1 | `hero` | Hero (front page) — *uses the existing splash film* |
| 2 | `smart-capture` | Smart Capture |
| 3 | `weekly-reports` | AI Weekly Reports |
| 4 | `guru` | Guru — the teacher's AI |
| 5 | `astra` | Astra — the principal's AI |
| 6 | `curriculum` | Curriculum & Planning |
| 7 | `communication` | Communication Network |
| 8 | `voice-onboarding` | Voice Onboarding |
| 9 | `reading-tracker` | English Progression Tracker |
| 10 | `appointments` | Appointments & Video Calls |
| 11 | `library` | Library Teaching Tools |
| 12 | `multilingual` | Multilingual |

*Video 5 (Child Profiles & Progress) was removed — the gallery and numbering
above reflect the reshuffle. The `main-explainer` is the new headline film:
once produced, upload it to `explainer/main-explainer.mp4` and it becomes the
explainer-page hero.*

---

## The HeyGen brief — paste this with any script

> You are building a Montree explainer video in **HeyGen** (app.heygen.com).
> It is a **talking-head explainer** — one AI avatar speaks to camera the
> whole way through. Tone: warm, calm, confident, premium. Never hyped,
> never salesy. Think trusted mentor, not infomercial.
>
> **Avatar & voice (brand consistency — identical across every video)**
> - Use the **same avatar** for every Montree video. Pick a warm, credible,
>   approachable presenter — someone a Montessori teacher would trust.
> - Voice: a warm, calm British or neutral-English voice at a measured pace
>   (~150 words/min). Add small pauses at the periods — the silences sell.
> - Lock the avatar + voice once and reuse. Consistency *is* the brand.
>
> **Look**
> - Aspect ratio: **16:9** for the hero; **9:16 vertical** for every feature
>   video (so they drop straight into the gallery and onto Reels/TikTok/Shorts).
> - One **clean, calm, consistent background** for the whole video — a soft
>   neutral or gentle forest-green tint. Do not change it between scenes.
> - **No B-roll, no stock footage, no screen recordings.** The avatar is the
>   visual. The captions carry the key words.
> - Music: soft and low, or none. It must never compete with the voice.
>
> **Build**
> - Paste the NARRATION into the script editor. Each blank-line-separated
>   paragraph is one scene. The scripts are written so one paragraph = one
>   clean scene already.
> - For each scene, add the **on-screen caption** from that video's table.
>   Large, high-contrast, clear of the top/bottom safe zones — readable with
>   the sound off. Captions are not the full sentence; they are the *hook* of it.
> - Turn on auto-captions/subtitles for accessibility.
> - Keep transitions simple — a soft cut, or none.
>
> **Finish**
> - Preview. Watch the first 3 seconds hard: the opening line + its caption
>   must land instantly, before anyone decides to scroll.
> - Generate, then download the MP4.
> - Name the file by its slug (e.g. `smart-capture.mp4`) and upload it to the
>   `montree-media` bucket under `explainer/`. The gallery picks it up
>   automatically — no code change needed.

---

## The persuasion spine (baked into every script)

These are the levers each script pulls. Named so they can be checked, not
guessed at:

- **First 3 seconds win or lose.** Open on the viewer's pain or a sharp
  question — never a logo, never "Hi, today we'll…".
- **Specificity is credibility.** "Forty-five minutes per report." "Twelve
  languages." "Ninety seconds." Real numbers beat adjectives every time.
- **Name the enemy, gently.** The enemy is paperwork, admin, lost evenings —
  never the teacher. We're on their side against the drudgery.
- **Authority without arrogance.** "Trained on everything Maria Montessori
  wrote." Earned expertise, stated plainly.
- **Identity & belonging.** "The new standard." Teachers want to be the kind
  of school that runs like this.
- **Loss aversion + early-mover pull.** "Sign up early and shape what's built
  for your school." Scarcity that's true, not manufactured.
- **One ask.** Hero ends on the site + free trial. Every feature video ends on
  a **share trigger** — "Send this to a teacher who…" — because the best
  distribution is one teacher forwarding it to another.
- **Structure:** Hook → Problem → Solution → Proof → Action/Share.
- **Pace & length:** Hero ≈ 60-70s. Feature videos ≈ 22-28s.

---

# THE 13 SCRIPTS

Each: a NARRATION block to paste, then the on-screen captions per scene, then
the persuasion note for the producer.

---

## 1 — HERO (front page) · `hero`
*16:9 · ~65s · talking-head · status: APPROVED (existing splash film)*

**NARRATION** *(paste — 9 paragraphs = 9 scenes)*

> What makes Montree different?
>
> A teacher takes a photo of a child at work. Montree identifies the material, records the observation, and builds a real picture of where that child is — and where they're going next. No writing observations by hand. Ever.
>
> Then Montree takes those same photos and turns them into beautiful, curated weekly reports for parents. Each one would have cost a teacher forty-five minutes to write.
>
> This is real AI. Behind it is an assistant that has studied every one of Maria Montessori's original works, and the science of child development. It's as if it was in the classroom with you.
>
> It's not fluff. It's not fake. It's real. Real progress. Real development. Real magic.
>
> This is the new standard.
>
> And it's only the beginning. Montree is growing fast — becoming the system that runs the whole school. Sign up early, and you can have features built specifically for yours.
>
> That's the magic of Montree.
>
> Try it free for seven days — the AI is on us. montree.xyz.

**On-screen captions**

| Scene | Caption |
|---|---|
| 1 | What makes Montree different? |
| 2 | Snap a photo. Montree does the rest. |
| 3 | Weekly parent reports — written for you |
| 4 | Trained on all of Montessori |
| 5 | Real progress. Real development. |
| 6 | The new standard |
| 7 | Sign up early — shape what's built next |
| 8 | The magic of Montree |
| 9 | Try it free for 7 days · montree.xyz |

**Producer note —** The hook is a question, not a claim: it makes the viewer
answer in their head and stay. Scenes 2–3 are the two killer proofs (no
paperwork; reports written for you) with the one hard number that sells the
whole thing — *forty-five minutes*. Scene 7 is the early-mover lever. Close is
risk-free ("the AI is on us") + a single ask.

**3-second cutdowns to A/B against scene 1:**
"A teacher takes a photo. Montree does the rest." ·
"Your teachers lose hours every week to paperwork. Here's the fix."

---

## 2 — Smart Capture · `smart-capture`
*9:16 · ~24s · talking-head*

**NARRATION** *(5 scenes)*

> Be honest — how many hours a week do your teachers lose to writing observations?
>
> With Montree, that number is zero.
>
> A teacher watches a child work. They take one photo. Montree identifies the material, writes the observation, and updates that child's progress on its own.
>
> The teacher stays on the mat, with the children — not at a desk, with the paperwork.
>
> Know a teacher drowning in admin? Send them this.

**On-screen captions**

| Scene | Caption |
|---|---|
| 1 | How many hours go to observations? |
| 2 | With Montree: zero |
| 3 | One photo. Identified. Recorded. Tracked. |
| 4 | Time back with the children |
| 5 | Send this to a teacher drowning in admin |

**Producer note —** Opens with a question that makes the cost feel personal
before naming the fix. "Zero" is the pattern-interrupt. Close is the share
trigger.

---

## 3 — AI Weekly Reports · `weekly-reports`
*9:16 · ~25s · talking-head*

**NARRATION** *(5 scenes)*

> A weekly parent report used to cost a teacher forty-five minutes. Multiply that by every child in the class.
>
> Montree writes it in moments.
>
> Warm, specific, beautiful — with the week's photos woven right in. It reads as if it sat beside you all week and watched.
>
> Every child. Every week. Done — and parents have never felt more connected.
>
> Send this to a teacher who dreads report week.

**On-screen captions**

| Scene | Caption |
|---|---|
| 1 | 45 minutes per report. Per child. |
| 2 | Montree writes it in moments |
| 3 | The week's photos, woven in |
| 4 | Every child. Every week. |
| 5 | Send this to a teacher who dreads report week |

**Producer note —** The "multiply that by every child" line turns one number
into a crushing weekly total — that's the agitation. Then instant relief.
The parent-connection line answers the unspoken fear ("will automated reports
feel cold?") before it's asked.

---

## 4 — Guru, the teacher's AI · `guru`
*9:16 · ~26s · talking-head*

**NARRATION** *(5 scenes)*

> Every Montessori teacher has had that moment. One child, one puzzle, and no one to ask.
>
> Montree gives you Guru.
>
> An assistant trained on everything Maria Montessori wrote, and the modern science of child development. Ask it anything, about any child in your class — and it answers like a guide who knows them.
>
> It's Maria Montessori, in your pocket. At two in the afternoon, or two in the morning.
>
> Send this to a Montessori teacher you know.

**On-screen captions**

| Scene | Caption |
|---|---|
| 1 | One child. One puzzle. No one to ask. |
| 2 | Meet Guru |
| 3 | Trained on all of Montessori |
| 4 | Maria Montessori, in your pocket |
| 5 | Send this to a Montessori teacher |

**Producer note —** Scene 1 is pure recognition — every teacher has lived it,
so they lean in. The authority claim (scene 3) is the proof. "Two in the
morning" quietly says *always there* without overclaiming.

---

## Astra, the principal's AI · `astra`
*9:16 · ~25s · talking-head*

**NARRATION** *(5 scenes)*

> A principal can't be in every classroom at once. However hard they try.
>
> Astra can.
>
> Astra is Montree's AI for the head of school. Ask her anything — which children need attention this week, how a classroom is really doing, what to say to a worried parent before the meeting.
>
> The whole school, in one conversation. The kind of oversight that used to take a dozen walk-arounds.
>
> Send this to a Montessori principal.

**On-screen captions**

| Scene | Caption |
|---|---|
| 1 | A principal can't be everywhere |
| 2 | Astra can |
| 3 | Ask her anything about your school |
| 4 | The whole school, in one conversation |
| 5 | Send this to a Montessori principal |

**Producer note —** Speaks to a different buyer — the decision-maker who signs
the cheque. The pains are theirs (oversight, the worried-parent meeting), not
the teacher's. "A dozen walk-arounds" makes the time saving concrete.

---

## 7 — Curriculum & Planning · `curriculum`
*9:16 · ~25s · talking-head*

**NARRATION** *(5 scenes)*

> What should this child do next? It's the question behind every good lesson — and the one that eats your evenings.
>
> Montree answers it. For every child, in every area.
>
> The full Montessori curriculum is built in. Montree sees where a child is and shows you exactly what comes next. No guesswork. No planning on paper at the kitchen table.
>
> Your next lesson, already prepared.
>
> Send this to a teacher who still plans by hand.

**On-screen captions**

| Scene | Caption |
|---|---|
| 1 | What comes next for this child? |
| 2 | Montree answers — for every child |
| 3 | The full Montessori curriculum, built in |
| 4 | Your next lesson, already prepared |
| 5 | Send this to a teacher who plans by hand |

**Producer note —** "Eats your evenings" and "kitchen table" make the cost
emotional and domestic — this is the teacher's own time, after hours. The
share trigger gently singles out the holdouts ("still plans by hand").

---

## 8 — Communication Network · `communication`
*9:16 · ~24s · talking-head*

**NARRATION** *(5 scenes)*

> School messages scattered across email, WhatsApp, and sticky notes on the fridge?
>
> Montree puts every conversation in one place.
>
> Teachers, parents, and the principal — one thread per family, the full history, always there. Nothing lost. Nothing forgotten. Nothing buried in someone's personal phone.
>
> Pick up exactly where you left off — even with the family you onboarded two years ago.
>
> Send this to a school still chasing group chats.

**On-screen captions**

| Scene | Caption |
|---|---|
| 1 | Messages everywhere. Answers nowhere. |
| 2 | One place for every conversation |
| 3 | One thread per family · full history |
| 4 | Nothing lost. Nothing forgotten. |
| 5 | Send this to a school chasing group chats |

**Producer note —** "Sticky notes on the fridge" and "someone's personal phone"
name the real, slightly embarrassing status quo — and the safeguarding risk —
without lecturing. "Two years ago" proves the permanence.

---

## 9 — Voice Onboarding · `voice-onboarding`
*9:16 · ~24s · talking-head*

**NARRATION** *(5 scenes)*

> Setting up a new class used to mean hours of typing. The worst kind of start to a year.
>
> With Montree, you just talk.
>
> Tell it about a child — ninety seconds, in your own words, the way you'd describe them to a colleague. Montree builds their whole profile from what you say.
>
> A full classroom, set up by speaking. Before the first coffee's gone cold.
>
> Send this to a teacher starting a new year.

**On-screen captions**

| Scene | Caption |
|---|---|
| 1 | A new class = hours of typing |
| 2 | Just talk |
| 3 | 90 seconds. In your own words. |
| 4 | A whole class, set up by speaking |
| 5 | Send this to a teacher starting a new year |

**Producer note —** "The way you'd describe them to a colleague" makes the AI
feel natural, not technical. "Before the first coffee's gone cold" is the
memorable speed claim. Timed for back-to-school season.

---

## 10 — English Progression Tracker · `reading-tracker`
*9:16 · ~27s · talking-head*

**NARRATION** *(5 scenes)*

> Which of your children are ready to read — and which are quietly stuck, and nobody's noticed?
>
> Montree shows you. Exactly.
>
> It tracks every child's reading journey lesson by lesson, and flags who needs a push, who's racing ahead, and who hasn't visited the reading area all week.
>
> The child who'd have slipped between the cracks? Now you catch them.
>
> Send this to a teacher teaching early reading.

**On-screen captions**

| Scene | Caption |
|---|---|
| 1 | Who's ready to read? Who's stuck? |
| 2 | Montree shows you, exactly |
| 3 | Lesson by lesson · who needs a push |
| 4 | Catch the child who'd slip through |
| 5 | Send this to a teacher teaching reading |

**Producer note —** "Quietly stuck, and nobody's noticed" is the fear every
good teacher carries. The payoff reframes the product as *protecting children*,
not tracking data — a higher-order benefit than time saved.

---

## 11 — Appointments & Video Calls · `appointments`
*9:16 · ~24s · talking-head*

**NARRATION** *(4 paragraphs = 4 scenes)*

> Booking one parent meeting shouldn't take ten emails back and forth.
>
> In Montree, a parent picks a time — and you meet, by video, right inside the app.
>
> No links to chase. No apps to download. The meeting, and the child's whole story, open side by side in one place.
>
> Send this to a school doing parent conferences this term.

**On-screen captions**

| Scene | Caption |
|---|---|
| 1 | Ten emails to book one meeting? |
| 2 | Book it. Meet by video. Inside Montree. |
| 3 | No links. No downloads. |
| 4 | Send this to a school doing parent conferences |

**Producer note —** Shortest of the set — the pain is small but universal, so
the video should be brisk. "The child's whole story open side by side" is the
differentiator no calendar tool has.

---

## 12 — Library Teaching Tools · `library`
*9:16 · ~25s · talking-head*

**NARRATION** *(5 scenes)*

> Montessori teachers make beautiful materials by hand — and lose whole evenings doing it.
>
> Montree's library does it in seconds.
>
> Three-part cards, picture bingo, sentence strips, flashcards — generated, printable, themed to whatever you're teaching tomorrow morning.
>
> Your prep time, handed back to you. To spend on the children, or on yourself.
>
> Send this to a teacher who makes their own cards.

**On-screen captions**

| Scene | Caption |
|---|---|
| 1 | Hours lost making materials by hand |
| 2 | Montree's library does it in seconds |
| 3 | Cards · bingo · strips · flashcards |
| 4 | Your prep time, handed back |
| 5 | Send this to a teacher who makes their own cards |

**Producer note —** "Or on yourself" is a small, deliberate kindness — it tells
the teacher their own rest is a legitimate thing to want. That warmth is what
makes it shareable.

---

## 13 — Multilingual · `multilingual`
*9:16 · ~25s · talking-head*

**NARRATION** *(5 scenes)*

> Your software is in English. Your classroom isn't.
>
> Montree speaks twelve languages — the whole app, end to end.
>
> Teachers work in their own language. Parents read their child's reports in theirs. Nothing is lost in translation, and no family is left out.
>
> Montessori, in the language of your school. As it should be.
>
> Send this to a school where English isn't the first language.

**On-screen captions**

| Scene | Caption |
|---|---|
| 1 | Your software is in English. Your classroom isn't. |
| 2 | 12 languages. The whole app. |
| 3 | Teachers and parents, in their own language |
| 4 | Montessori, in your school's language |
| 5 | Send this to a school where English isn't first |

**Producer note —** Scene 1 is one of the strongest hooks in the set — a flat,
true contradiction the viewer feels immediately. "No family is left out" lifts
it from a feature to a value. Pin this one for non-English markets.

---

## Production order (highest leverage first)

If producing in batches, this order front-loads the videos that convert and
travel best:

1. `hero` — already live as the splash film
2. `smart-capture` — the single biggest "wow", broadest pain
3. `weekly-reports` — the clearest money/time proof (45 min × every child)
4. `guru` — the emotional, identity-led one; most shared
5. `astra` — opens the principal/decision-maker buyer
6. `reading-tracker` — "protect the child" angle, strong for leads
7. `voice-onboarding` — seasonal spike at back-to-school
8. `curriculum`, `library`, `communication`, `appointments`, `multilingual` — round out the gallery

**Distribution reminder:** export/post natively per platform — never upload the
identical file to TikTok, Reels and Shorts; all three suppress recycled video.

*Companion doc: the Colossyan production system lives in
`Montree_Campaign_Video_Scripts.md`. Same scripts, different tool. Use whichever
generator is in front of you — the scripts are the asset.*

---

## ★ MAIN EXPLAINER (explainer-page hero) · `main-explainer`
*9:16 · ~75s · talking-head · the all-encompassing overview film*

**NARRATION** *(9 paragraphs = 9 scenes)*

> Maria Montessori built her whole method on one quiet act. Watching the child.
>
> But teaching filled up with everything else. The forms. The reports. The endless writing. And the watching — the part that actually matters — got squeezed into the cracks.
>
> Montree exists to give it back.
>
> A teacher takes one photo. And everything that used to swallow the evening — the observation, the record, the parent report, the next lesson — quietly takes care of itself.
>
> Because behind it stands a mind that has read every word Maria Montessori ever wrote. Teachers call it Guru. Heads of school call it Astra. Ask it anything — about any child, at any hour — and it answers like it's known them for years. The master teacher, always at your shoulder.
>
> And it doesn't stop at your classroom. Montree quietly runs the whole school — every child, every class, every family, every conversation, in one calm place. From a single photo, to an entire school that finally runs itself.
>
> So you can look up. Be there. Follow the child — the way it was always meant to be.
>
> That's the whole idea. Not more software. More presence.
>
> Montree. Give yourself back to the children. Seven days free, the AI's on us. montree.xyz.

**On-screen captions**

| Scene | Caption |
|---|---|
| 1 | Montessori begins with one act: watching |
| 2 | Then came the paperwork |
| 3 | Montree gives it back |
| 4 | One photo. The rest takes care of itself. |
| 5 | Guru for teachers. Astra for heads of school. |
| 6 | It runs the whole school — quietly |
| 7 | Look up. Be there. Follow the child. |
| 8 | Not more software. More presence. |
| 9 | Give yourself back · montree.xyz |

**Producer note —** Essence piece, not a feature tour. The soul is *presence* —
it bookends the film (open on watching, close on following the child), and the
features dissolve into "takes care of itself." Scenes 5 and 6 add the AI helpers
and the whole-school scope but must stay in the *emotional* register: read
scene 5 with quiet wonder ("the master teacher at your shoulder" — you're never
alone), scene 6 with calm confidence (the scale line, not a list). Slow and warm
on 1-4 and 7-9; let scene 6 swell on "an entire school that finally runs itself."
Hard pause before "Montree gives it back" and before the final line. Same avatar
+ voice as the feature films. Portrait 9:16, ~80s. Once produced, upload to
`montree-media/explainer/main-explainer.mp4` and the explainer hero goes live.

**Alt opening hooks to A/B (3-sec cutdowns):**
"When did teaching become paperwork?" ·
"Montessori begins with watching. So does Montree."
