# PLAN — Dark Phonics Easy Readers: render + compose (PINNED Jul 18, 2026 for laptop migration)

**Status: PINNED mid-flight.** Tredoux is migrating M1 → M2 MacBook Pro. Everything needed to resume
is in this doc + the manifest. Resume prompt at the bottom.

## What this is
Finish the 11 **Dark Phonics Easy Readers** (decodable 5-page books, montree.xyz/dark-phonics-readers.html):
render all illustrations in Midjourney in the TRUE Dark Phonics style, Tredoux picks favorites,
compose printable PDF books, file to disk + publish on the site.

## 🎨 THE LOCKED STYLE (Tredoux-approved Jul 18 — do NOT re-litigate)
The readers page's original prompts carried a WRONG generic style block ("Flat modern… cel-shading")
and a **placeholder `--sref 9999`**. The real Dark Phonics style, verbatim from Tredoux's own MJ job
(the "Mo popcorn letter p" render, midjourney.com/jobs/27454da2-f5a1-49bb-b65b-9076eb278fe1):

> **colored hand-drawn pen-and-ink, fine crosshatch, whimsical Dr. Seuss children's-book style,
> big googly eyes, plain white background**

- Style lives in the PROMPT TEXT — the original jobs used **no --sref**. `--sref 9999` is stripped everywhere.
- Fallback style anchors if prompt-only drifts: the published lesson art at
  `https://montree.xyz/api/montree/media/proxy/pictures/lesson-NN.png?bucket=dark-phonics` (05–31) as `--sref`.
- Reference finals on disk: `~/Desktop/English Curriculum 2026/Dark Phonics/lesson-{05,17,31}.png`
  (snake-in-sock / frazzled chicken / scraggly duck — that's the look).

## 📋 THE MANIFEST (single source of truth for prompts)
`lib/montree/english-curriculum/spec/easy-readers-manifest-v2.json` — 11 readers × (character sheet +
cover + 5 pages) with the corrected style block already applied. Page text lines included per page.
Readers: the-cat-sat (L17) · mud-pup (L19) · hen-in-bed (L22) · fox-in-a-box (L28) · cat-cot-cut (L40) ·
the-bell-fell (L41) · fish-and-chick (L43) · this-and-that (L46) · jump-in-the-sand (L48) ·
frog-and-crab (L51) · big-splash (L53). Total: 66 story images + 11 optional character sheets.

## ✅ Ground truth established Jul 18
- **Disk scout (Sonnet, complete): 0/66 reader images exist anywhere on disk.** Everything matching
  reader keywords is from OTHER projects (58-week curriculum vocab cards, old Pink Readers .md decoys —
  `docs/readers/Book_11_Jump_in_the_Sand.md` is a same-title trap, ignore it).
- MJ account state: Organize has a **"Dark Phonics" folder**; archive contains the 27 lesson finals'
  jobs + a newer "giant letter + Mo" series (letter pages with tiny child Mo — separate project,
  Creation tab). **No easy-reader renders found yet** (archive audit was cut short — re-verify quickly
  before submitting, cheap insurance against duplicate spend).
- Decisions locked (Tredoux): compose via **our HTML→headless-Chrome PDF pipeline** (not Canva);
  deliver **both** print PDFs on disk AND published on montree.xyz readers page.

## ▶️ REMAINING STEPS (resume here)
1. **(Quick) Re-verify in MJ archive** that no reader prompts were already rendered (search "wobbly stack",
   "camp-bed", "golden hand-bell", "grey-brown moth"…). Read-only Sonnet browser agent.
2. **Sample first:** submit ONE full reader ("the-cat-sat": cover + 5 pages) from manifest-v2 prompts.
   Tredoux eyeballs style match against lesson art before fleeting the rest. (Standing doctrine: no bulk
   until Tredoux trusts the output.)
3. **Fleet the remaining 10 readers** via Sonnet browser agent(s) on suno-proven MJ rails:
   submit ONE at a time with feed verification (MJ silently drops rapid batches). 🤝 **TANDEM PROTOCOL**
   (see HANDOFF_IMAGE_TANDEM_JUL14.md): agent only submits prompts + posts status; **Tredoux picks the
   grid tile + downloads** in his own MJ window. Character consistency across a reader's 6 images:
   if drift appears, render the reader's character sheet first and use `--cref` (or Omni-ref) + `--seed`.
4. **Reconcile picks:** match ~/Downloads MJ files → manifest entries; file to
   `~/Desktop/English Curriculum 2026/Dark Phonics/Easy Readers/<slug>/{cover,p1..p5}.png`.
   🚨 NEVER into any `Week NN/images/` (mvgen lyric-match pollution) and NOT loose into `Dark Phonics/`
   (that's the flashcard set, `lesson-NN.png` flat). Verify every filed image by READING it (eyes).
5. **Build the 11 PDF books:** new builder script (pattern: `docs/curriculum/tools/build_weekNN_book.py`
   HTML → headless-Chrome PDF). Square pages: image top, big decodable text line below; cover page;
   Dark Phonics branding (match the site's dark register for covers, white pages for print interior is fine
   — decide with Tredoux). Output → `Easy Readers/<slug>/book.pdf` + a combined set folder.
6. **Publish:** upload PDFs (and page PNGs if the site should show them) to the `dark-phonics` bucket;
   update `public/dark-phonics-readers.html` — (a) swap the stale style block + `--sref 9999` in the
   displayed prompts to the locked style, (b) add "📖 Read / Print" links per reader once books exist.
   Commit + push via Desktop Commander (scoped add — tree may carry unrelated dirt).
7. **Verify:** rasterize every book PDF (`pdftoppm` + eyes — NEVER pdftotext for visual verification,
   Jul-17 rule) + live-check the page after deploy.

## 🚨 Rules that bit us before (carry them)
- MJ: submit one prompt at a time, verify it appears in feed before the next; quote-wrapped prompts get
  rejected; downloads must go via the CDN page (a.click() is silently blocked on the app page).
- Agents never pick grid tiles — Tredoux picks (tandem).
- Interrupting a launching sub-agent can ORPHAN it — ground-check by file counts/mtimes, not reports.
- Style block goes at the END of the subject description, exactly as locked above; keep the
  "no text, no words, …, no watermark" tail and `--ar 1:1` (sheets `--ar 3:2`).

## RESUME PROMPT (paste on the new laptop)
> Read docs/handoffs/PLAN_EASY_READERS_DARK_PHONICS_JUL18.md and
> lib/montree/english-curriculum/spec/easy-readers-manifest-v2.json. Resume the Dark Phonics Easy
> Readers build at step 1 (quick MJ re-verify) then step 2 (sample reader "the-cat-sat" for my style
> sign-off). Fable directs; Sonnet does browser/scout work; Opus builds the PDF composer.
