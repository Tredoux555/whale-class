# -*- coding: utf-8 -*-
"""ONE-OFF: re-derive every child-facing sentence in
lib/montree/dark-phonics/book-works-lessons.ts from the reader that governs it
(FOUR-WORD RULE, 2026-09-07).

No generator for that file is committed in the repo, and its own header says
REGENERATE rather than hand-edit. This does the next best thing and the same
thing its generator does for text: every `sentence:` that sits on a line with
a page image, plus `endingLine`, is rewritten to the reader page's own printed
line (nar + text, ellipsis and all), matched by slug + page number -- exactly
the source-of-truth order that file's header records (SPLITS for the-fast/
-lost/-jump, books_def for the sat-cast books, dp json where nothing else has
the book). Nothing else in the file is touched.

Run: python3 _four_word_sync_lessons.py [--dry]
"""
import ast, io, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(REPO, 'scripts', 'curriculum', 'flashcards'))
from books_def import BOOKS                                        # noqa: E402

TS = os.path.join(REPO, 'lib', 'montree', 'dark-phonics', 'book-works-lessons.ts')
LETTERS = os.path.join(REPO, 'scripts', 'curriculum', 'satpin-paperwork', 'letters')
SKIP = {'the-vest', 'the-swim', 'the-yam', 'the-zip', 'the-quilt'}
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
    for b in BOOKS:
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
        slug = cfg.get('bookSlug')
        if not slug or slug in SKIP or slug in look:
            continue
        look[slug] = {pnum(p['art']): p['sentence'] for p in cfg.get('pages') or []}
    return look


IMG = re.compile(r'\$\{P\}/([a-z0-9-]+)/([a-z0-9-]+)\.(?:png|jpg|jpeg)')
SENT = re.compile(r"(sentence: ')((?:[^'\\]|\\.)*)(')")
ENDL = re.compile(r"(endingLine: ')((?:[^'\\]|\\.)*)(')")


def main():
    dry = '--dry' in sys.argv
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
    if not dry:
        io.open(TS, 'w', encoding='utf-8').write(''.join(out))
    for c in changed:
        print('  %-32s %r -> %r' % ('%s p%s' % c[0], c[1], c[2]))
    print('%d sentences rewritten, %d unresolved%s'
          % (len(changed), len(unresolved), ' (dry run)' if dry else ''))
    for u in unresolved[:20]:
        print('   UNRESOLVED', u)


if __name__ == '__main__':
    main()
