# -*- coding: utf-8 -*-
# NOTE FOR FUTURE SESSIONS: fonts load from the canvas-design skill folder
# (/root/.claude/skills/canvas-design/canvas-fonts/) available in Cowork cloud sessions.
# Art inputs resolve from /mnt/user-data/uploads/... after device_stage_files; all
# Midjourney job UUIDs are in docs/curriculum/satpin-redesign/art-manifest.md.
U='/mnt/user-data/uploads/montree/phonics-images/satpin-v2/books'
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
 band='WEEK 2  ·  THE SOUND  /a/', booknum='BOOK TWO OF SIX', cover='bk2/p7.png',
 sound='a', sound_note='"ah–ah–ah" — never the letter name',
 oral_words='ant · ax · anchor · astronaut · alligator · apple',
 spreads=[
  dict(text='Ah— ANT!', accent='Ah—', accent_first=True, art='bk2/p1.png'),
  dict(text='An AX!', accent='An', accent_first=True, art='bk2/p2.png'),
  dict(text='An ANCHOR!', accent='An', accent_first=True, size=58, art='bk2/p3.png'),
  dict(text='An ASTRONAUT!', accent='An', accent_first=True, size=50, art='bk2/p4.png'),
  dict(text='shhh… an…', style='whisper', art='bk2/p5.png'),
  dict(text='AH! Ant!', style='drop', art='bk2/p6.png'),
  dict(text='An APPLE!', accent='An', accent_first=True, size=58, art='bk2/p7.png'),
  dict(art='bk2/p8.png'),
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
  dict(nar='The ant…', text=['Sat in','the pit!'], size=44, art=PIT3+'/pit-p2.png'),
  dict(nar='The apple…', text=['Sat in','the pit!'], size=44, art=PIT3+'/pit-p3.png'),
  dict(nar='The sun…', text=['Sat in','the pit!'], size=44, art=PIT3+'/pit-p4.png'),
  dict(nar='The star…', text=['Sat in','the pit!'], size=44, art=PIT3+'/pit-p5.png'),
  dict(nar='The snake…', text=['Sat in','the pit!'], size=44, art=PIT3+'/pit-p6.png'),
  dict(nar='The cat…', text=['Sat in','the pit!'], size=44, art=PIT3+'/pit-p7.png'),
  dict(text=['Sat in the pit!','Sat in the pit!','Sat in the pit!'], style='drop', size=42, art=PIT3+'/pit-p8.png'),
  dict(nar='And the…?!', art=PIT3+'/pit-p9.png'),
 ]),
dict(slug='the-pat', title_lines=['The ___','Can Pat!'], title_accent='Pat!', title_size=46,
 band='LETTER P  ·  s a t p (the-sat cast)', booknum='LETTER BOOK TWO · PAT', cover=PAT4+'/p7-recap.png',
 new='Pat', review='sat  ·  spat  ·  at', heart='♥  heart words — a · the',
 oral_note='the nouns live in the pictures — named aloud, never printed',
 spreads=[
  dict(nar='The ant…', text='can pat!', size=92, art=PAT4+'/p1-ant.png'),
  dict(nar='The apple…', text='can pat!', size=92, art=PAT4+'/p2-apple.png'),
  dict(nar='The sun…', text='can pat!', size=92, art=PAT4+'/p3-sun.png'),
  dict(nar='The star…', text='can pat!', size=92, art=PAT4+'/p4-star.png'),
  dict(nar='The snake…', text='can pat!', size=92, art=PAT4+'/p5-snake.png'),
  dict(nar='The cat…', text='can pat!', size=92, art=PAT4+'/p6-cat.png'),
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
  dict(text=['The potato',"doesn’t nap!"], size=48, art=NAP4+'/p8-potato.png'),
 ]),
dict(slug='the-mat', title_lines=['The ___ Sat','on the Mat!'], title_accent='Mat!', title_size=44,
 band='LETTER M  ·  s a t p i n m (the-sat cast)', booknum='LETTER BOOK FIVE · MAT', cover=MAT5+'/p7-recap.png',
 new='Mat', review='sat  ·  spat  ·  pat  ·  pit  ·  nap  ·  at', heart='♥  heart words — a · the',
 oral_note='the nouns live in the pictures — named aloud, never printed',
 spreads=[
  dict(nar='The ant…', text='sat on the mat!', size=80, art=MAT5+'/p1-ant.png'),
  dict(nar='The apple…', text='sat on the mat!', size=80, art=MAT5+'/p2-apple.png'),
  dict(nar='The sun…', text='sat on the mat!', size=80, art=MAT5+'/p3-sun.png'),
  dict(nar='The star…', text='sat on the mat!', size=80, art=MAT5+'/p4-star.png'),
  dict(nar='The snake…', text='sat on the mat!', size=80, art=MAT5+'/p5-snake.png'),
  dict(nar='The cat…', text='sat on the mat!', size=80, art=MAT5+'/p6-cat.png'),
  dict(text=['Mat! Mat!','Mat!'], style='drop', size=64, art=MAT5+'/p7-recap.png'),
  dict(text=['The potato','didn’t sit','on the mat!'], size=42, art=MAT5+'/p8-potato.png'),
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
  dict(nar='The ant…', text='is sad.', size=88, art=SAD6+'/p1-ant.png'),
  dict(nar='The apple…', text='is sad.', size=88, art=SAD6+'/p2-apple.png'),
  dict(nar='The sun…', text='is sad.', size=88, art=SAD6+'/p3-sun.png'),
  dict(nar='The star…', text='is sad.', size=88, art=SAD6+'/p4-star.png'),
  dict(nar='The snake…', text='is sad.', size=88, art=SAD6+'/p5-snake.png'),
  dict(nar='The cat…', text='is sad.', size=88, art=SAD6+'/p6-cat.png'),
  dict(text=['Sad! Sad!','Sad!'], style='drop', size=64, art=SAD6+'/p7-recap.png'),
  dict(text=['The potato','is not sad!'], size=48, art=SAD6+'/p8-potato.png'),
  dict(text=['Now the whole crew','is not sad!'], size=42, art=SAD6+'/p9-finale.png'),
 ]),
