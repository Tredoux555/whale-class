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
    maxh = y - (M+26*mm) + size*0.4
    if h > maxh: h = maxh; w = h/ar
    c.drawImage(img, (PW-w)/2, M+24*mm + (maxh-h)/2, w, h, mask='auto')
    c.setFillColorRGB(*RED); c.circle(PW/2, M+12*mm, 1.6*mm, stroke=0, fill=1)

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
                c.setFont('Nar', 14); c.setFillColorRGB(*RED)
                c.drawCentredString(PW/2, yy - 2*mm, book['heart'])
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
            c.setFillColorRGB(*RED)
            c.setFont('Nar', 14)
            c.drawCentredString(PW/2, y, book['heart'])
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

def story_pages(book):
    """The story body: one text page + one art page per spread, EXCEPT a
    deliberately wordless spread (no `nar`, no `text` — the "wordless potato
    cameo" the art manifest calls for on an-apple-for-ant p8, sit-sit-sit p9,
    snake-in-my-sock p8, spat p9). Those used to emit an empty text page that
    still drew a folio number, so the cameo faced a numbered blank; they now
    render as ONE genuine full-page picture, which is what the art direction
    always intended ("the climax noun is never printed; the child fills it
    from the picture")."""
    body = []
    for sp in book['spreads']:
        if sp.get('text') is None and not sp.get('nar'):
            body.append((make_art_page(sp['art']), True))
            continue
        body.append((make_text_page(sp), True))
        body.append((make_art_page(sp['art']), True))
    return body

def paginate(body, cover=None, halftitle=None, words=None, back=None):
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
       (after the word list)."""
    front = 1                                    # odd; see invariant 1
    n = 1 + front + 1 + len(body) + 2            # cover, blanks, half-title, body, words, back
    tail_blanks = (-n) % 4
    return ([cover] + [(page_blank, False)]*front + [halftitle]
            + body
            + [words] + [(page_blank, False)]*tail_blanks + [back])

def build(book, outdir='print'):
    os.makedirs(outdir, exist_ok=True)
    pages = paginate(story_pages(book),
                     cover=(page_cover, False), halftitle=(page_halftitle, False),
                     words=(page_words, False), back=(page_back, False))
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
