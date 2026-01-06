# Games & English Guide Alignment - Complete
**Date:** January 6, 2026  
**Status:** ✅ COMPLETE

---

## Summary

Aligned the Games word data with the English Guide to create a unified system using **6 words per vowel** as the single source of truth.

---

## What Changed

### 1. NEW: Master Words File
**`/lib/data/master-words.ts`**
- Single source of truth for all CVC words
- 6 words per vowel (30 total)
- Includes miniature suggestions for physical baskets
- Exports helper functions for games

### 2. UPDATED: Game Data
**`/lib/games/game-data.ts`**
- `PINK_SERIES` now imports from master-words.ts
- Reduced from 14-18 words per vowel → 6 words
- Blue/Green series unchanged (3 per blend/phonogram)

### 3. UPDATED: Picture Match
**`/lib/games/picture-match-data.ts`**
- Reorganized by vowel sound (was word families)
- 8 levels: 5 vowels + 3 mixed review
- Now imports from master-words.ts

### 4. UPDATED: English Guide
**`/app/admin/english-guide/page.tsx`**
- `CVC_BY_VOWEL` reduced from 8 → 6 words per vowel
- Aligned with game data

---

## Master CVC Word List (30 words)

| Vowel | Words | Color |
|-------|-------|-------|
| **A** | cat, hat, bat, map, pan, bag | Red |
| **E** | bed, pen, hen, net, leg, web | Green |
| **I** | pig, pin, bin, lip, wig, fin | Orange |
| **O** | dog, pot, mop, box, fox, log | Blue |
| **U** | cup, bug, rug, sun, bus, nut | Purple |

---

## Why 6 Words Per Vowel?

1. **Matches I Spy baskets** - BEGINNING_SOUND_OBJECTS already uses 6
2. **Practical for physical materials** - Can buy/find 6 miniatures easily
3. **Not overwhelming** - Young learners can master 6 words per vowel
4. **Enough variety** - Games still feel fresh with 6 options
5. **Montessori principle** - "Enough, but not overwhelming"

---

## Game Structure Now

| Game | Data Source | Words Used |
|------|-------------|------------|
| Word Building | PINK_SERIES → master-words | 6 per vowel |
| Picture Match | PICTURE_MATCH_SETS → master-words | 6 per level |
| Letter Sounds | LETTER_GROUPS | Unchanged |
| Sentence Build | SENTENCES | Unchanged |

---

## Physical Basket Organization

```
🧺 Short A Basket (Red)
   cat, hat, bat, map, pan, bag

🧺 Short E Basket (Green)  
   bed, pen, hen, net, leg, web

🧺 Short I Basket (Orange)
   pig, pin, bin, lip, wig, fin

🧺 Short O Basket (Blue)
   dog, pot, mop, box, fox, log

🧺 Short U Basket (Purple)
   cup, bug, rug, sun, bus, nut
```

---

## Shopping List for 30 CVC Miniatures

**Animals (~¥40-60)**
- Safari Ltd TOOB or similar
- Covers: cat, dog, pig, hen, fox, bug

**Dollhouse Items (~¥30-50)**
- Furniture/kitchen set
- Covers: bed, pot, pan, cup, box

**DIY/Craft (~¥20-30)**
- Covers: hat, bat, map, bag, net, web, wig, mop, log, rug, sun

**Real Items (Free)**
- pen, pin, bin, nut

**Total Budget: ~¥100-150**

---

## Testing Checklist

- [ ] Word Building game loads with 6 words per vowel
- [ ] Picture Match levels work (8 levels)
- [ ] English Guide shows 6 words in CVC_BY_VOWEL section
- [ ] No TypeScript errors on build

---

## Files Modified

```
/lib/data/master-words.ts         # NEW - Single source of truth
/lib/games/game-data.ts           # MODIFIED - Uses master-words
/lib/games/picture-match-data.ts  # MODIFIED - Reorganized by vowel
/app/admin/english-guide/page.tsx # MODIFIED - 6 words per vowel
```

---

## Cursor Deploy Instructions

```
1. Pull latest changes
2. Run: npm run build
3. If successful, push to Railway
4. Test games at /games/word-building
5. Test English Guide at /admin/english-guide
```
