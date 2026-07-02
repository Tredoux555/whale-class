#!/usr/bin/env python3
"""Week 2 reader: "Where Is Segina?" — A5 landscape, dark forest, Andika.
Usage: python3 build_week02_book.py "/path/to/Week 02"
Same design system as Week 1 (see build_week01_book.py)."""
import os
import sys

BASE = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))

SPREADS = [
    ("01-park.png",        "She&rsquo;s <span class='gold'>at</span> the park."),
    ("02-school.png",      "She&rsquo;s <span class='gold'>at</span> school."),
    ("03-mall.png",        "She&rsquo;s <span class='gold'>at</span> the mall."),
    ("04-police.png",      "She&rsquo;s <span class='gold'>at</span> the police station."),
    ("05-zoo.png",         "She&rsquo;s <span class='gold'>at</span> the zoo."),
    ("06-busstop.png",     "She&rsquo;s <span class='gold'>at</span> the bus stop."),
    ("07-supermarket.png", "She&rsquo;s <span class='gold'>at</span> the supermarket."),
]

font_face = ""
week01 = os.path.join(os.path.dirname(BASE), "Week 01")
for cand in (BASE, week01):
    if os.path.exists(os.path.join(cand, "Andika-Regular.ttf")):
        rel = "" if cand == BASE else "../Week 01/"
        font_face = (
            f"@font-face{{font-family:'Andika';src:url('{rel}Andika-Regular.ttf');font-weight:400;}}"
            f"@font-face{{font-family:'Andika';src:url('{rel}Andika-Bold.ttf');font-weight:700;}}"
        )
        break

CSS = """
*{margin:0;padding:0;box-sizing:border-box;}
@page{size:210mm 148mm;margin:0;}
body{font-family:'Andika','Comic Sans MS',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.page{width:210mm;height:148mm;page-break-after:always;position:relative;overflow:hidden;background:#0a1a0f;}
.page:last-child{page-break-after:auto;}
.qpage{display:flex;align-items:center;justify-content:center;
  background:radial-gradient(circle at 30% 20%,rgba(52,211,153,0.13),transparent 55%),#0a1a0f;}
.q{color:#fff;font-size:44pt;font-weight:700;text-align:center;}
.suspense{background:radial-gradient(circle at 50% 60%,rgba(232,201,106,0.08),transparent 60%),#070f0a;}
.suspense .q{color:#E8C96A;letter-spacing:3px;font-size:40pt;}
.mark{position:absolute;bottom:7mm;right:11mm;color:rgba(232,201,106,0.45);font-size:24pt;font-weight:700;}
.apage img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;}
.bar{position:absolute;top:8mm;left:50%;transform:translateX(-50%);z-index:2;
  background:rgba(6,14,9,0.78);color:#fff;font-size:26pt;font-weight:700;
  padding:4mm 10mm;border-radius:6mm;white-space:nowrap;
  border:0.6mm solid rgba(52,211,153,0.35);}
.sub{position:absolute;bottom:8mm;left:50%;transform:translateX(-50%);z-index:2;
  background:rgba(6,14,9,0.78);color:#E8C96A;font-size:17pt;font-weight:700;
  padding:2.5mm 8mm;border-radius:5mm;white-space:nowrap;
  border:0.5mm solid rgba(232,201,106,0.35);}
.gold{color:#E8C96A;}
.cover{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8mm;
  background:radial-gradient(circle at 70% 25%,rgba(52,211,153,0.16),transparent 55%),#0a1a0f;}
.kicker{color:#E8C96A;font-size:13pt;letter-spacing:5px;}
.title{color:#fff;font-size:52pt;font-weight:700;}
.foot{color:rgba(255,255,255,0.5);font-size:12pt;letter-spacing:1px;}
.back{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3.5mm;
  background:radial-gradient(circle at 30% 80%,rgba(52,211,153,0.10),transparent 55%),#0a1a0f;}
.back h2{color:#E8C96A;font-size:15pt;letter-spacing:3px;font-weight:700;margin-bottom:4mm;}
.back .w{color:#fff;font-size:15pt;}
.back .note{color:rgba(255,255,255,0.55);font-size:11pt;margin-top:7mm;max-width:155mm;text-align:center;line-height:1.5;}
.back .rule{width:34mm;height:0.4mm;background:rgba(232,201,106,0.5);margin-top:8mm;}
.back .author{color:#fff;font-size:14pt;font-weight:700;margin-top:3mm;}
.back .brand{color:#E8C96A;font-size:10pt;letter-spacing:5px;}
"""


def qpage(text, cls=""):
    return f"<div class='page qpage {cls}'><div class='q'>{text}</div><div class='mark'>t</div></div>"


def apage(img, caption, sub="", cls=""):
    cap = f"<div class='bar'>{caption}</div>" if caption else ""
    s = f"<div class='sub'>{sub}</div>" if sub else ""
    return f"<div class='page apage {cls}'>{cap}{s}<img src='images/{img}'/></div>"


pages = []
pages.append(
    "<div class='page cover'>"
    "<div class='kicker'>WEEK 2 &middot; THE LETTER t</div>"
    "<div class='title'>Where Is Segina?</div>"
    "<div class='foot'>Book 2</div>"
    "</div>"
)
for img, cap in SPREADS:
    pages.append(qpage("Where is Segina?"))
    pages.append(apage(img, cap))

pages.append(qpage("Where&hellip; is&hellip; Segina&hellip;?", "suspense"))
pages.append(apage("08-home.png",
                   "She&rsquo;s <span class='gold'>at</span> home.",
                   sub="Shhh&hellip; Segina is asleep."))

pages.append(
    "<div class='page back'>"
    "<h2>READ TOGETHER</h2>"
    "<div class='w'><span class='gold'>at</span> the park &middot; <span class='gold'>at</span> school &middot; <span class='gold'>at</span> the mall &middot; <span class='gold'>at</span> the police station</div>"
    "<div class='w'><span class='gold'>at</span> the zoo &middot; <span class='gold'>at</span> the bus stop &middot; <span class='gold'>at</span> the supermarket</div>"
    "<div class='w'>&hellip;and <span class='gold'>at</span> home.</div>"
    "<div class='note'>Ask &ldquo;Where is Segina?&rdquo; &mdash; pause &mdash; let the child answer before you turn the page.<br/>"
    "<b>at</b> is their first built word: /&#259;/ &hellip; /t/ &hellip; at.</div>"
    "<div class='rule'></div>"
    "<div class='author'>Tredoux Willemse</div>"
    "<div class='brand'>MONTREE</div>"
    "</div>"
)

html = ("<!doctype html><html><head><meta charset='utf-8'>"
        f"<style>{font_face}{CSS}</style></head><body>" + "".join(pages) + "</body></html>")
out = os.path.join(BASE, "book.html")
with open(out, "w") as f:
    f.write(html)
print(f"OK {len(pages)} pages -> {out}")
