#!/usr/bin/env python3
"""
Dark Phonics · Writing Shelf · Tray 7 · blank 8-page fold-book template

Run:   python3 scripts/curriculum/writing-shelf/build_07_fold_book.py
Needs: reportlab
Out:   public/dark-phonics-shelf/v2/07-fold-book-template.pdf

WHY IT IS THE SHAPE IT IS

PAGE 1 is the child's sheet and carries NOTHING a child has to read.  The old
sheet printed a running head and a print instruction along the top edge and a
caption across the middle; because the top row of panels is upside down, the
head landed inside p5/p4 and the caption ran across p7/p8/p4/p3 -- printed text
sitting in the blank writing space.  All of that has moved to PAGE 2, the
teacher sheet.  The only ink left inside a panel is two handwriting lines, the
MY BOOK cover, and the 5 pt p-numbers at the extreme gutter edge.

The panel grid MUST fill the sheet edge to edge: the folds are halves of the
paper, so a reserved margin strip would put the creases off the panel lines.
That is why the instructions get their own page rather than a footer band.

LAYOUT (standard one-sheet zine, A4 landscape, 2 rows x 4 columns)
  bottom row, upright, left->right : p6 p7 p8 p1   (p1 = front cover)
  top row, rotated 180, left->right: p5 p4 p3 p2
  The ONE cut is the horizontal centre line and it spans ONLY the middle two
  columns (x = W/4 .. 3W/4).  Full width would drop the sheet into two halves.
  Everything else -- the three verticals and the two outer stubs of the centre
  line -- is a grey dashed FOLD.

INK
  fold      grey  dashed 3/3
  cut       amber solid, heavier, with scissors glyph
  baseline  dark  solid
  midline   grey  dotted 1/2   (deliberately NOT amber -- amber means cut)
"""

from pathlib import Path

from reportlab.lib.colors import Color
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas

W, H = landscape(A4)          # 841.89 x 595.28
COL = W / 4.0
ROW = H / 2.0

OUT = (Path(__file__).resolve().parents[3]
       / "public" / "dark-phonics-shelf" / "v2" / "07-fold-book-template.pdf")

INK   = Color(0.078, 0.067, 0.055)
AMBER = Color(0.898, 0.631, 0.106)
FOLD  = Color(0.71, 0.70, 0.70)
MID   = Color(0.80, 0.79, 0.78)
FAINT = Color(0.66, 0.65, 0.64)

PAD        = 13.0    # side margin inside a panel
BASE_LO    = 77.4    # lower baseline, panel-local y
BASE_HI    = 178.5   # upper baseline, panel-local y
XHEIGHT    = 9.0     # midline sits this far above its baseline


# ---------------------------------------------------------------- page 1

def writing_lines(c):
    """Two handwriting lines, in the panel's own coordinate frame."""
    for base in (BASE_LO, BASE_HI):
        c.setStrokeColor(MID)
        c.setLineWidth(0.8)
        c.setDash(1, 2)
        c.line(PAD, base + XHEIGHT, COL - PAD, base + XHEIGHT)
        c.setDash()
        c.setStrokeColor(INK)
        c.setLineWidth(1.3)
        c.line(PAD, base, COL - PAD, base)


def cover(c):
    """p1 -- the front cover, in the panel's own coordinate frame."""
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 34)
    c.drawCentredString(COL / 2.0, 219.0, "MY BOOK")
    c.setFont("Helvetica", 12)
    c.drawCentredString(COL / 2.0, 196.0, "a book by")
    c.setStrokeColor(INK)
    c.setLineWidth(1.1)
    c.setDash()
    c.line(21, 89.3, COL - 21, 89.3)


def panel(c, col, row, page):
    """Draw one panel.  row 0 = bottom (upright), row 1 = top (rotated 180)."""
    c.saveState()
    if row == 0:
        c.translate(col * COL, 0)
    else:
        c.translate((col + 1) * COL, H)
        c.rotate(180)
    if page == 1:
        cover(c)
    else:
        writing_lines(c)
    # NO page number here.  Page 1 carries nothing a child could read; the
    # page map lives on the teacher sheet instead.
    c.restoreState()


