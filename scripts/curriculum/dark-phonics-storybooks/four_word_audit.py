#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""FOUR-WORD AUDIT -- read-only inventory of every reader sentence.

HARD RULE (2026-09-07, Tredoux): every reader sentence is NO MORE THAN FOUR
WORDS, series-wide, and the works / tracing / paperwork text must match the
book text 1:1. the-pit is the model:

    'The cat sat in the... pit!'   ->   'Cat in the... pit!'

i.e. drop the leading article and the verb, keep the little preposition
phrase, land on the target word. A sentence already <= 4 words is left
EXACTLY as it is.

THIS SCRIPT CHANGES NOTHING. It walks every text source, counts the words
the child actually reads on each page, and prints/records a proposed
rewrite for every page over the limit.

Sources walked:
  (a) scripts/curriculum/flashcards/books_def.py      letter books: spreads
      (nar + text, list-style recap lines counted by their LONGEST line)
      and title_lines.
  (b) scripts/curriculum/dark-phonics-storybooks/build_a5_readers.py SPLITS
      + manifest.json page sentences -- the pattern storybooks.
  (c) scripts/curriculum/satpin-paperwork/letters/dp-<slug>.json  per-page
      `sentence` fields (must end up matching the reader 1:1). `yesno`
      questions are TEACHER-READ, so they are not rewritten -- they are
      listed separately when they quote a >4-word sentence.

Word count: words the child reads on the page, nar and text together,
punctuation and ellipsis ignored. 'I' counts as a word. '___' (the blank
the child fills from the picture) counts as a word.

Verdicts:
  OK           <= 4 words, left exactly as is
  REWRITE      mechanical cut got it to <= 4
  JUDGEMENT    recap / cast-list chant -- house 'drop' style, needs a human
               to pick the chant, proposal is a suggestion only
  NEEDS-CALL   could not reach 4 words without losing sense

Usage:
    python3 four_word_audit.py            # table to stdout + write the .md
    python3 four_word_audit.py --stdout   # table only, write nothing
"""
import ast
import collections
import glob
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
FLASHCARDS = os.path.join(REPO, 'scripts', 'curriculum', 'flashcards')
LETTERS = os.path.join(REPO, 'scripts', 'curriculum', 'satpin-paperwork', 'letters')
MANIFEST = os.path.join(HERE, 'manifest.json')
READERS_PY = os.path.join(HERE, 'build_a5_readers.py')
OUT_MD = os.path.join(REPO, 'docs', 'curriculum', 'dark-phonics-materials',
                      'FOUR_WORD_AUDIT_2026-09-07.md')

LIMIT = 4

# ---------------------------------------------------------------- counting
PUNCT = '!?,.;:"“”()…—–*'
ELLIPSIS = re.compile(r'…|\.\.\.')


def words(s):
    """The words a child reads in `s`. Punctuation and ellipsis dropped."""
    s = ELLIPSIS.sub(' ', s or '')
    return [w for w in (t.strip(PUNCT) for t in s.split()) if w]


def wc(s):
    return len(words(s))


def read_text(nar, text):
    """One page's full read-aloud line: nar then text, as printed."""
    if isinstance(text, list):
        text = ' '.join(_line(t) for t in text)
    parts = [(nar or '').strip(), _line(text).strip()]
    return ' '.join(p for p in parts if p)


def _line(t):
    """A text entry may be a plain string or a (string, scale) decrescendo."""
    if isinstance(t, (tuple, list)) and t and isinstance(t[0], str):
        return t[0]
    return t if isinstance(t, str) else ''


# ---------------------------------------------------------------- rewriting
ARTICLES = {'the', 'a', 'an'}
# Verbs the frame can shed once the article is gone. Ordered longest-first
# for the multiword ones so 'is not' goes before 'is'.
VERBS = ['can not', 'is not', 'are not', 'does not', 'did not',
         'sat', 'sits', 'sit', 'is', 'are', 'was', 'were', 'can', 'ate',
         'eats', 'eat', 'has', 'have', 'had', 'plays', 'play', 'licks',
         'lick', 'naps', 'nap', 'digs', 'dig', 'gets', 'get', 'goes', 'go',
         'jumps', 'jump', 'runs', 'run', 'will', 'does', 'do', 'did']
KEEP_PHRASES = ('in the', 'on the', 'in my', 'on my', 'in a', 'on a',
                'at the', 'under my', 'for the')


