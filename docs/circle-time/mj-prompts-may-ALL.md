# Midjourney prompts — May 2027 · Space month (weeks 30–34)

All five May weeks in one file, so one Midjourney run can do the whole month.
**185 images total — 37 per week** (8 posters `--ar 3:4` at 928×1232 · 28 cards `--ar 1:1`
at 1000×1000 · 1 badge). The per-week files
(`mj-prompts-week30.md` … `mj-prompts-week34.md`) are the same content, split; either is fine.

## How to run

1. **Run each prompt exactly as written.** The style suffix and the `--raw --stylize 50` flags are
   already appended to every line — do not shorten them, do not raise `--stylize`. The full negative
   list ("no text, no words, no letters…") must stay: Midjourney hallucinates stray lettering into
   children's art without it.
2. **Upscale the best variation** and save it as **PNG** into `~/Downloads/circle-time-mj/`, named
   with the exact filename at the start of that prompt line (e.g. `ct-week31-card-moon.png`).
   The filenames match the `src` attributes in `circle-time-week<NN>.html` character for character —
   renaming one silently breaks that image on the page (it falls back to an emoji).
3. **Convert to JPEG into the repo** — run on the Mac, once all five weeks are downloaded:

   ```bash
   export MONTREE="$HOME/Desktop/Master Brain/ACTIVE/montree"
   cd ~/Downloads/circle-time-mj
   for n in 32 33 34 35 36; do
     mkdir -p "$MONTREE/public/circle-time-images/week$n"
     for f in ct-week$n-*.png; do
       sips -s format jpeg -s formatOptions 80 "$f" \
         --out "$MONTREE/public/circle-time-images/week$n/${f%.png}.jpg" >/dev/null
     done
     echo "week$n: $(ls "$MONTREE/public/circle-time-images/week$n" | wc -l)"   # expect 37 each
   done
   ```

   Target size is roughly 2–5 MB per week folder (week 1 is 4.8 MB, week 2 is 2.1 MB).
4. **Check the page.** Open `/teachers-w<NN>`, password `THISDL`. Any image still showing an emoji
   is a file that did not land or is misnamed.

Cards are deliberately hyper-literal and singular — one object, centred, nothing else in frame.
A card showing a scene cannot be matched by a three-year-old.


---

# Week 30 · Big Bang and the Universe

**May 10–14** · five words: dark · light · star · big · bang · page `/teachers-w30` · images land in `public/circle-time-images/week30/` · 37 files.

37 images: **8 posters** (`--ar 3:4`, save 928×1232) · **28 cards** (`--ar 1:1`, save 1000×1000) · **1 badge**.

**How to use:** run each prompt as written, upscale the best one, save it as the PNG filename at the
start of the line into `~/Downloads/circle-time-mj/`, then convert to JPEG into
`public/circle-time-images/week30/` (see WEEK_BUILD_SPEC §4d). The filenames below match the `src`
attributes in `circle-time-week30.html` exactly — do not rename them.

**Locked style suffix** (already appended to every prompt below, verbatim):
`, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame`

Cards are deliberately hyper-literal and singular — one object, centred, nothing else in frame.

---

## Posters — 8 · `--ar 3:4`

1. `ct-week30-poster-theme.png` — a dark night sky in the top half bursting downwards into a warm spray of light and small stars, one bright burst at the centre, gentle and joyful not frightening, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50

2. `ct-week30-poster-dark.png` — a completely empty dark night sky, deep soft blue-black, nothing in it at all, no stars, no moon, calm and quiet, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50

3. `ct-week30-poster-light.png` — a single hand-held torch shining one warm cone of yellow light into a dark blue space, the beam clearly visible, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50

4. `ct-week30-poster-star.png` — one single bright yellow five-pointed star glowing in a dark blue sky, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50

5. `ct-week30-poster-big.png` — one small happy child seen from behind standing with both arms stretched out as wide as they will go under an enormous open sky, the child tiny and the sky huge, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50

