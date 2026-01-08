# Whale Curriculum Materials Framework

## Overview

This is the single source of truth for all curriculum assets. Every image, audio file, and learning material lives here and feeds into:

1. **Sound Games** (web app)
2. **Three-Part Cards** (printable PDFs)
3. **English Learning Guide** (future)
4. **Parent Resources** (future)

## Structure

```
curriculum/
├── assets/
│   ├── images/
│   │   └── phonics/
│   │       ├── beginning-sounds/
│   │       │   ├── s/          # sun.png, sock.png, etc.
│   │       │   ├── m/          # mop.png, moon.png, etc.
│   │       │   └── ...
│   │       ├── ending-sounds/
│   │       │   ├── t/          # cat.png, hat.png, etc.
│   │       │   └── ...
│   │       └── cvc-words/      # Full CVC word images
│   │
│   └── audio/
│       └── phonics/
│           ├── letters/        # a.mp3, b.mp3, etc.
│           ├── words/          # sun.mp3, sock.mp3, etc.
│           └── instructions/   # Game instructions
│
├── three-part-cards/
│   ├── templates/              # Base templates
│   └── generated/              # Output PDFs
│
├── guides/                     # Teacher/parent guides
│
├── manifest.json               # Asset registry
└── README.md                   # This file
```

## Image Requirements

- **Format:** PNG (preferred) or JPG
- **Size:** Minimum 400x400px, square or near-square
- **Style:** Clear, simple, single object
- **Background:** White or transparent preferred
- **Naming:** lowercase, single word (e.g., `sun.png`)

## Workflow

### Adding New Assets

1. Save image to correct folder: `assets/images/phonics/beginning-sounds/s/sun.png`
2. Run: `node scripts/curriculum/sync-assets.js`
3. This updates manifest.json and syncs to Supabase

### Generating Three-Part Cards

1. Ensure images exist in assets folder
2. Run: `node scripts/curriculum/generate-cards.js --sound s`
3. PDF output: `three-part-cards/generated/beginning-s.pdf`

## Sound Groups (Beginning Sounds)

### Phase 1 - Easy (exists in Mandarin)
| Sound | Words |
|-------|-------|
| s | sun, sock, soap, star, snake, spoon |
| m | mop, moon, mouse, mat, mug, milk |
| f | fan, fish, fork, frog, fox, foot |
| n | net, nut, nose, nest, nine, nurse |
| p | pen, pig, pot, pan, pear, pink |
| t | top, tent, tiger, toy, tree, two |
| c | cup, cat, car, cap, cow, cake |
| h | hat, hen, horse, house, hand, heart |

### Phase 2 - Medium
| Sound | Words |
|-------|-------|
| b | ball, bat, bed, bus, bug, book |
| d | dog, doll, duck, door, dish, drum |
| g | goat, gift, girl, grape, green, gum |
| j | jet, jam, jar, jump, jeans, juice |
| w | web, watch, worm, wolf, water, wing |
| y | yak, yam, yarn, yell, yellow, yo-yo |

### Phase 3 - Hard (ESL focus)
| Sound | Words |
|-------|-------|
| v | van, vest, vase, vet, vine, violin |
| th | thumb, three, thick, thin, think, throw |
| r | ring, rug, rat, rain, rabbit, red |
| l | leg, lamp, leaf, log, lip, lemon |
| z | zip, zoo, zebra, zero, zigzag, zone |
| sh | ship, shell, shoe, sheep, shirt, shop |
| ch | chair, cheese, chicken, chip, cherry, chin |

### Vowels (Short sounds)
| Sound | Words |
|-------|-------|
| a | ant, apple, alligator, ax, add, arrow |
| e | egg, elephant, elbow, envelope, elf, end |
| i | igloo, insect, ink, itch, in, ill |
| o | octopus, orange, ostrich, olive, on, ox |
| u | umbrella, up, under, us, uncle, umpire |

## Asset Status

Track progress in `manifest.json`. Each asset has:
- `status`: "missing" | "local" | "deployed"
- `localPath`: Path in curriculum folder
- `supabasePath`: URL when deployed
- `audioPath`: Associated audio file

## Three-Part Card Format

Classic Montessori three-part cards:
1. **Control Card**: Image + Label together
2. **Picture Card**: Image only
3. **Label Card**: Text only

Child matches picture to label, then checks with control card.