def _detok(toks, src):
    """Re-attach the source line's trailing punctuation to the last word."""
    tail = ''
    stripped = (src or '').rstrip()
    while stripped and stripped[-1] in PUNCT:
        tail = stripped[-1] + tail
        stripped = stripped[:-1]
    out = ' '.join(toks)
    if out:
        out = out[0].upper() + out[1:]
    return out + tail


NEG_AUX = ["didn't", 'didn’t', "doesn't", 'doesn’t', "isn't", 'isn’t',
           "aren't", 'aren’t', "can't", 'can’t', "won't", 'won’t']
CONJ = {'and', 'or', 'but'}


def _tidy(toks):
    """No dangling conjunction at either end after a cut."""
    while toks and toks[-1].lower() in CONJ:
        toks = toks[:-1]
    while toks and toks[0].lower() in CONJ:
        toks = toks[1:]
    return toks


def propose(line):
    """Mechanical cut, applied in the locked order. Returns (proposal, note)."""
    toks = words(line)
    if len(toks) <= LIMIT:
        return None, ''
    note = []
    # 0. negation frames: collapse the negative auxiliary to a bare 'not'
    #    ("didn't sit in a cot" -> "not sit in a cot"), then let the normal
    #    rules below shed the noun/verb. Keeps the gag readable instead of
    #    leaving a stranded "didn't".
    low = [t.lower() for t in toks]
    for i, t in enumerate(low):
        if t in NEG_AUX:
            toks[i] = 'not'
            note.append('negation -> not')
            break
        if t in ('is', 'are', 'was', 'were', 'did', 'does', 'can', 'do') \
                and i + 1 < len(low) and low[i + 1] == 'not':
            toks = toks[:i] + toks[i + 1:]
            note.append('negation -> not')
            break
    # 1. drop a leading article
    if toks and toks[0].lower() in ARTICLES:
        toks = toks[1:]
        note.append('dropped leading article')
    # 1b. a negation frame names its subject in the picture: shed it
    if len(toks) > LIMIT and len(toks) > 2 and 'not' in [t.lower() for t in toks] \
            and toks[0].lower() != 'not':
        toks = toks[1:]
        note.append('dropped subject (in the picture)')
    # 2. still long? drop the verb (first match, longest phrase first)
    if len(toks) > LIMIT:
        low = [t.lower() for t in toks]
        cut = None
        for v in VERBS:
            vt = v.split()
            n = len(vt)
            for i in range(len(low) - n + 1):
                if low[i:i + n] == vt:
                    cut = (i, n)
                    break
            if cut:
                break
        if cut:
            i, n = cut
            toks = _tidy(toks[:i] + toks[i + n:])
            note.append('dropped verb')
    # 3. still long? drop any further leading articles inside the frame
    while len(toks) > LIMIT and len(toks) > 2 and toks[0].lower() in ARTICLES:
        toks = toks[1:]
        note.append('dropped article')
    toks = _tidy(toks)
    return _detok(toks, line), '; '.join(note)


PREPS = ('in', 'on', 'at', 'under', 'for')


def recap_proposal(line):
    """House chant for a cast-list recap: keep the tail preposition phrase
    (or, failing that, the target word) and repeat it x3 in the 'drop'
    style, exactly as the-pit's 'In the pit!' x3 does."""
    toks = words(line)
    idx = max((i for i, t in enumerate(toks) if t.lower() in PREPS), default=None)
    tail = toks[idx:] if idx is not None and len(toks) - idx <= LIMIT else toks[-1:]
    return _detok(tail, line)


def classify(line, is_recap):
    """(verdict, proposal, note) for one read-aloud line."""
    n = wc(line)
    if n <= LIMIT:
        return 'OK', '', ''
    prop, note = propose(line)
    if is_recap:
        return ('JUDGEMENT', recap_proposal(line),
                "cast-list recap -- set this line x3 in the house 'drop' "
                'style, as the-pit does; confirm the wording')
    if wc(prop) > LIMIT:
        return 'NEEDS-CALL', prop, (note + '; still %d words' % wc(prop)).strip('; ')
    return 'REWRITE', prop, note


