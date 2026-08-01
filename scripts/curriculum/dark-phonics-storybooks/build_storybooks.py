#!/usr/bin/env python3
"""Dark Phonics — Story Books PDF composer.

Renders each book in manifest.json into a square picture book PDF via headless
Chrome (HTML -> --print-to-pdf), reusing the repo's proven curriculum book
pipeline (see docs/curriculum/tools/build_easy_readers.py).

Book layout (N+2 PDF pages per book, N = number of manifest pages, usually 5):
  1        Cover      near-black bg, gold title, recap image in white card, kicker line
  2..N+1   Pages 1..N white bg, page image large + centered, big Andika text line below
  N+2      Back page  near-black, gold title + huge target letter

Usage:
  python3 build_storybooks.py                    # all books
  python3 build_storybooks.py --books snake-in-my-sock
  python3 build_storybooks.py --books a,b,c       # subset of slugs

Inputs (square PNGs), under <images-root>/<slug>/<key>.png (key comes from manifest).
Output: <out-root>/<slug>/book.pdf

Requires the Mac's Google Chrome (headless). Pure python3 stdlib otherwise.
Andika font used if installed system-wide (kid-readable single-storey 'a');
falls back to Comic Sans MS.

Robustness (repo rule: no silent 0-byte PDFs):
  - Hard-fail (nonzero exit) if an expected image is missing.
  - Hard-fail if a produced PDF is absent or 0 bytes.
"""
import argparse
import html
import json
import os
import subprocess
import sys

# ---------------------------------------------------------------------------
# Tunable constants (colors + sizes) — matches the Easy Readers house style.
# ---------------------------------------------------------------------------
PAGE_CM = 19.0                      # square page edge

NEAR_BLACK = "#0a1a0f"              # cover / back-cover background
PURPLE = "#a78bfa"                  # the "Dark" in Dark Phonics
SOFT_WHITE = "#f2f0ea"              # cover eyebrow / wordmark rest
GOLD = "#e8c96a"                    # title + brand accent
DIM_WHITE = "rgba(255,255,255,0.55)"  # cover footer

IMG_CARD_CM = 13.0                  # cover image card edge
PAGE_IMG_CM = 13.5                  # story-page image edge (~70% of 19cm page)

TITLE_PT = 62                       # cover title base (shrinks for long titles)
TEXT_PT = 40                        # story-line base (shrink-to-fit heuristic below)
LETTER_PT = 320                     # huge target-letter on the final page

FONT_STACK = "Andika, 'Comic Sans MS', 'Segoe Print', sans-serif"

# Default paths -------------------------------------------------------------
_THIS = os.path.dirname(os.path.abspath(__file__))
DEFAULT_MANIFEST = os.path.join(_THIS, "manifest.json")
DEFAULT_IMAGES_ROOT = os.path.abspath(
    os.path.join(_THIS, "..", "..", "..", "phonics-images", "dark-phonics-books")
)
DEFAULT_OUT_ROOT = os.path.expanduser(
    "~/Desktop/English Curriculum 2026/Dark Phonics/Story Books"
)

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


# ---------------------------------------------------------------------------
# Text sizing helpers (heuristics from build_easy_readers.py)
# ---------------------------------------------------------------------------
def story_font_pt(text):
    n = len(text)
    if n <= 10:
        return 52
    if n <= 16:
        return 46
    if n <= 22:
        return TEXT_PT          # 40
    if n <= 30:
        return 34
    if n <= 45:
        return 28
    return 24


def title_font_pt(title):
    n = len(title)
    if n <= 12:
        return TITLE_PT         # 62
    if n <= 18:
        return 52
    if n <= 24:
        return 44
    return 38


# ---------------------------------------------------------------------------
# HTML generation
# ---------------------------------------------------------------------------
def _file_url(path):
    # Absolute file:// URL; percent-encode spaces so Chrome loads it reliably.
    return "file://" + path.replace(" ", "%20")


