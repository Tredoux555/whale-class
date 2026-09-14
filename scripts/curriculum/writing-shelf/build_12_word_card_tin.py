#!/usr/bin/env python3
"""
Dark Phonics · Writing Shelf · sheet 12, the Tray 5 WORD-CARD TINS

FOUR TINS, NOT ONE, and every word printed at the size the child WRITES it.

The old sheet was one tin of fifty-three reader words on 60 x 35 mm cards, set
at sheet 04's heart-word size.  Two things were wrong with it and they are the
whole of this rebuild.

ONE · THE CARD WAS A FIXED 60 mm WIDE.  `a` got a 60 mm card and `penguin` got
a 60 mm card, so when the child butted the words up into a sentence on the mat
the ink-to-ink space between them was whatever the shorter word happened to
leave — 26 mm after `a`, 10 mm after `splash`.  The tin was teaching him to
leave gigantic and uneven spaces between his words, which is the one thing a
word-building material exists to teach him NOT to do.  The card is now MEASURED:

    G          = 7.0 mm, the word space
    card width = the word's INK width + G, to the nearest 0.1 mm
    the word   = placed with exactly G/2 of paper from the card's left edge to
                 its first ink, and G/2 from its last ink to the right edge

There is no minimum.  `a` comes out a 12.3 mm sliver and that is correct: a
sliver is what the word IS.  Butt any two cards and the space between the last
ink of one word and the first ink of the next is G — 7.0 mm, 0.52 em — for EVERY
pair in every tin, whatever letters meet.

PADDING BY THE INK IS THE WHOLE OF IT, and padding by the ADVANCE was the first
cut of this and was wrong.  stringWidth() measures the advance box, which
carries each glyph's side bearings: `o` sits well inside its advance, `j` and
`y` hang outside theirs.  Pad by that and the paper between two cards is
constant but the space the EYE reads — ink to ink — swings from 2.85 mm to
6.17 mm depending on which letters happen to meet, and on the proof
`blob cat crab dad penguin` came out with word gaps barely wider than the letter
gaps inside the words.  The child cannot see a word boundary he cannot measure.
So the card is measured on the real glyph outlines, first glyph's left side
bearing and last glyph's right side bearing included, and the gap is constant in
the only units that matter.

WHY 7.0 AND NOT A DERIVED NUMBER.  The obvious G is one letter wide — the ink of
this font's own `o` at this size, 5.909 mm — which is the oldest rule in setting
type and is what this sheet shipped first.  Set as real cards at true scale and
looked at, it was still tight: these are LOOSE cards a child pushes together with
his hands, not glyphs locked in a line, and a gap that reads as a word space on
a page reads as a join when the pieces can drift a millimetre.  7.0 mm was
chosen by eye off .build/gap_compare.py, which draws 4.0 / 5.0 / 5.909 / 7.0 /
8.5 through these very functions on an A3 sheet that prints life size.  4.0 and
5.0 crowd; 8.5 breaks the sentence into separate objects.  The `o` derivation is
kept in word_space() as the None branch and is what the proof still calls; it
was not lost, it was outvoted.

THE 0.1 mm GRID is the nearest tenth, not the next tenth up: the roundoff is then
at most 0.05 mm and it is SPLIT between the two sides of the card, so no butted
pair is more than 0.05 mm off G.  The cut is found off a printed tick, never off
a ruler, so nothing about the cutting wanted a coarser grid.

THE TYPEFACE IS COMIC NEUE, sheets 13/14/15's face, single-storey a and g, and
the same file: public/fonts/ComicNeue-Regular.ttf.  Not sheet 04's Fredoka —
Fredoka is the flashcard display face and the tin is now a WRITING material.

THREE TINS AND A FOURTH SET.  Tray 5's sentence cards are graded pink / blue /
green (the Montessori reading series), and a tin that holds all the words for
all three tiers is a tin the child has to sort before he can start.  So there
are three tins, one a tier, and each is SELF-CONTAINED.

BOTH DECKS, AND THE COUNT IS A SUM (2026-09-14).  Two things changed here, and
they came off a morning in the classroom.

FIRST, THE TIN COUNTED ONLY SHEET 14.  tier_need() read SB.CARDS and nothing
else, so sheet 13's FOURTEEN STORY STARTERS — cat on a mat, pig in a wig, hen in
a pen and the rest — were never in the tin at all: nineteen words (mat, pen,
dog, log, bug, rug, rat, hat, nut, hut, pan, cub, bog, bee, tree, duck, truck,
sheep, asleep) had no card, and not one starter had the capitalised lead word it
opens on.  The child picked a story starter off the tray and could not build it.
The tins are now derived from BOTH decks — sentences() below is the one place
that reads them — so the scope of the tin is Tray 5's thirty-two sentences:
sheet 13's fourteen (10 pink, 0 blue, 4 green) and sheet 14's eighteen (6 pink,
6 blue, 6 green).  Sheet 13's phrases go through SB.display_words() exactly like
sheet 14's, so `cat on a mat` asks the tin for `Cat`, `on`, `a` and `mat.` —
this sheet does not have a second display rule and never types a capital or a
stop of its own.  (Sheet 13's own CARDS stay lower case, as its deck prints.)

SECOND, THE COUNT IS A SUM AND NO LONGER A MAXIMUM.  It used to be "the most any
SINGLE sentence of the tier needs at once", which is a tin you can build one
sentence out of.  The owner's decision, 2026-09-14: a tin must lay out ALL of
its tier's sentences AT ONCE, on the mat, together — that is how the work is
actually used — so the count of a printed form is the SUM over that tier's
sentences, not the maximum.  Pink therefore holds `a` eleven times over, because
eleven of its sixteen sentences want an `a`.  check_buildable() re-derives from
sheets 13 and 14 that every one of the thirty-two sentences can be laid
simultaneously out of the printed tins, and refuses to build otherwise.

Words shared across tiers are printed again in each tin.

AND THE FORM IS THE PRINTED FORM (2026-09-13).  The sentences are set
as proper sentences now — capital on the first word, full stop on the last —
and the owner put the STOP ON THE LAST WORD CARD rather than on a tile of its
own.  So a tin holds `The` and `A` where a sentence opens on them, `sat.` and
`wig.` where one closes on them, and BOTH forms where one tier needs both:
green carries `The` and `the` together, and `sat` beside `sat.`, because "the
sad dad sat in the sand" wants the first of each pair while its neighbours end
on the second.  build_14.display_words() is the one transform and this sheet
derives the tins from it; nothing here types a capital or a full stop.
That duplication is the point: he takes down one tin and never reaches for
another, and no tin can be half of a sentence.

The FOURTH set is uncoloured and is for FREE COMPOSITION: the reader words the
tin already held that no sentence card on EITHER deck uses — bell, chick,
splash, bonk and the rest — plus the ten blank cards, so the tin grows as the
readers do.  It is the leftovers of the ledger by definition, so a word that
sheet 13 has now brought into a tier tin leaves the free set automatically;
nothing is printed twice over.  Its rule
is a neutral charcoal, which is the absence of a tier and not a fourth one.

THE TIER COLOUR IS THE BASELINE.  A 0.5 mm rule runs the FULL width of the card,
edge to edge, and the word sits on it.  It is a WRITING LINE, not a highlighter
stripe: the first cut of this sheet drew it 1.8 mm thick and it read as a bar
under the word and swallowed the descenders whole — the g of `penguin` and the p
of `jump` vanished into it.  0.5 mm in full tier colour still carries across a
room for sorting, and the word is drawn AFTER the rule so the descenders cross
OVER it exactly as they do on ruled paper and in the booklet, whose own baseline
is 0.9 pt.  That is the only colour on the card and
it does three things at once: it says which tin the card belongs to, it is the
line the letters stand on — so the card is a one-word writing line — and when
the cards are butted the rules join into ONE continuous coloured line under the
whole sentence.  There is no frame, no tint, no label.  Colours are sheet 14's
TIER_C, imported, never re-declared.

THE GRAMMAR SYMBOL IS ON THE FRONT, CENTRED ABOVE THE WORD, and it is TINY —
3.6 mm, against a word whose x-height alone is 6.6 mm.  It is not a sorting mark
and it is not a label.  It sits exactly where the full-size Tray 8 token will be
laid when the child comes to that work, so the card is quietly showing him the
shape he will one day put there: he can point at it and ask what it is, and he
can read the grammar of a sentence he has already built with his own hands.  An
earlier cut of this sheet put the symbol on the BACK, to make the card its own
control of error; the owner overruled it (2026-09-13) for the reason above, and
the sheet is single-sided again.  Blank cards carry no symbol.

The symbol's TOP sits 2.5 mm down from the card's top edge and check() proves at
least SYM_CLEAR of paper between its foot and the tallest ascender on that card,
card by card, refusing to build otherwise.

SEVEN PARTS OF SPEECH, NOT THREE LENGTH BUCKETS.  The tin used to sort into
"naming / doing / small words", and `small` was not a grammar — it was a bucket
for anything short, holding the, a, in, and, it, my, wet and top at once.  The
symbols are now the standard Montessori ones and the classes are real:

    noun          black triangle      #141110   1.00
    verb          red circle          #C8102E   1.00  (diameter = the base height)
    adjective     dark blue triangle  #1F4E8C   0.80
    article       light blue triangle #6BA8CE   0.70
    preposition   green crescent      #3F7A3F   0.90
    pronoun       purple triangle     #6B4E9B   0.90  narrower than the noun's
    conjunction   pink bar            #E39BB4   0.90  wider than it is tall

The scale is of SYM_H, and the article's triangle is smaller than the
adjective's, which is smaller than the noun's, exactly as the Tray 8 tokens are:
the size is part of the symbol.  check() refuses to build unless the seven
classes cover the ledger EXACTLY — no word unclassified, no classified word
missing from the tin.

THE SHEET IS LAID IN STRIPS, NOT A GRID, because the cards are no longer all the
same width.  A strip is 28 mm tall and holds cards butted left to right from the
left margin until the next one will not fit; then a new strip starts.  The strips
BUTT - GUTTER = 0.0 - so strip N's bottom edge IS strip N+1's top edge and one
full-width cut line is drawn on it, with a triangle at each end, per cutmarks.py's
CUT ONCE standard: one stroke of the blade frees both and every piece comes off a
true 28 mm.  The one place this sheet cannot follow that standard is the VERTICAL
cut: a full-height vertical would run through the middle of the cards in every
other strip, since no two strips share their card boundaries.  So a vertical is a
TICK — the same grey hairline, running the height of its own strip and 3.5 mm out
into the gutter above and below, where the eye and the blade pick it up before
they reach the card.  The hairline crosses the card because it IS the card edge
and is cut away, which is the standard's own rule 3 and is why the tick can be
trusted after the strip has been cut free of the sheet.

ONE TIN TO A PAGE, in tray order: pink, blue, green, then the free set.  A page
never mixes tins, for sheets 13 and 14's reason — the teacher prints each tin
onto its own colour of card stock, so a sheet carrying two tins has to be cut in
half and run twice.  pages() fills a page from ONE tin and stops; a tin's last
page is left SHORT rather than topped up from the next tin, and the white on it
is the correct answer, not a gap to plug.  Every page header names the one tin
on it and its place in that tin's run.  (The prose here once said a page may
carry several tins and the code once did it; both were wrong and both are gone.)

WHAT IS IN EACH TIN IS DERIVED, NEVER TYPED.  SENTENCE_BUILDER_CARDS in
lib/montree/dark-phonics/writing-shelf-language.ts is the source of truth; the
counts above are read off its sentences, and check_source() — sheet 14's, called
through — refuses to build if the mirror has drifted.  A sentence word that has
no part-of-speech class here also stops the build, so a new card can never
quietly leave its word out of the tin.

Eleven words the readers use arrived with sheet 14's sentences and are now in the
ledger: ant, sad, pig, wig, naps, star, penguin, spat, blob, dad, can, classed
the way WORD_CLASSES in the same TypeScript classes them (its `describing` and
`little` both land in this sheet's `small` compartment, as `bad` and `hot`
already did).  NINETEEN MORE arrived with sheet 13 on 2026-09-14 — eighteen
nouns (mat, pen, dog, log, bug, rug, rat, hat, nut, hut, pan, cub, bog, bee,
tree, duck, truck, sheep) and `asleep`, which is filed as an ADJECTIVE: it is
what the sheep IS, the one word on either deck that describes its subject
without a verb between them, and Montessori's dark blue triangle is the token a
predicate adjective takes.  The app's SENTENCE_BANK / WORD_CLASSES ledger was
NOT touched for any of them — see the TIN vs LEDGER note below, which the owner
re-affirmed on 2026-09-14: the two lists are independent on purpose.

Run:   python3 scripts/curriculum/writing-shelf/build_12_word_card_tin.py
Needs: reportlab, fontTools; pdftoppm (poppler) for the x-height probe and the
       proof PNGs — the build says so loudly rather than skipping if it is absent.
"""

