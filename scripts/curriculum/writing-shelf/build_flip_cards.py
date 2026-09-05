#!/usr/bin/env python3
"""
Dark Phonics · Writing Shelf · sheets 02 and 03, four butted 80 x 120 mm cards

Tredoux, 2026-09-05 late: every card on this shelf is going to be MOUNTED by
hand on a coloured backing card with a 1 cm border all round.  So the printed
card is the finished card minus 20 mm each way.  The flip cards stand in his
100 mm card stands, which fixes the finished size at 100 x 140 and therefore the
PRINTED size at 80 x 120.

They are BUTTED — no gutters — because the cut standard is now cut once: every
line runs the full width or full height of the page, so one stroke of the blade
separates the cards on both sides of it (see cutmarks.py).

Four 80 x 120 cards make a 160 x 240 block on an A4, which leaves a 25 mm side
margin and a 28.5 mm head and foot: room for the triangles and the footer, and
no ink anywhere near the printer-safe margin.  This is a straight improvement on
both earlier versions — the A6 original had no margin at all, and the 100 x 140
version put its outer trim line 2.5 mm from the paper edge.

The v2 generator is lost, so this REIMPOSES the pristine originals in ./src/ —
but it does NOT scale the whole A6 quadrant down into the smaller card.  That was
the first attempt and it made the picture 58 mm on an 80 mm card, because the
quadrant's own generous margins came along for the ride.  The card is RE-LAID
instead: the photograph is lifted out of the quadrant by its own placement
rectangle (read from the PDF content stream, 75.94 mm square on every one of
these sheets) and re-placed at the FULL clearance width, 72 x 72 mm, centred; and
the word on the back is lifted out by its text box and scaled up until its cap
height is 20 mm, clamped only by the same 4 mm clearance.  Idempotent — the input
is always ./src/.

DUPLEX.  Short-edge flip of a portrait sheet is (x, y) -> (x, H - y): top and
bottom swap, left and right do not, so front top-left is backed by back
bottom-left.  The block is centred, so the grid is symmetric under that map
(rows 28.5..148.5 and 148.5..268.5 swap onto each other, columns are untouched)
and every quadrant keeps the place it had — the shipped pairing carries over
unchanged, and it is read back off the built file by verify_shelf_sheets.py.
The two centre cut lines crossing at the middle of the page are also the
registration check: hold a printed sheet to the light and front cross should sit
on back cross.

Run:   python3 scripts/curriculum/writing-shelf/build_flip_cards.py
Needs: pikepdf, pypdf, reportlab
"""

import math
import tempfile
from pathlib import Path

import os
import subprocess

import pikepdf
from PIL import Image
from pypdf import PdfReader, PdfWriter
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

import cutmarks as CM
import extract_imgs as IMG
import impose as IMP

HERE = Path(__file__).resolve().parent
SRC = HERE / "src"
REPO = HERE.parents[2]
OUT_DIR = REPO / "public" / "dark-phonics-shelf" / "v2"
FONT_DIR = REPO / "public" / "fonts"

PAGE_W, PAGE_H = 210.0, 297.0     # exact A4 portrait
CARD_W, CARD_H = 80.0, 120.0      # PRINTED; mounted on backing card it is 100 x 140
COLS, ROWS = 2, 2

BLOCK_W, BLOCK_H = COLS * CARD_W, ROWS * CARD_H       # 160 x 240
X0 = (PAGE_W - BLOCK_W) / 2.0                          # 25.0
Y0 = (PAGE_H - BLOCK_H) / 2.0                          # 28.5

# The source sheet: four A6 quadrants of a 209.889 x 297.011 page.
SRC_W, SRC_H = 209.88865, 297.01066
QUAD_W, QUAD_H = SRC_W / 2.0, SRC_H / 2.0

# The content area of a card: the card less the 4 mm clearance on every side.
FIT_W = CARD_W - 2 * CM.CONTENT_CLEAR          # 72 mm — the picture width
FIT_H = CARD_H - 2 * CM.CONTENT_CLEAR          # 112 mm

# The word on the back is measured OFF A RASTER, not off pdfplumber: this font
# is subsetted and reports unreliable widths (it also extracts as doubled
# glyphs), and a box that is too small would CLIP the word.  A raster of the
# pristine page cannot lie about where the ink is.
INK_DPI = 300
INK_THRESH = 238
PAD = 0.5              # mm of paper kept round the ink
MAX_UP = 2.0           # never blow a word up by more than this
# At MAX_UP a single word on 03 lands at a cap height of 20-22 mm, which is what
# was asked for; 02's five-line chains are clamped by the 112 mm content height
# to about 1.23 instead, which is simply what a five-line card can hold.

