#!/usr/bin/env python3
"""Dark Phonics — Easy Readers PDF composer.

Renders each 11-page-manifest reader into a square 7-PDF-page picture book via
headless Chrome (HTML -> --print-to-pdf), following the repo's proven curriculum
book pipeline (see build_week01_book.py).

Book layout (7 PDF pages per reader):
  1  Cover      near-black, eyebrow, cover image in white card, BIG gold title, gate footer
  2-6 Pages 1-5 white, page image top, BIG black decodable line, page number
  7  Back cover near-black "Dark Phonics" wordmark + montree.xyz

Usage:
  python3 build_easy_readers.py                       # all readers, defaults
  python3 build_easy_readers.py --readers the-cat-sat # one reader
  python3 build_easy_readers.py --readers a,b,c        # a subset
  python3 build_easy_readers.py --allow-missing        # drop readers lacking art, don't fail

Inputs per reader (square 1:1 PNGs), under <images-root>/<slug>/:
  cover.png  p1.png  p2.png  p3.png  p4.png  p5.png

Output: <out-root>/<slug>/book.pdf

Requires the Mac's Google Chrome (headless). Pure python3 stdlib otherwise.
Andika font is used if installed system-wide (kid-readable single-storey 'a');
falls back to Comic Sans MS.

Robustness (repo rule: no silent 0-byte PDFs):
  - Hard-fail (nonzero exit) if an expected image is missing (unless --allow-missing
    drops the WHOLE reader — never an individual page).
  - Hard-fail if a produced PDF is absent or 0 bytes.
"""
import argparse
import html
import os
import subprocess
import sys

# ---------------------------------------------------------------------------
# Tunable constants (colors + sizes)
# ---------------------------------------------------------------------------
PAGE_CM = 19.0                      # square page edge

NEAR_BLACK = "#0a1a0f"             # cover / back-cover background
PURPLE = "#a78bfa"                 # the "Dark" in Dark Phonics
SOFT_WHITE = "#f2f0ea"            # cover eyebrow / wordmark rest
GOLD = "#e8c96a"                  # title + brand accent
DIM_WHITE = "rgba(255,255,255,0.55)"  # cover footer

IMG_CARD_CM = 13.0                # cover image card edge
PAGE_IMG_CM = 13.5               # story-page image edge

TITLE_PT = 62                     # cover title base (shrinks for long titles)
TEXT_PT = 40                      # story-line base (shrink-to-fit heuristic below)

FONT_STACK = "Andika, 'Comic Sans MS', 'Segoe Print', sans-serif"

# Default paths -------------------------------------------------------------
_THIS = os.path.dirname(os.path.abspath(__file__))
_REPO = os.path.abspath(os.path.join(_THIS, "..", "..", ".."))
DEFAULT_MANIFEST = os.path.join(
    _REPO, "lib", "montree", "english-curriculum", "spec", "easy-readers-manifest-v2.json"
)
DEFAULT_IMAGES_ROOT = os.path.expanduser(
    "~/Desktop/English Curriculum 2026/Dark Phonics/Easy Readers"
)

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

PAGE_IMAGES = ["p1.png", "p2.png", "p3.png", "p4.png", "p5.png"]


# ---------------------------------------------------------------------------
# Text sizing helpers
# ---------------------------------------------------------------------------
def story_font_pt(text):
    """Shrink-to-fit heuristic for the big decodable line.

    Single line preferred; the longest reader lines (~25 chars) still fit on one
    or two lines at these sizes on a 19cm page. Deterministic, stdlib-only.
    """
    n = len(text)
    if n <= 10:
        return 52
    if n <= 16:
        return 46
    if n <= 22:
        return TEXT_PT          # 40
    if n <= 30:
        return 34
    return 28


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

