#!/usr/bin/env python3
"""
Dark Phonics · Writing Shelf · sheet 18, the A4 MAGNETIC SENTENCE MATS

Three A4 LANDSCAPE pages — pink, blue, green — printed onto A4 magnetic sheet.
One page is ONE MAT.  It is never cut, so there is no guide, no crop mark and no
trim line anywhere on it: the page IS the finished object and the only reason a
blade would come near it is a mistake.  Sheet 14's cards are cut; this is not
sheet 14, and nothing from cutmarks.py is imported here on purpose.

WHAT IS PRINTED, AND WHAT IS NOT.  Each page carries its tier's six sentences,
one a row: the sentence's ARTWORK at the left, then an EMPTY ruled line.  NO
WORDS.  The child reads the picture, finds the word cards in the tin, and lays
them on the line himself — which is the whole work, and printing the sentence
under the picture would do it for him.  Sheet 16's felt mat prints the words
because it is the GUIDED mat, the one a child works before he can hold a
sentence in his head; this is the mat that comes after it, and the line is bare.

THE MAT IS A4 BECAUSE THE MAGNET IS.  Sheet 16's mats are A1 felt with a whole
104 x 144 mm card landing a sentence; a magnetic sheet comes A4 and no bigger, so
this one drops the landing and gives the row exactly what a row needs — a picture
box, a start tick, a line.  Six rows of 32.0 mm fill the 192 mm between the
margins with nothing left over, and that is why the row is 32.0 and not a
rounder number.

THE PICTURE BOX IS 62 mm WIDE AND IT IS SET BY ONE DRAWING.  star-sat is the
widest art in the set — 709 x 374 — and at the row's full 32 mm height it comes
to 60.6 mm.  62 clears it with room for a future landscape drawing.  A square-ish
drawing fits its 32 mm height long before it reaches 62 mm and sits about 33 mm
wide with the rest of the box empty: that is CORRECT.  The box is a bound, not a
shape to fill, and the art is LEFT-ALIGNED in it so every row's picture starts on
the same vertical however wide it comes out.  Stretching the small ones to 62
would distort them; centring them would make the left edge of the column wander.

NOTHING PRINTS UNDER 200 dpi.  The art is the full-resolution prepared JPEG in
.build/sentence-builder/ — the one build_14 white-points, ink-trims and resamples
— never the downsampled copy in .build/canvas-jpg/, which exists for a design
canvas and is a quarter of the detail.  Even so, blob-sat is only 399 x 277: at
the box's full 62 mm width it would print at 163 dpi and look like a photocopy of
a photocopy.  So the fit is CAPPED at MIN_DPI and a small drawing prints SMALL
rather than soft.  As it happens the cap does not bite on this set — every one of
the eighteen is height-limited by the 32 mm row before it is dpi-limited, and the
softest is blob-sat at 220 dpi — but it is the bound that makes "62 mm wide" safe
to write down, and the build prints the whole table every time.

THE LINE IS ONE LENGTH.  208.8 mm, from x 70.2 to the right margin, on every row
of every page — NOT sized to the sentence.  A line cut to its sentence tells the
child how many words to expect before he has read the picture, which is a second
answer given away for free.  The one length has to hold the longest run of real
cards, so the build IMPORTS card_w from build_12 and measures every sentence
through the tin's own geometry: the longest, "the sad dad sat in the sand", is
174.6 mm and leaves 34.2 mm spare.  G is READ from build_12.word_space() and
never typed here; if the tin's word space moves, this assertion moves with it.

THE TIER COLOURS ARE IMPORTED.  SB.TIER_C, sheet 14's, and the hexes are not
re-declared anywhere in this file.  verify() reads the colours back out of the
finished PDF's content streams and compares them to SB.TIER_C, so a drift
between the deck and the mat cannot survive a build.

Run:   python3 scripts/curriculum/writing-shelf/build_18_sentence_mats.py
Needs: reportlab, Pillow, pikepdf; pdftoppm (poppler) and pdftotext for the proof
       and the text check.  build_14 must have run at least once — this sheet
       reads its prepared art and does not re-prepare it.
"""

