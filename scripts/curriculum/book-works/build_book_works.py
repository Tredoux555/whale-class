# -*- coding: utf-8 -*-
"""Book Works pipeline -- reusable, data-driven, per-book.

Generates the four approved manipulative works (picture match, sentence &
picture match, sentence builder guided/free) for any Dark Phonics book.
Same fonts/layout/geometry as the approved the-cat-sat draft
(_draft_book_works.py), refactored so the book content (title, sentences,
art) is data-driven instead of hard-coded.

Two content sources, auto-detected by slug:
  a) EASY READERS   -- lib/montree/english-curriculum/spec/
                        easy-readers-manifest-v2.json (e.g. the-cat-sat)
  b) LETTER BOOKS   -- scripts/curriculum/flashcards/books_def.py (BOOKS)
                        (e.g. the-sat, the-spat, the-pat, the-pit, the-nap)

Usage:
    python3 build_book_works.py <slug> [<slug> ...]

Output:
    materials-out/book-works/<slug>/<slug>-work1-picture-match.pdf (etc.)

================================================================================
LAYOUT STANDARD (2026-08-27, approved)
================================================================================
Approved by Tredoux on 2026-08-27. This is the house layout for every Dark
Phonics book work. Do NOT revert to the old rounded/dashed-card-per-item
layout, and do not "tidy" these rules away in a later pass.

1. BASE / WORKING / CONTROL SHEETS
   Solid thin rules (0.6 pt), square corners, zero gap between cells: a plain
   shared-boundary table grid. Every slot is drawn FULL SIZE and bordered.
   These sheets are never cut -- their instruction line says so.

2. CUT SHEETS
   The only lines on a cut sheet are the DASHED guillotine lines. Tabs
   themselves carry NO border of their own -- you cut directly on the dashed
   line. Cut sheets reuse the base grid's row/column COUNT so a cut tab always
   corresponds 1:1 to a slot.

3. ONE CONTINUOUS STROKE PER BOUNDARY
   Each cut line is a single full-width / full-height stroke (see grid_lines),
   never one rect per cell. That is what makes each boundary exactly one
   straight guillotine cut.

4. TAB CLEARANCE -- TAB_GAP = 2 mm
   A cut tab must DROP INTO its slot, so each cut-grid cell is 2 mm smaller on
   every side, i.e. 4 mm narrower and 4 mm shorter than the slot it fills
   (see tab_grid). The cut grid is centred on the sheet.

5. INSTRUCTION LINE STATES THE CUT COUNT
   Cut sheets print "Cut on the dashed lines - N straight cuts." where
   N = (n_rows + 1) + (n_cols + 1) (see cut_note). Non-cut sheets print an
   explicit "do not cut" line.

6. WORKS 1 & 2 COLUMN ORDER -- PICTURE ON THE LEFT (2026-08-31, approved)
   Approved by Tredoux on 2026-08-31. pair_page() (works 1 & 2: Picture
   Match, Sentence & Picture Match) draws col_w = [PIC_W, SENT_W] -- picture
   in column 0, sentence in column 1 -- matching works 3 & 4 (sentence
   builder), which already led with the picture column. Do NOT revert to
   picture-on-the-right.

7. WORK 3 -- ONLY THE CHANGING WORD IS A PIECE (2026-09-02, approved)
   Approved by Tredoux on 2026-09-02. In Work 3 (Sentence Builder -- guided)
   a word column is a cut-out piece only if the word CHANGES between rows;
   columns whose word is identical in every row (case + punctuation
   normalised) are STATIC and print in ink straight onto the working sheet,
   along with the picture cue. The grey guide word stays under each
   changing-word cell, and the cut sheet holds the changing words only --
   e.g. "The ___ Sat!" prints "The" and "Sat!" and cuts out
   ant / snake / apple / sun / star / cat. See changing_cols() and
   sb_changing_cutsheet(). Work 4 (free) is unchanged: every word is a piece
   there. Works 1 & 2 unchanged.

8. CLEAN SENTENCES IN EVERY WORK -- NO ELLIPSIS (2026-09-02, approved)
   Approved by Tredoux on 2026-09-02: "we are teaching correct grammar."
   Every row of works 1-4 prints ONE clean sentence built from the spread by
   clean_sentence(nar, reveal) -- lead-in with its "…"/"..." stripped, the
   reveal lower-cased into it, exactly one terminal mark. "The ant…" + "Sat!"
   becomes "The ant sat!". Works 3 & 4 split that clean sentence on spaces
   for their word tabs, so the changing-column rule (7) reads clean words.

9. WORK 0 -- CHARACTERS STRIP (2026-09-02, approved)
   The preliminary work for the book: a 65 mm strip of blank bordered boxes,
   one per character in first-appearance order, its duplex BACK printed as the
   control, plus a cut sheet of character picture tabs. See build_work0().
================================================================================
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
FLASHCARDS = os.path.join(REPO, 'scripts', 'curriculum', 'flashcards')

# Fonts: same auto-detect pattern as flashcards/_build_one.py -- prefer the
# repo's own canvas-fonts copy when present (Mac), else fall back to the
# Cowork cloud container's canvas-design skill folder.
_FONTS_DIR = os.path.join(FLASHCARDS, 'canvas-fonts')
if os.path.exists(os.path.join(_FONTS_DIR, 'YoungSerif-Regular.ttf')):
    os.environ.setdefault('MONTREE_CANVAS_FONTS', _FONTS_DIR)

sys.path.insert(0, FLASHCARDS)

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as rl_canvas

F = os.environ.get('MONTREE_CANVAS_FONTS',
                    '/root/.claude/skills/canvas-design/canvas-fonts/')
if not F.endswith('/'):
    F += '/'
pdfmetrics.registerFont(TTFont('Title', F + 'YoungSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Word', F + 'Outfit-Bold.ttf'))
pdfmetrics.registerFont(TTFont('WordRg', F + 'Outfit-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Nar', F + 'Lora-Italic.ttf'))
pdfmetrics.registerFont(TTFont('Label', F + 'WorkSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LabelB', F + 'WorkSans-Bold.ttf'))

INK = (0, 0, 0)
RED = (0.776, 0.157, 0.157)
GREY = (0, 0, 0)
FAINT = (0, 0, 0)
LINE = (0, 0, 0)

PW, PH = A4
M = 14 * mm
CW = PW - 2 * M
CONTENT_BOTTOM = M + 12 * mm
MAX_ROWS = 7

OUT_ROOT = os.path.join(REPO, 'materials-out', 'book-works')
EASY_READERS_MANIFEST = os.path.join(
    REPO, 'lib', 'montree', 'english-curriculum', 'spec',
    'easy-readers-manifest-v2.json')
# Easy Reader spread art. The permanent home is inside the repo
# (phonics-images/easy-readers/<slug>/pN.jpg); the old Desktop scratch
# folder is kept only as a fallback for machines that still have it.
EASY_READERS_ART_ROOTS = [
    os.path.join(REPO, 'phonics-images', 'easy-readers'),
    os.path.expanduser(
        '~/Desktop/English Curriculum 2026/Dark Phonics/Easy Readers'),
]


# --------------------------------------------------------------- helpers ---
def fit(text, font, size, maxw, floor=10, step=0.5):
    while size > floor and stringWidth(text, font, size) > maxw:
        size -= step
    return size


def hairline(c, x1, y, x2, color=LINE, width=0.6):
    c.setStrokeColorRGB(*color)
    c.setLineWidth(width)
    c.line(x1, y, x2, y)


def draw_image_contained(c, path, x, y, w, h):
    img = ImageReader(path)
    iw, ih = img.getSize()
    ar = ih / iw
    dw, dh = w, w * ar
    if dh > h:
        dh, dw = h, h / ar
    dx, dy = x + (w - dw) / 2, y + (h - dh) / 2
    c.drawImage(img, dx, dy, dw, dh, mask='auto')


def centered(c, xc, y, text, font, size, color):
    c.setFont(font, size)
    c.setFillColorRGB(*color)
    c.drawCentredString(xc, y, text)


def header(c, book_title, work_name):
    """Small subtle masthead: book title + red accent dot, work name label,
    a hairline. Returns content_top (y of first usable content row)."""
    top = PH - M
    tsize = fit(book_title, 'Title', 14, CW - 20 * mm, floor=10)
    c.setFont('Title', tsize)
    c.setFillColorRGB(*INK)
    c.drawString(M, top - 6 * mm, book_title)
    tw = stringWidth(book_title, 'Title', tsize)
    c.setFillColorRGB(*RED)
    c.circle(M + tw + 3 * mm, top - 6 * mm + 2 * mm, 0.9 * mm,
              stroke=0, fill=1)
    c.setFont('Label', 8)
    c.setFillColorRGB(*GREY)
    c.drawString(M, top - 12 * mm, work_name.upper())
    hairline(c, M, top - 15.5 * mm, PW - M)
    return top - 15.5 * mm - 7 * mm


def footer(c, book_title, work_name):
    txt = 'MONTREE PHONICS · %s · %s' % (book_title, work_name)
    c.setFont('Label', 6.5)
    c.setFillColorRGB(*FAINT)
    c.drawRightString(PW - M, 8 * mm, txt)


def row_positions(content_top, n):
    """Evenly divide the content zone into n row bands; return the pitch
    and each row's bottom y (band = [bottom, bottom+pitch])."""
    usable = content_top - CONTENT_BOTTOM
    pitch = usable / n
    bottoms = [content_top - (i + 1) * pitch for i in range(n)]
    return pitch, bottoms


