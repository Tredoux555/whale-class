# -*- coding: utf-8 -*-
"""THE SECOND-LANGUAGE TRANSFORM  (Dark Phonics two-track pipeline)

Two tracks share one set of sources:

  FIRST LANGUAGE  (default, no flag)  the original longer sentences. Every
                                      existing path and URL. Nothing moves.
  SECOND LANGUAGE (--track second-language, or DP_TRACK=second-language)
                                      every sentence a child reads is NO MORE
                                      THAN FOUR WORDS, written into the
                                      `second-language/` output folders.

The source of truth for the second language is THIS TRANSFORM, applied to the
first-language data at build time -- never a second copy of the text. The
wordings are exactly the ones the 2026-09-07 four-word pass landed on
(_four_word_apply.py + _four_word_structural.py, now retired to history):
the-pit's "Cat in the... pit!", the recap "In the pit!" x3, the potato pages
"Not on the... mat!", the-cot's "Not in a... cot!", the chants x3 ending "?!".

API
---
  track()                     'first-language' | 'second-language' from argv/env
  is_second(track)            bool
  transform_sentence(s)       one sentence  -> its four-word form (identity if
                              already four words, or unknown)
  transform_lines(lines)      a stacked line list -> (lines, size_override|None)
  transform_book(book)        a build_booklets-shaped book dict (books_def /
                              make_book / load_reader_book) -> a new dict
  transform_reader_entry(e)   an easy-readers-manifest-v2 reader dict
  transform_dp_cfg(cfg)       a satpin-paperwork letters/dp-*.json dict
  patch_readers_module(mod)   rewrites build_a5_readers.COVERS/SPLITS in place
  out_root(kind, track)       the output directory for this track
  SKIP_SLUGS                  books with no reader built yet -- never touched

Nothing here mutates a file on disk. Import it, transform the data you already
loaded, write to out_root(...).
"""
import copy
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))

FIRST = 'first-language'
SECOND = 'second-language'

# Books with no reader built yet (art pending) -- the four-word pass never
# touched them and neither does this transform.
SKIP_SLUGS = ('the-vest', 'the-swim', 'the-yam', 'the-zip', 'the-quilt')


