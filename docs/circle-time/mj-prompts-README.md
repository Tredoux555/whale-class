# Midjourney prompt pack — how every circle-time week's art gets made

One page. Everything you need to turn `docs/circle-time/mj-prompts-week<NN>.md`
into 37 JPEGs in `public/circle-time-images/week<NN>/`.

Proven on weeks 1, 2 (74 images shipped) and written up from the week-2 build
diary, `docs/circle-time/HANDOFF-week2-my-body.md` §6–10.
Build context for the pages themselves: `docs/circle-time/WEEK_BUILD_SPEC.md` §9.

---

## 1. The locked style string

Subject description first, then **this suffix, verbatim, on every single prompt**:

```
, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame
```

Do not paraphrase it, do not shorten it, do not "improve" it. Every week of the
year has to look like the same book. The negative list is not optional — MJ
hallucinates stray lettering into children's art constantly.

**This is NOT the Dark Phonics style.** Dark Phonics is pen-and-ink (see
`CLAUDE.md`); circle time is soft gouache. Different system, never mix them.

## 2. Flags

| | |
|---|---|
| always | `--raw --stylize 50 --v 8.2` |
| posters | `--ar 3:4` |
| cards + badge | `--ar 1:1` |

`--stylize 50` keeps MJ literal. **Never raise it** — higher stylize makes
prettier pictures that a three-year-old can no longer name, which defeats the
whole point of a three-part card.

## 3. Counts and shapes — 37 per week, always

| n | kind | aspect | save as |
|---|---|---|---|
| 8 | posters — `theme`, the 5 word posters, `sentence-frames`, `chorus` | `--ar 3:4` | 928×1232 |
| 28 | cards — the 3-part-card set, the sorting set, 8 `can-*` action cards, the whole-theme `*-control` card | `--ar 1:1` | 1000×1000 |
| 1 | `badge-star` award badge | `--ar 1:1` | 1000×1000 |

## 4. Filename convention

```
ct-week<NN>-poster-<word>.jpg
ct-week<NN>-card-<word>.jpg
ct-week<NN>-card-can-<verb>.jpg
ct-week<NN>-card-<theme>-control.jpg
ct-week<NN>-badge-star.jpg
```

Lower-case, hyphens only, no underscores, no spaces.
`src` in the HTML is `/circle-time-images/week<NN>/<file>.jpg`.

**`<NN>` is the sheet week number**, with two legacy exceptions that use the old
site numbering: sheet week 3 uses `week1/ct-week1-*`, sheet week 4 uses
`week2/ct-week2-*`. Everything from sheet week 5 on matches.

**The prompt-file filenames must equal the HTML `src` set exactly** (`.png` in the
prompt file, `.jpg` on disk). `scripts/circle-time/check_week.py <NN>` enforces
this — run it the moment the prompt file is written, before generating anything.

## 5. Writing prompts that work

- **Cards are hyper-literal and singular.** End every card prompt with
  `centred, nothing else in frame`. A card showing a *scene* cannot be matched
  to a word by a 3-year-old — it has to be one object on a plain ground.
- **Posters may hold a small scene** (a child, an action) — that is what the
  poster is for.
- **The `*-control` card is the one deliberate exception**: it holds all five
  set items in one calm arrangement, because it is the control of error.
- Keep subjects to things the class can also meet as a real object in the
  Magic Box or on a shelf tray.

## 6. Submitting — Control_Chrome, one tab, one prompt per 30 s

The Chrome extension **blocks navigating to `midjourney.com`**, so you cannot
`open_url` your way there. Tredoux keeps an authenticated
`https://www.midjourney.com/imagine` tab open; you drive that tab.

1. `mcp__remote-devices__Control_Chrome__list_tabs` → find the imagine tab.
2. Pass that **explicit `tab_id`** to every `execute_javascript` call. Never
   "current tab" — his foreground tab moves under you and you will type a
   Midjourney prompt into something else.
3. Submit:

```js
(() => {
  const PROMPT = "PASTE ONE FULL PROMPT LINE HERE INCLUDING THE FLAGS";
  const ta = document.querySelector('#desktop_input_bar');
  if (!ta) return 'NO INPUT BAR';
  // React-controlled: a plain ta.value = ... is ignored. Use the native setter.
  const set = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype, 'value').set;
  set.call(ta, PROMPT);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  // The Submit button has no aria-label — match on its text.
  const btn = [...ta.closest('form, div').parentElement
                 .querySelectorAll('button')]
              .find(b => b.textContent.trim() === 'Submit');
  if (!btn) return 'NO SUBMIT BUTTON';
  btn.click();
  return 'SUBMITTED: ' + PROMPT.slice(0, 60);
})();
```

