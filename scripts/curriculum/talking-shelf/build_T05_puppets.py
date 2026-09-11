#!/usr/bin/env python3
"""
Dark Phonics · Talking Shelf · sheet T05, the TWO STICK PUPPETS (Tray 3)

The cat asks and the potato answers, and those two are not arbitrary: they are
the Dark Phonics cast the children already know off the readers and the song
cards, so a child picking up the cat is picking up somebody, not a shape.

ONE PUPPET A PAGE, A4, upright: a 100 × 200 mm piece — 180 mm of puppet and a
20 mm TAB at the foot for the lolly stick. Cut once, Rule A: four grey hairlines
edge to edge with a black triangle at every page edge, so the piece comes off in
two strokes across and two down and nothing has to be cut round a silhouette.
A puppet cut round its own outline looks better for about a week and then loses
an ear; a rectangle with a tab survives a term.

THE ART IS NOT DRAWN YET. Two Midjourney images are owed — puppet-cat.png and
puppet-potato.png, in phonics-images/satpin-v2/talking-shelf/. Until they land
each page carries a PALE-GREY SILHOUETTE at the size and in the place the real
art will occupy, so the sheet can be printed, cut and used today and reprinted
identically later. When they land:

    python3 scripts/curriculum/talking-shelf/build_T05_puppets.py \
        --art-dir phonics-images/satpin-v2/talking-shelf

Run:   python3 scripts/curriculum/talking-shelf/build_T05_puppets.py
Needs: reportlab, fontTools, Pillow
"""

import argparse
from pathlib import Path

from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

import house as H
import cutmarks as CM

NAME = "T05-puppets.pdf"
PAGE_W, PAGE_H = H.A4_W, H.A4_H
PIECE_W, PIECE_H = 100.0, 200.0
TAB_H = 20.0
BODY_H = PIECE_H - TAB_H                       # 180 mm of puppet
X0 = (PAGE_W - PIECE_W) / 2.0                  # 55.0
Y0 = (PAGE_H - PIECE_H) / 2.0                  # 48.5

LABEL_Y = 277.0
FOOT_Y = 18.0
TEXT_X = 20.0

PUPPETS = [("cat", "The cat asks.", "puppet-cat.png"),
           ("potato", "The potato answers.", "puppet-potato.png")]


def grid():
    return CM.grid_lines(X0, Y0, 1, 1, PIECE_W, PIECE_H, PAGE_W, PAGE_H)


def silhouette(c, kind, x, y, w, h):
    """The stand-in shape, at the size the real puppet will be."""
    c.saveState()
    c.setFillColor(H.PALE)
    c.setStrokeColor(H.PALE_INK)
    c.setLineWidth(0.4 * mm)
    cx = x + w / 2.0
    if kind == "cat":
        body_h = h * 0.62
        c.roundRect((cx - w * 0.34) * mm, y * mm, (w * 0.68) * mm, body_h * mm,
                    w * 0.16 * mm, stroke=1, fill=1)
        hr = w * 0.28
        c.circle(cx * mm, (y + body_h + hr * 0.72) * mm, hr * mm, stroke=1, fill=1)
        for sgn in (-1, 1):
            p = c.beginPath()
            p.moveTo((cx + sgn * hr * 0.30) * mm, (y + body_h + hr * 1.35) * mm)
            p.lineTo((cx + sgn * hr * 0.95) * mm, (y + body_h + hr * 1.95) * mm)
            p.lineTo((cx + sgn * hr * 0.98) * mm, (y + body_h + hr * 1.05) * mm)
            p.close()
            c.drawPath(p, stroke=1, fill=1)
    else:
        c.ellipse((cx - w * 0.40) * mm, (y + h * 0.06) * mm,
                  (cx + w * 0.40) * mm, (y + h * 0.94) * mm, stroke=1, fill=1)
    c.restoreState()


