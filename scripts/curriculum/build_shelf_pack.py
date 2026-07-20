"""Dark Phonics Shelf Pack builder (generalized from the lesson-05 's' pilot).
USAGE for a new letter: copy the CONFIG block, change values, run. See
docs/curriculum/satpin-redesign/SHELF_SYSTEM_PLAYBOOK.md for the full recipe,
week-file mapping, and the shelf-4 sentence-strip variant for reader letters.
Images: curl each word's webp from the week file's imageUrls into IMG_DIR, convert to png.
"""
# ======== CONFIG (edit per letter) ========
IMG_DIR = "/tmp/s-pack/img"       # png per word
WORDS = ["snake", "sun", "sock", "star", "soap", "seal", "saw", "sandwich"]
TPC_WORDS = WORDS[:6]             # three-part cards (6)
LETTER = "s"
LESSON = "Lesson 5"
SOUND_LINE = "sss — the snake sound"
OUT = f"/tmp/dark-phonics-shelf-pack-{LESSON.lower().replace(' ','-')}-{LETTER}.pdf"
HAS_READER = False                # True => replace pairs pages with sentence strips (see playbook)
# ==========================================
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
import os

IMG = lambda w: os.path.join(IMG_DIR, f"{w}.png")
RED = HexColor("#c62828")
INK = HexColor("#1a1a1a")
MUT = HexColor("#777777")
LINE = HexColor("#bbbbbb")

W, H = A4  # 595 x 842 pt

c = canvas.Canvas(OUT, pagesize=A4)

def footer(section):
    c.setFont("Helvetica", 8); c.setFillColor(MUT)
    c.drawString(15*mm, 8*mm, f"Dark Phonics · {LESSON} · '{LETTER}' · {section}")
    c.drawRightString(W-15*mm, 8*mm, "teacherpotato.xyz")

def cutrect(x, y, w, h):
    c.setDash(2, 3); c.setStrokeColor(LINE); c.setLineWidth(0.7)
    c.rect(x, y, w, h); c.setDash()

def draw_img_fitted(path, x, y, w, h):
    from PIL import Image as PImage
    im = PImage.open(path); iw, ih = im.size
    s = min(w/iw, h/ih); dw, dh = iw*s, ih*s
    c.drawImage(path, x+(w-dw)/2, y+(h-dh)/2, dw, dh, preserveAspectRatio=True, mask='auto')

# ---------- PAGE 1: WALL LETTER CARD ----------
c.setFont("Helvetica-Bold", 14); c.setFillColor(INK)
c.drawCentredString(W/2, H-20*mm, "WALL CARD — display above the shelf")
cutrect(30*mm, 40*mm, W-60*mm, H-80*mm)
c.setFont("Helvetica-Bold", 420); c.setFillColor(RED)
c.drawCentredString(W/2, H/2 - 140, LETTER)
c.setFont("Helvetica", 16); c.setFillColor(MUT)
c.drawCentredString(W/2, 50*mm, SOUND_LINE)
footer("Wall card")
c.showPage()

# ---------- PAGES 2-3: CIRCLE FLASHCARDS (4 per page, picture + word) ----------
def flashcard_page(words, title):
    c.setFont("Helvetica-Bold", 13); c.setFillColor(INK)
    c.drawCentredString(W/2, H-14*mm, title)
    cw, ch = (W-40*mm)/2, (H-60*mm)/2
    for i, wd in enumerate(words):
        col, row = i % 2, i // 2
        x = 15*mm + col*(cw+10*mm)
        y = H - 22*mm - (row+1)*ch - row*8*mm
        cutrect(x, y, cw, ch)
        draw_img_fitted(IMG(wd), x+4*mm, y+16*mm, cw-8*mm, ch-24*mm)
        c.setFont("Helvetica-Bold", 26); c.setFillColor(INK)
        c.drawCentredString(x+cw/2, y+5*mm, wd)
    footer("Shelf 1 — circle flashcards")
    c.showPage()

flashcard_page(WORDS[:4], "SHELF 1 — CIRCLE FLASHCARDS (1 of 2)")
flashcard_page(WORDS[4:], "SHELF 1 — CIRCLE FLASHCARDS (2 of 2)")

# ---------- PAGES 4-5: OBJECT-TO-PICTURE MATCHING (picture-only cards, larger) ----------
def object_match_page(words, title):
    c.setFont("Helvetica-Bold", 13); c.setFillColor(INK)
    c.drawCentredString(W/2, H-14*mm, title)
    cw, ch = (W-40*mm)/2, (H-60*mm)/2
    for i, wd in enumerate(words):
        col, row = i % 2, i // 2
        x = 15*mm + col*(cw+10*mm)
        y = H - 22*mm - (row+1)*ch - row*8*mm
        cutrect(x, y, cw, ch)
        draw_img_fitted(IMG(wd), x+4*mm, y+4*mm, cw-8*mm, ch-8*mm)
    footer("Shelf 2 — object-to-picture matching (no labels: child matches real object to picture)")
    c.showPage()

object_match_page(WORDS[:4], "SHELF 2 — OBJECT-TO-PICTURE CARDS (1 of 2)")
object_match_page(WORDS[4:], "SHELF 2 — OBJECT-TO-PICTURE CARDS (2 of 2)")

