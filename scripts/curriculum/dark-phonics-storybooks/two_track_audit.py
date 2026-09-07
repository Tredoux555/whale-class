#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TWO-TRACK AUDIT -- read-only. Changes nothing.

FIRST LANGUAGE  every printed sentence must still be the HEAD wording.
SECOND LANGUAGE every printed sentence must be NO MORE THAN FOUR WORDS, and
                the works / tracing / paperwork text must match the book 1:1.

    python3 two_track_audit.py                      # both tracks
    python3 two_track_audit.py --track second-language

Checks, per track:
  1  every reader page sentence, from the source data the generators use
  2  word count per sentence (nar + text; punctuation and the "..." ignored;
     "___" counts as a word) -- second language only
  3  every dp-<slug>.json sentence is present in that track's paperwork pack
  4  every works row is present in that track's work-2 sheet
"""
import glob
import io
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(REPO, 'scripts', 'curriculum', 'flashcards'))
sys.path.insert(0, os.path.join(REPO, 'scripts', 'curriculum', 'book-works'))
import four_word as fw                                          # noqa: E402

LETTERS = os.path.join(REPO, 'scripts', 'curriculum', 'satpin-paperwork', 'letters')
SENT_SPLIT = re.compile(r'(?<=[.!?])\s+')
DROP = re.compile(r'[.,!?;:"“”‘’…]')


def words(sentence):
    s = sentence.replace('…', ' ').replace('...', ' ')
    s = DROP.sub('', s)
    return [w for w in s.split() if w]


def sentences(line):
    return [s for s in SENT_SPLIT.split(line.strip()) if s.strip()]


def pdf_text(path):
    if not os.path.exists(path):
        return None
    return subprocess.run(['pdftotext', '-q', path, '-'],
                          capture_output=True).stdout.decode('utf-8', 'replace')


def squash(t):
    # the packs print reveal pages as "<lead-in>…" + "<word>." on two lines,
    # so the ellipsis (and the whitespace round it) is normalised away before
    # the sentence is looked for.
    t = (t or '').replace('…', ' ').replace('...', ' ')
    return re.sub(r'\s+', ' ', t)


def dp_cfgs(track):
    for path in sorted(glob.glob(os.path.join(LETTERS, 'dp-*.json'))):
        cfg = json.load(io.open(path, encoding='utf-8'))
        slug = cfg.get('bookSlug') or cfg.get('slug')
        if slug in fw.SKIP_SLUGS:
            continue
        # the pack's folder is the json stem minus 'dp-', which is how
        # build_paperwork.py is invoked (fox-in-a-box and its Easy Reader
        # share a bookSlug but ship to two different folders).
        stem = os.path.basename(path)[3:-5]
        yield path, stem, (fw.sync_dp_cfg(cfg) if fw.is_second(track) else cfg)


def audit(track):
    print('\n===== %s =====' % track.upper())
    second = fw.is_second(track)
    mat = fw.out_root('materials', track)
    works = fw.out_root('works', track)

    # ---- 1/2 sentence lengths -------------------------------------------
    rows, over = 0, []
    for path, slug, cfg in dp_cfgs(track):
        for p in cfg.get('pages') or []:
            for s in sentences(p.get('sentence') or ''):
                rows += 1
                if second and len(words(s)) > 4:
                    over.append((slug, s, len(words(s))))
    print('  sentences walked: %d' % rows)
    if second:
        print('  OVER FOUR WORDS: %d' % len(over))
        for slug, s, n in over:
            print('     %-24s %2d  %s' % (slug, n, s))

    # ---- 3 dp sentence -> paperwork pack ---------------------------------
    miss, checked = [], 0
    for path, slug, cfg in dp_cfgs(track):
        pack = os.path.join(mat, slug, 'paperwork-pack.pdf')
        raw = pdf_text(pack)
        if raw is None:
            continue                 # no pack built for that book yet
        t = squash(raw)
        checked += 1
        for p in cfg.get('pages') or []:
            s = squash(p.get('sentence') or '')
            if s and s not in t:
                miss.append((slug, p.get('sentence')))
    print('  paperwork packs checked: %d   sentence mismatches: %d' % (checked, len(miss)))
    for slug, s in miss[:20]:
        print('     %-24s %s' % (slug, s))

    # ---- 4 works rows -> work-2 sheet ------------------------------------
    sys.argv = ['two_track_audit.py'] + (['--track', 'second-language'] if second else [])
    import importlib
    import build_book_works as bw
    importlib.reload(bw)
    wmiss, wchecked = [], 0
    for slug in sorted(os.listdir(works)) if os.path.isdir(works) else []:
        sheet = os.path.join(works, slug, '%s-work2-sentence-picture-match.pdf' % slug)
        raw = pdf_text(sheet)
        if raw is None:
            continue
        t = squash(raw)
        res = bw.load_book(slug)
        if res is None:
            continue
        wchecked += 1
        for r in res[1]:
            s = squash(r.get('text') if isinstance(r, dict) else '')
            if s and s not in t:
                wmiss.append((slug, s))
    print('  work-2 sheets checked: %d   row mismatches: %d' % (wchecked, len(wmiss)))
    for slug, s in wmiss[:20]:
        print('     %-24s %s' % (slug, s))
    return len(over), len(miss), len(wmiss)


def main():
    tracks = [fw.track()] if ('--track' in sys.argv or '--second-language' in sys.argv
                              or os.environ.get('DP_TRACK')) else [fw.FIRST, fw.SECOND]
    bad = 0
    for t in tracks:
        o, m, w = audit(t)
        bad += o + m + w
    print('\nTOTAL PROBLEMS: %d' % bad)
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
