#!/usr/bin/env python3
"""
Dark Phonics · Writing Shelf · cut guides + duplex registration marks

The generators for the v2 printables are lost, so this works as an OVERLAY:
it reads a PRISTINE copy of each sheet from ./src/, draws the marks on a
transparent page with reportlab, merges the two with pypdf, and writes the
result over public/dark-phonics-shelf/v2/.

It is idempotent by construction — the input is always ./src/, never the
published file — so running it twice cannot double the marks.  If you ever
regenerate a source sheet, refresh its copy in ./src/ first.

Run:   python3 scripts/curriculum/writing-shelf/add_cut_guides.py
Needs: reportlab, pypdf


WHY THE MARKS SIT WHERE THEY SIT
--------------------------------
02 and 03 are 2x2 A6 grids that tile A4 exactly: there is no margin, so there
is nowhere for a mark to live except on the cut line itself.  A mark ON the cut
line is split by the blade, leaving ~0.13 mm of hairline on each card — which is
why these two sheets shipped with no marks at all, and why they now get marks
only at the page-edge midpoints and the page centre.

Those positions are also the only ones that are safe for a duplex job.  The
marks must land at the SAME physical place on both faces of the sheet, and the
page-edge midpoints and the page centre are exactly the fixed points of both
flips:

    short-edge flip of a portrait sheet   (x, y) -> (x, H - y)
    long-edge  flip of a portrait sheet   (x, y) -> (W - x, y)

A mark at (W/2, t) maps to (W/2, H - t), which is where the opposite mark
already is; a mark at (t, H/2) maps to itself.  So the front marks and the back
marks coincide however the printer flips the paper.

06 is different: its 90 mm cards sit in 9.5 mm gutters, so its ticks live
entirely in the waste and never touch a card.


DUPLEX PAIRING (verified 2026-09-05 against the actual PDFs)
------------------------------------------------------------
Short-edge duplex of a PORTRAIT sheet flips about the top edge: top and bottom
swap, left and right do not.  So the quadrant behind front top-left is back
BOTTOM-left.  Checked by reading every quadrant of 02 and 03:

    02 p1 fronts  TL tap  TR mop  BL peg  BR bin
    02 p2 backs   TL peg  TR bin  BL tap  BR mop      -> TL<->BL, TR<->BR  OK
    02 p3 fronts  TL nut  TR rat  BL -    BR -
    02 p4 backs   TL -    TR -    BL nut  BR rat      -> OK
    03 p1 fronts  TL cat  TR pig  BL rug  BR hat
    03 p2 backs   TL rug  TR hat  BL cat  BR pig      -> OK
    03 p3 fronts  TL mug  TR bed  BL dog  BR cot
    03 p4 backs   TL dog  TR cot  BL mug  BR bed      -> OK
    03 p5 fronts  TL pen  TR bag  BL log  BR jam
    03 p6 backs   TL log  TR jam  BL pen  BR bag      -> OK

The blank quadrants on 02 p3/p4 settle it on their own: under a LONG-edge flip
front TL would be backed by back TR, which is blank.  SHORT EDGE is correct and
the printed instruction stands.
"""

import tempfile
from pathlib import Path

from reportlab.lib.colors import Color
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from pypdf import PdfReader, PdfWriter

HERE = Path(__file__).resolve().parent
SRC = HERE / "src"
REPO = HERE.parents[2]
OUT_DIR = REPO / "public" / "dark-phonics-shelf" / "v2"

# --------------------------------------------------------------------------
# ink and mark sizes
# --------------------------------------------------------------------------
INK = Color(0.0784, 0.0667, 0.0549)     # #141110
DOTC = Color(0.7490, 0.7216, 0.6824)    # #BFB8AE — the house dotted-line grey

HAIRLINE = 0.265        # mm — 1 px at 96 dpi, the weight used across the set
TICK_IN = 2.5           # mm from the page edge where a tick starts
TICK_OUT = 8.0          # mm from the page edge where a tick ends
CROSS_ARM = 3.0         # mm — half-length of each arm of an interior cross
DOT_ON = 0.265          # dotted-rectangle dash pattern
DOT_OFF = 0.265

# --------------------------------------------------------------------------
# GEOMETRY PER SHEET
#
# cuts_x / cuts_y are cut-line positions in mm, measured from the bottom-left
# of the page.  "MID" means the page midline, resolved from the real mediabox
# at draw time.  Everything else was measured off the shipped PDFs at 254 dpi.
# --------------------------------------------------------------------------
MID = "MID"

SHEETS = {
    # 2 x 2 A6 on A4 portrait, tiling the page exactly.  Duplex, short edge.
    "02-chain-cards.pdf": dict(
        pages="all",
        cuts_x=[MID],
        cuts_y=[MID],
        crosses=True,
        rects={},
        note="four A6 cards, 105 x 148.5 mm, cut on the two midlines",
    ),
    "03-dictation-photo-cards.pdf": dict(
        pages="all",
        cuts_x=[MID],
        cuts_y=[MID],
        crosses=True,
        rects={},
        note="four A6 cards, 105 x 148.5 mm, cut on the two midlines",
    ),
    # 4 x 90 mm cards on A4 portrait with 9.5 mm gutters.  Single-sided.
    # Page 1 already carried dotted rectangles; pages 2 and 3 carried nothing.
    "06-picture-sequences.pdf": dict(
        pages=[1, 2, 3],
        cuts_x=[9.60, 100.10, 109.60, 200.10],
        cuts_y=[72.81, 163.31, 172.81, 263.31],
        crosses=False,                     # corners sit in the gutter; the
                                           # dotted rectangles already mark them
        rects={2: "cards", 3: "cards"},    # page 1 has its own already
        note="twelve 90 x 90 mm cards, four per sheet",
    ),
}

