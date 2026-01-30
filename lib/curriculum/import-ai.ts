// lib/curriculum/import-ai.ts
// AI-powered disambiguation for curriculum imports
// Uses Claude to match works to curriculum and students

import { anthropic, AI_MODEL, AI_ENABLED, MAX_TOKENS } from '../ai/anthropic';

// ============================================
// TYPES
// ============================================

export interface CurriculumItem {
  id: string;
  name: string;
  area: string;
  category?: string;
  keywords?: string[];
  description?: string;
}

export interface StudentInfo {
  id: string;
  name: string;
  nickname?: string;
  aliases?: string[];
}

export interface MatchResult {
  matchedId: string | null;
  confidence: number;
  reasoning: string;
  alternatives: Array<{
    id: string;
    confidence: number;
    reasoning: string;
  }>;
}

export interface ParsedCurriculum {
  name: string;
  description?: string;
  items: Array<{
    name: string;
    area: string;
    category?: string;
    description?: string;
    keywords: string[];
    expectedWorkType: string;
  }>;
  warnings: string[];
}

export interface NameDisambiguation {
  isSamePerson: boolean;
  confidence: number;
  reasoning: string;
}

// ============================================
// CURRICULUM PARSING
// ============================================

/**
 * Parse uploaded curriculum content into structured format
 */
