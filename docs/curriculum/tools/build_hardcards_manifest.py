#!/usr/bin/env python3
"""Builds spec/dark-phonics-hardcards.json — the per-song 'hard card' vocab manifest.

Scope (Tredoux, Jul 18): catchphrase CONCRETE NOUNS only ("snake in my sock" -> snake, sock).
Lessons 33/34/46 have no concrete nouns -> no pack. Prompts come from
dark-phonics-vocab-prompts.json where the word already exists; new words are authored here.
Reader-image reuse: 6 words map to already-picked Easy Reader singles (no render needed).
"""
import json, os

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
SPEC = os.path.join(REPO, 'lib/montree/english-curriculum/spec')

STYLE = ("colored hand-drawn pen-and-ink, fine crosshatch, whimsical Dr. Seuss "
         "children's-book style, big googly eyes, plain white background.")
STYLE_OBJ = ("colored hand-drawn pen-and-ink, fine crosshatch, whimsical Dr. Seuss "
             "children's-book style, plain white background.")
TAIL = ("no text, no words, no letters, no numbers, no captions, no speech bubbles, "
        "no border, no watermark. --ar 1:1")

def P(subject, obj=False):
    return f"{subject}, {STYLE_OBJ if obj else STYLE} {TAIL}"

SONGS = {
  5:  ("snake in my sock", ["snake", "sock"]),
  6:  ("ant on my apple", ["ant", "apple"]),
  7:  ("tick-tock, stinky sock", ["clock", "sock"]),
  8:  ("pop, pop, puppy poop", ["pup"]),
  9:  ("icky, sticky pig", ["pig"]),
  10: ("no-no, nanny goat", ["goat"]),
  11: ("mmm, muddy monkey", ["monkey"]),
  12: ("dirty dog, dig dig dig", ["dog"]),
  13: ("goat got my gum", ["goat", "gum"]),
  14: ("hot dog on a log", ["hotdog", "log"]),
  15: ("cat ate my cookie", ["cat", "cookie"]),
  16: ("kooky king kicks", ["king"]),
  17: ("kick the stinky sock", ["sock"]),
  18: ("ten messy hens", ["hen"]),
  19: ("yummy bug in my cup", ["bug", "cup"]),
  20: ("run, run, red rat", ["rat"]),
  21: ("ha-ha, hairy hippo", ["hippo"]),
  22: ("big baby burp", ["baby"]),
  23: ("funny fox in my fan", ["fox", "fan"]),
  24: ("lazy lion licks", ["lion"]),
  25: ("jump in the jelly jam", ["jam"]),
  26: ("vroom-vroom van", ["van"]),
  27: ("wiggly wet worm", ["worm"]),
  28: ("six fox in a box", ["fox", "box"]),
  29: ("yummy yellow yo-yo", ["yoyo"]),
  30: ("zippy zebra, zzz", ["zebra"]),
  31: ("quick quacky duck", ["duck"]),
  32: ("cat, pig, dog - woof", ["cat", "pig", "dog"]),
  35: ("fat cat in a hat", ["cat", "hat"]),
  36: ("big pig did a jig", ["pig"]),
  37: ("hop on a hot log", ["log"]),
  38: ("wet pet in my bed", ["pet", "bed"]),
  39: ("big bug hug", ["bug"]),
  40: ("cat? cot? cut? - which one", ["cat", "cot", "cut"]),
  41: ("buzz off, fuzzy bee", ["bee"]),
  42: ("sheep go baba", ["sheep"]),
  43: ("cheeky little chick", ["chick"]),
  44: ("moth in my bath", ["moth", "bath"]),
  45: ("wheee, big fat whale", ["whale"]),
  47: ("jump, jump, fast hands", ["hand"]),
  48: ("pink sock in the sink", ["sock", "sink"]),
  49: ("slip, slip, slimy snail", ["snail"]),
  50: ("clap, clap, silly clown", ["clown"]),
  51: ("green frog on a drum", ["frog", "drum"]),
  52: ("two twins twist", ["twins"]),
  53: ("big splash, scrub-a-dub", ["splash"]),
}
SKIPPED = {33: "a, e, i, o, u... achoo (vowel review - no concrete noun)",
           34: "a to z, easy-peasy (alphabet review)",
           46: "this, that (abstract - no concrete noun)"}

EC = os.path.expanduser("~/Desktop/English Curriculum 2026/Dark Phonics/Easy Readers")
REUSE = {
  "cat":   f"{EC}/the-cat-sat/p1.png",
  "fox":   f"{EC}/fox-in-a-box/p1.png",
  "pup":   f"{EC}/mud-pup/p1.png",
  "chick": f"{EC}/fish-and-chick/p2.png",
  "frog":  f"{EC}/frog-and-crab/p1.png",
  "moth":  f"{EC}/this-and-that/p3.png",
}

