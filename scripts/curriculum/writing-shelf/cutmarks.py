#!/usr/bin/env python3
"""
Dark Phonics · Writing Shelf · ONE cutting standard for every card sheet: CUT ONCE

Tredoux, 2026-09-05 late.  The gutter-and-crop-mark version of this file (built
earlier the same day) asked for two cuts per card edge: you cut down one side of
a 5 mm gutter, then down the other, and the strip of waste between them fell out.
That is twice the cutting and twice the chance of a wandering blade.

The standard now is CUT ONCE:

  1. cards BUTT against each other.  No gutters anywhere.
  2. every cut line runs the FULL width or the FULL height of the page, edge to
     edge, so one straight stroke of the blade separates the cards on both sides
     of it at the same time.
  3. the lines are light-grey 0.25 mm HAIRLINES.  They are cut away — the blade
     splits the line and half of a 0.25 mm hairline is 0.125 mm, which is below
     what the eye picks up on a laminated card.  So a line may cross a card edge:
     it IS the card edge.
  4. at both ends of every line, where it meets the margin, a small black
     TRIANGLE points along the line.  That is what you line the blade up on: the
     hairline itself dies in the last few millimetres of any printer, so the
     triangle sits at the 5.5 mm printer-safe margin and survives.
  5. card CONTENT stops 4 mm inside every card edge, so a 1–2 mm drift of the
     blade never touches a photograph or a word.
  6. one footer line: "Cut along every grey line · N cards".

The outer edge of the block is a full-length line like any other, so the outer
margin is trimmed off in the same pass.  What is left of the sheet after the
block is centred is the margin, and that is where the triangles and the footer
live.

There are no crop marks, no dotted rectangles and no ticks anywhere in the set
any more.

Coordinates everywhere are millimetres from the bottom-left of the page.
"""

from reportlab.lib.colors import Color
from reportlab.lib.units import mm

SAFE = 5.5              # printer-safe margin: the triangles sit on it
HAIR_W = 0.25           # mm — the cut line
MARK_H = 2.6            # mm — triangle height, along the line
MARK_W = 2.4            # mm — triangle base, across the line
CONTENT_CLEAR = 4.0     # mm — card content stops this far inside a card edge

HAIR_C = Color(0.7490, 0.7216, 0.6824)   # #BFB8AE  light grey
MARK_C = Color(0.0784, 0.0667, 0.0549)   # #141110  the house ink
FOOT_C = Color(0.5490, 0.5216, 0.4824)   # #8C857B

FOOTER_TEXT = "Cut along every grey line · %s"


# --------------------------------------------------------------------------

def _hair(c, x0, y0, x1, y1):
    c.saveState()
    c.setStrokeColor(HAIR_C)
    c.setLineWidth(HAIR_W * mm)
    c.setLineCap(0)
    c.setDash([])
    c.line(x0 * mm, y0 * mm, x1 * mm, y1 * mm)
    c.restoreState()


def _triangle(c, x, y, dx, dy):
    """Filled triangle with its apex at (x, y), pointing along (dx, dy)."""
    ax, ay = x + dx * 0.0, y + dy * 0.0
    bx, by = x - dx * MARK_H - dy * (MARK_W / 2.0), y - dy * MARK_H + dx * (MARK_W / 2.0)
    cx, cy = x - dx * MARK_H + dy * (MARK_W / 2.0), y - dy * MARK_H - dx * (MARK_W / 2.0)
    c.saveState()
    c.setFillColor(MARK_C)
    c.setStrokeColor(MARK_C)
    p = c.beginPath()
    p.moveTo(ax * mm, ay * mm)
    p.lineTo(bx * mm, by * mm)
    p.lineTo(cx * mm, cy * mm)
    p.close()
    c.drawPath(p, stroke=0, fill=1)
    c.restoreState()


def cut_lines(c, vlines, hlines, page_w, page_h):
    """Draw every cut line edge to edge, with a triangle at each end.

    vlines: (x, y0, y1)   hlines: (y, x0, x1)
    A line end that lands on the PAGE EDGE gets a triangle, pulled in to the
    printer-safe margin so it survives the printer.  An end INSIDE the page gets
    none, and must not: the only sheet with such a line is 04, whose two piece
    sizes cannot share a vertical, and both ends of one of those band lines are
    up against another card — a triangle there would print a black mark on a
    card.  It is not needed either: the full-width horizontal cuts come off
    first, and on the strip that is left the band line already runs edge to edge.
    """
    marks = 0
    for x, y0, y1 in vlines:
        _hair(c, x, y0, x, y1)
        if y0 <= 0.01:
            _triangle(c, x, SAFE, 0, -1)
            marks += 1
        if y1 >= page_h - 0.01:
            _triangle(c, x, page_h - SAFE, 0, 1)
            marks += 1
    for y, x0, x1 in hlines:
        _hair(c, x0, y, x1, y)
        if x0 <= 0.01:
            _triangle(c, SAFE, y, -1, 0)
            marks += 1
        if x1 >= page_w - 0.01:
            _triangle(c, page_w - SAFE, y, 1, 0)
            marks += 1
    return dict(lines=len(vlines) + len(hlines), marks=marks)


def grid_lines(x0, y0, cols, rows, cw, ch, page_w, page_h,
               full_v=True, full_h=True):
    """Cut lines for one butted grid: cols+1 verticals, rows+1 horizontals."""
    xs = [x0 + i * cw for i in range(cols + 1)]
    ys = [y0 + j * ch for j in range(rows + 1)]
    vy = (0.0, page_h) if full_v else (y0, y0 + rows * ch)
    hx = (0.0, page_w) if full_h else (x0, x0 + cols * cw)
    return ([(x, vy[0], vy[1]) for x in xs],
            [(y, hx[0], hx[1]) for y in ys])


def footer(c, x, y, text, font, size):
    c.saveState()
    c.setFillColor(FOOT_C)
    c.setFont(font, size)
    c.drawString(x * mm, y * mm, text)
    c.restoreState()


def cards_line(n, unit="card"):
    return FOOTER_TEXT % ("%d %s%s" % (n, unit, "" if n == 1 else "s"))