/* --- Back cover --- */
.back{{background:radial-gradient(circle at 30% 78%,rgba(167,139,250,0.12),transparent 55%),{NEAR_BLACK};
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.5cm;}}
.wordmark{{font-size:30pt;font-weight:700;letter-spacing:1px;}}
.wordmark .d{{color:{PURPLE};}}
.wordmark .p{{color:{SOFT_WHITE};}}
.brand{{color:{GOLD};font-size:12pt;letter-spacing:5px;text-transform:lowercase;margin-top:0.3cm;}}
"""


def cover_page(cover_img_path, title, gate):
    return (
        "<div class='page cover'>"
        "<div class='eyebrow'><span class='d'>Dark</span> Phonics &middot; Easy Reader</div>"
        f"<div class='card'><img src='{_file_url(cover_img_path)}'/></div>"
        f"<div class='title' style='font-size:{title_font_pt(title)}pt'>{html.escape(title)}</div>"
        f"<div class='gate'>Gate: Lesson {gate} &middot; 100% decodable</div>"
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


def back_page():
    return (
        "<div class='page back'>"
        "<div class='wordmark'><span class='d'>Dark</span> <span class='p'>Phonics</span></div>"
        "<div class='brand'>montree.xyz</div>"
        "</div>"
    )


def build_html(reader, img_dir):
    pages = [cover_page(os.path.join(img_dir, "cover.png"), reader["title"], reader["gate"])]
    # manifest pages are keyed by n (1..5); render in order.
    ordered = sorted(reader["pages"], key=lambda p: p["n"])
    for i, p in enumerate(ordered):
        pages.append(story_page(os.path.join(img_dir, PAGE_IMAGES[i]), p["text"], p["n"]))
    pages.append(back_page())
    return (
        "<!doctype html><html><head><meta charset='utf-8'>"
        f"<title>{html.escape(reader['title'])} - Dark Phonics Easy Reader</title>"
        f"<style>{build_css()}</style></head><body>"
        + "".join(pages)
        + "</body></html>"
    )


# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------
def missing_images(img_dir):
    expected = ["cover.png"] + PAGE_IMAGES
    return [f for f in expected if not os.path.isfile(os.path.join(img_dir, f))]


def render_reader(reader, images_root, out_root):
    """Render one reader. Returns the output PDF path. Raises on failure."""
    slug = reader["slug"]
    img_dir = os.path.join(images_root, slug)
    out_dir = os.path.join(out_root, slug)
    os.makedirs(out_dir, exist_ok=True)
    out_pdf = os.path.join(out_dir, "book.pdf")

    htmldoc = build_html(reader, img_dir)
    # Write the HTML alongside the images so relative context is unambiguous;
    # images are embedded via absolute file:// URLs regardless.
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
    ap = argparse.ArgumentParser(description="Dark Phonics Easy Readers PDF composer")
    ap.add_argument("--manifest", default=DEFAULT_MANIFEST)
    ap.add_argument("--images-root", default=DEFAULT_IMAGES_ROOT)
    ap.add_argument("--out-root", default=None,
                    help="defaults to --images-root")
    ap.add_argument("--readers", default="all",
                    help="'all' or comma-separated slugs")
    ap.add_argument("--allow-missing", action="store_true",
                    help="drop readers whose art is incomplete instead of failing "
                         "(never drops individual pages)")
    args = ap.parse_args()

    import json
    with open(args.manifest) as f:
        manifest = json.load(f)
    all_readers = manifest["readers"]
    by_slug = {r["slug"]: r for r in all_readers}

    if args.readers.strip().lower() == "all":
        selected = list(all_readers)
    else:
        slugs = [s.strip() for s in args.readers.split(",") if s.strip()]
        unknown = [s for s in slugs if s not in by_slug]
        if unknown:
            print(f"ERROR: unknown reader slug(s): {', '.join(unknown)}", file=sys.stderr)
            print(f"       known: {', '.join(by_slug)}", file=sys.stderr)
            return 2
        selected = [by_slug[s] for s in slugs]

    images_root = os.path.abspath(os.path.expanduser(args.images_root))
    out_root = os.path.abspath(os.path.expanduser(args.out_root)) if args.out_root else images_root

    print(f"Manifest    : {args.manifest}")
    print(f"Images root : {images_root}")
    print(f"Out root    : {out_root}")
    print(f"Readers     : {len(selected)}")
    print("-" * 60)

    ok, dropped, failed = 0, 0, 0
    for reader in selected:
        slug = reader["slug"]
        img_dir = os.path.join(images_root, slug)
        miss = missing_images(img_dir)
        if miss:
            msg = f"[{slug}] missing art: {', '.join(miss)}"
            if args.allow_missing:
                print(f"SKIP {msg}")
                dropped += 1
                continue
            print(f"FAIL {msg}", file=sys.stderr)
            print("      (use --allow-missing to drop incomplete readers)", file=sys.stderr)
            failed += 1
            # hard-fail immediately per the no-partial-books rule
            return 1
        try:
            pdf = render_reader(reader, images_root, out_root)
            kb = os.path.getsize(pdf) / 1024
            print(f"OK   [{slug}] {kb:6.0f} KB -> {pdf}")
            ok += 1
        except Exception as e:  # noqa: BLE001 — surface the real failure
            print(f"FAIL [{slug}] {e}", file=sys.stderr)
            failed += 1
            return 1

    print("-" * 60)
    print(f"Done: {ok} built, {dropped} dropped, {failed} failed.")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
