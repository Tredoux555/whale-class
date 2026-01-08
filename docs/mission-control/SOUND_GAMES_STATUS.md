# SOUND GAMES STATUS - January 8, 2026

## CURRENT STATE

| Component | Status | Notes |
|-----------|--------|-------|
| Letter sounds (a-z) | ✅ WORKING | Fresh recordings from today |
| Word audio (245 files) | ❌ BROKEN | All need re-recording |
| Instruction audio | ❌ DISABLED | 11 sec too long |
| Phonemes (sh, ch, th) | ⚠️ UNVERIFIED | Need manual check |
| Feedback sounds | ⚠️ UNVERIFIED | Need manual check |
| Supabase images | ✅ WORKING | All verified |
| Game logic | ✅ WORKING | Race conditions fixed |

---

## THE BIG PICTURE: CURRICULUM-GAMES INTEGRATION

### Vision
```
Teacher logs work → System maps to game → Parent notified → Child practices at home
```

### Requirements
1. **Games MUST match English curriculum EXACTLY**
2. **3-part cards for every curriculum step** (physical + digital)
3. **Build missing games** for any curriculum gaps
4. **Parent notifications** when child learns something new

### When Building Each Sound, Also Create:
- [ ] 6 word audio files (verified individually)
- [ ] 3-part cards PDF for classroom
- [ ] Curriculum mapping entry in database
- [ ] Parent notification template

---

## DAILY REBUILD PLAN

### Why Daily?
Bulk recording failed TWICE. ElevenLabs was wrong. Manual splits were wrong.
**Do it RIGHT: one sound per day, verify each file.**

### Daily Workflow
1. Pick ONE sound
2. Record 6 words clearly (2-sec gaps)
3. Split carefully
4. **VERIFY each file manually** (play it, confirm it says the right word)
5. Create 3-part cards PDF
6. Deploy to /public/audio-new/words/pink/
7. Test in actual game
8. Update curriculum mapping
9. Mark complete

### Phase Order

**Phase 1 - Easy (8 sounds):**
| Sound | Words | Status |
|-------|-------|--------|
| s | sun, sock, soap, star, snake, spoon | 🔜 NEXT |
| m | mop, moon, mouse, mat, mug, milk | ⏳ |
| f | fan, fish, fork, frog, fox, foot | ⏳ |
| n | net, nut, nose, nest, nine, nurse | ⏳ |
| p | pen, pig, pot, pan, pear, pink | ⏳ |
| t | top, tent, tiger, toy, tree, two | ⏳ |
| c | cup, cat, car, cap, cow, cake | ⏳ |
| h | hat, hen, horse, house, hand, heart | ⏳ |

**Phase 2 - Medium (6 sounds):**
| Sound | Words | Status |
|-------|-------|--------|
| b | ball, bat, bed, bus, bug, book | ⏳ |
| d | dog, doll, duck, door, dish, drum | ⏳ |
| g | goat, gift, girl, grape, green, gum | ⏳ |
| j | jet, jam, jar, jump, jeans, juice | ⏳ |
| w | web, watch, worm, wolf, water, wing | ⏳ |
| y | yak, yam, yarn, yell, yellow, yo-yo | ⏳ |

**Phase 3 - Hard/ESL (7 sounds):**
| Sound | Words | Status |
|-------|-------|--------|
| v | van, vest, vase, vet, vine, violin | ⏳ |
| th | thumb, three, thick, thin, think, throw | ⏳ |
| r | ring, rug, rat, rain, rabbit, red | ⏳ |
| l | leg, lamp, leaf, log, lip, lemon | ⏳ |
| z | zip, zoo, zebra, zero, zigzag, zone | ⏳ |
| sh | ship, shell, shoe, sheep, shirt, shop | ⏳ |
| ch | chair, cheese, chicken, chip, cherry, chin | ⏳ |

**Vowels (5 sounds):**
| Sound | Words | Status |
|-------|-------|--------|
| a | ant, apple, alligator, ax, add, arrow | ⏳ |
| e | egg, elephant, elbow, envelope, elf, end | ⏳ |
| i | igloo, insect, ink, itch, in, ill | ⏳ |
| o | octopus, orange, ostrich, olive, on, ox | ⏳ |
| u | umbrella, up, under, us, uncle, umpire | ⏳ |

**Total: 26 sounds = ~26 days to complete**

---

## FILE LOCATIONS

```
/public/audio-new/
├── letters/          ← ✅ WORKING (26 files)
├── words/pink/       ← ❌ BROKEN (needs rebuild)
├── phonemes/         ← ⚠️ UNVERIFIED
├── feedback/         ← ⚠️ UNVERIFIED
└── instructions/     ← ❌ TOO LONG
```

---

## RULES

### DO
- Record one sound at a time
- Verify EVERY file before deploying
- Create 3-part cards alongside audio
- Test in actual game after deploy
- Update curriculum mapping

### DO NOT
- Bulk record (it failed twice)
- Trust automated splitting
- Deploy without manual verification
- Skip the 3-part cards
