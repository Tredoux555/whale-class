#!/usr/bin/env python3
"""
Dark Phonics · Writing Shelf · sheet 09, the one cut that is a line and not a grid

Everything else in the set is now re-imposed butted by build_flip_cards.py
(02, 03), build_cut_sheets.py (04, 05, 06) and build_backup_object_cards.py (11).
09 is the leftover: a single A4 landscape sheet cut once down the middle into two
A5 teacher script cards.  Its two halves ARE the page, so there is nothing to
re-impose — the cut is already one straight stroke, edge to edge, which is what
the whole standard is trying to achieve everywhere else.

This is an OVERLAY on a pristine copy in ./src/ (the v2 generator is lost), and
it does three things:

  1. whites out the two short black ticks the old sheet printed at the ends of
     the cut, since the standard's marker is a triangle;
  2. draws the standard light-grey 0.25 mm hairline down the centre, edge to
     edge, solid over the old dotted line (same colour, 0.25 covers 0.265);
  3. puts a triangle at each end, at the 5.5 mm printer-safe margin.

Idempotent by construction — the input is always ./src/, never the published
file, so running it twice cannot double anything.

Run:   python3 scripts/curriculum/writing-shelf/add_cut_guides.py
Needs: reportlab, pypdf
"""

import tempfile
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from reportlab.lib.colors import Color
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

import cutmarks as CM

HERE = Path(__file__).resolve().parent
SRC = HERE / "src"
REPO = HERE.parents[2]
OUT_DIR = REPO / "public" / "dark-phonics-shelf" / "v2"

WHITE = Color(1, 1, 1)
NAME = "09-teacher-script-card.pdf"
CUT_X = 148.565          # measured off the pristine sheet: the dotted line centre
OLD_TICKS = [(3.4, 7.3), (202.6, 206.3)]   # y bands of the old black end ticks

UNTOUCHED = {
    "01-sound-frame-mat.pdf": "own generator, build_sound_frame_mat.py",
    "02-chain-cards.pdf": "build_flip_cards.py — butted 80 x 120 mm",
    "03-dictation-photo-cards.pdf": "build_flip_cards.py — butted 80 x 120 mm",
    "04-small-objects.pdf": "build_cut_sheets.py — butted 60 x 35 / 60 x 42 mm",
    "05-lined-sentence-strips.pdf": "build_cut_sheets.py — butted 190 x 60 mm",
    "06-picture-sequences.pdf": "build_cut_sheets.py — butted 70 x 70 mm",
    "07-fold-book-template.pdf": "one fold/cut line, already drawn in amber",
    "08-story-dictation-sheet.pdf": "no cut",
    "10-grammar-pack.pdf": "left as shipped — its token boxes still need measuring",
    "11-backup-object-cards.pdf": "build_backup_object_cards.py — butted 50 x 50 mm",
}


def overlay(path, w, h):
    c = canvas.Canvas(str(path), pagesize=(w * mm, h * mm))
    c.setFillColor(WHITE)
    for y0, y1 in OLD_TICKS:
        c.rect((CUT_X - 0.9) * mm, y0 * mm, 1.8 * mm, (y1 - y0) * mm, stroke=0, fill=1)
    stats = CM.cut_lines(c, [(CUT_X, 0.0, h)], [], w, h)
    c.showPage()
    c.save()
    return stats


def main():
    src = SRC / NAME
    if not src.exists():
        raise SystemExit("missing pristine source: %s" % src)
    reader = PdfReader(str(src))
    writer = PdfWriter()
    tmp = Path(tempfile.gettempdir()) / "writing-shelf-09.tmp.pdf"
    page = reader.pages[0]
    w = float(page.mediabox.width) / 72 * 25.4
    h = float(page.mediabox.height) / 72 * 25.4
    stats = overlay(tmp, w, h)
    page.merge_page(PdfReader(str(tmp)).pages[0])
    writer.add_page(page)
    for pg in writer.pages:
        pg.compress_content_streams()
    out = OUT_DIR / NAME
    with open(out, "wb") as fh:
        writer.write(fh)
    print("cut guides ->", OUT_DIR)
    print("  %-30s 1 pp · %.1f x %.1f mm · 1 full-height cut line at x %.3f · "
          "%d triangles · %.0f KB"
          % (NAME, w, h, CUT_X, stats["marks"], out.stat().st_size / 1024.0))
    print("left alone / built elsewhere:")
    for name, why in UNTOUCHED.items():
        print("  %-32s %s" % (name, why))


if __name__ == "__main__":
    main()
