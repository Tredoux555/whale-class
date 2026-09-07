# -*- coding: utf-8 -*-
"""ONE-OFF: the structural half of the FOUR-WORD RULE (2026-09-07).

_four_word_apply.py swaps whole quoted sentences. This one edits the literals
that are LISTS or tuples -- recap chants (now the tail phrase x3 in the house
'drop' style, exactly as the-pit does), cover title_lines, and the COVERS
table in build_a5_readers.py.
"""
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
BD = os.path.join(REPO, 'scripts', 'curriculum', 'flashcards', 'books_def.py')
RD = os.path.join(HERE, 'build_a5_readers.py')

EDITS = []


def edit(path, old, new):
    EDITS.append((path, old, new))


# ---- books_def.py: title_lines ------------------------------------------
edit(BD, "title_lines=['The ___ Sat','on the Mat!'], title_accent='Mat!', title_size=44",
         "title_lines=['On the Mat!'], title_accent='Mat!', title_size=46")
edit(BD, "title_lines=['The ___','Sat in a Cot!'], title_accent='Cot!', title_size=42",
         "title_lines=['In a Cot!'], title_accent='Cot!', title_size=46")
edit(BD, "title_lines=['The ___','Is in the Mud!'], title_accent='Mud!', title_size=40",
         "title_lines=['In the Mud!'], title_accent='Mud!', title_size=46")
edit(BD, "title_lines=['The ___','Has a Dog!'], title_accent='Dog!', title_size=44",
         "title_lines=['___ Has','a Dog!'], title_accent='Dog!', title_size=44")
edit(BD, "title_lines=['The ___','Has a Kit!'], title_accent='Kit!', title_size=44",
         "title_lines=['___ Has','a Kit!'], title_accent='Kit!', title_size=44")
edit(BD, "title_lines=['The ___','Has an Egg!'], title_accent='Egg!', title_size=42",
         "title_lines=['___ Has','an Egg!'], title_accent='Egg!', title_size=42")
edit(BD, "title_lines=['The ___','Chased the Rat!'], title_accent='Rat!', title_size=36",
         "title_lines=['___ Chased','the Rat!'], title_accent='Rat!', title_size=42")
edit(BD, "title_lines=['The ___','Saw a Bug!'], title_accent='Bug!', title_size=44",
         "title_lines=['___ Saw','a Bug!'], title_accent='Bug!', title_size=44")

# ---- books_def.py: the-tall recap chant ----------------------------------
edit(BD, "dict(text=['A turtle, a tomato,','a toothbrush, a tiger,','and a taxi — all tall?!'],\n"
         "       style='drop', size=38,",
         "dict(text=['All tall?!','All tall?!','All tall?!'],\n"
         "       style='drop', size=42,")

# ---- books_def.py: nap-ant-nap p4 whisper stack --------------------------
edit(BD, "dict(text=['An ant naps','in a…'], style='whisper'",
         "dict(text=['Ant naps','in a…'], style='whisper'")