def build_css():
    return f"""
*{{margin:0;padding:0;box-sizing:border-box;}}
@page{{size:{PAGE_CM}cm {PAGE_CM}cm;margin:0;}}
html,body{{width:{PAGE_CM}cm;}}
body{{font-family:{FONT_STACK};-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
.page{{width:{PAGE_CM}cm;height:{PAGE_CM}cm;page-break-after:always;position:relative;overflow:hidden;}}
.page:last-child{{page-break-after:auto;}}

/* --- Cover --- */
.cover{{background:radial-gradient(circle at 72% 22%,rgba(167,139,250,0.14),transparent 55%),{NEAR_BLACK};
  display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1.4cm;}}
.eyebrow{{color:{SOFT_WHITE};font-size:13pt;letter-spacing:4px;text-transform:uppercase;margin-bottom:0.7cm;}}
.eyebrow .d{{color:{PURPLE};font-weight:700;}}
.card{{width:{IMG_CARD_CM}cm;height:{IMG_CARD_CM}cm;background:#fff;border-radius:0.9cm;overflow:hidden;
  box-shadow:0 0.25cm 1.2cm rgba(0,0,0,0.45);}}
.card img{{width:100%;height:100%;object-fit:cover;display:block;}}
.title{{color:{GOLD};font-weight:700;text-align:center;line-height:1.05;margin-top:0.85cm;}}
.gate{{color:{DIM_WHITE};font-size:12.5pt;letter-spacing:1px;margin-top:0.6cm;text-align:center;}}

/* --- Story pages --- */
.story{{background:#ffffff;display:flex;flex-direction:column;align-items:center;
  justify-content:flex-start;padding:1.2cm 1.2cm 0.9cm;}}
.pimg{{width:{PAGE_IMG_CM}cm;height:{PAGE_IMG_CM}cm;border-radius:0.7cm;overflow:hidden;
  border:0.4pt solid rgba(0,0,0,0.18);flex:0 0 auto;}}
.pimg img{{width:100%;height:100%;object-fit:cover;display:block;}}
.line{{flex:1 1 auto;display:flex;align-items:center;justify-content:center;
  text-align:center;color:#111;font-weight:700;line-height:1.12;
  max-width:16.5cm;padding:0.3cm 0;}}
.pnum{{position:absolute;bottom:0.55cm;left:50%;transform:translateX(-50%);
  color:rgba(0,0,0,0.4);font-size:11pt;}}

/* --- Final letter page --- */
.finale{{background:radial-gradient(circle at 30% 78%,rgba(167,139,250,0.12),transparent 55%),{NEAR_BLACK};
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.4cm;}}
.finale-title{{color:{GOLD};font-weight:700;text-align:center;line-height:1.05;padding:0 1.5cm;}}
.finale-kicker{{color:{SOFT_WHITE};font-size:13pt;letter-spacing:4px;text-transform:uppercase;margin-bottom:0.3cm;}}
.finale-kicker .d{{color:{PURPLE};font-weight:700;}}
.big-letter{{color:{GOLD};font-weight:700;font-size:{LETTER_PT}pt;line-height:0.85;margin:0.3cm 0;}}
.brand{{color:{DIM_WHITE};font-size:12pt;letter-spacing:5px;text-transform:lowercase;margin-top:0.3cm;}}
"""


def cover_page(recap_img_path, title):
    return (
        "<div class='page cover'>"
        "<div class='eyebrow'><span class='d'>Dark</span> Phonics &middot; Story Book</div>"
        f"<div class='card'><img src='{_file_url(recap_img_path)}'/></div>"
        f"<div class='title' style='font-size:{title_font_pt(title)}pt'>{html.escape(title)}</div>"
        "<div class='gate'>100% picture-story fun</div>"
        "</div>"
    )


def story_page(img_path, text, n):
    return (
        "<div class='page story'>"
        f"<div class='pimg'><img src='{_file_url(img_path)}'/></div>"
        f"<div class='line' style='font-size:{story_font_pt(text)}pt'>{html.escape(text)}</div>"
        f"<div class='pnum'>{n}</div>"
        "</div>"
    )


def finale_page(title, letter):
    return (
        "<div class='page finale'>"
        "<div class='finale-kicker'><span class='d'>Dark</span> Phonics</div>"
        f"<div class='finale-title' style='font-size:{title_font_pt(title)}pt'>{html.escape(title)}</div>"
        f"<div class='big-letter'>{html.escape(letter)}</div>"
        "<div class='brand'>montree.xyz</div>"
        "</div>"
    )