# ------------------------------------------------------------- content ----
def resolve_art(raw_path):
    """Most book dicts carry a working absolute Mac path already. A few
    older entries (e.g. the-sat) carry stale relative Cowork-container
    paths like 'tiles/SAT-p1.png' -- fall back to the permanent
    phonics-images/satpin-v2/books/<name>/<name>-pN.ext location.

    2026-08-29: when this script runs inside the Cowork device-bridge VM
    (rather than a real Mac terminal), the repo is mounted at a different
    absolute path, so the literal Mac paths baked into books_def.py
    (SPAT2, PIT3, PAT4, ... -- all '/Users/.../ACTIVE/montree/phonics-images/...')
    don't resolve even though the same file exists at the same path
    RELATIVE to this repo. Re-root any such path onto REPO by keeping
    everything from its 'phonics-images' path segment onward, before
    falling back to the name-guessing regex below. No-op on a real Mac,
    where the first branch above already returns."""
    if os.path.isabs(raw_path) and os.path.exists(raw_path):
        return raw_path
    if os.path.exists(raw_path):
        return os.path.abspath(raw_path)
    parts = raw_path.replace(os.sep, '/').split('/')
    if 'phonics-images' in parts:
        i = parts.index('phonics-images')
        candidate = os.path.join(REPO, *parts[i:])
        if os.path.exists(candidate):
            return candidate
    base = os.path.basename(raw_path)
    m = re.match(r'([A-Za-z0-9]+)-p(\d+)\.(\w+)$', base)
    if m:
        name, num, ext = m.groups()
        candidate = os.path.join(REPO, 'phonics-images', 'satpin-v2', 'books',
                                  name.lower(), '%s-p%s.%s' % (name.lower(), num, ext))
        if os.path.exists(candidate):
            return candidate
    raise FileNotFoundError('cannot resolve art path: %r' % raw_path)


