#!/usr/bin/env python3
"""One-off driver: build a single book from books_def.BOOKS via build_booklets.
Usage: python3 _build_one.py <slug>
"""
import os, sys, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
FONTS = os.path.join(HERE, 'canvas-fonts')
if os.path.exists(os.path.join(FONTS, 'YoungSerif-Regular.ttf')):
    os.environ['MONTREE_CANVAS_FONTS'] = FONTS

sys.path.insert(0, HERE)
import build_booklets as bb   # noqa: E402
from books_def import BOOKS   # noqa: E402

slug = sys.argv[1]
book = next((b for b in BOOKS if b['slug'] == slug), None)
if book is None:
    raise SystemExit(f'no book with slug={slug!r} in BOOKS')

OUT = os.path.join(REPO, 'public', 'dark-phonics-books', 'print')
COVERS = os.path.join(REPO, 'public', 'dark-phonics-books', 'covers')
os.makedirs(OUT, exist_ok=True)
os.makedirs(COVERS, exist_ok=True)

# sanity-check every art path referenced in this book exists before spending
# time rendering
missing = []
if not os.path.exists(book['cover']):
    missing.append(book['cover'])
for sp in book['spreads']:
    if sp.get('art') and not os.path.exists(sp['art']):
        missing.append(sp['art'])
if missing:
    raise SystemExit('missing art:\n  ' + '\n  '.join(missing))

bb.build(book, OUT)
shutil.copyfile(book['cover'], os.path.join(COVERS, slug + '.png'))
print('built', slug, '->', OUT)
print('cover ->', os.path.join(COVERS, slug + '.png'))
