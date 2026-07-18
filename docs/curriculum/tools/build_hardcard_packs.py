#!/usr/bin/env python3
"""Dark Phonics — per-song VOCAB PACK (hard-card) composer.

For every Dark Phonics song, builds a printable flashcard pack: each card word
gets a PICTURE page (the word's illustration on plain white) immediately
followed by a WORD page (the word huge, in lowercase decodable font). Printed
short-edge duplex, this produces picture-front / word-back flashcards.

Pack layout (2 PDF pages per card word, NO title page):
  odd  PICTURE  plain white, the word's PNG centered ~15cm square, no border/text
  even WORD     the word huge in lowercase Andika (falls back to Comic Sans MS),
                black on white, centered; muted-grey footer
                "Dark Phonics · Lesson NN · <phrase>"

Usage:
  python3 build_hardcard_packs.py                  # all achievable packs
  python3 build_hardcard_packs.py --lessons 32,40  # a subset
  python3 build_hardcard_packs.py --lessons all

Inputs (square 1:1 PNGs): <vocab-root>/<word>.png. Words listed in the
manifest's reuse_images copy from Easy Reader art; if a <word>.png is not yet
filed in the Vocab folder, the manifest's reuse_images path is used as a
fallback. A lesson whose cards are not all resolvable is SKIPPED entirely and
reported PENDING — never a pack with a hole.

Output: <out-root>/lesson-NN.pdf (zero-padded NN).

Requires the Mac's Google Chrome (headless). Pure python3 stdlib otherwise.

Robustness (repo rule: no silent 0-byte PDFs):
  - Any card image unresolvable -> SKIP the whole lesson, report PENDING.
  - Hard-fail (nonzero exit) if a produced PDF is absent or 0 bytes.
"""
import argparse
import html
import json
import os
import subprocess
import sys

# ---------------------------------------------------------------------------
# Tunable constants (colors + sizes)
# ---------------------------------------------------------------------------
PAGE_CM = 19.0                     # square page edge (matches Easy Readers)
PIC_CM = 15.0                      # picture-page illustration edge
FOOTER_PT = 12                     # word-page footer size

FONT_STACK = "Andika, 'Comic Sans MS', 'Segoe Print', sans-serif"
INK = "#111111"                    # word ink
FOOTER_GREY = "rgba(0,0,0,0.42)"   # muted footer

# Default paths -------------------------------------------------------------
_THIS = os.path.dirname(os.path.abspath(__file__))
_REPO = os.path.abspath(os.path.join(_THIS, "..", "..", ".."))
DEFAULT_MANIFEST = os.path.join(
    _REPO, "lib", "montree", "english-curriculum", "spec", "dark-phonics-hardcards.json"
)
DEFAULT_VOCAB_ROOT = os.path.expanduser(
    "~/Desktop/English Curriculum 2026/Dark Phonics/Vocab"
)
DEFAULT_OUT_ROOT = os.path.expanduser(
    "~/Desktop/English Curriculum 2026/Dark Phonics/Vocab Packs"
)

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


# ---------------------------------------------------------------------------
# Text sizing — huge word, shrink-to-fit so nothing clips on a 19cm page
# ---------------------------------------------------------------------------
def word_font_pt(word):
    """Deterministic shrink-to-fit for the big lowercase word.

    Usable width ~17cm (481pt); Andika/Comic-Sans glyphs run ~0.6*em wide, so
    keep len*0.6*pt under the width. Longest card word is 6 chars.
    """
    n = len(word)
    if n <= 3:
        return 220
    if n == 4:
        return 190
    if n == 5:
        return 160
    if n == 6:
        return 130
    if n == 7:
        return 112
    return 96


# ---------------------------------------------------------------------------
# HTML generation
# ---------------------------------------------------------------------------
def _file_url(path):
    # Absolute file:// URL; percent-encode spaces so Chrome loads it reliably.
    return "file://" + os.path.abspath(path).replace(" ", "%20")


def build_css():
    return f"""
*{{margin:0;padding:0;box-sizing:border-box;}}
@page{{size:{PAGE_CM}cm {PAGE_CM}cm;margin:0;}}
html,body{{width:{PAGE_CM}cm;}}
body{{font-family:{FONT_STACK};-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
.page{{width:{PAGE_CM}cm;height:{PAGE_CM}cm;page-break-after:always;position:relative;overflow:hidden;
  background:#ffffff;}}
.page:last-child{{page-break-after:auto;}}

/* --- Picture card (front) --- */
.pic{{display:flex;align-items:center;justify-content:center;}}
.pic img{{width:{PIC_CM}cm;height:{PIC_CM}cm;object-fit:contain;display:block;}}

/* --- Word card (back) --- */
.word{{display:flex;align-items:center;justify-content:center;text-align:center;}}
.word .w{{color:{INK};font-weight:700;line-height:1.0;white-space:nowrap;
  text-transform:lowercase;letter-spacing:0.5px;padding:0 0.8cm;}}
.footer{{position:absolute;bottom:0.7cm;left:50%;transform:translateX(-50%);
  color:{FOOTER_GREY};font-size:{FOOTER_PT}pt;letter-spacing:0.5px;
  white-space:nowrap;text-align:center;}}
"""


def picture_page(img_path):
    return (
        "<div class='page pic'>"
        f"<img src='{_file_url(img_path)}'/>"
        "</div>"
    )


def word_page(word, lesson, phrase):
    footer = f"Dark Phonics &middot; Lesson {lesson} &middot; {html.escape(phrase)}"
    return (
        "<div class='page word'>"
        f"<div class='w' style='font-size:{word_font_pt(word)}pt'>{html.escape(word.lower())}</div>"
        f"<div class='footer'>{footer}</div>"
        "</div>"
    )