# ------------------------------------------------------------- the map ----
# Whole sentences (and whole nar lead-in fragments) -> four-word form.
SENT = {
    'A Bear in the Boat': 'Bear in the Boat',
    'A Cow on the Car': 'Cow on the Car',
    'A Dinosaur on a Drum': 'Dinosaur on a Drum',
    'A Fox in a Box': 'Fox in a Box',
    'A Frog on the Fan': 'Frog on the Fan',
    'A Horse in My Hat': 'Horse in My Hat',
    'A Jellyfish in the Jar': 'Jellyfish in the Jar',
    'A Koala in the Pocket': 'Koala in the Pocket',
    'A Monkey in My Mug': 'Monkey in My Mug',
    'A Queen on the Quilt': 'Queen on the Quilt',
    'A Rabbit in the Rocket': 'Rabbit in the Rocket',
    'A Tiger in the Taxi': 'Tiger in the Taxi',
    'A Volcano in the Van': 'Volcano in the Van',
    'A Whale in the Wagon': 'Whale in the Wagon',
    'A Yak on the Yacht': 'Yak on the Yacht',
    'A ball in the': 'Ball in the',
    'A ball in the boat!': 'Ball in the boat!',
    'A ball, a banana, a bell, and a bear in the boat?!': 'In the boat?!',
    'A banana in the': 'Banana in the',
    'A banana in the boat!': 'Banana in the boat!',
    'A bear in the': 'Bear in the',
    'A bear in the boat!': 'Bear in the boat!',
    'A bell in the': 'Bell in the',
    'A bell in the boat!': 'Bell in the boat!',
    'A big fox, a big mix.': 'Big fox, big mix.',
    'A big jump in the sand.': 'A big jump!',
    'A cat on a cat on a cat!': 'Cat on a cat!',
    'A cat on the': 'Cat on the',
    'A cat on the car!': 'Cat on the car!',
    'A cat sat on a cat.': 'Cat on a cat.',
    'A cat, a cup, a comb, and a cow on the car?!': 'On the car?!',
    'A chick on a': 'Chick on a',
    'A chick on a rock!': 'Chick on a rock!',
    'A clock on a': 'Clock on a',
    'A clock on a rock!': 'Clock on a rock!',
    'A comb on the': 'Comb on the',
    'A comb on the car!': 'Comb on the car!',
    'A cow on the': 'Cow on the',
    'A cow on the car!': 'Cow on the car!',
    'A cup on the': 'Cup on the',
    'A cup on the car!': 'Cup on the car!',
    'A dinosaur on a': 'Dinosaur on a',
    'A dinosaur on a drum?!': 'Dinosaur on a drum?!',
    'A dog on a': 'Dog on a',
    'A dog on a drum!': 'Dog on a drum!',
    'A dog, a doll, a duck, and a dinosaur on a drum?????': 'On a drum?!',
    'A doll on a': 'Doll on a',
    'A doll on a drum!': 'Doll on a drum!',
    'A duck on a': 'Duck on a',
    'A duck on a drum!': 'Duck on a drum!',
    'A duck on a rock!': 'Duck on a rock!',
    'A duck, a chick, a clock, and a sock on a rock?!': 'On a rock?!',
    'A feather on the': 'Feather on the',
    'A feather on the fan!': 'Feather on the fan!',
    'A fish on the': 'Fish on the',
    'A fish on the fan!': 'Fish on the fan!',
    'A fork on the': 'Fork on the',
    'A fork on the fan!': 'Fork on the fan!',
    'A fox in a': 'Fox in a',
    'A fox in a box!': 'Fox in a box!',
    'A fox, an ox, and a xylophone in a box?!': 'In a box?!',
    'A frog on the': 'Frog on the',
    'A frog on the fan!': 'Frog on the fan!',
    'A frog, a fish, a feather, and a fork on the fan?!': 'On the fan?!',
    'A hammer in my': 'Hammer in my',
    'A hammer in my hat!': 'Hammer in my hat!',
    'A heart in my': 'Heart in my',
    'A heart in my hat!': 'Heart in my hat!',
    'A hen in my': 'Hen in my',
    'A hen in my hat!': 'Hen in my hat!',
    'A hen, a hammer, a heart, and a horse in my hat?!': 'In my hat?!',
    'A hen, an eagle, and an elephant sat on the egg?!': 'On the egg?!',
    'A horse in my': 'Horse in my',
    'A horse in my hat!': 'Horse in my hat!',
    'A jacket in the': 'Jacket in the',
    'A jacket in the jar!': 'Jacket in the jar!',
    'A jellyfish in the': 'Jellyfish in the',
    'A jellyfish in the jar!': 'Jellyfish in the jar!',
    'A jet in the': 'Jet in the',
    'A jet in the jar!': 'Jet in the jar!',
    'A jug in the': 'Jug in the',
    'A jug in the jar!': 'Jug in the jar!',
    'A jug, a jacket, a jet, and a jellyfish in the jar?!': 'In the jar?!',
    'A kettle in the': 'Kettle in the',
    'A kettle in the pocket!': 'Kettle in the pocket!',
    'A key in the': 'Key in the',
    'A key in the pocket!': 'Key in the pocket!',
    "A key, a kite, a kettle, and a koala in the kangaroo's pocket?!": 'In the pocket?!',
    'A kite in the': 'Kite in the',
    'A kite in the pocket!': 'Kite in the pocket!',
    'A koala in the': 'Koala in the',
    'A koala in the pocket!': 'Koala in the pocket!',
    'A magnet in my': 'Magnet in my',
    'A magnet in my mug!': 'Magnet in my mug!',
    'A monkey in my': 'Monkey in my',
    'A monkey in my mug!': 'Monkey in my mug!',
    'A mouse in my': 'Mouse in my',
    'A mouse in my mug!': 'Mouse in my mug!',
    'A mouse, a mushroom, a magnet, and a monkey in my mug???': 'In my mug?!',
    'A mushroom in my': 'Mushroom in my',
    'A mushroom in my mug!': 'Mushroom in my mug!',
    'A nail in the': 'Nail in the',
    'A nail in the nest!': 'Nail in the nest!',
    'A napkin in the': 'Napkin in the',
    'A napkin in the nest!': 'Napkin in the nest!',
    'A net in the': 'Net in the',
    'A net in the nest!': 'Net in the nest!',
    'A nut in the': 'Nut in the',
    'A nut in the nest!': 'Nut in the nest!',
    'A nut, a net, a nail, and a napkin in the nest?!': 'In the nest?!',
    'A quail on the': 'Quail on the',
    'A quail on the quilt!': 'Quail on the quilt!',
    'A quarter on the': 'Quarter on the',
    'A quarter on the quilt!': 'Quarter on the quilt!',
    'A queen on the': 'Queen on the',
    'A queen on the quilt!': 'Queen on the quilt!',
    'A quill on the': 'Quill on the',
    'A quill on the quilt!': 'Quill on the quilt!',
    'A quill, a quarter, a quail, and a queen on the quilt?!': 'On the quilt?!',
    'A rabbit in the': 'Rabbit in the',
    'A rabbit in the rocket!': 'Rabbit in the rocket!',
    'A rabbit, a robot, a rose, and a ring in the rocket?!': 'In the rocket?!',
    'A ring in the': 'Ring in the',
    'A ring in the rocket!': 'Ring in the rocket!',
    'A robot in the': 'Robot in the',
    'A robot in the rocket!': 'Robot in the rocket!',
    'A rose in the': 'Rose in the',
    'A rose in the rocket!': 'Rose in the rocket!',
    'A sock on a': 'Sock on a',
    'A sock on a rock!': 'Sock on a rock!',
    'A tiger in the': 'Tiger in the',
    'A tiger in the taxi!': 'Tiger in the taxi!',
    'A tomato in the': 'Tomato in the',
    'A tomato in the taxi!': 'Tomato in the taxi!',
    'A toothbrush in the': 'Toothbrush in the',
    'A toothbrush in the taxi!': 'Toothbrush in the taxi!',
    'A turtle in the': 'Turtle in the',
    'A turtle in the taxi!': 'Turtle in the taxi!',
    'A turtle, a tomato, a toothbrush, and a tiger in the taxi?!': 'In the taxi?!',
    'A ukulele under my': 'Ukulele under my',
    'A ukulele under my umbrella!': 'Ukulele under my umbrella!',
    'A unicorn under my': 'Unicorn under my',
    'A unicorn under my umbrella!': 'Unicorn under my umbrella!',
    'A unicorn, a ukulele, a unicycle, and an urchin under my umbrella?!': 'Under my umbrella?!',
    'A unicycle under my': 'Unicycle under my',
    'A unicycle under my umbrella!': 'Unicycle under my umbrella!',
    'A vase in the': 'Vase in the',
    'A vase in the van!': 'Vase in the van!',
    'A vest in the': 'Vest in the',
    'A vest in the van!': 'Vest in the van!',
    'A violin in the': 'Violin in the',
    'A violin in the van!': 'Violin in the van!',
    'A violin, a vase, a vest, and a volcano in the van?!': 'In the van?!',
    'A volcano in the': 'Volcano in the',
    'A volcano in the van!': 'Volcano in the van!',
    'A watch in the': 'Watch in the',
    'A watch in the wagon!': 'Watch in the wagon!',
    'A whale in the': 'Whale in the',
    'A whale in the wagon!': 'Whale in the wagon!',
    'A wolf in the': 'Wolf in the',
    'A wolf in the wagon!': 'Wolf in the wagon!',
    'A worm in the': 'Worm in the',
    'A worm in the wagon!': 'Worm in the wagon!',
    'A worm, a watch, a wolf, and a whale in the wagon?!': 'In the wagon?!',
    'A xylophone in a': 'Xylophone in a',
    'A xylophone in a box!': 'Xylophone in a box!',
    'A yak on the': 'Yak on the',
    'A yak on the yacht!': 'Yak on the yacht!',
    'A yak, a yam, a yo-yo, and yarn on the yacht?!': 'On the yacht?!',
    'A yam on the': 'Yam on the',
    'A yam on the yacht!': 'Yam on the yacht!',
    'A yo-yo on the': 'Yo-yo on the',
    'A yo-yo on the yacht!': 'Yo-yo on the yacht!',
    'A zebra at the': 'Zebra at the',
    'A zebra at the zoo!': 'Zebra at the zoo!',
    'A zebra, a zipper, a zucchini, and a zeppelin at the zoo?!': 'At the zoo?!',
    'A zeppelin at the': 'Zeppelin at the',
    'A zeppelin at the zoo!': 'Zeppelin at the zoo!',
    'A zipper at the': 'Zipper at the',
    'A zipper at the zoo!': 'Zipper at the zoo!',
    'A zucchini at the': 'Zucchini at the',
    'A zucchini at the zoo!': 'Zucchini at the zoo!',
    'An Owl Ate an Orange': 'Owl Ate an Orange',
    'An alligator on my apple!': 'Alligator on my apple!',
    'An alligator on my…': 'Alligator on my…',
    'An ambulance on my apple!': 'Ambulance on my apple!',
    'An ambulance on my…': 'Ambulance on my…',
    'An ant naps in a': 'Ant in a',
    'An ant on my apple!': 'Ant on my apple!',
    'An ant on my…': 'Ant on my…',
    'An ant, an alligator, an anteater, and an ambulance on my apple?!': 'On my apple?!',
    'An anteater on my apple!': 'Anteater on my apple!',
    'An anteater on my…': 'Anteater on my…',
    'An iguana in the': 'Iguana in the',
    'An iguana in the igloo!': 'Iguana in the igloo!',
    'An iguana, an insect, an inchworm, and an infant in the igloo?!': 'In the igloo?!',
    'An inchworm in the': 'Inchworm in the',
    'An inchworm in the igloo!': 'Inchworm in the igloo!',
    'An infant in the': 'Infant in the',
    'An infant in the igloo!': 'Infant in the igloo!',
    'An insect in the': 'Insect in the',
    'An insect in the igloo!': 'Insect in the igloo!',
    'An octopus ate an': 'Octopus ate an',
    'An octopus ate an orange!': 'Octopus ate an orange!',
    'An ostrich ate an': 'Ostrich ate an',
    'An ostrich ate an orange!': 'Ostrich ate an orange!',
    'An otter ate an': 'Otter ate an',
    'An otter ate an orange!': 'Otter ate an orange!',
    'An owl ate an': 'Owl ate an',
    'An owl ate an orange!': 'Owl ate an orange!',
    'An owl, an otter, an ostrich, and an octopus ate my oranges?!': 'Ate an orange?!',
    'An ox in a': 'Ox in a',
    'An ox in a box!': 'Ox in a box!',
    'An urchin under my': 'Urchin under my',
    'An urchin under my umbrella!': 'Urchin under my umbrella!',
    'Now the whole crew is not…': 'Crew is not…',
    'Off the hill it fell.': 'Off the hill!',
    'Six fox in a box!': 'Fox in a box!',
    'Snake, star, soap, and seal in my sock?!': 'In my sock?!',
    'The Elephant Sat on the Egg': 'Elephant on the Egg',
    'The ___ Chased the Rat!': '___ Chased the Rat!',
    'The ___ Has a Dog!': '___ Has a Dog!',
    'The ___ Has a Kit!': '___ Has a Kit!',
    'The ___ Has an Egg!': '___ Has an Egg!',
    'The ___ Is in the Mud!': 'In the Mud!',
    'The ___ Sat in a Cot!': 'In a Cot!',
    'The ___ Sat in the Pit!': 'In the Pit!',
    'The ___ Sat on the Mat!': 'On the Mat!',
    'The ___ Saw a Bug!': '___ Saw a Bug!',
    'The ant chased the rat!': 'Ant chased the rat!',
    'The ant chased the rat.': 'Ant chased the rat.',
    'The ant chased the…': 'Ant chased the…',
    'The ant has a dog!': 'Ant has a dog!',
    'The ant has a dog.': 'Ant has a dog.',
    'The ant has a kit!': 'Ant has a kit!',
    'The ant has a kit.': 'Ant has a kit.',
    'The ant has an egg!': 'Ant has an egg!',
    'The ant has an egg.': 'Ant has an egg.',
    'The ant has an…': 'Ant has an…',
    'The ant has a…': 'Ant has a…',
    'The ant is in the mud!': 'Ant in the mud!',
    'The ant is in the mud.': 'Ant in the mud.',
    'The ant is in the…': 'Ant in the…',
    'The ant sat in a cot!': 'Ant in a cot!',
    'The ant sat in a cot.': 'Ant in a cot.',
    'The ant sat in a…': 'Ant in a…',
    'The ant sat in the pit!': 'Ant in the pit!',
    'The ant sat in the pit.': 'Ant in the pit.',
    'The ant sat on the mat!': 'Ant on the mat!',
    'The ant sat on the…': 'Ant on the…',
    'The ant saw a bug!': 'Ant saw a bug!',
    'The ant saw a bug.': 'Ant saw a bug.',
    'The ant saw a…': 'Ant saw a…',
    'The ant, the apple, the sun, the star, the snake and the cat: fast, fast, fast!': 'Fast! Fast! Fast!',
    'The ant, the apple, the sun, the star, the snake and the cat: lost, lost, lost!': 'Lost! Lost! Lost!',
    'The apple chased the rat!': 'Apple chased the rat!',
    'The apple chased the rat.': 'Apple chased the rat.',
    'The apple chased the…': 'Apple chased the…',
    'The apple has a dog!': 'Apple has a dog!',
    'The apple has a dog.': 'Apple has a dog.',
    'The apple has a kit!': 'Apple has a kit!',
    'The apple has a kit.': 'Apple has a kit.',
    'The apple has an egg!': 'Apple has an egg!',
    'The apple has an egg.': 'Apple has an egg.',
    'The apple has an…': 'Apple has an…',
    'The apple has a…': 'Apple has a…',
    'The apple is in the mud!': 'Apple in the mud!',
    'The apple is in the mud.': 'Apple in the mud.',
    'The apple is in the…': 'Apple in the…',
    'The apple sat in a cot!': 'Apple in a cot!',
    'The apple sat in a cot.': 'Apple in a cot.',
    'The apple sat in a…': 'Apple in a…',
    'The apple sat in the pit!': 'Apple in the pit!',
    'The apple sat in the pit.': 'Apple in the pit.',
    'The apple sat on the mat!': 'Apple on the mat!',
    'The apple sat on the…': 'Apple on the…',
    'The apple saw a bug!': 'Apple saw a bug!',
    'The apple saw a bug.': 'Apple saw a bug.',
    'The apple saw a…': 'Apple saw a…',
    'The bug saw a potato!': 'Bug saw a potato!',
    'The bug saw a…': 'Bug saw a…',
    'The cat chased the rat!': 'Cat chased the rat!',
    'The cat chased the rat.': 'Cat chased the rat.',
    'The cat chased the…': 'Cat chased the…',
    'The cat has a dog!': 'Cat has a dog!',
    'The cat has a dog.': 'Cat has a dog.',
    'The cat has a kit!': 'Cat has a kit!',
    'The cat has a kit.': 'Cat has a kit.',
    'The cat has an egg!': 'Cat has an egg!',
    'The cat has an egg.': 'Cat has an egg.',
    'The cat has an…': 'Cat has an…',
    'The cat has a…': 'Cat has a…',
    'The cat is in the mud!': 'Cat in the mud!',
    'The cat is in the mud.': 'Cat in the mud.',
    'The cat is in the…': 'Cat in the…',
    'The cat is on the cot.': 'Cat on the cot.',
    'The cat sat in a cot!': 'Cat in a cot!',
    'The cat sat in a cot.': 'Cat in a cot.',
    'The cat sat in a…': 'Cat in a…',
    'The cat sat in the pit!': 'Cat in the pit!',
    'The cat sat in the pit.': 'Cat in the pit.',
    'The cat sat on the mat!': 'Cat on the mat!',
    'The cat sat on the…': 'Cat on the…',
    'The cat saw a bug!': 'Cat saw a bug!',
    'The cat saw a bug.': 'Cat saw a bug.',
    'The cat saw a…': 'Cat saw a…',
    'The chick is on the fish!': 'Chick on the fish!',
    'The crew helps the potato!': 'Crew helps the potato!',
    'The crew helps the…': 'Crew helps the…',
    'The eagle sat on the': 'Eagle on the',
    'The eagle sat on the egg.': 'Eagle on the egg.',
    'The elephant sat on the': 'Elephant on the',
    'The elephant sat on the egg.': 'Elephant on the egg.',
    'The fish and the chick.': 'Fish and the chick.',
    'The frog and the crab.': 'Frog and the crab.',
    'The frog sat on the crab!': 'Frog on the crab!',
    'The goat ate my gift!': 'Goat ate my gift!',
    'The goat ate my gloves!': 'Goat ate my gloves!',
    'The goat ate my grapes!': 'Goat ate my grapes!',
    'The goat ate my…': 'Goat ate my…',
    'The goat plays my guitar?!': 'Goat plays my guitar?!',
    'The goat plays my…': 'Goat plays my…',
    'The hen ran to the bed.': 'Hen ran to bed.',
    'The hen sat on the': 'Hen on the',
    'The hen sat on the egg.': 'Hen on the egg.',
    'The lion licks a ladder!': 'Lion licks a ladder!',
    'The lion licks a leaf!': 'Lion licks a leaf!',
    'The lion licks a lemon!': 'Lion licks a lemon!',
    'The lion licks a lizard!': 'Lion licks a lizard!',
    'The lion licks a…': 'Lion licks a…',
    "The potato didn't chase the rat!": "Didn't chase the rat!",
    "The potato didn't chase the…": "Didn't chase the…",
    "The potato didn't sit in a cot!": 'Not in a cot!',
    "The potato didn't sit on the mat!": 'Not on the mat!',
    'The potato didn’t sit in a cot!': 'Not in a cot!',
    'The potato didn’t sit in a…': 'Not in a…',
    'The potato didn’t sit on the mat!': 'Not on the mat!',
    'The potato didn’t sit on the…': 'Not on the…',
    "The potato doesn't have a kit!": 'Potato has no kit!',
    "The potato doesn't have a…": 'Potato has no…',
    'The potato had an egg!': 'Potato had an egg!',
    'The potato had an…': 'Potato had an…',
    'The potato has 5 dogs!': 'Potato has 5 dogs!',
    'The potato has 5…': 'Potato has 5…',
    'The potato in my': 'Potato in my',
    'The potato in my sock?': 'Potato in my sock?',
    'The potato is not': 'Potato is not',
    'The potato is not fast.': 'Potato is not fast.',
    'The potato is not lost.': 'Potato is not lost.',
    'The potato is not sad!': 'Potato is not sad!',
    'The potato is not…': 'Potato is not…',
    "The potato isn't in the mud!": 'Not in the mud!',
    "The potato isn't in the…": 'Not in the…',
    'The potato sat in the pit!': 'Potato in the pit!',
    'The pup is a mud pup.': 'A mud pup!',
    'The pup is in mud.': 'Pup is in mud.',
    'The snake chased the rat!': 'Snake chased the rat!',
    'The snake chased the rat.': 'Snake chased the rat.',
    'The snake chased the…': 'Snake chased the…',
    'The snake has a dog!': 'Snake has a dog!',
    'The snake has a dog.': 'Snake has a dog.',
    'The snake has a kit!': 'Snake has a kit!',
    'The snake has a kit.': 'Snake has a kit.',
    'The snake has an egg!': 'Snake has an egg!',
    'The snake has an egg.': 'Snake has an egg.',
    'The snake has an…': 'Snake has an…',
    'The snake has a…': 'Snake has a…',
    'The snake is in the mud!': 'Snake in the mud!',
    'The snake is in the mud.': 'Snake in the mud.',
    'The snake is in the…': 'Snake in the…',
    'The snake sat in a cot!': 'Snake in a cot!',
    'The snake sat in a cot.': 'Snake in a cot.',
    'The snake sat in a…': 'Snake in a…',
    'The snake sat in the pit!': 'Snake in the pit!',
    'The snake sat in the pit.': 'Snake in the pit.',
    'The snake sat on the mat!': 'Snake on the mat!',
    'The snake sat on the…': 'Snake on the…',
    'The snake saw a bug!': 'Snake saw a bug!',
    'The snake saw a bug.': 'Snake saw a bug.',
    'The snake saw a…': 'Snake saw a…',
    'The star chased the rat!': 'Star chased the rat!',
    'The star chased the rat.': 'Star chased the rat.',
    'The star chased the…': 'Star chased the…',
    'The star has a dog!': 'Star has a dog!',
    'The star has a dog.': 'Star has a dog.',
    'The star has a kit!': 'Star has a kit!',
    'The star has a kit.': 'Star has a kit.',
    'The star has an egg!': 'Star has an egg!',
    'The star has an egg.': 'Star has an egg.',
    'The star has an…': 'Star has an…',
    'The star has a…': 'Star has a…',
    'The star is in the mud!': 'Star in the mud!',
    'The star is in the mud.': 'Star in the mud.',
    'The star is in the…': 'Star in the…',
    'The star sat in a cot!': 'Star in a cot!',
    'The star sat in a cot.': 'Star in a cot.',
    'The star sat in a…': 'Star in a…',
    'The star sat in the pit!': 'Star in the pit!',
    'The star sat in the pit.': 'Star in the pit.',
    'The star sat on the mat!': 'Star on the mat!',
    'The star sat on the…': 'Star on the…',
    'The star saw a bug!': 'Star saw a bug!',
    'The star saw a bug.': 'Star saw a bug.',
    'The star saw a…': 'Star saw a…',
    'The sun chased the rat!': 'Sun chased the rat!',
    'The sun chased the rat.': 'Sun chased the rat.',
    'The sun chased the…': 'Sun chased the…',
    'The sun has a dog!': 'Sun has a dog!',
    'The sun has a dog.': 'Sun has a dog.',
    'The sun has a kit!': 'Sun has a kit!',
    'The sun has a kit.': 'Sun has a kit.',
    'The sun has an egg!': 'Sun has an egg!',
    'The sun has an egg.': 'Sun has an egg.',
    'The sun has an…': 'Sun has an…',
    'The sun has a…': 'Sun has a…',
    'The sun is in the mud!': 'Sun in the mud!',
    'The sun is in the mud.': 'Sun in the mud.',
    'The sun is in the…': 'Sun in the…',
    'The sun sat in a cot!': 'Sun in a cot!',
    'The sun sat in a cot.': 'Sun in a cot.',
    'The sun sat in a…': 'Sun in a…',
    'The sun sat in the pit!': 'Sun in the pit!',
    'The sun sat in the pit.': 'Sun in the pit.',
    'The sun sat on the mat!': 'Sun on the mat!',
    'The sun sat on the…': 'Sun on the…',
    'The sun saw a bug!': 'Sun saw a bug!',
    'The sun saw a bug.': 'Sun saw a bug.',
    'The sun saw a…': 'Sun saw a…',
}


