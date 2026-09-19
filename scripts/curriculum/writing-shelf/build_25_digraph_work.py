#!/usr/bin/env python3
"""
Dark Phonics · Writing Shelf · sheet 25, THE DIGRAPH WORK MATS
...and the engine sheet 26 (the blend work mats) is built out of.

THE WORK.  He lays a word card run under a picture.  The mat prints the
PICTURE and the parts of the word that are NOT the sound being studied, and
leaves a GAP exactly one tab wide where the sound belongs; he finds that tab in
the tin and drops it into the hole.  `sh__p` is not a fill-in-the-blank
exercise on paper — nothing is written on this mat, ever — it is a three-piece
puzzle whose control of error is LENGTH, the shelf's own control since sheet 24.

THE GAP IS A CARD WIDTH AND NOTHING ELSE.  build_12.card_w() measures a tab on
its own ink plus a word space, to the nearest tenth of a millimetre, and this
sheet calls THAT FUNCTION for the gap — at ITS OWN space, 1.5 mm of paper each
side (TAB_CLEAR), because a digraph tab is not a word standing beside other
words but two letters standing INSIDE one.  A tab cut off sheet 25's tab sheet
drops into the hole on sheet 25's mat because both numbers came out of one
function at one argument.

THE WORD IS ONE WORD, AND THE RULE IS UNBROKEN.  Both were got wrong once and
both were caught on the printed proof.  The letters are typeset as one normally
kerned word (`stick`, never `st i ck`); the tab replaces the digraph's glyphs in
place and the letters beside it move out only by the tab's surplus over their
ink.  The coloured rule runs from the start tick to the end of the row without a
single break — the tab is laid ON it — and the only thing ever cut out of it is
a descender, by sheet 16's knockout.

THREE COLUMNS, SIX ROWS, EIGHTEEN CELLS, A4 LANDSCAPE.  The geometry is the
approved canvas to the millimetre: 9 mm side margins, a 22 mm photograph at the
left of every cell, 6 mm of paper to a 1.2 mm start tick, the tick 28 mm tall
(sheet 12's card height) with the coloured rule 9 mm up it (sheet 12's
baseline), a 59.667 mm writing band, 8 mm between one column's band and the
next column's photograph, rows on a 32 mm pitch from 14 mm off the head.

THE RULE IS THE TIER COLOUR AND THE FRAGMENTS ARE CHARCOAL.  Green #2F7D4F on
the digraph mats, blue #2F5FA6 on the blends.  The fragments are sheet 12's own
#4F4A44, the free-set charcoal: they are PRINTED MATTER the child covers
nothing of, not a ghost he lays a card over, and they must not be mistaken for
the black of a card.

THE CONTROL PRINTS THE SOUND IN PLACE, IN THE TIER COLOUR, in the very slot the
gap left.  Same mat, same everything; the answer is simply there and it is
coloured, so a child checking his work sees the sound and not a word.

NO CUT GUIDES ON A MAT.  A mat is never cut and never laminated (the tabs are
laid on it and lifted off it all day; a laminated mat slides).  The TAB sheet
carries the cut guides, and it carries sheet 12's cutting standard exactly:
butted strips 28 mm tall, one full-width hairline a boundary, 2 mm ticks at
every card edge, triangles on the printer-safe margin.

A WORD IS ON A MAT ONLY IF THERE IS REAL ART FOR IT.  The gate is
docs/picture-bank/photos/<word>/, the live picture library by way of
docs/picture-bank/live-bank-art.json, and phonics-images/; the rule is the
owner's own — A THREE-YEAR-OLD WOULD NAME THIS PICTURE WITH THIS WORD, photo
or scene or circle-time card alike — and NOTHING IS EVER INVENTED: a group
whose pool is
thin comes out a SHORT PAGE with empty trailing cells — no picture, no rule, no
tick — and every word the gate turned away is named in the build report.  That
list is the commission for the next batch of artwork and it is the reason this
builder prints it every run rather than hiding it.

THE PHOTOGRAPH IS PREPARED BY SHEET 23'S METHOD, imported: the floor is read
off the picture's own border ring, the dead margin is cropped away, and the
crop is CONTAINED in the 22 mm field at its own aspect so nothing is ever cut
off.  No tile is drawn under 220 dpi and check() refuses the build otherwise.

THE TAB SHEET'S COUNT IS A SUM OVER EVERY MAT IN THE SET.  Sheet 25's green tin
has to serve sheet 26's mats too, because a blend word that carries a digraph
(spoon, snow, tree, clock) leaves BOTH gaps and the digraph tab can only come
from the green tin.  So digraph_demand() counts occurrences across the digraph
mats AND the blend mats, and sheet 26's caption says where the green tab comes
from.

Run:   python3 scripts/curriculum/writing-shelf/build_25_digraph_work.py
       python3 scripts/curriculum/writing-shelf/build_26_blend_work.py
Needs: reportlab, pikepdf, numpy, Pillow, fontTools; pdftoppm (poppler).
"""

import collections
import json
import os
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

