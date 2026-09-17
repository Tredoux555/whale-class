#!/usr/bin/env python3
"""Print and the digital shelf must trace the SAME word on the same page.

2026-09-17, per Tredoux. lib/montree/dark-phonics/v2-shelf/tracing-book.ts owns
the rule (targetWord(): the page's shout, last token, lower case, letters only;
a trails-off page traces nothing; the potato is never a target, so a potato page
takes the book's own word when that word is printed on it and otherwise traces
nothing). scripts/curriculum/flashcards/build_tracing_booklet.py's
page_trace_word() is its port.

This check runs the PYTHON side over every second-language book and compares its
per-page word list to a JSON dump of the TYPESCRIPT side (produced by the vitest
dump this script's --digital argument points at). It compares the sequence of
WORDS ACTUALLY TRACED -- print keeps a page for a spread that traces nothing
(the booklet mirrors the reader's pagination page for page and the page still
faces its art, so it carries an empty guide row instead), while the digital shelf
simply has no trace page there. Both therefore agree about every word a child is
asked to write, which is the thing that must not drift.

    python3 scripts/curriculum/book-works/check_tracing_conformance.py \
        --digital /tmp/digital-trace-words.json --track second-language
"""
import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'scripts', 'curriculum', 'flashcards'))
sys.path.insert(0, os.path.join(ROOT, 'scripts', 'curriculum', 'dark-phonics-storybooks'))

import build_tracing_booklet as tb          # noqa: E402
import build_a5_readers as readers          # noqa: E402
import four_word as fw                      # noqa: E402


def book_for(slug, entries):
    """The book dict for a slug, from whichever family owns it.

    The 21 shelf lessons span BOTH printed families: the picture-word
    storybooks (snake-in-my-sock, ant-on-my-apple) come from
    dark-phonics-storybooks/manifest.json via build_a5_readers.make_book(), and
    the sat-cast letter books (the-sat ... the-jump) are authored directly in
    flashcards/books_def.py. Both produce the same `spreads` shape, which is
    the only thing the rule reads.
    """
    entry = next((e for e in entries if e['slug'] == slug), None)
    if entry is not None:
        return readers.make_book(entry)
    book = next((b for b in tb.BOOKS if b['slug'] == slug), None)
    if book is not None:
        return book
    # …and the Easy Readers (the-cat-sat) are loaded from their own manifest.
    if slug in tb.easy_reader_slugs():
        return tb.load_reader_book(slug)
    return None


def print_words(book):
    """Every word the printed workbook asks a child to trace, in page order."""
    own = tb.book_own_word(book)
    words = []
    for sp in book['spreads']:
        if tb.bb.is_wordless_spread(sp):
            continue
        w = tb.page_trace_word(book, sp, own=own)
        if w:
            words.append(w)
    return words


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--digital', required=True,
                    help='JSON {slug: [word, ...]} dumped from tracing-book.ts')
    ap.add_argument('--track', default='second-language')
    a = ap.parse_args()

    fw.track(['--track', a.track])
    with open(os.path.join(ROOT, 'scripts', 'curriculum',
                           'dark-phonics-storybooks', 'manifest.json')) as fh:
        entries = [e for e in json.load(fh)['books'] if not e.get('retired')]

    with open(a.digital) as fh:
        digital = json.load(fh)

    bad = 0
    for slug, want in digital.items():
        book = book_for(slug, entries)
        if book is None:
            print('MISS  %-20s (no printed book for this slug)' % slug)
            bad += 1
            continue
        words = print_words(book)
        ok = words == want
        if not ok:
            bad += 1
        print('%-5s %-20s %s' % ('OK' if ok else 'DIFF', slug, ' '.join(words)))
        if not ok:
            print('      digital: %s' % ' '.join(want))
    print('\n%d book(s) differ' % bad)
    return 1 if bad else 0


if __name__ == '__main__':
    raise SystemExit(main())
