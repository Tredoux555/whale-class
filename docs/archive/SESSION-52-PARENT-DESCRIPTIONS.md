# SESSION 52: Parent Description Writing Mission

## THE MISSION
Write parent-friendly descriptions for ALL 268 Montessori works. No research delegation. Just write them directly - you know Montessori.

## THE FORMAT (STRICT)
```json
{
  "work_id": "pl_carrying_mat",
  "area": "practical_life",
  "parent_description": "Your child learns to carry and unroll their work mat with care, building independence and respect for the classroom space.", // MAX 30 WORDS
  "why_it_matters": "Builds coordination and prepares for all other classroom activities.", // MAX 15 WORDS  
  "home_connection": "Notice how they handle their belongings more carefully at home." // MAX 15 WORDS
}
```

## THE TONE
- Start with "Your child..."
- Active verbs: builds, develops, practices, learns, discovers
- NO JARGON: "hand control" not "fine motor refinement"
- Warm and reassuring
- Focus on what parents can SEE their child doing
- Connect to real life when possible

## CURRICULUM FILES (268 works total)
All at `/Users/tredouxwillemse/Desktop/whale/lib/curriculum/data/`:
- `practical-life.json` - 83 works (8 categories)
- `sensorial.json` - 35 works
- `language.json` - 43 works  
- `math.json` - 57 works
- `cultural.json` - 50 works

## OUTPUT FORMAT
Create one JSON file per area in `/Users/tredouxwillemse/Desktop/whale/lib/curriculum/parent-descriptions/`:
- `practical-life-parents.json`
- `sensorial-parents.json`
- `language-parents.json`
- `math-parents.json`
- `cultural-parents.json`

Each file: array of objects with work_id, area, parent_description, why_it_matters, home_connection

## DATABASE (already prepared)
Migration at `/Users/tredouxwillemse/Desktop/whale/PARENT_DESCRIPTIONS_MIGRATION.sql`:
```sql
ALTER TABLE montree_work_translations 
ADD COLUMN parent_description TEXT,
ADD COLUMN why_it_matters TEXT,
ADD COLUMN home_connection TEXT;
```

## WORKFLOW
1. Read each curriculum JSON
2. Write descriptions in batches (20-25 works at a time)
3. Save progress after each batch
4. Move to next area
5. Final: create import script for Supabase

## EXAMPLES (gold standard)

### Practical Life - Transfer
```json
{
  "work_id": "pl_spooning",
  "area": "practical_life", 
  "parent_description": "Your child carefully transfers small objects from one bowl to another using a spoon, building the hand control needed for writing.",
  "why_it_matters": "Strengthens the same muscles used to hold a pencil.",
  "home_connection": "Let them help scoop rice or beans at mealtimes."
}
```

### Sensorial
```json
{
  "work_id": "s_pink_tower",
  "area": "sensorial",
  "parent_description": "Your child stacks ten pink cubes from largest to smallest, training their eyes to see subtle differences in size.",
  "why_it_matters": "Develops visual discrimination needed for reading letters.",
  "home_connection": "They may start noticing size differences everywhere."
}
```

### Math
```json
{
  "work_id": "m_number_rods",
  "area": "math",
  "parent_description": "Your child arranges red and blue rods in order from 1 to 10, feeling the length of each number in their hands.",
  "why_it_matters": "Makes abstract numbers concrete and touchable.",
  "home_connection": "Count steps together - they understand quantity now."
}
```

## PRIORITY
Start with Practical Life (83 works) - it's the biggest and most visible to parents.

## SUCCESS CRITERIA
- 268 descriptions written
- All under word limits
- Warm tone throughout
- No Montessori jargon
- Ready for database import

---
*Created: Session 51/52 handoff*
*Status: READY TO EXECUTE*
