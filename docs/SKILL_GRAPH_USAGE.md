# Skill Graph Usage Guide

Generated from `montree-curriculum-graph.json` on March 29, 2026.

## Overview

The `skill-graph.ts` module provides a complete type-safe mapping of the Montessori 3-6 curriculum with skill dependencies and exercise relationships.

**File Location:** `lib/montree/skill-graph.ts`
**Total Exercises:** 231 across 5 areas
**Total Skills:** 79 across 6 categories

## Core Data Structures

### Skill Categories (79 skills total)

```typescript
// Motor Skills (14)
MOTOR_SKILLS = {
  gross_motor_control, fine_motor_control, pincer_grip, palmar_grasp,
  wrist_rotation, bilateral_coordination, hand_eye_coordination,
  finger_isolation, grip_strength, tripod_grip, controlled_movement,
  pouring_control, cutting_skill, folding_skill
}

// Cognitive Skills (21)
COGNITIVE_SKILLS = {
  concentration, order_sense, pattern_recognition, classification,
  seriation, one_to_one_correspondence, number_sense, decimal_understanding,
  symbol_recognition, symbol_sound_association, spatial_reasoning,
  logical_reasoning, memory_sequential, memory_visual, abstraction,
  problem_solving, estimation, comparison, analysis, synthesis, observation
}

// Practical Skills (10)
PRACTICAL_SKILLS = {
  self_care, food_preparation, cleaning, care_of_environment,
  care_of_self, grace_and_courtesy, tool_use, water_handling,
  plant_care, animal_care
}

// Language Skills (14)
LANGUAGE_SKILLS = {
  phonemic_awareness, phonetic_decoding, blending, vocabulary_enrichment,
  oral_expression, story_comprehension, letter_formation, word_building,
  sentence_construction, reading_fluency, reading_comprehension,
  creative_writing, grammar_awareness, handwriting_control
}

// Social-Emotional Skills (10)
SOCIAL_EMOTIONAL_SKILLS = {
  independence, self_regulation, persistence, self_correction,
  cooperation, respect_for_materials, confidence, patience,
  empathy, responsibility
}

// Sensorial Perception Skills (10)
SENSORIAL_SKILLS = {
  visual_discrimination, tactile_discrimination, auditory_discrimination,
  olfactory_discrimination, gustatory_discrimination, baric_sense,
  thermic_sense, stereognostic_sense, chromatic_sense, dimension_perception
}
```

### Exercise Node Structure

```typescript
interface ExerciseNode {
  key: string;                    // Unique exercise ID (e.g., "PL001")
  name: string;                   // Exercise name
  area: 'practical_life' | 'sensorial' | 'mathematics' | 'language' | 'culture';
  sub_area?: string;              // Category within area (e.g., "Movement")
  prerequisites: string[];        // Exercise keys that must be completed first
  successors: string[];           // Exercise keys that typically follow this
  skills_developed: string[];     // Skills this exercise develops
  skills_required: string[];      // Skills needed to begin this exercise
  typical_age_range: string;      // Age range (e.g., "2.5-3.5")
  mastery_indicators?: string[];  // Signs of mastery
}
```

### Exercises by Area

| Area | Count | Sample Exercises |
|------|-------|------------------|
| Practical Life | 51 | Walking on Line, Carrying Tray, Pouring |
| Sensorial | 30 | Color Box 1, Cylinder Blocks, Knobbed Cylinders |
| Mathematics | 47 | Golden Beads, Number Rods, Bead Board |
| Language | 45 | Sandpaper Letters, Moveable Alphabet, Pink Series |
| Culture | 58 | Geography, Biology, History, Art exercises |

## Helper Functions

### Get Exercises by Area
```typescript
const practicalLifeExercises = getExercisesByArea('practical_life');
// Returns all 51 practical life exercises
```

### Get Exercise Prerequisites
```typescript
const prereqs = getExercisePrerequisites('PL002');
// Returns: [ExerciseNode for PL001] (Carrying a Tray requires Walking on Line)
```

### Get Exercise Successors
```typescript
const nextExercises = getExerciseSuccessors('PL001');
// Returns: [ExerciseNode for PL002, PL003, PL010] (exercises that typically follow)
```

### Get Exercises by Skill
```typescript
const exercisesForFineMotor = getExercisesBySkill('fine_motor_control');
// Returns all exercises that develop fine motor control
```