6. `ct-week30-poster-bang.png` — one big round burst of warm light exploding outwards from a single point, soft rounded rays and little sparks flying out, cheerful not scary, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50

7. `ct-week30-poster-sentence-frames.png` — two small children standing side by side, both pointing up with one arm at a sky full of little stars, happy faces, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50

8. `ct-week30-poster-chorus.png` — one small child sitting cross-legged playing a small ukulele and singing with an open happy mouth, a sky full of little stars behind them, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50

---

## Cards · 3-part card set (universe) — 6 · `--ar 1:1`

9. `ct-week30-card-sun.png` — one single yellow sun, round with simple soft rays, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

10. `ct-week30-card-moon.png` — one single crescent moon, pale cream, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

11. `ct-week30-card-star.png` — one single yellow five-pointed star, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

12. `ct-week30-card-planet.png` — one single round planet with one flat ring around it, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

13. `ct-week30-card-comet.png` — one single comet, a round bright head with one long soft tail streaming behind it, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

14. `ct-week30-card-universe-control.png` — one night sky scene holding a sun, a crescent moon, several stars, a ringed planet and a comet all together in one calm arrangement, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

---

## Cards · Light / Dark sorting set — 14 · `--ar 1:1`

**Light (6) + the two big sorting signs**

15. `ct-week30-card-light.png` — one glowing warm lamp filling the whole square with soft yellow light, bright and cheerful, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

16. `ct-week30-card-dark.png` — one deep dark empty night filling the whole square, soft blue-black, no light anywhere, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

17. `ct-week30-card-torch.png` — one single hand torch switched on with a short warm beam coming out of it, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

18. `ct-week30-card-candle.png` — one single lit candle with one small warm flame, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

19. `ct-week30-card-lamp.png` — one single table lamp switched on with a glowing shade, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

20. `ct-week30-card-campfire.png` — one single small campfire burning with warm orange flames over a few logs, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

21. `ct-week30-card-firefly.png` — one single firefly with a glowing yellow tail, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

22. `ct-week30-card-lightning.png` — one single bright yellow lightning bolt, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

**Dark (6)**

23. `ct-week30-card-cave.png` — one single dark cave mouth in a rock, black inside, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

24. `ct-week30-card-night.png` — one dark night sky over two low sleeping hills, quiet and dim, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

25. `ct-week30-card-black-cat.png` — one single black cat sitting and facing forward, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

26. `ct-week30-card-closed-box.png` — one single closed cardboard box with the lid shut tight, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

27. `ct-week30-card-shadow.png` — one single dark soft shadow shape lying on pale ground, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

28. `ct-week30-card-tunnel.png` — one single dark round tunnel opening, black inside, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

---

## Cards · "I can ___!" action cards — 8 · `--ar 1:1`

29. `ct-week30-card-can-shine.png` — one single small child holding a lit torch up high above their head with both hands, whole body visible, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

30. `ct-week30-card-can-hide.png` — one single small child covering both eyes with both hands, whole body visible, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

31. `ct-week30-card-can-grow.png` — one single small child rising up out of a crouch with both arms opening wide, whole body visible, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

32. `ct-week30-card-can-bang.png` — one single small child clapping both hands together hard in front of their chest, whole body visible, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

33. `ct-week30-card-can-jump.png` — one single small child jumping with both feet off the ground and arms up, whole body visible, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

34. `ct-week30-card-can-twinkle.png` — one single small child holding both hands up beside their face with fingers spread wide, whole body visible, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

35. `ct-week30-card-can-spin.png` — one single small child spinning around with both arms held straight out to the sides, whole body visible, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

36. `ct-week30-card-can-count.png` — one single small child pointing upward with one hand and holding up three spread fingers on the other hand, whole body visible, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

---

## Badge — 1 · `--ar 1:1`

37. `ct-week30-badge-star.png` — one single gold star badge with a soft rounded outline and a gentle shine, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

---

# Week 31 · Solar System

**May 17–21** · five words: sun · moon · Earth · round · hot · page `/teachers-w31` · images land in `public/circle-time-images/week31/` · 37 files.