# ------------------------------------------------- structural rewrites ----
# Line STACKS (cover title_lines, recap chants) are not single sentences, so
# they are keyed by the whole tuple. Value: (new_lines, new_size_or_None).
LINES = {}


def _L(old, new, size=None):
    LINES[tuple(old)] = (list(new), size)


# --- build_a5_readers.COVERS: cover title lines ---------------------------
_L(['An ___ on my', 'apple!'], ['___ on my', 'apple!'], 40)
_L(['A Tiger in', 'the Taxi'], ['Tiger in', 'the Taxi'], 42)
_L(['A Monkey', 'in My Mug'], ['Monkey in', 'My Mug'], 42)
_L(['A Dinosaur', 'on a Drum'], ['Dinosaur on', 'a Drum'], 42)
_L(['An Owl Ate', 'an Orange'], ['Owl Ate', 'an Orange'], 42)
_L(['A Cow on', 'the Car'], ['Cow on', 'the Car'], 44)
_L(['A Koala in', 'the Pocket'], ['Koala in', 'the Pocket'], 42)
_L(['The Elephant', 'Sat on the Egg'], ['Elephant on', 'the Egg'], 44)
_L(['A Rabbit in', 'the Rocket'], ['Rabbit in', 'the Rocket'], 42)
_L(['A Horse', 'in My Hat'], ['Horse in', 'My Hat'], 44)
_L(['A Bear in', 'the Boat'], ['Bear in', 'the Boat'], 44)
_L(['A Frog on', 'the Fan'], ['Frog on', 'the Fan'], 44)
_L(['A Jellyfish', 'in the Jar'], ['Jellyfish in', 'the Jar'], 42)
_L(['A Volcano', 'in the Van'], ['Volcano in', 'the Van'], 42)
_L(['A Whale in', 'the Wagon'], ['Whale in', 'the Wagon'], 42)
_L(['A Yak on', 'the Yacht'], ['Yak on', 'the Yacht'], 44)
_L(['A Queen on', 'the Quilt'], ['Queen on', 'the Quilt'], 42)
# ('A Fox in a Box' is a single string -- SENT handles it.)

