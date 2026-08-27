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

Target word + celebration line are derived from the book dict itself
(`book['new']`'s first token), so this works for every book in the sat-cast
letter-book chain, not just 'the-sat' — see is_sat_cast_letter_book() below.

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

Usage:
    python3 build_tracing_booklet.py                 # builds the-sat only
    python3 build_tracing_booklet.py the-sat the-spat # builds these slugs
    python3 build_tracing_booklet.py --all            # every sat-cast
                                                       # letter-book chain title
    python3 build_tracing_booklet.py the-sat --out /path/to/outdir
    python3 build_tracing_booklet.py the-sat --sentences   # advanced edition
"""
import argparse
import io
import os
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
            # Per Tredoux 2026-08-22: word mode's traced word is sized to
            # match the real book exactly, which no longer leaves room for
            # the second, empty "write it unaided" row — skip_empty_row=True
            # on every word-mode page. word_row2_base is a dead value
            # everywhere it is passed; left computed so re-adding a second
            # row later is a one-line change, not a rewire.
            return make_trace_page(sp, word, word_u, word_row1_base,
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
    a = ap.parse_args()

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


if __name__ == '__main__':
    main()