### Get Skills by Exercise
```typescript
const skillsDeveloped = getSkillsByExercise('PL002');
// Returns: ["gross_motor_control", "bilateral_coordination", "controlled_movement", "responsibility"]
```

## Work Key Mappings

The file includes mappings between production `work_keys` and V3 exercise keys:

```typescript
// From production curriculum to V3
WORK_KEY_TO_EXERCISE_V3 = {
  "pl_walking_on_line": "PL001",
  "pl_carrying_tray": "PL002",
  "pl_carrying_chair": "PL003",
  "pl_rolling_unrolling_mat": "PL004",
  // ... more mappings
}

// Reverse mapping
EXERCISE_V3_TO_WORK_KEY = {
  "PL001": "pl_walking_on_line",
  "PL002": "pl_carrying_tray",
  // ...
}
```

## Usage Examples

### Example 1: Find Prerequisites for a Work
```typescript
import { getExercisePrerequisites } from '@/lib/montree/skill-graph';

// What must a child master before doing "Carrying a Tray"?
const prereqs = getExercisePrerequisites('PL002');
// Result: ExerciseNode for "Walking on the Line" (PL001)
```

### Example 2: Map Production Work to V3 and Get Skills
```typescript
import { WORK_KEY_TO_EXERCISE_V3, EXERCISE_GRAPH } from '@/lib/montree/skill-graph';

const productionWorkKey = 'pl_pouring_water';
const v3ExerciseKey = WORK_KEY_TO_EXERCISE_V3[productionWorkKey];
const exercise = EXERCISE_GRAPH[v3ExerciseKey];

console.log(exercise.name);              // "Pouring Water"
console.log(exercise.skills_developed);  // Skills developed
console.log(exercise.prerequisites);     // What comes before
console.log(exercise.typical_age_range); // "3-4.5"
```

### Example 3: Build Curriculum Path for Child
```typescript
import { getExercisesByArea, getExerciseSuccessors } from '@/lib/montree/skill-graph';

// Get all practical life exercises
const practicalLifeExercises = getExercisesByArea('practical_life');

// Find exercises without prerequisites (starting points)
const startingExercises = practicalLifeExercises.filter(
  ex => ex.prerequisites.length === 0
);
// These are the natural entry points for a new child
```

### Example 4: Find All Ways to Develop a Specific Skill
```typescript
import { getExercisesBySkill } from '@/lib/montree/skill-graph';

// Which exercises develop "concentration"?
const concentrationExercises = getExercisesBySkill('concentration');

// Filter to practical life only
const plConcentration = concentrationExercises.filter(
  ex => ex.area === 'practical_life'
);
```

## Data Accuracy Notes

- **Source:** Montree V3 Curriculum Graph (montree-curriculum-graph.json)
- **Total Nodes:** 231 exercises
- **Skill Taxonomy:** 79 distinct skills across 6 categories
- **Age Ranges:** Typical ranges in months (e.g., "2.5-3.5" = 30-42 months)
- **Prerequisites/Successors:** Based on Montessori progression sequences
- **Mastery Indicators:** Observable signs a child has mastered the exercise

## Extending the Mappings

To add more production work_key to V3 exercise mappings:

```typescript
// In skill-graph.ts, add to WORK_KEY_TO_EXERCISE_V3:
export const WORK_KEY_TO_EXERCISE_V3: Record<string, string> = {
  "pl_walking_on_line": "PL001",
  "pl_carrying_tray": "PL002",
  // ... existing mappings ...

  // NEW MAPPINGS:
  "your_work_key": "V3_EXERCISE_KEY",
};
```

Then the reverse mapping (`EXERCISE_V3_TO_WORK_KEY`) will automatically include it.

## Performance Notes

- EXERCISE_GRAPH object size: ~127KB (all 231 exercises)
- All lookups are O(1) or O(n) where n is number of exercises in result set
- Safe for use in browser and server-side contexts
- Tree traversal (prerequisites/successors) is depth-first by default

## Type Safety

All exports are fully typed:
- Exercise keys are strings (e.g., "PL001")
- Area types are literal unions
- Skill keys are validated against taxonomy
- Helper functions have proper return types

Use TypeScript autocomplete for IDE support with exercise keys and skill names.
