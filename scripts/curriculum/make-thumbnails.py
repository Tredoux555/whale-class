#!/usr/bin/env python3
"""YouTube-thumbnail generator for the 58-week phonics song curriculum.

Runs on the Mac with python3 + Pillow only. For each (week, role) song it
picks the best-matching hero image, cover-crops it to 1280x720, lays a
diagonal dark-forest scrim over the bottom-left third, and types the kicker
(WEEK NN / sound), a gold rule, the song title (Lora), and the gold M mark.

Usage:
  python3 make-thumbnails.py --week 4 --role word
  python3 make-thumbnails.py --samples          # the 4 director-review samples
  python3 make-thumbnails.py --all              # all 115 thumbnails

Brand values (montree "dark forest" theme, from scripts/mvgen/themes.py +
MONTREE_BRAND_PALETTE.md): bg #0A1A0F, gold #E8C96A, cream #E8F0EA,
shadow #06140C. Fonts: Lora-BoldItalic (title), Andika-Bold (kicker).
"""
import argparse
import json
import os
import re
from PIL import Image, ImageDraw, ImageFont

# ---------------------------------------------------------------- paths ----
REPO = "/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree"
SPEC_DIR = os.path.join(REPO, "lib/montree/english-curriculum/spec")
IMG_ROOT = "/Users/tredouxwillemse/Desktop/English Curriculum 2026"
FONT_DIR = os.path.join(REPO, "scripts/mvgen/fonts")
M_MARK = os.path.join(REPO, "public/brand/m-mark.png")
OUT_DIR = "/Users/tredouxwillemse/Desktop/Music Videos/_thumbnails"

TITLE_FONT = os.path.join(FONT_DIR, "Lora-BoldItalic.ttf")
KICKER_FONT = os.path.join(FONT_DIR, "Andika-Bold.ttf")

# --------------------------------------------------------------- brand ----
FOREST = (10, 26, 15)     # #0A1A0F  dark forest green
GOLD = (232, 201, 106)    # #E8C96A  gold accent
CREAM = (232, 240, 234)   # #E8F0EA  body / cream
SHADOW = (6, 20, 12)      # #06140C  near-black outline

W, H = 1280, 720
PAD = 64
MAX_TEXT_W = 700
STOPWORDS = {"a", "an", "the", "is", "on", "in", "can", "and"}
MAX_BYTES = 2 * 1024 * 1024  # YouTube 2MB thumbnail limit


# ------------------------------------------------------------ tokenizing ----
def _fold(tok):
    """Naive plural fold: dogs->dog, boxes->box."""
    if len(tok) > 4 and tok.endswith("es"):
        return tok[:-2]
    if len(tok) > 3 and tok.endswith("s"):
        return tok[:-1]
    return tok


def tokenize(text):
    """lowercase -> split on non-alpha -> drop stopwords -> plural fold."""
    raw = re.split(r"[^a-z]+", text.lower())
    out = []
    for t in raw:
        if not t or t in STOPWORDS:
            continue
        out.append(_fold(t))
    return out


# --------------------------------------------------------------- kicker ----
def kicker_sound(spec):
    """patternDisplay verbatim if present, else the sound field in slashes."""
    pd = spec.get("patternDisplay")
    if pd:
        return pd
    return "/%s/" % spec.get("sound", "")


# ---------------------------------------------------------- hero picking ----
def week_images_dir(week):
    return os.path.join(IMG_ROOT, "Week %02d" % week, "images")


# Director overrides (Fable, Jul 15): explicit hero paths where the auto-pick
# missed the story. Key = (week, role-independent title match not needed —
# applied per week+title in generate()); value = absolute image path.
HERO_OVERRIDES = {
    (2, "Where Is Segina?"): os.path.join(
        IMG_ROOT, "Week 03", "images", "segina-on-mat.png"),
}


