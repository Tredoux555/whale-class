#!/usr/bin/env python3
"""Path-remapping wrapper to rebuild a sat-cast book's tracing workbook
(mode='word', celebrate=False) against the mounted repo copy, same
technique as _patched_build.py.

Usage: MONTREE_REPO_ROOT=... python3 _patched_trace.py <slug> [<slug2> ...]
"""
import os, sys, shutil, builtins

MAC_PREFIX = '/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree'
REPO_ROOT = os.environ['MONTREE_REPO_ROOT']

def remap(path):
    if isinstance(path, str) and path.startswith(MAC_PREFIX):
        return REPO_ROOT + path[len(MAC_PREFIX):]
    return path

_real_exists = os.path.exists
os.path.exists = lambda p: _real_exists(remap(p))
_real_open = builtins.open
def _open(file, *args, **kwargs):
    if isinstance(file, str):
        file = remap(file)
    return _real_open(file, *args, **kwargs)
builtins.open = _open
_real_stat = os.stat
os.stat = lambda p, *a, **k: _real_stat(remap(p) if isinstance(p, str) else p, *a, **k)

FLASHCARDS_DIR = os.environ['MONTREE_FLASHCARDS_DIR']
sys.path.insert(0, FLASHCARDS_DIR)

FONTS = os.path.join(FLASHCARDS_DIR, 'canvas-fonts')
if os.path.exists(os.path.join(FONTS, 'YoungSerif-Regular.ttf')):
    os.environ['MONTREE_CANVAS_FONTS'] = FONTS

from books_def import BOOKS
import build_tracing_booklet as tb

sys.path.insert(0, os.path.join(REPO_ROOT, 'scripts', 'curriculum',
                                'dark-phonics-storybooks'))
import four_word as fw        # noqa: E402

# --- TRACK: default first-language; --track second-language writes into
# public/dark-phonics-materials/second-language/<slug>/.
TRACK = fw.track()
MATERIALS_ROOT = fw.out_root('materials', TRACK, REPO_ROOT)
if fw.is_second(TRACK):
    print('[track] second-language -> %s' % MATERIALS_ROOT)

for slug in [s for s in fw.strip_track_args(sys.argv[1:])
             if not s.startswith('-')]:
    book = next((b for b in BOOKS if b['slug'] == slug), None)
    if book is None:
        print('SKIP: no book', slug)
        continue
    if fw.is_second(TRACK):
        book = fw.transform_book(book)
    dest_dir = os.path.join(MATERIALS_ROOT, slug)
    os.makedirs(dest_dir, exist_ok=True)
    reading_path, print_path = tb.build_trace_booklet(book, dest_dir, mode='word', celebrate=False)
    dest = os.path.join(dest_dir, 'tracing-workbook.pdf')
    shutil.move(print_path, dest)
    try:
        os.remove(reading_path)
    except PermissionError:
        stray_dir = os.path.join(REPO_ROOT, '_to_delete', 'tracing-proofs')
        os.makedirs(stray_dir, exist_ok=True)
        shutil.move(reading_path, os.path.join(stray_dir, os.path.basename(reading_path)))
    print('built', slug, '->', dest)