NEW = {
  "clock":  P("one single friendly round alarm clock with two brass bells on top and little feet, its face completely blank with just two hands and no numbers, large and central filling the frame", obj=True),
  "monkey": P("one single scraggly cheeky brown monkey with wild tufty fur, a round pale face, huge white googly eyes and a long curling tail, large and central filling the frame"),
  "gum":    P("one single bright pink bubblegum bubble being blown by a cheerful cartoon child, the huge round pink bubble large and central"),
  "hotdog": P("one single cartoon hot dog in a soft bun with a wiggly line of mustard, large and central filling the frame", obj=True),
  "cookie": P("one single giant round chocolate-chip cookie with a big cartoon bite taken out of it, large and central filling the frame", obj=True),
  "king":   P("one single skinny kooky cartoon king with a golden crown, wild scraggly hair, a huge toothy grin and a red royal robe, dancing a silly high kick, large and central"),
  "hen":    P("one single plump bright-red cartoon hen with a floppy orange comb, round googly eyes, a small yellow beak and stubby wings, standing alone large and central filling the frame"),
  "hippo":  P("one single big round hairy cartoon hippo with a huge smiling mouth, tiny ears and scraggly tufts of hair, huge white googly eyes, large and central filling the frame"),
  "baby":   P("one single round happy cartoon baby in a nappy with a single curl of hair and huge cheeks mid-burp, tiny bubbles floating up, large and central"),
  "lion":   P("one single lazy cartoon lion with a huge scraggly golden mane, huge white googly eyes, licking its lips with a big pink tongue, lying down large and central"),
  "worm":   P("one single wiggly pink cartoon worm with huge white googly eyes, curved in a happy S-shaped wiggle on a small patch of soil, large and central filling the frame"),
  "yoyo":   P("one single bright yellow yo-yo spinning at the end of its string held by a cartoon hand above it, the yo-yo large and central", obj=True),
  "zebra":  P("one single zippy cartoon zebra with bold black-and-white stripes, a scraggly mane, huge white googly eyes, mid-gallop with comic speed lines, large and central"),
  "duck":   P("one single scraggly black cartoon duck with wild fluffy feathers, a big bright orange bill and huge white googly eyes, standing alone large and central filling the frame"),
  "bee":    P("one single round fuzzy yellow-and-black striped cartoon bee with tiny wings, a cheeky grin and huge white googly eyes, hovering with a looping dotted flight path, large and central"),
  "sheep":  P("one single plump woolly white cartoon sheep with a scraggly cloud of wool, a grey face and huge white googly eyes, standing alone large and central filling the frame"),
  "snail":  P("one single slow smiling cartoon snail with a swirly brown shell, long eye-stalks with huge white googly eyes, and a glossy slime trail behind it, large and central"),
  "clown":  P("one single silly cartoon clown with a red nose, wild rainbow hair, a polka-dot suit and huge white googly eyes, clapping with both hands, big comic clap lines, large and central"),
}

vocab = json.load(open(os.path.join(SPEC, 'dark-phonics-vocab-prompts.json')))
ALIAS = {"twins": "twin"}

words = sorted({w for _, (_, ws) in SONGS.items() for w in ws})
prompts, missing = {}, []
for w in words:
    if w in REUSE:
        continue
    if w in NEW:
        prompts[w] = NEW[w]
    elif ALIAS.get(w, w) in vocab:
        prompts[w] = vocab[ALIAS.get(w, w)]
    else:
        missing.append(w)

out = {
  "_note": "Dark Phonics per-song 'hard card' vocab packs. Cards = catchphrase concrete nouns only (Tredoux Jul 18). Images render to ~/Desktop/English Curriculum 2026/Dark Phonics/Vocab/<word>.png; REUSE words copy from Easy Reader art.",
  "style_locked": STYLE,
  "songs": {str(k): {"phrase": v[0], "cards": v[1]} for k, v in sorted(SONGS.items())},
  "skipped_lessons": SKIPPED,
  "reuse_images": REUSE,
  "render_prompts": prompts,
}
dest = os.path.join(SPEC, 'dark-phonics-hardcards.json')
json.dump(out, open(dest, 'w'), indent=1, ensure_ascii=False)
print(f"songs: {len(SONGS)} | unique card words: {len(words)} | to render: {len(prompts)} | reused: {len([w for w in words if w in REUSE])}")
if missing: print("MISSING PROMPTS:", missing)
print("render list:", ', '.join(sorted(prompts)))