# ---------- PAGES 6-8: THREE-PART CARDS (6 words; control + picture + label) ----------
# Layout: per page, 2 words side by side: control card (pic+label), picture card, label card stacked.
def tpc_pages(words):
    per_page = 2
    for pstart in range(0, len(words), per_page):
        chunk = words[pstart:pstart+per_page]
        c.setFont("Helvetica-Bold", 13); c.setFillColor(INK)
        c.drawCentredString(W/2, H-14*mm, f"SHELF 3 — THREE-PART CARDS ({pstart//per_page + 1} of {len(words)//per_page})")
        colw = (W-45*mm)/2
        for ci, wd in enumerate(chunk):
            x = 15*mm + ci*(colw+15*mm)
            # control card
            ch1 = 88*mm
            ytop = H - 24*mm - ch1
            cutrect(x, ytop, colw, ch1)
            draw_img_fitted(IMG(wd), x+3*mm, ytop+15*mm, colw-6*mm, ch1-20*mm)
            c.setFont("Helvetica-Bold", 20); c.drawCentredString(x+colw/2, ytop+4*mm, wd)
            # picture card
            ch2 = 74*mm
            y2 = ytop - 8*mm - ch2
            cutrect(x, y2, colw, ch2)
            draw_img_fitted(IMG(wd), x+3*mm, y2+3*mm, colw-6*mm, ch2-6*mm)
            # label card
            ch3 = 18*mm
            y3 = y2 - 8*mm - ch3
            cutrect(x, y3, colw, ch3)
            c.setFont("Helvetica-Bold", 22); c.setFillColor(INK)
            c.drawCentredString(x+colw/2, y3+5.5*mm, wd)
        footer("Shelf 3 — three-part cards (control / picture / label)")
        c.showPage()

tpc_pages(TPC_WORDS)

# ---------- PAGES 9-10: PAIRS MATCHING (bottom shelf, pre-reader letters) ----------
def pairs_page(words, n):
    c.setFont("Helvetica-Bold", 13); c.setFillColor(INK)
    c.drawCentredString(W/2, H-14*mm, f"SHELF 4 — PAIRS MATCHING SET ({n})")
    cw, ch = (W-50*mm)/3, (H-70*mm)/3
    cells = [(wd) for wd in words for _ in (0,1)]  # two of each -> 12 cards over 2 pages? we do 6 words x2 = 12; 9 per page
    # simpler: this page prints ONE copy of 6 words at small size; print the page TWICE for pairs.
    for i, wd in enumerate(words):
        col, row = i % 3, i // 3
        x = 15*mm + col*(cw+10*mm)
        y = H - 24*mm - (row+1)*ch - row*8*mm
        cutrect(x, y, cw, ch)
        draw_img_fitted(IMG(wd), x+3*mm, y+3*mm, cw-6*mm, ch-6*mm)
    c.setFont("Helvetica-Oblique", 10); c.setFillColor(MUT)
    c.drawCentredString(W/2, 16*mm, "Print this page TWICE and cut — the two copies make the pairs-matching game.")
    footer("Shelf 4 — matching work (pre-reader letters: no sentences yet)")
    c.showPage()

pairs_page(WORDS[:6], "6 words — print twice")
pairs_page(WORDS[2:8], "alternate mix — print twice")

# ---------- PAGE 11: TEACHER GUIDE / SHELF MAP ----------
c.setFont("Helvetica-Bold", 16); c.setFillColor(INK)
c.drawCentredString(W/2, H-20*mm, "SHELF MAP — Lesson 5 's' (the four levels)")
levels = [
    ("WALL", "Big letter card above the shelf. Point to it every time the sound is made."),
    ("SHELF 1 — Flashcards", "The 8 circle-time cards (picture + word). Used in circle first; child revisits freely."),
    ("SHELF 2 — Object to picture", "Basket of real miniatures (snake, sock, star, soap, seal, saw...) + picture-only cards. Child places each object on its picture."),
    ("SHELF 3 — Three-part cards", "6 words. Control card stays whole; child matches picture card + label card to it. Label-matching is pre-reading (shape matching) at this stage."),
    ("SHELF 4 — Matching work", "Pairs game (two identical picture sets). For letters WITH a reader (t onward), this shelf instead holds the sentence strips + the book."),
]
y = H-40*mm
for title, body in levels:
    c.setFont("Helvetica-Bold", 12); c.setFillColor(RED)
    c.drawString(20*mm, y, title)
    c.setFont("Helvetica", 10.5); c.setFillColor(INK)
    # naive wrap
    import textwrap
    for li, line in enumerate(textwrap.wrap(body, 88)):
        c.drawString(20*mm, y-6*mm-li*5*mm, line)
    y -= (14 + 5*len(textwrap.wrap(body,88)))*mm
c.setFont("Helvetica-Oblique", 9.5); c.setFillColor(MUT)
c.drawString(20*mm, 30*mm, "Print on card stock. Laminate if possible. Cut along dashed lines.")
c.drawString(20*mm, 24*mm, "This is the pilot of the Dark Phonics shelf system — a/t/p/i/n packs follow the same recipe.")
footer("Teacher guide")
c.showPage()

c.save()
print("PDF built")
