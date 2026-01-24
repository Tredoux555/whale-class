# 🐋 Montree Games Implementation Plan

## Executive Summary

**Current State**: 18+ games built, all focused on Language/English curriculum
**Gap**: Sensorial, Math, and Cultural areas have minimal/no digital game coverage
**Goal**: Build targeted games across all areas + redesign parent portal for actionable simplicity

---

## Part 1: Current Game Inventory

### Existing Games (18 total)

| Game | Category | Montessori Work Alignment |
|------|----------|---------------------------|
| Letter Sounds | Language | Sandpaper Letters, Sound Games |
| Beginning Sounds | Language | I-Spy, Phonemic Awareness |
| Middle Sounds | Language | Short Vowels |
| Ending Sounds | Language | Sound Games |
| Blending | Language | Word Analysis |
| Segmenting | Language | Word Analysis |
| Word Builder | Language | Moveable Alphabet |
| Letter Tracer | Language | Sandpaper Letters, Metal Insets |
| Capital Letter Tracer | Language | Uppercase Sandpaper Letters |
| Number Tracer | Math | Sandpaper Numerals |
| Sentence Builder | Language | Sentence Analysis |
| Vocabulary Builder | Language | Classified Cards |
| Picture Match | Language | Three-Part Cards |
| Sight Flash | Language | Sight Words |
| Combined I-Spy | Language | Object Sound Games |
| Grammar Symbols | Language | Parts of Speech |
| Sensorial Sort | Sensorial | Color Tablets (partial) |
| Quantity Match | Math | Cards and Counters (partial) |
| Bead Frame | Math | Golden Beads visualization |

### Coverage Analysis

| Curriculum Area | Works in Brain | Games | Coverage |
|-----------------|---------------|-------|----------|
| **Language** | 45 | 14 | 🟢 31% |
| **Mathematics** | 42 | 3 | 🔴 7% |
| **Sensorial** | 38 | 1 | 🔴 3% |
| **Practical Life** | 48 | 0 | ⚫ N/A (physical only) |
| **Cultural** | 40 | 0 | 🔴 0% |

---

## Part 2: Priority Games to Build

Based on research, these 12 games provide maximum developmental coverage with minimum build effort.

### Tier 1: High Impact, Easy Build (Week 1)

#### 1. 🎨 Color Matching Game
**Work**: Color Tablets Box I & II
**Mechanic**: Match pairs of identical colors (Box I = 3 pairs, Box II = 11 pairs)
**Age**: 2.5-4
**Build time**: 2-3 hours
**Assets needed**: 22 color swatches (can use CSS)

#### 2. 🌈 Color Grading Game  
**Work**: Color Tablets Box III
**Mechanic**: Drag 7 shades of one color into light→dark sequence
**Age**: 4-6
**Build time**: 2-3 hours
**Assets needed**: 63 color swatches (9 colors × 7 shades)

#### 3. 🔢 Hundred Board
**Work**: Hundred Board
**Mechanic**: Drag numbered tiles (1-100) to correct grid position
**Progressive**: Start with 1-10, unlock rows as mastered
**Age**: 4.5-6
**Build time**: 3-4 hours
**Assets needed**: Number tiles 1-100 (CSS generated)

#### 4. 🔴🔵 Odd/Even Counters
**Work**: Cards and Counters
**Mechanic**: Drag counters under numbers 1-10, see odd/even pattern emerge
**Age**: 4-5
**Build time**: 2-3 hours
**Assets needed**: Number cards 1-10, red counter circles

### Tier 2: Medium Effort, High Value (Week 2)

#### 5. 🗺️ World Puzzle Map
**Work**: Puzzle Map - World (Continents)
**Mechanic**: Drag continent pieces to correct position on globe outline
**Age**: 3.5-6
**Build time**: 4-5 hours
**Assets needed**: 7 continent SVGs + world outline
**Open source ref**: Can adapt drag-drop-shapes mechanics

#### 6. 🏝️ Land & Water Forms
**Work**: Land & Water Form Trays
**Mechanic**: Match pairs (island↔lake, peninsula↔gulf, etc.)
**Then**: Label identification game
**Age**: 3-4.5
**Build time**: 3-4 hours
**Assets needed**: 10 form illustrations

#### 7. 📐 Geometric Cabinet Match
**Work**: Geometric Cabinet
**Mechanic**: Drag 2D shapes into matching outlines
**Progressive**: Demo tray → Individual drawers
**Age**: 3-5
**Build time**: 4-5 hours
**Assets needed**: 35 shape SVGs
**Open source ref**: AlxVallecillo/Drag-Drop-shapes (adapt)

#### 8. 🔺 Pink Tower Sequence
**Work**: Pink Tower
**Mechanic**: Order 10 cubes by size (2D representation)
**Note**: Label as "supplement to hands-on work"
**Age**: 2.5-4
**Build time**: 2-3 hours
**Assets needed**: 10 square SVGs in graduating sizes

### Tier 3: Advanced Builds (Week 3-4)