import collections
import functools
import math
import shutil
import subprocess
from pathlib import Path

from fontTools import ttLib
from reportlab.lib.colors import Color
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

import build_13_story_starter_cards as SS
import build_14_sentence_builder_cards as SB
import cutmarks as CM

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
OUT_DIR = REPO / "public" / "dark-phonics-shelf" / "v2"
FONT_DIR = REPO / "public" / "fonts"
BUILD_DIR = HERE / ".build"
PROOF_DIR = BUILD_DIR / "proof"
NAME = "12-word-card-tin.pdf"
PDF_TITLE = "Dark Phonics · Writing Shelf · word-card tin"
PDF_AUTHOR = "Montree Phonics"          # build_booklets.PDF_AUTHOR, the set's

PAGE_W, PAGE_H = 210.0, 297.0

# ---------------------------------------------------------------- the size ----
# 6.6 mm is build_15_writing_book.RULE_U and build_tracing's u.  It is NOT
# imported: build_15 imports THIS module (for the word ledger), so importing it
# back would be a cycle.  If the book's rule ever moves, move this with it.
X_HEIGHT = 6.6                          # mm — the x-height of the writing rule
WORD_FONT = "ComicNeue"
WORD_TTF = FONT_DIR / "ComicNeue-Regular.ttf"
ADULT_FONT = "Andika"
ADULT_TTF = FONT_DIR / "Andika-Regular.ttf"

# ---------------------------------------------------------------- the card ----
CARD_H = 28.0                           # mm, every card
BASELINE = 9.0                          # mm up from the card's bottom edge
RULE_H = 0.5                            # mm — the coloured baseline rule
W_STEP = 0.1                            # mm — card width, to the NEAREST tenth
BLANK_W = 30.0                          # mm — a blank card, room for a long word

# The grammar symbol, centred above the word on the FRONT.  SYM_H is the noun
# triangle's height and every other symbol is a named fraction of it, so the
# whole set scales from one number.
SYM_H = 3.6                             # mm — nominal symbol height
SYM_TOP = 2.5                           # mm from the card's top edge to its top
SYM_CLEAR = 1.5                         # mm least paper between it and the ink
SYM_SIDE = 1.5                          # mm least paper each side of it
CRESC_D = 0.385                         # the crescent's belly, of its height
CRESC_W = 0.5 + CRESC_D / 2.0           # ...and the width that follows from it


