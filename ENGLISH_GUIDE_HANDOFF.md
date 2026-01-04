# English Teaching Guide - Handoff Document
**Date:** January 4, 2025  
**Last Updated:** January 4, 2025 18:30  
**Status:** Code complete, testing build

---

## QUICK RESUME

```
Continue work on English Teaching Guide.
File: /app/admin/english-guide/page.tsx
Handoff: /ENGLISH_GUIDE_HANDOFF.md

CURRENT STATUS:
- All 8 stages implemented with 37 skills
- All materials have tips (59 total)
- UI updated to show material tips
- First 100 Words progression added (6 phases)
- Shopping Guide added (6 baskets)
- Build was failing - needs debugging

LAST COMMITS:
7fdd14e - chore: Update sw.js
a0d01f5 - feat: Add tips to all materials + update UI to display tips
bf34562 - docs: Add English Guide handoff document
697df11 - feat: Add First 100 Words progression + Vocabulary Baskets shopping guide

NEXT STEPS:
1. Debug build error (prerender error on /admin/english-guide)
2. Test locally at localhost:3000/admin/english-guide
3. Verify production deployment
```

---

## What Was Built

### 1. English Teaching Guide (`/admin/english-guide`)
A comprehensive teaching reference for Montessori English instruction for Chinese ESL children ages 2-6.

**Features:**
- **8 Stages** of the Montessori language journey
- **37 Skills** with detailed teaching instructions
- **59 Materials** with tips on where to buy/how to make
- **First 100 Words** vocabulary progression (6 phases over 13 weeks)
- **Shopping Guide** for vocabulary baskets (6 baskets, ¥250-400 total)

---

## File Locations

```
/app/admin/english-guide/page.tsx    # Main component (~1375 lines)
/ENGLISH_GUIDE_HANDOFF.md            # This file
```

**Related admin tools:**
- `/admin/card-generator` - 3-Part Cards
- `/admin/material-generator` - Pink/Blue/Green series
- `/admin/vocabulary-flashcards` - Vocabulary cards
- `/admin/phonics-planner` - Phonics activities
- `/admin/circle-planner` - Circle time songs
- `/admin/english-progress` - Child progress tracking

---

## Data Structures

### ENGLISH_GUIDE Array (8 stages)
```typescript
{
  id: 'oral',
  name: 'Oral Language',
  icon: '🗣️',
  color: '#3B82F6',
  bgColor: '#EFF6FF',
  ageRange: '2-3 years',
  overview: 'Description...',
  skills: [
    {
      name: '100+ word vocabulary',
      howToTeach: ['Step 1', 'Step 2', 'Step 3'],
      materials: [
        { name: 'Material', link: '/admin/tool' or null, tip: 'How to get/make it' }
      ],
      donts: ['Mistake 1', 'Mistake 2'],
      readyWhen: 'Mastery indicator',
      eslTip: 'Chinese-specific advice'
    }
  ]
}
```

### 8 Stages
1. **Oral Language** (🗣️) - 2-3 yrs - 200-300 word vocabulary
2. **Sound Games** (👂) - 3-4 yrs - Phonemic awareness, NO letters
3. **Sandpaper Letters** (✋) - 4-5 yrs - Sound-symbol via touch
4. **Moveable Alphabet** (🔤) - 4-5 yrs - Writing before reading
5. **Pink Series** (📕) - 4-5 yrs - CVC words
6. **Blue Series** (📘) - 5-6 yrs - Consonant blends
7. **Green Series** (📗) - 5-6 yrs - Phonograms
8. **Grammar** (📐) - 5-6 yrs - Parts of speech

### VOCABULARY_PROGRESSION Array (6 phases)
- Phase 1: Body & Classroom (weeks 1-3)
- Phase 2: Animals (weeks 3-5)
- Phase 3: Food & Kitchen (weeks 5-7)
- Phase 4: Home & Clothing (weeks 7-9)
- Phase 5: Actions & Verbs (weeks 9-11)
- Phase 6: Colors, Numbers & Position (weeks 11-13)

Words tagged with: `type` (CVC/blend/phonogram), `series` (pink/blue/green)

### VOCABULARY_BASKETS Array (6 baskets)
- Animals (¥50-80) - Safari Ltd TOOBS
- Kitchen (¥30-50) - Daiso/Miniso
- Classroom (¥20-40) - Use real items
- Clothing (¥30-60) - Doll clothes
- Home (¥40-70) - Dollhouse furniture
- Food (¥40-60) - Wooden play food

---

## UI Components

### State
```typescript
const [selectedStage, setSelectedStage] = useState<string | null>(null);
const [selectedSkill, setSelectedSkill] = useState<number | null>(null);
const [showVocabGuide, setShowVocabGuide] = useState(false);
```

### Views
- **No stage selected** → Toggle between First 100 Words / Shopping Guide
- **Stage selected** → Stage overview + skill buttons
- **Skill selected** → Full teaching guide with:
  - How to Teach (numbered steps)
  - Materials Needed (with tips)
  - Common Mistakes
  - Ready for Next When
  - Chinese ESL Tip

---

## Git Commits (chronological)

```
da9b18f - feat: Add English Teaching Guide with 8 stages, 37 skills, ESL tips
9ef9450 - feat: Add English Guide to admin dashboard
697df11 - feat: Add First 100 Words progression + Vocabulary Baskets shopping guide
bf34562 - docs: Add English Guide handoff document
a0d01f5 - feat: Add tips to all materials + update UI to display tips
7fdd14e - chore: Update sw.js
```

---

## Known Issues

### Build Error (needs debugging)
```
Error occurred prerendering page "/admin/english-guide"
TypeError: Cannot read properties of undefined (reading 'call')
```

Possible causes:
- Data structure issue in one of the arrays
- Missing property in materials object
- Import issue

Debug steps:
1. Check all materials have `{ name, link, tip }` format
2. Verify no undefined values
3. Test with `npm run dev` first (more helpful errors)

---

## Chinese ESL Key Points

Addressed throughout the guide:
- **TH sound** - tongue between teeth (doesn't exist in Mandarin)
- **R vs L** - minimal pair practice  
- **Consonant clusters** - bl-, cr-, st-, -nd, -mp
- **Short vowels** - different from Chinese
- **Articles** - a/an/the don't exist in Chinese
- **Silent period** - accept non-verbal responses

---

## Testing

- Local: http://localhost:3000/admin/english-guide
- Production: https://teacherpotato.xyz/admin/english-guide
- Admin dashboard card: `/admin` → "English Guide" (📖)

---

## Future Improvements

1. Printable view for each skill
2. Link to progress tracker
3. Video examples
4. Assessment checklists
5. Parent take-home guides
