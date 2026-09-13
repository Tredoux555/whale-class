#!/usr/bin/env python3
"""
Dark Phonics · Writing Shelf · sheet 23, THE PICTURE TILE BOX

Sheet 22 prints a dashed 44 mm square at the left of every sentence frame and
waits for something to land on it.  This is the something.  A box of 44 mm
picture tiles — ONE OBJECT A TILE, no word printed anywhere — that the child
chooses from before he builds.  He takes a tile, lays it on the landing, and the
sentence he then makes out of his word cards is a sentence ABOUT SOMETHING.  That
is the whole of the work: sheet 20 gave him a shape with nothing to say, sheet 21
lets him draw his own subject, and this box hands him one.

NO WORD IS PRINTED ON A TILE, AND THAT IS DELIBERATE.  A tile with `cat` under
the picture would hand him the noun card he is supposed to go and find, and the
work would collapse into matching.  The picture is the only thing on the tile.
verify() extracts the text layer of the page and refuses the build unless what
comes out is the adult caption at the foot and nothing else.

EVERY TILE IS A NOUN THE TIN HOLDS, and check() proves it against build_12's own
word list rather than against a second copy of it.  A picture of something he has
no card for is a dead end — he would choose it, go to the tin, and find nothing —
so the tin is the gate.  The tin holds thirty nouns; twenty-two of them have a
photograph in the picture bank and are printed here.  The eight that do not are
NAMED IN THE REPORT every build, so what is missing is a line of output and not
something to be rediscovered: blob, cats, cot, dad, hill, moths, sand, tip.

ONE SOURCE, ONE STYLE.  Every photograph comes from docs/picture-bank/photos,
whose house rule is a single object on a plain ground, so twenty-two tiles laid
out on a table look like one material and not like a scrapbook.  Nothing is taken
from the sentence art in .build/sentence-builder: that art draws a whole SENTENCE
— the cat SITTING, the ant DIGGING — and a tile that already shows the verb is a
tile that has answered the question.  A tile shows a thing, and what the thing
does is his to decide.

THE CROP IS TAKEN ROUND THE OBJECT AND THE TILE IS NEVER CROPPED TO SQUARE.  The
bank's photographs are mostly 3:2 and the tile is square, and the obvious move —
crop a square out of the middle — was measured and thrown away: the crab's own
ink is 1214 px across a frame 896 tall, the ant's 1148, the penguin's 1259, so a
square crop would take a blade to thirteen of the twenty-two objects.  Instead
the DEAD MARGIN is cropped and nothing else.  The object's extent is read off the
IMAGE'S OWN INK — deviation from the ground, summed along each axis, cut at the
0.3% and 99.7% of mass so a soft vignette or a spread shadow cannot drag the box
out to the frame edge — padded a little, and that crop is then CONTAINED in the
tile's field at its own aspect.  Nothing is ever cut off, the object is as large
as a 44 mm tile can carry it, and the grounds mostly crop away with the margin,
which is the second reason to do it this way.

CONTENT STOPS 4 mm INSIDE EVERY TILE EDGE, which is this set's own rule for a cut
card, and here it does a second job.  The bank's grounds are not all the same
white; some are a light warm grey.  Butted edge to edge with no gutter, tile
grounds of slightly different tone would read as patchwork.  The 4 mm of paper
each side turns each photograph into a picture ON a card — the grounds never
touch — and it keeps a wandering blade off the photograph, which is what the rule
was for.  The photograph is therefore a 36 mm square field in a 44 mm tile.

TWO BLANK TILES FINISH THE PAGE, AND THEY ARE NOT WASTE.  Four tiles fit across
A4 and six down: twenty-four cells for twenty-two photographs.  The two that are
left print as blank 44 mm tiles, cut like the rest, for the child to DRAW HIS OWN
SUBJECT on — sheet 21's drawing box in the hand, and the same two tiles are where
the missing nouns go when their art exists.

Run:   python3 scripts/curriculum/writing-shelf/build_23_picture_tiles.py
Needs: reportlab, pikepdf, numpy, Pillow; pdftoppm and pdftotext (poppler).
"""

import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
import pikepdf
from PIL import Image
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import build_12_word_card_tin as W12          # noqa: E402  the tin, and the gate
import build_21_frames_picture as F21         # noqa: E402  the landing this fills
import cutmarks as CM                         # noqa: E402  the cutting standard