# ---------------------------------------------------------------- the sheet ----
MARGIN = 12.0                           # mm — page edge to the outermost cut
X0 = 10.0                               # mm — every strip starts here
STRIP_MAX_W = PAGE_W - 2.0 * X0         # 190.0
MAX_STRIPS = 9
GUTTER = 0.0                            # mm — strips BUTT, in both axes
TICK_IN = 2.0                           # mm a vertical tick runs into the strip
BAND_TOP = PAGE_H - MARGIN              # 285.0 — top strip's top EDGE
BAND_BOT = MARGIN                       # mm — no cut line may fall below this

# ADULT TEXT IS AT THE FOOT, BOTH LINES.  It used to be a caption at y 277 and a
# footer at y 18, and a 12 mm top margin leaves no room for the caption: the
# first cut line is now 12 mm off the page head and a line of type above it would
# sit inside the printer-safe margin.  So the caption has come down to the foot
# and sits above the cutting line, which is where a reader looks for both anyway.
LABEL_Y = 20.0
FOOT_Y = 12.0
FOOT_SIZE = 5.5
TEXT_X = X0 + 5.0
LABEL_C = Color(0.3725, 0.3490, 0.3098)         # #5F594F, the set's adult grey
INK = CM.MARK_C                                 # #141110, the house ink

# The Tray 8 / Montessori grammar colours.  The noun's black is the house ink.
NOUN_C = Color(0.0784, 0.0667, 0.0549)          # #141110  black triangle
VERB_C = Color(0.7843, 0.0627, 0.1804)          # #C8102E  red circle
ADJ_C = Color(0.1216, 0.3059, 0.5490)           # #1F4E8C  dark blue triangle
ART_C = Color(0.5608, 0.7608, 0.8706)           # #8FC2DE  light blue triangle
PREP_C = Color(0.2471, 0.4784, 0.2471)          # #3F7A3F  green crescent
PRON_C = Color(0.4196, 0.3059, 0.6078)          # #6B4E9B  purple triangle
CONJ_C = Color(0.8902, 0.6078, 0.7059)          # #E39BB4  pink bar

# The free set's rule.  The house ink lifted to a charcoal: dark enough to be a
# baseline, plainly not one of the three series colours.
CHARCOAL_C = Color(0.3098, 0.2902, 0.2667)      # #4F4A44


# ------------------------------------------------------------- the ledger ----
# Every word the eleven Easy Readers and Tray 5's sentence cards use, classed by
# PART OF SPEECH and carrying its Montessori symbol.  The tuple is
# (key, plural label, shape, colour, scale of SYM_H, words) and the first four
# fields are the Tray 8 token, shrunk.
#
# AND IT IS DELIBERATELY NOT THE SAME LIST as WORD_CLASSES / the RAW decodable
# ledger / SENTENCE_BUILDER_GAPS in writing-shelf-language.ts, which still count
# sun, digs, hot and eleven more as words the tin does not hold.  The owner has
# ruled on that divergence and it is not a bug to tidy: a tile EXISTING in the
# printed tin is not the same fact as the word having been TAUGHT in sequence,
# and the ledger tracks the teaching.  An earlier session was right to refuse an
# instruction to sync the two.  Do not sync them.
#
# `bonk` IS FILED AS A VERB AND THE OWNER HAS NOT RULED ON IT.  It reads as an
# interjection as often as a verb ("bonk!" / "the crabs bonk").  It is pulled out
# into its own constant so that changing his mind is one line here and nothing
# else in the file.
BONK_CLASS = "verb"                     # or "interjection" when he rules on it

# The symbol for each class: shape, colour, and its height as a fraction of
# SYM_H.  The scale is part of the symbol — a Tray 8 article triangle is smaller
# than an adjective triangle, which is smaller than a noun's.
SYMBOL = {
    "noun":        ("triangle", NOUN_C, 1.00),
    "verb":        ("circle", VERB_C, 1.00),
    "adjective":   ("triangle", ADJ_C, 0.80),
    "article":     ("triangle", ART_C, 0.70),
    "preposition": ("crescent", PREP_C, 0.90),
    "pronoun":     ("narrow-triangle", PRON_C, 0.90),
    "conjunction": ("bar", CONJ_C, 0.90),
}

# (key, plural label, shape, words) — the shape is repeated from SYMBOL because
# build_15_writing_book.py unpacks exactly these four fields off this table.
CATEGORIES = [
    # The eighteen nouns added 2026-09-14 are sheet 13's: bee, bog, bug, cub,
    # dog, duck, hat, hut, log, mat, nut, pan, pen, rat, rug, sheep, tree,
    # truck.  Every one of them is a story starter's own word and none of them
    # is in WORD_CLASSES — the tin and the teaching ledger stay independent.
    ("noun", "nouns", "triangle",
     ["ant", "bed", "bee", "bell", "blob", "bog", "box", "bug", "cat", "cats",
      "chick", "chip", "cot", "crab", "cub", "dad", "dog", "duck", "fish",
      "fox", "frog", "hat", "hen", "hill", "hut", "log", "mat", "moth",
      "moths", "mud", "nut", "pan", "pen", "penguin", "pig", "pup", "rat",
      "rug", "sand", "sheep", "star", "sun", "tip", "top", "tree", "truck",
      "tub", "wig"]),
    ("verb", "verbs", "circle",
     ["can", "cut", "digs", "fell", "fix", "is", "jump", "mix", "naps", "ran",
      "sat", "sit", "spat", "splash"]),
    # `asleep` (sheet 13, "sheep asleep") is a PREDICATE ADJECTIVE — what the
    # sheep is — and takes the adjective's dark blue triangle.  It is the one
    # word on either deck that describes its subject with no verb between them.
    ("adjective", "adjectives", "triangle",
     ["asleep", "bad", "big", "hot", "mad", "my", "red", "sad", "six", "that",
      "this", "wet"]),
    ("article", "articles", "triangle", ["a", "the"]),
    ("preposition", "prepositions", "crescent", ["in", "off", "on", "to"]),
    ("pronoun", "pronouns", "narrow-triangle", ["it"]),
    ("conjunction", "conjunctions", "bar", ["and"]),
]

# ...and `bonk` goes into whichever class BONK_CLASS names, so that one constant
# really is the whole of that decision.
for _row in CATEGORIES:
    if _row[0] == BONK_CLASS:
        _row[3].append("bonk")
        _row[3].sort()
        break
else:
    raise SystemExit("BONK_CLASS %r is not one of the classes" % BONK_CLASS)

CLASS_OF = {w: key for key, _l, _s, ws in CATEGORIES for w in ws}
LABEL_OF = {key: lbl for key, lbl, _s, _w in CATEGORIES}

N_BLANKS = 10                       # what the old sheet carried, unchanged

# The four sets, in tray order.  tier None is the free-composition set.
TINS = [(1, "pink"), (2, "blue"), (3, "green"), (None, "free composition")]


