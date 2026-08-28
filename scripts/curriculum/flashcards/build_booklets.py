# -*- coding: utf-8 -*-
# NOTE FOR FUTURE SESSIONS: fonts load from the canvas-design skill folder
# (/root/.claude/skills/canvas-design/canvas-fonts/) available in Cowork cloud sessions.
# Art inputs resolve from /mnt/user-data/uploads/... after device_stage_files; all
# Midjourney job UUIDs are in docs/curriculum/satpin-redesign/art-manifest.md.
"""Dark Phonics A5 saddle-stitch reader booklets — 'Inked Hush' print pass."""
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
import os

# Default is the Cowork cloud container's canvas-design skill folder. Set
# MONTREE_CANVAS_FONTS to a local copy of the same fonts to build elsewhere
# (e.g. on a Mac, where the skill folder lives under
# ~/Library/Application Support/Claude/.../skills/canvas-design/canvas-fonts/).
F = os.environ.get('MONTREE_CANVAS_FONTS',
                   '/root/.claude/skills/canvas-design/canvas-fonts/')
if not F.endswith('/'):
    F += '/'
pdfmetrics.registerFont(TTFont('Title',  F+'YoungSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Word',   F+'Outfit-Bold.ttf'))
pdfmetrics.registerFont(TTFont('WordRg', F+'Outfit-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Nar',    F+'Lora-Italic.ttf'))
pdfmetrics.registerFont(TTFont('NarB',   F+'Lora-BoldItalic.ttf'))
pdfmetrics.registerFont(TTFont('Label',  F+'WorkSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LabelB', F+'WorkSans-Bold.ttf'))

INK   = (0,0,0)
RED   = (0.776,0.157,0.157)   # #c62828
GREY  = (0,0,0)
FAINT = (0,0,0)
# Real greys. GREY/FAINT above are historically aliased to pure black by the
# 'Inked Hush' pass, so anything that genuinely needs to sit BACK from the
# black text (the cover bookplate, 2026-08-27) must use these, not those.
RULE_GREY = (0.35,0.35,0.35)   # bookplate outer frame
SOFT_GREY = (0.42,0.42,0.42)   # 'This book belongs to' label
HAIR_GREY = (0.72,0.72,0.72)   # bookplate inner hairline

PW, PH = 148.5*mm, 210*mm      # A5 portrait logical page
M = 14*mm

def fit(c, text, font, size, maxw, tracking=0.0):
    while size > 8:
        w = c.stringWidth(text, font, size) + tracking*size*(len(text)-1)
        if w <= maxw: break
        size -= 1
    return size

# ---- reveal-word sizing (locked 2026-08-26, Tredoux) -----------------------
# Before today every spread in books_def.py carried its own hand-picked
# `size=` (44 … 92), set ad hoc across many separate editing sessions, so
# the-pit's "pit!" printed at roughly HALF the size of the-dig's "dig!" even
# though both are 4-character shout words. Tredoux's call: size by word
# LENGTH inside one band, not per book.
#
# The rule: every narrative reveal word starts at REVEAL_MAX and is shrunk
# only as far as it must be to fit the text page's usable width (PW - 2*M),
# so every 3-5 letter word in every book lands on exactly the same size and
# only genuinely long words ("toothbrush!", "astronaut.") come down.
# REVEAL_FLOOR is the intended bottom of that band; fit() goes below it only
# when the glyphs physically will not fit the page at the floor (true for
# "toothbrush!" and "astronaut." — both need ~50-56 to clear the margins),
# because overflowing the trim is never the better failure.
#
# Sizes here are in books_def.py's own `size=` units; REVEAL_SCALE is the
# same 1.25 factor make_text_page() has always applied, so a word that used
# to be authored at size=92 renders at exactly the size it always did.
REVEAL_MAX   = 92     # top of the band — every short word gets this
REVEAL_FLOOR = 60     # intended bottom of the band (soft; see above)
REVEAL_SCALE = 1.25   # spec size -> rendered points

def reveal_size(c, lines):
    """Rendered point size for a narrative reveal word, fit to the page
    width from a single shared ceiling. See the REVEAL_* notes above."""
    base = int(REVEAL_MAX * REVEAL_SCALE)
    return min(fit(c, max(lines, key=len), 'Word', base, PW - 2*M), base)

# One-line print instruction stamped on sheet 1 of every booklet-print PDF
# (Tredoux 2026-08-26). Short-edge duplex + nesting is the only combination
# that produces a readable saddle-stitched booklet from this imposition.
PRINT_NOTE = 'Duplex · flip on SHORT edge · nest sheets, sheet 1 outside'

def draw_print_note(c):
    """Small, unobtrusive: 5.5pt light grey in the bottom-left corner of
    the first A4 sheet only — below the folio line (8mm) and well clear of
    page_back()'s own lowest content (M+11mm), and nowhere near the centre
    fold marks."""
    c.setFont('Label', 5.5); c.setFillColorRGB(0.58, 0.58, 0.58)
    c.drawString(6*mm, 4*mm, PRINT_NOTE)