4. **Wait 30 seconds between submissions.** Faster trips a "Temporarily
   Blocked" account timeout that lasts about an hour, and you lose far more
   time than you saved.
5. Before each next submit, read the feed for a block banner or a moderation
   warning. **A submission that produces no job after ~3 tries is a silent
   block, not a network blip** — stop and check the banner rather than
   retrying into a longer timeout.

## 7. Moderation rewording

MJ's AI Moderator flags bare body-part wording even in obviously cartoon
prompts (5 of 38 week-2 prompts were flagged; all cleared on reword):

- drop the word **"bare"** entirely;
- add `flat cartoon illustration, children's book art, no photo-realism`;
- for an organ or body part that reads as a character, say so explicitly:
  `no face, no arms, no legs`;
- keep children generic and clothed: "one small child", never an age, a body
  description, or anything about skin.

Reword and resubmit; do not argue with it and do not try near-synonyms of the
flagged word.

## 8. Picking the winner from a grid

Each job returns a 2×2. Against a fixed checklist, in this order:

1. literal subject match — is it *the word*, unmistakably?
2. no text, letters, numbers or watermark anywhere;
3. one clear subject, plain cream/off-white ground;
4. big simple shapes that survive being printed at card size;
5. correct action / correct body part, no extra limbs, no distortion.

Pretty loses to legible every time.

## 9. Download + convert

Downloading is the fragile step. Two working routes:

**A — `fetch()` from inside the authenticated tab (most reliable).** `curl` from
the Mac to `cdn.midjourney.com` hits a Cloudflare JS challenge; a fetch from
inside the tab rides that tab's own cookies.

```js
(async () => {
  const url  = 'https://cdn.midjourney.com/<jobId>/0_<q>.png';
  const name = 'ct-week<NN>-<slug>.png';
  const r = await fetch(url);
  const b = await r.blob();
  if (b.size < 100000) return 'TOO SMALL (' + b.size + ') — Cloudflare page, retry';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  return 'OK ' + name + ' ' + b.size;
})();
```

**One file per tool call.** Batching three in one call silently dropped items
and once saved a 6 KB Cloudflare challenge page under a real filename — hence
the `< 100000` size guard.

Chrome saves to `~/Downloads/`. Move them into
`~/Downloads/circle-time-mj-week<NN>/` under the exact prompt-file names.

**B — `curl` on the Mac.** Sometimes works from his IP:
```bash
mkdir -p ~/Downloads/circle-time-mj-week<NN>
curl -fL "https://cdn.midjourney.com/<jobId>/0_<q>.png" \
     -o ~/Downloads/circle-time-mj-week<NN>/ct-week<NN>-<slug>.png
```
Check the byte size after every file. Under 100 KB = a challenge page, not art.

**Convert + place** (macOS `sips`, so this runs on the Mac):

```bash
cd "/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree"
scripts/circle-time/mj_convert.sh <NN>
```

It converts every referenced PNG to JPEG q80 into
`public/circle-time-images/week<NN>/`, skips filenames the page never asks for,
and prints the exact list of still-missing files so you know which prompts to
re-run. `--dry` reports without converting. Target folder size ≈2–5 MB
(week 1: 4.8 MB, week 2: 2.1 MB).

**Nothing to wire.** The page's `<img src>` list already points at these paths
from the build step, and every `<img>` carries
`onerror="imgFallback(this,'<emoji>')"` — which is why a week ships and is
usable in class before any art exists. Each missing picture renders as its emoji.

## 10. Verify, then commit

```bash
python3 scripts/circle-time/check_week.py <NN>      # must print PASS
```
Then, **through Desktop Commander `start_process`** (the remote-devices bridge
shell cannot write `.git/index.lock`), and **only these paths** — the working
tree carries ~65 unrelated dirty files, so `git add -A` is forbidden:

```bash
cd "/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree"
git add public/circle-time-images/week<NN>
git commit -m "circle-time week <NN>: Midjourney artwork (37 images)"
git push origin main
```

Railway auto-deploys from `main`. Verify live before calling it done:

```bash
curl -sI https://www.teacherpotato.xyz/circle-time-images/week<NN>/ct-week<NN>-poster-theme.jpg \
  | head -3
```

Binary files move Mac↔container via `device_commit_files` **only** — never
base64 through the conversation, and always re-check `sha256` on the Mac after
a transfer. The file bridge has silently corrupted and staled transfers before.