# THE TIN HOLDS THE PRINTED FORMS, NOT THE LEDGER ONES (2026-09-13).  The
# eighteen sentences now print as proper sentences — capital first word, full
# stop on the last — and the owner ruled that the STOP RIDES ON THE LAST WORD
# CARD rather than coming as a separate tile.  So the card the child lays is
# `The`, or `sat`, or `sat.`, and which of the three a tier needs is a fact
# about that tier's six sentences, derived here and nowhere else.  A tier that
# uses a word both mid-sentence and last gets BOTH cards: green's "the sad dad
# sat in the sand" wants `sat` while three of its neighbours end on `sat.`, and
# it wants `The` and `the` in the one sentence.
#
# SB.display_words() is the single transform; SB.plain() takes a printed card
# back to its ledger word so it can be classed.  Nothing here adds a capital or
# a full stop of its own.
# VARIANT_ORDER is the order the forms of ONE ledger word sit in its
# compartment: the sentence-opening capital, then the plain card, then the card
# that closes a sentence — the order they are used in, left to right.
def variant_key(word):
    """Sort key putting `The` before `the` before `the.` in one compartment."""
    return (0 if word[:1].isupper() and word != "I" else 1,
            1 if word.endswith(".") else 0)


def sentences():
    """(tier, sentence) for EVERY Tray 5 sentence card — sheets 13 AND 14.

    THE ONE PLACE THIS SHEET READS THE DECKS.  Thirty-two sentences: sheet 13's
    fourteen story starters and sheet 14's eighteen sentence cards.  Sheet 13
    was missing from here until 2026-09-14 and that was the defect the teacher
    hit in class — nineteen of its words had no card in any tin.

    The tier is the GROUP tier, which is the tray the card sits in and therefore
    the tin the child reaches for.  The one carried card (sheet 14's fox-box:
    pink words, blue tray) is counted with the BLUE tin for that reason, even
    though its frame is pink.  Sheet 13 has no carries and no blue cards.
    """
    out = [(tier, sent) for _slug, tier, sent in SS.CARDS]
    out += [(group, sent) for _slug, group, sent, _art, _frame in SB.CARDS]
    return out


def tier_need(tier):
    """How many of each PRINTED word this tier's sentences need ALL AT ONCE.

    A SUM ACROSS THE TIER'S SENTENCES, not the maximum of them (owner,
    2026-09-14).  The maximum built a tin you could make ONE sentence out of;
    the work is laying the whole tier out on the mat together, so the tin holds
    as many `a` cards as its sentences have `a` in them.  Derived from
    sentences() — both decks — in their DISPLAY form, via SB.display_words(),
    which is the only transform either deck has.
    """
    need = collections.Counter()
    for group, sentence in sentences():
        if group != tier:
            continue
        need += collections.Counter(SB.display_words(sentence))
    return need


def tin_cards(tier):
    """(word, class) for one tin, in compartment order, duplicates adjacent."""
    if tier is None:
        # The free set is the reader words NO sentence card on EITHER deck
        # uses, and that is a question about the LEDGER word, not about how it
        # happens to be printed — `sat.` does not put `sat` back on the free
        # sheet.  Unaffected by the display rule, and deliberately so.  Sheet
        # 13 joining the derivation on 2026-09-14 took nothing out of the free
        # set, because all nineteen of its words were new to the ledger.
        used = set()
        for _group, sentence in sentences():
            used.update(sentence.split())
        out = [(w, key) for key, _l, _s, ws in CATEGORIES for w in ws
               if w not in used]
        return out + [(None, None)] * N_BLANKS
    need = tier_need(tier)
    by_base = collections.defaultdict(list)
    for word in need:
        by_base[SB.plain(word)].append(word)
    out = []
    for key, _l, _s, ws in CATEGORIES:
        for w in ws:
            for form in sorted(by_base.get(w, ()), key=variant_key):
                out.extend([(form, key)] * need[form])
    return out


# ---------------------------------------------------------------- the font ----
def register_fonts():
    pdfmetrics.registerFont(TTFont(WORD_FONT, str(WORD_TTF)))
    pdfmetrics.registerFont(TTFont(ADULT_FONT, str(ADULT_TTF)))


@functools.lru_cache(maxsize=1)
def _ttf():
    """The word face's own outlines, opened once. Metrics come off THIS."""
    return ttLib.TTFont(str(WORD_TTF))


def word_size():
    """Solve the point size from the FONT's own x-height. Never a guess."""
    f = _ttf()
    upm = float(f["head"].unitsPerEm)
    sx = float(getattr(f["OS/2"], "sxHeight", 0) or 0)
    how = "OS/2.sxHeight"
    if sx <= 0:                     # pre-OS/2 v2 face: measure the 'x' outline
        g = f["glyf"]["x"]
        sx, how = float(g.yMax), "measured 'x' bbox"
    size = (X_HEIGHT / 25.4 * 72.0) / (sx / upm)
    return size, dict(upm=upm, sx=sx, how=how)


SIZE, SIZE_FROM = None, None        # filled by build(); a module-level cache


@functools.lru_cache(maxsize=None)
def gname(ch):
    """The GLYPH NAME of a character, off the font's own cmap.

    For a letter in this face the name happens to be the character, which is
    why `glyf[ch]` read correctly for years.  It is not true in general and it
    is not true of the full stop the sentences now end on — `.` is named
    `period` — so every glyf/hmtx/glyph-set lookup on this sheet and on
    build_16 goes through here.  A character the face does not carry is a build
    failure, not a silent fallback box.
    """
    f = _ttf()
    name = f.getBestCmap().get(ord(ch))
    if name is None:
        raise SystemExit("SPEC FAILURE: %s has no glyph for %r — the word "
                         "cards cannot set it" % (WORD_TTF.name, ch))
    return name


@functools.lru_cache(maxsize=None)
def glyph_box(word):
    """Ink box of a word at SIZE, in mm relative to (left of advance, baseline).

    Uses the real glyph outlines and side bearings, so a check on `my` sees the
    y descender and a check on `a` sees how far its ink really is from the card
    edge — neither of which the advance width knows.
    """
    f = _ttf()
    upm = float(f["head"].unitsPerEm)
    glyf, hmtx = f["glyf"], f["hmtx"]
    k = SIZE / upm / 72.0 * 25.4
    pen, left, right, top, bot = 0.0, None, None, -1e9, 1e9
    for ch in word:
        adv, lsb = hmtx[gname(ch)]
        g = glyf[gname(ch)]
        if g.numberOfContours:
            x0, x1 = pen + g.xMin, pen + g.xMax
            left = x0 if left is None else min(left, x0)
            right = x1 if right is None else max(right, x1)
            top, bot = max(top, g.yMax), min(bot, g.yMin)
        pen += adv
    if left is None:                # nothing but spaces; no such word here
        return 0.0, 0.0, 0.0, 0.0
    return left * k, right * k, top * k, bot * k


def advance(word):
    """The typographic advance. Kept for reporting; the CARD is not built on it."""
    return pdfmetrics.stringWidth(word, WORD_FONT, SIZE) / 72.0 * 25.4


def ink_w(word):
    left, right, _t, _b = glyph_box(word)
    return right - left


# G lives here as a module-level DEFAULT, and not as a bare measurement inside
# word_space(), so that a proof can draw these same cards at a CANDIDATE gap
# through the real drawing functions instead of keeping a second copy of them.
# None means "measure it off the font", which is the shipped sheet's G and the
# only value the build itself ever uses.  Nothing in the build passes g=.
# 7.0 mm was CHOSEN BY EYE against 4.0 / 5.0 / 5.909 (the `o` ink) / 8.5, drawn
# as real cards at true scale and printed — .build/gap_compare.py regenerates
# that comparison.  The `o`-width derivation below is not lost and is not to be
# "restored": it is the None branch, it still runs for the proof, and it lost.
WORD_SPACE = 7.0                        # mm — or None for the ink of one `o`


