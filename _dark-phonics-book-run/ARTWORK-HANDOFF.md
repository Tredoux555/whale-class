# Dark Phonics — Artwork Handoff (8 New Books)

## Context (read this first, you have zero prior context)

Dark Phonics is a phonics reading curriculum for 3–6 year olds. Each lesson teaches one letter sound; some lessons ship a "key-word book" — a 9-page decodable storybook built around a repeating sentence pattern: *"The ___ [does the thing]!"*. Six recurring cast members each take a turn in the sentence, then a recap page shows all six together, then a final "potato" page subverts the pattern as a joke. This handoff covers 8 NEW books that fill a gap in the existing 31-book series (letters f, l, j, v, w, y, z, qu). All 8 already have approved text; you are illustrating them.

**Fixed cast, established look (mined from the existing book art prompts — match these exactly, do not redesign):**
- **ant** — one small shiny black ant with big round googly eyes and thin bendy legs.
- **apple** — one large glossy red apple with a curved brown stem.
- **sun** — a bright cheerful sun with a wobbly hand-drawn outline and big round googly eyes.
- **star** — a smiling golden five-pointed star with big round googly eyes.
- **snake** — a friendly green snake with a slim curving neck, big round googly eyes, and a wide happy smile.
- **cat** — a grey striped cat with big round googly eyes and a long striped tail.
- **potato** (the recurring gag character, ALWAYS the same) — a round brown potato with two small eye-sprouts and big round googly eyes, wearing tiny round sunglasses, leaning back happily in a small striped wooden deck chair, with a tall glass of ice-cold lemonade (ice cubes, bendy straw) on a little side table beside him.

**House art style formula (append to every prompt, verbatim):** colored hand-drawn pen-and-ink, fine crosshatch, whimsical Dr. Seuss children's-book style, plain white background, expressive big googly eyes on every character/object. **Aspect ratio 1:1 always** (add `--ar 1:1` in Midjourney). **No photos, no photorealism.** **No text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark ever rendered in the image** — the words appear as separate typeset text laid over the art later, not baked into the picture.

**Deliverable:** for each of the 8 books below, generate `cover.png` + `p1` through `p9` (10 files total, 80 files overall) and save them into `phonics-images/dark-phonics-books/<slug>/` with the EXACT filenames given in each table — the build pipeline joins art to text by filename, so a typo or wrong extension breaks the book.

---

## Book 1 — `the-fast` — *The ___ Is Fast!*
Premise: the fan is spinning fast; each cast member races past it; the potato, as always, isn't fast at all.

| filename | scene | MJ prompt seed |
|---|---|---|
| p1-fan.png | frame: the fan itself | An old-fashioned spinning desk fan with round blades and swirling motion lines showing speed, big round googly eyes on the fan's hub, [HOUSE STYLE]. Caption context: "The fan is fast!" |
| p2-ant.png | ant racing | The ant cast character, legs blurred with speed lines, running fast, [HOUSE STYLE]. Caption: "The ant is fast!" |
| p3-apple.png | apple racing | The apple cast character, tipped on its side and rolling fast with motion lines, [HOUSE STYLE]. Caption: "The apple is fast!" |
| p4-sun.png | sun racing | The sun cast character, radiating speed lines, zooming sideways, [HOUSE STYLE]. Caption: "The sun is fast!" |
| p5-star.png | star racing | The star cast character, streaking across with a trail, [HOUSE STYLE]. Caption: "The star is fast!" |
| p6-snake.png | snake racing | The snake cast character, slithering fast in a blurred S-curve with speed lines, [HOUSE STYLE]. Caption: "The snake is fast!" |
| p7-cat.png | cat racing | The cat cast character, mid-sprint, all four paws off the ground, [HOUSE STYLE]. Caption: "The cat is fast!" |
| p8-recap.png | all six together | Ant, apple, sun, star, snake, and cat all racing together left to right past the spinning fan, all with speed lines, [HOUSE STYLE]. Caption: "The ant, the apple, the sun, the star, the snake and the cat: fast, fast, fast!" |
| p9-potato.png | the gag | The potato cast character in his deck chair with his lemonade, completely still, no motion lines at all, deliberately the opposite of every other page, [HOUSE STYLE]. Caption: "The potato is not fast." |
| cover.png | hero/title scene | The whole cast (ant, apple, sun, star, snake, cat) racing past the giant spinning fan in a dynamic diagonal composition, potato barely visible in a deck chair off to one side, [HOUSE STYLE]. Title-worthy, most dynamic single image in the book. |

