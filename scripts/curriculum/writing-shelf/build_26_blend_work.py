#!/usr/bin/env python3
"""
Dark Phonics · Writing Shelf · sheet 26, THE BLEND WORK MATS

THE SAME MATERIAL IN A SECOND COLOUR, AND IT IS THE SAME CODE.  Sheet 25 is the
engine and this file is a CONFIG: five groups of blends, a blue #2F5FA6 rule
and blue tabs, and not one line of geometry, art preparation, gap arithmetic,
cutting or checking of its own.  A second copy of the mat builder would drift
from sheet 25's within a month and a child would meet two materials that felt
different; there is one builder, build_25_digraph_work.py, and it takes a
Config.  See that file for the whole of the design.

THE FIVE GROUPS are Tredoux's: st·sp·sn·sm, sl·sw·sk·sc, bl·cl·fl·gl·pl,
br·cr·dr·fr·gr·tr·pr, and the FINAL blends nd·nt·mp·lk·st·ft·lt.  A final
blend only ever matches at the END of a word, so `stamp` on the final-blend mat
leaves its `mp` open and prints its `st`, which is the whole point of that
group.

THE ANCHOR WORDS CARRY A BLEND AND A DIGRAPH — spoon, snow, broom, tree, truck,
clock, brick, crown, flower, skirt, glue — and on those the DIGRAPH GAP IS LEFT
TOO.  The child fills the blue gap out of this sheet's tin and the green gap out
of SHEET 25'S tin, and the caption on every one of these mats says so, because
a gap he has no tab for is a dead end.  26-blend-tabs.pdf therefore prints the
BLUE tabs only; the green ones are counted into 25-digraph-tabs.pdf, which is
where they come from.  Nothing is printed twice.

Run:   python3 scripts/curriculum/writing-shelf/build_26_blend_work.py
"""

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import build_25_digraph_work as W25          # noqa: E402  the engine

CONFIG = W25.BLEND

if __name__ == "__main__":
    W25.build(CONFIG, force="--force" in sys.argv)