def word_space(g=None):
    """G — the word space. 7.0 mm on this sheet; see WORD_SPACE above.

    An explicit `g` overrides it, which is how the gap proof draws candidates
    through the real card functions.  g=None with WORD_SPACE=None falls back to
    the measured ink width of a lowercase `o`, the derivation 7.0 was picked
    over.
    """
    if g is not None:
        return g
    if WORD_SPACE is not None:
        return WORD_SPACE
    return ink_w("o")


def card_w(word, g=None):
    """MEASURED width: the word's INK plus G/2 of paper each side."""
    if word is None:
        return BLANK_W
    return round((ink_w(word) + word_space(g)) / W_STEP) * W_STEP


def ink_left(word, cw):
    """Where the word's first INK sits, in mm from the card's left edge."""
    return (cw - ink_w(word)) / 2.0


# ------------------------------------------------------------- the imposition ----
def strips(cards):
    """Butted strips, packed left to right until the next card will not fit."""
    out, row, w = [], [], 0.0
    for word, cls in cards:
        cw = card_w(word)
        # ...and a BLANK starts a fresh strip.  A blank card half way along a
        # strip of words reads as a card the build forgot to print on; a strip
        # of nothing but blanks reads as what it is, the room the tin has to grow.
        blank_break = row and (word is None) != (row[0][0] is None)
        if row and (blank_break or w + cw > STRIP_MAX_W + 1e-9):
            out.append(row)
            row, w = [], 0.0
        row.append((word, cls, cw))
        w += cw
    if row:
        out.append(row)
    return out


def all_strips():
    """Every strip of the whole build, in tray order, each tagged with its tin.

    One strip is one tin's, always — the continuous coloured rule across a strip
    is what says which tin the cards came from, so a strip may never be half pink
    and half blue.  A PAGE is one tin's too, since 2026-09-14: the teacher prints
    each tin onto its own colour of card stock, exactly as on sheets 13 and 14,
    so a sheet carrying two tins has to be cut in half and run twice.  An earlier
    cut of this file let a page carry several tins to save paper, back when the
    pink tin was two strips; with both decks in the tins nothing is that small
    any more, and the stock was always the real constraint.
    """
    out = []
    for tier, label in TINS:
        for strip in strips(tin_cards(tier)):
            out.append((tier, label, strip))
    return out


def pages(all_=None):
    """Strips to pages: ONE TIN TO A PAGE, filled to the bottom then broken.

    A page takes up to MAX_STRIPS strips FROM ONE TIN and stops there; the tin's
    last page carries whatever is left, however short, and the next tin starts a
    fresh page.  That is sheets 13 and 14's paginate() in strips rather than in
    card slots, and for their reason: each tin prints onto its own colour of card
    stock, so a page that mixes two tins is a page the teacher cannot run.  The
    white at the foot of a tin's last page is the correct answer, never a gap to
    plug with a strip from the next tin.

    Balancing the strips evenly over the fewest pages was an older cut and was
    the wrong instinct — the strips came out 5 + 5 + 5 and every page was forty
    per cent white.
    """
    st = all_strips() if all_ is None else all_
    out, i = [], 0
    while i < len(st):
        tier = st[i][0]
        run = []
        while i < len(st) and st[i][0] == tier and len(run) < MAX_STRIPS:
            run.append(st[i])
            i += 1
        out.append(run)
    return out


def page_tin(page):
    """(tier, label) — the ONE tin a page carries.  check() guarantees the one."""
    return page[0][1], page[0][2]


def strip_tops(n):
    """Top edge y of each strip. The run HANGS FROM THE TOP of the band."""
    return [BAND_TOP - i * (CARD_H + GUTTER) for i in range(n)]


def layout():
    """Every page: [(strip_top, tier, label, strip), ...]. Single-sided."""
    out = []
    for page in pages():
        tops = strip_tops(len(page))
        out.append([(t, tier, label, strip)
                    for t, (tier, label, strip) in zip(tops, page)])
    return out


# ------------------------------------------------------------------ drawing ----
def sym_size(cls):
    """(width, height) in mm of one class's symbol. None for a blank card."""
    if cls not in SYMBOL:
        return None
    shape, _col, scale = SYMBOL[cls]
    h = SYM_H * scale
    w = {"triangle": h * 2.0 / math.sqrt(3.0),   # equilateral
         "narrow-triangle": h * 0.80,            # taller than it is wide
         "circle": h,
         "crescent": h * CRESC_W,
         "bar": h * 1.80}[shape]
    return w, h


def sym_box(cls, x, y, cw):
    """(x0, y0, x1, y1) of the symbol: centred on the card, SYM_TOP from its top."""
    wh = sym_size(cls)
    if wh is None:
        return None
    w, h = wh
    cx = x + cw / 2.0
    y1 = y + CARD_H - SYM_TOP
    return (cx - w / 2.0, y1 - h, cx + w / 2.0, y1)


def _crescent(x0, y0, x1, y1, n=36):
    """A crescent MOON with a belly, not an arc: a disc with a shallow bite.

    Two circles of the SAME radius R = h/2, the second offset right by CRESC_D of
    the height.  The offset IS the thickness of the belly (R + d - R = d), so
    3.24 mm tall at CRESC_D = 0.385 gives 1.25 mm of solid colour at the thickest
    point.  The first cut of this symbol was a thin two-sagitta arc and at this
    size it read on the proof as a speck of dirt.
    """
    h = y1 - y0
    r = h / 2.0
    d = CRESC_D * h
    cy = (y0 + y1) / 2.0
    xi = d / 2.0                        # the horns, relative to the outer centre
    yi = math.sqrt(max(r * r - xi * xi, 0.0))
    # the outer centre sits so that the whole shape spans x0..x1
    cx = x1 - xi
    a = math.atan2(yi, xi)              # horn angle on the outer circle
    outer = [(cx + r * math.cos(a + (2.0 * math.pi - 2.0 * a) * i / n),
              cy + r * math.sin(a + (2.0 * math.pi - 2.0 * a) * i / n))
             for i in range(n + 1)]     # the long way round, through the left
    b = math.atan2(yi, -xi)             # horn angle on the inner circle
    inner = [(cx + d + r * math.cos(b + (2.0 * math.pi - 2.0 * b) * i / n),
              cy + r * math.sin(b + (2.0 * math.pi - 2.0 * b) * i / n))
             for i in range(n + 1)]
    return outer + inner[::-1]


def draw_symbol(c, cls, x, y, cw):
    """The Tray 8 token, shrunk, centred above the word on the FRONT of the card."""
    box = sym_box(cls, x, y, cw)
    if box is None:
        return
    x0, y0, x1, y1 = box
    shape, col, _scale = SYMBOL[cls]
    c.saveState()
    c.setFillColor(col)
    if shape in ("triangle", "narrow-triangle"):
        pth = c.beginPath()
        pth.moveTo(x0 * mm, y0 * mm)
        pth.lineTo(x1 * mm, y0 * mm)
        pth.lineTo((x0 + x1) / 2.0 * mm, y1 * mm)
        pth.close()
        c.drawPath(pth, stroke=0, fill=1)
    elif shape == "circle":
        c.circle((x0 + x1) / 2.0 * mm, (y0 + y1) / 2.0 * mm,
                 (x1 - x0) / 2.0 * mm, stroke=0, fill=1)
    elif shape == "crescent":
        pts = _crescent(x0, y0, x1, y1)
        pth = c.beginPath()
        pth.moveTo(pts[0][0] * mm, pts[0][1] * mm)
        for px, py in pts[1:]:
            pth.lineTo(px * mm, py * mm)
        pth.close()
        c.drawPath(pth, stroke=0, fill=1)
    elif shape == "bar":
        c.rect(x0 * mm, y0 * mm, (x1 - x0) * mm, (y1 - y0) * mm,
               stroke=0, fill=1)
    c.restoreState()