# ---- build_a5_readers.py: COVERS title lines -----------------------------
COVER_EDITS = {
    "(['An ___ on my', 'apple!'], 'apple!', 40,": "(['___ on my', 'apple!'], 'apple!', 40,",
    "(['A Tiger in', 'the Taxi'], 'Tiger', 42,": "(['Tiger in', 'the Taxi'], 'Tiger', 42,",
    "(['A Monkey', 'in My Mug'], 'Monkey', 42,": "(['Monkey in', 'My Mug'], 'Monkey', 42,",
    "(['A Dinosaur', 'on a Drum'], 'Dinosaur', 42,": "(['Dinosaur on', 'a Drum'], 'Dinosaur', 42,",
    "(['An Owl Ate', 'an Orange'], 'Owl', 42,": "(['Owl Ate', 'an Orange'], 'Owl', 42,",
    "(['A Cow on', 'the Car'], 'Cow', 44,": "(['Cow on', 'the Car'], 'Cow', 44,",
    "(['A Koala in', 'the Pocket'], 'Koala', 42,": "(['Koala in', 'the Pocket'], 'Koala', 42,",
    "(['The Elephant', 'Sat on the Egg'], 'Elephant', 40,": "(['Elephant on', 'the Egg'], 'Elephant', 44,",
    "(['A Rabbit in', 'the Rocket'], 'Rabbit', 42,": "(['Rabbit in', 'the Rocket'], 'Rabbit', 42,",
    "(['A Horse', 'in My Hat'], 'Horse', 44,": "(['Horse in', 'My Hat'], 'Horse', 44,",
    "(['A Bear in', 'the Boat'], 'Bear', 44,": "(['Bear in', 'the Boat'], 'Bear', 44,",
    "(['A Frog on', 'the Fan'], 'Frog', 44,": "(['Frog on', 'the Fan'], 'Frog', 44,",
    "(['A Jellyfish', 'in the Jar'], 'Jellyfish', 42,": "(['Jellyfish in', 'the Jar'], 'Jellyfish', 42,",
    "(['A Volcano', 'in the Van'], 'Volcano', 42,": "(['Volcano in', 'the Van'], 'Volcano', 42,",
    "(['A Whale in', 'the Wagon'], 'Whale', 42,": "(['Whale in', 'the Wagon'], 'Whale', 42,",
    # 'A Fox in a Box' is a single string literal -- already handled by _four_word_apply.py
    "(['A Yak on', 'the Yacht'], 'Yak', 44,": "(['Yak on', 'the Yacht'], 'Yak', 44,",
    "(['A Queen on', 'the Quilt'], 'Queen', 42,": "(['Queen on', 'the Quilt'], 'Queen', 42,",
}
for o, n in COVER_EDITS.items():
    edit(RD, o, n)

