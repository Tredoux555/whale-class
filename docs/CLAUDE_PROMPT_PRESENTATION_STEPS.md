# Claude Prompt: Generate Montessori Presentation Steps

## Context

I'm building a Montessori classroom management app. The database has a `montessori_works` table (the "Brain") that stores all Montessori activities/works. Each work needs detailed teacher presentation steps.

Teachers need step-by-step instructions for presenting each Montessori work to children. These steps should follow authentic Montessori pedagogy - slow, deliberate movements, minimal language, allowing the child to observe and absorb.

## Your Task

Generate `presentation_steps` data for Montessori works. The data should be JSONB in this exact format:

```json
[
  {
    "step": 1,
    "title": "Invitation",
    "description": "Invite the child by saying 'Would you like to learn how to pour water?' Walk together to the shelf.",
    "tip": "Make eye contact and gauge the child's interest before proceeding."
  },
  {
    "step": 2,
    "title": "Carry the Tray",
    "description": "Show the child how to carry the tray with both hands, walking slowly to the table.",
    "tip": "Model the careful, deliberate movements you want the child to imitate."
  }
]
```

## Format Requirements

- `step`: Integer, sequential starting at 1
- `title`: Short 2-4 word title for the step
- `description`: 1-2 sentences describing what the teacher does and says
- `tip`: Optional practical tip for the teacher (common mistakes to avoid, what to watch for, etc.)

## Montessori Presentation Principles

1. **Economy of Movement**: Slow, precise, deliberate movements
2. **Economy of Words**: Minimal talking during demonstration
3. **Left to Right**: Work flows left to right (preparing for reading)
4. **Isolation of Difficulty**: Focus on one skill at a time
5. **Control of Error**: The material itself shows the child if they made a mistake
6. **Three-Period Lesson** (for language): "This is...", "Show me...", "What is this?"
7. **Points of Interest**: Highlight moments that capture the child's attention

## Example: Pouring Water (Practical Life)

```json
[
  {
    "step": 1,
    "title": "Invitation",
    "description": "Invite the child: 'Would you like to learn how to pour water?' Walk together to the Practical Life shelf.",
    "tip": "Choose a time when the child seems ready and focused."
  },
  {
    "step": 2,
    "title": "Carry the Tray",
    "description": "Demonstrate carrying the tray with both hands, walking slowly to the table. Place it gently.",
    "tip": "The child will mirror your pace and care."
  },
  {
    "step": 3,
    "title": "Position Materials",
    "description": "Sit to the child's right. Position the full pitcher on the left, empty pitcher on the right.",
    "tip": "Left-to-right prepares for reading direction."
  },
  {
    "step": 4,
    "title": "Grasp the Handle",
    "description": "Using your dominant hand, grasp the pitcher handle. Place other hand on the side for support.",
    "tip": "Exaggerate your grip slightly so the child can see clearly."
  },
  {
    "step": 5,
    "title": "Lift and Pause",
    "description": "Lift the pitcher slowly. Pause at the midpoint to show control.",
    "tip": "This pause is a point of interest."
  },
  {
    "step": 6,
    "title": "Pour Slowly",
    "description": "Tilt and pour the water in one steady stream into the empty pitcher. Watch the water level.",
    "tip": "Pour until just below the rim - not completely full."
  },
  {
    "step": 7,
    "title": "Last Drop",
    "description": "As you finish pouring, tilt the pitcher back slightly to catch the last drop.",
    "tip": "This prevents dripping - a subtle but important detail."
  },
  {
    "step": 8,
    "title": "Return Pitcher",
    "description": "Place the now-empty pitcher back on the left side of the tray.",
    "tip": "Maintain the same careful movements."
  },
  {
    "step": 9,
    "title": "Repeat",
    "description": "Pour the water back to the original pitcher, using the same careful technique.",
    "tip": "The child sees the complete cycle."
  },
  {
    "step": 10,
    "title": "Invite Child",
    "description": "Say 'Now it's your turn' and move to the child's left side to observe.",
    "tip": "Resist the urge to correct immediately - let them try."
  },
  {
    "step": 11,
    "title": "Handle Spills",
    "description": "If water spills, calmly show how to use the sponge to clean up. This is part of the work.",
    "tip": "Spills are learning opportunities, not failures."
  },
  {
    "step": 12,
    "title": "Return to Shelf",
    "description": "When finished, show how to carry the tray back to its place on the shelf.",
    "tip": "The work is complete when materials are returned."
  }
]
```

## Works That Need Presentation Steps

Please generate presentation_steps for each of these Montessori works. I'll provide them in batches by curriculum area.

### BATCH 1: Practical Life (Early)

1. **Pouring Water** - Transferring water between two pitchers
2. **Pouring Beans** - Transferring dry beans between containers
3. **Spooning** - Transferring small objects with a spoon
4. **Tonging** - Using tongs to transfer objects
5. **Squeezing Sponge** - Squeezing water from a sponge
6. **Opening and Closing Containers** - Various lids, caps, zippers
7. **Folding Cloths** - Folding napkins/cloths in halves, quarters
8. **Polishing** - Polishing metal, wood, or shoes
9. **Washing Hands** - Complete hand washing sequence
10. **Dressing Frames** - Button, zipper, snap, buckle frames

### BATCH 2: Sensorial (Early)

1. **Pink Tower** - 10 graduated pink cubes, stacking largest to smallest
2. **Brown Stair** - 10 brown prisms, varying in thickness
3. **Red Rods** - 10 red rods varying in length
4. **Cylinder Blocks** - Four blocks with cylinders varying in dimension
5. **Color Box 1** - Matching primary colors (red, blue, yellow)
6. **Color Box 2** - Matching 11 color pairs
7. **Touch Boards** - Rough and smooth textures
8. **Fabric Box** - Matching fabric textures blindfolded
9. **Sound Cylinders** - Matching pairs by sound
10. **Baric Tablets** - Discriminating weight differences

### BATCH 3: Mathematics (Early)

1. **Number Rods** - Red and blue rods 1-10
2. **Sandpaper Numbers** - Tracing numbers 0-9
3. **Spindle Boxes** - Associating quantity with numeral 0-9
4. **Cards and Counters** - Odd/even, quantity association
5. **Golden Beads Introduction** - Unit, ten, hundred, thousand
6. **Teen Boards** - Numbers 11-19
7. **Ten Boards** - Numbers 10-99
8. **Addition Strip Board** - Adding with strips
9. **Subtraction Strip Board** - Subtracting with strips
10. **Stamp Game** - Four operations with stamps

### Output Format

For each work, provide the presentation_steps in valid JSON format like this:

```
## Work: [Name]
```json
[
  {"step": 1, "title": "...", "description": "...", "tip": "..."},
  ...
]
```

## Important Notes

- Steps should be authentic to Montessori pedagogy
- Include setup, demonstration, child's turn, and cleanup
- Tips should help teachers avoid common mistakes
- Keep language clear but not overly simplified
- Include the "three-period lesson" format where appropriate (especially for language/vocabulary works)
- Consider the child's developmental stage (3-6 years)

---

## How to Use This Output

After generating, I'll update the `montessori_works` table in Supabase:

```sql
UPDATE montessori_works
SET presentation_steps = '[...]'::jsonb
WHERE slug = 'pouring_water';
```

Or if the column doesn't exist yet:

```sql
ALTER TABLE montessori_works ADD COLUMN IF NOT EXISTS presentation_steps JSONB DEFAULT '[]';
```

---

Please start with BATCH 1: Practical Life. Generate detailed, authentic Montessori presentation steps for each work.