import pikepdf
from PIL import Image
from reportlab.lib.colors import Color
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas as rl_canvas

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import build_12_word_card_tin as W12          # noqa: E402  the tin: card_w IS the gap
import build_16_sentence_mats as M16         # noqa: E402  the descender knockout
import build_23_picture_tiles as T23          # noqa: E402  the photograph method
import cutmarks as CM                         # noqa: E402  the cutting standard

REPO = HERE.parents[2]
BANK = REPO / "docs" / "picture-bank" / "photos"
PHONICS = REPO / "phonics-images"
OUT_DIR = REPO / "public" / "dark-phonics-shelf" / "v2"
ART_DIR = HERE / ".build" / "sound-work"
LIVE_MAP = REPO / "docs" / "picture-bank" / "live-bank-art.json"
LIVE_CACHE = HERE / ".build" / "live-bank-art"
PROOF_DIR = HERE / ".build" / "proof"

PDF_AUTHOR = W12.PDF_AUTHOR

# ------------------------------------------------------------- the colours ----
GREEN = Color(0x2F / 255.0, 0x7D / 255.0, 0x4F / 255.0)     # #2F7D4F
BLUE = Color(0x2F / 255.0, 0x5F / 255.0, 0xA6 / 255.0)      # #2F5FA6
CHARCOAL = W12.CHARCOAL_C                                   # #4F4A44
TAB_INK = Color(0x1A / 255.0, 0x16 / 255.0, 0x14 / 255.0)   # #1A1614

# ------------------------------------------------------------- the mat ----
MAT_W, MAT_H = 297.0, 210.0             # A4 LANDSCAPE
SIDE = 9.0                              # mm — left and right margin
COLS, ROWS = 3, 6
CELLS = COLS * ROWS
PHOTO = 22.0                            # mm — the photograph's square field
PHOTO_GAP = 6.0                         # mm — paper between photo and start tick
TICK_W = 1.2                            # mm
CARD_H = W12.CARD_H                     # 28.0 — the tick is one card tall
BASELINE = W12.BASELINE                 # 9.0 — up the tick, where the rule runs
RULE_H = W12.RULE_H                     # 0.5
COL_GAP = 8.0                           # mm — one column's band to the next photo
COL_W = (MAT_W - 2 * SIDE - (COLS - 1) * COL_GAP) / COLS        # 87.667
BAND_X = PHOTO + PHOTO_GAP                                      # 28.0 into the cell
RULE_W = COL_W - BAND_X                                         # 59.667
ROW_PITCH = 32.0
HEAD = 14.0                             # mm — page head to the first photo's top
RULE_DOWN = 30.0                        # mm — page head to the first baseline
MAT_FOOT_Y = 8.0                        # mm up from the foot (canvas says 4.0; the
                                        # printer-safe margin is 5.5, so the adult
                                        # line has come up to clear it)
MAT_FOOT_X = 14.0
FOOT_SIZE = W12.FOOT_SIZE               # 5.5 pt
ADULT_FONT = W12.ADULT_FONT

# ------------------------------------------------------------- the tabs ----
TAB_PAGE_W, TAB_PAGE_H = 210.0, 297.0   # A4 PORTRAIT, sheet 12's own sheet
X0 = W12.X0                             # 10.0
STRIP_MAX_W = W12.STRIP_MAX_W           # 190.0
BAND_TOP = W12.BAND_TOP                 # 285.0
TICK_IN = W12.TICK_IN                   # 2.0
LABEL_Y = W12.LABEL_Y                   # 20.0
FOOT_Y = W12.FOOT_Y                     # 12.0
TEXT_X = W12.TEXT_X

TAB_CLEAR = 1.5                         # mm of paper each side of a tab's ink
TAB_G = 2 * TAB_CLEAR                   # the tab card's own "word space"

MIN_DPI = 220.0


# ============================================================== the sounds ====
class Sound(object):
    """One studied sound: the tab that is printed, and where it may match."""

    def __init__(self, key, tab, variants=None, where="any"):
        self.key = key
        self.tab = tab                          # what the TAB prints
        self.variants = list(variants or [tab])  # what may match in a word
        self.where = where                      # any | initial | final

    def __repr__(self):
        return "<Sound %s>" % self.key


def S(key, tab, variants=None, where="any"):
    return Sound(key, tab, variants, where)


