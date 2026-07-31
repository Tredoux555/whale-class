# -*- coding: utf-8 -*-
"""Montree Phonics — CVC sentence sheet (A4 portrait, one page per week).

Built 2026-07-31 per the CLAUDE.md pickup-workflow note under the locked
SATPIN Paperwork Pipeline section: the CVC sentence line
(`docs/curriculum/montree-phonics/CVC_SENTENCE_LINE.md`) now has filed
pen-and-ink art for weeks w4-w19, w22, w23, w25-w27 (w20/w21/w24 have no art
yet and are simply absent from `cvc_weeks.json` -- never fabricate a row).
This script turns each of those weeks into one `cvc-sheet.pdf`, three works
stacked on a single page, all reading from the same locked `stroke_font`
skeleton the rest of the pipeline uses so the letterforms a child reads,
traces and matches are identical shapes:

    READ IT      the week's sentence, large, solid monoline (sf.draw_solid) --
                 lowercase decodable text, same as every other model sentence
                 in this pipeline.
    TRACE IT     the same sentence, dotted skeleton + numbered stroke-order
                 arrows (sf.draw_traced), on the locked 3-line guide (dotted
                 headline / dashed midline / solid baseline, 12.5mm x-height) --
                 unchanged from build_tracing.py's trace-it block.
    PICTURE      a cut-and-paste strip: a dashed "paste it here" target box,
    MATCH        then three dashed cut-out boxes (the week's own scene +
                 2 distractors pulled from other CVC weeks' filed art, chosen
                 far apart in the week list so the scenes read as clearly
                 different) each captioned with its own decodable keyword,
                 read straight off the art filename -- distractor words are
                 never invented, only ever another week's real keyword.

No existing match/cut-out convention exists elsewhere in the pipeline for
this shape (paperwork-pack's page_match is sentence-vs-picture with a drawn
line, not a cut-out), so this is the "keep it simple" fallback the CVC brief
asks for: one paste target + three dashed candidates on a cut line.

    python3 build_cvc.py --week 4
    python3 build_cvc.py --all
    python3 build_cvc.py --all --repo-root /path/to/montree --out-root /tmp/out

Fonts resolve from MONTREE_CANVAS_FONTS (default: the canvas-design skill
folder, same as every other builder in this pipeline). Output (fixed name):
`cvc-sheet.pdf`, one per week, written to
`public/satpin-materials/<slug>/cvc-sheet.pdf` -- the same per-slug drop-in
folder every other SATPIN paperwork PDF already lives in, so a later worker
only has to add one more probed path (e.g. `cvcSheet`) to `mediaPaths()` in
app/montree/library/satpin/page.tsx, no new folder convention required.
"""
import argparse
import json
import os
import sys

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as rl_canvas

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import stroke_font as sf                                          # noqa: E402

# ---------------------------------------------------------------- fonts ----
F = os.environ.get('MONTREE_CANVAS_FONTS',
                   '/root/.claude/skills/canvas-design/canvas-fonts/')
if not F.endswith('/'):
    F += '/'
pdfmetrics.registerFont(TTFont('Title',  F + 'YoungSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Word',   F + 'Outfit-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Nar',    F + 'Lora-Italic.ttf'))
pdfmetrics.registerFont(TTFont('Label',  F + 'WorkSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LabelB', F + 'WorkSans-Bold.ttf'))

# ----------------------------------------------------------------- inks ----
INK   = (0.10, 0.10, 0.10)
RED   = (0.776, 0.157, 0.157)
GREY  = (0.52, 0.52, 0.52)
FAINT = (0.72, 0.72, 0.72)
HAIR  = (0.84, 0.84, 0.84)
SLOT  = (0.48, 0.48, 0.48)

# ------------------------------------------------------------- geometry ---
PW, PH = A4                        # 210 x 297 mm -- same page as paperwork-pack
M = 14 * mm
CW = PW - 2 * M

TOP_CONTENT = PH - M - 34 * mm     # same "content starts here" line every
                                   # SATPIN paperwork page uses, so the header
                                   # chrome reads identically across the pack
BOT_CONTENT = M + 12 * mm
USABLE = TOP_CONTENT - BOT_CONTENT

READ_TARGET  = 9.5 * mm             # read-it x-height ceiling
TRACE_U      = 12.5 * mm           # locked trace-it x-height (build_tracing.py)
TRACE_GAP    = 5 * mm              # air between two trace-it writing lines
READ_TRACK   = 0.09
TRACE_TRACK  = 0.12

READ_LABEL_GAP  = 7.0 * mm         # label -> first read-it baseline's headline
READ_BOTTOM_GAP = 5.0 * mm
TRACE_LABEL_GAP = 7.0 * mm
TRACE_BOTTOM_GAP = 6.0 * mm

