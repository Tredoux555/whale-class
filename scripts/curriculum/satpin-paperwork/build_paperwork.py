# -*- coding: utf-8 -*-
"""Montree Phonics — printable paperwork pack (A4 portrait).

2026-07-30 evening — reverted to 4pp/10q per Tredoux (duplex = 2 sheets);
the 5 'no' yes/no items are common FUNNY words for maximum giggle factor,
not restricted to prior-week vocab.

2026-07-30 late — page order changed per Tredoux: warm-up (yes/no) ->
engage (story order) -> challenge (match). This pack is reinforcement /
"I can do it", not a learning exercise, so it opens on the easy win —
yes/no becomes the stapled cover.

One letter JSON in, one `paperwork-pack.pdf` out, containing three works:

    p1-p2  Yes or no?   — ten questions, tick or cross (warm-up; cover)
    p3     Story order  — the five illustrations shuffled, a write-in box each
    p4     Match        — five sentences, five pictures, draw the line

House chrome ("Inked Hush"): three inks, tracked labels, YoungSerif titles,
Outfit for anything the child reads, Lora italic for the teacher's voice.

    python3 build_paperwork.py --letter p
    python3 build_paperwork.py --letter p --repo-root /path/to/montree --out /tmp/out

Fonts resolve from MONTREE_CANVAS_FONTS (default: the canvas-design skill
folder, same as scripts/curriculum/flashcards/build_booklets.py).
"""
import argparse
import json
import os

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as rl_canvas

# ---------------------------------------------------------------- fonts ----
F = os.environ.get('MONTREE_CANVAS_FONTS',
                   '/root/.claude/skills/canvas-design/canvas-fonts/')
if not F.endswith('/'):
    F += '/'
pdfmetrics.registerFont(TTFont('Title',  F + 'YoungSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Word',   F + 'Outfit-Bold.ttf'))
pdfmetrics.registerFont(TTFont('WordRg', F + 'Outfit-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Nar',    F + 'Lora-Italic.ttf'))
pdfmetrics.registerFont(TTFont('Label',  F + 'WorkSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LabelB', F + 'WorkSans-Bold.ttf'))

# ----------------------------------------------------------------- inks ----
INK   = (0.10, 0.10, 0.10)
RED   = (0.776, 0.157, 0.157)      # #c62828
GREY  = (0.52, 0.52, 0.52)
FAINT = (0.72, 0.72, 0.72)
HAIR  = (0.84, 0.84, 0.84)

PW, PH = A4                        # 210 x 297 mm
M = 14 * mm
CW = PW - 2 * M                    # content width

TOP_CONTENT = PH - M - 34 * mm     # first usable y below the header rule
BOT_CONTENT = M + 12 * mm          # last usable y above the footer rule
USABLE = TOP_CONTENT - BOT_CONTENT


# ------------------------------------------------------------- helpers ----
def fit(c, text, font, size, maxw, tracking=0.0, floor=6):
    """Shrink `size` until `text` fits `maxw`."""
    while size > floor:
        w = c.stringWidth(text, font, size) + tracking * size * (len(text) - 1)
        if w <= maxw:
            break
        size -= 0.5
    return size


def draw_tracked(c, x, y, text, font, size, tracking, color, align='center'):
    c.setFont(font, size)
    c.setFillColorRGB(*color)
    total = c.stringWidth(text, font, size) + tracking * size * (len(text) - 1)
    cx = {'center': x - total / 2, 'left': x, 'right': x - total}[align]
    for ch in text:
        c.drawString(cx, y, ch)
        cx += c.stringWidth(ch, font, size) + tracking * size


def hairline(c, x1, y, x2, color=HAIR, width=0.5):
    c.setStrokeColorRGB(*color)
    c.setLineWidth(width)
    c.line(x1, y, x2, y)


def draw_image_contained(c, path, x, y, w, h, frame=True):
    """Draw `path` centred inside the (x, y, w, h) box, aspect preserved."""
    img = ImageReader(path)
    iw, ih = img.getSize()
    ar = ih / iw
    dw, dh = w, w * ar
    if dh > h:
        dh, dw = h, h / ar
    dx, dy = x + (w - dw) / 2, y + (h - dh) / 2
    c.drawImage(img, dx, dy, dw, dh, mask='auto')
    if frame:
        c.setStrokeColorRGB(*HAIR)
        c.setLineWidth(0.5)
        c.rect(dx, dy, dw, dh, stroke=1, fill=0)
    return dx, dy, dw, dh


def write_box(c, x, y, size, corner=1.6 * mm):
    """The child's write-in square. Never smaller than 20 mm — small hands."""
    c.setStrokeColorRGB(0.42, 0.42, 0.42)
    c.setLineWidth(0.9)
    c.roundRect(x, y, size, size, corner, stroke=1, fill=0)


def tick_mark(c, cx, cy, s, color, width=1.1):
    c.setStrokeColorRGB(*color)
    c.setLineWidth(width)
    c.setLineCap(1)
    p = c.beginPath()
    p.moveTo(cx - s * 0.5, cy + s * 0.05)
    p.lineTo(cx - s * 0.12, cy - s * 0.42)
    p.lineTo(cx + s * 0.55, cy + s * 0.5)
    c.drawPath(p, stroke=1, fill=0)


