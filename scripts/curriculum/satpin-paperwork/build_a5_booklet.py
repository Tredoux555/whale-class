# -*- coding: utf-8 -*-
"""Montree Phonics — A5 trace-and-build take-home booklet.

Picture-forward draft (Tredoux's pick, 2026-08-21): cover + one page per
sentence + a closing page, each page a portrait A5 half of a landscape-A4
sheet — TWO pages print side by side per sheet, single-sided, then get cut
apart down the centre line and stacked/stapled in order. No fold, no
duplex printing required for this v1 — just cut-and-stack.

Every sentence page: the book's own scene art up top (proper book-page
size, not a thumbnail), then the sentence traced across two lines split at
its natural phrase break — dotted skeleton, red/blue stroke-order arrows,
same three-line guide as the current tracing-workbook.pdf. No blank
"free write" line (dropped per Tredoux) and no READ IT / BUILD IT (that
lives on build-it-sheet.pdf).

    python3 build_a5_booklet.py --letter dp-ant-on-my-apple --out /tmp/out

Output (fixed name): tracing-booklet-a5.pdf
"""
import argparse
import importlib.util
import json
import os
import sys
import types

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as rl_canvas

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import stroke_font as sf                                          # noqa: E402
# Deliberately standalone (no `import build_tracing`, to keep this callable
# both on its own AND as a plain import from build_tracing.py without a
# circular import): its own font registration and its own copy of the
# small bookScript-loader plumbing, same as every other build_*.py script
# in this directory.

# ---------------------------------------------------------------- fonts ----
F = os.environ.get('MONTREE_CANVAS_FONTS',
                   '/root/.claude/skills/canvas-design/canvas-fonts/')
if not F.endswith('/'):
    F += '/'
if 'Title' not in pdfmetrics.getRegisteredFontNames():
    pdfmetrics.registerFont(TTFont('Title',  F + 'YoungSerif-Regular.ttf'))
    pdfmetrics.registerFont(TTFont('Word',   F + 'Outfit-Bold.ttf'))
    pdfmetrics.registerFont(TTFont('Label',  F + 'WorkSans-Regular.ttf'))
    pdfmetrics.registerFont(TTFont('LabelB', F + 'WorkSans-Bold.ttf'))

INK, RED, FAINT, GREY = (0, 0, 0), (0.776, 0.157, 0.157), (0.35, 0.35, 0.35), (0, 0, 0)

PW, PH = landscape(A4)      # one physical sheet, printed single-sided
AW, AH = PW / 2, PH         # one booklet page = half that sheet, portrait
MG = 8 * mm


# --------------------------------------------------------- repo plumbing ---
# Own copies (not imported from build_tracing.py — see the standalone note
# above) so this module has no dependency on build_tracing.py at all, in
# either direction.
def default_repo_root():
    return os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                        '..', '..', '..'))


def load_module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


def load_spreads(repo_root, cfg):
    """The reader's own spreads[], imported without letting it build anything."""
    readers = os.path.join(repo_root, 'scripts', 'curriculum',
                           'dark-phonics-readers')
    art_root = os.path.join(repo_root, 'phonics-images', 'satpin-v2', 'books')
    art_dir = os.path.join(repo_root, cfg['artDir'])

    if readers not in sys.path:
        sys.path.insert(0, readers)
    os.environ['MONTREE_BOOKS_ROOT'] = art_root
    os.environ['MONTREE_BOOK_OUT'] = os.path.join(repo_root, '.tracing-tmp')
    os.environ['MONTREE_%s_ART' % cfg['letter'].upper()] = art_dir

    caught = {}
    stub = types.ModuleType('dpbuild')
    stub.build = lambda book, outdir=None: caught.setdefault('book', book)
    stub.BOOKS_ROOT = art_root
    saved = sys.modules.get('dpbuild')
    sys.modules['dpbuild'] = stub
    try:
        load_module(os.path.join(repo_root, cfg['bookScript']),
                    '_montree_book_' + cfg['letter'])
    finally:
        if saved is not None:
            sys.modules['dpbuild'] = saved
        else:
            sys.modules.pop('dpbuild', None)

    if 'book' not in caught:
        raise SystemExit('%s never called build() — cannot read its spreads'
                         % cfg['bookScript'])
    return caught['book']


