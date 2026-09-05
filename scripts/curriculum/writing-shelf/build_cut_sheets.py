#!/usr/bin/env python3
"""
Dark Phonics · Writing Shelf · sheets 04, 05 and 06 re-imposed BUTTED

Tredoux, 2026-09-05 late: cut once.  Cards butt against each other and every cut
line runs the full width or the full height of the page, so one stroke of the
blade separates the cards on both sides of it.  See cutmarks.py for the standard.

WHAT CHANGED PER SHEET

  04  small objects.  The word cards keep 60 x 35 mm; the punctuation tiles are
      widened from 34 x 42 to 60 x 42 so that EVERY PIECE ON THE SHEET IS THE
      SAME WIDTH.  That is the whole point: three columns of 60 mm, four rows of
      cards and one row of tiles, so every line — vertical and horizontal — runs
      edge to edge with a triangle at both ends, and the sheet obeys cut once
      like the rest of the set.  (An earlier version kept the tiles at 34 mm and
      had to stop their verticals at the band edge; Tredoux called that a
      violation, correctly.)  A 60 x 42 tile still lies flat in a mint tin, and
      neither piece is mounted on backing card, so 60 x 35 and 60 x 42 are the
      finished sizes.

  05  lined sentence strips.  Printed size KEPT (190 x 60 mm) — the strips lie
      loose on the tray.  Four butted, one column.

  06  picture sequences.  Printed 70 x 70 mm, so MOUNTED they are 90 x 90 and
      still drop into the 10 x 10 cm envelopes the shelf is built around.  Four
      butted 2 x 2, one set to a sheet.
      Four cards a sheet and not eight: a sheet IS a set here ("one sheet is one
      complete set"), and packing set A and set B onto one A4 would save one
      sheet of card at the cost of the only thing that keeps a set together
      before it reaches its envelope.  COLS/ROWS below is where to change that
      if the sheet of card is worth more than the set.  The set is named in the
      top margin, on the paper that gets thrown away, because the source sheet's
      running head does not survive re-imposition.

Scales are not a matter of taste: each is the largest at which the measured ink
inside the source box still stops 4 mm inside the new card edge (impose.py).

Run:   python3 scripts/curriculum/writing-shelf/build_cut_sheets.py
Needs: pikepdf, pypdf, reportlab
"""

import math
import tempfile
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from reportlab.lib.colors import Color
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

import cutmarks as CM
import impose as IMP

HERE = Path(__file__).resolve().parent
SRC = HERE / "src"
REPO = HERE.parents[2]
OUT_DIR = REPO / "public" / "dark-phonics-shelf" / "v2"
FONT_DIR = REPO / "public" / "fonts"

PAGE_W, PAGE_H = 210.0, 297.0
LABEL_C = Color(0.3725, 0.3490, 0.3098)          # #5F594F

# The source boxes are DOT-CENTRE boxes: each old sheet drew its dotted trim
# rectangle exactly on the line I am cutting the piece out along.  Clip 0.6 mm
# inside it (impose.py) and the dots stay behind; the nearest real ink on any of
# these three sheets is 3.5 mm inside its box, so nothing else is lost.
CLIP_INSET = 0.6
FOOT_SIZE = 5.5


def grid_boxes(x0, y0, cols, rows, w, h, top_down=True):
    """Boxes of a butted grid, row-major.  top_down: first row is the top one."""
    out = []
    for r in range(rows):
        yy = y0 + (rows - 1 - r) * h if top_down else y0 + r * h
        for cix in range(cols):
            out.append((x0 + cix * w, yy, x0 + cix * w + w, yy + h))
    return out


# ---------------------------------------------------------------- 04 ------
# Source boxes, measured off the pristine PDF at 254 dpi (dot-centre boxes).
SRC04_CARDS = [(x, y0, x + 60.590, y1)
               for y0, y1 in [(235.760, 271.214), (191.839, 227.293),
                              (147.653, 183.372), (103.733, 139.187)]
               for x in (6.747, 74.745, 142.743)]
SRC04_TILES = [(x, 41.820, x + 34.660, 84.153) for x in (19.711, 87.709, 155.707)]

C04_W, C04_H, C04_COLS, C04_ROWS = 60.0, 35.0, 3, 4
T04_W, T04_H, T04_COLS = 60.0, 42.0, 3       # same width as a card: one grid
BLK04_H = C04_ROWS * C04_H + T04_H                       # 182
Y04 = (PAGE_H - BLK04_H) / 2.0                           # 57.5  tiles sit here
Y04_CARDS = Y04 + T04_H                                  # 99.5
X04 = (PAGE_W - C04_COLS * C04_W) / 2.0                  # 15.0, both blocks