def build_html(lesson, phrase, resolved_cards):
    """resolved_cards: list of (word, img_path) in manifest order."""
    pages = []
    for word, img_path in resolved_cards:
        pages.append(picture_page(img_path))
        pages.append(word_page(word, lesson, phrase))
    title = f"Dark Phonics Vocab Pack - Lesson {lesson}"
    return (
        "<!doctype html><html><head><meta charset='utf-8'>"
        f"<title>{html.escape(title)}</title>"
        f"<style>{build_css()}</style></head><body>"
        + "".join(pages)
        + "</body></html>"
    )


# ---------------------------------------------------------------------------
# Image resolution
# ---------------------------------------------------------------------------
def resolve_image(word, vocab_root, reuse_images):
    """Return an existing image path for `word`, or None.

    Prefers <vocab-root>/<word>.png; falls back to the manifest reuse_images
    source path if the Vocab copy is not yet filed.
    """
    primary = os.path.join(vocab_root, f"{word}.png")
    if os.path.isfile(primary):
        return primary
    fallback = reuse_images.get(word)
    if fallback and os.path.isfile(os.path.expanduser(fallback)):
        return os.path.expanduser(fallback)
    return None


# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------
def render_pack(lesson, phrase, resolved_cards, out_root):
    """Render one lesson pack. Returns the output PDF path. Raises on failure."""
    nn = f"{int(lesson):02d}"
    os.makedirs(out_root, exist_ok=True)
    out_pdf = os.path.join(out_root, f"lesson-{nn}.pdf")

    htmldoc = build_html(lesson, phrase, resolved_cards)
    tmp_html = os.path.join(out_root, f"_pack-{nn}.html")
    with open(tmp_html, "w") as f:
        f.write(htmldoc)

    if not os.path.isfile(CHROME):
        raise RuntimeError(f"Google Chrome not found at {CHROME} (needs the Mac).")

    # Remove any stale output so the 0-byte guard is meaningful.
    if os.path.exists(out_pdf):
        os.remove(out_pdf)

    cmd = [
        CHROME,
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={out_pdf}",
        _file_url(tmp_html),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

    if not os.path.isfile(out_pdf) or os.path.getsize(out_pdf) == 0:
        raise RuntimeError(
            f"[lesson-{nn}] Chrome produced no/empty PDF (rc={proc.returncode}).\n"
            f"stderr: {proc.stderr.strip()[:400]}"
        )
    # Clean up the render-source HTML artifact.
    try:
        os.remove(tmp_html)
    except OSError:
        pass
    return out_pdf


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description="Dark Phonics per-song vocab pack composer")
    ap.add_argument("--manifest", default=DEFAULT_MANIFEST)
    ap.add_argument("--vocab-root", default=DEFAULT_VOCAB_ROOT)
    ap.add_argument("--out-root", default=DEFAULT_OUT_ROOT)
    ap.add_argument("--lessons", default="all",
                    help="'all' or comma-separated lesson numbers")
    args = ap.parse_args()

    with open(args.manifest) as f:
        manifest = json.load(f)
    songs = manifest["songs"]
    reuse_images = manifest.get("reuse_images", {})

    # Manifest key order is insertion order (numeric-ascending as authored).
    all_lessons = list(songs.keys())
    if args.lessons.strip().lower() == "all":
        selected = all_lessons
    else:
        want = [s.strip() for s in args.lessons.split(",") if s.strip()]
        unknown = [s for s in want if s not in songs]
        if unknown:
            print(f"ERROR: unknown lesson(s): {', '.join(unknown)}", file=sys.stderr)
            print(f"       known: {', '.join(all_lessons)}", file=sys.stderr)
            return 2
        selected = want

    vocab_root = os.path.abspath(os.path.expanduser(args.vocab_root))
    out_root = os.path.abspath(os.path.expanduser(args.out_root))

    print(f"Manifest   : {args.manifest}")
    print(f"Vocab root : {vocab_root}")
    print(f"Out root   : {out_root}")
    print(f"Lessons    : {len(selected)}")
    print("-" * 62)

    built, pending, failed = [], [], []
    for lesson in selected:
        song = songs[lesson]
        phrase = song["phrase"]
        cards = song["cards"]
        resolved, missing = [], []
        for word in cards:
            img = resolve_image(word, vocab_root, reuse_images)
            if img:
                resolved.append((word, img))
            else:
                missing.append(word)
        if missing:
            print(f"PEND lesson-{int(lesson):02d}  missing art: {', '.join(missing)}")
            pending.append((lesson, missing))
            continue
        try:
            pdf = render_pack(lesson, phrase, resolved, out_root)
            kb = os.path.getsize(pdf) / 1024
            print(f"OK   lesson-{int(lesson):02d}  {len(resolved)} card(s)  {kb:6.0f} KB")
            built.append(lesson)
        except Exception as e:  # noqa: BLE001 — surface the real failure
            print(f"FAIL lesson-{int(lesson):02d}  {e}", file=sys.stderr)
            failed.append(lesson)

    print("-" * 62)
    print(f"Built  : {len(built)}  -> {', '.join(str(int(l)) for l in built) or '(none)'}")
    print(f"Pending: {len(pending)} -> "
          + (', '.join(f"{int(l)}({'/'.join(m)})" for l, m in pending) or '(none)'))
    print(f"Failed : {len(failed)}  -> {', '.join(str(int(l)) for l in failed) or '(none)'}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