def reader_art(slug, n):
    """Locate spread N's art for an easy reader, extension-agnostic."""
    for root in EASY_READERS_ART_ROOTS:
        for ext in ('png', 'jpg', 'jpeg', 'PNG', 'JPG'):
            cand = os.path.join(root, slug, 'p%d.%s' % (n, ext))
            if os.path.exists(cand):
                return cand
    raise FileNotFoundError(
        'no art for %s p%d under %s' % (slug, n, EASY_READERS_ART_ROOTS))


def load_easy_reader(slug):
    with open(EASY_READERS_MANIFEST) as f:
        data = json.load(f)
    reader = next((r for r in data['readers'] if r['slug'] == slug), None)
    if reader is None:
        return None
    # An easy reader's page carries the whole printed line already (there is
    # no nar/reveal split), so it goes through clean_sentence() as a
    # reveal-only sentence: ellipses stripped, one terminal mark kept, case
    # untouched because the reveal starts the sentence.
    rows, flags = [], []
    for p in reader['pages']:
        text = clean_sentence('', p['text'])
        if text != p['text']:
            flags.append('reader sentence cleaned: %r -> %r'
                          % (p['text'], text))
        rows.append({'text': text, 'art': reader_art(slug, p['n'])})
    return reader['title'], rows, flags, 'easy-reader'


# --------------------------------------------------------- clean sentence --
# 2026-09-02 (approved by Tredoux) -- CLEAN SENTENCE RULE, works 1-4.
# "We are teaching correct grammar." A works row never prints the book's
# page-turn ellipsis. Every row's sentence is ONE clean sentence built from
# the spread:
#     lead-in (nar) with its ellipses removed
#   + the reveal (text) with its first letter lower-cased -- unless the reveal
#     actually starts the sentence (no lead-in, or the lead-in already closed
#     with . ! ?), or it is "I", or it is a shouted ALL-CAPS word
#   + exactly one terminal mark: "!" if the reveal ended on one, "?" if it
#     ended on one, otherwise "."
#     "The ant…" + "Sat!"  ->  "The ant sat!"
# Works 1 & 2 print this sentence on their sentence cards; works 3 & 4 split
# it on spaces for their word tabs ("The", "ant", "sat!"), so the work 3
# changing-column rule operates on the clean words.
# Two shapes the raw spreads throw at the rule:
#  · a reveal that itself ENDS on an ellipsis is a sentence the page has not
#    finished ("An ant naps in a…", continued overleaf) -- there is no clean
#    sentence to print, so load_letterbook() drops that row with a flag;
#  · a reveal that closes on a quotation mark ("...it!”") already carries its
#    terminal mark inside the quote, so no second mark is added.
_ELLIPSIS_RE = re.compile(r'\s*(?:…|\.\.\.)\s*')
_ELLIPSIS_END_RE = re.compile(r'(?:…|\.\.\.)\s*$')
_TERMINAL_RE = re.compile(r'[.!?]+$')
_QUOTED_END_RE = re.compile(r'[.!?][”"’\']\s*$')


def _strip_ellipsis(text):
    """Remove every '…' / '...' and tidy the whitespace it leaves behind."""
    out = _ELLIPSIS_RE.sub(' ', text or '')
    out = re.sub(r'\s+', ' ', out).strip()
    return re.sub(r'\s+([,;:!?.])', r'\1', out)


def _terminal_mark(text):
    m = _TERMINAL_RE.search(text or '')
    run = m.group(0) if m else ''
    if '!' in run:
        return '!'
    if '?' in run:
        return '?'
    return '.'


def _lower_first(fragment):
    """Lower the reveal's opening letter so it reads as the continuation it
    is. Deliberately narrow: an ALL-CAPS opening word is a shouted target
    word (a house convention, e.g. 'SOCK!'), and "I" is a proper word -- both
    are left exactly as they are."""
    if not fragment:
        return fragment
    first = fragment.split(' ', 1)[0].strip('!?.,“”"’')
    if first == 'I' or (len(first) > 1 and first.isupper()):
        return fragment
    return fragment[0].lower() + fragment[1:]


def clean_sentence(nar, reveal):
    """The one place the clean-sentence rule lives (see the block above).
    Mirrored on the TS side by cleanSentence() in
    lib/montree/dark-phonics/v2-shelf/works.ts."""
    lead = _strip_ellipsis(nar)
    rev = _strip_ellipsis(reveal)
    if not rev:
        body, mark = _TERMINAL_RE.sub('', lead).strip(), _terminal_mark(lead)
    elif _QUOTED_END_RE.search(rev):
        # the reveal closes inside a quotation -- its mark is already there
        mark, body = '', rev
        if lead and not _TERMINAL_RE.search(lead):
            body = _lower_first(body)
        if lead:
            body = (lead + ' ' + body).strip()
    else:
        mark = _terminal_mark(rev)
        body = _TERMINAL_RE.sub('', rev).strip()
        if lead and not _TERMINAL_RE.search(lead):
            # the reveal continues the lead-in, so it is not a fresh sentence
            body = _lower_first(body)
        if lead:
            body = (lead + ' ' + body).strip()
    body = re.sub(r'\s+', ' ', body).strip()
    body = re.sub(r'\s+([,;:])', r'\1', body)
    return (body + mark) if body else ''