## Book 2 — `the-lost` — *The ___ Is Lost!*
Premise: everyone is lost and sad in a big fog; the potato is never lost, he's exactly where he always is.

| filename | scene | MJ prompt seed |
|---|---|---|
| p1-fog.png | frame: the fog | A thick swirling grey-white fog bank filling the frame, a couple of small worried googly eyes peeking out from inside it, [HOUSE STYLE]. Caption: "The fog is big and bad!" |
| p2-ant.png | ant lost | The ant cast character standing alone in fog, downturned worried mouth, [HOUSE STYLE]. Caption: "The ant is lost and sad." |
| p3-apple.png | apple lost | The apple cast character alone in fog, sad drooping expression, [HOUSE STYLE]. Caption: "The apple is lost and sad." |
| p5-star.png | star lost | The star cast character alone in fog, dimmed points, sad, [HOUSE STYLE]. Caption: "The star is lost and sad." |
| p7-cat.png | cat lost | The cat cast character alone in fog, tail down, sad, [HOUSE STYLE]. Caption: "The cat is lost and sad." |
| p8-recap.png | all six together | Ant, apple, sun, star, snake, and cat huddled together sadly in the fog, all with worried faces, [HOUSE STYLE]. Caption: "The ant, the apple, the sun, the star, the snake and the cat: lost, lost, lost!" |
| p9-potato.png | the gag | The potato cast character in his deck chair with his lemonade, fog clearing just around him, perfectly content, sunglasses on, [HOUSE STYLE]. Caption: "The potato is not lost. He is in his deck chair!" |
| cover.png | hero/title scene | The whole cast wandering lost and huddled together in a swirling fog bank, [HOUSE STYLE]. Title-worthy, moody fog-filled composition. |

Note: only 4 of 6 cast pages are built per book (varies which four, per the source data below) — p4-sun.png and p6-snake.png are NOT built for this book; do not generate them.

## Book 3 — `the-jump` — *The ___ Can Jump!*
Premise: everyone jumps on a big log; the potato can't jump, so he naps instead.

| filename | scene | MJ prompt seed |
|---|---|---|
| p1-log.png | frame: the log | A big rounded brown tree log with visible bark rings, lying on the ground, big round googly eyes on one end, [HOUSE STYLE]. Caption: "The log is big. Jump on it!" |
| p2-ant.png | ant jumping | The ant cast character mid-air, jumping onto the log, arms/legs spread, [HOUSE STYLE]. Caption: "The ant can jump on a log." |
| p4-sun.png | sun jumping | The sun cast character mid-air above the log, bouncing, [HOUSE STYLE]. Caption: "The sun can jump on a log." |
| p5-star.png | star jumping | The star cast character mid-air above the log, [HOUSE STYLE]. Caption: "The star can jump on a log." |
| p6-snake.png | snake jumping | The snake cast character coiled and springing up off the log like a spring, [HOUSE STYLE]. Caption: "The snake can jump on a log." |
| p8-recap.png | all six together | Ant, apple, sun, star, snake, and cat all mid-jump over the log at once, [HOUSE STYLE]. Caption: "The ant, the apple, the sun, the star, the snake and the cat: jump, jump, jump!" |
| p9-potato.png | the gag | The potato cast character asleep in his deck chair, lemonade beside him, little "Zzz" motion implied only visually (no text), the log sitting untouched nearby, [HOUSE STYLE]. Caption: "The potato can not jump. He can nap!" |
| cover.png | hero/title scene | The whole cast leaping over the big log in a joyful row, [HOUSE STYLE]. Title-worthy, high-energy jumping composition. |