import base64
import hashlib
import shutil
import zlib
import subprocess
import sys
from pathlib import Path

import pikepdf
from PIL import Image
from reportlab.lib.colors import Color
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:            # build_12/14 import each other by name
    sys.path.insert(0, str(HERE))

import build_12_word_card_tin as W12          # noqa: E402  the card measure
import build_14_sentence_builder_cards as SB  # noqa: E402  the sentences, TIER_C

REPO = HERE.parents[2]
OUT_DIR = REPO / "public" / "dark-phonics-shelf" / "v2"
ART_DIR = HERE / ".build" / "sentence-builder"
PROOF_DIR = HERE / ".build" / "proof"
NAME = "18-sentence-mats.pdf"

PDF_TITLE = "Dark Phonics · Writing Shelf · sentence mats"
PDF_AUTHOR = W12.PDF_AUTHOR             # the set's, never re-typed
PRINT_NOTE = (
    "Dark Phonics · The Writing Shelf · Tray 5, sentence work — print 1-up onto "
    "A4 magnetic sheet, landscape, 100%, single-sided. One page is one mat: it "
    "prints whole and stays whole. There is no guide line on it and it is never "
    "taken to a blade."
)

# ------------------------------------------------------------- the sheet ----
PAGE_W, PAGE_H = 297.0, 210.0           # exact A4 LANDSCAPE
MARGIN = 9.0                            # mm, all four sides
USE_W = PAGE_W - 2 * MARGIN             # 279.0
USE_H = PAGE_H - 2 * MARGIN             # 192.0

ROWS = 6
ROW_H = 32.0                            # mm — 6 x 32 IS the 192 mm of usable height

# --------------------------------------------------------------- the row ----
# Every x below is measured from the ROW's left edge, which is the page margin,
# so the arithmetic reads the same as a ruler laid on the printed mat.
BOX_W, BOX_H = 62.0, 32.0               # the picture box; see the docstring
TICK_X, TICK_W = 68.0, 1.2              # the start tick's LEFT edge, and its width
LINE_X = 70.2                           # the line's left end — 1.0 mm of paper
LINE_W = USE_W - LINE_X                 # 208.8, and it is the same on every row
LINE_T = 1.2                            # mm thick

# THE CARD BAND is build_12's card, 28.0 mm tall, centred in the 32 mm row: the
# tick is drawn to it, so a card laid against the tick sits square in the row.
# BASELINE is build_12's too — the card's coloured rule has its TOP on the
# baseline, so the mat's line has its top there as well and a laid card covers
# it exactly.  Both are IMPORTED; neither is a number chosen here.
BAND_H = W12.CARD_H                     # 28.0
BAND_Y = (ROW_H - BAND_H) / 2.0         # 2.0 mm — up from the row's bottom edge
BASELINE = W12.BASELINE                 # 9.0 mm — up from the band's bottom edge

DIV_T = 0.25                            # mm — the row divider, a true hairline
DIV_C = Color(0.92, 0.92, 0.92)         # 8% black: it separates, it does not rule

# ------------------------------------------------------------- adult text ----
# The ONLY type on the page, in sheet 12's voice, at sheet 12's size and in its
# grey.  It sits in the bottom margin because the rows fill the page exactly:
# check() asserts it clears the 5.5 mm printer-safe margin BELOW it and row 6's
# picture ABOVE it, which is the whole of what the 9 mm has to hold.
ADULT_FONT = W12.ADULT_FONT
FOOT_SIZE = W12.FOOT_SIZE               # 5.5
FOOT_X = MARGIN                         # the caption starts on the picture column
FOOT_Y = 6.4                            # mm — baseline.  The 9 mm margin leaves
#                                         a window of 6.26 to 6.63: Andika's own
#                                         ascent and descent at 5.5 pt are what
#                                         close it, and check() re-derives both.
FOOT_C = W12.LABEL_C                    # #5F594F, the set's adult grey
SAFE = 5.5                              # mm — printer-safe margin (cutmarks.SAFE)