# ---- sheet 25, the digraphs.  Tredoux's own five groups and his word pool.
DIGRAPH_GROUPS = [
    (1, "sh ch th ee", [
        (S("sh", "sh"), "ship shop shell shoe sheep shark shut shed fish dish "
                        "wish brush shrimp crash splash trash thrush"),
        (S("ch", "ch"), "chair cheese chick chin chop cherry chest lunch bench "
                        "much branch stitch chew"),
        (S("th", "th"), "thumb think thin throw thank three bath teeth math moth "
                        "thrush"),
        (S("ee", "ee"), "tree bee queen see feet green sleep week sheep three"),
    ]),
    (2, "wh ck ng ea", [
        (S("wh", "wh", where="initial"), "whale wheel whisk white wheat whistle"),
        (S("ck", "ck", where="final"), "back sock duck kick rock clock lock neck"),
        (S("ng", "ng", where="final"), "king ring song sing long swing wing"),
        (S("ea", "ea"), "eat sea read leaf pea tea bread head wheat"),
    ]),
    # LONG AND SHORT oo ARE ONE SOUND ON PAPER.  Tredoux's group 3 names them
    # apart and they are taught apart, but the TAB is `oo` either way and the
    # gap is the same gap: two sound keys would print two identical tabs, and
    # the child would have a pile he cannot sort.  One `oo`, long words first.
    (3, "oo (long and short) · ow", [
        (S("oo", "oo"), "moon spoon zoo boot food room book look foot hook cook"),
        (S("ow", "ow"), "snow crow show low cow how now owl"),
    ]),
    (4, "oi oy · ir ur er · igh", [
        (S("oi_oy", "oi", ["oi", "oy"]), "coin boy toy soil joy point oil"),
        (S("ir_ur_er", "ir", ["ir", "ur", "er"]),
         "bird girl shirt fur nurse her fern"),
        (S("igh", "igh"), "light night high fight right sight"),
    ]),
    (5, "ie · ue ew · oe", [
        (S("ie", "ie"), "pie tie field fried"),
        (S("ue_ew", "ue", ["ue", "ew"]), "blue glue new few chew true"),
        # `shoe` is the ONE oe word in the set with artwork, and it is a
        # two-digraph word (sh + oe) that already earns its place on sheet 1.
        # Without it group 5's oe column is empty paper.  Owner's call to make.
        (S("oe", "oe"), "toe hoe foe doe shoe"),
    ]),
]

# ---- sheet 26, the blends.  BLUE, and otherwise the same machine.
BLEND_GROUPS = [
    (1, "st sp sn sm", [
        (S("st", "st", where="initial"),
         "star stamp step stop stick stone stem stub stud stitch"),
        (S("sp", "sp", where="initial"), "spoon spider spade spin spot splash"),
        (S("sn", "sn", where="initial"), "snake snail snow snap snag"),
        (S("sm", "sm", where="initial"), "smile smoke small"),
    ]),
    (2, "sl sw sk sc", [
        (S("sl", "sl", where="initial"), "slide sled sleep slug slab"),
        (S("sw", "sw", where="initial"), "swim swan sweet swing"),
        (S("sk", "sk", where="initial"), "skate skirt sky"),
        (S("sc", "sc", where="initial"), "scarf school scab"),
            # `scale` is struck (owner, second pickup).  `scooter` belongs
            # here and would leave BOTH gaps -- sc from this tin and oo from
            # the green digraph tin -- the moment there is art for it.

    ]),
    (3, "bl cl fl gl pl", [
        (S("bl", "bl", where="initial"), "black block blue blob"),
        (S("cl", "cl", where="initial"), "clock cloud clap clip clam"),
        (S("fl", "fl", where="initial"), "flag flower fly flute"),
        (S("gl", "gl", where="initial"), "glue glass globe glove glob glen"),
        (S("pl", "pl", where="initial"), "plug plant plane plum plate"),
    ]),
    (4, "br cr dr fr gr tr pr", [
        (S("br", "br", where="initial"), "bread brick bridge brush broom brim branch"),
        (S("cr", "cr", where="initial"), "crab crown cry crib crop crow crash"),
        (S("dr", "dr", where="initial"), "drum dress drink drop"),
        (S("fr", "fr", where="initial"), "frog frame fruit fresh"),
        (S("gr", "gr", where="initial"), "grapes grass green grin grid grip"),
        (S("tr", "tr", where="initial"),
         "train tree truck trash tray trim trot trap tram"),
        (S("pr", "pr", where="initial"), "pram prize present prop"),
    ]),
    (5, "nd nt mp lk st ft lt", [
        (S("nd", "nd", where="final"), "hand sand band pond"),
        (S("nt", "nt", where="final"), "tent plant paint ant point"),
        (S("mp", "mp", where="final"), "lamp jump stamp camp shrimp"),
        (S("lk", "lk", where="final"), "milk silk"),
        (S("st_f", "st", where="final"), "nest vest list toast chest"),
        (S("ft", "ft", where="final"), "gift lift raft soft"),
        (S("lt", "lt", where="final"), "belt quilt melt"),
    ]),
]

# Every digraph the green tin prints, as a flat list — this is what a BLEND mat
# is allowed to leave a second gap for (the anchor rule), and the tab for it
# comes off sheet 25's tab sheet, never sheet 26's.
ALL_DIGRAPHS = [s for _n, _t, rows in DIGRAPH_GROUPS for s, _w in rows]


class Config(object):
    def __init__(self, n, slug, tier, colour, groups, anchors, title, what):
        self.n = n                      # 25 / 26
        self.slug = slug                # "digraph" / "blend"
        self.tier = tier                # "green" / "blue"
        self.colour = colour
        self.groups = groups
        self.anchors = anchors          # extra sounds a word may also gap
        self.title = title
        self.what = what                # "digraph" / "blend" in prose


DIGRAPH = Config(25, "digraph", "green", GREEN, DIGRAPH_GROUPS, [],
                 "Dark Phonics · Writing Shelf · digraph work", "digraph")
