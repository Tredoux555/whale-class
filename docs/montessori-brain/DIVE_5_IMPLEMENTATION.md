# MONTESSORI BRAIN - DIVE 5: Implementation Structure
## JSON Schema, Database Design & AI Integration

> **Purpose**: Transform research into usable data structures for the Whale platform
> **Created**: January 20, 2025
> **Status**: DIVE 5 Complete

---

## 1. MASTER DATA SCHEMA

### 1.1 Work Schema (JSON)

```json
{
  "work": {
    "id": "string (UUID)",
    "name": "string",
    "slug": "string (URL-safe)",
    "curriculum_area": "enum: practical_life | sensorial | mathematics | language | cultural",
    "sub_area": "string (e.g., 'transfer_activities', 'visual_dimension', 'numeration')",
    
    "age_range": {
      "min": "number (years, e.g., 2.5)",
      "max": "number (years, e.g., 6)",
      "typical_introduction": "number (years)"
    },
    
    "sensitive_periods": ["array of sensitive_period IDs"],
    
    "prerequisites": {
      "required": ["array of work IDs that MUST be completed"],
      "recommended": ["array of work IDs that SHOULD be completed"]
    },
    
    "aims": {
      "direct": ["array of strings - immediate learning objectives"],
      "indirect": ["array of strings - long-term preparation"]
    },
    
    "readiness_indicators": ["array of observable behaviors"],
    
    "skills_developed": {
      "primary": ["main skills"],
      "secondary": ["additional skills"]
    },
    
    "cross_area_benefits": {
      "mathematics": ["how this prepares for math"],
      "language": ["how this prepares for language"],
      "cultural": ["how this prepares for cultural"],
      "sensorial": ["how this refines senses"],
      "practical_life": ["life skills connection"]
    },
    
    "prepares_for": ["array of work IDs this unlocks"],
    
    "materials_needed": ["list of physical materials"],
    
    "presentation_notes": "string (teacher guidance)",
    
    "parent_explanation": {
      "simple": "string (1-2 sentences)",
      "detailed": "string (full explanation)",
      "why_it_matters": "string (developmental importance)"
    },
    
    "media": {
      "image_url": "string",
      "video_url": "string",
      "demonstration_url": "string"
    },
    
    "is_gateway": "boolean (unlocks many other works)",
    "difficulty_level": "enum: introductory | developing | advanced | mastery",
    
    "metadata": {
      "created_at": "timestamp",
      "updated_at": "timestamp",
      "source": "string (AMI, AMS, etc.)"
    }
  }
}
```

### 1.2 Sensitive Period Schema

```json
{
  "sensitive_period": {
    "id": "string (UUID)",
    "name": "string (e.g., 'Order', 'Language', 'Movement')",
    "slug": "string",
    
    "age_range": {
      "start": "number",
      "peak_start": "number",
      "peak_end": "number",
      "end": "number"
    },
    
    "observable_behaviors": ["array of behaviors indicating active period"],
    
    "primary_curriculum_areas": ["areas most relevant during this period"],
    
    "recommended_works": ["work IDs particularly suited to this period"],
    
    "description": {
      "teacher": "string (professional explanation)",
      "parent": "string (simple explanation)"
    }
  }
}
```

### 1.3 Curriculum Area Schema

```json
{
  "curriculum_area": {
    "id": "string",
    "name": "string",
    "slug": "string",
    
    "sub_areas": [
      {
        "id": "string",
        "name": "string",
        "sequence_order": "number",
        "description": "string"
      }
    ],
    
    "purpose": {
      "teacher": "string",
      "parent": "string"
    },
    
    "prepares_for": ["areas this curriculum prepares for"],
    
    "typical_age_focus": {
      "primary": "number (peak age)",
      "secondary": "number (continued focus)"
    }
  }
}
```

---

## 2. DATABASE TABLES (Supabase)

### 2.1 Core Tables