37 images: **8 posters** (`--ar 3:4`, save at 928×1232) · **28 cards** (`--ar 1:1`, save at 1000×1000) · **1 badge**.

Save each chosen upscale as PNG into `~/Downloads/circle-time-mj/` using the **target filename** given at the
start of each line, then convert to JPEG into `public/circle-time-images/week31/` (see WEEK_BUILD_SPEC §4d).
Filenames below match the `src` attributes in `circle-time-week31.html` exactly — do not rename.

Locked style suffix (already appended to every line below, verbatim):

> `, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame`

Flags: `--raw --stylize 50`. Do not raise stylize. Cards must be hyper-literal and singular.

---

## Posters (8) · `--ar 3:4`

1. `ct-week31-poster-theme.png` — a big smiling golden sun in the centre with a small blue-and-green Earth and a small white moon travelling around it on gentle curved paths, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50
2. `ct-week31-poster-sun.png` — one bright yellow sun with long soft rays, warm and friendly, centred and filling the frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50
3. `ct-week31-poster-moon.png` — one round white moon with soft grey craters against a deep calm night sky, centred, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50
4. `ct-week31-poster-earth.png` — one round planet Earth, blue oceans and green land, gentle white clouds, centred, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50
5. `ct-week31-poster-round.png` — one happy young child spinning on the spot with both arms sweeping out to draw a big circle, hair flying, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50
6. `ct-week31-poster-hot.png` — one young child fanning their face with one hand under a big warm yellow sun, cheeks pink, wavy heat lines in the air, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50
7. `ct-week31-poster-sentence-frames.png` — two young children standing side by side, one pointing up at a yellow sun and one pointing up at a white moon, both looking up, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50
8. `ct-week31-poster-chorus.png` — one young child sitting cross-legged playing a small ukulele while a sun, a small Earth and a small moon circle gently around their head, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50

---

## 3-part cards · solar system set (6) · `--ar 1:1`

9. `ct-week31-card-sun.png` — one single yellow sun with simple rays, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
10. `ct-week31-card-moon.png` — one single white moon with a few soft craters, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
11. `ct-week31-card-earth.png` — one single planet Earth, blue and green, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
12. `ct-week31-card-planet.png` — one single round planet with a simple ring around it, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
13. `ct-week31-card-orbit.png` — one small blue planet travelling along a simple dotted circular path around one small yellow sun, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
14. `ct-week31-card-solarsystem-control.png` — one whole solar system seen from above: a yellow sun in the middle with small round planets spaced along simple circular orbit lines, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

---

## Hot / Cold sorting cards (14) · `--ar 1:1`

15. `ct-week31-card-hot.png` — one single glowing orange sun with wavy heat lines rising from it, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
16. `ct-week31-card-cold.png` — one single pale blue moon with three small snowflakes around it, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
17. `ct-week31-card-fire.png` — one single small orange campfire flame, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
18. `ct-week31-card-soup.png` — one single bowl of soup with soft steam curling up, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
19. `ct-week31-card-tea.png` — one single mug of tea with soft steam curling up, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
20. `ct-week31-card-toast.png` — one single warm slice of toast, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
21. `ct-week31-card-candle.png` — one single lit candle with a small flame, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
22. `ct-week31-card-lava.png` — one single small volcano with red-orange lava running down it, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
23. `ct-week31-card-ice.png` — one single clear pale blue ice cube, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
24. `ct-week31-card-snowflake.png` — one single white snowflake, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
25. `ct-week31-card-snowman.png` — one single small snowman with a carrot nose, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
26. `ct-week31-card-icecream.png` — one single ice cream cone with one scoop, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
27. `ct-week31-card-iceberg.png` — one single blue-white iceberg floating in calm water, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
28. `ct-week31-card-penguin.png` — one single penguin standing still, facing forward, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

---

## "I can ___!" action cards (8) · `--ar 1:1`