CAPTION = ("sentence mat · %s · one sentence a row — the word cards go on the "
           "rule, left to right from the tick")

# ---------------------------------------------------------------- the art ----
MIN_DPI = 200.0                         # nothing prints softer than this, ever

TIERS = (1, 2, 3)


# ---------------------------------------------------------------- layout ----
def rows_of(tier):
    """The tier's six sentences, in SENTENCE_BUILDER_CARDS order.

    Grouped by the GROUP tier — the tray the card sits in — which is what puts
    the carried fox-box card on the BLUE mat beside the blue words it is worked
    with, even though sheet 14 gives it a pink frame.
    """
    return [(slug, sentence) for slug, group, sentence, _art, _frame in SB.CARDS
            if group == tier]


def row_y(i):
    """(bottom, top) of row i, 0 being the top row.  Stacked from the top margin."""
    top = PAGE_H - MARGIN - i * ROW_H
    return top - ROW_H, top


def art_path(slug):
    p = ART_DIR / ("%s.jpg" % slug)
    if not p.exists():
        raise SystemExit(
            "missing prepared art: %s\n  run build_14_sentence_builder_cards.py "
            "first — this sheet reads its .build art and never re-prepares it."
            % p)
    return p


def fit(px):
    """CONTAIN the art in the picture box, then cap it at MIN_DPI.

    Returns (w_mm, h_mm, dpi, capped).  One scale for both axes, so the aspect
    is never touched; the cap only ever makes the drawing SMALLER.
    """
    w, h = px
    s = min(BOX_W / float(w), BOX_H / float(h))     # mm per pixel, contain
    cap = 25.4 / MIN_DPI                            # mm per pixel at exactly MIN_DPI
    capped = s > cap
    s = min(s, cap)
    return w * s, h * s, 25.4 / s, capped


def art_table():
    """Every row of every page, measured: slug, tier, sentence, px, mm, dpi."""
    out = []
    for tier in TIERS:
        for slug, sentence in rows_of(tier):
            p = art_path(slug)
            with Image.open(p) as im:
                px = im.size
            dw, dh, dpi, capped = fit(px)
            out.append((slug, tier, sentence, p, px, dw, dh, dpi, capped))
    return out


# ---------------------------------------------------------------- measure ----
def run_mm(sentence):
    """The sentence as REAL CARDS: build_12's measured widths, butted."""
    return sum(W12.card_w(word) for word in sentence.split())


def check_runs():
    """Every sentence's card run must fit the one line.  Returns the tightest."""
    bad, margins = [], []
    for slug, _tier, sentence, _p, _px, _w, _h, _d, _c in art_table():
        run = run_mm(sentence)
        margins.append((LINE_W - run, slug, sentence, run))
        if run > LINE_W + 1e-9:
            bad.append("%s: %r is %.1f mm of card and the line is %.1f mm"
                       % (slug, sentence, run, LINE_W))
    if bad:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(bad))
    return sorted(margins)