def build_html(book, img_dir):
    pages = list(book["pages"])
    recap = pages[-1]
    recap_img = os.path.join(img_dir, recap["key"] + ".png")

    out = [cover_page(recap_img, book["title"])]
    for i, p in enumerate(pages, start=1):
        img_path = os.path.join(img_dir, p["key"] + ".png")
        out.append(story_page(img_path, p["text"], i))
    out.append(finale_page(book["title"], book["letter"]))

    return (
        "<!doctype html><html><head><meta charset='utf-8'>"
        f"<title>{html.escape(book['title'])} - Dark Phonics Story Book</title>"
        f"<style>{build_css()}</style></head><body>"
        + "".join(out)
        + "</body></html>"
    )


# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------
def missing_images(book, img_dir):
    expected = [p["key"] + ".png" for p in book["pages"]]
    return [f for f in expected if not os.path.isfile(os.path.join(img_dir, f))]


def render_book(book, images_root, out_root):
    """Render one book. Returns the output PDF path. Raises on failure."""
    slug = book["slug"]
    img_dir = os.path.join(images_root, slug)
    out_dir = os.path.join(out_root, slug)
    os.makedirs(out_dir, exist_ok=True)
    out_pdf = os.path.join(out_dir, "book.pdf")

    htmldoc = build_html(book, img_dir)
    tmp_html = os.path.join(out_dir, "_book.html")
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
        _file_url(os.path.abspath(tmp_html)),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

    if not os.path.isfile(out_pdf) or os.path.getsize(out_pdf) == 0:
        raise RuntimeError(
            f"[{slug}] Chrome produced no/empty PDF (rc={proc.returncode}).\n"
            f"stderr: {proc.stderr.strip()[:400]}"
        )
    return out_pdf


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description="Dark Phonics Story Books PDF composer")
    ap.add_argument("--manifest", default=DEFAULT_MANIFEST)
    ap.add_argument("--images-root", default=DEFAULT_IMAGES_ROOT)
    ap.add_argument("--out-root", default=DEFAULT_OUT_ROOT)
    ap.add_argument("--books", default="all",
                    help="'all' or comma-separated slugs")
    args = ap.parse_args()

    with open(args.manifest) as f:
        manifest = json.load(f)
    all_books = manifest["books"]
    by_slug = {b["slug"]: b for b in all_books}

    if args.books.strip().lower() == "all":
        selected = list(all_books)
    else:
        slugs = [s.strip() for s in args.books.split(",") if s.strip()]
        unknown = [s for s in slugs if s not in by_slug]
        if unknown:
            print(f"ERROR: unknown book slug(s): {', '.join(unknown)}", file=sys.stderr)
            print(f"       known: {', '.join(by_slug)}", file=sys.stderr)
            return 2
        selected = [by_slug[s] for s in slugs]

    images_root = os.path.abspath(os.path.expanduser(args.images_root))
    out_root = os.path.abspath(os.path.expanduser(args.out_root))

    print(f"Manifest    : {args.manifest}")
    print(f"Images root : {images_root}")
    print(f"Out root    : {out_root}")
    print(f"Books       : {len(selected)}")
    print("-" * 60)

    ok, failed = 0, 0
    for book in selected:
        slug = book["slug"]
        img_dir = os.path.join(images_root, slug)
        miss = missing_images(book, img_dir)
        if miss:
            print(f"FAIL [{slug}] missing art: {', '.join(miss)}", file=sys.stderr)
            failed += 1
            return 1
        try:
            pdf = render_book(book, images_root, out_root)
            kb = os.path.getsize(pdf) / 1024
            print(f"OK   [{slug}] {kb:6.0f} KB -> {pdf}")
            ok += 1
        except Exception as e:  # noqa: BLE001 — surface the real failure
            print(f"FAIL [{slug}] {e}", file=sys.stderr)
            failed += 1
            return 1

    print("-" * 60)
    print(f"Done: {ok} built, {failed} failed.")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