Note: p3-apple.png and p7-cat.png are NOT built for this book.

## Book 4 — `the-vest` — *The ___ Has a Vest!*
Premise: everyone gets a big red vest; the potato hasn't got one and doesn't mind.

| filename | scene | MJ prompt seed |
|---|---|---|
| p1-vest.png | frame: the vest | A big red vest with buttons, hanging alone on a wooden peg, big round googly eyes on the collar, [HOUSE STYLE]. Caption: "The vest is big and red!" |
| p2-ant.png | ant in vest | The ant cast character wearing a big red vest, proud pose, [HOUSE STYLE]. Caption: "The ant has a big red vest on." |
| p3-apple.png | apple in vest | The apple cast character wearing a big red vest, [HOUSE STYLE]. Caption: "The apple has a big red vest on." |
| p4-sun.png | sun in vest | The sun cast character wearing a big red vest, [HOUSE STYLE]. Caption: "The sun has a big red vest on." |
| p7-cat.png | cat in vest | The cat cast character wearing a big red vest, [HOUSE STYLE]. Caption: "The cat has a big red vest on." |
| p8-recap.png | all six together | Ant, apple, sun, star, snake, and cat, all wearing matching big red vests, lined up together, [HOUSE STYLE]. Caption: "The ant, the apple, the sun, the star, the snake and the cat: vest, vest, vest!" |
| p9-potato.png | the gag | The potato cast character in his deck chair with lemonade, bare/no vest, shrugging contentedly, [HOUSE STYLE]. Caption: "The potato has not got a vest." |
| cover.png | hero/title scene | The whole cast in matching red vests posing together proudly, [HOUSE STYLE]. Title-worthy, bright red-accented composition. |

Note: p5-star.png and p6-snake.png are NOT built for this book.

## Book 5 — `the-swim` — *The ___ Can Swim!*
Premise: everyone swims in a big wet tub; the potato can't swim, he's just wet and that's that.

| filename | scene | MJ prompt seed |
|---|---|---|
| p1-tub.png | frame: the tub | A big round metal wash tub full of water with splashes, big round googly eyes on the rim, [HOUSE STYLE]. Caption: "The tub is big and wet!" |
| p2-ant.png | ant swimming | The ant cast character swimming in the tub, splashing, [HOUSE STYLE]. Caption: "The ant can swim in a big wet tub." |
| p5-star.png | star swimming | The star cast character swimming/floating in the tub, [HOUSE STYLE]. Caption: "The star can swim in a big wet tub." |
| p6-snake.png | snake swimming | The snake cast character swimming in an S-curve through the tub water, [HOUSE STYLE]. Caption: "The snake can swim in a big wet tub." |
| p7-cat.png | cat swimming | The cat cast character swimming in the tub (comically wet fur, still smiling), [HOUSE STYLE]. Caption: "The cat can swim in a big wet tub." |
| p8-recap.png | all six together | Ant, apple, sun, star, snake, and cat all splashing together in the big wet tub, [HOUSE STYLE]. Caption: "The ant, the apple, the sun, the star, the snake and the cat: swim, swim, swim!" |
| p9-potato.png | the gag | The potato cast character in his deck chair, dripping wet but still holding his lemonade, tub visible nearby, mildly annoyed expression, [HOUSE STYLE]. Caption: "The potato can not swim. He is wet and that is it!" |
| cover.png | hero/title scene | The whole cast splashing together in the big wet tub with water droplets flying, [HOUSE STYLE]. Title-worthy, splashy dynamic composition. |

Note: p3-apple.png and p4-sun.png are NOT built for this book.

## Book 6 — `the-yam` — *The ___ Has a Yam!*
Premise: everyone gets a yam and shouts "Yum!"; the potato insists he is not a yam.