def sentence_of(spread):
    """nar + shouted word -> the model sentence ('The pig ate a pineapple!')."""
    nar = (spread.get('nar') or '').strip()
    for tail in ('…', '...'):
        if nar.endswith(tail):
            nar = nar[:-len(tail)].strip()
    word = (spread.get('text') or '').strip()
    return (nar + ' ' + word).strip() if nar else word


def resolve_art(cfg, book, spreads, arts, art_dir):
    """Cover art (workbook.coverArt override, else the reader's own cover,
    else the first spread) and closing-page art (the book's own recap
    illustration if it shipped one, else the cover art again)."""
    cover_name = (cfg.get('workbook') or {}).get('coverArt') \
        or os.path.basename(book.get('cover') or spreads[0]['art'])
    cover_art = os.path.join(art_dir, cover_name)
    if not os.path.exists(cover_art):
        cover_art = arts[0]

    closing_art = os.path.join(art_dir, 'p6-recap.png')
    if not os.path.exists(closing_art):
        closing_art = cover_art

    return cover_art, closing_art


def tracked(c, x, y, text, font, size, tracking, color, align='left'):
    c.setFont(font, size)
    c.setFillColorRGB(*color)
    total = c.stringWidth(text, font, size) + tracking * size * (len(text) - 1)
    cx = {'left': x, 'center': x - total / 2, 'right': x - total}[align]
    for ch in text:
        c.drawString(cx, y, ch)
        cx += c.stringWidth(ch, font, size) + tracking * size


def hairline(c, x1, y, x2, width=0.5):
    c.setStrokeColorRGB(0, 0, 0)
    c.setLineWidth(width)
    c.setDash()
    c.line(x1, y, x2, y)


def draw_image_contained(c, path, x, y, w, h, frame=True):
    img = ImageReader(path)
    iw, ih = img.getSize()
    ar = ih / iw
    dw, dh = w, w * ar
    if dh > h:
        dh, dw = h, h / ar
    dx, dy = x + (w - dw) / 2, y + (h - dh) / 2
    c.drawImage(img, dx, dy, dw, dh, mask='auto')
    if frame:
        c.setStrokeColorRGB(0, 0, 0)
        c.setLineWidth(0.5)
        c.setDash()
        c.rect(dx, dy, dw, dh, stroke=1, fill=0)
    return dx, dy, dw, dh


def guidelines(c, x0, x1, base, u):
    c.setLineWidth(0.6)
    c.setStrokeColorRGB(0, 0, 0)
    c.setDash(0.9, 2.6)
    c.line(x0, base + 2 * u, x1, base + 2 * u)
    c.setDash(3.2, 3.2)
    c.line(x0, base + u, x1, base + u)
    c.setDash()
    c.setLineWidth(0.9)
    c.line(x0, base, x1, base)


def section_label(c, x, y, text):
    tracked(c, x, y, ' '.join(text.upper()), 'LabelB', 5.4, 0.10, FAINT)


def chrome(c, right_text):
    tracked(c, MG, AH - MG, 'M O N T R E E   P H O N I C S', 'Label', 6.0,
            0.22, FAINT)
    c.setFont('Label', 6.0)
    c.setFillColorRGB(*FAINT)
    c.drawRightString(AW - MG, AH - MG, right_text)
    hairline(c, MG, AH - MG - 3 * mm, AW - MG)


def footer(c, left_text, right_text):
    hairline(c, MG, 9 * mm, AW - MG)
    c.setFont('Label', 6)
    c.setFillColorRGB(*FAINT)
    c.drawString(MG, 5 * mm, left_text)
    c.drawRightString(AW - MG, 5 * mm, right_text)


def fit_u(text, maxw, cap, tracking=0.12, floor=4.0):
    u = cap
    while u > floor and sf.text_width(text, u, tracking) > maxw:
        u -= 0.1 * mm
    return u


