# 🐋 HANDOFF: Phase 5 - AI Content Generation

**Date:** January 18, 2026  
**Session:** 55 → 56  
**Phase:** 5 of 9  
**Status:** READY TO BUILD

---

## 🚨 READ FIRST

```bash
# 1. Read brain
cat ~/Desktop/whale/docs/mission-control/brain.json

# 2. Read master roadmap (for full context)
cat ~/Desktop/whale/docs/mission-control/HANDOFF_WEEKLY_REPORTS_MASTER.md

# 3. Then this file for Phase 5 specifics
```

---

## 🎯 PHASE 5 OBJECTIVE

**Goal:** Claude API generates beautiful, personalized report content automatically

**Value:** Teachers click ONE button and get professionally written:
- Weekly summary (warm, observational)
- Activity observations (what the child did)
- Developmental notes (why it matters)
- Home extensions (how parents can help)
- Closing message (personal touch)

**This is the "wow factor" for your presentation.**

---

## 📦 WHAT TO BUILD

### File 1: AI Generator Library
`lib/montree/reports/ai-generator.ts`

```typescript
// Key functions to implement:

export async function enhanceReportWithAI(
  report: ReportContent,
  child: { name: string; gender: string },
  translations: WorkTranslation[]
): Promise<EnhancedReportContent>

// Uses Claude API to transform:
// - Raw activity data → Warm narrative summary
// - Work names → Rich observations
// - Curriculum → Developmental context
// - Activities → Home extension ideas
```

### File 2: API Endpoint
`app/api/montree/reports/[id]/enhance/route.ts`

```typescript
// POST /api/montree/reports/[id]/enhance
// 
// 1. Fetch report + child + work translations
// 2. Call enhanceReportWithAI()
// 3. Update report content in database
// 4. Return enhanced content
```

### File 3: UI Button (modify existing)
`app/montree/dashboard/reports/[id]/page.tsx`

```typescript
// Add "✨ Enhance with AI" button
// - Shows loading state during API call
// - Updates editor with AI content
// - Allow manual editing after
```

---

## 🧠 AI PROMPT STRATEGY

### System Prompt Template

```
You are a warm, observant Montessori teacher writing a weekly report for parents.

CHILD: {name} ({pronouns})
WEEK: {weekStart} - {weekEnd}

ACTIVITIES THIS WEEK:
{foreach highlight}
- {work_name} ({area})
  Developmental context: {from translations table}
{/foreach}

Write in a warm, professional tone. Focus on:
1. What the child DID (observable actions)
2. What skills they're DEVELOPING (not "learning")
3. How parents can EXTEND learning at home

Avoid:
- Educational jargon parents won't understand
- Comparisons to other children
- Negative observations
- Generic phrases like "great job"
```

### Output Structure

```json
{
  "summary": "This week, {name} showed wonderful concentration...",
  "highlights": [
    {
      "observation": "With focused attention, {name} carefully...",
      "developmental_note": "This work develops visual discrimination...",
      "home_extension": "Try sorting household objects by size!"
    }
  ],
  "parent_message": "It's been a joy watching {name} grow..."
}
```

---

## 🗄️ DATA SOURCES

### Work Translations Table
Already seeded with 237 translations in `montree_work_translations`:

```sql
SELECT work_id, display_name, developmental_context, home_extension
FROM montree_work_translations
WHERE work_id = 'se_pink_tower';
```

Returns:
- `display_name`: "Pink Tower"
- `developmental_context`: "Building with graduated cubes develops visual discrimination..."
- `home_extension`: "Try sorting household objects by size together!"

### Report Content Structure
From `lib/montree/reports/types.ts`:

```typescript
interface ReportContent {
  summary: string;
  highlights: ReportHighlight[];
  parent_message?: string;
}

interface ReportHighlight {
  media_id?: string;
  work_name: string;
  area: string;
  observation: string;
  developmental_note?: string;
  home_extension?: string;
}
```

---

## 🔌 CLAUDE API SETUP

### Environment Variable
Check `.env.local` for:
```
ANTHROPIC_API_KEY=sk-ant-...
```