# ---- build_a5_readers.py: recap chants, x3 in the house 'drop' style -----
CHANTS = {
    "('', ['Snake, star,', 'soap, and seal', 'in my sock?!'], 100),":
        "('', ['In my sock?!', 'In my sock?!', 'In my sock?!'], 42, 'drop'),",
    "('', ['Apple! Apple!', 'Apple!'], 64, 'drop'),":
        "('', ['On my apple?!', 'On my apple?!', 'On my apple?!'], 42, 'drop'),",
    "('', ['A turtle, a tomato,', 'a toothbrush, and a tiger', 'in the taxi?!'], 100),":
        "('', ['In the taxi?!', 'In the taxi?!', 'In the taxi?!'], 42, 'drop'),",
    "('', ['An iguana, an insect,', 'an inchworm,', 'and an infant in the igloo?!'], 100),":
        "('', ['In the igloo?!', 'In the igloo?!', 'In the igloo?!'], 42, 'drop'),",
    "('', ['A nut, a net,', 'a nail, and a napkin', 'in the nest?!'], 100),":
        "('', ['In the nest?!', 'In the nest?!', 'In the nest?!'], 42, 'drop'),",
    "('', ['A mouse, a mushroom,', 'a magnet, and a monkey', 'in my mug???'], 100),":
        "('', ['In my mug?!', 'In my mug?!', 'In my mug?!'], 42, 'drop'),",
    "('', ['A dog, a doll,', 'a duck, and a dinosaur', 'on a drum?????'], 100),":
        "('', ['On a drum?!', 'On a drum?!', 'On a drum?!'], 42, 'drop'),",
    "('', ['An owl, an otter,', 'an ostrich, and an octopus', 'ate my oranges?!'], 100),":
        "('', ['Ate an orange?!', 'Ate an orange?!', 'Ate an orange?!'], 42, 'drop'),",
    "('', ['A cat, a cup,', 'a comb, and a cow', 'on the car?!'], 100),":
        "('', ['On the car?!', 'On the car?!', 'On the car?!'], 42, 'drop'),",
    "('', ['A key, a kite, a kettle,', 'and a koala', \"in the kangaroo's pocket?!\"], 100),":
        "('', ['In the pocket?!', 'In the pocket?!', 'In the pocket?!'], 42, 'drop'),",
    "('', ['A duck, a chick,', 'a clock, and a sock', 'on a rock?!'], 100),":
        "('', ['On a rock?!', 'On a rock?!', 'On a rock?!'], 42, 'drop'),",
    "('', ['A hen, an eagle,', 'and an elephant', 'sat on the egg?!'], 100),":
        "('', ['On the egg?!', 'On the egg?!', 'On the egg?!'], 42, 'drop'),",
    "('', ['A unicorn, a ukulele,', 'a unicycle, and an urchin', 'under my umbrella?!'], 100),":
        "('', ['Under my umbrella?!', 'Under my umbrella?!', 'Under my umbrella?!'], 42, 'drop'),",
    "('', ['A rabbit, a robot,', 'a rose, and a ring', 'in the rocket?!'], 100),":
        "('', ['In the rocket?!', 'In the rocket?!', 'In the rocket?!'], 42, 'drop'),",
    "('', ['A hen, a hammer,', 'a heart, and a horse', 'in my hat?!'], 100),":
        "('', ['In my hat?!', 'In my hat?!', 'In my hat?!'], 42, 'drop'),",
    "('', ['A ball, a banana,', 'a bell, and a bear', 'in the boat?!'], 100),":
        "('', ['In the boat?!', 'In the boat?!', 'In the boat?!'], 42, 'drop'),",
    "('', ['A frog, a fish,', 'a feather, and a fork', 'on the fan?!'], 100),":
        "('', ['On the fan?!', 'On the fan?!', 'On the fan?!'], 42, 'drop'),",
    "('', ['A jug, a jacket,', 'a jet, and a jellyfish', 'in the jar?!'], 100),":
        "('', ['In the jar?!', 'In the jar?!', 'In the jar?!'], 42, 'drop'),",
    "('', ['A violin, a vase,', 'a vest, and a volcano', 'in the van?!'], 100),":
        "('', ['In the van?!', 'In the van?!', 'In the van?!'], 42, 'drop'),",
    "('', ['A worm, a watch,', 'a wolf, and a whale', 'in the wagon?!'], 100),":
        "('', ['In the wagon?!', 'In the wagon?!', 'In the wagon?!'], 42, 'drop'),",
    "('', ['A fox, an ox,', 'and a xylophone', 'in a box?!'], 100),":
        "('', ['In a box?!', 'In a box?!', 'In a box?!'], 42, 'drop'),",
    "('', ['A yak, a yam,', 'a yo-yo, and yarn', 'on the yacht?!'], 100),":
        "('', ['On the yacht?!', 'On the yacht?!', 'On the yacht?!'], 42, 'drop'),",
    "('', ['A zebra,', 'a zipper, a zucchini,', 'and a zeppelin at the zoo?!'], 100),":
        "('', ['At the zoo?!', 'At the zoo?!', 'At the zoo?!'], 42, 'drop'),",
    "('', ['A quill, a quarter,', 'a quail, and a queen', 'on the quilt?!'], 100),":
        "('', ['On the quilt?!', 'On the quilt?!', 'On the quilt?!'], 42, 'drop'),",
    # the-fast: the decrescendo pair is banned by the LOCKED TEXT RULE anyway
    "('', [('Fast! Fast! Fast!', 1.0), ('Fast! Fast!', 0.75)], 100, 'drop'),":
        "('', ['Fast! Fast! Fast!'], 42, 'drop'),",
    "('', 'Lost! Lost! Lost!', 100, 'drop'),":
        "('', ['Lost! Lost! Lost!'], 42, 'drop'),",
    "('', 'Jump! Jump! Jump!', 100, 'drop'),":
        "('', ['Jump! Jump! Jump!'], 42, 'drop'),",
}
for o, n in CHANTS.items():
    edit(RD, o, n)


def main():
    dry = '--dry' in sys.argv
    cache = {}
    misses = []
    for path, old, new in EDITS:
        src = cache.get(path)
        if src is None:
            src = cache[path] = io.open(path, encoding='utf-8').read()
        c = src.count(old)
        if c != 1:
            misses.append((os.path.basename(path), c, old[:70]))
            continue
        cache[path] = src.replace(old, new)
    for path, src in cache.items():
        if not dry:
            io.open(path, 'w', encoding='utf-8').write(src)
    if misses:
        print('!! %d edits did not match exactly once:' % len(misses))
        for m in misses:
            print('   count=%d  %s  %r' % (m[1], m[0], m[2]))
        raise SystemExit(1)
    print('OK %d structural edits applied%s' % (len(EDITS), ' (dry run)' if dry else ''))


if __name__ == '__main__':
    main()