29. `ct-week31-card-can-spin.png` — one single young child spinning on the spot with arms out, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
30. `ct-week31-card-can-roll.png` — one single young child rolling sideways along the floor, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
31. `ct-week31-card-can-hop.png` — one single young child hopping on one foot, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
32. `ct-week31-card-can-shine.png` — one single young child standing with both hands open wide beside their face like sun rays, beaming, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
33. `ct-week31-card-can-sleep.png` — one single young child curled up asleep on the floor, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
34. `ct-week31-card-can-wake.png` — one single young child sitting up and stretching tall after waking, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
35. `ct-week31-card-can-stretch.png` — one single young child standing and stretching both arms straight up high, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
36. `ct-week31-card-can-float.png` — one single young child floating gently with arms out and feet off the ground, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

---

## Award badge (1) · `--ar 1:1`

37. `ct-week31-badge-star.png` — one single gold star badge with a soft ribbon underneath, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

---

# Week 32 · Space Exploration

**May 24–28** · five words: rocket · astronaut · up · down · blast off · page `/teachers-w32` · images land in `public/circle-time-images/week32/` · 37 files.

**Target folder on the Mac:** save chosen upscales as PNG into `~/Downloads/circle-time-mj/`, then convert to JPEG into `public/circle-time-images/week32/` (spec §4d).
Filenames below match the `src` attributes in `circle-time-week32.html` exactly. **37 files: 8 posters (3:4) · 28 cards (1:1) · 1 badge (1:1).**

Locked style suffix (spec §4c) is appended verbatim to every prompt; flags `--raw --stylize 50`.

---

## Posters — `--ar 3:4` (8)

**1. `ct-week32-poster-theme.png`**
```
a single tall red-and-white rocket lifting off towards a big pale cream moon, curling orange flame and soft white smoke beneath it, a few small stars in a deep dusky blue sky, cheerful and simple, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50
```

**2. `ct-week32-poster-rocket.png`**
```
one single tall rocket standing upright on the ground, red nose cone, white body, two blue fins, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50
```

**3. `ct-week32-poster-astronaut.png`**
```
one single smiling astronaut standing still, white puffy space suit, round glass helmet, big gloves and boots, arms relaxed at the sides, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50
```

**4. `ct-week32-poster-up.png`**
```
one single happy young child standing with both arms stretched straight up high above the head, looking upward, full body, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50
```

**5. `ct-week32-poster-down.png`**
```
one single happy young child crouching down very small on the floor with both hands flat on the ground, looking down, full body, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50
```

**6. `ct-week32-poster-blast-off.png`**
```
one single rocket the moment it lifts off the ground, a big billowing cloud of orange flame and pale smoke underneath it, the rocket tilted slightly upward, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50
```

**7. `ct-week32-poster-sentence-frames.png`**
```
two young children wearing simple paper-and-cardboard space helmets, standing side by side, both pointing up at the sky with one arm, looking up together, empty plain background above them, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50
```

**8. `ct-week32-poster-chorus.png`**
```
one young child sitting cross-legged playing a small wooden ukulele, a little cardboard toy rocket standing on the floor beside them, warm and cosy, centred, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50
```

## Cards — `--ar 1:1` (28)

**9. `ct-week32-card-rocket.png`**
```
one single rocket, red nose cone, white body, two blue fins, standing upright, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
```

**10. `ct-week32-card-astronaut.png`**
```
one single astronaut in a white space suit with a round glass helmet, standing facing forward, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
```

**11. `ct-week32-card-moon.png`**
```
one single round grey moon with a few soft craters, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
```

**12. `ct-week32-card-star.png`**
```
one single yellow five-pointed star, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
```

**13. `ct-week32-card-flag.png`**
```
one single small flag on a thin pole, plain red rectangular flag, planted upright, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
```

**14. `ct-week32-card-space-control.png`**
```
a rocket, an astronaut and a round grey moon arranged together in one simple group, the three space things side by side, centred, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
```

**15. `ct-week32-card-up.png`**
```
one single big upward-pointing arrow, thick and rounded, with one very small rocket beside its tip, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
```