# --- books_def.py: letter-book cover title_lines --------------------------
_L(['The ___ Sat', 'on the Mat!'], ['On the Mat!'], 46)
_L(['The ___ Sat', 'in the Pit!'], ['In the Pit!'], 46)
# the-pit, the model book: lead-ins cut by hand on 2026-09-07, recap x3.
# --- corrections pass 2 (2026-09-07): hand rulings that came after the
# one-off literal map, taken from the readers/works Tredoux signed off on.
SENT['A fox in a box.'] = 'Fox in a box.'
SENT['Six fox in a box!'] = 'Six in a box!'     # keeps the six-fox gag
SENT['A hen in my bed!'] = 'Hen in my bed!'
SENT['A bell on a hill.'] = 'Bell on a hill.'

_L(['Sat in the pit!', 'Sat in the pit!', 'Sat in the pit!'],
   ['In the pit!', 'In the pit!', 'In the pit!'], 42)
for _w in ('ant', 'apple', 'sun', 'star', 'snake', 'cat'):
    SENT.setdefault('The %s sat in the\u2026' % _w, '%s in the\u2026' % _w.capitalize())

_L(['The ___', 'Sat in a Cot!'], ['In a Cot!'], 46)
_L(['The ___', 'Is in the Mud!'], ['In the Mud!'], 46)
_L(['The ___', 'Has a Dog!'], ['___ Has', 'a Dog!'], 44)
_L(['The ___', 'Has a Kit!'], ['___ Has', 'a Kit!'], 44)
_L(['The ___', 'Has an Egg!'], ['___ Has', 'an Egg!'], 42)
_L(['The ___', 'Chased the Rat!'], ['___ Chased', 'the Rat!'], 42)
_L(['The ___', 'Saw a Bug!'], ['___ Saw', 'a Bug!'], 44)