BLEND = Config(26, "blend", "blue", BLUE, BLEND_GROUPS, ALL_DIGRAPHS,
               "Dark Phonics · Writing Shelf · blend work", "blend")


# ================================================================== the art ====
def _bank_hit(word):
    d = BANK / word
    if d.is_dir():
        for f in sorted(d.iterdir()):
            if f.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp"):
                return f
    return None


_PHONICS_INDEX = None


def _phonics_index():
    """{stem: path} over phonics-images, first hit in a stable walk order."""
    global _PHONICS_INDEX
    if _PHONICS_INDEX is None:
        idx = {}
        for root, dirs, files in os.walk(PHONICS):
            dirs.sort()
            if "_to_delete" in root or "_evidence" in root:
                continue
            for f in sorted(files):
                p = Path(root) / f
                if p.suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
                    continue
                idx.setdefault(p.stem.lower(), p)
        _PHONICS_INDEX = idx
    return _PHONICS_INDEX


# THE ART RULE, AS THE OWNER RESTATED IT (2026-09-19).  The old gate was
# PURIST: one object on a plain ground, and nothing else.  It is gone.  The
# rule now is ONE SENTENCE — **a picture is usable if a three-year-old would
# name it with the word** — and that admits real photographs, scenes,
# illustrations, and the circle-time and curriculum cards the children already
# know from the songs (those are PREFERRED, because the child meets the same
# picture twice).  People in the frame are fine.  What is still refused is the
# picture that is not unmistakable: a crocodile for `snap`, a ribbon for
# `silk`, a pencil tip for `point`, a slate of sums for `math`.
#
# THREE TREES NOW FEED A MAT, in this order:
#   1. docs/picture-bank/photos/<word>/    the shelf's own library on disk
#   2. docs/picture-bank/live-bank-art.json  a word -> public_url map into the
#      LIVE picture library at montree.xyz, every entry of which was looked at
#      by eye before it was written down; the file is downloaded once into
#      .build/live-bank-art/ and the built PDF carries the pixels, so the
#      printable never depends on the network at print time
#   3. phonics-images/, for the two words sheet 23 vetted there
#
# COLOUR AND ADJECTIVE WORDS ARE OFF EVERY MAT.  `white`, `green`, `blue`,
# `black`, `fresh` and their kind are not nouns a photograph can be
# unmistakable for — a green pepper teaches `pepper` — so they are struck from
# the pools before the art gate ever sees them, and they are not reported as
# missing artwork because no artwork would fix them.
DROP_WORDS = {
    "white", "green", "blue", "black", "fresh", "small", "soft", "sweet",
    "thin", "long", "low", "high", "true", "new", "few", "much",
}
PHOTO_EXCEPTIONS = {"clip", "light"}
HELD_STYLE = "colour or adjective word - no photograph can be unmistakable"


_LIVE_MAP = None


def live_map():
    """{word: public_url} — the live picture library, eyeballed word by word."""
    global _LIVE_MAP
    if _LIVE_MAP is None:
        try:
            _LIVE_MAP = json.loads(LIVE_MAP.read_text())
        except Exception:
            _LIVE_MAP = {}
    return _LIVE_MAP


def live_art(word):
    """The cached local file for a live-library word, downloading it once."""
    url = live_map().get(word)
    if not url:
        return None
    LIVE_CACHE.mkdir(parents=True, exist_ok=True)
    ext = os.path.splitext(url.split("?")[0])[1].lower() or ".jpg"
    if ext not in (".jpg", ".jpeg", ".png", ".webp"):
        ext = ".jpg"
    dst = LIVE_CACHE / ("%s%s" % (word, ext))
    if not dst.exists() or dst.stat().st_size < 1024:
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                dst.write_bytes(r.read())
        except Exception as e:
            print("  !! %s: live art would not download (%s)" % (word, e))
            return None
    return dst


def art_for(word):
    """The one source photograph for a word, or None.  Disk first, then the
    live library, then the two vetted phonics-images files."""
    if word in DROP_WORDS:
        return None
    hit = _bank_hit(word)
    if hit is not None:
        return hit
    hit = live_art(word)
    if hit is not None:
        return hit
    hit = _phonics_index().get(word)
    if hit is not None and word in PHOTO_EXCEPTIONS:
        return hit
    return None


def held_reason(word):
    """Why a word is not on a mat: struck as an adjective, or no artwork."""
    if word in DROP_WORDS:
        return "style"
    return "none"


# ============================================================== the splitting ==
def _matches(word, sounds):
    """[(start, end, sound)] — leftmost-longest, non-overlapping."""
    cand = []
    for s in sounds:
        for v in s.variants:
            start = 0
            while True:
                i = word.find(v, start)
                if i < 0:
                    break
                j = i + len(v)
                ok = (s.where == "any"
                      or (s.where == "initial" and i == 0)
                      or (s.where == "final" and j == len(word)))
                if ok:
                    cand.append((i, j, s))
                start = i + 1
    cand.sort(key=lambda t: (t[0], -(t[1] - t[0])))
    out, cursor = [], 0
    for i, j, s in cand:
        if i >= cursor:
            out.append((i, j, s))
            cursor = j
    return out


