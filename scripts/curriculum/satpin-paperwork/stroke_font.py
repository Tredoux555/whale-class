# -*- coding: utf-8 -*-
"""Montree Phonics — single-stroke manuscript letter engine.

A hand-defined, *skeleton* (single-stroke) print alphabet: every character is a
list of strokes, every stroke a path the pencil travels once, in the order a
child is taught to write it. Because the strokes are ordered and directed, the
engine can render:

    draw_traced()  dotted skeleton letterforms + a coloured arrow at the start
                   of every stroke, pointing the way the pencil goes
    draw_solid()   the same skeleton drawn as a solid monoline — the model
                   sentence and the cut-out word cards, so the shapes a child
                   copies are *identical* to the shapes they trace

Coordinate system (em units, y up):

    2.0  headline / ascender / cap height
    1.0  midline  (top of x-height)
    0.0  baseline
   -1.0  descender

x-height is therefore exactly 1.0, and `size` in every public call means the
x-height in points. Classic three-line school paper: one x-height above the
midline for ascenders, one below the baseline for descenders.

Stroke-formation rule (locked, matches the Montree letter-formation charts):
round letters (a c d g o q e s) start at about 2 o'clock and travel
counter-clockwise; stems are pulled top-to-bottom; arches are pushed up the
stem and over.

    from stroke_font import draw_traced, draw_solid, text_width, MISSING
"""
import math

# ------------------------------------------------------------ geometry ----
BASE, MID, TOP, DESC = 0.0, 1.0, 2.0, -1.0

_ARC_STEP = 5.0            # degrees between sampled arc points
_SPLINE_STEP = 14          # samples per catmull-rom span


def _arc(cx, cy, rx, ry, a0, a1):
    n = max(2, int(abs(a1 - a0) / _ARC_STEP) + 1)
    return [(cx + rx * math.cos(math.radians(a0 + (a1 - a0) * i / n)),
             cy + ry * math.sin(math.radians(a0 + (a1 - a0) * i / n)))
            for i in range(n + 1)]


def _spline(pts):
    """Centripetal-ish Catmull-Rom through `pts` (endpoints duplicated)."""
    if len(pts) < 3:
        return list(pts)
    p = [pts[0]] + list(pts) + [pts[-1]]
    out = []
    for i in range(len(p) - 3):
        p0, p1, p2, p3 = p[i], p[i + 1], p[i + 2], p[i + 3]
        for j in range(_SPLINE_STEP + (1 if i == len(p) - 4 else 0)):
            t = j / _SPLINE_STEP
            t2, t3 = t * t, t * t * t
            out.append((
                0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t
                       + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2
                       + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t
                       + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2
                       + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)))
    return out


def _flatten(segments):
    """Segment specs -> one polyline (or the marker ('dot', x, y))."""
    pts = []
    for seg in segments:
        kind = seg[0]
        if kind == 'dot':
            return ('dot', seg[1], seg[2])
        if kind == 'l':
            new = list(seg[1])
        elif kind == 'a':
            new = _arc(*seg[1:])
        elif kind == 's':
            new = _spline(seg[1])
        else:
            raise ValueError('bad segment ' + repr(kind))
        if pts and new and abs(new[0][0] - pts[-1][0]) < 1e-9 \
                and abs(new[0][1] - pts[-1][1]) < 1e-9:
            new = new[1:]
        pts.extend(new)
    return pts


def L(*pts):
    return ('l', list(pts))


def A(cx, cy, r, a0, a1, ry=None):
    return ('a', cx, cy, r, r if ry is None else ry, a0, a1)


def S(*pts):
    return ('s', list(pts))


def DOT(x, y):
    return ('dot', x, y)


# --------------------------------------------------------------- circle ---
# Round letters: full circle from 2 o'clock (60 deg), counter-clockwise.
def _bowl(cx, cy, r, start=60.0, sweep=360.0):
    return A(cx, cy, r, start, start + sweep)


def _o_strokes(cx=0.5, cy=0.5, r=0.5):
    return [[_bowl(cx, cy, r)]]