def draw_tracked(c, x, y, text, font, size, tracking, color):
    c.setFont(font, size); c.setFillColorRGB(*color)
    if tracking == 0:
        c.drawCentredString(x, y, text); return
    total = c.stringWidth(text, font, size) + tracking*size*(len(text)-1)
    cx = x - total/2
    for ch in text:
        c.drawString(cx, y, ch)
        cx += c.stringWidth(ch, font, size) + tracking*size

# ---- logical page painters (draw at origin 0,0 of an A5 area) ----
def page_blank(c, book): pass

def page_cover(c, book):
    c.setFillColorRGB(*GREY); 
    draw_tracked(c, PW/2, PH-M-8, 'M O N T R E E   P H O N I C S', 'Label', 8.5, 0.28, GREY)
    draw_tracked(c, PW/2, PH-M-22, book['band'], 'Label', 7.5, 0.22, FAINT)
    # title
    lines = book['title_lines']
    size = min(fit(c, max(lines,key=len), 'Title', book.get('title_size',44), PW-2*M), book.get('title_size',44))
    y = PH-M-30-size*1.25
    for ln in lines:
        c.setFont('Title', size); c.setFillColorRGB(*INK)
        # red accent word on cover title
        acc = book.get('title_accent')
        if acc and acc in ln:
            pre, post = ln.split(acc,1)
            total = c.stringWidth(ln,'Title',size); x = PW/2-total/2
            c.drawString(x, y, pre); x += c.stringWidth(pre,'Title',size)
            c.setFillColorRGB(*RED); c.drawString(x, y, acc); x += c.stringWidth(acc,'Title',size)
            c.setFillColorRGB(*INK); c.drawString(x, y, post)
        else:
            c.drawCentredString(PW/2, y, ln)
        y -= size*1.18
    # cover art
    img = ImageReader(book['cover'])
    iw, ih = img.getSize(); ar = ih/iw
    w = PW-2*M-4*mm; h = w*ar
    maxh = y - (M+30*mm) + size*0.4
    if h > maxh: h = maxh; w = h/ar
    c.drawImage(img, (PW-w)/2, M+28*mm + (maxh-h)/2, w, h, mask='auto')
    c.setFillColorRGB(*RED); c.circle(PW/2, M+12.5*mm, 1.6*mm, stroke=0, fill=1)
    draw_bookplate(c)


# COVER STANDARD (2026-08-27, approved)
# Every book cover drawn by page_cover() ends with a "This book belongs to"
# ex-libris bookplate (draw_bookplate(), just below): 56x25mm, bottom-left
# corner sitting on the M margin, red ownership dot re-centred on the
# plate at M+12.5mm, art floor raised to M+28mm to clear it. This is the
# locked standard for every family that calls page_cover — sat-cast
# readers/booklet-prints (build_booklets.py), picture-word readers
# (build_a5_readers.py, via dpbuild.page_cover monkeypatch), and both
# tracing editions (build_tracing_booklet.py, build_a5_tracing.py). Do not
# add a competing "written by ___" line elsewhere on the cover (that's what
# collided in build_tracing_booklet.py before this date) and do not revert
# the geometry below without re-reading the full comment on draw_bookplate().
# Cover ownership plate — house standard from 2026-08-27 (Tredoux picked this
# over a tracked footer line and an under-title byline).  A classic ex-libris
# plate in the bottom-LEFT corner of every cover, 56 x 25mm.
#
# GEOMETRY IS INTERLOCKED — read before moving anything:
#   * The plate sits ON the 14mm margin (y 14->39mm).  It cannot go lower.
#   * The red dot is the plate's vertical MIDPOINT (M+12.5mm = 26.5mm) — half
#     a millimetre off its historical M+12mm, which is why it looks unmoved.
#   * The plate top at 39mm forced the ART FLOOR up from M+24mm to M+28mm
#     (and maxh's datum from M+26mm to M+30mm), a 4mm loss of art height on
#     every book whose art was clamped by maxh.  3mm of that is clearance
#     between the art box and the plate.
#   * The 56mm WIDTH is a ceiling: the dot sits at PW/2 = 74.25mm with
#     r = 1.6mm, so its left edge is at 72.65mm and M+56mm = 70mm leaves a
#     2.65mm gap.  Wider means moving the dot off centre.
def draw_bookplate(c):
    x0, y0 = M, M
    x1, y1 = M + 56*mm, M + 25*mm
    c.setStrokeColorRGB(*RULE_GREY); c.setLineWidth(0.6); c.setDash()
    c.roundRect(x0, y0, x1-x0, y1-y0, 1.5*mm, stroke=1, fill=0)
    c.setStrokeColorRGB(*HAIR_GREY); c.setLineWidth(0.35)
    c.roundRect(x0+1.5*mm, y0+1.5*mm, (x1-x0)-3*mm, (y1-y0)-3*mm, 1.0*mm,
                stroke=1, fill=0)
    # The plate is 25mm tall so a 4-year-old has ROOM TO WRITE.  Label tucked
    # just under the top edge, name rule dropped to 3mm above the inner
    # hairline: that leaves ~14mm of clear writing height between them, which
    # is the whole point of the height.  Do not re-centre these vertically.
    c.setFont('Nar', 8.5); c.setFillColorRGB(*SOFT_GREY)
    c.drawCentredString((x0+x1)/2, y1-6*mm, 'This book belongs to')
    c.setStrokeColorRGB(*INK); c.setLineWidth(0.6)
    c.line(x0+4.5*mm, y0+4.5*mm, x1-4.5*mm, y0+4.5*mm)