def units(word, sounds):
    """[(text, sound or None)] — the word as the butted card run it becomes."""
    out, cursor = [], 0
    for i, j, s in _matches(word, sounds):
        if i > cursor:
            out.append((word[cursor:i], None))
        out.append((word[i:j], s))
        cursor = j
    if cursor < len(word):
        out.append((word[cursor:], None))
    return out


def tab_w(t):
    """THE TAB IS AS WIDE AS ITS INK PLUS 1.5 mm OF PAPER EACH SIDE.

    NOT the word-card width.  A word card carries G/2 = 3.5 mm of paper each
    side because it is a WORD standing beside other words; a digraph tab is not
    a word, it is two letters standing INSIDE one, and it needs only enough
    paper not to touch its neighbours.  card_w() takes the space as an argument
    precisely so this sheet can call the one measuring function with its own.
    """
    return W12.card_w(t, g=TAB_G)


def lay_out(us):
    """The word as ONE WORD: [(kind, text, pen_x, w)] and the run's width.

    kind is "ink" (printed letters) or "tab" (the hole a tab drops into).  Every
    letter keeps its natural, normally-kerned position; the only thing that ever
    moves them is the tab, which is wider than the ink it replaces by
    `tab_w - ink`, so the letters after it shift out by exactly that and not a
    millimetre more.  `pen_x` is a drawString pen for "ink" and a CARD LEFT EDGE
    for "tab", both relative to the start of the run.
    """
    out, pen, shift = [], 0.0, 0.0
    for t, s in us:
        adv = W12.advance(t)
        if s is None:
            out.append(("ink", t, pen + shift, adv))
        else:
            cw = tab_w(t)
            lsb = W12.glyph_box(t)[0]
            out.append(("tab", t, pen + shift + lsb, cw))
            shift += cw - W12.ink_w(t)
        pen += adv
    return out, pen + shift


def run_width(us):
    return lay_out(us)[1]


def knock_gaps(runs):
    """[(x0, x1, text, ch)] — where a printed tail crosses this row's rule.

    Sheet 16's knockout, measured across THIS rule's band: a glyph is cut out of
    the line only where its tail actually crosses it, cleared by sheet 16's own
    KNOCK_CLEAR each side.  Sheet 18 already borrows this for a 1.2 mm line and
    notes that KNOCK_MIN is sheet 16's 2.0 mm rule's half; the same holds here.
    """
    f = W12._ttf()
    upm = float(f["head"].unitsPerEm)
    hmtx, glyf = f["hmtx"], f["glyf"]
    k = W12.SIZE / upm / 72.0 * 25.4
    ylo, yhi = -RULE_H / k, 0.0
    out = []
    for text, origin in runs:
        pen = 0.0
        for ch in text:
            g = glyf[W12.gname(ch)]
            if g.numberOfContours and g.yMin * k <= -M16.KNOCK_MIN:
                span = M16._band_x(M16._glyph_polys(ch), ylo, yhi)
                if span is not None:
                    out.append((origin + (pen + span[0]) * k - M16.KNOCK_CLEAR,
                                origin + (pen + span[1]) * k + M16.KNOCK_CLEAR,
                                text, ch))
            pen += hmtx[W12.gname(ch)][0]
    return out


# ============================================================== the choosing ==
def page_words(cfg, group):
    """(words, skipped, dropped, targets) for one group.

    Two-sound words first — they are the richest work on the mat — then the
    group's sounds round-robin, so a short page is short in every column at
    once and never two full columns and an empty third.  A word the art gate
    turned away is never replaced by an invention; it is REPORTED.
    """
    _n, _title, rows = group
    sounds = [s for s, _w in rows]
    targets = sounds + list(cfg.anchors)
    skipped, seen = [], set()
    per = collections.OrderedDict((s.key, []) for s in sounds)
    for s, words in rows:
        for w in words.split():
            if w in seen:
                continue
            seen.add(w)
            if art_for(w) is None:
                skipped.append((s.key, w, held_reason(w)))
                continue
            per[s.key].append(w)

    def n_gaps(w):
        return len([1 for _t, s in units(w, targets) if s is not None])

    chosen, taken = [], set()
    for key in per:
        for w in per[key]:
            if n_gaps(w) >= 2 and w not in taken:
                chosen.append(w)
                taken.add(w)
    depth = max([len(v) for v in per.values()] + [0])
    for i in range(depth):
        for key in per:
            if len(chosen) >= CELLS:
                break
            if i < len(per[key]) and per[key][i] not in taken:
                chosen.append(per[key][i])
                taken.add(per[key][i])
        if len(chosen) >= CELLS:
            break
    words = chosen[:CELLS]
    keep = set(words)
    dropped = [w for key in per for w in per[key] if w not in keep]
    return words, skipped, dropped, targets


def plan(cfg):
    """[(group n, title, [(word, units)], skipped, dropped)] — the whole set."""
    out = []
    for group in cfg.groups:
        words, skipped, dropped, targets = page_words(cfg, group)
        rows = [(w, units(w, targets)) for w in words]
        out.append((group[0], group[1], rows, skipped, dropped))
    return out


