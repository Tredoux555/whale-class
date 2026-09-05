#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Montree Phonics — tracing booklet, mirrors a build_booklets reader
page-for-page so the two A5 booklets sit side by side in a stack.

Reuses build_booklets.py wholesale (same fonts/margins/PW,PH/page_words/
page_halftitle/page_back/make_art_page/folio/imposition loop) and only adds
one new page painter, make_trace_page(), built on stroke_font's traced-letter
primitive (the same engine the real satpin-paperwork tracing pipeline uses).

Page-for-page mirror of the reader:
    cover        -> trace cover  (same page_cover art/title, + TRACE badge
                    + 'written by ___' line)
    words        -> UNCHANGED (same page_words call)
    half-title   -> UNCHANGED (same page_halftitle call)
    per spread:
        text page  -> trace page (nar line at the reader's exact position,
                       then a traced guide row for the target word, then an
                       empty guide row for the child to write it unaided)
        art page   -> UNCHANGED (same make_art_page call, same image)
    back cover   -> UNCHANGED (same page_back call)

Celebration line and the book-hero-word fallback are derived from the book
dict itself (`book['new']`'s first token). The traced word on each per-spread
trace page is NOT that hero word, though (2026-09-03 per Tredoux) — it is the
literal last word of THAT spread's own `text`, matching the reader page it
sits opposite; see spread_trace_word() below. This works for every book in
the sat-cast letter-book chain, not just 'the-sat' — see
is_sat_cast_letter_book() below.

A second mode, --sentences, builds an ADVANCED edition for stronger readers:
instead of tracing just the hero word, the child traces the WHOLE printed
sentence for each spread (composed with sentence_of(), see its docstring —
the exact nar+text merge rule build_tracing.py's A4 tracing workbook uses,
verified byte-for-byte against its own hand-authored the-sat sentences).
Same A5 booklet shape, same page-for-page mirror, same imposition; only the
per-spread trace page (make_sentence_trace_page()) and the cover badge
(page_trace_cover_sentences()) differ from word mode — everything else
(page_words, page_halftitle, art pages, page_back, folio, imposition) is
shared, unmodified, between both modes.

EASY READERS (2026-09-05, Tredoux: "readers must look exactly like the
letter books"). The 11 standalone Easy Readers used to get their tracing
workbook from scripts/curriculum/satpin-paperwork/build_tracing.py, an older
A4-landscape layout with its own cover ("TRACE AND BUILD", a letter badge
circle and a leftover "written by ___" line that the 2026-08-27 bookplate
COVER STANDARD removed everywhere else). That is over: readers now come
through THIS generator, so they share the letter books' page_cover()/
bookplate cover, folio, page_words/half-title/back cover and A5 saddle-stitch
imposition, byte-for-byte the same painters. See load_reader_book() below —
it builds a build_booklets-shaped book dict straight from
lib/montree/english-curriculum/spec/easy-readers-manifest-v2.json plus the
in-repo art at phonics-images/easy-readers/<slug>/. Readers always build in
--sentences mode (a reader page carries a whole printed sentence with no
nar/reveal split, so word mode's book_word_xheight() has nothing to size
against) and write straight to their live path,
public/dark-phonics-materials/<materialsSlug>/tracing-workbook.pdf —
materialsSlug is the slug itself except fox-in-a-box, which the library page
overrides to 'fox-in-a-box-reader' (READER_MATERIALS_SLUG below).
NOTHING on the letter-book path changed for this: no shared function was
edited, so rebuilding any of the 19 book-family slugs still produces the
exact same bytes it did before 2026-09-05.

Usage:
    python3 build_tracing_booklet.py                 # builds the-sat only
    python3 build_tracing_booklet.py the-sat the-spat # builds these slugs
    python3 build_tracing_booklet.py --all            # every sat-cast
                                                       # letter-book chain title
    python3 build_tracing_booklet.py the-sat --out /path/to/outdir
    python3 build_tracing_booklet.py the-sat --sentences   # advanced edition
    python3 build_tracing_booklet.py --readers --all       # all 11 Easy Readers
    python3 build_tracing_booklet.py --readers mud-pup     # one Easy Reader
"""
import argparse
import io
import json
import os
import shutil
import re
import sys
from collections import Counter

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas as rl_canvas

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))

# Fonts: MONTREE_CANVAS_FONTS can still be overridden by the caller's
# environment (e.g. to point at a different font set), but the *default*
# is always this repo's own scripts/curriculum/flashcards/canvas-fonts/ —
# that directory ships in the real repo, so no container-only path
# (/root/.claude/skills/... or similar) is ever needed here.
FONTS = os.path.join(HERE, 'canvas-fonts')
os.environ.setdefault('MONTREE_CANVAS_FONTS', FONTS)

sys.path.insert(0, HERE)
import build_booklets as bb                                       # noqa: E402
from books_def import BOOKS                                        # noqa: E402

SATPIN_PAPERWORK = os.path.join(REPO, 'scripts', 'curriculum', 'satpin-paperwork')
sys.path.insert(0, SATPIN_PAPERWORK)
import stroke_font as sf                                           # noqa: E402

# ---- reused, untouched, from build_booklets --------------------------------
PW, PH, M = bb.PW, bb.PH, bb.M
INK, RED, GREY, FAINT = bb.INK, bb.RED, bb.GREY, bb.FAINT
fit = bb.fit
draw_tracked = bb.draw_tracked
folio = bb.folio
page_words = bb.page_words
page_halftitle = bb.page_halftitle
page_back = bb.page_back
page_blank = bb.page_blank
page_cover = bb.page_cover
make_art_page = bb.make_art_page

# ---- new geometry, all derived from the same M / PW / PH constants --------
TRACE_U    = 10 * mm      # nominal x-height of the traced guide word (A5
                          # page, so smaller than build_tracing.py's 12.5mm
                          # A4-landscape workbook — see report deviation #1).
                          # This is the DEFAULT ceiling — used as-is by
                          # --sentences mode (make_sentence_trace_page()
                          # below) and by compute_trace_u()'s own default
                          # arg. Per Tredoux 2026-08-22: word mode no longer
                          # uses this flat value at all — see
                          # book_word_xheight() below, which computes each
                          # book's OWN ceiling to match that book's real
                          # reveal-page word size exactly (books vary a lot:
                          # the-sat's "Sat!" renders far bigger in the real
                          # book than the-pit's "Sat in the pit!", a longer
                          # phrase at a much smaller size — one flat ceiling
                          # for every book would mismatch most of them).
TRACE_TRACK = 0.12        # same letter-tracking build_tracing.py's trace
                          # pages use
TRACE_GAP  = 6 * mm       # air between the two guide rows
ROW1_BASE  = 78 * mm      # baseline of the traced row (fixed across all
                          # trace pages of a book for a steady register down
                          # the book)
LABEL_GAP  = 6 * mm       # 'TRACE IT' label above row 1's headline

# ---- --sentences mode: whole-sentence tracing for stronger readers --------
# Per user feedback on the first draft: sentence-mode trace pages show ONLY
# the traced row(s) — no empty free-writing row ("not enough space"; word
# mode's empty row is unchanged). Up to 3 wrap lines are now allowed (was
# 2), since dropping the empty row frees up the vertical room a 3rd line
# needs. Because the row count varies per page (1-3, decided by
# sf.fit_wrap), the block is centred on a fixed vertical point rather than
# hung off a fixed top baseline (which would leave short blocks hugging the
# top) — SENT_BAND_CENTER is the vertical centre the OLD traced+empty
# 3-row block (2 traced + 1 empty, at the 10mm ceiling) used to occupy, so
# the page's visual weight lands in the same place as the first draft.
SENT_BAND_CENTER = 124 * mm


def target_word(book):
    """The book's hero word, lowercase, from book['new'] ('Sat  ·  at' -> 'sat').
    Falls back to 'sat' if 'new' is missing/empty, but every sat-cast book in
    books_def.py carries a 'new' field so this should always resolve."""
    raw = (book.get('new') or '').split('·')[0]
    word = raw.strip().lower()
    return word or 'sat'


def spread_trace_word(sp):
    """2026-09-03 per Tredoux: the traced word must match the READER page,
    not the book's hero word — the traced word on each trace page is the
    literal last word of THAT spread's own `text` (punctuation stripped,
    lowercased): 'naps.' -> 'naps', 'pat!' -> 'pat', so the-nap's page
    narrated 'The apple… naps.' traces 'naps', not book['new']'s 'nap'.
    `text` can be a list (drop-style chants, e.g. ['Nap! Nap!','Nap!'], or
    whisper-style multi-word lines) — the reader reads top-to-bottom in
    list order, so its LAST element is the page's last line; that line's
    last whitespace-separated token is the traced word. Returns None for a
    spread with no `text` at all (e.g. the-sat's cliffhanger 'And the…?!')
    — such a spread has no word on the reader page to trace; the caller
    falls back to the book's own hero word (target_word()) there, same as
    before this fix."""
    raw = sp.get('text')
    if raw is None:
        return None
    if isinstance(raw, list):
        raw = raw[-1] if raw else ''
    if isinstance(raw, tuple):          # (line, scale) shape, e.g. the-fast
        raw = raw[0]
    tokens = str(raw).split()
    if not tokens:
        return None
    word = re.sub(r"[^A-Za-z']", '', tokens[-1]).lower()
    return word or None


# Outfit-Bold ('Word' font, the real book's own reveal-word font) glyph
# metrics: lowercase 'a' yMax / unitsPerEm. This is the font's own rendered
# overshoot above its baseline for a round lowercase letter with no
# ascender/descender — i.e. its true visual x-height as printed, not the
# (slightly smaller) OS/2 sxHeight table value. Cross-checked against a
# direct pixel measurement of the-sat's real "Sat!" reveal page: the
# lowercase 'a' there measured 20.57mm at a 115pt fitted size, this ratio
# predicts 20.12mm at the same size — within 0.5mm (anti-aliasing/threshold
# noise in the pixel measurement), confirming this is the font's real
# scaling constant, not a per-book coincidence.
WORD_FONT_XHEIGHT_RATIO = 496 / 1000.0

# One throwaway canvas, never saved or shown a page, used only for its
# stringWidth()/fit() font-metrics calls in book_word_xheight() below —
# same technique build_booklets.fit() itself needs a canvas for.
_metrics_canvas = rl_canvas.Canvas(io.BytesIO())


def book_word_xheight(book):
    """Per Tredoux 2026-08-22: word mode's traced guide word should be
    'identical size to the actual booklet' — i.e. match THIS book's own
    real reveal-page word size exactly, not a single flat ceiling shared by
    every book. Books vary hugely: the-sat's "Sat!" is a short single word
    shouted at spec size=92 (fits at ~115pt); the-pit's "Sat in the pit!"
    is a 4-word phrase at spec size=44 (~55pt) — using the-sat's size for
    the-pit's traced word would make it print roughly DOUBLE its real size.

    Finds the most common 'size' among this book's main reveal spreads
    (those with BOTH nar and text — i.e. narrated 'The X… WORD!' pages —
    excluding the no-nar intro page and the drop/chant finale page, which
    use their own different, usually smaller, sizes), reproduces
    build_booklets.make_text_page()'s own base/fit() calculation for a
    representative spread at that size, and converts the resulting
    effective font size to an x-height via WORD_FONT_XHEIGHT_RATIO.
    Raises if the book has no qualifying reveal spread — every sat-cast
    letter book has at least one, by construction of the format itself."""
    main = [sp for sp in book['spreads']
            if sp.get('nar') and sp.get('text') is not None]
    if not main:
        raise RuntimeError(
            'book %r has no nar+text reveal spreads to size the traced '
            'word against — book_word_xheight() only supports the '
            'sat-cast letter-book reveal format' % book['slug'])
    # 2026-08-26: the per-spread `size=` is no longer what the reader prints.
    # build_booklets.reveal_size() now sizes every narrative reveal word from
    # one shared band (see its REVEAL_* notes), so the traced word is sized
    # through that SAME function — the tracing sheet keeps matching the book
    # exactly, by construction rather than by copying a number.
    # The representative size is the most common RENDERED reveal size in the
    # book (was: the most common authored `size=`, which no longer drives
    # anything). For nearly every book that is the band's ceiling, since all
    # its short shout words fit at full size; only a book of long words
    # (the-tall) lands lower.
    sizes = []
    for sp in main:
        lines = sp['text'] if isinstance(sp['text'], list) else [sp['text']]
        sizes.append(bb.reveal_size(_metrics_canvas, lines))
    eff_size = Counter(sizes).most_common(1)[0][0]
    return WORD_FONT_XHEIGHT_RATIO * eff_size


def compute_trace_u(word, ceiling=TRACE_U):
    """The traced guide word is normally drawn at `ceiling` x-height (the
    default, TRACE_U/10mm, for --sentences mode's own celebration-page
    call; word mode instead passes book_word_xheight(book) — see
    build_trace_booklet() below), but longer target words than 'sat' (e.g.
    'spat', 'chased', 'toothbrush' on letter T's companion book) can
    overflow the A5 guide row's usable width (PW - 2*M). Shrink the
    x-height just enough to fit, measured with stroke_font's own
    text_width() (the exact metric draw_traced() uses) so the shrink
    matches the glyphs pixel-for-pixel — never guessed. A small
    2% safety margin keeps the traced strokes off the guide's end caps."""
    guide_w = (PW - M) - M
    w = sf.text_width(word, ceiling, TRACE_TRACK)
    if w <= guide_w:
        return ceiling
    return ceiling * (guide_w / w) * 0.98


def guidelines(c, x0, x1, base, u):
    """Three-line school paper: dotted headline, dashed midline, solid
    baseline — same shape as satpin-paperwork/build_tracing.py's guidelines(),
    reusing build_booklets' INK (this file draws no new colors)."""
    c.setLineWidth(0.6)
    c.setStrokeColorRGB(*INK)
    c.setDash(0.9, 2.6)
    c.line(x0, base + 2 * u, x1, base + 2 * u)
    c.setDash(3.2, 3.2)
    c.line(x0, base + u, x1, base + u)
    c.setDash()
    c.setLineWidth(0.9)
    c.line(x0, base, x1, base)


def draw_guide_row(c, base, u, word=None):
    x0, x1 = M, PW - M
    guidelines(c, x0, x1, base, u)
    if word:
        w = sf.text_width(word, u, TRACE_TRACK)
        sf.draw_traced(c, word, PW / 2 - w / 2, base, u,
                       tracking=TRACE_TRACK, arrows=True)


def make_trace_page(spec, word, u, row1_base, row2_base, celebration=None,
                     skip_empty_row=False):
    """Mirrors make_text_page()'s narration placement exactly (same PH*0.68
    / PH*0.55 split on whether the ORIGINAL spread carried both nar+text),
    then adds the traced + empty guide rows below. `u`, `row1_base` and
    `row2_base` are computed once per book (see build_trace_booklet) so both
    rows share the same auto-shrunk x-height and consistent geometry.
    `skip_empty_row` drops the second (empty, free-writing) row — used only
    by --sentences mode's celebration page, for consistency with the rest
    of that mode's pages, which have no empty row at all; word mode always
    keeps both rows (skip_empty_row stays False there), unchanged."""
    def _p(c, book):
        nar_text = celebration or spec.get('nar')
        if nar_text:
            # Per Tredoux 2026-08-25: unlike make_text_page() (the reader),
            # every make_trace_page() call always draws a traced word row
            # below (word mode's per-spread word, or --sentences mode's
            # celebration page borrowing word mode's own painter) -- so the
            # reader's "no shout word on this page -> sit bigger/lower"
            # placement never applies here, even on spreads whose ORIGINAL
            # text field was None (e.g. the no-swap-word intro spread, "An
            # apple."/"A pit."). Using that placement anyway made nar sit
            # low enough to collide with the fixed traced-word row below it.
            # Always use the smaller/higher placement instead, matching
            # every other (has-text) spread's nar.
            nsize = min(fit(c, nar_text, 'Nar', 34, PW - 2 * M), 34)
            c.setFont('Nar', nsize)
            c.setFillColorRGB(*GREY)
            y_nar = PH * 0.68
            c.drawCentredString(PW / 2, y_nar, nar_text)
        # 'TRACE IT' label removed per Tredoux 2026-08-22 — the traced word
        # is big and obvious enough on its own now that it no longer needs
        # a caption above it (word mode only; --sentences mode's own label,
        # below in make_sentence_trace_page(), is untouched).
        draw_guide_row(c, row1_base, u, word)
        if not skip_empty_row:
            draw_guide_row(c, row2_base, u, None)
    return _p


def _lower_first(s):
    return (s[0].lower() + s[1:]) if s else s


def sentence_of(spec):
    """The sentence a child traces on this spread in --sentences mode,
    composed with the exact nar+text merge RULE
    satpin-paperwork/build_tracing.py's own sentence_of() uses for the A4
    tracing workbook: nar (minus a trailing ellipsis) joined to the shouted
    word --

        nar = (spread.get('nar') or '').strip()
        for tail in ('…', '...'):
            if nar.endswith(tail): nar = nar[:-len(tail)].strip()
        word = (spread.get('text') or '').strip()
        return (nar + ' ' + word).strip() if nar else word

    -- extended for two shapes books_def.py's spreads use that the A4
    script's hand-curated shims (satpin-paperwork/shims/dp-the-sat.py etc.)
    never need to, because they were pre-composed by hand:

      * `text` as a list (the drop-style recap chant, e.g.
        ['Sat! Sat!','Sat!'], and the no-nar potato-punchline pages, e.g.
        ['The potato', "doesn't nap!"]) — joined with spaces into one
        line, same reading order as the printed page. The original
        sentence_of() would raise (str.strip() on a list) if it ever saw
        one of these; this is the "sensible fallback" for that case.
      * continuing a nar clause: when `nar` is present, books_def.py's
        `text` for the pre-the-pat books (the-sat, the-spat, the-pit) is
        capitalised for its own big-shout DISPLAY emphasis ('Sat!'), not
        for grammar — concatenating verbatim reads as 'The ant Sat!'.
        books_def.py's own TEXT_RULES comment (locked from the-pat
        onward) states the correct rule: text continuing a nar clause is
        never a fresh sentence, so only its first letter needs
        lower-casing to read naturally. Verified byte-for-byte against
        satpin-paperwork/shims/dp-the-sat.py's 4 hand-authored sentences
        ('The ant sat!', 'The snake sat!', 'The star sat!', 'The cat
        sat!') — this rule reproduces every one of them exactly.

    A spread with no `text` at all (e.g. the-sat's final cliffhanger,
    nar='And the…?!') falls straight out of the same merge: word='' so the
    sentence is just the (ellipsis-stripped) nar, exactly like
    build_tracing.py's own fallback.
    """
    nar = (spec.get('nar') or '').strip()
    for tail in ('…', '...'):
        if nar.endswith(tail):
            nar = nar[:-len(tail)].strip()
    raw = spec.get('text')
    if raw is None:
        word = ''
    elif isinstance(raw, list):
        # Per Tredoux 2026-08-25: the-fast's drop-style recap page pairs
        # each line with its own relative scale for display -- a list of
        # (line, scale) tuples, e.g. [('Fast! Fast! Fast!', 1.0), ('Fast!
        # Fast!', 0.75)] -- rather than plain strings like every other
        # drop-style recap (['Sat! Sat!', 'Sat!']). Unwrap the text out of
        # either shape before joining, so this mode ignores display scale
        # entirely (irrelevant to tracing) and just reads the words.
        word = ' '.join(item[0] if isinstance(item, tuple) else item
                         for item in raw)
    else:
        word = raw.strip()
    if nar and word:
        word = _lower_first(word)
    return (nar + ' ' + word).strip() if nar else word


def make_sentence_trace_page(sentence):
    """--sentences mode trace page: no narration line at all (the sentence
    IS the content, per spec), and — per user feedback on the first draft —
    ONLY traced rows, no empty free-writing row. sf.fit_wrap() finds the
    largest x-height (<= TRACE_U, the same 10mm ceiling word mode's
    compute_trace_u() uses as its own ceiling) that lays `sentence` across
    at most 3 guide rows (raised from 2 now that the empty row's gone —
    there's room) within the guide's usable width — the same auto-shrink
    principle as compute_trace_u(), just wrap-aware. However many rows the
    wrap actually needs (1-3), they're stacked at the same word-mode row
    pitch (3*u + TRACE_GAP) and the whole block is vertically centred on
    SENT_BAND_CENTER, so a short (1-row) block doesn't hug the top of the
    page the way a fixed top anchor would."""
    def _p(c, book):
        guide_w = (PW - M) - M
        u, rows = sf.fit_wrap(sentence, guide_w, TRACE_U, maxlines=3,
                              tracking=TRACE_TRACK)
        n = len(rows)
        block_h = 2 * u + (n - 1) * (3 * u + TRACE_GAP)
        base0 = SENT_BAND_CENTER + block_h / 2 - 2 * u
        bases = [base0 - i * (3 * u + TRACE_GAP) for i in range(n)]
        draw_tracked(c, PW / 2, bases[0] + 2 * u + LABEL_GAP,
                    'T R A C E   I T', 'Label', 8, 0.3, GREY)
        for i, base in enumerate(bases):
            draw_guide_row(c, base, u, rows[i])
    return _p


def right_tracked(c, x, y, text, font, size, tracking, color):
    """Right-aligned tracked text — build_booklets.draw_tracked only centers,
    so this is the one small new helper this file adds (no new font/color)."""
    c.setFont(font, size)
    c.setFillColorRGB(*color)
    total = c.stringWidth(text, font, size) + tracking * size * (len(text) - 1)
    cx = x - total
    for ch in text:
        c.drawString(cx, y, ch)
        cx += c.stringWidth(ch, font, size) + tracking * size


# _written_by_line() lived here until 2026-08-27.  It drew 'written by ___'
# at M+19mm, left-aligned from M+6mm -- exactly the footprint page_cover's
# new ex-libris bookplate (build_booklets.draw_bookplate) now occupies, so
# the two overlapped.  The plate supersedes it on every cover, trace
# editions included; the child writes their name in the plate.


def page_trace_cover(c, book):
    """Same page_cover() art/title/band untouched, plus a small TRACE badge
    in the top margin strip (never competes with page_cover's centred
    content).  The name line is page_cover's own bookplate now."""
    page_cover(c, book)
    right_tracked(c, PW - M, PH - 7 * mm, 'TRACE  &  WRITE', 'LabelB', 7.5,
                 0.18, RED)


def page_trace_cover_sentences(c, book):
    """Same as page_trace_cover() (same page_cover() art/title/band/bookplate,
    same house colors/fonts) — only the corner badge text changes, to signal
    the advanced whole-sentence edition."""
    page_cover(c, book)
    right_tracked(c, PW - M, PH - 7 * mm, 'TRACE  THE  STORY', 'LabelB', 7.5,
                 0.18, RED)


def missing_art(book):
    """Pre-flight sanity check, mirroring _build_one.py's check verbatim:
    art paths are used exactly as stored in books_def.py — relative paths
    (e.g. the-sat's 'tiles/SAT-p1.png') resolve against the process cwd,
    absolute paths (the-spat, the-pat, ... via the .../phonics-images/...
    vars in books_def.py) resolve as-is. No HERE/REPO joining is done here,
    same as the reader build — main() below chdir()s to HERE before calling
    this so the cwd assumption matches the reader build's real-world usage
    (run from inside scripts/curriculum/flashcards/, where the repo's real,
    non-symlink tiles/ folder lives). Returns the list of missing paths (or
    an empty list) instead of exiting, so callers can report a clean
    per-book failure and keep going."""
    missing = []
    if not os.path.exists(book['cover']):
        missing.append(book['cover'])
    for sp in book['spreads']:
        if sp.get('art') and not os.path.exists(sp['art']):
            missing.append(sp['art'])
    return missing


def build_trace_booklet(book, outdir, mode='word', celebrate=True):
    """mode='word' (default): trace the hero word only (unchanged from the
    original single-mode script). mode='sentence': the --sentences
    "advanced edition" — trace the WHOLE sentence per spread instead, via
    make_sentence_trace_page()/sentence_of(). Both modes share every other
    page (words, half-title, art, back cover) and the whole imposition
    loop below, unmodified — only the cover badge and the per-spread trace
    page painter differ between them.

    celebrate=True (default, unchanged behaviour for the 17 sat-cast
    tracing booklets already shipping): word mode's last spread gets an
    'I can write <word>!' heading instead of the plain 'TRACE IT' label.
    Per Tredoux 2026-08-24: the picture-word books (ant-on-my-apple and
    beyond) drop this -- every spread, including the last, just says
    'TRACE IT' -- so their caller passes celebrate=False."""
    missing = missing_art(book)
    if missing:
        raise RuntimeError(
            'missing art for %r:\n  %s' % (book['slug'], '\n  '.join(missing)))

    os.makedirs(outdir, exist_ok=True)
    word = target_word(book)
    # Per Tredoux 2026-08-22: word mode's x-height ceiling is now THIS
    # book's own real-reveal-page size (book_word_xheight()), not a flat
    # constant — see that function's docstring. --sentences mode's own
    # celebration page (below) still traces the key word "as in word
    # mode" but keeps the OLD flat default ceiling (compute_trace_u's
    # default arg) — that page's sizing wasn't part of today's fix and
    # is left exactly as it was.
    word_u = compute_trace_u(word, ceiling=book_word_xheight(book)) \
        if mode == 'word' else compute_trace_u(word)
    word_row1_base = ROW1_BASE
    word_row2_base = word_row1_base - (3 * word_u + TRACE_GAP)
    # 2026-09-03 per Tredoux: word mode's x-height CEILING is still the
    # book's own real-reveal-page size (book_word_xheight(), unchanged
    # above) — only the WORD traced against that ceiling now varies per
    # spread (spread_trace_word()) instead of being the book hero word for
    # every page. `word_ceiling` is that per-book ceiling, reused below for
    # each spread's own compute_trace_u() call.
    word_ceiling = book_word_xheight(book) if mode == 'word' else TRACE_U

    if mode == 'word':
        cover_painter = page_trace_cover
    elif mode == 'sentence':
        cover_painter = page_trace_cover_sentences
    else:
        raise ValueError('unknown mode %r' % mode)

    # 2026-08-26: structure comes from bb.story_pages()/bb.paginate() — the
    # SAME functions the reader uses — so a tracing booklet has exactly the
    # reader's page count, page order and facing pairs for a given book, and
    # only the left-hand page is painted differently. This loop used to build
    # its own body list, which is how it drifted: it emitted a trace page for
    # the wordless potato-cameo spread too, making an-apple-for-ant's tracing
    # workbook 24pp against the reader's 20pp, and shifting the words/cameo/
    # blank pages by one leaf. Never re-implement the body loop here.
    last_worded = bb.last_worded_index(book)

    def trace_text_page(sp, i):
        is_last = (i == last_worded)
        if mode == 'word':
            celebration = ('I can write %s!' % word) if (is_last and celebrate) else None
            # 2026-09-03 per Tredoux: traced word = literal last word of the
            # reader page (spread_trace_word(sp)), not book['new'] — this is
            # THE fix for the-nap ('The apple… naps.' traced 'nap' before;
            # traces 'naps' now). Falls back to the book's hero word only
            # for a spread with no `text` at all (spread_trace_word()
            # returns None there — the reader page itself has no word on
            # it either). The x-height is recomputed per spread too, against
            # the SAME book-wide ceiling (word_ceiling) — a longer per-page
            # word like 'dogs' still auto-shrinks to fit, same principle
            # compute_trace_u() already used for a single book-wide word.
            page_word = spread_trace_word(sp) or word
            page_u = compute_trace_u(page_word, ceiling=word_ceiling)
            # Per Tredoux 2026-08-22: word mode's traced word is sized to
            # match the real book exactly, which no longer leaves room for
            # the second, empty "write it unaided" row — skip_empty_row=True
            # on every word-mode page. word_row2_base is a dead value
            # everywhere it is passed; left computed so re-adding a second
            # row later is a one-line change, not a rewire.
            return make_trace_page(sp, page_word, page_u, word_row1_base,
                                   word_row2_base, celebration=celebration,
                                   skip_empty_row=True)
        if is_last:
            # Final celebration page: literally word mode's own page painter,
            # just with the whole-book celebration line.
            return make_trace_page(sp, word, word_u, word_row1_base,
                                   word_row2_base,
                                   celebration='I can write the whole book!',
                                   skip_empty_row=True)
        return make_sentence_trace_page(sentence_of(sp))

    body = bb.story_pages(book, trace_text_page)
    pages = bb.paginate(body,
                        cover=(cover_painter, False),
                        halftitle=(page_halftitle, False),
                        words=(page_words, False),
                        back=(page_back, False))
    N = len(pages)

    suffix = 'tracing' if mode == 'word' else 'sentence-tracing'
    reading_path = os.path.join(outdir, '%s-A5-%s.pdf' % (book['slug'], suffix))
    c = rl_canvas.Canvas(reading_path, pagesize=(PW, PH))
    for i, (painter, is_story) in enumerate(pages):
        painter(c, book)
        if is_story:
            folio(c, i + 1, left=(i + 1) % 2 == 0)
        c.showPage()
    c.save()

    sheetW, sheetH = landscape(A4)
    print_path = os.path.join(outdir, '%s-A5-%s-booklet-print.pdf' % (book['slug'], suffix))
    c = rl_canvas.Canvas(print_path, pagesize=(sheetW, sheetH))
    order = []
    for k in range(N // 2):
        order.append((N - k, k + 1) if k % 2 == 0 else (k + 1, N - k))
    for si, (li, ri) in enumerate(order):
        for idx, xoff in ((li, 0), (ri, sheetW / 2)):
            painter, is_story = pages[idx - 1]
            c.saveState()
            c.translate(xoff + (sheetW / 2 - PW) / 2, (sheetH - PH) / 2)
            c.setFillColorRGB(1, 1, 1)
            painter(c, book)
            if is_story:
                folio(c, idx, left=(idx % 2 == 0))
            c.restoreState()
        c.setStrokeColorRGB(0, 0, 0)
        c.setLineWidth(0.3)
        c.line(sheetW / 2, sheetH - 4 * mm, sheetW / 2, sheetH - 9 * mm)
        c.line(sheetW / 2, 4 * mm, sheetW / 2, 9 * mm)
        if si == 0:
            bb.draw_print_note(c)
        c.showPage()
    c.save()

    print(book['slug'], N, 'pages,', N // 4, 'sheets, target word =', word)
    print(reading_path)
    print(print_path)
    return reading_path, print_path


def is_sat_cast_letter_book(book):
    """True for every book in the numbered 'the-sat cast' letter-book chain:
    the-sat itself, plus every subsequent letter book (the-spat, the-pit,
    the-pat, the-nap, the-mat, the-sad, the-dig, the-dog, the-cot, the-kit,
    the-egg, the-mud, the-rat, the-hot, the-bug) — 16 books total.

    books_def.py has no single boolean/tag field for "is a sat-cast letter
    book", so this predicate is built from two fields that ARE reliably
    distinct across all of BOOKS:
      - book['booknum'] starts with 'LETTER BOOK' for every letter book.
        the-sat itself is the one exception (its booknum is
        'BOOK THREE OF SIX', not a 'LETTER BOOK...' one) so it is
        special-cased in by slug.
      - book['band'] contains 'companion reader' for the ONE entry whose
        booknum also starts with 'LETTER BOOK' but is explicitly NOT part
        of the chain: 'the-tall' (booknum='LETTER BOOK · TALL',
        band='LETTER T  ·  s a t (companion reader)') — books_def.py's own
        comment says so outright ("NOT part of the-sat cast/numbering
        chain"). Excluding on 'companion reader' filters it out.
    Every other BOOKS entry (snake-in-my-sock, an-apple-for-ant, spat,
    sit-sit-sit, nap-ant-nap) has a plain 'BOOK N OF SIX' booknum and fails
    the 'LETTER BOOK' prefix check outright, so no extra exclusion is
    needed for those.
    """
    if book['slug'] == 'the-sat':
        return True
    booknum = book.get('booknum', '')
    band = book.get('band', '')
    return booknum.startswith('LETTER BOOK') and 'companion reader' not in band


# ---------------------------------------------------------- Easy Readers ---
# 2026-09-05 (Tredoux, "UNIFY"): the 11 standalone Easy Readers are built by
# THIS generator now, so their tracing workbook is the same object the 19
# letter books get -- same page_cover()/bookplate, same half-title, same
# WORDS IN THIS BOOK, same back cover, same folio, same A5 saddle-stitch
# imposition. Everything below only ASSEMBLES a book dict of the shape
# build_booklets.py already expects; not one shared painter is touched, so
# the letter-book output is bit-for-bit unchanged by this addition.
EASY_READERS_MANIFEST = os.path.join(
    REPO, 'lib', 'montree', 'english-curriculum', 'spec',
    'easy-readers-manifest-v2.json')
# Same two roots build_book_works.py's load_easy_reader() searches, in the
# same order: the in-repo permanent home first, the old Desktop scratch
# folder only as a fallback for machines that still carry it.
EASY_READERS_ART_ROOTS = [
    os.path.join(REPO, 'phonics-images', 'easy-readers'),
    os.path.expanduser(
        '~/Desktop/English Curriculum 2026/Dark Phonics/Easy Readers'),
]
LESSONS_TS = os.path.join(REPO, 'lib', 'montree', 'dark-phonics', 'lessons.ts')
MATERIALS_ROOT = os.path.join(REPO, 'public', 'dark-phonics-materials')

# The library page writes a reader's printables under `materialsSlug ?? slug`
# (app/montree/library/dark-phonics/page.tsx). Exactly one reader overrides
# it: fox-in-a-box ships at /dark-phonics-materials/fox-in-a-box-reader/,
# because an unrelated retired pattern storybook already owned
# .../fox-in-a-box/. Building to the bare slug there would write a file the
# site never reads. Keep this map in sync with lessons.ts.
READER_MATERIALS_SLUG = {'fox-in-a-box': 'fox-in-a-box-reader'}

_LESSON_SOUND_RE = re.compile(r"\{\s*n:\s*(\d+),\s*sound:\s*'([^']*)'")
# Function words carry no phonics load, so they never win "the word this
# reader is about" -- the hero word feeds the WORDS IN THIS BOOK page's NEW
# slot and the celebration page's traced word.
_READER_STOPWORDS = {
    'a', 'an', 'the', 'is', 'in', 'on', 'and', 'to', 'it', 'of', 'my',
    'at', 'off', 'this', 'that', 'i',
}


def reader_art(slug, n):
    """Locate spread N's art for an easy reader, extension-agnostic --
    verbatim the rule build_book_works.reader_art() uses."""
    for root in EASY_READERS_ART_ROOTS:
        for ext in ('png', 'jpg', 'jpeg', 'PNG', 'JPG'):
            cand = os.path.join(root, slug, 'p%d.%s' % (n, ext))
            if os.path.exists(cand):
                return cand
    raise FileNotFoundError(
        'no art for %s p%d under %s' % (slug, n, EASY_READERS_ART_ROOTS))


def reader_cover_art(slug):
    """The reader's own cover image (cover.png/jpg), falling back to its
    last spread's art the way the letter books reuse their recap tile."""
    for root in EASY_READERS_ART_ROOTS:
        for ext in ('png', 'jpg', 'jpeg', 'PNG', 'JPG'):
            cand = os.path.join(root, slug, 'cover.%s' % ext)
            if os.path.exists(cand):
                return cand
    return None


def lesson_sounds():
    """gate number -> the sound that gate teaches, read live out of
    lessons.ts so the cover band can never drift from the library page."""
    try:
        text = io.open(LESSONS_TS, encoding='utf-8').read()
    except OSError:
        return {}
    return {int(n): sound for n, sound in _LESSON_SOUND_RE.findall(text)}


def _reader_words(reader):
    """Every distinct word the reader prints, in first-appearance order,
    lowercased and stripped of punctuation."""
    seen, out = set(), []
    for page in reader['pages']:
        for token in str(page['text']).split():
            word = re.sub(r"[^A-Za-z'-]", '', token).lower()
            if word and word not in seen:
                seen.add(word)
                out.append(word)
    return out


def reader_hero_word(reader):
    """The content word this reader repeats most (ties broken by first
    appearance) -- 'cat' for the-cat-sat, 'splash' for big-splash. Used for
    the NEW slot on WORDS IN THIS BOOK and for the celebration page."""
    counts, order = Counter(), []
    for page in reader['pages']:
        for token in str(page['text']).split():
            word = re.sub(r"[^A-Za-z'-]", '', token).lower()
            if not word or word in _READER_STOPWORDS:
                continue
            if word not in counts:
                order.append(word)
            counts[word] += 1
    if not counts:
        return ''
    best = max(counts.values())
    for word in order:
        if counts[word] == best:
            return word
    return order[0]


def _wrap(words, maxchars=22):
    """Wrap the word list into short centred lines. page_words draws its
    REVIEW lines at a FIXED 19pt with no auto-shrink, so the wrap has to
    happen here or a long line runs off the page."""
    lines, cur = [], ''
    for word in words:
        cand = (cur + '  ' + word).strip() if cur else word
        if cur and len(cand) > maxchars:
            lines.append(cur)
            cur = word
        else:
            cur = cand
    if cur:
        lines.append(cur)
    return lines


def load_reader_book(slug):
    """An Easy Reader as a build_booklets-shaped book dict.

    Field-by-field, this is the same shape books_def.py hands the letter
    books and build_a5_readers.make_book() hands the pattern books, so every
    house painter works on it unmodified:
      title_lines/title_accent  cover title, last word in the house red
      band                      'DARK PHONICS  .  SOUND <s>  .  EASY READER'
                                (the gate's own sound, read from lessons.ts)
      booknum                   the line page_back prints under the imprint
      cover                     phonics-images/easy-readers/<slug>/cover.*
      new / review              WORDS IN THIS BOOK: the reader's hero word,
                                then every word the book prints
      spreads                   one per manifest page: the printed sentence
                                as `text` with no `nar` -- a reader page has
                                no lead-in/reveal split, which is exactly
                                why readers build in --sentences mode.
    """
    with io.open(EASY_READERS_MANIFEST, encoding='utf-8') as fh:
        data = json.load(fh)
    reader = next((r for r in data['readers'] if r['slug'] == slug), None)
    if reader is None:
        raise ValueError('no easy reader with slug=%r in %s'
                         % (slug, EASY_READERS_MANIFEST))

    cover = reader_cover_art(slug)
    spreads = [{'nar': '', 'text': p['text'], 'size': 92,
                'art': reader_art(slug, p['n'])}
               for p in reader['pages']]
    if cover is None:
        cover = spreads[-1]['art']

    title = reader['title']
    accent = title.split()[-1] if title.split() else ''
    if accent and title.count(accent) != 1:
        accent = None                      # ambiguous; page_cover skips it

    sound = lesson_sounds().get(reader.get('gate'))
    band = ('DARK PHONICS  \u00b7  SOUND %s  \u00b7  EASY READER' % sound
            if sound else 'DARK PHONICS  \u00b7  EASY READER')

    hero = reader_hero_word(reader)
    # NEW = the word this reader is about; REVIEW = every OTHER word it
    # prints, alphabetically, so the page reads as a real word list rather
    # than a transcript of page 1. Same two slots the letter books use
    # (the-sat: new='Sat  \u00b7  at', review='a').
    words = sorted(w for w in _reader_words(reader) if w != hero)
    return dict(
        slug=slug,
        title_lines=[title],
        title_accent=accent,
        title_size=44,
        band=band,
        booknum='EASY READER',
        cover=cover,
        new=hero,
        review=_wrap(words),
        spreads=spreads,
    )


def easy_reader_slugs():
    with io.open(EASY_READERS_MANIFEST, encoding='utf-8') as fh:
        return [r['slug'] for r in json.load(fh)['readers']]


def build_reader_workbook(slug, materials_root=None):
    """Build one Easy Reader's tracing workbook straight into the path the
    live site links: public/dark-phonics-materials/<materialsSlug>/
    tracing-workbook.pdf. Same two-file build as every other slug in the
    family -- the A5 reading-order proof is a working file, the imposed
    booklet-print IS the deliverable -- so the proof is deleted and the
    print file renamed into place, exactly as build_a5_tracing.py and
    _patched_trace.py already do for the other 19."""
    book = load_reader_book(slug)
    root = materials_root or MATERIALS_ROOT
    dest_dir = os.path.join(root, READER_MATERIALS_SLUG.get(slug, slug))
    os.makedirs(dest_dir, exist_ok=True)
    reading_path, print_path = build_trace_booklet(book, dest_dir,
                                                    mode='sentence')
    dest = os.path.join(dest_dir, 'tracing-workbook.pdf')
    shutil.move(print_path, dest)
    # The Cowork device mount refuses unlink() ("Operation not permitted"),
    # so fall back to parking the proof under _to_delete/ the same way
    # _patched_trace.py already does for the sat-cast rebuilds.
    try:
        os.remove(reading_path)
    except OSError:
        stray_dir = os.path.join(REPO, '_to_delete', 'tracing-proofs')
        os.makedirs(stray_dir, exist_ok=True)
        shutil.move(reading_path,
                    os.path.join(stray_dir, os.path.basename(reading_path)))
    print('reader', slug, '->', dest)
    return dest


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('slugs', nargs='*',
                     help="one or more book slugs to build (default: the-sat)")
    ap.add_argument('--all', action='store_true',
                     help='build every book in the sat-cast letter-book '
                          'chain (see is_sat_cast_letter_book())')
    ap.add_argument('--out', default=os.path.join(REPO, 'public', 'dark-phonics-books', 'print'),
                     help='output directory (default: <repo>/public/dark-phonics-books/print)')
    ap.add_argument('--sentences', action='store_true',
                     help='advanced edition: trace the whole sentence per '
                          'spread instead of just the hero word')
    ap.add_argument('--readers', action='store_true',
                     help='treat the slugs (or --all) as standalone Easy '
                          'Readers instead of sat-cast letter books; output '
                          'goes straight to public/dark-phonics-materials/'
                          '<materialsSlug>/tracing-workbook.pdf')
    a = ap.parse_args()

    if a.readers:
        return main_readers(a)

    mode = 'sentence' if a.sentences else 'word'

    # Resolve --out against the caller's cwd BEFORE we chdir(HERE) below.
    out_dir = os.path.abspath(a.out)

    if a.all:
        targets = [b['slug'] for b in BOOKS if is_sat_cast_letter_book(b)]
    elif a.slugs:
        targets = a.slugs
    else:
        targets = ['the-sat']

    # The reader build (_build_one.py / build_booklets.py) resolves each
    # spread's relative art path (e.g. the-sat's 'tiles/SAT-p1.png') against
    # the caller's cwd, with no joining against any script-relative
    # directory. On the real machine that means cwd == this directory,
    # since the repo's actual (non-symlink) tiles/ folder lives right here
    # alongside books_def.py. chdir once, up front, so this driver
    # reproduces that same cwd assumption regardless of where it was
    # invoked from. Absolute art paths (the-spat, the-pat, ... via the
    # .../phonics-images/... vars in books_def.py) are unaffected either
    # way.
    os.chdir(HERE)

    failed = []
    for slug in targets:
        try:
            book = next((b for b in BOOKS if b['slug'] == slug), None)
            if book is None:
                raise ValueError('no book with slug=%r in BOOKS' % slug)
            build_trace_booklet(book, out_dir, mode=mode)
            print('[ok]', slug)
        except Exception as e:
            print('[FAIL] %s: %s' % (slug, e))
            failed.append(slug)

    if sf.MISSING:
        print('WARNING unmapped characters:', sorted(sf.MISSING))

    if failed:
        sys.exit(1)


def main_readers(a):
    """--readers driver. Easy Readers always build in sentence mode (see
    load_reader_book()); --out overrides the dark-phonics-materials root."""
    targets = easy_reader_slugs() if a.all else a.slugs
    if not targets:
        raise SystemExit('--readers needs one or more reader slugs, or --all')
    known = set(easy_reader_slugs())
    unknown = [s for s in targets if s not in known]
    if unknown:
        raise SystemExit('unknown reader slug(s): ' + ', '.join(unknown))

    root = MATERIALS_ROOT
    default_out = os.path.join(REPO, 'public', 'dark-phonics-books', 'print')
    if os.path.abspath(a.out) != default_out:
        root = os.path.abspath(a.out)

    failed = []
    for slug in targets:
        try:
            build_reader_workbook(slug, root)
            print('[ok]', slug)
        except Exception as e:                                # noqa: BLE001
            print('[FAIL] %s: %s' % (slug, e))
            failed.append(slug)

    if sf.MISSING:
        print('WARNING unmapped characters:', sorted(sf.MISSING))
    if failed:
        sys.exit(1)


if __name__ == '__main__':
    main()
