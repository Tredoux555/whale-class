# -*- coding: utf-8 -*-
"""ONE-OFF APPLIER for the FOUR-WORD RULE (Tredoux, 2026-09-07).

Every sentence a child reads in a Dark Phonics reader is NO MORE THAN FOUR
WORDS. This script lands the agreed rewrite in every text source at once, so
books_def.py / build_a5_readers.py SPLITS / manifest.json / the dp-*.json
paperwork / the shims / the easy-reader manifest / the digital lesson data can
never drift apart. Replacements are WHOLE QUOTED LITERALS only ("'old'" ->
"'new'"), so no substring of a longer sentence is ever mangled.

Run once:  python3 _four_word_apply.py [--dry]
"""
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
E = '…'          # ellipsis
RSQ = '’'        # curly apostrophe

# --------------------------------------------------------------- the map ---
SENT = {}


def add(old, new):
    if old in SENT and SENT[old] != new:
        raise SystemExit('conflicting mapping for %r' % old)
    SENT[old] = new


# ---- 1. letter books (books_def.py): nar lead-ins -------------------------
CAST = ['ant', 'apple', 'sun', 'star', 'snake', 'cat']
CAP = {w: w.capitalize() for w in CAST}

for w in CAST:
    c = CAP[w]
    add('The %s sat on the%s' % (w, E), '%s on the%s' % (c, E))      # the-mat
    add('The %s sat in a%s' % (w, E), '%s in a%s' % (c, E))          # the-cot
    add('The %s has a%s' % (w, E), '%s has a%s' % (c, E))            # the-dog/-kit
    add('The %s has an%s' % (w, E), '%s has an%s' % (c, E))          # the-egg
    add('The %s is in the%s' % (w, E), '%s in the%s' % (c, E))       # the-mud
    add('The %s chased the%s' % (w, E), '%s chased the%s' % (c, E))  # the-rat
    add('The %s saw a%s' % (w, E), '%s saw a%s' % (c, E))            # the-bug

# potato / crew pages (all PROVISIONAL -- see the handoff)
add('The potato didn%st sit on the%s' % (RSQ, E), 'Not on the%s' % E)      # the-mat
add('The potato didn%st sit in a%s' % (RSQ, E), 'Not in a%s' % E)        # the-cot
add("The potato isn't in the%s" % E, 'Not in the%s' % E)                   # the-mud
add("The potato didn't chase the%s" % E, "Didn't chase the%s" % E)         # the-rat
add("The potato doesn't have a%s" % E, 'Potato has no%s' % E)                 # the-kit
add('The crew helps the%s' % E, 'Crew helps the%s' % E)                       # the-kit p9
add('The potato has 5%s' % E, 'Potato has 5%s' % E)                           # the-dog
add('The potato had an%s' % E, 'Potato had an%s' % E)                         # the-egg
add('The potato is not%s' % E, 'Potato is not%s' % E)                         # the-sad
add('Now the whole crew is not%s' % E, 'Crew is not%s' % E)                   # the-sad p9
add('The bug saw a%s' % E, 'Bug saw a%s' % E)                                 # the-bug p8
# nap-ant-nap
add('An ant naps in a', 'Ant in a')

