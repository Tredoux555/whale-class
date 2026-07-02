#!/usr/bin/env python3
"""Week 1 reader: "It's a..." — A5 landscape, dark forest, Andika.

Usage: python3 build_week01_book.py "/path/to/Week 01"
Expects images/01-chair.png ... 10-potato.png + Andika-Regular.ttf / Andika-Bold.ttf
in the target folder. Writes book.html there; render with headless Chrome:
  Chrome --headless --disable-gpu --no-pdf-header-footer --print-to-pdf=out.pdf file://.../book.html

Design rules (locked, see 26_WEEK_SOUND_CURRICULUM.md §8):
- Page-turn IS the reveal: question page -> flip -> answer page
- Dark forest #0a1a0f, emerald glow, gold #E8C96A for 'an' and the potato
- Andika (single-storey Montessori 'a'), fallback Comic Sans MS
"""
import os
import sys

BASE = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))

SPREADS = [
    ("01-chair.png",  "It&rsquo;s a chair."),
    ("02-table.png",  "It&rsquo;s a table."),
    ("03-mat.png",    "It&rsquo;s a mat."),
    ("04-cup.png",    "It&rsquo;s a cup."),
    ("05-book.png",   "It&rsquo;s a book."),
    ("06-pencil.png", "It&rsquo;s a pencil."),
    ("07-apple.png",  "It&rsquo;s <span class='gold'>an</span> apple."),
    ("08-egg.png",    "It&rsquo;s <span class='gold'>an</span> egg."),
]

font_face = ""
if os.path.exists(os.path.join(BASE, "Andika-Regular.ttf")):
    font_face = (
        "@font-face{font-family:'Andika';src:url('Andika-Regular.ttf');font-weight:400;}"
        "@font-face{font-family:'Andika';src:url('Andika-Bold.ttf');font-weight:700;}"
    )

CSS = """
*{margin:0;padding:0;box-sizing:border-box;}
@page{size:210mm 148mm;margin:0;}
body{font-family:'Andika','Comic Sans MS',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.page{width:210mm;height:148mm;page-break-after:always;position:relative;overflow:hidden;background:#0a1a0f;}
.page:last-child{page-break-after:auto;}
.qpage{display:flex;align-items:center;justify-content:center;
  background:radial-gradient(circle at 30% 20%,rgba(52,211,153,0.13),transparent 55%),#0a1a0f;}
.q{color:#fff;font-size:52pt;font-weight:700;text-align:center;}
.suspense{background:radial-gradient(circle at 50% 60%,rgba(232,201,106,0.08),transparent 60%),#070f0a;}
.suspense .q{color:#E8C96A;letter-spacing:3px;}
.mark{position:absolute;bottom:7mm;right:11mm;color:rgba(232,201,106,0.45);font-size:24pt;font-weight:700;}
.apage img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;}
.bar{position:absolute;top:8mm;left:50%;transform:translateX(-50%);z-index:2;
  background:rgba(6,14,9,0.78);color:#fff;font-size:30pt;font-weight:700;
  padding:4mm 12mm;border-radius:6mm;white-space:nowrap;
  border:0.6mm solid rgba(52,211,153,0.35);}
.gold{color:#E8C96A;}
.potato .bar{font-size:34pt;}
.cover{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8mm;
  background:radial-gradient(circle at 70% 25%,rgba(52,211,153,0.16),transparent 55%),#0a1a0f;}
.kicker{color:#E8C96A;font-size:13pt;letter-spacing:5px;}
.title{color:#fff;font-size:78pt;font-weight:700;}
.foot{color:rgba(255,255,255,0.5);font-size:12pt;letter-spacing:1px;}
.back{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3.5mm;
  background:radial-gradient(circle at 30% 80%,rgba(52,211,153,0.10),transparent 55%),#0a1a0f;}
.back h2{color:#E8C96A;font-size:15pt;letter-spacing:3px;font-weight:700;margin-bottom:4mm;}
.back .w{color:#fff;font-size:17pt;}
.back .note{color:rgba(255,255,255,0.55);font-size:11pt;margin-top:7mm;max-width:150mm;text-align:center;line-height:1.5;}
.back .rule{width:34mm;height:0.4mm;background:rgba(232,201,106,0.5);margin-top:8mm;}
.back .author{color:#fff;font-size:14pt;font-weight:700;margin-top:3mm;}
.back .brand{color:#E8C96A;font-size:10pt;letter-spacing:5px;}
"""


def qpage(text, cls=""):
    return f"<div class='page qpage {cls}'><div class='q'>{text}</div><div class='mark'>a</div></div>"


def apage(img, caption, cls=""):
    cap = f"<div class='bar'>{caption}</div>" if caption else ""
    return f"<div class='page apage {cls}'>{cap}<img src='images/{img}'/></div>"


pages = []

# Cover
pages.append(
    "<div class='page cover'>"
    "<div class='kicker'>WEEK 1 &middot; THE LETTER a</div>"
    "<div class='title'>It&rsquo;s a&hellip;</div>"
    "<div class='foot'>Book 1</div>"
    "</div>"
)

# The eight spreads: question -> flip -> answer
for img, cap in SPREADS:
    pages.append(qpage("What is it?"))
    pages.append(apage(img, cap))

# The finale: suspense question -> silent mystery page -> POTATO
pages.append(qpage("What&hellip; is&hellip; it&hellip;?", "suspense"))
pages.append(apage("09-mystery.png", ""))
pages.append(apage("10-potato.png", "It&rsquo;s a <span class='gold'>POTATO!</span>", "potato"))

# Back cover — word list for parents + how to read it
pages.append(
    "<div class='page back'>"
    "<h2>READ TOGETHER</h2>"
    "<div class='w'>a chair &middot; a table &middot; a mat &middot; a cup</div>"
    "<div class='w'>a book &middot; a pencil &middot; <span class='gold'>an</span> apple &middot; <span class='gold'>an</span> egg</div>"
    "<div class='w'>&hellip;and a potato.</div>"
    "<div class='note'>Ask &ldquo;What is it?&rdquo; &mdash; pause &mdash; let the child answer before you turn the page.<br/>"
    "The pause is the lesson.</div>"
    "<div class='rule'></div>"
    "<div class='author'>Tredoux Willemse</div>"
    "<div class='brand'>MONTREE</div>"
    "</div>"
)

html = (
    "<!doctype html><html><head><meta charset='utf-8'>"
    f"<style>{font_face}{CSS}</style></head><body>"
    + "".join(pages)
    + "</body></html>"
)

out = os.path.join(BASE, "book.html")
with open(out, "w") as f:
    f.write(html)
print(f"OK {len(pages)} pages -> {out}")