# ------------------------------------------------------------- alphabet ---
# GLYPH[ch] = (advance_in_em, [stroke, ...]); each stroke = [segment, ...].
# Ink is drawn from x = 0; SIDE is added on the left, advance covers both sides.
SIDE = 0.10

GLYPH = {}


def _g(ch, adv, strokes):
    GLYPH[ch] = (adv, strokes)


# ---- lowercase ----
_g('a', 1.22, [[_bowl(0.5, 0.5, 0.5)],
               [L((1.0, 1.02), (1.0, 0.0))]])
_g('b', 1.22, [[L((0.0, 2.0), (0.0, 0.0))],
               [A(0.5, 0.5, 0.5, 180, -180)]])
_g('c', 1.18, [[A(0.5, 0.5, 0.5, 60, 300)]])
_g('d', 1.22, [[_bowl(0.5, 0.5, 0.5)],
               [L((1.0, 2.0), (1.0, 0.0))]])
_g('e', 1.18, [[L((0.003, 0.55), (0.997, 0.55)), A(0.5, 0.5, 0.5, 5.7, 300)]])
_g('f', 1.02, [[A(0.62, 1.5, 0.32, 0, 180), L((0.30, 1.5), (0.30, 0.0))],
               [L((0.0, 1.02), (0.70, 1.02))]])
_g('g', 1.22, [[_bowl(0.5, 0.5, 0.5)],
               [L((1.0, 1.02), (1.0, -0.55)), A(0.5, -0.55, 0.5, 0, -160)]])
_g('h', 1.22, [[L((0.0, 2.0), (0.0, 0.0))],
               [L((0.0, 0.18), (0.0, 0.5)), A(0.5, 0.5, 0.5, 180, 0),
                L((1.0, 0.5), (1.0, 0.0))]])
_g('i', 0.52, [[L((0.16, 1.0), (0.16, 0.0))],
               [DOT(0.16, 1.52)]])
_g('j', 0.72, [[L((0.36, 1.0), (0.36, -0.55)), A(0.06, -0.55, 0.30, 0, -115)],
               [DOT(0.36, 1.52)]])
_g('k', 1.14, [[L((0.0, 2.0), (0.0, 0.0))],
               [L((0.88, 1.0), (0.06, 0.42))],
               [L((0.33, 0.62), (0.92, 0.0))]])
_g('l', 0.52, [[L((0.16, 2.0), (0.16, 0.0))]])
_g('m', 1.72, [[L((0.0, 1.0), (0.0, 0.0))],
               [L((0.0, 0.18), (0.0, 0.55)), A(0.375, 0.55, 0.375, 180, 0),
                L((0.75, 0.55), (0.75, 0.0))],
               [L((0.75, 0.18), (0.75, 0.55)), A(1.125, 0.55, 0.375, 180, 0),
                L((1.5, 0.55), (1.5, 0.0))]])
_g('n', 1.22, [[L((0.0, 1.0), (0.0, 0.0))],
               [L((0.0, 0.18), (0.0, 0.5)), A(0.5, 0.5, 0.5, 180, 0),
                L((1.0, 0.5), (1.0, 0.0))]])
_g('o', 1.22, _o_strokes())
_g('p', 1.22, [[L((0.0, 1.0), (0.0, -1.0))],
               [A(0.5, 0.5, 0.5, 180, -180)]])
_g('q', 1.24, [[_bowl(0.5, 0.5, 0.5)],
               [L((1.0, 1.02), (1.0, -0.88)), S((1.0, -0.88), (1.10, -1.00),
                                                (1.32, -0.76))]])
_g('r', 0.92, [[L((0.0, 1.0), (0.0, 0.0))],
               [L((0.0, 0.18), (0.0, 0.60)), A(0.42, 0.60, 0.42, 180, 42)]])
_g('s', 1.02, [[S((0.72, 0.84), (0.42, 1.02), (0.10, 0.80), (0.36, 0.58),
                  (0.64, 0.44), (0.74, 0.20), (0.40, -0.02), (0.08, 0.18))]])
_g('t', 0.94, [[L((0.36, 1.78), (0.36, 0.0))],
               [L((0.0, 1.02), (0.72, 1.02))]])