def pick_hero(week, title):
    """Choose the hero image whose filename tokens best overlap the title.

    Excludes *-coloring* files and potato-* files (unless the title is about
    a potato/celebration). Ranks by (# distinct matched title tokens, filesize);
    that also yields the largest-image fallback when nothing matches.
    """
    ov = HERO_OVERRIDES.get((week, title))
    if ov and os.path.exists(ov):
        return ov, ["override"]
    d = week_images_dir(week)
    if not os.path.isdir(d):
        return None, []
    title_toks = set(tokenize(title))
    want_potato = ("potato" in title.lower()) or ("celebration" in title.lower())
    ranked = []
    for fn in os.listdir(d):
        if not fn.lower().endswith(".png"):
            continue
        low = fn.lower()
        if "coloring" in low:
            continue
        if low.startswith("potato") and not want_potato:
            continue
        stem = os.path.splitext(fn)[0]
        file_toks = set(tokenize(stem))
        matched = len(title_toks & file_toks)
        size = os.path.getsize(os.path.join(d, fn))
        ranked.append((matched, size, fn))
    if not ranked:
        return None, []
    ranked.sort(key=lambda r: (r[0], r[1]), reverse=True)
    best = ranked[0]
    return os.path.join(d, best[2]), ranked


# ------------------------------------------------------------ image ops ----
def cover_crop(img):
    """Scale to cover 1280x720, center-crop x, bias the y-crop slightly up."""
    img = img.convert("RGB")
    iw, ih = img.size
    scale = max(W / iw, H / ih)
    nw, nh = round(iw * scale), round(ih * scale)
    img = img.resize((nw, nh), Image.LANCZOS)
    left = (nw - W) // 2
    # bias 0.40 (vs 0.50 center) keeps a touch more of the top in frame
    top = int((nh - H) * 0.40)
    return img.crop((left, top, left + W, top + H))


def build_scrim():
    """Diagonal dark-forest scrim: ~88% alpha at bottom-left, 0 by ~65% across.

    Built at low res (smooth gradient) and bilinear-upscaled for speed.
    """
    gw, gh = 160, 90
    axis2 = gw * gw + gh * gh
    max_a, cutoff = 0.88, 0.65
    data = bytearray(gw * gh)
    for y in range(gh):
        ty = y - gh  # y - H
        for x in range(gw):
            dot = x * gw - ty * gh  # projection onto BL->TR axis
            a = max_a * (1.0 - (dot / axis2) / cutoff)
            if a < 0:
                a = 0.0
            elif a > max_a:
                a = max_a
            data[y * gw + x] = int(a * 255)
    mask = Image.frombytes("L", (gw, gh), bytes(data)).resize((W, H), Image.BILINEAR)
    scrim = Image.new("RGBA", (W, H), FOREST + (0,))
    scrim.putalpha(mask)
    return scrim


# --------------------------------------------------------------- text ----
def tracked_width(font, text, tracking):
    if not text:
        return 0
    w = sum(font.getlength(c) for c in text)
    return w + tracking * (len(text) - 1)


def draw_tracked(draw, xy, text, font, fill, tracking, shadow=None, sdx=2, sdy=2):
    """Draw letterspaced text (PIL has no native tracking)."""
    x, y = xy
    for c in text:
        if shadow is not None:
            draw.text((x + sdx, y + sdy), c, font=font, fill=shadow)
        draw.text((x, y), c, font=font, fill=fill)
        x += font.getlength(c) + tracking


def wrap_lines(font, text, maxw):
    words = text.split()
    lines, cur = [], ""
    for w_ in words:
        trial = (cur + " " + w_).strip()
        if font.getlength(trial) <= maxw or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w_
    if cur:
        lines.append(cur)
    return lines


def fit_title(title):
    """Return (font, lines). Shrink 96->40 to fit <=2 lines within MAX_TEXT_W.

    Drops a leading 'The ' only if the full title cannot be made to fit.
    """
    candidates = [title]
    if title.lower().startswith("the "):
        candidates.append(title[4:])
    for text in candidates:
        for size in range(96, 39, -2):
            font = ImageFont.truetype(TITLE_FONT, size)
            lines = wrap_lines(font, text, MAX_TEXT_W)
            if len(lines) <= 2 and all(font.getlength(l) <= MAX_TEXT_W for l in lines):
                return font, lines
    # last resort: smallest size, hard wrap of the original
    font = ImageFont.truetype(TITLE_FONT, 40)
    return font, wrap_lines(font, title, MAX_TEXT_W)[:2]


# --------------------------------------------------------------- M mark ----
def paste_m_mark(canvas):
    if not os.path.exists(M_MARK):
        return
    m = Image.open(M_MARK).convert("RGBA")
    scale = 64 / m.height
    m = m.resize((max(1, round(m.width * scale)), 64), Image.LANCZOS)
    alpha = m.split()[3].point(lambda a: int(a * 0.70))
    m.putalpha(alpha)
    canvas.alpha_composite(m, (W - 48 - m.width, H - 48 - 64))


