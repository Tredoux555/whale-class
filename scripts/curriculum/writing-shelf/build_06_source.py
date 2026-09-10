#!/usr/bin/env python3
"""
Dark Phonics · Writing Shelf · Tray 6 · rebuild the PRISTINE SOURCE sheet from art

WHEN NEW ART LANDS
  1. Name the files seq-A-1.png … seq-A-4.png, seq-B-1…4, seq-C-1…4 (reading
     order: 1 = first in the sequence, 4 = last), square or near-square, >=1024px.
  2. Move the old ones out first:
       mkdir phonics-images/satpin-v2/sequences/_replaced_<YYYY-MM-DD>
       mv phonics-images/satpin-v2/sequences/seq-*.png  .../_replaced_<date>/
     then drop the new twelve into phonics-images/satpin-v2/sequences/.
  3. Rebuild:  python3 scripts/curriculum/writing-shelf/build_06_source.py
            && python3 scripts/curriculum/writing-shelf/build_cut_sheets.py --only 06
  4. Rasterise and look:  pdftoppm -png -r 60 public/dark-phonics-shelf/v2/06-picture-sequences.pdf /tmp/p
     Four pictures a page, 2 x 2, nothing clipped off a picture, cut lines edge to edge.

WHAT THIS WRITES, AND WHY IT IS THE SHAPE IT IS

build_cut_sheets.py does not draw Tray 6; it CUTS four squares out of this file
(SRC06, one 90.5 mm box a quadrant) and re-imposes them butted on a fresh A4.
It clips CLIP_INSET_06 = 7.5 mm inside each box, so the only thing that has to
be right here is where the PHOTOGRAPH sits relative to its box.

Measured off the frozen sheet (the one this replaces): every one of the twelve
pictures is a 75.92 mm square whose lower-left corner is at one of
(16.933 | 116.946, 80.070 | 180.082) mm — i.e. centred in its box with 7.25-7.33
mm of white all round.  That is what IMG_SIDE and the quadrant table below
reproduce, to the tenth of a micron.

The old sheet also carried a dotted trim rectangle ON the picture edge, corner
ticks outside it, a running head and two paragraphs of teacher prose.  NONE of
it is reproduced, deliberately: the 7.5 mm clip lands 0.17-0.25 mm INSIDE the
picture on all four sides, so every one of those marks is thrown away by
build_cut_sheets before it reaches the card, and drawing them again would only
be drawing them to be clipped.  (Arithmetic: box left 9.60 + 7.5 = 17.10 mm,
picture left 16.933 — the clip is already 0.167 mm into the picture.)

Run:   python3 scripts/curriculum/writing-shelf/build_06_source.py
Needs: pikepdf, Pillow
"""

import argparse
import io
from pathlib import Path

import pikepdf
from PIL import Image

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
ART_DIR = REPO / "phonics-images" / "satpin-v2" / "sequences"
OUT = HERE / "src" / "06-picture-sequences.pdf"

PT = 72.0 / 25.4
PAGE_W_PT, PAGE_H_PT = 594.96, 841.92        # the frozen sheet's own media box

SETS = ["A", "B", "C"]
IMG_SIDE = 75.918                            # mm, measured off the frozen sheet
# lower-left of each picture, mm, in reading order: TL, TR, BL, BR
QUADRANTS = [(16.933, 180.082), (116.946, 180.082),
             (16.933, 80.070), (116.946, 80.070)]

JPEG_QUALITY = 92
MIN_PX = 1024


def square(im):
    """Centre-crop to a square.  Already-square art is returned untouched."""
    w, h = im.size
    if w == h:
        return im
    s = min(w, h)
    return im.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s))


def jpeg(path):
    im = Image.open(path)
    im = square(im.convert("RGB"))
    if im.size[0] < MIN_PX:
        print("  ! %s is only %d px square (want >= %d) — it will print soft"
              % (path.name, im.size[0], MIN_PX))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=JPEG_QUALITY, optimize=True, subsampling=0)
    return buf.getvalue(), im.size[0], im.size[1]


def build(art_dir, out_path):
    pdf = pikepdf.new()
    total = 0
    for letter in SETS:
        page = pikepdf.Page(pdf.add_blank_page(page_size=(PAGE_W_PT, PAGE_H_PT)))
        ops = ["q 1 1 1 rg 0 0 %.2f %.2f re f Q" % (PAGE_W_PT, PAGE_H_PT)]
        for i, (x_mm, y_mm) in enumerate(QUADRANTS, start=1):
            src = art_dir / ("seq-%s-%d.png" % (letter, i))
            if not src.exists():
                raise SystemExit("missing art: %s" % src)
            data, w_px, h_px = jpeg(src)
            xobj = pdf.make_stream(data)
            xobj.Type = pikepdf.Name.XObject
            xobj.Subtype = pikepdf.Name.Image
            xobj.Width, xobj.Height = w_px, h_px
            xobj.ColorSpace = pikepdf.Name.DeviceRGB
            xobj.BitsPerComponent = 8
            xobj.Filter = pikepdf.Name.DCTDecode
            nm = page.add_resource(xobj, pikepdf.Name.XObject,
                                   pikepdf.Name("/Seq%s%d" % (letter, i)))
            side = IMG_SIDE * PT
            ops.append("q %.4f 0 0 %.4f %.4f %.4f cm %s Do Q"
                       % (side, side, x_mm * PT, y_mm * PT, nm))
            total += 1
        page.contents_add(pikepdf.Stream(pdf, "\n".join(ops).encode()), prepend=False)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    pdf.save(str(out_path))
    print("pristine source -> %s" % out_path)
    print("  %d pp · %d pictures · %.3f mm square each, centred in its 90.5 mm box"
          % (len(SETS), total, IMG_SIDE))
    print("  %.0f KB · next: build_cut_sheets.py --only 06"
          % (out_path.stat().st_size / 1024.0))


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("--art-dir", default=str(ART_DIR),
                    help="folder holding seq-A-1.png … seq-C-4.png")
    ap.add_argument("--out", default=str(OUT))
    a = ap.parse_args()
    build(Path(a.art_dir), Path(a.out))


if __name__ == "__main__":
    main()