REPO = HERE.parents[2]
BANK = REPO / "docs" / "picture-bank" / "photos"
OUT_DIR = REPO / "public" / "dark-phonics-shelf" / "v2"
ART_DIR = HERE / ".build" / "picture-tiles"
PROOF_DIR = HERE / ".build" / "proof"
SCRATCH = HERE / ".build" / "scratch"
NAME = "23-picture-tiles.pdf"

PDF_TITLE = "Dark Phonics · Writing Shelf · picture tiles"
PDF_AUTHOR = W12.PDF_AUTHOR
PRINT_NOTE = (
    "Dark Phonics · The Writing Shelf · Tray 5, free composition — print 1-up "
    "onto A4, portrait, 100%, single-sided, onto 250 gsm card. Laminate, then "
    "cut along every grey line for twenty-two picture tiles and two blank ones, "
    "44 mm square. They land on the dashed square of sheet 22 and they carry NO "
    "WORD: the child chooses a tile, then goes to his word tins for the noun."
)

# THE SOURCE OF EVERY TILE, named once.  `star` takes the bank's REPLACED file
# and not its live star.jpg, which is a starfruit — the right shape and the
# wrong thing, and a child reading `star` should not be shown fruit.  The bank
# is not edited from here; this file states which frame it uses and why.
STAR = "star.replaced-1784789837207.8455.jpg"
TILES = [
    "ant", "bed", "bell", "box", "cat", "chick", "chip", "crab",
    "fish", "fox", "frog", "hen", "moth", "mud", "penguin", "pig",
    "pup", "star", "sun", "top", "tub", "wig",
]
SOURCE = {w: (BANK / w / ("%s.jpg" % w)) for w in TILES}
SOURCE["star"] = BANK / "star" / STAR

# ------------------------------------------------------------------ page ----
PAGE_W, PAGE_H = F21.PAGE_W, F21.PAGE_H         # the frames' page, imported
MARGIN = F21.MARGIN                             # and the frames' margin
TILE = F21.PIC                          # 44.0 — sheet 22's landing, imported
COLS, ROWS = 4, 6                       # 24 cells: 22 photographs and 2 blanks
INSET = 4.0                             # mm — the set's own content-stops-inside
FIELD = TILE - 2.0 * INSET              # 36.0 — the photograph's square
MIN_DPI = 300                           # the floor a tile may be drawn at
CAP_DPI = 400                           # and the ceiling it is prepared to: the
                                        # bank's frames are 900+ dpi in a 36 mm
                                        # field, which is six megabytes of detail
                                        # no printer will lay down and nobody can
                                        # see.  Capping here, once, at prepare
                                        # time, is the whole difference between a
                                        # sheet that opens and one that hangs.

GRID_W, GRID_H = COLS * TILE, ROWS * TILE       # 176 x 264
GRID_X = (PAGE_W - GRID_W) / 2.0                # 17.0 — centred across the page
GRID_TOP = PAGE_H - MARGIN                      # 289.0 — hung from the top margin
GRID_BOT = GRID_TOP - GRID_H                    # 25.0

ADULT_FONT, FOOT_SIZE, FOOT_C = F21.ADULT_FONT, F21.FOOT_SIZE, F21.FOOT_C
FOOT_AIR, SAFE = F21.FOOT_AIR, F21.SAFE
CLEAR_DPI, CLEAR_MIN = F21.CLEAR_DPI, F21.CLEAR_MIN

CAPTION = ("picture tiles · %d photographs and %d blanks, %.0f mm square, no word "
           "on any of them — he takes a tile, lays it on the dashed square of "
           "sheet 22 and then goes to his word tins · cut along every grey line")

BG_FLOOR = 10                           # 0-255: deviation from the ground under
                                        # which a pixel carries no mass at all
MASS_Q = 0.003                          # the tail of ink mass cut off each end
PAD_FRAC = 0.04                         # breathing room, as a fraction of the crop


