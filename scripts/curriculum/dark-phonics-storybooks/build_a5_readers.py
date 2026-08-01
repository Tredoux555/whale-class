# -*- coding: utf-8 -*-
"""Dark Phonics storybooks -> Montree A5 reader print format ("Inked Hush").

Rebuilds all 27 pattern storybooks from
scripts/curriculum/dark-phonics-storybooks/manifest.json into the house
saddle-stitch pair produced by the pig-book pipeline:

    <slug>-A5-reading.pdf         A5 portrait, reading order
    <slug>-A5-booklet-print.pdf   A4 landscape, 2-up saddle imposition

Nothing is forked: the painters and the imposition come from
scripts/curriculum/flashcards/build_booklets.py via
scripts/curriculum/dark-phonics-readers/dpbuild.py.  Only two small things
are composed on top (both monkeypatched onto dpbuild so build() picks them up):

  * page_cover  -> house cover + the book's band line drawn in its own
                   palette colour instead of the flat grey.
  * page_back   -> house back cover with a strapline that fits these
                   picture-word books ("one sound, one shouted word").

EDITORIAL RULE (locked, rev. 2026-08-01).  Straight natural word order,
exactly as manifest.json's page `text` reads -- never inverted, never
reordered ("A snake in my sock!", not "In my sock... a snake!").

  * ONLY when a sentence naturally ENDS with its swap word does it get the
    nar/text split: `nar` (grey italic, "The pig ate a...") + `text` (big
    bold shout, "pineapple!").  This applies to pig-ate-a-pineapple (every
    page) and the first four pages of oh-no-goat / oh-no-lion.
  * Every other page: the full manifest sentence is the big shout, `nar`
    empty, auto-shrunk by the house painter to fit on 1-2 lines.
  * Recap pages: the full recap sentence, verbatim punctuation, is the big
    shout, hand-broken into up to 3 lines so it shrinks to a legible size.
    Goat/lion recaps are the short manifest text alone: "Oh no, goat..." /
    "Oh no, lion..." with no list line.

Env overrides (all optional):
  MONTREE_CANVAS_FONTS  font dir (default: repo copy, then the canvas-design skill)
  MONTREE_BOOKS_ROOT    art root  (default: <repo>/phonics-images/dark-phonics-books)
  MONTREE_BOOK_OUT      output    (default: <repo>/public/dark-phonics-books/print)
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
FLASHCARDS = os.path.join(REPO, 'scripts', 'curriculum', 'flashcards')
READERS = os.path.join(REPO, 'scripts', 'curriculum', 'dark-phonics-readers')

# --- fonts -----------------------------------------------------------------
# build_booklets registers its fonts at import time, so resolve the directory
# before importing it.  The repo now carries its own copy so the pipeline runs
# on a plain Mac checkout with no canvas-design skill installed.
FONT_CANDIDATES = [
    os.environ.get('MONTREE_CANVAS_FONTS'),
    os.path.join(FLASHCARDS, 'canvas-fonts'),
    '/root/.claude/skills/canvas-design/canvas-fonts',
    os.path.expanduser('~/.claude/skills/canvas-design/canvas-fonts'),
]
for cand in FONT_CANDIDATES:
    if cand and os.path.exists(os.path.join(cand, 'YoungSerif-Regular.ttf')):
        os.environ['MONTREE_CANVAS_FONTS'] = cand
        break
else:  # pragma: no cover
    raise SystemExit('No canvas fonts found; tried:\n  ' +
                     '\n  '.join(c for c in FONT_CANDIDATES if c))

sys.path.insert(0, FLASHCARDS)
sys.path.insert(0, READERS)
import build_booklets as bb          # noqa: E402
import dpbuild                       # noqa: E402
from build_booklets import (draw_tracked, PW, PH, M, INK, GREY, FAINT, mm)  # noqa: E402

ART_ROOT = os.environ.get('MONTREE_BOOKS_ROOT',
                          os.path.join(REPO, 'phonics-images', 'dark-phonics-books'))
OUT = os.environ.get('MONTREE_BOOK_OUT',
                     os.path.join(REPO, 'public', 'dark-phonics-books', 'print'))
MANIFEST = os.path.join(HERE, 'manifest.json')

# --- band palette ----------------------------------------------------------
# Muted inks that sit quietly next to the house red; rotates by book number.
PALETTE = [
    (0.12, 0.44, 0.42),   # deep teal
    (0.69, 0.49, 0.17),   # ochre
    (0.42, 0.25, 0.43),   # plum
    (0.24, 0.42, 0.23),   # forest
    (0.20, 0.28, 0.48),   # indigo
    (0.64, 0.33, 0.18),   # clay
    (0.29, 0.36, 0.42),   # slate
    (0.55, 0.20, 0.28),   # damson
]

NUMWORDS = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN',
            'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN',
            'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN', 'TWENTY',
            'TWENTY-ONE', 'TWENTY-TWO', 'TWENTY-THREE', 'TWENTY-FOUR',
            'TWENTY-FIVE', 'TWENTY-SIX', 'TWENTY-SEVEN']


# --- composed pages (monkeypatched onto dpbuild, painters untouched) -------
def page_cover(c, book):
    bb.page_cover(c, book)                      # house cover, band text blank
    draw_tracked(c, PW/2, PH-M-22, book['band_text'], 'Label', 7.5, 0.22,
                 book['band_color'])


def page_back(c, book):
    draw_tracked(c, PW/2, PH*0.60, 'D A R K   P H O N I C S', 'Label', 9, 0.3, GREY)
    c.setFont('Nar', 11); c.setFillColorRGB(*INK)
    c.drawCentredString(PW/2, PH*0.60-9*mm, 'pattern readers')
    c.setFont('Label', 8); c.setFillColorRGB(*FAINT)
    c.drawCentredString(PW/2, PH*0.60-17*mm, book['booknum'])
    c.setFont('Nar', 9.5); c.setFillColorRGB(*GREY)
    c.drawCentredString(PW/2, M+18*mm,
                        'One sound. One pattern. The child shouts the picture.')
    c.setFont('Label', 7.5); c.setFillColorRGB(*FAINT)
    c.drawCentredString(PW/2, M+11*mm, 'teacherpotato.xyz')


dpbuild.page_cover = page_cover
dpbuild.page_back = page_back


# --- editorial: title lines / accent / oral words / page splits ------------
# Per slug: (title_lines, title_accent, title_size, oral_words, end_sound?)
COVERS = {
    'snake-in-my-sock':        (['Snake in', 'My Sock'], 'Snake', 44, 'snake · star · sloth'),
    'ant-on-my-apple':         (['Ant on', 'My Apple'], 'Ant', 44, 'ant · anchor · alligator · ambulance'),
    'tiger-in-the-taxi':       (['A Tiger in', 'the Taxi'], 'Tiger', 42, 'turtle · tomato · toothbrush · tiger'),
    'pig-ate-a-pineapple':     (['The Pig Ate', 'a Pineapple'], 'Pineapple', 40, 'pineapple · pen · pencil · pan'),
    'in-the-igloo':            (['In the Igloo'], 'Igloo', 46, 'iguana · insect · inchworm · infant'),
    'not-in-my-nest':          (['Not in', 'My Nest!'], 'Nest', 44, 'nut · net · nail · napkin'),
    'monkey-in-my-mug':        (['A Monkey', 'in My Mug'], 'Monkey', 42, 'mouse · mushroom · magnet · monkey'),
    'dinosaur-on-a-drum':      (['A Dinosaur', 'on a Drum'], 'Dinosaur', 42, 'dog · doll · duck · dinosaur'),
    'oh-no-goat':              (['Oh No, Goat…'], 'Goat', 46, 'grapes · gloves · gift · guitar'),
    'owl-ate-an-orange':       (['An Owl Ate', 'an Orange'], 'Owl', 42, 'owl · otter · ostrich · octopus'),
    'cow-on-the-car':          (['A Cow on', 'the Car'], 'Cow', 44, 'cat · cup · comb · cow'),
    'koala-in-the-pocket':     (['A Koala in', 'the Pocket'], 'Koala', 42, 'key · kite · kettle · koala'),
    'on-a-rock':               (['On a Rock'], 'Rock', 46, 'duck · chick · clock · sock · rock'),
    'elephant-sat-on-the-egg': (['The Elephant', 'Sat on the Egg'], 'Elephant', 40, 'egg · hen · eagle · elephant'),
    'under-my-umbrella':       (['Under My', 'Umbrella'], 'Umbrella', 44, 'unicorn · ukulele · unicycle · urchin'),
    'rabbit-in-the-rocket':    (['A Rabbit in', 'the Rocket'], 'Rabbit', 42, 'rabbit · robot · rose · ring'),
    'horse-in-my-hat':         (['A Horse', 'in My Hat'], 'Horse', 44, 'hen · hammer · heart · horse'),
    'bear-in-the-boat':        (['A Bear in', 'the Boat'], 'Bear', 44, 'ball · banana · bell · bear'),
    'frog-on-the-fan':         (['A Frog on', 'the Fan'], 'Frog', 44, 'frog · fish · feather · fork'),
    'oh-no-lion':              (['Oh No, Lion…'], 'Lion', 46, 'lemon · leaf · ladder · lizard'),
    'jellyfish-in-the-jar':    (['A Jellyfish', 'in the Jar'], 'Jellyfish', 42, 'jug · jacket · jet · jellyfish'),
    'volcano-in-the-van':      (['A Volcano', 'in the Van'], 'Volcano', 42, 'violin · vase · vest · volcano'),
    'whale-in-the-wagon':      (['A Whale in', 'the Wagon'], 'Whale', 42, 'worm · watch · wolf · whale'),
    'fox-in-a-box':            (['A Fox in a Box'], 'Fox', 42, 'fox · ox · xylophone · box'),
    'yak-on-the-yacht':        (['A Yak on', 'the Yacht'], 'Yak', 44, 'yak · yam · yo-yo · yarn'),
    'zzz-at-the-zoo':          (['Zzz at the Zoo'], 'Zoo', 44, 'zebra · zipper · zucchini · zeppelin'),
    'queen-on-the-quilt':      (['A Queen on', 'the Quilt'], 'Queen', 42, 'quill · quarter · quail · queen'),
}

# Books whose target sound sits at the END of the picture words.
END_SOUND = {'on-a-rock', 'fox-in-a-box'}

# Page splits, in manifest page order.  (nar, text, size)
# nar/text may be a list of lines (dpbuild.make_text_page stacks them).
# Default case: nar='' (the house painter skips it cleanly), text = the
# manifest sentence VERBATIM in natural word order, size=100 is just a
# generous seed -- bb.fit()/dpbuild's fit() always shrinks to the true
# width-based size regardless of the seed, so 100 is safe everywhere.
# The only nar/text splits left are the three books whose manifest
# sentences already end on the swap word (pig, goat pp.1-4, lion pp.1-4).
SPLITS = {
    'snake-in-my-sock': [
        ('', 'A sock.', 100),
        ('', 'A snake in my sock!', 100),
        ('', 'A star in my sock!', 100),
        ('', 'A sloth in my sock!', 100),
        ('', ['A snake, a star,', 'and a sloth', 'in my sock?!'], 100),
    ],
    'ant-on-my-apple': [
        ('', 'An ant on my apple!', 100),
        ('', 'An anchor on my apple!', 100),
        ('', 'An alligator on my apple!', 100),
        ('', 'An ambulance on my apple!', 100),
        ('', ['An ant, an anchor, an alligator,', 'and an ambulance', 'on my apple?!'], 100),
    ],
    'tiger-in-the-taxi': [
        ('', 'A turtle in the taxi!', 100),
        ('', 'A tomato in the taxi!', 100),
        ('', 'A toothbrush in the taxi!', 100),
        ('', 'A tiger in the taxi!', 100),
        ('', ['A turtle, a tomato,', 'a toothbrush, and a tiger', 'in the taxi?!'], 100),
    ],
    'pig-ate-a-pineapple': [
        ('The pig ate a…', 'pineapple!', 92),
        ('The pig ate a…', 'pen!', 92),
        ('The pig ate a…', 'pencil!', 92),
        ('The pig ate a…', 'pan!', 92),
        ('And now the pig is…', 'sick!', 92),
    ],
    'in-the-igloo': [
        ('', 'An iguana in the igloo!', 100),
        ('', 'An insect in the igloo!', 100),
        ('', 'An inchworm in the igloo!', 100),
        ('', 'An infant in the igloo!', 100),
        ('', ['An iguana, an insect,', 'an inchworm,', 'and an infant in the igloo?!'], 100),
    ],
    'not-in-my-nest': [
        ('', 'A nut in the nest!', 100),
        ('', 'A net in the nest!', 100),
        ('', 'A nail in the nest!', 100),
        ('', 'A napkin in the nest!', 100),
        ('', ['A nut, a net,', 'a nail, and a napkin', 'in the nest?!'], 100),
    ],
    'monkey-in-my-mug': [
        ('', 'A mouse in my mug!', 100),
        ('', 'A mushroom in my mug!', 100),
        ('', 'A magnet in my mug!', 100),
        ('', 'A monkey in my mug!', 100),
        ('', ['A mouse, a mushroom,', 'a magnet, and a monkey', 'in my mug???'], 100),
    ],
    'dinosaur-on-a-drum': [
        ('', 'A dog on a drum!', 100),
        ('', 'A doll on a drum!', 100),
        ('', 'A duck on a drum!', 100),
        ('', 'A dinosaur on a drum?!', 100),
        ('', ['A dog, a doll,', 'a duck, and a dinosaur', 'on a drum?????'], 100),
    ],
    'oh-no-goat': [
        ('The goat ate my…', 'grapes!', 92),
        ('The goat ate my…', 'gloves!', 92),
        ('The goat ate my…', 'gift!', 92),
        ('The goat plays my…', 'guitar?!', 92),
        ('', 'Oh no, goat…', 100),
    ],
    'owl-ate-an-orange': [
        ('', 'An owl ate an orange!', 100),
        ('', 'An otter ate an orange!', 100),
        ('', 'An ostrich ate an orange!', 100),
        ('', 'An octopus ate an orange!', 100),
        ('', ['An owl, an otter,', 'an ostrich, and an octopus', 'ate my oranges?!'], 100),
    ],
    'cow-on-the-car': [
        ('', 'A cat on the car!', 100),
        ('', 'A cup on the car!', 100),
        ('', 'A comb on the car!', 100),
        ('', 'A cow on the car!', 100),
        ('', ['A cat, a cup,', 'a comb, and a cow', 'on the car?!'], 100),
    ],
    'koala-in-the-pocket': [
        ('', 'A key in the pocket!', 100),
        ('', 'A kite in the pocket!', 100),
        ('', 'A kettle in the pocket!', 100),
        ('', 'A koala in the pocket!', 100),
        ('', ['A key, a kite, a kettle,', 'and a koala', "in the kangaroo's pocket?!"], 100),
    ],
    'on-a-rock': [
        ('', 'A duck on a rock!', 100),
        ('', 'A chick on a rock!', 100),
        ('', 'A clock on a rock!', 100),
        ('', 'A sock on a rock!', 100),
        ('', ['A duck, a chick,', 'a clock, and a sock', 'on a rock?!'], 100),
    ],
    'elephant-sat-on-the-egg': [
        ('', 'The hen sat on the egg.', 100),
        ('', 'The eagle sat on the egg.', 100),
        ('', 'The elephant sat on the egg.', 100),
        ('', ['A hen, an eagle,', 'and an elephant', 'sat on the egg?!'], 100),
    ],
    'under-my-umbrella': [
        ('', 'A unicorn under my umbrella!', 100),
        ('', 'A ukulele under my umbrella!', 100),
        ('', 'A unicycle under my umbrella!', 100),
        ('', 'An urchin under my umbrella!', 100),
        ('', ['A unicorn, a ukulele,', 'a unicycle, and an urchin', 'under my umbrella?!'], 100),
    ],
    'rabbit-in-the-rocket': [
        ('', 'A rabbit in the rocket!', 100),
        ('', 'A robot in the rocket!', 100),
        ('', 'A rose in the rocket!', 100),
        ('', 'A ring in the rocket!', 100),
        ('', ['A rabbit, a robot,', 'a rose, and a ring', 'in the rocket?!'], 100),
    ],
    'horse-in-my-hat': [
        ('', 'A hen in my hat!', 100),
        ('', 'A hammer in my hat!', 100),
        ('', 'A heart in my hat!', 100),
        ('', 'A horse in my hat!', 100),
        ('', ['A hen, a hammer,', 'a heart, and a horse', 'in my hat?!'], 100),
    ],
    'bear-in-the-boat': [
        ('', 'A ball in the boat!', 100),
        ('', 'A banana in the boat!', 100),
        ('', 'A bell in the boat!', 100),
        ('', 'A bear in the boat!', 100),
        ('', ['A ball, a banana,', 'a bell, and a bear', 'in the boat?!'], 100),
    ],
    'frog-on-the-fan': [
        ('', 'A frog on the fan!', 100),
        ('', 'A fish on the fan!', 100),
        ('', 'A feather on the fan!', 100),
        ('', 'A fork on the fan!', 100),
        ('', ['A frog, a fish,', 'a feather, and a fork', 'on the fan?!'], 100),
    ],
    'oh-no-lion': [
        ('The lion licks a…', 'lemon!', 92),
        ('The lion licks a…', 'leaf!', 92),
        ('The lion licks a…', 'ladder!', 92),
        ('The lion licks a…', 'lizard!', 92),
        ('', 'Oh no, lion…', 100),
    ],
    'jellyfish-in-the-jar': [
        ('', 'A jug in the jar!', 100),
        ('', 'A jacket in the jar!', 100),
        ('', 'A jet in the jar!', 100),
        ('', 'A jellyfish in the jar!', 100),
        ('', ['A jug, a jacket,', 'a jet, and a jellyfish', 'in the jar?!'], 100),
    ],
    'volcano-in-the-van': [
        ('', 'A violin in the van!', 100),
        ('', 'A vase in the van!', 100),
        ('', 'A vest in the van!', 100),
        ('', 'A volcano in the van!', 100),
        ('', ['A violin, a vase,', 'a vest, and a volcano', 'in the van?!'], 100),
    ],
    'whale-in-the-wagon': [
        ('', 'A worm in the wagon!', 100),
        ('', 'A watch in the wagon!', 100),
        ('', 'A wolf in the wagon!', 100),
        ('', 'A whale in the wagon!', 100),
        ('', ['A worm, a watch,', 'a wolf, and a whale', 'in the wagon?!'], 100),
    ],
    'fox-in-a-box': [
        ('', 'A fox in a box!', 100),
        ('', 'An ox in a box!', 100),
        ('', 'A xylophone in a box!', 100),
        ('', ['A fox, an ox,', 'and a xylophone', 'in a box?!'], 100),
    ],
    'yak-on-the-yacht': [
        ('', 'A yak on the yacht!', 100),
        ('', 'A yam on the yacht!', 100),
        ('', 'A yo-yo on the yacht!', 100),
        ('', 'Yarn on the yacht!', 100),
        ('', ['A yak, a yam,', 'a yo-yo, and yarn', 'on the yacht?!'], 100),
    ],
    'zzz-at-the-zoo': [
        ('', 'A zebra at the zoo!', 100),
        ('', 'A zipper at the zoo!', 100),
        ('', 'A zucchini at the zoo!', 100),
        ('', 'A zeppelin at the zoo!', 100),
        ('', ['A zebra,', 'a zipper, a zucchini,', 'and a zeppelin at the zoo?!'], 100),
    ],
    'queen-on-the-quilt': [
        ('', 'A quill on the quilt!', 100),
        ('', 'A quarter on the quilt!', 100),
        ('', 'A quail on the quilt!', 100),
        ('', 'A queen on the quilt!', 100),
        ('', ['A quill, a quarter,', 'a quail, and a queen', 'on the quilt?!'], 100),
    ],
}


def make_book(entry):
    slug = entry['slug']
    lines, accent, tsize, oral = COVERS[slug]
    splits = SPLITS[slug]
    pages = entry['pages']
    if len(splits) != len(pages):
        raise SystemExit(f'{slug}: {len(splits)} splits for {len(pages)} manifest pages')

    art = {p['key']: os.path.join(ART_ROOT, slug, p['key'] + '.png') for p in pages}
    for path in art.values():
        if not os.path.exists(path):
            raise SystemExit(f'{slug}: missing art {path}')
    recap_key = next(p['key'] for p in pages if 'recap' in p['key'])

    spreads = []
    for p, (nar, shout, size) in zip(pages, splits):
        spreads.append(dict(nar=nar, text=shout, size=size, art=art[p['key']]))

    letter = entry['letter']
    note = ('End-sound book — the child shouts the picture word.'
            if slug in END_SOUND else
            'Initial-sound book — the child shouts the picture word.')
    return dict(
        slug=slug,
        title_lines=lines, title_accent=accent, title_size=tsize,
        band='',                                   # house painter draws nothing
        band_text=f'DARK PHONICS  ·  SOUND {letter}  ·  PATTERN READER',
        band_color=PALETTE[(entry['num'] - 1) % len(PALETTE)],
        booknum='BOOK ' + NUMWORDS[entry['num']],
        cover=art[recap_key],
        sound=letter,
        sound_note=note,
        oral_words=oral,
        decodable='',                              # picture-word book: nothing to decode yet
        spreads=spreads,
    )


def main():
    with open(MANIFEST, encoding='utf-8') as fh:
        entries = json.load(fh)['books']
    os.makedirs(OUT, exist_ok=True)
    built = []
    for entry in sorted(entries, key=lambda e: e['num']):
        book = make_book(entry)
        dpbuild.build(book, OUT)
        built.append(book['slug'])

    bad = []
    for slug in built:
        for suffix in ('-A5-reading.pdf', '-A5-booklet-print.pdf'):
            path = os.path.join(OUT, slug + suffix)
            if not os.path.exists(path) or os.path.getsize(path) == 0:
                bad.append(path)
    if bad:
        raise SystemExit('EMPTY/MISSING:\n  ' + '\n  '.join(bad))
    print(f'OK {len(built)} books -> {len(built)*2} PDFs in {OUT}')


if __name__ == '__main__':
    main()