#### 9. 🔢 Number Rods Ordering
**Work**: Number Rods (Red & Blue)
**Mechanic**: Order rods 1-10 by length, count segments
**Age**: 3.5-4
**Build time**: 3-4 hours
**Assets needed**: 10 rod SVGs with red/blue segments

#### 10. 🧊 Golden Beads Visualizer
**Work**: Golden Bead Material
**Mechanic**: Build numbers using unit/ten/hundred/thousand
**Exchange animation: 10 units → 1 ten bar
**Age**: 4-5
**Build time**: 6-8 hours
**Assets needed**: Bead unit, ten-bar, hundred-square, thousand-cube

#### 11. 📊 Teen/Tens Board Game
**Work**: Séguin Boards I & II
**Mechanic**: Build numbers 11-99 by placing numerals
**Age**: 4.5-5.5
**Build time**: 4-5 hours
**Assets needed**: Number cards 0-9, bead representations

#### 12. 🌍 Continent Puzzle Maps (Expansion)
**Work**: Individual Continent Puzzle Maps
**Mechanic**: Country placement for each continent
**Age**: 4-6
**Build time**: 8-10 hours (7 continent sets)
**Assets needed**: ~150 country SVGs

---

## Part 3: Open Source Code to Adapt

### Immediate Use (Copy & Modify)