# ------------------------------------------------------------------ check ----
def check():
    """The geometry, before a single mark is made."""
    bad = []
    if abs(ROWS * ROW_H - USE_H) > 1e-9:
        bad.append("%d rows of %.1f mm do not fill the %.1f mm of usable height"
                   % (ROWS, ROW_H, USE_H))
    if abs(LINE_X + LINE_W - USE_W) > 1e-9:
        bad.append("the line does not end on the right margin")
    if abs(LINE_W - 208.8) > 1e-9:
        bad.append("the line is %.3f mm, not 208.8" % LINE_W)
    if BOX_W > TICK_X - 1e-9:
        bad.append("the picture box runs into the start tick")
    if TICK_X + TICK_W > LINE_X + 1e-9:
        bad.append("the start tick runs into the line")
    if BAND_Y < 0 or BAND_Y + BAND_H > ROW_H + 1e-9:
        bad.append("the %.1f mm card band does not sit inside the row" % BAND_H)
    if BASELINE - LINE_T < 0 or BASELINE > BAND_H:
        bad.append("the line does not sit inside the card band")
    # THE ART MUST CLEAR star-sat.  This is the number the box was set by, and
    # it is asserted rather than trusted because the art can be re-prepared.
    widest = max((fit(px)[0], slug) for slug, _t, _s, _p, px, *_r in art_table())
    if widest[0] > BOX_W + 1e-9:
        bad.append("%s is drawn %.2f mm wide, over the %.1f mm box"
                   % (widest[1], widest[0], BOX_W))
    # THE CAPTION: it lives in the bottom margin, and the bottom margin is all
    # it gets.  Below it, the printer-safe margin; above it, row 6's picture.
    asc, desc = pdfmetrics.getAscentDescent(ADULT_FONT, FOOT_SIZE)
    floor = FOOT_Y + desc / 72.0 * 25.4          # desc is negative
    head = FOOT_Y + asc / 72.0 * 25.4
    if floor < SAFE - 1e-9:
        bad.append("the caption's descenders reach %.2f mm, inside the %.1f mm "
                   "printer-safe margin" % (floor, SAFE))
    if head > MARGIN - 1e-9:
        bad.append("the caption's ascenders reach %.2f mm, into row 6 at %.1f mm"
                   % (head, MARGIN))
    if "cut" in CAPTION.lower() or "cut" in PRINT_NOTE.lower():
        bad.append("the adult text says 'cut'; this mat is never cut")
    if bad:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(bad))
    return floor, head


# ------------------------------------------------------------------ draw ----
def draw_row(c, i, slug, jpg, dw, dh, colour):
    bot, _top = row_y(i)
    left = MARGIN
    # the picture: left-aligned in the box, vertically centred in the row
    c.drawImage(str(jpg), left * mm, (bot + (ROW_H - dh) / 2.0) * mm,
                width=dw * mm, height=dh * mm, mask=None)
    band_bot = bot + BAND_Y
    c.saveState()
    c.setFillColor(colour)
    # the start tick
    c.rect((left + TICK_X) * mm, band_bot * mm, TICK_W * mm, BAND_H * mm,
           stroke=0, fill=1)
    # the line — its TOP on the baseline, where a laid card's own rule sits
    c.rect((left + LINE_X) * mm, (band_bot + BASELINE - LINE_T) * mm,
           LINE_W * mm, LINE_T * mm, stroke=0, fill=1)
    c.restoreState()


def draw_page(c, tier, table):
    colour = SB.TIER_C[tier]
    rows = [r for r in table if r[1] == tier]
    for i, (slug, _t, _s, jpg, _px, dw, dh, _d, _c) in enumerate(rows):
        draw_row(c, i, slug, jpg, dw, dh, colour)
    # the dividers: BETWEEN rows only — never on the head of row 1 or the foot
    # of row 6, where a line would read as a border round the mat.
    c.saveState()
    c.setFillColor(DIV_C)
    for i in range(1, ROWS):
        y = row_y(i)[1]
        c.rect(MARGIN * mm, (y - DIV_T / 2.0) * mm, USE_W * mm, DIV_T * mm,
               stroke=0, fill=1)
    c.restoreState()
    c.saveState()
    c.setFillColor(FOOT_C)
    c.setFont(ADULT_FONT, FOOT_SIZE)
    c.drawString(FOOT_X * mm, FOOT_Y * mm, CAPTION % SB.TIER_NAME[tier])
    c.restoreState()