If missing, Tredoux needs to add it.

### API Call Pattern

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 2000,
  system: SYSTEM_PROMPT,
  messages: [{ role: 'user', content: USER_PROMPT }],
});
```

---

## ✅ DELIVERABLES CHECKLIST

```
□ 5.1 Create lib/montree/reports/ai-generator.ts
      - enhanceReportWithAI() function
      - buildSystemPrompt() helper
      - buildUserPrompt() helper
      - parseAIResponse() helper
      
□ 5.2 Create app/api/montree/reports/[id]/enhance/route.ts
      - POST handler
      - Fetch report, child, translations
      - Call AI generator
      - Update database
      - Return enhanced content
      
□ 5.3 Update UI with AI button
      - Add "✨ Enhance with AI" button to ReportEditor
      - Loading state during enhancement
      - Refresh content after success
      
□ 5.4 Test end-to-end
      - Generate report
      - Click enhance
      - Verify AI content quality
      - Download PDF with AI content
      
□ 5.5 Deep audit
      - Error handling
      - API key protection
      - Content quality
      - Integration with existing flow
      
□ 5.6 Update brain.json
```

---

## 🎨 UI PLACEMENT

In the report editor header, add button between view toggle and download:

```
[Edit] [Preview]     [✨ Enhance] [📥] [🗑️]
                          ↑
                     NEW BUTTON
```

Button states:
- Default: `✨ Enhance with AI`
- Loading: Spinner + `Enhancing...`
- Success: Toast "Report enhanced!"
- Error: Toast "Enhancement failed"

---

## ⚠️ EDGE CASES TO HANDLE

1. **No API key** → Return helpful error, don't crash
2. **API rate limit** → Retry with backoff
3. **Empty highlights** → Generate summary-only content
4. **Missing translations** → Use work name as fallback
5. **Long reports** → May need to batch highlights

---

## 🧪 TEST SCENARIO

1. Go to `/montree/dashboard/reports`
2. Generate a new report for a child with photos
3. Click into the report
4. Click "✨ Enhance with AI"
5. Wait for loading (5-10 seconds)
6. Verify:
   - Summary is warm and personal
   - Each highlight has observation + developmental note
   - Home extensions are practical
   - Parent message feels authentic
7. Click 📥 to download PDF
8. Verify PDF has AI content

---

## 📁 FILES TO REFERENCE

```
# Existing report types
lib/montree/reports/types.ts

# Existing report generator (for structure)
lib/montree/reports/generator.ts

# PDF types (for output format)
lib/montree/reports/pdf-types.ts

# Work translations (data source)
Table: montree_work_translations

# Report editor (for UI integration)
app/montree/dashboard/reports/[id]/page.tsx
```

---

## 🚀 START COMMAND

```
Read brain.json, then this file.
Start with Chunk 5.1: Create ai-generator.ts

Work in segments. Update brain after each chunk.
Japanese Engineer mindset - make it perfect.
```

---

## 💡 IMPLEMENTATION HINTS

### Chunk 5.1 Structure

```typescript
// lib/montree/reports/ai-generator.ts

import Anthropic from '@anthropic-ai/sdk';
import type { ReportContent, ReportHighlight } from './types';

// Types
interface WorkTranslation {
  work_id: string;
  display_name: string;
  developmental_context: string;
  home_extension: string;
}

interface EnhanceInput {
  report: ReportContent;
  child: { name: string; gender: 'he' | 'she' | 'they' };
  translations: WorkTranslation[];
}

// Main function
export async function enhanceReportWithAI(input: EnhanceInput): Promise<ReportContent> {
  // 1. Build prompts
  // 2. Call Claude
  // 3. Parse response
  // 4. Return enhanced content
}

// Helpers
function buildSystemPrompt(): string { ... }
function buildUserPrompt(input: EnhanceInput): string { ... }
function parseAIResponse(response: string): Partial<ReportContent> { ... }
```

---

*Created: January 18, 2026 - Session 55*
*For: Phase 5 - AI Content Generation*