_g('u', 1.22, [[L((0.0, 1.0), (0.0, 0.5)), A(0.5, 0.5, 0.5, 180, 360),
                L((1.0, 0.5), (1.0, 1.0))],
               [L((1.0, 1.0), (1.0, 0.0))]])
_g('v', 1.12, [[L((0.0, 1.0), (0.45, 0.0), (0.90, 1.0))]])
_g('w', 1.62, [[L((0.0, 1.0), (0.35, 0.0), (0.70, 1.0), (1.05, 0.0),
                  (1.40, 1.0))]])
_g('x', 1.04, [[L((0.0, 1.0), (0.82, 0.0))],
               [L((0.82, 1.0), (0.0, 0.0))]])
_g('y', 1.12, [[L((0.0, 1.0), (0.46, 0.06))],
               [L((0.90, 1.0), (0.06, -1.0))]])
_g('z', 1.08, [[L((0.0, 1.0), (0.86, 1.0), (0.0, 0.0), (0.88, 0.0))]])

# ---- capitals ----
_g('A', 1.34, [[L((0.56, 2.0), (0.0, 0.0))],
               [L((0.56, 2.0), (1.12, 0.0))],
               [L((0.18, 0.66), (0.94, 0.66))]])
_g('B', 1.30, [[L((0.0, 2.0), (0.0, 0.0))],
               [S((0.0, 2.0), (0.52, 1.99), (0.80, 1.76), (0.80, 1.28),
                  (0.52, 1.03), (0.0, 1.02))],
               [S((0.0, 1.02), (0.60, 1.01), (0.92, 0.74), (0.92, 0.28),
                  (0.58, 0.01), (0.0, 0.0))]])
_g('C', 1.56, [[A(0.67, 1.0, 0.67, 48, 312, ry=1.0)]])
_g('D', 1.50, [[L((0.0, 2.0), (0.0, 0.0))],
               [S((0.0, 2.0), (0.60, 1.98), (1.06, 1.60), (1.06, 0.40),
                  (0.60, 0.02), (0.0, 0.0))]])
_g('E', 1.20, [[L((0.0, 2.0), (0.0, 0.0))],
               [L((0.0, 2.0), (0.86, 2.0))],
               [L((0.0, 1.03), (0.72, 1.03))],
               [L((0.0, 0.0), (0.86, 0.0))]])
_g('F', 1.14, [[L((0.0, 2.0), (0.0, 0.0))],
               [L((0.0, 2.0), (0.86, 2.0))],
               [L((0.0, 1.03), (0.72, 1.03))]])
_g('G', 1.60, [[A(0.67, 1.0, 0.67, 48, 318, ry=1.0),
                L((1.115, 0.335), (1.16, 0.90))],
               [L((1.16, 0.90), (0.68, 0.90))]])
_g('H', 1.42, [[L((0.0, 2.0), (0.0, 0.0))],
               [L((1.10, 2.0), (1.10, 0.0))],
               [L((0.0, 1.03), (1.10, 1.03))]])
_g('I', 1.10, [[L((0.45, 2.0), (0.45, 0.0))],
               [L((0.08, 2.0), (0.82, 2.0))],
               [L((0.08, 0.0), (0.82, 0.0))]])
_g('J', 1.16, [[L((0.86, 2.0), (0.86, 0.50)),
                S((0.86, 0.50), (0.80, 0.10), (0.48, -0.02), (0.14, 0.26))]])
_g('K', 1.32, [[L((0.0, 2.0), (0.0, 0.0))],
               [L((1.00, 2.0), (0.05, 0.96))],
               [L((0.32, 1.22), (1.08, 0.0))]])
_g('L', 1.10, [[L((0.0, 2.0), (0.0, 0.0), (0.88, 0.0))]])
_g('M', 1.66, [[L((0.0, 2.0), (0.0, 0.0))],
               [L((0.0, 2.0), (0.71, 0.72), (1.42, 2.0))],
               [L((1.42, 2.0), (1.42, 0.0))]])
_g('N', 1.42, [[L((0.0, 2.0), (0.0, 0.0))],
               [L((0.0, 2.0), (1.10, 0.0))],
               [L((1.10, 0.0), (1.10, 2.0))]])
