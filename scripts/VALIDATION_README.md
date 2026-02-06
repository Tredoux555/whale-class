# Curriculum Validation Script

A comprehensive TypeScript validation tool that audits the Montessori curriculum for structural integrity, completeness, and consistency.

## Overview

The validation script performs automated checks on the curriculum data to ensure:

1. **Sequence Integrity** - No gaps, proper numbering, no duplicates
2. **Prerequisite Validity** - All prerequisites exist, no circular dependencies, proper ordering
3. **Age Range Progression** - Logical advancement, no violations
4. **Description Coverage** - Complete metadata for all works
5. **Orphan Detection** - No unreferenced or missing works

## Quick Start

### Run with npm

```bash
npm run validate:curriculum
```

### Run directly with ts-node

```bash
npx ts-node --esm scripts/validate-curriculum.ts
```

## Output

The script generates a comprehensive report in the console and saves it to `scripts/validation-report.txt`.

### Sample Output

```
═══════════════════════════════════════════════════════════════
         CURRICULUM VALIDATION REPORT
═══════════════════════════════════════════════════════════════

📋 SEQUENCE INTEGRITY
─────────────────────────────────────────────────────────────
✓ All sequences valid (no gaps, proper numbering)

🔗 PREREQUISITE VALIDATION
─────────────────────────────────────────────────────────────
✓ All prerequisites valid (exist, no cycles, correct ordering)

📅 AGE RANGE PROGRESSION
─────────────────────────────────────────────────────────────
✓ All age ranges properly ordered

📝 DESCRIPTION COVERAGE
─────────────────────────────────────────────────────────────
Cultural            : ████████████████████ 100% (50/50)
Language            : ████████████████████ 100% (43/43)
Mathematics         : ████████████████████ 100% (57/57)
Practical Life      : ████████████████████ 100% (83/83)
Sensorial           : ████████████████████ 100% (35/35)
─────────────────────────────────────────────────────────────
Overall: 100% (268/268 works)

❌ MISSING REQUIRED FIELDS
─────────────────────────────────────────────────────────────
✗ pl_coughing_sneezing: Missing materials
✗ pl_greetings: Missing materials

🔍 ORPHAN & REFERENTIAL INTEGRITY
─────────────────────────────────────────────────────────────
✓ No orphaned works found

═══════════════════════════════════════════════════════════════
                        SUMMARY
═══════════════════════════════════════════════════════════════
Total Works: 268
With Full Metadata: 268
Total Issues Found: 11
Status: ⚠ ISSUES DETECTED
```

## Validation Rules

### 1. Sequence Integrity

Validates that within each category:
- Sequences start at 1
- No gaps between sequence numbers
- No duplicate sequences

**Example Issue:**
```
✗ sensorial/visual_color: Gap between sequence 2 and 5
```

### 2. Prerequisite Validation

Checks:
- All prerequisite IDs exist in the curriculum
- No circular dependencies (A requires B requires A)
- Prerequisites have lower sequence numbers than dependent works

**Example Issues:**
```
✗ math_golden_beads_addition requires math_golden_bead_intro (NOT FOUND)
✗ pl_spooning (seq 2) requires pl_dry_transfer_hand (seq 3) - prerequisite should have lower sequence
```

### 3. Age Range Progression

Validates:
- Age ranges are logically ordered
- Prerequisites don't have later age ranges than dependent works

**Age Range Order:**
- toddler (0-3)
- primary_year1 (3-4)
- primary_year2 (4-5)
- primary_year3 (5-6)
- lower_elementary (6-9)
- upper_elementary (9-12)

**Example Issue:**
```
✗ pl_sewing (primary_year1) requires pl_advanced_cutting (primary_year2) - INVALID
```

### 4. Description Coverage

Checks that each work has:
- `name` - Non-empty work title
- `description` - Non-empty detailed description
- `directAims` - Non-empty array of learning objectives
- `materials` - Non-empty array of required materials
- `controlOfError` - Non-empty description of self-correction mechanism
- `chineseName` - Non-empty Chinese name (for sourcing)
- `levels` - Non-empty array of difficulty levels

**Example Issues:**
```
✗ pl_coughing_sneezing: Missing materials
✗ pl_greetings: Missing description
✗ se_cylinder_block_1: Missing directAims
```

### 5. Orphan Detection

Identifies:
- Works referenced as prerequisites but not found in curriculum
- Works defined but not referenced (orphaned)

Coverage statistics by area:
- Total works per area
- Works with complete descriptions
- Percentage completion

## Data Sources

The script validates against:
- **Curriculum Data:** `/lib/curriculum/data/*.json`
  - cultural.json
  - language.json
  - mathematics.json
  - practical-life.json
  - sensorial.json

- **Guide Files:** `/lib/curriculum/comprehensive-guides/*.json`
  - Provides descriptions and supplementary information
  - Maps work IDs to detailed guides

## Exit Codes

- **0** - All validations passed, no issues found
- **1** - One or more validation issues detected

This allows the script to be used in CI/CD pipelines:

```bash
npm run validate:curriculum && echo "Curriculum valid!" || echo "Issues found!"
```

## Implementation Details

### Type Definitions

The script uses the core curriculum types:

```typescript
interface Work {
  id: string;
  name: string;
  description: string;
  ageRange: AgeRange;
  prerequisites: string[];
  sequence: number;
  materials: string[];
  directAims: string[];
  indirectAims: string[];
  controlOfError: string;
  chineseName: string;
  levels: Level[];
}

interface Category {
  id: string;
  name: string;
  description: string;
  sequence: number;
  works: Work[];
}

interface Area {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  sequence: number;
  categories: Category[];
}
```

### Algorithm Highlights

**Circular Dependency Detection:**
Uses depth-first search with recursion stack tracking to identify circular prerequisite chains.

**Sequence Validation:**
Loads all sequences, sorts them, and checks for continuity from 1.

**Age Range Ordering:**
Maintains an ordered map of age ranges and compares prerequisite rankings against dependent work rankings.

## Common Issues & Solutions

### Issue: Missing Materials

**Cause:** Social grace or etiquette works don't have physical materials.

**Solution:** Add an empty materials array `[]` or update work definition to include relevant items like "Social interaction," "Community guidelines," etc.

### Issue: Circular Dependency Detected

**Cause:** Work A requires B, B requires C, C requires A.

**Solution:** Review prerequisite chains and break the cycle by removing one prerequisite link.

### Issue: Gap in Sequence

**Cause:** Works defined with non-consecutive sequence numbers (e.g., 1, 2, 5).

**Solution:** Renumber works to be consecutive starting from 1.

## Future Enhancements

Potential additions:
- Work with image URLs (validate image file existence)
- Validate video search terms against actual YouTube availability
- Cross-check comprehensive guides with work IDs
- Check for duplicate work IDs across areas
- Validate material availability against supplier catalogs
- Performance profiling for large curriculum updates

## Files

- `scripts/validate-curriculum.ts` - Main validation script
- `scripts/validation-report.txt` - Latest validation report
- `scripts/VALIDATION_README.md` - This file

## Related Files

- `/lib/curriculum/data/` - Source curriculum JSON files
- `/lib/curriculum/types.ts` - TypeScript type definitions
- `/package.json` - npm scripts configuration
