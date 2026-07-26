# HANDOFF — Picture Bank Overnight Generation Run (Jul 25)

## Read this first, then start

This is a pickup document for a fresh Claude session with no memory of prior work. It assumes you know nothing about this project beyond what is written here. Follow it literally.

**Goal.** Generate 127 missing or replacement photographs for the Montessori Picture Bank, judge each one properly, file them through the sanctioned script, and publish them to the live bucket.

## The one rule that has already been got wrong twice

The picture bank is **photoreal studio photographs of ONE holdable object on a PLAIN WHITE background**, saved at `docs/picture-bank/photos/<word>/<word>.jpg`. That is the entire visual spec. Nothing else.

There are three other picture sets in this repository. None of them is the picture bank, and none of them may be used, copied, or imitated when building it:

- `~/Desktop/English Curriculum 2026/Week NN/images/` — subjects spotlit on a deep forest-green background. This is the **Dark Phonics** look, used for a different curriculum track. Wrong for shelf work.
- `phonics-images/satpin-v2/` — googly-eyed storybook characters. Also Dark Phonics, used for circle-time. Wrong.
- `phonics-images/alphabet-v1/plates/` — hand-drawn illustrations, not photographs at all. Wrong.

The rule is stated at source in `docs/picture-bank/HANDOFF_PICTURE_BANK_Jul23.md` as "two tracks, never mix." A pack built from the wrong track was generated once already and was rejected by the user for exactly this reason. Do not repeat that mistake. If you are ever unsure which track an image belongs to, ask: is the background plain white, and is it a real photograph of one everyday object? If either answer is no, it is not picture-bank material.

## The work list

The 127 prompts to run are written out in full, one by one, with the exact filename to save each result as, in `docs/picture-bank/MJ-BATCH-OVERNIGHT.md`. Read that file before doing anything else — it is the actual script for this run.

There is also a machine-readable twin of the same list, `docs/picture-bank/GENERATION-QUEUE.json`, with keys `counts` (`regenerate: 19`, `new: 108`, `total: 127`, `aliases: 7`), `aliases`, and `queue` (the 127 entries). Use it if you want to script anything; the Markdown file is the one with the actual prompt text.

Of the 127: **19 are marked "REPLACE existing"** — the current photo already in the bank for that word is defective and must be swapped out. **108 are marked "new"** — there is currently no photo at all for that word.

## Why the 19 replacements exist

Recognising a bad render matters, so here is what went wrong the first time. The original prompt pack used a single template with only the noun swapped in — literally "a single real snake," "a single real yoyo," and so on — with no disambiguation of species, material, or colour. Midjourney duly produced things that technically matched the words but were unusable:

- `snake` came back as an albino, near-white snake (a garden snake is what a child would recognise).
- `jewel` came back as a crumpled piece of foil.
- `pin` came back as a bowling pin, not a sewing/safety pin.
- `fin` came back as an abstract black shape.
- `astronaut` came back as a metallic blob.
- `yoyo` came back as an unreadable green blob.
- `eel` came back with two eels in frame instead of one.
- `moon` was rendered on pure black (not the picture-bank white).
- `sun` was rendered on blue (also not white).

The new prompts in `MJ-BATCH-OVERNIGHT.md` fix this by naming the exact species, material, and colour for every ambiguous word, and by adding targeted `--no` negatives to steer Midjourney away from the specific failure it produced last time. This approach is verified working: the new `snake` prompt produced correct green-brown garden snakes on the first attempt.

## How to generate the images

Generation happens on Midjourney's web app at `https://www.midjourney.com/imagine`, driven through the user's own Chrome browser using the `mcp__claude-in-chrome__*` tools (load them via ToolSearch first if they are not already loaded).

Steps:

1. Call `mcp__claude-in-chrome__tabs_context_mcp` with `createIfEmpty: true`.
2. If it reports more than one connected browser, you must stop and ask the user which one to use — use `AskUserQuestion`, do not guess — then call `select_browser` with their answer.
3. **The user has two Chrome browsers and only one of them is logged into Midjourney.** If the page shows "Log in to start creating," you are in the wrong browser — switch to the other one.
4. To submit a prompt: click the prompt box (it sits at roughly screen position 640, 48), type the prompt text, then press Return.
5. Use `browser_batch` to submit several prompts in a single call rather than one at a time — it is much faster.
6. Midjourney queues jobs and returns 4 candidate images per job once it completes.

## Judgement required on every single image — this is the actual job

Generating the images is the easy part. The hard part, and the reason this run needs a capable model rather than a script, is judging what comes back. For every one of the 4 images returned per prompt, ask all of the following:

