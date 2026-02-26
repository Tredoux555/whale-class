# HANDOFF: Sound Games Audio Fix
**Date:** January 7, 2026
**Status:** IN PROGRESS - Phoneme Recording Required

---

## SUMMARY

The Whale sound games have an audio quality problem. AI-generated phonemes (individual letter sounds) are unclear and unusable for teaching. The solution is a hybrid approach: keep AI audio for words and instructions, but record phonemes manually.

---

## CURRENT STATE

### What Exists
- **423 ElevenLabs audio files** in `/public/audio-new/`
- All games wired to use these files
- Zero browser speech synthesis (fully removed)

### What's Working ✅
- **Word audio** (300+ words) - AI sounds natural for full words
- **Instruction audio** (20+ phrases) - AI sentences are clear
- **UI sounds** - correct/wrong/celebration sounds fine

### What's Broken ❌
- **Phoneme audio** (26 letters + digraphs) - AI cannot produce pure phonetic sounds
- Children can't understand "/t/" or "/s/" when AI generates them
- Montessori requires pure sounds without "uh" added

---

## THE PLAN

### Phase 1: Record Phonemes (Tredoux)
Record 35 audio files on phone (Voice Memos). Takes ~15-20 minutes.

### Phase 2: Process & Upload (Claude)
- Receive audio files
- Convert to MP3 if needed
- Rename to correct format (a.mp3, b.mp3, sh.mp3, etc.)
- Replace files in `/public/audio-new/letters/`

### Phase 3: Test & Deploy
- Test all 5 sound games
- Push to GitHub
- Verify on production

---

## PHONEME RECORDING CHECKLIST

### Single Consonants (21 sounds)
Record each as a PURE sound - no "uh" at the end!

| Letter | Say This | Example Word | Notes |
|--------|----------|--------------|-------|
| b | "b" | ball | Lips pop together, stop immediately |
| c | "k" | cat | Back of throat, hard c only |
| d | "d" | dog | Tongue tap behind teeth |
| f | "fff" | fish | Continuous, teeth on lip |
| g | "g" | goat | Back of throat, hard g |
| h | "h" | hat | Breathy exhale, just air |
| j | "j" | jam | Like start of "jump" |
| k | "k" | kite | Same as hard c |
| l | "lll" | lamp | Continuous, tongue behind teeth |
| m | "mmm" | mop | Continuous, lips together hum |
| n | "nnn" | net | Continuous, tongue up, nose hum |
| p | "p" | pig | Lips pop, puff of air |
| q | "kw" | queen | Quick "kw" combo |
| r | "rrr" | rat | Tongue curled back |
| s | "sss" | sun | Continuous hiss |
| t | "t" | top | Tongue tap, quick release |
| v | "vvv" | van | Continuous, teeth on lip vibrate |
| w | "w" | web | Lips rounded |
| x | "ks" | box | Combo sound |
| y | "y" | yak | Like start of "yes" |
| z | "zzz" | zebra | Continuous buzz |

### Short Vowels (5 sounds)
These are the SHORT sounds, not letter names!

| Letter | Say This | Example Word | Notes |
|--------|----------|--------------|-------|
| a | "ah" | apple | Mouth open, tongue low |
| e | "eh" | egg | Mouth slightly open |
| i | "ih" | insect | Short, mouth barely open |
| o | "oh" | octopus | Mouth round |
| u | "uh" | umbrella | Mouth relaxed |

### Digraphs (6 sounds)
Two letters making one sound:

| Sound | Say This | Example Word | Notes |
|-------|----------|--------------|-------|
| sh | "shh" | ship | Finger to lips sound |
| ch | "ch" | chip | Like a sneeze/train |
| th | "th" | thin | Tongue between teeth (voiceless) |
| th | "th" | this | Tongue between teeth (voiced) - OPTIONAL |
| wh | "wh" | whale | Breathy w |
| ng | "ng" | ring | Back of throat hum |

### Blends (OPTIONAL - 3 sounds)
Only if time permits:

| Sound | Say This | Example |
|-------|----------|---------|
| bl | "bl" | black |
| st | "st" | stop |
| fr | "fr" | frog |

---

## RECORDING TIPS

1. **Use Voice Memos** on iPhone (or any phone recorder)
2. **Quiet room** - no background noise
3. **Close to mic** - 6 inches from mouth
4. **One sound per file** - pause between each
5. **Say the letter name first, then the sound** - e.g., "B... b" - Claude will trim
6. **Short and crisp** - phonemes should be under 1 second
7. **No "uh"** - the hardest part! Stop the sound cleanly

### Example Recording Session:
```
[File 1] "A... ah"
[File 2] "B... b"
[File 3] "C... k"
... etc
```

---

## FILE DELIVERY

Option A: **Upload to Claude** (preferred)
- Upload all recordings in one batch
- Claude processes and renames

Option B: **Direct to folder**
- Name files yourself: a.mp3, b.mp3, etc.
- Drop into `/public/audio-new/letters/`
- Claude verifies and pushes

---

## TECHNICAL DETAILS

### Audio File Location
```
/public/audio-new/
├── letters/           ← REPLACE THESE (phonemes)
│   ├── a.mp3
│   ├── b.mp3
│   └── ... (26 files)
├── phonemes/          ← REPLACE THESE (digraphs)
│   ├── sh.mp3
│   ├── ch.mp3
│   └── th.mp3
├── words/             ← KEEP (AI words are fine)
│   ├── pink/
│   ├── blue/
│   └── green/
├── sight-words/       ← KEEP
├── instructions/      ← KEEP
└── ui/                ← KEEP
```

### Games Using Phonemes
1. `/games/sound-games/beginning` - "I spy beginning sounds"
2. `/games/sound-games/ending` - "I spy ending sounds"
3. `/games/sound-games/middle` - "Middle vowel match"
4. `/games/sound-games/blending` - "Sound blending"
5. `/games/sound-games/segmenting` - "Sound segmenting"

### Code Reference
- Phoneme paths: `/lib/sound-games/sound-games-data.ts` → `PHONEME_AUDIO`
- Audio player: `/lib/games/audio-paths.ts` → `GameAudio` class

---

## NEXT SESSION CHECKLIST

- [ ] Tredoux records 35 phonemes
- [ ] Upload recordings to Claude
- [ ] Claude processes (trim, convert, rename)
- [ ] Replace files in `/public/audio-new/letters/` and `/phonemes/`
- [ ] Test all 5 sound games
- [ ] Push to GitHub
- [ ] Verify on https://teacherpotato.xyz

---

## WHY THIS APPROACH

| Approach | Pros | Cons |
|----------|------|------|
| AI phonemes | Fast | Unclear, unusable |
| Record ALL audio | Perfect quality | 300+ recordings needed |
| **Hybrid** | Best of both | 35 recordings only ✅ |

The hybrid approach means:
- 35 manual recordings (phonemes) - 15-20 min work
- 400+ AI recordings (words, instructions) - already done
- Professional quality where it matters most

---

## REFERENCE: Audio Files Already Working

### Words (223 pink + 50 blue + 41 green = 314 words) ✅
All in `/public/audio-new/words/` - sound great

### Sight Words (61 words) ✅
All in `/public/audio-new/sight-words/` - sound great

### Instructions (17 phrases) ✅
All in `/public/audio-new/instructions/` - sound great

### UI Sounds (7 files) ✅
All in `/public/audio-new/ui/` - sound great

---

**Total time to fix: ~20 minutes recording + 10 minutes processing = DONE**