# ------------------------------------------------------------------- art ----
def object_bbox(im):
    """(l, t, r, b) of the OBJECT, read off the picture's own ink.

    The ground is the median of an 8 px ring round the frame — the bank's house
    rule puts one object on a plain ground, so the ring is ground by construction.
    Every pixel gets a WEIGHT, its distance from that ground with anything under
    BG_FLOOR zeroed, and the box is the span holding all but MASS_Q of that
    weight at each end of each axis.  A hard threshold was tried first and a soft
    vignette or a spread shadow dragged the box to the frame edge on eight of the
    twenty-two; mass ignores a wide faint smear and finds the object.
    """
    a = np.asarray(im.convert("RGB")).astype(np.float32)
    h, w, _ = a.shape
    ring = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3),
                           a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)])
    bg = np.median(ring, axis=0)
    dev = np.abs(a - bg).max(axis=2)
    dev = np.where(dev < BG_FLOOR, 0.0, dev)
    if dev.sum() <= 0:
        return (0, 0, w, h), tuple(int(v) for v in bg), 0.0

    def span(v):
        c = np.cumsum(v)
        return (int(np.searchsorted(c, c[-1] * MASS_Q)),
                int(np.searchsorted(c, c[-1] * (1.0 - MASS_Q))) + 1)

    x0, x1 = span(dev.sum(axis=0))
    y0, y1 = span(dev.sum(axis=1))
    cover = float((dev > 0).mean())
    return (x0, y0, min(x1, w), min(y1, h)), tuple(int(v) for v in bg), cover


def object_crop(im, box):
    """The object's box with PAD_FRAC of breathing room, clamped to the frame.

    NOTHING IS EVER CUT OFF: the crop only ever GROWS the object's own box, so the
    returned rectangle contains it whole by construction, and check() re-asserts
    that against the box it was given rather than trusting this sentence.
    """
    w, h = im.size
    l, t, r, b = box
    pad = int(round(PAD_FRAC * max(r - l, b - t)))
    return (max(0, l - pad), max(0, t - pad), min(w, r + pad), min(h, b + pad))


def prepare(force=False):
    """Crop every source square round its object and write the tile art.

    Returns [(word, source, src px, object box, crop box, out path, out px, dpi)].
    """
    ART_DIR.mkdir(parents=True, exist_ok=True)
    out = []
    for word in TILES:
        src = SOURCE[word]
        if not src.exists():
            raise SystemExit("missing source art for %r: %s" % (word, src))
        dst = ART_DIR / ("%s.jpg" % word)
        with Image.open(src) as im:
            im.load()
            spx = im.size
            box, bg, cover = object_bbox(im)
            crop = object_crop(im, box)
            clipped = not (crop[0] <= box[0] and crop[1] <= box[1]
                           and crop[2] >= box[2] and crop[3] >= box[3])
            if force or not dst.exists():
                cut = im.crop(crop).convert("RGB")
                cap = int(round(CAP_DPI * FIELD / 25.4))
                if max(cut.size) > cap:
                    k = cap / float(max(cut.size))
                    cut = cut.resize((max(1, int(round(cut.size[0] * k))),
                                      max(1, int(round(cut.size[1] * k)))),
                                     Image.LANCZOS)
                cut.save(dst, "JPEG", quality=92, optimize=True, subsampling=0)
        with Image.open(dst) as o:
            opx = o.size
        dw, dh = drawn_mm(opx)
        dpi = opx[0] / (dw / 25.4)
        out.append((word, src, spx, box, crop, bg, cover, clipped, dst, opx,
                    dpi, dw, dh))
    return out


def drawn_mm(px):
    """(w, h) in mm of a picture CONTAINED in the tile's square field."""
    k = FIELD / float(max(px))
    return px[0] * k, px[1] * k


# ---------------------------------------------------------------- layout ----
def cell(i):
    """(x0, y0) of cell i, reading across then down."""
    col, row = i % COLS, i // COLS
    return GRID_X + col * TILE, GRID_TOP - (row + 1) * TILE


def field(i):
    """(x0, y0, side) of cell i's photograph field."""
    x, y = cell(i)
    return x + INSET, y + INSET, FIELD


def cut_xs():
    return [GRID_X + c * TILE for c in range(COLS + 1)]


def cut_ys():
    return [GRID_TOP - r * TILE for r in range(ROWS + 1)]


def caption_text():
    return CAPTION % (len(TILES), COLS * ROWS - len(TILES), TILE)


