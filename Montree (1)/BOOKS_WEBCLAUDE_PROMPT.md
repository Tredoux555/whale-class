# Kickoff prompt — Pink Readers art (paste into Claude in Chrome)

> Use **Claude in Chrome**. Midjourney needs a **paid subscription** + login (no free tier) — that's your first human step. The decodable text + every image prompt already exist on the source page; the agent runs the prompts, you pick/upscale/download and assemble in Canva.

## The consistency rule (most important — read first)

The same child (**Sam**) and the **tabby cat** must look identical on every page of every book. Midjourney does this with references:

1. **Generate Book 1 → PAGE 1 first** (it introduces Sam + the cat). Also do the **Cover** cat.
2. You pick the keeper, copy its image URL, and use it as a **character reference** on every later page: add `--cref <that-image-url>` to the prompt.
3. Lock the visual style across all books with a **style reference**: pick a `--sref` seed (any number, e.g. `--sref 1234`) and reuse the same one on every single image.
4. So every prompt after the first = `Image prompt text --cref <Sam+cat URL> --sref 1234 --ar 4:3`.

---

Paste from here down into Claude in Chrome:

You're helping me illustrate a set of decodable children's books in Midjourney. All the text and image prompts are on one public page; you read them there and run them through Midjourney, page by page, top to bottom. I (the human) handle login, picking/upscaling, downloads, and Canva assembly.

**Source page:** open `https://montree.xyz/pink-readers.html` and keep it open. It has 15 books (Book 1 "Cat Can Nap" first). Each book is a Cover + numbered pages. Each page shows: **Text** (goes in the book, not the image), an **Art brief**, an **Image prompt** (this is what you paste into Midjourney), and **Composition** notes (for layout later).

**Midjourney steps, per page:**
1. Go to midjourney.com and open the create/imagine bar.
2. Paste the page's **Image prompt** text.
3. Append the consistency flags: ` --ar 4:3 --sref 1234` (same `--sref` every time). For every page after Book 1 Page 1, also append ` --cref <URL of the approved Sam+cat image>`.
4. Submit (Imagine). Then STOP and tell me: "Book N, Page M generated — pick the best of the four, upscale it, download it, name it `Book01-Page01`." Wait for me to say "next."

**Work order:** Book 1 first — do its **Page 1 and Cover before anything else** so we lock Sam + the cat. Then Book 1 pages 2→end, then Book 2, and so on through Book 15. Always tell me which book/page you just did and which is next.

**Stop and hand to me when:**
- Midjourney needs login or a subscription/paywall appears.
- Book 1 Page 1 is done — I approve Sam + the cat and give you the `--cref` URL before you continue.
- After every image — I pick, upscale, and download (don't guess my taste).
- Anything differs from these steps — ask, don't guess.

**Rules:** never change the Image prompt wording — use it exactly as written, only adding the `--ar/--sref/--cref` flags. Keep `--sref` identical across all 15 books so they're one visual family. The **Text** and **Composition** notes are NOT for Midjourney — they're for Canva later.

Start now: open both tabs, confirm you can see Book 1 Page 1's Image prompt, then ask me to log in to Midjourney.

---

## After a book's images are done — Canva (mostly you)

For each finished book, in Canva: new design (e.g. 4:3 or square), one page per book page. Drop the Midjourney image, add the **Text** line using the **Andika** font in lowercase (the Composition notes say where — usually a clean band along the bottom). Keep it uncluttered. Export as PDF. I can walk you through the first one in Chrome if you want.