# Pre-decodable books (lessons 1-2). Their books_def spreads are phoneme play
# ('Sss- SUN!', 'Sss- SOAP!') and, for ant-on-my-apple, absent altogether, so
# neither yields the decodable sentence set the four works need. Their letter
# JSONs do carry it (pages[].sentence + pages[].art), so these two build from
# there instead. Everything else keeps its existing source untouched.
DP_JSON_SLUGS = {'snake-in-my-sock', 'ant-on-my-apple'}
DP_LETTERS_DIR = os.path.join(REPO, 'scripts', 'curriculum',
                              'satpin-paperwork', 'letters')


def load_dp_json(slug):
    path = os.path.join(DP_LETTERS_DIR, 'dp-%s.json' % slug)
    if not os.path.exists(path):
        return None
    with open(path) as f:
        cfg = json.load(f)
    art_dir = os.path.join(REPO, cfg['artDir'])
    rows = []
    for p in sorted(cfg['pages'], key=lambda q: q['order']):
        art = os.path.join(art_dir, p['art'])
        if not os.path.exists(art):
            raise FileNotFoundError('cannot resolve art path: %r' % art)
        rows.append({'text': clean_sentence('', p['sentence']), 'art': art})
    return cfg['bookTitle'], rows, [], 'dp-letter-json'


def load_letterbook(slug):
    from books_def import BOOKS  # noqa: E402  (sys.path set up above)
    book = next((b for b in BOOKS if b['slug'] == slug), None)
    if book is None:
        return None
    title = ' '.join(book['title_lines']).replace('  ', ' ')
    rows = []
    flags = []
    for sp in book['spreads']:
        if sp.get('style') == 'drop':
            continue
        art = sp.get('art')
        nar = sp.get('nar')
        text = sp.get('text')
        if not art or not (nar or text):
            continue
        if isinstance(text, list):
            text_joined = ' '.join(text)
        else:
            text_joined = text or ''
        if '?!' in (nar or '') + text_joined:
            flags.append('excluded nar-only cliffhanger fragment '
                          '(contains "?!"): %r' % ((nar or '') + text_joined))
            continue
        if _ELLIPSIS_END_RE.search(text_joined):
            flags.append('excluded unfinished sentence (its reveal runs on '
                          'over the page turn): %r'
                          % ((nar + ' ' if nar else '') + text_joined))
            continue
        sentence = clean_sentence(nar, text_joined)
        if not text_joined:
            flags.append('sentence built from nar only (no printed text on '
                          'that page) -- likely a narrative cue, not a true '
                          'decodable sentence: %r' % sentence)
        rows.append({'text': sentence, 'art': resolve_art(art)})
    if len(rows) > MAX_ROWS:
        dropped = rows.pop()
        flags.append('book yielded %d rows (> cap %d) -- dropped the '
                      'finale row: %r' % (len(rows) + 1, MAX_ROWS, dropped['text']))
    return title, rows, flags, 'letter-book'


def load_book(slug):
    if slug in DP_JSON_SLUGS:
        result = load_dp_json(slug)
        if result is not None:
            return result
    result = load_easy_reader(slug)
    if result is not None:
        return result
    result = load_letterbook(slug)
    if result is not None:
        return result
    return None


# ------------------------------------------------------- guillotine grid ---
# 2026-08-27 format change per Tredoux: every work sheet is now a plain
# table grid -- square corners, thin solid rules, zero gap between cells,
# column boundaries shared by every row -- exactly like build_tracing.py's
# word-card page. A sheet therefore comes apart with (nrows+1)+(ncols+1)
# full-width straight guillotine cuts instead of a hand-trim around each
# dashed, round-cornered card. Slot pages and cut sheets are built from the
# SAME grid call, so a cut card is always exactly slot-sized.
GUIDE = (0.55, 0.55, 0.55)
CELL_PAD = 5 * mm
MIN_CELL = 24 * mm


def grid_lines(c, x0, y_top, col_w, row_h, n_rows, width=0.6, dashed=False):
    """One continuous stroke per cut line -- never one rect per cell.

    On cut sheets the same lines are drawn DASHED so it is obvious at a
    glance which sheet gets chopped; they are still single full-width /
    full-height strokes, so each one remains one straight guillotine cut.
    """
    gw, gh = sum(col_w), row_h * n_rows
    c.setStrokeColorRGB(*LINE)
    c.setLineWidth(width)
    if dashed:
        c.setDash(3, 2.4)
    else:
        c.setDash()
    for i in range(n_rows + 1):
        y = y_top - i * row_h
        c.line(x0, y, x0 + gw, y)
    x = x0
    c.line(x, y_top, x, y_top - gh)
    for w in col_w:
        x += w
        c.line(x, y_top, x, y_top - gh)
    c.setDash()


def cell(x0, y_top, col_w, row_h, i, j):
    return (x0 + sum(col_w[:j]), y_top - (i + 1) * row_h, col_w[j], row_h)