_g('O', 1.60, [[A(0.70, 1.0, 0.70, 60, 420, ry=1.0)]])
_g('P', 1.24, [[L((0.0, 2.0), (0.0, 0.0))],
               [S((0.0, 2.0), (0.56, 1.99), (0.88, 1.74), (0.88, 1.28),
                  (0.56, 1.03), (0.0, 1.02))]])
_g('Q', 1.66, [[A(0.70, 1.0, 0.70, 60, 420, ry=1.0)],
               [L((0.96, 0.44), (1.48, -0.10))]])
_g('R', 1.32, [[L((0.0, 2.0), (0.0, 0.0))],
               [S((0.0, 2.0), (0.56, 1.99), (0.88, 1.74), (0.88, 1.28),
                  (0.56, 1.03), (0.0, 1.02))],
               [L((0.44, 1.03), (1.06, 0.0))]])
_g('S', 1.40, [[S((1.02, 1.68), (0.58, 2.04), (0.12, 1.62), (0.48, 1.16),
                  (0.88, 0.88), (1.02, 0.44), (0.56, -0.03), (0.10, 0.36))]])
_g('T', 1.30, [[L((0.56, 2.0), (0.56, 0.0))],
               [L((0.0, 2.0), (1.12, 2.0))]])
_g('U', 1.46, [[L((0.0, 2.0), (0.0, 0.56)), A(0.57, 0.56, 0.57, 180, 360),
                L((1.14, 0.56), (1.14, 2.0))]])
_g('V', 1.46, [[L((0.0, 2.0), (0.57, 0.0), (1.14, 2.0))]])
_g('W', 2.06, [[L((0.0, 2.0), (0.44, 0.0), (0.87, 2.0), (1.30, 0.0),
                  (1.74, 2.0))]])
_g('X', 1.38, [[L((0.0, 2.0), (1.06, 0.0))],
               [L((1.06, 2.0), (0.0, 0.0))]])
_g('Y', 1.38, [[L((0.0, 2.0), (0.53, 1.02))],
               [L((1.06, 2.0), (0.53, 1.02))],
               [L((0.53, 1.02), (0.53, 0.0))]])
_g('Z', 1.34, [[L((0.0, 2.0), (1.04, 2.0), (0.0, 0.0), (1.06, 0.0))]])

# ---- digits ----
_g('0', 1.16, [[A(0.47, 1.0, 0.47, 60, 420, ry=1.0)]])
_g('1', 0.92, [[L((0.10, 1.58), (0.52, 2.0), (0.52, 0.0))]])
_g('2', 1.16, [[S((0.06, 1.58), (0.30, 2.03), (0.82, 1.94), (0.86, 1.46),
                  (0.52, 0.96), (0.06, 0.02)), L((0.06, 0.02), (0.96, 0.02))]])
_g('3', 1.16, [[S((0.06, 1.62), (0.42, 2.04), (0.88, 1.72), (0.50, 1.06),
                  (0.92, 0.74), (0.70, 0.02), (0.10, 0.28))]])
_g('4', 1.20, [[L((0.72, 2.0), (0.02, 0.62), (0.98, 0.62))],
               [L((0.72, 2.0), (0.72, 0.0))]])
_g('5', 1.16, [[L((0.18, 2.0), (0.14, 1.18)),
                S((0.14, 1.18), (0.56, 1.32), (0.92, 1.02), (0.86, 0.44),
                  (0.46, 0.0), (0.06, 0.22))],
               [L((0.18, 2.0), (0.92, 2.0))]])
_g('6', 1.16, [[S((0.86, 1.86), (0.50, 2.03), (0.12, 1.42), (0.08, 0.62),
                  (0.36, 0.0), (0.78, 0.16), (0.86, 0.60), (0.50, 0.96),
                  (0.12, 0.76))]])
_g('7', 1.14, [[L((0.04, 2.0), (1.00, 2.0), (0.34, 0.0))]])
_g('8', 1.16, [[S((0.50, 1.02), (0.14, 1.36), (0.24, 1.86), (0.60, 2.02),
                  (0.86, 1.70), (0.50, 1.02), (0.12, 0.56), (0.30, 0.04),
                  (0.72, 0.10), (0.86, 0.56), (0.50, 1.02))]])