def check(art):
    bad = []
    v, h = grid()
    H.check_chrome(bad, PAGE_W, PAGE_H, v, h, TEXT_X,
                   [(LABEL_Y, "label"), (FOOT_Y, "footer")])
    if abs(BODY_H - 180.0) > 1e-6:
        bad.append("the puppet body is %.1f mm, not the 180 mm asked for" % BODY_H)
    if TAB_H < 20.0:
        bad.append("the lolly-stick tab is %.1f mm, under the 20 mm asked for" % TAB_H)
    if len(PUPPETS) != 2:
        bad.append("this sheet is two puppets, the cat and the potato")
    if art:
        missing = [f for _k, _c, f in PUPPETS if not (art / f).exists()]
        if missing:
            bad.append("--art-dir given but %s missing" % ", ".join(missing))
    H.done(bad)


def build(art_dir=None):
    H.register_fonts()
    art = Path(art_dir).resolve() if art_dir else None
    check(art)
    v, h = grid()
    H.OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = H.OUT_DIR / NAME
    c = canvas.Canvas(str(out), pagesize=(PAGE_W * mm, PAGE_H * mm))
    c.setTitle("Dark Phonics · Talking Shelf · stick puppets")
    marks, placed, placeholders = 0, 0, 0
    for kind, caption, fname in PUPPETS:
        bx = X0 + CM.CONTENT_CLEAR
        by = Y0 + TAB_H
        bw = PIECE_W - 2 * CM.CONTENT_CLEAR
        bh = BODY_H - CM.CONTENT_CLEAR
        src = art / fname if art else None
        if src and src.exists():
            H.draw_image(c, src, bx, by, bw, bh)
            placed += 1
        else:
            silhouette(c, kind, bx, by, bw, bh)
            placeholders += 1
        # the tab: where the lolly stick is taped, marked but not cut
        c.saveState()
        c.setStrokeColor(H.PALE_INK)
        c.setLineWidth(0.25 * mm)
        c.setDash([2 * mm, 2 * mm])
        c.line((X0 + CM.CONTENT_CLEAR) * mm, (Y0 + TAB_H) * mm,
               (X0 + PIECE_W - CM.CONTENT_CLEAR) * mm, (Y0 + TAB_H) * mm)
        c.restoreState()
        c.saveState()
        c.setFillColor(H.FOOT_C)
        c.setFont(H.ADULT_FONT, 7.0)
        c.drawCentredString((X0 + PIECE_W / 2.0) * mm,
                            (Y0 + TAB_H / 2.0 - 1.2) * mm,
                            "TAPE THE LOLLY STICK BEHIND THIS 20 mm TAB")
        c.restoreState()
        st = CM.cut_lines(c, v, h, PAGE_W, PAGE_H)
        marks = st["marks"]
        H.label_and_footer(
            c, TEXT_X, LABEL_Y,
            "stick puppet · tray 3 · %s · %s · %g × %g mm piece, %g mm of puppet"
            % (kind, caption, PIECE_W, PIECE_H, BODY_H),
            FOOT_Y, CM.cards_line(1, "puppet"))
        c.showPage()
    c.save()
    print("stick puppets -> %s" % H.OUT_DIR)
    print("  %-20s %d pp · 1 puppet a page, %g × %g mm piece (%g mm body + %g mm tab) · %d cut lines, %d triangles · %.0f KB"
          % (NAME, len(PUPPETS), PIECE_W, PIECE_H, BODY_H, TAB_H,
             len(v) + len(h), marks, out.stat().st_size / 1024.0))
    print("  %d drawn, %d placeholder silhouette(s)" % (placed, placeholders))
    if placeholders:
        print("  art owed: puppet-cat.png, puppet-potato.png in "
              "phonics-images/satpin-v2/talking-shelf/ — then rerun with --art-dir")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--art-dir", default=None,
                    help="directory holding puppet-cat.png and puppet-potato.png")
    build(ap.parse_args().art_dir)