MATCH_LABEL_GAP  = 7.0 * mm
MATCH_INSTR_GAP  = 6.0 * mm        # label -> instruction line
MATCH_ROW_GAP    = 5.0 * mm        # instruction -> box row
MATCH_BOX_H      = 36.0 * mm
MATCH_CAPTION_GAP = 3.0 * mm
MATCH_CAPTION_H   = 5.0 * mm

MATCH_GAP    = 5.0 * mm            # between the 3 cut-out boxes
MATCH_CUTGAP = 11.0 * mm           # paste box -> first cut-out box (the "cut
                                   # here" divider lives in this wider gap)


# --------------------------------------------------------- repo plumbing ---
def default_repo_root():
    return os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                        '..', '..', '..'))


def load_weeks(repo_root):
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, 'cvc_weeks.json')) as fh:
        cfg = json.load(fh)
    weeks = cfg['weeks']
    art_root = os.path.join(repo_root, 'phonics-images', 'satpin-v2', 'cvc')
    for w in weeks:
        w['art_path'] = os.path.join(art_root, 'w%02d' % w['week'], w['art'])
        w['keyword'] = w['art'].split('-', 1)[1].rsplit('.', 1)[0]
    return weeks


def distractors_for(weeks, idx):
    """Two other weeks' art, picked far apart in the list so the scenes read
    as clearly different -- never a fabricated picture, always another
    week's real filed CVC art."""
    others = [w for j, w in enumerate(weeks) if j != idx]
    n = len(others)
    return [others[(idx + 7) % n], others[(idx + 13) % n]]


# --------------------------------------------------------------- helpers ---
def tracked(c, x, y, text, font, size, tracking, color, align='left'):
    c.setFont(font, size)
    c.setFillColorRGB(*color)
    total = c.stringWidth(text, font, size) + tracking * size * (len(text) - 1)
    cx = {'left': x, 'center': x - total / 2, 'right': x - total}[align]
    for ch in text:
        c.drawString(cx, y, ch)
        cx += c.stringWidth(ch, font, size) + tracking * size


def hairline(c, x1, y, x2, color=HAIR, width=0.5):
    c.setStrokeColorRGB(*color)
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
        c.setStrokeColorRGB(*HAIR)
        c.setLineWidth(0.5)
        c.setDash()
        c.rect(dx, dy, dw, dh, stroke=1, fill=0)
    return dx, dy, dw, dh


def guidelines(c, x0, x1, base, u):
    """Three-line school paper: dotted headline, dashed midline, solid
    baseline -- identical to build_tracing.py's trace-it guide."""
    c.setLineWidth(0.6)
    c.setStrokeColorRGB(0.70, 0.70, 0.70)
    c.setDash(0.9, 2.6)
    c.line(x0, base + 2 * u, x1, base + 2 * u)
    c.setStrokeColorRGB(0.62, 0.62, 0.62)
    c.setDash(3.2, 3.2)
    c.line(x0, base + u, x1, base + u)
    c.setDash()
    c.setStrokeColorRGB(0.38, 0.38, 0.38)
    c.setLineWidth(0.9)
    c.line(x0, base, x1, base)


def section_label(c, x, y, text):
    tracked(c, x, y, ' '.join(text.upper()), 'LabelB', 6.6, 0.10, FAINT)


def dashed_box(c, x, y, w, h, color=SLOT, corner=2.0 * mm, width=0.9):
    c.setStrokeColorRGB(*color)
    c.setLineWidth(width)
    c.setDash(2.4, 2.4)
    c.roundRect(x, y, w, h, corner, stroke=1, fill=0)
    c.setDash()


def scissors_mark(c, cx, cy, s, color=GREY):
    """A small pair of open scissor blades: two crossed strokes from a
    shared pivot with a ring 'handle' on each -- an abstract cut-here glyph
    that does not depend on any font shipping a scissors character."""
    c.setStrokeColorRGB(*color)
    c.setLineWidth(0.9)
    c.setLineCap(1)
    c.line(cx, cy, cx - s * 0.55, cy + s * 0.75)
    c.line(cx, cy, cx - s * 0.55, cy - s * 0.75)
    c.setFillColorRGB(1, 1, 1)
    for dy in (0.75, -0.75):
        c.circle(cx - s * 0.55, cy + s * dy, s * 0.16, stroke=1, fill=1)