# ---- 2. pattern storybooks (build_a5_readers.py SPLITS): nar lead-ins -----
# family: "<article> <noun> <prep> <the|a|my>" -> drop the article
FAM = [
    ('A', ['turtle', 'tomato', 'toothbrush', 'tiger'], 'in the'),
    ('An', ['iguana', 'insect', 'inchworm', 'infant'], 'in the'),
    ('A', ['nut', 'net', 'nail', 'napkin'], 'in the'),
    ('A', ['mouse', 'mushroom', 'magnet', 'monkey'], 'in my'),
    ('A', ['dog', 'doll', 'duck', 'dinosaur'], 'on a'),
    ('A', ['cat', 'cup', 'comb', 'cow'], 'on the'),
    ('A', ['key', 'kite', 'kettle', 'koala'], 'in the'),
    ('A', ['duck', 'chick', 'clock', 'sock'], 'on a'),
    ('A', ['unicorn', 'ukulele', 'unicycle'], 'under my'),
    ('An', ['urchin'], 'under my'),
    ('A', ['rabbit', 'robot', 'rose', 'ring'], 'in the'),
    ('A', ['hen', 'hammer', 'heart', 'horse'], 'in my'),
    ('A', ['ball', 'banana', 'bell', 'bear'], 'in the'),
    ('A', ['frog', 'fish', 'feather', 'fork'], 'on the'),
    ('A', ['jug', 'jacket', 'jet', 'jellyfish'], 'in the'),
    ('A', ['violin', 'vase', 'vest', 'volcano'], 'in the'),
    ('A', ['worm', 'watch', 'wolf', 'whale'], 'in the'),
    ('A', ['fox', 'xylophone'], 'in a'),
    ('An', ['ox'], 'in a'),
    ('A', ['yak', 'yam', 'yo-yo'], 'on the'),
    ('A', ['zebra', 'zipper', 'zucchini', 'zeppelin'], 'at the'),
    ('A', ['quill', 'quarter', 'quail', 'queen'], 'on the'),
    ('An', ['owl', 'otter', 'ostrich', 'octopus'], 'ate an'),
]
for art, nouns, tail in FAM:
    for n in nouns:
        add('%s %s %s' % (art, n, tail), '%s %s' % (n.capitalize(), tail))

# snake-in-my-sock potato page
add('The potato in my', 'Potato in my')
# ant-on-my-apple (nar carries the ellipsis)
for n in ['ant', 'alligator', 'anteater', 'ambulance']:
    art = 'An'
    add('%s %s on my%s' % (art, n, E), '%s on my%s' % (n.capitalize(), E))
# oh-no-goat / oh-no-lion
add('The goat ate my%s' % E, 'Goat ate my%s' % E)
add('The goat plays my%s' % E, 'Goat plays my%s' % E)
add('The lion licks a%s' % E, 'Lion licks a%s' % E)
# elephant-sat-on-the-egg (drop article AND the verb)
for n in ['hen', 'eagle', 'elephant']:
    add('The %s sat on the' % n, '%s on the' % n.capitalize())
# the-fast / the-lost potato pages
add('The potato is not', 'Potato is not')

# ---- 3. manifest.json / dp-json / lessons: whole clean sentences ----------
def sent(old, new):
    add(old, new)

# letter books, clean-sentence form (dp-*.json + shims + book-works-lessons)
for w in CAST:
    c = CAP[w]
    sent('The %s sat on the mat!' % w, '%s on the mat!' % c)
    sent('The %s sat in a cot.' % w, '%s in a cot.' % c)
    sent('The %s sat in a cot!' % w, '%s in a cot!' % c)
    sent('The %s has a dog.' % w, '%s has a dog.' % c)
    sent('The %s has a dog!' % w, '%s has a dog!' % c)
    sent('The %s has a kit.' % w, '%s has a kit.' % c)
    sent('The %s has a kit!' % w, '%s has a kit!' % c)
    sent('The %s has an egg.' % w, '%s has an egg.' % c)
    sent('The %s has an egg!' % w, '%s has an egg!' % c)
    sent('The %s is in the mud.' % w, '%s in the mud.' % c)
    sent('The %s is in the mud!' % w, '%s in the mud!' % c)
    sent('The %s chased the rat.' % w, '%s chased the rat.' % c)
    sent('The %s chased the rat!' % w, '%s chased the rat!' % c)
    sent('The %s saw a bug.' % w, '%s saw a bug.' % c)
    sent('The %s saw a bug!' % w, '%s saw a bug!' % c)
    sent('The %s sat in the pit!' % w, '%s in the pit!' % c)
    sent('The %s sat in the pit.' % w, '%s in the pit.' % c)