def draw_card(c, x, y, word, cls, cw, rule_c):
    """One card: the coloured baseline rule edge to edge, the word on it, the
    grammar symbol centred above it."""
    c.saveState()
    c.setFillColor(rule_c)
    c.rect(x * mm, (y + BASELINE - RULE_H) * mm, cw * mm, RULE_H * mm,
           stroke=0, fill=1)
    c.restoreState()
    if word is None:
        return
    c.saveState()
    c.setFillColor(INK)
    c.setFont(WORD_FONT, SIZE)
    # drawString takes the PEN origin; the ink starts one left side bearing
    # further right, so the bearing comes off the position before it is set.
    lsb = glyph_box(word)[0]
    c.drawString((x + ink_left(word, cw) - lsb) * mm, (y + BASELINE) * mm, word)
    c.restoreState()
    draw_symbol(c, cls, x, y, cw)


def cut_geometry(page):
    """(vlines, hlines) for one page. Strips BUTT; one hairline a shared edge.

    Strip N's bottom edge IS strip N+1's top edge and one line is drawn on it, so
    a single stroke of the blade separates both and the piece that comes off is a
    true CARD_H — 28.0 mm, which is what the design says and what the felt mat's
    start tick is drawn to.  The cut before this left a 3 mm gutter with the line
    down the middle of it: one stroke still, but every piece came off 31 mm with
    1.5 mm of bleed at each end, and a 31 mm card against a 28 mm tick on the mat
    is a mismatch you can see.

    The vertical ticks have come INSIDE the strip with the gutter gone: TICK_IN
    down from the strip's top edge and TICK_IN up from its bottom, sitting exactly
    on the card boundary so the same cut that separates the cards takes them away.
    """
    v, h = [], []
    tops = [top for top, _t, _l, _s in page]
    h.append((tops[0], 0.0, PAGE_W))
    for i, top in enumerate(tops):
        bot = top - CARD_H
        h.append((bot, 0.0, PAGE_W))
        x = X0
        for _word, _cls, cw in page[i][3]:
            v.append((x, top - TICK_IN, top))
            v.append((x, bot, bot + TICK_IN))
            x += cw
        v.append((x, top - TICK_IN, top))
        v.append((x, bot, bot + TICK_IN))
    return v, h


def page_labels(plan):
    """One caption a page, each NAMING ITS TIN and its place in that tin's run.

    A page is one tin's (see pages()), so the caption can say which tin the
    sheet is — "pink tin · sheet 2 of 2" — instead of listing whatever fell on
    it, which is what it did while a page could carry several.  That is the
    header sheets 13 and 14 already print, in their wording.

    It does NOT prescribe a sort.  The old "naming words · doing words · small
    words" is gone because those were three length buckets; the grammar symbol
    that replaced them is a TEACHING mark, not a sorting axis, and the cards sit
    loose in the tin.
    """
    runs = collections.Counter()
    total = collections.Counter()
    for page in plan:
        total[page_tin(page)[0]] += 1
    out = []
    for page in plan:
        tier, label = page_tin(page)
        runs[tier] += 1
        name = "%s tin" % label if tier else label
        part = ["word cards", name]
        if total[tier] > 1:
            part.append("sheet %d of %d" % (runs[tier], total[tier]))
        if any(word is None for _t, _ti, _l, strip in page
               for word, _c, _cw in strip):
            part.append("blank cards")
        part.append("a grammar symbol above every word")
        out.append(" · ".join(part))
    return out


# ------------------------------------------------------------------- checks ----
def probe_x_height():
    """RASTERISE 'x' at SIZE and measure the ink. Verifies the size, not the sum.

    Returns (measured mm, predicted mm from the outline) or None if there is no
    rasteriser on this machine — build() then says so rather than going quiet.
    """
    if not shutil.which("pdftoppm"):
        return None
    from PIL import Image
    BUILD_DIR.mkdir(exist_ok=True)
    pdf = BUILD_DIR / "xheight-probe.pdf"
    c = canvas.Canvas(str(pdf), pagesize=(40 * mm, 40 * mm))
    c.setFillColor(Color(0, 0, 0))
    c.setFont(WORD_FONT, SIZE)
    c.drawString(10 * mm, 10 * mm, "x")
    c.showPage()
    c.save()
    dpi = 1200
    subprocess.run(["pdftoppm", "-r", str(dpi), "-gray", "-png",
                    str(pdf), str(BUILD_DIR / "xheight-probe")],
                   check=True, capture_output=True)
    png = BUILD_DIR / "xheight-probe-1.png"
    im = Image.open(png).convert("L")
    box = im.point(lambda p: 255 if p < 128 else 0).getbbox()
    measured = (box[3] - box[1]) / float(dpi) * 25.4
    _l, _r, top, bot = glyph_box("x")
    return measured, top - bot