FOOT_SIZE = 5.5
FOOT_X = 30.0                     # in the bottom margin, in the left-hand gap
FOOT_Y = 13.0

SHEETS = ["02-chain-cards.pdf", "03-dictation-photo-cards.pdf"]


def cards():
    """The four card boxes, keyed by position, in the source's own quadrant order."""
    left, right = X0, X0 + CARD_W
    bot, top = Y0, Y0 + CARD_H
    return {"TL": (left, top, left + CARD_W, top + CARD_H),
            "TR": (right, top, right + CARD_W, top + CARD_H),
            "BL": (left, bot, left + CARD_W, bot + CARD_H),
            "BR": (right, bot, right + CARD_W, bot + CARD_H)}


def quads():
    return {"TL": (0.0, QUAD_H, QUAD_W, SRC_H), "TR": (QUAD_W, QUAD_H, SRC_W, SRC_H),
            "BL": (0.0, 0.0, QUAD_W, QUAD_H), "BR": (QUAD_W, 0.0, SRC_W, QUAD_H)}


def which(box, x, y):
    return box[0] - 0.01 <= x <= box[2] + 0.01 and box[1] - 0.01 <= y <= box[3] + 0.01


def ink_boxes(src_path, quad):
    """Ink bounding box per quadrant per page, in mm, off a raster of the source."""
    out = []
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(["pdftoppm", "-r", str(INK_DPI), "-png", str(src_path),
                        str(Path(tmp) / "p")], check=True)
        for f in sorted(os.listdir(tmp)):
            im = Image.open(str(Path(tmp) / f)).convert("L")
            px = im.load()
            W, H = im.size
            u = 25.4 / INK_DPI
            page = {}
            for k, (x0, y0, x1, y1) in quad.items():
                a, b = int(x0 / u), min(W, int(x1 / u))
                c0, d0 = int((H * u - y1) / u), min(H, int((H * u - y0) / u))
                mnx = mny = 10 ** 9
                mxx = mxy = -1
                for yy in range(max(0, c0), d0):
                    row = [xx for xx in range(max(0, a), b) if px[xx, yy] < INK_THRESH]
                    if row:
                        mnx = min(mnx, row[0]); mxx = max(mxx, row[-1])
                        mny = min(mny, yy); mxy = max(mxy, yy)
                if mxx >= 0:
                    page[k] = (mnx * u, H * u - (mxy + 1) * u, (mxx + 1) * u, H * u - mny * u)
            out.append(page)
    return out


def content(src_path):
    """Per page, per quadrant: the box to lift and what kind of thing it is.

    A quadrant holding an IMAGE is a picture face and the image is the whole of
    it — any text under it is a leftover of the lost generator (02 p1 has one
    such word, hidden behind its photograph) and is deliberately dropped.
    Otherwise the quadrant is a word face and the box is its ink.
    """
    q = quads()
    pdf = pikepdf.open(str(src_path))
    imgs = [IMG.image_rects(pg) for pg in pdf.pages]
    pdf.close()
    inks = ink_boxes(src_path, q)

    out = []
    for i, page_imgs in enumerate(imgs):
        found = {}
        for r in page_imgs:
            cx, cy = (r[0] + r[2]) / 2.0, (r[1] + r[3]) / 2.0
            for k, b in q.items():
                if which(b, cx, cy):
                    found[k] = dict(kind="image", box=r)
        for k, bb in inks[i].items():
            if k in found:
                continue
            found[k] = dict(kind="word",
                            box=(bb[0] - PAD, bb[1] - PAD, bb[2] + PAD, bb[3] + PAD))
        out.append(found)
    return out


def placements(found):
    """Turn one page's content into (src_box, dst_box, scale) triples."""
    cd = cards()
    place, notes = [], []
    for k, item in sorted(found.items()):
        sx0, sy0, sx1, sy1 = item["box"]
        w, h = sx1 - sx0, sy1 - sy0
        if item["kind"] == "image":
            s = min(FIT_W / w, FIT_H / h)
        else:
            s = min(MAX_UP, FIT_W / w, FIT_H / h)
        s = math.floor(s * 10000.0) / 10000.0
        cx = (cd[k][0] + cd[k][2]) / 2.0
        cy = (cd[k][1] + cd[k][3]) / 2.0
        dst = (cx - w * s / 2.0, cy - h * s / 2.0, cx + w * s / 2.0, cy + h * s / 2.0)
        place.append((item["box"], dst, s))
        notes.append((k, item["kind"], w * s, h * s, s))
    return place, notes