```sql
-- Works table (main curriculum content)
CREATE TABLE montessori_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  curriculum_area TEXT NOT NULL CHECK (curriculum_area IN ('practical_life', 'sensorial', 'mathematics', 'language', 'cultural')),
  sub_area TEXT NOT NULL,
  
  age_min DECIMAL(3,1) NOT NULL,
  age_max DECIMAL(3,1) NOT NULL,
  age_typical DECIMAL(3,1),
  
  direct_aims TEXT[] NOT NULL DEFAULT '{}',
  indirect_aims TEXT[] NOT NULL DEFAULT '{}',
  readiness_indicators TEXT[] NOT NULL DEFAULT '{}',
  
  primary_skills TEXT[] NOT NULL DEFAULT '{}',
  secondary_skills TEXT[] NOT NULL DEFAULT '{}',
  
  materials_needed TEXT[] NOT NULL DEFAULT '{}',
  presentation_notes TEXT,
  
  parent_explanation_simple TEXT NOT NULL,
  parent_explanation_detailed TEXT,
  parent_why_it_matters TEXT,
  
  image_url TEXT,
  video_url TEXT,
  
  is_gateway BOOLEAN DEFAULT false,
  difficulty_level TEXT CHECK (difficulty_level IN ('introductory', 'developing', 'advanced', 'mastery')),
  
  sequence_order INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sensitive periods reference
CREATE TABLE sensitive_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  
  age_start DECIMAL(3,1) NOT NULL,
  age_peak_start DECIMAL(3,1) NOT NULL,
  age_peak_end DECIMAL(3,1) NOT NULL,
  age_end DECIMAL(3,1) NOT NULL,
  
  observable_behaviors TEXT[] NOT NULL DEFAULT '{}',
  primary_areas TEXT[] NOT NULL DEFAULT '{}',
  
  teacher_description TEXT NOT NULL,
  parent_description TEXT NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Work prerequisites (many-to-many)
CREATE TABLE work_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID REFERENCES montessori_works(id) ON DELETE CASCADE,
  prerequisite_work_id UUID REFERENCES montessori_works(id) ON DELETE CASCADE,
  is_required BOOLEAN DEFAULT true,
  UNIQUE(work_id, prerequisite_work_id)
);

-- Work to sensitive period mapping
CREATE TABLE work_sensitive_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID REFERENCES montessori_works(id) ON DELETE CASCADE,
  sensitive_period_id UUID REFERENCES sensitive_periods(id) ON DELETE CASCADE,
  relevance_score INTEGER DEFAULT 5 CHECK (relevance_score BETWEEN 1 AND 10),
  UNIQUE(work_id, sensitive_period_id)
);

-- Cross-area benefits
CREATE TABLE work_cross_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID REFERENCES montessori_works(id) ON DELETE CASCADE,
  benefit_area TEXT NOT NULL,
  benefit_description TEXT NOT NULL,
  UNIQUE(work_id, benefit_area)
);

-- Work unlocks (what this work prepares for)
CREATE TABLE work_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID REFERENCES montessori_works(id) ON DELETE CASCADE,
  unlocks_work_id UUID REFERENCES montessori_works(id) ON DELETE CASCADE,
  UNIQUE(work_id, unlocks_work_id)
);
```

### 2.2 Indexes for Performance

```sql
-- Fast lookups by curriculum area
CREATE INDEX idx_works_curriculum_area ON montessori_works(curriculum_area);
CREATE INDEX idx_works_sub_area ON montessori_works(sub_area);

-- Age range queries
CREATE INDEX idx_works_age_range ON montessori_works(age_min, age_max);

-- Gateway works
CREATE INDEX idx_works_gateway ON montessori_works(is_gateway) WHERE is_gateway = true;

-- Prerequisite lookups
CREATE INDEX idx_prerequisites_work ON work_prerequisites(work_id);
CREATE INDEX idx_prerequisites_prereq ON work_prerequisites(prerequisite_work_id);

-- Sensitive period lookups
CREATE INDEX idx_sp_work ON work_sensitive_periods(work_id);
CREATE INDEX idx_sp_period ON work_sensitive_periods(sensitive_period_id);
```

---

## 3. API FUNCTIONS

### 3.1 Get Available Works for Child