# HEART GLYPH (2026-08-27) — books_def.py writes its heart-word captions as
# '♥  heart word — a', but none of the four canvas-design faces carries
# U+2665, so Lora printed it as a .notdef box on the WORDS IN THIS BOOK page
# of all 20 books that have one. Rather than add a fifth font for one glyph,
# the heart is drawn as a path in the same red as the caption and sized off
# the caption's own point size, so it scales with the text and matches the
# cover's red dot in weight. draw_heart_line() strips any leading heart
# character from the caption, sets the rest in Lora italic, and keeps the
# heart + text group centred as one unit.
def draw_heart(c, cx, cy, s):
    """Filled heart, `s` points wide, centred on (cx, cy)."""
    p = c.beginPath()
    p.moveTo(cx, cy - s*0.42)
    p.curveTo(cx - s*0.30, cy - s*0.16, cx - s*0.50, cy + s*0.04,
              cx - s*0.50, cy + s*0.22)
    p.curveTo(cx - s*0.50, cy + s*0.42, cx - s*0.32, cy + s*0.50,
              cx - s*0.20, cy + s*0.50)
    p.curveTo(cx - s*0.09, cy + s*0.50, cx - s*0.02, cy + s*0.44, cx, cy + s*0.36)
    p.curveTo(cx + s*0.02, cy + s*0.44, cx + s*0.09, cy + s*0.50,
              cx + s*0.20, cy + s*0.50)
    p.curveTo(cx + s*0.32, cy + s*0.50, cx + s*0.50, cy + s*0.42,
              cx + s*0.50, cy + s*0.22)
    p.curveTo(cx + s*0.50, cy + s*0.04, cx + s*0.30, cy - s*0.16,
              cx, cy - s*0.42)
    p.close()
    c.drawPath(p, stroke=0, fill=1)

def draw_heart_line(c, y, caption, size=14, color=RED):
    """The '♥  heart word — a' caption, centred, with a drawn heart in place
    of the character the fonts do not have."""
    text = caption.lstrip('♥\u2764\ufe0f').lstrip()
    hs   = size * 0.62
    gap  = size * 0.38
    c.setFont('Nar', size); c.setFillColorRGB(*color)
    tw = c.stringWidth(text, 'Nar', size)
    x0 = PW/2 - (hs + gap + tw)/2
    if text != caption:
        draw_heart(c, x0 + hs/2, y + size*0.28, hs)
        x0 += hs + gap
    c.drawString(x0, y, text)

def page_words(c, book):
    y = PH - M - 30*mm
    draw_tracked(c, PW/2, y, 'W O R D S   I N   T H I S   B O O K', 'Label', 8, 0.3, GREY)
    y -= 16*mm
    if 'sound' in book:
        c.setFont('Word', 76); c.setFillColorRGB(*RED)
        c.drawCentredString(PW/2, y-10*mm, book['sound'])
        y -= 30*mm
        c.setFont('Label', 10.5); c.setFillColorRGB(*GREY)
        c.drawCentredString(PW/2, y, book['sound_note'])
        y -= 18*mm
        c.setFont('Nar', 17); c.setFillColorRGB(*INK)
        c.drawCentredString(PW/2, y, book['oral_words'])
        y -= 8*mm
        c.setFont('Label', 7.5); c.setFillColorRGB(*FAINT)
        c.drawCentredString(PW/2, y, 'picture words — shouted, not read')
        # Cumulative decodable list for sound-mode books that sit INSIDE the
        # decodable sequence (e.g. letter P: s a t p are all taught by now).
        # 'decodable' is a string or list of lines; 'heart' renders under it.
        # Requested by Tredoux 2026-07-28: every book ends with the words the
        # child can actually read at this point in the sequence.
        if book.get('decodable'):
            y -= 20*mm
            c.setFont('LabelB', 8); c.setFillColorRGB(*RED)
            c.drawCentredString(PW/2, y, 'YOU CAN NOW READ')
            dlines = book['decodable'] if isinstance(book['decodable'], list) else [book['decodable']]
            yy = y - 9*mm
            for ln in dlines:
                dsz = min(fit(c, ln, 'WordRg', 19, PW-2*M), 19)
                c.setFont('WordRg', dsz); c.setFillColorRGB(*INK)
                c.drawCentredString(PW/2, yy, ln)
                yy -= 7.5*mm
            if book.get('heart'):
                draw_heart_line(c, yy - 2*mm, book['heart'])
    else:
        if book.get('new'):
            c.setFont('LabelB', 8); c.setFillColorRGB(*RED)
            c.drawCentredString(PW/2, y, 'NEW')
            c.setFont('Word', 27); c.setFillColorRGB(*INK)
            nw = min(fit(c, book['new'], 'Word', 27, PW-2*M), 27)
            c.setFont('Word', nw)
            c.drawCentredString(PW/2, y-10*mm, book['new']); y -= 26*mm
        if book.get('review'):
            c.setFont('LabelB', 8); c.setFillColorRGB(*GREY)
            c.drawCentredString(PW/2, y, 'REVIEW')
            c.setFont('WordRg', 19); c.setFillColorRGB(*INK)
            lines = book['review'] if isinstance(book['review'],list) else [book['review']]
            yy = y-8*mm
            for ln in lines:
                c.drawCentredString(PW/2, yy, ln); yy -= 7.5*mm
            y = yy - 10*mm
        if book.get('heart'):
            draw_heart_line(c, y, book['heart'])
    if book.get('oral_note'):
        c.setFont('Label', 7.5); c.setFillColorRGB(*FAINT)
        c.drawCentredString(PW/2, M+16*mm, book['oral_note'])

