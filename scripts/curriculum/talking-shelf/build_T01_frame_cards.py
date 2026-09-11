#!/usr/bin/env python3
"""
Dark Phonics · Talking Shelf · sheet T01, the FOUR FRAME CARDS

A frame card stands at the back of every tray on this shelf. The sentence is
given; the child fills the gap. That is the first of the four ideas the page
opens with, and it is the reason a Mandarin-L1 four-year-old can get a sentence
out at all — a frame, not a blank page.

100 × 140 mm, PRINTED AT FINISHED SIZE and UNMOUNTED. These do not go into a
card stand and they do not go into an envelope, so Rule B's minus-20-mm does not
apply to them; they lean at the back of the tray where the child can read them
from where he is sitting, which is why the type is as large as the card allows.

ONE CARD A PAGE, and not four. Two columns of 100 mm leave a 5 mm margin and the
cut line would sit inside the 5.5 mm printer-safe margin — the one number on
this shelf that is not negotiable. Two rows of 140 mm leave 8.5 mm, which build
12 already argued cannot hold the footer. So: 100 × 140 centred on A4, margins
55 mm at the sides and 78.5 mm head and foot, four pages, one card each.

Run:   python3 scripts/curriculum/talking-shelf/build_T01_frame_cards.py
Needs: reportlab, fontTools
"""

from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

import house as H
import cutmarks as CM

NAME = "T01-frame-cards.pdf"
PAGE_W, PAGE_H = H.A4_W, H.A4_H
CARD_W, CARD_H = H.FRAME_W, H.FRAME_H
X0 = (PAGE_W - CARD_W) / 2.0            # 55.0
Y0 = (PAGE_H - CARD_H) / 2.0            # 78.5

TRAY_SIZE = 7.0                          # pt — the tray number, small, on purpose
LABEL_Y = 277.0
FOOT_Y = 18.0
TEXT_X = 20.0

# Verbatim. Nothing on this sheet is paraphrased.
CARDS = [
    (1, "BEHIND THE SCREEN", [
        "The ___ is ON the ___.",
        "The ___ is IN the ___.",
        "The ___ is NEXT TO the ___.",
    ]),
    (2, "TELL IT, ORDER IT", [
        "FIRST…",
        "THEN…",
        "NEXT…",
        "LAST…",
    ]),
    (3, "PUPPET TALK", [
        "WHO is it?",
        "WHAT can it do?",
        "WHERE is it?",
        "IS it ___?",
    ]),
    (4, "TELL ME ABOUT IT", [
        "Tell me about it.",
        "What else?",
    ]),
]

FIT_W = CARD_W - 2 * CM.CONTENT_CLEAR    # 92
BAND = 12.0                              # the head band the tray line lives in
FIT_H = CARD_H - 2 * CM.CONTENT_CLEAR - BAND   # 120


def grid():
    return CM.grid_lines(X0, Y0, 1, 1, CARD_W, CARD_H, PAGE_W, PAGE_H)


def laid_out():
    """One (size, lines) per card, each fitted to its own card."""
    out = []
    for tray, title, lines in CARDS:
        size, wrapped = H.fit_lines(lines, H.CHILD_FONT, FIT_W, FIT_H,
                                    leading=1.30, para_gap=0.70, hi=30.0)
        out.append((tray, title, size, wrapped))
    return out


def check(laid):
    bad = []
    v, h = grid()
    H.check_chrome(bad, PAGE_W, PAGE_H, v, h, TEXT_X,
                   [(LABEL_Y, "label"), (FOOT_Y, "footer")])
    for tray, title, size, wrapped in laid:
        for line in wrapped:
            if line is None:
                continue
            w = H.w_mm(line, H.CHILD_FONT, size)
            if (CARD_W - w) / 2.0 < CM.CONTENT_CLEAR:
                bad.append("tray %d line %r is %.1f mm and crowds the card edge"
                           % (tray, line, w))
        bh = H.block_height(wrapped, size, leading=1.30, para_gap=0.70)
        if bh > FIT_H + 1e-6:
            bad.append("tray %d block is %.1f mm in a %.1f mm box" % (tray, bh, FIT_H))
        if size < 14.0:
            bad.append("tray %d had to drop to %.1f pt — too small to read across a tray"
                       % (tray, size))
    if len(CARDS) != 4:
        bad.append("this sheet is four frame cards, one per tray")
    H.done(bad)
    return laid


def build():
    H.register_fonts()
    laid = check(laid_out())
    v, h = grid()
    H.OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = H.OUT_DIR / NAME
    c = canvas.Canvas(str(out), pagesize=(PAGE_W * mm, PAGE_H * mm))
    c.setTitle("Dark Phonics · Talking Shelf · frame cards")
    marks = 0
    for tray, title, size, wrapped in laid:
        # the tray number, small, at the head of the card
        c.saveState()
        c.setFillColor(H.FOOT_C)
        c.setFont(H.ADULT_FONT, TRAY_SIZE)
        c.drawCentredString((X0 + CARD_W / 2.0) * mm,
                            (Y0 + CARD_H - CM.CONTENT_CLEAR - 5.0) * mm,
                            "TRAY %d · %s" % (tray, title))
        c.restoreState()
        bh = H.block_height(wrapped, size, leading=1.30, para_gap=0.70)
        top = Y0 + CM.CONTENT_CLEAR + (FIT_H - bh) / 2.0 + bh
        H.draw_block(c, wrapped, size, X0 + CARD_W / 2.0, top,
                     colour=H.INK, font=H.CHILD_FONT, leading=1.30, para_gap=0.70)
        st = CM.cut_lines(c, v, h, PAGE_W, PAGE_H)
        marks = st["marks"]
        H.label_and_footer(c, TEXT_X, LABEL_Y,
                           "frame card · tray %d · %s · 100 × 140 mm, unmounted"
                           % (tray, title.lower()),
                           FOOT_Y, CM.cards_line(1, "card"))
        c.showPage()
    c.save()
    print("frame cards -> %s" % H.OUT_DIR)
    print("  %-26s %d pp · 1 card a page of %g × %g mm · %d cut lines, %d triangles · %.0f KB"
          % (NAME, len(CARDS), CARD_W, CARD_H, len(v) + len(h), marks,
             out.stat().st_size / 1024.0))
    for tray, title, size, wrapped in laid:
        print("  tray %d %-22s %.1f pt · %d lines" % (tray, title.lower(), size,
                                                      len([l for l in wrapped if l])))


if __name__ == "__main__":
    build()