```sql
-- Function to get works a child is ready for
CREATE OR REPLACE FUNCTION get_available_works(
  p_child_age DECIMAL,
  p_completed_work_ids UUID[]
)
RETURNS TABLE (
  work_id UUID,
  work_name TEXT,
  curriculum_area TEXT,
  sub_area TEXT,
  is_gateway BOOLEAN,
  missing_prerequisites UUID[],
  relevance_score INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH 
  -- Get all works appropriate for age
  age_appropriate AS (
    SELECT w.id, w.name, w.curriculum_area, w.sub_area, w.is_gateway
    FROM montessori_works w
    WHERE p_child_age BETWEEN w.age_min AND w.age_max
    AND w.id != ALL(p_completed_work_ids)
  ),
  -- Check prerequisites
  prereq_check AS (
    SELECT 
      aa.id,
      aa.name,
      aa.curriculum_area,
      aa.sub_area,
      aa.is_gateway,
      ARRAY_AGG(wp.prerequisite_work_id) FILTER (
        WHERE wp.is_required 
        AND wp.prerequisite_work_id != ALL(p_completed_work_ids)
      ) as missing_prereqs
    FROM age_appropriate aa
    LEFT JOIN work_prerequisites wp ON aa.id = wp.work_id
    GROUP BY aa.id, aa.name, aa.curriculum_area, aa.sub_area, aa.is_gateway
  ),
  -- Get sensitive period relevance
  sp_relevance AS (
    SELECT 
      pc.id,
      pc.name,
      pc.curriculum_area,
      pc.sub_area,
      pc.is_gateway,
      pc.missing_prereqs,
      COALESCE(SUM(
        CASE 
          WHEN p_child_age BETWEEN sp.age_peak_start AND sp.age_peak_end THEN wsp.relevance_score * 2
          WHEN p_child_age BETWEEN sp.age_start AND sp.age_end THEN wsp.relevance_score
          ELSE 0
        END
      ), 0)::INTEGER as sp_score
    FROM prereq_check pc
    LEFT JOIN work_sensitive_periods wsp ON pc.id = wsp.work_id
    LEFT JOIN sensitive_periods sp ON wsp.sensitive_period_id = sp.id
    GROUP BY pc.id, pc.name, pc.curriculum_area, pc.sub_area, pc.is_gateway, pc.missing_prereqs
  )
  SELECT 
    id,
    name,
    curriculum_area,
    sub_area,
    is_gateway,
    COALESCE(missing_prereqs, '{}'),
    sp_score
  FROM sp_relevance
  WHERE missing_prereqs IS NULL OR array_length(missing_prereqs, 1) IS NULL
  ORDER BY 
    is_gateway DESC,
    sp_score DESC,
    curriculum_area;
END;
$$;
```

### 3.2 Get Recommended Works

```sql
-- Function to get top recommendations
CREATE OR REPLACE FUNCTION get_recommended_works(
  p_child_age DECIMAL,
  p_completed_work_ids UUID[],
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  work_id UUID,
  work_name TEXT,
  curriculum_area TEXT,
  parent_explanation TEXT,
  why_recommended TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH available AS (
    SELECT * FROM get_available_works(p_child_age, p_completed_work_ids)
  ),
  area_balance AS (
    SELECT 
      curriculum_area,
      COUNT(*) as completed_count
    FROM montessori_works
    WHERE id = ANY(p_completed_work_ids)
    GROUP BY curriculum_area
  ),
  scored AS (
    SELECT 
      a.work_id,
      a.work_name,
      a.curriculum_area,
      w.parent_explanation_simple,
      a.relevance_score + 
        CASE WHEN a.is_gateway THEN 10 ELSE 0 END +
        CASE WHEN COALESCE(ab.completed_count, 0) < 3 THEN 5 ELSE 0 END
        as total_score
    FROM available a
    JOIN montessori_works w ON a.work_id = w.id
    LEFT JOIN area_balance ab ON a.curriculum_area = ab.curriculum_area
  )
  SELECT 
    work_id,
    work_name,
    curriculum_area,
    parent_explanation_simple,
    CASE 
      WHEN total_score >= 15 THEN 'Gateway work - unlocks many future activities'
      WHEN total_score >= 10 THEN 'Perfect match for current developmental stage'
      ELSE 'Good fit for balanced curriculum'
    END
  FROM scored
  ORDER BY total_score DESC
  LIMIT p_limit;
END;
$$;
```

---

## 4. AI PROMPT TEMPLATES

### 4.1 Teacher Weekly Report Prompt

```markdown
You are the Whale AI assistant helping Montessori teachers plan weekly activities.

## Child Information
- Name: {{child_name}}
- Age: {{age}} years
- Current Progress: {{completed_works_summary}}
- Active Sensitive Periods: {{active_sensitive_periods}}

## Available Works (Prerequisites Met)
{{available_works_list}}

## Underserved Areas
{{underserved_curriculum_areas}}

## Instructions
Based on the child's age, completed works, and active sensitive periods, recommend 5-7 works for the coming week.

For each recommendation, provide:
1. Work name
2. Why now (sensitive period/readiness match)
3. What to observe (readiness indicators)
4. Connection to other areas (cross-curriculum benefits)

Balance recommendations across curriculum areas, prioritizing:
- Gateway works that unlock future learning
- Works matching peak sensitive periods
- Underserved curriculum areas

Format as a weekly plan the teacher can follow.
```