sent("The potato didn't sit on the mat!", 'Not on the mat!')
sent('The potato didn%st sit on the mat!' % RSQ, 'Not on the mat!')
sent("The potato didn't sit in a cot!", 'Not in a cot!')
sent('The potato didn%st sit in a cot!' % RSQ, 'Not in a cot!')
sent("The potato isn't in the mud!", 'Not in the mud!')
sent("The potato didn't chase the rat!", "Didn't chase the rat!")
sent("The potato doesn't have a kit!", 'Potato has no kit!')
sent('The crew helps the potato!', 'Crew helps the potato!')
sent('The potato has 5 dogs!', 'Potato has 5 dogs!')
sent('The potato had an egg!', 'Potato had an egg!')
sent('The potato is not sad!', 'Potato is not sad!')
sent('The potato sat in the pit!', 'Potato in the pit!')
sent('The bug saw a potato!', 'Bug saw a potato!')
sent('The potato is not fast.', 'Potato is not fast.')
sent('The potato is not lost.', 'Potato is not lost.')

# pattern storybooks, manifest sentence form
MF = [
    (['turtle', 'tomato', 'toothbrush', 'tiger'], 'A %s in the taxi!', '%s in the taxi!'),
    (['iguana', 'insect', 'inchworm', 'infant'], 'An %s in the igloo!', '%s in the igloo!'),
    (['nut', 'net', 'nail', 'napkin'], 'A %s in the nest!', '%s in the nest!'),
    (['mouse', 'mushroom', 'magnet', 'monkey'], 'A %s in my mug!', '%s in my mug!'),
    (['dog', 'doll', 'duck'], 'A %s on a drum!', '%s on a drum!'),
    (['dinosaur'], 'A %s on a drum?!', '%s on a drum?!'),
    (['cat', 'cup', 'comb', 'cow'], 'A %s on the car!', '%s on the car!'),
    (['key', 'kite', 'kettle', 'koala'], 'A %s in the pocket!', '%s in the pocket!'),
    (['duck', 'chick', 'clock', 'sock'], 'A %s on a rock!', '%s on a rock!'),
    (['unicorn', 'ukulele', 'unicycle'], 'A %s under my umbrella!', '%s under my umbrella!'),
    (['urchin'], 'An %s under my umbrella!', '%s under my umbrella!'),
    (['rabbit', 'robot', 'rose', 'ring'], 'A %s in the rocket!', '%s in the rocket!'),
    (['hen', 'hammer', 'heart', 'horse'], 'A %s in my hat!', '%s in my hat!'),
    (['ball', 'banana', 'bell', 'bear'], 'A %s in the boat!', '%s in the boat!'),
    (['frog', 'fish', 'feather', 'fork'], 'A %s on the fan!', '%s on the fan!'),
    (['jug', 'jacket', 'jet', 'jellyfish'], 'A %s in the jar!', '%s in the jar!'),
    (['violin', 'vase', 'vest', 'volcano'], 'A %s in the van!', '%s in the van!'),
    (['worm', 'watch', 'wolf', 'whale'], 'A %s in the wagon!', '%s in the wagon!'),
    (['fox', 'xylophone'], 'A %s in a box!', '%s in a box!'),
    (['ox'], 'An %s in a box!', '%s in a box!'),
    (['yak', 'yam'], 'A %s on the yacht!', '%s on the yacht!'),
    (['yo-yo'], 'A %s on the yacht!', '%s on the yacht!'),
    (['zebra', 'zipper', 'zucchini', 'zeppelin'], 'A %s at the zoo!', '%s at the zoo!'),
    (['quill', 'quarter', 'quail', 'queen'], 'A %s on the quilt!', '%s on the quilt!'),
    (['owl', 'otter', 'ostrich', 'octopus'], 'An %s ate an orange!', '%s ate an orange!'),
    (['ant', 'alligator', 'anteater', 'ambulance'], 'An %s on my apple!', '%s on my apple!'),
]
for nouns, oldf, newf in MF:
    for n in nouns:
        sent(oldf % n, newf % n.capitalize())

sent('The potato in my sock?', 'Potato in my sock?')
sent('The goat ate my grapes!', 'Goat ate my grapes!')
sent('The goat ate my gloves!', 'Goat ate my gloves!')
sent('The goat ate my gift!', 'Goat ate my gift!')
sent('The goat plays my guitar?!', 'Goat plays my guitar?!')
sent('The lion licks a lemon!', 'Lion licks a lemon!')
sent('The lion licks a leaf!', 'Lion licks a leaf!')
sent('The lion licks a ladder!', 'Lion licks a ladder!')
sent('The lion licks a lizard!', 'Lion licks a lizard!')
sent('The hen sat on the egg.', 'Hen on the egg.')
sent('The eagle sat on the egg.', 'Eagle on the egg.')
sent('The elephant sat on the egg.', 'Elephant on the egg.')