# --- books_def.py: the-tall recap chant, nap-ant-nap whisper stack --------
_L(['A turtle, a tomato,', 'a toothbrush, a tiger,', 'and a taxi — all tall?!'],
   ['All tall?!', 'All tall?!', 'All tall?!'], 42)
_L(['An ant naps', 'in a…'], ['Ant naps', 'in a…'])

# --- build_a5_readers.SPLITS: recap chants, tail phrase x3, 'drop' --------
_CHANTS = [
    (['Snake, star,', 'soap, and seal', 'in my sock?!'], 'In my sock?!'),
    (['Apple! Apple!', 'Apple!'], 'On my apple?!'),
    (['A turtle, a tomato,', 'a toothbrush, and a tiger', 'in the taxi?!'], 'In the taxi?!'),
    (['An iguana, an insect,', 'an inchworm,', 'and an infant in the igloo?!'], 'In the igloo?!'),
    (['A nut, a net,', 'a nail, and a napkin', 'in the nest?!'], 'In the nest?!'),
    (['A mouse, a mushroom,', 'a magnet, and a monkey', 'in my mug???'], 'In my mug?!'),
    (['A dog, a doll,', 'a duck, and a dinosaur', 'on a drum?????'], 'On a drum?!'),
    (['An owl, an otter,', 'an ostrich, and an octopus', 'ate my oranges?!'], 'Ate an orange?!'),
    (['A cat, a cup,', 'a comb, and a cow', 'on the car?!'], 'On the car?!'),
    (['A key, a kite, a kettle,', 'and a koala', "in the kangaroo's pocket?!"], 'In the pocket?!'),
    (['A duck, a chick,', 'a clock, and a sock', 'on a rock?!'], 'On a rock?!'),
    (['A hen, an eagle,', 'and an elephant', 'sat on the egg?!'], 'On the egg?!'),
    (['A unicorn, a ukulele,', 'a unicycle, and an urchin', 'under my umbrella?!'],
     'Under my umbrella?!'),
    (['A rabbit, a robot,', 'a rose, and a ring', 'in the rocket?!'], 'In the rocket?!'),
    (['A hen, a hammer,', 'a heart, and a horse', 'in my hat?!'], 'In my hat?!'),
    (['A ball, a banana,', 'a bell, and a bear', 'in the boat?!'], 'In the boat?!'),
    (['A frog, a fish,', 'a feather, and a fork', 'on the fan?!'], 'On the fan?!'),
    (['A jug, a jacket,', 'a jet, and a jellyfish', 'in the jar?!'], 'In the jar?!'),
    (['A violin, a vase,', 'a vest, and a volcano', 'in the van?!'], 'In the van?!'),
    (['A worm, a watch,', 'a wolf, and a whale', 'in the wagon?!'], 'In the wagon?!'),
    (['A fox, an ox,', 'and a xylophone', 'in a box?!'], 'In a box?!'),
    (['A yak, a yam,', 'a yo-yo, and yarn', 'on the yacht?!'], 'On the yacht?!'),
    (['A zebra,', 'a zipper, a zucchini,', 'and a zeppelin at the zoo?!'], 'At the zoo?!'),
    (['A quill, a quarter,', 'a quail, and a queen', 'on the quilt?!'], 'On the quilt?!'),
]
for _old, _tail in _CHANTS:
    _L(_old, [_tail, _tail, _tail], 42)

