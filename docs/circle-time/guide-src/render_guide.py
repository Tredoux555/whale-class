# -*- coding: utf-8 -*-
"""Render every circle-guide-weekN.html in this folder (guide-src/) to a PDF in
public/, matching the exact page.pdf() options documented in
docs/circle-time/WEEK_BUILD_SPEC.md sec.8 (A4, printBackground, zero margins).

Run this in the CLOUD CONTAINER (the Mac has neither Playwright nor
pdfplumber -- see WEEK_BUILD_SPEC.md sec.8). It reads each week's HTML +
this folder's fonts/ (Fredoka + Atkinson Hyperlegible + Noto Sans CJK SC +
Noto Color Emoji, embedded locally via @font-face because
fonts.googleapis.com is not reachable from this container -- see the CSS
comment in build_guide.py) and writes public/circle-guide-week<N>.pdf.

Usage: python3 render_guide.py [week ...]      # default: every week with an
                                                # HTML file in this folder
"""
import glob, os, sys, re
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
HTML_DIR = HERE
OUT_DIR = os.path.normpath(os.path.join(HERE, "..", "..", "..", "public"))

def weeks_to_build():
    files = sorted(glob.glob(os.path.join(HTML_DIR, "circle-guide-week*.html")))
    ns = []
    for f in files:
        m = re.search(r"week(\d+)\.html$", f)
        ns.append(int(m.group(1)))
    return sorted(ns)

def main():
    weeks = [int(a) for a in sys.argv[1:]] if len(sys.argv) > 1 else weeks_to_build()
    print("weeks:", weeks)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        for w in weeks:
            src = os.path.abspath(os.path.join(HTML_DIR, f"circle-guide-week{w}.html"))
            dst = os.path.join(OUT_DIR, f"circle-guide-week{w}.pdf")
            page.goto(f"file://{src}", wait_until="networkidle")
            # give the FIT auto-sizer a beat after 'load' fired
            page.wait_for_timeout(300)
            page.pdf(path=dst, format="A4", print_background=True,
                     margin={"top": "0", "right": "0", "bottom": "0", "left": "0"})
            print("wrote", dst)
        browser.close()

if __name__ == "__main__":
    main()