### 4.2 Parent Report Prompt

```markdown
You are the Whale AI assistant writing a warm, encouraging report for parents.

## Child Information
- Name: {{child_name}}
- Age: {{age}} years

## This Week's Works
{{works_completed_this_week}}

## Instructions
Write a brief, warm report for parents that:

1. Celebrates specific accomplishments
2. Explains what each work develops (in plain English)
3. Connects classroom activities to home life
4. Suggests one simple activity to try at home
5. Notes any emerging interests or skills

Tone: Warm, encouraging, informative but not overwhelming.
Length: 150-250 words.
Avoid: Jargon, criticism, comparisons to other children.

Include the developmental purpose of each work using the parent_explanation field.
```

### 4.3 Individual Work Explanation Prompt

```markdown
Explain the {{work_name}} activity to a parent who is unfamiliar with Montessori.

## Work Details
- Curriculum Area: {{curriculum_area}}
- Direct Aims: {{direct_aims}}
- Indirect Aims: {{indirect_aims}}
- Age Range: {{age_range}}

## Instructions
Write a 2-3 sentence explanation that:
1. Describes what the child does
2. Explains why it matters for development
3. Connects to future skills

Use simple language. Avoid Montessori jargon.
Make it feel meaningful, not just "playing."
```

---

## 5. SAMPLE DATA

### 5.1 Sample Work Entry

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Pink Tower",
  "slug": "pink-tower",
  "curriculum_area": "sensorial",
  "sub_area": "visual_dimension",
  
  "age_min": 2.5,
  "age_max": 6,
  "age_typical": 3,
  
  "direct_aims": [
    "Visual discrimination of size in three dimensions",
    "Grading from largest to smallest"
  ],
  "indirect_aims": [
    "Preparation for mathematical concept of cubing",
    "Development of concentration",
    "Preparation for decimal system (base 10)"
  ],
  
  "readiness_indicators": [
    "Can carry objects carefully",
    "Shows interest in building/stacking",
    "Can focus on task for 5+ minutes",
    "Understands concept of 'bigger' and 'smaller'"
  ],
  
  "primary_skills": ["visual_discrimination", "concentration", "fine_motor"],
  "secondary_skills": ["vocabulary_comparative", "spatial_reasoning"],
  
  "materials_needed": ["Pink Tower (10 wooden cubes)", "Work mat"],
  
  "presentation_notes": "Present cubes one at a time, largest to smallest. Build tower demonstrating careful placement. Invite child to try.",
  
  "parent_explanation_simple": "Your child stacks 10 pink cubes from largest to smallest, developing visual discrimination and concentration.",
  "parent_explanation_detailed": "The Pink Tower consists of 10 wooden cubes that increase in size from 1cm³ to 10cm³. As your child handles and stacks these cubes, they develop visual discrimination, learn comparative vocabulary (big, bigger, biggest), strengthen hand control, and unconsciously absorb the mathematical concept of cubing that they'll formally learn later.",
  "parent_why_it_matters": "This 'simple' stacking activity develops the foundation for mathematics while building concentration and fine motor skills needed for writing.",
  
  "image_url": "/images/works/pink-tower.jpg",
  "video_url": "/videos/works/pink-tower-presentation.mp4",
  
  "is_gateway": true,
  "difficulty_level": "introductory",
  "sequence_order": 1
}
```

### 5.2 Sample Sensitive Period Entry

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "name": "Order",
  "slug": "order",
  
  "age_start": 0.5,
  "age_peak_start": 1,
  "age_peak_end": 3,
  "age_end": 4.5,
  
  "observable_behaviors": [
    "Insists on routines and rituals",
    "Upset when things are out of place",
    "Enjoys sorting and organizing",
    "Wants to put things back where they belong",
    "Notices small changes in environment"
  ],
  
  "primary_areas": ["practical_life", "sensorial"],
  
  "teacher_description": "During the sensitive period for order, the child has an intense need for consistency in their environment. They thrive on routines and become distressed when order is disrupted. This drive helps them construct their understanding of the world.",
  
  "parent_description": "Your child is developing their sense of how the world works by needing things to be consistent and in their place. This isn't being 'picky' - it's how they learn to understand their environment. Supporting this need helps build their confidence and security."
}
```

---

## 6. INTEGRATION POINTS

### 6.1 Whale Platform Integration