def cross_mark(c, cx, cy, s, color, width=1.1):
    c.setStrokeColorRGB(*color)
    c.setLineWidth(width)
    c.setLineCap(1)
    c.line(cx - s * 0.45, cy - s * 0.45, cx + s * 0.45, cy + s * 0.45)
    c.line(cx - s * 0.45, cy + s * 0.45, cx + s * 0.45, cy - s * 0.45)


# ---------------------------------------------------------------- chrome ---
def page_chrome(c, cfg, work_title, instruction, page_no, page_total):
    """Masthead, letter badge, work title, name/date, instruction, rules."""
    draw_tracked(c, M, PH - M - 5 * mm, 'M O N T R E E   P H O N I C S',
                 'Label', 8.5, 0.28, GREY, align='left')

    # letter badge, top right
    bx, by, br = PW - M - 8 * mm, PH - M - 10 * mm, 8 * mm
    c.setStrokeColorRGB(*RED)
    c.setLineWidth(0.9)
    c.circle(bx, by, br, stroke=1, fill=0)
    c.setFont('Word', 20)
    c.setFillColorRGB(*RED)
    c.drawCentredString(bx, by - 4.6, cfg['letter'])   # optical, not metric
    draw_tracked(c, bx, by - br - 5 * mm, 'WEEK %d' % cfg['week'],
                 'Label', 6.5, 0.24, FAINT)

    # work title
    c.setFont('Title', 19)
    c.setFillColorRGB(*INK)
    c.drawString(M, PH - M - 19 * mm, work_title)
    tw = c.stringWidth(work_title, 'Title', 19)
    c.setFillColorRGB(*RED)
    c.circle(M + tw + 3.4 * mm, PH - M - 19 * mm + 2.2 * mm, 1.15 * mm,
             stroke=0, fill=1)

    # name / date, right-aligned, clear of the badge column
    yn = PH - M - 27.5 * mm
    c.setFont('Label', 7.5)
    c.setFillColorRGB(*FAINT)
    c.drawString(PW - M - 74 * mm, yn + 1.4 * mm, 'name')
    hairline(c, PW - M - 63 * mm, yn, PW - M - 26 * mm, FAINT)
    c.setFillColorRGB(*FAINT)
    c.drawString(PW - M - 23 * mm, yn + 1.4 * mm, 'date')
    hairline(c, PW - M - 14 * mm, yn, PW - M, FAINT)

    # instruction (teacher's voice)
    c.setFont('Nar', 10.5)
    c.setFillColorRGB(*GREY)
    c.drawString(M, yn + 1.2 * mm, instruction)

    hairline(c, M, PH - M - 34 * mm - 3 * mm, PW - M)

    # footer
    hairline(c, M, M + 8 * mm, PW - M)
    c.setFont('Label', 7)
    c.setFillColorRGB(*FAINT)
    c.drawString(M, M + 3.4 * mm,
                 '%s  ·  Montree Phonics' % cfg['bookTitle'])
    c.drawRightString(PW - M, M + 3.4 * mm, '%d / %d' % (page_no, page_total))


# ------------------------------------------------------------ work pages ---
def page_sequencing(c, cfg, art, page_no, page_total):
    page_chrome(c, cfg, 'Story order',
                'What happened first? Write 1 to 5 in the boxes.',
                page_no, page_total)

    order = cfg['sequencingDisplayOrder']
    by_order = {p['order']: p for p in cfg['pages']}

    box = 24 * mm                                  # >= 20 mm, small hands
    gap = 4 * mm
    imw = 60 * mm
    cellw = box + gap + imw                        # 88 mm
    gutter = CW - 2 * cellw                        # 6 mm
    imh = 45 * mm
    cellh = max(box, imh)

    pitch = 64 * mm
    block = 2 * pitch + cellh
    top = TOP_CONTENT - (USABLE - block) / 2

    slots = [(M, 0), (M + cellw + gutter, 0),
             (M, 1), (M + cellw + gutter, 1),
             (M + (CW - cellw) / 2, 2)]

    for k, (x, row) in enumerate(slots):
        page = by_order[order[k]]
        ytop = top - row * pitch
        y = ytop - cellh
        write_box(c, x, y + (cellh - box) / 2, box)
        draw_image_contained(c, os.path.join(art, page['art']),
                             x + box + gap, y, imw, cellh)


