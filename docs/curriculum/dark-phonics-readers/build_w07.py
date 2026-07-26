#!/usr/bin/env python3
import subprocess, base64, pathlib

SRC_DIR = pathlib.Path("/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/phonics-images/satpin-v2/books/monkey")
OUT_PATH = pathlib.Path("/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/public/satpin-books/sam-and-the-monkey.html")

pages = [
    "sam-and-the-monkey-p1-monkey-on-mat.png",
    "sam-and-the-monkey-p2-sam-on-mat.png",
    "sam-and-the-monkey-p3-cat-on-mat.png",
    "sam-and-the-monkey-p4-monkey-sits-on-sam.png",
    "sam-and-the-monkey-p5-potato-finale.png",
]

b64_list = []
for i, fname in enumerate(pages, start=1):
    src = SRC_DIR / fname
    jpg = pathlib.Path("/tmp/w07_p%d.jpg" % i)
    subprocess.run(
        ["sips", "-s", "format", "jpeg", "-s", "formatOptions", "82", str(src), "--out", str(jpg)],
        check=True,
    )
    data = jpg.read_bytes()
    b64_list.append(base64.b64encode(data).decode("ascii"))

HEAD = """<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sam and the Monkey</title><style>
:root{--bg:#0b0b12;--card:#15151f;--ink:#ececf2;--mut:#9a9ab0;--ac:#7c5cff;--ac2:#16d39a;--y:#f0b85a;--line:#23233a}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
header{padding:20px 16px;border-bottom:1px solid var(--line);text-align:center}h1{margin:0;font-size:26px;color:var(--y)}
.sub{color:var(--mut);font-size:13px;margin-top:6px}main{max-width:900px;margin:0 auto;padding:20px 16px 80px}
.spread{display:flex;align-items:center;gap:22px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px;margin:16px 0}
.spread:nth-child(even){flex-direction:row-reverse}
.art{flex:0 0 380px;background:#fff;border-radius:12px;overflow:hidden;display:flex;align-items:center;justify-content:center}
.art img{width:100%;display:block}.missing{padding:60px;color:#999;font-style:italic}
.txt{flex:1}.pg{font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:8px}
.txt p{font-size:30px;font-weight:700;margin:0}.txt p.shout{font-size:36px;color:var(--y)}
.txt p.wordless{font-size:16px;font-weight:400;color:var(--ac2);font-style:italic}
.note{display:block;margin-top:10px;font-size:12px;color:var(--mut);font-style:italic}
@media(max-width:700px){.spread,.spread:nth-child(even){flex-direction:column}.art{width:100%;flex:none}}
.txt p .setup{font-weight:400;font-style:italic;color:var(--mut)}
.txt p .target{font-weight:700}
</style></head><body>
"""

HEADER = ('<header><h1>Sam and the Monkey</h1><div class="sub">Dark Phonics · '
          'Week 7 (m) · hybrid reader · Gate: Lesson 11 · potato finale</div></header>\n<main>\n')

PAGE_DATA = [
    ("’A monkey sat on the…’", "mat!", "The muddy Monkey arrives, banana and all."),
    ("’Sam sat on the…’", "mat!", "Sam the peg-doll boy joins the cast — his name needs /m/."),
    ("’The cat sat on the…’", "mat!", "The tabby squeezes on. The mat is getting crowded."),
    ("’The monkey sat on…’", "Sam!", "The gag — the monkey sits right on Sam."),
]

spreads = []
for i in range(4):
    setup, target, note = PAGE_DATA[i]
    b64 = b64_list[i]
    spread = (
        '<div class="spread">\n'
        '  <div class="art"><img src="data:image/jpeg;base64,%s" alt=""></div>\n'
        '  <div class="txt">\n'
        '    <span class="pg">Page %d</span>\n'
        '    <p><span class="setup">%s</span> <span class="target">%s</span></p>\n'
        '    <span class="note">%s</span>\n'
        '  </div>\n'
        '</div>\n'
    ) % (b64, i + 1, setup, target, note)
    spreads.append(spread)

b64_p5 = b64_list[4]
page5 = (
    '<div class="spread">\n'
    '  <div class="art"><img src="data:image/jpeg;base64,%s" alt=""></div>\n'
    '  <div class="txt">\n'
    '    <span class="pg">Page 5</span>\n'
    '    <p><span class="setup">’And the…?!’</span></p>\n'
    '    <p class="wordless">(wordless — the class shouts it)</p>\n'
    '    <span class="note">The monkey sits it on the mat between Sam and the cat. '
    'The word is never printed.</span>\n'
    '  </div>\n'
    '</div>\n'
) % (b64_p5,)
spreads.append(page5)

FOOTER = "</main>\n</body></html>"

html = HEAD + HEADER + "".join(spreads) + FOOTER

OUT_PATH.write_text(html, encoding="utf-8")
print("WROTE", OUT_PATH, len(html))