| Repository | Use For | Adaptation Needed |
|------------|---------|-------------------|
| [jkanev/educational-html-games](https://github.com/jkanev/educational-html-games) | Number memory, quantity recognition | Restyle to Whale theme |
| [AlxVallecillo/Drag-Drop-shapes](https://github.com/AlxVallecillo/Drag-Drop-shapes) | Geometric Cabinet | Replace shapes with Montessori forms |
| [kubowania/memory-game](https://github.com/kubowania/memory-game) | Three-Part Cards expansion | Add image-label-control sets |
| [timmalich/edukiz](https://github.com/timmalich/edukiz) | Alphabet, arithmetic reference | Study Vue→React patterns |

### Framework for Custom Games

Use existing `GameShell.tsx` and `GameWrapper.tsx` components as base. All new games should:
1. Integrate with `game_curriculum_mapping` table
2. Track progress via `montree_game_progress` table
3. Use consistent animation library (Framer Motion)
4. Support touch-first interaction
5. Include audio feedback (existing ElevenLabs setup)

---

## Part 4: Parent Portal Redesign

### Current Problem
Parent sees technical progress bars (0 Presented, 0 Practicing, 6 Mastered) - meaningless to parents.

### New Parent Dashboard Design

```
┌─────────────────────────────────────────────────────────┐
│  🐋 Rachel's Learning Journey                           │
│  Whale Class • PreK 4                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📅 TODAY (Friday, Jan 24)                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Rachel worked on:                                │   │
│  │ • Color Mixing (Sensorial) - 15 min            │   │
│  │ • Sandpaper Letters m, s (Language) - 10 min   │   │
│  │ • Pouring Water (Practical Life) - 20 min      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  🎮 PRACTICE AT HOME                                    │
│  Games that reinforce today's classroom work:           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ 🎨       │  │ 🔤       │  │          │             │
│  │ Color    │  │ Letter   │  │ (empty)  │             │
│  │ Match    │  │ Sounds   │  │          │             │
│  │ [PLAY]   │  │ [PLAY]   │  │          │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│                                                         │
│  📊 WEEKLY REPORT                                       │
│  Week of Jan 20-24                          [VIEW PDF]  │
│  ┌─────────────────────────────────────────────────┐   │
│  │ "Rachel showed great concentration this week,   │   │
│  │  especially with the pouring exercises. She's   │   │
│  │  developing strong fine motor control..."       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  📁 PREVIOUS REPORTS                                    │
│  • Week of Jan 13-17                        [VIEW PDF]  │
│  • Week of Jan 6-10                         [VIEW PDF]  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Key Features

1. **Today's Activities** - Simple list of what child did (from `work_sessions` table)
2. **Recommended Games** - Auto-matched based on today's work via `game_curriculum_mapping`
3. **Weekly Report** - PDF download + summary preview
4. **No Progress Bars** - Parents don't need mastery percentages

### Database Changes Needed

```sql
-- Add work-to-game recommendation view
CREATE VIEW parent_game_recommendations AS
SELECT 
  ws.child_id,
  ws.work_date,
  ws.work_id,
  cr.name as work_name,
  cr.area,
  gcm.game_id,
  gcm.game_name,
  gcm.game_url,
  gcm.game_icon,
  gcm.relevance
FROM montree_work_sessions ws
JOIN curriculum_roadmap cr ON ws.work_id = cr.id
JOIN game_curriculum_mapping gcm ON gcm.work_id = ws.work_id
WHERE ws.work_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY gcm.relevance DESC;
```

---

## Part 5: Implementation Roadmap

### Phase 1: Foundation (3 days)

**Day 1: Parent Portal Redesign**
- [ ] Create new parent dashboard layout
- [ ] Add "Today's Activities" section pulling from work_sessions
- [ ] Add game recommendation engine
- [ ] Remove technical progress bars

**Day 2: Quick Win Games**
- [ ] Build Color Matching Game (2h)
- [ ] Build Color Grading Game (2h)  
- [ ] Build Odd/Even Counters (2h)

**Day 3: Integration**
- [ ] Add new games to game_curriculum_mapping
- [ ] Connect games to parent recommendations
- [ ] Test parent flow: see today's work → play recommended game

### Phase 2: Core Games (5 days)

**Day 4-5: Math Games**
- [ ] Build Hundred Board (4h)
- [ ] Build Number Rods Ordering (3h)
- [ ] Add to math work mappings

**Day 6-7: Cultural Games**  
- [ ] Build World Puzzle Map (5h)
- [ ] Build Land & Water Forms (4h)
- [ ] Add to cultural work mappings

**Day 8: Sensorial Games**
- [ ] Build Geometric Cabinet Match (4h)
- [ ] Build Pink Tower Sequence (2h)
- [ ] Add to sensorial work mappings

### Phase 3: Polish (3 days)

**Day 9: Advanced Games**
- [ ] Build Teen/Tens Board (4h)
- [ ] Build Golden Beads Visualizer (6h)

**Day 10: Testing & QA**
- [ ] Test all games on tablet
- [ ] Test parent portal flow
- [ ] Fix any issues

**Day 11: Demo Prep**
- [ ] Create demo script showing parent journey
- [ ] Final polish

---

## Part 6: Technical Specifications

### Game Component Template

```tsx
// components/games/ColorMatchGame.tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { GameWrapper } from './GameWrapper'
import { useGameProgress } from '@/lib/hooks/useGameProgress'

const COLORS_BOX_1 = [
  { name: 'red', hex: '#E53935' },
  { name: 'yellow', hex: '#FDD835' },
  { name: 'blue', hex: '#1E88E5' },
]

export function ColorMatchGame() {
  const { recordAttempt, recordCompletion } = useGameProgress('color-match')
  const [matched, setMatched] = useState<string[]>([])
  
  // ... game logic
  
  return (
    <GameWrapper
      title="Color Matching"
      workName="Color Tablets Box I"
      age="2.5-4"
      icon="🎨"
    >
      {/* Game UI */}
    </GameWrapper>
  )
}
```

### File Structure for New Games

```
/components/games/
  /sensorial/
    ColorMatchGame.tsx
    ColorGradeGame.tsx
    GeometricCabinetGame.tsx
    PinkTowerGame.tsx
  /math/
    HundredBoardGame.tsx
    OddEvenGame.tsx
    NumberRodsGame.tsx
    TeenTensBoardGame.tsx
    GoldenBeadsGame.tsx
  /cultural/
    WorldMapGame.tsx
    LandWaterGame.tsx
    ContinentMapsGame.tsx
```

### Asset Requirements

| Asset Type | Quantity | Format | Source |
|------------|----------|--------|--------|
| Color swatches | 85 | CSS/SVG | Generate |
| Geometric shapes | 35 | SVG | Create or find |
| Continent maps | 8 | SVG | OpenStreetMap data |
| Country shapes | ~150 | SVG | Natural Earth data |
| Number tiles | 100 | CSS | Generate |
| Bead graphics | 4 | SVG | Create |
| Land/water forms | 10 | SVG/PNG | Create |

---

## Part 7: Success Metrics

### Goals

1. **Game Coverage**: 30+ games across 4 areas (up from 18)
2. **Parent Engagement**: Simple dashboard with 0 learning curve
3. **Work-Game Mapping**: Every game linked to specific Montessori works
4. **Child Journey**: Parent can see: classroom work → home practice → weekly report

---

## Appendix: Quick Reference

### Montessori Works → Game Mapping (Priority)

| Work | Game to Build | Priority |
|------|---------------|----------|
| Color Tablets I | Color Matching | 🔴 HIGH |
| Color Tablets III | Color Grading | 🔴 HIGH |
| Hundred Board | Hundred Board | 🔴 HIGH |
| Cards & Counters | Odd/Even | 🔴 HIGH |
| Puzzle Map - World | World Map | 🟡 MEDIUM |
| Land/Water Forms | Land & Water | 🟡 MEDIUM |
| Geometric Cabinet | Shape Match | 🟡 MEDIUM |
| Pink Tower | Size Sequence | 🟡 MEDIUM |
| Number Rods | Rod Ordering | 🟡 MEDIUM |
| Golden Beads | Place Value | 🟢 LATER |
| Séguin Boards | Teen/Tens | 🟢 LATER |
| Continent Maps | Country Puzzles | 🟢 LATER |

### NOT Digitizing (Physical Only)

- All Practical Life works
- Knobbed Cylinders (3D fitting)
- Sound Cylinders (auditory)
- Thermic Tablets (temperature)
- Baric Tablets (weight)
- Touch Boards (texture)
- Walking the Line
- Grace & Courtesy

---

*Plan created: Jan 24, 2026*
*Target: Production-ready parent portal + 12 new games*