# worst-case ink margins inside a source box (left, bottom, right, top)
INK04_CARDS = (3.5, 10.2, 5.3, 10.6)
INK04_TILES = (12.1, 13.4, 12.1, 13.4)

# ---------------------------------------------------------------- 05 ------
SRC05 = [(9.657, y0, 200.157, y1)
         for y0, y1 in [(223.853, 284.178), (155.855, 216.180),
                        (87.858, 148.183), (19.860, 80.185)]]
C05_W, C05_H, C05_ROWS = 190.0, 60.0, 4
X05 = (PAGE_W - C05_W) / 2.0                             # 10.0
Y05 = (PAGE_H - C05_ROWS * C05_H) / 2.0                  # 28.5
INK05 = (10.5, 17.6, 10.1, 17.6)

# ---------------------------------------------------------------- 06 ------
SRC06 = [(9.60, 72.81, 100.10, 163.31), (109.60, 72.81, 200.10, 163.31),
         (9.60, 172.81, 100.10, 263.31), (109.60, 172.81, 200.10, 263.31)]
C06, C06_COLS, C06_ROWS = 70.0, 2, 2
X06 = (PAGE_W - C06_COLS * C06) / 2.0                    # 35.0
Y06 = (PAGE_H - C06_ROWS * C06) / 2.0                    # 78.5
# 06 is the one sheet whose pieces carry MARKS OF THEIR OWN inside the box: a
# dotted rule and corner ticks sit ~3.7-7.2 mm in from the box line, hugging the
# photograph, and at 70 mm they would land ~4 mm inside the new card and read as
# a second, wrong, cut line.  Measured off the pristine sheet at 600 dpi, the
# photograph itself starts 7.25 mm inside the box, so the clip goes at 7.5 —
# everything outside the picture stays behind, and 0.25 mm of picture edge with
# it.  The content block is then 90.5 - 15 = 75.5 mm and the scale is whatever
# lands it inside a 70 mm card with the 4 mm clearance: (70 - 8) / 75.5.
CLIP_INSET_06 = 7.5
INK06 = (0.0, 0.0, 0.0, 0.0)
SETS06 = ["set A · seed to flower", "set B · egg to hen", "set C · apple to core"]


def s(card_w, card_h, src_box, ink):
    # floored, never rounded: rounding up by 5e-5 puts the clearance a hair
    # under 4 mm and the check below then refuses the build, correctly.
    raw = IMP.clearance_scale(card_w, card_h, src_box[2] - src_box[0],
                              src_box[3] - src_box[1], ink, CM.CONTENT_CLEAR)
    return math.floor(raw * 10000.0) / 10000.0


def clearance(card_w, card_h, src_box, ink, scale):
    sw, sh = src_box[2] - src_box[0], src_box[3] - src_box[1]
    return min(ink[0] * scale + (card_w - sw * scale) / 2.0,
               ink[2] * scale + (card_w - sw * scale) / 2.0,
               ink[1] * scale + (card_h - sh * scale) / 2.0,
               ink[3] * scale + (card_h - sh * scale) / 2.0)


def plan04():
    sc = s(C04_W, C04_H, SRC04_CARDS[0], INK04_CARDS)
    st = s(T04_W, T04_H, SRC04_TILES[0], INK04_TILES)
    dst_c = grid_boxes(X04, Y04_CARDS, C04_COLS, C04_ROWS, C04_W, C04_H)
    dst_t = grid_boxes(X04, Y04, T04_COLS, 1, T04_W, T04_H)
    place = ([(a, b, sc, CLIP_INSET) for a, b in zip(SRC04_CARDS, dst_c)]
             + [(a, b, st, CLIP_INSET) for a, b in zip(SRC04_TILES, dst_t)])
    # one grid: three columns of 60 mm, five rows (four of 35, one of 42)
    xs = [X04 + i * C04_W for i in range(C04_COLS + 1)]
    ys = [Y04, Y04_CARDS] + [Y04_CARDS + j * C04_H for j in range(1, C04_ROWS + 1)]
    return dict(place=place,
                v=[(x, 0.0, PAGE_H) for x in xs],
                h=[(y, 0.0, PAGE_W) for y in ys],
                foot=(X04 + 4.0, 45.0), n=15, unit="piece", labels=None,
                clear=min(clearance(C04_W, C04_H, SRC04_CARDS[0], INK04_CARDS, sc),
                          clearance(T04_W, T04_H, SRC04_TILES[0], INK04_TILES, st)),
                scales=(sc, st),
                note="12 cards 60 x 35 mm + 3 tiles 60 x 42 mm, one 3-column grid, loose in tins")