def caption_y():
    down = F21.F20.caption_ink(caption_text())[0]
    return MARGIN + FOOT_AIR - down


def caption_extent():
    down, up = F21.F20.caption_ink(caption_text())
    y = caption_y()
    return y + down, y + up


# ------------------------------------------------------------------ check ----
def tin_nouns():
    """build_12's own noun list — the gate, read from the tin and never re-typed."""
    return sorted(w for key, _l, _s, ws in W12.CATEGORIES if key == "noun" for w in ws)


def check(art):
    """The gate, the grid and the resolution, before a single mark is made."""
    bad = []
    nouns = set(tin_nouns())
    for word in TILES:
        if word not in nouns:
            bad.append("%r is on a tile and is not a noun the tin holds — he would "
                       "choose it and find no card" % word)
        if W12.CLASS_OF.get(word) != "noun":
            bad.append("the tin classes %r as %s, not a noun"
                       % (word, W12.CLASS_OF.get(word)))
    if len(set(TILES)) != len(TILES):
        bad.append("a word is printed on two tiles")
    if len(TILES) > COLS * ROWS:
        bad.append("%d tiles will not fit the %d x %d grid" % (len(TILES), COLS, ROWS))

    for (word, _src, _spx, _box, _crop, _bg, cover, clipped, _dst, opx, dpi,
         dw, dh) in art:
        if clipped:
            bad.append("%r's crop does not contain its whole object box" % word)
        if dpi > CAP_DPI + 1.0:
            bad.append("%r is prepared at %.0f dpi, over the %d dpi cap"
                       % (word, dpi, CAP_DPI))
        if dpi < MIN_DPI:
            bad.append("%r would be drawn at %.0f dpi in a %.1f x %.1f mm picture, "
                       "under the %d dpi floor" % (word, dpi, dw, dh, MIN_DPI))
        if max(dw, dh) > FIELD + 1e-9:
            bad.append("%r's picture is %.1f x %.1f mm, over the %.0f mm field"
                       % (word, dw, dh, FIELD))
        if not 0.01 <= cover <= 0.999:
            bad.append("%r's ink covers %.1f%% of its frame — the ground was "
                       "probably not found" % (word, cover * 100.0))

    if abs(GRID_X * 2.0 + GRID_W - PAGE_W) > 1e-9:
        bad.append("the grid is not centred across the page")
    if GRID_X < MARGIN:
        bad.append("the %d x %.0f mm grid is wider than the page's margins allow"
                   % (COLS, TILE))
    if GRID_BOT < SAFE:
        bad.append("the grid runs past the printer-safe margin")
    floor, head = caption_extent()
    if floor < MARGIN - 1e-9:
        bad.append("the caption's ink falls to %.2f mm, under the %.1f margin"
                   % (floor, MARGIN))
    if head > GRID_BOT - 1e-9:
        bad.append("the caption's ink reaches %.2f mm, into the last cut at %.1f"
                   % (head, GRID_BOT))
    w = pdfmetrics.stringWidth(caption_text(), ADULT_FONT, FOOT_SIZE) / 72.0 * 25.4
    if w > PAGE_W - 2.0 * MARGIN + 1e-9:
        bad.append("the caption is %.1f mm wide, over the measure" % w)
    if INSET < CM.SAFE - SAFE and INSET < 2.0:
        bad.append("a %.1f mm inset does not keep a blade off the photograph" % INSET)

    if bad:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(bad))
    return sorted(nouns - set(TILES))


# ------------------------------------------------------------------- draw ----
def draw_page(c, art, cuts=True):
    for i, rec in enumerate(art):
        dst = rec[8]
        x, y, side = field(i)
        c.drawImage(str(dst), x * mm, y * mm, side * mm, side * mm,
                    preserveAspectRatio=True, anchor="c", mask=None)
    if cuts:
        CM.cut_lines(c, [(x, 0.0, PAGE_H) for x in cut_xs()],
                     [(y, 0.0, PAGE_W) for y in cut_ys()], PAGE_W, PAGE_H)
    c.saveState()
    c.setFillColor(FOOT_C)
    c.setFont(ADULT_FONT, FOOT_SIZE)
    c.drawString(MARGIN * mm, caption_y() * mm, caption_text())
    c.restoreState()