def own_keys(cfg):
    return set(s.key for _n, _t, rows in cfg.groups for s, _w in rows)


def tab_pages(cfg, pl=None, extra=None):
    """[(group n, title, [(tab text, count)])] — ONE STRIP BLOCK A SHEET.

    `extra` is a Counter keyed on sound KEY carrying demand from ANOTHER
    sheet's mats: sheet 25 serves sheet 26's anchor digraphs out of the very
    same green tin, so those occurrences are added to the group that owns the
    sound rather than printed on sheet 26.
    """
    pl = pl or plan(cfg)
    mine = own_keys(cfg)
    n = collections.Counter()
    for _gn, _gt, rows, _sk, _dr in pl:
        for _w, us in rows:
            for _t, s in us:
                if s is not None and s.key in mine:
                    n[s.key] += 1
    for k, v in (extra or {}).items():
        if k in mine:
            n[k] += v
    out = []
    for gn, gt, rows in cfg.groups:
        block = [(s.tab, n[s.key]) for s, _w in rows if n[s.key]]
        out.append((gn, gt, block))
    return out


def anchor_demand():
    """Counter by SOUND KEY: green digraph tabs sheet 26's blend mats consume."""
    keys = set(s.key for s in ALL_DIGRAPHS)
    n = collections.Counter()
    for _gn, _gt, rows, _sk, _dr in plan(BLEND):
        for _w, us in rows:
            for _t, s in us:
                if s is not None and s.key in keys:
                    n[s.key] += 1
    return n


# ============================================================== the pictures ==
def prepare(words, force=False):
    """Crop every source round its object, sheet 23's method, once per word."""
    ART_DIR.mkdir(parents=True, exist_ok=True)
    out = {}
    for word in sorted(set(words)):
        src = art_for(word)
        if src is None:
            raise SystemExit("SPEC FAILURE: no art for %r" % word)
        dst = ART_DIR / ("%s.jpg" % word)
        if force or not dst.exists():
            with Image.open(src) as im:
                im.load()
                crop = T23.object_crop(im)[0]
                # SHEET 23'S CROP READS A PLAIN BORDER RING, and a full-bleed
                # photograph has none: on `teeth` (a mouth edge to edge) it
                # proposed a 153 px sliver of a 1024 px frame and the tile fell
                # to 191 dpi.  When the proposal is less than a quarter of the
                # frame there was no ring to read, so the WHOLE FRAME is used.
                area = (crop[2] - crop[0]) * (crop[3] - crop[1])
                if area < 0.25 * im.size[0] * im.size[1]:
                    crop = (0, 0, im.size[0], im.size[1])
                cut = im.crop(crop).convert("RGB")
                cap = int(round(T23.CAP_DPI * PHOTO / 25.4))
                if max(cut.size) > cap:
                    k = cap / float(max(cut.size))
                    cut = cut.resize((max(1, int(round(cut.size[0] * k))),
                                      max(1, int(round(cut.size[1] * k)))),
                                     Image.LANCZOS)
                cut.save(dst, "JPEG", quality=92, optimize=True, subsampling=0)
        with Image.open(dst) as o:
            px = o.size
        k = PHOTO / float(max(px))
        dpi = px[0] / (px[0] * k / 25.4)
        out[word] = (dst, px, dpi, src)
    return out


# ================================================================= the mat ====
def cell_xy(i):
    """(cell left x, baseline y) of cell i, filled COLUMN BY COLUMN."""
    col, row = divmod(i, ROWS)
    x = SIDE + col * (COL_W + COL_GAP)
    y = MAT_H - RULE_DOWN - row * ROW_PITCH
    return x, y


