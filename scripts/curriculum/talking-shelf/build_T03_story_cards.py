#!/usr/bin/env python3
"""
Dark Phonics · Talking Shelf · sheet T03, the THREE STORY CARDS (Tray 2)

Tell It, Order It reuses the Writing Shelf's Tray-6 picture sequences — sheet
06, printed TWICE, six envelopes, A A B B C C. Nothing about those twelve
pictures is rebuilt here and nothing about them should be: they are already
made, already cut, already 70 × 70.

What is new is one story card per set. It is TEXT ONLY, and it is not for the
telling — the child tells the story off the pictures. It is the check afterwards,
and it is what the solo child says the story to. Front: the set letter, big
enough to find in a box from across a mat. Back: the four lines.

70 × 70 printed, mounted to 90 × 90 for the 10 × 10 cm envelopes — Rule B, and
the same card as sheet 06 so a story card drops into the same envelope as its
pictures. Four butted on A4, one page of fronts and one of backs; the fourth
slot is blank, because three sets is three sets and a made-up fourth story would
be a fourth work nobody asked for.

DUPLEX SHORT EDGE, imposed like Writing Shelf sheet 03: the back page keeps the
column and flips the row, and each back is drawn rotated 180°.

Run:   python3 scripts/curriculum/talking-shelf/build_T03_story_cards.py
Needs: reportlab, fontTools
"""

from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

import house as H
import cutmarks as CM

NAME = "T03-story-cards.pdf"
PAGE_W, PAGE_H = H.A4_W, H.A4_H
CARD = H.STORY                                  # 70
COLS, ROWS = 2, 2
X0 = (PAGE_W - COLS * CARD) / 2.0               # 35.0
Y0 = (PAGE_H - ROWS * CARD) / 2.0               # 78.5

FIT = CARD - 2 * CM.CONTENT_CLEAR               # 62
LETTER_SIZE = 96.0

LABEL_Y = 277.0
FOOT_Y = 18.0
TEXT_X = 40.0

# Verbatim — these are the four lines of each Tray-6 sequence, and nothing else.
SETS = [
    ("A", ["The seed is in the pot.", "The sprout is up.",
           "The leaves are big.", "The sunflower is out!"]),
    ("B", ["The hen sat on the egg.", "The egg has a crack.",
           "The chick is out.", "The hen and the chick go."]),
    ("C", ["The mouse has an apple.", "The mouse has a bite.",
           "The apple is half.", "The apple is a core!"]),
]


def boxes():
    out = []
    for r in range(ROWS):
        for col in range(COLS):
            out.append((X0 + col * CARD, Y0 + (ROWS - 1 - r) * CARD))
    return out


def grid():
    return CM.grid_lines(X0, Y0, COLS, ROWS, CARD, CARD, PAGE_W, PAGE_H)


def laid_out():
    sizes = []
    for _l, lines in SETS:
        s, _ = H.fit_block(lines, H.CHILD_FONT, FIT, FIT, leading=1.30,
                           para_gap=0.30, hi=24.0)
        sizes.append(s)
    size = min(sizes)
    out = []
    for letter, lines in SETS:
        _s, wrapped = H.fit_block(lines, H.CHILD_FONT, FIT, FIT, leading=1.30,
                                  para_gap=0.30, hi=size, lo=size - 0.01)
        out.append((letter, size, wrapped))
    return out


def check(laid):
    bad = []
    v, h = grid()
    H.check_chrome(bad, PAGE_W, PAGE_H, v, h, TEXT_X,
                   [(LABEL_Y, "label"), (FOOT_Y, "footer")])
    if len(SETS) != 3:
        bad.append("Tray 2 has three sets, A B C")
    if [l for l, _x in SETS] != ["A", "B", "C"]:
        bad.append("the set letters are A, B, C")
    for letter, size, wrapped in laid:
        for line in wrapped:
            if line is None:
                continue
            w = H.w_mm(line, H.CHILD_FONT, size)
            if (CARD - w) / 2.0 < CM.CONTENT_CLEAR:
                bad.append("set %s line %r is %.1f mm and crowds the card edge"
                           % (letter, line, w))
        bh = H.block_height(wrapped, size, leading=1.30, para_gap=0.30)
        if bh > FIT + 1e-6:
            bad.append("set %s back is %.1f mm in a %.1f mm box" % (letter, bh, FIT))
    lw = H.w_mm("A", H.CHILD_FONT, LETTER_SIZE)
    if (CARD - lw) / 2.0 < CM.CONTENT_CLEAR:
        bad.append("the set letter is %.1f mm wide and crowds the card edge" % lw)
    H.done(bad)
    return laid


def build():
    H.register_fonts()
    laid = check(laid_out())
    v, h = grid()
    H.OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = H.OUT_DIR / NAME
    c = canvas.Canvas(str(out), pagesize=(PAGE_W * mm, PAGE_H * mm))
    c.setTitle("Dark Phonics · Talking Shelf · story cards")
    # ---- fronts: the set letter -------------------------------------------
    for i, (letter, _size, _lines) in enumerate(laid):
        x, y = boxes()[i]
        c.saveState()
        c.setFillColor(H.INK)
        c.setFont(H.CHILD_FONT, LETTER_SIZE)
        cap = 0.70 * LETTER_SIZE / 72.0 * 25.4
        c.drawCentredString((x + CARD / 2.0) * mm, (y + (CARD - cap) / 2.0) * mm, letter)
        c.restoreState()
    st = CM.cut_lines(c, v, h, PAGE_W, PAGE_H)
    H.label_and_footer(c, TEXT_X, LABEL_Y,
                       "story cards · tray 2 · FRONTS · 70 × 70 mm printed, 90 × 90 mounted",
                       FOOT_Y, CM.cards_line(3, "card"))
    c.showPage()
    # ---- backs: the four lines, row-flipped and upside down ----------------
    for i, (letter, size, lines) in enumerate(laid):
        r, col = divmod(i, COLS)
        br = H.back_row(r, ROWS)
        x = X0 + col * CARD
        y = Y0 + (ROWS - 1 - br) * CARD
        H.rot180(c, x, y, CARD, CARD)
        bh = H.block_height(lines, size, leading=1.30, para_gap=0.30)
        H.draw_block(c, lines, size, x + CARD / 2.0, y + (CARD + bh) / 2.0,
                     colour=H.INK, font=H.CHILD_FONT, leading=1.30, para_gap=0.30)
        c.restoreState()
    CM.cut_lines(c, v, h, PAGE_W, PAGE_H)
    H.label_and_footer(c, TEXT_X, LABEL_Y,
                       "story cards · tray 2 · BACKS · duplex, flip SHORT EDGE",
                       FOOT_Y, CM.cards_line(3, "card"))
    c.showPage()
    c.save()
    print("story cards -> %s" % H.OUT_DIR)
    print("  %-24s 2 pp · %d cards of %g × %g mm · %d cut lines, %d triangles · %.0f KB"
          % (NAME, len(SETS), CARD, CARD, len(v) + len(h), st["marks"],
             out.stat().st_size / 1024.0))
    print("  back text %.1f pt Fredoka Medium · set letter %.0f pt · one blank slot, on purpose"
          % (laid[0][1], LETTER_SIZE))
    print("  Tray 2 also needs Writing Shelf sheet 06 printed TWICE — six envelopes, A A B B C C.")


if __name__ == "__main__":
    build()
