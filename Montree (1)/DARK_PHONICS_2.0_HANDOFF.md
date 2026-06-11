# Dark Phonics 2.0 — Session Handoff (2026-06-09)

Quick-start for the next session. The full source of truth is **`DARK_PHONICS_2.0.md`** (same folder) — read it for everything. This is just "where we are + what's next."

## Where we are
- **Songs + books A–P: DONE** (full lyrics + 5-page books + covers, all in the manifesto). Bright pen-and-ink style.
- **Q: in progress** — song lyrics, reader (5 pages), and duck character-ref prompt are all written in the manifesto's Q section. Awaiting the founder to (1) generate the Q song in Suno, (2) generate the duck in MJ **V7**, then send the duck image to host.

## Two big decisions locked TODAY (apply going forward)
1. **STREAMLINED SCOPE (Q onward):** per letter do ONLY — (a) one **hosted character** (the letter's star), (b) the **reader** (~5 picture-book pages). Cards/posters/sorting/sentence-matching are **PAUSED** (still specced in manifesto). **Order: SONG first → then graphics.**
2. **DARK STYLE (Q onward):** darker, *Creepy Carrots!* mood — desaturated greys + dramatic noir shadows + ONE bold spot colour, spooky-but-playful (original, don't copy that book). Exact style string is in the manifesto's STREAMLINED SCOPE section. A–P stay bright; Q+ is dark.

## Character consistency — the workflow that works
- Use **Omni Reference: `--oref <hosted-url> --ow 200`** on **Midjourney V7, Relax mode**.
- `--oref` replaced `--cref`; **V8.1 rejects `--ow`** — must be V7. Omni = 2× GPU, no Fast/Draft.
- **One locked character per book** (MJ allows one `--oref` at a time) — this is why streamlined readers star one animal.
- **Hosting a character:** drop its PNG in repo `public/phonics-characters/<name>.png` → `git push` (Railway auto-deploys) → live at `montree.xyz/phonics-characters/<name>.png`.
- Already hosted: **Mo** (the recurring kid) at `montree.xyz/phonics-characters/mo.png`.

## Immediate next action
When the founder sends the **duck** image: save to `public/phonics-characters/duck.png`, push, then hand back the 5 Q reader prompts with `--oref https://montree.xyz/phonics-characters/duck.png --ow 200` baked in (V7). Then move to **R**.

## Founder context / spend
- Midjourney plan = **Basic** ($10 tier): ~200 image jobs/mo, 3h20m fast hours, **no Relax mode**, refreshes Jul 2 2026. V7 Omni burns fast hours at 2× with no relax cushion → Basic is tight for the full A–Z. Standard (~$30, unlimited Relax) is the sustainable upgrade if committing to all 26. (Founder deciding.)

## Standing rules
- **Audit every task on completion** (not just commits).
- Songs are #1 priority; the reader mirrors the song.
- Sound accuracy is make-or-break — see the manifesto's THE METHOD (stop consonants never "buh", spell vowels phonetically, liquids → "la", etc.).