def write_pdf(path, art, cuts=True):
    c = canvas.Canvas(str(path), pagesize=(PAGE_W * mm, PAGE_H * mm))
    c.setTitle(PDF_TITLE)
    c.setAuthor(PDF_AUTHOR)
    c.setSubject(PRINT_NOTE)
    draw_page(c, art, cuts=cuts)
    c.showPage()
    c.save()


# ----------------------------------------------------------------- verify ----
def verify(pdf, clean, art):
    """Read the FINISHED PDF back: one image a tile, in its own field, and no word."""
    bad = []
    want_pt = (PAGE_W / 25.4 * 72.0, PAGE_H / 25.4 * 72.0)
    rgb, K = F21.F20.rgb, 25.4 / 72.0
    worst = (0.0, None)

    with pikepdf.open(pdf) as doc, pikepdf.open(clean) as cdoc:
        if len(doc.pages) != 1:
            bad.append("%d pages, not one" % len(doc.pages))
        page, cpage = doc.pages[0], cdoc.pages[0]
        mb = [float(v) for v in page.MediaBox]
        if (abs(mb[2] - mb[0] - want_pt[0]) > 0.01
                or abs(mb[3] - mb[1] - want_pt[1]) > 0.01):
            bad.append("the page is not %.0f x %.0f mm" % (PAGE_W, PAGE_H))

        # ---- one XObject drawn a tile, at its own field, at the right size
        placed = []
        ctm, stack = (1.0, 0.0, 0.0, 1.0, 0.0, 0.0), []
        for operands, op in pikepdf.parse_content_stream(cpage):
            o, a = str(op), list(operands)
            if o == "q":
                stack.append(ctm)
            elif o == "Q":
                ctm = stack.pop() if stack else ctm
            elif o == "cm":
                ctm = F21.F20._mul(tuple(float(v) for v in a), ctm)
            elif o == "Do":
                placed.append((ctm[4] * K, ctm[5] * K, ctm[0] * K, ctm[3] * K))
        if len(placed) != len(art):
            bad.append("the page draws %d images, not the %d tiles"
                       % (len(placed), len(art)))
        else:
            want = []
            for i, rec in enumerate(art):
                fx, fy, side = field(i)
                dw, dh = rec[11], rec[12]
                want.append((fx + (side - dw) / 2.0, fy + (side - dh) / 2.0,
                             dw, dh, rec[0]))
            placed.sort(key=lambda p: (-round(p[1] + p[3] / 2.0, 1), p[0]))
            want.sort(key=lambda t: (-round(t[1] + t[3] / 2.0, 1), t[0]))
            for (gx, gy, gw, gh), (wx, wy, ww, wh, word) in zip(placed, want):
                if gw > FIELD + 0.02 or gh > FIELD + 0.02:
                    bad.append("%r is drawn %.2f x %.2f mm, over the %.0f mm field"
                               % (word, gw, gh, FIELD))
                d = max(abs(gx - wx), abs(gy - wy), abs(gw - ww), abs(gh - wh))
                worst = max(worst, (d, word))
                if d > 0.05:
                    bad.append("%r is drawn %.2f x %.2f at %.2f,%.2f mm, %.3f off "
                               "the %.2f x %.2f at %.2f,%.2f it was measured for"
                               % (word, gw, gh, gx, gy, d, ww, wh, wx, wy))

        # ---- the cut lines: COLS+1 down the page, ROWS+1 across, house weight
        M = F21.F20.page_marks(page)
        cuts = [s for s in M["strokes"] if s[0] == rgb(CM.HAIR_C)]
        if len(cuts) != COLS + 1 + ROWS + 1:
            bad.append("the page strokes %d cut lines, not the %d the grid needs"
                       % (len(cuts), COLS + 1 + ROWS + 1))
        for _col, wid, pp in cuts:
            if abs(wid - CM.HAIR_W) > 1e-6:
                bad.append("a cut line is %.3f mm wide, not the house %.2f"
                           % (wid, CM.HAIR_W))
        vert = sorted(round(pp[0][0], 2) for _c, _w, pp in cuts
                      if abs(pp[0][0] - pp[1][0]) < 0.01)
        horz = sorted(round(pp[0][1], 2) for _c, _w, pp in cuts
                      if abs(pp[0][1] - pp[1][1]) < 0.01)
        if vert != sorted(round(v, 2) for v in cut_xs()):
            bad.append("the down cuts are at %s, not on the tile columns" % vert)
        if horz != sorted(round(v, 2) for v in cut_ys()):
            bad.append("the across cuts are at %s, not on the tile rows" % horz)

        # ---- the type: ONE adult string, in the adult grey, on the margin
        if len(M["text"]) != 1:
            bad.append("the page sets %d strings, not the caption's one"
                       % len(M["text"]))
        for col, tx, _ty, _nb in M["text"]:
            if col != rgb(FOOT_C):
                bad.append("the page sets type in %s, not the adult grey" % (col,))
            if abs(tx - MARGIN) > 0.01:
                bad.append("the caption sits at x %.2f, not on the margin" % tx)
        if str(doc.docinfo.get("/Title", "")) != PDF_TITLE:
            bad.append("the PDF Title is not this sheet's")
        if str(doc.docinfo.get("/Author", "")) != PDF_AUTHOR:
            bad.append("the PDF Author is not the set's")

    # ---- NO WORD ON ANY TILE, proved off the extracted text layer
    if shutil.which("pdftotext"):
        got = " ".join(subprocess.run(["pdftotext", str(pdf), "-"], check=True,
                                      capture_output=True, text=True).stdout.split())
        want = " ".join(caption_text().split())
        if got != want:
            bad.append("the page's text layer reads %r; the only type on it is the "
                       "foot caption" % got[:120])
    else:
        bad.append("no pdftotext: the no-word-on-a-tile assertion did NOT run")
    if bad:
        raise SystemExit("VERIFY FAILURE:\n  " + "\n  ".join(bad))
    return worst