- Is this a real photograph, or does it look like a CGI render, a clay/plastic render, or an illustration?
- Is there exactly ONE object in frame?
- Is the background plain white (not grey, not textured, not coloured)?
- Is the subject actually the right thing? (A garden snake, not an albino one. A safety/sewing pin, not a bowling pin. Etc. — check against the specific word and, where the prompt calls one out, the specific species/material/colour.)
- Would a three- or four-year-old child correctly name this object on sight, with no hint?

**Reject and re-prompt rather than accepting something plausible-but-wrong.** Do not accept an image merely because it is well-rendered or pretty — a beautiful picture of the wrong object is still wrong. If none of the 4 candidates pass, re-submit the prompt (adjust the negatives if you can see what went wrong) rather than settling.

## How to file finished images — the ONLY sanctioned route

Do not copy files into `docs/picture-bank/photos/` by hand under any circumstances. The process is:

1. Download each chosen image (Midjourney downloads land in `~/Downloads`, see traps below).
2. Save/rename each one as `<word>.png` — exactly as specified in `MJ-BATCH-OVERNIGHT.md` for that item: lower case, no other suffix or prefix — with all of them together in one folder.
3. Run:

       node scripts/curriculum/picture-bank-add.mjs --sweep <folder> --force

   This converts each image to JPEG at quality 92 and files it to `docs/picture-bank/photos/<word>/<word>.jpg`. If a photo already exists for that word (one of the 19 replacements), the script keeps the original rather than silently destroying it, renaming it to `<word>.replaced-<ms>.jpg`. The script also actively **refuses** any image that is not white-background, not clearly visible against white, or under 840px on its long edge — treat a refusal as a real defect to fix, not an obstacle to route around.
4. Check the result:

       node scripts/curriculum/picture-bank-add.mjs --audit

5. Once satisfied, publish:

       node --env-file=.env.local scripts/curriculum/picture-bank-add.mjs --publish

   This uploads every photo to the Supabase storage bucket `dark-phonics`, under the path `picture-bank/<word>.jpg` — this is the exact path the live media packs already read from, so nothing else needs to change for the app to pick up new photos.

## Known environment traps — read before you hit them

1. **The Chrome/device bridge drops repeatedly.** On failure, re-call `tabs_context_mcp` (or `RefreshMcpTools`) and resume from where you were. Do not restart the whole run from scratch.
2. **`device_bash` runs in a Linux VM on the user's machine and has no network access.** `~/Downloads` and the montree repo folder are mounted into it, but you cannot fetch anything from the internet through it.
3. **Midjourney downloads land in `~/Downloads`**, which is already granted to this session — you do not need to request access again.
4. **The staged-uploads mount can serve stale copies.** If a file you just wrote appears unchanged under `/mnt/user-data/uploads/...`, do not trust it — re-stage it under a new path instead of assuming the old path will pick up the change.
5. **`device_bash` cannot delete files.** If you need something out of the way, `mv` it into a `_to_delete/` folder instead of trying to remove it.
6. **This is the same Midjourney account the user works in.** Do not cancel, clear, or otherwise interfere with jobs you did not submit.

## Order of work

Do the **19 replacements first** — they are fixing defects on photo cards that may already be printed and in use. Then work through the **108 new** words. Within the new words, prioritise ones used earliest and most often in the curriculum — `potato` appears in all 58 curriculum weeks, `mat` in four — so those unlock the most downstream material before anything else.

## Already submitted in a previous session

`snake`, `potato`, and `mat` prompts were already submitted to Midjourney in the prior session. Check the Midjourney feed for these before re-submitting — they may already be sitting there waiting to be judged and filed.

## Words that need no new photo at all

Seven of the "missing" words are just plural/alias forms of a word already in the bank, and should be pointed at the existing photo rather than regenerated:

    axe -> ax
    boxes -> box
    bunny -> rabbit
    fishes -> fish
    grape -> grapes
    mice -> mouse
    socks -> sock

## Out of scope for this run

181 curriculum words were triaged separately as not photographable as holdable objects (examples: "this," "then," "joy," "running," "up," "celebration"), and nine curriculum weeks — `/th/`, `/l-blends/`, `/u_e/`, `/ce/`, `/igh/`, `/oi/`, `/y/`, `/ing/`, `/tion/` — were flagged as needing a different card treatment entirely rather than a photo. Both of those are separate design decisions for someone else to make later. Do not attempt to solve them in this run.

## Verification before declaring the run done

Before telling the user this is finished:

1. Run `node scripts/curriculum/picture-bank-add.mjs --audit` and report what it says — specifically how many of the bank's photos pass the script's measurable checks.
2. Build a contact sheet of the newly-added photos using Python/PIL (a simple grid of thumbnails with filenames) and actually look at it yourself before reporting anything as done.
3. Report honestly which words, if any, are still outstanding at the end of the run. Do not round up to "all done" if some prompts never produced an acceptable image.