def best_split_book(sentences, maxw, cap_u, tracking=0.12):
    """ONE word-boundary shared by every sentence in the book, chosen to
    maximise the smallest resulting x-height across all of them. Splitting
    each sentence at its own best-fit point would size the type slightly
    more efficiently, but the split would land on a different phrase for
    almost every page (as it did for 'An ant on / my apple!' vs. every
    other page's 'An X / on my apple!') — inconsistent and harder for a
    beginning reader to predict page to page. One shared split trades a
    little type size for a phrase break that's the same every page."""
    word_lists = [s.split(' ') for s in sentences]
    min_words = min(len(w) for w in word_lists)
    best = None
    for k in range(1, min_words):
        worst_u = None
        for words in word_lists:
            l1, l2 = ' '.join(words[:k]), ' '.join(words[k:])
            uu = min(fit_u(l1, maxw, cap_u, tracking),
                     fit_u(l2, maxw, cap_u, tracking))
            worst_u = uu if worst_u is None else min(worst_u, uu)
        if best is None or worst_u > best[0]:
            best = (worst_u, k)
    return best[1] if best else 1


def trace_two_lines(c, sentence, k, x0, x1, ascender_top, gap, cap_u,
                    tracking=0.12):
    words = sentence.split(' ')
    maxw = x1 - x0 - 2 * mm
    k = min(max(k, 1), len(words) - 1) if len(words) > 1 else 1
    line1, line2 = ' '.join(words[:k]), ' '.join(words[k:])
    u1 = fit_u(line1, maxw, cap_u, tracking)
    u2 = fit_u(line2, maxw, cap_u, tracking)
    u = min(u1, u2)
    b1 = ascender_top - 2 * u
    b2 = b1 - (3 * u + gap)
    for text, base in ((line1, b1), (line2, b2)):
        guidelines(c, x0, x1, base, u)
        sf.draw_traced(c, text, x0 + 2 * mm, base, u, tracking=tracking)
    return b2, u


# --------------------------------------------------------------- pages ---
def page_cover(c, cfg, art_path):
    chrome(c, 'WEEK %d' % cfg['week'])
    content_top = AH - MG - 3 * mm
    art_h = 92 * mm
    dx, dy, dw, dh = draw_image_contained(c, art_path, MG, content_top - art_h,
                                          AW - 2 * MG, art_h)
    y = dy - 10 * mm

    title = cfg['bookTitle']
    size = 22.0
    maxw = AW - 2 * MG
    while c.stringWidth(title, 'Title', size) > maxw and size > 10:
        size -= 0.5
    c.setFont('Title', size)
    c.setFillColorRGB(*INK)
    c.drawCentredString(AW / 2, y - size * 0.85, title)
    y -= size * 1.25 + 6 * mm

    bx, by, br = AW / 2, y - 7 * mm, 6.5 * mm
    c.setStrokeColorRGB(*RED)
    c.setLineWidth(0.9)
    c.circle(bx, by, br, stroke=1, fill=0)
    c.setFont('Word', 15)
    c.setFillColorRGB(*RED)
    c.drawCentredString(bx, by - 3.6, cfg['letter'])
    y = by - br - 10 * mm

    c.setFont('Label', 9)
    c.setFillColorRGB(*GREY)
    label = 'written by'
    lw = c.stringWidth(label, 'Label', 9)
    total_w = lw + 4 * mm + 46 * mm
    lx = AW / 2 - total_w / 2
    c.drawString(lx, y, label)
    hairline(c, lx + lw + 4 * mm, y - 1 * mm, lx + lw + 4 * mm + 46 * mm)

    footer(c, 'Montree Phonics', 'trace and build')


def page_sentence(c, cfg, idx, total, sentence, split_k, art_path):
    chrome(c, 'page %d of %d' % (idx, total))
    content_top = AH - MG - 5 * mm
    art_h = 84 * mm
    dx, dy, dw, dh = draw_image_contained(c, art_path, MG, content_top - art_h,
                                          AW - 2 * MG, art_h)
    label_y = dy - 9 * mm
    section_label(c, MG, label_y, 'trace it')
    trace_two_lines(c, sentence, split_k, MG, AW - MG, label_y - 8 * mm,
                    5 * mm, cap_u=10.5 * mm)
    footer(c, cfg['bookTitle'], '%d / %d' % (idx, total))


