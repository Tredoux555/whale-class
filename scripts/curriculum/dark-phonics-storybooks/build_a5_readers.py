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

EDITORIAL RULE (locked).  Every manifest sentence is split into
`nar` (grey italic, the teacher reads) + `text` (big bold, the child shouts).
The shout is ALWAYS the swap word; the frame is only ever reordered, never
reworded.  On the recap page the list becomes the narration and the frame
becomes the shout.

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
    'snake-in-my-sock':        (['Snake in', 'My Sock'], 'Snake', 44, 'snake · star · soap · seal'),
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

# Page splits, in manifest page order.  (nar, shout, max_size)
# nar may be a list of lines (dpbuild.make_text_page stacks them).
SPLITS = {
    'snake-in-my-sock': [
        ('In my sock…', 'a snake!', 92),
        ('In my sock…', 'a star!', 92),
        ('In my sock…', 'a soap!', 92),
        ('In my sock…', 'a seal!', 92),
        (['A snake, a star, a soap,', 'and a seal…'], 'in my sock?!', 66),
    ],
    'ant-on-my-apple': [
        ('On my apple…', 'an ant!', 92),
        ('On my apple…', 'an anchor!', 92),
        ('On my apple…', 'an alligator!', 92),
        ('On my apple…', 'an ambulance!', 92),
        (['An ant, an anchor, an alligator,', 'and an ambulance…'], 'on my apple?!', 62),
    ],
    'tiger-in-the-taxi': [
        ('In the taxi…', 'a turtle!', 92),
        ('In the taxi…', 'a tomato!', 92),
        ('In the taxi…', 'a toothbrush!', 92),
        ('In the taxi…', 'a tiger!', 92),
        (['A turtle, a tomato, a toothbrush,', 'and a tiger…'], 'in the taxi?!', 62),
    ],
    'pig-ate-a-pineapple': [
        ('The pig ate a…', 'pineapple!', 92),
        ('The pig ate a…', 'pen!', 92),
        ('The pig ate a…', 'pencil!', 92),
        ('The pig ate a…', 'pan!', 92),
        ('And now the pig is…', 'sick!', 92),
    ],
    'in-the-igloo': [
        ('In the igloo…', 'an iguana!', 92),
        ('In the igloo…', 'an insect!', 92),
        ('In the igloo…', 'an inchworm!', 92),
        ('In the igloo…', 'an infant!', 92),
        (['An iguana, an insect, an inchworm,', 'and an infant…'], 'in the igloo?!', 62),
    ],
    'not-in-my-nest': [
        ('In the nest…', 'a nut!', 92),
        ('In the nest…', 'a net!', 92),
        ('In the nest…', 'a nail!', 92),
        ('In the nest…', 'a napkin!', 92),
        (['A nut, a net, a nail,', 'and a napkin…'], 'in the nest?!', 66),
    ],
    'monkey-in-my-mug': [
        ('In my mug…', 'a mouse!', 92),
        ('In my mug…', 'a mushroom!', 92),
        ('In my mug…', 'a magnet!', 92),
        ('In my mug…', 'a monkey!', 92),
        (['A mouse, a mushroom, a magnet,', 'and a monkey…'], 'in my mug???', 66),
    ],
    'dinosaur-on-a-drum': [
        ('On a drum…', 'a dog!', 92),
        ('On a drum…', 'a doll!', 92),
        ('On a drum…', 'a duck!', 92),
        ('On a drum…', 'a dinosaur?!', 92),
        (['A dog, a doll, a duck,', 'and a dinosaur…'], 'on a drum?????', 62),
    ],
    'oh-no-goat': [
        ('The goat ate my…', 'grapes!', 92),
        ('The goat ate my…', 'gloves!', 92),
        ('The goat ate my…', 'gift!', 92),
        ('The goat plays my…', 'guitar?!', 92),
        (['My grapes, my gloves, my gift,', 'and my guitar…'], 'Oh no, goat…', 62),
    ],
    'owl-ate-an-orange': [
        ('Ate an orange…', 'an owl!', 92),
        ('Ate an orange…', 'an otter!', 92),
        ('Ate an orange…', 'an ostrich!', 92),
        ('Ate an orange…', 'an octopus!', 92),
        (['An owl, an otter, an ostrich,', 'and an octopus…'], 'ate my oranges?!', 60),
    ],
    'cow-on-the-car': [
        ('On the car…', 'a cat!', 92),
        ('On the car…', 'a cup!', 92),
        ('On the car…', 'a comb!', 92),
        ('On the car…', 'a cow!', 92),
        (['A cat, a cup, a comb,', 'and a cow…'], 'on the car?!', 66),
    ],
    'koala-in-the-pocket': [
        ('In the pocket…', 'a key!', 92),
        ('In the pocket…', 'a kite!', 92),
        ('In the pocket…', 'a kettle!', 92),
        ('In the pocket…', 'a koala!', 92),
        (['A key, a kite, a kettle,', 'and a koala…'], "in the kangaroo's pocket?!", 52),
    ],
    'on-a-rock': [
        ('On a rock…', 'a duck!', 92),
        ('On a rock…', 'a chick!', 92),
        ('On a rock…', 'a clock!', 92),
        ('On a rock…', 'a sock!', 92),
        (['A duck, a chick, a clock,', 'and a sock…'], 'on a rock?!', 66),
    ],
    'elephant-sat-on-the-egg': [
        ('On the egg sat…', 'a hen!', 92),
        ('On the egg sat…', 'an eagle!', 92),
        ('On the egg sat…', 'an elephant!', 92),
        (['A hen, an eagle,', 'and an elephant…'], 'sat on the egg?!', 60),
    ],
    'under-my-umbrella': [
        ('Under my umbrella…', 'a unicorn!', 92),
        ('Under my umbrella…', 'a ukulele!', 92),
        ('Under my umbrella…', 'a unicycle!', 92),
        ('Under my umbrella…', 'an urchin!', 92),
        (['A unicorn, a ukulele, a unicycle,', 'and an urchin…'], 'under my umbrella?!', 56),
    ],
    'rabbit-in-the-rocket': [
        ('In the rocket…', 'a rabbit!', 92),
        ('In the rocket…', 'a robot!', 92),
        ('In the rocket…', 'a rose!', 92),
        ('In the rocket…', 'a ring!', 92),
        (['A rabbit, a robot, a rose,', 'and a ring…'], 'in the rocket?!', 62),
    ],
    'horse-in-my-hat': [
        ('In my hat…', 'a hen!', 92),
        ('In my hat…', 'a hammer!', 92),
        ('In my hat…', 'a heart!', 92),
        ('In my hat…', 'a horse!', 92),
        (['A hen, a hammer, a heart,', 'and a horse…'], 'in my hat?!', 66),
    ],
    'bear-in-the-boat': [
        ('In the boat…', 'a ball!', 92),
        ('In the boat…', 'a banana!', 92),
        ('In the boat…', 'a bell!', 92),
        ('In the boat…', 'a bear!', 92),
        (['A ball, a banana, a bell,', 'and a bear…'], 'in the boat?!', 66),
    ],
    'frog-on-the-fan': [
        ('On the fan…', 'a frog!', 92),
        ('On the fan…', 'a fish!', 92),
        ('On the fan…', 'a feather!', 92),
        ('On the fan…', 'a fork!', 92),
        (['A frog, a fish, a feather,', 'and a fork…'], 'on the fan?!', 66),
    ],
    'oh-no-lion': [
        ('The lion licks a…', 'lemon!', 92),
        ('The lion licks a…', 'leaf!', 92),
        ('The lion licks a…', 'ladder!', 92),
        ('The lion licks a…', 'lizard!', 92),
        (['A lemon, a leaf, a ladder,', 'and a lizard…'], 'Oh no, lion…', 62),
    ],
    'jellyfish-in-the-jar': [
        ('In the jar…', 'a jug!', 92),
        ('In the jar…', 'a jacket!', 92),
        ('In the jar…', 'a jet!', 92),
        ('In the jar…', 'a jellyfish!', 92),
        (['A jug, a jacket, a jet,', 'and a jellyfish…'], 'in the jar?!', 66),
    ],
    'volcano-in-the-van': [
        ('In the van…', 'a violin!', 92),
        ('In the van…', 'a vase!', 92),
        ('In the van…', 'a vest!', 92),
        ('In the van…', 'a volcano!', 92),
        (['A violin, a vase, a vest,', 'and a volcano…'], 'in the van?!', 66),
    ],
    'whale-in-the-wagon': [
        ('In the wagon…', 'a worm!', 92),
        ('In the wagon…', 'a watch!', 92),
        ('In the wagon…', 'a wolf!', 92),
        ('In the wagon…', 'a whale!', 92),
        (['A worm, a watch, a wolf,', 'and a whale…'], 'in the wagon?!', 62),
    ],
    'fox-in-a-box': [
        ('In a box…', 'a fox!', 92),
        ('In a box…', 'an ox!', 92),
        ('In a box…', 'a xylophone!', 92),
        (['A fox, an ox,', 'and a xylophone…'], 'in a box?!', 70),
    ],
    'yak-on-the-yacht': [
        ('On the yacht…', 'a yak!', 92),
        ('On the yacht…', 'a yam!', 92),
        ('On the yacht…', 'a yo-yo!', 92),
        ('On the yacht…', 'yarn!', 92),
        (['A yak, a yam, a yo-yo,', 'and yarn…'], 'on the yacht?!', 62),
    ],
    'zzz-at-the-zoo': [
        ('At the zoo…', 'a zebra!', 92),
        ('At the zoo…', 'a zipper!', 92),
        ('At the zoo…', 'a zucchini!', 92),
        ('At the zoo…', 'a zeppelin!', 92),
        (['A zebra, a zipper, a zucchini,', 'and a zeppelin…'], 'at the zoo?!', 62),
    ],
    'queen-on-the-quilt': [
        ('On the quilt…', 'a quill!', 92),
        ('On the quilt…', 'a quarter!', 92),
        ('On the quilt…', 'a quail!', 92),
        ('On the quilt…', 'a queen!', 92),
        (['A quill, a quarter, a quail,', 'and a queen…'], 'on the quilt?!', 62),
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
