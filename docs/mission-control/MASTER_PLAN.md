# WHALE MASTER PLAN

## The Vision

Whale is not just a classroom tool. It's the education backbone for the Jeffy Schools mission.

**Every school funded by Jeffy Commerce will run on Whale.**

When a merit-selected student walks into a Jeffy School on Tredoux's family farm, their teacher uses Whale to:
- Track their Montessori progress
- Plan their week
- Report to their family
- Document their journey

This is the system that proves education done right.

---

## Current Reality (Jan 2026)

**1 school, 22 kids, Beijing International**

Tredoux uses this daily with his kindergarten class. Real usage, real feedback, real iteration.

---

## Phase 1: Perfect for One (NOW)

- [x] Weekly planning (Chinese docs → Claude → Grid view)
- [x] Classroom progress tracking
- [x] Montree curriculum tree
- [x] Teacher tablet interface
- [x] Photo/video capture per child
- [x] Sound games (auditory phonics) - LIVE with emojis, being upgraded
- [ ] Parent reports (AI-generated)
- [ ] Parent view portal

---

## Sound Games Curriculum Build (Jan 2026)

**Strategy: Ship working NOW, perfect ONE SOUND PER DAY**

Games are LIVE with emoji placeholders. Each day we upgrade one sound with:
1. Curated real images (not AI-generated)
2. Clean ElevenLabs audio (properly trimmed)
3. Three-part cards PDF (for classroom)
4. Game logic review & tweaks

**Why this approach:**
- Parents have something usable TODAY
- Classroom materials match digital games exactly
- Homework can link directly to games
- Sustainable pace - one sound done RIGHT each day
- 27 sounds = ~1 month to complete curriculum

**Curriculum Framework:**
```
curriculum/
├── assets/images/phonics/beginning-sounds/{s,m,f,...}/
├── assets/audio/phonics/
├── three-part-cards/generated/
└── manifest.json (tracks completion)
```

**Phase 1 Sounds (Easy - exist in Mandarin):**
| Sound | Words | Status |
|-------|-------|--------|
| s | sun, sock, soap, star, snake, spoon | 🔄 In Progress |
| m | mop, moon, mouse, mat, mug, milk | ⏳ Pending |
| f | fan, fish, fork, frog, fox, foot | ⏳ Pending |
| n | net, nut, nose, nest, nine, nurse | ⏳ Pending |
| p | pen, pig, pot, pan, pear, pink | ⏳ Pending |
| t | top, tent, tiger, toy, tree, two | ⏳ Pending |
| c | cup, cat, car, cap, cow, cake | ⏳ Pending |
| h | hat, hen, horse, house, hand, heart | ⏳ Pending |

**Phase 2 Sounds (Medium):**
| Sound | Words | Status |
|-------|-------|--------|
| b | ball, bat, bed, bus, bug, book | ⏳ Pending |
| d | dog, doll, duck, door, dish, drum | ⏳ Pending |
| g | goat, gift, girl, grape, green, gum | ⏳ Pending |
| j | jet, jam, jar, jump, jeans, juice | ⏳ Pending |
| w | web, watch, worm, wolf, water, wing | ⏳ Pending |
| y | yak, yam, yarn, yell, yellow, yo-yo | ⏳ Pending |

**Phase 3 Sounds (Hard - ESL focus):**
| Sound | Words | Status |
|-------|-------|--------|
| v | van, vest, vase, vet, vine, violin | ⏳ Pending |
| th | thumb, three, thick, thin, think, throw | ⏳ Pending |
| r | ring, rug, rat, rain, rabbit, red | ⏳ Pending |
| l | leg, lamp, leaf, log, lip, lemon | ⏳ Pending |
| z | zip, zoo, zebra, zero, zigzag, zone | ⏳ Pending |
| sh | ship, shell, shoe, sheep, shirt, shop | ⏳ Pending |
| ch | chair, cheese, chicken, chip, cherry, chin | ⏳ Pending |

**Vowels (Short sounds):**
| Sound | Words | Status |
|-------|-------|--------|
| a | ant, apple, alligator, ax, add, arrow | ⏳ Pending |
| e | egg, elephant, elbow, envelope, elf, end | ⏳ Pending |
| i | igloo, insect, ink, itch, in, ill | ⏳ Pending |
| o | octopus, orange, ostrich, olive, on, ox | ⏳ Pending |
| u | umbrella, up, under, us, uncle, umpire | ⏳ Pending |

**Daily Workflow:**
1. Find 6 real images for the sound
2. Upload to Claude → resize + fit to square
3. Generate three-part cards PDF
4. Record/verify audio for 6 words
5. Upload to Supabase
6. Update manifest.json
7. Test game with new assets
8. Mark sound COMPLETE

---

## Phase 2: Scale to Four (Q1 2026)

4 school slots ready. When Tredoux moves to Qingdao or onboards another school:
- Update placeholder to real school
- Add children with new school_id
- School selector appears automatically

No code changes needed. Just data.

---

## Phase 3: Franchise Model (Future)

- Each school gets their own slug: `teacherpotato.xyz/beijing`, `teacherpotato.xyz/qingdao`
- School admins manage their own teachers/children
- Super admin (Tredoux) sees everything
- Curriculum stays centralized (Montree)

---

## Phase 4: Jeffy Schools Integration (Future)

When Jeffy Commerce funds the first school:
- Whale becomes the official LMS
- Progress data feeds into community reporting
- Parents see child growth via app
- Transparent education outcomes

---

## Design Principles

1. **Teacher-first** - If it doesn't help the teacher, delete it
2. **Works offline** - Classrooms have bad wifi (PWA support)
3. **One tap** - Progress tracking = one tap, not three screens
4. **Montessori native** - Not adapted from traditional ed-tech
5. **Simple > Clever** - We just deleted 1,864 lines of "clever" code

---

## Technical Philosophy

- Claude writes ALL code
- Cursor copies, never generates
- Supabase for data
- Railway for hosting
- Handoff files for continuity

---

## Success Metrics

- Tredoux uses it daily without bugs
- Second school onboards in < 1 hour
- Parents understand their child's progress
- Teachers say "this saves me time"

---

## The Long Game

Whale proves that technology can serve education without corporate bloat.

When Jeffy Schools opens, students learn on a platform built by a teacher who used it himself.

That's the story. That's the mission.