def make_text_page(spec):
    def _p(c, book):
        y_word = PH*0.52
        has_text = spec.get('text') is not None
        if spec.get('nar'):
            nsize = 34 if has_text else 48
            nsize = min(fit(c, spec['nar'], 'Nar', nsize, PW-2*M), nsize)
            c.setFont('Nar', nsize); c.setFillColorRGB(*GREY)
            c.drawCentredString(PW/2, PH*0.68 if has_text else PH*0.55, spec['nar'])
        if not has_text: return
        style = spec.get('style','normal')
        lines = spec['text'] if isinstance(spec['text'],list) else [spec['text']]
        if style=='whisper':
            size = min(fit(c, max(lines,key=len), 'WordRg', 40, PW-2*M, tracking=0.14), 40)
            yy = y_word + (len(lines)-1)*size*0.75
            for ln in lines:
                draw_tracked(c, PW/2, yy, ln, 'WordRg', size, 0.14, GREY)
                yy -= size*1.5
            return
        if style=='drop':
            # Recap / celebration pages keep their own authored treatment —
            # they are multi-line chants, not a single reveal word, and their
            # per-spread size= is deliberate. Untouched by the 2026-08-26
            # uniform-reveal rule.
            base = int(spec.get('size', 54 if max(len(l) for l in lines)>10 else 72) * 1.25)
            size = min(fit(c, max(lines,key=len), 'Word', base, PW-2*M), base)
        else:
            # Narrative reveal page: one shared band for every book, sized by
            # word length alone. spec['size'] is deliberately ignored here.
            size = reveal_size(c, lines)
        yy = y_word + (len(lines)-1)*size*0.62
        for ln in lines:
            c.setFont('Word', size)
            acc = spec.get('accent')
            if style=='drop':
                c.setFillColorRGB(*RED); c.drawCentredString(PW/2, yy, ln)
            elif acc and acc in ln:
                pre, post = ln.split(acc,1)
                x = PW/2 - c.stringWidth(ln,'Word',size)/2
                first_red = bool(spec.get('accent_first'))
                for seg, red in ((pre, first_red),(acc, not first_red),(post, first_red)):
                    if not seg: continue
                    c.setFillColorRGB(*(RED if red else INK))
                    c.drawString(x, yy, seg)
                    x += c.stringWidth(seg,'Word',size)
            else:
                c.setFillColorRGB(*INK); c.drawCentredString(PW/2, yy, ln)
            yy -= size*1.24
    return _p

def make_art_page(path):
    img = ImageReader(path)
    def _p(c, book):
        iw, ih = img.getSize(); ar = ih/iw
        w = PW - 2*(8*mm); h = w*ar
        maxh = PH - 2*(14*mm)
        if h > maxh: h = maxh; w = h/ar
        c.drawImage(img, (PW-w)/2, (PH-h)/2 + 4*mm, w, h, mask='auto')
    return _p

def page_halftitle(c, book):
    title = ' '.join(book['title_lines']).replace('  ',' ')
    c.setFont('Title', 17); c.setFillColorRGB(*INK)
    c.drawCentredString(PW/2, PH*0.62, title)
    c.setFillColorRGB(*RED); c.circle(PW/2, PH*0.62-9*mm, 1.1*mm, stroke=0, fill=1)

def page_back(c, book):
    draw_tracked(c, PW/2, PH*0.60, 'M O N T R E E   P H O N I C S', 'Label', 9, 0.3, GREY)
    c.setFont('Nar', 11); c.setFillColorRGB(*INK)
    c.drawCentredString(PW/2, PH*0.60-9*mm, 'decodable readers')
    c.setFont('Label', 8); c.setFillColorRGB(*FAINT)
    c.drawCentredString(PW/2, PH*0.60-17*mm, book['booknum'])
    c.setFont('Nar', 9.5); c.setFillColorRGB(*GREY)
    c.drawCentredString(PW/2, M+18*mm, 'Teacher Potato hides at the end of every book.')
    c.setFont('Label', 7.5); c.setFillColorRGB(*FAINT)
    c.drawCentredString(PW/2, M+11*mm, 'teacherpotato.xyz')

