# 🐋 WHALE HANDOFF - January 8, 2026 (Session 4)

## IMMEDIATE CONTEXT
Sound Games I Spy game has audio bugs - sounds playing over each other and potentially wrong letter sounds playing.

---

## PROBLEM REPORTED BY USER
> "the audio is messed up. I just checked the i spy game and the consonants (letter sounds) are really messed up. not the correct letter matching and they kinda playing over each other"

---

## BUGS IDENTIFIED (Deep Dive Analysis)

### BUG 1: Audio Overlap (PARTIALLY FIXED)
**Location:** `app/games/sound-games/beginning/page.tsx`

**Issue:** Two competing audio systems:
1. Local `playAudio()` function using `audioRef`
2. Global `soundGameAudio` class using `GameAudio`

**Partial Fix Applied:**
- Added `GameAudio.stop()` to local `playAudio()` function
- Added audio cleanup in `handleOptionSelect()`

**Still Needs:** Complete unification - should use ONE audio system, not two.

### BUG 2: setTimeout Race Conditions (NOT FIXED)
**Location:** `handleOptionSelect()` in beginning/page.tsx (lines ~147-175)

**Issue:** Multiple nested `setTimeout` calls without cleanup:
```typescript
setTimeout(async () => {
  await soundGameAudio.playWord(selected.word);
}, 500);

setTimeout(async () => {
  // ... plays next round sound
  await playTargetSound(nextRound.targetSound);
}, 2000);
```

If user clicks multiple times quickly, old timeouts fire and play wrong sounds.

**Fix Needed:** Use `useRef` to track timeout IDs and clear them on new clicks.

### BUG 3: Stale State in setTimeout (NOT FIXED)
**Location:** Same area

**Issue:** `roundsPlayed` accessed inside setTimeout uses stale closure value.

**Fix Needed:** Use functional state update or useRef.

### BUG 4: Potential Wrong Audio Files (UNVERIFIED)
**Concern:** The letter sound files may have been incorrectly split from the master recording.

**Evidence:** User reports "not the correct letter matching"

**Verification Needed:** Manual test of all 26 letters to verify each plays correct sound.

---

## FILES INVOLVED

### Core Game Files
- `/app/games/sound-games/beginning/page.tsx` - I Spy Beginning Sounds (MAIN GAME WITH BUGS)
- `/app/games/sound-games/ending/page.tsx` - I Spy Ending Sounds (same bugs)
- `/app/games/sound-games/middle/page.tsx` - Middle Sounds
- `/app/games/sound-games/blending/page.tsx` - Blending
- `/app/games/sound-games/segmenting/page.tsx` - Segmenting

### Audio System Files
- `/lib/games/audio-paths.ts` - GameAudio class (global audio singleton)
- `/lib/sound-games/sound-utils.ts` - soundGameAudio class (wrapper)
- `/lib/sound-games/sound-games-data.ts` - PHONEME_AUDIO mapping, word lists

### Audio Files
- `/public/audio-new/letters/` - 26 letter sound files (a.mp3 - z.mp3)
- `/public/audio-new/phonemes/` - sh.mp3, ch.mp3, th.mp3
- `/public/audio-new/instructions/` - instruction phrases
- `/public/audio-new/words/pink/` - CVC words

---

## RECOMMENDED FIX APPROACH

### Step 1: Create Debug/Test Page
Create `/app/debug-sound-games/page.tsx` to:
- Play each letter A-Z individually
- Let user verify correct sound plays
- Log any mismatches

### Step 2: Fix Audio Overlap Completely
Consolidate to ONE audio system:
```typescript
// Remove local playAudio() function
// Use only GameAudio.play() everywhere
```

### Step 3: Fix setTimeout Race Conditions
```typescript
const timeoutRef = useRef<NodeJS.Timeout | null>(null);

// Before setting new timeout:
if (timeoutRef.current) clearTimeout(timeoutRef.current);
timeoutRef.current = setTimeout(() => { ... }, 2000);

// Cleanup in useEffect
useEffect(() => {
  return () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };
}, []);
```

### Step 4: Fix Stale State
```typescript
setRoundsPlayed(prev => {
  const newCount = prev + 1;
  if (newCount >= totalRounds) {
    setGameState('complete');
  }
  return newCount;
});
```

---

## QUICK TEST URLS
After Railway deploys:
- https://www.teacherpotato.xyz/audio-test.html (static letter tester I created)
- https://www.teacherpotato.xyz/games/sound-games/beginning (the buggy game)

---

## RECENT COMMITS
1. `ed9093c` - fix: prevent audio overlap in Sound Games + add audio test page
2. `4e18b46` - feat: add 60 DALL-E images for Sound Games

---

## CURSOR PROMPT FOR NEXT SESSION

```
CONTEXT: Sound Games I Spy has audio bugs - sounds overlap and possibly wrong letters play.

TASK: Fix all audio bugs in the I Spy Beginning Sounds game.

FILES TO MODIFY:
- /app/games/sound-games/beginning/page.tsx
- /app/games/sound-games/ending/page.tsx (same pattern)

SPECIFIC FIXES NEEDED:

1. CONSOLIDATE AUDIO SYSTEMS
Remove the local playAudio() function. Use only GameAudio from /lib/games/audio-paths.ts everywhere.

2. FIX setTimeout RACE CONDITIONS  
Add a timeoutRef to track and clear timeouts:

const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
const nextRoundTimeoutRef = useRef<NodeJS.Timeout | null>(null);

In handleOptionSelect, before setting timeouts:
if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
if (nextRoundTimeoutRef.current) clearTimeout(nextRoundTimeoutRef.current);

Add cleanup useEffect:
useEffect(() => {
  return () => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    if (nextRoundTimeoutRef.current) clearTimeout(nextRoundTimeoutRef.current);
    GameAudio.stop();
  };
}, []);

3. FIX STALE STATE IN CLOSURES
Replace:
const newRoundsPlayed = roundsPlayed + 1;
setRoundsPlayed(newRoundsPlayed);

With functional update that handles the logic correctly.

4. ADD AUDIO STOP ON UNMOUNT
When component unmounts or game restarts, stop all audio.

TEST: After fixes, the game should:
- Only play one sound at a time
- Not have overlapping audio when clicking quickly
- Play the correct letter sound for each target
```

---

## SESSION SUMMARY

### What We Did This Session:
1. Generated 60 DALL-E images for Sound Games words ✅
2. Uploaded all to Supabase ✅
3. Updated word-images.ts code ✅
4. Pushed to GitHub (after fixing exposed API key) ✅
5. Identified audio bugs in I Spy game
6. Started deep dive analysis of audio code
7. Created static audio-test.html for manual letter testing

### What Remains:
1. Create proper debug page for testing letters
2. Fix all audio bugs in I Spy game
3. Verify all 26 letter sounds are correct
4. Test the game end-to-end

---

## AUDIO FILE INFO

Letter sounds recorded by Tredoux, split using ffmpeg silence detection.
Files in `/public/audio-new/letters/`:
- All 26 files exist (a.mp3 through z.mp3)
- File sizes vary (22KB - 39KB) suggesting unique content
- Durations: 1.7s - 3.3s

If sounds are wrong, may need to re-split or re-record specific letters.