def check(c=None):
    bad = []
    if abs(X0 * 2 + BLOCK_W - PAGE_W) > 1e-9 or abs(Y0 * 2 + BLOCK_H - PAGE_H) > 1e-9:
        bad.append("the block is not centred — duplex registration depends on it")
    if X0 < CM.SAFE + CM.MARK_H or Y0 < CM.SAFE + CM.MARK_H:
        bad.append("the margin cannot hold a triangle outside the safe margin")
    if FOOT_X < CM.SAFE + 8.5:
        bad.append("the footer starts within 14 mm of the page edge")
    if c is not None:
        w = c.stringWidth(CM.cards_line(4), "Andika", FOOT_SIZE) / mm
        if FOOT_X + w > X0 + CARD_W - 1.0:
            bad.append("the footer runs into a cut line")
    if bad:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(bad))


def check_page(notes):
    """Every placed thing must sit CONTENT_CLEAR inside its card."""
    for k, kind, w, h, cap in notes:
        if w > FIT_W + 1e-6 or h > FIT_H + 1e-6:
            raise SystemExit("SPEC FAILURE:\n  %s %s is %.2f x %.2f mm, over the "
                             "%.0f x %.0f content area" % (k, kind, w, h, FIT_W, FIT_H))


def guides(path, n_pages):
    c = canvas.Canvas(str(path), pagesize=(PAGE_W * mm, PAGE_H * mm))
    v, h = CM.grid_lines(X0, Y0, COLS, ROWS, CARD_W, CARD_H, PAGE_W, PAGE_H)
    check(c)
    stats = None
    for _ in range(n_pages):
        stats = CM.cut_lines(c, v, h, PAGE_W, PAGE_H)
        CM.footer(c, FOOT_X, FOOT_Y, CM.cards_line(COLS * ROWS), "Andika", FOOT_SIZE)
        c.showPage()
    c.save()
    return stats


def build():
    check()
    pdfmetrics.registerFont(TTFont("Andika", str(FONT_DIR / "Andika-Regular.ttf")))

    print("flip cards -> %s" % OUT_DIR)
    print("  printed card %.0f x %.0f mm  ->  mounted on backing card %.0f x %.0f mm"
          % (CARD_W, CARD_H, CARD_W + 20, CARD_H + 20))
    print("  block %.0f x %.0f butted, centred: margins %.1f mm side, %.1f mm head/foot; "
          "content area %.0f x %.0f" % (BLOCK_W, BLOCK_H, X0, Y0, FIT_W, FIT_H))
    for name in SHEETS:
        src = SRC / name
        if not src.exists():
            raise SystemExit("missing pristine source: %s" % src)
        per_page, all_notes = [], []
        for found in content(src):
            place, notes = placements(found)
            check_page(notes)
            per_page.append(place)
            all_notes.append(notes)
        with tempfile.TemporaryDirectory() as tmp:
            base, over = Path(tmp) / "b.pdf", Path(tmp) / "o.pdf"
            n = IMP.reimpose_pages(src, base, PAGE_W, PAGE_H, per_page)
            stats = guides(over, n)
            reader, ov = PdfReader(str(base)), PdfReader(str(over))
            writer = PdfWriter()
            for i, page in enumerate(reader.pages):
                page.merge_page(ov.pages[i])
                writer.add_page(page)
            for pg in writer.pages:
                pg.compress_content_streams()
            out = OUT_DIR / name
            with open(out, "wb") as fh:
                writer.write(fh)
        pics = [n2 for pg in all_notes for n2 in pg if n2[1] == "image"]
        wrds = [n2 for pg in all_notes for n2 in pg if n2[1] == "word"]
        print("  %-32s %d pages · %d cut lines, %d triangles · %.0f KB"
              % (name, n, stats["lines"], stats["marks"], out.stat().st_size / 1024.0))
        if pics:
            print("      %d pictures at %.2f x %.2f mm" % (len(pics), pics[0][2], pics[0][3]))
        if wrds:
            print("      %d word faces, ink %.1f-%.1f mm wide x %.1f-%.1f tall, "
                  "scaled up x%.2f-%.2f"
                  % (len(wrds), min(w[2] for w in wrds), max(w[2] for w in wrds),
                     min(w[3] for w in wrds), max(w[3] for w in wrds),
                     min(w[4] for w in wrds), max(w[4] for w in wrds)))


if __name__ == "__main__":
    build()