def save_under_limit(rgb, path):
    """Save PNG; if it exceeds 2MB, quantize to 256 colours (still looks clean)."""
    rgb.save(path, "PNG", optimize=True)
    if os.path.getsize(path) > MAX_BYTES:
        rgb.convert("RGB").quantize(colors=256, method=Image.FASTOCTREE).save(
            path, "PNG", optimize=True)
    return os.path.getsize(path)


# --------------------------------------------------------------- render ----
def load_spec(week):
    with open(os.path.join(SPEC_DIR, "week-%02d.json" % week)) as f:
        return json.load(f)


def song_by_role(spec, role):
    for s in spec.get("songs", []):
        if s.get("role") == role:
            return s
    return None


def render(week, role, verbose=True):
    spec = load_spec(week)
    song = song_by_role(spec, role)
    if not song:
        raise SystemExit("week %02d has no %r song" % (week, role))
    title = song["title"]

    hero_path, ranked = pick_hero(week, title)
    if not hero_path:
        raise SystemExit("week %02d: no usable hero image found" % week)

    canvas = cover_crop(Image.open(hero_path)).convert("RGBA")
    canvas.alpha_composite(build_scrim())
    draw = ImageDraw.Draw(canvas)

    # --- text block: kicker / gold rule / title, anchored bottom-left ---
    kfont = ImageFont.truetype(KICKER_FONT, 34)
    kicker = ("WEEK %d · %s" % (week, kicker_sound(spec))).upper()
    tracking = 2
    tfont, lines = fit_title(title)
    line_h = int(tfont.size * 1.05)

    k_h = kfont.size
    rule_h = 4
    gap1, gap2 = 18, 24
    title_h = line_h * len(lines)
    block_h = k_h + gap1 + rule_h + gap2 + title_h
    top = H - PAD - block_h
    x = PAD

    draw_tracked(draw, (x, top), kicker, kfont,
                 (232, 240, 234, 217), tracking, shadow=(6, 20, 12, 200), sdx=1, sdy=1)
    ry = top + k_h + gap1
    draw.rectangle([x, ry, x + 120, ry + rule_h], fill=GOLD)
    ty = ry + rule_h + gap2
    for line in lines:
        draw.text((x + 2, ty + 2), line, font=tfont, fill=SHADOW)
        draw.text((x, ty), line, font=tfont, fill=GOLD)
        ty += line_h

    paste_m_mark(canvas)

    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, "w%02d-%s.png" % (week, role))
    size = save_under_limit(canvas.convert("RGB"), out)
    if verbose:
        print("W%02d %-5s  hero=%-24s  title=%r  size=%.0fKB"
              % (week, role, os.path.basename(hero_path), title, size / 1024))
    return out, os.path.basename(hero_path)


# ------------------------------------------------------- contact sheet ----
def contact_sheet(paths, out):
    cw, ch = 636, 357  # 2x2 with a 4px gutter -> ~1280x720
    gutter = 4
    sheet = Image.new("RGB", (cw * 2 + gutter, ch * 2 + gutter), FOREST)
    for i, p in enumerate(paths):
        im = Image.open(p).convert("RGB").resize((cw, ch), Image.LANCZOS)
        px = (i % 2) * (cw + gutter)
        py = (i // 2) * (ch + gutter)
        sheet.paste(im, (px, py))
    sheet.save(out, "PNG", optimize=True)
    return out


SAMPLES = [(4, "word"), (22, "word"), (47, "sound"), (58, "word")]
ALL = [(w, r) for w in range(1, 59) for r in ("sound", "word")]


def main():
    ap = argparse.ArgumentParser(description="Curriculum YouTube thumbnails")
    ap.add_argument("--week", type=int)
    ap.add_argument("--role", choices=["sound", "word"])
    ap.add_argument("--samples", action="store_true")
    ap.add_argument("--all", action="store_true")
    args = ap.parse_args()

    if args.samples:
        outs = [render(w, r)[0] for w, r in SAMPLES]
        cs = os.path.join(OUT_DIR, "_contact_sheet_samples.png")
        contact_sheet(outs, cs)
        print("contact sheet ->", cs)
    elif args.all:
        for w, r in ALL:
            try:
                render(w, r)
            except SystemExit as e:
                print("SKIP W%02d %s: %s" % (w, r, e))
    elif args.week and args.role:
        render(args.week, args.role)
    else:
        ap.error("give --week N --role X, or --samples, or --all")


if __name__ == "__main__":
    main()