# ------------------------------------------------------------------ page ---
def page_chrome(c, w):
    tracked(c, M, PH - M - 5 * mm, 'M O N T R E E   P H O N I C S',
            'Label', 8.5, 0.28, GREY, align='left')

    bx, by, br = PW - M - 8 * mm, PH - M - 10 * mm, 8 * mm
    c.setStrokeColorRGB(*RED)
    c.setLineWidth(0.9)
    c.circle(bx, by, br, stroke=1, fill=0)
    c.setFont('Word', 20)
    c.setFillColorRGB(*RED)
    c.drawCentredString(bx, by - 4.6, w['slug'])
    tracked(c, bx, by - br - 5 * mm, 'WEEK %d' % w['week'], 'Label', 6.5,
            0.24, FAINT, align='center')

    c.setFont('Title', 19)
    c.setFillColorRGB(*INK)
    c.drawString(M, PH - M - 19 * mm, 'CVC sentence')
    tw = c.stringWidth('CVC sentence', 'Title', 19)
    c.setFillColorRGB(*RED)
    c.circle(M + tw + 3.4 * mm, PH - M - 19 * mm + 2.2 * mm, 1.15 * mm,
             stroke=0, fill=1)

    c.setFont('Nar', 10.5)
    c.setFillColorRGB(*GREY)
    c.drawString(M, PH - M - 27.5 * mm + 1.2 * mm,
                 'Read it. Trace it. Cut and paste the matching picture.')

    hairline(c, M, PH - M - 34 * mm - 3 * mm, PW - M)
    hairline(c, M, M + 8 * mm, PW - M)
    c.setFont('Label', 7)
    c.setFillColorRGB(*FAINT)
    c.drawString(M, M + 3.4 * mm, 'Montree Phonics  ·  CVC sentence  ·  letter %s'
                 % w['slug'])
    c.drawRightString(PW - M, M + 3.4 * mm, 'week %d' % w['week'])


# ------------------------------------------------------------- zone: read --
def read_it_metrics(sentence):
    size, rows = sf.fit_wrap(sentence, CW - 4 * mm, READ_TARGET, maxlines=2,
                             tracking=READ_TRACK)
    pitch = 2.6 * size
    block = pitch * (len(rows) - 1) + 3 * size
    return size, rows, pitch, block


def draw_read_it(c, zone_top, size, rows, pitch):
    section_label(c, M, zone_top, 'read it')
    top = zone_top - READ_LABEL_GAP
    for i, row in enumerate(rows):
        w = sf.text_width(row, size, READ_TRACK)
        sf.draw_solid(c, row, PW / 2 - w / 2, top - 2 * size - i * pitch,
                      size, tracking=READ_TRACK, weight=0.115, color=INK)


# ------------------------------------------------------------ zone: trace --
def trace_it_metrics(sentence):
    u, rows = sf.fit_wrap(sentence, CW - 4 * mm, TRACE_U, maxlines=2,
                          tracking=TRACE_TRACK)
    n = len(rows)
    block = n * 3 * u + (n - 1) * TRACE_GAP
    return u, rows, block


def draw_trace_it(c, zone_top, u, rows):
    section_label(c, M, zone_top, 'trace it')
    base = zone_top - TRACE_LABEL_GAP - 2 * u
    for i, row in enumerate(rows):
        b = base - i * (3 * u + TRACE_GAP)
        guidelines(c, M, PW - M, b, u)
        sf.draw_traced(c, row, M + 2 * mm, b, u, tracking=TRACE_TRACK)


# ------------------------------------------------------------ zone: match --
def draw_picture_match(c, zone_top, week, distractors):
    section_label(c, M, zone_top, 'picture match')
    c.setFont('Nar', 9.5)
    c.setFillColorRGB(*GREY)
    c.drawString(M, zone_top - MATCH_INSTR_GAP,
                'Cut out the picture that matches the sentence. Paste it in the box.')

    row_top = zone_top - MATCH_INSTR_GAP - MATCH_ROW_GAP
    box_y = row_top - MATCH_BOX_H

    box_w = (CW - MATCH_CUTGAP - 2 * MATCH_GAP) / 4

    # position 1 (of the 3 cut-out slots) holding the correct picture rotates
    # with the week number so it is never in the same slot every time
    candidates = [week, distractors[0], distractors[1]]
    order = week['week'] % 3
    slots = candidates[-order:] + candidates[:-order] if order else candidates

    # ---- slot 0: the empty paste target -----------------------------------
    px = M
    dashed_box(c, px, box_y, box_w, MATCH_BOX_H, color=(0.62, 0.62, 0.62))
    c.setFont('Label', 6.6)
    c.setFillColorRGB(*FAINT)
    c.drawCentredString(px + box_w / 2, box_y + MATCH_BOX_H / 2 - 2.2,
                        'paste it')
    c.drawCentredString(px + box_w / 2, box_y + MATCH_BOX_H / 2 - 2.2 - 7,
                        'here')

    # ---- the cut-here divider, centred on the box row (not above it) ------
    div_x = px + box_w + MATCH_CUTGAP / 2
    div_mid = box_y + MATCH_BOX_H / 2
    c.setStrokeColorRGB(*SLOT)
    c.setLineWidth(0.8)
    c.setDash(1.2, 2.2)
    c.line(div_x, box_y - 2 * mm, div_x, row_top + 2 * mm)
    c.setDash()
    scissors_mark(c, div_x, div_mid + 3 * mm, 2.6 * mm)
    tracked(c, div_x, div_mid - 7 * mm, 'CUT', 'LabelB', 6.0, 0.14,
           GREY, align='center')

    # ---- slots 1-3: the three cut-out candidates ---------------------------
    x = px + box_w + MATCH_CUTGAP
    for cand in slots:
        dashed_box(c, x, box_y, box_w, MATCH_BOX_H, color=SLOT)
        draw_image_contained(c, cand['art_path'], x + 2 * mm, box_y + 2 * mm,
                             box_w - 4 * mm, MATCH_BOX_H - 4 * mm, frame=False)
        c.setFont('Label', 8)
        c.setFillColorRGB(*GREY)
        c.drawCentredString(x + box_w / 2,
                            box_y - MATCH_CAPTION_GAP - MATCH_CAPTION_H + 1,
                            cand['keyword'])
        x += box_w + MATCH_GAP