| filename | scene | MJ prompt seed |
|---|---|---|
| p1-yam.png | frame: the yam | A knobbly orange-brown yam sitting alone on a small mat, big round googly eyes, [HOUSE STYLE]. Caption: "The yam is big and red!" |
| p2-ant.png | ant with yam | The ant cast character hugging/holding a yam, delighted expression, [HOUSE STYLE]. Caption: "The ant has a yam. Yum! Yum! Yum!" |
| p3-apple.png | apple with yam | The apple cast character next to a yam, delighted expression, [HOUSE STYLE]. Caption: "The apple has a yam. Yum! Yum! Yum!" |
| p4-sun.png | sun with yam | The sun cast character holding a yam up high, delighted, [HOUSE STYLE]. Caption: "The sun has a yam. Yum! Yum! Yum!" |
| p5-star.png | star with yam | The star cast character next to a yam, delighted, [HOUSE STYLE]. Caption: "The star has a yam. Yum! Yum! Yum!" |
| p8-recap.png | all six together | Ant, apple, sun, star, snake, and cat all holding yams together, delighted, [HOUSE STYLE]. Caption: "The ant, the apple, the sun, the star, the snake and the cat: yam, yam, yam!" |
| p9-potato.png | the gag | The potato cast character in his deck chair with his lemonade, indignant expression, one hand up as if to say "no", clearly NOT a yam despite looking a little similar, [HOUSE STYLE] — this is the driest punchline in the whole set; play the resemblance-but-refusal for comedy. Caption: "The potato is not a yam!" |
| cover.png | hero/title scene | The whole cast gathered around a giant yam, all delighted, [HOUSE STYLE]. Title-worthy, warm composition. |

Note: p6-snake.png and p7-cat.png are NOT built for this book.

## Book 7 — `the-zip` — ARC CLIMAX — *The ___ Zips!*
Premise: everyone zips up a big red bag and runs; the potato didn't zip, he's in his deck chair. This book's frame page is the FIRST fully-red, fully-decodable page in the whole series — treat p1 as the hero image of the entire 8-book run.

| filename | scene | MJ prompt seed |
|---|---|---|
| p1-bug.png | frame: a bug zipping a bag | A small round bug (beetle-like, googly-eyed) zipping up a big red bag/backpack, mid-action, zipper pull visible, [HOUSE STYLE]. Caption: "A bug zips up a big red bag!" — this is the book's signature image, give it extra polish. |
| p2-ant.png | ant zipping | The ant cast character zipping up a big red bag and starting to run, motion lines, [HOUSE STYLE]. Caption: "The ant zips up a big red bag and runs." |
| p3-apple.png | apple zipping | The apple cast character zipping up a big red bag and rolling/running, motion lines, [HOUSE STYLE]. Caption: "The apple zips up a big red bag and runs." |
| p5-star.png | star zipping | The star cast character zipping up a big red bag and running, motion lines, [HOUSE STYLE]. Caption: "The star zips up a big red bag and runs." |
| p6-snake.png | snake zipping | The snake cast character zipping up a big red bag and slithering off fast, motion lines, [HOUSE STYLE]. Caption: "The snake zips up a big red bag and runs." |
| p8-recap.png | all six together | Ant, apple, sun, star, snake, and cat all zipping up big red bags and running together, [HOUSE STYLE]. Caption: "The ant, the apple, the sun, the star, the snake and the cat: zip, zip, zip!" |
| p9-potato.png | the gag | The potato cast character in his deck chair with lemonade, bag nowhere in sight, completely unbothered, [HOUSE STYLE]. Caption: "The potato did not zip. He is in his deck chair." |
| cover.png | hero/title scene | The whole cast zipping up big red bags and running off together in a joyful chaotic dash, [HOUSE STYLE]. Title-worthy, the most energetic cover of the run — this book is the arc climax. |

Note: p4-sun.png and p7-cat.png are NOT built for this book.

## Book 8 — `the-quilt` — LETTERS-ARC FINALE — *The ___ Is under the Quilt!*
Premise: everyone naps together under one big red quilt; the potato naps ON TOP of the quilt, in his deck chair. Last letter book before the review weeks — give this cover extra warmth, it's the closing image of the letters arc.