**16. `ct-week32-card-down.png`**
```
one single big downward-pointing arrow, thick and rounded, with one small patch of green grass beside its tip, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
```

**17. `ct-week32-card-sun.png`**
```
one single round yellow sun with short simple rays, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
```

**18. `ct-week32-card-cloud.png`**
```
one single fluffy white cloud, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
```

**19. `ct-week32-card-bird.png`**
```
one single small bird flying with wings spread, side view, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
```

**20. `ct-week32-card-comet.png`**
```
one single comet, a round bright head with one long soft glowing tail, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
```

**21. `ct-week32-card-satellite.png`**
```
one single satellite, a small box body with two flat rectangular solar panels and a little dish, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
```

**22. `ct-week32-card-spaceship.png`**
```
one single rounded silver spaceship, a smooth saucer shape with a round dome on top, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
```

**23. `ct-week32-card-tree.png`**
```
one single green leafy tree with a brown trunk, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
```

**24. `ct-week32-card-house.png`**
```
one single small house with a triangular roof, one door and one window, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
```

**25. `ct-week32-card-flower.png`**
```
one single flower with a green stem and rounded pink petals, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
```

**26. `ct-week32-card-dog.png`**
```
one single small friendly dog standing, side view, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
```

**27. `ct-week32-card-car.png`**
```
one single small car, side view, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
```

**28. `ct-week32-card-ball.png`**
```
one single round striped ball resting on the ground, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
```

**29. `ct-week32-card-can-blast-off.png`**
```
one single young child jumping up off the ground with both arms stretched high above the head pressed together in a point like a rocket, full body, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
```

**30. `ct-week32-card-can-jump.png`**
```
one single young child jumping high with both feet off the ground and knees bent, full body, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
```

**31. `ct-week32-card-can-land.png`**
```
one single young child crouching down very low on the floor with knees bent and hands touching the ground, landing, full body, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
```

**32. `ct-week32-card-can-float.png`**
```
one single young child floating with both arms stretched out wide to the sides and toes pointed, body tilted, full body, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
```

**33. `ct-week32-card-can-walk.png`**
```
one single young child taking one big slow bouncy step forward, one knee lifted high, full body, side view, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
```

**34. `ct-week32-card-can-wave.png`**
```
one single young child waving one hand high in the air, smiling, full body, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
```

**35. `ct-week32-card-can-count.png`**
```
one single young child holding up one open hand showing five spread fingers, looking at the hand, upper body, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
```

**36. `ct-week32-card-can-plant-flag.png`**
```
one single young child pushing a small flag on a pole down into the ground with both hands, full body, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
```

## Award badge — `--ar 1:1` (1)

**37. `ct-week32-badge-star.png`**
```
one single gold five-pointed star badge with a soft rounded outline and a gentle glow, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
```

---

**Reminders (spec §4c):** cards must be hyper-literal and singular — one thing, centred, nothing else in frame. Always paste the full negative list. Do not raise `--stylize` above 50. Do NOT use the Dark Phonics pen-and-ink style.

---

# Week 33 · Dinosaurs

**May 31–Jun 4** · five words: dinosaur · big · teeth · roar · egg · page `/teachers-w33` · images land in `public/circle-time-images/week33/` · 37 files.

**Theme:** Dinosaurs! Big Feet, Big Teeth · **Week of May 31 – Jun 4** · 5 words: dinosaur · big · teeth · roar · egg

37 images: **8 posters** (`--ar 3:4`, save at 928×1232) · **28 cards** (`--ar 1:1`, save at 1000×1000) · **1 badge**.

Save each chosen upscale as PNG into `~/Downloads/circle-time-mj/` using **exactly** the filename in bold — the page's `<img src>` attributes are `/circle-time-images/week33/<same name>.jpg`, so a typo = a broken image. Convert PNG → JPEG with the `sips` loop in the build spec §4d.

Style suffix (locked — appended verbatim to every prompt below):
`, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame`