```typescript
// lib/montessori-brain/index.ts

import { createClient } from '@supabase/supabase-js';

export class MontessoriBrain {
  private supabase;
  
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }
  
  async getAvailableWorks(childAge: number, completedWorkIds: string[]) {
    const { data, error } = await this.supabase
      .rpc('get_available_works', {
        p_child_age: childAge,
        p_completed_work_ids: completedWorkIds
      });
    
    if (error) throw error;
    return data;
  }
  
  async getRecommendations(childAge: number, completedWorkIds: string[], limit = 5) {
    const { data, error } = await this.supabase
      .rpc('get_recommended_works', {
        p_child_age: childAge,
        p_completed_work_ids: completedWorkIds,
        p_limit: limit
      });
    
    if (error) throw error;
    return data;
  }
  
  async generateTeacherReport(childId: string, weekNumber: number) {
    // Get child data
    const child = await this.getChildData(childId);
    const completedWorks = await this.getCompletedWorks(childId);
    const recommendations = await this.getRecommendations(
      child.age,
      completedWorks.map(w => w.id)
    );
    
    // Generate report using AI
    const prompt = this.buildTeacherReportPrompt(child, recommendations);
    const report = await this.callClaudeAPI(prompt);
    
    return report;
  }
  
  async generateParentReport(childId: string, weekNumber: number) {
    // Get child data and completed works
    const child = await this.getChildData(childId);
    const weekWorks = await this.getWeekWorks(childId, weekNumber);
    
    // Generate report using AI
    const prompt = this.buildParentReportPrompt(child, weekWorks);
    const report = await this.callClaudeAPI(prompt);
    
    return report;
  }
}
```

### 6.2 Usage in Weekly Planning

```typescript
// In weekly planning component
import { MontessoriBrain } from '@/lib/montessori-brain';

const brain = new MontessoriBrain();

async function generateWeeklyPlan(childId: string) {
  const child = await getChild(childId);
  const completed = await getCompletedWorks(childId);
  
  // Get AI recommendations
  const recommendations = await brain.getRecommendations(
    child.age,
    completed.map(w => w.id),
    7 // one week of works
  );
  
  // Create weekly plan
  const plan = await createWeeklyPlan({
    childId,
    weekNumber: getCurrentWeekNumber(),
    works: recommendations.map(r => r.work_id)
  });
  
  return plan;
}
```

---

## 7. MIGRATION STRATEGY

### 7.1 Data Population Order

1. **Sensitive Periods** (11 records)
2. **Curriculum Areas** (5 records)
3. **Sub Areas** (~25 records)
4. **Works** (~300 records)
5. **Prerequisites** (~500 relationships)
6. **Work-Sensitive Period mappings** (~600 relationships)
7. **Cross-Area Benefits** (~400 relationships)
8. **Work Unlocks** (~400 relationships)

### 7.2 Initial Data Source

The data comes from DIVEs 1-4:
- `DIVE_1_SCIENTIFIC_FOUNDATION.md` → Sensitive periods
- `DIVE_2_WORK_ANALYSIS.md` → All works with details
- `DIVE_3_PROGRESSIONS.md` → Prerequisites, unlocks
- `DIVE_4_CONNECTIONS.md` → Cross-area benefits

### 7.3 Validation Queries

```sql
-- Check all works have prerequisites defined
SELECT w.name 
FROM montessori_works w
LEFT JOIN work_prerequisites wp ON w.id = wp.work_id
WHERE wp.id IS NULL AND w.difficulty_level != 'introductory';

-- Check all works mapped to sensitive periods
SELECT w.name 
FROM montessori_works w
LEFT JOIN work_sensitive_periods wsp ON w.id = wsp.work_id
WHERE wsp.id IS NULL;

-- Check prerequisite chains don't have cycles
-- (would need recursive CTE to fully validate)
```

---

## 8. NEXT STEPS

### Immediate (This Session)
1. ✅ Complete DIVE 5 documentation
2. Create SQL migration file
3. Populate seed data for 20-30 key works

### Short Term (This Week)
1. Run migrations in Supabase
2. Populate all 300+ works
3. Create API endpoints
4. Test recommendation function

### Medium Term (Next Sprint)
1. Integrate with weekly planning
2. Build parent report generator
3. Add media URLs
4. Teacher feedback loop

---

## SOURCES

- DIVEs 1-4 research documents
- Supabase documentation
- Whale platform architecture

---

*This document completes the Whale Montessori Brain - ready for implementation.*
