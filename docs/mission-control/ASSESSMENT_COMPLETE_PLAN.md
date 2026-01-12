# 🐋 WHALE ASSESSMENT - COMPLETE IMPLEMENTATION PLAN

**Created:** January 12, 2026  
**Status:** SCAFFOLDING READY - Awaiting Assets

---

## 📋 MASTER TASK LIST

### Phase 1: Font & Letter Display ✅ SCAFFOLDED
| Task | Status | Files |
|------|--------|-------|
| Add Comic Sans / child-friendly font | ⏳ Ready | `globals.css` |
| Letter test: lowercase only | ⏳ Ready | `LetterMatchTestGame.tsx` |
| All 26 letter images | 🔴 NEED ASSETS | `/public/images/letters/` |

### Phase 2: Picture Tests - "Hear Word" Feature
| Task | Status | Files |
|------|--------|-------|
| BeginningTestGame - add hear word button | ⏳ Ready | `BeginningTestGame.tsx` |
| EndingTestGame - add hear word button | ⏳ Ready | `EndingTestGame.tsx` |
| Update WordImage to use real images | ⏳ Ready | `WordImage.tsx` |
| All vocabulary images | 🔴 NEED ASSETS | `/public/images/words/` |
| All word audio files | 🔴 NEED ASSETS | `/public/audio-new/words/` |

### Phase 3: Middle Sounds - DONE ✅
| Task | Status | Files |
|------|--------|-------|
| Redesign: hear word → tap letter | ✅ Complete | `MiddleTestGame.tsx` |
| Update game version | ✅ Complete | `middle/page.tsx` |

### Phase 4: Reading Test - NEW
| Task | Status | Files |
|------|--------|-------|
| Create reading data file | ⏳ Ready | `lib/assessment/reading-data.ts` |
| CVC Word Reading Test | ⏳ Ready | `ReadingWordsTestGame.tsx` |
| Sentence Reading Test | ⏳ Ready | `ReadingSentencesTestGame.tsx` |
| Add to skills config | ⏳ Ready | `skills.ts` |
| Word audio files | 🔴 NEED ASSETS | `/public/audio-new/words/` |
| Sentence audio files | 🔴 NEED ASSETS | `/public/audio-new/sentences/` |

### Phase 5: Cleanup - DONE ✅
| Task | Status |
|------|--------|
| Remove segmenting from assessment | ✅ Complete |

---

## 🎯 CURRENT ASSESSMENT FLOW

**6 Skills (34 items, ~12-15 min):**

| Order | Skill | Items | Type |
|-------|-------|-------|------|
| 1 | Letter Recognition | 8 | Match uppercase to lowercase |
| 2 | Letter Sounds | 6 | Hear sound → tap letter |
| 3 | Beginning Sounds | 6 | Hear sound → tap picture |
| 4 | Ending Sounds | 5 | Hear sound → tap picture |
| 5 | Middle Sounds | 4 | Hear word → tap middle letter |
| 6 | Blending | 5 | Hear sounds → tap blended word |

**PROPOSED Addition (Reading):**

| Order | Skill | Items | Type |
|-------|-------|-------|------|
| 7 | Word Reading | 10 | See word → read aloud (teacher marks) |
| 8 | Sentence Reading | 5 | See sentence → read aloud (teacher marks) |

---

## 📁 FOLDER STRUCTURE

```
/public/
├── images/
│   ├── letters/           # 26 lowercase letter images
│   │   ├── a.png
│   │   ├── b.png
│   │   └── ... z.png
│   │
│   └── words/             # Vocabulary images
│       ├── ant.png
│       ├── apple.png
│       └── ... (140+ images)
│
└── audio-new/
    ├── letters/           # Already exists (letter sounds)
    │   ├── a.mp3
    │   └── ... z.mp3
    │
    ├── words/             # Word pronunciations
    │   ├── ant.mp3
    │   ├── apple.mp3
    │   └── ... (175 words)
    │
    └── sentences/         # Sentence audio
        ├── sentence_01.mp3  # "The cat sat."
        └── ... (10 sentences)
```

---

## 🔧 CODE SCAFFOLDING TO BUILD

### 1. Font Configuration
```css
/* globals.css */
@import url('https://fonts.googleapis.com/css2?family=Comic+Neue:wght@400;700&display=swap');

.assessment-font {
  font-family: 'Comic Neue', 'Comic Sans MS', cursive;
}
```

### 2. Reading Data File
```typescript
// lib/assessment/reading-data.ts
export const CVC_WORDS_FOR_READING = [...];
export const PINK_SENTENCES = [...];
```

### 3. Reading Test Components
```typescript
// components/assessment/ReadingWordsTestGame.tsx
// components/assessment/ReadingSentencesTestGame.tsx
```

### 4. Updated Skills Config
```typescript
// Add to skills.ts
{ code: 'reading_words', order: 7, itemCount: 10 },
{ code: 'reading_sentences', order: 8, itemCount: 5 }
```

---

## 🎨 ASSET REQUIREMENTS SUMMARY

| Asset Type | Count | Format | Folder |
|------------|-------|--------|--------|
| Letter images | 26 | PNG | `/public/images/letters/` |
| Word images | 140 | PNG | `/public/images/words/` |
| Word audio | 175 | MP3 | `/public/audio-new/words/` |
| Sentence audio | 10 | MP3 | `/public/audio-new/sentences/` |

**Total: 351 assets needed**

---

## ⏰ IMPLEMENTATION TIMELINE

| Day | Tasks |
|-----|-------|
| Day 1 | Build scaffolding, create folder structure |
| Day 2 | Tredoux gathers images |
| Day 3 | Tredoux records audio (or uses TTS) |
| Day 4 | Integrate assets, test full flow |
| Day 5 | Polish and deploy |

---

## 📝 HANDOFF NOTES

**What's Done:**
- Middle sounds test redesigned (hear word → tap letter) ✅
- Segmenting removed from assessment ✅
- 6-skill assessment flow working ✅

**What's Ready to Build:**
- Font changes (CSS ready)
- Reading test components (structure defined)
- Asset integration (folders defined)

**What's Blocked on Assets:**
- Letter images (need 26)
- Word images (need 140)
- Word audio (need 175)
- Sentence audio (need 10)

---

*Plan created: January 12, 2026*
*Next: Create asset requirements PDF for Tredoux*