Flags: `--raw --stylize 50` on everything. **Do not raise stylize.** Cards must be hyper-literal and singular — one thing, centred, nothing else in frame.

---

## Posters — 8 · `--ar 3:4`

1. **ct-week33-poster-theme.png** — A huge friendly green dinosaur standing side on, and a tiny happy child standing beside its foot looking up at it, the size difference enormous and gentle, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50

2. **ct-week33-poster-dinosaur.png** — One friendly long-necked dinosaur standing side on, whole body in frame from nose to tail tip, calm and smiling, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50

3. **ct-week33-poster-big.png** — An enormous dinosaur towering over one tiny child who stands with both arms stretched as wide as they go, showing how big the dinosaur is, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50

4. **ct-week33-poster-teeth.png** — A friendly dinosaur head with its mouth wide open showing a row of big pointed white teeth, not scary, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50

5. **ct-week33-poster-roar.png** — One dinosaur with its head thrown back roaring joyfully at the sky, mouth wide open, eyes happy, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50

6. **ct-week33-poster-egg.png** — One large speckled dinosaur egg sitting in a round nest of twigs, soft and warm, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50

7. **ct-week33-poster-sentence-frames.png** — Two young children standing together pointing up at a big friendly dinosaur, mouths open as if talking about it, delighted, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50

8. **ct-week33-poster-chorus.png** — A child sitting playing a small ukulele while a friendly dinosaur stomps along beside them with one big foot raised, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50

---

## 3-part cards — 6 · `--ar 1:1`

9. **ct-week33-card-t-rex.png** — One single Tyrannosaurus rex standing side on, whole body centred, small arms and a big head, friendly not scary, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

10. **ct-week33-card-triceratops.png** — One single triceratops standing side on with three clear horns and a wide neck frill, whole body centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

11. **ct-week33-card-stegosaurus.png** — One single stegosaurus standing side on with a row of large plates along its back and a spiked tail, whole body centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

12. **ct-week33-card-egg.png** — One single speckled dinosaur egg, upright, centred, nothing else in frame, no nest, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

13. **ct-week33-card-tooth.png** — One single large pointed dinosaur tooth, creamy white, standing upright and centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

14. **ct-week33-card-dinosaurs-control.png** — A small group of four friendly dinosaurs of different shapes standing together in a row facing forward, whole bodies visible, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

---

## Sorting-sign images — 2 · `--ar 1:1`
*(These two are used full-page as the Leaf Eater / Meat Eater signs, pages 12–13.)*

15. **ct-week33-card-leaf-eater.png** — One single long-necked dinosaur reaching up and munching green leaves from a small tree, side on, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

16. **ct-week33-card-meat-eater.png** — One single sharp-toothed dinosaur with its mouth wide open showing pointed teeth, side on, centred, friendly not frightening, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

---

## Sorting cards — 12 · `--ar 1:1`
*(Four flat-toothed leaf eaters, four sharp-toothed meat eaters, plus leaves / flat tooth / bone / sharp tooth.)*

17. **ct-week33-card-brachiosaurus.png** — One single brachiosaurus standing side on with a very long neck held high and a small head, whole body centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

18. **ct-week33-card-diplodocus.png** — One single diplodocus standing side on with a long horizontal neck and a very long thin tail, whole body centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

19. **ct-week33-card-ankylosaurus.png** — One single ankylosaurus standing side on, low and wide with an armoured plated back and a round club on the end of its tail, whole body centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

20. **ct-week33-card-parasaurolophus.png** — One single parasaurolophus standing side on with a long curved crest sweeping back from its head, whole body centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

21. **ct-week33-card-leaf.png** — One single green leafy branch with a few broad soft leaves, lying centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

22. **ct-week33-card-flat-tooth.png** — One single flat blunt square grinding tooth, creamy white, upright and centred, obviously flat-topped, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

23. **ct-week33-card-velociraptor.png** — One single velociraptor standing side on, slim and upright with one large curved claw on each foot, whole body centred, friendly not scary, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

