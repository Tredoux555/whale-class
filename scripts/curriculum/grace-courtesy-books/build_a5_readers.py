# -*- coding: utf-8 -*-
"""Grace & Courtesy storybooks -> Montree A5 reader print format.

Same house pipeline as Dark Phonics
(scripts/curriculum/dark-phonics-storybooks/build_a5_readers.py): the
painters and the saddle-stitch imposition come straight from
scripts/curriculum/flashcards/build_booklets.py. Nothing is forked --
only the cover/back-cover text and a "why" tail page (replacing Dark
Phonics' "words in this book" page, since these books teach a rule, not
a sound) are composed on top.

One book, one manifest entry, "one book at a time" per the standing
instruction -- BOOKS below grows by one dict per new book, same shape as
COVERS/SPLITS in the Dark Phonics script, until there are enough books to
warrant a manifest.json of their own.

    <slug>-A5-reading.pdf         A5 portrait, reading order
    <slug>-A5-booklet-print.pdf   A4 landscape, 2-up saddle imposition

Env overrides (all optional):
  MONTREE_CANVAS_FONTS  font dir (default: repo copy in flashcards/canvas-fonts)
  MONTREE_BOOKS_ROOT    art root  (default: <repo>/phonics-images/grace-courtesy-books)
  MONTREE_BOOK_OUT      output    (default: <repo>/public/grace-courtesy-books/print)
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
FLASHCARDS = os.path.join(REPO, 'scripts', 'curriculum', 'flashcards')

FONT_CANDIDATES = [
    os.environ.get('MONTREE_CANVAS_FONTS'),
    os.path.join(FLASHCARDS, 'canvas-fonts'),
    '/root/.claude/skills/canvas-design/canvas-fonts',
    os.path.expanduser('~/.claude/skills/canvas-design/canvas-fonts'),
]
for cand in FONT_CANDIDATES:
    if cand and os.path.exists(os.path.join(cand, 'YoungSerif-Regular.ttf')):
        os.environ['MONTREE_CANVAS_FONTS'] = cand
        break
else:  # pragma: no cover
    raise SystemExit('No canvas fonts found; tried:\n  ' +
                     '\n  '.join(c for c in FONT_CANDIDATES if c))

sys.path.insert(0, FLASHCARDS)
import build_booklets as bb  # noqa: E402
from build_booklets import (  # noqa: E402
    draw_tracked, fit, make_text_page, make_art_page, page_blank, folio,
    PW, PH, M, INK, RED, GREY, FAINT, mm)
from reportlab.lib.pagesizes import A4, landscape  # noqa: E402
from reportlab.pdfgen import canvas as rl_canvas  # noqa: E402

ART_ROOT = os.environ.get('MONTREE_BOOKS_ROOT',
                          os.path.join(REPO, 'phonics-images', 'grace-courtesy-books'))
OUT = os.environ.get('MONTREE_BOOK_OUT',
                     os.path.join(REPO, 'public', 'grace-courtesy-books', 'print'))

NUMWORDS = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN']

FOREST = (0.24, 0.42, 0.23)   # house "forest" palette slot -- the rule accent
MOSS = (122/255, 168/255, 88/255)   # site's "moss" palette slot -- Book 2's accent
# Book 3's accent: a warm honey/amber earth tone (176,124,54), nudged toward
# page.tsx's PALETTE[2] "pine" (84,150,134) -- the color the web card actually
# gets (RAW's 3rd entry, i=2 % 4) -- so print band + web card eyeball-match.
HONEY = (144/255, 133/255, 82/255)
# Book 4's accent, nudged toward page.tsx PALETTE[3] "olive" (166,158,80) --
# i=3 (4th book, zero-based index in RAW) % 4 == 3.
OLIVE = (150/255, 140/255, 62/255)
# Book 5's accent: cycles back to page.tsx PALETTE[0] "forest" (62,142,101)
# -- i=4 (5th book, zero-based index in RAW) % 4 == 0. Reuse FOREST rather
# than introducing a near-duplicate hue.

# --- composed pages (cloned from build_booklets, only the label text and
#     the tail page differ -- painters/layout untouched) -----------------
def page_cover(c, book):
    draw_tracked(c, PW/2, PH-M-8, 'M O N T R E E', 'Label', 8.5, 0.28, GREY)
    draw_tracked(c, PW/2, PH-M-22, book['band_text'], 'Label', 7.5, 0.22, book['band_color'])
    lines = book['title_lines']
    size = min(fit(c, max(lines, key=len), 'Title', book.get('title_size', 44), PW-2*M),
               book.get('title_size', 44))
    y = PH-M-30-size*1.25
    for ln in lines:
        c.setFont('Title', size); c.setFillColorRGB(*INK)
        acc = book.get('title_accent')
        if acc and acc in ln:
            pre, post = ln.split(acc, 1)
            total = c.stringWidth(ln, 'Title', size); x = PW/2-total/2
            c.drawString(x, y, pre); x += c.stringWidth(pre, 'Title', size)
            c.setFillColorRGB(*RED); c.drawString(x, y, acc); x += c.stringWidth(acc, 'Title', size)
            c.setFillColorRGB(*INK); c.drawString(x, y, post)
        else:
            c.drawCentredString(PW/2, y, ln)
        y -= size*1.18
    img = bb.ImageReader(book['cover'])
    iw, ih = img.getSize(); ar = ih/iw
    w = PW-2*M-4*mm; h = w*ar
    maxh = y - (M+26*mm) + size*0.4
    if h > maxh: h = maxh; w = h/ar
    c.drawImage(img, (PW-w)/2, M+24*mm + (maxh-h)/2, w, h, mask='auto')
    c.setFillColorRGB(*RED); c.circle(PW/2, M+12*mm, 1.6*mm, stroke=0, fill=1)


def page_why(c, book):
    """Tail page replacing Dark Phonics' 'words in this book' page: the
    payoff of the whole series -- the child says WHY the rule exists."""
    y = PH - M - 30*mm
    draw_tracked(c, PW/2, y, 'W H Y   W E   D O   T H I S', 'Label', 8, 0.3, GREY)
    y -= 20*mm
    lines = book['why'] if isinstance(book['why'], list) else [book['why']]
    size = min(fit(c, max(lines, key=len), 'Word', 38, PW-2*M), 38)
    yy = y + (len(lines)-1)*size*0.62
    for ln in lines:
        c.setFont('Word', size); c.setFillColorRGB(*INK)
        c.drawCentredString(PW/2, yy, ln)
        yy -= size*1.24
    c.setFont('Label', 7.5); c.setFillColorRGB(*FAINT)
    c.drawCentredString(PW/2, M+16*mm, 'a Grace & Courtesy book · ' + book['booknum'])


def make_combined_page(art_path, lines, text_size=34):
    """One page = art (top) + caption (bottom), instead of the Dark
    Phonics house pattern's separate text-page/art-page spread. Built for
    the V2 combined books: at 6 illustrated beats x N chapters the
    separate-page format ran to 50+ story pages for one book (too long
    for a 3-6yo's attention span -- Tredoux, 2026-08-21). Two combined
    pages per chapter (Oops / Fix) keeps a 4-chapter book to a 12-page
    saddle-stitch booklet."""
    img = bb.ImageReader(art_path)
    def _p(c, book):
        iw, ih = img.getSize(); ar = ih/iw
        w = PW - 2*(10*mm); h = w*ar
        maxh = PH*0.60
        if h > maxh: h = maxh; w = h/ar
        art_top = PH - M - 4*mm
        c.drawImage(img, (PW-w)/2, art_top-h, w, h, mask='auto')
        size = min(fit(c, max(lines, key=len), 'Word', text_size, PW-2*M), text_size)
        yy = art_top - h - 12*mm
        for ln in lines:
            c.setFont('Word', size); c.setFillColorRGB(*INK)
            c.drawCentredString(PW/2, yy, ln)
            yy -= size*1.22
    return _p


def page_back(c, book):
    draw_tracked(c, PW/2, PH*0.60, 'G R A C E   &   C O U R T E S Y', 'Label', 9, 0.3, GREY)
    c.setFont('Nar', 11); c.setFillColorRGB(*INK)
    c.drawCentredString(PW/2, PH*0.60-9*mm, 'classroom rule books')
    c.setFont('Label', 8); c.setFillColorRGB(*FAINT)
    c.drawCentredString(PW/2, PH*0.60-17*mm, book['booknum'])
    c.setFont('Nar', 9.5); c.setFillColorRGB(*GREY)
    c.drawCentredString(PW/2, M+18*mm, book.get('tagline', 'One rule. One reason why.'))
    c.setFont('Label', 7.5); c.setFillColorRGB(*FAINT)
    c.drawCentredString(PW/2, M+11*mm, 'montree.xyz')


# --- book data --------------------------------------------------------
# One dict per book. `pages` is the reading-order spread list -- each
# becomes a (text page, art page) pair, same as Dark Phonics' spreads.
# `art` files are the confirmed Midjourney the-sat-cast pages already in
# phonics-images/grace-courtesy-books/<slug>/.
BOOKS = [
    dict(
        num=1,
        slug='walking-feet',
        title_lines=['Walking Feet'],
        title_accent='Walking',
        title_size=44,
        band_text='GRACE & COURTESY  ·  RULE 1  ·  WALKING FEET',
        band_color=FOREST,
        booknum='BOOK ONE',
        cover_art='page-01-cover.jpg',
        why='So we don’t CRASH into our friends.',
        pages=[
            ('Tip, toe. Tip, toe.', 'page-02.jpg'),
            ('Here comes Potato! Zoom, zoom, zoom!', 'page-03.jpg'),
            ('CRASH! Blocks everywhere!', 'page-04.jpg'),
            ('Oh, Potato. Inside we use walking feet.', 'page-05.jpg'),
            ('Heel to toe, soft and slow.', 'page-06.jpg'),
            ('No crash! Walking feet keep friends safe.', 'page-07.jpg'),
            ('Now let’s sing it! (Potato sat this one out.)', 'page-08.jpg'),
        ],
    ),
    dict(
        num=2,
        slug='indoor-voice',
        title_lines=['Indoor Voice'],
        title_accent='Indoor',
        title_size=44,
        band_text='GRACE & COURTESY  ·  RULE 2  ·  INDOOR VOICE',
        band_color=MOSS,
        booknum='BOOK TWO',
        cover_art='page-01-cover.jpg',
        why='So friends can think.',
        pages=[
            ('Shhh. Shhh.', 'page-02.jpg'),
            ('Here comes Potato! SHOUT!', 'page-03.jpg'),
            ('CRASH!', 'page-04.jpg'),
            ('Shhh, Potato. Indoor voice.', 'page-05.jpg'),
            ('Soft and low.', 'page-06.jpg'),
            ('Soft voice. Gentle hands.', 'page-07.jpg'),
            ('Quiet and peaceful. Everyone’s happy.', 'page-08.jpg'),
        ],
    ),
    dict(
        num=3,
        slug='gentle-hands',
        title_lines=['Gentle Hands'],
        title_accent='Gentle',
        title_size=44,
        band_text='GRACE & COURTESY  ·  RULE 3  ·  GENTLE HANDS',
        band_color=HONEY,
        booknum='BOOK THREE',
        cover_art='page-01-cover.jpg',
        why='So friends feel safe.',
        pages=[
            ('Soft, soft. Pat, pat.', 'page-02.jpg'),
            ('Here comes Potato! SQUEEZE!', 'page-03.jpg'),
            ('Too tight! Poor Snake!', 'page-04.jpg'),
            ('Oh, Potato. Gentle hands.', 'page-05.jpg'),
            ('Soft and slow. Pat, pat, pat.', 'page-06.jpg'),
            ('Hands that help. Hands that share.', 'page-07.jpg'),
            ('Gentle hands, happy friends!', 'page-08.jpg'),
        ],
    ),
    dict(
        num=4,
        slug='wash-your-hands',
        title_lines=['Wash Your Hands'],
        title_accent='Wash',
        title_size=44,
        band_text='GRACE & COURTESY  ·  RULE 4  ·  WASH YOUR HANDS',
        band_color=OLIVE,
        booknum='BOOK FOUR',
        cover_art='page-01-cover.png',
        why='So germs wash away.',
        pages=[
            ('Scrub, scrub. Rinse, rinse.', 'page-02.png'),
            ('Here comes Potato! No time to wash!', 'page-03.png'),
            ('Yuck! Dirty hands! Dirty apple!', 'page-04.png'),
            ('Oh, Potato. Wash your hands.', 'page-05.png'),
            ('Soap and water. Scrub, scrub, scrub.', 'page-06.png'),
            ('Rinse and dry. Nice and clean!', 'page-07.png'),
            ('Everyone’s happy! Wash your hands!', 'page-08.png'),
        ],
    ),
    dict(
        num=5,
        slug='roll-the-mat',
        title_lines=['Roll the Mat'],
        title_accent='Roll',
        title_size=44,
        band_text='GRACE & COURTESY  ·  RULE 5  ·  ROLL THE MAT',
        band_color=FOREST,
        booknum='BOOK FIVE',
        cover_art='page-01-cover.png',
        why="So it's ready for a friend.",
        pages=[
            ('Slow and careful. Roll it out.', 'page-02.png'),
            ('Here comes Potato! Toss and tumble!', 'page-03.png'),
            ('Oh no! Blocks everywhere!', 'page-04.png'),
            ('Oh, Potato. The mat is an island.', 'page-05.png'),
            ('Roll it up, corner to corner.', 'page-06.png'),
            ('Neat and tidy. Ready for a friend.', 'page-07.png'),
            ('Now let’s sing it! (Potato sat this one out.)', 'page-08.png'),
        ],
    ),
    # --- V2 REGROUPED SERIES (see docs/curriculum/grace-courtesy/
    # HANDOFF_GRACE_COURTESY_V2_REGROUPED.md, amended 2026-08-21). Combined
    # books: 3-4 rules as one continuous story. Originally 6 illustrated
    # beats/chapter (Establish/Oops/Reaction/Remember/Fix/Landing), each
    # its own text-page+art-page spread -- 26 beats -> 56 printed pages for
    # a 4-chapter book, too long for a 3-6yo. Condensed to 2 beats/chapter
    # (Oops, Fix), each ONE combined art+caption page (see `combined` flag
    # and make_combined_page) -- 4 chapters x 2 + 1 closing = 9 pages ->
    # 12 printed pages total. `num` starts at 10 so V2 sorts after the old
    # single-rule books that are still standing; the old entries get
    # deleted in the same commit that ships this one. FOREST because
    # how-i-move becomes RAW[0] on page.tsx once old Books 1-3 are retired
    # (i=0 % 4 -> PALETTE[0]).
    dict(
        num=10,
        slug='how-i-move',
        combined=True,   # one page per beat (art+caption together) -- see
                         # make_combined_page. 26 illustrated beats / 56
                         # printed pages was too long for a 3-6yo reader
                         # (Tredoux, 2026-08-21). Revamped to 2 beats per
                         # chapter -- Oops, Fix -- each combining what used
                         # to be 3 separate spreads (Establish+Oops+Reaction
                         # into one Oops image/caption; Remember+Fix+Landing
                         # into one Fix image/caption). 4 chapters x 2 beats
                         # + 1 closing = 9 combined pages -> 12 printed pages
                         # total (cover + 9 + why + back), exactly one
                         # 4-page sheet count multiple, no padding needed.
        title_lines=['How I Move'],
        title_accent='Move',
        title_size=44,
        band_text='GRACE & COURTESY  ·  BOOK 1  ·  HOW I MOVE',
        band_color=FOREST,
        booknum='BOOK ONE',
        tagline='Four rules. One story.',
        cover_art='page-01-cover',
        why=['So we can all move', 'safely together.'],
        text_size=34,
        pages=[
            # Chapter 1 - Walking Feet (Star)
            (['We walk inside.', 'Oh! Star bumps', 'into Apple!'], 'page-02'),
            (['Oh, Star — walking feet!', 'Now Star walks calmly.',
              'Happy feet, happy friends!'], 'page-03'),
            # Chapter 2 - Indoor Voice (Cat)
            (['We use indoor voices.', 'Oh! Cat shouts —',
              'whoa, ears ring!'], 'page-04'),
            (['Oh, Cat — indoor voices!', 'Now Cat whispers.',
              'Soft and quiet, happy friends!'], 'page-05'),
            # Chapter 3 - Gentle Hands (Snake)
            (['We use gentle hands.', 'Oh! Snake squeezes',
              'too tight — poor Apple!'], 'page-06'),
            (['Oh, Snake — gentle hands!', 'Now Snake holds gently.',
              'Gentle hands, happy friends!'], 'page-07'),
            # Chapter 4 - Line Up (Potato)
            (['We line up, one behind one.', 'Oh! Potato cuts to the front.',
              'Not so fun, friends.'], 'page-08'),
            (['Oh, Potato — line up!', 'Now Potato waits its turn.',
              'One behind one, ready to go!'], 'page-09'),
            # Unit closing -- cumulative recap, full cast.
            (['We walk inside.',
              'We use indoor voices.',
              'We use gentle hands.',
              'We line up, one behind one.',
              'We’re ready for the day!'], 'page-10'),
        ],
    ),
]


ART_EXTS = ('.png', '.jpg', '.jpeg', '.webp')


def resolve_art(art_dir, fname, slug):
    """Find a page image. `fname` may carry an extension or not -- V2 books
    are filed straight out of MJ and the extension isn't known in advance,
    so accept any of ART_EXTS."""
    path = os.path.join(art_dir, fname)
    if os.path.exists(path):
        return path
    stem = os.path.splitext(fname)[0]
    for ext in ART_EXTS:
        cand = os.path.join(art_dir, stem + ext)
        if os.path.exists(cand):
            return cand
    raise SystemExit(f'{slug}: missing art {os.path.join(art_dir, stem)}[{"|".join(ART_EXTS)}]')


def make_book(entry):
    slug = entry['slug']
    art_dir = os.path.join(ART_ROOT, slug)
    cover = resolve_art(art_dir, entry['cover_art'], slug)
    combined = entry.get('combined', False)
    spreads = []
    for text, fname in entry['pages']:
        art = resolve_art(art_dir, fname, slug)
        if combined:
            lines = text if isinstance(text, list) else [text]
            spreads.append(dict(lines=lines, art=art,
                                text_size=entry.get('text_size', 34)))
        else:
            spreads.append(dict(nar='', text=text, size=entry.get('text_size', 100), art=art))
    return dict(
        combined=combined,
        tagline=entry.get('tagline', 'One rule. One reason why.'),
        slug=slug,
        title_lines=entry['title_lines'],
        title_accent=entry['title_accent'],
        title_size=entry['title_size'],
        band_text=entry['band_text'],
        band_color=entry['band_color'],
        booknum=entry['booknum'],
        cover=cover,
        why=entry['why'],
        spreads=spreads,
    )


def build(book, outdir):
    os.makedirs(outdir, exist_ok=True)
    if book['combined']:
        # V2 combined books: no halftitle spacer, one page per beat (art
        # + caption together) instead of a text-page/art-page pair.
        pages = [(page_cover, False)]
        for sp in book['spreads']:
            pages.append((make_combined_page(sp['art'], sp['lines'], sp['text_size']), True))
    else:
        pages = [(page_cover, False), (bb.page_halftitle, False)]
        for sp in book['spreads']:
            pages.append((make_text_page(sp) if sp.get('text') or sp.get('nar') else page_blank, True))
            pages.append((make_art_page(sp['art']), True))
    tail = [(page_why, False), (page_back, False)]
    T = -(-(len(pages) + len(tail)) // 4) * 4
    need = T - len(pages) - len(tail)
    front = (need + 1) // 2
    back = need - front
    pages = ([pages[0]] + [(page_blank, False)]*front + pages[1:]
             + [tail[0]] + [(page_blank, False)]*back + [tail[1]])
    N = len(pages)

    c = rl_canvas.Canvas(f"{outdir}/{book['slug']}-A5-reading.pdf", pagesize=(PW, PH))
    for i, (painter, is_story) in enumerate(pages):
        painter(c, book)
        if is_story: folio(c, i+1, left=(i+1) % 2 == 0)
        c.showPage()
    c.save()

    sheetW, sheetH = landscape(A4)
    c = rl_canvas.Canvas(f"{outdir}/{book['slug']}-A5-booklet-print.pdf", pagesize=(sheetW, sheetH))
    order = []
    for k in range(N//2):
        order.append((N-k, k+1) if k % 2 == 0 else (k+1, N-k))
    for li, ri in order:
        for idx, xoff in ((li, 0), (ri, sheetW/2)):
            painter, is_story = pages[idx-1]
            c.saveState(); c.translate(xoff + (sheetW/2-PW)/2, (sheetH-PH)/2)
            c.setFillColorRGB(1, 1, 1)
            painter(c, book)
            if is_story: folio(c, idx, left=(idx % 2 == 0))
            c.restoreState()
        c.setStrokeColorRGB(0, 0, 0); c.setLineWidth(0.3)
        c.line(sheetW/2, sheetH-4*mm, sheetW/2, sheetH-9*mm)
        c.line(sheetW/2, 4*mm, sheetW/2, 9*mm)
        c.showPage()
    c.save()
    print(book['slug'], N, 'pages,', N//4, 'sheets')
    return N


def main():
    os.makedirs(OUT, exist_ok=True)
    built = []
    only = os.environ.get('MONTREE_BOOK_ONLY')  # slug filter for draft previews
    entries = [e for e in BOOKS if not only or e['slug'] == only]
    if only and not entries:
        raise SystemExit(f'MONTREE_BOOK_ONLY={only}: no such book slug')
    for entry in sorted(entries, key=lambda e: e['num']):
        book = make_book(entry)
        build(book, OUT)
        built.append(book['slug'])

    bad = []
    for slug in built:
        for suffix in ('-A5-reading.pdf', '-A5-booklet-print.pdf'):
            path = os.path.join(OUT, slug + suffix)
            if not os.path.exists(path) or os.path.getsize(path) == 0:
                bad.append(path)
    if bad:
        raise SystemExit('EMPTY/MISSING:\n  ' + '\n  '.join(bad))
    print(f'OK {len(built)} books -> {len(built)*2} PDFs in {OUT}')


if __name__ == '__main__':
    main()
