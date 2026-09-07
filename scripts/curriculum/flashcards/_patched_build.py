#!/usr/bin/env python3
"""Path-remapping wrapper around _build_one.py's logic.

books_def.py hardcodes absolute macOS paths (e.g. MAT5, TALL, ...) that only
resolve on Tredoux's actual Mac. When this script runs against the mounted
copy of the repo (e.g. via the device bridge / a Linux sandbox), those
absolute paths don't exist on disk even though the mounted repo does.

This wrapper monkeypatches os.path.exists / builtins.open / os.stat so any
path starting with the macOS prefix is transparently redirected to the
mounted repo root instead. It does NOT change books_def.py itself -- the
source of truth still uses real Mac paths, as it must for when the pipeline
runs directly on the Mac.

Usage: python3 _patched_build.py <slug> [<slug2> ...]
"""
import os, sys, shutil, builtins

MAC_PREFIX = '/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree'
HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.environ['MONTREE_REPO_ROOT']

def remap(path):
    if isinstance(path, str) and path.startswith(MAC_PREFIX):
        return REPO_ROOT + path[len(MAC_PREFIX):]
    return path

_real_exists = os.path.exists
def _exists(path):
    return _real_exists(remap(path))
os.path.exists = _exists

_real_open = builtins.open
def _open(file, *args, **kwargs):
    if isinstance(file, str):
        file = remap(file)
    return _real_open(file, *args, **kwargs)
builtins.open = _open

_real_stat = os.stat
def _stat(path, *args, **kwargs):
    if isinstance(path, str):
        path = remap(path)
    return _real_stat(path, *args, **kwargs)
os.stat = _stat

FLASHCARDS_DIR = os.environ['MONTREE_FLASHCARDS_DIR']
sys.path.insert(0, FLASHCARDS_DIR)

FONTS = os.path.join(FLASHCARDS_DIR, 'canvas-fonts')
if os.path.exists(os.path.join(FONTS, 'YoungSerif-Regular.ttf')):
    os.environ['MONTREE_CANVAS_FONTS'] = FONTS

import build_booklets as bb   # noqa: E402
from books_def import BOOKS   # noqa: E402

sys.path.insert(0, os.path.join(REPO_ROOT, 'scripts', 'curriculum',
                                'dark-phonics-storybooks'))
import four_word as fw        # noqa: E402

# --- TRACK: default first-language (the paths the live site links);
# --track second-language writes the four-word cut into
# public/dark-phonics-books/second-language/{print,covers}/.
TRACK = fw.track()
OUT = fw.out_root('print', TRACK, REPO_ROOT)
COVERS = fw.out_root('covers', TRACK, REPO_ROOT)
os.makedirs(OUT, exist_ok=True)
os.makedirs(COVERS, exist_ok=True)
if fw.is_second(TRACK):
    print('[track] second-language -> %s' % OUT)

slugs = [s for s in fw.strip_track_args(sys.argv[1:]) if not s.startswith('-')]
for slug in slugs:
    book = next((b for b in BOOKS if b['slug'] == slug), None)
    if book is None:
        print(f'SKIP: no book with slug={slug!r} in BOOKS')
        continue
    missing = []
    if not os.path.exists(book['cover']):
        missing.append(book['cover'])
    for sp in book['spreads']:
        if sp.get('art') and not os.path.exists(sp['art']):
            missing.append(sp['art'])
    if missing:
        print('missing art for', slug, ':\n  ' + '\n  '.join(missing))
        continue
    if fw.is_second(TRACK):
        book = fw.transform_book(book)
    bb.build(book, OUT)
    shutil.copyfile(remap(book['cover']), os.path.join(COVERS, slug + '.png'))
    print('built', slug, '->', OUT)