dict(slug='spat', title_lines=['SPAT!'], title_accent='SPAT!', title_size=64,
 band='WEEK 4  ·  FIRST FULLY DECODABLE BOOK  ·  s a t p', booknum='BOOK FOUR OF SIX',
 cover=U+'/spat/spat-p7-spat-eruption.png',
 new='sap · pat · tap · spat', review=['sat'], heart='♥  heart word — a',
 spreads=[
  dict(text='Sat.', art=U+'/spat/spat-p1.png'),
  dict(text=['Sap.','Sap.','Sap.'], size=58, art=U+'/spat/spat-p2.png'),
  dict(text=['Sap!','Sat! Sat!'], size=58, art=U+'/spat/spat-p3.png'),
  dict(text=['Pat,','pat, pat.'], size=58, art=U+'/spat/spat-p4-sig-patched-webres.jpg'),
  dict(text=['Tap,','tap, tap.'], size=58, art=U+'/spat/spat-p5.png'),
  dict(text='Pat? Pat? Tap?', style='whisper', art='tiles/BK4-p6.png'),
  dict(text='SPAT!', style='drop', size=100, art=U+'/spat/spat-p7-spat-eruption.png'),
  dict(text=['Sat!','Sap! Tap!'], size=58, art=U+'/spat/spat-p8-aftermath.png'),
  dict(art=U+'/spat/spat-p9-wordless-cameo.png'),
 ]),
dict(slug='sit-sit-sit', title_lines=['Sit!','Sit! Sit!'], title_accent='Sit!', title_size=48,
 band='WEEK 5  ·  DECODABLE  ·  s a t p i', booknum='BOOK FIVE OF SIX',
 cover=U+'/sit/sit-sit-sit-p6-webres.jpg',
 new='sit · it · is · sip · pit · spit', review=['sat · pat · tap · sap'], heart='♥  heart word — a',
 spreads=[
  dict(text='Sit! Sit!', art=U+'/sit/sit-sit-sit-p1-webres.jpg'),
  dict(text='It is a pit!', size=58, art=U+'/sit/sit-sit-sit-p2-webres.jpg'),
  dict(text='Sit!', size=88, art=U+'/sit/sit-sit-sit-p3-webres.jpg'),
  dict(text='It is sap!', size=62, art=U+'/sit/sit-sit-sit-p4-webres.jpg'),
  dict(text='Sit! Sit!', art=U+'/sit/sit-sit-sit-p5-webres.jpg'),
  dict(text=['Sip,','sip, sip.'], size=58, art=U+'/sit/sit-sit-sit-p6-webres.jpg'),
  dict(text='Spit it!', style='drop', size=78, art=U+'/sit/sit-sit-sit-p7-webres.jpg'),
  dict(text=['It sits!','It is!'], size=58, art=U+'/sit/sit-sit-sit-p8-webres.jpg'),
  dict(art=U+'/sit/sit-sit-sit-p9-webres.jpg'),
 ]),
dict(slug='nap-ant-nap', title_lines=['Nap, Ant,','Nap!'], title_accent='Nap!', title_size=44,
 band='WEEK 6  ·  DECODABLE  ·  s a t p i n', booknum='BOOK SIX OF SIX',
 cover=U+'/nap/nap-ant-nap-p1-asleep-on-leaf.png',
 new='an · ant · in · nap · naps · pan · tin · nip · snap',
 review=['sit · it · is · pit · sip · spit','sat · pat · tap · sap'],
 heart='♥  heart words — a  ·  I',
 spreads=[
  dict(text=['An ant','naps.'], size=58, art=U+'/nap/nap-ant-nap-p1-asleep-on-leaf.png'),
  dict(text=['An ant naps','in a pan.'], size=46, art=U+'/nap/nap-ant-nap-p2-asleep-under-blanket-in-pan.png'),
  dict(text=['An ant naps','in a tin.'], size=46, art=U+'/nap/nap-ant-nap-p3-asleep-curled-in-tin.png'),
  dict(text=['An ant naps','in a…'], style='whisper', art=U+'/nap/nap-ant-nap-p4-tabby-looms-over-sleeping-ant.png'),
  dict(text='SNAP! Nip!', style='drop', size=64, art=U+'/nap/nap-ant-nap-p5-snap-paw-slam-ant-awake.png'),
  dict(text=['Nap, Ant, nap!','“I nap in it!”'], size=42, art=U+'/nap/nap-ant-nap-p6-ant-asleep-atop-tin-hat-on-pinned-cat.png'),
  dict(text=['An ant','naps.'], size=58, art=U+'/nap/nap-ant-nap-p7-drowsy-ant-on-teacher-potato.png'),
 ]),
]