def folio(c, n, left):
    c.setFont('Label', 6.5); c.setFillColorRGB(*FAINT)
    x = M if left else PW-M
    (c.drawString if left else c.drawRightString)(x, 8*mm, str(n))

def is_wordless_spread(sp):
    """A deliberately silent spread — no `nar`, no `text`: the "wordless
    potato cameo" the art manifest specifies for an-apple-for-ant p8,
    sit-sit-sit p9, snake-in-my-sock p8 and spat p9. It used to emit an empty
    text page that still drew a folio number, so the cameo faced a numbered
    blank; it now renders as ONE genuine full-page picture, which is what the
    art direction always intended ("the climax noun is never printed; the
    child fills it from the picture")."""
    return sp.get('text') is None and not sp.get('nar')

def last_worded_index(book):
    """Index of the last spread that actually gets a text page — i.e. the last
    one that is not a wordless cameo. This is where a tracing booklet's
    'I can write <word>!' celebration belongs, since the cameo no longer has a
    page of its own to carry it."""
    idx = [i for i, sp in enumerate(book['spreads']) if not is_wordless_spread(sp)]
    return idx[-1] if idx else -1

def story_pages(book, text_page=None):
    """The story body: one text page + one art page per spread, except a
    wordless cameo spread (see is_wordless_spread()), which contributes only
    its full-page picture.

    `text_page(sp, i)` builds the left-hand page for spread `i`. It defaults to
    the reader's own make_text_page(); build_tracing_booklet.py passes its
    trace-page factory instead. THIS IS THE SINGLE SOURCE OF TRUTH for booklet
    structure — the reader and both tracing variants must produce the same page
    count, the same page identities and the same facing pairs for a given book,
    differing only in how that left-hand page is painted. Do not re-implement
    this loop anywhere; pass a factory."""
    if text_page is None:
        text_page = lambda sp, i: make_text_page(sp)
    body = []
    for i, sp in enumerate(book['spreads']):
        if is_wordless_spread(sp):
            body.append((make_art_page(sp['art']), True))
            continue
        body.append((text_page(sp, i), True))
        body.append((make_art_page(sp['art']), True))
    return body

# ---- FILLER STANDARD (2026-08-27) ------------------------------------------
# Saddle stitch pads every booklet to a multiple of 4, and paginate() (below)
# puts that padding in exactly two places: ONE fixed page straight after the
# cover — the inside front cover, which stays conventionally blank — and 0-3
# pages between WORDS IN THIS BOOK and the back cover. Those tail pages used
# to print as true blanks, so 20 of the 22 books in books_def.py threw away
# 1-3 A5 pages each. Tredoux's call (2026-08-27): fill them with DESIGNED
# WORK, so a book that happens to pad gives the child MORE to do, not less.
#
# FILLER_LADDER is an ordered list of painter FACTORIES. paginate() asks each
# factory in turn for a painter and takes the first `tail_blanks` painters it
# gets back, so a book with 1 spare page gets MY WORDS, one with 2 gets
# MY WORDS + MY PICTURE, one with 3 (the-sat, the-pat, the-nap, …) gets all
# three. To add a fourth filler, write a factory and append it here — nothing
# else changes.
#
# Every factory is DATA-DRIVEN from the book dict and returns None when that
# book has nothing for it (a sound-only book like snake-in-my-sock has no
# writable word list, so it skips MY WORDS and MY PICTURE comes first). If
# the ladder runs dry the remaining slots fall back to page_blank — i.e.
# exactly the old behaviour. NOTHING HERE CHANGES PAGE COUNT OR IMPOSITION:
# the slots already existed, they were just empty.
#
# House language, shared with draw_bookplate(): 1.5mm-rounded rects, 0.6pt
# RULE_GREY frames over 0.35pt HAIR_GREY hairlines, Work Sans tracked
# small-caps headers, Lora italic for the one instruction line, red used only
# as the closing dot. Content is capped, never overflowed — long word lists
# go to two columns, long sentence lists tighten their leading and are
# truncated at FILLER_MAX_SENTENCES.
FILLER_MAX_WORDS     = 12   # 2 columns x 6 rows; beyond this a page is a wall
FILLER_MAX_SENTENCES = 10
# The model word a child copies on the MY WORDS page is set in the same face
# the book's own word lists use (Outfit Regular, page_words' 'WordRg'), NOT
# the Lora italic of the narration: a 4-year-old copies the letterforms in
# front of them, and single-storey printed letters are the ones they are being
# taught to write. Lora italic still carries the instruction line above it.
FILLER_MODEL_FONT = 'WordRg'

def filler_head(c, label, note=None, note_size=9.5, note_color=SOFT_GREY):
    """Shared filler-page masthead: tracked Work Sans small-caps on the same
    baseline page_words() uses, with one Lora-italic instruction under it.
    Returns the y of the lowest thing drawn, so callers can hang off it."""
    y = PH - M - 30*mm
    draw_tracked(c, PW/2, y, label, 'Label', 8, 0.3, GREY)
    if note:
        y -= 9.5*mm
        c.setFont('Nar', note_size); c.setFillColorRGB(*note_color)
        c.drawCentredString(PW/2, y, note)
    return y

