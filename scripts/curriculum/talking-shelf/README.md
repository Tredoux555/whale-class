# Talking Shelf print scripts

Four trays, six printables, `public/dark-phonics-talking-shelf/v1/`. Everything
here is built on the Writing Shelf's standard — it does not have one of its own.

## The cutting standard is IMPORTED, not copied

`house.py` puts `scripts/curriculum/writing-shelf/` on `sys.path`, and every
builder then does `import cutmarks as CM`. That is the same file the Writing
Shelf cuts by, so Rule A — **CUT ONCE** — moves on both shelves at once if it
ever moves again:

1. cards **BUTT**, no gutters;
2. every cut line runs the **full width or the full height of the page**, edge to
   edge, so one stroke of the blade separates the cards on both sides of it;
3. the lines are **light-grey 0.25 mm hairlines**, cut away — a line *is* the
   card edge;
4. a small **black triangle** at each end, at the 5.5 mm printer-safe margin;
5. card **content stops 4 mm inside every card edge** (`CM.CONTENT_CLEAR`);
6. one footer: **Cut along every grey line · N cards**.

Do not hand-roll a cut line in a builder, and do not copy `cutmarks.py` here.

## Printed size vs mounted size (Rule B)

| sheet | printed | mounted | why |
|---|---|---|---|
| T02, T04 flip cards | 80 × 120 | **100 × 140** | his 100 mm card stands |
| T03 story cards | 70 × 70 | **90 × 90** | the 10 × 10 cm envelopes, and Writing Shelf 06 |
| T01 frame cards | 100 × 140 | not mounted | they stand at the back of the tray |
| T05 puppets | 100 × 200 piece | not mounted | 180 mm of puppet + a 20 mm tab |
| T06 teacher card | 148.5 × 210 | not mounted | the two halves ARE the sheet |

**T01 prints one card a page, and not four.** Two columns of 100 mm leave a 5 mm
margin and the outer cut line would sit inside the 5.5 mm printer-safe margin;
two rows of 140 mm leave 8.5 mm, which `build_12` already argued cannot hold the
footer. Four pages is the price of a legal margin.

## Duplex

**SHORT EDGE**, on T02, T03 and T04. The imposition is read off the shipped
Writing Shelf sheet 03, not guessed: front `(x, y)` is backed by `(x, H − y)`, so
the BACK page keeps the column and flips the row, and the back card's content is
drawn **rotated 180°** inside its own card. On 03, p1 `cat · pig · rug · hat` is
backed by p2 `rug · hat · cat · pig`, every back word upside down on the sheet;
`house.back_row()` and `house.rot180()` are that rule and nothing else.

Because the block is centred on the page, the grid is symmetric under the flip,
so the triangles land in the same physical place on both faces — hold a printed
sheet to the light and the front cross should sit on the back cross.

## `house.py`

The shared kit: the `sys.path` hook above, Fredoka Medium instanced at build time
out of `docs/circle-time/guide-src/fonts/Fredoka-Variable.ttf` (the same instance
`build_12_word_card_tin.py` cuts, so a word here and a word out of the Writing
Shelf tin are the same shape), Andika for adult text, the house colours, the
text fitters (`fit_block` wraps, `fit_lines` refuses to wrap), the 180° duplex
transform, a cached down-sampler that keeps a placed picture at 300 dpi and no
more, and the pale-grey photo placeholder.

Every builder has a `check()` that raises `SPEC FAILURE` before it writes a
byte — safe margins, adult text 14 mm from a page edge and 3 mm clear of any cut
line, every card's content inside the 4 mm clearance, and the counts the
director fixed (eight arrangement cards, three sets, eight say-it cards, four
frame cards, four rules on the teacher card).

## The sheets

| file | builder | what |
|---|---|---|
| `T01-frame-cards.pdf` | `build_T01_frame_cards.py` | 4 frame cards, one per tray, 100 × 140 unmounted |
| `T02-arrangement-cards.pdf` | `build_T02_arrangement_cards.py` | 8 flip cards, Tray 1, duplex |
| `T03-story-cards.pdf` | `build_T03_story_cards.py` | 3 story cards 70 × 70, Tray 2, duplex |
| `T04-say-it-cards.pdf` | `build_T04_say_it_cards.py` | 8 flip cards, Tray 3, duplex |
| `T05-puppets.pdf` | `build_T05_puppets.py` | the cat and the potato, 2 pages |
| `T06-teacher-card.pdf` | `build_T06_teacher_card.py` | A5 2-up, Tray 4 |
| `manifest.json`, `PRINT-GUIDE.html` | `build_pack.py` | page and byte counts read off the built PDFs |