def page_match(c, cfg, art, page_no, page_total):
    page_chrome(c, cfg, 'Match',
                'Read the words. Draw a line to the picture.',
                page_no, page_total)

    by_order = {p['order']: p for p in cfg['pages']}
    right_order = cfg['matchDisplayOrder']

    imw, imh = 49.3 * mm, 37 * mm                  # 6.5 mm of air between rows
    img_x = PW - M - imw
    dot_l = M + 66 * mm
    dot_r = img_x - 7 * mm

    pitch = 43.5 * mm
    block = 4 * pitch + imh
    top = TOP_CONTENT - (USABLE - block) / 2

    for i in range(5):
        ytop = top - i * pitch
        ymid = ytop - imh / 2

        s = by_order[cfg['pages'][i]['order']]['sentence']
        size = fit(c, s, 'WordRg', 14, dot_l - M - 6 * mm)
        c.setFont('WordRg', size)
        c.setFillColorRGB(*INK)
        c.drawString(M, ymid - size * 0.34, s)

        c.setFillColorRGB(*INK)
        c.circle(dot_l, ymid, 1.3 * mm, stroke=0, fill=1)
        c.circle(dot_r, ymid, 1.3 * mm, stroke=0, fill=1)

        draw_image_contained(c, os.path.join(art, by_order[right_order[i]]['art']),
                             img_x, ytop - imh, imw, imh)


def page_yesno(c, cfg, art, photos, items, page_no, page_total):
    page_chrome(c, cfg, 'Yes or no?',
                'Look at the picture. Tick yes, or cross no.',
                page_no, page_total)

    imw, imh = 44 * mm, 33 * mm
    bs = 20 * mm                                    # tick / cross box
    no_x = PW - M - bs
    yes_x = no_x - 8 * mm - bs
    q_x = M + imw + 8 * mm
    q_w = yes_x - 6 * mm - q_x

    # column headers, drawn once, centred over their column as a unit
    hy = TOP_CONTENT - 7 * mm
    c.setFont('LabelB', 8)
    for x, mark, word in ((yes_x, tick_mark, 'yes'), (no_x, cross_mark, 'no')):
        ww = c.stringWidth(word, 'LabelB', 8)
        total = 3.2 * mm + 1.8 * mm + ww
        sx = x + bs / 2 - total / 2
        mark(c, sx + 1.6 * mm, hy + 1.0 * mm, 2.2 * mm, GREY, 1.0)
        c.setFillColorRGB(*GREY)
        c.drawString(sx + 3.2 * mm + 1.8 * mm, hy, word)

    head = 13 * mm
    pitch = 38 * mm
    block = 4 * pitch + imh
    top = (TOP_CONTENT - head) - (USABLE - head - block) / 2

    for i, item in enumerate(items):
        ytop = top - i * pitch
        y = ytop - imh
        ymid = ytop - imh / 2

        src = (os.path.join(art, item['imageArt']) if item.get('imageArt')
               else os.path.join(photos, item['imageWord'],
                                 item['imageWord'] + '.jpg'))
        draw_image_contained(c, src, M, y, imw, imh)

        q = item['question']
        size = fit(c, q, 'WordRg', 13.5, q_w)
        c.setFont('WordRg', size)
        c.setFillColorRGB(*INK)
        c.drawString(q_x, ymid - size * 0.34, q)

        for x, mark in ((yes_x, tick_mark), (no_x, cross_mark)):
            write_box(c, x, ymid - bs / 2, bs)
            mark(c, x + 3.4 * mm, ymid + bs / 2 - 3.4 * mm, 1.7 * mm, FAINT, 0.7)


# ----------------------------------------------------------------- build ---
def build(cfg, repo_root, outdir):
    os.makedirs(outdir, exist_ok=True)
    art = os.path.join(repo_root, cfg['artDir'])
    photos = os.path.join(repo_root, cfg['photoDir'])

    for p in cfg['pages']:
        f = os.path.join(art, p['art'])
        if not os.path.exists(f):
            raise SystemExit('missing art: ' + f)
    for it in cfg['yesno']:
        f = (os.path.join(art, it['imageArt']) if it.get('imageArt')
             else os.path.join(photos, it['imageWord'], it['imageWord'] + '.jpg'))
        if not os.path.exists(f):
            raise SystemExit('missing yes/no image: ' + f)

    out = os.path.join(outdir, 'paperwork-pack.pdf')
    c = rl_canvas.Canvas(out, pagesize=A4)
    c.setTitle('%s — paperwork pack' % cfg['bookTitle'])

    total = 4
    page_yesno(c, cfg, art, photos, cfg['yesno'][:5], 1, total)
    c.showPage()
    page_yesno(c, cfg, art, photos, cfg['yesno'][5:], 2, total)
    c.showPage()
    page_sequencing(c, cfg, art, 3, total)
    c.showPage()
    page_match(c, cfg, art, 4, total)
    c.showPage()
    c.save()
    print('paperwork-pack.pdf', total, 'pages ->', out)
    return out


def default_repo_root():
    # scripts/curriculum/satpin-paperwork/build_paperwork.py -> repo root
    return os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                        '..', '..', '..'))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--letter', default='p', help='letters/<letter>.json')
    ap.add_argument('--repo-root', default=None)
    ap.add_argument('--out', default=None,
                    help='default: <repo>/public/satpin-materials/<slug>')
    a = ap.parse_args()

    root = os.path.abspath(a.repo_root) if a.repo_root else default_repo_root()
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, 'letters', a.letter + '.json')) as fh:
        cfg = json.load(fh)
    out = a.out or os.path.join(root, 'public', 'satpin-materials', cfg['slug'])
    build(cfg, root, out)


if __name__ == '__main__':
    main()