def cell_text(c, box, text, size, color=INK, font='WordRg'):
    x, y, w, h = box
    c.setFont(font, size)
    c.setFillColorRGB(*color)
    c.drawCentredString(x + w / 2, y + h / 2 - size * 0.32, text)


def cell_image(c, box, path, inset=2 * mm):
    x, y, w, h = box
    draw_image_contained(c, path, x + inset, y + inset,
                         w - 2 * inset, h - 2 * inset)


# 2026-08-27 (2) per Tredoux: a cut tab must DROP INTO its slot, so the tab
# is smaller than the slot -- 2 mm of clearance on every side. The tab itself
# carries no printed border: the only lines on a cut sheet are the dashed
# guillotine lines, one single stroke per boundary, cut directly on. So the
# cut grid keeps the base grid's row/column COUNT but shrinks each cell by
# 2 * TAB_GAP in both axes, and is centred on the sheet. Base / working /
# control sheets are untouched -- solid rules, full-size slots.
TAB_GAP = 2 * mm


def tab_grid(col_w, row_h):
    """Base slot geometry -> cut-tab geometry (4 mm narrower and shorter)."""
    return [w - 2 * TAB_GAP for w in col_w], row_h - 2 * TAB_GAP


def instruction(c, y, text):
    c.setFont('Label', fit(text, 'Label', 8, CW, floor=5.5, step=0.25))
    c.setFillColorRGB(*GREY)
    c.drawString(M, y, text)


def cut_note(n_rows, n_cols):
    return ('Cut on the dashed lines — %d straight cuts. Tabs sit 2 mm '
            'inside their slots.' % ((n_rows + 1) + (n_cols + 1)))


NO_CUT = 'Working sheet — do not cut. Cards laid here match the printed cells exactly.'
CONTROL = 'Control of error — do not cut. Same grid as the working sheet, filled in.'


def grid_top_of(ct):
    return ct - 7 * mm


def fit_row_h(y_top, n, cap):
    return min(cap, (y_top - CONTENT_BOTTOM) / n)


# ---------------------------------------------------- work 1 & 2 geometry --
# 2026-08-29 per Tredoux: work 1 & 2 (picture match / sentence & picture
# match) now share the SAME card-sizing standard as work 3 & 4 (sentence
# builder) -- one picture-column width and one row-height cap for all four
# works, so no work's cards read as bigger or wastes more of the sheet than
# the others. PIC_W / ROW_H are the single canonical constants (see also
# their use in sb_metrics / sb_page below).
PIC_W = 44 * mm
ROW_H = 32 * mm
SENT_W = CW - PIC_W


def sent_size(rows, w):
    return min(fit(r['text'], 'WordRg', 26, w - 2 * CELL_PAD, floor=11)
               for r in rows)


def pair_page(c, title, work_name, rows, instr, show_text, show_pic,
              cut=False):
    """One row per sentence, two shared columns: [picture | sentence].
    (2026-08-31 per Tredoux: picture column moved to the LEFT for works 1 & 2,
    matching works 3 & 4 where the picture already leads the row. Nothing else
    about the layout changed.)
    Used for the working sheet, the control and the cut sheet alike."""
    ct = header(c, title, work_name)
    instruction(c, ct, instr)
    y_top = grid_top_of(ct)
    n = len(rows)
    row_h = fit_row_h(y_top, n, ROW_H)
    col_w = [PIC_W, SENT_W]
    if cut:
        col_w, row_h = tab_grid(col_w, row_h)
    x0 = M + (CW - sum(col_w)) / 2
    grid_lines(c, x0, y_top, col_w, row_h, n, dashed=cut)
    size = sent_size(rows, col_w[1])
    for i, r in enumerate(rows):
        box_p = cell(x0, y_top, col_w, row_h, i, 0)
        box_t = cell(x0, y_top, col_w, row_h, i, 1)
        if show_text:
            cell_text(c, box_t, r['text'], size)
        if show_pic:
            cell_image(c, box_p, r['art'])
    footer(c, title, work_name)
    c.showPage()
    return row_h