# the-fast / the-lost / the-jump recap: one line, no decrescendo pair.
CHANT_SINGLES = {
    (('Fast! Fast! Fast!', 1.0), ('Fast! Fast!', 0.75)): ['Fast! Fast! Fast!'],
    'Lost! Lost! Lost!': ['Lost! Lost! Lost!'],
    'Jump! Jump! Jump!': ['Jump! Jump! Jump!'],
}
CHANT_SINGLE_SIZE = 42


# --------------------------------------------------------------- track ----
def track(argv=None):
    """'second-language' if --track second-language / --second-language is on
    the command line or DP_TRACK says so; 'first-language' otherwise."""
    argv = list(sys.argv if argv is None else argv)
    for i, a in enumerate(argv):
        if a == '--track' and i + 1 < len(argv):
            return _norm(argv[i + 1])
        if a.startswith('--track='):
            return _norm(a.split('=', 1)[1])
        if a in ('--second-language', '--l2'):
            return SECOND
    return _norm(os.environ.get('DP_TRACK', FIRST))


def _norm(v):
    v = (v or '').strip().lower()
    if v in ('second-language', 'second', 'l2', '2'):
        return SECOND
    if v in ('', 'first-language', 'first', 'l1', '1'):
        return FIRST
    raise SystemExit('unknown track %r (use first-language | second-language)' % v)


