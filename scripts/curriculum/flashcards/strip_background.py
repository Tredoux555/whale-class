#!/usr/bin/env python3
"""
strip_background.py — convert the flat white MJ background on Dark Phonics
book art into true alpha transparency, so build_booklets.py's existing
`drawImage(..., mask='auto')` calls composite the character straight onto
the page with no printed white box around it.

Approach: flood-fill from the image border inward across near-white pixels,
so only the background (which touches the canvas edge) becomes transparent.
White interior details — eye highlights, teeth, crosshatch highlights — are
left alone because they aren't connected to the border. Edges get a light
feather so there's no hard/jagged cutout line.

Usage:
    python3 strip_background.py <slug>
        Processes every PNG in phonics-images/dark-phonics-books/<slug>/,
        moving the untouched originals to phonics-images/dark-phonics-books/<slug>/_raw/
        and writing the transparent versions back to the original filenames.

    python3 strip_background.py <input.png> <output.png>
        Single-file mode, for testing.
"""
import sys, os, shutil
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

WHITE_FLOODFILL_THRESH = 18   # tolerance for the floodfill's own color match
FEATHER_PX = 1.2              # gaussian blur radius applied to the alpha mask

def strip_background(im: Image.Image) -> Image.Image:
    im = im.convert('RGB')
    w, h = im.size
    marker = (255, 0, 255)  # magenta sentinel, unlikely to occur in the art
    work = im.copy()

    seeds = set()
    step_x = max(1, w // 60)
    step_y = max(1, h // 60)
    for x in range(0, w, step_x):
        seeds.add((x, 0)); seeds.add((x, h - 1))
    for y in range(0, h, step_y):
        seeds.add((0, y)); seeds.add((w - 1, y))
    seeds.add((w - 1, h - 1))

    for pt in seeds:
        px = work.getpixel(pt)
        if px != marker and min(px[:3]) >= 245:
            ImageDraw.floodfill(work, pt, marker, thresh=WHITE_FLOODFILL_THRESH)

    arr_work = np.array(work)
    is_bg = np.all(arr_work == np.array(marker), axis=-1)
    alpha = np.where(is_bg, 0, 255).astype(np.uint8)
    alpha_img = Image.fromarray(alpha, mode='L').filter(ImageFilter.GaussianBlur(FEATHER_PX))

    arr_orig = np.array(im).astype(np.uint8)
    out = np.dstack([arr_orig, np.array(alpha_img)])
    return Image.fromarray(out, 'RGBA')

def process_file(src, dst):
    im = Image.open(src)
    out = strip_background(im)
    out.save(dst)
    bg_pct = 100.0 * (np.array(out)[..., 3] == 0).sum() / (out.size[0] * out.size[1])
    print(f"{src} -> {dst}  ({bg_pct:.1f}% made transparent)")

def process_slug(slug):
    base = os.path.join('phonics-images', 'dark-phonics-books', slug)
    if not os.path.isdir(base):
        print(f"no such art folder: {base}"); sys.exit(1)
    raw_dir = os.path.join(base, '_raw')
    os.makedirs(raw_dir, exist_ok=True)
    for fn in sorted(os.listdir(base)):
        if not fn.lower().endswith('.png'):
            continue
        src = os.path.join(base, fn)
        raw_copy = os.path.join(raw_dir, fn)
        if not os.path.exists(raw_copy):
            shutil.copy2(src, raw_copy)
        process_file(raw_copy, src)

if __name__ == '__main__':
    if len(sys.argv) == 2:
        process_slug(sys.argv[1])
    elif len(sys.argv) == 3:
        process_file(sys.argv[1], sys.argv[2])
    else:
        print(__doc__); sys.exit(1)