def check(plan):
    bad, notes = [], {}
    # ---- the size, measured off a rasterised glyph and not off the arithmetic
    probe = probe_x_height()
    if probe is None:
        notes["probe"] = None
    else:
        measured, predicted = probe
        notes["probe"] = (measured, predicted)
        if abs(measured - predicted) > 0.05:
            bad.append("the rendered 'x' measures %.3f mm where its outline "
                       "predicts %.3f mm — the point size is not rendering true"
                       % (measured, predicted))
    nominal = SIZE / 72.0 * 25.4 * SIZE_FROM["sx"] / SIZE_FROM["upm"]
    if abs(nominal - X_HEIGHT) > 0.001:
        bad.append("%.4f pt gives a %.4f mm x-height, not %.2f"
                   % (SIZE, nominal, X_HEIGHT))
    notes["nominal"] = nominal

    # ---- the classification must cover the ledger EXACTLY
    ledger = sorted({w for _k, _l, _s, ws in CATEGORIES for w in ws})
    dupes = sorted(w for w in set(ledger)
                   if sum(w in ws for _k, _l, _s, ws in CATEGORIES) > 1)
    if dupes:
        bad.append("%d word(s) are in two classes at once: %s"
                   % (len(dupes), dupes))
    notes["ledger"] = len(ledger)
    notes["classes"] = len(CATEGORIES)
    # ...on the LEDGER word behind each card: `The` and `sat.` are printed
    # forms of `the` and `sat`, which is what the classes are written in.
    drawn = {SB.plain(w) for page in plan for _t, _ti, _l, st_ in page
             for w, _c, _cw in st_ if w is not None}
    if drawn != set(ledger):
        bad.append("the classes and the printed tin disagree — classified but "
                   "never printed: %s; printed but unclassified: %s"
                   % (sorted(set(ledger) - drawn) or "none",
                      sorted(drawn - set(ledger)) or "none"))

    # ---- every card: the INK is padded G/2 a side, the symbol clears the ink
    widths, gaps, tight = {}, [], None
    for page in plan:
        for top, tier, _label, strip in page:
            rule_c = SB.TIER_C[tier] if tier else CHARCOAL_C
            if tier and rule_c is not SB.TIER_C[tier]:
                bad.append("tier %s is not drawn in sheet 14's TIER_C" % tier)
            y = top - CARD_H
            x = X0
            prev = None
            for word, cls, cw in strip:
                if word is not None:
                    if CLASS_OF.get(SB.plain(word)) != cls:
                        bad.append("%r is laid as a %s and classed as a %s"
                                   % (word, cls, CLASS_OF.get(word)))
                    G = word_space()
                    pad = ink_left(word, cw)          # paper to the first ink
                    widths[word] = cw
                    if abs(pad - G / 2.0) > W_STEP / 2.0 + 1e-9:
                        bad.append("%r has %.3f mm of paper to its ink, not the "
                                   "%.3f mm G/2 asks for" % (word, pad, G / 2.0))
                    if prev is not None:
                        gaps.append((prev + pad, prev, pad))
                    prev = pad
                    _ilo, _ihi, itop, ibot = glyph_box(word)
                    ink_top = y + BASELINE + itop
                    ink_bot = y + BASELINE + ibot
                    if ink_bot < y + 1e-9:
                        bad.append("%r descends %.2f mm below the card"
                                   % (word, y - ink_bot))
                    box = sym_box(cls, x, y, cw)
                    if box is None:
                        bad.append("%r (%s) has no symbol" % (word, cls))
                    else:
                        clear = box[1] - ink_top
                        if tight is None or clear < tight[0]:
                            tight = (clear, word, cls)
                        if clear < SYM_CLEAR - 1e-9:
                            bad.append("the %s symbol on %r leaves %.2f mm over "
                                       "the ascender, under %.1f"
                                       % (cls, word, clear, SYM_CLEAR))
                        if box[3] > y + CARD_H - 1e-9:
                            bad.append("the %s symbol on %r runs off the card top"
                                       % (cls, word))
                        side = box[0] - x
                        if side < SYM_SIDE - 1e-9:
                            bad.append("the %s symbol on %r leaves %.2f mm of "
                                       "paper each side, under %.1f"
                                       % (cls, word, side, SYM_SIDE))
                else:
                    prev = None
                    if sym_box(cls, x, y, cw) is not None:
                        bad.append("a blank card carries a symbol")
                x += cw
            if x > X0 + STRIP_MAX_W + 1e-6:
                bad.append("a strip is %.2f mm wide, over the %.1f mm measure"
                           % (x - X0, STRIP_MAX_W))
        # A strip is one tin's by construction — all_strips() builds each tin's
        # strips from that tin's cards alone — so the continuous coloured rule
        # across a strip cannot be two colours.  A PAGE IS ONE TIN'S TOO and
        # that is re-derived here rather than trusted, because it is what lets
        # the teacher put each tin on its own colour of stock.
        tins = {(tier, label) for _t, tier, label, _s in page}
        if len(tins) != 1:
            bad.append("a page carries %d tins (%s) — each tin prints on its "
                       "own colour of card stock, so a page may carry only one"
                       % (len(tins), ", ".join(sorted(l for _t, l in tins))))
        # ---- the cut geometry
        v, h = cut_geometry(page)
        for xx, y0, y1 in v:
            if xx < CM.SAFE or xx > PAGE_W - CM.SAFE:
                bad.append("a cut tick at x %.1f breaks the safe margin" % xx)
            if min(y0, y1) < CM.SAFE or max(y0, y1) > PAGE_H - CM.SAFE:
                bad.append("a cut tick reaches y %.1f-%.1f, outside the margin"
                           % (y0, y1))
        for yy, _a, _b in h:
            if yy < CM.SAFE or yy > PAGE_H - CM.SAFE:
                bad.append("a cut line at y %.1f breaks the safe margin" % yy)
        for ypos, what in ((LABEL_Y, "label"), (FOOT_Y, "footer")):
            if any(abs(ypos - yy) < 3.0 for yy, _a, _b in h):
                bad.append("the %s sits on a cut line" % what)
            for _xx, y0, y1 in v:
                if min(y0, y1) - 2.0 <= ypos <= max(y0, y1) + 2.0:
                    bad.append("the %s runs into a cut tick" % what)
                    break
    notes["tight"] = tight

    if gaps:
        lo, hi = min(g[0] for g in gaps), max(g[0] for g in gaps)
        notes["gap"] = (lo, hi)
        notes["pairs"] = len(gaps)
        if abs(lo - word_space()) > 0.05 or abs(hi - word_space()) > 0.05:
            bad.append("butted ink sits %.3f-%.3f mm apart; G is %.3f"
                       % (lo, hi, word_space()))
    notes["widths"] = widths
    if bad:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(bad))
    return notes


def check_buildable(plan):
    """EVERY ONE OF TRAY 5's SENTENCES, LAID AT ONCE, OUT OF THE PRINTED TINS.

    The guard this sheet was missing, and the reason it shipped a tin that could
    not build sheet 13 (2026-09-14).  It re-derives the need from sheets 13 and
    14 — sentences(), the real decks, not from tier_need()'s output — and counts
    what the PLAN actually prints, card by card off the strips that will be
    drawn.  For each tier it then asserts that the tin holds AT LEAST as many of
    every printed form as the whole tier needs SIMULTANEOUSLY: lay all sixteen
    pink sentences out on the mat together and no card is missing.

    This is build_14.check_pages()'s discipline applied to the tin — derive the
    claim again from the source and refuse to build if the sheet does not meet
    it — and it fails loudly with the shortfall rather than quietly printing a
    tin a child cannot work with.

    Returns (n_sentences, {tier: (needed, printed)}).
    """
    bad = []
    printed = collections.defaultdict(collections.Counter)
    for page in plan:
        for _top, tier, _label, strip in page:
            for word, _cls, _cw in strip:
                if word is not None:
                    printed[tier][word] += 1
    want = collections.defaultdict(collections.Counter)
    seen = 0
    for tier, sentence in sentences():
        seen += 1
        want[tier] += collections.Counter(SB.display_words(sentence))
    for tier in sorted(want, key=lambda t: (t is None, t)):
        have = printed.get(tier, collections.Counter())
        short = want[tier] - have
        if short:
            bad.append("the %s tin cannot lay its tier out at once — short %s"
                       % (SB.TIER_NAME.get(tier, "free"),
                          ", ".join("%d x %r" % (n, w)
                                    for w, n in sorted(short.items()))))
    # ...and nothing may be printed into a tier tin that its sentences never ask
    # for: a tin is exactly its tier's sentences, so a stray card is a defect too.
    for tier, have in printed.items():
        if tier is None:
            continue
        extra = have - want.get(tier, collections.Counter())
        if extra:
            bad.append("the %s tin prints %s, which its sentences never ask for"
                       % (SB.TIER_NAME[tier],
                          ", ".join("%d x %r" % (n, w)
                                    for w, n in sorted(extra.items()))))
    if seen != len(SS.CARDS) + len(SB.CARDS):
        bad.append("sentences() returned %d sentences, not the %d the two decks "
                   "hold" % (seen, len(SS.CARDS) + len(SB.CARDS)))
    if bad:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(bad))
    return seen, {t: (sum(want[t].values()),
                      sum(printed.get(t, collections.Counter()).values()))
                  for t in want}


def check_source():
    """Sheet 14's guard, called through, plus the one this sheet adds.

    SB.check_source() proves sheet 14's table still matches
    SENTENCE_BUILDER_CARDS in writing-shelf-language.ts.  This sheet then proves
    that every word BOTH decks' sentences use has a compartment here — so a new
    card on sheet 13 or sheet 14 can never ship with a word the tin does not
    hold.  Sheet 13 was outside this guard until 2026-09-14, which is exactly
    why nineteen of its words went missing without the build saying a word.
    """
    n = SB.check_source()
    missing = sorted({SB.plain(w) for _group, sentence in sentences()
                      for w in SB.display_words(sentence)
                      if SB.plain(w) not in CLASS_OF})
    if missing:
        raise SystemExit(
            "SPEC FAILURE: %d sentence word(s) have no compartment in this "
            "tin: %s\n  add them to CATEGORIES, classed as WORD_CLASSES in "
            "writing-shelf-language.ts classes them." % (len(missing), missing))
    return n


