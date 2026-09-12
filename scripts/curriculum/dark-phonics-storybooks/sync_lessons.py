# -*- coding: utf-8 -*-
"""Digital lesson data, per track.

lib/montree/dark-phonics/book-works-lessons.ts is the FIRST LANGUAGE and is
left exactly as it is. With --track second-language this writes a sibling

    lib/montree/dark-phonics/book-works-lessons.second-language.ts

whose every child-facing sentence is re-derived from the SECOND-LANGUAGE
reader page that governs it (matched by slug + page number, in the
source-of-truth order that file's own header records: SPLITS for the-fast/
-lost/-jump, books_def for the sat-cast books, dp json where nothing else has
the book). Nothing else in the file is touched.

NOT WIRED INTO THE UI -- the digital side of the two tracks is undecided.

    python3 sync_lessons.py --track second-language
    python3 sync_lessons.py                       # first language: dry report
"""
import ast, io, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(REPO, 'scripts', 'curriculum', 'flashcards'))
import four_word as fw                                            # noqa: E402
from books_def import BOOKS                                       # noqa: E402

TRACK = fw.track()
SECOND = fw.is_second(TRACK)
TS = os.path.join(REPO, 'lib', 'montree', 'dark-phonics', 'book-works-lessons.ts')
OUT = (TS[:-3] + '.second-language.ts') if SECOND else TS
LETTERS = os.path.join(REPO, 'scripts', 'curriculum', 'satpin-paperwork', 'letters')
SKIP = set(fw.SKIP_SLUGS)
PAGENUM = re.compile(r'p(\d+)', re.I)



def pnum(s):
    m = PAGENUM.search(os.path.basename(s or ''))
    return int(m.group(1)) if m else None


def line_of(t):
    if isinstance(t, (tuple, list)) and t and isinstance(t[0], str):
        return t[0]
    return t if isinstance(t, str) else ''


def joined(nar, text):
    parts = [line_of(x) for x in text] if isinstance(text, list) else [line_of(text)]
    return re.sub(r'\s+', ' ', ' '.join([(nar or '')] + parts)).strip()


def build_lookup():
    tree = ast.parse(io.open(os.path.join(HERE, 'build_a5_readers.py'), encoding='utf-8').read())
    SPLITS = {n.targets[0].id: ast.literal_eval(n.value) for n in tree.body
              if isinstance(n, ast.Assign) and isinstance(n.targets[0], ast.Name)
              and n.targets[0].id == 'SPLITS'}['SPLITS']
    if SECOND:
        SPLITS = {slug: [(fw._transform_text_field(sp[0])[0],
                          fw._transform_text_field(sp[1])[0]) for sp in pages]
                  for slug, pages in SPLITS.items()}
    MF = {b['slug']: b for b in json.load(io.open(
        os.path.join(HERE, 'manifest.json'), encoding='utf-8'))['books']}
    look = {}
    # (a) pattern storybooks -- SPLITS wins (see the TS header)
    for slug, pages in SPLITS.items():
        d = {}
        for pg, sp in zip(MF[slug]['pages'], pages):
            s = joined(sp[0], sp[1])
            if s:
                d[pnum(pg['key'])] = s
        look[slug] = d
    # (b) sat-cast letter books
    for b in ([fw.transform_book(x) for x in BOOKS] if SECOND else BOOKS):
        if b['slug'] in SKIP or b['slug'] in look:
            continue
        d = {}
        for sp in b.get('spreads') or []:
            s = joined(sp.get('nar'), sp.get('text'))
            if s and sp.get('art'):
                d[pnum(sp['art'])] = s
        if d:
            look[b['slug']] = d
    # (c) books only the dp json has (the-cat-sat and friends)
    for path in sorted(os.listdir(LETTERS)):
        if not path.startswith('dp-') or not path.endswith('.json'):
            continue
        cfg = json.load(io.open(os.path.join(LETTERS, path), encoding='utf-8'))
        if SECOND:
            cfg = fw.sync_dp_cfg(cfg)
        slug = cfg.get('bookSlug')
        if not slug or slug in SKIP or slug in look:
            continue
        look[slug] = {pnum(p['art']): p['sentence'] for p in cfg.get('pages') or []}
    return look


