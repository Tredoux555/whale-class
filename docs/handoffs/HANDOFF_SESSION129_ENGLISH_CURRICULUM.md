# Handoff: Session 129 - English Phonics Curriculum

**Date**: January 31, 2026
**Duration**: Extended session
**Focus**: Complete English/Phonics curriculum for Montessori classroom

---

## Summary

Built a comprehensive 6-shelf English corner curriculum that takes 3-5 year olds from letter sounds to independent reading at kindergarten level. This is a physical materials guide + digital assets, not yet integrated into the Montree app database.

---

## What Was Built

### 1. Code Changes

| File | Change |
|------|--------|
| `app/montree/page.tsx` | Simplified onboarding: "Set Up School" button + "Login" dropdown (Teacher/Principal) |
| `app/api/montree/curriculum/route.ts` | Fixed curriculum ordering to preserve `sequence_order` from brain instead of using global counter |

### 2. Curriculum Materials Created

All files are in the project root AND bundled in `Montessori_Phonics_Curriculum.zip`:

| File | Description |
|------|-------------|
| `CVC_Curriculum_English.xlsx` | Master spreadsheet with 17 tabs: word families, sentences, diphthongs, digraphs, blends, vowel teams, R-controlled, stories, comprehension, games |
| `English_Corner_Works_Layout.xlsx` | **Key file for building materials** - 6 tabs (one per shelf), 4 levels each, lists all 114 works with contents, examples, materials needed, status checkbox |
| `English_Corner_Shelf_Diagram.html` | Visual bookshelf diagram showing all 6 shelves color-coded |
| `English_Corner_6_Shelf_Complete.md` | Detailed guide with progression path, materials checklist, daily schedule |

### 3. Story PDFs

6 decodable stories with comprehension worksheets:

| Story | Level | Focus |
|-------|-------|-------|
| The Big Red Hat | Pink | CVC words |
| Chip and the Fish | Blue | Digraphs (sh, ch, th) |
| Frog on a Log | Blue | Consonant blends |
| The Bee in the Tree | Green | Vowel teams (ee, ea) |
| The Cake by the Lake | Green | Magic E pattern |
| Time to Read! | Mixed | All patterns |

Supporting files:
- `Phonics_Stories_All.pdf` - Combined document
- `Printing_Instructions.pdf` - Paper settings, booklet tips
- `Answer_Key.pdf` - For teachers

---

## Curriculum Structure

### The 6-Shelf System

```
SHELF 1: Sound Foundations (Pre-Reading)
├── Sandpaper letters (3 sets)
├── Sandpaper vowels (RED)
├── I-Spy baskets (A-Z)
└── Sound sorting mats

SHELF 2: Pink Series - CVC (14 works)
├── Short A families: -at, -an, -ap, -ad, -am, -ag, -ab, -ax
├── Short E families: -et, -en, -ed, -eg, -em, -eb
├── Short I families: -it, -in, -ig, -ip, -id, -im, -ib, -ix
├── Short O families: -ot, -op, -og, -ob
├── Short U families: -ut, -un, -ug, -up, -ub, -um
└── Pink Series readers

SHELF 3: Blue Series - Digraphs & Blends (20 works)
├── Digraphs: sh, ch, th, wh, ck, ng, ph, kn, wr
├── L-blends: bl, cl, fl, gl, pl, sl
├── R-blends: br, cr, dr, fr, gr, tr
├── S-blends: sc, sk, sm, sn, sp, st, sw
├── Ending blends: -nd, -nt, -nk, -ng, -st, -sk, -mp, -ft
└── Blue Series readers

SHELF 4: Green Part 1 - Magic E & Vowel Teams (20 works)
├── Magic E: a_e, i_e, o_e, u_e, e_e
├── Vowel teams: ee, ea, ai, ay, oa, ow (long)
├── Pattern sorting activities
└── Green Series readers Set 1-2

SHELF 5: Green Part 2 - Complex Vowels (20 works)
├── oo (long & short)
├── Diphthongs: ou/ow, oi/oy, au/aw
├── R-controlled: ar, or, er, ir, ur
├── Puzzle words basket (sight words)
└── Green Series readers Set 3

SHELF 6: Comprehension & Fluency (20 works)
├── Sentence building (Pink/Blue/Green levels)
├── Picture-sentence matching
├── Story sequencing (4-6 card sets)
├── 6 comprehension story cards
├── Reading baskets (Pink → Blue → Green → Free)
└── Take-home reading folders
```