# ---------------------------------------------------------------- sources
def rows_books_def():
    sys.path.insert(0, FLASHCARDS)
    from books_def import BOOKS
    src = 'scripts/curriculum/flashcards/books_def.py'
    out = []
    for b in BOOKS:
        slug = b['slug']
        title = ' '.join(b.get('title_lines') or []).replace('  ', ' ').strip()
        v, p, note = classify(title, False)
        out.append(dict(slug=slug, source=src, page='title', line=title,
                        n=wc(title), verdict=v, proposal=p, note=note,
                        kind='title'))
        for i, sp in enumerate(b.get('spreads') or [], 1):
            is_recap = sp.get('style') == 'drop' or isinstance(sp.get('text'), list)
            if isinstance(sp.get('text'), list):
                # a stacked chant: the child reads ONE line at a time, so the
                # longest single line is the sentence length that matters
                lines = [_line(t) for t in sp['text']]
                line = read_text(sp.get('nar'), max(lines, key=wc))
            else:
                line = read_text(sp.get('nar'), sp.get('text'))
            if not line:
                continue                      # wordless cameo spread
            v, p, note = classify(line, is_recap)
            out.append(dict(slug=slug, source=src, page='p%d' % i, line=line,
                            n=wc(line), verdict=v, proposal=p, note=note,
                            kind='recap' if is_recap else 'spread'))
    return out


def _splits_from_source():
    """SPLITS out of build_a5_readers.py without importing it (no fonts, no
    monkeypatching, no side effects)."""
    tree = ast.parse(open(READERS_PY, encoding='utf-8').read())
    for node in tree.body:
        if (isinstance(node, ast.Assign)
                and isinstance(node.targets[0], ast.Name)
                and node.targets[0].id == 'SPLITS'):
            return ast.literal_eval(node.value)
    raise SystemExit('SPLITS not found in build_a5_readers.py')


def rows_storybooks():
    src_py = 'scripts/curriculum/dark-phonics-storybooks/build_a5_readers.py'
    src_mf = 'scripts/curriculum/dark-phonics-storybooks/manifest.json'
    splits = _splits_from_source()
    manifest = {b['slug']: b for b in
                json.load(open(MANIFEST, encoding='utf-8'))['books']}
    out = []
    for slug, pages in splits.items():
        for i, sp in enumerate(pages, 1):
            nar, text = sp[0], sp[1]
            is_recap = (len(sp) > 3 and sp[3] == 'drop') or isinstance(text, list)
            if isinstance(text, list):
                lines = [_line(t) for t in text]
                line = read_text(nar, max(lines, key=wc))
            else:
                line = read_text(nar, text)
            if not line:
                continue
            v, p, note = classify(line, is_recap)
            out.append(dict(slug=slug, source=src_py, page='p%d' % i, line=line,
                            n=wc(line), verdict=v, proposal=p, note=note,
                            kind='recap' if is_recap else 'spread'))
        mb = manifest.get(slug)
        if not mb:
            continue
        for i, pg in enumerate(mb.get('pages') or [], 1):
            line = (pg.get('text') or '').strip()
            if not line:
                continue
            key = pg.get('key') or 'p%d' % i
            v, p, note = classify(line, 'recap' in key)
            out.append(dict(slug=slug, source=src_mf, page=key,
                            line=line, n=wc(line), verdict=v, proposal=p,
                            note=note,
                            kind='manifest-recap' if 'recap' in key else 'manifest'))
    return out


def rows_paperwork():
    out, yesno = [], []
    for path in sorted(glob.glob(os.path.join(LETTERS, 'dp-*.json'))):
        d = json.load(open(path, encoding='utf-8'))
        src = os.path.relpath(path, REPO)
        slug = d.get('bookSlug') or d.get('slug')
        title = (d.get('bookTitle') or '').strip()
        if title:
            v, p, note = classify(title, False)
            out.append(dict(slug=slug, source=src, page='bookTitle', line=title,
                            n=wc(title), verdict=v, proposal=p, note=note,
                            kind='title'))
        for pg in d.get('pages') or []:
            line = (pg.get('sentence') or '').strip()
            if not line:
                continue
            v, p, note = classify(line, False)
            out.append(dict(slug=slug, source=src, page='order %s' % pg.get('order'),
                            line=line, n=wc(line), verdict=v, proposal=p,
                            note=note, kind='sentence'))
        for q in d.get('yesno') or []:
            line = (q.get('question') or '').strip()
            if wc(line) > LIMIT:
                yesno.append(dict(slug=slug, source=src, page='yesno',
                                  line=line, n=wc(line)))
    return out, yesno


# ---------------------------------------------------------------- output
def md_escape(s):
    return (s or '').replace('|', r'\|')