24. **ct-week33-card-spinosaurus.png** — One single spinosaurus standing side on with a tall rounded sail along its back and a long narrow snout, whole body centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

25. **ct-week33-card-allosaurus.png** — One single allosaurus standing side on with an open toothy mouth and two short arms, whole body centred, friendly not frightening, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

26. **ct-week33-card-carnotaurus.png** — One single carnotaurus standing side on with two short blunt horns above its eyes and very tiny arms, whole body centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

27. **ct-week33-card-bone.png** — One single clean white bone shaped like a simple dog bone, lying centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

28. **ct-week33-card-sharp-tooth.png** — One single sharp pointed dagger-shaped tooth, creamy white, upright and centred, obviously pointed at the tip, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

---

## "I can ___!" action cards — 8 · `--ar 1:1`
*(One child, doing one action, whole body, centred.)*

29. **ct-week33-card-can-roar.png** — One young child standing and roaring with their mouth wide open and both hands raised like dinosaur claws, whole body centred, joyful, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

30. **ct-week33-card-can-stomp.png** — One young child stomping with one big foot raised high and flat, arms out for balance, whole body centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

31. **ct-week33-card-can-dig.png** — One young child kneeling and digging in a small tub of sand with a spoon, whole body centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

32. **ct-week33-card-can-hatch.png** — One young child crouched down curled up small with both hands over their head like a hatching egg, whole body centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

33. **ct-week33-card-can-swish.png** — One young child looking over their shoulder and swishing a pretend dinosaur tail behind them with one hand, whole body centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

34. **ct-week33-card-can-munch.png** — One young child munching a big green leaf held in both hands, cheeks full, whole body centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

35. **ct-week33-card-can-tiptoe.png** — One young child tiptoeing quietly up on their toes with both arms held in close, whole body centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

36. **ct-week33-card-can-stretch.png** — One young child stretching their neck and both arms up as tall as they can, chin lifted, like a long-necked dinosaur, whole body centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

---

## Award badge — 1 · `--ar 1:1`

37. **ct-week33-badge-star.png** — One single gold five-pointed star badge with a small three-toed dinosaur footprint in the middle of it, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

---

### Checklist after the run
- 37 PNGs in `~/Downloads/circle-time-mj/`, every filename exactly as bolded above.
- Convert to JPEG into `public/circle-time-images/week33/` (spec §4d `sips` loop); `ls | wc -l` → **37**.
- Target folder size ≈ 2–5 MB.
- The page ships fine before the art lands — every `<img>` already falls back to an emoji.

---

# Week 34 · Fossils + May review

**Jun 7–11** · five words: fossil · bone · dig · rock · old · page `/teachers-w34` · images land in `public/circle-time-images/week34/` · 37 files.

Style suffix is LOCKED (spec §4c) and appended verbatim to every prompt. Posters `--ar 3:4`, cards `--ar 1:1`, all `--raw --stylize 50`.
Save chosen upscales as PNG into `~/Downloads/circle-time-mj/` using the exact target filename (`.png`), then convert to `.jpg` into `public/circle-time-images/week34/`. **37 files.**

## Posters — 8 files, portrait 928×1232 (`--ar 3:4`)
1. `ct-week34-poster-theme.png` — a young child kneeling on sand, gently brushing a spiral fossil out of a big grey rock with a soft paintbrush, warm sunlight, joyful and calm, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50
2. `ct-week34-poster-fossil.png` — a spiral ammonite fossil set into a big grey rock, the coiled shell shape clearly visible in the stone, centred, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50
3. `ct-week34-poster-bone.png` — one single large smooth white dinosaur leg bone lying on plain ground, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50
4. `ct-week34-poster-dig.png` — a young child kneeling in golden sand, digging with a small metal trowel, a little pile of sand beside them, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50
5. `ct-week34-poster-rock.png` — one single large rounded grey rock, plain and solid, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50
6. `ct-week34-poster-old.png` — a very old museum dinosaur skeleton standing tall and complete, side view, warm dusty tones, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50
7. `ct-week34-poster-sentence-frames.png` — two young children kneeling together in sand, both holding up one fossil between them, looking at each other and talking happily, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50
8. `ct-week34-poster-chorus.png` — a young child sitting cross-legged playing a small ukulele beside a shallow sandy dig with a white bone showing in it, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 3:4 --raw --stylize 50