# -------------------------------------------------------------- clearance ----
def clearance(clean):
    """NOTHING MAY SIT ACROSS A CUT: the inset is 4 mm and the raster is asked to
    agree, on a page drawn without its marks.

    ONLY THE GRID IS MEASURED.  The foot caption is printed on the trim below the
    last across cut and runs from the left margin, so it passes under the first
    down cut on its way — measuring it would report a 0.02 mm clearance for a line
    of adult type that is nowhere near a tile.  The window is the grid rectangle.
    """
    if not shutil.which("pdftoppm"):
        return None
    px = 25.4 / CLEAR_DPI
    stem = SCRATCH / "tiles-clear"
    subprocess.run(["pdftoppm", "-r", str(CLEAR_DPI), "-gray", "-png", "-singlefile",
                    str(clean), str(stem)], check=True, capture_output=True)
    a = np.asarray(Image.open(str(stem) + ".png").convert("L"))
    ink = np.zeros_like(a, dtype=bool)
    r0, r1 = int((PAGE_H - GRID_TOP) / px), int((PAGE_H - GRID_BOT) / px) + 1
    c0, c1 = int(GRID_X / px), int((GRID_X + GRID_W) / px) + 1
    ink[r0:r1, c0:c1] = a[r0:r1, c0:c1] < 250
    ys = PAGE_H - (np.nonzero(ink.any(axis=1))[0] + 0.5) * px
    xs = (np.nonzero(ink.any(axis=0))[0] + 0.5) * px
    tight = (1e9, None)
    for y in cut_ys():
        if len(ys):
            d = float(np.abs(ys - y).min())
            if d < tight[0]:
                tight = (d, "the across cut at %.1f mm" % y)
    for x in cut_xs():
        if len(xs):
            d = float(np.abs(xs - x).min())
            if d < tight[0]:
                tight = (d, "the down cut at %.1f mm" % x)
    if tight[0] < CLEAR_MIN:
        raise SystemExit("VERIFY FAILURE: ink comes within %.3f mm of a cut line "
                         "(%s); %.2f mm is the floor" % (tight[0], tight[1], CLEAR_MIN))
    return tight


def proof(pdf):
    if not shutil.which("pdftoppm"):
        return None
    PROOF_DIR.mkdir(parents=True, exist_ok=True)
    stem = PROOF_DIR / "picture-tiles"
    subprocess.run(["pdftoppm", "-r", "150", "-png", "-singlefile", str(pdf),
                    str(stem)], check=True, capture_output=True)
    return Path(str(stem) + ".png")