**Total: 114 works across 24 physical shelf levels**

---

## Key Design Decisions

1. **No "save for later"** - Everything fits in 6 shelves. Goal is kindergarten-level reading by age 5.

2. **4 levels per shelf** - Each conceptual shelf (1-6) has 4 physical rows of materials.

3. **Vowel progression** - Shelf 2 arranges works left-to-right: a → e → i → o → u

4. **Self-correcting** - Every work has control cards for independent use.

5. **Digital reinforcement** - App games mirror shelf levels (not yet built).

---

## What's NOT Done (Next Session)

### High Priority
- [ ] Create SVG illustrations for three-part cards (or source from OpenClipart)
- [ ] Build digital phonics game: `/app/montree/games/phonics-challenge/page.tsx`
- [ ] Add English curriculum to `lib/montree/curriculum-data.ts`
- [ ] Seed English works to Supabase `curriculum_works` table

### Medium Priority
- [ ] Parent dashboard showing child's current phonics shelf level
- [ ] AI analysis integration for English/reading progress
- [ ] Take-home reading log in parent app

### Nice to Have
- [ ] Audio pronunciations for each word (ElevenLabs?)
- [ ] Printable three-part card generator
- [ ] QR codes linking physical cards to digital practice

---

## Files Location

```
/montree/
├── Montessori_Phonics_Curriculum.zip    # Everything bundled
├── CVC_Curriculum_English.xlsx           # Master word lists
├── English_Corner_Works_Layout.xlsx      # Materials creation guide ⭐
├── English_Corner_Shelf_Diagram.html     # Visual layout
├── English_Corner_6_Shelf_Complete.md    # Detailed guide
├── Story_1_Big_Red_Hat.pdf              # Story + comprehension
├── Story_2_Chip_and_Fish.pdf
├── Story_3_Frog_on_Log.pdf
├── Story_4_Bee_in_Tree.pdf
├── Story_5_Cake_by_Lake.pdf
├── Story_6_Time_to_Read.pdf
├── Phonics_Stories_All.pdf               # All stories combined
├── Printing_Instructions.pdf
└── Answer_Key.pdf
```

---

## How to Use the Materials

### For Creating Physical Works
1. Open `English_Corner_Works_Layout.xlsx`
2. Go to shelf tab (e.g., "Shelf 2 - Pink CVC")
3. Each row = one work to create
4. Check off "Status" column as you complete each

### For Printing Stories
1. See `Printing_Instructions.pdf` for settings
2. Print on cardstock and laminate for durability
3. Individual story PDFs for take-home copies

### For Understanding the System
1. Read `English_Corner_6_Shelf_Complete.md`
2. View `English_Corner_Shelf_Diagram.html` in browser
3. Reference `CVC_Curriculum_English.xlsx` for word lists

---

## Image Situation

**Current state**: No images created yet.

**Options discussed**:
1. Create simple SVG illustrations programmatically
2. Source from OpenClipart (public domain)
3. Use Twinkl or Teachers Pay Teachers (subscription)
4. Create placeholder cards with text only

**Recommendation**: Start with high-frequency CVC words (cat, hat, dog, sun, etc.) as SVGs.

---

## Testing Needed

1. Print one story PDF to verify formatting
2. Test shelf diagram HTML on iPad
3. Verify curriculum ordering fix works in app
4. Check onboarding flow with new Login dropdown

---

## Contact

User: Tredoux (tredoux555@gmail.com)
Project: Montree - Montessori classroom management
URL: teacherpotato.xyz

---

*Session 129 complete. Brain updated. Ready for next session.*