_g('9', 1.16, [[A(0.47, 1.42, 0.47, 60, 420, ry=0.58)],
               [L((0.94, 1.42), (0.94, 0.0))]])

# ---- punctuation ----
_g('.', 0.56, [[DOT(0.18, 0.07)]])
_g(',', 0.56, [[S((0.24, 0.20), (0.20, 0.0), (0.04, -0.26))]])
_g('!', 0.58, [[L((0.20, 2.0), (0.20, 0.44))],
               [DOT(0.20, 0.07)]])
_g('?', 1.06, [[S((0.06, 1.58), (0.22, 2.02), (0.68, 2.04), (0.82, 1.58),
                  (0.46, 1.20), (0.44, 0.72))],
               [DOT(0.44, 0.07)]])
_g("'", 0.36, [[L((0.18, 2.0), (0.10, 1.50))]])
_g('-', 0.86, [[L((0.04, 0.86), (0.62, 0.86))]])
_g(' ', 0.62, [])

# Characters the readers use that map onto a defined glyph.
ALIAS = {'’': "'", '‘': "'", '—': '-', '–': '-',
         '…': '.'}

MISSING = set()


def _resolve(ch):
    ch = ALIAS.get(ch, ch)
    if ch in GLYPH:
        return ch
    MISSING.add(ch)
    return None


# ---------------------------------------------------------------- layout --
def advance(ch, tracking=0.0):
    r = _resolve(ch)
    return (GLYPH[r][0] if r else 0.0) + (tracking if r else 0.0)


def text_width(text, size, tracking=0.0):
    """Width of `text` in points, `size` = x-height in points."""
    return sum(advance(ch, tracking) for ch in text) * size


def layout(text, tracking=0.0):
    """[(glyph_char, pen_x_in_em), ...]"""
    out, x = [], 0.0
    for ch in text:
        r = _resolve(ch)
        if r:
            out.append((r, x))
            x += GLYPH[r][0] + tracking
    return out


def wrap(text, size, maxw, tracking=0.0, lines=2):
    """Greedy word wrap into at most `lines`; returns None if it will not fit."""
    words, rows, cur = text.split(' '), [], ''
    for w in words:
        trial = (cur + ' ' + w) if cur else w
        if cur and text_width(trial, size, tracking) > maxw:
            rows.append(cur)
            cur = w
        else:
            cur = trial
    if cur:
        rows.append(cur)
    return rows if len(rows) <= lines else None


def fit_wrap(text, maxw, target, maxlines=2, tracking=0.0, floor=4.0):
    """Largest size <= target whose wrap fits `maxlines` rows of `maxw`."""
    size = target
    while size > floor:
        rows = wrap(text, size, maxw, tracking, maxlines)
        if rows and all(text_width(r, size, tracking) <= maxw for r in rows):
            return size, rows
        size -= 0.4
    return floor, [text]


# --------------------------------------------------------------- strokes --
def glyph_polylines(ch, ox, oy, size, tracking=0.0):
    """[polyline | ('dot', x, y)] for one glyph, in device points."""
    r = _resolve(ch)
    if not r:
        return []
    out = []
    for stroke in GLYPH[r][1]:
        flat = _flatten(stroke)
        if isinstance(flat, tuple) and flat and flat[0] == 'dot':
            out.append(('dot', ox + (flat[1] + SIDE) * size, oy + flat[2] * size))
        else:
            out.append([(ox + (px + SIDE) * size, oy + py * size)
                        for px, py in flat])
    return out


def text_strokes(text, x, y, size, tracking=0.0):
    """Every stroke of `text` (baseline-left at x, y), device points."""
    out = []
    for ch, pen in layout(text, tracking):
        out.extend(glyph_polylines(ch, x + pen * size, y, size, tracking))
    return out