| filename | scene | MJ prompt seed |
|---|---|---|
| p1-quilt.png | frame: one quilt, six lumps | A big red quilted blanket with six small distinct lumps underneath it (implying six hidden characters), big round googly eyes peeking out from under one corner, [HOUSE STYLE]. Caption: "Quick! Get under a big red quilt!" — second fully-red page in the series, give it care. |
| p2-ant.png | ant under quilt | The ant cast character peeking out from under a big red quilt, sleepy content expression, [HOUSE STYLE]. Caption: "The ant is under a big red quilt and naps." |
| p4-sun.png | sun under quilt | The sun cast character peeking out from under a big red quilt, sleepy, [HOUSE STYLE]. Caption: "The sun is under a big red quilt and naps." |
| p5-star.png | star under quilt | The star cast character peeking out from under a big red quilt, sleepy, [HOUSE STYLE]. Caption: "The star is under a big red quilt and naps." |
| p7-cat.png | cat under quilt | The cat cast character peeking out from under a big red quilt, curled up, sleepy, [HOUSE STYLE]. Caption: "The cat is under a big red quilt and naps." |
| p8-recap.png | all six together | Ant, apple, sun, star, snake, and cat all peeking out together from under one big red quilt, all sleepy and content, [HOUSE STYLE]. Caption: "The ant, the apple, the sun, the star, the snake and the cat: quilt, quilt, quilt!" |
| p9-potato.png | the gag | The potato cast character asleep ON TOP of the same big red quilt, in his deck chair, lemonade beside him, [HOUSE STYLE]. Caption: "The potato is not under it. Just a nap in his deck chair!" |
| cover.png | hero/title scene | The whole cast (ant, apple, sun, star, snake, cat) tucked together under one big red quilt with the potato asleep on top of it in his deck chair, all six lumps plus the potato visible in one warm composition, [HOUSE STYLE]. Title-worthy — this is the final image of the entire 8-letter, 31-lesson letters arc; make it feel like an ending. |

Note: p3-apple.png and p6-snake.png are NOT built for this book.

---

## Rules

**Consistency.** Every appearance of a given cast member (ant, apple, sun, star, snake, cat, potato) across all 8 books must be the SAME character design — same proportions, same eye style, same colors — only pose/action/prop changes per scene. If Midjourney's `--oref` or a style-reference image is available, lock it to the character description text above (or, better, to an existing rendered page of `ant`/`apple`/`sun`/`star`/`snake`/`cat`/`potato` from an earlier book in `phonics-images/dark-phonics-books/the-bug/` or `the-pit/`, since those already exist and are the ground truth for "what this cast currently looks like").

**When a generation drifts** (wrong character count, extra objects, a face where there shouldn't be one, text/letters rendered into the image, wrong color scheme, photorealistic instead of pen-and-ink): re-roll with the same prompt before altering wording — Midjourney variance, not a bad prompt, is the usual cause. If a specific character's design keeps drifting (e.g. the ant grows extra legs, the potato loses his deck chair), add back in the exact fixed-cast description from this doc's context header, verbatim, and re-roll. Never invent a new prop or trait not listed above — the potato's chair, sunglasses, and lemonade glass are locked; do not vary them book to book.

**Format.** All files PNG, square (1:1), white background, no drop shadow, no rounded corners, no frame/border baked in.

**Exact drop locations.**
- Page art + cover: `phonics-images/dark-phonics-books/<slug>/p1-<frame>.png` ... `p9-potato.png`, plus `phonics-images/dark-phonics-books/<slug>/cover.png` — one folder per book, 10 files each, 80 files total across all 8 books.
- Slugs, in order: `the-fast`, `the-lost`, `the-jump`, `the-vest`, `the-swim`, `the-yam`, `the-zip`, `the-quilt`.
- Once art is complete, covers ALSO need a copy at `public/dark-phonics-books/covers/<slug>.png` (same image, just duplicated to that second path) — the public library page reads covers from there, not from the `phonics-images` folder.