def plan05():
    sc = s(C05_W, C05_H, SRC05[0], INK05)
    dst = grid_boxes(X05, Y05, 1, C05_ROWS, C05_W, C05_H)
    v, h = CM.grid_lines(X05, Y05, 1, C05_ROWS, C05_W, C05_H, PAGE_W, PAGE_H)
    return dict(place=[(a, b, sc, CLIP_INSET) for a, b in zip(SRC05, dst)], v=v, h=h,
                foot=(X05 + 5.0, 13.0), n=4, unit="strip", labels=None,
                clear=clearance(C05_W, C05_H, SRC05[0], INK05, sc), scales=(sc,),
                note="4 strips 190 x 60 mm, loose on the tray (not mounted)")


def plan06():
    inner = (SRC06[0][2] - SRC06[0][0]) - 2 * CLIP_INSET_06          # 75.5 mm
    sc = math.floor((C06 - 2 * CM.CONTENT_CLEAR) / inner * 10000.0) / 10000.0
    dst = grid_boxes(X06, Y06, C06_COLS, C06_ROWS, C06, C06, top_down=False)
    v, h = CM.grid_lines(X06, Y06, C06_COLS, C06_ROWS, C06, C06, PAGE_W, PAGE_H)
    return dict(place=[(a, b, sc, CLIP_INSET_06) for a, b in zip(SRC06, dst)], v=v, h=h,
                foot=(X06 + 5.0, 60.0), n=4, unit="card", labels=SETS06,
                clear=(C06 - inner * sc) / 2.0, scales=(sc,),
                note="4 cards 70 x 70 mm printed -> 90 x 90 mounted, one set a sheet")


SHEETS = {"04-small-objects.pdf": plan04,
          "05-lined-sentence-strips.pdf": plan05,
          "06-picture-sequences.pdf": plan06}


def check(p):
    bad = []
    fx = p["foot"][0]
    if fx < 14.0 or PAGE_W - fx < 14.0:
        bad.append("the footer starts within 14 mm of a page edge")
    if any(abs(fx - x) < 3.0 for x, _, _ in p["v"]):
        bad.append("the footer starts on a vertical cut line")
    if p["clear"] < CM.CONTENT_CLEAR - 1e-6:
        bad.append("content clearance %.2f mm is under the %.1f mm rule"
                   % (p["clear"], CM.CONTENT_CLEAR))
    for x, y0, y1 in p["v"]:
        if x < CM.SAFE or x > PAGE_W - CM.SAFE:
            bad.append("a vertical cut line at x %.1f breaks the safe margin" % x)
    for y, x0, x1 in p["h"]:
        if y < CM.SAFE or y > PAGE_H - CM.SAFE:
            bad.append("a horizontal cut line at y %.1f breaks the safe margin" % y)
    if bad:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(bad))


def guides(path, p, n_pages):
    c = canvas.Canvas(str(path), pagesize=(PAGE_W * mm, PAGE_H * mm))
    stats = None
    for i in range(n_pages):
        stats = CM.cut_lines(c, p["v"], p["h"], PAGE_W, PAGE_H)
        CM.footer(c, p["foot"][0], p["foot"][1], CM.cards_line(p["n"], p["unit"]),
                  "Andika", FOOT_SIZE)
        if p["labels"]:
            c.saveState()
            c.setFillColor(LABEL_C)
            c.setFont("Andika", FOOT_SIZE)
            c.drawString((X06 + 5.0) * mm, 228.0 * mm,
                         "picture sequence · %s" % p["labels"][i])
            c.restoreState()
        c.showPage()
    c.save()
    return stats


def build():
    pdfmetrics.registerFont(TTFont("Andika", str(FONT_DIR / "Andika-Regular.ttf")))
    print("butted cut sheets -> %s" % OUT_DIR)
    for name, planner in SHEETS.items():
        p = planner()
        check(p)
        src = SRC / name
        if not src.exists():
            raise SystemExit("missing pristine source: %s" % src)
        with tempfile.TemporaryDirectory() as tmp:
            base, over = Path(tmp) / "b.pdf", Path(tmp) / "o.pdf"
            n = IMP.reimpose(src, base, PAGE_W, PAGE_H, p["place"])
            stats = guides(over, p, n)
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
        print("  %-30s %d pp · %d cut lines, %d triangles · scale %s · clearance "
              "%.2f mm · %.0f KB\n      %s"
              % (name, n, stats["lines"], stats["marks"],
                 "/".join("%.4f" % x for x in p["scales"]), p["clear"],
                 out.stat().st_size / 1024.0, p["note"]))


if __name__ == "__main__":
    build()