# Sheets deliberately left alone, and why.  Checked 2026-09-05.
UNTOUCHED = {
    "01-sound-frame-mat.pdf": "rebuilt by build_sound_frame_mat.py; carries its own trim rectangle and ticks",
    "04-small-objects.pdf": "every one of the 15 pieces already has a full dotted rectangle",
    "05-lined-sentence-strips.pdf": "all four strips already have a dotted rectangle and paired ticks",
    "07-fold-book-template.pdf": "one cut, already drawn as the amber fold/cut line",
    "08-story-dictation-sheet.pdf": "no cut",
    "09-teacher-script-card.pdf": "one cut, already a dotted centre line with paired ticks",
    "10-grammar-pack.pdf": "p1 tokens already have crop ticks; p2 strips already have dotted rectangles",
}


def resolve(vals, extent):
    return [extent / 2.0 if v == MID else float(v) for v in vals]


def card_rects(spec):
    xs, ys = spec["cuts_x"], spec["cuts_y"]
    out = []
    for i in range(0, len(xs) - 1, 2):
        for j in range(0, len(ys) - 1, 2):
            out.append((xs[i], ys[j], xs[i + 1], ys[j + 1]))
    return out


def overlay(page_w_mm, page_h_mm, spec, page_no, path):
    c = canvas.Canvas(str(path), pagesize=(page_w_mm * mm, page_h_mm * mm))
    xs = resolve(spec["cuts_x"], page_w_mm)
    ys = resolve(spec["cuts_y"], page_h_mm)

    # dotted rectangles, where this page has none of its own
    if spec["rects"].get(page_no) == "cards":
        c.saveState()
        c.setStrokeColor(DOTC)
        c.setLineWidth(HAIRLINE * mm)
        c.setLineCap(0)
        c.setDash([DOT_ON * mm, DOT_OFF * mm])
        for x0, y0, x1, y1 in card_rects(dict(cuts_x=xs, cuts_y=ys)):
            c.rect(x0 * mm, y0 * mm, (x1 - x0) * mm, (y1 - y0) * mm, stroke=1, fill=0)
        c.restoreState()

    c.saveState()
    c.setStrokeColor(INK)
    c.setLineWidth(HAIRLINE * mm)
    c.setLineCap(0)
    c.setDash([])

    # a tick at each end of every cut line, in the waste at the page edge
    for x in xs:
        c.line(x * mm, TICK_IN * mm, x * mm, TICK_OUT * mm)
        c.line(x * mm, (page_h_mm - TICK_IN) * mm, x * mm, (page_h_mm - TICK_OUT) * mm)
    for y in ys:
        c.line(TICK_IN * mm, y * mm, TICK_OUT * mm, y * mm)
        c.line((page_w_mm - TICK_IN) * mm, y * mm, (page_w_mm - TICK_OUT) * mm, y * mm)

    # a hairline cross where two cut lines meet inside the page
    if spec["crosses"]:
        for x in xs:
            for y in ys:
                c.line((x - CROSS_ARM) * mm, y * mm, (x + CROSS_ARM) * mm, y * mm)
                c.line(x * mm, (y - CROSS_ARM) * mm, x * mm, (y + CROSS_ARM) * mm)

    c.restoreState()
    c.showPage()
    c.save()


def apply_sheet(name, spec):
    src = SRC / name
    if not src.exists():
        raise SystemExit("missing pristine source: %s" % src)
    reader = PdfReader(str(src))
    writer = PdfWriter()
    tmp = Path(tempfile.gettempdir()) / "writing-shelf-overlay.tmp.pdf"

    want = range(1, len(reader.pages) + 1) if spec["pages"] == "all" else spec["pages"]
    for i, page in enumerate(reader.pages, start=1):
        if i in want:
            w = float(page.mediabox.width) / 72 * 25.4
            h = float(page.mediabox.height) / 72 * 25.4
            overlay(w, h, spec, i, tmp)
            page.merge_page(PdfReader(str(tmp)).pages[0])
        writer.add_page(page)

    out = OUT_DIR / name
    with open(out, "wb") as fh:
        writer.write(fh)
    print("  %-32s %d pages, marks on %s  (%s)"
          % (name, len(reader.pages),
             "all" if spec["pages"] == "all" else ",".join(str(p) for p in want),
             spec["note"]))


def main():
    print("cut guides ->", OUT_DIR)
    for name, spec in SHEETS.items():
        apply_sheet(name, spec)
    print("left alone:")
    for name, why in UNTOUCHED.items():
        print("  %-32s %s" % (name, why))


if __name__ == "__main__":
    main()