def table(rows):
    head = ('| book | source | page | current text (as read) | n | proposed rewrite | n′ | verdict | note |\n'
            '|---|---|---|---|---|---|---|---|---|\n')
    body = ''.join(
        '| %s | %s | %s | %s | %d | %s | %s | %s | %s |\n' % (
            r['slug'], os.path.basename(r['source']), r['page'],
            md_escape(r['line']), r['n'],
            md_escape(r['proposal']) or '—',
            (str(wc(r['proposal'])) if r['proposal'] else '—'),
            r['verdict'], md_escape(r['note']) or '')
        for r in rows)
    return head + body


def main():
    rows = rows_books_def() + rows_storybooks()
    pw, yesno = rows_paperwork()
    rows += pw

    books = sorted({r['slug'] for r in rows if r['slug']})
    over = [r for r in rows if r['n'] > LIMIT]
    judgement = [r for r in rows if r['verdict'] == 'JUDGEMENT']
    needs = [r for r in rows if r['verdict'] == 'NEEDS-CALL']

    summary = [
        '# Four-word audit — Dark Phonics readers',
        '',
        '_Generated %s by `scripts/curriculum/dark-phonics-storybooks/four_word_audit.py`.',
        'READ-ONLY inventory: nothing in this pass was edited or rebuilt._',
        '',
        '**HARD RULE (2026-09-07, Tredoux):** every reader sentence is no more than',
        '**four words**, series-wide, and works / tracing / paperwork text must match',
        'the book text 1:1. Model: `The cat sat in the… pit!` → `Cat in the… pit!`',
        '(drop the leading article and the verb, keep the little preposition phrase,',
        'land on the target). A sentence already ≤ 4 words is left **exactly** as is.',
        '',
        '## Totals',
        '',
        '| | |',
        '|---|---|',
        '| books / decks seen | %d |' % len(books),
        '| text rows walked | %d |' % len(rows),
        '| rows over 4 words | %d (%.0f%%) |' % (
            len(over), 100.0 * len(over) / max(len(rows), 1)),
        '| mechanical REWRITE | %d |' % sum(1 for r in rows if r['verdict'] == 'REWRITE'),
        '| JUDGEMENT (recap chants) | %d |' % len(judgement),
        '| NEEDS-CALL | %d |' % len(needs),
        '| teacher-read yes/no questions over 4 words | %d (not rewritten) |' % len(yesno),
        '',
        '### Word-count shape (all rows)',
        '',
        '| words | rows |',
        '|---|---|',
    ] + ['| %d | %d |' % (k, v) for k, v in
         sorted(collections.Counter(r['n'] for r in rows).items())] + [
        '',
        '### By source',
        '',
        '| source | OK | REWRITE | JUDGEMENT | NEEDS-CALL |',
        '|---|---|---|---|---|',
    ] + ['| %s | %d | %d | %d | %d |' % (
            src,
            sum(1 for r in rows if os.path.basename(r['source']) == src and r['verdict'] == 'OK'),
            sum(1 for r in rows if os.path.basename(r['source']) == src and r['verdict'] == 'REWRITE'),
            sum(1 for r in rows if os.path.basename(r['source']) == src and r['verdict'] == 'JUDGEMENT'),
            sum(1 for r in rows if os.path.basename(r['source']) == src and r['verdict'] == 'NEEDS-CALL'))
         for src in sorted({os.path.basename(r['source']) for r in rows})] + [
        '',
    ]

    parts = ['\n'.join(summary)]
    if judgement:
        parts.append('## JUDGEMENT rows — recap / chant pages\n\n' + table(judgement))
    if needs:
        parts.append('## NEEDS-CALL rows\n\n' + table(needs))
    parts.append('## Every row, all sources\n\n' + table(rows))
    if yesno:
        parts.append('## Teacher-read yes/no questions over 4 words (left alone)\n\n'
                     '| book | source | question | n |\n|---|---|---|---|\n' +
                     ''.join('| %s | %s | %s | %d |\n' % (
                         r['slug'], os.path.basename(r['source']),
                         md_escape(r['line']), r['n']) for r in yesno))
    doc = '\n\n'.join(parts)

    if '--stdout' not in sys.argv:
        os.makedirs(os.path.dirname(OUT_MD), exist_ok=True)
        with open(OUT_MD, 'w', encoding='utf-8') as fh:
            fh.write(doc)
    sys.stdout.write(doc)
    sys.stderr.write('\n[books=%d rows=%d over=%d judgement=%d needs-call=%d yesno=%d]\n'
                     % (len(books), len(rows), len(over), len(judgement),
                        len(needs), len(yesno)))


if __name__ == '__main__':
    main()
