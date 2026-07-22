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

F = '/root/.claude/skills/canvas-design/canvas-fonts/'
pdfmetrics.registerFont(TTFont('Title',  F+'YoungSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Word',   F+'Outfit-Bold.ttf'))
pdfmetrics.registerFont(TTFont('WordRg', F+'Outfit-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Nar',    F+'Lora-Italic.ttf'))
pdfmetrics.registerFont(TTFont('NarB',   F+'Lora-BoldItalic.ttf'))
pdfmetrics.registerFont(TTFont('Label',  F+'WorkSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LabelB', F+'WorkSans-Bold.ttf'))

INK   = (0.10,0.10,0.10)
RED   = (0.776,0.157,0.157)   # #c62828
GREY  = (0.52,0.52,0.52)
FAINT = (0.72,0.72,0.72)

PW, PH = 148.5*mm, 210*mm      # A5 portrait logical page
M = 14*mm

def fit(c, text, font, size, maxw, tracking=0.0):
    while size > 8:
        w = c.stringWidth(text, font, size) + tracking*size*(len(text)-1)
        if w <= maxw: break
        size -= 1
    return size

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
    draw_tracked(c, PW/2, PH-M-8, 'D A R K   P H O N I C S', 'Label', 8.5, 0.28, GREY)
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
        base = int(spec.get('size', 54 if max(len(l) for l in lines)>10 else 72) * 1.25)
        size = min(fit(c, max(lines,key=len), 'Word', base, PW-2*M), base)
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
    draw_tracked(c, PW/2, PH*0.60, 'D A R K   P H O N I C S', 'Label', 9, 0.3, GREY)
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

def build(book, outdir='print'):
    os.makedirs(outdir, exist_ok=True)
    pages = [ (page_cover, False), (page_words, False), (page_halftitle, False) ]
    for sp in book['spreads']:
        pages.append((make_text_page(sp) if sp.get('text') or sp.get('nar') else page_blank, True))
        pages.append((make_art_page(sp['art']), True))
    T = -(-(len(pages)+1)//4)*4          # total pages incl. back cover, multiple of 4
    while len(pages) < T-1:
        pages.append((page_blank, False))
    pages.append((page_back, False))
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
    for li,ri in order:
        for idx,xoff in ((li, 0),(ri, sheetW/2)):
            painter,is_story = pages[idx-1]
            c.saveState(); c.translate(xoff + (sheetW/2-PW)/2, (sheetH-PH)/2)
            c.setFillColorRGB(1,1,1)
            painter(c, book)
            if is_story: folio(c, idx, left=(idx%2==0))
            c.restoreState()
        c.setStrokeColorRGB(0.8,0.8,0.8); c.setLineWidth(0.3)
        c.line(sheetW/2, sheetH-4*mm, sheetW/2, sheetH-9*mm)
        c.line(sheetW/2, 4*mm, sheetW/2, 9*mm)
        c.showPage()
    c.save()
    print(book['slug'], N, 'pages,', N//4, 'sheets')
