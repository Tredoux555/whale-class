# English Teaching Guide - Handoff Document
**Date:** January 4, 2025
**Status:** Production-ready, deployed to teacherpotato.xyz

---

## What Was Built

### 1. English Teaching Guide (`/admin/english-guide`)
A comprehensive teaching reference for Montessori English instruction, specifically adapted for Chinese ESL children ages 2-6.

**Features:**
- **8 Stages** of the Montessori language journey
- **37 Skills** with detailed teaching instructions
- **First 100 Words** vocabulary progression (6 phases over 13 weeks)
- **Shopping Guide** for vocabulary baskets (6 baskets, ¥250-400 total)

---

## File Locations

```
/app/admin/english-guide/page.tsx    # Main component (1200+ lines)
```

**Related tools that materials link to:**
- `/admin/card-generator` - 3-Part Cards
- `/admin/material-generator` - Pink/Blue/Green series
- `/admin/vocabulary-flashcards` - Vocabulary cards
- `/admin/phonics-planner` - Phonics activities
- `/admin/circle-planner` - Circle time songs

---

## Data Structure

### ENGLISH_GUIDE Array
```typescript
{
  id: 'oral',           // Stage identifier
  name: 'Oral Language',
  icon: '🗣️',
  color: '#3B82F6',
  bgColor: '#EFF6FF',
  ageRange: '2-3 years',
  overview: 'Description...',
  skills: [
    {
      name: '100+ word vocabulary',
      howToTeach: ['Step 1...', 'Step 2...', 'Step 3...'],
      materials: [
        { name: 'Material name', link: '/admin/tool' or null }
      ],
      donts: ['Mistake 1...', 'Mistake 2...'],
      readyWhen: 'Mastery indicator...',
      eslTip: 'Chinese-specific advice...'
    }
  ]
}
```

### 8 Stages (in order)
1. **Oral Language** (🗣️) - ages 2-3 - Building 200-300 word vocabulary
2. **Sound Games** (👂) - ages 3-4 - Phonemic awareness, NO letters shown
3. **Sandpaper Letters** (✋) - ages 4-5 - Sound-symbol connection via touch
4. **Moveable Alphabet** (🔤) - ages 4-5 - Writing before reading
5. **Pink Series** (📕) - ages 4-5 - CVC words (cat, dog, pig)
6. **Blue Series** (📘) - ages 5-6 - Consonant blends (bl-, st-, -nd)
7. **Green Series** (📗) - ages 5-6 - Phonograms (ai, ee, oa)
8. **Grammar** (📐) - ages 5-6 - Parts of speech with symbols

### VOCABULARY_PROGRESSION Array
6 phases of vocabulary introduction:
- Phase 1: Body & Classroom (weeks 1-3) - 15 words
- Phase 2: Animals (weeks 3-5) - 15 words
- Phase 3: Food & Kitchen (weeks 5-7) - 15 words
- Phase 4: Home & Clothing (weeks 7-9) - 15 words
- Phase 5: Actions & Verbs (weeks 9-11) - 15 words
- Phase 6: Colors, Numbers & Position (weeks 11-13) - 15 words

Each word is tagged with:
- `type`: CVC, blend, phonogram, digraph, r-control, sight
- `series`: pink, blue, green, sight

### VOCABULARY_BASKETS Array
Shopping guide for 6 themed baskets:
- Animals Basket (¥50-80)
- Kitchen Basket (¥30-50)
- Classroom Basket (¥20-40)
- Clothing Basket (¥30-60)
- Home Items Basket (¥40-70)
- Food Basket (¥40-60)

---

## UI Structure

### State Variables
```typescript
const [selectedStage, setSelectedStage] = useState<string | null>(null);
const [selectedSkill, setSelectedSkill] = useState<number | null>(null);
const [showVocabGuide, setShowVocabGuide] = useState(false);
```

### View Logic
- **No stage selected** → Shows vocabulary progression OR shopping guide (toggle)
- **Stage selected, no skill** → Shows stage overview + skill list
- **Stage + skill selected** → Shows full teaching guide:
  - How to Teach (numbered steps)
  - Materials Needed (with links)
  - Common Mistakes to Avoid
  - Ready for Next When...
  - Chinese ESL Tip

---

## Chinese ESL Adaptations

Key challenges addressed throughout:
- **TH sound** - doesn't exist in Mandarin (tongue between teeth)
- **R vs L** - minimal pair practice
- **Consonant clusters** - bl-, cr-, st-, -nd, -mp not in Chinese
- **Short vowels** - don't map cleanly to Chinese sounds
- **Articles (a, an, the)** - don't exist in Chinese
- **Silent period** - accept pointing/nodding, don't force speech

---

## Related Systems

### English Progress Tracker (`/admin/english-progress`)
- Tracks individual child progress through stages
- Generates parent reports
- Uses same 8-stage structure

### Database
```sql
-- english_progress table
child_id, current_stage, stage_progress, skills_completed (JSONB), notes
```

---

## Git History

```
697df11 - feat: Add First 100 Words progression + Vocabulary Baskets shopping guide
9ef9450 - feat: Add English Guide to admin dashboard
da9b18f - feat: Add English Teaching Guide with 8 stages, 37 skills, ESL tips
```

---

## TODO / Future Improvements

1. **Material Links** - Add links to existing tools for all materials where relevant
2. **Printable Version** - Add print-friendly view for each skill
3. **Progress Integration** - Link guide to progress tracker (click skill → update progress)
4. **Video Examples** - Add video links demonstrating techniques
5. **Assessment Checklists** - Printable observation forms per stage

---

## Quick Start for Next Session

```
Prompt for Claude:

"Continue work on the English Teaching Guide at /admin/english-guide. 
Read ENGLISH_GUIDE_HANDOFF.md first. The guide is live at teacherpotato.xyz.

Current state:
- 8 stages, 37 skills with teaching instructions
- First 100 Words vocabulary progression
- Shopping guide for vocabulary baskets

Next task: [describe what you want to do]
"
```

---

## Testing

Local: http://localhost:3000/admin/english-guide
Production: https://teacherpotato.xyz/admin/english-guide

Admin dashboard card added at `/admin` → "English Guide" (📖)