def filler_dot(c):
    """The red ownership/closing dot, same motif as the cover and half-title,
    at a fixed height on every filler page so the three read as a set."""
    c.setFillColorRGB(*RED); c.circle(PW/2, M+9*mm, 1.1*mm, stroke=0, fill=1)

def filler_word_list(book):
    """The book's own writable words, in teaching order: today's NEW words
    first, then a sound book's cumulative 'decodable' list, then REVIEW.
    'oral_words' is deliberately excluded — those are picture words the child
    SHOUTS and cannot yet write ('astronaut'), and 'heart' is a caption, not
    a word list. Splits books_def's ' · '-joined strings and list-of-lines
    alike, de-dupes case-insensitively, caps at FILLER_MAX_WORDS."""
    out = []
    seen = set()
    def add(v):
        if not v: return
        for ln in (v if isinstance(v, list) else [v]):
            for tok in ln.replace('·', ' ').replace('—', ' ').split():
                w = tok.strip('!?,.;:"“”()')
                if w and w.lower() not in seen:
                    seen.add(w.lower()); out.append(w)
    add(book.get('new')); add(book.get('decodable')); add(book.get('review'))
    return out[:FILLER_MAX_WORDS]

def filler_prompt(book):
    """Drawing prompt for the MY PICTURE page, derived from the book's own
    title so every book gets a sentence about ITS story. Books whose title
    carries the blank the child fills from the picture ('The ___ Sat!') read
    best re-cast as a question about that blank; the rest fall back to their
    own title, then to a generic prompt. A book may override with
    'draw_prompt' in books_def.py."""
    if book.get('draw_prompt'):
        return book['draw_prompt']
    title = ' '.join(book.get('title_lines') or []).replace('  ', ' ').strip()
    if title.startswith('The ___'):
        rest = title[len('The ___'):].strip()
        if rest:
            return 'Draw the ___ that ' + rest.lower()
    if '___' in title:
        return 'Draw ' + title.lower()
    return 'Draw your favourite part of the story.'

def filler_sentences(book):
    """Every line the child actually READS in this book, verbatim, as
    (narration, reveal-word) pairs so the checklist can set each half in the
    face the book set it in. Wordless cameo spreads contribute nothing."""
    out = []
    for sp in book.get('spreads', []):
        if is_wordless_spread(sp): continue
        txt = sp.get('text')
        t = ' '.join(txt) if isinstance(txt, list) else (txt or '')
        out.append(((sp.get('nar') or '').strip(), t.strip()))
    return out[:FILLER_MAX_SENTENCES]

