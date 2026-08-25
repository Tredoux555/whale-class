# -*- coding: utf-8 -*-
# NOTE FOR FUTURE SESSIONS: fonts load from the canvas-design skill folder
# (/root/.claude/skills/canvas-design/canvas-fonts/) available in Cowork cloud sessions.
# Art inputs resolve from /mnt/user-data/uploads/... after device_stage_files; all
# Midjourney job UUIDs are in docs/curriculum/satpin-redesign/art-manifest.md.
# Per Tredoux 2026-08-25: the /mnt/user-data/uploads/... container path above was a
# one-session staging artifact that no longer exists -- repointed to the same
# absolute-Mac-path convention as SPAT2/PIT3/etc. below, since the real files
# live in the repo at phonics-images/satpin-v2/books/ the whole time.
U='/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/phonics-images/satpin-v2/books'
# 'the-spat' (letter-book two, penguin/pig/pelican) was built on the Mac directly
# against the repo's phonics-images dir — no device_stage_files hop, so an
# absolute Mac path is used instead of the U= Cowork-container convention above.
SPAT2='/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/phonics-images/satpin-v2/books/the-spat'
# 'the-pit' (letter-book three, the-sat cast in the pit) — same Mac-direct
# convention as SPAT2 above.
PIT3='/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/phonics-images/satpin-v2/books/the-pit'
# 'the-pat' (letter-book two-and-a-half, the-sat cast can pat) — art filed directly
# under phonics-images/dark-phonics-books/ (not satpin-v2/books/ like SPAT2/PIT3).
PAT4='/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/phonics-images/dark-phonics-books/the-pat'
# 'the-nap' (letter-book four, the-sat cast can nap) — same convention as PAT4.
NAP4='/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/phonics-images/dark-phonics-books/the-nap'
# 'the-mat' (letter-book five, the-sat cast sat on the mat) — same convention as PAT4.
MAT5='/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/phonics-images/dark-phonics-books/the-mat'
# 'the-sad' (letter-book six, the-sat cast is sad) — same convention as PAT4.
SAD6='/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/phonics-images/dark-phonics-books/the-sad'
# 'the-dig' (letter-book seven, the-sat cast digs) — same convention as PAT4.
DIG7='/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/phonics-images/dark-phonics-books/the-dig'
# 'the-dog' (letter-book eight, the-sat cast each has a dog; potato has five) — same convention as PAT4.
DOG8='/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/phonics-images/dark-phonics-books/the-dog'
# 'the-cot' (letter-book nine, the-sat cast sat in a baby cot; potato sips a drink
# in a deck chair instead, then naps) — same convention as PAT4. First 9-page book.
COT9='/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/phonics-images/dark-phonics-books/the-cot'
# 'the-kit' (letter-book ten, the-sat cast each has a first-aid kit; potato has
# none, grazes a knee playing football, then the crew brings their kits to help)
# — same convention as PAT4. Second 9-page book.
KIT10='/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/phonics-images/dark-phonics-books/the-kit'
# 'the-egg' (letter-book eleven, the-sat cast each has an egg; potato cracks
# his) — same convention as PAT4.
EGG11='/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/phonics-images/dark-phonics-books/the-egg'
# 'the-mud' (letter-book twelve, the-sat cast is in the mud; potato sits it out,
# chilling in his deck chair) — same convention as PAT4.
MUD12='/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/phonics-images/dark-phonics-books/the-mud'
# 'the-rat' (letter-book thirteen, the-sat cast chases a rat; potato doesn't,
# chills with the rat instead) — same convention as PAT4.
RAT13='/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/phonics-images/dark-phonics-books/the-rat'
# 'the-hot' (letter-book fourteen, the-sat cast is hot, fanning themselves under
# a blazing sun; potato isn't — shaded in his deck chair) — same convention as PAT4.
HOT14='/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/phonics-images/dark-phonics-books/the-hot'
# 'the-bug' (letter-book fifteen, the-sat cast spots a bug; ending flips the
# usual gag -- the bug spots the potato instead, relaxing in his deck chair
# with an ice-cold drink, and the two are happy to see each other).
BUG15='/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/phonics-images/dark-phonics-books/the-bug'
# 'the-tall' -- a companion pattern reader for letter T's own slot (NOT part
# of the-sat cast/numbering chain -- it sits alongside the-sat and
# tiger-in-the-taxi at letter T, week 3). Cast = turtle, tomato, toothbrush,
# tiger, taxi (the child shouts the picture word each page), same art set as
# the dark-phonics-storybooks reader tiger-in-the-taxi. Sentences confirmed
# 2026-08-14 from the book's own A5 reading PDF
# (public/dark-phonics-books/print/the-tall-A5-reading.pdf): 'A tall ___!'.
TALL='/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/phonics-images/dark-phonics-books/the-tall'
# TEXT RULES (locked from the-pat onward, apply to every future book):
# 1. CASE: a spread's `text` is body copy continuing the sentence its `nar`
#    starts (e.g. nar='The star...'  text='can pat!'  reads as one sentence:
#    'The star... can pat!'). On a page with a `nar`, `text` starts
#    lowercase -- it is never a fresh sentence. Only true sentence-starts
#    get a capital: the `nar` line itself, and titles (title_lines /
#    title_accent, which stay title case).
# 2. RECAP/CHANT: the drop-style recap page (no `nar` on that page) repeats
#    ONLY the bare target word, capitalized each time as its own exclamation
#    -- e.g. text=['Pat! Pat!','Pat!'] for a target word 'pat', matching
#    the-sat's ['Sat! Sat!','Sat!']. Never the full phrase (not 'can pat!'
#    x3) -- just the target word.
#
# EXPRESSION RULE (locked from the-nap onward, applies to every future book
# and every character, including new MJ art prompts): every character must
# read as happy or content in EVERY image, full stop -- no fear, sadness,
# anger, or distress, ever. This audience is very young and very easily
# influenced by facial expression. Comic "left out" gags (e.g. the potato
# missing an action the cast can do) stay upbeat, silly, and energetic --
# never sad, scared, or upset. Confused/startled reads are also out; if a
# page needs a "can't join in" beat, play it as cheerful and full of energy
# instead.
# CAT EXCEPTION: the Cat keeps a playful SKEPTICAL look (one eyebrow
# slightly raised, quizzical, good-humored) -- that's personality, not
# distress, and stays. GRUMPY is what's out (that reads unhappy). Skeptical
# only shows with eyes open (e.g. cover, awake scenes) -- on a sleeping page
# the Cat is simply content and peaceful like the rest of the cast, same as
# every other character.
BOOKS=[
dict(slug='snake-in-my-sock', title_lines=['Snake in','my SOCK!'], title_accent='SOCK!', title_size=40,
 band='WEEK 1  ·  THE SOUND  /s/', booknum='BOOK ONE OF SIX', cover='bk1/p7.png',
 sound='sss', sound_note='a held snake-hiss — never "ess", never "suh"',
 oral_words='snake · sun · soap · seal · star · sock',
 spreads=[
  dict(text='Sss…', style='drop', art='bk1/p1.png'),
  dict(text='Sss— SUN!', accent='Sss—', accent_first=True, art='bk1/p2.png'),
  dict(text='Sss— SOAP!', accent='Sss—', accent_first=True, art='bk1/p3.png'),
  dict(text='Sss— SEAL!', accent='Sss—', accent_first=True, art='bk1/p4.png'),
  dict(text='Sss— STAR!', accent='Sss—', accent_first=True, art='bk1/p5.png'),
  dict(text='shhh… sss…', style='whisper', art='bk1/p6.png'),
  dict(text=['Snake in','my SOCK!'], accent='SOCK!', size=54, art='bk1/p7.png'),
  dict(art='bk1/p8.png'),
 ]),
dict(slug='an-apple-for-ant', title_lines=['An Apple','for Ant!'], title_accent='Ant!', title_size=40,
 band='WEEK 2  ·  THE SOUND  /a/', booknum='BOOK TWO OF SIX', cover=U+'/apple/apple-p7.png',
 sound='a', sound_note='"ah–ah–ah" — never the letter name',
 new='ant',
 oral_words='ant · ax · anchor · astronaut · alligator · apple',
 spreads=[
  dict(nar='An', text='ant.', size=92, art=U+'/apple/apple-p1.png'),
  dict(nar='An', text='ax.', size=92, art=U+'/apple/apple-p2.png'),
  dict(nar='An', text='anchor.', size=92, art=U+'/apple/apple-p3.png'),
  dict(nar='An', text='astronaut.', size=92, art=U+'/apple/apple-p4.png'),
  dict(text='shhh… an…', style='whisper', art=U+'/apple/apple-p5.png'),
  dict(text='AH! Ant!', style='drop', art=U+'/apple/apple-p6.png'),
  dict(nar='An', text='apple.', size=92, art=U+'/apple/apple-p7.png'),
  dict(art=U+'/apple/apple-p8.png'),
 ]),
dict(slug='the-sat', title_lines=['The ___','Sat!'], title_accent='Sat!', title_size=46,
 band='WEEK 3  ·  FIRST DECODE  ·  s a t', booknum='BOOK THREE OF SIX', cover='tiles/SAT-p6.png',
 new='Sat  ·  at', review='a', heart='♥  heart word — a',
 oral_note='the nouns live in the pictures — named aloud, never printed',
 spreads=[
  dict(nar='The ant…', text='Sat!', size=92, art='tiles/SAT-p1.png'),
  dict(nar='The snake…', text='Sat!', size=92, art='tiles/SAT-p2.png'),
  dict(nar='The apple…', text='Sat!', size=92, art='tiles/SAT-p3.png'),
  dict(nar='The sun…', text='Sat!', size=92, art='tiles/SAT-p4.png'),
  dict(nar='The star…', text='Sat!', size=92, art='tiles/SAT-p5.png'),
  dict(nar='The cat…', text='Sat!', size=92, art='tiles/SAT-p6.png'),
  dict(text=['Sat! Sat!','Sat!'], style='drop', size=64, art='tiles/SAT-p7.png'),
  dict(nar='And the…?!', art='tiles/SAT-p8.png'),
 ]),
dict(slug='the-spat', title_lines=['The ___','Spat!'], title_accent='Spat!', title_size=46,
 band='LETTER P  ·  s a t p', booknum='LETTER BOOK TWO', cover=SPAT2+'/cover.png',
 new='Spat', review='sat  ·  at', heart='♥  heart words — a · the',
 oral_note='the nouns live in the pictures — named aloud, never printed',
 spreads=[
  dict(nar='A basin.', art=SPAT2+'/spat-p1.png'),
  dict(nar='The penguin…', text='Spat!', size=92, art=SPAT2+'/spat-p2.png'),
  dict(nar='The pig…', text='Spat!', size=92, art=SPAT2+'/spat-p3.png'),
  dict(nar='The pelican…', text='Spat!', size=92, art=SPAT2+'/spat-p4.png'),
  dict(text=['Spat! Spat!','Spat!'], style='drop', size=64, art=SPAT2+'/spat-p5.png'),
  dict(nar='And the…?!', art=SPAT2+'/spat-p6.png'),
 ]),
dict(slug='the-pit', title_lines=['The ___ Sat','in the Pit!'], title_accent='Pit!', title_size=46,
 band='LETTER I  ·  s a t p i', booknum='LETTER BOOK THREE', cover=PIT3+'/cover.png',
 new='Pit  ·  in', review='sat  ·  spat  ·  at', heart='♥  heart words — a · the',
 oral_note='the nouns live in the pictures — named aloud, never printed',
 spreads=[
  dict(nar='A pit.', art=PIT3+'/pit-p1.png'),
  dict(nar='The ant sat in the…', text='pit!', size=44, art=PIT3+'/pit-p2.png'),
  dict(nar='The apple sat in the…', text='pit!', size=44, art=PIT3+'/pit-p3.png'),
  dict(nar='The sun sat in the…', text='pit!', size=44, art=PIT3+'/pit-p4.png'),
  dict(nar='The star sat in the…', text='pit!', size=44, art=PIT3+'/pit-p5.png'),
  dict(nar='The snake sat in the…', text='pit!', size=44, art=PIT3+'/pit-p6.png'),
  dict(nar='The cat sat in the…', text='pit!', size=44, art=PIT3+'/pit-p7.png'),
  dict(text=['Sat in the pit!','Sat in the pit!','Sat in the pit!'], style='drop', size=42, art=PIT3+'/pit-p8.png'),
  dict(nar='And the…?!', art=PIT3+'/pit-p9.png'),
 ]),
dict(slug='the-pat', title_lines=['The ___','Can Pat!'], title_accent='Pat!', title_size=46,
 band='LETTER P  ·  s a t p (the-sat cast)', booknum='LETTER BOOK TWO · PAT', cover=PAT4+'/p7-recap.png',
 new='Pat', review='sat  ·  spat  ·  at', heart='♥  heart words — a · the',
 oral_note='the nouns live in the pictures — named aloud, never printed',
 spreads=[
  dict(nar='The ant can…', text='pat!', size=92, art=PAT4+'/p1-ant.png'),
  dict(nar='The apple can…', text='pat!', size=92, art=PAT4+'/p2-apple.png'),
  dict(nar='The sun can…', text='pat!', size=92, art=PAT4+'/p3-sun.png'),
  dict(nar='The star can…', text='pat!', size=92, art=PAT4+'/p4-star.png'),
  dict(nar='The snake can…', text='pat!', size=92, art=PAT4+'/p5-snake.png'),
  dict(nar='The cat can…', text='pat!', size=92, art=PAT4+'/p6-cat.png'),
  dict(text=['Pat! Pat!','Pat!'], style='drop', size=64, art=PAT4+'/p7-recap.png'),
  dict(nar='And the…?!', art=PAT4+'/p8-potato.png'),
 ]),
dict(slug='the-nap', title_lines=['The ___','Naps!'], title_accent='Naps!', title_size=46,
 band='LETTER N  ·  s a t p i n (the-sat cast)', booknum='LETTER BOOK FOUR · NAP', cover=NAP4+'/p7-recap.png',
 new='Nap', review='sat  ·  spat  ·  pat  ·  pit  ·  at', heart='♥  heart words — a · the',
 oral_note='the nouns live in the pictures — named aloud, never printed',
 spreads=[
  dict(nar='The ant…', text='naps.', size=92, art=NAP4+'/p1-ant.png'),
  dict(nar='The apple…', text='naps.', size=92, art=NAP4+'/p2-apple.png'),
  dict(nar='The sun…', text='naps.', size=92, art=NAP4+'/p3-sun.png'),
  dict(nar='The star…', text='naps.', size=92, art=NAP4+'/p4-star.png'),
  dict(nar='The snake…', text='naps.', size=92, art=NAP4+'/p5-snake.png'),
  dict(nar='The cat…', text='naps.', size=92, art=NAP4+'/p6-cat.png'),
  dict(text=['Nap! Nap!','Nap!'], style='drop', size=64, art=NAP4+'/p7-recap.png'),
  dict(nar='The potato doesn’t…', text='nap!', size=48, art=NAP4+'/p8-potato.png'),
 ]),
dict(slug='the-mat', title_lines=['The ___ Sat','on the Mat!'], title_accent='Mat!', title_size=44,
 band='LETTER M  ·  s a t p i n m (the-sat cast)', booknum='LETTER BOOK FIVE · MAT', cover=MAT5+'/p7-recap.png',
 new='Mat', review='sat  ·  spat  ·  pat  ·  pit  ·  nap  ·  at', heart='♥  heart words — a · the',
 oral_note='the nouns live in the pictures — named aloud, never printed',
 # Per Tredoux 2026-08-25: EXPRESSION RULE tightened -- the bold shout is
 # ALWAYS exactly the bare last word ('mat!'), never a trailing phrase
 # ('sat on the mat!'). Everything before it, including the verb, is now
 # part of nar. Matches the-tall/the-spat/the-pit's already-correct single-
 # word convention; this book (and several other letter-books) predated
 # that tightening and needs the same fix -- see build_a5_readers.py's
 # EDITORIAL RULE docstring for the sibling rule on the picture-word books.
 spreads=[
  dict(nar='The ant sat on the…', text='mat!', size=90, art=MAT5+'/p1-ant.png'),
  dict(nar='The apple sat on the…', text='mat!', size=90, art=MAT5+'/p2-apple.png'),
  dict(nar='The sun sat on the…', text='mat!', size=90, art=MAT5+'/p3-sun.png'),
  dict(nar='The star sat on the…', text='mat!', size=90, art=MAT5+'/p4-star.png'),
  dict(nar='The snake sat on the…', text='mat!', size=90, art=MAT5+'/p5-snake.png'),
  dict(nar='The cat sat on the…', text='mat!', size=90, art=MAT5+'/p6-cat.png'),
  dict(text=['Mat! Mat!','Mat!'], style='drop', size=64, art=MAT5+'/p7-recap.png'),
  dict(nar='The potato didn’t sit on the…', text='mat!', size=90, art=MAT5+'/p8-potato.png'),
 ]),
# ONE-TIME EXCEPTION to the EXPRESSION RULE, for 'the-sad' ONLY (Tredoux,
# explicit, 2026-08-05): the hero word for Letter D is 'sad' — genuinely sad
# expressions (gentle storybook sadness: drooping brows, a small tear,
# downturned frown — never distressing/scary) are allowed on this book's
# character pages and its p7 recap. The book resolves the sadness itself:
# the potato arrives NOT sad and cheers everyone up, ending on a genuine
# happy group finale (p9) — so the book as a whole still lands happy. This
# does NOT reopen the rule generally: EXPRESSION RULE (always happy/content,
# Cat-skeptical-not-grumpy exception) is back in full force for every book
# after the-sad. cover uses p9 (the happy finale), not the sad p7 recap —
# a sad cover thumbnail on the library page would be the wrong first
# impression, breaking from the usual cover=recap convention on purpose.
dict(slug='the-sad', title_lines=['The ___','Is Sad!'], title_accent='Sad!', title_size=46,
 band='LETTER D  ·  s a t p i n m d (the-sat cast)', booknum='LETTER BOOK SIX · SAD', cover=SAD6+'/p9-finale.png',
 new='Sad', review='sat  ·  spat  ·  pat  ·  pit  ·  nap  ·  mat  ·  at', heart='♥  heart words — a · the',
 oral_note='the nouns live in the pictures — named aloud, never printed',
 spreads=[
  dict(nar='The ant is…', text='sad.', size=88, art=SAD6+'/p1-ant.png'),
  dict(nar='The apple is…', text='sad.', size=88, art=SAD6+'/p2-apple.png'),
  dict(nar='The sun is…', text='sad.', size=88, art=SAD6+'/p3-sun.png'),
  dict(nar='The star is…', text='sad.', size=88, art=SAD6+'/p4-star.png'),
  dict(nar='The snake is…', text='sad.', size=88, art=SAD6+'/p5-snake.png'),
  dict(nar='The cat is…', text='sad.', size=88, art=SAD6+'/p6-cat.png'),
  dict(text=['Sad! Sad!','Sad!'], style='drop', size=64, art=SAD6+'/p7-recap.png'),
  dict(nar='The potato is not…', text='sad!', size=48, art=SAD6+'/p8-potato.png'),
  dict(nar='Now the whole crew is not…', text='sad!', size=42, art=SAD6+'/p9-finale.png'),
 ]),

dict(slug='the-dig', title_lines=['The ___','Digs!'], title_accent='Digs!', title_size=46,
 band='LETTER G  ·  s a t p i n m d g (the-sat cast)', booknum='LETTER BOOK SEVEN · DIG', cover=DIG7+'/p7-recap.png',
 new='Dig', review='sat  ·  spat  ·  pat  ·  pit  ·  nap  ·  mat  ·  sad  ·  at', heart='♥  heart words — a · the',
 oral_note='the nouns live in the pictures — named aloud, never printed',
 spreads=[
  dict(nar='The ant…', text='digs.', size=92, art=DIG7+'/p1-ant.png'),
  dict(nar='The apple…', text='digs.', size=92, art=DIG7+'/p2-apple.png'),
  dict(nar='The sun…', text='digs.', size=92, art=DIG7+'/p3-sun.png'),
  dict(nar='The star…', text='digs.', size=92, art=DIG7+'/p4-star.png'),
  dict(nar='The snake…', text='digs.', size=92, art=DIG7+'/p5-snake.png'),
  dict(nar='The cat…', text='digs.', size=92, art=DIG7+'/p6-cat.png'),
  dict(text=['Dig! Dig!','Dig!'], style='drop', size=64, art=DIG7+'/p7-recap.png'),
  dict(nar="The potato doesn't…", text='dig!', size=48, art=DIG7+'/p8-potato.png'),
 ]),

dict(slug='the-dog', title_lines=['The ___','Has a Dog!'], title_accent='Dog!', title_size=44,
 band='LETTER O  ·  s a t p i n m d g o (the-sat cast)', booknum='LETTER BOOK EIGHT · DOG', cover=DOG8+'/p7-recap.png',
 new='Dog', review='sat  ·  spat  ·  pat  ·  pit  ·  nap  ·  mat  ·  sad  ·  dig  ·  at', heart='♥  heart words — a · the',
 oral_note='the nouns live in the pictures — named aloud, never printed',
 spreads=[
  dict(nar='The ant has a…', text='dog.', size=76, art=DOG8+'/p1-ant.png'),
  dict(nar='The apple has a…', text='dog.', size=76, art=DOG8+'/p2-apple.png'),
  dict(nar='The sun has a…', text='dog.', size=76, art=DOG8+'/p3-sun.png'),
  dict(nar='The star has a…', text='dog.', size=76, art=DOG8+'/p4-star.png'),
  dict(nar='The snake has a…', text='dog.', size=76, art=DOG8+'/p5-snake.png'),
  dict(nar='The cat has a…', text='dog.', size=76, art=DOG8+'/p6-cat.png'),
  dict(text=['Dog! Dog!','Dog!'], style='drop', size=64, art=DOG8+'/p7-recap.png'),
  dict(nar='The potato has 5…', text='dogs!', size=46, art=DOG8+'/p8-potato.png'),
 ]),

dict(slug='the-cot', title_lines=['The ___','Sat in a Cot!'], title_accent='Cot!', title_size=42,
 band='LETTER C  ·  s a t p i n m d g o c (the-sat cast)', booknum='LETTER BOOK NINE · COT', cover=COT9+'/p7-recap.png',
 new='Cot', review='sat  ·  spat  ·  pat  ·  pit  ·  nap  ·  mat  ·  sad  ·  dig  ·  dog  ·  at', heart='♥  heart words — a · the',
 oral_note='the nouns live in the pictures — named aloud, never printed',
 spreads=[
  dict(nar='The ant sat in a…', text='cot.', size=80, art=COT9+'/p1-ant.png'),
  dict(nar='The apple sat in a…', text='cot.', size=80, art=COT9+'/p2-apple.png'),
  dict(nar='The sun sat in a…', text='cot.', size=80, art=COT9+'/p3-sun.png'),
  dict(nar='The star sat in a…', text='cot.', size=80, art=COT9+'/p4-star.png'),
  dict(nar='The snake sat in a…', text='cot.', size=80, art=COT9+'/p5-snake.png'),
  dict(nar='The cat sat in a…', text='cot.', size=80, art=COT9+'/p6-cat.png'),
  dict(text=['Cot! Cot!','Cot!'], style='drop', size=64, art=COT9+'/p7-recap.png'),
  dict(nar='The potato didn’t sit in a…', text='cot!', size=42, art=COT9+'/p8-potato.png'),
  dict(nar='The potato…', text='naps.', size=56, art=COT9+'/p9-potato-naps.png'),
 ]),

# ONE-TIME EXCEPTION to the EXPRESSION RULE, for 'the-kit' p8 ONLY (Tredoux,
# explicit, 2026-08-04): the potato grazes a knee playing football and has no
# kit of his own — his page may read as genuinely not happy (no fear/tears
# required, just not cheerful; downturned brow is fine, no crying). This does
# NOT reopen the rule generally: the book resolves it immediately on p9, where
# the whole crew brings their kits to help and everyone (including the
# potato) is back to happy/content, same as every book's usual close.
# EXPRESSION RULE is back in full force for every book after the-kit.
dict(slug='the-kit', title_lines=['The ___','Has a Kit!'], title_accent='Kit!', title_size=44,
 band='LETTER K  ·  s a t p i n m d g o c k (the-sat cast)', booknum='LETTER BOOK TEN · KIT', cover=KIT10+'/p7-recap.png',
 new='Kit', review='sat  ·  spat  ·  pat  ·  pit  ·  nap  ·  mat  ·  sad  ·  dig  ·  dog  ·  cot  ·  at', heart='♥  heart words — a · the',
 oral_note='the nouns live in the pictures — named aloud, never printed',
 spreads=[
  dict(nar='The ant has a…', text='kit.', size=76, art=KIT10+'/p1-ant.png'),
  dict(nar='The apple has a…', text='kit.', size=76, art=KIT10+'/p2-apple.png'),
  dict(nar='The sun has a…', text='kit.', size=76, art=KIT10+'/p3-sun.png'),
  dict(nar='The star has a…', text='kit.', size=76, art=KIT10+'/p4-star.png'),
  dict(nar='The snake has a…', text='kit.', size=76, art=KIT10+'/p5-snake.png'),
  dict(nar='The cat has a…', text='kit.', size=76, art=KIT10+'/p6-cat.png'),
  dict(text=['Kit! Kit!','Kit!'], style='drop', size=64, art=KIT10+'/p7-recap.png'),
  dict(nar="The potato doesn't have a…", text='kit!', size=42, art=KIT10+'/p8-potato.png'),
  dict(nar='The crew helps the…', text='potato!', size=42, art=KIT10+'/p9-crew.png'),
 ]),

# ONE-TIME EXCEPTION to the EXPRESSION RULE, for 'the-egg' p8 ONLY (Tredoux,
# explicit, 2026-08-06): the potato cracks his egg and should NOT read as
# delighted about it -- that sends the wrong message. His page reads flat and
# not-happy (downturned mouth, no tears, not distraught -- just unimpressed
# with himself), same tone as the-kit's exception. This does NOT reopen the
# rule generally: EXPRESSION RULE is back in full force for every book after
# the-egg.
dict(slug='the-egg', title_lines=['The ___','Has an Egg!'], title_accent='Egg!', title_size=42,
 band='LETTER E  ·  s a t p i n m d g o c k e (the-sat cast)', booknum='LETTER BOOK ELEVEN · EGG', cover=EGG11+'/p7-recap.png',
 new='Egg', review='sat  ·  spat  ·  pat  ·  pit  ·  nap  ·  mat  ·  sad  ·  dig  ·  dog  ·  cot  ·  kit  ·  at', heart='♥  heart words — a · the',
 oral_note='the nouns live in the pictures — named aloud, never printed',
 spreads=[
  dict(nar='The ant has an…', text='egg.', size=74, art=EGG11+'/p1-ant.png'),
  dict(nar='The apple has an…', text='egg.', size=74, art=EGG11+'/p2-apple.png'),
  dict(nar='The sun has an…', text='egg.', size=74, art=EGG11+'/p3-sun.png'),
  dict(nar='The star has an…', text='egg.', size=74, art=EGG11+'/p4-star.png'),
  dict(nar='The snake has an…', text='egg.', size=74, art=EGG11+'/p5-snake.png'),
  dict(nar='The cat has an…', text='egg.', size=74, art=EGG11+'/p6-cat.png'),
  dict(text=['Egg! Egg!','Egg!'], style='drop', size=64, art=EGG11+'/p7-recap.png'),
  dict(nar='The potato had an…', text='egg!', size=46, art=EGG11+'/p8-potato.png'),
 ]),

dict(slug='the-mud', title_lines=['The ___','Is in the Mud!'], title_accent='Mud!', title_size=40,
 band='LETTER U  ·  s a t p i n m d g o c k e u (the-sat cast)', booknum='LETTER BOOK TWELVE · MUD', cover=MUD12+'/p7-recap.png',
 new='Mud', review='sat  ·  spat  ·  pat  ·  pit  ·  nap  ·  mat  ·  sad  ·  dig  ·  dog  ·  cot  ·  kit  ·  egg  ·  at', heart='♥  heart words — a · the',
 oral_note='the nouns live in the pictures — named aloud, never printed',
 spreads=[
  dict(nar='The ant is in the…', text='mud.', size=78, art=MUD12+'/p1-ant.png'),
  dict(nar='The apple is in the…', text='mud.', size=78, art=MUD12+'/p2-apple.png'),
  dict(nar='The sun is in the…', text='mud.', size=78, art=MUD12+'/p3-sun.png'),
  dict(nar='The star is in the…', text='mud.', size=78, art=MUD12+'/p4-star.png'),
  dict(nar='The snake is in the…', text='mud.', size=78, art=MUD12+'/p5-snake.png'),
  dict(nar='The cat is in the…', text='mud.', size=78, art=MUD12+'/p6-cat.png'),
  dict(text=['Mud! Mud!','Mud!'], style='drop', size=64, art=MUD12+'/p7-recap.png'),
  dict(nar="The potato isn't in the…", text='mud!', size=42, art=MUD12+'/p8-potato.png'),
 ]),

dict(slug='the-rat', title_lines=['The ___','Chased the Rat!'], title_accent='Rat!', title_size=36,
 band='LETTER R  ·  s a t p i n m d g o c k e u r (the-sat cast)', booknum='LETTER BOOK THIRTEEN · RAT', cover=RAT13+'/p7-recap.png',
 new='Rat', review=['sat  ·  spat  ·  pat  ·  pit  ·  nap  ·  mat  ·  sad', 'dig  ·  dog  ·  cot  ·  kit  ·  egg  ·  mud  ·  at'], heart='♥  heart words — a · the',
 oral_note='the nouns live in the pictures — named aloud, never printed',
 spreads=[
  dict(nar='The ant chased the…', text='rat.', size=68, art=RAT13+'/p1-ant.png'),
  dict(nar='The apple chased the…', text='rat.', size=68, art=RAT13+'/p2-apple.png'),
  dict(nar='The sun chased the…', text='rat.', size=68, art=RAT13+'/p3-sun.png'),
  dict(nar='The star chased the…', text='rat.', size=68, art=RAT13+'/p4-star.png'),
  dict(nar='The snake chased the…', text='rat.', size=68, art=RAT13+'/p5-snake.png'),
  dict(nar='The cat chased the…', text='rat.', size=68, art=RAT13+'/p6-cat.png'),
  dict(text=['Rat! Rat!','Rat!'], style='drop', size=64, art=RAT13+'/p7-recap.png'),
  dict(nar="The potato didn't chase the…", text='rat!', size=42, art=RAT13+'/p8-potato.png'),
 ]),

dict(slug='the-hot', title_lines=['The ___','Is Hot!'], title_accent='Hot!', title_size=44,
 band='LETTER H  ·  s a t p i n m d g o c k e u r h (the-sat cast)', booknum='LETTER BOOK FOURTEEN · HOT', cover=HOT14+'/p7-recap.png',
 new='Hot', review=['sat  ·  spat  ·  pat  ·  pit  ·  nap  ·  mat  ·  sad', 'dig  ·  dog  ·  cot  ·  kit  ·  egg  ·  mud  ·  rat  ·  at'], heart='♥  heart words — a · the',
 oral_note='the nouns live in the pictures — named aloud, never printed',
 spreads=[
  dict(nar='The ant is…', text='hot.', size=84, art=HOT14+'/p1-ant.png'),
  dict(nar='The apple is…', text='hot.', size=84, art=HOT14+'/p2-apple.png'),
  dict(nar='The sun is…', text='hot.', size=84, art=HOT14+'/p3-sun.png'),
  dict(nar='The star is…', text='hot.', size=84, art=HOT14+'/p4-star.png'),
  dict(nar='The snake is…', text='hot.', size=84, art=HOT14+'/p5-snake.png'),
  dict(nar='The cat is…', text='hot.', size=84, art=HOT14+'/p6-cat.png'),
  dict(text=['Hot! Hot!','Hot!'], style='drop', size=64, art=HOT14+'/p7-recap.png'),
  dict(nar="The potato isn't…", text='hot!', size=46, art=HOT14+'/p8-potato.png'),
 ]),

dict(slug='the-bug', title_lines=['The ___','Saw a Bug!'], title_accent='Bug!', title_size=44,
 band='LETTER B  ·  s a t p i n m d g o c k e u r h b (the-sat cast)', booknum='LETTER BOOK FIFTEEN · BUG', cover=BUG15+'/p7-recap.png',
 new='Bug', review=['sat  ·  spat  ·  pat  ·  pit  ·  nap  ·  mat  ·  sad', 'dig  ·  dog  ·  cot  ·  kit  ·  egg  ·  mud  ·  rat  ·  hot  ·  at'], heart='♥  heart words — a · the',
 oral_note='the nouns live in the pictures — named aloud, never printed',
 spreads=[
  dict(nar='The ant saw a…', text='bug.', size=78, art=BUG15+'/p1-ant.png'),
  dict(nar='The apple saw a…', text='bug.', size=78, art=BUG15+'/p2-apple.png'),
  dict(nar='The sun saw a…', text='bug.', size=78, art=BUG15+'/p3-sun.png'),
  dict(nar='The star saw a…', text='bug.', size=78, art=BUG15+'/p4-star.png'),
  dict(nar='The snake saw a…', text='bug.', size=78, art=BUG15+'/p5-snake.png'),
  dict(nar='The cat saw a…', text='bug.', size=78, art=BUG15+'/p6-cat.png'),
  dict(text=['Bug! Bug!','Bug!'], style='drop', size=64, art=BUG15+'/p7-recap.png'),
  dict(nar='The bug saw a…', text='potato!', size=44, art=BUG15+'/p8-potato.png'),
 ]),

dict(slug='the-tall', title_lines=['The Tall','___!'], title_accent='Tall', title_size=46,
 band='LETTER T  ·  s a t (companion reader)', booknum='LETTER BOOK · TALL', cover=TALL+'/p6-recap.png',
 new='Tall  ·  turtle  ·  tomato  ·  toothbrush  ·  tiger  ·  taxi', review='at', heart='♥  heart words — a · the',
 oral_note='the nouns live in the pictures — named aloud, never printed',
 spreads=[
  dict(nar='A tall…', text='turtle!', size=90, art=TALL+'/p1-turtle.png'),
  dict(nar='A tall…', text='tomato!', size=90, art=TALL+'/p2-tomato.png'),
  dict(nar='A tall…', text='toothbrush!', size=64, art=TALL+'/p3-toothbrush.png'),
  dict(nar='A tall…', text='tiger!', size=90, art=TALL+'/p4-tiger.png'),
  dict(nar='A tall…', text='taxi!', size=90, art=TALL+'/p5-taxi.png'),
  dict(text=['A turtle, a tomato,','a toothbrush, a tiger,','and a taxi — all tall?!'],
       style='drop', size=38, art=TALL+'/p6-recap.png'),
 ]),

dict(slug='spat', title_lines=['SPAT!'], title_accent='SPAT!', title_size=64,
 band='WEEK 4  ·  FIRST FULLY DECODABLE BOOK  ·  s a t p', booknum='BOOK FOUR OF SIX',
 cover=U+'/spat/spat-p7-spat-eruption.png',
 new='sap · pat · tap · spat', review=['sat'], heart='♥  heart word — a',
 spreads=[
  dict(text='Sat.', art=U+'/spat/spat-p1.png'),
  dict(text=['Sap.','Sap.','Sap.'], size=58, art=U+'/spat/spat-p2.png'),
  dict(nar='Sap! Sat!', text='Sat!', size=92, art=U+'/spat/spat-p3.png'),
  dict(nar='Pat, pat,', text='pat.', size=92, art=U+'/spat/spat-p4-sig-patched-webres.jpg'),
  dict(nar='Tap, tap,', text='tap.', size=92, art=U+'/spat/spat-p5.png'),
  dict(text='Pat? Pat? Tap?', style='whisper', art='tiles/BK4-p6.png'),
  dict(text='SPAT!', style='drop', size=100, art=U+'/spat/spat-p7-spat-eruption.png'),
  dict(nar='Sat! Sap!', text='Tap!', size=92, art=U+'/spat/spat-p8-aftermath.png'),
  dict(art=U+'/spat/spat-p9-wordless-cameo.png'),
 ]),
dict(slug='sit-sit-sit', title_lines=['Sit!','Sit! Sit!'], title_accent='Sit!', title_size=48,
 band='WEEK 5  ·  DECODABLE  ·  s a t p i', booknum='BOOK FIVE OF SIX',
 cover=U+'/sit/sit-sit-sit-p6-webres.jpg',
 new='sit · it · is · sip · pit · spit', review=['sat · pat · tap · sap'], heart='♥  heart word — a',
 spreads=[
  dict(nar='Sit!', text='Sit!', size=92, art=U+'/sit/sit-sit-sit-p1-webres.jpg'),
  dict(nar='It is a', text='pit!', size=92, art=U+'/sit/sit-sit-sit-p2-webres.jpg'),
  dict(text='Sit!', size=88, art=U+'/sit/sit-sit-sit-p3-webres.jpg'),
  dict(nar='It is', text='sap!', size=92, art=U+'/sit/sit-sit-sit-p4-webres.jpg'),
  dict(nar='Sit!', text='Sit!', size=92, art=U+'/sit/sit-sit-sit-p5-webres.jpg'),
  dict(nar='Sip, sip,', text='sip.', size=92, art=U+'/sit/sit-sit-sit-p6-webres.jpg'),
  dict(text='Spit it!', style='drop', size=78, art=U+'/sit/sit-sit-sit-p7-webres.jpg'),
  dict(nar='It sits! It', text='is!', size=92, art=U+'/sit/sit-sit-sit-p8-webres.jpg'),
  dict(art=U+'/sit/sit-sit-sit-p9-webres.jpg'),
 ]),
dict(slug='nap-ant-nap', title_lines=['Nap, Ant,','Nap!'], title_accent='Nap!', title_size=44,
 band='WEEK 6  ·  DECODABLE  ·  s a t p i n', booknum='BOOK SIX OF SIX',
 cover=U+'/nap/nap-ant-nap-p1-asleep-on-leaf.png',
 new='an · ant · in · nap · naps · pan · tin · nip · snap',
 review=['sit · it · is · pit · sip · spit','sat · pat · tap · sap'],
 heart='♥  heart words — a  ·  I',
 spreads=[
  dict(nar='An ant', text='naps.', size=92, art=U+'/nap/nap-ant-nap-p1-asleep-on-leaf.png'),
  dict(nar='An ant naps in a', text='pan.', size=92, art=U+'/nap/nap-ant-nap-p2-asleep-under-blanket-in-pan.png'),
  dict(nar='An ant naps in a', text='tin.', size=92, art=U+'/nap/nap-ant-nap-p3-asleep-curled-in-tin.png'),
  dict(text=['An ant naps','in a…'], style='whisper', art=U+'/nap/nap-ant-nap-p4-tabby-looms-over-sleeping-ant.png'),
  dict(text='SNAP! Nip!', style='drop', size=64, art=U+'/nap/nap-ant-nap-p5-snap-paw-slam-ant-awake.png'),
  dict(nar='Nap, Ant, nap! “I nap in', text='it!”', size=92, art=U+'/nap/nap-ant-nap-p6-ant-asleep-atop-tin-hat-on-pinned-cat.png'),
  dict(nar='An ant', text='naps.', size=92, art=U+'/nap/nap-ant-nap-p7-drowsy-ant-on-teacher-potato.png'),
 ]),
]