# recap sentences (manifest + lessons endingLine)
RECAPS = {
    'Snake, star, soap, and seal in my sock?!': 'In my sock?!',
    'An ant, an alligator, an anteater, and an ambulance on my apple?!': 'On my apple?!',
    'A turtle, a tomato, a toothbrush, and a tiger in the taxi?!': 'In the taxi?!',
    'An iguana, an insect, an inchworm, and an infant in the igloo?!': 'In the igloo?!',
    'A nut, a net, a nail, and a napkin in the nest?!': 'In the nest?!',
    'A mouse, a mushroom, a magnet, and a monkey in my mug???': 'In my mug?!',
    'A dog, a doll, a duck, and a dinosaur on a drum?????': 'On a drum?!',
    'An owl, an otter, an ostrich, and an octopus ate my oranges?!': 'Ate an orange?!',
    'A cat, a cup, a comb, and a cow on the car?!': 'On the car?!',
    "A key, a kite, a kettle, and a koala in the kangaroo's pocket?!": 'In the pocket?!',
    'A duck, a chick, a clock, and a sock on a rock?!': 'On a rock?!',
    'A hen, an eagle, and an elephant sat on the egg?!': 'On the egg?!',
    'A unicorn, a ukulele, a unicycle, and an urchin under my umbrella?!': 'Under my umbrella?!',
    'A rabbit, a robot, a rose, and a ring in the rocket?!': 'In the rocket?!',
    'A hen, a hammer, a heart, and a horse in my hat?!': 'In my hat?!',
    'A ball, a banana, a bell, and a bear in the boat?!': 'In the boat?!',
    'A frog, a fish, a feather, and a fork on the fan?!': 'On the fan?!',
    'A jug, a jacket, a jet, and a jellyfish in the jar?!': 'In the jar?!',
    'A violin, a vase, a vest, and a volcano in the van?!': 'In the van?!',
    'A worm, a watch, a wolf, and a whale in the wagon?!': 'In the wagon?!',
    'A fox, an ox, and a xylophone in a box?!': 'In a box?!',
    'A yak, a yam, a yo-yo, and yarn on the yacht?!': 'On the yacht?!',
    'A zebra, a zipper, a zucchini, and a zeppelin at the zoo?!': 'At the zoo?!',
    'A quill, a quarter, a quail, and a queen on the quilt?!': 'On the quilt?!',
    'The ant, the apple, the sun, the star, the snake and the cat: fast, fast, fast!':
        'Fast! Fast! Fast!',
    'The ant, the apple, the sun, the star, the snake and the cat: lost, lost, lost!':
        'Lost! Lost! Lost!',
}
for k, v in RECAPS.items():
    sent(k, v)

# ---- 4. titles -----------------------------------------------------------
TITLES = {
    'A Tiger in the Taxi': 'Tiger in the Taxi',
    'A Monkey in My Mug': 'Monkey in My Mug',
    'A Dinosaur on a Drum': 'Dinosaur on a Drum',
    'An Owl Ate an Orange': 'Owl Ate an Orange',
    'A Cow on the Car': 'Cow on the Car',
    'A Koala in the Pocket': 'Koala in the Pocket',
    'The Elephant Sat on the Egg': 'Elephant on the Egg',
    'A Rabbit in the Rocket': 'Rabbit in the Rocket',
    'A Horse in My Hat': 'Horse in My Hat',
    'A Bear in the Boat': 'Bear in the Boat',
    'A Frog on the Fan': 'Frog on the Fan',
    'A Jellyfish in the Jar': 'Jellyfish in the Jar',
    'A Volcano in the Van': 'Volcano in the Van',
    'A Whale in the Wagon': 'Whale in the Wagon',
    'A Fox in a Box': 'Fox in a Box',
    'A Yak on the Yacht': 'Yak on the Yacht',
    'A Queen on the Quilt': 'Queen on the Quilt',
    'The ___ Sat on the Mat!': 'On the Mat!',
    'The ___ Sat in a Cot!': 'In a Cot!',
    'The ___ Is in the Mud!': 'In the Mud!',
    'The ___ Sat in the Pit!': 'In the Pit!',
    'The ___ Has a Dog!': '___ Has a Dog!',
    'The ___ Has a Kit!': '___ Has a Kit!',
    'The ___ Has an Egg!': '___ Has an Egg!',
    'The ___ Chased the Rat!': '___ Chased the Rat!',
    'The ___ Saw a Bug!': '___ Saw a Bug!',
}
for k, v in TITLES.items():
    sent(k, v)

