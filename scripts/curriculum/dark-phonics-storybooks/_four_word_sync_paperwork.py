# -*- coding: utf-8 -*-
"""ONE-OFF: make every dp-<slug>.json / shims/dp-<slug>.py sentence a VERBATIM
COPY of its reader page (FOUR-WORD RULE, 2026-09-07, rule 7).

The dp paperwork files are copies, never a separate rewrite. This walks each
dp json, resolves its governing reader source by art file, and writes the
reader's own clean sentence (nar + text, ellipsis stripped, one terminal mark
-- build_book_works.clean_sentence, the same function the works use) into
pages[].sentence, plus the reader's title into bookTitle. The matching shim's
spreads[] text is written from the same value.

Books with no built reader yet are skipped untouched.
Run:  python3 _four_word_sync_paperwork.py [--dry]
"""
import io
import json
import os
import re
import sys

PAGENUM = re.compile(r'p(\d+)', re.I)


def pkey(art):
    """A page's identity across the naming conventions: its page NUMBER.
    dp json says 'p2-ant.png', books_def says 'pit-p2.png', the manifest says
    'p2-ant'. All three answer 2."""
    m = PAGENUM.search(os.path.basename(art or ''))
    return int(m.group(1)) if m else None

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(REPO, 'scripts', 'curriculum', 'flashcards'))
sys.path.insert(0, os.path.join(REPO, 'scripts', 'curriculum', 'book-works'))
sys.path.insert(0, HERE)

from build_book_works import clean_sentence          # noqa: E402
from books_def import BOOKS                          # noqa: E402

LETTERS = os.path.join(REPO, 'scripts', 'curriculum', 'satpin-paperwork', 'letters')
SHIMS = os.path.join(REPO, 'scripts', 'curriculum', 'satpin-paperwork', 'shims')
MANIFEST = os.path.join(HERE, 'manifest.json')
EASY = os.path.join(REPO, 'lib', 'montree', 'english-curriculum', 'spec',
                    'easy-readers-manifest-v2.json')
SKIP = {'the-vest', 'the-swim', 'the-yam', 'the-zip', 'the-quilt'}


def _line(t):
    if isinstance(t, (tuple, list)) and t and isinstance(t[0], str):
        return t[0]
    return t if isinstance(t, str) else ''


def splits_and_covers():
    import ast
    tree = ast.parse(io.open(os.path.join(HERE, 'build_a5_readers.py'),
                             encoding='utf-8').read())
    out = {}
    for node in tree.body:
        if isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name) \
                and node.targets[0].id in ('SPLITS', 'COVERS'):
            out[node.targets[0].id] = ast.literal_eval(node.value)
    return out['SPLITS'], out['COVERS']


SPLITS, COVERS = splits_and_covers()
MF = {b['slug']: b for b in json.load(io.open(MANIFEST, encoding='utf-8'))['books']}
EASYR = {r['slug']: r for r in json.load(io.open(EASY, encoding='utf-8'))['readers']}


def letterbook_pages(slug):
    """{art-basename-lower: clean sentence} for a books_def letter book."""
    book = next((b for b in BOOKS if b['slug'] == slug), None)
    if book is None:
        return None, None
    pages = {}
    for sp in book['spreads']:
        art = sp.get('art')
        if not art:
            continue
        text = sp.get('text')
        joined = ' '.join(_line(t) for t in text) if isinstance(text, list) else (text or '')
        if not joined.strip():
            continue          # nar-only cliffhanger ('And the...?!') -- the
            # book prints no sentence there, so the paperwork keeps its own.
        pages[pkey(art)] = clean_sentence(sp.get('nar'), joined)
    return ' '.join(book['title_lines']).replace('  ', ' '), pages


def storybook_pages(slug):
    if slug not in SPLITS or slug not in MF:
        return None, None
    pages = {}
    for pg, sp in zip(MF[slug]['pages'], SPLITS[slug]):
        text = sp[1]
        joined = ' '.join(_line(t) for t in text) if isinstance(text, list) else (text or '')
        if not joined.strip():
            continue          # see letterbook_pages()
        pages[pkey(pg['key'])] = clean_sentence(sp[0], joined)
    # the manifest title is the book's name; COVERS[slug][0] is the cover
    # ART lines, which for ant-on-my-apple is a fill-the-blank frame.
    return MF[slug].get('title'), pages


def easyreader_pages(slug):
    r = EASYR.get(slug)
    if not r:
        return None, None
    pages = {p['n']: p['text'] for p in r['pages']}
    return r['title'], pages


def main():
    dry = '--dry' in sys.argv
    changed = []
    for name in sorted(os.listdir(LETTERS)):
        if not (name.startswith('dp-') and name.endswith('.json')):
            continue
        path = os.path.join(LETTERS, name)
        cfg = json.load(io.open(path, encoding='utf-8'))
        slug = cfg.get('bookSlug') or cfg.get('slug')
        if slug in SKIP:
            print('SKIP (no reader built yet):', name)
            continue
        arts = [p.get('art', '') for p in cfg.get('pages') or []]
        easy = any(a.lower().endswith(('.jpg', '.jpeg')) for a in arts)
        if easy:
            title, pages = easyreader_pages(slug)
        else:
            # SPLITS/manifest govern the pattern storybooks; books_def keeps an
            # older pre-decodable entry for snake-in-my-sock, so try the
            # storybook source FIRST and fall back to the letter book.
            title, pages = storybook_pages(slug)
            if pages is None:
                title, pages = letterbook_pages(slug)
        if pages is None:
            print('  NO SOURCE  %s (%s) -- left untouched' % (name, slug))
            continue
        src = io.open(path, encoding='utf-8').read()
        edits = []
        for p in cfg.get('pages') or []:
            want = pages.get(pkey(p.get('art', '')))
            if want is None:
                continue      # no printed sentence on that reader page
            if p.get('sentence') != want:
                edits.append((p['sentence'], want))
                p['sentence'] = want
        if title and cfg.get('bookTitle') != title:
            edits.append((cfg.get('bookTitle'), title))
            cfg['bookTitle'] = title
        if edits:
            changed.append((name, edits))
            if not dry:
                with io.open(path, 'w', encoding='utf-8') as fh:
                    json.dump(cfg, fh, ensure_ascii=False, indent=2)
                    fh.write('\n')
        # --- the shim carries the same sentences -------------------------
        shim = os.path.join(SHIMS, name[:-5] + '.py')
        if os.path.exists(shim):
            s = io.open(shim, encoding='utf-8').read()
            orig = s
            for p in cfg.get('pages') or []:
                art = os.path.basename(p.get('art', ''))
                sent = p['sentence']
                pat = re.compile(r"dict\(text=(['\"])(.*?)\1,\s*art=(['\"])"
                                 + re.escape(art) + r"\3")
                def _sub(m, sent=sent):
                    q = "'" if "'" not in sent else '"'
                    return "dict(text=%s%s%s, art=%s%s%s" % (q, sent, q, m.group(3),
                                                            art, m.group(3))
                s = pat.sub(_sub, s)
            if s != orig and not dry:
                io.open(shim, 'w', encoding='utf-8').write(s)
            if s != orig:
                changed.append((os.path.basename(shim), ['(synced)']))
    for name, edits in changed:
        print('%-40s %s' % (name, edits if edits != ['(synced)'] else 'synced'))
    print('%d files %s' % (len(changed), 'would change' if dry else 'changed'))


if __name__ == '__main__':
    main()
