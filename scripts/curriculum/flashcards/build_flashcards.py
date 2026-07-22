# -*- coding: utf-8 -*-
# NOTE FOR FUTURE SESSIONS: fonts load from the canvas-design skill folder
# (/root/.claude/skills/canvas-design/canvas-fonts/) available in Cowork cloud sessions.
# Art inputs resolve from /mnt/user-data/uploads/... after device_stage_files; all
# Midjourney job UUIDs are in docs/curriculum/satpin-redesign/art-manifest.md.
"""Dark Phonics — SATPIN flashcard DECK v3: one card per word, duplex backs.
Print A4 duplex, flip on LONG edge. Odd pages = fronts, even pages = backs."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader

F = '/root/.claude/skills/canvas-design/canvas-fonts/'
for n,f in [('Title','YoungSerif-Regular.ttf'),('Word','Outfit-Bold.ttf'),
            ('WordRg','Outfit-Regular.ttf'),('Nar','Lora-Italic.ttf'),
            ('Label','WorkSans-Regular.ttf'),('LabelB','WorkSans-Bold.ttf')]:
    pdfmetrics.registerFont(TTFont(n, F+f))

INK=(0.10,0.10,0.10); RED=(0.776,0.157,0.157); GREY=(0.52,0.52,0.52); FAINT=(0.72,0.72,0.72)
PW,PH = A4; M = 16*mm
U='/mnt/user-data/uploads/montree/phonics-images/satpin-v2/books'
SNG='/mnt/user-data/uploads/Dark Phonics'

def tracked(c,x,y,t,f,s,tr,col):
    c.setFillColorRGB(*col); c.setFont(f,s)
    total=c.stringWidth(t,f,s)+tr*s*(len(t)-1); cx=x-total/2
    for ch in t:
        c.drawString(cx,y,ch); cx+=c.stringWidth(ch,f,s)+tr*s

def band(c, right):
    tracked(c,PW/2,PH-M-4,'D A R K   P H O N I C S','Label',9,0.3,GREY)
    c.setFont('Label',8); c.setFillColorRGB(*FAINT)
    c.drawCentredString(PW/2, PH-M-16, right)

def footer(c):
    c.setFont('Label',7.5); c.setFillColorRGB(*FAINT)
    c.drawCentredString(PW/2, 9*mm, 'teacherpotato.xyz')


import os, io
from PIL import Image as PILImage
_CACHE={}
def prep(path, maxpx=1400, q=86):
    """downscale + jpeg-compress once, cache to /tmp for ImageReader"""
    if path in _CACHE: return _CACHE[path]
    im = PILImage.open(path).convert('RGB')
    if max(im.size) > maxpx:
        r = maxpx/max(im.size)
        im = im.resize((int(im.width*r), int(im.height*r)), PILImage.LANCZOS)
    out = '/tmp/fc-%d.jpg' % len(_CACHE)
    im.save(out, 'JPEG', quality=q)
    _CACHE[path]=out
    return out

def img_fit(c, path, cx, cy, maxw, maxh):
    img=ImageReader(prep(path)); iw,ih=img.getSize(); ar=ih/iw
    w=maxw; h=w*ar
    if h>maxh: h=maxh; w=h/ar
    c.drawImage(img, cx-w/2, cy-h/2, w, h, mask='auto')

def word_red_letter(c, x, y, word, letter, size):
    c.setFont('Word', size)
    total = c.stringWidth(word,'Word',size)
    cx = x-total/2
    for ch in word:
        c.setFillColorRGB(*(RED if ch.lower()==letter else INK))
        c.drawString(cx, y, ch)
        cx += c.stringWidth(ch,'Word',size)

WEEKS=[
 dict(letter='s', week='WEEK 1', song='Snake in my Sock', lesson='LESSON 5',
      cue='sss — a held snake-hiss', img=SNG+'/lesson-05.png',
      vocab=[('snake','bk1/p1.png'),('sock','iso/sock.png'),('sun','tiles/SAT-p4.png')]),
 dict(letter='a', week='WEEK 2', song='Ant on my Apple', lesson='LESSON 6',
      cue='ah–ah–ah — short and open', img=SNG+'/lesson-06.png',
      vocab=[('ant','bk2/p1.png'),('apple','tiles/SAT-p3.png'),('ax','iso/ax.png')]),
 dict(letter='t', week='WEEK 3', song='Tick-Tock Stinky Sock', lesson='LESSON 7',
      cue='t–t–t — a tiny tongue-tap', img=SNG+'/lesson-07.png',
      vocab=[('sat','tiles/SAT-p6.png'),('at',None)]),
 dict(letter='p', week='WEEK 4', song='Pop Pop Puppy Poop', lesson='LESSON 8',
      cue='p — a quiet lip-pop', img=SNG+'/lesson-08.png',
      vocab=[('pat','iso/pat.png'),('tap','iso/tap.png'),('sap','iso/sap.png')]),
 dict(letter='i', week='WEEK 5', song='Icky Sticky Pig', lesson='LESSON 9',
      cue='i–i–i — short and itsy', img=SNG+'/lesson-09.png',
      vocab=[('sit','tiles/SAT-p1.png'),('pit','iso/pit.png'),('sip',U+'/sit/sit-sit-sit-p6-webres.jpg')]),
 dict(letter='n', week='WEEK 6', song='No-No Nanny Goat', lesson='LESSON 10',
      cue='nnn — hum it in your nose', img=SNG+'/lesson-10.png',
      vocab=[('nap',U+'/nap/nap-ant-nap-p1-asleep-on-leaf.png'),('pan','iso/pan.png'),('tin','iso/tin.png')]),
]
CAST=[
 dict(name='Snake',          art='bk1/p1.png',      line='the hero of Snake in My Sock!'),
 dict(name='Ant',            art='bk2/p1.png',      line='stars in An Apple for Ant! and Nap, Ant, Nap!'),
 dict(name='Cat',            art='tiles/SAT-p6.png',line='the smug tabby — The ___ Sat!, SPAT!, Sit! Sit! Sit!'),
 dict(name='Sam',            art='card-sam.png',    line='the helper — SPAT! and Sit! Sit! Sit!'),
 dict(name='Teacher Potato', art='card-potato.png', line='hiding at the end of every book'),
 dict(name='Segina',         art='card-segina.png', line='joins the adventure soon'),
]

c = rl_canvas.Canvas('print/dark-phonics-satpin-flashcards.pdf', pagesize=A4)

def week_back(c, w):
    """branded back for word cards of a week"""
    c.setFont('Word', 110); c.setFillColorRGB(*RED)
    c.drawCentredString(PW/2, PH*0.52, w['letter'])
    tracked(c,PW/2, PH*0.52-24*mm, 'D A R K   P H O N I C S','Label',9,0.3,GREY)
    c.setFont('Nar', 12); c.setFillColorRGB(*FAINT)
    c.drawCentredString(PW/2, PH*0.52-33*mm, w['song'])

for w in WEEKS:
    # --- LETTER card ---
    band(c, w['week'] + '  ·  THE SOUND')
    c.setFont('Word', 300); c.setFillColorRGB(*RED)
    c.drawCentredString(PW/2, PH*0.40, w['letter'])
    c.setFont('Nar', 20); c.setFillColorRGB(*INK)
    c.drawCentredString(PW/2, 34*mm, w['cue'])
    footer(c); c.showPage()
    # back: the song
    band(c, w['week'] + '  ·  THE SONG')
    img_fit(c, w['img'], PW/2, PH*0.58, PW-2*M-6*mm, 158*mm)
    c.setFont('Title', 34); c.setFillColorRGB(*INK)
    c.drawCentredString(PW/2, 42*mm, w['song'])
    c.setFont('Label', 9.5); c.setFillColorRGB(*FAINT)
    c.drawCentredString(PW/2, 32*mm, w['lesson'])
    footer(c); c.showPage()
    # --- WORD cards ---
    for word, art in w['vocab']:
        band(c, w['week'])
        if art:
            img_fit(c, art, PW/2, PH*0.58, PW-2*M-6*mm, 140*mm)
            word_red_letter(c, PW/2, 38*mm, word, w['letter'], 72)
        else:
            word_red_letter(c, PW/2, PH*0.5, word, w['letter'], 130)
        footer(c); c.showPage()
        week_back(c, w); c.showPage()

for ch in CAST:
    band(c, 'THE CAST')
    img_fit(c, ch['art'], PW/2, PH*0.56, PW-2*M-10*mm, 150*mm)
    c.setFont('Title', 46); c.setFillColorRGB(*INK)
    c.drawCentredString(PW/2, 46*mm, ch['name'])
    c.setFillColorRGB(*RED); c.circle(PW/2, 38*mm, 1.4*mm, stroke=0, fill=1)
    c.setFont('Nar', 14); c.setFillColorRGB(*GREY)
    c.drawCentredString(PW/2, 28*mm, ch['line'])
    footer(c); c.showPage()
    # cast back
    c.setFillColorRGB(*RED); c.circle(PW/2, PH*0.54, 2.2*mm, stroke=0, fill=1)
    tracked(c,PW/2, PH*0.54-16*mm, 'D A R K   P H O N I C S','Label',9,0.3,GREY)
    c.setFont('Nar', 12); c.setFillColorRGB(*FAINT)
    c.drawCentredString(PW/2, PH*0.54-25*mm, 'the cast')
    c.showPage()
c.save()
print('deck built')