# ------------------------------------------------------------------ build ----
def build(force=False):
    W12.register_fonts()
    W12.SIZE, W12.SIZE_FROM = W12.word_size()
    art = prepare(force=force)
    missing = check(art)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    SCRATCH.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / NAME
    write_pdf(out, art)
    clean = SCRATCH / "tiles-nomarks.pdf"
    write_pdf(clean, art, cuts=False)
    worst = verify(out, clean, art)
    tight = clearance(clean)
    made = proof(out)

    blanks = COLS * ROWS - len(TILES)
    print("picture tiles -> %s" % OUT_DIR)
    print("  %-24s 1 p · A4 portrait · %d x %d grid of %.0f mm tiles = %d cells, "
          "%d photographs and %d blanks · %d bytes"
          % (NAME, COLS, ROWS, TILE, COLS * ROWS, len(TILES), blanks,
             out.stat().st_size))
    print("  the tile IS sheet 22's landing: %.0f mm, imported from "
          "build_21_frames_picture.PIC, so a tile covers a dashed square exactly"
          % TILE)
    print("  NO WORD ON ANY TILE: the page's text layer extracts to its foot "
          "caption and nothing else — the picture gives him the subject and the "
          "noun card is still his to find")
    print("  EVERY TILE IS A NOUN THE TIN HOLDS, checked against build_12's own "
          "word list: %d of the tin's %d nouns are printed"
          % (len(TILES), len(tin_nouns())))
    print("  the %d with no photograph in the picture bank, which is what the two "
          "blank tiles are waiting for: %s" % (len(missing), ", ".join(missing)))
    print("  grid %.0f x %.0f mm centred at x %.1f, hung from the %.1f mm top "
          "margin to y %.1f · %d down cuts and %d across, cutmarks' %.2f mm "
          "hairline edge to edge, butted with NO gutter so one stroke of the "
          "blade is one tile edge"
          % (GRID_W, GRID_H, GRID_X, MARGIN, GRID_BOT, COLS + 1, ROWS + 1, CM.HAIR_W))
    print("  content stops %.0f mm inside every tile edge: the photograph is a "
          "%.0f mm square field, so no two grounds ever touch and no blade ever "
          "reaches a photograph" % (INSET, FIELD))
    print("  art prepared into %s — the dead margin cropped away ROUND THE OBJECT, "
          "then contained in the %.0f mm field at its own aspect, %d-%d dpi:"
          % (ART_DIR.relative_to(REPO), FIELD, MIN_DPI, CAP_DPI))
    for word, src, spx, box, crop, bg, cov, _cl, _dst, opx, dpi, dw, dh in art:
        print("    %-9s %4dx%-4d  ink %4d,%-4d-%4d,%-4d (%4.1f%%, ground %s)  crop "
              "%4dx%-4d  drawn %5.1f x %4.1f mm at %4.0f dpi"
              % (word, spx[0], spx[1], box[0], box[1], box[2], box[3],
                 cov * 100.0, "%3d,%3d,%3d" % bg, opx[0], opx[1], dw, dh, dpi))
    print("  NOT ONE OBJECT WAS CROPPED INTO: the crop only ever GROWS the box the "
          "ink was measured into, and check() re-asserts that per tile — a square "
          "crop was measured first and would have cut thirteen of the twenty-two")
    print("  images read back off the content stream and matched to their fields, "
          "worst %.3f mm (%s)" % worst)
    if tight:
        print("  nothing crosses a cut: tightest ink-to-cut %.2f mm (%s) on a %d dpi "
              "raster of the page without its marks; floor %.2f"
              % (tight[0], tight[1], CLEAR_DPI, CLEAR_MIN))
    else:
        print("  ! no pdftoppm: the cut clearance was NOT measured")
    cfloor, chead = caption_extent()
    print("  caption: Andika %.1f pt, one line — ink %.2f to %.2f mm, below the "
          "last cut at %.1f and clear of the %.1f mm margin"
          % (FOOT_SIZE, cfloor, chead, GRID_BOT, MARGIN))
    if made:
        print("  proof %s" % made.relative_to(REPO))


if __name__ == "__main__":
    build(force="--force" in sys.argv)