# ----------------------------------------------------------------- verify ----
def embedded_jpeg(obj):
    """The JPEG bytes AS THEY WERE WRITTEN, out of an image XObject.

    reportlab ASCII85-wraps the DCTDecode stream, so the raw buffer is not the
    file's bytes and a naive hash of it matches nothing.  Every filter BEFORE
    the DCTDecode is undone here and the DCT stream itself is handed back
    untouched — which is the original JPEG, byte for byte, so the row can be
    hashed against the source file rather than trusted by its name.
    """
    data = bytes(obj.get_raw_stream_buffer())
    filters = obj.get("/Filter")
    names = ([str(filters)] if isinstance(filters, pikepdf.Name)
             else [str(f) for f in (filters or [])])
    for name in names:
        if name == "/ASCII85Decode":
            data = base64.a85decode(data, adobe=True)
        elif name == "/FlateDecode":
            data = zlib.decompress(data)
        elif name == "/DCTDecode":
            return data                  # the JPEG itself; stop here
        else:
            raise SystemExit("VERIFY FAILURE: unexpected image filter %s" % name)
    raise SystemExit("VERIFY FAILURE: an embedded image is not a JPEG")


def _ops(page):
    """(operator, operands) of a page's content stream, flattened."""
    return [(str(op), list(operands))
            for operands, op in pikepdf.parse_content_stream(page)]