def draw_cell(c, cfg, x, base, word, us, art, control):
    """One cell: the photograph, the start tick, THE UNBROKEN RULE, the word.

    TWO RULES THAT ARE NOT TO BE UNLEARNED (Tredoux, on the printed proofs):

    1. **THE RULE IS UNBROKEN.**  One continuous tier-colour rule runs from the
       start tick to the end of the row, sheet 18's line exactly.  It is NEVER
       segmented at a gap.  The tab is laid ON the rule, not into a hole cut in
       it; a line that stops and starts reads as a row of slots and the child
       loses the word.  The only thing ever cut out of it is a descender.
    2. **THE WORD IS ONE WORD.**  The letters are typeset as one normally
       kerned word at the writing size, not as a row of word cards with G
       between them.  `st i ck` was the bug.  The tab replaces the digraph's
       glyphs IN PLACE: it is as wide as their ink plus 1.5 mm each side, and
       the letters beside it move out by exactly that surplus.  Lay the tab and
       the row reads `stick`.

    The CONTROL takes no insertion at all: it prints the plain word, normally
    spaced, with the studied sound in the tier colour.
    """
    top = base + (CARD_H - BASELINE)
    c.drawImage(str(art[word][0]), x * mm, (base + RULE_DOWN - HEAD - PHOTO) * mm,
                PHOTO * mm, PHOTO * mm, preserveAspectRatio=True, anchor="c",
                mask=None)
    x0 = x + BAND_X
    c.saveState()
    c.setFillColor(cfg.colour)
    c.rect(x0 * mm, (top - CARD_H) * mm, TICK_W * mm, CARD_H * mm,
           stroke=0, fill=1)
    c.restoreState()

    # what is actually PRINTED in this cell, and where its pen sits
    if control:
        runs, pen = [], x0
        for t, _s in us:
            runs.append((t, pen))
            pen += W12.advance(t)
        slots = []
    else:
        items, _w = lay_out(us)
        runs = [(t, x0 + xr) for kind, t, xr, _w in items if kind == "ink"]
        slots = [(x0 + xr, cw) for kind, _t, xr, cw in items if kind == "tab"]

    # the rule: one line, the descenders notched out of it and nothing else
    segs, _merged = M16.rule_segments(x0, knock_gaps(runs), RULE_W)
    c.saveState()
    c.setFillColor(cfg.colour)
    for p0, p1 in segs:
        c.rect(p0 * mm, (base - RULE_H) * mm, (p1 - p0) * mm, RULE_H * mm,
               stroke=0, fill=1)
    c.restoreState()

    # the letters
    c.saveState()
    c.setFont(W12.WORD_FONT, W12.SIZE)
    if control:
        pen = x0
        for t, s in us:
            c.setFillColor(cfg.colour if s is not None else CHARCOAL)
            c.drawString(pen * mm, base * mm, t)
            pen += W12.advance(t)
    else:
        c.setFillColor(CHARCOAL)
        for t, pen in runs:
            c.drawString(pen * mm, base * mm, t)
    c.restoreState()
    return slots


def mat_caption(cfg, gn, ngroups, title, nrows, control):
    what = "control · the %s printed in place" % cfg.what if control else "work mat"
    tail = ("the %s tab comes out of the GREEN digraph tin" % "digraph"
            if cfg.anchors else "one tab a gap")
    return ("%s work · sheet %d of %d · %s · %s · %d of %d cells · %s · "
            "single-sided · never cut · never laminate"
            % (cfg.what, gn, ngroups, title, what, nrows, CELLS, tail))


def write_mats(cfg, path, pl, art, control):
    c = rl_canvas.Canvas(str(path), pagesize=(MAT_W * mm, MAT_H * mm))
    c.setTitle(cfg.title + (" · control" if control else " · work mats"))
    c.setAuthor(PDF_AUTHOR)
    c.setSubject(mat_caption(cfg, 1, len(pl), pl[0][1], len(pl[0][2]), control))
    for gn, gt, rows, _sk, _dr in pl:
        for i, (word, us) in enumerate(rows):
            x, base = cell_xy(i)
            draw_cell(c, cfg, x, base, word, us, art, control)
        c.saveState()
        c.setFillColor(W12.LABEL_C)
        c.setFont(ADULT_FONT, FOOT_SIZE)
        c.drawString(MAT_FOOT_X * mm, MAT_FOOT_Y * mm,
                     mat_caption(cfg, gn, len(pl), gt, len(rows), control))
        c.restoreState()
        c.showPage()
    c.save()


# ================================================================ the tabs ====
def tab_strips(block):
    """[(tab, count)] -> butted strips of single tabs, sheet 12's packing rule
    at THIS sheet's card width (ink + 1.5 mm each side, see tab_w)."""
    cards = []
    for tab, n in block:
        cards.extend([tab] * n)
    out, row, w = [], [], 0.0
    for tab in cards:
        cw = tab_w(tab)
        if row and w + cw > STRIP_MAX_W + 1e-9:
            out.append(row)
            row, w = [], 0.0
        row.append((tab, None, cw))
        w += cw
    if row:
        out.append(row)
    return out


def write_tabs(cfg, path, blocks):
    c = rl_canvas.Canvas(str(path), pagesize=(TAB_PAGE_W * mm, TAB_PAGE_H * mm))
    c.setTitle(cfg.title + " · tabs")
    c.setAuthor(PDF_AUTHOR)
    total = 0
    for gn, gt, block in blocks:
        st = tab_strips(block)
        tops = [BAND_TOP - i * CARD_H for i in range(len(st))]
        v, h = [], []
        h.append((tops[0], 0.0, TAB_PAGE_W))
        for top, strip in zip(tops, st):
            bot = top - CARD_H
            h.append((bot, 0.0, TAB_PAGE_W))
            x = X0
            for tab, _cls, cw in strip:
                v.append((x, top - TICK_IN, top))
                v.append((x, bot, bot + TICK_IN))
                c.saveState()
                c.setFillColor(cfg.colour)
                c.rect(x * mm, (bot + BASELINE - RULE_H) * mm, cw * mm,
                       RULE_H * mm, stroke=0, fill=1)
                c.setFillColor(TAB_INK)
                c.setFont(W12.WORD_FONT, W12.SIZE)
                lsb = W12.glyph_box(tab)[0]
                c.drawString((x + W12.ink_left(tab, cw) - lsb) * mm,
                             (bot + BASELINE) * mm, tab)
                c.restoreState()
                x += cw
            v.append((x, top - TICK_IN, top))
            v.append((x, bot, bot + TICK_IN))
        CM.cut_lines(c, v, h, TAB_PAGE_W, TAB_PAGE_H)
        n = sum(n for _t, n in block)
        total += n
        c.saveState()
        c.setFillColor(W12.LABEL_C)
        c.setFont(ADULT_FONT, FOOT_SIZE)
        c.drawString(TEXT_X * mm, LABEL_Y * mm,
                     "%s tabs · sheet %d of %d · %s · %s · one tab a gap on "
                     "sheet %d's mats · 250 gsm card"
                     % (cfg.what, gn, len(blocks), gt,
                        " ".join("%s x%d" % (t, k) for t, k in block), cfg.n))
        c.restoreState()
        CM.footer(c, TEXT_X, FOOT_Y, CM.cards_line(n, "tab"), ADULT_FONT,
                  FOOT_SIZE)
        c.showPage()
    c.save()
    return total