`build_pack.py` copies the v2 guide's `<head>` and `<style>` out of
`public/dark-phonics-shelf/v2/PRINT-GUIDE.html` at build time rather than
re-typing them, so the two print guides stay one document.

## Tray 2 borrows a Writing Shelf sheet whole

Tray 2 needs **`06-picture-sequences.pdf` printed TWICE** — six envelopes,
A A B B C C, because both children need their own copy of the same set. Nothing
about it is rebuilt here and nothing should be.

## Art still owed, and how to drop it in

Both of these print today as placeholders that reprint identically later.

```
# the eight arrangement photographs — the teacher's own miniatures on her own mat
#   phonics-images/satpin-v2/talking-shelf/arr-1.png … arr-8.png
python3 scripts/curriculum/talking-shelf/build_T02_arrangement_cards.py \
    --art-dir phonics-images/satpin-v2/talking-shelf

# the two puppet drawings, Dark Phonics pen-and-ink house style
#   phonics-images/satpin-v2/talking-shelf/puppet-cat.png, puppet-potato.png
python3 scripts/curriculum/talking-shelf/build_T05_puppets.py \
    --art-dir phonics-images/satpin-v2/talking-shelf

python3 scripts/curriculum/talking-shelf/build_pack.py     # always, after either
```

`house.py` caches the down-sampled copies in `.build/`; delete that folder if a
picture is replaced under the same filename.

## T04's pictures are existing art

Not one picture on the say-it cards was drawn for them. The mapping lives in
`ART` at the top of `build_T04_say_it_cards.py`, one repo-relative path per card,
and `check()` refuses to build if any of them is missing:

| card | the exchange | picture |
|---|---|---|
| 1 | Who is it? / It is a cat. | `easy-readers/the-cat-sat/p1.jpg` |
| 2 | Who is it? / It is a pig. | `dark-phonics-books/the-spat/p3-pig.png` |
| 3 | What can it do? / It can sit. | `satpin-v2/books/sat/sat-p6.png` |
| 4 | What can it do? / It can jump. | `easy-readers/jump-in-the-sand/p1.jpg` |
| 5 | Where is it? / It is on the mat. | `satpin-v2/books/monkey/sam-and-the-monkey-p3-cat-on-mat.png` |
| 6 | Where is it? / It is in the box. | `satpin-v2/books/box/what-is-in-the-box-p5-fox-v1.png` |
| 7 | Is it big? / Yes, it is big. | `easy-readers/frog-and-crab/p1.jpg` |
| 8 | Is it wet? / No, it is not wet. | `easy-readers/mud-pup/p1.jpg` |

Two notes on those choices. Card 4 was asked for as a jumping frog out of the
*Big Splash* reader; *Big Splash* is a cat in a bath and has no frog in it, so
card 4 is the leaping pup from *Jump in the Sand*, which is the clearest jump in
the set. Card 8 was asked for as the wet cat from *Big Splash*; the printed
answer on that card is **“No, it is not wet.”**, so the front is the DRY pup from
page 1 of *Mud Pup* instead — the picture and the printed answer have to agree,
because the printed answer is the whole control of error. Swap either line in
`ART` if the director wants it the other way.

## How to rerun everything

```
python3 scripts/curriculum/talking-shelf/build_T01_frame_cards.py
python3 scripts/curriculum/talking-shelf/build_T02_arrangement_cards.py
python3 scripts/curriculum/talking-shelf/build_T03_story_cards.py
python3 scripts/curriculum/talking-shelf/build_T04_say_it_cards.py
python3 scripts/curriculum/talking-shelf/build_T05_puppets.py
python3 scripts/curriculum/talking-shelf/build_T06_teacher_card.py
python3 scripts/curriculum/talking-shelf/build_pack.py
```

Needs `reportlab`, `pypdf`, `fontTools`, `Pillow`. All deterministic and
idempotent. Nothing in this folder touches `public/dark-phonics-shelf/v2/`.