def verify(pdf, table):
    """Read the FINISHED PDF back and prove every claim this file makes."""
    bad = []
    want_pt = (PAGE_W / 25.4 * 72.0, PAGE_H / 25.4 * 72.0)
    src_hash = {}
    for slug, _t, _s, p, *_r in table:
        src_hash.setdefault(hashlib.sha256(p.read_bytes()).hexdigest(), set()).add(slug)

    with pikepdf.open(pdf) as doc:
        if len(doc.pages) != 3:
            bad.append("%d pages, not 3" % len(doc.pages))
        seen_hashes, drawn = set(), []
        for pno, page in enumerate(doc.pages):
            mb = [float(v) for v in page.MediaBox]
            w, h = mb[2] - mb[0], mb[3] - mb[1]
            if abs(w - want_pt[0]) > 0.01 or abs(h - want_pt[1]) > 0.01:
                bad.append("page %d is %.2f x %.2f mm, not %.0f x %.0f"
                           % (pno + 1, w / 72 * 25.4, h / 72 * 25.4, PAGE_W, PAGE_H))
            xobj = page.Resources.get("/XObject", {})
            ops = _ops(page)
            # --- geometry: every mark on this page is a filled rect or an image
            cm, rects, images, colours = None, [], [], []
            for op, a in ops:
                if op == "cm":
                    cm = [float(x) for x in a]
                elif op == "re":
                    rects.append([float(x) for x in a])
                elif op == "Do":
                    images.append((str(a[0]), cm))
                elif op == "rg":
                    colours.append(tuple(round(float(x), 6) for x in a))
                elif op in ("S", "s", "B", "B*", "b", "b*"):
                    bad.append("page %d strokes a path (%s) — nothing on this "
                               "mat is stroked, and a stroke is how a guide "
                               "line would get here" % (pno + 1, op))
            if len(rects) != ROWS * 2 + (ROWS - 1):
                bad.append("page %d draws %d rects, not the %d ticks, lines and "
                           "dividers" % (pno + 1, len(rects), ROWS * 2 + ROWS - 1))
            for x, y, rw, rh in rects:
                x, y, rw, rh = (v / 72.0 * 25.4 for v in (x, y, rw, rh))
                if (x < MARGIN - 1e-6 or y < MARGIN - 1e-6
                        or x + rw > PAGE_W - MARGIN + 1e-6
                        or y + rh > PAGE_H - MARGIN + 1e-6):
                    bad.append("page %d: a rect at %.2f,%.2f %.2fx%.2f mm breaks "
                               "the %.1f mm margin" % (pno + 1, x, y, rw, rh, MARGIN))
            # --- the pictures: the right drawing, in the right row, sharp
            if len(images) != ROWS:
                bad.append("page %d draws %d images, not %d"
                           % (pno + 1, len(images), ROWS))
            rows = [r for r in table if r[1] == TIERS[pno]]
            order = sorted(images, key=lambda im: -im[1][5])     # top row first
            for i, (name, m) in enumerate(order):
                if i >= len(rows):
                    break
                slug, _t, _s, _p, px, dw, dh, dpi, _c = rows[i]
                obj = xobj[name]
                if str(obj.Subtype) != "/Image":
                    bad.append("page %d row %d holds a %s, not an image"
                               % (pno + 1, i + 1, obj.Subtype))
                    continue
                hsh = hashlib.sha256(embedded_jpeg(obj)).hexdigest()
                seen_hashes.add(hsh)
                if slug not in src_hash.get(hsh, set()):
                    bad.append("page %d row %d does not hold %s's source file — "
                               "the embedded JPEG hashes to %s..."
                               % (pno + 1, i + 1, slug, hsh[:16]))
                if int(obj.Width) != px[0] or int(obj.Height) != px[1]:
                    bad.append("%s is embedded at %dx%d, not %dx%d"
                               % (slug, int(obj.Width), int(obj.Height), *px))
                gw, gh = m[0] / 72.0 * 25.4, m[3] / 72.0 * 25.4
                if abs(gw - dw) > 0.01 or abs(gh - dh) > 0.01:
                    bad.append("%s is drawn %.2f x %.2f mm, not %.2f x %.2f"
                               % (slug, gw, gh, dw, dh))
                eff = max(px[0] / gw, px[1] / gh) * 25.4
                if eff < MIN_DPI - 1e-6:
                    bad.append("%s prints at %.0f dpi, under %.0f"
                               % (slug, eff, MIN_DPI))
                if abs(m[4] / 72.0 * 25.4 - MARGIN) > 0.01:
                    bad.append("%s is not left-aligned on the %.1f mm margin"
                               % (slug, MARGIN))
                drawn.append((slug, gw, gh, eff))
            # --- the colours: sheet 14's, read back out of the stream
            tc = SB.TIER_C[TIERS[pno]]
            want = {tuple(round(v, 6) for v in (tc.red, tc.green, tc.blue)),
                    tuple(round(v, 6) for v in (DIV_C.red, DIV_C.green, DIV_C.blue)),
                    tuple(round(v, 6) for v in (FOOT_C.red, FOOT_C.green, FOOT_C.blue))}
            if set(colours) != want:
                bad.append("page %d sets %s; the tier colour, the divider grey "
                           "and the adult grey are %s"
                           % (pno + 1, sorted(set(colours)), sorted(want)))
        if len(seen_hashes) != ROWS * 3:
            bad.append("%d distinct images embedded, not %d"
                       % (len(seen_hashes), ROWS * 3))
        meta = " ".join(str(v) for v in doc.docinfo.values()) if doc.docinfo else ""
    # --- no page of this PDF may say "cut"
    if shutil.which("pdftotext"):
        txt = subprocess.run(["pdftotext", str(pdf), "-"], check=True,
                             capture_output=True, text=True).stdout
        if "cut" in txt.lower():
            bad.append("the word 'cut' appears in the PDF text")
    else:
        bad.append("no pdftotext: the 'cut' check did not run")
    if "cut" in meta.lower():
        bad.append("the word 'cut' appears in the PDF metadata")
    if bad:
        raise SystemExit("VERIFY FAILURE:\n  " + "\n  ".join(bad))
    return drawn


# ------------------------------------------------------------------ proof ----
def proof(pdf):
    """Each mat to PNG at 150 dpi: mat-pink.png, mat-blue.png, mat-green.png.

    These are .build/proof/ files.  The felt mats' proofs of the same name live
    under public/dark-phonics-shelf/v2/mats/ and are a different sheet's; this
    build never writes there.
    """
    if not shutil.which("pdftoppm"):
        return None
    PROOF_DIR.mkdir(parents=True, exist_ok=True)
    made = []
    for i, tier in enumerate(TIERS, start=1):
        stem = PROOF_DIR / ("mat-%s" % SB.TIER_NAME[tier])
        subprocess.run(["pdftoppm", "-r", "150", "-png", "-f", str(i), "-l",
                        str(i), "-singlefile", str(pdf), str(stem)],
                       check=True, capture_output=True)
        made.append(Path(str(stem) + ".png"))
    return made