export async function parseCurriculumContent(
  content: string,
  filename: string
): Promise<ParsedCurriculum> {
  if (!AI_ENABLED || !anthropic) {
    return {
      name: 'Imported Curriculum',
      items: [],
      warnings: ['AI is not enabled. Please parse curriculum manually.']
    };
  }

  const prompt = `You are helping parse a Montessori curriculum file into a structured format.

Given this curriculum content from file "${filename}":

${content.slice(0, 8000)}

Extract and return a JSON object with:
{
  "name": "Overall curriculum name",
  "description": "Brief description",
  "items": [
    {
      "name": "Item/work name",
      "area": "practical_life|sensorial|mathematics|language|cultural",
      "category": "Subcategory if present",
      "description": "Brief description",
      "keywords": ["keyword1", "keyword2", ...],
      "expectedWorkType": "essay|project|presentation|worksheet|observation|other"
    }
  ],
  "warnings": ["Any issues or ambiguities"]
}

MONTESSORI AREAS:
- practical_life: Care of self, care of environment, grace and courtesy
- sensorial: Pink tower, brown stairs, color tablets, etc.
- mathematics: Number rods, spindle box, golden beads, etc.
- language: Sandpaper letters, movable alphabet, reading, writing
- cultural: Geography, science, history, art, music

IMPORTANT:
- Extract 5-10 keywords per item for matching student work
- Keywords should include concepts students would write about
- Infer the area from context if not explicit
- Return ONLY valid JSON, no other text.`;

  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: MAX_TOKENS * 2,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : '';

    // Clean markdown code blocks if present
    let jsonText = responseText;
    if (jsonText.startsWith('```')) {
      const lines = jsonText.split('\n');
      jsonText = lines.filter(l => !l.startsWith('```')).join('\n');
    }

    return JSON.parse(jsonText);
  } catch (error) {
    console.error('AI curriculum parsing failed:', error);
    return {
      name: 'Imported Curriculum',
      items: [],
      warnings: [`Failed to parse: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

// ============================================
// STUDENT MATCHING
// ============================================

/**
 * Match a filename to a student from the roster
 */
export async function matchStudentToFilename(
  filename: string,
  students: StudentInfo[],
  contentPreview?: string
): Promise<MatchResult> {
  if (!AI_ENABLED || !anthropic) {
    return {
      matchedId: null,
      confidence: 0,
      reasoning: 'AI is not enabled',
      alternatives: []
    };
  }

  const studentsJson = JSON.stringify(students.map(s => ({
    id: s.id,
    name: s.name,
    nickname: s.nickname,
    aliases: s.aliases
  })), null, 2);

  const prompt = `You are matching a student work file to a student roster.

Filename: ${filename}
Content preview: ${contentPreview?.slice(0, 500) || 'Not available'}

Student roster:
${studentsJson}

Analyze the filename and content to identify which student submitted this work.

Look for:
- Full name matches (john_smith_essay.pdf → John Smith)
- Nickname matches
- Partial matches (first name, last name, initials)
- Common variations (Johnny → John, Katie → Katherine)

Return JSON:
{
  "matchedId": "student_id or null",
  "confidence": 0.0 to 1.0,
  "extractedName": "name found in filename",
  "reasoning": "brief explanation",
  "alternatives": [
    {"id": "other_id", "confidence": 0.X, "reasoning": "why"}
  ]
}

Confidence guidelines:
- 0.95+: Exact full name match
- 0.85-0.95: Strong partial match
- 0.70-0.85: Good partial match
- 0.50-0.70: Weak match
- <0.50: Very uncertain

Return ONLY valid JSON.`;

  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : '';

    let jsonText = responseText;
    if (jsonText.startsWith('```')) {
      const lines = jsonText.split('\n');
      jsonText = lines.filter(l => !l.startsWith('```')).join('\n');
    }

    const result = JSON.parse(jsonText);
    return {
      matchedId: result.matchedId,
      confidence: result.confidence || 0,
      reasoning: result.reasoning || '',
      alternatives: result.alternatives || []
    };
  } catch (error) {
    console.error('AI student matching failed:', error);
    return {
      matchedId: null,
      confidence: 0,
      reasoning: `Matching failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      alternatives: []
    };
  }
}

// ============================================
// WORK-TO-CURRICULUM MATCHING
// ============================================

/**
 * Match student work to a curriculum item based on content
 */
export async function matchWorkToCurriculum(
  filename: string,
  contentPreview: string,
  fileType: string,
  curriculumItems: CurriculumItem[],
  recentClassWorks?: string[]
): Promise<MatchResult> {
  if (!AI_ENABLED || !anthropic) {
    return {
      matchedId: null,
      confidence: 0,
      reasoning: 'AI is not enabled',
      alternatives: []
    };
  }

  const itemsJson = JSON.stringify(curriculumItems.map(item => ({
    id: item.id,
    name: item.name,
    area: item.area,
    category: item.category,
    keywords: item.keywords,
    description: item.description?.slice(0, 200)
  })), null, 2);

  const prompt = `You are matching student work to Montessori curriculum items.

Curriculum items:
${itemsJson}

Student work:
- Filename: ${filename}
- File type: ${fileType}
- Content preview:
${contentPreview.slice(0, 2000) || 'No content available'}

Other recent works from this class: ${(recentClassWorks || []).slice(0, 5).join(', ') || 'None'}

Match this work to the most appropriate curriculum item.

Consider:
- Content topics matching curriculum item keywords
- Filename hints
- File type (essay → docx/pdf, presentation → pptx)
- If many similar files uploaded, likely same assignment

Return JSON:
{
  "matchedId": "curriculum_item_id or null",
  "confidence": 0.0 to 1.0,
  "reasoning": "Brief explanation",
  "matchedKeywords": ["keywords", "that", "matched"],
  "alternatives": [
    {"id": "other_id", "confidence": 0.X, "reasoning": "why"}
  ]
}

Confidence guidelines:
- 0.90+: Clear content match with multiple keywords
- 0.75-0.90: Good semantic match
- 0.60-0.75: Partial match
- <0.60: Weak or no match

Return ONLY valid JSON.`;

  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : '';

    let jsonText = responseText;
    if (jsonText.startsWith('```')) {
      const lines = jsonText.split('\n');
      jsonText = lines.filter(l => !l.startsWith('```')).join('\n');
    }

    const result = JSON.parse(jsonText);
    return {
      matchedId: result.matchedId,
      confidence: result.confidence || 0,
      reasoning: result.reasoning || '',
      alternatives: result.alternatives || []
    };
  } catch (error) {
    console.error('AI work matching failed:', error);
    return {
      matchedId: null,
      confidence: 0,
      reasoning: `Matching failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      alternatives: []
    };
  }
}

// ============================================
// NAME DISAMBIGUATION
// ============================================

/**
 * Check if two names refer to the same person
 */
export async function disambiguateNames(
  name1: string,
  name2: string
): Promise<NameDisambiguation> {
  if (!AI_ENABLED || !anthropic) {
    // Fall back to simple string comparison
    const n1 = name1.toLowerCase().trim();
    const n2 = name2.toLowerCase().trim();
    return {
      isSamePerson: n1 === n2,
      confidence: n1 === n2 ? 1.0 : 0.0,
      reasoning: 'AI not enabled, using exact match'
    };
  }

  const prompt = `Do these two names likely refer to the same person?

Name 1: "${name1}"
Name 2: "${name2}"

Consider:
- Nicknames (Johnny/John, Katie/Katherine, Bill/William)
- Spelling variations
- First/last name order
- Initials
- Suffixes (Jr., III)
- Common typos

Return JSON:
{
  "isSamePerson": true/false,
  "confidence": 0.0 to 1.0,
  "reasoning": "brief explanation"
}

Return ONLY valid JSON.`;

  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : '';

    let jsonText = responseText;
    if (jsonText.startsWith('```')) {
      const lines = jsonText.split('\n');
      jsonText = lines.filter(l => !l.startsWith('```')).join('\n');
    }

    return JSON.parse(jsonText);
  } catch (error) {
    console.error('AI name disambiguation failed:', error);
    return {
      isSamePerson: false,
      confidence: 0,
      reasoning: `Disambiguation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// ============================================
// CONFIDENCE THRESHOLDS
// ============================================

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.90,    // Auto-match
  MEDIUM: 0.60,  // Suggest, require confirmation
  LOW: 0.40      // Show alternatives, teacher picks
} as const;

/**
 * Determine match status based on confidence scores
 */
export function determineMatchStatus(
  studentConfidence: number,
  curriculumConfidence: number
): 'auto' | 'suggested' | 'unmatched' {
  if (studentConfidence >= CONFIDENCE_THRESHOLDS.HIGH &&
      curriculumConfidence >= CONFIDENCE_THRESHOLDS.HIGH) {
    return 'auto';
  }

  if (studentConfidence >= CONFIDENCE_THRESHOLDS.MEDIUM &&
      curriculumConfidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    return 'suggested';
  }

  return 'unmatched';
}