def page_one(c):
    # panels
    for col, page in enumerate((6, 7, 8, 1)):
        panel(c, col, 0, page)
    for col, page in enumerate((5, 4, 3, 2)):
        panel(c, col, 1, page)

    # fold lines: three verticals, full height
    c.setStrokeColor(FOLD)
    c.setLineWidth(0.8)
    c.setDash(3, 3)
    for i in (1, 2, 3):
        c.line(i * COL, 0, i * COL, H)
    # fold lines: the two outer stubs of the centre line
    c.line(0, ROW, COL, ROW)
    c.line(3 * COL, ROW, W, ROW)
    c.setDash()

    # THE ONE CUT -- middle two columns only
    c.setStrokeColor(AMBER)
    c.setLineWidth(1.6)
    c.line(COL, ROW, 3 * COL, ROW)
    # no scissors glyph: Helvetica has no U+2702 and it would print as a stray
    # quote mark INSIDE a panel.  Solid amber against grey dashes is the signal.
    c.showPage()


# ---------------------------------------------------------------- page 2

def mini(c, x, y, w, h, folds_v=(), folds_h=(), slit=None, fill=True):
    """A small picture of the sheet.  folds_* are fractions of w / h."""
    if fill:
        c.setFillColor(Color(1, 1, 1))
        c.rect(x, y, w, h, stroke=0, fill=1)
    c.setStrokeColor(INK)
    c.setLineWidth(1.0)
    c.setDash()
    c.rect(x, y, w, h, stroke=1, fill=0)
    c.setStrokeColor(FOLD)
    c.setLineWidth(0.8)
    c.setDash(2, 2)
    for f in folds_v:
        c.line(x + f * w, y, x + f * w, y + h)
    for f in folds_h:
        c.line(x, y + f * h, x + w, y + f * h)
    c.setDash()
    if slit:
        a, b, f = slit
        c.setStrokeColor(AMBER)
        c.setLineWidth(2.0)
        c.line(x + a * w, y + f * h, x + b * w, y + f * h)


def arrow(c, x1, y1, x2, y2):
    c.setStrokeColor(FAINT)
    c.setFillColor(FAINT)
    c.setLineWidth(1.2)
    c.setDash()
    c.line(x1, y1, x2, y2)
    dx, dy = x2 - x1, y2 - y1
    n = (dx * dx + dy * dy) ** 0.5 or 1.0
    ux, uy = dx / n, dy / n
    bx, by = x2 - 6 * ux, y2 - 6 * uy      # base of the head
    px, py = -uy * 3.2, ux * 3.2           # perpendicular
    p = c.beginPath()
    p.moveTo(x2, y2)
    p.lineTo(bx + px, by + py)
    p.lineTo(bx - px, by - py)
    p.close()
    c.drawPath(p, stroke=0, fill=1)


def step(c, x, y, n, caption, draw):
    cw = 246.0
    c.setFillColor(AMBER)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(x, y + 138, str(n))
    c.setFillColor(INK)
    c.setFont("Helvetica", 9.5)
    tx = c.beginText(x + 14, y + 138)
    tx.setLeading(11.5)
    for line in caption:
        tx.textLine(line)
    c.drawText(tx)
    c.saveState()
    draw(c, x + 14, y)
    c.restoreState()
    return cw


def d1(c, x, y):
    mini(c, x, y + 30, 120, 85, folds_v=(0.5,))
    arrow(c, x + 118, y + 20, x + 62, y + 20)


def d2(c, x, y):
    mini(c, x, y + 30, 60, 85, folds_v=(0.5,))
    arrow(c, x + 58, y + 20, x + 31, y + 20)


def d3(c, x, y):
    mini(c, x, y + 30, 30, 85, folds_h=(0.5,))
    arrow(c, x + 45, y + 32, x + 45, y + 70)


def d4(c, x, y):
    mini(c, x, y + 38, 150, 70, folds_v=(0.25, 0.5, 0.75),
         folds_h=(0.5,), slit=(0.25, 0.75, 0.5))
    c.setFillColor(AMBER)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(x, y + 24, "cut ONLY the amber line")
    c.setFillColor(INK)
    c.setFont("Helvetica", 8)
    c.drawString(x, y + 13, "it stops at the fold lines either side")


def d5(c, x, y):
    mini(c, x, y + 55, 150, 38, folds_v=(0.25, 0.5, 0.75))
    c.setStrokeColor(AMBER)
    c.setLineWidth(2.0)
    c.line(x + 37.5, y + 93, x + 112.5, y + 93)
    arrow(c, x + 75, y + 40, x + 75, y + 52)