# -------------------------------------------------------------- rendering -
def _walk(poly, spacing):
    """Points every `spacing` along a polyline, starting at its first point."""
    pts, acc = [poly[0]], 0.0
    for i in range(len(poly) - 1):
        (x0, y0), (x1, y1) = poly[i], poly[i + 1]
        seg = math.hypot(x1 - x0, y1 - y0)
        if seg <= 1e-9:
            continue
        t = spacing - acc
        while t <= seg:
            pts.append((x0 + (x1 - x0) * t / seg, y0 + (y1 - y0) * t / seg))
            t += spacing
        acc = (acc + seg) % spacing
    return pts


def _start_dir(poly):
    x0, y0 = poly[0]
    for x1, y1 in poly[1:]:
        d = math.hypot(x1 - x0, y1 - y0)
        if d > 1e-6:
            return (x1 - x0) / d, (y1 - y0) / d
    return 0.0, -1.0


def draw_arrow(c, x, y, dx, dy, size, color, gap=0.15, length=0.34):
    """Arrow pointing along (dx, dy), its tip `gap` before (x, y)."""
    ln, gp = length * size, gap * size
    tipx, tipy = x - dx * gp, y - dy * gp
    tailx, taily = tipx - dx * ln, tipy - dy * ln
    c.setStrokeColorRGB(*color)
    c.setFillColorRGB(*color)
    c.setLineWidth(max(0.5, 0.048 * size))
    c.setLineCap(1)
    c.line(tailx, taily, tipx, tipy)
    hw, hl = 0.098 * size, 0.215 * size
    px, py = -dy, dx
    p = c.beginPath()
    p.moveTo(tipx, tipy)
    p.lineTo(tipx - dx * hl + px * hw, tipy - dy * hl + py * hw)
    p.lineTo(tipx - dx * hl - px * hw, tipy - dy * hl - py * hw)
    p.close()
    c.drawPath(p, stroke=0, fill=1)


ARROW_COLORS = [(0.55, 0.07, 0.11), (0.06, 0.20, 0.45)]   # stroke 1 red, 2 blue
DOTTED = (0.34, 0.34, 0.34)


def draw_traced(c, text, x, y, size, tracking=0.10, arrows=True,
                dot_spacing=0.155, dot_radius=0.045, color=DOTTED):
    """Dotted skeleton `text` on baseline (x, y), with stroke-order arrows."""
    spacing, radius = dot_spacing * size, dot_radius * size
    c.setFillColorRGB(*color)
    for ch, pen in layout(text, tracking):
        ox = x + pen * size
        for i, stroke in enumerate(glyph_polylines(ch, ox, y, size, tracking)):
            if isinstance(stroke, tuple):                     # the dot of i/j/!
                c.setFillColorRGB(*color)
                c.circle(stroke[1], stroke[2], radius * 1.9, stroke=0, fill=1)
                if arrows:
                    draw_arrow(c, stroke[1], stroke[2] + radius * 1.9, 0, -1,
                               size, ARROW_COLORS[i % 2], gap=0.09, length=0.28)
                continue
            c.setFillColorRGB(*color)
            for px, py in _walk(stroke, spacing):
                c.circle(px, py, radius, stroke=0, fill=1)
            if arrows:
                dx, dy = _start_dir(stroke)
                draw_arrow(c, stroke[0][0], stroke[0][1], dx, dy, size,
                           ARROW_COLORS[i % 2])


def draw_solid(c, text, x, y, size, tracking=0.10, weight=0.115,
               color=(0.10, 0.10, 0.10)):
    """The same letterforms as a solid monoline — model sentences, cards."""
    c.setStrokeColorRGB(*color)
    c.setFillColorRGB(*color)
    c.setLineWidth(weight * size)
    c.setLineCap(1)
    c.setLineJoin(1)
    for stroke in text_strokes(text, x, y, size, tracking):
        if isinstance(stroke, tuple):
            c.circle(stroke[1], stroke[2], weight * size * 0.62, stroke=0, fill=1)
            continue
        p = c.beginPath()
        p.moveTo(*stroke[0])
        for px, py in stroke[1:]:
            p.lineTo(px, py)
        c.drawPath(p, stroke=1, fill=0)


def draw_centred(fn, c, text, cx, y, size, **kw):
    fn(c, text, cx - text_width(text, size, kw.get('tracking', 0.10)) / 2,
       y, size, **kw)