## Cards — 28 files, square 1000×1000 (`--ar 1:1`)
*Hyper-literal and singular: one thing, centred, nothing else in frame. A 3-year-old must be able to match it.*

### Fossil 3-part card set (pages 10–11) + control card
9. `ct-week34-card-fossil.png` — one single spiral fossil embedded in a small grey rock, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
10. `ct-week34-card-bone.png` — one single smooth white bone, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
11. `ct-week34-card-shell.png` — one single sea shell, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
12. `ct-week34-card-rock.png` — one single grey rock, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
13. `ct-week34-card-dig.png` — one single small metal trowel digging into a small mound of sand, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
14. `ct-week34-card-fossils-control.png` — a small tidy fossil dig: a sandy patch with a spiral fossil, a white bone and a shell partly uncovered, and a soft brush laid beside them, centred, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

### Old / New sorting set (pages 12–14) — 6 OLD, 6 NEW
15. `ct-week34-card-old.png` — one dinosaur skeleton buried in layers of striped rock, seen from the side, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
16. `ct-week34-card-new.png` — one single small brown bird standing on one fresh green leaf, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
17. `ct-week34-card-dino-bone.png` — one single very large dinosaur leg bone, thick and heavy, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
18. `ct-week34-card-ammonite.png` — one single spiral ammonite fossil, the coil clearly visible, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
19. `ct-week34-card-dino-tooth.png` — one single large pointed dinosaur tooth, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
20. `ct-week34-card-fern-fossil.png` — one single flat stone with the print of a fern leaf pressed into it, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
21. `ct-week34-card-old-rock.png` — one single cracked grey rock with visible layers, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
22. `ct-week34-card-skeleton.png` — one single museum dinosaur skeleton standing up on its legs, whole body, side view, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
23. `ct-week34-card-toy-dino.png` — one single bright green plastic toy dinosaur, shiny and obviously new, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
24. `ct-week34-card-feather.png` — one single soft feather, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
25. `ct-week34-card-bird.png` — one single small brown bird standing, side view, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
26. `ct-week34-card-leaf.png` — one single fresh green leaf, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
27. `ct-week34-card-shoe.png` — one single small child's shoe, side view, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
28. `ct-week34-card-apple.png` — one single red apple, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

### “I can ___!” action cards (page 15)
29. `ct-week34-card-can-dig.png` — one young child kneeling and digging in sand with a small trowel, whole child visible, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
30. `ct-week34-card-can-brush.png` — one young child brushing sand off a white bone with a soft paintbrush, whole child visible, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
31. `ct-week34-card-can-find.png` — one young child holding a spiral fossil up high in both hands, delighted, whole child visible, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
32. `ct-week34-card-can-press.png` — one young child pressing a sea shell into a flat disc of clay with both thumbs, whole child visible, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
33. `ct-week34-card-can-lift.png` — one young child lifting a big grey rock with both hands, knees bent, whole child visible, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
34. `ct-week34-card-can-look.png` — one young child looking through a round magnifying glass, whole child visible, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
35. `ct-week34-card-can-carry.png` — one young child carrying a small wooden tray of white bones carefully with both hands, whole child visible, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50
36. `ct-week34-card-can-roar.png` — one young child roaring with mouth wide open and both hands up like dinosaur claws, whole child visible, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

## Award badge — 1 file (`--ar 1:1`)
37. `ct-week34-badge-star.png` — one single gold star badge with a soft ribbon, centred, nothing else in frame, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame --ar 1:1 --raw --stylize 50

**Total: 37 prompts / 37 files.**