# ----------------------------------------------------------------- build ---
def build_week(w, weeks, idx, outdir):
    os.makedirs(outdir, exist_ok=True)
    if not os.path.exists(w['art_path']):
        raise SystemExit('missing art: ' + w['art_path'])
    distractors = distractors_for(weeks, idx)
    for d in distractors:
        if not os.path.exists(d['art_path']):
            raise SystemExit('missing distractor art: ' + d['art_path'])

    sentence = w['sentence']
    read_size, read_rows, read_pitch, read_block = read_it_metrics(sentence)
    read_zone_h = READ_LABEL_GAP + read_block + READ_BOTTOM_GAP

    trace_u, trace_rows, trace_block = trace_it_metrics(sentence)
    trace_zone_h = TRACE_LABEL_GAP + trace_block + TRACE_BOTTOM_GAP

    match_zone_h = (MATCH_INSTR_GAP + MATCH_ROW_GAP + MATCH_BOX_H
                    + MATCH_CAPTION_GAP + MATCH_CAPTION_H)

    total = read_zone_h + trace_zone_h + match_zone_h
    top = TOP_CONTENT - max(0, (USABLE - total)) / 2

    out = os.path.join(outdir, 'cvc-sheet.pdf')
    c = rl_canvas.Canvas(out, pagesize=A4)
    c.setTitle('Week %d CVC sentence — %s' % (w['week'], sentence))
    page_chrome(c, w)

    read_zone_top = top
    draw_read_it(c, read_zone_top, read_size, read_rows, read_pitch)

    trace_zone_top = read_zone_top - read_zone_h
    draw_trace_it(c, trace_zone_top, trace_u, trace_rows)

    match_zone_top = trace_zone_top - trace_zone_h
    draw_picture_match(c, match_zone_top, w, distractors)

    c.showPage()
    c.save()

    if sf.MISSING:
        print('WARNING unmapped characters:', sorted(sf.MISSING))
    overflow = total - USABLE
    print('w%02d %-4s cvc-sheet.pdf -> %s  (read %.1fmm / trace %.1fmm / '
          'match %.1fmm = %.1fmm of %.1fmm usable%s)'
          % (w['week'], w['slug'], out, read_zone_h / mm, trace_zone_h / mm,
             match_zone_h / mm, total / mm, USABLE / mm,
             '  OVERFLOW %.1fmm' % (overflow / mm) if overflow > 0 else ''))
    print('   "%s"  ·  distractors: %s, %s'
          % (sentence, distractors[0]['keyword'], distractors[1]['keyword']))
    return out


def build(repo_root, out_root, only_week=None):
    weeks = load_weeks(repo_root)
    targets = [(i, w) for i, w in enumerate(weeks)
              if only_week is None or w['week'] == only_week]
    if only_week is not None and not targets:
        raise SystemExit('no cvc_weeks.json row for week %d' % only_week)
    outs = []
    for idx, w in targets:
        outdir = os.path.join(out_root, 'public', 'satpin-materials', w['slug'])
        outs.append(build_week(w, weeks, idx, outdir))
    return outs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--week', type=int, default=None,
                    help='build a single week (default: all weeks in cvc_weeks.json)')
    ap.add_argument('--all', action='store_true', help='build every week (default)')
    ap.add_argument('--repo-root', default=None)
    ap.add_argument('--out-root', default=None,
                    help='default: <repo>/public/satpin-materials/<slug>/cvc-sheet.pdf')
    a = ap.parse_args()

    root = os.path.abspath(a.repo_root) if a.repo_root else default_repo_root()
    out_root = os.path.abspath(a.out_root) if a.out_root else root
    build(root, out_root, only_week=a.week)


if __name__ == '__main__':
    main()