def strip_track_args(argv):
    """argv with the track flags removed, so an existing parser still works."""
    out, skip = [], False
    for i, a in enumerate(argv):
        if skip:
            skip = False
            continue
        if a == '--track':
            skip = True
            continue
        if a.startswith('--track=') or a in ('--second-language', '--l2'):
            continue
        out.append(a)
    return out


def is_second(tr=None):
    return (tr if tr is not None else track()) == SECOND


# Output roots, per track. FIRST keeps every existing path exactly as it is.
_ROOTS = {
    'print':     ('public', 'dark-phonics-books', 'print'),
    'covers':    ('public', 'dark-phonics-books', 'covers'),
    'works':     ('public', 'dark-phonics-books', 'works'),
    'materials': ('public', 'dark-phonics-materials'),
    'satpin':    ('public', 'satpin-materials'),
}


def out_root(kind, tr=None, repo=None):
    repo = repo or REPO
    parts = _ROOTS[kind]
    if not is_second(tr):
        return os.path.join(repo, *parts)
    if kind in ('print', 'covers', 'works'):
        return os.path.join(repo, 'public', 'dark-phonics-books', SECOND, parts[-1])
    return os.path.join(repo, *parts, SECOND)


# ----------------------------------------------------------- transforms ---
def transform_sentence(s):
    """One sentence (or one nar lead-in fragment) -> its four-word form.

    Unknown / already-four-word strings come back byte-identical."""
    if not isinstance(s, str):
        return s
    return SENT.get(s, s)


def transform_lines(lines):
    """A stacked line list -> (new_lines, size_override or None)."""
    if isinstance(lines, str):
        return transform_sentence(lines), None
    key = tuple(lines)
    if key in LINES:
        new, size = LINES[key]
        return list(new), size
    if key in CHANT_SINGLES:
        return list(CHANT_SINGLES[key]), CHANT_SINGLE_SIZE
    return [transform_sentence(x) for x in lines], None


def _transform_text_field(v):
    """A spread's nar/text: str, list of lines, or list of (str, scale)."""
    if v is None:
        return None, None
    if isinstance(v, str):
        if v in CHANT_SINGLES:
            return list(CHANT_SINGLES[v]), CHANT_SINGLE_SIZE
        return transform_sentence(v), None
    if isinstance(v, (list, tuple)):
        key = tuple(tuple(x) if isinstance(x, list) else x for x in v)
        if key in CHANT_SINGLES:
            return list(CHANT_SINGLES[key]), CHANT_SINGLE_SIZE
        return transform_lines(list(v))
    return v, None


def transform_book(book):
    """A build_booklets-shaped book dict -> a new dict in the second language.

    Handles books_def.BOOKS entries, build_a5_readers.make_book() output and
    build_tracing_booklet.load_reader_book() output -- they are the same shape.
    """
    b = copy.deepcopy(book)
    if b.get('slug') in SKIP_SLUGS:
        return b
    if b.get('title_lines'):
        lines, size = transform_lines(b['title_lines'])
        b['title_lines'] = lines
        if size:
            b['title_size'] = size
    if b.get('title'):
        b['title'] = transform_sentence(b['title'])
    for sp in b.get('spreads', []):
        for field in ('nar', 'text'):
            if field not in sp:
                continue
            new, size = _transform_text_field(sp[field])
            sp[field] = new
            if size:
                sp['size'] = size
                sp['style'] = sp.get('style') or 'drop'
    return b


def transform_reader_entry(entry):
    """easy-readers-manifest-v2.json reader dict."""
    e = copy.deepcopy(entry)
    if e.get('slug') in SKIP_SLUGS:
        return e
    if e.get('title'):
        e['title'] = transform_sentence(e['title'])
    for p in e.get('pages', []):
        if 'text' in p:
            p['text'] = transform_sentence(p['text'])
    return e


def transform_dp_cfg(cfg):
    """satpin-paperwork letters/dp-<slug>.json dict."""
    c = copy.deepcopy(cfg)
    if c.get('bookTitle'):
        c['bookTitle'] = transform_sentence(c['bookTitle'])
    for key in ('pages', 'sentences', 'items'):
        for p in c.get(key, []) or []:
            if isinstance(p, dict) and 'sentence' in p:
                p['sentence'] = transform_sentence(p['sentence'])
    return c


