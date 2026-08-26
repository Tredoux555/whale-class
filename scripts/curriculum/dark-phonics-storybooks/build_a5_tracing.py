# -*- coding: utf-8 -*-
"""Dark Phonics pattern-book tracing booklets.

Per Tredoux 2026-08-21, after the first (too-different) draft: "why not
follow this exact same build? ... you can literally duplicate the build
and just supplement the content for the tracing work and keep the exact
same media otherwise."

So that's what this does — no bespoke layout. It wires the exact same A5
reader construction the real books use (build_a5_readers.make_book() for
the book dict; build_tracing_booklet.py's proven --sentences pipeline,
already shipping for the 16 sat-cast letter books) together for the
non-sat-cast pattern books (ant-on-my-apple first). Cover art, half-title,
scene art, back cover, saddle-stitch A5 imposition — all identical to the
real -A5-booklet-print.pdf. Only the per-spread text page changes, from
solid printed type to a traced guide.

Output goes straight to public/dark-phonics-materials/<slug>/tracing-workbook.pdf
— the same filename the Printables "Tracing workbook" pill already points
at, so no other site change is needed.

    python3 build_a5_tracing.py ant-on-my-apple
    python3 build_a5_tracing.py --all
"""
import argparse
import json
import os
import shutil
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
FLASHCARDS = os.path.join(REPO, 'scripts', 'curriculum', 'flashcards')

sys.path.insert(0, HERE)
sys.path.insert(0, FLASHCARDS)
import build_a5_readers as readers   # noqa: E402  make_book(), MANIFEST
import build_tracing_booklet as tb   # noqa: E402  build_trace_booklet()

# The real book's own cover/back-cover copy (colour band, "pattern reader"
# strapline) instead of build_tracing_booklet's plain house defaults --
# "keep the exact same media" -- monkeypatched the same way
# build_a5_readers.py itself monkeypatches dpbuild.page_cover/page_back.
tb.page_back = readers.page_back


def page_trace_cover(c, book):
    """Real cover art + colour band (readers.page_cover), plus
    build_tracing_booklet's own TRACE badge and 'written by ___' line."""
    readers.page_cover(c, book)
    tb.right_tracked(c, tb.PW - tb.M, tb.PH - 7 * tb.mm, 'TRACE THE STORY',
                     'LabelB', 7.5, 0.18, tb.RED)
    tb._written_by_line(c)


tb.page_trace_cover_sentences = page_trace_cover
# word mode (below) uses tb.page_trace_cover, not tb.page_trace_cover_sentences
# -- override that one too, or word-mode books lose the real cover art/band
# and fall back to build_tracing_booklet.py's plain house cover.
tb.page_trace_cover = page_trace_cover


def make_tracing_book(entry):
    book = readers.make_book(entry)
    # build_trace_booklet's final "celebration" page always traces one hero
    # word (book['new']); the reader book dict never sets that (it's a
    # sat-cast-only field) so give it the cover's own accent word (e.g.
    # "Ant on My Apple" -> "ant") as a default -- UNIFORM_TARGET overrides
    # this per book in build_one() below where it applies.
    book['new'] = book['title_accent']
    return book


# Per Tredoux 2026-08-24: books already rebuilt to the "lead-in + fixed
# bold word" pattern in build_a5_readers.py (mirroring the-spat -- e.g.
# "An ant... on my apple!") trace that one fixed word/phrase on every
# spread (mode='word'), with no "I can write ___!" celebration page on the
# last spread (celebrate=False -- "not necessary", per Tredoux). Books not
# yet converted to that pattern keep the original --sentences behaviour
# (whole merged sentence per spread) untouched. Grow this dict as more
# books get converted; each entry's value is the exact fixed bold phrase
# from that book's own SPLITS (lowercase, matching how it prints).
#
# SUPERSEDED 2026-08-26 (Tredoux, third call): hero-word tracing is now the
# DEFAULT for the whole picture-word series, derived by hero_word() below
# instead of hand-kept here, so a new book gets the right treatment the day it
# is authored and the two can never drift. UNIFORM_TARGET remains only as an
# explicit per-book override and is empty by design -- do not re-populate it
# just to restate what hero_word() already works out.
UNIFORM_TARGET = {}

# Trailing punctuation and case are presentation, not identity: the-jump prints
# "Jump." on its opening spread and "jump." after, snake-in-my-sock closes on
# "sock?" instead of "sock.", dinosaur-on-a-drum on "drum?!". Those are all one
# hero word. Compare normalised, then trace the book's most common LITERAL
# form, so the traced word matches what the reader actually prints.
_STRIP = '.?!…'


def _norm(word):
    return word.lower().rstrip(_STRIP)


def hero_word(slug):
    """The one reveal word this book repeats, exactly as the reader prints it,
    or None when the reveal word genuinely changes from spread to spread
    (oh-no-goat: grapes/gloves/gift/guitar; oh-no-lion: lemon/leaf/ladder/
    lizard) -- those keep whole-sentence tracing.

    Only genuine narrative reveal spreads count: a spread needs BOTH a lead-in
    (`nar`) and a single-string `text`, and must not carry its own style
    ('drop' chants and multi-line recap lists are not reveal words). That
    excludes the no-nar intro page ("An apple.") and the celebration finale."""
    words = []
    for split in readers.SPLITS[slug]:
        nar, text = split[0], split[1]
        style = split[3] if len(split) > 3 else 'normal'
        if style != 'normal' or not nar or text is None or isinstance(text, list):
            continue
        words.append(text)
    if not words or len({_norm(w) for w in words}) != 1:
        return None
    return Counter(words).most_common(1)[0][0]


def build_one(entry, materials_root):
    book = make_tracing_book(entry)
    dest_dir = os.path.join(materials_root, book['slug'])
    os.makedirs(dest_dir, exist_ok=True)
    if book['slug'] in UNIFORM_TARGET:
        target = UNIFORM_TARGET[book['slug']]
    else:
        target = hero_word(book['slug'])
    if target:
        book['new'] = target
        reading_path, print_path = tb.build_trace_booklet(
            book, dest_dir, mode='word', celebrate=False)
    else:
        # build_trace_booklet writes both a portrait reading-order proof and
        # the real 2-up saddle-stitch print file straight into dest_dir; only
        # the print file is a Printables deliverable, so the proof gets
        # deleted once we've renamed the print file into place.
        reading_path, print_path = tb.build_trace_booklet(book, dest_dir,
                                                           mode='sentence')
    dest = os.path.join(dest_dir, 'tracing-workbook.pdf')
    shutil.move(print_path, dest)
    os.remove(reading_path)
    print(book['slug'], '->', dest)
    return dest


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('slugs', nargs='*')
    ap.add_argument('--all', action='store_true')
    ap.add_argument('--materials-out',
                    default=os.path.join(REPO, 'public', 'dark-phonics-materials'))
    a = ap.parse_args()

    with open(readers.MANIFEST, encoding='utf-8') as fh:
        entries = json.load(fh)['books']
    entries = [e for e in entries if not e.get('retired')]

    if a.all:
        targets = entries
    elif a.slugs:
        wanted = set(a.slugs)
        targets = [e for e in entries if e['slug'] in wanted]
        missing = wanted - {e['slug'] for e in targets}
        if missing:
            raise SystemExit('unknown slug(s): ' + ', '.join(sorted(missing)))
    else:
        raise SystemExit('pass one or more slugs, or --all')

    for entry in targets:
        build_one(entry, a.materials_out)

    if tb.sf.MISSING:
        print('WARNING unmapped characters:', sorted(tb.sf.MISSING))


if __name__ == '__main__':
    main()
