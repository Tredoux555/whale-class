# HANDOFF: Curriculum Guide Data Project

**Date**: January 31, 2026
**Status**: IN PROGRESS - 44.4% Complete (119/268 works)
**Priority**: HIGH - This is the cornerstone of the app

---

## 🎯 THE GOAL

Populate comprehensive AMI-album quality guide data for ALL 268 Montessori works in the curriculum. Each work needs:

1. **Quick Guide** (10-second teacher scan): 3-5 bullet points
2. **Full Presentation Steps**: Step-by-step AMI album quality instructions
3. **Supporting Data**: Points of interest, control of error, variations, etc.

---

## 📊 CURRENT STATUS

| Area | Total | Complete | Remaining |
|------|-------|----------|-----------|
| Practical Life | 83 | 23 | 60 |
| Sensorial | 35 | 28 | 7 |
| Math | 57 | 24 | 33 |
| Language | 43 | 23 | 20 |
| Cultural | 50 | 21 | 29 |
| **TOTAL** | **268** | **119** | **149** |

### Completed Works Summary:
**Sensorial (28/35 - 80%):** Cylinder Blocks 1-4, Pink Tower, Brown Stair, Red Rods, Knobless Cylinders, Color Boxes 1-3, Geometric Cabinet, Binomial/Trinomial Cubes, Touch Boards/Tablets, Baric/Thermic materials, Sound Cylinders, Smelling/Tasting Bottles, Mystery Bag, Geometric Solids, Constructive Triangles, Sorting Trays

**Math (24/57 - 42%):** Number Rods, Sandpaper Numerals, Cards & Counters, Golden Beads (intro, add, sub), Teen/Ten Boards, Hundred Board, Addition/Subtraction Strip Boards, Stamp Game, Dot Game, Bead Frames, Fraction materials, Memory Game, Multiplication/Division Charts

**Language (23/43 - 54%):** Sound Games, Sandpaper Letters, Metal Insets, Sand Tray, Moveable Alphabet, Pink/Blue/Green Series, Phonogram Cards, Puzzle Words, Action Cards, Sentence Strips, Book Corner, All Grammar Introductions, Grammar Boxes, Sentence Analysis, Word Studies (compounds, synonyms, prefixes, word families)

**Cultural (21/50 - 42%):** Globes (Land/Water, Continents), Puzzle Maps, Land/Water Forms, Flags, Cultural Folders, Timelines, Botany (parts, cabinet, life cycles), Animal Classification/Habitats, Food Chain, Physical Science (sink/float, magnets, states of matter), Art/Music (color mixing, bells, rhythm, appreciation)

**Practical Life (23/83 - 28%):** Walking Line, Carrying (Tray, Mat), Pouring, Spooning, Tonging, Tweezing, Basting, Sieving, Funneling, Dressing Frames (buttons, snaps, hooks, zippers, buckles, lacing, bows, velcro), Table/Window Washing, Plant Care, Flower Arranging, Care of Self (face, teeth, hair, nose), Sweeping, Mopping, Spreading, Grace & Courtesy basics

---

## 📁 DATA STORAGE

### Primary Location
```
lib/curriculum/comprehensive-guides/
├── practical-life-guides.json  (83 works)
├── sensorial-guides.json       (35 works)
├── math-guides.json            (57 works)
├── language-guides.json        (43 works)
├── cultural-guides.json        (50 works)
├── AUDIT.json                  (coverage tracking)
└── README.md                   (documentation)
```

### Data Format (JSON)
```json
{
  "name": "Work Name",
  "category": "Category Name",
  "quick_guide": "• Point 1\n• Point 2\n• Point 3\n• Point 4\n• Point 5",
  "presentation_steps": [
    {
      "step": 1,
      "title": "Step Title",
      "description": "Detailed description of what to do",
      "tip": "Pro tip for the teacher"
    }
  ],
  "points_of_interest": ["What captures child's attention"],
  "control_of_error": "How the child self-corrects",
  "direct_aims": ["Primary learning goal"],
  "indirect_aims": ["Secondary developmental benefits"],
  "materials_needed": ["List of materials"],
  "age_range": "3-6",
  "variations": ["Different ways to present"],
  "extensions": ["Follow-up activities"],
  "vocabulary": ["Key words to introduce"],
  "common_challenges": ["Pitfalls and solutions"],
  "parent_description": "Simple explanation for parents",
  "why_it_matters": "Developmental significance"
}
```

---

## 📋 ALL 268 WORKS BY AREA

### PRACTICAL LIFE (83 works)

**Preliminary Exercises:**
- Walking on the Line, Carrying a Tray, Carrying a Chair, Rolling/Unrolling a Mat, Opening/Closing Doors, Sitting and Standing, Using Scissors Properly, How to Observe