# ================================================================== checks ====
def check(cfg, pl, art):
    bad = []
    for gn, gt, rows, _sk, _dr in pl:
        if len(rows) > CELLS:
            bad.append("group %d: %d rows, more than %d cells" %
                       (gn, len(rows), CELLS))
        for word, us in rows:
            w = run_width(us)
            if w > RULE_W + 1e-6:
                bad.append("group %d: %r runs %.1f mm, wider than the %.1f mm "
                           "band" % (gn, word, w, RULE_W))
            if "".join(t for t, _s in us) != word:
                bad.append("group %d: %r does not reassemble" % (gn, word))
            if not any(s is not None for _t, s in us):
                bad.append("group %d: %r has no gap at all" % (gn, word))
            dpi = art[word][2]
            if dpi < MIN_DPI - 0.5:
                bad.append("%s lands at %d dpi (want >= %d)"
                           % (word, dpi, MIN_DPI))
    last = cell_xy(CELLS - 1)
    if last[1] - BASELINE < MAT_FOOT_Y + 3.0:
        bad.append("the last row and the adult line collide")
    if SIDE + (COLS - 1) * (COL_W + COL_GAP) + COL_W > MAT_W - SIDE + 1e-6:
        bad.append("the columns overflow the page")
    if bad:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(bad))


def proof(pdf, tag):
    if not shutil.which("pdftoppm"):
        return []
    PROOF_DIR.mkdir(parents=True, exist_ok=True)
    subprocess.run(["pdftoppm", "-r", "110", "-png", str(pdf),
                    str(PROOF_DIR / tag)], check=True)
    return sorted(PROOF_DIR.glob("%s-*.png" % tag))


# =================================================================== build ====
def build(cfg=DIGRAPH, force=False):
    W12.register_fonts()
    W12.SIZE, W12.SIZE_FROM = W12.word_size()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    pl = plan(cfg)
    art = prepare([w for _g, _t, rows, _s, _d in pl for w, _u in rows], force)
    check(cfg, pl, art)

    mats = OUT_DIR / ("%d-%s-mats.pdf" % (cfg.n, cfg.slug))
    ctrl = OUT_DIR / ("%d-%s-mats-control.pdf" % (cfg.n, cfg.slug))
    tabs = OUT_DIR / ("%d-%s-tabs.pdf" % (cfg.n, cfg.slug))
    write_mats(cfg, mats, pl, art, control=False)
    write_mats(cfg, ctrl, pl, art, control=True)
    extra = anchor_demand() if cfg is DIGRAPH else None
    blocks = tab_pages(cfg, pl, extra)
    n_tabs = write_tabs(cfg, tabs, blocks)

    print("%s work · %d mats, %d tabs" % (cfg.what, len(pl), n_tabs))
    skipped = []
    for gn, gt, rows, sk, dr in pl:
        print("  sheet %d · %-22s %2d of %d cells · %s"
              % (gn, gt, len(rows), CELLS, " ".join(w for w, _u in rows)))
        if dr:
            print("      over eighteen, not printed: %s" % " ".join(dr))
        skipped.extend(sk)
    if skipped:
        for tag, head in (("none", "NO ARTWORK ANYWHERE, NOT PRINTED "
                                   "(the artwork commission):"),
                          ("style", "COLOUR / ADJECTIVE WORDS, STRUCK FROM THE POOL "
                                    "(no artwork would fix these):")):
            by = collections.OrderedDict()
            for key, w, why in skipped:
                if why == tag:
                    by.setdefault(key, []).append(w)
            if by:
                print("  " + head)
                for key, ws in by.items():
                    print("      %-10s %s" % (key, " ".join(ws)))
    print("  tabs: " + " | ".join(
        "sheet %d %s" % (gn, " ".join("%sx%d" % (t, k) for t, k in b))
        for gn, _gt, b in blocks))
    for p in (mats, ctrl, tabs):
        proof(p, p.stem)
        with pikepdf.open(p) as doc:
            npages = len(doc.pages)
        print("  -> %s  %d pages, %d bytes" % (p.name, npages, p.stat().st_size))
    return pl, blocks


if __name__ == "__main__":
    build(DIGRAPH, force="--force" in sys.argv)