# ------------------------------------------------------------------ build ----
def build():
    W12.register_fonts()
    W12.SIZE, W12.SIZE_FROM = W12.word_size()   # card_w measures off the real font
    n_src = SB.check_source()
    table = art_table()
    floor, head = check()
    margins = check_runs()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / NAME
    c = canvas.Canvas(str(out), pagesize=(PAGE_W * mm, PAGE_H * mm))
    c.setTitle(PDF_TITLE)
    c.setAuthor(PDF_AUTHOR)
    c.setSubject(PRINT_NOTE)
    for tier in TIERS:
        draw_page(c, tier, table)
        c.showPage()
    c.save()

    drawn = verify(out, table)
    made = proof(out)

    # ------------------------------------------------------------- report ----
    print("sentence mats -> %s" % OUT_DIR)
    print("  %-22s %d pp · A4 landscape %.0f x %.0f mm · %d rows a page of "
          "%.1f mm · %d bytes"
          % (NAME, len(TIERS), PAGE_W, PAGE_H, ROWS, ROW_H, out.stat().st_size))
    print("  source of truth %s: %d sentence cards, matched"
          % (SB.SOURCE_TS.name, n_src))
    print("  NEVER CUT: no guide, no crop mark, no trim line; nothing is "
          "stroked and the word 'cut' is nowhere in the PDF")
    print("  margin %.1f mm · picture box %.0f x %.0f left-aligned · tick "
          "%.1f mm at x %.1f · line %.1f mm thick, %.1f mm long, x %.1f to the "
          "right margin, %.1f mm up the %.1f mm band"
          % (MARGIN, BOX_W, BOX_H, TICK_W, TICK_X, LINE_T, LINE_W, LINE_X,
             BASELINE, BAND_H))
    print("  tier colours imported from %s; read back out of all three content "
          "streams and matched" % Path(SB.__file__).name)
    print("  caption: Andika %.1f pt at y %.1f — ink %.2f to %.2f mm, clear of "
          "the %.1f mm safe margin and of row 6 at %.1f"
          % (FOOT_SIZE, FOOT_Y, floor, head, SAFE, MARGIN))
    print("  the line holds every real card run (G = %.3f mm, build_12.word_space)"
          % W12.word_space())
    print("      tightest  %-13s %-28s %6.1f mm of card, %5.1f mm spare"
          % (margins[0][1], margins[0][2], margins[0][3], margins[0][0]))
    print("      loosest   %-13s %-28s %6.1f mm of card, %5.1f mm spare"
          % (margins[-1][1], margins[-1][2], margins[-1][3], margins[-1][0]))
    print("  art from %s (the prepared full-resolution JPEGs, not .build/canvas-jpg)"
          % ART_DIR.relative_to(REPO))
    caps = 0
    for slug, tier, sentence, _p, px, dw, dh, dpi, capped in table:
        caps += bool(capped)
        print("      %-6s %-13s %-28s %9s  %5.1f x %5.1f mm  %4.0f dpi%s"
              % (SB.TIER_NAME[tier], slug, sentence, "%dx%d" % px, dw, dh, dpi,
                 "  CAPPED at %.0f dpi" % MIN_DPI if capped else ""))
    lo = min(table, key=lambda r: r[7])
    hi = max(table, key=lambda r: r[7])
    print("      softest %s at %.0f dpi · sharpest %s at %.0f dpi · floor %.0f "
          "· %d capped"
          % (lo[0], lo[7], hi[0], hi[7], MIN_DPI, caps))
    print("  %d distinct images embedded, one a row, each matched to its source "
          "file BY HASH" % (ROWS * 3))
    if made:
        print("  proof %s: %s" % (PROOF_DIR.relative_to(REPO),
                                  ", ".join(p.name for p in made)))
    else:
        print("  ! no pdftoppm: the proofs were NOT rendered")


if __name__ == "__main__":
    build()