def d6(c, x, y):
    # the slit has opened into a diamond, seen from above
    cx, cy = x + 60, y + 75
    c.setStrokeColor(INK)
    c.setLineWidth(1.0)
    c.setDash()
    for dx, dy in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
        c.rect(cx + (0 if dx > 0 else -42), cy + (0 if dy > 0 else -30),
               42, 30, stroke=1, fill=0)
    arrow(c, x + 6, y + 75, x + 16, y + 75)
    arrow(c, x + 114, y + 75, x + 104, y + 75)
    c.setFillColor(INK)
    c.setFont("Helvetica", 8)
    c.drawString(x, y + 22, "then flatten it, MY BOOK on")
    c.drawString(x, y + 12, "the outside, and crease the spine")


STEPS = [
    (["Fold the sheet in half, short edge to",
      "short edge. Crease it hard."], d1),
    (["Fold in half again the same way.",
      "You now have four columns."], d2),
    (["Fold in half the other way, across.",
      "Eight panels are creased. Open flat."], d3),
    (["Open flat. Cut the amber line in the",
      "middle — and nothing else."], d4),
    (["Open out, then fold the whole sheet",
      "in half the long way. The slit is on top."], d5),
    (["Push the two ends towards each other:",
      "the slit opens into a diamond."], d6),
]


def page_two(c):
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(40, H - 46, "How to fold the book")
    c.setFont("Helvetica", 9.5)
    c.setFillColor(FAINT)
    c.drawString(40, H - 62,
                 "Dark Phonics · Writing Shelf · Tray 6 · "
                 "TEACHER SHEET — print page 1 only for the children")
    c.setFillColor(INK)
    c.setFont("Helvetica", 10)
    c.drawString(40, H - 84,
                 "Print page 1 at 100% — never “fit to page.” "
                 "A4 landscape, plain 100–120 gsm, one-sided. "
                 "Grey dashes are folds; the amber line is the only cut.")

    y_rows = (H - 300, H - 490)
    for i, (caption, draw) in enumerate(STEPS):
        col, row = i % 3, i // 3
        step(c, 46 + col * 256, y_rows[row], i + 1, caption, draw)

    page_map(c, 46, 34)
    c.showPage()


def page_map(c, x, y):
    """Which panel is which page.  Page 1 itself is unlabelled on purpose."""
    w, h = 340.0, 56.0
    cw, ch = w / 4.0, h / 2.0
    c.setStrokeColor(FOLD)
    c.setLineWidth(0.8)
    c.setDash()
    c.rect(x, y, w, h, stroke=1, fill=0)
    c.setDash(2, 2)
    for i in (1, 2, 3):
        c.line(x + i * cw, y, x + i * cw, y + h)
    c.line(x, y + ch, x + cw, y + ch)
    c.line(x + 3 * cw, y + ch, x + w, y + ch)
    c.setDash()
    c.setStrokeColor(AMBER)
    c.setLineWidth(1.6)
    c.line(x + cw, y + ch, x + 3 * cw, y + ch)

    c.setFillColor(INK)
    c.setFont("Helvetica", 11)
    for i, p in enumerate((6, 7, 8, 1)):
        c.drawCentredString(x + (i + 0.5) * cw, y + 9, "p%d" % p)
    for i, p in enumerate((5, 4, 3, 2)):
        c.saveState()
        c.translate(x + (i + 1) * cw, y + h)
        c.rotate(180)
        c.drawCentredString(cw / 2.0, 9, "p%d" % p)
        c.restoreState()
    tx = x + w + 16
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 9.5)
    c.drawString(tx, y + 46, "Page map")
    c.setFillColor(FAINT)
    c.setFont("Helvetica", 8.5)
    c.drawString(tx, y + 33,
                 "Where each page falls on the sheet. Page 1 of the PDF is "
                 "printed blank — no p-numbers, nothing")
    c.drawString(tx, y + 21,
                 "for a child to read — so check the order against this. "
                 "The top row prints upside down; that is correct.")
    c.setFillColor(AMBER)
    c.drawString(tx, y + 9,
                 "p1 is the front cover. The amber line is the only cut. "
                 "Make six in advance.")


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=(W, H))
    c.setTitle("Dark Phonics - Writing Shelf - blank fold-book template")
    c.setAuthor("Montree")
    page_one(c)
    page_two(c)
    c.save()
    print("wrote", OUT)


if __name__ == "__main__":
    main()