**Transfer Activities:**
- Pouring (Dry) ✅, Pouring (Wet) ✅, Spooning ✅, Tonging, Tweezing, Basting, Funneling, Sieving, Ladling

**Dressing Frames:**
- Large Buttons, Small Buttons, Snaps, Hooks and Eyes, Zippers, Buckles, Lacing, Bow Tying, Safety Pins, Velcro

**Care of Self:**
- Hand Washing ✅, Face Washing, Teeth Brushing, Hair Brushing, Nose Blowing, Dressing, Folding Clothes, Shoe Polishing, Putting on a Coat

**Care of Environment:**
- Dusting, Sweeping, Mopping, Table Washing, Window Washing, Plant Care, Flower Arranging, Polishing ✅, Mirror Polishing, Metal Polishing, Wood Polishing, Cloth Washing, Dish Washing, Folding Cloths ✅

**Cutting Activities:**
- Cutting with Scissors ✅, Cutting Strips, Cutting Shapes, Cutting Paper, Cutting Food

**Food Preparation:**
- Spreading (Butter), Peeling (Vegetables), Slicing (Banana), Grating, Juicing, Making Snacks, Setting the Table, Washing Vegetables, Cracking Eggs

**Grace and Courtesy:**
- Greeting Others, Saying Please/Thank You, Interrupting Politely, Offering Help, Sharing Materials, Walking Around Mats, Pushing in Chairs, Observing Others Work, Waiting Turn, Apologizing, Introducing Others, Telephone Manners, Table Manners, Receiving Guests

**Sewing and Needlework:**
- Threading a Needle, Running Stitch, Sewing Buttons, Cross Stitch, Weaving, Braiding

### SENSORIAL (35 works)

**Visual Sense - Dimension:**
- Cylinder Blocks (Set 1-4), Pink Tower, Brown Stair, Red Rods, Knobless Cylinders

**Visual Sense - Color:**
- Color Box 1, Color Box 2, Color Box 3

**Visual Sense - Form:**
- Geometric Cabinet, Geometric Solids, Constructive Triangles (Rectangular), Constructive Triangles (Triangular), Constructive Triangles (Large Hexagonal), Constructive Triangles (Small Hexagonal), Constructive Triangles (Blue), Binomial Cube, Trinomial Cube

**Tactile Sense:**
- Touch Boards, Touch Tablets, Fabric Box

**Baric Sense:**
- Baric Tablets

**Thermic Sense:**
- Thermic Bottles, Thermic Tablets

**Auditory Sense:**
- Sound Cylinders, Bells

**Olfactory Sense:**
- Smelling Bottles

**Gustatory Sense:**
- Tasting Bottles

**Stereognostic Sense:**
- Mystery Bag, Sorting Trays, Stereognostic Bags

### MATHEMATICS (57 works)

**Introduction to Numbers (0-10):**
- Number Rods, Sandpaper Numbers, Number Rods and Cards, Spindle Boxes, Cards and Counters, Memory Game of Numbers, Number Rods Addition, Number Rods Subtraction

**Decimal System:**
- Introduction to Golden Beads, Formation of Numbers (Units/Tens/Hundreds/Thousands), Formation of Complex Numbers, Golden Bead Addition, Golden Bead Subtraction, Golden Bead Multiplication, Golden Bead Division, Bank Game, Stamp Game, Dot Game

**Teens and Tens:**
- Teen Board 1 (Seguin A), Teen Board 2 (Seguin B), Ten Board 1, Ten Board 2, Hundred Board, Skip Counting Chains

**Linear Counting:**
- Short Bead Chains, Hundred Chain, Thousand Chain, Bead Cabinet

**Memorization:**
- Addition Strip Board, Addition Charts, Subtraction Strip Board, Subtraction Charts, Multiplication Board, Multiplication Charts, Unit Division Board, Division Charts

**Passage to Abstraction:**
- Small Bead Frame, Large Bead Frame, Racks and Tubes (Multiplication), Racks and Tubes (Division), Checkerboard, Flat Bead Frame, Long Division with Racks

**Fractions:**
- Fraction Skittles, Fraction Circles, Fraction Operations

**Geometry:**
- Geometric Stick Material, Metal Insets (Geometry), Classified Nomenclature

**Time and Money:**
- Clock Work, Calendar Work, Money Concepts

### LANGUAGE (43 works)

**Oral Language Development:**
- Classified Nomenclature, Vocabulary Enrichment, Storytelling, Poetry, Conversation Practice, Questions Game, Sound Games (I Spy), Rhyming Games