def page_closing(c, cfg, art_path, sentences):
    chrome(c, 'the end')
    content_top = AH - MG - 3 * mm
    art_h = 70 * mm
    dx, dy, dw, dh = draw_image_contained(c, art_path, MG, content_top - art_h,
                                          AW - 2 * MG, art_h)
    y = dy - 11 * mm
    c.setFont('Title', 19)
    c.setFillColorRGB(*INK)
    c.drawCentredString(AW / 2, y, 'The End!')
    y -= 12 * mm
    c.setFont('Label', 8.5)
    c.setFillColorRGB(*GREY)
    c.drawCentredString(AW / 2, y, 'You read it. You built it. You traced it.')
    y -= 9 * mm
    c.setFont('Label', 7)
    c.setFillColorRGB(*FAINT)
    for s in sentences:
        c.drawCentredString(AW / 2, y, s)
        y -= 4.6 * mm
    footer(c, cfg['bookTitle'], 'well done!')


# --------------------------------------------------------------- build ---
def page_functions(cfg, sentences, arts, cover_art, closing_art):
    """The booklet's pages as zero-arg(-ish) draw functions — cover + one
    per sentence + closing — bound to a shared book-wide split point so the
    phrase break lands on the same word position every page. Callable by
    write_booklet() directly, or reused by anyone who wants the page list
    without also wanting this module to own the Canvas/file."""
    n = len(sentences)
    split_k = best_split_book(sentences, AW - 2 * MG - 2 * mm, 10.5 * mm)
    page_fns = [lambda c: page_cover(c, cfg, cover_art)]
    for i, (s, a) in enumerate(zip(sentences, arts), 1):
        page_fns.append(lambda c, i=i, s=s, a=a: page_sentence(c, cfg, i, n, s,
                                                                split_k, a))
    page_fns.append(lambda c: page_closing(c, cfg, closing_art, sentences))
    return page_fns


def write_booklet(c, page_fns):
    """Draw page_fns two-up onto landscape-A4 sheets of the CURRENT canvas
    `c` (caller has already sized/positioned it — set pagesize before this
    if drawing into an existing multi-section document), calling
    showPage() after each sheet. Caller calls c.save() when done — this
    never saves, so it composes cleanly as one section of a larger PDF
    (e.g. build_tracing.py writing tracing-workbook.pdf) as well as owning
    the whole document itself (this module's own build()/main()). Returns
    the sheet count."""
    n_sheets = -(-len(page_fns) // 2)
    for si in range(n_sheets):
        left = page_fns[si * 2]
        right = page_fns[si * 2 + 1] if si * 2 + 1 < len(page_fns) else None
        c.saveState()
        left(c)
        c.restoreState()
        if right:
            c.saveState()
            c.translate(AW, 0)
            right(c)
            c.restoreState()
        c.setDash(2, 2)
        c.setLineWidth(0.5)
        c.setStrokeColorRGB(0.6, 0.6, 0.6)
        c.line(AW, 0, AW, AH)
        c.setDash()
        c.showPage()
    return n_sheets


def build(cfg, repo_root, outdir):
    os.makedirs(outdir, exist_ok=True)
    book = load_spreads(repo_root, cfg)
    art_dir = os.path.join(repo_root, cfg['artDir'])

    spreads = book['spreads']
    sentences = [sentence_of(s) for s in spreads]
    arts = [os.path.join(art_dir, os.path.basename(s['art'])) for s in spreads]
    cover_art, closing_art = resolve_art(cfg, book, spreads, arts, art_dir)

    page_fns = page_functions(cfg, sentences, arts, cover_art, closing_art)

    out = os.path.join(outdir, 'tracing-booklet-a5.pdf')
    c = rl_canvas.Canvas(out, pagesize=landscape(A4))
    c.setTitle('%s — trace and build booklet (A5)' % cfg['bookTitle'])
    n_sheets = write_booklet(c, page_fns)
    c.save()
    print('tracing-booklet-a5.pdf ->', out, '(%d sheets, %d pages)'
          % (n_sheets, len(page_fns)))
    print('print single-sided, cut each sheet down the centre dashed line, '
          'stack pages 1..%d in order, staple the left edge.' % len(page_fns))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--letter', default='p')
    ap.add_argument('--repo-root', default=None)
    ap.add_argument('--out', default=None)
    a = ap.parse_args()

    root = os.path.abspath(a.repo_root) if a.repo_root else default_repo_root()
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, 'letters', a.letter + '.json')) as fh:
        cfg = json.load(fh)
    out = a.out or os.path.join(root, 'public', 'satpin-materials', cfg['slug'])
    build(cfg, root, out)


if __name__ == '__main__':
    main()