# WORK CARDS TAKE THE RESOLVED SENTENCE, NOT THE BOOK'S CLIFFHANGER.
# A cast[] entry (and the rounds[] entry that mirrors it) is a WORK card: it
# must read as a finished sentence about that character. Almost every book's
# last page already is one, so keying cast[] off the reader page works -- but
# the-pit ends on the unresolved cliffhanger "And the...?!" over p9-potato,
# and lifting that into the potato work card leaves the child matching a
# question mark to a picture. The print source
# scripts/curriculum/satpin-paperwork/letters/dp-the-pit.json carries the
# resolved line ("The potato sat in the pit!"), so that -- in this file's
# house style, with the ... before the final word -- is what the card gets.
# pages[] and endingLine KEEP the cliffhanger: it is the book's real last line.
# Keyed (slug, page number); one entry per track because the second-language
# wording comes from that track's reader, not from a rule.
CARD_OVERRIDE = {
    ('the-pit', 9): ('The potato sat in the\u2026 pit!', 'Potato in the\u2026 pit!'),
}
CAST_LINE = re.compile(r"\{ id: '")

IMG = re.compile(r'\$\{P\}/([a-z0-9-]+)/([a-z0-9-]+)\.(?:png|jpg|jpeg)')
SENT = re.compile(r"(sentence: ')((?:[^'\\]|\\.)*)(')")
ENDL = re.compile(r"(endingLine: ')((?:[^'\\]|\\.)*)(')")


def main():
    dry = '--dry' in sys.argv
    print('[track] %s -> %s' % (TRACK, os.path.relpath(OUT, REPO)))
    look = build_lookup()
    out, changed, unresolved = [], [], []
    last_ending_img = None
    for raw in io.open(TS, encoding='utf-8'):
        m = IMG.search(raw)
        if 'endingImage:' in raw and m:
            last_ending_img = (m.group(1), pnum(m.group(2)))
        pat, key = None, None
        if m and SENT.search(raw):
            pat, key = SENT, (m.group(1), pnum(m.group(2)))
        elif ENDL.search(raw) and last_ending_img:
            pat, key = ENDL, last_ending_img
        if pat and key:
            want = look.get(key[0], {}).get(key[1])
            if CAST_LINE.search(raw) and key in CARD_OVERRIDE:
                want = CARD_OVERRIDE[key][1 if SECOND else 0]
            if want is None:
                unresolved.append((key, raw.strip()[:70]))
            else:
                def rep(mm, want=want):
                    if mm.group(2).replace("\\'", "'") == want:
                        return mm.group(0)
                    changed.append((key, mm.group(2), want))
                    return mm.group(1) + want.replace("'", "\\'") + mm.group(3)
                raw = pat.sub(rep, raw, count=1)
        out.append(raw)
    # rounds[] carry a sentence with no image of their own -- they quote the
    # cast member named by answerId, so mirror that cast entry's sentence.
    CAST = re.compile(r"\{ id: '([^']+)', label: '(?:[^'\\]|\\.)*', sentence: '((?:[^'\\]|\\.)*)'")
    ROUND = re.compile(r"(\{ sentence: ')((?:[^'\\]|\\.)*)(', answerId: ')([^']+)(')")
    cast = {}
    out2 = []
    for raw in out:
        if 'lessonNumber:' in raw:
            cast = {}
        for m in CAST.finditer(raw):
            cast[m.group(1)] = m.group(2)
        def rep2(mm):
            want = cast.get(mm.group(4))
            if want is None or want == mm.group(2):
                return mm.group(0)
            changed.append((('round', mm.group(4)), mm.group(2), want))
            return mm.group(1) + want + mm.group(3) + mm.group(4) + mm.group(5)
        out2.append(ROUND.sub(rep2, raw))
    out = out2
    if not dry and (SECOND or '--write' in sys.argv):
        io.open(OUT, 'w', encoding='utf-8').write(''.join(out))
        print('wrote', os.path.relpath(OUT, REPO))
    elif not SECOND:
        print('[first language] dry report only -- pass --write to rewrite %s'
              % os.path.relpath(TS, REPO))
    for c in changed:
        print('  %-32s %r -> %r' % ('%s p%s' % c[0], c[1], c[2]))
    print('%d sentences rewritten, %d unresolved%s'
          % (len(changed), len(unresolved), ' (dry run)' if dry else ''))
    for u in unresolved[:20]:
        print('   UNRESOLVED', u)


if __name__ == '__main__':
    main()