# -------------------------------------------------------------------- proof ----
def proof(pdf, n_pages):
    """Every page to PNG at 150 dpi: tin-p1.png, tin-p2.png, ..."""
    if not shutil.which("pdftoppm"):
        return None
    PROOF_DIR.mkdir(parents=True, exist_ok=True)
    made = []
    for i in range(1, n_pages + 1):
        stem = PROOF_DIR / ("tin-p%d" % i)
        subprocess.run(["pdftoppm", "-r", "150", "-png", "-f", str(i),
                        "-l", str(i), "-singlefile", str(pdf), str(stem)],
                       check=True, capture_output=True)
        made.append(Path(str(stem) + ".png"))
    return made


# -------------------------------------------------------------------- build ----
def build():
    global SIZE, SIZE_FROM
    register_fonts()
    SIZE, SIZE_FROM = word_size()
    n_src = check_source()
    plan = layout()
    notes = check(plan)
    n_sent, lay = check_buildable(plan)
    captions = page_labels(plan)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / NAME
    c = canvas.Canvas(str(out), pagesize=(PAGE_W * mm, PAGE_H * mm))
    c.setTitle(PDF_TITLE)
    c.setAuthor(PDF_AUTHOR)
    marks = lines = 0
    for page, caption in zip(plan, captions):
        for top, tier, _label, strip in page:
            rule_c = SB.TIER_C[tier] if tier else CHARCOAL_C
            x, y = X0, top - CARD_H
            for word, cls, cw in strip:
                draw_card(c, x, y, word, cls, cw, rule_c)
                x += cw
        v, h = cut_geometry(page)
        st = CM.cut_lines(c, v, h, PAGE_W, PAGE_H)
        marks += st["marks"]
        lines += st["lines"]
        c.saveState()
        c.setFillColor(LABEL_C)
        c.setFont(ADULT_FONT, FOOT_SIZE)
        c.drawString(TEXT_X * mm, LABEL_Y * mm, caption)
        c.restoreState()
        n = sum(len(s) for _t, _ti, _l, s in page)
        CM.footer(c, TEXT_X, FOOT_Y, CM.cards_line(n, "card"),
                  ADULT_FONT, FOOT_SIZE)
        c.showPage()
    c.save()
    made = proof(out, len(plan))

    # ------------------------------------------------------------- report ----
    n_strips = len(all_strips())
    print("word-card tins -> %s" % OUT_DIR)
    print("  %-30s %d pp, single-sided · %d strips · %d cut lines, %d "
          "triangles · %d bytes"
          % (NAME, len(plan), n_strips, lines, marks, out.stat().st_size))
    print("  source of truth %s: %d sentence cards, matched"
          % (SB.SOURCE_TS.name, n_src))
    print("  derived from BOTH Tray 5 decks: sheet 13 %d story starters + "
          "sheet 14 %d sentence cards = %d sentences"
          % (len(SS.CARDS), len(SB.CARDS), n_sent))
    print("  word %.4f pt %s from %s (%g/%g em) · x-height %.4f mm"
          % (SIZE, WORD_FONT, SIZE_FROM["how"], SIZE_FROM["sx"],
             SIZE_FROM["upm"], notes["nominal"]))
    if notes["probe"] is None:
        print("  NO RASTERISER (pdftoppm): the x-height was NOT measured off a "
              "rendered glyph and no proof PNG was written")
    else:
        measured, predicted = notes["probe"]
        print("  rendered 'x' measures %.3f mm at 1200 dpi (outline predicts "
              "%.3f: %.2f mm of drawn overshoot each terminal)"
              % (measured, predicted, (predicted - X_HEIGHT) / 2.0))
    lo, hi = notes["gap"]
    print("  word space G = %.3f mm = %.3f em (chosen by eye over the 'o' ink, "
          "%.3f); butted INK-TO-INK %.3f-%.3f mm over %d pairs"
          % (word_space(), word_space() / (SIZE / 72.0 * 25.4), ink_w("o"),
             lo, hi, notes["pairs"]))
    ws = notes["widths"]
    thin = min(ws.items(), key=lambda kv: kv[1])
    wide = max(ws.items(), key=lambda kv: kv[1])
    print("  narrowest card %r %.1f mm · widest %r %.1f mm · every card %.0f mm "
          "tall, baseline %.0f mm up, %.1f mm rule"
          % (thin[0], thin[1], wide[0], wide[1], CARD_H, BASELINE, RULE_H))
    clear, word, cls = notes["tight"]
    print("  symbol %.1f mm nominal, top %.1f mm off the card head · tightest "
          "over an ascender %.2f mm on %r (%s), floor %.1f"
          % (SYM_H, SYM_TOP, clear, word, cls, SYM_CLEAR))
    print("  %d words in %d classes: %s"
          % (notes["ledger"], notes["classes"],
             " · ".join("%s %d" % (k, len(ws_)) for k, _l, _s, ws_ in CATEGORIES)))
    total = 0
    for tier, label in TINS:
        cards = tin_cards(tier)
        total += len(cards)
        st = strips(cards)
        n_pp = sum(1 for pg in plan if page_tin(pg)[0] == tier)
        per = "/".join(str(len(x)) for x in st)
        extra = ""
        if tier in lay:
            need, got = lay[tier]
            n_s = sum(1 for t, _s in sentences() if t == tier)
            extra = (" · lays all %d of its sentences at once (%d word cards "
                     "needed, %d printed)" % (n_s, need, got))
        print("  %-18s %3d cards · %d strip%s (%s a strip) · %d page%s%s"
              % (label, len(cards), len(st), "" if len(st) == 1 else "s", per,
                 n_pp, "" if n_pp == 1 else "s", extra))
    print("  %d cards in all · pages: %s strips"
          % (total, " + ".join(str(len(pg)) for pg in plan)))
    print("  check_buildable: all %d Tray 5 sentences (13 + 14) are "
          "SIMULTANEOUSLY buildable out of the printed tins" % n_sent)
    if made:
        print("  proof %s: %s" % (PROOF_DIR.relative_to(REPO),
                                  ", ".join(pp.name for pp in made)))


def self_test():
    """A QUICK RUN OF check_buildable(), both ways round.

    Positive: the real plan lays all thirty-two Tray 5 sentences at once.
    Negative: take ONE card out of the pink tin and the guard must refuse — a
    check that cannot fail is not a check, and the tin shipped for a day with a
    hole in it exactly because nothing here was asserting this.
    """
    global SIZE, SIZE_FROM
    register_fonts()
    SIZE, SIZE_FROM = word_size()
    check_source()
    plan = layout()
    n, lay = check_buildable(plan)
    print("check_buildable: %d sentences, all simultaneously buildable" % n)
    for tier, label in TINS:
        if tier in lay:
            need, got = lay[tier]
            print("  %-6s %2d sentences · %3d word cards needed · %3d printed"
                  % (label, sum(1 for t, _s in sentences() if t == tier),
                     need, got))
    # ...and now break it.  Drop the first card of the first pink strip.
    hurt = [[(top, tier, label,
              strip[1:] if (tier == 1 and top == page[0][0]) else strip)
             for top, tier, label, strip in page] for page in plan]
    try:
        check_buildable(hurt)
    except SystemExit as exc:
        print("  negative control: a tin one card short is REFUSED — %s"
              % str(exc).splitlines()[-1].strip())
    else:
        raise SystemExit("SPEC FAILURE: check_buildable passed a tin that is "
                         "one card short — the guard does not guard")
    print("self-test ok")


if __name__ == "__main__":
    import sys
    if "--check" in sys.argv:
        self_test()
    else:
        build()
