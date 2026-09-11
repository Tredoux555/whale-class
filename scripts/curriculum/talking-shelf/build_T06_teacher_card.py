#!/usr/bin/env python3
"""
Dark Phonics · Talking Shelf · sheet T06, the TEACHER CARD for Tray 4

Tell Me About It is a ROUTINE, not a shelf work. There is no control of error on
it by design — it is the bridge to conversation and it needs an adult. What it
does have is four rules for the adult, printed, so the routine survives a
supply teacher and a bad morning.

2-UP ON A4 LANDSCAPE, like Writing Shelf sheet 09: two identical A5 cards, one
grey hairline down the middle, edge to edge, with a black triangle at each end.
Two, because one lives on the tray and one lives in your pocket.

Run:   python3 scripts/curriculum/talking-shelf/build_T06_teacher_card.py
Needs: reportlab, fontTools
"""

from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

import house as H
import cutmarks as CM

NAME = "T06-teacher-card.pdf"
PAGE_W, PAGE_H = H.A4L_W, H.A4L_H              # 297 x 210
HALF = PAGE_W / 2.0                            # 148.5
MARGIN = 16.0

TITLE_SIZE = 38.0
BODY_SIZE = 19.0
LEAD = 1.55

FOOT_Y = 10.0
TEXT_X = MARGIN

TITLE = "Tell me about it."
# Verbatim, one rule a line.
RULES = [
    "Say it once, then wait.",
    "Ask one thing only: “What else?”",
    "Say his sentence back to him, correct, as if you agree. Never say no.",
    "Stop when he stops.",
]
FOOTLINE = "Tray 4 · a routine, not a shelf work · there is no control of error here, and that is the point."


def grid():
    """One vertical, edge to edge, and nothing else — sheet 09's cut exactly."""
    return [(HALF, 0.0, PAGE_H)], []


def fitted():
    box_w = HALF - 2 * MARGIN
    size, lines = H.fit_block(RULES, H.ADULT_FONT, box_w, PAGE_H - 2 * MARGIN - 52.0,
                              leading=LEAD, para_gap=0.60, hi=BODY_SIZE,
                              lo=BODY_SIZE - 0.01)
    return size, lines


def check(size, lines):
    bad = []
    v, h = grid()
    H.check_chrome(bad, PAGE_W, PAGE_H, v, h, TEXT_X, [(FOOT_Y, "footer")])
    box_w = HALF - 2 * MARGIN
    if H.w_mm(TITLE, H.CHILD_FONT, TITLE_SIZE) > box_w:
        bad.append("the title is wider than the card")
    for line in lines:
        if line is not None and H.w_mm(line, H.ADULT_FONT, size) > box_w + 1e-6:
            bad.append("rule line %r is wider than the card" % line)
    if len(RULES) != 4:
        bad.append("the routine is four rules, not %d" % len(RULES))
    if MARGIN < CM.SAFE:
        bad.append("the card margin is inside the printer-safe margin")
    if abs(TEXT_X - HALF) < H.LINE_CLEAR:
        bad.append("adult text starts on the centre cut line")
    if H.w_mm(FOOTLINE, H.ADULT_FONT, H.FOOT_SIZE) > HALF - 2 * MARGIN:
        bad.append("the foot line is wider than the card")
    H.done(bad)


def half(c, x0, size, lines):
    c.saveState()
    c.setFillColor(H.INK)
    c.setFont(H.CHILD_FONT, TITLE_SIZE)
    c.drawString((x0 + MARGIN) * mm, (PAGE_H - MARGIN - 24.0) * mm, TITLE)
    c.restoreState()
    c.saveState()
    c.setStrokeColor(H.AMBER)
    c.setLineWidth(0.8 * mm)
    c.line((x0 + MARGIN) * mm, (PAGE_H - MARGIN - 34.0) * mm,
           (x0 + MARGIN + 34.0) * mm, (PAGE_H - MARGIN - 34.0) * mm)
    c.restoreState()
    H.draw_block(c, lines, size, x0 + MARGIN, PAGE_H - MARGIN - 42.0,
                 colour=H.ADULT_C, font=H.ADULT_FONT, leading=LEAD,
                 para_gap=0.60, align="left")
    c.saveState()
    c.setFillColor(H.FOOT_C)
    c.setFont(H.ADULT_FONT, H.FOOT_SIZE)
    c.drawString((x0 + MARGIN) * mm, (MARGIN + 4.0) * mm, FOOTLINE)
    c.restoreState()


def build():
    H.register_fonts()
    size, lines = fitted()
    check(size, lines)
    v, h = grid()
    H.OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = H.OUT_DIR / NAME
    c = canvas.Canvas(str(out), pagesize=(PAGE_W * mm, PAGE_H * mm))
    c.setTitle("Dark Phonics · Talking Shelf · teacher card")
    half(c, 0.0, size, lines)
    half(c, HALF, size, lines)
    st = CM.cut_lines(c, v, h, PAGE_W, PAGE_H)
    CM.footer(c, TEXT_X, FOOT_Y, CM.cards_line(2, "card"), H.ADULT_FONT, H.FOOT_SIZE)
    c.showPage()
    c.save()
    print("teacher card -> %s" % H.OUT_DIR)
    print("  %-22s 1 p · 2 identical cards of %.1f × %g mm · %d cut line, %d triangles · %.0f KB"
          % (NAME, HALF, PAGE_H, len(v) + len(h), st["marks"],
             out.stat().st_size / 1024.0))
    print("  title %.0f pt Fredoka Medium · rules %.1f pt Andika · %d rules"
          % (TITLE_SIZE, size, len(RULES)))


if __name__ == "__main__":
    build()
