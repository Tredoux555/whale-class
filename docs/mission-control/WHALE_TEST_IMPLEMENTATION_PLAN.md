# 🐋 WHALE TEST - IMPLEMENTATION PLAN

## Last Updated: January 12, 2026

---

## PHASE 1: Font & Letter Updates ✅ READY TO BUILD

### 1.1 Add Comic Sans Font
- **File:** `app/globals.css`
- **Action:** Add Comic Sans font family for assessment pages
- **Status:** ⏳ Ready

### 1.2 Letter Recognition - Lowercase Only
- **File:** `components/assessment/LetterMatchTestGame.tsx`
- **Action:** Show lowercase letters only (no uppercase)
- **Status:** ⏳ Ready

---

## PHASE 2: "Hear Word" Feature ✅ READY TO BUILD

### 2.1 Create HearWordButton Component
- **File:** `components/assessment/HearWordButton.tsx`
- **Action:** Reusable button to play word audio
- **Status:** ⏳ Ready

### 2.2 Update BeginningTestGame
- **File:** `components/assessment/BeginningTestGame.tsx`
- **Action:** Add 🔊 button to each picture option
- **Status:** ⏳ Ready

### 2.3 Update EndingTestGame
- **File:** `components/assessment/EndingTestGame.tsx`
- **Action:** Add 🔊 button to each picture option
- **Status:** ⏳ Ready

---

## PHASE 3: Reading Test ✅ READY TO BUILD

### 3.1 Create Reading Data File
- **File:** `lib/assessment/reading-data.ts`
- **Action:** Export CVC words and sentences for reading test
- **Status:** ⏳ Ready

### 3.2 Create Word Reading Test Component
- **File:** `components/assessment/ReadingWordsTestGame.tsx`
- **Action:** Teacher-assisted word reading test
- **Status:** ⏳ Ready

### 3.3 Create Sentence Reading Test Component
- **File:** `components/assessment/ReadingSentencesTestGame.tsx`
- **Action:** Teacher-assisted sentence reading test
- **Status:** ⏳ Ready

### 3.4 Update Skills Config
- **File:** `lib/assessment/skills.ts`
- **Action:** Add reading_words and reading_sentences skills
- **Status:** ⏳ Ready

### 3.5 Update Assessment Runner
- **File:** `app/assessment/[sessionId]/page.tsx`
- **Action:** Import and render reading test components
- **Status:** ⏳ Ready

---

## PHASE 4: Asset Integration ✅ SCAFFOLDING READY

### 4.1 Create WordImage Component Update
- **File:** `components/sound-games/WordImage.tsx`
- **Action:** Use real images when available, fallback to emoji
- **Status:** ⏳ Ready (waiting for assets)

### 4.2 Create Folder Structure
- **Folders:** 
  - `/public/images/letters/`
  - `/public/images/words/`
  - `/public/audio-new/words/`
  - `/public/audio-new/sentences/`
- **Status:** ⏳ Ready to create

---

## CURRENT TEST FLOW (After Implementation)

| Order | Skill | Items | Type |
|-------|-------|-------|------|
| 1 | Letter Recognition | 8 | Visual matching |
| 2 | Letter Sounds | 6 | Audio to letter |
| 3 | Beginning Sounds | 6 | Audio to picture |
| 4 | Ending Sounds | 5 | Audio to picture |
| 5 | Middle Sounds | 4 | Audio to letter |
| 6 | Blending | 5 | Audio segments to picture |
| 7 | Word Reading | 10 | Teacher-assisted |
| 8 | Sentence Reading | 5 | Teacher-assisted |

**Total: 49 items**

---

## FILES TO CREATE/MODIFY

### New Files:
1. `lib/assessment/reading-data.ts`
2. `components/assessment/HearWordButton.tsx`
3. `components/assessment/ReadingWordsTestGame.tsx`
4. `components/assessment/ReadingSentencesTestGame.tsx`

### Modified Files:
1. `app/globals.css` - Add Comic Sans
2. `lib/assessment/skills.ts` - Add reading skills
3. `app/assessment/[sessionId]/page.tsx` - Add reading components
4. `components/assessment/LetterMatchTestGame.tsx` - Lowercase only
5. `components/assessment/BeginningTestGame.tsx` - Hear word
6. `components/assessment/EndingTestGame.tsx` - Hear word
7. `components/sound-games/WordImage.tsx` - Real images

---

## ASSET DEPENDENCIES

| Component | Needs Images | Needs Audio |
|-----------|--------------|-------------|
| Letter Recognition | 26 letters | No |
| Beginning Sounds | 182 words | 182 words |
| Ending Sounds | (shared) | (shared) |
| Middle Sounds | No (letters) | 40 CVC words |
| Word Reading | No | 40 CVC words |
| Sentence Reading | No | 10 sentences |

---

## IMMEDIATE NEXT STEPS

1. ✅ PDF asset requirements created
2. ⏳ Build all scaffolding code
3. ⏳ Create folder structure
4. ⏳ Update brain files
5. 🔄 Wait for assets from user
6. 🔄 Integrate assets when provided