**Writing Preparation:**
- Metal Insets, Sandpaper Letters (Lowercase), Sandpaper Letters (Uppercase), Sand Tray Writing, Chalkboard Writing, Moveable Alphabet (Word Building), Moveable Alphabet (Sentence Building), Moveable Alphabet (Story Writing)

**Reading:**
- Pink Series (CVC Words), Blue Series (Blends/Digraphs), Green Series (Long Vowels), Phonogram Cards, Puzzle Words, Object Boxes, Action Cards, Sentence Strips, Book Corner

**Grammar:**
- Article (Grammar), Noun (Grammar), Adjective (Grammar), Verb (Grammar), Preposition (Grammar), Adverb (Grammar), Pronoun (Grammar), Conjunction (Grammar), Interjection (Grammar), Grammar Boxes, Sentence Analysis

**Word Study:**
- Compound Words, Synonyms, Antonyms, Homonyms, Prefixes, Suffixes, Word Families

### CULTURAL (50 works)

**Geography:**
- Globe (Land and Water), Globe (Continents), Puzzle Maps (World), Puzzle Maps (Continents), Land and Water Forms, Flags, Cultural Folders, Cardinal Directions

**History:**
- Personal Timeline, Calendar Work, Clock of Eras, Timeline of Life, Fundamental Needs of Humans

**Botany:**
- Parts of a Plant, Parts of a Flower, Parts of a Leaf, Leaf Shapes, Botany Cabinet, Plant Life Cycle, Seed Germination, Plant Care

**Zoology:**
- Animal Kingdom Classification, Parts of Animals (Fish/Bird/Horse etc.), Life Cycles (Butterfly/Frog), Animal Habitats, Food Chain

**Physical Science:**
- Sink and Float, Magnetic/Non-Magnetic, States of Matter, Simple Machines, Light Experiments, Sound Experiments

**Art:**
- Color Mixing, Clay Work, Painting, Drawing, Collage, Art Appreciation

**Music:**
- Bells (Matching), Bells (Grading), Rhythm Instruments, Singing, Music Appreciation

---

## 🔄 DATA FLOW

### How Data Gets to Classrooms

1. **Master Source**: `montessori_works` table (The Brain)
2. **Classroom Copy**: `montree_classroom_curriculum_works` table
3. **Copy Happens**: During onboarding via `app/api/montree/principal/setup-stream/route.ts`

### Fields That Must Be Copied
- `quick_guide`
- `presentation_steps`
- `video_search_term`
- `direct_aims`
- `materials_needed`
- `control_of_error`
- `parent_explanation_detailed` → `parent_description`
- `parent_why_it_matters` → `why_it_matters`

### Guide API
```
GET /api/montree/works/guide?name=Work+Name&classroom_id=xxx
```
- Checks classroom table first
- Falls back to master Brain table if no data

---

## 📝 HOW TO COMPLETE THIS WORK

### Option 1: Manual Entry (Slow but Thorough)
1. Open the JSON file for the area
2. Find each work with `"quick_guide": null`
3. Research AMI album presentations
4. Fill in all fields following the format above
5. Update AUDIT.json after completing each batch

### Option 2: AI-Assisted (Faster)
1. Use the prompt template in `docs/CLAUDE_PROMPT_PRESENTATION_STEPS.md`
2. Generate data for batches of 5-10 works at a time
3. Review for accuracy
4. Add to JSON files
5. Update AUDIT.json

### Option 3: Migration SQL (For Database)
1. Generate SQL INSERT/UPDATE statements
2. Apply via Supabase migrations
3. Example: `migrations/102_practical_life_comprehensive.sql`

---

## ✅ VERIFICATION CHECKLIST

After completing each area:
- [ ] All works have `quick_guide` (not null)
- [ ] All works have `presentation_steps` array (not empty)
- [ ] All works have `control_of_error`
- [ ] All works have `direct_aims`
- [ ] All works have `materials_needed`
- [ ] AUDIT.json updated with new counts
- [ ] Migration SQL created (if updating database)
- [ ] Test via Quick Guide UI in app

---

## 🚨 IMPORTANT NOTES

1. **Quality over Speed**: This is the cornerstone of the app. AMI album accuracy matters.
2. **Consistent Format**: Follow the exact JSON structure for every work
3. **Teacher-Focused**: Quick guide is for teachers, not parents
4. **Audit Everything**: Track what's done in AUDIT.json
5. **Test the UI**: After adding data, verify it shows in the Quick Guide modal

---

## 📚 RESOURCES

- AMI Primary Guide (if available)
- Montessori Album references
- `docs/CLAUDE_PROMPT_PRESENTATION_STEPS.md` - AI prompt template
- Existing completed works in `practical-life-guides.json` for reference

---

*Last Updated: January 31, 2026*
