# Phonics System Status - Weekly Letters & Words

## ✅ What EXISTS in Your System

### 1. **Phonics Planner Infrastructure** ✅
- **Location**: `/app/admin/phonics-planner/page.tsx`
- **API Routes**: `/app/api/phonics-plans/`
- **Data Storage**: `data/phonics-plans.json` (stored in Supabase Storage on Vercel)
- **Status**: Fully implemented and functional

### 2. **Weekly Letters System** ✅
The system tracks:
- **Letters**: Array of letters per week (e.g., `["A", "B"]`)
- **Week Dates**: `weekStart` and `weekEnd`
- **Weekly Plans**: Each plan has:
  - Letter songs
  - Letter chants
  - Daily games (Monday-Friday)
  - Daily focus activities
  - Tips and materials

### 3. **Current Data Structure**:
```typescript
interface PhonicssPlan {
  id: string;
  letters: string[];  // ✅ Weekly letters tracked
  weekStart: string;
  weekEnd: string;
  status: string;
  letterSong: { title, lyrics, actions };
  letterChant: { chant, rhythm };
  dailyGames: {
    monday: DailyGame;
    tuesday: DailyGame;
    // ... etc
  };
  dailyPlan: {
    monday: { focus: string; game?: string };
    // ... etc
  };
  tips: string[];
  files?: UploadedFile[];
  createdAt: string;
}
```

## ❌ What's MISSING

### **Weekly Words Per Letter** ❌
**The system does NOT currently track specific words per letter.**

- No `words` field in the phonics plan structure
- No vocabulary list per letter
- Games mention "words" but don't store a specific list
- No word tracking for letter tracing or practice

## 🔧 What You Need to Add

### Option 1: Add Words to Existing Phonics Plans (Recommended)

Add a `words` field to each phonics plan:

```typescript
interface PhonicssPlan {
  // ... existing fields ...
  words?: {
    [letter: string]: string[]; // e.g., { "A": ["apple", "ant", "alligator"] }
  };
  // OR simpler:
  words?: string[]; // Words for all letters in this week's plan
}
```

### Option 2: Create Separate Letter-Word Mapping

Create a new table or data structure:

```sql
CREATE TABLE letter_words (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  letter TEXT NOT NULL CHECK (letter ~ '^[A-Z]$'),
  word TEXT NOT NULL,
  difficulty_level INTEGER DEFAULT 1, -- 1=easy, 2=medium, 3=hard
  phonetic_pattern TEXT, -- e.g., "CVC", "CVCC"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(letter, word)
);
```

### Option 3: Integrate with Letter Tracing

If you're building letter tracing, you could:
- Link tracing progress to phonics plans
- Use words from the current week's phonics plan
- Track which words/letters each child has traced

## 📋 Current Status Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Weekly Letters | ✅ Implemented | Stored in `letters` array |
| Weekly Plans | ✅ Implemented | Full planning system with games |
| Letter Songs | ✅ Implemented | Per plan |
| Daily Games | ✅ Implemented | 5 games per week |
| **Weekly Words** | ❌ **Missing** | Need to add |
| Word Tracking | ❌ Missing | No vocabulary tracking |

## 🎯 Recommendation for Letter Tracing Feature

Since you're building letter tracing, here's what I recommend:

1. **Add words to phonics plans** - Extend the existing structure
2. **Link tracing to current week's phonics** - Use the active phonics plan's letters/words
3. **Track progress per letter** - Use the `letter_tracing_progress` table we discussed
4. **Show words in tracing UI** - Display words from current week's phonics plan

### Example Integration:

```typescript
// When teacher selects student for letter tracing:
// 1. Get current week's phonics plan
const currentPlan = await getCurrentPhonicsPlan();

// 2. Get letters for this week
const letters = currentPlan.letters; // ["A", "B"]

// 3. Get words for these letters (if added)
const words = currentPlan.words || {
  "A": ["apple", "ant", "alligator"],
  "B": ["ball", "bat", "bear"]
};

// 4. Show tracing interface with these letters/words
```

## 🔄 Next Steps

1. **Decide**: Do you want to add words to existing phonics plans, or create separate word tracking?
2. **If adding to plans**: Update the `PhonicssPlan` interface and AI generation prompt
3. **If separate**: Create new word mapping table/structure
4. **For letter tracing**: Link to phonics system to show current week's letters/words

---

**Current Data**: `data/phonics-plans.json` is empty (`{"plans": []}`)
**System Status**: Infrastructure ready, but no plans created yet
**Action Needed**: Either create plans with words, or add words to existing structure