def patch_readers_module(mod):
    """Rewrite build_a5_readers.COVERS / .SPLITS in place, second language."""
    covers = {}
    for slug, row in mod.COVERS.items():
        lines, accent, tsize, oral = row[0], row[1], row[2], row[3]
        rest = tuple(row[4:])
        new_lines, size = transform_lines(list(lines))
        covers[slug] = (new_lines, accent, size or tsize, oral) + rest
    mod.COVERS = covers

    splits = {}
    for slug, pages in mod.SPLITS.items():
        rows = []
        for split in pages:
            nar, shout, size = split[0], split[1], split[2]
            style = split[3] if len(split) > 3 else None
            new_nar, nsize = _transform_text_field(nar)
            new_shout, ssize = _transform_text_field(shout)
            size = ssize or nsize or size
            if (ssize or nsize) and not style:
                style = 'drop'
            row = [new_nar, new_shout, size]
            if style:
                row.append(style)
            rows.append(tuple(row))
        splits[slug] = rows
    mod.SPLITS = splits
    return mod


# ------------------------------------------------------- rule 7: sync -----
# "Works, tracing and paperwork text must match the book text 1:1." The dp
# paperwork sentences are COPIES of the reader page, never a separate rewrite,
# so in the second language they are re-derived from the second-language
# reader rather than transformed on their own. (The first language is left
# exactly as it is -- this only ever runs on the second-language track.)
import json  # noqa: E402
import re    # noqa: E402

_PAGENUM = re.compile(r'p(\d+)', re.I)


def _pkey(art):
    """A page's identity across the three naming conventions: its NUMBER.
    'p2-ant.png', 'pit-p2.png' and 'p2-ant' all answer 2."""
    m = _PAGENUM.search(os.path.basename(art or ''))
    return int(m.group(1)) if m else None


def _line(t):
    if isinstance(t, (tuple, list)) and t and isinstance(t[0], str):
        return t[0]
    return t if isinstance(t, str) else ''


_CACHE = {}


def _sources(repo=None):
    """(clean_sentence, SPLITS, MF, BOOKS, EASYR) -- all second-language."""
    repo = repo or REPO
    if repo in _CACHE:
        return _CACHE[repo]
    for d in ('flashcards', 'book-works', 'dark-phonics-storybooks'):
        d = os.path.join(repo, 'scripts', 'curriculum', d)
        if d not in sys.path:
            sys.path.insert(0, d)
    from build_book_works import clean_sentence
    from books_def import BOOKS
    import build_a5_readers as readers

    splits = {}
    for slug, pages in readers.SPLITS.items():
        rows = []
        for sp in pages:
            nar, _ = _transform_text_field(sp[0])
            txt, _ = _transform_text_field(sp[1])
            rows.append((nar, txt))
        splits[slug] = rows

    mf = {}
    for b in json.load(io.open(
            os.path.join(repo, 'scripts', 'curriculum', 'dark-phonics-storybooks',
                         'manifest.json'), encoding='utf-8'))['books']:
        b = copy.deepcopy(b)
        if b.get('title'):
            b['title'] = transform_sentence(b['title'])
        mf[b['slug']] = b
    easy = {r['slug']: transform_reader_entry(r) for r in json.load(io.open(
        os.path.join(repo, 'lib', 'montree', 'english-curriculum', 'spec',
                     'easy-readers-manifest-v2.json'), encoding='utf-8'))['readers']}
    books = {b['slug']: transform_book(b) for b in BOOKS}
    _CACHE[repo] = (clean_sentence, splits, mf, books, easy)
    return _CACHE[repo]


def reader_pages(slug, easy_hint=False, repo=None):
    """(title, {page number: the sentence the SECOND-LANGUAGE reader prints}).

    Resolution order is the one rule 7 uses: an .jpg/.jpeg-art book is an Easy
    Reader; otherwise the pattern storybook (SPLITS + manifest) governs, and
    books_def is the fallback for the letter books."""
    clean_sentence, SPLITS, MF, BOOKS, EASYR = _sources(repo)
    if easy_hint and slug in EASYR:
        r = EASYR[slug]
        return r.get('title'), {p['n']: p['text'] for p in r['pages']}
    if slug in SPLITS and slug in MF:
        pages = {}
        for pg, (nar, text) in zip(MF[slug]['pages'], SPLITS[slug]):
            joined = ' '.join(_line(t) for t in text) if isinstance(text, (list, tuple)) \
                else (text or '')
            if not joined.strip():
                continue
            pages[_pkey(pg['key'])] = clean_sentence(nar, joined)
        return MF[slug].get('title'), pages
    book = BOOKS.get(slug)
    if book is not None:
        pages = {}
        for sp in book['spreads']:
            art = sp.get('art')
            if not art:
                continue
            text = sp.get('text')
            joined = ' '.join(_line(t) for t in text) if isinstance(text, (list, tuple)) \
                else (text or '')
            if not joined.strip():
                continue
            pages[_pkey(art)] = clean_sentence(sp.get('nar'), joined)
        return ' '.join(book['title_lines']).replace('  ', ' '), pages
    if slug in EASYR:
        r = EASYR[slug]
        return r.get('title'), {p['n']: p['text'] for p in r['pages']}
    return None, None


def sync_dp_cfg(cfg, repo=None):
    """A letters/dp-<slug>.json dict with every sentence re-derived from the
    second-language reader page that governs it (rule 7). Falls back to
    transform_dp_cfg() when no reader source can be resolved."""
    # The literal cut comes first (it is the only thing that reaches a page
    # the reader prints no sentence on -- the-pit's potato page, say), then
    # the reader overlays every page it does print.
    c = transform_dp_cfg(cfg)
    slug = c.get('bookSlug') or c.get('slug')
    if slug in SKIP_SLUGS:
        return c
    arts = [p.get('art', '') for p in c.get('pages') or []]
    easy = any(a.lower().endswith(('.jpg', '.jpeg')) for a in arts)
    title, pages = reader_pages(slug, easy_hint=easy, repo=repo)
    if pages is None:
        return transform_dp_cfg(cfg)
    for p in c.get('pages') or []:
        want = pages.get(_pkey(p.get('art', '')))
        if want is not None:
            p['sentence'] = want
    if title:
        c['bookTitle'] = title
    return c