def make_filler_words(book):
    """LADDER 1 — MY WORDS: a handwriting work. Each of the book's own words
    is set once in grey as a model, sitting on the same baseline as the blank
    rule the child writes on, with a dashed x-height guide above it. One
    column up to 7 words, two columns beyond that (column-major, so reading
    down the left column keeps the teaching order)."""
    words = filler_word_list(book)
    if not words: return None
    def _p(c, book_):
        y = filler_head(c, 'M Y   W O R D S', 'Say the word. Then write it on the line.')
        top, bottom = y - 14*mm, M + 20*mm
        band = top - bottom
        two  = len(words) > 7
        cols = 2 if two else 1
        colw = (PW - 2*M) / cols
        # The model is as large as its column can carry — a child copies what
        # they can see. It shrinks only for genuinely long words
        # ('toothbrush'), never past the point of being a legible model.
        size = 18 if two else 26
        while size > 11 and max(c.stringWidth(w, FILLER_MODEL_FONT, size)
                                for w in words) > colw * 0.46:
            size -= 1
        # One gutter for the whole page, so every writing rule starts on the
        # same x — the models are ragged, the rules are not.
        gutter = max(c.stringWidth(w, FILLER_MODEL_FONT, size) for w in words) + 6*mm
        per_col = (len(words) + cols - 1) // cols
        # A short word list would otherwise be three lines adrift in white, so
        # each word earns a second and third blank rule until the page reads as
        # a full handwriting work. 18mm is the comfortable rule pitch that sets
        # how many rows the band can hold.
        cap  = int(band / (18*mm)) + 1
        reps = 1 if two else max(1, min(3, cap // max(per_col, 1)))
        rows = per_col * reps
        # When a word carries more than one rule, the gap BETWEEN words opens
        # by GAP so the page reads as groups-of-a-word rather than as anonymous
        # ruled paper. pitch then absorbs whatever is left of the band.
        gap   = 8*mm if reps > 1 else 0
        pitch = max(13*mm, min(26*mm,
                (band - (per_col-1)*gap) / max(rows - 1, 1)))
        for col in range(cols):
            yy = top
            x0 = M + col*colw
            x_rule = x0 + gutter
            x_end  = x0 + colw - (5*mm if two and col == 0 else 0)
            for wi, w in enumerate(words[col*per_col:(col+1)*per_col]):
                if wi: yy -= gap
                for k in range(reps):
                    if wi or k: yy -= pitch
                    if k == 0:
                        c.setFont(FILLER_MODEL_FONT, size)
                        c.setFillColorRGB(*SOFT_GREY)
                        c.drawString(x0, yy, w)
                    # dashed x-height guide over the solid writing baseline —
                    # the pair a child is taught to write between
                    c.setStrokeColorRGB(*HAIR_GREY); c.setLineWidth(0.35)
                    c.setDash(0.7, 2.2)
                    c.line(x_rule, yy + size*0.52, x_end, yy + size*0.52)
                    c.setDash()
                    c.setStrokeColorRGB(*RULE_GREY); c.setLineWidth(0.6)
                    c.line(x_rule, yy, x_end, yy)
        filler_dot(c)
    return _p

def make_filler_picture(book):
    """LADDER 2 — MY PICTURE: the book's own prompt over one big empty frame,
    drawn in the bookplate's exact language (0.6pt RULE_GREY at 1.5mm radius
    over a 0.35pt HAIR_GREY inset hairline) so the child recognises it as the
    same family of ruled box they wrote their name in on the cover."""
    prompt = filler_prompt(book)
    if not prompt: return None
    def _p(c, book_):
        y = filler_head(c, 'M Y   P I C T U R E', prompt, note_size=11.5, note_color=INK)
        top, bottom = y - 9*mm, M + 15*mm
        c.setStrokeColorRGB(*RULE_GREY); c.setLineWidth(0.6); c.setDash()
        c.roundRect(M, bottom, PW-2*M, top-bottom, 1.5*mm, stroke=1, fill=0)
        c.setStrokeColorRGB(*HAIR_GREY); c.setLineWidth(0.35)
        c.roundRect(M+1.5*mm, bottom+1.5*mm, PW-2*M-3*mm, top-bottom-3*mm, 1.0*mm,
                    stroke=1, fill=0)
        filler_dot(c)
    return _p

def make_filler_read(book):
    """LADDER 3 — I CAN READ: the book's sentences as a tick list, each in the
    faces the book itself used (Lora italic narration + Outfit Bold reveal
    word), behind a thin-ruled check box. One size serves every line — the
    longest sentence sets it — and both the size and the leading give way as
    the list grows, so a 6-line book breathes and a 10-line one still fits.
    A sentence too long for the measure (the-tall's five-noun recap chant)
    wraps onto an indented continuation line rather than running off the
    page: nothing is ever truncated or overset."""
    sents = filler_sentences(book)
    if not sents: return None

    def wrap(c, n, t, size, maxw):
        """Greedy word wrap across the two faces — returns a list of display
        lines, each a list of (word, font) — so the narration and the reveal
        word keep their own faces even when a sentence breaks."""
        segs = ([(w, 'Nar') for w in n.split()] +
                [(w, 'Word') for w in t.split()])
        space = c.stringWidth(' ', 'Nar', size)
        lines, cur, curw = [], [], 0.0
        for w, f in segs:
            ww = c.stringWidth(w, f, size)
            adv = ww + (space if cur else 0)
            if cur and curw + adv > maxw:
                lines.append(cur); cur, curw = [(w, f)], ww
            else:
                cur.append((w, f)); curw += adv
        if cur: lines.append(cur)
        return lines or [[]]

    def _p(c, book_):
        y = filler_head(c, 'I   C A N   R E A D',
                        'Tick each line you can read on your own.')
        top, bottom = y - 13*mm, M + 22*mm
        band  = top - bottom
        box   = 4.2*mm
        maxw  = (PW - 2*M) - box - 5*mm
        # Largest size at which the wrapped list still clears the band at the
        # tightest tolerable item pitch. Never below 9pt — an unreadable
        # checklist is worse than a shorter one, and FILLER_MAX_SENTENCES
        # already caps the count.
        size = 15.0
        while size > 9.0:
            items = [wrap(c, n, t, size, maxw) for n, t in sents]
            extra = sum(len(it) - 1 for it in items) * size * 1.25
            if extra + (len(items)-1) * 10*mm <= band: break
            size -= 0.5
        items = [wrap(c, n, t, size, maxw) for n, t in sents]
        lead  = size * 1.25
        extra = sum(len(it) - 1 for it in items) * lead
        pitch = max(10*mm, min(18*mm,
                (band - extra) / max(len(items) - 1, 1)))
        # Boxes stay in one column, text is ragged right — but the block as a
        # whole is centred on its widest line, so a book of short sentences
        # does not sit stranded against the left margin.
        widest = 0.0
        for it in items:
            for ln in it:
                w = sum(c.stringWidth(w_, f, size) for w_, f in ln) \
                    + c.stringWidth(' ', 'Nar', size) * max(len(ln)-1, 0)
                widest = max(widest, w)
        x_box = max(M, (PW - (box + 5*mm + widest)) / 2)
        x_txt = x_box + box + 5*mm
        yy = top - (band - (extra + pitch*(len(items)-1))) / 2
        for it in items:
            c.setStrokeColorRGB(*RULE_GREY); c.setLineWidth(0.6); c.setDash()
            c.roundRect(x_box, yy + 0.34*size - box/2, box, box, 0.8*mm,
                        stroke=1, fill=0)
            for li, ln in enumerate(it):
                x = x_txt
                c.setFillColorRGB(*INK)
                for w_, f in ln:
                    c.setFont(f, size); c.drawString(x, yy, w_)
                    x += c.stringWidth(w_, f, size) + c.stringWidth(' ', 'Nar', size)
                if li < len(it) - 1: yy -= lead
            yy -= pitch
        filler_dot(c)
    return _p

# Ordered ladder — see FILLER STANDARD above. Append to extend.
FILLER_LADDER = [make_filler_words, make_filler_picture, make_filler_read]

def filler_pages(book, k):
    """The k painters that fill a book's tail padding, in ladder order.
    Falls back to true blanks for any slot the ladder cannot fill, so this can
    never change how many pages a book has."""
    if k <= 0: return []
    made = []
    for factory in FILLER_LADDER:
        if len(made) >= k: break
        p = factory(book)
        if p is not None: made.append(p)
    return made[:k] + [page_blank] * max(0, k - len(made))

def paginate(body, cover=None, halftitle=None, words=None, back=None, book=None):
    """Assemble the final page list.

    Order locked 2026-08-26 (Tredoux), matching dpbuild.py:
        cover · [blank] · half-title · story · WORDS IN THIS BOOK · [blanks] · back cover
    The word list moved from page 2 to the back of every book.

    Two invariants the naive list gets wrong, both handled here:

    1. FACING PAIRS. Folded, the booklet faces pages (2,3), (4,5), (6,7)… so
       a spread's text page must land on an EVEN page for its own art page to
       sit opposite it. That forces the front matter to an ODD length — i.e.
       exactly one blank between the cover and the half-title. Without it
       every picture faces the NEXT spread's word, which is fatal for a
       phonics reader. (The old layout got this for free because the word
       list was page 2; moving it to the back costs one page back.)

    2. NO BLANKS STRANDED AFTER THE GAG (dpbuild.py's rule, ported). Padding
       to a multiple of 4 never sits between the last story page and the back
       cover — it goes inside-front (before the half-title) and inside-back
       (after the word list).

    Pass `book` to fill those inside-back pages with designed work instead of
    leaving them blank — see FILLER STANDARD (2026-08-27) above. It is opt-in
    per builder (build() below passes it; dpbuild.py and
    build_tracing_booklet.py do not, and keep true blanks) and it cannot
    change the page count either way: the number of tail slots is computed
    first, from `body` alone, exactly as before."""
    front = 1                                    # odd; see invariant 1
    n = 1 + front + 1 + len(body) + 2            # cover, blanks, half-title, body, words, back
    tail_blanks = (-n) % 4
    tail = (filler_pages(book, tail_blanks) if book is not None
            else [page_blank] * tail_blanks)
    return ([cover] + [(page_blank, False)]*front + [halftitle]
            + body
            + [words] + [(p, False) for p in tail] + [back])

def build(book, outdir='print'):
    os.makedirs(outdir, exist_ok=True)
    pages = paginate(story_pages(book),
                     cover=(page_cover, False), halftitle=(page_halftitle, False),
                     words=(page_words, False), back=(page_back, False),
                     book=book)   # designed tail fillers; see FILLER STANDARD
    N = len(pages)

    # reading-order proof
    c = rl_canvas.Canvas(f"{outdir}/{book['slug']}-A5-reading.pdf", pagesize=(PW,PH))
    for i,(painter,is_story) in enumerate(pages):
        painter(c, book)
        if is_story: folio(c, i+1, left=(i+1)%2==0)
        c.showPage()
    c.save()

    # saddle imposition on A4 landscape
    sheetW, sheetH = landscape(A4)
    c = rl_canvas.Canvas(f"{outdir}/{book['slug']}-A5-booklet-print.pdf", pagesize=(sheetW,sheetH))
    order=[]
    for k in range(N//2):
        order.append((N-k, k+1) if k%2==0 else (k+1, N-k))
    for si,(li,ri) in enumerate(order):
        for idx,xoff in ((li, 0),(ri, sheetW/2)):
            painter,is_story = pages[idx-1]
            c.saveState(); c.translate(xoff + (sheetW/2-PW)/2, (sheetH-PH)/2)
            c.setFillColorRGB(1,1,1)
            painter(c, book)
            if is_story: folio(c, idx, left=(idx%2==0))
            c.restoreState()
        c.setStrokeColorRGB(0,0,0); c.setLineWidth(0.3)
        c.line(sheetW/2, sheetH-4*mm, sheetW/2, sheetH-9*mm)
        c.line(sheetW/2, 4*mm, sheetW/2, 9*mm)
        if si == 0: draw_print_note(c)
        c.showPage()
    c.save()
    print(book['slug'], N, 'pages,', N//4, 'sheets')