# ---- 5. Easy Readers (easy-readers-manifest-v2.json + dp jsons + shims) ---
EASY = {
    'A cat sat on a cat.': 'Cat on a cat.',
    'A cat on a cat on a cat!': 'Cat on a cat!',            # PROVISIONAL
    'The pup is in mud.': 'Pup is in mud.',
    'The pup is a mud pup.': 'A mud pup!',                   # PROVISIONAL
    'The hen ran to the bed.': 'Hen ran to bed.',            # PROVISIONAL
    'Six fox in a box!': 'Fox in a box!',                    # PROVISIONAL
    'A big fox, a big mix.': 'Big fox, big mix.',            # PROVISIONAL
    'The cat is on the cot.': 'Cat on the cot.',
    'Off the hill it fell.': 'Off the hill!',                # PROVISIONAL
    'The fish and the chick.': 'Fish and the chick.',
    'The chick is on the fish!': 'Chick on the fish!',
    'A big jump in the sand.': 'A big jump!',                # PROVISIONAL
    'The frog and the crab.': 'Frog and the crab.',
    'The frog sat on the crab!': 'Frog on the crab!',
}
for k, v in EASY.items():
    sent(k, v)

# --------------------------------------------------------------- targets ---
FILES = [
    'scripts/curriculum/flashcards/books_def.py',
    'scripts/curriculum/dark-phonics-storybooks/build_a5_readers.py',
    'scripts/curriculum/dark-phonics-storybooks/manifest.json',
    'lib/montree/english-curriculum/spec/easy-readers-manifest-v2.json',
    'lib/montree/dark-phonics/lessons.ts',
    'lib/montree/dark-phonics/book-works-lessons.ts',
]
import glob
FILES += sorted(glob.glob(os.path.join(REPO, 'scripts/curriculum/satpin-paperwork/letters/dp-*.json')))
FILES += sorted(glob.glob(os.path.join(REPO, 'scripts/curriculum/satpin-paperwork/shims/dp-*.py')))

# books with no built reader yet -- do not touch anything of theirs
SKIP_SLUGS = ('the-vest', 'the-swim', 'the-yam', 'the-zip', 'the-quilt')

QUOTES = ["'", '"']


def apply_map(text):
    n = 0
    for old, new in sorted(SENT.items(), key=lambda kv: -len(kv[0])):
        for q in QUOTES:
            needle = q + old + q
            if needle in text:
                n += text.count(needle)
                text = text.replace(needle, q + new + q)
    return text, n


def main():
    dry = '--dry' in sys.argv
    total = 0
    for rel in FILES:
        path = rel if os.path.isabs(rel) else os.path.join(REPO, rel)
        base = os.path.basename(path)
        if any(base == 'dp-%s.json' % s or base == 'dp-%s.py' % s for s in SKIP_SLUGS):
            print('SKIP (no reader built yet):', base)
            continue
        with io.open(path, encoding='utf-8') as fh:
            src = fh.read()
        out, n = apply_map(src)
        total += n
        if n and not dry:
            with io.open(path, 'w', encoding='utf-8') as fh:
                fh.write(out)
        print('%5d  %s' % (n, os.path.relpath(path, REPO)))
    print('total literal replacements:', total, '(dry run)' if dry else '')


if __name__ == '__main__':
    main()