# --------------------------------------------------------------- work 1 ---
def work1_cutsheet(c, title, work_name, rows, card_h):
    """Picture cards only, packed into as many shared columns as the sheet
    width allows -- cards stay exactly the size of the working-sheet slot."""
    ct = header(c, title, work_name + ' — cut sheet')
    y_top = grid_top_of(ct)
    ncols = max(1, min(len(rows), int(CW // PIC_W)))
    nrows = -(-len(rows) // ncols)
    col_w, tab_h = tab_grid([PIC_W] * ncols, card_h)
    x0 = M + (CW - sum(col_w)) / 2
    instruction(c, ct, cut_note(nrows, ncols))
    grid_lines(c, x0, y_top, col_w, tab_h, nrows, dashed=True)
    for i, r in enumerate(rows):
        cell_image(c, cell(x0, y_top, col_w, tab_h, i // ncols, i % ncols),
                   r['art'])
    footer(c, title, work_name)
    c.showPage()


def build_work1(slug, title, rows, out_dir):
    path = os.path.join(out_dir, '%s-work1-picture-match.pdf' % slug)
    c = rl_canvas.Canvas(path, pagesize=A4)
    name = 'Picture Match'
    row_h = pair_page(c, title, name, rows, NO_CUT, True, False)
    pair_page(c, title, name + ' — control of error', rows, CONTROL, True, True)
    work1_cutsheet(c, title, name, rows, row_h)
    c.save()
    return path


# --------------------------------------------------------------- work 2 ---
def build_work2(slug, title, rows, out_dir):
    path = os.path.join(out_dir, '%s-work2-sentence-picture-match.pdf' % slug)
    c = rl_canvas.Canvas(path, pagesize=A4)
    name = 'Sentence & Picture Match'
    pair_page(c, title, name, rows, NO_CUT, False, False)
    pair_page(c, title, name + ' — control of error', rows, CONTROL, True, True)
    # cut sheet: identical grid, filled -- n+1 across, 3 down.
    pair_page(c, title, name + ' — cut sheet', rows,
              cut_note(len(rows), 2), True, True, cut=True)
    c.save()
    return path


# ---------------------------------------------------- work 3 & 4 geometry --
def sb_metrics(rows):
    """One shared column per word position (plus the picture column), sized
    to the widest word in that position -- so every row's cells line up and
    a word card cut from the cut sheet drops exactly into its slot."""
    toks = [r['text'].split(' ') for r in rows]
    ncol = max(len(t) for t in toks)
    size = 22.0
    while True:
        col_w = [PIC_W]
        for j in range(ncol):
            w = max([stringWidth(t[j], 'WordRg', size)
                     for t in toks if j < len(t)] or [0])
            col_w.append(max(MIN_CELL, w + 2 * CELL_PAD))
        if sum(col_w) <= CW or size <= 9:
            # stretch the grid to the full content width so the cut lines
            # run edge to edge and the cards are as large as the sheet allows
            k = CW / sum(col_w)
            return size, [w * k for w in col_w]
        size -= 0.5


def _norm_word(word):
    """Case- and punctuation-insensitive form used to compare word columns."""
    return re.sub(r'[^a-z0-9]', '', word.lower())


def changing_cols(rows):
    """WORK 3 RULE (2026-09-02, approved by Tredoux) -- in the guided
    sentence builder ONLY the word that CHANGES between rows is a cut-out
    piece. A word column is STATIC when every row has a word in that position
    and all of them are the same once case and punctuation are normalised
    (e.g. 'The' ... 'Sat!' in "The ___ Sat!"); every other column is a
    CHANGING column. Static words are printed black straight onto the working
    sheet in their own cells; the grey guide word stays under each changing
    cell, and the cut sheet carries the changing words only.
    Work 4 (free) is deliberately untouched -- every word stays a piece there.

    Returns the list of changing column indices (0-based word position). If a
    book has no changing column at all (e.g. a single row), every column is
    treated as changing so the work still has pieces to place."""
    toks = [r['text'].split(' ') for r in rows]
    ncol = max(len(t) for t in toks)
    out = []
    for j in range(ncol):
        vals = [_norm_word(t[j]) if j < len(t) else None for t in toks]
        if any(v is None for v in vals) or len(set(vals)) > 1:
            out.append(j)
    return out or list(range(ncol))


def word_pad(cell_w):
    """Sizing padding for a word tab: CELL_PAD where the cell can afford it,
    15% of the cell (never under 3 mm) on narrow, word-dense grids."""
    return max(3 * mm, min(CELL_PAD, 0.15 * cell_w))


def sb_word_size(toks, col_w, row_h):
    """The stretched columns are wider than the tightest fit, so grow the word
    back up until the widest word in each column nearly fills its cell.

    Clearance from the dashed cut line is what matters here, so the sizing
    padding is proportional on narrow cells: a word-dense sentence can end up
    with a 12 mm column, where demanding a flat CELL_PAD (5 mm) on both sides
    is impossible and the fit bottoms out on its floor -- leaving the widest
    word crowding, or crossing, the cut line. word_pad() asks for CELL_PAD
    where there is room and 15% of the cell (min 3 mm) where there is not, and
    the floor is low enough that the fit is actually reachable."""
    return min([fit(t[j], 'WordRg', 34,
                    col_w[j + 1] - 2 * word_pad(col_w[j + 1]),
                    floor=7, step=0.25)
                for t in toks for j in range(len(t))] + [row_h * 0.42])


def sb_page(c, title, work_name, rows, instr, show_words, show_pics,
            word_color=INK, cut=False, changing=None):
    ct = header(c, title, work_name)
    instruction(c, ct, instr)
    y_top = grid_top_of(ct)
    n = len(rows)
    size, col_w = sb_metrics(rows)
    row_h = fit_row_h(y_top, n, ROW_H)
    if cut:
        col_w, row_h = tab_grid(col_w, row_h)
    toks = [r['text'].split(' ') for r in rows]
    size = sb_word_size(toks, col_w, row_h)
    x0 = M + (CW - sum(col_w)) / 2
    grid_lines(c, x0, y_top, col_w, row_h, n, dashed=cut)
    for i, r in enumerate(rows):
        if show_pics:
            cell_image(c, cell(x0, y_top, col_w, row_h, i, 0), r['art'])
        if show_words:
            for j, tok in enumerate(r['text'].split(' ')):
                # 2026-09-02: on a work 3 sheet `changing` marks the columns
                # whose word is a cut-out piece -- those keep the grey guide
                # colour, the static words print in normal ink.
                col = (word_color if changing is None or j in changing
                       else INK)
                cell_text(c, cell(x0, y_top, col_w, row_h, i, j + 1), tok,
                          size, col)
    footer(c, title, work_name)
    c.showPage()
    return len(col_w)


def sb_changing_cutsheet(c, title, work_name, rows, changing):
    """Work 3 cut sheet (2026-09-02): the pieces are the CHANGING words only.

    Tab widths and word size are taken from the same sb_metrics()/tab_grid()
    numbers the working sheet uses, so each tab still drops exactly into its
    slot with the standard 2 mm clearance. When there is a single changing
    column the tabs are packed across the sheet (same trick as
    work1_cutsheet) instead of leaving one narrow strip of paper."""
    ct = header(c, title, work_name)
    y_top = grid_top_of(ct)
    n = len(rows)
    toks = [r['text'].split(' ') for r in rows]
    _size, base_col_w = sb_metrics(rows)
    base_row_h = fit_row_h(y_top, n, ROW_H)
    tab_col_w, tab_h = tab_grid(base_col_w, base_row_h)
    size = sb_word_size(toks, tab_col_w, tab_h)
    widths = [tab_col_w[j + 1] for j in changing]
    if len(changing) == 1:
        j = changing[0]
        words = [t[j] for t in toks if j < len(t)]
        w = widths[0]
        ncols = max(1, min(len(words), int(CW // w)))
        # prefer a column count that fills its last row exactly (6 words in a
        # 4-wide sheet reads better as 3 x 2 than as 4 + 2 with two blanks)
        ncols = next((k for k in range(ncols, 1, -1)
                      if len(words) % k == 0), ncols)
        nrows = -(-len(words) // ncols)
        col_w = [w] * ncols
        placed = [(p // ncols, p % ncols, t) for p, t in enumerate(words)]
    else:
        col_w = widths
        nrows = n
        placed = [(i, k, toks[i][j])
                  for i in range(n) for k, j in enumerate(changing)
                  if j < len(toks[i])]
    x0 = M + (CW - sum(col_w)) / 2
    instruction(c, ct, cut_note(nrows, len(col_w)))
    grid_lines(c, x0, y_top, col_w, tab_h, nrows, dashed=True)
    for i, k, tok in placed:
        cell_text(c, cell(x0, y_top, col_w, tab_h, i, k), tok, size)
    footer(c, title, work_name)
    c.showPage()


def build_work3(slug, title, rows, out_dir):
    path = os.path.join(out_dir, '%s-work3-sentence-builder-guided.pdf' % slug)
    c = rl_canvas.Canvas(path, pagesize=A4)
    name = 'Sentence Builder — guided'
    # 2026-09-02 (approved by Tredoux) -- WORK 3 RULE: only the word that
    # CHANGES between rows is a cut-out piece (see changing_cols()). The
    # static words ("The", "Sat!") are printed in ink on the working sheet in
    # their own cells, the picture is printed as the cue, and the grey guide
    # word stays under each changing-word cell -- the word card, being exactly
    # slot-sized, covers that guide once placed correctly. The cut sheet
    # therefore carries the changing words only. Work 4 (free) is unchanged:
    # every word there is still a piece.
    changing = changing_cols(rows)
    sb_page(c, title, name,
            rows, 'Working sheet — do not cut. Lay each word card on its '
            'grey guide word; a correct card covers it exactly.',
            True, True, GUIDE, changing=changing)
    sb_changing_cutsheet(c, title, name + ' — cut sheet', rows, changing)
    c.save()
    return path


def build_work4(slug, title, rows, out_dir):
    path = os.path.join(out_dir, '%s-work4-sentence-builder-free.pdf' % slug)
    c = rl_canvas.Canvas(path, pagesize=A4)
    name = 'Sentence Builder — free'
    ncol = sb_page(c, title, name, rows, NO_CUT, False, False)
    sb_page(c, title, name + ' — control of error', rows, CONTROL, True, True)
    sb_page(c, title, name + ' — cut sheet', rows,
            cut_note(len(rows), ncol), True, True, cut=True)
    c.save()
    return path


# --------------------------------------------------------------- work 0 ---
# 2026-09-02 (approved by Tredoux) -- CHARACTERS STRIP, the preliminary work
# for the book. Physical picture: the book sits on a tray; to its left lies a
# narrow vertical strip of card printed with blank bordered boxes, one per
# character, top to bottom in first-appearance order. On the BACK of the same
# strip is the control -- the same boxes with the characters printed in them.
# The child reads a page with the teacher and drops that character (a
# 3D-printed figure, or a picture tab cut from page 3) into the next box.
#
# Geometry: the strip is CHAR_STRIP_W = 65 mm wide so it sits beside an A5
# book on a tray, and its boxes are sized so every character fits on ONE A4
# page -- box height is capped at CHAR_BOX_MAX_H and shrunk to fit otherwise.
# More than CHAR_MAX_ROWS characters and the strip runs in two 65 mm columns
# side by side (130 mm, still tray-width).
#
# Page 1 = strip FRONT (blank boxes, tiny title label, dashed cut outline).
# Page 2 = strip BACK, column order MIRRORED so a duplex print lands the
#          control boxes exactly behind their blanks (the strip block is
#          centred on the page, so the vertical axis needs no other shift).
# Page 3 = cut sheet of the character picture tabs, one per box, TAB_GAP
#          (2 mm) smaller on every side so a tab drops into its box.
CHAR_STRIP_W = 65 * mm
CHAR_BOX_MAX_H = 45 * mm
CHAR_MAX_ROWS = 6
CHAR_LABEL_BAND = 8 * mm
CHAR_CUT_PAD = 3 * mm


def characters_of(rows):
    """The book's cast: spread art deduped by path, in first-appearance
    order (the order the child meets them page by page)."""
    seen, out = set(), []
    for r in rows:
        if r['art'] in seen:
            continue
        seen.add(r['art'])
        out.append(r['art'])
    return out


def char_grid(n, y_top):
    """Strip geometry: (n_cols, n_rows, col_w, box_h, x0)."""
    ncols = 1 if n <= CHAR_MAX_ROWS else 2
    nrows = -(-n // ncols)
    usable = (y_top - CONTENT_BOTTOM) - CHAR_LABEL_BAND - CHAR_CUT_PAD
    box_h = min(CHAR_BOX_MAX_H, usable / nrows)
    col_w = [CHAR_STRIP_W] * ncols
    x0 = M + (CW - sum(col_w)) / 2
    return ncols, nrows, col_w, box_h, x0


def char_strip_page(c, title, work_name, arts, instr, filled, mirror=False):
    ct = header(c, title, work_name)
    instruction(c, ct, instr)
    y_top = grid_top_of(ct) - CHAR_LABEL_BAND
    ncols, nrows, col_w, box_h, x0 = char_grid(len(arts), grid_top_of(ct))
    # the strip's own printed label, inside the cut outline, so the cut strip
    # still says which book it belongs to
    lab = fit(title, 'Label', 7.5, sum(col_w) - 4 * mm, floor=5)
    c.setFont('Label', lab)
    c.setFillColorRGB(*GREY)
    c.drawCentredString(x0 + sum(col_w) / 2, y_top + 2.6 * mm, title.upper())
    # dashed cut outline around the whole strip (label band included)
    c.setStrokeColorRGB(*LINE)
    c.setLineWidth(0.6)
    c.setDash(3, 2.4)
    c.rect(x0 - CHAR_CUT_PAD, y_top - nrows * box_h - CHAR_CUT_PAD,
           sum(col_w) + 2 * CHAR_CUT_PAD,
           nrows * box_h + CHAR_LABEL_BAND + 2 * CHAR_CUT_PAD,
           stroke=1, fill=0)
    c.setDash()
    grid_lines(c, x0, y_top, col_w, box_h, nrows)
    for p, art in enumerate(arts):
        i, j = p % nrows, p // nrows          # fill each column top to bottom
        if mirror:
            j = ncols - 1 - j                 # duplex: mirror the columns
        if filled:
            cell_image(c, cell(x0, y_top, col_w, box_h, i, j), art,
                       inset=3 * mm)
    footer(c, title, work_name)
    c.showPage()
    return ncols, nrows, col_w, box_h


def char_cutsheet(c, title, work_name, arts, col_w, box_h):
    ct = header(c, title, work_name)
    y_top = grid_top_of(ct)
    ncols = max(1, min(len(arts), int(CW // col_w[0])))
    nrows = -(-len(arts) // ncols)
    tab_w, tab_h = tab_grid([col_w[0]] * ncols, box_h)
    x0 = M + (CW - sum(tab_w)) / 2
    instruction(c, ct, cut_note(nrows, ncols))
    grid_lines(c, x0, y_top, tab_w, tab_h, nrows, dashed=True)
    for p, art in enumerate(arts):
        cell_image(c, cell(x0, y_top, tab_w, tab_h, p // ncols, p % ncols),
                   art, inset=1.5 * mm)
    footer(c, title, work_name)
    c.showPage()


def build_work0(slug, title, rows, out_dir):
    path = os.path.join(out_dir, '%s-work0-characters.pdf' % slug)
    arts = characters_of(rows)
    c = rl_canvas.Canvas(path, pagesize=A4)
    name = 'Characters'
    _n, _r, col_w, box_h = char_strip_page(
        c, title, name, arts,
        'Strip — front. Cut on the dashed outline. Read a page together, '
        'then place that character in the next box, top to bottom.',
        filled=False)
    char_strip_page(
        c, title, name + ' — control of error', arts,
        'Strip — back. Print on the back of the front strip (duplex): the '
        'same boxes, filled in book order.',
        filled=True, mirror=True)
    char_cutsheet(c, title, name + ' — cut sheet', arts, col_w, box_h)
    c.save()
    return path


# --------------------------------------------------------------- driver ---
def build_slug(slug):
    result = load_book(slug)
    if result is None:
        print('[SKIP] %s -- no book found (checked easy-readers manifest '
              'and books_def.BOOKS)' % slug)
        return
    title, rows, flags, source = result
    if not rows:
        print('[SKIP] %s -- source=%s found but yielded 0 rows' % (slug, source))
        return
    out_dir = os.path.join(OUT_ROOT, slug)
    os.makedirs(out_dir, exist_ok=True)
    paths = [build_work0(slug, title, rows, out_dir),
             build_work1(slug, title, rows, out_dir),
             build_work2(slug, title, rows, out_dir),
             build_work3(slug, title, rows, out_dir),
             build_work4(slug, title, rows, out_dir)]
    print('[OK] %s (%s) -- title=%r rows=%d' % (slug, source, title, len(rows)))
    for r in rows:
        print('    - %s' % r['text'])
    for fl in flags:
        print('    FLAG: %s' % fl)
    for p in paths:
        print('    -> %s' % p)


def main():
    slugs = sys.argv[1:]
    if not slugs:
        raise SystemExit('usage: python3 build_book_works.py <slug> [<slug> ...]')
    for slug in slugs:
        build_slug(slug)


if __name__ == '__main__':
    main()
